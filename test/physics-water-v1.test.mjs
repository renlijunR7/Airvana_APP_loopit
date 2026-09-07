import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../public/physics-water-v1.js', import.meta.url), 'utf8');
const sandbox = { AirvanaPhysicsModes: { 'existing-mode': class Existing {} } };
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'physics-water-v1.js' });
const Modes = sandbox.AirvanaPhysicsModes;
const plain = value => JSON.parse(JSON.stringify(value));

// These are recorded player gestures, not model-state assignments. They prove
// all authored levels are solvable via the same pointer/action API as the UI.
const CUP_GESTURES = [
  [[[50, 209], [200, 333]]],
  [[[310, 201], [142, 336]]],
  [[[40, 201], [210, 259]], [[290, 275], [290, 430]]],
  [[[316, 197], [140, 316]], [[65, 316], [65, 444]]],
  [[[147, 199], [289, 453]]]
];
const DIG_GESTURES = [
  [[[74, 173], [82, 245], [117, 312], [260, 383], [264, 444]]],
  [[[282, 173], [276, 283], [247, 310], [103, 386], [91, 444]]],
  [[[66, 173], [67, 282], [150, 322], [259, 322], [271, 440]]],
  [[[282, 173], [305, 254], [284, 305], [228, 377], [104, 385], [95, 444]]],
  [[[178, 173], [234, 211], [251, 295], [265, 359], [284, 445]]]
];
function gesture(model, strokes) {
  for (const stroke of strokes) {
    model.pointerDown({ x: stroke[0][0], y: stroke[0][1] });
    for (const [x, y] of stroke.slice(1)) model.pointerMove({ x, y });
    model.pointerUp();
  }
}
function simulate(model, seconds = 26, onFrame) {
  for (let i = 0; i < Math.ceil(seconds * 60) && model.status === 'playing'; i++) {
    model.update(1 / 60);
    if (onFrame) onFrame(model.snapshot());
  }
  return model.snapshot();
}
function assertConservation(state) {
  assert.equal(state.emitted, state.collected + state.lost + state.particles.length, 'water cannot be created or destroyed by a collision');
  assert.ok(state.emitted <= state.totalWater);
  assert.ok(state.particles.length <= 84);
}

test('water modules preserve existing registrations and expose the complete host contract', () => {
  assert.equal(typeof Modes['existing-mode'], 'function');
  for (const key of ['happy-cup', 'spring-dig']) {
    const model = new Modes[key]();
    assert.equal(model.status, 'playing');
    assert.equal(model.levelCount, 5);
    assert.equal(model.level, 1);
    assert.equal(typeof model.instruction, 'string');
    for (const method of ['update', 'draw', 'pointerDown', 'pointerMove', 'pointerUp', 'cancelPointer', 'key', 'snapshot', 'actions', 'perform']) assert.equal(typeof model[method], 'function', method);
    assert.deepEqual(plain(model.actions().map(a => a.id)), ['undo', 'clear', 'release']);
    assert.equal(new Modes[key]({ level: -5 }).level, 1);
    assert.equal(new Modes[key]({ level: 99 }).level, 5);
  }
});

for (const [key, plans] of [['happy-cup', CUP_GESTURES], ['spring-dig', DIG_GESTURES]]) {
  for (let level = 1; level <= 5; level++) {
    test(`${key} level ${level}: pointer-built solution physically delivers enough finite water`, () => {
      const model = new Modes[key]({ level });
      gesture(model, plans[level - 1]);
      assert.equal(model.collected, 0, 'preparation never awards success');
      model.perform('release');
      const result = simulate(model, 26, assertConservation);
      assert.equal(result.status, 'success');
      assert.ok(result.collected >= result.target);
      assert.ok(result.releaseTime > 1, 'water traverses the actual geometry over time');
      assert.ok(result.score >= result.target * 10);
      if (key === 'happy-cup') assert.ok(result.inkUsed <= result.inkBudget);
      else assert.ok(result.dug <= result.digBudget);
    });
    test(`${key} level ${level}: opening the source without a route fails, never autocompletes`, () => {
      const model = new Modes[key]({ level });
      model.perform('release');
      const result = simulate(model);
      assert.equal(result.status, 'failure');
      assert.ok(result.collected < result.target);
      assertConservation(result);
    });
  }
  test(`${key}: release, completion and resources are protected against repeated input`, () => {
    const model = new Modes[key]({ level: 1 });
    gesture(model, plans[0]);
    model.perform('release');
    const ready = model.snapshot();
    for (const action of ['release', 'clear', 'undo']) model.perform(action);
    gesture(model, [[[17, 180], [343, 440]]]);
    assert.deepEqual(plain(model.snapshot()), plain(ready));
    const completed = simulate(model);
    assert.equal(completed.status, 'success');
    model.update(10); model.perform('clear'); model.key('Enter');
    assert.deepEqual(plain(model.snapshot()), plain(completed));
  });
  test(`${key}: preparation remains paused until release and cancelling a gesture ends input`, () => {
    const model = new Modes[key]({ level: 1 });
    model.pointerDown({ x: 77, y: 190 }); model.pointerMove({ x: 88, y: 210 }); model.cancelPointer();
    const before = model.snapshot(); model.pointerMove({ x: 330, y: 450 });
    assert.deepEqual(plain(model.snapshot()), plain(before));
    for (let i = 0; i < 600; i++) model.update(1 / 60);
    assert.equal(model.emitted, 0); assert.equal(model.collected, 0); assert.equal(model.status, 'playing');
    model.key('Enter'); assert.equal(model.released, true);
  });
  test(`${key}: equal elapsed time produces the same fixed-step physical state`, () => {
    const slow = new Modes[key]({ level: 1 }), fast = new Modes[key]({ level: 1 });
    gesture(slow, plans[0]); gesture(fast, plans[0]); slow.perform('release'); fast.perform('release');
    for (let i = 0; i < 360; i++) slow.update(1 / 120);
    for (let i = 0; i < 180; i++) fast.update(1 / 60);
    assert.deepEqual(plain(slow.snapshot()), plain(fast.snapshot()));
  });
}

test('cup ink, undo, clear, and bounded gestures operate on real collision strokes', () => {
  const model = new Modes['happy-cup']({ level: 1 });
  gesture(model, [[[42, 200], [150, 260]], [[200, 240], [270, 320]]]);
  const total = model.inkUsed; assert.ok(total > 0);
  model.perform('undo'); assert.equal(model.strokes.length, 1); assert.ok(model.inkUsed < total);
  model.key('c'); assert.equal(model.inkUsed, 0); assert.equal(model.strokes.length, 0);
  gesture(model, [[[16, 114], [344, 472], [16, 472], [344, 114]]]);
  assert.ok(model.inkUsed <= model.config.ink + .00001);
  assert.ok(model.inkUsed >= model.config.ink - .00001);
  assert.match(model.snapshot().feedback, /墨水/);
  for (const stroke of model.snapshot().strokes) for (const p of stroke) { assert.ok(p.x >= 16 && p.x <= 344); assert.ok(p.y >= 114 && p.y <= 472); }
});

test('underground soil is truly excavated; undo/clear restore it and permanent rocks never move', () => {
  const model = new Modes['spring-dig']({ level: 1 });
  const initial = model.snapshot();
  gesture(model, [[[74, 173], [84, 275]], [[164, 244], [194, 258]]]);
  const dug = model.snapshot();
  assert.ok(dug.dug > 0);
  assert.ok(dug.soil.reduce((a, b) => a + b, 0) < initial.soil.reduce((a, b) => a + b, 0));
  assert.deepEqual(plain(dug.rocks), plain(initial.rocks));
  model.perform('undo'); model.perform('clear');
  assert.equal(model.dug, 0); assert.deepEqual(plain(model.snapshot().soil), plain(initial.soil));
  for (let y = 190; y < 435; y += 30) gesture(model, [[[18, y], [342, y]]]);
  assert.equal(model.dug, model.config.budget);
  assert.deepEqual(plain(model.snapshot().rocks), plain(initial.rocks));
});

test('underground moving water remains in excavated/empty cells, never tunnels through soil or rock', () => {
  const model = new Modes['spring-dig']({ level: 3 });
  gesture(model, DIG_GESTURES[2]); model.perform('release');
  simulate(model, 26, state => {
    for (const p of state.particles) {
      const col = Math.floor((p.x - state.grid.x) / state.grid.cell), row = Math.floor((p.y - state.grid.y) / state.grid.cell), i = row * state.grid.cols + col;
      assert.equal(state.soil[i], 0); assert.equal(state.rocks[i], 0);
    }
  });
  assert.equal(model.status, 'success');
});

test('canvas drawing works before, during and after play without timers, images or document access', () => {
  const calls = [];
  const gradient = { addColorStop() {} };
  const ctx = new Proxy({}, {
    get(_, name) { if (name === 'createLinearGradient') return () => gradient; return (...args) => calls.push([name, ...args]); },
    set() { return true; }
  });
  for (const key of ['happy-cup', 'spring-dig']) {
    const model = new Modes[key]({ level: 1 }); model.draw(ctx);
    gesture(model, key === 'happy-cup' ? CUP_GESTURES[0] : DIG_GESTURES[0]); model.perform('release'); model.update(.1); model.draw(ctx);
    simulate(model); model.draw(ctx);
  }
  assert.ok(calls.some(([name, x, y, w, h]) => name === 'rect' && x === 0 && y === 80 && w === 360 && h === 404));
  assert.equal(/requestAnimationFrame|setInterval|setTimeout|new Image\b|document\./.test(source), false);
});
