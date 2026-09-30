import 'package:airvana_mobile/features/creator_center/domain/creator_center_snapshot.dart';
import 'package:flutter_test/flutter_test.dart';

/// 创作者中心聚合数据的派生规则。
///
/// 重点不是「有数字」，而是：数字必须能追到 bootstrap 里的真实行，
/// 追不到的（曝光/粉丝/获赞增量）绝不编造。
void main() {
  final now = DateTime.utc(2026, 9, 10, 12);
  String daysAgo(int days) =>
      now.subtract(Duration(days: days)).toIso8601String();

  Map<String, dynamic> bootstrap() => {
    'stats': {
      'publishedContents': 3,
      'likesReceived': 12,
      'activeTasks': 1,
      'pendingDeliverables': 2,
    },
    'contents': [
      {
        'id': 'c1',
        'status': 'published',
        'moderationStatus': 'passed',
        'publishedAt': daysAgo(2),
      },
      {
        'id': 'c2',
        'status': 'published',
        'moderationStatus': 'passed',
        'publishedAt': daysAgo(6),
      },
      // 窗口外，不计入本周
      {
        'id': 'c3',
        'status': 'published',
        'moderationStatus': 'not_run',
        'publishedAt': daysAgo(20),
      },
      // 未发布，不计入
      {'id': 'c4', 'status': 'draft', 'moderationStatus': 'not_run'},
    ],
    'ledger': [
      {
        'id': 'p1',
        'currency': 'AIP',
        'status': 'posted',
        'amount': 5,
        'eventType': 'daily_login',
        'createdAt': daysAgo(1),
      },
      {
        'id': 'p2',
        'currency': 'AIP',
        'status': 'posted',
        'amount': 50,
        'eventType': 'first_publish',
        'createdAt': daysAgo(3),
      },
      // 窗口外
      {
        'id': 'p3',
        'currency': 'AIP',
        'status': 'posted',
        'amount': 100,
        'eventType': 'registration_first_play',
        'createdAt': daysAgo(30),
      },
      // 未入账
      {
        'id': 'p4',
        'currency': 'AIP',
        'status': 'pending',
        'amount': 20,
        'eventType': 'daily_recommendation',
        'createdAt': daysAgo(1),
      },
      // AIT 不进 AIP 周报
      {
        'id': 'p5',
        'currency': 'AIT',
        'status': 'posted',
        'amount': 300,
        'eventType': 'campaign_reward',
        'createdAt': daysAgo(1),
      },
    ],
    'campaigns': [
      {
        'id': 'camp_a',
        'title': '夏季新品挑战',
        'objective': '拉新',
        'brandName': 'Brand A',
        'status': 'active',
        'rewardAit': 100,
        'budgetSummary': {'remaining': 800},
        'endsAt': now.add(const Duration(days: 5)).toIso8601String(),
      },
      {
        'id': 'camp_b',
        'title': '高奖励挑战',
        'objective': '转化',
        'brandName': 'Brand B',
        'status': 'active',
        'rewardAit': 300,
        'budgetSummary': {'remaining': 2000},
        'endsAt': now.add(const Duration(days: 9)).toIso8601String(),
      },
      {
        'id': 'camp_joined',
        'title': '已报名挑战',
        'objective': '留存',
        'brandName': 'Brand C',
        'status': 'active',
        'rewardAit': 500,
        'budgetSummary': {'remaining': 4000},
        'participantStatus': 'eligible',
      },
      // 非 active 不进挑战列表
      {
        'id': 'camp_draft',
        'title': '草稿 Campaign',
        'status': 'draft',
        'rewardAit': 999,
      },
    ],
    'activeBoosts': [
      {'id': 'b1', 'contentId': 'c1', 'costAip': 20, 'startsAt': daysAgo(1)},
    ],
  };

  test('weekly report counts only real rows inside the 7-day window', () {
    final snapshot = CreatorCenterSnapshot.fromBootstrap(bootstrap(), now: now);
    final weekly = snapshot.weekly!;
    expect(snapshot.serverConnected, isTrue);
    expect(weekly.publishedThisWeek, 2, reason: '20 天前那条不算本周');
    expect(weekly.aipEarnedThisWeek, 55, reason: '只累计窗口内、已入账、正数的 AIP：5 + 50');
    expect(weekly.totalPublished, 3);
    expect(weekly.totalLikes, 12);
    expect(weekly.activeTasks, 1);
    expect(weekly.pendingDeliverables, 2);
    expect(
      weekly.periodEnd.difference(weekly.periodStart),
      kCreatorWeeklyWindow,
    );
  });

  test('deltas that need historical snapshots are declared, not invented', () {
    expect(unavailableWeeklyDeltas, containsAll(['曝光增量', '粉丝增量', '获赞增量']));
    final weekly = CreatorCenterSnapshot.fromBootstrap(
      bootstrap(),
      now: now,
    ).weekly!;
    // 模型上根本没有这些字段，杜绝界面误用
    expect(weekly.toString(), isNot(contains('followerDelta')));
  });

  test('growth task progress is derived from real objects', () {
    final tasks = CreatorCenterSnapshot.fromBootstrap(
      bootstrap(),
      now: now,
    ).tasks;
    Map<String, CreatorGrowthTask> byId = {
      for (final task in tasks) task.id: task,
    };
    expect(byId['publish']!.current, 3);
    expect(byId['publish']!.done, isTrue);
    expect(
      byId['moderation']!.current,
      2,
      reason: '两条 moderationStatus=passed',
    );
    expect(byId['engagement']!.current, 12);
    expect(byId['campaign']!.current, 1, reason: '只有 camp_joined 有参与状态');
    expect(byId['campaign']!.done, isTrue);
    for (final task in tasks) {
      expect(task.evidence, isNotEmpty, reason: '每条任务都要说明进度来自哪个真实对象');
    }
  });

  test('challenges use active campaigns, unjoined first then by reward', () {
    final challenges = CreatorCenterSnapshot.fromBootstrap(
      bootstrap(),
      now: now,
    ).challenges;
    expect(
      challenges.map((item) => item.campaignId),
      ['camp_b', 'camp_a', 'camp_joined'],
      reason: '未报名的排前面并按单条奖励降序；已报名的沉底；draft 不出现',
    );
    expect(challenges.first.rewardAit, 300);
    expect(challenges.first.budgetRemaining, 2000);
    expect(challenges.first.daysLeft(now), 9);
    expect(challenges.first.joined, isFalse);
    expect(challenges.last.joined, isTrue);
    expect(challenges.last.participantStatus, 'eligible');
  });

  test('incentives combine posted AIP rewards and active boosts', () {
    final incentives = CreatorCenterSnapshot.fromBootstrap(
      bootstrap(),
      now: now,
    ).incentives;
    final rewards = incentives.where((item) => item.kind == 'reward');
    expect(rewards.map((item) => item.id), [
      'p1',
      'p2',
      'p3',
    ], reason: 'pending 与 AIT 不进激励流水');
    expect(rewards.first.title, '每日签到');
    expect(
      incentives.firstWhere((item) => item.kind == 'boost').amountAip,
      -20,
      reason: 'Boost 是消耗 AIP，应记为负数',
    );
    // 按时间倒序
    final times = incentives
        .map((item) => item.occurredAt!)
        .toList(growable: false);
    for (var i = 1; i < times.length; i += 1) {
      expect(
        times[i - 1].isAfter(times[i]) || times[i - 1] == times[i],
        isTrue,
      );
    }
  });

  test('offline snapshot exposes nothing rather than fake values', () {
    const snapshot = CreatorCenterSnapshot.offline;
    expect(snapshot.serverConnected, isFalse);
    expect(snapshot.weekly, isNull);
    expect(snapshot.tasks, isEmpty);
    expect(snapshot.challenges, isEmpty);
    expect(snapshot.incentives, isEmpty);
  });

  test(
    'a response without stats counts as not-connected, not as real zeros',
    () {
      // 空响应 / 被代理改写 / 结构变更：必须报未接入，
      // 而不是显示成「服务端确认你的数据都是 0」
      expect(
        CreatorCenterSnapshot.fromBootstrap(const {}, now: now).serverConnected,
        isFalse,
      );
      expect(
        CreatorCenterSnapshot.fromBootstrap(const {
          'stats': 'not-a-map',
        }, now: now).serverConnected,
        isFalse,
      );
    },
  );

  test('a genuinely empty new account still reports real zeros', () {
    final snapshot = CreatorCenterSnapshot.fromBootstrap(const {
      'stats': {
        'publishedContents': 0,
        'likesReceived': 0,
        'activeTasks': 0,
        'pendingDeliverables': 0,
      },
    }, now: now);
    expect(snapshot.serverConnected, isTrue, reason: 'stats 在，就是真实的 0');
    expect(snapshot.weekly!.quiet, isTrue);
    expect(snapshot.challenges, isEmpty);
    expect(snapshot.incentives, isEmpty);
    expect(snapshot.tasks.every((task) => !task.done), isTrue);
  });
}
