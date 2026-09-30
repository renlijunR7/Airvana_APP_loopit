import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

// Load the browser-native ES module without requiring a package.json `type`.
const pokerSource = await readFile(new URL('../js/poker.js', import.meta.url), 'utf8');
const poker = await import(`data:text/javascript;base64,${Buffer.from(pokerSource).toString('base64')}`);

const {
  HAND_CATEGORIES,
  compareHands,
  createDeck,
  evaluateFive,
  evaluateSeven,
  findWinners,
  formatCard,
  parseCard,
  parseCards,
  shuffle,
  shuffleDeck,
} = poker;

test('card parsing and formatting normalize common input forms', () => {
  assert.deepEqual(parseCard('10♠'), {
    rank: 'T',
    suit: 's',
    value: 10,
    code: 'Ts',
    symbol: '♠',
    color: 'black',
  });
  assert.equal(parseCard({ rank: 14, suit: 'hearts' }).code, 'Ah');
  assert.equal(parseCard({ code: 'qd' }).code, 'Qd');
  assert.equal(formatCard('Ts'), '10♠');
  assert.equal(formatCard('a♥', 'code'), 'Ah');
  assert.deepEqual(parseCards('As, Kd Qh'), [parseCard('As'), parseCard('Kd'), parseCard('Qh')]);
  assert.throws(() => parseCard('1x'), /无效牌面/);
});

test('a standard deck has 52 unique canonical cards', () => {
  const deck = createDeck();
  assert.equal(deck.length, 52);
  assert.equal(new Set(deck).size, 52);
  assert.equal(deck[0], '2c');
  assert.equal(deck.at(-1), 'As');
});

test('seeded shuffle is deterministic and does not mutate its input', () => {
  const deck = createDeck();
  const snapshot = [...deck];
  const first = shuffle(deck, 'room-12922-round-1');
  const second = shuffle(deck, 'room-12922-round-1');
  const different = shuffleDeck('room-12922-round-2');

  assert.deepEqual(first, second);
  assert.notDeepEqual(first, different);
  assert.notDeepEqual(first, deck);
  assert.deepEqual(deck, snapshot);
  assert.equal(new Set(first).size, 52);
});

test('five-card evaluator reports every Chinese category', () => {
  const cases = [
    [['As', 'Ks', 'Qs', 'Js', 'Ts'], '皇家同花顺', [14]],
    [['9h', '8h', '7h', '6h', '5h'], '同花顺', [9]],
    [['Ac', 'Ad', 'Ah', 'As', 'Kd'], '四条', [14, 13]],
    [['Ac', 'Ad', 'Ah', 'Kc', 'Kd'], '葫芦', [14, 13]],
    [['Ah', 'Jh', '8h', '4h', '2h'], '同花', [14, 11, 8, 4, 2]],
    [['9c', '8d', '7h', '6s', '5c'], '顺子', [9]],
    [['7c', '7d', '7h', 'As', 'Kd'], '三条', [7, 14, 13]],
    [['As', 'Ad', 'Kc', 'Kd', 'Qh'], '两对', [14, 13, 12]],
    [['Js', 'Jd', 'Ac', 'Kh', '9s'], '一对', [11, 14, 13, 9]],
    [['As', 'Kd', '9h', '7c', '4s'], '高牌', [14, 13, 9, 7, 4]],
  ];

  for (const [cards, category, tiebreak] of cases) {
    const result = evaluateFive(cards);
    assert.equal(result.category, category, cards.join(' '));
    assert.deepEqual(result.tiebreak, tiebreak, cards.join(' '));
    assert.equal(result.name, category);
    assert.ok(Number.isSafeInteger(result.score));
  }
  assert.deepEqual(HAND_CATEGORIES, [
    '高牌', '一对', '两对', '三条', '顺子', '同花', '葫芦', '四条', '同花顺', '皇家同花顺',
  ]);
});

test('ace plays low in A-2-3-4-5 straights', () => {
  const straight = evaluateFive(['As', '2d', '3h', '4c', '5s']);
  const straightFlush = evaluateFive(['Ah', '2h', '3h', '4h', '5h']);
  assert.equal(straight.category, '顺子');
  assert.deepEqual(straight.tiebreak, [5]);
  assert.equal(straight.bestFive.at(-1), 'As');
  assert.equal(straightFlush.category, '同花顺');
  assert.deepEqual(straightFlush.tiebreak, [5]);
});

test('seven-card evaluation chooses the correct best five', () => {
  const twoTrips = evaluateSeven(['Ac', 'Ad', 'Ah', 'Kc', 'Kd', 'Kh', '2s']);
  assert.equal(twoTrips.category, '葫芦');
  assert.deepEqual(twoTrips.tiebreak, [14, 13]);
  assert.deepEqual(new Set(twoTrips.bestFive), new Set(['Ac', 'Ad', 'Ah', 'Kc', 'Kd']));

  const threePairs = evaluateSeven(['As', 'Ad', 'Kc', 'Kd', 'Qh', 'Qs', '2c']);
  assert.equal(threePairs.category, '两对');
  assert.deepEqual(threePairs.tiebreak, [14, 13, 12]);

  const sixCardFlush = evaluateSeven(['Ah', 'Jh', '8h', '4h', '3h', '2h', 'Kc']);
  assert.equal(sixCardFlush.category, '同花');
  assert.deepEqual(sixCardFlush.tiebreak, [14, 11, 8, 4, 3]);
  assert.ok(!sixCardFlush.bestFive.includes('2h'));
});

test('comparison applies category and every kicker in poker order', () => {
  assert.equal(
    compareHands(
      ['Ah', 'Ad', 'Ks', 'Qc', '9d', '4h', '2c'],
      ['As', 'Ac', 'Kh', 'Qd', '8s', '4c', '2d'],
    ),
    1,
  );
  assert.equal(
    compareHands(
      ['5h', '4d', '3s', '2c', 'Ah', 'Kd', 'Qc'],
      ['6h', '5d', '4s', '3c', '2h', 'Ad', 'Kc'],
    ),
    -1,
  );
  assert.equal(
    compareHands(
      ['As', 'Kd', 'Qh', 'Jc', 'Ts', '2d', '3c'],
      ['Ah', 'Kc', 'Qs', 'Jd', 'Th', '4d', '5c'],
    ),
    0,
  );
});

test('winner selection supports community cards and split pots', () => {
  const board = ['Ah', 'Kd', 'Qh', 'Jc', 'Ts'];
  const players = [
    { id: 'north', holeCards: ['2c', '3c'] },
    { id: 'south', holeCards: ['4d', '5d'] },
    { id: 'west', holeCards: ['Ac', 'Ad'] },
  ];
  const winners = findWinners(players, board);
  assert.deepEqual(winners.map(({ player }) => player.id), ['north', 'south', 'west']);
  assert.ok(winners.every(({ hand }) => hand.category === '顺子'));

  const singleWinner = findWinners(
    [
      { id: 'pair', cards: ['As', '2s'] },
      { id: 'straight', cards: ['9c', '8c'] },
    ],
    ['7d', '6h', '5s', 'Ac', 'Kd'],
  );
  assert.deepEqual(singleWinner.map(({ player }) => player.id), ['straight']);
  assert.equal(singleWinner[0].hand.category, '顺子');
});

test('invalid counts and duplicate physical cards are rejected', () => {
  assert.throws(() => evaluateFive(['As', 'Ks']), /5 张牌/);
  assert.throws(() => evaluateSeven(['As', 'Ks', 'Qs', 'Js', 'Ts']), /7 张牌/);
  assert.throws(
    () => evaluateSeven(['As', 'As', 'Qs', 'Js', 'Ts', '2d', '3c']),
    /重复牌/,
  );
});
