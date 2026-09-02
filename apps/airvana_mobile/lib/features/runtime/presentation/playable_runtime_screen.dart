import 'dart:async';

import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/runtime/presentation/generated_playable_runtime.dart';
import 'package:airvana_mobile/features/runtime/presentation/h5_game_runtime.dart';
import 'package:airvana_mobile/features/shared/domain/airvana_models.dart';
import 'package:airvana_mobile/features/shared/presentation/playable_social_sheets.dart';
import 'package:airvana_mobile/shared/presentation/airvana_logo.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class PlayableRuntimeScreen extends ConsumerStatefulWidget {
  const PlayableRuntimeScreen({super.key, required this.playable});

  final Playable playable;

  @override
  ConsumerState<PlayableRuntimeScreen> createState() =>
      _PlayableRuntimeScreenState();
}

class _RuntimeSpec {
  const _RuntimeSpec({
    required this.eyebrow,
    required this.title,
    required this.intro,
    required this.startLabel,
    required this.successTitle,
    required this.failureTitle,
    required this.rounds,
    required this.successThreshold,
    required this.prompts,
    this.correctFeedback = '操作正确 · 阶段完成',
    this.wrongFeedback = '未命中目标 · 请根据提示继续',
  });

  factory _RuntimeSpec.forPlayable(Playable playable) {
    final generated = generatedGameProfileFor(playable.id);
    if (generated != null) {
      return _RuntimeSpec(
        eyebrow: generated.eyebrow,
        title: playable.title,
        intro: generated.intro,
        startLabel: generated.startLabel,
        successTitle: generated.successTitle,
        failureTitle: generated.failureTitle,
        rounds: generated.rounds,
        successThreshold: generated.successThreshold,
        prompts: generated.prompts,
        correctFeedback: generated.correctFeedback,
        wrongFeedback: generated.wrongFeedback,
      );
    }
    if (playable.id == 'plb_orchard_merge') {
      return _RuntimeSpec(
        eyebrow: 'LOCAL DEMO · 合成益智',
        title: playable.title,
        intro: '在九格果箱中找出发光的同类水果。6 轮完成 5 次合成即可丰收。',
        startLabel: '开始合成',
        successTitle: '果园合成完成',
        failureTitle: '果箱暂时满了',
        rounds: 6,
        successThreshold: 5,
        prompts: ['找出可以合成的同类水果', '继续寻找正在发光的配对', '完成下一次水果升级'],
        correctFeedback: '合成成功 · 水果已升级',
        wrongFeedback: '这组水果还不能合成 · 失去 1 次机会',
      );
    }
    if (playable.id == 'plb_star_mower') {
      return _RuntimeSpec(
        eyebrow: 'LOCAL DEMO · 深度割草生存',
        title: playable.title,
        intro: '控制清扫车穿越三片异星草场，自动星刃攻击追来的孢体；收集能量并在阶段间选择升级。',
        startLabel: '启动深度生存',
        successTitle: '星尘草场全部清理',
        failureTitle: '清扫车被草浪包围',
        rounds: 3,
        successThreshold: 2,
        prompts: ['向安全区移动，让星刃持续清扫', '收集能量并选择阶段升级', '守住最后一片草场'],
        correctFeedback: '安全区已清理 · 星刃持续运转',
        wrongFeedback: '孢体造成损伤 · 失去 1 格生命',
      );
    }
    return _RuntimeSpec(
      eyebrow:
          '${playable.localDemo ? 'LOCAL DEMO' : 'RUNTIME'} · ${playable.stage}',
      title: playable.title,
      intro: playable.summary,
      startLabel: '开始完整试玩',
      successTitle: '挑战完成',
      failureTitle: '挑战未完成',
      rounds: 3,
      successThreshold: 2,
      prompts: [playable.instruction],
    );
  }

  final String eyebrow;
  final String title;
  final String intro;
  final String startLabel;
  final String successTitle;
  final String failureTitle;
  final int rounds;
  final int successThreshold;
  final List<String> prompts;
  final String correctFeedback;
  final String wrongFeedback;

  String promptForRound(int round) => prompts[(round - 1) % prompts.length];
}

class _PlayableRuntimeScreenState extends ConsumerState<PlayableRuntimeScreen> {
  int _round = 0;
  int _score = 0;
  int _lives = 3;
  bool _started = false;
  bool _paused = false;
  bool _muted = true;
  bool _complete = false;
  bool _liked = false;
  bool _saved = false;
  bool _following = false;
  int _commentDelta = 0;
  int _runId = 0;
  final Set<int> _recordingRunIds = <int>{};
  final Set<int> _recordedRunIds = <int>{};
  bool _experienceSaving = false;
  bool _experienceSaved = false;
  String? _experienceSaveError;
  String _feedback = '选择正确行动完成 3 个阶段';
  bool _h5Success = false;
  bool _h5FallbackToChoices = false;
  String _gameRewardMessage = '';

  Playable get playable => widget.playable;
  _RuntimeSpec get _spec => _RuntimeSpec.forPlayable(playable);

  /// legacy 38 款走 H5 完整玩法引擎；WebView 不可用或加载失败时
  /// 回退到本地选择题演示结构。
  bool get _useH5Runtime =>
      !_h5FallbackToChoices &&
      h5GameRuntimeSupported() &&
      h5GameKeyForPlayable(playable.id) != null &&
      playable.localDemo;

  Future<void> _onH5Complete(H5GameResult result) async {
    final runId = _runId;
    setState(() {
      _complete = true;
      _score = result.score;
      _h5Success = result.success;
      _feedback = result.summary;
      _gameRewardMessage = '';
    });
    unawaited(
      _recordTerminalExperience(
        runId: runId,
        success: result.success,
        completedAt: DateTime.now().toUtc(),
      ),
    );
    if (!result.success) return;
    // 有效完成：金币入作品独立账本，同一作品每日首次记 5 AIP（Web 口径）。
    try {
      final container = ProviderScope.containerOf(context, listen: false);
      final reward = await container
          .read(airvanaRepositoryProvider)
          .recordGameCompletion(
            playableId: playable.id,
            title: playable.title,
            coins: result.score,
          );
      container.invalidate(gameCoinLedgersProvider);
      container.invalidate(rewardStateProvider);
      container.invalidate(walletTxnsProvider);
      if (!mounted || _runId != runId) return;
      setState(() {
        _gameRewardMessage = reward.earnedAip > 0
            ? '金币 +${result.score} · 本作品今日首次有效完成 +${reward.earnedAip} AIP'
            : '金币 +${result.score} · 今日 AIP 已发放（每作品每日一次）';
      });
    } catch (error) {
      if (!mounted || _runId != runId) return;
      setState(() => _gameRewardMessage = '闭环记账失败：$error');
    }
  }

  String get _experienceRecordMessage {
    if (_experienceSaving) return '正在保存本机体验记录';
    if (_experienceSaved) return '体验记录已保存到本机';
    if (_experienceSaveError != null) return '体验记录保存失败';
    return '正在准备本机体验记录';
  }

  List<String> get _choices {
    final generated = generatedGameProfileFor(playable.id);
    if (generated != null) return generated.choices;
    if (playable.id == 'plb_star_mower') {
      return ['向安全区移动', '冲入孢体群', '原地等待'];
    }
    final category = playable.category;
    if (category.contains('塔防') || category.contains('策略')) {
      return ['启动高亮防线', '平均分散火力', '暂不行动'];
    }
    if (category.contains('经营') || category.contains('穿搭')) {
      return ['按订单完成', '随机选择', '跳过顾客'];
    }
    if (category.contains('牌') || category.contains('推理')) {
      return ['核对线索行动', '消耗全部资源', '忽略提示'];
    }
    if (category.contains('竞速') || category.contains('疾跑')) {
      return ['进入发光路线', '撞向障碍', '停止移动'];
    }
    if (category.contains('三消') || category.contains('益智')) {
      return ['合成高亮目标', '移动无关元素', '放弃本回合'];
    }
    return ['执行高亮操作', '尝试风险路线', '等待下一阶段'];
  }

  void _start() {
    setState(() {
      _runId += 1;
      _started = true;
      _round = 1;
      _score = 0;
      _lives = 3;
      _paused = false;
      _complete = false;
      _experienceSaving = false;
      _experienceSaved = false;
      _experienceSaveError = null;
      _feedback = _spec.promptForRound(1);
    });
  }

  void _choose(int index) {
    if (_paused || _complete) return;
    var reachedTerminal = false;
    final generated = generatedGameProfileFor(playable.id);
    final correct = playable.id == 'plb_orchard_merge'
        ? index == _orchardTarget(_round)
        : generated != null
        ? index == generated.targetForRound(_round)
        : index == 0;
    setState(() {
      if (correct) {
        _score += 1;
      } else {
        _lives = (_lives - 1).clamp(0, 3);
      }
      _feedback = correct ? _spec.correctFeedback : _spec.wrongFeedback;
      if (_round >= _spec.rounds || _lives <= 0) {
        _complete = true;
        reachedTerminal = true;
      } else {
        _round += 1;
        if (correct) _feedback = _spec.promptForRound(_round);
      }
    });
    if (reachedTerminal) {
      unawaited(
        _recordTerminalExperience(
          runId: _runId,
          success: _score >= _spec.successThreshold,
          completedAt: DateTime.now().toUtc(),
        ),
      );
    }
  }

  Future<void> _recordTerminalExperience({
    required int runId,
    required bool success,
    required DateTime completedAt,
  }) async {
    if (_recordingRunIds.contains(runId) || _recordedRunIds.contains(runId)) {
      return;
    }
    _recordingRunIds.add(runId);
    if (mounted && _runId == runId) {
      setState(() {
        _experienceSaving = true;
        _experienceSaved = false;
        _experienceSaveError = null;
      });
    }

    final container = ProviderScope.containerOf(context, listen: false);
    try {
      await container
          .read(airvanaRepositoryProvider)
          .recordPlayableExperience(
            playable,
            status: success ? 'completed' : 'failed',
            completedAt: completedAt,
          );
      _recordedRunIds.add(runId);
      container.invalidate(experienceHistoryProvider);
      if (!mounted || _runId != runId) return;
      setState(() {
        _experienceSaving = false;
        _experienceSaved = true;
      });
    } catch (error) {
      if (!mounted || _runId != runId) return;
      setState(() {
        _experienceSaving = false;
        _experienceSaveError = '$error';
      });
    } finally {
      _recordingRunIds.remove(runId);
    }
  }

  int _orchardTarget(int round) => const [1, 4, 7, 2, 5, 8][round - 1];

  Future<void> _openComments() async {
    final posted = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
      ),
      builder: (_) => AirvanaLocalCommentSheet(playable: playable),
    );
    if (!mounted || posted != true) return;
    setState(() => _commentDelta += 1);
    _showMessage('评论已保存到当前本地演示');
  }

  Future<void> _share() async {
    final choice = await showModalBottomSheet<AirvanaShareChoice>(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => AirvanaShareSheet(playable: playable),
    );
    if (!mounted || choice == null) return;
    switch (choice) {
      case AirvanaShareChoice.restart:
        _start();
        return;
      case AirvanaShareChoice.fullscreen:
        _showMessage('已记录全屏意图；当前预览保持设备画布');
        return;
      case AirvanaShareChoice.dislike:
        _showMessage('已记录“不感兴趣”本地意图');
        return;
      case AirvanaShareChoice.report:
        _showMessage('举报已记录为本地演示，尚未发送到服务端');
        return;
      case AirvanaShareChoice.block:
        _showMessage('屏蔽作者已记录为本地演示，尚未发送到服务端');
        return;
      case AirvanaShareChoice.copy:
        await _copyRuntimeShareLink('分享链接已复制；当前仅记录复制行为');
        return;
      case AirvanaShareChoice.system:
        await _copyRuntimeShareLink('当前预览未收到系统分享确认，链接已复制');
        return;
      case AirvanaShareChoice.tiktok:
      case AirvanaShareChoice.instagram:
      case AirvanaShareChoice.x:
        await _copyRuntimeShareLink('链接已复制，可粘贴到 ${choice.label}；当前仅记录分享意图');
        return;
    }
  }

  Future<void> _copyRuntimeShareLink(String message) async {
    try {
      await Clipboard.setData(
        ClipboardData(text: 'airvana://playable/${playable.id}'),
      );
    } on Object {
      // Preserve the local share intent when an embedded host has no clipboard.
    }
    if (mounted) _showMessage(message);
  }

  Future<void> _remix() async {
    final confirmed = await showModalBottomSheet<bool>(
      context: context,
      useSafeArea: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
      ),
      builder: (_) => AirvanaRemixSheet(playable: playable),
    );
    if (!mounted || confirmed != true) return;
    context.push('/create?remix=${Uri.encodeComponent(playable.id)}');
  }

  void _showMessage(String message) {
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
    return Scaffold(
      backgroundColor: const Color(0xFF050907),
      body: SafeArea(
        bottom: false,
        child: Column(
          children: [
            _TopBar(
              muted: _muted,
              onMute: () => setState(() => _muted = !_muted),
              onClose: () => context.pop(),
            ),
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  _Cover(playable: playable),
                  const DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Color(0x18000000), Color(0xF2050907)],
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        stops: [0.38, 1],
                      ),
                    ),
                  ),
                  if (!_started)
                    _Intro(playable: playable, spec: _spec, onStart: _start),
                  if (_started && !_complete && _useH5Runtime)
                    H5GameRuntime(
                      key: ValueKey('h5-runtime-${playable.id}-$_runId'),
                      gameKey: h5GameKeyForPlayable(playable.id)!,
                      muted: _muted,
                      onComplete: _onH5Complete,
                      onLoadError: (_) =>
                          setState(() => _h5FallbackToChoices = true),
                    ),
                  if (_started && !_complete && !_useH5Runtime)
                    _GameBoard(
                      playable: playable,
                      spec: _spec,
                      round: _round,
                      score: _score,
                      lives: _lives,
                      feedback: _feedback,
                      choices: _choices,
                      paused: _paused,
                      onChoice: _choose,
                      onPause: () => setState(() => _paused = !_paused),
                      onRestart: _start,
                    ),
                  if (_complete)
                    _Result(
                      spec: _spec,
                      score: _score,
                      showRoundDenominator: !_useH5Runtime,
                      success: _useH5Runtime
                          ? _h5Success
                          : _score >= _spec.successThreshold,
                      experienceRecordMessage: _gameRewardMessage.isEmpty
                          ? _experienceRecordMessage
                          : '$_experienceRecordMessage · $_gameRewardMessage',
                      onRestart: _start,
                      onExit: () => context.pop(),
                    ),
                ],
              ),
            ),
            _SocialFooter(
              playable: playable,
              liked: _liked,
              saved: _saved,
              shared: false,
              following: _following,
              commentCount: playable.comments + _commentDelta,
              onLike: () => setState(() => _liked = !_liked),
              onComment: _openComments,
              onSave: () => setState(() => _saved = !_saved),
              onShare: _share,
              onFollow: () => setState(() => _following = !_following),
              onRemix: _remix,
            ),
          ],
        ),
      ),
    );
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar({
    required this.muted,
    required this.onMute,
    required this.onClose,
  });
  final bool muted;
  final VoidCallback onMute;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 52,
      padding: const EdgeInsets.symmetric(horizontal: 14),
      color: Colors.white,
      child: Row(
        children: [
          const AirvanaLogo(width: 88),
          const Spacer(),
          IconButton(
            tooltip: muted ? '开启游戏音效' : '静音游戏音效',
            onPressed: onMute,
            icon: Icon(
              muted ? Icons.volume_off_outlined : Icons.volume_up_outlined,
            ),
          ),
          IconButton(
            tooltip: '退出游戏',
            onPressed: onClose,
            icon: const Icon(Icons.close_rounded),
          ),
        ],
      ),
    );
  }
}

class _Cover extends StatelessWidget {
  const _Cover({required this.playable});
  final Playable playable;
  @override
  Widget build(BuildContext context) {
    if (playable.coverAsset.isEmpty) {
      return _RuntimeCoverFallback(playable: playable);
    }
    return Image.asset(
      playable.coverAsset,
      fit: BoxFit.cover,
      alignment: Alignment.center,
      errorBuilder: (_, __, ___) => _RuntimeCoverFallback(playable: playable),
    );
  }
}

class _RuntimeCoverFallback extends StatelessWidget {
  const _RuntimeCoverFallback({required this.playable});

  final Playable playable;

  @override
  Widget build(BuildContext context) => DecoratedBox(
    key: ValueKey('runtime-cover-fallback-${playable.id}'),
    decoration: const BoxDecoration(
      gradient: LinearGradient(
        colors: [Color(0xFF263B32), Color(0xFF0A110E)],
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
      ),
    ),
    child: Center(
      child: Icon(
        Icons.sports_esports_rounded,
        size: 84,
        color: Colors.white.withValues(alpha: .16),
      ),
    ),
  );
}

class _Intro extends StatelessWidget {
  const _Intro({
    required this.playable,
    required this.spec,
    required this.onStart,
  });
  final Playable playable;
  final _RuntimeSpec spec;
  final VoidCallback onStart;
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 34),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
            decoration: BoxDecoration(
              color: const Color(0x99050907),
              borderRadius: BorderRadius.circular(99),
              border: Border.all(color: Colors.white30),
            ),
            child: Text(
              spec.eyebrow,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 9,
                fontWeight: FontWeight.w900,
                letterSpacing: 1.1,
              ),
            ),
          ),
          const Spacer(),
          Center(
            child: Column(
              children: [
                Text(
                  spec.title,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  spec.intro,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    height: 1.5,
                  ),
                ),
                const SizedBox(height: 18),
                FilledButton(
                  key: const ValueKey('runtime-start'),
                  onPressed: onStart,
                  style: FilledButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: AirvanaColors.ink,
                    minimumSize: const Size(180, 44),
                  ),
                  child: Text(
                    spec.startLabel,
                    style: const TextStyle(fontWeight: FontWeight.w900),
                  ),
                ),
                const SizedBox(height: 10),
                const Text(
                  '本地互动 DEMO · 游戏金币按作品隔离；有效完成可记录本机 AIP\n不代表服务端发放、收益或商业转化',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white60,
                    fontSize: 9,
                    height: 1.45,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _GameBoard extends StatelessWidget {
  const _GameBoard({
    required this.playable,
    required this.spec,
    required this.round,
    required this.score,
    required this.lives,
    required this.feedback,
    required this.choices,
    required this.paused,
    required this.onChoice,
    required this.onPause,
    required this.onRestart,
  });
  final Playable playable;
  final _RuntimeSpec spec;
  final int round;
  final int score;
  final int lives;
  final String feedback;
  final List<String> choices;
  final bool paused;
  final ValueChanged<int> onChoice;
  final VoidCallback onPause;
  final VoidCallback onRestart;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xE60C1513),
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: Colors.white24),
        ),
        child: Column(
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        spec.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w900,
                          fontSize: 18,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        spec.promptForRound(round),
                        style: const TextStyle(
                          color: Colors.white60,
                          fontSize: 10,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 10,
                  ),
                  decoration: BoxDecoration(
                    color: AirvanaColors.accent,
                    borderRadius: BorderRadius.circular(99),
                  ),
                  child: Text(
                    '$round/${spec.rounds}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            LinearProgressIndicator(
              value: round / spec.rounds,
              minHeight: 7,
              borderRadius: BorderRadius.circular(99),
              backgroundColor: Colors.white12,
              color: AirvanaColors.success,
            ),
            const SizedBox(height: 12),
            if (playable.id == 'plb_orchard_merge') ...[
              _OrchardStats(
                score: score,
                targetLevel: round < 3 ? 2 : 3,
                movesLeft: spec.rounds - round + 1,
              ),
              const SizedBox(height: 10),
            ],
            Expanded(
              child: _GameScene(
                playable: playable,
                round: round,
                orchardTarget: playable.id == 'plb_orchard_merge'
                    ? const [1, 4, 7, 2, 5, 8][round - 1]
                    : 0,
                onChoice: onChoice,
              ),
            ),
            const SizedBox(height: 9),
            Text(
              feedback,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 10),
            if (playable.id != 'plb_orchard_merge' &&
                generatedGameProfileFor(playable.id) == null)
              ...List.generate(
                choices.length,
                (index) => Padding(
                  padding: const EdgeInsets.only(bottom: 7),
                  child: SizedBox(
                    width: double.infinity,
                    child: OutlinedButton(
                      onPressed: paused ? null : () => onChoice(index),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white,
                        side: const BorderSide(color: Colors.white38),
                        minimumSize: const Size.fromHeight(40),
                        padding: const EdgeInsets.symmetric(vertical: 8),
                      ),
                      child: Text(choices[index]),
                    ),
                  ),
                ),
              ),
            const SizedBox(height: 4),
            LayoutBuilder(
              builder: (context, constraints) {
                final compact = constraints.maxWidth < 330;
                return Row(
                  children: [
                    Expanded(
                      child: Text(
                        'SCORE $score  ·  机会 $lives',
                        maxLines: 1,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                    if (compact) ...[
                      IconButton(
                        key: const ValueKey('runtime-pause'),
                        tooltip: paused ? '继续' : '暂停',
                        onPressed: onPause,
                        visualDensity: VisualDensity.compact,
                        icon: Icon(
                          paused
                              ? Icons.play_arrow_rounded
                              : Icons.pause_rounded,
                          color: Colors.white,
                        ),
                      ),
                      IconButton.outlined(
                        key: const ValueKey('runtime-restart'),
                        tooltip: '重开',
                        onPressed: onRestart,
                        visualDensity: VisualDensity.compact,
                        icon: const Icon(
                          Icons.refresh_rounded,
                          color: Colors.white,
                        ),
                      ),
                    ] else ...[
                      TextButton(
                        key: const ValueKey('runtime-pause'),
                        onPressed: onPause,
                        child: Text(paused ? '继续' : '暂停'),
                      ),
                      OutlinedButton(
                        key: const ValueKey('runtime-restart'),
                        onPressed: onRestart,
                        child: const Text('重开'),
                      ),
                    ],
                  ],
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _OrchardStats extends StatelessWidget {
  const _OrchardStats({
    required this.score,
    required this.targetLevel,
    required this.movesLeft,
  });

  final int score;
  final int targetLevel;
  final int movesLeft;

  @override
  Widget build(BuildContext context) => Row(
    children: [
      _OrchardStat(label: '本局得分', value: '$score'),
      const SizedBox(width: 7),
      _OrchardStat(
        label: '目标等级',
        value: '$targetLevel',
        accent: const Color(0xFFDF7546),
      ),
      const SizedBox(width: 7),
      _OrchardStat(label: '剩余步数', value: '$movesLeft'),
    ],
  );
}

class _OrchardStat extends StatelessWidget {
  const _OrchardStat({
    required this.label,
    required this.value,
    this.accent = const Color(0xFF253A24),
  });

  final String label;
  final String value;
  final Color accent;

  @override
  Widget build(BuildContext context) => Expanded(
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: const Color(0xFFFDF9ED),
        borderRadius: BorderRadius.circular(13),
        border: Border.all(color: const Color(0x446C874D)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: Color(0xFF68745E),
              fontSize: 8,
              fontWeight: FontWeight.w800,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              color: accent,
              fontSize: 17,
              height: 1.1,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    ),
  );
}

class _GameScene extends StatelessWidget {
  const _GameScene({
    required this.playable,
    required this.round,
    required this.orchardTarget,
    required this.onChoice,
  });
  final Playable playable;
  final int round;
  final int orchardTarget;
  final ValueChanged<int> onChoice;

  @override
  Widget build(BuildContext context) {
    if (playable.id == 'plb_orchard_merge') return _orchard();
    if (playable.id == 'plb_star_mower') return _mower();
    final generated = generatedGameProfileFor(playable.id);
    if (generated != null) {
      return GeneratedGameScene(
        playable: playable,
        profile: generated,
        round: round,
        targetChoice: generated.targetForRound(round),
        onChoice: onChoice,
      );
    }
    return _generic();
  }

  Widget _orchard() => Semantics(
    label: '九格果箱合成台',
    explicitChildNodes: true,
    child: ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: Stack(
        fit: StackFit.expand,
        children: [
          _Cover(playable: playable),
          const ColoredBox(color: Color(0xB8263820)),
          Center(
            child: Container(
              constraints: const BoxConstraints(maxWidth: 300),
              margin: const EdgeInsets.all(12),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xE63A3226),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFF7D7259), width: 2),
                boxShadow: const [
                  BoxShadow(color: Colors.black38, blurRadius: 18),
                ],
              ),
              child: GridView.builder(
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 3,
                  crossAxisSpacing: 7,
                  mainAxisSpacing: 7,
                ),
                itemCount: 9,
                itemBuilder: (_, index) {
                  const fruits = [
                    ('🍏', '青苹果'),
                    ('🍐', '香梨'),
                    ('🍎', '红苹果'),
                    ('🍑', '桃子'),
                    ('🍐', '香梨'),
                    ('🍏', '青苹果'),
                    ('🍊', '柑橘'),
                    ('🍎', '红苹果'),
                    ('🍑', '桃子'),
                  ];
                  final target = index == orchardTarget;
                  final fruit = fruits[index];
                  return Semantics(
                    button: true,
                    excludeSemantics: true,
                    label: '${fruit.$2}${target ? '，当前目标' : ''}',
                    onTap: () => onChoice(index),
                    child: Material(
                      color: target
                          ? const Color(0xFFFFF4C7)
                          : const Color(0xFFF7EED0),
                      borderRadius: BorderRadius.circular(13),
                      child: InkWell(
                        onTap: () => onChoice(index),
                        borderRadius: BorderRadius.circular(13),
                        child: ExcludeSemantics(
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 180),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(13),
                              border: Border.all(
                                color: target
                                    ? const Color(0xFFFFC83D)
                                    : const Color(0xFFBBAF87),
                                width: target ? 3 : 1,
                              ),
                              boxShadow: target
                                  ? const [
                                      BoxShadow(
                                        color: Color(0x99FFD45B),
                                        blurRadius: 14,
                                        spreadRadius: 1,
                                      ),
                                    ]
                                  : null,
                            ),
                            alignment: Alignment.center,
                            child: Stack(
                              alignment: Alignment.center,
                              children: [
                                Text(
                                  fruit.$1,
                                  style: const TextStyle(fontSize: 31),
                                ),
                                if (target)
                                  const Positioned(
                                    top: 3,
                                    right: 5,
                                    child: Icon(
                                      Icons.auto_awesome_rounded,
                                      color: Color(0xFFFF9A27),
                                      size: 15,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    ),
  );

  Widget _mower() => Semantics(
    button: true,
    label: '星尘割草三阶段实时生存战场，点按或水平拖动到安全区',
    child: GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => onChoice(0),
      onHorizontalDragEnd: (_) => onChoice(0),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Stack(
          fit: StackFit.expand,
          children: [
            _Cover(playable: playable),
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xB00B1612), Color(0xE0060A08)],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
              ),
            ),
            Positioned(
              left: 10,
              right: 10,
              top: 9,
              child: Row(
                children: [
                  _MowerChip(
                    icon: Icons.favorite_rounded,
                    label: '生命 ${100 - (round - 1) * 12}',
                  ),
                  const SizedBox(width: 6),
                  _MowerChip(
                    icon: Icons.shield_rounded,
                    label: '护盾 ${45 + round * 5}',
                  ),
                  const Spacer(),
                  _MowerChip(
                    icon: Icons.bolt_rounded,
                    label: '击破 ${round * 8}',
                  ),
                ],
              ),
            ),
            ...const [
              Alignment(-.72, -.25),
              Alignment(.62, -.48),
              Alignment(-.2, .1),
              Alignment(.75, .26),
              Alignment(-.68, .5),
            ].asMap().entries.map(
              (entry) => Align(
                alignment: entry.value,
                child: Container(
                  width: entry.key == 1 ? 34 : 24,
                  height: entry.key == 1 ? 34 : 24,
                  decoration: BoxDecoration(
                    color: entry.key == 1
                        ? const Color(0xFFFF4D6F)
                        : const Color(0xFF722B78),
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: entry.key == 1
                          ? const Color(0xFFFFD2DC)
                          : const Color(0xFFD89CDF),
                      width: 2,
                    ),
                    boxShadow: const [
                      BoxShadow(color: Colors.black45, blurRadius: 8),
                    ],
                  ),
                  child: Icon(
                    entry.key == 1
                        ? Icons.coronavirus_rounded
                        : Icons.brightness_1_rounded,
                    color: Colors.white70,
                    size: entry.key == 1 ? 19 : 11,
                  ),
                ),
              ),
            ),
            Align(
              alignment: Alignment(0, .72 - round * .1),
              child: Container(
                width: 92,
                height: 92,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: const Color(0x88BEFF7E), width: 2),
                ),
                alignment: Alignment.center,
                child: Container(
                  width: 58,
                  height: 52,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF0A34B),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFFFFE0A8)),
                    boxShadow: const [
                      BoxShadow(color: Colors.black54, blurRadius: 12),
                    ],
                  ),
                  child: const Icon(
                    Icons.agriculture_rounded,
                    color: Colors.white,
                    size: 34,
                  ),
                ),
              ),
            ),
            const Positioned(
              left: 12,
              right: 12,
              bottom: 8,
              child: Text(
                '点按或拖动，清扫车会持续向目标移动',
                textAlign: TextAlign.center,
                style: TextStyle(
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

  Widget _generic() => Semantics(
    button: true,
    label: '${playable.title}交互场景，点按执行当前高亮操作',
    child: ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: Stack(
        fit: StackFit.expand,
        children: [
          _Cover(playable: playable),
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Color(0x22000000), Color(0xAA000000)],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
            ),
          ),
          Positioned(
            left: 14,
            right: 14,
            bottom: 14,
            child: Material(
              color: const Color(0xD90B1110),
              borderRadius: BorderRadius.circular(18),
              child: InkWell(
                onTap: () => onChoice(0),
                borderRadius: BorderRadius.circular(18),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Row(
                    children: [
                      Container(
                        width: 48,
                        height: 48,
                        decoration: const BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          _categoryIcon(playable.category),
                          color: AirvanaColors.accent,
                          size: 27,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              playable.category,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 14,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              playable.instruction,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Colors.white70,
                                fontSize: 10,
                                height: 1.35,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const Icon(
                        Icons.touch_app_rounded,
                        color: Colors.white,
                        size: 24,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    ),
  );

  IconData _categoryIcon(String category) {
    if (category.contains('策略') || category.contains('塔防')) {
      return Icons.shield_rounded;
    }
    if (category.contains('竞速') || category.contains('疾跑')) {
      return Icons.sports_motorsports_rounded;
    }
    if (category.contains('音乐') || category.contains('节奏')) {
      return Icons.music_note_rounded;
    }
    if (category.contains('经营')) return Icons.storefront_rounded;
    if (category.contains('射击')) return Icons.rocket_launch_rounded;
    return Icons.auto_awesome_rounded;
  }
}

class _MowerChip extends StatelessWidget {
  const _MowerChip({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
    decoration: BoxDecoration(
      color: const Color(0xC8060A0E),
      borderRadius: BorderRadius.circular(99),
      border: Border.all(color: Colors.white24),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 11, color: const Color(0xFFB9FF7A)),
        const SizedBox(width: 3),
        Text(
          label,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 8,
            fontWeight: FontWeight.w800,
          ),
        ),
      ],
    ),
  );
}

class _Result extends StatelessWidget {
  const _Result({
    required this.spec,
    required this.score,
    required this.success,
    required this.experienceRecordMessage,
    required this.onRestart,
    required this.onExit,
    this.showRoundDenominator = true,
  });
  final _RuntimeSpec spec;
  final int score;
  final bool success;
  final String experienceRecordMessage;
  final bool showRoundDenominator;
  final VoidCallback onRestart;
  final VoidCallback onExit;
  @override
  Widget build(BuildContext context) => Center(
    child: Container(
      margin: const EdgeInsets.all(28),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: const Color(0xF20C1513),
        borderRadius: BorderRadius.circular(26),
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
            size: 64,
          ),
          const SizedBox(height: 14),
          Text(
            success ? spec.successTitle : spec.failureTitle,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 26,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            key: const ValueKey('runtime-experience-status'),
            showRoundDenominator
                ? '本局得分 $score / ${spec.rounds} · $experienceRecordMessage'
                : '本局得分 $score · $experienceRecordMessage',
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.white70, height: 1.45),
          ),
          const SizedBox(height: 18),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              OutlinedButton(
                key: const ValueKey('runtime-retry'),
                onPressed: onRestart,
                child: Text(success ? '再玩一次' : '立即重试'),
              ),
              const SizedBox(width: 10),
              FilledButton(
                key: const ValueKey('runtime-result-exit'),
                onPressed: onExit,
                child: const Text('返回作品'),
              ),
            ],
          ),
        ],
      ),
    ),
  );
}

class _SocialFooter extends StatelessWidget {
  const _SocialFooter({
    required this.playable,
    required this.liked,
    required this.saved,
    required this.shared,
    required this.following,
    required this.commentCount,
    required this.onLike,
    required this.onComment,
    required this.onSave,
    required this.onShare,
    required this.onFollow,
    required this.onRemix,
  });
  final Playable playable;
  final bool liked;
  final bool saved;
  final bool shared;
  final bool following;
  final int commentCount;
  final VoidCallback onLike;
  final VoidCallback onComment;
  final VoidCallback onSave;
  final VoidCallback onShare;
  final VoidCallback onFollow;
  final VoidCallback onRemix;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 158,
      padding: const EdgeInsets.fromLTRB(16, 7, 16, 7),
      color: const Color(0xFF050907),
      child: Column(
        children: [
          Row(
            children: [
              _RuntimeSocialAction(
                label: '${playable.likes + (liked ? 1 : 0)}',
                semanticLabel: liked
                    ? '取消点赞 ${playable.title}'
                    : '点赞 ${playable.title}',
                icon: liked
                    ? Icons.favorite_rounded
                    : Icons.favorite_border_rounded,
                onTap: onLike,
              ),
              _RuntimeSocialAction(
                label: '$commentCount',
                semanticLabel: '查看 ${playable.title} 的评论',
                icon: Icons.chat_bubble_outline_rounded,
                onTap: onComment,
              ),
              _RuntimeSocialAction(
                label: '${playable.saves + (saved ? 1 : 0)}',
                semanticLabel: saved
                    ? '取消收藏 ${playable.title}'
                    : '收藏 ${playable.title}',
                icon: saved
                    ? Icons.bookmark_rounded
                    : Icons.bookmark_border_rounded,
                onTap: onSave,
              ),
              _RuntimeSocialAction(
                label: shared ? '已分享' : '分享',
                semanticLabel: '分享 ${playable.title}',
                icon: Icons.ios_share_rounded,
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
                    side: const BorderSide(color: Colors.white30),
                    minimumSize: const Size(0, 32),
                    padding: const EdgeInsets.symmetric(horizontal: 10),
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
          Row(
            children: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  const CircleAvatar(
                    radius: 18,
                    backgroundColor: AirvanaColors.accent,
                    child: CircleAvatar(
                      radius: 16.5,
                      backgroundImage: AssetImage(
                        'assets/legacy/avatars/kai.png',
                      ),
                    ),
                  ),
                  if (playable.ownerHandle != '@kai.builds')
                    Positioned(
                      right: -5,
                      bottom: -4,
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
                                color: Colors.white,
                                size: 14,
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
                      key: ValueKey('runtime-author-${playable.id}'),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
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
            ],
          ),
          const SizedBox(height: 5),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                height: 42,
                padding: const EdgeInsets.symmetric(horizontal: 6),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(99),
                ),
                child: Row(
                  children: [
                    _RuntimeNavIcon(
                      label: '首页',
                      icon: Icons.home_rounded,
                      active: true,
                      onTap: () => context.go('/'),
                    ),
                    _RuntimeNavIcon(
                      label: '发现',
                      icon: Icons.explore_outlined,
                      onTap: () => context.go('/discover'),
                    ),
                    _RuntimeNavIcon(
                      label: '增长网络',
                      icon: Icons.public_rounded,
                      onTap: () => context.go('/world'),
                    ),
                    _RuntimeNavIcon(
                      label: '消息',
                      icon: Icons.chat_bubble_outline_rounded,
                      onTap: () => context.go('/messages'),
                    ),
                    _RuntimeNavIcon(
                      label: '我的',
                      icon: Icons.person_outline_rounded,
                      onTap: () => context.go('/profile'),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),
              Material(
                color: AirvanaColors.accent,
                shape: const CircleBorder(),
                child: InkWell(
                  onTap: () => context.push('/create'),
                  customBorder: const CircleBorder(),
                  child: Semantics(
                    button: true,
                    label: '创作游戏',
                    child: const SizedBox(
                      width: 42,
                      height: 42,
                      child: Icon(Icons.add_rounded, color: Colors.white),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _RuntimeSocialAction extends StatelessWidget {
  const _RuntimeSocialAction({
    required this.label,
    required this.semanticLabel,
    required this.icon,
    required this.onTap,
  });

  final String label;
  final String semanticLabel;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    excludeSemantics: true,
    label: semanticLabel,
    onTap: onTap,
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: ExcludeSemantics(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(2, 6, 7, 6),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, color: Colors.white, size: 18),
              const SizedBox(width: 3),
              Text(
                label,
                style: const TextStyle(color: Colors.white, fontSize: 10),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

class _RuntimeNavIcon extends StatelessWidget {
  const _RuntimeNavIcon({
    required this.label,
    required this.icon,
    required this.onTap,
    this.active = false,
  });

  final String label;
  final IconData icon;
  final VoidCallback onTap;
  final bool active;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    selected: active,
    label: label,
    child: InkResponse(
      onTap: onTap,
      radius: 21,
      child: SizedBox(
        width: 46,
        height: 40,
        child: Icon(
          icon,
          color: active ? AirvanaColors.accent : const Color(0xFFA4A4AC),
          size: 23,
        ),
      ),
    ),
  );
}
