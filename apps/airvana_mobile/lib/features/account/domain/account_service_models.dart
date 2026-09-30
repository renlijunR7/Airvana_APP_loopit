/// 账号与治理类服务端能力的返回模型。
///
/// 这些能力此前在 Flutter 端只有界面、不落服务端；接线后必须能追到实库行。
library;

/// 账号删除申请（30 天冷静期，可取消）。
class AccountDeletionRequest {
  const AccountDeletionRequest({
    required this.id,
    required this.status,
    required this.scheduledFor,
    required this.idempotent,
  });

  final String id;

  /// 'pending' / 'cancelled' / 'completed'，服务端权威。
  final String status;

  /// 计划删除时间（ISO8601）。
  final String scheduledFor;

  /// true = 已存在同一笔待处理申请，本次未新建。
  final bool idempotent;

  bool get pending => status == 'pending';
}

/// 一个仍然有效的登录会话。
class AccountSession {
  const AccountSession({
    required this.id,
    required this.createdAt,
    required this.expiresAt,
  });

  /// 会话 token 哈希前 16 位；撤销时按前缀匹配。
  final String id;
  final DateTime? createdAt;
  final DateTime? expiresAt;
}

/// 客服工单。`replyBody` 只有平台回复后才有值。
class SupportTicket {
  const SupportTicket({
    required this.id,
    required this.category,
    required this.subject,
    required this.body,
    required this.status,
    required this.createdAt,
    this.replyBody,
  });

  final String id;
  final String category;
  final String subject;
  final String body;

  /// 'open' / 'answered' / 'closed'，服务端权威。
  final String status;
  final DateTime? createdAt;
  final String? replyBody;

  bool get answered => (replyBody ?? '').trim().isNotEmpty;
}

/// 创作者资格申请：`submitted → kyc_pending → under_review → approved/rejected`。
class CreatorApplication {
  const CreatorApplication({
    required this.id,
    required this.status,
    required this.idempotent,
  });

  final String id;
  final String status;

  /// true = 已有进行中的申请，本次未新建。
  final bool idempotent;
}

/// 内容举报结果。服务端对同一举报人 + 同一内容唯一。
class ContentReportResult {
  const ContentReportResult({required this.status});

  /// 'open' = 本次新建；'already_reported' = 此前已举报过。
  final String status;

  bool get alreadyReported => status == 'already_reported';
}
