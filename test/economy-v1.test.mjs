import test from 'node:test';
import assert from 'node:assert/strict';
import { openDatabase, closeDatabase } from '../src/db.mjs';
import {
  activateSubscription, awardAipRule, completePaymentSettlement, consumeCreation,
  createAitEntitlement, economySnapshot, ensureEconomyAccount, grantAip,
  quoteCreation, requestAitSettlement, reviewAitEntitlement, reviewCreatorApplication,
  reviewPaymentSettlement, submitCreatorApplication, upsertCampaignEconomyRule,
} from '../src/economy.mjs';

function fixture() {
  const db = openDatabase(':memory:');
  const now = new Date().toISOString();
  for (const [id, role] of [['player', 'creator'], ['brand', 'brand'], ['admin', 'admin']]) {
    db.prepare('INSERT INTO users(id,role,display_name,email,created_at,updated_at) VALUES (?,?,?,?,?,?)')
      .run(id, role, id, `${id}@example.test`, now, now);
  }
  const player = db.prepare(`SELECT * FROM users WHERE id='player'`).get();
  ensureEconomyAccount(db, player, { forcePlayer: true });
  ensureEconomyAccount(db, db.prepare(`SELECT * FROM users WHERE id='brand'`).get());
  ensureEconomyAccount(db, db.prepare(`SELECT * FROM users WHERE id='admin'`).get());
  return { db, player, close: () => closeDatabase(db) };
}

test('one account moves from player through KYC review to active KOL without replacing the account', () => {
  const f = fixture();
  try {
    assert.deepEqual(economySnapshot(f.db, f.player).roles.map(role => role.role_key), ['player']);
    const submitted = submitCreatorApplication(f.db, { userId: f.player.id, applicationNote: '持续创作互动游戏并参与合规 Campaign 运营。', regionCode: 'HK', kycConsent: true });
    assert.equal(submitted.application.status, 'kyc_pending');
    assert.throws(() => reviewCreatorApplication(f.db, { applicationId: submitted.application.id, reviewerId: 'admin', decision: 'approve' }), /完成 KYC/);
    assert.equal(reviewCreatorApplication(f.db, { applicationId: submitted.application.id, reviewerId: 'admin', decision: 'verify_kyc', evidenceReference: 'kyc-provider:case-1' }).status, 'under_review');
    assert.equal(reviewCreatorApplication(f.db, { applicationId: submitted.application.id, reviewerId: 'admin', decision: 'approve', note: '人工审核通过' }).status, 'approved');
    const economy = economySnapshot(f.db, f.player);
    assert.equal(economy.profile.creator_status, 'active');
    assert.deepEqual(economy.roles.map(role => role.role_key), ['kol', 'player']);
  } finally { f.close(); }
});

test('subscription grants allowances rather than AIP or AIT and creation consumes allowance before AIP', () => {
  const f = fixture();
  try {
    grantAip(f.db, { userId: f.player.id, amount: 100, sourceType: 'test', eventKey: 'test:initial-aip' });
    const quote = quoteCreation(f.db, { userId: f.player.id, usageType: 'light_creation', units: 4 });
    assert.deepEqual({ subscriptionUnits: quote.subscriptionUnits, aipUnits: quote.aipUnits, aipCost: quote.aipCost, aitCost: quote.aitCost }, { subscriptionUnits: 3, aipUnits: 1, aipCost: 50, aitCost: 0 });
    consumeCreation(f.db, { userId: f.player.id, usageType: 'light_creation', units: 4, idempotencyKey: 'creation:test:0001', subjectId: 'draft-1' });
    let economy = economySnapshot(f.db, f.player);
    assert.equal(economy.aip.available, 50);
    assert.equal(economy.ait.available, 0);
    activateSubscription(f.db, { userId: f.player.id, planKey: 'creator_pro', sourceType: 'admin_grant' });
    economy = economySnapshot(f.db, f.player);
    assert.equal(economy.aip.available, 50);
    assert.equal(economy.ait.available, 0);
    assert.equal(economy.subscription.planKey, 'creator_pro');
  } finally { f.close(); }
});

test('all ordinary valid game completions use the same AIP rule and expired batches leave the available balance', () => {
  const f = fixture();
  try {
    awardAipRule(f.db, { userId: f.player.id, ruleKey: 'playable_complete', eventKey: 'runtime:game-a', subjectType: 'content', subjectId: 'game-a' });
    awardAipRule(f.db, { userId: f.player.id, ruleKey: 'playable_complete', eventKey: 'runtime:game-b', subjectType: 'content', subjectId: 'game-b' });
    assert.equal(economySnapshot(f.db, f.player).aip.available, 10);
    f.db.prepare(`UPDATE ledger_batches SET expires_at='2000-01-01T00:00:00.000Z' WHERE user_id=? AND asset_type='AIP'`).run(f.player.id);
    assert.equal(economySnapshot(f.db, f.player).aip.available, 0);
  } finally { f.close(); }
});

test('AIT requires an approved locked Campaign Contract and settles through a separate payment record', () => {
  const f = fixture();
  try {
    const now = new Date().toISOString();
    f.db.prepare(`INSERT INTO campaigns(id,brand_user_id,title,objective,status,brief_json,budget_ait,reward_ait,starts_at,ends_at,created_at,updated_at)
      VALUES ('campaign-1','brand','Campaign','Objective','active','{}',1000,100,?,?,?,?)`)
      .run(now, new Date(Date.now() + 86_400_000).toISOString(), now, now);
    const lockedFields = ['commercial', 'audience.included_regions', 'audience.excluded_regions', 'audience.minimum_age', 'cta.destination', 'reward', 'compliance', 'data_policy', 'attribution.model', 'attribution.window_days', 'measurement.primary_success_event', 'approval', 'release.kill_switch'];
    upsertCampaignEconomyRule(f.db, { campaignId: 'campaign-1', contractVersion: 'contract-v1', primarySuccessEvent: 'kyc_complete', playerRule: { perUserCapAit: 200, amountAit: 100 }, creatorRule: { perUserCapAit: 600, eventTypes: ['delivery_approved'] }, attribution: { model: 'last_eligible_touch' }, eligibility: { kyc: true }, budget: { totalAit: 1000 }, settlement: { cashEnabled: true, currencies: ['USDT'], benefitTypes: ['membership'] }, lockedFields, approvedBy: 'admin', approve: true });
    assert.throws(() => createAitEntitlement(f.db, { userId: f.player.id, campaignId: 'campaign-1', contractVersion: 'contract-v1', sourceType: 'player_campaign', sourceEventType: 'click', sourceEventId: 'event-wrong', amount: 100, attributionReference: 'partner:event-wrong', riskDecision: 'clear' }), /主要成功事件/);
    assert.throws(() => createAitEntitlement(f.db, { userId: f.player.id, campaignId: 'campaign-1', contractVersion: 'contract-v1', sourceType: 'player_campaign', sourceEventType: 'kyc_complete', sourceEventId: 'event-risk', amount: 100, attributionReference: 'partner:event-risk', riskDecision: 'review' }), /风控/);
    const entitlement = createAitEntitlement(f.db, { userId: f.player.id, campaignId: 'campaign-1', contractVersion: 'contract-v1', sourceType: 'player_campaign', sourceEventType: 'kyc_complete', sourceEventId: 'event-clear', amount: 100, attributionReference: 'partner:event-clear', riskDecision: 'clear' }).entitlement;
    assert.equal(reviewAitEntitlement(f.db, { entitlementId: entitlement.id, decision: 'approve', reviewerId: 'admin' }).status, 'available');
    const payment = requestAitSettlement(f.db, { entitlementId: entitlement.id, userId: f.player.id, settlementType: 'payment', currency: 'USDT', grossAmount: '10.00', payerSubject: 'brand:brand', payeeSubject: 'user:player' }).record;
    assert.equal(reviewPaymentSettlement(f.db, { settlementId: payment.id, reviewerId: 'admin', decision: 'approve' }).status, 'approved');
    assert.throws(() => completePaymentSettlement(f.db, { settlementId: payment.id, reviewerId: 'admin' }), /回执/);
    assert.equal(completePaymentSettlement(f.db, { settlementId: payment.id, reviewerId: 'admin', paymentReference: 'provider:payment-1', receiptReference: 'receipt:payment-1' }).record.status, 'paid');
    assert.equal(economySnapshot(f.db, f.player).ait.settled, 100);
  } finally { f.close(); }
});
