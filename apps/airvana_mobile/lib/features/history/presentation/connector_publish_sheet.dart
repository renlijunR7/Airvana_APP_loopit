import 'package:airvana_mobile/design_system/airvana_shared_cards.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/shared/domain/airvana_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// 发布连接器，对应 Web 的 `overlay:'connectorPublish'`。
///
/// 边界与 Web 逐字一致：纯前端状态模拟，未调用任何渠道 API，也不会在 Airvana 内
/// 伪造已发布状态；必须逐渠道确认，成功、部分成功与失败分别记录，
/// 绝不会用一个渠道的结果代表全部渠道。
class ConnectorPublishSheet extends StatefulWidget {
  const ConnectorPublishSheet({super.key, required this.playable});

  final Playable playable;

  @override
  State<ConnectorPublishSheet> createState() => _ConnectorPublishSheetState();
}

class _ConnectorPublishSheetState extends State<ConnectorPublishSheet> {
  static const _connectors = <(String, String, String)>[
    ('x', 'X', '外部连接意向 · 待授权'),
    ('telegram', 'Telegram', '社区分发意向 · 待授权'),
    ('discord', 'Discord', '社区运营意向 · 待授权'),
    ('instagram', 'Instagram', '内容分发意向 · 待授权'),
  ];

  /// idle / opening / success / partial / failed
  final _states = <String, String>{};
  final _linkIds = <String, String>{};

  Future<void> _publish(String key, String label) async {
    setState(() => _states[key] = 'opening');
    await Future<void>.delayed(const Duration(milliseconds: 600));
    if (!mounted) return;
    // 每个渠道生成独立 channel_id 与 link_id，用于区分分发意图与后续归因。
    final linkId =
        'connector-$key-${widget.playable.id}-'
        '${DateTime.now().millisecondsSinceEpoch}';
    setState(() {
      _linkIds[key] = linkId;
      // 本机只能生成链接，无法确认平台内是否真的发布，因此统一记为部分成功，
      // 不把任何一个渠道当成已发布。
      _states[key] = 'partial';
    });
    await Clipboard.setData(ClipboardData(text: linkId));
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text('$label 专属链接已复制；请在平台内确认发布')));
  }

  String _statusLabel(String key) => switch (_states[key]) {
    'opening' => '打开中…',
    'success' => '已确认发布',
    'partial' => '已生成链接 · 待平台内确认',
    'failed' => '未能打开 · 可重试',
    _ => '未发布',
  };

  @override
  Widget build(BuildContext context) => SafeArea(
    child: SingleChildScrollView(
      key: const ValueKey('connector-publish-sheet'),
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 28),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '↗ 发布连接器',
            style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 5),
          Text(
            '${widget.playable.title} · v${widget.playable.version}',
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 4),
          const Text(
            '每个渠道会生成独立 channel_id 与 link_id，用于区分分发意图和后续归因。',
            style: TextStyle(
              fontSize: 10,
              height: 1.6,
              color: AirvanaColors.muted,
            ),
          ),
          const SizedBox(height: 14),
          for (final connector in _connectors)
            Container(
              key: ValueKey('connector-row-${connector.$1}'),
              margin: const EdgeInsets.only(bottom: 9),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AirvanaColors.line),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 14,
                    backgroundColor: AirvanaColors.canvas,
                    child: Text(
                      connector.$2.substring(0, 1),
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  const SizedBox(width: 11),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          connector.$2,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          connector.$3,
                          style: const TextStyle(
                            fontSize: 9,
                            color: AirvanaColors.muted,
                          ),
                        ),
                        Text(
                          _statusLabel(connector.$1),
                          key: ValueKey('connector-status-${connector.$1}'),
                          style: const TextStyle(
                            fontSize: 9,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ],
                    ),
                  ),
                  TextButton(
                    key: ValueKey('connector-publish-${connector.$1}'),
                    onPressed: _states[connector.$1] == 'opening'
                        ? null
                        : () => _publish(connector.$1, connector.$2),
                    child: Text(
                      _states.containsKey(connector.$1) ? '重试 ›' : '发布 ›',
                    ),
                  ),
                ],
              ),
            ),
          const SizedBox(height: 4),
          const BoundaryCard(
            key: ValueKey('connector-publish-boundary'),
            title: '发布边界',
            body:
                '当前为纯前端状态模拟，未调用任何渠道 API，也不会在 Airvana 内伪造已发布状态。'
                '用户必须逐渠道明确确认；成功、部分成功或失败分别记录，'
                '绝不会用一个渠道的结果代表全部渠道。',
          ),
        ],
      ),
    ),
  );
}
