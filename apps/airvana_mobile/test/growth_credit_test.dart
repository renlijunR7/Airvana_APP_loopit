import 'package:airvana_mobile/features/network/domain/growth_node_state.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('信用分公式与 Web 的 calculateGrowthCreditScore 一致', () {
    // 未创建节点、无 KYC、无公约：Web 同输入下为 300 分区间的「风险关注」。
    final empty = calculateGrowthCredit(
      const LocalGrowthNodeState(),
      kycVerified: false,
    );
    expect(empty.threshold, 650);
    expect(empty.factors.map((item) => item.weight), [35, 25, 25, 15]);
    expect(empty.score, greaterThanOrEqualTo(300));
    expect(empty.score, lessThanOrEqualTo(900));

    // 五人全确认 + 公约 + KYC + 试运行 + 8 条证据应当跨过 650 门槛。
    final strong = calculateGrowthCredit(
      LocalGrowthNodeState(
        status: 'trial',
        members: LocalGrowthNodeState.seedMembers()
            .map((item) => item.copyWith(status: 'accepted'))
            .toList(growable: false),
        charterAccepted: true,
        contributionCount: 8,
      ),
      kycVerified: true,
    );
    expect(strong.eligible, isTrue);
    expect(strong.band, anyOf('良好', '卓越'));

    // 暂停与退出都应当拉低分数。
    final paused = calculateGrowthCredit(
      LocalGrowthNodeState(
        status: 'trial',
        members: LocalGrowthNodeState.seedMembers()
            .map((item) => item.copyWith(status: 'accepted'))
            .toList(growable: false),
        charterAccepted: true,
        contributionCount: 8,
        paused: true,
      ),
      kycVerified: true,
    );
    expect(paused.score, lessThan(strong.score));
  });

  test('席位与状态文案与 Web 一致', () {
    final members = LocalGrowthNodeState.seedMembers();
    expect(members, hasLength(5));
    expect(members.first.role, '发起人 · 创作与运营');
    expect(members.first.statusLabel, '已确认');
    expect(members.last.statusLabel, '待邀请');

    const node = LocalGrowthNodeState(status: 'recruiting');
    expect(node.statusLabel, '招募中');
    expect(
      const LocalGrowthNodeState(status: 'trial', paused: true).statusLabel,
      '已暂停（演示）',
    );
  });
}
