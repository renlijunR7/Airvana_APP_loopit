import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import { createApp } from '../src/app.mjs';

let app;
let server;
let base;
let owner;
let viewer;

async function request(path, { method = 'GET', cookie, body } = {}) {
  const response = await fetch(base + path, {
    method,
    redirect: 'manual',
    signal: AbortSignal.timeout(5_000),
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { response, text: await response.text() };
}

async function login(persona) {
  const result = await request('/api/auth/demo', { method: 'POST', body: { role: 'creator', persona } });
  assert.equal(result.response.status, 200, result.text);
  return { cookie: result.response.headers.get('set-cookie')?.split(';')[0], id: JSON.parse(result.text).me.id };
}

function fixture(id, { status = 'published', artifactStatus = 'ready', withArtifact = true } = {}) {
  const now = new Date().toISOString();
  app.db.prepare(`INSERT INTO contents (id,owner_user_id,title,content_type,status,current_version,created_at,updated_at)
    VALUES (?,?,?,'game',?,1,?,?)`).run(id, owner.id, 'Frame availability fixture', status, now, now);
  if (!withArtifact) return;
  const html = '<!doctype html><html><head><title>Frame fixture</title></head><body><main id="game-root">Ready</main><script>globalThis.fixtureReady=true;</script></body></html>';
  app.db.prepare(`INSERT INTO content_artifacts (id,content_id,version,artifact_type,status,html_text,manifest_json,validation_json,checksum,created_at)
    VALUES (?,?,1,'game',?,?,?,?,?,?)`).run(`artifact-${id}`, id, artifactStatus, html, JSON.stringify({ variantAware: true }), '{}', crypto.createHash('sha256').update(html).digest('hex'), now);
}

function assertEmbeddable(response) {
  assert.equal(response.headers.get('x-frame-options'), 'SAMEORIGIN');
  assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'self'/);
  assert.match(response.headers.get('content-security-policy'), /script-src 'self' 'unsafe-inline'/);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.match(response.headers.get('content-type'), /^text\/html;/);
}

function assertNotEmbeddable(response) {
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/);
}

before(async () => {
  app = createApp({ dbFile: ':memory:', allowDemo: true, disableWorker: true,
    env: { AI_PROVIDER: 'local', APP_SECRET: 'frame-http-test-secret', API_RATE_LIMIT: '5000', AUTH_RATE_LIMIT: '500' } });
  server = http.createServer(app.handler);
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
  owner = await login('frame-http-owner');
  viewer = await login('frame-http-viewer');
  fixture('frame-public');
  fixture('frame-experiment');
  fixture('frame-draft', { status: 'draft' });
  fixture('frame-missing-artifact', { withArtifact: false });
  fixture('frame-not-ready', { artifactStatus: 'failed' });
});

after(async () => {
  server?.closeAllConnections?.();
  if (server?.listening) await new Promise(resolve => server.close(resolve));
  app?.close();
});

test('public GET and HEAD expose matching same-origin runtime headers, with an empty HEAD body', async () => {
  const get = await request('/content/frame-public?embed=1');
  const head = await request('/content/frame-public?embed=1', { method: 'HEAD' });
  assert.equal(get.response.status, 200);
  assert.equal(head.response.status, 200);
  assert.match(get.text, /id="game-root"/);
  assert.equal(head.text, '');
  assertEmbeddable(get.response);
  assertEmbeddable(head.response);
  for (const header of ['content-type', 'cache-control', 'vary', 'x-frame-options', 'content-security-policy']) {
    assert.equal(head.response.headers.get(header), get.response.headers.get(header), header);
  }
  assert.equal(head.response.headers.get('cache-control'), 'public, max-age=60');
  assert.equal(head.response.headers.get('vary'), 'Cookie');
});

test('authenticated HEAD probes never assign an experiment or mutate the stored artifact; GET still delivers exactly once', async () => {
  const now = new Date().toISOString();
  app.db.prepare(`INSERT INTO experiments (id,content_id,name,hypothesis,variant_field,control_value,variant_value,rollout_percent,status,created_by,created_at,updated_at)
    VALUES ('frame-exp','frame-experiment','Frame experiment','Test HEAD has no exposure','hook','Control','Variant',100,'running',?,?,?)`).run(owner.id, now, now);
  const artifact = () => app.db.prepare('SELECT html_text,checksum FROM content_artifacts WHERE content_id=?').get('frame-experiment');
  const assignmentCount = () => app.db.prepare('SELECT COUNT(*) n FROM experiment_assignments WHERE experiment_id=?').get('frame-exp').n;
  const beforeArtifact = artifact();
  assert.equal(assignmentCount(), 0);
  const anonymous = await request('/content/frame-experiment?embed=1');
  assert.equal(anonymous.response.status, 200);
  assert.doesNotMatch(anonymous.text, /globalThis\.__AIRVANA_VARIANT__=/);
  assert.equal(anonymous.response.headers.get('cache-control'), 'private, no-store');
  assert.equal(assignmentCount(), 0, 'anonymous GET keeps its existing unassigned delivery behavior');
  assert.deepEqual(artifact(), beforeArtifact);
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const head = await request('/content/frame-experiment?embed=1', { method: 'HEAD', cookie: viewer.cookie });
    assert.equal(head.response.status, 200);
    assert.equal(head.text, '');
    assert.equal(head.response.headers.get('cache-control'), 'private, no-store');
    assert.equal(head.response.headers.get('vary'), 'Cookie');
    assertEmbeddable(head.response);
    assert.equal(assignmentCount(), 0, 'availability must not count as exposure');
    assert.deepEqual(artifact(), beforeArtifact);
  }
  const get = await request('/content/frame-experiment?embed=1', { cookie: viewer.cookie });
  assert.equal(get.response.status, 200);
  assert.match(get.text, /globalThis\.__AIRVANA_VARIANT__=/);
  assert.match(get.text, /"variant":"variant"/);
  assert.equal(get.response.headers.get('cache-control'), 'private, no-store');
  assert.equal(get.response.headers.get('vary'), 'Cookie');
  assert.equal(assignmentCount(), 1);
  const again = await request('/content/frame-experiment?embed=1', { cookie: viewer.cookie });
  assert.equal(again.response.status, 200);
  assert.equal(assignmentCount(), 1);
  assert.deepEqual(artifact(), beforeArtifact);
  assert.equal(app.db.prepare('SELECT COUNT(*) n FROM runtime_sessions WHERE content_id=?').get('frame-experiment').n, 0);
});

test('public availability rejects drafts, missing contents and missing or failed artifacts without relaxing frame policy', async () => {
  for (const id of ['frame-draft', 'frame-does-not-exist', 'frame-missing-artifact', 'frame-not-ready']) {
    for (const method of ['GET', 'HEAD']) {
      const result = await request(`/content/${id}`, { method, cookie: owner.cookie });
      assert.equal(result.response.status, 404, `${method} ${id}`);
      assertNotEmbeddable(result.response);
      if (method === 'HEAD') assert.equal(result.text, '');
    }
  }
});

test('authorized draft preview GET and HEAD allow the same-origin runtime but never shared caching', async () => {
  const publicGet = await request('/content/frame-public');
  for (const method of ['GET', 'HEAD']) {
    const result = await request('/preview/frame-draft?embed=1', { method, cookie: owner.cookie });
    assert.equal(result.response.status, 200);
    assertEmbeddable(result.response);
    assert.equal(result.response.headers.get('cache-control'), 'no-store');
    assert.equal(result.response.headers.get('content-security-policy'), publicGet.response.headers.get('content-security-policy'));
    if (method === 'GET') assert.match(result.text, /id="game-root"/);
    else assert.equal(result.text, '');
  }
  assert.equal(app.db.prepare('SELECT status FROM contents WHERE id=?').get('frame-draft').status, 'draft');
});

test('preview authorization still rejects anonymous and non-owner requests with non-embeddable errors', async () => {
  for (const method of ['GET', 'HEAD']) {
    for (const [cookie, status] of [[undefined, 401], [viewer.cookie, 403]]) {
      const result = await request('/preview/frame-draft', { method, cookie });
      assert.equal(result.response.status, status);
      assertNotEmbeddable(result.response);
      if (method === 'HEAD') assert.equal(result.text, '');
    }
  }
});

test('owner preview rejects unavailable artifacts and does not relax global shell or error frame restrictions', async () => {
  for (const id of ['frame-does-not-exist', 'frame-missing-artifact', 'frame-not-ready']) {
    for (const method of ['GET', 'HEAD']) {
      const result = await request(`/preview/${id}`, { method, cookie: owner.cookie });
      assert.equal(result.response.status, 404);
      assertNotEmbeddable(result.response);
    }
  }
  const shell = await request('/');
  assert.equal(shell.response.status, 200);
  assertNotEmbeddable(shell.response);
});
