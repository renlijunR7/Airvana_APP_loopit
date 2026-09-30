import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';

const root=path.resolve(import.meta.dirname,'..');
const source=fs.readFileSync(path.join(root,'public/complete-games-v3.js'),'utf8');
const sensorSource=fs.readFileSync(path.join(root,'public/sensor-interactions-v1.js'),'utf8');

function contextStub(){
  const gradient={addColorStop(){}};
  return new Proxy({}, {get(target,key){
    if (key==='createLinearGradient') return ()=>gradient;
    if (key==='measureText') return value=>({width:String(value).length*7});
    if (!(key in target)) target[key]=()=>{};
    return target[key];
  },set(target,key,value){target[key]=value;return true;}});
}

function canvasStub(){
  const context=contextStub();
  return {
    style:{},width:0,height:0,tabIndex:0,
    getContext:()=>context,
    getBoundingClientRect:()=>({left:0,top:0,width:360,height:560}),
    addEventListener(){},removeEventListener(){},setPointerCapture(){},releasePointerCapture(){},focus(){}
  };
}

function loadRuntime(sensorOverride){
  let frameId=0;
  const window={devicePixelRatio:1,requestAnimationFrame:()=>++frameId,cancelAnimationFrame(){},addEventListener(){},removeEventListener(){}};
  vm.runInNewContext(sensorSource,{window,globalThis:window,Math,Object,Array,String,Number,Boolean,Date,JSON,Map,Set,WeakMap,Error,Promise,Float32Array,Uint8Array,console,setTimeout,clearTimeout});
  if(sensorOverride) window.AirvanaSensorInteractions=sensorOverride;
  vm.runInNewContext(source,{window,globalThis:window,Math,Object,Array,String,Number,Boolean,Date,JSON,Map,Set,WeakMap,Error,console,setTimeout,clearTimeout});
  return window.AirvanaCompleteGames;
}

test('complete v3 runtime publishes 32 complete game engines with unique IDs',()=>{
  const runtime=loadRuntime();
  const catalog=runtime.list();
  assert.equal(runtime.version,'4.2.0');
  assert.equal(catalog.length,32);
  assert.equal(new Set(catalog.map(item=>item.id)).size,32);
  const pilots=catalog.filter(item=>item.characterId);
  assert.deepEqual(pilots.map(item=>item.id),[5,10,12,20,36]);
  assert.ok(pilots.every(item=>item.characterId));
  assert.ok(catalog.every(item=>item.art==='classic-v1'&&item.artSystem==='classic-v1'));
  assert.ok(catalog.every(item=>item.assetPack==='classic-v1'&&item.stages===3));
  assert.ok(catalog.every(item=>item.gameplayAssetPack==='classic-v1'));
  assert.ok(catalog.every(item=>item.gameplayStates.join('>')==='intro>playing>paused>success>failure>retry'));
  assert.ok(catalog.every(item=>item.instruction&&item.playableId.startsWith('plb_')));
  assert.deepEqual(catalog.filter(item=>item.sensor).map(item=>item.key),[
    'pixel-quest','red-cup-shuffle','magic-choir','rift-strike','city-rush','neon-dash','star-cups','nova-drift','void-squadron'
  ]);
});

test('nine matched games bind lane, steering, aim, shake, and blow while preserving their core state machines',()=>{
  const callbacks={};
  const profiles={
    'pixel-quest':{kind:'orientation',control:'lane',label:'陀螺仪'},
    'red-cup-shuffle':{kind:'motion',control:'shuffle',label:'摇晃'},
    'magic-choir':{kind:'microphone',control:'sequence',label:'吹气'},
    'neon-dash':{kind:'orientation',control:'lane',label:'陀螺仪'},
    'city-rush':{kind:'orientation',control:'steer',label:'陀螺仪'},
    'nova-drift':{kind:'orientation',control:'steer',label:'陀螺仪'},
    'rift-strike':{kind:'orientation',control:'aim',label:'陀螺仪'},
    'void-squadron':{kind:'orientation',control:'aim',label:'陀螺仪'},
    'star-cups':{kind:'motion',control:'shuffle',label:'摇晃'}
  };
  const sensorRuntime={
    profile:key=>profiles[key]||null,
    mount(key,options){callbacks[key]=options;return{requiresGesture:()=>true,enable:async()=>({status:'active'}),destroy(){}};}
  };
  const runtime=loadRuntime(sensorRuntime);
  const tiltGame=runtime.mount(canvasStub(),'pixel-quest',{muted:true,reducedMotion:true,onEvent(){},onStatus(){}});
  callbacks['pixel-quest'].onTilt({direction:-1,value:-18});
  assert.equal(tiltGame.world.targetLane,0);

  const neonGame=runtime.mount(canvasStub(),'neon-dash',{muted:true,reducedMotion:true,onEvent(){},onStatus(){}});
  callbacks['neon-dash'].onTilt({direction:1,value:18});
  assert.equal(neonGame.world.targetLane,2);

  const cityGame=runtime.mount(canvasStub(),'city-rush',{muted:true,reducedMotion:true,onEvent(){},onStatus(){}});
  callbacks['city-rush'].onTilt({direction:-1,value:-16});
  assert.equal(cityGame.world.steer,-1);

  const driftGame=runtime.mount(canvasStub(),'nova-drift',{muted:true,reducedMotion:true,onEvent(){},onStatus(){}});
  callbacks['nova-drift'].onTilt({direction:1,value:16});
  assert.equal(driftGame.world.steer,1);

  const riftGame=runtime.mount(canvasStub(),'rift-strike',{muted:true,reducedMotion:true,onEvent(){},onStatus(){}});
  callbacks['rift-strike'].onTilt({direction:1,x:.5,y:-.4});
  assert.equal(riftGame.world.ship.x,250);
  assert.equal(riftGame.world.ship.y,367);

  const voidGame=runtime.mount(canvasStub(),'void-squadron',{muted:true,reducedMotion:true,onEvent(){},onStatus(){}});
  callbacks['void-squadron'].onTilt({direction:-1,x:-.5,y:.4});
  assert.equal(voidGame.world.ship.x,110);
  assert.equal(voidGame.world.ship.y,443);

  const shakeGame=runtime.mount(canvasStub(),'red-cup-shuffle',{muted:true,reducedMotion:true,onEvent(){},onStatus(){}});
  shakeGame.world.reveal=0;
  callbacks['red-cup-shuffle'].onShake({strength:18});
  assert.equal(shakeGame.world.waitingForShuffle,false);

  const starCupGame=runtime.mount(canvasStub(),'star-cups',{muted:true,reducedMotion:true,onEvent(){},onStatus(){}});
  starCupGame.world.reveal=0;
  callbacks['star-cups'].onShake({strength:18});
  assert.equal(starCupGame.world.waitingForShuffle,false);

  const blowGame=runtime.mount(canvasStub(),'magic-choir',{muted:true,reducedMotion:true,onEvent(){},onStatus(){}});
  callbacks['magic-choir'].onBlow({level:20});
  assert.equal(blowGame.world.grid.filter(Boolean).length,1);
  tiltGame.destroy();neonGame.destroy();cityGame.destroy();driftGame.destroy();riftGame.destroy();voidGame.destroy();shakeGame.destroy();starCupGame.destroy();blowGame.destroy();
});

test('every complete v3 game mounts, draws, pauses, resumes, mutes, and destroys',()=>{
  const runtime=loadRuntime();
  for(const item of runtime.list()){
    const statuses=[];
    const instance=runtime.mount(canvasStub(),item.key,{muted:true,reducedMotion:true,onStatus:value=>statuses.push(value),onEvent(){},onComplete(){}});
    assert.equal(typeof instance.destroy,'function',item.key);
    assert.doesNotThrow(()=>instance.draw(),item.key);
    const inspection=instance.inspect();
    assert.equal(inspection.gameKey,item.key);
    assert.equal(inspection.stages,3);
    assert.equal(Array.from(inspection.gameplayStates).join('>'),'intro>playing>paused>success>failure>retry');
    assert.equal(instance.togglePause(),true,item.key);
    assert.equal(instance.togglePause(),false,item.key);
    instance.setMuted(false);
    instance.setMuted(true);
    assert.ok(statuses.length>=2,item.key);
    assert.doesNotThrow(()=>instance.destroy(),item.key);
  }
});

test('expanded orchard board maps every fruit and a merge to the rendered touch cells',()=>{
  const runtime=loadRuntime();
  const events=[];
  const instance=runtime.mount(canvasStub(),'orchard-merge',{muted:true,reducedMotion:true,onEvent:(name,data)=>events.push({name,data})});
  const board=instance.mergeBoardRect();
  const pointAt=index=>({x:board.x+(index%5+.5)*board.w/5,y:board.y+(Math.floor(index/5)+.5)*board.h/5});
  for(let index=0;index<25;index+=1){
    instance.world.selected=-1;
    instance.selectMerge(pointAt(index));
    assert.equal(instance.world.selected,index);
  }
  instance.world.selected=-1;
  instance.selectMerge({x:board.x+5,y:board.y-10});
  assert.equal(instance.world.selected,-1,'status row must not select fruit');
  instance.selectMerge(pointAt(0));
  instance.selectMerge(pointAt(5));
  assert.equal(instance.world.moves,17);
  assert.equal(instance.world.grid[5],2);
  assert.equal(instance.world.selected,-1);
  assert.equal(events.filter(event=>event.name==='valid_interaction'&&event.data.interaction_type==='fruit_merge').length,1);
  assert.doesNotThrow(()=>instance.draw());
  instance.destroy();
});

test('rune circuit has enough turns to solve all three deterministic stages',()=>{
  const runtime=loadRuntime();
  const completions=[];
  const instance=runtime.mount(canvasStub(),'rune-circuit',{muted:true,reducedMotion:true,onEvent(){},onStatus(){},onComplete:value=>completions.push(value)});
  for(let expectedStage=1;expectedStage<=3;expectedStage+=1){
    assert.equal(instance.stage,expectedStage);
    const world=instance.world;
    for(let index=0;index<world.rotations.length;index+=1){
      const row=Math.floor(index/world.size),column=index%world.size;
      const point={x:38+(column+.5)*(284/world.size),y:118+(row+.5)*(284/world.size)};
      while(!instance.finished&&world.rotations[index]!==world.target[index]) instance.rotateCircuit(point);
    }
  }
  assert.equal(instance.finished,true);
  assert.equal(completions.length,1);
  assert.equal(completions[0].success,true);
  instance.destroy();
});

test('destroy clears delayed cup and quiz callbacks',()=>{
  const runtime=loadRuntime();
  const instance=runtime.mount(canvasStub(),'red-cup-shuffle',{muted:true,reducedMotion:true,onEvent(){},onStatus(){},onComplete(){}});
  instance.world.ready=true;
  const visibleIndex=instance.world.order.indexOf(instance.world.ball);
  instance.pickCup({x:24+visibleIndex*104+52,y:400});
  assert.equal(instance.timers.size,1);
  instance.destroy();
  assert.equal(instance.timers.size,0);
});

test('casual pack contains 38 independent source worlds with real WebP scenes and covers',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'public/assets/games/casual-v1/manifest.json'),'utf8'));
  assert.equal(manifest.art_pack,'casual-v1');
  assert.equal(manifest.build_scope,'complete-assets');
  assert.equal(manifest.assets.length,38);
  assert.equal(manifest.environment_count,38);
  const sourceHashes=new Set();
  for(const item of manifest.assets){
    assert.equal(item.shared_environment,false,item.game_key);
    const source=fs.readFileSync(path.join(root,item.source.path));
    const hash=createHash('sha256').update(source).digest('hex');
    assert.equal(hash,item.source.sha256,item.game_key);
    sourceHashes.add(hash);
    for(const role of ['runtime_asset','cover_asset']){
      assert.ok(item[role],item.game_key+' '+role);
      const bytes=fs.readFileSync(path.join(root,item[role].path));
      assert.equal(bytes.toString('ascii',0,4),'RIFF',item.game_key+' '+role);
      assert.equal(bytes.toString('ascii',8,12),'WEBP',item.game_key+' '+role);
      assert.equal(createHash('sha256').update(bytes).digest('hex'),item[role].sha256);
    }
    assert.ok(fs.existsSync(path.join(root,item.flutter_cover_png)),item.game_key);
  }
  assert.equal(sourceHashes.size,38,'Every game needs its own independent source environment');
});

function playableScenario(key){
  const timers=new Map(),results=[],events=[],sprites=[];
  let serial=0;
  const window={devicePixelRatio:1,requestAnimationFrame:()=>1,cancelAnimationFrame(){},addEventListener(){},removeEventListener(){},
    AirvanaPlayableAssetsV3:{ready:()=>true,load:()=>Promise.resolve(),draw(_context,asset,rect,options){sprites.push({asset,...rect,...options});return true;}}};
  vm.runInNewContext(source,{window,globalThis:window,Math,Object,Array,String,Number,Boolean,Date,JSON,Map,Set,WeakMap,Error,Promise,console,
    setTimeout(callback){const id=++serial;timers.set(id,callback);return id;},clearTimeout(id){timers.delete(id);}});
  const game=window.AirvanaCompleteGames.mount(canvasStub(),key,{muted:true,reducedMotion:true,onComplete:r=>results.push(r),onEvent:(name,data)=>events.push({name,data})});
  const flush=()=>{const pending=[...timers.values()];timers.clear();pending.forEach(callback=>callback());};
  const tick=(dt=.04)=>{game.elapsed+=dt;game.stageElapsed+=dt;game.update(dt);};
  return {game,results,events,sprites,flush,tick,window};
}

const cellPoint=(index,size,rect)=>({x:rect.x+(index%size+.5)*rect.w/size,y:rect.y+(Math.floor(index/size)+.5)*rect.h/size});
const circuitRect={x:38,y:118,w:284,h:284},matchRect={x:27,y:111,w:306,h:306};

function mazeRoute(world){
  const queue=[{player:world.player,guards:world.guards.map(g=>({...g})),path:[]}],seen=new Set();
  while(queue.length){
    const state=queue.shift();
    if(state.player===world.exit)return state.path;
    if(state.path.length>=world.steps)continue;
    for(const cell of [state.player-1,state.player+1,state.player-7,state.player+7]){
      if(cell<0||cell>=49||world.walls.has(cell)||(Math.abs(cell-state.player)===1&&Math.floor(cell/7)!==Math.floor(state.player/7)))continue;
      const guards=state.guards.map(g=>{const next=g.index+g.dir;return next<0||next>=49||world.walls.has(next)||Math.floor(next/7)!==Math.floor(g.index/7)?{index:g.index,dir:-g.dir}:{index:next,dir:g.dir};});
      if(guards.some(g=>g.index===cell))continue;
      const id=[cell,...guards.flatMap(g=>[g.index,g.dir])].join(',');if(seen.has(id))continue;seen.add(id);
      queue.push({player:cell,guards,path:[...state.path,cell]});
    }
  }
  throw Error('Maze has no reachable exit within its step budget');
}

function buildingPlan(world,stage){
  const visit=(water,food,homes,plan)=>{
    if(water+food+homes*2>=world.goal&&homes>=stage)return plan;
    if(plan.length>=9)return null;
    for(const type of [3,1,2]){
      if(type===1&&water>0){const found=visit(water-1,food+3,homes,[...plan,type]);if(found)return found;}
      if(type===2&&food>0){const found=visit(water+2,food-1,homes,[...plan,type]);if(found)return found;}
      if(type===3&&food>=2&&water>0){const found=visit(water-1,food-2,homes+1,[...plan,type]);if(found)return found;}
    }
    return null;
  };
  const result=visit(world.water,world.food,world.homes,[]);assert.ok(result,'Builder must have a legal resource plan');return result;
}

function battlePlan(world,stage){
  const queue=[{...world,path:[]}],best=new Map();
  for(let cursor=0;cursor<queue.length;cursor++){
    const state=queue[cursor];if(state.path.length>28)continue;
    for(const action of [0,1,2]){
      const next={...state,path:[...state.path,action]};
      if(action===0){next.enemy-=7+stage*2+next.charge;next.charge=0;}
      if(action===1)next.guard+=14+stage*4;
      if(action===2)next.charge=Math.min(24,next.charge+8);
      if(next.enemy<=0)return next.path;
      const damage=[8+stage*2,5+stage,11+stage*2][next.intent],blocked=Math.min(next.guard,damage);
      next.guard-=blocked;next.hero-=damage-blocked;next.intent=(next.intent+next.turn+stage)%3;next.turn++;
      if(next.hero<=0||next.guard>45)continue;
      const key=[next.enemy,next.guard,next.charge,next.intent,next.turn%3].join(',');
      if((best.get(key)||0)>=next.hero)continue;best.set(key,next.hero);queue.push(next);
    }
  }
  throw Error('Battle has no survivable tactical route');
}

function matchSwap(world){
  let best=null,bestValue=-1;
  for(let first=0;first<36;first++)for(const second of [first+1,first+6]){
    if(second>=36||(second===first+1&&Math.floor(first/6)!==Math.floor(second/6)))continue;
    const grid=[...world.grid];[grid[first],grid[second]]=[grid[second],grid[first]];
    const marks=new Set();
    for(let i=0;i<36;i++){
      if(i%6<4&&grid[i]===grid[i+1]&&grid[i]===grid[i+2])[i,i+1,i+2].forEach(n=>marks.add(n));
      if(i<24&&grid[i]===grid[i+6]&&grid[i]===grid[i+12])[i,i+6,i+12].forEach(n=>marks.add(n));
    }
    const value=[...marks].filter(i=>grid[i]===world.targetColor).length*10+marks.size;
    if(value>bestValue){best=[first,second];bestValue=value;}
  }
  assert.ok(best&&bestValue>0,'Match board must offer a scoring swap');return best;
}

function winStage(scenario){
  const {game:g,tick,flush}=scenario,stage=g.stage,mechanic=g.config.mechanic,w=g.world;
  const press=point=>g.press(point);
  const until=condition=>{for(let n=0;n<12000&&!g.finished&&g.stage===stage&&!condition();n++)tick();};
  switch(mechanic){
    case 'quiz':for(let i=0;i<3;i++){press({x:180,y:276+w.questions[w.index].correct*66});flush();}break;
    case 'cups':until(()=>w.ready);press({x:76+w.order.indexOf(w.ball)*104,y:300});flush();break;
    case 'sequence':until(()=>w.ready);for(const pad of w.sequence)press({x:45+pad*90,y:360});break;
    case 'sequencer':w.target.forEach((on,i)=>{if(on)press(cellPoint(i,4,{x:38,y:140,w:284,h:284}));});press({x:180,y:510});break;
    case 'wardrobe':for(let category=0;category<3;category++){press({x:73+category*106,y:125});press({x:76+w.target[category]*104,y:395});}press({x:180,y:483});break;
    case 'shop':for(let i=0;i<40&&!g.finished&&g.stage===stage;i++)press({x:45+w.order[w.step]*90,y:430});break;
    case 'sort':for(const item of w.items){press({x:item.x,y:item.y});g.move({x:60+item.type*120,y:466});g.release({x:60+item.type*120,y:466});}break;
    case 'maze':for(const cell of mazeRoute(w))press(cellPoint(cell,7,{x:31,y:113,w:298,h:298}));break;
    case 'coin':for(let i=0;i<12&&!g.finished&&g.stage===stage;i++){const ring=w.rings.find(r=>!r.hit);if(!ring)break;press({x:ring.x,y:ring.y});until(()=>!w.coin.moving);}break;
    case 'builder':buildingPlan(w,stage).forEach((type,index)=>{press({x:60+(type-1)*120,y:480});press(cellPoint(index,3,{x:52,y:145,w:256,h:256}));});break;
    case 'battle':for(const action of battlePlan(w,stage))press({x:60+action*120,y:490});break;
    case 'circuit':for(let i=0;i<16;i++)while(g.stage===stage&&!g.finished&&w.rotations[i]!==w.target[i])press(cellPoint(i,4,circuitRect));break;
    case 'match':for(let i=0;i<20&&!g.finished&&g.stage===stage;i++)for(const cell of matchSwap(w))press(cellPoint(cell,6,matchRect));break;
    case 'merge':{const chain=[0,5,6,11,12,17];for(let i=0;i<chain.length-1&&!g.finished&&g.stage===stage;i++){press(cellPoint(chain[i],5,g.mergeBoardRect()));press(cellPoint(chain[i+1],5,g.mergeBoardRect()));}break;}
    case 'runner':for(let i=0;i<9000&&!g.finished&&g.stage===stage;i++){const candidates=[0,1,2].map(lane=>({lane,risk:w.obstacles.filter(o=>o.kind!=='chip'&&o.y>355&&o.y<510&&o.lane===lane).length})).sort((a,b)=>a.risk-b.risk||Math.abs(a.lane-w.lane)-Math.abs(b.lane-w.lane));press({x:60+candidates[0].lane*120,y:350});tick();}break;
    case 'rhythm':for(let i=0;i<9000&&!g.finished&&g.stage===stage;i++){for(const note of w.notes.filter(n=>!n.hit&&n.y>=438))press({x:45+note.pad*90,y:465});tick();}break;
    case 'stack':for(let i=0;i<9000&&!g.finished&&g.stage===stage;i++){const top=w.blocks.at(-1);if(Math.abs(w.moving.x-top.x)<2)press({x:180,y:400});tick(.01);}break;
    case 'fishing':for(let i=0;i<10&&!g.finished&&g.stage===stage;i++){until(()=>w.hook<=0);press({x:w.fish.x,y:350});until(()=>112+w.hook>=w.fish.y-5);g.move({x:w.fish.x,y:350});g.release({x:w.fish.x,y:350});}break;
    case 'defense':for(let i=0;i<9000&&!g.finished&&g.stage===stage;i++){for(let lane=0;lane<3;lane++)if(!w.towers[lane]&&w.energy>=2)press({x:72+lane*108,y:220});tick();}break;
    case 'drift':for(let i=0;i<9000&&!g.finished&&g.stage===stage;i++){const center=180+Math.sin((w.distance+stage*17)*.055)*(45+stage*8);let aim=center;const risk=w.barriers.find(b=>b.y>360&&b.y<505&&Math.abs(b.x-w.carX)<45);if(risk)aim=risk.x<center?Math.min(center+45,300):Math.max(center-45,60);if(Math.abs(w.carX-aim)>3)press({x:w.carX>aim?20:340,y:350});else g.release({x:180,y:350});tick(.02);}break;
    case 'shooter':for(let i=0;i<12000&&!g.finished&&g.stage===stage;i++){const enemy=w.enemies.slice().sort((a,b)=>b.y-a.y)[0];if(enemy)press({x:enemy.x,y:470});tick();}break;
    case 'io':for(let i=0;i<9000&&!g.finished&&g.stage===stage;i++){const food=w.food.filter(f=>w.bots.every(b=>Math.hypot(f.x-b.x,f.y-b.y)>b.r+w.player.r+35)).sort((a,b)=>Math.hypot(a.x-w.player.x,a.y-w.player.y)-Math.hypot(b.x-w.player.x,b.y-w.player.y))[0];if(food)press(food);tick(.02);}break;
    default:throw Error(`No real-input solver for ${mechanic}`);
  }
  assert.ok(g.finished||g.stage>stage,`${g.gameKey}: stage ${stage} stalled with ${JSON.stringify(g.world)}`);
  if(g.finished)assert.equal(scenario.results.at(-1).success,true,`${g.gameKey} failed stage ${stage}: ${scenario.results.at(-1).summary}`);
}

function loseRun(scenario){
  const {game:g,tick,flush}=scenario,mechanic=g.config.mechanic,w=g.world;
  for(let n=0;n<18000&&!g.finished;n++){
    switch(mechanic){
      case 'quiz':g.press({x:180,y:276+((w.questions[w.index].correct+1)%3)*66});flush();break;
      case 'cups':if(w.ready){g.press({x:76+((w.order.indexOf(w.ball)+1)%3)*104,y:300});flush();}break;
      case 'sequence':if(w.ready)g.press({x:45+((w.sequence[0]+1)%4)*90,y:360});break;
      case 'sequencer':g.press({x:180,y:510});break;
      case 'wardrobe':g.press({x:180,y:483});break;
      case 'sort':{const item=w.items.find(item=>!item.sorted);g.press(item);g.release({x:60+((item.type+1)%3)*120,y:466});break;}
      case 'maze':{const cells=[w.player-7,w.player+7,w.player-1,w.player+1].filter(i=>i>=0&&i<49&&!w.walls.has(i));g.press(cellPoint(cells[0],7,{x:31,y:113,w:298,h:298}));break;}
      case 'coin':if(!w.coin.moving)g.press({x:180,y:540});break;
      case 'builder':{const index=w.plots.indexOf(0);g.press({x:w.water>0?60:180,y:480});g.press(cellPoint(index,3,{x:52,y:145,w:256,h:256}));break;}
      case 'battle':g.press({x:300,y:490});break;
      case 'circuit':g.press(cellPoint(0,4,circuitRect));break;
      case 'match':g.press(cellPoint(0,6,matchRect));g.press(cellPoint(1,6,matchRect));break;
      case 'merge':{let pair=null;for(let i=0;i<25&&!pair;i++)for(const j of [i+1,i+5])if(j<25&&(j!==i+1||Math.floor(i/5)===Math.floor(j/5))&&w.grid[i]===w.grid[j]&&w.grid[i]<w.goal-1){pair=[i,j];break;}assert.ok(pair,'low-level merge failure path must remain legal');for(const i of pair)g.press(cellPoint(i,5,g.mergeBoardRect()));break;}
      case 'rhythm':g.press({x:45,y:465});break;
      case 'stack':g.press({x:180,y:400});break;
      case 'fishing':g.press({x:35,y:100});g.release({x:35,y:100});break;
      case 'drift':g.press({x:10,y:400});break;
      case 'shooter':g.press({x:10,y:480});break;
      case 'shop':g.press({x:45+((w.order[w.step]+1)%4)*90,y:430});break;
      case 'io':g.press({x:w.bots[0].x,y:w.bots[0].y});break;
      case 'runner':g.press({x:180,y:350});break;
      case 'defense':break;
      default:throw Error(`No failure input for ${mechanic}`);
    }
    tick();
  }
  assert.equal(g.finished,true,`${g.gameKey} failure route must terminate`);
  assert.equal(scenario.results.at(-1).success,false,`${g.gameKey} should fail using poor player input`);
}

for(const entry of loadRuntime().list()){
  test(`${entry.key}: real inputs complete all three stages, poor play fails, and restart is fresh`,()=>{
    const success=playableScenario(entry.key);
    for(let stage=1;stage<=3;stage++){assert.equal(success.game.stage,stage);winStage(success);}
    assert.equal(success.results.length,1);assert.equal(success.results[0].success,true);
    assert.equal(success.events.filter(e=>e.name==='level_complete').length,3);
    success.game.destroy();
    const failure=playableScenario(entry.key);loseRun(failure);failure.game.destroy();
    const fresh=playableScenario(entry.key);assert.equal(fresh.game.stage,1);assert.equal(fresh.game.score,0);assert.equal(fresh.game.finished,false);
    fresh.game.draw();assert.ok(fresh.sprites.length>0,'actual gameplay must render individual game objects');
    assert.ok(fresh.sprites.every(s=>Number.isFinite(s.x)&&Number.isFinite(s.y)&&s.w>0&&s.h>0));fresh.game.destroy();
  });
}

test('pause freezes player actions, simulation, and delayed answer feedback',()=>{
  for(const entry of loadRuntime().list()){
    const {game}=playableScenario(entry.key);game.togglePause();const before=JSON.stringify(game.world);
    game.press({x:180,y:440});game.move({x:250,y:400});game.release({x:250,y:400});game.key('action');game.update(1);
    assert.equal(JSON.stringify(game.world),before,entry.key);game.destroy();
  }
  const quiz=playableScenario('safety-workshop');quiz.game.press({x:180,y:342});quiz.game.togglePause();quiz.flush();
  assert.equal(quiz.game.world.index,0);quiz.game.togglePause();quiz.flush();assert.equal(quiz.game.world.index,1);quiz.game.destroy();
});

test('raster player, fish, hook, and enemies follow their simulation coordinates',()=>{
  const checks=[
    ['neon-dash','runner',g=>({x:71+g.world.lane*109,y:468})],
    ['city-rush','car',g=>({x:g.world.carX,y:471})],
    ['rift-strike','spacecraft',g=>({...g.world.ship})],
    ['deep-catch','fish',g=>({...g.world.fish})],
    ['microbe-arena','microbe',g=>({...g.world.player})]
  ];
  for(const [key,asset,point] of checks){
    const s=playableScenario(key);s.game.press({x:260,y:350});for(let i=0;i<10;i++)s.tick();s.game.draw();
    const sprite=s.sprites.findLast(item=>item.asset===asset),expected=point(s.game);
    assert.ok(sprite,key);assert.ok(Math.abs(sprite.x+sprite.w/2-expected.x)<.01,key+' x');assert.ok(Math.abs(sprite.y+sprite.h/2-expected.y)<.01,key+' y');
    if(key==='deep-catch'){const hook=s.sprites.findLast(item=>item.asset==='hook');assert.equal(hook.x+hook.w/2,s.game.world.hookX);}
    s.game.destroy();
  }
  for(const [keys,method] of [
    [['pixel-quest','neon-dash'],'drawRunner'],
    [['city-rush','nova-drift'],'drawDrift'],
    [['jungle-dive','deep-catch'],'drawFishing'],
    [['sky-cannon','ember-bastion','crystal-bastion'],'drawDefense'],
    [['rift-strike','void-squadron'],'drawShooter'],
    [['microbe-arena'],'drawIo'],
    [['sky-stack'],'drawStack'],
    [['formation-knights'],'drawBattle'],
    [['coin-journey'],'drawCoin'],
    [['firefly-mail'],'drawSort'],
    [['pulse-forge'],'drawRhythm'],
    [['paws-stage'],'drawSequence'],
    [['red-cup-shuffle','star-cups'],'drawCups'],
    [['galaxy-toy-shop','moonlight-tea-shop'],'drawShop'],
    [['puppet-studio','studio-wardrobe'],'drawWardrobe']
  ])for(const key of keys){
    const s=playableScenario(key),largeRectangles=[],context=s.game.context;let points=[];
    const point=(x,y)=>points.push([x,y]);
    const record=(x,y,w,h)=>{if(w>=150&&h>=120&&!String(context.fillStyle).startsWith('rgba('))largeRectangles.push({x,y,w,h});};
    context.beginPath=()=>{points=[];};context.moveTo=point;context.lineTo=point;
    context.arcTo=(x,y,x2,y2)=>{point(x,y);point(x2,y2);};
    context.bezierCurveTo=(x,y,x2,y2,x3,y3)=>{point(x,y);point(x2,y2);point(x3,y3);};
    context.fill=()=>{if(points.length){const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);record(Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));}};
    context.fillRect=record;
    s.game[method]();
    assert.deepEqual(largeRectangles,[],key+' must expose its actual environment, not an opaque rectangular playfield');
    assert.doesNotMatch(String(s.game[method]),/#1C2730|#17202A|#3398B6|#2C87AA|#257293/);
    if(method==='drawDefense'){
      const previewAlpha=key==='crystal-bastion'?.58:.30;
      const previews=s.sprites.filter(item=>['cannon','turret'].includes(item.asset)&&item.alpha===previewAlpha);
      assert.equal(previews.length,6,key+' exposes all six deployment pads with real tower previews');
      assert.deepEqual(previews.map(item=>({x:item.x+item.w/2,y:item.y})),[72,180,288].flatMap(x=>[{x,y:191}]).concat([72,180,288].map(x=>({x,y:346}))));
    }
    s.game.destroy();
  }
});

test('cup preview exposes the target and swaps animate the actual cup coordinates',()=>{
  const s=playableScenario('star-cups');s.game.draw();assert.ok(s.sprites.some(item=>item.asset==='star'),'target is visible before shuffle');
  s.tick(1.2);s.tick();s.tick();s.sprites.length=0;s.game.draw();
  const cups=s.sprites.filter(item=>item.asset==='cup');
  assert.ok(cups.some(item=>![33,137,241].includes(item.x)),'a swapping cup must occupy an intermediate position');
  assert.equal(s.sprites.some(item=>item.asset==='star'),false,'target stays hidden during shuffle');s.game.destroy();
});

test('runner jump input changes the visible actor height and has a cooldown',()=>{
  const s=playableScenario('neon-dash');s.game.key('action');s.tick(.25);s.game.draw();
  assert.ok(s.sprites.find(item=>item.asset==='runner').y<424);
  const remaining=s.game.world.jump;s.game.key('action');assert.equal(s.game.world.jump,remaining);s.game.destroy();
});
