import { HoldemGame, evaluate, formatCards, parseCard } from './engine.js';

// Selected only for the easy-to-explain starting pair (9♣ 9♥), not for a win.
// Replays must be labelled as fixed-deal teaching examples in the UI.
const TRAINING_SEED = 'poker-training-3';
const NAMES = ['YOU', 'VIKTOR', 'SCARLETT', 'THE DUKE', 'JACK', 'VALENTINA'];

/** A fresh, waiting table; the caller starts the demonstration with nextHand(). */
export function createTrainingGame() {
  return new HoldemGame({
    smallBlind: 25,
    bigBlind: 50,
    seed: TRAINING_SEED,
    buttonSeat: 0,
    maxPlayers: 6,
    players: NAMES.map((name, seat) => ({
      id: seat === 0 ? 'hero' : `bot-${seat}`,
      name, seat, stack: 2500, ready: true,
    })),
  });
}

/** Teaching opponents keep the hand moving, using only legal-action metadata. */
export function chooseTrainingAction(state) {
  const legal = state?.legalActions;
  if (!legal?.canAct || !Array.isArray(legal.actions)) return null;
  for (const type of ['check', 'call', 'fold']) {
    if (legal.actions.some(action => action.type === type)) return { type };
  }
  return null;
}

function heroOf(state) { return state?.players?.find(player => player.id === 'hero'); }
function ownCards(hero) {
  const cards = hero?.holeCards ?? hero?.cards ?? [];
  return cards.filter(card => card != null);
}

function actionTip(state, hero) {
  if (hero?.folded) return '你已弃牌，本局无需再操作，也不再参与底池分配；仍可观察公共牌和结算。';
  if (hero?.allIn) return '你已全下，本局无需再操作。等待其余玩家行动和发牌；若投入不同，底池会分别结算。';
  const legal = state?.legalActions;
  if (!legal?.canAct || legal.playerId !== 'hero') return '等待其他玩家行动，轮到你时才可操作。';
  const actions = legal.actions ?? [];
  if (actions.some(action => action.type === 'check')) return '当前无需补筹码，可以过牌。下注会投入筹码；弃牌会退出本局。';
  const call = actions.find(action => action.type === 'call');
  if (call) {
    const amount = call.amount ?? legal.callAmount ?? legal.toCall;
    const number = Number.isFinite(amount) ? `${amount} 枚` : '';
    return `跟注需投入 ${number}虚拟筹码；加注会提高当前下注额，弃牌则退出本局。是否可加注以按钮状态为准。`;
  }
  return '仅可使用当前亮起的合法操作。弃牌意味着放弃本局争夺底池的资格。';
}

/** Descriptive rules guidance, never a recommendation based on hidden cards. */
export function getTrainingLesson(state) {
  const hero = heroOf(state), phase = state?.phase ?? 'waiting';
  let lesson;
  if (phase === 'complete') {
    const review = getTrainingReview(state);
    const uncontested = state?.result?.reason === 'fold';
    lesson = {
      step: 5,
      title: '读懂结算与最佳五张牌',
      body: hero?.folded
        ? '你已弃牌；下面的可组成牌型仅用于复盘，不参与本局结算。'
        : uncontested
          ? '其他玩家均已弃牌，本局无需摊牌即可结算。公共牌不足时不显示五张牌型。'
          : `本局已经摊牌，你的最佳牌型为${review.category}。比较的是最佳五张牌，而非单张底牌。`,
      tip: '完成教学即可继续免费练习；赢牌不是完成教学的条件。本地筹码不可转入其他产品。',
    };
  } else if (phase === 'flop') {
    lesson = {
      step: 2,
      title: '翻牌：三张公共牌',
      body: '桌面上的三张牌由仍在牌局中的玩家共用。与自己的两张底牌组合后，已能组成一个五张牌型。',
      tip: actionTip(state, hero),
    };
  } else if (phase === 'turn') {
    lesson = {
      step: 3,
      title: '转牌：重新观察牌型',
      body: '第四张公共牌已发出。用两张底牌和四张公共牌中的最佳五张比较牌型，未必需要使用两张底牌。',
      tip: actionTip(state, hero),
    };
  } else if (phase === 'river') {
    lesson = {
      step: 4,
      title: '河牌：最后一轮行动',
      body: '第五张公共牌已发出，不会再发新的公共牌。从七张可用牌中选出最好的五张；同牌型还要比较点数。',
      tip: actionTip(state, hero),
    };
  } else {
    const hole = ownCards(hero);
    let description = '每人有两张底牌，公共牌尚未发出。小盲 25、大盲 50 是本局开始前的强制下注。';
    if (hole.length === 2) {
      const [a, b] = hole.map(parseCard);
      const feature = a.rank === b.rank ? '点数相同，称为起手对子' : a.suit === b.suit ? '花色相同，称为同花底牌；这还不是五张同花' : '两张牌的点数和花色都可以帮助认识起手牌';
      description = `你的底牌是 ${formatCards(hole)}，${feature}。公共牌尚未发出，最终牌型和胜负还未确定。`;
    }
    lesson = {
      step: 1,
      title: phase === 'waiting' ? '开始一手免费教学' : '翻牌前：认识两张底牌',
      body: description,
      tip: phase === 'waiting' ? '教学使用固定发牌和虚拟筹码，方便重复学习。开始后先观察底牌和盲注。' : actionTip(state, hero),
    };
  }
  return lesson;
}

/** Call with the hero's private view so only their own known cards are evaluated. */
export function getTrainingReview(state) {
  const hero = heroOf(state), hole = ownCards(hero);
  const board = (state?.board ?? []).filter(card => card != null);
  const available = [...hole, ...board];
  const hand = hole.length === 2 && available.length >= 5 && available.length <= 7 ? evaluate(available) : null;
  const folded = Boolean(hero?.folded);
  const won = state?.phase === 'complete' && !folded && Number(state?.result?.awards?.hero ?? 0) > 0;
  const firstLesson = hand
    ? folded
      ? `这些已知牌可组成${hand.category}；你已弃牌，这一牌型仅用于复盘，不参与本局结算。`
      : `最佳五张牌组成${hand.category}；德州可使用 0、1 或 2 张底牌，取决于哪五张组合最好。`
    : '当前已知牌不足以确定你的最佳五张牌型；提前结束的牌局不一定会发完公共牌。';
  const secondLesson = folded
    ? '弃牌后不能赢取本局底池，但仍能观察其余玩家如何完成一手牌。'
    : hero?.allIn
      ? '全下后无需继续操作；不同投入可能形成边池，结算只参与自己有资格争夺的底池。'
      : '过牌不追加筹码；跟注补足本轮差额；下注或加注会增加本轮投入。';
  return {
    category: hand?.category ?? '尚未组成五张牌',
    bestFive: hand ? [...hand.bestFive] : [],
    lessons: [
      firstLesson,
      secondLesson,
      '牌型相同时还要比较点数；最佳五张完全相同，则按规则平分可参与的底池。',
    ],
    folded,
    won: Boolean(won),
  };
}
