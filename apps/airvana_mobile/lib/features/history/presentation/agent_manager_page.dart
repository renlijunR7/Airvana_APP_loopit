import 'package:airvana_mobile/design_system/airvana_shared_cards.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/shared/presentation/destructive_confirm.dart';
import 'package:flutter/material.dart';

/// 复刻 Web 的 Agent 相关弹层：列表（agentManager）、详情（agent）、
/// 任务（task）与派发（dispatch）。Web 用四个 overlay 承载，这里合成
/// 一个带层级的页面，保持同一套数据与权限语义。
class AgentDemo {
  const AgentDemo({
    required this.id,
    required this.name,
    required this.icon,
    required this.level,
    required this.kind,
    required this.contentType,
    required this.tasks,
    required this.status,
    required this.reviewMode,
    required this.canDraft,
    required this.canReadData,
    required this.canPublish,
  });

  final int id;
  final String name;
  final String icon;
  final int level;
  final String kind;
  final String contentType;
  final int tasks;
  final String status;
  final String reviewMode;
  final bool canDraft;
  final bool canReadData;

  /// Web 的种子数据里三个 Agent 都是 false——发布必须人工确认。
  final bool canPublish;

  String get statusLabel => status == 'playing' ? '运行中' : '待命';
}

/// 与 Web `agents` 种子数组一致。
const kAgentDemos = <AgentDemo>[
  AgentDemo(
    id: 1,
    name: 'Nova',
    icon: '🦊',
    level: 5,
    kind: '互动体验 Agent',
    contentType: '互动内容',
    tasks: 37,
    status: 'playing',
    reviewMode: '每次发布审核',
    canDraft: true,
    canReadData: true,
    canPublish: false,
  ),
  AgentDemo(
    id: 2,
    name: 'Kiko',
    icon: '🐙',
    level: 3,
    kind: '内容创作 Agent',
    contentType: '短视频',
    tasks: 14,
    status: 'idle',
    reviewMode: '每次发布审核',
    canDraft: true,
    canReadData: true,
    canPublish: false,
  ),
  AgentDemo(
    id: 3,
    name: 'Rex',
    icon: '🦖',
    level: 2,
    kind: '分发运营 Agent',
    contentType: '图文内容',
    tasks: 6,
    status: 'idle',
    reviewMode: '关键节点审核',
    canDraft: true,
    canReadData: false,
    canPublish: false,
  ),
];

class AgentManagerPageBody extends StatefulWidget {
  const AgentManagerPageBody({super.key});

  @override
  State<AgentManagerPageBody> createState() => _AgentManagerPageBodyState();
}

class _AgentManagerPageBodyState extends State<AgentManagerPageBody> {
  AgentDemo? _selected;
  bool _showTask = false;
  final _removed = <int>{};

  /// 本机派发出去的任务：agentId -> 作品名。Web 用 agentTasks 承载同一语义。
  final _dispatched = <int, String>{};

  List<AgentDemo> get _agents =>
      kAgentDemos.where((a) => !_removed.contains(a.id)).toList();

  /// Web 的 dispatch 只列空闲 Agent；全忙时给出 noIdle 空态。
  List<AgentDemo> get _idleAgents => _agents
      .where((agent) => !_dispatched.containsKey(agent.id))
      .toList(growable: false);

  Future<void> _openDispatch() async {
    final picked = await showModalBottomSheet<AgentDemo>(
      context: context,
      useRootNavigator: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (sheetContext) => _DispatchSheet(idle: _idleAgents),
    );
    if (picked == null || !mounted) return;
    setState(() {
      _dispatched[picked.id] = 'Crypto City 安全挑战';
      _selected = picked;
      _showTask = true;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('${picked.name} 已开始执行「Crypto City 安全挑战」内容任务')),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_showTask && _selected != null) return _taskView(_selected!);
    if (_selected != null) return _detailView(_selected!);
    return _listView();
  }

  Widget _listView() => ListView(
    key: const ValueKey('agent-manager-list'),
    padding: const EdgeInsets.fromLTRB(18, 14, 18, 40),
    children: [
      Row(
        children: [
          const Text(
            'AI 运营策略',
            style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900),
          ),
          const Spacer(),
          Text(
            '${_agents.length} 个',
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w800,
              color: AirvanaColors.muted,
            ),
          ),
        ],
      ),
      const SizedBox(height: 8),
      const Text(
        'Agent 用于驱动内容生成、优化与运营。默认只能生成草稿，发布始终需要人工确认。',
        style: TextStyle(fontSize: 11, height: 1.7, color: AirvanaColors.muted),
      ),
      const SizedBox(height: 12),
      SizedBox(
        width: double.infinity,
        child: FilledButton(
          key: const ValueKey('agent-dispatch-open'),
          onPressed: _openDispatch,
          child: const Text('派发任务'),
        ),
      ),
      const SizedBox(height: 14),
      for (final agent in _agents)
        Container(
          key: ValueKey('agent-row-${agent.id}'),
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(15),
            border: Border.all(color: AirvanaColors.line),
          ),
          child: Row(
            children: [
              Text(agent.icon, style: const TextStyle(fontSize: 26)),
              const SizedBox(width: 11),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      agent.name,
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${agent.kind} · ${agent.statusLabel}',
                      style: const TextStyle(
                        fontSize: 10,
                        color: AirvanaColors.muted,
                      ),
                    ),
                  ],
                ),
              ),
              TextButton(
                key: ValueKey('agent-manage-${agent.id}'),
                onPressed: () => setState(() => _selected = agent),
                child: const Text('管理 ›'),
              ),
            ],
          ),
        ),
      const SizedBox(height: 4),
      const BoundaryCard(
        key: ValueKey('agent-manager-boundary'),
        title: 'Agent 边界',
        body:
            '本机 Agent 只产出草稿与报告；发布、结算与对外分发都需要人工确认，'
            '不会自动执行。',
      ),
    ],
  );

  Widget _detailView(AgentDemo agent) => ListView(
    key: ValueKey('agent-detail-${agent.id}'),
    padding: const EdgeInsets.fromLTRB(18, 14, 18, 40),
    children: [
      TextButton(
        key: const ValueKey('agent-detail-back'),
        onPressed: () => setState(() => _selected = null),
        child: const Text('‹ 返回策略列表'),
      ),
      Row(
        children: [
          Text(agent.icon, style: const TextStyle(fontSize: 32)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  agent.name,
                  style: const TextStyle(
                    fontSize: 19,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${agent.kind} · ${agent.statusLabel} · Lv.${agent.level}',
                  style: const TextStyle(
                    fontSize: 11,
                    color: AirvanaColors.muted,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      const SizedBox(height: 14),
      Row(
        children: [
          _statCell('${agent.tasks}', '完成内容'),
          const SizedBox(width: 8),
          _statCell(agent.reviewMode, '审核模式'),
          const SizedBox(width: 8),
          _statCell(agent.contentType, '内容类型'),
        ],
      ),
      const SizedBox(height: 14),
      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AirvanaColors.line),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '权限范围',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 10),
            _permissionRow('生成草稿', agent.canDraft),
            _permissionRow('读取运营数据', agent.canReadData),
            _permissionRow('直接发布', agent.canPublish),
          ],
        ),
      ),
      const SizedBox(height: 12),
      SizedBox(
        height: 46,
        child: FilledButton(
          key: ValueKey('agent-open-task-${agent.id}'),
          onPressed: () => setState(() => _showTask = true),
          child: const Text('查看运营任务'),
        ),
      ),
      const SizedBox(height: 9),
      SizedBox(
        height: 46,
        child: OutlinedButton(
          key: ValueKey('agent-delete-${agent.id}'),
          style: OutlinedButton.styleFrom(
            foregroundColor: const Color(0xFFC62836),
          ),
          onPressed: () async {
            final confirmed = await confirmDestructiveAction(
              context,
              DestructiveAction.deleteAgent,
              subject: agent.name,
            );
            if (!confirmed || !mounted) return;
            setState(() {
              _removed.add(agent.id);
              _selected = null;
            });
          },
          child: const Text('移除这个 Agent'),
        ),
      ),
    ],
  );

  Widget _taskView(AgentDemo agent) => ListView(
    key: ValueKey('agent-task-${agent.id}'),
    padding: const EdgeInsets.fromLTRB(18, 14, 18, 40),
    children: [
      TextButton(
        key: const ValueKey('agent-task-back'),
        onPressed: () => setState(() => _showTask = false),
        child: const Text('‹ 返回策略详情'),
      ),
      const Text(
        'Agent 任务',
        style: TextStyle(fontSize: 19, fontWeight: FontWeight.w900),
      ),
      const SizedBox(height: 4),
      Text(
        _dispatched.containsKey(agent.id)
            ? '${agent.name} · 执行中 ·「${_dispatched[agent.id]}」'
            : '${agent.name} · 本机演示进度',
        key: ValueKey('agent-task-meta-${agent.id}'),
        style: const TextStyle(fontSize: 11, color: AirvanaColors.muted),
      ),
      if (_dispatched.containsKey(agent.id)) ...[
        const SizedBox(height: 10),
        OutlinedButton(
          key: ValueKey('agent-task-cancel-${agent.id}'),
          onPressed: () => setState(() => _dispatched.remove(agent.id)),
          child: const Text('取消任务'),
        ),
      ],
      const SizedBox(height: 14),
      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AirvanaColors.line),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text(
              '任务目标',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800),
            ),
            SizedBox(height: 8),
            Text(
              '检查内容节奏、引导表达与互动反馈，提交可供创作者审核的体验报告。',
              style: TextStyle(fontSize: 11, height: 1.7),
            ),
          ],
        ),
      ),
      const SizedBox(height: 12),
      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AirvanaColors.line),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text(
              'Agent 报告',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800),
            ),
            SizedBox(height: 8),
            Text(
              '报告为本机演示结构；真实运行需要服务端任务队列与审核记录确认。',
              style: TextStyle(
                fontSize: 11,
                height: 1.7,
                color: AirvanaColors.muted,
              ),
            ),
          ],
        ),
      ),
      const SizedBox(height: 12),
      const BoundaryCard(
        key: ValueKey('agent-task-boundary'),
        title: '派发边界',
        body: '派发只在本机排队，不会真正调用外部服务；任何对外发布仍需人工确认。',
      ),
    ],
  );

  Widget _statCell(String value, String label) => Expanded(
    child: Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AirvanaColors.canvas,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Text(
            value,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: const TextStyle(fontSize: 9, color: AirvanaColors.muted),
          ),
        ],
      ),
    ),
  );

  Widget _permissionRow(String label, bool granted) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Row(
      children: [
        Icon(
          granted ? Icons.check_circle_rounded : Icons.cancel_rounded,
          size: 16,
          color: granted ? const Color(0xFF147542) : AirvanaColors.muted,
        ),
        const SizedBox(width: 8),
        Text(label, style: const TextStyle(fontSize: 12)),
        const Spacer(),
        Text(
          granted ? '已授权' : '未授权',
          style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w800,
            color: granted ? const Color(0xFF147542) : AirvanaColors.muted,
          ),
        ),
      ],
    ),
  );
}

/// 派发任务选择层，对应 Web 的 `overlay:'dispatch'`。
class _DispatchSheet extends StatelessWidget {
  const _DispatchSheet({required this.idle});

  final List<AgentDemo> idle;

  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    key: const ValueKey('agent-dispatch-sheet'),
    padding: const EdgeInsets.fromLTRB(20, 4, 20, 28),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'AI 运营策略 ·「Crypto City 安全挑战」',
          style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 6),
        const Text(
          'AI Agent 仅在已批准的权限与 Campaign Contract 边界内运行，结果仍需人工审核确认',
          style: TextStyle(
            fontSize: 10,
            height: 1.6,
            color: AirvanaColors.muted,
          ),
        ),
        const SizedBox(height: 14),
        if (idle.isEmpty)
          const Padding(
            key: ValueKey('agent-dispatch-no-idle'),
            padding: EdgeInsets.symmetric(vertical: 18),
            child: Text(
              '所有 Agent 都在忙，等它们完成任务或新建一个',
              style: TextStyle(fontSize: 11, color: AirvanaColors.muted),
            ),
          )
        else
          for (final agent in idle)
            Container(
              key: ValueKey('agent-dispatch-option-${agent.id}'),
              margin: const EdgeInsets.only(bottom: 9),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AirvanaColors.line),
              ),
              child: Row(
                children: [
                  Text(agent.icon, style: const TextStyle(fontSize: 24)),
                  const SizedBox(width: 11),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${agent.name} Lv.${agent.level}',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          '${agent.kind} · 空闲中',
                          style: const TextStyle(
                            fontSize: 10,
                            color: AirvanaColors.muted,
                          ),
                        ),
                      ],
                    ),
                  ),
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(agent),
                    child: const Text('选它 ›'),
                  ),
                ],
              ),
            ),
      ],
    ),
  );
}
