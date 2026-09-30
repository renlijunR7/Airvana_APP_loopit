const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const gestures = [
  { id: 'one', emoji: '☝️', label: 'One Finger', effect: 'spin' },
  { id: 'two', emoji: '✌️', label: 'Two Finger', effect: 'message' },
  { id: 'three', emoji: '🤟', label: 'Three Finger', effect: 'sparkle' },
  { id: 'pinch', emoji: '👌', label: 'Pinch - Zoom In', effect: 'zoom' },
  { id: 'fist', emoji: '✊', label: 'Fist', effect: 'tree' },
  { id: 'palm', emoji: '✋', label: 'Open Palm', effect: 'explode' },
  { id: 'swipe', emoji: '👋', label: 'Swipe Left - Right', effect: 'swipe' },
];

const state = {
  step: 0,
  purpose: 'Holiday',
  style: 'tree',
  selectedGesture: 'one',
  actions: ['one', 'two', 'three'],
  stream: null,
};

function setClock() {
  const d = new Date();
  const text = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  $('#clock').textContent = text;
  $('#playClock').textContent = text;
}
setClock();
setInterval(setClock, 30000);

function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 1800);
}

function drawMiniTree(canvas, phase = 0) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#010305';
  ctx.fillRect(0, 0, w, h);
  const random = mulberry32(4871);
  for (let i = 0; i < 110; i++) {
    const x = random() * w, y = random() * h;
    ctx.fillStyle = `rgba(255,255,255,${.08 + random() * .45})`;
    ctx.beginPath(); ctx.arc(x, y, random() * 1.8 + .3, 0, Math.PI * 2); ctx.fill();
  }
  const icons = ['🎁', '⭐', '🍭', '🔴', '🟢'];
  for (let i = 0; i < 360; i++) {
    const y = 90 + random() * (h - 105);
    const ratio = (y - 70) / (h - 80);
    const x = w / 2 + (random() - .5) * ratio * w * .88;
    const icon = icons[Math.floor(random() * icons.length)];
    const size = 7 + ratio * 14 + random() * 6;
    ctx.globalAlpha = .65 + random() * .35;
    ctx.font = `${size}px Apple Color Emoji, sans-serif`;
    ctx.fillText(icon, x, y);
  }
  ctx.globalAlpha = 1;
  ctx.font = '88px Apple Color Emoji, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('⭐', w / 2, 105 + Math.sin(phase) * 2);
  ctx.textAlign = 'start';
}

function mulberry32(seed) {
  return function () {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

$$('.mini-tree').forEach((canvas, i) => drawMiniTree(canvas, i));

function renderGesturePicker() {
  $('#gesturePicker').innerHTML = gestures.map(g => `<button class="gesture-option ${state.selectedGesture === g.id ? 'selected' : ''}" data-id="${g.id}" title="${g.label}">${g.emoji}</button>`).join('');
  $('#customActions').innerHTML = state.actions.map((id, index) => {
    const g = gestures.find(item => item.id === id);
    return `<button class="custom-action" data-index="${index}"><b>${g.emoji}</b><span>${index + 1}</span><i>✎</i></button>`;
  }).join('');
  $$('.gesture-option').forEach(button => button.addEventListener('click', () => {
    state.selectedGesture = button.dataset.id;
    const replaceIndex = Math.min(state.actions.length - 1, 2);
    if (!state.actions.includes(button.dataset.id)) state.actions[replaceIndex] = button.dataset.id;
    renderGesturePicker();
  }));
  $$('.custom-action').forEach(button => button.addEventListener('click', () => {
    const index = Number(button.dataset.index);
    const current = gestures.findIndex(g => g.id === state.actions[index]);
    state.actions[index] = gestures[(current + 1) % gestures.length].id;
    renderGesturePicker();
  }));
}
renderGesturePicker();

function showStep(step) {
  state.step = Math.max(0, Math.min(3, step));
  window.scrollTo({ top: 0, behavior: 'instant' });
  $$('.step').forEach((el, i) => el.classList.toggle('active', i === state.step));
  $$('.progress-dot').forEach((el, i) => {
    el.classList.toggle('active', i === state.step);
    el.classList.toggle('done', i < state.step);
  });
  $('.progress-line i').style.width = `${state.step / 3 * 100}%`;
  $('#progress').setAttribute('aria-label', `步骤 ${state.step + 1}，共 4 步`);
  $('#nextButton').textContent = state.step === 3 ? 'Start' : 'Next';
}

$('#nextButton').addEventListener('click', () => state.step < 3 ? showStep(state.step + 1) : startExperience());
$('#backButton').addEventListener('click', () => state.step > 0 ? showStep(state.step - 1) : toast('已经是第一步'));
$$('.progress-dot').forEach(dot => dot.addEventListener('click', () => showStep(Number(dot.dataset.step))));
$$('.purpose-card').forEach(button => button.addEventListener('click', () => {
  $$('.purpose-card').forEach(el => el.classList.remove('selected'));
  button.classList.add('selected'); state.purpose = button.dataset.purpose;
}));
$$('.pill-choice').forEach(button => button.addEventListener('click', () => {
  $$('.pill-choice').forEach(el => el.classList.remove('selected'));
  button.classList.add('selected'); state.style = button.dataset.style;
}));
$$('.text-box input').forEach(input => input.addEventListener('input', () => {
  $('i span', input.parentElement).textContent = input.value.length;
}));

class ParticleTree {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.dpr = Math.min(devicePixelRatio || 1, 2);
    this.rotation = 0;
    this.rotationTarget = 0;
    this.zoom = 1;
    this.zoomTarget = 1;
    this.mode = 'tree';
    this.sparkleBoost = 0;
    this.dragging = false;
    this.lastX = 0;
    this.particles = [];
    this.makeParticles(1480);
    this.bind();
    this.resize();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  makeParticles(count) {
    const rand = mulberry32(25122025);
    const palette = ['#17e676', '#08aa55', '#5dff9a', '#f62b43', '#ff5b64', '#ffe500', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const yNorm = rand();
      const y = .86 - yNorm * 1.72;
      const radius = .08 + (1 - yNorm) * .83;
      const angle = rand() * Math.PI * 2;
      const radial = Math.sqrt(rand()) * radius;
      const tree = { x: Math.cos(angle) * radial, y, z: Math.sin(angle) * radial };
      const explode = {
        x: (rand() - .5) * 2.08,
        y: (rand() - .5) * 2.18,
        z: (rand() - .5) * 2.2,
      };
      const r = rand();
      const type = r > .90 ? 'gift' : r > .81 ? 'star' : r > .73 ? 'candy' : 'orb';
      const color = type === 'orb' ? palette[Math.floor(rand() * palette.length)] : '#fff';
      this.particles.push({ tree, explode, x: explode.x, y: explode.y, z: explode.z, vx: 0, vy: 0, size: 2.2 + rand() * 6.5, type, color, twinkle: rand() * 7, scatterVisible: i % 5 < 3 });
    }
  }

  bind() {
    const c = this.canvas;
    c.addEventListener('pointerdown', e => { this.dragging = true; this.lastX = e.clientX; c.setPointerCapture(e.pointerId); });
    c.addEventListener('pointermove', e => { if (!this.dragging) return; this.rotationTarget += (e.clientX - this.lastX) * .012; this.lastX = e.clientX; });
    c.addEventListener('pointerup', () => this.dragging = false);
    c.addEventListener('pointercancel', () => this.dragging = false);
    c.addEventListener('wheel', e => { e.preventDefault(); this.zoomTarget = Math.max(.65, Math.min(1.45, this.zoomTarget - e.deltaY * .001)); }, { passive: false });
    let pinchStart = 0;
    c.addEventListener('touchstart', e => { if (e.touches.length === 2) pinchStart = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); }, { passive: true });
    c.addEventListener('touchmove', e => {
      if (e.touches.length !== 2 || !pinchStart) return;
      const distance = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      this.zoomTarget = Math.max(.65, Math.min(1.45, this.zoomTarget * distance / pinchStart)); pinchStart = distance;
    }, { passive: true });
    addEventListener('resize', () => this.resize());
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.w = rect.width; this.h = rect.height;
    this.canvas.width = Math.round(rect.width * this.dpr);
    this.canvas.height = Math.round(rect.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  setMode(mode) {
    if (mode === 'tree') this.mode = 'tree';
    if (mode === 'explode') this.mode = 'explode';
    if (mode === 'zoom') this.zoomTarget = this.zoomTarget > 1.2 ? .82 : 1.35;
    if (mode === 'spin') this.rotationTarget += Math.PI * 2;
    if (mode === 'swipe') this.rotationTarget += Math.PI * .75;
    if (mode === 'sparkle') this.sparkleBoost = 1;
    if (mode === 'message') $('#messageOverlay').classList.toggle('show');
  }

  animate(time) {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.w, this.h);
    this.rotation += (this.rotationTarget - this.rotation) * .055;
    this.zoom += (this.zoomTarget - this.zoom) * .07;
    this.sparkleBoost *= .975;
    const scaleX = this.w * .54 * this.zoom;
    const scaleY = this.h * .43 * this.zoom;
    const centerX = this.w / 2;
    const centerY = this.h * .48;
    const cos = Math.cos(this.rotation), sin = Math.sin(this.rotation);
    const ordered = [];
    for (const p of this.particles) {
      const target = this.mode === 'tree' ? p.tree : p.explode;
      const spring = this.mode === 'tree' ? .055 : .035;
      p.vx = (p.vx + (target.x - p.x) * spring) * .86;
      p.vy = (p.vy + (target.y - p.y) * spring) * .86;
      p.x += p.vx; p.y += p.vy; p.z += (target.z - p.z) * .075;
      const rx = p.x * cos - p.z * sin;
      const rz = p.x * sin + p.z * cos;
      const perspective = 1 / (1 + rz * .18);
      if (this.mode === 'tree' || p.scatterVisible) {
        ordered.push({ p, x: centerX + rx * scaleX * perspective, y: centerY + p.y * scaleY * perspective, depth: rz, perspective: perspective * this.zoom });
      }
    }
    ordered.sort((a, b) => a.depth - b.depth);
    for (const item of ordered) this.drawParticle(item, time);
    if (this.mode === 'tree') this.drawTopStar(time, centerX, centerY - .95 * scaleY, scaleX);
    requestAnimationFrame(this.animate);
  }

  drawParticle({ p, x, y, perspective }, time) {
    const ctx = this.ctx;
    const twinkle = .78 + Math.sin(time * .003 + p.twinkle) * (.14 + this.sparkleBoost * .18);
    const size = p.size * perspective * (1 + this.sparkleBoost * .25);
    ctx.globalAlpha = Math.max(.25, twinkle);
    if (p.type === 'orb') {
      const glow = ctx.createRadialGradient(x - size * .25, y - size * .3, 0, x, y, size * 1.7);
      glow.addColorStop(0, '#fff'); glow.addColorStop(.12, p.color); glow.addColorStop(.6, p.color + 'b0'); glow.addColorStop(1, '#00000000');
      ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, size * 1.7, 0, Math.PI * 2); ctx.fill();
    } else {
      const emoji = p.type === 'gift' ? '🎁' : p.type === 'star' ? '★' : '🍭';
      ctx.fillStyle = '#fff400';
      ctx.font = `${Math.max(6, size * 2.1)}px ${p.type === 'star' ? 'Arial' : 'Apple Color Emoji, sans-serif'}`;
      ctx.fillText(emoji, x, y);
    }
    ctx.globalAlpha = 1;
  }

  drawTopStar(time, x, y, scale) {
    const ctx = this.ctx;
    const outer = Math.max(28, scale * .18) * (1 + Math.sin(time * .004) * .025);
    ctx.save(); ctx.translate(x, y); ctx.rotate(-Math.PI / 2);
    ctx.shadowColor = '#fff82d'; ctx.shadowBlur = 28; ctx.fillStyle = '#fff500'; ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const radius = i % 2 ? outer * .43 : outer;
      const a = i * Math.PI / 5;
      ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
    }
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
}

let particleTree;
let gestureDetectorStop = null;

function renderActionDock() {
  const ordered = [...state.actions, ...gestures.map(g => g.id).filter(id => !state.actions.includes(id))];
  $('#actionCarousel').innerHTML = ordered.map((id, index) => {
    const g = gestures.find(item => item.id === id);
    return `<button class="action-card ${index === 0 ? 'selected' : ''}" data-id="${id}"><b>${g.emoji}</b><span>${g.label}</span></button>`;
  }).join('');
  $$('.action-card').forEach(card => card.addEventListener('click', () => activateGesture(card.dataset.id, card)));
}

function activateGesture(id, card = null) {
  const gesture = gestures.find(g => g.id === id);
  if (!gesture || !particleTree) return;
  particleTree.setMode(gesture.effect);
  $$('.action-card').forEach(el => el.classList.toggle('selected', el.dataset.id === id));
  const selected = card || $(`.action-card[data-id="${id}"]`);
  if (selected) {
    const carousel = $('#actionCarousel');
    carousel.scrollTo({ left: selected.offsetLeft - (carousel.clientWidth - selected.clientWidth) / 2, behavior: 'smooth' });
  }
  const hints = { tree: '粒子正在聚拢成圣诞树', explode: '粒子已爆散', zoom: '捏合手势切换缩放', spin: '单指控制旋转', sparkle: '三指点亮星光', message: '祝福文字已切换', swipe: '挥手旋转圣诞树' };
  $('#gestureHint').textContent = hints[gesture.effect];
}

async function startExperience() {
  $('#customizer').hidden = true;
  $('#experience').hidden = false;
  $('#displayMain').textContent = $('#mainMessage').value || (state.purpose === 'Holiday' ? 'Merry Christmas' : 'A Little Christmas Magic');
  $('#displaySub').textContent = $('#subMessage').value || 'Made with a little magic ✨';
  renderActionDock();
  if (!particleTree) particleTree = new ParticleTree($('#particleCanvas'));
  else particleTree.resize();
  requestAnimationFrame(() => particleTree.setMode(state.style === 'explore' ? 'explode' : 'tree'));
  await startCamera();
}

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
  const video = $('#cameraVideo');
  const fallback = $('#cameraFallback');
  const status = $('#recognitionStatus');
  if (state.stream) return;
  if (!navigator.mediaDevices?.getUserMedia) {
    fallback.querySelector('strong').textContent = '摄像头不可用';
    fallback.querySelector('small').textContent = '请使用支持摄像头的浏览器';
    toast('当前浏览器不支持摄像头，已启用触控模式');
    return;
  }
  fallback.querySelector('strong').textContent = '正在连接…';
  fallback.querySelector('small').textContent = '请允许访问前置摄像头';
  try {
    state.stream = await requestCameraWithTimeout({ video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 640 } }, audio: false });
    video.srcObject = state.stream;
    await playVideoWithTimeout(video);
    video.style.display = 'block';
    fallback.style.display = 'none';
    $('#cameraPanel').classList.add('connected');
    status.textContent = '正在加载手势模型…';
    toast('摄像头已连接，正在识别手势');
    startGestureDetection(video);
  } catch (error) {
    fallback.querySelector('strong').textContent = '开启摄像头';
    fallback.querySelector('small').textContent = '点击后允许显示实时手势';
    status.textContent = '等待摄像头授权';
    toast('摄像头未授权，可点击底部手势或拖动操作');
  }
}

async function startGestureDetection(video) {
  const status = $('#recognitionStatus');
  try {
    const vision = await import('../_shared/mediapipe/vision_bundle.mjs');
    const fileset = await vision.FilesetResolver.forVisionTasks('../_shared/mediapipe');
    const detector = await vision.GestureRecognizer.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: '../_shared/mediapipe/gesture_recognizer.task', delegate: 'GPU' },
      runningMode: 'VIDEO', numHands: 1,
      minHandDetectionConfidence: .45,
      minHandPresenceConfidence: .45,
      minTrackingConfidence: .45,
      cannedGesturesClassifierOptions: { scoreThreshold: .48 },
    });
    status.textContent = '请将手放入画面';
    let active = true, lastTime = -1, candidate = '', stable = 0, lastRun = 0, applied = '', missingFrames = 0;
    gestureDetectorStop = () => { active = false; detector.close(); };
    const loop = (now) => {
      if (!active || $('#experience').hidden) return;
      if (now - lastRun > 85 && video.currentTime !== lastTime) {
        lastRun = now; lastTime = video.currentTime;
        const result = detector.recognizeForVideo(video, now);
        if (result.landmarks?.[0]) {
          missingFrames = 0;
          const category = result.gestures?.[0]?.[0];
          const id = classifyRecognizedGesture(category?.categoryName, result.landmarks[0]);
          const confidence = category?.score ? ` ${Math.round(category.score * 100)}%` : '';
          if (id) {
            const gesture = gestures.find(g => g.id === id);
            status.textContent = `检测到：${gesture?.label || id}${confidence}`;
            status.classList.add('detected');
            if (id === candidate) stable++; else { candidate = id; stable = 1; }
            if (stable >= 3 && id !== applied) {
              applied = id;
              activateGesture(id);
              navigator.vibrate?.(25);
            }
          } else {
            candidate = ''; stable = 0;
            status.textContent = '看到手了，请摆出清晰手势';
            status.classList.remove('detected');
          }
        } else {
          missingFrames++;
          if (missingFrames > 5) {
            candidate = ''; stable = 0; applied = '';
            status.textContent = '未检测到手';
            status.classList.remove('detected');
          }
        }
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  } catch (error) {
    console.warn('Gesture model unavailable; touch controls remain active.', error);
    status.textContent = '手势模型加载失败';
    status.classList.remove('detected');
    toast('手势模型未加载，底部手势按钮仍可操作');
  }
}

function classifyRecognizedGesture(category, lm) {
  const distance = (a, b) => Math.hypot(lm[a].x - lm[b].x, lm[a].y - lm[b].y);
  if (distance(4, 8) < distance(5, 9) * .36) return 'pinch';
  const map = {
    Closed_Fist: 'fist',
    Open_Palm: 'palm',
    Pointing_Up: 'one',
    Victory: 'two',
    ILoveYou: 'three',
  };
  return map[category] || '';
}

$('#closeExperience').addEventListener('click', () => {
  $('#experience').hidden = true;
  $('#customizer').hidden = false;
  state.stream?.getTracks().forEach(track => track.stop()); state.stream = null;
  gestureDetectorStop?.(); gestureDetectorStop = null;
  $('#cameraVideo').style.display = 'none'; $('#cameraFallback').style.display = 'grid';
  $('#cameraPanel').classList.remove('connected');
  $('#recognitionStatus').textContent = '等待摄像头';
  $('#recognitionStatus').classList.remove('detected');
});

$('#cameraFallback').addEventListener('click', startCamera);

$('#recordButton').addEventListener('click', function () {
  this.classList.toggle('recording');
  toast(this.classList.contains('recording') ? '演示录制已开始' : '演示录制已结束');
});

document.addEventListener('keydown', e => {
  if ($('#experience').hidden) return;
  const map = { '1': 'one', '2': 'two', '3': 'three', '4': 'pinch', '5': 'fist', '6': 'palm', 'ArrowLeft': 'swipe', 'ArrowRight': 'swipe' };
  if (map[e.key]) activateGesture(map[e.key]);
});
