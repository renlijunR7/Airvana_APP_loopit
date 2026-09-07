import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import Matter from 'matter-js';

const source = readFileSync(new URL('../public/physics-sling-rope-v1.js', import.meta.url), 'utf8');
function modes() {
  const window = { Matter, AirvanaPhysicsModes: { sentinel: 'preserved' } };
  vm.runInNewContext(source, { window });
  return window.AirvanaPhysicsModes;
}
const registry = modes();
const Sling = registry['cloud-sling'];
const Rope = registry['candy-swing'];
function advance(model, seconds, dt = 1 / 120) {
  for (let i = 0; i < Math.round(seconds / dt) && model.status === 'playing'; i++) model.update(dt);
}
function launch(model, point) {
  model.pointerDown({ x: 66, y: 382 });
  model.pointerMove(point);
  model.pointerUp(point);
}
function cutThrough(model, index) {
  const snapshot = model.snapshot(), rope = snapshot.ropes[index];
  const x = (rope.x + snapshot.candy.x) / 2, y = (rope.y + snapshot.candy.y) / 2;
  model.pointerDown({ x: x - 16, y });
  model.pointerMove({ x: x + 16, y });
  model.pointerUp({ x: x + 16, y });
}
function canvasContext() {
  const calls = [];
  return new Proxy({ calls }, {
    get(object, property) {
      if (property in object) return object[property];
      if (property === 'createLinearGradient') return (...args) => { assert.ok(args.every(Number.isFinite)); return { addColorStop() {} }; };
      return (...args) => {
        calls.push(property);
        for (const value of args) if (typeof value === 'number') assert.ok(Number.isFinite(value), `${String(property)} has finite coordinates`);
      };
    },
    set(object, property, value) { object[property] = value; return true; }
  });
}

test('registers isolated original modes and retains existing registry entries', () => {
  assert.equal(registry.sentinel, 'preserved');
  assert.equal(Sling.levelCount, 5); assert.equal(Rope.levelCount, 5);
  assert.doesNotMatch(source, /\b(?:setTimeout|setInterval|requestAnimationFrame|fetch|Image|document)\b/);
  for (const Type of [Sling, Rope]) {
    const model = new Type({ level: 99 });
    assert.equal(model.level, 5); assert.equal(model.levelCount, 5); assert.equal(model.status, 'playing');
    assert.ok(model.instruction.length > 8); assert.ok(model.title.length > 2);
    assert.doesNotThrow(() => JSON.stringify(model.snapshot()));
    model.destroy(); model.destroy();
  }
});

for (const [level, pullY] of [[1, 382], [2, 382], [3, 387], [4, 382], [5, 372]]) {
  test(`cloud-sling level ${level}: real aimed shots collide with authored towers and win`, () => {
    const model = new Sling({ level });
    const initialBlocks = model.blocks.map(b => ({ x: b.body.position.x, y: b.body.position.y }));
    let fired = 0;
    while (model.status === 'playing' && fired < 6) {
      launch(model, { x: 16, y: pullY }); fired++;
      assert.equal(model.shots, fired);
      advance(model, 6.2);
    }
    assert.equal(model.status, 'success', JSON.stringify(model.snapshot()));
    assert.ok(model.score >= model.targets.length * 100);
    assert.ok(model.targets.every(t => !t.alive));
    assert.ok(model.blocks.some((b, i) => Math.hypot(b.body.position.x - initialBlocks[i].x, b.body.position.y - initialBlocks[i].y) > 1), 'a rigid-body structure actually moved');
    const terminal = JSON.stringify(model.snapshot()); model.key('Enter'); model.update(.1);
    assert.equal(JSON.stringify(model.snapshot()), terminal, 'terminal state does not accept more gameplay');
    model.draw(canvasContext()); model.destroy();
  });
}

test('sling collision is not automatic: launching backwards exhausts ammo and loses', () => {
  const model = new Sling({ level: 1 });
  const initial = model.ammo;
  for (let i = 0; i < initial; i++) { launch(model, { x: 129, y: 382 }); advance(model, 6.2); }
  assert.equal(model.ammo, 0); assert.equal(model.shots, initial); assert.equal(model.score, 0);
  assert.equal(model.status, 'failure'); assert.ok(model.targets.every(t => t.alive));
  model.destroy();
});

test('sling keyboard/preset controls feed the same physical launcher', () => {
  const model = new Sling({ level: 3 });
  model.key('ArrowUp'); assert.equal(model.snapshot().aim.y, 387);
  const initial = model.ammo; model.key('Enter'); assert.equal(model.ammo, initial - 1);
  const first = model.snapshot().projectile; advance(model, .12); const next = model.snapshot().projectile;
  assert.ok(next.x > first.x, 'projectile flies, rather than scoring on click');
  assert.ok(next.vy > first.vy, 'gravity changes vertical velocity');
  assert.ok(model.actions().every(a => a.disabled)); model.destroy();
});

test('sling clamps drag length, ignores non-finite points, and cancels without spending ammo', () => {
  const model = new Sling({ level: 1 });
  model.pointerDown({ x: 250, y: 400 }); assert.equal(model.drag, null);
  model.pointerDown({ x: 66, y: 382 }); model.pointerMove({ x: -999, y: 999 });
  assert.ok(Math.hypot(model.drag.x - 66, model.drag.y - 382) <= 64.001);
  const aim = JSON.stringify(model.snapshot().aim); model.pointerMove({ x: NaN, y: Infinity });
  assert.equal(JSON.stringify(model.snapshot().aim), aim);
  model.cancelPointer(); model.pointerUp({ x: 16, y: 382 });
  assert.equal(model.shots, 0); assert.equal(model.ammo, 4); model.destroy();
});

for (const [level, delay, firstCut, lastCut] of [[1, 0, null, 0], [2, .68, null, 0], [3, .4, 0, 1], [4, .64, null, 0], [5, .367, 1, 0]]) {
  test(`candy-swing level ${level}: timed real rope cuts collect all three stars and reach the mouth`, () => {
    const model = new Rope({ level });
    if (firstCut !== null) cutThrough(model, firstCut);
    advance(model, delay); cutThrough(model, lastCut); advance(model, 5);
    assert.equal(model.status, 'success', JSON.stringify(model.snapshot()));
    assert.equal(model.stars.filter(s => s.collected).length, 3);
    assert.equal(model.cuts, model.ropes.length);
    assert.ok(model.score >= 600);
    assert.ok(Math.abs(model.candy.x - model.goal.x) < 29);
    const terminal = JSON.stringify(model.snapshot()); model.perform('cut-0'); model.update(.1);
    assert.equal(JSON.stringify(model.snapshot()), terminal);
    model.draw(canvasContext()); model.destroy();
  });
}

test('rope constraint swings under gravity without stretching; waiting is not automatic success', () => {
  const model = new Rope({ level: 2 }); const start = model.snapshot().candy;
  advance(model, .4); const current = model.snapshot().candy, r = model.ropes[0];
  assert.ok(current.x > start.x + 10, 'gravity drives an actual pendulum arc');
  assert.ok(Math.hypot(current.x - r.x, current.y - r.y) <= r.length + .01);
  assert.equal(model.status, 'playing'); assert.equal(model.cuts, 0);
  advance(model, 46); assert.equal(model.status, 'failure'); model.destroy();
});

test('rope wrong timing misses the mouth; obstacle contact also loses', () => {
  for (const level of [2, 4]) {
    const model = new Rope({ level }); model.key('1'); advance(model, 5);
    assert.equal(model.status, 'failure');
    if (level === 4) assert.ok(model.candy.y < 390, 'the thorn hazard stops candy above the floor');
    else assert.ok(model.candy.y > 480, 'candy falls past the mouth');
    model.destroy();
  }
});

test('rope buttons and pointer taps cut just the intended constraint, idempotently', () => {
  const model = new Rope({ level: 3 }); const ropes = model.snapshot().ropes;
  model.pointerDown({ x: ropes[0].x, y: ropes[0].y + 2 }); model.pointerUp({ x: ropes[0].x, y: ropes[0].y + 2 });
  assert.equal(model.ropes[0].active, false); assert.equal(model.ropes[1].active, true);
  model.perform('cut-0'); assert.equal(model.cuts, 1);
  assert.equal(model.actions()[0].disabled, true); assert.equal(model.actions()[1].disabled, false);
  model.key('2'); assert.equal(model.ropes[1].active, false); assert.equal(model.cuts, 2);
  model.cancelPointer(); model.destroy();
});

test('all ten independent scenes render original detailed art with finite canvas geometry', () => {
  for (const Type of [Sling, Rope]) for (let level = 1; level <= 5; level++) {
    const model = new Type({ level }); const ctx = canvasContext();
    advance(model, .13); model.draw(ctx);
    assert.ok(ctx.calls.length > 250, 'scene has individually drawn physical objects and theme details');
    assert.ok(ctx.calls.includes('clip')); assert.ok(ctx.calls.includes('fillText'));
    const before = JSON.stringify(model.snapshot()); model.destroy(); model.update(.1);
    assert.equal(JSON.stringify(model.snapshot()), before, 'destroyed model no longer simulates');
  }
});

test('fixed substeps keep common display frame rates mechanically consistent', () => {
  for (const fps of [30, 60, 120]) {
    const rope = new Rope({ level: 1 }); rope.perform('cut-0'); advance(rope, 4, 1 / fps);
    assert.equal(rope.status, 'success'); assert.equal(rope.stars.filter(s => s.collected).length, 3); rope.destroy();
    const sling = new Sling({ level: 1 }); launch(sling, { x: 16, y: 382 }); advance(sling, 6.2, 1 / fps);
    if (sling.status === 'playing') { launch(sling, { x: 16, y: 382 }); advance(sling, 6.2, 1 / fps); }
    assert.equal(sling.status, 'success'); sling.destroy();
  }
});
