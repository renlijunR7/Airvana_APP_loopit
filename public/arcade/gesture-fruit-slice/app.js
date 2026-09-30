const $ = (selector, root = document) => root.querySelector(selector);

const asset = name => {
  const image = new Image();
  image.src = `./assets/fruit-slicer/${name}`;
  return image;
};

const ART = {
  background: asset('../background-wood.png'),
  atlas: asset('../fruit-atlas.png'),
  sword: asset('../sword.png'),
};

const FRUITS = [
  { id: 'peach', cell: 0, juice: '#ff826e', scale: 1 },
  { id: 'apple', cell: 1, juice: '#a9e85f', scale: 1 },
  { id: 'orange', cell: 2, juice: '#ffad21', scale: 1 },
  { id: 'pineapple', cell: 3, juice: '#ffd947', scale: 1 },
  { id: 'banana', cell: 4, juice: '#ffe76a', scale: 1.08 },
  { id: 'kiwi', cell: 5, juice: '#8fd33f', scale: 1 },
  { id: 'watermelon', cell: 6, juice: '#ff4964', scale: 1.04 },
];

const BOMB = { cell: 7, scale: 1.04 };

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const rand = (min, max) => min + Math.random() * (max - min);

function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 1800);
}

class SoundFX {
  constructor() { this.ctx = null; }
  resume() {
    try {
      this.ctx ||= new (window.AudioContext || window.webkitAudioContext)();
      this.ctx.resume();
    } catch (_) {}
  }
  tone(freq, duration, type = 'sine', gain = .04) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const vol = this.ctx.createGain();
    osc.type = type; osc.frequency.value = freq;
    vol.gain.setValueAtTime(gain, this.ctx.currentTime);
    vol.gain.exponentialRampToValueAtTime(.001, this.ctx.currentTime + duration);
    osc.connect(vol).connect(this.ctx.destination); osc.start(); osc.stop(this.ctx.currentTime + duration);
  }
  slice() { this.tone(rand(440, 620), .08, 'triangle', .035); }
  bomb() { this.tone(82, .35, 'sawtooth', .08); }
  miss() { this.tone(150, .14, 'square', .025); }
}

class FruitGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.dpr = Math.min(devicePixelRatio || 1, 2);
    this.sound = new SoundFX();
    this.mode = 'menu';
    this.fruits = []; this.halves = []; this.juice = [];
    this.trail = []; this.blade = null; this.lastBlade = null;
    this.bladeAngle = -Math.PI / 4; this.bladeVisible = false;
    this.score = 0; this.lives = 3; this.combo = 0; this.maxCombo = 0;
    this.lastSliceAt = 0; this.spawnClock = 0; this.lastFrame = performance.now();
    this.stars = Array.from({ length: 48 }, () => ({ x: Math.random(), y: Math.random(), r: rand(.4, 1.6), a: rand(.08, .36) }));
    this.bind(); this.resize();
    this.loop = this.loop.bind(this); requestAnimationFrame(this.loop);
  }

  bind() {
    addEventListener('resize', () => this.resize());
    this.canvas.addEventListener('pointerdown', e => {
      if (this.mode !== 'playing') return;
      this.pointerActive = true; this.canvas.setPointerCapture(e.pointerId);
      this.setBlade(e.clientX, e.clientY, 'touch', performance.now());
    });
    this.canvas.addEventListener('pointermove', e => {
      if (!this.pointerActive || this.mode !== 'playing') return;
      this.setBlade(e.clientX, e.clientY, 'touch', performance.now());
    });
    const release = () => { this.pointerActive = false; this.lastBlade = null; this.bladeVisibleUntil = performance.now() + 900; };
    this.canvas.addEventListener('pointerup', release);
    this.canvas.addEventListener('pointercancel', release);
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.w = rect.width; this.h = rect.height;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  start() {
    this.sound.resume(); this.mode = 'playing';
    this.fruits.length = 0; this.halves.length = 0; this.juice.length = 0; this.trail.length = 0;
    this.blade = null; this.lastBlade = null; this.bladeVisible = false;
    this.score = 0; this.lives = 3; this.combo = 0; this.maxCombo = 0; this.lastSliceAt = 0;
    const now = performance.now();
    this.readyAt = now + 3000; this.startedAt = this.readyAt; this.endsAt = this.startedAt + 45000; this.spawnClock = 650;
    this.missProtectionUntil = this.startedAt + 15000;
    this.countdownValue = 0;
    this.updateHUD();
  }

  end() {
    if (this.mode !== 'playing') return;
    this.mode = 'over';
    const best = Math.max(Number(localStorage.getItem('fruitSlashBest') || 0), this.score);
    localStorage.setItem('fruitSlashBest', best);
    $('#finalScore').textContent = this.score;
    $('#bestScore').textContent = best;
    $('#bestCombo').textContent = this.maxCombo;
    $('#hud').hidden = true;
    $('#gameOver').hidden = false;
  }

  updateHUD() {
    $('#score').textContent = this.score;
    $('#lives').innerHTML = [0, 1, 2].map(i => `<span class="${i < this.lives ? '' : 'lost'}">●</span>`).join(' ');
    $('#lives').setAttribute('aria-label', `${this.lives} 条生命`);
  }

  setBlade(clientX, clientY, source, now) {
    const rect = this.canvas.getBoundingClientRect();
    const point = {
      x: (clientX - rect.left) * (this.w / rect.width),
      y: (clientY - rect.top) * (this.h / rect.height),
      t: now,
      source,
    };
    if (this.blade) {
      const dt = Math.max(1, now - this.blade.t);
      const dx = point.x - this.blade.x, dy = point.y - this.blade.y;
      point.speed = Math.hypot(dx, dy) / dt;
      if (Math.hypot(dx, dy) > 2) this.bladeAngle = Math.atan2(dy, dx);
      this.lastBlade = this.blade;
    }
    this.blade = point;
    this.bladeVisible = true;
    this.trail.push(point);
    if (this.trail.length > 13) this.trail.shift();
  }

  clearHand() {
    if (!this.pointerActive && this.blade?.source === 'hand') { this.blade = null; this.lastBlade = null; this.bladeVisible = false; }
  }

  spawnWave(elapsed) {
    const progress = clamp(elapsed / 45000, 0, 1);
    const count = elapsed > 12000 && Math.random() < .18 + progress * .22 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const bomb = elapsed > 7000 && Math.random() < .1 + progress * .05;
      const r = rand(Math.max(25, this.w * .063), Math.max(34, this.w * .086));
      this.fruits.push({
        bomb, type: FRUITS[Math.floor(Math.random() * FRUITS.length)],
        x: rand(r, this.w - r), y: this.h + r + rand(0, 36), r,
        vx: rand(-this.w * .16, this.w * .16), vy: -rand(this.h * (1.03 + progress * .08), this.h * (1.22 + progress * .12)),
        rot: rand(0, Math.PI * 2), vr: rand(-2.5, 2.5), face: Math.floor(Math.random() * 3), sliced: false, wasVisible: false,
      });
    }
    this.spawnClock = elapsed < 8000 ? rand(1050, 1350) : rand(680 - progress * 150, 1020 - progress * 220);
  }

  sliceFruit(fruit, blade) {
    fruit.sliced = true;
    const now = performance.now();
    this.combo = now - this.lastSliceAt < 720 ? this.combo + 1 : 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo); this.lastSliceAt = now;
    const bonus = 10 + Math.max(0, this.combo - 1) * 5;
    this.score += bonus; this.sound.slice(); this.updateHUD();
    if (this.combo >= 2) this.showCombo(`${this.combo}× COMBO  +${bonus}`);
    const angle = Math.atan2(blade.y - this.lastBlade.y, blade.x - this.lastBlade.x);
    for (const side of [-1, 1]) {
      this.halves.push({ ...fruit, side, life: 1500, vx: fruit.vx + Math.cos(angle + Math.PI / 2) * side * 120, vy: fruit.vy * .35 - 70, vr: side * rand(3, 5) });
    }
    for (let i = 0; i < 20; i++) {
      this.juice.push({ x: fruit.x, y: fruit.y, vx: Math.cos(angle) * rand(70, 220) + rand(-130, 130), vy: Math.sin(angle) * rand(70, 220) + rand(-150, 70), r: rand(2, 6), life: rand(420, 820), color: fruit.type.juice });
    }
  }

  hitBomb(fruit) {
    fruit.sliced = true; this.sound.bomb(); this.combo = 0; this.lives--;
    this.shake = 18; this.updateHUD(); this.showCombo('💥 炸弹！');
    for (let i = 0; i < 46; i++) this.juice.push({ x: fruit.x, y: fruit.y, vx: rand(-300, 300), vy: rand(-300, 200), r: rand(2, 8), life: rand(500, 1000), color: Math.random() < .5 ? '#ff9b22' : '#696969' });
    if (this.lives <= 0) setTimeout(() => this.end(), 350);
  }

  showCombo(text) {
    const el = $('#combo'); el.textContent = text; el.classList.remove('show');
    requestAnimationFrame(() => el.classList.add('show'));
    clearTimeout(this.comboTimer); this.comboTimer = setTimeout(() => el.classList.remove('show'), 700);
  }

  missFruit() {
    if (performance.now() < this.missProtectionUntil) {
      this.showCombo('继续挥动食指');
      return;
    }
    this.combo = 0; this.lives--; this.sound.miss(); this.updateHUD();
    if (this.lives <= 0) this.end();
  }

  update(dt, now) {
    if (this.mode !== 'playing') return;
    if (!this.pointerActive && this.blade?.source === 'touch' && now > (this.bladeVisibleUntil || 0)) {
      this.blade = null; this.bladeVisible = false;
    }
    if (now < this.readyAt) {
      const count = Math.ceil((this.readyAt - now) / 1000);
      $('#time').textContent = 45;
      if (count !== this.countdownValue) {
        this.countdownValue = count;
        const el = $('#combo'); el.textContent = count; el.classList.add('show');
      }
      return;
    } else if (this.countdownValue) {
      this.countdownValue = 0; $('#combo').textContent = 'SLASH!';
      setTimeout(() => $('#combo').classList.remove('show'), 500);
    }
    const remaining = Math.max(0, Math.ceil((this.endsAt - now) / 1000));
    $('#time').textContent = remaining;
    if (now >= this.endsAt) { this.end(); return; }
    this.spawnClock -= dt * 1000;
    if (this.spawnClock <= 0) this.spawnWave(now - this.startedAt);
    const gravity = this.h * 1.36;
    for (const f of this.fruits) {
      f.vy += gravity * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.vr * dt;
      if (f.y < this.h - f.r) f.wasVisible = true;
      if (!f.sliced && this.blade && this.lastBlade && this.blade.speed > .22 && segmentDistance(this.lastBlade, this.blade, f) < f.r * .84) {
        f.bomb ? this.hitBomb(f) : this.sliceFruit(f, this.blade);
      }
      if (!f.sliced && f.wasVisible && f.y - f.r > this.h + 8) { f.sliced = true; if (!f.bomb) this.missFruit(); }
    }
    this.fruits = this.fruits.filter(f => !f.sliced && f.y < this.h + f.r * 3);
    for (const h of this.halves) { h.vy += gravity * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.rot += h.vr * dt; h.life -= dt * 1000; }
    this.halves = this.halves.filter(h => h.life > 0 && h.y < this.h + 150);
    for (const p of this.juice) { p.vy += gravity * .48 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 1000; }
    this.juice = this.juice.filter(p => p.life > 0);
    this.trail = this.trail.filter(p => now - p.t < 240);
    this.shake = Math.max(0, (this.shake || 0) - dt * 42);
  }

  draw(now) {
    const ctx = this.ctx; ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#151719'; ctx.fillRect(0, 0, this.w, this.h);
    if (ART.background.complete && ART.background.naturalWidth) {
      const imageRatio = ART.background.naturalWidth / ART.background.naturalHeight;
      const screenRatio = this.w / this.h;
      const dw = screenRatio > imageRatio ? this.w : this.h * imageRatio;
      const dh = screenRatio > imageRatio ? this.w / imageRatio : this.h;
      ctx.drawImage(ART.background, (this.w - dw) / 2, (this.h - dh) / 2, dw, dh);
    }
    const shade = ctx.createLinearGradient(0, 0, 0, this.h);
    shade.addColorStop(0, '#073b4650'); shade.addColorStop(.24, '#ffffff00'); shade.addColorStop(.72, '#ffffff00'); shade.addColorStop(1, '#0c554126');
    ctx.fillStyle = shade; ctx.fillRect(0, 0, this.w, this.h);
    ctx.globalAlpha = 1;
    ctx.save();
    if (this.shake) ctx.translate(rand(-this.shake, this.shake), rand(-this.shake, this.shake));
    for (const p of this.juice) { ctx.globalAlpha = clamp(p.life / 500, 0, 1); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
    for (const f of this.fruits) this.drawFruit(f);
    for (const h of this.halves) this.drawHalf(h);
    this.drawTrail(now); this.drawKnife(now); ctx.restore();
  }

  drawFruit(f) {
    const ctx = this.ctx; ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.rot);
    if (f.bomb) this.drawAtlasCell(BOMB.cell, f.r * 2.62 * BOMB.scale); else this.drawFruitBody(f.type, f.r, f.face);
    ctx.restore();
  }

  drawFruitBody(type, r, face = 0) {
    this.drawAtlasCell(type.cell, r * 2.58 * type.scale);
    this.drawFace(r, face);
  }

  drawHalf(h) {
    const ctx = this.ctx; ctx.save(); ctx.translate(h.x, h.y); ctx.rotate(h.rot);
    const size = h.r * 2.58 * h.type.scale;
    ctx.beginPath();
    if (h.side < 0) ctx.rect(-size / 2 - 8, -size / 2 - 8, size / 2 + 8, size + 16);
    else ctx.rect(0, -size / 2 - 8, size / 2 + 8, size + 16);
    ctx.clip();
    this.drawFruitBody(h.type, h.r, h.face);
    ctx.fillStyle = h.type.juice;
    ctx.fillRect(h.side < 0 ? -2 : 0, -size * .32, 3, size * .64);
    ctx.restore();
  }

  drawAtlasCell(cell, size) {
    const image = ART.atlas;
    if (!image.complete || !image.naturalWidth) return;
    const ctx = this.ctx;
    const sw = image.naturalWidth / 4, sh = image.naturalHeight / 2;
    const sx = (cell % 4) * sw, sy = Math.floor(cell / 4) * sh;
    ctx.shadowColor = '#000b'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 7;
    ctx.drawImage(image, sx, sy, sw, sh, -size / 2, -size / 2, size, size);
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  }

  drawFace(r, mood) {
    const ctx = this.ctx;
    const eyeY = -r * .1, eyeX = r * .28, eyeR = Math.max(3.5, r * .13);
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.fillStyle = '#fff9e7';
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(side * eyeX, eyeY, eyeR, eyeR * .9, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#20150d';
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.arc(side * eyeX + side * r * .025, eyeY + r * .02, eyeR * .48, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = '#20150d'; ctx.lineWidth = Math.max(2.5, r * .095);
    if (mood === 0) {
      ctx.beginPath(); ctx.moveTo(-eyeX - eyeR * .8, eyeY - eyeR * 1.35); ctx.lineTo(-eyeX + eyeR * .8, eyeY - eyeR * .75); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(eyeX - eyeR * .8, eyeY - eyeR * .75); ctx.lineTo(eyeX + eyeR * .8, eyeY - eyeR * 1.35); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, r * .38, r * .24, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    } else if (mood === 1) {
      ctx.beginPath(); ctx.arc(0, r * .12, r * .26, .18, Math.PI - .18); ctx.stroke();
      ctx.fillStyle = '#ff5f68'; ctx.beginPath(); ctx.ellipse(0, r * .35, r * .12, r * .07, 0, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = '#20150d'; ctx.beginPath(); ctx.ellipse(0, r * .31, r * .13, r * .18, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ff8478'; ctx.beginPath(); ctx.ellipse(0, r * .38, r * .07, r * .04, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  drawTrail(now) {
    if (this.trail.length < 2) return;
    const ctx = this.ctx; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (let i = 1; i < this.trail.length; i++) {
      const a = this.trail[i - 1], b = this.trail[i]; const alpha = clamp(1 - (now - b.t) / 240, 0, 1);
      ctx.strokeStyle = `rgba(190,255,235,${alpha})`; ctx.shadowColor = '#36ff9a'; ctx.shadowBlur = 14; ctx.lineWidth = 2 + i * .65;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.shadowBlur = 0;
    if (this.blade) {
      ctx.fillStyle = '#fff'; ctx.shadowColor = '#63ffae'; ctx.shadowBlur = 18; ctx.beginPath(); ctx.arc(this.blade.x, this.blade.y, 5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    }
  }

  drawKnife(now) {
    if (!this.bladeVisible || !this.blade || this.mode !== 'playing') return;
    const ctx = this.ctx;
    const pulse = 1 + Math.sin(now * .014) * .025;
    ctx.save();
    ctx.translate(this.blade.x, this.blade.y);
    ctx.rotate(this.bladeAngle);
    ctx.scale(pulse, pulse);

    const sword = ART.sword;
    if (sword.complete && sword.naturalWidth) {
      ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 22;
      ctx.drawImage(sword, -45, -24, 180, 60);
      ctx.shadowBlur = 0;
    }
    ctx.restore();
  }

  loop(now) {
    const dt = Math.min(.034, (now - this.lastFrame) / 1000); this.lastFrame = now;
    this.update(dt, now); this.draw(now); requestAnimationFrame(this.loop);
  }
}

function segmentDistance(a, b, p) {
  const dx = b.x - a.x, dy = b.y - a.y; const len = dx * dx + dy * dy;
  if (!len) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / len, 0, 1);
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

const game = new FruitGame($('#gameCanvas'));
let stream = null, detector = null, trackingActive = false, lastVideoTime = -1, lastDetection = 0;

// 宿主 WebView 若没有答复权限请求，getUserMedia 会永久挂起（promise 既不 resolve
// 也不 reject），界面就会一直停在「正在连接…」。video.play() 在底层永远不送帧时
// 同样不会 settle，而它排在界面更新之前，卡在那儿的表现和卡在 getUserMedia 完全
// 一样。两处都套上超时，保证任何情况下都能退回触屏模式。
function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new DOMException(label, 'TimeoutError')), ms);
    }),
  ]);
}

// 首次启动要等用户回答系统授权弹窗，所以给得比较宽松；这只是兜底，
// 正常路径下原生层会在一秒内答复。
function requestCameraWithTimeout(constraints, ms = 30000) {
  return withTimeout(navigator.mediaDevices.getUserMedia(constraints), ms, '摄像头授权超时');
}

function playVideoWithTimeout(video, ms = 8000) {
  return withTimeout(video.play(), ms, '摄像头画面无法播放');
}

async function startCamera() {
  const video = $('#cameraVideo'), fallback = $('#cameraFallback'), status = $('#trackingStatus');
  if (stream) return;
  if (!navigator.mediaDevices?.getUserMedia) { status.textContent = '请使用触屏切割'; return; }
  fallback.querySelector('strong').textContent = '正在连接…';
  try {
    stream = await requestCameraWithTimeout({ video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 640 } }, audio: false });
    video.srcObject = stream; await playVideoWithTimeout(video); video.style.display = 'block'; fallback.style.display = 'none';
    status.textContent = '正在加载识别模型…';
    const vision = await import('../_shared/mediapipe/vision_bundle.mjs');
    const fileset = await vision.FilesetResolver.forVisionTasks('../_shared/mediapipe');
    detector = await vision.GestureRecognizer.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: '../_shared/mediapipe/gesture_recognizer.task', delegate: 'GPU' },
      runningMode: 'VIDEO', numHands: 1, minHandDetectionConfidence: .42, minHandPresenceConfidence: .42, minTrackingConfidence: .42,
    });
    trackingActive = true; status.textContent = '伸出食指控制刀'; status.classList.add('active'); detectHands();
  } catch (error) {
    console.warn('Camera or hand tracking unavailable', error);
    fallback.style.display = 'grid'; fallback.querySelector('strong').textContent = '重新开启摄像头'; status.textContent = '触屏模式可用';
    toast('摄像头不可用，已切换为触屏操作');
  }
}

function detectHands(now = performance.now()) {
  if (!trackingActive || !detector) return;
  const video = $('#cameraVideo'), status = $('#trackingStatus');
  if (!$('#cameraPanel').hidden && video.readyState >= 2 && video.currentTime !== lastVideoTime && now - lastDetection > 45) {
    lastVideoTime = video.currentTime; lastDetection = now;
    const result = detector.recognizeForVideo(video, now);
    const hand = result.landmarks?.[0];
    if (hand) {
      const tip = hand[8]; const rect = game.canvas.getBoundingClientRect();
      game.setBlade(rect.left + (1 - tip.x) * rect.width, rect.top + tip.y * rect.height, 'hand', now);
      status.textContent = '食指控刀中'; status.classList.add('active');
    } else {
      game.clearHand(); status.textContent = '请将手放入画面'; status.classList.remove('active');
    }
  }
  requestAnimationFrame(detectHands);
}

function beginGame() {
  $('#menu').hidden = true; $('#gameOver').hidden = true; $('#hud').hidden = false; $('#cameraPanel').hidden = false;
  game.start(); startCamera();
}

$('#startButton').addEventListener('click', beginGame);
$('#restartButton').addEventListener('click', beginGame);
$('#homeButton').addEventListener('click', () => { $('#gameOver').hidden = true; $('#cameraPanel').hidden = true; $('#menu').hidden = false; game.mode = 'menu'; });
$('#cameraFallback').addEventListener('click', startCamera);
