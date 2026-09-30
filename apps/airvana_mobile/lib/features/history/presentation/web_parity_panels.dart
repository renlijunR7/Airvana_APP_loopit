import 'package:airvana_mobile/features/history/presentation/connector_publish_sheet.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/shared/domain/airvana_models.dart';
import 'package:airvana_mobile/features/shared/presentation/playable_detail_screen.dart';
import 'package:airvana_mobile/features/shared/presentation/player_publish_sheet.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// 复刻旧版 Web 的 `globalSearch` panel（4 个分类 tab + 搜索历史 + 结果列表）。
class GlobalSearchPageBody extends StatefulWidget {
  const GlobalSearchPageBody({super.key, required this.playables});

  final List<Playable> playables;

  @override
  State<GlobalSearchPageBody> createState() => _GlobalSearchPageBodyState();
}

class _GlobalSearchPageBodyState extends State<GlobalSearchPageBody> {
  static const _tabs = <(String, String)>[
    ('all', '全部'),
    ('playable', 'Playable'),
    ('creator', '创作者'),
    ('campaign', 'Campaign'),
  ];

  final _controller = TextEditingController();
  final _history = <String>[];
  String _category = 'all';
  String _query = '';

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _commit(String term) {
    final trimmed = term.trim();
    if (trimmed.isEmpty) return;
    setState(() {
      _history.remove(trimmed);
      _history.insert(0, trimmed);
      if (_history.length > 6) _history.removeLast();
    });
  }

  /// 与 Web 同源：作品、创作者、Campaign 三类各自建行，再按分类和关键词过滤。
  List<_SearchRow> get _rows {
    final playableRows = widget.playables
        .map(
          (item) => _SearchRow(
            kind: 'Playable',
            category: 'playable',
            title: item.title,
            meta: '${item.authorName} · ${item.stage}',
            haystack:
                '${item.title} ${item.authorName} ${item.ownerHandle} ${item.category}'
                    .toLowerCase(),
          ),
        )
        .toList();
    final creators = <String, Playable>{};
    for (final item in widget.playables) {
      creators.putIfAbsent(item.authorName, () => item);
    }
    final creatorRows = creators.values
        .map(
          (item) => _SearchRow(
            kind: '创作者',
            category: 'creator',
            title: item.authorName,
            meta: '${item.ownerHandle} · ${creators.length} 位创作者',
            haystack: '${item.authorName} ${item.ownerHandle}'.toLowerCase(),
          ),
        )
        .toList();
    final campaigns = <String, Playable>{};
    for (final item in widget.playables) {
      campaigns.putIfAbsent(item.category, () => item);
    }
    final campaignRows = campaigns.values
        .map(
          (item) => _SearchRow(
            kind: 'Campaign',
            category: 'campaign',
            title: item.category,
            meta: '${item.authorName} · ${item.stage}',
            haystack: '${item.category} ${item.authorName}'.toLowerCase(),
          ),
        )
        .toList();

    final needle = _query.trim().toLowerCase();
    return [...playableRows, ...creatorRows, ...campaignRows]
        .where(
          (row) =>
              (_category == 'all' || _category == row.category) &&
              (needle.isEmpty || row.haystack.contains(needle)),
        )
        .take(12)
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final rows = _rows;
    final hasQuery = _query.trim().isNotEmpty;
    return ListView(
      key: const ValueKey('global-search-body'),
      padding: const EdgeInsets.fromLTRB(18, 14, 18, 40),
      children: [
        TextField(
          key: const ValueKey('global-search-field'),
          controller: _controller,
          onChanged: (value) => setState(() => _query = value),
          onSubmitted: _commit,
          decoration: const InputDecoration(
            hintText: '搜索 Playable / 创作者 / Campaign',
            prefixIcon: Icon(Icons.search_rounded, size: 18),
            isDense: true,
          ),
        ),
        if (_history.isNotEmpty && !hasQuery) ...[
          const SizedBox(height: 12),
          Row(
            children: [
              const Text(
                '搜索历史',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  color: AirvanaColors.muted,
                ),
              ),
              const Spacer(),
              GestureDetector(
                key: const ValueKey('global-search-clear-history'),
                onTap: () => setState(_history.clear),
                child: const Text(
                  '清空',
                  style: TextStyle(fontSize: 10, color: Color(0xFFC62836)),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final term in _history)
                ActionChip(
                  label: Text(term, style: const TextStyle(fontSize: 10)),
                  onPressed: () {
                    _controller.text = term;
                    setState(() => _query = term);
                  },
                ),
            ],
          ),
        ],
        const SizedBox(height: 14),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              for (final tab in _tabs)
                Padding(
                  padding: const EdgeInsets.only(right: 18),
                  child: GestureDetector(
                    key: ValueKey('global-search-tab-${tab.$1}'),
                    onTap: () => setState(() => _category = tab.$1),
                    child: Text(
                      tab.$2,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: _category == tab.$1
                            ? FontWeight.w900
                            : FontWeight.w700,
                        color: _category == tab.$1
                            ? AirvanaColors.accent
                            : AirvanaColors.muted,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Text(
              hasQuery ? '搜索结果' : '推荐内容',
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900),
            ),
            const SizedBox(width: 8),
            Text(
              '${rows.length} 个匹配结果',
              style: const TextStyle(fontSize: 10, color: AirvanaColors.muted),
            ),
          ],
        ),
        const SizedBox(height: 10),
        if (rows.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 36),
            child: Column(
              children: [
                Text('⌕', style: TextStyle(fontSize: 26)),
                SizedBox(height: 8),
                Text(
                  '没有匹配结果',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900),
                ),
                SizedBox(height: 4),
                Text(
                  '尝试作品名称、KOL 昵称或 Campaign 关键词。',
                  style: TextStyle(fontSize: 11, color: AirvanaColors.muted),
                ),
              ],
            ),
          )
        else
          for (final row in rows)
            Container(
              key: ValueKey('global-search-row-${row.title}'),
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AirvanaColors.line),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          row.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          row.meta,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 10,
                            color: AirvanaColors.muted,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    row.kind,
                    style: const TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.w800,
                      color: AirvanaColors.muted,
                    ),
                  ),
                ],
              ),
            ),
      ],
    );
  }
}

class _SearchRow {
  const _SearchRow({
    required this.kind,
    required this.category,
    required this.title,
    required this.meta,
    required this.haystack,
  });

  final String kind;
  final String category;
  final String title;
  final String meta;
  final String haystack;
}

/// 复刻 Web 的 `leaderboard` panel：热度 / 营收 / 原力 三榜。
/// 排序口径与 Web 一致：热度 = 点赞 + 评论×2；营收按 KOL 累计 AIP；
/// 原力 = AIP×2 + 点赞×0.05 + 评论×0.1 + 作品数×20。
class LeaderboardPageBody extends StatefulWidget {
  const LeaderboardPageBody({super.key, required this.playables});

  final List<Playable> playables;

  @override
  State<LeaderboardPageBody> createState() => _LeaderboardPageBodyState();
}

class _LeaderboardPageBodyState extends State<LeaderboardPageBody> {
  static const _tabs = <(String, String)>[
    ('heat', '热度'),
    ('revenue', '营收'),
    ('force', '原力'),
  ];
  static const _descriptions = <String, String>{
    'heat': '按互动热度（点赞 + 评论）排序，展示当前最受欢迎的 Playable。',
    'revenue': '按 KOL 累计获得 AIP 排序；仅反映本地站内互动贡献，不代表现金或已验证收入。',
    'force': '综合创作、互动与站内贡献计算的创作者能力值，仅用于站内展示。',
  };

  String _tab = 'heat';

  List<_RankRow> get _rows {
    if (_tab == 'heat') {
      final sorted = [...widget.playables]
        ..sort(
          (a, b) =>
              (b.likes + b.comments * 2).compareTo(a.likes + a.comments * 2),
        );
      return sorted
          .take(10)
          .toList()
          .asMap()
          .entries
          .map(
            (entry) => _RankRow(
              rank: entry.key + 1,
              title: entry.value.title,
              subtitle: entry.value.authorName,
              value: '${entry.value.likes + entry.value.comments * 2} 热度',
            ),
          )
          .toList();
    }
    // 营收与原力都按创作者聚合。
    final grouped = <String, _Aggregate>{};
    for (final item in widget.playables) {
      final key = item.authorName;
      final entry = grouped[key] ??= _Aggregate(operator: key);
      entry.likes += item.likes;
      entry.comments += item.comments;
      entry.saves += item.saves;
      entry.count += 1;
    }
    final entries = grouped.values.toList();
    if (_tab == 'revenue') {
      entries.sort((a, b) => b.saves.compareTo(a.saves));
      return entries
          .take(10)
          .toList()
          .asMap()
          .entries
          .map(
            (entry) => _RankRow(
              rank: entry.key + 1,
              title: entry.value.operator,
              subtitle: '${entry.value.count} 个 Playable',
              value: '${entry.value.saves} AIP',
            ),
          )
          .toList();
    }
    entries.sort((a, b) => b.force.compareTo(a.force));
    return entries
        .take(10)
        .toList()
        .asMap()
        .entries
        .map(
          (entry) => _RankRow(
            rank: entry.key + 1,
            title: entry.value.operator,
            subtitle: '${entry.value.count} 个 Playable',
            value: '${entry.value.force.round()} 原力',
          ),
        )
        .toList();
  }

  @override
  Widget build(BuildContext context) => ListView(
    key: const ValueKey('leaderboard-body'),
    padding: const EdgeInsets.fromLTRB(18, 14, 18, 40),
    children: [
      SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: [
            for (final tab in _tabs)
              Padding(
                padding: const EdgeInsets.only(right: 24),
                child: GestureDetector(
                  key: ValueKey('leaderboard-tab-${tab.$1}'),
                  onTap: () => setState(() => _tab = tab.$1),
                  child: Column(
                    children: [
                      Text(
                        tab.$2,
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: _tab == tab.$1
                              ? FontWeight.w900
                              : FontWeight.w700,
                          color: _tab == tab.$1
                              ? AirvanaColors.ink
                              : AirvanaColors.muted,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Container(
                        width: 22,
                        height: 2,
                        color: _tab == tab.$1
                            ? AirvanaColors.accent
                            : Colors.transparent,
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
      const SizedBox(height: 12),
      Text(
        _descriptions[_tab]!,
        style: const TextStyle(
          fontSize: 10,
          height: 1.6,
          color: AirvanaColors.muted,
        ),
      ),
      const SizedBox(height: 12),
      for (final row in _rows)
        Container(
          key: ValueKey('leaderboard-row-${row.rank}'),
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AirvanaColors.line),
          ),
          child: Row(
            children: [
              SizedBox(
                width: 20,
                child: Text(
                  '${row.rank}',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w900,
                    color: switch (row.rank) {
                      1 => const Color(0xFFD4A017),
                      2 => const Color(0xFF9AA0A6),
                      3 => const Color(0xFFB06A3B),
                      _ => AirvanaColors.muted,
                    },
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      row.title,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      row.subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontSize: 10,
                        color: AirvanaColors.muted,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Text(
                row.value,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
        ),
    ],
  );
}

class _RankRow {
  const _RankRow({
    required this.rank,
    required this.title,
    required this.subtitle,
    required this.value,
  });

  final int rank;
  final String title;
  final String subtitle;
  final String value;
}

class _Aggregate {
  _Aggregate({required this.operator});

  final String operator;
  int likes = 0;
  int comments = 0;
  int saves = 0;
  int count = 0;

  double get force => saves * 2 + likes * 0.05 + comments * 0.1 + count * 20;
}

/// 复刻 Web 的 `library` panel：我的 Agentic Playables，6 个筛选。
/// 筛选口径沿用 Web 的 stage 语义（运行中/已暂停/可发布/可复制/草稿）。
class PlayableLibraryPageBody extends StatefulWidget {
  const PlayableLibraryPageBody({super.key, required this.playables});

  final List<Playable> playables;

  @override
  State<PlayableLibraryPageBody> createState() =>
      _PlayableLibraryPageBodyState();
}

class _PlayableLibraryPageBodyState extends State<PlayableLibraryPageBody> {
  static const _filters = <(String, String)>[
    ('all', '全部'),
    ('published', '运行中'),
    ('paused', '已暂停'),
    ('scheduled', '可发布'),
    ('archived', '可复制'),
    ('draft', '草稿'),
  ];

  String _filter = 'all';

  bool _matches(Playable item) => switch (_filter) {
    'all' => true,
    'published' => item.stage.contains('运行'),
    'paused' => item.stage.contains('暂停'),
    'scheduled' => item.stage.contains('试玩') || item.stage.contains('挑战'),
    'archived' => item.stage.contains('优化') || item.stage.contains('复制'),
    'draft' => item.stage.contains('草稿') || item.stage.contains('DEMO'),
    _ => true,
  };

  @override
  Widget build(BuildContext context) {
    final items = widget.playables.where(_matches).toList();
    return ListView(
      key: const ValueKey('playable-library-body'),
      padding: const EdgeInsets.fromLTRB(18, 14, 18, 40),
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final filter in _filters)
              ChoiceChip(
                key: ValueKey('library-filter-${filter.$1}'),
                label: Text(filter.$2, style: const TextStyle(fontSize: 11)),
                selected: _filter == filter.$1,
                onSelected: (_) => setState(() => _filter = filter.$1),
              ),
          ],
        ),
        const SizedBox(height: 10),
        SizedBox(
          height: 44,
          child: OutlinedButton.icon(
            key: const ValueKey('library-player-publish'),
            onPressed: () async {
              final draft = await showModalBottomSheet<PlayerPostDraft>(
                context: context,
                isScrollControlled: true,
                backgroundColor: Colors.white,
                shape: const RoundedRectangleBorder(
                  borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                ),
                builder: (_) =>
                    const PlayerPublishSheet(displayName: 'Kai Chen'),
              );
              if (draft == null || !context.mounted) return;
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text('已保存到本机：${draft.type} · ${draft.visibility}'),
                ),
              );
            },
            icon: const Icon(Icons.edit_outlined, size: 17),
            label: const Text('发布图文内容'),
          ),
        ),
        const SizedBox(height: 12),
        Text(
          '${items.length} 个 Agentic Playable · 本机演示数据',
          style: const TextStyle(fontSize: 10, color: AirvanaColors.muted),
        ),
        const SizedBox(height: 12),
        if (items.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 40),
            child: Center(
              child: Text(
                '该筛选下暂无作品',
                style: TextStyle(fontSize: 12, color: AirvanaColors.muted),
              ),
            ),
          )
        else
          for (final item in items)
            GestureDetector(
              key: ValueKey('library-item-${item.id}'),
              onTap: () => Navigator.of(context).push(
                MaterialPageRoute<void>(
                  builder: (_) => PlayableDetailScreen(
                    playable: item,
                    // 作品库里的都是自己的作品，进入所有者视图。
                    ownerView: true,
                  ),
                ),
              ),
              child: Container(
                margin: const EdgeInsets.only(bottom: 9),
                padding: const EdgeInsets.all(9),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(15),
                  border: Border.all(color: AirvanaColors.line),
                ),
                child: Row(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(11),
                      child: Image.asset(
                        item.coverAsset,
                        width: 54,
                        height: 68,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => const SizedBox(
                          width: 54,
                          height: 68,
                          child: ColoredBox(color: AirvanaColors.line),
                        ),
                      ),
                    ),
                    const SizedBox(width: 11),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            item.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          const SizedBox(height: 5),
                          Text(
                            '${item.authorName} · ${item.category}',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 10,
                              color: AirvanaColors.muted,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            item.stage,
                            style: const TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w800,
                              color: AirvanaColors.accent,
                            ),
                          ),
                          const SizedBox(height: 4),
                          // Web 的卡片操作：查看 / 编辑 / 归档 + 连接器发布。
                          Wrap(
                            spacing: 2,
                            children: [
                              TextButton(
                                key: ValueKey('library-view-${item.id}'),
                                onPressed: () => Navigator.of(context).push(
                                  MaterialPageRoute<void>(
                                    builder: (_) => PlayableDetailScreen(
                                      playable: item,
                                      ownerView: true,
                                    ),
                                  ),
                                ),
                                child: const Text(
                                  '查看',
                                  style: TextStyle(fontSize: 10),
                                ),
                              ),
                              TextButton(
                                key: ValueKey('library-edit-${item.id}'),
                                onPressed: () => context.push('/create'),
                                child: const Text(
                                  '编辑',
                                  style: TextStyle(fontSize: 10),
                                ),
                              ),
                              TextButton(
                                key: ValueKey('library-archive-${item.id}'),
                                onPressed: () =>
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text('归档只改本机展示状态，不影响已发布链接'),
                                      ),
                                    ),
                                child: const Text(
                                  '归档',
                                  style: TextStyle(fontSize: 10),
                                ),
                              ),
                              TextButton(
                                key: ValueKey('library-connector-${item.id}'),
                                onPressed: () => showModalBottomSheet<void>(
                                  context: context,
                                  isScrollControlled: true,
                                  useSafeArea: true,
                                  showDragHandle: true,
                                  backgroundColor: Colors.white,
                                  builder: (_) =>
                                      ConnectorPublishSheet(playable: item),
                                ),
                                child: const Text(
                                  '↗ 连接器发布',
                                  style: TextStyle(fontSize: 10),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
      ],
    );
  }
}

/// 复刻 Web 的 `attribution` panel：漏斗、运行时事件与证据链。
/// 与 Web 一致，这里只展示流程与证据状态，不把演示数值当作已验证结果。
class AttributionPageBody extends StatelessWidget {
  const AttributionPageBody({super.key, required this.playables});

  final List<Playable> playables;

  @override
  Widget build(BuildContext context) {
    final impressions = playables.fold<int>(0, (sum, p) => sum + p.likes);
    final starts = (impressions * 0.42).round();
    final completes = (impressions * 0.18).round();
    return ListView(
      key: const ValueKey('attribution-body'),
      padding: const EdgeInsets.fromLTRB(18, 14, 18, 40),
      children: [
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(20),
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF1C1C1E), Color(0xFF343438)],
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                '效果归因 · 本地报告',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFFFF9AA2),
                ),
              ),
              const SizedBox(height: 8),
              Text(
                '${playables.length} 个作品的本机互动记录',
                style: const TextStyle(
                  fontSize: 19,
                  fontWeight: FontWeight.w900,
                  color: Colors.white,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                '归因证据来自本机运行时事件；服务端权威归因未接入前不产生结算效力。',
                style: TextStyle(
                  fontSize: 11,
                  height: 1.6,
                  color: Colors.white70,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            _funnelCell('曝光', '$impressions'),
            const SizedBox(width: 8),
            _funnelCell('开始互动', '$starts'),
            const SizedBox(width: 8),
            _funnelCell('完成互动', '$completes'),
          ],
        ),
        const SizedBox(height: 12),
        _evidenceCard(
          title: '归因证据链',
          lines: const [
            'playable_start → step_complete → playable_complete 顺序事件',
            '事件写入本机体验记录，可按作品回溯',
            '权威归因需要服务端确认，当前标记为「本地未验证」',
          ],
        ),
        const SizedBox(height: 12),
        const _BoundaryNote(text: '本页只展示本机归因过程；不代表广告投放效果、结算依据或已验证收益。'),
      ],
    );
  }

  Widget _funnelCell(String label, String value) => Expanded(
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
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
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

  Widget _evidenceCard({required String title, required List<String> lines}) =>
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
            Text(
              title,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 8),
            for (final line in lines)
              Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Text(
                  '· $line',
                  style: const TextStyle(
                    fontSize: 11,
                    height: 1.6,
                    color: AirvanaColors.muted,
                  ),
                ),
              ),
          ],
        ),
      );
}

/// 复刻 Web 的 `settlement` panel：三账本分离 + 状态时间线 + 边界声明。
class SettlementPageBody extends StatelessWidget {
  const SettlementPageBody({super.key});

  static const _timeline = <String>[
    '待确认合作与执行规则',
    '交付已提交 · 待品牌审核',
    '交付已批准 · 待确认归因',
    '归因已确认 · 待提交结算',
    '结算复核中',
  ];

  @override
  Widget build(BuildContext context) => ListView(
    key: const ValueKey('settlement-body'),
    padding: const EdgeInsets.fromLTRB(18, 14, 18, 40),
    children: [
      Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFFFFD6DA)),
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFFFFE4E7), Colors.white],
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text(
              'CAMPAIGN 与商业结算',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                color: AirvanaColors.accent,
              ),
            ),
            SizedBox(height: 8),
            Text(
              '结算由服务端 Contract 驱动',
              style: TextStyle(fontSize: 19, fontWeight: FontWeight.w900),
            ),
            SizedBox(height: 6),
            Text(
              '本机只呈现流程状态，不发起、不确认任何真实付款。',
              style: TextStyle(
                fontSize: 11,
                height: 1.6,
                color: AirvanaColors.muted,
              ),
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
          children: [
            const Text(
              '三账本分离展示',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 10),
            Row(
              children: const [
                _LedgerCell(label: 'AIP', hint: '行为积分 · 不可提现'),
                SizedBox(width: 8),
                _LedgerCell(label: 'AIT', hint: '权益 · Contract 绑定'),
                SizedBox(width: 8),
                _LedgerCell(label: '游戏金币', hint: '按作品隔离'),
              ],
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
          children: [
            const Text(
              '状态时间线',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 10),
            for (var i = 0; i < _timeline.length; i += 1)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 18,
                      height: 18,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: i == 0
                            ? AirvanaColors.accent
                            : AirvanaColors.line,
                      ),
                      child: Text(
                        '${i + 1}',
                        style: TextStyle(
                          fontSize: 9,
                          fontWeight: FontWeight.w900,
                          color: i == 0 ? Colors.white : AirvanaColors.muted,
                        ),
                      ),
                    ),
                    const SizedBox(width: 9),
                    Expanded(
                      child: Text(
                        _timeline[i],
                        style: const TextStyle(fontSize: 11, height: 1.5),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
      const SizedBox(height: 12),
      const _BoundaryNote(text: '页面只展示流程状态，不把演示数值作为真实收入、可提现余额或结算承诺。'),
    ],
  );
}

class _LedgerCell extends StatelessWidget {
  const _LedgerCell({required this.label, required this.hint});

  final String label;
  final String hint;

  @override
  Widget build(BuildContext context) => Expanded(
    child: Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AirvanaColors.canvas,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 4),
          Text(
            hint,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 9, color: AirvanaColors.muted),
          ),
        ],
      ),
    ),
  );
}

class _BoundaryNote extends StatelessWidget {
  const _BoundaryNote({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(13),
    decoration: BoxDecoration(
      color: const Color(0xFFFFF8F8),
      borderRadius: BorderRadius.circular(14),
      border: Border.all(color: const Color(0xFFFFD6DA)),
    ),
    child: Text(
      text,
      style: const TextStyle(
        fontSize: 11,
        height: 1.7,
        color: Color(0xFF6E5A5D),
      ),
    ),
  );
}
