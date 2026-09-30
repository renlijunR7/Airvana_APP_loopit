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

export default Object.freeze({
  RANKS,
  SUITS,
  SUIT_SYMBOLS,
  HAND_CATEGORIES,
  parseCard,
  parseCards,
  formatCard,
  formatCards,
  createDeck,
  seedToUint32,
  createSeededRandom,
  shuffle,
  shuffleDeck,
  evaluateFive,
  evaluate,
  evaluateSeven,
  compareEvaluations,
  compareHands,
  findWinners,
  getWinners,
});
