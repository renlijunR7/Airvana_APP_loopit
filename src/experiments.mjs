import { HttpError, isoNow, sha256, uid } from './utils.mjs';

// 可进入实验的字段白名单：Contract 锁定字段永远不在其中
export const OPTIMIZABLE_FIELDS = ['title', 'hook', 'coverStyle', 'interactionOrder', 'difficulty'];

export function assertOptimizable(field) {
  if (!OPTIMIZABLE_FIELDS.includes(field)) {
    throw new HttpError(409, `字段「${field}」不在可优化范围内；锁定字段不能进入实验`, 'field_not_optimizable');
  }
  return field;
}

// 稳定分桶：按 experimentId + userId 哈希，同一用户始终落同一分支
export function bucketOf(experimentId, userId) {
  return Number.parseInt(sha256(`${experimentId}:${userId}`).slice(0, 8), 16) % 100;
}

/**
 * 解析某用户在某实验上的分支，并落库为真实分配记录（幂等）。
 * 未 running 的实验一律回 control，且不产生分配记录。
 */
export function assignVariant(db, experiment, userId) {
  if (!experiment) throw new HttpError(404, '实验不存在', 'not_found');
  if (experiment.status !== 'running') return { variant: 'control', sticky: false, reason: 'experiment_not_running' };
  const existing = db.prepare('SELECT variant FROM experiment_assignments WHERE experiment_id=? AND user_id=?').get(experiment.id, userId);
  if (existing) return { variant: existing.variant, sticky: true };
  const bucket = bucketOf(experiment.id, userId);
  const variant = bucket < experiment.rollout_percent ? 'variant' : 'control';
  db.prepare('INSERT INTO experiment_assignments (id,experiment_id,user_id,variant,assigned_at) VALUES (?,?,?,?,?)')
    .run(uid('assignment'), experiment.id, userId, variant, isoNow());
  return { variant, sticky: false, bucket };
}

/**
 * 投放期解析：内容上是否有 running 实验，若有则返回该用户的分支与生效取值。
 * 返回 null 表示无实验生效 —— 调用方应按原样投放，不做任何改写。
 */
export function resolveContentVariant(db, contentId, userId) {
  if (!userId) return null;
  const experiment = db.prepare(`SELECT * FROM experiments WHERE content_id=? AND status='running' ORDER BY created_at DESC LIMIT 1`).get(contentId);
  if (!experiment) return null;
  const assignment = assignVariant(db, experiment, userId);
  return {
    experimentId: experiment.id,
    name: experiment.name,
    field: experiment.variant_field,
    variant: assignment.variant,
    value: assignment.variant === 'variant' ? experiment.variant_value : experiment.control_value,
    sticky: assignment.sticky,
  };
}

// 真实分配统计：让创作者看到的是账本里的数，而不是估算
export function assignmentCounts(db, experimentId) {
  const rows = db.prepare('SELECT variant, COUNT(*) n FROM experiment_assignments WHERE experiment_id=? GROUP BY variant').all(experimentId);
  const counts = { control: 0, variant: 0 };
  for (const row of rows) counts[row.variant] = Number(row.n);
  return counts;
}
