import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app.mjs';

let app;
let server;
let base;

before(async () => {
  app = createApp({ dbFile: ':memory:', allowDemo: true, disableWorker: true, env: { AI_PROVIDER: 'local', APP_SECRET: 'test-secret', API_RATE_LIMIT: '2000', AUTH_RATE_LIMIT: '500' } });
  server = http.createServer(app.handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.closeAllConnections?.();
  await new Promise(resolve => server.close(resolve));
  app.close();
});

async function req(path, { method = 'GET', body, cookie, device = 'social-device-01' } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Airvana-Device': device, ...(cookie ? { Cookie: cookie } : {}) },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  return { response, data, cookie: response.headers.get('set-cookie')?.split(';')[0] };
}

async function setup() {
  const login = await req('/api/auth/demo', { method: 'POST', body: { role: 'creator', persona: 'social-player' } });
  const registered = await req('/api/demo/mobile-playables', { method: 'POST', cookie: login.cookie, body: { playables: [{ key: 'plb_social_demo', title: '社交演示游戏' }] } });
  return { cookie: login.cookie, me: login.data.me, contentId: registered.data.mapping.plb_social_demo };
}

test('comments create, list, soft-delete with ownership and rate limits', async () => {
  const { cookie, contentId } = await setup();

  const created = await req(`/api/contents/${contentId}/comments`, { method: 'POST', cookie, body: { body: '这个合成游戏的第三阶段很上头！' } });
  assert.equal(created.response.status, 201);
  assert.equal(created.data.comment.body, '这个合成游戏的第三阶段很上头！');

  const empty = await req(`/api/contents/${contentId}/comments`, { method: 'POST', cookie, body: { body: '   ' } });
  assert.equal(empty.response.status, 400);

  const listed = await req(`/api/contents/${contentId}/comments`, { cookie });
  assert.equal(listed.data.comments.length, 1);
  assert.equal(listed.data.comments[0].id, created.data.comment.id);

  // 他人不能删除
  const other = await req('/api/auth/demo', { method: 'POST', body: { role: 'creator', persona: 'social-other' } });
  const forbidden = await req(`/api/comments/${created.data.comment.id}`, { method: 'DELETE', cookie: other.cookie });
  assert.equal(forbidden.response.status, 403);

  // 本人软删除后列表不再返回
  assert.equal((await req(`/api/comments/${created.data.comment.id}`, { method: 'DELETE', cookie })).response.status, 200);
  assert.equal((await req(`/api/contents/${contentId}/comments`, { cookie })).data.comments.length, 0);
  assert.equal(app.db.prepare('SELECT status FROM content_comments WHERE id=?').get(created.data.comment.id).status, 'deleted');

  // 每分钟 10 条频率限制（首条评论已占用窗口，软删除的记录同样计数）
  for (let i = 0; i < 9; i += 1) {
    assert.equal((await req(`/api/contents/${contentId}/comments`, { method: 'POST', cookie, body: { body: `评论 ${i}` } })).response.status, 201);
  }
  assert.equal((await req(`/api/contents/${contentId}/comments`, { method: 'POST', cookie, body: { body: '第 11 条' } })).response.status, 429);
});

test('follows are idempotent, reject self-follow, resolve by content owner, and surface in bootstrap', async () => {
  const { cookie, contentId } = await setup();

  const followed = await req('/api/follows', { method: 'POST', cookie, body: { contentId } });
  assert.equal(followed.response.status, 201);
  const followeeId = followed.data.followeeUserId;

  const again = await req('/api/follows', { method: 'POST', cookie, body: { contentId } });
  assert.equal(again.data.idempotent, true);

  const self = await req('/api/follows', { method: 'POST', cookie, body: { userId: (await req('/api/bootstrap', { cookie })).data.me.id } });
  assert.equal(self.response.status, 409);
  assert.equal(self.data.error.code, 'self_follow');

  const boot = await req('/api/bootstrap', { cookie });
  assert.equal(boot.data.following.length, 1);
  assert.equal(boot.data.following[0].userId, followeeId);

  // 被关注方的粉丝数
  const arcadeLogin = await req('/api/auth/demo', { method: 'POST', body: { role: 'creator', persona: 'arcade' } });
  assert.ok((await req('/api/bootstrap', { cookie: arcadeLogin.cookie })).data.followerCount >= 1);

  // 取关
  assert.equal((await req('/api/follows/remove', { method: 'POST', cookie, body: { contentId } })).data.removed, true);
  assert.equal((await req('/api/bootstrap', { cookie })).data.following.length, 0);
  assert.equal((await req('/api/follows/remove', { method: 'POST', cookie, body: { contentId } })).data.removed, false);
});

test('notifications feed and social summary expose server-authoritative numbers', async () => {
  const { cookie, contentId } = await setup();

  // 关注 + 点赞 → 被关注方（arcade）能看到通知与真实社交数字
  await req('/api/follows', { method: 'POST', cookie, body: { contentId } });
  await req('/api/engagements', { method: 'POST', cookie, body: { eventType: 'like', contentId, eventKey: `like:${contentId}:summary-test` } });

  const mine = await req('/api/social/summary', { cookie });
  assert.equal(mine.response.status, 200);
  assert.ok(mine.data.followingCount >= 1);

  const arcade = await req('/api/auth/demo', { method: 'POST', body: { role: 'creator', persona: 'arcade' } });
  const theirs = await req('/api/social/summary', { cookie: arcade.cookie });
  assert.ok(theirs.data.followerCount >= 1);
  assert.ok(theirs.data.likesReceived >= 1);

  const inbox = await req('/api/notifications', { cookie: arcade.cookie });
  assert.equal(inbox.response.status, 200);
  assert.ok(inbox.data.notifications.some(item => item.title === '新粉丝'));
  assert.ok(inbox.data.unread >= 1);

  const readAll = await req('/api/notifications/read-all', { method: 'POST', cookie: arcade.cookie });
  assert.ok(readAll.data.updated >= 1);
  assert.equal((await req('/api/notifications', { cookie: arcade.cookie })).data.unread, 0);
});
