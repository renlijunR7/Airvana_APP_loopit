import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app.mjs';

let app;
let server;
let base;

before(async () => {
  app = createApp({ dbFile: ':memory:', allowDemo: true, disableWorker: true, env: { AI_PROVIDER: 'local', APP_SECRET: 'test-secret', RUNTIME_MIN_DURATION_MS: '0', API_RATE_LIMIT: '2000', AUTH_RATE_LIMIT: '500' } });
  server = http.createServer(app.handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.closeAllConnections?.();
  await new Promise(resolve => server.close(resolve));
  app.close();
});

async function req(path, { method = 'GET', body, cookie, device = 'identity-device' } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Airvana-Device': device, ...(cookie ? { Cookie: cookie } : {}) },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  return { response, data, cookie: response.headers.get('set-cookie')?.split(';')[0] };
}

async function emailLogin(email) {
  const challenge = await req('/api/auth/email/challenge', { method: 'POST', body: { email } });
  assert.equal(challenge.response.status, 200);
  assert.match(challenge.data.demoCode, /^\d{6}$/);
  const verified = await req('/api/auth/email/verify', { method: 'POST', body: { email, code: challenge.data.demoCode } });
  assert.equal(verified.response.status, 200);
  return verified;
}

test('server-issued email code logs in, is single-use, and the same email always resolves to the same account', async () => {
  const first = await emailLogin('kai@example.com');
  assert.equal(first.data.created, true);
  const userId = first.data.me.id;

  // 同邮箱再次登录 → 同一账号
  const second = await emailLogin('KAI@Example.com');
  assert.equal(second.data.created, false);
  assert.equal(second.data.me.id, userId);

  // 验证码一次性：重放上一枚已消费的码被拒绝
  const challenge = await req('/api/auth/email/challenge', { method: 'POST', body: { email: 'kai@example.com' } });
  const code = challenge.data.demoCode;
  assert.equal((await req('/api/auth/email/verify', { method: 'POST', body: { email: 'kai@example.com', code } })).response.status, 200);
  const replay = await req('/api/auth/email/verify', { method: 'POST', body: { email: 'kai@example.com', code } });
  assert.equal(replay.response.status, 401);

  // 错码计数锁
  await req('/api/auth/email/challenge', { method: 'POST', body: { email: 'kai@example.com' } });
  for (let i = 0; i < 5; i += 1) {
    assert.equal((await req('/api/auth/email/verify', { method: 'POST', body: { email: 'kai@example.com', code: '000000' } })).response.status, 401);
  }
  assert.equal((await req('/api/auth/email/verify', { method: 'POST', body: { email: 'kai@example.com', code: '000000' } })).response.status, 429);
});

test('google local adapter auto-links to an existing verified email identity instead of creating a second account', async () => {
  const emailUser = await emailLogin('mina@example.com');
  const viaGoogle = await req('/api/auth/google/local', { method: 'POST', body: { email: 'mina@example.com' } });
  assert.equal(viaGoogle.response.status, 200);
  assert.equal(viaGoogle.data.me.id, emailUser.data.me.id);
  assert.equal(viaGoogle.data.created, false);

  const identities = app.db.prepare('SELECT provider FROM login_identities WHERE user_id=? ORDER BY provider').all(emailUser.data.me.id).map(row => row.provider);
  assert.deepEqual(identities, ['email', 'google']);

  // 新邮箱的 Google 登录 → 新账号
  const fresh = await req('/api/auth/google/local', { method: 'POST', body: { email: 'someoneelse@example.com' } });
  assert.equal(fresh.data.created, true);
  assert.notEqual(fresh.data.me.id, emailUser.data.me.id);
});

test('a logged-in account binds an extra email, conflicts are rejected, and bootstrap lists identities', async () => {
  const google = await req('/api/auth/google/local', { method: 'POST', body: { email: 'creator-a@example.com' } });
  const cookie = google.cookie;

  // 绑定一个新邮箱到当前账号
  const challenge = await req('/api/account/identities/email/challenge', { method: 'POST', cookie, body: { email: 'backup-a@example.com' } });
  assert.equal(challenge.response.status, 200);
  const bound = await req('/api/account/identities/email/verify', { method: 'POST', cookie, body: { email: 'backup-a@example.com', code: challenge.data.demoCode } });
  assert.equal(bound.response.status, 200);
  assert.equal(bound.data.identities.length, 2);

  // 绑定后用该邮箱验证码登录 → 回到同一账号（合并生效）
  const backLogin = await emailLogin('backup-a@example.com');
  assert.equal(backLogin.data.created, false);
  assert.equal(backLogin.data.me.id, google.data.me.id);

  // 冲突：他人已占用的邮箱不能绑定
  await emailLogin('taken@example.com');
  const conflict = await req('/api/account/identities/email/challenge', { method: 'POST', cookie, body: { email: 'taken@example.com' } });
  assert.equal(conflict.response.status, 409);
  assert.equal(conflict.data.error.code, 'identity_conflict');

  // bootstrap 暴露身份列表
  const boot = await req('/api/bootstrap', { cookie });
  const providers = boot.data.loginIdentities.map(x => `${x.provider}:${x.identifier}`).sort();
  assert.deepEqual(providers, ['email:backup-a@example.com', 'google:creator-a@example.com']);
});
