(function (root) {
  'use strict';

  const SCHEMA_VERSION = 6;
  const STORAGE_KEY = 'airvana.mobile-business.v6';
  const LEGACY_KEYS = Object.freeze(['airvana.mobile-business.v5', 'airvana.mobile-business.v4', 'airvana.mobile-business.v3', 'airvana.v5.agentic-positioning.v2']);
  const MAX_AUDIT_EVENTS = 1000;
  const MAX_GAME_RUNS = 500;
  const RUNTIME_EVENT_NAMES = Object.freeze([
    'impression', 'play_start', 'valid_interaction', 'level_start', 'level_complete',
    'play_complete', 'play_fail', 'replay', 'share', 'share_intent', 'share_confirmed',
    'cta_view', 'cta_click', 'pause', 'resume', 'play_exit', 'error'
  ]);
  const REPOSITORY_INTERFACES = Object.freeze({
    campaign: Object.freeze(['load', 'save', 'release', 'pause', 'rollback']),
    attribution: Object.freeze(['appendEvent', 'buildReport', 'confirmSuccessEvent']),
    settlement: Object.freeze(['submitReview', 'resolveReview', 'loadLedger']),
    governance: Object.freeze(['submitReport', 'submitAppeal', 'takedown', 'restore', 'setKillSwitch']),
    identity: Object.freeze(['loadStatus', 'requestVerification']),
    wallet: Object.freeze(['validateAddress', 'createChallenge', 'verifySignature', 'setPrimary', 'disable'])
  });
  const LOCAL_REPOSITORY_INTERFACES = Object.freeze({
    playable: Object.freeze(['list', 'get', 'updateStatus']),
    draft: Object.freeze(['list', 'get', 'create', 'update', 'copy', 'remove', 'restore']),
    saved: Object.freeze(['list', 'get', 'upsert', 'remove']),
    gameRun: Object.freeze(['list', 'get', 'create', 'remove', 'clearForPlayable', 'clearAll'])
  });

  const ROLE_PERMISSIONS = Object.freeze({
    player: Object.freeze([
      'profile.read', 'profile.update_local', 'playable.read', 'playable.play_local',
      'social.like_local', 'social.comment_local', 'social.save_local',
      'social.share_intent', 'social.follow_local', 'message.send_local',
      'playable.create_app_local'
    ]),
    kol: Object.freeze([
      'profile.read', 'profile.update_local', 'playable.read', 'playable.play_local',
      'social.like_local', 'social.comment_local', 'social.save_local',
      'social.share_intent', 'social.follow_local', 'message.send_local',
      'playable.create_app_local', 'campaign.create_local', 'brief.edit_local',
      'contract.edit_unlocked_local', 'asset_manifest.manage_local',
      'generation.run_local', 'review.submit_local', 'release.publish_home_local',
      'release.pause_local', 'release.rollback_local'
    ])
  });

  const COMMON_STATE_KINDS = Object.freeze(['idle', 'loading', 'ready', 'empty', 'error', 'offline', 'permission']);
  const COMMON_STATE_COPY = Object.freeze({
    idle: ['等待开始', '当前模块尚未开始加载。'],
    loading: ['正在加载', '正在从本机恢复业务数据，请稍候。'],
    ready: ['本机状态正常', '本地业务数据已就绪。'],
    empty: ['暂无内容', '完成一次操作后，记录会出现在这里。'],
    error: ['出现错误', '本地操作未完成，请重试或恢复默认环境。'],
    offline: ['当前为离线模式', '本地草稿和离线游戏仍可使用，需要服务确认的入口保持锁定。'],
    permission: ['权限不足', '当前角色不能执行此操作，可切换角色或完成身份开通。']
  });

  function nowIso() {
    return new Date().toISOString();
  }

  function cleanPrefix(value) {
    return String(value || 'obj').toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'obj';
  }

  function hashString(value) {
    let hash = 2166136261;
    const text = String(value == null ? '' : value);
    for (let index = 0; index < text.length; index += 1) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
    return (hash >>> 0).toString(36);
  }

  function id(prefix, seed) {
    const safePrefix = cleanPrefix(prefix);
    if (seed !== undefined && seed !== null && String(seed).trim()) return safePrefix + '_' + hashString(String(seed));
    return safePrefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function ensureId(value, prefix, seed) {
    const text = String(value == null ? '' : value).trim();
    if (text && /^[a-z][a-z0-9_:-]{2,}$/i.test(text)) return text;
    return id(prefix, seed == null ? text : seed);
  }

  function unique(values) {
    return [...new Set((Array.isArray(values) ? values : []).filter(Boolean))];
  }

  function rolePermissions(role) {
    return [...(ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.player)];
  }

  function normalizeUser(profile, role) {
    const activeRoleId = role === 'kol' ? 'kol' : 'player';
    const name = String((profile && profile.name) || 'Local User').trim() || 'Local User';
    return {
      id: ensureId(profile && profile.id, 'usr', name.toLowerCase()),
      name,
      bio: String((profile && profile.bio) || ''),
      handle: String((profile && profile.handle) || '@kai.builds'),
      active_role_id: activeRoleId,
      role_ids: unique(['player', activeRoleId]),
      permission_ids: rolePermissions(activeRoleId),
      source: 'local-demo',
      server_confirmed: false
    };
  }

  function commonState(kind, overrides) {
    const safeKind = COMMON_STATE_KINDS.includes(kind) ? kind : 'idle';
    const copy = COMMON_STATE_COPY[safeKind];
    return {
      kind: safeKind,
      title: copy[0],
      description: copy[1],
      retryable: safeKind === 'error' || safeKind === 'offline',
      updated_at: nowIso(),
      ...(overrides || {})
    };
  }

  function auditEvent(eventName, context) {
    const input = context || {};
    const properties = {...(input.properties || {})};
    return {
      event_id: ensureId(input.event_id, 'evt'),
      event_name: String(eventName || 'unknown_local_event'),
      event_time: input.event_time || nowIso(),
      actor_user_id: input.actor_user_id || null,
      actor_role_id: input.actor_role_id || null,
      object_type: input.object_type || null,
      object_id: input.object_id || null,
      campaign_id: input.campaign_id || properties.campaign_id || null,
      contract_version: input.contract_version || properties.contract_version || null,
      playable_id: input.playable_id || properties.playable_id || null,
      playable_config_version: input.playable_config_version || properties.playable_config_version || null,
      build_id: input.build_id || 'airvana-v5-local-mobile',
      creative_id: input.creative_id || properties.creative_id || null,
      channel_id: input.channel_id || properties.channel_id || 'airvana-mobile-local',
      kol_id: Object.prototype.hasOwnProperty.call(input, 'kol_id') ? input.kol_id : (properties.kol_id || null),
      link_id: input.link_id || properties.link_id || null,
      session_id: input.session_id || null,
      run_id: input.run_id || properties.run_id || null,
      privacy_safe_user_id: null,
      locale: input.locale || 'zh-CN',
      region: input.region || properties.region_bucket || null,
      device_class: 'mobile',
      consent_state: 'local-demo',
      source: 'local-demo',
      server_confirmed: false,
      on_chain_confirmed: false,
      properties: {...properties, server_confirmed: false, source: 'local-demo'}
    };
  }

  function runtimeEvent(eventName, context) {
    if (!RUNTIME_EVENT_NAMES.includes(eventName)) throw new Error('unsupported-runtime-event:' + eventName);
    const event = auditEvent(eventName, context);
    return {...event, object_type: 'playable_runtime', runtime_event: true};
  }

  function eventSessionCount(events, name) {
    return new Set(events.filter(event => event.event_name === name).map(event => event.session_id || event.run_id || event.event_id)).size;
  }

  function buildAttributionReport(input) {
    const source = input || {};
    const campaignId = source.campaign_id || null;
    const playableId = source.playable_id || null;
    const allEvents = Array.isArray(source.events) ? source.events : [];
    const events = allEvents.filter(event => event && event.runtime_event === true && (!campaignId || event.campaign_id === campaignId) && (!playableId || event.playable_id === playableId));
    const eventIds = events.map(event => event.event_id).filter(Boolean);
    const duplicateCount = eventIds.length - new Set(eventIds).size;
    const missingIdentityCount = events.filter(event => !event.session_id || !event.playable_id).length;
    const approvedSuccessEvent = source.success_event || 'approved_success_event';
    const confirmedSuccessEvents = events.filter(event => event.event_name === approvedSuccessEvent && event.server_confirmed === true);
    const localSuccessIntents = events.filter(event => event.event_name === approvedSuccessEvent && event.server_confirmed !== true);
    const funnelNames = ['impression', 'play_start', 'valid_interaction', 'play_complete', 'cta_view', 'cta_click'];
    const funnel = funnelNames.map(name => ({event_name: name, unique_sessions: eventSessionCount(events, name), source: 'local-demo'}));
    return {
      id: ensureId(source.id, 'atr', (campaignId || 'none') + ':' + (playableId || 'none') + ':' + nowIso()),
      campaign_id: campaignId,
      contract_version: source.contract_version || null,
      playable_id: playableId,
      attribution_model: source.attribution_model || 'contract-required',
      attribution_window: source.attribution_window || 'contract-required',
      success_event: approvedSuccessEvent,
      funnel,
      local_event_count: events.length,
      confirmed_success_count: confirmedSuccessEvents.length,
      local_success_intent_count: localSuccessIntents.length,
      data_quality: {
        duplicate_event_count: duplicateCount,
        missing_identity_count: missingIdentityCount,
        server_confirmation_match_count: confirmedSuccessEvents.length,
        complete_for_settlement: confirmedSuccessEvents.length > 0 && duplicateCount === 0 && missingIdentityCount === 0
      },
      status: confirmedSuccessEvents.length ? 'contains-server-confirmed-events' : 'local-only-unverified',
      generated_at: nowIso(),
      source: 'local-demo',
      server_confirmed: false
    };
  }

  function buildThreeLedgers(input) {
    const source = input || {};
    const rights = Array.isArray(source.player_rights) ? source.player_rights : [];
    const attribution = Array.isArray(source.kol_attribution) ? source.kol_attribution : [];
    const settlement = Array.isArray(source.commercial_settlement) ? source.commercial_settlement : [];
    return {
      player_rights: {
        id: 'ledger_player_rights_local',
        title: '玩家权益账本',
        unit: 'AIP / 站内权益',
        entries: rights,
        transferable: false,
        cash_value: null,
        source: 'local-demo'
      },
      kol_attribution: {
        id: 'ledger_kol_attribution_local',
        title: 'KOL 归因账本',
        unit: '事件与归因状态',
        entries: attribution,
        confirmed_count: attribution.filter(item => item.server_confirmed === true).length,
        source: 'local-demo'
      },
      commercial_settlement: {
        id: 'ledger_commercial_settlement_local',
        title: '品牌商业结算账本',
        unit: '复核状态',
        entries: settlement,
        amount: null,
        currency: null,
        source: 'local-demo'
      }
    };
  }

  function buildSettlementReview(input) {
    const source = input || {};
    return {
      id: ensureId(source.id, 'stl', (source.campaign_id || 'none') + ':' + nowIso()),
      campaign_id: source.campaign_id || null,
      playable_id: source.playable_id || null,
      contract_version: source.contract_version || null,
      attribution_report_id: source.attribution_report_id || null,
      status: source.status || 'pending-local-review',
      checks: Array.isArray(source.checks) ? source.checks : [],
      review_trail: Array.isArray(source.review_trail) ? source.review_trail : [],
      amount: null,
      currency: null,
      source_of_truth: 'local-demo-unverified',
      server_confirmed: false,
      updated_at: nowIso()
    };
  }

  function buildReusableAsset(input) {
    const source = input || {};
    const sourcePlayableId = source.source_playable_id || source.playable_id || null;
    return {
      id: ensureId(source.id, 'rsa', (sourcePlayableId || 'none') + ':' + nowIso()),
      source_playable_id: sourcePlayableId,
      source_version_id: source.source_version_id || null,
      source_campaign_id: source.source_campaign_id || source.campaign_id || null,
      source_contract_version: source.source_contract_version || source.contract_version || null,
      new_playable_id: ensureId(source.new_playable_id, 'plb', (sourcePlayableId || 'copy') + ':' + nowIso()),
      new_campaign_id: ensureId(source.new_campaign_id, 'cmp', (source.source_campaign_id || 'copy') + ':' + nowIso()),
      status: 'draft-local-copy',
      copied_fields: Array.isArray(source.copied_fields) ? source.copied_fields : ['content', 'mechanic', 'asset_manifest', 'version_learning'],
      reset_fields: ['brand', 'region', 'cta_destination', 'reward_rule', 'attribution', 'settlement', 'approval', 'kill_switch'],
      source: 'local-demo',
      server_confirmed: false,
      created_at: nowIso()
    };
  }

  function buildGovernanceCase(input) {
    const source = input || {};
    const type = ['report', 'appeal', 'takedown', 'kill_switch'].includes(source.type) ? source.type : 'report';
    return {
      id: ensureId(source.id, 'gov', type + ':' + (source.playable_id || 'none') + ':' + nowIso()),
      type,
      playable_id: source.playable_id || null,
      campaign_id: source.campaign_id || null,
      reason: source.reason || 'other',
      details: source.details || '',
      status: source.status || 'open-local-demo',
      reversible: source.reversible !== false,
      history: Array.isArray(source.history) ? source.history : [{status: source.status || 'open-local-demo', at: nowIso(), actor: source.actor || 'local-user'}],
      source: 'local-demo',
      server_confirmed: false,
      updated_at: nowIso()
    };
  }

  function transitionGovernanceCase(record, action, details) {
    const current = buildGovernanceCase(record || {});
    const allowed = {
      'open-local-demo': ['review', 'cancel'],
      'reviewing-local-demo': ['takedown', 'dismiss', 'cancel'],
      'takedown-local-demo': ['appeal', 'restore'],
      'appeal-local-demo': ['restore', 'dismiss']
    };
    const nextByAction = {review: 'reviewing-local-demo', cancel: 'cancelled-local-demo', takedown: 'takedown-local-demo', dismiss: 'dismissed-local-demo', appeal: 'appeal-local-demo', restore: 'restored-to-draft-local-demo'};
    if (!(allowed[current.status] || []).includes(action)) return {...current, transition_error: 'invalid-transition:' + current.status + ':' + action};
    const next = nextByAction[action];
    return {...current, status: next, history: [...current.history, {status: next, action, details: details || '', at: nowIso(), actor: 'local-operator'}], updated_at: nowIso()};
  }

  function createCampaignDemoSeed(input) {
    const source = input || {};
    const campaignId = source.campaign_id || 'campaign-airvana-demo';
    const playableId = source.playable_id || 'plb_campaign_demo';
    const contractVersion = source.contract_version || 'Contract v1.0-local';
    const names = ['impression', 'impression', 'impression', 'impression', 'impression', 'play_start', 'play_start', 'play_start', 'play_start', 'valid_interaction', 'valid_interaction', 'valid_interaction', 'play_complete', 'play_complete', 'cta_view', 'cta_view', 'cta_click'];
    const events = names.map((name, index) => runtimeEvent(name, {
      event_id: 'evt_campaign_demo_' + String(index + 1).padStart(2, '0'),
      event_time: new Date(Date.now() - (names.length - index) * 1000).toISOString(),
      campaign_id: campaignId,
      contract_version: contractVersion,
      playable_id: playableId,
      playable_config_version: source.playable_config_version || 'v1-local',
      session_id: 'ses_campaign_demo_' + String((index % 5) + 1),
      properties: {demo_seed: true, surface: 'campaign-commercial-demo'}
    }));
    const report = buildAttributionReport({events, campaign_id: campaignId, playable_id: playableId, contract_version: contractVersion, success_event: source.success_event || 'registration_complete', attribution_model: source.attribution_model, attribution_window: source.attribution_window});
    const settlementReview = buildSettlementReview({campaign_id: campaignId, playable_id: playableId, contract_version: contractVersion, attribution_report_id: report.id, checks: [{key: 'contract', passed: true}, {key: 'server_success_event', passed: false}, {key: 'amount', passed: false}]});
    const ledgers = buildThreeLedgers({
      player_rights: [{id: 'rights_demo_1', status: 'active-local-demo', label: '完成体验记录', amount: 20, unit: 'AIP', cash_value: null}],
      kol_attribution: [{id: report.id, campaign_id: campaignId, playable_id: playableId, status: report.status, event_count: report.local_event_count, server_confirmed: false}],
      commercial_settlement: [{id: settlementReview.id, campaign_id: campaignId, status: settlementReview.status, amount: null, currency: null, server_confirmed: false}]
    });
    return {campaign_id: campaignId, playable_id: playableId, contract_version: contractVersion, events, attribution_report: report, settlement_review: settlementReview, ledgers, reusable_assets: [], governance_cases: []};
  }

  function createRepositoryRegistry() {
    const calls = [];
    return {
      mode: 'local-only',
      enabled: false,
      interfaces: REPOSITORY_INTERFACES,
      get call_count() { return calls.length; },
      get calls() { return calls.map(item => ({...item})); },
      invoke(repository, method) {
        const known = REPOSITORY_INTERFACES[repository] || [];
        calls.push({repository, method, at: nowIso(), blocked: true});
        return {ok: false, code: known.includes(method) ? 'REPOSITORY_DISABLED_LOCAL_ONLY' : 'UNKNOWN_REPOSITORY_METHOD', server_called: false};
      }
    };
  }

  function normalizePlayable(item) {
    const source = item || {};
    const playableId = ensureId(source.playable_id || source.playableId, 'plb', source.id || source.game || source.title);
    return {
      id: playableId,
      legacy_id: source.id == null ? null : source.id,
      title: String(source.game || source.title || '未命名 Playable'),
      owner_user_id: ensureId(source.owner_user_id, 'usr', source.owner || source.operator || 'local-owner'),
      owner_handle: source.owner || null,
      status: source.status || 'draft',
      active_version_id: ((source.versions || []).slice(-1)[0] || {}).id || null,
      campaign_id: source.campaignId || source.campaign_id || null,
      created_by_role: source.createdByRole || 'kol',
      source: 'local-demo'
    };
  }

  function normalizeDraft(item) {
    const source = item || {};
    const legacyId = source.legacy_id == null ? source.id : source.legacy_id;
    return {
      ...source,
      id: ensureId(source.object_id || source.repository_id, 'drf', legacyId || source.title),
      legacy_id: legacyId == null ? null : legacyId,
      playable_id: ensureId(source.playable_id || source.playableId, 'plb', legacyId || source.title),
      title: String(source.title || '未命名草稿'),
      campaign_id: source.campaign_id || source.campaignId || null,
      contract_version: source.contract_version || source.contract && source.contract.version || null,
      status: source.status || 'draft',
      created_at: source.created_at || source.createdAt || nowIso(),
      updated_at: source.updated_at || source.updatedAt || nowIso(),
      sort_order: Number.isFinite(Number(source.sort_order)) ? Number(source.sort_order) : 0,
      deleted_at: null,
      source: 'local-demo',
      server_confirmed: false
    };
  }

  function normalizeSavedRelation(item) {
    const source = item || {};
    const rawContentId = source.content_id == null ? source.contentId : source.content_id;
    const contentId = rawContentId == null ? null : Number(rawContentId);
    const playableId = ensureId(source.playable_id || source.playableId, 'plb', contentId || source.id || source.title);
    return {
      id: ensureId(source.id, 'sav', (source.user_id || 'local-user') + ':' + playableId),
      user_id: source.user_id || null,
      playable_id: playableId,
      content_id: Number.isFinite(contentId) ? contentId : null,
      note: String(source.note || ''),
      collection: String(source.collection || '默认收藏'),
      sort_order: Number.isFinite(Number(source.sort_order)) ? Number(source.sort_order) : 0,
      created_at: source.created_at || nowIso(),
      updated_at: source.updated_at || nowIso(),
      source: 'local-demo',
      server_confirmed: false
    };
  }

  function normalizeTombstone(item) {
    const source = item || {};
    return {
      id: ensureId(source.id, 'del'),
      object_type: source.object_type || 'draft',
      object_id: source.object_id || null,
      legacy_id: source.legacy_id == null ? null : source.legacy_id,
      snapshot: source.snapshot ? {...source.snapshot} : null,
      deleted_at: source.deleted_at || nowIso(),
      deleted_by: source.deleted_by || null,
      source: 'local-demo',
      server_confirmed: false
    };
  }

  function createLocalRepositoryRegistry(initialState) {
    const initial = initialState || {};
    const store = {
      playables: (initial.playables || []).map(normalizePlayable),
      drafts: (initial.drafts || []).map(normalizeDraft),
      saved_relations: (initial.saved_relations || []).map(normalizeSavedRelation),
      game_runs: (initial.game_runs || []).map(normalizeGameRun),
      tombstones: (initial.tombstones || []).map(normalizeTombstone)
    };
    const calls = [];
    const record = (repository, method, payload) => calls.push({repository, method, payload: payload || null, at: nowIso(), server_called: false});
    return {
      mode: 'local-crud',
      enabled: true,
      interfaces: LOCAL_REPOSITORY_INTERFACES,
      get call_count() { return calls.length; },
      get calls() { return calls.map(item => ({...item})); },
      snapshot() { return JSON.parse(JSON.stringify(store)); },
      playable: {
        list() { record('playable', 'list'); return store.playables.map(item => ({...item})); },
        get(playableId) { record('playable', 'get', {playable_id: playableId}); return store.playables.find(item => item.id === playableId) || null; },
        updateStatus(playableId, status) { record('playable', 'updateStatus', {playable_id: playableId, status}); const index=store.playables.findIndex(item=>item.id===playableId);if(index<0)return null;store.playables[index]={...store.playables[index],status,updated_at:nowIso()};return {...store.playables[index]}; }
      },
      draft: {
        list() { record('draft', 'list'); return store.drafts.slice().sort((a,b)=>a.sort_order-b.sort_order||String(b.updated_at).localeCompare(String(a.updated_at))).map(item=>({...item})); },
        get(draftId) { record('draft', 'get', {draft_id:draftId}); return store.drafts.find(item=>item.id===draftId||item.legacy_id===draftId)||null; },
        create(input) { record('draft','create',input);const draft=normalizeDraft(input);store.drafts=[draft,...store.drafts.filter(item=>item.id!==draft.id&&item.legacy_id!==draft.legacy_id)];return {...draft}; },
        update(draftId, patch) { record('draft','update',{draft_id:draftId,...patch});const index=store.drafts.findIndex(item=>item.id===draftId||item.legacy_id===draftId);if(index<0)return null;store.drafts[index]=normalizeDraft({...store.drafts[index],...patch,updated_at:nowIso()});return {...store.drafts[index]}; },
        copy(draftId, overrides) { record('draft','copy',{draft_id:draftId});const source=store.drafts.find(item=>item.id===draftId||item.legacy_id===draftId);if(!source)return null;const nextLegacyId=(overrides||{}).id||Date.now();const copy=normalizeDraft({...source,...(overrides||{}),object_id:null,repository_id:null,id:nextLegacyId,legacy_id:nextLegacyId,title:(overrides||{}).title||source.title+' 副本',created_at:nowIso(),updated_at:nowIso()});store.drafts=[copy,...store.drafts];return {...copy}; },
        remove(draftId, actor) { record('draft','remove',{draft_id:draftId});const index=store.drafts.findIndex(item=>item.id===draftId||item.legacy_id===draftId);if(index<0)return null;const removed=store.drafts.splice(index,1)[0];const tombstone=normalizeTombstone({object_type:'draft',object_id:removed.id,legacy_id:removed.legacy_id,snapshot:removed,deleted_by:actor});store.tombstones=[tombstone,...store.tombstones];return {...tombstone}; },
        restore(tombstoneId) { record('draft','restore',{tombstone_id:tombstoneId});const index=store.tombstones.findIndex(item=>item.id===tombstoneId&&item.object_type==='draft');if(index<0)return null;const tombstone=store.tombstones.splice(index,1)[0];const restored=normalizeDraft({...tombstone.snapshot,updated_at:nowIso()});store.drafts=[restored,...store.drafts.filter(item=>item.id!==restored.id)];return {...restored}; }
      },
      saved: {
        list() { record('saved','list');return store.saved_relations.slice().sort((a,b)=>a.sort_order-b.sort_order||String(b.updated_at).localeCompare(String(a.updated_at))).map(item=>({...item})); },
        get(playableOrContentId) { record('saved','get',{id:playableOrContentId});return store.saved_relations.find(item=>item.playable_id===playableOrContentId||item.content_id===Number(playableOrContentId))||null; },
        upsert(input) { record('saved','upsert',input);const relation=normalizeSavedRelation(input);const index=store.saved_relations.findIndex(item=>item.id===relation.id||item.playable_id===relation.playable_id);if(index<0)store.saved_relations=[relation,...store.saved_relations];else store.saved_relations[index]=normalizeSavedRelation({...store.saved_relations[index],...input,updated_at:nowIso()});return {...(index<0?relation:store.saved_relations[index])}; },
        remove(playableOrContentId) { record('saved','remove',{id:playableOrContentId});const index=store.saved_relations.findIndex(item=>item.playable_id===playableOrContentId||item.content_id===Number(playableOrContentId));if(index<0)return null;return {...store.saved_relations.splice(index,1)[0]}; }
      },
      gameRun: {
        list(playableOrContentId) { record('gameRun','list',{id:playableOrContentId});return store.game_runs.filter(run=>playableOrContentId==null||run.playable_id===playableOrContentId||run.content_id===Number(playableOrContentId)).map(run=>({...run})); },
        get(runId) { record('gameRun','get',{run_id:runId});return store.game_runs.find(run=>run.id===runId)||null; },
        create(input) { record('gameRun','create',input);const run=normalizeGameRun(input);store.game_runs=[run,...store.game_runs.filter(item=>item.id!==run.id)].slice(0,MAX_GAME_RUNS);return {...run}; },
        remove(runId) { record('gameRun','remove',{run_id:runId});const index=store.game_runs.findIndex(run=>run.id===runId);if(index<0)return null;return {...store.game_runs.splice(index,1)[0]}; },
        clearForPlayable(playableOrContentId) { record('gameRun','clearForPlayable',{id:playableOrContentId});const removed=store.game_runs.filter(run=>run.playable_id===playableOrContentId||run.content_id===Number(playableOrContentId));store.game_runs=store.game_runs.filter(run=>!removed.includes(run));return removed.map(run=>({...run})); },
        clearAll() { record('gameRun','clearAll');const removed=store.game_runs.splice(0);return removed.map(run=>({...run})); }
      }
    };
  }

  function normalizeGameRun(run) {
    const source = run || {};
    return {
      id: ensureId(source.id || source.run_id, 'run'),
      playable_id: ensureId(source.playable_id, 'plb', source.content_id || source.contentId),
      content_id: source.content_id == null ? (source.contentId == null ? null : Number(source.contentId)) : Number(source.content_id),
      session_id: source.session_id || null,
      user_id: source.user_id || null,
      status: source.status || 'started',
      score: Number(source.score || 0),
      stage: Number(source.stage || source.round || 1),
      interactions: Number(source.interactions || 0),
      started_at: source.started_at || nowIso(),
      ended_at: source.ended_at || null,
      exit_reason: source.exit_reason || null,
      source: 'local-demo',
      server_confirmed: false
    };
  }

  function startGameRun(input) {
    return normalizeGameRun({
      ...input,
      id: id('run'),
      status: 'started',
      score: 0,
      stage: 1,
      interactions: 0,
      started_at: nowIso(),
      ended_at: null
    });
  }

  function updateGameRun(run, eventName, properties) {
    const current = normalizeGameRun(run);
    const props = properties || {};
    if (['completed', 'failed', 'abandoned', 'error'].includes(current.status)) return current;
    const terminal = eventName === 'play_complete' || eventName === 'play_fail' || eventName === 'play_exit' || eventName === 'error';
    const status = eventName === 'play_complete' ? 'completed'
      : eventName === 'play_fail' ? 'failed'
        : eventName === 'play_exit' ? 'abandoned'
          : eventName === 'error' ? 'error'
            : eventName === 'pause' ? 'paused'
              : eventName === 'resume' ? 'started'
                : current.status;
    return {
      ...current,
      status,
      score: Number.isFinite(Number(props.score)) ? Number(props.score) : current.score,
      stage: Number.isFinite(Number(props.stage || props.round)) ? Number(props.stage || props.round) : current.stage,
      interactions: current.interactions + (eventName === 'valid_interaction' ? 1 : 0),
      ended_at: terminal ? nowIso() : current.ended_at,
      exit_reason: terminal ? eventName : current.exit_reason
    };
  }

  function buildBrief(input) {
    const source = input || {};
    const campaignId = ensureId(source.campaign_id, 'cmp');
    return {
      id: ensureId(source.id, 'brf', campaignId + ':' + (source.version || '1')),
      campaign_id: campaignId,
      version: source.version || '1.0.0',
      objective: source.objective || '【待人工确认】',
      audience: source.audience || '【待人工确认】',
      success_event: source.success_event || '【待人工确认】',
      cta_type: source.cta_type || '【待人工确认】',
      creative_prompt: source.creative_prompt || '',
      status: source.status || 'draft-local-demo',
      created_at: source.created_at || nowIso(),
      source: 'local-demo'
    };
  }

  function buildContract(input) {
    const source = input || {};
    const campaignId = ensureId(source.campaign_id, 'cmp');
    const version = source.version || 'Contract v1.0';
    return {
      id: ensureId(source.id, 'ctr', campaignId + ':' + version),
      campaign_id: campaignId,
      version,
      status: source.status || 'draft-local-demo',
      approval_status: source.approval_status || source.approvalStatus || 'draft-local-demo',
      editable_fields: ['title', 'opening_hook', 'interaction_order', 'visual_style', 'cta_timing'],
      locked_fields: ['region', 'minimum_age', 'brand_claims', 'cta_destination', 'reward_rule', 'success_event', 'attribution_window', 'attribution_model', 'settlement_basis', 'compliance', 'data_policy', 'approval', 'kill_switch'],
      fields: {...(source.fields || {})},
      created_at: source.created_at || nowIso(),
      source: 'local-demo',
      server_confirmed: false
    };
  }

  function buildAssetManifest(input) {
    const source = input || {};
    const assets = (Array.isArray(source.assets) ? source.assets : []).map((asset, index) => ({
      id: ensureId(asset && asset.id, 'ast', (source.campaign_id || '') + ':' + index + ':' + ((asset && asset.name) || 'asset')),
      name: String((asset && asset.name) || '未命名素材'),
      mime_type: (asset && (asset.mime_type || asset.type)) || 'application/octet-stream',
      size_bytes: Number((asset && (asset.size_bytes || asset.size)) || 0),
      usage_rights: (asset && asset.usage_rights) || 'user-provided-local-demo',
      storage: 'indexeddb-local'
    }));
    return {
      id: ensureId(source.id, 'amn', (source.campaign_id || '') + ':' + (source.contract_version || '') + ':' + assets.length),
      campaign_id: source.campaign_id || null,
      contract_version: source.contract_version || null,
      version: source.version || '1.0.0',
      assets,
      asset_count: assets.length,
      status: source.status || (assets.length ? 'ready-local-demo' : 'empty-local-demo'),
      created_at: source.created_at || nowIso(),
      source: 'local-demo'
    };
  }

  function createEnvelope(input) {
    const source = input || {};
    const uiState = source.ui_state || source.uiState || {};
    const role = source.active_role_id || uiState.productCenterRoleView || uiState.createRoleScope || 'kol';
    const user = normalizeUser(source.user || uiState.profile || {}, role);
    const sessions = Array.isArray(uiState.sessions) ? uiState.sessions : [];
    const drafts = Array.isArray(uiState.drafts) ? uiState.drafts : [];
    const auditEvents = (Array.isArray(source.audit_events) ? source.audit_events : (uiState.localEventLog || [])).slice(0, MAX_AUDIT_EVENTS);
    const gameRuns = (Array.isArray(source.game_runs) ? source.game_runs : (uiState.gameRunRecords || [])).map(normalizeGameRun).slice(0, MAX_GAME_RUNS);
    const savedRelationsSource = Array.isArray(source.saved_relations) ? source.saved_relations : (uiState.savedRelations || []);
    const savedRelations = savedRelationsSource.length
      ? savedRelationsSource.map(normalizeSavedRelation)
      : (uiState.savedContentIds || []).map((contentId,index)=>normalizeSavedRelation({user_id:user.id,content_id:contentId,playable_id:ensureId(null,'plb',contentId),sort_order:index}));
    const tombstones = (Array.isArray(source.tombstones) ? source.tombstones : (uiState.draftTrash || [])).map(normalizeTombstone);
    const createdAt = source.created_at || nowIso();
    return {
      schema_name: 'airvana-mobile-local-business',
      schema_version: SCHEMA_VERSION,
      storage_key: STORAGE_KEY,
      app_version: source.app_version || uiState.appVersion || '5.5.0',
      created_at: createdAt,
      updated_at: nowIso(),
      migration: source.migration || {from_version: SCHEMA_VERSION, to_version: SCHEMA_VERSION, migrated_at: null},
      identity: {
        active_user_id: user.id,
        active_role_id: user.active_role_id,
        users: [user],
        roles: Object.keys(ROLE_PERMISSIONS).map(roleId => ({id: roleId, permission_ids: rolePermissions(roleId)})),
        wallet_candidates: Array.isArray(source.wallet_candidates) ? source.wallet_candidates : (Array.isArray(uiState.localWalletCandidates) ? uiState.localWalletCandidates : [])
      },
      objects: {
        playables: sessions.map(normalizePlayable),
        playable_versions: sessions.flatMap(item=>(item.versions||[]).map(version=>({...version,playable_id:ensureId(item.playable_id||item.playableId,'plb',item.id||item.game),content_id:item.id,source:'local-demo',server_confirmed:false}))),
        drafts: drafts.map(normalizeDraft),
        tombstones,
        campaigns: unique(sessions.map(item => item.campaignId).concat(uiState.campaignId || []).filter(Boolean)).map(campaignId => ({id: ensureId(campaignId, 'cmp', campaignId), legacy_id: campaignId})),
        brief_versions: Array.isArray(source.brief_versions) ? source.brief_versions : (uiState.localBriefVersions || []),
        contract_versions: Array.isArray(source.contract_versions) ? source.contract_versions : (uiState.localContractVersions || []),
        asset_manifests: Array.isArray(source.asset_manifests) ? source.asset_manifests : (uiState.localAssetManifests || []),
        reusable_assets: Array.isArray(source.reusable_assets) ? source.reusable_assets : (uiState.localReusableAssets || [])
      },
      operations: {
        game_runs: gameRuns,
        generation_tasks: Array.isArray(source.generation_tasks) ? source.generation_tasks : (uiState.localGenerationTasks || []),
        review_records: Array.isArray(source.review_records) ? source.review_records : (uiState.localReviewRecords || []),
        release_records: Array.isArray(source.release_records) ? source.release_records : (uiState.localReleaseRecords || []),
        attribution_reports: Array.isArray(source.attribution_reports) ? source.attribution_reports : (uiState.localAttributionReports || []),
        settlement_reviews: Array.isArray(source.settlement_reviews) ? source.settlement_reviews : (uiState.localSettlementReviews || []),
        governance_cases: Array.isArray(source.governance_cases) ? source.governance_cases : (uiState.localGovernanceCases || [])
      },
      social: {
        liked_content_ids: Array.isArray(uiState.likedContentIds) ? uiState.likedContentIds : [],
        saved_content_ids: Array.isArray(uiState.savedContentIds) ? uiState.savedContentIds : [],
        saved_relations: savedRelations,
        experienced_content_ids: Array.isArray(uiState.experiencedContentIds) ? uiState.experiencedContentIds : [],
        following_owner_ids: Array.isArray(uiState.followingOwners) ? uiState.followingOwners : [],
        follower_owner_ids: Array.isArray(uiState.profileFollowerOwners) ? uiState.profileFollowerOwners : [],
        comments_by_content: uiState.commentsByContent || {},
        message_threads: Array.isArray(uiState.messageThreads) ? uiState.messageThreads : []
      },
      ledgers: source.ledgers || uiState.localLedgers || buildThreeLedgers({}),
      repository_state: {
        mode: 'local-only',
        enabled: false,
        call_count: 0,
        interfaces: REPOSITORY_INTERFACES,
        local_crud_enabled: true,
        local_interfaces: LOCAL_REPOSITORY_INTERFACES
      },
      common_states: source.common_states || uiState.commonUiStates || {app: commonState('ready')},
      audit_events: auditEvents,
      ui_state: uiState
    };
  }

  function parseStored(value) {
    if (!value) return null;
    if (typeof value === 'object') return value;
    try { return JSON.parse(value); } catch (error) { return null; }
  }

  function migrate(raw, fromLegacy) {
    const parsed = parseStored(raw);
    if (!parsed) return null;
    if (Number(parsed.schema_version) === SCHEMA_VERSION && parsed.ui_state) {
      return createEnvelope({...parsed, migration: parsed.migration || {from_version: SCHEMA_VERSION, to_version: SCHEMA_VERSION, migrated_at: null}});
    }
    const fromVersion = Number(parsed.schema_version) || (fromLegacy ? 2 : 1);
    const uiState = {...(parsed.ui_state || parsed)};
    const parsedSocial = parsed.social || {};
    const parsedObjects = parsed.objects || {};
    const parsedIdentity = parsed.identity || {};
    if (!Array.isArray(uiState.savedRelations)) uiState.savedRelations = parsedSocial.saved_relations || [];
    if (!uiState.savedContentIds) uiState.savedContentIds = parsedSocial.saved_content_ids || [];
    if (!Array.isArray(uiState.draftTrash)) uiState.draftTrash = parsedObjects.tombstones || [];
    return createEnvelope({
      ui_state: uiState,
      audit_events: parsed.audit_events || uiState.localEventLog || [],
      game_runs: parsed.operations && parsed.operations.game_runs || uiState.gameRunRecords || [],
      saved_relations: parsedSocial.saved_relations || uiState.savedRelations || [],
      tombstones: parsedObjects.tombstones || uiState.draftTrash || [],
      brief_versions: parsed.objects && parsed.objects.brief_versions || uiState.localBriefVersions || [],
      contract_versions: parsed.objects && parsed.objects.contract_versions || uiState.localContractVersions || [],
      asset_manifests: parsed.objects && parsed.objects.asset_manifests || uiState.localAssetManifests || [],
      reusable_assets: parsed.objects && parsed.objects.reusable_assets || uiState.localReusableAssets || [],
      generation_tasks: parsed.operations && parsed.operations.generation_tasks || uiState.localGenerationTasks || [],
      review_records: parsed.operations && parsed.operations.review_records || uiState.localReviewRecords || [],
      release_records: parsed.operations && parsed.operations.release_records || uiState.localReleaseRecords || [],
      attribution_reports: parsed.operations && parsed.operations.attribution_reports || uiState.localAttributionReports || [],
      settlement_reviews: parsed.operations && parsed.operations.settlement_reviews || uiState.localSettlementReviews || [],
      governance_cases: parsed.operations && parsed.operations.governance_cases || uiState.localGovernanceCases || [],
      ledgers: parsed.ledgers || uiState.localLedgers || buildThreeLedgers({}),
      common_states: parsed.common_states || uiState.commonUiStates,
      wallet_candidates: parsedIdentity.wallet_candidates || uiState.localWalletCandidates || [],
      migration: {from_version: fromVersion, to_version: SCHEMA_VERSION, migrated_at: nowIso(), legacy_key: fromLegacy || null}
    });
  }

  function load(storage) {
    const target = storage || (root && root.localStorage);
    if (!target || typeof target.getItem !== 'function') return {envelope: null, source_key: null, error: 'storage-unavailable'};
    try {
      const current = target.getItem(STORAGE_KEY);
      if (current) return {envelope: migrate(current, null), source_key: STORAGE_KEY, error: null};
      for (const key of LEGACY_KEYS) {
        const value = target.getItem(key);
        if (value) return {envelope: migrate(value, key), source_key: key, error: null};
      }
      return {envelope: null, source_key: null, error: null};
    } catch (error) {
      return {envelope: null, source_key: null, error: String(error && error.message || error)};
    }
  }

  function save(storage, envelope) {
    const target = storage || (root && root.localStorage);
    if (!target || typeof target.setItem !== 'function') return {ok: false, error: 'storage-unavailable'};
    try {
      const normalized = createEnvelope(envelope || {});
      target.setItem(STORAGE_KEY, JSON.stringify(normalized));
      return {ok: true, envelope: normalized, error: null};
    } catch (error) {
      return {ok: false, error: String(error && error.message || error)};
    }
  }

  function clear(storage) {
    const target = storage || (root && root.localStorage);
    if (!target || typeof target.removeItem !== 'function') return {ok: false, error: 'storage-unavailable'};
    try {
      target.removeItem(STORAGE_KEY);
      LEGACY_KEYS.forEach(key => target.removeItem(key));
      return {ok: true, error: null};
    } catch (error) {
      return {ok: false, error: String(error && error.message || error)};
    }
  }

  function exportData(envelope) {
    const normalized = createEnvelope(envelope || {});
    return JSON.stringify(normalized, null, 2);
  }

  const api = Object.freeze({
    version: '3.1.0',
    SCHEMA_VERSION,
    STORAGE_KEY,
    LEGACY_KEYS,
    ROLE_PERMISSIONS,
    COMMON_STATE_KINDS,
    RUNTIME_EVENT_NAMES,
    REPOSITORY_INTERFACES,
    LOCAL_REPOSITORY_INTERFACES,
    id,
    ensureId,
    rolePermissions,
    normalizeUser,
    commonState,
    auditEvent,
    runtimeEvent,
    buildAttributionReport,
    buildThreeLedgers,
    buildSettlementReview,
    buildReusableAsset,
    buildGovernanceCase,
    transitionGovernanceCase,
    createCampaignDemoSeed,
    createRepositoryRegistry,
    createLocalRepositoryRegistry,
    normalizePlayable,
    normalizeDraft,
    normalizeSavedRelation,
    normalizeTombstone,
    normalizeGameRun,
    startGameRun,
    updateGameRun,
    buildBrief,
    buildContract,
    buildAssetManifest,
    createEnvelope,
    migrate,
    load,
    save,
    clear,
    exportData
  });

  root.AirvanaLocalBusiness = api;
})(typeof window !== 'undefined' ? window : globalThis);
