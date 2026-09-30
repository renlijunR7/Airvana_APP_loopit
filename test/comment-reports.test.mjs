import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app.mjs';
import { submitCommentReport } from '../src/comment-reports.mjs';

let app, server, base, author, reporter, admin, contentId, sequence = 0;
async function request(path, cookie, body, method = body ? 'POST' : 'GET') {
  const response = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
}
async function login(role, persona) {
  const result = await request('/api/auth/demo', null, { role, persona });
  assert.equal(result.status, 200);
  return result.cookie;
}
async function comment() {
  const result = await request(`/api/contents/${contentId}/comments`, author, { body: `Report fixture ${++sequence}` });
  assert.equal(result.status, 201);
  return result.data.comment;
}
before(async () => {
  app = createApp({ dbFile: ':memory:', allowDemo: true, disableWorker: true, env: { API_RATE_LIMIT: '2000', AUTH_RATE_LIMIT: '500' } });
  server = http.createServer(app.handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  author = await login('creator', 'comment-author');
  reporter = await login('creator', 'comment-reporter');
  admin = await login('admin', 'comment-admin');
  const registered = await request('/api/demo/mobile-playables', reporter, { playables: [{ key: 'report-test', title: 'Comment report test' }] });
  contentId = registered.data.mapping['report-test'];
});
after(async () => {
  server.closeAllConnections?.();
  await new Promise(resolve => server.close(resolve));
  app.close();
});

test('real comment reports use canonical snapshots and deduplicate across reasons', async () => {
  const original = await comment();
  const payload = { contentId, commentId: original.id, reason: 'spam', author: 'Forged author', body: 'Forged evidence', details: '重复广告' };
  const first = await request('/api/comment-reports', reporter, payload);
  assert.equal(first.status, 201);
  assert.equal(first.data.report.demo, false);
  assert.equal(first.data.report.alreadyReported, false);
  const second = await request('/api/comment-reports', reporter, { ...payload, reason: 'privacy' });
  assert.equal(second.status, 200);
  assert.equal(second.data.report.id, first.data.report.id);
  assert.equal(second.data.report.alreadyReported, true);
  const rows = app.db.prepare('SELECT * FROM comment_reports WHERE comment_id=?').all(original.id);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].body_snapshot, original.body);
  assert.equal(rows[0].author_snapshot, original.authorName);
  assert.equal(app.db.prepare('SELECT status FROM content_comments WHERE id=?').get(original.id).status, 'visible');
});

test('authentication, ownership, comment/content matching and validation are enforced', async () => {
  const original = await comment();
  const payload = { contentId, commentId: original.id, reason: 'spam' };
  assert.equal((await request('/api/comment-reports', null, payload)).status, 401);
  assert.equal((await request('/api/comment-reports', author, payload)).status, 409);
  for (const patch of [{ reason: 'unsupported' }, { reason: 'other', details: '  ' }, { details: 'x'.repeat(501) }, { demoCommentKey: 'demo-mina' }]) {
    assert.equal((await request('/api/comment-reports', reporter, { ...payload, ...patch })).status, 400);
  }
  assert.equal((await request('/api/comment-reports', reporter, { ...payload, commentId: 'missing' })).status, 404);
  const another = await request('/api/demo/mobile-playables', reporter, { playables: [{ key: 'other-report-test', title: 'Other' }] });
  assert.equal((await request('/api/comment-reports', reporter, { ...payload, contentId: another.data.mapping['other-report-test'] })).status, 404);
  await request(`/api/comments/${original.id}`, author, undefined, 'DELETE');
  assert.equal((await request('/api/comment-reports', reporter, payload)).status, 404);
});

test('demo comments are explicitly labelled and cannot spoof comments or run when demo is disabled', async () => {
  const payload = { contentId, demoCommentKey: 'demo-mina', reason: 'other', details: '演示流程验证' };
  const first = await request('/api/comment-reports', reporter, payload);
  assert.equal(first.status, 201);
  assert.equal(first.data.report.demo, true);
  assert.equal(app.db.prepare('SELECT body_snapshot FROM comment_reports WHERE id=?').get(first.data.report.id).body_snapshot, '玩法节奏很清楚，失败后也能立即重试。');
  assert.equal((await request('/api/comment-reports', reporter, { ...payload, demoCommentKey: 'invented' })).status, 404);
  const user = app.db.prepare('SELECT * FROM users WHERE email=?').get('demo:creator:comment-reporter@airvana.local');
  assert.throws(() => submitCommentReport(app.db, user, payload, { allowDemo: false }), /演示/);
  assert.equal((await request(`/api/admin/comment-reports/${first.data.report.id}/resolve`, admin, { action: 'remove' })).status, 400);
});

test('only reporter/admin can read reports and only admin can resolve a real report', async () => {
  const original = await comment();
  const result = await request('/api/comment-reports', reporter, { contentId, commentId: original.id, reason: 'harassment' });
  const id = result.data.report.id;
  assert.equal((await request('/api/comment-reports', null)).status, 401);
  assert.equal((await request('/api/comment-reports', author)).data.reports.length, 0);
  assert.ok((await request('/api/comment-reports', admin)).data.reports.some(row => row.id === id));
  assert.equal((await request(`/api/admin/comment-reports/${id}/resolve`, reporter, { action: 'remove' })).status, 403);
  const resolved = await request(`/api/admin/comment-reports/${id}/resolve`, admin, { action: 'remove', note: 'Test moderation' });
  assert.equal(resolved.data.report.status, 'resolved');
  const repeated = await request(`/api/admin/comment-reports/${id}/resolve`, admin, { action: 'dismiss' });
  assert.equal(repeated.data.report.idempotent, true);
  assert.equal(repeated.data.report.resolutionAction, 'remove');
  const comments = await request(`/api/contents/${contentId}/comments`, reporter);
  assert.ok(!comments.data.comments.some(item => item.id === original.id));
  assert.equal(app.db.prepare('SELECT status FROM contents WHERE id=?').get(contentId).status, 'published');
});

test('dismissed reports retain their receipt and real ownership is returned for comments', async () => {
  const original = await comment();
  const payload = { contentId, commentId: original.id, reason: 'unsafe' };
  const first = await request('/api/comment-reports', reporter, payload);
  await request(`/api/admin/comment-reports/${first.data.report.id}/resolve`, admin, { action: 'dismiss' });
  const again = await request('/api/comment-reports', reporter, payload);
  assert.equal(again.data.report.status, 'resolved');
  assert.equal(again.data.report.alreadyReported, true);
  assert.equal((await request(`/api/contents/${contentId}/comments`, author)).data.comments.find(row => row.id === original.id).owned, true);
  assert.equal((await request(`/api/contents/${contentId}/comments`, reporter)).data.comments.find(row => row.id === original.id).owned, false);
});

test('new reports are rate limited without blocking duplicate receipt recovery', async () => {
  const user = app.db.prepare('SELECT * FROM users WHERE email=?').get('demo:creator:comment-reporter@airvana.local');
  // Exercise the rate limit with persisted records without creating artificial comments.
  const count = app.db.prepare('SELECT COUNT(*) n FROM comment_reports WHERE reporter_user_id=?').get(user.id).n;
  const sample = app.db.prepare('SELECT * FROM comment_reports WHERE reporter_user_id=? LIMIT 1').get(user.id);
  for (let n = count; n < 10; n++) {
    app.db.prepare(`INSERT INTO comment_reports (id,reporter_user_id,content_id,target_key,author_snapshot,body_snapshot,reason,details,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .run(`limit_${n}`, user.id, contentId, `limit_${n}`, 'Fixture', 'Fixture', 'spam', '', new Date().toISOString(), new Date().toISOString());
  }
  assert.equal((await request('/api/comment-reports', reporter, { contentId, demoCommentKey: 'demo-leo', reason: 'spam' })).status, 429);
  const originalTarget = sample.demo ? { demoCommentKey: sample.target_key } : { commentId: sample.comment_id };
  assert.equal((await request('/api/comment-reports', reporter, { contentId, ...originalTarget, reason: 'spam' })).data.report.alreadyReported, true);
});
