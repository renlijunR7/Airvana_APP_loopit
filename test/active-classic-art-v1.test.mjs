import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import test from 'node:test';
import { resolveGameConfig } from '../src/game-artifact-v3.mjs';

const root = path.resolve(import.meta.dirname, '..');
const runtimeFiles = ['game-art-system-v1.js', 'playable-assets-v3.js', 'complete-games-v3.js', 'deep-games-v2.js'];
const source = name => fs.readFileSync(path.join(root, 'public', name), 'utf8');
const manifest = JSON.parse(source('assets/games/classic-v1/manifest.json'));

function runtime() {
  const requests = [];
  const draws = [];
  class LocalImage {
    set src(value) {
      this.srcValue = value;
      const pathname = new URL(value, 'http://127.0.0.1:8082').pathname;
      requests.push(pathname);
      assert.match(pathname, /^\/assets\/games\/classic-v1\/(?:scenes|sprites)\/[a-z0-9_-]+\.svg$/);
      const svg = fs.readFileSync(path.join(root, 'public', pathname), 'utf8');
      assert.match(svg, /<svg\b/);
      assert.doesNotMatch(svg, /<(?:image|filter|linearGradient|radialGradient|foreignObject|script)\b|data:image|base64/i);
      const dimensions = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
      assert.ok(dimensions, pathname);
      this.naturalWidth = Number(dimensions[1]);
      this.naturalHeight = Number(dimensions[2]);
      this.complete = true;
      this.onload?.();
    }
  }
  let sequence = 0;
  const window = {
    Image: LocalImage, devicePixelRatio: 1,
    document: { currentScript: { src: 'http://127.0.0.1:8082/playable-assets-v3.js?v=5.1.0' } },
    requestAnimationFrame: () => ++sequence, cancelAnimationFrame() {},
    addEventListener() {}, removeEventListener() {}
  };
  const globals = { window, globalThis: window, URL, Promise, Math, Object, Number, Date, Map, Set, console,
    setTimeout: () => ++sequence, clearTimeout() {} };
  for (const file of runtimeFiles) {
    window.document.currentScript.src = `http://127.0.0.1:8082/${file}`;
    vm.runInNewContext(source(file), globals);
  }
  function canvas() {
    const gradient = { addColorStop() {} };
    const context = new Proxy({ globalAlpha: 1 }, {
      get(target, key) {
        if (key in target) return target[key];
        if (key === 'measureText') return text => ({ width: String(text).length * 7 });
        if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => gradient;
        if (key === 'drawImage') return (image, ...args) => { draws.push({ src: image.srcValue, args }); };
        return () => {};
      },
      set(target, key, value) { target[key] = value; return true; }
    });
    return {
      width: 360, height: 560, style: {}, getContext: () => context,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 360, height: 560 }),
      addEventListener() {}, removeEventListener() {}, focus() {}, setPointerCapture() {}, releasePointerCapture() {}
    };
  }
  return { window, requests, draws, canvas };
}

test('all active entrypoints are detached from the archived generated game pack', () => {
  for (const file of [...runtimeFiles, 'index.html']) {
    assert.doesNotMatch(source(file), /(?:\/|\.\.\/)assets\/games\/casual-v1\/|BUILTIN_IMAGEGEN_REFERENCE_GUIDED/, file);
  }
  const artifactSource = fs.readFileSync(path.join(root, 'src/game-artifact-v3.mjs'), 'utf8');
  assert.doesNotMatch(artifactSource, /casual-v1|BUILTIN_IMAGEGEN_REFERENCE_GUIDED/);
  assert.match(artifactSource, /classic-v1\/manifest\.json/);
  for (const file of runtimeFiles) {
    assert.doesNotMatch(source(file), /casual-v1|\.(?:webp|png)['"`]/, file);
    assert.equal(source(file), fs.readFileSync(path.join(root, 'apps/airvana_mobile/assets/runner', file), 'utf8'), `${file} mobile runner must match active web source`);
  }
});

test('all 38 live registry entries resolve matching classic SVG covers, scenes and code-authored sprites', async () => {
  const { window } = runtime();
  const art = window.AirvanaGameArtV1;
  const assets = window.AirvanaPlayableAssetsV3;
  assert.equal(await assets.load(), true);
  assert.equal(assets.pack, 'classic-v1');
  assert.equal(assets.keys().length, 64);
  const definitions = [...window.AirvanaCompleteGames.list(), ...window.AirvanaDeepGames.list()];
  const keys = definitions.map(game => game.key).sort();
  assert.equal(keys.length, 38);
  assert.equal(new Set(keys).size, 38);
  assert.deepEqual(Array.from(art.list(), profile => profile.gameKey).sort(), keys);
  assert.deepEqual(Array.from(assets.games()).sort(), keys);
  assert.deepEqual(manifest.assets.map(asset => asset.game_key).sort(), keys);
  for (const definition of definitions) {
    assert.equal(definition.assetPack, 'classic-v1');
    assert.equal(definition.gameplayAssetPack, 'classic-v1');
    const profile = art.get(definition.key);
    assert.equal(profile.background, `/assets/games/classic-v1/scenes/${definition.key}.svg`);
    assert.equal(profile.cover, `/assets/games/classic-v1/covers/${definition.key}.svg`);
    assert.equal(profile.sprite.source, 'ORIGINAL_CODE_NATIVE_VECTOR');
    assert.equal(profile.backgroundKind, 'classic-game-scene');
    assert.equal(profile.artStyle, 'classic-flat-2d');
    for (const uri of [profile.background, profile.cover, profile.sprite.src, profile.emblem.src, profile.material.src]) {
      assert.ok(fs.existsSync(path.join(root, 'public', uri)), `${definition.key}: ${uri}`);
      assert.match(uri, /^\/assets\/games\/classic-v1\/.*\.svg$/);
    }
    const frames = assets.forGame(definition.key);
    assert.ok(frames.length > 0, definition.key);
    for (const frame of frames) {
      assert.equal(frame.format, 'svg');
      assert.match(frame.src, /\/assets\/games\/classic-v1\/sprites\/[a-z_]+\.svg$/);
    }
    const config = resolveGameConfig({ id: `content_mobilearcade_plb_${definition.key.replaceAll('-', '_')}`, title: definition.title });
    assert.equal(config.gameKey, definition.key);
    assert.equal(config.background, profile.background);
  }
});

test('all 38 actual engines draw their corresponding SVG scene and real SVG gameplay objects', async () => {
  const run = runtime();
  const assets = run.window.AirvanaPlayableAssetsV3;
  await assets.load();
  for (const engine of [run.window.AirvanaCompleteGames, run.window.AirvanaDeepGames]) {
    for (const definition of engine.list()) {
      const before = run.draws.length;
      const game = engine.mount(run.canvas(), definition.key, { muted: true, reducedMotion: true });
      game.draw();
      const draws = run.draws.slice(before);
      assert.equal(game.inspect().gameplayAssetPack, 'classic-v1');
      assert.ok(draws.some(draw => new URL(draw.src, 'http://127.0.0.1:8082').pathname === `/assets/games/classic-v1/scenes/${definition.key}.svg`), `${definition.key}: actual scene draw required`);
      assert.ok(draws.some(draw => /\/classic-v1\/sprites\/.*\.svg$/.test(draw.src)), `${definition.key}: actual vector game object draw required`);
      assert.ok(draws.every(draw => /\/classic-v1\/.*\.svg$/.test(draw.src)));
      game.destroy();
    }
  }
  assert.equal(new Set(run.requests.filter(uri => uri.includes('/scenes/'))).size, 38);
});

test('晶核防线 specifically uses its original classic scene and real tower, crystal and enemy sprites', async () => {
  const run = runtime();
  const assets = run.window.AirvanaPlayableAssetsV3;
  await assets.load();
  const game = run.window.AirvanaCompleteGames.mount(run.canvas(), 'crystal-bastion', { muted: true, reducedMotion: true });
  game.draw();
  assert.ok(run.draws.some(draw => /\/classic-v1\/scenes\/crystal-bastion\.svg$/.test(draw.src)));
  assert.ok(run.draws.some(draw => /\/classic-v1\/sprites\/(?:crystal|turret|guardian)\.svg$/.test(draw.src)));
  const keys = Array.from(assets.forGame('crystal-bastion'), frame => frame.key);
  for (const key of ['turret', 'raider', 'crystal']) assert.ok(keys.includes(key));
  assert.equal(game.inspect().gameplayAssetPack, 'classic-v1');
  game.destroy();
});
