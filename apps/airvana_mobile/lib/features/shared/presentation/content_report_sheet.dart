import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/shared/domain/airvana_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// 举报理由，取值与服务端 `/api/content-reports` 的白名单一致。
/// 服务端只接受这些值，其余一律落为 other。
const contentReportReasons = <(String, String)>[
  ('unsafe', '不良或危险内容'),
  ('copyright', '侵犯版权'),
  ('spam', '垃圾信息或刷量'),
  ('misleading', '误导性宣传'),
  ('privacy', '侵犯隐私'),
  ('other', '其他'),
];

/// 让用户选择理由并把举报**真实提交**到平台治理队列。
///
/// 提交失败会明确报错——举报是用户以为「已经举报」的动作，
/// 不能静默降级成本地成功。
Future<void> showContentReportSheet(
  BuildContext context,
  WidgetRef ref,
  Playable playable,
) async {
  final reason = await showModalBottomSheet<String>(
    context: context,
    showDragHandle: true,
    builder: (sheetContext) => SafeArea(
      child: Column(
        key: const ValueKey('content-report-sheet'),
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 0, 20, 4),
            child: Text(
              '举报这个作品',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900),
            ),
          ),
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 0, 20, 10),
            child: Text(
              '举报会进入平台治理队列并由人工复核；重复举报同一作品只记一次。',
              style: TextStyle(fontSize: 10, color: AirvanaColors.muted),
            ),
          ),
          for (final (value, label) in contentReportReasons)
            ListTile(
              key: ValueKey('content-report-reason-$value'),
              dense: true,
              title: Text(label, style: const TextStyle(fontSize: 13)),
              onTap: () => Navigator.pop(sheetContext, value),
            ),
        ],
      ),
    ),
  );
  if (reason == null || !context.mounted) return;

  final messenger = ScaffoldMessenger.of(context);
  try {
    final result = await ref
        .read(airvanaRepositoryProvider)
        .reportContent(
          playableKey: playable.id,
          title: playable.title,
          reason: reason,
        );
    messenger.showSnackBar(
      SnackBar(
        content: Text(
          result.alreadyReported ? '你此前已举报过该作品，平台仍在处理中' : '举报已提交平台治理队列',
        ),
      ),
    );
  } catch (error) {
    messenger.showSnackBar(SnackBar(content: Text('举报未提交成功：$error')));
  }
}
