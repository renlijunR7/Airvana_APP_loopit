import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';
import { createApp } from '../src/app.mjs';

let app; let server; let base;

before(async () => {
  app = createApp({ dbFile: ':memory:', allowDemo: true, disableWorker: false, env: { AI_PROVIDER: 'local', APP_SECRET: 'test-secret', RUNTIME_MIN_DURATION_MS: '0', API_RATE_LIMIT: '5000', AUTH_RATE_LIMIT: '1000' } });
  server = http.createServer(app.handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.closeAllConnections?.();
  await new Promise(resolve => server.close(resolve));
  app.close();
});

async function req(path, { method = 'GET', body, cookie, device = 'exp-device' } = {}) {
  const response = await fetch(base + path, {
    method, redirect: 'manual',
    headers: { 'Content-Type': 'application/json', 'X-Airvana-Device': device, ...(cookie ? { Cookie: cookie } : {}) },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = {};
  try { data = JSON.parse(text); } catch { data = {}; }
  return { response, data, text, cookie: response.headers.get('set-cookie')?.split(';')[0] };
}

const login = async persona => {
  const r = await req('/api/auth/demo', { method: 'POST', body: { role: 'creator', persona } });
  return { cookie: r.cookie, me: r.data.me };
};
const waitFor = async (fn, tries = 40, delay = 120) => {
  for (let i = 0; i < tries; i += 1) { const v = await fn(); if (v) return v; await new Promise(r => setTimeout(r, delay)); }
  return null;
};

async function publish(owner, title) {
  const agent = await req('/api/agents', { method: 'POST', cookie: owner.cookie, body: { name: 'Exp Agent', contentType: 'all', permissions: { draft: true } } });
  const task = await req('/api/tasks', { method: 'POST', cookie: owner.cookie, body: { agentId: agent.data.agent.id, title, contentType: 'game', prompt: `${title}：完整三阶段互动挑战，包含即时反馈与安全提示。`, idempotencyKey: `exp-${title}` } });
  assert.equal(task.response.status, 202, JSON.stringify(task.data));
  await waitFor(async () => (await req(`/api/tasks/${task.data.task.id}`, { cookie: owner.cookie })).data.task.status === 'review_pending');
  await req(`/api/tasks/${task.data.task.id}/review`, { method: 'POST', cookie: owner.cookie, body: { decision: 'approve' } });
  const published = await req(`/api/contents/${task.data.content.id}/publish`, { method: 'POST', cookie: owner.cookie });
  assert.equal(published.response.status, 200, JSON.stringify(published.data));
  return task.data.content.id;
}

async function makeExperiment(owner, contentId, patch = {}) {
  const created = await req(`/api/contents/${contentId}/experiments`, { method: 'POST', cookie: owner.cookie, body: {
    name: '首屏钩子测试', hypothesis: '更具体的钩子能提升开始率', variantField: 'hook',
    controlValue: '对照钩子文案', variantValue: '实验钩子文案', rolloutPercent: 100, ...patch,
  } });
  assert.equal(created.response.status, 201, JSON.stringify(created.data));
  return created.data.experiment.id;
}

const variantFrom = html => {
  const m = /globalThis\.__AIRVANA_VARIANT__=(\{.*?\});<\/script>/.exec(html);
  return m ? JSON.parse(m[1]) : null;
};

// ===== 投放期分桶 =====

test('running experiment injects a server-resolved variant into the delivered runtime and records a real assignment', async () => {
  const owner = await login('exp-owner');
  const viewer = await login('exp-viewer');
  const contentId = await publish(owner, '灰度投放内容');
  const experimentId = await makeExperiment(owner, contentId);

  // draft 阶段：不注入，且可公共缓存
  const draftFetch = await req(`/content/${contentId}`, { cookie: viewer.cookie });
  assert.equal(variantFrom(draftFetch.text), null, 'draft 实验不得影响投放');
  assert.equal(draftFetch.response.headers.get('cache-control'), 'public, max-age=60');

  assert.equal((await req(`/api/experiments/${experimentId}/status`, { method: 'POST', cookie: owner.cookie, body: { status: 'running' } })).response.status, 200);

  const served = await req(`/content/${contentId}`, { cookie: viewer.cookie });
  const injected = variantFrom(served.text);
  assert.ok(injected, 'running 实验必须把分桶注入投放副本');
  assert.equal(injected.experimentId, experimentId);
  assert.equal(injected.field, 'hook');
  assert.equal(injected.variant, 'variant', 'rollout 100% 时所有人进实验组');
  assert.equal(injected.value, '实验钩子文案');

  // 实库出现真实分配记录
  const rows = app.db.prepare('SELECT variant FROM experiment_assignments WHERE experiment_id=? AND user_id=?').all(experimentId, viewer.me.id);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].variant, 'variant');

  // 灰度期间禁止共享缓存复用他人分支
  assert.equal(served.response.headers.get('cache-control'), 'private, no-store');
  assert.equal(served.response.headers.get('vary'), 'Cookie');

  // 二次投放稳定同分支，且不产生第二条记录
  const again = await req(`/content/${contentId}`, { cookie: viewer.cookie });
  assert.equal(variantFrom(again.text).variant, 'variant');
  assert.equal(app.db.prepare('SELECT COUNT(*) n FROM experiment_assignments WHERE experiment_id=? AND user_id=?').get(experimentId, viewer.me.id).n, 1);
});

test('0% rollout keeps every viewer on control and serves the control value', async () => {
  const owner = await login('exp-owner-0');
  const viewer = await login('exp-viewer-0');
  const contentId = await publish(owner, '零放量内容');
  const experimentId = await makeExperiment(owner, contentId, { rolloutPercent: 0, controlValue: '原始标题', variantValue: '新标题', variantField: 'title' });
  await req(`/api/experiments/${experimentId}/status`, { method: 'POST', cookie: owner.cookie, body: { status: 'running' } });

  const injected = variantFrom((await req(`/content/${contentId}`, { cookie: viewer.cookie })).text);
  assert.equal(injected.variant, 'control');
  assert.equal(injected.value, '原始标题', '对照组必须拿到对照值，不能拿实验值');
});

test('anonymous viewers are never bucketed, and paused experiments stop affecting delivery', async () => {
  const owner = await login('exp-owner-anon');
  const viewer = await login('exp-viewer-anon');
  const contentId = await publish(owner, '匿名与暂停内容');
  const experimentId = await makeExperiment(owner, contentId);
  await req(`/api/experiments/${experimentId}/status`, { method: 'POST', cookie: owner.cookie, body: { status: 'running' } });

  // 无会话：无法归属到人，不注入也不落记录
  const anon = await req(`/content/${contentId}`);
  assert.equal(variantFrom(anon.text), null);
  assert.equal(app.db.prepare('SELECT COUNT(*) n FROM experiment_assignments WHERE experiment_id=?').get(experimentId).n, 0);

  assert.ok(variantFrom((await req(`/content/${contentId}`, { cookie: viewer.cookie })).text));

  await req(`/api/experiments/${experimentId}/status`, { method: 'POST', cookie: owner.cookie, body: { status: 'paused' } });
  const paused = await req(`/content/${contentId}`, { cookie: viewer.cookie });
  assert.equal(variantFrom(paused.text), null, '暂停后必须立刻停止影响投放');
  assert.equal(paused.response.headers.get('cache-control'), 'public, max-age=60');
});

test('delivery-time injection never mutates the stored artifact or its checksum', async () => {
  const owner = await login('exp-owner-checksum');
  const viewer = await login('exp-viewer-checksum');
  const contentId = await publish(owner, '成品完整性内容');
  const before = app.db.prepare('SELECT html_text,checksum FROM content_artifacts WHERE content_id=? ORDER BY version DESC LIMIT 1').get(contentId);
  assert.equal(crypto.createHash('sha256').update(before.html_text).digest('hex'), before.checksum);

  const experimentId = await makeExperiment(owner, contentId);
  await req(`/api/experiments/${experimentId}/status`, { method: 'POST', cookie: owner.cookie, body: { status: 'running' } });
  const served = await req(`/content/${contentId}`, { cookie: viewer.cookie });
  assert.ok(variantFrom(served.text));
  assert.notEqual(served.text, before.html_text, '投放副本应带注入');

  const stored = app.db.prepare('SELECT html_text,checksum FROM content_artifacts WHERE content_id=? ORDER BY version DESC LIMIT 1').get(contentId);
  assert.equal(stored.html_text, before.html_text, '存量成品不得因灰度被改写');
  assert.equal(stored.checksum, before.checksum);
  assert.equal(crypto.createHash('sha256').update(stored.html_text).digest('hex'), stored.checksum);
});

test('experiment list reports real per-branch assignment counts and runtime variant capability', async () => {
  const owner = await login('exp-owner-counts');
  const a = await login('exp-counts-a');
  const b = await login('exp-counts-b');
  const contentId = await publish(owner, '分配统计内容');
  const experimentId = await makeExperiment(owner, contentId, { rolloutPercent: 100 });
  await req(`/api/experiments/${experimentId}/status`, { method: 'POST', cookie: owner.cookie, body: { status: 'running' } });
  await req(`/content/${contentId}`, { cookie: a.cookie });
  await req(`/content/${contentId}`, { cookie: b.cookie });

  const list = await req(`/api/contents/${contentId}/experiments`, { cookie: owner.cookie });
  assert.equal(list.data.runtimeVariantAware, true, '新成品应声明可消费分桶');
  const row = list.data.experiments.find(x => x.id === experimentId);
  assert.deepEqual(row.assignmentCounts, { control: 0, variant: 2 });
  assert.equal(row.assignments, 2);
});

// ===== 成品运行时确实消费分桶（对发布产物的真实代码求值）=====

function applyVariantOn(html, variant, data) {
  const start = html.indexOf('function applyVariant()');
  const end = html.indexOf('\n  applyVariant();');
  assert.ok(start > 0 && end > start, '成品必须内含 applyVariant');
  const nodes = { '.hero h1': { textContent: '' }, '.hero p': { textContent: '' } };
  const document = { title: '', body: { dataset: {} }, documentElement: { style: { props: {}, setProperty(k, v) { this.props[k] = v; } } }, querySelector: sel => nodes[sel] || null };
  const src = `let requiredChecks=2;\n${html.slice(start, end)}\napplyVariant();\nreturn { data:DATA, requiredChecks, document, nodes };`;
  return new Function('VARIANT', 'DATA', 'document', 'nodes', 'globalThis', src)(variant, data, document, nodes, { CSS: { supports: (_k, v) => /^#[0-9a-f]{6}$/i.test(v) } });
}

const sampleData = () => ({ title: '原标题', payload: { hook: '原钩子', summary: '原钩子', sections: [{ heading: 'A', body: 'a' }, { heading: 'B', body: 'b' }, { heading: 'C', body: 'c' }] } });

test('shipped runtime applies each optimizable field for real', async () => {
  const owner = await login('exp-apply');
  const contentId = await publish(owner, '字段生效内容');
  const html = app.db.prepare('SELECT html_text FROM content_artifacts WHERE content_id=? ORDER BY version DESC LIMIT 1').get(contentId).html_text;

  const title = applyVariantOn(html, { field: 'title', variant: 'variant', value: '实验标题', experimentId: 'e1' }, sampleData());
  assert.equal(title.data.title, '实验标题');
  assert.equal(title.nodes['.hero h1'].textContent, '实验标题');
  assert.match(title.document.title, /^实验标题 · Airvana$/);
  assert.equal(title.document.body.dataset.airvanaVariant, 'variant');

  const hook = applyVariantOn(html, { field: 'hook', variant: 'variant', value: '实验钩子', experimentId: 'e2' }, sampleData());
  assert.equal(hook.data.payload.hook, '实验钩子');
  assert.equal(hook.nodes['.hero p'].textContent, '实验钩子');

  const cover = applyVariantOn(html, { field: 'coverStyle', variant: 'variant', value: '#22c55e', experimentId: 'e3' }, sampleData());
  assert.equal(cover.document.body.dataset.coverStyle, '#22c55e');
  assert.equal(cover.document.documentElement.style.props['--accent'], '#22c55e');

  const hard = applyVariantOn(html, { field: 'difficulty', variant: 'variant', value: 'hard', experimentId: 'e4' }, sampleData());
  assert.equal(hard.requiredChecks, 3, 'difficulty 必须真正改变通关所需检查数');
  const easy = applyVariantOn(html, { field: 'difficulty', variant: 'control', value: 'easy', experimentId: 'e4' }, sampleData());
  assert.equal(easy.requiredChecks, 1);

  const reversed = applyVariantOn(html, { field: 'interactionOrder', variant: 'variant', value: 'reverse', experimentId: 'e5' }, sampleData());
  assert.deepEqual(reversed.data.payload.sections.map(s => s.heading), ['C', 'B', 'A']);
  const picked = applyVariantOn(html, { field: 'interactionOrder', variant: 'variant', value: '3,1', experimentId: 'e5' }, sampleData());
  assert.deepEqual(picked.data.payload.sections.map(s => s.heading), ['C', 'A']);

  // 无分桶时完全不改写
  const untouched = applyVariantOn(html, null, sampleData());
  assert.equal(untouched.data.title, '原标题');
  assert.equal(untouched.requiredChecks, 2);
  assert.deepEqual(untouched.data.payload.sections.map(s => s.heading), ['A', 'B', 'C']);
});

test('difficulty variants alter the actual game move budget while preserving all three boards', async () => {
  const html = app.db.prepare("SELECT html_text FROM content_artifacts ORDER BY rowid DESC LIMIT 1").get().html_text;
  const context = { Math }; vm.runInNewContext(fs.readFileSync(new URL('../public/server-game-runtime-v3.js', import.meta.url), 'utf8'), context);
  const easyVariant = applyVariantOn(html, { field: 'difficulty', value: 'easy' }, sampleData());
  const hardVariant = applyVariantOn(html, { field: 'difficulty', value: 'hard' }, sampleData());
  const make = variant => new context.AirvanaServerGameV3.MemoryGame({ art: ['emerald','ruby','sapphire','amethyst','key','star'] }, { difficulty: variant.requiredChecks, random: () => .99 });
  const easy = make(easyVariant); const hard = make(hardVariant);
  assert.equal(easy.moves, 12); assert.equal(hard.moves, 9);
  assert.equal(easy.snapshot().stages, 3); assert.equal(hard.snapshot().stages, 3);
  assert.match(html, /difficulty:requiredChecks/);
});
