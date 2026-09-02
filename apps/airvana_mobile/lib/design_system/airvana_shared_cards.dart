import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:flutter/material.dart';

/// 三模块共用的状态口径：演示 / 待确认 / 已确认 / 警示。
enum AirvanaStatusTone { demo, pending, confirmed, alert }

/// 旧版 Web 的状态 pill（圆角胶囊 + 语义色），用于余额、权益、审核态等标注。
class StatusPill extends StatelessWidget {
  const StatusPill({super.key, required this.label, required this.tone});

  final String label;
  final AirvanaStatusTone tone;

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = switch (tone) {
      AirvanaStatusTone.demo => (const Color(0xFFF2F2F7), const Color(0xFF636366)),
      AirvanaStatusTone.pending => (const Color(0xFFFFF4DF), const Color(0xFF8B5B00)),
      AirvanaStatusTone.confirmed => (const Color(0xFFEAF8EF), const Color(0xFF147542)),
      AirvanaStatusTone.alert => (const Color(0xFFFFF1F2), const Color(0xFFC62836)),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: fg),
      ),
    );
  }
}

/// 红线边界卡：口径声明专用（对齐旧版 Web「经济模型边界」等红色警示卡）。
/// 文案属于产品口径的一部分，迁移时不得省略或改写。
class BoundaryCard extends StatelessWidget {
  const BoundaryCard({super.key, required this.title, required this.body});

  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(15),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF8F8),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFFFD6DA)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w800,
              color: Color(0xFFC62836),
            ),
          ),
          const SizedBox(height: 7),
          Text(
            body,
            style: const TextStyle(
              fontSize: 11,
              color: Color(0xFF6E5A5D),
              height: 1.65,
            ),
          ),
        ],
      ),
    );
  }
}

/// 审计 / 账本行：标题 + 时间 + 右侧数额或状态。钱包流水与 AI 分身审计共用。
class LedgerRow extends StatelessWidget {
  const LedgerRow({
    super.key,
    required this.title,
    required this.subtitle,
    this.trailing,
    this.trailingColor = AirvanaColors.accent,
    this.pill,
  });

  final String title;
  final String subtitle;
  final String? trailing;
  final Color trailingColor;
  final StatusPill? pill;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFFF7F7FA),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFF1F1F6)),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    if (pill != null) ...[const SizedBox(width: 8), pill!],
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 11,
                    color: Color(0xFF8E8E93),
                  ),
                ),
              ],
            ),
          ),
          if (trailing != null)
            Text(
              trailing!,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w900,
                color: trailingColor,
              ),
            ),
        ],
      ),
    );
  }
}
