import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../src/app.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

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

async function req(path, { method = 'GET', body, cookie, device = 'mobile-proof-device' } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Airvana-Device': device, ...(cookie ? { Cookie: cookie } : {}) },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  return { response, data, cookie: response.headers.get('set-cookie')?.split(';')[0] };
}

test('mobile playable registration is idempotent and owned by the arcade demo account', async () => {
  const login = await req('/api/auth/demo', { method: 'POST', body: { role: 'creator', persona: 'mobile-google' } });
  const cookie = login.cookie;
  const first = await req('/api/demo/mobile-playables', { method: 'POST', cookie, body: { playables: [{ key: 'plb_orchard_merge', title: '果园合合塔 Orchard Merge' }] } });
  assert.equal(first.response.status, 200);
  const contentId = first.data.mapping.plb_orchard_merge;
  assert.equal(contentId, 'content_mobilearcade_plb_orchard_merge');
  assert.notEqual(first.data.owner, login.data.me.id);

  const again = await req('/api/demo/mobile-playables', { method: 'POST', cookie, body: { playables: [{ key: 'plb_orchard_merge', title: '果园合合塔 Orchard Merge' }] } });
  assert.equal(again.data.mapping.plb_orchard_merge, contentId);
  assert.equal(app.db.prepare("SELECT COUNT(*) n FROM contents WHERE id=?").get(contentId).n, 1);

  const content = app.db.prepare('SELECT status,content_type FROM contents WHERE id=?').get(contentId);
  assert.equal(content.status, 'published');
  const artifact = app.db.prepare('SELECT status FROM content_artifacts WHERE content_id=? AND version=1').get(contentId);
  assert.equal(artifact.status, 'ready');
});

test('mobile completion earns 5 AIP through the ordered server runtime proof and deduplicates within 24h', async () => {
  const login = await req('/api/auth/demo', { method: 'POST', body: { role: 'creator', persona: 'mobile-email' } });
  const cookie = login.cookie;
  const registered = await req('/api/demo/mobile-playables', { method: 'POST', cookie, body: { playables: [{ key: 'plb_star_mower', title: '星尘割草 Star Mower' }] } });
  const contentId = registered.data.mapping.plb_star_mower;

  const session = await req('/api/runtime/sessions', { method: 'POST', cookie, body: { contentId } });
  assert.equal(session.response.status, 201);
  assert.equal(session.data.rewardEligible, true);
  const token = session.data.sessionToken;

  // 乱序拒绝
  const outOfOrder = await req('/api/runtime/events', { method: 'POST', cookie, body: { sessionToken: token, sequence: 2, eventType: 'step_complete' } });
  assert.equal(outOfOrder.response.status, 409);

  assert.equal((await req('/api/runtime/events', { method: 'POST', cookie, body: { sessionToken: token, sequence: 1, eventType: 'playable_start' } })).response.status, 201);
  assert.equal((await req('/api/runtime/events', { method: 'POST', cookie, body: { sessionToken: token, sequence: 2, eventType: 'step_complete' } })).response.status, 201);
  const complete = await req('/api/runtime/events', { method: 'POST', cookie, body: { sessionToken: token, sequence: 3, eventType: 'playable_complete' } });
  assert.equal(complete.response.status, 201);
  assert.equal(complete.data.rewardStatus, 'posted');
  assert.equal(complete.data.points, 5);

  const posted = app.db.prepare("SELECT COALESCE(SUM(amount),0) total FROM point_events WHERE user_id=? AND currency='AIP' AND status='posted'").get(login.data.me.id).total;
  assert.ok(posted >= 5);

  // 24 小时内同一游戏第二次完成不重复奖励
  const second = await req('/api/runtime/sessions', { method: 'POST', cookie, body: { contentId } });
  const token2 = second.data.sessionToken;
  await req('/api/runtime/events', { method: 'POST', cookie, body: { sessionToken: token2, sequence: 1, eventType: 'playable_start' } });
  await req('/api/runtime/events', { method: 'POST', cookie, body: { sessionToken: token2, sequence: 2, eventType: 'step_complete' } });
  const duplicate = await req('/api/runtime/events', { method: 'POST', cookie, body: { sessionToken: token2, sequence: 3, eventType: 'playable_complete' } });
  assert.equal(duplicate.data.rewardStatus, 'daily_duplicate');
});

test('local api bridge drives the full proof chain against the real server and fails closed without a session', async () => {
  const source = fs.readFileSync(path.join(root, 'public/local-api-bridge-v1.js'), 'utf8');
  let jar = '';
  const sandbox = { location: new URL(base), fetch: async (input, options = {}) => {
    const response = await fetch(new URL(input, base), { ...options, headers: { ...(options.headers || {}), ...(jar ? { Cookie: jar } : {}) } });
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) jar = setCookie.split(';')[0];
    return response;
  } };
  new Function('window', 'globalThis', 'location', 'fetch', source)(sandbox, sandbox, sandbox.location, sandbox.fetch);
  const bridge = sandbox.AirvanaLocalApiBridge;

  // 无会话时 fail closed
  assert.equal(await bridge.startRuntime('plb_pulse_forge', '节拍熔炉'), null);

  assert.equal(await bridge.probe(), true);
  const me = await bridge.login('google');
  assert.ok(me && me.id);
  assert.equal(bridge.ready, true);

  const started = await bridge.startRuntime('plb_pulse_forge', '节拍熔炉 Pulse Forge');
  assert.equal(started.server_confirmed, true);
  assert.equal(started.rewardEligible, true);
  await bridge.step({ event: 'level_complete' });
  const result = await bridge.complete({ score: 88 });
  assert.equal(result.rewardStatus, 'posted');
  assert.equal(result.points, 5);

  // 完成后的重复 complete 不再发送
  assert.equal(await bridge.complete({ score: 99 }), null);

  // 互动事件：like/save/share 走服务端幂等 + 每日去重
  const like = await bridge.engage('like', 'plb_pulse_forge', '节拍熔炉 Pulse Forge');
  assert.equal(like.server_confirmed, true);
  assert.equal(like.status, 'eligible');
  const likeAgain = await bridge.engage('like', 'plb_pulse_forge', '节拍熔炉 Pulse Forge');
  assert.equal(likeAgain.idempotent, true);
  const save = await bridge.engage('save', 'plb_pulse_forge', '节拍熔炉 Pulse Forge');
  assert.equal(save.status, 'eligible');
  assert.equal(save.points, 0);

  // 发现：服务端已发布内容可按关键词检索
  const found = await bridge.discover('节拍');
  assert.ok(found.some(item => item.id === 'content_mobilearcade_plb_pulse_forge'));
  assert.ok(found.every(item => item.publicUrl));

  // 会话恢复：新建一个桥接实例（模拟刷新），仅凭 cookie resume
  const fresh = { location: sandbox.location, fetch: sandbox.fetch };
  new Function('window', 'globalThis', 'location', 'fetch', source)(fresh, fresh, fresh.location, fresh.fetch);
  const freshBridge = fresh.AirvanaLocalApiBridge;
  assert.equal(await freshBridge.resume(), true);
  assert.equal(freshBridge.ready, true);
  assert.equal(freshBridge.state.me.id, me.id);
});
