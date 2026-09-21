import 'package:airvana_mobile/design_system/airvana_shared_cards.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/shared/domain/airvana_models.dart';
import 'package:flutter/material.dart';

/// 复刻 Web 的 `content` overlay：Playable 详情页。
/// Web 有两种视图——普通详情与 KOL 所有者视图（管理抽屉），这里保持同一划分。
class PlayableDetailScreen extends StatefulWidget {
  const PlayableDetailScreen({
    super.key,
    required this.playable,
    this.ownerView = false,
  });

  final Playable playable;

  /// 作者本人打开时才显示管理抽屉，与 Web 的 KOL 所有者视图一致。
  final bool ownerView;

  @override
  State<PlayableDetailScreen> createState() => _PlayableDetailScreenState();
}

class _PlayableDetailScreenState extends State<PlayableDetailScreen> {
  bool _managementOpen = false;

  @override
  Widget build(BuildContext context) {
    final item = widget.playable;
    return Scaffold(
      backgroundColor: AirvanaColors.canvas,
      appBar: AppBar(
        title: Text(
          _managementOpen ? 'KOL 所有者视图' : 'AGENTIC PLAYABLE',
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900),
        ),
        leading: IconButton(
          key: const ValueKey('playable-detail-back'),
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
          onPressed: () => _managementOpen
              ? setState(() => _managementOpen = false)
              : Navigator.of(context).maybePop(),
        ),
        actions: [
          if (widget.ownerView && !_managementOpen)
            TextButton(
              key: const ValueKey('playable-detail-manage'),
              onPressed: () => setState(() => _managementOpen = true),
              child: const Text('管理'),
            ),
        ],
      ),
      body: _managementOpen ? _management(item) : _detail(item),
    );
  }

  Widget _detail(Playable item) => ListView(
    key: const ValueKey('playable-detail-body'),
    padding: const EdgeInsets.fromLTRB(18, 14, 18, 40),
    children: [
      ClipRRect(
        borderRadius: BorderRadius.circular(18),
        child: AspectRatio(
          aspectRatio: 9 / 14,
          child: Image.asset(
            item.coverAsset,
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) =>
                const ColoredBox(color: AirvanaColors.line),
          ),
        ),
      ),
      const SizedBox(height: 14),
      Text(
        item.title,
        style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w900),
      ),
      const SizedBox(height: 6),
      Row(
        children: [
          Text(
            item.authorName,
            style: const TextStyle(
              fontSize: 11,
              color: AirvanaColors.muted,
            ),
          ),
          const SizedBox(width: 8),
          StatusPill(label: item.stage, tone: AirvanaStatusTone.demo),
        ],
      ),
      const SizedBox(height: 14),
      Row(
        children: [
          _metric('${item.likes}', '点赞'),
          const SizedBox(width: 8),
          _metric('${item.comments}', '评论'),
          const SizedBox(width: 8),
          _metric('${item.saves}', '收藏'),
        ],
      ),
      const SizedBox(height: 14),
      _card('作品介绍', item.summary),
      const SizedBox(height: 10),
      _card('玩法说明', item.instruction),
      const SizedBox(height: 10),
      _card(
        '互动反馈',
        '分享体验感受，帮助作品持续优化。评论与互动计数只写入本机演示数据。',
      ),
    ],
  );

  Widget _management(Playable item) => ListView(
    key: const ValueKey('playable-detail-management'),
    padding: const EdgeInsets.fromLTRB(18, 14, 18, 40),
    children: [
      Text(
        item.title,
        style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900),
      ),
      const SizedBox(height: 4),
      Text(
        '版本 v${item.version} · ${item.stage}',
        style: const TextStyle(fontSize: 11, color: AirvanaColors.muted),
      ),
      const SizedBox(height: 14),
      _card(
        '运营数据',
        '点赞 ${item.likes} · 评论 ${item.comments} · 收藏 ${item.saves}。'
            '数据来自本机互动记录，不代表投放效果。',
      ),
      const SizedBox(height: 10),
      _card(
        '版本治理',
        '每次发布都会留下版本记录，可回滚到上一版；回滚不会删除已产生的体验记录。',
      ),
      const SizedBox(height: 10),
      const BoundaryCard(
        key: ValueKey('playable-detail-boundary'),
        title: '管理边界',
        body: '下架、回滚与归因确认都需要服务端治理服务执行；'
            '本机操作只记录意图，不改变对外状态。',
      ),
    ],
  );

  Widget _metric(String value, String label) => Expanded(
    child: Container(
      padding: const EdgeInsets.all(11),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(13),
        border: Border.all(color: AirvanaColors.line),
      ),
      child: Column(
        children: [
          Text(
            value,
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 3),
          Text(
            label,
            style: const TextStyle(fontSize: 10, color: AirvanaColors.muted),
          ),
        ],
      ),
    ),
  );

  Widget _card(String title, String body) => Container(
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
          title,
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 8),
        Text(body, style: const TextStyle(fontSize: 11, height: 1.7)),
      ],
    ),
  );
}
