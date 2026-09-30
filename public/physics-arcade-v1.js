(function (root) {
  'use strict';
  const WIDTH = 360, HEIGHT = 560, VERSION = '1.2.0';
  const definitions = [
    {id:101,key:'cloud-sling',title:'弹射云堡',mechanic:'弹射 · 碰撞 · 坍塌',instruction:'拖住发射球向后拉，松手击倒云堡。有限弹药，找准支撑点。',color:'#267EA1',paper:'#EAF8FF',tag:'SLING & SMASH'},
    {id:102,key:'candy-swing',title:'糖果摆摆屋',mechanic:'割绳 · 摆动 · 收集',instruction:'划过绳子，让糖果摆进小伙伴嘴里。观察摆动，再选择切割时机。',color:'#A85E8C',paper:'#FFF0F5',tag:'CUT & SWING'},
    {id:103,key:'happy-cup',title:'画线接水',mechanic:'画线 · 水流 · 解谜',instruction:'画出引水线，再打开水龙头。让足够的水流进杯子。',color:'#2889B9',paper:'#EFFAFF',tag:'DRAW & FILL'},
    {id:104,key:'spring-dig',title:'地底泉水',mechanic:'挖土 · 导流 · 解谜',instruction:'划开泥土挖出水道，避开岩石，把清泉送到地底浴池。',color:'#557B45',paper:'#F4F5DE',tag:'DIG & FLOW'},
    {id:105,key:'fruit-drop',title:'果冻果园',mechanic:'下落 · 碰撞 · 合成',instruction:'移动选择落点，松手投下水果。相同水果碰撞合成，别堆过警戒线。',color:'#CF7934',paper:'#FFF5D9',tag:'DROP & MERGE'}
  ].map(item => ({...item,playableId:'plb_'+item.key.replace(/-/g,'_'),stages:5,art:'physics-casual-v2',cover:'/assets/games/physics-casual-v2/'+item.key+'.png'}));
  const CASUAL_KEYS=new Set(definitions.map(item=>item.key));
  const CASUAL_TINTS={'cloud-sling':['#57AAA7','#246C7B'],'candy-swing':['#CC90AA','#925879'],'happy-cup':['#55B2CB','#277499'],'spring-dig':['#95AA62','#55753D'],'fruit-drop':['#EAB467','#B67638']};
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function panel(ctx,x,y,w,h,r,fill){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();}
  function text(ctx,value,x,y,size=14,color='#264352',align='left'){ctx.fillStyle=color;ctx.font='800 '+size+'px system-ui, sans-serif';ctx.textAlign=align;ctx.textBaseline='middle';ctx.fillText(String(value),x,y);}
  function metadata(key){return definitions.find(item=>item.key===key);}
  function sessions(){return [...definitions].sort((a,b)=>(b.priority||0)-(a.priority||0)).map(item=>({id:item.id,type:'game',status:'published',game:item.title,icon:'',cover:item.cover,coverPosition:'center',agent:'Arcade',agentIcon:'',operator:'Airvana Arcade',owner:'@airvana.arcade',viewers:0,conversions:0,earned:0,likes:0,comments:0,saves:0,stage:item.stages+' 关'+(item.collection?'主题挑战':'物理挑战'),settlement:'不适用',resultLabel:item.mechanic,desc:item.instruction,article:'原创互动小游戏，'+item.stages+' 个独立关卡，支持触控、暂停、重试与本地分数。不是原版游戏或官方授权作品。',tags:[item.mechanic,'原创小游戏','本地试玩'],audience:'公开',bg:item.paper,versions:[{id:item.id+'-physics-v1',label:'LOCAL v1',status:'本地试玩',time:'本地'}]}));}
  class PhysicsGame {
    constructor(canvas,key,options={}) {
      this.canvas=canvas;this.ctx=canvas.getContext('2d');this.options=options;this.definition=metadata(key);
      if(!this.definition||!root.AirvanaPhysicsModes?.[key])throw new Error('物理小游戏未加载：'+key);
      this.key=key;this.isCasual=CASUAL_KEYS.has(key);this.levelCount=this.definition.stages;this.stage=1;this.totalScore=0;this.paused=false;this.finished=false;this.destroyed=false;this.muted=options.muted!==false;this.accumulator=0;this.lastTime=null;this.listeners=[];this.pointerId=null;this.runId=options.runId||String(Date.now())+'-'+Math.random().toString(36).slice(2);this.eventIndex=0;
      canvas.width=WIDTH*Math.min(root.devicePixelRatio||1,2);canvas.height=HEIGHT*Math.min(root.devicePixelRatio||1,2);canvas.tabIndex=0;canvas.style.touchAction='none';
      canvas.dataset.physicsGame=key;canvas.dataset.physicsArt=this.definition.art||'physics-vector-v1';canvas.setAttribute('aria-label',this.definition.title+'。'+this.definition.instruction+' 空格执行主要动作，P暂停，R重试。');
      this.installControls();this.loadLevel(1);
      const listen=(node,type,fn)=>{node?.addEventListener(type,fn);this.listeners.push(()=>node?.removeEventListener(type,fn));};
      listen(canvas,'pointerdown',e=>this.pointer('down',e));listen(canvas,'pointermove',e=>this.pointer('move',e));listen(canvas,'pointerup',e=>this.pointer('up',e));listen(canvas,'pointercancel',e=>{if(e.pointerId===this.pointerId)this.cancelPointer();});listen(canvas,'lostpointercapture',e=>{if(e.pointerId===this.pointerId)this.cancelPointer();});
      listen(canvas,'keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' ','Enter','1','2','3','4','5','6','7','8','9','z','Z','c','C','p','P','r','R','Escape'].includes(e.key)){e.preventDefault();e.stopPropagation();this.keypress(e.key);}});
      listen(root.document,'visibilitychange',()=>{if(root.document.hidden&&!this.paused&&!this.finished)this.togglePause();});
      listen(root,'blur',()=>{if(!this.paused&&!this.finished)this.togglePause();});
      this.tick=time=>{if(this.destroyed)return;const dt=this.lastTime===null?0:Math.min((time-this.lastTime)/1000,.075);this.lastTime=time;this.advance(dt);this.render();this.frame=root.requestAnimationFrame(this.tick);};
      this.render();this.frame=root.requestAnimationFrame(this.tick);
    }
    installControls(){
      const doc=this.canvas.ownerDocument;if(!doc||!this.canvas.parentNode)return;
      this.host=this.canvas.parentNode;this.host.classList.add('physics-host');if(this.isCasual)this.host.classList.add('is-casual');this.host.style.setProperty('--physics-color',this.definition.color);this.host.style.setProperty('--physics-paper',this.definition.paper);
      this.controls=doc.createElement('div');this.controls.className='physics-controls';this.controls.setAttribute('aria-label','关卡操作');
      this.hint=doc.createElement('p');this.hint.className='physics-hint';
      this.buttons=doc.createElement('div');this.buttons.className='physics-buttons';this.controls.append(this.hint,this.buttons);
      this.overlay=doc.createElement('section');this.overlay.className='physics-overlay';this.overlay.hidden=true;this.overlay.setAttribute('aria-live','polite');
      this.host.append(this.controls,this.overlay);
    }
    emit(name,props={}){if(this.destroyed)return;this.options.onEvent?.(name,{game_key:this.key,gameKey:this.key,playable_id:this.definition.playableId,campaign_id:this.definition.campaignId||'physics-arcade-local-v1',stage:this.stage,level:this.stage,score:this.score,run_id:this.runId,event_id:this.runId+'-'+(++this.eventIndex),event_time:new Date().toISOString(),version:VERSION,local_demo:true,reward_issued:false,...props});}
    get score(){return this.totalScore+Math.max(0,Number(this.model?.score)||0);}
    loadLevel(level){
      this.model?.destroy?.();this.stage=clamp(level,1,this.levelCount);this.model=new root.AirvanaPhysicsModes[this.key]({level:this.stage});this.paused=false;this.phase='playing';this.terminalSeen=false;this.accumulator=0;this.lastTime=null;this.cancelPointer();this.actionSignature='';
      if(this.overlay)this.overlay.hidden=true;this.emit('level_start');this.status();this.syncControls();
    }
    status(){this.options.onStatus?.({paused:this.paused,stage:this.stage,score:this.score,text:'第 '+this.stage+' / '+this.levelCount+' 关'});}
    point(e){const r=this.canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*WIDTH/r.width,y:(e.clientY-r.top)*HEIGHT/r.height};}
    pointer(kind,e){
      if(this.destroyed||this.paused||this.finished||this.phase!=='playing')return;
      if(kind==='down'&&e.pointerType==='mouse'&&e.button!==0)return;
      if(kind==='down'&&this.pointerId!==null)return;
      if(kind!=='down'&&this.pointerId!==e.pointerId)return;
      e.preventDefault?.();e.stopPropagation?.();const p=this.point(e);
      if(kind==='down'){if(p.y<78||p.y>488)return;this.pointerId=e.pointerId;try{this.canvas.setPointerCapture(e.pointerId);this.canvas.focus({preventScroll:true});}catch(_){}this.model.pointerDown?.(p);this.emit('valid_interaction',{interaction_type:'pointer'});}
      else if(kind==='move')this.model.pointerMove?.(p);
      else {this.model.pointerUp?.(p);this.releasePointer();this.tone(440);}
      this.syncControls();
    }
    releasePointer(){const id=this.pointerId;this.pointerId=null;if(id!==null)try{this.canvas.releasePointerCapture(id);}catch(_){} }
    cancelPointer(){this.model?.cancelPointer?.();this.releasePointer();}
    keypress(key){
      if(this.destroyed||this.finished)return;
      if(key.toLowerCase()==='p'||key==='Escape'){this.togglePause();return;}
      if(key.toLowerCase()==='r'){this.retry();return;}
      if(this.paused)return;
      if(this.phase==='success'&&(key==='Enter'||key===' ')){this.next();return;}
      if(this.phase==='failure'&&(key==='Enter'||key===' ')){this.retry();return;}
      if(this.phase!=='playing')return;
      if(this.model.key)this.model.key(key);else if(key===' '||key==='Enter'){const action=this.model.actions?.().find(item=>!item.disabled);if(action)this.model.perform?.(action.id);}
      this.emit('valid_interaction',{interaction_type:'keyboard',key});this.syncControls();
    }
    perform(id){if(this.destroyed||this.paused||this.phase!=='playing')return;const action=this.model.actions?.().find(a=>a.id===id&&!a.disabled);if(!action)return;this.model.perform?.(id);this.emit('valid_interaction',{interaction_type:'action',action:id});this.tone(490);this.syncControls();}
    advance(dt){
      if(this.destroyed||this.paused||this.finished||this.phase!=='playing')return;
      this.accumulator+=Math.max(0,Math.min(Number(dt)||0,.1));
      while(this.accumulator>=1/120&&this.model.status==='playing'){this.model.update(1/120);this.accumulator-=1/120;}
      if(this.model.status!=='playing'&&!this.terminalSeen){this.terminalSeen=true;this.phase=this.model.status;this.cancelPointer();this.emit(this.phase==='success'?'level_complete':'play_fail',{level_score:this.model.score});this.tone(this.phase==='success'?740:220);this.showOverlay();this.status();}
      this.syncControls();
    }
    retry(){if(this.destroyed||this.finished)return;this.emit('replay',{retry_level:this.stage});this.loadLevel(this.stage);this.canvas.focus?.({preventScroll:true});}
    next(){
      if(this.destroyed||this.finished||this.phase!=='success')return;
      if(this.stage<this.levelCount){this.totalScore+=Math.max(0,Number(this.model.score)||0);this.loadLevel(this.stage+1);this.canvas.focus?.({preventScroll:true});return;}
      this.finished=true;this.emit('play_complete',{summary:'已完成全部 '+this.levelCount+' 个关卡'});this.options.onComplete?.({success:true,stage:this.levelCount,score:this.score,summary:this.levelCount+' 关挑战完成！'});
    }
    togglePause(){if(this.destroyed||this.finished)return this.paused;this.paused=!this.paused;this.cancelPointer();this.accumulator=0;this.lastTime=null;this.emit(this.paused?'pause':'resume');this.status();this.showOverlay();this.syncControls();return this.paused;}
    setMuted(value){this.muted=!!value;}
    tone(frequency){if(this.muted||this.destroyed)return;try{const Audio=root.AudioContext||root.webkitAudioContext;if(!Audio)return;this.audio=this.audio||new Audio();this.audio.resume?.();const o=this.audio.createOscillator(),g=this.audio.createGain();o.type='sine';o.frequency.value=frequency;g.gain.setValueAtTime(.035,this.audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,this.audio.currentTime+.13);o.connect(g);g.connect(this.audio.destination);o.start();o.stop(this.audio.currentTime+.15);}catch(_){} }
    makeButton(label,handler){const button=this.canvas.ownerDocument.createElement('button');button.type='button';button.textContent=label;button.addEventListener('click',e=>{e.stopPropagation();handler();});button.addEventListener('pointerdown',e=>e.stopPropagation());return button;}
    syncControls(){
      if(!this.controls)return;this.hint.textContent=this.model.instruction||this.definition.instruction;
      const actions=this.model.actions?.()||[];const signature=JSON.stringify([actions,this.paused,this.phase]);if(signature===this.actionSignature)return;this.actionSignature=signature;this.buttons.replaceChildren();
      for(const a of actions){const b=this.makeButton(a.label,()=>this.perform(a.id));b.disabled=!!a.disabled||this.paused||this.phase!=='playing';this.buttons.append(b);}
      this.controls.hidden=this.paused||this.phase!=='playing';
    }
    showOverlay(){
      if(!this.overlay)return;this.overlay.hidden=!this.paused&&this.phase==='playing';if(this.overlay.hidden)return;
      const doc=this.canvas.ownerDocument;const card=doc.createElement('div');card.className='physics-result';const tag=doc.createElement('span');tag.textContent=this.paused?'休息一下':this.phase==='success'?'LEVEL COMPLETE':'TRY AGAIN';const h=doc.createElement('h2');h.textContent=this.paused?'游戏已暂停':this.phase==='success'?'第 '+this.stage+' 关完成！':'再试一次';const p=doc.createElement('p');p.textContent=this.paused?'继续后从当前位置恢复。':this.phase==='success'?'本关 '+Math.round(this.model.score||0)+' 分 · 累计 '+Math.round(this.score)+' 分':this.model.message||'调整路线或操作时机，再挑战这一关。';card.append(tag,h,p);
      if(this.paused)card.append(this.makeButton('继续游戏',()=>this.togglePause()));else if(this.phase==='success')card.append(this.makeButton(this.stage===this.levelCount?'完成挑战':'下一关',()=>this.next()));card.append(this.makeButton('重试本关',()=>this.retry()));this.overlay.replaceChildren(card);
    }
    renderCasualHud(c){
      const palette=CASUAL_TINTS[this.key],cream=c.createLinearGradient(0,8,0,66),tint=c.createLinearGradient(0,8,0,66);cream.addColorStop(0,'#FFFEF1F5');cream.addColorStop(1,'#F7E6BFF2');tint.addColorStop(0,palette[0]);tint.addColorStop(1,palette[1]);
      c.save();c.shadowColor='#4D382A3D';c.shadowBlur=5;c.shadowOffsetY=3;panel(c,9,8,237,58,15,cream);panel(c,253,8,98,58,15,tint);c.shadowBlur=0;c.shadowOffsetY=0;
      c.strokeStyle='#D6B875';c.lineWidth=1.4;c.beginPath();c.roundRect(9,8,237,58,15);c.stroke();c.strokeStyle='#F5D591';c.beginPath();c.roundRect(253,8,98,58,15);c.stroke();
      c.strokeStyle='#FFFFFF7A';c.lineWidth=1;c.beginPath();c.moveTo(24,12);c.lineTo(229,12);c.moveTo(270,12);c.lineTo(334,12);c.stroke();
      text(c,this.definition.tag,21,21,8,palette[1]);text(c,this.definition.title,21,43,19,'#405148');panel(c,188,29,47,26,11,'#FFFDF0');text(c,this.stage+' / '+this.levelCount,211.5,42,11,palette[1],'center');
      text(c,'本局得分',302,23,9,'#FFF6D8','center');c.shadowColor='#3B423E77';c.shadowOffsetY=1;text(c,Math.round(this.score),302,45,20,'#FFFFFF','center');c.shadowOffsetY=0;
      const gap=4,width=(338-gap*(this.levelCount-1))/this.levelCount;for(let i=0;i<this.levelCount;i++)panel(c,11+i*(width+gap),71,width,3,1.5,i<this.stage?'#FFE39B':'#FFFFFF61');
      if(!this.controls){const bottom=c.createLinearGradient(0,491,0,555);bottom.addColorStop(0,'#FFFAEEDF');bottom.addColorStop(1,'#F5E6C8F2');panel(c,8,491,344,64,15,bottom);}
      c.restore();
    }
    render(){
      if(this.destroyed)return;const c=this.ctx;c.setTransform(this.canvas.width/WIDTH,0,0,this.canvas.height/HEIGHT,0,0);c.clearRect(0,0,WIDTH,HEIGHT);
      if(this.isCasual){c.fillStyle=this.definition.paper;c.fillRect(0,0,WIDTH,HEIGHT);c.save();let loaded=false;try{loaded=!!root.AirvanaPhysicsArt?.background?.(c,this.key,0,0,WIDTH,HEIGHT);}catch(_){}c.restore();this.canvas.dataset.physicsArtReady=String(loaded);}
      c.save();c.beginPath();c.rect(0,78,WIDTH,410);c.clip();this.model.draw(c);c.restore();
      if(this.isCasual)this.renderCasualHud(c);else{
        c.fillStyle=this.definition.paper;c.fillRect(0,0,WIDTH,78);c.fillRect(0,488,WIDTH,72);
        text(c,this.definition.tag,16,17,9,this.definition.color);text(c,this.definition.title,16,41,21);text(c,'第 '+this.stage+' / '+this.levelCount+' 关',16,65,11,'#677D87');panel(c,248,14,96,52,16,this.definition.color);text(c,'本局得分',296,29,10,'#EAF7FA','center');text(c,Math.round(this.score),296,49,20,'#FFFFFF','center');
        c.fillStyle=this.definition.color;c.fillRect(0,76,WIDTH*this.stage/this.levelCount,2);
      }
      if(!this.controls)text(c,this.model.instruction||this.definition.instruction,12,520,11);
      this.canvas.dataset.physicsState=this.paused?'paused':this.phase;this.canvas.dataset.physicsLevel=String(this.stage);this.canvas.dataset.physicsScore=String(Math.round(this.score));
    }
    snapshot(){return{key:this.key,levelCount:this.levelCount,stage:this.stage,phase:this.phase,paused:this.paused,finished:this.finished,score:this.score,model:this.model.snapshot()};}
    destroy(){if(this.destroyed)return;this.destroyed=true;root.cancelAnimationFrame(this.frame);this.cancelPointer();this.listeners.forEach(fn=>fn());this.listeners=[];this.model?.destroy?.();this.audio?.close?.();this.controls?.remove();this.overlay?.remove();this.host?.classList.remove('physics-host');if(this.isCasual)this.host?.classList.remove('is-casual');}
  }
  function register(items){
    if(!Array.isArray(items))throw new TypeError('游戏注册必须为数组');
    const keys=new Set(definitions.map(x=>x.key)),ids=new Set(definitions.map(x=>x.id));
    const pending=items.map(item=>{if(!item||!/^[a-z][a-z0-9-]+$/.test(item.key)||!Number.isInteger(item.id)||keys.has(item.key)||ids.has(item.id)||!Number.isInteger(item.stages)||item.stages<1||item.stages>20||!root.AirvanaPhysicsModes?.[item.key])throw new Error('游戏注册无效或重复：'+item?.key);keys.add(item.key);ids.add(item.id);return{...item};});
    definitions.push(...pending);return pending.length;
  }
  root.AirvanaPhysicsGames=Object.freeze({version:VERSION,register,width:WIDTH,height:HEIGHT,list:()=>definitions.map(x=>({...x})),sessions,has:key=>!!metadata(key)&&!!root.AirvanaPhysicsModes?.[key],mount:(canvas,key,options)=>new PhysicsGame(canvas,key,options),PhysicsGame});
})(typeof window!=='undefined'?window:globalThis);
