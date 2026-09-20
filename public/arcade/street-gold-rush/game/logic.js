/**
 * Pure gameplay helpers for the runner.
 *
 * This module deliberately has no DOM or rendering dependencies so the same
 * rules can be exercised in Node tests and in the browser runtime.
 */

const LANES = Object.freeze([0, 1, 2]);
const HARD_ITEM_TYPES = new Set([
  "car",
  "truck",
]);
const NON_BLOCKING_ITEM_TYPES = new Set([
  "barrier",
  "coin",
  "jetpack",
  "magnet",
  "shield",
  "sign",
  "x2",
]);

export const PROFILE_VERSION = 1;

export const DEFAULT_PROFILE = Object.freeze({
  version: PROFILE_VERSION,
  bestScore: 0,
  bestDistance: 0,
  totalGold: 0,
  runs: 0,
  homeLevel: 1,
  homeXP: 0,
  bossWins: 0,
  selectedCharacter: "graytail",
  selectedWorld: "neighborhood",
  tutorialSeen: false,
  muted: false,
});

/** Clamp a number to an inclusive range. Reversed bounds are accepted. */
export function clamp(value, min, max) {
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);
  return Math.min(upper, Math.max(lower, value));
}

function hashSeed(seed) {
  if (typeof seed === "number" && Number.isFinite(seed)) {
    return Math.trunc(seed) >>> 0;
  }

  if (typeof seed === "bigint") {
    return Number(seed & 0xffff_ffffn) >>> 0;
  }

  const text = String(seed ?? 0);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Return a small deterministic PRNG. The returned function produces values in
 * [0, 1), and equal string or numeric seeds always produce equal sequences.
 */
export function createRng(seed = 0) {
  let state = hashSeed(seed);

  return function nextRandom() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 0x1_0000_0000;
  };
}

/**
 * Translate travelled world units into bounded tuning values. Distances below
 * zero (or malformed values) are treated as the beginning of a run.
 */
export function difficultyForDistance(distance) {
  const safeDistance = Math.max(0, Number.isFinite(Number(distance)) ? Number(distance) : 0);
  const progress = clamp(safeDistance / 3200, 0, 1);
  const eased = 1 - (1 - progress) ** 2;
  const level = clamp(1 + Math.floor(safeDistance / 500), 1, 7);

  return {
    distance: safeDistance,
    level,
    progress,
    speed: 13 + eased * 11,
    rowGap: 10 - progress * 3,
    patternGap: 17 - progress * 5,
    doubleObstacleChance: 0.08 + progress * 0.47,
    powerupChance: 0.04 + progress * 0.04,
  };
}

function normalizeRandom(rng) {
  if (typeof rng === "function") {
    return () => clamp(Number(rng()) || 0, 0, 1 - Number.EPSILON);
  }
  return createRng(rng);
}

function normalizeDifficulty(difficulty) {
  if (difficulty && typeof difficulty === "object") {
    const progress = clamp(Number(difficulty.progress) || 0, 0, 1);
    const level = clamp(
      Math.floor(Number(difficulty.level) || 1),
      1,
      7,
    );
    return { ...difficulty, progress, level };
  }

  const numeric = Number(difficulty);
  if (Number.isFinite(numeric) && numeric >= 0 && numeric <= 1) {
    return {
      ...difficultyForDistance(numeric * 3200),
      progress: numeric,
    };
  }
  return difficultyForDistance(numeric);
}

function randomLane(random) {
  return LANES[Math.floor(random() * LANES.length)];
}

function otherLanes(lane) {
  return LANES.filter((candidate) => candidate !== lane);
}

function coin(lane) {
  return { lane, type: "coin" };
}

function obstacle(lane, type = "car") {
  return { lane, type, hard: true };
}

function makeCoinLine(random) {
  const lane = randomLane(random);
  return {
    id: "coin-line",
    rows: [
      { z: 4, items: [coin(lane)] },
      { z: 10, items: [coin(lane)] },
      { z: 16, items: [coin(lane)] },
      { z: 22, items: [coin(lane)] },
    ],
  };
}

function makeSingleBlock(random) {
  const blockedLane = randomLane(random);
  const safeLane = randomLane(random);
  const guidedLane = safeLane === blockedLane
    ? otherLanes(blockedLane)[Math.floor(random() * 2)]
    : safeLane;
  return {
    id: "single-block",
    rows: [
      { z: 4, items: [coin(guidedLane)] },
      {
        z: 12,
        items: [obstacle(blockedLane), coin(guidedLane)],
      },
      { z: 20, items: [coin(guidedLane)] },
    ],
  };
}

function makeSlalom(random) {
  const first = randomLane(random);
  const secondCandidates = otherLanes(first);
  const second = secondCandidates[Math.floor(random() * secondCandidates.length)];
  const third = LANES.find((lane) => lane !== first && lane !== second);
  return {
    id: "slalom",
    rows: [
      { z: 4, items: [obstacle(first), coin(second)] },
      { z: 12, items: [obstacle(second, "truck"), coin(third)] },
      { z: 20, items: [obstacle(third), coin(first)] },
      { z: 28, items: [coin(first)] },
    ],
  };
}

function makeOpenGate(random) {
  const safeLane = randomLane(random);
  const blocked = otherLanes(safeLane);
  return {
    id: "open-gate",
    rows: [
      { z: 4, items: [coin(safeLane)] },
      {
        z: 13,
        items: [obstacle(blocked[0]), obstacle(blocked[1], "truck"), coin(safeLane)],
      },
      { z: 22, items: [coin(safeLane)] },
    ],
  };
}

function makeGateSwitch(random) {
  const firstSafe = random() < 0.5 ? 0 : 2;
  const secondSafe = 1;
  const lastSafe = firstSafe === 0 ? 2 : 0;
  return {
    id: "gate-switch",
    rows: [
      {
        z: 2,
        items: [...otherLanes(firstSafe).map((lane) => obstacle(lane, "car")), coin(firstSafe)],
      },
      {
        z: 12,
        items: [...otherLanes(secondSafe).map((lane) => obstacle(lane, "truck")), coin(secondSafe)],
      },
      {
        z: 22,
        items: [...otherLanes(lastSafe).map((lane) => obstacle(lane, "truck")), coin(lastSafe)],
      },
      { z: 30, items: [coin(lastSafe)] },
    ],
  };
}

function makeActionRow(random, type) {
  const lane = randomLane(random);
  const exitLane = randomLane(random);
  return {
    id: type === "barrier" ? "jump-row" : "slide-row",
    rows: [
      { z: 4, items: [coin(lane)] },
      { z: 12, items: [{ lane, type }, coin(exitLane)] },
      { z: 20, items: [coin(exitLane)] },
    ],
  };
}

/**
 * Generate one deterministic, pre-validated obstacle/coin pattern.
 *
 * Pattern shape: { id, rows: [{ z, items: [{ lane, type, ... }] }] }
 */
export function generatePattern(rng, difficulty = difficultyForDistance(0)) {
  const random = normalizeRandom(rng);
  const tuning = normalizeDifficulty(difficulty);
  const factories = [makeCoinLine, makeSingleBlock];

  if (tuning.level >= 2) {
    factories.push(makeSlalom, (next) => makeActionRow(next, "barrier"));
  }
  if (tuning.level >= 3) {
    factories.push(makeOpenGate, (next) => makeActionRow(next, "sign"));
  }
  if (tuning.level >= 5) factories.push(makeGateSwitch);

  const factory = factories[Math.floor(random() * factories.length)];
  const pattern = factory(random);

  if (random() < (Number(tuning.powerupChance) || 0)) {
    const powerups = ["magnet", "shield", "x2", "jetpack"];
    const lastRow = pattern.rows.at(-1);
    const occupied = new Set(lastRow.items.map((item) => item.lane));
    const openLanes = LANES.filter((lane) => !occupied.has(lane));
    const lane = openLanes.length > 0
      ? openLanes[Math.floor(random() * openLanes.length)]
      : randomLane(random);
    lastRow.items.push({
      lane,
      type: powerups[Math.floor(random() * powerups.length)],
    });
  }

  // A programming error in a future template must fail closed instead of
  // putting an impossible row into a live run.
  const safePattern = validatePattern(pattern) ? pattern : makeCoinLine(random);
  if (!Number.isFinite(safePattern.span)) {
    safePattern.span = Math.max(...safePattern.rows.map((row) => row.z)) + 4;
  }
  return safePattern;
}

function isHardObstacle(item) {
  if (!item || typeof item !== "object") return false;
  if (item.hard === true || item.blocking === true) return true;
  if (item.hard === false || item.blocking === false) return false;

  const type = String(item.type ?? "").toLowerCase();
  if (NON_BLOCKING_ITEM_TYPES.has(type)) return false;
  return HARD_ITEM_TYPES.has(type);
}

/**
 * Validate both the serialised pattern shape and its basic reachability.
 * Hard obstacles may never occupy all three lanes in one row. Consecutive
 * forced gates must also leave enough longitudinal space for the lane change.
 */
export function validatePattern(pattern) {
  if (!pattern || typeof pattern !== "object" || !Array.isArray(pattern.rows)) {
    return false;
  }
  if (pattern.rows.length === 0) return false;

  let previousZ = -Infinity;
  let reachableLanes = [...LANES];

  for (const row of pattern.rows) {
    if (!row || typeof row !== "object" || !Array.isArray(row.items)) return false;
    if (!Number.isFinite(row.z) || row.z <= previousZ) return false;

    const hardLanes = new Set();
    for (const item of row.items) {
      if (!item || typeof item !== "object" || !LANES.includes(item.lane)) return false;
      if (isHardObstacle(item)) hardLanes.add(item.lane);
    }

    if (hardLanes.size === LANES.length) return false;

    const safeLanes = LANES.filter((lane) => !hardLanes.has(lane));
    const rowGap = previousZ === -Infinity ? Infinity : row.z - previousZ;
    // A runner can cross two lane widths only when rows are generously spaced.
    const maximumLaneShift = rowGap >= 7 ? 2 : 1;
    const nextReachable = safeLanes.filter((lane) =>
      reachableLanes.some((previousLane) => Math.abs(previousLane - lane) <= maximumLaneShift),
    );
    if (nextReachable.length === 0) return false;

    reachableLanes = nextReachable;
    previousZ = row.z;
  }

  return true;
}

/** Move a rendered x/lane value toward a target without overshooting it. */
export function moveTowardLane(current, target, dt, duration) {
  const from = Number(current);
  const to = Number(target);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return to;
  if (!Number.isFinite(duration) || duration <= 0) return to;
  const amount = clamp((Number(dt) || 0) / duration, 0, 1);
  return from + (to - from) * amount;
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeCounter(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return fallback;
  return clamp(Math.floor(numeric), 0, Number.MAX_SAFE_INTEGER);
}

function safeIdentifier(value, fallback) {
  if (typeof value !== "string") return fallback;
  const candidate = value.trim();
  if (candidate.length === 0 || candidate.length > 64) return fallback;
  return /^[a-z0-9_-]+$/i.test(candidate) ? candidate : fallback;
}

function profileSource(raw) {
  if (!isRecord(raw)) return {};

  // Version 0/legacy saves used highScore, coins, gamesPlayed and soundEnabled.
  // Normalising aliases here also makes partial merge patches migrate safely.
  const source = { ...raw };
  if (source.bestScore == null && raw.highScore != null) source.bestScore = raw.highScore;
  if (source.bestDistance == null && raw.distanceRecord != null) {
    source.bestDistance = raw.distanceRecord;
  }
  if (source.totalGold == null && (raw.coins != null || raw.totalCoins != null)) {
    source.totalGold = raw.coins ?? raw.totalCoins;
  }
  if (source.runs == null && raw.gamesPlayed != null) source.runs = raw.gamesPlayed;
  if (source.muted == null && typeof raw.soundEnabled === "boolean") {
    source.muted = !raw.soundEnabled;
  }
  return source;
}

/**
 * Migrate and clean data read from localStorage. Unknown fields are discarded,
 * counters are finite non-negative integers, and the current version is always
 * written back.
 */
export function sanitizeProfile(raw) {
  const source = profileSource(raw);
  return {
    version: PROFILE_VERSION,
    bestScore: safeCounter(source.bestScore, DEFAULT_PROFILE.bestScore),
    bestDistance: safeCounter(source.bestDistance, DEFAULT_PROFILE.bestDistance),
    totalGold: safeCounter(source.totalGold, DEFAULT_PROFILE.totalGold),
    runs: safeCounter(source.runs, DEFAULT_PROFILE.runs),
    homeLevel: Math.max(1, safeCounter(source.homeLevel, DEFAULT_PROFILE.homeLevel)),
    homeXP: safeCounter(source.homeXP, DEFAULT_PROFILE.homeXP),
    bossWins: safeCounter(source.bossWins, DEFAULT_PROFILE.bossWins),
    selectedCharacter: safeIdentifier(
      source.selectedCharacter,
      DEFAULT_PROFILE.selectedCharacter,
    ),
    selectedWorld: safeIdentifier(source.selectedWorld, DEFAULT_PROFILE.selectedWorld),
    tutorialSeen: typeof source.tutorialSeen === "boolean"
      ? source.tutorialSeen
      : DEFAULT_PROFILE.tutorialSeen,
    muted: typeof source.muted === "boolean" ? source.muted : DEFAULT_PROFILE.muted,
  };
}

/** Apply a partial profile patch, then migrate/sanitise the resulting save. */
export function mergeProfile(base, next) {
  const cleanBase = sanitizeProfile(base);
  if (!isRecord(next)) return cleanBase;

  const patch = profileSource(next);
  const merged = sanitizeProfile({
    ...cleanBase,
    ...patch,
    version: PROFILE_VERSION,
  });

  // Achievement records are monotonic across stale-tab/profile merges. Current
  // balances and preferences are snapshots, so the newest value wins instead
  // of being blindly added to the older save.
  merged.bestScore = Math.max(cleanBase.bestScore, merged.bestScore);
  merged.bestDistance = Math.max(cleanBase.bestDistance, merged.bestDistance);
  merged.homeLevel = Math.max(cleanBase.homeLevel, merged.homeLevel);
  merged.bossWins = Math.max(cleanBase.bossWins, merged.bossWins);
  return merged;
}
