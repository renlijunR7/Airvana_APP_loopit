import { OUTCOMES, PHASES } from './engine.js';

export const STORAGE_KEY = 'guessing-game:state:v1';
const STORAGE_VERSION = 1;

function defaultStorage() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function validState(state) {
  if (!state || typeof state !== 'object') return false;
  if (!Object.values(PHASES).includes(state.phase)) return false;
  if (!Number.isInteger(state.roundId) || state.roundId < 1) return false;
  if (!Number.isInteger(state.credits) || state.credits < 0) return false;
  if (!Number.isInteger(state.rngState) || state.rngState < 0) return false;
  if (!Array.isArray(state.players) || state.players.length < 2) return false;
  if (new Set(state.players.map((player) => player.id)).size !== state.players.length) return false;
  if (state.result && !Object.values(OUTCOMES).includes(state.result.outcome)) return false;
  return Boolean(state.config && Array.isArray(state.config.allowedStakes));
}

export function saveGameState(state, storage = defaultStorage(), key = STORAGE_KEY) {
  if (!storage || !validState(state)) return false;
  try {
    storage.setItem(key, JSON.stringify({ version: STORAGE_VERSION, state }));
    return true;
  } catch {
    return false;
  }
}

export function loadGameState(storage = defaultStorage(), key = STORAGE_KEY) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const payload = JSON.parse(raw);
    if (payload?.version !== STORAGE_VERSION || !validState(payload.state)) return null;
    return payload.state;
  } catch {
    return null;
  }
}

export function clearGameState(storage = defaultStorage(), key = STORAGE_KEY) {
  if (!storage) return false;
  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function createMemoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial).map(([key, value]) => [key, String(value)]));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
    clear() {
      values.clear();
    },
  };
}
