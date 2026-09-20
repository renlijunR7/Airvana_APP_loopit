import { compareHands, evaluateSeven, parseCard, shuffleDeck } from './poker.js';

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

export default HoldemGame;
