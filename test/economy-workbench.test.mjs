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

async function req(path, { method = 'GET', body, cookie, device = 'workbench-device-01' } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Airvana-Device': device, ...(cookie ? { Cookie: cookie } : {}) },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  return { response, data, cookie: response.headers.get('set-cookie')?.split(';')[0] };
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

test('workspace bootstrap exposes the full economy V1 operating surface for brand, admin and creator', async () => {
  const brand = await demoLogin('brand', 'workbench-brand');
  const admin = await demoLogin('admin', 'workbench-admin');
  const creator = await demoLogin('creator', 'workbench-creator');
  const brandData = await bootstrap(brand);
  const creatorData = await bootstrap(creator);

  const now = new Date().toISOString();
  const campaignId = 'campaign-workbench-surface';
  app.db.prepare(`INSERT INTO campaigns(id,brand_user_id,title,objective,status,brief_json,budget_ait,reward_ait,starts_at,ends_at,created_at,updated_at)
    VALUES (?,?,?,?, 'active','{}',600,120,?,?,?,?)`)
    .run(campaignId, brandData.me.id, 'Workbench Surface', '验证工作台经济面板', now, new Date(Date.now() + 86_400_000).toISOString(), now, now);
  app.db.prepare(`INSERT INTO campaign_participants(id,campaign_id,creator_user_id,status,created_at,updated_at) VALUES (?,?,?,?,?,?)`)
    .run('participant-workbench-1', campaignId, creatorData.me.id, 'eligible', now, now);

  // 品牌提交 Contract：pending_review 出现在品牌与平台的 economyContracts；创作者此时看不到
  const contract = await req(`/api/campaigns/${campaignId}/economy-contract`, { method: 'POST', cookie: brand, body: {
    contractVersion: 'wb-v1', primarySuccessEvent: 'playable_complete',
    playerRule: { amountAit: 5 }, creatorRule: { amountAit: 120 },
    attribution: { model: 'last_touch', windowDays: 7 }, eligibility: {},
    budget: { totalAit: 600, perUserCapAit: 0 },
    settlement: { cashEnabled: true, currencies: ['USDT'], benefitTypes: ['contract_defined_non_financial'] },
    lockedFields: economyLockedFields,
  } });
  assert.equal(contract.response.status, 201);
  const brandView = await bootstrap(brand);
  assert.equal(brandView.economyContracts.length, 1);
  assert.equal(brandView.economyContracts[0].status, 'pending_review');
  assert.equal(brandView.economyContracts[0].campaignTitle, 'Workbench Surface');
  const adminPending = (await bootstrap(admin)).economyContracts.find(rule => rule.campaignId === campaignId);
  assert.equal(adminPending.status, 'pending_review');
  assert.equal((await bootstrap(creator)).economyContracts.length, 0);

  // 平台批准后创作者（eligible 参与者）能看到获批 Contract
  assert.equal((await req(`/api/admin/campaigns/${campaignId}/economy-contract/approve`, { method: 'POST', cookie: admin, body: { contractVersion: 'wb-v1' } })).response.status, 200);
  const creatorContracts = (await bootstrap(creator)).economyContracts;
  assert.equal(creatorContracts.length, 1);
  assert.equal(creatorContracts[0].status, 'approved');
  assert.equal(creatorContracts[0].settlement.cashEnabled, true);

  // 平台创建权益 → managedAitEntitlements 出现 pending
  const entitlement = await req(`/api/admin/campaigns/${campaignId}/ait-entitlements`, { method: 'POST', cookie: admin, body: {
    userId: creatorData.me.id, contractVersion: 'wb-v1', sourceType: 'creator_delivery',
    sourceEventType: 'creator_delivery_approved', sourceEventId: 'wb-delivery-1', amount: 120,
    attributionReference: 'partner:wb-delivery-1',
  } });
  assert.equal(entitlement.response.status, 201);
  const entitlementId = entitlement.data.entitlement.id;
  let adminView = await bootstrap(admin);
  const managed = adminView.managedAitEntitlements.find(row => row.id === entitlementId);
  assert.equal(managed.status, 'pending');
  assert.equal(managed.userName, creatorData.me.displayName);
  assert.equal(managed.campaignTitle, 'Workbench Surface');

  // 平台批准 → 创作者申请付款结算 → managedPaymentSettlements 走到 paid
  assert.equal((await req(`/api/admin/ait-entitlements/${entitlementId}/review`, { method: 'POST', cookie: admin, body: { decision: 'approve' } })).data.entitlement.status, 'available');
  const payment = await req(`/api/ait-entitlements/${entitlementId}/settlements`, { method: 'POST', cookie: creator, body: {
    settlementType: 'payment', currency: 'USDT', grossAmount: '12.00',
    payerSubject: `brand:${brandData.me.id}`, payeeSubject: `creator:${creatorData.me.id}`,
  } });
  assert.equal(payment.response.status, 201);
  adminView = await bootstrap(admin);
  const managedPayment = adminView.managedPaymentSettlements.find(row => row.id === payment.data.record.id);
  assert.equal(managedPayment.status, 'submitted');
  assert.equal(managedPayment.userName, creatorData.me.displayName);
  assert.equal((await req(`/api/admin/payment-settlements/${payment.data.record.id}/review`, { method: 'POST', cookie: admin, body: { decision: 'approve', note: '主体与 Contract 已复核' } })).data.settlement.status, 'approved');
  const completed = await req(`/api/admin/payment-settlements/${payment.data.record.id}/complete`, { method: 'POST', cookie: admin, body: { paymentReference: 'pay:wb-1', receiptReference: 'receipt:wb-1' } });
  assert.equal(completed.data.record.status, 'paid');
  const creatorFinal = await bootstrap(creator);
  assert.equal(creatorFinal.paymentSettlements[0].status, 'paid');
  assert.equal(creatorFinal.aitEntitlements[0].status, 'settled');

  // 申诉：创作者提交 → managedLedgerAppeals 可见 → 平台处理
  const appeal = await req('/api/economy/appeals', { method: 'POST', cookie: creator, body: { subjectType: 'ait_entitlement', subjectId: entitlementId, reason: '结算金额与 Contract 约定不一致，请复核。' } });
  assert.equal(appeal.response.status, 201);
  adminView = await bootstrap(admin);
  const managedAppeal = adminView.managedLedgerAppeals.find(row => row.id === appeal.data.appeal.id);
  assert.equal(managedAppeal.status, 'submitted');
  assert.equal((await req(`/api/admin/economy/appeals/${appeal.data.appeal.id}/review`, { method: 'POST', cookie: admin, body: { decision: 'reject', resolutionNote: '金额与 Contract 一致，维持原记录。' } })).data.appeal.status, 'rejected');

  // 权益申领（benefit）分支：再造一条权益并走 submitted → approved → fulfilled
  const second = await req(`/api/admin/campaigns/${campaignId}/ait-entitlements`, { method: 'POST', cookie: admin, body: {
    userId: creatorData.me.id, contractVersion: 'wb-v1', sourceType: 'creator_operation',
    sourceEventType: 'operation_review_passed', sourceEventId: 'wb-operation-1', amount: 120,
    attributionReference: 'partner:operation-wb-1',
  } });
  assert.equal(second.response.status, 201);
  const secondId = second.data.entitlement.id;
  assert.equal((await req(`/api/admin/ait-entitlements/${secondId}/review`, { method: 'POST', cookie: admin, body: { decision: 'approve' } })).data.entitlement.status, 'available');
  const benefit = await req(`/api/ait-entitlements/${secondId}/settlements`, { method: 'POST', cookie: creator, body: { settlementType: 'benefit', currency: 'contract_defined_non_financial' } });
  assert.equal(benefit.response.status, 201);
  adminView = await bootstrap(admin);
  const managedClaim = adminView.managedBenefitClaims.find(row => row.id === benefit.data.record.id);
  assert.equal(managedClaim.status, 'submitted');
  assert.equal((await req(`/api/admin/benefit-claims/${benefit.data.record.id}/review`, { method: 'POST', cookie: admin, body: { decision: 'approve', note: '权益类型在 Contract 内' } })).data.claim.status, 'approved');
  assert.equal((await req(`/api/admin/benefit-claims/${benefit.data.record.id}/review`, { method: 'POST', cookie: admin, body: { decision: 'fulfill', fulfillmentReference: 'benefit:wb-1' } })).data.claim.status, 'fulfilled');

  // 非管理员看不到管理面
  const brandFinal = await bootstrap(brand);
  assert.equal(brandFinal.managedAitEntitlements.length, 0);
  assert.equal(brandFinal.managedPaymentSettlements.length, 0);
});
