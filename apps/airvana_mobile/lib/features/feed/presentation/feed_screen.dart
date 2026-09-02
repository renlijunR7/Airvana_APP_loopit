import 'dart:async';

import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/design_system/app_state_view.dart';
import 'package:airvana_mobile/features/shared/data/airvana_repository.dart';
import 'package:airvana_mobile/features/shared/data/legacy_demo_catalog.dart';
import 'package:airvana_mobile/features/shared/domain/airvana_models.dart';
import 'package:airvana_mobile/features/shared/presentation/playable_social_sheets.dart';
import 'package:airvana_mobile/shared/presentation/airvana_logo.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

const _legacySheetAnimation = AnimationStyle(
  duration: Duration(milliseconds: 280),
  reverseDuration: Duration(milliseconds: 220),
);

class FeedScreen extends ConsumerWidget {
  const FeedScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(homeProvider);
    return SafeArea(
      bottom: false,
      child: state.when(
        loading: () => const _FeedLoading(),
        error: (error, _) => AppStateView(
          icon: Icons.cloud_off_outlined,
          title: '本机数据暂不可用',
          message: '$error',
          actionLabel: '重新载入',
          onAction: () => ref.invalidate(homeProvider),
        ),
        data: (snapshot) => _LegacyFeedPager(snapshot: snapshot),
      ),
    );
  }
}

class _LegacyFeedPager extends ConsumerStatefulWidget {
  const _LegacyFeedPager({required this.snapshot});

  final HomeSnapshot snapshot;

  @override
  ConsumerState<_LegacyFeedPager> createState() => _LegacyFeedPagerState();
}

class _LegacyFeedPagerState extends ConsumerState<_LegacyFeedPager> {
  final _pageController = PageController();
  final _liked = <String>{};
  final _saved = <String>{};
  final _followedOwners = <String>{};
  final _shared = <String>{};
  final _commentDeltas = <String, int>{};
  final _likeCounts = <String, int>{};
  final _saveCounts = <String, int>{};
  int _current = 0;
  bool _muted = true;
  bool _heartBurst = false;
  int _heartBurstSerial = 0;
  Timer? _heartBurstTimer;
  String? _activePlayableId;

  @override
  void dispose() {
    _heartBurstTimer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    _followedOwners.addAll(widget.snapshot.followingUserIds);
    for (final playable in widget.snapshot.playables) {
      final engagements =
          widget.snapshot.engagementsByContent[playable.id] ?? const <String>{};
      if (engagements.contains('like')) _liked.add(playable.id);
      if (engagements.contains('save')) _saved.add(playable.id);
      if (engagements.contains('share')) _shared.add(playable.id);
      _likeCounts[playable.id] = playable.likes;
      _saveCounts[playable.id] = playable.saves;
    }
    // Preserve the exact frozen Web LOCAL DEMO initial relationship without
    // applying it to server-authoritative content.
    if (widget.snapshot.localDemo &&
        widget.snapshot.playables.any(
          (item) => item.id == 'plb_orchard_merge',
        )) {
      _liked.add('plb_orchard_merge');
      _saved.add('plb_orchard_merge');
      _likeCounts.update(
        'plb_orchard_merge',
        (value) => value + 1,
        ifAbsent: () => 1,
      );
      _saveCounts.update(
        'plb_orchard_merge',
        (value) => value + 1,
        ifAbsent: () => 1,
      );
    }
  }

  bool _isServerPlayable(Playable playable) =>
      !playable.localDemo && playable.id.startsWith('content_');

  String _ownerKey(Playable playable) => playable.ownerUserId.isNotEmpty
      ? playable.ownerUserId
      : playable.ownerHandle;

  Future<void> _openComments(Playable playable) async {
    final posted = await showModalBottomSheet<bool>(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
      ),
      sheetAnimationStyle: _legacySheetAnimation,
      builder: (_) => _isServerPlayable(playable)
          ? _ServerCommentSheet(
              playable: playable,
              repository: ref.read(airvanaRepositoryProvider),
            )
          : AirvanaLocalCommentSheet(playable: playable),
    );
    if (!mounted || posted != true) return;
    setState(() {
      _commentDeltas.update(
        playable.id,
        (value) => value + 1,
        ifAbsent: () => 1,
      );
    });
    _showMessage(
      context,
      _isServerPlayable(playable) ? '评论已由服务端保存' : '评论已保存到当前本地演示',
    );
  }

  Future<void> _share(Playable playable) async {
    final choice = await showModalBottomSheet<AirvanaShareChoice>(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      sheetAnimationStyle: _legacySheetAnimation,
      builder: (_) => AirvanaShareSheet(playable: playable),
    );
    if (!mounted || choice == null) return;

    switch (choice) {
      case AirvanaShareChoice.restart:
        context.push('/runtime/${playable.id}', extra: playable);
        return;
      case AirvanaShareChoice.fullscreen:
        _showMessage(context, '已记录全屏意图；当前预览保持设备画布');
        return;
      case AirvanaShareChoice.dislike:
        _showMessage(context, '已记录“不感兴趣”本地意图');
        return;
      case AirvanaShareChoice.report:
        _showMessage(context, '举报已记录为本地演示，尚未发送到服务端');
        return;
      case AirvanaShareChoice.block:
        _showMessage(context, '屏蔽作者已记录为本地演示，尚未发送到服务端');
        return;
      case AirvanaShareChoice.copy:
        await _copyShareLink(playable, '分享链接已复制；当前仅记录复制行为');
        return;
      case AirvanaShareChoice.system:
        await _copyShareLink(playable, '当前预览未收到系统分享确认，链接已复制');
        return;
      case AirvanaShareChoice.tiktok:
      case AirvanaShareChoice.instagram:
      case AirvanaShareChoice.x:
        await _copyShareLink(playable, '链接已复制，可粘贴到 ${choice.label}；当前仅记录分享意图');
        return;
    }
  }

  Future<void> _copyShareLink(Playable playable, String successMessage) async {
    try {
      await Clipboard.setData(
        ClipboardData(
          text: _isServerPlayable(playable)
              ? ref
                    .read(appEnvironmentProvider)
                    .resolve('/content/${playable.id}')
                    .toString()
              : 'airvana://playable/${playable.id}',
        ),
      );
    } on Object {
      // Preserve the local share intent when an embedded host has no clipboard.
    }
    if (mounted) _showMessage(context, successMessage);
  }

  Future<void> _toggleEngagement(Playable playable, String eventType) async {
    final target = eventType == 'like' ? _liked : _saved;
    final counts = eventType == 'like' ? _likeCounts : _saveCounts;
    final wasActive = target.contains(playable.id);
    setState(() {
      if (wasActive) {
        target.remove(playable.id);
        counts.update(playable.id, (value) => (value - 1).clamp(0, 1 << 30));
      } else {
        target.add(playable.id);
        counts.update(playable.id, (value) => value + 1, ifAbsent: () => 1);
      }
    });
    if (!_isServerPlayable(playable)) return;
    try {
      await ref
          .read(airvanaRepositoryProvider)
          .setEngagement(
            contentId: playable.id,
            eventType: eventType,
            active: !wasActive,
          );
    } on Object catch (error) {
      if (!mounted) return;
      setState(() {
        if (wasActive) {
          target.add(playable.id);
          counts.update(playable.id, (value) => value + 1);
        } else {
          target.remove(playable.id);
          counts.update(playable.id, (value) => (value - 1).clamp(0, 1 << 30));
        }
      });
      _showMessage(context, '互动未同步：$error');
    }
  }

  void _doubleTapLike(Playable playable) {
    if (!_liked.contains(playable.id)) {
      unawaited(_toggleEngagement(playable, 'like'));
    }
    _heartBurstTimer?.cancel();
    setState(() {
      _heartBurst = true;
      _heartBurstSerial += 1;
    });
    _heartBurstTimer = Timer(const Duration(milliseconds: 700), () {
      if (mounted) setState(() => _heartBurst = false);
    });
  }

  void _startPlayable(Playable playable) {
    if (playable.localDemo && LegacyDemoCatalog.byId(playable.id) != null) {
      setState(() => _activePlayableId = playable.id);
      return;
    }
    context.push('/runtime/${playable.id}', extra: playable);
  }

  Future<void> _pageFromActivePlayable(int delta) async {
    final lastIndex = widget.snapshot.playables.length - 1;
    final nextIndex = (_current + delta).clamp(0, lastIndex);
    if (nextIndex == _current || !_pageController.hasClients) return;

    if (_activePlayableId != null) {
      setState(() => _activePlayableId = null);
    }
    await _pageController.animateToPage(
      nextIndex,
      duration: const Duration(milliseconds: 360),
      curve: Curves.easeOutCubic,
    );
  }

  Future<void> _toggleFollow(Playable playable) async {
    final ownerKey = _ownerKey(playable);
    final wasFollowing = _followedOwners.contains(ownerKey);
    if (wasFollowing) {
      final confirmed = await showModalBottomSheet<bool>(
        context: context,
        useRootNavigator: true,
        useSafeArea: true,
        backgroundColor: Colors.white,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
        ),
        sheetAnimationStyle: _legacySheetAnimation,
        builder: (_) => _UnfollowSheet(ownerName: playable.authorName),
      );
      if (!mounted || confirmed != true) return;
    }
    setState(() {
      wasFollowing
          ? _followedOwners.remove(ownerKey)
          : _followedOwners.add(ownerKey);
    });
    if (!_isServerPlayable(playable)) return;
    try {
      await ref
          .read(airvanaRepositoryProvider)
          .setFollowing(contentId: playable.id, active: !wasFollowing);
    } on Object catch (error) {
      if (!mounted) return;
      setState(() {
        wasFollowing
            ? _followedOwners.add(ownerKey)
            : _followedOwners.remove(ownerKey);
      });
      _showMessage(context, '关注状态未同步：$error');
    }
  }

  Future<void> _messageAuthor(Playable playable) async {
    if (!_isServerPlayable(playable) || playable.ownerUserId.isEmpty) return;
    try {
      await ref
          .read(airvanaRepositoryProvider)
          .openConversation(playable.ownerUserId);
      ref.invalidate(conversationsProvider);
      if (mounted) context.go('/messages');
    } on Object catch (error) {
      if (!mounted) return;
      _showMessage(context, '私信会话未建立：$error');
    }
  }

  Future<void> _openRemix(Playable playable) async {
    final confirmed = await showModalBottomSheet<bool>(
      context: context,
      useRootNavigator: true,
      useSafeArea: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
      ),
      sheetAnimationStyle: _legacySheetAnimation,
      builder: (_) => AirvanaRemixSheet(playable: playable),
    );
    if (!mounted || confirmed != true) return;
    context.push('/create?remix=${Uri.encodeComponent(playable.id)}');
  }

  void _showMessage(BuildContext context, String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(message),
          behavior: SnackBarBehavior.floating,
          duration: const Duration(seconds: 2),
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    if (widget.snapshot.playables.isEmpty) {
      return const AppStateView(
        icon: Icons.sports_esports_outlined,
        title: '还没有可体验作品',
        message: '只有已发布且成品校验通过的 Playable 才会显示。',
      );
    }
    return Column(
      children: [
        const _LegacyHeader(),
        Expanded(
          child: PageView.builder(
            key: const ValueKey('legacy-feed-pager'),
            controller: _pageController,
            scrollDirection: Axis.vertical,
            physics: _activePlayableId == null
                ? const PageScrollPhysics()
                : const NeverScrollableScrollPhysics(),
            itemCount: widget.snapshot.playables.length,
            onPageChanged: (index) => setState(() => _current = index),
            itemBuilder: (context, index) {
              final playable = widget.snapshot.playables[index];
              final active = _activePlayableId == playable.id;
              return _LegacyPlayablePage(
                key: ValueKey('feed-playable-${playable.id}'),
                playable: playable,
                liked: _liked.contains(playable.id),
                saved: _saved.contains(playable.id),
                onLike: () => unawaited(_toggleEngagement(playable, 'like')),
                onSave: () => unawaited(_toggleEngagement(playable, 'save')),
                likeCount: _likeCounts[playable.id] ?? playable.likes,
                saveCount: _saveCounts[playable.id] ?? playable.saves,
                commentCount:
                    playable.comments + (_commentDeltas[playable.id] ?? 0),
                shared: _shared.contains(playable.id),
                following: _followedOwners.contains(_ownerKey(playable)),
                onComment: () => _openComments(playable),
                onShare: () => _share(playable),
                onFollow: () => unawaited(_toggleFollow(playable)),
                canMessage:
                    _isServerPlayable(playable) &&
                    playable.ownerUserId.isNotEmpty,
                onMessage: () => unawaited(_messageAuthor(playable)),
                onRemix: () => _openRemix(playable),
                active: active,
                onStart: () => _startPlayable(playable),
                onClose: () {
                  if (active) {
                    setState(() => _activePlayableId = null);
                  }
                  _showMessage(context, '已退出当前作品');
                },
                muted: _muted,
                onMute: () => setState(() => _muted = !_muted),
                heartBurst: _heartBurst,
                heartBurstSerial: _heartBurstSerial,
                onDoubleTap: () => _doubleTapLike(playable),
                footerPagingEnabled: active,
                canPagePrevious: index > 0,
                canPageNext: index < widget.snapshot.playables.length - 1,
                onPagePrevious: () => unawaited(_pageFromActivePlayable(-1)),
                onPageNext: () => unawaited(_pageFromActivePlayable(1)),
              );
            },
          ),
        ),
        Semantics(
          label: '当前作品 ${_current + 1}，共 ${widget.snapshot.playables.length} 个',
          child: const SizedBox.shrink(),
        ),
      ],
    );
  }
}

class _LegacyHeader extends StatelessWidget {
  const _LegacyHeader();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 52,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(14, 4, 10, 4),
        child: Row(
          children: [
            const AirvanaLogo(width: 76),
            const Spacer(),
            Stack(
              clipBehavior: Clip.none,
              children: [
                IconButton(
                  tooltip: '通知',
                  onPressed: () => context.go('/messages'),
                  icon: const Icon(Icons.notifications_none_rounded, size: 26),
                ),
                const Positioned(
                  right: 7,
                  top: 5,
                  child: CircleAvatar(
                    radius: 3.5,
                    backgroundColor: AirvanaColors.accent,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _LegacyPlayablePage extends StatelessWidget {
  const _LegacyPlayablePage({
    super.key,
    required this.playable,
    required this.liked,
    required this.saved,
    required this.onLike,
    required this.onSave,
    required this.likeCount,
    required this.saveCount,
    required this.commentCount,
    required this.shared,
    required this.following,
    required this.onComment,
    required this.onShare,
    required this.onFollow,
    required this.canMessage,
    required this.onMessage,
    required this.onRemix,
    required this.active,
    required this.onStart,
    required this.onClose,
    required this.muted,
    required this.onMute,
    required this.heartBurst,
    required this.heartBurstSerial,
    required this.onDoubleTap,
    required this.footerPagingEnabled,
    required this.canPagePrevious,
    required this.canPageNext,
    required this.onPagePrevious,
    required this.onPageNext,
  });

  final Playable playable;
  final bool liked;
  final bool saved;
  final VoidCallback onLike;
  final VoidCallback onSave;
  final int likeCount;
  final int saveCount;
  final int commentCount;
  final bool shared;
  final bool following;
  final VoidCallback onComment;
  final VoidCallback onShare;
  final VoidCallback onFollow;
  final bool canMessage;
  final VoidCallback onMessage;
  final VoidCallback onRemix;
  final bool active;
  final VoidCallback onStart;
  final VoidCallback onClose;
  final bool muted;
  final VoidCallback onMute;
  final bool heartBurst;
  final int heartBurstSerial;
  final VoidCallback onDoubleTap;
  final bool footerPagingEnabled;
  final bool canPagePrevious;
  final bool canPageNext;
  final VoidCallback onPagePrevious;
  final VoidCallback onPageNext;

  String get _heroTitle {
    if (!playable.localDemo) return playable.title;
    final match = RegExp(r'\s+[A-Za-z]').firstMatch(playable.title);
    return match == null
        ? playable.title
        : playable.title.substring(0, match.start);
  }

  String get _heroSummary {
    if (!playable.localDemo) return playable.summary;
    final instruction = playable.instruction.trim().replaceFirst(
      RegExp(r'[。.!！]+$'),
      '',
    );
    return '$instruction。包含实时反馈、阶段升级、本地计分、成功失败与立即重玩。';
  }

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: const Color(0xFF050A08),
      child: Column(
        children: [
          Expanded(
            child: Stack(
              fit: StackFit.expand,
              children: [
                GestureDetector(
                  key: ValueKey('feed-double-tap-${playable.id}'),
                  behavior: HitTestBehavior.opaque,
                  onDoubleTap: active ? null : onDoubleTap,
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      _FeedCover(playable: playable),
                      const DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              Color(0x18000000),
                              Color(0x08000000),
                              Color(0xCC000000),
                            ],
                            stops: [0, .5, 1],
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                if (active)
                  Positioned.fill(
                    child: playable.id == 'plb_orchard_merge'
                        ? const _OrchardInlineGame()
                        : _FeedInlineGame(playable: playable, onExit: onClose),
                  ),
                Positioned(
                  left: 14,
                  right: 14,
                  top: 12,
                  child: Row(
                    children: [
                      Expanded(
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: _GlassBadge(
                            label: playable.localDemo
                                ? 'AIRVANA ORIGINAL · 完整三阶段试玩'
                                : 'RUNTIME · ${playable.stage}',
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      _CircleGlass(
                        icon: muted
                            ? Icons.volume_off_outlined
                            : Icons.volume_up_outlined,
                        label: muted ? '开启作品音效' : '静音作品音效',
                        onTap: onMute,
                      ),
                      const SizedBox(width: 8),
                      _CircleGlass(
                        icon: Icons.close_rounded,
                        label: '退出当前作品',
                        onTap: onClose,
                      ),
                    ],
                  ),
                ),
                if (!active)
                  Positioned.fill(
                    child: Center(
                      child: Padding(
                        padding: const EdgeInsets.fromLTRB(24, 58, 24, 12),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              _heroTitle,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 28,
                                height: 1.05,
                                fontWeight: FontWeight.w900,
                                letterSpacing: -.7,
                                shadows: [
                                  Shadow(color: Colors.black54, blurRadius: 8),
                                ],
                              ),
                            ),
                            const SizedBox(height: 9),
                            Text(
                              _heroSummary,
                              maxLines: 3,
                              overflow: TextOverflow.ellipsis,
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                                height: 1.45,
                                shadows: [
                                  Shadow(color: Colors.black87, blurRadius: 6),
                                ],
                              ),
                            ),
                            const SizedBox(height: 17),
                            FilledButton(
                              key: ValueKey('play-${playable.id}'),
                              onPressed: onStart,
                              style: FilledButton.styleFrom(
                                backgroundColor: Colors.white,
                                foregroundColor: const Color(0xFF111111),
                                minimumSize: const Size(156, 44),
                                shape: const StadiumBorder(),
                                textStyle: const TextStyle(
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                              child: const Text('开始完整试玩'),
                            ),
                            const SizedBox(height: 9),
                            Text(
                              playable.localDemo
                                  ? '本地互动 DEMO · 游戏金币按作品隔离；有效完成可记录本机 AIP'
                                  : '服务端成品 · 完成必须通过开始、阶段、完成顺序验证\nAIP 仅在服务端确认资格与 24 小时去重后记账',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: .68),
                                fontSize: 9,
                                height: 1.4,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                if (heartBurst)
                  Positioned.fill(
                    child: IgnorePointer(
                      child: Center(
                        child: _HeartBurst(
                          key: ValueKey('feed-heart-burst-$heartBurstSerial'),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          _FeedFooterSwipePager(
            key: ValueKey('feed-footer-swipe-${playable.id}'),
            enabled: footerPagingEnabled,
            canPagePrevious: canPagePrevious,
            canPageNext: canPageNext,
            onPagePrevious: onPagePrevious,
            onPageNext: onPageNext,
            child: _SocialFooter(
              playable: playable,
              liked: liked,
              saved: saved,
              onLike: onLike,
              onSave: onSave,
              likeCount: likeCount,
              saveCount: saveCount,
              commentCount: commentCount,
              shared: shared,
              following: following,
              onComment: onComment,
              onShare: onShare,
              onFollow: onFollow,
              canMessage: canMessage,
              onMessage: onMessage,
              onRemix: onRemix,
            ),
          ),
        ],
      ),
    );
  }
}

class _FeedFooterSwipePager extends StatefulWidget {
  const _FeedFooterSwipePager({
    super.key,
    required this.enabled,
    required this.canPagePrevious,
    required this.canPageNext,
    required this.onPagePrevious,
    required this.onPageNext,
    required this.child,
  });

  final bool enabled;
  final bool canPagePrevious;
  final bool canPageNext;
  final VoidCallback onPagePrevious;
  final VoidCallback onPageNext;
  final Widget child;

  @override
  State<_FeedFooterSwipePager> createState() => _FeedFooterSwipePagerState();
}

class _FeedFooterSwipePagerState extends State<_FeedFooterSwipePager> {
  static const _distanceThreshold = 54.0;
  static const _velocityThreshold = 420.0;

  double _dragDistance = 0;

  void _onDragStart(DragStartDetails details) {
    _dragDistance = 0;
  }

  void _onDragUpdate(DragUpdateDetails details) {
    _dragDistance += details.delta.dy;
  }

  void _onDragEnd(DragEndDetails details) {
    final velocity = details.primaryVelocity ?? 0;
    final swipeUp =
        _dragDistance <= -_distanceThreshold || velocity <= -_velocityThreshold;
    final swipeDown =
        _dragDistance >= _distanceThreshold || velocity >= _velocityThreshold;
    _dragDistance = 0;

    if (swipeUp && widget.canPageNext) {
      widget.onPageNext();
    } else if (swipeDown && widget.canPagePrevious) {
      widget.onPagePrevious();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      label: '互动与作者信息区，向上滑下一条，向下滑上一条',
      onIncrease: widget.canPageNext ? widget.onPageNext : null,
      onDecrease: widget.canPagePrevious ? widget.onPagePrevious : null,
      child: GestureDetector(
        behavior: HitTestBehavior.translucent,
        onVerticalDragStart: widget.enabled ? _onDragStart : null,
        onVerticalDragUpdate: widget.enabled ? _onDragUpdate : null,
        onVerticalDragEnd: widget.enabled ? _onDragEnd : null,
        child: widget.child,
      ),
    );
  }
}

class _UnfollowSheet extends StatelessWidget {
  const _UnfollowSheet({required this.ownerName});

  final String ownerName;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      explicitChildNodes: true,
      namesRoute: true,
      label: '取消关注确认',
      child: Padding(
        padding: const EdgeInsets.fromLTRB(18, 20, 18, 22),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '不再关注 $ownerName？',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 7),
            const Text(
              '取消后将减少其内容在“关注”中的展示；不会影响此前产生的互动或归因记录。',
              style: TextStyle(
                color: Color(0xFF8E8E93),
                fontSize: 11,
                height: 1.65,
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(context, false),
                    child: const Text('保留关注'),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: FilledButton(
                    onPressed: () => Navigator.pop(context, true),
                    style: FilledButton.styleFrom(
                      backgroundColor: AirvanaColors.accent,
                    ),
                    child: const Text('取消关注'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _HeartBurst extends StatefulWidget {
  const _HeartBurst({super.key});

  @override
  State<_HeartBurst> createState() => _HeartBurstState();
}

class _HeartBurstState extends State<_HeartBurst>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 700),
  )..forward();
  late final Animation<double> _scale = TweenSequence<double>([
    TweenSequenceItem(tween: Tween(begin: 0, end: 1.25), weight: 30),
    TweenSequenceItem(tween: Tween(begin: 1.25, end: 1), weight: 30),
    TweenSequenceItem(tween: Tween(begin: 1, end: 1.08), weight: 40),
  ]).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOut));
  late final Animation<double> _opacity = TweenSequence<double>([
    TweenSequenceItem(tween: Tween(begin: 0, end: 1), weight: 30),
    TweenSequenceItem(tween: ConstantTween(1), weight: 30),
    TweenSequenceItem(tween: Tween(begin: 1, end: 0), weight: 40),
  ]).animate(_controller);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => FadeTransition(
    opacity: _opacity,
    child: ScaleTransition(
      scale: _scale,
      child: const Text(
        '❤️',
        key: ValueKey('feed-heart-burst'),
        style: TextStyle(fontSize: 96),
      ),
    ),
  );
}

class _FeedCover extends StatelessWidget {
  const _FeedCover({required this.playable});

  final Playable playable;

  @override
  Widget build(BuildContext context) {
    if (playable.coverAsset.isEmpty) {
      return _FeedCoverFallback(playable: playable);
    }
    return Image.asset(
      playable.coverAsset,
      fit: BoxFit.cover,
      alignment: Alignment.center,
      errorBuilder: (_, __, ___) => _FeedCoverFallback(playable: playable),
    );
  }
}

class _OrchardInlineGame extends StatefulWidget {
  const _OrchardInlineGame();

  @override
  State<_OrchardInlineGame> createState() => _OrchardInlineGameState();
}

class _OrchardInlineGameState extends State<_OrchardInlineGame> {
  static const _fruits = <String>[
    '🍏',
    '🍐',
    '🍎',
    '🍏',
    '🍐',
    '🍏',
    '🍐',
    '🍎',
    '🍏',
    '🍐',
    '🍏',
    '🍐',
    '🍎',
    '🍏',
    '🍐',
    '🍏',
    '🍐',
    '🍎',
    '🍏',
    '🍐',
    '🍏',
    '🍐',
    '🍎',
    '🍏',
    '🍐',
  ];

  int _stage = 1;
  int _score = 0;
  int _moves = 18;
  bool _paused = false;
  bool _complete = false;

  int get _targetIndex => (_stage * 7 + _score * 3) % _fruits.length;

  void _choose(int index) {
    if (_paused || _complete || _moves <= 0) return;
    setState(() {
      _moves -= 1;
      if (index == _targetIndex) _score += 1;
      if (_score >= 5) {
        if (_stage >= 3) {
          _complete = true;
        } else {
          _stage += 1;
          _score = 0;
          _moves = 18 - (_stage - 1) * 2;
        }
      }
    });
  }

  void _restart() => setState(() {
    _stage = 1;
    _score = 0;
    _moves = 18;
    _paused = false;
    _complete = false;
  });

  @override
  Widget build(BuildContext context) {
    return Semantics(
      key: const ValueKey('feed-inline-game'),
      container: true,
      label: '果园合合塔原创代码绘制互动场景',
      child: ColoredBox(
        color: const Color(0xC9071109),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(11, 58, 11, 12),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: const Color(0x3DFFFFFF),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: Colors.white24),
            ),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(18),
              child: Stack(
                children: [
                  Positioned.fill(
                    child: Image.asset(
                      'assets/legacy/covers/orchard-merge.jpg',
                      fit: BoxFit.cover,
                    ),
                  ),
                  const Positioned.fill(
                    child: ColoredBox(color: Color(0x4A081208)),
                  ),
                  Positioned.fill(
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: _complete
                          ? _OrchardResult(onRestart: _restart)
                          : Column(
                              children: [
                                _OrchardStageHeader(stage: _stage),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    _OrchardMetric(
                                      label: '本局得分',
                                      value: '$_score',
                                    ),
                                    const SizedBox(width: 7),
                                    const _OrchardMetric(
                                      label: '目标等级',
                                      value: '5',
                                      accent: true,
                                    ),
                                    const SizedBox(width: 7),
                                    _OrchardMetric(
                                      label: '剩余步数',
                                      value: '$_moves',
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Expanded(
                                  child: Container(
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      color: const Color(0xEDE9E4CC),
                                      borderRadius: BorderRadius.circular(18),
                                      border: Border.all(
                                        color: const Color(0xFFE5E0CB),
                                        width: 4,
                                      ),
                                    ),
                                    child: GridView.builder(
                                      physics:
                                          const NeverScrollableScrollPhysics(),
                                      itemCount: _fruits.length,
                                      gridDelegate:
                                          const SliverGridDelegateWithFixedCrossAxisCount(
                                            crossAxisCount: 5,
                                            crossAxisSpacing: 5,
                                            mainAxisSpacing: 5,
                                          ),
                                      itemBuilder: (context, index) {
                                        final target = index == _targetIndex;
                                        return Semantics(
                                          button: true,
                                          label: target
                                              ? '选择发光的同级水果'
                                              : '选择水果 ${index + 1}',
                                          child: InkWell(
                                            key: ValueKey(
                                              'orchard-fruit-$index',
                                            ),
                                            onTap: () => _choose(index),
                                            borderRadius: BorderRadius.circular(
                                              12,
                                            ),
                                            child: AnimatedContainer(
                                              duration: const Duration(
                                                milliseconds: 180,
                                              ),
                                              alignment: Alignment.center,
                                              decoration: BoxDecoration(
                                                color: Colors.white,
                                                borderRadius:
                                                    BorderRadius.circular(12),
                                                border: Border.all(
                                                  color: target
                                                      ? const Color(0xFFFFD666)
                                                      : const Color(0xFFE1DDCF),
                                                  width: target ? 3 : 1,
                                                ),
                                                boxShadow: target
                                                    ? const [
                                                        BoxShadow(
                                                          color: Color(
                                                            0x99FFD666,
                                                          ),
                                                          blurRadius: 12,
                                                        ),
                                                      ]
                                                    : null,
                                              ),
                                              child: Text(
                                                _fruits[index],
                                                style: const TextStyle(
                                                  fontSize: 30,
                                                ),
                                              ),
                                            ),
                                          ),
                                        );
                                      },
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 8),
                                _OrchardProgress(
                                  score: _score,
                                  paused: _paused,
                                  onPause: () => setState(() {
                                    _paused = !_paused;
                                  }),
                                  onRestart: _restart,
                                ),
                              ],
                            ),
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
}

class _OrchardStageHeader extends StatelessWidget {
  const _OrchardStageHeader({required this.stage});

  final int stage;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.fromLTRB(13, 10, 10, 10),
    decoration: BoxDecoration(
      color: const Color(0xC9345737),
      borderRadius: BorderRadius.circular(14),
    ),
    child: Row(
      children: [
        const Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '果园合合塔',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w900,
                ),
              ),
              SizedBox(height: 3),
              Text(
                '合成相邻同级果实，培育黄金果王',
                style: TextStyle(color: Colors.white70, fontSize: 9),
              ),
            ],
          ),
        ),
        Container(
          width: 54,
          height: 38,
          alignment: Alignment.center,
          decoration: const BoxDecoration(
            color: Color(0xFFF7F2DC),
            borderRadius: BorderRadius.all(Radius.circular(999)),
          ),
          child: Text(
            '$stage/3',
            style: const TextStyle(
              color: Color(0xFF36543A),
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
      ],
    ),
  );
}

class _OrchardMetric extends StatelessWidget {
  const _OrchardMetric({
    required this.label,
    required this.value,
    this.accent = false,
  });

  final String label;
  final String value;
  final bool accent;

  @override
  Widget build(BuildContext context) => Expanded(
    child: Container(
      height: 48,
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFFF8F5E8),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(color: Color(0xFF777162), fontSize: 8),
          ),
          Text(
            value,
            style: TextStyle(
              color: accent ? AirvanaColors.accent : const Color(0xFF26342A),
              fontSize: 17,
              height: 1.15,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    ),
  );
}

class _OrchardProgress extends StatelessWidget {
  const _OrchardProgress({
    required this.score,
    required this.paused,
    required this.onPause,
    required this.onRestart,
  });

  final int score;
  final bool paused;
  final VoidCallback onPause;
  final VoidCallback onRestart;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.fromLTRB(12, 8, 8, 7),
    decoration: BoxDecoration(
      color: const Color(0xEEF8F5E8),
      borderRadius: BorderRadius.circular(14),
    ),
    child: Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                '果实图鉴',
                style: TextStyle(fontSize: 8, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 5),
              ClipRRect(
                borderRadius: BorderRadius.circular(99),
                child: LinearProgressIndicator(
                  value: score / 5,
                  minHeight: 7,
                  color: const Color(0xFF8BB84D),
                  backgroundColor: const Color(0xFFD9D4BF),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                '当前最高 ${score.clamp(0, 5)} / 5',
                style: const TextStyle(
                  fontSize: 8,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 9),
        _OrchardControl(label: paused ? '继续' : '暂停', onTap: onPause),
        const SizedBox(width: 5),
        _OrchardControl(label: '重开', onTap: onRestart),
      ],
    ),
  );
}

class _OrchardControl extends StatelessWidget {
  const _OrchardControl({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    excludeSemantics: true,
    label: label == '暂停'
        ? '暂停深度游戏'
        : label == '重开'
        ? '重新开始本局'
        : '继续深度游戏',
    onTap: onTap,
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(99),
      child: Container(
        width: 38,
        height: 38,
        alignment: Alignment.center,
        decoration: const BoxDecoration(
          color: Color(0xC91D211D),
          shape: BoxShape.circle,
        ),
        child: Text(
          label,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 8,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    ),
  );
}

class _OrchardResult extends StatelessWidget {
  const _OrchardResult({required this.onRestart});

  final VoidCallback onRestart;

  @override
  Widget build(BuildContext context) => Center(
    child: Container(
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: const Color(0xF7FFFFFF),
        borderRadius: BorderRadius.circular(22),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('🏆', style: TextStyle(fontSize: 44)),
          const SizedBox(height: 10),
          const Text(
            '果园合成完成',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 6),
          const Text(
            '三阶段试玩已完成；结果仅保存到当前本地演示。',
            textAlign: TextAlign.center,
            style: TextStyle(color: AirvanaColors.muted, fontSize: 10),
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: onRestart,
            icon: const Icon(Icons.replay_rounded),
            label: const Text('立即重玩'),
          ),
        ],
      ),
    ),
  );
}

class _FeedInlineGame extends ConsumerStatefulWidget {
  const _FeedInlineGame({required this.playable, required this.onExit});

  final Playable playable;
  final VoidCallback onExit;

  @override
  ConsumerState<_FeedInlineGame> createState() => _FeedInlineGameState();
}

class _FeedInlineGameState extends ConsumerState<_FeedInlineGame> {
  int _stage = 1;
  int _score = 0;
  int _lives = 3;
  int _runId = 1;
  bool _paused = false;
  bool _complete = false;
  bool _saving = false;
  bool _saved = false;
  String _feedback = '进入安全区，完成第 1 阶段';

  Playable get playable => widget.playable;

  List<String> get _choices {
    if (playable.id == 'plb_star_mower') {
      return const ['移动到安全区', '冲进孢体群', '原地等待'];
    }
    final category = playable.category;
    if (category.contains('经营') || category.contains('穿搭')) {
      return const ['按高亮流程完成', '随机选择', '跳过当前目标'];
    }
    if (category.contains('竞速') || category.contains('疾跑')) {
      return const ['进入发光路线', '撞向障碍', '停止移动'];
    }
    if (category.contains('策略') || category.contains('塔防')) {
      return const ['启动高亮防线', '平均分散火力', '暂不行动'];
    }
    return const ['执行高亮操作', '尝试风险路线', '等待下一阶段'];
  }

  void _choose(int index) {
    if (_paused || _complete) return;
    final correct = index == 0;
    var reachedTerminal = false;
    setState(() {
      if (correct) {
        _score += 1;
        _feedback = playable.id == 'plb_star_mower'
            ? '安全区已清理 · 星刃持续运转'
            : '操作正确 · 阶段完成';
      } else {
        _lives = (_lives - 1).clamp(0, 3);
        _feedback = playable.id == 'plb_star_mower'
            ? '孢体造成损伤 · 失去 1 格生命'
            : '未命中目标 · 请根据提示继续';
      }
      if (_stage >= 3 || _lives <= 0) {
        _complete = true;
        reachedTerminal = true;
      } else {
        _stage += 1;
      }
    });
    if (reachedTerminal) unawaited(_recordResult());
  }

  void _restart() => setState(() {
    _runId += 1;
    _stage = 1;
    _score = 0;
    _lives = 3;
    _paused = false;
    _complete = false;
    _saving = false;
    _saved = false;
    _feedback = '进入安全区，完成第 1 阶段';
  });

  Future<void> _recordResult() async {
    final runId = _runId;
    setState(() => _saving = true);
    try {
      await ref
          .read(airvanaRepositoryProvider)
          .recordPlayableExperience(
            playable,
            status: _score >= 2 ? 'completed' : 'failed',
            completedAt: DateTime.now().toUtc(),
          );
      ref.invalidate(experienceHistoryProvider);
      if (!mounted || runId != _runId) return;
      setState(() {
        _saving = false;
        _saved = true;
      });
    } on Object {
      if (!mounted || runId != _runId) return;
      setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) => Semantics(
    key: ValueKey('feed-inline-game-${playable.id}'),
    container: true,
    explicitChildNodes: true,
    label: '${playable.title}原位游戏区域',
    child: ColoredBox(
      color: const Color(0xD9050907),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(11, 58, 11, 12),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(18),
          child: Stack(
            fit: StackFit.expand,
            children: [
              _FeedCover(playable: playable),
              const DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0x8A07100D), Color(0xF2050907)],
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.all(12),
                child: _complete
                    ? _FeedInlineResult(
                        key: const ValueKey('feed-inline-result'),
                        success: _score >= 2,
                        score: _score,
                        status: _saving
                            ? '正在保存本机体验记录'
                            : _saved
                            ? '体验记录已保存到本机'
                            : '结果仅保存在当前本地演示',
                        onRestart: _restart,
                        onExit: widget.onExit,
                      )
                    : Column(
                        children: [
                          _FeedInlineHeader(
                            playable: playable,
                            stage: _stage,
                            lives: _lives,
                          ),
                          const SizedBox(height: 8),
                          ClipRRect(
                            borderRadius: BorderRadius.circular(99),
                            child: LinearProgressIndicator(
                              value: _stage / 3,
                              minHeight: 7,
                              color: const Color(0xFFB8F577),
                              backgroundColor: Colors.white24,
                            ),
                          ),
                          const SizedBox(height: 9),
                          Expanded(
                            child: _FeedInlineScene(
                              playable: playable,
                              stage: _stage,
                              paused: _paused,
                              onCorrectAction: () => _choose(0),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _paused ? '游戏已暂停' : _feedback,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 13,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          const SizedBox(height: 7),
                          Row(
                            children: List.generate(
                              _choices.length,
                              (index) => Expanded(
                                child: Padding(
                                  padding: EdgeInsets.only(
                                    right: index == _choices.length - 1 ? 0 : 5,
                                  ),
                                  child: OutlinedButton(
                                    key: ValueKey('feed-inline-action-$index'),
                                    onPressed: _paused
                                        ? null
                                        : () => _choose(index),
                                    style: OutlinedButton.styleFrom(
                                      foregroundColor: Colors.white,
                                      side: const BorderSide(
                                        color: Colors.white38,
                                      ),
                                      minimumSize: const Size.fromHeight(38),
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 4,
                                        vertical: 5,
                                      ),
                                      textStyle: const TextStyle(
                                        fontSize: 9,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                    child: Text(
                                      _choices[index],
                                      maxLines: 2,
                                      textAlign: TextAlign.center,
                                    ),
                                  ),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 7),
                          _FeedInlineControls(
                            score: _score,
                            lives: _lives,
                            paused: _paused,
                            onPause: () => setState(() {
                              _paused = !_paused;
                            }),
                            onRestart: _restart,
                          ),
                        ],
                      ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

class _FeedInlineHeader extends StatelessWidget {
  const _FeedInlineHeader({
    required this.playable,
    required this.stage,
    required this.lives,
  });

  final Playable playable;
  final int stage;
  final int lives;

  @override
  Widget build(BuildContext context) => Row(
    children: [
      Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              playable.title,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              '生命 $lives · ${playable.category}',
              style: const TextStyle(color: Colors.white70, fontSize: 9),
            ),
          ],
        ),
      ),
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: const BoxDecoration(
          color: AirvanaColors.accent,
          borderRadius: BorderRadius.all(Radius.circular(99)),
        ),
        child: Text(
          '$stage/3',
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w900,
          ),
        ),
      ),
    ],
  );
}

class _FeedInlineScene extends StatelessWidget {
  const _FeedInlineScene({
    required this.playable,
    required this.stage,
    required this.paused,
    required this.onCorrectAction,
  });

  final Playable playable;
  final int stage;
  final bool paused;
  final VoidCallback onCorrectAction;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    label: playable.id == 'plb_star_mower'
        ? '星尘割草战场，点按或水平拖动清扫车进入安全区'
        : '${playable.title}游戏场景，点按执行高亮操作',
    child: GestureDetector(
      key: ValueKey('feed-inline-scene-${playable.id}'),
      behavior: HitTestBehavior.opaque,
      onTap: paused ? null : onCorrectAction,
      onHorizontalDragEnd: paused ? null : (_) => onCorrectAction(),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(18),
        child: Stack(
          fit: StackFit.expand,
          children: [
            _FeedCover(playable: playable),
            const ColoredBox(color: Color(0x6B07100D)),
            if (playable.id == 'plb_star_mower') ...[
              ...const [
                Alignment(-.70, -.35),
                Alignment(.62, -.50),
                Alignment(-.18, .04),
                Alignment(.72, .24),
                Alignment(-.62, .50),
              ].asMap().entries.map(
                (entry) => Align(
                  alignment: entry.value,
                  child: Container(
                    width: entry.key == 1 ? 36 : 25,
                    height: entry.key == 1 ? 36 : 25,
                    decoration: BoxDecoration(
                      color: entry.key == 1
                          ? const Color(0xFFFF4D6F)
                          : const Color(0xFF5F286F),
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white54, width: 2),
                    ),
                    child: Icon(
                      entry.key == 1
                          ? Icons.coronavirus_rounded
                          : Icons.brightness_1_rounded,
                      color: Colors.white70,
                      size: entry.key == 1 ? 20 : 11,
                    ),
                  ),
                ),
              ),
              Align(
                alignment: Alignment(0, .68 - stage * .13),
                child: Container(
                  width: 86,
                  height: 86,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: const Color(0x99B8F577),
                      width: 2,
                    ),
                  ),
                  alignment: Alignment.center,
                  child: Container(
                    width: 56,
                    height: 50,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF0A34B),
                      borderRadius: BorderRadius.circular(15),
                      border: Border.all(color: const Color(0xFFFFE0A8)),
                    ),
                    child: const Icon(
                      Icons.agriculture_rounded,
                      color: Colors.white,
                      size: 33,
                    ),
                  ),
                ),
              ),
            ] else
              Center(
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 18,
                    vertical: 12,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xD9050907),
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: Colors.white24),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.touch_app_rounded, color: Colors.white),
                      const SizedBox(width: 9),
                      Flexible(
                        child: Text(
                          playable.instruction,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            Positioned(
              left: 10,
              right: 10,
              bottom: 8,
              child: Text(
                paused ? '已暂停' : '点按或水平拖动完成当前高亮操作',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white70,
                  fontSize: 9,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

class _FeedInlineControls extends StatelessWidget {
  const _FeedInlineControls({
    required this.score,
    required this.lives,
    required this.paused,
    required this.onPause,
    required this.onRestart,
  });

  final int score;
  final int lives;
  final bool paused;
  final VoidCallback onPause;
  final VoidCallback onRestart;

  @override
  Widget build(BuildContext context) => Row(
    children: [
      Text(
        'SCORE $score  ·  生命 $lives',
        style: const TextStyle(
          color: Colors.white,
          fontSize: 10,
          fontWeight: FontWeight.w900,
        ),
      ),
      const Spacer(),
      TextButton(
        key: const ValueKey('feed-inline-pause'),
        onPressed: onPause,
        child: Text(paused ? '继续' : '暂停'),
      ),
      OutlinedButton(
        key: const ValueKey('feed-inline-restart'),
        onPressed: onRestart,
        child: const Text('重开'),
      ),
    ],
  );
}

class _FeedInlineResult extends StatelessWidget {
  const _FeedInlineResult({
    super.key,
    required this.success,
    required this.score,
    required this.status,
    required this.onRestart,
    required this.onExit,
  });

  final bool success;
  final int score;
  final String status;
  final VoidCallback onRestart;
  final VoidCallback onExit;

  @override
  Widget build(BuildContext context) => Center(
    child: Container(
      constraints: const BoxConstraints(maxWidth: 330),
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: const Color(0xF20C1513),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white24),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            success
                ? Icons.emoji_events_rounded
                : Icons.replay_circle_filled_rounded,
            color: success ? const Color(0xFFFFD45B) : Colors.white,
            size: 58,
          ),
          const SizedBox(height: 12),
          Text(
            success ? '三阶段试玩完成' : '本次挑战未完成',
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 22,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 7),
          Text(
            '本局得分 $score / 3 · $status',
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.white70, fontSize: 10),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              OutlinedButton(
                key: const ValueKey('feed-inline-retry'),
                onPressed: onRestart,
                child: const Text('立即重玩'),
              ),
              const SizedBox(width: 9),
              FilledButton(
                key: const ValueKey('feed-inline-exit'),
                onPressed: onExit,
                child: const Text('退出试玩'),
              ),
            ],
          ),
        ],
      ),
    ),
  );
}

class _FeedCoverFallback extends StatelessWidget {
  const _FeedCoverFallback({required this.playable});

  final Playable playable;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      key: ValueKey('feed-cover-fallback-${playable.id}'),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF253830), Color(0xFF080D0B)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Center(
        child: Icon(
          Icons.sports_esports_rounded,
          size: 88,
          color: Colors.white.withValues(alpha: .18),
        ),
      ),
    );
  }
}

class _SocialFooter extends StatelessWidget {
  const _SocialFooter({
    required this.playable,
    required this.liked,
    required this.saved,
    required this.onLike,
    required this.onSave,
    required this.likeCount,
    required this.saveCount,
    required this.commentCount,
    required this.shared,
    required this.following,
    required this.onComment,
    required this.onShare,
    required this.onFollow,
    required this.canMessage,
    required this.onMessage,
    required this.onRemix,
  });

  final Playable playable;
  final bool liked;
  final bool saved;
  final VoidCallback onLike;
  final VoidCallback onSave;
  final int likeCount;
  final int saveCount;
  final int commentCount;
  final bool shared;
  final bool following;
  final VoidCallback onComment;
  final VoidCallback onShare;
  final VoidCallback onFollow;
  final bool canMessage;
  final VoidCallback onMessage;
  final VoidCallback onRemix;

  @override
  Widget build(BuildContext context) {
    final safeFooterExtra = MediaQuery.paddingOf(
      context,
    ).bottom.clamp(0.0, 24.0).toDouble();
    // 按 430×932 基准等比换算底部信息区高度：更高的屏幕按比例放大，
    // 保证作者行与浮动 Tab 之间始终留有空隙。
    final screenHeight = MediaQuery.sizeOf(context).height;
    final proportionalFooter =
        (screenHeight *
                (AirvanaMetrics.feedFooterHeight /
                    AirvanaMetrics.referenceHeight))
            .clamp(AirvanaMetrics.feedFooterHeight, 244.0);
    return SizedBox(
      key: const ValueKey('feed-social-footer'),
      // The 430×932 Web baseline reserves the floating navigation's visual
      // height inside the action panel, rather than shrinking the media.
      height: proportionalFooter + safeFooterExtra,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 14, 4),
        child: Column(
          children: [
            Row(
              children: [
                _SocialButton(
                  icon: liked
                      ? Icons.favorite_rounded
                      : Icons.favorite_border_rounded,
                  label: '$likeCount',
                  semanticLabel: liked
                      ? '取消点赞 ${playable.title}'
                      : '点赞 ${playable.title}',
                  onTap: onLike,
                ),
                _SocialButton(
                  icon: Icons.chat_bubble_outline_rounded,
                  label: '$commentCount',
                  semanticLabel: '查看 ${playable.title} 的评论',
                  onTap: onComment,
                ),
                _SocialButton(
                  icon: saved
                      ? Icons.bookmark_rounded
                      : Icons.bookmark_border_rounded,
                  label: '$saveCount',
                  semanticLabel: saved
                      ? '取消收藏 ${playable.title}'
                      : '收藏 ${playable.title}',
                  onTap: onSave,
                ),
                _SocialButton(
                  icon: Icons.ios_share_rounded,
                  label: shared ? '已分享' : '分享',
                  semanticLabel: '分享 ${playable.title}',
                  onTap: onShare,
                ),
                const Spacer(),
                Semantics(
                  button: true,
                  excludeSemantics: true,
                  label: '基于 ${playable.title} 创建受控 Remix 草稿',
                  onTap: onRemix,
                  child: OutlinedButton.icon(
                    onPressed: onRemix,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      side: const BorderSide(color: Colors.white38),
                      padding: const EdgeInsets.symmetric(horizontal: 13),
                      minimumSize: const Size(0, 32),
                    ),
                    icon: const ExcludeSemantics(
                      child: Icon(Icons.sync_rounded, size: 16),
                    ),
                    label: const ExcludeSemantics(
                      child: Text(
                        'Remix',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              key: const ValueKey('feed-author-row'),
              children: [
                Stack(
                  clipBehavior: Clip.none,
                  children: [
                    const CircleAvatar(
                      radius: 17,
                      backgroundColor: AirvanaColors.accent,
                      child: CircleAvatar(
                        radius: 15.5,
                        backgroundImage: AssetImage(
                          'assets/legacy/avatars/kai.png',
                        ),
                        backgroundColor: Color(0xFF302A3D),
                      ),
                    ),
                    if (playable.ownerHandle != '@kai.builds')
                      Positioned(
                        right: -7,
                        bottom: -6,
                        child: Semantics(
                          button: true,
                          label: following
                              ? '管理对 ${playable.authorName} 的关注'
                              : '关注 ${playable.authorName}',
                          child: Material(
                            color: AirvanaColors.accent,
                            shape: const CircleBorder(),
                            child: InkWell(
                              onTap: onFollow,
                              customBorder: const CircleBorder(),
                              child: SizedBox(
                                width: 22,
                                height: 22,
                                child: Icon(
                                  following
                                      ? Icons.check_rounded
                                      : Icons.add_rounded,
                                  size: 14,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text.rich(
                        TextSpan(
                          text: playable.authorName,
                          children: [
                            if (playable.ownerHandle.isNotEmpty)
                              TextSpan(
                                text: '  ${playable.ownerHandle}',
                                style: const TextStyle(
                                  color: Color(0xFFC7C7CC),
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                          ],
                        ),
                        key: ValueKey('feed-author-${playable.id}'),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 13,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      Text(
                        '运营 Agentic Playable「${playable.title}」',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white70,
                          fontSize: 10,
                        ),
                      ),
                    ],
                  ),
                ),
                if (canMessage)
                  IconButton(
                    tooltip: '私信 ${playable.authorName}',
                    onPressed: onMessage,
                    icon: const Icon(
                      Icons.chat_bubble_outline_rounded,
                      color: Colors.white,
                      size: 20,
                    ),
                  ),
              ],
            ),
            const SizedBox(
              key: ValueKey('feed-bottom-nav-reserve'),
              height: 65,
            ),
          ],
        ),
      ),
    );
  }
}

class _SocialButton extends StatelessWidget {
  const _SocialButton({
    required this.icon,
    required this.label,
    required this.onTap,
    this.semanticLabel,
  });
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      excludeSemantics: true,
      label: semanticLabel ?? label,
      onTap: onTap,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: ExcludeSemantics(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(3, 6, 8, 6),
            child: Row(
              children: [
                Icon(icon, color: Colors.white, size: 18),
                const SizedBox(width: 4),
                Text(
                  label,
                  style: const TextStyle(color: Colors.white, fontSize: 11),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _GlassBadge extends StatelessWidget {
  const _GlassBadge({required this.label});
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(maxWidth: 270),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: .38),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.white30),
      ),
      child: Text(
        label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 9,
          fontWeight: FontWeight.w900,
          letterSpacing: 1,
        ),
      ),
    );
  }
}

class _CircleGlass extends StatelessWidget {
  const _CircleGlass({
    required this.icon,
    required this.label,
    required this.onTap,
  });
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.black.withValues(alpha: .36),
      shape: const CircleBorder(side: BorderSide(color: Colors.white30)),
      child: IconButton(
        tooltip: label,
        onPressed: onTap,
        padding: EdgeInsets.zero,
        constraints: const BoxConstraints.tightFor(width: 40, height: 40),
        icon: Icon(icon, semanticLabel: label, color: Colors.white, size: 22),
      ),
    );
  }
}

class _ServerCommentSheet extends StatefulWidget {
  const _ServerCommentSheet({required this.playable, required this.repository});

  final Playable playable;
  final AirvanaRepository repository;

  @override
  State<_ServerCommentSheet> createState() => _ServerCommentSheetState();
}

class _ServerCommentSheetState extends State<_ServerCommentSheet> {
  final _controller = TextEditingController();
  late Future<List<ContentComment>> _comments;
  bool _submitting = false;
  String? _submitError;

  @override
  void initState() {
    super.initState();
    _comments = widget.repository.loadComments(widget.playable.id);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final body = _controller.text.trim();
    if (body.isEmpty || _submitting) return;
    setState(() {
      _submitting = true;
      _submitError = null;
    });
    try {
      await widget.repository.postComment(widget.playable.id, body);
      if (mounted) Navigator.pop(context, true);
    } on Object catch (error) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _submitError = '$error';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.viewInsetsOf(context).bottom;
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 4, 20, 18 + bottom),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '评论',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 4),
          Text(
            '${widget.playable.title} · 服务端同步',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(color: Color(0xFF8E8E93)),
          ),
          const SizedBox(height: 12),
          ConstrainedBox(
            constraints: const BoxConstraints(maxHeight: 260),
            child: FutureBuilder<List<ContentComment>>(
              future: _comments,
              builder: (context, snapshot) {
                if (snapshot.connectionState != ConnectionState.done) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.hasError) {
                  return Center(
                    child: TextButton.icon(
                      onPressed: () => setState(() {
                        _comments = widget.repository.loadComments(
                          widget.playable.id,
                        );
                      }),
                      icon: const Icon(Icons.refresh_rounded),
                      label: Text('评论载入失败：${snapshot.error}'),
                    ),
                  );
                }
                final items = snapshot.data ?? const <ContentComment>[];
                if (items.isEmpty) {
                  return const Center(child: Text('还没有评论，来发布第一条吧。'));
                }
                return ListView.builder(
                  shrinkWrap: true,
                  itemCount: items.length,
                  itemBuilder: (context, index) => _DemoComment(
                    author: items[index].authorName,
                    body: items[index].body,
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _controller,
            maxLength: 300,
            enabled: !_submitting,
            textInputAction: TextInputAction.send,
            decoration: InputDecoration(
              hintText: '写下你的评论…',
              errorText: _submitError,
              suffixIcon: IconButton(
                tooltip: '发布评论',
                onPressed: _submitting ? null : _submit,
                icon: _submitting
                    ? const SizedBox.square(
                        dimension: 18,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.send_rounded),
              ),
            ),
            onSubmitted: (_) => _submit(),
          ),
        ],
      ),
    );
  }
}

class _DemoComment extends StatelessWidget {
  const _DemoComment({required this.author, required this.body});

  final String author;
  final String body;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        CircleAvatar(
          radius: 15,
          backgroundColor: const Color(0xFFFFE8EA),
          child: Text(
            author.characters.first,
            style: const TextStyle(
              color: AirvanaColors.accent,
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
        const SizedBox(width: 9),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(author, style: const TextStyle(fontWeight: FontWeight.w800)),
              Text(
                body,
                style: const TextStyle(color: Color(0xFF636366), height: 1.4),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

class _FeedLoading extends StatelessWidget {
  const _FeedLoading();

  @override
  Widget build(BuildContext context) {
    return const Column(
      children: [
        SizedBox(height: 52),
        Expanded(child: ColoredBox(color: Color(0xFF111512))),
      ],
    );
  }
}
