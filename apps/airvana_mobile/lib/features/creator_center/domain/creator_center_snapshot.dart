/// 创作者中心聚合数据：全部从服务端 `/api/bootstrap` 的真实对象派生。
///
/// 派生原则：
/// - 能从真实行算出来的才给数字（本周发布、本周 AIP、累计获赞、待办）；
/// - 算不出来的（曝光/粉丝/获赞的**增量**需要历史快照，服务端目前只存总量）
///   一律不编造，由 UI 用 [unavailableWeeklyDeltas] 如实标注为待接入；
/// - 服务端不可用时返回 [CreatorCenterSnapshot.offline]，UI 显示未接入而不是假数据。
library;

const Duration kCreatorWeeklyWindow = Duration(days: 7);

/// 需要历史快照才能计算、当前服务端无法提供的周增量指标。
const List<String> unavailableWeeklyDeltas = ['曝光增量', '粉丝增量', '获赞增量'];

DateTime? _parseTime(Object? value) =>
    value is String ? DateTime.tryParse(value)?.toUtc() : null;

int _int(Object? value) => (value as num?)?.toInt() ?? 0;

String _string(Object? value) => value is String ? value : '';

List<Map<String, dynamic>> _list(Object? value) => value is List
    ? value.whereType<Map<String, dynamic>>().toList(growable: false)
    : const [];

/// 创作周报：窗口内的真实增量 + 服务端累计值。
class CreatorWeeklyReport {
  const CreatorWeeklyReport({
    required this.periodStart,
    required this.periodEnd,
    required this.publishedThisWeek,
    required this.aipEarnedThisWeek,
    required this.totalPublished,
    required this.totalLikes,
    required this.activeTasks,
    required this.pendingDeliverables,
  });

  final DateTime periodStart;
  final DateTime periodEnd;

  /// 窗口内 published_at 落在区间内的内容数（真实）。
  final int publishedThisWeek;

  /// 窗口内已入账 AIP 合计（真实，来自 point_events）。
  final int aipEarnedThisWeek;

  final int totalPublished;
  final int totalLikes;
  final int activeTasks;
  final int pendingDeliverables;

  bool get quiet => publishedThisWeek == 0 && aipEarnedThisWeek == 0;
}

/// 成长任务：进度由真实对象驱动，不是本地计数器。
class CreatorGrowthTask {
  const CreatorGrowthTask({
    required this.id,
    required this.label,
    required this.evidence,
    required this.current,
    required this.target,
  });

  final String id;
  final String label;

  /// 这条进度是从哪个真实对象数出来的，界面上要写清楚。
  final String evidence;
  final int current;
  final int target;

  bool get done => current >= target;
}

/// 创作灵感挑战：直接用平台真实 Campaign，不用编造的话题热度。
class CreatorChallenge {
  const CreatorChallenge({
    required this.campaignId,
    required this.title,
    required this.objective,
    required this.brandName,
    required this.rewardAit,
    required this.budgetRemaining,
    required this.endsAt,
    required this.participantStatus,
  });

  final String campaignId;
  final String title;
  final String objective;
  final String brandName;
  final int rewardAit;
  final int budgetRemaining;
  final DateTime? endsAt;

  /// null = 尚未报名；其余为服务端权威的参与状态。
  final String? participantStatus;

  bool get joined => participantStatus != null;

  int? daysLeft(DateTime now) {
    final end = endsAt;
    if (end == null) return null;
    return end.difference(now).inDays;
  }
}

/// 我已发布、可用于推广的服务端作品。
class PublishedWork {
  const PublishedWork({
    required this.contentId,
    required this.title,
    required this.boosted,
  });

  final String contentId;
  final String title;

  /// 是否已有生效中的发现加权。
  final bool boosted;
}

/// 创作激励：真实入账的 AIP 奖励与真实生效的 Boost。
class CreatorIncentive {
  const CreatorIncentive({
    required this.id,
    required this.kind,
    required this.title,
    required this.amountAip,
    required this.occurredAt,
  });

  /// 'reward' = AIP 规则奖励入账；'boost' = 消耗 AIP 换取的发现加权。
  final String kind;
  final String id;
  final String title;
  final int amountAip;
  final DateTime? occurredAt;
}

class CreatorCenterSnapshot {
  const CreatorCenterSnapshot({
    required this.serverConnected,
    required this.weekly,
    required this.tasks,
    required this.challenges,
    required this.incentives,
    required this.publishedWorks,
  });

  const CreatorCenterSnapshot._offline()
    : serverConnected = false,
      weekly = null,
      tasks = const [],
      challenges = const [],
      incentives = const [],
      publishedWorks = const [];

  /// 服务端不可用：不给任何数字，由 UI 明确显示未接入。
  static const CreatorCenterSnapshot offline = CreatorCenterSnapshot._offline();

  final bool serverConnected;
  final CreatorWeeklyReport? weekly;
  final List<CreatorGrowthTask> tasks;
  final List<CreatorChallenge> challenges;
  final List<CreatorIncentive> incentives;
  final List<PublishedWork> publishedWorks;

  factory CreatorCenterSnapshot.fromBootstrap(
    Map<String, dynamic> bootstrap, {
    DateTime? now,
  }) {
    final stats = bootstrap['stats'];
    // `stats` 是 bootstrap 的必有字段。缺它说明服务端没有正常应答（空响应、
    // 代理拦截、结构变更），此时必须报「未接入」——不能把它显示成「服务端确认
    // 你的数据都是 0」，那是两件完全不同的事。
    if (stats is! Map<String, dynamic>) return CreatorCenterSnapshot.offline;
    final statsMap = stats;
    final end = (now ?? DateTime.now()).toUtc();
    final start = end.subtract(kCreatorWeeklyWindow);
    final contents = _list(bootstrap['contents']);
    final ledger = _list(bootstrap['ledger']);
    final campaigns = _list(bootstrap['campaigns']);
    final boosts = _list(bootstrap['activeBoosts']);

    final publishedThisWeek = contents.where((item) {
      if (_string(item['status']) != 'published') return false;
      final at = _parseTime(item['publishedAt']);
      return at != null && !at.isBefore(start) && !at.isAfter(end);
    }).length;

    final weekRewards = ledger
        .where((item) {
          if (_string(item['currency']) != 'AIP') return false;
          if (_string(item['status']) != 'posted') return false;
          if (_int(item['amount']) <= 0) return false;
          final at = _parseTime(item['createdAt']);
          return at != null && !at.isBefore(start) && !at.isAfter(end);
        })
        .toList(growable: false);

    final weekly = CreatorWeeklyReport(
      periodStart: start,
      periodEnd: end,
      publishedThisWeek: publishedThisWeek,
      aipEarnedThisWeek: weekRewards.fold(
        0,
        (sum, item) => sum + _int(item['amount']),
      ),
      totalPublished: _int(statsMap['publishedContents']),
      totalLikes: _int(statsMap['likesReceived']),
      activeTasks: _int(statsMap['activeTasks']),
      pendingDeliverables: _int(statsMap['pendingDeliverables']),
    );

    final moderationPassed = contents
        .where((item) => _string(item['moderationStatus']) == 'passed')
        .length;
    final joinedCampaigns = campaigns
        .where((item) => _string(item['participantStatus']).isNotEmpty)
        .length;

    final tasks = <CreatorGrowthTask>[
      CreatorGrowthTask(
        id: 'publish',
        label: '发布 1 个 Agentic Playable',
        evidence: '服务端已发布内容',
        current: weekly.totalPublished,
        target: 1,
      ),
      CreatorGrowthTask(
        id: 'moderation',
        label: '让 1 个作品通过人工审核',
        evidence: '内容审核状态 passed',
        current: moderationPassed,
        target: 1,
      ),
      CreatorGrowthTask(
        id: 'engagement',
        label: '获得 1 次有效点赞',
        evidence: '服务端 engagement_events',
        current: weekly.totalLikes,
        target: 1,
      ),
      CreatorGrowthTask(
        id: 'campaign',
        label: '报名 1 个品牌 Campaign',
        evidence: 'campaign_participants 记录',
        current: joinedCampaigns,
        target: 1,
      ),
    ];

    final challenges =
        campaigns
            .where((item) => _string(item['status']) == 'active')
            .map(
              (item) => CreatorChallenge(
                campaignId: _string(item['id']),
                title: _string(item['title']),
                objective: _string(item['objective']),
                brandName: _string(item['brandName']),
                rewardAit: _int(item['rewardAit']),
                budgetRemaining: _int(
                  (item['budgetSummary'] is Map<String, dynamic>
                      ? (item['budgetSummary']
                            as Map<String, dynamic>)['remaining']
                      : null),
                ),
                endsAt: _parseTime(item['endsAt']),
                participantStatus: _string(item['participantStatus']).isEmpty
                    ? null
                    : _string(item['participantStatus']),
              ),
            )
            .toList(growable: false)
          // 未报名的排前面，其次按单条奖励从高到低
          ..sort((a, b) {
            if (a.joined != b.joined) return a.joined ? 1 : -1;
            return b.rewardAit.compareTo(a.rewardAit);
          });

    final incentives = <CreatorIncentive>[
      for (final item in ledger.where(
        (item) =>
            _string(item['currency']) == 'AIP' &&
            _string(item['status']) == 'posted' &&
            _int(item['amount']) > 0,
      ))
        CreatorIncentive(
          id: _string(item['id']),
          kind: 'reward',
          title: _rewardLabel(_string(item['eventType'])),
          amountAip: _int(item['amount']),
          occurredAt: _parseTime(item['createdAt']),
        ),
      for (final item in boosts)
        CreatorIncentive(
          id: _string(item['id']),
          kind: 'boost',
          title: '发现加权生效中',
          amountAip: -_int(item['costAip']),
          occurredAt: _parseTime(item['startsAt']),
        ),
    ];
    incentives.sort((a, b) {
      final left = a.occurredAt;
      final right = b.occurredAt;
      if (left == null || right == null) return 0;
      return right.compareTo(left);
    });

    final boostedIds = boosts
        .map((item) => _string(item['contentId']))
        .where((id) => id.isNotEmpty)
        .toSet();
    final publishedWorks = contents
        .where((item) => _string(item['status']) == 'published')
        .map(
          (item) => PublishedWork(
            contentId: _string(item['id']),
            title: _string(item['title']),
            boosted: boostedIds.contains(_string(item['id'])),
          ),
        )
        .toList(growable: false);

    return CreatorCenterSnapshot(
      serverConnected: true,
      publishedWorks: publishedWorks,
      weekly: weekly,
      tasks: tasks,
      challenges: challenges,
      incentives: incentives.take(8).toList(growable: false),
    );
  }
}

String _rewardLabel(String eventType) => switch (eventType) {
  'daily_login' => '每日签到',
  'playable_complete' => '完成试玩',
  'first_publish' => '首次发布',
  'version_optimization' => '版本优化',
  'qualified_invitation' => '有效邀请',
  'registration_first_play' => '注册首玩',
  'daily_recommendation' => '每日推荐',
  _ when eventType.startsWith('streak_day_') => '连续签到',
  _ when eventType.startsWith('operation_task_') => '运营任务',
  _ => eventType.isEmpty ? 'AIP 入账' : eventType,
};
