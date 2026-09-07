import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import Matter from 'matter-js';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const hostSource = read('public/physics-arcade-v1.js');
const indexSource = read('public/index.html');
const modeFiles = ['physics-sling-rope-v1.js', 'physics-water-v1.js', 'physics-fruit-v1.js','reference-action-v1.js','reference-worlds-v1.js','reference-puzzles-v1.js'];
class Target {
  constructor() { this.listeners = new Map(); }
  addEventListener(type, fn) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(fn); }
  removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); }
  dispatch(type, fields = {}) { const event = { type, preventDefault() {}, stopPropagation() {}, ...fields }; for (const fn of [...(this.listeners.get(type) || [])]) fn(event); }
  listenerCount() { return [...this.listeners.values()].reduce((n, set) => n + set.size, 0); }
}
class Node extends Target {
  constructor(tag, document) {
    super(); this.tagName = tag.toUpperCase(); this.ownerDocument = document; this.children = []; this.dataset = {}; this.attributes = {}; this.hidden = false;
    this.style = { setProperty(name, value) { this[name] = value; } }; const classes = new Set(); this.classList = { add: value => classes.add(value), remove: value => classes.delete(value), contains: value => classes.has(value) };
  }
  setAttribute(name, value) { this.attributes[name] = value; }
  append(...children) { for (const child of children) { child.remove(); child.parentNode = this; this.children.push(child); } }
  replaceChildren(...children) { for (const child of [...this.children]) child.remove(); this.append(...children); }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(c => c !== this); this.parentNode = null; }
  focus() { this.ownerDocument.activeElement = this; }
}
class FixtureModel {
  constructor({ level }) { this.level = level; this.status = 'playing'; this.score = 0; this.updates = 0; this.elapsed = 0; this.calls = []; this.instruction = '测试用宿主契约模型'; this.pending = null; this.destroyed = false; }
  pointerDown(p) { this.calls.push(['down', p]); }
  pointerMove(p) { this.calls.push(['move', p]); }
  pointerUp(p) { this.calls.push(['up', p]); }
  cancelPointer() { this.calls.push(['cancel']); }
  actions() { return [{ id: 'solve', label: '测试完成' }, { id: 'miss', label: '测试失败' }]; }
  perform(id) { this.calls.push(['action', id]); this.pending = id === 'solve' ? 'success' : 'failure'; }
  key(key) { this.calls.push(['key', key]); if (key === 'Enter' || key === ' ') this.perform('solve'); }
  update(dt) { this.updates++; this.elapsed += dt; if (this.pending) { this.status = this.pending; this.score = this.status === 'success' ? this.level * 10 : 0; } }
  draw() {}
  snapshot() { return { status: this.status, score: this.score, elapsed: this.elapsed, level: this.level }; }
  destroy() { this.destroyed = true; }
}
function setup({ actual = true, key = 'sky-raid', options = {} } = {}) {
  const document = new Target(); document.hidden = false; document.createElement = tag => new Node(tag, document);
  const window = new Target(); window.document = document; window.Matter = Matter; window.devicePixelRatio = 3;
  const pendingFrames = new Map(); let frameId = 0; window.requestAnimationFrame = fn => { pendingFrames.set(++frameId, fn); return frameId; }; window.cancelAnimationFrame = id => pendingFrames.delete(id);
  const context = new Proxy({}, { get: (o, key) => key in o ? o[key] : ['createLinearGradient', 'createRadialGradient'].includes(key) ? () => ({ addColorStop() {} }) : () => {}, set: (o, key, value) => (o[key] = value, true) });
  const parent = document.createElement('div'), canvas = document.createElement('canvas'); parent.append(canvas);
  canvas.getContext = () => context; canvas.getBoundingClientRect = () => ({ left: 30, top: 40, width: 180, height: 280 });
  canvas.captured = new Set(); canvas.setPointerCapture = id => canvas.captured.add(id); canvas.releasePointerCapture = id => canvas.captured.delete(id);
  const sandbox = { window, Matter, Date, Math, setTimeout() { throw new Error('Timers are forbidden in physics host'); }, fetch() { throw new Error('Network is unavailable'); } };
  if (actual) for (const file of modeFiles) vm.runInNewContext(read('public/' + file), sandbox);
  else window.AirvanaPhysicsModes = Object.fromEntries(['cloud-sling', 'candy-swing', 'happy-cup', 'spring-dig', 'fruit-drop','sky-raid','harvest-lane','island-sling','pocket-city','gem-blocks','dice-voyage','cloud-solitaire','buddy-flip'].map(key => [key, FixtureModel]));
  vm.runInNewContext(hostSource, sandbox);
  vm.runInNewContext(read('public/reference-arcade-v1.js'),sandbox);
  const events = [], statuses = [], completions = [];
  const game = window.AirvanaPhysicsGames.mount(canvas, key, { onEvent: (name, props) => events.push({ name, props }), onStatus: s => statuses.push(s), onComplete: s => completions.push(s), ...options });
  function frame(time) { const item = pendingFrames.entries().next().value; assert.ok(item, 'one animation frame is pending'); pendingFrames.delete(item[0]); item[1](time); }
  return { window, document, parent, canvas, game, events, statuses, completions, pendingFrames, frame };
}
const pointer = (id = 1, x = 66, y = 382, extra = {}) => ({ pointerId: id, pointerType: 'touch', button: 0, clientX: 30 + x / 2, clientY: 40 + y / 2, ...extra });
function extractIndexMethod(name, nextName, globals = {}) {
  const start = indexSource.indexOf('\n  ' + name + '('), end = indexSource.indexOf('\n  ' + nextName + '(', start);
  assert.ok(start >= 0 && end > start, name + ' remains present');
  return vm.runInNewContext('({' + indexSource.slice(start, end).trim() + '})', globals)[name];
}


const newKeys=['sky-raid','harvest-lane','island-sling','pocket-city','gem-blocks','dice-voyage','cloud-solitaire','buddy-flip'];
test('eight new registrations are distinct, precede the old five in sessions, and all have local original covers',()=>{
 const {window,game}=setup();const rt=window.AirvanaPhysicsGames,refs=window.AirvanaReferenceGames.list();
 assert.equal(rt.list().length,13);assert.deepEqual(Array.from(refs,g=>g.key),newKeys);assert.deepEqual(Array.from(rt.sessions().slice(0,8),g=>g.id),[111,112,113,114,115,116,117,118]);
 for(const g of refs){assert.equal(g.stages,3);assert.ok(rt.has(g.key));assert.equal(g.campaignId,'reference-arcade-local-v1');const cover=read('public'+g.cover);assert.match(cover,/<svg/);assert.doesNotMatch(cover,/<image|https?:\/\/(?!www.w3.org)|data:image|codex-clipboard|MONOPOLY|ANGRY BIRDS/i);assert.equal(rt.sessions().find(s=>s.id===g.id).settlement,'不适用');}game.destroy();
});
test('normal pointer release retains gem selection for separate tap placement and rotation; cancellation still clears it',()=>{
 const {game,canvas}=setup({key:'gem-blocks'});
 const tap=(x,y)=>{canvas.dispatch('pointerdown',pointer(1,x,y));canvas.dispatch('pointerup',pointer(1,x,y));};
 tap(68,457);assert.equal(game.model.selected,0);assert.equal(game.pointerId,null);assert.equal(canvas.captured.size,0);
 game.perform('rotate');game.perform('rotate');game.perform('rotate');game.perform('rotate');assert.equal(game.model.selected,0);
 const g=game.model.snapshot().geometry;tap(g.x+g.cell/2,g.y+g.cell/2);game.advance(.02);assert.equal(game.model.lines,1);
 tap(180,457);assert.equal(game.model.selected,1);game.togglePause();assert.equal(game.model.selected,null);game.destroy();
});
test('registration rejects duplicates, missing models and invalid level counts atomically',()=>{
 const {window,game}=setup();const rt=window.AirvanaPhysicsGames;
 const fresh={...rt.list()[0],key:'fresh',id:190,stages:3};window.AirvanaPhysicsModes.fresh=FixtureModel;
 for(const items of [[rt.list()[0]],[fresh,{...fresh,id:191}],[{...fresh,stages:0}],[{...fresh,key:'missing'}]]){assert.throws(()=>rt.register(items));assert.equal(rt.list().length,13);}
 assert.equal(rt.register([fresh]),1);assert.equal(rt.list().length,14);game.destroy();
});
test('all eight three-stage host flows complete once and retain correct campaign and score',()=>{
 for(const key of newKeys){const {game,events,completions}=setup({actual:false,key});assert.equal(game.levelCount,3);game.loadLevel(999);assert.equal(game.stage,3);game.loadLevel(1);
 for(let level=1;level<=3;level++){game.perform('solve');game.advance(.02);assert.equal(game.phase,'success');game.next();}
 assert.equal(game.finished,true);assert.equal(game.score,60);assert.equal(completions.length,1);assert.equal(completions[0].stage,3);assert.equal(events.filter(e=>e.name==='level_complete').length,3);assert.equal(events.filter(e=>e.name==='play_complete').length,1);assert.ok(events.every(e=>e.props.campaign_id==='reference-arcade-local-v1'));game.next();assert.equal(completions.length,1);game.destroy();}
});
for(const key of newKeys)test(key+': all 3 actual models mount, render, pause without state change, retry and destroy',()=>{
 const {game,window,document,canvas,pendingFrames}=setup({key});
 for(let stage=1;stage<=3;stage++){game.loadLevel(stage);game.advance(.1);game.render();game.togglePause();const before=JSON.stringify(game.model.snapshot());for(let i=0;i<60;i++)game.advance(.1);assert.equal(JSON.stringify(game.model.snapshot()),before);assert.ok(game.buttons.children.every(b=>b.disabled));game.togglePause();game.retry();assert.equal(game.stage,stage);assert.equal(game.phase,'playing');assert.equal(game.score,0);}
 game.destroy();assert.equal(document.listenerCount(),0);assert.equal(window.listenerCount(),0);assert.equal(canvas.listenerCount(),0);assert.equal(pendingFrames.size,0);
});
test('homepage and discovery pin all eight before physics and server content without destroying saved counters',()=>{
 const {window,game}=setup(),seeded=Array.from(window.AirvanaPhysicsGames.sessions());
 const start=indexSource.indexOf('    const discoverableSessions = s.sessions.map(withGameCover)'),end=indexSource.indexOf('    const safePlayIdx',start);
 const feed=new Function('s','withGameCover',indexSource.slice(start,end)+'\nreturn publishedSessions;');
 const result=feed({sessions:[...seeded].reverse(),serverDiscoverItems:[{id:'one',title:'User game'}]},x=>x);
 assert.deepEqual(result.slice(0,13).map(x=>x.id),[111,112,113,114,115,116,117,118,101,102,103,104,105]);assert.equal(result[13].serverArtifact,true);
 const a=indexSource.indexOf('        const seededSessions = Array.isArray(this.state.sessions)'),b=indexSource.indexOf('        const profileAvatar',a),restore=new Function('restored',indexSource.slice(a,b)+'\nreturn sessions;');
 const restored=restore.call({state:{sessions:seeded}},{sessions:[{id:111,game:'Old title',likes:42,comments:2},{id:'mine',game:'Unrelated user game'}]});
 assert.equal(restored.find(s=>s.id===111).game,'赤翼突围');assert.equal(restored.find(s=>s.id===111).likes,42);assert.equal(restored.find(s=>s.id==='mine').game,'Unrelated user game');assert.equal(restored.length,14);game.destroy();
});
test('all eight App definitions and event paths use local-only campaign and never enter reward APIs',()=>{
 const {window,game}=setup();
 const get=extractIndexMethod('getFeedMiniGameDefinition','emptyFeedMiniGameState',{window});
 const record=extractIndexMethod('recordFeedMiniGameEvent','beginLocalGameRun');
 for(const id of [111,112,113,114,115,116,117,118]){
  const d=get.call({},id);assert.equal(d.stages,3);assert.equal(d.runtime,'physics-v1');assert.equal(d.campaignId,'reference-arcade-local-v1');
  const records=[];const app={state:{activeGameRunId:'new-'+id,localEventLog:[],sessions:[],gameRunRecords:[]},getFeedMiniGameDefinition:()=>d,localApi:{ready:true,step(){throw Error('commercial API');},complete(){throw Error('commercial completion');}},applyLocalPlayableCompletion(){throw Error('client reward');},recordLocalFeatureEvent:(name,props)=>records.push({name,props}),recordExperience(){},setState(){}};
  for(const name of ['play_start','valid_interaction','level_complete','play_complete','play_complete'])record.call(app,name,id,{score:800});
  assert.equal(records.filter(r=>r.name==='play_complete').length,1);assert.ok(records.every(r=>r.props.campaign_id==='reference-arcade-local-v1'&&r.props.reward_issued===false&&r.props.game_coin_amount===0&&r.props.aip_local_demo_amount===0));
 }game.destroy();
});
test('new models use only local code and standalone loads all declared resources',()=>{
 const files=['reference-action-v1.js','reference-worlds-v1.js','reference-puzzles-v1.js'];
 for(const file of files)assert.doesNotMatch(read('public/'+file),/\bfetch\s*\(|new\s+Image\s*\(|XMLHttpRequest|WebSocket|setInterval|setTimeout|requestAnimationFrame/);
 const html=read('public/reference-arcade.html');for(const[,url]of html.matchAll(/(?:src|href)="(\/[^"#?]+)(?:\?[^"]*)?"/g)){if(url==='/')continue;assert.ok(read('public'+url).length>10,url+' exists');}
});
