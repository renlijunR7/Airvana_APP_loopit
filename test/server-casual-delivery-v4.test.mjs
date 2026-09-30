import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import { buildArtifact } from '../src/artifact.mjs';
import { createApp } from '../src/app.mjs';
import { resolveGameConfig, serverCasualBackground, upgradeServerGameRuntimeReferences } from '../src/game-artifact-v3.mjs';

const SECURITY = '/assets/games/server-casual-v4/security-world.png';
const MEMORY = '/assets/games/server-casual-v4/memory-world.png';
const payload = title => ({
  title, summary: '完成真实互动，再查看本局结果。',
  sections: [{ heading: '了解目标', body: '查看本关内容。' }, { heading: '完成挑战', body: '根据规则进行操作。' }],
  interactions: [{ trigger: '用户完成操作', result: '展示本局结果' }],
  assets: ['same-origin-game-art'], safetyNotes: ['不索取秘密信息。'],
});
const oldHtml = '<!doctype html><html><head><link rel="stylesheet" href="/server-game-runtime-v3.css?v=3.2.0"></head><body><main id="game-root">Legacy game</main><script src="/server-game-runtime-v3.js?v=3.2.0"></script><script>const DATA={game:{mode:"decision",background:"/assets/games/classic-v1/scenes/safety-workshop.svg"}};globalThis.legacyVariantConsumer=globalThis.__AIRVANA_VARIANT__||null;</script></body></html>';

test('new decision and memory configs use distinct casual worlds; native game art is unchanged', () => {
  const decision = resolveGameConfig({ id: 'wallet-game', title: '钱包安全守卫' });
  const memory = resolveGameConfig({ id: 'delivery-memory', title: '记忆物品收集' });
  const native = resolveGameConfig({ id: 'delivery-native', title: '星轨牌阵' }, { gameKey: 'star-deck' });
  assert.equal(decision.mode, 'decision'); assert.equal(decision.background, SECURITY);
  assert.equal(memory.mode, 'memory'); assert.equal(memory.background, MEMORY);
  assert.equal(native.mode, 'native'); assert.equal(native.background, '/assets/games/classic-v1/scenes/star-deck.svg');
  assert.equal(serverCasualBackground('native'), null);
  assert.equal(serverCasualBackground('__proto__'), null);
});

test('new templates use runtime v4, honest per-mode metadata and unchanged event/variant contracts', () => {
  for (const [id, title, extra, mode] of [
    ['wallet-game', '钱包安全守卫', {}, 'decision'],
    ['delivery-memory', '记忆物品收集', {}, 'memory'],
    ['delivery-native', '星轨牌阵', { gameKey: 'star-deck' }, 'native'],
  ]) {
    const built = buildArtifact({ content: { id, title, content_type: 'game' }, payload: { ...payload(title), ...extra }, version: 2 });
    assert.equal(built.validation.passed, true);
    assert.match(built.html, /href="\/server-game-runtime-v3\.css\?v=4\.0\.0"/);
    assert.match(built.html, /src="\/server-game-runtime-v3\.js\?v=4\.0\.0"/);
    assert.doesNotMatch(built.html, /<script src="\/server-casual-art-v4\.js/);
    assert.equal(built.manifest.runtimeVersion, '4.0.0');
    assert.equal(built.manifest.variantAware, true);
    assert.equal(built.manifest.mechanic, mode);
    assert.deepEqual(built.manifest.requiredEvents, ['playable_start', 'step_complete', 'playable_complete']);
    assert.ok(built.manifest.runtimeDependencies.includes('/server-casual-art-v4.js'));
    assert.match(built.html, /function applyVariant\(\)/);
    assert.equal(built.manifest.gameplayAssetPack, mode === 'native' ? 'classic-v1' : 'server-casual-v4');
    if (mode === 'native') assert.equal(built.manifest.artUpgradeScope, 'server-shell-only-native-gameplay-unchanged');
    else assert.equal(built.manifest.artDirection, 'polished-casual-mobile-2.5d');
  }
});

test('delivery rewrite is idempotent and changes only exact same-origin script/link references', () => {
  const input = oldHtml.replace('</head>', '<link href=\'/server-game-runtime-v3.css\'><link href="https://outside.example/server-game-runtime-v3.css?v=3.2.0"><link href="/other/server-game-runtime-v3.css?v=3.2.0"></head>')
    .replace('</body>', '<script SRC=/server-game-runtime-v3.js?v=3.1.0></script><script src="//outside.example/server-game-runtime-v3.js"></script><script data-src="/server-game-runtime-v3.js?v=3.2.0">const runtime="/server-game-runtime-v3.js?v=3.2.0";</script><!-- <script src="/server-game-runtime-v3.js?v=3.2.0"></script> --></body>');
  const result = upgradeServerGameRuntimeReferences(input);
  assert.equal(upgradeServerGameRuntimeReferences(result), result);
  assert.equal((result.match(/server-game-runtime-v3\.(?:css|js)\?v=4\.0\.0/g) || []).length, 4);
  assert.match(result, /https:\/\/outside\.example\/server-game-runtime-v3\.css\?v=3\.2\.0/);
  assert.match(result, /src="\/\/outside\.example\/server-game-runtime-v3\.js"/);
  assert.match(result, /href="\/other\/server-game-runtime-v3\.css\?v=3\.2\.0"/);
  assert.match(result, /data-src="\/server-game-runtime-v3\.js\?v=3\.2\.0"/);
  assert.match(result, /const runtime="\/server-game-runtime-v3\.js\?v=3\.2\.0"/);
  assert.match(result, /<!-- <script src="\/server-game-runtime-v3\.js\?v=3\.2\.0"><\/script> -->/);
  assert.match(result, /background:"\/assets\/games\/classic-v1\/scenes\/safety-workshop\.svg"/);
  assert.equal(upgradeServerGameRuntimeReferences(null), null);
});

test('article/video HTML without server-game references remains byte-identical', () => {
  for (const type of ['article', 'video']) {
    const built = buildArtifact({ content: { id: type, title: '内容展示', content_type: type }, payload: payload('内容展示'), version: 1 });
    assert.equal(upgradeServerGameRuntimeReferences(built.html), built.html);
  }
});

let app, server, base, owner, viewer;
const saved = new Map();
async function request(path, { method = 'GET', cookie, body } = {}) {
  const response = await fetch(base + path, { method, redirect: 'manual', signal: AbortSignal.timeout(5000),
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: body == null ? undefined : JSON.stringify(body) });
  return { response, text: await response.text() };
}
async function login(persona) {
  const result = await request('/api/auth/demo', { method: 'POST', body: { role: 'creator', persona } });
  assert.equal(result.response.status, 200, result.text);
  return { id: JSON.parse(result.text).me.id, cookie: result.response.headers.get('set-cookie').split(';')[0] };
}
function fixture(id, { status = 'published', manifest = {} } = {}) {
  const now = new Date().toISOString();
  app.db.prepare(`INSERT INTO contents (id,owner_user_id,title,content_type,status,current_version,created_at,updated_at)
    VALUES (?,?,?,'game',?,1,?,?)`).run(id, owner.id, `CasualDeliveryFixture ${id}`, status, now, now);
  const checksum = crypto.createHash('sha256').update(oldHtml).digest('hex');
  app.db.prepare(`INSERT INTO content_artifacts (id,content_id,version,artifact_type,status,html_text,manifest_json,validation_json,checksum,created_at)
    VALUES (?,?,1,'game','ready',?,?,?,?,?)`).run(`artifact-${id}`, id, oldHtml,
    JSON.stringify({ variantAware: true, runtime: 'server-game-v3', runtimeVersion: '3.2.0', mechanic: 'decision', background: '/assets/games/classic-v1/scenes/safety-workshop.svg', ...manifest }), '{}', checksum, now);
  saved.set(id, app.db.prepare('SELECT html_text,checksum,manifest_json FROM content_artifacts WHERE content_id=?').get(id));
}
const stored = id => app.db.prepare('SELECT html_text,checksum,manifest_json FROM content_artifacts WHERE content_id=?').get(id);

before(async () => {
  app = createApp({ dbFile: ':memory:', allowDemo: true, disableWorker: true,
    env: { AI_PROVIDER: 'local', APP_SECRET: 'casual-delivery-v4-tests', API_RATE_LIMIT: '5000', AUTH_RATE_LIMIT: '500' } });
  server = http.createServer(app.handler);
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
  owner = await login('casual-delivery-owner'); viewer = await login('casual-delivery-viewer');
  fixture('casual-public'); fixture('casual-draft', { status: 'draft' }); fixture('casual-experiment');
  fixture('casual-memory', { manifest: { mechanic: 'memory', background: '/assets/games/classic-v1/scenes/rune-circuit.svg' } });
  fixture('casual-native', { manifest: { mechanic: 'native', background: '/assets/games/classic-v1/scenes/star-deck.svg' } });
  fixture('casual-safe-pack', { manifest: { mechanic: 'unknown', background: MEMORY } });
  fixture('casual-bad-pack', { manifest: { mechanic: 'unknown', background: '/assets/games/server-casual-v4/unreviewed.png' } });
  fixture('casual-external-pack', { manifest: { mechanic: 'unknown', background: 'https://outside.example/assets/games/server-casual-v4/security-world.png' } });
  fixture('casual-query-pack', { manifest: { mechanic: 'unknown', background: `${MEMORY}?external=1` } });
});

after(async () => {
  server?.closeAllConnections?.();
  if (server?.listening) await new Promise(resolve => server.close(resolve));
  app?.close();
});

test('old public content and authenticated preview serve v4 copies without changing saved HTML/manifest/checksum', async () => {
  for (const [path, id, cookie] of [['/content/casual-public', 'casual-public', undefined], ['/preview/casual-draft', 'casual-draft', owner.cookie]]) {
    const get = await request(path, { cookie });
    assert.equal(get.response.status, 200, get.text);
    assert.match(get.text, /server-game-runtime-v3\.css\?v=4\.0\.0/);
    assert.match(get.text, /server-game-runtime-v3\.js\?v=4\.0\.0/);
    assert.equal(get.response.headers.get('x-frame-options'), 'SAMEORIGIN');
    const head = await request(path, { method: 'HEAD', cookie });
    assert.equal(head.response.status, 200); assert.equal(head.text, '');
    assert.deepEqual(stored(id), saved.get(id));
  }
  assert.equal((await request('/preview/casual-draft')).response.status, 401);
  assert.equal((await request('/preview/casual-draft', { cookie: viewer.cookie })).response.status, 403);
  assert.equal((await request('/content/casual-draft')).response.status, 404);
});

test('v4 delivery preserves experiment assignment/injection; HEAD/preview do not count as gameplay', async () => {
  const now = new Date().toISOString();
  app.db.prepare(`INSERT INTO experiments (id,content_id,name,hypothesis,variant_field,control_value,variant_value,rollout_percent,status,created_by,created_at,updated_at)
    VALUES ('casual-delivery-exp','casual-experiment','Delivery styling','Preserve experiment contracts','hook','Control','Variant',100,'running',?,?,?)`).run(owner.id, now, now);
  const count = () => app.db.prepare("SELECT COUNT(*) n FROM experiment_assignments WHERE experiment_id='casual-delivery-exp'").get().n;
  const head = await request('/content/casual-experiment', { method: 'HEAD', cookie: viewer.cookie });
  assert.equal(head.response.status, 200); assert.equal(count(), 0);
  for (let attempt = 0; attempt < 2; attempt++) {
    const get = await request('/content/casual-experiment', { cookie: viewer.cookie });
    assert.equal(get.response.status, 200);
    assert.match(get.text, /globalThis\.__AIRVANA_VARIANT__=/);
    assert.match(get.text, /"variant":"variant"/);
    assert.match(get.text, /server-game-runtime-v3\.js\?v=4\.0\.0/);
    assert.equal(get.response.headers.get('cache-control'), 'private, no-store');
    assert.equal(count(), 1);
  }
  const preview = await request('/preview/casual-experiment', { cookie: owner.cookie });
  assert.doesNotMatch(preview.text, /globalThis\.__AIRVANA_VARIANT__=\{/);
  assert.equal(count(), 1);
  assert.equal(app.db.prepare("SELECT COUNT(*) n FROM runtime_sessions WHERE content_id='casual-experiment'").get().n, 0);
  assert.deepEqual(stored('casual-experiment'), saved.get('casual-experiment'));
});

test('feed uses delivered mode worlds and admits only the two exact new same-origin background paths', async () => {
  const response = await request('/api/discover?q=CasualDeliveryFixture', { cookie: viewer.cookie });
  assert.equal(response.response.status, 200, response.text);
  const rows = Object.fromEntries(JSON.parse(response.text).results.map(row => [row.id, row]));
  assert.equal(rows['casual-public'].gameBackground, SECURITY);
  assert.equal(rows['casual-memory'].gameBackground, MEMORY);
  assert.equal(rows['casual-safe-pack'].gameBackground, MEMORY);
  for (const id of ['casual-native', 'casual-bad-pack', 'casual-external-pack', 'casual-query-pack']) assert.equal(rows[id].gameBackground, null, id);
  for (const id of saved.keys()) assert.deepEqual(stored(id), saved.get(id), id);
});
