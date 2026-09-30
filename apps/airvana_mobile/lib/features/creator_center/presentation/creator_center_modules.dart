import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/account/domain/platform_service_models.dart';
import 'package:airvana_mobile/features/creator_center/domain/creator_center_snapshot.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// 创作者中心的五个聚合模块：创作周报 / 成长计划奖励任务 / 创作灵感挑战 /
/// 创作激励 / 创作学院。
///
/// 全部由服务端真实对象驱动；服务端未接入时显示「未接入」占位，绝不编数字。
class CreatorPanel extends StatelessWidget {
  const CreatorPanel({required this.child, super.key});

  final Widget child;

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: AirvanaColors.line),
    ),
    child: child,
  );
}

class _Heading extends StatelessWidget {
  const _Heading(this.title, {required this.meta});

  final String title;
  final String meta;

  @override
  Widget build(BuildContext context) => Row(
    crossAxisAlignment: CrossAxisAlignment.end,
    children: [
      Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 3),
            Text(
              meta,
              style: const TextStyle(fontSize: 9, color: AirvanaColors.muted),
            ),
          ],
        ),
      ),
    ],
  );
}

/// 服务端未接入时的本地演示占位数据。
///
/// 这些值只是占位：数字与 Web 版本用的同一批演示值保持一致，绝不代表真实
/// 账本、真实 Campaign 或可结算金额。服务端接上后会被真实对象整体替换。
class CreatorDemoSeeds {
  const CreatorDemoSeeds._();

  static const metaLabel = '本地演示 · 服务端接入后替换';

  static const note = '以上为本地演示占位值，不代表真实账本、真实 Campaign 或可结算金额。';

  static CreatorWeeklyReport weekly(DateTime now) {
    final end = DateTime(now.year, now.month, now.day);
    return CreatorWeeklyReport(
      periodStart: end.subtract(const Duration(days: 6)),
      periodEnd: end,
      publishedThisWeek: 1,
      aipEarnedThisWeek: 120,
      // 与「我的」页的 892 获赞、发布作品 2 保持同一套演示值。
      totalPublished: 2,
      totalLikes: 892,
      activeTasks: 0,
      pendingDeliverables: 1,
    );
  }

  /// 金额取自经济规则本身：完成 5、签到阶梯、首次发布 50。
  static List<CreatorIncentive> incentives(DateTime now) => [
    CreatorIncentive(
      kind: 'playable_complete',
      id: 'demo-complete',
      title: '有效完成奖励 · Crypto City 安全挑战',
      amountAip: 5,
      occurredAt: now.subtract(const Duration(hours: 3)),
    ),
    CreatorIncentive(
      kind: 'daily_login',
      id: 'demo-checkin',
      title: '每日签到 · 连签第 5 天',
      amountAip: 60,
      occurredAt: now.subtract(const Duration(days: 1)),
    ),
    CreatorIncentive(
      kind: 'first_publish',
      id: 'demo-first-publish',
      title: '首次发布 Agentic Playable',
      amountAip: 50,
      occurredAt: now.subtract(const Duration(days: 4)),
    ),
  ];

  /// 逐条搬自 Web 的 creatorOpportunitySeeds。
  static const challenges = <CreatorChallenge>[
    CreatorChallenge(
      campaignId: 'crypto-safety-campaign',
      title: 'Crypto City 安全教育 Campaign',
      objective: '为钱包新用户制作可复用的安全选择 Agentic Playable。',
      brandName: 'Airvana Campaign 示例',
      rewardAit: 0,
      budgetRemaining: 0,
      endsAt: null,
      participantStatus: null,
    ),
    CreatorChallenge(
      campaignId: 'star-farm-invite',
      title: '星际农场 Community Launch 共创',
      objective: '通过社区任务与分支反馈完成首轮参与引导。',
      brandName: '品牌邀请 · 本地演示',
      rewardAit: 0,
      budgetRemaining: 0,
      endsAt: null,
      participantStatus: 'invited',
    ),
    CreatorChallenge(
      campaignId: 'playable-v2-delivery',
      title: 'Playable v2 安全挑战交付',
      objective: '提交已批准版本、KOL 链接与交付证据，等待品牌审核。',
      brandName: 'Campaign 交付中心',
      rewardAit: 0,
      budgetRemaining: 0,
      endsAt: null,
      participantStatus: 'in_progress',
    ),
    CreatorChallenge(
      campaignId: 'kyc-gated-opportunity',
      title: '全球创作者产品教育计划',
      objective: '为不同地区的新用户制作本地化产品教育互动。',
      brandName: '平台示例机会',
      rewardAit: 0,
      budgetRemaining: 0,
      endsAt: null,
      participantStatus: null,
    ),
  ];
}

/// 演示占位的统一脚注。
class _DemoNote extends StatelessWidget {
  const _DemoNote();

  @override
  Widget build(BuildContext context) => const Padding(
    padding: EdgeInsets.only(top: 10),
    child: Text(
      CreatorDemoSeeds.note,
      style: TextStyle(fontSize: 9, color: AirvanaColors.muted, height: 1.7),
    ),
  );
}

/// 服务端未接入时的统一占位：说明原因，不给任何数字。
class _NotConnected extends StatelessWidget {
  const _NotConnected({required this.what});

  final String what;

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 14),
    decoration: BoxDecoration(
      color: const Color(0xFFF7F7FA),
      borderRadius: BorderRadius.circular(14),
    ),
    child: Text(
      '$what需要服务端数据，当前未接入。\n此处不展示本地估算值。',
      textAlign: TextAlign.center,
      style: const TextStyle(
        fontSize: 10,
        color: AirvanaColors.muted,
        height: 1.7,
      ),
    ),
  );
}

class _EmptyLine extends StatelessWidget {
  const _EmptyLine(this.text);

  final String text;

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.symmetric(vertical: 22),
    decoration: BoxDecoration(
      color: const Color(0xFFF7F7FA),
      borderRadius: BorderRadius.circular(14),
    ),
    alignment: Alignment.center,
    child: Text(
      text,
      style: const TextStyle(fontSize: 11, color: AirvanaColors.muted),
    ),
  );
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value, this.accent = false});

  final String label;
  final String value;
  final bool accent;

  @override
  Widget build(BuildContext context) => Expanded(
    child: Column(
      children: [
        Text(
          value,
          style: TextStyle(
            fontSize: 21,
            fontWeight: FontWeight.w900,
            color: accent ? AirvanaColors.accent : AirvanaColors.ink,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: const TextStyle(fontSize: 9, color: AirvanaColors.muted),
        ),
      ],
    ),
  );
}

String _fmtDay(DateTime value) {
  final local = value.toLocal();
  return '${local.year}-${local.month.toString().padLeft(2, '0')}-${local.day.toString().padLeft(2, '0')}';
}

// ===== 1. 创作周报 =====

class CreatorWeeklyReportCard extends StatelessWidget {
  const CreatorWeeklyReportCard({required this.snapshot, super.key});

  final CreatorCenterSnapshot snapshot;

  @override
  Widget build(BuildContext context) {
    // 服务端未接入时用本地演示占位，而不是一块空白说明。
    final serverWeekly = snapshot.weekly;
    final demo = serverWeekly == null;
    final weekly = serverWeekly ?? CreatorDemoSeeds.weekly(DateTime.now());
    return CreatorPanel(
      key: const ValueKey('creator-weekly-report'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _Heading(
            '创作周报',
            meta: demo
                ? '${_fmtDay(weekly.periodStart)} 至 ${_fmtDay(weekly.periodEnd)} · '
                      '${CreatorDemoSeeds.metaLabel}'
                : '${_fmtDay(weekly.periodStart)} 至 ${_fmtDay(weekly.periodEnd)} · 服务端账本',
          ),
          const SizedBox(height: 14),
          ...[
            Row(
              children: [
                _Stat(
                  label: '本周发布',
                  value: '${weekly.publishedThisWeek}',
                  accent: weekly.publishedThisWeek > 0,
                ),
                _Stat(
                  label: '本周获得 AIP',
                  value: '${weekly.aipEarnedThisWeek}',
                  accent: weekly.aipEarnedThisWeek > 0,
                ),
                _Stat(label: '累计获赞', value: '${weekly.totalLikes}'),
              ],
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF7F7FA),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Column(
                children: [
                  _ReportRow(
                    label: '累计已发布作品',
                    value: '${weekly.totalPublished}',
                  ),
                  const SizedBox(height: 8),
                  _ReportRow(label: '进行中的生成任务', value: '${weekly.activeTasks}'),
                  const SizedBox(height: 8),
                  _ReportRow(
                    label: '待品牌审批的交付',
                    value: '${weekly.pendingDeliverables}',
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),
            if (demo)
              const _DemoNote()
            else
              Text(
                '${unavailableWeeklyDeltas.join(' / ')}需要历史快照才能计算，服务端目前只存总量，因此不在此处给出增量数字。',
                style: const TextStyle(
                  fontSize: 9,
                  color: AirvanaColors.muted,
                  height: 1.7,
                ),
              ),
          ],
        ],
      ),
    );
  }
}

class _ReportRow extends StatelessWidget {
  const _ReportRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Row(
    children: [
      Expanded(
        child: Text(
          label,
          style: const TextStyle(fontSize: 11, color: AirvanaColors.muted),
        ),
      ),
      Text(
        value,
        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900),
      ),
    ],
  );
}

// ===== 2. 成长计划奖励任务 =====

class CreatorGrowthTasksCard extends StatelessWidget {
  const CreatorGrowthTasksCard({required this.snapshot, super.key});

  final CreatorCenterSnapshot snapshot;

  @override
  Widget build(BuildContext context) {
    final tasks = snapshot.tasks;
    final doneCount = tasks.where((task) => task.done).length;
    return CreatorPanel(
      key: const ValueKey('creator-growth-tasks'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _Heading(
            '成长计划奖励任务',
            meta: snapshot.serverConnected
                ? '进度由服务端真实对象判定 · $doneCount/${tasks.length}'
                : '服务端未接入',
          ),
          const SizedBox(height: 14),
          if (!snapshot.serverConnected)
            const _NotConnected(what: '成长任务进度')
          else ...[
            for (final task in tasks) ...[
              _GrowthTaskRow(task: task),
              if (task != tasks.last) const SizedBox(height: 10),
            ],
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF8F8),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFFFD6DA)),
              ),
              child: const Text(
                '完成任务解锁的是运营能力与资格，不自动发放 AIP。平台规则奖励必须由服务端白名单规则携带幂等键与证据发放，前端不记账、不承诺收益。',
                style: TextStyle(
                  fontSize: 9,
                  color: Color(0xFF8B2733),
                  height: 1.7,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _GrowthTaskRow extends StatelessWidget {
  const _GrowthTaskRow({required this.task});

  final CreatorGrowthTask task;

  @override
  Widget build(BuildContext context) => Row(
    key: ValueKey('creator-growth-task-${task.id}'),
    children: [
      Container(
        width: 18,
        height: 18,
        decoration: BoxDecoration(
          color: task.done ? AirvanaColors.success : const Color(0xFFF1F1F6),
          borderRadius: BorderRadius.circular(6),
        ),
        alignment: Alignment.center,
        child: task.done
            ? const Icon(Icons.check_rounded, size: 12, color: Colors.white)
            : null,
      ),
      const SizedBox(width: 10),
      Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              task.label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w800,
                color: task.done ? AirvanaColors.muted : AirvanaColors.ink,
                decoration: task.done ? TextDecoration.lineThrough : null,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              '依据：${task.evidence}',
              style: const TextStyle(fontSize: 9, color: AirvanaColors.muted),
            ),
          ],
        ),
      ),
      Text(
        '${task.current}/${task.target}',
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w900,
          color: task.done ? AirvanaColors.success : AirvanaColors.muted,
        ),
      ),
    ],
  );
}

// ===== 3. 创作灵感挑战 =====

class CreatorChallengesCard extends ConsumerStatefulWidget {
  const CreatorChallengesCard({required this.snapshot, super.key});

  final CreatorCenterSnapshot snapshot;

  @override
  ConsumerState<CreatorChallengesCard> createState() =>
      _CreatorChallengesCardState();
}

class _CreatorChallengesCardState extends ConsumerState<CreatorChallengesCard> {
  String? _applying;

  Future<void> _apply(CreatorChallenge challenge) async {
    // 演示占位的挑战没有对应的服务端 Campaign，不去发一个注定失败的请求。
    if (!widget.snapshot.serverConnected) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('演示占位：真实报名需要服务端 Campaign 接入')),
      );
      return;
    }
    setState(() => _applying = challenge.campaignId);
    final messenger = ScaffoldMessenger.of(context);
    try {
      await ref
          .read(airvanaRepositoryProvider)
          .applyToCampaign(challenge.campaignId);
      ref.invalidate(creatorCenterProvider);
      messenger.showSnackBar(
        SnackBar(content: Text('已向「${challenge.title}」提交报名，等待品牌审批')),
      );
    } catch (error) {
      messenger.showSnackBar(SnackBar(content: Text('报名未成功：$error')));
    } finally {
      if (mounted) setState(() => _applying = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final demo = !widget.snapshot.serverConnected;
    final challenges = demo
        ? CreatorDemoSeeds.challenges
        : widget.snapshot.challenges;
    return CreatorPanel(
      key: const ValueKey('creator-challenges'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _Heading(
            '创作灵感挑战',
            meta: widget.snapshot.serverConnected
                ? '平台进行中的真实 Campaign · 奖励与预算为 Contract 锁定值'
                : CreatorDemoSeeds.metaLabel,
          ),
          const SizedBox(height: 14),
          if (challenges.isEmpty)
            const _EmptyLine('当前没有进行中的 Campaign')
          else
            for (var index = 0; index < challenges.length; index += 1) ...[
              _ChallengeRow(
                rank: index + 1,
                challenge: challenges[index],
                busy: _applying == challenges[index].campaignId,
                onApply: () => _apply(challenges[index]),
              ),
              if (index != challenges.length - 1) const SizedBox(height: 12),
            ],
          if (demo) const _DemoNote(),
        ],
      ),
    );
  }
}

class _ChallengeRow extends StatelessWidget {
  const _ChallengeRow({
    required this.rank,
    required this.challenge,
    required this.busy,
    required this.onApply,
  });

  final int rank;
  final CreatorChallenge challenge;
  final bool busy;
  final VoidCallback onApply;

  @override
  Widget build(BuildContext context) {
    final days = challenge.daysLeft(DateTime.now().toUtc());
    final meta = <String>[
      if (challenge.brandName.isNotEmpty) challenge.brandName,
      '单条奖励 ${challenge.rewardAit} AIT',
      '剩余预算 ${challenge.budgetRemaining} AIT',
      if (days != null) days >= 0 ? '剩余 $days 天' : '已过期',
    ].join(' · ');
    return Row(
      key: ValueKey('creator-challenge-${challenge.campaignId}'),
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        SizedBox(
          width: 20,
          child: Text(
            '$rank',
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w900,
              color: AirvanaColors.muted,
            ),
          ),
        ),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                challenge.title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                meta,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 9,
                  color: AirvanaColors.muted,
                  height: 1.5,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 10),
        _ChallengeAction(challenge: challenge, busy: busy, onApply: onApply),
      ],
    );
  }
}

class _ChallengeAction extends StatelessWidget {
  const _ChallengeAction({
    required this.challenge,
    required this.busy,
    required this.onApply,
  });

  final CreatorChallenge challenge;
  final bool busy;
  final VoidCallback onApply;

  static const _statusLabels = {
    'eligible': '已获资格',
    'pending_application': '审核中',
    'invited': '待接受',
    'rejected': '未通过',
  };

  @override
  Widget build(BuildContext context) {
    if (challenge.joined) {
      final label =
          _statusLabels[challenge.participantStatus] ??
          challenge.participantStatus!;
      return Container(
        key: ValueKey('creator-challenge-status-${challenge.campaignId}'),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: const Color(0xFFF1F1F6),
          borderRadius: BorderRadius.circular(999),
        ),
        child: Text(
          label,
          style: const TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w900,
            color: Color(0xFF636366),
          ),
        ),
      );
    }
    return SizedBox(
      height: 30,
      child: FilledButton(
        key: ValueKey('creator-challenge-apply-${challenge.campaignId}'),
        onPressed: busy ? null : onApply,
        style: FilledButton.styleFrom(
          padding: const EdgeInsets.symmetric(horizontal: 14),
          textStyle: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900),
        ),
        child: Text(busy ? '提交中' : '去参与'),
      ),
    );
  }
}

// ===== 4. 创作激励 =====

class CreatorIncentiveCard extends StatelessWidget {
  const CreatorIncentiveCard({required this.snapshot, super.key});

  final CreatorCenterSnapshot snapshot;

  @override
  Widget build(BuildContext context) {
    final demo = !snapshot.serverConnected;
    final incentives = demo
        ? CreatorDemoSeeds.incentives(DateTime.now())
        : snapshot.incentives;
    return CreatorPanel(
      key: const ValueKey('creator-incentives'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _Heading(
            '创作激励',
            meta: snapshot.serverConnected
                ? '服务端 AIP 账本与生效中的发现加权'
                : CreatorDemoSeeds.metaLabel,
          ),
          const SizedBox(height: 14),
          if (incentives.isEmpty)
            const _EmptyLine('暂无激励记录')
          else
            for (final item in incentives) ...[
              _IncentiveRow(item: item),
              if (item != incentives.last) const SizedBox(height: 9),
            ],
          if (snapshot.serverConnected) ...[
            const SizedBox(height: 12),
            _BoostAction(works: snapshot.publishedWorks),
          ] else
            const _DemoNote(),
        ],
      ),
    );
  }
}

/// 用 AIP 兑换 24 小时发现加权。
///
/// 只列出服务端真实已发布的作品；已在加权中的不再重复提供入口。
class _BoostAction extends ConsumerStatefulWidget {
  const _BoostAction({required this.works});

  final List<PublishedWork> works;

  @override
  ConsumerState<_BoostAction> createState() => _BoostActionState();
}

class _BoostActionState extends ConsumerState<_BoostAction> {
  bool _busy = false;

  Future<void> _boost(PublishedWork work) async {
    setState(() => _busy = true);
    final messenger = ScaffoldMessenger.of(context);
    try {
      final result = await ref
          .read(airvanaRepositoryProvider)
          .boostContent(work.contentId);
      ref.invalidate(creatorCenterProvider);
      ref.invalidate(accountProvider);
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            result.idempotent
                ? '「${work.title}」已在加权中，本次未重复扣费；余额 ${result.remainingAip} AIP'
                : '已扣 ${BoostResult.costAip} AIP，「${work.title}」进入 24 小时发现加权；'
                      '余额 ${result.remainingAip} AIP',
          ),
        ),
      );
    } catch (error) {
      // 扣费类动作失败必须明确报错，不能让用户以为已生效
      messenger.showSnackBar(SnackBar(content: Text('推广未生效：$error')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _pick() async {
    final candidates = widget.works
        .where((work) => !work.boosted)
        .toList(growable: false);
    final chosen = await showModalBottomSheet<PublishedWork>(
      context: context,
      showDragHandle: true,
      builder: (sheetContext) => SafeArea(
        child: Column(
          key: const ValueKey('boost-picker'),
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 0, 20, 10),
              child: Text(
                '选择要推广的作品（消耗 20 AIP，加权 24 小时）',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900),
              ),
            ),
            for (final work in candidates)
              ListTile(
                key: ValueKey('boost-pick-${work.contentId}'),
                dense: true,
                title: Text(work.title, style: const TextStyle(fontSize: 13)),
                onTap: () => Navigator.pop(sheetContext, work),
              ),
          ],
        ),
      ),
    );
    if (chosen != null) await _boost(chosen);
  }

  @override
  Widget build(BuildContext context) {
    final available = widget.works.where((work) => !work.boosted).length;
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton(
        key: const ValueKey('creator-boost-button'),
        onPressed: available == 0 || _busy ? null : _pick,
        child: Text(
          _busy
              ? '处理中…'
              : available == 0
              ? '没有可推广的已发布作品'
              : '用 20 AIP 推广作品（$available 个可选）',
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900),
        ),
      ),
    );
  }
}

class _IncentiveRow extends StatelessWidget {
  const _IncentiveRow({required this.item});

  final CreatorIncentive item;

  @override
  Widget build(BuildContext context) {
    final boost = item.kind == 'boost';
    final at = item.occurredAt;
    return Row(
      key: ValueKey('creator-incentive-${item.id}'),
      children: [
        Icon(
          boost ? Icons.trending_up_rounded : Icons.card_giftcard_rounded,
          size: 16,
          color: boost ? const Color(0xFF8B5B00) : AirvanaColors.success,
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                item.title,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                ),
              ),
              if (at != null) ...[
                const SizedBox(height: 2),
                Text(
                  _fmtDay(at),
                  style: const TextStyle(
                    fontSize: 9,
                    color: AirvanaColors.muted,
                  ),
                ),
              ],
            ],
          ),
        ),
        Text(
          '${item.amountAip > 0 ? '+' : ''}${item.amountAip} AIP',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w900,
            color: item.amountAip >= 0
                ? AirvanaColors.success
                : const Color(0xFF8B5B00),
          ),
        ),
      ],
    );
  }
}

// ===== 5. 创作学院 =====

/// 学院没有课程后端。这里只指向应用内真实存在的规则与流程页面，
/// 不虚构课程目录、播放进度或结业证书。
class CreatorAcademyCard extends StatelessWidget {
  const CreatorAcademyCard({required this.onOpen, super.key});

  final void Function(String destination) onOpen;

  static const entries = <(String, String, String, IconData)>[
    (
      'publishingGovernance',
      '发布与治理规则',
      '审核门禁、举报处理、申诉与恢复的实际口径',
      Icons.gavel_rounded,
    ),
    (
      'brandPartnership',
      'Campaign 与锁定字段',
      '预算、奖励、地区、CTA、归因与结算为何不可改',
      Icons.workspace_premium_outlined,
    ),
    (
      'creatorBenefits',
      'AIP 与权益边界',
      'AIP 不可提现转让、AIT 无全局兑换率的实际含义',
      Icons.account_balance_wallet_outlined,
    ),
  ];

  @override
  Widget build(BuildContext context) => CreatorPanel(
    key: const ValueKey('creator-academy'),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _Heading('创作学院', meta: '指向应用内真实规则页面，暂无视频课程'),
        const SizedBox(height: 14),
        for (final (destination, title, desc, icon) in entries) ...[
          InkWell(
            key: ValueKey('creator-academy-$destination'),
            onTap: () => onOpen(destination),
            borderRadius: BorderRadius.circular(12),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Row(
                children: [
                  Icon(icon, size: 18, color: AirvanaColors.accent),
                  const SizedBox(width: 11),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          desc,
                          style: const TextStyle(
                            fontSize: 9,
                            color: AirvanaColors.muted,
                            height: 1.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Icon(
                    Icons.chevron_right_rounded,
                    size: 18,
                    color: AirvanaColors.muted,
                  ),
                ],
              ),
            ),
          ),
          if (destination != entries.last.$1)
            const Divider(height: 1, color: AirvanaColors.line),
        ],
      ],
    ),
  );
}
