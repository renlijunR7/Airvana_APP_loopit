import {GameEngine,LEVELS,TOWER_TYPES} from './engine.js';
import {BattleRenderer} from './art.js';
import {BattleAudio} from './audio.js';
import {TutorialGuide} from './tutorial.js';
import {LoadingScreen} from './loading.js';

const $=s=>document.querySelector(s),game=$('#game'),renderer=new BattleRenderer($('#battlefield'));
const uiImage=name=>`<img src="assets/ui/${name}.png" alt="" draggable="false">`;
const towerIcon={archer:'Battle_TowerBuilding_icon3',barracks:'Battle_TowerBuilding_icon1',mage:'Battle_TowerBuilding_icon2',cannon:'Battle_TowerBuilding_icon4'};
let engine,booted=false,selected=-1,target=null,modalOpen=false,menuKey='',lastStateKey='',toastUntil=0,announceUntil=0,clock=0,lastTime=0,frames=0,fpsStart=0;
let progress={unlocked:0,stars:[0,0,0],sound:false};
try{const stored=JSON.parse(localStorage.getItem('niguolaiya-replica-v1'));if(stored&&Array.isArray(stored.stars))progress={...progress,...stored,unlocked:Math.min(2,Math.max(0,Number(stored.unlocked)||0))};}catch{}
let tutorial;
progress.tutorialDone=progress.tutorialDone&&typeof progress.tutorialDone==='object'?progress.tutorialDone:{};
const save=()=>{try{localStorage.setItem('niguolaiya-replica-v1',JSON.stringify(progress));}catch{}};
const audio=new BattleAudio();
function sound(kind){audio.play(kind);}

function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');toastUntil=clock+2.6;}
function announce(message){$('#announcement').textContent=message;$('#announcement').classList.add('show');announceUntil=clock+2.5;}
function feedback(result){if(!result.ok)toast(result.message);return result.ok;}
function closeMenu(){selected=-1;$('#tower-menu').hidden=true;menuKey='';updateSlots();}
function cancelTarget(){target=null;$('#target-hint').hidden=true;$('#fire').classList.remove('selected');$('#reinforcements').classList.remove('selected');}
function closeModal(){modalOpen=false;$('#modal').hidden=true;$('#modal').innerHTML='';$('#modal').dataset.view='';if(tutorial?.active)tutorial.resume();}
function newGame(level=0){renderer.reset();tutorial?.reset();closeModal();cancelTarget();selected=-1;lastStateKey='';menuKey='';$('#tower-menu').hidden=true;engine=new GameEngine({level,onEvent:onEvent});$('#guide').hidden=true;createSlots();updateUI();announce(`第 ${level+1} 关 · ${LEVELS[level].name}`);}
function onEvent(e){if(e.type==='attack'){renderer.attack(e.towerId,engine.state.time);sound(e.towerType);}else if(e.type==='skill')sound(e.skill);else if(['build','upgrade','kill','leak','sell','lost'].includes(e.type))sound(e.type);if(e.type==='wave'){announce(`第 ${e.wave} / ${e.totalWaves} 波 · 敌军来袭`);$('#guide').hidden=true;closeMenu();}if(e.type==='between'||e.type==='waveComplete'){announce('敌军已退，整备防线！');} }
function createSlots(){const slots=$('#slots');slots.innerHTML='';engine.config.slots.forEach((p,i)=>{const button=document.createElement('button');button.className='slot';button.style.left=`${p.x/750*100}%`;button.style.top=`${p.y/1334*100}%`;button.dataset.slot=i;button.innerHTML='<span class="plot">'+uiImage('build-site-original')+'</span><span class="tower-level"></span>';button.setAttribute('aria-label',`空地 ${i+1}：建造防御塔`);button.addEventListener('click',()=>{if(target){castAt(p.x,p.y);return;}if(modalOpen)return;selected=selected===i?-1:i;$('#guide').hidden=true;menuKey='';showTowerMenu();updateSlots();});slots.append(button);});}
function updateSlots(){if(!engine)return;const towers=engine.state.towers;document.querySelectorAll('.slot').forEach(el=>{const i=Number(el.dataset.slot),t=towers.find(t=>t.slotIndex===i);el.classList.toggle('occupied',!!t);el.classList.toggle('selected',selected===i);el.querySelector('.tower-level').innerHTML=t?Array.from({length:t.level},()=>uiImage('Result_Star1')).join(''):'';el.setAttribute('aria-label',t?`${t.name} ${t.level}级，位置 ${i+1}`:`空地 ${i+1}：建造防御塔`);});}
function showTowerMenu(){const menu=$('#tower-menu');if(selected<0){menu.hidden=true;return;}const s=engine.state,t=s.towers.find(t=>t.slotIndex===selected),p=engine.config.slots[selected];const key=`${selected}-${s.gold}-${t?.level}-${t?.type}`;if(menuKey===key)return;menuKey=key;const left=Math.max(25,Math.min(75,p.x/750*100)),top=Math.max(17,Math.min(82,p.y/1334*100));menu.style.left=`${left}%`;menu.style.top=`${top}%`;menu.classList.toggle('upgrade-menu',!!t);menu.hidden=false;
  if(!t){const order=['barracks','archer','mage','cannon'];menu.innerHTML=`<div class="build-grid">${order.map(type=>{const v=TOWER_TYPES[type];return `<button class="build-choice ${s.gold<v.cost?'unaffordable':''}" data-build="${type}" aria-label="建造${v.name}，${v.cost}陨铁"><span class="icon">${uiImage(towerIcon[type])}</span><small>${v.cost}</small></button>`}).join('')}</div><button class="menu-close" data-action="close" aria-label="关闭建塔菜单">×</button>`;}
  else{const spec=TOWER_TYPES[t.type],max=t.level>=3,cost=spec.upgradeCost[t.level-1];menu.innerHTML=`<button class="tower-action upgrade-action ${max?'max-level':''}" data-action="upgrade" aria-label="${max?'已满级':'升级 '+cost+' 陨铁'}">${uiImage('Battle_TowerBuilding_Upgrade')}<small>${max?'满级':cost}</small></button><button class="tower-action sell-action" data-action="sell" aria-label="拆除 +${Math.floor(t.spent*.7)}">${uiImage('Battle_TowerBuilding_Sale')}<small>${Math.floor(t.spent*.7)}</small></button><button class="menu-close" data-action="close" aria-label="关闭防御塔菜单">×</button>`;}

  menu.querySelector('[data-action="close"]').onclick=closeMenu;
  menu.querySelectorAll('[data-build]').forEach(b=>b.onclick=()=>{if(feedback(engine.build(selected,b.dataset.build))){closeMenu();updateUI();}});
  const up=menu.querySelector('[data-action="upgrade"]');if(up)up.onclick=()=>{if(feedback(engine.upgrade(selected))){menuKey='';showTowerMenu();updateUI();}};
  const sell=menu.querySelector('[data-action="sell"]');if(sell)sell.onclick=()=>{const result=engine.sell(selected);if(feedback(result)){toast(result.message);closeMenu();updateUI();}};
}
function updateUI(){const s=engine.state;$('#life').textContent=s.life;$('#gold').textContent=s.gold;$('#level-name').textContent=LEVELS[s.level].name;const key=`${s.life}/${s.gold}/${s.wave}/${s.status}/${s.towers.map(t=>t.level).join(',')}`;if(key!==lastStateKey){lastStateKey=key;$('#level-button').style.setProperty('--wave-shift',`${Math.min(2,Math.max(0,s.wave-1))*7.03125+4.765625}cqw`);$('#wave-dots').innerHTML=Array.from({length:s.totalWaves},(_,i)=>{const index=Math.max(0,s.wave-1);if(i<index-2||i>index+2&&i!==s.totalWaves-1)return '';const current=i===index,done=i<s.wave-1||s.status==='between'&&i<s.wave||s.status==='won',last=i===s.totalWaves-1;return `<span class="wave-dot ${current?'current':''} ${done?'done':''} ${last?'last':''}">${uiImage(current?'wave_bg_current':'wave_bg_next')}${current||last?`<b>${i+1}</b>`:''}</span>`}).join('');updateSlots();if(selected>=0)showTowerMenu();}
 const running=s.status==='running';$('#start-wave').hidden=running;$('#start-wave').classList.toggle('between-wave',s.status==='between');$('#start-wave').classList.toggle('in-battle',running);$('#start-wave').innerHTML=uiImage('Battle_Begin')+(s.status==='between'?`<small>${Math.ceil(s.nextWaveIn||0)}s</small>`:'');$('#start-wave').setAttribute('aria-label',running?'敌军正在进攻':s.status==='between'?'开始下一波':'开始迎敌');$('#speed').hidden=s.status==='ready';$('#speed').innerHTML=uiImage('Battle_Quicken1')+`<span>${uiImage('speed_0'+([1,1.5,2,2.5].indexOf(s.speed)+1))}</span><b>加速</b>`;$('#speed').setAttribute('aria-label',`切换战斗速度，当前 ${s.speed} 倍`);audio.pause(s.paused||modalOpen||tutorial?.active);

 for(const type of ['fire','reinforcements']){const cd=s.skills[type].cooldown,el=$('#'+type);el.classList.toggle('cooling',cd>0);el.querySelector('em').textContent=Math.ceil(cd);}
 Object.assign(game.dataset,{status:s.status,life:s.life,gold:s.gold,wave:s.wave,enemies:s.enemies.length,towers:s.towers.length,kills:s.kills,paused:String(s.paused),level:s.level+1});
}
function toggleSkill(type){const s=engine.state;if(s.status!=='running'){toast('敌军进攻时才能使用技能');return;}if(s.paused){toast('请先继续游戏');return;}if(s.skills[type].cooldown>0){toast(`技能冷却中，还需 ${Math.ceil(s.skills[type].cooldown)} 秒`);return;}if(target?.type===type){cancelTarget();return;}closeMenu();cancelTarget();target={type};$('#'+type).classList.add('selected');$('#target-hint').hidden=false;toast(type==='fire'?'点击敌群，召唤闪电风暴':'点击道路，派出招兵');}
function castAt(x,y){if(!target)return;const r=engine.castSkill(target.type,x,y);if(feedback(r)){toast(r.message);cancelTarget();}updateUI();}
$('#battlefield').addEventListener('pointerdown',e=>{const r=e.currentTarget.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*750,y=(e.clientY-r.top)/r.height*1334;if(target)castAt(x,y);else closeMenu();});
$('#battlefield').addEventListener('pointermove',e=>{if(target){const r=e.currentTarget.getBoundingClientRect();target.x=(e.clientX-r.left)/r.width*750;target.y=(e.clientY-r.top)/r.height*1334;}});
$('#cancel-target').onclick=cancelTarget;
$('#fire').onclick=()=>toggleSkill('fire');$('#reinforcements').onclick=()=>toggleSkill('reinforcements');
$('#start-wave').onclick=()=>{feedback(engine.startWave());updateUI();};

$('#speed').onclick=()=>{const speed=engine.state.speed;engine.setSpeed(speed>=2.5?1:speed+.5);updateUI();};
$('#guide-close').onclick=()=>{$('#guide').hidden=true;};
$('.guide-seal').innerHTML=uiImage('Head_Icon9');
$('#pause').innerHTML=uiImage('Battle_Pause');$('#heart-icon').innerHTML=uiImage('Battle_Icon3');$('#iron-icon').innerHTML=uiImage('Battle_Icon2');$('#fire .skill-art').innerHTML=uiImage('HeroSkill_Icon1');$('#reinforcements .skill-art').innerHTML=uiImage('HeroSkill_Icon2');$('#fire b').innerHTML=uiImage('skillName_3201');$('#reinforcements b').innerHTML=uiImage('skillName_3202');
function updateSound(){$('#sound').innerHTML=uiImage('Result_Set_Sound');$('#sound').classList.toggle('muted',!progress.sound);audio.musicEnabled=progress.music!==false;audio.setEnabled(progress.sound);$('#sound').setAttribute('aria-label',progress.sound?'关闭声音':'开启声音');}
$('#sound').onclick=()=>{progress.sound=!progress.sound;save();updateSound();sound('build');toast(progress.sound?'声音已开启':'声音已关闭');};updateSound();

function openModal(content,view=''){ $('#modal').dataset.view=view;if(tutorial?.active)tutorial.suspend();else{closeMenu();cancelTarget();}modalOpen=true;$('#modal').innerHTML=`<section class="parchment" role="dialog" aria-modal="true">${content}</section>`;$('#modal').hidden=false;}
function pauseGame(){if(['won','lost'].includes(engine.state.status))return;if(!engine.state.paused)engine.togglePause();
 openModal(`<h2 class="pause-title">暂停</h2><div class="pause-subtitle">已学锦囊</div><div class="pause-settings"><button id="modal-sound" class="setting-button ${progress.sound?'':'muted'}" aria-label="${progress.sound?'关闭声音':'开启声音'}">${uiImage('Result_Set_Sound')}</button><button id="modal-music" class="setting-button ${progress.music===false?'muted':''}" aria-label="${progress.music===false?'开启音乐':'关闭音乐'}">${uiImage('Result_Set_Music')}</button></div><div class="pause-actions"><button class="gold-button" id="restart">重新开始</button><button class="plain-button" id="resume">继续游戏</button></div><button class="pause-text-button" id="levels">选择关卡</button><button class="pause-text-button" id="replay-tutorial">重开并查看指引</button>`,'pause');
 $('#resume').onclick=()=>{closeModal();if(engine.state.paused)engine.togglePause();updateUI();};$('#restart').onclick=()=>newGame(engine.levelIndex);$('#levels').onclick=showLevels;$('#replay-tutorial').onclick=()=>{progress.tutorialDone={};progress.tutorialSkipped=false;save();newGame(0);};
 $('#modal-sound').onclick=()=>{progress.sound=!progress.sound;save();updateSound();$('#modal-sound').classList.toggle('muted',!progress.sound);$('#modal-sound').setAttribute('aria-label',progress.sound?'关闭声音':'开启声音');};
 $('#modal-music').onclick=()=>{progress.music=progress.music===false;save();audio.musicEnabled=progress.music;$('#modal-music').classList.toggle('muted',!progress.music);$('#modal-music').setAttribute('aria-label',progress.music?'关闭音乐':'开启音乐');};updateUI();}

$('#pause').onclick=pauseGame;
function showLevels(){if(!engine.state.paused&&!['won','lost'].includes(engine.state.status))engine.togglePause();openModal(`<div class="ribbon">三国征途</div><h2>选择战场</h2><p>守住道路，逐关击退来犯之敌。</p>${LEVELS.map((l,i)=>`<button class="level-card" data-level="${i}"><span>${i+1}</span><div><strong>${l.name}</strong><small>${l.waves.length} 波敌军 · ${l.startingGold} 初始陨铁</small></div><em>${i>progress.unlocked?'未解锁':progress.stars[i]?'★'.repeat(progress.stars[i]):'出征'}</em></button>`).join('')}<button class="plain-button" id="back">返回战场</button>`);document.querySelectorAll('[data-level]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.level);if(i>progress.unlocked){toast('先守住上一关，即可解锁');return;}newGame(i);});$('#back').onclick=()=>{closeModal();if(engine.state.paused)engine.togglePause();};}
$('#level-button').onclick=showLevels;
function showResult(){const s=engine.state;if(!['won','lost'].includes(s.status))return;const won=s.status==='won',stars=won?(s.life>=18?3:s.life>=15?2:1):0;if(won){progress.stars[s.level]=Math.max(progress.stars[s.level]||0,stars);progress.unlocked=Math.max(progress.unlocked,Math.min(2,s.level+1));save();sound('win');}
 openModal(`<div class="result-title ${won?'win':'lose'}">${uiImage(won?'Result_Win_Bg':'Result_Lose_Bg')}${uiImage(won?'Result_Win':'Result_Lose')}</div><div class="result-stars" aria-label="${stars}星">${Array.from({length:3},(_,i)=>uiImage(i<stars?'Result_Star1':'Result_Star2')).join('')}</div><h2>${won?'敌军已退，村庄无恙！':'胜败乃兵家常事'}</h2><p>${won?'休整兵马，迎接下一场战斗。':'试试在岔路口建塔，用兵营拦截、闪电风暴清场。'}</p><div class="result-stats"><span>剩余生命<strong>${s.life}</strong></span><span>击败敌军<strong>${s.kills}</strong></span><span>完成波次<strong>${s.wave}/${s.totalWaves}</strong></span></div><button class="gold-button" id="result-primary">${won&&s.level<2?'下一关':'再战一次'}</button><button class="plain-button" id="result-levels">选择关卡</button>`,'result');$('#result-primary').onclick=()=>newGame(won&&s.level<2?s.level+1:s.level);$('#result-levels').onclick=showLevels;}
document.addEventListener('keydown',e=>{if(!booted)return;if(tutorial?.active&&!modalOpen){if(e.key==='Escape'){e.preventDefault();pauseGame();}else if(['1','2'].includes(e.key))e.preventDefault();return;}if(e.key==='Escape'){if(modalOpen&&engine.state.paused){closeModal();engine.togglePause();return;}if(target)cancelTarget();else if(selected>=0)closeMenu();else if(modalOpen&&engine.state.paused){closeModal();engine.togglePause();}else pauseGame();}if(e.code==='Space'&&!modalOpen){e.preventDefault();feedback(engine.startWave());}if(e.key==='1'&&!modalOpen)toggleSkill('fire');if(e.key==='2'&&!modalOpen)toggleSkill('reinforcements');});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&engine?.state.status==='running'&&!engine.state.paused)pauseGame();lastTime=performance.now();});
new ResizeObserver(()=>renderer.resize()).observe(game);
tutorial=new TutorialGuide({root:game,getState:()=>engine.state,getFlags:()=>({done:progress.tutorialDone,disabled:progress.tutorialSkipped}),onComplete:lesson=>{progress.tutorialDone[lesson]=true;save();},onSkip:()=>{progress.tutorialSkipped=true;save();closeMenu();cancelTarget();toast('已跳过指引，可在暂停菜单重新查看');},castAt,beforeStep:step=>{if(step.selector?.startsWith('[data-slot')||step.selector==='#start-wave')closeMenu();if(step.point&&target){target.x=step.point.x;target.y=step.point.y;}},onOpen:()=>{closeMenu();cancelTarget();$('#guide').hidden=true;$('#announcement').classList.remove('show');announceUntil=0;}});
const loading=new LoadingScreen(game);
try{
 const stages={battle:0,ui:0,font:0};
 const report=(stage,value)=>{stages[stage]=value;loading.setProgress(stages.battle*.9+stages.ui*.08+stages.font*.02);};
 await Promise.all([
  renderer.load(value=>report('battle',value)),
  loading.loadUI(value=>report('ui',value)),
  document.fonts.load('16px GameFont').then(()=>report('font',1)),
 ]);
 await loading.complete();
 newGame(0);
 renderer.draw(engine.state,clock,selected,target);
 loading.hide();
 booted=true;
 lastTime=fpsStart=performance.now();
 requestAnimationFrame(frame);
}catch(error){loading.fail(error);}
function frame(now){if(now-lastTime<1000/60-1){requestAnimationFrame(frame);return;}const dt=Math.min((now-lastTime)/1000||0,.06);lastTime=now;clock+=dt;if(!modalOpen)tutorial.update();if(!tutorial.active)engine.update(dt);renderer.draw(engine.state,clock,selected,target);if(frames%6===0)updateUI();if(clock>toastUntil)$('#toast').classList.remove('show');if(clock>announceUntil)$('#announcement').classList.remove('show');if(['won','lost'].includes(engine.state.status)&&!modalOpen)showResult();frames++;if(now-fpsStart>1000){game.dataset.fps=Math.round(frames*1000/(now-fpsStart));frames=0;fpsStart=now;}requestAnimationFrame(frame);}
