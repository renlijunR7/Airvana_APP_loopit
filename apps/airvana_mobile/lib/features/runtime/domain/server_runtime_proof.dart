/// 一次已在服务端开启的运行证明会话。
///
/// `playable_start` 必须在游戏**真正开始**时发出：服务端以该事件时间为起点，
/// 完成时若不足最短时长（默认 2 秒）不但不发 AIP，还会自动建风险案
/// `impossibly_fast_completion`。因此绝不能在结束时把三步补发成一串。
class RuntimeProofHandle {
  const RuntimeProofHandle({
    required this.contentId,
    required this.sessionToken,
    required this.rewardEligible,
  });

  final String contentId;
  final String sessionToken;
  final bool rewardEligible;
}

/// 服务端运行证明的结果。
///
/// 只有服务端真实返回才会构造出这个对象；任何一步失败，仓储都返回 null，
/// 调用方继续使用本地演示奖励，不得把本地结果标成服务端确认。
class ServerRuntimeProof {
  const ServerRuntimeProof({
    required this.contentId,
    required this.rewardEligible,
    required this.rewardStatus,
    required this.points,
  });

  final String contentId;

  /// 服务端判定本次会话是否具备奖励资格（他人内容、未超频、无高分风险案）。
  final bool rewardEligible;

  /// 'posted' = 真实入账；'daily_duplicate' = 24 小时内已发过；其余为服务端口径。
  final String rewardStatus;

  /// 实际入账的 AIP，未入账时为 0。
  final int points;

  bool get posted => rewardStatus == 'posted' && points > 0;
}
