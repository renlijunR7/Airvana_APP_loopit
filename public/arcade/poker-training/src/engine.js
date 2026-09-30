/** Adapted from the user-owned SUD Holdem implementation (2026-09-15).
 * Combined into a browser-native dependency-free module for this project. */
/**
 * Small, dependency-free Texas Hold'em rules module.
 *
 * Cards use a compact canonical code: rank + suit, for example `As`, `Td`,
 * and `2c`. Parsing is deliberately a little more forgiving and also accepts
 * display forms such as `A♠` and `10♥`.
 */

export const RANKS = Object.freeze(['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']);
export const SUITS = Object.freeze(['c', 'd', 'h', 's']);
export const SUIT_SYMBOLS = Object.freeze({ c: '♣', d: '♦', h: '♥', s: '♠' });

export const HAND_CATEGORIES = Object.freeze([
  '高牌',
  '一对',
  '两对',
  '三条',
  '顺子',
  '同花',
  '葫芦',
  '四条',
  '同花顺',
  '皇家同花顺',
]);

const RANK_TO_VALUE = Object.freeze(Object.fromEntries(RANKS.map((rank, index) => [rank, index + 2])));
const VALUE_TO_RANK = Object.freeze(Object.fromEntries(RANKS.map((rank, index) => [index + 2, rank])));
const SUIT_ALIASES = Object.freeze({
  c: 'c',
  clubs: 'c',
  club: 'c',
  '♣': 'c',
  d: 'd',
  diamonds: 'd',
  diamond: 'd',
  '♦': 'd',
  h: 'h',
  hearts: 'h',
  heart: 'h',
  '♥': 'h',
  s: 's',
  spades: 's',
  spade: 's',
  '♠': 's',
});

const DEFAULT_SEED = 0x53_55_44;

function normalizeRank(rank) {
  if (typeof rank === 'number' && Number.isInteger(rank) && rank >= 2 && rank <= 14) {
    return VALUE_TO_RANK[rank];
  }

  const normalized = String(rank).trim().toUpperCase();
  if (normalized === '10') return 'T';
  if (Object.hasOwn(RANK_TO_VALUE, normalized)) return normalized;
  throw new TypeError(`无效点数: ${String(rank)}`);
}

function normalizeSuit(suit) {
  const normalized = String(suit).trim().toLowerCase().replaceAll('\ufe0f', '');
  if (Object.hasOwn(SUIT_ALIASES, normalized)) return SUIT_ALIASES[normalized];
  throw new TypeError(`无效花色: ${String(suit)}`);
}

/** Parse a card code or a card-like object into a normalized card object. */
export function parseCard(card) {
  let rank;
  let suit;

  if (typeof card === 'string') {
    const compact = card.trim().replaceAll(/\s|\ufe0f/g, '');
    const match = /^(10|[2-9tjqka])([cdhs♣♦♥♠])$/i.exec(compact);
    if (!match) throw new TypeError(`无效牌面: ${card}`);
    [, rank, suit] = match;
  } else if (card && typeof card === 'object') {
    if (card.rank != null && card.suit != null) {
      rank = card.rank;
      suit = card.suit;
    } else if (typeof card.code === 'string') {
      return parseCard(card.code);
    } else {
      throw new TypeError('牌对象必须包含 rank/suit 或 code');
    }
  } else {
    throw new TypeError('牌必须是字符串或牌对象');
  }

  const normalizedRank = normalizeRank(rank);
  const normalizedSuit = normalizeSuit(suit);
  return Object.freeze({
    rank: normalizedRank,
    suit: normalizedSuit,
    value: RANK_TO_VALUE[normalizedRank],
    code: `${normalizedRank}${normalizedSuit}`,
    symbol: SUIT_SYMBOLS[normalizedSuit],
    color: normalizedSuit === 'd' || normalizedSuit === 'h' ? 'red' : 'black',
  });
}

/** Parse an array, or a whitespace/comma separated string, of cards. */
export function parseCards(cards) {
  const source = typeof cards === 'string' ? cards.trim().split(/[\s,]+/).filter(Boolean) : cards;
  if (!Array.isArray(source)) throw new TypeError('牌组必须是数组或字符串');
  return source.map(parseCard);
}

/** Format a card as `A♠` by default, or as canonical `As` with style `code`. */
export function formatCard(card, style = 'symbol') {
  const parsed = parseCard(card);
  if (style === 'code') return parsed.code;
  if (style !== 'symbol') throw new TypeError(`未知牌面格式: ${String(style)}`);
  const displayRank = parsed.rank === 'T' ? '10' : parsed.rank;
  return `${displayRank}${parsed.symbol}`;
}

export function formatCards(cards, separator = ' ') {
  return parseCards(cards).map((card) => formatCard(card)).join(separator);
}

/** Return a fresh standard 52-card deck in stable suit/rank order. */
export function createDeck() {
  return SUITS.flatMap((suit) => RANKS.map((rank) => `${rank}${suit}`));
}

/** Convert strings and numbers to a stable unsigned 32-bit seed. */
export function seedToUint32(seed = DEFAULT_SEED) {
  if (typeof seed === 'number') {
    if (!Number.isFinite(seed)) throw new TypeError('seed 必须是有限数字或字符串');
    return Math.trunc(seed) >>> 0;
  }

  const text = typeof seed === 'string' ? seed : JSON.stringify(seed);
  if (typeof text !== 'string') throw new TypeError('seed 无法转换为字符串');

  // FNV-1a gives string seeds a stable cross-runtime representation.
  let hash = 0x81_1c_9d_c5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01_00_01_93);
  }
  return hash >>> 0;
}

/** Create a deterministic PRNG yielding values in [0, 1). */
export function createSeededRandom(seed = DEFAULT_SEED) {
  let state = seedToUint32(seed);
  return () => {
    state = (state + 0x6d_2b_79_f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** Fisher-Yates shuffle. The input is never mutated. */
export function shuffle(cards, seed = DEFAULT_SEED) {
  if (!Array.isArray(cards)) throw new TypeError('待洗牌组必须是数组');
  const shuffled = [...cards];
  const random = typeof seed === 'function' ? seed : createSeededRandom(seed);
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}

export function shuffleDeck(seed = DEFAULT_SEED) {
  return shuffle(createDeck(), seed);
}

function assertUniqueCards(cards) {
  const codes = cards.map((card) => card.code);
  if (new Set(codes).size !== codes.length) throw new RangeError('牌组中不能出现重复牌');
}

function straightHigh(values) {
  const unique = [...new Set(values)].sort((left, right) => right - left);
  if (unique.length !== 5) return 0;
  if (unique[0] === 14 && unique[1] === 5 && unique[2] === 4 && unique[3] === 3 && unique[4] === 2) {
    return 5;
  }
  return unique.every((value, index) => index === 0 || value === unique[0] - index) ? unique[0] : 0;
}

function scoreHand(categoryRank, tiebreak) {
  let score = categoryRank;
  for (let index = 0; index < 5; index += 1) score = score * 15 + (tiebreak[index] ?? 0);
  return score;
}

function compareVectors(left, right) {
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return Math.sign(difference);
  }
  return 0;
}

function orderedCodes(cards, wheel = false) {
  return [...cards]
    .sort((left, right) => {
      const leftValue = wheel && left.value === 14 ? 1 : left.value;
      const rightValue = wheel && right.value === 14 ? 1 : right.value;
      return rightValue - leftValue || SUITS.indexOf(right.suit) - SUITS.indexOf(left.suit);
    })
    .map((card) => card.code);
}

function makeEvaluation(cards, categoryRank, tiebreak, wheel = false) {
  const category = HAND_CATEGORIES[categoryRank];
  return Object.freeze({
    category,
    name: category,
    categoryRank,
    rank: categoryRank,
    tiebreak: Object.freeze([...tiebreak]),
    score: scoreHand(categoryRank, tiebreak),
    bestFive: Object.freeze(orderedCodes(cards, wheel)),
  });
}

/** Evaluate exactly five cards. Higher categoryRank/score is better. */
export function evaluateFive(input) {
  const cards = parseCards(input);
  if (cards.length !== 5) throw new RangeError(`evaluateFive 需要 5 张牌，收到 ${cards.length} 张`);
  assertUniqueCards(cards);

  const values = cards.map((card) => card.value);
  const sortedValues = [...values].sort((left, right) => right - left);
  const flush = cards.every((card) => card.suit === cards[0].suit);
  const highStraight = straightHigh(values);

  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const groups = [...counts.entries()].sort(
    ([leftValue, leftCount], [rightValue, rightCount]) => rightCount - leftCount || rightValue - leftValue,
  );

  if (flush && highStraight === 14 && values.includes(10)) {
    return makeEvaluation(cards, 9, [14]);
  }
  if (flush && highStraight) return makeEvaluation(cards, 8, [highStraight], highStraight === 5);

  if (groups[0][1] === 4) {
    const quad = groups[0][0];
    const kicker = groups.find(([, count]) => count === 1)[0];
    return makeEvaluation(cards, 7, [quad, kicker]);
  }

  if (groups[0][1] === 3 && groups[1][1] === 2) {
    return makeEvaluation(cards, 6, [groups[0][0], groups[1][0]]);
  }

  if (flush) return makeEvaluation(cards, 5, sortedValues);
  if (highStraight) return makeEvaluation(cards, 4, [highStraight], highStraight === 5);

  if (groups[0][1] === 3) {
    const kickers = groups.filter(([, count]) => count === 1).map(([value]) => value).sort((a, b) => b - a);
    return makeEvaluation(cards, 3, [groups[0][0], ...kickers]);
  }

  const pairs = groups.filter(([, count]) => count === 2).map(([value]) => value).sort((a, b) => b - a);
  if (pairs.length === 2) {
    const kicker = groups.find(([, count]) => count === 1)[0];
    return makeEvaluation(cards, 2, [pairs[0], pairs[1], kicker]);
  }

  if (pairs.length === 1) {
    const kickers = groups.filter(([, count]) => count === 1).map(([value]) => value).sort((a, b) => b - a);
    return makeEvaluation(cards, 1, [pairs[0], ...kickers]);
  }

  return makeEvaluation(cards, 0, sortedValues);
}

function combinationsOfFive(cards) {
  const combinations = [];
  for (let a = 0; a < cards.length - 4; a += 1) {
    for (let b = a + 1; b < cards.length - 3; b += 1) {
      for (let c = b + 1; c < cards.length - 2; c += 1) {
        for (let d = c + 1; d < cards.length - 1; d += 1) {
          for (let e = d + 1; e < cards.length; e += 1) {
            combinations.push([cards[a], cards[b], cards[c], cards[d], cards[e]]);
          }
        }
      }
    }
  }
  return combinations;
}

/** Evaluate the best five-card hand available from five, six, or seven cards. */
export function evaluate(input) {
  const cards = parseCards(input);
  if (cards.length < 5 || cards.length > 7) {
    throw new RangeError(`evaluate 需要 5–7 张牌，收到 ${cards.length} 张`);
  }
  assertUniqueCards(cards);

  let best = null;
  for (const combination of combinationsOfFive(cards)) {
    const candidate = evaluateFive(combination);
    if (!best || compareEvaluations(candidate, best) > 0) best = candidate;
  }
  return best;
}

/** Evaluate exactly seven cards and select the strongest five-card hand. */
export function evaluateSeven(input) {
  const cards = parseCards(input);
  if (cards.length !== 7) throw new RangeError(`evaluateSeven 需要 7 张牌，收到 ${cards.length} 张`);
  return evaluate(cards);
}

function isEvaluation(value) {
  return Boolean(
    value
      && typeof value === 'object'
      && Number.isInteger(value.categoryRank)
      && Array.isArray(value.tiebreak),
  );
}

/** Compare two already-evaluated results. Positive means left wins. */
export function compareEvaluations(left, right) {
  if (!isEvaluation(left) || !isEvaluation(right)) throw new TypeError('比较值必须是牌型评估结果');
  if (left.categoryRank !== right.categoryRank) return Math.sign(left.categoryRank - right.categoryRank);
  return compareVectors(left.tiebreak, right.tiebreak);
}

/** Compare card arrays or evaluation results. Positive means left wins. */
export function compareHands(left, right) {
  const leftEvaluation = isEvaluation(left) ? left : evaluate(left);
  const rightEvaluation = isEvaluation(right) ? right : evaluate(right);
  return compareEvaluations(leftEvaluation, rightEvaluation);
}

/**
 * Find all winning players, preserving split pots.
 *
 * Each player can be an array of cards, or `{ cards }`, `{ hand }`, or
 * `{ holeCards }`. When a board is supplied it is appended before evaluation.
 * The returned entries retain both the original player and its index.
 */
export function findWinners(players, board = []) {
  if (!Array.isArray(players) || players.length === 0) throw new RangeError('至少需要一位玩家');
  const communityCards = parseCards(board);

  const entries = players.map((player, index) => {
    const privateCards = Array.isArray(player)
      ? player
      : player?.holeCards ?? player?.cards ?? player?.hand;
    if (!Array.isArray(privateCards)) throw new TypeError(`玩家 ${index} 缺少手牌数组`);
    const hand = evaluate([...privateCards, ...communityCards]);
    return Object.freeze({ index, player, hand });
  });

  let best = entries[0].hand;
  for (let index = 1; index < entries.length; index += 1) {
    if (compareEvaluations(entries[index].hand, best) > 0) best = entries[index].hand;
  }
  return entries.filter((entry) => compareEvaluations(entry.hand, best) === 0);
}

export const getWinners = findWinners;



export const ACTIONS = Object.freeze({
  FOLD: 'fold',
  CHECK: 'check',
  CALL: 'call',
  BET: 'bet',
  RAISE: 'raise',
  ALL_IN: 'all-in',
});

export const PHASES = Object.freeze({
  WAITING: 'waiting',
  PREFLOP: 'preflop',
  FLOP: 'flop',
  TURN: 'turn',
  RIVER: 'river',
  COMPLETE: 'complete',
});

const BETTING_PHASES = new Set([PHASES.PREFLOP, PHASES.FLOP, PHASES.TURN, PHASES.RIVER]);

export class HoldemRuleError extends Error {
  constructor(code, message, details = undefined) {
    super(message);
    this.name = 'HoldemRuleError';
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

function fail(code, message, details) {
  throw new HoldemRuleError(code, message, details);
}

function integer(value, label, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new TypeError(`${label} 必须是 ${min}–${max} 之间的安全整数`);
  }
  return value;
}

function normalizedId(id) {
  if ((typeof id !== 'string' && typeof id !== 'number') || String(id).trim() === '') {
    throw new TypeError('玩家 id 必须是非空字符串或数字');
  }
  return String(id);
}

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function normalizeAction(action, amount) {
  if (action && typeof action === 'object') {
    amount = action.to ?? action.amount ?? amount;
    action = action.type;
  }
  const aliases = { allin: ACTIONS.ALL_IN, all_in: ACTIONS.ALL_IN };
  const type = aliases[String(action).toLowerCase()] ?? String(action).toLowerCase();
  if (!Object.values(ACTIONS).includes(type)) fail('UNKNOWN_ACTION', `未知动作: ${String(action)}`);
  return { type, amount };
}

function normalizedDeck(deck) {
  if (!Array.isArray(deck) || deck.length !== 52) {
    throw new RangeError('自定义牌堆必须恰好包含 52 张牌');
  }
  const cards = deck.map((card) => parseCard(card).code);
  if (new Set(cards).size !== 52) throw new RangeError('自定义牌堆中不能有重复牌');
  return cards;
}

/**
 * Deterministic no-limit Texas Hold'em table for 2–9 seated players.
 *
 * `bet` and `raise` amounts are always raise-to totals for the current street.
 * Use the explicit `all-in` action for a legal wager below the normal minimum.
 */
export class HoldemGame {
  constructor({
    smallBlind = 10,
    bigBlind = 20,
    seed = 'sud-holdem',
    maxPlayers = 9,
    buttonSeat = null,
    players = [],
  } = {}) {
    integer(maxPlayers, 'maxPlayers', { min: 2, max: 9 });
    integer(smallBlind, 'smallBlind', { min: 1 });
    integer(bigBlind, 'bigBlind', { min: 1 });
    if (smallBlind > bigBlind) throw new RangeError('smallBlind 不能大于 bigBlind');
    if (buttonSeat != null) integer(buttonSeat, 'buttonSeat', { min: 0, max: maxPlayers - 1 });

    this.maxPlayers = maxPlayers;
    this.smallBlind = smallBlind;
    this.bigBlind = bigBlind;
    this.baseSeed = seed;
    this.initialButtonSeat = buttonSeat;

    this.players = new Map();
    this.phase = PHASES.WAITING;
    this.handNumber = 0;
    this.handSeed = null;
    this.buttonSeat = null;
    this.smallBlindSeat = null;
    this.bigBlindSeat = null;
    this.currentPlayerId = null;
    this.currentBet = 0;
    this.lastFullRaiseSize = bigBlind;
    this.hasFullBet = false;
    this.board = [];
    this.burnCards = [];
    this.deck = [];
    this.deckIndex = 0;
    this.pending = new Set();
    this.result = null;
    this.events = [];

    for (const player of players) this.sit(player);
  }

  get isHandRunning() {
    return BETTING_PHASES.has(this.phase);
  }

  get pot() {
    if (this.phase === PHASES.COMPLETE && this.result) return this.result.totalPot;
    return this.totalCommitted;
  }

  get totalCommitted() {
    let total = 0;
    for (const player of this.players.values()) {
      if (player.inHand) total += player.totalBet;
    }
    return total;
  }

  get state() {
    return this.getState();
  }

  sit({ id, name = undefined, seat = undefined, stack = undefined, chips = undefined, ready = false }) {
    const playerId = normalizedId(id);
    if (this.players.has(playerId)) fail('DUPLICATE_PLAYER', `玩家 ${playerId} 已经入座`);
    const startingStack = stack ?? chips;
    integer(startingStack, 'stack', { min: 0 });

    if (seat == null) {
      seat = this._firstOpenSeat();
      if (seat == null) fail('TABLE_FULL', '牌桌已满');
    }
    integer(seat, 'seat', { min: 0, max: this.maxPlayers - 1 });
    if (this._playerAtSeat(seat)) fail('SEAT_TAKEN', `座位 ${seat} 已被占用`);
    if (ready && startingStack === 0) fail('NO_CHIPS', '筹码为 0 的玩家不能准备');

    const player = {
      id: playerId,
      name: name == null ? playerId : String(name),
      seat,
      stack: startingStack,
      ready: Boolean(ready),
      inHand: false,
      folded: false,
      allIn: false,
      holeCards: [],
      streetBet: 0,
      totalBet: 0,
      acted: false,
      lastActionBet: 0,
      payout: 0,
      net: 0,
      lastAction: null,
      status: startingStack === 0 ? 'busted' : ready ? 'ready' : 'sitting-out',
    };
    this.players.set(playerId, player);
    this._emit('player-sat', { playerId, seat, stack: startingStack });
    return this._publicPlayer(player, { revealAll: false });
  }

  seatPlayer(player) {
    return this.sit(player);
  }

  setReady(id, ready = true) {
    const player = this._requirePlayer(id);
    if (ready && player.stack === 0) fail('NO_CHIPS', '筹码为 0 的玩家不能准备');
    player.ready = Boolean(ready);
    if (!player.inHand) player.status = player.stack === 0 ? 'busted' : player.ready ? 'ready' : 'sitting-out';
    this._emit('ready-changed', { playerId: player.id, ready: player.ready });
    return this.getState();
  }

  stand(id) {
    const player = this._requirePlayer(id);
    if (this.isHandRunning && player.inHand) {
      fail('PLAYER_IN_HAND', '正在参加本局的玩家不能直接离座');
    }
    this.players.delete(player.id);
    this._emit('player-stood', { playerId: player.id, seat: player.seat });
    return this.getState();
  }

  canStartHand() {
    return !this.isHandRunning && this._eligiblePlayers().length >= 2;
  }

  startHand({ seed = undefined, deck = undefined } = {}) {
    if (this.isHandRunning) fail('HAND_IN_PROGRESS', '当前牌局尚未结束');
    const eligible = this._eligiblePlayers();
    if (eligible.length < 2) fail('NOT_ENOUGH_PLAYERS', '至少需要 2 位有筹码且已准备的玩家');

    const previousButton = this.buttonSeat;
    this.handNumber += 1;
    this.handSeed = seed ?? `${String(this.baseSeed)}:${this.handNumber}`;
    this.deck = deck == null ? shuffleDeck(this.handSeed) : normalizedDeck(deck);
    this.deckIndex = 0;
    this.board = [];
    this.burnCards = [];
    this.result = null;
    this.events = [];
    this.currentPlayerId = null;
    this.pending = new Set();

    const eligibleSeats = new Set(eligible.map((player) => player.seat));
    if (this.handNumber === 1 && this.initialButtonSeat != null && eligibleSeats.has(this.initialButtonSeat)) {
      this.buttonSeat = this.initialButtonSeat;
    } else if (this.handNumber === 1 && previousButton == null) {
      this.buttonSeat = Math.min(...eligibleSeats);
    } else {
      this.buttonSeat = this._nextSeat(previousButton, (player) => eligibleSeats.has(player.seat));
    }

    const participantIds = new Set(eligible.map((player) => player.id));
    for (const player of this.players.values()) {
      player.inHand = participantIds.has(player.id);
      player.folded = false;
      player.allIn = false;
      player.holeCards = [];
      player.streetBet = 0;
      player.totalBet = 0;
      player.acted = false;
      player.lastActionBet = 0;
      player.payout = 0;
      player.net = 0;
      player.lastAction = null;
      player.status = player.inHand ? 'active' : player.stack === 0 ? 'busted' : player.ready ? 'waiting' : 'sitting-out';
    }

    if (eligible.length === 2) {
      this.smallBlindSeat = this.buttonSeat;
      this.bigBlindSeat = this._nextParticipantSeat(this.smallBlindSeat);
    } else {
      this.smallBlindSeat = this._nextParticipantSeat(this.buttonSeat);
      this.bigBlindSeat = this._nextParticipantSeat(this.smallBlindSeat);
    }

    this._emit('hand-started', {
      handNumber: this.handNumber,
      seed: this.handSeed,
      buttonSeat: this.buttonSeat,
      smallBlindSeat: this.smallBlindSeat,
      bigBlindSeat: this.bigBlindSeat,
      playerIds: this._participants().map((player) => player.id),
    });

    this._postBlind(this.smallBlindSeat, this.smallBlind, 'small-blind');
    this._postBlind(this.bigBlindSeat, this.bigBlind, 'big-blind');
    this._dealHoleCards();

    this.phase = PHASES.PREFLOP;
    this.currentBet = this.bigBlind;
    this.lastFullRaiseSize = this.bigBlind;
    this.hasFullBet = true;
    this.pending = new Set(this._actionablePlayers().map((player) => player.id));
    this.currentPlayerId = this._nextPendingId(this.bigBlindSeat);
    this._emit('street-started', { phase: this.phase, currentPlayerId: this.currentPlayerId });
    this._stabilize(this.bigBlindSeat);
    return this.getState();
  }

  startNextHand(options = {}) {
    if (this.phase !== PHASES.COMPLETE && this.phase !== PHASES.WAITING) {
      fail('HAND_IN_PROGRESS', '只能在等待或上一局结束后开始新局');
    }
    return this.startHand(options);
  }

  nextHand(options = {}) {
    return this.startNextHand(options);
  }

  legalActions(id = this.currentPlayerId) {
    const empty = {
      canAct: false,
      playerId: id == null ? null : String(id),
      phase: this.phase,
      toCall: 0,
      callAmount: 0,
      currentBet: this.currentBet,
      minBet: this.bigBlind,
      minRaiseTo: null,
      maxRaiseTo: null,
      canRaise: false,
      actions: [],
    };
    if (!this.isHandRunning || id == null) return empty;

    const player = this.players.get(String(id));
    if (!player || player.id !== this.currentPlayerId || !this._isActionable(player)) return empty;

    const callTarget = this._callTarget(player);
    const toCall = Math.max(0, callTarget - player.streetBet);
    const callAmount = Math.min(toCall, player.stack);
    const maxRaiseTo = player.streetBet + player.stack;
    const hasOpponentWhoCanAct = this._actionablePlayers().some((other) => other.id !== player.id);
    const canRaise = hasOpponentWhoCanAct && this._raiseRightsOpen(player);
    const minRaiseTo = this.currentBet === 0
      ? this.bigBlind
      : this.hasFullBet
        ? this.currentBet + this.lastFullRaiseSize
        : this.bigBlind;

    const actions = [{ type: ACTIONS.FOLD }];
    if (toCall === 0) actions.push({ type: ACTIONS.CHECK });
    else actions.push({ type: ACTIONS.CALL, amount: callAmount, to: player.streetBet + callAmount });

    if (hasOpponentWhoCanAct && this.currentBet === 0 && maxRaiseTo >= this.bigBlind) {
      actions.push({ type: ACTIONS.BET, min: this.bigBlind, max: maxRaiseTo });
    } else if (canRaise && this.currentBet > 0 && maxRaiseTo >= minRaiseTo) {
      actions.push({ type: ACTIONS.RAISE, min: minRaiseTo, max: maxRaiseTo });
    }

    const allInIsCall = maxRaiseTo <= callTarget;
    const allInIsAggression = maxRaiseTo > this.currentBet && hasOpponentWhoCanAct && canRaise;
    if (player.stack > 0 && (allInIsCall || allInIsAggression)) {
      actions.push({ type: ACTIONS.ALL_IN, to: maxRaiseTo });
    }

    return {
      canAct: true,
      playerId: player.id,
      phase: this.phase,
      toCall,
      callAmount,
      currentBet: this.currentBet,
      minBet: this.bigBlind,
      minRaiseTo: canRaise && this.currentBet > 0 ? minRaiseTo : null,
      maxRaiseTo,
      canRaise,
      actions,
    };
  }

  getLegalActions(id = this.currentPlayerId) {
    return this.legalActions(id);
  }

  act(id, action, amount = undefined) {
    if (!this.isHandRunning) fail('NO_ACTIVE_HAND', '当前没有可行动的牌局');
    const player = this._requirePlayer(id);
    if (player.id !== this.currentPlayerId) {
      fail('OUT_OF_TURN', `当前轮到玩家 ${this.currentPlayerId} 行动`, { currentPlayerId: this.currentPlayerId });
    }
    const request = normalizeAction(action, amount);
    const legal = this.legalActions(player.id);
    const descriptor = legal.actions.find((candidate) => candidate.type === request.type);
    if (!descriptor) fail('ILLEGAL_ACTION', `当前不能执行 ${request.type}`, legal);

    const fromSeat = player.seat;
    if (request.type === ACTIONS.FOLD) {
      player.folded = true;
      player.acted = true;
      player.status = 'folded';
      player.lastAction = { type: ACTIONS.FOLD, amount: 0, to: player.streetBet };
      this.pending.delete(player.id);
      this._emit('action', { playerId: player.id, action: ACTIONS.FOLD });
    } else if (request.type === ACTIONS.CHECK) {
      player.acted = true;
      player.lastActionBet = player.streetBet;
      player.lastAction = { type: ACTIONS.CHECK, amount: 0, to: player.streetBet };
      this.pending.delete(player.id);
      this._emit('action', { playerId: player.id, action: ACTIONS.CHECK });
    } else if (request.type === ACTIONS.CALL) {
      this._commitChips(player, descriptor.amount);
      player.acted = true;
      player.lastActionBet = player.streetBet;
      player.lastAction = {
        type: ACTIONS.CALL,
        amount: descriptor.amount,
        to: player.streetBet,
        allIn: player.allIn,
      };
      this.pending.delete(player.id);
      this._emit('action', {
        playerId: player.id,
        action: ACTIONS.CALL,
        amount: descriptor.amount,
        to: player.streetBet,
        allIn: player.allIn,
      });
    } else if (request.type === ACTIONS.BET || request.type === ACTIONS.RAISE) {
      integer(request.amount, `${request.type} amount`, { min: descriptor.min, max: descriptor.max });
      this._aggress(player, request.amount, request.type);
    } else if (request.type === ACTIONS.ALL_IN) {
      const target = player.streetBet + player.stack;
      if (target <= this.currentBet) {
        const committed = player.stack;
        this._commitChips(player, committed);
        player.acted = true;
        player.lastActionBet = player.streetBet;
        player.lastAction = {
          type: ACTIONS.ALL_IN,
          mode: 'call',
          amount: committed,
          to: player.streetBet,
          allIn: true,
        };
        this.pending.delete(player.id);
        this._emit('action', {
          playerId: player.id,
          action: ACTIONS.ALL_IN,
          mode: 'call',
          amount: committed,
          to: player.streetBet,
        });
      } else {
        this._aggress(player, target, ACTIONS.ALL_IN);
      }
    }

    this.currentPlayerId = null;
    this._stabilize(fromSeat);
    return this.getState();
  }

  getState({ viewerId = null, revealAll = false } = {}) {
    const normalizedViewer = viewerId == null ? null : String(viewerId);
    const players = [...this.players.values()]
      .sort((left, right) => left.seat - right.seat)
      .map((player) => this._publicPlayer(player, { viewerId: normalizedViewer, revealAll }));
    return {
      phase: this.phase,
      isHandRunning: this.isHandRunning,
      handNumber: this.handNumber,
      handSeed: this.handSeed,
      maxPlayers: this.maxPlayers,
      smallBlind: this.smallBlind,
      bigBlind: this.bigBlind,
      buttonSeat: this.buttonSeat,
      smallBlindSeat: this.smallBlindSeat,
      bigBlindSeat: this.bigBlindSeat,
      currentPlayerId: this.currentPlayerId,
      currentBet: this.currentBet,
      minRaiseSize: this.lastFullRaiseSize,
      board: [...this.board],
      burnCount: this.burnCards.length,
      deckRemaining: Math.max(0, this.deck.length - this.deckIndex),
      pot: this.pot,
      totalCommitted: this.totalCommitted,
      pendingPlayerIds: [...this.pending],
      players,
      legalActions: this.legalActions(),
      result: clone(this.result),
      events: clone(this.events),
    };
  }

  snapshot(options = {}) {
    return this.getState(options);
  }

  _firstOpenSeat() {
    for (let seat = 0; seat < this.maxPlayers; seat += 1) {
      if (!this._playerAtSeat(seat)) return seat;
    }
    return null;
  }

  _playerAtSeat(seat) {
    for (const player of this.players.values()) {
      if (player.seat === seat) return player;
    }
    return null;
  }

  _requirePlayer(id) {
    const playerId = normalizedId(id);
    const player = this.players.get(playerId);
    if (!player) fail('PLAYER_NOT_FOUND', `找不到玩家 ${playerId}`);
    return player;
  }

  _eligiblePlayers() {
    return [...this.players.values()]
      .filter((player) => player.ready && player.stack > 0)
      .sort((left, right) => left.seat - right.seat);
  }

  _participants() {
    return [...this.players.values()]
      .filter((player) => player.inHand)
      .sort((left, right) => left.seat - right.seat);
  }

  _livePlayers() {
    return this._participants().filter((player) => !player.folded);
  }

  _isActionable(player) {
    return player.inHand && !player.folded && !player.allIn && player.stack > 0;
  }

  _actionablePlayers() {
    return this._participants().filter((player) => this._isActionable(player));
  }

  _nextSeat(fromSeat, predicate) {
    const start = fromSeat == null ? this.maxPlayers - 1 : fromSeat;
    for (let offset = 1; offset <= this.maxPlayers; offset += 1) {
      const seat = (start + offset) % this.maxPlayers;
      const player = this._playerAtSeat(seat);
      if (player && predicate(player)) return seat;
    }
    return null;
  }

  _nextParticipantSeat(fromSeat) {
    return this._nextSeat(fromSeat, (player) => player.inHand);
  }

  _orderedPlayersAfter(fromSeat, predicate = () => true) {
    const ordered = [];
    for (let offset = 1; offset <= this.maxPlayers; offset += 1) {
      const seat = ((fromSeat ?? this.maxPlayers - 1) + offset) % this.maxPlayers;
      const player = this._playerAtSeat(seat);
      if (player && predicate(player)) ordered.push(player);
    }
    return ordered;
  }

  _nextPendingId(fromSeat) {
    return this._orderedPlayersAfter(fromSeat, (player) => this.pending.has(player.id) && this._isActionable(player))[0]?.id ?? null;
  }

  _emit(type, data = {}) {
    this.events.push({ index: this.events.length, type, ...clone(data) });
  }

  _draw() {
    if (this.deckIndex >= this.deck.length) fail('DECK_EMPTY', '牌堆已空');
    const card = this.deck[this.deckIndex];
    this.deckIndex += 1;
    return card;
  }

  _postBlind(seat, requested, kind) {
    const player = this._playerAtSeat(seat);
    const amount = Math.min(requested, player.stack);
    this._commitChips(player, amount);
    player.lastAction = { type: kind, amount, to: player.streetBet, allIn: player.allIn };
    this._emit('blind-posted', { playerId: player.id, seat, blind: kind, requested, amount, allIn: player.allIn });
  }

  _dealHoleCards() {
    const dealOrder = this._orderedPlayersAfter(this.buttonSeat, (player) => player.inHand);
    for (let round = 0; round < 2; round += 1) {
      for (const player of dealOrder) player.holeCards.push(this._draw());
    }
    this._emit('hole-cards-dealt', { count: dealOrder.length * 2 });
  }

  _commitChips(player, amount) {
    integer(amount, 'amount', { min: 0, max: player.stack });
    player.stack -= amount;
    player.streetBet += amount;
    player.totalBet += amount;
    if (player.stack === 0) {
      player.allIn = true;
      player.status = 'all-in';
    }
  }

  _raiseRightsOpen(player) {
    if (!player.acted || !this.hasFullBet) return true;
    return this.currentBet - player.lastActionBet >= this.lastFullRaiseSize;
  }

  _callTarget(player) {
    const actionable = this._actionablePlayers();
    if (actionable.length !== 1 || actionable[0].id !== player.id) return this.currentBet;
    let highestOtherBet = 0;
    for (const opponent of this._livePlayers()) {
      if (opponent.id !== player.id) highestOtherBet = Math.max(highestOtherBet, opponent.streetBet);
    }
    return Math.min(this.currentBet, highestOtherBet);
  }

  _aggress(player, target, action) {
    const previousBet = this.currentBet;
    const increment = target - previousBet;
    const committed = target - player.streetBet;
    this._commitChips(player, committed);

    let fullRaise = false;
    if (!this.hasFullBet) {
      fullRaise = target >= this.bigBlind;
      if (fullRaise) {
        this.hasFullBet = true;
        this.lastFullRaiseSize = target;
      }
    } else if (increment >= this.lastFullRaiseSize) {
      fullRaise = true;
      this.lastFullRaiseSize = increment;
    }

    this.currentBet = target;
    player.acted = true;
    player.lastActionBet = target;
    player.lastAction = {
      type: action,
      amount: committed,
      to: target,
      raiseSize: increment,
      fullRaise,
      allIn: player.allIn,
    };

    if (fullRaise) {
      this.pending = new Set(
        this._actionablePlayers().filter((other) => other.id !== player.id).map((other) => other.id),
      );
    } else {
      this.pending.delete(player.id);
      for (const other of this._actionablePlayers()) {
        if (other.id !== player.id && other.streetBet < this.currentBet) this.pending.add(other.id);
      }
    }

    this._emit('action', {
      playerId: player.id,
      action,
      amount: committed,
      to: target,
      previousBet,
      raiseSize: increment,
      fullRaise,
      allIn: player.allIn,
    });
  }

  _stabilize(fromSeat) {
    while (this.isHandRunning) {
      const live = this._livePlayers();
      if (live.length === 1) {
        this._settleByFold(live[0]);
        return;
      }

      for (const id of [...this.pending]) {
        const player = this.players.get(id);
        if (!player || !this._isActionable(player)) this.pending.delete(id);
      }

      const actionable = this._actionablePlayers();
      if (actionable.length === 0) {
        this.pending.clear();
        if (!this._advanceStreet()) return;
        fromSeat = this.buttonSeat;
        continue;
      }

      if (actionable.length === 1) {
        const lonePlayer = actionable[0];
        const mustRespond = this._callTarget(lonePlayer) > lonePlayer.streetBet;
        if (mustRespond) {
          this.pending = new Set([lonePlayer.id]);
          this.currentPlayerId = lonePlayer.id;
          return;
        }
        this.pending.clear();
        if (!this._advanceStreet()) return;
        fromSeat = this.buttonSeat;
        continue;
      }

      if (this.pending.size === 0) {
        if (!this._advanceStreet()) return;
        fromSeat = this.buttonSeat;
        continue;
      }

      if (this.currentPlayerId && this.pending.has(this.currentPlayerId)) return;
      this.currentPlayerId = this._nextPendingId(fromSeat);
      if (this.currentPlayerId) return;
      this.pending.clear();
    }
  }

  _advanceStreet() {
    this.currentPlayerId = null;
    if (this.phase === PHASES.RIVER) {
      this._settleShowdown();
      return false;
    }

    this.burnCards.push(this._draw());
    if (this.phase === PHASES.PREFLOP) {
      this.phase = PHASES.FLOP;
      this.board.push(this._draw(), this._draw(), this._draw());
    } else if (this.phase === PHASES.FLOP) {
      this.phase = PHASES.TURN;
      this.board.push(this._draw());
    } else if (this.phase === PHASES.TURN) {
      this.phase = PHASES.RIVER;
      this.board.push(this._draw());
    } else {
      fail('INVALID_PHASE', `无法从 ${this.phase} 进入下一街`);
    }

    for (const player of this._participants()) {
      player.streetBet = 0;
      player.acted = false;
      player.lastActionBet = 0;
      player.lastAction = null;
    }
    this.currentBet = 0;
    this.lastFullRaiseSize = this.bigBlind;
    this.hasFullBet = false;
    this.pending = new Set(this._actionablePlayers().map((player) => player.id));
    this.currentPlayerId = this._nextPendingId(this.buttonSeat);
    this._emit('street-started', {
      phase: this.phase,
      board: [...this.board],
      currentPlayerId: this.currentPlayerId,
    });
    return true;
  }

  _sidePotLayers() {
    const participants = this._participants();
    const levels = [...new Set(participants.map((player) => player.totalBet).filter((amount) => amount > 0))]
      .sort((left, right) => left - right);
    const layers = [];
    let previous = 0;
    for (const cap of levels) {
      const contributors = participants.filter((player) => player.totalBet >= cap);
      const amount = (cap - previous) * contributors.length;
      const eligible = contributors.filter((player) => !player.folded);
      if (amount > 0) {
        layers.push({
          index: layers.length,
          cap,
          amount,
          contributorIds: contributors.map((player) => player.id),
          eligibleIds: eligible.map((player) => player.id),
        });
      }
      previous = cap;
    }
    return layers;
  }

  _settleByFold(winner) {
    const totalCommitted = this.totalCommitted;
    const awards = Object.fromEntries(this._participants().map((player) => [player.id, 0]));
    const refunds = Object.fromEntries(this._participants().map((player) => [player.id, 0]));
    const payouts = Object.fromEntries(this._participants().map((player) => [player.id, 0]));
    const pots = [];
    for (const layer of this._sidePotLayers()) {
      if (layer.contributorIds.length === 1) {
        refunds[layer.contributorIds[0]] += layer.amount;
        continue;
      }
      awards[winner.id] += layer.amount;
      pots.push({
        ...layer,
        index: pots.length,
        type: pots.length === 0 ? 'main' : 'side',
        eligibleIds: [winner.id],
        winnerIds: [winner.id],
        winners: [winner.id],
        shares: { [winner.id]: layer.amount },
      });
    }
    for (const player of this._participants()) payouts[player.id] = awards[player.id] + refunds[player.id];
    const totalPot = pots.reduce((sum, pot) => sum + pot.amount, 0);
    this._applyPayouts(payouts);
    this.result = {
      reason: 'fold',
      totalPot,
      totalCommitted,
      board: [...this.board],
      winnerIds: [winner.id],
      winners: [winner.id],
      payouts,
      awards,
      refunds,
      hands: {},
      evaluations: {},
      pots,
    };
    this._completeHand();
  }

  _settleShowdown() {
    const live = this._livePlayers();
    const evaluations = new Map();
    for (const player of live) evaluations.set(player.id, evaluateSeven([...player.holeCards, ...this.board]));

    const totalCommitted = this.totalCommitted;
    const awards = Object.fromEntries(this._participants().map((player) => [player.id, 0]));
    const refunds = Object.fromEntries(this._participants().map((player) => [player.id, 0]));
    const payouts = Object.fromEntries(this._participants().map((player) => [player.id, 0]));
    const pots = [];
    const winnerSet = new Set();
    for (const layer of this._sidePotLayers()) {
      if (layer.contributorIds.length === 1) {
        refunds[layer.contributorIds[0]] += layer.amount;
        continue;
      }
      const eligible = layer.eligibleIds.map((id) => this.players.get(id));
      if (eligible.length === 0) fail('POT_WITHOUT_ELIGIBLE_PLAYER', '边池没有可获奖玩家', layer);
      let best = evaluations.get(eligible[0].id);
      for (let index = 1; index < eligible.length; index += 1) {
        const candidate = evaluations.get(eligible[index].id);
        if (compareHands(candidate, best) > 0) best = candidate;
      }
      const tiedIds = eligible
        .filter((player) => compareHands(evaluations.get(player.id), best) === 0)
        .map((player) => player.id);
      const clockwiseWinners = this._orderedPlayersAfter(
        this.buttonSeat,
        (player) => tiedIds.includes(player.id),
      ).map((player) => player.id);
      const baseShare = Math.floor(layer.amount / clockwiseWinners.length);
      let remainder = layer.amount % clockwiseWinners.length;
      const shares = {};
      for (const id of clockwiseWinners) {
        const share = baseShare + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder -= 1;
        shares[id] = share;
        awards[id] += share;
        winnerSet.add(id);
      }
      pots.push({
        ...layer,
        index: pots.length,
        type: pots.length === 0 ? 'main' : 'side',
        winnerIds: clockwiseWinners,
        winners: [...clockwiseWinners],
        shares,
      });
    }

    for (const player of this._participants()) payouts[player.id] = awards[player.id] + refunds[player.id];
    this._applyPayouts(payouts);
    const hands = Object.fromEntries([...evaluations].map(([id, hand]) => [id, hand]));
    const winnerIds = this._orderedPlayersAfter(this.buttonSeat, (player) => winnerSet.has(player.id)).map((player) => player.id);
    this.result = {
      reason: 'showdown',
      totalPot: pots.reduce((sum, pot) => sum + pot.amount, 0),
      totalCommitted,
      board: [...this.board],
      winnerIds,
      winners: [...winnerIds],
      payouts,
      awards,
      refunds,
      hands,
      evaluations: { ...hands },
      pots,
    };
    this._completeHand();
  }

  _applyPayouts(payouts) {
    for (const player of this._participants()) {
      player.payout = payouts[player.id] ?? 0;
      player.net = player.payout - player.totalBet;
      player.stack += player.payout;
    }
  }

  _completeHand() {
    this.phase = PHASES.COMPLETE;
    this.currentPlayerId = null;
    this.pending.clear();
    this.currentBet = 0;
    for (const player of this._participants()) {
      if (player.stack === 0) {
        player.ready = false;
        player.status = 'busted';
      } else if (!player.folded && player.status === 'active') {
        player.status = 'showdown';
      }
    }
    this._emit('hand-completed', this.result);
  }

  _publicPlayer(player, { viewerId = null, revealAll = false } = {}) {
    const showAtShowdown = this.phase === PHASES.COMPLETE
      && this.result?.reason === 'showdown'
      && player.inHand
      && !player.folded;
    const showCards = revealAll || viewerId === player.id || showAtShowdown;
    return {
      id: player.id,
      name: player.name,
      seat: player.seat,
      stack: player.stack,
      ready: player.ready,
      inHand: player.inHand,
      status: player.status,
      folded: player.folded,
      allIn: player.allIn,
      isButton: player.inHand && player.seat === this.buttonSeat,
      isSmallBlind: player.inHand && player.seat === this.smallBlindSeat,
      isBigBlind: player.inHand && player.seat === this.bigBlindSeat,
      holeCards: showCards ? [...player.holeCards] : player.holeCards.map(() => null),
      cards: showCards ? [...player.holeCards] : player.holeCards.map(() => null),
      streetBet: player.streetBet,
      totalBet: player.totalBet,
      totalContribution: player.totalBet,
      lastAction: clone(player.lastAction),
      payout: player.payout,
      net: player.net,
      canAct: player.id === this.currentPlayerId,
    };
  }
}

// Naming aliases keep the engine comfortable in both domain and UI code.
export const HoldemEngine = HoldemGame;

export function createHoldemGame(options = {}) {
  return new HoldemGame(options);
}

export const createHoldemEngine = createHoldemGame;

/**
 * Modest, deliberately fallible AI: only its own cards and public information
 * are used. Pass getState({viewerId: currentPlayerId}), never the game object.
 * A random function may be supplied for reproducible simulations.
 */
export function chooseAction(state, random = Math.random) {
  const legal = state.legalActions;
  if (!legal?.canAct) return null;
  const self = state.players.find((player) => player.id === legal.playerId);
  if (!self) return null;
  const actions = Object.fromEntries(legal.actions.map((action) => [action.type, action]));
  const hole = self.holeCards ?? self.cards;
  if (!hole || hole.length !== 2 || hole.some((card) => card == null)) {
    throw new TypeError('AI 需要仅对自己公开手牌的状态快照');
  }
  const cards = hole.map(parseCard);
  const board = state.board.map(parseCard);
  const values = cards.map((card) => card.value).sort((a, b) => b - a);
  const suited = cards[0].suit === cards[1].suit;
  const pair = values[0] === values[1];
  let strength;
  if (board.length === 0) {
    strength = pair
      ? 0.42 + values[0] * 0.032
      : 0.13 + (values[0] + values[1]) * 0.013
        + (suited ? 0.07 : 0) + (values[0] - values[1] <= 2 ? 0.055 : 0)
        + (values[1] >= 10 ? 0.07 : 0);
  } else {
    const hand = evaluate([...hole, ...state.board]);
    const scale = [0.17, 0.43, 0.62, 0.75, 0.84, 0.89, 0.95, 0.98, 0.995, 1];
    strength = scale[hand.categoryRank] + (hand.tiebreak[0] / 14) * 0.06;
    if (hand.categoryRank === 1) {
      const pairValue = hand.tiebreak[0];
      const ownPair = cards.some((card) => card.value === pairValue);
      const boardHigh = Math.max(...board.map((card) => card.value));
      strength += ownPair ? (pairValue >= boardHigh ? 0.1 : 0.025) : -0.17;
    }
    if (board.length === 5) {
      const boardHand = evaluate(board);
      if (compareHands(hand, boardHand) === 0) strength = Math.min(strength, 0.46);
    } else {
      const all = [...cards, ...board];
      const suitCounts = all.reduce((counts, card) => {
        counts[card.suit] = (counts[card.suit] ?? 0) + 1;
        return counts;
      }, {});
      if (Object.entries(suitCounts).some(([suit, count]) => count === 4 && cards.some((card) => card.suit === suit))) {
        strength += board.length === 3 ? 0.14 : 0.08;
      }
      const ranks = new Set(all.map((card) => card.value));
      if (ranks.has(14)) ranks.add(1);
      for (let low = 1; low <= 10; low += 1) {
        if (Array.from({ length: 5 }, (_, index) => low + index).filter((rank) => ranks.has(rank)).length === 4) {
          strength += board.length === 3 ? 0.075 : 0.04;
          break;
        }
      }
    }
  }
  const opponents = state.players.filter((player) => player.inHand && !player.folded && player.id !== self.id).length;
  strength = Math.max(0.02, Math.min(0.99, strength - Math.max(0, opponents - 1) * 0.018));
  const roll = Math.max(0, Math.min(0.999999, random()));
  const aggression = actions.bet ?? actions.raise;
  const potOdds = legal.callAmount / Math.max(1, state.pot + legal.callAmount);
  const commitment = legal.callAmount / Math.max(1, self.stack);
  const streetStart = state.events.findLastIndex((event) => event.type === 'street-started');
  const raises = state.events.slice(streetStart + 1).filter((event) => event.type === 'action' && event.fullRaise).length;
  const pressured = commitment > 0.33 || raises > 1;
  const raiseChance = strength > 0.83 ? 0.63 : strength > 0.63 ? 0.29 : 0.07;
  if (aggression && roll < raiseChance && (!pressured || strength > 0.83) && raises < 3) {
    const target = state.currentBet === 0
      ? Math.round(state.pot * (strength > 0.8 ? 0.7 : 0.5))
      : state.currentBet + Math.max(state.bigBlind, Math.round((state.pot + legal.callAmount) * 0.55));
    const rounded = Math.round(target / state.smallBlind) * state.smallBlind;
    const to = Math.min(aggression.max, Math.max(aggression.min, rounded));
    return { type: aggression.type, to };
  }
  if (actions.check) return { type: 'check' };
  if (actions.call) {
    const tolerance = strength * 0.8 + 0.08;
    const weak = strength < 0.42 && legal.callAmount > state.bigBlind;
    const shouldFold = strength < potOdds + 0.16
      || (pressured && strength < 0.53)
      || (weak && roll < 0.6)
      || (commitment > tolerance && strength < 0.76 && roll < 0.8);
    if (!shouldFold || (strength > 0.42 && roll > 0.9)) return { type: 'call' };
  }
  return { type: 'fold' };
}

export default HoldemGame;
