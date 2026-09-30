import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(root, 'public/assets/games/classic-v1');
const mobile = path.join(root, 'apps/airvana_mobile/assets/runner/assets/games/classic-v1');
const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
const originalCatalog = JSON.parse(fs.readFileSync(path.join(root, 'public/assets/games/fidelity-v2/manifest.json'), 'utf8'));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

test('classic scene inventory covers all 38 existing games and retains runtime identity', () => {
  assert.equal(manifest.game_count, 38);
  assert.equal(manifest.asset_count, 76);
  assert.equal(manifest.games.length, 38);
  assert.equal(manifest.assets.length, 38);
  assert.deepEqual(manifest.assets.map(a => a.game_key).sort(), originalCatalog.assets.map(a => a.game_key).sort());
  for (const asset of manifest.assets) {
    const original = originalCatalog.assets.find(a => a.game_key === asset.game_key);
    for (const field of ['title', 'runtime', 'content_id', 'mechanic']) assert.equal(asset[field], original[field], `${asset.game_key}: ${field}`);
  }
  assert.equal(manifest.assets.filter(a => a.runtime === 'complete-games-v3').length, 32);
  assert.equal(manifest.assets.filter(a => a.runtime === 'deep-games-v2').length, 6);
});

test('every scene and cover has valid portrait dimensions, exact bytes and checksum', () => {
  for (const game of manifest.games) for (const kind of ['scene', 'cover']) {
    const entry = game[kind];
    const buffer = fs.readFileSync(path.join(root, 'public', entry.path));
    const text = buffer.toString('utf8');
    assert.equal(entry.width, 360);
    assert.equal(entry.height, 560);
    assert.equal(entry.bytes, buffer.length, `${game.key} ${kind}: size`);
    assert.equal(entry.sha256, hash(buffer), `${game.key} ${kind}: hash`);
    assert.match(text, /<svg\b[^>]*width="360"[^>]*height="560"[^>]*viewBox="0 0 360 560"/);
    assert.ok(text.trim().endsWith('</svg>'));
  }
});

test('all 76 original SVG images and scene manifests are mirrored byte-for-byte into Flutter', () => {
  for (const kind of ['scenes', 'covers']) for (const game of manifest.games) {
    const file = `${game.key}.svg`;
    assert.deepEqual(fs.readFileSync(path.join(directory, kind, file)), fs.readFileSync(path.join(mobile, kind, file)), `${kind}/${file}`);
  }
  assert.deepEqual(fs.readFileSync(path.join(directory, 'manifest.json')), fs.readFileSync(path.join(mobile, 'manifest.json')));
});

test('all 38 scenes and all 38 covers are visually distinct files', () => {
  for (const kind of ['scene', 'cover']) assert.equal(new Set(manifest.games.map(g => g[kind].sha256)).size, 38, kind);
});

test('classic vectors contain no embedded raster, external image, filter, gradient, glow or baked text', () => {
  const forbidden = /<(?:image|foreignObject|filter|linearGradient|radialGradient|text|script)\b|data:image|base64|(?:xlink:)?href\s*=|(?:box|text)-shadow|blur\(/i;
  for (const kind of ['scenes', 'covers']) for (const game of manifest.games) {
    const text = fs.readFileSync(path.join(directory, kind, `${game.key}.svg`), 'utf8');
    assert.equal(forbidden.test(text), false, `${game.key} ${kind}: must remain pure vector shapes`);
  }
  assert.equal(manifest.raster_inputs, 0);
  assert.equal(manifest.ai_image_inputs, 0);
});

test('classic provenance names the original deterministic authoring source, without third-party asset claims', () => {
  assert.equal(manifest.source_authoring, 'code-authored');
  assert.equal(manifest.source_generator, 'scripts/build-classic-scenes-v1.mjs');
  for (const asset of manifest.assets) {
    assert.equal(asset.source_authoring, 'code-authored');
    assert.equal(asset.release_approved, false);
    assert.equal(asset.runtime_asset.format, 'svg');
    assert.equal(asset.cover_asset.format, 'svg');
    assert.match(asset.license, /Original project artwork/);
    assert.equal(/Kenney|Nintendo|Sega|CC0/i.test(asset.license), false);
  }
});

test('cover illustrations embed complete original sprites and the builder rejects missing sprites', () => {
  assert.ok(manifest.cover_sprite_keys.length >= 48);
  for (const key of manifest.cover_sprite_keys) {
    const text = fs.readFileSync(path.join(directory, 'sprites', `${key}.svg`), 'utf8');
    assert.match(text, /viewBox="0 0 64 64"/);
    assert.equal(/<(?:image|filter|linearGradient|radialGradient)\b|data:image/i.test(text), false);
  }
  const builder = fs.readFileSync(path.join(root, manifest.source_generator), 'utf8');
  assert.match(builder, /throw new Error\(`Missing original sprite:/);
});

test('static cover and scene review pages work without inline JavaScript', () => {
  for (const kind of ['scenes', 'covers']) for (let page = 0; page < 5; page += 1) {
    const text = fs.readFileSync(path.join(directory, `preview-${kind}-${page}.html`), 'utf8');
    assert.equal(/<script\b/.test(text), false);
    assert.equal((text.match(/<img\b/g) || []).length, page === 4 ? 6 : 8);
  }
});
