import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { inflateSync } from 'node:zlib';

const source = readFileSync(new URL('../public/server-casual-art-v4.js', import.meta.url), 'utf8');
const BASE = '/assets/games/server-casual-v4/';
const KEYS = ['guardian', 'raider', 'shield', 'key', 'scroll', 'treasure', 'emerald', 'ruby', 'sapphire', 'amethyst', 'crystal', 'potion', 'boots', 'tent', 'energy', 'sword'];
const ATLAS_WIDTH = 1254, ATLAS_HEIGHT = 1254;
const ROW_EDGES = [0, 342, 633, 943, 1254], COLUMN_EDGES = [0, 322, 647, 961, 1254];
const plain = value => JSON.parse(JSON.stringify(value));
function fixture({ hasImage = true, timers = true, constructionError = false, sourceError = false } = {}) {
  const images = [], callbacks = new Map(); let timerId = 0;
  class FakeImage {
    constructor() { if (constructionError) throw new Error('no image constructor'); this.naturalWidth = 0; this.naturalHeight = 0; images.push(this); }
    set src(value) { if (sourceError) throw new Error('src failed'); this.url = value; }
    succeed(width = ATLAS_WIDTH, height = ATLAS_HEIGHT) { this.naturalWidth = width; this.naturalHeight = height; this.onload?.(); }
    fail() { this.onerror?.(); }
  }
  const window = { retainedGlobal: { untouched: true } };
  if (hasImage) window.Image = FakeImage;
  if (timers) { window.setTimeout = (callback, ms) => { assert.equal(ms, 12000); callbacks.set(++timerId, callback); return timerId; }; window.clearTimeout = id => callbacks.delete(id); }
  const sandbox = { window }; vm.createContext(sandbox); vm.runInContext(source, sandbox);
  return { api: window.AirvanaServerCasualArtV4, window, sandbox, images, callbacks, FakeImage };
}

test('adapter installs the exact API lazily without creating images or changing unrelated globals', () => {
  const { api, images, callbacks, window } = fixture();
  assert.equal(api.version, '4.0.0'); assert.equal(Object.isFrozen(api), true);
  assert.deepEqual(Object.keys(api).sort(), ['background', 'css', 'load', 'ready', 'retry', 'snapshot', 'version']);
  assert.equal(api.ready(), false); assert.equal(api.snapshot().status, 'idle'); assert.equal(images.length, 0); assert.equal(callbacks.size, 0); assert.equal(window.retainedGlobal.untouched, true);
});
test('mode backgrounds distinguish decision and memory while leaving native and unknown modes alone', () => {
  const { api, images } = fixture();
  assert.equal(api.background('decision'), BASE + 'security-world.png'); assert.equal(api.background('memory'), BASE + 'memory-world.png');
  assert.equal(api.background(' Decision '), BASE + 'security-world.png');
  for (const mode of ['native', 'unknown', '', null, undefined, 123, {}, '__proto__']) assert.equal(api.background(mode), null);
  assert.equal(images.length, 0);
});
test('all 16 reviewed nonuniform rects have exact CSS offsets and preserve transparent PNG styling', () => {
  const { api, images } = fixture(); const positions = new Set();
  KEYS.forEach((key, index) => {
    const css = api.css(key); positions.add(css.backgroundPosition);
    const col = index % 4, row = Math.floor(index / 4), x = COLUMN_EDGES[col], y = ROW_EDGES[row], w = COLUMN_EDGES[col + 1] - x, h = ROW_EDGES[row + 1] - y;
    assert.equal(css.backgroundImage, 'url("' + BASE + 'atlas.png")'); assert.equal(css.backgroundSize, (ATLAS_WIDTH / w * 100) + '% ' + (ATLAS_HEIGHT / h * 100) + '%');
    assert.equal(css.backgroundPosition, (x / (ATLAS_WIDTH - w) * 100) + '% ' + (y / (ATLAS_HEIGHT - h) * 100) + '%');
    assert.deepEqual(plain(api.snapshot().frames[key]), { x, y, w, h });
    assert.equal(css.backgroundColor, 'transparent'); assert.equal(css.backgroundRepeat, 'no-repeat'); assert.equal(css.imageRendering, 'auto');
    assert.ok(!('filter' in css) && !('mixBlendMode' in css) && !('opacity' in css), 'no filter or blend substitutes for alpha');
  });
  assert.equal(positions.size, 16); assert.equal(images.length, 0); assert.deepEqual(plain(api.snapshot().keys), KEYS);
});
test('compatibility aliases resolve to explicit cells and unknown keys cannot inject a URL or inherit object keys', () => {
  const { api } = fixture();
  for (const [alias, key] of Object.entries({ hero: 'guardian', sentinel: 'guardian', star: 'energy', parcel: 'treasure', fire: 'crystal', frost: 'crystal' })) assert.deepEqual(plain(api.css(alias)), plain(api.css(key)));
  assert.deepEqual(plain(api.css('  RUBY ')), plain(api.css('ruby')));
  for (const key of ['not-an-asset', '__proto__', 'constructor', 'toString', 'url(https://elsewhere.test/x)', null, undefined, 3, {}]) assert.equal(api.css(key), null);
});
test('CSS objects and diagnostic snapshots are detached from adapter internals', () => {
  const { api } = fixture(); const style = api.css('guardian'); style.backgroundImage = 'replaced'; assert.notEqual(api.css('guardian').backgroundImage, 'replaced');
  const view = api.snapshot(); view.keys.length = 0; view.aliases.hero = 'ruby'; view.status = 'ready'; view.frames.guardian.h = 1; view.rowEdges[1] = 314; view.atlasSize.height = 10;
  assert.equal(api.snapshot().keys.length, 16); assert.deepEqual(plain(api.css('hero')), plain(api.css('guardian'))); assert.equal(api.ready(), false);
  assert.equal(api.snapshot().frames.guardian.h, 342); assert.equal(api.snapshot().rowEdges[1], 342); assert.equal(api.snapshot().atlasSize.height, ATLAS_HEIGHT);
});
test('parallel preload calls share one image and one promise, including after success', async () => {
  const { api, images, callbacks } = fixture(); const first = api.load(), second = api.load();
  assert.equal(first, second); assert.equal(images.length, 1); assert.equal(images[0].url, BASE + 'atlas.png'); assert.equal(images[0].decoding, 'async');
  assert.equal(api.snapshot().status, 'loading'); assert.equal(api.ready(), false); assert.equal(callbacks.size, 1);
  images[0].succeed(); assert.equal(await first, true); assert.equal(await second, true); assert.equal(api.ready(), true);
  assert.equal(api.load(), first); assert.equal(api.retry(), first); assert.equal(images.length, 1); assert.equal(callbacks.size, 0);
  assert.equal(images[0].onload, null); assert.equal(images[0].onerror, null); assert.equal(api.snapshot().width, ATLAS_WIDTH); assert.equal(api.snapshot().height, ATLAS_HEIGHT);
});
test('failed preload resolves false and stays failed until an explicit deduplicated retry', async () => {
  const { api, images, callbacks } = fixture(); const failed = api.load(); images[0].fail();
  assert.equal(await failed, false); assert.equal(api.ready(), false); assert.equal(api.snapshot().status, 'error'); assert.equal(api.snapshot().error, 'atlas-load-failed'); assert.equal(callbacks.size, 0);
  assert.equal(api.load(), failed); assert.equal(images.length, 1);
  const retry = api.retry(); assert.notEqual(retry, failed); assert.equal(api.retry(), retry); assert.equal(api.load(), retry); assert.equal(images.length, 2);
  images[1].succeed(); assert.equal(await retry, true); assert.equal(api.snapshot().attempts, 2); assert.equal(api.snapshot().error, null); assert.equal(api.snapshot().width, ATLAS_WIDTH);
});
test('zero or non-finite decoded dimensions are failures rather than false-ready assets', async () => {
  for (const dimensions of [[0, 1024], [1024, 0], [NaN, 1024], [Infinity, 1024]]) {
    const { api, images } = fixture(); const promise = api.load(); images[0].succeed(...dimensions);
    assert.equal(await promise, false); assert.equal(api.ready(), false); assert.equal(api.snapshot().error, 'invalid-atlas-dimensions');
  }
});
test('an unexpected atlas dimension is rejected instead of silently applying obsolete pixel rects', async () => {
  for (const dimensions of [[1024, 1024], [1254, 1253], [1536, 1536]]) {
    const { api, images } = fixture(); const promise = api.load(); images[0].succeed(...dimensions);
    assert.equal(await promise, false); assert.equal(api.ready(), false); assert.equal(api.snapshot().error, 'atlas-dimensions-mismatch');
  }
});
test('missing Image is a non-blocking false result and may retry when the capability appears', async () => {
  const { api, window, images, callbacks, FakeImage } = fixture({ hasImage: false }); const result = api.load();
  assert.equal(await result, false); assert.equal(api.load(), result); assert.equal(api.ready(), false); assert.equal(api.snapshot().status, 'unavailable'); assert.equal(api.snapshot().attempts, 0); assert.equal(callbacks.size, 0);
  window.Image = FakeImage; const retry = api.retry(); assert.equal(images.length, 1); images[0].succeed(); assert.equal(await retry, true); assert.equal(api.snapshot().attempts, 1);
});
test('constructor and source assignment exceptions resolve false without rejecting', async () => {
  for (const options of [{ constructionError: true }, { sourceError: true }]) { const { api, callbacks } = fixture(options); assert.equal(await api.load(), false); assert.equal(api.snapshot().status, 'error'); assert.equal(callbacks.size, 0); }
});
test('a stalled request times out, ignores its stale completion, and permits retry', async () => {
  const { api, images, callbacks } = fixture(); const promise = api.load(), oldLoad = images[0].onload;
  [...callbacks.values()][0](); assert.equal(await promise, false); assert.equal(api.snapshot().error, 'atlas-load-timeout'); assert.equal(callbacks.size, 0);
  const retry = api.retry(); images[0].naturalWidth = images[0].naturalHeight = ATLAS_WIDTH; oldLoad(); assert.equal(api.ready(), false); assert.equal(api.snapshot().status, 'loading');
  images[1].succeed(); assert.equal(await retry, true); assert.equal(api.ready(), true);
});
test('environments without timer APIs can preload through image events', async () => {
  const { api, images, callbacks } = fixture({ timers: false }); const promise = api.load(); images[0].succeed(); assert.equal(await promise, true); assert.equal(callbacks.size, 0);
});
test('loading this adapter script twice preserves the active loader and its promise', async () => {
  const { api, sandbox, window, images } = fixture(); const promise = api.load(); vm.runInContext(source, sandbox);
  assert.equal(window.AirvanaServerCasualArtV4, api); assert.equal(window.AirvanaServerCasualArtV4.load(), promise); assert.equal(images.length, 1); images[0].succeed(); assert.equal(await promise, true);
});
test('globalThis fallback remains usable in pure model tests and no legacy art is referenced', async () => {
  const sandbox = {}; vm.createContext(sandbox); vm.runInContext(source, sandbox); const api = sandbox.AirvanaServerCasualArtV4;
  assert.equal(api.version, '4.0.0'); assert.equal(await api.load(), false);
  assert.doesNotMatch(source, /classic-v1|casual-v1|\.svg|fetch\(|getImageData|drawImage|toDataURL|mixBlendMode/);
});

function readAtlasRgba() {
  const png = readFileSync(new URL('../public/assets/games/server-casual-v4/atlas.png', import.meta.url));
  assert.equal(png.subarray(1, 4).toString(), 'PNG'); assert.equal(png.readUInt32BE(16), ATLAS_WIDTH); assert.equal(png.readUInt32BE(20), ATLAS_HEIGHT);
  assert.equal(png[24], 8, '8-bit components'); assert.equal(png[25], 6, 'RGBA rather than an opaque flattened atlas'); assert.equal(png[28], 0, 'non-interlaced rows');
  const chunks = []; for (let p = 8; p < png.length;) { const size = png.readUInt32BE(p), type = png.subarray(p + 4, p + 8).toString(); if (type === 'IDAT') chunks.push(png.subarray(p + 8, p + 8 + size)); p += size + 12; }
  const raw = inflateSync(Buffer.concat(chunks)), stride = ATLAS_WIDTH * 4, rgba = new Uint8Array(stride * ATLAS_HEIGHT);
  const paeth = (a, b, c) => { const p = a + b - c, da = Math.abs(p - a), db = Math.abs(p - b), dc = Math.abs(p - c); return da <= db && da <= dc ? a : db <= dc ? b : c; };
  for (let y = 0; y < ATLAS_HEIGHT; y += 1) { const filter = raw[y * (stride + 1)], start = y * stride; assert.ok(filter <= 4);
    for (let x = 0; x < stride; x += 1) { const a = x >= 4 ? rgba[start + x - 4] : 0, b = y ? rgba[start + x - stride] : 0, c = y && x >= 4 ? rgba[start + x - stride - 4] : 0;
      const predictor = filter === 1 ? a : filter === 2 ? b : filter === 3 ? Math.floor((a + b) / 2) : filter === 4 ? paeth(a, b, c) : 0;
      rgba[start + x] = (raw[y * (stride + 1) + 1 + x] + predictor) & 255;
    }
  }
  return rgba;
}
test('actual PNG retains alpha and reviewed first-row rects contain complete character feet beyond the old quarter line', () => {
  const { api } = fixture(), rgba = readAtlasRgba(), view = api.snapshot();
  assert.deepEqual(plain(view.atlasSize), { width: ATLAS_WIDTH, height: ATLAS_HEIGHT }); assert.deepEqual(plain(view.rowEdges), ROW_EDGES); assert.deepEqual(plain(view.columnEdges), COLUMN_EDGES);
  const alpha = (x, y) => rgba[(y * ATLAS_WIDTH + x) * 4 + 3]; let transparent = 0;
  for (let index = 3; index < rgba.length; index += 4) if (rgba[index] === 0) transparent += 1;
  assert.ok(transparent > ATLAS_WIDTH * ATLAS_HEIGHT * .2, 'source atlas contains substantial real transparency');
  for (const key of ['guardian', 'raider']) {
    const rect = view.frames[key]; let belowOldEdge = 0, bottom = -1, lastRowOpaque = 0;
    for (let y = rect.y; y < rect.y + rect.h; y += 1) for (let x = rect.x; x < rect.x + rect.w; x += 1) if (alpha(x, y) >= 64) { bottom = Math.max(bottom, y); if (y >= 314) belowOldEdge += 1; if (y === rect.y + rect.h - 1) lastRowOpaque += 1; }
    assert.ok(belowOldEdge > 40, key + ' has visible feet below the obsolete 313.5px row boundary');
    assert.ok(bottom < rect.y + rect.h - 1, key + ' has transparent safety space below the complete feet'); assert.equal(lastRowOpaque, 0, key + ' is not cut by the new bottom edge');
  }
});
