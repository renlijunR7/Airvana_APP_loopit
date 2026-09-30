import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function fakeContext() {
  return {
    setTransform() {}, clearRect() {}, fillRect() {}, drawImage() {}, beginPath() {}, moveTo() {}, arcTo() {}, closePath() {}, fill() {}, stroke() {}, save() {}, restore() {}, fillText() {}, arc() {}, lineTo() {},
    createLinearGradient() { return {addColorStop() {}}; }
  };
}

function fakeCanvas() {
  const listeners = new Map();
  return {
    listeners,
    width: 360,
    height: 560,
    style: {},
    getContext: () => fakeContext(),
    addEventListener(name, handler) { listeners.set(name, handler); },
    removeEventListener(name) { listeners.delete(name); },
    getBoundingClientRect: () => ({left: 0, top: 0, width: 360, height: 560}),
    focus() {},
    setPointerCapture() {}
  };
}

globalThis.window = globalThis;
globalThis.devicePixelRatio = 1;
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = () => {};
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
await import(`${pathToFileURL(path.join(root, 'public/deep-games-v2.js')).href}?test=3.2.0`);

const games = globalThis.AirvanaDeepGames;
globalThis.AirvanaPlayableAssetsV3 = {
  load: async () => {}, ready: () => true,
  draw(context, key, rect) { (context.assetDraws ||= []).push({key, ...rect}); return true; }
};

test('deep game registry exposes six distinct three-stage mechanics and versioned assets exist', () => {
  assert.equal(games.version, '3.2.0');
  const definitions = games.list();
  assert.deepEqual(definitions.map(item => item.key), ['star-mower', 'star-deck', 'adventurer-journal', 'idiom-detective', 'hex-frontier', 'garden-renewal']);
  assert.equal(new Set(definitions.map(item => item.mechanic)).size, 6);
  assert.ok(definitions.every(item => item.stages === 3 && item.targetDurationSeconds >= 165 && item.targetDurationSeconds <= 300));
  assert.ok(definitions.every(item => item.assetPack === 'classic-v1'));
  assert.ok(definitions.every(item => item.gameplayStates.join('>') === 'intro>playing>paused>success>failure>retry'));
  for (const key of definitions.map(item => item.key)) {
    const gameplayAsset = fs.existsSync(path.join(root, `public/assets/games/classic-v1/scenes/${key}.svg`));
    assert.equal(gameplayAsset, true, `missing gameplay asset for ${key}`);
  }
});

test('every deep game exposes the full local gameplay state contract', () => {
  for (const definition of games.list()) {
    const game = games.mount(fakeCanvas(), definition.key, {muted: true, reducedMotion: true});
    const inspection = game.inspect();
    assert.equal(inspection.gameKey, definition.key);
    assert.equal(inspection.stages, 3);
    assert.equal(Array.from(inspection.gameplayStates).join('>'), 'intro>playing>paused>success>failure>retry');
    assert.equal(game.togglePause(), true);
    assert.equal(game.togglePause(), false);
    game.destroy();
  }
});


function mount(key) {
  const events = [], completions = [];
  const game = games.mount(fakeCanvas(), key, {muted: true, reducedMotion: true, onEvent: (name, properties) => events.push({name, ...properties}), onComplete: result => completions.push(result)});
  return {game, events, completions};
}
function tap(game, x, y) {
  const event = {clientX: x, clientY: y, pointerId: 1, preventDefault() {}};
  game.canvas.listeners.get('pointerdown')?.(event);
  game.canvas.listeners.get('pointerup')?.(event);
}
function key(game, value) { game.canvas.listeners.get('keydown')?.({key: value, preventDefault() {}}); }
function seeded(seed, callback) {
  const previous = Math.random;
  let state = seed >>> 0;
  Math.random = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
  try { return callback(); } finally { Math.random = previous; }
}
function assertWon(run) {
  assert.equal(run.completions.length, 1);
  assert.equal(run.completions[0].success, true);
  assert.equal(run.game.stage, 3);
  assert.deepEqual(run.events.filter(event => event.name === 'level_start').map(event => event.stage), [1, 2, 3]);
  assert.ok(run.events.some(event => event.name === 'valid_interaction'));
}
test('real sprites are attached to state objects, card slots, units, and all 49 garden tiles', () => {
  for (const definition of games.list()) {
    const {game} = mount(definition.key);
    if (definition.key === 'star-mower') game.update(.04);
    game.draw();
    const calls = game.context.assetDraws;
    assert.ok(calls.length > 1, definition.key);
    assert.ok(calls.every(call => typeof call.key === 'string' && Number.isFinite(call.x) && call.w > 0 && call.h > 0));
    assert.equal(game.inspect().gameplayAssetPack, 'classic-v1');
    assert.equal(game.inspect().gameplayAssetsReady, true);
    if (definition.key === 'star-mower') {
      const mower = calls.find(call => call.key === 'mower');
      assert.equal(mower.x + mower.w / 2, game.player.x);
      assert.ok(calls.some(call => call.key === 'spore'));
    }
    if (definition.key === 'star-deck') {
      assert.ok(calls.some(call => call.key === game.enemy.sprite));
      assert.ok(calls.some(call => call.key === 'hero'));
      assert.equal(calls.filter(call => call.y === 423).length, game.hand.length);
    }
    if (definition.key === 'garden-renewal') assert.equal(calls.filter(call => call.w === 36 && call.h === 36).length, 49);
    if (definition.key === 'hex-frontier') assert.equal(calls.filter(call => call.w === 44 && call.h === 49).length, game.units.length);
    game.destroy();
  }
});
test('pause blocks gameplay keys and Enter resumes without consuming an action', () => {
  for (const definition of games.list()) {
    const {game} = mount(definition.key);
    const state = () => JSON.stringify({score: game.score, stage: game.stage, hp: game.heroHp, energy: game.energy, ap: game.ap, step: game.step, moves: game.movesLeft, selected: game.selected});
    key(game, 'p');
    const before = state();
    key(game, '1'); key(game, 'ArrowRight');
    assert.equal(state(), before, definition.key);
    key(game, 'Enter');
    assert.equal(game.paused, false);
    assert.equal(state(), before, definition.key);
    game.destroy();
  }
});
test('mower movement and upgrade clicks survive all three timed waves without modifying health or stages', () => seeded(57, () => {
  const run = mount('star-mower'), game = run.game;
  const waypoints = [{x: 36, y: 102}, {x: 324, y: 102}, {x: 324, y: 520}, {x: 36, y: 520}];
  let waypoint = 0;
  for (let step = 1; step < 4800 && !game.finished; step += 1) {
    if (game.upgradeChoices) { tap(game, 288, 300); waypoint = 0; }
    const target = waypoints[waypoint];
    if (Math.hypot(game.player.x - target.x, game.player.y - target.y) < 25) waypoint = (waypoint + 1) % waypoints.length;
    tap(game, waypoints[waypoint].x, waypoints[waypoint].y);
    game.frame(step * 40);
  }
  assertWon(run);
  assert.equal(run.events.filter(event => event.interaction_type === 'upgrade_choice').length, 2);
  assert.ok(game.kills > 0);
  game.destroy();
}));
test('idle mower loses through enemy contact and a new mounted session resets its state', () => seeded(81, () => {
  const run = mount('star-mower');
  for (let step = 1; step < 4500 && !run.game.finished; step += 1) {
    if (run.game.upgradeChoices) tap(run.game, 178, 300);
    run.game.frame(step * 40);
  }
  assert.equal(run.completions[0]?.success, false);
  const fresh = mount('star-mower');
  assert.equal(fresh.game.stage, 1);
  assert.equal(fresh.game.player.hp, 100);
  run.game.destroy(); fresh.game.destroy();
}));
test('illustrated card clicks beat three enemies, spend energy, block damage and resolve only one turn per Enter', () => {
  const run = mount('star-deck'), game = run.game;
  for (let turn = 0; turn < 40 && !game.finished; turn += 1) {
    if (game.transition) { tap(game, 286, 302); continue; }
    for (const id of game.energy >= 4 ? ['guard', 'lance', 'strike'] : ['lance', 'strike']) {
      if (game.transition || game.finished) break;
      const index = game.hand.findIndex(card => card.id === id && card.cost <= game.energy);
      if (index >= 0) tap(game, 42 + index * 69, 466);
    }
    if (!game.transition && !game.finished) {
      const before = game.turn;
      key(game, 'Enter');
      assert.equal(game.turn, before + 1);
    }
  }
  assertWon(run);
  assert.ok(run.events.some(event => event.interaction_type === 'end_turn' && event.damage === 0));
  assert.ok(game.effects.some(effect => effect.sprite));
  const score = game.score;
  tap(game, 42, 466); key(game, 'Enter');
  assert.equal(game.score, score);
  assert.equal(run.completions.length, 1);
  game.destroy();
});
test('card battle loses by repeatedly passing without defense', () => {
  const run = mount('star-deck');
  for (let turn = 0; turn < 20 && !run.game.finished; turn += 1) tap(run.game, 294, 349);
  assert.equal(run.completions[0]?.success, false);
  run.game.destroy();
});
test('nine journal choice clicks carry resources and acquired objects into the hidden ending', () => {
  const run = mount('adventurer-journal');
  for (const choice of [0, 0, 0, 0, 0, 1, 0, 1, 0]) tap(run.game, choice ? 264 : 95, 408);
  assertWon(run);
  assert.match(run.completions[0].summary, /隐藏结局/);
  assert.deepEqual(run.game.relics, ['古道地图', '星纹拓片']);
  assert.equal(run.events.filter(event => event.interaction_type === 'route_choice').length, 9);
  run.game.destroy();
});
test('journal blocks absent required objects and excessive resource spending causes a loss', () => {
  const missing = mount('adventurer-journal');
  for (const choice of [1, 1, 1, 1, 1, 1]) tap(missing.game, choice ? 264 : 95, 408);
  assert.equal(missing.game.stage, 3);
  tap(missing.game, 95, 408);
  assert.equal(missing.game.step, 0);
  assert.ok(missing.game.effects.some(effect => /需要星纹拓片/.test(effect.label)));
  tap(missing.game, 264, 408);
  assert.equal(missing.game.step, 1);
  const lost = mount('adventurer-journal');
  for (const choice of [0, 0, 0, 0, 0, 0]) tap(lost.game, choice ? 264 : 95, 408);
  assert.equal(lost.completions[0]?.success, false);
  assert.equal(lost.game.supplies, 0);
  missing.game.destroy(); lost.game.destroy();
});
function chooseEvidence(game, index) { tap(game, 70 + index % 3 * 110, 369 + Math.floor(index / 3) * 82); }
test('six physical evidence pairs complete three phases through clue-card clicks', () => {
  const run = mount('idiom-detective');
  while (!run.game.finished) {
    const current = run.game.currentCase();
    for (const symbol of current.pair) chooseEvidence(run.game, current.clues.findIndex(clue => clue[0] === symbol));
  }
  assertWon(run);
  assert.equal(run.game.caseIndex, 6);
  assert.equal(run.events.filter(event => event.interaction_type === 'evidence_select').length, 12);
  assert.doesNotThrow(() => run.game.draw());
  run.game.destroy();
});
test('evidence can be deselected and wrong pairs consume all five insight points', () => {
  const run = mount('idiom-detective');
  chooseEvidence(run.game, 0); chooseEvidence(run.game, 0);
  assert.deepEqual(run.game.selected, []);
  for (let attempt = 0; attempt < 5; attempt += 1) { chooseEvidence(run.game, 1); chooseEvidence(run.game, 3); }
  assert.equal(run.completions[0]?.success, false);
  assert.equal(run.game.insight, 0);
  run.game.destroy();
});
function shortestHexPath(game, unit, goal) {
  const pending = [{r: unit.r, c: unit.c, cost: 0, path: []}], costs = new Map();
  while (pending.length) {
    pending.sort((a, b) => a.cost - b.cost);
    const item = pending.shift(), id = item.r + ',' + item.c;
    if ((costs.get(id) ?? Infinity) <= item.cost) continue;
    costs.set(id, item.cost);
    if (item.r === goal.r && item.c === goal.c) return item;
    for (const next of game.neighbors(item)) {
      if (game.units.some(other => other.id !== unit.id && other.r === next.r && other.c === next.c)) continue;
      pending.push({...next, cost: item.cost + game.terrainCost(next), path: [...item.path, next]});
    }
  }
  return null;
}
test('hex selection, attack, movement and capture clicks win all three maps without state shortcuts', () => {
  const run = mount('hex-frontier'), game = run.game;
  for (let action = 0; action < 450 && !game.finished; action += 1) {
    const players = game.units.filter(unit => unit.side === 'player');
    const attacks = players.flatMap(unit => game.units.filter(enemy => enemy.side === 'enemy' && game.neighbors(unit).some(cell => cell.r === enemy.r && cell.c === enemy.c)).map(enemy => ({unit, enemy})));
    attacks.sort((a, b) => b.unit.attack - a.unit.attack || a.enemy.hp - b.enemy.hp);
    if (game.ap > 0 && attacks.length) {
      const from = game.center(attacks[0].unit.r, attacks[0].unit.c), to = game.center(attacks[0].enemy.r, attacks[0].enemy.c);
      tap(game, from.x, from.y); tap(game, to.x, to.y);
      continue;
    }
    const routes = players.flatMap(unit => game.objectives.filter(goal => !goal.captured).map(goal => ({unit, route: shortestHexPath(game, unit, goal)}))).filter(item => item.route?.path.length);
    routes.sort((a, b) => a.route.cost - b.route.cost);
    const move = routes.find(item => game.terrainCost(item.route.path[0]) <= game.ap);
    if (move) {
      const from = game.center(move.unit.r, move.unit.c), to = game.center(move.route.path[0].r, move.route.path[0].c);
      tap(game, from.x, from.y); tap(game, to.x, to.y);
    } else key(game, 'Enter');
  }
  assertWon(run);
  assert.ok(run.events.filter(event => event.interaction_type === 'hex_action').length > 10);
  game.destroy();
});
test('hex passes move enemies and eventually lose without manipulating unit health', () => {
  const run = mount('hex-frontier'), initial = {...run.game.units.find(unit => unit.side === 'enemy')};
  key(run.game, 'Enter');
  const moved = run.game.units.find(unit => unit.id === initial.id);
  assert.notDeepEqual([moved.r, moved.c], [initial.r, initial.c]);
  for (let turn = 0; turn < 20 && !run.game.finished; turn += 1) key(run.game, 'Enter');
  assert.equal(run.completions[0]?.success, false);
  run.game.destroy();
});
function swapTiles(game, move) {
  tap(game, 43 + move.a.c * 45, 214 + move.a.r * 45);
  tap(game, 43 + move.b.c * 45, 214 + move.b.r * 45);
}
test('stable garden boards allow target-driven adjacent swaps to win three restorations', () => seeded(19, () => {
  const run = mount('garden-renewal'), game = run.game;
  for (let move = 0; move < 100 && !game.finished; move += 1) {
    assert.equal(game.findMatches().length, 0);
    const choices = game.findValidMoves().sort((a, b) => b.targets - a.targets || b.matches - a.matches);
    assert.ok(choices.length > 0);
    swapTiles(game, choices[0]);
  }
  assertWon(run);
  assert.ok(run.events.some(event => event.interaction_type === 'match_swap' && event.cascade > 1));
  game.destroy();
}));
test('garden invalid swaps restore tiles and non-target play exhausts the actual move budget', () => seeded(4, () => {
  const run = mount('garden-renewal'), game = run.game, board = JSON.stringify(game.board);
  assert.equal(game.swap({r: 0, c: 0}, {r: 6, c: 6}), false);
  assert.equal(JSON.stringify(game.board), board);
  let invalid;
  for (let r = 0; r < 7 && !invalid; r += 1) for (let c = 0; c < 6 && !invalid; c += 1) {
    const before = game.movesLeft, beforeBoard = JSON.stringify(game.board);
    swapTiles(game, {a: {r, c}, b: {r, c: c + 1}});
    if (game.movesLeft === before) { invalid = true; assert.equal(JSON.stringify(game.board), beforeBoard); }
  }
  assert.equal(invalid, true);
  for (let move = 0; move < 100 && !game.finished; move += 1) {
    const choices = game.findValidMoves().sort((a, b) => a.targets - b.targets || a.matches - b.matches);
    assert.ok(choices.length);
    swapTiles(game, choices[0]);
  }
  assert.equal(run.completions[0]?.success, false);
  assert.equal(game.movesLeft, 0);
  game.destroy();
}));
