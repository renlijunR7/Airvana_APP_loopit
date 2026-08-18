import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(import.meta.dirname,'..');
const source=fs.readFileSync(path.join(root,'public/sensor-interactions-v1.js'),'utf8');
const appSource=fs.readFileSync(path.join(root,'src/app.mjs'),'utf8');

function loadRuntime(overrides={}){
  const listeners=new Map();
  const frames=[];
  const window={
    DeviceMotionEvent:function(){},DeviceOrientationEvent:function(){},
    addEventListener(name,handler){listeners.set(name,handler);},
    removeEventListener(name){listeners.delete(name);},
    requestAnimationFrame(callback){frames.push(callback);return frames.length;},
    cancelAnimationFrame(){},
    ...overrides
  };
  vm.runInNewContext(source,{window,globalThis:window,Math,Object,Array,String,Number,Boolean,Date,JSON,Map,Set,WeakMap,Error,Promise,Float32Array,Uint8Array,console,setTimeout,clearTimeout});
  return {runtime:window.AirvanaSensorInteractions,listeners,frames};
}

test('sensor runtime publishes all nine governed game mappings and controls',()=>{
  const {runtime}=loadRuntime();
  assert.equal(runtime.version,'1.1.0');
  assert.deepEqual(runtime.list().map(item=>item.gameKey),[
    'pixel-quest','red-cup-shuffle','magic-choir','neon-dash','city-rush','nova-drift','rift-strike','void-squadron','star-cups'
  ]);
  assert.deepEqual(runtime.list().map(item=>item.control),['lane','shuffle','sequence','lane','steer','steer','aim','aim','shuffle']);
});

test('browser shell allows point-of-use microphone requests only from itself',()=>{
  assert.match(appSource,/Permissions-Policy', 'camera=\(\), microphone=\(self\), geolocation=\(\)'/);
});

test('motion and orientation sessions translate device events into discrete and continuous actions',async()=>{
  const shakes=[];const tilts=[];
  const {runtime,listeners}=loadRuntime();
  const shake=runtime.mount('red-cup-shuffle',{onShake:value=>shakes.push(value)});
  await shake.enable();
  listeners.get('devicemotion')({acceleration:{x:15,y:2,z:1}});
  assert.equal(shakes.length,1);
  assert.ok(shakes[0].strength>=12);

  const tilt=runtime.mount('pixel-quest',{onTilt:value=>tilts.push(value)});
  await tilt.enable();
  listeners.get('deviceorientation')({gamma:18});
  assert.equal(tilts.at(-1).direction,1);
  assert.equal(tilts.at(-1).value,18);

  const aimValues=[];
  const aim=runtime.mount('rift-strike',{onTilt:value=>aimValues.push(value)});
  await aim.enable();
  listeners.get('deviceorientation')({gamma:14,beta:42});
  assert.equal(aimValues.at(-1).x,.5);
  assert.equal(aimValues.at(-1).y,0);
  assert.equal(aimValues.at(-1).direction,1);
  shake.destroy();tilt.destroy();aim.destroy();
});

test('microphone session detects a blow locally and releases the audio track on destroy',async()=>{
  let stopped=false;
  const stream={getTracks:()=>[{stop(){stopped=true;}}]};
  class FakeAudioContext{
    constructor(){this.state='running';}
    createMediaStreamSource(){return{connect(){}};}
    createAnalyser(){return{fftSize:512,smoothingTimeConstant:0,getFloatTimeDomainData(values){values.fill(.22);}};}
    close(){}
  }
  const blows=[];
  const {runtime,frames}=loadRuntime({
    navigator:{mediaDevices:{getUserMedia:async()=>stream}},
    AudioContext:FakeAudioContext
  });
  const session=runtime.mount('magic-choir',{onBlow:value=>blows.push(value)});
  await session.enable();
  frames.shift()();
  frames.shift()();
  assert.equal(blows.length,1);
  session.destroy();
  assert.equal(stopped,true);
});
