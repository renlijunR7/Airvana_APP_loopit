import { HoldemGame, chooseAction, evaluate, parseCard } from './engine.js';
import { createScene } from './scene.js?v=1.2.1';
import { SCENE_THEMES, getSceneTheme } from './scene-themes.js';
import { createTrainingGame, chooseTrainingAction, getTrainingLesson, getTrainingReview } from './training.js?v=1.2.0';
import { createTelemetry } from './telemetry.js?v=1.2.0';

const $ = (id) => document.getElementById(id);
const money = (n) => Number(n ?? 0).toLocaleString('en-US');
const names = ['YOU', 'VIKTOR', 'SCARLETT', 'THE DUKE', 'JACK', 'VALENTINA'];
const words = { fold: '弃牌', check: '过牌', call: '跟注', bet: '下注', raise: '加注', 'all-in': '全下', 'small-blind': '小盲', 'big-blind': '大盲' };
const phases = {waiting:'等待入座',preflop:'翻牌前',flop:'翻牌',turn:'转牌',river:'河牌',complete:'摊牌结算'};
let game, state, scene, aiTimer, resultTimer, toastTimer, sound, audioContext, fast = false;
let camera = 0, raiseType, raiseMin = 100, raiseMax = 2500, useAllIn = false, lastHand = 0;
let muted = true, paused = false, leaveConfirm = false, completedKey = '', eventsSeen = 0;
let mode='tutorial', interactionLogged=false, ctaShown=false, coachCollapsed=false;
const telemetry=createTelemetry();
let ctaObserver;
let stats = { hands:0, wins:0, rep:0, history:[], sound:false, theme:'vegas' };
try { stats = {...stats,...JSON.parse(localStorage.getItem('prominence-browser-v1') || '{}')}; } catch {}
stats.theme = getSceneTheme(stats.theme).id;
const safe = (s) => String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function save(){ try { localStorage.setItem('prominence-browser-v1',JSON.stringify(stats)); } catch {} }
function toast(text){clearTimeout(toastTimer);$('toast').textContent=text;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,2600)}
function show(id,value=true){$(id).hidden=!value}
function effect(type='chip') {
  if(muted) return;
  try {
    audioContext ??= new (window.AudioContext||window.webkitAudioContext)();
    if(audioContext.state==='suspended') audioContext.resume();
    const now=audioContext.currentTime;
    const tones=type==='win'?[523,659,784,1047]:type==='deal'?[700,900]:type==='fold'?[170]:[900,1400,1100];
    tones.forEach((f,i)=>{const o=audioContext.createOscillator(),g=audioContext.createGain();o.type=type==='win'?'sine':'triangle';o.frequency.setValueAtTime(f,now+i*.045);o.frequency.exponentialRampToValueAtTime(f*.4,now+i*.045+.09);g.gain.setValueAtTime(0,now+i*.045);g.gain.linearRampToValueAtTime(.045,now+i*.045+.005);g.gain.exponentialRampToValueAtTime(.001,now+i*.045+.13);o.connect(g).connect(audioContext.destination);o.start(now+i*.045);o.stop(now+i*.045+.15)});
  } catch {}
}
function cardHTML(code,empty=false){
  if(!code) return `<div class="card ${empty?'empty':'back'}" aria-label="${empty?'尚未发牌':'未亮牌'}"></div>`;
  const c=parseCard(code),rank=c.rank==='T'?'10':c.rank;
  return `<div class="card ${c.color==='red'?'red':''}" aria-label="${c.symbol}${rank}"><span class="rank">${rank}</span><span class="suit-small">${c.symbol}</span><span class="suit-big">${c.symbol}</span><span class="card-corner">${rank}</span></div>`;
}
function setCards(el,cards,count=cards.length,empty=false){const key=cards.join(',')+count+empty;if(el.dataset.cards===key)return;el.dataset.cards=key;el.innerHTML=Array.from({length:count},(_,i)=>cardHTML(cards[i],empty)).join('');[...el.children].forEach((n,i)=>n.style.animationDelay=`${i*70}ms`)}
function freshTable(){
  clearTimeout(aiTimer);clearTimeout(resultTimer);completedKey='';eventsSeen=0;lastHand=0;
  game=mode==='tutorial'?createTrainingGame():new HoldemGame({smallBlind:25,bigBlind:50,seed:`practice-${Date.now()}-${Math.random()}`,buttonSeat:0,maxPlayers:6,players:names.map((name,seat)=>({id:seat===0?'hero':`bot-${seat}`,name,seat,stack:2500,ready:true}))});
  state=game.getState({viewerId:'hero'});
  render();
}
function start(){
  muted=!stats.sound;updateSoundButton();paused=false;
  $('game').classList.remove('is-lobby');show('lobby',false);show('table-hud');show('hero-panel');
  if(game.phase==='waiting') nextHand();
}
function beginSession(nextMode){
  mode=nextMode;paused=false;coachCollapsed=false;$('coach').classList.remove('is-collapsed');
  $('coach-toggle').textContent='−';$('coach-toggle').setAttribute('aria-expanded','true');$('coach-toggle').setAttribute('aria-label','收起教学提示');
  $('game').dataset.mode=mode;
  $('mode-label').textContent=mode==='tutorial'?'新手教学 · 固定发牌':'自由练习 · 5 位本地 AI';
  show('result',false);freshTable();start();
}
function nextHand(){
  if(paused){toast('请先关闭菜单继续牌局');return;}
  if(game.isHandRunning){toast('请先完成当前牌局');return;}
  clearTimeout(resultTimer);show('result',false);show('raise-panel',false);
  document.querySelectorAll('.card.is-best').forEach(card=>card.classList.remove('is-best'));
  if(game.getState({viewerId:'hero'}).players[0].stack===0 || !game.canStartHand()){
    freshTable();toast('已重新入座，每位玩家带入 2,500 筹码');
  }
  game.nextHand();eventsSeen=0;interactionLogged=false;ctaShown=false;ctaObserver?.disconnect();
  telemetry.track('play_start',{mode,phase:'preflop',scene:stats.theme});
  effect('deal');render();scheduleAI();
}
function render(){
  state=game.getState({viewerId:'hero'});
  scene?.update(state);
  const hero=state.players.find(p=>p.id==='hero');
  $('hero-stack').textContent=money(hero.stack);
  $('hero-level').textContent=String(1+Math.floor(stats.rep/100)).padStart(2,'0');
  $('hero-position').textContent=hero.isButton?'D':hero.isSmallBlind?'SB':hero.isBigBlind?'BB':'';
  $('pot-amount').textContent=money(state.pot);
  $('hand-number').textContent=`HAND ${String(state.handNumber).padStart(2,'0')}`;
  $('street-name').textContent=phases[state.phase];
  setCards($('hero-cards'),hero.cards,2);
  setCards($('board-cards'),state.board,5,true);
  if(hero.folded) $('hand-strength').textContent='已弃牌 · 观看本局';
  else if(hero.cards[0]&&state.board.length>=3) $('hand-strength').textContent=evaluate([...hero.cards,...state.board]).category;
  else if(hero.cards[0]){const [a,b]=hero.cards.map(parseCard);$('hand-strength').textContent=a.rank===b.rank?'口袋对子':a.suit===b.suit?'同花底牌':'等待翻牌';}
  else $('hand-strength').textContent='等待发牌';
  renderSeats();
  show('raise-panel',false);
  const myTurn=state.currentPlayerId==='hero'&&state.isHandRunning;
  show('action-panel',myTurn&&!paused);show('waiting',!myTurn&&state.isHandRunning&&!paused);
  if(myTurn){
    const legal=game.getLegalActions('hero'),canCheck=legal.actions.some(a=>a.type==='check');
    $('call-label').textContent=canCheck?'过牌':'跟注';
    $('call-cost').textContent=canCheck?'CHECK':money(legal.callAmount);
    $('call-btn').setAttribute('aria-label',canCheck?'过牌':`跟注 ${money(legal.callAmount)}`);
    $('turn-label').textContent=hero.allIn?'已全下':'轮到你行动 / YOUR TURN';
    $('raise-btn').style.opacity=legal.actions.some(a=>['bet','raise','all-in'].includes(a.type))?'1':'.4';
  } else if(state.isHandRunning){
    const current=state.players.find(p=>p.id===state.currentPlayerId);
    $('waiting-text').textContent=`${current?.name??'牌桌'} 正在思考`;
  }
  if(state.phase==='complete'){
    show('waiting',false);show('action-panel',false);
    const key=state.handSeed;
    if(completedKey!==key){
      completedKey=key;
      const won=state.result.winnerIds.includes('hero');
      if(mode==='practice'){
        stats.hands++;stats.rep+=10;if(won){stats.wins++;stats.rep+=25;}
        stats.history.unshift({hand:stats.hands,net:hero.net,win:won,pot:state.result.totalPot,category:state.result.hands.hero?.category??(hero.folded?'弃牌':'对手弃牌'),winners:state.result.winnerIds.map(id=>state.players.find(p=>p.id===id)?.name).join(' / ')});stats.history=stats.history.slice(0,30);save();
      }
      telemetry.track('play_complete',{mode,phase:'complete',scene:stats.theme});
      effect(won?'win':'deal');resultTimer=setTimeout(renderResult,750);
    }
  }
  if(state.handNumber!==lastHand){lastHand=state.handNumber;eventsSeen=0}
  const recent=state.events.slice(eventsSeen);eventsSeen=state.events.length;
  if(recent.some(e=>e.type==='street-started')) effect('deal');
  renderCoach();
  window.__pokerState=state;
}
function renderSeats(){
  for(const p of state.players){
    if(p.seat===0)continue;
    let el=$(`seat-${p.seat}`);
    if(!el){el=document.createElement('div');el.id=`seat-${p.seat}`;el.className='seat-label';$('seat-labels').append(el)}
    const badge=p.isButton?'D':p.isSmallBlind?'SB':p.isBigBlind?'BB':'';
    const action=p.stack===0&&!p.inHand?'已离桌':p.allIn&&state.isHandRunning?'ALL IN':p.folded?'弃牌':p.lastAction?`${words[p.lastAction.type]??''}${p.lastAction.amount?' '+money(p.lastAction.amount):''}`:'';
    el.innerHTML=`<span class="seat-name">${p.name}${badge?`<span class="position-badge">${badge}</span>`:''}</span><span class="seat-money">${money(p.stack)}</span><span class="seat-action">${action}</span>`;
    el.classList.toggle('is-turn',p.id===state.currentPlayerId);
    el.classList.toggle('is-folded',p.folded||!p.stack&&!p.inHand);
    el.style.display=state.phase==='waiting'?'none':'';
  }
}
let projectionFrame=0;
function projectLabels(){
  if(scene?.projectSeats){
    const positions=scene.projectSeats();
    const width=$('game').clientWidth;
    const bottomLimit = width < $('game').clientHeight ? 0.60 : 0.71;
    const labels=positions.map(p=>({p,el:$(`seat-${p.seat}`)})).filter(x=>x.el).map(x=>({...x,half:x.el.offsetWidth/2+8}));
    const height=$('game').clientHeight, hud=$('table-hud').getBoundingClientRect(), switcher=$('scene-btn').getBoundingClientRect();
    for(const {p,el,half} of labels){
      let x=Math.max(half,Math.min(width-half,p.x*width)), y=Math.max(.17,Math.min(bottomLimit,p.y))*height;
      const halfHeight=el.offsetHeight/2;
      if($('scene').dataset.framing==='scenic'&&!$('table-hud').hidden&&x+half>hud.left&&x-half<hud.right&&y+halfHeight>hud.top&&y-halfHeight<hud.bottom)y=Math.max(halfHeight+8,hud.top-halfHeight-8);
      if(x+half>switcher.left&&x-half<switcher.right&&y+halfHeight>switcher.top&&y-halfHeight<switcher.bottom)x=Math.min(width-half,switcher.right+half+8);
      el.style.left=`${x}px`;el.style.top=`${y}px`;
    }
  }
  projectionFrame=requestAnimationFrame(projectLabels);
}
function scheduleAI(){
  clearTimeout(aiTimer);
  if(paused||!game.isHandRunning||game.currentPlayerId==='hero') return;
  aiTimer=setTimeout(()=>{
    if(paused||!game.isHandRunning||game.currentPlayerId==='hero')return;
    const id=game.currentPlayerId;
    const move=mode==='tutorial'?chooseTrainingAction(game.getState({viewerId:id})):chooseAction(game.getState({viewerId:id}));
    if(!move){toast('牌局状态异常，请重新入座');return;}
    try{game.act(id,move);effect(move.type==='fold'?'fold':'chip');render();scheduleAI()}catch(e){console.error(e);toast('对手行动失败：'+e.message)}
  },mode==='tutorial'?(state.players[0].folded||state.players[0].allIn?100:280):fast?180:750+Math.random()*450);
}
function act(type,to){
  if(paused){toast('请先关闭菜单继续牌局');return;}
  if(game.currentPlayerId!=='hero'){toast('请等待其他玩家行动');return;}
  try{
    const phase=game.phase;game.act('hero',to==null?{type}:{type,to});
    if(!interactionLogged){telemetry.track('valid_interaction',{mode,phase,action:type==='all-in'?'all_in':type});interactionLogged=true;}
    effect(type==='fold'?'fold':'chip');render();scheduleAI();
  }catch(e){toast(e.message)}
}
function call(){const l=game.getLegalActions('hero');act(l.actions.some(a=>a.type==='check')?'check':'call')}
function openRaise(){
  if(paused){toast('请先关闭菜单继续牌局');return;}
  if(game.currentPlayerId!=='hero'){toast('请等待轮到你');return;}
  const legal=game.getLegalActions('hero'),desc=legal.actions.find(a=>a.type==='raise'||a.type==='bet'),all=legal.actions.find(a=>a.type==='all-in');
  if(!desc&&!all){toast('本轮下注未重新开放，当前只能跟注或弃牌');return;}
  raiseType=desc?.type??'all-in';raiseMin=desc?.min??all.to;raiseMax=desc?.max??all.to;
  $('raise-range').min=raiseMin;$('raise-range').max=raiseMax;$('raise-range').step=1;$('raise-range').value=raiseMin;
  $('raise-kind').textContent=raiseType==='all-in'?(all.to<=legal.currentBet?'ALL IN / 全下跟注':'ALL IN / 全下'):raiseType==='bet'?'BET / 下注':'RAISE TO / 加注至';setRaise(raiseMin);
  show('action-panel',false);show('raise-panel');
}
function setRaise(value){
  value=Math.round(Math.min(raiseMax,Math.max(raiseMin,value)));$('raise-range').value=value;$('raise-output').textContent=money(value);
  useAllIn=value===raiseMax && game.getLegalActions('hero').actions.some(a=>a.type==='all-in');
  $('raise-confirm').textContent=useAllIn?'全下 · ALL IN':raiseType==='bet'?'确认下注':'确认加注';
}
function renderResult(){
  if(paused||document.hidden||game.phase!=='complete')return;
  state=game.getState({viewerId:'hero'});
  if(mode==='tutorial'){renderTrainingResult();return;}
  $('result').classList.remove('training-result');
  const {result}=state,hero=state.players.find(p=>p.id==='hero'),won=result.winnerIds.includes('hero');
  const winners=result.winnerIds.map(id=>state.players.find(p=>p.id===id));
  const split=result.pots.some(p=>p.winnerIds.includes('hero')&&p.winnerIds.length>1);
  const title=won?(split?'平分底池':result.winnerIds.length>1?'赢得部分底池':'这一手，属于你。'):winners.map(p=>p.name).join(' / ');
  const featuredId=won?'hero':winners[0]?.id;
  const category=result.hands[featuredId]?.category;
  const desc=result.reason==='fold'?'其他玩家全部弃牌':category?`${category} · ${result.pots.length>1?`${result.pots.length} 个底池结算`:'摊牌胜出'}`:'摊牌结算';
  const best=result.hands[featuredId]?.bestFive;
  const next=hero.stack===0?'重新入座 · 2,500':game.canStartHand()?'下一手  →':'再开一桌  →';
  $('result').innerHTML=`<div class="eyebrow">${won?'HAND WON / 胜利':'HAND COMPLETE / 本局结束'}</div><h2>${safe(title)}</h2><p>${desc}<br>底池总额 <b>${money(result.totalPot)}</b>${won?` · 你赢得 <b>${money(result.awards.hero)}</b>`:''}</p>${best?`<div class="best-hand">${best.map(c=>cardHTML(c)).join('')}</div>`:''}<div class="result-net"><span>本局练习筹码变化</span><strong>${hero.net>0?'+':''}${money(hero.net)}</strong></div><button class="primary-button" id="next-btn">${next}</button><div class="result-details"><span>声望 +${won?35:10} REP</span><span>第 ${state.handNumber} 手</span></div><button class="text-button" id="result-detail-btn">查看底池与摊牌详情</button><button id="learn-more-btn" class="learn-more-link">了解免费练习玩法 ↗</button>`;
  $('next-btn').onclick=nextHand;$('result-detail-btn').onclick=showShowdown;show('result');bindLearningCTA();
}
function openModal(title,content){
  paused=true;clearTimeout(aiTimer);clearTimeout(resultTimer);$('modal-title').textContent=title;$('modal-content').innerHTML=content;
  if(!$('modal').open)$('modal').showModal();
}
function closeModal(){paused=false;$('modal').close();leaveConfirm=false;if(game.phase==='complete')renderResult();scheduleAI();}
function renderCoach(){
  const active=mode==='tutorial'&&state.isHandRunning&&!$('game').classList.contains('is-lobby');
  show('coach',active);
  $('call-btn').classList.toggle('is-guided',active&&state.currentPlayerId==='hero');
  if(!active)return;
  const lesson=getTrainingLesson(state);
  $('coach-count').textContent=`0${lesson.step} / 05`;
  $('coach-progress').innerHTML=['底牌','翻牌','转牌','河牌','复盘'].map((label,i)=>`<span class="${i+1===lesson.step?'current':i+1<lesson.step?'done':''}" ${i+1===lesson.step?'aria-current="step"':''}>${label}</span>`).join('');
  $('coach-title').textContent=lesson.title;
  $('coach-body').textContent=lesson.body;
  $('coach-tip').textContent=lesson.tip;
}
function renderTrainingResult(){
  const review=getTrainingReview(state);
  const best=new Set(review.bestFive);
  ['hero-cards','board-cards'].forEach(id=>[...$(id).children].forEach((el,i)=>el.classList.toggle('is-best',best.has((id==='hero-cards'?state.players[0].cards:state.board)[i]))));
  $('result').classList.add('training-result');
  $('result').innerHTML=`<div class="review-badge" aria-hidden="true">✓</div><div class="eyebrow">05 / 05 · FIRST HAND / 教学复盘</div><h2>你已走完第一手。</h2><p>看懂过程，就是这次练习的收获。</p><div class="review-hand-label"><span>${review.folded?'弃牌后的牌型观察':'你的最佳五张牌'}</span><strong>${safe(review.category)}</strong></div><div class="best-hand">${review.bestFive.map(c=>cardHTML(c)).join('')}</div><ul class="review-lessons">${review.lessons.map(s=>`<li>${safe(s)}</li>`).join('')}</ul><button id="learn-more-btn" class="primary-button">了解免费练习玩法 ↗</button><p class="cta-caption">前往前可先阅读免费玩法说明</p><div class="review-actions"><button id="replay-lesson" class="secondary-button">再练一次</button><button id="free-practice" class="secondary-button">自由练习 →</button></div><p class="review-disclosure">固定教学发牌，不代表实际胜率。<br>虚拟筹码不可兑换，不与任何运营商账号同步。</p>`;
  $('replay-lesson').onclick=()=>beginSession('tutorial');$('free-practice').onclick=()=>beginSession('practice');
  show('result');bindLearningCTA();
}
function bindLearningCTA(){
  const button=$('learn-more-btn');button.onclick=showFreePlay;
  ctaObserver?.disconnect();
  ctaObserver=new IntersectionObserver(entries=>{
    if(!ctaShown&&!document.hidden&&!$('modal').open&&!$('result').hidden&&button.isConnected&&entries.some(e=>e.isIntersecting&&e.intersectionRatio>=.5)){
      telemetry.track('cta_view',{mode,phase:'review',source:'result'});ctaShown=true;ctaObserver.disconnect();
    }
  },{threshold:.5});
  ctaObserver.observe(button);
}
function showFreePlay(){
  openModal('了解免费练习玩法',`<div class="free-play-tag">PLAY MONEY · 免费玩法</div><p>公开资料介绍了使用 Play Money（虚拟筹码）进行练习的方式。当前这个训练桌是独立概念演示，练习成绩与筹码不会带入其账号。</p><div class="free-play-steps"><div><b>01</b><span>阅读官方免费玩法说明</span></div><div><b>02</b><span>若继续使用官方产品，选择 Play Money 模式</span></div><div><b>03</b><span>遵守官方页面显示的年龄、地区与使用条件</span></div></div><p class="external-note">下方会在新标签页打开 该运营商的公开网页，离开本演示。该网站也可能介绍其他服务；本入口仅用于了解免费练习。</p><a id="official-free-link" class="primary-button external-link" href="" target="_blank" rel="noopener noreferrer">查看官方免费玩法说明 ↗</a><button id="back-to-review" class="practice-link">返回本地练习</button>`);
  $('official-free-link').onclick=()=>telemetry.track('cta_click',{mode,phase:'review',action:'learn_more',source:'cta'});
  $('back-to-review').onclick=closeModal;
}
function showLocalData(){
  const summary=telemetry.summary();
  openModal('本地体验数据 · 最近 200 条',`<p>仅用于检查这个演示的体验流程，保存在当前标签页会话中，不上传服务器。以下是事件次数，不是用户人数或真实业务转化。</p><div class="local-funnel">${summary.funnel.map(row=>`<div><span>${safe(row.label)}</span><strong>${row.count}</strong></div>`).join('')}</div><p>没有记录注册、下载或付费转化；没有收集账号、个人资料、手牌或筹码金额。</p><div class="review-actions"><button class="secondary-button" id="export-events">导出本地记录</button><button class="secondary-button" id="clear-events">清空记录</button></div>`);
  $('export-events').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(telemetry.getEvents(),null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='training-local-events.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
  $('clear-events').onclick=()=>{telemetry.clear();showLocalData();toast('已清空当前会话体验数据')};
}
function showHelp(){
  openModal('牌型与玩法',`<p>每人 2 张底牌，与 5 张公共牌组成最好的 5 张牌。可以过牌、跟注、加注或弃牌；所有人弃牌时，最后留在桌上的玩家获胜。</p><div class="help-rows">${[['皇家同花顺','A K Q J 10 ♠'],['同花顺','9 8 7 6 5 ♥'],['四条','A A A A K'],['葫芦','K K K 8 8'],['同花','A J 8 5 2 ♣'],['顺子','9 8 7 6 5'],['三条','Q Q Q 7 2'],['两对','J J 6 6 A'],['一对','10 10 K 8 3'],['高牌','A J 8 5 2']].map(([name,example],i)=>`<div class="help-row"><b>${i+1}. ${name}</b><span>${example}</span></div>`).join('')}</div><p>加注金额表示本轮累计下注总额。全下筹码不足时会自动分边池；相同牌力平分底池。D 为庄位，SB / BB 为大小盲位。</p><p>拖动牌桌环视；相机按钮切换视角。电脑可用 F 弃牌、C 跟注/过牌、R 打开加注。</p>`);
}
function updateSceneLabels() {
  const t=getSceneTheme(stats.theme);
  $('game').dataset.theme=t.id;
  $('room-name').textContent=t.english;
  $('scene-name').textContent=t.name;
  $('scene-btn').setAttribute('aria-label',`切换场景，当前${t.name}`);
  document.title=`免费新手训练桌 · ${t.name} · 德州扑克概念演示`;
}
function applyTheme(id) {
  try {
    scene?.setTheme(id);scene?.setCamera('scenic');camera=0;stats.theme=getSceneTheme(id).id;save();updateSceneLabels();telemetry.track('scene_change',{mode,scene:stats.theme,source:'scene_picker'});return true;
  } catch(error) {console.error(error);toast('场景切换失败，请重试');return false;}
}
function showScenes() {
  openModal('选择你的牌桌场景',`<p class="scene-picker-intro">换一个地方，继续这一手。切换场景会保留当前牌局。</p><div class="scene-options">${Object.values(SCENE_THEMES).map(t=>`<button class="scene-option scene-${t.id}" data-scene="${t.id}" aria-label="选择${t.name}" aria-pressed="${stats.theme===t.id}"><span class="scene-option-art" aria-hidden="true"><i>${t.icon}</i></span><span class="scene-option-copy"><strong>${t.name}</strong><small>${t.english}</small><span>${t.description}</span></span><span class="scene-selected">${stats.theme===t.id?'使用中':'切换 ↗'}</span></button>`).join('')}</div>`);
  document.querySelectorAll('[data-scene]').forEach(button=>button.onclick=()=>{
    if(applyTheme(button.dataset.scene)){closeModal();toast(`已切换到${getSceneTheme(stats.theme).name}`)}
  });
}
function showMenu(){
  openModal('牌桌设置',`<div class="stats-grid"><div><strong>${stats.hands}</strong><span>自由练习牌局</span></div><div><strong>${stats.wins}</strong><span>获胜牌局</span></div><div><strong>${stats.rep}</strong><span>累计声望</span></div></div><div class="settings-row"><span>牌桌场景</span><select id="theme-select" aria-label="牌桌场景">${Object.values(SCENE_THEMES).map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}</select></div><div class="settings-row"><span>对手思考速度</span><button id="menu-speed">${fast?'快速':'标准'}</button></div><div class="settings-row"><span>声音</span><button id="menu-sound">${muted?'关闭':'开启'}</button></div><div class="settings-row"><span>游戏规则</span><button id="menu-help">查看牌型</button></div><div class="settings-row"><span>练习模式</span><button id="mode-switch">${mode==='tutorial'?'结束本局，进入自由练习':'结束本局，进入新手教学'}</button></div><div class="settings-row"><span>体验数据</span><button id="local-data">查看本地流程</button></div><div class="settings-row"><span>重新开始</span><button id="restart-btn">重新入座</button></div><p style="font-size:10px;color:#82977f">独立概念演示，非官方客户端。虚拟筹码不可兑换；无现金奖励或付费功能。固定教学局不计入自由练习战绩。不接入任何运营商账号、在线牌桌或官方权益。</p>`);
  $('theme-select').value=stats.theme;$('theme-select').onchange=e=>{applyTheme(e.target.value);e.target.value=stats.theme};
  $('menu-speed').onclick=()=>{toggleSpeed();$('menu-speed').textContent=fast?'快速':'标准'};
  $('menu-sound').onclick=()=>{toggleSound();$('menu-sound').textContent=muted?'关闭':'开启'};
  $('menu-help').onclick=showHelp;
  $('local-data').onclick=showLocalData;
  $('mode-switch').onclick=()=>{closeModal();beginSession(mode==='tutorial'?'practice':'tutorial')};
  $('restart-btn').onclick=()=>{if(game.isHandRunning&&!leaveConfirm){leaveConfirm=true;$('restart-btn').textContent='放弃当前牌局并重开';return;}closeModal();freshTable();start()};
}
function showHistory(){
  const rows=stats.history.map(h=>`<div class="history-row"><span># ${h.hand}</span><div>${safe(h.winners)}<small>${safe(h.category)} · 底池 ${money(h.pot)}</small></div><b>${h.net>0?'+':''}${money(h.net)}</b></div>`).join('');
  const logs=state.events.filter(e=>['action','blind-posted','street-started'].includes(e.type)).map(e=>e.type==='street-started'?`— ${phases[e.phase]} —`:`${state.players.find(p=>p.id===e.playerId)?.name??''} ${words[e.action??e.blind]??e.blind??''} ${e.amount?money(e.amount):''}`).map(s=>`<div>${safe(s)}</div>`).join('');
  openModal('牌局记录',`${rows||'<p>完成第一手牌后，这里会记录你的战绩。</p>'}${logs?`<p>当前牌局</p><div class="history-log">${logs}</div>`:''}`);
}
function showShowdown(){
  const r=state.result;if(!r)return;
  const rows=state.players.filter(p=>p.inHand).map(p=>`<div class="history-row"><span>${p.name}</span><div>${p.cards.filter(Boolean).map(c=>parseCard(c).symbol+(parseCard(c).rank==='T'?'10':parseCard(c).rank)).join(' ')||'未亮牌'}<small>${p.folded?'已弃牌':r.hands[p.id]?.category??'未摊牌'}</small></div><b>${p.net>0?'+':''}${money(p.net)}</b></div>`).join('');
  const pots=r.pots.map((p,i)=>`<p>${i?'边池 '+i:'主池'} · ${money(p.amount)} → ${p.winnerIds.map(id=>`${state.players.find(player=>player.id===id)?.name} ${money(p.shares[id])}`).join(' / ')}</p>`).join('');
  const refunds=Object.entries(r.refunds).filter(([,amount])=>amount>0).map(([id,amount])=>`<p>未匹配下注退回 · ${state.players.find(p=>p.id===id)?.name} ${money(amount)}</p>`).join('');
  openModal('摊牌详情',rows+pots+refunds);
}
function updateSoundButton(){
  $('sound-btn').innerHTML=muted?'<svg viewBox="0 0 24 24"><path d="m11 4-6 5H2v6h3l6 5Z M16 9l6 6 M22 9l-6 6"/></svg>':'<svg viewBox="0 0 24 24"><path d="m11 4-6 5H2v6h3l6 5Z M16 8c3 2 3 6 0 8 M19 4c6 4 6 12 0 16"/></svg>';
  $('sound-btn').setAttribute('aria-label',muted?'开启声音':'关闭声音');
}
function toggleSound(){muted=!muted;stats.sound=!muted;save();updateSoundButton();effect();toast(muted?'声音已关闭':'声音已开启')}
function toggleSpeed(){fast=!fast;$('speed-btn').textContent=fast?'2×':'1×';toast(fast?'已加快对手行动':'已恢复标准节奏')}

$('start-btn').onclick=()=>beginSession('tutorial');$('practice-btn').onclick=()=>beginSession('practice');
$('coach-toggle').onclick=()=>{coachCollapsed=!coachCollapsed;$('coach').classList.toggle('is-collapsed',coachCollapsed);$('coach-toggle').textContent=coachCollapsed?'+':'−';$('coach-toggle').setAttribute('aria-expanded',String(!coachCollapsed));$('coach-toggle').setAttribute('aria-label',coachCollapsed?'展开教学提示':'收起教学提示')};
$('call-btn').onclick=call;$('fold-btn').onclick=()=>act('fold');$('raise-btn').onclick=openRaise;
$('raise-close').onclick=$('raise-cancel').onclick=()=>{show('raise-panel',false);show('action-panel')};
$('raise-range').oninput=e=>setRaise(Number(e.target.value));
document.querySelectorAll('[data-size]').forEach(b=>b.onclick=()=>{const l=game.getLegalActions('hero');setRaise(b.dataset.size==='all'?raiseMax:b.dataset.size==='pot'?l.currentBet+state.pot+l.callAmount:b.dataset.size==='half'?l.currentBet+Math.round((state.pot+l.callAmount)/2):raiseMin)});
$('raise-confirm').onclick=()=>act(useAllIn?'all-in':raiseType,useAllIn?undefined:Number($('raise-range').value));
$('sound-btn').onclick=toggleSound;$('speed-btn').onclick=toggleSpeed;
$('help-btn').onclick=showHelp;$('menu-btn').onclick=showMenu;$('history-btn').onclick=showHistory;
$('scene-btn').onclick=showScenes;
$('camera-btn').onclick=()=>{camera=(camera+1)%3;scene?.setCamera(['table','overhead','cinematic'][camera]);toast(['牌桌视角','俯视视角','环桌视角'][camera])};
$('reset-view-btn').onclick=()=>{camera=0;scene?.setCamera('table');toast('已回到默认牌桌视角')};
$('modal-close').onclick=closeModal;
$('modal').addEventListener('cancel',e=>{e.preventDefault();closeModal()});
$('modal').addEventListener('click',e=>{if(e.target===$('modal')){const r=$('modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal()}});
document.addEventListener('keydown',e=>{if($('modal').open||e.repeat||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;if(e.key.toLowerCase()==='c')call();if(e.key.toLowerCase()==='f')act('fold');if(e.key.toLowerCase()==='r')openRaise();if(e.key==='Escape'&&!$('raise-panel').hidden){show('raise-panel',false);show('action-panel')}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(aiTimer)}else if(!paused){if(game.phase==='complete')renderResult();scheduleAI()}});

try {
  scene=createScene($('scene'),{theme:stats.theme,onReady:()=>{if(state)scene?.update(state)}});
  updateSceneLabels();
} catch(e){
  console.warn('3D unavailable; using accessible card controls.');toast('已切换到简洁牌桌，仍可完成教学');
  telemetry.track('error',{mode,reason:'renderer_unavailable'});
  $('game').classList.add('simple-table');
  $('scene').innerHTML='<div class="simple-table-message">简洁牌桌 · 继续使用下方卡牌和操作按钮</div>';
  updateSceneLabels();
}
freshTable();projectLabels();
telemetry.track('impression',{mode:'demo',source:'intro'});
window.__trainingTelemetry={getEvents:()=>telemetry.getEvents(),summary:()=>telemetry.summary()};
window.__poker={getState:()=>game.getState({viewerId:'hero'}),getLegalActions:()=>game.getLegalActions('hero'),getCameraState:()=>scene?.getViewState()};
