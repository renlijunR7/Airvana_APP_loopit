import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');

function loadWorkflow() {
  const context = {console, Date, Math, JSON};
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'public/creator-workflow-v2.js'), 'utf8'), context, {filename:'public/creator-workflow-v2.js'});
  return context.AirvanaCreatorWorkflow;
}

function advanceToPreview(workflow, initial, context = {}) {
  let task = initial;
  const seen = [task.status];
  while (task.status !== 'preview_ready') {
    task = workflow.advanceGenerationTask(task, context);
    seen.push(task.status);
  }
  return {task, seen};
}

test('S1-S2 creates a persisted draft, extracts structured intent and asks at most four material questions', () => {
  const workflow = loadWorkflow();
  const description = '帮我创作一个可爱卡通风格的跳一跳游戏，长按蓄力，适合单手操作，60 秒一局。';
  const intent = workflow.extractIntent(description);
  assert.equal(intent.work_type, '互动游戏');
  assert.equal(intent.core_mechanic, '蓄力跳跃并落到连续平台');
  assert.equal(intent.control_mode, '长按蓄力');
  assert.equal(intent.visual_style, '可爱卡通');
  assert.equal(intent.target_duration_seconds, 60);
  assert.match(intent.success_condition, /6 次有效落点/);

  const draft = workflow.createDraft({description, mode:'quick', intent, input_sources:{text:true}});
  assert.match(draft.draft_id, /^draft_/);
  assert.equal(draft.status, 'draft');
  assert.equal(draft.server_confirmed, false);

  let answers = {};
  const questions = workflow.buildQuestions(intent, answers);
  assert.equal(questions.length, 4);
  assert.deepEqual(Array.from(questions, item => item.id), ['control_mode','visual_style','target_duration_seconds','remix_allowed']);
  answers = workflow.answerQuestion(answers, questions[0], null, true);
  assert.equal(answers.control_mode.used_default, true);
  assert.equal(answers.control_mode.value, '长按蓄力');
  assert.equal(workflow.buildQuestions(intent, answers).length, 3);
});

test('S3 filters all prohibited quick-mode Power tags and blocks conflicts or missing dependencies', () => {
  const workflow = loadWorkflow();
  const powers = [
    {id:'touch', title:'触控', tags:[]},
    {id:'connector', title:'外部连接器', tags:['external_connector']},
    {id:'attribution', title:'商业归因', tags:['commercial_attribution']},
    {id:'settlement', title:'品牌结算', tags:['brand_settlement']},
    {id:'reward', title:'外部奖励', tags:['external_reward']},
    {id:'social', title:'自动社交运营', tags:['auto_social_operation']},
    {id:'camera', title:'摄像头', conflicts:['vr'], permissions:['camera'], safe_fallback:'touch'},
    {id:'vr', title:'VR', conflicts:['camera'], permissions:['motion']},
    {id:'rank', title:'排行', dependencies:['anti_cheat']},
    {id:'anti_cheat', title:'反作弊'}
  ];
  assert.deepEqual(Array.from(workflow.filterPowersForMode(powers, 'quick'), item => item.id), ['touch','camera','vr','rank','anti_cheat']);
  const quick = workflow.evaluatePowerSet(['touch','connector','camera','vr','rank'], powers, 'quick');
  assert.equal(quick.can_generate, false);
  assert.ok(quick.blockers.some(item => item.type === 'quick_mode_forbidden'));
  assert.ok(quick.blockers.some(item => item.type === 'power_conflict'));
  assert.ok(quick.blockers.some(item => item.type === 'missing_dependency'));
  assert.ok(quick.safe_downgrade_power_ids.includes('anti_cheat'));
  assert.ok(!quick.safe_downgrade_power_ids.includes('connector'));
});

test('natural-language creation progress follows persisted workflow state instead of timer progress', () => {
  const workflow = loadWorkflow();
  const reading = workflow.buildCreationProgress({has_prompt:true, has_intent:true, processing_active:true, processing_stage:0});
  assert.equal(reading.title, '读取需求');
  assert.equal(reading.active_index, 0);
  assert.match(reading.detail, /本地草稿/);

  const composing = workflow.buildCreationProgress({has_prompt:true, has_intent:true, processing_active:true, processing_stage:3});
  assert.equal(composing.title, '生成问答与 Power 建议');
  assert.equal(composing.active_index, 2);
  assert.match(composing.detail, /安全的 Power/);

  const questions = workflow.buildCreationProgress({has_prompt:true, has_intent:true, answered_count:2, question_total:4});
  assert.equal(questions.title, '确认关键玩法');
  assert.equal(questions.active_index, 2);
  assert.match(questions.detail, /2 \/ 4/);
  assert.equal(questions.steps[0].className, 'is-done');
  assert.equal(questions.steps[2].className, 'is-active');

  const review = workflow.buildCreationProgress({has_prompt:true, has_intent:true, answered_count:4, review_ready:true});
  assert.equal(review.title, '等待 Review');
  assert.equal(review.active_index, 4);

  const testing = workflow.buildCreationProgress({generation_task:{status:'validating', stage_index:4}});
  assert.equal(testing.title, '测试中');
  assert.equal(testing.active_index, 6);
  assert.match(testing.detail, /成功、失败、重试、退出/);

  const offline = workflow.buildCreationProgress({generation_task:{status:'offline_waiting', stage_index:3, error:{message:'恢复网络后继续同一任务'}}});
  assert.equal(offline.blocked, true);
  assert.equal(offline.steps[5].className, 'is-blocked');
  assert.match(offline.detail, /同一任务/);

  const preview = workflow.buildCreationProgress({generation_task:{status:'preview_ready', stage_index:6}});
  assert.equal(preview.active_index, 7);
  assert.equal(preview.meta, '8 / 8');
  assert.equal(preview.steps[7].ariaCurrent, 'step');
});

test('model execution summary exposes verifiable local stages without claiming hidden reasoning or server approval', () => {
  const workflow = loadWorkflow();
  const thinking = workflow.buildModelExecution({
    has_prompt:true,
    has_intent:true,
    processing_active:true,
    processing_stage:2,
    selected_power_count:0
  });
  assert.equal(thinking.title, '正在思考');
  assert.equal(thinking.active_index, 2);
  assert.equal(thinking.rows[2].state, 'active');
  assert.equal(thinking.rows[0].output, '已提取结构化创作意图');
  assert.equal(thinking.rows[2].output, '正在组织关键问题');
  assert.equal(thinking.rows[3].output, '等待策略规划');
  assert.match(thinking.summary, /角色权限和安全约束/);

  const review = workflow.buildModelExecution({
    has_prompt:true,
    has_intent:true,
    answered_count:4,
    question_total:4,
    powers_checked:true,
    selected_power_count:2,
    review_ready:true,
    mode:'deep'
  });
  assert.equal(review.title, '等待 Review 确认');
  assert.equal(review.active_index, 4);
  assert.equal(review.rows.length, 8);
  assert.equal(review.rows[3].output, '2 项 Power 已编排');
  assert.equal(review.rows[4].state, 'active');
  assert.match(review.summary, /确认前不会创建生成任务/);

  const generating = workflow.buildModelExecution({
    generation_task:{status:'generating', artifacts:{playable_config:{playable_id:'local-demo'}}},
    selected_power_count:2
  });
  assert.equal(generating.active_index, 6);
  assert.equal(generating.rows[5].state, 'done');
  assert.equal(generating.rows[6].state, 'active');
  assert.match(generating.rows[4].output, /外部审批未确认/);

  const preview = workflow.buildModelExecution({
    generation_task:{status:'preview_ready', artifacts:{playable_config:{}, validation_report:{passed:true}, preview_bundle:{build_id:'build_local'}}}
  });
  assert.equal(preview.completed, true);
  assert.equal(preview.meta, '8 / 8');
  assert.ok(preview.rows.every(row => row.state === 'done'));
  assert.match(preview.summary, /不代表审核、发布或服务器确认/);

  const blocked = workflow.buildModelExecution({generation_task:{status:'offline_waiting', error:{message:'等待网络恢复'}}});
  assert.equal(blocked.blocked, true);
  assert.equal(blocked.rows[5].state, 'blocked');
  assert.match(blocked.summary, /等待网络恢复/);
});

test('S5 uses deterministic stages, pauses offline, resumes the same task and builds real artifacts', () => {
  const workflow = loadWorkflow();
  const intent = workflow.extractIntent('可爱卡通跳一跳，长按蓄力，单手操作');
  const input = {draft_id:'draft_s5', mode:'quick', title:'快乐跳一跳', description:intent.source_text, intent, answers:{}, power_ids:['touch'], asset_manifest:[], requires_network:true};
  const initial = workflow.createGenerationTask(input, []);
  const duplicate = workflow.createGenerationTask({...input, intent:{...intent, extracted_at:'later'}}, [initial]);
  assert.equal(duplicate.id, initial.id);

  const waiting = workflow.advanceGenerationTask(initial, {offline:true, requires_network:true});
  assert.equal(waiting.status, 'offline_waiting');
  const resumed = workflow.resumeGenerationTask(waiting);
  assert.equal(resumed.id, initial.id);
  const completed = advanceToPreview(workflow, resumed).task;
  assert.equal(completed.status, 'preview_ready');
  assert.equal(completed.progress, 100);
  assert.ok(completed.artifacts.plan);
  assert.ok(completed.artifacts.asset_manifest);
  assert.ok(completed.artifacts.playable_config);
  assert.equal(completed.artifacts.validation_report.passed, true);
  assert.ok(completed.artifacts.preview_bundle.version_id);
  assert.ok(completed.artifacts.preview_bundle.build_id);
});

test('S6-S9 versions Creative Patch, requires distinct review and creates immutable local-only release metadata', () => {
  const workflow = loadWorkflow();
  const patch = workflow.createCreativePatch({title:'旧标题', cta_destination:'airvana://old'}, {title:'新标题', cta_destination:'airvana://new'}, 'deep');
  assert.ok(patch.changed_fields.includes('title'));
  assert.ok(patch.locked_fields_changed.includes('cta_destination'));
  assert.equal(patch.requires_contract_revision, true);

  const review = workflow.createReviewRecord({mode:'quick', playable_id:'playable_1', version_id:'version_1', submitted_by:'creator_1', checks:{mobile_playability:true}});
  assert.equal(review.status, 'pending_review');
  assert.throws(() => workflow.resolveReview(review, 'approved', 'creator_1'), /cannot approve/i);
  const approved = workflow.resolveReview(review, 'approved', 'reviewer_2', '所有路径已验证');
  const release = workflow.createRelease({playable_id:'playable_1', version_id:'version_1', build_id:'build_1', review:approved});
  assert.ok(Object.isFrozen(release));
  assert.equal(release.review_id, review.review_id);
  assert.equal(release.status, 'published_local_demo');
  assert.equal(release.server_confirmed, false);
  assert.equal(release.message, '已发布到本机 Airvana 首页 · 本地演示');
  for (const key of ['release_id','playable_id','version_id','build_id','review_id','published_at','visibility','remix_policy','rollback_version_id']) assert.ok(Object.hasOwn(release, key));
});

test('S10 enforces every connector gate and keeps channel results independent', () => {
  const workflow = loadWorkflow();
  let telegram = workflow.createConnectorRecord('telegram');
  let x = workflow.createConnectorRecord('x');
  telegram = workflow.transitionConnector(telegram, 'connected_unapproved', {});
  assert.throws(() => workflow.transitionConnector(telegram, 'campaign_authorized', {contract_approved:false}), /Contract/);
  telegram = workflow.transitionConnector(telegram, 'campaign_authorized', {contract_approved:true});
  telegram = workflow.transitionConnector(telegram, 'selected', {channel_in_contract:true});
  assert.throws(() => workflow.transitionConnector(telegram, 'pending_confirmation', {asset_rights:false, copy_approved:true, region_passed:true}), /incomplete/);
  telegram = workflow.transitionConnector(telegram, 'pending_confirmation', {asset_rights:true, copy_approved:true, region_passed:true});
  assert.throws(() => workflow.transitionConnector(telegram, 'publishing', {user_confirmed:false}), /confirmation/);
  telegram = workflow.transitionConnector(telegram, 'publishing', {user_confirmed:true});
  telegram = workflow.transitionConnector(telegram, 'partial', {result:{posted:1, failed:1, server_confirmed:false}});
  assert.equal(telegram.status, 'partial');
  assert.equal(x.status, 'unconnected');
  assert.equal(telegram.server_confirmed, false);
});
