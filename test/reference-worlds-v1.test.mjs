import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const sandbox = { console, Math, Set, Number, JSON };
vm.createContext(sandbox);
vm.runInContext(readFileSync(new URL('../public/reference-worlds-v1.js', import.meta.url), 'utf8'), sandbox);
const modes = sandbox.AirvanaPhysicsModes;
const keys = ['harvest-lane', 'pocket-city', 'dice-voyage'];
const plain = value => JSON.parse(JSON.stringify(value));
function tap(game, x, y) { game.pointerDown({ x, y }); game.pointerUp({ x, y }); }
function time(game, duration) { for (let t = 0; t < duration; t += .05) game.update(Math.min(.05, duration - t)); }
function chooseCity(game, type) { for (let i = 0; i < 4 && game.snapshot().buildings[game.selectedType].key !== type; i++) game.perform('cycle'); }
function buildCity(game, lot, type) {
  const p = game.snapshot().lots[lot]; tap(game, p.x, p.y); chooseCity(game, type);
  for (let i = 0; i < 10 && game.actions().find(a => a.id === 'build').disabled; i++) game.perform('advance');
  assert.equal(game.perform('build'), true);
}
function solveFarm(game) {
  for (let cycle = 0; cycle < 30 && game.status === 'playing'; cycle++) {
    if (game.canDeliver()) { game.perform('deliver'); continue; }
    let state = game.snapshot();
    for (const p of state.plots) if (p.crop !== null && p.growth >= 1) tap(game, p.x, p.y);
    state = game.snapshot();
    const growing = [0, 0, 0]; state.plots.forEach(p => { if (p.crop !== null) growing[p.crop]++; });
    for (const plot of state.plots.filter(p => p.crop === null)) {
      const cropIndex = state.order.findIndex((count, i) => count > state.inventory[i] + growing[i]);
      if (cropIndex !== -1) { game.perform(state.cropTypes[cropIndex].key); tap(game, plot.x, plot.y); growing[cropIndex]++; }
    }
    time(game, 6.1);
  }
}
function solveCity(game) {
  buildCity(game, 0, 'market'); buildCity(game, 1, 'home'); game.perform('upgrade'); buildCity(game, 2, 'lighthouse');
  if (game.status !== 'playing') return;
  buildCity(game, 3, 'park'); buildCity(game, 4, 'home');
  while (game.status === 'playing') {
    if (game.actions().find(a => a.id === 'upgrade').disabled) game.perform('advance'); else game.perform('upgrade');
  }
}
function solveVoyage(game) {
  for (let i = 0; i < 150 && game.status === 'playing'; i++) {
    const s = game.snapshot();
    if (s.moving) { time(game, 2); continue; }
    if (s.pendingChoice) { game.perform(s.wood < 4 ? 'choose-wood' : s.stone < 2 ? 'choose-stone' : s.supplies < 3 ? 'choose-food' : 'choose-wood'); continue; }
    if (s.landmarks < s.goalLandmarks && s.wood >= 4 && s.stone >= 2) game.perform('build');
    else if (s.supplies < 1) game.perform('rest');
    else if (s.landmarks < s.goalLandmarks && s.shells >= 2) game.perform('trade');
    else game.perform('roll');
  }
}

for (const level of [1, 2, 3]) {
  test(`farm level ${level}: actual planting, growth, harvest and all truck orders win`, () => {
    const game = new modes['harvest-lane']({ level }); solveFarm(game);
    assert.equal(game.status, 'success'); assert.equal(game.deliveries, game.orders.length); assert.ok(game.score > 500); assert.ok(game.time > 0);
  });
  test(`city level ${level}: income investment, housing and landmark strategy wins`, () => {
    const game = new modes['pocket-city']({ level }); solveCity(game);
    assert.equal(game.status, 'success'); assert.ok(game.population >= game.goalPopulation); assert.equal(game.landmark, true); assert.ok(game.parks >= game.requiredParks); assert.ok(game.materials >= 0); assert.ok(game.day <= game.turnLimit);
  });
  test(`voyage level ${level}: route, supply choices and construction win through legal actions`, () => {
    const game = new modes['dice-voyage']({ level, random: () => 0 }); solveVoyage(game);
    assert.equal(game.status, 'success'); assert.equal(game.landmarks, game.goalLandmarks); assert.ok(game.visited.size >= game.goalVisits); assert.ok(game.turn < game.turnLimit);
  });
}

test('farm disallows early harvest, failed delivery, empty water and hidden free stock', () => {
  const game = new modes['harvest-lane'](); const p = game.plots[0];
  assert.equal(game.perform('deliver'), false); tap(game, p.x, p.y); assert.equal(game.water, 7); tap(game, p.x, p.y); assert.deepEqual(plain(game.inventory), [0, 0, 0]); assert.equal(game.water, 7);
  time(game, 4.1); tap(game, p.x, p.y); assert.deepEqual(plain(game.inventory), [1, 0, 0]);
  for (let i = 0; i < 7; i++) { tap(game, p.x, p.y); time(game, 4.1); tap(game, p.x, p.y); }
  assert.equal(game.water, 0); tap(game, p.x, p.y); assert.equal(p.crop, null); assert.equal(game.perform('deliver'), false);
});

test('farm time expiry is a real failure, not an automatic order completion', () => {
  const game = new modes['harvest-lane'](); time(game, 90); assert.equal(game.status, 'failure'); assert.equal(game.deliveries, 0);
});

test('city no-build strategy fails at its exact deadline and cannot get free population', () => {
  const game = new modes['pocket-city']({ level: 3 }); for (let i = 0; i < game.turnLimit; i++) game.perform('advance');
  assert.equal(game.status, 'failure'); assert.equal(game.day, game.turnLimit); assert.equal(game.population, 0); assert.equal(game.landmark, false);
});

test('city denies duplicate builds, unaffordable upgrades and duplicate lighthouse', () => {
  const game = new modes['pocket-city']({ level: 3 }); buildCity(game, 0, 'lighthouse');
  const before = game.snapshot(); assert.equal(game.perform('build'), false); assert.deepEqual(game.snapshot(), before);
  const next = game.lots[1]; tap(game, next.x, next.y); assert.equal(game.perform('build'), false);
  const first = game.lots[0]; tap(game, first.x, first.y); assert.equal(game.perform('upgrade'), false); assert.ok(game.materials < 46);
});

test('voyage roll animates, blocks double roll and awards only one landing', () => {
  const game = new modes['dice-voyage']({ random: () => .34 }); assert.equal(game.perform('roll'), true); assert.equal(game.die, 3); assert.equal(game.position, 0);
  assert.equal(game.perform('roll'), false); assert.equal(game.turn, 1); time(game, .2); assert.equal(game.position, 0); time(game, 2);
  assert.equal(game.position, 3); assert.equal(game.pendingChoice, true); assert.equal(game.score, 25); assert.equal(game.shells, 1);
  time(game, 10); assert.equal(game.score, 25); assert.equal(game.perform('choose-stone'), true); assert.equal(game.stone, 4); assert.equal(game.perform('choose-stone'), false);
});

test('voyage supply-rest choices spend turns; missing exploration loses by deadline', () => {
  const game = new modes['dice-voyage'](); for (let i = 0; i < game.turnLimit; i++) assert.equal(game.perform('rest'), true);
  assert.equal(game.status, 'failure'); assert.equal(game.visited.size, 1); assert.equal(game.landmarks, 0);
});

test('voyage final-turn market choice can resolve and cannot escape deadline', () => {
  const game = new modes['dice-voyage']({ random: () => .34 }); for (let i = 1; i < game.turnLimit; i++) game.perform('rest');
  game.perform('roll'); time(game, 2); assert.equal(game.status, 'playing'); assert.equal(game.pendingChoice, true); assert.equal(game.turn, game.turnLimit);
  game.perform('choose-stone'); assert.equal(game.status, 'failure'); assert.equal(game.pendingChoice, false);
});

test('voyage deterministic varied dice runs remain solvable with resource decisions', () => {
  for (let seed = 1; seed <= 10; seed++) {
    let value = seed; const random = () => ((value = (value * 1664525 + 1013904223) >>> 0) / 4294967296);
    const game = new modes['dice-voyage']({ level: 3, random }); solveVoyage(game);
    assert.equal(game.status, 'success', `seed ${seed}, state ${JSON.stringify(game.snapshot())}`);
  }
});

for (const key of keys) {
  test(`${key}: cancelled or moved pointer never commits a tap`, () => {
    const game = new modes[key](); const p = key === 'harvest-lane' ? { x: 66, y: 301 } : key === 'pocket-city' ? { x: 239, y: 263 } : { x: 180, y: 314 };
    const before = game.snapshot(); game.pointerDown(p); game.cancelPointer(); game.pointerUp(p); assert.deepEqual(game.snapshot(), before);
    game.pointerDown(p); game.pointerMove({ x: p.x + 30, y: p.y }); game.pointerUp(p); assert.deepEqual(game.snapshot(), before);
    game.pointerDown(p); game.pointerUp({ x: NaN, y: p.y }); assert.deepEqual(game.snapshot(), before);
  });
  test(`${key}: terminal state is immutable under every input and update`, () => {
    const game = new modes[key]({ random: () => 0 }); if (key === 'harvest-lane') solveFarm(game); else if (key === 'pocket-city') solveCity(game); else solveVoyage(game);
    assert.equal(game.status, 'success'); const before = game.snapshot();
    for (const a of game.actions()) game.perform(a.id); game.key('1'); tap(game, 180, 314); time(game, 100); game.cancelPointer();
    assert.deepEqual(game.snapshot(), before);
  });
  test(`${key}: invalid time, actions and bounds cannot corrupt game state`, () => {
    const game = new modes[key]({ level: 99 }); assert.equal(game.level, 3); const before = game.snapshot();
    game.update(NaN); game.update(Infinity); game.update(-1); game.perform('untrusted-action'); tap(game, -100, -100); game.key('not-a-key'); assert.deepEqual(game.snapshot(), before);
  });
  test(`${key}: complete original world renders with Canvas API without changing state`, () => {
    const game = new modes[key](); let calls = 0; const gradient = { addColorStop() {} };
    const ctx = new Proxy({}, { get(target, prop) { if (prop === 'createLinearGradient') return () => gradient; if (prop === 'measureText') return () => ({ width: 12 }); return target[prop] || (() => { calls++; }); }, set(target, prop, value) { target[prop] = value; return true; } });
    const before = game.snapshot(); game.draw(ctx); assert.ok(calls > 250); assert.deepEqual(game.snapshot(), before);
  });
}
