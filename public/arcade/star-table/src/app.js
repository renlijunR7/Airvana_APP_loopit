import {
  DEFAULT_CONFIG,
  PHASES,
  createInitialState,
  placeBet,
  selectPlayer,
  selectStake,
  startNextRound,
  tick,
} from './engine.js';
import { clearGameState, loadGameState, saveGameState } from './storage.js';
import {
  renderHistoryModal,
  renderLobby,
  renderResultModal,
  renderRulesModal,
  renderSelection,
  renderTable,
  patchDynamicState,
  updateShell,
} from './render.js';

const screen = document.querySelector('#screen');
const modalLayer = document.querySelector('#modal-layer');
const toast = document.querySelector('#toast');
const soundButton = document.querySelector('#sound-button');

const restored = loadGameState();
let state = restored
  ? {
      ...restored,
      countdown:
        restored.phase === PHASES.PRE_BET && !restored.ticket
          ? DEFAULT_CONFIG.preBetSeconds
          : restored.countdown,
      config: {
        ...restored.config,
        preBetSeconds: DEFAULT_CONFIG.preBetSeconds,
        liveBetSeconds: DEFAULT_CONFIG.liveBetSeconds,
      },
    }
  : createInitialState({ seed: new Date().toISOString().slice(0, 10) });
let engaged = state.phase !== PHASES.PRE_BET || Boolean(state.ticket);
let resultModalOpen = state.phase === PHASES.RESULT;
let timerId = 0;
let toastId = 0;
let soundEnabled = true;
let audioContext = null;

function tone(kind = 'tap') {
  if (!soundEnabled) return;
  try {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;
    oscillator.type = kind === 'win' ? 'sine' : 'triangle';
    oscillator.frequency.setValueAtTime(kind === 'win' ? 660 : 330, now);
    if (kind === 'win') oscillator.frequency.exponentialRampToValueAtTime(990, now + 0.22);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(kind === 'win' ? 0.13 : 0.045, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (kind === 'win' ? 0.32 : 0.08));
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + (kind === 'win' ? 0.34 : 0.09));
  } catch {
    // Audio is progressive enhancement; the game remains fully playable without it.
  }
}

function announce(message, type = 'info') {
  if (!message) return;
  window.clearTimeout(toastId);
  toast.textContent = message;
  toast.className = `toast visible ${type}`;
  toastId = window.setTimeout(() => {
    toast.className = 'toast';
  }, 2100);
}

function updateNavigation(active = 'events') {
  document.querySelectorAll('.bottom-nav-item').forEach((button) => {
    button.classList.toggle('active', button.dataset.nav === active);
  });
}

function render() {
  updateShell(state);

  if (!engaged && state.phase === PHASES.PRE_BET) {
    screen.innerHTML = renderLobby(state);
    updateNavigation('events');
  } else if (state.phase === PHASES.PRE_BET || state.phase === PHASES.LIVE_BET) {
    screen.innerHTML = renderSelection(state);
    updateNavigation('prediction');
  } else {
    screen.innerHTML = renderTable(state);
    updateNavigation('prediction');
  }

  if (state.phase === PHASES.RESULT && resultModalOpen) {
    openModal(renderResultModal(state), 'result');
  } else if (modalLayer.dataset.kind === 'result') {
    closeModal();
  }

  saveGameState(state);
  scheduleTick();
}

function setState(nextState, { notify = false, renderMode = 'full' } = {}) {
  const wasPhase = state.phase;
  state = nextState;
  if (notify) announce(state.notice?.message, state.notice?.type);

  if (wasPhase !== PHASES.RESULT && state.phase === PHASES.RESULT) {
    resultModalOpen = true;
    if (state.result?.payout > 0) tone('win');
  }
  if (renderMode === 'patch' && wasPhase === state.phase) {
    patchDynamicState(state);
    saveGameState(state);
    scheduleTick();
  } else {
    render();
  }
}

function scheduleTick() {
  window.clearTimeout(timerId);
  if (!engaged || state.phase === PHASES.RESULT) return;
  timerId = window.setTimeout(() => {
    const wasPhase = state.phase;
    const next = tick(state);
    const phaseChanged = next.phase !== wasPhase;
    setState(next, { notify: phaseChanged, renderMode: phaseChanged ? 'full' : 'patch' });
  }, state.phase === PHASES.PLAYING ? 620 : 1000);
}

function openModal(html, kind = 'generic') {
  modalLayer.innerHTML = html;
  modalLayer.dataset.kind = kind;
  modalLayer.classList.add('visible');
  document.body.style.overflow = 'hidden';
  window.setTimeout(() => modalLayer.querySelector('button')?.focus(), 0);
}

function closeModal() {
  modalLayer.classList.remove('visible');
  modalLayer.innerHTML = '';
  modalLayer.dataset.kind = '';
  document.body.style.overflow = '';
}

function showHistory() {
  openModal(renderHistoryModal(state), 'history');
  updateNavigation('history');
}

function showRules() {
  openModal(renderRulesModal(), 'rules');
}

function handleAction(action, target) {
  switch (action) {
    case 'enter-prediction':
      engaged = true;
      tone();
      render();
      break;
    case 'back-events':
      if (state.ticket) {
        announce('竞猜已确认，无法返回活动页', 'error');
        return;
      }
      engaged = false;
      tone();
      setState({
        ...state,
        phase: PHASES.PRE_BET,
        countdown: state.config.preBetSeconds,
        selectedPlayerId: null,
      });
      break;
    case 'select-player':
      tone();
      setState(selectPlayer(state, target.dataset.playerId), { notify: true });
      break;
    case 'select-stake':
      tone();
      setState(selectStake(state, Number(target.dataset.stake)), { notify: false });
      break;
    case 'place-bet': {
      tone();
      const next = placeBet(state);
      setState(next, { notify: true });
      break;
    }
    case 'reselect-info':
      announce('本轮竞猜已锁定，可立即进入观战', 'info');
      break;
    case 'start-now': {
      if (!state.ticket || (state.phase !== PHASES.PRE_BET && state.phase !== PHASES.LIVE_BET)) return;
      let next = state;
      if (next.phase === PHASES.PRE_BET) next = tick(next, next.countdown);
      if (next.phase === PHASES.LIVE_BET) next = tick(next, next.countdown);
      tone();
      setState(next, { notify: true });
      break;
    }
    case 'fast-forward': {
      if (state.phase !== PHASES.PLAYING) return;
      let next = state;
      for (let step = 0; step < 200 && next.phase === PHASES.PLAYING; step += 1) {
        next = tick(next);
      }
      tone();
      setState(next, { notify: true });
      break;
    }
    case 'close-result':
      resultModalOpen = false;
      closeModal();
      render();
      break;
    case 'next-round':
      closeModal();
      resultModalOpen = false;
      engaged = true;
      tone();
      setState(startNextRound(state, { seed: `${Date.now()}-${state.roundId + 1}` }));
      break;
    case 'reopen-result':
      if (state.phase !== PHASES.RESULT) return;
      resultModalOpen = true;
      tone();
      render();
      break;
    case 'back-to-events':
      if (state.phase !== PHASES.RESULT) return;
      closeModal();
      resultModalOpen = false;
      engaged = false;
      tone();
      setState(startNextRound(state, { seed: `${Date.now()}-${state.roundId + 1}` }));
      break;
    case 'close-modal':
      closeModal();
      updateNavigation(state.phase === PHASES.PRE_BET && !engaged ? 'events' : 'prediction');
      break;
    case 'reset-progress':
      clearGameState();
      state = createInitialState({ seed: Date.now() });
      engaged = false;
      resultModalOpen = false;
      closeModal();
      announce('本地演示进度已重置', 'success');
      render();
      break;
    default:
      break;
  }
}

document.addEventListener('click', (event) => {
  let origin = event.target;
  if (!(origin instanceof Element)) origin = origin && origin.parentElement;
  if (!(origin instanceof Element)) return;

  const actionTarget = origin.closest('[data-action]');
  if (actionTarget && !actionTarget.disabled) {
    handleAction(actionTarget.dataset.action, actionTarget);
    return;
  }

  const navTarget = origin.closest('[data-nav]');
  if (!navTarget) return;
  if (navTarget.dataset.nav === 'history') {
    showHistory();
  } else if (navTarget.dataset.nav === 'events') {
    if (state.phase === PHASES.RESULT) {
      closeModal();
      resultModalOpen = false;
      engaged = false;
      setState(startNextRound(state, { seed: `${Date.now()}-${state.roundId + 1}` }));
    } else if ((state.phase === PHASES.PRE_BET || state.phase === PHASES.LIVE_BET) && !state.ticket) {
      engaged = false;
      closeModal();
      setState({
        ...state,
        phase: PHASES.PRE_BET,
        countdown: state.config.preBetSeconds,
        selectedPlayerId: null,
      });
    } else {
      announce('本局进行中，结束后可返回活动页', 'info');
    }
  } else {
    closeModal();
    if (state.phase === PHASES.RESULT) {
      resultModalOpen = true;
      render();
    } else {
      engaged = true;
      render();
    }
  }
});

document.querySelector('#balance-chip').addEventListener('click', () => {
  announce(`当前余额 ${state.credits.toLocaleString('zh-CN')} 虚拟星币`, 'info');
});

soundButton.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  soundButton.setAttribute('aria-pressed', String(soundEnabled));
  soundButton.setAttribute('aria-label', soundEnabled ? '关闭音效' : '开启音效');
  if (soundEnabled) tone();
  announce(soundEnabled ? '轻音效已开启' : '轻音效已关闭', 'info');
});

document.querySelector('.brand').addEventListener('click', showRules);
document.querySelector('.brand').setAttribute('role', 'button');
document.querySelector('.brand').setAttribute('tabindex', '0');
document.querySelector('.brand').setAttribute('aria-label', '打开玩法说明');
document.querySelector('.brand').addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') showRules();
});

modalLayer.addEventListener('click', (event) => {
  if (event.target === modalLayer && modalLayer.dataset.kind !== 'result') closeModal();
});

window.addEventListener('pagehide', () => saveGameState(state));
window.addEventListener('beforeunload', () => saveGameState(state));

render();
