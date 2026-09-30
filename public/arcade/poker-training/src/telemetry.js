// DEMO diagnostics only: no network, cookies, URL parameters, accounts, or user IDs.
export const TELEMETRY_STORAGE_KEY = 'poker-training-telemetry-v1';
export const TELEMETRY_CAPACITY = 200;
export const TELEMETRY_EVENTS = Object.freeze([
  'impression', 'play_start', 'valid_interaction', 'play_complete',
  'cta_view', 'cta_click', 'error', 'scene_change',
]);
const allowedEvents = new Set(TELEMETRY_EVENTS);
const values = {
  mode: ['tutorial', 'practice', 'demo'],
  phase: ['intro', 'preflop', 'flop', 'turn', 'river', 'showdown', 'review', 'complete', 'exit'],
  action: ['start', 'check', 'call', 'raise', 'fold', 'all_in', 'next', 'replay', 'skip', 'continue', 'learn_more', 'close', 'retry', 'switch_scene', 'reset', 'open', 'answer', 'select', 'finish', 'view', 'confirm'],
  scene: ['lounge', 'vegas', 'beach', 'gala'],
  source: ['intro', 'tutorial', 'practice', 'review', 'result', 'menu', 'settings', 'scene_picker', 'cta', 'local', 'demo'],
  reason: ['load_failed', 'storage_unavailable', 'invalid_action', 'renderer_unavailable', 'tutorial_complete', 'user_exit', 'user_skip', 'manual_reset', 'unknown', 'scene_changed', 'reset', 'render_error'],
};
const detailFields = Object.entries(values).map(([key, list]) => [key, new Set(list)]);
const copy = event => ({ ...event, details: { ...event.details } });

function safeDetails(details) {
  const result = {};
  if (!details || typeof details !== 'object' || Array.isArray(details)) return result;
  for (const [key, allowed] of detailFields) {
    // Do not invoke arbitrary getters or serialize objects supplied as details.
    const descriptor = Object.getOwnPropertyDescriptor(details, key);
    if (descriptor && typeof descriptor.value === 'string' && allowed.has(descriptor.value)) result[key] = descriptor.value;
  }
  return result;
}

function randomSessionId() {
  const bytes = new Uint8Array(16);
  try { globalThis.crypto.getRandomValues(bytes); }
  catch { for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256); }
  return `demo-${Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('')}`;
}

export function createTelemetry(options = {}) {
  // Accessing sessionStorage itself can throw in privacy-restricted WebViews.
  let storage;
  try { storage = Object.hasOwn(options, 'storage') ? options.storage : globalThis.sessionStorage; }
  catch { storage = null; }
  const now = typeof options.now === 'function' ? options.now : () => Date.now();
  let sessionId = randomSessionId(), sequence = 0, events = [];
  let storageMode = storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function' ? 'session' : 'memory';
  if (storageMode === 'memory') storage = null;

  function persist() {
    if (!storage) return;
    try { storage.setItem(TELEMETRY_STORAGE_KEY, JSON.stringify({ version: 1, sessionId, sequence, events })); }
    catch { storageMode = 'memory'; storage = null; }
  }

  if (storage) {
    try {
      const raw = storage.getItem(TELEMETRY_STORAGE_KEY);
      if (typeof raw === 'string' && raw.length <= 200000) {
        const saved = JSON.parse(raw);
        if (saved?.version === 1 && /^demo-[a-f0-9]{32}$/.test(saved.sessionId) && Array.isArray(saved.events)) {
          sessionId = saved.sessionId;
          const seen = new Set();
          for (const item of saved.events.slice(-TELEMETRY_CAPACITY)) {
            if (!item || !allowedEvents.has(item.name) || item.session_id !== sessionId || !Number.isFinite(item.event_time) || item.event_time < 0) continue;
            if (typeof item.event_id !== 'string' || !item.event_id.startsWith(`${sessionId}_`)) continue;
            const number = Number(item.event_id.slice(sessionId.length + 1));
            if (!Number.isSafeInteger(number) || number < 1 || number > Number.MAX_SAFE_INTEGER - 10000 || seen.has(item.event_id)) continue;
            seen.add(item.event_id); sequence = Math.max(sequence, number);
            events.push({ event_id: `${sessionId}_${number}`, session_id: sessionId, event_time: Math.floor(item.event_time), name: item.name, details: safeDetails(item.details) });
          }
        }
      }
    } catch { /* Invalid or inaccessible data never blocks play. */ }
  }
  // Replace corrupt/legacy content with this version's filtered envelope.
  persist();

  return {
    track(name, details = {}) {
      if (!allowedEvents.has(name)) return null;
      let eventTime = 0;
      try { const timestamp = now(); if (Number.isFinite(timestamp)) eventTime = Math.max(0, Math.floor(timestamp)); }
      catch { /* Deterministic safe fallback if the clock adapter fails. */ }
      const event = { event_id: `${sessionId}_${++sequence}`, session_id: sessionId, event_time: eventTime, name, details: safeDetails(details) };
      events.push(event);
      if (events.length > TELEMETRY_CAPACITY) events.splice(0, events.length - TELEMETRY_CAPACITY);
      persist();
      return copy(event);
    },
    getEvents() { return events.map(copy); },
    clear() { events = []; sequence = 0; sessionId = randomSessionId(); persist(); },
    summary() {
      const counts = Object.fromEntries(TELEMETRY_EVENTS.map(name => [name, 0]));
      for (const event of events) counts[event.name]++;
      const labels = ['进入体验', '开始练习', '有效操作', '完成练习', '查看入口', '点击入口'];
      return {
        sessionId,
        totalEvents: events.length,
        capacity: TELEMETRY_CAPACITY,
        counts,
        funnel: TELEMETRY_EVENTS.slice(0, 6).map((event, i) => ({ event, label: labels[i], count: counts[event], reached: counts[event] > 0 })),
        storage: storageMode,
        localOnly: true,
      };
    },
  };
}
