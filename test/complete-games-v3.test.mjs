import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

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

test('complete v3 runtime publishes 32 code-native game engines with unique IDs',()=>{
  const runtime=loadRuntime();
  const catalog=runtime.list();
  assert.equal(runtime.version,'3.3.0');
  assert.equal(catalog.length,32);
  assert.equal(new Set(catalog.map(item=>item.id)).size,32);
  const pilots=catalog.filter(item=>item.art==='character-consistency-v1');
  assert.deepEqual(pilots.map(item=>item.id),[5,10,12,20,36]);
  assert.ok(pilots.every(item=>item.characterId));
  assert.equal(catalog.filter(item=>item.art==='code-native-v3').length,27);
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
    assert.equal(instance.togglePause(),true,item.key);
    assert.equal(instance.togglePause(),false,item.key);
    instance.setMuted(false);
    instance.setMuted(true);
    assert.ok(statuses.length>=2,item.key);
    assert.doesNotThrow(()=>instance.destroy(),item.key);
  }
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

test('v3 cover manifest contains one non-generative SVG for every governed game',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'public/assets/game-covers/code-art-v3/manifest.json'),'utf8'));
  assert.equal(manifest.files.length,38);
  assert.equal(manifest.generativeAI,false);
  assert.equal(manifest.thirdPartyAssets,false);
  for(const item of manifest.files){
    const file=path.join(root,'public/assets/game-covers/code-art-v3',item.file);
    assert.equal(fs.existsSync(file),true,item.file);
    const svg=fs.readFileSync(file,'utf8');
    assert.match(svg,/Airvana code-native vector game artwork/);
    assert.doesNotMatch(svg,/<image\b|data:image|href="https?:\/\//);
  }
});
