import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
await import(`${pathToFileURL(path.join(root, 'public/game-art-system-v1.js')).href}?test=1.0.0`);

test('global art registry covers all 38 local games', () => {
  const registry = globalThis.AirvanaGameArtV1;
  assert.ok(registry);
  assert.equal(registry.version, '3.0.0');
  assert.equal(registry.status, 'LOCAL_DEMO');
  assert.equal(registry.gameCount, 38);
  assert.equal(registry.list().length, 38);
  assert.equal(new Set(registry.list().map(item => item.gameKey)).size, 38);
});

test('every profile resolves to existing art and valid atlas cells', () => {
  const registry = globalThis.AirvanaGameArtV1;
  registry.list().forEach(profile => {
    assert.ok(profile.background.startsWith('/assets/'));
    assert.ok(fs.existsSync(path.join(root, 'public', profile.background)));
    assert.equal(profile.backgroundKind, 'gameplay-art');
    [profile.emblem, profile.material].forEach(atlas => {
      assert.ok(fs.existsSync(path.join(root, 'public', atlas.src)));
      assert.equal(atlas.columns, 4);
      assert.equal(atlas.rows, 3);
      assert.ok(atlas.index >= 0 && atlas.index < 12);
    });
    assert.ok(fs.existsSync(path.join(root, 'public', profile.sprite.src)));
    assert.equal(profile.sprite.columns, 3);
    assert.equal(profile.sprite.rows, 2);
    assert.equal(profile.sprite.source, 'IMAGEGEN');
    assert.equal(profile.authorization, 'LOCAL_DEMO');
  });
});

test('entrypoint loads registry before game runtime is used', () => {
  const entry = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  assert.match(entry, /game-art-system-v1\.js\?v=3\.0\.0/);
  assert.match(entry, /complete-games-v3\.js\?v=3\.6\.0/);
  assert.match(entry, /deep-games-v2\.js\?v=2\.2\.0/);
  assert.ok(entry.indexOf('game-art-system-v1.js') < entry.indexOf('deep-games-v2.js'));
});

test('visual QA catalog is wired to the same 38-game registry', () => {
  const preview = fs.readFileSync(path.join(root, 'public/game-art-system-preview.html'), 'utf8');
  const script = fs.readFileSync(path.join(root, 'public/game-art-system-preview.js'), 'utf8');
  const style = fs.readFileSync(path.join(root, 'public/game-art-system-preview.css'), 'utf8');
  assert.match(preview, /game-art-system-v1\.js\?v=3\.0\.0/);
  assert.match(preview, /game-art-system-preview\.js\?v=1\.0\.0/);
  assert.match(script, /registry\.list\(\)/);
  assert.match(script, /profile\.background/);
  assert.match(script, /profile\.emblem\.index/);
  assert.match(style, /game-family-emblems-v1\.png/);
  assert.match(style, /game-material-atlas-v1\.jpg/);
  assert.match(script, /window\.AirvanaCompleteGames/);
  assert.match(script, /window\.AirvanaDeepGames/);
});

test('browser runtime QA page mounts the same 38-game registry', () => {
  const page = fs.readFileSync(path.join(root, 'public/game-art-runtime-validation.html'), 'utf8');
  const script = fs.readFileSync(path.join(root, 'public/game-art-runtime-validation.js'), 'utf8');
  assert.match(page, /game-art-runtime-validation\.js\?v=1\.1\.0/);
  assert.match(script, /for \(const profile of registry\.list\(\)\)/);
  assert.match(script, /runtime\.mount\(canvas, profile\.gameKey/);
  assert.match(script, /__AIRVANA_GAME_ART_VALIDATION__/);
});
