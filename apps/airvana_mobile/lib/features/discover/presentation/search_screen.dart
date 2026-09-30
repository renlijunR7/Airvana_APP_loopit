/// 独立搜索页。
///
/// 原来的搜索是发现页顶部就地展开的一个输入框：下面的分类栅格不变，
/// 搜索记录存在页面的内存列表里、退出即失，匹配是 `contains` 子串。
/// 这一版把它拆成独立路由，空态给历史与热门，输入即出模糊结果。
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/providers.dart';
import '../../shared/domain/airvana_models.dart';
import '../domain/fuzzy_search.dart';

/// 一条搜索结果。作品、创作者、分类共用一种行。
class SearchHit {
  const SearchHit({
    required this.kind,
    required this.title,
    required this.subtitle,
    required this.score,
    required this.titleRanges,
    this.playableId,
  });

  final String kind;
  final String title;
  final String subtitle;
  final int score;
  final List<(int, int)> titleRanges;

  /// 作品行带 id，点击可直接进入试玩；创作者与分类行没有。
  final String? playableId;
}

/// 纯函数的搜索聚合，便于单测。
///
/// 三类各自建行再统一排序，而不是分段展示——用户搜「Nova」时更关心
/// 「哪条最相关」，而不是「它属于哪一类」。类别以徽章形式留在行内。
List<SearchHit> searchPlayables(List<Playable> playables, String query) {
  if (query.trim().isEmpty) return const [];
  final hits = <SearchHit>[];

  for (final item in playables) {
    final match = fuzzyMatchFields([
      (item.title, 1.0),
      (item.summary, 0.5),
      (item.category, 0.6),
      (item.authorName, 0.55),
      (item.ownerHandle, 0.5),
    ], query);
    if (!match.hit) continue;
    hits.add(
      SearchHit(
        kind: '作品',
        title: item.title,
        subtitle: '${item.authorName} · ${item.category}',
        score: match.score,
        titleRanges: fuzzyMatch(item.title, query).matchedRanges,
        playableId: item.id,
      ),
    );
  }

  final creators = <String, Playable>{};
  for (final item in playables) {
    creators.putIfAbsent(item.authorName, () => item);
  }
  for (final entry in creators.entries) {
    final match = fuzzyMatchFields([
      (entry.key, 1.0),
      (entry.value.ownerHandle, 0.8),
    ], query);
    if (!match.hit) continue;
    final works = playables.where((p) => p.authorName == entry.key).length;
    hits.add(
      SearchHit(
        kind: '创作者',
        title: entry.key,
        subtitle: '${entry.value.ownerHandle} · $works 个作品',
        // 同分时让作品排在创作者前面：搜一个词，多半是想找作品。
        score: match.score - 1,
        titleRanges: fuzzyMatch(entry.key, query).matchedRanges,
      ),
    );
  }

  final categories = <String, int>{};
  for (final item in playables) {
    categories.update(item.category, (v) => v + 1, ifAbsent: () => 1);
  }
  for (final entry in categories.entries) {
    final match = fuzzyMatch(entry.key, query);
    if (!match.hit) continue;
    hits.add(
      SearchHit(
        kind: '分类',
        title: entry.key,
        subtitle: '${entry.value} 个作品',
        score: match.score - 2,
        titleRanges: match.matchedRanges,
      ),
    );
  }

  hits.sort((a, b) => b.score.compareTo(a.score));
  return hits.take(40).toList(growable: false);
}

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key, this.initialQuery = ''});

  final String initialQuery;

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  late final TextEditingController _controller = TextEditingController(
    text: widget.initialQuery,
  );
  final _focus = FocusNode();
  String _query = '';
  List<String> _history = const [];
  bool _loadingHistory = true;

  @override
  void initState() {
    super.initState();
    _query = widget.initialQuery;
    _loadHistory();
    // 进页面就聚焦——用户点搜索图标的意图就是要打字。
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _focus.requestFocus();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _focus.dispose();
    super.dispose();
  }

  Future<void> _loadHistory() async {
    try {
      final history = await ref
          .read(airvanaRepositoryProvider)
          .readSearchHistory();
      if (!mounted) return;
      setState(() {
        _history = history;
        _loadingHistory = false;
      });
    } on Object {
      if (!mounted) return;
      setState(() => _loadingHistory = false);
    }
  }

  Future<void> _commit(String term) async {
    final trimmed = term.trim();
    if (trimmed.isEmpty) return;
    setState(() => _query = trimmed);
    _controller.text = trimmed;
    _controller.selection = TextSelection.collapsed(offset: trimmed.length);
    try {
      final history = await ref
          .read(airvanaRepositoryProvider)
          .pushSearchHistory(trimmed);
      if (mounted) setState(() => _history = history);
    } on Object {
      // 历史写失败不该影响搜索本身。
    }
  }

  Future<void> _removeHistory(String? term) async {
    try {
      final history = await ref
          .read(airvanaRepositoryProvider)
          .removeSearchHistory(term);
      if (mounted) setState(() => _history = history);
    } on Object {
      // 忽略
    }
  }

  @override
  Widget build(BuildContext context) {
    final snapshot = ref.watch(discoverProvider);
    final playables = snapshot.asData?.value ?? const <Playable>[];
    final hits = searchPlayables(playables, _query);
    final hasQuery = _query.trim().isNotEmpty;

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: TextField(
          key: const ValueKey('search-screen-field'),
          controller: _controller,
          focusNode: _focus,
          textInputAction: TextInputAction.search,
          onChanged: (value) => setState(() => _query = value),
          onSubmitted: _commit,
          decoration: InputDecoration(
            border: InputBorder.none,
            hintText: '搜索作品、创作者、分类',
            suffixIcon: hasQuery
                ? IconButton(
                    key: const ValueKey('search-screen-clear'),
                    tooltip: '清除',
                    icon: const Icon(Icons.close_rounded, size: 18),
                    onPressed: () {
                      _controller.clear();
                      setState(() => _query = '');
                      _focus.requestFocus();
                    },
                  )
                : null,
          ),
        ),
      ),
      body: hasQuery
          ? _Results(
              hits: hits,
              query: _query,
              onOpen: (id) {
                _commit(_query);
                context.push('/runtime/$id');
              },
            )
          : _EmptyState(
              history: _history,
              loading: _loadingHistory,
              playables: playables,
              onPick: _commit,
              onRemove: _removeHistory,
            ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({
    required this.history,
    required this.loading,
    required this.playables,
    required this.onPick,
    required this.onRemove,
  });

  final List<String> history;
  final bool loading;
  final List<Playable> playables;
  final ValueChanged<String> onPick;
  final ValueChanged<String?> onRemove;

  @override
  Widget build(BuildContext context) {
    // 热门取目录靠前的几条分类，避免空页面什么都没有。
    final hot = <String>[];
    for (final item in playables) {
      if (!hot.contains(item.category)) hot.add(item.category);
      if (hot.length >= 8) break;
    }

    return ListView(
      key: const ValueKey('search-screen-empty'),
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 40),
      children: [
        if (loading)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 24),
            child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
          )
        else if (history.isNotEmpty) ...[
          Row(
            children: [
              const Expanded(
                child: Text(
                  '搜索记录',
                  style: TextStyle(fontWeight: FontWeight.w800),
                ),
              ),
              TextButton(
                key: const ValueKey('search-screen-clear-history'),
                onPressed: () => onRemove(null),
                child: const Text('清空'),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final term in history)
                InputChip(
                  key: ValueKey('search-history-$term'),
                  label: Text(term),
                  onPressed: () => onPick(term),
                  onDeleted: () => onRemove(term),
                  deleteIcon: const Icon(Icons.close_rounded, size: 14),
                ),
            ],
          ),
          const SizedBox(height: 24),
        ],
        const Text('热门分类', style: TextStyle(fontWeight: FontWeight.w800)),
        const SizedBox(height: 10),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final term in hot)
              ActionChip(
                key: ValueKey('search-hot-$term'),
                label: Text(term),
                onPressed: () => onPick(term),
              ),
          ],
        ),
      ],
    );
  }
}

class _Results extends StatelessWidget {
  const _Results({
    required this.hits,
    required this.query,
    required this.onOpen,
  });

  final List<SearchHit> hits;
  final String query;
  final ValueChanged<String> onOpen;

  @override
  Widget build(BuildContext context) {
    if (hits.isEmpty) {
      return Center(
        key: const ValueKey('search-screen-no-result'),
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Text(
            '没有匹配「$query」的内容\n换个关键词试试，支持拼写不全与中英混搜',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ),
      );
    }
    return ListView.separated(
      key: const ValueKey('search-screen-results'),
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: hits.length,
      separatorBuilder: (_, _) => const Divider(height: 1),
      itemBuilder: (context, index) {
        final hit = hits[index];
        return ListTile(
          key: ValueKey('search-result-${hit.kind}-${hit.title}'),
          title: _Highlighted(text: hit.title, ranges: hit.titleRanges),
          subtitle: Text(
            hit.subtitle,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          leading: _KindBadge(kind: hit.kind),
          trailing: hit.playableId == null
              ? null
              : const Icon(Icons.chevron_right_rounded, size: 18),
          onTap: hit.playableId == null ? null : () => onOpen(hit.playableId!),
        );
      },
    );
  }
}

class _KindBadge extends StatelessWidget {
  const _KindBadge({required this.kind});

  final String kind;

  @override
  Widget build(BuildContext context) {
    final color = switch (kind) {
      '作品' => const Color(0xFF2F6BFF),
      '创作者' => const Color(0xFF00A870),
      _ => const Color(0xFF8A6BFF),
    };
    return Container(
      width: 44,
      height: 44,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        kind,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w800,
          color: color,
        ),
      ),
    );
  }
}

/// 把命中的片段加粗，让用户看清为什么这条被搜出来——
/// 尤其在子序列命中时，不高亮的话结果会显得莫名其妙。
class _Highlighted extends StatelessWidget {
  const _Highlighted({required this.text, required this.ranges});

  final String text;
  final List<(int, int)> ranges;

  @override
  Widget build(BuildContext context) {
    final base = Theme.of(context).textTheme.bodyLarge;
    if (ranges.isEmpty) {
      return Text(
        text,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: base,
      );
    }
    final spans = <TextSpan>[];
    var cursor = 0;
    for (final (start, end) in ranges) {
      if (start > cursor) {
        spans.add(TextSpan(text: text.substring(cursor, start)));
      }
      spans.add(
        TextSpan(
          text: text.substring(start, end),
          style: const TextStyle(fontWeight: FontWeight.w900),
        ),
      );
      cursor = end;
    }
    if (cursor < text.length) {
      spans.add(TextSpan(text: text.substring(cursor)));
    }
    return RichText(
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      text: TextSpan(style: base, children: spans),
    );
  }
}
