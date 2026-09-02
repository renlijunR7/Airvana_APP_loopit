import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/design_system/app_state_view.dart';
import 'package:airvana_mobile/features/shared/domain/airvana_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class ConnectedDiscoverScreen extends ConsumerStatefulWidget {
  const ConnectedDiscoverScreen({super.key});

  @override
  ConsumerState<ConnectedDiscoverScreen> createState() =>
      _ConnectedDiscoverScreenState();
}

class _ConnectedDiscoverScreenState
    extends ConsumerState<ConnectedDiscoverScreen> {
  int _tab = 0;
  String _query = '';
  bool _searching = false;

  @override
  Widget build(BuildContext context) {
    final discover = ref.watch(discoverProvider);
    final home = ref.watch(homeProvider).value;
    final source = discover.value ?? const <Playable>[];
    final items = _filter(source, home?.followingUserIds ?? const <String>{});
    final localDemo = home?.localDemo ?? false;
    return SafeArea(
      bottom: false,
      child: Column(
        children: [
          if (localDemo)
            _LegacyDiscoverHeader(
              selected: _tab,
              searching: _searching,
              query: _query,
              onSelected: (value) => setState(() => _tab = value),
              onSearchToggle: () => setState(() {
                _searching = !_searching;
                if (!_searching) _query = '';
              }),
              onQuery: (value) => setState(() => _query = value),
            )
          else ...[
            _DiscoverHeader(
              query: _query,
              onQuery: (value) => setState(() => _query = value),
            ),
            _DiscoverTabs(
              selected: _tab,
              onSelected: (value) => setState(() => _tab = value),
            ),
          ],
          Expanded(
            child: localDemo
                ? _legacyBody(discover, items)
                : _body(discover, items),
          ),
        ],
      ),
    );
  }

  List<Playable> _filter(List<Playable> source, Set<String> following) {
    final query = _query.trim().toLowerCase();
    var result = source
        .where(
          (item) =>
              query.isEmpty ||
              item.title.toLowerCase().contains(query) ||
              item.authorName.toLowerCase().contains(query) ||
              item.category.toLowerCase().contains(query),
        )
        .toList(growable: true);
    if (_tab == 1) {
      result = result
          .where((item) => following.contains(item.ownerUserId))
          .toList(growable: true);
    } else if (_tab == 2) {
      result.sort(
        (left, right) => (right.likes + right.comments * 2).compareTo(
          left.likes + left.comments * 2,
        ),
      );
    } else if (_tab == 3) {
      result = result.reversed.toList(growable: true);
    }
    return result;
  }

  Widget _body(AsyncValue<List<Playable>> state, List<Playable> items) {
    if (state.isLoading && !state.hasValue) {
      return const Center(child: CircularProgressIndicator());
    }
    if (state.hasError && !state.hasValue) {
      return AppStateView(
        icon: Icons.cloud_off_rounded,
        title: '发现页载入失败',
        message: '${state.error}',
        actionLabel: '重试',
        onAction: () => ref.invalidate(discoverProvider),
      );
    }
    if (items.isEmpty) {
      return const AppStateView(
        icon: Icons.search_off_rounded,
        title: '没有匹配的 Playable',
        message: '尝试其他关键词或切换发现分类。',
      );
    }
    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(discoverProvider);
        ref.invalidate(homeProvider);
      },
      child: GridView.builder(
        key: const ValueKey('connected-discover-grid'),
        padding: const EdgeInsets.fromLTRB(18, 14, 18, 110),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          crossAxisSpacing: 12,
          mainAxisSpacing: 14,
          childAspectRatio: .72,
        ),
        itemCount: items.length,
        itemBuilder: (context, index) => _DiscoverCard(
          playable: items[index],
          onTap: () => context.push('/runtime/${items[index].id}'),
        ),
      ),
    );
  }

  Widget _legacyBody(AsyncValue<List<Playable>> state, List<Playable> items) {
    if (state.isLoading && !state.hasValue) {
      return const Center(child: CircularProgressIndicator());
    }
    if (state.hasError && !state.hasValue) {
      return AppStateView(
        icon: Icons.cloud_off_rounded,
        title: '发现页载入失败',
        message: '${state.error}',
        actionLabel: '重试',
        onAction: () => ref.invalidate(discoverProvider),
      );
    }
    if (items.isEmpty) {
      return const AppStateView(
        icon: Icons.search_off_rounded,
        title: '没有匹配的 Agentic Playable',
        message: '尝试其他关键词或切换发现分类。',
      );
    }
    return RefreshIndicator(
      onRefresh: () async {
        ref.invalidate(discoverProvider);
        ref.invalidate(homeProvider);
      },
      child: Semantics(
        label: '发现内容列表',
        child: ListView(
          key: const ValueKey('legacy-discover-list'),
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 118),
          children: [
            _LegacyDiscoverSection(
              title: '#原创新游',
              description: '${items.length} 款原创离线游戏 · 全部具备三阶段玩法与重玩闭环',
              cards: items
                  .map(
                    (playable) => _LegacyDiscoverPlayableCard(
                      playable: playable,
                      likeCount: playable.id == 'plb_orchard_merge'
                          ? 1
                          : playable.likes,
                      onTap: () => context.push(
                        '/runtime/${playable.id}',
                        extra: playable,
                      ),
                    ),
                  )
                  .toList(growable: false),
            ),
            const SizedBox(height: 19),
            _LegacyDiscoverSection(
              title: '#服务端已发布作品',
              description: '来自本地服务的真实 Artifact · 点击在新窗口打开公开运行页',
              cards: _legacyServerArtifacts
                  .map(
                    (item) => _LegacyArtifactCard(
                      item: item,
                      onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            '“${item.title}”为 Web 基准中的服务端 Artifact；Flutter 默认复刻仅记录打开意图。',
                          ),
                        ),
                      ),
                    ),
                  )
                  .toList(growable: false),
            ),
            const SizedBox(height: 19),
            _LegacyDiscoverSection(
              title: '#安全教育',
              description: '用互动故事解释产品价值，并保留 KOL 链接、版本与归因证据。',
              cards: const [
                _LegacyStaticCard(
                  icon: '🧭',
                  title: '产品探索路径',
                  author: 'Sora',
                  likes: '640',
                  comments: '52',
                ),
                _LegacyStaticCard(
                  icon: '🛡️',
                  title: '钱包安全体检报告',
                  author: 'Wren',
                  likes: '940',
                  comments: '76',
                ),
                _LegacyStaticCard(
                  icon: '🧮',
                  title: '创作者收益计算器',
                  author: 'TomNo',
                  likes: '520',
                  comments: '88',
                ),
              ],
            ),
            const SizedBox(height: 19),
            _LegacyDiscoverSection(
              title: '#社区增长',
              description: '已完成一次 Campaign，保留内容、版本、归因与运营学习用于新项目复制。',
              cards: const [
                _LegacyStaticCard(
                  icon: '🌃',
                  title: '霓虹城市品牌解谜',
                  author: 'Leo',
                  likes: '284',
                  comments: '19',
                ),
                _LegacyStaticCard(
                  icon: '🧱',
                  title: '完美叠叠塔 Perfect Block Tower',
                  author: 'Jaspe',
                  likes: '28,500',
                  comments: '4,900',
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _DiscoverHeader extends StatelessWidget {
  const _DiscoverHeader({required this.query, required this.onQuery});

  final String query;
  final ValueChanged<String> onQuery;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(18, 8, 18, 8),
    child: Row(
      children: [
        const Text(
          '发现',
          style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: SizedBox(
            height: 40,
            child: TextField(
              onChanged: onQuery,
              decoration: InputDecoration(
                hintText: '搜索 Playable / KOL',
                prefixIcon: const Icon(Icons.search_rounded, size: 20),
                suffixIcon: query.isEmpty
                    ? null
                    : IconButton(
                        tooltip: '清除搜索',
                        onPressed: () => onQuery(''),
                        icon: const Icon(Icons.close_rounded, size: 18),
                      ),
                contentPadding: EdgeInsets.zero,
              ),
            ),
          ),
        ),
      ],
    ),
  );
}

class _DiscoverTabs extends StatelessWidget {
  const _DiscoverTabs({required this.selected, required this.onSelected});

  final int selected;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context) {
    const labels = ['推荐', '关注', '热门', '最新'];
    return SizedBox(
      height: 43,
      child: Row(
        children: List.generate(labels.length, (index) {
          final active = selected == index;
          return Expanded(
            child: InkWell(
              onTap: () => onSelected(index),
              child: Center(
                child: Text(
                  labels[index],
                  style: TextStyle(
                    color: active ? AirvanaColors.ink : AirvanaColors.muted,
                    fontWeight: active ? FontWeight.w900 : FontWeight.w600,
                    decoration: active ? TextDecoration.underline : null,
                    decorationColor: AirvanaColors.accent,
                    decorationThickness: 3,
                    decorationStyle: TextDecorationStyle.solid,
                  ),
                ),
              ),
            ),
          );
        }),
      ),
    );
  }
}

class _LegacyDiscoverHeader extends StatelessWidget {
  const _LegacyDiscoverHeader({
    required this.selected,
    required this.searching,
    required this.query,
    required this.onSelected,
    required this.onSearchToggle,
    required this.onQuery,
  });

  final int selected;
  final bool searching;
  final String query;
  final ValueChanged<int> onSelected;
  final VoidCallback onSearchToggle;
  final ValueChanged<String> onQuery;

  @override
  Widget build(BuildContext context) {
    const labels = ['推荐', '关注', '热门', '最新'];
    return AnimatedSwitcher(
      duration: const Duration(milliseconds: 180),
      child: searching
          ? SizedBox(
              key: const ValueKey('legacy-discover-search'),
              height: 54,
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 6, 12, 6),
                child: Row(
                  children: [
                    IconButton(
                      tooltip: '关闭搜索',
                      onPressed: onSearchToggle,
                      icon: const Icon(Icons.arrow_back_ios_new_rounded),
                    ),
                    Expanded(
                      child: TextField(
                        autofocus: true,
                        onChanged: onQuery,
                        decoration: InputDecoration(
                          hintText: '搜索 Agentic Playable',
                          prefixIcon: const Icon(Icons.search_rounded),
                          suffixIcon: query.isEmpty
                              ? null
                              : IconButton(
                                  tooltip: '清除搜索',
                                  onPressed: () => onQuery(''),
                                  icon: const Icon(Icons.close_rounded),
                                ),
                          contentPadding: EdgeInsets.zero,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            )
          : Container(
              key: const ValueKey('legacy-discover-tabs'),
              height: 54,
              padding: const EdgeInsets.fromLTRB(12, 0, 8, 0),
              decoration: const BoxDecoration(
                border: Border(bottom: BorderSide(color: AirvanaColors.line)),
              ),
              child: Row(
                children: [
                  ...List.generate(labels.length, (index) {
                    final active = selected == index;
                    return InkWell(
                      onTap: () => onSelected(index),
                      borderRadius: BorderRadius.circular(8),
                      child: SizedBox(
                        width: 47,
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              labels[index],
                              style: TextStyle(
                                color: active
                                    ? AirvanaColors.ink
                                    : AirvanaColors.muted,
                                fontSize: 13,
                                fontWeight: active
                                    ? FontWeight.w900
                                    : FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 7),
                            AnimatedContainer(
                              duration: const Duration(milliseconds: 180),
                              width: 28,
                              height: 2.5,
                              decoration: BoxDecoration(
                                color: active
                                    ? AirvanaColors.accent
                                    : Colors.transparent,
                                borderRadius: BorderRadius.circular(99),
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                  const Spacer(),
                  IconButton(
                    tooltip: '搜索 Agentic Playable',
                    onPressed: onSearchToggle,
                    icon: const Icon(Icons.search_rounded, size: 23),
                  ),
                ],
              ),
            ),
    );
  }
}

class _LegacyDiscoverSection extends StatelessWidget {
  const _LegacyDiscoverSection({
    required this.title,
    required this.description,
    required this.cards,
  });

  final String title;
  final String description;
  final List<Widget> cards;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        title,
        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900),
      ),
      const SizedBox(height: 5),
      Text(
        description,
        style: const TextStyle(color: AirvanaColors.muted, fontSize: 10),
      ),
      const SizedBox(height: 12),
      SizedBox(
        height: 302,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          itemCount: cards.length,
          separatorBuilder: (_, __) => const SizedBox(width: 10),
          itemBuilder: (_, index) => cards[index],
        ),
      ),
    ],
  );
}

class _LegacyDiscoverPlayableCard extends StatelessWidget {
  const _LegacyDiscoverPlayableCard({
    required this.playable,
    required this.likeCount,
    required this.onTap,
  });

  final Playable playable;
  final int likeCount;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => _LegacyDiscoverCardFrame(
    semanticLabel:
        '${playable.title} 游戏封面 ${playable.title} ${playable.authorName} $likeCount ${playable.comments}',
    title: playable.title,
    author: playable.authorName,
    likes: '$likeCount',
    comments: '${playable.comments}',
    onTap: onTap,
    cover: playable.coverAsset.isNotEmpty
        ? Image.asset(
            playable.coverAsset,
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => const ColoredBox(
              color: Color(0xFF18251F),
              child: Center(
                child: Icon(Icons.sports_esports, color: Colors.white54),
              ),
            ),
          )
        : const ColoredBox(
            color: Color(0xFF18251F),
            child: Center(
              child: Icon(Icons.sports_esports, color: Colors.white54),
            ),
          ),
  );
}

class _LegacyArtifact {
  const _LegacyArtifact(this.title, this.author);

  final String title;
  final String author;
}

const _legacyServerArtifacts = <_LegacyArtifact>[
  _LegacyArtifact('灰度投放实测内容', 'Kai Creator · 服务端 Artifact'),
  _LegacyArtifact('[演示] 钱包签名安全挑战', 'Kai Creator · 服务端 Artifact'),
  _LegacyArtifact('KOL 品牌互动挑战', 'e2e.flow · 服务端 Artifact'),
  _LegacyArtifact('[演示] 钱包签名安全挑战', 'Kai Creator · 服务端 Artifact'),
  _LegacyArtifact('浏览器验收：钱包安全互动', 'Kai Creator · 服务端 Artifact'),
];

class _LegacyArtifactCard extends StatelessWidget {
  const _LegacyArtifactCard({required this.item, required this.onTap});

  final _LegacyArtifact item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => _LegacyDiscoverCardFrame(
    semanticLabel: '🛰 ${item.title} ${item.author} — —',
    title: item.title,
    author: item.author,
    likes: '—',
    comments: '—',
    onTap: onTap,
    cover: const DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF172537), Color(0xFF0C1118)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Center(child: Text('🛰', style: TextStyle(fontSize: 28))),
    ),
  );
}

class _LegacyStaticCard extends StatelessWidget {
  const _LegacyStaticCard({
    required this.icon,
    required this.title,
    required this.author,
    required this.likes,
    required this.comments,
  });

  final String icon;
  final String title;
  final String author;
  final String likes;
  final String comments;

  @override
  Widget build(BuildContext context) => _LegacyDiscoverCardFrame(
    semanticLabel: '$icon $title $author $likes $comments',
    title: title,
    author: author,
    likes: likes,
    comments: comments,
    onTap: () => ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text('“$title”为 Web 基准中的本地内容演示。'))),
    cover: DecoratedBox(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF273047), Color(0xFF121522)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Center(child: Text(icon, style: const TextStyle(fontSize: 30))),
    ),
  );
}

class _LegacyDiscoverCardFrame extends StatelessWidget {
  const _LegacyDiscoverCardFrame({
    required this.semanticLabel,
    required this.title,
    required this.author,
    required this.likes,
    required this.comments,
    required this.onTap,
    required this.cover,
  });

  final String semanticLabel;
  final String title;
  final String author;
  final String likes;
  final String comments;
  final VoidCallback onTap;
  final Widget cover;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    label: semanticLabel,
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(13),
      child: SizedBox(
        width: 148,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(13),
              child: SizedBox(width: 148, height: 226, child: cover),
            ),
            const SizedBox(height: 8),
            ExcludeSemantics(
              child: Text(
                title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
            const SizedBox(height: 5),
            Row(
              children: [
                CircleAvatar(
                  radius: 8,
                  backgroundColor: const Color(0xFFEDE1FF),
                  child: Text(
                    author.characters.first,
                    style: const TextStyle(fontSize: 8),
                  ),
                ),
                const SizedBox(width: 5),
                Expanded(
                  child: ExcludeSemantics(
                    child: Text(
                      author,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AirvanaColors.muted,
                        fontSize: 9,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 5),
            ExcludeSemantics(
              child: Row(
                children: [
                  const Icon(Icons.favorite_border_rounded, size: 12),
                  const SizedBox(width: 3),
                  Text(likes, style: const TextStyle(fontSize: 9)),
                  const SizedBox(width: 10),
                  const Icon(Icons.chat_bubble_outline_rounded, size: 11),
                  const SizedBox(width: 3),
                  Text(comments, style: const TextStyle(fontSize: 9)),
                ],
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

class _DiscoverCard extends StatelessWidget {
  const _DiscoverCard({required this.playable, required this.onTap});

  final Playable playable;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => InkWell(
    key: ValueKey('connected-discover-${playable.id}'),
    onTap: onTap,
    borderRadius: BorderRadius.circular(18),
    child: ClipRRect(
      borderRadius: BorderRadius.circular(18),
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (playable.coverAsset.isNotEmpty)
            Image.asset(
              playable.coverAsset,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) =>
                  const ColoredBox(color: Color(0xFF24332B)),
            )
          else
            const ColoredBox(color: Color(0xFF24332B)),
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Colors.transparent, Color(0xED000000)],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
            ),
          ),
          Positioned(
            left: 10,
            right: 10,
            top: 10,
            child: Align(
              alignment: Alignment.centerLeft,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xB8000000),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: const Text(
                  'SERVER',
                  style: TextStyle(
                    color: Color(0xFF8DE6AE),
                    fontSize: 8,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
            ),
          ),
          Positioned(
            left: 12,
            right: 12,
            bottom: 12,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  playable.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                    height: 1.15,
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  playable.authorName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.white70, fontSize: 10),
                ),
                const SizedBox(height: 7),
                Row(
                  children: [
                    const Icon(
                      Icons.favorite_rounded,
                      color: Colors.white70,
                      size: 13,
                    ),
                    const SizedBox(width: 3),
                    Text(
                      '${playable.likes}',
                      style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 9,
                      ),
                    ),
                    const SizedBox(width: 9),
                    const Icon(
                      Icons.chat_bubble_rounded,
                      color: Colors.white70,
                      size: 12,
                    ),
                    const SizedBox(width: 3),
                    Text(
                      '${playable.comments}',
                      style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 9,
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
  );
}
