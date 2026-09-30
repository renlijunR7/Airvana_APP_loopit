import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/history/presentation/experience_history_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// 全局 AI 分身工作台，对应 Web 的 `panel:'globalAi'`。
///
/// 口径与 Web 一致：自然语言只用于理解、建议与任务路由；分身不会直接发布作品、
/// 确认 Campaign、改变钱包或结算状态，也不会自动调用外部连接器。
class AiWorkspacePageBody extends ConsumerStatefulWidget {
  const AiWorkspacePageBody({super.key});

  @override
  ConsumerState<AiWorkspacePageBody> createState() =>
      AiWorkspacePageBodyState();
}

class AiWorkspacePageBodyState extends ConsumerState<AiWorkspacePageBody> {
  static const _tabs = <(String, String)>[
    ('chat', '对话'),
    ('tasks', '任务'),
    ('memory', '记忆'),
  ];

  static const _prompts = <(String, String)>[
    ('继续我的创作', '帮我继续创作一个 Agentic Playable'),
    ('检查 Campaign', '帮我检查当前 Campaign Brief 和 Contract'),
    ('汇总待处理消息', '帮我汇总待处理的消息与评论'),
  ];

  final _controller = TextEditingController();
  String _tab = 'chat';
  final _messages = <_AiMessage>[
    const _AiMessage(
      role: 'assistant',
      text:
          '你好，我是你的全局 AI 分身。我可以整理作品、Campaign、任务和消息，'
          '并带你进入正确模块；当前不会自动执行外部动作。',
      time: '刚刚',
    ),
  ];

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  /// 与 Web 的 sendGlobalAiMessage 同一套关键词路由，回复文案逐字一致。
  static String replyFor(String text) {
    final lower = text.toLowerCase();
    if (RegExp('创作|游戏|playable|作品').hasMatch(lower)) {
      return '我可以带你进入 Creator AI，继续描述玩法、选择 Power、Review、预览和人工审核。'
          '发布前仍会回到发布设置确认。';
    }
    if (RegExp('campaign|品牌|brief|contract|合约').hasMatch(lower)) {
      return '这类需求应从 Campaign Brief 开始，并在 Contract 中锁定品牌、CTA、地区、归因和结算字段。'
          '我可以带你进入 Campaign 工作台查看当前状态。';
    }
    if (RegExp('消息|通知|私信|评论').hasMatch(lower)) {
      return '我可以汇总待处理消息并带你进入消息中心，但不会代替本人自动回复或对外发送。';
    }
    if (RegExp('钱包|结算|ait|aip|提现').hasMatch(lower)) {
      return '钱包、AIP、AIT 与结算由各自账本和权限控制。当前 AI 只提供解释与入口，'
          '不会修改余额、确认提现或制造服务端成功状态。';
    }
    if (RegExp('记忆|权限|分身|人格').hasMatch(lower)) {
      return '长期记忆、人格边界和渠道授权在“管理分身”中独立维护；'
          'Campaign 知识按场景隔离，不会跨品牌自动共享。';
    }
    return '我已经把你的问题整理为本机任务。你可以从下方入口进入对应模块；'
        '关键动作仍需要你在业务页面确认。';
  }

  void _ask(String text) {
    final body = text.trim();
    if (body.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('请先输入想处理的事项')));
      return;
    }
    final now = TimeOfDay.now();
    final stamp =
        '${now.hour.toString().padLeft(2, '0')}:'
        '${now.minute.toString().padLeft(2, '0')}';
    setState(() {
      _messages.addAll([
        _AiMessage(role: 'user', text: body, time: stamp),
        _AiMessage(role: 'assistant', text: replyFor(body), time: stamp),
      ]);
      // Web 只保留最近 20 条。
      if (_messages.length > 20) {
        _messages.removeRange(0, _messages.length - 20);
      }
      _controller.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    final workspace = ref.watch(profileLocalWorkspaceProvider);
    final draftCount = workspace.maybeWhen(
      data: (data) => data.drafts.length,
      orElse: () => 0,
    );
    final playableCount = workspace.maybeWhen(
      data: (data) => data.playables.length,
      orElse: () => 0,
    );
    return ListView(
      key: const ValueKey('ai-workspace-body'),
      padding: const EdgeInsets.fromLTRB(18, 14, 18, 40),
      children: [
        _hero(),
        const SizedBox(height: 12),
        _tabRow(),
        const SizedBox(height: 12),
        if (_tab == 'chat') ..._chat(),
        if (_tab == 'tasks') ..._tasks(draftCount),
        if (_tab == 'memory') ..._memory(playableCount),
        const SizedBox(height: 14),
        _quickActions(playableCount),
        const SizedBox(height: 12),
        _boundary(),
      ],
    );
  }

  Widget _hero() => Container(
    padding: const EdgeInsets.all(15),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(17),
      border: Border.all(color: AirvanaColors.line),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'GLOBAL AI TWIN · 本机运营助手',
          style: TextStyle(
            fontSize: 9,
            fontWeight: FontWeight.w900,
            letterSpacing: .6,
            color: AirvanaColors.accent,
          ),
        ),
        const SizedBox(height: 6),
        const Text(
          '上午好，Kai Chen',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 5),
        const Text(
          '我可以理解需求、整理任务并带你进入正确模块；业务结果仍由对应页面和人工确认。',
          style: TextStyle(
            fontSize: 11,
            height: 1.6,
            color: AirvanaColors.muted,
          ),
        ),
        const SizedBox(height: 11),
        Row(
          children: [
            const _Pill(label: '本机可用'),
            const SizedBox(width: 6),
            const _Pill(label: '无外部自动执行'),
            const Spacer(),
            TextButton(
              key: const ValueKey('ai-workspace-manage'),
              onPressed: () => context.push('/profile/secondary/aiTwin'),
              child: const Text('管理分身'),
            ),
          ],
        ),
      ],
    ),
  );

  Widget _tabRow() => Row(
    children: [
      for (final tab in _tabs)
        Padding(
          padding: const EdgeInsets.only(right: 8),
          child: ChoiceChip(
            key: ValueKey('ai-workspace-tab-${tab.$1}'),
            label: Text(tab.$2, style: const TextStyle(fontSize: 11)),
            selected: _tab == tab.$1,
            onSelected: (_) => setState(() => _tab = tab.$1),
          ),
        ),
    ],
  );

  List<Widget> _chat() => [
    const _SectionHeading(
      title: '和你的运营助手对话',
      subtitle: '自然语言只用于理解、建议和任务路由',
      badge: 'LOCAL DEMO',
    ),
    const SizedBox(height: 10),
    for (final message in _messages)
      Container(
        margin: const EdgeInsets.only(bottom: 9),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: message.role == 'user'
              ? const Color(0xFFFFF0F1)
              : Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AirvanaColors.line),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              message.role == 'user' ? '我' : 'AI 分身',
              style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 4),
            Text(
              message.text,
              style: const TextStyle(fontSize: 12, height: 1.6),
            ),
            const SizedBox(height: 3),
            Text(
              message.time,
              style: const TextStyle(fontSize: 9, color: AirvanaColors.muted),
            ),
          ],
        ),
      ),
    Wrap(
      spacing: 8,
      runSpacing: 8,
      children: [
        for (final prompt in _prompts)
          OutlinedButton(
            key: ValueKey('ai-workspace-prompt-${prompt.$1}'),
            onPressed: () => _ask(prompt.$2),
            child: Text(prompt.$1, style: const TextStyle(fontSize: 11)),
          ),
      ],
    ),
    const SizedBox(height: 10),
    Row(
      children: [
        Expanded(
          child: TextField(
            key: const ValueKey('ai-workspace-input'),
            controller: _controller,
            minLines: 1,
            maxLines: 3,
            textInputAction: TextInputAction.send,
            onSubmitted: _ask,
            decoration: const InputDecoration(
              hintText: '问作品、Campaign、任务或消息…',
              isDense: true,
            ),
          ),
        ),
        const SizedBox(width: 8),
        IconButton.filled(
          key: const ValueKey('ai-workspace-send'),
          onPressed: () => _ask(_controller.text),
          icon: const Icon(Icons.send_rounded, size: 18),
          style: IconButton.styleFrom(backgroundColor: AirvanaColors.accent),
        ),
      ],
    ),
  ];

  List<Widget> _tasks(int draftCount) => [
    const _SectionHeading(title: '今日任务', subtitle: '来自现有业务状态，不复制数据源'),
    const SizedBox(height: 10),
    _TaskRow(
      icon: '✎',
      title: '继续创作草稿',
      desc: draftCount > 0 ? '有 $draftCount 个本机草稿等待继续' : '当前没有未完成草稿',
      status: '$draftCount 项',
      action: draftCount > 0 ? '查看草稿' : '开始创作',
      onPick: () =>
          draftCount > 0 ? context.go('/profile') : context.push('/create'),
    ),
    _TaskRow(
      icon: '✓',
      title: '发布与人工审核',
      desc: '查看素材、移动端可玩性、权限降级与发布状态',
      status: '待处理',
      action: '进入治理',
      onPick: () => context.push('/profile/secondary/governance'),
    ),
    _TaskRow(
      icon: '◇',
      title: 'Campaign 工作台',
      desc: 'Brief、Contract、锁定字段与版本状态保持独立',
      status: '待创建',
      action: '查看 Campaign',
      onPick: () => context.push('/profile/secondary/campaign'),
    ),
    _TaskRow(
      icon: '✉',
      title: '消息与互动',
      desc: '通知、私信和需要人工确认的访客问题',
      status: '待查看',
      action: '打开消息',
      onPick: () => context.go('/messages'),
    ),
  ];

  List<Widget> _memory(int playableCount) => [
    const _SectionHeading(title: '记忆与权限', subtitle: '只读取获准的本机上下文'),
    const SizedBox(height: 10),
    const _MemoryRow(
      icon: '人',
      title: '公开身份与人格',
      desc: '名称、表达语气、擅长话题与拒答边界',
      status: '待配置',
      locked: true,
    ),
    _MemoryRow(
      icon: '作',
      title: '我的 Agentic Playable',
      desc: '只读取当前账号拥有或运营的作品索引',
      status: '$playableCount 个',
      locked: false,
    ),
    const _MemoryRow(
      icon: '约',
      title: 'Campaign 知识隔离',
      desc: '品牌知识按场景与获批 Contract 单独授权',
      status: '已锁定',
      locked: true,
    ),
    const _MemoryRow(
      icon: '权',
      title: '外部执行权限',
      desc: '发布、钱包、结算和连接器均需人工确认',
      status: '未授权',
      locked: true,
    ),
  ];

  Widget _quickActions(int playableCount) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      _ActionRow(
        icon: '✦',
        label: '开始创作',
        meta: '进入 Creator AI',
        onPick: () => context.push('/create'),
      ),
      _ActionRow(
        icon: '◆',
        label: '我的 Playable',
        meta: '$playableCount 个运营对象',
        onPick: () => context.push('/profile/secondary/library'),
      ),
      _ActionRow(
        icon: '◇',
        label: 'Campaign',
        meta: 'Brief 与 Contract',
        onPick: () => context.push('/profile/secondary/campaign'),
      ),
      _ActionRow(
        icon: '✉',
        label: '消息中心',
        meta: '待查看',
        onPick: () => context.go('/messages'),
      ),
    ],
  );

  Widget _boundary() => Container(
    key: const ValueKey('ai-workspace-boundary'),
    padding: const EdgeInsets.all(13),
    decoration: BoxDecoration(
      color: const Color(0xFFFFF0F1),
      borderRadius: BorderRadius.circular(14),
    ),
    child: const Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '执行边界',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w900,
            color: AirvanaColors.accent,
          ),
        ),
        SizedBox(height: 5),
        Text(
          'AI 分身不会直接发布作品、确认 Campaign、改变钱包或结算状态，也不会自动调用外部连接器。'
          '所有关键动作都必须进入权威业务模块并由用户确认。',
          style: TextStyle(fontSize: 10, height: 1.65),
        ),
      ],
    ),
  );
}

class _AiMessage {
  const _AiMessage({
    required this.role,
    required this.text,
    required this.time,
  });

  final String role;
  final String text;
  final String time;
}

class _Pill extends StatelessWidget {
  const _Pill({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
    decoration: BoxDecoration(
      color: AirvanaColors.canvas,
      borderRadius: BorderRadius.circular(999),
    ),
    child: Text(
      label,
      style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w900),
    ),
  );
}

class _SectionHeading extends StatelessWidget {
  const _SectionHeading({
    required this.title,
    required this.subtitle,
    this.badge,
  });

  final String title;
  final String subtitle;
  final String? badge;

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
            const SizedBox(height: 3),
            Text(
              subtitle,
              style: const TextStyle(fontSize: 10, color: AirvanaColors.muted),
            ),
          ],
        ),
      ),
      if (badge != null) _Pill(label: badge!),
    ],
  );
}

class _TaskRow extends StatelessWidget {
  const _TaskRow({
    required this.icon,
    required this.title,
    required this.desc,
    required this.status,
    required this.action,
    required this.onPick,
  });

  final String icon;
  final String title;
  final String desc;
  final String status;
  final String action;
  final VoidCallback onPick;

  @override
  Widget build(BuildContext context) => Container(
    key: ValueKey('ai-workspace-task-$title'),
    margin: const EdgeInsets.only(bottom: 9),
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(14),
      border: Border.all(color: AirvanaColors.line),
    ),
    child: Row(
      children: [
        Text(icon, style: const TextStyle(fontSize: 15)),
        const SizedBox(width: 10),
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
                  fontSize: 10,
                  height: 1.5,
                  color: AirvanaColors.muted,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(width: 8),
        Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              status,
              style: const TextStyle(fontSize: 9, color: AirvanaColors.muted),
            ),
            TextButton(onPressed: onPick, child: Text(action)),
          ],
        ),
      ],
    ),
  );
}

class _MemoryRow extends StatelessWidget {
  const _MemoryRow({
    required this.icon,
    required this.title,
    required this.desc,
    required this.status,
    required this.locked,
  });

  final String icon;
  final String title;
  final String desc;
  final String status;
  final bool locked;

  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(bottom: 9),
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(14),
      border: Border.all(color: AirvanaColors.line),
    ),
    child: Row(
      children: [
        Text(icon, style: const TextStyle(fontSize: 13)),
        const SizedBox(width: 10),
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
                  fontSize: 10,
                  height: 1.5,
                  color: AirvanaColors.muted,
                ),
              ),
            ],
          ),
        ),
        Text(
          status,
          style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w900,
            color: locked ? AirvanaColors.muted : AirvanaColors.ink,
          ),
        ),
      ],
    ),
  );
}

class _ActionRow extends StatelessWidget {
  const _ActionRow({
    required this.icon,
    required this.label,
    required this.meta,
    required this.onPick,
  });

  final String icon;
  final String label;
  final String meta;
  final VoidCallback onPick;

  @override
  Widget build(BuildContext context) => InkWell(
    key: ValueKey('ai-workspace-action-$label'),
    onTap: onPick,
    borderRadius: BorderRadius.circular(14),
    child: Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AirvanaColors.line),
      ),
      child: Row(
        children: [
          Text(icon, style: const TextStyle(fontSize: 13)),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              label,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900),
            ),
          ),
          Text(
            meta,
            style: const TextStyle(fontSize: 10, color: AirvanaColors.muted),
          ),
          const Icon(Icons.chevron_right_rounded, size: 16),
        ],
      ),
    ),
  );
}
