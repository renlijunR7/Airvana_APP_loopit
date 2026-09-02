enum LocalDataMode { local, demo }

enum LocalDraftStatus { editing, readyForGeneration, publishedLocal, archived }

enum LocalGenerationStatus {
  queued,
  running,
  paused,
  completed,
  cancelled,
  failed,
}

enum LocalPlayableStatus { publishedLocal, pausedLocal }

enum LocalVisibility { privateLocal, unlistedLocal, publicLocal }

enum LocalRemixPolicy { disabled, localWithAttribution }

T _enumValue<T extends Enum>(List<T> values, Object? raw, T fallback) =>
    values.where((value) => value.name == raw).firstOrNull ?? fallback;

extension _FirstOrNull<T> on Iterable<T> {
  T? get firstOrNull {
    final iterator = this.iterator;
    return iterator.moveNext() ? iterator.current : null;
  }
}

DateTime _date(Object? raw) =>
    DateTime.tryParse('$raw')?.toUtc() ??
    DateTime.fromMillisecondsSinceEpoch(0, isUtc: true);

DateTime? _nullableDate(Object? raw) =>
    raw == null ? null : DateTime.tryParse('$raw')?.toUtc();

class LocalDraft {
  const LocalDraft({
    required this.draftId,
    required this.ownerId,
    required this.idea,
    required this.deepMode,
    required this.selectedPowerIds,
    required this.workflowState,
    required this.status,
    required this.dataMode,
    required this.createdAt,
    required this.updatedAt,
    this.playableId,
    this.sourcePlayableId,
  });

  factory LocalDraft.fromJson(Map<String, dynamic> json) => LocalDraft(
    draftId: '${json['draft_id'] ?? ''}',
    ownerId: '${json['owner_id'] ?? ''}',
    idea: '${json['idea'] ?? ''}',
    deepMode: json['deep_mode'] == true,
    selectedPowerIds: (json['selected_power_ids'] as List<dynamic>? ?? const [])
        .map((value) => '$value')
        .toList(growable: false),
    workflowState: json['workflow_state'] is Map
        ? Map<String, dynamic>.from(json['workflow_state'] as Map)
        : const {},
    status: _enumValue(
      LocalDraftStatus.values,
      json['status'],
      LocalDraftStatus.editing,
    ),
    dataMode: _enumValue(
      LocalDataMode.values,
      json['data_mode'],
      LocalDataMode.local,
    ),
    createdAt: _date(json['created_at']),
    updatedAt: _date(json['updated_at']),
    playableId: json['playable_id'] == null ? null : '${json['playable_id']}',
    sourcePlayableId: json['source_playable_id'] == null
        ? null
        : '${json['source_playable_id']}',
  );

  final String draftId;
  final String ownerId;
  final String idea;
  final bool deepMode;
  final List<String> selectedPowerIds;
  final Map<String, dynamic> workflowState;
  final LocalDraftStatus status;
  final LocalDataMode dataMode;
  final DateTime createdAt;
  final DateTime updatedAt;
  final String? playableId;
  final String? sourcePlayableId;

  Map<String, dynamic> toJson() => {
    'draft_id': draftId,
    'owner_id': ownerId,
    'idea': idea,
    'deep_mode': deepMode,
    'selected_power_ids': selectedPowerIds,
    'workflow_state': workflowState,
    'status': status.name,
    'data_mode': dataMode.name,
    'created_at': createdAt.toUtc().toIso8601String(),
    'updated_at': updatedAt.toUtc().toIso8601String(),
    'playable_id': playableId,
    'source_playable_id': sourcePlayableId,
  };
}

class LocalGenerationTask {
  const LocalGenerationTask({
    required this.taskId,
    required this.draftId,
    required this.versionId,
    required this.status,
    required this.dataMode,
    required this.createdAt,
    required this.updatedAt,
    this.completedAt,
    this.failureCode,
  });

  factory LocalGenerationTask.fromJson(Map<String, dynamic> json) =>
      LocalGenerationTask(
        taskId: '${json['task_id'] ?? ''}',
        draftId: '${json['draft_id'] ?? ''}',
        versionId: '${json['version_id'] ?? ''}',
        status: _enumValue(
          LocalGenerationStatus.values,
          json['status'],
          LocalGenerationStatus.queued,
        ),
        dataMode: _enumValue(
          LocalDataMode.values,
          json['data_mode'],
          LocalDataMode.local,
        ),
        createdAt: _date(json['created_at']),
        updatedAt: _date(json['updated_at']),
        completedAt: _nullableDate(json['completed_at']),
        failureCode: json['failure_code'] == null
            ? null
            : '${json['failure_code']}',
      );

  final String taskId;
  final String draftId;
  final String versionId;
  final LocalGenerationStatus status;
  final LocalDataMode dataMode;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? completedAt;
  final String? failureCode;

  Map<String, dynamic> toJson() => {
    'task_id': taskId,
    'draft_id': draftId,
    'version_id': versionId,
    'status': status.name,
    'data_mode': dataMode.name,
    'created_at': createdAt.toUtc().toIso8601String(),
    'updated_at': updatedAt.toUtc().toIso8601String(),
    'completed_at': completedAt?.toUtc().toIso8601String(),
    'failure_code': failureCode,
  };
}

/// An append-only LOCAL/DEMO release record. It is never evidence of an
/// external review, server publication, marketplace approval, or live traffic.
class LocalRelease {
  const LocalRelease({
    required this.releaseId,
    required this.playableId,
    required this.versionId,
    required this.versionNumber,
    required this.buildId,
    required this.reviewId,
    required this.publishedAt,
    required this.visibility,
    required this.remixPolicy,
    required this.draftId,
    required this.generationTaskId,
    required this.title,
    required this.summary,
    required this.contentType,
    required this.authorName,
    required this.dataMode,
    this.rollbackVersionId,
  });

  factory LocalRelease.fromJson(Map<String, dynamic> json) => LocalRelease(
    releaseId: '${json['release_id'] ?? ''}',
    playableId: '${json['playable_id'] ?? ''}',
    versionId: '${json['version_id'] ?? ''}',
    versionNumber: (json['version_number'] as num?)?.toInt() ?? 1,
    buildId: '${json['build_id'] ?? ''}',
    reviewId: '${json['review_id'] ?? ''}',
    publishedAt: _date(json['published_at']),
    visibility: _enumValue(
      LocalVisibility.values,
      json['visibility'],
      LocalVisibility.privateLocal,
    ),
    remixPolicy: _enumValue(
      LocalRemixPolicy.values,
      json['remix_policy'],
      LocalRemixPolicy.disabled,
    ),
    rollbackVersionId: json['rollback_version_id'] == null
        ? null
        : '${json['rollback_version_id']}',
    draftId: '${json['draft_id'] ?? ''}',
    generationTaskId: '${json['generation_task_id'] ?? ''}',
    title: '${json['title'] ?? ''}',
    summary: '${json['summary'] ?? ''}',
    contentType: '${json['content_type'] ?? 'game'}',
    authorName: '${json['author_name'] ?? 'Airvana Creator'}',
    dataMode: _enumValue(
      LocalDataMode.values,
      json['data_mode'],
      LocalDataMode.local,
    ),
  );

  final String releaseId;
  final String playableId;
  final String versionId;
  final int versionNumber;
  final String buildId;
  final String reviewId;
  final DateTime publishedAt;
  final LocalVisibility visibility;
  final LocalRemixPolicy remixPolicy;
  final String? rollbackVersionId;
  final String draftId;
  final String generationTaskId;
  final String title;
  final String summary;
  final String contentType;
  final String authorName;
  final LocalDataMode dataMode;

  Map<String, dynamic> toJson() => {
    'release_id': releaseId,
    'playable_id': playableId,
    'version_id': versionId,
    'version_number': versionNumber,
    'build_id': buildId,
    'review_id': reviewId,
    'published_at': publishedAt.toUtc().toIso8601String(),
    'visibility': visibility.name,
    'remix_policy': remixPolicy.name,
    'rollback_version_id': rollbackVersionId,
    'draft_id': draftId,
    'generation_task_id': generationTaskId,
    'title': title,
    'summary': summary,
    'content_type': contentType,
    'author_name': authorName,
    'data_mode': dataMode.name,
  };
}

class LocalPlayable {
  const LocalPlayable({
    required this.playableId,
    required this.ownerId,
    required this.title,
    required this.summary,
    required this.contentType,
    required this.authorName,
    required this.currentReleaseId,
    required this.currentVersionId,
    required this.currentVersionNumber,
    required this.status,
    required this.dataMode,
    required this.createdAt,
    required this.updatedAt,
  });

  factory LocalPlayable.fromJson(Map<String, dynamic> json) => LocalPlayable(
    playableId: '${json['playable_id'] ?? ''}',
    ownerId: '${json['owner_id'] ?? ''}',
    title: '${json['title'] ?? ''}',
    summary: '${json['summary'] ?? ''}',
    contentType: '${json['content_type'] ?? 'game'}',
    authorName: '${json['author_name'] ?? 'Airvana Creator'}',
    currentReleaseId: '${json['current_release_id'] ?? ''}',
    currentVersionId: '${json['current_version_id'] ?? ''}',
    currentVersionNumber:
        (json['current_version_number'] as num?)?.toInt() ?? 1,
    status: _enumValue(
      LocalPlayableStatus.values,
      json['status'],
      LocalPlayableStatus.publishedLocal,
    ),
    dataMode: _enumValue(
      LocalDataMode.values,
      json['data_mode'],
      LocalDataMode.local,
    ),
    createdAt: _date(json['created_at']),
    updatedAt: _date(json['updated_at']),
  );

  final String playableId;
  final String ownerId;
  final String title;
  final String summary;
  final String contentType;
  final String authorName;
  final String currentReleaseId;
  final String currentVersionId;
  final int currentVersionNumber;
  final LocalPlayableStatus status;
  final LocalDataMode dataMode;
  final DateTime createdAt;
  final DateTime updatedAt;

  Map<String, dynamic> toJson() => {
    'playable_id': playableId,
    'owner_id': ownerId,
    'title': title,
    'summary': summary,
    'content_type': contentType,
    'author_name': authorName,
    'current_release_id': currentReleaseId,
    'current_version_id': currentVersionId,
    'current_version_number': currentVersionNumber,
    'status': status.name,
    'data_mode': dataMode.name,
    'created_at': createdAt.toUtc().toIso8601String(),
    'updated_at': updatedAt.toUtc().toIso8601String(),
  };
}

class LocalExperienceRecord {
  const LocalExperienceRecord({
    required this.recordId,
    required this.playableId,
    required this.versionId,
    required this.title,
    required this.status,
    required this.startedAt,
    required this.dataMode,
    this.completedAt,
  });

  factory LocalExperienceRecord.fromJson(Map<String, dynamic> json) =>
      LocalExperienceRecord(
        recordId: '${json['record_id'] ?? ''}',
        playableId: '${json['playable_id'] ?? ''}',
        versionId: '${json['version_id'] ?? ''}',
        title: '${json['title'] ?? ''}',
        status: '${json['status'] ?? 'started'}',
        startedAt: _date(json['started_at']),
        completedAt: _nullableDate(json['completed_at']),
        dataMode: _enumValue(
          LocalDataMode.values,
          json['data_mode'],
          LocalDataMode.local,
        ),
      );

  final String recordId;
  final String playableId;
  final String versionId;
  final String title;
  final String status;
  final DateTime startedAt;
  final DateTime? completedAt;
  final LocalDataMode dataMode;

  Map<String, dynamic> toJson() => {
    'record_id': recordId,
    'playable_id': playableId,
    'version_id': versionId,
    'title': title,
    'status': status,
    'started_at': startedAt.toUtc().toIso8601String(),
    'completed_at': completedAt?.toUtc().toIso8601String(),
    'data_mode': dataMode.name,
  };
}

/// 本地激励状态：AIP 余额与每日签到（对齐旧版 Web 的本机演示口径，
/// 仅记录站内互动贡献，不代表现金或可提现余额）。
class LocalRewardState {
  const LocalRewardState({
    this.aipBalance = 2480,
    this.checkInStreak = 4,
    this.lastCheckInDate = '',
  });

  factory LocalRewardState.fromJson(Map<String, dynamic> json) =>
      LocalRewardState(
        aipBalance: (json['aip_balance'] as num?)?.toInt() ?? 2480,
        checkInStreak: (json['check_in_streak'] as num?)?.toInt() ?? 4,
        lastCheckInDate: json['last_check_in_date'] as String? ?? '',
      );

  final int aipBalance;
  final int checkInStreak;

  /// 形如 2026-08-31 的本地日期键；空串表示从未签到。
  final String lastCheckInDate;

  int get nextCheckInReward => 20 + checkInStreak * 10;

  bool isCheckedInOn(String dateKey) => lastCheckInDate == dateKey;

  Map<String, dynamic> toJson() => {
    'aip_balance': aipBalance,
    'check_in_streak': checkInStreak,
    'last_check_in_date': lastCheckInDate,
  };
}

/// 一次签到的结果；[idempotent] 为 true 表示今天已签过、状态未变化。
class LocalCheckInResult {
  const LocalCheckInResult({
    required this.state,
    required this.earned,
    required this.idempotent,
  });

  final LocalRewardState state;
  final int earned;
  final bool idempotent;
}

/// 一条本地 AIP 流水（对齐旧版 Web 钱包的账本记录）。
class LocalWalletTxn {
  const LocalWalletTxn({
    required this.txnId,
    required this.title,
    required this.amount,
    required this.occurredAt,
  });

  factory LocalWalletTxn.fromJson(Map<String, dynamic> json) => LocalWalletTxn(
    txnId: '${json['txn_id'] ?? ''}',
    title: '${json['title'] ?? ''}',
    amount: (json['amount'] as num?)?.toInt() ?? 0,
    occurredAt:
        DateTime.tryParse('${json['occurred_at'] ?? ''}') ??
        DateTime.fromMillisecondsSinceEpoch(0, isUtc: true),
  );

  final String txnId;
  final String title;

  /// 有符号 AIP 数额；正数为入账。
  final int amount;
  final DateTime occurredAt;

  Map<String, dynamic> toJson() => {
    'txn_id': txnId,
    'title': title,
    'amount': amount,
    'occurred_at': occurredAt.toUtc().toIso8601String(),
  };
}

/// KOL AI 分身生命周期：与旧版 Web 完全一致。
/// 关键动作全部写入 [audit]；对外能力受执行边界约束。
class LocalAiTwinState {
  const LocalAiTwinState({
    this.status = 'not_created',
    this.name = '',
    this.tagline = '',
    this.tone = '友好、专业、直接',
    this.topics = 'Agentic Playable 创作、互动增长、安全教育',
    this.blockedTopics = '投资建议、代币价格预测',
    this.consent = false,
    this.audit = const [],
    this.sceneId = 'default',
    this.language = 'zh',
    this.versions = const [],
  });

  factory LocalAiTwinState.fromJson(Map<String, dynamic> json) =>
      LocalAiTwinState(
        status:
            const [
              'not_created',
              'configuring',
              'testing',
              'active_demo',
              'paused_demo',
            ].contains(json['status'])
            ? '${json['status']}'
            : 'not_created',
        name: '${json['name'] ?? ''}',
        tagline: '${json['tagline'] ?? ''}',
        tone: '${json['tone'] ?? '友好、专业、直接'}',
        topics: '${json['topics'] ?? ''}',
        blockedTopics: '${json['blocked_topics'] ?? ''}',
        consent: json['consent'] == true,
        audit: json['audit'] is List
            ? (json['audit'] as List)
                  .whereType<Map>()
                  .map(
                    (item) => (
                      title: '${item['title'] ?? ''}',
                      time: '${item['time'] ?? ''}',
                      status: '${item['status'] ?? '本地状态'}',
                    ),
                  )
                  .toList(growable: false)
            : const [],
        sceneId: '${json['scene_id'] ?? 'default'}',
        language: '${json['language'] ?? 'zh'}',
        versions: json['versions'] is List
            ? (json['versions'] as List)
                  .whereType<Map>()
                  .map(
                    (item) => (
                      label: '${item['label'] ?? ''}',
                      time: '${item['time'] ?? ''}',
                      scene: '${item['scene'] ?? 'default'}',
                    ),
                  )
                  .toList(growable: false)
            : const [],
      );

  final String status;
  final String name;
  final String tagline;
  final String tone;
  final String topics;
  final String blockedTopics;
  final bool consent;
  final List<({String title, String time, String status})> audit;

  /// 当前场景：人格、话术与版本按场景隔离。
  final String sceneId;

  /// 舞台讲解语言（zh / en）。
  final String language;

  /// 人格与知识的版本记录（新到旧）。
  final List<({String label, String time, String scene})> versions;

  LocalAiTwinState copyWith({
    String? status,
    String? name,
    String? tagline,
    String? tone,
    String? topics,
    String? blockedTopics,
    bool? consent,
    List<({String title, String time, String status})>? audit,
    String? sceneId,
    String? language,
    List<({String label, String time, String scene})>? versions,
  }) => LocalAiTwinState(
    status: status ?? this.status,
    name: name ?? this.name,
    tagline: tagline ?? this.tagline,
    tone: tone ?? this.tone,
    topics: topics ?? this.topics,
    blockedTopics: blockedTopics ?? this.blockedTopics,
    consent: consent ?? this.consent,
    audit: audit ?? this.audit,
    sceneId: sceneId ?? this.sceneId,
    language: language ?? this.language,
    versions: versions ?? this.versions,
  );

  Map<String, dynamic> toJson() => {
    'status': status,
    'name': name,
    'tagline': tagline,
    'tone': tone,
    'topics': topics,
    'blocked_topics': blockedTopics,
    'consent': consent,
    'audit': audit
        .map(
          (item) => {
            'title': item.title,
            'time': item.time,
            'status': item.status,
          },
        )
        .toList(growable: false),
    'scene_id': sceneId,
    'language': language,
    'versions': versions
        .map(
          (item) => {
            'label': item.label,
            'time': item.time,
            'scene': item.scene,
          },
        )
        .toList(growable: false),
  };
}

/// Campaign 结算钱包绑定（本地演示：只记录意向与验证状态，不做真实签名）。
class LocalWalletBinding {
  const LocalWalletBinding({
    this.address = '',
    this.network = 'Ethereum · 演示网络',
    this.status = 'none',
  });

  factory LocalWalletBinding.fromJson(Map<String, dynamic> json) =>
      LocalWalletBinding(
        address: '${json['address'] ?? ''}',
        network: '${json['network'] ?? 'Ethereum · 演示网络'}',
        status: const ['none', 'pending', 'verified'].contains(json['status'])
            ? '${json['status']}'
            : 'none',
      );

  final String address;
  final String network;

  /// none 未绑定 / pending 候选待验证 / verified 已验证（本地演示）。
  final String status;

  Map<String, dynamic> toJson() => {
    'address': address,
    'network': network,
    'status': status,
  };
}

/// 身份与权限（本地演示口径）：创作者中心等 KOL 功能的门禁依据。
class LocalIdentityState {
  const LocalIdentityState({
    this.creatorStatus = 'active_demo',
    this.kycStatus = 'verified_demo',
  });

  factory LocalIdentityState.fromJson(Map<String, dynamic> json) =>
      LocalIdentityState(
        creatorStatus: '${json['creator_status'] ?? 'active_demo'}',
        kycStatus: '${json['kyc_status'] ?? 'verified_demo'}',
      );

  final String creatorStatus;
  final String kycStatus;

  bool get creatorEntitled =>
      creatorStatus == 'active_demo' && kycStatus == 'verified_demo';

  Map<String, dynamic> toJson() => {
    'creator_status': creatorStatus,
    'kyc_status': kycStatus,
  };
}

/// 当前设备保存的公开个人资料，与旧版 Web `profile` 状态一致。
class LocalProfileState {
  const LocalProfileState({
    this.displayName = 'Kai Chen',
    this.bio = '运营可持续创作、互动、归因与转化的 Agentic Playable。',
  });

  factory LocalProfileState.fromJson(Map<String, dynamic> json) =>
      LocalProfileState(
        displayName: '${json['display_name'] ?? 'Kai Chen'}',
        bio: '${json['bio'] ?? '运营可持续创作、互动、归因与转化的 Agentic Playable。'}',
      );

  final String displayName;
  final String bio;

  Map<String, dynamic> toJson() => {'display_name': displayName, 'bio': bio};
}

/// 当前设备保存的关注关系。粉丝是旧版 Web 的演示入站关系，关注可编辑。
class LocalSocialState {
  const LocalSocialState({
    this.followerOwners = const ['@nina', '@leo.art'],
    this.followingOwners = const ['@leo.art'],
  });

  factory LocalSocialState.fromJson(Map<String, dynamic> json) =>
      LocalSocialState(
        followerOwners: _strings(json['follower_owners']),
        followingOwners: _strings(json['following_owners']),
      );

  final List<String> followerOwners;
  final List<String> followingOwners;

  bool follows(String owner) => followingOwners.contains(owner);

  Map<String, dynamic> toJson() => {
    'follower_owners': followerOwners,
    'following_owners': followingOwners,
  };
}

/// “设置与更多”模块的本机闭环状态。
///
/// 字段与旧 Web 本地演示保持同一边界：只保存前端演示状态，不代表服务端
/// 审批、KYC、品牌授权、对外发布、归因或商业结算已经发生。
class LocalProfileFeatureState {
  const LocalProfileFeatureState({
    this.subscriptionPlanKey = 'free',
    this.subscriptionStatus = 'active',
    this.subscriptionCancelAtPeriodEnd = false,
    this.subscriptionHistory = const [],
    this.campaignStage = 0,
    this.campaignPaused = false,
    this.governanceKillSwitch = false,
    this.governanceTab = 'review',
    this.governanceCaseStates = const {},
    this.activeRightIds = const [],
    this.rightsOrders = const [],
    this.feedbackTickets = const [],
    this.uiLanguage = 'zh-CN',
    this.pushEnabled = true,
    this.themeMode = 'system',
    this.identityNodeActive = false,
    this.identitySuperNodeActive = false,
    this.productRoleView = 'kol',
    this.frontendEnvironment = 'test',
    this.networkProfile = 'normal',
    this.regionProfile = 'global',
    this.nonFinancialMode = false,
    this.popupStates = const {
      'version': true,
      'message': true,
      'operations': true,
    },
  });

  factory LocalProfileFeatureState.fromJson(Map<String, dynamic> json) {
    final rawCaseStates = json['governance_case_states'];
    final rawPopupStates = json['popup_states'];
    final campaignStage = (json['campaign_stage'] as num?)?.toInt() ?? 0;
    return LocalProfileFeatureState(
      subscriptionPlanKey:
          const [
            'free',
            'creator_pro',
            'brand_campaign',
          ].contains(json['subscription_plan_key'])
          ? '${json['subscription_plan_key']}'
          : 'free',
      subscriptionStatus:
          const [
            'active',
            'grace_period',
            'expired',
            'revoked',
          ].contains(json['subscription_status'])
          ? '${json['subscription_status']}'
          : 'active',
      subscriptionCancelAtPeriodEnd:
          json['subscription_cancel_at_period_end'] == true,
      subscriptionHistory: _maps(
        json['subscription_history'],
      ).map(Map<String, dynamic>.unmodifiable).toList(growable: false),
      campaignStage: campaignStage.clamp(0, 6),
      campaignPaused: json['campaign_paused'] == true,
      governanceKillSwitch: json['governance_kill_switch'] == true,
      governanceTab:
          const ['review', 'risk', 'control'].contains(json['governance_tab'])
          ? '${json['governance_tab']}'
          : 'review',
      governanceCaseStates: rawCaseStates is Map
          ? Map<String, String>.unmodifiable(
              rawCaseStates.map((key, value) => MapEntry('$key', '$value')),
            )
          : const {},
      activeRightIds: _strings(json['active_right_ids']),
      rightsOrders: _maps(
        json['rights_orders'],
      ).map(Map<String, dynamic>.unmodifiable).toList(growable: false),
      feedbackTickets: _maps(
        json['feedback_tickets'],
      ).map(Map<String, dynamic>.unmodifiable).toList(growable: false),
      uiLanguage: json['ui_language'] == 'en' ? 'en' : 'zh-CN',
      pushEnabled: json['push_enabled'] != false,
      themeMode: const ['system', 'light', 'dark'].contains(json['theme_mode'])
          ? '${json['theme_mode']}'
          : 'system',
      identityNodeActive: json['identity_node_active'] == true,
      identitySuperNodeActive: json['identity_super_node_active'] == true,
      productRoleView: json['product_role_view'] == 'player' ? 'player' : 'kol',
      frontendEnvironment: json['frontend_environment'] == 'production'
          ? 'production'
          : 'test',
      networkProfile:
          const ['normal', 'weak', 'offline'].contains(json['network_profile'])
          ? '${json['network_profile']}'
          : 'normal',
      regionProfile: '${json['region_profile'] ?? 'global'}',
      nonFinancialMode: json['non_financial_mode'] == true,
      popupStates: rawPopupStates is Map
          ? Map<String, bool>.unmodifiable(
              rawPopupStates.map(
                (key, value) => MapEntry('$key', value == true),
              ),
            )
          : const {'version': true, 'message': true, 'operations': true},
    );
  }

  final String subscriptionPlanKey;
  final String subscriptionStatus;
  final bool subscriptionCancelAtPeriodEnd;
  final List<Map<String, dynamic>> subscriptionHistory;
  final int campaignStage;
  final bool campaignPaused;
  final bool governanceKillSwitch;
  final String governanceTab;
  final Map<String, String> governanceCaseStates;
  final List<String> activeRightIds;
  final List<Map<String, dynamic>> rightsOrders;
  final List<Map<String, dynamic>> feedbackTickets;
  final String uiLanguage;
  final bool pushEnabled;
  final String themeMode;
  final bool identityNodeActive;
  final bool identitySuperNodeActive;
  final String productRoleView;
  final String frontendEnvironment;
  final String networkProfile;
  final String regionProfile;
  final bool nonFinancialMode;
  final Map<String, bool> popupStates;

  LocalProfileFeatureState copyWith({
    String? subscriptionPlanKey,
    String? subscriptionStatus,
    bool? subscriptionCancelAtPeriodEnd,
    List<Map<String, dynamic>>? subscriptionHistory,
    int? campaignStage,
    bool? campaignPaused,
    bool? governanceKillSwitch,
    String? governanceTab,
    Map<String, String>? governanceCaseStates,
    List<String>? activeRightIds,
    List<Map<String, dynamic>>? rightsOrders,
    List<Map<String, dynamic>>? feedbackTickets,
    String? uiLanguage,
    bool? pushEnabled,
    String? themeMode,
    bool? identityNodeActive,
    bool? identitySuperNodeActive,
    String? productRoleView,
    String? frontendEnvironment,
    String? networkProfile,
    String? regionProfile,
    bool? nonFinancialMode,
    Map<String, bool>? popupStates,
  }) => LocalProfileFeatureState(
    subscriptionPlanKey: subscriptionPlanKey ?? this.subscriptionPlanKey,
    subscriptionStatus: subscriptionStatus ?? this.subscriptionStatus,
    subscriptionCancelAtPeriodEnd:
        subscriptionCancelAtPeriodEnd ?? this.subscriptionCancelAtPeriodEnd,
    subscriptionHistory: subscriptionHistory ?? this.subscriptionHistory,
    campaignStage: campaignStage ?? this.campaignStage,
    campaignPaused: campaignPaused ?? this.campaignPaused,
    governanceKillSwitch: governanceKillSwitch ?? this.governanceKillSwitch,
    governanceTab: governanceTab ?? this.governanceTab,
    governanceCaseStates: governanceCaseStates ?? this.governanceCaseStates,
    activeRightIds: activeRightIds ?? this.activeRightIds,
    rightsOrders: rightsOrders ?? this.rightsOrders,
    feedbackTickets: feedbackTickets ?? this.feedbackTickets,
    uiLanguage: uiLanguage ?? this.uiLanguage,
    pushEnabled: pushEnabled ?? this.pushEnabled,
    themeMode: themeMode ?? this.themeMode,
    identityNodeActive: identityNodeActive ?? this.identityNodeActive,
    identitySuperNodeActive:
        identitySuperNodeActive ?? this.identitySuperNodeActive,
    productRoleView: productRoleView ?? this.productRoleView,
    frontendEnvironment: frontendEnvironment ?? this.frontendEnvironment,
    networkProfile: networkProfile ?? this.networkProfile,
    regionProfile: regionProfile ?? this.regionProfile,
    nonFinancialMode: nonFinancialMode ?? this.nonFinancialMode,
    popupStates: popupStates ?? this.popupStates,
  );

  Map<String, dynamic> toJson() => {
    'subscription_plan_key': subscriptionPlanKey,
    'subscription_status': subscriptionStatus,
    'subscription_cancel_at_period_end': subscriptionCancelAtPeriodEnd,
    'subscription_history': subscriptionHistory,
    'campaign_stage': campaignStage,
    'campaign_paused': campaignPaused,
    'governance_kill_switch': governanceKillSwitch,
    'governance_tab': governanceTab,
    'governance_case_states': governanceCaseStates,
    'active_right_ids': activeRightIds,
    'rights_orders': rightsOrders,
    'feedback_tickets': feedbackTickets,
    'ui_language': uiLanguage,
    'push_enabled': pushEnabled,
    'theme_mode': themeMode,
    'identity_node_active': identityNodeActive,
    'identity_super_node_active': identitySuperNodeActive,
    'product_role_view': productRoleView,
    'frontend_environment': frontendEnvironment,
    'network_profile': networkProfile,
    'region_profile': regionProfile,
    'non_financial_mode': nonFinancialMode,
    'popup_states': popupStates,
  };
}

class LocalWorkspaceSnapshot {
  const LocalWorkspaceSnapshot({
    this.drafts = const [],
    this.generationTasks = const [],
    this.releases = const [],
    this.playables = const [],
    this.experienceRecords = const [],
    this.rewardState = const LocalRewardState(),
    this.walletTxns = const [],
    this.gameCoinLedgers = const {},
    this.aiTwinState = const LocalAiTwinState(),
    this.walletBinding = const LocalWalletBinding(),
    this.identityState = const LocalIdentityState(),
    this.profileState = const LocalProfileState(),
    this.socialState = const LocalSocialState(),
    this.profileFeatureState = const LocalProfileFeatureState(),
    this.lastGameRewardDates = const {},
  });

  factory LocalWorkspaceSnapshot.fromJson(Map<String, dynamic> json) =>
      LocalWorkspaceSnapshot(
        drafts: _maps(json['drafts']).map(LocalDraft.fromJson).toList(),
        generationTasks: _maps(
          json['generation_tasks'],
        ).map(LocalGenerationTask.fromJson).toList(),
        releases: _maps(json['releases']).map(LocalRelease.fromJson).toList(),
        playables: _maps(
          json['playables'],
        ).map(LocalPlayable.fromJson).toList(),
        experienceRecords: _maps(
          json['experience_records'],
        ).map(LocalExperienceRecord.fromJson).toList(),
        rewardState: json['reward_state'] is Map
            ? LocalRewardState.fromJson(
                Map<String, dynamic>.from(json['reward_state'] as Map),
              )
            : const LocalRewardState(),
        walletTxns: _maps(
          json['wallet_txns'],
        ).map(LocalWalletTxn.fromJson).toList(),
        gameCoinLedgers: json['game_coin_ledgers'] is Map
            ? (json['game_coin_ledgers'] as Map).map(
                (key, value) => MapEntry('$key', (value as num?)?.toInt() ?? 0),
              )
            : const {},
        aiTwinState: json['ai_twin_state'] is Map
            ? LocalAiTwinState.fromJson(
                Map<String, dynamic>.from(json['ai_twin_state'] as Map),
              )
            : const LocalAiTwinState(),
        walletBinding: json['wallet_binding'] is Map
            ? LocalWalletBinding.fromJson(
                Map<String, dynamic>.from(json['wallet_binding'] as Map),
              )
            : const LocalWalletBinding(),
        identityState: json['identity_state'] is Map
            ? LocalIdentityState.fromJson(
                Map<String, dynamic>.from(json['identity_state'] as Map),
              )
            : const LocalIdentityState(),
        profileState: json['profile_state'] is Map
            ? LocalProfileState.fromJson(
                Map<String, dynamic>.from(json['profile_state'] as Map),
              )
            : const LocalProfileState(),
        socialState: json['social_state'] is Map
            ? LocalSocialState.fromJson(
                Map<String, dynamic>.from(json['social_state'] as Map),
              )
            : const LocalSocialState(),
        profileFeatureState: json['profile_feature_state'] is Map
            ? LocalProfileFeatureState.fromJson(
                Map<String, dynamic>.from(json['profile_feature_state'] as Map),
              )
            : const LocalProfileFeatureState(),
        lastGameRewardDates: json['last_game_reward_dates'] is Map
            ? (json['last_game_reward_dates'] as Map).map(
                (key, value) => MapEntry('$key', '$value'),
              )
            : const {},
      );

  final List<LocalDraft> drafts;
  final List<LocalGenerationTask> generationTasks;
  final List<LocalRelease> releases;
  final List<LocalPlayable> playables;
  final List<LocalExperienceRecord> experienceRecords;
  final LocalRewardState rewardState;

  /// AIP 流水（新到旧由读取方排序）。
  final List<LocalWalletTxn> walletTxns;

  /// 游戏金币账本：按 playable_id 严格隔离，不可跨作品转移。
  final Map<String, int> gameCoinLedgers;

  /// KOL AI 分身配置与生命周期（全本地）。
  final LocalAiTwinState aiTwinState;

  /// Campaign 结算钱包绑定意向（本地演示）。
  final LocalWalletBinding walletBinding;

  /// 身份与权限门禁状态（本地演示）。
  final LocalIdentityState identityState;

  /// 当前设备上的个人资料与互动关系。
  final LocalProfileState profileState;
  final LocalSocialState socialState;
  final LocalProfileFeatureState profileFeatureState;

  /// 每个 playable 最近一次发放游玩 AIP 的日期键（每作品每日一次 5 AIP）。
  final Map<String, String> lastGameRewardDates;

  LocalWorkspaceSnapshot copyWith({
    List<LocalDraft>? drafts,
    List<LocalGenerationTask>? generationTasks,
    List<LocalRelease>? releases,
    List<LocalPlayable>? playables,
    List<LocalExperienceRecord>? experienceRecords,
    LocalRewardState? rewardState,
    List<LocalWalletTxn>? walletTxns,
    Map<String, int>? gameCoinLedgers,
    LocalAiTwinState? aiTwinState,
    LocalWalletBinding? walletBinding,
    LocalIdentityState? identityState,
    LocalProfileState? profileState,
    LocalSocialState? socialState,
    LocalProfileFeatureState? profileFeatureState,
    Map<String, String>? lastGameRewardDates,
  }) => LocalWorkspaceSnapshot(
    drafts: drafts ?? this.drafts,
    generationTasks: generationTasks ?? this.generationTasks,
    releases: releases ?? this.releases,
    playables: playables ?? this.playables,
    experienceRecords: experienceRecords ?? this.experienceRecords,
    rewardState: rewardState ?? this.rewardState,
    walletTxns: walletTxns ?? this.walletTxns,
    gameCoinLedgers: gameCoinLedgers ?? this.gameCoinLedgers,
    aiTwinState: aiTwinState ?? this.aiTwinState,
    walletBinding: walletBinding ?? this.walletBinding,
    identityState: identityState ?? this.identityState,
    profileState: profileState ?? this.profileState,
    socialState: socialState ?? this.socialState,
    profileFeatureState: profileFeatureState ?? this.profileFeatureState,
    lastGameRewardDates: lastGameRewardDates ?? this.lastGameRewardDates,
  );

  Map<String, dynamic> toJson() => {
    'schema_version': 1,
    'drafts': drafts.map((item) => item.toJson()).toList(),
    'generation_tasks': generationTasks.map((item) => item.toJson()).toList(),
    'releases': releases.map((item) => item.toJson()).toList(),
    'playables': playables.map((item) => item.toJson()).toList(),
    'experience_records': experienceRecords
        .map((item) => item.toJson())
        .toList(),
    'reward_state': rewardState.toJson(),
    'wallet_txns': walletTxns.map((item) => item.toJson()).toList(),
    'game_coin_ledgers': gameCoinLedgers,
    'ai_twin_state': aiTwinState.toJson(),
    'wallet_binding': walletBinding.toJson(),
    'identity_state': identityState.toJson(),
    'profile_state': profileState.toJson(),
    'social_state': socialState.toJson(),
    'profile_feature_state': profileFeatureState.toJson(),
    'last_game_reward_dates': lastGameRewardDates,
  };
}

Iterable<Map<String, dynamic>> _maps(Object? raw) => raw is List
    ? raw.whereType<Map>().map((value) => Map<String, dynamic>.from(value))
    : const Iterable<Map<String, dynamic>>.empty();

List<String> _strings(Object? raw) => raw is List
    ? raw.map((value) => '$value').where((value) => value.isNotEmpty).toList()
    : const [];
