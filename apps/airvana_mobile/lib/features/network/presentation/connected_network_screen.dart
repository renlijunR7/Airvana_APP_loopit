import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/design_system/app_state_view.dart';
import 'package:airvana_mobile/features/shared/domain/airvana_models.dart';
import 'package:airvana_mobile/features/shared/presentation/local_demo_screens.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class ConnectedNetworkScreen extends ConsumerWidget {
  const ConnectedNetworkScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
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
