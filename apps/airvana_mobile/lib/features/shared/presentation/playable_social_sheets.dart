import 'dart:math' as math;

import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/design_system/legacy_web_assets.dart';
import 'package:airvana_mobile/features/shared/domain/airvana_models.dart';
import 'package:flutter/material.dart';

enum AirvanaShareChoice {
  copy('复制链接'),
  system('系统分享'),
  tiktok('TikTok'),
  instagram('Instagram'),
  x('X'),
  restart('重新体验'),
  fullscreen('全屏'),
  dislike('不感兴趣'),
  report('举报'),
  block('屏蔽');

  const AirvanaShareChoice(this.label);

  final String label;
}

class AirvanaShareSheet extends StatelessWidget {
  const AirvanaShareSheet({required this.playable, super.key});

  final Playable playable;

  static const _items = <(AirvanaShareChoice, IconData)>[
    (AirvanaShareChoice.copy, Icons.link_rounded),
    (AirvanaShareChoice.system, Icons.ios_share_rounded),
    (AirvanaShareChoice.tiktok, Icons.music_note_rounded),
    (AirvanaShareChoice.instagram, Icons.camera_alt_outlined),
    (AirvanaShareChoice.x, Icons.close_rounded),
    (AirvanaShareChoice.restart, Icons.replay_rounded),
    (AirvanaShareChoice.fullscreen, Icons.fullscreen_rounded),
    (AirvanaShareChoice.dislike, Icons.heart_broken_outlined),
    (AirvanaShareChoice.report, Icons.gpp_maybe_outlined),
    (AirvanaShareChoice.block, Icons.block_rounded),
  ];

  @override
  Widget build(BuildContext context) => Semantics(
    container: true,
    explicitChildNodes: true,
    namesRoute: true,
    label: '分享 Playable',
    child: Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 18),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Expanded(
                child: Text(
                  '分享',
                  style: TextStyle(
                    color: AirvanaColors.ink,
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -.2,
                  ),
                ),
              ),
              Semantics(
                button: true,
                label: '关闭分享',
                child: Material(
                  color: const Color(0xFFF2F2F7),
                  shape: const CircleBorder(),
                  child: InkWell(
                    customBorder: const CircleBorder(),
                    onTap: () => Navigator.pop(context),
                    child: const SizedBox.square(
                      dimension: 40,
                      child: Icon(Icons.close_rounded, size: 22),
                    ),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          GridView.builder(
            key: const ValueKey('share-action-grid'),
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _items.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 5,
              mainAxisExtent: 86,
              crossAxisSpacing: 8,
              mainAxisSpacing: 16,
            ),
            itemBuilder: (context, index) {
              final item = _items[index];
              return _AirvanaShareAction(
                choice: item.$1,
                icon: item.$2,
                onTap: () => Navigator.pop(context, item.$1),
              );
            },
          ),
          const SizedBox(height: 8),
          Text(
            '前端演示：复制与渠道操作只记录分享意图；仅系统回调成功才标记为已分享。\n${playable.title}',
            style: const TextStyle(
              color: AirvanaColors.muted,
              fontSize: 9,
              height: 1.55,
            ),
          ),
        ],
      ),
    ),
  );
}

class _AirvanaShareAction extends StatelessWidget {
  const _AirvanaShareAction({
    required this.choice,
    required this.icon,
    required this.onTap,
  });

  final AirvanaShareChoice choice;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final instagram = choice == AirvanaShareChoice.instagram;
    final dark =
        choice == AirvanaShareChoice.tiktok || choice == AirvanaShareChoice.x;
    final semanticLabel = switch (choice) {
      AirvanaShareChoice.tiktok ||
      AirvanaShareChoice.instagram ||
      AirvanaShareChoice.x => '分享到 ${choice.label}',
      _ => choice.label,
    };
    return Semantics(
      button: true,
      label: semanticLabel,
      child: InkResponse(
        key: ValueKey('share-action-${choice.name}'),
        onTap: onTap,
        radius: 34,
        child: Column(
          children: [
            DecoratedBox(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: dark ? const Color(0xFF050505) : const Color(0xFFF2F2F7),
                gradient: instagram
                    ? const RadialGradient(
                        center: Alignment(0.36, 0.4),
                        radius: 1.05,
                        colors: [
                          Color(0xFFFFD36B),
                          Color(0xFFFF5A60),
                          Color(0xFFC837AB),
                          Color(0xFF5B51D8),
                        ],
                        stops: [0, .3, .62, 1],
                      )
                    : null,
              ),
              child: SizedBox.square(
                dimension: 54,
                child: Center(child: _shareIcon(instagram, dark)),
              ),
            ),
            const SizedBox(height: 8),
            ExcludeSemantics(
              child: Text(
                choice.label,
                maxLines: 1,
                overflow: TextOverflow.clip,
                style: const TextStyle(color: Color(0xFF636366), fontSize: 10),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _shareIcon(bool instagram, bool dark) {
    if (choice == AirvanaShareChoice.tiktok) {
      return const Text(
        '♪',
        style: TextStyle(
          color: Colors.white,
          fontSize: 31,
          fontWeight: FontWeight.w900,
          shadows: [
            Shadow(color: Color(0xFF25F4EE), offset: Offset(-2, 0)),
            Shadow(color: Color(0xFFFE2C55), offset: Offset(2, 0)),
          ],
        ),
      );
    }
    if (choice == AirvanaShareChoice.x) {
      return const Text(
        '𝕏',
        style: TextStyle(color: Colors.white, fontSize: 27),
      );
    }
    return Icon(
      icon,
      color: dark || instagram ? Colors.white : AirvanaColors.ink,
      size: 27,
    );
  }
}

class AirvanaRemixSheet extends StatefulWidget {
  const AirvanaRemixSheet({required this.playable, super.key});

  final Playable playable;

  @override
  State<AirvanaRemixSheet> createState() => _AirvanaRemixSheetState();
}

class _AirvanaRemixSheetState extends State<AirvanaRemixSheet> {
  var _scope = 0;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(18, 12, 18, 22),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const SizedBox(width: 44),
            const Expanded(
              child: Text(
                '创建 Remix 草稿',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900),
              ),
            ),
            IconButton(
              tooltip: '关闭 Remix',
              onPressed: () => Navigator.pop(context, false),
              constraints: const BoxConstraints.tightFor(width: 44, height: 44),
              icon: const Icon(Icons.close_rounded, size: 25),
            ),
          ],
        ),
        Text(
          '来源：${widget.playable.title} · ${widget.playable.authorName} · ${widget.playable.version}',
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            color: Color(0xFF636366),
            fontSize: 11,
            height: 1.65,
          ),
        ),
        const SizedBox(height: 13),
        Semantics(
          container: true,
          label: 'Remix 复用范围',
          child: Column(
            children: [
              _RemixScopeOption(
                key: const ValueKey('remix-scope-structure'),
                selected: _scope == 0,
                title: '仅复用互动结构',
                description: '保留玩法与互动路径，不复制品牌素材。',
                onTap: () => setState(() => _scope = 0),
              ),
              const SizedBox(height: 9),
              _RemixScopeOption(
                key: const ValueKey('remix-scope-rhythm'),
                selected: _scope == 1,
                title: '参考互动结构与视觉节奏',
                description: '只参考构图与节奏，未获授权素材不会被复制。',
                onTap: () => setState(() => _scope = 1),
              ),
            ],
          ),
        ),
        const SizedBox(height: 13),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFFFFF8F8),
            borderRadius: BorderRadius.circular(15),
            border: Border.all(color: const Color(0xFFFFD6DA), width: 1),
          ),
          child: const Text.rich(
            TextSpan(
              children: [
                TextSpan(
                  text: '受控 Remix\n',
                  style: TextStyle(
                    color: Color(0xFFC62836),
                    fontWeight: FontWeight.w900,
                  ),
                ),
                TextSpan(
                  text:
                      '不会继承点赞、评论、收藏和转化；新 Playable 不复制品牌素材，也不继承预算、奖励、CTA、地区、归因或结算规则。完成后仍需通过 Campaign Contract 与人工审核。',
                ),
              ],
            ),
            style: TextStyle(
              color: Color(0xFF6E5A5D),
              fontSize: 9,
              height: 1.65,
            ),
          ),
        ),
        const SizedBox(height: 14),
        SizedBox(
          width: double.infinity,
          height: 48,
          child: FilledButton(
            key: const ValueKey('remix-confirm'),
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(
              backgroundColor: AirvanaColors.accent,
              foregroundColor: Colors.white,
              shape: const StadiumBorder(),
              textStyle: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w900,
              ),
            ),
            child: const Text('创建受控 Remix 草稿'),
          ),
        ),
      ],
    ),
  );
}

class _RemixScopeOption extends StatelessWidget {
  const _RemixScopeOption({
    required this.selected,
    required this.title,
    required this.description,
    required this.onTap,
    super.key,
  });

  final bool selected;
  final String title;
  final String description;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    checked: selected,
    label: '$title，$description',
    child: Material(
      color: selected ? const Color(0xFFFFF0F1) : Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: selected ? const Color(0xFFFF9AA3) : AirvanaColors.line,
          width: 1,
        ),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: onTap,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 62),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Container(
                  width: 22,
                  height: 22,
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: selected
                          ? AirvanaColors.accent
                          : const Color(0xFFC7C7CC),
                      width: 2,
                    ),
                  ),
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: selected
                          ? AirvanaColors.accent
                          : Colors.transparent,
                    ),
                  ),
                ),
                const SizedBox(width: 11),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(
                          color: AirvanaColors.ink,
                          fontSize: 12,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        description,
                        style: const TextStyle(
                          color: AirvanaColors.muted,
                          fontSize: 9,
                          height: 1.5,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    ),
  );
}

class AirvanaLocalCommentSheet extends StatefulWidget {
  const AirvanaLocalCommentSheet({required this.playable, super.key});

  final Playable playable;

  @override
  State<AirvanaLocalCommentSheet> createState() =>
      _AirvanaLocalCommentSheetState();
}

class _AirvanaLocalCommentSheetState extends State<AirvanaLocalCommentSheet> {
  static const _dividerColor = Color(0xFFE5E5EA);
  static const _dividerThickness = .7;

  final _controller = TextEditingController();
  final _liked = <int>{};
  late final List<_LocalComment> _comments = [
    const _LocalComment(author: 'Mina', body: '玩法节奏很清楚，失败后也能立即重试。', time: '刚刚'),
    const _LocalComment(author: 'Leo', body: '竖屏单手操作很顺，期待下一个版本。', time: '刚刚'),
  ];
  var _posted = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);
    final height = math.min(media.size.height * .68, 570.0);
    final bottomSafeArea = media.viewInsets.bottom > 0
        ? 0.0
        : media.viewPadding.bottom;
    return AnimatedPadding(
      key: const ValueKey('comment-keyboard-inset'),
      duration: const Duration(milliseconds: 180),
      padding: EdgeInsets.only(bottom: media.viewInsets.bottom),
      child: SizedBox(
        height: height,
        child: Column(
          children: [
            SizedBox(
              height: 64,
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14),
                child: Row(
                  children: [
                    const SizedBox(width: 44),
                    Expanded(
                      child: Text(
                        '${_comments.length} 条评论',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          color: AirvanaColors.ink,
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                    SizedBox.square(
                      dimension: 44,
                      child: IconButton(
                        tooltip: '关闭评论',
                        onPressed: () => Navigator.pop(context, _posted),
                        padding: EdgeInsets.zero,
                        icon: const Icon(
                          Icons.close_rounded,
                          color: AirvanaColors.ink,
                          size: 25,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const Divider(
              key: ValueKey('comment-header-divider'),
              height: _dividerThickness,
              thickness: _dividerThickness,
              color: _dividerColor,
            ),
            Expanded(
              child: ListView.builder(
                key: const ValueKey('comment-list'),
                padding: const EdgeInsets.symmetric(horizontal: 20),
                itemCount: _comments.length,
                itemBuilder: (context, index) {
                  final comment = _comments[index];
                  return _CommentRow(
                    comment: comment,
                    dividerKey: ValueKey('comment-row-divider-$index'),
                    liked: _liked.contains(index),
                    onReply: () {
                      _controller.text = '@${comment.author} ';
                      _controller.selection = TextSelection.collapsed(
                        offset: _controller.text.length,
                      );
                    },
                    onLike: () => setState(() {
                      _liked.contains(index)
                          ? _liked.remove(index)
                          : _liked.add(index);
                    }),
                    onAction: () {
                      if (!comment.owned) return;
                      setState(() => _comments.removeAt(index));
                    },
                  );
                },
              ),
            ),
            Container(
              key: const ValueKey('comment-composer'),
              padding: EdgeInsets.fromLTRB(14, 10, 14, 12 + bottomSafeArea),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(
                  top: BorderSide(
                    color: _dividerColor,
                    width: _dividerThickness,
                  ),
                ),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: TextField(
                      key: const ValueKey('comment-input'),
                      controller: _controller,
                      maxLength: 120,
                      minLines: 1,
                      maxLines: 3,
                      textInputAction: TextInputAction.send,
                      cursorColor: AirvanaColors.accent,
                      style: const TextStyle(
                        color: AirvanaColors.ink,
                        fontSize: 16,
                        height: 1.45,
                      ),
                      decoration: const InputDecoration(
                        hintText: '友善交流，分享真实体验…',
                        hintStyle: TextStyle(
                          color: AirvanaColors.muted,
                          fontSize: 16,
                          height: 1.45,
                        ),
                        counterText: '',
                        border: InputBorder.none,
                        enabledBorder: InputBorder.none,
                        focusedBorder: InputBorder.none,
                        contentPadding: EdgeInsets.symmetric(
                          horizontal: 2,
                          vertical: 10,
                        ),
                      ),
                      onChanged: (_) => setState(() {}),
                      onSubmitted: (_) => _submit(),
                    ),
                  ),
                  const SizedBox(width: 10),
                  SizedBox(
                    width: 52,
                    height: 44,
                    child: FilledButton(
                      key: const ValueKey('comment-submit'),
                      onPressed: _controller.text.trim().isEmpty
                          ? null
                          : _submit,
                      style: FilledButton.styleFrom(
                        padding: EdgeInsets.zero,
                        backgroundColor: AirvanaColors.accent,
                        disabledBackgroundColor: const Color(0xFFD1D1D6),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                        textStyle: const TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      child: const Text('发送'),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _submit() {
    final body = _controller.text.trim();
    if (body.isEmpty) return;
    setState(() {
      _comments.insert(
        0,
        _LocalComment(author: 'Kai Chen', body: body, time: '刚刚', owned: true),
      );
      _controller.clear();
      _posted = true;
    });
  }
}

class _LocalComment {
  const _LocalComment({
    required this.author,
    required this.body,
    required this.time,
    this.owned = false,
  });

  final String author;
  final String body;
  final String time;
  final bool owned;

  String get avatarAsset =>
      owned ? 'assets/legacy/avatars/kai.png' : legacyWebAvatarAsset(author);
}

class _CommentRow extends StatelessWidget {
  const _CommentRow({
    required this.comment,
    required this.dividerKey,
    required this.liked,
    required this.onReply,
    required this.onLike,
    required this.onAction,
  });

  final _LocalComment comment;
  final Key dividerKey;
  final bool liked;
  final VoidCallback onReply;
  final VoidCallback onLike;
  final VoidCallback onAction;

  @override
  Widget build(BuildContext context) => Column(
    children: [
      Padding(
        padding: const EdgeInsets.symmetric(vertical: 13),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Semantics(
              container: true,
              excludeSemantics: true,
              image: true,
              label: '${comment.author} 的头像',
              child: ClipOval(
                child: Image.asset(
                  comment.avatarAsset,
                  key: ValueKey('comment-avatar-${comment.author}'),
                  width: 36,
                  height: 36,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) =>
                      _CommentAvatarFallback(author: comment.author),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          comment.author,
                          style: const TextStyle(
                            color: Color(0xFF636366),
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                      Text(
                        comment.time,
                        style: const TextStyle(
                          color: Color(0xFFA0A0A6),
                          fontSize: 9,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    comment.body,
                    style: const TextStyle(
                      color: AirvanaColors.ink,
                      fontSize: 12,
                      height: 1.55,
                    ),
                  ),
                  const SizedBox(height: 7),
                  Row(
                    children: [
                      _CommentAction(label: '回复', onTap: onReply),
                      _CommentAction(
                        label: liked ? '♥ 赞' : '♡ 赞',
                        onTap: onLike,
                      ),
                      _CommentAction(
                        label: comment.owned ? '删除' : '举报',
                        danger: comment.owned,
                        onTap: onAction,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      Divider(
        key: dividerKey,
        height: _AirvanaLocalCommentSheetState._dividerThickness,
        thickness: _AirvanaLocalCommentSheetState._dividerThickness,
        color: _AirvanaLocalCommentSheetState._dividerColor,
      ),
    ],
  );
}

class _CommentAvatarFallback extends StatelessWidget {
  const _CommentAvatarFallback({required this.author});

  final String author;

  @override
  Widget build(BuildContext context) => ColoredBox(
    color: const Color(0xFFFFE8EA),
    child: SizedBox.square(
      dimension: 36,
      child: Center(
        child: Text(
          author.characters.first,
          style: const TextStyle(
            color: AirvanaColors.accent,
            fontWeight: FontWeight.w900,
          ),
        ),
      ),
    ),
  );
}

class _CommentAction extends StatelessWidget {
  const _CommentAction({
    required this.label,
    required this.onTap,
    this.danger = false,
  });

  final String label;
  final VoidCallback onTap;
  final bool danger;

  @override
  Widget build(BuildContext context) => TextButton(
    onPressed: onTap,
    style: TextButton.styleFrom(
      minimumSize: const Size(0, 32),
      padding: const EdgeInsets.only(right: 14),
      foregroundColor: danger ? const Color(0xFFC62836) : AirvanaColors.muted,
      textStyle: const TextStyle(fontSize: 10, fontWeight: FontWeight.w800),
    ),
    child: Text(label),
  );
}
