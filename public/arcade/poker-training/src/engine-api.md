# Poker engine integration

`engine.js` is an ES module with no runtime dependencies. It combines and adapts the user's existing SUD poker evaluator and rules implementation from 2026-09-15. It contains no Prominence Poker source code or proprietary game assets.

```js
import { HoldemGame, chooseAction, evaluate, parseCard } from './engine.js';

const game = new HoldemGame({
  smallBlind: 25,
  bigBlind: 50,
  seed: `session-${Date.now()}`,
  buttonSeat: 0,
  maxPlayers: 6,
  players: [
    { id: 'hero', name: 'YOU', seat: 0, stack: 2500, ready: true },
    ...['Roy', 'Mia', 'Viktor', 'Sal', 'Iris'].map((name, index) => ({
      id: `bot-${index}`, name, seat: index + 1, stack: 2500, ready: true,
    })),
  ],
});

game.nextHand();
let state = game.getState({ viewerId: 'hero' });

// Only use this view in the player's UI. It hides opponent cards until showdown.
render(state);

// Human actions are legal only when currentPlayerId === 'hero'.
game.act('hero', { type: 'call' });
// Raises are TO a total street commitment, not BY a delta.
game.act('hero', { type: 'raise', to: 200 });

// Each AI gets its own private view, not the player's or revealAll view.
const id = game.currentPlayerId;
const action = chooseAction(game.getState({ viewerId: id }));
if (action) game.act(id, action);

// Complete a hand before starting the next; button rotates automatically.
if (game.phase === 'complete' && game.canStartHand()) game.nextHand();
```

The action snippets are independent examples, not a sequence to execute literally. Add a short UI delay before each AI action. The engine performs no timers and returns immediately, so the UI controls animations and pacing.

## Actions

`game.getLegalActions(id?)` defaults to the current player and returns:

```js
{
  canAct: true,
  playerId: 'hero',
  toCall: 50,       // Gap to the effective calling target
  callAmount: 50,   // Capped by remaining stack
  currentBet: 50,
  minBet: 50,
  minRaiseTo: 100,
  maxRaiseTo: 2500,
  canRaise: true,
  actions: [
    { type: 'fold' },
    { type: 'call', amount: 50, to: 50 },
    { type: 'raise', min: 100, max: 2500 },
    { type: 'all-in', to: 2500 },
  ],
}
```

Use `actions` to enable controls. `bet` appears when the street has no bet; `raise` appears after a bet. `check` replaces `call` when nothing is owed. The explicit `all-in` action allows a legal short wager below the normal minimum. Do not infer legality solely from `canRaise`; use the concrete action descriptor. Out-of-turn or illegal requests throw `HoldemRuleError` with a machine-readable `.code`; invalid wager sizes throw `TypeError`.

Supported calls: `game.act(id, {type, to?})`, `game.act(id, type, to?)`. `allin` and `all_in` aliases are accepted; emitted actions use `all-in`.

## State

- `phase`: `waiting`, `preflop`, `flop`, `turn`, `river`, `complete`.
- `isHandRunning`, `handNumber`, `currentPlayerId`, `smallBlind`, `bigBlind`, `buttonSeat`, `smallBlindSeat`, `bigBlindSeat`.
- `board`: 0/3/4/5 card codes. Cards use `As`, `Td`, `2c`; `parseCard(code)` returns rank, numeric value, suit, symbol and color.
- `pot`: live commitments during a hand; awarded, contested pot at completion, excluding unmatched refunds.
- `totalCommitted`: this hand's cumulative commitments. At completion these have already been paid back into player stacks. Do **not** add `totalCommitted` to stack totals after completion.
- `players`: ordered by seat, with `id`, `name`, `seat`, `stack`, `inHand`, `folded`, `allIn`, `status`, `cards`/`holeCards`, `streetBet`, `totalBet`, `isButton`, `isSmallBlind`, `isBigBlind`, `lastAction`, `payout`, `net`, `canAct`.
- Hidden hole cards are `[null, null]`. A viewer sees only their own cards. Non-folded hands are shown at showdown. Folded opponent cards remain hidden.
- `lastAction`: `{type, amount, to, allIn?}`. Blind types are `small-blind` and `big-blind`. Street progression clears previous street action labels.
- `events`: current hand events indexed from 0: `hand-started`, `blind-posted`, `hole-cards-dealt`, `street-started`, `action`, `hand-completed`. Several street events can occur in a single action when all remaining players are all-in.
- `result`: `null` while playing; otherwise `reason: 'fold'|'showdown'`, `winnerIds`, `totalPot`, `totalCommitted`, `awards`, `refunds`, `payouts`, `hands`, `pots`. Amount maps use player IDs as keys. `hands[id]` contains `category` (Chinese name), `categoryRank`, `tiebreak`, `bestFive`, `score`.

Each `result.pots` item contains `type: 'main'|'side'`, `amount`, `eligibleIds`, `winnerIds`, and `shares`. Multiple winners can win separate pots; winner badges should not assume a single winner. Odd chips in split pots go clockwise from the button.

`payout` includes refunds and awarded chips; `net` subtracts the player's hand contribution. For a “won” label use `result.awards[id]`, not `payout`. For profit/loss use `net`.

`evaluate([...holeCards, ...board])` requires 5–7 visible cards and returns the best five-card hand. Before the flop, show generic “等待翻牌” or hole-card description instead of calling it.

## Continuous sessions and bots

`nextHand()` / `startNextHand()` rotates the button and skips zero-stack players. Zero-stack players are marked `ready: false`; the engine never silently gives anyone free chips. When fewer than two eligible players remain, `canStartHand()` is false. The UI may offer a fresh session via a new `HoldemGame`.

`chooseAction(state, random = Math.random)` returns `{type, to?}` or `null` when nobody can act. It uses its own hole cards, public community cards, pot odds, stack pressure, opponents still in the hand, and public aggression. It includes occasional bluffs and variable sizing. It is a lightweight heuristic bot, not a GTO solver; it never reads opponent hole cards, the deck, or shuffle seed. Passing `createSeededRandom(seed)` makes decision sequences reproducible.

## Verification

Run from the project directory:

```sh
node --test src/engine.test.js
```

Actual verification on 2026-09-23: **28 tests passed, 0 failed**. This covers every hand category, kickers and wheel straights, minimum bet/raise rules, turn ownership, heads-up and multiway blind order, short all-in reopen restrictions, cumulative short raises, all-in runouts, unmatched refunds, multiple side pots, folded dead money, split-pot odd chips, hidden-card views, button rotation, and malformed input. Additional simulation completed **700 continuous AI hands / 6,429 AI decisions**, plus **250 randomized hands / 1,747 decisions** across 2–9 seats with uneven stacks, with no deadlock or chip-conservation failure.
