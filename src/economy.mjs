import { transaction } from './db.mjs';
import { HttpError, isoNow, jsonString, safeJson, uid } from './utils.mjs';

export const ECONOMY_VERSION = 'airvana-economy-v1.0';

export const CREATION_COSTS = Object.freeze({
  light_creation: 50,
  deep_creation: 300,
  remix: 30,
  regenerate_small: 20,
  regenerate_large: 100,
  image_generation: 20,
  audio_generation: 30,
});

export const AIP_REWARD_RULES = Object.freeze({
  registration_first_play: { amount: 100, expiryDays: 365 },
  daily_login: { amount: 5, expiryDays: 365 },
  streak_day_2: { amount: 10, expiryDays: 365 },
  streak_day_3: { amount: 15, expiryDays: 365 },
  streak_day_4: { amount: 20, expiryDays: 365 },
  streak_day_5: { amount: 20, expiryDays: 365 },
  streak_day_6: { amount: 25, expiryDays: 365 },
  streak_day_7: { amount: 30, expiryDays: 365 },
  playable_complete: { amount: 5, expiryDays: 365 },
  daily_recommendation: { amount: 20, expiryDays: 365 },
  qualified_invitation: { amount: 100, expiryDays: 365 },
  first_publish: { amount: 50, expiryDays: 365 },
  version_optimization: { amount: 20, expiryDays: 365 },
  operation_task_low: { amount: 10, expiryDays: 365 },
  operation_task_medium: { amount: 20, expiryDays: 365 },
  operation_task_high: { amount: 30, expiryDays: 365 },
});

const PLAN_SEEDS = [
  {
    id: 'plan_free_v1', planKey: 'free', name: 'Free', audience: '新用户、玩家与轻量创作者',
    allowance: { light_creation: 3, deep_creation: 1, remix: 2, regenerate_small: 2, regenerate_large: 0, image_generation: 1, audio_generation: 1 },
    features: ['基础试玩', '基础模板', '基础数据'],
  },
  {
    id: 'plan_creator_pro_v1', planKey: 'creator_pro', name: 'Creator Pro', audience: '持续创作和运营的 KOL',
    allowance: { light_creation: 50, deep_creation: 10, remix: 30, regenerate_small: 50, regenerate_large: 10, image_generation: 50, audio_generation: 50 },
    features: ['高级分析', '版本历史', '素材空间', '优先生成', '协作能力'],
  },
  {
    id: 'plan_brand_campaign_v1', planKey: 'brand_campaign', name: 'Brand / Campaign', audience: '品牌与 Campaign 团队',
    allowance: { light_creation: 200, deep_creation: 40, remix: 100, regenerate_small: 200, regenerate_large: 40, image_generation: 200, audio_generation: 200 },
    features: ['Campaign Brief', 'Campaign Contract', '成员审批', '归因审计', '预算与权益池'],
  },
];

const REQUIRED_LOCKED_FIELDS = [
  'commercial', 'audience.included_regions', 'audience.excluded_regions', 'audience.minimum_age',
  'cta.destination', 'reward', 'compliance', 'data_policy', 'attribution.model',
  'attribution.window_days', 'measurement.primary_success_event', 'approval', 'release.kill_switch',
];

function addDays(date, days) {
  return new Date(new Date(date).getTime() + days * 86_400_000).toISOString();
}

function monthCycleKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function activeDateSql() {
  return `(expires_at IS NULL OR expires_at>?)`;
}

export function seedEconomyPlans(db) {
  const now = isoNow();
  for (const plan of PLAN_SEEDS) {
    db.prepare(`INSERT OR IGNORE INTO subscription_plans
      (id,plan_key,name,audience,status,allowance_json,feature_json,price_status,created_at,updated_at)
      VALUES (?,?,?,?, 'active',?,?,'pending_approval',?,?)`)
      .run(plan.id, plan.planKey, plan.name, plan.audience, jsonString(plan.allowance), jsonString(plan.features), now, now);
  }
}

export function ensureEconomyAccount(db, user, { forcePlayer = false } = {}) {
  if (!user) return;
  seedEconomyPlans(db);
  const now = isoNow();
  const currentProfile = db.prepare('SELECT * FROM economy_profiles WHERE user_id=?').get(user.id);
  const legacyCreator = user.role === 'creator' && !forcePlayer && currentProfile?.creator_status !== 'not_applied';
  db.prepare(`INSERT OR IGNORE INTO economy_profiles
    (user_id,base_role,creator_status,kyc_status,region_status,account_verified_at,created_at,updated_at)
    VALUES (?,'player',?,?, 'unknown',?,?,?)`)
    .run(user.id, legacyCreator ? 'active' : 'not_applied', legacyCreator ? 'verified_legacy' : 'not_started', now, now, now);
  const roles = [
    ['player', 'active'],
    ...(legacyCreator ? [['kol', 'active']] : []),
    ...(user.role === 'brand' ? [['brand', 'active']] : []),
    ...(user.role === 'admin' ? [['admin', 'active']] : []),
  ];
  for (const [roleKey, status] of roles) {
    db.prepare(`INSERT OR IGNORE INTO user_role_memberships
      (id,user_id,role_key,status,granted_by,granted_at,reason_code)
      VALUES (?,?,?,?, 'legacy_migration',?,'economy_v1_bootstrap')`)
      .run(uid('role'), user.id, roleKey, status, now);
  }
  const entitlements = [
    ['player.basic', 'account'],
    ...(legacyCreator ? [['creator.app_only', 'legacy_creator'], ['creator.campaign', 'legacy_creator']] : []),
    ...(user.role === 'brand' ? [['campaign.manage', 'legacy_brand']] : []),
    ...(user.role === 'admin' ? [['economy.review', 'legacy_admin']] : []),
  ];
  for (const [key, source] of entitlements) {
    db.prepare(`INSERT OR IGNORE INTO user_entitlements
      (id,user_id,entitlement_key,status,source_type,source_id,starts_at,metadata_json)
      VALUES (?,?,?,'active',?, '',?,'{}')`).run(uid('entitlement'), user.id, key, source, now);
  }
  ensureFreeAllowance(db, user.id);
}

export function ensureFreeAllowance(db, userId) {
  const now = isoNow();
  const active = db.prepare(`SELECT s.* FROM subscriptions s JOIN subscription_plans p ON p.id=s.plan_id
    WHERE s.user_id=? AND s.status='active' AND s.ends_at>? ORDER BY s.starts_at DESC LIMIT 1`).get(userId, now);
  if (active) return active;
  const plan = db.prepare(`SELECT * FROM subscription_plans WHERE plan_key='free' AND status='active'`).get();
  if (!plan) return null;
  const subscriptionId = uid('subscription');
  const endsAt = addDays(now, 30);
  db.prepare(`INSERT INTO subscriptions
    (id,user_id,plan_id,status,source_type,starts_at,ends_at,cancel_at_period_end,created_at,updated_at)
    VALUES (?,?,?,'active','platform_free',?,?,0,?,?)`)
    .run(subscriptionId, userId, plan.id, now, endsAt, now, now);
  const cycleKey = monthCycleKey(new Date(now));
  const allowance = safeJson(plan.allowance_json);
  for (const [key, units] of Object.entries(allowance)) {
    db.prepare(`INSERT INTO subscription_allowances
      (id,subscription_id,user_id,cycle_key,allowance_key,granted_units,used_units,starts_at,expires_at)
      VALUES (?,?,?,?,?,?,0,?,?)`).run(uid('allowance'), subscriptionId, userId, cycleKey, key, Number(units) || 0, now, endsAt);
  }
  return db.prepare('SELECT * FROM subscriptions WHERE id=?').get(subscriptionId);
}

export function submitCreatorApplication(db, { userId, applicationNote, regionCode, kycConsent }) {
  if (String(applicationNote || '').trim().length < 20) throw new HttpError(400, '请填写至少 20 个字符的创作者申请说明', 'application_note_required');
  if (!String(regionCode || '').trim()) throw new HttpError(400, '请选择常驻地区', 'region_required');
  if (kycConsent !== true) throw new HttpError(400, '提交申请前需要同意 KYC 核验', 'kyc_consent_required');
  const profile = db.prepare('SELECT * FROM economy_profiles WHERE user_id=?').get(userId);
  if (!profile) throw new HttpError(409, '经济账户尚未初始化', 'economy_account_required');
  if (profile.creator_status === 'active') throw new HttpError(409, '当前账号已具备 KOL 资格', 'kol_already_active');
  const active = db.prepare(`SELECT * FROM creator_applications WHERE user_id=? AND status IN ('submitted','kyc_pending','under_review','approved') ORDER BY created_at DESC LIMIT 1`).get(userId);
  if (active) return { application: active, idempotent: true };
  const id = uid('creator_application');
  const now = isoNow();
  db.prepare(`INSERT INTO creator_applications
    (id,user_id,status,application_note,region_code,kyc_consent_at,created_at,updated_at)
    VALUES (?,?,'kyc_pending',?,?,?,?,?)`).run(id, userId, String(applicationNote).trim().slice(0, 1500), String(regionCode).trim().slice(0, 40), now, now, now);
  db.prepare(`UPDATE economy_profiles SET creator_status='applied',kyc_status='pending',region_status='pending_review',updated_at=? WHERE user_id=?`).run(now, userId);
  return { application: db.prepare('SELECT * FROM creator_applications WHERE id=?').get(id), idempotent: false };
}

export function reviewCreatorApplication(db, { applicationId, reviewerId, decision, evidenceReference = null, note = '' }) {
  const application = db.prepare('SELECT * FROM creator_applications WHERE id=?').get(applicationId);
  if (!application) throw new HttpError(404, '创作者申请不存在', 'not_found');
  const now = isoNow();
  return transaction(db, () => {
    if (decision === 'verify_kyc') {
      if (application.status !== 'kyc_pending') throw new HttpError(409, '当前申请不能进行 KYC 核验', 'invalid_state');
      if (!String(evidenceReference || '').trim()) throw new HttpError(400, 'KYC 通过必须提供核验凭证引用', 'kyc_evidence_required');
      db.prepare(`UPDATE creator_applications SET status='under_review',kyc_reference=?,kyc_verified_at=?,review_note=?,reviewed_by=?,reviewed_at=?,updated_at=? WHERE id=?`)
        .run(String(evidenceReference).slice(0, 240), now, String(note).slice(0, 800), reviewerId, now, now, applicationId);
      db.prepare(`UPDATE economy_profiles SET kyc_status='verified',region_status='eligible',updated_at=? WHERE user_id=?`).run(now, application.user_id);
    } else if (decision === 'approve') {
      if (application.status !== 'under_review') throw new HttpError(409, '只有完成 KYC 的申请可以批准', 'kyc_required');
      db.prepare(`UPDATE creator_applications SET status='approved',review_note=?,reviewed_by=?,reviewed_at=?,updated_at=? WHERE id=?`)
        .run(String(note).slice(0, 800), reviewerId, now, now, applicationId);
      db.prepare(`UPDATE economy_profiles SET creator_status='active',updated_at=? WHERE user_id=?`).run(now, application.user_id);
      db.prepare(`INSERT INTO user_role_memberships (id,user_id,role_key,status,granted_by,granted_at,reason_code)
        VALUES (?,?,'kol','active',?,?,'creator_application_approved')
        ON CONFLICT(user_id,role_key) DO UPDATE SET status='active',granted_by=excluded.granted_by,granted_at=excluded.granted_at,suspended_at=NULL,reason_code=excluded.reason_code`)
        .run(uid('role'), application.user_id, reviewerId, now);
      for (const key of ['creator.app_only', 'creator.campaign']) {
        db.prepare(`INSERT INTO user_entitlements (id,user_id,entitlement_key,status,source_type,source_id,starts_at,metadata_json)
          VALUES (?,?,?,'active','creator_application',?,?, '{}')
          ON CONFLICT(user_id,entitlement_key,source_type,source_id) DO UPDATE SET status='active',starts_at=excluded.starts_at`)
          .run(uid('entitlement'), application.user_id, key, applicationId, now);
      }
    } else if (decision === 'reject') {
      if (!['kyc_pending', 'under_review'].includes(application.status)) throw new HttpError(409, '当前申请不能拒绝', 'invalid_state');
      if (String(note || '').trim().length < 4) throw new HttpError(400, '拒绝申请需要填写原因', 'review_note_required');
      db.prepare(`UPDATE creator_applications SET status='rejected',review_note=?,reviewed_by=?,reviewed_at=?,updated_at=? WHERE id=?`)
        .run(String(note).slice(0, 800), reviewerId, now, now, applicationId);
      db.prepare(`UPDATE economy_profiles SET creator_status='rejected',updated_at=? WHERE user_id=?`).run(now, application.user_id);
    } else if (decision === 'suspend') {
      if (application.status !== 'approved') throw new HttpError(409, '只有已批准 KOL 可以暂停', 'invalid_state');
      db.prepare(`UPDATE creator_applications SET status='suspended',review_note=?,reviewed_by=?,reviewed_at=?,updated_at=? WHERE id=?`)
        .run(String(note).slice(0, 800), reviewerId, now, now, applicationId);
      db.prepare(`UPDATE economy_profiles SET creator_status='suspended',updated_at=? WHERE user_id=?`).run(now, application.user_id);
      db.prepare(`UPDATE user_role_memberships SET status='suspended',suspended_at=?,reason_code='platform_suspension' WHERE user_id=? AND role_key='kol'`).run(now, application.user_id);
      db.prepare(`UPDATE user_entitlements SET status='suspended' WHERE user_id=? AND entitlement_key LIKE 'creator.%'`).run(application.user_id);
    } else {
      throw new HttpError(400, '创作者申请审核决定无效', 'validation_error');
    }
    return db.prepare('SELECT * FROM creator_applications WHERE id=?').get(applicationId);
  });
}

export function activateSubscription(db, { userId, planKey, sourceType, paymentReference = null, days = 30 }) {
  const plan = db.prepare(`SELECT * FROM subscription_plans WHERE plan_key=? AND status='active'`).get(planKey);
  if (!plan) throw new HttpError(404, '订阅套餐不存在', 'subscription_plan_not_found');
  if (!['admin_grant', 'verified_payment', 'platform_free'].includes(sourceType)) {
    throw new HttpError(400, '订阅来源无效', 'invalid_subscription_source');
  }
  if (sourceType === 'verified_payment' && !String(paymentReference || '').trim()) {
    throw new HttpError(400, '付费订阅必须提供已验证付款引用', 'payment_reference_required');
  }
  const now = isoNow();
  const endsAt = addDays(now, days);
  return transaction(db, () => {
    db.prepare(`UPDATE subscriptions SET status='expired',updated_at=? WHERE user_id=? AND status='active'`).run(now, userId);
    const subscriptionId = uid('subscription');
    db.prepare(`INSERT INTO subscriptions
      (id,user_id,plan_id,status,source_type,payment_reference,starts_at,ends_at,cancel_at_period_end,created_at,updated_at)
      VALUES (?,?,?,'active',?,?,?,?,0,?,?)`)
      .run(subscriptionId, userId, plan.id, sourceType, paymentReference, now, endsAt, now, now);
    const cycleKey = monthCycleKey(new Date(now));
    for (const [key, units] of Object.entries(safeJson(plan.allowance_json))) {
      db.prepare(`INSERT INTO subscription_allowances
        (id,subscription_id,user_id,cycle_key,allowance_key,granted_units,used_units,starts_at,expires_at)
        VALUES (?,?,?,?,?,?,0,?,?)`).run(uid('allowance'), subscriptionId, userId, cycleKey, key, Number(units) || 0, now, endsAt);
    }
    return db.prepare(`SELECT s.*,p.plan_key,p.name FROM subscriptions s JOIN subscription_plans p ON p.id=s.plan_id WHERE s.id=?`).get(subscriptionId);
  });
}

export function grantAip(db, { userId, amount, sourceType, eventKey, subjectType = 'user', subjectId = userId, expiryDays = 365, campaignId = null, contractVersion = null, riskDecision = 'clear', reasonCode = null, metadata = {} }) {
  const numericAmount = Number(amount);
  if (!Number.isInteger(numericAmount) || numericAmount <= 0) throw new HttpError(400, 'AIP 发放数量无效', 'invalid_aip_amount');
  const existing = db.prepare(`SELECT * FROM ledger_batches WHERE asset_type='AIP' AND idempotency_key=?`).get(eventKey);
  if (existing) return { batch: existing, idempotent: true };
  const now = isoNow();
  const expiresAt = expiryDays == null ? null : addDays(now, expiryDays);
  const batchId = uid('aip_batch');
  db.prepare(`INSERT INTO ledger_batches
    (id,user_id,asset_type,source_type,original_amount,remaining_amount,status,campaign_id,contract_version,earned_at,available_at,expires_at,risk_decision,reason_code,idempotency_key,metadata_json)
    VALUES (?,?,'AIP',?,?,?,'available',?,?,?,?,?,?,?,?,?)`)
    .run(batchId, userId, sourceType, numericAmount, numericAmount, campaignId, contractVersion, now, now, expiresAt, riskDecision, reasonCode, eventKey, jsonString(metadata));
  db.prepare(`INSERT INTO point_events
    (id,user_id,currency,amount,status,event_type,event_key,subject_type,subject_id,metadata_json,created_at,batch_id,available_at,expires_at,campaign_id,contract_version,risk_decision,reason_code)
    VALUES (?,?,'AIP',?,'posted',?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(uid('point'), userId, numericAmount, sourceType, eventKey, subjectType, subjectId, jsonString(metadata), now, batchId, now, expiresAt, campaignId, contractVersion, riskDecision, reasonCode);
  return { batch: db.prepare('SELECT * FROM ledger_batches WHERE id=?').get(batchId), idempotent: false };
}

export function awardAipRule(db, { userId, ruleKey, eventKey, subjectType = 'user', subjectId = userId, metadata = {} }) {
  const rule = AIP_REWARD_RULES[ruleKey];
  if (!rule) throw new HttpError(400, 'AIP 奖励规则不存在', 'aip_rule_not_found');
  return grantAip(db, { userId, amount: rule.amount, sourceType: ruleKey, eventKey, subjectType, subjectId, expiryDays: rule.expiryDays, metadata: { economyVersion: ECONOMY_VERSION, ...metadata } });
}

export function expireAipBatches(db, userId, now = isoNow()) {
  const expiring = db.prepare(`SELECT id FROM ledger_batches WHERE user_id=? AND asset_type='AIP' AND status='available' AND expires_at IS NOT NULL AND expires_at<=?`).all(userId, now);
  for (const row of expiring) {
    db.prepare(`UPDATE ledger_batches SET status='expired',remaining_amount=0 WHERE id=?`).run(row.id);
    db.prepare(`UPDATE point_events SET status='expired' WHERE batch_id=? AND amount>0`).run(row.id);
  }
  return expiring.length;
}

function pointBalance(db, userId, currency) {
  const now = isoNow();
  return Number(db.prepare(`SELECT COALESCE(SUM(amount),0) total FROM point_events
    WHERE user_id=? AND currency=? AND status='posted' AND (expires_at IS NULL OR expires_at>?)`).get(userId, currency, now)?.total || 0);
}

function syncLegacyAipBalance(db, userId) {
  expireAipBatches(db, userId);
  const balance = pointBalance(db, userId, 'AIP');
  const tracked = Number(db.prepare(`SELECT COALESCE(SUM(remaining_amount),0) total FROM ledger_batches
    WHERE user_id=? AND asset_type='AIP' AND status='available' AND ${activeDateSql()}`).get(userId, isoNow())?.total || 0);
  const difference = Math.floor(balance - tracked);
  if (difference <= 0) return;
  const eventKey = `legacy-balance:${userId}`;
  const existing = db.prepare(`SELECT id FROM ledger_batches WHERE asset_type='AIP' AND idempotency_key=?`).get(eventKey);
  if (existing) return;
  const now = isoNow();
  db.prepare(`INSERT INTO ledger_batches
    (id,user_id,asset_type,source_type,original_amount,remaining_amount,status,earned_at,available_at,expires_at,risk_decision,reason_code,idempotency_key,metadata_json)
    VALUES (?,?,'AIP','legacy_balance_import',?,?,'available',?,?,?,'clear','legacy_migration',?,'{}')`)
    .run(uid('aip_batch'), userId, difference, difference, now, now, addDays(now, 365), eventKey);
}

export function consumeAip(db, { userId, amount, usageType, eventKey, subjectType, subjectId, metadata = {} }) {
  const numericAmount = Number(amount);
  if (!Number.isInteger(numericAmount) || numericAmount <= 0) throw new HttpError(400, 'AIP 消耗数量无效', 'invalid_aip_cost');
  const existing = db.prepare(`SELECT * FROM point_events WHERE user_id=? AND currency='AIP' AND event_key=?`).get(userId, eventKey);
  if (existing) return { spent: Math.abs(Number(existing.amount)), idempotent: true, allocations: safeJson(existing.metadata_json).allocations || [] };
  syncLegacyAipBalance(db, userId);
  const now = isoNow();
  const batches = db.prepare(`SELECT * FROM ledger_batches WHERE user_id=? AND asset_type='AIP' AND status='available'
    AND remaining_amount>0 AND ${activeDateSql()} ORDER BY COALESCE(expires_at,'9999-12-31T23:59:59.999Z'),earned_at,id`).all(userId, now);
  const available = batches.reduce((sum, batch) => sum + Number(batch.remaining_amount), 0);
  if (available < numericAmount) throw new HttpError(409, `AIP 不足，需要 ${numericAmount} AIP，当前可用 ${available} AIP`, 'insufficient_aip');
  let remaining = numericAmount;
  const allocations = [];
  for (const batch of batches) {
    if (!remaining) break;
    const used = Math.min(remaining, Number(batch.remaining_amount));
    const next = Number(batch.remaining_amount) - used;
    db.prepare(`UPDATE ledger_batches SET remaining_amount=?,status=?,spent_at=? WHERE id=?`)
      .run(next, next === 0 ? 'spent' : 'available', next === 0 ? now : batch.spent_at, batch.id);
    allocations.push({ batchId: batch.id, amount: used, expiresAt: batch.expires_at });
    remaining -= used;
  }
  db.prepare(`INSERT INTO point_events
    (id,user_id,currency,amount,status,event_type,event_key,subject_type,subject_id,metadata_json,created_at,spent_at,risk_decision,reason_code)
    VALUES (?,?,'AIP',?,'posted',?,?,?,?,?,?,?,'clear','authorized_usage')`)
    .run(uid('point'), userId, -numericAmount, usageType, eventKey, subjectType, subjectId, jsonString({ ...metadata, allocations }), now, now);
  return { spent: numericAmount, idempotent: false, allocations };
}

function activeAllowance(db, userId, allowanceKey) {
  const now = isoNow();
  return db.prepare(`SELECT a.*,s.plan_id,p.plan_key,p.name plan_name FROM subscription_allowances a
    JOIN subscriptions s ON s.id=a.subscription_id JOIN subscription_plans p ON p.id=s.plan_id
    WHERE a.user_id=? AND a.allowance_key=? AND s.status='active' AND s.ends_at>? AND a.expires_at>?
    AND a.used_units<a.granted_units ORDER BY s.starts_at DESC LIMIT 1`).get(userId, allowanceKey, now, now);
}

export function quoteCreation(db, { userId, usageType, units = 1 }) {
  if (!Object.hasOwn(CREATION_COSTS, usageType)) throw new HttpError(400, '创作类型无效', 'invalid_creation_type');
  const safeUnits = Math.max(1, Math.min(100, Number(units) || 1));
  const allowance = activeAllowance(db, userId, usageType);
  const allowanceRemaining = allowance ? Number(allowance.granted_units) - Number(allowance.used_units) : 0;
  const subscriptionUnits = Math.min(safeUnits, allowanceRemaining);
  const aipUnits = safeUnits - subscriptionUnits;
  return {
    economyVersion: ECONOMY_VERSION,
    usageType,
    units: safeUnits,
    subscriptionUnits,
    aipUnits,
    aipCost: aipUnits * CREATION_COSTS[usageType],
    unitAipCost: CREATION_COSTS[usageType],
    planKey: allowance?.plan_key || null,
    expiresAt: allowance?.expires_at || null,
    aitCost: 0,
  };
}

export function consumeCreation(db, { userId, usageType, units = 1, idempotencyKey, subjectType = 'creation', subjectId, metadata = {} }) {
  if (String(idempotencyKey || '').trim().length < 8) throw new HttpError(400, '创作扣费幂等键无效', 'invalid_idempotency_key');
  if (!String(subjectId || '').trim()) throw new HttpError(400, '创作对象不能为空', 'subject_required');
  const existing = db.prepare(`SELECT * FROM economy_usage_events WHERE user_id=? AND idempotency_key=?`).get(userId, idempotencyKey);
  if (existing) return { usage: existing, quote: safeJson(existing.metadata_json), idempotent: true };
  const quote = quoteCreation(db, { userId, usageType, units });
  return transaction(db, () => {
    let allowanceId = null;
    if (quote.subscriptionUnits) {
      const allowance = activeAllowance(db, userId, usageType);
      if (!allowance) throw new HttpError(409, '订阅额度已变化，请重新确认', 'allowance_changed');
      db.prepare(`UPDATE subscription_allowances SET used_units=used_units+? WHERE id=? AND used_units+?<=granted_units`)
        .run(quote.subscriptionUnits, allowance.id, quote.subscriptionUnits);
      allowanceId = allowance.id;
    }
    if (quote.aipCost) consumeAip(db, { userId, amount: quote.aipCost, usageType: `creation_${usageType}`, eventKey: `creation:${idempotencyKey}`, subjectType, subjectId, metadata });
    const id = uid('usage');
    db.prepare(`INSERT INTO economy_usage_events
      (id,user_id,usage_type,units,aip_cost,subscription_allowance_id,subject_type,subject_id,idempotency_key,metadata_json,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run(id, userId, usageType, quote.units, quote.aipCost, allowanceId, subjectType, subjectId, idempotencyKey, jsonString({ quote, ...metadata }), isoNow());
    return { usage: db.prepare('SELECT * FROM economy_usage_events WHERE id=?').get(id), quote, idempotent: false };
  });
}

export function upsertCampaignEconomyRule(db, { campaignId, contractVersion, primarySuccessEvent, playerRule = {}, creatorRule = {}, attribution = {}, eligibility = {}, budget = {}, settlement = {}, lockedFields = [], approvedBy = null, approve = false, expiresAt = null }) {
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id=?').get(campaignId);
  if (!campaign) throw new HttpError(404, 'Campaign 不存在', 'not_found');
  if (!contractVersion || !primarySuccessEvent) throw new HttpError(400, 'Contract 版本和主要成功事件不能为空', 'campaign_contract_required');
  const missingLocks = REQUIRED_LOCKED_FIELDS.filter(path => !lockedFields.includes(path));
  if (missingLocks.length) throw new HttpError(400, `Campaign Contract 缺少锁定字段：${missingLocks.join('、')}`, 'locked_fields_incomplete');
  if (!Number.isInteger(Number(budget.totalAit)) || Number(budget.totalAit) <= 0) throw new HttpError(400, 'Campaign AIT 总预算无效', 'invalid_campaign_budget');
  if (Number(budget.totalAit) > Number(campaign.budget_ait || 0)) throw new HttpError(409, 'Campaign Contract 的 AIT 权益池不能超过 Campaign 已批准预算', 'campaign_budget_exceeded');
  if (approve && campaign.status !== 'active') throw new HttpError(409, 'Campaign Brief 尚未批准，不能批准 Campaign Contract', 'campaign_brief_not_approved');
  const now = isoNow();
  const id = uid('campaign_rule');
  db.prepare(`INSERT INTO campaign_economy_rules
    (id,campaign_id,contract_version,status,primary_success_event,player_rule_json,creator_rule_json,attribution_json,eligibility_json,budget_json,settlement_json,locked_fields_json,approved_by,approved_at,expires_at,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(campaign_id,contract_version) DO UPDATE SET status=excluded.status,primary_success_event=excluded.primary_success_event,
      player_rule_json=excluded.player_rule_json,creator_rule_json=excluded.creator_rule_json,attribution_json=excluded.attribution_json,
      eligibility_json=excluded.eligibility_json,budget_json=excluded.budget_json,settlement_json=excluded.settlement_json,
      locked_fields_json=excluded.locked_fields_json,approved_by=excluded.approved_by,approved_at=excluded.approved_at,
      expires_at=excluded.expires_at,updated_at=excluded.updated_at`)
    .run(id, campaignId, contractVersion, approve ? 'approved' : 'pending_review', primarySuccessEvent, jsonString(playerRule), jsonString(creatorRule), jsonString(attribution), jsonString(eligibility), jsonString(budget), jsonString(settlement), jsonString(lockedFields), approvedBy, approve ? now : null, expiresAt, now, now);
  return db.prepare('SELECT * FROM campaign_economy_rules WHERE campaign_id=? AND contract_version=?').get(campaignId, contractVersion);
}

export function resolveAttributionEvidence(db, { campaignId, reference }) {
  const ref = String(reference || '').trim();
  if (!ref) throw new HttpError(400, 'AIT 必须关联权威归因或交付证据', 'attribution_reference_required');
  const separator = ref.indexOf(':');
  const prefix = separator > 0 ? ref.slice(0, separator) : '';
  const evidenceId = separator > 0 ? ref.slice(separator + 1) : ref;
  if (prefix === 'partner') return { kind: 'partner_declared', verified: false };
  const deliverable = db.prepare('SELECT id,campaign_id FROM campaign_deliverables WHERE id=?').get(evidenceId);
  if (deliverable) {
    if (deliverable.campaign_id !== campaignId) throw new HttpError(409, '交付证据不属于该 Campaign', 'attribution_campaign_mismatch');
    return { kind: 'deliverable', verified: true };
  }
  const session = db.prepare('SELECT id FROM runtime_sessions WHERE id=?').get(evidenceId);
  if (session) return { kind: 'runtime_session', verified: true };
  const touch = db.prepare('SELECT id,campaign_id FROM attribution_touches WHERE id=?').get(evidenceId);
  if (touch) {
    if (touch.campaign_id && touch.campaign_id !== campaignId) throw new HttpError(409, '归因触点不属于该 Campaign', 'attribution_campaign_mismatch');
    return { kind: 'attribution_touch', verified: true };
  }
  throw new HttpError(409, '归因证据无法在服务端解析；请引用真实 deliverable/runtime/touch ID，或使用 partner: 声明外部证据', 'attribution_reference_unresolved');
}

export function createAitEntitlement(db, { userId, campaignId, contractVersion, sourceType, sourceEventType, sourceEventId, amount, attributionReference, riskDecision = 'clear', reasonCode = null }) {
  const allowedSources = new Set(['player_campaign', 'creator_delivery', 'creator_operation', 'creator_performance', 'campaign_allocation']);
  if (!allowedSources.has(sourceType)) throw new HttpError(400, 'AIT 来源类型无效', 'invalid_ait_source');
  const now = isoNow();
  const rule = db.prepare(`SELECT * FROM campaign_economy_rules WHERE campaign_id=? AND contract_version=? AND status='approved' AND (expires_at IS NULL OR expires_at>?)`).get(campaignId, contractVersion, now);
  if (!rule) throw new HttpError(409, 'Campaign Contract 经济规则尚未获批或已失效', 'campaign_rule_not_approved');
  if (!String(sourceEventType || '').trim()) throw new HttpError(400, 'AIT 必须声明来源事件类型', 'source_event_type_required');
  if (sourceType === 'player_campaign' && sourceEventType !== rule.primary_success_event) throw new HttpError(409, '玩家 AIT 只认可 Contract 锁定的主要成功事件', 'primary_success_event_mismatch');
  const evidence = resolveAttributionEvidence(db, { campaignId, reference: attributionReference });
  if (riskDecision !== 'clear') throw new HttpError(409, 'AIT 风控尚未通过', 'risk_not_clear');
  const numericAmount = Number(amount);
  if (!Number.isInteger(numericAmount) || numericAmount <= 0) throw new HttpError(400, 'AIT 数量无效', 'invalid_ait_amount');
  const existing = db.prepare(`SELECT * FROM ait_entitlements WHERE campaign_id=? AND contract_version=? AND source_type=? AND source_event_id=? AND user_id=?`)
    .get(campaignId, contractVersion, sourceType, sourceEventId, userId);
  if (existing) return { entitlement: existing, idempotent: true };
  const budget = safeJson(rule.budget_json);
  const committed = Number(db.prepare(`SELECT COALESCE(SUM(amount),0) total FROM ait_entitlements
    WHERE campaign_id=? AND contract_version=? AND status NOT IN ('reversed','expired')`).get(campaignId, contractVersion)?.total || 0);
  if (committed + numericAmount > Number(budget.totalAit || 0)) throw new HttpError(409, 'Campaign AIT 预算不足', 'budget_exceeded');
  const ruleForSource = sourceType === 'player_campaign' ? safeJson(rule.player_rule_json) : safeJson(rule.creator_rule_json);
  const allowedEventTypes = Array.isArray(ruleForSource.eventTypes) ? ruleForSource.eventTypes : [];
  if (sourceType !== 'player_campaign' && allowedEventTypes.length && !allowedEventTypes.includes(sourceEventType)) throw new HttpError(409, 'AIT 来源事件不在 Contract 允许范围内', 'source_event_not_allowed');
  const configuredAmount = Number(ruleForSource.amountAit || 0);
  if (configuredAmount > 0 && numericAmount !== configuredAmount) throw new HttpError(409, 'AIT 数量与 Contract 锁定规则不一致', 'ait_amount_mismatch');
  const cap = Number(ruleForSource.perUserCapAit || budget.perUserCapAit || 0);
  const userCommitted = Number(db.prepare(`SELECT COALESCE(SUM(amount),0) total FROM ait_entitlements
    WHERE user_id=? AND campaign_id=? AND contract_version=? AND status NOT IN ('reversed','expired')`).get(userId, campaignId, contractVersion)?.total || 0);
  if (cap > 0 && userCommitted + numericAmount > cap) throw new HttpError(409, '超过 Campaign 单用户 AIT 上限', 'user_cap_exceeded');
  const id = uid('ait_right');
  db.prepare(`INSERT INTO ait_entitlements
    (id,user_id,campaign_id,contract_version,source_type,source_event_type,source_event_id,amount,status,attribution_reference,risk_decision,reason_code,expires_at,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,'pending',?,?,?,?,?,?)`)
    .run(id, userId, campaignId, contractVersion, sourceType, sourceEventType, sourceEventId, numericAmount, attributionReference, riskDecision, reasonCode, rule.expires_at, now, now);
  db.prepare(`INSERT INTO ledger_batches
    (id,user_id,asset_type,source_type,original_amount,remaining_amount,status,campaign_id,contract_version,earned_at,expires_at,risk_decision,reason_code,idempotency_key,metadata_json)
    VALUES (?,?,'AIT',?,?,?,'pending',?,?,?,?,?,?,?,?)`)
    .run(`batch_${id}`, userId, sourceType, numericAmount, numericAmount, campaignId, contractVersion, now, rule.expires_at, riskDecision, reasonCode, `ait:${campaignId}:${contractVersion}:${sourceType}:${sourceEventId}:${userId}`, jsonString({ entitlementId: id, sourceEventType, attributionReference, evidenceKind: evidence.kind, evidenceVerified: evidence.verified }));
  return { entitlement: db.prepare('SELECT * FROM ait_entitlements WHERE id=?').get(id), idempotent: false };
}

export function reviewAitEntitlement(db, { entitlementId, decision, reviewerId, reasonCode = null }) {
  const entitlement = db.prepare('SELECT * FROM ait_entitlements WHERE id=?').get(entitlementId);
  if (!entitlement) throw new HttpError(404, 'AIT 权益记录不存在', 'not_found');
  if (!['pending', 'available', 'frozen'].includes(entitlement.status)) throw new HttpError(409, '当前 AIT 状态不能复核', 'invalid_state');
  if (!['approve', 'reject', 'freeze'].includes(decision)) throw new HttpError(400, 'AIT 复核决定无效', 'validation_error');
  const now = isoNow();
  const next = decision === 'approve' ? 'available' : decision === 'freeze' ? 'frozen' : 'reversed';
  db.prepare(`UPDATE ait_entitlements SET status=?,available_at=?,frozen_at=?,reversed_at=?,reason_code=?,updated_at=? WHERE id=?`)
    .run(next, next === 'available' ? now : entitlement.available_at, next === 'frozen' ? now : null, next === 'reversed' ? now : null, reasonCode, now, entitlementId);
  db.prepare(`UPDATE ledger_batches SET status=?,available_at=?,frozen_at=?,reversed_at=?,remaining_amount=?,reason_code=?
    WHERE asset_type='AIT' AND json_extract(metadata_json,'$.entitlementId')=?`)
    .run(next, next === 'available' ? now : null, next === 'frozen' ? now : null, next === 'reversed' ? now : null, next === 'reversed' ? 0 : entitlement.amount, reasonCode, entitlementId);
  return db.prepare('SELECT * FROM ait_entitlements WHERE id=?').get(entitlementId);
}

export function requestAitSettlement(db, { entitlementId, userId, settlementType, currency = null, grossAmount = null, payerSubject = null, payeeSubject = null }) {
  const entitlement = db.prepare('SELECT * FROM ait_entitlements WHERE id=? AND user_id=?').get(entitlementId, userId);
  if (!entitlement) throw new HttpError(404, 'AIT 权益记录不存在', 'not_found');
  const existingBenefit = db.prepare('SELECT * FROM benefit_claims WHERE entitlement_id=? AND user_id=?').get(entitlementId, userId);
  if (existingBenefit) return { type: 'benefit', record: existingBenefit, idempotent: true };
  const existingPayment = db.prepare('SELECT * FROM payment_settlements WHERE entitlement_id=? AND user_id=?').get(entitlementId, userId);
  if (existingPayment) return { type: 'payment', record: existingPayment, idempotent: true };
  if (entitlement.status !== 'available') throw new HttpError(409, '只有 available AIT 才能申领权益或进入结算', 'invalid_state');
  const rule = db.prepare(`SELECT * FROM campaign_economy_rules WHERE campaign_id=? AND contract_version=? AND status='approved'`).get(entitlement.campaign_id, entitlement.contract_version);
  if (!rule) throw new HttpError(409, 'Campaign Contract 已失效', 'campaign_rule_not_approved');
  const settlement = safeJson(rule.settlement_json);
  const now = isoNow();
  if (settlementType === 'benefit') {
    const benefitType = String(currency || 'contract_defined_non_financial').slice(0, 120);
    const allowed = Array.isArray(settlement.benefitTypes) ? settlement.benefitTypes : [];
    if (allowed.length && !allowed.includes(benefitType)) throw new HttpError(409, '该权益类型未写入 Campaign Contract', 'benefit_not_allowed');
    const id = uid('benefit_claim');
    db.prepare(`INSERT INTO benefit_claims (id,entitlement_id,user_id,benefit_type,status,created_at,updated_at)
      VALUES (?,?,?,?,'submitted',?,?)`).run(id, entitlementId, userId, benefitType, now, now);
    db.prepare(`UPDATE ait_entitlements SET status='settlement_pending',updated_at=? WHERE id=?`).run(now, entitlementId);
    return { type: 'benefit', record: db.prepare('SELECT * FROM benefit_claims WHERE id=?').get(id), idempotent: false };
  }
  if (settlementType !== 'payment') throw new HttpError(400, '结算类型无效', 'invalid_settlement_type');
  if (settlement.cashEnabled !== true) throw new HttpError(409, '该 Campaign 未批准现金或数字资产结算', 'payment_not_allowed');
  const allowedCurrencies = Array.isArray(settlement.currencies) ? settlement.currencies : [];
  if (!currency || !allowedCurrencies.includes(currency)) throw new HttpError(409, '结算币种未写入获批 Contract', 'currency_not_allowed');
  if (!grossAmount || !payerSubject || !payeeSubject) throw new HttpError(400, '独立付款记录字段不完整', 'payment_fields_required');
  const id = uid('payment');
  db.prepare(`INSERT INTO payment_settlements
    (id,entitlement_id,user_id,payer_subject,payee_subject,currency,gross_amount,fee_amount,status,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,'0','submitted',?,?)`)
    .run(id, entitlementId, userId, payerSubject, payeeSubject, currency, String(grossAmount), now, now);
  db.prepare(`UPDATE ait_entitlements SET status='settlement_pending',updated_at=? WHERE id=?`).run(now, entitlementId);
  return { type: 'payment', record: db.prepare('SELECT * FROM payment_settlements WHERE id=?').get(id), idempotent: false };
}

export function reviewBenefitClaim(db, { claimId, reviewerId, decision, fulfillmentReference = null, note = '' }) {
  const claim = db.prepare('SELECT * FROM benefit_claims WHERE id=?').get(claimId);
  if (!claim) throw new HttpError(404, '权益申领记录不存在', 'not_found');
  if (!['submitted', 'approved'].includes(claim.status)) throw new HttpError(409, '权益申领当前不能处理', 'invalid_state');
  if (!['approve', 'reject', 'fulfill'].includes(decision)) throw new HttpError(400, '权益处理决定无效', 'validation_error');
  if (decision === 'fulfill' && !String(fulfillmentReference || '').trim()) throw new HttpError(400, '履约完成必须提供凭证引用', 'fulfillment_evidence_required');
  const next = decision === 'approve' ? 'approved' : decision === 'fulfill' ? 'fulfilled' : 'rejected';
  const now = isoNow();
  return transaction(db, () => {
    db.prepare(`UPDATE benefit_claims SET status=?,fulfillment_reference=?,review_note=?,reviewed_by=?,updated_at=? WHERE id=?`)
      .run(next, fulfillmentReference, String(note).slice(0, 800), reviewerId, now, claimId);
    if (next === 'fulfilled') {
      db.prepare(`UPDATE ait_entitlements SET status='settled',settled_at=?,updated_at=? WHERE id=?`).run(now, now, claim.entitlement_id);
      db.prepare(`UPDATE ledger_batches SET status='spent',remaining_amount=0,spent_at=? WHERE asset_type='AIT' AND json_extract(metadata_json,'$.entitlementId')=?`).run(now, claim.entitlement_id);
    } else if (next === 'rejected') {
      db.prepare(`UPDATE ait_entitlements SET status='available',updated_at=? WHERE id=?`).run(now, claim.entitlement_id);
    }
    return db.prepare('SELECT * FROM benefit_claims WHERE id=?').get(claimId);
  });
}

export function reviewPaymentSettlement(db, { settlementId, reviewerId, decision, note = '' }) {
  const record = db.prepare('SELECT * FROM payment_settlements WHERE id=?').get(settlementId);
  if (!record) throw new HttpError(404, '付款结算记录不存在', 'not_found');
  if (record.status !== 'submitted') throw new HttpError(409, '付款结算当前不能复核', 'invalid_state');
  const next = decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : null;
  if (!next) throw new HttpError(400, '付款复核决定无效', 'validation_error');
  const now = isoNow();
  db.prepare(`UPDATE payment_settlements SET status=?,review_note=?,reviewed_by=?,updated_at=? WHERE id=?`).run(next, String(note).slice(0, 800), reviewerId, now, settlementId);
  if (next === 'rejected') db.prepare(`UPDATE ait_entitlements SET status='available',updated_at=? WHERE id=?`).run(now, record.entitlement_id);
  return db.prepare('SELECT * FROM payment_settlements WHERE id=?').get(settlementId);
}

export function completePaymentSettlement(db, { settlementId, reviewerId, paymentReference, receiptReference, feeAmount = '0', fxSource = null, fxRate = null, fxTime = null }) {
  const record = db.prepare('SELECT * FROM payment_settlements WHERE id=?').get(settlementId);
  if (!record) throw new HttpError(404, '付款结算记录不存在', 'not_found');
  if (record.status === 'paid') return { record, idempotent: true };
  if (!['approved', 'processing'].includes(record.status)) throw new HttpError(409, '付款结算尚未获批', 'invalid_state');
  if (!paymentReference || !receiptReference) throw new HttpError(400, '付款引用和回执引用不能为空', 'payment_evidence_required');
  const now = isoNow();
  return transaction(db, () => {
    db.prepare(`UPDATE payment_settlements SET status='paid',payment_reference=?,receipt_reference=?,fee_amount=?,fx_source=?,fx_rate=?,fx_time=?,reviewed_by=?,paid_at=?,updated_at=? WHERE id=?`)
      .run(paymentReference, receiptReference, String(feeAmount), fxSource, fxRate, fxTime, reviewerId, now, now, settlementId);
    db.prepare(`UPDATE ait_entitlements SET status='settled',settled_at=?,updated_at=? WHERE id=?`).run(now, now, record.entitlement_id);
    db.prepare(`UPDATE ledger_batches SET status='spent',remaining_amount=0,spent_at=? WHERE asset_type='AIT' AND json_extract(metadata_json,'$.entitlementId')=?`).run(now, record.entitlement_id);
    return { record: db.prepare('SELECT * FROM payment_settlements WHERE id=?').get(settlementId), idempotent: false };
  });
}

export function submitLedgerAppeal(db, { userId, subjectType, subjectId, reason }) {
  if (!['aip_batch', 'ait_entitlement', 'payment_settlement'].includes(subjectType)) throw new HttpError(400, '申诉对象无效', 'invalid_appeal_subject');
  if (String(reason || '').trim().length < 8) throw new HttpError(400, '请填写至少 8 个字符的申诉说明', 'appeal_reason_required');
  const id = uid('ledger_appeal');
  const now = isoNow();
  db.prepare(`INSERT INTO ledger_appeals (id,user_id,subject_type,subject_id,reason,status,created_at,updated_at)
    VALUES (?,?,?,?,?,'submitted',?,?)`).run(id, userId, subjectType, subjectId, String(reason).trim().slice(0, 1000), now, now);
  return db.prepare('SELECT * FROM ledger_appeals WHERE id=?').get(id);
}

export function expireAitEntitlements(db, userId, now = isoNow()) {
  const rows = db.prepare(`SELECT id FROM ait_entitlements WHERE user_id=? AND status IN ('estimated','pending','available','frozen') AND expires_at IS NOT NULL AND expires_at<=?`).all(userId, now);
  for (const row of rows) {
    db.prepare(`UPDATE ait_entitlements SET status='expired',updated_at=? WHERE id=?`).run(now, row.id);
    db.prepare(`UPDATE ledger_batches SET status='expired',remaining_amount=0 WHERE asset_type='AIT' AND json_extract(metadata_json,'$.entitlementId')=?`).run(row.id);
  }
  return rows.length;
}

export function reviewLedgerAppeal(db, { appealId, reviewerId, decision, resolutionNote = '' }) {
  const appeal = db.prepare(`SELECT * FROM ledger_appeals WHERE id=?`).get(appealId);
  if (!appeal) throw new HttpError(404, '申诉记录不存在', 'not_found');
  if (!['submitted', 'reviewing'].includes(appeal.status)) throw new HttpError(409, '申诉已经处理', 'invalid_state');
  const next = decision === 'approve' ? 'approved' : decision === 'reject' ? 'rejected' : decision === 'review' ? 'reviewing' : null;
  if (!next) throw new HttpError(400, '申诉处理决定无效', 'validation_error');
  const now = isoNow();
  db.prepare(`UPDATE ledger_appeals SET status=?,resolution_note=?,resolved_by=?,updated_at=? WHERE id=?`)
    .run(next, String(resolutionNote).slice(0, 1000), reviewerId, now, appealId);
  return db.prepare('SELECT * FROM ledger_appeals WHERE id=?').get(appealId);
}

export function economySnapshot(db, user) {
  ensureEconomyAccount(db, user);
  expireAipBatches(db, user.id);
  expireAitEntitlements(db, user.id);
  syncLegacyAipBalance(db, user.id);
  const now = isoNow();
  const profile = db.prepare('SELECT * FROM economy_profiles WHERE user_id=?').get(user.id);
  const roles = db.prepare(`SELECT role_key,status,granted_at,expires_at,reason_code FROM user_role_memberships WHERE user_id=? ORDER BY role_key`).all(user.id);
  const entitlements = db.prepare(`SELECT entitlement_key,status,source_type,starts_at,expires_at FROM user_entitlements WHERE user_id=? ORDER BY entitlement_key`).all(user.id);
  const aip = db.prepare(`SELECT
      COALESCE(SUM(CASE WHEN status='available' AND ${activeDateSql()} THEN remaining_amount ELSE 0 END),0) available,
      COALESCE(SUM(CASE WHEN status='frozen' THEN remaining_amount ELSE 0 END),0) frozen,
      COALESCE(SUM(CASE WHEN status='available' AND expires_at>? AND expires_at<=? THEN remaining_amount ELSE 0 END),0) expiring_30d
    FROM ledger_batches WHERE user_id=? AND asset_type='AIP'`).get(now, now, addDays(now, 30), user.id);
  const aitRows = db.prepare(`SELECT status,COALESCE(SUM(amount),0) amount FROM ait_entitlements WHERE user_id=? GROUP BY status`).all(user.id);
  const ait = Object.fromEntries(aitRows.map(row => [row.status, Number(row.amount)]));
  const subscription = db.prepare(`SELECT s.*,p.plan_key,p.name,p.audience,p.feature_json FROM subscriptions s JOIN subscription_plans p ON p.id=s.plan_id
    WHERE s.user_id=? AND s.status='active' AND s.ends_at>? ORDER BY s.starts_at DESC LIMIT 1`).get(user.id, now);
  const allowances = subscription ? db.prepare(`SELECT allowance_key,granted_units,used_units,expires_at FROM subscription_allowances WHERE subscription_id=? ORDER BY allowance_key`).all(subscription.id) : [];
  return {
    version: ECONOMY_VERSION,
    profile,
    roles,
    entitlements,
    aip: { available: Number(aip.available), frozen: Number(aip.frozen), expiring30d: Number(aip.expiring_30d) },
    ait: {
      estimated: ait.estimated || 0,
      pending: ait.pending || 0,
      available: ait.available || 0,
      frozen: ait.frozen || 0,
      settlementPending: ait.settlement_pending || 0,
      settled: ait.settled || 0,
    },
    subscription: subscription ? { id: subscription.id, planKey: subscription.plan_key, name: subscription.name, status: subscription.status, startsAt: subscription.starts_at, endsAt: subscription.ends_at, cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end), features: safeJson(subscription.feature_json), allowances: allowances.map(row => ({ key: row.allowance_key, granted: Number(row.granted_units), used: Number(row.used_units), remaining: Math.max(0, Number(row.granted_units) - Number(row.used_units)), expiresAt: row.expires_at })) } : null,
    creationCosts: CREATION_COSTS,
    boundaries: {
      subscriptionAddsAip: false,
      subscriptionAddsAit: false,
      creationConsumesAit: false,
      aipWithdrawable: false,
      aitTransferable: false,
      aitTradable: false,
      globalFixedExchangeRate: false,
    },
  };
}
