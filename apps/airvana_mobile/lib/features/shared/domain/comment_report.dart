enum CommentReportReason {
  spam('垃圾广告或刷屏'),
  harassment('辱骂、骚扰或仇恨言论'),
  unsafe('色情、暴力或危险内容'),
  privacy('泄露隐私'),
  misleading('诈骗或误导信息'),
  other('其他');

  const CommentReportReason(this.label);
  final String label;
}

class CommentReportReceipt {
  const CommentReportReceipt({
    required this.id,
    required this.status,
    required this.demo,
    required this.alreadyReported,
  });

  final String id;
  final String status;
  final bool demo;
  final bool alreadyReported;
}
