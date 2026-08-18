import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getAddress, verifyMessage } from 'ethers';
import { openDatabase, closeDatabase, transaction } from './db.mjs';
import { createAiService } from './ai.mjs';
import { createWorker } from './worker.mjs';
import { saveArtifact } from './artifact.mjs';
import {
  AIP_REWARD_RULES, ECONOMY_VERSION, activateSubscription, awardAipRule, completePaymentSettlement,
  consumeAip, consumeCreation, createAitEntitlement, economySnapshot, ensureEconomyAccount,
  grantAip, quoteCreation, requestAitSettlement, reviewAitEntitlement, reviewBenefitClaim,
  reviewCreatorApplication, reviewLedgerAppeal, reviewPaymentSettlement, seedEconomyPlans,
  submitCreatorApplication, submitLedgerAppeal, upsertCampaignEconomyRule,
} from './economy.mjs';
import {
  HttpError, asInt, audit, bearerToken, clampText, isoNow, jsonString, mapAgent, mapContent,
  mapTask, plusDays, plusMinutes, publicUser, randomToken, readJson, routeMatch, safeJson,
  sendJson, sha256, uid,
} from './utils.mjs';

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.mp4': 'video/mp4', '.ico': 'image/x-icon' };
const CONTENT_TYPES = new Set(['game', 'video', 'article']);
const AGENT_TYPES = new Set(['game', 'video', 'article', 'all']);
const PERMISSION_KEYS = ['draft', 'readAnalytics', 'useBrandAssets', 'publish'];
const ACTIVE_TASKS = ['queued', 'running', 'review_pending'];
const REWARD_RULES = { share: 0, save: 0 };
const WALLET_NETWORKS = new Map([
  [1, { key: 'eip155:1', label: 'Ethereum' }],
  [8453, { key: 'eip155:8453', label: 'Base' }],
]);
const BLOCKED_WALLET_ADDRESSES = new Set([
  '0x0000000000000000000000000000000000000000',
  '0x000000000000000000000000000000000000dead',
]);

function validateWalletAddressInput(rawAddress, rawChainId) {
  let address;
  try { address = getAddress(String(rawAddress || '').trim()); }
  catch { throw new HttpError(400, '钱包地址无效', 'invalid_wallet'); }
  const normalized = address.toLowerCase();
  if (BLOCKED_WALLET_ADDRESSES.has(normalized)) {
    throw new HttpError(400, '该地址不能用作收款钱包', 'blocked_wallet_address');
  }
  const chainId = asInt(rawChainId, 1, 99_999_999, 'Chain ID');
  const network = WALLET_NETWORKS.get(chainId);
  if (!network) throw new HttpError(400, '当前仅支持 Ethereum 与 Base 网络', 'unsupported_wallet_network');
  return { address, normalized, chainId, network };
}

function sanitizePermissions(input = {}) {
  return Object.fromEntries(PERMISSION_KEYS.map(key => [key, Boolean(input[key]) && key !== 'publish']));
}

function campaignBrief(body = {}, fallback = {}) {
  const contentTypes = Array.isArray(body.contentTypes) ? body.contentTypes.filter(type => CONTENT_TYPES.has(type)) : (fallback.contentTypes || ['game']);
  const regions = Array.isArray(body.regions) ? body.regions.map(value => String(value).trim()).filter(Boolean).slice(0, 12) : (fallback.regions || []);
  return {
    contentTypes,
    regions,
    audience: String(body.audience ?? fallback.audience ?? '').slice(0, 800),
    channel: String(body.channel ?? fallback.channel ?? '').slice(0, 120),
    conversionGoal: String(body.conversionGoal ?? fallback.conversionGoal ?? '').slice(0, 500),
    ctaLabel: String(body.ctaLabel ?? fallback.ctaLabel ?? '').slice(0, 60),
    ctaUrl: String(body.ctaUrl ?? fallback.ctaUrl ?? '').slice(0, 500),
    successMetric: String(body.successMetric ?? fallback.successMetric ?? '').slice(0, 500),
    brandAssets: Array.isArray(body.brandAssets) ? body.brandAssets.map(String).map(value => value.trim()).filter(Boolean).slice(0, 30) : (fallback.brandAssets || []),
    optimizableFields: Array.isArray(body.optimizableFields) ? body.optimizableFields.map(String).map(value => value.trim()).filter(Boolean).slice(0, 30) : (fallback.optimizableFields || []),
    allowedClaims: String(body.allowedClaims ?? fallback.allowedClaims ?? '').slice(0, 1000),
    prohibitedClaims: String(body.prohibitedClaims ?? fallback.prohibitedClaims ?? '').slice(0, 1000),
    lockedFields: Array.isArray(body.lockedFields) ? body.lockedFields.map(String).slice(0, 20) : (fallback.lockedFields || ['预算', '奖励规则', '地区', '品牌声明', '成功指标']),
    deliverableRequirements: clampText(body.deliverableRequirements ?? fallback.deliverableRequirements, 1500, '交付要求'),
  };
}

function validateCampaignBrief(brief) {
  if (!brief.contentTypes.length) throw new HttpError(400, '至少选择一种内容类型', 'validation_error');
  if (!brief.regions.length) throw new HttpError(400, '至少填写一个投放地区', 'validation_error');
  if (brief.ctaUrl) {
    let parsed;
    try { parsed = new URL(brief.ctaUrl); } catch { throw new HttpError(400, 'CTA 链接格式无效', 'validation_error'); }
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new HttpError(400, 'CTA 链接仅支持 HTTPS 或 HTTP', 'validation_error');
  }
}

function ipFor(req) {
  return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
}

function requestContext(req, secret) {
  return {
    ipHash: sha256(`${secret}:ip:${ipFor(req)}`),
    deviceHash: sha256(`${secret}:device:${String(req.headers['x-airvana-device'] || 'missing')}`),
  };
}

function createSession(db, userId, cookieSecure) {
  const token = randomToken(36);
  const expiresAt = plusDays(14);
  db.prepare('INSERT INTO sessions (token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)')
    .run(sha256(token), userId, expiresAt, isoNow());
  const secure = cookieSecure ? '; Secure' : '';
  return { token, expiresAt, cookie: `airvana_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=1209600${secure}` };
}

function notify(db, userId, category, title, body, subjectType = null, subjectId = null) {
  db.prepare(`INSERT INTO notifications (id,user_id,category,title,body,subject_type,subject_id,created_at) VALUES (?,?,?,?,?,?,?,?)`)
    .run(uid('notice'), userId, category, title, body, subjectType, subjectId, isoNow());
}

function ensureOrganization(db, user, verified = false) {
  if (user.role !== 'brand') return null;
  let org = db.prepare('SELECT * FROM organizations WHERE owner_user_id=? LIMIT 1').get(user.id);
  if (org) {
    if (verified && org.verification_status !== 'verified' && String(user.email || '').endsWith('@airvana.local')) {
      db.prepare(`UPDATE organizations SET verification_status='verified',verification_note='本地开发验收组织',updated_at=? WHERE id=?`).run(isoNow(), org.id);
      org = db.prepare('SELECT * FROM organizations WHERE id=?').get(org.id);
    }
    return org;
  }
  const now = isoNow();
  const id = uid('org');
  db.prepare(`INSERT INTO organizations (id,name,owner_user_id,org_type,verification_status,created_at,updated_at) VALUES (?,?,?,'brand',?,?,?)`)
    .run(id, `${user.display_name} Organization`, user.id, verified ? 'verified' : 'pending', now, now);
  db.prepare(`INSERT INTO organization_members (id,organization_id,user_id,role,created_at) VALUES (?,?,?,'owner',?)`).run(uid('member'), id, user.id, now);
  return db.prepare('SELECT * FROM organizations WHERE id=?').get(id);
}

function createRiskCase(db, { userId, subjectType, subjectId, riskType, score, evidence }) {
  const existing = db.prepare(`SELECT id FROM risk_cases WHERE subject_type=? AND subject_id=? AND risk_type=? AND status='open'`).get(subjectType, subjectId, riskType);
  if (existing) return existing.id;
  const id = uid('risk');
  const now = isoNow();
  db.prepare(`INSERT INTO risk_cases (id,user_id,subject_type,subject_id,risk_type,score,status,evidence_json,created_at,updated_at) VALUES (?,?,?,?,?,?,'open',?,?,?)`)
    .run(id, userId || null, subjectType, subjectId, riskType, score, jsonString(evidence), now, now);
  return id;
}

function getSessionUser(db, req) {
  const token = bearerToken(req);
  if (!token) return null;
  return db.prepare(`SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id
    WHERE s.token_hash=? AND s.expires_at > ?`).get(sha256(token), isoNow()) || null;
}

function requireUser(db, req, roles) {
  const user = getSessionUser(db, req);
  if (!user) throw new HttpError(401, '请先登录', 'unauthorized');
  ensureEconomyAccount(db, user);
  if (roles) {
    const allowed = roles.some(role => {
      if (role === 'creator') return user.role === 'creator' && Boolean(db.prepare(`SELECT id FROM user_role_memberships WHERE user_id=? AND role_key='kol' AND status='active' AND (expires_at IS NULL OR expires_at>?)`).get(user.id, isoNow()));
      return user.role === role;
    });
    if (!allowed) throw new HttpError(403, '当前身份没有权限', 'forbidden');
  }
  return user;
}

function publicEconomyUser(db, user) {
  const base = publicUser(user);
  const kol = db.prepare(`SELECT id FROM user_role_memberships WHERE user_id=? AND role_key='kol' AND status='active' AND (expires_at IS NULL OR expires_at>?)`).get(user.id, isoNow());
  return { ...base, role: user.role === 'creator' && !kol ? 'player' : user.role, legacyRole: user.role };
}

function ensureCreatorWorkspace(db, user) {
  if (user.role !== 'creator') return;
  const exists = db.prepare('SELECT id FROM agents WHERE owner_user_id=? LIMIT 1').get(user.id);
  if (exists) return;
  const now = isoNow();
  db.prepare(`INSERT INTO agents
    (id,owner_user_id,name,description,content_type,status,permissions_json,review_mode,system_prompt,created_at,updated_at)
    VALUES (?,?,?,?,?,'active',?,'human',?,?,?)`)
    .run(uid('agent'), user.id, 'Nova', '内容创作与互动设计 Agent', 'all', jsonString({ draft: true, readAnalytics: true, useBrandAssets: false, publish: false }), '优先生成清晰、可互动、品牌安全的内容。', now, now);
}

function createOrGetDemoUser(db, role, persona = 'primary') {
  const key = `demo:${role}:${String(persona).replace(/[^a-z0-9_-]/gi, '').slice(0, 30) || 'primary'}`;
  let user = db.prepare('SELECT * FROM users WHERE email=?').get(`${key}@airvana.local`);
  if (!user) {
    const now = isoNow();
    const names = { player: persona === 'secondary' ? 'Mina Player' : 'Kai Player', creator: persona === 'secondary' ? 'Mina Creator' : 'Kai Creator', brand: 'Orbit Brand', admin: 'Airvana Trust' };
    const storageRole = role === 'player' ? 'creator' : role;
    db.prepare(`INSERT INTO users (id,role,display_name,email,created_at,updated_at) VALUES (?,?,?,?,?,?)`)
      .run(uid('usr'), storageRole, names[role], `${key}@airvana.local`, now, now);
    user = db.prepare('SELECT * FROM users WHERE email=?').get(`${key}@airvana.local`);
    ensureCreatorWorkspace(db, user);
  }
  ensureCreatorWorkspace(db, user);
  ensureEconomyAccount(db, user, { forcePlayer: role === 'player' });
  if (role === 'brand') ensureOrganization(db, user, true);
  return user;
}

function pointSummary(db, userId) {
  const rows = db.prepare(`SELECT currency, COALESCE(SUM(amount),0) balance FROM point_events
    WHERE user_id=? AND status='posted' AND (expires_at IS NULL OR expires_at>?) GROUP BY currency`).all(userId, isoNow());
  return { AIP: 0, AIT: 0, ...Object.fromEntries(rows.map(row => [row.currency, Number(row.balance)])) };
}

function serializeWalletBinding(row) {
  return row && {
    id: row.id, address: row.address, chainId: Number(row.chain_id), status: row.status,
    primary: Boolean(row.is_primary), verifiedAt: row.verified_at, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function serializeCampaign(row, db = null) {
  if (!row) return row;
  const committed = db ? Number(db.prepare(`SELECT COALESCE(SUM(amount),0) n FROM settlements WHERE campaign_id=? AND status IN ('approved','payment_pending','platform_approved','issued')`).get(row.id)?.n || 0) : 0;
  const issued = db ? Number(db.prepare(`SELECT COALESCE(SUM(amount),0) n FROM settlements WHERE campaign_id=? AND status='issued'`).get(row.id)?.n || 0) : 0;
  return {
    id: row.id, brandUserId: row.brand_user_id, brandName: row.brand_name, title: row.title,
    objective: row.objective, status: row.status, brief: safeJson(row.brief_json), budgetAit: row.budget_ait,
    rewardAit: row.reward_ait, startsAt: row.starts_at, endsAt: row.ends_at, reviewNote: row.review_note,
    budgetSummary: { total: Number(row.budget_ait), committed, issued, remaining: Math.max(0, Number(row.budget_ait) - committed) },
    participantStatus: row.participant_status || null, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function serializeDeliverable(row) {
  return row && {
    id: row.id, campaignId: row.campaign_id, campaignTitle: row.campaign_title, creatorUserId: row.creator_user_id,
    creatorName: row.creator_name, contentId: row.content_id, contentTitle: row.content_title, status: row.status,
    contentType: row.content_type, contentVersion: row.current_version, moderationStatus: row.moderation_status,
    artifactStatus: row.artifact_status, artifactValidation: safeJson(row.validation_json),
    submissionNote: row.submission_note, reviewNote: row.review_note, submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at, updatedAt: row.updated_at,
  };
}

function serializeSettlement(row, db = null) {
  const approvals = db ? db.prepare(`SELECT a.*,u.display_name approver_name FROM settlement_approvals a JOIN users u ON u.id=a.approver_user_id WHERE a.settlement_id=? ORDER BY a.created_at,a.rowid`).all(row.id).map(item => ({
    id: item.id, approverName: item.approver_name, decision: item.decision, note: item.note, createdAt: item.created_at,
  })) : [];
  return row && {
    id: row.id, campaignId: row.campaign_id, campaignTitle: row.campaign_title, deliverableId: row.deliverable_id,
    userId: row.user_id, creatorName: row.creator_name, currency: row.currency, amount: row.amount,
    status: row.status, approvedAt: row.approved_at, issuedAt: row.issued_at, createdAt: row.created_at, updatedAt: row.updated_at, approvals,
  };
}

function loadBootstrap(db, user, ai) {
  if (user.role === 'brand') ensureOrganization(db, user, String(user.email || '').endsWith('@airvana.local'));
  const agents = db.prepare('SELECT * FROM agents WHERE owner_user_id=? ORDER BY created_at DESC').all(user.id).map(mapAgent);
  const agentMemories = user.role === 'creator' ? db.prepare(`SELECT m.* FROM agent_memory m JOIN agents a ON a.id=m.agent_id WHERE a.owner_user_id=? ORDER BY m.priority DESC,m.updated_at DESC`).all(user.id).map(row => ({ id: row.id, agentId: row.agent_id, memoryType: row.memory_type, content: row.content, source: row.source, priority: Number(row.priority || 2), createdAt: row.created_at, updatedAt: row.updated_at })) : [];
  const contents = db.prepare('SELECT * FROM contents WHERE owner_user_id=? ORDER BY updated_at DESC').all(user.id).map(mapContent);
  const tasks = db.prepare('SELECT * FROM agent_tasks WHERE owner_user_id=? ORDER BY created_at DESC LIMIT 50').all(user.id).map(mapTask);
  const taskSteps = db.prepare(`SELECT s.* FROM agent_task_steps s JOIN agent_tasks t ON t.id=s.task_id WHERE t.owner_user_id=? ORDER BY s.task_id,s.sequence`).all(user.id).map(row => ({
    id: row.id, taskId: row.task_id, sequence: row.sequence, stepType: row.step_type, status: row.status,
    input: safeJson(row.input_json), output: safeJson(row.output_json), startedAt: row.started_at, finishedAt: row.finished_at,
  }));
  const artifacts = db.prepare(`SELECT a.id,a.content_id,a.version,a.artifact_type,a.status,a.manifest_json,a.validation_json,a.created_at
    FROM content_artifacts a JOIN contents c ON c.id=a.content_id WHERE c.owner_user_id=? ORDER BY a.created_at DESC`).all(user.id).map(row => ({
    id: row.id, contentId: row.content_id, version: row.version, artifactType: row.artifact_type, status: row.status,
    manifest: safeJson(row.manifest_json), validation: safeJson(row.validation_json), createdAt: row.created_at,
  }));
  const ledger = db.prepare('SELECT * FROM point_events WHERE user_id=? ORDER BY created_at DESC LIMIT 80').all(user.id).map(row => ({
    id: row.id, currency: row.currency, amount: row.amount, status: row.status, eventType: row.event_type,
    subjectType: row.subject_type, subjectId: row.subject_id, metadata: safeJson(row.metadata_json), createdAt: row.created_at,
  }));
  const walletBindings = db.prepare(`SELECT * FROM wallet_bindings WHERE user_id=? ORDER BY is_primary DESC,verified_at DESC`).all(user.id).map(serializeWalletBinding);
  const campaignSql = user.role === 'brand'
    ? `SELECT c.*, u.display_name brand_name FROM campaigns c JOIN users u ON u.id=c.brand_user_id WHERE c.brand_user_id=? ORDER BY c.updated_at DESC`
    : user.role === 'admin'
      ? `SELECT c.*, u.display_name brand_name FROM campaigns c JOIN users u ON u.id=c.brand_user_id ORDER BY c.updated_at DESC`
      : `SELECT c.*, u.display_name brand_name, cp.status participant_status FROM campaigns c JOIN users u ON u.id=c.brand_user_id LEFT JOIN campaign_participants cp ON cp.campaign_id=c.id AND cp.creator_user_id=? WHERE c.status IN ('active','completed') OR cp.creator_user_id=? ORDER BY c.updated_at DESC`;
  const campaigns = (user.role === 'creator' ? db.prepare(campaignSql).all(user.id, user.id) : user.role === 'brand' ? db.prepare(campaignSql).all(user.id) : db.prepare(campaignSql).all()).map(row => serializeCampaign(row, db));
  const deliverableSql = user.role === 'creator'
    ? `SELECT d.*, c.title campaign_title, u.display_name creator_name, x.title content_title,x.content_type,x.current_version,x.moderation_status,a.status artifact_status,a.validation_json FROM campaign_deliverables d JOIN campaigns c ON c.id=d.campaign_id JOIN users u ON u.id=d.creator_user_id JOIN contents x ON x.id=d.content_id LEFT JOIN content_artifacts a ON a.content_id=x.id AND a.version=x.current_version WHERE d.creator_user_id=? ORDER BY d.updated_at DESC`
    : user.role === 'brand'
      ? `SELECT d.*, c.title campaign_title, u.display_name creator_name, x.title content_title,x.content_type,x.current_version,x.moderation_status,a.status artifact_status,a.validation_json FROM campaign_deliverables d JOIN campaigns c ON c.id=d.campaign_id JOIN users u ON u.id=d.creator_user_id JOIN contents x ON x.id=d.content_id LEFT JOIN content_artifacts a ON a.content_id=x.id AND a.version=x.current_version WHERE c.brand_user_id=? ORDER BY d.updated_at DESC`
      : `SELECT d.*, c.title campaign_title, u.display_name creator_name, x.title content_title,x.content_type,x.current_version,x.moderation_status,a.status artifact_status,a.validation_json FROM campaign_deliverables d JOIN campaigns c ON c.id=d.campaign_id JOIN users u ON u.id=d.creator_user_id JOIN contents x ON x.id=d.content_id LEFT JOIN content_artifacts a ON a.content_id=x.id AND a.version=x.current_version ORDER BY d.updated_at DESC`;
  const deliverables = (user.role === 'admin' ? db.prepare(deliverableSql).all() : db.prepare(deliverableSql).all(user.id)).map(serializeDeliverable);
  const settlementSql = user.role === 'creator'
    ? `SELECT s.*, c.title campaign_title, u.display_name creator_name FROM settlements s JOIN campaigns c ON c.id=s.campaign_id JOIN users u ON u.id=s.user_id WHERE s.user_id=? ORDER BY s.updated_at DESC`
    : user.role === 'brand'
      ? `SELECT s.*, c.title campaign_title, u.display_name creator_name FROM settlements s JOIN campaigns c ON c.id=s.campaign_id JOIN users u ON u.id=s.user_id WHERE c.brand_user_id=? ORDER BY s.updated_at DESC`
      : `SELECT s.*, c.title campaign_title, u.display_name creator_name FROM settlements s JOIN campaigns c ON c.id=s.campaign_id JOIN users u ON u.id=s.user_id ORDER BY s.updated_at DESC`;
  const settlements = (user.role === 'admin' ? db.prepare(settlementSql).all() : db.prepare(settlementSql).all(user.id)).map(row => serializeSettlement(row, db));
  const feed = user.role === 'creator' ? db.prepare(`SELECT c.*,u.display_name author_name,MAX(b.expires_at) boost_expires_at FROM contents c JOIN users u ON u.id=c.owner_user_id
    LEFT JOIN content_boosts b ON b.content_id=c.id AND b.status='active' AND b.expires_at>?
    WHERE c.status='published' AND c.owner_user_id<>? GROUP BY c.id ORDER BY boost_expires_at IS NOT NULL DESC,c.published_at DESC LIMIT 30`).all(isoNow(), user.id).map(row => ({ ...mapContent(row), authorName: row.author_name, boostedUntil: row.boost_expires_at })) : [];
  const stats = {
    publishedContents: Number(db.prepare(`SELECT COUNT(*) n FROM contents WHERE owner_user_id=? AND status='published'`).get(user.id)?.n || 0),
    activeTasks: Number(db.prepare(`SELECT COUNT(*) n FROM agent_tasks WHERE owner_user_id=? AND status IN ('queued','running','review_pending')`).get(user.id)?.n || 0),
    pendingDeliverables: deliverables.filter(item => item.status === 'submitted').length,
  };
  const notifications = db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 80').all(user.id).map(row => ({
    id: row.id, category: row.category, title: row.title, body: row.body, subjectType: row.subject_type, subjectId: row.subject_id, readAt: row.read_at, createdAt: row.created_at,
  }));
  const activeBoosts = user.role === 'creator' ? db.prepare(`SELECT id,content_id,cost_aip,starts_at,expires_at FROM content_boosts WHERE user_id=? AND status='active' AND expires_at>? ORDER BY expires_at DESC`).all(user.id, isoNow()).map(row => ({ id: row.id, contentId: row.content_id, costAip: row.cost_aip, startsAt: row.starts_at, expiresAt: row.expires_at })) : [];
  const sessions = db.prepare('SELECT token_hash,expires_at,created_at FROM sessions WHERE user_id=? AND expires_at>? ORDER BY created_at DESC').all(user.id, isoNow()).map(row => ({ id: row.token_hash.slice(0, 16), expiresAt: row.expires_at, createdAt: row.created_at }));
  const termsAcceptances = db.prepare('SELECT document_type,document_version,accepted_at FROM terms_acceptances WHERE user_id=? ORDER BY accepted_at DESC').all(user.id).map(row => ({ documentType: row.document_type, documentVersion: row.document_version, acceptedAt: row.accepted_at }));
  const deletion = db.prepare(`SELECT id,status,reason,requested_at,scheduled_for,cancelled_at FROM account_deletion_requests WHERE user_id=? ORDER BY requested_at DESC LIMIT 1`).get(user.id);
  const deletionRequest = deletion && { id: deletion.id, status: deletion.status, reason: deletion.reason, requestedAt: deletion.requested_at, scheduledFor: deletion.scheduled_for, cancelledAt: deletion.cancelled_at };
  const organization = user.role === 'brand' ? db.prepare('SELECT * FROM organizations WHERE owner_user_id=? LIMIT 1').get(user.id) : null;
  const organizations = user.role === 'admin' ? db.prepare(`SELECT o.*,u.display_name owner_name FROM organizations o JOIN users u ON u.id=o.owner_user_id ORDER BY o.updated_at DESC`).all().map(row => ({ id: row.id, name: row.name, ownerUserId: row.owner_user_id, ownerName: row.owner_name, verificationStatus: row.verification_status, verificationNote: row.verification_note, createdAt: row.created_at })) : [];
  const participantSql = user.role === 'brand'
    ? `SELECT p.*,c.title campaign_title,u.display_name creator_name FROM campaign_participants p JOIN campaigns c ON c.id=p.campaign_id JOIN users u ON u.id=p.creator_user_id WHERE c.brand_user_id=? ORDER BY p.updated_at DESC`
    : user.role === 'creator'
      ? `SELECT p.*,c.title campaign_title,u.display_name creator_name FROM campaign_participants p JOIN campaigns c ON c.id=p.campaign_id JOIN users u ON u.id=p.creator_user_id WHERE p.creator_user_id=? ORDER BY p.updated_at DESC`
      : `SELECT p.*,c.title campaign_title,u.display_name creator_name FROM campaign_participants p JOIN campaigns c ON c.id=p.campaign_id JOIN users u ON u.id=p.creator_user_id ORDER BY p.updated_at DESC`;
  const participantRows = user.role === 'admin' ? db.prepare(participantSql).all() : db.prepare(participantSql).all(user.id);
  const participants = participantRows.map(row => ({ id: row.id, campaignId: row.campaign_id, campaignTitle: row.campaign_title, creatorUserId: row.creator_user_id, creatorName: row.creator_name, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at }));
  const attributionSql = user.role === 'brand'
    ? `SELECT t.campaign_id,t.event_type,COUNT(*) count FROM attribution_touches t JOIN campaigns c ON c.id=t.campaign_id WHERE c.brand_user_id=? GROUP BY t.campaign_id,t.event_type`
    : user.role === 'creator'
      ? `SELECT campaign_id,event_type,COUNT(*) count FROM attribution_touches WHERE creator_user_id=? GROUP BY campaign_id,event_type`
      : `SELECT campaign_id,event_type,COUNT(*) count FROM attribution_touches GROUP BY campaign_id,event_type`;
  const attributionRows = user.role === 'admin' ? db.prepare(attributionSql).all() : db.prepare(attributionSql).all(user.id);
  const attribution = Object.values(attributionRows.reduce((acc, row) => {
    acc[row.campaign_id] ||= { campaignId: row.campaign_id, impression: 0, playable_start: 0, playable_complete: 0 };
    acc[row.campaign_id][row.event_type] = Number(row.count);
    return acc;
  }, {}));
  const riskCases = user.role === 'admin' ? db.prepare('SELECT * FROM risk_cases ORDER BY status,score DESC,created_at DESC LIMIT 100').all().map(row => ({
    id: row.id, userId: row.user_id, subjectType: row.subject_type, subjectId: row.subject_id, riskType: row.risk_type,
    score: row.score, status: row.status, evidence: safeJson(row.evidence_json), resolutionNote: row.resolution_note, createdAt: row.created_at, updatedAt: row.updated_at,
  })) : [];
  const reports = user.role === 'admin' ? db.prepare(`SELECT r.*,c.title content_title,u.display_name reporter_name FROM content_reports r JOIN contents c ON c.id=r.content_id JOIN users u ON u.id=r.reporter_user_id ORDER BY r.status,r.created_at DESC`).all().map(row => ({
    id: row.id, contentId: row.content_id, contentTitle: row.content_title, reporterName: row.reporter_name, reason: row.reason, details: row.details,
    status: row.status, resolutionAction: row.resolution_action, resolutionNote: row.resolution_note, createdAt: row.created_at, updatedAt: row.updated_at,
  })) : [];
  const appealSql = user.role === 'admin'
    ? `SELECT a.*,c.title content_title,u.display_name appellant_name FROM content_appeals a JOIN contents c ON c.id=a.content_id JOIN users u ON u.id=a.appellant_user_id ORDER BY CASE a.status WHEN 'open' THEN 0 ELSE 1 END,a.created_at DESC`
    : `SELECT a.*,c.title content_title,u.display_name appellant_name FROM content_appeals a JOIN contents c ON c.id=a.content_id JOIN users u ON u.id=a.appellant_user_id WHERE a.appellant_user_id=? ORDER BY a.created_at DESC`;
  const contentAppeals = (user.role === 'admin' ? db.prepare(appealSql).all() : user.role === 'creator' ? db.prepare(appealSql).all(user.id) : []).map(row => ({
    id: row.id, contentId: row.content_id, contentTitle: row.content_title, appellantUserId: row.appellant_user_id, appellantName: row.appellant_name,
    reason: row.reason, status: row.status, resolutionNote: row.resolution_note, createdAt: row.created_at, updatedAt: row.updated_at,
  }));
  const appealableContentIds = user.role === 'creator' ? db.prepare(`SELECT DISTINCT r.content_id FROM content_reports r JOIN contents c ON c.id=r.content_id WHERE c.owner_user_id=? AND c.status='archived' AND r.status='resolved' AND r.resolution_action='takedown'`).all(user.id).map(row => row.content_id) : [];
  const auditLogs = user.role === 'admin' ? db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100').all().map(row => ({
    id: row.id, actorUserId: row.actor_user_id, action: row.action, subjectType: row.subject_type, subjectId: row.subject_id, before: safeJson(row.before_json), after: safeJson(row.after_json), createdAt: row.created_at,
  })) : [];
  const managedPointEvents = user.role === 'admin' ? db.prepare(`SELECT p.*,u.display_name user_name FROM point_events p JOIN users u ON u.id=p.user_id ORDER BY p.created_at DESC LIMIT 100`).all().map(row => ({ id: row.id, userId: row.user_id, userName: row.user_name, currency: row.currency, amount: row.amount, status: row.status, eventType: row.event_type, subjectType: row.subject_type, subjectId: row.subject_id, metadata: safeJson(row.metadata_json), createdAt: row.created_at })) : [];
  const runtimeEnabled = safeJson(db.prepare(`SELECT value_json FROM app_settings WHERE setting_key='agent_runtime_enabled'`).get()?.value_json, true);
  const economy = economySnapshot(db, user);
  const aitEntitlements = db.prepare(`SELECT * FROM ait_entitlements WHERE user_id=? ORDER BY created_at DESC LIMIT 100`).all(user.id).map(row => ({ id: row.id, campaignId: row.campaign_id, contractVersion: row.contract_version, sourceType: row.source_type, sourceEventType: row.source_event_type, sourceEventId: row.source_event_id, amount: Number(row.amount), status: row.status, attributionReference: row.attribution_reference, riskDecision: row.risk_decision, reasonCode: row.reason_code, availableAt: row.available_at, expiresAt: row.expires_at, createdAt: row.created_at, updatedAt: row.updated_at }));
  const benefitClaims = db.prepare(`SELECT * FROM benefit_claims WHERE user_id=? ORDER BY created_at DESC LIMIT 100`).all(user.id).map(row => ({ id: row.id, entitlementId: row.entitlement_id, benefitType: row.benefit_type, status: row.status, fulfillmentReference: row.fulfillment_reference, reviewNote: row.review_note, createdAt: row.created_at, updatedAt: row.updated_at }));
  const paymentSettlements = db.prepare(`SELECT * FROM payment_settlements WHERE user_id=? ORDER BY created_at DESC LIMIT 100`).all(user.id).map(row => ({ id: row.id, entitlementId: row.entitlement_id, currency: row.currency, grossAmount: row.gross_amount, feeAmount: row.fee_amount, status: row.status, paymentReference: row.payment_reference, receiptReference: row.receipt_reference, paidAt: row.paid_at, createdAt: row.created_at, updatedAt: row.updated_at }));
  const ledgerAppeals = db.prepare(`SELECT * FROM ledger_appeals WHERE user_id=? ORDER BY created_at DESC LIMIT 100`).all(user.id).map(row => ({ id: row.id, subjectType: row.subject_type, subjectId: row.subject_id, reason: row.reason, status: row.status, resolutionNote: row.resolution_note, createdAt: row.created_at, updatedAt: row.updated_at }));
  const creatorApplications = user.role === 'admin'
    ? db.prepare(`SELECT a.*,u.display_name user_name FROM creator_applications a JOIN users u ON u.id=a.user_id ORDER BY a.created_at DESC LIMIT 100`).all()
    : db.prepare(`SELECT * FROM creator_applications WHERE user_id=? ORDER BY created_at DESC LIMIT 20`).all(user.id);
  return { me: publicEconomyUser(db, user), ai: ai.info, points: { AIP: economy.aip.available, AIT: economy.ait.available }, economy, creatorApplications, aitEntitlements, benefitClaims, paymentSettlements, ledgerAppeals, aitWithdrawal: { retired: true, available: 0, reason: 'AIT 是 Campaign 权益与收益凭证，不支持通用提现' }, walletBindings, aitWithdrawals: [], stats, organization: organization && { id: organization.id, name: organization.name, verificationStatus: organization.verification_status, verificationNote: organization.verification_note }, organizations, participants, attribution, runtimeEnabled, agents, agentMemories, contents, artifacts, activeBoosts, feed, tasks, taskSteps, ledger, managedPointEvents, campaigns, deliverables, settlements, notifications, sessions, termsAcceptances, deletionRequest, riskCases, reports, contentAppeals, appealableContentIds, auditLogs };
}

function requireOwnedAgent(db, id, user) {
  const row = db.prepare('SELECT * FROM agents WHERE id=?').get(id);
  if (!row) throw new HttpError(404, 'Agent 不存在', 'not_found');
  if (row.owner_user_id !== user.id) throw new HttpError(403, '不能操作其他用户的 Agent', 'forbidden');
  return row;
}

function requireOwnedContent(db, id, user) {
  const row = db.prepare('SELECT * FROM contents WHERE id=?').get(id);
  if (!row) throw new HttpError(404, '内容不存在', 'not_found');
  if (row.owner_user_id !== user.id) throw new HttpError(403, '不能操作其他用户的内容', 'forbidden');
  return row;
}

function validateAgentForTask(agent, contentType) {
  const permissions = safeJson(agent.permissions_json);
  if (agent.status !== 'active') throw new HttpError(409, 'Agent 已暂停，不能创建任务', 'agent_paused');
  if (!permissions.draft) throw new HttpError(403, '该 Agent 没有草稿生成权限', 'agent_permission_denied');
  if (agent.content_type !== 'all' && agent.content_type !== contentType) throw new HttpError(403, '该 Agent 不支持当前内容类型', 'agent_type_mismatch');
}

function serveStatic(publicDir, pathname, res) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const decoded = decodeURIComponent(requested);
  const file = path.resolve(publicDir, `.${decoded}`);
  if (!file.startsWith(path.resolve(publicDir) + path.sep) && file !== path.join(path.resolve(publicDir), 'index.html')) return false;
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return false;
  const ext = path.extname(file);
  const data = fs.readFileSync(file);
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Content-Length': data.length,
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=300',
  });
  res.end(data);
  return true;
}

export function createApp(options = {}) {
  const root = options.root || path.resolve(import.meta.dirname, '..');
  const publicDir = path.join(root, 'public');
  const env = { ...process.env, ...(options.env || {}) };
  const db = options.db || openDatabase(options.dbFile || env.DATABASE_PATH || path.join(root, 'data', 'airvana.db'));
  seedEconomyPlans(db);
  const ai = options.ai || createAiService(env);
  for (const content of db.prepare(`SELECT c.* FROM contents c LEFT JOIN content_artifacts a ON a.content_id=c.id AND a.version=c.current_version WHERE c.current_version>0 AND a.id IS NULL`).all()) {
    try { saveArtifact(db, { content, payload: safeJson(content.payload_json), version: content.current_version }); } catch (error) { console.error('Artifact backfill failed', content.id, error); }
  }
  const worker = createWorker({ db, ai, pollMs: Number(env.WORKER_POLL_MS || 350) });
  const secret = env.APP_SECRET || 'airvana-development-secret-change-me';
  if (env.NODE_ENV === 'production' && secret === 'airvana-development-secret-change-me') throw new Error('APP_SECRET must be configured in production');
  const allowDemo = options.allowDemo ?? (env.NODE_ENV !== 'production' && env.ALLOW_DEMO_AUTH !== 'false');
  const cookieSecure = env.COOKIE_SECURE === 'true';
  const runtimeMinDurationMs = Number(env.RUNTIME_MIN_DURATION_MS || 2_000);
  const rateBuckets = new Map();
  let lastCleanup = 0;
  if (!options.disableWorker) worker.start();

  async function handler(req, res) {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;
    const ctx = requestContext(req, secret);
    try {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Referrer-Policy', 'same-origin');
      // Sensor Playables may request the microphone from this same-origin shell
      // after a deliberate user action. Camera and location stay unavailable.
      res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');
      res.setHeader('X-Frame-Options', 'DENY');
      const mobileShell = pathname === '/' || pathname === '/index.html';
      res.setHeader('Content-Security-Policy', mobileShell
        ? "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
        : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
      if (Date.now() - lastCleanup > 3_600_000) {
        db.prepare('DELETE FROM auth_challenges WHERE expires_at<?').run(isoNow());
        db.prepare('DELETE FROM wallet_binding_challenges WHERE expires_at<?').run(isoNow());
        db.prepare('DELETE FROM sessions WHERE expires_at<?').run(isoNow());
        lastCleanup = Date.now();
      }
      const bucketKey = `${ctx.ipHash}:${pathname.startsWith('/api/auth/') ? 'auth' : 'api'}`;
      const windowMs = 60_000;
      const limit = pathname.startsWith('/api/auth/') ? Number(env.AUTH_RATE_LIMIT || 30) : Number(env.API_RATE_LIMIT || 180);
      const currentBucket = rateBuckets.get(bucketKey);
      if (!currentBucket || currentBucket.resetAt < Date.now()) rateBuckets.set(bucketKey, { count: 1, resetAt: Date.now() + windowMs });
      else if (++currentBucket.count > limit) throw new HttpError(429, '请求过于频繁，请稍后重试', 'rate_limited');
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin) {
        const expectedOrigin = `${req.socket.encrypted ? 'https' : 'http'}://${req.headers.host}`;
        if (req.headers.origin !== expectedOrigin) throw new HttpError(403, '请求来源验证失败', 'origin_mismatch');
      }
      if (pathname === '/api/health' && req.method === 'GET') {
        return sendJson(res, 200, { ok: true, service: 'airvana-v5.3-economy-v1', economyVersion: 'airvana-economy-v1.0', ai: ai.info, deferred: ['external-kyc-provider', 'authoritative-attribution-provider', 'payment-provider', 'production-infrastructure', 'legal-approval'], time: isoNow() });
      }

      if (pathname === '/api/auth/wallet/challenge' && req.method === 'POST') {
        const body = await readJson(req);
        let address;
        try { address = getAddress(String(body.address || '')); }
        catch { throw new HttpError(400, '钱包地址无效', 'invalid_wallet'); }
        const chainId = asInt(body.chainId, 1, 99_999_999, 'Chain ID');
        const role = ['creator', 'brand'].includes(body.role) ? body.role : 'creator';
        const nonce = randomToken(12);
        const issuedAt = isoNow();
        const expiresAt = plusMinutes(10);
        const origin = `${req.socket.encrypted ? 'https' : 'http'}://${req.headers.host}`;
        const domain = String(req.headers.host || 'localhost');
        const message = `${domain} wants you to sign in with your Ethereum account:\n${address}\n\nSign in to Airvana as ${role}. This request does not trigger a blockchain transaction or token transfer.\n\nURI: ${origin}\nVersion: 1\nChain ID: ${chainId}\nNonce: ${nonce}\nIssued At: ${issuedAt}\nExpiration Time: ${expiresAt}`;
        db.prepare(`INSERT INTO auth_challenges (id,address,chain_id,requested_role,message,nonce,expires_at,created_at) VALUES (?,?,?,?,?,?,?,?)`)
          .run(uid('challenge'), address.toLowerCase(), chainId, role, message, nonce, expiresAt, issuedAt);
        return sendJson(res, 200, { address, chainId, role, message, expiresAt });
      }

      if (pathname === '/api/auth/wallet/verify' && req.method === 'POST') {
        const body = await readJson(req);
        let address;
        try { address = getAddress(String(body.address || '')); }
        catch { throw new HttpError(400, '钱包地址无效', 'invalid_wallet'); }
        const challenge = db.prepare(`SELECT * FROM auth_challenges WHERE address=? AND used_at IS NULL AND expires_at>? ORDER BY created_at DESC LIMIT 1`)
          .get(address.toLowerCase(), isoNow());
        if (!challenge || challenge.message !== body.message) throw new HttpError(401, '登录挑战已失效或不匹配', 'challenge_invalid');
        let recovered;
        try { recovered = getAddress(verifyMessage(challenge.message, String(body.signature || ''))); }
        catch { throw new HttpError(401, '钱包签名无效', 'signature_invalid'); }
        if (recovered.toLowerCase() !== address.toLowerCase()) throw new HttpError(401, '签名地址与登录地址不一致', 'signature_mismatch');
        const now = isoNow();
        let user = db.prepare('SELECT * FROM users WHERE wallet_address=?').get(address.toLowerCase());
        if (!user) user = db.prepare(`SELECT u.* FROM wallet_bindings w JOIN users u ON u.id=w.user_id
          WHERE w.address=? AND w.status='verified' LIMIT 1`).get(address.toLowerCase());
        transaction(db, () => {
          db.prepare('UPDATE auth_challenges SET used_at=? WHERE id=? AND used_at IS NULL').run(now, challenge.id);
          if (!user) {
            const userId = uid('usr');
            db.prepare(`INSERT INTO users (id,role,display_name,wallet_address,wallet_chain_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?)`)
              .run(userId, challenge.requested_role, `${challenge.requested_role === 'brand' ? 'Brand' : 'Creator'} ${address.slice(0, 6)}`, address.toLowerCase(), challenge.chain_id, now, now);
            user = db.prepare('SELECT * FROM users WHERE id=?').get(userId);
            ensureCreatorWorkspace(db, user);
            if (user.role === 'brand') ensureOrganization(db, user, false);
          } else {
            db.prepare('UPDATE users SET wallet_chain_id=?,updated_at=? WHERE id=?').run(challenge.chain_id, now, user.id);
          }
          ensureEconomyAccount(db, user);
          db.prepare('UPDATE wallet_bindings SET is_primary=0,updated_at=? WHERE user_id=?').run(now, user.id);
          const binding = db.prepare('SELECT * FROM wallet_bindings WHERE address=?').get(address.toLowerCase());
          if (!binding) {
            db.prepare(`INSERT INTO wallet_bindings (id,user_id,address,chain_id,status,is_primary,verified_at,created_at,updated_at)
              VALUES (?,?,?,?, 'verified',1,?,?,?)`).run(uid('wallet'), user.id, address.toLowerCase(), challenge.chain_id, now, now, now);
          } else {
            db.prepare(`UPDATE wallet_bindings SET chain_id=?,status='verified',is_primary=1,verified_at=?,updated_at=? WHERE id=? AND user_id=?`)
              .run(challenge.chain_id, now, now, binding.id, user.id);
          }
          audit(db, { actorUserId: user.id, action: 'auth.wallet_login', subjectType: 'user', subjectId: user.id, after: { address, chainId: challenge.chain_id }, ipHash: ctx.ipHash });
        });
        const session = createSession(db, user.id, cookieSecure);
        return sendJson(res, 200, { me: publicEconomyUser(db, user), expiresAt: session.expiresAt }, { 'Set-Cookie': session.cookie });
      }

      if (pathname === '/api/auth/demo' && req.method === 'POST') {
        if (!allowDemo) throw new HttpError(404, '开发登录未启用', 'not_found');
        const body = await readJson(req);
        const role = ['player', 'creator', 'brand', 'admin'].includes(body.role) ? body.role : 'creator';
        const user = createOrGetDemoUser(db, role, body.persona);
        const session = createSession(db, user.id, cookieSecure);
        audit(db, { actorUserId: user.id, action: 'auth.demo_login', subjectType: 'user', subjectId: user.id, ipHash: ctx.ipHash });
        return sendJson(res, 200, { me: publicEconomyUser(db, user), demo: true, expiresAt: session.expiresAt }, { 'Set-Cookie': session.cookie });
      }

      if (pathname === '/api/auth/logout' && req.method === 'POST') {
        const token = bearerToken(req);
        if (token) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(sha256(token));
        return sendJson(res, 200, { ok: true }, { 'Set-Cookie': 'airvana_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
      }

      if (pathname === '/api/bootstrap' && req.method === 'GET') {
        const user = requireUser(db, req);
        return sendJson(res, 200, loadBootstrap(db, user, ai));
      }

      if (pathname === '/api/economy' && req.method === 'GET') {
        const user = requireUser(db, req);
        return sendJson(res, 200, { economy: economySnapshot(db, user) });
      }

      if (pathname === '/api/economy/plans' && req.method === 'GET') {
        requireUser(db, req);
        const plans = db.prepare(`SELECT plan_key,name,audience,allowance_json,feature_json,price_status FROM subscription_plans WHERE status='active' ORDER BY rowid`).all()
          .map(row => ({ planKey: row.plan_key, name: row.name, audience: row.audience, allowances: safeJson(row.allowance_json), features: safeJson(row.feature_json), priceStatus: row.price_status }));
        return sendJson(res, 200, { plans, disclosure: '订阅只增加功能与周期额度，不直接发放 AIP 或 AIT；价格尚待商业审批。' });
      }

      if (pathname === '/api/economy/check-in' && req.method === 'POST') {
        const user = requireUser(db, req);
        const day = isoNow().slice(0, 10);
        const base = awardAipRule(db, { userId: user.id, ruleKey: 'daily_login', eventKey: `daily-login:${user.id}:${day}`, metadata: { day } });
        let streak = 1;
        let streakReward = null;
        if (!base.idempotent) {
          const days = new Set(db.prepare(`SELECT substr(created_at,1,10) day FROM point_events WHERE user_id=? AND event_type='daily_login' AND status='posted' ORDER BY created_at DESC LIMIT 14`).all(user.id).map(row => row.day));
          for (let offset = 1; offset < 7; offset += 1) {
            const previous = new Date(`${day}T00:00:00.000Z`);
            previous.setUTCDate(previous.getUTCDate() - offset);
            if (!days.has(previous.toISOString().slice(0, 10))) break;
            streak += 1;
          }
          const streakRule = `streak_day_${Math.min(streak, 7)}`;
          if (AIP_REWARD_RULES[streakRule]) streakReward = awardAipRule(db, { userId: user.id, ruleKey: streakRule, eventKey: `login-streak:${user.id}:${day}`, metadata: { streak } });
        }
        return sendJson(res, base.idempotent ? 200 : 201, { idempotent: base.idempotent, streak, baseReward: AIP_REWARD_RULES.daily_login.amount, streakReward: streakReward ? AIP_REWARD_RULES[`streak_day_${Math.min(streak, 7)}`].amount : 0, economy: economySnapshot(db, user) });
      }

      if (pathname === '/api/economy/creation/quote' && req.method === 'GET') {
        const user = requireUser(db, req);
        const usageType = String(url.searchParams.get('usageType') || 'light_creation');
        const units = asInt(url.searchParams.get('units') || 1, 1, 100, '创作次数');
        return sendJson(res, 200, { quote: quoteCreation(db, { userId: user.id, usageType, units }) });
      }

      if (pathname === '/api/economy/creation/consume' && req.method === 'POST') {
        const user = requireUser(db, req);
        const body = await readJson(req);
        const result = consumeCreation(db, { userId: user.id, usageType: String(body.usageType || 'light_creation'), units: asInt(body.units ?? 1, 1, 100, '创作次数'), idempotencyKey: String(body.idempotencyKey || ''), subjectType: String(body.subjectType || 'creation').slice(0, 80), subjectId: String(body.subjectId || ''), metadata: { actorRole: publicEconomyUser(db, user).role } });
        return sendJson(res, result.idempotent ? 200 : 201, { ...result, economy: economySnapshot(db, user) });
      }

      if (pathname === '/api/economy/subscription/cancel' && req.method === 'POST') {
        const user = requireUser(db, req);
        const active = db.prepare(`SELECT s.*,p.plan_key FROM subscriptions s JOIN subscription_plans p ON p.id=s.plan_id WHERE s.user_id=? AND s.status='active' AND s.ends_at>? ORDER BY s.starts_at DESC LIMIT 1`).get(user.id, isoNow());
        if (!active) throw new HttpError(404, '当前没有有效订阅', 'not_found');
        db.prepare(`UPDATE subscriptions SET cancel_at_period_end=1,updated_at=? WHERE id=?`).run(isoNow(), active.id);
        audit(db, { actorUserId: user.id, action: 'subscription.cancel_at_period_end', subjectType: 'subscription', subjectId: active.id, after: { endsAt: active.ends_at }, ipHash: ctx.ipHash });
        return sendJson(res, 200, { subscriptionId: active.id, cancelAtPeriodEnd: true, endsAt: active.ends_at, economy: economySnapshot(db, user) });
      }

      if (pathname === '/api/creator-applications' && req.method === 'POST') {
        const user = requireUser(db, req);
        const body = await readJson(req);
        const result = submitCreatorApplication(db, { userId: user.id, applicationNote: body.applicationNote, regionCode: body.regionCode, kycConsent: body.kycConsent });
        audit(db, { actorUserId: user.id, action: 'creator_application.submitted', subjectType: 'creator_application', subjectId: result.application.id, ipHash: ctx.ipHash });
        return sendJson(res, result.idempotent ? 200 : 201, result);
      }

      let economyParams = routeMatch(pathname, '/api/ait-entitlements/:id/settlements');
      if (economyParams && req.method === 'POST') {
        const user = requireUser(db, req);
        const body = await readJson(req);
        const result = requestAitSettlement(db, { entitlementId: economyParams.id, userId: user.id, settlementType: body.settlementType, currency: body.settlementType === 'benefit' ? body.benefitType : body.currency, grossAmount: body.grossAmount, payerSubject: body.payerSubject, payeeSubject: body.payeeSubject });
        audit(db, { actorUserId: user.id, action: `ait.${result.type}_requested`, subjectType: result.type === 'payment' ? 'payment_settlement' : 'benefit_claim', subjectId: result.record.id, ipHash: ctx.ipHash });
        return sendJson(res, result.idempotent ? 200 : 201, result);
      }

      if (pathname === '/api/economy/appeals' && req.method === 'POST') {
        const user = requireUser(db, req);
        const body = await readJson(req);
        const appeal = submitLedgerAppeal(db, { userId: user.id, subjectType: body.subjectType, subjectId: String(body.subjectId || ''), reason: body.reason });
        audit(db, { actorUserId: user.id, action: 'economy.appeal_submitted', subjectType: 'ledger_appeal', subjectId: appeal.id, ipHash: ctx.ipHash });
        return sendJson(res, 201, { appeal });
      }

      if (pathname === '/api/admin/subscriptions/grant' && req.method === 'POST') {
        const user = requireUser(db, req, ['admin']);
        const body = await readJson(req);
        const target = db.prepare('SELECT * FROM users WHERE id=?').get(String(body.userId || ''));
        if (!target) throw new HttpError(404, '用户不存在', 'not_found');
        const subscription = activateSubscription(db, { userId: target.id, planKey: String(body.planKey || ''), sourceType: body.sourceType === 'verified_payment' ? 'verified_payment' : 'admin_grant', paymentReference: body.paymentReference || null, days: asInt(body.days ?? 30, 1, 366, '订阅天数') });
        audit(db, { actorUserId: user.id, action: 'subscription.activated', subjectType: 'subscription', subjectId: subscription.id, after: { targetUserId: target.id, planKey: subscription.plan_key, sourceType: subscription.source_type }, ipHash: ctx.ipHash });
        return sendJson(res, 201, { subscription, economy: economySnapshot(db, target) });
      }

      if (pathname === '/api/admin/economy/rewards' && req.method === 'POST') {
        const user = requireUser(db, req, ['admin']);
        const body = await readJson(req);
        const target = db.prepare('SELECT * FROM users WHERE id=?').get(String(body.userId || ''));
        if (!target) throw new HttpError(404, '用户不存在', 'not_found');
        const allowedRules = new Set(['daily_recommendation', 'qualified_invitation', 'first_publish', 'version_optimization', 'operation_task_low', 'operation_task_medium', 'operation_task_high']);
        const ruleKey = String(body.ruleKey || '');
        if (!allowedRules.has(ruleKey)) throw new HttpError(400, '该奖励只能由对应服务端证据链触发', 'reward_rule_not_manually_grantable');
        const eventKey = String(body.eventKey || '').trim();
        if (eventKey.length < 8) throw new HttpError(400, '奖励事件 ID 无效', 'invalid_idempotency_key');
        const result = awardAipRule(db, { userId: target.id, ruleKey, eventKey, subjectType: String(body.subjectType || 'operation').slice(0, 80), subjectId: String(body.subjectId || target.id), metadata: { evidenceReference: String(body.evidenceReference || '').slice(0, 240), grantedBy: user.id } });
        audit(db, { actorUserId: user.id, action: 'aip.reward_granted', subjectType: 'aip_batch', subjectId: result.batch.id, after: { targetUserId: target.id, ruleKey, amount: result.batch.original_amount }, ipHash: ctx.ipHash });
        return sendJson(res, result.idempotent ? 200 : 201, { ...result, economy: economySnapshot(db, target) });
      }

      economyParams = routeMatch(pathname, '/api/admin/aip-batches/:id/status');
      if (economyParams && req.method === 'POST') {
        const user = requireUser(db, req, ['admin']);
        const body = await readJson(req);
        const batch = db.prepare(`SELECT * FROM ledger_batches WHERE id=? AND asset_type='AIP'`).get(economyParams.id);
        if (!batch) throw new HttpError(404, 'AIP 批次不存在', 'not_found');
        const next = body.status === 'frozen' ? 'frozen' : body.status === 'available' ? 'available' : body.status === 'reversed' ? 'reversed' : null;
        const transitions = { available: ['frozen', 'reversed'], frozen: ['available', 'reversed'], pending: ['available', 'frozen', 'reversed'] };
        if (!next || !transitions[batch.status]?.includes(next)) throw new HttpError(409, 'AIP 批次状态变更无效', 'invalid_state');
        const reason = clampText(body.reason, 500, '处理原因');
        const now = isoNow();
        db.prepare(`UPDATE ledger_batches SET status=?,frozen_at=?,reversed_at=?,remaining_amount=?,reason_code=? WHERE id=?`)
          .run(next, next === 'frozen' ? now : null, next === 'reversed' ? now : null, next === 'reversed' ? 0 : batch.remaining_amount, reason, batch.id);
        db.prepare(`UPDATE point_events SET status=?,frozen_at=?,reversed_at=?,reason_code=? WHERE batch_id=? AND amount>0`)
          .run(next === 'available' ? 'posted' : next === 'frozen' ? 'frozen' : 'revoked', next === 'frozen' ? now : null, next === 'reversed' ? now : null, reason, batch.id);
        notify(db, batch.user_id, 'points', 'AIP 批次状态已更新', `${batch.original_amount} AIP · ${batch.status} → ${next}。${reason}`, 'aip_batch', batch.id);
        audit(db, { actorUserId: user.id, action: `aip_batch.${next}`, subjectType: 'aip_batch', subjectId: batch.id, before: { status: batch.status }, after: { status: next, reason }, ipHash: ctx.ipHash });
        return sendJson(res, 200, { batch: db.prepare('SELECT * FROM ledger_batches WHERE id=?').get(batch.id) });
      }

      economyParams = routeMatch(pathname, '/api/admin/creator-applications/:id/review');
      if (economyParams && req.method === 'POST') {
        const user = requireUser(db, req, ['admin']);
        const body = await readJson(req);
        const application = reviewCreatorApplication(db, { applicationId: economyParams.id, reviewerId: user.id, decision: body.decision, evidenceReference: body.evidenceReference, note: body.note });
        const target = db.prepare('SELECT * FROM users WHERE id=?').get(application.user_id);
        if (application.status === 'approved') ensureCreatorWorkspace(db, target);
        notify(db, application.user_id, 'identity', application.status === 'approved' ? 'KOL 资格已通过' : application.status === 'under_review' ? 'KYC 已完成，进入平台审核' : '创作者资格状态已更新', application.review_note || application.status, 'creator_application', application.id);
        audit(db, { actorUserId: user.id, action: `creator_application.${body.decision}`, subjectType: 'creator_application', subjectId: application.id, after: { status: application.status }, ipHash: ctx.ipHash });
        return sendJson(res, 200, { application, economy: economySnapshot(db, target) });
      }

      economyParams = routeMatch(pathname, '/api/campaigns/:id/economy-contract');
      if (economyParams && req.method === 'POST') {
        const user = requireUser(db, req, ['brand']);
        const campaign = db.prepare('SELECT * FROM campaigns WHERE id=? AND brand_user_id=?').get(economyParams.id, user.id);
        if (!campaign) throw new HttpError(404, 'Campaign 不存在', 'not_found');
        const body = await readJson(req);
        const rule = upsertCampaignEconomyRule(db, { campaignId: campaign.id, contractVersion: body.contractVersion, primarySuccessEvent: body.primarySuccessEvent, playerRule: body.playerRule, creatorRule: body.creatorRule, attribution: body.attribution, eligibility: body.eligibility, budget: body.budget, settlement: body.settlement, lockedFields: body.lockedFields, expiresAt: body.expiresAt });
        audit(db, { actorUserId: user.id, action: 'campaign_economy_contract.submitted', subjectType: 'campaign_economy_rule', subjectId: rule.id, after: { campaignId: campaign.id, contractVersion: rule.contract_version }, ipHash: ctx.ipHash });
        return sendJson(res, 201, { rule });
      }

      economyParams = routeMatch(pathname, '/api/admin/campaigns/:id/economy-contract/approve');
      if (economyParams && req.method === 'POST') {
        const user = requireUser(db, req, ['admin']);
        const body = await readJson(req);
        const current = db.prepare(`SELECT * FROM campaign_economy_rules WHERE campaign_id=? AND contract_version=?`).get(economyParams.id, String(body.contractVersion || ''));
        if (!current) throw new HttpError(404, '待审核 Campaign Contract 不存在', 'not_found');
        const rule = upsertCampaignEconomyRule(db, { campaignId: current.campaign_id, contractVersion: current.contract_version, primarySuccessEvent: current.primary_success_event, playerRule: safeJson(current.player_rule_json), creatorRule: safeJson(current.creator_rule_json), attribution: safeJson(current.attribution_json), eligibility: safeJson(current.eligibility_json), budget: safeJson(current.budget_json), settlement: safeJson(current.settlement_json), lockedFields: safeJson(current.locked_fields_json), approvedBy: user.id, approve: true, expiresAt: current.expires_at });
        audit(db, { actorUserId: user.id, action: 'campaign_economy_contract.approved', subjectType: 'campaign_economy_rule', subjectId: rule.id, after: { campaignId: rule.campaign_id, contractVersion: rule.contract_version }, ipHash: ctx.ipHash });
        return sendJson(res, 200, { rule });
      }

      economyParams = routeMatch(pathname, '/api/admin/campaigns/:id/ait-entitlements');
      if (economyParams && req.method === 'POST') {
        const user = requireUser(db, req, ['admin']);
        const body = await readJson(req);
        const target = db.prepare('SELECT * FROM users WHERE id=?').get(String(body.userId || ''));
        if (!target) throw new HttpError(404, '权益接收用户不存在', 'not_found');
        const result = createAitEntitlement(db, { userId: target.id, campaignId: economyParams.id, contractVersion: body.contractVersion, sourceType: body.sourceType, sourceEventType: body.sourceEventType, sourceEventId: body.sourceEventId, amount: body.amount, attributionReference: body.attributionReference, riskDecision: body.riskDecision, reasonCode: body.reasonCode });
        audit(db, { actorUserId: user.id, action: 'ait.entitlement_created', subjectType: 'ait_entitlement', subjectId: result.entitlement.id, after: { targetUserId: target.id, sourceType: result.entitlement.source_type, amount: result.entitlement.amount }, ipHash: ctx.ipHash });
        return sendJson(res, result.idempotent ? 200 : 201, result);
      }

      economyParams = routeMatch(pathname, '/api/admin/ait-entitlements/:id/review');
      if (economyParams && req.method === 'POST') {
        const user = requireUser(db, req, ['admin']);
        const body = await readJson(req);
        const entitlement = reviewAitEntitlement(db, { entitlementId: economyParams.id, decision: body.decision, reviewerId: user.id, reasonCode: body.reasonCode });
        notify(db, entitlement.user_id, 'settlement', entitlement.status === 'available' ? 'AIT 权益已可用' : 'AIT 权益状态已更新', `${entitlement.amount} AIT · ${entitlement.status}`, 'ait_entitlement', entitlement.id);
        return sendJson(res, 200, { entitlement });
      }

      economyParams = routeMatch(pathname, '/api/admin/benefit-claims/:id/review');
      if (economyParams && req.method === 'POST') {
        const user = requireUser(db, req, ['admin']);
        const body = await readJson(req);
        const claim = reviewBenefitClaim(db, { claimId: economyParams.id, reviewerId: user.id, decision: body.decision, fulfillmentReference: body.fulfillmentReference, note: body.note });
        return sendJson(res, 200, { claim });
      }

      economyParams = routeMatch(pathname, '/api/admin/payment-settlements/:id/review');
      if (economyParams && req.method === 'POST') {
        const user = requireUser(db, req, ['admin']);
        const body = await readJson(req);
        const settlement = reviewPaymentSettlement(db, { settlementId: economyParams.id, reviewerId: user.id, decision: body.decision, note: body.note });
        return sendJson(res, 200, { settlement });
      }

      economyParams = routeMatch(pathname, '/api/admin/payment-settlements/:id/complete');
      if (economyParams && req.method === 'POST') {
        const user = requireUser(db, req, ['admin']);
        const body = await readJson(req);
        const result = completePaymentSettlement(db, { settlementId: economyParams.id, reviewerId: user.id, paymentReference: body.paymentReference, receiptReference: body.receiptReference, feeAmount: body.feeAmount, fxSource: body.fxSource, fxRate: body.fxRate, fxTime: body.fxTime });
        return sendJson(res, 200, result);
      }

      economyParams = routeMatch(pathname, '/api/admin/economy/appeals/:id/review');
      if (economyParams && req.method === 'POST') {
        const user = requireUser(db, req, ['admin']);
        const body = await readJson(req);
        const appeal = reviewLedgerAppeal(db, { appealId: economyParams.id, reviewerId: user.id, decision: body.decision, resolutionNote: body.resolutionNote });
        return sendJson(res, 200, { appeal });
      }

      if (pathname === '/api/wallet-bindings/validate-address' && req.method === 'POST') {
        const body = await readJson(req);
        const checked = validateWalletAddressInput(body.address, body.chainId);
        return sendJson(res, 200, {
          valid: true,
          address: checked.address,
          normalized: checked.normalized,
          chainId: checked.chainId,
          network: checked.network,
          checksumVerified: true,
          ownershipVerified: false,
          withdrawalEnabled: false,
        });
      }

      if (pathname === '/api/wallet-bindings/challenge' && req.method === 'POST') {
        const user = requireUser(db, req, ['creator', 'brand']);
        const body = await readJson(req);
        const checked = validateWalletAddressInput(body.address, body.chainId);
        const { address, normalized, chainId } = checked;
        const occupied = db.prepare('SELECT user_id FROM wallet_bindings WHERE address=?').get(normalized);
        const loginOwner = db.prepare('SELECT id FROM users WHERE wallet_address=?').get(normalized);
        if ((occupied && occupied.user_id !== user.id) || (loginOwner && loginOwner.id !== user.id)) {
          throw new HttpError(409, '该钱包已绑定其他账户', 'wallet_already_bound');
        }
        const nonce = randomToken(12);
        const issuedAt = isoNow();
        const expiresAt = plusMinutes(10);
        const origin = `${req.socket.encrypted ? 'https' : 'http'}://${req.headers.host}`;
        const domain = String(req.headers.host || 'localhost');
        const message = `${domain} requests a wallet binding signature:\n${address}\n\nBind this wallet to Airvana account ${user.id}. This request does not trigger a blockchain transaction, token approval, or asset transfer.\n\nURI: ${origin}\nPurpose: bind-wallet\nChain ID: ${chainId}\nNonce: ${nonce}\nIssued At: ${issuedAt}\nExpiration Time: ${expiresAt}`;
        db.prepare(`INSERT INTO wallet_binding_challenges (id,user_id,address,chain_id,message,nonce,expires_at,created_at)
          VALUES (?,?,?,?,?,?,?,?)`).run(uid('wallet_challenge'), user.id, normalized, chainId, message, nonce, expiresAt, issuedAt);
        audit(db, { actorUserId: user.id, action: 'wallet_binding.challenge_created', subjectType: 'user', subjectId: user.id, after: { address: normalized, chainId }, ipHash: ctx.ipHash });
        return sendJson(res, 200, { address, chainId, message, expiresAt });
      }

      if (pathname === '/api/wallet-bindings/verify' && req.method === 'POST') {
        const user = requireUser(db, req, ['creator', 'brand']);
        const body = await readJson(req);
        let address;
        try { address = getAddress(String(body.address || '')); }
        catch { throw new HttpError(400, '钱包地址无效', 'invalid_wallet'); }
        const normalized = address.toLowerCase();
        const challenge = db.prepare(`SELECT * FROM wallet_binding_challenges
          WHERE user_id=? AND address=? AND used_at IS NULL AND expires_at>? ORDER BY created_at DESC LIMIT 1`)
          .get(user.id, normalized, isoNow());
        if (!challenge || challenge.message !== body.message) throw new HttpError(401, '绑定挑战已失效或不匹配', 'challenge_invalid');
        let recovered;
        try { recovered = getAddress(verifyMessage(challenge.message, String(body.signature || ''))); }
        catch { throw new HttpError(401, '钱包签名无效', 'signature_invalid'); }
        if (recovered.toLowerCase() !== normalized) throw new HttpError(401, '签名地址与绑定地址不一致', 'signature_mismatch');
        const occupied = db.prepare('SELECT user_id FROM wallet_bindings WHERE address=?').get(normalized);
        const loginOwner = db.prepare('SELECT id FROM users WHERE wallet_address=?').get(normalized);
        if ((occupied && occupied.user_id !== user.id) || (loginOwner && loginOwner.id !== user.id)) {
          throw new HttpError(409, '该钱包已绑定其他账户', 'wallet_already_bound');
        }
        const now = isoNow();
        let bindingId;
        transaction(db, () => {
          const claimed = db.prepare('UPDATE wallet_binding_challenges SET used_at=? WHERE id=? AND used_at IS NULL').run(now, challenge.id);
          if (!claimed.changes) throw new HttpError(409, '绑定挑战已被使用', 'challenge_used');
          db.prepare('UPDATE wallet_bindings SET is_primary=0,updated_at=? WHERE user_id=?').run(now, user.id);
          const existing = db.prepare('SELECT * FROM wallet_bindings WHERE address=?').get(normalized);
          if (existing) {
            bindingId = existing.id;
            db.prepare(`UPDATE wallet_bindings SET chain_id=?,status='verified',is_primary=1,verified_at=?,updated_at=? WHERE id=? AND user_id=?`)
              .run(challenge.chain_id, now, now, existing.id, user.id);
          } else {
            bindingId = uid('wallet');
            db.prepare(`INSERT INTO wallet_bindings (id,user_id,address,chain_id,status,is_primary,verified_at,created_at,updated_at)
              VALUES (?,?,?,?, 'verified',1,?,?,?)`).run(bindingId, user.id, normalized, challenge.chain_id, now, now, now);
          }
          audit(db, { actorUserId: user.id, action: 'wallet_binding.verified', subjectType: 'wallet_binding', subjectId: bindingId, after: { address: normalized, chainId: challenge.chain_id, primary: true }, ipHash: ctx.ipHash });
        });
        const binding = db.prepare('SELECT * FROM wallet_bindings WHERE id=?').get(bindingId);
        notify(db, user.id, 'wallet', '结算钱包已绑定', `${address.slice(0, 6)}…${address.slice(-4)} 已通过签名验证；仅可用于获批 Campaign 的独立付款记录。`, 'wallet_binding', bindingId);
        return sendJson(res, 200, { binding: serializeWalletBinding(binding) });
      }

      if (pathname === '/api/ait-withdrawals' && req.method === 'POST') {
        throw new HttpError(410, 'AIT 通用提现已下线；请从具体 Campaign AIT 权益发起权益申领或独立付款结算', 'ait_withdrawal_retired');
      }

      let params = routeMatch(pathname, '/api/ait-withdrawals/:id/cancel');
      if (params && req.method === 'POST') {
        throw new HttpError(410, 'AIT 通用提现已下线', 'ait_withdrawal_retired');
      }

      if (pathname === '/api/agents' && req.method === 'POST') {
        const user = requireUser(db, req, ['creator']);
        const body = await readJson(req);
        const type = AGENT_TYPES.has(body.contentType) ? body.contentType : 'all';
        const reviewMode = body.reviewMode === 'auto' ? 'auto' : 'human';
        const id = uid('agent');
        const now = isoNow();
        db.prepare(`INSERT INTO agents (id,owner_user_id,name,description,content_type,status,permissions_json,review_mode,system_prompt,created_at,updated_at) VALUES (?,?,?,?,?,'active',?,?,?,?,?)`)
          .run(id, user.id, clampText(body.name, 40, 'Agent 名称'), String(body.description || '').slice(0, 160), type, jsonString(sanitizePermissions(body.permissions)), reviewMode, String(body.systemPrompt || '').slice(0, 1200), now, now);
        const agent = db.prepare('SELECT * FROM agents WHERE id=?').get(id);
        audit(db, { actorUserId: user.id, action: 'agent.created', subjectType: 'agent', subjectId: id, after: mapAgent(agent), ipHash: ctx.ipHash });
        return sendJson(res, 201, { agent: mapAgent(agent) });
      }

      params = routeMatch(pathname, '/api/agents/:id');
      if (params && req.method === 'PATCH') {
        const user = requireUser(db, req, ['creator']);
        const current = requireOwnedAgent(db, params.id, user);
        const body = await readJson(req);
        const type = body.contentType == null ? current.content_type : AGENT_TYPES.has(body.contentType) ? body.contentType : current.content_type;
        const status = body.status == null ? current.status : ['active', 'paused', 'archived'].includes(body.status) ? body.status : current.status;
        const permissions = body.permissions == null ? safeJson(current.permissions_json) : sanitizePermissions(body.permissions);
        const reviewMode = body.reviewMode == null ? current.review_mode : body.reviewMode === 'auto' ? 'auto' : 'human';
        const now = isoNow();
        transaction(db, () => {
          db.prepare(`UPDATE agents SET name=?,description=?,content_type=?,status=?,permissions_json=?,review_mode=?,system_prompt=?,updated_at=? WHERE id=?`)
            .run(body.name == null ? current.name : clampText(body.name, 40, 'Agent 名称'), body.description == null ? current.description : String(body.description).slice(0, 160), type, status, jsonString(permissions), reviewMode, body.systemPrompt == null ? current.system_prompt : String(body.systemPrompt).slice(0, 1200), now, current.id);
          if (status === 'paused' || status === 'archived') {
            db.prepare(`UPDATE agent_tasks SET status='cancelled',error_text='Agent 已暂停',finished_at=?,updated_at=? WHERE agent_id=? AND status IN ('queued','running')`).run(now, now, current.id);
          }
          audit(db, { actorUserId: user.id, action: 'agent.updated', subjectType: 'agent', subjectId: current.id, before: mapAgent(current), after: body, ipHash: ctx.ipHash });
        });
        return sendJson(res, 200, { agent: mapAgent(db.prepare('SELECT * FROM agents WHERE id=?').get(current.id)) });
      }

      params = routeMatch(pathname, '/api/agents/:id/memory');
      if (params && req.method === 'POST') {
        const user = requireUser(db, req, ['creator']);
        const agent = requireOwnedAgent(db, params.id, user);
        const body = await readJson(req);
        const memoryType = ['brand_voice', 'audience', 'constraint', 'learning'].includes(body.memoryType) ? body.memoryType : 'learning';
        const priority = asInt(body.priority ?? 2, 1, 3, '记忆优先级');
        const source = String(body.source || 'user').slice(0, 80) || 'user';
        const id = uid('memory');
        const now = isoNow();
        db.prepare(`INSERT INTO agent_memory (id,agent_id,owner_user_id,memory_type,content,source,priority,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)`)
          .run(id, agent.id, user.id, memoryType, clampText(body.content, 1500, '记忆内容'), source, priority, now, now);
        audit(db, { actorUserId: user.id, action: 'agent.memory_added', subjectType: 'agent_memory', subjectId: id, after: { agentId: agent.id, memoryType, priority, source }, ipHash: ctx.ipHash });
        return sendJson(res, 201, { id, memoryType, priority, source });
      }

      params = routeMatch(pathname, '/api/agent-memory/:id');
      if (params && req.method === 'PATCH') {
        const user = requireUser(db, req, ['creator']);
        const memory = db.prepare(`SELECT m.* FROM agent_memory m JOIN agents a ON a.id=m.agent_id WHERE m.id=? AND a.owner_user_id=?`).get(params.id, user.id);
        if (!memory) throw new HttpError(404, 'Agent 记忆不存在', 'not_found');
        const body = await readJson(req);
        const memoryType = body.memoryType == null ? memory.memory_type : ['brand_voice', 'audience', 'constraint', 'learning'].includes(body.memoryType) ? body.memoryType : memory.memory_type;
        const priority = body.priority == null ? Number(memory.priority || 2) : asInt(body.priority, 1, 3, '记忆优先级');
        const source = body.source == null ? memory.source : String(body.source || 'user').slice(0, 80);
        const content = body.content == null ? memory.content : clampText(body.content, 1500, '记忆内容');
        db.prepare(`UPDATE agent_memory SET memory_type=?,content=?,source=?,priority=?,updated_at=? WHERE id=?`).run(memoryType, content, source, priority, isoNow(), memory.id);
        audit(db, { actorUserId: user.id, action: 'agent.memory_updated', subjectType: 'agent_memory', subjectId: memory.id, before: { memoryType: memory.memory_type, priority: memory.priority, source: memory.source }, after: { memoryType, priority, source }, ipHash: ctx.ipHash });
        return sendJson(res, 200, { id: memory.id, memoryType, priority, source });
      }

      if (params && req.method === 'DELETE') {
        const user = requireUser(db, req, ['creator']);
        const memory = db.prepare(`SELECT m.* FROM agent_memory m JOIN agents a ON a.id=m.agent_id WHERE m.id=? AND a.owner_user_id=?`).get(params.id, user.id);
        if (!memory) throw new HttpError(404, 'Agent 记忆不存在', 'not_found');
        transaction(db, () => {
          db.prepare('DELETE FROM agent_memory WHERE id=?').run(memory.id);
          audit(db, { actorUserId: user.id, action: 'agent.memory_deleted', subjectType: 'agent_memory', subjectId: memory.id, before: { agentId: memory.agent_id, memoryType: memory.memory_type }, ipHash: ctx.ipHash });
        });
        return sendJson(res, 200, { deleted: true });
      }

      if (pathname === '/api/tasks' && req.method === 'POST') {
        const user = requireUser(db, req);
        const body = await readJson(req);
        if (!CONTENT_TYPES.has(body.contentType)) throw new HttpError(400, '内容类型无效', 'validation_error');
        const agent = requireOwnedAgent(db, String(body.agentId || ''), user);
        validateAgentForTask(agent, body.contentType);
        const now = isoNow();
        const contentId = uid('content');
        const taskId = uid('task');
        const usageType = body.creationMode === 'deep' ? 'deep_creation' : 'light_creation';
        let usage;
        transaction(db, () => {
          usage = consumeCreation(db, { userId: user.id, usageType, units: 1, idempotencyKey: String(body.idempotencyKey || `task:${taskId}`), subjectType: 'content', subjectId: contentId, metadata: { taskId, contentType: body.contentType } });
          db.prepare(`INSERT INTO contents (id,owner_user_id,agent_id,title,content_type,status,created_at,updated_at) VALUES (?,?,?,?,?,'generating',?,?)`)
            .run(contentId, user.id, agent.id, clampText(body.title, 80, '内容标题'), body.contentType, now, now);
          db.prepare(`INSERT INTO agent_tasks (id,owner_user_id,agent_id,content_id,task_type,status,progress,prompt,created_at,updated_at) VALUES (?,?,?,?,?,'queued',0,?,?,?)`)
            .run(taskId, user.id, agent.id, contentId, 'generate', clampText(body.prompt, 3000, '创作目标'), now, now);
          db.prepare(`INSERT INTO task_runtime (task_id,attempt,max_attempts) VALUES (?,0,3)`).run(taskId);
          audit(db, { actorUserId: user.id, action: 'agent.task_queued', subjectType: 'task', subjectId: taskId, after: { contentId, agentId: agent.id, contentType: body.contentType }, ipHash: ctx.ipHash });
        });
        return sendJson(res, 202, { task: mapTask(db.prepare('SELECT * FROM agent_tasks WHERE id=?').get(taskId)), content: mapContent(db.prepare('SELECT * FROM contents WHERE id=?').get(contentId)), usage, economy: economySnapshot(db, user) });
      }

      params = routeMatch(pathname, '/api/tasks/:id/review');
      if (params && req.method === 'POST') {
        const user = requireUser(db, req);
        const body = await readJson(req);
        const task = db.prepare('SELECT * FROM agent_tasks WHERE id=?').get(params.id);
        if (!task || task.owner_user_id !== user.id) throw new HttpError(404, '任务不存在', 'not_found');
        if (task.status !== 'review_pending') throw new HttpError(409, '任务当前不处于待审核状态', 'invalid_state');
        const content = requireOwnedContent(db, task.content_id, user);
        const decision = body.decision;
        const now = isoNow();
        transaction(db, () => {
          if (decision === 'approve') {
            const version = Number(content.current_version) + 1;
            db.prepare(`INSERT INTO content_versions (id,content_id,version,title,payload_json,source_task_id,created_by,created_at) VALUES (?,?,?,?,?,?,?,?)`)
              .run(uid('ver'), content.id, version, content.title, content.payload_json, task.id, user.id, now);
            const artifact = saveArtifact(db, { content: { ...content, current_version: version }, payload: safeJson(content.payload_json), version });
            db.prepare(`UPDATE contents SET status='draft',current_version=?,updated_at=? WHERE id=?`).run(version, now, content.id);
            db.prepare(`UPDATE agent_tasks SET status='approved',review_note=?,updated_at=? WHERE id=?`).run(String(body.note || '').slice(0, 500), now, task.id);
            db.prepare(`INSERT INTO agent_task_steps (id,task_id,sequence,step_type,status,input_json,output_json,started_at,finished_at)
              VALUES (?,?,6,'artifact_builder','completed',?,?,?,?)
              ON CONFLICT(task_id,sequence) DO UPDATE SET status='completed',output_json=excluded.output_json,finished_at=excluded.finished_at`)
              .run(uid('step'), task.id, jsonString({ version }), jsonString({ manifest: artifact.manifest, validation: artifact.validation }), now, now);
          } else if (decision === 'reject') {
            db.prepare(`UPDATE contents SET status='rejected',updated_at=? WHERE id=?`).run(now, content.id);
            db.prepare(`UPDATE agent_tasks SET status='rejected',review_note=?,updated_at=? WHERE id=?`).run(clampText(body.note, 500, '拒绝原因'), now, task.id);
          } else throw new HttpError(400, '审核决定无效', 'validation_error');
          audit(db, { actorUserId: user.id, action: `agent.task_${decision}d`, subjectType: 'task', subjectId: task.id, before: { status: task.status }, after: { note: body.note || '' }, ipHash: ctx.ipHash });
        });
        return sendJson(res, 200, { task: mapTask(db.prepare('SELECT * FROM agent_tasks WHERE id=?').get(task.id)), content: mapContent(db.prepare('SELECT * FROM contents WHERE id=?').get(content.id)) });
      }

      params = routeMatch(pathname, '/api/tasks/:id/cancel');
      if (params && req.method === 'POST') {
        const user = requireUser(db, req);
        const task = db.prepare('SELECT * FROM agent_tasks WHERE id=? AND owner_user_id=?').get(params.id, user.id);
        if (!task) throw new HttpError(404, '任务不存在', 'not_found');
        if (!['queued', 'running', 'review_pending'].includes(task.status)) throw new HttpError(409, '当前任务不能取消', 'invalid_state');
        const now = isoNow();
        transaction(db, () => {
          db.prepare(`UPDATE agent_tasks SET status='cancelled',error_text='用户取消',finished_at=?,updated_at=? WHERE id=?`).run(now, now, task.id);
          db.prepare(`UPDATE task_runtime SET cancelled_at=?,lease_token=NULL WHERE task_id=?`).run(now, task.id);
          db.prepare(`UPDATE contents SET status='generation_failed',updated_at=? WHERE id=? AND status IN ('generating','review_pending')`).run(now, task.content_id);
          audit(db, { actorUserId: user.id, action: 'agent.task_cancelled', subjectType: 'task', subjectId: task.id, ipHash: ctx.ipHash });
        });
        return sendJson(res, 200, { status: 'cancelled' });
      }

      params = routeMatch(pathname, '/api/tasks/:id/retry');
      if (params && req.method === 'POST') {
        const user = requireUser(db, req);
        const task = db.prepare('SELECT * FROM agent_tasks WHERE id=? AND owner_user_id=?').get(params.id, user.id);
        if (!task) throw new HttpError(404, '任务不存在', 'not_found');
        if (!['failed', 'rejected', 'cancelled'].includes(task.status)) throw new HttpError(409, '当前任务不能重试', 'invalid_state');
        const now = isoNow();
        transaction(db, () => {
          consumeCreation(db, { userId: user.id, usageType: 'regenerate_large', units: 1, idempotencyKey: `task-retry:${task.id}:${Number(task.updated_at ? new Date(task.updated_at).getTime() : Date.now())}`, subjectType: 'content', subjectId: task.content_id, metadata: { taskId: task.id, action: 'retry' } });
          db.prepare(`UPDATE agent_tasks SET status='queued',progress=0,error_text=NULL,review_note=NULL,started_at=NULL,finished_at=NULL,updated_at=? WHERE id=?`).run(now, task.id);
          db.prepare(`UPDATE task_runtime SET attempt=0,cancelled_at=NULL,next_retry_at=NULL,lease_token=NULL,leased_at=NULL WHERE task_id=?`).run(task.id);
          db.prepare(`DELETE FROM agent_task_steps WHERE task_id=?`).run(task.id);
          db.prepare(`UPDATE contents SET status='generating',moderation_status='not_run',updated_at=? WHERE id=?`).run(now, task.content_id);
          audit(db, { actorUserId: user.id, action: 'agent.task_retried', subjectType: 'task', subjectId: task.id, ipHash: ctx.ipHash });
        });
        return sendJson(res, 202, { status: 'queued' });
      }

      if (pathname === '/api/admin/agent-runtime' && req.method === 'POST') {
        const user = requireUser(db, req, ['admin']);
        const body = await readJson(req);
        const enabled = Boolean(body.enabled);
        db.prepare(`INSERT INTO app_settings (setting_key,value_json,updated_by,updated_at) VALUES ('agent_runtime_enabled',?,?,?)
          ON CONFLICT(setting_key) DO UPDATE SET value_json=excluded.value_json,updated_by=excluded.updated_by,updated_at=excluded.updated_at`)
          .run(jsonString(enabled), user.id, isoNow());
        audit(db, { actorUserId: user.id, action: enabled ? 'agent.runtime_enabled' : 'agent.runtime_killed', subjectType: 'system', subjectId: 'agent_runtime', after: { enabled }, ipHash: ctx.ipHash });
        return sendJson(res, 200, { enabled });
      }

      params = routeMatch(pathname, '/api/contents/:id/publish');
      if (params && req.method === 'POST') {
        const user = requireUser(db, req);
        const content = requireOwnedContent(db, params.id, user);
        if (content.status !== 'draft' || content.moderation_status !== 'passed' || content.current_version < 1) throw new HttpError(409, '只有审核通过且有正式版本的草稿可以发布', 'invalid_state');
        const artifact = db.prepare(`SELECT id FROM content_artifacts WHERE content_id=? AND version=? AND status='ready'`).get(content.id, content.current_version);
        if (!artifact) throw new HttpError(409, '当前版本成品构建未通过，不能发布', 'artifact_not_ready');
        const now = isoNow();
        transaction(db, () => {
          db.prepare(`UPDATE contents SET status='published',published_at=?,scheduled_at=NULL,updated_at=? WHERE id=?`).run(now, now, content.id);
          awardAipRule(db, { userId: user.id, ruleKey: 'first_publish', eventKey: `first-publish:${user.id}`, subjectType: 'content', subjectId: content.id, metadata: { contentId: content.id } });
          audit(db, { actorUserId: user.id, action: 'content.published', subjectType: 'content', subjectId: content.id, before: { status: content.status }, after: { status: 'published' }, ipHash: ctx.ipHash });
        });
        return sendJson(res, 200, { content: mapContent(db.prepare('SELECT * FROM contents WHERE id=?').get(content.id)) });
      }

      params = routeMatch(pathname, '/api/contents/:id/schedule');
      if (params && req.method === 'POST') {
        const user = requireUser(db, req, ['creator']);
        const content = requireOwnedContent(db, params.id, user);
        if (content.status !== 'draft' || content.moderation_status !== 'passed') throw new HttpError(409, '只有审核通过的草稿可以定时发布', 'invalid_state');
        const body = await readJson(req);
        const scheduled = new Date(body.scheduledAt);
        if (!Number.isFinite(scheduled.getTime()) || scheduled.getTime() < Date.now() + 60_000) throw new HttpError(400, '发布时间至少需要晚于当前时间 1 分钟', 'validation_error');
        const now = isoNow();
        db.prepare(`UPDATE contents SET status='scheduled',scheduled_at=?,updated_at=? WHERE id=?`).run(scheduled.toISOString(), now, content.id);
        audit(db, { actorUserId: user.id, action: 'content.scheduled', subjectType: 'content', subjectId: content.id, after: { scheduledAt: scheduled.toISOString() }, ipHash: ctx.ipHash });
        return sendJson(res, 200, { content: mapContent(db.prepare('SELECT * FROM contents WHERE id=?').get(content.id)) });
      }

      params = routeMatch(pathname, '/api/contents/:id/archive');
      if (params && req.method === 'POST') {
        const user = requireUser(db, req, ['creator']);
        const content = requireOwnedContent(db, params.id, user);
        if (!['published', 'scheduled'].includes(content.status)) throw new HttpError(409, '当前内容不能归档', 'invalid_state');
        const now = isoNow();
        db.prepare(`UPDATE contents SET status='archived',archived_at=?,updated_at=? WHERE id=?`).run(now, now, content.id);
        audit(db, { actorUserId: user.id, action: 'content.archived', subjectType: 'content', subjectId: content.id, before: { status: content.status }, after: { status: 'archived' }, ipHash: ctx.ipHash });
        return sendJson(res, 200, { content: mapContent(db.prepare('SELECT * FROM contents WHERE id=?').get(content.id)) });
      }

      params = routeMatch(pathname, '/api/contents/:id/versions/:version/restore');
      if (params && req.method === 'POST') {
        const user = requireUser(db, req, ['creator']);
        const content = requireOwnedContent(db, params.id, user);
        const version = db.prepare('SELECT * FROM content_versions WHERE content_id=? AND version=?').get(content.id, Number(params.version));
        if (!version) throw new HttpError(404, '内容版本不存在', 'not_found');
        const now = isoNow();
        const next = Number(content.current_version) + 1;
        transaction(db, () => {
          db.prepare(`INSERT INTO content_versions (id,content_id,version,title,payload_json,created_by,created_at) VALUES (?,?,?,?,?,?,?)`)
            .run(uid('ver'), content.id, next, version.title, version.payload_json, user.id, now);
          saveArtifact(db, { content: { ...content, title: version.title, current_version: next }, payload: safeJson(version.payload_json), version: next });
          db.prepare(`UPDATE contents SET title=?,payload_json=?,current_version=?,status='draft',moderation_status='passed',published_at=NULL,scheduled_at=NULL,updated_at=? WHERE id=?`)
            .run(version.title, version.payload_json, next, now, content.id);
          audit(db, { actorUserId: user.id, action: 'content.version_restored', subjectType: 'content', subjectId: content.id, after: { sourceVersion: Number(params.version), newVersion: next }, ipHash: ctx.ipHash });
        });
        return sendJson(res, 200, { content: mapContent(db.prepare('SELECT * FROM contents WHERE id=?').get(content.id)) });
      }

      if (pathname === '/api/runtime/sessions' && req.method === 'POST') {
        const user = requireUser(db, req);
        const body = await readJson(req);
        const content = db.prepare('SELECT * FROM contents WHERE id=?').get(String(body.contentId || ''));
        if (!content || content.status !== 'published') throw new HttpError(409, '只有已发布内容可以开始有效体验', 'content_not_published');
        const artifact = db.prepare(`SELECT id FROM content_artifacts WHERE content_id=? AND version=? AND status='ready'`).get(content.id, content.current_version);
        if (!artifact) throw new HttpError(409, '内容成品尚未构建完成', 'artifact_not_ready');
        const recent = Number(db.prepare(`SELECT COUNT(*) n FROM runtime_sessions WHERE (device_hash=? OR ip_hash=?) AND created_at>?`).get(ctx.deviceHash, ctx.ipHash, new Date(Date.now() - 600_000).toISOString())?.n || 0);
        const openRisk = db.prepare(`SELECT id FROM risk_cases WHERE user_id=? AND status='open' AND score>=80 LIMIT 1`).get(user.id);
        const rewardEligible = user.role === 'creator' && content.owner_user_id !== user.id && recent < 40 && !openRisk;
        if (recent >= 40) createRiskCase(db, { userId: user.id, subjectType: 'user', subjectId: user.id, riskType: 'runtime_velocity', score: 85, evidence: { recentSessions: recent, deviceHash: ctx.deviceHash } });
        const token = randomToken(32);
        const id = uid('runtime');
        const now = isoNow();
        db.prepare(`INSERT INTO runtime_sessions
          (id,token_hash,user_id,content_id,device_hash,ip_hash,status,reward_eligible,next_sequence,expires_at,created_at)
          VALUES (?,?,?,?,?,?,'created',?,1,?,?)`)
          .run(id, sha256(token), user.id, content.id, ctx.deviceHash, ctx.ipHash, rewardEligible ? 1 : 0, plusMinutes(30), now);
        if (body.campaignId) {
          const campaign = db.prepare(`SELECT * FROM campaigns WHERE id=? AND status='active' AND starts_at<=? AND ends_at>=?`).get(String(body.campaignId), now, now);
          const ref = String(body.ref || body.creatorUserId || '');
          const creator = ref ? db.prepare(`SELECT * FROM users WHERE id=? AND role='creator'`).get(ref) : null;
          const participant = campaign && creator && creator.id === content.owner_user_id ? db.prepare(`SELECT id FROM campaign_participants WHERE campaign_id=? AND creator_user_id=? AND status='eligible'`).get(campaign.id, creator.id) : null;
          if (campaign && participant) db.prepare(`INSERT INTO attribution_touches (id,session_id,user_id,content_id,campaign_id,creator_user_id,channel_code,event_type,created_at) VALUES (?,?,?,?,?,?,?,'impression',?)`)
            .run(uid('touch'), id, user.id, content.id, campaign.id, creator.id, String(body.channelCode || 'creator-link').slice(0, 120), now);
        }
        audit(db, { actorUserId: user.id, action: 'runtime.session_created', subjectType: 'content', subjectId: content.id, after: { sessionId: id, rewardEligible }, ipHash: ctx.ipHash });
        return sendJson(res, 201, { sessionId: id, sessionToken: token, rewardEligible, requiredSequence: ['playable_start', 'step_complete', 'playable_complete'], expiresAt: plusMinutes(30) });
      }

      if (pathname === '/api/runtime/events' && req.method === 'POST') {
        const user = requireUser(db, req);
        const body = await readJson(req);
        const token = clampText(body.sessionToken, 200, '运行 Session Token');
        const session = db.prepare(`SELECT * FROM runtime_sessions WHERE token_hash=? AND user_id=? AND expires_at>?`).get(sha256(token), user.id, isoNow());
        if (!session) throw new HttpError(401, '运行 Session 已失效', 'runtime_session_invalid');
        if (session.status === 'completed') throw new HttpError(409, '该体验已经完成', 'runtime_already_completed');
        const sequence = asInt(body.sequence, 1, 20, '事件序号');
        if (sequence !== session.next_sequence) throw new HttpError(409, `事件顺序无效，下一事件应为 ${session.next_sequence}`, 'runtime_sequence_invalid');
        const required = ['playable_start', 'step_complete', 'playable_complete'];
        const expected = required[sequence - 1];
        if (body.eventType !== expected) throw new HttpError(409, `事件类型无效，当前需要 ${expected}`, 'runtime_event_invalid');
        const payload = body.payload && typeof body.payload === 'object' ? body.payload : {};
        if (JSON.stringify(payload).length > 4_000) throw new HttpError(413, '运行事件内容过大', 'payload_too_large');
        const now = isoNow();
        let points = 0;
        let rewardStatus = 'not_applicable';
        transaction(db, () => {
          db.prepare(`INSERT INTO runtime_events (id,session_id,sequence,event_type,payload_json,created_at) VALUES (?,?,?,?,?,?)`)
            .run(uid('runtime_event'), session.id, sequence, body.eventType, jsonString(payload), now);
          if (sequence === 1) {
            db.prepare(`UPDATE runtime_sessions SET status='active',started_at=?,next_sequence=2 WHERE id=?`).run(now, session.id);
            const touch = db.prepare(`SELECT * FROM attribution_touches WHERE session_id=? LIMIT 1`).get(session.id);
            if (touch) db.prepare(`INSERT INTO attribution_touches (id,session_id,user_id,content_id,campaign_id,creator_user_id,channel_code,event_type,created_at) VALUES (?,?,?,?,?,?,?,'playable_start',?)`)
              .run(uid('touch'), session.id, user.id, session.content_id, touch.campaign_id, touch.creator_user_id, touch.channel_code, now);
          } else if (sequence === 2) {
            db.prepare(`UPDATE runtime_sessions SET next_sequence=3 WHERE id=?`).run(session.id);
          } else {
            const duration = Date.now() - new Date(session.started_at).getTime();
            const already = db.prepare(`SELECT id FROM point_events WHERE user_id=? AND event_key=?`).get(user.id, `runtime:${session.id}`);
            if (session.reward_eligible && duration >= runtimeMinDurationMs && !already) {
              const daily = db.prepare(`SELECT id FROM runtime_sessions WHERE user_id=? AND content_id=? AND status='completed' AND reward_eligible=1 AND completed_at>? LIMIT 1`).get(user.id, session.content_id, new Date(Date.now() - 86_400_000).toISOString());
              if (!daily) {
                points = 5;
                rewardStatus = 'posted';
                awardAipRule(db, { userId: user.id, ruleKey: 'registration_first_play', eventKey: `registration-first-play:${user.id}`, subjectType: 'content', subjectId: session.content_id, metadata: { sessionId: session.id, proof: 'first-valid-runtime-completion' } });
                awardAipRule(db, { userId: user.id, ruleKey: 'playable_complete', eventKey: `runtime:${session.id}`, subjectType: 'content', subjectId: session.content_id, metadata: { sessionId: session.id, durationMs: duration, proof: 'ordered-runtime-events' } });
              } else rewardStatus = 'daily_duplicate';
            } else if (duration < runtimeMinDurationMs) {
              rewardStatus = 'too_fast';
              createRiskCase(db, { userId: user.id, subjectType: 'runtime_session', subjectId: session.id, riskType: 'impossibly_fast_completion', score: 65, evidence: { durationMs: duration, minimumMs: runtimeMinDurationMs } });
            } else rewardStatus = 'ineligible';
            db.prepare(`UPDATE runtime_sessions SET status='completed',completed_at=?,next_sequence=4 WHERE id=?`).run(now, session.id);
            const touch = db.prepare(`SELECT * FROM attribution_touches WHERE session_id=? LIMIT 1`).get(session.id);
            if (touch) db.prepare(`INSERT INTO attribution_touches (id,session_id,user_id,content_id,campaign_id,creator_user_id,channel_code,event_type,created_at) VALUES (?,?,?,?,?,?,?,'playable_complete',?)`)
              .run(uid('touch'), session.id, user.id, session.content_id, touch.campaign_id, touch.creator_user_id, touch.channel_code, now);
          }
          audit(db, { actorUserId: user.id, action: `runtime.${body.eventType}`, subjectType: 'runtime_session', subjectId: session.id, after: { sequence, points, rewardStatus }, ipHash: ctx.ipHash });
        });
        return sendJson(res, 201, { accepted: true, sequence, nextSequence: sequence + 1, points, rewardStatus, balance: pointSummary(db, user.id) });
      }

      if (pathname === '/api/engagements' && req.method === 'POST') {
        const user = requireUser(db, req, ['creator']);
        const body = await readJson(req);
        const eventType = String(body.eventType || '');
        if (eventType === 'complete') throw new HttpError(409, '完成奖励必须通过内容运行页的签名事件顺序产生', 'runtime_proof_required');
        if (!Object.hasOwn(REWARD_RULES, eventType)) throw new HttpError(400, '互动事件类型无效', 'validation_error');
        const eventKey = clampText(body.eventKey, 120, '事件 ID');
        const existing = db.prepare('SELECT * FROM engagement_events WHERE user_id=? AND event_key=?').get(user.id, eventKey);
        if (existing) return sendJson(res, 200, { idempotent: true, status: existing.status, points: existing.points, reason: existing.rejection_reason, balance: pointSummary(db, user.id) });
        const content = db.prepare('SELECT * FROM contents WHERE id=?').get(String(body.contentId || ''));
        if (!content) throw new HttpError(404, '内容不存在', 'not_found');
        let status = 'eligible';
        let reason = null;
        if (content.status !== 'published') { status = 'rejected'; reason = '内容未发布'; }
        else if (content.owner_user_id === user.id) { status = 'rejected'; reason = '自己的内容不计入互动奖励'; }
        else if (String(req.headers['x-airvana-device'] || '').length < 8) { status = 'rejected'; reason = '设备标识缺失'; }
        const since = new Date(Date.now() - 60_000).toISOString();
        const recent = Number(db.prepare(`SELECT COUNT(*) n FROM engagement_events WHERE (device_hash=? OR ip_hash=?) AND created_at>?`).get(ctx.deviceHash, ctx.ipHash, since)?.n || 0);
        if (recent >= 20) { status = 'rejected'; reason = '互动频率过高'; }
        const duplicateWindow = db.prepare(`SELECT id FROM engagement_events WHERE user_id=? AND content_id=? AND event_type=? AND status='eligible' AND created_at>? LIMIT 1`)
          .get(user.id, content.id, eventType, new Date(Date.now() - 86_400_000).toISOString());
        if (duplicateWindow) { status = 'rejected'; reason = '同类互动每日只计一次'; }
        const points = status === 'eligible' ? REWARD_RULES[eventType] : 0;
        const engagementId = uid('eng');
        transaction(db, () => {
          db.prepare(`INSERT INTO engagement_events (id,user_id,content_id,event_type,event_key,device_hash,ip_hash,status,rejection_reason,points,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
            .run(engagementId, user.id, content.id, eventType, eventKey, ctx.deviceHash, ctx.ipHash, status, reason, points, isoNow());
          if (points) db.prepare(`INSERT INTO point_events (id,user_id,currency,amount,status,event_type,event_key,subject_type,subject_id,metadata_json,created_at) VALUES (?,?,'AIP',?,'posted','engagement',?,'content',?,?,?)`)
            .run(uid('point'), user.id, points, `engagement:${engagementId}`, content.id, jsonString({ eventType, contentTitle: content.title }), isoNow());
          audit(db, { actorUserId: user.id, action: `engagement.${status}`, subjectType: 'content', subjectId: content.id, after: { eventType, points, reason }, ipHash: ctx.ipHash });
        });
        return sendJson(res, status === 'eligible' ? 201 : 200, { idempotent: false, status, points, reason, balance: pointSummary(db, user.id) });
      }

      if (pathname === '/api/demo/seed-workflow' && req.method === 'POST') {
        if (!allowDemo) throw new HttpError(404, '演示工作流未启用', 'not_found');
        const user = requireUser(db, req, ['brand']);
        if (!String(user.email || '').endsWith('@airvana.local')) throw new HttpError(403, '演示工作流仅供本地验收账户使用', 'forbidden');
        const existing = db.prepare(`SELECT id FROM campaigns WHERE brand_user_id=? AND title='[演示] 钱包安全互动 Campaign' LIMIT 1`).get(user.id);
        if (existing) return sendJson(res, 200, { campaignId: existing.id, idempotent: true });
        const creator = createOrGetDemoUser(db, 'creator');
        const agent = db.prepare('SELECT * FROM agents WHERE owner_user_id=? LIMIT 1').get(creator.id);
        const now = isoNow();
        const payload = {
          summary: '识别钱包授权风险的互动演示内容。', hook: '三步判断一次钱包签名是否安全。',
          sections: [{ heading: '先读权限', body: '确认签名消息不包含资产转移或无限授权。' }, { heading: '核对来源', body: '仅从可信入口发起操作，并再次检查域名。' }],
          interactions: [{ trigger: '选择安全检查项', result: '展示风险提示与正确处理方式' }],
          assets: ['Airvana 演示品牌色', '钱包安全图标'], safetyNotes: ['演示内容不构成投资建议', '永不索取私钥或助记词'],
          ctaLabel: '查看钱包安全清单', ctaUrl: 'https://airvana.ai/',
        };
        const contentId = uid('content');
        const campaignId = uid('campaign');
        transaction(db, () => {
          db.prepare(`INSERT INTO contents (id,owner_user_id,agent_id,title,content_type,status,moderation_status,moderation_json,payload_json,current_version,published_at,created_at,updated_at) VALUES (?,?,?,'[演示] 钱包签名安全挑战','game','published','passed',?,?,1,?,?,?)`)
            .run(contentId, creator.id, agent.id, jsonString({ passed: true, provider: 'demo-seed' }), jsonString(payload), now, now, now);
          db.prepare(`INSERT INTO content_versions (id,content_id,version,title,payload_json,created_by,created_at) VALUES (?, ?,1,'[演示] 钱包签名安全挑战',?,?,?)`)
            .run(uid('ver'), contentId, jsonString(payload), creator.id, now);
          const content = db.prepare('SELECT * FROM contents WHERE id=?').get(contentId);
          saveArtifact(db, { content, payload, version: 1 });
          const brief = campaignBrief({
            contentTypes: ['game', 'article'], regions: ['Global'], audience: '首次使用数字钱包的 Web3 用户', channel: 'Creator 内容广场',
            conversionGoal: '完成钱包安全互动并打开安全清单', ctaLabel: '查看钱包安全清单', ctaUrl: 'https://airvana.ai/', successMetric: '有效完成率与 CTA 打开率',
            brandAssets: ['Airvana 演示品牌色', '钱包安全图标'], optimizableFields: ['标题', '开场 Hook', '互动顺序'],
            allowedClaims: '帮助用户识别常见签名风险', prohibitedClaims: '收益保证、诱导转账、索取私钥或助记词',
            lockedFields: ['预算', '奖励规则', '地区', '品牌声明', '成功指标'], deliverableRequirements: '发布 1 个互动内容；包含风险提示、安全说明和 CTA。',
          });
          db.prepare(`INSERT INTO campaigns (id,brand_user_id,title,objective,status,brief_json,budget_ait,reward_ait,starts_at,ends_at,review_note,created_at,updated_at) VALUES (?,?,'[演示] 钱包安全互动 Campaign','验证内容驱动的安全教育完整交付链路','active',?,5000,500,?,?, '本地演示数据，非真实商业活动',?,?)`)
            .run(campaignId, user.id, jsonString(brief), new Date(Date.now() - 86_400_000).toISOString(), plusDays(30), now, now);
          db.prepare(`INSERT INTO campaign_participants (id,campaign_id,creator_user_id,status,created_at,updated_at) VALUES (?,?,?,'eligible',?,?)`).run(uid('participant'), campaignId, creator.id, now, now);
          const submittedId = uid('delivery');
          const changesId = uid('delivery');
          const approvedId = uid('delivery');
          db.prepare(`INSERT INTO campaign_deliverables (id,campaign_id,creator_user_id,content_id,status,submission_note,submitted_at,updated_at) VALUES (?,?,?,?,'submitted','[演示] 等待品牌核对 Campaign 要求',?,?)`).run(submittedId, campaignId, creator.id, contentId, now, now);
          db.prepare(`INSERT INTO campaign_deliverables (id,campaign_id,creator_user_id,content_id,status,submission_note,review_note,submitted_at,reviewed_at,updated_at) VALUES (?,?,?,?,'changes_requested','[演示] 首次交付','请补充 CTA 说明并重新提交',?,?,?)`).run(changesId, campaignId, creator.id, contentId, now, now, now);
          db.prepare(`INSERT INTO campaign_deliverables (id,campaign_id,creator_user_id,content_id,status,submission_note,review_note,submitted_at,reviewed_at,updated_at) VALUES (?,?,?,?,'approved','[演示] 已完成品牌要求','品牌交付检查通过',?,?,?)`).run(approvedId, campaignId, creator.id, contentId, now, now, now);
          const settlementId = uid('settlement');
          db.prepare(`INSERT INTO settlements (id,campaign_id,deliverable_id,user_id,currency,amount,status,approved_at,created_at,updated_at) VALUES (?,?,?,?,'AIT',500,'payment_pending',?,?,?)`).run(settlementId, campaignId, approvedId, creator.id, now, now, now);
          db.prepare(`INSERT INTO settlement_approvals (id,settlement_id,approver_user_id,decision,note,created_at) VALUES (?,?,?,'brand_confirmed','[演示] 品牌已确认并提交平台复核',?)`).run(uid('settlement_approval'), settlementId, user.id, now);
          notify(db, user.id, 'campaign', '[演示] 工作流已载入', '包含待审批、需修改、已批准交付与待复核 AIT 结算。', 'campaign', campaignId);
          audit(db, { actorUserId: user.id, action: 'demo.workflow_seeded', subjectType: 'campaign', subjectId: campaignId, after: { demo: true }, ipHash: ctx.ipHash });
        });
        return sendJson(res, 201, { campaignId, contentId, idempotent: false });
      }

      if (pathname === '/api/campaigns' && req.method === 'POST') {
        const user = requireUser(db, req, ['brand']);
        const body = await readJson(req);
        const budgetAit = asInt(body.budgetAit, 1, 10_000_000, 'AIT 预算');
        const rewardAit = asInt(body.rewardAit, 1, budgetAit, '单份交付 AIT');
        const starts = new Date(body.startsAt);
        const ends = new Date(body.endsAt);
        if (!Number.isFinite(starts.getTime()) || !Number.isFinite(ends.getTime()) || ends <= starts) throw new HttpError(400, 'Campaign 起止时间无效', 'validation_error');
        const brief = campaignBrief(body);
        validateCampaignBrief(brief);
        const id = uid('campaign');
        const now = isoNow();
        db.prepare(`INSERT INTO campaigns (id,brand_user_id,title,objective,status,brief_json,budget_ait,reward_ait,starts_at,ends_at,created_at,updated_at) VALUES (?,?,?,?,'draft',?,?,?,?,?,?,?)`)
          .run(id, user.id, clampText(body.title, 100, 'Campaign 名称'), clampText(body.objective, 500, 'Campaign 目标'), jsonString(brief), budgetAit, rewardAit, starts.toISOString(), ends.toISOString(), now, now);
        audit(db, { actorUserId: user.id, action: 'campaign.created', subjectType: 'campaign', subjectId: id, after: { budgetAit, rewardAit, brief }, ipHash: ctx.ipHash });
        const campaign = db.prepare(`SELECT c.*,u.display_name brand_name FROM campaigns c JOIN users u ON u.id=c.brand_user_id WHERE c.id=?`).get(id);
        return sendJson(res, 201, { campaign: serializeCampaign(campaign, db) });
      }

      params = routeMatch(pathname, '/api/campaigns/:id');
      if (params && req.method === 'PATCH') {
        const user = requireUser(db, req, ['brand']);
        const body = await readJson(req);
        const campaign = db.prepare('SELECT * FROM campaigns WHERE id=? AND brand_user_id=?').get(params.id, user.id);
        if (!campaign) throw new HttpError(404, 'Campaign 不存在', 'not_found');
        if (!['draft', 'rejected'].includes(campaign.status)) throw new HttpError(409, '只有草稿或被拒绝的 Campaign 可以编辑', 'invalid_state');
        const budgetAit = asInt(body.budgetAit, 1, 10_000_000, 'AIT 预算');
        const rewardAit = asInt(body.rewardAit, 1, budgetAit, '单份交付 AIT');
        const starts = new Date(body.startsAt);
        const ends = new Date(body.endsAt);
        if (!Number.isFinite(starts.getTime()) || !Number.isFinite(ends.getTime()) || ends <= starts) throw new HttpError(400, 'Campaign 起止时间无效', 'validation_error');
        const brief = campaignBrief(body, safeJson(campaign.brief_json));
        validateCampaignBrief(brief);
        const committed = Number(db.prepare(`SELECT COALESCE(SUM(amount),0) n FROM settlements WHERE campaign_id=? AND status IN ('approved','payment_pending','platform_approved','issued')`).get(campaign.id)?.n || 0);
        if (budgetAit < committed) throw new HttpError(409, 'AIT 预算不能低于已承诺结算金额', 'budget_below_committed');
        const now = isoNow();
        db.prepare(`UPDATE campaigns SET title=?,objective=?,status='draft',brief_json=?,budget_ait=?,reward_ait=?,starts_at=?,ends_at=?,review_note=NULL,updated_at=? WHERE id=?`)
          .run(clampText(body.title, 100, 'Campaign 名称'), clampText(body.objective, 500, 'Campaign 目标'), jsonString(brief), budgetAit, rewardAit, starts.toISOString(), ends.toISOString(), now, campaign.id);
        audit(db, { actorUserId: user.id, action: 'campaign.updated', subjectType: 'campaign', subjectId: campaign.id, before: { status: campaign.status, budgetAit: campaign.budget_ait, rewardAit: campaign.reward_ait }, after: { status: 'draft', budgetAit, rewardAit, brief }, ipHash: ctx.ipHash });
        const updated = db.prepare(`SELECT c.*,u.display_name brand_name FROM campaigns c JOIN users u ON u.id=c.brand_user_id WHERE c.id=?`).get(campaign.id);
        return sendJson(res, 200, { campaign: serializeCampaign(updated, db) });
      }

      params = routeMatch(pathname, '/api/campaigns/:id/submit');
      if (params && req.method === 'POST') {
        const user = requireUser(db, req, ['brand']);
        const campaign = db.prepare('SELECT * FROM campaigns WHERE id=? AND brand_user_id=?').get(params.id, user.id);
        if (!campaign) throw new HttpError(404, 'Campaign 不存在', 'not_found');
        if (campaign.status !== 'draft') throw new HttpError(409, '只有草稿可以提交平台审核', 'invalid_state');
        const org = ensureOrganization(db, user, false);
        if (org.verification_status !== 'verified') throw new HttpError(403, '品牌组织尚未通过平台验证', 'brand_not_verified');
        db.prepare(`UPDATE campaigns SET status='pending_review',updated_at=? WHERE id=?`).run(isoNow(), campaign.id);
        notify(db, user.id, 'campaign', 'Campaign 已提交平台审核', campaign.title, 'campaign', campaign.id);
        audit(db, { actorUserId: user.id, action: 'campaign.submitted', subjectType: 'campaign', subjectId: campaign.id, before: { status: 'draft' }, after: { status: 'pending_review' }, ipHash: ctx.ipHash });
        return sendJson(res, 200, { ok: true });
      }

      params = routeMatch(pathname, '/api/campaigns/:id/platform-review');
      if (params && req.method === 'POST') {
        const user = requireUser(db, req, ['admin']);
        const body = await readJson(req);
        const campaign = db.prepare('SELECT * FROM campaigns WHERE id=?').get(params.id);
        if (!campaign) throw new HttpError(404, 'Campaign 不存在', 'not_found');
        if (campaign.status !== 'pending_review') throw new HttpError(409, 'Campaign 当前不处于平台审核状态', 'invalid_state');
        const next = body.decision === 'approve' ? 'active' : body.decision === 'reject' ? 'rejected' : null;
        if (!next) throw new HttpError(400, '审核决定无效', 'validation_error');
        const note = next === 'rejected' ? clampText(body.note, 500, '拒绝原因') : String(body.note || '').slice(0, 500);
        const now = isoNow();
        transaction(db, () => {
          db.prepare('UPDATE campaigns SET status=?,review_note=?,updated_at=? WHERE id=?').run(next, note, now, campaign.id);
          if (next === 'active') db.prepare(`INSERT INTO campaign_budget_events (id,campaign_id,event_type,amount,actor_user_id,created_at) VALUES (?,?,'reserved',?,?,?)`).run(uid('budget'), campaign.id, campaign.budget_ait, user.id, now);
          notify(db, campaign.brand_user_id, 'campaign', next === 'active' ? 'Campaign 已批准上线' : 'Campaign 未通过平台审核', note || campaign.title, 'campaign', campaign.id);
          audit(db, { actorUserId: user.id, action: `campaign.${next}`, subjectType: 'campaign', subjectId: campaign.id, before: { status: campaign.status }, after: { status: next, note }, ipHash: ctx.ipHash });
        });
        return sendJson(res, 200, { ok: true });
      }

      params = routeMatch(pathname, '/api/campaigns/:id/apply');
      if (params && req.method === 'POST') {
        const user = requireUser(db, req, ['creator']);
        const campaign = db.prepare('SELECT * FROM campaigns WHERE id=?').get(params.id);
        if (!campaign || campaign.status !== 'active' || new Date(campaign.starts_at) > new Date() || new Date(campaign.ends_at) < new Date()) throw new HttpError(409, 'Campaign 当前不在开放申请时间内', 'invalid_state');
        const now = isoNow();
        db.prepare(`INSERT INTO campaign_participants (id,campaign_id,creator_user_id,status,created_at,updated_at) VALUES (?, ?, ?, 'pending_application', ?, ?)
          ON CONFLICT(campaign_id,creator_user_id) DO UPDATE SET status='pending_application',updated_at=excluded.updated_at`)
          .run(uid('participant'), campaign.id, user.id, now, now);
        notify(db, campaign.brand_user_id, 'campaign', '收到新的创作者申请', `${user.display_name} 申请参加 ${campaign.title}`, 'campaign', campaign.id);
        audit(db, { actorUserId: user.id, action: 'campaign.joined', subjectType: 'campaign', subjectId: campaign.id, ipHash: ctx.ipHash });
        return sendJson(res, 200, { status: 'pending_application' });
      }

      params = routeMatch(pathname, '/api/campaigns/:id/participants/:creatorId/review');
      if (params && req.method === 'POST') {
        const user = requireUser(db, req, ['brand']);
        const body = await readJson(req);
        const campaign = db.prepare('SELECT * FROM campaigns WHERE id=? AND brand_user_id=?').get(params.id, user.id);
        if (!campaign) throw new HttpError(404, 'Campaign 不存在', 'not_found');
        const participant = db.prepare('SELECT * FROM campaign_participants WHERE campaign_id=? AND creator_user_id=?').get(campaign.id, params.creatorId);
        if (!participant) throw new HttpError(404, '创作者申请不存在', 'not_found');
        if (participant.status !== 'pending_application') throw new HttpError(409, '该创作者当前不处于申请审核状态', 'invalid_state');
        const next = body.decision === 'approve' ? 'eligible' : body.decision === 'reject' ? 'rejected' : null;
        if (!next) throw new HttpError(400, '审核决定无效', 'validation_error');
        db.prepare('UPDATE campaign_participants SET status=?,updated_at=? WHERE id=?').run(next, isoNow(), participant.id);
        notify(db, participant.creator_user_id, 'campaign', next === 'eligible' ? 'Campaign 申请已通过' : 'Campaign 申请未通过', campaign.title, 'campaign', campaign.id);
        audit(db, { actorUserId: user.id, action: `campaign.participant_${next}`, subjectType: 'campaign_participant', subjectId: participant.id, after: { status: next }, ipHash: ctx.ipHash });
        return sendJson(res, 200, { status: next });
      }

      params = routeMatch(pathname, '/api/campaigns/:id/invites');
      if (params && req.method === 'POST') {
        const user = requireUser(db, req, ['brand']);
        const body = await readJson(req);
        const campaign = db.prepare('SELECT * FROM campaigns WHERE id=? AND brand_user_id=?').get(params.id, user.id);
        if (!campaign || campaign.status !== 'active' || new Date(campaign.starts_at) > new Date() || new Date(campaign.ends_at) < new Date()) throw new HttpError(409, 'Campaign 当前不能邀请创作者', 'invalid_state');
        const creator = db.prepare(`SELECT * FROM users WHERE id=? AND role='creator'`).get(String(body.creatorUserId || ''));
        if (!creator) throw new HttpError(404, '创作者不存在', 'not_found');
        const now = isoNow();
        transaction(db, () => {
          db.prepare(`INSERT INTO campaign_invites (id,campaign_id,creator_user_id,invited_by,status,created_at,updated_at) VALUES (?,?,?,?, 'pending',?,?)
            ON CONFLICT(campaign_id,creator_user_id) DO UPDATE SET status='pending',updated_at=excluded.updated_at`).run(uid('invite'), campaign.id, creator.id, user.id, now, now);
          db.prepare(`INSERT INTO campaign_participants (id,campaign_id,creator_user_id,status,created_at,updated_at) VALUES (?,?,?,'invited',?,?)
            ON CONFLICT(campaign_id,creator_user_id) DO UPDATE SET status='invited',updated_at=excluded.updated_at`).run(uid('participant'), campaign.id, creator.id, now, now);
          notify(db, creator.id, 'campaign', '收到品牌 Campaign 邀请', campaign.title, 'campaign', campaign.id);
          audit(db, { actorUserId: user.id, action: 'campaign.creator_invited', subjectType: 'campaign', subjectId: campaign.id, after: { creatorUserId: creator.id }, ipHash: ctx.ipHash });
        });
        return sendJson(res, 201, { status: 'invited' });
      }

      params = routeMatch(pathname, '/api/campaigns/:id/invite-response');
      if (params && req.method === 'POST') {
        const user = requireUser(db, req, ['creator']);
        const body = await readJson(req);
        const campaign = db.prepare('SELECT * FROM campaigns WHERE id=?').get(params.id);
        const invite = db.prepare(`SELECT * FROM campaign_invites WHERE campaign_id=? AND creator_user_id=? AND status='pending'`).get(params.id, user.id);
        if (!campaign || !invite) throw new HttpError(404, '待处理邀请不存在', 'not_found');
        if (campaign.status !== 'active' || new Date(campaign.ends_at) < new Date()) throw new HttpError(409, 'Campaign 已不再开放', 'invalid_state');
        const accepted = body.decision === 'accept';
        if (!accepted && body.decision !== 'reject') throw new HttpError(400, '邀请决定无效', 'validation_error');
        const next = accepted ? 'eligible' : 'rejected';
        const now = isoNow();
        transaction(db, () => {
          db.prepare('UPDATE campaign_invites SET status=?,updated_at=? WHERE id=?').run(accepted ? 'accepted' : 'rejected', now, invite.id);
          db.prepare('UPDATE campaign_participants SET status=?,updated_at=? WHERE campaign_id=? AND creator_user_id=?').run(next, now, campaign.id, user.id);
          notify(db, campaign.brand_user_id, 'campaign', accepted ? '创作者已接受 Campaign 邀请' : '创作者已拒绝 Campaign 邀请', `${user.display_name} · ${campaign.title}`, 'campaign', campaign.id);
          audit(db, { actorUserId: user.id, action: `campaign.invite_${accepted ? 'accepted' : 'rejected'}`, subjectType: 'campaign', subjectId: campaign.id, after: { status: next }, ipHash: ctx.ipHash });
        });
        return sendJson(res, 200, { status: next });
      }

      params = routeMatch(pathname, '/api/campaigns/:id/status');
      if (params && req.method === 'POST') {
        const user = requireUser(db, req, ['brand']);
        const body = await readJson(req);
        const campaign = db.prepare('SELECT * FROM campaigns WHERE id=? AND brand_user_id=?').get(params.id, user.id);
        if (!campaign) throw new HttpError(404, 'Campaign 不存在', 'not_found');
        const transitions = { active: ['paused', 'cancelled', 'completed'], paused: ['active', 'cancelled'], draft: ['cancelled'] };
        if (!transitions[campaign.status]?.includes(body.status)) throw new HttpError(409, 'Campaign 状态变更无效', 'invalid_state');
        const next = body.status;
        const now = isoNow();
        transaction(db, () => {
          db.prepare('UPDATE campaigns SET status=?,review_note=?,updated_at=? WHERE id=?').run(next, String(body.note || '').slice(0, 500), now, campaign.id);
          if (next === 'cancelled') db.prepare(`INSERT INTO campaign_budget_events (id,campaign_id,event_type,amount,actor_user_id,created_at) VALUES (?,?,'released',?,?,?)`).run(uid('budget'), campaign.id, -campaign.budget_ait, user.id, now);
          audit(db, { actorUserId: user.id, action: `campaign.${next}`, subjectType: 'campaign', subjectId: campaign.id, before: { status: campaign.status }, after: { status: next }, ipHash: ctx.ipHash });
        });
        return sendJson(res, 200, { status: next });
      }

      params = routeMatch(pathname, '/api/campaigns/:id/deliverables');
      if (params && req.method === 'POST') {
        const user = requireUser(db, req, ['creator']);
        const body = await readJson(req);
        const campaign = db.prepare('SELECT * FROM campaigns WHERE id=?').get(params.id);
        const participant = db.prepare(`SELECT * FROM campaign_participants WHERE campaign_id=? AND creator_user_id=? AND status='eligible'`).get(params.id, user.id);
        if (!campaign || campaign.status !== 'active' || new Date(campaign.starts_at) > new Date() || new Date(campaign.ends_at) < new Date() || !participant) throw new HttpError(403, '尚未获得该 Campaign 的交付资格或已不在交付时间内', 'not_eligible');
        const content = requireOwnedContent(db, String(body.contentId || ''), user);
        if (content.status !== 'published') throw new HttpError(409, '只有已发布并通过审核的内容可以提交', 'content_not_published');
        if (!db.prepare(`SELECT id FROM content_artifacts WHERE content_id=? AND version=? AND status='ready'`).get(content.id, content.current_version)) throw new HttpError(409, '当前内容成品构建未通过，不能提交交付', 'artifact_not_ready');
        const allowed = safeJson(campaign.brief_json).contentTypes || [];
        if (!allowed.includes(content.content_type)) throw new HttpError(409, '内容类型不符合 Campaign 要求', 'content_type_mismatch');
        const id = uid('delivery');
        const now = isoNow();
        db.prepare(`INSERT INTO campaign_deliverables (id,campaign_id,creator_user_id,content_id,status,submission_note,submitted_at,updated_at) VALUES (?,?,?,?,'submitted',?,?,?)`)
          .run(id, campaign.id, user.id, content.id, clampText(body.note, 800, '交付说明'), now, now);
        audit(db, { actorUserId: user.id, action: 'campaign.deliverable_submitted', subjectType: 'deliverable', subjectId: id, after: { campaignId: campaign.id, contentId: content.id }, ipHash: ctx.ipHash });
        notify(db, campaign.brand_user_id, 'deliverable', '收到新的 Campaign 交付', `${user.display_name} 已提交 ${content.title}`, 'deliverable', id);
        return sendJson(res, 201, { id, status: 'submitted' });
      }

      params = routeMatch(pathname, '/api/deliverables/:id/resubmit');
      if (params && req.method === 'POST') {
        const user = requireUser(db, req, ['creator']);
        const body = await readJson(req);
        const delivery = db.prepare(`SELECT d.*,c.brand_user_id,c.status campaign_status,c.ends_at,c.brief_json FROM campaign_deliverables d JOIN campaigns c ON c.id=d.campaign_id WHERE d.id=? AND d.creator_user_id=?`).get(params.id, user.id);
        if (!delivery) throw new HttpError(404, '交付不存在', 'not_found');
        if (delivery.status !== 'changes_requested' || delivery.campaign_status !== 'active' || new Date(delivery.ends_at) < new Date()) throw new HttpError(409, '当前交付不能重新提交', 'invalid_state');
        const content = requireOwnedContent(db, String(body.contentId || delivery.content_id), user);
        if (content.status !== 'published') throw new HttpError(409, '只有已发布内容可以重新提交', 'content_not_published');
        if (!db.prepare(`SELECT id FROM content_artifacts WHERE content_id=? AND version=? AND status='ready'`).get(content.id, content.current_version)) throw new HttpError(409, '当前内容成品构建未通过，不能重新提交', 'artifact_not_ready');
        if (!(safeJson(delivery.brief_json).contentTypes || []).includes(content.content_type)) throw new HttpError(409, '内容类型不符合 Campaign 要求', 'content_type_mismatch');
        const now = isoNow();
        db.prepare(`UPDATE campaign_deliverables SET content_id=?,status='submitted',submission_note=?,review_note=NULL,submitted_at=?,reviewed_at=NULL,updated_at=? WHERE id=?`)
          .run(content.id, clampText(body.note, 800, '交付说明'), now, now, delivery.id);
        notify(db, delivery.brand_user_id, 'deliverable', '交付已重新提交', content.title, 'deliverable', delivery.id);
        audit(db, { actorUserId: user.id, action: 'deliverable.resubmitted', subjectType: 'deliverable', subjectId: delivery.id, after: { contentId: content.id }, ipHash: ctx.ipHash });
        return sendJson(res, 200, { status: 'submitted' });
      }

      params = routeMatch(pathname, '/api/deliverables/:id/review');
      if (params && req.method === 'POST') {
        const user = requireUser(db, req, ['brand']);
        const body = await readJson(req);
        const delivery = db.prepare(`SELECT d.*,c.brand_user_id,c.reward_ait,c.budget_ait FROM campaign_deliverables d JOIN campaigns c ON c.id=d.campaign_id WHERE d.id=?`).get(params.id);
        if (!delivery || delivery.brand_user_id !== user.id) throw new HttpError(404, '交付不存在', 'not_found');
        if (delivery.status !== 'submitted') throw new HttpError(409, '只有已提交的交付可以审核；需要修改的交付须由创作者重新提交', 'invalid_state');
        const decisions = { approve: 'approved', changes: 'changes_requested', reject: 'rejected' };
        const next = decisions[body.decision];
        if (!next) throw new HttpError(400, '审核决定无效', 'validation_error');
        const note = next === 'approved' ? String(body.note || '').slice(0, 800) : clampText(body.note, 800, '审核意见');
        const now = isoNow();
        transaction(db, () => {
          if (next === 'approved') {
            const reserved = Number(db.prepare(`SELECT COALESCE(SUM(amount),0) n FROM settlements WHERE campaign_id=? AND status IN ('approved','payment_pending','platform_approved','issued')`).get(delivery.campaign_id)?.n || 0);
            if (reserved + delivery.reward_ait > delivery.budget_ait) throw new HttpError(409, 'Campaign AIT 预算不足', 'budget_exceeded');
          }
          db.prepare('UPDATE campaign_deliverables SET status=?,review_note=?,reviewed_at=?,updated_at=? WHERE id=?').run(next, note, now, now, delivery.id);
          if (next === 'approved') {
            db.prepare(`INSERT INTO settlements (id,campaign_id,deliverable_id,user_id,currency,amount,status,approved_at,created_at,updated_at) VALUES (?,?,?,?, 'AIT',?,'approved',?,?,?)`)
              .run(uid('settlement'), delivery.campaign_id, delivery.id, delivery.creator_user_id, delivery.reward_ait, now, now, now);
          }
          notify(db, delivery.creator_user_id, 'deliverable', next === 'approved' ? '交付已获品牌批准' : next === 'changes_requested' ? '交付需要修改' : '交付未通过', note || '请查看 Campaign 交付状态', 'deliverable', delivery.id);
          audit(db, { actorUserId: user.id, action: `deliverable.${next}`, subjectType: 'deliverable', subjectId: delivery.id, before: { status: delivery.status }, after: { status: next, note }, ipHash: ctx.ipHash });
        });
        return sendJson(res, 200, { status: next });
      }

      params = routeMatch(pathname, '/api/settlements/:id/mark-pending');
      if (params && req.method === 'POST') {
        const user = requireUser(db, req, ['brand']);
        const settlement = db.prepare(`SELECT s.*,c.brand_user_id FROM settlements s JOIN campaigns c ON c.id=s.campaign_id WHERE s.id=?`).get(params.id);
        if (!settlement || settlement.brand_user_id !== user.id) throw new HttpError(404, '结算记录不存在', 'not_found');
        if (settlement.status !== 'approved') throw new HttpError(409, '只有已批准结算可进入待发放', 'invalid_state');
        const now = isoNow();
        transaction(db, () => {
          db.prepare(`INSERT INTO settlement_approvals (id,settlement_id,approver_user_id,decision,note,created_at) VALUES (?,?,?,'brand_confirmed','品牌确认交付并提交平台复核',?)`).run(uid('settlement_approval'), settlement.id, user.id, now);
          db.prepare(`UPDATE settlements SET status='payment_pending',updated_at=? WHERE id=?`).run(now, settlement.id);
          notify(db, settlement.user_id, 'settlement', 'AIT 结算进入平台复核', '品牌已确认交付，平台复核后发放。', 'settlement', settlement.id);
          audit(db, { actorUserId: user.id, action: 'settlement.payment_pending', subjectType: 'settlement', subjectId: settlement.id, ipHash: ctx.ipHash });
        });
        return sendJson(res, 200, { status: 'payment_pending' });
      }

      params = routeMatch(pathname, '/api/settlements/:id/platform-approve');
      if (params && req.method === 'POST') {
        const user = requireUser(db, req, ['admin']);
        const body = await readJson(req);
        const settlement = db.prepare(`SELECT s.*,c.title campaign_title FROM settlements s JOIN campaigns c ON c.id=s.campaign_id WHERE s.id=?`).get(params.id);
        if (!settlement) throw new HttpError(404, '结算记录不存在', 'not_found');
        if (settlement.status !== 'payment_pending') throw new HttpError(409, '结算当前不处于平台复核状态', 'invalid_state');
        const decision = body.decision === 'approve' ? 'approved' : body.decision === 'reject' ? 'rejected' : null;
        if (!decision) throw new HttpError(400, '复核决定无效', 'validation_error');
        const note = decision === 'rejected' ? clampText(body.note, 500, '拒绝原因') : String(body.note || '').slice(0, 500);
        const next = decision === 'approved' ? 'platform_approved' : 'rejected';
        const now = isoNow();
        transaction(db, () => {
          db.prepare(`INSERT INTO settlement_approvals (id,settlement_id,approver_user_id,decision,note,created_at) VALUES (?,?,?,?,?,?)`).run(uid('settlement_approval'), settlement.id, user.id, decision, note, now);
          db.prepare('UPDATE settlements SET status=?,updated_at=? WHERE id=?').run(next, now, settlement.id);
          notify(db, settlement.user_id, 'settlement', next === 'platform_approved' ? 'AIT 结算已通过平台复核' : 'AIT 结算未通过平台复核', note || settlement.campaign_title, 'settlement', settlement.id);
          audit(db, { actorUserId: user.id, action: `settlement.platform_${decision}`, subjectType: 'settlement', subjectId: settlement.id, after: { status: next, note }, ipHash: ctx.ipHash });
        });
        return sendJson(res, 200, { status: next });
      }

      params = routeMatch(pathname, '/api/settlements/:id/issue');
      if (params && req.method === 'POST') {
        throw new HttpError(410, '旧 AIT 发放入口已下线；请创建获批 Contract 下的 AIT 权益记录', 'legacy_ait_issue_retired');
      }

      params = routeMatch(pathname, '/api/organizations/:id/review');
      if (params && req.method === 'POST') {
        const user = requireUser(db, req, ['admin']);
        const body = await readJson(req);
        const org = db.prepare('SELECT * FROM organizations WHERE id=?').get(params.id);
        if (!org) throw new HttpError(404, '组织不存在', 'not_found');
        const next = body.decision === 'approve' ? 'verified' : body.decision === 'reject' ? 'rejected' : null;
        if (!next) throw new HttpError(400, '审核决定无效', 'validation_error');
        const note = next === 'rejected' ? clampText(body.note, 500, '拒绝原因') : String(body.note || '').slice(0, 500);
        db.prepare('UPDATE organizations SET verification_status=?,verification_note=?,updated_at=? WHERE id=?').run(next, note, isoNow(), org.id);
        notify(db, org.owner_user_id, 'organization', next === 'verified' ? '品牌组织已通过验证' : '品牌组织验证未通过', note || org.name, 'organization', org.id);
        audit(db, { actorUserId: user.id, action: `organization.${next}`, subjectType: 'organization', subjectId: org.id, after: { status: next, note }, ipHash: ctx.ipHash });
        return sendJson(res, 200, { status: next });
      }

      if (pathname === '/api/creators' && req.method === 'GET') {
        requireUser(db, req, ['brand', 'admin']);
        const query = String(url.searchParams.get('q') || '').trim();
        const rows = query ? db.prepare(`SELECT id,display_name,wallet_address,created_at FROM users WHERE role='creator' AND display_name LIKE ? ORDER BY created_at DESC LIMIT 30`).all(`%${query}%`) : db.prepare(`SELECT id,display_name,wallet_address,created_at FROM users WHERE role='creator' ORDER BY created_at DESC LIMIT 30`).all();
        return sendJson(res, 200, { creators: rows.map(row => ({ id: row.id, displayName: row.display_name, walletAddress: row.wallet_address, createdAt: row.created_at })) });
      }

      params = routeMatch(pathname, '/api/notifications/:id/read');
      if (params && req.method === 'POST') {
        const user = requireUser(db, req);
        const result = db.prepare('UPDATE notifications SET read_at=? WHERE id=? AND user_id=?').run(isoNow(), params.id, user.id);
        if (!result.changes) throw new HttpError(404, '通知不存在', 'not_found');
        return sendJson(res, 200, { ok: true });
      }

      if (pathname === '/api/notifications/read-all' && req.method === 'POST') {
        const user = requireUser(db, req);
        const result = db.prepare('UPDATE notifications SET read_at=? WHERE user_id=? AND read_at IS NULL').run(isoNow(), user.id);
        return sendJson(res, 200, { ok: true, updated: Number(result.changes || 0) });
      }

      if (pathname === '/api/profile' && req.method === 'PATCH') {
        const user = requireUser(db, req);
        const body = await readJson(req);
        const displayName = body.displayName == null ? user.display_name : clampText(body.displayName, 60, '显示名称');
        db.prepare('UPDATE users SET display_name=?,updated_at=? WHERE id=?').run(displayName, isoNow(), user.id);
        audit(db, { actorUserId: user.id, action: 'profile.updated', subjectType: 'user', subjectId: user.id, after: { displayName }, ipHash: ctx.ipHash });
        return sendJson(res, 200, { me: publicUser(db.prepare('SELECT * FROM users WHERE id=?').get(user.id)) });
      }

      if (pathname === '/api/account/sessions' && req.method === 'GET') {
        const user = requireUser(db, req);
        const sessions = db.prepare('SELECT token_hash,expires_at,created_at FROM sessions WHERE user_id=? ORDER BY created_at DESC').all(user.id).map(row => ({ id: row.token_hash.slice(0, 16), expiresAt: row.expires_at, createdAt: row.created_at }));
        return sendJson(res, 200, { sessions });
      }

      params = routeMatch(pathname, '/api/account/sessions/:id/revoke');
      if (params && req.method === 'POST') {
        const user = requireUser(db, req);
        const result = db.prepare('DELETE FROM sessions WHERE user_id=? AND token_hash LIKE ?').run(user.id, `${params.id}%`);
        if (!result.changes) throw new HttpError(404, '登录会话不存在', 'not_found');
        audit(db, { actorUserId: user.id, action: 'account.session_revoked', subjectType: 'user', subjectId: user.id, after: { sessionPrefix: params.id }, ipHash: ctx.ipHash });
        return sendJson(res, 200, { ok: true });
      }

      if (pathname === '/api/account/export' && req.method === 'GET') {
        const user = requireUser(db, req);
        const exportData = {
          exportedAt: isoNow(), user: publicEconomyUser(db, user), points: pointSummary(db, user.id), economy: economySnapshot(db, user),
          agents: db.prepare('SELECT * FROM agents WHERE owner_user_id=?').all(user.id).map(mapAgent),
          contents: db.prepare('SELECT * FROM contents WHERE owner_user_id=?').all(user.id).map(mapContent),
          tasks: db.prepare('SELECT * FROM agent_tasks WHERE owner_user_id=?').all(user.id).map(mapTask),
          ledger: db.prepare('SELECT * FROM point_events WHERE user_id=? ORDER BY created_at').all(user.id),
          ledgerBatches: db.prepare('SELECT * FROM ledger_batches WHERE user_id=? ORDER BY earned_at').all(user.id),
          subscriptions: db.prepare('SELECT * FROM subscriptions WHERE user_id=? ORDER BY created_at').all(user.id),
          economyUsage: db.prepare('SELECT * FROM economy_usage_events WHERE user_id=? ORDER BY created_at').all(user.id),
          aitEntitlements: db.prepare('SELECT * FROM ait_entitlements WHERE user_id=? ORDER BY created_at').all(user.id),
          benefitClaims: db.prepare('SELECT * FROM benefit_claims WHERE user_id=? ORDER BY created_at').all(user.id),
          paymentSettlements: db.prepare('SELECT * FROM payment_settlements WHERE user_id=? ORDER BY created_at').all(user.id),
          ledgerAppeals: db.prepare('SELECT * FROM ledger_appeals WHERE user_id=? ORDER BY created_at').all(user.id),
          notifications: db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at').all(user.id),
        };
        return sendJson(res, 200, exportData, { 'Content-Disposition': `attachment; filename="airvana-export-${user.id}.json"` });
      }

      if (pathname === '/api/account/deletion-request' && req.method === 'POST') {
        const user = requireUser(db, req);
        const body = await readJson(req);
        const existing = db.prepare(`SELECT * FROM account_deletion_requests WHERE user_id=? AND status='pending' ORDER BY requested_at DESC LIMIT 1`).get(user.id);
        if (existing) return sendJson(res, 200, { id: existing.id, status: 'pending', scheduledFor: existing.scheduled_for, idempotent: true });
        const now = isoNow();
        const scheduled = plusDays(30);
        const id = uid('delete_request');
        db.prepare(`INSERT INTO account_deletion_requests (id,user_id,status,reason,requested_at,scheduled_for) VALUES (?,?,'pending',?,?,?)`).run(id, user.id, String(body.reason || '').slice(0, 500), now, scheduled);
        notify(db, user.id, 'account', '账户删除申请已提交', `计划删除时间：${scheduled}`, 'user', user.id);
        audit(db, { actorUserId: user.id, action: 'account.deletion_requested', subjectType: 'user', subjectId: user.id, after: { requestId: id, scheduledFor: scheduled }, ipHash: ctx.ipHash });
        return sendJson(res, 202, { id, status: 'pending', scheduledFor: scheduled, idempotent: false });
      }

      params = routeMatch(pathname, '/api/account/deletion-request/:id/cancel');
      if (params && req.method === 'POST') {
        const user = requireUser(db, req);
        const request = db.prepare(`SELECT * FROM account_deletion_requests WHERE id=? AND user_id=?`).get(params.id, user.id);
        if (!request) throw new HttpError(404, '账户删除申请不存在', 'not_found');
        if (request.status !== 'pending') return sendJson(res, 200, { status: request.status, idempotent: true });
        const now = isoNow();
        db.prepare(`UPDATE account_deletion_requests SET status='cancelled',cancelled_at=? WHERE id=?`).run(now, request.id);
        notify(db, user.id, 'account', '账户删除申请已取消', '账户将继续正常保留。', 'user', user.id);
        audit(db, { actorUserId: user.id, action: 'account.deletion_cancelled', subjectType: 'user', subjectId: user.id, after: { requestId: request.id }, ipHash: ctx.ipHash });
        return sendJson(res, 200, { status: 'cancelled', idempotent: false });
      }

      if (pathname === '/api/terms/accept' && req.method === 'POST') {
        const user = requireUser(db, req);
        const body = await readJson(req);
        const type = ['terms', 'privacy', 'campaign_rules'].includes(body.documentType) ? body.documentType : null;
        if (!type) throw new HttpError(400, '协议类型无效', 'validation_error');
        const version = clampText(body.documentVersion, 40, '协议版本');
        db.prepare(`INSERT OR IGNORE INTO terms_acceptances (id,user_id,document_type,document_version,accepted_at) VALUES (?,?,?,?,?)`).run(uid('acceptance'), user.id, type, version, isoNow());
        return sendJson(res, 200, { accepted: true, documentType: type, documentVersion: version });
      }

      if (pathname === '/api/content-reports' && req.method === 'POST') {
        const user = requireUser(db, req);
        const body = await readJson(req);
        const content = db.prepare('SELECT * FROM contents WHERE id=?').get(String(body.contentId || ''));
        if (!content || content.status !== 'published') throw new HttpError(404, '公开内容不存在', 'not_found');
        if (content.owner_user_id === user.id) throw new HttpError(409, '不能举报自己的内容', 'invalid_state');
        const reason = ['unsafe', 'copyright', 'spam', 'misleading', 'privacy', 'other'].includes(body.reason) ? body.reason : 'other';
        const id = uid('report');
        const now = isoNow();
        try {
          db.prepare(`INSERT INTO content_reports (id,reporter_user_id,content_id,reason,details,status,created_at,updated_at) VALUES (?,?,?,?,?,'open',?,?)`).run(id, user.id, content.id, reason, String(body.details || '').slice(0, 1200), now, now);
        } catch (error) {
          if (String(error.message).includes('UNIQUE')) return sendJson(res, 200, { status: 'already_reported' });
          throw error;
        }
        createRiskCase(db, { userId: content.owner_user_id, subjectType: 'content', subjectId: content.id, riskType: `user_report_${reason}`, score: 45, evidence: { reportId: id } });
        return sendJson(res, 201, { id, status: 'open' });
      }

      if (pathname === '/api/content-appeals' && req.method === 'POST') {
        const user = requireUser(db, req, ['creator']);
        const body = await readJson(req);
        const content = requireOwnedContent(db, String(body.contentId || ''), user);
        if (content.status !== 'archived') throw new HttpError(409, '只有已下架内容可以申诉', 'invalid_state');
        const takedown = db.prepare(`SELECT id FROM content_reports WHERE content_id=? AND status='resolved' AND resolution_action='takedown' ORDER BY updated_at DESC LIMIT 1`).get(content.id);
        if (!takedown) throw new HttpError(409, '该内容没有可申诉的平台下架记录', 'not_appealable');
        const existing = db.prepare(`SELECT id FROM content_appeals WHERE content_id=? AND appellant_user_id=? AND status='open'`).get(content.id, user.id);
        if (existing) return sendJson(res, 200, { id: existing.id, status: 'open', idempotent: true });
        const id = uid('appeal');
        const now = isoNow();
        transaction(db, () => {
          db.prepare(`INSERT INTO content_appeals (id,content_id,appellant_user_id,reason,status,created_at,updated_at) VALUES (?,?,?,?,'open',?,?)`)
            .run(id, content.id, user.id, clampText(body.reason, 1200, '申诉说明'), now, now);
          for (const admin of db.prepare(`SELECT id FROM users WHERE role='admin'`).all()) notify(db, admin.id, 'trust', '收到内容下架申诉', `${user.display_name} · ${content.title}`, 'content_appeal', id);
          audit(db, { actorUserId: user.id, action: 'content_appeal.submitted', subjectType: 'content_appeal', subjectId: id, after: { contentId: content.id }, ipHash: ctx.ipHash });
        });
        return sendJson(res, 201, { id, status: 'open', idempotent: false });
      }

      params = routeMatch(pathname, '/api/admin/content-reports/:id/resolve');
      if (params && req.method === 'POST') {
        const user = requireUser(db, req, ['admin']);
        const body = await readJson(req);
        const report = db.prepare(`SELECT r.*,c.owner_user_id,c.title content_title FROM content_reports r JOIN contents c ON c.id=r.content_id WHERE r.id=?`).get(params.id);
        if (!report) throw new HttpError(404, '举报不存在', 'not_found');
        const action = ['dismiss', 'takedown'].includes(body.action) ? body.action : null;
        if (!action) throw new HttpError(400, '处理动作无效', 'validation_error');
        const now = isoNow();
        transaction(db, () => {
          db.prepare(`UPDATE content_reports SET status='resolved',resolution_action=?,resolution_note=?,resolved_by=?,updated_at=? WHERE id=?`).run(action, String(body.note || '').slice(0, 500), user.id, now, report.id);
          if (action === 'takedown') db.prepare(`UPDATE contents SET status='archived',archived_at=?,updated_at=? WHERE id=?`).run(now, now, report.content_id);
          notify(db, report.reporter_user_id, 'trust', '内容举报已处理', action === 'takedown' ? '平台已下架相关内容。' : '平台复核后未执行下架。', 'content_report', report.id);
          notify(db, report.owner_user_id, 'trust', action === 'takedown' ? '内容已被平台下架' : '内容举报复核已完成', action === 'takedown' ? `${report.content_title} 已下架。处理说明：${String(body.note || '').slice(0, 300)}` : `${report.content_title} 的举报复核已完成，平台未执行下架。`, 'content', report.content_id);
          audit(db, { actorUserId: user.id, action: `content_report.${action}`, subjectType: 'content_report', subjectId: report.id, after: { action, note: body.note || '' }, ipHash: ctx.ipHash });
        });
        return sendJson(res, 200, { status: 'resolved', action });
      }

      params = routeMatch(pathname, '/api/admin/content-appeals/:id/resolve');
      if (params && req.method === 'POST') {
        const user = requireUser(db, req, ['admin']);
        const body = await readJson(req);
        const appeal = db.prepare(`SELECT a.*,c.title content_title FROM content_appeals a JOIN contents c ON c.id=a.content_id WHERE a.id=?`).get(params.id);
        if (!appeal) throw new HttpError(404, '内容申诉不存在', 'not_found');
        if (appeal.status !== 'open') throw new HttpError(409, '该内容申诉已经处理', 'invalid_state');
        const next = body.decision === 'restore' ? 'restored' : body.decision === 'uphold' ? 'upheld' : null;
        if (!next) throw new HttpError(400, '申诉处理决定无效', 'validation_error');
        const note = clampText(body.note, 800, '复核说明');
        const now = isoNow();
        transaction(db, () => {
          db.prepare(`UPDATE content_appeals SET status=?,resolution_note=?,resolved_by=?,updated_at=? WHERE id=?`).run(next, note, user.id, now, appeal.id);
          if (next === 'restored') db.prepare(`UPDATE contents SET status='draft',archived_at=NULL,updated_at=? WHERE id=?`).run(now, appeal.content_id);
          notify(db, appeal.appellant_user_id, 'trust', next === 'restored' ? '内容申诉已通过' : '内容申诉未通过', next === 'restored' ? `${appeal.content_title} 已恢复为草稿，请确认后重新发布。${note}` : `${appeal.content_title} 维持下架。${note}`, 'content_appeal', appeal.id);
          audit(db, { actorUserId: user.id, action: `content_appeal.${next}`, subjectType: 'content_appeal', subjectId: appeal.id, after: { decision: next, note }, ipHash: ctx.ipHash });
        });
        return sendJson(res, 200, { status: next, contentStatus: next === 'restored' ? 'draft' : 'archived' });
      }

      params = routeMatch(pathname, '/api/admin/risk-cases/:id/resolve');
      if (params && req.method === 'POST') {
        const user = requireUser(db, req, ['admin']);
        const body = await readJson(req);
        const risk = db.prepare('SELECT * FROM risk_cases WHERE id=?').get(params.id);
        if (!risk) throw new HttpError(404, '风险案件不存在', 'not_found');
        const next = body.decision === 'confirm' ? 'confirmed' : body.decision === 'dismiss' ? 'dismissed' : null;
        if (!next) throw new HttpError(400, '处理决定无效', 'validation_error');
        db.prepare('UPDATE risk_cases SET status=?,resolution_note=?,resolved_by=?,updated_at=? WHERE id=?').run(next, String(body.note || '').slice(0, 500), user.id, isoNow(), risk.id);
        audit(db, { actorUserId: user.id, action: `risk.${next}`, subjectType: 'risk_case', subjectId: risk.id, after: { note: body.note || '' }, ipHash: ctx.ipHash });
        return sendJson(res, 200, { status: next });
      }

      params = routeMatch(pathname, '/api/admin/ait-withdrawals/:id/review');
      if (params && req.method === 'POST') {
        throw new HttpError(410, 'AIT 通用提现审核已下线', 'ait_withdrawal_retired');
      }

      params = routeMatch(pathname, '/api/admin/ait-withdrawals/:id/complete');
      if (params && req.method === 'POST') {
        throw new HttpError(410, 'AIT 通用提现完成入口已下线', 'ait_withdrawal_retired');
      }

      if (pathname === '/api/admin/points/adjust' && req.method === 'POST') {
        const user = requireUser(db, req, ['admin']);
        const body = await readJson(req);
        const target = db.prepare('SELECT * FROM users WHERE id=?').get(String(body.userId || ''));
        if (!target) throw new HttpError(404, '用户不存在', 'not_found');
        if (body.currency === 'AIT') throw new HttpError(410, 'AIT 不能通过通用积分调整；必须来自获批 Campaign Contract', 'ait_adjustment_retired');
        const currency = 'AIP';
        const amount = asInt(body.amount, -1_000_000, 1_000_000, '调整数量');
        if (amount === 0) throw new HttpError(400, '调整数量不能为 0', 'validation_error');
        const reason = clampText(body.reason, 500, '调整原因');
        const adjustmentId = uid('adjustment');
        const eventKey = `admin-adjustment:${adjustmentId}`;
        if (amount > 0) grantAip(db, { userId: target.id, amount, sourceType: 'admin_compensation', eventKey, subjectType: 'user', subjectId: target.id, expiryDays: body.permanent === true ? null : 365, reasonCode: 'manual_compensation', metadata: { reason, actorUserId: user.id } });
        else consumeAip(db, { userId: target.id, amount: Math.abs(amount), usageType: 'admin_correction', eventKey, subjectType: 'user', subjectId: target.id, metadata: { reason, actorUserId: user.id } });
        const pointEvent = db.prepare('SELECT * FROM point_events WHERE user_id=? AND event_key=?').get(target.id, eventKey);
        notify(db, target.id, 'points', `${currency} 账本已调整`, `${amount > 0 ? '+' : ''}${amount} ${currency}：${reason}`, 'point_event', pointEvent.id);
        audit(db, { actorUserId: user.id, action: 'points.adjusted', subjectType: 'user', subjectId: target.id, after: { currency, amount, reason, pointEventId: pointEvent.id }, ipHash: ctx.ipHash });
        return sendJson(res, 201, { id: pointEvent.id, adjustmentId, batchId: pointEvent.batch_id || null, balance: pointSummary(db, target.id) });
      }

      params = routeMatch(pathname, '/api/admin/point-events/:id/status');
      if (params && req.method === 'POST') {
        const user = requireUser(db, req, ['admin']);
        const body = await readJson(req);
        const event = db.prepare('SELECT * FROM point_events WHERE id=?').get(params.id);
        if (!event) throw new HttpError(404, '账本事件不存在', 'not_found');
        if (event.amount < 0) throw new HttpError(409, '消费事件不能单独冻结或撤销', 'protected_debit');
        const next = ['posted', 'frozen', 'revoked'].includes(body.status) ? body.status : null;
        const transitions = { posted: ['frozen', 'revoked'], frozen: ['posted', 'revoked'], revoked: [] };
        if (!next || !transitions[event.status]?.includes(next)) throw new HttpError(409, '账本状态变更无效', 'invalid_state');
        const reason = clampText(body.reason, 500, '处理原因');
        const metadata = safeJson(event.metadata_json);
        const now = isoNow();
        metadata.governance = [...(Array.isArray(metadata.governance) ? metadata.governance : []), { from: event.status, to: next, reason, actorUserId: user.id, at: now }];
        db.prepare('UPDATE point_events SET status=?,metadata_json=?,frozen_at=?,reversed_at=?,reason_code=? WHERE id=?')
          .run(next, jsonString(metadata), next === 'frozen' ? now : null, next === 'revoked' ? now : null, reason, event.id);
        if (event.batch_id) {
          const batchStatus = next === 'posted' ? 'available' : next === 'frozen' ? 'frozen' : 'reversed';
          db.prepare(`UPDATE ledger_batches SET status=?,frozen_at=?,reversed_at=?,remaining_amount=?,reason_code=? WHERE id=?`)
            .run(batchStatus, next === 'frozen' ? now : null, next === 'revoked' ? now : null, next === 'revoked' ? 0 : Math.max(0, Number(event.amount)), reason, event.batch_id);
        }
        notify(db, event.user_id, 'points', `${event.currency} 账本状态已更新`, `${event.amount} ${event.currency}：${event.status} → ${next}。${reason}`, 'point_event', event.id);
        audit(db, { actorUserId: user.id, action: `point_event.${next}`, subjectType: 'point_event', subjectId: event.id, before: { status: event.status }, after: { status: next, reason }, ipHash: ctx.ipHash });
        return sendJson(res, 200, { id: event.id, status: next, balance: pointSummary(db, event.user_id) });
      }

      if (pathname === '/api/discover' && req.method === 'GET') {
        const user = requireUser(db, req);
        const query = String(url.searchParams.get('q') || '').trim();
        const type = String(url.searchParams.get('type') || '');
        const clauses = [`c.status='published'`, `c.owner_user_id<>?`];
        const values = [user.id];
        if (query) { clauses.push('(c.title LIKE ? OR u.display_name LIKE ?)'); values.push(`%${query}%`, `%${query}%`); }
        if (CONTENT_TYPES.has(type)) { clauses.push('c.content_type=?'); values.push(type); }
        const rows = db.prepare(`SELECT c.*,u.display_name author_name,MAX(b.expires_at) boost_expires_at FROM contents c JOIN users u ON u.id=c.owner_user_id LEFT JOIN content_boosts b ON b.content_id=c.id AND b.status='active' AND b.expires_at>? WHERE ${clauses.join(' AND ')} GROUP BY c.id ORDER BY boost_expires_at IS NOT NULL DESC,c.published_at DESC LIMIT 60`).all(isoNow(), ...values);
        return sendJson(res, 200, { results: rows.map(row => ({ ...mapContent(row), authorName: row.author_name, boostedUntil: row.boost_expires_at, publicUrl: `/content/${row.id}` })) });
      }

      params = routeMatch(pathname, '/api/contents/:id/boost');
      if (params && req.method === 'POST') {
        const user = requireUser(db, req, ['creator']);
        const content = requireOwnedContent(db, params.id, user);
        if (content.status !== 'published') throw new HttpError(409, '只有已发布内容可以推广', 'content_not_published');
        const costAip = 20;
        const now = isoNow();
        const existing = db.prepare(`SELECT * FROM content_boosts WHERE content_id=? AND status='active' AND expires_at>? LIMIT 1`).get(content.id, now);
        if (existing) return sendJson(res, 200, { id: existing.id, status: 'active', expiresAt: existing.expires_at, idempotent: true, balance: pointSummary(db, user.id) });
        if (pointSummary(db, user.id).AIP < costAip) throw new HttpError(409, `AIP 不足，需要 ${costAip} AIP`, 'insufficient_aip');
        const id = uid('boost');
        const expiresAt = new Date(Date.now() + 86_400_000).toISOString();
        transaction(db, () => {
          db.prepare(`INSERT INTO content_boosts (id,user_id,content_id,cost_aip,status,starts_at,expires_at,created_at) VALUES (?,?,?,?,'active',?,?,?)`).run(id, user.id, content.id, costAip, now, expiresAt, now);
          consumeAip(db, { userId: user.id, amount: costAip, usageType: 'content_boost', eventKey: `boost:${id}`, subjectType: 'content', subjectId: content.id, metadata: { boostId: id, expiresAt, utility: 'discover_ranking_24h' } });
          audit(db, { actorUserId: user.id, action: 'content.boosted', subjectType: 'content', subjectId: content.id, after: { costAip, expiresAt }, ipHash: ctx.ipHash });
        });
        return sendJson(res, 201, { id, status: 'active', expiresAt, idempotent: false, balance: pointSummary(db, user.id) });
      }

      params = routeMatch(pathname, '/api/contents/:id/versions');
      if (params && req.method === 'GET') {
        const user = requireUser(db, req, ['creator']);
        const content = requireOwnedContent(db, params.id, user);
        const versions = db.prepare('SELECT * FROM content_versions WHERE content_id=? ORDER BY version DESC').all(content.id).map(row => ({
          id: row.id, version: row.version, title: row.title, payload: safeJson(row.payload_json), sourceTaskId: row.source_task_id, createdAt: row.created_at,
        }));
        return sendJson(res, 200, { versions });
      }

      params = routeMatch(pathname, '/api/contents/:id');
      if (params && req.method === 'PATCH') {
        const user = requireUser(db, req, ['creator']);
        const content = requireOwnedContent(db, params.id, user);
        if (!['draft', 'rejected'].includes(content.status)) throw new HttpError(409, '只有草稿或被拒绝内容可以编辑', 'invalid_state');
        const body = await readJson(req);
        const nextTitle = body.title == null ? content.title : clampText(body.title, 80, '内容标题');
        const nextPayload = body.payload && typeof body.payload === 'object' ? body.payload : safeJson(content.payload_json);
        if (nextPayload.ctaUrl) {
          let parsed;
          try { parsed = new URL(String(nextPayload.ctaUrl)); } catch { throw new HttpError(400, 'CTA 链接格式无效', 'validation_error'); }
          if (!['http:', 'https:'].includes(parsed.protocol)) throw new HttpError(400, 'CTA 链接仅支持 HTTPS 或 HTTP', 'validation_error');
        }
        const moderation = await ai.moderate({ title: nextTitle, payload: nextPayload });
        const now = isoNow();
        transaction(db, () => {
          if (!moderation.passed) {
            db.prepare(`UPDATE contents SET title=?,payload_json=?,status='rejected',moderation_status='blocked',moderation_json=?,updated_at=? WHERE id=?`)
              .run(nextTitle, jsonString(nextPayload), jsonString(moderation), now, content.id);
            createRiskCase(db, { userId: user.id, subjectType: 'content', subjectId: content.id, riskType: 'edited_content_blocked', score: 70, evidence: moderation });
          } else {
            const version = Number(content.current_version) + 1;
            db.prepare(`INSERT INTO content_versions (id,content_id,version,title,payload_json,created_by,created_at) VALUES (?,?,?,?,?,?,?)`)
              .run(uid('ver'), content.id, version, nextTitle, jsonString(nextPayload), user.id, now);
            const artifact = saveArtifact(db, { content: { ...content, title: nextTitle, current_version: version }, payload: nextPayload, version });
            if (!artifact.validation.passed) throw new HttpError(409, '结构化内容未通过成品构建校验，请检查章节、互动、素材和安全说明', 'artifact_validation_failed');
            db.prepare(`UPDATE contents SET title=?,payload_json=?,status='draft',moderation_status='passed',moderation_json=?,current_version=?,updated_at=? WHERE id=?`)
              .run(nextTitle, jsonString(nextPayload), jsonString(moderation), version, now, content.id);
          }
          audit(db, { actorUserId: user.id, action: 'content.edited', subjectType: 'content', subjectId: content.id, after: { title: nextTitle, moderationPassed: moderation.passed }, ipHash: ctx.ipHash });
        });
        return sendJson(res, 200, { content: mapContent(db.prepare('SELECT * FROM contents WHERE id=?').get(content.id)) });
      }

      params = routeMatch(pathname, '/content/:id');
      if (params && (req.method === 'GET' || req.method === 'HEAD')) {
        const content = db.prepare('SELECT * FROM contents WHERE id=?').get(params.id);
        if (!content || content.status !== 'published') throw new HttpError(404, '公开内容不存在', 'not_found');
        const artifact = db.prepare(`SELECT * FROM content_artifacts WHERE content_id=? AND version=? AND status='ready'`).get(content.id, content.current_version);
        if (!artifact) throw new HttpError(404, '内容成品不存在', 'not_found');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'self'" });
        return res.end(req.method === 'HEAD' ? '' : artifact.html_text);
      }

      params = routeMatch(pathname, '/preview/:id');
      if (params && (req.method === 'GET' || req.method === 'HEAD')) {
        const user = requireUser(db, req, ['creator']);
        const content = requireOwnedContent(db, params.id, user);
        const artifact = db.prepare(`SELECT * FROM content_artifacts WHERE content_id=? AND version=? AND status='ready'`).get(content.id, content.current_version);
        if (!artifact) throw new HttpError(404, '内容成品不存在', 'not_found');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
        return res.end(req.method === 'HEAD' ? '' : artifact.html_text);
      }

      if (pathname.startsWith('/api/')) throw new HttpError(404, '接口不存在', 'not_found');
      if ((req.method === 'GET' || req.method === 'HEAD') && pathname === '/workspace') {
        return serveStatic(publicDir, '/workspace.html', res);
      }
      if ((req.method === 'GET' || req.method === 'HEAD') && serveStatic(publicDir, pathname, res)) return;
      if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(publicDir, '/', res);
      throw new HttpError(404, '页面不存在', 'not_found');
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      if (status === 500) console.error(error);
      return sendJson(res, status, { error: { code: error.code || 'internal_error', message: status === 500 ? '服务器处理失败' : error.message, details: error.details } });
    }
  }

  return {
    handler,
    db,
    ai,
    worker,
    close() { worker.stop(); if (!options.db) closeDatabase(db); },
  };
}
