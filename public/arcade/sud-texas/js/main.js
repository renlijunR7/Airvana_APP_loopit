import HoldemGame from "./holdem-engine.js";
import { evaluateSeven } from "./poker.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const HERO_ID = "hero";
const autoMode = new URLSearchParams(location.search).get("autoplay") === "1";

const els = {
  gameScreen: $("#gameScreen"), roomPlayerCount: $("#roomPlayerCount"), pauseButton: $("#pauseButton"),
  gamePickerButton: $("#gamePickerButton"), moreButton: $("#moreButton"), recordButton: $("#recordButton"),
  rulesButton: $("#rulesButton"), gamePicker: $("#gamePicker"), moreMenu: $("#moreMenu"),
  modalBackdrop: $("#modalBackdrop"), rulesModal: $("#rulesModal"), raiseModal: $("#raiseModal"),
  recordModal: $("#recordModal"), resultModal: $("#resultModal"), decisionPanel: $("#decisionPanel"),
  heroZone: $("#heroZone"), heroCards: $("#heroCards"), communityCards: $("#communityCards"),
  potValue: $("#potValue"), sidePots: $("#sidePots"), blindLabel: $("#blindLabel"), phaseBadge: $("#phaseBadge"),
  callLabel: $("#callLabel"), callGlyph: $("#callGlyph"), quickBets: $("#quickBets"),
  raiseAmount: $("#raiseAmount"), raiseSlider: $("#raiseSlider"), confirmRaise: $("#confirmRaise"),
  allInRaise: $("#allInRaise"), turnClock: $("#turnClock"), roundMessage: $("#roundMessage"),
  predictionButton: $("#predictionButton"), gameLog: $("#gameLog"), chatForm: $("#chatForm"),
  chatInput: $("#chatInput"), muteButton: $("#muteButton"), giftButton: $("#giftButton"),
  floatingCoins: $("#floatingCoins"), lobbyPanel: $("#lobbyPanel"), lobbyCount: $("#lobbyCount"),
  playerCountValue: $("#playerCountValue"), removePlayer: $("#removePlayer"), addPlayer: $("#addPlayer"),
  startGameButton: $("#startGameButton"), readySummary: $("#readySummary"), recordDelta: $("#recordDelta"),
  recordCards: $("#recordCards"), handRank: $("#handRank"), handCount: $("#handCount"),
  handHistory: $("#handHistory"), resultMedal: $("#resultMedal"), resultHeadline: $("#resultHeadline"),
  resultDetail: $("#resultDetail"), potAwards: $("#potAwards"), resultDelta: $("#resultDelta"),
  nextHandButton: $("#nextHandButton"),
};

const SUITS = {
  s: { symbol: "♠", name: "黑桃", color: "black" }, h: { symbol: "♥", name: "红桃", color: "red" },
  c: { symbol: "♣", name: "梅花", color: "black" }, d: { symbol: "♦", name: "方块", color: "red" },
};

const PROFILES = {
  0: { id: HERO_ID, name: "陌北", avatar: null },
  1: { id: "hei", name: "黑智渊", avatar: "./assets/avatar-hei.png" },
  2: { id: "lv", name: "吕元旋", avatar: "./assets/avatar-lv.png" },
  3: { id: "zhan", name: "占利", avatar: "./assets/avatar-zhan.png" },
  4: { id: "sa", name: "萨静煜", avatar: "./assets/avatar-sa.png" },
  5: { id: "xian", name: "闲俊喆", avatar: "./assets/avatar-xian.png" },
  6: { id: "dorothy", name: "多萝西", avatar: "./assets/avatar-dorothy.png" },
  7: { id: "wuma", name: "巫马木", avatar: "./assets/avatar-sa.png" },
  8: { id: "lu", name: "路文昌", avatar: "./assets/avatar-dorothy.png" },
};

const SEAT_PLANS = {
  2: [0, 4], 3: [0, 3, 6], 4: [0, 2, 4, 6], 5: [0, 2, 4, 5, 7],
  6: [0, 1, 3, 4, 6, 8], 7: [0, 1, 2, 3, 4, 6, 8],
  8: [0, 1, 2, 3, 4, 5, 6, 8], 9: [0, 1, 2, 3, 4, 5, 6, 7, 8],
};

const ACTION_LABELS = {
  fold: "弃牌", check: "让牌", call: "跟注", bet: "下注", raise: "加注", "all-in": "全下",
  "small-blind": "小盲", "big-blind": "大盲",
};
const PHASE_LABELS = { waiting: "等待开局", preflop: "翻牌前", flop: "翻牌", turn: "转牌", river: "河牌", complete: "本局结束" };

let mode = "reference";
let selectedPlayerCount = 6;
let activeSeats = [...SEAT_PLANS[selectedPlayerCount]];
let game = null;
let paused = false;
let muted = true;
let prediction = false;
let botTimer = null;
let messageTimer = null;
let resultTimer = null;
let clockTimer = null;
let clockToken = null;
let eventCursor = 0;
let lastBoardKey = "reference";
let settledHandNumber = 0;
let matchSerial = 1;
let pendingRaiseType = "raise";
let session = { history: [], totalDelta: 0 };

function cardMeta(code) {
  const normalized = String(code).trim().toLowerCase();
  const suitKey = normalized.at(-1);
  const rawRank = normalized.slice(0, -1).toUpperCase();
  const rank = rawRank === "T" ? "10" : rawRank;
  return { code: normalized, rank, suitKey, ...SUITS[suitKey] };
}

function createCard(code, { back = false, delay = 0 } = {}) {
  const card = document.createElement("span");
  card.className = `playing-card ${back ? "card-back" : ""} deal-in`;
  card.style.animationDelay = `${delay}ms`;
  if (back || !code) {
    card.setAttribute("aria-label", "牌背");
    return card;
  }
  const meta = cardMeta(code);
  card.dataset.card = meta.code;
  card.classList.add(meta.color === "red" ? "red-card" : "black-card");
  card.setAttribute("aria-label", `${meta.name}${meta.rank}`);
  card.innerHTML = `<b>${meta.rank}</b><i>${meta.symbol}</i><em>${meta.symbol}</em>`;
  return card;
}

function renderCards(container, cards, { backs = false, overlap = true } = {}) {
  const normalized = Array.isArray(cards) ? cards : [];
  const key = `${backs ? "back" : "face"}:${normalized.map((card) => card ?? "?").join(",")}`;
  if (container.dataset.renderKey === key) return;
  container.dataset.renderKey = key;
  container.replaceChildren();
  normalized.forEach((code, index) => container.append(createCard(code, { back: backs || !code, delay: index * 70 })));
  container.classList.toggle("no-overlap", !overlap);
}

function addLog(message, manager = false) {
  const line = document.createElement("p");
  line.textContent = message;
  line.classList.toggle("manager", manager);
  els.gameLog.append(line);
  while ($$("p", els.gameLog).length > 5) $("p", els.gameLog)?.remove();
}

function showMessage(message, duration = 1050) {
  clearTimeout(messageTimer);
  els.roundMessage.textContent = message;
  els.roundMessage.hidden = false;
  messageTimer = setTimeout(() => { els.roundMessage.hidden = true; }, duration);
}

function hidePopovers() {
  els.gamePicker.hidden = true;
  els.moreMenu.hidden = true;
  els.gamePickerButton.setAttribute("aria-expanded", "false");
}

function openModal(modal) {
  hidePopovers();
  $$(".game-modal").forEach((item) => { item.hidden = item !== modal; });
  els.modalBackdrop.hidden = false;
  modal.hidden = false;
  $("button", modal)?.focus({ preventScroll: true });
}

function closeModals() {
  els.modalBackdrop.hidden = true;
  $$(".game-modal").forEach((item) => { item.hidden = true; });
}

function playTone(frequency = 440, duration = .04) {
  if (muted) return;
  try {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContextCtor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(.055, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
    oscillator.addEventListener("ended", () => context.close(), { once: true });
  } catch { /* audio feedback is optional */ }
}

function seatNode(seatIndex) { return $(`.seat[data-seat-index="${seatIndex}"]`); }

function setVacantSeat(node) {
  if (!node) return;
  node.hidden = false;
  node.classList.remove("seat-occupied", "is-folded", "is-all-in", "is-turn", "is-dealer", "is-small-blind", "is-big-blind", "active-player");
  node.classList.add("vacant-dynamic");
  const invite = $(".invite-icon", node);
  if (invite) invite.hidden = false;
  [".avatar-wrap", ".player-name", ".stack", ".opponent-cards", ".seat-bet", ".seat-action", ".action-tag", ".ready-tag"].forEach((selector) => {
    const target = $(selector, node);
    if (target) target.hidden = true;
  });
  node.setAttribute("aria-label", "空座位");
}

function setOccupiedSeat(node, profile, stack, { lobby = false, player = null, snapshot = null } = {}) {
  if (!node) return;
  node.hidden = false;
  node.classList.remove("vacant-dynamic", "is-folded", "is-all-in", "is-turn", "is-dealer", "is-small-blind", "is-big-blind", "active-player");
  if (node.matches(".empty-seat")) node.classList.add("seat-occupied");
  const invite = $(".invite-icon", node);
  if (invite) invite.hidden = true;
  const avatar = $(".avatar-wrap", node);
  const image = $("img", avatar);
  if (avatar) avatar.hidden = false;
  if (image && profile.avatar) { image.src = profile.avatar; image.alt = `${profile.name}头像`; }
  const name = $(".player-name", node);
  const stackNode = $(".stack", node);
  if (name) { name.hidden = false; name.textContent = profile.name; }
  if (stackNode) { stackNode.hidden = false; stackNode.textContent = String(stack); }
  const oldAction = $(".action-tag", node);
  if (oldAction) oldAction.hidden = true;
  const ready = $(".ready-tag", node);
  if (ready) ready.hidden = !lobby;
  const action = $(".seat-action", node);
  const bet = $(".seat-bet", node);
  const cards = $(".opponent-cards", node);
  if (lobby || !player) {
    if (action) action.hidden = true;
    if (bet) bet.hidden = true;
    if (cards) cards.hidden = true;
  } else {
    const actionType = player.lastAction?.type;
    if (action) {
      action.hidden = !actionType;
      action.textContent = ACTION_LABELS[actionType] ?? actionType ?? "";
      action.className = `seat-action ${actionType ? `action-${actionType}` : ""}`;
    }
    if (bet) { bet.hidden = !player.streetBet; if (player.streetBet) $("b", bet).textContent = String(player.streetBet); }
    if (cards) {
      cards.hidden = !player.inHand || player.holeCards.length === 0;
      if (!cards.hidden) renderCards(cards, player.holeCards, { backs: player.holeCards.some((card) => !card) });
    }
    node.classList.toggle("is-folded", player.folded);
    node.classList.toggle("is-all-in", player.allIn);
    node.classList.toggle("is-turn", snapshot.currentPlayerId === player.id);
    node.classList.toggle("is-dealer", player.isButton);
    node.classList.toggle("is-small-blind", player.isSmallBlind && !player.isButton);
    node.classList.toggle("is-big-blind", player.isBigBlind && !player.isButton);
  }
  node.setAttribute("aria-label", `${profile.name}，筹码 ${stack}`);
}

function renderLobby() {
  activeSeats = [...SEAT_PLANS[selectedPlayerCount]];
  els.roomPlayerCount.textContent = String(selectedPlayerCount);
  els.lobbyCount.textContent = String(selectedPlayerCount);
  els.playerCountValue.textContent = String(selectedPlayerCount);
  els.readySummary.textContent = `${selectedPlayerCount} 位玩家已准备`;
  els.removePlayer.disabled = selectedPlayerCount <= 2;
  els.addPlayer.disabled = selectedPlayerCount >= 9;
  for (let seat = 1; seat <= 8; seat += 1) {
    const node = seatNode(seat);
    if (activeSeats.includes(seat)) setOccupiedSeat(node, PROFILES[seat], 200, { lobby: true });
    else setVacantSeat(node);
  }
  els.heroCards.replaceChildren();
  els.heroCards.dataset.renderKey = "";
  $(".hero-bet", els.heroZone).hidden = true;
  $(".hero-action-tag", els.heroZone).hidden = true;
  $(".hero-avatar > i", els.heroZone).hidden = true;
  $(".stack", els.heroZone).textContent = "200";
  els.turnClock.hidden = true;
}

function openLobby() {
  mode = "lobby";
  paused = false;
  clearRuntimeTimers();
  closeModals();
  hidePopovers();
  els.gameScreen.classList.add("lobby-open");
  els.lobbyPanel.hidden = false;
  els.decisionPanel.hidden = true;
  els.phaseBadge.hidden = true;
  els.pauseButton.textContent = "挂起游戏";
  renderLobby();
  showMessage("选择人数后开始游戏", 900);
}

function createMatch({ preserveStacks = null } = {}) {
  activeSeats = [...SEAT_PLANS[selectedPlayerCount]];
  game = new HoldemGame({ smallBlind: 1, bigBlind: 2, seed: `sud-complete-${matchSerial}`, maxPlayers: 9, buttonSeat: 0 });
  for (const seat of activeSeats) {
    const profile = PROFILES[seat];
    const previous = preserveStacks?.get(profile.id);
    game.sit({ id: profile.id, name: profile.name, seat, stack: previous > 0 ? previous : 200, ready: true });
  }
  matchSerial += 1;
  eventCursor = 0;
  lastBoardKey = "";
  settledHandNumber = 0;
  game.startHand();
}

function startMatch() {
  mode = "play";
  paused = false;
  session = { history: [], totalDelta: 0 };
  clearRuntimeTimers();
  closeModals();
  els.gameScreen.classList.remove("lobby-open");
  els.lobbyPanel.hidden = true;
  createMatch();
  resetLog();
  addLog(`${selectedPlayerCount} 位玩家进入了房间`);
  addLog("小管家：游戏开始。", true);
  renderGame();
  scheduleBotTurn(420);
}

function resetLog() { $$("p", els.gameLog).forEach((line) => line.remove()); }
function currentState({ revealAll = false } = {}) { return game?.getState({ viewerId: HERO_ID, revealAll }); }
function playerName(id) { return Object.values(PROFILES).find((profile) => profile.id === id)?.name ?? id; }

function renderHero(snapshot, hero) {
  const heroStack = $(".stack", els.heroZone);
  const heroBet = $(".hero-bet", els.heroZone);
  const dealer = $(".hero-avatar > i", els.heroZone);
  const action = $(".hero-action-tag", els.heroZone);
  heroStack.textContent = String(hero?.stack ?? 0);
  heroBet.hidden = !hero?.streetBet;
  if (hero?.streetBet) $("b", heroBet).textContent = String(hero.streetBet);
  dealer.hidden = !hero?.isButton;
  els.heroZone.classList.toggle("hero-turn", snapshot.currentPlayerId === HERO_ID && !paused);
  els.heroZone.classList.toggle("is-folded", Boolean(hero?.folded));
  if (hero?.holeCards?.length) {
    renderCards(els.heroCards, hero.holeCards);
    els.heroCards.hidden = false;
    els.heroCards.setAttribute("aria-label", `手牌：${hero.holeCards.map((card) => cardMeta(card).name + cardMeta(card).rank).join("、")}`);
  } else els.heroCards.hidden = true;
  const actionType = hero?.lastAction?.type;
  action.hidden = !actionType;
  action.textContent = ACTION_LABELS[actionType] ?? actionType ?? "";
  action.className = `action-tag hero-action-tag ${actionType ? `action-${actionType}` : ""}`;
  updateHeroControls(snapshot);
}

function updateHeroControls(snapshot) {
  const legal = game.legalActions(HERO_ID);
  const types = new Set(legal.actions.map((action) => action.type));
  const heroTurn = legal.canAct && !paused;
  els.decisionPanel.hidden = !heroTurn;
  const fold = $("[data-action='fold']", els.decisionPanel);
  const call = $("[data-action='call']", els.decisionPanel);
  const raise = $("[data-action='raise']", els.decisionPanel);
  fold.disabled = !types.has("fold");
  const canCheck = types.has("check");
  call.disabled = !(canCheck || types.has("call"));
  call.dataset.resolvedAction = canCheck ? "check" : "call";
  els.callGlyph.textContent = "✓";
  els.callLabel.textContent = canCheck ? "让牌" : `跟注 ${legal.callAmount}`;
  const canAggress = types.has("bet") || types.has("raise");
  const canAllIn = types.has("all-in");
  raise.disabled = !(canAggress || canAllIn);
  $("b", raise).textContent = canAggress ? (types.has("bet") ? "下注" : "加注") : "全下";
  $$("button", els.quickBets).forEach((button) => { button.disabled = !canAggress; });
  setQuickBetLabels(snapshot.phase);
  if (heroTurn) startTurnClock(snapshot); else stopTurnClock();
}

function setQuickBetLabels(phase) {
  const configs = phase === "preflop" ? [[2, "大盲"], [3, "大盲"], [5, "大盲"]] : [["1/2", "底池"], ["2/3", "底池"], [1, "底池"]];
  $$("button", els.quickBets).forEach((button, index) => {
    const [amount, label] = configs[index];
    $("small", button).textContent = amount;
    $("b", button).textContent = label;
    button.dataset.quick = String(amount);
    button.classList.remove("selected");
  });
}

function startTurnClock(snapshot) {
  const token = `${snapshot.handNumber}:${snapshot.phase}:${snapshot.events.length}`;
  if (clockToken === token) return;
  stopTurnClock();
  clockToken = token;
  let remaining = 15;
  els.turnClock.hidden = false;
  const tick = () => {
    $("b", els.turnClock).textContent = String(remaining);
    els.turnClock.style.setProperty("--clock", String(remaining / 15));
    if (remaining <= 0) {
      stopTurnClock();
      const legal = game.legalActions(HERO_ID);
      if (!legal.canAct) return;
      const action = legal.actions.some((item) => item.type === "check") ? "check" : "fold";
      game.act(HERO_ID, action);
      addLog(`陌北：${action === "check" ? "自动让牌" : "超时弃牌"}`);
      renderGame();
      scheduleBotTurn(240);
      return;
    }
    remaining -= 1;
  };
  tick();
  clockTimer = setInterval(tick, 1000);
}

function stopTurnClock() {
  clearInterval(clockTimer);
  clockTimer = null;
  clockToken = null;
  els.turnClock.hidden = true;
}

function processEvents(snapshot) {
  const events = snapshot.events ?? [];
  for (const event of events.slice(eventCursor)) {
    if (event.type === "action") {
      const label = ACTION_LABELS[event.action] ?? event.action;
      const amount = event.to ?? event.amount;
      addLog(`${playerName(event.playerId)}：${label}${amount ? ` ${amount}` : ""}`);
    }
    if (event.type === "street-started" && event.phase !== "preflop") {
      showMessage(PHASE_LABELS[event.phase] ?? event.phase, 760);
      playTone(640, .045);
    }
  }
  eventCursor = events.length;
}

function renderGame() {
  if (!game || mode !== "play") return;
  const snapshot = currentState();
  processEvents(snapshot);
  els.roomPlayerCount.textContent = String(snapshot.players.filter((player) => player.ready || player.inHand).length);
  els.potValue.textContent = String(snapshot.pot);
  els.blindLabel.innerHTML = `小盲/大盲&nbsp;&nbsp;${snapshot.smallBlind}/${snapshot.bigBlind}`;
  els.phaseBadge.hidden = false;
  els.phaseBadge.textContent = `第 ${snapshot.handNumber} 局 · ${PHASE_LABELS[snapshot.phase] ?? snapshot.phase}`;
  els.pauseButton.classList.toggle("is-paused", paused);
  els.pauseButton.textContent = paused ? "继续游戏" : "挂起游戏";
  els.predictionButton.setAttribute("aria-pressed", String(prediction));
  const boardKey = snapshot.board.join(",");
  if (boardKey !== lastBoardKey) { renderCards(els.communityCards, snapshot.board, { overlap: false }); lastBoardKey = boardKey; }
  els.communityCards.hidden = snapshot.board.length === 0;
  const playersBySeat = new Map(snapshot.players.map((player) => [player.seat, player]));
  for (let seat = 1; seat <= 8; seat += 1) {
    const player = playersBySeat.get(seat);
    if (!player) setVacantSeat(seatNode(seat)); else setOccupiedSeat(seatNode(seat), PROFILES[seat], player.stack, { player, snapshot });
  }
  renderHero(snapshot, playersBySeat.get(0));
  const pots = snapshot.result?.pots ?? [];
  els.sidePots.hidden = pots.length <= 1;
  if (!els.sidePots.hidden) els.sidePots.textContent = pots.slice(1).map((pot, index) => `边池${index + 1} ${pot.amount}`).join(" · ");
  if (snapshot.phase === "complete") finishHand(snapshot);
}

function hashUnit(text) {
  let hash = 2166136261;
  for (const char of String(text)) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return (hash >>> 0) / 4294967296;
}

function botStrength(snapshot, player) {
  const cards = player.holeCards ?? [];
  if (cards.length !== 2 || cards.some((card) => !card)) return .35;
  if (snapshot.board.length >= 3) {
    try {
      const hand = evaluateSeven([...cards, ...snapshot.board]);
      return Math.min(.99, .22 + hand.categoryRank / 10 + (hand.tiebreak?.[0] ?? 2) / 80);
    } catch { return .42; }
  }
  const meta = cards.map(cardMeta);
  const values = meta.map((card) => "23456789TJQKA".indexOf(card.rank === "10" ? "T" : card.rank) + 2);
  let score = Math.max(...values) / 18;
  if (values[0] === values[1]) score += .3;
  if (meta[0].suitKey === meta[1].suitKey) score += .08;
  if (Math.abs(values[0] - values[1]) <= 2) score += .06;
  return Math.min(.98, score);
}

function chooseBotAction(playerId) {
  const snapshot = game.getState({ viewerId: playerId });
  const player = snapshot.players.find((item) => item.id === playerId);
  const legal = game.legalActions(playerId);
  const types = new Set(legal.actions.map((action) => action.type));
  const strength = botStrength(snapshot, player);
  const random = hashUnit(`${snapshot.handSeed}:${snapshot.events.length}:${playerId}`);
  const pressure = player.stack ? legal.callAmount / player.stack : 1;
  if (types.has("fold") && legal.toCall > 0 && strength < .43 && (pressure > .16 || random < .22)) return ["fold"];
  if (types.has("all-in") && ((strength > .88 && random > .62) || (player.stack <= snapshot.bigBlind * 5 && strength > .58))) return ["all-in"];
  const aggressive = legal.actions.find((action) => action.type === "raise" || action.type === "bet");
  if (aggressive && strength > .62 && random > .54) {
    const target = Math.max(aggressive.min, Math.min(aggressive.max, snapshot.currentBet + Math.max(snapshot.bigBlind, Math.round(snapshot.pot * (.45 + random * .35)))));
    return [aggressive.type, target];
  }
  if (types.has("check")) return ["check"];
  if (types.has("call") && (strength > .31 || pressure < .12 || random > .2)) return ["call"];
  return ["fold"];
}

function scheduleBotTurn(delay = autoMode ? 45 : 430) {
  clearTimeout(botTimer);
  if (paused || mode !== "play" || !game) return;
  const snapshot = currentState();
  if (snapshot.phase === "complete" || snapshot.currentPlayerId === HERO_ID || !snapshot.currentPlayerId) return;
  botTimer = setTimeout(() => {
    if (paused || mode !== "play") return;
    const state = currentState();
    if (!state.currentPlayerId || state.currentPlayerId === HERO_ID) return;
    const botId = state.currentPlayerId;
    try {
      const [action, amount] = chooseBotAction(botId);
      game.act(botId, action, amount);
      playTone(action === "raise" || action === "bet" ? 570 : 430, .035);
    } catch (error) {
      console.error("机器人行动失败", error);
      const fallback = game.legalActions(botId);
      const type = fallback.actions.some((action) => action.type === "check") ? "check" : fallback.actions.some((action) => action.type === "call") ? "call" : "fold";
      game.act(botId, type);
    }
    renderGame();
    scheduleBotTurn();
  }, delay);
}

function performHeroAction(action, amount) {
  if (!game || paused || mode !== "play") return;
  if (!game.legalActions(HERO_ID).canAct) return;
  try {
    game.act(HERO_ID, action, amount);
    stopTurnClock();
    playTone(action === "raise" || action === "bet" || action === "all-in" ? 640 : 510, .06);
    renderGame();
    scheduleBotTurn(320);
  } catch (error) {
    console.error("玩家行动失败", error);
    showMessage(error.message || "当前无法执行该操作");
  }
}

function showRaiseModal(target = null) {
  const legal = game?.legalActions(HERO_ID);
  if (!legal?.canAct) return;
  const descriptor = legal.actions.find((action) => action.type === "raise" || action.type === "bet");
  const allIn = legal.actions.find((action) => action.type === "all-in");
  if (!descriptor && allIn) return performHeroAction("all-in");
  if (!descriptor) return;
  pendingRaiseType = descriptor.type;
  const safeTarget = Math.max(descriptor.min, Math.min(descriptor.max, Math.round(target ?? Math.max(descriptor.min, currentState().pot / 2))));
  els.raiseSlider.min = String(descriptor.min);
  els.raiseSlider.max = String(descriptor.max);
  els.raiseSlider.step = "1";
  els.raiseSlider.value = String(safeTarget);
  els.raiseAmount.textContent = String(safeTarget);
  els.allInRaise.disabled = !allIn;
  $("#raiseTitle").textContent = descriptor.type === "bet" ? "下注" : "加注";
  openModal(els.raiseModal);
}

function confirmRaise() { const amount = Number(els.raiseSlider.value); closeModals(); performHeroAction(pendingRaiseType, amount); }

function quickRaise(button) {
  const snapshot = currentState();
  const descriptor = game.legalActions(HERO_ID).actions.find((action) => action.type === "raise" || action.type === "bet");
  if (!descriptor) return;
  const raw = button.dataset.quick;
  let target;
  if (snapshot.phase === "preflop" && !raw.includes("/")) target = Number(raw) * snapshot.bigBlind;
  else if (raw.includes("/")) { const [n, d] = raw.split("/").map(Number); target = snapshot.currentBet + Math.round(snapshot.pot * n / d); }
  else target = snapshot.currentBet + Math.round(snapshot.pot * Number(raw));
  showRaiseModal(Math.max(descriptor.min, Math.min(descriptor.max, target)));
}

function finishHand(snapshot) {
  stopTurnClock();
  els.decisionPanel.hidden = true;
  if (settledHandNumber === snapshot.handNumber) return;
  settledHandNumber = snapshot.handNumber;
  const hero = snapshot.players.find((player) => player.id === HERO_ID);
  const result = snapshot.result;
  const delta = hero?.net ?? 0;
  const heroHand = result?.hands?.[HERO_ID];
  const winners = (result?.winnerIds ?? []).map(playerName);
  const outcome = delta > 0 ? "win" : delta < 0 ? "lose" : "tie";
  const category = heroHand?.category ?? (hero?.folded ? "弃牌" : result?.reason === "fold" ? "未摊牌" : "平局");
  session.totalDelta += delta;
  session.history.unshift({ hand: snapshot.handNumber, phase: category, delta, cards: hero?.holeCards ?? [], board: snapshot.board });
  const detail = result?.reason === "fold" ? `${winners.join("、")} 收下底池 ${result.totalPot}` : `${winners.join("、")} 赢得底池 · 你的牌型：${category}`;
  els.resultMedal.textContent = outcome === "win" ? "★" : outcome === "tie" ? "♣" : "♠";
  els.resultHeadline.textContent = outcome === "win" ? "你赢了！" : outcome === "lose" ? "再接再厉" : "本局持平";
  els.resultDetail.textContent = `${detail}${prediction && outcome === "win" ? "，自胜竞猜命中 +200 星币！" : ""}`;
  els.resultDelta.textContent = `${delta >= 0 ? "+" : ""}${delta}`;
  els.resultDelta.style.color = delta >= 0 ? "#1eaa3a" : "#cf472e";
  els.potAwards.replaceChildren();
  (result?.pots ?? []).forEach((pot, index) => {
    const label = document.createElement("span");
    label.textContent = `${index ? `边池 ${index}` : "主池"} ${pot.amount} → ${pot.winnerIds.map(playerName).join("/")}`;
    els.potAwards.append(label);
  });
  els.nextHandButton.textContent = hero?.stack ? "再来一局" : "补充筹码继续";
  addLog("小管家：游戏结束啦！", true);
  updateRecord();
  clearTimeout(resultTimer);
  resultTimer = setTimeout(() => openModal(els.resultModal), autoMode ? 80 : 720);
}

function updateRecord() {
  els.recordDelta.textContent = `${session.totalDelta >= 0 ? "+" : ""}${session.totalDelta}`;
  els.recordDelta.style.color = session.totalDelta < 0 ? "#d7482e" : "#20a52d";
  els.handCount.textContent = String(session.history.length);
  const latest = session.history[0];
  els.handRank.textContent = latest?.phase ?? "等待结算";
  els.recordCards.replaceChildren();
  if (latest) [...latest.cards, ...latest.board].forEach((code) => els.recordCards.append(createCard(code)));
  els.handHistory.replaceChildren();
  session.history.slice(0, 8).forEach((entry) => {
    const row = document.createElement("div");
    row.className = "history-row";
    row.innerHTML = `<span>第 ${entry.hand} 局</span><span>${entry.phase}</span><b class="${entry.delta >= 0 ? "positive" : "negative"}">${entry.delta >= 0 ? "+" : ""}${entry.delta}</b>`;
    els.handHistory.append(row);
  });
}

function nextHand() {
  if (!game || mode !== "play") return;
  closeModals();
  clearRuntimeTimers();
  const state = currentState();
  const readyWithChips = state.players.filter((player) => player.stack > 0);
  const hero = state.players.find((player) => player.id === HERO_ID);
  if (!hero?.stack || readyWithChips.length < 2) {
    createMatch({ preserveStacks: new Map(state.players.map((player) => [player.id, player.stack])) });
  } else {
    readyWithChips.forEach((player) => { if (!player.ready) game.setReady(player.id, true); });
    eventCursor = 0;
    lastBoardKey = "";
    game.startNextHand();
  }
  prediction = false;
  addLog("小管家：新的一局开始。", true);
  renderGame();
  scheduleBotTurn(380);
}

function restartMatch() {
  closeModals();
  if (mode === "reference") return openLobby();
  createMatch();
  session = { history: [], totalDelta: 0 };
  resetLog();
  addLog("小管家：牌局已重新开始。", true);
  mode = "play";
  els.gameScreen.classList.remove("lobby-open");
  els.lobbyPanel.hidden = true;
  renderGame();
  scheduleBotTurn();
}

function clearRuntimeTimers() {
  clearTimeout(botTimer); clearTimeout(resultTimer); clearTimeout(messageTimer); stopTurnClock();
}

function togglePause() {
  if (mode === "reference") { showMessage("参考画面已挂起"); return; }
  if (mode === "lobby") { showMessage("请先开始游戏"); return; }
  paused = !paused;
  clearTimeout(botTimer);
  if (paused) { stopTurnClock(); showMessage("游戏已挂起"); }
  else { showMessage("游戏继续"); renderGame(); scheduleBotTurn(260); }
  els.pauseButton.classList.toggle("is-paused", paused);
  els.pauseButton.textContent = paused ? "继续游戏" : "挂起游戏";
}

function sendGift() {
  els.floatingCoins.replaceChildren();
  for (let index = 0; index < 14; index += 1) {
    const coin = document.createElement("i");
    coin.style.setProperty("--coin-x", `${-40 - Math.random() * 210}px`);
    coin.style.setProperty("--coin-y", `${-180 - Math.random() * 430}px`);
    coin.style.animationDelay = `${index * 35}ms`;
    els.floatingCoins.append(coin);
  }
  addLog("陌北 送出星光礼物");
  playTone(780, .08);
  setTimeout(() => els.floatingCoins.replaceChildren(), 1700);
}

els.heroZone.addEventListener("click", () => {
  if (mode === "reference") return openLobby();
  if (mode === "lobby") return;
  const state = currentState();
  if (state?.phase === "complete") openModal(els.resultModal);
  else if (state?.currentPlayerId !== HERO_ID) showMessage("等待其他玩家行动");
});
els.startGameButton.addEventListener("click", startMatch);
els.removePlayer.addEventListener("click", () => { selectedPlayerCount = Math.max(2, selectedPlayerCount - 1); renderLobby(); });
els.addPlayer.addEventListener("click", () => { selectedPlayerCount = Math.min(9, selectedPlayerCount + 1); renderLobby(); });
els.pauseButton.addEventListener("click", togglePause);

els.gamePickerButton.addEventListener("click", (event) => {
  event.stopPropagation(); const willOpen = els.gamePicker.hidden; hidePopovers(); els.gamePicker.hidden = !willOpen;
  els.gamePickerButton.setAttribute("aria-expanded", String(willOpen));
});
els.moreButton.addEventListener("click", (event) => {
  event.stopPropagation(); const willOpen = els.moreMenu.hidden; hidePopovers(); els.moreMenu.hidden = !willOpen;
});
els.gamePicker.addEventListener("click", () => { hidePopovers(); showMessage("当前游戏：德州扑克"); });
els.moreMenu.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-menu]");
  if (!button) return;
  const action = button.dataset.menu;
  hidePopovers();
  if (action === "lobby") openLobby();
  if (action === "restart") restartMatch();
  if (action === "record") { updateRecord(); openModal(els.recordModal); }
  if (action === "sound") els.muteButton.click();
});
els.rulesButton.addEventListener("click", () => openModal(els.rulesModal));
els.recordButton.addEventListener("click", () => { updateRecord(); openModal(els.recordModal); });
els.modalBackdrop.addEventListener("click", closeModals);
$$('[data-close-modal]').forEach((button) => button.addEventListener("click", closeModals));

els.decisionPanel.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button || button.disabled) return;
  if (button.dataset.action === "fold") performHeroAction("fold");
  if (button.dataset.action === "call") performHeroAction(button.dataset.resolvedAction || "call");
  if (button.dataset.action === "raise") showRaiseModal();
});
els.quickBets.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-quick]");
  if (button && !button.disabled) quickRaise(button);
});
els.raiseSlider.addEventListener("input", () => { els.raiseAmount.textContent = els.raiseSlider.value; });
els.confirmRaise.addEventListener("click", confirmRaise);
els.allInRaise.addEventListener("click", () => { closeModals(); performHeroAction("all-in"); });

els.predictionButton.addEventListener("click", () => {
  prediction = !prediction;
  els.predictionButton.setAttribute("aria-pressed", String(prediction));
  showMessage(prediction ? "已押注：猜自己赢" : "已取消竞猜");
  playTone(prediction ? 720 : 340, .06);
});
els.muteButton.addEventListener("click", () => {
  muted = !muted;
  els.muteButton.classList.toggle("unmuted", !muted);
  els.muteButton.setAttribute("aria-label", muted ? "取消静音" : "静音");
  if (!muted) playTone(590, .06);
  showMessage(muted ? "已静音" : "声音已开启", 800);
});
els.giftButton.addEventListener("click", sendGift);
$$('[data-empty-seat]').forEach((button) => button.addEventListener("click", () => {
  if (mode === "lobby" && selectedPlayerCount < 9) { selectedPlayerCount += 1; renderLobby(); }
  else showMessage("邀请已发送");
}));
els.chatForm.addEventListener("submit", (event) => {
  event.preventDefault(); const message = els.chatInput.value.trim(); if (!message) return;
  addLog(`陌北：${message}`); els.chatInput.value = ""; els.chatInput.blur();
});
els.nextHandButton.addEventListener("click", nextHand);
document.addEventListener("click", (event) => { if (!event.target.closest(".popover, #gamePickerButton, #moreButton")) hidePopovers(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape") { hidePopovers(); closeModals(); } });

window.__SUD_REPLICA__ = {
  get mode() { return mode; }, get engine() { return game; },
  getState: () => game ? currentState({ revealAll: true }) : { mode, selectedPlayerCount },
  openLobby, startMatch, act: performHeroAction, nextHand,
  setPlayerCount(count) {
    selectedPlayerCount = Math.max(2, Math.min(9, Math.round(Number(count) || 6)));
    if (mode !== "lobby") openLobby(); else renderLobby();
  },
};

els.roomPlayerCount.textContent = "2";
els.phaseBadge.hidden = true;
els.turnClock.hidden = true;
els.lobbyPanel.hidden = true;
if (autoMode) setTimeout(openLobby, 250);
