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

async function req(path, { method = 'GET', body, cookie, device = 'evolution-device' } = {}) {
  const response = await fetch(base + path, {
    method, redirect: 'manual',
    headers: { 'Content-Type': 'application/json', 'X-Airvana-Device': device, ...(cookie ? { Cookie: cookie } : {}) },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  return { response, data, cookie: response.headers.get('set-cookie')?.split(';')[0] };
}

async function login(role, persona) {
  const result = await req('/api/auth/demo', { method: 'POST', body: { role, persona } });
  return { cookie: result.cookie, me: result.data.me };
}

const waitFor = async (fn, tries = 40, delay = 120) => {
  for (let i = 0; i < tries; i += 1) { const v = await fn(); if (v) return v; await new Promise(r => setTimeout(r, delay)); }
  return null;
};

const LOCKED = ['commercial', 'audience.included_regions', 'audience.excluded_regions', 'audience.minimum_age', 'cta.destination', 'reward', 'compliance', 'data_policy', 'attribution.model', 'attribution.window_days', 'measurement.primary_success_event', 'approval', 'release.kill_switch'];

async function approvedCampaign(brand, admin, id, version = 'v1') {
  const now = new Date().toISOString();
  app.db.prepare(`INSERT INTO campaigns(id,brand_user_id,title,objective,status,brief_json,budget_ait,reward_ait,starts_at,ends_at,created_at,updated_at)
    VALUES (?,?,?,?, 'active','{"contentTypes":["game"]}',1000,100,?,?,?,?)`)
    .run(id, brand.me.id, `Campaign ${id}`, '演进验证', now, new Date(Date.now() + 86_400_000).toISOString(), now, now);
  await req(`/api/campaigns/${id}/economy-contract`, { method: 'POST', cookie: brand.cookie, body: {
    contractVersion: version, primarySuccessEvent: 'playable_complete', playerRule: {}, creatorRule: { amountAit: 100 },
    attribution: {}, eligibility: {}, budget: { totalAit: 1000 }, settlement: { cashEnabled: false, benefitTypes: ['x'] }, lockedFields: LOCKED,
  } });
  await req(`/api/admin/campaigns/${id}/economy-contract/approve`, { method: 'POST', cookie: admin.cookie, body: { contractVersion: version } });
  return id;
}

// ===== P2-1 AI 分身场景隔离 =====

test('ai twin scenes isolate knowledge per scene and require an approved contract for campaign scenes', async () => {
  const brand = await login('brand', 'ev-brand');
  const admin = await login('admin', 'ev-admin');
  const kol = await login('creator', 'ev-kol');
  const campaignId = await approvedCampaign(brand, admin, 'campaign-scene');

  // 无分身时不能建场景
  assert.equal((await req('/api/ai-twin/scenes', { method: 'POST', cookie: kol.cookie, body: { name: 'x' } })).response.status, 409);
  await req('/api/ai-twin', { method: 'POST', cookie: kol.cookie, body: { displayName: '场景分身' } });

  // 通用场景
  const general = await req('/api/ai-twin/scenes', { method: 'POST', cookie: kol.cookie, body: { name: '日常问答', locale: 'zh-CN', knowledge: { faq: ['如何开始体验'] } } });
  assert.equal(general.response.status, 201);
  assert.equal(general.data.scene.kind, 'general');

  // Campaign 场景：未获资格 → 403
  const notEligible = await req('/api/ai-twin/scenes', { method: 'POST', cookie: kol.cookie, body: { name: '品牌场景', campaignId, contractVersion: 'v1' } });
  assert.equal(notEligible.response.status, 403);

  const now = new Date().toISOString();
  app.db.prepare(`INSERT INTO campaign_participants(id,campaign_id,creator_user_id,status,created_at,updated_at) VALUES ('cp-scene',?,?,?,?,?)`)
    .run(campaignId, kol.me.id, 'eligible', now, now);

  // 未获批版本 → 409
  assert.equal((await req('/api/ai-twin/scenes', { method: 'POST', cookie: kol.cookie, body: { name: '品牌场景', campaignId, contractVersion: 'v9' } })).response.status, 409);

  const campaignScene = await req('/api/ai-twin/scenes', { method: 'POST', cookie: kol.cookie, body: {
    name: '品牌场景', campaignId, contractVersion: 'v1', locale: 'en-US', knowledge: { brandFacts: ['仅限该 Campaign 的话术'] },
  } });
  assert.equal(campaignScene.response.status, 201);
  assert.equal(campaignScene.data.scene.campaign_id, campaignId);
  assert.equal(campaignScene.data.scene.contract_version, 'v1');

  // 知识隔离：各场景只返回自身知识，不跨场景合并
  const generalKnowledge = await req(`/api/ai-twin/scenes/${general.data.scene.id}/knowledge`, { cookie: kol.cookie });
  assert.deepEqual(generalKnowledge.data.knowledge.faq, ['如何开始体验']);
  assert.equal(generalKnowledge.data.knowledge.brandFacts, undefined, '通用场景不得看到 Campaign 知识');
  const campaignKnowledge = await req(`/api/ai-twin/scenes/${campaignScene.data.scene.id}/knowledge`, { cookie: kol.cookie });
  assert.deepEqual(campaignKnowledge.data.knowledge.brandFacts, ['仅限该 Campaign 的话术']);
  assert.equal(campaignKnowledge.data.knowledge.faq, undefined, 'Campaign 场景不得看到通用知识');
  assert.equal(campaignKnowledge.data.locale, 'en-US');

  // 他人不能读取
  const stranger = await login('creator', 'ev-stranger');
  assert.equal((await req(`/api/ai-twin/scenes/${general.data.scene.id}/knowledge`, { cookie: stranger.cookie })).response.status, 404);

  // 同名更新递增版本，不新建
  const updated = await req('/api/ai-twin/scenes', { method: 'POST', cookie: kol.cookie, body: { name: '日常问答', knowledge: { faq: ['更新后的问答'] } } });
  assert.equal(updated.data.updated, true);
  assert.equal(updated.data.scene.version, 2);
  assert.equal((await req('/api/ai-twin/scenes', { cookie: kol.cookie })).data.scenes.length, 2);
});

// ===== P2-2 Contract 签署与变更单 =====

test('contract signatures record each party once and creators must be eligible', async () => {
  const brand = await login('brand', 'ev2-brand');
  const admin = await login('admin', 'ev2-admin');
  const kol = await login('creator', 'ev2-kol');
  const campaignId = await approvedCampaign(brand, admin, 'campaign-sign');

  // 不存在的版本
  assert.equal((await req(`/api/campaigns/${campaignId}/contract-signatures`, { method: 'POST', cookie: brand.cookie, body: { contractVersion: 'v9' } })).response.status, 404);

  // 品牌签署
  const brandSign = await req(`/api/campaigns/${campaignId}/contract-signatures`, { method: 'POST', cookie: brand.cookie, body: { contractVersion: 'v1' } });
  assert.equal(brandSign.response.status, 201);
  assert.equal(brandSign.data.signature.signer_role, 'brand');
  // 幂等
  assert.equal((await req(`/api/campaigns/${campaignId}/contract-signatures`, { method: 'POST', cookie: brand.cookie, body: { contractVersion: 'v1' } })).data.idempotent, true);

  // 未获资格的创作者不能签
  assert.equal((await req(`/api/campaigns/${campaignId}/contract-signatures`, { method: 'POST', cookie: kol.cookie, body: { contractVersion: 'v1' } })).response.status, 403);

  const now = new Date().toISOString();
  app.db.prepare(`INSERT INTO campaign_participants(id,campaign_id,creator_user_id,status,created_at,updated_at) VALUES ('cp-sign',?,?,?,?,?)`)
    .run(campaignId, kol.me.id, 'eligible', now, now);
  const kolSign = await req(`/api/campaigns/${campaignId}/contract-signatures`, { method: 'POST', cookie: kol.cookie, body: { contractVersion: 'v1', statement: '我确认接受该 Contract 的交付与结算规则。' } });
  assert.equal(kolSign.data.signature.signer_role, 'creator');

  // 平台签署
  await req(`/api/campaigns/${campaignId}/contract-signatures`, { method: 'POST', cookie: admin.cookie, body: { contractVersion: 'v1' } });
  const listed = await req(`/api/campaigns/${campaignId}/contract-signatures`, { cookie: brand.cookie });
  assert.deepEqual(listed.data.signatures.map(s => s.signerRole).sort(), ['brand', 'creator', 'platform']);
});

test('contract change orders require declared fields and platform review; old versions stay read-only', async () => {
  const brand = await login('brand', 'ev3-brand');
  const admin = await login('admin', 'ev3-admin');
  const campaignId = await approvedCampaign(brand, admin, 'campaign-change');

  // 未声明变更字段 / 原因过短
  assert.equal((await req(`/api/campaigns/${campaignId}/contract-change-orders`, { method: 'POST', cookie: brand.cookie, body: { fromVersion: 'v1', toVersion: 'v2', changedFields: [], reason: '想改' } })).data.error.code, 'changed_fields_required');
  assert.equal((await req(`/api/campaigns/${campaignId}/contract-change-orders`, { method: 'POST', cookie: brand.cookie, body: { fromVersion: 'v1', toVersion: 'v2', changedFields: ['reward'], reason: '短' } })).data.error.code, 'reason_required');
  // 未获批的源版本
  assert.equal((await req(`/api/campaigns/${campaignId}/contract-change-orders`, { method: 'POST', cookie: brand.cookie, body: { fromVersion: 'v9', toVersion: 'v10', changedFields: ['reward'], reason: '提高单笔奖励额度' } })).data.error.code, 'source_version_not_approved');

  const order = await req(`/api/campaigns/${campaignId}/contract-change-orders`, { method: 'POST', cookie: brand.cookie, body: {
    fromVersion: 'v1', toVersion: 'v2', changedFields: ['reward', 'attribution.window_days'], reason: '根据首轮数据提高创作者单笔奖励并延长归因窗口。',
  } });
  assert.equal(order.response.status, 201);
  const orderId = order.data.changeOrder.id;

  // 非管理员不能复核
  assert.equal((await req(`/api/admin/contract-change-orders/${orderId}/review`, { method: 'POST', cookie: brand.cookie, body: { decision: 'approve' } })).response.status, 403);

  const approved = await req(`/api/admin/contract-change-orders/${orderId}/review`, { method: 'POST', cookie: admin.cookie, body: { decision: 'approve', note: '同意，请提交 v2 版本走正常审批' } });
  assert.equal(approved.data.changeOrder.status, 'approved');
  // 重复处理被拒
  assert.equal((await req(`/api/admin/contract-change-orders/${orderId}/review`, { method: 'POST', cookie: admin.cookie, body: { decision: 'reject' } })).response.status, 409);

  // 关键：批准变更单不会改写旧版本（旧版本只读保留）
  const v1 = app.db.prepare(`SELECT status FROM campaign_economy_rules WHERE campaign_id=? AND contract_version='v1'`).get(campaignId);
  assert.equal(v1.status, 'approved', '旧版本必须保持原状，变更需另行提交新版本');
  assert.equal(app.db.prepare(`SELECT COUNT(*) n FROM campaign_economy_rules WHERE campaign_id=?`).get(campaignId).n, 1, '变更单本身不得凭空创建新版本');

  const listed = await req(`/api/campaigns/${campaignId}/contract-change-orders`, { cookie: brand.cookie });
  assert.deepEqual(listed.data.changeOrders[0].changedFields, ['reward', 'attribution.window_days']);
});

// ===== P2-3 受控实验与灰度 =====

test('experiments only touch optimizable fields, assign stickily and follow a guarded state machine', async () => {
  const creator = await login('creator', 'ev4-creator');
  const agent = await req('/api/agents', { method: 'POST', cookie: creator.cookie, body: { name: 'Exp Agent', contentType: 'all', permissions: { draft: true } } });
  const task = await req('/api/tasks', { method: 'POST', cookie: creator.cookie, body: { agentId: agent.data.agent.id, title: '实验内容', contentType: 'game', prompt: '用于验证受控实验与灰度的互动内容说明文本。', idempotencyKey: 'exp-task' } });
  const contentId = task.data.content.id;
  await waitFor(async () => (await req(`/api/tasks/${task.data.task.id}`, { cookie: creator.cookie })).data.task.status === 'review_pending');
  await req(`/api/tasks/${task.data.task.id}/review`, { method: 'POST', cookie: creator.cookie, body: { decision: 'approve' } });
  await req(`/api/contents/${contentId}/publish`, { method: 'POST', cookie: creator.cookie });

  // 锁定字段不能进实验
  const locked = await req(`/api/contents/${contentId}/experiments`, { method: 'POST', cookie: creator.cookie, body: {
    name: '奖励实验', hypothesis: '提高奖励能提升完成率', variantField: 'reward', controlValue: '5', variantValue: '10',
  } });
  assert.equal(locked.response.status, 409);
  assert.equal(locked.data.error.code, 'field_not_optimizable');

  const exp = await req(`/api/contents/${contentId}/experiments`, { method: 'POST', cookie: creator.cookie, body: {
    name: '标题实验', hypothesis: '更具体的标题能提升开始率', variantField: 'title',
    controlValue: '钱包安全挑战', variantValue: '3 分钟识破钓鱼签名', rolloutPercent: 50,
  } });
  assert.equal(exp.response.status, 201);
  const expId = exp.data.experiment.id;

  // draft 状态不分流
  assert.equal((await req(`/api/experiments/${expId}/assignment`, { cookie: creator.cookie })).data.reason, 'experiment_not_running');
  // 状态机：draft 不能直接 completed
  assert.equal((await req(`/api/experiments/${expId}/status`, { method: 'POST', cookie: creator.cookie, body: { status: 'completed' } })).response.status, 409);
  assert.equal((await req(`/api/experiments/${expId}/status`, { method: 'POST', cookie: creator.cookie, body: { status: 'running' } })).data.experiment.status, 'running');

  // 稳定分桶：同一用户多次请求得到同一分支
  const first = await req(`/api/experiments/${expId}/assignment`, { cookie: creator.cookie });
  assert.ok(['control', 'variant'].includes(first.data.variant));
  const again = await req(`/api/experiments/${expId}/assignment`, { cookie: creator.cookie });
  assert.equal(again.data.variant, first.data.variant);
  assert.equal(again.data.sticky, true);

  // 多用户分流后两个分支都应出现（50% 灰度，8 个用户）
  const variants = new Set([first.data.variant]);
  for (let i = 0; i < 8; i += 1) {
    const u = await login('creator', `ev4-p${i}`);
    variants.add((await req(`/api/experiments/${expId}/assignment`, { cookie: u.cookie })).data.variant);
  }
  assert.equal(variants.size, 2, '50% 灰度下应同时出现 control 与 variant');

  // 回滚后终态不可再变
  assert.equal((await req(`/api/experiments/${expId}/status`, { method: 'POST', cookie: creator.cookie, body: { status: 'rolled_back' } })).data.experiment.status, 'rolled_back');
  assert.equal((await req(`/api/experiments/${expId}/status`, { method: 'POST', cookie: creator.cookie, body: { status: 'running' } })).response.status, 409);

  const listed = await req(`/api/contents/${contentId}/experiments`, { cookie: creator.cookie });
  assert.equal(listed.data.experiments[0].assignments, 9);
});
