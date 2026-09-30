import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'public/assets/games/fidelity-v2/manifest.json'), 'utf8'));

function sha256(relativePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relativePath))).digest('hex');
}

function imageDimensions(relativePath) {
  const data = fs.readFileSync(path.join(root, relativePath));
  if (data.subarray(1, 4).toString('ascii') === 'PNG') {
    return {width: data.readUInt32BE(16), height: data.readUInt32BE(20)};
  }
  let offset = 2;
  while (offset < data.length) {
    if (data[offset] !== 0xff) { offset += 1; continue; }
    const marker = data[offset + 1];
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return {height: data.readUInt16BE(offset + 5), width: data.readUInt16BE(offset + 7)};
    }
    if (marker === 0xd8 || marker === 0xd9) { offset += 2; continue; }
    offset += 2 + data.readUInt16BE(offset + 2);
  }
  throw new Error(`Unsupported image: ${relativePath}`);
}

test('fidelity-v2 manifest covers all 38 games with independent source and runtime art', () => {
  assert.equal(manifest.schema, 'airvana.game-art-manifest.v2');
  assert.equal(manifest.version, '2.0.0');
  assert.equal(manifest.status, 'LOCAL_DEMO');
  assert.equal(manifest.game_count, 38);
  assert.equal(manifest.assets.length, 38);
  assert.equal(new Set(manifest.assets.map(asset => asset.game_key)).size, 38);
  assert.equal(new Set(manifest.assets.map(asset => asset.source.sha256)).size, 38);

  manifest.assets.forEach(asset => {
    assert.equal(asset.authorization_status, 'pending_human_release_approval');
    assert.equal(asset.release_approved, false);
    assert.equal(asset.review_status, manifest.release_review.technical_review.status);
    for (const rendition of [asset.source, asset.runtime_asset]) {
      assert.ok(fs.existsSync(path.join(root, rendition.path)), `${rendition.path} missing`);
      assert.equal(sha256(rendition.path), rendition.sha256, `${rendition.path} checksum drift`);
      assert.deepEqual(imageDimensions(rendition.path), {width: 941, height: 1672});
      assert.ok(rendition.bytes > 250000, `${rendition.path} is unexpectedly small`);
    }
    assert.ok(fs.existsSync(path.join(root, asset.flutter_asset)), `${asset.flutter_asset} missing`);
    assert.equal(sha256(asset.flutter_asset), asset.runtime_asset.sha256, `${asset.game_key} Flutter copy drift`);
  });
});

test('legacy fidelity archive is preserved but not selected by Web or Flutter', () => {
  const webRegistry = fs.readFileSync(path.join(root, 'public/game-art-system-v1.js'), 'utf8');
  const flutterRegistry = fs.readFileSync(path.join(root, 'apps/airvana_mobile/assets/runner/game-art-system-v1.js'), 'utf8');
  const pubspec = fs.readFileSync(path.join(root, 'apps/airvana_mobile/pubspec.yaml'), 'utf8');
  assert.match(webRegistry, /const VERSION = '6\.0\.0'/);
  assert.doesNotMatch(webRegistry, /fidelity-v2|playables-v3\/runtime/);
  assert.match(flutterRegistry, /const VERSION = '6\.0\.0'/);
  assert.match(flutterRegistry, /ROOT = '\/assets\/games\/classic-v1\/'/);
  assert.match(pubspec, /assets\/runner\/assets\/games\/classic-v1\/sprites\//);
  assert.match(pubspec, /assets\/runner\/assets\/games\/casual-v1\/sprites\//);
  assert.doesNotMatch(pubspec, /assets\/games\/(fidelity-v2|playables-v3)\/runtime/);
  assert.equal(manifest.release_review.external_release.production_enabled, false);
  assert.equal(manifest.release_review.external_release.status, 'blocked_pending_human_approval');
});

test('visual review page renders from the versioned manifest', () => {
  const page = fs.readFileSync(path.join(root, 'public/game-art-fidelity-v2-preview.html'), 'utf8');
  const script = fs.readFileSync(path.join(root, 'public/game-art-fidelity-v2-preview.js'), 'utf8');
  assert.match(page, /38 款游戏独立高保真场景/);
  assert.match(script, /fidelity-v2\/manifest\.json/);
  assert.match(script, /manifest\.assets\.slice/);
  assert.match(script, /asset\.runtime_asset\.path/);
});
