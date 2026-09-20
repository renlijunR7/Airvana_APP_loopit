(function () {
  "use strict";

  const core = window.MiniGPCore;
  if (!core || !window.THREE || !window.RaceEngine) {
    document.body.innerHTML = '<main style="padding:32px;color:white;background:#071017;min-height:100vh"><h1>游戏加载失败</h1><p>请确认本地文件完整后刷新页面。</p></main>';
    return;
  }

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const formatNumber = (value) => Math.max(0, Math.floor(value || 0)).toLocaleString("zh-CN");

  const dom = {
    boot: $("#boot"),
    garageScreen: $("#garageScreen"),
    raceScreen: $("#raceScreen"),
    resultScreen: $("#resultScreen"),
    carRail: $("#carRail"),
    carSummary: $("#carSummary"),
    garageTabs: $("#garageTabs"),
    garageContent: $("#garageContent"),
    garageCanvas: $("#garageCanvas"),
    raceCanvas: $("#raceCanvas"),
    balance: $("#balance"),
    soundBtn: $("#soundBtn"),
    toast: $("#toast"),
    pausePanel: $("#pausePanel"),
    startLights: $("#startLights"),
    raceMessage: $("#raceMessage")
  };

  let save = core.load();
  let previewCarId = save.selectedCar;
  let activeTab = "cars";
  let race = null;
  let raceFinished = false;
  let toastTimer = 0;
  let messageTimer = 0;
  let previousCountdown = null;
  let currentTrackName = "涡轮山丘";

  class GarageRenderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.active = true;
      this.angle = 0.18;
      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.FogExp2(0x071018, 0.033);
      this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
      this.camera.position.set(10.5, 5.2, 12.5);
      this.camera.lookAt(0, 0.7, 0);
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
      this.renderer.setClearColor(0x050c12, 1);
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.12;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      const hemi = new THREE.HemisphereLight(0xcdfaff, 0x071018, 2.1);
      this.scene.add(hemi);
      const key = new THREE.DirectionalLight(0xffffff, 3.1);
      key.position.set(-5, 11, 8);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.camera.left = -8;
      key.shadow.camera.right = 8;
      key.shadow.camera.top = 8;
      key.shadow.camera.bottom = -8;
      this.scene.add(key);
      const rim = new THREE.PointLight(0x00c8ff, 34, 25, 2);
      rim.position.set(7, 3, -4);
      this.scene.add(rim);
      const warm = new THREE.PointLight(0xffd200, 28, 18, 2);
      warm.position.set(-6, 2, 4);
      this.scene.add(warm);

      this.turntable = new THREE.Group();
      this.scene.add(this.turntable);
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(6.1, 6.5, 0.58, 80),
        new THREE.MeshStandardMaterial({ color: 0x101b24, roughness: 0.62, metalness: 0.45 })
      );
      base.position.y = -0.32;
      base.receiveShadow = true;
      this.turntable.add(base);
      const top = new THREE.Mesh(
        new THREE.CylinderGeometry(5.35, 5.35, 0.12, 80),
        new THREE.MeshStandardMaterial({ color: 0x050d13, roughness: 0.32, metalness: 0.18 })
      );
      top.position.y = 0.02;
      top.receiveShadow = true;
      this.turntable.add(top);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(5.43, 0.055, 10, 96),
        new THREE.MeshBasicMaterial({ color: 0xffe568 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.1;
      this.turntable.add(ring);

      const grid = new THREE.GridHelper(38, 38, 0x174f67, 0x123142);
      grid.position.y = -0.63;
      grid.material.transparent = true;
      grid.material.opacity = 0.48;
      this.scene.add(grid);

      this.car = null;
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(canvas.parentElement);
      this.resize();
      this.animate = this.animate.bind(this);
      requestAnimationFrame(this.animate);
    }

    setCar(car, colors) {
      if (this.car) {
        this.turntable.remove(this.car);
        RaceEngine.releaseObject(this.car);
      }
      this.car = RaceEngine.createCarModel({
        bodyColor: colors.body,
        wingColor: colors.wing,
        rimColor: colors.rim,
        number: car.number,
        raceNumber: car.raceNumber,
        modelStyle: car.modelStyle,
        name: car.name,
        scale: 1.85
      });
      this.car.position.y = 0.1;
      this.car.rotation.y = 0.18;
      this.turntable.add(this.car);
    }

    setActive(active) { this.active = active; }

    resize() {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, width < 700 ? 1.45 : 1.8);
      this.renderer.setPixelRatio(dpr);
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }

    animate(time) {
      requestAnimationFrame(this.animate);
      if (!this.active) return;
      this.angle += 0.00025;
      if (this.car) {
        this.car.rotation.y = this.angle + Math.sin(time * 0.00028) * 0.12;
        this.car.position.y = 0.13 + Math.sin(time * 0.0014) * 0.018;
      }
      this.renderer.render(this.scene, this.camera);
    }
  }

  class AudioRig {
    constructor() {
      this.context = null;
      this.engine = null;
      this.engineGain = null;
      this.lastCountdown = null;
    }

    ensure() {
      if (!save.settings.sound) return false;
      if (!this.context) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return false;
        this.context = new AudioContext();
      }
      if (this.context.state === "suspended") this.context.resume();
      return true;
    }

    startEngine() {
      if (!this.ensure() || this.engine) return;
      this.engine = this.context.createOscillator();
      this.engineGain = this.context.createGain();
      const filter = this.context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 780;
      this.engine.type = "sawtooth";
      this.engine.frequency.value = 62;
      this.engineGain.gain.value = 0.0001;
      this.engine.connect(filter).connect(this.engineGain).connect(this.context.destination);
      this.engine.start();
      this.engineGain.gain.exponentialRampToValueAtTime(0.032, this.context.currentTime + 0.2);
    }

    update(hud) {
      if (!this.engine || !this.context) return;
      const now = this.context.currentTime;
      const frequency = 55 + (hud.speed || 0) * 2.15 + (hud.throttle || 0) * 36;
      this.engine.frequency.setTargetAtTime(frequency, now, 0.045);
      this.engineGain.gain.setTargetAtTime(save.settings.sound ? 0.022 + (hud.throttle || 0) * 0.018 : 0.0001, now, 0.07);
      if (hud.countdown !== this.lastCountdown && Number.isFinite(hud.countdown)) {
        this.lastCountdown = hud.countdown;
        this.beep(hud.countdown <= 0 ? 760 : 330 + (3 - hud.countdown) * 70, hud.countdown <= 0 ? 0.18 : 0.09);
      }
    }

    beep(frequency, duration) {
      if (!this.ensure()) return;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = "square";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, this.context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, this.context.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + duration);
      oscillator.connect(gain).connect(this.context.destination);
      oscillator.start();
      oscillator.stop(this.context.currentTime + duration + 0.02);
    }

    stop() {
      if (!this.engine || !this.context) return;
      const oscillator = this.engine;
      this.engineGain.gain.setTargetAtTime(0.0001, this.context.currentTime, 0.04);
      setTimeout(() => { try { oscillator.stop(); } catch (_) {} }, 180);
      this.engine = null;
      this.engineGain = null;
      this.lastCountdown = null;
    }
  }

  const garageRenderer = new GarageRenderer(dom.garageCanvas);
  const audio = new AudioRig();

  function toast(message) {
    clearTimeout(toastTimer);
    dom.toast.textContent = message;
    dom.toast.classList.add("show");
    toastTimer = setTimeout(() => dom.toast.classList.remove("show"), 2200);
  }

  function persist() {
    core.persist(save);
  }

  function renderCarRail() {
    dom.carRail.innerHTML = core.CARS.map((car) => {
      const owned = save.ownedCars.includes(car.id);
      const reward = car.price === null;
      const progress = core.achievementProgress(save, car);
      const status = owned
        ? '<span class="car-status">✓</span>'
        : reward
          ? `<span class="car-status reward">▶</span><span class="car-lock">${Math.min(progress.current, progress.target)}/${progress.target}</span>`
          : `<span class="car-status locked">▣</span><span class="car-lock"><span class="coin">●</span> ${formatNumber(car.price)}</span>`;
      return `<button class="car-tile${reward ? " reward" : ""}" type="button" role="tab" aria-selected="${previewCarId === car.id}" data-car-id="${car.id}" aria-label="${car.name}${owned ? "，已拥有" : "，未解锁"}">
        <span class="car-swatch" style="background:linear-gradient(90deg,${car.body} 0 70%,${car.accent} 70%)"></span>
        <span class="car-number">${car.number}</span>
        <span class="car-name">${car.name}</span>
        ${status}
      </button>`;
    }).join("");
  }

  function statRow(label, value) {
    return `<div class="stat-row"><span>${label}</span><span class="stat-bar"><i style="--value:${value}%"></i></span><b>${value}</b></div>`;
  }

  function renderSummary() {
    const car = core.carById(previewCarId);
    const owned = save.ownedCars.includes(car.id);
    const stats = owned ? core.effectiveStats(save, car.id) : { speed: car.speed, brake: car.brake, steering: car.steering };
    let cta = "";
    if (owned) {
      cta = '<button class="race-cta" type="button" data-action="start-race">开始挑战</button>';
    } else if (car.price !== null) {
      cta = `<button class="race-cta" type="button" data-action="buy-car">购买赛车 · <span class="coin">●</span> ${formatNumber(car.price)}</button>`;
    } else {
      const progress = core.achievementProgress(save, car);
      const description = car.achievement === "wins" ? "完成目标挑战" : "累计超车";
      cta = `<button class="race-cta" type="button" disabled>${description} ${progress.current}/${progress.target} 解锁</button>`;
    }
    dom.carSummary.innerHTML = `<div class="summary-top">
      <div class="summary-name"><h1>${car.name}</h1><span class="owned-tag${owned ? "" : " locked"}">${owned ? "OWNED" : "LOCKED"}</span></div>
      <div class="stats">${statRow("速度", stats.speed)}${statRow("刹车", stats.brake)}${statRow("转向", stats.steering)}</div>
    </div>${cta}`;
  }

  function renderCarsPanel() {
    const car = core.carById(previewCarId);
    const owned = save.ownedCars.includes(car.id);
    const progress = core.achievementProgress(save, car);
    let title = "准备开跑";
    let copy = "超越对手、赚取赛车币，并把升级真实地装到你的赛车上。";
    if (!owned && car.price !== null) {
      title = "锁定赛车";
      copy = `还需要 ${formatNumber(Math.max(0, car.price - save.balance))} 枚赛车币。先用 Comet 参加挑战赚取奖励。`;
    } else if (!owned) {
      title = "赛事成就赛车";
      copy = car.achievement === "wins"
        ? `完成 ${car.target} 次“3次超车”目标即可解锁，目前 ${progress.current}/${progress.target}。`
        : `累计完成 ${car.target} 次超车即可解锁，目前 ${progress.current}/${progress.target}。`;
    }
    const challenge = core.currentChallenge(save);
    dom.garageContent.innerHTML = `<div class="ready-panel">
      <span class="eyebrow">挑战 ${save.challengeIndex + 1}/8 · 单圈 · ${challenge.duration} 秒 · ${challenge.target} 次超车</span>
      <h2>${title}</h2><p>${copy}</p>
      <div class="milestone-row"><span>${save.stats.races} 场比赛</span><span>${save.stats.overtakes} 次超车</span><span>最佳 P${save.stats.bestPosition || 12}</span></div>
    </div>`;
  }

  function renderUpgradePanel() {
    const owned = save.ownedCars.includes(previewCarId);
    const entry = save.garage[previewCarId];
    dom.garageContent.innerHTML = `<div class="upgrade-list">${Object.entries(core.UPGRADES).map(([type, data]) => {
      const level = entry.upgrades[type];
      const cost = core.upgradeCost(type, level, previewCarId);
      const dots = Array.from({ length: 4 }, (_, index) => `<i class="${index < level ? "on" : ""}"></i>`).join("");
      return `<button class="upgrade-item" type="button" data-upgrade="${type}" ${!owned || level >= 4 ? "disabled" : ""}>
        <span class="upgrade-icon">${data.short}</span>
        <span class="upgrade-meta"><b>${data.label}</b><small>等级 ${level}/4 · ${data.description}</small><span class="level-dots">${dots}</span></span>
        <span class="upgrade-cost">${level >= 4 ? "MAX" : `<span class="coin">●</span> ${formatNumber(cost)}`}</span>
      </button>`;
    }).join("")}</div>`;
  }

  function renderStylePanel() {
    const car = core.carById(previewCarId);
    const entry = save.garage[previewCarId];
    const labels = { body: "车身", wing: "尾翼", rim: "轮毂" };
    const fallbacks = { body: car.body, wing: car.accent, rim: "#15191e" };
    dom.garageContent.innerHTML = `<div class="style-list">${Object.entries(core.STYLE_OPTIONS).map(([part, options]) => {
      const swatches = options.map((option) => {
        const unlocked = entry.unlockedStyles[part].includes(option.id);
        const selected = entry.selectedStyle[part] === option.id;
        const color = option.color || fallbacks[part];
        return `<button class="swatch${selected ? " selected" : ""}" type="button" data-style-part="${part}" data-style-id="${option.id}" style="--swatch:${color}" title="${option.label}${unlocked ? "，已拥有" : `，${option.price} 赛车币`}">
          ${selected ? '<span class="check">✓</span>' : ""}${!unlocked ? `<small>${option.price}</small>` : ""}
        </button>`;
      }).join("");
      return `<section class="style-group"><div class="style-heading"><b>${labels[part]}</b><span>选择颜色</span></div><div class="swatches">${swatches}</div></section>`;
    }).join("")}</div>`;
  }

  function renderContent() {
    if (activeTab === "upgrades") renderUpgradePanel();
    else if (activeTab === "style") renderStylePanel();
    else renderCarsPanel();
  }

  function renderGarage() {
    const owned = save.ownedCars.includes(previewCarId);
    if (!owned && activeTab !== "cars") activeTab = "cars";
    dom.balance.textContent = formatNumber(save.balance);
    dom.soundBtn.classList.toggle("off", !save.settings.sound);
    dom.soundBtn.setAttribute("aria-pressed", String(save.settings.sound));
    renderCarRail();
    renderSummary();
    $$("button", dom.garageTabs).forEach((button) => {
      button.classList.toggle("active", button.dataset.tab === activeTab);
      button.disabled = !owned && button.dataset.tab !== "cars";
    });
    renderContent();
    const car = core.carById(previewCarId);
    garageRenderer.setCar(car, core.resolvedColors(save, car.id));
  }

  function chooseCar(id) {
    previewCarId = core.carById(id).id;
    if (save.ownedCars.includes(previewCarId)) save.selectedCar = previewCarId;
    else activeTab = "cars";
    persist();
    renderGarage();
  }

  function buySelectedCar() {
    const result = core.buyCar(save, previewCarId);
    if (!result.ok) {
      if (result.reason === "coins") toast(`还差 ${formatNumber(result.missing)} 枚赛车币`);
      else toast("完成对应赛事成就即可解锁");
      return;
    }
    persist();
    toast(`${core.carById(previewCarId).name} 已加入车库`);
    renderGarage();
  }

  function setControl(name, pressed) {
    if (race) race.setControl(name, pressed);
    $$(`[data-control="${name}"]`, dom.raceScreen).forEach((button) => {
      button.classList.toggle("pressed", pressed);
      if (name === "drift") button.setAttribute("aria-pressed", String(pressed));
    });
  }

  function releaseAllControls() {
    ["left", "right", "throttle", "brake", "boost", "drift"].forEach((name) => setControl(name, false));
    $$('[data-control].pressed').forEach((button) => button.classList.remove("pressed"));
  }

  function formatTime(seconds) {
    const safe = Math.max(0, Math.ceil(seconds || 0));
    return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
  }

  function showRaceMessage(message, duration = 950) {
    if (!message) return;
    clearTimeout(messageTimer);
    dom.raceMessage.textContent = message;
    dom.raceMessage.classList.add("show");
    messageTimer = setTimeout(() => dom.raceMessage.classList.remove("show"), duration);
  }

  function updateStartLights(hud) {
    const lights = $$("span", dom.startLights);
    if (!hud?.startLightsVisible) {
      dom.startLights.hidden = true;
      return;
    }
    dom.startLights.hidden = false;
    const lit = hud.startLightsOut ? 0 : Math.max(0, Math.min(5, hud.startLightColumns || 0));
    lights.forEach((light, index) => light.classList.toggle("on", (index % 5) < lit));
  }

  function updateHud(hud) {
    if (hud.trackName) currentTrackName = hud.trackName;
    $("#hudTrack").textContent = currentTrackName;
    $("#hudPosition").textContent = `P${hud.position || 12}`;
    $("#hudLap").textContent = `${hud.lap || 1}/${hud.totalLaps || 1}`;
    $("#hudOvertakes").textContent = hud.overtakes || 0;
    $("#hudTarget").textContent = hud.target || 3;
    $("#hudTime").textContent = formatTime(hud.time);
    $("#hudCoins").textContent = formatNumber(hud.coins || 0);
    $("#hudSpeed").textContent = Math.max(0, Math.round(hud.speed || 0));
    $("#hudGear").textContent = hud.gear || 1;
    const driveStatus = $("#driveStatus");
    driveStatus.hidden = !hud.reversing && !hud.drifting;
    driveStatus.textContent = hud.reversing ? "倒车 · R" : "漂移中";
    driveStatus.classList.toggle("reverse", !!hud.reversing);
    $("#driftBtn").classList.toggle("drifting", !!hud.drifting);
    $("#driftHint").textContent = hud.drifting ? "侧滑中 · 松开回正" : "按住 + 转向";
    $("#hudThr").style.width = `${Math.round((hud.throttle || 0) * 100)}%`;
    $("#hudBrk").style.width = `${Math.round((hud.brake || 0) * 100)}%`;
    $("#hudErs").style.width = `${Math.round((hud.boost ?? 1) * 100)}%`;
    updateStartLights(hud);
    if (hud.message) showRaceMessage(hud.message);
    audio.update(hud);
    previousCountdown = hud.countdown;
  }

  function stopRace() {
    releaseAllControls();
    if (race?.stop) race.stop();
    audio.stop();
  }

  function disposeRace() {
    stopRace();
    if (!race) return;
    try { race.dispose(); } catch (_) {}
    race = null;
  }

  function startRace() {
    if (!save.ownedCars.includes(previewCarId)) {
      toast("请先解锁这辆赛车");
      return;
    }
    stopRace();
    raceFinished = false;
    previousCountdown = null;
    save.selectedCar = previewCarId;
    persist();
    dom.garageScreen.hidden = true;
    dom.resultScreen.hidden = true;
    dom.raceScreen.hidden = false;
    dom.pausePanel.hidden = true;
    garageRenderer.setActive(false);
    const car = core.carById(previewCarId);
    const stats = core.effectiveStats(save, previewCarId);
    const colors = core.resolvedColors(save, previewCarId);
    const challenge = core.currentChallenge(save);
    if (!race) {
      race = new RaceEngine({
        canvas: dom.raceCanvas,
        onHud: updateHud,
        onMessage: (message) => showRaceMessage(message),
        onFinish: finishRace
      });
    }
    audio.startEngine();
    race.start({ car: { ...car, ...stats }, upgrades: save.garage[previewCarId].upgrades, colors, target: challenge.target, duration: challenge.duration, totalLaps: 1 });
    race.resize();
  }

  function finishRace(summary) {
    if (raceFinished) return;
    raceFinished = true;
    const safeSummary = {
      position: Math.max(1, Math.min(12, Math.floor(summary.position || 12))),
      overtakes: Math.max(0, Math.floor(summary.overtakes || 0)),
      combo: Math.max(0, Math.floor(summary.combo || 0)),
      coins: Math.max(0, Math.floor(summary.coins || 0)),
      target: Math.max(1, Math.floor(summary.target || core.currentChallenge(save).target)),
      trackName: summary.trackName || currentTrackName
    };
    const rewards = core.applyRaceResult(save, safeSummary);
    persist();
    audio.stop();
    if (race && race.stop) race.stop();
    setTimeout(() => showResults(safeSummary, rewards), 350);
  }

  function showResults(summary, rewards) {
    dom.raceScreen.hidden = true;
    dom.resultScreen.hidden = false;
    const success = summary.overtakes >= summary.target;
    $("#resultTrack").textContent = summary.trackName || currentTrackName;
    $("#resultScore").textContent = summary.overtakes;
    $("#resultTitle").textContent = success ? "挑战完成！" : "就差一点！";
    $("#resultSubtitle").textContent = `你获得第 ${summary.position} 名 · 最佳连超 x${summary.combo}`;
    $("#finishReward").textContent = formatNumber(rewards.finishReward);
    $("#overtakeReward").textContent = formatNumber(rewards.overtakeReward);
    $("#targetBonus").textContent = formatNumber(rewards.targetBonus);
    $("#totalReward").textContent = formatNumber(rewards.total);
    $("#resultBalance").textContent = formatNumber(save.balance);
    const notice = $("#unlockNotice");
    if (rewards.unlocked.length) {
      notice.hidden = false;
      notice.textContent = `新赛车已解锁：${rewards.unlocked.map((id) => core.carById(id).name).join("、")}`;
    } else {
      notice.hidden = true;
    }
  }

  function returnGarage() {
    stopRace();
    dom.raceScreen.hidden = true;
    dom.resultScreen.hidden = true;
    dom.pausePanel.hidden = true;
    dom.garageScreen.hidden = false;
    garageRenderer.setActive(true);
    previewCarId = save.selectedCar;
    renderGarage();
    garageRenderer.resize();
  }

  function togglePause(force) {
    if (!race || raceFinished) return;
    const pause = force === undefined ? dom.pausePanel.hidden : force;
    dom.pausePanel.hidden = !pause;
    releaseAllControls();
    if (race.setPaused) race.setPaused(pause);
  }

  dom.carRail.addEventListener("click", (event) => {
    const tile = event.target.closest("[data-car-id]");
    if (tile) chooseCar(tile.dataset.carId);
  });

  $("#railPrev").addEventListener("click", () => dom.carRail.scrollBy({ left: -320, behavior: "smooth" }));
  $("#railNext").addEventListener("click", () => dom.carRail.scrollBy({ left: 320, behavior: "smooth" }));

  dom.garageTabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-tab]");
    if (!button || button.disabled) return;
    activeTab = button.dataset.tab;
    renderGarage();
  });

  dom.carSummary.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (action === "start-race") startRace();
    if (action === "buy-car") buySelectedCar();
  });

  dom.garageContent.addEventListener("click", (event) => {
    const upgradeButton = event.target.closest("[data-upgrade]");
    if (upgradeButton) {
      const result = core.buyUpgrade(save, previewCarId, upgradeButton.dataset.upgrade);
      if (!result.ok) {
        if (result.reason === "coins") toast(`还差 ${formatNumber(result.missing)} 枚赛车币`);
        return;
      }
      persist();
      audio.beep(520 + result.level * 90, .12);
      toast(`升级完成 · 等级 ${result.level}/4`);
      renderGarage();
      return;
    }
    const swatch = event.target.closest("[data-style-part]");
    if (swatch) {
      const result = core.buyOrEquipStyle(save, previewCarId, swatch.dataset.stylePart, swatch.dataset.styleId);
      if (!result.ok) {
        if (result.reason === "coins") toast(`还差 ${formatNumber(result.missing)} 枚赛车币`);
        return;
      }
      persist();
      audio.beep(620, .08);
      renderGarage();
    }
  });

  dom.soundBtn.addEventListener("click", () => {
    save.settings.sound = !save.settings.sound;
    if (!save.settings.sound) audio.stop();
    else audio.beep(660, .08);
    persist();
    renderGarage();
  });

  $("#resetBtn").addEventListener("click", () => {
    if (!window.confirm("重置车库、升级和比赛记录？此操作无法撤销。")) return;
    save = core.createSave();
    previewCarId = "comet";
    activeTab = "cars";
    persist();
    renderGarage();
    toast("进度已重置");
  });

  const keyMap = {
    ArrowLeft: "left", KeyA: "left",
    ArrowRight: "right", KeyD: "right",
    ArrowUp: "throttle", KeyW: "throttle",
    ArrowDown: "brake", KeyS: "brake",
    ShiftLeft: "drift", ShiftRight: "drift", Space: "boost"
  };
  window.addEventListener("keydown", (event) => {
    if (event.code === "Escape" && !dom.raceScreen.hidden) {
      event.preventDefault();
      togglePause();
      return;
    }
    if (!dom.raceScreen.hidden && dom.pausePanel.hidden && !event.repeat && event.code === "KeyC" && race?.cycleCamera) {
      event.preventDefault();
      showRaceMessage(race.cycleCamera() || "镜头已切换");
      return;
    }
    if (!dom.raceScreen.hidden && dom.pausePanel.hidden && !event.repeat && event.code === "KeyV" && race?.cycleErsMode) {
      event.preventDefault();
      showRaceMessage(race.cycleErsMode() || "ERS 模式已切换");
      return;
    }
    const control = keyMap[event.code];
    if (!control || dom.raceScreen.hidden || !dom.pausePanel.hidden) return;
    event.preventDefault();
    setControl(control, true);
  }, { passive: false });
  window.addEventListener("keyup", (event) => {
    const control = keyMap[event.code];
    if (!control) return;
    event.preventDefault();
    setControl(control, false);
  }, { passive: false });
  window.addEventListener("blur", releaseAllControls);
  document.addEventListener("visibilitychange", () => { if (document.hidden) releaseAllControls(); });

  $$("[data-control]", dom.raceScreen).forEach((button) => {
    const down = (event) => {
      event.preventDefault();
      button.setPointerCapture?.(event.pointerId);
      button.classList.add("pressed");
      setControl(button.dataset.control, true);
    };
    const up = (event) => {
      event.preventDefault();
      button.classList.remove("pressed");
      setControl(button.dataset.control, false);
    };
    button.addEventListener("pointerdown", down, { passive: false });
    button.addEventListener("pointerup", up, { passive: false });
    button.addEventListener("pointercancel", up, { passive: false });
    button.addEventListener("lostpointercapture", up, { passive: false });
  });

  // A focused on-screen handbrake supports keyboard activation as well as touch.
  ["keydown", "keyup"].forEach((type) => $("#driftBtn").addEventListener(type, (event) => {
    if (event.code !== "Space" && event.code !== "Enter") return;
    event.preventDefault();
    // Still let keyup reach the global OVR release if focus changed mid-press.
    if (type === "keydown") event.stopPropagation();
    if (!dom.pausePanel.hidden) return;
    setControl("drift", type === "keydown");
  }));
  $("#driftBtn").addEventListener("blur", () => setControl("drift", false));

  $("#pauseBtn").addEventListener("click", () => togglePause(true));
  $("#resumeBtn").addEventListener("click", () => togglePause(false));

  document.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (action === "garage" || action === "quit-race") returnGarage();
    if (action === "retry") startRace();
  });

  window.addEventListener("resize", () => {
    garageRenderer.resize();
    if (race) race.resize();
  });

  window.addEventListener("beforeunload", disposeRace);

  const finishBoot = () => {
    renderGarage();
    setTimeout(() => dom.boot.classList.add("done"), 220);
  };
  const bootCopy = $(".boot-copy", dom.boot);
  if (bootCopy) bootCopy.textContent = "正在加载原作赛车与赛道材质…";
  RaceEngine.preloadOriginalAssets()
    .then(finishBoot)
    .catch((error) => {
      console.warn("原作素材未能加载，已切换程序化后备素材。", error);
      if (bootCopy) bootCopy.textContent = "素材加载失败，启用后备模式…";
      finishBoot();
    });
})();
