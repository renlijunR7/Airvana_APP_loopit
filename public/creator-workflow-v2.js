(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AirvanaCreatorWorkflow = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var VERSION = 2;
  var GENERATION_STAGES = Object.freeze([
    'queued',
    'planning',
    'preparing_assets',
    'generating',
    'validating',
    'building_preview',
    'preview_ready'
  ]);
  var GENERATION_EXCEPTION_STATES = Object.freeze([
    'paused', 'failed', 'cancelled', 'offline_waiting', 'permission_blocked'
  ]);
  var REVIEW_STATES = Object.freeze([
    'pending_review', 'approved', 'changes_required', 'rejected', 'expired'
  ]);
  var CONNECTOR_STATES = Object.freeze([
    'unconnected',
    'connected_unapproved',
    'campaign_authorized',
    'selected',
    'pending_confirmation',
    'publishing',
    'succeeded',
    'partial',
    'failed'
  ]);
  var QUICK_FORBIDDEN_TAGS = Object.freeze([
    'external_connector', 'commercial_attribution', 'brand_settlement',
    'external_reward', 'auto_social_operation'
  ]);
  var LOCKED_DEEP_FIELDS = Object.freeze([
    'brand_subject', 'campaign_objective', 'success_event', 'target_region',
    'target_audience', 'authorized_assets', 'cta_copy', 'cta_destination',
    'reward_rule', 'reward_owner', 'attribution_model', 'attribution_window',
    'settlement_basis', 'compliance_restrictions', 'distribution_connectors',
    'approver', 'kill_switch_owner'
  ]);
  var CREATION_PROGRESS_STEPS = Object.freeze([
    {id:'reading', label:'读取需求'},
    {id:'structuring', label:'梳理方案'},
    {id:'questions', label:'创作问答'},
    {id:'powers', label:'Power'},
    {id:'review', label:'Review'},
    {id:'generating', label:'生成作品'},
    {id:'testing', label:'测试中'},
    {id:'preview', label:'可预览'}
  ]);
  var MODEL_EXECUTION_STEPS = Object.freeze([
    {id:'intent', label:'意图解析'},
    {id:'context', label:'上下文加载'},
    {id:'strategy', label:'策略规划'},
    {id:'power', label:'Power 编排'},
    {id:'constraints', label:'约束预检'},
    {id:'config', label:'PlayableConfig'},
    {id:'validation', label:'路径验证'},
    {id:'build', label:'预览构建'}
  ]);

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function hashString(value) {
    var text = String(value == null ? '' : value);
    var hash = 2166136261;
    for (var index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function stableStringify(value) {
    if (value == null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
    return '{' + Object.keys(value).sort().map(function (key) {
      return JSON.stringify(key) + ':' + stableStringify(value[key]);
    }).join(',') + '}';
  }

  function stableId(prefix, value) {
    return String(prefix || 'id') + '_' + hashString(stableStringify(value));
  }

  function firstMatch(text, rules, fallback) {
    for (var index = 0; index < rules.length; index += 1) {
      if (rules[index][0].test(text)) return rules[index][1];
    }
    return fallback;
  }

  function extractIntent(text, options) {
    var source = String(text || '').trim();
    var config = options || {};
    var isJump = /跳一跳|跳跃|蓄力/.test(source);
    var isQuiz = /问答|知识|答题/.test(source);
    var type = firstMatch(source, [
      [/游戏|跳一跳|跳跃|闯关|合成|塔防|跑酷/, '互动游戏'],
      [/测评|问卷/, '互动测评'],
      [/故事|剧情/, '互动叙事']
    ], 'Agentic Playable');
    var control = firstMatch(source, [
      [/长按|蓄力/, '长按蓄力'],
      [/滑动|拖动/, '滑动或拖动'],
      [/点击|点按/, '点击操作'],
      [/单手/, '单手点击']
    ], isJump ? '长按蓄力' : '点击操作');
    var style = firstMatch(source, [
      [/可爱|卡通|萌/, '可爱卡通'],
      [/轻写实/, '轻写实'],
      [/像素/, '像素游戏'],
      [/赛博|霓虹/, '霓虹赛博'],
      [/国风|水墨/, '国风插画']
    ], '现代游戏插画');
    var target = firstMatch(source, [
      [/儿童|孩子|亲子/, '亲子与低龄玩家'],
      [/新用户|新手/, '新用户'],
      [/单手|通勤/, '移动端碎片时间玩家'],
      [/品牌|社区/, '品牌社区玩家']
    ], '移动端休闲玩家');
    var durationMatch = source.match(/(\d+)\s*(秒|分钟|分)/);
    var durationSeconds = durationMatch
      ? Number(durationMatch[1]) * (durationMatch[2] === '秒' ? 1 : 60)
      : (isJump ? 60 : 90);
    var mechanic = isJump ? '蓄力跳跃并落到连续平台' : isQuiz ? '完成分步问答并即时反馈' : '完成短局互动挑战';
    var recommended = isJump
      ? ['tapHoldControl', 'retryState', 'scoreFeedback', 'mobilePortrait']
      : ['tapControl', 'retryState', 'scoreFeedback'];
    if (/图片|视觉|卡通|插画/.test(source)) recommended.push('imageAssets');
    return {
      schema_version: VERSION,
      source_text: source,
      work_type: type,
      target_players: target,
      core_mechanic: mechanic,
      control_mode: control,
      visual_style: style,
      target_duration_seconds: durationSeconds,
      success_condition: isJump ? '连续完成 6 次有效落点' : '完成全部目标并进入结果页',
      failure_condition: isJump ? '落点超出平台或机会耗尽' : '机会耗尽或主动退出',
      retry_condition: '失败后可从本局起点立即重试',
      recommended_power_ids: recommended.slice(0, 6),
      remix_default: config.remix_default === true,
      extracted_at: new Date().toISOString()
    };
  }

  function buildQuestions(intent, answers) {
    var current = answers || {};
    var fields = [
      {id:'control_mode', prompt:'希望使用长按蓄力还是点击跳跃？', options:['长按蓄力','点击跳跃'], default_value:intent.control_mode || '长按蓄力'},
      {id:'visual_style', prompt:'偏好可爱卡通还是轻写实风格？', options:['可爱卡通','轻写实'], default_value:intent.visual_style || '可爱卡通'},
      {id:'target_duration_seconds', prompt:'一局预计持续多久？', options:['30 秒','60 秒','90 秒'], default_value:String(intent.target_duration_seconds || 60) + ' 秒'},
      {id:'remix_allowed', prompt:'是否允许其他用户 Remix？', options:['不允许','允许'], default_value:intent.remix_default ? '允许' : '不允许'}
    ];
    return fields.filter(function (question) {
      return !Object.prototype.hasOwnProperty.call(current, question.id);
    }).slice(0, 4);
  }

  function answerQuestion(answers, question, value, useDefault) {
    var next = Object.assign({}, answers || {});
    var resolved = useDefault ? question.default_value : value;
    next[question.id] = {
      value: resolved,
      used_default: !!useDefault,
      default_value: question.default_value
    };
    return next;
  }

  function buildCreationProgress(input) {
    var source = input || {};
    var task = source.generation_task || null;
    var status = task && task.status || '';
    var answered = Math.max(0, Math.min(Number(source.question_total) || 4, Number(source.answered_count) || 0));
    var total = Math.max(1, Number(source.question_total) || 4);
    var activeIndex = 0;
    var title = '等待创意';
    var detail = '输入自然语言后，系统会读取需求并创建本地草稿。';
    var blocked = false;

    if (source.has_prompt) {
      title = '读取需求';
      detail = '正在识别作品类型、目标玩家、核心玩法、操作方式与视觉风格。';
    }
    if (source.has_prompt && source.has_intent) {
      activeIndex = 2;
      title = '确认关键玩法';
      detail = '已完成 ' + answered + ' / ' + total + ' 个关键问题；未回答项会明确显示安全默认值。';
    }
    if (source.review_ready) {
      activeIndex = 4;
      title = '等待 Review';
      detail = '需求结构、Power 与默认值已梳理完成，等待逐项确认。';
    }

    if (source.processing_active) {
      var processingStage = Math.max(0, Math.min(3, Number(source.processing_stage) || 0));
      var processingTitles = ['读取需求', '解析创作意图', '加载创作上下文', '生成问答与 Power 建议'];
      var processingDetails = [
        '正在读取语言描述与输入来源，并保留当前本地草稿。',
        '正在提取作品类型、目标玩家、核心玩法、操作方式与视觉风格。',
        '正在加载本地草稿、模板、权限边界与安全约束。',
        '正在生成只影响玩法或发布结果的关键问答，并编排安全的 Power 建议。'
      ];
      activeIndex = processingStage < 2 ? 0 : processingStage === 2 ? 1 : 2;
      title = processingTitles[processingStage];
      detail = processingDetails[processingStage];
    }

    if (task) {
      var generationTitles = {
        queued:'任务已创建',
        planning:'梳理生成方案',
        preparing_assets:'检查素材',
        generating:'生成可玩版本',
        validating:'测试中',
        building_preview:'构建预览',
        preview_ready:'预览已就绪',
        paused:'生成已暂停',
        failed:'生成失败',
        cancelled:'生成已取消',
        offline_waiting:'等待网络恢复',
        permission_blocked:'权限阻断'
      };
      var generationDetails = {
        queued:'已创建唯一生成任务，正在等待进入规划阶段。',
        planning:'正在把已确认需求整理成可执行玩法方案。',
        preparing_assets:'正在核对素材清单、授权状态与安全降级策略。',
        generating:'正在构建可运行的玩法配置与交互状态。',
        validating:'正在验证成功、失败、重试、退出与权限降级路径。',
        building_preview:'本地测试已完成，正在构建可交互预览。',
        preview_ready:'版本已完成本地测试，可以进入试玩预览。',
        paused:'任务已暂停；恢复后会继续同一任务，不会重复创建版本。',
        failed:'任务未完成；可以查看失败原因并从当前草稿重试。',
        cancelled:'任务已取消，但需求、问答、Power 与草稿仍然保留。',
        offline_waiting:'当前需要网络的阶段已安全等待；网络恢复后继续同一任务。',
        permission_blocked:'当前权限不足，补齐权限后才能继续生成。'
      };
      if (status === 'preview_ready') activeIndex = 7;
      else if (status === 'validating' || status === 'building_preview' || Number(task.stage_index) >= 4) activeIndex = 6;
      else activeIndex = 5;
      title = generationTitles[status] || '生成任务进行中';
      detail = task.error && task.error.message || generationDetails[status] || '正在按照本地任务状态继续创作。';
      blocked = ['paused','failed','cancelled','offline_waiting','permission_blocked'].indexOf(status) >= 0;
    }

    var steps = CREATION_PROGRESS_STEPS.map(function (step, index) {
      var className = index < activeIndex ? 'is-done' : index === activeIndex ? (blocked ? 'is-blocked' : 'is-active') : 'is-waiting';
      return {
        id:step.id,
        label:step.label,
        className:className,
        icon:index < activeIndex ? '✓' : index === activeIndex ? (blocked ? '!' : '●') : '○',
        ariaCurrent:index === activeIndex ? 'step' : 'false'
      };
    });
    return {
      title:title,
      detail:detail,
      meta:String(Math.min(activeIndex + 1, CREATION_PROGRESS_STEPS.length)) + ' / ' + CREATION_PROGRESS_STEPS.length,
      active_index:activeIndex,
      blocked:blocked,
      steps:steps
    };
  }

  function buildModelExecution(input) {
    var source = input || {};
    var task = source.generation_task || null;
    var status = task && task.status || '';
    var answered = Math.max(0, Math.min(Number(source.question_total) || 4, Number(source.answered_count) || 0));
    var total = Math.max(1, Number(source.question_total) || 4);
    var selectedPowerCount = Math.max(0, Number(source.selected_power_count) || 0);
    var activeIndex = 0;
    var completedAll = false;
    var blocked = false;
    var title = '等待创意输入';
    var summary = '输入创意后，系统会生成结构化摘要并展示可核验的本地执行步骤。';

    if (source.has_prompt) {
      title = '正在提取创作意图';
      summary = '正在识别作品类型、目标玩家、核心玩法、操作方式与视觉风格。';
    }
    if (source.has_prompt && source.has_intent) {
      activeIndex = 2;
      title = '正在组织创作策略';
      summary = '已提取结构化意图并加载本地草稿与安全策略；正在根据 ' + answered + ' / ' + total + ' 个关键答案补全玩法方案。';
    }
    if (source.powers_checked && answered >= total) activeIndex = Math.max(activeIndex, 4);
    if (source.review_ready) {
      activeIndex = 4;
      title = '等待 Review 确认';
      summary = '需求、问答与 Power 已整理；约束预检等待你逐项确认，确认前不会创建生成任务。';
    }

    if (source.processing_active) {
      var processingStage = Math.max(0, Math.min(3, Number(source.processing_stage) || 0));
      var processingSummaries = [
        '正在读取语言描述、参考输入与当前本地草稿，不会在此阶段创建发布结果。',
        '正在提取作品类型、目标玩家、核心玩法、操作方式、视觉风格与成功条件。',
        '正在加载本地草稿、模板、角色权限和安全约束；不会调用外部发布连接器。',
        '正在生成关键问答与 Power 建议，并检查快速模式禁用能力和冲突项。'
      ];
      activeIndex = processingStage;
      title = '正在思考';
      summary = processingSummaries[processingStage];
    }

    if (task) {
      blocked = ['paused','failed','cancelled','offline_waiting','permission_blocked'].indexOf(status) >= 0;
      if (status === 'preview_ready') {
        activeIndex = MODEL_EXECUTION_STEPS.length - 1;
        completedAll = true;
        title = '本地执行链路已完成';
        summary = 'PlayableConfig、关键路径验证与确定性预览构建均已完成；该结果仍是本地演示，不代表审核、发布或服务器确认。';
      } else if (status === 'validating' || status === 'building_preview') {
        activeIndex = 7;
        title = status === 'validating' ? '正在完成验证并准备预览' : '正在构建本地预览';
        summary = '结构化配置已生成，正在验证成功、失败、重试与退出路径，并构建确定性本地预览。';
      } else if (status === 'generating') {
        activeIndex = 6;
        title = '正在验证结构化配置';
        summary = 'PlayableConfig 已生成，正在执行移动端与状态机路径验证。';
      } else {
        activeIndex = 5;
        title = blocked ? '本地执行已暂停' : '正在生成结构化配置';
        summary = task.error && task.error.message || 'Review 已转为唯一生成任务；正在生成可审计的 PlayableConfig。';
      }
    }

    var defaultOutputs = [
      source.has_intent ? '结构化意图已生成' : '等待识别创作目标',
      source.has_intent ? (source.mode === 'deep' ? '已加载 KOL、模板与 Campaign 约束' : '已加载本地草稿与安全策略') : '等待意图解析',
      source.has_intent ? ('关键问答 ' + answered + ' / ' + total) : '等待上下文',
      source.powers_checked ? (selectedPowerCount ? selectedPowerCount + ' 项 Power 已编排' : '未选 Power，采用安全默认能力') : '等待策略规划',
      task ? '本地规则已检查 · 外部审批未确认' : source.review_ready ? '等待 Review 确认' : '等待需求确认',
      task && task.artifacts && task.artifacts.playable_config ? 'PlayableConfig 已生成' : '等待生成结构化配置',
      task && task.artifacts && task.artifacts.validation_report ? '关键状态路径已验证' : '等待配置生成',
      task && task.artifacts && task.artifacts.preview_bundle ? '本地预览包已构建' : '等待路径验证'
    ];
    if (source.processing_active) {
      var processingActiveOutputs = ['正在解析语言描述', '正在加载本地上下文', '正在组织关键问题', '正在检查能力依赖与冲突'];
      var processingDoneOutputs = ['已提取结构化创作意图', '已载入本地草稿与安全策略', '已生成关键问答骨架', '已完成安全 Power 初筛'];
      var processingWaitingOutputs = ['等待语言描述', '等待意图解析', '等待上下文加载', '等待策略规划'];
      defaultOutputs = defaultOutputs.map(function (output, index) {
        if (index > 3) return output;
        if (index < activeIndex) return processingDoneOutputs[index];
        if (index === activeIndex) return processingActiveOutputs[index];
        return processingWaitingOutputs[index];
      });
    }
    var rows = MODEL_EXECUTION_STEPS.map(function (step, index) {
      var rowState = completedAll || index < activeIndex ? 'done' : index === activeIndex ? (blocked ? 'blocked' : 'active') : 'waiting';
      return {
        id:step.id,
        label:step.label,
        output:defaultOutputs[index],
        state:rowState,
        className:'creator-model-execution__step is-' + rowState,
        icon:rowState === 'done' ? '✓' : rowState === 'active' ? '●' : rowState === 'blocked' ? '!' : '○',
        statusLabel:rowState === 'done' ? '完成' : rowState === 'active' ? '执行中' : rowState === 'blocked' ? '已暂停' : '等待'
      };
    });
    return {
      title:title,
      summary:summary,
      meta:(completedAll ? MODEL_EXECUTION_STEPS.length : activeIndex + 1) + ' / ' + MODEL_EXECUTION_STEPS.length,
      active_index:activeIndex,
      blocked:blocked,
      completed:completedAll,
      rows:rows
    };
  }

  function normalizePower(power) {
    var item = power || {};
    return {
      id: String(item.id || ''),
      title: item.title || item.id || '未命名能力',
      tags: Array.isArray(item.tags) ? item.tags.slice() : [],
      conflicts: Array.isArray(item.conflicts) ? item.conflicts.slice() : [],
      dependencies: Array.isArray(item.dependencies) ? item.dependencies.slice() : [],
      permissions: Array.isArray(item.permissions) ? item.permissions.slice() : [],
      services: Array.isArray(item.services) ? item.services.slice() : [],
      safe_fallback: item.safe_fallback || null
    };
  }

  function isQuickForbidden(power) {
    var item = normalizePower(power);
    return item.tags.some(function (tag) { return QUICK_FORBIDDEN_TAGS.indexOf(tag) >= 0; });
  }

  function filterPowersForMode(powers, mode) {
    var list = (powers || []).map(normalizePower);
    return mode === 'quick' ? list.filter(function (power) { return !isQuickForbidden(power); }) : list;
  }

  function evaluatePowerSet(selectedIds, powers, mode, context) {
    var list = filterPowersForMode(powers, mode);
    var byId = {};
    (powers || []).map(normalizePower).forEach(function (power) { byId[power.id] = power; });
    var selected = (selectedIds || []).filter(function (id, index, array) { return id && array.indexOf(id) === index; });
    var blockers = [];
    var warnings = [];
    var forbidden = selected.filter(function (id) { return mode === 'quick' && byId[id] && isQuickForbidden(byId[id]); });
    forbidden.forEach(function (id) {
      blockers.push({type:'quick_mode_forbidden', power_id:id, message:'快速模式不允许使用“' + byId[id].title + '”。'});
    });
    selected.forEach(function (id) {
      var power = byId[id];
      if (!power) {
        blockers.push({type:'unknown_power', power_id:id, message:'能力 ' + id + ' 不存在。'});
        return;
      }
      power.conflicts.forEach(function (otherId) {
        if (selected.indexOf(otherId) >= 0 && id < otherId) {
          blockers.push({type:'power_conflict', power_id:id, other_power_id:otherId, message:power.title + ' 与 ' + (byId[otherId] ? byId[otherId].title : otherId) + ' 冲突。'});
        }
      });
      power.dependencies.forEach(function (dependency) {
        if (selected.indexOf(dependency) < 0) blockers.push({type:'missing_dependency', power_id:id, dependency_id:dependency, message:power.title + ' 缺少依赖 ' + dependency + '。'});
      });
      if ((context || {}).offline && power.services.length) warnings.push({type:'offline_service', power_id:id, message:power.title + ' 将使用本地安全降级。'});
    });
    var safeIds = selected.filter(function (id) {
      if (!byId[id] || (mode === 'quick' && isQuickForbidden(byId[id]))) return false;
      return !blockers.some(function (blocker) { return blocker.power_id === id && blocker.type === 'power_conflict'; });
    });
    blockers.filter(function (item) { return item.type === 'missing_dependency'; }).forEach(function (item) {
      if (byId[item.dependency_id] && safeIds.indexOf(item.dependency_id) < 0) safeIds.push(item.dependency_id);
    });
    return {
      allowed_power_ids: list.map(function (power) { return power.id; }),
      selected_power_ids: selected,
      blockers: blockers,
      warnings: warnings,
      can_generate: blockers.length === 0,
      safe_downgrade_power_ids: safeIds
    };
  }

  function createDraft(input, existingDraft) {
    var source = clone(input || {});
    var now = new Date().toISOString();
    var draftId = existingDraft && existingDraft.draft_id
      ? existingDraft.draft_id
      : stableId('draft', {text:source.description || source.source_text || '', created_at:now});
    return Object.assign({}, existingDraft || {}, source, {
      schema_version: VERSION,
      draft_id: draftId,
      status: 'draft',
      created_at: existingDraft && existingDraft.created_at || now,
      updated_at: now,
      server_confirmed: false
    });
  }

  function taskFingerprint(input) {
    var source = input || {};
    var intent = clone(source.intent || {});
    delete intent.extracted_at;
    return hashString(stableStringify({
      draft_id:source.draft_id,
      mode:source.mode,
      description:source.description,
      intent:intent,
      answers:source.answers,
      power_ids:source.power_ids,
      contract_version:source.contract_version,
      asset_manifest:source.asset_manifest,
      creative_patch_id:source.creative_patch_id,
      base_version_id:source.base_version_id
    }));
  }

  function createGenerationTask(input, existingTasks) {
    var fingerprint = taskFingerprint(input);
    var active = (existingTasks || []).find(function (task) {
      return task.fingerprint === fingerprint && GENERATION_STAGES.indexOf(task.status) >= 0 && task.status !== 'preview_ready';
    });
    if (active) return clone(active);
    var now = new Date().toISOString();
    return {
      schema_version: VERSION,
      id: stableId('gen', {fingerprint:fingerprint, draft_id:input && input.draft_id}),
      draft_id: input && input.draft_id || null,
      campaign_id: input && input.campaign_id || null,
      contract_version: input && input.contract_version || null,
      mode: input && input.mode || 'quick',
      fingerprint: fingerprint,
      status: 'queued',
      stage_index: 0,
      progress: 0,
      attempt: 1,
      artifacts: {},
      input: clone(input || {}),
      created_at: now,
      updated_at: now,
      server_confirmed: false
    };
  }

  function buildArtifactForStage(task, stage) {
    var input = task.input || {};
    var intent = input.intent || {};
    var ids = input.power_ids || [];
    if (stage === 'planning') return {key:'plan', value:{
      work_type:intent.work_type,
      core_loop:intent.core_mechanic,
      controls:intent.control_mode,
      success:intent.success_condition,
      failure:intent.failure_condition,
      retry:intent.retry_condition,
      power_ids:ids.slice()
    }};
    if (stage === 'preparing_assets') return {key:'asset_manifest', value:{
      manifest_id:stableId('manifest', {task:task.id, assets:input.asset_manifest || []}),
      assets:clone(input.asset_manifest || []),
      authorization_status:input.asset_authorization_status || 'local_demo_only'
    }};
    if (stage === 'generating') return {key:'playable_config', value:{
      playable_id:input.playable_id || stableId('playable', task.draft_id || task.id),
      title:input.title || '未命名 Agentic Playable',
      description:input.description || '',
      mechanic:intent.core_mechanic,
      control:intent.control_mode,
      visual_style:intent.visual_style,
      target_duration_seconds:intent.target_duration_seconds,
      success_condition:intent.success_condition,
      failure_condition:intent.failure_condition,
      retry_condition:intent.retry_condition,
      power_ids:ids.slice(),
      event_schema:['playable_start','playable_success','playable_failure','playable_retry','playable_exit']
    }};
    if (stage === 'validating') return {key:'validation_report', value:{
      passed:true,
      checks:['success_path','failure_path','retry_path','exit_path','mobile_portrait','permission_fallback'],
      checked_at:new Date().toISOString()
    }};
    if (stage === 'building_preview') return {key:'preview_bundle', value:{
      build_id:stableId('build', {task:task.id, config:task.artifacts.playable_config}),
      version_id:stableId('version', {draft:task.draft_id, attempt:task.attempt, fingerprint:task.fingerprint}),
      runtime:'airvana-local-deterministic-v2',
      interactive:true
    }};
    if (stage === 'preview_ready') return {key:'completion', value:{ready:true, completed_at:new Date().toISOString()}};
    return {key:'queued', value:{ready:true}};
  }

  function advanceGenerationTask(currentTask, context) {
    var task = clone(currentTask);
    var environment = context || {};
    if (!task || !task.id) throw new Error('Generation task is required');
    if (task.status === 'cancelled' || task.status === 'preview_ready') return task;
    if (environment.permission_blocked) {
      task.status = 'permission_blocked';
      task.error = {code:'permission_blocked', message:environment.permission_message || '缺少生成所需权限。'};
      task.updated_at = new Date().toISOString();
      return task;
    }
    if (environment.offline && environment.requires_network) {
      task.status = 'offline_waiting';
      task.error = {code:'offline_waiting', message:'网络恢复后将从当前阶段继续，不会新建版本。'};
      task.updated_at = new Date().toISOString();
      return task;
    }
    var currentIndex = GENERATION_STAGES.indexOf(task.status);
    if (currentIndex < 0) currentIndex = Math.max(0, Number(task.stage_index) || 0);
    var nextIndex = Math.min(GENERATION_STAGES.length - 1, currentIndex + 1);
    var nextStage = GENERATION_STAGES[nextIndex];
    var artifact = buildArtifactForStage(task, nextStage);
    task.artifacts = Object.assign({}, task.artifacts || {});
    task.artifacts[artifact.key] = artifact.value;
    task.status = nextStage;
    task.stage_index = nextIndex;
    task.progress = Math.round((nextIndex / (GENERATION_STAGES.length - 1)) * 100);
    task.error = null;
    task.updated_at = new Date().toISOString();
    if (nextStage === 'preview_ready') task.completed_at = task.updated_at;
    return task;
  }

  function resumeGenerationTask(currentTask) {
    var task = clone(currentTask);
    if (!task) return null;
    if (GENERATION_EXCEPTION_STATES.indexOf(task.status) >= 0 && task.status !== 'cancelled') {
      task.status = GENERATION_STAGES[Math.max(0, Number(task.stage_index) || 0)] || 'queued';
      task.error = null;
      task.updated_at = new Date().toISOString();
    }
    return task;
  }

  function retryGenerationTask(currentTask) {
    var task = resumeGenerationTask(currentTask);
    if (!task) return null;
    task.attempt = Math.max(1, Number(task.attempt) || 1) + 1;
    return task;
  }

  function cancelGenerationTask(currentTask) {
    var task = clone(currentTask);
    if (!task) return null;
    task.status = 'cancelled';
    task.cancelled_at = new Date().toISOString();
    task.updated_at = task.cancelled_at;
    return task;
  }

  function createCreativePatch(before, after, mode) {
    var left = before || {};
    var right = after || {};
    var keys = Object.keys(Object.assign({}, left, right)).filter(function (key) {
      return stableStringify(left[key]) !== stableStringify(right[key]);
    });
    var locked = (mode === 'deep' ? LOCKED_DEEP_FIELDS : []).filter(function (key) { return keys.indexOf(key) >= 0; });
    return {
      patch_id:stableId('patch', {before:left, after:right}),
      changed_fields:keys,
      locked_fields_changed:locked,
      requires_contract_revision:locked.length > 0,
      before:clone(left),
      after:clone(right),
      created_at:new Date().toISOString()
    };
  }

  function buildReviewChecks(mode, input) {
    var source = input || {};
    var quick = [
      ['content_safety','内容安全'],
      ['asset_integrity','素材完整性'],
      ['mobile_playability','移动端可玩性'],
      ['state_machine','状态机完整性'],
      ['permission_fallback','权限降级'],
      ['app_publish_metadata','站内发布信息']
    ];
    var deep = [
      ['contract_status','Campaign Contract 状态'],
      ['brand_authorization','品牌授权'],
      ['region_compliance','合规与地区'],
      ['cta_reward','CTA 与奖励'],
      ['attribution_events','归因事件'],
      ['connector_permissions','连接器权限'],
      ['publish_scope','发布范围'],
      ['rollback_kill_switch','回滚版本和 Kill Switch']
    ];
    return quick.concat(mode === 'deep' ? deep : []).map(function (definition) {
      var configured = source.checks && Object.prototype.hasOwnProperty.call(source.checks, definition[0])
        ? !!source.checks[definition[0]]
        : true;
      return {id:definition[0], title:definition[1], passed:configured};
    });
  }

  function createReviewRecord(input) {
    var source = input || {};
    var checks = buildReviewChecks(source.mode, source);
    return {
      review_id:stableId('review', {version_id:source.version_id, created_at:new Date().toISOString()}),
      playable_id:source.playable_id || null,
      version_id:source.version_id || null,
      contract_version:source.contract_version || null,
      status:'pending_review',
      checks:checks,
      submitted_by:source.submitted_by || null,
      reviewed_by:null,
      submitted_at:new Date().toISOString(),
      server_confirmed:false
    };
  }

  function resolveReview(review, resolution, reviewer, reason) {
    var next = clone(review);
    if (REVIEW_STATES.indexOf(resolution) < 0 || resolution === 'pending_review') throw new Error('Invalid review resolution');
    if (!reviewer) throw new Error('A distinct human reviewer is required');
    if (review && review.submitted_by && review.submitted_by === reviewer) throw new Error('Creator cannot approve their own release');
    next.status = resolution;
    next.reviewed_by = reviewer;
    next.review_reason = reason || '';
    next.reviewed_at = new Date().toISOString();
    return next;
  }

  function createRelease(input) {
    var source = input || {};
    if (!source.review || source.review.status !== 'approved') throw new Error('Approved review is required');
    var publishedAt = new Date().toISOString();
    return Object.freeze({
      release_id:stableId('release', {playable_id:source.playable_id, version_id:source.version_id, published_at:publishedAt}),
      playable_id:source.playable_id,
      version_id:source.version_id,
      build_id:source.build_id,
      review_id:source.review.review_id || source.review.id,
      published_at:publishedAt,
      visibility:source.visibility || 'public_view_only',
      remix_policy:source.remix_policy || 'disabled',
      rollback_version_id:source.rollback_version_id || null,
      status:'published_local_demo',
      source:'local-demo',
      server_confirmed:false,
      message:'已发布到本机 Airvana 首页 · 本地演示'
    });
  }

  function createConnectorRecord(channel) {
    return {
      channel:channel,
      status:'unconnected',
      history:[{status:'unconnected', at:new Date().toISOString()}],
      external_post_id:null,
      server_confirmed:false
    };
  }

  function transitionConnector(record, nextStatus, context) {
    var current = clone(record || createConnectorRecord((context || {}).channel || 'unknown'));
    var allowed = {
      unconnected:['connected_unapproved'],
      connected_unapproved:['campaign_authorized','unconnected'],
      campaign_authorized:['selected','connected_unapproved'],
      selected:['pending_confirmation','campaign_authorized'],
      pending_confirmation:['publishing','selected'],
      publishing:['succeeded','partial','failed']
    };
    if ((allowed[current.status] || []).indexOf(nextStatus) < 0) throw new Error('Invalid connector transition: ' + current.status + ' -> ' + nextStatus);
    var gate = context || {};
    if (nextStatus === 'campaign_authorized' && !gate.contract_approved) throw new Error('Campaign Contract must be approved');
    if (nextStatus === 'selected' && !gate.channel_in_contract) throw new Error('Channel is outside Contract scope');
    if (nextStatus === 'pending_confirmation' && (!gate.asset_rights || !gate.copy_approved || !gate.region_passed)) throw new Error('Connector governance checks are incomplete');
    if (nextStatus === 'publishing' && !gate.user_confirmed) throw new Error('Explicit user confirmation is required');
    current.status = nextStatus;
    current.updated_at = new Date().toISOString();
    current.history = (current.history || []).concat([{status:nextStatus, at:current.updated_at}]);
    if (nextStatus === 'succeeded' || nextStatus === 'partial' || nextStatus === 'failed') current.result = clone(gate.result || {});
    return current;
  }

  return Object.freeze({
    VERSION:VERSION,
    GENERATION_STAGES:GENERATION_STAGES,
    GENERATION_EXCEPTION_STATES:GENERATION_EXCEPTION_STATES,
    REVIEW_STATES:REVIEW_STATES,
    CONNECTOR_STATES:CONNECTOR_STATES,
    QUICK_FORBIDDEN_TAGS:QUICK_FORBIDDEN_TAGS,
    LOCKED_DEEP_FIELDS:LOCKED_DEEP_FIELDS,
    CREATION_PROGRESS_STEPS:CREATION_PROGRESS_STEPS,
    MODEL_EXECUTION_STEPS:MODEL_EXECUTION_STEPS,
    hashString:hashString,
    stableId:stableId,
    extractIntent:extractIntent,
    buildQuestions:buildQuestions,
    answerQuestion:answerQuestion,
    buildCreationProgress:buildCreationProgress,
    buildModelExecution:buildModelExecution,
    filterPowersForMode:filterPowersForMode,
    evaluatePowerSet:evaluatePowerSet,
    createDraft:createDraft,
    taskFingerprint:taskFingerprint,
    createGenerationTask:createGenerationTask,
    advanceGenerationTask:advanceGenerationTask,
    resumeGenerationTask:resumeGenerationTask,
    retryGenerationTask:retryGenerationTask,
    cancelGenerationTask:cancelGenerationTask,
    createCreativePatch:createCreativePatch,
    buildReviewChecks:buildReviewChecks,
    createReviewRecord:createReviewRecord,
    resolveReview:resolveReview,
    createRelease:createRelease,
    createConnectorRecord:createConnectorRecord,
    transitionConnector:transitionConnector
  });
});
