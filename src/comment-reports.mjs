import { transaction } from './db.mjs';
import { HttpError, audit, isoNow, uid } from './utils.mjs';

// Canonical fixtures only: client-provided author/body must never become evidence.
const demoComments = new Map([
  ['demo-mina', { author: 'Mina', body: '玩法节奏很清楚，失败后也能立即重试。' }],
  ['demo-leo', { author: 'Leo', body: '竖屏单手操作很顺，期待下一个版本。' }],
]);
const reasons = new Set(['spam', 'harassment', 'unsafe', 'privacy', 'misleading', 'other']);

export function submitCommentReport(db, user, body, { allowDemo, ipHash } = {}) {
  if (!reasons.has(body.reason)) throw new HttpError(400, '请选择有效的举报原因', 'validation_error');
  const details = typeof body.details === 'string' ? body.details.trim() : '';
  if (details.length > 500) throw new HttpError(400, '补充说明不能超过 500 字', 'validation_error');
  if (body.reason === 'other' && !details) throw new HttpError(400, '请补充举报说明', 'validation_error');
  const content = db.prepare('SELECT * FROM contents WHERE id=?').get(String(body.contentId || ''));
  if (!content || content.status !== 'published') throw new HttpError(404, '作品不存在或已下架', 'not_found');
  if (Boolean(body.commentId) === Boolean(body.demoCommentKey)) throw new HttpError(400, '举报对象无效', 'validation_error');

  let commentId = null;
  let targetKey;
  let author;
  let text;
  const demo = Boolean(body.demoCommentKey);
  if (demo) {
    const fixture = demoComments.get(body.demoCommentKey);
    if (!allowDemo || !content.id.startsWith('content_mobilearcade_') || !fixture) {
      throw new HttpError(404, '演示评论不存在或演示模式未启用', 'not_found');
    }
    targetKey = body.demoCommentKey;
    author = fixture.author;
    text = fixture.body;
  } else {
    const comment = db.prepare(`SELECT c.*,u.display_name FROM content_comments c JOIN users u ON u.id=c.user_id WHERE c.id=? AND c.content_id=?`).get(String(body.commentId), content.id);
    if (!comment || comment.status !== 'visible') throw new HttpError(404, '评论不存在或已删除', 'not_found');
    if (comment.user_id === user.id) throw new HttpError(409, '不能举报自己的评论', 'invalid_state');
    commentId = comment.id;
    targetKey = comment.id;
    author = comment.display_name;
    text = comment.body;
  }
  const existing = db.prepare('SELECT * FROM comment_reports WHERE reporter_user_id=? AND content_id=? AND target_key=?').get(user.id, content.id, targetKey);
  if (existing) return { ...receipt(existing), alreadyReported: true };
  const since = new Date(Date.now() - 60_000).toISOString();
  if (db.prepare('SELECT COUNT(*) n FROM comment_reports WHERE reporter_user_id=? AND created_at>?').get(user.id, since).n >= 10) {
    throw new HttpError(429, '举报频率过高，请稍后再试', 'rate_limited');
  }
  const id = uid('comment_report');
  const now = isoNow();
  transaction(db, () => {
    db.prepare(`INSERT INTO comment_reports
      (id,reporter_user_id,content_id,comment_id,target_key,author_snapshot,body_snapshot,demo,reason,details,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(id, user.id, content.id, commentId, targetKey, author, text, demo ? 1 : 0, body.reason, details, now, now);
    audit(db, { actorUserId: user.id, action: 'comment_report.submitted', subjectType: 'comment_report', subjectId: id, after: { contentId: content.id, targetKey, demo }, ipHash });
  });
  return { id, status: 'open', demo, alreadyReported: false };
}

function receipt(row) {
  return { id: row.id, status: row.status, demo: Boolean(row.demo), resolutionAction: row.resolution_action };
}

export function listCommentReports(db, user) {
  const rows = user.role === 'admin'
    ? db.prepare('SELECT * FROM comment_reports ORDER BY created_at DESC LIMIT 200').all()
    : db.prepare('SELECT * FROM comment_reports WHERE reporter_user_id=? ORDER BY created_at DESC LIMIT 200').all(user.id);
  return rows.map(row => ({ ...receipt(row), contentId: row.content_id, targetKey: row.target_key, author: row.author_snapshot, body: row.body_snapshot, reason: row.reason, details: row.details, createdAt: row.created_at }));
}

export function resolveCommentReport(db, user, id, body, ipHash) {
  const report = db.prepare('SELECT * FROM comment_reports WHERE id=?').get(id);
  if (!report) throw new HttpError(404, '举报记录不存在', 'not_found');
  if (!['dismiss', 'remove'].includes(body.action) || (report.demo && body.action === 'remove')) {
    throw new HttpError(400, '处理动作无效；演示评论仅可记录复核结果', 'validation_error');
  }
  if (report.status === 'resolved') return { ...receipt(report), idempotent: true };
  const now = isoNow();
  transaction(db, () => {
    db.prepare(`UPDATE comment_reports SET status='resolved',resolution_action=?,resolution_note=?,resolved_by=?,updated_at=? WHERE id=?`)
      .run(body.action, String(body.note || '').slice(0, 500), user.id, now, id);
    if (body.action === 'remove' && report.comment_id) {
      db.prepare(`UPDATE content_comments SET status='deleted',updated_at=? WHERE id=?`).run(now, report.comment_id);
    }
    audit(db, { actorUserId: user.id, action: 'comment_report.resolved', subjectType: 'comment_report', subjectId: id, after: { action: body.action }, ipHash });
  });
  return { id, status: 'resolved', demo: Boolean(report.demo), resolutionAction: body.action, idempotent: false };
}
