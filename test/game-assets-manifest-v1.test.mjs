import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

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
    if (data[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = data[offset + 1];
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return {height: data.readUInt16BE(offset + 5), width: data.readUInt16BE(offset + 7)};
    }
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    offset += 2 + data.readUInt16BE(offset + 2);
  }
  throw new Error(`Unsupported image dimensions: ${relativePath}`);
}

test('dedicated scene manifest covers 17 new scenes and 7 refinements', () => {
  const manifest = readJson('public/assets/games/dedicated-scenes-v1/manifest.json');
  assert.equal(manifest.assets.length, 24);
  assert.equal(manifest.assets.filter(item => item.role === 'new_dedicated_scene').length, 17);
  assert.equal(manifest.assets.filter(item => item.role === 'visual_refinement').length, 7);
  assert.equal(new Set(manifest.assets.map(item => item.game_key)).size, 24);
  assert.equal(manifest.authorization_status, 'pending_human_release_approval');
  assert.equal(manifest.release_review.status, 'blocked_pending_human_approval');

  manifest.assets.forEach(asset => {
    for (const field of ['asset_id', 'game_key', 'owner', 'authorization_status', 'locale', 'version', 'usage_restrictions', 'review_status']) {
      assert.ok(asset[field], `${asset.game_key} missing ${field}`);
    }
    assert.equal(asset.authorization_status, 'pending_human_release_approval');
    assert.equal(asset.review_status, 'technical_review_passed');
    assert.equal(asset.release_approved, false);
    assert.equal(asset.expires_at, null);

    for (const rendition of ['source', 'runtime']) {
      const record = asset[rendition];
      assert.ok(fs.existsSync(path.join(root, record.path)), `${record.path} is missing`);
      assert.equal(sha256(record.path), record.sha256, `${record.path} checksum drift`);
      assert.deepEqual(imageDimensions(record.path), {width: record.width, height: record.height});
    }
    assert.deepEqual(
      {width: asset.runtime.width, height: asset.runtime.height},
      {width: 941, height: 1672},
      `${asset.game_key} runtime must use the shared portrait render size`
    );
  });
});

test('legacy category manifest paths and checksums resolve', () => {
  const manifest = readJson('docs/playable-demos/category-expansion/asset-manifest.json');
  manifest.assets.forEach(asset => {
    assert.ok(fs.existsSync(path.join(root, asset.path)), `${asset.path} is missing`);
    assert.equal(sha256(asset.path), asset.sha256, `${asset.path} checksum drift`);
  });
});

test('global, immersive and orchard manifests carry release authorization boundaries', () => {
  const manifests = [
    readJson('public/assets/games/global-art-v1/manifest.json'),
    readJson('public/assets/games/immersive-art-v2/manifest.json'),
    readJson('public/assets/games/orchard-merge-v2/manifest.json')
  ];
  const global = manifests[0];
  assert.equal(global.background_policy.dedicated_gameplay_art_count, 38);
  assert.equal(global.background_policy.store_cover_fallback_count, 0);

  manifests.forEach(manifest => {
    const assets = manifest.assets || [];
    assets.forEach(asset => {
      assert.equal(asset.authorization_status, 'pending_human_release_approval');
      assert.equal(asset.review_status, 'technical_review_passed');
      assert.equal(asset.release_approved, false);
      assert.equal(asset.expires_at, null);
    });
  });
});
