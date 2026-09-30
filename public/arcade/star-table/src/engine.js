export const PHASES = Object.freeze({
  PRE_BET: 'PRE_BET',
  LIVE_BET: 'LIVE_BET',
  PLAYING: 'PLAYING',
  RESULT: 'RESULT',
});

export const OUTCOMES = Object.freeze({
  WIN: 'WIN',
  LOSE: 'LOSE',
  NO_BET: 'NO_BET',
});

export const DEFAULT_PLAYERS = Object.freeze([
  Object.freeze({ id: 'p1', name: '星野', initials: '星', color: '#ffbf69' }),
  Object.freeze({ id: 'p2', name: '阿澈', initials: '澈', color: '#58c7b1' }),
  Object.freeze({ id: 'p3', name: '艾琳', initials: '艾', color: '#f58aa8' }),
  Object.freeze({ id: 'p4', name: '洛洛', initials: '洛', color: '#8f9cff' }),
  Object.freeze({ id: 'p5', name: 'Neo', initials: 'N', color: '#c58cff' }),
  Object.freeze({ id: 'p6', name: '米娅', initials: '米', color: '#ff8b73' }),
]);

export const DEFAULT_CONFIG = Object.freeze({
  preBetSeconds: 10,
  liveBetSeconds: 12,
  initialHandCount: 5,
  startingCredits: 10_000,
  allowedStakes: Object.freeze([100, 200, 400]),
  payoutMultiplier: 5,
  maxHistory: 20,
});

const UINT32_RANGE = 0x1_0000_0000;

function message(type, code, text) {
  return { type, code, message: text };
}

function withNotice(state, type, code, text) {
  return { ...state, notice: message(type, code, text) };
}

function hashString(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Convert a number or string seed into a stable unsigned 32-bit value. */
export function normalizeSeed(seed) {
  if (typeof seed === 'number' && Number.isFinite(seed)) {
    return Math.trunc(seed) >>> 0;
  }

  return hashString(String(seed ?? 0));
}

/** One serializable Mulberry32 step. */
export function nextRandom(seed) {
  const nextSeed = (normalizeSeed(seed) + 0x6d2b79f5) >>> 0;
  let value = nextSeed;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  value = ((value ^ (value >>> 14)) >>> 0) / UINT32_RANGE;
  return { value, seed: nextSeed };
}

/** Convenient seeded generator for callers that do not need serialized state. */
export function createSeededRng(seed) {
  let currentSeed = normalizeSeed(seed);
  const random = () => {
    const next = nextRandom(currentSeed);
    currentSeed = next.seed;
    return next.value;
  };
  random.getState = () => currentSeed;
  return random;
}

function positiveInteger(value, fallback) {
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

function normalizeConfig(overrides = {}) {
  const allowedStakes = Array.isArray(overrides.allowedStakes)
    ? [...new Set(overrides.allowedStakes.filter((stake) => Number.isInteger(stake) && stake > 0))]
    : [...DEFAULT_CONFIG.allowedStakes];

  return {
    preBetSeconds: positiveInteger(overrides.preBetSeconds, DEFAULT_CONFIG.preBetSeconds),
    liveBetSeconds: positiveInteger(overrides.liveBetSeconds, DEFAULT_CONFIG.liveBetSeconds),
    initialHandCount: Math.max(
      1,
      positiveInteger(overrides.initialHandCount, DEFAULT_CONFIG.initialHandCount),
    ),
    startingCredits: positiveInteger(overrides.startingCredits, DEFAULT_CONFIG.startingCredits),
    allowedStakes: allowedStakes.length > 0 ? allowedStakes : [...DEFAULT_CONFIG.allowedStakes],
    payoutMultiplier:
      typeof overrides.payoutMultiplier === 'number' && overrides.payoutMultiplier >= 1
        ? overrides.payoutMultiplier
        : DEFAULT_CONFIG.payoutMultiplier,
    maxHistory: Math.max(1, positiveInteger(overrides.maxHistory, DEFAULT_CONFIG.maxHistory)),
  };
}

function makePlayers(playerTemplates, initialHandCount) {
  if (!Array.isArray(playerTemplates) || playerTemplates.length < 2) {
    throw new TypeError('A round needs at least two players.');
  }

  const ids = new Set();
  return playerTemplates.map((player, index) => {
    const id = String(player.id ?? `p${index + 1}`);
    if (ids.has(id)) throw new TypeError(`Duplicate player id: ${id}`);
    ids.add(id);

    const name = String(player.name ?? `玩家 ${index + 1}`);
    return {
      id,
      name,
      initials: String(player.initials ?? name.slice(0, 1)).slice(0, 2),
      color: String(player.color ?? '#8f9cff'),
      handCount: Math.max(1, positiveInteger(player.handCount, initialHandCount)),
      isActive: false,
      isWinner: false,
    };
  });
}

export function createInitialState(options = {}) {
  const config = normalizeConfig(options.config);
  const players = makePlayers(options.players ?? DEFAULT_PLAYERS, config.initialHandCount);
  const requestedStake = options.stake;
  const stake = config.allowedStakes.includes(requestedStake)
    ? requestedStake
    : (config.allowedStakes[1] ?? config.allowedStakes[0]);

  return {
    version: 1,
    roundId: 1,
    phase: PHASES.PRE_BET,
    countdown: config.preBetSeconds,
    credits: positiveInteger(options.credits, config.startingCredits),
    players,
    selectedPlayerId: null,
    stake,
    ticket: null,
    winnerId: null,
    result: null,
    history: [],
    rngState: normalizeSeed(options.seed ?? Date.now()),
    turn: 0,
    settled: false,
    notice: message('info', 'ROUND_READY', '选择你支持的玩家'),
    config,
  };
}

function bettingIsOpen(state) {
  return state.phase === PHASES.PRE_BET || state.phase === PHASES.LIVE_BET;
}

export function selectPlayer(state, playerId) {
  if (!bettingIsOpen(state)) {
    return withNotice(state, 'error', 'BETTING_CLOSED', '本轮竞猜已锁定');
  }
  if (state.ticket) {
    return withNotice(state, 'error', 'BET_ALREADY_PLACED', '本轮已完成竞猜');
  }
  if (!state.players.some((player) => player.id === playerId)) {
    return withNotice(state, 'error', 'UNKNOWN_PLAYER', '该玩家不存在');
  }

  const player = state.players.find((candidate) => candidate.id === playerId);
  return withNotice(
    { ...state, selectedPlayerId: playerId },
    'info',
    'PLAYER_SELECTED',
    `已选择 ${player.name}`,
  );
}

export function selectStake(state, stake) {
  if (!bettingIsOpen(state)) {
    return withNotice(state, 'error', 'BETTING_CLOSED', '本轮竞猜已锁定');
  }
  if (state.ticket) {
    return withNotice(state, 'error', 'BET_ALREADY_PLACED', '本轮已完成竞猜');
  }
  if (!state.config.allowedStakes.includes(stake)) {
    return withNotice(state, 'error', 'INVALID_STAKE', '请选择有效的竞猜积分');
  }

  return withNotice({ ...state, stake }, 'info', 'STAKE_SELECTED', `竞猜积分 ${stake}`);
}

export function placeBet(state) {
  if (!bettingIsOpen(state)) {
    return withNotice(state, 'error', 'BETTING_CLOSED', '本轮竞猜已锁定');
  }
  if (state.ticket) {
    return withNotice(state, 'error', 'BET_ALREADY_PLACED', '本轮已完成竞猜');
  }
  if (!state.selectedPlayerId) {
    return withNotice(state, 'error', 'PLAYER_REQUIRED', '请先选择你支持的玩家');
  }
  if (!state.config.allowedStakes.includes(state.stake)) {
    return withNotice(state, 'error', 'INVALID_STAKE', '请选择有效的竞猜积分');
  }
  if (state.credits < state.stake) {
    return withNotice(state, 'error', 'INSUFFICIENT_CREDITS', '竞猜积分不足');
  }

  const player = state.players.find((candidate) => candidate.id === state.selectedPlayerId);
  const ticket = {
    roundId: state.roundId,
    playerId: state.selectedPlayerId,
    playerName: player?.name ?? state.selectedPlayerId,
    stake: state.stake,
    placedPhase: state.phase,
  };

  return withNotice(
    { ...state, credits: state.credits - state.stake, ticket },
    'success',
    'BET_PLACED',
    `已支持 ${ticket.playerName}`,
  );
}

export function settleRound(state, winnerId) {
  if (state.settled || state.phase === PHASES.RESULT) return state;
  if (state.phase !== PHASES.PLAYING) {
    return withNotice(state, 'error', 'ROUND_NOT_PLAYING', '比赛尚未开始');
  }
  if (!state.players.some((player) => player.id === winnerId)) {
    return withNotice(state, 'error', 'UNKNOWN_WINNER', '无法结算未知玩家');
  }

  const guessedPlayerId = state.ticket?.playerId ?? null;
  const won = Boolean(state.ticket && guessedPlayerId === winnerId);
  const outcome = state.ticket ? (won ? OUTCOMES.WIN : OUTCOMES.LOSE) : OUTCOMES.NO_BET;
  const wager = state.ticket?.stake ?? 0;
  const payout = won ? Math.round(wager * state.config.payoutMultiplier) : 0;
  const creditsAfter = state.credits + payout;
  const result = {
    outcome,
    winnerId,
    guessedPlayerId,
    stake: wager,
    payout,
    netChange: payout - wager,
    creditsAfter,
  };
  const historyEntry = { roundId: state.roundId, ...result };
  const history = [...state.history, historyEntry].slice(-state.config.maxHistory);
  const winner = state.players.find((player) => player.id === winnerId);
  const noticeText = won
    ? `猜中了！+${payout.toLocaleString('zh-CN')}`
    : outcome === OUTCOMES.LOSE
      ? `本轮获胜者是 ${winner?.name ?? winnerId}`
      : `本轮获胜者是 ${winner?.name ?? winnerId}`;

  return {
    ...state,
    phase: PHASES.RESULT,
    countdown: 0,
    credits: creditsAfter,
    players: state.players.map((player) => ({
      ...player,
      isActive: false,
      isWinner: player.id === winnerId,
    })),
    winnerId,
    result,
    history,
    settled: true,
    notice: message(won ? 'success' : 'info', won ? 'BET_WON' : 'ROUND_RESULT', noticeText),
  };
}

function playOneTurn(state) {
  const contenders = state.players.filter((player) => player.handCount > 0);
  if (contenders.length === 0) {
    // This cannot occur through normal play, but retaining a deterministic fallback
    // keeps a restored/corrupt PLAYING state recoverable.
    return settleRound(state, state.players[0].id);
  }

  const random = nextRandom(state.rngState);
  const active = contenders[Math.floor(random.value * contenders.length)];
  let didWin = false;
  const players = state.players.map((player) => {
    if (player.id !== active.id) return { ...player, isActive: false, isWinner: false };
    const handCount = Math.max(0, player.handCount - 1);
    didWin = handCount === 0;
    return { ...player, handCount, isActive: !didWin, isWinner: false };
  });
  const nextState = {
    ...state,
    players,
    rngState: random.seed,
    turn: state.turn + 1,
    notice: message('info', 'CARD_PLAYED', `${active.name} 出了一张牌`),
  };

  return didWin ? settleRound(nextState, active.id) : nextState;
}

function tickOnce(state) {
  switch (state.phase) {
    case PHASES.PRE_BET:
      if (state.countdown > 1) return { ...state, countdown: state.countdown - 1 };
      return withNotice(
        { ...state, phase: PHASES.LIVE_BET, countdown: state.config.liveBetSeconds },
        'info',
        'LIVE_BET_OPEN',
        '实时竞猜开始',
      );
    case PHASES.LIVE_BET:
      if (state.countdown > 1) return { ...state, countdown: state.countdown - 1 };
      return withNotice(
        { ...state, phase: PHASES.PLAYING, countdown: 0 },
        'info',
        'BETTING_LOCKED',
        '竞猜已锁定，比赛开始',
      );
    case PHASES.PLAYING:
      return playOneTurn(state);
    case PHASES.RESULT:
    default:
      return state;
  }
}

/** Advance the game clock by whole seconds. */
export function tick(state, seconds = 1) {
  const amount = Math.max(0, Math.min(10_000, Math.floor(Number(seconds) || 0)));
  let nextState = state;
  for (let elapsed = 0; elapsed < amount; elapsed += 1) {
    const updated = tickOnce(nextState);
    if (updated === nextState && nextState.phase === PHASES.RESULT) break;
    nextState = updated;
  }
  return nextState;
}

export function startNextRound(state, options = {}) {
  if (state.phase !== PHASES.RESULT || !state.settled) {
    return withNotice(state, 'error', 'ROUND_NOT_FINISHED', '当前回合尚未结束');
  }

  const templates = state.players.map(({ id, name, initials, color }) => ({ id, name, initials, color }));
  const next = createInitialState({
    players: templates,
    credits: state.credits,
    config: state.config,
    seed: options.seed ?? state.rngState,
    stake: options.stake ?? state.stake,
  });

  return {
    ...next,
    roundId: state.roundId + 1,
    history: [...state.history],
  };
}
