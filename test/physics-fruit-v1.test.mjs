import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const Matter = require('matter-js');
const source = readFileSync(new URL('../public/physics-fruit-v1.js', import.meta.url), 'utf8');

function game(options = {}) {
  const context = vm.createContext({ Matter });
  vm.runInContext(source, context);
  return new context.AirvanaPhysicsModes['fruit-drop'](options);
}

function seeded(seed) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function step(model, seconds) {
  for (let i = 0; i < Math.ceil(seconds * 60); i += 1) model.update(1 / 60);
}

function drop(model, x = 180) {
  model.pointerDown({ x, y: 300 });
  model.pointerUp({ x, y: 300 });
}

function safeBodies(model) {
  const snapshot = model.snapshot();
  assert.ok(snapshot.bodyCount <= 72, 'fruit population must be bounded');
  for (const fruit of snapshot.fruits) {
    for (const value of [fruit.x, fruit.y, fruit.vx, fruit.vy, fruit.radius]) assert.ok(Number.isFinite(value));
    assert.ok(fruit.x >= 38 + fruit.radius - 0.05);
    assert.ok(fruit.x <= 322 - fruit.radius + 0.05);
    assert.ok(fruit.y < 500, 'jar floor must retain every fruit');
  }
  assert.equal(model.engine.world.bodies.length, snapshot.bodyCount + 3);
}

test('registers only its original named mode without replacing peers', () => {
  const peer = () => {};
  const context = vm.createContext({ Matter, AirvanaPhysicsModes: { peer } });
  vm.runInContext(source, context);
  assert.equal(context.AirvanaPhysicsModes.peer, peer);
  assert.equal(context.AirvanaPhysicsModes['fruit-drop'].title, '果冻果园');
  assert.equal(game().levelCount, 5);
});

test('real input releases a physical fruit that falls and settles on the jar floor', () => {
  const model = game();
  drop(model, 130);
  const start = model.snapshot();
  assert.equal(start.drops, 1);
  assert.equal(start.fruits[0].y, 174);
  step(model, 0.25);
  assert.ok(model.snapshot().fruits[0].y > start.fruits[0].y + 15);
  step(model, 3);
  const fruit = model.snapshot().fruits[0];
  assert.ok(Math.abs(fruit.y + fruit.radius - 454) < 1);
  assert.ok(Math.abs(fruit.vy) < 0.05);
  assert.equal(model.status, 'playing');
  safeBodies(model);
});

test('matching collision merges once, awards points and completes the first goal through three real drops', () => {
  const model = game({ random: seeded(123) });
  drop(model);
  step(model, 2.5);
  drop(model);
  step(model, 2.5);
  assert.equal(model.snapshot().bodyCount, 1);
  assert.equal(model.snapshot().highestRank, 2);
  assert.equal(model.snapshot().merges, 1);
  assert.equal(model.score, 20);
  assert.equal(model.status, 'playing');
  drop(model);
  step(model, 2.5);
  assert.equal(model.status, 'success');
  assert.equal(model.snapshot().merges, 2);
  assert.equal(model.snapshot().highestRank, 3);
  assert.equal(model.score, 60);
  safeBodies(model);
});

test('unlike fruits collide and stack instead of merging or passing through each other', () => {
  const model = game({ level: 2 });
  drop(model, 100);
  step(model, 2);
  drop(model, 255);
  step(model, 2);
  drop(model, 100);
  step(model, 2);
  assert.equal(model.snapshot().merges, 0);
  assert.equal(model.snapshot().bodyCount, 3);
  const bodies = model.snapshot().fruits;
  for (let i = 0; i < bodies.length; i += 1) {
    for (let j = i + 1; j < bodies.length; j += 1) {
      const distance = Math.hypot(bodies[i].x - bodies[j].x, bodies[i].y - bodies[j].y);
      assert.ok(distance > bodies[i].radius + bodies[j].radius - 1.5);
    }
  }
  safeBodies(model);
});

test('all five progressively harder goals are reachable using only pointer input and physics steps', () => {
  const totals = [];
  for (let level = 1; level <= 5; level += 1) {
    const model = game({ level, random: seeded(123) });
    assert.equal(model.snapshot().targetRank, level + 2);
    let count = 0;
    while (model.status === 'playing' && count < 140) {
      drop(model, 180);
      step(model, 100 / 60);
      safeBodies(model);
      count += 1;
    }
    assert.equal(model.status, 'success', `level ${level} must have a genuine winning path`);
    assert.equal(model.snapshot().highestRank, level + 2);
    assert.ok(model.score > 0);
    totals.push(count);
  }
  for (let i = 1; i < totals.length; i += 1) assert.ok(totals[i] > totals[i - 1]);
});

test('bad physical stacking crosses the danger line and causes real failure after the grace interval', () => {
  const model = game({ level: 5, random: seeded(4) });
  let sawGrace = false;
  for (let count = 0; count < 100 && model.status === 'playing'; count += 1) {
    const snapshot = model.snapshot();
    const unlike = snapshot.fruits.filter((fruit) => fruit.rank !== snapshot.currentRank)
      .sort((a, b) => a.y - a.radius - (b.y - b.radius));
    // A deliberately poor but entirely legal strategy: pile onto the highest unlike fruit.
    drop(model, unlike.length ? unlike[0].x : 90);
    for (let tick = 0; tick < 180 && model.status === 'playing'; tick += 1) {
      model.update(1 / 60);
      const danger = model.snapshot().danger;
      if (danger > 0 && danger < 1) sawGrace = true;
    }
    safeBodies(model);
  }
  assert.equal(model.status, 'failure');
  assert.equal(model.snapshot().danger, 1);
  assert.ok(sawGrace, 'danger must warn before ending the game');
  assert.ok(model.snapshot().highestRank < model.snapshot().targetRank);
});

test('drop cooldown, cancel, and pointer leaving the game prevent accidental extra spawns', () => {
  const model = game();
  drop(model);
  for (let i = 0; i < 100; i += 1) drop(model);
  assert.equal(model.snapshot().drops, 1);
  assert.equal(model.actions()[1].disabled, true);
  step(model, 0.6);
  assert.equal(model.actions()[1].disabled, false);
  model.pointerDown({ x: 140, y: 200 });
  model.cancelPointer();
  model.pointerUp({ x: 140, y: 200 });
  model.pointerDown({ x: 140, y: 200 });
  model.pointerUp({ x: 140, y: 510 });
  assert.equal(model.snapshot().drops, 1);
  safeBodies(model);
});

test('invalid coordinates and clock inputs cannot spawn fruit, poison the simulation, or advance time', () => {
  const model = game({ level: NaN, random: () => NaN });
  const initial = JSON.stringify(model.snapshot());
  for (const value of [NaN, Infinity, -Infinity, undefined, null, '100']) {
    model.pointerDown({ x: value, y: 200 });
    model.pointerUp({ x: value, y: 200 });
    model.update(value);
  }
  model.update(-1);
  model.update(0);
  model.pointerDown(undefined);
  model.pointerUp(undefined);
  assert.equal(JSON.stringify(model.snapshot()), initial);
  assert.equal(model.perform('not-an-action'), false);
  drop(model);
  model.update(100000);
  safeBodies(model);
  assert.ok(model.elapsed <= 0.101, 'long gaps must use a bounded step budget');
});

test('keyboard and accessible actions move the aim and release fruit while respecting jar bounds', () => {
  const model = game();
  for (let i = 0; i < 30; i += 1) model.key('ArrowLeft');
  assert.ok(model.snapshot().aimX >= 51);
  model.key('Enter');
  step(model, 0.6);
  for (let i = 0; i < 30; i += 1) model.perform('right');
  assert.ok(model.snapshot().aimX <= 309);
  model.key(' ');
  step(model, 3);
  assert.equal(model.snapshot().drops, 2);
  safeBodies(model);
});

test('finished games are stable and a new instance cleanly retries without shared progress', () => {
  const model = game();
  for (let i = 0; i < 3; i += 1) { drop(model); step(model, 3); }
  const won = JSON.stringify(model.snapshot());
  model.perform('left');
  model.perform('drop');
  drop(model, 250);
  model.update(10);
  assert.equal(JSON.stringify(model.snapshot()), won);
  const retry = game();
  assert.equal(retry.status, 'playing');
  assert.equal(retry.score, 0);
  assert.equal(retry.snapshot().bodyCount, 0);
});

test('full original fruit scene draws with no external asset, timer, or RAF dependencies', () => {
  let paths = 0;
  const gradient = { addColorStop() {} };
  const ctx = new Proxy({ globalAlpha: 1 }, {
    get(target, key) {
      if (key in target) return target[key];
      if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => gradient;
      if (key === 'beginPath') return () => { paths += 1; };
      return () => {};
    },
    set(target, key, value) { target[key] = value; return true; }
  });
  for (let level = 1; level <= 5; level += 1) {
    const model = game({ level });
    model.draw(ctx);
    drop(model);
    step(model, 1);
    model.draw(ctx);
  }
  assert.ok(paths > 100);
  assert.doesNotMatch(source, /new\s+Image\s*\(|requestAnimationFrame\s*\(|setTimeout\s*\(|https?:\/\//);
});
