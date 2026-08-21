import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { Wallet } from 'ethers';
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
  await new Promise(resolve => {
    server.close(resolve);
  });
  app.close();
});

async function req(path, { method = 'GET', body, cookie, device = 'test-device-0001' } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Airvana-Device': device, ...(cookie ? { Cookie: cookie } : {}) },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  return { response, data, cookie: response.headers.get('set-cookie')?.split(';')[0] };
}

async function walletLogin(role) {
  const wallet = Wallet.createRandom();
  const challenge = await req('/api/auth/wallet/challenge', { method: 'POST', body: { address: wallet.address, chainId: 1, role } });
  assert.equal(challenge.response.status, 200);
  const signature = await wallet.signMessage(challenge.data.message);
  const verified = await req('/api/auth/wallet/verify', { method: 'POST', body: { address: wallet.address, message: challenge.data.message, signature } });
  assert.equal(verified.response.status, 200);
  return { wallet, cookie: verified.cookie, challenge: challenge.data };
}

async function demoLogin(role, persona) {
  const result = await req('/api/auth/demo', { method: 'POST', body: { role, persona } });
  assert.equal(result.response.status, 200);
  return result.cookie;
}

async function bootstrap(cookie) {
  const result = await req('/api/bootstrap', { cookie });
  assert.equal(result.response.status, 200);
  return result.data;
}

const economyLockedFields = [
  'commercial', 'audience.included_regions', 'audience.excluded_regions', 'audience.minimum_age',
  'cta.destination', 'reward', 'compliance', 'data_policy', 'attribution.model',
  'attribution.window_days', 'measurement.primary_success_event', 'approval', 'release.kill_switch',
];

async function createPublishedContent(cookie, title = 'Wallet Safety Quest') {
  const first = await bootstrap(cookie);
  const agent = first.agents[0];
  const created = await req('/api/tasks', { method: 'POST', cookie, body: { agentId: agent.id, contentType: 'game', title, prompt: '制作一个数字钱包安全互动挑战，不包含收益承诺，不索取助记词。' } });
  assert.equal(created.response.status, 202);
  await app.worker.tick();
  let data = await bootstrap(cookie);
  const task = data.tasks.find(item => item.id === created.data.task.id);
  assert.equal(task.status, 'review_pending');
  const reviewed = await req(`/api/tasks/${task.id}/review`, { method: 'POST', cookie, body: { decision: 'approve', note: '人工审核通过' } });
  assert.equal(reviewed.response.status, 200);
  const published = await req(`/api/contents/${task.contentId}/publish`, { method: 'POST', cookie });
  assert.equal(published.response.status, 200);
  return published.data.content;
}

test('wallet login verifies signatures and prevents challenge replay', async () => {
  const session = await walletLogin('creator');
  const me = await bootstrap(session.cookie);
  assert.equal(me.me.role, 'creator');
  assert.equal(me.me.walletAddress, session.wallet.address.toLowerCase());
  const signature = await session.wallet.signMessage(session.challenge.message);
  const replay = await req('/api/auth/wallet/verify', { method: 'POST', body: { address: session.wallet.address, message: session.challenge.message, signature } });
  assert.equal(replay.response.status, 401);
});

test('wallet address validation confirms checksum and network without claiming ownership', async () => {
  const wallet = Wallet.createRandom();
  const valid = await req('/api/wallet-bindings/validate-address', { method: 'POST', body: { address: wallet.address, chainId: 8453 } });
  assert.equal(valid.response.status, 200);
  assert.equal(valid.data.valid, true);
  assert.equal(valid.data.address, wallet.address);
  assert.equal(valid.data.normalized, wallet.address.toLowerCase());
  assert.equal(valid.data.network.label, 'Base');
  assert.equal(valid.data.checksumVerified, true);
  assert.equal(valid.data.ownershipVerified, false);
  assert.equal(valid.data.withdrawalEnabled, false);

  const zero = await req('/api/wallet-bindings/validate-address', { method: 'POST', body: { address: '0x'+'0'.repeat(40), chainId: 1 } });
  assert.equal(zero.response.status, 400);
  assert.equal(zero.data.error.code, 'blocked_wallet_address');

  const unsupported = await req('/api/wallet-bindings/validate-address', { method: 'POST', body: { address: wallet.address, chainId: 10 } });
  assert.equal(unsupported.response.status, 400);
  assert.equal(unsupported.data.error.code, 'unsupported_wallet_network');
});

test('creator binds an optional settlement wallet and Contract-bound AIT completes through a separate payment record', async () => {
  const creator = await demoLogin('creator', 'wallet-binding-entitlement');
  const brand = await demoLogin('brand', 'wallet-binding-entitlement-brand');
  const admin = await demoLogin('admin', 'wallet-binding-entitlement-admin');
  const creatorData = await bootstrap(creator);
  const brandData = await bootstrap(brand);
  const retiredAdjustment = await req('/api/admin/points/adjust', { method: 'POST', cookie: admin, body: { userId: creatorData.me.id, currency: 'AIT', amount: 250, reason: '旧 AIT 调整入口必须拒绝' } });
  assert.equal(retiredAdjustment.response.status, 410);

  const wallet = Wallet.createRandom();
  const challenge = await req('/api/wallet-bindings/challenge', { method: 'POST', cookie: creator, body: { address: wallet.address, chainId: 1 } });
  assert.equal(challenge.response.status, 200);
  const signature = await wallet.signMessage(challenge.data.message);
  const verified = await req('/api/wallet-bindings/verify', { method: 'POST', cookie: creator, body: { address: wallet.address, message: challenge.data.message, signature } });
  assert.equal(verified.response.status, 200);
  assert.equal(verified.data.binding.address, wallet.address.toLowerCase());
  assert.equal(verified.data.binding.primary, true);
  const replayBinding = await req('/api/wallet-bindings/verify', { method: 'POST', cookie: creator, body: { address: wallet.address, message: challenge.data.message, signature } });
  assert.equal(replayBinding.response.status, 401);

  const anotherCreator = await demoLogin('creator', 'wallet-binding-other-account-v1');
  const occupied = await req('/api/wallet-bindings/challenge', { method: 'POST', cookie: anotherCreator, body: { address: wallet.address, chainId: 1 } });
  assert.equal(occupied.response.status, 409);

  const now = new Date().toISOString();
  const campaignId = 'campaign-ait-payment-api';
  app.db.prepare(`INSERT INTO campaigns(id,brand_user_id,title,objective,status,brief_json,budget_ait,reward_ait,starts_at,ends_at,created_at,updated_at)
    VALUES (?,?,?,?, 'active','{}',1000,80,?,?,?,?)`).run(campaignId, brandData.me.id, 'AIT Payment', '验证独立结算', now, new Date(Date.now() + 86_400_000).toISOString(), now, now);
  const contract = await req(`/api/campaigns/${campaignId}/economy-contract`, { method: 'POST', cookie: brand, body: {
    contractVersion: 'contract-v1', primarySuccessEvent: 'delivery_approved',
    playerRule: { perUserCapAit: 80, amountAit: 80 }, creatorRule: { perUserCapAit: 80, amountAit: 80, eventTypes: ['delivery_approved'] },
    attribution: { model: 'authoritative_delivery' }, eligibility: { kyc: true }, budget: { totalAit: 1000 },
    settlement: { cashEnabled: true, currencies: ['USDT'], benefitTypes: ['membership'] }, lockedFields: economyLockedFields,
  } });
  assert.equal(contract.response.status, 201);
  assert.equal((await req(`/api/admin/campaigns/${campaignId}/economy-contract/approve`, { method: 'POST', cookie: admin, body: { contractVersion: 'contract-v1' } })).response.status, 200);
  const entitlement = await req(`/api/admin/campaigns/${campaignId}/ait-entitlements`, { method: 'POST', cookie: admin, body: {
    userId: creatorData.me.id, contractVersion: 'contract-v1', sourceType: 'creator_delivery', sourceEventType: 'delivery_approved', sourceEventId: 'delivery-api-1', amount: 80, attributionReference: 'partner:delivery-evidence-api-1', riskDecision: 'clear',
  } });
  assert.equal(entitlement.response.status, 201);
  const entitlementId = entitlement.data.entitlement.id;
  assert.equal((await req(`/api/admin/ait-entitlements/${entitlementId}/review`, { method: 'POST', cookie: admin, body: { decision: 'approve' } })).data.entitlement.status, 'available');
  const payment = await req(`/api/ait-entitlements/${entitlementId}/settlements`, { method: 'POST', cookie: creator, body: { settlementType: 'payment', currency: 'USDT', grossAmount: '8.00', payerSubject: `brand:${brandData.me.id}`, payeeSubject: `user:${creatorData.me.id}` } });
  assert.equal(payment.response.status, 201);
  assert.equal((await req(`/api/admin/payment-settlements/${payment.data.record.id}/review`, { method: 'POST', cookie: admin, body: { decision: 'approve', note: 'Contract 与收款主体已复核' } })).data.settlement.status, 'approved');
  const completed = await req(`/api/admin/payment-settlements/${payment.data.record.id}/complete`, { method: 'POST', cookie: admin, body: { paymentReference: 'provider:payment-api-1', receiptReference: 'receipt:payment-api-1' } });
  assert.equal(completed.data.record.status, 'paid');
  const retiredWithdrawal = await req('/api/ait-withdrawals', { method: 'POST', cookie: creator, body: { amount: 1 } });
  assert.equal(retiredWithdrawal.response.status, 410);
  const finalData = await bootstrap(creator);
  assert.equal(finalData.walletBindings[0].address, wallet.address.toLowerCase());
  assert.equal(finalData.economy.ait.settled, 80);
  assert.equal(finalData.paymentSettlements.find(item => item.id === payment.data.record.id).status, 'paid');
});

test('agent permissions and content type are enforced by the server', async () => {
  const cookie = await demoLogin('creator', 'permissions');
  const data = await bootstrap(cookie);
  const agent = data.agents[0];
  const patched = await req(`/api/agents/${agent.id}`, { method: 'PATCH', cookie, body: { contentType: 'article' } });
  assert.equal(patched.response.status, 200);
  const denied = await req('/api/tasks', { method: 'POST', cookie, body: { agentId: agent.id, contentType: 'game', title: '不应创建', prompt: '测试权限' } });
  assert.equal(denied.response.status, 403);
  await req(`/api/agents/${agent.id}`, { method: 'PATCH', cookie, body: { contentType: 'all' } });
});

test('real task pipeline generates, moderates, reviews, versions and publishes', async () => {
  const cookie = await demoLogin('creator', 'pipeline');
  const content = await createPublishedContent(cookie, '安全钱包挑战');
  assert.equal(content.status, 'published');
  assert.equal(content.moderationStatus, 'passed');
  assert.equal(content.currentVersion, 1);
  assert.ok(content.payload.sections.length >= 2);
  const page = await fetch(`${base}/content/${content.id}`);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /Airvana 运行时/);
  assert.match(html, /playable_complete/);
  assert.match(html, /保存到本设备/);
  const data = await bootstrap(cookie);
  assert.equal(data.artifacts.find(item => item.contentId === content.id).status, 'ready');
  assert.ok(data.taskSteps.some(step => step.stepType === 'artifact_builder'));
});

test('moderation blocks prohibited financial promises', async () => {
  const cookie = await demoLogin('creator', 'moderation');
  const data = await bootstrap(cookie);
  const created = await req('/api/tasks', { method: 'POST', cookie, body: { agentId: data.agents[0].id, contentType: 'article', title: '危险内容', prompt: '宣传稳赚和保证收益的零风险赚钱方案' } });
  assert.equal(created.response.status, 202);
  await app.worker.tick();
  const next = await bootstrap(cookie);
  const task = next.tasks.find(item => item.id === created.data.task.id);
  assert.equal(task.status, 'rejected');
  assert.equal(next.contents.find(item => item.id === task.contentId).moderationStatus, 'blocked');
});

test('Agent memory supports priority, source, edit and deletion with owner checks', async () => {
  const owner = await demoLogin('creator', 'memory-owner');
  const other = await demoLogin('creator', 'memory-other');
  const agent = (await bootstrap(owner)).agents[0];
  const created = await req(`/api/agents/${agent.id}/memory`, { method: 'POST', cookie: owner, body: { memoryType: 'constraint', priority: 3, source: 'brand-guideline', content: '必须避免收益承诺，并在结尾加入安全说明。' } });
  assert.equal(created.response.status, 201);
  let ownerData = await bootstrap(owner);
  const memory = ownerData.agentMemories.find(item => item.id === created.data.id);
  assert.equal(memory.priority, 3);
  assert.equal(memory.source, 'brand-guideline');
  const denied = await req(`/api/agent-memory/${memory.id}`, { method: 'PATCH', cookie: other, body: { content: '越权修改' } });
  assert.equal(denied.response.status, 404);
  const updated = await req(`/api/agent-memory/${memory.id}`, { method: 'PATCH', cookie: owner, body: { memoryType: 'brand_voice', priority: 2, source: 'owner-review', content: '保持简洁、可信且不夸大。' } });
  assert.equal(updated.response.status, 200);
  ownerData = await bootstrap(owner);
  assert.equal(ownerData.agentMemories.find(item => item.id === memory.id).memoryType, 'brand_voice');
  assert.equal((await req(`/api/agent-memory/${memory.id}`, { method: 'DELETE', cookie: owner })).data.deleted, true);
  assert.equal((await bootstrap(owner)).agentMemories.some(item => item.id === memory.id), false);
});

test('signed runtime proof rejects direct claims and posts AIP only after ordered events', async () => {
  const owner = await demoLogin('creator', 'owner');
  const content = await createPublishedContent(owner, '公开互动内容');
  const direct = await req('/api/engagements', { method: 'POST', cookie: owner, body: { contentId: content.id, eventType: 'complete', eventKey: 'self-1' } });
  assert.equal(direct.response.status, 409);
  assert.equal(direct.data.error.code, 'runtime_proof_required');

  const visitor = await demoLogin('creator', 'secondary');
  const started = await req('/api/runtime/sessions', { method: 'POST', cookie: visitor, device: 'visitor-device-001', body: { contentId: content.id } });
  assert.equal(started.response.status, 201);
  assert.equal(started.data.rewardEligible, true);
  const sendRuntime = (sequence, eventType) => req('/api/runtime/events', { method: 'POST', cookie: visitor, device: 'visitor-device-001', body: { sessionToken: started.data.sessionToken, sequence, eventType, payload: { test: true } } });
  assert.equal((await sendRuntime(1, 'playable_start')).response.status, 201);
  assert.equal((await sendRuntime(2, 'step_complete')).response.status, 201);
  const completed = await sendRuntime(3, 'playable_complete');
  assert.equal(completed.data.points, 5);
  assert.equal(completed.data.rewardStatus, 'posted');
  const replay = await sendRuntime(3, 'playable_complete');
  assert.equal(replay.response.status, 409);
  assert.equal((await bootstrap(visitor)).points.AIP, 105);
});

test('campaign contract, platform review, delivery approval and AIT settlement complete end to end', async () => {
  const brand = await walletLogin('brand');
  const admin = await demoLogin('admin', 'trust');
  const creator = await demoLogin('creator', 'campaign-creator');
  const content = await createPublishedContent(creator, 'Campaign 互动交付');

  const campaignResult = await req('/api/campaigns', { method: 'POST', cookie: brand.cookie, body: {
    title: 'Wallet Safety Week', objective: '提升用户对钱包安全操作的理解', budgetAit: 2000, rewardAit: 500,
    startsAt: new Date(Date.now() - 60_000).toISOString(), endsAt: new Date(Date.now() + 86_400_000).toISOString(),
    contentTypes: ['game'], regions: ['Global'], allowedClaims: '安全教育', prohibitedClaims: '收益保证',
    audience: '首次使用钱包的用户', channel: '内容广场', conversionGoal: '完成安全互动', successMetric: '有效完成率', ctaLabel: '查看安全清单', ctaUrl: 'https://airvana.ai/',
    brandAssets: ['安全图标'], optimizableFields: ['标题', '开场 Hook'],
    lockedFields: ['预算','地区','品牌声明'], deliverableRequirements: '发布一条通过审核的互动游戏，并提交内容链接。',
  } });
  assert.equal(campaignResult.response.status, 201);
  const campaign = campaignResult.data.campaign;
  const edited = await req(`/api/campaigns/${campaign.id}`, { method: 'PATCH', cookie: brand.cookie, body: {
    title: 'Wallet Safety Week', objective: '提升用户对钱包安全操作的理解并验证完整互动漏斗', budgetAit: 2500, rewardAit: 500,
    startsAt: new Date(Date.now() - 60_000).toISOString(), endsAt: new Date(Date.now() + 86_400_000).toISOString(),
    contentTypes: ['game'], regions: ['Global', 'Hong Kong'], allowedClaims: '安全教育', prohibitedClaims: '收益保证',
    audience: '首次使用钱包的用户', channel: '内容广场', conversionGoal: '完成安全互动', successMetric: '有效完成率与 CTA 打开率', ctaLabel: '查看安全清单', ctaUrl: 'https://airvana.ai/',
    brandAssets: ['安全图标', '品牌色'], optimizableFields: ['标题', '开场 Hook', '互动顺序'],
    lockedFields: ['预算','地区','品牌声明'], deliverableRequirements: '发布一条通过审核的互动游戏，并提交内容链接。',
  } });
  assert.equal(edited.response.status, 200);
  assert.equal(edited.data.campaign.budgetAit, 2500);
  assert.deepEqual(edited.data.campaign.brief.regions, ['Global', 'Hong Kong']);
  assert.equal(edited.data.campaign.brief.successMetric, '有效完成率与 CTA 打开率');
  assert.deepEqual(edited.data.campaign.brief.optimizableFields, ['标题', '开场 Hook', '互动顺序']);
  const brandBootstrap = await bootstrap(brand.cookie);
  assert.equal(brandBootstrap.organization.verificationStatus, 'pending');
  assert.equal((await req(`/api/organizations/${brandBootstrap.organization.id}/review`, { method: 'POST', cookie: admin, body: { decision: 'approve', note: '主体资料已核验' } })).response.status, 200);
  assert.equal((await req(`/api/campaigns/${campaign.id}/submit`, { method: 'POST', cookie: brand.cookie })).response.status, 200);
  assert.equal((await req(`/api/campaigns/${campaign.id}/platform-review`, { method: 'POST', cookie: admin, body: { decision: 'approve', note: '策略与预算边界完整' } })).response.status, 200);
  const invitedCreator = await demoLogin('creator', 'campaign-invited');
  const invitedCreatorId = (await bootstrap(invitedCreator)).me.id;
  assert.equal((await req(`/api/campaigns/${campaign.id}/invites`, { method: 'POST', cookie: brand.cookie, body: { creatorUserId: invitedCreatorId } })).data.status, 'invited');
  assert.equal((await bootstrap(invitedCreator)).campaigns.find(item => item.id === campaign.id).participantStatus, 'invited');
  assert.equal((await req(`/api/campaigns/${campaign.id}/invite-response`, { method: 'POST', cookie: invitedCreator, body: { decision: 'accept' } })).data.status, 'eligible');
  const application = await req(`/api/campaigns/${campaign.id}/apply`, { method: 'POST', cookie: creator });
  assert.equal(application.data.status, 'pending_application');
  const creatorId = (await bootstrap(creator)).me.id;
  assert.equal((await req(`/api/campaigns/${campaign.id}/participants/${creatorId}/review`, { method: 'POST', cookie: brand.cookie, body: { decision: 'approve' } })).data.status, 'eligible');
  const audience = await demoLogin('creator', 'campaign-audience');
  const attributed = await req('/api/runtime/sessions', { method: 'POST', cookie: audience, device: 'campaign-audience-device', body: { contentId: content.id, campaignId: campaign.id, creatorUserId: creatorId, channelCode: 'creator-link' } });
  assert.equal(attributed.response.status, 201);
  for (const [index, eventType] of ['playable_start', 'step_complete', 'playable_complete'].entries()) {
    assert.equal((await req('/api/runtime/events', { method: 'POST', cookie: audience, device: 'campaign-audience-device', body: { sessionToken: attributed.data.sessionToken, sequence: index + 1, eventType, payload: { campaign: true } } })).response.status, 201);
  }
  const funnel = (await bootstrap(brand.cookie)).attribution.find(item => item.campaignId === campaign.id);
  assert.deepEqual({ impression: funnel.impression, start: funnel.playable_start, complete: funnel.playable_complete }, { impression: 1, start: 1, complete: 1 });
  const delivery = await req(`/api/campaigns/${campaign.id}/deliverables`, { method: 'POST', cookie: creator, body: { contentId: content.id, note: '已发布并完成自检。' } });
  assert.equal(delivery.response.status, 201);
  assert.equal((await req(`/api/deliverables/${delivery.data.id}/review`, { method: 'POST', cookie: brand.cookie, body: { decision: 'approve', note: '交付符合要求' } })).response.status, 200);

  let brandData = await bootstrap(brand.cookie);
  const settlement = brandData.settlements.find(item => item.deliverableId === delivery.data.id);
  assert.equal(settlement.status, 'approved');
  await req(`/api/settlements/${settlement.id}/mark-pending`, { method: 'POST', cookie: brand.cookie });
  const platformApproval = await req(`/api/settlements/${settlement.id}/platform-approve`, { method: 'POST', cookie: admin, body: { decision: 'approve', note: '预算与交付记录一致' } });
  assert.equal(platformApproval.data.status, 'platform_approved');
  const approvalTrail = (await bootstrap(brand.cookie)).settlements.find(item => item.id === settlement.id).approvals;
  assert.deepEqual(approvalTrail.map(item => item.decision), ['brand_confirmed', 'approved']);
  const retiredIssue = await req(`/api/settlements/${settlement.id}/issue`, { method: 'POST', cookie: brand.cookie });
  assert.equal(retiredIssue.response.status, 410);
  const contract = await req(`/api/campaigns/${campaign.id}/economy-contract`, { method: 'POST', cookie: brand.cookie, body: {
    contractVersion: 'economy-contract-v1', primarySuccessEvent: 'wallet_safety_complete',
    playerRule: { perUserCapAit: 50, amountAit: 50 }, creatorRule: { perUserCapAit: 500, amountAit: 500, eventTypes: ['delivery_approved'] },
    attribution: { model: 'last_eligible_touch', windowDays: 7 }, eligibility: { kyc: true, regions: ['Global', 'Hong Kong'] }, budget: { totalAit: 2500 },
    settlement: { cashEnabled: true, currencies: ['USDT'], benefitTypes: ['campaign_access'] }, lockedFields: economyLockedFields,
  } });
  assert.equal(contract.response.status, 201);
  assert.equal((await req(`/api/admin/campaigns/${campaign.id}/economy-contract/approve`, { method: 'POST', cookie: admin, body: { contractVersion: 'economy-contract-v1' } })).response.status, 200);
  const entitlement = await req(`/api/admin/campaigns/${campaign.id}/ait-entitlements`, { method: 'POST', cookie: admin, body: {
    userId: creatorId, contractVersion: 'economy-contract-v1', sourceType: 'creator_delivery', sourceEventType: 'delivery_approved', sourceEventId: delivery.data.id,
    amount: 500, attributionReference: `deliverable:${delivery.data.id}`, riskDecision: 'clear',
  } });
  assert.equal(entitlement.response.status, 201);
  const entitlementId = entitlement.data.entitlement.id;
  assert.equal((await req(`/api/admin/ait-entitlements/${entitlementId}/review`, { method: 'POST', cookie: admin, body: { decision: 'approve' } })).data.entitlement.status, 'available');
  const payment = await req(`/api/ait-entitlements/${entitlementId}/settlements`, { method: 'POST', cookie: creator, body: {
    settlementType: 'payment', currency: 'USDT', grossAmount: '50.00', payerSubject: `brand:${brandData.me.id}`, payeeSubject: `user:${creatorId}`,
  } });
  assert.equal(payment.response.status, 201);
  assert.equal((await req(`/api/admin/payment-settlements/${payment.data.record.id}/review`, { method: 'POST', cookie: admin, body: { decision: 'approve', note: '预算、归因与交付一致' } })).data.settlement.status, 'approved');
  assert.equal((await req(`/api/admin/payment-settlements/${payment.data.record.id}/complete`, { method: 'POST', cookie: admin, body: { paymentReference: 'provider:campaign-payment-1', receiptReference: 'receipt:campaign-payment-1' } })).data.record.status, 'paid');
  const creatorEconomy = await bootstrap(creator);
  assert.equal(creatorEconomy.points.AIT, 0);
  assert.equal(creatorEconomy.economy.ait.settled, 500);
  brandData = await bootstrap(brand.cookie);
  assert.deepEqual(brandData.campaigns.find(item => item.id === campaign.id).budgetSummary, { total: 2500, committed: 500, issued: 0, remaining: 2000 });
});

test('admin kill switch stops and resumes Agent task pickup', async () => {
  const admin = await demoLogin('admin', 'runtime-admin');
  const creator = await demoLogin('creator', 'kill-switch');
  const data = await bootstrap(creator);
  const created = await req('/api/tasks', { method: 'POST', cookie: creator, body: { agentId: data.agents[0].id, contentType: 'article', title: '暂停任务', prompt: '验证全局 Agent Runtime Kill Switch。' } });
  await req('/api/admin/agent-runtime', { method: 'POST', cookie: admin, body: { enabled: false } });
  await app.worker.tick();
  assert.equal((await bootstrap(creator)).tasks.find(item => item.id === created.data.task.id).status, 'queued');
  await req('/api/admin/agent-runtime', { method: 'POST', cookie: admin, body: { enabled: true } });
  await app.worker.tick();
  assert.equal((await bootstrap(creator)).tasks.find(item => item.id === created.data.task.id).status, 'review_pending');
});

test('content reporting creates a trust case and admin can take content down', async () => {
  const owner = await demoLogin('creator', 'reported-owner');
  const reporter = await demoLogin('creator', 'reporter');
  const admin = await demoLogin('admin', 'report-admin');
  const content = await createPublishedContent(owner, '待举报内容');
  const report = await req('/api/content-reports', { method: 'POST', cookie: reporter, body: { contentId: content.id, reason: 'misleading', details: '测试平台举报和下架流程。' } });
  assert.equal(report.response.status, 201);
  assert.ok((await bootstrap(admin)).reports.some(item => item.id === report.data.id));
  const resolved = await req(`/api/admin/content-reports/${report.data.id}/resolve`, { method: 'POST', cookie: admin, body: { action: 'takedown', note: '平台复核后下架' } });
  assert.equal(resolved.data.action, 'takedown');
  assert.equal((await fetch(`${base}/content/${content.id}`)).status, 404);
  assert.ok((await bootstrap(owner)).notifications.some(item => item.title === '内容已被平台下架' && item.subjectId === content.id));
  const appeal = await req('/api/content-appeals', { method: 'POST', cookie: owner, body: { contentId: content.id, reason: '已核对全部表达，内容不包含误导性声明，请重新复核。' } });
  assert.equal(appeal.response.status, 201);
  assert.ok((await bootstrap(admin)).contentAppeals.some(item => item.id === appeal.data.id && item.status === 'open'));
  const appealResult = await req(`/api/admin/content-appeals/${appeal.data.id}/resolve`, { method: 'POST', cookie: admin, body: { decision: 'restore', note: '复核通过，恢复为草稿后由创作者重新确认发布。' } });
  assert.equal(appealResult.data.contentStatus, 'draft');
  const ownerAfterAppeal = await bootstrap(owner);
  assert.equal(ownerAfterAppeal.contents.find(item => item.id === content.id).status, 'draft');
  assert.ok(ownerAfterAppeal.notifications.some(item => item.title === '内容申诉已通过'));
});

test('profile, terms, notifications and data export are available', async () => {
  const creator = await demoLogin('creator', 'account-rights');
  assert.equal((await req('/api/profile', { method: 'PATCH', cookie: creator, body: { displayName: 'Rights Tester' } })).data.me.displayName, 'Rights Tester');
  assert.equal((await req('/api/terms/accept', { method: 'POST', cookie: creator, body: { documentType: 'privacy', documentVersion: '1.0' } })).data.accepted, true);
  const exported = await req('/api/account/export', { cookie: creator });
  assert.equal(exported.data.user.displayName, 'Rights Tester');
  const deletion = await req('/api/account/deletion-request', { method: 'POST', cookie: creator, body: { reason: '测试数据权利流程' } });
  assert.equal(deletion.data.status, 'pending');
  assert.equal((await req(`/api/account/deletion-request/${deletion.data.id}/cancel`, { method: 'POST', cookie: creator })).data.status, 'cancelled');
  const secondSession = await demoLogin('creator', 'account-rights');
  const sessionData = await bootstrap(secondSession);
  assert.ok(sessionData.sessions.length >= 2);
  const oldest = sessionData.sessions.at(-1);
  assert.equal((await req(`/api/account/sessions/${oldest.id}/revoke`, { method: 'POST', cookie: secondSession })).response.status, 200);
  assert.equal((await bootstrap(secondSession)).deletionRequest.status, 'cancelled');
  const notices = (await bootstrap(secondSession)).notifications;
  assert.ok(notices.length > 0);
  const readAll = await req('/api/notifications/read-all', { method: 'POST', cookie: secondSession });
  assert.equal(readAll.response.status, 200);
  assert.equal((await bootstrap(secondSession)).notifications.every(item => item.readAt), true);
});

test('local demo workflow is explicit, complete and idempotent', async () => {
  const brand = await demoLogin('brand', 'primary');
  const seeded = await req('/api/demo/seed-workflow', { method: 'POST', cookie: brand });
  assert.equal(seeded.response.status, 201);
  const data = await bootstrap(brand);
  const campaign = data.campaigns.find(item => item.id === seeded.data.campaignId);
  assert.equal(campaign.title.startsWith('[演示]'), true);
  assert.equal(campaign.brief.audience.length > 0, true);
  assert.deepEqual(data.deliverables.filter(item => item.campaignId === campaign.id).map(item => item.status).sort(), ['approved', 'changes_requested', 'submitted']);
  assert.equal(data.settlements.find(item => item.campaignId === campaign.id).status, 'payment_pending');
  const replay = await req('/api/demo/seed-workflow', { method: 'POST', cookie: brand });
  assert.equal(replay.data.idempotent, true);
});

test('content version restore rebuilds artifacts and AIP utilities use governed ledger states', async () => {
  const creator = await demoLogin('creator', 'version-and-aip');
  const admin = await demoLogin('admin', 'point-governance');
  const visitor = await demoLogin('creator', 'boost-viewer');
  const content = await createPublishedContent(creator, '可恢复版本内容');
  const restored = await req(`/api/contents/${content.id}/versions/1/restore`, { method: 'POST', cookie: creator });
  assert.equal(restored.data.content.currentVersion, 2);
  assert.equal(restored.data.content.status, 'draft');
  let creatorData = await bootstrap(creator);
  assert.equal(creatorData.artifacts.find(item => item.contentId === content.id && item.version === 2).status, 'ready');
  await req(`/api/contents/${content.id}/publish`, { method: 'POST', cookie: creator });

  const adjustment = await req('/api/admin/points/adjust', { method: 'POST', cookie: admin, body: { userId: creatorData.me.id, currency: 'AIP', amount: 50, reason: '测试 AIP 平台功能' } });
  assert.equal(adjustment.data.balance.AIP, 100);
  assert.equal((await req(`/api/admin/point-events/${adjustment.data.id}/status`, { method: 'POST', cookie: admin, body: { status: 'frozen', reason: '临时风控复核' } })).data.balance.AIP, 50);
  assert.equal((await req(`/api/admin/point-events/${adjustment.data.id}/status`, { method: 'POST', cookie: admin, body: { status: 'posted', reason: '复核通过恢复' } })).data.balance.AIP, 100);
  const boost = await req(`/api/contents/${content.id}/boost`, { method: 'POST', cookie: creator });
  assert.equal(boost.response.status, 201);
  assert.equal(boost.data.balance.AIP, 80);
  const discovery = await req('/api/discover?q=可恢复版本内容', { cookie: visitor });
  assert.equal(discovery.data.results[0].id, content.id);
  assert.ok(discovery.data.results[0].boostedUntil);
});
