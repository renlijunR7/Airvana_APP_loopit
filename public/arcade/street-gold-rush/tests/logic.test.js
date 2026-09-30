import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_PROFILE,
  PROFILE_VERSION,
  clamp,
  createRng,
  difficultyForDistance,
  generatePattern,
  mergeProfile,
  moveTowardLane,
  sanitizeProfile,
  validatePattern,
} from "../game/logic.js";

test("clamp handles normal and reversed ranges", () => {
  assert.equal(clamp(-5, 0, 10), 0);
  assert.equal(clamp(6, 0, 10), 6);
  assert.equal(clamp(18, 0, 10), 10);
  assert.equal(clamp(7, 10, 0), 7);
});

test("createRng produces deterministic bounded sequences", () => {
  const first = createRng("gold-run");
  const second = createRng("gold-run");
  const other = createRng("another-run");
  const sequence = Array.from({ length: 12 }, () => first());

  assert.deepEqual(sequence, Array.from({ length: 12 }, () => second()));
  assert.notDeepEqual(sequence, Array.from({ length: 12 }, () => other()));
  assert.ok(sequence.every((value) => value >= 0 && value < 1));
});

test("difficulty increases smoothly and stays bounded", () => {
  const start = difficultyForDistance(-100);
  const middle = difficultyForDistance(1600);
  const end = difficultyForDistance(99_999);

  assert.equal(start.distance, 0);
  assert.equal(start.level, 1);
  assert.ok(start.speed < middle.speed);
  assert.ok(middle.speed < end.speed);
  assert.ok(start.rowGap > middle.rowGap);
  assert.equal(end.progress, 1);
  assert.equal(end.level, 7);
  assert.equal(end.speed, 24);
});

test("generatePattern is deterministic and every generated template is fair", () => {
  const first = createRng(8675309);
  const second = createRng(8675309);
  const tuning = difficultyForDistance(4000);

  const a = Array.from({ length: 50 }, () => generatePattern(first, tuning));
  const b = Array.from({ length: 50 }, () => generatePattern(second, tuning));

  assert.deepEqual(a, b);
  assert.ok(a.every(validatePattern));
  const supportedTypes = new Set([
    "coin", "barrier", "sign", "car", "truck", "magnet", "shield", "x2", "jetpack",
  ]);
  assert.ok(a.every((pattern) => pattern.rows.every((row) =>
    row.z >= 0
    && row.z <= 32
    && row.items.every((item) => supportedTypes.has(item.type)),
  )));
  assert.ok(a.every((pattern) =>
    pattern.span === Math.max(...pattern.rows.map((row) => row.z)) + 4,
  ));

  for (let seed = 0; seed < 250; seed += 1) {
    assert.equal(
      validatePattern(generatePattern(createRng(seed), tuning)),
      true,
      `seed ${seed} produced an unfair pattern`,
    );
  }
});

test("validatePattern rejects malformed or fully blocked rows", () => {
  assert.equal(validatePattern(null), false);
  assert.equal(validatePattern({ rows: [] }), false);
  assert.equal(validatePattern({
    id: "blocked",
    rows: [{
      z: 10,
      items: [0, 1, 2].map((lane) => ({ lane, type: "car" })),
    }],
  }), false);
  assert.equal(validatePattern({
    id: "bad-lane",
    rows: [{ z: 10, items: [{ lane: 3, type: "coin" }] }],
  }), false);
});

test("validatePattern rejects a too-fast forced cross-track switch", () => {
  const forceLeft = [1, 2].map((lane) => ({ lane, type: "car" }));
  const forceRight = [0, 1].map((lane) => ({ lane, type: "car" }));
  assert.equal(validatePattern({
    id: "unreachable-switch",
    rows: [
      { z: 10, items: forceLeft },
      { z: 12, items: forceRight },
    ],
  }), false);
  assert.equal(validatePattern({
    id: "reachable-switch",
    rows: [
      { z: 10, items: forceLeft },
      { z: 18, items: forceRight },
    ],
  }), true);
});

test("moveTowardLane is frame-rate aware and cannot overshoot", () => {
  assert.equal(moveTowardLane(-1, 1, 0, 0.2), -1);
  assert.equal(moveTowardLane(-1, 1, 0.05, 0.2), -0.5);
  assert.equal(moveTowardLane(-1, 1, 1, 0.2), 1);
  assert.equal(moveTowardLane(-1, 1, 0.1, 0), 1);
  assert.equal(moveTowardLane(1, -1, -1, 0.2), 1);
});

test("sanitizeProfile migrates legacy saves and rejects unsafe values", () => {
  assert.deepEqual(sanitizeProfile(null), DEFAULT_PROFILE);
  assert.deepEqual(sanitizeProfile({
    version: 0,
    highScore: "1234.8",
    distanceRecord: 876,
    totalCoins: 92,
    gamesPlayed: 4,
    homeLevel: 3,
    homeXP: 44,
    bossWins: 2,
    selectedCharacter: "ginger",
    selectedWorld: "harbor",
    tutorialSeen: true,
    soundEnabled: false,
    injected: "discard me",
  }), {
    version: PROFILE_VERSION,
    bestScore: 1234,
    bestDistance: 876,
    totalGold: 92,
    runs: 4,
    homeLevel: 3,
    homeXP: 44,
    bossWins: 2,
    selectedCharacter: "ginger",
    selectedWorld: "harbor",
    tutorialSeen: true,
    muted: true,
  });

  const cleaned = sanitizeProfile({
    bestScore: -1,
    bestDistance: Infinity,
    totalGold: Number.NaN,
    runs: 2.9,
    homeLevel: 0,
    homeXP: -20,
    bossWins: Infinity,
    selectedCharacter: "<script>",
    selectedWorld: "",
    tutorialSeen: "yes",
    muted: 1,
  });
  assert.deepEqual(cleaned, { ...DEFAULT_PROFILE, runs: 2 });
  assert.notStrictEqual(cleaned, DEFAULT_PROFILE);
});

test("mergeProfile applies partial updates without erasing clean fields", () => {
  const base = {
    version: PROFILE_VERSION,
    bestScore: 300,
    bestDistance: 80,
    totalGold: 40,
    runs: 2,
    homeLevel: 3,
    homeXP: 25,
    bossWins: 2,
    selectedCharacter: "graytail",
    selectedWorld: "neighborhood",
    tutorialSeen: true,
    muted: false,
  };

  assert.deepEqual(mergeProfile(base, {
    bestScore: 250,
    bestDistance: 120,
    totalGold: 55,
    homeLevel: 2,
    homeXP: 5,
    bossWins: 4,
    selectedCharacter: "ginger",
    selectedWorld: "snow",
    muted: true,
  }), {
    ...base,
    bestDistance: 120,
    totalGold: 55,
    homeXP: 5,
    bossWins: 4,
    selectedCharacter: "ginger",
    selectedWorld: "snow",
    muted: true,
  });
  assert.equal(mergeProfile(base, { coins: 8 }).totalGold, 8);
  assert.deepEqual(mergeProfile(base, undefined), base);
});
