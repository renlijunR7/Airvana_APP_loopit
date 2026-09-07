import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {pathToFileURL} from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
await import(`${pathToFileURL(path.join(root, 'public/game-art-system-v1.js')).href}?test=1.0.0`);

test('global art registry covers all 38 local games', () => {
  const registry = globalThis.AirvanaGameArtV1;
  assert.ok(registry);
  assert.equal(registry.version, '6.0.0');
  assert.equal(registry.status, 'LOCAL_DEMO');
  assert.equal(registry.gameCount, 38);
  assert.equal(registry.list().length, 38);
  assert.equal(new Set(registry.list().map(item => item.gameKey)).size, 38);
});

test('every profile resolves to existing art and valid atlas cells', () => {
  const registry = globalThis.AirvanaGameArtV1;
  registry.list().forEach(profile => {
    assert.ok(profile.background.startsWith('/assets/'));
    assert.equal(profile.assetPack, 'classic-v1');
    assert.equal(profile.gameplayAssetPack, 'classic-v1');
    assert.match(profile.background, /^\/assets\/games\/classic-v1\/scenes\/[a-z0-9-]+\.svg$/);
    assert.ok(fs.existsSync(path.join(root, 'public', profile.background)));
    assert.equal(profile.backgroundKind, 'classic-game-scene');
    assert.equal(profile.artStyle, 'classic-flat-2d');
    [profile.emblem, profile.material].forEach(atlas => {
      assert.ok(fs.existsSync(path.join(root, 'public', atlas.src)));
      assert.equal(atlas.columns, 1);
      assert.equal(atlas.rows, 1);
      assert.ok(atlas.index >= 0 && atlas.index < 12);
    });
    assert.ok(fs.existsSync(path.join(root, 'public', profile.sprite.src)));
    assert.equal(profile.sprite.columns, 1);
    assert.equal(profile.sprite.rows, 1);
    assert.equal(profile.sprite.source, 'ORIGINAL_CODE_NATIVE_VECTOR');
    assert.equal(profile.authorization, 'LOCAL_DEMO');
  });
});

test('entrypoint loads registry before game runtime is used', () => {
  const entry = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  assert.match(entry, /game-art-system-v1\.js\?v=6\.0\.0/);
  assert.match(entry, /playable-assets-v3\.js\?v=[\d.]+/);
  assert.match(entry, /complete-games-v3\.js\?v=4\.2\.0/);
  assert.match(entry, /deep-games-v2\.js\?v=3\.2\.0/);
  assert.ok(entry.indexOf('game-art-system-v1.js') < entry.indexOf('deep-games-v2.js'));
  assert.ok(entry.indexOf('playable-assets-v3.js') < entry.indexOf('deep-games-v2.js'));
  assert.ok(entry.indexOf('playable-assets-v3.js') < entry.indexOf('complete-games-v3.js'));
});

test('visual QA catalog is wired to the same 38-game registry', () => {
  const preview = fs.readFileSync(path.join(root, 'public/game-art-system-preview.html'), 'utf8');
  const script = fs.readFileSync(path.join(root, 'public/game-art-system-preview.js'), 'utf8');
  const style = fs.readFileSync(path.join(root, 'public/game-art-system-preview.css'), 'utf8');
  assert.match(preview, /game-art-system-v1\.js\?v=6\.0\.0/);
  assert.match(preview, /playable-assets-v3\.js\?v=[\d.]+/);
  assert.match(preview, /complete-games-v3\.js\?v=4\.2\.0/);
  assert.match(preview, /deep-games-v2\.js\?v=3\.2\.0/);
  assert.match(preview, /game-art-system-preview\.js\?v=3\.0\.0/);
  assert.match(script, /registry\.list\(\)/);
  assert.match(script, /profile\.background/);
  assert.match(script, /profile\.emblem\.src/);
  assert.doesNotMatch(style, /global-art-v1|fidelity-v2|drop-shadow|blur\(/);
  assert.match(script, /window\.AirvanaCompleteGames/);
  assert.match(script, /window\.AirvanaDeepGames/);
});

test('browser runtime QA page mounts the same 38-game registry', () => {
  const page = fs.readFileSync(path.join(root, 'public/game-art-runtime-validation.html'), 'utf8');
  const script = fs.readFileSync(path.join(root, 'public/game-art-runtime-validation.js'), 'utf8');
  assert.match(page, /game-art-runtime-validation\.js\?v=5\.0\.0/);
  assert.match(page, /playable-assets-v3\.js\?v=[\d.]+/);
  assert.match(script, /await preloadArt\(\)/);
  assert.match(script, /await sprites\.load\(\)/);
  assert.match(script, /sprites\.keys\(\)\.length !== 64/);
  assert.match(script, /drawsAfter <= drawsBefore/);
  assert.match(script, /no actual gameplay sprite drawn/);
  assert.match(script, /waitForRuntimeReady/);
  assert.match(script, /incomplete gameplay state contract/);
  assert.match(script, /waitForVisiblePixels/);
  assert.match(script, /for \(const profile of registry\.list\(\)\)/);
  assert.match(script, /runtime\.mount\(canvas, profile\.gameKey/);
  assert.match(script, /__AIRVANA_GAME_ART_VALIDATION__/);
});

test('64 active gameplay frames load from standalone original SVG sprites and produce counted object draw calls', async () => {
  const source = fs.readFileSync(path.join(root, 'public/playable-assets-v3.js'), 'utf8');
  const loadedFiles = new Set();
  class LocalImage {
    set src(value) {
      const file = path.join(root, 'public', value);
      const svg = fs.readFileSync(file, 'utf8');
      assert.match(value, /^\/assets\/games\/classic-v1\/sprites\/[a-z_]+\.svg$/);
      assert.match(svg, /<svg\b/);
      const viewBox = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
      assert.ok(viewBox, 'game objects must have a real vector view box');
      assert.doesNotMatch(svg, /<(?:image|filter|linearGradient|radialGradient)\b|data:image|base64/i);
      this.naturalWidth = Number(viewBox[1]);
      this.naturalHeight = Number(viewBox[2]);
      assert.ok(this.naturalWidth >= 16 && this.naturalHeight >= 16);
      this.complete = true;
      loadedFiles.add(file);
      this.onload?.();
    }
  }
  const window = {Image: LocalImage};
  vm.runInNewContext(source, {window, globalThis: window, URL, Promise, Math, Object, Number});
  const assets = window.AirvanaPlayableAssetsV3;
  assert.equal(await assets.load(), true);
  assert.equal(assets.ready(), true);
  assert.equal(loadedFiles.size, 64);
  assert.equal(assets.keys().length, 64);
  assert.equal(assets.games().length, 38);
  for (const profile of globalThis.AirvanaGameArtV1.list()) {
    const frames = assets.forGame(profile.gameKey);
    assert.ok(frames.length > 0, profile.gameKey);
    assert.ok(frames.every(frame => frame && assets.keys().includes(frame.key)), profile.gameKey);
  }
  let draws = 0;
  const context = {globalAlpha: 1, save() {}, restore() {}, translate() {}, rotate() {}, scale() {}, drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh) {
    assert.ok(sx >= 0 && sy >= 0 && sx + sw <= image.naturalWidth && sy + sh <= image.naturalHeight);
    assert.ok(dw > 0 && dh > 0);
    draws += 1;
  }};
  for (const key of assets.keys()) assert.equal(assets.draw(context, key, {x: 15, y: 20, w: 80, h: 90}), true, key);
  assert.equal(draws, 64);
  assert.equal(Object.values(assets.snapshot().drawCounts).reduce((total, count) => total + count, 0), 64);
  assert.equal(assets.draw(context, 'nonexistent-object', {x: 0, y: 0, w: 20, h: 20}), false);
});
