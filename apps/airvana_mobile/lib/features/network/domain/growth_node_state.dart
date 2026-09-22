/// 本机增长节点状态，对应 Web 的 growthNode* 一组 state。
/// 所有内容都是本机意向：不会修改真实成员关系、服务端资格、合约或资产。
class LocalGrowthMember {
  const LocalGrowthMember({
    required this.seat,
    required this.name,
    required this.owner,
    required this.role,
    required this.status,
  });

  factory LocalGrowthMember.fromJson(Map<String, dynamic> json) =>
      LocalGrowthMember(
        seat: (json['seat'] as num?)?.toInt() ?? 1,
        name: '${json['name'] ?? '等待成员'}',
        owner: '${json['owner'] ?? ''}',
        role: '${json['role'] ?? ''}',
        status: '${json['status'] ?? 'empty'}',
      );

  final int seat;
  final String name;
  final String owner;
  final String role;

  /// accepted / pending / empty，与 Web 的 member.status 同口径。
  final String status;

  bool get accepted => status == 'accepted';

  String get statusLabel => switch (status) {
    'accepted' => '已确认',
    'pending' => '待确认',
    _ => '待邀请',
  };

  LocalGrowthMember copyWith({String? name, String? owner, String? status}) =>
      LocalGrowthMember(
        seat: seat,
        name: name ?? this.name,
        owner: owner ?? this.owner,
        role: role,
        status: status ?? this.status,
      );

  Map<String, dynamic> toJson() => {
    'seat': seat,
    'name': name,
    'owner': owner,
    'role': role,
    'status': status,
  };
}

/// Web 的五个协作角色，顺序固定。
const kGrowthSeatRoles = <String>[
  '发起人 · 创作与运营',
  '内容与创意',
  '社区与分发',
  '运营与归因',
  '审核与合规',
];

class LocalGrowthNodeState {
  const LocalGrowthNodeState({
    this.status = 'not_created',
    this.inviteCode = 'AIR-NODE-4821',
    this.members = const [],
    this.charterAccepted = false,
    this.paused = false,
    this.appealSubmitted = false,
    this.contributionCount = 0,
  });

  factory LocalGrowthNodeState.fromJson(Map<String, dynamic> json) =>
      LocalGrowthNodeState(
        status: '${json['status'] ?? 'not_created'}',
        inviteCode: '${json['invite_code'] ?? 'AIR-NODE-4821'}',
        members: (json['members'] as List<dynamic>? ?? const [])
            .whereType<Map<String, dynamic>>()
            .map(LocalGrowthMember.fromJson)
            .toList(growable: false),
        charterAccepted: json['charter_accepted'] == true,
        paused: json['paused'] == true,
        appealSubmitted: json['appeal_submitted'] == true,
        contributionCount: (json['contribution_count'] as num?)?.toInt() ?? 0,
      );

  /// not_created / recruiting / trial / economic_review_demo / exited_demo
  final String status;
  final String inviteCode;
  final List<LocalGrowthMember> members;
  final bool charterAccepted;
  final bool paused;
  final bool appealSubmitted;
  final int contributionCount;

  bool get created => status != 'not_created';

  int get acceptedCount => members.where((item) => item.accepted).length;

  String get statusLabel {
    if (status == 'exited_demo') return '已退出（演示）';
    if (paused) return '已暂停（演示）';
    return switch (status) {
      'recruiting' => '招募中',
      'trial' => '试运行',
      'economic_review_demo' => '经济资格复核（演示）',
      _ => '未创建',
    };
  }

  /// 建立本机协作组：发起人占第一席，其余四席待邀请。
  static List<LocalGrowthMember> seedMembers() => [
    for (var index = 0; index < kGrowthSeatRoles.length; index += 1)
      LocalGrowthMember(
        seat: index + 1,
        name: index == 0 ? 'Kai Chen' : '等待成员',
        owner: index == 0 ? '@kai.builds' : '',
        role: kGrowthSeatRoles[index],
        status: index == 0 ? 'accepted' : 'empty',
      ),
  ];

  LocalGrowthNodeState copyWith({
    String? status,
    String? inviteCode,
    List<LocalGrowthMember>? members,
    bool? charterAccepted,
    bool? paused,
    bool? appealSubmitted,
    int? contributionCount,
  }) => LocalGrowthNodeState(
    status: status ?? this.status,
    inviteCode: inviteCode ?? this.inviteCode,
    members: members ?? this.members,
    charterAccepted: charterAccepted ?? this.charterAccepted,
    paused: paused ?? this.paused,
    appealSubmitted: appealSubmitted ?? this.appealSubmitted,
    contributionCount: contributionCount ?? this.contributionCount,
  );

  Map<String, dynamic> toJson() => {
    'status': status,
    'invite_code': inviteCode,
    'members': members.map((item) => item.toJson()).toList(growable: false),
    'charter_accepted': charterAccepted,
    'paused': paused,
    'appeal_submitted': appealSubmitted,
    'contribution_count': contributionCount,
  };
}

class GrowthCreditFactor {
  const GrowthCreditFactor({
    required this.key,
    required this.icon,
    required this.label,
    required this.weight,
    required this.value,
    required this.desc,
  });

  final String key;
  final String icon;
  final String label;
  final int weight;
  final int value;
  final String desc;
}

class GrowthCredit {
  const GrowthCredit({
    required this.score,
    required this.threshold,
    required this.band,
    required this.eligible,
    required this.factors,
  });

  final int score;
  final int threshold;
  final String band;
  final bool eligible;
  final List<GrowthCreditFactor> factors;
}

/// 与 Web 的 calculateGrowthCreditScore 同一套公式与权重。
/// 只是前端估算；真实分数由权威事件与服务端确认。
GrowthCredit calculateGrowthCredit(
  LocalGrowthNodeState node, {
  required bool kycVerified,
}) {
  int clampFactor(num value) => value.round().clamp(0, 100);
  final accepted = node.acceptedCount;
  final evidence = node.contributionCount > 8 ? 8 : node.contributionCount;
  final activeTrial =
      node.status == 'trial' || node.status == 'economic_review_demo';
  final paused = node.status == 'paused' || node.paused;
  final exited = node.status == 'exited_demo';
  final charter = node.charterAccepted;

  final factors = <GrowthCreditFactor>[
    GrowthCreditFactor(
      key: 'fulfillment',
      icon: '✓',
      label: '履约记录',
      weight: 35,
      value: clampFactor(
        42 +
            evidence * 6 +
            (activeTrial ? 14 : 0) -
            (paused ? 15 : 0) -
            (exited ? 25 : 0),
      ),
      desc: '按期完成任务、版本交付与已确认结果',
    ),
    GrowthCreditFactor(
      key: 'collaboration',
      icon: '◎',
      label: '协作稳定性',
      weight: 25,
      value: clampFactor(
        38 +
            accepted * 9 +
            (charter ? 10 : 0) -
            (paused ? 18 : 0) -
            (exited ? 25 : 0),
      ),
      desc: '成员确认、角色稳定、节点连续运行与退出记录',
    ),
    GrowthCreditFactor(
      key: 'evidence',
      icon: '◇',
      label: '贡献可信度',
      weight: 25,
      value: clampFactor(
        42 + evidence * 7 + (node.status == 'economic_review_demo' ? 8 : 0),
      ),
      desc: '贡献事件、归因、反作弊与多方核验完整度',
    ),
    GrowthCreditFactor(
      key: 'compliance',
      icon: '⌁',
      label: '风险与合规',
      weight: 15,
      value: clampFactor(
        48 +
            (charter ? 16 : 0) +
            (kycVerified ? 24 : 0) -
            (node.appealSubmitted ? 18 : 0) -
            (paused ? 10 : 0),
      ),
      desc: 'KYC、公约、争议、暂停与风险处置记录',
    ),
  ];

  final weighted = factors.fold<double>(
    0,
    (total, factor) => total + factor.value * factor.weight / 100,
  );
  final score = (300 + weighted * 6).round().clamp(300, 900);
  const threshold = 650;
  final band = score >= 800
      ? '卓越'
      : score >= 700
      ? '良好'
      : score >= 650
      ? '合格'
      : score >= 550
      ? '观察中'
      : '风险关注';
  return GrowthCredit(
    score: score,
    threshold: threshold,
    band: band,
    eligible: score >= threshold,
    factors: factors,
  );
}
