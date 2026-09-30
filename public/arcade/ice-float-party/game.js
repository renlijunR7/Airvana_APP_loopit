import { RiderRenderer, RIDER_TILT } from './rider-renderer.js?v=9';

(() => {
  "use strict";

  const canvas = document.querySelector("#game");
  const ctx = canvas.getContext("2d", { alpha: false });
  const app = document.querySelector("#app");
  const intro = document.querySelector("#intro");
  const result = document.querySelector("#result");
  const pausePanel = document.querySelector("#pausePanel");
  const timerEl = document.querySelector("#timer");
  const aliveEl = document.querySelector("#alive");
  const playersEl = document.querySelector("#players");
  const hintEl = document.querySelector("#hint");
  const joystick = document.querySelector("#joystick");
  const stick = joystick.querySelector("i");
  const dashBtn = document.querySelector("#dashBtn");

  const COLS = 7;
  const ROWS = 8;
  const ROUND_TIME = 45;
  const TAU = Math.PI * 2;
  const BUILD_ID = "ice-float-party-demo-4.2.2-fall-fix";
  const riderRenderer = new RiderRenderer();
  const arenaArt = new Image();
  arenaArt.decoding = "async";
  arenaArt.src = "./assets/ice-arena-grid-base-v3.png";
  const iceSurfaceArt = new Image();
  iceSurfaceArt.decoding = "async";
  iceSurfaceArt.src = "./assets/ice-surface-reference-v4.png";
  const riderAtlas = new Image();
  riderAtlas.decoding = "async";
  riderAtlas.src = "./assets/riders-atlas-v2.png";
  const colors = ["#ff6c55", "#fa66c7", "#ffd54c", "#7f75ff", "#33d9ae"];
  const names = ["你", "AC", "MS", "FP", "KJ"];
  // Crop the existing reference artwork in the HUD, retaining the actual faces
  // and hairstyles instead of drawing generic CSS heads. Source: 2172 × 724.
  const portraits = [
    { crop: [142, 102, 198], label: "红衣丸子头女孩" },
    { crop: [552, 114, 180], label: "蓝白衣棕发男孩" },
    { crop: [958, 105, 194], label: "金发墨镜男孩" },
    { crop: [1414, 104, 216], label: "紫衣高马尾女孩" },
    { crop: [1845, 110, 184], label: "青衣棕发男孩" }
  ];
  const floats = ["watermelon", "unicorn", "duck", "donut", "candy"];
  const skins = ["#f4b88d", "#d7916f", "#f4c4a1", "#8b563e", "#e2a47e"];
  const hairs = ["#8d4b20", "#38241b", "#f4d34e", "#252525", "#bb6b2a"];

  let W = 390;
  let H = 844;
  let dpr = 1;
  let state = "intro";
  let resultReason = null;
  let last = performance.now();
  let elapsed = 0;
  let timeLeft = ROUND_TIME;
  let nextBreak = 2.1;
  let nextBump = 0;
  let tiles = [];
  let actors = [];
  let hazards = [];
  let particles = [];
  let ripples = [];
  let hits = 0;
  let validInteracted = false;
  let pointerId = null;
  let joyOrigin = { x: 0, y: 0 };
  let input = { x: 0, y: 0 };
  const keys = new Set();
  const events = [];
  const surfacePolygons = new WeakMap();

  function emit(name, detail = {}) {
    const payload = { event_id: `${Date.now()}-${events.length}`, event_time: new Date().toISOString(), name, build_id: BUILD_ID, ...detail };
    events.push(payload);
    window.dispatchEvent(new CustomEvent("ice-party-event", { detail: payload }));
  }

  function resize() {
    const rect = app.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width;
    H = rect.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function makeTiles() {
    tiles=[];
    for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
      tiles.push({index:r*COLS+c,c,r,active:true,flash:0,crack:0,phase:Math.random()*TAU});
    }
  }

  function spawnActors() {
    const spots = [
      [0, .58], [-.48, -.08], [.4, -.18], [-.2, -.48], [.4, .28]
    ];
    actors = names.map((name, i) => ({
      id: i,
      name,
      color: colors[i],
      float: floats[i],
      skin: skins[i],
      hair: hairs[i],
      x: spots[i][0], y: spots[i][1],
      vx: 0, vy: 0,
      dirX: 0, dirY: -1,
      facingYaw: 0, facingTarget: 0,
      alive: true,
      eliminationReason: null,
      scale: 1,
      sink: 0,
      dash: 0,
      stun: 0,
      wobble: Math.random() * TAU,
      targetX: 0, targetY: 0,
      targetTimer: 0
    }));
  }

  function resetGame() {
    releaseControls();
    makeTiles();
    spawnActors();
    hazards = [];
    particles = [];
    ripples = [];
    elapsed = 0;
    timeLeft = ROUND_TIME;
    nextBreak = 2.2;
    nextBump = 0;
    hits = 0;
    validInteracted = false;
    state = "playing";
    resultReason = null;
    intro.classList.remove("show");
    result.classList.remove("show");
    pausePanel.classList.remove("show");
    dashBtn.classList.remove("cooldown");
    hintEl.classList.remove("hide");
    renderPlayers();
    emit("play_start");
  }

  function renderPlayers() {
    playersEl.innerHTML = actors.map(a => {
      const { crop: [x, y, size], label } = portraits[a.id];
      return `<div class="player-dot ${a.id === 0 ? "me" : ""} ${a.alive ? "" : "eliminated"}" data-player-id="${a.id}" role="img" aria-label="${a.name} · ${label} · ${a.alive ? "存活" : "已淘汰"}" title="${a.name} · ${label}" style="--c:${a.color}">
        <svg class="player-portrait" viewBox="${x} ${y} ${size} ${size}" aria-hidden="true" focusable="false"><image href="./assets/riders-atlas-v2.png" width="2172" height="724" /></svg>
      </div>`;
    }).join("");
  }

  function arenaTop() { return H * .29; }
  function arenaBottom() { return H * .995; }
  function widthAt(v) { return W * (1.08 + v * .92); }

  function project(x, y) {
    const v = (y + 1) / 2;
    const depth = Math.pow(Math.max(0,Math.min(1,v)),1.45);
    return { x: W / 2 + x * widthAt(depth) / 2, y: arenaTop() + depth * (arenaBottom() - arenaTop()) };
  }

  function seamNoise(a,b,salt=0) {
    const value=Math.sin(a*127.1+b*311.7+salt*74.7)*43758.5453;
    return (value-Math.floor(value))*2-1;
  }

  function gridVertex(c,r) {
    const cellW=2/COLS,cellH=2/ROWS;
    let x=c*cellW-1,y=r*cellH-1;
    if(c>0&&c<COLS)x+=seamNoise(c,r,1)*cellW*.105;
    if(r>0&&r<ROWS)y+=seamNoise(c,r,2)*cellH*.105;
    return {x,y};
  }

  function horizontalSeamMid(c,r) {
    const a=gridVertex(c,r),b=gridVertex(c+1,r),cellW=2/COLS,cellH=2/ROWS;
    return {
      x:(a.x+b.x)/2+seamNoise(c,r,3)*cellW*.075,
      y:(a.y+b.y)/2+(r>0&&r<ROWS?seamNoise(c,r,4)*cellH*.12:0)
    };
  }

  function verticalSeamMid(c,r) {
    const a=gridVertex(c,r),b=gridVertex(c,r+1),cellW=2/COLS,cellH=2/ROWS;
    return {
      x:(a.x+b.x)/2+(c>0&&c<COLS?seamNoise(c,r,5)*cellW*.12:0),
      y:(a.y+b.y)/2+seamNoise(c,r,6)*cellH*.075
    };
  }

  function tilePoly(tile) {
    const c=tile.c,r=tile.r;
    const logical=[
      gridVertex(c,r),horizontalSeamMid(c,r),gridVertex(c+1,r),verticalSeamMid(c+1,r),
      gridVertex(c+1,r+1),horizontalSeamMid(c,r+1),gridVertex(c,r+1),verticalSeamMid(c,r)
    ];
    return logical.map(point=>project(point.x,point.y));
  }

  function polyCenter(poly) {
    return poly.reduce((sum,p)=>({x:sum.x+p.x/poly.length,y:sum.y+p.y/poly.length}),{x:0,y:0});
  }

  // Drawing, warning detection and falling all use this exact screen-space
  // outline. The reference image's decorative seams are not collision cells.
  function tileSurfacePoly(tile) {
    const cached = surfacePolygons.get(tile);
    if (cached && cached.width === W && cached.height === H) return cached.points;
    const points = iceSlabPoly(tilePoly(tile), tile);
    surfacePolygons.set(tile, { width: W, height: H, points });
    return points;
  }

  function pointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[j], b = polygon[i];
      const dx = b.x - a.x, dy = b.y - a.y;
      const lengthSquared = dx * dx + dy * dy;
      const t = lengthSquared ? Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared)) : 0;
      // The exact visible rim is safe; only the interior is a hole.
      if ((point.x - a.x - t * dx) ** 2 + (point.y - a.y - t * dy) ** 2 <= 1e-12) return false;
      if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
  }

  function actorTile(a) {
    const point = project(a.x, a.y);
    return tiles.find(tile => pointInPolygon(point, tileSurfacePoly(tile))) || null;
  }

  function actorHole(a) {
    const point = project(a.x, a.y);
    return tiles.find(tile => !tile.active && pointInPolygon(point, tileSurfacePoly(tile))) || null;
  }

  function chooseHazard() {
    const active = tiles.filter(t => {
      if(!t.active||hazards.some(h=>h.tile===t))return false;
      const center=polyCenter(tilePoly(t));
      return center.x>-W*.08&&center.x<W*1.08&&center.y>arenaTop()&&center.y<H*.96;
    });
    if (active.length < 8) return;
    const player = actors[0];
    let candidates = active.filter(t => {
      const center=polyCenter(tilePoly(t));
      const playerPoint=project(player.x,player.y);
      return Math.hypot(center.x-playerPoint.x,center.y-playerPoint.y)>W*.16||elapsed>18;
    });
    if (!candidates.length) candidates = active;
    const count = elapsed > 28 ? 2 : 1;
    for (let i = 0; i < count && candidates.length; i++) {
      const index = Math.floor(Math.random() * candidates.length);
      const tile = candidates.splice(index, 1)[0];
      tile.flash = 1;
      hazards.push({ tile, timer: elapsed > 30 ? .72 : 1.05 });
    }
  }

  function breakTile(tile) {
    tile.active = false;
    tile.flash = 0;
    tile.crack = 1;
    const center = polyCenter(tilePoly(tile));
    ripples.push({ x: center.x, y: center.y, life: 1 });
    for (let i = 0; i < 11; i++) {
      particles.push({ x: center.x, y: center.y, vx: (Math.random() - .5) * 130, vy: -20 - Math.random() * 90, life: .7 + Math.random() * .35, size: 3 + Math.random() * 8, ice: true });
    }
  }

  function eliminate(a, reason = "hole") {
    if (!a.alive) return;
    a.alive = false;
    a.eliminationReason = reason;
    a.sink = .01;
    ripples.push({ ...project(a.x, a.y), life: 1.2 });
    renderPlayers();
    if (a.id === 0) finish(false, reason);
  }

  function dash(a) {
    if (!a.alive || a.dash > 0 || state !== "playing") return;
    let dx = a.dirX;
    let dy = a.dirY;
    if (Math.hypot(dx, dy) < .1) { dx = 0; dy = -1; }
    a.vx += dx * 1.35;
    a.vy += dy * 1.35;
    a.dash = 1.6;
    if (a.id === 0) {
      dashBtn.classList.add("cooldown");
      if (navigator.vibrate) navigator.vibrate(22);
    }
    for (let i = 0; i < 8; i++) {
      const p = project(a.x, a.y);
      particles.push({ x: p.x, y: p.y, vx: -dx * (40 + Math.random() * 70) + (Math.random() - .5) * 40, vy: -dy * 35 + (Math.random() - .5) * 40, life: .38 + Math.random() * .3, size: 2 + Math.random() * 5 });
    }
  }

  function updatePlayer(dt) {
    const p = actors[0];
    if (!p.alive) return;
    let ix = input.x + (keys.has("ArrowRight") || keys.has("d") ? 1 : 0) - (keys.has("ArrowLeft") || keys.has("a") ? 1 : 0);
    let iy = input.y + (keys.has("ArrowDown") || keys.has("s") ? 1 : 0) - (keys.has("ArrowUp") || keys.has("w") ? 1 : 0);
    const len = Math.hypot(ix, iy);
    if (len > 1) { ix /= len; iy /= len; }
    if (len > .08) {
      p.dirX = ix; p.dirY = iy;
      p.vx += ix * 2.45 * dt;
      p.vy += iy * 2.45 * dt;
    }
  }

  function updateAI(a, dt) {
    if (!a.alive || a.stun > 0) return;
    a.targetTimer -= dt;
    const tile = actorTile(a);
    const danger = hazards.find(h => h.tile === tile);
    if (a.targetTimer <= 0 || danger) {
      const player = actors[0];
      if (danger) {
        const center=polyCenter(tilePoly(tile));
        const actorPoint=project(a.x,a.y);
        a.targetX = a.x + Math.sign(actorPoint.x-center.x || Math.random()-.5) * .45;
        a.targetY = a.y + Math.sign(actorPoint.y-center.y || Math.random()-.5) * .4;
      } else if (Math.random() < .45 && player.alive) {
        a.targetX = player.x + (Math.random() - .5) * .3;
        a.targetY = player.y + (Math.random() - .5) * .3;
      } else {
        a.targetX = (Math.random() - .5) * 1.3;
        a.targetY = (Math.random() - .5) * 1.35;
      }
      a.targetTimer = .55 + Math.random() * 1.3;
    }
    let dx = a.targetX - a.x;
    let dy = a.targetY - a.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    a.dirX = dx; a.dirY = dy;
    a.vx += dx * 1.65 * dt;
    a.vy += dy * 1.65 * dt;
    if (elapsed > 4 && a.dash <= 0 && Math.random() < dt * .18) dash(a);
  }

  function updateCollisions() {
    const live = actors.filter(a => a.alive);
    for (let i = 0; i < live.length; i++) {
      for (let j = i + 1; j < live.length; j++) {
        const a = live[i], b = live[j];
        let dx = b.x - a.x, dy = b.y - a.y;
        let dist = Math.hypot(dx, dy) || .001;
        const radius = .22;
        if (dist < radius) {
          dx /= dist; dy /= dist;
          const push = (radius - dist) * 4.2 + .05;
          const dashForce = (a.dash > 1.18 ? .45 : 0) + (b.dash > 1.18 ? .45 : 0);
          a.vx -= dx * (push + (b.dash > 1.18 ? .48 : 0));
          a.vy -= dy * (push + (b.dash > 1.18 ? .48 : 0));
          b.vx += dx * (push + (a.dash > 1.18 ? .48 : 0));
          b.vy += dy * (push + (a.dash > 1.18 ? .48 : 0));
          if (dashForce && performance.now() > nextBump) {
            nextBump = performance.now() + 150;
            if (a.id === 0 && a.dash > 1.18 || b.id === 0 && b.dash > 1.18) hits++;
            if (navigator.vibrate && (a.id === 0 || b.id === 0)) navigator.vibrate(28);
            const p = project((a.x + b.x) / 2, (a.y + b.y) / 2);
            for (let n = 0; n < 9; n++) particles.push({ x: p.x, y: p.y, vx: (Math.random() - .5) * 150, vy: (Math.random() - .5) * 120, life: .35, size: 3 + Math.random() * 4 });
          }
        }
      }
    }
  }

  function updateFacing(a, dt) {
    if (!a.alive || Math.hypot(a.vx, a.vy) < .04) return;
    const from = project(a.x, a.y);
    const to = project(a.x + a.vx * .01, a.y + a.vy * .01);
    // Account for perspective and the tilted model's ground plane, so its
    // projected front points along the actual on-screen displacement.
    a.facingTarget = Math.atan2(to.x - from.x, (to.y - from.y) / Math.sin(RIDER_TILT));
    const delta = Math.atan2(Math.sin(a.facingTarget - a.facingYaw), Math.cos(a.facingTarget - a.facingYaw));
    a.facingYaw += delta * (1 - Math.exp(-22 * dt));
    a.facingYaw = Math.atan2(Math.sin(a.facingYaw), Math.cos(a.facingYaw));
  }

  function update(dt) {
    if (state !== "playing") return;
    elapsed += dt;
    timeLeft = Math.max(0, ROUND_TIME - elapsed);
    timerEl.textContent = String(Math.ceil(timeLeft));
    timerEl.style.color = timeLeft < 10 ? "#e63d4c" : "#075daf";

    nextBreak -= dt;
    if (nextBreak <= 0) {
      chooseHazard();
      nextBreak = Math.max(.85, 2.35 - elapsed * .035);
    }
    hazards.forEach(h => { h.timer -= dt; h.tile.flash = Math.max(0, h.timer); });
    hazards.filter(h => h.timer <= 0).forEach(h => breakTile(h.tile));
    hazards = hazards.filter(h => h.timer > 0);

    updatePlayer(dt);
    actors.slice(1).forEach(a => updateAI(a, dt));

    actors.forEach(a => {
      if (!a.alive) { a.sink += dt; return; }
      a.dash = Math.max(0, a.dash - dt);
      a.stun = Math.max(0, a.stun - dt);
      const maxSpeed = a.dash > 1.15 ? 1.7 : .76;
      const speed = Math.hypot(a.vx, a.vy);
      if (speed > maxSpeed) { a.vx *= maxSpeed / speed; a.vy *= maxSpeed / speed; }
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.vx *= Math.pow(.055, dt);
      a.vy *= Math.pow(.055, dt);
      a.wobble += dt * (3 + speed * 2);
      if (a.x < -1.02 || a.x > 1.02 || a.y < -1.03 || a.y > 1.04) eliminate(a, "boundary");
      else if (actorHole(a)) eliminate(a, "hole");
    });
    updateCollisions();
    actors.forEach(a => updateFacing(a, dt));

    particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.ice ? 180 : 55) * dt; p.life -= dt; });
    particles = particles.filter(p => p.life > 0);
    ripples.forEach(r => r.life -= dt);
    ripples = ripples.filter(r => r.life > 0);

    if (actors[0].dash <= 0) dashBtn.classList.remove("cooldown");
    const alive = actors.filter(a => a.alive).length;
    aliveEl.textContent = `存活 ${alive}`;
    if (actors[0].alive && alive === 1) finish(true);
    if (timeLeft <= 0 && state === "playing") finish(false, "timeout");
  }

  function finish(win, reason = win ? "last_survivor" : "hole") {
    if (state !== "playing") return;
    const timedOut = !win && reason === "timeout";
    state = win ? "success" : timedOut ? "timeout" : "failure";
    resultReason = reason;
    const remaining = actors.filter(a => a.alive).length;
    const rank = win ? 1 : timedOut ? null : Math.max(2, remaining + 1);
    document.querySelector("#resultBadge").textContent = win ? "🏆" : timedOut ? "⏱️" : "🌊";
    document.querySelector("#resultTitle").textContent = win ? "你赢了！" : timedOut ? "时间到" : "掉进冰海了";
    document.querySelector("#resultText").textContent = win ? "最后存活，冰面之王！" : timedOut ? "你还留在冰面上，本局未分出胜负。" : reason === "boundary" ? "滑出了冰面边界，注意减速和躲避冲撞。" : "落入了坍塌冰洞，注意避开闪烁预警。";
    document.querySelector("#rankValue").textContent = rank ?? "—";
    document.querySelector("#hitValue").textContent = hits;
    result.classList.add("show");
    emit(win ? "play_complete" : "play_fail", { rank, hits, duration_seconds: Math.round(elapsed), reason, outcome: state });
  }

  function drawBackground() {
    if (arenaArt.complete && arenaArt.naturalWidth) {
      const sourceRatio = arenaArt.naturalWidth / arenaArt.naturalHeight;
      const targetRatio = W / H;
      let sx = 0, sy = 0, sw = arenaArt.naturalWidth, sh = arenaArt.naturalHeight;
      if (sourceRatio > targetRatio) {
        sw = arenaArt.naturalHeight * targetRatio;
        sx = (arenaArt.naturalWidth - sw) / 2;
      } else {
        sh = arenaArt.naturalWidth / targetRatio;
        sy = (arenaArt.naturalHeight - sh) / 2;
      }
      ctx.drawImage(arenaArt, sx, sy, sw, sh, 0, 0, W, H);
      const depthShade = ctx.createLinearGradient(0, 0, 0, H);
      depthShade.addColorStop(0, "rgba(0,36,105,.05)");
      depthShade.addColorStop(.5, "rgba(0,54,130,0)");
      depthShade.addColorStop(1, "rgba(0,52,128,.14)");
      ctx.fillStyle = depthShade;
      ctx.fillRect(0, 0, W, H);
      return;
    }
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, "#38c9ff");
    sky.addColorStop(.3, "#0f83df");
    sky.addColorStop(.56, "#073a8b");
    sky.addColorStop(1, "#011d57");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.globalAlpha = .95;
    const peaks = [
      [-.15,.28,.11], [.04,.24,.16], [.22,.3,.12], [.38,.18,.18], [.56,.27,.13], [.73,.2,.18], [.92,.29,.14],
      [-.03,.34,.23], [.16,.39,.18], [.35,.35,.22], [.58,.4,.2], [.82,.34,.24], [1.02,.4,.18]
    ];
    peaks.forEach(([x,y,s], i) => {
      ctx.beginPath();
      ctx.moveTo((x-s)*W, y*H);
      ctx.lineTo(x*W, (y-s*.9)*H);
      ctx.lineTo((x+s)*W, y*H);
      ctx.lineTo((x+s*.5)*W, (y+.13)*H);
      ctx.lineTo((x-s*.7)*W, (y+.13)*H);
      ctx.closePath();
      const g = ctx.createLinearGradient((x-s)*W,0,(x+s)*W,0);
      g.addColorStop(0, i%2 ? "#168fdf" : "#257ee2");
      g.addColorStop(.55, "#45ccff");
      g.addColorStop(1, "#0871ce");
      ctx.fillStyle = g; ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x*W,(y-s*.9)*H); ctx.lineTo((x+s)*W,y*H); ctx.lineTo((x+s*.5)*W,(y+.13)*H); ctx.closePath();
      ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.fill();
    });
    ctx.restore();

    const waterY = arenaTop() - 12;
    const water = ctx.createLinearGradient(0, waterY, 0, H);
    water.addColorStop(0, "#0753ae"); water.addColorStop(1, "#012b75");
    ctx.fillStyle = water; ctx.fillRect(0, waterY, W, H-waterY);
    ctx.globalAlpha = .16;
    for (let i=0;i<11;i++) {
      ctx.beginPath();
      ctx.ellipse((i*79+elapsed*10)% (W+100)-50, waterY+30+(i%4)*19, 48, 5, 0, 0, TAU);
      ctx.strokeStyle = "#73e6ff"; ctx.lineWidth = 2; ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function pathPoly(points) {
    ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
    for (let i=1;i<points.length;i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
  }

  function iceSlabPoly(points,tile) {
    const center=polyCenter(points);
    const inset=.055-(tile.r/ROWS)*.014;
    return points.map(point=>({
      x:point.x+(center.x-point.x)*inset,
      y:point.y+(center.y-point.y)*inset
    }));
  }

  function drawTiles() {
    const useReferenceSurface=iceSurfaceArt.complete&&iceSurfaceArt.naturalWidth;
    if(useReferenceSurface){
      ctx.drawImage(iceSurfaceArt,0,0,iceSurfaceArt.naturalWidth,iceSurfaceArt.naturalHeight,0,arenaTop(),W,arenaBottom()-arenaTop());
    }
    for (const t of tiles) {
        const p = tilePoly(t);
        const slab=tileSurfacePoly(t);
        const slabMinY=Math.min(...slab.map(point=>point.y));
        const slabMaxY=Math.max(...slab.map(point=>point.y));
        if(!useReferenceSurface){
          pathPoly(p);
          const gap=ctx.createLinearGradient(0,slabMinY,0,slabMaxY);
          gap.addColorStop(0,"rgba(8,104,197,.82)");
          gap.addColorStop(1,"rgba(0,54,143,.94)");
          ctx.fillStyle=gap;ctx.fill();
        }
        if (!t.active) {
          const minX=Math.min(...slab.map(point=>point.x)),maxX=Math.max(...slab.map(point=>point.x));
          const minY=Math.min(...slab.map(point=>point.y)),maxY=Math.max(...slab.map(point=>point.y));
          ctx.save();
          pathPoly(slab);
          ctx.clip();
          if(arenaArt.complete&&arenaArt.naturalWidth){
            ctx.drawImage(arenaArt,0,365,arenaArt.naturalWidth,175,minX,minY,maxX-minX,maxY-minY);
          }
          const hole = ctx.createLinearGradient(0,slabMinY,0,slabMaxY);
          hole.addColorStop(0,"rgba(0,29,91,.34)");
          hole.addColorStop(1,"rgba(0,12,58,.62)");
          ctx.fillStyle=hole;ctx.fillRect(minX,minY,maxX-minX,maxY-minY);
          ctx.restore();
          pathPoly(slab);
          ctx.lineWidth=Math.max(1.5,W/230);
          ctx.strokeStyle="rgba(112,222,255,.52)";ctx.stroke();
          ctx.save();ctx.globalAlpha=.32;ctx.strokeStyle="#79efff";ctx.lineWidth=1.4;
          for(let n=0;n<3;n++){
            const yy=(slab[0].y+slab[6].y)/2+n*4;
            ctx.beginPath();ctx.ellipse(polyCenter(slab).x,yy,Math.max(8,(p[1].x-p[0].x)*(.2+n*.06)),2+n*.5,0,0,TAU);ctx.stroke();
          }
          ctx.restore();
          continue;
        }
        if(useReferenceSurface&&t.flash<=0)continue;
        pathPoly(slab);
        const flash = t.flash > 0 && Math.sin(performance.now()/80) > -.1;
        const g = ctx.createLinearGradient(0,slabMinY,0,slabMaxY);
        g.addColorStop(0, flash ? "rgba(255,244,101,.94)" : t.index%2 ? "rgba(151,237,255,.72)" : "rgba(188,248,255,.68)");
        g.addColorStop(.62,flash ? "rgba(255,185,77,.91)" : t.index%2 ? "rgba(75,191,239,.62)" : "rgba(98,211,246,.58)");
        g.addColorStop(1, flash ? "rgba(255,112,68,.92)" : "rgba(28,139,216,.72)");
        ctx.fillStyle = g; ctx.fill();
        ctx.lineWidth=Math.max(1.3,W/270);
        ctx.strokeStyle="rgba(221,253,255,.72)";ctx.stroke();
        ctx.lineWidth=Math.max(2.4,W/135);
        ctx.beginPath();ctx.moveTo(slab[2].x,slab[2].y);ctx.lineTo(slab[3].x,slab[3].y);ctx.lineTo(slab[4].x,slab[4].y);ctx.lineTo(slab[5].x,slab[5].y);ctx.lineTo(slab[6].x,slab[6].y);
        ctx.strokeStyle="rgba(5,75,177,.72)";ctx.stroke();
        ctx.lineWidth=Math.max(1,W/360);
        ctx.beginPath();ctx.moveTo(slab[6].x,slab[6].y);ctx.lineTo(slab[7].x,slab[7].y);ctx.lineTo(slab[0].x,slab[0].y);ctx.lineTo(slab[1].x,slab[1].y);ctx.lineTo(slab[2].x,slab[2].y);
        ctx.strokeStyle="rgba(238,255,255,.78)";ctx.stroke();
        if(t.index%3===0&&!flash){
          const center=polyCenter(slab);ctx.save();ctx.globalAlpha=.14;ctx.strokeStyle="#fff";ctx.lineWidth=1;
          ctx.beginPath();ctx.moveTo(slab[7].x,slab[7].y);ctx.lineTo(center.x,center.y);ctx.lineTo(slab[2].x,slab[2].y);ctx.stroke();ctx.restore();
        }
        if (t.flash > 0) {
          ctx.save(); ctx.globalAlpha = .55;
          const center=polyCenter(slab),midX=center.x,midY=center.y;
          ctx.strokeStyle="#fff"; ctx.lineWidth=2;
          ctx.beginPath(); ctx.moveTo(midX-10,midY-3); ctx.lineTo(midX-2,midY+3); ctx.lineTo(midX+3,midY-7); ctx.lineTo(midX+12,midY+5); ctx.stroke(); ctx.restore();
        }
    }
  }

  function drawRipple(r) {
    const progress = 1.2-r.life;
    ctx.save(); ctx.globalAlpha = Math.max(0,r.life/1.2)*.7;
    ctx.strokeStyle="#8df3ff"; ctx.lineWidth=2;
    ctx.beginPath(); ctx.ellipse(r.x,r.y,12+progress*42,4+progress*11,0,0,TAU); ctx.stroke();
    ctx.restore();
  }

  function drawFloat(a, p, scale) {
    ctx.save(); ctx.translate(p.x,p.y); ctx.scale(scale,scale);
    ctx.rotate(Math.sin(a.wobble)*.035);
    ctx.fillStyle="rgba(0,30,90,.22)"; ctx.beginPath(); ctx.ellipse(0,18,35,13,0,0,TAU); ctx.fill();
    if (a.float === "watermelon") {
      ctx.fillStyle="#167b48"; ctx.beginPath(); ctx.ellipse(0,5,34,23,0,0,TAU); ctx.fill();
      ctx.fillStyle="#f04f61"; ctx.beginPath(); ctx.ellipse(0,2,29,18,0,0,TAU); ctx.fill();
      ctx.fillStyle="#ffc864"; ctx.beginPath(); ctx.ellipse(0,3,14,9,0,0,TAU); ctx.fill();
      ctx.fillStyle="#482b2b"; for(let i=0;i<8;i++){const ang=i/8*TAU;ctx.beginPath();ctx.ellipse(Math.cos(ang)*21,2+Math.sin(ang)*11,1.2,2,ang,0,TAU);ctx.fill();}
    } else if (a.float === "unicorn") {
      ctx.fillStyle="#ff75c5"; ctx.beginPath(); ctx.ellipse(0,5,34,22,0,0,TAU); ctx.fill();
      ctx.fillStyle="#fff"; ctx.beginPath(); ctx.ellipse(0,3,25,15,0,0,TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(21,-12,11,18,-.25,0,TAU); ctx.fill();
      ctx.fillStyle="#ffc84d"; ctx.beginPath(); ctx.moveTo(18,-29);ctx.lineTo(22,-42);ctx.lineTo(26,-27);ctx.fill();
      ctx.strokeStyle="#6ce0ff";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(15,-26);ctx.quadraticCurveTo(28,-23,26,-7);ctx.stroke();
      ctx.fillStyle="#4c367c";ctx.beginPath();ctx.arc(25,-16,1.8,0,TAU);ctx.fill();
    } else if (a.float === "duck") {
      ctx.fillStyle="#ffd83e";ctx.beginPath();ctx.ellipse(0,5,34,22,0,0,TAU);ctx.fill();
      ctx.beginPath();ctx.arc(22,-8,14,0,TAU);ctx.fill();
      ctx.fillStyle="#ff8a28";ctx.beginPath();ctx.ellipse(34,-5,9,4,0,0,TAU);ctx.fill();
      ctx.fillStyle="#27394e";ctx.beginPath();ctx.arc(26,-12,2,0,TAU);ctx.fill();
    } else if (a.float === "donut") {
      ctx.fillStyle="#ff75b5";ctx.beginPath();ctx.ellipse(0,5,34,22,0,0,TAU);ctx.fill();
      ctx.fillStyle="#ffd49b";ctx.beginPath();ctx.ellipse(0,4,14,9,0,0,TAU);ctx.fill();
      const spr=[[-20,-2,"#fff"],[-9,13,"#5df"],[12,-7,"#ffeb52"],[23,7,"#fff"],[4,14,"#7f6"]];
      spr.forEach(([x,y,c])=>{ctx.strokeStyle=c;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-2,y-1);ctx.lineTo(x+2,y+1);ctx.stroke();});
    } else {
      ctx.fillStyle="#8e78ff";ctx.beginPath();ctx.ellipse(0,5,34,22,0,0,TAU);ctx.fill();
      ctx.strokeStyle="#ffdd55";ctx.lineWidth=5;ctx.beginPath();ctx.ellipse(0,5,24,13,0,0,TAU);ctx.stroke();
      ctx.strokeStyle="#53e5d1";ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,5,30,18,0,0,TAU);ctx.stroke();
    }
    ctx.restore();
  }

  function drawActor(a) {
    if (!a.alive && a.sink > .75) return;
    const p = project(a.x,a.y);
    const depth = (a.y+1)/2;
    const scale = (.68+depth*.46) * (a.alive ? 1 : Math.max(.15,1-a.sink));
    ctx.save();
    if (!a.alive) ctx.globalAlpha=Math.max(0,1-a.sink);
    if (riderAtlas.complete && riderAtlas.naturalWidth) {
      const sw=riderAtlas.naturalWidth/5, sh=riderAtlas.naturalHeight;
      const dw=112*scale, dh=dw*(sh/sw);
      ctx.save();
      ctx.translate(p.x,p.y);
      ctx.rotate(Math.sin(a.wobble)*.025+Math.max(-.12,Math.min(.12,a.vx*.08)));
      if (!a.alive) ctx.globalAlpha=Math.max(0,1-a.sink);
      ctx.shadowColor="rgba(0,34,91,.28)";ctx.shadowBlur=7*scale;ctx.shadowOffsetY=5*scale;
      ctx.drawImage(riderAtlas,a.id*sw,0,sw,sh,-dw/2,-dh*.69,dw,dh);
      ctx.restore();
      ctx.save();
      ctx.translate(p.x,p.y);
      ctx.fillStyle="#fff";ctx.strokeStyle="rgba(0,64,130,.72)";ctx.lineWidth=3;
      ctx.font=`900 ${Math.max(10,11*scale)}px system-ui`;ctx.textAlign="center";
      ctx.strokeText(a.name,0,-dh*.55);ctx.fillText(a.name,0,-dh*.55);
      if(a.id===0){ctx.fillStyle="#ffe65a";ctx.beginPath();ctx.moveTo(-5,-dh*.61);ctx.lineTo(0,-dh*.66);ctx.lineTo(5,-dh*.61);ctx.closePath();ctx.fill();}
      ctx.restore();
      ctx.restore();
      return;
    }
    drawFloat(a,p,scale);
    ctx.translate(p.x,p.y); ctx.scale(scale,scale);
    const lean = Math.max(-.18,Math.min(.18,a.vx*.12));
    ctx.rotate(lean);
    ctx.fillStyle=a.color;ctx.beginPath();ctx.roundRect(-11,-25,22,28,8);ctx.fill();
    ctx.fillStyle=a.skin;ctx.beginPath();ctx.arc(0,-35,10,0,TAU);ctx.fill();
    ctx.fillStyle=a.hair;ctx.beginPath();ctx.arc(-1,-39,10,Math.PI,TAU);ctx.lineTo(9,-34);ctx.quadraticCurveTo(2,-45,-8,-37);ctx.fill();
    ctx.fillStyle="#fff";ctx.font="800 10px system-ui";ctx.textAlign="center";ctx.fillText(a.name,0,-53);
    if (a.id===0) {ctx.fillStyle="#ffe65a";ctx.beginPath();ctx.moveTo(-5,-62);ctx.lineTo(0,-70);ctx.lineTo(5,-62);ctx.closePath();ctx.fill();}
    ctx.restore();
  }

  function drawParticles() {
    particles.forEach(p=>{
      ctx.save();ctx.globalAlpha=Math.max(0,p.life*1.8);ctx.fillStyle=p.ice?"#b8f5ff":"#fff";
      ctx.translate(p.x,p.y);ctx.rotate(p.x*.02);ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size*.65);ctx.restore();
    });
  }

  function draw() {
    drawBackground();
    drawTiles();
    ripples.forEach(drawRipple);
    if (riderRenderer.available) {
      actors.forEach(a => {
        if (!a.alive && a.sink > .75) return;
        const p = project(a.x, a.y), scale = .68 + (a.y + 1) / 2 * .46;
        ctx.save();
        ctx.globalAlpha = a.alive ? 1 : Math.max(0, 1 - a.sink / .75);
        const shadow = ctx.createRadialGradient(p.x,p.y+4,2,p.x,p.y+4,48*scale);
        shadow.addColorStop(0,'rgba(0,39,92,.30)');
        shadow.addColorStop(1,'rgba(0,39,92,0)');
        ctx.translate(p.x,p.y+4);ctx.scale(1,.46);ctx.translate(-p.x,-p.y-4);
        ctx.fillStyle=shadow;ctx.beginPath();ctx.arc(p.x,p.y+4,48*scale,0,TAU);ctx.fill();
        ctx.restore();
      });
      riderRenderer.draw(ctx, actors, project, W, H, dpr);
      actors.forEach(a => {
        if (!a.alive) return;
        const p=project(a.x,a.y),scale=.68+(a.y+1)/2*.46;
        const y=p.y-107*scale;
        ctx.save();ctx.textAlign='center';ctx.font=`900 ${Math.max(10,11*scale)}px system-ui`;
        ctx.fillStyle='#fff';ctx.strokeStyle='rgba(0,64,130,.8)';ctx.lineWidth=3;
        ctx.strokeText(a.name,p.x,y);ctx.fillText(a.name,p.x,y);
        if(a.id===0){ctx.fillStyle='#ffe65a';ctx.beginPath();ctx.moveTo(p.x-4,y-16);ctx.lineTo(p.x,y-10);ctx.lineTo(p.x+4,y-16);ctx.fill();}
        ctx.restore();
      });
    } else {
      actors.slice().sort((a,b)=>a.y-b.y).forEach(drawActor);
    }
    drawParticles();
    if (state === "intro") {
      ctx.save();ctx.globalAlpha=.16;ctx.fillStyle="#fff";ctx.beginPath();ctx.ellipse(W*.5,H*.68,W*.32,24,0,0,TAU);ctx.fill();ctx.restore();
    }
  }

  function frame(now) {
    const dt = Math.max(0, Math.min(.033,(now-last)/1000 || 0)); last=now;
    update(dt); draw(); requestAnimationFrame(frame);
  }

  function pointerDown(e) {
    if (state !== "playing" || pointerId !== null || e.target.closest?.("button")) return;
    pointerId=e.pointerId;joyOrigin={x:e.clientX,y:e.clientY};
    joystick.style.left=`${e.clientX-app.getBoundingClientRect().left}px`;
    joystick.style.top=`${e.clientY-app.getBoundingClientRect().top}px`;
    joystick.classList.add("active");
    app.setPointerCapture?.(e.pointerId);
    pointerMove(e);
  }
  function pointerMove(e) {
    if(e.pointerId!==pointerId)return;
    let dx=e.clientX-joyOrigin.x,dy=e.clientY-joyOrigin.y;
    const len=Math.hypot(dx,dy),max=42;
    if(len>max){dx=dx/len*max;dy=dy/len*max;}
    input.x=dx/max;input.y=dy/max;
    stick.style.transform=`translate(${dx}px,${dy}px)`;
    if(!validInteracted&&len>7){validInteracted=true;hintEl.classList.add("hide");emit("valid_interaction",{type:"drag"});}
  }
  function pointerUp(e) {
    if(e.pointerId!==pointerId)return;
    pointerId=null;input.x=0;input.y=0;joystick.classList.remove("active");stick.style.transform="";
  }

  function releaseControls() {
    if (pointerId !== null && app.hasPointerCapture?.(pointerId)) app.releasePointerCapture(pointerId);
    pointerId=null;input.x=0;input.y=0;keys.clear();
    joystick.classList.remove('active');stick.style.transform='';
  }

  document.querySelector("#startBtn").addEventListener("click",resetGame);
  document.querySelector("#replayBtn").addEventListener("click",()=>{emit("replay");resetGame();});
  document.querySelector("#exitBtn").addEventListener("click",()=>{
    emit("exit"); state="intro"; resultReason=null; result.classList.remove("show"); intro.classList.add("show");
    makeTiles(); spawnActors(); renderPlayers(); timeLeft=ROUND_TIME; timerEl.textContent=String(ROUND_TIME); aliveEl.textContent="存活 5";
  });
  document.querySelector("#pauseBtn").addEventListener("click",()=>{if(state==="playing"){releaseControls();state="paused";pausePanel.classList.add("show");}});
  document.querySelector("#resumeBtn").addEventListener("click",()=>{state="playing";pausePanel.classList.remove("show");last=performance.now();});
  document.querySelector("#restartBtn").addEventListener("click",resetGame);
  dashBtn.addEventListener("pointerdown",e=>{e.stopPropagation();dash(actors[0]);if(!validInteracted){validInteracted=true;emit("valid_interaction",{type:"dash"});}});
  app.addEventListener("pointerdown",pointerDown);
  app.addEventListener("pointermove",pointerMove);
  app.addEventListener("pointerup",pointerUp);
  app.addEventListener("pointercancel",pointerUp);
  window.addEventListener("keydown",e=>{
    if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"," "].includes(e.key)) e.preventDefault();
    if (new URLSearchParams(location.search).has("qa") && e.key === "F8" && state === "playing") {
      actors.slice(1).forEach(a => eliminate(a));
      return;
    }
    keys.add(e.key);if(e.code==="Space"){e.preventDefault();dash(actors[0]);}
  });
  window.addEventListener("keyup",e=>keys.delete(e.key));
  document.addEventListener("visibilitychange",()=>{if(document.hidden&&state==="playing"){releaseControls();state="paused";pausePanel.classList.add("show");}});
  window.addEventListener('blur',releaseControls);
  window.addEventListener("resize",resize);
  new ResizeObserver(resize).observe(app);

  window.__iceParty = {
    getState:()=>({build:BUILD_ID,state,resultReason,timeLeft,alive:actors.filter(a=>a.alive).length,hits,renderer:riderRenderer.info(),actors:actors.map(a=>({id:a.id,x:a.x,y:a.y,vx:a.vx,vy:a.vy,alive:a.alive,eliminationReason:a.eliminationReason,facingYaw:a.facingYaw,facingTarget:a.facingTarget})),grid:{cols:COLS,rows:ROWS,tiles:tiles.length},events:[...events]}),
    start:resetGame,
    forceWin:()=>{actors.slice(1).forEach(a => eliminate(a));},
    forceLose:()=>eliminate(actors[0])
  };

  resize();makeTiles();spawnActors();renderPlayers();emit("impression");requestAnimationFrame(frame);
})();
