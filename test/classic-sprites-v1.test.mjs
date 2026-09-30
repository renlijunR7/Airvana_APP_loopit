import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const spriteRoot = path.join(root, 'public/assets/games/classic-v1/sprites');
const mirrorRoot = path.join(root, 'apps/airvana_mobile/assets/runner/assets/games/classic-v1/sprites');
// Classic vectors now serve the active web and mobile gameplay paths.
const source = readFileSync(path.join(root, 'public/playable-assets-v3.js'), 'utf8');
const manifest = JSON.parse(readFileSync(path.join(spriteRoot, 'manifest.json'), 'utf8'));

function runtime({missing = null, script = 'http://127.0.0.1:8082/playable-assets-v3.js?v=5.1.0'} = {}) {
  const requests = [];
  const blocked = new Set(missing ? [missing] : []);
  class LocalImage {
    set src(value) {
      this.url = value;
      const name = path.basename(new URL(value).pathname);
      requests.push(name);
      if (blocked.has(name)) { this.complete = true; this.naturalWidth = 0; this.onerror?.(); return; }
      const svg = readFileSync(path.join(spriteRoot, name), 'utf8');
      assert.match(svg, /viewBox="0 0 64 64"/);
      this.naturalWidth = 64; this.naturalHeight = 64; this.complete = true; this.onload?.();
    }
  }
  const window = {Image: LocalImage, document: {currentScript: {src: script}}};
  vm.runInNewContext(source, {window, globalThis: window, URL, Promise, Math, Object, Number});
  return {assets: window.AirvanaPlayableAssetsV3, requests, blocked};
}

test('all 64 classic sprite sources are original flat SVG objects with valid recorded checksums and identical Flutter copies', () => {
  assert.equal(manifest.assets.length, 64);
  assert.equal(manifest.pack, 'classic-v1');
  const files = readdirSync(spriteRoot).filter(name => name.endsWith('.svg')).sort();
  assert.deepEqual(files, manifest.assets.map(asset => asset.file).sort());
  for (const asset of manifest.assets) {
    const bytes = readFileSync(path.join(spriteRoot, asset.file));
    const svg = bytes.toString();
    assert.equal(bytes.length, asset.bytes, asset.file);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256, asset.file);
    assert.equal(svg, readFileSync(path.join(mirrorRoot, asset.file), 'utf8'), asset.file);
    assert.match(svg, /xmlns="http:\/\/www.w3.org\/2000\/svg"/, asset.file);
    assert.match(svg, /viewBox="0 0 64 64"/, asset.file);
    assert.ok((svg.match(/<(?:path|rect|circle|ellipse|polygon)\b/g) || []).length >= 2, asset.file);
    assert.doesNotMatch(svg, /<(?:linearGradient|radialGradient|filter|image|text|script|foreignObject)\b|href=|data:image|playables-v3|fidelity-v2/i, asset.file);
  }
  assert.equal(readFileSync(path.join(root, 'public/playable-assets-v3.js'), 'utf8'), readFileSync(path.join(root, 'apps/airvana_mobile/assets/runner/playable-assets-v3.js'), 'utf8'));
  assert.doesNotMatch(source, /atlas-v3\.png|fidelity-v2|playables-v3\/runtime/);
});

test('classic runtime loads 64 standalone SVGs and preserves all 38 game mappings and Canvas/DOM drawing contracts', async () => {
  const {assets, requests} = runtime();
  assert.equal(await assets.load(), true);
  assert.equal(assets.version, '5.1.0');
  assert.equal(assets.pack, 'classic-v1');
  assert.equal(assets.ready(), true);
  assert.equal(requests.length, 64);
  assert.equal(new Set(requests).size, 64);
  assert.equal(assets.keys().length, 64);
  assert.equal(assets.games().length, 38);
  for (const game of assets.games()) assert.ok(assets.forGame(game).length > 0, game);
  const draws = [];
  const context = {globalAlpha: 1, save() {}, restore() {}, translate() {}, rotate() {}, scale() {}, drawImage(...args) { draws.push(args); }};
  for (const key of assets.keys()) {
    const frame = assets.get(key);
    assert.equal(frame.format, 'svg');
    assert.ok(frame.src.endsWith('/'+key+'.svg'));
    assert.equal(assets.css(key).backgroundSize, 'contain');
    assert.equal(assets.css(key).backgroundPosition, 'center');
    assert.equal(assets.draw(context, key, {x: 10, y: 20, w: 80, h: 90}, {alpha: 0.75, rotation: 0.2, flipX: true}), true, key);
  }
  assert.equal(draws.length, 64);
  for (const [,sx,sy,sw,sh,dx,dy,dw,dh] of draws) {
    assert.deepEqual([sx,sy,sw,sh], [0,0,64,64]);
    assert.equal(dw, 80); assert.equal(dh, 80);
    assert.equal(dx, -40); assert.equal(dy, -40);
  }
  assert.equal(Object.values(assets.snapshot().drawCounts).reduce((n, count) => n + count, 0), 64);
  assert.equal(assets.draw(context, 'not-a-sprite', {x:0,y:0,w:10,h:10}), false);
  assert.equal(assets.draw(context, 'hero', {x:0,y:0,w:0,h:10}), false);
});

test('asset errors remain visible and retry only the missing classic source without loading prior generated artwork', async () => {
  const {assets, requests, blocked} = runtime({missing:'hero.svg'});
  assert.equal(await assets.load(), false);
  assert.equal(assets.ready(), false);
  assert.match(assets.snapshot().errors.hero, /classic game sprite/);
  blocked.clear();
  assert.equal(await assets.retry(), true);
  assert.equal(assets.ready(), true);
  assert.equal(Object.keys(assets.snapshot().errors).length, 0);
  assert.equal(requests.length, 65);
  assert.ok(requests.every(name => name.endsWith('.svg')));
});

test('Flutter file-scheme script resolves relative classic assets and missing Image APIs fail safely', async () => {
  const {assets} = runtime({script:'file:///android_asset/flutter_assets/assets/runner/playable-assets-v3.js'});
  assert.equal(await assets.load(), true);
  assert.equal(assets.get('tea').src, 'file:///android_asset/flutter_assets/assets/runner/assets/games/classic-v1/sprites/tea.svg');
  const window = {};
  vm.runInNewContext(source, {window, globalThis: window, URL, Promise, Math, Object, Number});
  assert.equal(await window.AirvanaPlayableAssetsV3.load(), false);
  assert.equal(window.AirvanaPlayableAssetsV3.ready(), false);
});
