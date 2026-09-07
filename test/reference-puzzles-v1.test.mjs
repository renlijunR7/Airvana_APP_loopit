import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../public/reference-puzzles-v1.js', import.meta.url), 'utf8');
const sandbox = { console, Math, Number, JSON }; vm.createContext(sandbox); vm.runInContext(source, sandbox);
const modes = sandbox.AirvanaPhysicsModes;
const make = (key, level = 1) => new modes[key]({ level });
const snap = game => JSON.parse(JSON.stringify(game.snapshot()));
const tick = (game, seconds) => { for (let t = 0; t < seconds; t += .05) game.update(.05); };
const tap = (game, x, y) => { game.pointerDown({ x, y }); game.pointerUp({ x, y }); };
const tapCard = (game, id) => { const card = game.snapshot().cards.find(c => c.id === id); tap(game, card.x + card.w / 2, card.y + card.h / 2); };
const gemPoint = (game, col, row) => { const g = game.snapshot().geometry; return { x: g.x + (col + .5) * g.cell, y: g.y + (row + .5) * g.cell }; };
const gemTray = (game, piece) => { const g = game.snapshot().geometry; return { x: g.trayX + g.trayStride * piece + g.trayWidth / 2, y: g.trayY + g.trayHeight / 2 }; };
const put = (game, piece, col, row, drag = false) => {
  const tray = gemTray(game, piece), target = gemPoint(game, col, row);
  if (drag) { game.pointerDown(tray); game.pointerMove(target); game.pointerUp(target); }
  else { tap(game, tray.x, tray.y); tap(game, target.x, target.y); }
};
const gemSolutions = [[[0, 0, 0], [1, 2, 1], [2, 4, 2]], [[0, 2, 0], [1, 0, 2], [2, 3, 3]], [[0, 0, 0], [1, 2, 2], [2, 3, 4]]];

for (let level = 1; level <= 3; level += 1) {
  test(`gem blocks level ${level}: curated touch path clears its complete line goal`, () => {
    const game = make('gem-blocks', level); gemSolutions[level - 1].forEach((move, i) => put(game, ...move, i % 2 === 1));
    assert.equal(game.status, 'success'); assert.ok(game.lines >= game.target); assert.ok(game.score > 0); assert.equal(game.pieces.filter(p => p.used).length, 3);
  });
}
test('gem blocks validates fit; dropping outside and cancellation do not consume a piece', () => {
  const game = make('gem-blocks'); const board = JSON.stringify(game.board);
  put(game, 0, 2, 0); assert.equal(JSON.stringify(game.board), board); assert.equal(game.pieces[0].used, false);
  game.pointerDown(gemTray(game, 0)); game.pointerMove(gemPoint(game, 0, 0)); game.cancelPointer(); game.pointerUp(gemPoint(game, 0, 0)); assert.equal(JSON.stringify(game.board), board);
  game.pointerDown(gemTray(game, 0)); game.pointerMove({ x: -50, y: -50 }); game.pointerUp({ x: -50, y: -50 }); assert.equal(JSON.stringify(game.board), board);
});
test('gem blocks keyboard rotation is reversible and supports keyboard placement', () => {
  const game = make('gem-blocks'); game.key('1'); const cells = JSON.stringify(game.pieces[0].cells);
  for (let i = 0; i < 4; i += 1) game.perform('rotate'); assert.equal(JSON.stringify(game.pieces[0].cells), cells);
  game.key('Enter'); assert.equal(game.lines, 1); assert.equal(game.score, 120);
});
test('gem blocks misplaced pieces reach real budget failure and freeze', () => {
  const game = make('gem-blocks'); put(game, 0, 0, 3); put(game, 1, 0, 4); put(game, 2, 0, 5);
  assert.equal(game.status, 'failure'); assert.equal(game.lines, 0); assert.match(game.message, /用完/);
  const before = snap(game); game.perform('rotate'); game.key('1'); put(game, 0, 0, 0); tick(game, 1); assert.deepEqual(snap(game), before);
});
test('gem blocks real legal misplacements can strand the remaining square with no space', () => {
  const game = make('gem-blocks', 3); put(game, 0, 2, 2); put(game, 2, 2, 5);
  assert.equal(game.status, 'failure'); assert.equal(game.pieces[1].used, false); assert.equal(game.placements().length, 0); assert.match(game.message, /没有可放/);
});

const solitaireSolutions = [
  [0, 1, 2, 3, 4, 5, 6, 7],
  [0, 1, 2, 3, 4, 5, 6, 7, 'draw', 8, 9, 10, 11],
  [0, 1, 2, 3, 4, 5, 6, 7, 'draw', 8, 9, 10, 11, 'draw', 12, 13, 14, 15]
];
for (let level = 1; level <= 3; level += 1) {
  test(`cloud solitaire level ${level}: complete legal touch sequence clears layered cards`, () => {
    const game = make('cloud-solitaire', level);
    solitaireSolutions[level - 1].forEach(move => {
      assert.equal(game.status, 'playing');
      if (move === 'draw') tap(game, 107, 423); else { assert.ok(game.snapshot().available.includes(move), `${move} not playable over ${game.foundation}`); tapCard(game, move); }
    });
    assert.equal(game.status, 'success'); assert.ok(game.cards.every(c => c.removed)); assert.ok(game.score > 0);
  });
}
test('cloud solitaire blocked cards and rank mismatch leave state and undo stack intact', () => {
  const game = make('cloud-solitaire'); assert.equal(game.play(4), false); assert.equal(game.play(2), false); assert.equal(game.history.length, 0); assert.equal(game.score, 0); assert.ok(game.cards.every(c => !c.removed));
  const card = game.cards[0]; game.pointerDown({ x: card.x + 30, y: card.y + 60 }); game.cancelPointer(); game.pointerUp({ x: card.x + 30, y: card.y + 60 }); assert.equal(game.cards[0].removed, false);
});
test('cloud solitaire undo reverses only the latest action and is bounded', () => {
  const game = make('cloud-solitaire');
  for (let i = 0; i < 3; i += 1) { tapCard(game, 0); assert.equal(game.foundation, 6); game.perform('undo'); assert.equal(game.foundation, 5); assert.equal(game.score, 0); assert.equal(game.cards[0].removed, false); }
  tapCard(game, 0); game.perform('undo'); assert.equal(game.foundation, 6); assert.equal(game.undoLeft, 0);
});
test('cloud solitaire K and A are adjacent and drawing resets streak', () => {
  const game = make('cloud-solitaire', 2); [0, 1, 2, 3, 4].forEach(id => tapCard(game, id)); assert.equal(game.foundation, 13);
  tapCard(game, 5); assert.equal(game.foundation, 1); assert.equal(game.streak, 6); game.perform('draw'); assert.equal(game.streak, 0); game.perform('undo'); assert.equal(game.foundation, 1); assert.equal(game.streak, 6);
});
test('cloud solitaire real stock exhaustion with no legal rank triggers failure', () => {
  const game = make('cloud-solitaire'); game.perform('draw'); game.perform('draw'); game.perform('draw'); assert.equal(game.status, 'failure'); assert.equal(game.available().length, 0); assert.equal(game.stock.length, 0);
  const before = snap(game); game.perform('undo'); game.perform('draw'); game.key('1'); tapCard(game, 0); tick(game, 1); assert.deepEqual(snap(game), before);
});

for (let level = 1; level <= 3; level += 1) {
  test(`buddy flip level ${level}: touch pairs complete collection and bonus scoring`, () => {
    const game = make('buddy-flip', level); tick(game, 2);
    for (let buddy = 0; buddy < game.pairCount; buddy += 1) {
      const pair = game.snapshot().cards.filter(c => c.buddy === buddy); tapCard(game, pair[0].id); tapCard(game, pair[1].id); assert.equal(game.open.length, 2); tick(game, .9);
    }
    assert.equal(game.status, 'success'); assert.equal(game.matched, game.pairCount); assert.ok(game.cards.every(c => c.matched)); assert.ok(game.score >= game.pairCount * 100);
  });
}
test('buddy flip preview rejects premature input and cancellation does not reveal a card', () => {
  const game = make('buddy-flip'); tapCard(game, 0); assert.equal(game.open.length, 0); tick(game, 2);
  const card = game.cards[0]; game.pointerDown({ x: card.x + 20, y: card.y + 30 }); game.cancelPointer(); game.pointerUp({ x: card.x + 20, y: card.y + 30 }); assert.equal(game.open.length, 0);
});
test('buddy flip mismatch displays both cards, locks input, then hides them', () => {
  const game = make('buddy-flip'); tick(game, 2); const other = game.cards.find(c => c.buddy !== game.cards[0].buddy);
  tapCard(game, 0); tapCard(game, other.id); assert.equal(game.movesLeft, 6); assert.equal(game.open.length, 2); tapCard(game, 2); assert.equal(game.open.length, 2);
  tick(game, .4); assert.equal(game.open.length, 2); tick(game, .6); assert.equal(game.open.length, 0); assert.equal(game.matched, 0); assert.equal(game.score, 0); assert.equal(game.cards[0].face, 0);
});
test('buddy flip matching the same tile twice never counts as a pair', () => {
  const game = make('buddy-flip'); tick(game, 2); tapCard(game, 0); tapCard(game, 0); assert.equal(game.open.length, 1); assert.equal(game.movesLeft, 7);
});
test('buddy flip glimpse is limited and preserves the open card', () => {
  const game = make('buddy-flip'); tick(game, 2); tapCard(game, 0); game.perform('peek'); assert.equal(game.hintsLeft, 0); tick(game, 1.5); assert.deepEqual(Array.from(game.open), [0]); game.perform('peek'); assert.equal(game.peek, 0);
});
for (let level = 1; level <= 3; level += 1) {
  test(`buddy flip level ${level}: repeated legitimate mismatches exhaust moves and freeze`, () => {
    const game = make('buddy-flip', level); tick(game, 2); const other = game.cards.find(c => c.buddy !== game.cards[0].buddy);
    for (let i = game.movesLeft; i > 0; i -= 1) { tapCard(game, 0); tapCard(game, other.id); tick(game, .9); }
    assert.equal(game.status, 'failure'); assert.equal(game.movesLeft, 0); const before = snap(game); tapCard(game, 0); game.perform('peek'); game.key('Enter'); tick(game, 1); assert.deepEqual(snap(game), before);
  });
}
test('all puzzle modes draw finite Canvas geometry at all levels without external resources', () => {
  const calls = []; const g = { addColorStop() {} };
  const ctx = new Proxy({}, { get(target, key) { if (key in target) return target[key]; if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => g; if (key === 'measureText') return value => ({ width: String(value).length * 6 }); return (...args) => { args.forEach(value => { if (typeof value === 'number') assert.ok(Number.isFinite(value), key + ' received non-finite coordinate'); }); calls.push(key); }; }, set(target, key, value) { target[key] = value; return true; } });
  for (const key of Object.keys(modes)) for (let level = 1; level <= 3; level += 1) {
    const game = make(key, level); game.draw(ctx); tick(game, 2); game.draw(ctx); assert.equal(game.levelCount, 3); assert.ok(game.actions().length <= 3);
    if (key === 'gem-blocks') { const g = game.snapshot().geometry; assert.ok(g.cell * 346 / 360 >= 44); assert.ok(g.cell * 486 / 560 >= 44); assert.ok(g.trayHeight * 486 / 560 >= 44); assert.ok(g.y + g.cell * g.size < g.trayY); assert.ok(g.trayY + g.trayHeight <= 488); }
  }
  assert.ok(calls.length > 1000); assert.doesNotMatch(source, /fetch\(|XMLHttpRequest|setTimeout\(|requestAnimationFrame\(|new Image/);
});
test('all puzzle models clamp levels and reject non-finite time without state damage', () => {
  for (const key of Object.keys(modes)) { assert.equal(make(key, -5).level, 1); assert.equal(make(key, 999).level, 3); const game = make(key); const before = snap(game); [NaN, Infinity, -1].forEach(dt => game.update(dt)); assert.deepEqual(snap(game), before); }
});
