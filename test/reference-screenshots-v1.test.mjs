import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import Matter from 'matter-js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const bytes = path => readFileSync(new URL('../' + path, import.meta.url));
const source = read('public/reference-screenshots-v1.js');
const indexSource = read('public/index.html');
const keys = ['sky-raid', 'harvest-lane', 'island-sling', 'pocket-city', 'gem-blocks', 'dice-voyage', 'cloud-solitaire', 'buddy-flip'];
const ids = keys.map((_, index) => 111 + index);
const plain = value => JSON.parse(JSON.stringify(value));
const sha256 = value => createHash('sha256').update(value).digest('hex');

class Element {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase(); this.children = []; this.dataset = {}; this.style = {}; this.attributes = {}; this.listeners = new Map();
    this.clientWidth = 300; this.clientHeight = 500; this.isConnected = true;
    const classes = new Set();
    this.classList = { toggle(name, state) { if (state) classes.add(name); else classes.delete(name); }, contains: name => classes.has(name) };
  }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = [...children]; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  hasAttribute(name) { return Object.hasOwn(this.attributes, name); }
  addEventListener(type, listener) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(listener); }
  dispatch(type, event) { for (const listener of this.listeners.get(type) || []) listener(event); }
}
function setup() {
  const observers = [], definitions = new Map();
  class ResizeObserver {
    constructor(callback) { this.callback = callback; this.disconnected = false; observers.push(this); }
    observe(target) { this.target = target; }
    disconnect() { this.disconnected = true; }
  }
  const window = {
    document: { createElement: tag => new Element(tag) }, HTMLElement: Element, ResizeObserver,
    customElements: { get: name => definitions.get(name), define: (name, ctor) => definitions.set(name, ctor) }
  };
  vm.runInNewContext(source, { window });
  return { window, references: window.AirvanaScreenshotReferences, observers, definitions };
}
function indexMethod(name, nextName, globals = {}) {
  const start = indexSource.indexOf('\n  ' + name + '('), end = indexSource.indexOf('\n  ' + nextName + '(', start);
  assert.ok(start >= 0 && end > start, name + ' exists');
  return vm.runInNewContext('({' + indexSource.slice(start, end).trim() + '})', globals)[name];
}

test('eight screenshot categories map exactly to existing game ids and return defensive copies', () => {
  const { references } = setup();
  assert.deepEqual(plain(references.list().map(item => item.key)), keys);
  assert.deepEqual(plain(references.list().map(item => item.id)), ids);
  for (let i = 0; i < keys.length; i++) {
    assert.deepEqual(plain(references.get(keys[i])), plain(references.get(ids[i])));
    assert.deepEqual(plain(references.get(String(ids[i]))), plain(references.get(ids[i])));
  }
  const copy = references.get(111); copy.images[0].src = 'changed'; copy.images[0].crop[0] = 0.9;
  assert.notEqual(references.get(111).images[0].src, 'changed');
  assert.equal(references.get(111).images[0].crop[0], 0);
  assert.equal(references.get('unknown'), null);
  assert.equal(references.get(999), null);
});

test('all nine source JPEGs have bounded crops and match the local-only provenance manifest', () => {
  const { references } = setup();
  const images = references.list().flatMap(item => item.images);
  const manifest = JSON.parse(read('public/assets/games/reference-screenshots-v1/manifest.json'));
  assert.equal(images.length, 9); assert.equal(new Set(images.map(image => image.src)).size, 9);
  assert.equal(manifest.assets.length, 9); assert.equal(manifest.release, 'LOCAL_PREVIEW_ONLY');
  for (const image of images) {
    const [x, y, width, height] = image.crop;
    assert.ok([x, y, width, height].every(Number.isFinite));
    assert.ok(x >= 0 && y >= 0 && width > 0 && height > 0 && x + width <= 1 && y + height <= 1, image.src);
    const asset = manifest.assets.find(asset => image.src.endsWith('/' + asset.file));
    assert.ok(asset, image.src + ' has provenance');
    const data = bytes('public' + image.src);
    assert.equal(data.readUInt16BE(0), 0xffd8, image.src + ' is an unchanged JPEG');
    assert.equal(data.length, asset.bytes); assert.equal(sha256(data), asset.sha256);
    assert.equal(image.width, asset.width); assert.equal(image.height, asset.height);
    assert.match(asset.processing, /byte-for-byte original/);
    assert.match(asset.authorization_status, /commercial IP authorization not verified/);
  }
});

test('local original uploads, when available, are byte-identical to all copied display assets', t => {
  const manifest = JSON.parse(read('public/assets/games/reference-screenshots-v1/manifest.json'));
  let verified = 0;
  for (const asset of manifest.assets) {
    const original = '/var/folders/2b/ynzvsrxj3y35t269xzsm7hj80000gn/T/' + asset.source_basename;
    if (!existsSync(original)) continue; // Original upload temp files are not required in CI.
    assert.equal(sha256(readFileSync(original)), asset.sha256, asset.file + ' preserves original bytes');
    verified++;
  }
  t.diagnostic('Original upload hashes verified: ' + verified + '/9; manifest hashes are always checked.');
});

test('frame layout preserves image aspect ratio, crop/full switch and resize/error lifecycle', () => {
  const { references, observers } = setup();
  const frame = references.createFrame('harvest-lane');
  const crop = frame.children[0], image = crop.children[0], selected = references.get('harvest-lane').images[0];
  assert.equal(image.src, selected.src); assert.equal(image.draggable, false);
  assert.equal(image.style.width, 100 / selected.crop[2] + '%');
  assert.equal(image.style.left, -100 * selected.crop[0] / selected.crop[2] + '%');
  assert.equal(image.style.top, -100 * selected.crop[1] / selected.crop[3] + '%');
  assert.equal(Number.parseFloat(crop.style.width) / Number.parseFloat(crop.style.height), Number(frame.style.aspectRatio));
  image.onerror(); assert.equal(frame.dataset.loadError, 'true');
  references.applyFrame(frame, 'island-sling', 99, { full: true, fit: 'cover' });
  assert.equal(observers[0].disconnected, true); assert.equal(image.onload, null); assert.equal(image.onerror, null);
  assert.equal(frame.dataset.imageIndex, '1'); assert.equal(frame.dataset.loadError, undefined);
  const fullImage = frame.children[0].children[0];
  assert.equal(fullImage.style.width, '100%'); assert.equal(fullImage.style.left, '0%'); assert.equal(fullImage.style.top, '0%');
  assert.equal(Number(frame.style.aspectRatio), selected.width / selected.height);
  frame.clientWidth = 420; frame.clientHeight = 680; observers[1].callback();
  assert.ok(Number.parseFloat(frame.children[0].style.width) >= frame.clientWidth);
  frame.dispose(); assert.equal(observers[1].disconnected, true);
  assert.throws(() => references.createFrame('missing'), /Unknown screenshot reference/);
});

test('compact and full custom elements distinguish static source display from optional prior gameplay', () => {
  const { definitions, observers } = setup(), Shot = definitions.get('airvana-reference-shot');
  const compact = new Shot(); compact.setAttribute('game-key', 'gem-blocks'); compact.setAttribute('compact', ''); compact.connectedCallback();
  assert.equal(compact.children.length, 1); assert.equal(compact.classList.contains('is-compact'), true);
  const full = new Shot(); full.setAttribute('game-key', 'island-sling'); full.connectedCallback();
  const controls = full.children[1], [note, original, play, next] = controls.children;
  assert.equal(note.textContent, '原图展示 · 静态'); assert.match(original.href, /reference-screenshots\.html\?game=island-sling&full=1/);
  assert.equal(play.textContent, '上一版互动'); assert.match(play.getAttribute('aria-label'), /非截图复刻/);
  assert.equal(play.tagName, 'A'); assert.equal(play.href, '/reference-arcade.html?game=island-sling'); assert.equal(play.onclick, undefined);
  for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
    let stopped = 0;
    const event = { stopPropagation() { stopped++; }, preventDefault() { throw Error('Native anchor navigation must remain available'); } };
    controls.dispatch(type, event); assert.equal(stopped, 1, type + ' is isolated from feed pointer capture');
    full.frame.dispatch(type, event); full.frame.children[0].dispatch(type, event); full.frame.children[0].children[0].dispatch(type, event);
    assert.equal(stopped, 1, type + ' remains unblocked on the image so the feed can swipe');
  }
  next.onclick({ stopPropagation() {} }); assert.equal(full.frame.dataset.imageIndex, '1');
  assert.equal(next.textContent, '切换图片 2/2');
  full.disconnectedCallback(); assert.equal(observers.at(-1).disconnected, true);
});

test('home hides the entire screenshot toolbar for all eight images without disabling feed swipes or changing sources', () => {
  const { references, definitions } = setup(), Shot = definitions.get('airvana-reference-shot');
  assert.ok(Shot.observedAttributes.includes('hide-controls'));
  assert.match(indexSource, /<airvana-reference-shot game-key="\{\{ ss\.screenshotKey \}\}" hide-controls(?:\s|>)/);
  for (const key of keys) {
    const item = references.get(key), before = plain(item.images);
    const home = new Shot(); home.setAttribute('game-key', key); home.setAttribute('hide-controls', ''); home.connectedCallback();
    assert.equal(home.children.length, 1, key + ' only renders its image frame');
    assert.equal(home.children[0], home.frame);
    assert.equal(home.classList.contains('is-compact'), false, key + ' does not use the pointer-blocking compact class');
    const crop = home.frame.children[0], image = crop.children[0];
    assert.equal(image.tagName, 'IMG'); assert.equal(image.src, item.images[0].src);
    assert.deepEqual(plain(references.get(key).images), before, key + ' original sources and crops remain unchanged');
    for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
      const event = { stopPropagation() { throw Error('Image-only home must preserve feed swipes'); }, preventDefault() { throw Error('Image-only home must not block native events'); } };
      for (const node of [home, home.frame, crop, image]) node.dispatch(type, event);
    }
    const gallery = new Shot(); gallery.setAttribute('game-key', key); gallery.connectedCallback();
    assert.equal(gallery.children.length, 2, key + ' retains its controls outside the home display');
    assert.equal(gallery.children[1].className, 'reference-shot-controls');
    home.disconnectedCallback(); gallery.disconnectedCallback();
  }
});

test('App opens every screenshot without starting gameplay, events, rewards or audio, while replay keeps prototype path', () => {
  const { window } = setup();
  const start = indexMethod('startFeedMiniGame', 'disposeDeepFeedMiniGame', { window });
  for (const id of ids) {
    const calls = [], forbidden = () => { throw Error('Static display must not start gameplay or commercial work'); };
    const app = {
      getFeedMiniGameDefinition: () => ({ type: 'deep' }), emptyFeedMiniGameState: () => ({ status: 'idle', score: 0 }),
      stopFeedMusic: () => calls.push('stop'), disposeDeepFeedMiniGame: () => calls.push('dispose'),
      setState: state => { app.state = state; }, beginLocalGameRun: forbidden, mountDeepFeedMiniGame: forbidden,
      startFeedMusic: forbidden, playFeedTone: forbidden, recordFeedMiniGameEvent: forbidden,
      startDeepFeedMiniGame: forbidden, localApi: new Proxy({}, { get: forbidden })
    };
    start.call(app, id, false);
    assert.deepEqual(calls, ['stop', 'dispose']);
    assert.equal(app.state.feedMiniGame.contentId, id); assert.equal(app.state.feedMiniGame.status, 'reference');
    assert.equal(app.state.feedMiniGameDismissedContentId, null);
    app.startDeepFeedMiniGame = (contentId, replay) => calls.push([contentId, replay]);
    start.call(app, id, true); assert.deepEqual(calls.at(-1), [id, true]);
  }
});

test('App home, discovery and detail use screenshot elements, suppress old covers and label the static boundary', () => {
  assert.match(indexSource, /<airvana-reference-shot game-key="\{\{ ss\.screenshotKey \}\}"/);
  assert.match(indexSource, /<airvana-reference-shot game-key="\{\{ it\.referenceKey \}\}" compact/);
  assert.match(indexSource, /<airvana-reference-shot game-key="\{\{ detailReferenceKey \}\}" compact/);
  assert.match(indexSource, /hasCover:Boolean\(x\.cover\)&&!x\.referenceKey/);
  assert.match(indexSource, /hasCover:Boolean\(item\.cover\)&&!item\.referenceKey/);
  assert.match(indexSource, /detailHasCover:!!detailContent\.cover&&!detailContent\.referenceKey/);
  assert.match(indexSource, /contentCaption:x\.referenceKey\?'用户提供原图 · 静态展示'/);
  assert.match(indexSource, /detailPrimaryActionLabel:detailContent\.referenceKey\?'查看原图'/);
  assert.match(indexSource, /非可玩复刻/);
  const css = read('public/reference-screenshots-v1.css');
  assert.match(css, /filter:none!important;opacity:1!important;transform:none!important/);
  assert.match(css, /\.playable-detail-hero\.is-reference>\.playable-detail-hero__content\{display:none\}/);
  const begin = indexSource.indexOf('    const buildFeedMiniGameView = content => {'), end = indexSource.indexOf('    const running =', begin);
  assert.ok(begin >= 0 && end > begin);
  for (const status of ['idle', 'reference']) {
    const app = { getFeedMiniGameDefinition: () => ({ type: 'deep' }), emptyFeedMiniGameState: () => ({ status: 'idle' }), startDeepFeedMiniGame() { throw Error('Rendering must not start'); } };
    const build = new Function('s', indexSource.slice(begin, end) + '\nreturn buildFeedMiniGameView;').call(app, { feedMiniGame: { contentId: 111, status } });
    const view = build({ id: 111, referenceKey: 'sky-raid' });
    assert.equal(view.hasScreenshot, true); assert.equal(view.hasMiniGame, false); assert.equal(view.hasMiniGameLauncher, false);
    view.onScreenshotPlay({ stopPropagation() {}, target: { closest: () => null } });
  }
});

test('all eight prior playable models remain registered and available from the separate interactive page', () => {
  const window = { Matter }, sandbox = { window, Matter };
  for (const file of ['reference-action-v1.js', 'reference-worlds-v1.js', 'reference-puzzles-v1.js', 'physics-arcade-v1.js', 'reference-arcade-v1.js']) {
    vm.runInNewContext(read('public/' + file), sandbox);
    assert.match(read('public/reference-arcade.html'), new RegExp(file.replaceAll('.', '\\.')));
  }
  for (const key of keys) {
    assert.equal(typeof window.AirvanaPhysicsModes[key], 'function');
    assert.equal(window.AirvanaPhysicsGames.has(key), true);
    assert.equal(window.AirvanaReferenceGames.list().find(item => item.key === key).stages, 3);
  }
  assert.doesNotMatch(source, /\bfetch\s*\(|new\s+Audio\b|requestAnimationFrame|play_complete|play_start|AirvanaPhysicsGames\.mount/);
  assert.match(read('public/reference-screenshots-page-v1.js'), /\/reference-arcade\.html\?game=/);
});
