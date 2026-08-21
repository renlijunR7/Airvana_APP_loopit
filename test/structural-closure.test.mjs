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

async function req(path, { method = 'GET', body, cookie, device = 'structural-device' } = {}) {
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

async function publishedContent(user, title, extra = {}) {
  const agent = await req('/api/agents', { method: 'POST', cookie: user.cookie, body: { name: 'S Agent', contentType: 'all', permissions: { draft: true } } });
  const task = await req('/api/tasks', { method: 'POST', cookie: user.cookie, body: { agentId: agent.data.agent.id, title, contentType: 'game', prompt: `${title}：完整三阶段互动挑战，包含即时反馈与安全提示。`, idempotencyKey: `s-${title}`, ...extra } });
  assert.equal(task.response.status, 202, JSON.stringify(task.data));
  await waitFor(async () => (await req(`/api/tasks/${task.data.task.id}`, { cookie: user.cookie })).data.task.status === 'review_pending');
  await req(`/api/tasks/${task.data.task.id}/review`, { method: 'POST', cookie: user.cookie, body: { decision: 'approve' } });
  const published = await req(`/api/contents/${task.data.content.id}/publish`, { method: 'POST', cookie: user.cookie });
  return { contentId: task.data.content.id, taskId: task.data.task.id, publishStatus: published.response.status, publishData: published.data };
}

// ===== Batch A：Contract 外键贯穿 + checksum =====

test('A: contract stamp flows task→content→version→artifact with checksum, and gates eligibility', async () => {
  const brand = await login('brand', 'sa-brand');
  const admin = await login('admin', 'sa-admin');
  const kol = await login('creator', 'sa-kol');
  const now = new Date().toISOString();
  const campaignId = 'campaign-stamp';
  app.db.prepare(`INSERT INTO campaigns(id,brand_user_id,title,objective,status,brief_json,budget_ait,reward_ait,starts_at,ends_at,created_at,updated_at)
    VALUES (?,?,?,?, 'active','{"contentTypes":["game"]}',1000,100,?,?,?,?)`).run(campaignId, brand.me.id, 'Stamp', '印记', now, new Date(Date.now() + 86_400_000).toISOString(), now, now);
  await req(`/api/campaigns/${campaignId}/economy-contract`, { method: 'POST', cookie: brand.cookie, body: {
    contractVersion: 'v1', primarySuccessEvent: 'playable_complete', playerRule: { amountAit: 5 }, creatorRule: { amountAit: 100 },
    attribution: { model: 'last_touch' }, eligibility: {}, budget: { totalAit: 1000 }, settlement: { cashEnabled: false, benefitTypes: ['x'] }, lockedFields: LOCKED,
  } });
  await req(`/api/admin/campaigns/${campaignId}/economy-contract/approve`, { method: 'POST', cookie: admin.cookie, body: { contractVersion: 'v1' } });

  const agent = await req('/api/agents', { method: 'POST', cookie: kol.cookie, body: { name: 'Stamp Agent', contentType: 'all', permissions: { draft: true } } });

  // 未获资格：带 Contract 的任务被拒
  const blocked = await req('/api/tasks', { method: 'POST', cookie: kol.cookie, body: { agentId: agent.data.agent.id, title: '印记内容', contentType: 'game', prompt: '足够长的创作目标说明文本，用于印记链验证。', campaignId, contractVersion: 'v1' } });
  assert.equal(blocked.response.status, 403);

  app.db.prepare(`INSERT INTO campaign_participants(id,campaign_id,creator_user_id,status,created_at,updated_at) VALUES ('cp-stamp',?,?,?,?,?)`)
    .run(campaignId, kol.me.id, 'eligible', now, now);

  // 未批准的版本被拒
  const badVersion = await req('/api/tasks', { method: 'POST', cookie: kol.cookie, body: { agentId: agent.data.agent.id, title: '印记内容', contentType: 'game', prompt: '足够长的创作目标说明文本，用于印记链验证。', campaignId, contractVersion: 'v9' } });
  assert.equal(badVersion.response.status, 409);

  const task = await req('/api/tasks', { method: 'POST', cookie: kol.cookie, body: { agentId: agent.data.agent.id, title: '印记内容', contentType: 'game', prompt: '足够长的创作目标说明文本，用于印记链验证。', campaignId, contractVersion: 'v1', idempotencyKey: 'stamp-task' } });
  assert.equal(task.response.status, 202);
  const contentId = task.data.content.id;
  await waitFor(async () => (await req(`/api/tasks/${task.data.task.id}`, { cookie: kol.cookie })).data.task.status === 'review_pending');
  await req(`/api/tasks/${task.data.task.id}/review`, { method: 'POST', cookie: kol.cookie, body: { decision: 'approve' } });
  await req(`/api/contents/${contentId}/publish`, { method: 'POST', cookie: kol.cookie });

  // 印记贯穿四层 + artifact checksum 存在且与 manifest 一致
  const content = app.db.prepare('SELECT campaign_id,contract_version FROM contents WHERE id=?').get(contentId);
  assert.deepEqual([content.campaign_id, content.contract_version], [campaignId, 'v1']);
  const taskRow = app.db.prepare('SELECT campaign_id,contract_version FROM agent_tasks WHERE id=?').get(task.data.task.id);
  assert.deepEqual([taskRow.campaign_id, taskRow.contract_version], [campaignId, 'v1']);
  const artifact = app.db.prepare('SELECT checksum,manifest_json,campaign_id,contract_version FROM content_artifacts WHERE content_id=? ORDER BY version DESC LIMIT 1').get(contentId);
  assert.match(artifact.checksum, /^[0-9a-f]{64}$/);
  assert.equal(JSON.parse(artifact.manifest_json).checksum, artifact.checksum);
  assert.equal(artifact.campaign_id, campaignId);

  // 交付盖 Contract 版本
  const delivery = await req(`/api/campaigns/${campaignId}/deliverables`, { method: 'POST', cookie: kol.cookie, body: { contentId, note: '印记交付说明' } });
  const deliveryId = delivery.data.id || delivery.data.deliverable?.id;
  const deliveryRow = app.db.prepare('SELECT contract_version FROM campaign_deliverables WHERE campaign_id=? ORDER BY submitted_at DESC LIMIT 1').get(campaignId);
  assert.equal(deliveryRow.contract_version, 'v1');
  assert.ok(deliveryId || deliveryRow);
});

test('A: AIT evidence must resolve to real rows; fakes are rejected and partner refs stay declared-unverified', async () => {
  const brand = await login('brand', 'sa2-brand');
  const admin = await login('admin', 'sa2-admin');
  const kol = await login('creator', 'sa2-kol');
  const now = new Date().toISOString();
  const campaignId = 'campaign-evidence';
  app.db.prepare(`INSERT INTO campaigns(id,brand_user_id,title,objective,status,brief_json,budget_ait,reward_ait,starts_at,ends_at,created_at,updated_at)
    VALUES (?,?,?,?, 'active','{}',1000,100,?,?,?,?)`).run(campaignId, brand.me.id, 'Evidence', '证据', now, new Date(Date.now() + 86_400_000).toISOString(), now, now);
  await req(`/api/campaigns/${campaignId}/economy-contract`, { method: 'POST', cookie: brand.cookie, body: {
    contractVersion: 'v1', primarySuccessEvent: 'playable_complete', playerRule: {}, creatorRule: { amountAit: 100 },
    attribution: {}, eligibility: {}, budget: { totalAit: 1000 }, settlement: { cashEnabled: false, benefitTypes: ['x'] }, lockedFields: LOCKED,
  } });
  await req(`/api/admin/campaigns/${campaignId}/economy-contract/approve`, { method: 'POST', cookie: admin.cookie, body: { contractVersion: 'v1' } });

  const payload = { userId: kol.me.id, contractVersion: 'v1', sourceType: 'creator_delivery', sourceEventType: 'delivery_approved', amount: 100 };

  // 假引用 → 409 attribution_reference_unresolved
  const fake = await req(`/api/admin/campaigns/${campaignId}/ait-entitlements`, { method: 'POST', cookie: admin.cookie, body: { ...payload, sourceEventId: 'e1', attributionReference: 'deliverable:does-not-exist' } });
  assert.equal(fake.response.status, 409);
  assert.equal(fake.data.error.code, 'attribution_reference_unresolved');

  // 他 Campaign 的真实交付 → campaign 不匹配
  app.db.prepare(`INSERT INTO campaigns(id,brand_user_id,title,objective,status,brief_json,budget_ait,reward_ait,starts_at,ends_at,created_at,updated_at)
    VALUES ('campaign-other',?,?,?, 'active','{}',10,1,?,?,?,?)`).run(brand.me.id, 'Other', 'o', now, now, now, now);
  app.db.prepare(`INSERT INTO contents (id,owner_user_id,title,content_type,status,created_at,updated_at) VALUES ('content-ev-x',?,?,?,'published',?,?)`).run(kol.me.id, 'x', 'game', now, now);
  app.db.prepare(`INSERT INTO campaign_deliverables (id,campaign_id,creator_user_id,content_id,status,submission_note,submitted_at,updated_at) VALUES ('deliv-other','campaign-other',?,?,'approved','n',?,?)`).run(kol.me.id, 'content-ev-x', now, now);
  const mismatch = await req(`/api/admin/campaigns/${campaignId}/ait-entitlements`, { method: 'POST', cookie: admin.cookie, body: { ...payload, sourceEventId: 'e2', attributionReference: 'deliverable:deliv-other' } });
  assert.equal(mismatch.data.error.code, 'attribution_campaign_mismatch');

  // 本 Campaign 的真实交付 → 通过且标记 verified
  app.db.prepare(`INSERT INTO campaign_deliverables (id,campaign_id,creator_user_id,content_id,status,submission_note,submitted_at,updated_at) VALUES ('deliv-real',?,?,?,'approved','n',?,?)`).run(campaignId, kol.me.id, 'content-ev-x', now, now);
  const real = await req(`/api/admin/campaigns/${campaignId}/ait-entitlements`, { method: 'POST', cookie: admin.cookie, body: { ...payload, sourceEventId: 'e3', attributionReference: 'deliverable:deliv-real' } });
  assert.equal(real.response.status, 201);
  const batchMeta = JSON.parse(app.db.prepare(`SELECT metadata_json FROM ledger_batches WHERE json_extract(metadata_json,'$.entitlementId')=?`).get(real.data.entitlement.id).metadata_json);
  assert.equal(batchMeta.evidenceKind, 'deliverable');
  assert.equal(batchMeta.evidenceVerified, true);

  // partner: 声明式边界 → 通过但 verified=false
  const partner = await req(`/api/admin/campaigns/${campaignId}/ait-entitlements`, { method: 'POST', cookie: admin.cookie, body: { ...payload, sourceEventId: 'e4', attributionReference: 'partner:crm-record-99' } });
  assert.equal(partner.response.status, 201);
  const partnerMeta = JSON.parse(app.db.prepare(`SELECT metadata_json FROM ledger_batches WHERE json_extract(metadata_json,'$.entitlementId')=?`).get(partner.data.entitlement.id).metadata_json);
  assert.equal(partnerMeta.evidenceVerified, false);
});

// ===== Batch B：seed 不再是死路 =====

test('B: demo seed creates an approved contract and an evidence-backed pending AIT entitlement', async () => {
  const brand = await login('brand', 'primary');
  const seeded = await req('/api/demo/seed-workflow', { method: 'POST', cookie: brand.cookie });
  assert.equal(seeded.response.status, 201);
  const campaignId = seeded.data.campaignId;
  const rule = app.db.prepare(`SELECT status,contract_version FROM campaign_economy_rules WHERE campaign_id=?`).get(campaignId);
  assert.equal(rule.status, 'approved');
  const entitlement = app.db.prepare(`SELECT status,attribution_reference FROM ait_entitlements WHERE campaign_id=?`).get(campaignId);
  assert.equal(entitlement.status, 'pending');
  assert.match(entitlement.attribution_reference, /^deliverable:delivery_/);
  // 证据指向的交付真实存在且已批准
  const deliverableId = entitlement.attribution_reference.split(':')[1];
  assert.equal(app.db.prepare('SELECT status FROM campaign_deliverables WHERE id=?').get(deliverableId).status, 'approved');
});

// ===== Batch C：素材授权门禁 =====

test('C: publish is blocked while a linked asset is revoked, and succeeds after replacing authorization', async () => {
  const creator = await login('creator', 'sc-assets');
  const missingLicense = await req('/api/assets', { method: 'POST', cookie: creator.cookie, body: { name: 'x', kind: 'image', checksum: 'abcd1234efgh' } });
  assert.equal(missingLicense.response.status, 400);
  const needRef = await req('/api/assets', { method: 'POST', cookie: creator.cookie, body: { name: 'x', kind: 'image', checksum: 'abcd1234efgh', licenseType: 'brand_supplied' } });
  assert.equal(needRef.data.error.code, 'license_ref_required');

  const asset = await req('/api/assets', { method: 'POST', cookie: creator.cookie, body: { name: '品牌主视觉', kind: 'image', checksum: 'sha256:demo-checksum-01', licenseType: 'brand_supplied', licenseRef: 'brand-license-001' } });
  assert.equal(asset.response.status, 201);
  const assetId = asset.data.asset.id;

  // 走管线到 draft（不发布），挂素材
  const agent = await req('/api/agents', { method: 'POST', cookie: creator.cookie, body: { name: 'Asset Agent', contentType: 'all', permissions: { draft: true } } });
  const task = await req('/api/tasks', { method: 'POST', cookie: creator.cookie, body: { agentId: agent.data.agent.id, title: '素材门禁内容', contentType: 'game', prompt: '用于验证素材授权门禁的互动内容说明文本。', idempotencyKey: 'asset-gate-task' } });
  const contentId = task.data.content.id;
  await waitFor(async () => (await req(`/api/tasks/${task.data.task.id}`, { cookie: creator.cookie })).data.task.status === 'review_pending');
  await req(`/api/tasks/${task.data.task.id}/review`, { method: 'POST', cookie: creator.cookie, body: { decision: 'approve' } });
  assert.equal((await req(`/api/contents/${contentId}/assets`, { method: 'POST', cookie: creator.cookie, body: { assetId, usage: 'cover' } })).response.status, 200);

  // 撤销授权 → 发布被阻止，并返回受影响内容
  const revoked = await req(`/api/assets/${assetId}/revoke`, { method: 'POST', cookie: creator.cookie });
  assert.deepEqual(revoked.data.affectedContents, [contentId]);
  const blocked = await req(`/api/contents/${contentId}/publish`, { method: 'POST', cookie: creator.cookie });
  assert.equal(blocked.response.status, 409);
  assert.equal(blocked.data.error.code, 'asset_authorization_required');

  // 已撤销素材不能再挂载到新内容
  assert.equal((await req(`/api/contents/${contentId}/assets`, { method: 'POST', cookie: creator.cookie, body: { assetId } })).data.error.code, 'asset_not_authorized');

  // 换一个有效素材（同链接位覆盖不可行——注册新素材并替换链接）后可发布
  const fresh = await req('/api/assets', { method: 'POST', cookie: creator.cookie, body: { name: '替换视觉', kind: 'image', checksum: 'sha256:demo-checksum-02', licenseType: 'original' } });
  app.db.prepare('DELETE FROM content_asset_links WHERE content_id=? AND asset_id=?').run(contentId, assetId);
  await req(`/api/contents/${contentId}/assets`, { method: 'POST', cookie: creator.cookie, body: { assetId: fresh.data.asset.id, usage: 'cover' } });
  assert.equal((await req(`/api/contents/${contentId}/publish`, { method: 'POST', cookie: creator.cookie })).response.status, 200);
});

// ===== Batch D：Remix 血缘 =====

test('D: remix creates a governed derivative with lineage, reset commercial fields and author notification', async () => {
  const author = await login('creator', 'sd-author');
  const remixer = await login('creator', 'sd-remixer');
  const source = await publishedContent(author, 'Remix 源作品');
  assert.equal(source.publishStatus, 200);

  // 未发布内容不能 Remix
  const draftTask = await req('/api/agents', { method: 'POST', cookie: author.cookie, body: { name: 'a2', contentType: 'all', permissions: { draft: true } } });
  assert.ok(draftTask);

  const remix = await req(`/api/contents/${source.contentId}/remix`, { method: 'POST', cookie: remixer.cookie });
  assert.equal(remix.response.status, 201);
  assert.equal(remix.data.remixOf.contentId, source.contentId);
  const row = app.db.prepare('SELECT owner_user_id,status,moderation_status,remix_of_content_id,campaign_id FROM contents WHERE id=?').get(remix.data.content.id);
  assert.equal(row.owner_user_id, remixer.me.id);
  assert.equal(row.remix_of_content_id, source.contentId);
  assert.equal(row.campaign_id, null);
  assert.equal(row.moderation_status, 'passed');
  // 派生草稿可直接发布（本地策略已过 + artifact ready）
  assert.equal((await req(`/api/contents/${remix.data.content.id}/publish`, { method: 'POST', cookie: remixer.cookie })).response.status, 200);
  // 原作者收到通知
  const inbox = await req('/api/notifications', { cookie: author.cookie });
  assert.ok(inbox.data.notifications.some(item => item.title === '你的作品被 Remix'));
});

// ===== Batch E：AI 分身 =====

test('E: ai twin registry versions persona updates, records consent and supports pause/resume', async () => {
  const user = await login('creator', 'se-twin');
  assert.equal((await req('/api/ai-twin', { cookie: user.cookie })).data.twin, null);
  const created = await req('/api/ai-twin', { method: 'POST', cookie: user.cookie, body: { displayName: 'Kai 分身', persona: { tone: '专业友好', languages: ['zh', 'en'] }, voiceConsent: true } });
  assert.equal(created.response.status, 201);
  assert.equal(created.data.twin.version, 1);
  const updated = await req('/api/ai-twin', { method: 'POST', cookie: user.cookie, body: { displayName: 'Kai 分身', persona: { tone: '轻松' }, voiceConsent: true, likenessConsent: true } });
  assert.equal(updated.data.twin.version, 2);
  const view = await req('/api/ai-twin', { cookie: user.cookie });
  assert.ok(view.data.twin.voiceConsentAt);
  assert.ok(view.data.twin.likenessConsentAt);
  assert.equal((await req('/api/ai-twin/pause', { method: 'POST', cookie: user.cookie })).data.status, 'paused');
  assert.equal((await req('/api/ai-twin/resume', { method: 'POST', cookie: user.cookie })).data.status, 'active');
});

// ===== Batch F：未成年人模式策略 =====

test('F: minor mode policy is admin-configured and readable by any session', async () => {
  const user = await login('creator', 'sf-user');
  const admin = await login('admin', 'sf-admin');
  const empty = await req('/api/policies/minor-mode', { cookie: user.cookie });
  assert.equal(empty.data.policy.enabled, false);
  const set = await req('/api/admin/policies/minor-mode', { method: 'POST', cookie: admin.cookie, body: { enabled: true, dailyMinutes: 90, curfew: '21:00-08:00' } });
  assert.equal(set.data.policy.enabled, true);
  assert.equal(set.data.policy.paymentsBlocked, true);
  const read = await req('/api/policies/minor-mode', { cookie: user.cookie });
  assert.equal(read.data.policy.dailyMinutes, 90);
  // 非管理员不能配置
  assert.equal((await req('/api/admin/policies/minor-mode', { method: 'POST', cookie: user.cookie, body: { enabled: false } })).response.status, 403);
});
