// Guidance uses real game controls. Only the simulation clock is held during a lesson.
const LESSONS=['basics','fire','reinforcements','cannon','mage'];
export function chooseTutorialLesson(s,done={},disabled=false){
 if(disabled||s.paused||['won','lost'].includes(s.status))return null;
 if(s.level===0&&s.status==='ready'&&!done.basics)return 'basics';
 if(s.status!=='running')return null;
 const inView=s.enemies.filter(e=>e.hp>0&&e.y>220&&e.y<1080);
 if(!inView.length)return null;
 if(s.level===0&&!done.fire&&s.skills.fire.cooldown<=0&&inView.some(e=>e.y>300))return 'fire';
 if(s.level===0&&s.wave>=2&&!done.reinforcements&&s.skills.reinforcements.cooldown<=0)return 'reinforcements';
 if(s.level===1&&s.wave>=2&&!done.cannon&&s.gold>=125&&s.towers.length<s.levelConfig.slots.length)return 'cannon';
 if(s.level===2&&!done.mage&&s.gold>=100&&s.towers.length<s.levelConfig.slots.length)return 'mage';
 return null;
}

export class TutorialGuide{
 constructor({root,getState,getFlags,onComplete,onSkip,castAt,onOpen,beforeStep}){
  Object.assign(this,{root,getState,getFlags,onComplete,onSkip,castAt,onOpen,beforeStep});
  this.lesson=null;this.steps=[];this.index=0;this.busy=false;
  const layer=document.createElement('section');layer.id='tutorial';layer.hidden=true;layer.setAttribute('aria-label','貂蝉新手指引');
  layer.innerHTML=`<div class="tutorial-cutout"></div><button class="tutorial-skip">跳过指引</button><button class="tutorial-action" aria-label="按指引操作"></button><div class="tutorial-pulse"><i></i><i></i></div><img class="tutorial-hand" src="assets/tutorial/white-hand.png" alt="" draggable="false"><div class="tutorial-dialog"><div class="tutorial-paper"></div><img class="tutorial-character" src="assets/tutorial/diaochan-full.png" alt="貂蝉" draggable="false"><div class="tutorial-name"><img src="assets/tutorial/diaochan-name.png" alt="貂蝉"></div><p class="tutorial-copy" aria-live="polite"></p><span class="tutorial-step"></span></div><div class="tutorial-nudge" aria-live="polite"></div>`;
  root.append(layer);this.layer=layer;this.cutout=layer.querySelector('.tutorial-cutout');this.button=layer.querySelector('.tutorial-action');this.hand=layer.querySelector('.tutorial-hand');this.pulse=layer.querySelector('.tutorial-pulse');this.dialog=layer.querySelector('.tutorial-dialog');
  layer.querySelector('.tutorial-skip').onclick=()=>this.skip();this.button.onclick=()=>this.perform();
  layer.addEventListener('pointerdown',e=>{if(e.target===layer){layer.querySelector('.tutorial-nudge').textContent='请点击手指指向的位置';}});
  this.resizeObserver=new ResizeObserver(()=>{if(this.active)this.layout();});this.resizeObserver.observe(root);
 }
 get active(){return this.lesson!==null;}
 reset(){this.hide();}
 hide(){this.lesson=null;this.steps=[];this.index=0;this.suspended=false;this.layer.hidden=true;delete this.root.dataset.tutorial;delete this.root.dataset.tutorialStep;this.clearInert();}
 complete(){const lesson=this.lesson;this.hide();if(lesson)this.onComplete(lesson);}
 skip(){this.hide();this.onSkip(LESSONS);}
 suspend(){if(this.active){this.suspended=true;this.layer.hidden=true;this.clearInert();}}
 resume(){if(this.active){this.suspended=false;this.layer.hidden=false;this.render();}}
 clearInert(){for(const el of this.root.children)if(el!==this.layer)el.inert=false;}
 focusControls(){for(const el of this.root.children)if(el!==this.layer)el.inert=true;}
 update(){if(this.suspended)return;if(this.active){this.layout();return;}const flags=this.getFlags(),lesson=chooseTutorialLesson(this.getState(),flags.done,flags.disabled);if(lesson)this.begin(lesson);}
 begin(lesson){this.onOpen?.();this.lesson=lesson;this.steps=this.buildSteps(lesson);this.index=0;this.suspended=false;this.render();}
 buildSteps(lesson){
  const state=this.getState(),slot=i=>`[data-slot="${i}"]`,build=t=>`[data-build="${t}"]`;
  const step=(selector,text,label,done)=>({selector,text,label,done});
  const owns=(i,type)=>this.getState().towers.some(t=>t.slotIndex===i&&(!type||t.type===type));
  const placement=(i,type,text)=>[
   {...step(slot(i),text,'点击高亮空地'),skipIf:()=>owns(i,type)},
   step(build(type),({archer:'箭塔射得快，适合对付普通敌人。花费 70 陨铁，点击建造。',barracks:'兵营派出士兵，拦截敌人、争取攻击时间。花费 70 陨铁建造。',cannon:'炮弹能攻击一大片敌人。点击投石塔，花费 125 陨铁建造。',mage:'术士塔能穿透重甲，还能减速。花费 100 陨铁，点击建造。'})[type],`按指引建造${{archer:'弓箭塔',barracks:'兵营',cannon:'投石塔',mage:'术士塔'}[type]}`,()=>owns(i,type))
  ];
  if(lesson==='basics')return[
   ...placement(0,'archer','主公，我是貂蝉！点击这块空地，先建一座箭塔守住道路。'),
   ...placement(5,'barracks','只靠箭塔可拦不住所有敌人。点击桥边这块空地，再建一座兵营。'),
   {...step(slot(0),'敌人越来越强，防御塔也要升级。点击刚建好的箭塔。','点击箭塔查看升级'),skipIf:()=>this.getState().towers.some(t=>t.slotIndex===0&&t.level>=2)},
   step('[data-action="upgrade"]','花费 90 陨铁升级，提高攻击力和射程。点击升级！','按指引升级箭塔',()=>this.getState().towers.some(t=>t.slotIndex===0&&t.level>=2)),
   ...placement(1,'cannon','遇到扎堆的敌人，建个炮塔最合适，一打一大片。点击桥边空地。'),
   step('#start-wave','防线准备好了！别让敌人走到终点。点击「开始迎敌」。','按指引开始迎敌',()=>this.getState().status!=='ready')
  ];
  if(lesson==='fire'||lesson==='reinforcements'){
   const fire=lesson==='fire',enemies=state.enemies.filter(e=>e.hp>0&&e.y>220&&e.y<1080),lead=enemies.reduce((a,b)=>b.y>a.y?b:a,enemies[0]);
   const point={x:lead?.x??375,y:Math.min(1050,(lead?.y??420)+(fire?0:45))};
   return[
    step('#'+lesson,fire?'敌人扎堆了！点击「闪电风暴」，准备发动范围攻击。':'防线吃紧时，别忘了招兵。点击「招兵」，准备派出士兵堵住道路。',fire?'按指引选择闪电风暴':'按指引选择招兵'),
    {point,text:fire?'点击这群敌人，召唤闪电风暴！技能需要冷却，关键时刻再出手。':'点击高亮的道路，让士兵在这里拦截敌人。士兵会自动迎战。',label:fire?'在高亮敌群施放闪电风暴':'在高亮道路部署士兵',action:()=>this.castAt(point.x,point.y),done:()=>this.getState().skills[lesson].cooldown>0}
   ];
  }
  const preferred=lesson==='cannon'?[2,1,7,9,0,3,4,5,6,8]:[2,1,4,5,0,3,6,7];
  const free=preferred.find(i=>i<state.levelConfig.slots.length&&!state.towers.some(t=>t.slotIndex===i));
  return placement(free,lesson==='cannon'?'cannon':'mage',lesson==='cannon'?'遇到扎堆的敌人，建个炮塔最合适，一打一大片。点击这块空地。':'前方有重甲敌人，普通箭矢效果有限。点击空地，布置术士塔来克制他们。');
 }
 render(){
  while(this.index<this.steps.length&&(this.steps[this.index].skipIf?.()||this.steps[this.index].done?.()))this.index++;
  if(this.index>=this.steps.length){this.complete();return;}
  const step=this.steps[this.index];this.beforeStep?.(step);this.layer.hidden=false;this.root.dataset.tutorial=this.lesson;this.root.dataset.tutorialStep=String(this.index+1);this.button.setAttribute('aria-label',step.label);this.layer.querySelector('.tutorial-copy').textContent=step.text;this.layer.querySelector('.tutorial-step').textContent=`${this.index+1} / ${this.steps.length} · 点击高亮位置`;this.layer.querySelector('.tutorial-nudge').textContent='';this.focusControls();this.layout();this.button.focus({preventScroll:true});
 }
 layout(){
  const step=this.steps[this.index];if(!step||this.suspended)return;const bounds=this.root.getBoundingClientRect(),scale=bounds.width/750;
  let x,y,w,h;
  if(step.point){x=step.point.x*scale;y=step.point.y*bounds.height/1334;w=h=110*scale;}
  else{const el=this.root.querySelector(step.selector);if(!el||el.hidden||!el.getClientRects().length){this.layer.querySelector('.tutorial-nudge').textContent='当前操作已变化，可跳过指引继续游戏';return;}const r=el.getBoundingClientRect();x=r.x-bounds.x+r.width/2;y=r.y-bounds.y+r.height/2;w=Math.max(44,r.width);h=Math.max(44,r.height);}
  const pad=9*scale,cutW=w+pad*2,cutH=h+pad*2;
  Object.assign(this.cutout.style,{left:x-cutW/2+'px',top:y-cutH/2+'px',width:cutW+'px',height:cutH+'px',borderRadius:step.point||w/h<1.3?'50%':'14px'});
  Object.assign(this.button.style,{left:x-w/2+'px',top:y-h/2+'px',width:w+'px',height:h+'px'});
  Object.assign(this.pulse.style,{left:x+'px',top:y+'px'});
  const handWidth=bounds.width*.17;Object.assign(this.hand.style,{left:x-handWidth*.28+'px',top:y-handWidth*.05+'px',width:handWidth+'px'});
  // The portrait extends above the panel. Move the whole group away from low targets.
  let panelTop=y>bounds.height*.57?bounds.height*.24:bounds.height*.71;
  if(step.selector?.startsWith('[data-build')||step.selector==='[data-action="upgrade"]')panelTop=y>bounds.height*.5?bounds.height*.17:bounds.height*.76;
  const panelHeight=this.dialog.offsetHeight||bounds.width*.31;
  panelTop=Math.min(panelTop,bounds.height-panelHeight-bounds.width*.08);this.dialog.style.top=panelTop+'px';
 }
 perform(){if(!this.active||this.busy||this.suspended)return;this.busy=true;const step=this.steps[this.index];this.clearInert();try{
   if(step.action)step.action();else{const el=this.root.querySelector(step.selector);if(!el){this.layer.querySelector('.tutorial-nudge').textContent='操作暂不可用，可跳过指引';return;}el.click();}
   // Success is verified against state, not merely a button click.
   if(step.done&&!step.done()){this.layer.querySelector('.tutorial-nudge').textContent='操作尚未完成，请按提示重试，或跳过指引';return;}
   this.index++;this.render();
  }finally{this.busy=false;if(this.active)this.focusControls();}}
}
