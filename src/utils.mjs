import crypto from 'node:crypto';

export const isoNow = () => new Date().toISOString();
export const uid = prefix => `${prefix}_${crypto.randomUUID().replaceAll('-', '')}`;
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');
export const sha256 = value => crypto.createHash('sha256').update(String(value)).digest('hex');
export const safeJson = (value, fallback = {}) => {
  if (value == null) return fallback;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return fallback; }
};
export const jsonString = value => JSON.stringify(value ?? {});
export const plusMinutes = minutes => new Date(Date.now() + minutes * 60_000).toISOString();
export const plusDays = days => new Date(Date.now() + days * 86_400_000).toISOString();

export class HttpError extends Error {
  constructor(status, message, code = 'request_error', details = undefined) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function readJson(req, maxBytes = 1_000_000) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new HttpError(413, '请求内容过大', 'payload_too_large');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new HttpError(400, 'JSON 格式无效', 'invalid_json'); }
}

export function sendJson(res, status, data, headers = {}) {
  const payload = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(payload);
}

export function parseCookies(req) {
  const out = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    out[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return out;
}

export function bearerToken(req) {
  const value = String(req.headers.authorization || '');
  return value.startsWith('Bearer ') ? value.slice(7) : parseCookies(req).airvana_session;
}

export function clampText(value, max, name = '字段') {
  const text = String(value ?? '').trim();
  if (!text) throw new HttpError(400, `${name}不能为空`, 'validation_error');
  if (text.length > max) throw new HttpError(400, `${name}不能超过 ${max} 个字符`, 'validation_error');
  return text;
}

export function asInt(value, min, max, name = '数值') {
  const num = Number(value);
  if (!Number.isInteger(num) || num < min || num > max) {
    throw new HttpError(400, `${name}必须是 ${min}–${max} 之间的整数`, 'validation_error');
  }
  return num;
}

export function routeMatch(pathname, pattern) {
  const keys = [];
  const source = pattern.replace(/:[A-Za-z0-9_]+/g, token => {
    keys.push(token.slice(1));
    return '([^/]+)';
  });
  const match = pathname.match(new RegExp(`^${source}$`));
  if (!match) return null;
  return Object.fromEntries(keys.map((key, index) => [key, decodeURIComponent(match[index + 1])]));
}

export function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    role: row.role,
    displayName: row.display_name,
    email: row.email,
    walletAddress: row.wallet_address,
    walletChainId: row.wallet_chain_id,
    createdAt: row.created_at,
  };
}

export function mapAgent(row) {
  return row && {
    id: row.id,
    ownerUserId: row.owner_user_id,
    name: row.name,
    description: row.description,
    contentType: row.content_type,
    status: row.status,
    permissions: safeJson(row.permissions_json),
    reviewMode: row.review_mode,
    systemPrompt: row.system_prompt,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapContent(row) {
  return row && {
    id: row.id,
    ownerUserId: row.owner_user_id,
    agentId: row.agent_id,
    title: row.title,
    contentType: row.content_type,
    status: row.status,
    moderationStatus: row.moderation_status,
    moderation: safeJson(row.moderation_json),
    payload: safeJson(row.payload_json),
    currentVersion: row.current_version,
    scheduledAt: row.scheduled_at,
    publishedAt: row.published_at,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapTask(row) {
  return row && {
    id: row.id,
    ownerUserId: row.owner_user_id,
    agentId: row.agent_id,
    contentId: row.content_id,
    taskType: row.task_type,
    status: row.status,
    progress: row.progress,
    prompt: row.prompt,
    provider: row.provider,
    result: safeJson(row.result_json),
    moderation: safeJson(row.moderation_json),
    error: row.error_text,
    reviewNote: row.review_note,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function audit(db, { actorUserId, action, subjectType, subjectId, before, after, ipHash }) {
  db.prepare(`INSERT INTO audit_logs
    (id, actor_user_id, action, subject_type, subject_id, before_json, after_json, ip_hash, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(uid('audit'), actorUserId || null, action, subjectType, subjectId,
      before == null ? null : jsonString(before), after == null ? null : jsonString(after), ipHash || null, isoNow());
}
