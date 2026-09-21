import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:flutter/material.dart';

/// 复刻 Web 的 `playerPublish` overlay：玩家图文发布。
/// 类型与可见性选项与 Web 完全一致。
class PlayerPublishSheet extends StatefulWidget {
  const PlayerPublishSheet({super.key, required this.displayName});

  final String displayName;

  @override
  State<PlayerPublishSheet> createState() => _PlayerPublishSheetState();
}

class _PlayerPublishSheetState extends State<PlayerPublishSheet> {
  static const _types = <(String, String)>[
    ('图文', '▧'),
    ('短视频', '▶'),
    ('游戏攻略', '⌁'),
  ];
  static const _visibilities = <String>['公开', '好友可见', '仅自己'];

  final _body = TextEditingController();
  String _type = '图文';
  String _visibility = '公开';
  String? _mediaName;

  @override
  void dispose() {
    _body.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final canPublish = _body.text.trim().isNotEmpty;
    return Padding(
      key: const ValueKey('player-publish-sheet'),
      padding: EdgeInsets.only(
        bottom: MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(18, 16, 18, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Text(
                  '发布内容',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
                ),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 9,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: AirvanaColors.canvas,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    _visibility,
                    style: const TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              '${widget.displayName} · @kai.builds',
              style: const TextStyle(
                fontSize: 11,
                color: AirvanaColors.muted,
              ),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                for (final type in _types)
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      key: ValueKey('player-post-type-${type.$1}'),
                      label: Text(
                        '${type.$2} ${type.$1}',
                        style: const TextStyle(fontSize: 11),
                      ),
                      selected: _type == type.$1,
                      onSelected: (_) => setState(() => _type = type.$1),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            TextField(
              key: const ValueKey('player-post-body'),
              controller: _body,
              maxLines: 5,
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(
                hintText: '分享你的体验、攻略或想法…',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 10),
            OutlinedButton.icon(
              key: const ValueKey('player-post-media'),
              onPressed: () => setState(
                () => _mediaName = _mediaName == null ? '本地素材 01' : null,
              ),
              icon: const Icon(Icons.add_photo_alternate_outlined, size: 17),
              label: Text(_mediaName ?? '添加图片或视频'),
            ),
            const SizedBox(height: 14),
            const Text(
              '谁可以看',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                for (final option in _visibilities)
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      key: ValueKey('player-post-visibility-$option'),
                      label: Text(option, style: const TextStyle(fontSize: 11)),
                      selected: _visibility == option,
                      onSelected: (_) => setState(() => _visibility = option),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 16),
            SizedBox(
              height: 48,
              width: double.infinity,
              child: FilledButton(
                key: const ValueKey('player-post-submit'),
                // Web 同样要求正文非空才允许发布。
                onPressed: canPublish
                    ? () => Navigator.of(context).pop(
                        PlayerPostDraft(
                          type: _type,
                          visibility: _visibility,
                          body: _body.text.trim(),
                          mediaName: _mediaName,
                        ),
                      )
                    : null,
                child: const Text('发布'),
              ),
            ),
            const SizedBox(height: 10),
            const Text(
              '发布只写入本机演示数据；不会同步到任何外部平台。',
              style: TextStyle(
                fontSize: 10,
                height: 1.6,
                color: AirvanaColors.muted,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class PlayerPostDraft {
  const PlayerPostDraft({
    required this.type,
    required this.visibility,
    required this.body,
    this.mediaName,
  });

  final String type;
  final String visibility;
  final String body;
  final String? mediaName;
}
