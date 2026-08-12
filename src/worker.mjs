import { audit, isoNow, jsonString, safeJson, uid } from './utils.mjs';
import { transaction } from './db.mjs';
import { saveArtifact } from './artifact.mjs';

function taskStep(db, taskId, sequence, stepType, status, input = {}, output = {}, finished = true) {
  const now = isoNow();
  db.prepare(`INSERT INTO agent_task_steps
    (id,task_id,sequence,step_type,status,input_json,output_json,started_at,finished_at)
    VALUES (?,?,?,?,?,?,?,?,?)
    ON CONFLICT(task_id,sequence) DO UPDATE SET status=excluded.status,input_json=excluded.input_json,output_json=excluded.output_json,finished_at=excluded.finished_at`)
    .run(uid('step'), taskId, sequence, stepType, status, jsonString(input), jsonString(output), now, finished ? now : null);
}

function createVersion(db, { content, payload, title, taskId, userId }) {
  const version = Number(content.current_version) + 1;
  db.prepare(`INSERT INTO content_versions
    (id, content_id, version, title, payload_json, source_task_id, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(uid('ver'), content.id, version, title, jsonString(payload), taskId, userId, isoNow());
  return version;
}

export function createWorker({ db, ai, pollMs = 450 }) {
  let timer = null;
  let working = false;

  async function processTask(task) {
    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(task.agent_id);
    const content = db.prepare('SELECT * FROM contents WHERE id = ?').get(task.content_id);
    if (!agent || !content || agent.status !== 'active') {
      db.prepare(`UPDATE agent_tasks SET status='failed', error_text=?, finished_at=?, updated_at=? WHERE id=?`)
        .run('Agent 不可用或内容不存在', isoNow(), isoNow(), task.id);
      return;
    }
    const permissions = safeJson(agent.permissions_json);
    if (!permissions.draft || (agent.content_type !== 'all' && agent.content_type !== content.content_type)) {
      db.prepare(`UPDATE agent_tasks SET status='failed', error_text=?, finished_at=?, updated_at=? WHERE id=?`)
        .run('Agent 权限或内容类型不匹配', isoNow(), isoNow(), task.id);
      return;
    }

    const started = isoNow();
    const memories = db.prepare('SELECT memory_type,content FROM agent_memory WHERE agent_id=? ORDER BY updated_at DESC LIMIT 12').all(agent.id);
    taskStep(db, task.id, 1, 'context_resolution', 'completed', { contentType: content.content_type }, { agent: agent.name, permissions, memories });
    db.prepare(`UPDATE agent_tasks SET status='running', progress=15, started_at=?, updated_at=? WHERE id=?`).run(started, started, task.id);
    try {
      taskStep(db, task.id, 2, 'constraint_registry', 'completed', { prompt: task.prompt }, { publishingLocked: true, contentTypeAllowed: true, memoryCount: memories.length });
      const generated = await ai.generate({
        contentType: content.content_type,
        title: content.title,
        prompt: task.prompt,
        agent: { name: agent.name, systemPrompt: `${agent.system_prompt}\nAgent memory:\n${memories.map(item => `[${item.memory_type}] ${item.content}`).join('\n')}`.slice(0, 4000) },
      });
      taskStep(db, task.id, 3, 'content_generation', 'completed', { provider: generated.provider }, { title: generated.payload.title, sections: generated.payload.sections?.length || 0 });
      db.prepare(`UPDATE agent_tasks SET progress=65, provider=?, result_json=?, updated_at=? WHERE id=?`)
        .run(generated.provider, jsonString(generated.payload), isoNow(), task.id);
      const moderation = await ai.moderate({ title: generated.payload.title, prompt: task.prompt, payload: generated.payload });
      taskStep(db, task.id, 4, 'policy_and_safety', moderation.passed ? 'completed' : 'blocked', { provider: moderation.provider }, moderation);
      const finished = isoNow();
      transaction(db, () => {
        if (!moderation.passed) {
          db.prepare(`UPDATE agent_tasks SET status='rejected', progress=100, moderation_json=?, error_text=?, finished_at=?, updated_at=? WHERE id=?`)
            .run(jsonString(moderation), '内容未通过安全审核', finished, finished, task.id);
          db.prepare(`UPDATE contents SET status='rejected', moderation_status='blocked', moderation_json=?, payload_json=?, updated_at=? WHERE id=?`)
            .run(jsonString(moderation), jsonString(generated.payload), finished, content.id);
          audit(db, { actorUserId: task.owner_user_id, action: 'content.moderation_blocked', subjectType: 'content', subjectId: content.id, after: moderation });
          return;
        }

        if (agent.review_mode === 'auto') {
          const version = createVersion(db, { content, payload: generated.payload, title: generated.payload.title || content.title, taskId: task.id, userId: task.owner_user_id });
          const versionedContent = { ...content, title: generated.payload.title || content.title, current_version: version };
          const artifact = saveArtifact(db, { content: versionedContent, payload: generated.payload, version });
          taskStep(db, task.id, 5, 'artifact_builder', artifact.validation.passed ? 'completed' : 'failed', { version }, { manifest: artifact.manifest, validation: artifact.validation });
          db.prepare(`UPDATE contents SET title=?, status='draft', moderation_status='passed', moderation_json=?, payload_json=?, current_version=?, updated_at=? WHERE id=?`)
            .run(generated.payload.title || content.title, jsonString(moderation), jsonString(generated.payload), version, finished, content.id);
          db.prepare(`UPDATE agent_tasks SET status='approved', progress=100, moderation_json=?, finished_at=?, updated_at=? WHERE id=?`)
            .run(jsonString(moderation), finished, finished, task.id);
        } else {
          taskStep(db, task.id, 5, 'human_review_gate', 'waiting', { moderationPassed: true }, { required: true });
          db.prepare(`UPDATE contents SET title=?, status='review_pending', moderation_status='passed', moderation_json=?, payload_json=?, updated_at=? WHERE id=?`)
            .run(generated.payload.title || content.title, jsonString(moderation), jsonString(generated.payload), finished, content.id);
          db.prepare(`UPDATE agent_tasks SET status='review_pending', progress=100, moderation_json=?, finished_at=?, updated_at=? WHERE id=?`)
            .run(jsonString(moderation), finished, finished, task.id);
        }
        audit(db, { actorUserId: task.owner_user_id, action: 'agent.task_generated', subjectType: 'task', subjectId: task.id, after: { provider: generated.provider, moderation } });
      });
    } catch (error) {
      const finished = isoNow();
      const runtime = db.prepare('SELECT * FROM task_runtime WHERE task_id=?').get(task.id) || { attempt: 1, max_attempts: 1 };
      const retry = runtime.attempt < runtime.max_attempts;
      taskStep(db, task.id, 99, 'runtime_error', retry ? 'retrying' : 'failed', {}, { error: String(error.message || error).slice(0, 500), attempt: runtime.attempt });
      db.prepare(`UPDATE agent_tasks SET status=?, progress=?, error_text=?, finished_at=?, updated_at=? WHERE id=?`)
        .run(retry ? 'queued' : 'failed', retry ? 0 : 100, String(error.message || error).slice(0, 500), retry ? null : finished, finished, task.id);
      db.prepare(`UPDATE task_runtime SET next_retry_at=?,lease_token=NULL,leased_at=NULL WHERE task_id=?`).run(retry ? new Date(Date.now() + runtime.attempt * 1000).toISOString() : null, task.id);
      if (!retry) db.prepare(`UPDATE contents SET status='generation_failed', updated_at=? WHERE id=?`).run(finished, content.id);
    }
  }

  function publishDue() {
    const now = isoNow();
    const due = db.prepare(`SELECT * FROM contents WHERE status='scheduled' AND scheduled_at <= ?`).all(now);
    for (const content of due) {
      transaction(db, () => {
        db.prepare(`UPDATE contents SET status='published', published_at=?, updated_at=? WHERE id=?`).run(now, now, content.id);
        audit(db, { actorUserId: content.owner_user_id, action: 'content.scheduled_publish', subjectType: 'content', subjectId: content.id, before: { status: 'scheduled' }, after: { status: 'published' } });
      });
    }
    const endedCampaigns = db.prepare(`SELECT * FROM campaigns WHERE status IN ('active','paused') AND ends_at<=?`).all(now);
    for (const campaign of endedCampaigns) {
      transaction(db, () => {
        db.prepare(`UPDATE campaigns SET status='completed',updated_at=? WHERE id=?`).run(now, campaign.id);
        audit(db, { action: 'campaign.auto_completed', subjectType: 'campaign', subjectId: campaign.id, before: { status: campaign.status }, after: { status: 'completed' } });
      });
    }
  }

  async function tick() {
    if (working) return;
    working = true;
    try {
      publishDue();
      const enabled = safeJson(db.prepare(`SELECT value_json FROM app_settings WHERE setting_key='agent_runtime_enabled'`).get()?.value_json, true);
      if (enabled === false) return;
      const task = db.prepare(`SELECT t.* FROM agent_tasks t LEFT JOIN task_runtime r ON r.task_id=t.id
        WHERE t.status='queued' AND (r.next_retry_at IS NULL OR r.next_retry_at<=?) AND r.cancelled_at IS NULL ORDER BY t.created_at LIMIT 1`).get(isoNow());
      if (task) {
        const lease = uid('lease');
        db.prepare(`UPDATE task_runtime SET attempt=attempt+1,lease_token=?,leased_at=?,next_retry_at=NULL WHERE task_id=?`).run(lease, isoNow(), task.id);
      }
      if (task) await processTask(task);
    } finally {
      working = false;
    }
  }

  return {
    start() { if (!timer) timer = setInterval(tick, pollMs); tick(); },
    stop() { if (timer) clearInterval(timer); timer = null; },
    tick,
  };
}
