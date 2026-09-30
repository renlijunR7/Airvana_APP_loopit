import assert from 'node:assert/strict';
import test from 'node:test';

import {
  OUTCOMES,
  PHASES,
  createInitialState,
  createSeededRng,
  nextRandom,
  placeBet,
  selectPlayer,
  selectStake,
  settleRound,
  startNextRound,
  tick,
} from '../src/engine.js';
import {
  clearGameState,
  createMemoryStorage,
  loadGameState,
  saveGameState,
} from '../src/storage.js';

function runToResult(state, limit = 200) {
  let current = state;
  for (let step = 0; step < limit && current.phase !== PHASES.RESULT; step += 1) {
    current = tick(current);
  }
  assert.equal(current.phase, PHASES.RESULT, 'round should finish within the safety limit');
  return current;
}

function discoverWinner(seed) {
  return runToResult(createInitialState({ seed })).winnerId;
}

test('seeded random generators are deterministic and stay in [0, 1)', () => {
  const left = createSeededRng('same-round');
  const right = createSeededRng('same-round');
  const leftValues = Array.from({ length: 12 }, () => left());
  const rightValues = Array.from({ length: 12 }, () => right());

  assert.deepEqual(leftValues, rightValues);
  assert.ok(leftValues.every((value) => value >= 0 && value < 1));
  assert.notDeepEqual(leftValues, Array.from({ length: 12 }, () => createSeededRng('other')()));

  const step = nextRandom(42);
  assert.equal(step.seed, nextRandom(42).seed);
  assert.equal(step.value, nextRandom(42).value);
});

test('clock follows PRE_BET -> LIVE_BET -> PLAYING -> RESULT', () => {
  const initial = createInitialState({
    seed: 7,
    config: { preBetSeconds: 2, liveBetSeconds: 2, initialHandCount: 1 },
  });
  assert.equal(initial.phase, PHASES.PRE_BET);

  const preBetLastSecond = tick(initial);
  assert.equal(preBetLastSecond.phase, PHASES.PRE_BET);
  assert.equal(preBetLastSecond.countdown, 1);

  const live = tick(preBetLastSecond);
  assert.equal(live.phase, PHASES.LIVE_BET);
  assert.equal(live.countdown, 2);

  const playing = tick(live, 2);
  assert.equal(playing.phase, PHASES.PLAYING);

  const result = tick(playing);
  assert.equal(result.phase, PHASES.RESULT);
  assert.equal(result.settled, true);
});

test('bet uses virtual credits once and duplicate bet cannot charge again', () => {
  let state = createInitialState({ seed: 11, credits: 1_000 });
  state = selectPlayer(state, 'p2');
  state = selectStake(state, 400);
  state = placeBet(state);

  assert.equal(state.credits, 600);
  assert.deepEqual(
    { playerId: state.ticket.playerId, stake: state.ticket.stake },
    { playerId: 'p2', stake: 400 },
  );

  const duplicate = placeBet(state);
  assert.equal(duplicate.credits, 600);
  assert.equal(duplicate.notice.code, 'BET_ALREADY_PLACED');
});

test('insufficient credits leaves balance and ticket untouched', () => {
  let state = createInitialState({ seed: 12, credits: 100 });
  state = selectPlayer(state, 'p1');
  state = selectStake(state, 400);
  state = placeBet(state);

  assert.equal(state.credits, 100);
  assert.equal(state.ticket, null);
  assert.equal(state.notice.code, 'INSUFFICIENT_CREDITS');
});

test('correct guess pays once and settlement is idempotent', () => {
  const seed = 'winning-ticket';
  const winnerId = discoverWinner(seed);
  let state = createInitialState({ seed, credits: 10_000 });
  state = selectPlayer(state, winnerId);
  state = selectStake(state, 400);
  state = placeBet(state);
  state = runToResult(state);

  assert.equal(state.winnerId, winnerId);
  assert.equal(state.result.outcome, OUTCOMES.WIN);
  assert.equal(state.result.payout, 2_000);
  assert.equal(state.result.netChange, 1_600);
  assert.equal(state.credits, 11_600);
  assert.equal(state.players.filter((player) => player.isWinner).length, 1);

  const settledAgain = settleRound(state, state.players.find((player) => player.id !== winnerId).id);
  assert.strictEqual(settledAgain, state);
  assert.equal(settledAgain.credits, 11_600);
  assert.equal(settledAgain.history.length, 1);
});

test('wrong guess loses only the staked virtual credits', () => {
  const seed = 'losing-ticket';
  const winnerId = discoverWinner(seed);
  const wrongPlayer = createInitialState({ seed }).players.find((player) => player.id !== winnerId);
  let state = createInitialState({ seed, credits: 10_000 });
  state = selectPlayer(state, wrongPlayer.id);
  state = selectStake(state, 200);
  state = placeBet(state);
  state = runToResult(state);

  assert.equal(state.winnerId, winnerId);
  assert.equal(state.result.outcome, OUTCOMES.LOSE);
  assert.equal(state.result.payout, 0);
  assert.equal(state.result.netChange, -200);
  assert.equal(state.credits, 9_800);
  assert.equal(state.players.filter((player) => player.isWinner).length, 1);
});

test('next round preserves credits and history but resets round gameplay', () => {
  const finished = runToResult(createInitialState({ seed: 91 }));
  const next = startNextRound(finished);

  assert.equal(next.roundId, 2);
  assert.equal(next.phase, PHASES.PRE_BET);
  assert.equal(next.credits, finished.credits);
  assert.equal(next.history.length, 1);
  assert.equal(next.ticket, null);
  assert.equal(next.winnerId, null);
  assert.equal(next.players.every((player) => player.handCount === next.config.initialHandCount), true);
});

test('storage safely round-trips state and rejects corrupt data', () => {
  const storage = createMemoryStorage();
  const state = tick(createInitialState({ seed: 'persist-me' }), 3);
  assert.equal(saveGameState(state, storage), true);
  assert.deepEqual(loadGameState(storage), state);

  storage.setItem('guessing-game:state:v1', '{broken');
  assert.equal(loadGameState(storage), null);
  assert.equal(clearGameState(storage), true);
  assert.equal(loadGameState(storage), null);
});
