import 'dart:async';

import 'package:airvana_mobile/core/config/app_environment.dart';
import 'package:airvana_mobile/core/network/airvana_api_client.dart';
import 'package:airvana_mobile/features/shared/data/legacy_demo_catalog.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_models.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_store.dart';
import 'package:airvana_mobile/features/shared/domain/airvana_models.dart';

class AirvanaRepository {
  AirvanaRepository({
    required this.api,
    required this.environment,
    LocalAirvanaStore? localStore,
  }) : _localStore = localStore ?? LocalAirvanaStore.secure();

  final AirvanaApiClient api;
  final AppEnvironment environment;
  final LocalAirvanaStore _localStore;

  static const _localAccount = AccountSnapshot(
    aip: 2480,
    ait: 0,
    planName: 'Free',
    allowances: {
      'light_creation': (granted: 3, used: 0, remaining: 3),
      'deep_creation': (granted: 1, used: 0, remaining: 1),
      'remix': (granted: 2, used: 0, remaining: 2),
    },
    followerCount: 0,
    followingCount: 0,
    likesReceived: 0,
    unreadNotifications: 2,
    localDemo: true,
  );

  Future<HomeSnapshot> _localHome() async {
    try {
      final workspace = await _localStore.loadWorkspace();
      final persisted = workspace.playables
          .where((item) => item.status == LocalPlayableStatus.publishedLocal)
          .where((item) {
            final release = workspace.releases.where(
              (release) => release.releaseId == item.currentReleaseId,
            );
            return release.isNotEmpty &&
                release.first.visibility == LocalVisibility.publicLocal;
          })
          .map(_domainPlayable)
          .toList(growable: false);
      return HomeSnapshot(
        user: LegacyDemoCatalog.user,
        playables: [...persisted, ...LegacyDemoCatalog.legacyWebPlayables],
        localDemo: true,
        account: _localAccount,
      );
    } on Object {
      // Unsupported secure-storage hosts keep the labelled legacy demo usable.
      return HomeSnapshot(
        user: LegacyDemoCatalog.user,
        playables: LegacyDemoCatalog.legacyWebPlayables,
        localDemo: true,
        account: _localAccount,
      );
    }
  }

  /// The legacy Web baseline starts with no run records. New records must be
  /// created by an actual local runtime session rather than by showcase seeds.
  Future<List<ExperienceRecord>> _localHistory() async {
    try {
      final workspace = await _localStore.loadWorkspace();
      return workspace.experienceRecords.reversed
          .map((record) {
            final release = workspace.releases.where(
              (item) => item.versionId == record.versionId,
            );
            return ExperienceRecord(
              id: record.recordId,
              contentId: record.playableId,
              title: record.title,
              status: record.status,
              version: release.isEmpty
                  ? LegacyDemoCatalog.byId(record.playableId)?.version ?? 1
                  : release.first.versionNumber,
              createdAt: record.startedAt,
              completedAt: record.completedAt,
              localDemo: true,
            );
          })
          .toList(growable: false);
    } on Object {
      return const [];
    }
  }

  Playable _domainPlayable(LocalPlayable playable) => Playable(
    id: playable.playableId,
    title: playable.title,
    authorName: playable.authorName,
    contentType: playable.contentType,
    version: playable.currentVersionNumber,
    summary: playable.summary,
    stage: playable.dataMode == LocalDataMode.demo
        ? 'DEMO · LOCAL PUBLISHED'
        : 'LOCAL PUBLISHED',
    localDemo: true,
  );

  Playable _serverPlayable(Map<String, dynamic> json) {
    final base = Playable.fromJson(json);
    const prefix = 'content_mobilearcade_';
    final legacyId = base.id.startsWith(prefix)
        ? base.id.substring(prefix.length)
        : '';
    final legacy = legacyId.isEmpty ? null : LegacyDemoCatalog.byId(legacyId);
    if (legacy == null) return base;
    return Playable(
      id: base.id,
      title: base.title,
      authorName: base.authorName,
      contentType: base.contentType,
      version: base.version,
      summary: base.summary,
      coverAsset: legacy.coverAsset,
      ownerUserId: base.ownerUserId,
      stage: 'SERVER VERIFIED',
      agentName: legacy.agentName,
      ownerHandle: legacy.ownerHandle,
      category: legacy.category,
      instruction: legacy.instruction,
      likes: base.likes,
      comments: base.comments,
      saves: base.saves,
    );
  }

  Future<void> _ensureLocalDemoSession() async {
    if (!environment.demoLoginEnabled) return;
    if (await api.sessionCookie != null) return;
    await api.postJson('/api/auth/demo', {
      'role': 'creator',
      'persona': 'flutter-mobile',
    });
  }

  Future<HomeSnapshot> loadHome() async {
    if (environment.preferLocalData) return _localHome();
    try {
      await _ensureLocalDemoSession();
      if (environment.demoLoginEnabled) {
        await api.postJson('/api/demo/mobile-playables', {
          'playables': LegacyDemoCatalog.legacyWebPlayables
              .map((item) => {'key': item.id, 'title': item.title})
              .toList(growable: false),
        });
      }
      final bootstrap = await api.getJson('/api/bootstrap');
      final rawUser = bootstrap['me'];
      final rawFeed = bootstrap['feed'];
      if (rawUser is! Map<String, dynamic>) {
        throw ApiException('服务端未返回当前用户');
      }
      final playables = rawFeed is List
          ? rawFeed
                .whereType<Map<String, dynamic>>()
                .map(_serverPlayable)
                .toList(growable: false)
          : <Playable>[];
      final rawContents = bootstrap['contents'];
      final ownedPlayables = rawContents is List
          ? rawContents
                .whereType<Map<String, dynamic>>()
                .where((item) => item['status'] == 'published')
                .map(
                  (item) => _serverPlayable({
                    ...item,
                    'authorName': '${rawUser['displayName'] ?? 'Airvana 用户'}',
                    'stage': 'SERVER VERIFIED',
                  }),
                )
                .toList(growable: false)
          : <Playable>[];
      final rawFollowing = bootstrap['following'];
      final followingUserIds = rawFollowing is List
          ? rawFollowing
                .whereType<Map<String, dynamic>>()
                .map((item) => '${item['userId'] ?? ''}')
                .where((id) => id.isNotEmpty)
                .toSet()
          : <String>{};
      final rawEngagements = bootstrap['engagementState'];
      final engagementsByContent = <String, Set<String>>{};
      if (rawEngagements is Map<String, dynamic>) {
        for (final entry in rawEngagements.entries) {
          final values = entry.value;
          if (values is List) {
            engagementsByContent[entry.key] = values
                .map((value) => '$value')
                .where((value) => value.isNotEmpty)
                .toSet();
          }
        }
      }
      final rawNotifications = bootstrap['notifications'];
      final unreadNotifications = rawNotifications is List
          ? rawNotifications
                .whereType<Map<String, dynamic>>()
                .where((item) => item['readAt'] == null)
                .length
          : 0;
      if (playables.isEmpty && environment.localFallbackEnabled) {
        return await _localHome();
      }
      return HomeSnapshot(
        user: AppUser.fromJson(rawUser),
        playables: playables,
        ownedPlayables: ownedPlayables,
        followingUserIds: followingUserIds,
        engagementsByContent: engagementsByContent,
        unreadNotifications: unreadNotifications,
        account: _accountFromBootstrap(bootstrap),
      );
    } on ApiException {
      if (environment.localFallbackEnabled) return await _localHome();
      rethrow;
    }
  }

  Future<List<ExperienceRecord>> loadExperienceHistory() async {
    if (environment.preferLocalData) return _localHistory();
    try {
      await _ensureLocalDemoSession();
      final response = await api.getJson('/api/runtime/history?limit=100');
      final history = response['history'];
      final records = history is List
          ? history
                .whereType<Map<String, dynamic>>()
                .map(ExperienceRecord.fromJson)
                .toList(growable: false)
          : <ExperienceRecord>[];
      if (records.isEmpty && environment.localFallbackEnabled) {
        return await _localHistory();
      }
      return records;
    } on ApiException {
      if (environment.localFallbackEnabled) return await _localHistory();
      rethrow;
    }
  }

  Future<String?> sessionCookie() => api.sessionCookie;

  Future<List<Playable>> loadDiscover({String query = ''}) async {
    if (environment.preferLocalData) {
      final normalized = query.trim().toLowerCase();
      return LegacyDemoCatalog.legacyWebPlayables
          .where(
            (item) =>
                normalized.isEmpty ||
                item.title.toLowerCase().contains(normalized) ||
                item.authorName.toLowerCase().contains(normalized),
          )
          .toList(growable: false);
    }
    try {
      await _ensureLocalDemoSession();
      final encoded = Uri.encodeQueryComponent(query.trim());
      final response = await api.getJson('/api/discover?q=$encoded');
      final results = response['results'];
      return results is List
          ? results
                .whereType<Map<String, dynamic>>()
                .map(_serverPlayable)
                .toList(growable: false)
          : const <Playable>[];
    } on ApiException {
      if (!environment.localFallbackEnabled) rethrow;
      return LegacyDemoCatalog.legacyWebPlayables;
    }
  }

  Future<void> setEngagement({
    required String contentId,
    required String eventType,
    required bool active,
  }) async {
    if (!['like', 'save', 'share'].contains(eventType)) {
      throw ArgumentError.value(eventType, 'eventType', '互动类型不受支持');
    }
    await _ensureLocalDemoSession();
    if (!active) {
      if (eventType == 'share') return;
      await api.postJson('/api/engagements/remove', {
        'contentId': contentId,
        'eventType': eventType,
      });
      return;
    }
    await api.postJson('/api/engagements', {
      'contentId': contentId,
      'eventType': eventType,
      'eventKey': 'flutter:$eventType:$contentId',
    });
  }

  Future<void> setFollowing({
    required String contentId,
    required bool active,
  }) async {
    await _ensureLocalDemoSession();
    await api.postJson(active ? '/api/follows' : '/api/follows/remove', {
      'contentId': contentId,
    });
  }

  Future<List<ContentComment>> loadComments(String contentId) async {
    await _ensureLocalDemoSession();
    final response = await api.getJson('/api/contents/$contentId/comments');
    final comments = response['comments'];
    return comments is List
        ? comments
              .whereType<Map<String, dynamic>>()
              .map(ContentComment.fromJson)
              .toList(growable: false)
        : const <ContentComment>[];
  }

  Future<ContentComment> postComment(String contentId, String body) async {
    await _ensureLocalDemoSession();
    final response = await api.postJson('/api/contents/$contentId/comments', {
      'body': body,
    });
    final comment = response['comment'];
    if (comment is! Map<String, dynamic>) {
      throw ApiException('服务端未返回评论记录');
    }
    return ContentComment.fromJson(comment);
  }

  Future<NotificationSnapshot> loadNotifications() async {
    if (environment.preferLocalData) {
      return const NotificationSnapshot(items: [], unread: 0);
    }
    await _ensureLocalDemoSession();
    final response = await api.getJson('/api/notifications');
    final raw = response['notifications'];
    final items = raw is List
        ? raw
              .whereType<Map<String, dynamic>>()
              .map(AppNotification.fromJson)
              .toList(growable: false)
        : const <AppNotification>[];
    return NotificationSnapshot(
      items: items,
      unread:
          (response['unread'] as num?)?.toInt() ??
          items.where((item) => item.unread).length,
    );
  }

  Future<void> markNotificationRead(String notificationId) async {
    await _ensureLocalDemoSession();
    await api.postJson('/api/notifications/$notificationId/read', const {});
  }

  Future<void> markAllNotificationsRead() async {
    await _ensureLocalDemoSession();
    await api.postJson('/api/notifications/read-all', const {});
  }

  Future<List<DmConversation>> loadConversations() async {
    if (environment.preferLocalData) return const <DmConversation>[];
    await _ensureLocalDemoSession();
    final response = await api.getJson('/api/dm/conversations');
    final raw = response['conversations'];
    return raw is List
        ? raw
              .whereType<Map<String, dynamic>>()
              .map(DmConversation.fromJson)
              .toList(growable: false)
        : const <DmConversation>[];
  }

  Future<DmConversation> openConversation(String peerUserId) async {
    await _ensureLocalDemoSession();
    final response = await api.postJson('/api/dm/conversations', {
      'userId': peerUserId,
    });
    final raw = response['conversation'];
    if (raw is! Map<String, dynamic>) {
      throw ApiException('服务端未返回私信会话');
    }
    return DmConversation.fromJson({
      ...raw,
      'unread': 0,
      'updatedAt': DateTime.now().toUtc().toIso8601String(),
    });
  }

  Future<List<DmMessage>> loadMessages(String conversationId) async {
    await _ensureLocalDemoSession();
    final response = await api.getJson(
      '/api/dm/conversations/$conversationId/messages',
    );
    final raw = response['messages'];
    return raw is List
        ? raw
              .whereType<Map<String, dynamic>>()
              .map(DmMessage.fromJson)
              .toList(growable: false)
        : const <DmMessage>[];
  }

  Future<DmMessage> sendMessage(String conversationId, String body) async {
    await _ensureLocalDemoSession();
    final response = await api.postJson(
      '/api/dm/conversations/$conversationId/messages',
      {'body': body},
    );
    final raw = response['message'];
    if (raw is! Map<String, dynamic>) {
      throw ApiException('服务端未返回私信记录');
    }
    return DmMessage.fromJson({...raw, 'senderName': ''});
  }

  Future<void> recallMessage(String messageId) async {
    await _ensureLocalDemoSession();
    await api.postJson('/api/dm/messages/$messageId/recall', const {});
  }

  Future<AccountSnapshot> loadAccount() async {
    if (environment.preferLocalData) {
      return _localAccount;
    }
    await _ensureLocalDemoSession();
    final bootstrap = await api.getJson('/api/bootstrap');
    return _accountFromBootstrap(bootstrap);
  }

  AccountSnapshot _accountFromBootstrap(Map<String, dynamic> bootstrap) {
    final economy = bootstrap['economy'];
    final economyMap = economy is Map<String, dynamic>
        ? economy
        : const <String, dynamic>{};
    final rawAip = economyMap['aip'];
    final rawAit = economyMap['ait'];
    final subscription = economyMap['subscription'];
    final subscriptionMap = subscription is Map<String, dynamic>
        ? subscription
        : const <String, dynamic>{};
    final allowances = <String, ({int granted, int used, int remaining})>{};
    final rawAllowances = subscriptionMap['allowances'];
    if (rawAllowances is List) {
      for (final item in rawAllowances.whereType<Map<String, dynamic>>()) {
        final key = '${item['key'] ?? ''}';
        if (key.isEmpty) continue;
        allowances[key] = (
          granted: (item['granted'] as num?)?.toInt() ?? 0,
          used: (item['used'] as num?)?.toInt() ?? 0,
          remaining: (item['remaining'] as num?)?.toInt() ?? 0,
        );
      }
    }
    final notifications = bootstrap['notifications'];
    final following = bootstrap['following'];
    final stats = bootstrap['stats'];
    final statsMap = stats is Map<String, dynamic>
        ? stats
        : const <String, dynamic>{};
    return AccountSnapshot(
      aip: rawAip is Map<String, dynamic>
          ? (rawAip['available'] as num?)?.toInt() ?? 0
          : 0,
      ait: rawAit is Map<String, dynamic>
          ? (rawAit['available'] as num?)?.toInt() ?? 0
          : 0,
      planName: '${subscriptionMap['name'] ?? 'Free'}',
      allowances: allowances,
      followerCount: (bootstrap['followerCount'] as num?)?.toInt() ?? 0,
      followingCount: following is List ? following.length : 0,
      likesReceived: (statsMap['likesReceived'] as num?)?.toInt() ?? 0,
      unreadNotifications: notifications is List
          ? notifications
                .whereType<Map<String, dynamic>>()
                .where((item) => item['readAt'] == null)
                .length
          : 0,
    );
  }

  Future<List<GrowthNode>> loadGrowthNodes() async {
    if (environment.preferLocalData) return const <GrowthNode>[];
    await _ensureLocalDemoSession();
    final response = await api.getJson('/api/growth-nodes');
    final raw = response['nodes'];
    return raw is List
        ? raw
              .whereType<Map<String, dynamic>>()
              .map(GrowthNode.fromJson)
              .toList(growable: false)
        : const <GrowthNode>[];
  }

  Future<void> createGrowthNode(String name) async {
    await _ensureLocalDemoSession();
    await api.postJson('/api/growth-nodes', {'name': name});
  }

  Future<void> joinGrowthNode(String inviteCode) async {
    await _ensureLocalDemoSession();
    await api.postJson('/api/growth-nodes/join', {
      'inviteCode': inviteCode.trim().toUpperCase(),
    });
  }

  Future<ServerPlayableRelease> publishServerPlayable({
    required String title,
    required String prompt,
    required bool deepMode,
    required String idempotencyKey,
    String? existingTaskId,
    void Function(ServerCreationProgress progress)? onProgress,
  }) async {
    if (environment.preferLocalData) {
      throw ApiException('当前是本地演示模式，未连接服务端发布管线');
    }
    if (deepMode) {
      throw ApiException(
        'Campaign 创作必须先选择已批准的 Campaign Contract 与参与资格，未绑定时不允许发布',
        code: 'campaign_contract_required',
      );
    }
    await _ensureLocalDemoSession();

    Map<String, dynamic> task;
    Map<String, dynamic> content;
    if (existingTaskId != null && existingTaskId.isNotEmpty) {
      final restored = await api.getJson('/api/tasks/$existingTaskId');
      task = _requiredMap(restored['task'], '服务端未返回生成任务');
      content = _requiredMap(restored['content'], '服务端未返回生成内容');
    } else {
      final bootstrap = await api.getJson('/api/bootstrap');
      final rawAgents = bootstrap['agents'];
      String? agentId;
      if (rawAgents is List) {
        for (final candidate in rawAgents.whereType<Map<String, dynamic>>()) {
          if (candidate['status'] == 'active' &&
              (candidate['contentType'] == 'all' ||
                  candidate['contentType'] == 'game')) {
            agentId = '${candidate['id'] ?? ''}';
            if (agentId.isNotEmpty) break;
          }
        }
      }
      if (agentId == null || agentId.isEmpty) {
        final createdAgent = await api.postJson('/api/agents', {
          'name': '移动端创作 Agent',
          'description': '由 Airvana Flutter 创作器管理的 Agentic Playable 生成 Agent',
          'contentType': 'all',
          'reviewMode': 'human',
          'permissions': {'draft': true},
        });
        agentId =
            '${_requiredMap(createdAgent['agent'], '创建 Agent 失败')['id'] ?? ''}';
      }
      final created = await api.postJson('/api/tasks', {
        'agentId': agentId,
        'title': title,
        'contentType': 'game',
        'prompt': prompt,
        'creationMode': 'light',
        'idempotencyKey': idempotencyKey,
      });
      task = _requiredMap(created['task'], '服务端未返回新建任务');
      content = _requiredMap(created['content'], '服务端未返回新建内容');
    }

    for (var attempt = 0; attempt < 50; attempt += 1) {
      final status = '${task['status'] ?? ''}';
      final progress = ServerCreationProgress(
        taskId: '${task['id'] ?? ''}',
        contentId: '${content['id'] ?? task['contentId'] ?? ''}',
        status: status,
        progress: (task['progress'] as num?)?.toInt() ?? 0,
      );
      onProgress?.call(progress);

      if (content['status'] == 'published') {
        return _serverRelease(task, content, title);
      }
      if (status == 'review_pending') {
        final reviewed = await api.postJson('/api/tasks/${task['id']}/review', {
          'decision': 'approve',
          'note': '移动端用户已确认试玩、可见性与发布信息',
        });
        task = _requiredMap(reviewed['task'], '服务端未返回审核任务');
        content = _requiredMap(reviewed['content'], '服务端未返回审核内容');
        continue;
      }
      if (status == 'approved' && content['status'] == 'draft') {
        final published = await api.postJson(
          '/api/contents/${content['id']}/publish',
          const {},
        );
        content = _requiredMap(published['content'], '服务端未返回发布内容');
        return _serverRelease(task, content, title);
      }
      if (const {'failed', 'rejected', 'cancelled'}.contains(status)) {
        throw ApiException(
          '服务端创作任务未通过：${task['error'] ?? task['reviewNote'] ?? status}',
          code: 'server_creation_$status',
        );
      }
      await Future<void>.delayed(const Duration(milliseconds: 300));
      final refreshed = await api.getJson('/api/tasks/${task['id']}');
      task = _requiredMap(refreshed['task'], '服务端未返回生成任务');
      content = _requiredMap(refreshed['content'], '服务端未返回生成内容');
    }
    throw ApiException(
      '服务端任务 ${task['id']} 仍在处理，已保留 task_id，可稍后继续',
      code: 'server_creation_pending',
    );
  }

  Map<String, dynamic> _requiredMap(Object? value, String message) {
    if (value is Map<String, dynamic>) return value;
    throw ApiException(message);
  }

  ServerPlayableRelease _serverRelease(
    Map<String, dynamic> task,
    Map<String, dynamic> content,
    String fallbackTitle,
  ) => ServerPlayableRelease(
    taskId: '${task['id'] ?? ''}',
    contentId: '${content['id'] ?? ''}',
    version: (content['currentVersion'] as num?)?.toInt() ?? 1,
    title: '${content['title'] ?? fallbackTitle}',
  );

  Future<LocalWorkspaceSnapshot> loadLocalWorkspace() =>
      _localStore.loadWorkspace();

  Future<LocalRewardState> loadRewardState() async {
    if (environment.preferLocalData) return _localStore.loadRewardState();
    await _ensureLocalDemoSession();
    final bootstrap = await api.getJson('/api/bootstrap');
    final economy = bootstrap['economy'];
    final rawAip = economy is Map<String, dynamic> ? economy['aip'] : null;
    final ledger = bootstrap['ledger'];
    final days = ledger is List
        ? ledger
              .whereType<Map<String, dynamic>>()
              .where(
                (item) =>
                    item['eventType'] == 'daily_login' &&
                    item['status'] == 'posted',
              )
              .map((item) => '${item['createdAt'] ?? ''}'.split('T').first)
              .where((day) => day.length == 10)
              .toSet()
        : <String>{};
    var streak = 0;
    final today = DateTime.now().toUtc();
    for (var offset = 0; offset < 14; offset += 1) {
      final date = today.subtract(Duration(days: offset));
      final key = _dateKey(date);
      if (!days.contains(key)) break;
      streak += 1;
    }
    final todayKey = _dateKey(today);
    return LocalRewardState(
      aipBalance: rawAip is Map<String, dynamic>
          ? (rawAip['available'] as num?)?.toInt() ?? 0
          : 0,
      checkInStreak: streak,
      lastCheckInDate: days.contains(todayKey) ? todayKey : '',
    );
  }

  Future<LocalCheckInResult> checkInDaily() async {
    if (environment.preferLocalData) return _localStore.checkInDaily();
    await _ensureLocalDemoSession();
    final response = await api.postJson('/api/economy/check-in', const {});
    final economy = response['economy'];
    final rawAip = economy is Map<String, dynamic> ? economy['aip'] : null;
    final base = (response['baseReward'] as num?)?.toInt() ?? 0;
    final bonus = (response['streakReward'] as num?)?.toInt() ?? 0;
    final idempotent = response['idempotent'] == true;
    return LocalCheckInResult(
      state: LocalRewardState(
        aipBalance: rawAip is Map<String, dynamic>
            ? (rawAip['available'] as num?)?.toInt() ?? 0
            : 0,
        checkInStreak: (response['streak'] as num?)?.toInt() ?? 1,
        lastCheckInDate: _dateKey(DateTime.now().toUtc()),
      ),
      earned: idempotent ? 0 : base + bonus,
      idempotent: idempotent,
    );
  }

  /// 旧版 Web 个人资料与关系页在本机持久化；这里保持相同边界。
  Future<LocalProfileState> loadLocalProfileState() =>
      _localStore.loadProfileState();

  Future<LocalProfileState> saveLocalProfile({
    required String displayName,
    required String bio,
  }) => _localStore.saveProfile(displayName: displayName, bio: bio);

  Future<LocalProfileFeatureState> loadLocalProfileFeatureState() =>
      _localStore.loadProfileFeatureState();

  Future<LocalProfileFeatureState> saveLocalProfileFeatureState(
    LocalProfileFeatureState state,
  ) => _localStore.saveProfileFeatureState(state);

  Future<LocalProfileFeatureState> redeemLocalProfileRight({
    required String rightId,
    required String title,
    required int cost,
  }) => _localStore.redeemProfileRight(
    rightId: rightId,
    title: title,
    cost: cost,
  );

  Future<LocalSocialState> loadLocalSocialState() =>
      _localStore.loadSocialState();

  Future<LocalSocialState> setLocalFollowing({
    required String owner,
    required bool active,
  }) => _localStore.setFollowing(owner: owner, active: active);

  /// AIP 流水：本地闭环直接读本地账本；服务端模式把 bootstrap ledger 中
  /// 已入账（posted）的事件映射为流水行。
  Future<List<LocalWalletTxn>> loadWalletTxns() async {
    if (environment.preferLocalData) return _localStore.loadWalletTxns();
    await _ensureLocalDemoSession();
    final bootstrap = await api.getJson('/api/bootstrap');
    final ledger = bootstrap['ledger'];
    if (ledger is! List) return const [];
    const eventTitles = {
      'daily_login': '每日签到',
      'playable_complete': '有效完成奖励',
      'content_publish': '发布作品',
    };
    final txns =
        ledger
            .whereType<Map<String, dynamic>>()
            .where((item) => item['status'] == 'posted')
            .map(
              (item) => LocalWalletTxn(
                txnId: '${item['id'] ?? item['createdAt'] ?? ''}',
                title:
                    eventTitles['${item['eventType'] ?? ''}'] ??
                    '${item['eventType'] ?? '账本事件'}',
                amount: (item['amount'] as num?)?.toInt() ?? 0,
                occurredAt:
                    DateTime.tryParse('${item['createdAt'] ?? ''}') ??
                    DateTime.fromMillisecondsSinceEpoch(0, isUtc: true),
              ),
            )
            .toList()
          ..sort((a, b) => b.occurredAt.compareTo(a.occurredAt));
    return txns;
  }

  /// 游戏金币账本按 playable_id 隔离，仅存在于本机。
  Future<Map<String, int>> loadGameCoinLedgers() =>
      _localStore.loadGameCoinLedgers();

  Future<LocalAiTwinState> loadAiTwinState() => _localStore.loadAiTwinState();

  Future<LocalAiTwinState> saveAiTwinState(
    LocalAiTwinState state, {
    String? auditTitle,
  }) => _localStore.saveAiTwinState(state, auditTitle: auditTitle);

  Future<LocalWalletBinding> loadWalletBinding() =>
      _localStore.loadWalletBinding();

  Future<LocalWalletBinding> saveWalletBinding(LocalWalletBinding binding) =>
      _localStore.saveWalletBinding(binding);

  Future<LocalIdentityState> loadIdentityState() =>
      _localStore.loadIdentityState();

  Future<LocalIdentityState> saveIdentityState(LocalIdentityState state) =>
      _localStore.saveIdentityState(state);

  Future<({int coinBalance, int earnedAip, int aipBalance})>
  recordGameCompletion({
    required String playableId,
    required String title,
    required int coins,
  }) => _localStore.recordGameCompletion(
    playableId: playableId,
    title: title,
    coins: coins,
  );

  String _dateKey(DateTime date) =>
      '${date.year.toString().padLeft(4, '0')}-'
      '${date.month.toString().padLeft(2, '0')}-'
      '${date.day.toString().padLeft(2, '0')}';

  Future<LocalDraft> saveLocalDraft({
    String? draftId,
    String? ownerId,
    required String idea,
    required bool deepMode,
    required List<String> selectedPowerIds,
    Map<String, dynamic>? workflowState,
    LocalDraftStatus status = LocalDraftStatus.editing,
    LocalDataMode dataMode = LocalDataMode.local,
    String? sourcePlayableId,
  }) => _localStore.saveDraft(
    draftId: draftId,
    ownerId: ownerId ?? LegacyDemoCatalog.user.id,
    idea: idea,
    deepMode: deepMode,
    selectedPowerIds: selectedPowerIds,
    workflowState: workflowState,
    status: status,
    dataMode: dataMode,
    sourcePlayableId: sourcePlayableId,
  );

  Future<LocalDraft> saveDraft({
    String? draftId,
    String? ownerId,
    required String idea,
    required bool deepMode,
    required List<String> selectedPowerIds,
    Map<String, dynamic>? workflowState,
    LocalDraftStatus status = LocalDraftStatus.editing,
    LocalDataMode dataMode = LocalDataMode.local,
    String? sourcePlayableId,
  }) => saveLocalDraft(
    draftId: draftId,
    ownerId: ownerId,
    idea: idea,
    deepMode: deepMode,
    selectedPowerIds: selectedPowerIds,
    workflowState: workflowState,
    status: status,
    dataMode: dataMode,
    sourcePlayableId: sourcePlayableId,
  );

  Future<LocalDraft?> loadLocalDraft(String draftId) =>
      _localStore.loadDraft(draftId);

  Future<LocalDraft?> loadDraft(String draftId) => loadLocalDraft(draftId);

  Future<LocalGenerationTask> startLocalGeneration(String draftId) =>
      _localStore.startGeneration(draftId);

  Future<LocalGenerationTask> startOrResumeGeneration(
    String draftId, {
    String? taskId,
    bool forceNew = false,
  }) => _localStore.startOrResumeGeneration(
    draftId,
    taskId: taskId,
    forceNew: forceNew,
  );

  Future<LocalGenerationTask?> loadLocalGeneration(String taskId) =>
      _localStore.loadGeneration(taskId);

  Future<LocalGenerationTask> updateLocalGeneration(
    String taskId,
    LocalGenerationStatus status, {
    String? failureCode,
  }) => _localStore.updateGeneration(taskId, status, failureCode: failureCode);

  Future<LocalGenerationTask> cancelGeneration(String taskId) =>
      _localStore.updateGeneration(taskId, LocalGenerationStatus.paused);

  Future<LocalGenerationTask> resumeGeneration(String taskId) =>
      _localStore.updateGeneration(taskId, LocalGenerationStatus.running);

  Future<LocalGenerationTask> terminateGeneration(String taskId) =>
      _localStore.updateGeneration(taskId, LocalGenerationStatus.cancelled);

  Future<LocalRelease> publishLocalRelease(LocalReleaseRequest request) =>
      _localStore.publishRelease(request);

  Future<LocalRelease> publishLocalPlayable(LocalReleaseRequest request) =>
      publishLocalRelease(request);

  Future<LocalPlayable?> loadLocalPlayable(String playableId) =>
      _localStore.loadPlayable(playableId);

  Future<LocalPlayable?> findPlayableById(String playableId) =>
      loadLocalPlayable(playableId);

  Future<List<LocalRelease>> loadLocalReleases(String playableId) =>
      _localStore.loadReleases(playableId);

  Future<LocalExperienceRecord> recordLocalExperience({
    required String playableId,
    required String versionId,
    required String title,
    required String status,
    DateTime? completedAt,
    LocalDataMode dataMode = LocalDataMode.local,
  }) => _localStore.recordExperience(
    playableId: playableId,
    versionId: versionId,
    title: title,
    status: status,
    completedAt: completedAt,
    dataMode: dataMode,
  );

  Future<LocalExperienceRecord> recordExperience({
    required String playableId,
    required String versionId,
    required String title,
    required String status,
    DateTime? completedAt,
    LocalDataMode dataMode = LocalDataMode.local,
  }) => recordLocalExperience(
    playableId: playableId,
    versionId: versionId,
    title: title,
    status: status,
    completedAt: completedAt,
    dataMode: dataMode,
  );

  Future<LocalExperienceRecord> recordPlayableExperience(
    Playable playable, {
    required String status,
    DateTime? completedAt,
  }) async {
    final localPlayable = await _localStore.loadPlayable(playable.id);
    if (localPlayable != null) {
      return _localStore.recordExperience(
        playableId: localPlayable.playableId,
        versionId: localPlayable.currentVersionId,
        title: localPlayable.title,
        status: status,
        completedAt: completedAt,
        dataMode: localPlayable.dataMode,
      );
    }
    final legacyPlayable = LegacyDemoCatalog.byId(playable.id);
    if (legacyPlayable == null) {
      throw LocalStoreException('未找到可记录的本地 Playable：${playable.id}');
    }
    return _localStore.recordExperience(
      playableId: legacyPlayable.id,
      versionId: 'legacy_${legacyPlayable.id}_v${legacyPlayable.version}',
      title: legacyPlayable.title,
      status: status,
      completedAt: completedAt,
      dataMode: LocalDataMode.demo,
      allowLegacyDemo: true,
    );
  }
}
