import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import Matter from 'matter-js';

const read = file => readFileSync(new URL('../public/' + file, import.meta.url), 'utf8');
const source = read('physics-art-v2.js');
const keys = ['cloud-sling', 'candy-swing', 'happy-cup', 'spring-dig', 'fruit-drop'];
const spriteNames = ['sling-ball', 'target', 'candy', 'buddy', 'wood', 'glass', 'stone', 'star', 'cherry', 'apricot', 'orange', 'apple', 'blueberry', 'peach', 'melon', 'watermelon'];
const rows = [[0, 323], [330, 594], [594, 900], [900, 1254]], cols = [[0, 314], [314, 633], [633, 956], [956, 1254]];
const plain = value => JSON.parse(JSON.stringify(value));

function drawingContext() {
  const calls = [], gradient = { addColorStop() {} };
  const ctx = new Proxy({}, {
    get(target, name) {
      if (name in target) return target[name];
      if (name === 'createLinearGradient' || name === 'createRadialGradient') return () => gradient;
      return (...args) => calls.push([name, ...args]);
    },
    set(target, name, value) { target[name] = value; return true; }
  });
  return { ctx, calls };
}
function setup({ imageAvailable = true, readback = true } = {}) {
  const images = [], reads = [], pixels = new Uint8ClampedArray(1254 * 1254 * 4);
  for (let i = 0; i < spriteNames.length; i++) {
    const [sx, ex] = cols[i % 4], [sy, ey] = rows[Math.floor(i / 4)];
    pixels[((sy + 7) * 1254 + sx + 5) * 4 + 3] = 255;
    pixels[((ey - 12) * 1254 + ex - 10) * 4 + 3] = 255;
  }
  class Image {
    constructor() { images.push(this); this.naturalWidth = 1254; this.naturalHeight = 1254; }
    load() { this.onload(); }
    fail() { this.onerror(); }
  }
  const window = {
    document: { createElement(tag) {
      assert.equal(tag, 'canvas');
      return { width: 0, height: 0, getContext() { return {
        drawImage() {},
        getImageData(...args) { reads.push(args); if (!readback) throw Error('Readback unavailable'); return { data: pixels }; }
      }; } };
    } },
    ...(imageAvailable ? { Image } : {})
  };
  vm.runInNewContext(source, { window, fetch() { throw Error('No external requests'); } });
  return { window, art: window.AirvanaPhysicsArt, images, reads };
}

test('casual art initialization is lazy and preloads only the requested local scene plus a shared atlas', () => {
  const { art, images } = setup();
  assert.equal(art.version, '2.0.0'); assert.deepEqual(plain(art.keys()), keys);
  assert.equal(images.length, 0); assert.deepEqual(plain(art.status()), {});
  art.preload('cloud-sling'); assert.equal(images.length, 2);
  art.preload('cloud-sling'); art.preload('candy-swing'); assert.equal(images.length, 3);
  assert.deepEqual(images.map(image => image.src), ['/assets/games/physics-casual-v2/cloud-sling.png', '/assets/games/physics-casual-v2/atlas.png', '/assets/games/physics-casual-v2/candy-swing.png']);
  assert.ok(images.every(image => image.decoding === 'async'));
  assert.equal(art.status()['cloud-sling'], 'loading'); assert.equal(art.status().atlas, 'loading');
  art.keys().push('external'); assert.deepEqual(plain(art.keys()), keys);
});

test('unknown scene and sprite keys never create resources or external URLs', () => {
  const { art, images } = setup(), { ctx, calls } = drawingContext();
  for (const key of ['unknown', '../secret', 'https://example.com/image.png', '', null]) {
    assert.equal(art.background(ctx, key), false); assert.equal(art.sprite(ctx, key, 0, 0, 30, 30), false);
    art.preload(key);
  }
  assert.equal(images.length, 0); assert.equal(calls.length, 0);
  assert.doesNotMatch(source, /\bfetch\s*\(|XMLHttpRequest|WebSocket|https?:\/\//);
});

test('missing Image support and failed assets return false without throwing or repeated allocations', () => {
  const unavailable = setup({ imageAvailable: false }), { ctx, calls } = drawingContext();
  unavailable.art.preload('happy-cup');
  assert.equal(unavailable.art.background(ctx, 'happy-cup'), false);
  assert.equal(unavailable.art.sprite(ctx, 'star', 20, 20, 30, 30), false);
  assert.equal(unavailable.art.status()['happy-cup'], 'unavailable'); assert.equal(unavailable.art.status().atlas, 'unavailable');
  const failed = setup(); failed.art.preload('happy-cup'); failed.images.forEach(image => image.fail());
  assert.equal(failed.art.background(ctx, 'happy-cup'), false); assert.equal(failed.art.sprite(ctx, 'star', 0, 0, 30, 30), false);
  failed.art.preload('happy-cup'); assert.equal(failed.images.length, 2);
  assert.equal(failed.art.status()['happy-cup'], 'error'); assert.equal(failed.art.status().atlas, 'error');
  assert.equal(calls.length, 0);
});

test('loaded scenes draw local pixels at requested bounds and never alter simulation state', () => {
  const { art, images } = setup(), { ctx, calls } = drawingContext();
  for (const key of keys) {
    assert.equal(art.background(ctx, key, 1, 2, 300, 500), false);
    const image = images.at(-1); image.load();
    assert.equal(art.background(ctx, key, 1, 2, 300, 500), true);
    assert.deepEqual(calls.at(-1), ['drawImage', image, 1, 2, 300, 500]);
    assert.equal(art.status()[key], 'ready');
  }
  assert.equal(images.length, 5);
});

test('atlas alpha bounds are measured once and every sprite preserves rotation and valid source rectangles', () => {
  const { art, images, reads } = setup(), { ctx, calls } = drawingContext();
  assert.equal(art.sprite(ctx, 'target', 100, 200, 60, 100, 0.3), false);
  images[0].load(); assert.equal(reads.length, 1);
  for (let i = 0; i < spriteNames.length; i++) {
    const name = spriteNames[i], [sx, ex] = cols[i % 4], [sy, ey] = rows[Math.floor(i / 4)];
    assert.equal(art.sprite(ctx, name, 100, 200, 60, 100, 0.3), true);
    const draw = calls.filter(call => call[0] === 'drawImage').at(-1);
    assert.deepEqual(draw.slice(2, 6), [sx + 5, sy + 7, ex - sx - 14, ey - sy - 18]);
    assert.ok(draw.slice(2).every(Number.isFinite)); assert.ok(draw[2] + draw[4] <= 1254 && draw[3] + draw[5] <= 1254);
    if (name === 'wood' || name === 'glass') assert.deepEqual(draw.slice(-2), [60, 100]);
    else assert.ok(Math.abs(draw.at(-2) / draw.at(-1) - draw[4] / draw[5]) < 1e-10);
    assert.deepEqual(calls.at(-3), ['rotate', 0.3]); assert.deepEqual(calls.at(-1), ['restore']);
  }
  assert.equal(reads.length, 1); assert.equal(images.length, 1);
});

test('atlas readback failure uses deterministic cell bounds and remains drawable', () => {
  const { art, images } = setup({ readback: false }), { ctx, calls } = drawingContext();
  art.preload('fruit-drop'); images.find(image => image.src.endsWith('/atlas.png')).load();
  assert.equal(art.sprite(ctx, 'watermelon', 180, 300, 90, 90), true);
  const actual = calls.find(call => call[0] === 'drawImage').slice(2, 6);
  [956, 900, 298, 354].forEach((expected, i) => assert.ok(Math.abs(actual[i] - expected) < 1e-9));
});

test('all five models draw loaded art without changing snapshots; unavailable art retains the code fallback', () => {
  const artCalls = [], window = { Matter, AirvanaPhysicsArt: {
    background(...args) { artCalls.push(['background', ...args.slice(1)]); return true; },
    sprite(...args) { artCalls.push(['sprite', ...args.slice(1)]); return true; }
  } }, sandbox = { window, Matter };
  for (const file of ['physics-sling-rope-v1.js', 'physics-water-v1.js', 'physics-fruit-v1.js']) vm.runInNewContext(read(file), sandbox);
  const { ctx } = drawingContext();
  for (const key of keys) for (let level = 1; level <= 5; level++) {
    const model = new window.AirvanaPhysicsModes[key]({ level }), before = JSON.stringify(model.snapshot());
    const start = artCalls.length; model.draw(ctx);
    assert.equal(JSON.stringify(model.snapshot()), before, key + ' level ' + level + ' is render-only');
    assert.ok(artCalls.slice(start).some(call => call[0] === 'background' && call[1] === key));
    const previousArt = window.AirvanaPhysicsArt; delete window.AirvanaPhysicsArt;
    assert.doesNotThrow(() => model.draw(ctx)); assert.equal(JSON.stringify(model.snapshot()), before);
    window.AirvanaPhysicsArt = previousArt; model.destroy?.();
  }
  assert.ok(artCalls.some(call => call[0] === 'sprite'));
});

test('six generated PNG files are local high-resolution assets and all HTML consumers load the lazy art module', () => {
  for (const key of [...keys, 'atlas']) {
    const png = readFileSync(new URL('../public/assets/games/physics-casual-v2/' + key + '.png', import.meta.url));
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
    assert.ok(width >= 512 && height >= 512);
    if (key === 'atlas') { assert.equal(width, 1254); assert.equal(height, 1254); assert.equal(png[25], 6, 'atlas carries RGBA alpha'); }
  }
  for (const file of ['index.html', 'physics-arcade.html', 'reference-arcade.html']) {
    const html = read(file), loader = html.indexOf('physics-art-v2.js'), host = html.indexOf('physics-arcade-v1.js');
    assert.ok(loader >= 0 && loader < host, file + ' loads the art API before its host');
  }
});
