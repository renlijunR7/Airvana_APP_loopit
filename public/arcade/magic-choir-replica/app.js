import { ChoirAudio } from './audio.js';
import { segmentHits, extendPath, MIN_CHAIN } from './path.js';
import { characters, creatureSVG } from './characters.js';

const $ = id => document.getElementById(id);
const game = $('game'), stage = $('stage'), choir = $('choir');
const connections = $('connections'), status = $('status'), toast = $('toast');
const audio = new ChoirAudio();

characters.forEach(([name, color], index) => {
  const button = document.createElement('button');
  button.className = 'singer';
  button.dataset.id = index;
  button.setAttribute('aria-label', `${name}，第 ${index + 1} 位团员`);
  button.setAttribute('aria-pressed', 'false');
  button.style.cssText = `--color:${color};--bg:${characters[index][5]};--bg2:${characters[index][6]};--delay:-${index * .37}s;--blink:-${index * .71}s`;
  button.innerHTML = creatureSVG(index) + '<span class="order" aria-hidden="true"></span>';
  choir.append(button);
});

const singers = [...choir.children];
let phase = 'idle', path = [], nodes = [], pointerId = null, lastPoint = null;
let roundId = 0, keyboardMode = false, toastTimer = null;
const timers = new Set();
const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };
let soundMuted = false;
try { soundMuted = localStorage.getItem('magic-choir-muted') === 'true'; } catch {}
audio.setMuted(soundMuted);
function syncSound() {
  $('sound-button').setAttribute('aria-pressed', String(soundMuted));
  $('sound-button').setAttribute('aria-label', soundMuted ? '开启声音' : '关闭声音');
  $('sound-button').querySelector('span').textContent = soundMuted ? '声音已关闭' : '声音已开启';
}
syncSound();

function setPhase(next) {
  phase = next;
  game.dataset.phase = next;
  $('subtitle').textContent = ({ idle: 'Swipe to connect & play!', drawing: 'Connecting...', performing: 'Listen to your little choir ♫', sleeping: 'They fell asleep… Zzz' })[next];
}
function measure() {
  const rect = stage.getBoundingClientRect();
  const gap = parseFloat(getComputedStyle(choir).gap) || 12;
  const tile = Math.min((rect.width - 2 * gap) / 3, (rect.height - 4 * gap) / 5);
  choir.style.setProperty('--tile', `${Math.max(34, tile)}px`);
  nodes = singers.map((singer, id) => {
    const b = singer.getBoundingClientRect();
    return { id, x: b.left - rect.left + b.width / 2, y: b.top - rect.top + b.height / 2 };
  });
  connections.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
  paintPath();
}
const observer = new ResizeObserver(measure);
observer.observe(stage);

function paintPath(tip = null) {
  const segments = path.slice(1).map((id, i) => {
    const a = nodes[path[i]], b = nodes[id];
    return a && b ? `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${characters[path[i]][1]}" stroke-width="9" opacity=".48"/><line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#fffdf4" stroke-width="2.5" opacity=".7"/>` : '';
  });
  if (tip && path.length) {
    const last = nodes[path.at(-1)];
    segments.push(`<line x1="${last.x}" y1="${last.y}" x2="${tip.x}" y2="${tip.y}" stroke="${characters[path.at(-1)][1]}" stroke-width="5" opacity=".45" stroke-dasharray="4 7"/>`);
  }
  connections.innerHTML = segments.join('');
  singers.forEach((singer, id) => {
    const position = path.indexOf(id);
    singer.classList.toggle('selected', position >= 0);
    singer.setAttribute('aria-pressed', String(position >= 0));
    singer.querySelector('.order').textContent = position >= 0 ? position + 1 : '';
  });
  $('sing-button').hidden = !keyboardMode || path.length === 0 || phase === 'performing';
  $('meter').hidden = !$('sing-button').hidden;
}

function showToast(message, sleep = false) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.toggle('sleep-toast', sleep);
  toast.classList.add('visible');
  if (message === 'Too short!') $('subtitle').textContent = 'Too short!';
  if (!sleep) toastTimer = setTimeout(() => toast.classList.remove('visible'), 1450);
}
function hideToast() { clearTimeout(toastTimer); toast.classList.remove('visible'); }
function emitNote(id) {
  const node = nodes[id];
  if (!node) return;
  const note = document.createElement('span');
  note.className = 'note-particle';
  note.textContent = id % 2 ? '♪' : '♫';
  note.style.cssText = `left:${node.x + 19}px;top:${node.y - 26}px;--color:${characters[id][2]}`;
  $('particles').append(note);
  later(() => note.remove(), 920);
}
function animateSinger(id) {
  const singer = singers[id];
  singer.classList.add('singing');
  emitNote(id);
  later(() => singer.classList.remove('singing'), 410);
}
function unlockAudio() {
  // Called synchronously from user gestures, including on Safari.
  return Promise.resolve(audio.unlock()).then(unlocked => {
    if (!unlocked && !soundMuted) showToast('浏览器暂未开启声音，可以继续试玩');
    return unlocked;
  }).catch(() => {
    showToast('点一下声音按钮，再试试 ♫');
    return false;
  });
}
function updateSelection(id) {
  const previous = path;
  const next = extendPath(previous, id);
  if (next === previous) return;
  path = next;
  if (path.length > previous.length) {
    const played = audio.sing(id, .72);
    if (!played && audio.state !== 'unavailable') {
      const pendingRound = roundId;
      audio.unlock().then(unlocked => {
        if (unlocked && pendingRound === roundId && phase === 'drawing' && path.includes(id)) audio.sing(id, .72);
      }).catch(() => {});
    }
    animateSinger(id);
    if (navigator.vibrate) navigator.vibrate(8);
  }
  status.textContent = path.length < MIN_CHAIN
    ? `${path.length} 位团员 · 再连 ${MIN_CHAIN - path.length} 位就可以合唱`
    : `${path.length} 位团员已就位 · 松手听合唱 ♫`;
  paintPath();
}
function clearRound() {
  roundId++;
  audio.stop();
  for (const timer of timers) clearTimeout(timer);
  timers.clear();
  if (pointerId !== null && stage.hasPointerCapture(pointerId)) stage.releasePointerCapture(pointerId);
  pointerId = null;
  lastPoint = null;
  path = [];
  keyboardMode = false;
  singers.forEach(singer => singer.classList.remove('singing'));
  $('particles').replaceChildren();
  hideToast();
  setPhase('idle');
  status.innerHTML = '<span class="gesture" aria-hidden="true">〰</span> 连起 3 位团员，唤醒一首小合唱';
  paintPath();
}
function point(event) { const rect = stage.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; }
function hitRadius() { return Math.min(35, stage.clientWidth / 10, stage.clientHeight / 11); }

stage.addEventListener('pointerdown', event => {
  if (event.button !== 0 || pointerId !== null || phase === 'performing') return;
  const firstPoint = point(event);
  const first = segmentHits(firstPoint, firstPoint, nodes, hitRadius())[0];
  if (first === undefined) return;
  event.preventDefault();
  clearRound();
  unlockAudio();
  pointerId = event.pointerId;
  stage.setPointerCapture(pointerId);
  lastPoint = firstPoint;
  setPhase('drawing');
  updateSelection(first);
});
stage.addEventListener('pointermove', event => {
  if (event.pointerId !== pointerId || phase !== 'drawing') return;
  event.preventDefault();
  const next = point(event);
  for (const id of segmentHits(lastPoint, next, nodes, hitRadius())) updateSelection(id);
  lastPoint = next;
  paintPath(next);
});
stage.addEventListener('pointerup', event => {
  if (event.pointerId !== pointerId) return;
  // Include the final touch position even if a fast move was coalesced.
  if (lastPoint) {
    for (const id of segmentHits(lastPoint, point(event), nodes, hitRadius())) updateSelection(id);
  }
  pointerId = null;
  if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
  lastPoint = null;
  finish();
});
stage.addEventListener('pointercancel', event => { if (event.pointerId === pointerId) clearRound(); });
stage.addEventListener('lostpointercapture', event => { if (event.pointerId === pointerId) clearRound(); });

function finish() {
  if (phase === 'performing') return;
  if (path.length < MIN_CHAIN) {
    clearRound();
    showToast('Too short!');
    status.textContent = '再长一点点，至少连接 3 位团员';
    return;
  }
  const currentRound = ++roundId;
  const cast = [...path];
  setPhase('performing');
  keyboardMode = false;
  paintPath();
  status.textContent = `${cast.length} 位小团员，正在为你合唱…`;
  const done = () => {
    if (currentRound !== roundId) return;
    singers.forEach(singer => singer.classList.remove('singing'));
    setPhase('sleeping');
    path = [];
    paintPath();
    showToast('They fell asleep… Zzz', true);
    status.textContent = '嘘…它们睡着啦。再连一次，轻轻唤醒它们';
  };
  Promise.resolve(audio.perform(cast, {
    onBeat: id => { if (currentRound === roundId) animateSinger(id); },
    onDone: done,
  })).catch(() => {
    if (currentRound !== roundId) return;
    showToast('声音暂不可用，可以继续试玩');
    // Keep visual playback usable if this browser has no audio output support.
    cast.forEach((id, i) => later(() => animateSinger(id), i * 170));
    later(done, 4200);
  });
}

singers.forEach((singer, id) => singer.addEventListener('click', event => {
  if (event.detail !== 0 || phase === 'performing') return;
  if (phase === 'sleeping') clearRound();
  hideToast();
  unlockAudio();
  keyboardMode = true;
  setPhase('drawing');
  updateSelection(id);
  status.textContent = `已选择 ${path.length} 位 · 点击「开始合唱」播放`;
}));
$('sing-button').addEventListener('click', () => { unlockAudio(); finish(); });
$('restart-button').addEventListener('click', clearRound);
$('sound-button').addEventListener('click', () => {
  soundMuted = !soundMuted;
  audio.setMuted(soundMuted);
  unlockAudio();
  syncSound();
  try { localStorage.setItem('magic-choir-muted', String(soundMuted)); } catch {}
});
$('help-button').addEventListener('click', () => { clearRound(); $('help-dialog').showModal(); });
const closeHelp = () => $('help-dialog').close();
$('close-help').addEventListener('click', closeHelp);
$('help-play').addEventListener('click', closeHelp);
$('help-dialog').addEventListener('click', event => { if (event.target === $('help-dialog')) closeHelp(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('help-dialog').open) clearRound(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) clearRound(); });
window.addEventListener('blur', () => { if (pointerId !== null) clearRound(); });
window.addEventListener('pagehide', () => audio.stop());

// Read-only state for QA: does not provide a way to bypass user interaction.
Object.defineProperty(window, 'choirState', { get: () => ({ phase, path: [...path], muted: soundMuted, audio: audio.state }) });
measure();
