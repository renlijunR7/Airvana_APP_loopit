import 'package:airvana_mobile/features/network/domain/growth_node_state.dart';
import 'dart:async';

import 'package:airvana_mobile/core/config/app_environment.dart';
import 'package:airvana_mobile/core/network/airvana_api_client.dart';
import 'package:airvana_mobile/features/shared/data/legacy_demo_catalog.dart';
import 'package:airvana_mobile/features/account/domain/account_service_models.dart';
import 'package:airvana_mobile/features/account/domain/auth_models.dart';
import 'package:airvana_mobile/features/account/domain/platform_service_models.dart';
import 'package:airvana_mobile/features/creator_center/domain/creator_center_snapshot.dart';
import 'package:airvana_mobile/features/runtime/domain/server_runtime_proof.dart';
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
      // 收藏 / 点赞与 Web 一样按作品 id 持久化，冷启动后仍然保留。
      final social = workspace.socialState;
      final engagements = <String, Set<String>>{};
      for (final id in social.savedPlayableIds) {
        (engagements[id] ??= <String>{}).add('save');
      }
      for (final id in social.likedPlayableIds) {
        (engagements[id] ??= <String>{}).add('like');
      }
      return HomeSnapshot(
        user: LegacyDemoCatalog.user,
        playables: [...persisted, ...LegacyDemoCatalog.legacyWebPlayables],
        localDemo: true,
        account: _localAccount,
        engagementsByContent: engagements,
        followingUserIds: social.followingOwners.toSet(),
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

  /// 内存缓存的「已主动退出」标记，避免每次请求都读一次本地存储。
  bool? _signedOutCache;

  /// 用户是否主动退出过服务端登录。
  Future<bool> get signedOut async => _signedOutCache ??=
      (await _localStore.loadProfileFeatureState()).serverSignedOut;

  Future<void> _setSignedOut(bool value) async {
    _signedOutCache = value;
    final state = await _localStore.loadProfileFeatureState();
    await _localStore.saveProfileFeatureState(
      state.copyWith(serverSignedOut: value),
    );
  }

  Future<void> _ensureLocalDemoSession() async {
    if (await api.sessionCookie != null) return;
    // 用户主动退出后绝不自动登回去。否则「退出登录」会被下一个
    // 服务端请求立刻撤销——用户完全看不出退出生效过。
    if (await signedOut) {
      throw const SignedOutException();
    }
    if (!environment.demoLoginEnabled) return;
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

  /// 创作者中心聚合：一次 `/api/bootstrap` 派生周报、成长任务、挑战与激励。
  ///
  /// 服务端不可用时返回 [CreatorCenterSnapshot.offline]——界面显示「未接入」，
  /// 不用本地演示值冒充服务端数据。
  ///
  /// 与其它 load 方法不同，这里**不看** `preferLocalData`：创作者中心的五个模块
  /// 只在有服务端真实记录时才有意义，本地演示内容替代不了。因此始终尝试服务端，
  /// 失败就静默降级为「未接入」，不影响其它页面继续使用本地演示数据。
  // ===== P2 平台能力 =====

  /// 用 AIP 兑换 24 小时发现加权。写入类：失败必须抛出，
  /// 否则用户会以为已扣费并生效。
  Future<BoostResult> boostContent(String contentId) async {
    await _ensureLocalDemoSession();
    final response = await api.postJson(
      '/api/contents/$contentId/boost',
      const {},
    );
    return BoostResult.fromJson(response);
  }

  /// 我登记过的素材授权。读取类：失败静默返回空。
  Future<List<CreatorAsset>> loadAssets() async {
    try {
      await _ensureLocalDemoSession();
      final response = await api.getJson('/api/assets');
      return _assets(response['assets']);
    } catch (_) {
      return const [];
    }
  }

  /// 某个内容实际引用的素材及其授权状态。
  Future<List<CreatorAsset>> loadContentAssets(String contentId) async {
    try {
      await _ensureLocalDemoSession();
      final response = await api.getJson('/api/contents/$contentId/assets');
      return _assets(response['assets']);
    } catch (_) {
      return const [];
    }
  }

  List<CreatorAsset> _assets(Object? raw) => raw is List
      ? raw
            .whereType<Map<String, dynamic>>()
            .map(CreatorAsset.fromJson)
            .toList(growable: false)
      : const [];

  /// 登记素材授权。服务端强制：必须声明授权类型与 checksum；
  /// 第三方 / 品牌素材还必须给出授权凭证引用。
  Future<CreatorAsset> registerAsset({
    required String name,
    required String kind,
    required String licenseType,
    required String checksum,
    String? licenseRef,
    String? source,
  }) async {
    await _ensureLocalDemoSession();
    final response = await api.postJson('/api/assets', {
      'name': name,
      'kind': kind,
      'licenseType': licenseType,
      'checksum': checksum,
      if (licenseRef != null && licenseRef.trim().isNotEmpty)
        'licenseRef': licenseRef.trim(),
      if (source != null && source.trim().isNotEmpty) 'source': source.trim(),
    });
    final asset = response['asset'];
    return CreatorAsset.fromJson(
      asset is Map<String, dynamic> ? asset : response,
    );
  }

  /// 撤销素材授权。撤销后引用它的内容会被阻止发布。
  Future<void> revokeAsset(String assetId) async {
    await _ensureLocalDemoSession();
    await api.postJson('/api/assets/$assetId/revoke', const {});
  }

  /// 服务端 AI 分身。
  Future<ServerAiTwin?> loadServerAiTwin() async {
    try {
      await _ensureLocalDemoSession();
      final response = await api.getJson('/api/ai-twin');
      final twin = response['twin'];
      return twin is Map<String, dynamic> ? ServerAiTwin.fromJson(twin) : null;
    } catch (_) {
      return null;
    }
  }

  /// 创建或更新 AI 分身；每次保存服务端版本号递增。
  Future<ServerAiTwin> saveServerAiTwin({
    required String displayName,
    Map<String, Object?> persona = const {},
    bool voiceConsent = false,
    bool likenessConsent = false,
  }) async {
    await _ensureLocalDemoSession();
    final response = await api.postJson('/api/ai-twin', {
      'displayName': displayName,
      'persona': persona,
      'voiceConsent': voiceConsent,
      'likenessConsent': likenessConsent,
    });
    final twin = response['twin'];
    return ServerAiTwin.fromJson(
      twin is Map<String, dynamic> ? twin : response,
    );
  }

  /// 订阅计划目录。价格状态由服务端给出，客户端不得自行判定可购买。
  Future<List<SubscriptionPlan>> loadSubscriptionPlans() async {
    try {
      await _ensureLocalDemoSession();
      final response = await api.getJson('/api/economy/plans');
      final raw = response['plans'];
      return raw is List
          ? raw
                .whereType<Map<String, dynamic>>()
                .map(SubscriptionPlan.fromJson)
                .toList(growable: false)
          : const [];
    } catch (_) {
      return const [];
    }
  }

  /// 到期不续订（不是立即退款，也不是立即失效）。
  Future<DateTime?> cancelSubscriptionAtPeriodEnd() async {
    await _ensureLocalDemoSession();
    final response = await api.postJson(
      '/api/economy/subscription/cancel',
      const {},
    );
    return DateTime.tryParse('${response['endsAt']}');
  }

  /// 校验钱包地址格式与校验和。**不涉及签名**，因此可以在移动端真实完成；
  /// 真正的绑定需要设备侧签名器，目前未接入。
  Future<WalletAddressCheck> validateWalletAddress({
    required String address,
    int chainId = 1,
  }) async {
    final response = await api.postJson(
      '/api/wallet-bindings/validate-address',
      {'address': address.trim(), 'chainId': chainId},
    );
    return WalletAddressCheck(
      address: '${response['address'] ?? ''}',
      normalized: '${response['normalized'] ?? ''}',
    );
  }

  /// 平台配置的未成年人模式策略。读取失败按「未配置」处理，
  /// 不得自行编造限制。
  Future<MinorModePolicy> loadMinorModePolicy() async {
    try {
      await _ensureLocalDemoSession();
      final response = await api.getJson('/api/policies/minor-mode');
      final policy = response['policy'];
      return policy is Map<String, dynamic>
          ? MinorModePolicy.fromJson(policy)
          : MinorModePolicy.unconfigured;
    } catch (_) {
      return MinorModePolicy.unconfigured;
    }
  }

  // ===== 真实登录 =====
  //
  // 全部为写入/会话类动作，一律不静默降级：登录失败必须让用户看到原因，
  // 绝不能退回 demo 登录冒充成功。

  /// 请求邮箱登录验证码。
  Future<EmailLoginChallenge> requestEmailLoginCode(String email) async {
    final response = await api.postJson('/api/auth/email/challenge', {
      'email': email.trim(),
    });
    return EmailLoginChallenge(
      sent: response['sent'] == true,
      expiresInMinutes: (response['expiresInMinutes'] as num?)?.toInt() ?? 10,
      delivery: '${response['delivery'] ?? 'deferred_no_provider'}',
      demoCode: response['demoCode'] is String
          ? response['demoCode'] as String
          : null,
    );
  }

  /// 用验证码完成邮箱登录，服务端签发会话 Cookie。
  Future<SignedInIdentity> verifyEmailLoginCode({
    required String email,
    required String code,
  }) async {
    final response = await api.postJson('/api/auth/email/verify', {
      'email': email.trim(),
      'code': code.trim(),
    });
    final identity = _signedIn(response, 'email');
    await _setSignedOut(false);
    return identity;
  }

  /// Google **本地适配器**登录。不是真实 OAuth——界面必须如实标注。
  Future<SignedInIdentity> signInWithGoogleLocalAdapter({
    required String email,
    String? displayName,
  }) async {
    final response = await api.postJson('/api/auth/google/local', {
      'email': email.trim(),
      if (displayName != null && displayName.trim().isNotEmpty)
        'displayName': displayName.trim(),
    });
    final identity = _signedIn(response, 'google_local');
    await _setSignedOut(false);
    return identity;
  }

  SignedInIdentity _signedIn(Map<String, dynamic> response, String method) {
    final me = response['me'];
    final map = me is Map<String, dynamic> ? me : const <String, dynamic>{};
    if ('${map['id'] ?? ''}'.isEmpty) {
      throw ApiException('服务端未返回登录用户');
    }
    return SignedInIdentity(
      userId: '${map['id']}',
      displayName: '${map['displayName'] ?? ''}',
      role: '${map['role'] ?? 'player'}',
      created: response['created'] == true,
      method: method,
    );
  }

  /// 退出登录：服务端销毁会话，本地清除 Cookie。
  ///
  /// 服务端失败也要清本地凭证——否则用户以为已退出、设备上却还留着可用会话。
  Future<void> signOut() async {
    try {
      await api.postJson('/api/auth/logout', const {});
    } finally {
      // 顺序要紧：先落「已退出」标记再清 Cookie。否则两步之间的任何
      // 请求都会看到「没有 Cookie 且未标记退出」而自动登回去。
      await _setSignedOut(true);
      await api.clearSession();
    }
  }

  // ===== 账号与治理：此前只有界面、不落服务端的能力 =====
  //
  // 这几个方法一律**不做静默降级**：删除账号、举报、工单、资格申请都是用户
  // 以为「已经提交」的动作，失败必须抛出让界面显式报错。把它们降级成本地成功
  // 才是真正的危险——桥接降级只适用于展示类读取，不适用于这种有后果的写入。

  /// 当前待处理的账号删除申请；没有则返回 null。
  ///
  /// 读取类接口：服务端不可用时静默返回 null（界面按「无申请」呈现），
  /// 与下面的写入类接口刻意不同。
  Future<AccountDeletionRequest?> loadAccountDeletionRequest() async {
    try {
      await _ensureLocalDemoSession();
      final bootstrap = await api.getJson('/api/bootstrap');
      final raw = bootstrap['deletionRequest'];
      if (raw is! Map<String, dynamic>) return null;
      final status = '${raw['status'] ?? ''}';
      if (status != 'pending') return null;
      return AccountDeletionRequest(
        id: '${raw['id'] ?? ''}',
        status: status,
        scheduledFor: '${raw['scheduledFor'] ?? ''}',
        idempotent: true,
      );
    } catch (_) {
      return null;
    }
  }

  /// 提交账号删除申请（30 天冷静期）。服务端对同一账号幂等。
  Future<AccountDeletionRequest> requestAccountDeletion({
    String? reason,
  }) async {
    await _ensureLocalDemoSession();
    final response = await api.postJson('/api/account/deletion-request', {
      if (reason != null && reason.trim().isNotEmpty) 'reason': reason.trim(),
    });
    return AccountDeletionRequest(
      id: '${response['id'] ?? ''}',
      status: '${response['status'] ?? 'pending'}',
      scheduledFor: '${response['scheduledFor'] ?? ''}',
      idempotent: response['idempotent'] == true,
    );
  }

  /// 取消账号删除申请。
  Future<String> cancelAccountDeletion(String requestId) async {
    await _ensureLocalDemoSession();
    final response = await api.postJson(
      '/api/account/deletion-request/$requestId/cancel',
      const {},
    );
    return '${response['status'] ?? 'cancelled'}';
  }

  /// 当前账号仍然有效的登录会话。
  Future<List<AccountSession>> loadAccountSessions() async {
    await _ensureLocalDemoSession();
    final response = await api.getJson('/api/account/sessions');
    final raw = response['sessions'];
    if (raw is! List) return const [];
    return raw
        .whereType<Map<String, dynamic>>()
        .map(
          (item) => AccountSession(
            id: '${item['id'] ?? ''}',
            createdAt: DateTime.tryParse('${item['createdAt']}'),
            expiresAt: DateTime.tryParse('${item['expiresAt']}'),
          ),
        )
        .toList(growable: false);
  }

  /// 撤销指定登录会话。
  Future<void> revokeAccountSession(String sessionId) async {
    await _ensureLocalDemoSession();
    await api.postJson('/api/account/sessions/$sessionId/revoke', const {});
  }

  /// 把一个试玩解析成**服务端内容 id**。
  ///
  /// 服务端作品的 id 本身就是 contentId；本地试玩需要先幂等登记。
  /// 解析不出来返回 null，调用方不得凭空构造 id。
  Future<String?> resolveServerContentId({
    required String playableKey,
    required String title,
  }) async {
    if (playableKey.startsWith('content_')) return playableKey;
    final registered = await api.postJson('/api/demo/mobile-playables', {
      'playables': [
        {'key': playableKey, 'title': title},
      ],
    });
    final mapping = registered['mapping'];
    final contentId = mapping is Map<String, dynamic>
        ? mapping[playableKey]
        : null;
    return contentId is String && contentId.isNotEmpty ? contentId : null;
  }

  /// 举报已发布内容，进入平台治理队列。
  Future<ContentReportResult> reportContent({
    required String playableKey,
    required String title,
    required String reason,
    String? details,
  }) async {
    await _ensureLocalDemoSession();
    final contentId = await resolveServerContentId(
      playableKey: playableKey,
      title: title,
    );
    if (contentId == null) {
      throw ApiException('该作品在服务端没有对应内容，无法提交举报');
    }
    final response = await api.postJson('/api/content-reports', {
      'contentId': contentId,
      'reason': reason,
      if (details != null && details.trim().isNotEmpty)
        'details': details.trim(),
    });
    return ContentReportResult(status: '${response['status'] ?? 'open'}');
  }

  /// 客服工单列表（当前账号）。
  Future<List<SupportTicket>> loadSupportTickets() async {
    await _ensureLocalDemoSession();
    final response = await api.getJson('/api/support-tickets');
    final raw = response['tickets'];
    if (raw is! List) return const [];
    return raw
        .whereType<Map<String, dynamic>>()
        .map(_supportTicket)
        .toList(growable: false);
  }

  /// 提交客服工单。
  Future<SupportTicket> createSupportTicket({
    required String category,
    required String subject,
    required String body,
  }) async {
    await _ensureLocalDemoSession();
    final response = await api.postJson('/api/support-tickets', {
      'category': category,
      'subject': subject,
      'body': body,
    });
    final ticket = response['ticket'];
    return _supportTicket(
      ticket is Map<String, dynamic> ? ticket : const <String, dynamic>{},
    );
  }

  SupportTicket _supportTicket(Map<String, dynamic> item) => SupportTicket(
    id: '${item['id'] ?? ''}',
    category: '${item['category'] ?? 'other'}',
    subject: '${item['subject'] ?? ''}',
    body: '${item['body'] ?? ''}',
    status: '${item['status'] ?? 'open'}',
    createdAt: DateTime.tryParse('${item['createdAt']}'),
    replyBody: item['replyBody'] is String ? item['replyBody'] as String : null,
  );

  /// 提交创作者资格申请（进入 KYC → 平台审核链）。
  Future<CreatorApplication> submitCreatorApplication({
    required String applicationNote,
    required String regionCode,
    required bool kycConsent,
  }) async {
    await _ensureLocalDemoSession();
    final response = await api.postJson('/api/creator-applications', {
      'applicationNote': applicationNote,
      'regionCode': regionCode,
      'kycConsent': kycConsent,
    });
    final application = response['application'];
    final map = application is Map<String, dynamic>
        ? application
        : const <String, dynamic>{};
    return CreatorApplication(
      id: '${map['id'] ?? ''}',
      status: '${map['status'] ?? 'submitted'}',
      idempotent: response['idempotent'] == true,
    );
  }

  /// 游戏真正开始时调用：登记本地试玩为服务端内容（幂等）、开运行会话、
  /// 发出 `playable_start`。服务端以该事件时间为计时起点。
  ///
  /// 失败返回 null 并静默降级；调用方继续本地演示，不得伪造服务端确认。
  /// 这里**不看** `preferLocalData`——玩家实际玩的就是本地试玩，
  /// 运行证明必须能为它产生真实记录。
  Future<RuntimeProofHandle?> openRuntimeProof({
    required String playableKey,
    required String title,
  }) async {
    try {
      await _ensureLocalDemoSession();
      final contentId = await resolveServerContentId(
        playableKey: playableKey,
        title: title,
      );
      if (contentId == null) return null;

      final session = await api.postJson('/api/runtime/sessions', {
        'contentId': contentId,
      });
      final token = session['sessionToken'];
      if (token is! String || token.isEmpty) return null;

      await api.postJson('/api/runtime/events', {
        'sessionToken': token,
        'sequence': 1,
        'eventType': 'playable_start',
      });
      return RuntimeProofHandle(
        contentId: contentId,
        sessionToken: token,
        rewardEligible: session['rewardEligible'] == true,
      );
    } catch (_) {
      return null;
    }
  }

  /// 游戏有效完成时调用：补 `step_complete` 后发 `playable_complete`，
  /// 返回服务端权威的奖励结果。失败静默降级为 null。
  Future<ServerRuntimeProof?> completeRuntimeProof(
    RuntimeProofHandle handle, {
    int score = 0,
  }) async {
    try {
      await api.postJson('/api/runtime/events', {
        'sessionToken': handle.sessionToken,
        'sequence': 2,
        'eventType': 'step_complete',
      });
      final completed = await api.postJson('/api/runtime/events', {
        'sessionToken': handle.sessionToken,
        'sequence': 3,
        'eventType': 'playable_complete',
        'payload': {'score': score},
      });
      return ServerRuntimeProof(
        contentId: handle.contentId,
        rewardEligible: handle.rewardEligible,
        rewardStatus: '${completed['rewardStatus'] ?? 'unknown'}',
        points: (completed['points'] as num?)?.toInt() ?? 0,
      );
    } catch (_) {
      return null;
    }
  }

  Future<CreatorCenterSnapshot> loadCreatorCenter({DateTime? now}) async {
    try {
      await _ensureLocalDemoSession();
      final bootstrap = await api.getJson('/api/bootstrap');
      return CreatorCenterSnapshot.fromBootstrap(bootstrap, now: now);
    } catch (_) {
      return CreatorCenterSnapshot.offline;
    }
  }

  /// 报名品牌 Campaign：真实写入 campaign_participants，由服务端判定资格。
  Future<void> applyToCampaign(String campaignId) async {
    await _ensureLocalDemoSession();
    await api.postJson('/api/campaigns/$campaignId/apply', const {});
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

  Future<LocalGrowthNodeState> loadLocalGrowthNode() =>
      _localStore.loadGrowthNode();

  Future<LocalGrowthNodeState> createLocalGrowthNode() =>
      _localStore.createGrowthNode();

  Future<LocalGrowthNodeState> joinLocalGrowthNode(String inviteCode) =>
      _localStore.joinGrowthNode(inviteCode);

  Future<LocalGrowthNodeState> inviteLocalGrowthSeat(int seat) =>
      _localStore.inviteGrowthSeat(seat);

  Future<LocalGrowthNodeState> resolveLocalGrowthSeat({
    required int seat,
    required bool accepted,
  }) => _localStore.resolveGrowthSeat(seat: seat, accepted: accepted);

  Future<LocalGrowthNodeState> removeLocalGrowthMember(int seat) =>
      _localStore.removeGrowthMember(seat);

  Future<LocalGrowthNodeState> updateLocalGrowthNode({
    bool? charterAccepted,
    bool? paused,
    bool? appealSubmitted,
    String? status,
  }) => _localStore.updateGrowthNode(
    charterAccepted: charterAccepted,
    paused: paused,
    appealSubmitted: appealSubmitted,
    status: status,
  );

  Future<LocalDraft> duplicateLocalDraft(String draftId) =>
      _localStore.duplicateDraft(draftId);

  Future<List<LocalDraft>> moveLocalDraft({
    required String draftId,
    required int delta,
  }) => _localStore.moveDraft(draftId: draftId, delta: delta);

  Future<LocalWorkspaceSnapshot> trashLocalDraft(String draftId) =>
      _localStore.trashDraft(draftId);

  Future<LocalWorkspaceSnapshot> restoreLocalDraft(String draftId) =>
      _localStore.restoreDraft(draftId);

  Future<List<LocalSavedRelation>> saveLocalSavedRelation({
    required String playableId,
    required String collection,
    required String note,
  }) => _localStore.saveSavedRelation(
    playableId: playableId,
    collection: collection,
    note: note,
  );

  Future<List<LocalExperienceRecord>> deleteLocalExperienceRecord(
    String recordId,
  ) => _localStore.deleteExperienceRecord(recordId);

  Future<List<LocalExperienceRecord>> clearLocalContentRuns(
    String playableId,
  ) => _localStore.clearContentRuns(playableId);

  Future<List<LocalExperienceRecord>> clearLocalAllRuns() =>
      _localStore.clearAllRuns();

  Future<List<LocalMessageThread>> loadLocalMessageThreads() =>
      _localStore.loadMessageThreads();

  Future<List<LocalMessageThread>> sendLocalMessage({
    required String threadId,
    required String text,
  }) => _localStore.appendMessage(threadId: threadId, text: text);

  Future<List<LocalMessageThread>> markLocalThreadRead(String threadId) =>
      _localStore.markThreadRead(threadId);

  Future<List<LocalMessageThread>> requestLocalHumanHandoff(String threadId) =>
      _localStore.requestHumanHandoff(threadId);

  /// 本机作品的收藏 / 点赞落盘。服务端作品仍走 setEngagement 的 API 分支。
  Future<LocalSocialState> setLocalEngagement({
    required String playableId,
    required String eventType,
    required bool active,
  }) => _localStore.setEngagement(
    playableId: playableId,
    eventType: eventType,
    active: active,
  );

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
