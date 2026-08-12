import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

export function openDatabase(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  migrate(db);
  return db;
}

function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL CHECK(role IN ('creator','brand','admin')),
      display_name TEXT NOT NULL,
      email TEXT,
      wallet_address TEXT UNIQUE,
      wallet_chain_id INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auth_challenges (
      id TEXT PRIMARY KEY,
      address TEXT NOT NULL,
      chain_id INTEGER NOT NULL,
      requested_role TEXT NOT NULL,
      message TEXT NOT NULL,
      nonce TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wallet_binding_challenges (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      address TEXT NOT NULL,
      chain_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      nonce TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wallet_bindings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      address TEXT NOT NULL UNIQUE,
      chain_id INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('verified','disabled')),
      is_primary INTEGER NOT NULL DEFAULT 0,
      verified_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id,address)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      content_type TEXT NOT NULL CHECK(content_type IN ('game','video','article','all')),
      status TEXT NOT NULL CHECK(status IN ('active','paused','archived')),
      permissions_json TEXT NOT NULL,
      review_mode TEXT NOT NULL CHECK(review_mode IN ('human','auto')),
      system_prompt TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contents (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      agent_id TEXT REFERENCES agents(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      content_type TEXT NOT NULL CHECK(content_type IN ('game','video','article')),
      status TEXT NOT NULL,
      moderation_status TEXT NOT NULL DEFAULT 'not_run',
      moderation_json TEXT NOT NULL DEFAULT '{}',
      payload_json TEXT NOT NULL DEFAULT '{}',
      current_version INTEGER NOT NULL DEFAULT 0,
      scheduled_at TEXT,
      published_at TEXT,
      archived_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS content_versions (
      id TEXT PRIMARY KEY,
      content_id TEXT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
      version INTEGER NOT NULL,
      title TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      source_task_id TEXT,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      UNIQUE(content_id, version)
    );

    CREATE TABLE IF NOT EXISTS agent_tasks (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      agent_id TEXT NOT NULL REFERENCES agents(id),
      content_id TEXT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
      task_type TEXT NOT NULL,
      status TEXT NOT NULL,
      progress INTEGER NOT NULL DEFAULT 0,
      prompt TEXT NOT NULL,
      provider TEXT NOT NULL DEFAULT 'pending',
      result_json TEXT NOT NULL DEFAULT '{}',
      moderation_json TEXT NOT NULL DEFAULT '{}',
      error_text TEXT,
      review_note TEXT,
      started_at TEXT,
      finished_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS engagement_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content_id TEXT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      event_key TEXT NOT NULL,
      device_hash TEXT NOT NULL,
      ip_hash TEXT NOT NULL,
      status TEXT NOT NULL,
      rejection_reason TEXT,
      points INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, event_key)
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      brand_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      objective TEXT NOT NULL,
      status TEXT NOT NULL,
      brief_json TEXT NOT NULL,
      budget_ait INTEGER NOT NULL,
      reward_ait INTEGER NOT NULL,
      starts_at TEXT NOT NULL,
      ends_at TEXT NOT NULL,
      review_note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS campaign_participants (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      creator_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(campaign_id, creator_user_id)
    );

    CREATE TABLE IF NOT EXISTS campaign_deliverables (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      creator_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content_id TEXT NOT NULL REFERENCES contents(id),
      status TEXT NOT NULL,
      submission_note TEXT NOT NULL,
      review_note TEXT,
      submitted_at TEXT NOT NULL,
      reviewed_at TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settlements (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      deliverable_id TEXT NOT NULL UNIQUE REFERENCES campaign_deliverables(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      currency TEXT NOT NULL CHECK(currency = 'AIT'),
      amount INTEGER NOT NULL,
      status TEXT NOT NULL,
      approved_at TEXT,
      issued_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS point_events (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      currency TEXT NOT NULL CHECK(currency IN ('AIP','AIT')),
      amount INTEGER NOT NULL,
      status TEXT NOT NULL,
      event_type TEXT NOT NULL,
      event_key TEXT NOT NULL,
      subject_type TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      metadata_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      UNIQUE(currency, event_key)
    );

    CREATE TABLE IF NOT EXISTS ait_withdrawal_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      wallet_binding_id TEXT NOT NULL REFERENCES wallet_bindings(id),
      currency TEXT NOT NULL CHECK(currency = 'AIT'),
      amount INTEGER NOT NULL CHECK(amount > 0),
      address TEXT NOT NULL,
      chain_id INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('submitted','approved','processing','paid','rejected','cancelled')),
      idempotency_key TEXT NOT NULL,
      compliance_confirmed_at TEXT NOT NULL,
      review_note TEXT,
      reviewed_by TEXT REFERENCES users(id),
      reviewed_at TEXT,
      tx_hash TEXT,
      paid_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(user_id,idempotency_key)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_user_id TEXT,
      action TEXT NOT NULL,
      subject_type TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      before_json TEXT,
      after_json TEXT,
      ip_hash TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS content_artifacts (
      id TEXT PRIMARY KEY,
      content_id TEXT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
      version INTEGER NOT NULL,
      artifact_type TEXT NOT NULL,
      status TEXT NOT NULL,
      html_text TEXT NOT NULL,
      manifest_json TEXT NOT NULL,
      validation_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(content_id, version)
    );

    CREATE TABLE IF NOT EXISTS runtime_sessions (
      id TEXT PRIMARY KEY,
      token_hash TEXT NOT NULL UNIQUE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content_id TEXT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
      device_hash TEXT NOT NULL,
      ip_hash TEXT NOT NULL,
      status TEXT NOT NULL,
      reward_eligible INTEGER NOT NULL,
      next_sequence INTEGER NOT NULL DEFAULT 1,
      started_at TEXT,
      completed_at TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS runtime_events (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES runtime_sessions(id) ON DELETE CASCADE,
      sequence INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(session_id, sequence)
    );

    CREATE TABLE IF NOT EXISTS attribution_touches (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES runtime_sessions(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content_id TEXT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
      campaign_id TEXT REFERENCES campaigns(id) ON DELETE SET NULL,
      creator_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      channel_code TEXT,
      event_type TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS content_boosts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content_id TEXT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
      cost_aip INTEGER NOT NULL,
      status TEXT NOT NULL,
      starts_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS risk_cases (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      subject_type TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      risk_type TEXT NOT NULL,
      score INTEGER NOT NULL,
      status TEXT NOT NULL,
      evidence_json TEXT NOT NULL,
      resolution_note TEXT,
      resolved_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS content_reports (
      id TEXT PRIMARY KEY,
      reporter_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content_id TEXT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
      reason TEXT NOT NULL,
      details TEXT NOT NULL,
      status TEXT NOT NULL,
      resolution_action TEXT,
      resolution_note TEXT,
      resolved_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(reporter_user_id, content_id, reason)
    );

    CREATE TABLE IF NOT EXISTS content_appeals (
      id TEXT PRIMARY KEY,
      content_id TEXT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
      appellant_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      reason TEXT NOT NULL,
      status TEXT NOT NULL,
      resolution_note TEXT,
      resolved_by TEXT REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      subject_type TEXT,
      subject_id TEXT,
      read_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agent_memory (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      memory_type TEXT NOT NULL,
      content TEXT NOT NULL,
      source TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS agent_task_steps (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES agent_tasks(id) ON DELETE CASCADE,
      sequence INTEGER NOT NULL,
      step_type TEXT NOT NULL,
      status TEXT NOT NULL,
      input_json TEXT NOT NULL,
      output_json TEXT NOT NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      UNIQUE(task_id, sequence)
    );

    CREATE TABLE IF NOT EXISTS task_runtime (
      task_id TEXT PRIMARY KEY REFERENCES agent_tasks(id) ON DELETE CASCADE,
      attempt INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 3,
      lease_token TEXT,
      leased_at TEXT,
      next_retry_at TEXT,
      cancelled_at TEXT
    );

    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_user_id TEXT NOT NULL REFERENCES users(id),
      org_type TEXT NOT NULL,
      verification_status TEXT NOT NULL,
      verification_note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS organization_members (
      id TEXT PRIMARY KEY,
      organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(organization_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS campaign_invites (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      creator_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      invited_by TEXT NOT NULL REFERENCES users(id),
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(campaign_id, creator_user_id)
    );

    CREATE TABLE IF NOT EXISTS campaign_budget_events (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      actor_user_id TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settlement_approvals (
      id TEXT PRIMARY KEY,
      settlement_id TEXT NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
      approver_user_id TEXT NOT NULL REFERENCES users(id),
      decision TEXT NOT NULL,
      note TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE(settlement_id, approver_user_id)
    );

    CREATE TABLE IF NOT EXISTS terms_acceptances (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      document_type TEXT NOT NULL,
      document_version TEXT NOT NULL,
      accepted_at TEXT NOT NULL,
      UNIQUE(user_id, document_type, document_version)
    );

    CREATE TABLE IF NOT EXISTS account_deletion_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      reason TEXT NOT NULL,
      requested_at TEXT NOT NULL,
      scheduled_for TEXT NOT NULL,
      cancelled_at TEXT
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      setting_key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_by TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_status ON agent_tasks(status, created_at);
    CREATE INDEX IF NOT EXISTS idx_contents_owner ON contents(owner_user_id, updated_at);
    CREATE INDEX IF NOT EXISTS idx_contents_status ON contents(status, published_at);
    CREATE INDEX IF NOT EXISTS idx_point_user ON point_events(user_id, currency, created_at);
    CREATE INDEX IF NOT EXISTS idx_wallet_bindings_user ON wallet_bindings(user_id, status, is_primary);
    CREATE INDEX IF NOT EXISTS idx_wallet_binding_challenges_user ON wallet_binding_challenges(user_id, expires_at);
    CREATE INDEX IF NOT EXISTS idx_ait_withdrawals_user ON ait_withdrawal_requests(user_id, status, created_at);
    CREATE INDEX IF NOT EXISTS idx_campaign_status ON campaigns(status, starts_at, ends_at);
    CREATE INDEX IF NOT EXISTS idx_deliverables_campaign ON campaign_deliverables(campaign_id, status);
    CREATE INDEX IF NOT EXISTS idx_runtime_sessions_user ON runtime_sessions(user_id, content_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_attribution_campaign ON attribution_touches(campaign_id, event_type, created_at);
    CREATE INDEX IF NOT EXISTS idx_content_boosts_active ON content_boosts(content_id, status, expires_at);
    CREATE INDEX IF NOT EXISTS idx_risk_status ON risk_cases(status, score, created_at);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at, created_at);
    CREATE INDEX IF NOT EXISTS idx_content_appeals_status ON content_appeals(status, created_at);
    CREATE INDEX IF NOT EXISTS idx_task_steps ON agent_task_steps(task_id, sequence);
  `);

  const reportColumns = db.prepare('PRAGMA table_info(content_reports)').all().map(column => column.name);
  if (!reportColumns.includes('resolution_action')) db.exec('ALTER TABLE content_reports ADD COLUMN resolution_action TEXT');

  const memoryColumns = db.prepare('PRAGMA table_info(agent_memory)').all().map(column => column.name);
  if (!memoryColumns.includes('priority')) db.exec('ALTER TABLE agent_memory ADD COLUMN priority INTEGER NOT NULL DEFAULT 2');

  db.prepare(`INSERT OR IGNORE INTO app_settings (setting_key,value_json,updated_at) VALUES ('agent_runtime_enabled','true',?)`).run(new Date().toISOString());
}

export function transaction(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function closeDatabase(db) {
  try { db.close(); } catch {}
}
