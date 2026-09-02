import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/history/presentation/profile_legal_document_screen.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// 旧 Web “设置与更多”二级功能的 Flutter 对齐实现。
///
/// 所有可变状态均明确标记为本机演示并写入本地工作区；不会把本地操作伪装成
/// 服务端认证、品牌审批、真实发布、权威归因或商业结算。
class ProfileSettingsParityBody extends ConsumerWidget {
  const ProfileSettingsParityBody({required this.destination, super.key});

  final String destination;

  @override
  Widget build(BuildContext context, WidgetRef ref) => switch (destination) {
    'subscription' => const _SubscriptionCenterPage(),
    'identityVerification' => const _IdentityAndRolesPage(),
    'brandPartnership' => const _CampaignWorkbenchPage(),
    'creatorBenefits' => const _RightsHubPage(),
    'publishingGovernance' => const _GovernancePage(),
    'feedback' => const _FeedbackPage(),
    'featureCenter' => const _ProductCenterPage(),
    'language' => const _LanguagePage(),
    'preferences' => const _PreferencesPage(),
    'deleteAccount' => const _AccountDeletionPage(),
    _ => const SizedBox.shrink(),
  };
}

Future<void> _saveFeatureState(
  BuildContext context,
  WidgetRef ref,
  LocalProfileFeatureState state, {
  String? message,
}) async {
  await ref.read(airvanaRepositoryProvider).saveLocalProfileFeatureState(state);
  ref.invalidate(profileFeatureStateProvider);
  if (!context.mounted || message == null) return;
  _showSettingsNotice(context, message);
}

void _notice(BuildContext context, String message) {
  _showSettingsNotice(context, message);
}

void _showSettingsNotice(BuildContext context, String message) {
  final messenger = ScaffoldMessenger.of(context);
  messenger
    ..hideCurrentSnackBar()
    ..showSnackBar(
      SnackBar(
        key: const ValueKey('settings-floating-notice'),
        content: Text(message),
      ),
    );
}

class _FeatureAsync extends ConsumerWidget {
  const _FeatureAsync({required this.builder});

  final Widget Function(
    BuildContext context,
    WidgetRef ref,
    LocalProfileFeatureState state,
  )
  builder;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final value = ref.watch(profileFeatureStateProvider);
    return value.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => _ErrorState(
        message: '本机功能状态加载失败：$error',
        onRetry: () => ref.invalidate(profileFeatureStateProvider),
      ),
      data: (state) => builder(context, ref, state),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(message, textAlign: TextAlign.center),
          const SizedBox(height: 12),
          FilledButton(onPressed: onRetry, child: const Text('重试')),
        ],
      ),
    ),
  );
}

class _PageList extends StatelessWidget {
  const _PageList({required this.keyName, required this.children});

  final String keyName;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) => ListView(
    key: ValueKey(keyName),
    padding: const EdgeInsets.fromLTRB(18, 18, 18, 32),
    children: [
      for (var index = 0; index < children.length; index++) ...[
        children[index],
        if (index != children.length - 1) const SizedBox(height: 12),
      ],
    ],
  );
}

class _Surface extends StatelessWidget {
  const _Surface({
    required this.child,
    this.padding = const EdgeInsets.all(16),
  });

  final Widget child;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: padding,
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      border: Border.all(color: AirvanaColors.line),
    ),
    child: child,
  );
}

class _Boundary extends StatelessWidget {
  const _Boundary({
    required this.title,
    required this.text,
    this.warning = false,
  });

  final String title;
  final String text;
  final bool warning;

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(13),
    decoration: BoxDecoration(
      color: const Color(0xFFFFF8F8),
      borderRadius: BorderRadius.circular(14),
      border: Border.all(
        color: warning ? const Color(0xFFFF9DA6) : const Color(0xFFFFD6DA),
      ),
    ),
    child: Text.rich(
      TextSpan(
        children: [
          TextSpan(
            text: '$title\n',
            style: const TextStyle(
              color: Color(0xFFC62836),
              fontWeight: FontWeight.w900,
            ),
          ),
          TextSpan(text: text),
        ],
      ),
      style: const TextStyle(
        color: Color(0xFF6E5A5D),
        fontSize: 10,
        height: 1.65,
      ),
    ),
  );
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.title, {this.subtitle, this.trailing});

  final String title;
  final String? subtitle;
  final String? trailing;

  @override
  Widget build(BuildContext context) => Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900),
            ),
            if (subtitle != null) ...[
              const SizedBox(height: 4),
              Text(
                subtitle!,
                style: const TextStyle(
                  color: AirvanaColors.muted,
                  fontSize: 9,
                  height: 1.45,
                ),
              ),
            ],
          ],
        ),
      ),
      if (trailing != null)
        Text(
          trailing!,
          style: const TextStyle(
            color: AirvanaColors.accent,
            fontSize: 9,
            fontWeight: FontWeight.w900,
          ),
        ),
    ],
  );
}

class _PrimaryAction extends StatelessWidget {
  const _PrimaryAction({
    required this.label,
    required this.onPressed,
    this.outlined = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool outlined;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: double.infinity,
    child: outlined
        ? OutlinedButton(
            onPressed: onPressed,
            style: OutlinedButton.styleFrom(
              minimumSize: const Size.fromHeight(46),
              foregroundColor: AirvanaColors.ink,
              side: const BorderSide(color: AirvanaColors.line),
              shape: const StadiumBorder(),
            ),
            child: Text(label),
          )
        : FilledButton(
            onPressed: onPressed,
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(46),
              backgroundColor: AirvanaColors.accent,
              shape: const StadiumBorder(),
            ),
            child: Text(label),
          ),
  );
}

class _StatusPill extends StatelessWidget {
  const _StatusPill(this.label, {this.good = false, this.warning = false});

  final String label;
  final bool good;
  final bool warning;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
    decoration: BoxDecoration(
      color: good
          ? const Color(0xFFEAF8EF)
          : warning
          ? const Color(0xFFFFF3D6)
          : const Color(0xFFF1F1F6),
      borderRadius: BorderRadius.circular(999),
    ),
    child: Text(
      label,
      style: TextStyle(
        color: good
            ? const Color(0xFF147542)
            : warning
            ? const Color(0xFF8B5B00)
            : const Color(0xFF636366),
        fontSize: 8,
        fontWeight: FontWeight.w900,
      ),
    ),
  );
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Expanded(
    child: Container(
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: const Color(0xFFF7F7FA),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(color: AirvanaColors.muted, fontSize: 9),
          ),
          const SizedBox(height: 5),
          Text(
            value,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
          ),
        ],
      ),
    ),
  );
}

typedef _Plan = ({
  String key,
  String name,
  String audience,
  String price,
  String priceMeta,
  bool purchasable,
  List<(String, String)> allowances,
  List<String> features,
});

const _plans = <_Plan>[
  (
    key: 'free',
    name: 'Free',
    audience: '玩家与轻量创作者',
    price: '免费',
    priceMeta: '基础方案',
    purchasable: true,
    allowances: [('轻度创作', '3'), ('深度创作', '1'), ('Remix', '2'), ('图片生成', '1')],
    features: ['基础试玩', '基础模板', '基础数据'],
  ),
  (
    key: 'creator_pro',
    name: 'Creator Pro',
    audience: '持续创作和运营的 KOL',
    price: '本地演示',
    priceMeta: '不扣款',
    purchasable: true,
    allowances: [
      ('轻度创作', '50'),
      ('深度创作', '10'),
      ('Remix', '30'),
      ('图片生成', '50'),
    ],
    features: ['高级分析', '版本历史', '素材空间', '优先生成', '协作能力'],
  ),
  (
    key: 'brand_campaign',
    name: 'Brand / Campaign',
    audience: '品牌与 Campaign 团队',
    price: '组织方案',
    priceMeta: '需平台审批',
    purchasable: false,
    allowances: [
      ('轻度创作', '200'),
      ('深度创作', '40'),
      ('Remix', '100'),
      ('图片生成', '200'),
    ],
    features: ['Campaign Brief', 'Campaign Contract', '成员审批', '归因审计', '预算与权益池'],
  ),
];

class _SubscriptionCenterPage extends ConsumerStatefulWidget {
  const _SubscriptionCenterPage();

  @override
  ConsumerState<_SubscriptionCenterPage> createState() =>
      _SubscriptionCenterPageState();
}

class _SubscriptionCenterPageState
    extends ConsumerState<_SubscriptionCenterPage> {
  String? _selectedPlan;

  @override
  Widget build(BuildContext context) => _FeatureAsync(
    builder: (context, ref, state) {
      final selectedKey = _selectedPlan ?? state.subscriptionPlanKey;
      final current = _plans.firstWhere(
        (plan) => plan.key == state.subscriptionPlanKey,
      );
      final selected = _plans.firstWhere((plan) => plan.key == selectedKey);
      final statusLabel = switch (state.subscriptionStatus) {
        'grace_period' => '宽限期',
        'expired' => '已过期',
        'revoked' => '已撤销',
        _ => state.subscriptionCancelAtPeriodEnd ? '到期不续订' : '有效',
      };
      return _PageList(
        keyName: 'subscription-center-parity',
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: AirvanaColors.ink,
              borderRadius: BorderRadius.circular(22),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'CURRENT PLAN · 本机演示',
                  style: TextStyle(
                    color: Colors.white70,
                    fontSize: 9,
                    letterSpacing: 1.2,
                  ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        current.name,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 21,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                    _StatusPill(
                      statusLabel,
                      good: state.subscriptionStatus == 'active',
                    ),
                  ],
                ),
                const SizedBox(height: 7),
                const Text(
                  '本周期有效至 2026/09/17',
                  style: TextStyle(color: Colors.white60, fontSize: 10),
                ),
              ],
            ),
          ),
          Row(
            children: [
              for (final plan in _plans)
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 3),
                    child: ChoiceChip(
                      key: ValueKey('subscription-plan-${plan.key}'),
                      label: Text(
                        plan.key == 'brand_campaign' ? 'Brand' : plan.name,
                      ),
                      selected: selected.key == plan.key,
                      onSelected: (_) =>
                          setState(() => _selectedPlan = plan.key),
                    ),
                  ),
                ),
            ],
          ),
          _Surface(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: _SectionTitle(
                        selected.name,
                        subtitle: selected.audience,
                      ),
                    ),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          selected.price,
                          style: const TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        Text(
                          selected.priceMeta,
                          style: const TextStyle(
                            color: AirvanaColors.muted,
                            fontSize: 8,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: selected.allowances
                      .map(
                        (item) => Container(
                          width: 154,
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF7F7FA),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            '${item.$1}\n${item.$2} / 周期',
                            style: const TextStyle(
                              fontSize: 10,
                              height: 1.5,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ),
                      )
                      .toList(growable: false),
                ),
                const SizedBox(height: 12),
                ...selected.features.map(
                  (feature) => Padding(
                    padding: const EdgeInsets.only(bottom: 7),
                    child: Text(
                      '✓  $feature',
                      style: const TextStyle(fontSize: 10),
                    ),
                  ),
                ),
                const SizedBox(height: 6),
                _PrimaryAction(
                  label: selected.key == state.subscriptionPlanKey
                      ? state.subscriptionCancelAtPeriodEnd
                            ? '恢复续订'
                            : '当前方案'
                      : selected.purchasable
                      ? selected.key == 'free'
                            ? '切换 Free'
                            : '模拟升级'
                      : '了解组织方案',
                  onPressed:
                      selected.key == state.subscriptionPlanKey &&
                          !state.subscriptionCancelAtPeriodEnd
                      ? null
                      : () => _activatePlan(context, ref, state, selected),
                ),
                if (selected.key == state.subscriptionPlanKey &&
                    selected.key != 'free' &&
                    !state.subscriptionCancelAtPeriodEnd) ...[
                  const SizedBox(height: 8),
                  _PrimaryAction(
                    label: '到期后不续订',
                    outlined: true,
                    onPressed: () => _saveFeatureState(
                      context,
                      ref,
                      state.copyWith(subscriptionCancelAtPeriodEnd: true),
                      message: '已在本机演示中设为到期后切换 Free',
                    ),
                  ),
                ],
              ],
            ),
          ),
          const _Boundary(
            title: '套餐边界',
            text: '只增加功能和周期额度，不增加 AIP/AIT，也不改变 KYC、创作者身份或商业权限。本机切换不创建订单、不扣款。',
          ),
          _Surface(
            child: ExpansionTile(
              tilePadding: EdgeInsets.zero,
              childrenPadding: const EdgeInsets.only(top: 6),
              title: const Text(
                '状态模拟器',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900),
              ),
              subtitle: const Text('仅验证本地状态展示', style: TextStyle(fontSize: 9)),
              children: [
                Wrap(
                  spacing: 7,
                  children:
                      {
                            'active': '有效',
                            'grace_period': '宽限期',
                            'expired': '已过期',
                            'revoked': '已撤销',
                          }.entries
                          .map(
                            (entry) => ChoiceChip(
                              label: Text(entry.value),
                              selected: state.subscriptionStatus == entry.key,
                              onSelected: (_) => _saveFeatureState(
                                context,
                                ref,
                                state.copyWith(subscriptionStatus: entry.key),
                                message: '订阅状态已更新为${entry.value} · 本机演示',
                              ),
                            ),
                          )
                          .toList(growable: false),
                ),
                const SizedBox(height: 10),
                _PrimaryAction(
                  label: '重置订阅演示',
                  outlined: true,
                  onPressed: () => _saveFeatureState(
                    context,
                    ref,
                    state.copyWith(
                      subscriptionPlanKey: 'free',
                      subscriptionStatus: 'active',
                      subscriptionCancelAtPeriodEnd: false,
                      subscriptionHistory: const [],
                    ),
                    message: '订阅演示已重置为 Free',
                  ),
                ),
              ],
            ),
          ),
        ],
      );
    },
  );

  Future<void> _activatePlan(
    BuildContext context,
    WidgetRef ref,
    LocalProfileFeatureState state,
    _Plan plan,
  ) async {
    if (!plan.purchasable) {
      _notice(context, 'Brand / Campaign 方案需要平台审批，当前不会创建订单');
      return;
    }
    final resuming = plan.key == state.subscriptionPlanKey;
    final history = {
      'action': resuming ? '恢复续订' : '切换方案',
      'from_plan_key': state.subscriptionPlanKey,
      'to_plan_key': plan.key,
      'created_at': DateTime.now().toUtc().toIso8601String(),
      'status': 'local-demo',
    };
    await _saveFeatureState(
      context,
      ref,
      state.copyWith(
        subscriptionPlanKey: plan.key,
        subscriptionStatus: 'active',
        subscriptionCancelAtPeriodEnd: false,
        subscriptionHistory: [history, ...state.subscriptionHistory],
      ),
      message: '${plan.name} 已在本机演示中启用，不会产生扣款',
    );
  }
}

class _IdentityAndRolesPage extends ConsumerStatefulWidget {
  const _IdentityAndRolesPage();

  @override
  ConsumerState<_IdentityAndRolesPage> createState() =>
      _IdentityAndRolesPageState();
}

class _IdentityAndRolesPageState extends ConsumerState<_IdentityAndRolesPage> {
  String? _selectedRole;

  @override
  Widget build(BuildContext context) {
    final identity = ref.watch(identityStateProvider);
    return _FeatureAsync(
      builder: (context, ref, feature) => identity.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => _ErrorState(
          message: '身份状态加载失败：$error',
          onRetry: () => ref.invalidate(identityStateProvider),
        ),
        data: (state) => _selectedRole == null
            ? _identityOverview(context, ref, feature, state)
            : _identityDetail(context, ref, feature, state, _selectedRole!),
      ),
    );
  }

  Widget _identityOverview(
    BuildContext context,
    WidgetRef ref,
    LocalProfileFeatureState feature,
    LocalIdentityState identity,
  ) {
    final kycValid = identity.kycStatus == 'verified_demo';
    final creatorValid = identity.creatorStatus == 'active_demo';
    final validCount = [
      kycValid,
      creatorValid,
      feature.identityNodeActive,
      feature.identitySuperNodeActive,
    ].where((value) => value).length;
    final rows = [
      (
        'kyc',
        Icons.verified_user_outlined,
        'KYC 身份认证',
        '私密身份核验，与公开角色分离',
        kycValid,
      ),
      (
        'creator',
        Icons.auto_awesome_rounded,
        '创作者身份',
        '控制 KOL 创作和运营功能范围',
        creatorValid,
      ),
      (
        'node',
        Icons.hub_outlined,
        '增长网络节点',
        '参与五人网络与增长协作',
        feature.identityNodeActive,
      ),
      (
        'super_node',
        Icons.workspace_premium_outlined,
        '超级节点',
        '依赖普通节点持续运行与人工审核',
        feature.identitySuperNodeActive,
      ),
    ];
    return _PageList(
      keyName: 'identity-roles-parity',
      children: [
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF1C1C1E), Color(0xFF343438)],
            ),
            borderRadius: BorderRadius.circular(22),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text.rich(
                TextSpan(
                  children: [
                    TextSpan(
                      text: '$validCount',
                      style: const TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const TextSpan(
                      text: ' / 4 项状态有效',
                      style: TextStyle(fontSize: 12, color: Colors.white70),
                    ),
                  ],
                ),
                style: const TextStyle(color: Colors.white),
              ),
              const SizedBox(height: 12),
              const Text(
                'KYC 与角色状态相互独立；真实认证、审核和权限必须由服务端确认。',
                style: TextStyle(
                  color: Colors.white70,
                  fontSize: 10,
                  height: 1.6,
                ),
              ),
            ],
          ),
        ),
        const _Boundary(
          title: '前端演示边界',
          text: '证件照片只应在第三方托管窗口处理；Airvana 不保存原件、自拍或生物信息，也不会因本地状态开放真实权限。',
        ),
        ...rows.map(
          (row) => _Surface(
            padding: EdgeInsets.zero,
            child: InkWell(
              key: ValueKey('identity-role-${row.$1}'),
              onTap: () => setState(() => _selectedRole = row.$1),
              child: Padding(
                padding: const EdgeInsets.all(14),
                child: Row(
                  children: [
                    Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFF1F2),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Icon(row.$2, color: AirvanaColors.accent),
                    ),
                    const SizedBox(width: 12),
                    Expanded(child: _SectionTitle(row.$3, subtitle: row.$4)),
                    _StatusPill(row.$5 ? '已生效 · 演示' : '待完成', good: row.$5),
                    const Icon(
                      Icons.chevron_right_rounded,
                      color: AirvanaColors.muted,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        const _Surface(
          child: _SectionTitle(
            '角色关系',
            subtitle: 'KYC 是私密身份核验；创作者是产品角色；超级节点必须建立在运行中的普通节点之上。',
          ),
        ),
        _PrimaryAction(
          label: '重置本地演示状态',
          outlined: true,
          onPressed: () async {
            await ref
                .read(airvanaRepositoryProvider)
                .saveIdentityState(
                  const LocalIdentityState(
                    creatorStatus: 'not_applied',
                    kycStatus: 'unverified',
                  ),
                );
            if (!context.mounted) return;
            await _saveFeatureState(
              context,
              ref,
              feature.copyWith(
                identityNodeActive: false,
                identitySuperNodeActive: false,
              ),
              message: '身份与角色已重置 · 本机演示',
            );
            ref.invalidate(identityStateProvider);
          },
        ),
      ],
    );
  }

  Widget _identityDetail(
    BuildContext context,
    WidgetRef ref,
    LocalProfileFeatureState feature,
    LocalIdentityState identity,
    String role,
  ) {
    final (title, description, active, requirements, boundary) = switch (role) {
      'kyc' => (
        'KYC 身份认证',
        '真实流程由合规第三方处理；Airvana 仅接收去标识化状态与引用编号。',
        identity.kycStatus == 'verified_demo',
        ['阅读认证与隐私说明', '进入第三方托管窗口', '等待服务端状态确认'],
        '当前按钮只更新本机演示状态，不上传证件，也不开放结算、提现或受限权限。',
      ),
      'creator' => (
        '创作者身份',
        '控制创作者中心、Campaign 和运营工具的产品功能范围。',
        identity.creatorStatus == 'active_demo',
        ['KYC 状态有效', '创作者规则已阅读', '平台审核通过'],
        '创作者身份不代表平台为内容、收益或资质背书。',
      ),
      'node' => (
        '增长网络节点',
        '参与五人增长网络并记录本地贡献。',
        feature.identityNodeActive,
        ['KYC 状态有效', '账号状态正常', '增长网络节点申请已批准'],
        '节点是增长网络运营角色，不代表区块链验证、代币质押、固定收益或法定资质。',
      ),
      _ => (
        '超级节点',
        '依赖普通节点持续运行、贡献评估与人工审核。',
        feature.identitySuperNodeActive,
        ['普通节点保持运行中', '持续贡献达到条件', '超级节点人工审核通过'],
        '超级节点资格可暂停或降级；本机演示不会改变真实权限。',
      ),
    };
    return _PageList(
      keyName: 'identity-detail-$role',
      children: [
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton.icon(
            onPressed: () => setState(() => _selectedRole = null),
            icon: const Icon(Icons.arrow_back_rounded),
            label: const Text('返回身份概览'),
          ),
        ),
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFFFFF4F5), Colors.white],
            ),
            borderRadius: BorderRadius.circular(21),
            border: Border.all(color: const Color(0xFFFFD6DA)),
          ),
          child: Row(
            children: [
              const CircleAvatar(
                radius: 24,
                backgroundColor: AirvanaColors.accent,
                child: Icon(Icons.verified_user_outlined, color: Colors.white),
              ),
              const SizedBox(width: 12),
              Expanded(child: _SectionTitle(title, subtitle: description)),
              _StatusPill(active ? '已生效 · 演示' : '待完成', good: active),
            ],
          ),
        ),
        _Surface(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const _SectionTitle('条件与状态'),
              const SizedBox(height: 12),
              for (var index = 0; index < requirements.length; index++)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 11,
                        backgroundColor: active || index == 0
                            ? const Color(0xFFEAF8EF)
                            : const Color(0xFFF1F1F6),
                        child: Text(
                          active || index == 0 ? '✓' : '○',
                          style: const TextStyle(
                            fontSize: 9,
                            color: Color(0xFF147542),
                          ),
                        ),
                      ),
                      const SizedBox(width: 9),
                      Expanded(
                        child: Text(
                          requirements[index],
                          style: const TextStyle(fontSize: 10),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
        _Boundary(title: '权限边界', text: boundary),
        _PrimaryAction(
          label: active ? '当前状态已生效 · 本机演示' : '推进本地演示状态',
          onPressed: active
              ? null
              : () => _advanceIdentity(context, ref, feature, identity, role),
        ),
      ],
    );
  }

  Future<void> _advanceIdentity(
    BuildContext context,
    WidgetRef ref,
    LocalProfileFeatureState feature,
    LocalIdentityState identity,
    String role,
  ) async {
    if (role != 'kyc' && identity.kycStatus != 'verified_demo') {
      _notice(context, '请先完成 KYC 本地演示状态');
      return;
    }
    if (role == 'super_node' && !feature.identityNodeActive) {
      _notice(context, '请先完成普通节点本地演示状态');
      return;
    }
    if (role == 'kyc' || role == 'creator') {
      await ref
          .read(airvanaRepositoryProvider)
          .saveIdentityState(
            LocalIdentityState(
              creatorStatus: role == 'creator'
                  ? 'active_demo'
                  : identity.creatorStatus,
              kycStatus: role == 'kyc' ? 'verified_demo' : identity.kycStatus,
            ),
          );
      ref.invalidate(identityStateProvider);
    } else {
      await _saveFeatureState(
        context,
        ref,
        feature.copyWith(
          identityNodeActive: role == 'node'
              ? true
              : feature.identityNodeActive,
          identitySuperNodeActive: role == 'super_node'
              ? true
              : feature.identitySuperNodeActive,
        ),
      );
    }
    if (context.mounted) {
      _notice(context, '状态已推进 · 仅本机演示，不改变真实权限');
    }
  }
}

class _CampaignWorkbenchPage extends ConsumerWidget {
  const _CampaignWorkbenchPage();

  static const _stages = [
    'Brief 待确认',
    '创作中',
    '品牌审核中',
    '交付已批准 · 演示',
    '归因待确认',
    '结算复核中',
    '本地流程完成',
  ];

  static const _actions = [
    '确认规则并开始创作',
    '提交品牌审核',
    '推进审核演示',
    '查看并确认归因证据',
    '进入结算复核',
    '完成本地复核演示',
    '查看可复制资产',
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) => _FeatureAsync(
    builder: (context, ref, state) {
      final stage = state.campaignStage.clamp(0, _stages.length - 1);
      return _PageList(
        keyName: 'campaign-workbench-parity',
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFFFFE4E7), Colors.white],
              ),
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: const Color(0xFFFFD6DA)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Expanded(
                      child: Text(
                        '品牌合作 · 本地演示',
                        style: TextStyle(
                          color: AirvanaColors.accent,
                          fontSize: 9,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                    _StatusPill(
                      _stages[stage],
                      good: stage >= 3,
                      warning: stage < 3,
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                const Text(
                  'Airvana Campaign Demo',
                  style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 7),
                const Text(
                  '以 Campaign Brief → Campaign Contract 为生产边界，交付一个可持续运营的 Agentic Playable。',
                  style: TextStyle(
                    color: AirvanaColors.muted,
                    fontSize: 10,
                    height: 1.6,
                  ),
                ),
              ],
            ),
          ),
          _Surface(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const _SectionTitle('01 · 我的任务', subtitle: '先看清交付要求，再开始创作'),
                const SizedBox(height: 12),
                const _CampaignRequirementGrid(),
              ],
            ),
          ),
          const _Surface(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _SectionTitle(
                  '02 · Agentic Playable 交付',
                  subtitle: '一个 Campaign 对应一个 Playable，并保留持续迭代版本',
                ),
                SizedBox(height: 12),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: CircleAvatar(
                    backgroundColor: AirvanaColors.ink,
                    child: Text(
                      'AP',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  title: Text(
                    'Campaign Playable · 待创建',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900),
                  ),
                  subtitle: Text(
                    'Brief → Contract → 版本化交付',
                    style: TextStyle(fontSize: 9),
                  ),
                ),
              ],
            ),
          ),
          const _Surface(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _SectionTitle('03 · 创作空间与限制'),
                SizedBox(height: 10),
                Text(
                  '可以调整：角色、台词、画面、玩法节奏、KOL 分享文案',
                  style: TextStyle(fontSize: 10, height: 1.7),
                ),
                Text(
                  '平台锁定：目标、CTA、地区、奖励、归因、预算、Kill Switch',
                  style: TextStyle(
                    fontSize: 10,
                    height: 1.7,
                    color: Color(0xFFC62836),
                  ),
                ),
              ],
            ),
          ),
          _Surface(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const _SectionTitle('04 · 审核与发布进度'),
                const SizedBox(height: 12),
                for (var index = 0; index < _stages.length; index++)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 9),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 11,
                          backgroundColor: index <= stage
                              ? const Color(0xFFEAF8EF)
                              : const Color(0xFFF1F1F6),
                          child: Text(
                            index < stage
                                ? '✓'
                                : index == stage
                                ? '●'
                                : '○',
                            style: const TextStyle(
                              fontSize: 8,
                              color: Color(0xFF147542),
                            ),
                          ),
                        ),
                        const SizedBox(width: 9),
                        Expanded(
                          child: Text(
                            _stages[index],
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: index == stage
                                  ? FontWeight.w900
                                  : FontWeight.w500,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          _Surface(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const _SectionTitle(
                  '05 · 数据、归因与结算',
                  subtitle: '只展示可验证事件，不把演示记录当成真实收益',
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    const _Metric(label: '互动开始', value: '0'),
                    const SizedBox(width: 8),
                    const _Metric(label: '完成互动', value: '0'),
                    const SizedBox(width: 8),
                    _Metric(label: '确认事件', value: stage >= 4 ? '1 · 演示' : '0'),
                  ],
                ),
              ],
            ),
          ),
          _Surface(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const _SectionTitle(
                  '06 · 产物与版本治理',
                  subtitle: 'Brief、Contract、素材、审核和发布记录保留本地版本',
                ),
                const SizedBox(height: 12),
                Text(
                  state.campaignPaused ? '当前本机运行版本：已暂停' : '当前本机运行版本：正常',
                  style: TextStyle(
                    color: state.campaignPaused
                        ? const Color(0xFFC62836)
                        : const Color(0xFF147542),
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => _saveFeatureState(
                          context,
                          ref,
                          state.copyWith(campaignPaused: !state.campaignPaused),
                          message: state.campaignPaused
                              ? '已恢复本机运行版本'
                              : '已暂停本机运行版本',
                        ),
                        child: Text(state.campaignPaused ? '恢复版本' : '暂停版本'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: stage > 0
                            ? () => _saveFeatureState(
                                context,
                                ref,
                                state.copyWith(campaignStage: stage - 1),
                                message: '已回滚到上一阶段 · 本机演示',
                              )
                            : null,
                        child: const Text('回滚上一版本'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          _PrimaryAction(
            label: _actions[stage],
            onPressed: () {
              if (stage == _stages.length - 1) {
                _notice(context, '可复制资产已保存在当前本地演示流程中');
                return;
              }
              _saveFeatureState(
                context,
                ref,
                state.copyWith(campaignStage: stage + 1),
                message: 'Campaign 已推进到：${_stages[stage + 1]}',
              );
            },
          ),
          _PrimaryAction(
            label: '重置 Campaign 全流程演示数据',
            outlined: true,
            onPressed: () => _saveFeatureState(
              context,
              ref,
              state.copyWith(campaignStage: 0, campaignPaused: false),
              message: 'Campaign 本地演示已重置',
            ),
          ),
          const _Boundary(
            title: 'LOCAL / DEMO',
            text: '当前页面不代表真实品牌批准、对外发布、服务器归因或商业结算。修改锁定字段必须生成新 Contract 版本并重新审核。',
            warning: true,
          ),
        ],
      );
    },
  );
}

class _CampaignRequirementGrid extends StatelessWidget {
  const _CampaignRequirementGrid();

  @override
  Widget build(BuildContext context) {
    const rows = [
      ('核心目标', '品牌认知'),
      ('成功事件', '有效完成'),
      ('CTA', '查看活动'),
      ('体验时长', '【待人工录入】'),
      ('品牌素材', '待确认授权'),
      ('截止时间', '【待人工录入】'),
    ];
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: rows
          .map(
            (row) => Container(
              width: 154,
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFF7F7FA),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                '${row.$1}\n${row.$2}',
                style: const TextStyle(
                  fontSize: 9,
                  height: 1.6,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          )
          .toList(growable: false),
    );
  }
}

typedef _RightItem = ({
  String id,
  String category,
  String title,
  String description,
  String duration,
  String scope,
  int cost,
  IconData icon,
});

const _rightItems = <_RightItem>[
  (
    id: 'boost',
    category: '内容曝光',
    title: '作品加速卡',
    description: '进入站内推荐候选位，不承诺曝光量或转化。',
    duration: '24 小时',
    scope: '仅站内推荐',
    cost: 360,
    icon: Icons.trending_up_rounded,
  ),
  (
    id: 'profile',
    category: '主页装扮',
    title: '主页高亮',
    description: '启用主题高亮，不提升账号权限。',
    duration: '7 天',
    scope: '个人主页展示',
    cost: 220,
    icon: Icons.person_outline_rounded,
  ),
  (
    id: 'theme',
    category: '创作工具',
    title: '创作主题包',
    description: '解锁一组本地创作视觉主题。',
    duration: '长期有效',
    scope: '当前账号使用',
    cost: 180,
    icon: Icons.auto_awesome_outlined,
  ),
  (
    id: 'badge',
    category: '身份展示',
    title: '贡献徽章',
    description: '展示站内贡献纪念徽章，不代表认证或收益。',
    duration: '长期有效',
    scope: '个人主页展示',
    cost: 120,
    icon: Icons.workspace_premium_outlined,
  ),
];

class _RightsHubPage extends ConsumerWidget {
  const _RightsHubPage();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reward = ref.watch(rewardStateProvider);
    return _FeatureAsync(
      builder: (context, ref, state) => reward.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => _ErrorState(
          message: '$error',
          onRetry: () => ref.invalidate(rewardStateProvider),
        ),
        data: (rewardState) => _PageList(
          keyName: 'rights-hub-parity',
          children: [
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AirvanaColors.ink,
                borderRadius: BorderRadius.circular(22),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'AIP 站内权益 · 不支持提现',
                    style: TextStyle(color: Colors.white70, fontSize: 9),
                  ),
                  const SizedBox(height: 13),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          '${rewardState.aipBalance}\n可用 AIP',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 21,
                            fontWeight: FontWeight.w900,
                            height: 1.35,
                          ),
                        ),
                      ),
                      Expanded(
                        child: Text(
                          '${state.activeRightIds.length}\n已生效权益',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 15,
                            fontWeight: FontWeight.w900,
                            height: 1.45,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () =>
                              context.push('/profile/secondary/checkIn'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.white,
                          ),
                          child: const Text('获取 AIP'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () =>
                              context.push('/profile/secondary/wallet'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.white,
                          ),
                          child: const Text('AIP 明细'),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const _Surface(
              child: Row(
                children: [
                  Expanded(child: _SectionTitle('即时生效', subtitle: '当前设备演示')),
                  Expanded(child: _SectionTitle('不可转赠', subtitle: '仅当前账号使用')),
                  Expanded(
                    child: _SectionTitle('不支持提现', subtitle: '与 AIT/现金分离'),
                  ),
                ],
              ),
            ),
            const _SectionTitle('可兑换权益', subtitle: '选择权益查看范围、有效期与生效说明'),
            ..._rightItems.map((item) {
              final active = state.activeRightIds.contains(item.id);
              final affordable = rewardState.aipBalance >= item.cost;
              return _Surface(
                padding: EdgeInsets.zero,
                child: InkWell(
                  key: ValueKey('right-${item.id}'),
                  onTap: active || !affordable
                      ? null
                      : () => _confirmRight(
                          context,
                          ref,
                          state,
                          item,
                          rewardState.aipBalance,
                        ),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Row(
                      children: [
                        CircleAvatar(
                          backgroundColor: const Color(0xFFFFF1F2),
                          child: Icon(item.icon, color: AirvanaColors.accent),
                        ),
                        const SizedBox(width: 11),
                        Expanded(
                          child: _SectionTitle(
                            item.title,
                            subtitle:
                                '${item.description}\n${item.duration} · ${item.scope}',
                          ),
                        ),
                        _StatusPill(
                          active
                              ? '已生效'
                              : affordable
                              ? '${item.cost} AIP'
                              : '余额不足',
                          good: active,
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }),
            const _Boundary(
              title: '资产边界',
              text: 'AIP 仅用于平台内展示、创作与运营权益，不可兑换 AIT、现金、USDT 或任何投资回报。',
            ),
            _Surface(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _SectionTitle(
                    '兑换记录',
                    trailing: '${state.rightsOrders.length} 条',
                  ),
                  const SizedBox(height: 10),
                  if (state.rightsOrders.isEmpty)
                    const Text(
                      '暂无兑换记录',
                      style: TextStyle(
                        color: AirvanaColors.muted,
                        fontSize: 10,
                      ),
                    )
                  else
                    for (final order in state.rightsOrders.take(8))
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: const CircleAvatar(
                          backgroundColor: Color(0xFFEAF8EF),
                          child: Icon(
                            Icons.check_rounded,
                            color: Color(0xFF147542),
                          ),
                        ),
                        title: Text(
                          '${order['title']}',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        subtitle: const Text(
                          '已生效 · 本地演示',
                          style: TextStyle(fontSize: 8),
                        ),
                        trailing: Text(
                          '-${order['cost']} AIP',
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                          ),
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

  Future<void> _confirmRight(
    BuildContext context,
    WidgetRef ref,
    LocalProfileFeatureState state,
    _RightItem item,
    int balance,
  ) async {
    final confirmed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _SectionTitle(item.title, subtitle: item.description),
              const SizedBox(height: 14),
              Row(
                children: [
                  _Metric(label: '当前余额', value: '$balance AIP'),
                  const SizedBox(width: 8),
                  _Metric(label: '兑换后', value: '${balance - item.cost} AIP'),
                ],
              ),
              const SizedBox(height: 12),
              const _Boundary(
                title: '兑换确认',
                text: '本机前端演示，不生成 AIT、现金、USDT、投资回报或可提现资产。',
              ),
              const SizedBox(height: 12),
              _PrimaryAction(
                label: '确认兑换 ${item.cost} AIP',
                onPressed: () => Navigator.pop(context, true),
              ),
            ],
          ),
        ),
      ),
    );
    if (confirmed != true || !context.mounted) return;
    try {
      await ref
          .read(airvanaRepositoryProvider)
          .redeemLocalProfileRight(
            rightId: item.id,
            title: item.title,
            cost: item.cost,
          );
      ref.invalidate(profileFeatureStateProvider);
      ref.invalidate(rewardStateProvider);
      ref.invalidate(walletTxnsProvider);
      if (context.mounted) _notice(context, '${item.title} 已生效 · 本机演示');
    } on Object catch (error) {
      if (context.mounted) _notice(context, '$error');
    }
  }
}

class _GovernancePage extends ConsumerWidget {
  const _GovernancePage();

  static const _tabs = {'review': '审核队列', 'risk': '风险事件', 'control': '发布控制'};

  @override
  Widget build(BuildContext context, WidgetRef ref) => _FeatureAsync(
    builder: (context, ref, state) {
      final rows = switch (state.governanceTab) {
        'risk' => const [
          ('未授权素材拦截', '待确认授权素材时停止发布', 'Fail closed'),
          ('收益承诺词拦截', '不允许保本、固定收益或保证获批表达', '规则启用'),
        ],
        'control' => const [
          ('人工发布确认', 'Agent 只能生成草稿，不能自动发布', '已启用'),
          ('外部连接器', '审批通过后才允许进入渠道确认页', '服务端待接'),
        ],
        _ => [
          const ('Crypto City v2', '素材授权、CTA 与归因字段待复核', '待审核'),
          (
            'Campaign Contract',
            '锁定版本 Contract v1',
            state.campaignStage >= 3 ? '已批准 · 演示' : '待确认',
          ),
        ],
      };
      return _PageList(
        keyName: 'governance-parity',
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: AirvanaColors.ink,
              borderRadius: BorderRadius.circular(22),
            ),
            child: Row(
              children: [
                const Expanded(
                  child: _SectionTitle(
                    '发布与风险控制',
                    subtitle: '举报、申诉、下架和恢复均保留状态历史',
                  ),
                ),
                _StatusPill(
                  state.governanceKillSwitch ? '本机预览已暂停' : '规则正常',
                  good: !state.governanceKillSwitch,
                ),
              ],
            ),
          ),
          Row(
            children: _tabs.entries
                .map(
                  (entry) => Expanded(
                    child: ChoiceChip(
                      key: ValueKey('governance-tab-${entry.key}'),
                      label: Text(entry.value),
                      selected: state.governanceTab == entry.key,
                      onSelected: (_) => _saveFeatureState(
                        context,
                        ref,
                        state.copyWith(governanceTab: entry.key),
                      ),
                    ),
                  ),
                )
                .toList(growable: false),
          ),
          ...rows.map(
            (row) => _Surface(
              child: Row(
                children: [
                  const CircleAvatar(
                    radius: 18,
                    backgroundColor: Color(0xFFFFF1F2),
                    child: Icon(
                      Icons.shield_outlined,
                      color: AirvanaColors.accent,
                      size: 18,
                    ),
                  ),
                  const SizedBox(width: 11),
                  Expanded(child: _SectionTitle(row.$1, subtitle: row.$2)),
                  _StatusPill(
                    row.$3,
                    good: row.$3.contains('启用') || row.$3.contains('批准'),
                    warning: row.$3.contains('待'),
                  ),
                ],
              ),
            ),
          ),
          if (state.governanceTab == 'control')
            _Surface(
              child: SwitchListTile.adaptive(
                key: const ValueKey('governance-kill-switch'),
                contentPadding: EdgeInsets.zero,
                value: state.governanceKillSwitch,
                activeColor: AirvanaColors.accent,
                title: const Text(
                  '演示 Kill Switch',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900),
                ),
                subtitle: const Text(
                  '暂停本机已发布作品，并拦截发布、归因确认和结算入口',
                  style: TextStyle(fontSize: 9),
                ),
                onChanged: (value) => _saveFeatureState(
                  context,
                  ref,
                  state.copyWith(governanceKillSwitch: value),
                  message: value ? '本机预览已暂停' : '本机预览已恢复',
                ),
              ),
            ),
          const _Boundary(
            title: 'Fail closed',
            text:
                '合同字段缺失、素材未授权、KYC/区域规则未满足、离线或 Kill Switch 启用时，正式发布与结算保持锁定。真实停机必须由服务端策略执行。',
            warning: true,
          ),
        ],
      );
    },
  );
}

class _FeedbackPage extends ConsumerStatefulWidget {
  const _FeedbackPage();

  @override
  ConsumerState<_FeedbackPage> createState() => _FeedbackPageState();
}

class _FeedbackPageState extends ConsumerState<_FeedbackPage> {
  static const _fieldFill = Color(0xFFF7F7FA);
  static const _fieldBorder = OutlineInputBorder(
    borderRadius: BorderRadius.all(Radius.circular(14)),
    borderSide: BorderSide(color: AirvanaColors.line, width: 1),
  );
  static const _fieldFocusedBorder = OutlineInputBorder(
    borderRadius: BorderRadius.all(Radius.circular(14)),
    borderSide: BorderSide(color: Color(0xFFFF7B85), width: 1),
  );

  final _body = TextEditingController();
  final _contact = TextEditingController();
  String _category = 'product';

  @override
  void dispose() {
    _body.dispose();
    _contact.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => _FeatureAsync(
    builder: (context, ref, state) => _PageList(
      keyName: 'feedback-parity',
      children: [
        const _Surface(
          child: Row(
            children: [
              CircleAvatar(
                backgroundColor: Color(0xFFFFF1F2),
                child: Icon(
                  Icons.chat_bubble_outline_rounded,
                  color: AirvanaColors.accent,
                ),
              ),
              SizedBox(width: 12),
              Expanded(
                child: _SectionTitle(
                  '帮助我们做得更好',
                  subtitle: '提交产品建议或问题反馈；如需及时协助，可直接进入客服对话。',
                ),
              ),
            ],
          ),
        ),
        _Surface(
          padding: EdgeInsets.zero,
          child: InkWell(
            onTap: () {
              _notice(context, '正在进入客服对话 · 当前消息仅保存在本机');
              context.go('/messages');
            },
            child: const ListTile(
              leading: Icon(
                Icons.support_agent_rounded,
                color: AirvanaColors.accent,
              ),
              title: Text(
                '联系客服',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900),
              ),
              subtitle: Text(
                '咨询账号、作品与权益问题 · 本地演示',
                style: TextStyle(fontSize: 9),
              ),
              trailing: Icon(Icons.chevron_right_rounded),
            ),
          ),
        ),
        _Surface(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const _SectionTitle(
                '提交意见反馈',
                subtitle: '我们会根据类型整理问题并持续优化 · 至少 8 个字',
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 7,
                runSpacing: 7,
                children:
                    const {
                          'product': '产品建议',
                          'bug': '功能异常',
                          'content': '内容与社区',
                          'account': '账号与安全',
                        }.entries
                        .map(
                          (entry) => ChoiceChip(
                            key: ValueKey('feedback-category-${entry.key}'),
                            label: Text(entry.value),
                            selected: _category == entry.key,
                            backgroundColor: _fieldFill,
                            selectedColor: const Color(0xFFFFF1F2),
                            checkmarkColor: const Color(0xFFC62836),
                            side: BorderSide(
                              color: _category == entry.key
                                  ? const Color(0xFFFF9099)
                                  : AirvanaColors.line,
                              width: 1,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(13),
                            ),
                            labelStyle: TextStyle(
                              color: _category == entry.key
                                  ? const Color(0xFFC62836)
                                  : const Color(0xFF636366),
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                            ),
                            onSelected: (_) =>
                                setState(() => _category = entry.key),
                          ),
                        )
                        .toList(growable: false),
              ),
              const SizedBox(height: 12),
              TextField(
                key: const ValueKey('feedback-body'),
                controller: _body,
                maxLength: 500,
                minLines: 4,
                maxLines: 7,
                onChanged: (_) => setState(() {}),
                decoration: const InputDecoration(
                  labelText: '反馈内容',
                  hintText: '请描述遇到的问题、发生页面与期望结果…',
                  filled: true,
                  fillColor: _fieldFill,
                  border: _fieldBorder,
                  enabledBorder: _fieldBorder,
                  focusedBorder: _fieldFocusedBorder,
                  disabledBorder: _fieldBorder,
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                key: const ValueKey('feedback-contact'),
                controller: _contact,
                maxLength: 80,
                decoration: const InputDecoration(
                  labelText: '联系方式（选填）',
                  hintText: '邮箱或手机号',
                  filled: true,
                  fillColor: _fieldFill,
                  border: _fieldBorder,
                  enabledBorder: _fieldBorder,
                  focusedBorder: _fieldFocusedBorder,
                  disabledBorder: _fieldBorder,
                ),
              ),
              const _Boundary(title: '隐私提醒', text: '请勿填写密码、验证码、助记词或身份证件等敏感信息。'),
              const SizedBox(height: 12),
              _PrimaryAction(
                label: '保存意见反馈',
                onPressed: _body.text.trim().length >= 8
                    ? () => _submit(context, ref, state)
                    : null,
              ),
              const SizedBox(height: 8),
              const Text(
                '当前版本仅保存在本设备，不会发送给客服；正式提交需接入后端工单服务。',
                style: TextStyle(
                  color: AirvanaColors.muted,
                  fontSize: 9,
                  height: 1.5,
                ),
              ),
            ],
          ),
        ),
        _Surface(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _SectionTitle(
                '反馈记录',
                trailing: '${state.feedbackTickets.length} 条本地记录',
              ),
              const SizedBox(height: 10),
              if (state.feedbackTickets.isEmpty)
                const Text(
                  '暂无反馈记录',
                  style: TextStyle(color: AirvanaColors.muted, fontSize: 10),
                )
              else
                for (final ticket in state.feedbackTickets.take(8))
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: const CircleAvatar(
                      backgroundColor: Color(0xFFFFF1F2),
                      child: Icon(
                        Icons.description_outlined,
                        color: AirvanaColors.accent,
                      ),
                    ),
                    title: Text(
                      '${ticket['body']}',
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    subtitle: Text(
                      '${ticket['category_label']} · 本地记录${('${ticket['contact']}').isNotEmpty ? ' · 已留联系方式' : ''}',
                      style: const TextStyle(fontSize: 8),
                    ),
                  ),
            ],
          ),
        ),
      ],
    ),
  );

  Future<void> _submit(
    BuildContext context,
    WidgetRef ref,
    LocalProfileFeatureState state,
  ) async {
    const labels = {
      'product': '产品建议',
      'bug': '功能异常',
      'content': '内容与社区',
      'account': '账号与安全',
    };
    final ticket = {
      'id': 'feedback-${DateTime.now().microsecondsSinceEpoch}',
      'category': _category,
      'category_label': labels[_category],
      'body': _body.text.trim(),
      'contact': _contact.text.trim(),
      'created_at': DateTime.now().toUtc().toIso8601String(),
      'status': 'local-record',
    };
    await _saveFeatureState(
      context,
      ref,
      state.copyWith(feedbackTickets: [ticket, ...state.feedbackTickets]),
      message: '意见反馈已保存到当前设备',
    );
    _body.clear();
    _contact.clear();
    if (mounted) setState(() {});
  }
}

class _ProductCenterPage extends ConsumerStatefulWidget {
  const _ProductCenterPage();

  @override
  ConsumerState<_ProductCenterPage> createState() => _ProductCenterPageState();
}

class _ProductCenterPageState extends ConsumerState<_ProductCenterPage> {
  String _tab = 'map';

  static const _capabilities = [
    ('R01', '品牌启动页', '前端已展示'),
    ('R02', '登录与账号安全', '现有服务'),
    ('R03', '创作自己的 AI 分身', '前端已展示'),
    ('R04', 'AI 分身空间与渠道', '前端已展示'),
    ('R05', 'Agentic Playable 体验', '前端已展示'),
    ('R06', '发现与增长网络', '前端已展示'),
    ('R07', '通知、互动与私信', '前端已展示'),
    ('R08', '全局搜索', '前端已展示'),
    ('R09', '关注与互动关系', '前端已展示'),
    ('R10', '创作者中心', '前端已展示'),
    ('R11', 'AI 创作流程', '前端已展示'),
    ('R12', 'Asset Manifest', '前端已展示'),
    ('R13', 'Remix 与版本', '前端已展示'),
    ('R14', '审核与发布门禁', '前端已展示'),
    ('R15', '外部发布连接器', '外部服务待接'),
    ('R16', 'Campaign Brief → Contract', '前端已展示'),
    ('R17', '效果归因证据', '服务端待接'),
    ('R18', 'AIP / AIT 钱包', '服务端待接'),
    ('R19', 'AIP 站内权益中心', '前端已展示'),
    ('R20', 'KYC 与角色认证', '第三方待接'),
    ('R21', '五人增长网络节点', '前端已展示'),
    ('R22', '客服与未成年人模式', '前端已展示'),
    ('R23', '治理、风控与 Kill Switch', '服务端待接'),
    ('R24', '国际化与无障碍', '部分展示'),
    ('R25', '账号、数据与外部服务', '架构已标注'),
    ('R26', '测试、监控与发布质量', '前端已展示'),
  ];

  @override
  Widget build(BuildContext context) => _FeatureAsync(
    builder: (context, ref, state) {
      final visible = state.productRoleView == 'kol'
          ? _capabilities
          : _capabilities
                .where(
                  (item) => !const {
                    'R03',
                    'R04',
                    'R10',
                    'R12',
                    'R13',
                    'R14',
                    'R15',
                    'R16',
                    'R17',
                  }.contains(item.$1),
                )
                .toList(growable: false);
      return _PageList(
        keyName: 'product-center-parity',
        children: [
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: AirvanaColors.ink,
              borderRadius: BorderRadius.circular(22),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'AIRVANA FRONTEND DELIVERY MAP',
                  style: TextStyle(
                    color: Colors.white60,
                    fontSize: 8,
                    letterSpacing: 1.2,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  '前端交付与依赖地图',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  '基线共 26 项结构化需求 · 当前 ${visible.length} 项${state.productRoleView == 'kol' ? 'KOL' : '玩家'}视角可见 · 后端阶段暂缓',
                  style: const TextStyle(
                    color: Colors.white70,
                    fontSize: 9,
                    height: 1.5,
                  ),
                ),
              ],
            ),
          ),
          _Surface(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _SectionTitle(
                  '角色视角',
                  subtitle: '按使用场景过滤功能，不改变账号身份',
                  trailing: state.productRoleView == 'kol'
                      ? 'KOL 权限 · 本地演示'
                      : '玩家视角',
                ),
                const SizedBox(height: 10),
                SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(value: 'player', label: Text('玩家')),
                    ButtonSegment(value: 'kol', label: Text('KOL')),
                  ],
                  selected: {state.productRoleView},
                  onSelectionChanged: (value) => _saveFeatureState(
                    context,
                    ref,
                    state.copyWith(productRoleView: value.first),
                    message: '角色视角已切换，不改变账号权限',
                  ),
                ),
              ],
            ),
          ),
          const _Boundary(
            title: '权限不升级',
            text: '角色切换只改变功能列表；不会自动完成 KYC、开通创作者、节点、发布、渠道或结算权限。',
          ),
          Row(
            children:
                {
                      'map': '功能地图',
                      'services': '服务依赖',
                      'quality': '质量门禁',
                      'demo': '演示控制',
                    }.entries
                    .map(
                      (entry) => Expanded(
                        child: ChoiceChip(
                          label: Text(entry.value),
                          selected: _tab == entry.key,
                          onSelected: (_) => setState(() => _tab = entry.key),
                        ),
                      ),
                    )
                    .toList(growable: false),
          ),
          if (_tab == 'map')
            ...visible.map(
              (item) => _Surface(
                padding: EdgeInsets.zero,
                child: InkWell(
                  key: ValueKey('capability-${item.$1}'),
                  onTap: () => _openCapability(context, item.$1),
                  child: ListTile(
                    leading: CircleAvatar(
                      radius: 18,
                      backgroundColor: const Color(0xFFFFF1F2),
                      child: Text(
                        item.$1,
                        style: const TextStyle(
                          color: AirvanaColors.accent,
                          fontSize: 8,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                    title: Text(
                      item.$2,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    trailing: _StatusPill(
                      item.$3,
                      good: item.$3.contains('已展示'),
                    ),
                  ),
                ),
              ),
            )
          else if (_tab == 'services') ...[
            const _Surface(
              child: _SectionTitle('前端本机层', subtitle: '页面、交互、校验、本机数据与审计 · 已交付'),
            ),
            const _Surface(
              child: _SectionTitle(
                'Airvana 服务层',
                subtitle: '账号同步、授权、归因与结算 · 待接入',
              ),
            ),
            const _Surface(
              child: _SectionTitle('第三方与渠道层', subtitle: 'KYC、外部发布与钱包签名 · 外部依赖'),
            ),
            const _Boundary(
              title: '当前交付口径',
              text:
                  '页面、状态、交互、路由、表单校验与本地审计可演示；账号同步、外部渠道、KYC、权威归因和商业结算仍需后端或第三方服务。',
            ),
          ] else if (_tab == 'quality') ...[
            const _Surface(
              child: _SectionTitle(
                '可访问性与触控目标',
                subtitle: '44px 触控、语义标签与键盘路径 · 已检查',
              ),
            ),
            const _Surface(
              child: _SectionTitle(
                '响应式与安全区',
                subtitle: '390 / 430 / 932 设备画布 · 已检查',
              ),
            ),
            const _Surface(
              child: _SectionTitle(
                '边界与失败关闭',
                subtitle: 'LOCAL / DEMO / SERVER 状态不混淆 · 已检查',
              ),
            ),
            _PrimaryAction(
              label: '运行前端自检（演示）',
              onPressed: () => _notice(
                context,
                '${visible.length} 项${state.productRoleView == 'kol' ? 'KOL' : '玩家'}视角功能已检查，账号权限未改变',
              ),
            ),
          ] else ...[
            _Surface(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _SectionTitle(
                    '运行环境',
                    subtitle: '生产环境会停用启动演示弹窗',
                    trailing: state.frontendEnvironment == 'test'
                        ? '测试环境'
                        : '生产环境',
                  ),
                  const SizedBox(height: 10),
                  SegmentedButton<String>(
                    segments: const [
                      ButtonSegment(value: 'test', label: Text('测试环境')),
                      ButtonSegment(value: 'production', label: Text('生产环境')),
                    ],
                    selected: {state.frontendEnvironment},
                    onSelectionChanged: (value) => _saveFeatureState(
                      context,
                      ref,
                      state.copyWith(frontendEnvironment: value.first),
                      message:
                          '展示环境已切换为${value.first == 'test' ? '测试' : '生产'}环境',
                    ),
                  ),
                ],
              ),
            ),
            _Surface(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const _SectionTitle('网络模拟', subtitle: '只影响当前设备的演示状态'),
                  const SizedBox(height: 8),
                  SegmentedButton<String>(
                    segments: const [
                      ButtonSegment(value: 'normal', label: Text('正常')),
                      ButtonSegment(value: 'weak', label: Text('弱网')),
                      ButtonSegment(value: 'offline', label: Text('离线')),
                    ],
                    selected: {state.networkProfile},
                    onSelectionChanged: state.frontendEnvironment == 'test'
                        ? (value) => _saveFeatureState(
                            context,
                            ref,
                            state.copyWith(networkProfile: value.first),
                            message: '网络模拟已更新',
                          )
                        : null,
                  ),
                ],
              ),
            ),
            _Surface(
              child: SwitchListTile.adaptive(
                contentPadding: EdgeInsets.zero,
                value: state.nonFinancialMode,
                title: const Text(
                  '非金融模式',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900),
                ),
                subtitle: const Text(
                  '锁定钱包、Token、外部分发与结算',
                  style: TextStyle(fontSize: 9),
                ),
                onChanged: state.frontendEnvironment == 'test'
                    ? (value) => _saveFeatureState(
                        context,
                        ref,
                        state.copyWith(nonFinancialMode: value),
                      )
                    : null,
              ),
            ),
          ],
        ],
      );
    },
  );

  void _openCapability(BuildContext context, String id) {
    final target = switch (id) {
      'R03' || 'R04' => '/profile/secondary/aiTwin',
      'R05' => '/',
      'R06' => '/discover',
      'R07' => '/messages',
      'R09' => '/profile/secondary/followers',
      'R10' => '/profile/secondary/creatorCenter',
      'R11' || 'R12' => '/create',
      'R14' || 'R15' || 'R23' => '/profile/secondary/publishingGovernance',
      'R16' || 'R17' => '/profile/secondary/brandPartnership',
      'R18' => '/profile/secondary/wallet',
      'R19' => '/profile/secondary/creatorBenefits',
      'R20' => '/profile/secondary/identityVerification',
      'R21' => '/world',
      'R22' => '/profile/secondary/feedback',
      'R24' => '/profile/secondary/language',
      'R02' || 'R25' => '/profile/secondary/preferences',
      _ => null,
    };
    if (target == null) {
      _notice(context, id == 'R01' ? '启动页会在每次冷启动时自动展示' : '该质量能力已在当前页面展示');
    } else {
      context.push(target);
    }
  }
}

class _LanguagePage extends ConsumerWidget {
  const _LanguagePage();

  @override
  Widget build(BuildContext context, WidgetRef ref) => _FeatureAsync(
    builder: (context, ref, state) => _PageList(
      keyName: 'language-parity',
      children: [
        _Surface(
          padding: EdgeInsets.zero,
          child: Column(
            children: [
              ListTile(
                key: const ValueKey('language-zh-CN'),
                leading: const Text('中', style: TextStyle(fontSize: 16)),
                title: const Text(
                  '简体中文',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900),
                ),
                trailing: const Text(
                  '✓',
                  style: TextStyle(
                    color: AirvanaColors.accent,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                onTap: () => _saveFeatureState(
                  context,
                  ref,
                  state.copyWith(uiLanguage: 'zh-CN'),
                  message: '语言已切换为简体中文',
                ),
              ),
              const Divider(height: 1),
              ListTile(
                key: const ValueKey('language-en'),
                leading: const Text('EN', style: TextStyle(fontSize: 14)),
                title: const Text(
                  'English',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900),
                ),
                trailing: const Text(
                  '待接入',
                  style: TextStyle(
                    color: AirvanaColors.muted,
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                onTap: () => _notice(context, 'English 语言包尚未接入'),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

class _PreferencesPage extends ConsumerWidget {
  const _PreferencesPage();

  @override
  Widget build(BuildContext context, WidgetRef ref) => _FeatureAsync(
    builder: (context, ref, state) => _PageList(
      keyName: 'preferences-parity',
      children: [
        _SettingsSurface(
          key: const ValueKey('settings-display-surface'),
          child: Column(
            children: [
              _SettingsPushRow(
                key: const ValueKey('settings-push-toggle'),
                value: state.pushEnabled,
                onChanged: (value) => _saveFeatureState(
                  context,
                  ref,
                  state.copyWith(pushEnabled: value),
                  message: value ? '已开启站内弹窗提醒' : '已关闭站内弹窗提醒，消息仍会保留',
                ),
              ),
              const Divider(
                key: ValueKey('settings-display-divider'),
                height: 1,
                thickness: 1,
                color: AirvanaColors.line,
              ),
              _SettingsThemeRow(
                value: state.themeMode,
                onChanged: (value) => _saveFeatureState(
                  context,
                  ref,
                  state.copyWith(themeMode: value),
                  message:
                      '外观偏好已保存为${value == 'system'
                          ? '跟随系统'
                          : value == 'light'
                          ? '浅色'
                          : '深色'}',
                ),
              ),
            ],
          ),
        ),
        _SettingsSurface(
          key: const ValueKey('settings-links-surface'),
          child: Column(
            children: [
              _SettingsLink(
                icon: Icons.description_outlined,
                label: '服务协议',
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => const ProfileLegalDocumentScreen(
                      type: AirvanaLegalDocumentType.terms,
                    ),
                  ),
                ),
              ),
              _SettingsLink(
                icon: Icons.shield_outlined,
                label: '隐私政策',
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => const ProfileLegalDocumentScreen(
                      type: AirvanaLegalDocumentType.privacy,
                    ),
                  ),
                ),
              ),
              _SettingsLink(
                icon: Icons.sync_rounded,
                label: '版本更新',
                trailing: 'v1.0.0',
                onTap: () => _notice(context, '当前已是最新版本 v1.0.0'),
              ),
              _SettingsLink(
                icon: Icons.info_outline_rounded,
                label: '关于我们',
                last: true,
                onTap: () => _showInfo(
                  context,
                  '关于 Airvana',
                  '让每一个 KOL 创作并运营属于自己的 Agentic Playable。',
                ),
              ),
            ],
          ),
        ),
        _SettingsSurface(
          key: const ValueKey('settings-delete-surface'),
          child: _SettingsLink(
            icon: Icons.delete_outline_rounded,
            label: '删除账号',
            subtitle: '提交申请后进入 30 天冷静期，可随时取消',
            danger: true,
            last: true,
            onTap: () => context.push('/profile/secondary/deleteAccount'),
          ),
        ),
      ],
    ),
  );

  Future<void> _showInfo(BuildContext context, String title, String body) =>
      showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(title),
          content: Text(body),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('知道了'),
            ),
          ],
        ),
      );
}

class _SettingsSurface extends StatelessWidget {
  const _SettingsSurface({required this.child, super.key});

  final Widget child;

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    clipBehavior: Clip.antiAlias,
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: AirvanaColors.line, width: 1),
    ),
    child: child,
  );
}

class _SettingsPushRow extends StatelessWidget {
  const _SettingsPushRow({
    required this.value,
    required this.onChanged,
    super.key,
  });

  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) => Semantics(
    toggled: value,
    button: true,
    label: '站内弹窗提醒',
    child: InkWell(
      onTap: () => onChanged(!value),
      child: SizedBox(
        height: 60,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 15),
          child: Row(
            children: [
              const _SettingsIcon(Icons.notifications_none_rounded),
              const SizedBox(width: 12),
              const Expanded(
                child: _SettingsRowLabel(
                  title: '站内弹窗提醒',
                  subtitle: '关闭后消息仍会保留',
                ),
              ),
              _WebSettingsSwitch(value: value),
            ],
          ),
        ),
      ),
    ),
  );
}

class _SettingsThemeRow extends StatelessWidget {
  const _SettingsThemeRow({required this.value, required this.onChanged});

  final String value;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) => ConstrainedBox(
    constraints: const BoxConstraints(minHeight: 66),
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 9),
      child: Row(
        children: [
          const _SettingsIcon(Icons.contrast_rounded),
          const SizedBox(width: 12),
          const Expanded(
            child: _SettingsRowLabel(title: '外观模式', subtitle: '跟随系统或手动选择主题'),
          ),
          _ThemeModeControl(value: value, onChanged: onChanged),
        ],
      ),
    ),
  );
}

class _SettingsIcon extends StatelessWidget {
  const _SettingsIcon(this.icon, {this.danger = false});

  final IconData icon;
  final bool danger;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 20,
    child: Icon(
      icon,
      size: 19,
      color: danger ? const Color(0xFFC62836) : AirvanaColors.ink,
    ),
  );
}

class _SettingsRowLabel extends StatelessWidget {
  const _SettingsRowLabel({required this.title, required this.subtitle});

  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) => Column(
    mainAxisAlignment: MainAxisAlignment.center,
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        title,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(
          color: AirvanaColors.ink,
          fontSize: 13,
          fontWeight: FontWeight.w900,
        ),
      ),
      const SizedBox(height: 3),
      Text(
        subtitle,
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(
          color: AirvanaColors.muted,
          fontSize: 9,
          height: 1.35,
        ),
      ),
    ],
  );
}

class _WebSettingsSwitch extends StatelessWidget {
  const _WebSettingsSwitch({required this.value});

  final bool value;

  @override
  Widget build(BuildContext context) => AnimatedContainer(
    duration: const Duration(milliseconds: 180),
    curve: Curves.easeOutCubic,
    width: 42,
    height: 24,
    padding: const EdgeInsets.all(3),
    alignment: value ? Alignment.centerRight : Alignment.centerLeft,
    decoration: BoxDecoration(
      color: value ? AirvanaColors.accent : const Color(0xFFD1D1D6),
      borderRadius: BorderRadius.circular(999),
    ),
    child: Container(
      width: 18,
      height: 18,
      decoration: const BoxDecoration(
        color: Colors.white,
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: Color(0x26000000),
            blurRadius: 3,
            offset: Offset(0, 1),
          ),
        ],
      ),
    ),
  );
}

class _ThemeModeControl extends StatelessWidget {
  const _ThemeModeControl({required this.value, required this.onChanged});

  final String value;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) => Container(
    key: const ValueKey('settings-theme-control'),
    height: 34,
    padding: const EdgeInsets.all(3),
    decoration: BoxDecoration(
      color: const Color(0xFFF2F2F7),
      borderRadius: BorderRadius.circular(999),
      border: Border.all(color: AirvanaColors.line, width: 1),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _ThemeModeOption(
          key: const ValueKey('settings-theme-system'),
          label: '系统',
          selected: value == 'system',
          onTap: () => onChanged('system'),
        ),
        _ThemeModeOption(
          key: const ValueKey('settings-theme-light'),
          label: '浅色',
          selected: value == 'light',
          onTap: () => onChanged('light'),
        ),
        _ThemeModeOption(
          key: const ValueKey('settings-theme-dark'),
          label: '深色',
          selected: value == 'dark',
          onTap: () => onChanged('dark'),
        ),
      ],
    ),
  );
}

class _ThemeModeOption extends StatelessWidget {
  const _ThemeModeOption({
    required this.label,
    required this.selected,
    required this.onTap,
    super.key,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Material(
    color: Colors.transparent,
    child: InkWell(
      borderRadius: BorderRadius.circular(999),
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 160),
        padding: const EdgeInsets.symmetric(horizontal: 9),
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: selected ? Colors.white : Colors.transparent,
          borderRadius: BorderRadius.circular(999),
          boxShadow: selected
              ? const [
                  BoxShadow(
                    color: Color(0x14000000),
                    blurRadius: 5,
                    offset: Offset(0, 1),
                  ),
                ]
              : null,
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? AirvanaColors.ink : const Color(0xFF636366),
            fontSize: 9,
            fontWeight: FontWeight.w900,
          ),
        ),
      ),
    ),
  );
}

class _AccountDeletionPage extends StatelessWidget {
  const _AccountDeletionPage();

  @override
  Widget build(BuildContext context) => _PageList(
    keyName: 'delete-account-parity',
    children: [
      Container(
        key: const ValueKey('delete-account-hero'),
        width: double.infinity,
        padding: const EdgeInsets.fromLTRB(17, 20, 17, 20),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFFFFF4F5), Colors.white],
          ),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFFFFD6DA), width: 1),
        ),
        child: const Column(
          children: [
            DecoratedBox(
              decoration: BoxDecoration(
                color: Color(0xFFFFE4E7),
                borderRadius: BorderRadius.all(Radius.circular(18)),
              ),
              child: SizedBox(
                width: 52,
                height: 52,
                child: Icon(
                  Icons.delete_outline_rounded,
                  size: 25,
                  color: Color(0xFFC62836),
                ),
              ),
            ),
            SizedBox(height: 13),
            Text(
              '申请删除 Airvana 账号',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
            ),
            SizedBox(height: 8),
            Text(
              '提交后进入 30 天冷静期，期间账号与数据仍会保留，你可以随时取消申请。到期删除由服务端执行并记录审计结果。',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Color(0xFF636366),
                fontSize: 11,
                height: 1.75,
              ),
            ),
          ],
        ),
      ),
      Container(
        key: const ValueKey('delete-account-checklist'),
        width: double.infinity,
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(15),
          border: Border.all(color: AirvanaColors.line, width: 1),
        ),
        child: const Text.rich(
          TextSpan(
            children: [
              TextSpan(
                text: '提交前请确认\n',
                style: TextStyle(
                  color: Color(0xFF1C1C1E),
                  fontWeight: FontWeight.w900,
                ),
              ),
              TextSpan(
                text:
                    '• 先完成待处理的品牌合作、AIT 权益申领与独立付款结算\n'
                    '• 可先导出账号数据留存\n'
                    '• Airvana 不会也无法删除你的外部数字钱包或链上记录',
              ),
            ],
          ),
          style: TextStyle(color: Color(0xFF636366), fontSize: 11, height: 1.7),
        ),
      ),
      const _Boundary(
        title: '当前为前端演示模式',
        text: '不会在本机伪造删除申请。连接账号服务后，才会显示数据导出、确认输入和真实提交入口。',
      ),
    ],
  );
}

class _SettingsLink extends StatelessWidget {
  const _SettingsLink({
    required this.icon,
    required this.label,
    required this.onTap,
    this.subtitle,
    this.trailing,
    this.last = false,
    this.danger = false,
  });

  final IconData icon;
  final String label;
  final String? subtitle;
  final String? trailing;
  final VoidCallback onTap;
  final bool last;
  final bool danger;

  @override
  Widget build(BuildContext context) => Column(
    children: [
      InkWell(
        onTap: onTap,
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: subtitle == null ? 56 : 62),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 9),
            child: Row(
              children: [
                _SettingsIcon(icon, danger: danger),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        label,
                        style: TextStyle(
                          color: danger
                              ? const Color(0xFFC62836)
                              : AirvanaColors.ink,
                          fontSize: 13,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      if (subtitle != null) ...[
                        const SizedBox(height: 3),
                        Text(
                          subtitle!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: AirvanaColors.muted,
                            fontSize: 9,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                if (trailing != null) ...[
                  Text(
                    trailing!,
                    style: const TextStyle(
                      color: AirvanaColors.muted,
                      fontSize: 9,
                    ),
                  ),
                  const SizedBox(width: 3),
                ],
                const Icon(
                  Icons.chevron_right_rounded,
                  color: AirvanaColors.muted,
                  size: 20,
                ),
              ],
            ),
          ),
        ),
      ),
      if (!last)
        Divider(
          key: ValueKey('settings-link-divider-$label'),
          height: 1,
          thickness: 1,
          color: AirvanaColors.line,
        ),
    ],
  );
}
