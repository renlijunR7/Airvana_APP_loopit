import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

const _rose = Color(0xFFFFF0F2);
const _secondary = Color(0xFF66666F);

String _today(bool local) {
  final now = local ? DateTime.now() : DateTime.now().toUtc();
  return '${now.year}-${now.month.toString().padLeft(2, '0')}-'
      '${now.day.toString().padLeft(2, '0')}';
}

String _number(int value) => value.toString().replaceAllMapped(
  RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
  (match) => '${match[1]},',
);

/// Presentation only: balances and reward eligibility remain repository owned.
class RewardsPageBody extends ConsumerStatefulWidget {
  const RewardsPageBody({super.key, required this.onInvite});
  final VoidCallback onInvite;
  @override
  ConsumerState<RewardsPageBody> createState() => _RewardsPageBodyState();
}

class _RewardsPageBodyState extends ConsumerState<RewardsPageBody>
    with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) ref.invalidate(rewardStateProvider);
  }

  @override
  Widget build(BuildContext context) {
    final local = ref
        .watch(airvanaRepositoryProvider)
        .environment
        .preferLocalData;
    final reward = ref.watch(rewardStateProvider);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '每一次参与，\n都有新的收获。',
                    style: TextStyle(
                      fontSize: 28,
                      fontWeight: FontWeight.w800,
                      height: 1.3,
                      letterSpacing: -.8,
                    ),
                  ),
                  SizedBox(height: 10),
                  Text(
                    '发现灵感，积累你的 AIP。',
                    style: TextStyle(color: _secondary, fontSize: 13),
                  ),
                ],
              ),
            ),
            SizedBox(width: 12),
            _IconTile(icon: Icons.card_giftcard_rounded, size: 56),
          ],
        ),
        const SizedBox(height: 24),
        reward.when(
          skipLoadingOnRefresh: false,
          data: (state) => _BalanceCard(state: state, local: local),
          error: (_, __) => _ErrorPanel(
            message: '暂时无法读取奖励，请重试。',
            retryKey: const ValueKey('rewards-retry'),
            onRetry: () => ref.invalidate(rewardStateProvider),
          ),
          loading: () => const _LoadingPanel(),
        ),
        const SizedBox(height: 20),
        _Panel(
          key: const ValueKey('earn-tasks-list'),
          padding: EdgeInsets.zero,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 14, 12, 8),
                child: Row(
                  children: [
                    const Expanded(
                      child: Text(
                        '参与与奖励',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    IconButton(
                      tooltip: '刷新奖励',
                      onPressed: () => ref.invalidate(rewardStateProvider),
                      icon: const Icon(
                        Icons.refresh_rounded,
                        size: 20,
                        color: _secondary,
                      ),
                    ),
                  ],
                ),
              ),
              _TaskRow(
                key: const ValueKey('earn-task-check-in'),
                icon: Icons.event_available_outlined,
                title: '每日签到',
                value: reward.when(
                  data: (state) => state.isCheckedInOn(_today(local))
                      ? '今日已签到'
                      : local
                      ? '+${state.nextCheckInReward} AIP'
                      : '服务端核算',
                  error: (_, __) => '查看签到',
                  loading: () => '正在读取',
                ),
                description: local ? '每日领取一次 · 本机记录' : '每日领取一次 · UTC 日期',
                action: reward.value?.isCheckedInOn(_today(local)) == true
                    ? '查看'
                    : '签到',
                onTap: () => showDailyCheckInSheet(context),
              ),
              const _InsetDivider(),
              _TaskRow(
                key: const ValueKey('earn-task-create'),
                icon: Icons.auto_awesome_outlined,
                title: '创作 Agentic Playable',
                value: '把灵感变成互动',
                description: '前往创作空间，奖励以实际规则为准',
                action: '去创作',
                onTap: () => context.push('/create'),
              ),
              const _InsetDivider(),
              _TaskRow(
                key: const ValueKey('earn-task-invite'),
                icon: Icons.person_add_alt_1_outlined,
                title: '邀请好友',
                value: '一起发现新体验',
                description: '查看邀请演示与规则，不自动发放积分',
                action: '查看',
                onTap: widget.onInvite,
              ),
              const SizedBox(height: 4),
            ],
          ),
        ),
        const SizedBox(height: 18),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4),
          child: Text(
            'AIP 为站内积分，不可提现、转让或交易。${local ? '\n本机演示仅保存在当前设备，不代表服务端到账。' : '\n奖励以服务端记录及适用规则为准。'}',
            style: const TextStyle(
              color: _secondary,
              fontSize: 11,
              height: 1.65,
            ),
          ),
        ),
      ],
    );
  }
}

class _BalanceCard extends StatelessWidget {
  const _BalanceCard({required this.state, required this.local});
  final LocalRewardState state;
  final bool local;
  @override
  Widget build(BuildContext context) => Material(
    key: const ValueKey('rewards-balance-card'),
    color: AirvanaColors.surface,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
    clipBehavior: Clip.antiAlias,
    child: InkWell(
      onTap: () => context.push('/profile/secondary/wallet'),
      child: Padding(
        padding: const EdgeInsets.all(22),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    spacing: 10,
                    runSpacing: 8,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      const Text(
                        '我的 AIP',
                        style: TextStyle(color: _secondary, fontSize: 13),
                      ),
                      if (local) const _Badge('本机演示'),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    _number(state.aipBalance),
                    style: const TextStyle(
                      fontSize: 38,
                      height: 1.2,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -1.2,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    '查看积分与账本',
                    style: TextStyle(color: _secondary, fontSize: 12),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            const Icon(Icons.chevron_right_rounded, color: AirvanaColors.muted),
          ],
        ),
      ),
    ),
  );
}

class _TaskRow extends StatelessWidget {
  const _TaskRow({
    super.key,
    required this.icon,
    required this.title,
    required this.value,
    required this.description,
    required this.action,
    required this.onTap,
  });
  final IconData icon;
  final String title, value, description, action;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    child: Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: AirvanaColors.accent, size: 21),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  value,
                  style: const TextStyle(
                    color: AirvanaColors.accent,
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    height: 1.35,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          LayoutBuilder(
            builder: (context, constraints) {
              final stacked =
                  constraints.maxWidth < 300 &&
                  MediaQuery.textScalerOf(context).scale(14) > 18;
              final label = Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 15,
                      height: 1.4,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    description,
                    style: const TextStyle(
                      color: _secondary,
                      fontSize: 11,
                      height: 1.55,
                    ),
                  ),
                ],
              );
              final button = FilledButton(
                onPressed: onTap,
                style: AirvanaButtonStyles.primary(
                  minimumSize: const Size(76, 44),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 17,
                    vertical: 10,
                  ),
                ),
                child: Text(action),
              );
              return stacked
                  ? Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [label, const SizedBox(height: 12), button],
                    )
                  : Row(
                      children: [
                        Expanded(child: label),
                        const SizedBox(width: 12),
                        button,
                      ],
                    );
            },
          ),
        ],
      ),
    ),
  );
}

Future<void> showDailyCheckInSheet(BuildContext context) async {
  final container = ProviderScope.containerOf(context, listen: false);
  container.invalidate(rewardStateProvider);
  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: AirvanaColors.canvas,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
    ),
    clipBehavior: Clip.antiAlias,
    builder: (_) => const _DailyCheckInSheet(),
  );
}

class _DailyCheckInSheet extends ConsumerStatefulWidget {
  const _DailyCheckInSheet();
  @override
  ConsumerState<_DailyCheckInSheet> createState() => _DailyCheckInSheetState();
}

class _DailyCheckInSheetState extends ConsumerState<_DailyCheckInSheet>
    with WidgetsBindingObserver {
  final _scroll = ScrollController();
  bool _claiming = false;
  String? _error;
  LocalRewardState? _claimedState;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _scroll.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && !_claiming) {
      setState(() => _claimedState = null);
      ref.invalidate(rewardStateProvider);
    }
  }

  Future<void> _claim() async {
    if (_claiming) return;
    final repository = ref.read(airvanaRepositoryProvider);
    final state = _claimedState ?? ref.read(rewardStateProvider).value;
    if (state == null ||
        state.isCheckedInOn(_today(repository.environment.preferLocalData))) {
      return;
    }
    // Reuse the existing check-in adapter on a user tap. Capture dependencies
    // now because the user may dismiss the sheet while the request finishes.
    final container = ProviderScope.containerOf(context, listen: false);
    setState(() {
      _claiming = true;
      _error = null;
    });
    try {
      final result = await repository.checkInDaily();
      container.invalidate(rewardStateProvider);
      container.invalidate(walletTxnsProvider);
      container.invalidate(accountProvider);
      container.invalidate(homeProvider);
      if (!mounted) return;
      setState(() => _claimedState = result.state);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            result.idempotent ? '今日已签到，无需重复领取' : '签到成功 +${result.earned} AIP',
          ),
        ),
      );
    } catch (_) {
      if (mounted) setState(() => _error = '签到暂未完成，请重试。若已到账，重复提交不会再次领取。');
    } finally {
      if (mounted) setState(() => _claiming = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final local = ref
        .watch(airvanaRepositoryProvider)
        .environment
        .preferLocalData;
    final reward = ref.watch(rewardStateProvider);
    return ConstrainedBox(
      key: const ValueKey('earn-task-check-in-sheet'),
      constraints: BoxConstraints(
        maxHeight: MediaQuery.sizeOf(context).height * .9,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 16, 12, 4),
            child: Row(
              children: [
                const Expanded(
                  child: Text(
                    '每日签到',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
                  ),
                ),
                IconButton(
                  tooltip: '关闭签到',
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close_rounded, size: 22),
                ),
              ],
            ),
          ),
          Flexible(
            child: SingleChildScrollView(
              key: const ValueKey('earn-task-check-in-scroll'),
              controller: _scroll,
              padding: EdgeInsets.fromLTRB(
                20,
                8,
                20,
                24 + MediaQuery.paddingOf(context).bottom,
              ),
              child: _claimedState != null
                  ? _content(_claimedState!, local)
                  : reward.when(
                      skipLoadingOnRefresh: false,
                      data: (state) => _content(state, local),
                      error: (_, __) => _ErrorPanel(
                        message: '签到状态暂时无法读取。',
                        retryKey: const ValueKey('check-in-retry'),
                        onRetry: () => ref.invalidate(rewardStateProvider),
                      ),
                      loading: () => const _LoadingPanel(),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _content(LocalRewardState state, bool local) {
    final checked = state.isCheckedInOn(_today(local));
    final currentDay = (checked ? state.checkInStreak : state.checkInStreak + 1)
        .clamp(1, 7);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Center(
          child: _IconTile(icon: Icons.event_available_outlined, size: 64),
        ),
        const SizedBox(height: 16),
        Text(
          checked ? '今天的收获，已记录。' : '每天见面，积累一点。',
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontSize: 24,
            fontWeight: FontWeight.w800,
            height: 1.35,
            letterSpacing: -.5,
          ),
        ),
        const SizedBox(height: 10),
        Text(
          local
              ? '累计签到 ${state.checkInStreak} 天 · 本机演示\n每日领取一次，奖励按现有签到规则计算。'
              : '每日领取一次，以 UTC 日期更新。\n奖励金额与签到日次以服务端核算为准。',
          textAlign: TextAlign.center,
          style: const TextStyle(color: _secondary, fontSize: 12, height: 1.6),
        ),
        const SizedBox(height: 24),
        Column(
          key: const ValueKey('check-in-days'),
          children: [
            _dayRow([1, 2, 3, 4], state, local, checked, currentDay),
            const SizedBox(height: 10),
            _dayRow([5, 6, 7], state, local, checked, currentDay),
          ],
        ),
        const SizedBox(height: 14),
        Text(
          local ? 'AIP 仅用于站内体验，不可提现、转让或交易。' : '上方为签到日次示意，并非已领取记录。',
          style: const TextStyle(color: _secondary, fontSize: 11, height: 1.55),
          textAlign: TextAlign.center,
        ),
        if (_error != null) ...[
          const SizedBox(height: 16),
          Container(
            key: const ValueKey('check-in-error'),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: _rose,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Text(
              _error!,
              style: const TextStyle(color: AirvanaColors.ink, height: 1.6),
            ),
          ),
        ],
        const SizedBox(height: 24),
        FilledButton(
          key: const ValueKey('daily-check-in'),
          style: AirvanaButtonStyles.primary(
            minimumSize: const Size.fromHeight(52),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          ),
          onPressed: checked || _claiming ? null : _claim,
          child: _claiming
              ? const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SizedBox.square(
                      dimension: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    ),
                    SizedBox(width: 10),
                    Flexible(child: Text('正在签到')),
                  ],
                )
              : Text(
                  checked
                      ? '今日已签到'
                      : local
                      ? '签到领 ${state.nextCheckInReward} AIP'
                      : '立即签到',
                  textAlign: TextAlign.center,
                ),
        ),
      ],
    );
  }

  Widget _dayRow(
    List<int> days,
    LocalRewardState state,
    bool local,
    bool checked,
    int currentDay,
  ) => LayoutBuilder(
    builder: (context, constraints) {
      final cellWidth = (constraints.maxWidth - 30) / 4;
      return IntrinsicHeight(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (var i = 0; i < days.length; i++) ...[
              if (i > 0) const SizedBox(width: 10),
              SizedBox(
                width: days[i] == 7 ? cellWidth * 2 + 10 : cellWidth,
                child: _DayCard(
                  day: days[i],
                  local: local,
                  active: local && days[i] == currentDay,
                  complete:
                      local &&
                      days[i] <= state.checkInStreak &&
                      (days[i] < 7 || checked),
                ),
              ),
            ],
          ],
        ),
      );
    },
  );
}

class _DayCard extends StatelessWidget {
  const _DayCard({
    required this.day,
    required this.local,
    required this.active,
    required this.complete,
  });
  final int day;
  final bool local, active, complete;
  @override
  Widget build(BuildContext context) {
    final foreground = active ? Colors.white : AirvanaColors.ink;
    // Reuse the existing model's schedule, never duplicate the reward formula.
    final previewReward = LocalRewardState(
      checkInStreak: day - 1,
    ).nextCheckInReward;
    return Container(
      key: ValueKey('check-in-day-$day'),
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 14),
      decoration: BoxDecoration(
        color: active
            ? AirvanaColors.accent
            : complete
            ? const Color(0xFFE9E9EF)
            : Colors.white,
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            day == 7 ? '第 7 天起' : '第 $day 天',
            textAlign: TextAlign.center,
            style: TextStyle(
              color: foreground,
              fontWeight: FontWeight.w600,
              fontSize: 11,
              height: 1.35,
            ),
          ),
          const SizedBox(height: 14),
          Icon(
            complete
                ? Icons.check_circle_outline_rounded
                : Icons.stars_outlined,
            color: active ? Colors.white : AirvanaColors.accent,
            size: 23,
          ),
          const SizedBox(height: 8),
          if (local) ...[
            Text(
              '+$previewReward',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: foreground,
                fontWeight: FontWeight.w800,
                fontSize: 20,
                height: 1.2,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              complete ? '已领取' : 'AIP',
              style: TextStyle(
                color: active ? Colors.white : _secondary,
                fontSize: 10,
              ),
            ),
          ] else
            const Text(
              'AIP',
              style: TextStyle(color: _secondary, fontSize: 12),
            ),
        ],
      ),
    );
  }
}

class _Panel extends StatelessWidget {
  const _Panel({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(20),
  });
  final Widget child;
  final EdgeInsetsGeometry padding;
  @override
  Widget build(BuildContext context) => Container(
    padding: padding,
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(24),
      border: Border.all(color: AirvanaColors.line.withValues(alpha: .65)),
    ),
    clipBehavior: Clip.antiAlias,
    child: child,
  );
}

class _IconTile extends StatelessWidget {
  const _IconTile({required this.icon, required this.size});
  final IconData icon;
  final double size;
  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(
      color: _rose,
      borderRadius: BorderRadius.circular(size * .32),
    ),
    child: Icon(icon, size: size * .48, color: AirvanaColors.accent),
  );
}

class _Badge extends StatelessWidget {
  const _Badge(this.label);
  final String label;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
    decoration: BoxDecoration(
      color: _rose,
      borderRadius: BorderRadius.circular(99),
    ),
    child: Text(
      label,
      style: const TextStyle(
        color: AirvanaColors.accent,
        fontSize: 10,
        fontWeight: FontWeight.w700,
      ),
    ),
  );
}

class _InsetDivider extends StatelessWidget {
  const _InsetDivider();
  @override
  Widget build(BuildContext context) => const Padding(
    padding: EdgeInsets.symmetric(horizontal: 20),
    child: Divider(height: 1, thickness: 1, color: AirvanaColors.line),
  );
}

class _LoadingPanel extends StatelessWidget {
  const _LoadingPanel();
  @override
  Widget build(BuildContext context) => const _Panel(
    child: Padding(
      padding: EdgeInsets.all(18),
      child: Center(
        child: CircularProgressIndicator(
          strokeWidth: 2,
          semanticsLabel: '正在读取奖励',
        ),
      ),
    ),
  );
}

class _ErrorPanel extends StatelessWidget {
  const _ErrorPanel({
    required this.message,
    required this.retryKey,
    required this.onRetry,
  });
  final String message;
  final Key retryKey;
  final VoidCallback onRetry;
  @override
  Widget build(BuildContext context) => _Panel(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(message, style: const TextStyle(color: _secondary, height: 1.6)),
        const SizedBox(height: 12),
        OutlinedButton(
          key: retryKey,
          onPressed: onRetry,
          child: const Text('重新加载'),
        ),
      ],
    ),
  );
}
