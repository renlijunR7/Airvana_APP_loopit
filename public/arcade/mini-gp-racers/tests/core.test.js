const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../core.js");

test("new players start with Comet and a usable coin balance", () => {
  const save = core.createSave();
  assert.equal(save.balance, 600);
  assert.deepEqual(save.ownedCars, ["comet"]);
  assert.equal(save.selectedCar, "comet");
  assert.deepEqual(core.effectiveStats(save, "comet"), { speed: 46, brake: 52, steering: 56 });
});

test("car purchase rejects insufficient funds and deducts once", () => {
  const save = core.createSave();
  const rejected = core.buyCar(save, "bolt");
  assert.equal(rejected.ok, false);
  assert.equal(rejected.missing, 800);
  save.balance = 2000;
  assert.equal(core.buyCar(save, "bolt").ok, true);
  assert.equal(save.balance, 600);
  assert.equal(save.selectedCar, "bolt");
  assert.equal(core.buyCar(save, "bolt").alreadyOwned, true);
  assert.equal(save.balance, 600);
});

test("upgrades affect only their mapped car stat and stop at level four", () => {
  const save = core.createSave();
  save.balance = 100000;
  for (let index = 0; index < 4; index += 1) assert.equal(core.buyUpgrade(save, "comet", "engine").ok, true);
  assert.equal(core.buyUpgrade(save, "comet", "engine").reason, "max");
  assert.deepEqual(core.effectiveStats(save, "comet"), { speed: 58, brake: 52, steering: 56 });
  assert.equal(core.upgradeCost("engine", 4), null);
});

test("style purchase is idempotent and persists the equipped choice", () => {
  const save = core.createSave();
  save.balance = 1000;
  assert.equal(core.buyOrEquipStyle(save, "comet", "body", "race-red").ok, true);
  assert.equal(save.balance, 780);
  assert.equal(core.buyOrEquipStyle(save, "comet", "body", "race-red").ok, true);
  assert.equal(save.balance, 780);
  assert.equal(core.resolvedColors(save, "comet").body, "#ef4b5d");
});

test("race settlement combines rewards and unlocks achievement cars", () => {
  const save = core.createSave();
  save.stats.overtakes = 11;
  save.stats.wins = 2;
  const reward = core.applyRaceResult(save, { overtakes: 3, position: 7, combo: 3, coins: 25 });
  assert.equal(reward.finishReward, 180);
  assert.equal(reward.overtakeReward, 25);
  assert.equal(reward.targetBonus, 300);
  assert.equal(reward.total, 505);
  assert.ok(save.ownedCars.includes("nova"));
  assert.ok(save.ownedCars.includes("shadow"));
  assert.equal(save.stats.wins, 3);
  assert.equal(save.stats.bestPosition, 7);
});

test("corrupt and out-of-range save fields are repaired", () => {
  const normalized = core.normalizeSave({
    balance: -100,
    selectedCar: "missing",
    ownedCars: ["missing"],
    garage: { comet: { upgrades: { engine: 99, aero: -2, tires: 2.8 } } },
    stats: { races: -7 }
  });
  assert.equal(normalized.balance, 0);
  assert.deepEqual(normalized.ownedCars, ["comet"]);
  assert.equal(normalized.selectedCar, "comet");
  assert.deepEqual(normalized.garage.comet.upgrades, { engine: 4, aero: 0, tires: 2 });
  assert.equal(normalized.stats.races, 0);
});
