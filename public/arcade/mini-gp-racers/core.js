(function (root) {
  "use strict";

  const SAVE_KEY = "mini-gp-racers-replica-v1";

  const CARS = [
    { id: "comet", name: "Comet", number: "01", raceNumber: "26", price: 0, speed: 46, brake: 52, steering: 56, topKph: 238, body: "#16d8ff", accent: "#ffe029", modelStyle: { width: .96, length: .98, height: 1.02, wing: 1, kit: "comet-classic" } },
    { id: "bolt", name: "Bolt", number: "02", raceNumber: "26", price: 1400, speed: 56, brake: 55, steering: 60, topKph: 252, body: "#ff7a18", accent: "#171a22", modelStyle: { width: .92, length: 1.07, height: .94, wing: .91, kit: "bolt-arrow" } },
    { id: "lynx", name: "Lynx", number: "03", raceNumber: "26", price: 3200, speed: 63, brake: 62, steering: 74, topKph: 264, body: "#9bea31", accent: "#5d38db", modelStyle: { width: 1.04, length: .94, height: 1.06, wing: 1.1, kit: "lynx-claw" } },
    { id: "rhino", name: "Rhino", number: "04", raceNumber: "26", price: 6200, speed: 69, brake: 78, steering: 66, topKph: 276, body: "#f04444", accent: "#f4f2e9", modelStyle: { width: 1.08, length: .96, height: 1.08, wing: 1.14, kit: "rhino-armor" } },
    { id: "falcon", name: "Falcon RS", number: "05", raceNumber: "26", price: 10500, speed: 78, brake: 74, steering: 80, topKph: 292, body: "#2074ff", accent: "#f3f1e8", modelStyle: { width: .98, length: 1.08, height: .92, wing: 1.08, kit: "falcon-sweep" } },
    { id: "vortex", name: "Vortex XR", number: "06", raceNumber: "26", price: 18000, speed: 86, brake: 80, steering: 83, topKph: 306, body: "#8d3bff", accent: "#20f1e8", modelStyle: { width: 1, length: 1.1, height: .9, wing: .96, kit: "vortex-tunnel" } },
    { id: "nova", name: "Nova GT", number: "07", raceNumber: "26", price: null, speed: 92, brake: 91, steering: 91, topKph: 318, body: "#ffd21c", accent: "#ff3f34", modelStyle: { width: 1.07, length: 1.04, height: .92, wing: 1.12, aero: "nova-boomerang" }, achievement: "overtakes", target: 12 },
    { id: "shadow", name: "Shadow X", number: "08", raceNumber: "26", price: null, speed: 95, brake: 87, steering: 94, topKph: 326, body: "#20242e", accent: "#ff3154", modelStyle: { width: 1.02, length: 1.11, height: .88, wing: 1.08, aero: "shadow-split" }, achievement: "wins", target: 3 }
  ];

  const CHALLENGES = [
    { target: 3, duration: 55, bonus: 300 },
    { target: 4, duration: 55, bonus: 400 },
    { target: 5, duration: 60, bonus: 520 },
    { target: 4, duration: 60, bonus: 600 },
    { target: 6, duration: 65, bonus: 760 },
    { target: 6, duration: 65, bonus: 900 },
    { target: 7, duration: 70, bonus: 1100 },
    { target: 7, duration: 75, bonus: 1400 }
  ];

  const UPGRADES = {
    engine: { label: "发动机", short: "PU", costs: [180, 380, 720, 1200], gains: { speed: 3, brake: 0, steering: 0 }, description: "极速 +3" },
    aero: { label: "尾翼", short: "AR", costs: [150, 320, 610, 1020], gains: { speed: 0, brake: 1, steering: 5 }, description: "刹车 +1 · 转向 +5" },
    tires: { label: "轮胎", short: "WH", costs: [140, 300, 570, 950], gains: { speed: 0, brake: 4, steering: 2 }, description: "刹车 +4 · 转向 +2" }
  };

  const STYLE_OPTIONS = {
    body: [
      { id: "factory", label: "原厂青", color: null, price: 0 },
      { id: "electric", label: "电光蓝", color: "#2f91ff", price: 180 },
      { id: "race-red", label: "竞速红", color: "#ef4b5d", price: 220 },
      { id: "lime", label: "青柠绿", color: "#8bd34d", price: 260 },
      { id: "orange", label: "烈焰橙", color: "#ff963a", price: 300 },
      { id: "midnight", label: "午夜蓝", color: "#354f7d", price: 380 },
      { id: "pearl", label: "珍珠白", color: "#f3efe5", price: 450 }
    ],
    wing: [
      { id: "factory", label: "原厂色", color: null, price: 0 },
      { id: "yellow", label: "极速黄", color: "#ffd020", price: 160 },
      { id: "cyan", label: "电光青", color: "#35d8dc", price: 190 },
      { id: "violet", label: "霓虹紫", color: "#8053c9", price: 230 },
      { id: "red", label: "赛道红", color: "#ef4d54", price: 260 },
      { id: "carbon", label: "碳纤黑", color: "#232a2e", price: 320 }
    ],
    rim: [
      { id: "factory", label: "原厂色", color: null, price: 0 },
      { id: "black", label: "曜石黑", color: "#111417", price: 140 },
      { id: "silver", label: "金属银", color: "#bdc2c6", price: 170 },
      { id: "gold", label: "冠军金", color: "#e4ad32", price: 260 },
      { id: "cyan", label: "电光青", color: "#1ed4d8", price: 300 },
      { id: "red", label: "竞速红", color: "#e8464b", price: 300 }
    ]
  };

  function carById(id) {
    return CARS.find((car) => car.id === id) || CARS[0];
  }

  function blankGarageEntry() {
    return {
      upgrades: { engine: 0, aero: 0, tires: 0 },
      selectedStyle: { body: "factory", wing: "factory", rim: "factory" },
      unlockedStyles: { body: ["factory"], wing: ["factory"], rim: ["factory"] }
    };
  }

  function createSave() {
    const garage = {};
    CARS.forEach((car) => { garage[car.id] = blankGarageEntry(); });
    return {
      version: 1,
      balance: 600,
      challengeIndex: 0,
      selectedCar: "comet",
      ownedCars: ["comet"],
      garage,
      stats: { races: 0, wins: 0, overtakes: 0, bestCombo: 0, bestPosition: 12 },
      settings: { sound: true, quality: "auto" }
    };
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeSave(candidate) {
    const fresh = createSave();
    if (!candidate || typeof candidate !== "object") return fresh;
    const result = fresh;
    result.balance = Number.isFinite(candidate.balance) ? Math.max(0, Math.floor(candidate.balance)) : fresh.balance;
    result.challengeIndex = Number.isFinite(candidate.challengeIndex) ? Math.max(0, Math.floor(candidate.challengeIndex)) % CHALLENGES.length : 0;
    result.ownedCars = Array.isArray(candidate.ownedCars)
      ? [...new Set(candidate.ownedCars.filter((id) => CARS.some((car) => car.id === id)))]
      : ["comet"];
    if (!result.ownedCars.includes("comet")) result.ownedCars.unshift("comet");
    result.selectedCar = result.ownedCars.includes(candidate.selectedCar) ? candidate.selectedCar : "comet";

    CARS.forEach((car) => {
      const incoming = candidate.garage && candidate.garage[car.id];
      if (!incoming || typeof incoming !== "object") return;
      Object.keys(UPGRADES).forEach((type) => {
        const level = incoming.upgrades && incoming.upgrades[type];
        result.garage[car.id].upgrades[type] = Number.isFinite(level) ? Math.max(0, Math.min(4, Math.floor(level))) : 0;
      });
      Object.keys(STYLE_OPTIONS).forEach((part) => {
        const validIds = STYLE_OPTIONS[part].map((option) => option.id);
        const owned = incoming.unlockedStyles && Array.isArray(incoming.unlockedStyles[part])
          ? incoming.unlockedStyles[part].filter((id) => validIds.includes(id))
          : ["factory"];
        result.garage[car.id].unlockedStyles[part] = [...new Set(["factory", ...owned])];
        const selected = incoming.selectedStyle && incoming.selectedStyle[part];
        result.garage[car.id].selectedStyle[part] = result.garage[car.id].unlockedStyles[part].includes(selected) ? selected : "factory";
      });
    });

    if (candidate.stats && typeof candidate.stats === "object") {
      Object.keys(result.stats).forEach((key) => {
        const value = candidate.stats[key];
        if (Number.isFinite(value)) result.stats[key] = Math.max(0, Math.floor(value));
      });
    }
    if (candidate.settings && typeof candidate.settings === "object") {
      result.settings.sound = candidate.settings.sound !== false;
      result.settings.quality = ["auto", "low", "high"].includes(candidate.settings.quality) ? candidate.settings.quality : "auto";
    }
    unlockAchievements(result);
    return result;
  }

  function load(storage) {
    const target = storage || (typeof localStorage !== "undefined" ? localStorage : null);
    if (!target) return createSave();
    try {
      return normalizeSave(JSON.parse(target.getItem(SAVE_KEY)));
    } catch (_) {
      return createSave();
    }
  }

  function persist(save, storage) {
    const target = storage || (typeof localStorage !== "undefined" ? localStorage : null);
    if (target) target.setItem(SAVE_KEY, JSON.stringify(normalizeSave(save)));
    return save;
  }

  function upgradeCost(type, level, carId) {
    const data = UPGRADES[type];
    if (!data || level >= 4) return null;
    const cometCosts = {
      engine: [180, 380, 750, 1400],
      aero: [150, 320, 650, 1250],
      tires: [140, 290, 600, 1150]
    };
    const otherCosts = {
      engine: [300, 850, 1800, 3400],
      aero: [250, 700, 1550, 3000],
      tires: [220, 650, 1450, 2800]
    };
    return (carId === "comet" ? cometCosts : otherCosts)[type][level];
  }

  function effectiveStats(save, id) {
    const car = carById(id);
    const garage = save.garage[id] || blankGarageEntry();
    const levels = garage.upgrades;
    return {
      speed: Math.min(100, car.speed + Object.entries(UPGRADES).reduce((sum, [type, data]) => sum + levels[type] * data.gains.speed, 0)),
      brake: Math.min(100, car.brake + Object.entries(UPGRADES).reduce((sum, [type, data]) => sum + levels[type] * data.gains.brake, 0)),
      steering: Math.min(100, car.steering + Object.entries(UPGRADES).reduce((sum, [type, data]) => sum + levels[type] * data.gains.steering, 0))
    };
  }

  function buyCar(save, id) {
    const car = carById(id);
    if (save.ownedCars.includes(car.id)) {
      save.selectedCar = car.id;
      return { ok: true, alreadyOwned: true };
    }
    if (car.price === null) return { ok: false, reason: "achievement" };
    if (save.balance < car.price) return { ok: false, reason: "coins", missing: car.price - save.balance };
    save.balance -= car.price;
    save.ownedCars.push(car.id);
    save.selectedCar = car.id;
    return { ok: true, purchased: true };
  }

  function buyUpgrade(save, id, type) {
    if (!save.ownedCars.includes(id) || !UPGRADES[type]) return { ok: false, reason: "locked" };
    const entry = save.garage[id];
    const level = entry.upgrades[type];
    const cost = upgradeCost(type, level, id);
    if (cost === null) return { ok: false, reason: "max" };
    if (save.balance < cost) return { ok: false, reason: "coins", missing: cost - save.balance };
    save.balance -= cost;
    entry.upgrades[type] += 1;
    return { ok: true, level: entry.upgrades[type], cost };
  }

  function styleOption(part, id) {
    return (STYLE_OPTIONS[part] || []).find((option) => option.id === id);
  }

  function buyOrEquipStyle(save, carId, part, optionId) {
    if (!save.ownedCars.includes(carId)) return { ok: false, reason: "locked" };
    const option = styleOption(part, optionId);
    if (!option) return { ok: false, reason: "unknown" };
    const entry = save.garage[carId];
    const unlocked = entry.unlockedStyles[part];
    if (!unlocked.includes(option.id)) {
      if (save.balance < option.price) return { ok: false, reason: "coins", missing: option.price - save.balance };
      save.balance -= option.price;
      unlocked.push(option.id);
    }
    entry.selectedStyle[part] = option.id;
    return { ok: true, equipped: true };
  }

  function resolvedColors(save, id) {
    const car = carById(id);
    const selection = save.garage[id].selectedStyle;
    const resolve = (part, fallback) => {
      const option = styleOption(part, selection[part]);
      return option && option.color ? option.color : fallback;
    };
    return {
      body: resolve("body", car.body),
      wing: resolve("wing", car.accent),
      rim: resolve("rim", "#15191e")
    };
  }

  function achievementProgress(save, car) {
    if (!car.achievement) return { current: 0, target: 0, complete: false };
    const current = car.achievement === "wins" ? save.stats.wins : save.stats.overtakes;
    return { current, target: car.target, complete: current >= car.target };
  }

  function unlockAchievements(save) {
    const unlocked = [];
    CARS.filter((car) => car.achievement).forEach((car) => {
      if (achievementProgress(save, car).complete && !save.ownedCars.includes(car.id)) {
        save.ownedCars.push(car.id);
        unlocked.push(car.id);
      }
    });
    return unlocked;
  }

  function currentChallenge(save) {
    return CHALLENGES[(save.challengeIndex || 0) % CHALLENGES.length];
  }

  function applyRaceResult(save, summary) {
    const challenge = currentChallenge(save);
    const overtakes = Math.max(0, Math.floor(summary.overtakes || 0));
    const position = Math.max(1, Math.min(12, Math.floor(summary.position || 12)));
    const combo = Math.max(0, Math.floor(summary.combo || 0));
    const finishReward = 180;
    const raceCoins = Math.max(0, Math.floor(summary.coins || 0));
    const overtakeReward = raceCoins;
    const target = Math.max(1, Math.floor(summary.target || challenge.target));
    const success = overtakes >= target;
    const targetBonus = success ? challenge.bonus : 0;
    const total = finishReward + overtakeReward + targetBonus;
    save.balance += total;
    save.stats.races += 1;
    save.stats.overtakes += overtakes;
    save.stats.bestCombo = Math.max(save.stats.bestCombo, combo);
    save.stats.bestPosition = Math.min(save.stats.bestPosition || 12, position);
    if (success) {
      save.stats.wins += 1;
      save.challengeIndex = (save.challengeIndex + 1) % CHALLENGES.length;
    }
    const unlocked = unlockAchievements(save);
    return { finishReward, overtakeReward, raceCoins, targetBonus, total, unlocked, success, target, challenge };
  }

  const api = {
    SAVE_KEY,
    CARS,
    CHALLENGES,
    UPGRADES,
    STYLE_OPTIONS,
    createSave,
    clone,
    normalizeSave,
    load,
    persist,
    carById,
    effectiveStats,
    upgradeCost,
    buyCar,
    buyUpgrade,
    buyOrEquipStyle,
    resolvedColors,
    achievementProgress,
    unlockAchievements,
    currentChallenge,
    applyRaceResult
  };

  root.MiniGPCore = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
