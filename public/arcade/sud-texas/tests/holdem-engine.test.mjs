import assert from 'node:assert/strict';
import test from 'node:test';

import { createDeck } from '../js/poker.js';
import {
  ACTIONS,
  HoldemGame,
  HoldemRuleError,
  PHASES,
  createHoldemGame,
} from '../js/holdem-engine.js';

function makePlayers(stacks, ready = true) {
  return stacks.map((stack, seat) => ({ id: `p${seat}`, name: `P${seat}`, seat, stack, ready }));
}

function makeGame(stacks, options = {}) {
  return new HoldemGame({
    smallBlind: 5,
    bigBlind: 10,
    seed: 'engine-test',
    buttonSeat: 0,
    players: makePlayers(stacks),
    ...options,
  });
}

function riggedDeck(front) {
  assert.equal(new Set(front).size, front.length, 'rigged cards must be unique');
  return [...front, ...createDeck().filter((card) => !front.includes(card))];
}

function player(state, id) {
  return state.players.find((candidate) => candidate.id === id);
}

function actionTypes(game, id = undefined) {
  return game.legalActions(id).actions.map((action) => action.type);
}

function assertRuleError(callback, code) {
  assert.throws(callback, (error) => error instanceof HoldemRuleError && error.code === code);
}

test('seat/ready API enforces table prerequisites and produces UI-safe snapshots', () => {
  const game = createHoldemGame({ smallBlind: 1, bigBlind: 2, seed: 'lobby' });
  game.sit({ id: 'hero', name: '陌北', seat: 0, stack: 100, ready: true });
  game.seatPlayer({ id: 'guest', seat: 4, chips: 80 });

  assert.equal(game.canStartHand(), false);
  assertRuleError(() => game.startHand(), 'NOT_ENOUGH_PLAYERS');
  game.setReady('guest', true);
  assert.equal(game.canStartHand(), true);

  const state = game.startHand();
  assert.equal(state.phase, PHASES.PREFLOP);
  assert.deepEqual(player(state, 'hero').holeCards, [null, null]);
  assert.equal(game.getState({ viewerId: 'hero' }).players[0].holeCards.every(Boolean), true);
  assert.equal(game.getState({ revealAll: true }).players.every((item) => item.holeCards.every(Boolean)), true);
  const hero = game.getState({ viewerId: 'hero' }).players[0];
  assert.deepEqual(hero.cards, hero.holeCards);
  assert.equal(hero.totalContribution, hero.totalBet);
  assert.equal(hero.lastAction.type, 'small-blind');
  assert.equal(game.state.phase, PHASES.PREFLOP);
  assertRuleError(() => game.stand('hero'), 'PLAYER_IN_HAND');
  assertRuleError(() => game.sit({ id: 'third', seat: 4, stack: 10 }), 'SEAT_TAKEN');
});

test('the same seed and seating produce the same deal without dependencies', () => {
  const first = makeGame([100, 100], { seed: 'repeatable' });
  const second = makeGame([100, 100], { seed: 'repeatable' });
  first.startHand();
  second.startHand();

  const firstState = first.getState({ revealAll: true });
  const secondState = second.getState({ revealAll: true });
  assert.deepEqual(firstState.players.map((item) => item.holeCards), secondState.players.map((item) => item.holeCards));
  assert.equal(firstState.handSeed, 'repeatable:1');
  assert.equal(firstState.deckRemaining, 48);
});

test('heads-up uses button as small blind and correct pre/post-flop action order', () => {
  const game = makeGame([100, 100]);
  let state = game.startHand();
  assert.equal(state.buttonSeat, 0);
  assert.equal(state.smallBlindSeat, 0);
  assert.equal(state.bigBlindSeat, 1);
  assert.equal(state.currentPlayerId, 'p0');
  assert.equal(player(state, 'p0').streetBet, 5);
  assert.equal(player(state, 'p1').streetBet, 10);
  assert.equal(game.legalActions().toCall, 5);

  game.act('p0', ACTIONS.CALL);
  assert.equal(game.getState().currentPlayerId, 'p1');
  state = game.act('p1', ACTIONS.CHECK);
  assert.equal(state.phase, PHASES.FLOP);
  assert.equal(state.board.length, 3);
  assert.equal(state.burnCount, 1);
  assert.equal(state.currentPlayerId, 'p1', 'big blind acts first post-flop heads-up');

  game.act('p1', 'check');
  state = game.act('p0', 'check');
  assert.equal(state.phase, PHASES.TURN);
  assert.equal(state.currentPlayerId, 'p1');
  game.act('p1', 'check');
  state = game.act('p0', 'check');
  assert.equal(state.phase, PHASES.RIVER);
  assert.equal(state.currentPlayerId, 'p1');
  game.act('p1', 'check');
  state = game.act('p0', 'check');
  assert.equal(state.phase, PHASES.COMPLETE);
  assert.equal(state.board.length, 5);
  assert.equal(state.burnCount, 3);
  assert.equal(state.result.reason, 'showdown');
});

test('multi-player blinds and action order wrap around occupied seats', () => {
  const game = new HoldemGame({
    smallBlind: 1,
    bigBlind: 2,
    buttonSeat: 0,
    players: [
      { id: 'button', seat: 0, stack: 50, ready: true },
      { id: 'small', seat: 3, stack: 50, ready: true },
      { id: 'big', seat: 7, stack: 50, ready: true },
    ],
  });
  let state = game.startHand();
  assert.equal(state.smallBlindSeat, 3);
  assert.equal(state.bigBlindSeat, 7);
  assert.equal(state.currentPlayerId, 'button');
  game.act('button', 'call');
  game.act('small', 'call');
  state = game.act('big', 'check');
  assert.equal(state.phase, PHASES.FLOP);
  assert.equal(state.currentPlayerId, 'small', 'first live seat left of button acts post-flop');
});

test('the table supports the full nine-player limit', () => {
  const game = makeGame(Array(9).fill(100));
  const state = game.startHand();
  assert.equal(state.players.filter((item) => item.inHand).length, 9);
  assert.equal(state.deckRemaining, 34);
  assert.equal(state.currentPlayerId, 'p3');
  assert.equal(state.smallBlindSeat, 1);
  assert.equal(state.bigBlindSeat, 2);
});

test('legal action metadata enforces minimum bet, raise-to amount, and turn ownership', () => {
  const game = makeGame([100, 100, 100]);
  game.startHand();
  const legal = game.legalActions('p0');
  assert.equal(legal.toCall, 10);
  assert.equal(legal.callAmount, 10);
  assert.equal(legal.minRaiseTo, 20);
  assert.deepEqual(actionTypes(game), ['fold', 'call', 'raise', 'all-in']);
  assertRuleError(() => game.act('p1', 'call'), 'OUT_OF_TURN');
  assert.throws(() => game.act('p0', 'raise', 19), /20–100/);

  game.act('p0', { type: 'raise', to: 20 });
  assert.equal(game.getState().currentBet, 20);
  assert.equal(game.getState().minRaiseSize, 10);
  assert.equal(game.legalActions('p1').toCall, 15);
});

test('post-flop no-limit betting exposes bet and subsequent raise-to bounds', () => {
  const game = makeGame([100, 100]);
  game.startHand();
  game.act('p0', 'call');
  game.act('p1', 'check');

  let legal = game.legalActions('p1');
  const bet = legal.actions.find((action) => action.type === 'bet');
  assert.deepEqual(bet, { type: 'bet', min: 10, max: 90 });
  game.act('p1', 'bet', 10);

  legal = game.legalActions('p0');
  assert.equal(legal.toCall, 10);
  assert.equal(legal.minRaiseTo, 20);
  assert.deepEqual(legal.actions.find((action) => action.type === 'raise'), { type: 'raise', min: 20, max: 90 });
  const state = game.act('p0', 'call');
  assert.equal(state.phase, PHASES.TURN);
});

test('a short all-in raise does not reopen raising for players who already acted', () => {
  const game = makeGame([45, 100, 100, 100]);
  game.startHand();
  game.act('p3', 'call');
  game.act('p0', 'call');
  game.act('p1', 'call');
  game.act('p2', 'raise', 30);
  game.act('p3', 'call');
  game.act('p0', 'all-in'); // 45 total: only 15 more than the 30 full raise.
  game.act('p1', 'fold');

  let legal = game.legalActions('p2');
  assert.equal(legal.toCall, 15);
  assert.equal(legal.canRaise, false);
  assert.equal(legal.minRaiseTo, null);
  assert.deepEqual(legal.actions.map(({ type }) => type), ['fold', 'call']);
  game.act('p2', 'call');

  legal = game.legalActions('p3');
  assert.equal(legal.canRaise, false);
  assert.deepEqual(legal.actions.map(({ type }) => type), ['fold', 'call']);
  const state = game.act('p3', 'call');
  assert.equal(state.phase, PHASES.FLOP);
});

test('cumulative short all-ins reopen action once they equal a full raise', () => {
  const game = makeGame([100, 40, 50, 100, 100]);
  game.startHand();
  game.act('p3', 'raise', 30);
  game.act('p4', 'call');
  game.act('p0', 'call');
  game.act('p1', 'all-in'); // 40: short raise of 10.
  game.act('p2', 'all-in'); // 50: another short raise of 10.

  const legal = game.legalActions('p3');
  assert.equal(legal.toCall, 20);
  assert.equal(legal.canRaise, true);
  assert.equal(legal.minRaiseTo, 70);
  assert.ok(actionTypes(game).includes('raise'));
});

test('a sub-minimum opening all-in can be completed to the big blind', () => {
  const game = makeGame([100, 15, 100]);
  game.startHand();
  game.act('p0', 'call');
  game.act('p1', 'call');
  game.act('p2', 'check');
  assert.equal(game.getState().phase, PHASES.FLOP);

  game.act('p1', 'all-in'); // Opens for 5, below the normal minimum bet of 10.
  let legal = game.legalActions('p2');
  assert.equal(legal.toCall, 5);
  assert.equal(legal.canRaise, true);
  assert.equal(legal.minRaiseTo, 10);
  game.act('p2', 'raise', 10); // Completes the opening wager.

  legal = game.legalActions('p0');
  assert.equal(legal.toCall, 10);
  assert.equal(legal.minRaiseTo, 20);
  assert.equal(game.getState().minRaiseSize, 10);
});

test('a lone player must answer an all-in, but is not asked to bet into all-in opponents', () => {
  const game = makeGame([100, 100]);
  game.startHand();
  let state = game.act('p0', 'all-in');
  assert.equal(state.phase, PHASES.PREFLOP);
  assert.equal(state.currentPlayerId, 'p1');
  assert.equal(state.legalActions.toCall, 90);
  assert.deepEqual(actionTypes(game), ['fold', 'call', 'all-in']);

  state = game.act('p1', 'fold');
  assert.equal(state.phase, PHASES.COMPLETE);
  assert.equal(state.result.reason, 'fold');
  assert.equal(state.result.totalPot, 20);
  assert.deepEqual(state.result.refunds, { p0: 90, p1: 0 });
  assert.deepEqual(state.result.awards, { p0: 20, p1: 0 });
  assert.equal(player(state, 'p0').stack, 110);
  assert.equal(player(state, 'p1').stack, 90);

  const shortBlind = makeGame([100, 3]);
  state = shortBlind.startHand();
  assert.equal(state.phase, PHASES.COMPLETE, 'unmatched part of the small blind is effectively returned');
  assert.equal(state.result.totalPot, 6);
  assert.equal(state.result.refunds.p0, 2);
  assert.equal(state.players.reduce((sum, item) => sum + item.stack, 0), 103);
});

test('all-in settlement creates main/side pots and can award each layer separately', () => {
  const deck = riggedDeck([
    // Deal order with button at seat 0 is p1, p2, p0, twice.
    'Kh', 'As', 'Qh', 'Kd', 'Ad', 'Qd',
    '4c', // burn
    '2c', '3d', '7h',
    '5c', // burn
    '9s',
    '6c', // burn
    'Kc',
  ]);
  const game = makeGame([200, 50, 100]);
  game.startHand({ deck });
  game.act('p0', 'all-in');
  game.act('p1', 'all-in');
  const state = game.act('p2', 'all-in');

  assert.equal(state.phase, PHASES.COMPLETE);
  assert.equal(state.result.reason, 'showdown');
  assert.deepEqual(state.result.pots.map((pot) => pot.amount), [150, 100]);
  assert.deepEqual(state.result.pots.map((pot) => pot.winnerIds), [['p1'], ['p2']]);
  assert.deepEqual(state.result.refunds, { p0: 100, p1: 0, p2: 0 });
  assert.deepEqual(state.result.awards, { p0: 0, p1: 150, p2: 100 });
  assert.deepEqual(state.result.payouts, { p0: 100, p1: 150, p2: 100 });
  assert.deepEqual(state.result.winners, state.result.winnerIds);
  assert.deepEqual(state.result.evaluations, state.result.hands);
  assert.deepEqual(state.players.map(({ id, stack }) => [id, stack]), [['p0', 100], ['p1', 150], ['p2', 100]]);
  assert.equal(state.result.hands.p1.category, '三条');
  assert.equal(state.result.hands.p2.category, '一对');
  assert.equal(state.result.hands.p0.category, '一对');
  assert.equal(state.result.totalCommitted, 350);
  assert.equal(state.result.pots.reduce((sum, pot) => sum + pot.amount, 0), 250);
});

test('split pots award odd chips clockwise from the button', () => {
  const deck = riggedDeck([
    'Tc', '9c', 'Td', '4c', '9d', '3c',
    '5h', // burn
    'As', 'Kd', 'Qh',
    '6h', // burn
    'Jc',
    '7h', // burn
    '2s',
  ]);
  const game = new HoldemGame({
    smallBlind: 1,
    bigBlind: 2,
    buttonSeat: 0,
    players: makePlayers([5, 5, 5]),
  });
  game.startHand({ deck });
  game.act('p0', 'all-in');
  game.act('p1', 'all-in');
  const state = game.act('p2', 'all-in');

  assert.equal(state.result.totalPot, 15);
  assert.deepEqual(state.result.pots[0].winnerIds, ['p1', 'p0']);
  assert.deepEqual(state.result.pots[0].shares, { p1: 8, p0: 7 });
  assert.deepEqual(state.result.payouts, { p0: 7, p1: 8, p2: 0 });
  assert.equal(state.players.reduce((sum, item) => sum + item.stack, 0), 15);
});

test('folded chips remain in the pot and cannot win at showdown', () => {
  const game = makeGame([100, 100, 100]);
  game.startHand();
  game.act('p0', 'raise', 50);
  game.act('p1', 'call');
  game.act('p2', 'call');
  assert.equal(game.getState().phase, PHASES.FLOP);
  game.act('p1', 'check');
  game.act('p2', 'all-in');
  game.act('p0', 'all-in');
  const state = game.act('p1', 'fold');

  assert.equal(state.phase, PHASES.COMPLETE);
  assert.deepEqual(state.result.pots.map((pot) => pot.amount), [150, 100]);
  assert.ok(state.result.pots.every((pot) => !pot.eligibleIds.includes('p1')));
  assert.equal(Object.values(state.result.payouts).reduce((sum, amount) => sum + amount, 0), 250);
  assert.equal(state.players.reduce((sum, item) => sum + item.stack, 0), 300);
});

test('completed hands can restart and rotate the button past every occupied seat', () => {
  const game = new HoldemGame({
    smallBlind: 1,
    bigBlind: 2,
    seed: 'series',
    buttonSeat: 0,
    players: makePlayers([30, 30, 30]),
  });
  let state = game.startHand();
  assert.equal(state.buttonSeat, 0);
  game.act('p0', 'fold');
  state = game.act('p1', 'fold');
  assert.equal(state.phase, PHASES.COMPLETE);
  assert.equal(state.handNumber, 1);

  state = game.startNextHand();
  assert.equal(state.handNumber, 2);
  assert.equal(state.buttonSeat, 1);
  assert.equal(state.smallBlindSeat, 2);
  assert.equal(state.bigBlindSeat, 0);
  assert.equal(state.currentPlayerId, 'p1');
  assert.equal(state.handSeed, 'series:2');
  assert.ok(state.players.every((item) => item.totalBet <= 2));
});

test('custom decks and action amounts reject malformed or impossible input', () => {
  const game = makeGame([100, 100]);
  assert.throws(() => game.startHand({ deck: ['As'] }), /52/);

  const duplicateDeck = createDeck();
  duplicateDeck[1] = duplicateDeck[0];
  assert.throws(() => game.startHand({ deck: duplicateDeck }), /重复牌/);

  game.startHand();
  assertRuleError(() => game.act('p0', 'dance'), 'UNKNOWN_ACTION');
  assertRuleError(() => game.act('p0', 'check'), 'ILLEGAL_ACTION');
});
