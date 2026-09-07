import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import Matter from 'matter-js';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const hostSource = read('public/physics-arcade-v1.js');
const indexSource = read('public/index.html');
const modeFiles = ['physics-sling-rope-v1.js', 'physics-water-v1.js', 'physics-fruit-v1.js'];
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
function setup({ actual = false, key = 'cloud-sling', options = {} } = {}) {
  const document = new Target(); document.hidden = false; document.createElement = tag => new Node(tag, document);
  const window = new Target(); window.document = document; window.Matter = Matter; window.devicePixelRatio = 3;
  const pendingFrames = new Map(); let frameId = 0; window.requestAnimationFrame = fn => { pendingFrames.set(++frameId, fn); return frameId; }; window.cancelAnimationFrame = id => pendingFrames.delete(id);
  const context = new Proxy({}, { get: (o, key) => key in o ? o[key] : ['createLinearGradient', 'createRadialGradient'].includes(key) ? () => ({ addColorStop() {} }) : () => {}, set: (o, key, value) => (o[key] = value, true) });
  const parent = document.createElement('div'), canvas = document.createElement('canvas'); parent.append(canvas);
  canvas.getContext = () => context; canvas.getBoundingClientRect = () => ({ left: 30, top: 40, width: 180, height: 280 });
  canvas.captured = new Set(); canvas.setPointerCapture = id => canvas.captured.add(id); canvas.releasePointerCapture = id => canvas.captured.delete(id);
  const sandbox = { window, Matter, Date, Math, setTimeout() { throw new Error('Timers are forbidden in physics host'); }, fetch() { throw new Error('Network is unavailable'); } };
  if (actual) for (const file of modeFiles) vm.runInNewContext(read('public/' + file), sandbox);
  else window.AirvanaPhysicsModes = Object.fromEntries(['cloud-sling', 'candy-swing', 'happy-cup', 'spring-dig', 'fruit-drop'].map(key => [key, FixtureModel]));
  vm.runInNewContext(hostSource, sandbox);
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

test('five standalone game registrations have unique canonical IDs 101–105 and original local covers', () => {
  const { game, window } = setup({ actual: true }); const runtime = window.AirvanaPhysicsGames;
  assert.equal(runtime.version, '1.2.0'); assert.equal(runtime.width, 360); assert.equal(runtime.height, 560);
  assert.deepEqual(Array.from(runtime.list(), x => x.id), [101, 102, 103, 104, 105]);
  assert.equal(new Set(runtime.list().map(x => x.key)).size, 5);
  for (const entry of runtime.list()) {
    assert.equal(runtime.has(entry.key), true); assert.equal(entry.stages, 5); assert.match(entry.cover, /^\/assets\/games\/physics-casual-v2\/[a-z-]+\.png$/);
    const cover = readFileSync(new URL('../public' + entry.cover, import.meta.url));
    assert.equal(cover.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.ok(cover.readUInt32BE(16) >= 512 && cover.readUInt32BE(20) >= 512);
    assert.equal(entry.art, 'physics-casual-v2');
    assert.equal(runtime.sessions().find(s => s.id === entry.id).settlement, '不适用');
  }
  const definitions = runtime.list(); definitions[0].title = 'mutated'; assert.notEqual(runtime.list()[0].title, 'mutated');
  game.destroy();
});

test('homepage keeps the five physics games first even after server-feed items arrive', () => {
  const { game, window } = setup(); const seeded = Array.from(window.AirvanaPhysicsGames.sessions());
  const start = indexSource.indexOf('    const discoverableSessions = s.sessions.map(withGameCover)'), end = indexSource.indexOf('    const safePlayIdx', start);
  assert.ok(start >= 0 && end > start);
  const feed = new Function('s', 'withGameCover', indexSource.slice(start, end) + '\nreturn publishedSessions;');
  for (const count of [0, 1, 8]) {
    const state = { sessions: [{ id: 34, status: 'published' }, { id: 1, status: 'published' }, ...seeded.reverse(), { id: 999, status: 'draft' }], serverDiscoverItems: Array.from({ length: count }, (_, i) => ({ id: 'server-' + i, title: 'Server ' + i })) };
    const result = feed(state, x => x); assert.deepEqual(result.slice(0, 5).map(x => x.id), [101, 102, 103, 104, 105]);
    assert.equal(result.filter(x => x.serverArtifact).length, Math.min(count, 5)); assert.ok(!result.some(x => x.id === 999));
  }
  game.destroy();
});

test('restoring an old saved catalogue adds all five physics seeds without losing existing content or metrics', () => {
  const { game, window } = setup(); const current = [{ id: 34, game: 'Current orchard', likes: 0 }, ...window.AirvanaPhysicsGames.sessions()];
  const start = indexSource.indexOf('        const seededSessions = Array.isArray(this.state.sessions)'), end = indexSource.indexOf('        const profileAvatar', start);
  assert.ok(start >= 0 && end > start);
  const restore = new Function('restored', indexSource.slice(start, end) + '\nreturn sessions;');
  const result = restore.call({ state: { sessions: current } }, { sessions: [{ id: 34, game: 'Old orchard', likes: 12, comments: 3 }, { id: 'mine-44', game: 'User creation' }] });
  assert.deepEqual(result.filter(s => Number(s.id) >= 101 && Number(s.id) <= 105).map(s => s.id).sort(), [101, 102, 103, 104, 105]);
  assert.equal(result.find(s => s.id === 34).likes, 12); assert.equal(result.find(s => s.id === 34).game, 'Current orchard');
  assert.equal(result.find(s => s.id === 'mine-44').game, 'User creation');
  assert.match(indexSource, /\.\.\.\(window\.AirvanaPhysicsGames \? window\.AirvanaPhysicsGames\.sessions\(\) : \[\]\)/);
  game.destroy();
});

test('host sizes Retina canvas, maps CSS pointer coordinates, and rejects HUD/control-space gestures', () => {
  const { canvas, game, parent } = setup(); assert.equal(canvas.width, 720); assert.equal(canvas.height, 1120); assert.equal(canvas.tabIndex, 0);
  assert.equal(canvas.style.touchAction, 'none'); assert.equal(parent.classList.contains('physics-host'), true);
  for (const y of [20, 520]) { canvas.dispatch('pointerdown', pointer(1, 66, y)); canvas.dispatch('pointerup', pointer(1, 66, y)); }
  assert.ok(!game.model.calls.some(c => c[0] === 'down'));
  canvas.dispatch('pointerdown', pointer(1)); const down = game.model.calls.find(c => c[0] === 'down'); assert.deepEqual({ ...down[1] }, { x: 66, y: 382 });
  canvas.dispatch('pointerup', pointer(1)); assert.equal(canvas.captured.size, 0); game.destroy();
});

test('multitouch cannot move, release, or cancel another pointer’s drag', () => {
  const { canvas, game } = setup(); canvas.dispatch('pointerdown', pointer(11));
  canvas.dispatch('pointerdown', pointer(22)); canvas.dispatch('pointermove', pointer(22, 120, 400)); canvas.dispatch('pointerup', pointer(22));
  canvas.dispatch('pointercancel', pointer(22)); canvas.dispatch('lostpointercapture', pointer(22));
  assert.equal(game.pointerId, 11); assert.equal(game.model.calls.filter(c => c[0] === 'down').length, 1); assert.equal(game.model.calls.filter(c => c[0] === 'up').length, 0);
  canvas.dispatch('pointermove', pointer(11, 45, 410)); canvas.dispatch('pointerup', pointer(11, 45, 410));
  assert.equal(game.model.calls.filter(c => c[0] === 'move').length, 1); assert.equal(game.model.calls.filter(c => c[0] === 'up').length, 1); assert.equal(game.pointerId, null); game.destroy();
});

test('pointer cancellation cancels a real slingshot without launching or spending ammunition', () => {
  const { canvas, game } = setup({ actual: true }); canvas.dispatch('pointerdown', pointer(1)); canvas.dispatch('pointermove', pointer(1, 16, 395));
  assert.ok(game.model.drag); canvas.dispatch('pointercancel', pointer(1)); canvas.dispatch('pointerup', pointer(1, 16, 395));
  assert.equal(game.model.shots, 0); assert.equal(game.model.ammo, 4); assert.equal(game.model.projectile, null); assert.equal(game.pointerId, null); game.destroy();
});

test('pause freezes model updates and cancels captured gestures, without executing pointerUp', () => {
  const { canvas, game, events, frame } = setup(); frame(1000); frame(1017); assert.ok(game.model.updates > 0);
  canvas.dispatch('pointerdown', pointer(4)); const updates = game.model.updates; game.togglePause();
  assert.equal(game.pointerId, null); assert.equal(canvas.captured.size, 0); assert.equal(game.overlay.hidden, false); assert.equal(game.controls.hidden, true);
  game.advance(9); frame(9000); frame(10000); canvas.dispatch('pointerup', pointer(4)); game.perform('solve');
  assert.equal(game.model.updates, updates); assert.equal(game.model.calls.filter(c => c[0] === 'up').length, 0);
  game.togglePause(); frame(12000); frame(12017); assert.ok(game.model.updates > updates); assert.ok(game.model.updates - updates < 5, 'resume does not catch up hidden wall time');
  assert.equal(events.filter(e => e.name === 'pause').length, 1); assert.equal(events.filter(e => e.name === 'resume').length, 1); game.destroy();
});

test('document hidden and window blur each pause automatically; visibility return never auto-resumes', () => {
  const { game, window, document } = setup({ actual: true, key: 'candy-swing' }); game.advance(.1); const before = JSON.stringify(game.model.snapshot());
  document.hidden = true; document.dispatch('visibilitychange'); assert.equal(game.paused, true); game.advance(.1); assert.equal(JSON.stringify(game.model.snapshot()), before);
  document.hidden = false; document.dispatch('visibilitychange'); assert.equal(game.paused, true);
  game.togglePause(); window.dispatch('blur'); assert.equal(game.paused, true); game.destroy();
});

test('keyboard forwards numeric rope shortcuts and scopes pause/retry to the focused canvas', () => {
  const { game, canvas } = setup({ actual: true, key: 'candy-swing' }); game.loadLevel(3);
  canvas.dispatch('keydown', { key: '1' }); assert.equal(game.model.ropes[0].active, false); assert.equal(game.model.ropes[1].active, true);
  canvas.dispatch('keydown', { key: 'p' }); assert.equal(game.paused, true); canvas.dispatch('keydown', { key: '2' }); assert.equal(game.model.ropes[1].active, true);
  canvas.dispatch('keydown', { key: 'r' }); assert.equal(game.paused, false); assert.equal(game.stage, 3); assert.ok(game.model.ropes.every(r => r.active)); game.destroy();
});

test('each success stops simulation; five explicit next actions complete exactly once with summed scores', () => {
  const { game, events, completions } = setup();
  for (let level = 1; level <= 5; level++) {
    assert.equal(game.stage, level); game.perform('solve'); game.advance(.02); assert.equal(game.phase, 'success');
    const updates = game.model.updates; game.advance(.1); assert.equal(game.model.updates, updates); assert.equal(game.controls.hidden, true); assert.equal(game.overlay.hidden, false);
    game.next();
  }
  assert.equal(game.finished, true); assert.equal(game.score, 150); assert.equal(completions.length, 1); assert.equal(completions[0].stage, 5);
  game.next(); game.retry(); game.keypress('Enter'); game.advance(.1);
  assert.equal(completions.length, 1); assert.equal(events.filter(e => e.name === 'play_complete').length, 1); assert.equal(events.filter(e => e.name === 'level_complete').length, 5);
  assert.equal(new Set(events.map(e => e.props.event_id)).size, events.length); assert.ok(events.every(e => e.props.local_demo === true && e.props.reward_issued === false)); game.destroy();
});

test('retry preserves current stage and prior-stage score while resetting only the failed level', () => {
  const { game, events, completions } = setup(); game.perform('solve'); game.advance(.02); game.next(); assert.equal(game.stage, 2); assert.equal(game.totalScore, 10);
  const failed = game.model; game.perform('miss'); game.advance(.02); assert.equal(game.phase, 'failure'); assert.equal(completions.length, 0); game.next(); assert.equal(game.stage, 2);
  game.retry(); assert.equal(game.stage, 2); assert.equal(game.totalScore, 10); assert.equal(game.score, 10); assert.equal(game.phase, 'playing'); assert.equal(failed.destroyed, true);
  assert.equal(events.filter(e => e.name === 'play_fail').length, 1); assert.equal(events.filter(e => e.name === 'replay').length, 1); game.destroy();
});

test('destroy releases pointer, removes host DOM and external listeners, and cancels the RAF chain', () => {
  const { game, canvas, parent, window, document, pendingFrames, events } = setup();
  canvas.dispatch('pointerdown', pointer(5)); const model = game.model; const staleTick = game.tick; const eventCount = events.length;
  assert.equal(pendingFrames.size, 1); assert.ok(canvas.listenerCount() > 0); assert.ok(document.listenerCount() > 0); assert.ok(window.listenerCount() > 0);
  game.destroy(); game.destroy(); staleTick(5000); canvas.dispatch('pointerup', pointer(5)); document.dispatch('visibilitychange'); window.dispatch('blur');
  assert.equal(model.destroyed, true); assert.equal(pendingFrames.size, 0); assert.equal(canvas.captured.size, 0);
  assert.equal(canvas.listenerCount(), 0); assert.equal(document.listenerCount(), 0); assert.equal(window.listenerCount(), 0);
  assert.deepEqual(parent.children, [canvas]); assert.equal(parent.classList.contains('physics-host'), false); assert.equal(events.length, eventCount);
});

test('all five actual modes mount and render without fetch, remote images, or dependency CDNs', () => {
  for (const key of ['cloud-sling', 'candy-swing', 'happy-cup', 'spring-dig', 'fruit-drop']) {
    const { game } = setup({ actual: true, key }); game.advance(.1); game.render(); assert.doesNotThrow(() => JSON.stringify(game.snapshot())); game.destroy();
  }
  const gameSources = [hostSource, ...modeFiles.map(file => read('public/' + file))];
  for (const code of gameSources) assert.doesNotMatch(code, /\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(|new\s+Image\s*\(|new\s+(?:root|window)\.Audio\s*\(|import\s*\(/);
  assert.match(hostSource, /const Audio=root\.AudioContext\|\|root\.webkitAudioContext/, 'audio is a generated Web Audio tone, not an external sound file');
  const paths = ['vendor/matter-0.20.0.min.js', ...modeFiles, 'physics-arcade-v1.js']; let previous = -1;
  for (const file of paths) { const position = indexSource.indexOf('<script src="./' + file); assert.ok(position > previous, file + ' is locally loaded in dependency order'); previous = position; }
});

test('Matter vendor is the exact pinned 0.20.0 build and includes the original MIT license', () => {
  const vendor = read('public/vendor/matter-0.20.0.min.js'), installed = read('node_modules/matter-js/build/matter.min.js');
  const hash = text => createHash('sha256').update(text).digest('hex'); assert.equal(hash(vendor), hash(installed));
  const license = read('public/vendor/matter-LICENSE.txt'); assert.match(license, /MIT License/); assert.match(license, /Liam Brummitt and contributors/); assert.match(license, /Permission is hereby granted/);
  const pkg = JSON.parse(read('package.json')); assert.equal(pkg.dependencies['matter-js'], '0.20.0');
  const context = {}; vm.runInNewContext(vendor, context); assert.equal(context.Matter.version, '0.20.0');
});

test('physics completion follows a local non-commercial event path with no reward/settlement side effects', () => {
  const method = extractIndexMethod('recordFeedMiniGameEvent', 'beginLocalGameRun'); const calls = { reward: 0, api: 0, records: [], experience: 0 };
  const app = {
    state: { activeGameRunId: 'canonical-101', localEventLog: [], gameRunRecords: [{ id: 'canonical-101' }], sessions: [{ id: 101, owner: '@airvana.arcade' }] },
    getFeedMiniGameDefinition() { return { runtime: 'physics-v1', playableId: 'plb_cloud_sling' }; },
    localBusiness: { updateGameRun(run, name) { return { ...run, last: name }; } },
    localApi: { ready: true, step() { calls.api++; return Promise.resolve(); }, complete() { calls.api++; return Promise.resolve(null); }, abandonRuntime() { calls.api++; } },
    applyLocalPlayableCompletion() { calls.reward++; return {}; }, recordLocalFeatureEvent(name, props) { calls.records.push({ name, props }); }, recordExperience() { calls.experience++; },
    setState(update, done) { Object.assign(this.state, typeof update === 'function' ? update(this.state) : update); done?.(); }, toast() {}
  };
  for (const name of ['valid_interaction', 'level_complete', 'play_complete', 'play_complete']) method.call(app, name, 101, { run_id: 'canonical-101', score: 120 });
  assert.equal(calls.reward, 0, 'physics-only challenge must not award game coins or AIP'); assert.equal(calls.api, 0, 'physics-only challenge must not enter commercial runtime API');
  assert.equal(calls.records.filter(e => e.name === 'play_complete').length, 1); assert.equal(calls.experience, 1); assert.equal(app.state.gameRunRecords[0].last, 'play_complete');
});

test('canonical local run ID is retained across levels, retries, and final host completion', () => {
  const { game, events } = setup({ options: { runId: 'local-game-run-101-proof' } });
  game.retry();
  for (let i = 0; i < 5; i++) { game.perform('solve'); game.advance(.02); game.next(); }
  assert.ok(events.length > 10); assert.ok(events.every(e => e.props.run_id === 'local-game-run-101-proof'));
  assert.ok(events.every(e => e.props.event_id.startsWith('local-game-run-101-proof-'))); game.destroy();
});

test('index mount passes canonical run ID and does not double-log physics completion or pause/resume', () => {
  for (const runtime of ['physics-v1', 'complete-v3']) {
    let mountedOptions; const recorded = []; const canvas = { focus() {} };
    const engine = { has: () => true, mount(node, key, options) { assert.equal(node, canvas); mountedOptions = options; return {}; } };
    const window = { AirvanaPhysicsGames: engine, AirvanaCompleteGames: engine, matchMedia: () => ({ matches: false }) };
    const mount = extractIndexMethod('mountDeepFeedMiniGame', 'startDeepFeedMiniGame', { window, document: { getElementById: () => canvas }, requestAnimationFrame: () => 1 });
    const toggle = extractIndexMethod('toggleDeepFeedMiniGamePause', 'actFeedMiniGame');
    const app = {
      state: { activeGameRunId: 'canonical-local-run', feedMiniGame: { contentId: 101, status: 'playing', stage: 5, score: 100 } },
      getFeedMiniGameDefinition() { return { type: 'deep', runtime, deepGameKey: 'cloud-sling', stages: runtime === 'physics-v1' ? 5 : 3 }; },
      disposeDeepFeedMiniGame() {}, recordFeedMiniGameEvent(name, id, properties) { recorded.push({ name, id, properties }); }, updateFeedMiniGameBest() {},
      setState(update) { Object.assign(this.state, update); }
    };
    mount.call(app, 101); assert.equal(mountedOptions.runId, 'canonical-local-run');
    if (runtime === 'physics-v1') mountedOptions.onEvent('play_complete', { run_id: mountedOptions.runId, score: 150 });
    mountedOptions.onComplete({ success: true, score: 150, stage: 5 });
    assert.equal(recorded.filter(e => e.name === 'play_complete').length, 1, runtime + ' logs completion once');
    assert.equal(app.state.feedMiniGame.status, 'success');
    app.state.feedMiniGame.status = 'playing'; let paused = false;
    app._deepGameInstance = { togglePause() { paused = !paused; if (runtime === 'physics-v1') mountedOptions.onEvent(paused ? 'pause' : 'resume', { run_id: mountedOptions.runId }); return paused; } };
    toggle.call(app, 101); toggle.call(app, 101);
    assert.equal(recorded.filter(e => e.name === 'pause').length, 1); assert.equal(recorded.filter(e => e.name === 'resume').length, 1);
    assert.match(app.state.feedMiniGame.message, runtime === 'physics-v1' ? /5 \/ 5/ : /5 \/ 3/);
  }
});

test('beginning a physics game creates a local game-run record without starting commercial server runtime', () => {
  const method = extractIndexMethod('beginLocalGameRun', 'scheduleCupShuffle');
  for (const runtime of ['physics-v1', 'complete-v3']) {
    let serverStarts = 0;
    const app = {
      state: { localSessionId: 'session', localUser: { id: 'player' }, gameRunRecords: [] },
      getFeedMiniGameDefinition: () => ({ runtime, playableId: 'plb_cloud_sling', title: '弹射云堡' }),
      localBusiness: { startGameRun: properties => ({ id: 'created-local-run', ...properties }) },
      localApi: { ready: true, startRuntime() { serverStarts++; return Promise.resolve(); } },
      setState(update) { Object.assign(this.state, update(this.state)); }
    };
    const result = method.call(app, 101); assert.equal(result.id, 'created-local-run'); assert.equal(app.state.activeGameRunId, result.id); assert.equal(app.state.gameRunRecords.length, 1);
    assert.equal(serverStarts, runtime === 'physics-v1' ? 0 : 1, 'legacy server-runtime path is unchanged');
  }
});

test('feed viewport clips without becoming a focus-scroll container and retains the transform carousel', () => {
  const feedTag = indexSource.match(/<div\s+class="play-feed"[^>]*>/)?.[0];
  assert.ok(feedTag, 'homepage feed viewport remains present');
  const style = feedTag.match(/\bstyle="([^"]*)"/)?.[1] || '';
  const declarations = Object.fromEntries(style.split(';').filter(Boolean).map(rule => { const colon = rule.indexOf(':'); return [rule.slice(0, colon).trim(), rule.slice(colon + 1).trim()]; }));
  assert.equal(declarations.overflow, 'clip', 'focus must not programmatically scroll the feed and crop the game');
  assert.equal(declarations['min-height'], '0', 'flex feed may shrink within the phone viewport');
  assert.equal(declarations['touch-action'], 'none', 'pointer-controlled game/feed gestures stay deliberate');
  const carouselStart = indexSource.indexOf(feedTag) + feedTag.length;
  const carouselMarkup = indexSource.slice(carouselStart, carouselStart + 350);
  assert.match(carouselMarkup, /<div[^>]*transform:\{\{\s*feedTransform\s*\}\}/, 'carousel navigation still uses a transform, not native scrolling');
});

test('physics gameplay and result buttons keep 44px touch targets, including narrow-phone overrides', () => {
  const css = read('public/physics-arcade-v1.css');
  const shared = css.match(/\.physics-buttons\s+button\s*,\s*\.physics-result\s+button\s*\{([^}]+)\}/)?.[1];
  assert.ok(shared, 'shared game/result button sizing rule remains present');
  assert.match(shared, /(?:^|;)\s*min-height\s*:\s*44px\s*(?:;|$)/);
  const buttonRules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(([, selectors]) => /\.physics-(?:buttons|result)\s+button/.test(selectors));
  for (const [rule, selectors, declarations] of buttonRules) {
    const minimum = declarations.match(/(?:^|;)\s*min-height\s*:\s*([\d.]+)px/);
    if (minimum) assert.ok(Number(minimum[1]) >= 44, selectors.trim() + ' must not reduce the touch target below 44px');
    assert.doesNotMatch(rule, /min-height\s*:\s*(?:34|36)px/, 'old narrow-screen button regression stays removed');
  }
  assert.match(css, /\.physics-buttons\s+button:focus-visible/, 'keyboard focus remains visible');
});
