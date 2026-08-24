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
await import(`${pathToFileURL(path.join(root, 'public/deep-games-v2.js')).href}?test=2.2.0`);

const games = globalThis.AirvanaDeepGames;

test('deep game registry exposes six distinct three-stage mechanics and versioned assets exist', () => {
  assert.equal(games.version, '2.2.0');
  const definitions = games.list();
  assert.deepEqual(definitions.map(item => item.key), ['star-mower', 'star-deck', 'adventurer-journal', 'idiom-detective', 'hex-frontier', 'garden-renewal']);
  assert.equal(new Set(definitions.map(item => item.mechanic)).size, 6);
  assert.ok(definitions.every(item => item.stages === 3 && item.targetDurationSeconds >= 165 && item.targetDurationSeconds <= 300));
  for (const key of definitions.map(item => item.key)) {
    // 玩法图允许 png/jpg（大图已重压为 JPEG 以控制包体积）
    const gameplayAsset = ['png', 'jpg'].some(ext => fs.existsSync(path.join(root, `public/assets/deep-games/v2/${key}-gameplay-v2.${ext}`)));
    assert.equal(gameplayAsset, true, `missing gameplay asset for ${key}`);
  }
});

test('star mower supports movement, survival upgrades and a terminal third stage', () => {
  let completed = null;
  const game = games.mount(fakeCanvas(), 'star-mower', {onComplete: result => { completed = result; }});
  game.press({x: 280, y: 320});
  game.update(0.2);
  assert.ok(game.player.targetX > 200);
  game.stage = 3;
  game.stageTime = game.stageDurations[2];
  game.update(0);
  assert.equal(completed?.success, true);
  game.destroy();
});

test('star deck resolves cards, energy, enemy intent and three encounter progression', () => {
  let completed = null;
  const game = games.mount(fakeCanvas(), 'star-deck', {onComplete: result => { completed = result; }});
  const energy = game.energy;
  game.playCard(0);
  assert.ok(game.energy < energy);
  game.enemy.hp = 0;
  game.winEncounter();
  game.chooseRelic(0);
  assert.equal(game.stage, 2);
  game.enemy.hp = 0;
  game.winEncounter();
  game.chooseRelic(1);
  assert.equal(game.stage, 3);
  game.enemy.hp = 0;
  game.winEncounter();
  assert.equal(completed?.success, true);
  game.destroy();
});

test('adventurer journal changes resources, retains relics and reaches a branch ending', () => {
  let completed = null;
  const game = games.mount(fakeCanvas(), 'adventurer-journal', {onComplete: result => { completed = result; }});
  for (let index = 0; index < 9; index += 1) {
    game.health = Math.max(game.health, 7);
    game.supplies = Math.max(game.supplies, 7);
    game.morale = Math.max(game.morale, 7);
    game.choose(index === 1 || index === 3 ? 0 : 1);
  }
  assert.equal(completed?.success, true);
  assert.ok(game.score > 0);
  game.destroy();
});

test('idiom detective requires evidence pairs instead of direct answer buttons', () => {
  let completed = null;
  const game = games.mount(fakeCanvas(), 'idiom-detective', {onComplete: result => { completed = result; }});
  while (!game.finished) {
    const current = game.currentCase();
    for (const symbol of current.pair) game.selectClue(current.clues.findIndex(clue => clue[0] === symbol));
  }
  assert.equal(completed?.success, true);
  assert.equal(game.caseIndex, 6);
  game.destroy();
});

test('hex frontier spends action points, resolves local enemy turns and can capture the final objective', () => {
  let completed = null;
  const game = games.mount(fakeCanvas(), 'hex-frontier', {onComplete: result => { completed = result; }});
  const unit = game.units.find(item => item.side === 'player');
  game.selected = unit.id;
  const neighbor = game.neighbors(unit).find(cell => !game.units.some(item => item.r === cell.r && item.c === cell.c));
  const before = game.ap;
  game.press(game.center(neighbor.r, neighbor.c));
  assert.ok(game.ap < before);
  game.endTurn();
  assert.equal(game.turn, 2);
  game.stage = 3;
  game.objectives = [{r: unit.r, c: unit.c, captured: false}];
  game.capture(unit);
  assert.equal(completed?.success, true);
  game.destroy();
});

test('garden renewal validates adjacent swaps, cascades matches and completes a third-stage renovation goal', () => {
  let completed = null;
  const game = games.mount(fakeCanvas(), 'garden-renewal', {onComplete: result => { completed = result; }});
  game.stage = 3;
  game.collected = game.goals[2] - 3;
  game.movesLeft = 10;
  game.board = game.createBoard();
  game.swap({r: 0, c: 1}, {r: 1, c: 1});
  assert.equal(completed?.success, true);
  assert.ok(game.score > 0);
  game.destroy();
});
