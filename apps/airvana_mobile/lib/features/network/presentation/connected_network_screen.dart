import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/design_system/app_state_view.dart';
import 'package:airvana_mobile/features/shared/domain/airvana_models.dart';
import 'package:airvana_mobile/features/shared/presentation/local_demo_screens.dart';
import 'package:airvana_mobile/design_system/airvana_shared_cards.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ConnectedNetworkScreen extends ConsumerStatefulWidget {
  const ConnectedNetworkScreen({super.key});

  @override
  ConsumerState<ConnectedNetworkScreen> createState() =>
      _ConnectedNetworkScreenState();
}

class _ConnectedNetworkScreenState
    extends ConsumerState<ConnectedNetworkScreen> {
  /// Web 的 growthNetwork panel 分四个 tab，这里保持同一套。
  static const _tabs = <(String, String)>[
    ('network', '网络'),
    ('node', '我的连接'),
    ('contribution', '贡献'),
    ('rules', '规则'),
  ];

  String _tab = 'node';

  @override
  Widget build(BuildContext context) {
    final repository = ref.watch(airvanaRepositoryProvider);
    if (repository.environment.preferLocalData) {
      return const LocalNetworkScreen();
    }
    final nodes = ref.watch(growthNodesProvider);
    return SafeArea(
      bottom: false,
      child: Column(
        children: [
          _NetworkHeader(
            onCreate: () => _showCreateNode(context, ref),
            onJoin: () => _showJoinNode(context, ref),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (final tab in _tabs)
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        key: ValueKey('growth-tab-${tab.$1}'),
                        label: Text(
                          tab.$2,
                          style: const TextStyle(fontSize: 11),
                        ),
                        selected: _tab == tab.$1,
                        onSelected: (_) => setState(() => _tab = tab.$1),
                      ),
                    ),
                ],
              ),
            ),
          ),
          if (_tab != 'node')
            Expanded(child: _GrowthNarrative(tab: _tab))
          else
          Expanded(
            child: nodes.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => AppStateView(
                icon: Icons.cloud_off_rounded,
                title: '节点数据加载失败',
                message: '$error',
                actionLabel: '重试',
                onAction: () => ref.invalidate(growthNodesProvider),
              ),
              data: (items) => items.isEmpty
                  ? AppStateView(
                      icon: Icons.hub_outlined,
                      title: '还没有加入增长节点',
                      message: '创建一个五人协作节点，或输入邀请码占用一个席位。',
                      actionLabel: '输入邀请码',
                      onAction: () => _showJoinNode(context, ref),
                    )
                  : RefreshIndicator(
                      onRefresh: () async {
                        ref.invalidate(growthNodesProvider);
                        await ref.read(growthNodesProvider.future);
                      },
                      child: ListView.separated(
                        key: const ValueKey('connected-growth-nodes'),
                        padding: const EdgeInsets.fromLTRB(16, 10, 16, 110),
                        itemCount: items.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (_, index) => _NodeCard(items[index]),
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _showCreateNode(BuildContext context, WidgetRef ref) async {
    final value = await _showTextEntry(
      context,
      title: '创建五人协作节点',
      hint: '节点名称',
      initialValue: '我的五人协作节点',
      confirmLabel: '创建',
    );
    if (value == null || value.trim().isEmpty || !context.mounted) return;
    await _mutate(context, ref, () {
      return ref.read(airvanaRepositoryProvider).createGrowthNode(value.trim());
    }, '节点已创建');
  }

  Future<void> _showJoinNode(BuildContext context, WidgetRef ref) async {
    final value = await _showTextEntry(
      context,
      title: '加入增长节点',
      hint: '8 位邀请码',
      confirmLabel: '加入',
      capitalization: TextCapitalization.characters,
    );
    if (value == null || value.trim().isEmpty || !context.mounted) return;
    await _mutate(context, ref, () {
      return ref.read(airvanaRepositoryProvider).joinGrowthNode(value);
    }, '已加入节点');
  }

  Future<void> _mutate(
    BuildContext context,
    WidgetRef ref,
    Future<void> Function() operation,
    String success,
  ) async {
    try {
      await operation();
      ref.invalidate(growthNodesProvider);
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(success)));
    } catch (error) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('操作未完成：$error')));
    }
  }
}

class _NetworkHeader extends StatelessWidget {
  const _NetworkHeader({required this.onCreate, required this.onJoin});

  final VoidCallback onCreate;
  final VoidCallback onJoin;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(18, 8, 10, 8),
    child: Row(
      children: [
        const Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '增长节点',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900),
              ),
              Text(
                'SERVER · 五人席位与邀请码由服务端确认',
                style: TextStyle(color: AirvanaColors.muted, fontSize: 9),
              ),
            ],
          ),
        ),
        IconButton(
          tooltip: '输入邀请码',
          onPressed: onJoin,
          icon: const Icon(Icons.group_add_outlined),
        ),
        IconButton(
          tooltip: '创建节点',
          onPressed: onCreate,
          icon: const Icon(Icons.add_circle_outline_rounded),
        ),
      ],
    ),
  );
}

class _NodeCard extends StatelessWidget {
  const _NodeCard(this.node);

  final GrowthNode node;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: AirvanaColors.line),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                node.name,
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
            _StatusChip(status: node.status),
          ],
        ),
        const SizedBox(height: 6),
        Text(
          '我的席位 ${node.mySeat == 0 ? '未确认' : node.mySeat} · ${node.members.length}/5 人',
          style: const TextStyle(color: AirvanaColors.muted, fontSize: 11),
        ),
        const SizedBox(height: 14),
        Row(
          children: List.generate(5, (index) {
            final seat = index + 1;
            GrowthNodeMember? member;
            for (final candidate in node.members) {
              if (candidate.seat == seat) member = candidate;
            }
            return Expanded(
              child: _Seat(
                seat: seat,
                member: member,
                mine: node.mySeat == seat,
              ),
            );
          }),
        ),
        if (node.inviteCode.isNotEmpty) ...[
          const SizedBox(height: 14),
          InkWell(
            onTap: () async {
              await Clipboard.setData(ClipboardData(text: node.inviteCode));
              if (!context.mounted) return;
              ScaffoldMessenger.of(
                context,
              ).showSnackBar(const SnackBar(content: Text('邀请码已复制')));
            },
            borderRadius: BorderRadius.circular(12),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: const Color(0xFFF7F7FA),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  const Icon(Icons.key_rounded, size: 17),
                  const SizedBox(width: 8),
                  Text(
                    '邀请码 ${node.inviteCode}',
                    style: const TextStyle(fontWeight: FontWeight.w900),
                  ),
                  const Spacer(),
                  const Icon(Icons.copy_rounded, size: 16),
                ],
              ),
            ),
          ),
        ],
      ],
    ),
  );
}

class _Seat extends StatelessWidget {
  const _Seat({required this.seat, required this.member, required this.mine});

  final int seat;
  final GrowthNodeMember? member;
  final bool mine;

  @override
  Widget build(BuildContext context) => Column(
    children: [
      CircleAvatar(
        radius: 18,
        backgroundColor: mine
            ? const Color(0xFFFFE6E9)
            : member == null
            ? const Color(0xFFF0F0F4)
            : const Color(0xFFEAF8EF),
        child: Text(
          member?.displayName.characters.firstOrNull ?? '$seat',
          style: TextStyle(
            color: mine ? AirvanaColors.accent : AirvanaColors.ink,
            fontWeight: FontWeight.w900,
          ),
        ),
      ),
      const SizedBox(height: 5),
      Text(
        member == null ? '席位 $seat' : member!.displayName,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(fontSize: 8),
      ),
    ],
  );
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
    decoration: BoxDecoration(
      color: status == 'active'
          ? const Color(0xFFEAF8EF)
          : const Color(0xFFFFF4E5),
      borderRadius: BorderRadius.circular(999),
    ),
    child: Text(
      status == 'active'
          ? '已激活'
          : status == 'paused'
          ? '已暂停'
          : '组建中',
      style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w900),
    ),
  );
}

Future<String?> _showTextEntry(
  BuildContext context, {
  required String title,
  required String hint,
  required String confirmLabel,
  String initialValue = '',
  TextCapitalization capitalization = TextCapitalization.none,
}) async {
  final controller = TextEditingController(text: initialValue);
  final result = await showDialog<String>(
    context: context,
    builder: (dialogContext) => AlertDialog(
      title: Text(title),
      content: TextField(
        controller: controller,
        autofocus: true,
        textCapitalization: capitalization,
        decoration: InputDecoration(hintText: hint),
        onSubmitted: (value) => Navigator.pop(dialogContext, value),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(dialogContext),
          child: const Text('取消'),
        ),
        FilledButton(
          onPressed: () => Navigator.pop(dialogContext, controller.text),
          child: Text(confirmLabel),
        ),
      ],
    ),
  );
  controller.dispose();
  return result;
}

/// Web 的增长网络面板里，「网络 / 贡献 / 规则」三个 tab 是说明性内容，
/// 数值部分需要服务端确认，因此这里只呈现结构与边界，不编造指标。
class _GrowthNarrative extends StatelessWidget {
  const _GrowthNarrative({required this.tab});

  final String tab;

  static const _content = <String, (String, List<String>, String)>{
    'network': (
      'Airvana 的持续增长飞轮',
      [
        '一个用户 → 一个 AI 分身 → 多个 Agentic Playable',
        '五人成节点，一人一个主要经济节点',
        '节点内角色分工：发起人 / 创作者 / 分发者 / 运营者 / 验证者',
      ],
      '网络结构为产品设计；真实节点状态由服务端确认。',
    ),
    'contribution': (
      '贡献以证据为准',
      [
        '贡献来自可验证结果，不按主观投入计分',
        '信用分达到 650 才能申请经济节点',
        '每笔贡献都保留归因证据链，可回溯到具体事件',
      ],
      '信用分与贡献值需要服务端归因服务确认，本机不展示估算值。',
    ),
    'rules': (
      'NODE CHARTER · 产品规则',
      [
        '节点生命周期：招募 → 待确认 → 试运行 → 运行中',
        '支持暂停、退出与申诉，操作均留痕',
        '经济权限需要额外门槛：KYC 通过且信用分达标',
      ],
      '结算边界：节点关系不产生任何自动付款；反作弊与申诉由服务端裁决。',
    ),
  };

  @override
  Widget build(BuildContext context) {
    final entry = _content[tab]!;
    return ListView(
      key: ValueKey('growth-narrative-$tab'),
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 110),
      children: [
        Text(
          entry.$1,
          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 12),
        for (final line in entry.$2)
          Container(
            margin: const EdgeInsets.only(bottom: 9),
            padding: const EdgeInsets.all(13),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AirvanaColors.line),
            ),
            child: Text(
              line,
              style: const TextStyle(fontSize: 12, height: 1.6),
            ),
          ),
        const SizedBox(height: 4),
        BoundaryCard(
          key: ValueKey('growth-boundary-$tab'),
          title: '边界',
          body: entry.$3,
        ),
      ],
    );
  }
}
