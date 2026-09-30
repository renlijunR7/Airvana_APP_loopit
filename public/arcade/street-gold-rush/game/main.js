import {
  DEFAULT_PROFILE,
  clamp,
  createRng,
  difficultyForDistance,
  generatePattern,
  moveTowardLane,
  sanitizeProfile
} from "./logic.js";

const VERSION = "1.0.0";
const STORAGE_KEY = "neighborhood-gold-rush-profile-v1";
const PLAYER_Z = 2.7;
const LANE_COUNT = 3;
const MAX_WORLD_Z = 112;
const FIXED_STEP = 1 / 60;

const canvas = document.querySelector("#gameCanvas");
const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });

const ui = {
  hud: document.querySelector("#hud"),
  home: document.querySelector("#homeScreen"),
  tutorial: document.querySelector("#tutorialScreen"),
  pause: document.querySelector("#pauseScreen"),
  results: document.querySelector("#resultsScreen"),
  runGold: document.querySelector("#runGold"),
  walletGold: document.querySelector("#walletGold"),
  distance: document.querySelector("#distance"),
  multiplier: document.querySelector("#multiplier"),
  powerups: document.querySelector("#powerupRack"),
  bossMeter: document.querySelector("#bossMeter"),
  bossHealth: document.querySelector("#bossHealth"),
  toast: document.querySelector("#toast"),
  combo: document.querySelector("#combo"),
  countdown: document.querySelector("#countdown"),
  muteButton: document.querySelector("#muteButton"),
  pauseButton: document.querySelector("#pauseButton"),
  playButton: document.querySelector("#playButton"),
  tutorialButton: document.querySelector("#tutorialButton"),
  resumeButton: document.querySelector("#resumeButton"),
  quitButton: document.querySelector("#quitButton"),
  retryButton: document.querySelector("#retryButton"),
  homeButton: document.querySelector("#homeButton"),
  buildButton: document.querySelector("#buildButton"),
  buildCost: document.querySelector("#buildCost"),
  homeLevel: document.querySelector("#homeLevel"),
  homeProgress: document.querySelector("#homeProgress"),
  characterHint: document.querySelector("#characterHint"),
  characterLocked: document.querySelector("#characterLocked"),
  worldLocked: document.querySelector("#worldLocked"),
  resultTitle: document.querySelector("#resultTitle"),
  resultDistance: document.querySelector("#resultDistance"),
  resultGold: document.querySelector("#resultGold"),
  resultBest: document.querySelector("#resultBest"),
  bossReward: document.querySelector("#bossReward")
};

const view = {
  width: 1,
  height: 1,
  dpr: 1,
  horizon: 1,
  ground: 1,
  roadNear: 1,
  roadFar: 1,
  laneNear: 1,
  portrait: false
};

function loadProfile() {
  try {
    return sanitizeProfile(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"));
  } catch {
    return sanitizeProfile(DEFAULT_PROFILE);
  }
}

let profile = loadProfile();

function storeProfile() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // The game remains fully playable when storage is unavailable.
  }
  refreshHomeUI();
}

const game = {
  state: "home",
  previousState: "home",
  time: 0,
  ambientTime: 0,
  accumulator: 0,
  lastFrame: performance.now(),
  countdown: 0,
  countdownShown: 0,
  crashTimer: 0,
  runSeed: 1,
  rng: createRng(1),
  distance: 0,
  score: 0,
  runGold: 0,
  speed: 12,
  multiplier: 1,
  lane: 1,
  targetLane: 1,
  laneVisual: 1,
  laneVelocity: 0,
  jumpY: 0,
  jumpVelocity: 0,
  sliding: 0,
  invulnerable: 0,
  entities: [],
  particles: [],
  nextPatternZ: 20,
  patternIndex: 0,
  powerups: {
    magnet: 0,
    shield: 0,
    x2: 0,
    jetpack: 0
  },
  boss: {
    active: false,
    health: 3,
    maxHealth: 3,
    nextDistance: 550,
    throwTimer: 0,
    winsThisRun: 0,
    rewardThisRun: 0,
    defeatedFlash: 0
  },
  shake: 0,
  flash: 0,
  combo: 0,
  comboTimer: 0,
  uiTimer: 0,
  toastTimer: 0,
  musicTimer: 0,
  qaManual: false
};

class AudioManager {
  constructor() {
    this.context = null;
    this.master = null;
    this.muted = Boolean(profile.muted);
    this.musicStep = 0;
  }

  unlock() {
    if (this.context) {
      if (this.context.state === "suspended") this.context.resume();
      return;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    this.context = new AudioContextClass();
    this.master = this.context.createGain();
    this.master.gain.value = this.muted ? 0 : 0.42;
    this.master.connect(this.context.destination);
  }

  setMuted(value) {
    this.muted = Boolean(value);
    profile.muted = this.muted;
    if (this.master && this.context) {
      this.master.gain.cancelScheduledValues(this.context.currentTime);
      this.master.gain.setTargetAtTime(this.muted ? 0 : 0.42, this.context.currentTime, 0.025);
    }
    ui.muteButton.textContent = this.muted ? "×" : "♪";
    ui.muteButton.setAttribute("aria-label", this.muted ? "取消静音" : "静音");
    storeProfile();
  }

  tone(frequency, duration, kind, volume, endFrequency) {
    if (this.muted || !this.context || !this.master) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = kind || "sine";
    oscillator.frequency.setValueAtTime(frequency, now);
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, endFrequency), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume || 0.14, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.025);
  }

  sfx(name) {
    if (!this.context) return;
    if (name === "coin") {
      this.tone(710 + (game.combo % 5) * 44, 0.09, "square", 0.065, 920);
    } else if (name === "jump") {
      this.tone(250, 0.18, "triangle", 0.1, 510);
    } else if (name === "slide") {
      this.tone(210, 0.13, "sawtooth", 0.055, 95);
    } else if (name === "power") {
      this.tone(420, 0.34, "triangle", 0.12, 960);
      window.setTimeout(() => this.tone(690, 0.2, "sine", 0.08, 1120), 90);
    } else if (name === "shield") {
      this.tone(520, 0.28, "sine", 0.11, 230);
    } else if (name === "kick") {
      this.tone(160, 0.17, "square", 0.13, 480);
    } else if (name === "hit") {
      this.tone(125, 0.42, "sawtooth", 0.16, 48);
    } else if (name === "boss") {
      this.tone(110, 0.55, "square", 0.1, 75);
    } else if (name === "build") {
      this.tone(360, 0.18, "triangle", 0.1, 720);
      window.setTimeout(() => this.tone(540, 0.26, "triangle", 0.1, 980), 120);
    } else if (name === "button") {
      this.tone(460, 0.075, "sine", 0.055, 570);
    }
  }

  musicTick(dt) {
    if (game.state !== "running" || this.muted || !this.context) return;
    game.musicTimer -= dt;
    if (game.musicTimer > 0) return;
    const notes = [196, 247, 294, 247, 220, 262, 330, 294];
    const note = notes[this.musicStep % notes.length];
    this.musicStep += 1;
    game.musicTimer = Math.max(0.22, 0.34 - game.speed * 0.003);
    this.tone(note, 0.12, "triangle", 0.018, note * 1.01);
  }
}

const audio = new AudioManager();

function resize() {
  const rect = canvas.getBoundingClientRect();
  view.width = Math.max(1, rect.width);
  view.height = Math.max(1, rect.height);
  view.portrait = view.height > view.width;
  const budgetDpr = Math.min(window.devicePixelRatio || 1, view.portrait ? 1.45 : 1.6);
  view.dpr = budgetDpr;
  canvas.width = Math.round(view.width * view.dpr);
  canvas.height = Math.round(view.height * view.dpr);
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  view.horizon = view.height * (view.portrait ? 0.255 : 0.29);
  view.ground = view.height * 0.965;
  view.roadNear = Math.min(view.width * (view.portrait ? 1.04 : 0.68), view.height * 1.48);
  view.roadFar = Math.max(52, view.width * 0.105);
  view.laneNear = view.roadNear / 3.35;
}

window.addEventListener("resize", resize, { passive: true });
window.addEventListener("orientationchange", resize, { passive: true });
resize();

function project(lane, z, lift) {
  const depth = Math.max(-1, z);
  const p = 1 / (1 + Math.max(0, depth) * 0.045);
  const curved = p * p * (3 - 2 * p);
  const y = view.horizon + (view.ground - view.horizon) * curved - (lift || 0) * 72 * p;
  const laneGap = view.laneNear * p;
  const x = view.width * 0.5 + (lane - 1) * laneGap;
  return { x, y, scale: p, laneGap };
}

function laneWorldX(lane) {
  return lane;
}

function setState(next) {
  game.previousState = game.state;
  game.state = next;
  const playingUI = next === "running" || next === "countdown" || next === "crashed";
  ui.hud.classList.toggle("is-hidden", !playingUI);
  ui.home.classList.toggle("is-hidden", next !== "home");
  ui.tutorial.classList.toggle("is-hidden", next !== "tutorial");
  ui.pause.classList.toggle("is-hidden", next !== "paused");
  ui.results.classList.toggle("is-hidden", next !== "results");
  ui.countdown.textContent = "";
  if (next !== "running") game.musicTimer = 0;
}

function showToast(message, duration) {
  ui.toast.textContent = message;
  ui.toast.classList.add("is-visible");
  game.toastTimer = duration || 1.7;
}

function showCombo(message) {
  ui.combo.textContent = message;
  ui.combo.classList.remove("pop");
  void ui.combo.offsetWidth;
  ui.combo.classList.add("pop");
}

function refreshHomeUI() {
  const level = clamp(Number(profile.homeLevel) || 1, 1, 10);
  const cost = buildCost(level);
  ui.walletGold.textContent = String(Math.floor(profile.totalGold || 0));
  ui.homeLevel.textContent = String(level);
  ui.buildCost.textContent = String(cost);
  ui.homeProgress.style.width = String(((profile.homeXP || 0) % cost) / cost * 100) + "%";
  ui.buildButton.disabled = level >= 10;
  ui.buildButton.textContent = level >= 10 ? "已满级" : "升级 " + cost;
  const characterUnlocked = level >= 3;
  const worldUnlocked = level >= 5;
  ui.characterLocked.querySelector("small").textContent = characterUnlocked ? "已解锁" : "3级解锁";
  ui.worldLocked.querySelector("small").textContent = worldUnlocked ? "已解锁" : "5级解锁";
  ui.characterLocked.classList.toggle("unlocked", characterUnlocked);
  ui.worldLocked.classList.toggle("unlocked", worldUnlocked);
  ui.muteButton.textContent = profile.muted ? "×" : "♪";
}

function buildCost(level) {
  return Math.round(90 + level * level * 30);
}

function attemptBuild() {
  audio.unlock();
  audio.sfx("button");
  const level = Number(profile.homeLevel) || 1;
  if (level >= 10) {
    showToast("树屋已经焕然一新！");
    return;
  }
  const cost = buildCost(level);
  if ((profile.totalGold || 0) < cost) {
    showToast("还差 " + (cost - (profile.totalGold || 0)) + " 根金条");
    return;
  }
  profile.totalGold -= cost;
  profile.homeXP = (profile.homeXP || 0) + cost;
  profile.homeLevel = level + 1;
  storeProfile();
  audio.sfx("build");
  showCombo("树屋升级！");
  showToast(profile.homeLevel === 3 ? "新角色线索已解锁" : profile.homeLevel === 5 ? "海岸世界线索已解锁" : "基地提升到 " + profile.homeLevel + " 级");
}

function prepareRun(seed) {
  const chosenSeed = Number.isFinite(seed) ? Math.floor(seed) : Math.floor(Date.now() % 2147483647);
  game.runSeed = chosenSeed || 1;
  game.rng = createRng(game.runSeed);
  game.distance = 0;
  game.score = 0;
  game.runGold = 0;
  game.speed = 12;
  game.multiplier = 1;
  game.lane = 1;
  game.targetLane = 1;
  game.laneVisual = 1;
  game.laneVelocity = 0;
  game.jumpY = 0;
  game.jumpVelocity = 0;
  game.sliding = 0;
  game.invulnerable = 0;
  game.entities.length = 0;
  game.particles.length = 0;
  game.nextPatternZ = 18;
  game.patternIndex = 0;
  game.powerups.magnet = 0;
  game.powerups.shield = 0;
  game.powerups.x2 = 0;
  game.powerups.jetpack = 0;
  game.boss.active = false;
  game.boss.health = game.boss.maxHealth;
  game.boss.nextDistance = 550;
  game.boss.throwTimer = 0;
  game.boss.winsThisRun = 0;
  game.boss.rewardThisRun = 0;
  game.boss.defeatedFlash = 0;
  game.shake = 0;
  game.flash = 0;
  game.combo = 0;
  game.comboTimer = 0;
  game.qaManual = false;
  ui.bossMeter.classList.add("is-hidden");
  fillWorld();
}

function startCountdown(seed, instant) {
  prepareRun(seed);
  refreshRunUI();
  setState("countdown");
  game.countdown = instant ? 0.02 : 3.05;
  game.countdownShown = 0;
}

function startFromHome() {
  audio.unlock();
  audio.sfx("button");
  if (!profile.tutorialSeen) {
    setState("tutorial");
  } else {
    startCountdown();
  }
}

function finishTutorial() {
  audio.unlock();
  audio.sfx("button");
  profile.tutorialSeen = true;
  storeProfile();
  startCountdown();
}

function pauseGame(auto) {
  if (game.state !== "running" && game.state !== "countdown") return;
  game.previousState = game.state;
  setState("paused");
  if (!auto) audio.sfx("button");
}

function resumeGame() {
  if (game.state !== "paused") return;
  audio.unlock();
  audio.sfx("button");
  setState(game.previousState === "countdown" ? "countdown" : "running");
  game.lastFrame = performance.now();
}

function returnHome() {
  setState("home");
  game.entities.length = 0;
  game.particles.length = 0;
  refreshHomeUI();
}

function finishRun() {
  const distance = Math.floor(game.distance);
  const score = Math.floor(game.score);
  profile.totalGold = Math.max(0, Math.floor(profile.totalGold || 0) + game.runGold);
  profile.bestDistance = Math.max(Number(profile.bestDistance) || 0, distance);
  profile.bestScore = Math.max(Number(profile.bestScore) || 0, score);
  profile.runs = Math.max(0, Number(profile.runs) || 0) + 1;
  profile.bossWins = Math.max(0, Number(profile.bossWins) || 0) + game.boss.winsThisRun;
  storeProfile();
  ui.resultDistance.textContent = distance + "m";
  ui.resultGold.textContent = String(game.runGold);
  ui.resultBest.textContent = Math.floor(profile.bestDistance) + "m";
  ui.resultTitle.textContent = distance > 1000 ? "街区传奇！" : distance > 450 ? "差点抓到他！" : "漂亮的一跑！";
  ui.bossReward.textContent = "首领奖励 +" + game.boss.rewardThisRun + " 金条";
  ui.bossReward.classList.toggle("is-hidden", game.boss.rewardThisRun <= 0);
  setState("results");
}

function entityHeight(type) {
  if (type === "barrier") return 0.72;
  if (type === "sign") return 1.55;
  if (type === "car") return 1.35;
  if (type === "truck") return 1.8;
  if (type === "bomb") return 0.58;
  return 0.3;
}

function addEntity(type, lane, z, extra) {
  const entity = {
    id: game.patternIndex++,
    type,
    lane: clamp(Math.round(lane), 0, LANE_COUNT - 1),
    z,
    y: 0,
    active: true,
    spin: (game.rng() * Math.PI * 2),
    wobble: game.rng() * Math.PI * 2,
    hit: false
  };
  if (extra) Object.assign(entity, extra);
  game.entities.push(entity);
  return entity;
}

function addCoinTrail(lane, startZ, count, spacing, arc) {
  for (let index = 0; index < count; index += 1) {
    const t = count <= 1 ? 0 : index / (count - 1);
    const lift = arc ? Math.sin(t * Math.PI) * 1.45 : 0.12;
    addEntity("coin", lane, startZ + index * spacing, { y: lift });
  }
}

function consumePattern(pattern, baseZ) {
  if (!pattern || !Array.isArray(pattern.rows)) return;
  for (const row of pattern.rows) {
    if (!row || !Array.isArray(row.items)) continue;
    for (const item of row.items) {
      const type = item.type || "coin";
      const z = baseZ + (Number(row.z) || 0);
      if (type === "coinTrail") {
        addCoinTrail(item.lane, z, item.count || 5, item.spacing || 1.4, Boolean(item.arc));
      } else {
        addEntity(type, item.lane, z, { y: Number(item.y) || 0 });
      }
    }
  }
}

function fillWorld() {
  if (game.boss.active) return;
  if (!Number.isFinite(game.nextPatternZ)) game.nextPatternZ = 20;
  while (game.nextPatternZ < MAX_WORLD_Z) {
    const difficulty = difficultyForDistance(game.distance + game.nextPatternZ);
    const pattern = generatePattern(game.rng, difficulty);
    consumePattern(pattern, game.nextPatternZ);
    const span = pattern && Number(pattern.span) ? Number(pattern.span) : 23;
    game.nextPatternZ += span + 4 + game.rng() * 5;
  }
}

function beginBoss() {
  game.boss.active = true;
  game.boss.health = game.boss.maxHealth;
  game.boss.throwTimer = 2.1;
  game.entities = game.entities.filter((entity) => entity.type === "coin" && entity.z < 22);
  addCoinTrail(1, 17, 5, 2.1, false);
  ui.bossMeter.classList.remove("is-hidden");
  ui.bossHealth.style.width = "100%";
  audio.sfx("boss");
  showToast("首领拦路！跳起把炸弹踢回去", 2.8);
}

function throwBossBomb() {
  let lane = Math.floor(game.rng() * 3);
  if (game.rng() < 0.44) lane = game.targetLane;
  addEntity("bomb", lane, 39, { fuse: 4.2 });
  if (game.rng() < 0.65) {
    const coinLane = (lane + 1 + Math.floor(game.rng() * 2)) % 3;
    addCoinTrail(coinLane, 21, 4, 2, false);
  }
}

function defeatBoss() {
  game.boss.active = false;
  game.boss.winsThisRun += 1;
  game.boss.rewardThisRun += 150;
  game.runGold += 150;
  game.boss.nextDistance = game.distance + 900;
  game.boss.defeatedFlash = 1.6;
  game.nextPatternZ = 25;
  ui.bossMeter.classList.add("is-hidden");
  showCombo("首领击退！");
  showToast("追回 150 根金条", 2.2);
  audio.sfx("build");
  burst(view.width * 0.5, view.horizon + 80, "#ffd52a", 28, 250);
}

function handleAction(action) {
  if (game.state !== "running") return false;
  if (action === "left") {
    game.targetLane = clamp(game.targetLane - 1, 0, 2);
    game.lane = game.targetLane;
    return true;
  }
  if (action === "right") {
    game.targetLane = clamp(game.targetLane + 1, 0, 2);
    game.lane = game.targetLane;
    return true;
  }
  if (action === "jump") {
    if (game.jumpY <= 0.02 && game.sliding <= 0) {
      game.jumpVelocity = 8.9;
      game.jumpY = 0.02;
      audio.sfx("jump");
      return true;
    }
    return false;
  }
  if (action === "slide") {
    if (game.jumpY > 0.12) {
      game.jumpVelocity = Math.min(game.jumpVelocity, -7.8);
    } else {
      game.sliding = 0.72;
    }
    audio.sfx("slide");
    return true;
  }
  return false;
}

class InputController {
  constructor(target) {
    this.target = target;
    this.pointerId = null;
    this.startX = 0;
    this.startY = 0;
    this.startTime = 0;
    this.triggered = false;
    target.addEventListener("pointerdown", (event) => this.down(event));
    target.addEventListener("pointermove", (event) => this.move(event));
    target.addEventListener("pointerup", (event) => this.up(event));
    target.addEventListener("pointercancel", (event) => this.cancel(event));
    window.addEventListener("keydown", (event) => this.key(event));
  }

  down(event) {
    if (event.target !== canvas || this.pointerId !== null) return;
    audio.unlock();
    this.pointerId = event.pointerId;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.startTime = performance.now();
    this.triggered = false;
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is optional.
    }
  }

  move(event) {
    if (event.pointerId !== this.pointerId || this.triggered) return;
    const dx = event.clientX - this.startX;
    const dy = event.clientY - this.startY;
    const threshold = Math.max(24, Math.min(view.width, view.height) * 0.045);
    if (Math.hypot(dx, dy) < threshold) return;
    this.triggered = true;
    this.dispatch(dx, dy);
  }

  up(event) {
    if (event.pointerId !== this.pointerId) return;
    if (!this.triggered) {
      const dx = event.clientX - this.startX;
      const dy = event.clientY - this.startY;
      const elapsed = Math.max(1, performance.now() - this.startTime);
      if (Math.hypot(dx, dy) > 18 && elapsed < 450) this.dispatch(dx, dy);
    }
    this.pointerId = null;
  }

  cancel(event) {
    if (event.pointerId === this.pointerId) this.pointerId = null;
  }

  dispatch(dx, dy) {
    if (Math.abs(dx) > Math.abs(dy) * 1.05) {
      handleAction(dx < 0 ? "left" : "right");
    } else {
      handleAction(dy < 0 ? "jump" : "slide");
    }
  }

  key(event) {
    if (event.repeat && event.code !== "ArrowLeft" && event.code !== "ArrowRight") return;
    let action = "";
    if (event.code === "ArrowLeft" || event.code === "KeyA") action = "left";
    if (event.code === "ArrowRight" || event.code === "KeyD") action = "right";
    if (event.code === "ArrowUp" || event.code === "KeyW" || event.code === "Space") action = "jump";
    if (event.code === "ArrowDown" || event.code === "KeyS") action = "slide";
    if (event.code === "Escape" || event.code === "KeyP") {
      if (game.state === "paused") resumeGame();
      else pauseGame(false);
      event.preventDefault();
      return;
    }
    if (action) {
      audio.unlock();
      if (handleAction(action)) event.preventDefault();
    }
  }
}

new InputController(canvas);

function collectCoin(entity) {
  entity.active = false;
  game.combo += 1;
  game.comboTimer = 1.35;
  const value = game.powerups.x2 > 0 ? 2 : 1;
  game.runGold += value;
  game.score += 10 * value * game.multiplier;
  const point = project(entity.lane, entity.z, entity.y);
  burst(point.x, point.y, "#ffd72d", 5, 80);
  audio.sfx("coin");
  if (game.combo === 10 || game.combo === 25 || game.combo % 50 === 0) {
    showCombo(game.combo + " 连续金条！");
  }
}

function collectPowerup(entity) {
  entity.active = false;
  const type = entity.type;
  if (type === "magnet") game.powerups.magnet = 8;
  if (type === "shield") game.powerups.shield = 1;
  if (type === "x2") game.powerups.x2 = 10;
  if (type === "jetpack") {
    game.powerups.jetpack = 6.5;
    game.jumpY = Math.max(game.jumpY, 2.5);
    game.jumpVelocity = 0;
  }
  const labels = {
    magnet: "金币磁铁启动",
    shield: "护盾已装备",
    x2: "双倍金条",
    jetpack: "喷气背包起飞"
  };
  showCombo(labels[type] || "能量启动");
  audio.sfx("power");
  const point = project(entity.lane, entity.z, 0.4);
  burst(point.x, point.y, type === "shield" ? "#66e5ff" : "#ffed4d", 16, 160);
}

function burst(x, y, color, count, energy) {
  const total = Math.min(36, Math.max(1, count || 6));
  for (let index = 0; index < total; index += 1) {
    const angle = game.rng() * Math.PI * 2;
    const speed = (0.35 + game.rng() * 0.65) * (energy || 100);
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - speed * 0.3,
      gravity: 150 + game.rng() * 130,
      life: 0.45 + game.rng() * 0.45,
      maxLife: 0.9,
      size: 2 + game.rng() * 5,
      color,
      shape: game.rng() > 0.55 ? "star" : "dot"
    });
  }
  if (game.particles.length > 180) game.particles.splice(0, game.particles.length - 180);
}

function kickBomb(entity) {
  entity.type = "bombBack";
  entity.hit = true;
  entity.z = PLAYER_Z + 1;
  entity.y = Math.max(0.5, game.jumpY);
  entity.returnSpeed = 34;
  game.jumpVelocity = Math.max(game.jumpVelocity, 4.8);
  game.score += 250 * game.multiplier;
  game.shake = Math.max(game.shake, 0.26);
  showCombo("炸弹回旋踢！");
  audio.sfx("kick");
  const point = project(game.laneVisual, PLAYER_Z, game.jumpY);
  burst(point.x, point.y, "#ffb632", 18, 190);
}

function takeHit(entity) {
  if (game.invulnerable > 0 || game.powerups.jetpack > 0) {
    entity.active = false;
    return;
  }
  if (game.powerups.shield > 0) {
    game.powerups.shield = 0;
    game.invulnerable = 1.4;
    entity.active = false;
    game.shake = 0.48;
    game.flash = 0.32;
    audio.sfx("shield");
    showCombo("护盾救援！");
    const point = project(game.laneVisual, PLAYER_Z, 0.7);
    burst(point.x, point.y, "#69eaff", 22, 210);
    return;
  }
  entity.active = false;
  game.shake = 1;
  game.flash = 0.65;
  game.crashTimer = 1.15;
  audio.sfx("hit");
  showCombo("哎呀！");
  setState("crashed");
}

function obstacleCleared(entity) {
  if (entity.type === "barrier") return game.jumpY > entityHeight(entity.type);
  if (entity.type === "sign") return game.sliding > 0.05;
  if (entity.type === "bomb") return game.jumpY > entityHeight(entity.type);
  return false;
}

function updateEntity(entity, dt) {
  if (!entity.active) return;
  entity.spin += dt * 5;
  entity.wobble += dt * 2.2;

  if (entity.type === "bombBack") {
    entity.z += entity.returnSpeed * dt;
    entity.y = 0.7 + Math.sin((entity.z - PLAYER_Z) * 0.18) * 0.7;
    if (game.boss.active && entity.z >= 30) {
      entity.active = false;
      game.boss.health = Math.max(0, game.boss.health - 1);
      ui.bossHealth.style.width = (game.boss.health / game.boss.maxHealth * 100) + "%";
      const point = project(1, 31, 1);
      burst(point.x, point.y, "#ff8b28", 28, 260);
      game.shake = 0.72;
      audio.sfx("hit");
      if (game.boss.health <= 0) defeatBoss();
      else showToast("命中！还要 " + game.boss.health + " 次");
    }
    if (entity.z > 55) entity.active = false;
    return;
  }

  entity.z -= game.speed * dt;
  if (entity.type === "bomb" && entity.fuse) entity.fuse -= dt;

  const laneGap = Math.abs(entity.lane - game.laneVisual);
  const withinLane = laneGap < 0.38;

  if (entity.type === "coin") {
    const magnetic = game.powerups.magnet > 0 && entity.z < 17 && entity.z > 1;
    const flying = game.powerups.jetpack > 0 && entity.z < 12;
    if (magnetic || flying) {
      const pull = 1 - Math.exp(-dt * 8);
      entity.lane += (game.laneVisual - entity.lane) * pull;
      entity.y += (Math.max(0.5, game.jumpY) - entity.y) * pull;
    }
    if (entity.z <= 3.8 && entity.z >= 0.6 && (withinLane || magnetic || flying)) {
      collectCoin(entity);
    }
  } else if (entity.type === "magnet" || entity.type === "shield" || entity.type === "x2" || entity.type === "jetpack") {
    if (entity.z <= 3.8 && entity.z >= 0.8 && (withinLane || game.powerups.jetpack > 0)) collectPowerup(entity);
  } else if (!entity.checked && entity.z <= 3.9 && entity.z >= 1.2 && withinLane) {
    entity.checked = true;
    if (entity.type === "bomb" && obstacleCleared(entity)) {
      kickBomb(entity);
    } else if (!obstacleCleared(entity)) {
      takeHit(entity);
    } else {
      game.score += 35 * game.multiplier;
      game.combo += 2;
    }
  }

  if (entity.z < -5) entity.active = false;
}

function updatePlayer(dt) {
  game.laneVisual = moveTowardLane(game.laneVisual, game.targetLane, dt, 0.155);
  game.laneVelocity = (game.targetLane - game.laneVisual) * 8;

  if (game.powerups.jetpack > 0) {
    game.jumpY += (2.85 - game.jumpY) * (1 - Math.exp(-dt * 7));
    game.jumpVelocity = 0;
    game.sliding = 0;
  } else if (game.jumpY > 0 || game.jumpVelocity > 0) {
    game.jumpVelocity -= 23.5 * dt;
    game.jumpY += game.jumpVelocity * dt;
    if (game.jumpY <= 0) {
      game.jumpY = 0;
      game.jumpVelocity = 0;
    }
  }

  game.sliding = Math.max(0, game.sliding - dt);
  game.invulnerable = Math.max(0, game.invulnerable - dt);
}

function updatePowerups(dt) {
  game.powerups.magnet = Math.max(0, game.powerups.magnet - dt);
  game.powerups.x2 = Math.max(0, game.powerups.x2 - dt);
  game.powerups.jetpack = Math.max(0, game.powerups.jetpack - dt);
  game.boss.defeatedFlash = Math.max(0, game.boss.defeatedFlash - dt);
}

function updateParticles(dt) {
  for (const particle of game.particles) {
    particle.life -= dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vy += particle.gravity * dt;
    particle.vx *= Math.pow(0.93, dt * 60);
  }
  game.particles = game.particles.filter((particle) => particle.life > 0);
}

function updateBoss(dt) {
  if (!game.boss.active) {
    if (game.distance >= game.boss.nextDistance) beginBoss();
    return;
  }
  game.boss.throwTimer -= dt;
  if (game.boss.throwTimer <= 0) {
    throwBossBomb();
    game.boss.throwTimer = Math.max(1.9, 3.1 - game.distance / 1800) + game.rng() * 0.55;
  }
}

function updateRunning(dt) {
  if (game.qaManual) return;
  const previousDistance = game.distance;
  game.speed = Math.min(27, 12 + Math.sqrt(game.distance) * 0.34);
  game.distance += game.speed * dt * 0.72;
  game.multiplier = Math.min(5, 1 + Math.floor(game.distance / 240));
  const activeMultiplier = game.multiplier * (game.powerups.x2 > 0 ? 2 : 1);
  game.score += (game.distance - previousDistance) * activeMultiplier * 4;
  game.nextPatternZ -= game.speed * dt;

  updatePlayer(dt);
  updatePowerups(dt);
  updateBoss(dt);
  for (const entity of game.entities) updateEntity(entity, dt);
  game.entities = game.entities.filter((entity) => entity.active);
  fillWorld();
  audio.musicTick(dt);

  if (game.comboTimer > 0) {
    game.comboTimer -= dt;
    if (game.comboTimer <= 0) game.combo = 0;
  }
  game.shake = Math.max(0, game.shake - dt * 2.6);
  game.flash = Math.max(0, game.flash - dt * 2.2);

  game.uiTimer -= dt;
  if (game.uiTimer <= 0) {
    game.uiTimer = 0.08;
    refreshRunUI();
  }
}

function updateCountdown(dt) {
  game.countdown -= dt;
  const shown = Math.ceil(game.countdown);
  if (shown > 0) {
    ui.countdown.textContent = String(shown);
    if (shown !== game.countdownShown) {
      game.countdownShown = shown;
      audio.sfx("button");
    }
  } else {
    setState("running");
    ui.countdown.textContent = "跑！";
    window.setTimeout(() => {
      if (game.state === "running") ui.countdown.textContent = "";
    }, 450);
  }
}

function fixedUpdate(dt) {
  game.time += dt;
  game.ambientTime += dt;

  if (game.toastTimer > 0) {
    game.toastTimer -= dt;
    if (game.toastTimer <= 0) ui.toast.classList.remove("is-visible");
  }

  updateParticles(dt);

  if (game.state === "countdown") updateCountdown(dt);
  else if (game.state === "running") updateRunning(dt);
  else if (game.state === "crashed") {
    game.crashTimer -= dt;
    game.shake = Math.max(0, game.shake - dt * 1.8);
    game.flash = Math.max(0, game.flash - dt * 1.5);
    if (game.crashTimer <= 0) finishRun();
  }
}

function refreshRunUI() {
  ui.runGold.textContent = String(game.runGold);
  ui.distance.textContent = String(Math.floor(game.distance));
  const shownMultiplier = game.multiplier * (game.powerups.x2 > 0 ? 2 : 1);
  ui.multiplier.textContent = "×" + shownMultiplier;
  refreshPowerupRack();
}

function refreshPowerupRack() {
  const chips = [];
  if (game.powerups.magnet > 0) chips.push(["🧲", game.powerups.magnet]);
  if (game.powerups.shield > 0) chips.push(["◈", game.powerups.shield]);
  if (game.powerups.x2 > 0) chips.push(["×2", game.powerups.x2]);
  if (game.powerups.jetpack > 0) chips.push(["🚀", game.powerups.jetpack]);
  ui.powerups.innerHTML = chips.map((chip) => {
    const time = chip[1] > 1 ? Math.ceil(chip[1]) : "";
    return '<span class="power-chip">' + chip[0] + '<i>' + time + "</i></span>";
  }).join("");
}

function roundedRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function polygon(points) {
  if (!points.length) return;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let index = 1; index < points.length; index += 1) ctx.lineTo(points[index][0], points[index][1]);
  ctx.closePath();
}

function fillStroke(fill, stroke, width) {
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width || 1;
    ctx.stroke();
  }
}

function drawCloud(x, y, scale, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x, y, 24 * scale, Math.PI, 0);
  ctx.arc(x + 29 * scale, y - 10 * scale, 31 * scale, Math.PI, 0);
  ctx.arc(x + 64 * scale, y, 23 * scale, Math.PI, 0);
  ctx.rect(x - 24 * scale, y, 112 * scale, 23 * scale);
  ctx.fill();
  ctx.restore();
}

function drawSky() {
  const sky = ctx.createLinearGradient(0, 0, 0, view.horizon + 80);
  sky.addColorStop(0, "#5acbff");
  sky.addColorStop(0.58, "#9ae5ff");
  sky.addColorStop(1, "#f0fbff");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, view.width, view.height);

  const sunX = view.width * 0.78;
  const sunY = view.height * 0.14;
  const sunRadius = Math.min(view.width, view.height) * 0.075;
  const glow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius * 1.8);
  glow.addColorStop(0, "rgba(255,248,164,0.95)");
  glow.addColorStop(0.55, "rgba(255,231,101,0.55)");
  glow.addColorStop(1, "rgba(255,231,101,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - sunRadius * 2, sunY - sunRadius * 2, sunRadius * 4, sunRadius * 4);

  const cloudShift = (game.ambientTime * 4) % (view.width + 260);
  drawCloud((view.width * 0.13 + cloudShift) % (view.width + 180) - 110, view.height * 0.13, 0.78, 0.74);
  drawCloud((view.width * 0.62 + cloudShift * 0.55) % (view.width + 220) - 100, view.height * 0.2, 0.5, 0.62);

  const baseY = view.horizon + 15;
  ctx.fillStyle = "#8bc4d2";
  const buildingWidth = Math.max(38, view.width / 18);
  for (let index = -1; index < Math.ceil(view.width / buildingWidth) + 1; index += 1) {
    const height = 24 + ((index * 31 + 67) % 48);
    const x = index * buildingWidth;
    ctx.fillRect(x, baseY - height, buildingWidth - 5, height);
    ctx.fillStyle = "#d8f0ed";
    for (let wy = baseY - height + 9; wy < baseY - 7; wy += 13) {
      ctx.fillRect(x + 8, wy, 5, 5);
      ctx.fillRect(x + 21, wy, 5, 5);
    }
    ctx.fillStyle = "#8bc4d2";
  }
}

function roadXAtY(side, y) {
  const t = clamp((y - view.horizon) / (view.ground - view.horizon), 0, 1);
  const eased = t * t * (3 - 2 * t);
  const half = view.roadFar * 0.5 + (view.roadNear * 0.5 - view.roadFar * 0.5) * eased;
  return view.width * 0.5 + side * half;
}

function drawGround() {
  const leftFar = view.width * 0.5 - view.roadFar * 0.5;
  const rightFar = view.width * 0.5 + view.roadFar * 0.5;
  const leftNear = view.width * 0.5 - view.roadNear * 0.5;
  const rightNear = view.width * 0.5 + view.roadNear * 0.5;

  ctx.fillStyle = "#67bd55";
  ctx.fillRect(0, view.horizon, view.width, view.height - view.horizon);

  polygon([
    [0, view.horizon + 2],
    [leftFar - 5, view.horizon + 2],
    [leftNear - view.roadNear * 0.08, view.height],
    [0, view.height]
  ]);
  const canal = ctx.createLinearGradient(0, view.horizon, 0, view.height);
  canal.addColorStop(0, "#83dff3");
  canal.addColorStop(1, "#168fc7");
  fillStroke(canal);

  const road = ctx.createLinearGradient(0, view.horizon, 0, view.height);
  road.addColorStop(0, "#737e85");
  road.addColorStop(1, "#404b54");
  polygon([
    [leftFar, view.horizon],
    [rightFar, view.horizon],
    [rightNear, view.height],
    [leftNear, view.height]
  ]);
  fillStroke(road);

  polygon([
    [leftFar - 6, view.horizon],
    [leftFar, view.horizon],
    [leftNear, view.height],
    [leftNear - 26, view.height]
  ]);
  fillStroke("#d8d1bc");
  polygon([
    [rightFar, view.horizon],
    [rightFar + 6, view.horizon],
    [rightNear + 26, view.height],
    [rightNear, view.height]
  ]);
  fillStroke("#d8d1bc");

  drawLaneMarkers();
  drawCanalHighlights(leftFar, leftNear);
  drawRoadsideProps();
}

function drawLaneMarkers() {
  const offset = (game.distance * 1.6 + game.ambientTime * (game.state === "home" ? 4 : 0)) % 11;
  for (let laneDivider = 1; laneDivider <= 2; laneDivider += 1) {
    for (let z = 2 - offset; z < 100; z += 11) {
      if (z < 0) continue;
      const near = project(laneDivider - 0.5, z, 0);
      const far = project(laneDivider - 0.5, z + 4, 0);
      const widthNear = Math.max(1.2, 5.5 * near.scale);
      ctx.strokeStyle = "rgba(241,244,227,0.72)";
      ctx.lineWidth = widthNear;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(near.x, near.y);
      ctx.lineTo(far.x, far.y);
      ctx.stroke();
    }
  }
}

function drawCanalHighlights(leftFar, leftNear) {
  ctx.save();
  ctx.strokeStyle = "rgba(224,252,255,0.65)";
  ctx.lineWidth = 2;
  const offset = (game.ambientTime * 19 + game.distance * 0.8) % 34;
  for (let y = view.horizon + 20 - offset; y < view.height; y += 34) {
    const edge = roadXAtY(-1, y);
    ctx.beginPath();
    ctx.moveTo(Math.max(0, edge - 100), y);
    ctx.lineTo(edge - 14, y + 1);
    ctx.stroke();
  }
  ctx.restore();
}

function drawRoadsideProps() {
  const movingDistance = game.state === "home" ? game.ambientTime * 4 : game.distance * 1.38;
  const offset = movingDistance % 14;
  const props = [];
  for (let z = 4 - offset; z < 92; z += 14) {
    if (z < 1) continue;
    props.push({ z, side: -1, kind: Math.floor((z + movingDistance) / 14) % 3 });
    props.push({ z: z + 6.5, side: 1, kind: (Math.floor((z + movingDistance) / 14) + 1) % 3 });
  }
  props.sort((a, b) => b.z - a.z);
  for (const prop of props) drawRoadsideProp(prop);
}

function drawRoadsideProp(prop) {
  const point = project(prop.side < 0 ? -0.78 : 2.78, prop.z, 0);
  const s = point.scale * Math.min(view.width, view.height) / 520;
  if (prop.kind === 0) {
    drawTree(point.x, point.y, s, prop.side);
  } else if (prop.kind === 1) {
    drawLamp(point.x, point.y, s, prop.side);
  } else {
    drawFence(point.x, point.y, s, prop.side);
  }
}

function drawTree(x, y, scale, side) {
  const s = Math.max(0.18, scale);
  ctx.save();
  ctx.translate(x + side * 14 * s, y);
  ctx.fillStyle = "#7b512c";
  roundedRect(ctx, -7 * s, -62 * s, 14 * s, 67 * s, 4 * s);
  ctx.fill();
  const crown = ctx.createRadialGradient(-9 * s, -84 * s, 2, 0, -78 * s, 48 * s);
  crown.addColorStop(0, "#b9ef69");
  crown.addColorStop(0.58, "#47b74f");
  crown.addColorStop(1, "#208e43");
  ctx.fillStyle = crown;
  ctx.beginPath();
  ctx.arc(-22 * s, -77 * s, 29 * s, 0, Math.PI * 2);
  ctx.arc(16 * s, -87 * s, 34 * s, 0, Math.PI * 2);
  ctx.arc(7 * s, -55 * s, 30 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLamp(x, y, scale, side) {
  const s = Math.max(0.18, scale);
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = "#315368";
  ctx.lineWidth = Math.max(1, 5 * s);
  ctx.beginPath();
  ctx.moveTo(0, 4 * s);
  ctx.lineTo(0, -92 * s);
  ctx.quadraticCurveTo(0, -110 * s, -side * 18 * s, -110 * s);
  ctx.stroke();
  ctx.fillStyle = "#fff2a4";
  ctx.beginPath();
  ctx.ellipse(-side * 23 * s, -108 * s, 10 * s, 7 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFence(x, y, scale, side) {
  const s = Math.max(0.18, scale);
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = side < 0 ? "#edf8ff" : "#5b8043";
  ctx.lineWidth = Math.max(1, 4 * s);
  for (let index = -2; index <= 2; index += 1) {
    ctx.beginPath();
    ctx.moveTo(index * 18 * s, 4 * s);
    ctx.lineTo(index * 18 * s, -28 * s);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(-45 * s, -18 * s);
  ctx.lineTo(45 * s, -18 * s);
  ctx.stroke();
  ctx.restore();
}

function drawCoin(entity, point) {
  const s = Math.max(0.18, point.scale) * Math.min(view.width, view.height) / 520;
  const width = Math.max(3, Math.abs(Math.cos(entity.spin)) * 21 * s + 4 * s);
  const height = 29 * s;
  ctx.save();
  ctx.translate(point.x, point.y - 30 * s);
  ctx.rotate(-0.12);
  ctx.shadowColor = "rgba(109,68,0,0.28)";
  ctx.shadowBlur = 8 * s;
  const gradient = ctx.createLinearGradient(-width, -height, width, height);
  gradient.addColorStop(0, "#fff899");
  gradient.addColorStop(0.3, "#ffd132");
  gradient.addColorStop(0.72, "#f2a50b");
  gradient.addColorStop(1, "#c66b00");
  roundedRect(ctx, -width * 0.5, -height * 0.5, width, height, 5 * s);
  fillStroke(gradient, "#ffef73", Math.max(1, 2.2 * s));
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(169,92,0,0.5)";
  ctx.lineWidth = Math.max(1, 1.5 * s);
  ctx.beginPath();
  ctx.moveTo(-width * 0.25, height * 0.15);
  ctx.lineTo(width * 0.25, -height * 0.15);
  ctx.stroke();
  ctx.restore();
}

function drawBarrier(point) {
  const s = Math.max(0.16, point.scale) * Math.min(view.width, view.height) / 500;
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.fillStyle = "rgba(19,34,48,0.24)";
  ctx.beginPath();
  ctx.ellipse(0, 3 * s, 47 * s, 11 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#666d71";
  ctx.fillRect(-39 * s, -11 * s, 8 * s, 17 * s);
  ctx.fillRect(31 * s, -11 * s, 8 * s, 17 * s);
  roundedRect(ctx, -49 * s, -47 * s, 98 * s, 35 * s, 5 * s);
  ctx.fillStyle = "#f8f3df";
  ctx.fill();
  ctx.save();
  roundedRect(ctx, -47 * s, -45 * s, 94 * s, 31 * s, 4 * s);
  ctx.clip();
  ctx.fillStyle = "#e94d3d";
  for (let index = -70; index < 80; index += 35) {
    ctx.beginPath();
    ctx.moveTo(index * s, -47 * s);
    ctx.lineTo((index + 17) * s, -47 * s);
    ctx.lineTo((index + 43) * s, -12 * s);
    ctx.lineTo((index + 26) * s, -12 * s);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(1, 3 * s);
  roundedRect(ctx, -49 * s, -47 * s, 98 * s, 35 * s, 5 * s);
  ctx.stroke();
  ctx.restore();
}

function drawSign(point) {
  const s = Math.max(0.15, point.scale) * Math.min(view.width, view.height) / 520;
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.fillStyle = "rgba(14,28,38,0.23)";
  ctx.beginPath();
  ctx.ellipse(0, 4 * s, 51 * s, 10 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#505d65";
  ctx.fillRect(-45 * s, -89 * s, 8 * s, 94 * s);
  ctx.fillRect(37 * s, -89 * s, 8 * s, 94 * s);
  const gradient = ctx.createLinearGradient(0, -94 * s, 0, -54 * s);
  gradient.addColorStop(0, "#ff704d");
  gradient.addColorStop(1, "#d8322e");
  roundedRect(ctx, -58 * s, -102 * s, 116 * s, 46 * s, 8 * s);
  fillStroke(gradient, "#fff", Math.max(1.5, 4 * s));
  ctx.fillStyle = "#fff";
  ctx.font = "900 " + Math.max(7, 19 * s) + "px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("↡ 低空", 0, -79 * s);
  ctx.restore();
}

function drawVehicle(entity, point) {
  const truck = entity.type === "truck";
  const base = Math.min(view.width, view.height) / 510;
  const s = Math.max(0.14, point.scale) * base;
  const width = (truck ? 104 : 86) * s;
  const height = (truck ? 128 : 82) * s;
  const paletteIndex = entity.id % 4;
  const colors = truck ? ["#23a8d9", "#ef6244", "#ffc229", "#5f75d9"] : ["#ef5b47", "#f4bb31", "#32a5dc", "#69b854"];
  const body = colors[paletteIndex];
  ctx.save();
  ctx.translate(point.x, point.y);
  ctx.fillStyle = "rgba(12,24,34,0.28)";
  ctx.beginPath();
  ctx.ellipse(0, 5 * s, width * 0.58, 13 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#242b32";
  roundedRect(ctx, -width * 0.58, -21 * s, 18 * s, 30 * s, 6 * s);
  ctx.fill();
  roundedRect(ctx, width * 0.58 - 18 * s, -21 * s, 18 * s, 30 * s, 6 * s);
  ctx.fill();

  const bodyGradient = ctx.createLinearGradient(-width / 2, 0, width / 2, -height);
  bodyGradient.addColorStop(0, body);
  bodyGradient.addColorStop(0.5, "#ff8b69");
  bodyGradient.addColorStop(1, body);
  if (truck) {
    roundedRect(ctx, -width * 0.5, -height, width, height, 10 * s);
    fillStroke(bodyGradient, "rgba(255,255,255,0.8)", Math.max(1, 3 * s));
    roundedRect(ctx, -width * 0.4, -height * 0.87, width * 0.8, height * 0.32, 7 * s);
    fillStroke("#b7ecfa", "#315968", Math.max(1, 3 * s));
    ctx.fillStyle = "#fff5bf";
    ctx.beginPath();
    ctx.arc(-width * 0.34, -17 * s, 7 * s, 0, Math.PI * 2);
    ctx.arc(width * 0.34, -17 * s, 7 * s, 0, Math.PI * 2);
    ctx.fill();
  } else {
    polygon([
      [-width * 0.5, -4 * s],
      [-width * 0.43, -height * 0.62],
      [-width * 0.24, -height],
      [width * 0.24, -height],
      [width * 0.43, -height * 0.62],
      [width * 0.5, -4 * s]
    ]);
    fillStroke(bodyGradient, "rgba(255,255,255,0.7)", Math.max(1, 2.5 * s));
    polygon([
      [-width * 0.28, -height * 0.64],
      [-width * 0.17, -height * 0.9],
      [width * 0.17, -height * 0.9],
      [width * 0.28, -height * 0.64]
    ]);
    fillStroke("#b9ebf5", "#315968", Math.max(1, 2 * s));
    ctx.fillStyle = "#fff4ad";
    ctx.beginPath();
    ctx.arc(-width * 0.34, -18 * s, 6 * s, 0, Math.PI * 2);
    ctx.arc(width * 0.34, -18 * s, 6 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawBomb(entity, point) {
  const s = Math.max(0.18, point.scale) * Math.min(view.width, view.height) / 520;
  ctx.save();
  ctx.translate(point.x, point.y - 25 * s);
  if (entity.type === "bombBack") ctx.rotate(entity.spin * 1.4);
  ctx.fillStyle = "rgba(18,25,31,0.26)";
  ctx.beginPath();
  ctx.ellipse(0, 31 * s, 30 * s, 8 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  const gradient = ctx.createRadialGradient(-10 * s, -12 * s, 2, 0, 0, 31 * s);
  gradient.addColorStop(0, "#77808a");
  gradient.addColorStop(0.45, "#323b43");
  gradient.addColorStop(1, "#11161a");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, 29 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#22272d";
  ctx.lineWidth = Math.max(1.5, 5 * s);
  ctx.beginPath();
  ctx.moveTo(8 * s, -26 * s);
  ctx.quadraticCurveTo(20 * s, -45 * s, 31 * s, -38 * s);
  ctx.stroke();
  const flicker = 1 + Math.sin(game.time * 22 + entity.id) * 0.22;
  ctx.fillStyle = "#ffed54";
  ctx.beginPath();
  ctx.arc(34 * s, -38 * s, 8 * s * flicker, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ff6b23";
  ctx.beginPath();
  ctx.arc(34 * s, -38 * s, 4 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPowerup(entity, point) {
  const s = Math.max(0.18, point.scale) * Math.min(view.width, view.height) / 520;
  const bob = Math.sin(entity.wobble * 2) * 7 * s;
  const symbols = { magnet: "U", shield: "◇", x2: "×2", jetpack: "↑" };
  const colors = { magnet: "#f04d44", shield: "#46d5f4", x2: "#8058e8", jetpack: "#ff9f31" };
  ctx.save();
  ctx.translate(point.x, point.y - 47 * s + bob);
  ctx.rotate(Math.sin(entity.wobble) * 0.09);
  ctx.shadowColor = colors[entity.type];
  ctx.shadowBlur = 18 * s;
  ctx.fillStyle = colors[entity.type];
  ctx.beginPath();
  ctx.arc(0, 0, 30 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(1.5, 4 * s);
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 " + Math.max(8, (entity.type === "x2" ? 20 : 26) * s) + "px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(symbols[entity.type], 0, 1 * s);
  ctx.restore();
}

function drawEntity(entity) {
  const point = project(entity.lane, entity.z, entity.y);
  if (point.y < view.horizon - 30 || point.y > view.height + 150) return;
  if (entity.type === "coin") drawCoin(entity, point);
  else if (entity.type === "barrier") drawBarrier(point);
  else if (entity.type === "sign") drawSign(point);
  else if (entity.type === "car" || entity.type === "truck") drawVehicle(entity, point);
  else if (entity.type === "bomb" || entity.type === "bombBack") drawBomb(entity, point);
  else drawPowerup(entity, point);
}

function drawRaccoon(x, y, scale, boss) {
  const s = scale;
  const bounce = Math.sin(game.time * (boss ? 7 : 10)) * 4 * s;
  ctx.save();
  ctx.translate(x, y + bounce);
  ctx.scale(boss ? 1.2 : 1, boss ? 1.2 : 1);

  ctx.fillStyle = "rgba(16,28,37,0.24)";
  ctx.beginPath();
  ctx.ellipse(0, 4 * s, 39 * s, 10 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(28 * s, -52 * s);
  ctx.rotate(0.45 + Math.sin(game.time * 5) * 0.12);
  ctx.strokeStyle = "#303941";
  ctx.lineWidth = 19 * s;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(34 * s, -17 * s, 38 * s, 15 * s);
  ctx.stroke();
  ctx.strokeStyle = "#a9b1b5";
  ctx.lineWidth = 7 * s;
  for (let index = 9; index <= 34; index += 12) {
    ctx.beginPath();
    ctx.moveTo(index * s, -6 * s);
    ctx.lineTo((index + 3) * s, 10 * s);
    ctx.stroke();
  }
  ctx.restore();

  ctx.strokeStyle = "#313940";
  ctx.lineWidth = 12 * s;
  ctx.lineCap = "round";
  const stride = Math.sin(game.time * 11) * 11 * s;
  ctx.beginPath();
  ctx.moveTo(-12 * s, -34 * s);
  ctx.lineTo(-18 * s + stride, 0);
  ctx.moveTo(12 * s, -34 * s);
  ctx.lineTo(18 * s - stride, 0);
  ctx.stroke();

  ctx.fillStyle = "#5c6266";
  ctx.beginPath();
  ctx.ellipse(0, -54 * s, 31 * s, 39 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#9ca5a9";
  ctx.beginPath();
  ctx.ellipse(0, -59 * s, 23 * s, 28 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#8b6842";
  ctx.beginPath();
  ctx.arc(-27 * s, -56 * s, 22 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f4d69a";
  ctx.beginPath();
  ctx.arc(-28 * s, -58 * s, 13 * s, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#6c7478";
  ctx.beginPath();
  ctx.moveTo(-28 * s, -88 * s);
  ctx.lineTo(-20 * s, -117 * s);
  ctx.lineTo(-4 * s, -91 * s);
  ctx.moveTo(28 * s, -88 * s);
  ctx.lineTo(20 * s, -117 * s);
  ctx.lineTo(4 * s, -91 * s);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, -88 * s, 37 * s, 32 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#303840";
  ctx.beginPath();
  ctx.ellipse(0, -89 * s, 35 * s, 14 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(-13 * s, -92 * s, 6 * s, 0, Math.PI * 2);
  ctx.arc(13 * s, -92 * s, 6 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#132634";
  ctx.beginPath();
  ctx.arc(-11 * s, -92 * s, 3 * s, 0, Math.PI * 2);
  ctx.arc(11 * s, -92 * s, 3 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1f2a31";
  ctx.beginPath();
  ctx.arc(0, -77 * s, 5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBoss() {
  const z = game.boss.active ? 31 : 67;
  const point = project(1, z, 0);
  const s = Math.max(0.16, point.scale) * Math.min(view.width, view.height) / 540;
  drawRaccoon(point.x, point.y, s, game.boss.active);
}

function drawCat(x, y, scale, demo) {
  const s = scale;
  const runPhase = game.time * (7.5 + game.speed * 0.28);
  const stride = demo ? Math.sin(game.ambientTime * 2.3) * 3 : Math.sin(runPhase) * 14;
  const bob = demo ? Math.sin(game.ambientTime * 2.3) * 3 : Math.abs(Math.sin(runPhase)) * 4;
  const sliding = !demo && game.sliding > 0.02;
  const tilt = demo ? -0.04 : clamp(-game.laneVelocity * 0.045, -0.2, 0.2);
  const flashInvisible = game.invulnerable > 0 && Math.floor(game.invulnerable * 12) % 2 === 0;
  if (flashInvisible) return;

  ctx.save();
  ctx.translate(x, y - bob);
  ctx.rotate(tilt + (sliding ? -0.14 : 0));
  if (sliding) {
    ctx.translate(0, 9 * s);
    ctx.scale(1.17, 0.62);
  }

  ctx.fillStyle = "rgba(13,32,45,0.24)";
  ctx.beginPath();
  ctx.ellipse(0, 5 * s, (sliding ? 52 : 39) * s, 11 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  if (game.powerups.shield > 0 && !demo) {
    ctx.save();
    ctx.globalAlpha = 0.42 + Math.sin(game.time * 7) * 0.1;
    const shield = ctx.createRadialGradient(0, -68 * s, 10 * s, 0, -68 * s, 78 * s);
    shield.addColorStop(0.55, "rgba(107,235,255,0.08)");
    shield.addColorStop(0.82, "rgba(76,214,255,0.45)");
    shield.addColorStop(1, "rgba(255,255,255,0.72)");
    ctx.fillStyle = shield;
    ctx.beginPath();
    ctx.ellipse(0, -65 * s, 67 * s, 89 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(26 * s, -71 * s);
  ctx.rotate(0.65 + Math.sin(runPhase * 0.5) * 0.16);
  ctx.strokeStyle = "#65747e";
  ctx.lineWidth = 14 * s;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(40 * s, 2 * s, 34 * s, -31 * s);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = "#63717a";
  ctx.lineWidth = 15 * s;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-13 * s, -42 * s);
  ctx.lineTo((-14 + stride) * s, -1 * s);
  ctx.moveTo(13 * s, -42 * s);
  ctx.lineTo((14 - stride) * s, -1 * s);
  ctx.stroke();
  ctx.strokeStyle = "#f4f7f7";
  ctx.lineWidth = 10 * s;
  ctx.beginPath();
  ctx.moveTo((-14 + stride) * s, -1 * s);
  ctx.lineTo((-8 + stride) * s, 0);
  ctx.moveTo((14 - stride) * s, -1 * s);
  ctx.lineTo((8 - stride) * s, 0);
  ctx.stroke();

  const hoodie = ctx.createLinearGradient(-30 * s, -102 * s, 30 * s, -38 * s);
  hoodie.addColorStop(0, "#ff6a53");
  hoodie.addColorStop(0.7, "#e83e36");
  hoodie.addColorStop(1, "#b9252b");
  ctx.fillStyle = hoodie;
  ctx.beginPath();
  ctx.ellipse(0, -69 * s, 33 * s, 43 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 3 * s;
  ctx.beginPath();
  ctx.moveTo(-16 * s, -81 * s);
  ctx.quadraticCurveTo(0, -68 * s, 16 * s, -81 * s);
  ctx.stroke();

  ctx.strokeStyle = "#75848d";
  ctx.lineWidth = 13 * s;
  ctx.beginPath();
  ctx.moveTo(-25 * s, -82 * s);
  ctx.lineTo((-34 - stride * 0.55) * s, -46 * s);
  ctx.moveTo(25 * s, -82 * s);
  ctx.lineTo((34 + stride * 0.55) * s, -48 * s);
  ctx.stroke();

  ctx.fillStyle = "#788790";
  ctx.beginPath();
  ctx.moveTo(-31 * s, -117 * s);
  ctx.lineTo(-23 * s, -150 * s);
  ctx.lineTo(-5 * s, -122 * s);
  ctx.moveTo(31 * s, -117 * s);
  ctx.lineTo(23 * s, -150 * s);
  ctx.lineTo(5 * s, -122 * s);
  ctx.fill();
  ctx.fillStyle = "#ec9eb1";
  ctx.beginPath();
  ctx.moveTo(-25 * s, -122 * s);
  ctx.lineTo(-22 * s, -142 * s);
  ctx.lineTo(-10 * s, -123 * s);
  ctx.moveTo(25 * s, -122 * s);
  ctx.lineTo(22 * s, -142 * s);
  ctx.lineTo(10 * s, -123 * s);
  ctx.fill();

  const head = ctx.createRadialGradient(-10 * s, -126 * s, 3, 0, -116 * s, 46 * s);
  head.addColorStop(0, "#abb8be");
  head.addColorStop(1, "#6a7881");
  ctx.fillStyle = head;
  ctx.beginPath();
  ctx.ellipse(0, -113 * s, 38 * s, 35 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  if (demo) {
    ctx.fillStyle = "#eef4f3";
    ctx.beginPath();
    ctx.ellipse(-14 * s, -116 * s, 11 * s, 14 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(14 * s, -116 * s, 11 * s, 14 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#247494";
    ctx.beginPath();
    ctx.arc(-12 * s, -114 * s, 5 * s, 0, Math.PI * 2);
    ctx.arc(12 * s, -114 * s, 5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#172a36";
    ctx.beginPath();
    ctx.arc(-11 * s, -114 * s, 2.3 * s, 0, Math.PI * 2);
    ctx.arc(11 * s, -114 * s, 2.3 * s, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f3b0b5";
    ctx.beginPath();
    ctx.moveTo(-6 * s, -99 * s);
    ctx.lineTo(0, -94 * s);
    ctx.lineTo(6 * s, -99 * s);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#334955";
    ctx.lineWidth = 2.5 * s;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, -94 * s);
    ctx.quadraticCurveTo(-2 * s, -87 * s, -9 * s, -88 * s);
    ctx.moveTo(0, -94 * s);
    ctx.quadraticCurveTo(2 * s, -87 * s, 9 * s, -88 * s);
    ctx.stroke();
  } else {
    ctx.strokeStyle = "#56656e";
    ctx.lineWidth = 3 * s;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-19 * s, -123 * s);
    ctx.quadraticCurveTo(0, -133 * s, 19 * s, -123 * s);
    ctx.moveTo(-22 * s, -111 * s);
    ctx.quadraticCurveTo(0, -121 * s, 22 * s, -111 * s);
    ctx.stroke();
    ctx.strokeStyle = "#bf2b31";
    ctx.lineWidth = 8 * s;
    ctx.beginPath();
    ctx.arc(0, -96 * s, 29 * s, 0.12 * Math.PI, 0.88 * Math.PI);
    ctx.stroke();
  }

  if (game.powerups.magnet > 0 && !demo) {
    ctx.save();
    ctx.strokeStyle = "rgba(255,84,68,0.72)";
    ctx.lineWidth = 4 * s;
    ctx.setLineDash([8 * s, 9 * s]);
    ctx.beginPath();
    ctx.ellipse(0, -74 * s, 72 * s, 54 * s, game.time, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  if (game.powerups.jetpack > 0 && !demo) {
    ctx.fillStyle = "#536875";
    roundedRect(ctx, -32 * s, -84 * s, 13 * s, 44 * s, 5 * s);
    ctx.fill();
    roundedRect(ctx, 19 * s, -84 * s, 13 * s, 44 * s, 5 * s);
    ctx.fill();
    const flame = 19 + Math.sin(game.time * 28) * 7;
    ctx.fillStyle = "#ffdd37";
    ctx.beginPath();
    ctx.moveTo(-30 * s, -40 * s);
    ctx.lineTo(-20 * s, -40 * s);
    ctx.lineTo(-25 * s, (-40 + flame) * s);
    ctx.moveTo(20 * s, -40 * s);
    ctx.lineTo(30 * s, -40 * s);
    ctx.lineTo(25 * s, (-40 + flame) * s);
    ctx.fill();
  }

  ctx.restore();
}

function drawPlayer() {
  const point = project(game.laneVisual, PLAYER_Z, 0);
  const base = clamp(Math.min(view.width, view.height) / 505, 0.72, 1.45);
  const lift = game.jumpY * 71 * point.scale + (game.powerups.jetpack > 0 ? 17 : 0);
  drawCat(point.x, point.y - lift, base * point.scale, false);
}

function drawHomeActors() {
  const raccoonPoint = project(1.25, view.portrait ? 21 : 17, 0);
  const raccoonScale = Math.max(0.35, raccoonPoint.scale) * Math.min(view.width, view.height) / 540;
  drawRaccoon(raccoonPoint.x, raccoonPoint.y, raccoonScale, false);
  const lane = view.portrait ? 1 : 1.75;
  const catPoint = project(lane, view.portrait ? 8 : 2.2, 0);
  const scale = clamp(Math.min(view.width, view.height) / 485, 0.74, 1.5) * catPoint.scale;
  drawCat(catPoint.x, catPoint.y, scale, true);
  for (let index = 0; index < 6; index += 1) {
    const z = 7 + index * 3.6;
    const point = project(lane - index * 0.08, z, Math.sin(index / 5 * Math.PI) * 0.5);
    drawCoin({ id: index, spin: game.ambientTime * 3 + index }, point);
  }
}

function drawSpeedLines() {
  if (game.state !== "running" || game.speed < 17) return;
  ctx.save();
  ctx.globalAlpha = clamp((game.speed - 17) / 18, 0, 0.28);
  ctx.strokeStyle = "#d9f7ff";
  ctx.lineWidth = 2;
  for (let index = 0; index < 18; index += 1) {
    const phase = (game.time * (120 + index * 3) + index * 71) % (view.height * 0.65);
    const y = view.horizon + phase;
    const side = index % 2 === 0 ? -1 : 1;
    const roadEdge = roadXAtY(side, y);
    const x = roadEdge + side * (18 + (index % 5) * 9);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + side * 18, y + 42);
    ctx.stroke();
  }
  ctx.restore();
}

function drawParticles() {
  for (const particle of game.particles) {
    const alpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    if (particle.shape === "star") {
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.life * 9);
      ctx.fillRect(-particle.size * 1.8, -particle.size * 0.45, particle.size * 3.6, particle.size * 0.9);
      ctx.fillRect(-particle.size * 0.45, -particle.size * 1.8, particle.size * 0.9, particle.size * 3.6);
    } else {
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function render() {
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  ctx.clearRect(0, 0, view.width, view.height);
  const shakeStrength = game.shake * 10;
  const shakeX = shakeStrength ? Math.sin(game.time * 83.7) * shakeStrength * 0.5 : 0;
  const shakeY = shakeStrength ? Math.cos(game.time * 67.3) * shakeStrength * 0.5 : 0;
  ctx.save();
  ctx.translate(shakeX, shakeY);
  drawSky();
  drawGround();
  drawSpeedLines();

  if (game.state === "home" || game.state === "tutorial") {
    drawHomeActors();
  } else {
    const ordered = game.entities.slice().sort((a, b) => b.z - a.z);
    for (const entity of ordered) drawEntity(entity);
    drawBoss();
    drawPlayer();
  }

  drawParticles();
  ctx.restore();

  if (game.flash > 0) {
    ctx.fillStyle = "rgba(255,255,255," + clamp(game.flash, 0, 0.62) + ")";
    ctx.fillRect(0, 0, view.width, view.height);
  }
  if (game.boss.defeatedFlash > 0) {
    const alpha = Math.sin(game.boss.defeatedFlash * Math.PI * 2) * 0.08 + 0.08;
    ctx.fillStyle = "rgba(255,219,65," + Math.max(0, alpha) + ")";
    ctx.fillRect(0, 0, view.width, view.height);
  }

  const vignette = ctx.createRadialGradient(
    view.width * 0.5,
    view.height * 0.55,
    Math.min(view.width, view.height) * 0.25,
    view.width * 0.5,
    view.height * 0.55,
    Math.max(view.width, view.height) * 0.72
  );
  vignette.addColorStop(0.72, "rgba(0,38,72,0)");
  vignette.addColorStop(1, "rgba(0,38,72,0.18)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, view.width, view.height);
}

function bindButton(button, handler) {
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    handler();
  });
}

bindButton(ui.playButton, startFromHome);
bindButton(ui.tutorialButton, finishTutorial);
bindButton(ui.pauseButton, () => pauseGame(false));
bindButton(ui.resumeButton, resumeGame);
bindButton(ui.quitButton, returnHome);
bindButton(ui.retryButton, () => {
  audio.unlock();
  audio.sfx("button");
  startCountdown();
});
bindButton(ui.homeButton, () => {
  audio.unlock();
  audio.sfx("button");
  returnHome();
});
bindButton(ui.buildButton, attemptBuild);
bindButton(ui.muteButton, () => {
  audio.unlock();
  audio.setMuted(!audio.muted);
  showToast(audio.muted ? "声音已关闭" : "声音已开启");
});
bindButton(ui.characterHint, () => showToast("灰尾：勇敢又灵活的街区守护者"));
bindButton(ui.characterLocked, () => {
  const unlocked = (profile.homeLevel || 1) >= 3;
  showToast(unlocked ? "赤狐会在下一版本加入角色选择" : "树屋达到 3 级即可发现赤狐伙伴");
});
bindButton(ui.worldLocked, () => {
  const unlocked = (profile.homeLevel || 1) >= 5;
  showToast(unlocked ? "海岸世界已发现，后续版本开放" : "树屋达到 5 级即可发现海岸世界");
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && (game.state === "running" || game.state === "countdown")) pauseGame(true);
});

window.addEventListener("blur", () => {
  if (game.state === "running") pauseGame(true);
});

function qaSnapshot() {
  const counts = {};
  for (const entity of game.entities) counts[entity.type] = (counts[entity.type] || 0) + 1;
  return {
    ready: true,
    version: VERSION,
    state: game.state,
    seed: game.runSeed,
    distance: Number(game.distance.toFixed(2)),
    score: Math.floor(game.score),
    runGold: game.runGold,
    speed: Number(game.speed.toFixed(2)),
    multiplier: game.multiplier * (game.powerups.x2 > 0 ? 2 : 1),
    lane: game.lane,
    targetLane: game.targetLane,
    laneVisual: Number(game.laneVisual.toFixed(3)),
    jumpY: Number(game.jumpY.toFixed(3)),
    sliding: game.sliding > 0,
    powerups: { ...game.powerups },
    boss: { ...game.boss },
    entityCounts: counts,
    activeEntities: game.entities.length,
    viewport: {
      width: Math.round(view.width),
      height: Math.round(view.height),
      dpr: view.dpr,
      portrait: view.portrait
    },
    profile: { ...profile }
  };
}

window.__runnerQA = Object.freeze({
  version: VERSION,
  snapshot: qaSnapshot,
  start(seed) {
    audio.unlock();
    startCountdown(Number(seed) || 12345, true);
    fixedUpdate(0.04);
    refreshRunUI();
    return qaSnapshot();
  },
  action(action) {
    const accepted = handleAction(String(action));
    return { accepted, snapshot: qaSnapshot() };
  },
  advance(seconds) {
    const duration = clamp(Number(seconds) || 0, 0, 30);
    const steps = Math.ceil(duration / FIXED_STEP);
    const wasFrozen = game.qaManual;
    game.qaManual = false;
    for (let index = 0; index < steps; index += 1) fixedUpdate(FIXED_STEP);
    game.qaManual = wasFrozen;
    render();
    return qaSnapshot();
  },
  spawn(type, lane, z) {
    const allowed = new Set(["coin", "barrier", "sign", "car", "truck", "magnet", "shield", "x2", "jetpack", "bomb"]);
    if (!allowed.has(type)) throw new Error("Unsupported entity type");
    addEntity(type, clamp(Number(lane) || 0, 0, 2), Number(z) || 7);
    return qaSnapshot();
  },
  clearEntities() {
    game.entities.length = 0;
    return qaSnapshot();
  },
  setDistance(distance) {
    game.distance = Math.max(0, Number(distance) || 0);
    return qaSnapshot();
  },
  forceBoss() {
    if (!game.boss.active) beginBoss();
    return qaSnapshot();
  },
  setPowerup(name, seconds) {
    if (!(name in game.powerups)) throw new Error("Unsupported powerup");
    game.powerups[name] = Math.max(0, Number(seconds) || 0);
    refreshRunUI();
    return qaSnapshot();
  },
  pause() {
    pauseGame(true);
    return qaSnapshot();
  },
  resume() {
    resumeGame();
    return qaSnapshot();
  },
  finish() {
    finishRun();
    return qaSnapshot();
  },
  resetProfile() {
    profile = sanitizeProfile(DEFAULT_PROFILE);
    storeProfile();
    return qaSnapshot();
  },
  setProfile(patch) {
    profile = sanitizeProfile({ ...profile, ...(patch || {}) });
    storeProfile();
    return qaSnapshot();
  },
  setMuted(value) {
    audio.setMuted(Boolean(value));
    return qaSnapshot();
  },
  freeze(value = true) {
    game.qaManual = Boolean(value);
    return qaSnapshot();
  }
});

function frame(now) {
  const delta = Math.min(0.1, Math.max(0, (now - game.lastFrame) / 1000));
  game.lastFrame = now;
  game.accumulator += delta;
  let updates = 0;
  while (game.accumulator >= FIXED_STEP && updates < 6) {
    fixedUpdate(FIXED_STEP);
    game.accumulator -= FIXED_STEP;
    updates += 1;
  }
  if (updates >= 6) game.accumulator = 0;
  render();
  requestAnimationFrame(frame);
}

refreshHomeUI();
refreshRunUI();
setState("home");
requestAnimationFrame(frame);

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      // Offline installation is an enhancement; gameplay does not depend on it.
    });
  });
}
