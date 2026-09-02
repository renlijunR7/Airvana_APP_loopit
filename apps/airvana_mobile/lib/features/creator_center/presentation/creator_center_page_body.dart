import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_models.dart';
import 'package:airvana_mobile/design_system/airvana_shared_cards.dart';
import 'package:airvana_mobile/features/history/presentation/experience_history_screen.dart'
    show profileLocalWorkspaceProvider;
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// 旧版 Web「创作者中心」（screen: quests）的 Flutter 复刻。
/// 三个分栏：运营数据 / 运营建议 / 增长体系。
/// 口径：演示值与服务端确认值分开标注；收益永不在前端估算。
class CreatorCenterPageBody extends ConsumerStatefulWidget {
  const CreatorCenterPageBody({super.key});

  @override
  ConsumerState<CreatorCenterPageBody> createState() =>
      _CreatorCenterPageBodyState();
}

class _CreatorCenterPageBodyState extends ConsumerState<CreatorCenterPageBody> {
  String _tab = 'operations';
  String _period = '7d';
  final Set<String> _appliedOpportunities = {};

  static const _periods = [('7d', '近 7 天'), ('30d', '近 30 天'), ('90d', '近 90 天')];

  @override
  Widget build(BuildContext context) {
    // 门禁：创作者中心需要创作者身份与 KYC 双通过（对齐 Web requireCreatorAction）。
    final identity =
        ref.watch(identityStateProvider).value ?? const LocalIdentityState();
    if (!identity.creatorEntitled) {
      return ListView(
        key: const ValueKey('creator-center-gate'),
        padding: const EdgeInsets.fromLTRB(20, 40, 20, 30),
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: AirvanaColors.line),
            ),
            child: Column(
              children: [
                Container(
                  width: 54,
                  height: 54,
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF1F2),
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: const Icon(
                    Icons.verified_user_outlined,
                    color: AirvanaColors.accent,
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  '请先完成创作者身份开通',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 8),
                const Text(
                  '创作者中心需要创作者身份与 KYC 演示验证双通过。真实资格、权限和收益仍以平台服务端审核为准。',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 11,
                    color: AirvanaColors.muted,
                    height: 1.6,
                  ),
                ),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    key: const ValueKey('creator-gate-activate'),
                    onPressed: () async {
                      await ref
                          .read(airvanaRepositoryProvider)
                          .saveIdentityState(
                            const LocalIdentityState(
                              creatorStatus: 'active_demo',
                              kycStatus: 'verified_demo',
                            ),
                          );
                      ref.invalidate(identityStateProvider);
                      if (!context.mounted) return;
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('创作者身份已完成演示开通')),
                      );
                    },
                    child: const Text('完成演示开通'),
                  ),
                ),
              ],
            ),
          ),
        ],
      );
    }
    return ListView(
      key: const ValueKey('creator-center-scroll'),
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 30),
      children: [
        Row(
          children: [
            for (final (key, label) in const [
              ('operations', '运营数据'),
              ('advice', '运营建议'),
              ('growth', '增长体系'),
            ])
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 3),
                  child: _CenterTab(
                    key: ValueKey('creator-center-tab-$key'),
                    label: label,
                    active: _tab == key,
                    onTap: () => setState(() => _tab = key),
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 14),
        if (_tab == 'operations') ..._operations(context),
        if (_tab == 'advice') ..._advice(context),
        if (_tab == 'growth') ..._growth(context),
      ],
    );
  }

  // ---------- Tab 1 运营数据 ----------

  List<Widget> _operations(BuildContext context) {
    final workspace = ref.watch(profileLocalWorkspaceProvider).value;
    final published = workspace?.playables ?? const [];
    return [
      _Panel(
        child: Row(
          children: [
            const CircleAvatar(
              radius: 22,
              backgroundImage: AssetImage('assets/legacy/avatars/kai.png'),
              backgroundColor: Color(0xFF302A3D),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Kai Chen',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900),
                  ),
                  const SizedBox(height: 3),
                  const Text(
                    'KOL 运营者 · 创作与持续经营',
                    style: TextStyle(fontSize: 10, color: AirvanaColors.muted),
                  ),
                  const SizedBox(height: 6),
                  const Wrap(
                    spacing: 6,
                    children: [
                      StatusPill(
                        label: '创作者已开通 · 演示',
                        tone: AirvanaStatusTone.confirmed,
                      ),
                      StatusPill(
                        label: 'KYC 已验证 · 演示',
                        tone: AirvanaStatusTone.demo,
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      const SizedBox(height: 14),
      _Panel(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Expanded(
                  child: Text(
                    '运营数据',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900),
                  ),
                ),
                Text(
                  '内容、互动与 Campaign 证据',
                  style: TextStyle(fontSize: 9, color: AirvanaColors.muted),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final (key, label) in _periods)
                  _GoalStyleChip(
                    key: ValueKey('creator-period-$key'),
                    label: label,
                    selected: _period == key,
                    onTap: () => setState(() => _period = key),
                  ),
              ],
            ),
          ],
        ),
      ),
      const SizedBox(height: 14),
      _SectionHeading(
        title: '核心指标',
        meta: '演示值与服务端确认值分开展示',
      ),
      const SizedBox(height: 10),
      Row(
        children: [
          _MetricCard(
            label: '互动完成 · 演示',
            value: _period == '7d' ? '128' : _period == '30d' ? '512' : '1,436',
          ),
          const SizedBox(width: 8),
          _MetricCard(label: '发布作品', value: '${published.length}'),
        ],
      ),
      const SizedBox(height: 8),
      const Row(
        children: [
          _MetricCard(label: '新增体验 · 演示', value: '86'),
          SizedBox(width: 8),
          _MetricCard(label: '服务端确认事件', value: '0 · 待接入'),
        ],
      ),
      const SizedBox(height: 14),
      _Panel(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const _SectionHeading(title: '互动贡献趋势', meta: '本地演示，不代表真实收益'),
            const SizedBox(height: 12),
            SizedBox(
              height: 96,
              child: CustomPaint(
                key: const ValueKey('creator-trend-chart'),
                size: const Size(double.infinity, 96),
                painter: _TrendPainter(
                  points: _period == '7d'
                      ? const [12, 18, 15, 24, 22, 31, 28]
                      : _period == '30d'
                      ? const [40, 55, 48, 70, 62, 88, 96]
                      : const [90, 120, 105, 160, 150, 210, 236],
                ),
              ),
            ),
            const SizedBox(height: 10),
            const Text(
              '收益、收入与可提现金额均不在前端估算；须由批准的 Contract、服务端成功事件和结算记录确认。',
              key: ValueKey('creator-earnings-disclaimer'),
              style: TextStyle(
                fontSize: 9,
                color: AirvanaColors.muted,
                height: 1.6,
              ),
            ),
          ],
        ),
      ),
      const SizedBox(height: 14),
      _Panel(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const _SectionHeading(title: 'Campaign 漏斗', meta: 'Canonical 事件是否完整接入'),
            const SizedBox(height: 10),
            for (final (label, value, hooked) in const [
              ('playable_start', '128 · 演示', true),
              ('playable_complete', '86 · 演示', true),
              ('lead_submit', '0', false),
              ('registration_complete', '0', false),
            ])
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        label,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                    Text(
                      value,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(width: 8),
                    StatusPill(
                      label: hooked ? '已接入' : '待接入',
                      tone: hooked
                          ? AirvanaStatusTone.confirmed
                          : AirvanaStatusTone.pending,
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
      const SizedBox(height: 14),
      _Panel(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const _SectionHeading(title: 'Playable 表现', meta: '只统计当前 KOL 的本地内容'),
            const SizedBox(height: 10),
            if (published.isEmpty)
              const Text(
                '尚无已发布 Playable。先从增长体系创建首个 Campaign Brief。',
                key: ValueKey('creator-performance-empty'),
                style: TextStyle(fontSize: 10, color: AirvanaColors.muted),
              )
            else
              for (final playable in published)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: LedgerRow(
                    title: playable.title,
                    subtitle:
                        'v${playable.currentVersionNumber} · ${playable.playableId}',
                    trailing: '0 互动',
                    trailingColor: AirvanaColors.ink,
                    pill: const StatusPill(
                      label: '完成 · 演示',
                      tone: AirvanaStatusTone.demo,
                    ),
                  ),
                ),
          ],
        ),
      ),
      const SizedBox(height: 14),
      _Panel(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const _SectionHeading(title: 'Campaign Contract 与交付', meta: '本地演示'),
            const SizedBox(height: 8),
            const Text(
              '当前没有已批准的 Campaign Contract。品牌合作、真实归因与结算须由服务端 Contract 驱动。',
              style: TextStyle(
                fontSize: 10,
                color: AirvanaColors.muted,
                height: 1.55,
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              width: double.infinity,
              child: FilledButton.tonal(
                key: const ValueKey('creator-open-campaign'),
                onPressed: () => context.push('/create'),
                child: const Text('进入交付中心'),
              ),
            ),
          ],
        ),
      ),
    ];
  }

  // ---------- Tab 2 运营建议 ----------

  List<Widget> _advice(BuildContext context) => [
    _Panel(
      child: Row(
        children: [
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '本周诊断摘要',
                  style: TextStyle(fontSize: 10, color: AirvanaColors.muted),
                ),
                SizedBox(height: 4),
                Text(
                  '完成率高于互动率：入口曝光是当前瓶颈',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900),
                ),
              ],
            ),
          ),
          const StatusPill(label: '本地演示', tone: AirvanaStatusTone.demo),
        ],
      ),
    ),
    const SizedBox(height: 14),
    for (final advice in const [
      (
        '作品运营',
        '给「Crypto City 安全挑战」补第二个成功事件',
        '高',
        '近 7 天完成 86 次，但 lead_submit 未接入，漏斗在完成后断裂。',
        '接入第二事件可将完成流量转化为可归因线索。',
        '7 天内 lead_submit ≥ 20 · 演示目标',
        '接入事件',
      ),
      (
        '内容策略',
        '把最高完成率的玩法制成系列',
        '中',
        '蓄力跳跃类完成率 67%，高于账号平均 41%。',
        '同类玩法复用可稳定完成率并降低创作成本。',
        '新增系列作品 2 个',
        '生成 Brief 草稿',
      ),
      (
        '分发节奏',
        '把发布时间移到 20:00-22:00',
        '低',
        '晚间时段互动占全天 58%（本地演示统计）。',
        '匹配活跃时段可提升首小时互动。',
        '首小时互动 +30%',
        '查看数据口径',
      ),
    ])
      Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: _Panel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          advice.$1,
                          style: const TextStyle(
                            fontSize: 9,
                            color: AirvanaColors.muted,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          advice.$2,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ],
                    ),
                  ),
                  StatusPill(
                    label: '优先级 ${advice.$3}',
                    tone: advice.$3 == '高'
                        ? AirvanaStatusTone.alert
                        : advice.$3 == '中'
                        ? AirvanaStatusTone.pending
                        : AirvanaStatusTone.demo,
                  ),
                ],
              ),
              const SizedBox(height: 10),
              _AdviceLine(label: '依据', value: advice.$4),
              _AdviceLine(label: '假设', value: advice.$5),
              _AdviceLine(label: '目标', value: advice.$6),
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: () => context.push('/create'),
                  child: Text(
                    '${advice.$7} ›',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    const SizedBox(height: 2),
    const _SectionHeading(title: '灵感转 Brief', meta: '把创意输入结构化，锁定字段仍需人工确认'),
    const SizedBox(height: 10),
    for (final idea in const [
      ('体验记录', '太空站水培农场 · 限时收获挑战'),
      ('热门评论', '钱包安全知识 · 情景问答闯关'),
    ])
      Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: _Panel(
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '来源 · ${idea.$1}',
                      style: const TextStyle(
                        fontSize: 9,
                        color: AirvanaColors.muted,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      idea.$2,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
              ),
              FilledButton.tonal(
                onPressed: () => context.push('/create'),
                child: const Text('生成 Brief 草稿'),
              ),
            ],
          ),
        ),
      ),
  ];

  // ---------- Tab 3 增长体系 ----------

  List<Widget> _growth(BuildContext context) => [
    _Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '增长体系 · G2',
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w900,
              color: AirvanaColors.accent,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            '稳定创作者',
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 4),
          const Text(
            '已完成身份开通与首批作品发布，下一阶段建立可复用的运营节奏。',
            style: TextStyle(
              fontSize: 10,
              color: AirvanaColors.muted,
              height: 1.55,
            ),
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(99),
            child: const LinearProgressIndicator(value: .4, minHeight: 7),
          ),
          const SizedBox(height: 8),
          const Text(
            '真实升级由审核、事件、归因和结算服务确认',
            key: ValueKey('creator-growth-disclaimer'),
            style: TextStyle(fontSize: 9, color: AirvanaColors.muted),
          ),
        ],
      ),
    ),
    const SizedBox(height: 14),
    _Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SectionHeading(title: '成长里程碑', meta: '从开通身份到可复制运营，共 8 个阶段'),
          const SizedBox(height: 10),
          for (final (index, milestone) in const [
            '开通创作者身份',
            '发布首个 Playable',
            '完成首次试玩路径验证',
            '建立每周创作节奏',
            '接入 Campaign 漏斗事件',
            '获得首个获批 Contract',
            '完成首次商业结算',
            '沉淀可复制运营模板',
          ].indexed)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  Container(
                    width: 22,
                    height: 22,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: index < 3
                          ? const Color(0xFFEAF8EF)
                          : const Color(0xFFF2F2F7),
                      shape: BoxShape.circle,
                    ),
                    child: Text(
                      index < 3 ? '✓' : '${index + 1}',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        color: index < 3
                            ? const Color(0xFF147542)
                            : AirvanaColors.muted,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      milestone,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    ),
    const SizedBox(height: 14),
    _Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const _SectionHeading(title: '能力成长', meta: '解锁的是运营能力，不是收益承诺'),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final (ability, unlocked) in const [
                ('快速创作', true),
                ('深度 Campaign', true),
                ('Remix 授权', true),
                ('外部渠道意向', false),
                ('品牌合作', false),
                ('商业结算', false),
              ])
                _GoalStyleChip(
                  label: unlocked ? '$ability ✓' : '$ability · 待解锁',
                  selected: unlocked,
                  onTap: () {},
                ),
            ],
          ),
        ],
      ),
    ),
    const SizedBox(height: 14),
    const _SectionHeading(title: '增长机会', meta: '资格、Contract、交付与结算状态清晰可见'),
    const SizedBox(height: 10),
    for (final opportunity in const [
      ('opp_wallet_edu', '钱包安全教育 Campaign', '面向新用户的安全教育互动', '亚太 · 演示'),
      ('opp_community', '社区增长共创计划', '联合 KOL 扩大节点覆盖', '全球 · 演示'),
    ])
      Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: _Panel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      opportunity.$2,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  StatusPill(
                    label: _appliedOpportunities.contains(opportunity.$1)
                        ? '已申请 · 待审核'
                        : '可申请',
                    tone: _appliedOpportunities.contains(opportunity.$1)
                        ? AirvanaStatusTone.pending
                        : AirvanaStatusTone.confirmed,
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                '${opportunity.$3} · ${opportunity.$4}',
                style: const TextStyle(
                  fontSize: 10,
                  color: AirvanaColors.muted,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                '资格、Contract、交付与结算均由服务端确认；本机仅记录申请意向。',
                style: TextStyle(fontSize: 9, color: AirvanaColors.muted),
              ),
              const SizedBox(height: 8),
              Align(
                alignment: Alignment.centerRight,
                child: FilledButton.tonal(
                  key: ValueKey('creator-opportunity-${opportunity.$1}'),
                  onPressed: _appliedOpportunities.contains(opportunity.$1)
                      ? null
                      : () => setState(
                          () => _appliedOpportunities.add(opportunity.$1),
                        ),
                  child: Text(
                    _appliedOpportunities.contains(opportunity.$1)
                        ? '已提交申请意向'
                        : '申请参与',
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
  ];
}

class _CenterTab extends StatelessWidget {
  const _CenterTab({
    super.key,
    required this.label,
    required this.active,
    required this.onTap,
  });

  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    borderRadius: BorderRadius.circular(999),
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: active ? const Color(0xFFFFF1F2) : Colors.white,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: active ? const Color(0xFFFFD6DA) : AirvanaColors.line,
        ),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w900,
          color: active ? AirvanaColors.accent : AirvanaColors.ink,
        ),
      ),
    ),
  );
}

class _GoalStyleChip extends StatelessWidget {
  const _GoalStyleChip({
    super.key,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    borderRadius: BorderRadius.circular(999),
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        color: selected ? const Color(0xFFEAF8EF) : const Color(0xFFF7F7FA),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: selected ? const Color(0xFF9ED9B1) : AirvanaColors.line,
        ),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w800,
          color: selected ? const Color(0xFF147542) : const Color(0xFF636366),
        ),
      ),
    ),
  );
}

class _SectionHeading extends StatelessWidget {
  const _SectionHeading({required this.title, required this.meta});

  final String title;
  final String meta;

  @override
  Widget build(BuildContext context) => Row(
    crossAxisAlignment: CrossAxisAlignment.end,
    children: [
      Expanded(
        child: Text(
          title,
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900),
        ),
      ),
      Text(meta, style: const TextStyle(fontSize: 9, color: AirvanaColors.muted)),
    ],
  );
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Expanded(
    child: Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AirvanaColors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 9, color: AirvanaColors.muted),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900),
          ),
        ],
      ),
    ),
  );
}

class _AdviceLine extends StatelessWidget {
  const _AdviceLine({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 5),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 34,
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w900,
              color: AirvanaColors.accent,
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(
              fontSize: 10,
              color: Color(0xFF636366),
              height: 1.5,
            ),
          ),
        ),
      ],
    ),
  );
}

/// 互动贡献趋势折线：面积填充 + 末点高亮，对齐 Web 的 SVG 结构。
class _TrendPainter extends CustomPainter {
  const _TrendPainter({required this.points});

  final List<int> points;

  @override
  void paint(Canvas canvas, Size size) {
    if (points.length < 2) return;
    final maxValue = points.reduce((a, b) => a > b ? a : b).toDouble();
    final stepX = size.width / (points.length - 1);
    Offset at(int index) => Offset(
      index * stepX,
      size.height - (points[index] / maxValue) * (size.height - 12) - 4,
    );

    final grid = Paint()
      ..color = const Color(0xFFEDEDF2)
      ..strokeWidth = 1;
    for (final ratio in const [.2, .5, .8]) {
      final y = size.height * ratio;
      canvas.drawLine(Offset(0, y), Offset(size.width, y), grid);
    }

    final line = Path()..moveTo(at(0).dx, at(0).dy);
    for (var index = 1; index < points.length; index += 1) {
      line.lineTo(at(index).dx, at(index).dy);
    }
    final area = Path.from(line)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();

    canvas.drawPath(
      area,
      Paint()..color = AirvanaColors.accent.withValues(alpha: .08),
    );
    canvas.drawPath(
      line,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..color = AirvanaColors.accent,
    );
    canvas.drawCircle(at(points.length - 1), 4, Paint()..color = AirvanaColors.accent);
  }

  @override
  bool shouldRepaint(_TrendPainter oldDelegate) =>
      oldDelegate.points != points;
}

class _Panel extends StatelessWidget {
  const _Panel({required this.child});

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
