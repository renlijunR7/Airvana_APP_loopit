import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app.mjs';

let app;
let server;
let base;

before(async () => {
  app = createApp({ dbFile: ':memory:', allowDemo: true, disableWorker: false, env: { AI_PROVIDER: 'local', APP_SECRET: 'test-secret', RUNTIME_MIN_DURATION_MS: '0', API_RATE_LIMIT: '5000', AUTH_RATE_LIMIT: '1000' } });
  server = http.createServer(app.handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.closeAllConnections?.();
  await new Promise(resolve => server.close(resolve));
  app.close();
});

async function req(path, { method = 'GET', body, cookie, device = 'tier-device-01' } = {}) {
  const response = await fetch(base + path, {
    method,
    redirect: 'manual',
    headers: { 'Content-Type': 'application/json', 'X-Airvana-Device': device, ...(cookie ? { Cookie: cookie } : {}) },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  return { response, data, cookie: response.headers.get('set-cookie')?.split(';')[0] };
}

async function login(role, persona) {
  const result = await req('/api/auth/demo', { method: 'POST', body: { role, persona } });
  assert.equal(result.response.status, 200);
  return { cookie: result.cookie, me: result.data.me };
}

const waitFor = async (fn, tries = 40, delay = 120) => {
  for (let i = 0; i < tries; i += 1) {
    const value = await fn();
    if (value) return value;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  return null;
};

// ============ 第 1 批：速胜包 ============

test('tier1: server check-in posts daily AIP once and reports streak', async () => {
  const user = await login('creator', 'tier1-checkin');
  const first = await req('/api/economy/check-in', { method: 'POST', cookie: user.cookie });
  assert.equal(first.data.idempotent, false);
  assert.ok(first.data.baseReward > 0);
  assert.equal(first.data.streak, 1);
  const again = await req('/api/economy/check-in', { method: 'POST', cookie: user.cookie });
  assert.equal(again.data.idempotent, true);
});

test('tier1: creation consume is idempotent and draws subscription allowance before AIP', async () => {
  const user = await login('creator', 'tier1-consume');
  const quote = await req('/api/economy/creation/quote?usageType=light_creation', { cookie: user.cookie });
  assert.equal(quote.response.status, 200);
  const key = 'tier1-consume-key-1';
  const first = await req('/api/economy/creation/consume', { method: 'POST', cookie: user.cookie, body: { usageType: 'light_creation', idempotencyKey: key, subjectType: 'content', subjectId: 'tier1-demo-content' } });
  assert.equal(first.response.status, 201);
  const replay = await req('/api/economy/creation/consume', { method: 'POST', cookie: user.cookie, body: { usageType: 'light_creation', idempotencyKey: key, subjectType: 'content', subjectId: 'tier1-demo-content' } });
  assert.equal(replay.data.idempotent, true);
});

// ============ 第 2 批：创作者资格链 ============

test('tier2: creator application walks kyc_pending → under_review → approved and updates the economy profile', async () => {
  const applicant = await login('creator', 'tier2-applicant');
  const admin = await login('admin', 'tier2-admin');
  app.db.prepare(`UPDATE economy_profiles SET creator_status='none',kyc_status='none' WHERE user_id=?`).run(applicant.me.id);

  const short = await req('/api/creator-applications', { method: 'POST', cookie: applicant.cookie, body: { applicationNote: '太短', regionCode: 'SG', kycConsent: true } });
  assert.equal(short.response.status, 400);

  const submitted = await req('/api/creator-applications', { method: 'POST', cookie: applicant.cookie, body: { applicationNote: '我计划长期创作钱包安全教育类互动游戏，服务 Web3 新手用户。', regionCode: 'SG', kycConsent: true } });
  assert.equal(submitted.response.status, 201);
  const appId = submitted.data.application.id;
  assert.equal(submitted.data.application.status, 'kyc_pending');

  // 未 KYC 直接批准被拒
  const early = await req(`/api/admin/creator-applications/${appId}/review`, { method: 'POST', cookie: admin.cookie, body: { decision: 'approve' } });
  assert.equal(early.response.status, 409);

  const kyc = await req(`/api/admin/creator-applications/${appId}/review`, { method: 'POST', cookie: admin.cookie, body: { decision: 'verify_kyc', evidenceReference: 'kyc-provider:tier2-001' } });
  assert.equal(kyc.data.application.status, 'under_review');
  const approved = await req(`/api/admin/creator-applications/${appId}/review`, { method: 'POST', cookie: admin.cookie, body: { decision: 'approve', note: '资料完整' } });
  assert.equal(approved.data.application.status, 'approved');

  const profile = app.db.prepare('SELECT creator_status,kyc_status FROM economy_profiles WHERE user_id=?').get(applicant.me.id);
  assert.equal(profile.kyc_status, 'verified');
});

// ============ 第 3 批：移动端创作管线 ============

test('tier3: mobile pipeline agent→task→worker→review→publish yields a discoverable served artifact', async () => {
  const creator = await login('creator', 'tier3-pipeline');
  const agent = await req('/api/agents', { method: 'POST', cookie: creator.cookie, body: { name: '移动端创作 Agent', contentType: 'all', reviewMode: 'human', permissions: { draft: true } } });
  assert.equal(agent.response.status, 201);

  const task = await req('/api/tasks', { method: 'POST', cookie: creator.cookie, body: { agentId: agent.data.agent.id, title: '管线验收互动游戏', contentType: 'game', prompt: '一个教用户识别钓鱼签名请求的三关互动挑战，每关给出即时反馈。', creationMode: 'light', idempotencyKey: 'tier3-task-1' } });
  assert.equal(task.response.status, 202);
  const taskId = task.data.task.id;
  const contentId = task.data.content.id;

  // GET /api/tasks/:id：他人不可见
  const stranger = await login('creator', 'tier3-stranger');
  assert.equal((await req(`/api/tasks/${taskId}`, { cookie: stranger.cookie })).response.status, 404);

  // 等 worker 跑到待审核
  const pending = await waitFor(async () => {
    const state = await req(`/api/tasks/${taskId}`, { cookie: creator.cookie });
    return state.data.task && state.data.task.status === 'review_pending' ? state : null;
  });
  assert.ok(pending, 'worker 应在超时前进入 review_pending');

  const reviewed = await req(`/api/tasks/${taskId}/review`, { method: 'POST', cookie: creator.cookie, body: { decision: 'approve' } });
  assert.equal(reviewed.response.status, 200);
  const published = await req(`/api/contents/${contentId}/publish`, { method: 'POST', cookie: creator.cookie });
  assert.equal(published.response.status, 200);

  const artifact = app.db.prepare(`SELECT status FROM content_artifacts WHERE content_id=? ORDER BY version DESC LIMIT 1`).get(contentId);
  assert.equal(artifact.status, 'ready');

  // 他人可发现并可推广不了（非 owner）；owner 可 Boost（先给 AIP）
  const found = await req('/api/discover?q=管线验收', { cookie: stranger.cookie });
  assert.ok(found.data.results.some(item => item.id === contentId));
  app.db.prepare(`INSERT INTO point_events (id,user_id,currency,amount,status,event_type,event_key,subject_type,subject_id,metadata_json,created_at) VALUES ('pe-tier3','${creator.me.id}','AIP',50,'posted','test','tier3-aip','user','${creator.me.id}','{}','2026-08-20T00:00:00.000Z')`).run();
  const boost = await req(`/api/contents/${contentId}/boost`, { method: 'POST', cookie: creator.cookie });
  assert.equal(boost.response.status, 201);
  assert.ok(boost.data.expiresAt);
});

// ============ 第 4 批：私信 ============

test('tier4: direct messages support open, send, unread, read, recall and rate limits', async () => {
  const a = await login('creator', 'tier4-dm-a');
  const b = await login('creator', 'tier4-dm-b');

  const selfTalk = await req('/api/dm/conversations', { method: 'POST', cookie: a.cookie, body: { userId: a.me.id } });
  assert.equal(selfTalk.response.status, 409);

  const opened = await req('/api/dm/conversations', { method: 'POST', cookie: a.cookie, body: { userId: b.me.id } });
  assert.equal(opened.response.status, 200);
  const convId = opened.data.conversation.id;
  const reopened = await req('/api/dm/conversations', { method: 'POST', cookie: b.cookie, body: { userId: a.me.id } });
  assert.equal(reopened.data.conversation.id, convId);

  const sent = await req(`/api/dm/conversations/${convId}/messages`, { method: 'POST', cookie: a.cookie, body: { body: '你好，看到你的作品很棒！' } });
  assert.equal(sent.response.status, 201);

  // B 的会话列表出现 1 条未读
  const listB = await req('/api/dm/conversations', { cookie: b.cookie });
  const convForB = listB.data.conversations.find(item => item.id === convId);
  assert.equal(convForB.unread, 1);
  assert.equal(convForB.peerId, a.me.id);

  // 读取即已读
  const messages = await req(`/api/dm/conversations/${convId}/messages`, { cookie: b.cookie });
  assert.equal(messages.data.messages.length, 1);
  assert.equal((await req('/api/dm/conversations', { cookie: b.cookie })).data.conversations.find(item => item.id === convId).unread, 0);

  // 撤回：仅发送者、2 分钟窗口内
  const msgId = sent.data.message.id;
  assert.equal((await req(`/api/dm/messages/${msgId}/recall`, { method: 'POST', cookie: b.cookie })).response.status, 404);
  assert.equal((await req(`/api/dm/messages/${msgId}/recall`, { method: 'POST', cookie: a.cookie })).data.recalled, true);
  const afterRecall = await req(`/api/dm/conversations/${convId}/messages`, { cookie: b.cookie });
  assert.equal(afterRecall.data.messages[0].recalled, true);
  assert.equal(afterRecall.data.messages[0].body, '');

  // 频率限制 20/分钟
  for (let i = 0; i < 19; i += 1) {
    assert.equal((await req(`/api/dm/conversations/${convId}/messages`, { method: 'POST', cookie: a.cookie, body: { body: `msg ${i}` } })).response.status, 201);
  }
  assert.equal((await req(`/api/dm/conversations/${convId}/messages`, { method: 'POST', cookie: a.cookie, body: { body: 'overflow' } })).response.status, 429);

  // 对方收到私信通知
  const inbox = await req('/api/notifications', { cookie: b.cookie });
  assert.ok(inbox.data.notifications.some(item => item.title === '收到新私信'));
});

// ============ 第 4 批：客服工单 ============

test('tier4: support tickets flow open → replied → closed with user notification', async () => {
  const user = await login('creator', 'tier4-ticket-user');
  const admin = await login('admin', 'tier4-ticket-admin');

  const bad = await req('/api/support-tickets', { method: 'POST', cookie: user.cookie, body: { category: 'bug', subject: ' ', body: ' ' } });
  assert.equal(bad.response.status, 400);

  const created = await req('/api/support-tickets', { method: 'POST', cookie: user.cookie, body: { category: 'points', subject: '签到 AIP 没有到账', body: '今天签到后钱包页没有看到新增 AIP，请协助核对账本。' } });
  assert.equal(created.response.status, 201);
  const ticketId = created.data.ticket.id;

  const adminList = await req('/api/support-tickets', { cookie: admin.cookie });
  assert.ok(adminList.data.tickets.some(item => item.id === ticketId && item.userName));

  const replied = await req(`/api/admin/support-tickets/${ticketId}/reply`, { method: 'POST', cookie: admin.cookie, body: { reply: '已核对：AIP 已入账，钱包页下拉刷新即可看到。' } });
  assert.equal(replied.data.ticket.status, 'replied');
  const closed = await req(`/api/admin/support-tickets/${ticketId}/reply`, { method: 'POST', cookie: admin.cookie, body: { reply: '问题已解决，关闭工单。', close: true } });
  assert.equal(closed.data.ticket.status, 'closed');

  const mine = await req('/api/support-tickets', { cookie: user.cookie });
  assert.equal(mine.data.tickets.find(item => item.id === ticketId).status, 'closed');
  const inbox = await req('/api/notifications', { cookie: user.cookie });
  assert.ok(inbox.data.notifications.some(item => item.category === 'support'));
});

// ============ 第 4 批：追踪链接与权威归因 ============

test('tier4: tracking links require eligibility, resolve with visit counts and bind runtime attribution', async () => {
  const brand = await login('brand', 'tier4-link-brand');
  const admin = await login('admin', 'tier4-link-admin');
  const kol = await login('creator', 'tier4-link-kol');
  const player = await login('creator', 'tier4-link-player');

  const now = new Date().toISOString();
  const campaignId = 'campaign-tier4-links';
  app.db.prepare(`INSERT INTO campaigns(id,brand_user_id,title,objective,status,brief_json,budget_ait,reward_ait,starts_at,ends_at,created_at,updated_at)
    VALUES (?,?,?,?, 'active','{}',500,100,?,?,?,?)`)
    .run(campaignId, brand.me.id, 'Tier4 链接 Campaign', '验证权威归因链接', now, new Date(Date.now() + 86_400_000).toISOString(), now, now);

  // KOL 发布一条自己的内容（走真实管线）
  const agent = await req('/api/agents', { method: 'POST', cookie: kol.cookie, body: { name: 'Link Agent', contentType: 'all', permissions: { draft: true } } });
  const task = await req('/api/tasks', { method: 'POST', cookie: kol.cookie, body: { agentId: agent.data.agent.id, title: '链接归因互动内容', contentType: 'game', prompt: '为品牌活动准备的互动挑战，包含清晰的开始与完成节点。', idempotencyKey: 'tier4-link-task' } });
  const contentId = task.data.content.id;
  await waitFor(async () => (await req(`/api/tasks/${task.data.task.id}`, { cookie: kol.cookie })).data.task.status === 'review_pending');
  await req(`/api/tasks/${task.data.task.id}/review`, { method: 'POST', cookie: kol.cookie, body: { decision: 'approve' } });
  await req(`/api/contents/${contentId}/publish`, { method: 'POST', cookie: kol.cookie });

  // 未获资格 → 403
  const notEligible = await req(`/api/campaigns/${campaignId}/tracking-links`, { method: 'POST', cookie: kol.cookie, body: { contentId } });
  assert.equal(notEligible.response.status, 403);

  app.db.prepare(`INSERT INTO campaign_participants(id,campaign_id,creator_user_id,status,created_at,updated_at) VALUES ('cp-tier4',?,?,?,?,?)`)
    .run(campaignId, kol.me.id, 'eligible', now, now);

  const link = await req(`/api/campaigns/${campaignId}/tracking-links`, { method: 'POST', cookie: kol.cookie, body: { contentId, channelCode: 'telegram-pilot' } });
  assert.equal(link.response.status, 201);
  const linkId = link.data.link.linkId;
  const idem = await req(`/api/campaigns/${campaignId}/tracking-links`, { method: 'POST', cookie: kol.cookie, body: { contentId, channelCode: 'telegram-pilot' } });
  assert.equal(idem.data.link.idempotent, true);
  assert.equal(idem.data.link.linkId, linkId);

  // /l/:id 302 到内容公开页并计数
  const resolved = await req(`/l/${linkId}`, { cookie: player.cookie });
  assert.equal(resolved.response.status, 302);
  assert.match(resolved.response.headers.get('location'), new RegExp(`/content/${contentId}`));
  assert.equal(app.db.prepare('SELECT visits FROM tracking_links WHERE id=?').get(linkId).visits, 1);

  // 带 linkId 的运行会话 → 权威归因触点（含 link_id）
  const session = await req('/api/runtime/sessions', { method: 'POST', cookie: player.cookie, body: { contentId, linkId } });
  assert.equal(session.response.status, 201);
  const touch = app.db.prepare('SELECT campaign_id,creator_user_id,channel_code,link_id FROM attribution_touches WHERE link_id=?').get(linkId);
  assert.equal(touch.campaign_id, campaignId);
  assert.equal(touch.creator_user_id, kol.me.id);
  assert.equal(touch.channel_code, 'telegram-pilot');

  // 完成运行证明后归因漏斗补全
  const token = session.data.sessionToken;
  await req('/api/runtime/events', { method: 'POST', cookie: player.cookie, body: { sessionToken: token, sequence: 1, eventType: 'playable_start' } });
  await req('/api/runtime/events', { method: 'POST', cookie: player.cookie, body: { sessionToken: token, sequence: 2, eventType: 'step_complete' } });
  const done = await req('/api/runtime/events', { method: 'POST', cookie: player.cookie, body: { sessionToken: token, sequence: 3, eventType: 'playable_complete' } });
  assert.equal(done.response.status, 201);
  const touches = app.db.prepare('SELECT COUNT(*) n FROM attribution_touches WHERE campaign_id=?').get(campaignId).n;
  assert.ok(touches >= 2);
  assert.ok(admin);
});

// ============ 第 4 批：五人增长网络 ============

test('tier4: growth nodes enforce one primary, five seats, idempotent joins and activation at capacity', async () => {
  const owner = await login('creator', 'tier4-node-owner');
  const created = await req('/api/growth-nodes', { method: 'POST', cookie: owner.cookie, body: { name: '安全教育协作组' } });
  assert.equal(created.response.status, 201);
  const inviteCode = created.data.node.inviteCode;
  assert.equal(created.data.node.mySeat, 1);

  // 同账号不能再当主节点
  assert.equal((await req('/api/growth-nodes', { method: 'POST', cookie: owner.cookie, body: { name: '第二个' } })).response.status, 409);

  // 无效邀请码
  assert.equal((await req('/api/growth-nodes/join', { method: 'POST', cookie: owner.cookie, body: { inviteCode: 'NOPE0000' } })).response.status, 404);

  const members = [];
  for (let i = 0; i < 4; i += 1) {
    const member = await login('creator', `tier4-node-m${i}`);
    members.push(member);
    const joined = await req('/api/growth-nodes/join', { method: 'POST', cookie: member.cookie, body: { inviteCode } });
    assert.equal(joined.response.status, 200);
    assert.equal(joined.data.seat, i + 2);
  }

  // 幂等加入
  const rejoin = await req('/api/growth-nodes/join', { method: 'POST', cookie: members[0].cookie, body: { inviteCode } });
  assert.equal(rejoin.data.idempotent, true);

  // 第 6 人满员
  const sixth = await login('creator', 'tier4-node-m5');
  assert.equal((await req('/api/growth-nodes/join', { method: 'POST', cookie: sixth.cookie, body: { inviteCode } })).response.status, 409);

  // 满员即激活
  const view = await req('/api/growth-nodes', { cookie: owner.cookie });
  assert.equal(view.data.nodes[0].status, 'active');
  assert.equal(view.data.nodes[0].members.length, 5);
});
