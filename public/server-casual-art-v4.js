/* Local-only art adapter. CSS preserves the atlas PNG's source transparency. */
(function (root) {
  'use strict';
  const VERSION = '4.0.0';
  if (root.AirvanaServerCasualArtV4?.version === VERSION) return;

  const BASE = '/assets/games/server-casual-v4/';
  const ATLAS = BASE + 'atlas.png';
  const ATLAS_WIDTH = 1254, ATLAS_HEIGHT = 1254;
  // Reviewed pixel boundaries include the first-row characters' complete feet.
  const ROW_EDGES = Object.freeze([0, 342, 633, 943, 1254]);
  const COLUMN_EDGES = Object.freeze([0, 322, 647, 961, 1254]);
  const KEYS = Object.freeze([
    'guardian', 'raider', 'shield', 'key',
    'scroll', 'treasure', 'emerald', 'ruby',
    'sapphire', 'amethyst', 'crystal', 'potion',
    'boots', 'tent', 'energy', 'sword'
  ]);
  const FRAMES = Object.freeze(Object.fromEntries(KEYS.map((key, index) => {
    const column = index % 4, row = Math.floor(index / 4);
    return [key, Object.freeze({ x: COLUMN_EDGES[column], y: ROW_EDGES[row], w: COLUMN_EDGES[column + 1] - COLUMN_EDGES[column], h: ROW_EDGES[row + 1] - ROW_EDGES[row] })];
  })));
  const ALIASES = Object.freeze({
    hero: 'guardian', sentinel: 'guardian', star: 'energy', parcel: 'treasure',
    fire: 'crystal', frost: 'crystal', enemy: 'raider', bandit: 'raider',
    healing: 'potion', shoes: 'boots', house: 'tent', coin: 'treasure'
  });
  const MAX_WAIT_MS = 12000;
  let state = 'idle', pending = null, current = null, attempts = 0, error = null;
  let width = 0, height = 0;

  const normalize = value => typeof value === 'string' ? value.trim().toLowerCase() : '';
  function canonical(key) {
    key = normalize(key);
    return KEYS.includes(key) ? key : Object.hasOwn(ALIASES, key) ? ALIASES[key] : null;
  }
  function background(mode) {
    mode = normalize(mode);
    if (mode === 'decision') return BASE + 'security-world.png';
    if (mode === 'memory') return BASE + 'memory-world.png';
    return null;
  }
  function css(key) {
    const name = canonical(key);
    if (name === null) return null;
    const frame = FRAMES[name];
    return {
      display: 'inline-block',
      backgroundImage: 'url("' + ATLAS + '")',
      backgroundSize: (ATLAS_WIDTH / frame.w * 100) + '% ' + (ATLAS_HEIGHT / frame.h * 100) + '%',
      backgroundPosition: (frame.x / (ATLAS_WIDTH - frame.w) * 100) + '% ' + (frame.y / (ATLAS_HEIGHT - frame.h) * 100) + '%',
      backgroundRepeat: 'no-repeat',
      backgroundColor: 'transparent',
      imageRendering: 'auto'
    };
  }
  function load() {
    if (pending) return pending;
    if (typeof root.Image !== 'function') {
      state = 'unavailable'; error = 'image-api-unavailable';
      pending = Promise.resolve(false); return pending;
    }
    state = 'loading'; error = null; width = 0; height = 0; attempts += 1;
    pending = new Promise(resolve => {
      let settled = false, timer = null, image = null;
      const finish = (ok, reason) => {
        if (settled) return; settled = true;
        if (timer !== null && typeof root.clearTimeout === 'function') root.clearTimeout(timer);
        if (image) { image.onload = null; image.onerror = null; }
        state = ok ? 'ready' : 'error'; error = ok ? null : reason;
        if (ok) { width = image.naturalWidth; height = image.naturalHeight; }
        resolve(ok);
      };
      try {
        image = new root.Image(); current = image; image.decoding = 'async';
        image.onload = () => {
          const valid = Number.isFinite(image.naturalWidth) && Number.isFinite(image.naturalHeight) && image.naturalWidth > 0 && image.naturalHeight > 0;
          if (!valid) finish(false, 'invalid-atlas-dimensions');
          else finish(image.naturalWidth === ATLAS_WIDTH && image.naturalHeight === ATLAS_HEIGHT, 'atlas-dimensions-mismatch');
        };
        image.onerror = () => finish(false, 'atlas-load-failed');
        if (typeof root.setTimeout === 'function' && typeof root.clearTimeout === 'function') timer = root.setTimeout(() => finish(false, 'atlas-load-timeout'), MAX_WAIT_MS);
        image.src = ATLAS;
      } catch (_) { finish(false, 'atlas-load-failed'); }
    });
    return pending;
  }
  function ready() { return state === 'ready'; }
  function retry() {
    if (state === 'loading' || state === 'ready') return load();
    pending = null; current = null; state = 'idle'; error = null;
    return load();
  }
  function snapshot() {
    return {
      version: VERSION, status: state, ready: ready(), attempts, error,
      atlas: ATLAS, columns: 4, rows: 4, width, height,
      atlasSize: { width: ATLAS_WIDTH, height: ATLAS_HEIGHT },
      rowEdges: ROW_EDGES.slice(), columnEdges: COLUMN_EDGES.slice(),
      frames: Object.fromEntries(KEYS.map(key => [key, { ...FRAMES[key] }])),
      keys: KEYS.slice(), aliases: { ...ALIASES }
    };
  }

  root.AirvanaServerCasualArtV4 = Object.freeze({ version: VERSION, background, css, load, ready, retry, snapshot });
})(typeof window !== 'undefined' ? window : globalThis);
