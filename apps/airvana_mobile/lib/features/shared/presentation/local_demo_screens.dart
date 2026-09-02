import 'dart:math' as math;

import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/design_system/legacy_web_assets.dart';
import 'package:airvana_mobile/features/network/presentation/growth_network_detail_screen.dart';
import 'package:airvana_mobile/features/shared/data/legacy_demo_catalog.dart';
import 'package:airvana_mobile/features/shared/domain/airvana_models.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class LocalDiscoverScreen extends StatefulWidget {
  const LocalDiscoverScreen({super.key});

  @override
  State<LocalDiscoverScreen> createState() => _LocalDiscoverScreenState();
}

class _LocalDiscoverScreenState extends State<LocalDiscoverScreen> {
  int _tab = 0;

  // Keep the legacy Web demo's persisted initial relationship exactly: the
  // local KOL follows Leo only. None of the fixed 38 arcade entries belongs
  // to Leo, so the initial "关注" rail intentionally renders its empty state.
  static const _followedOwners = <String>{'@leo.art'};

  // The Web page sorts `latest` by its numeric session id. The discover rail
  // itself is intentionally grouped (34...44, 24...33, then selected legacy
  // ids), so reversing the rail would not reproduce that interaction.
  static const _latestIds = <String>[
    'plb_garden_renewal',
    'plb_studio_wardrobe',
    'plb_hex_frontier',
    'plb_idiom_detective',
    'plb_adventurer_journal',
    'plb_crystal_bastion',
    'plb_star_deck',
    'plb_microbe_arena',
    'plb_moonlight_tea_shop',
    'plb_star_mower',
    'plb_orchard_merge',
    'plb_paws_stage',
    'plb_magic_choir',
    'plb_red_cup_shuffle',
    'plb_pixel_quest',
    'plb_stellar_farm',
    'plb_safety_workshop',
    'plb_void_squadron',
    'plb_nova_drift',
    'plb_ember_bastion',
    'plb_deep_catch',
    'plb_star_cups',
    'plb_prism_match',
    'plb_rune_circuit',
    'plb_sky_stack',
    'plb_pulse_forge',
    'plb_neon_dash',
    'plb_sky_cannon',
    'plb_city_rush',
    'plb_galaxy_toy_shop',
    'plb_formation_knights',
    'plb_stardust_island',
    'plb_rift_strike',
    'plb_jungle_dive',
    'plb_coin_journey',
    'plb_whisker_escape',
    'plb_firefly_mail',
    'plb_puppet_studio',
  ];

  static const _showcaseSections = <_DiscoverShowcaseSection>[
    _DiscoverShowcaseSection(
      id: 'safety',
      title: '安全教育',
      description: '用互动故事解释产品价值，并保留 KOL 链接、版本与归因证据。',
      items: [
        _DiscoverShowcaseItem(
          id: 'product-exploration',
          title: '产品探索路径',
          author: 'Sora',
          likes: 640,
          comments: 52,
          coverAsset: 'assets/legacy/covers/product-exploration.png',
        ),
        _DiscoverShowcaseItem(
          id: 'wallet-safety-report',
          title: '钱包安全体检报告',
          author: 'Wren',
          likes: 940,
          comments: 76,
          coverAsset: 'assets/legacy/covers/safety-workshop.jpg',
        ),
        _DiscoverShowcaseItem(
          id: 'creator-revenue-calculator',
          title: '创作者收益计算器',
          author: 'TomNo',
          likes: 520,
          comments: 88,
          placeholderIcon: Icons.calculate_outlined,
        ),
      ],
    ),
    _DiscoverShowcaseSection(
      id: 'community',
      title: '社区增长',
      description: '已完成一次 Campaign，保留内容、版本、归因与运营学习用于新项目复制。',
      items: [
        _DiscoverShowcaseItem(
          id: 'neon-city-brand-puzzle',
          title: '霓虹城市品牌解谜',
          author: 'Leo',
          likes: 284,
          comments: 19,
          coverAsset: 'assets/legacy/covers/rune-circuit.jpg',
        ),
        _DiscoverShowcaseItem(
          id: 'perfect-block-tower',
          title: '完美叠叠塔 Perfect Block Tower',
          author: 'Jaspe',
          likes: 28500,
          comments: 4900,
          coverAsset: 'assets/legacy/covers/sky-stack.jpg',
        ),
        _DiscoverShowcaseItem(
          id: 'product-exploration',
          title: '产品探索路径',
          author: 'Sora',
          likes: 640,
          comments: 52,
          coverAsset: 'assets/legacy/covers/product-exploration.png',
        ),
      ],
    ),
    _DiscoverShowcaseSection(
      id: 'attribution',
      title: '效果归因',
      description: '用互动故事解释产品价值，并保留 KOL 链接、版本与归因证据。',
      items: [
        _DiscoverShowcaseItem(
          id: 'product-exploration',
          title: '产品探索路径',
          author: 'Sora',
          likes: 640,
          comments: 52,
          coverAsset: 'assets/legacy/covers/product-exploration.png',
        ),
        _DiscoverShowcaseItem(
          id: 'neon-city-brand-puzzle',
          title: '霓虹城市品牌解谜',
          author: 'Leo',
          likes: 284,
          comments: 19,
          coverAsset: 'assets/legacy/covers/rune-circuit.jpg',
        ),
        _DiscoverShowcaseItem(
          id: 'creator-revenue-calculator',
          title: '创作者收益计算器',
          author: 'TomNo',
          likes: 520,
          comments: 88,
          placeholderIcon: Icons.calculate_outlined,
        ),
        _DiscoverShowcaseItem(
          id: 'starlight-collector',
          title: '夜空拾光 Starlight Collector',
          author: 'TomAnger',
          likes: 680,
          comments: 140,
          coverAsset: 'assets/legacy/covers/stardust-island.jpg',
        ),
      ],
    ),
  ];

  List<Playable> _visiblePlayables() {
    final source = LegacyDemoCatalog.legacyWebPlayables;
    switch (_tab) {
      case 1:
        return source
            .where((playable) => _followedOwners.contains(playable.ownerHandle))
            .toList(growable: false);
      case 2:
        final originalIndex = <String, int>{
          for (var index = 0; index < source.length; index++)
            source[index].id: index,
        };
        return [...source]..sort((left, right) {
          final byHeat = (right.likes + right.comments * 2).compareTo(
            left.likes + left.comments * 2,
          );
          if (byHeat != 0) return byHeat;
          // JavaScript Array#sort is stable. Preserve Web rail order for the
          // many zero-metric LOCAL DEMO arcade entries.
          return originalIndex[left.id]!.compareTo(originalIndex[right.id]!);
        });
      case 3:
        final byId = {for (final playable in source) playable.id: playable};
        return _latestIds.map((id) => byId[id]!).toList(growable: false);
      default:
        return source;
    }
  }

  Future<void> _openSearch() => showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    backgroundColor: Colors.transparent,
    builder: (context) =>
        _DiscoverSearchSheet(playables: LegacyDemoCatalog.legacyWebPlayables),
  );

  @override
  Widget build(BuildContext context) {
    const tabs = ['推荐', '关注', '热门', '最新'];
    final items = _visiblePlayables();
    final cardWidth =
        (MediaQuery.sizeOf(context).width - AirvanaMetrics.pageGutter * 2) *
            .4 -
        8;

    return SafeArea(
      bottom: false,
      child: CustomScrollView(
        key: const ValueKey('legacy-discover-scroll'),
        slivers: [
          SliverPersistentHeader(
            pinned: true,
            delegate: _DiscoverHeaderDelegate(
              child: ColoredBox(
                color: AirvanaColors.canvas,
                child: Container(
                  padding: const EdgeInsets.fromLTRB(20, 2, 12, 0),
                  decoration: const BoxDecoration(
                    border: Border(
                      bottom: BorderSide(color: AirvanaColors.line),
                    ),
                  ),
                  child: Row(
                    children: [
                      ...List.generate(tabs.length, (index) {
                        final selected = _tab == index;
                        return Padding(
                          padding: const EdgeInsets.only(right: 18),
                          child: InkWell(
                            onTap: () => setState(() => _tab = index),
                            child: Container(
                              height: 48,
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                border: Border(
                                  bottom: BorderSide(
                                    width: 2,
                                    color: selected
                                        ? AirvanaColors.accent
                                        : Colors.transparent,
                                  ),
                                ),
                              ),
                              child: Text(
                                tabs[index],
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: selected
                                      ? FontWeight.w900
                                      : FontWeight.w600,
                                  color: selected
                                      ? AirvanaColors.ink
                                      : AirvanaColors.muted,
                                ),
                              ),
                            ),
                          ),
                        );
                      }),
                      const Spacer(),
                      IconButton(
                        tooltip: '搜索 Agentic Playable',
                        onPressed: _openSearch,
                        constraints: const BoxConstraints.tightFor(
                          width: 30,
                          height: 30,
                        ),
                        padding: EdgeInsets.zero,
                        icon: const Icon(Icons.search_rounded, size: 19),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 0, 6),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(right: 20),
                    child: Row(
                      children: [
                        const Text(
                          '#原创新游',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const Spacer(),
                        Text(
                          '${items.length} / 38',
                          key: const ValueKey('discover-visible-count'),
                          style: const TextStyle(
                            color: AirvanaColors.muted,
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Padding(
                    padding: EdgeInsets.only(right: 20),
                    child: Text(
                      'LOCAL DEMO · 38 款原创离线游戏 · 全部具备三阶段玩法与重玩闭环',
                      style: TextStyle(
                        color: AirvanaColors.muted,
                        fontSize: 11,
                        height: 1.5,
                      ),
                    ),
                  ),
                  const SizedBox(height: 11),
                  if (items.isEmpty)
                    const Padding(
                      padding: EdgeInsets.fromLTRB(0, 32, 20, 42),
                      child: _LocalEmptyState(
                        icon: Icons.person_search_outlined,
                        title: '暂无关注作品',
                        description: '关注创作者后，其 Agentic Playable 会显示在这里。',
                      ),
                    )
                  else
                    SizedBox(
                      height: cardWidth * 14 / 9 + 100,
                      child: ListView.separated(
                        key: ValueKey('discover-playable-rail-$_tab'),
                        scrollDirection: Axis.horizontal,
                        padding: const EdgeInsets.only(right: 20),
                        itemCount: items.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 10),
                        itemBuilder: (context, index) => _DiscoverCard(
                          key: ValueKey('discover-card-${items[index].id}'),
                          playable: items[index],
                          width: cardWidth,
                        ),
                      ),
                    ),
                  if (_tab == 0)
                    for (final section in _showcaseSections) ...[
                      const SizedBox(height: 22),
                      _DiscoverShowcaseRail(
                        section: section,
                        cardWidth: cardWidth,
                      ),
                    ],
                ],
              ),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 80)),
        ],
      ),
    );
  }
}

class _DiscoverHeaderDelegate extends SliverPersistentHeaderDelegate {
  const _DiscoverHeaderDelegate({required this.child});
  final Widget child;

  @override
  double get minExtent => 51;
  @override
  double get maxExtent => 51;
  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) => child;
  @override
  bool shouldRebuild(covariant _DiscoverHeaderDelegate oldDelegate) => true;
}

class _DiscoverCard extends StatelessWidget {
  const _DiscoverCard({super.key, required this.playable, required this.width});
  final Playable playable;
  final double width;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: width,
    child: InkWell(
      onTap: () => context.push('/runtime/${playable.id}', extra: playable),
      borderRadius: BorderRadius.circular(15),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(15),
            child: AspectRatio(
              aspectRatio: 9 / 14,
              child: Image.asset(
                playable.coverAsset,
                key: ValueKey('discover-cover-${playable.id}'),
                fit: BoxFit.cover,
              ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            playable.title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 7),
          Row(
            children: [
              const CircleAvatar(
                radius: 9,
                backgroundImage: AssetImage('assets/legacy/avatars/kai.png'),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  playable.authorName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 10,
                    color: Color(0xFF636366),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Container(
                key: ValueKey('discover-category-${playable.id}'),
                constraints: const BoxConstraints(maxWidth: 82),
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFFF7F7FA),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: AirvanaColors.line),
                ),
                child: Text(
                  playable.category,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 8,
                    color: AirvanaColors.muted,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
              const Spacer(),
              const Text(
                'LOCAL DEMO',
                style: TextStyle(
                  fontSize: 7,
                  color: AirvanaColors.accent,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              const Icon(Icons.favorite_border_rounded, size: 12),
              const SizedBox(width: 3),
              Text('${playable.likes}', style: _metaStyle),
              const SizedBox(width: 11),
              const Icon(Icons.chat_bubble_outline_rounded, size: 12),
              const SizedBox(width: 3),
              Text('${playable.comments}', style: _metaStyle),
            ],
          ),
        ],
      ),
    ),
  );

  static const _metaStyle = TextStyle(fontSize: 10, color: AirvanaColors.muted);
}

class _DiscoverShowcaseSection {
  const _DiscoverShowcaseSection({
    required this.id,
    required this.title,
    required this.description,
    required this.items,
  });

  final String id;
  final String title;
  final String description;
  final List<_DiscoverShowcaseItem> items;
}

class _DiscoverShowcaseItem {
  const _DiscoverShowcaseItem({
    required this.id,
    required this.title,
    required this.author,
    required this.likes,
    required this.comments,
    this.coverAsset,
    this.placeholderIcon,
  });

  final String id;
  final String title;
  final String author;
  final int likes;
  final int comments;
  final String? coverAsset;
  final IconData? placeholderIcon;
}

class _DiscoverShowcaseRail extends StatelessWidget {
  const _DiscoverShowcaseRail({required this.section, required this.cardWidth});

  final _DiscoverShowcaseSection section;
  final double cardWidth;

  Future<void> _openItem(
    BuildContext context,
    _DiscoverShowcaseItem item,
  ) => showModalBottomSheet<void>(
    context: context,
    useSafeArea: true,
    backgroundColor: Colors.transparent,
    builder: (context) => Material(
      color: Colors.white,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 18, 24, 28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    item.title,
                    key: ValueKey('discover-showcase-detail-${item.id}'),
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                IconButton(
                  tooltip: '关闭本地展示详情',
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close_rounded),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              '${item.author} · ${item.likes} 赞 · ${item.comments} 评论',
              style: const TextStyle(fontSize: 12, color: AirvanaColors.muted),
            ),
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(13),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF7F8),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFFFD6DA)),
              ),
              child: const Text(
                'LOCAL DEMO 展示条目 · 保留旧 Web 发现页数据；当前未接入 Flutter 可运行容器，不代表已发布或可运行 Playable。',
                style: TextStyle(
                  fontSize: 11,
                  height: 1.55,
                  color: AirvanaColors.muted,
                ),
              ),
            ),
          ],
        ),
      ),
    ),
  );

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        '#${section.title}',
        key: ValueKey('discover-showcase-section-${section.id}'),
        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900),
      ),
      const SizedBox(height: 4),
      Padding(
        padding: const EdgeInsets.only(right: 20),
        child: Text(
          section.description,
          style: const TextStyle(
            fontSize: 11,
            height: 1.5,
            color: AirvanaColors.muted,
          ),
        ),
      ),
      const SizedBox(height: 11),
      SizedBox(
        height: cardWidth * 14 / 9 + 100,
        child: ListView.separated(
          key: ValueKey('discover-showcase-rail-${section.id}'),
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.only(right: 20),
          itemCount: section.items.length,
          separatorBuilder: (_, __) => const SizedBox(width: 10),
          itemBuilder: (context, index) {
            final item = section.items[index];
            return _DiscoverShowcaseCard(
              key: ValueKey('discover-showcase-${section.id}-${item.id}'),
              item: item,
              width: cardWidth,
              onTap: () => _openItem(context, item),
            );
          },
        ),
      ),
    ],
  );
}

class _DiscoverShowcaseCard extends StatelessWidget {
  const _DiscoverShowcaseCard({
    super.key,
    required this.item,
    required this.width,
    required this.onTap,
  });

  final _DiscoverShowcaseItem item;
  final double width;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: width,
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(15),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(15),
            child: AspectRatio(
              aspectRatio: 9 / 14,
              child: item.coverAsset == null
                  ? DecoratedBox(
                      key: ValueKey('discover-placeholder-${item.id}'),
                      decoration: const BoxDecoration(
                        gradient: LinearGradient(
                          colors: [Color(0xFF24352B), Color(0xFF0B1710)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            item.placeholderIcon ?? Icons.widgets_outlined,
                            color: Colors.white,
                            size: 34,
                          ),
                          const SizedBox(height: 9),
                          const Text(
                            'LOCAL DEMO\n封面占位',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 9,
                              height: 1.45,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ],
                      ),
                    )
                  : Image.asset(
                      item.coverAsset!,
                      key: ValueKey('discover-showcase-cover-${item.id}'),
                      fit: BoxFit.cover,
                    ),
            ),
          ),
          const SizedBox(height: 8),
          Text(
            item.title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 7),
          Row(
            children: [
              const CircleAvatar(
                radius: 9,
                backgroundImage: AssetImage('assets/legacy/avatars/kai.png'),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  item.author,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 10,
                    color: Color(0xFF636366),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 9),
          Row(
            children: [
              const Text(
                'LOCAL DEMO',
                style: TextStyle(
                  fontSize: 7,
                  color: AirvanaColors.accent,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(width: 5),
              Expanded(
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerRight,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.favorite_border_rounded, size: 12),
                      const SizedBox(width: 3),
                      Text('${item.likes}', style: _DiscoverCard._metaStyle),
                      const SizedBox(width: 9),
                      const Icon(Icons.chat_bubble_outline_rounded, size: 12),
                      const SizedBox(width: 3),
                      Text('${item.comments}', style: _DiscoverCard._metaStyle),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    ),
  );
}

class _DiscoverSearchSheet extends StatefulWidget {
  const _DiscoverSearchSheet({required this.playables});

  final List<Playable> playables;

  @override
  State<_DiscoverSearchSheet> createState() => _DiscoverSearchSheetState();
}

class _DiscoverSearchSheetState extends State<_DiscoverSearchSheet> {
  final _controller = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  List<Playable> get _results {
    final query = _query.trim().toLowerCase();
    if (query.isEmpty) return widget.playables;
    return widget.playables
        .where((playable) {
          final searchText = [
            playable.title,
            playable.authorName,
            playable.ownerHandle,
            playable.category,
            playable.summary,
          ].join(' ').toLowerCase();
          return searchText.contains(query);
        })
        .toList(growable: false);
  }

  @override
  Widget build(BuildContext context) {
    final results = _results;
    return FractionallySizedBox(
      heightFactor: .88,
      child: Material(
        color: AirvanaColors.canvas,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        clipBehavior: Clip.antiAlias,
        child: Column(
          children: [
            const SizedBox(height: 9),
            Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: const Color(0xFFD1D1D6),
                borderRadius: BorderRadius.circular(999),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 14, 12, 12),
              child: Row(
                children: [
                  const Expanded(
                    child: Text(
                      '搜索 Agentic Playable',
                      style: TextStyle(
                        fontSize: 17,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  IconButton(
                    tooltip: '关闭搜索',
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close_rounded),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: TextField(
                key: const ValueKey('discover-search-field'),
                controller: _controller,
                autofocus: true,
                onChanged: (value) => setState(() => _query = value),
                textInputAction: TextInputAction.search,
                decoration: InputDecoration(
                  hintText: '搜索作品、创作者或类型',
                  prefixIcon: const Icon(Icons.search_rounded, size: 20),
                  suffixIcon: _query.isEmpty
                      ? null
                      : IconButton(
                          tooltip: '清除搜索',
                          onPressed: () {
                            _controller.clear();
                            setState(() => _query = '');
                          },
                          icon: const Icon(Icons.cancel_outlined, size: 19),
                        ),
                  filled: true,
                  fillColor: Colors.white,
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(15),
                    borderSide: const BorderSide(color: AirvanaColors.line),
                  ),
                  enabledBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(15),
                    borderSide: const BorderSide(color: AirvanaColors.line),
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  '搜索结果 · ${results.length}',
                  key: const ValueKey('discover-search-result-count'),
                  style: const TextStyle(
                    fontSize: 11,
                    color: AirvanaColors.muted,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ),
            Expanded(
              child: results.isEmpty
                  ? const _LocalEmptyState(
                      icon: Icons.search_off_rounded,
                      title: '没有匹配的 Playable',
                      description: '换一个作品名、创作者或玩法类型试试。',
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.fromLTRB(20, 0, 20, 28),
                      itemCount: results.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (context, index) {
                        final playable = results[index];
                        return InkWell(
                          key: ValueKey('discover-search-${playable.id}'),
                          onTap: () {
                            Navigator.of(context).pop();
                            context.push(
                              '/runtime/${playable.id}',
                              extra: playable,
                            );
                          },
                          borderRadius: BorderRadius.circular(15),
                          child: Container(
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
                                    playable.coverAsset,
                                    width: 54,
                                    height: 68,
                                    fit: BoxFit.cover,
                                  ),
                                ),
                                const SizedBox(width: 11),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        playable.title,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w900,
                                        ),
                                      ),
                                      const SizedBox(height: 5),
                                      Text(
                                        'LOCAL DEMO · ${playable.authorName} · ${playable.category}',
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          fontSize: 10,
                                          color: AirvanaColors.muted,
                                        ),
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        playable.stage,
                                        style: const TextStyle(
                                          fontSize: 9,
                                          color: AirvanaColors.accent,
                                          fontWeight: FontWeight.w800,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                const Icon(
                                  Icons.chevron_right_rounded,
                                  color: Color(0xFFC7C7CC),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LocalEmptyState extends StatelessWidget {
  const _LocalEmptyState({
    required this.icon,
    required this.title,
    required this.description,
  });

  final IconData icon;
  final String title;
  final String description;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 54,
            height: 54,
            decoration: BoxDecoration(
              color: const Color(0xFFFFF1F2),
              borderRadius: BorderRadius.circular(18),
            ),
            child: Icon(icon, color: AirvanaColors.accent, size: 25),
          ),
          const SizedBox(height: 12),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 5),
          Text(
            description,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 10,
              height: 1.5,
              color: AirvanaColors.muted,
            ),
          ),
        ],
      ),
    ),
  );
}

class LocalNetworkScreen extends StatefulWidget {
  const LocalNetworkScreen({super.key});

  @override
  State<LocalNetworkScreen> createState() => _LocalNetworkScreenState();
}

class _LegacyPageHeader extends StatelessWidget {
  const _LegacyPageHeader({
    required this.title,
    this.actionIconWidget,
    this.actionTooltip,
    this.onAction,
  });

  final String title;
  final Widget? actionIconWidget;
  final String? actionTooltip;
  final VoidCallback? onAction;
  @override
  Widget build(BuildContext context) => SizedBox(
    height: 52,
    child: Stack(
      children: [
        Positioned.fill(
          left: 16,
          right: 58,
          child: Align(
            alignment: Alignment.centerLeft,
            child: Text(
              title,
              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900),
            ),
          ),
        ),
        if (actionIconWidget != null)
          Positioned(
            right: 16,
            child: SizedBox(
              width: 38,
              height: 38,
              child: IconButton(
                tooltip: actionTooltip,
                onPressed: onAction,
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints.tightFor(
                  width: 38,
                  height: 38,
                ),
                icon: actionIconWidget!,
              ),
            ),
          ),
      ],
    ),
  );
}

class _LocalNetworkScreenState extends State<LocalNetworkScreen> {
  int _filter = 0;

  static const _perfectBlockTower = Playable(
    id: 'plb_perfect_block_tower',
    title: '完美叠叠塔 Perfect Block Tower',
    authorName: 'Jaspe',
    contentType: 'video',
    version: 3,
    summary: '手感解压的叠塔小游戏，用于提升日活与停留时长的演示样例。',
    coverAsset: 'assets/legacy/covers/sky-stack.jpg',
    stage: '优化中',
    ownerHandle: '@jaspe.clay',
    category: '社区增长',
    localDemo: true,
  );

  static const _brandPuzzle = Playable(
    id: 'plb_neon_brand_puzzle',
    title: '霓虹城市品牌解谜',
    authorName: 'Leo',
    contentType: 'article',
    version: 4,
    summary: '已完成一次 Campaign，保留内容、版本、归因与运营学习用于新项目复制。',
    coverAsset: 'assets/legacy/covers/rune-circuit.jpg',
    stage: '可复制',
    ownerHandle: '@leo.art',
    category: '品牌互动',
    localDemo: true,
  );

  static const _productExploration = Playable(
    id: 'plb_product_exploration',
    title: '产品探索路径',
    authorName: 'Sora',
    contentType: 'article',
    version: 2,
    summary: '用互动故事解释产品价值，并保留 KOL 链接、版本与归因证据。',
    coverAsset: 'assets/legacy/covers/product-exploration.png',
    stage: '增长中',
    ownerHandle: '@sora',
    category: '效果归因',
    localDemo: true,
  );

  static final _networkGroups = <List<_NetworkEntry>>[
    [
      _NetworkEntry(
        playable: LegacyDemoCatalog.byId('plb_safety_workshop')!,
        metrics: '1,284 互动 · 86 演示转化',
      ),
      _NetworkEntry(
        playable: LegacyDemoCatalog.byId('plb_stellar_farm')!,
        metrics: '3,860 互动 · 142 演示转化',
      ),
      _NetworkEntry(playable: _productExploration, metrics: '640 互动 · 52 演示转化'),
    ],
    [
      _NetworkEntry(
        playable: LegacyDemoCatalog.byId('plb_neon_dash')!,
        metrics: '0 互动 · 0 演示转化',
      ),
      _NetworkEntry(
        playable: LegacyDemoCatalog.byId('plb_pulse_forge')!,
        metrics: '0 互动 · 0 演示转化',
      ),
      _NetworkEntry(
        playable: LegacyDemoCatalog.byId('plb_sky_stack')!,
        metrics: '0 互动 · 0 演示转化',
      ),
    ],
    [
      _NetworkEntry(
        playable: LegacyDemoCatalog.byId('plb_city_rush')!,
        metrics: '9,240 互动 · 348 演示转化',
      ),
      _NetworkEntry(
        playable: _perfectBlockTower,
        metrics: '8,600 互动 · 305 演示转化',
      ),
      _NetworkEntry(
        playable: LegacyDemoCatalog.byId('plb_sky_cannon')!,
        metrics: '7,560 互动 · 296 演示转化',
      ),
    ],
    [
      _NetworkEntry(playable: _brandPuzzle, metrics: '512 互动 · 18 演示转化'),
      _NetworkEntry(
        playable: LegacyDemoCatalog.byId('plb_red_cup_shuffle')!,
        metrics: '5,200 互动 · 210 演示转化',
      ),
      _NetworkEntry(
        playable: LegacyDemoCatalog.byId('plb_puppet_studio')!,
        metrics: '4,400 互动 · 176 演示转化',
      ),
    ],
  ];

  Future<void> _openNetworkGuide() =>
      Navigator.of(context, rootNavigator: true).push<void>(
        MaterialPageRoute<void>(
          builder: (_) => const GrowthNetworkDetailScreen(),
        ),
      );

  @override
  Widget build(BuildContext context) {
    final playables = _networkGroups[_filter];
    return SafeArea(
      bottom: false,
      child: ListView(
        key: const ValueKey('legacy-network-scroll'),
        padding: const EdgeInsets.only(bottom: 92),
        children: [
          _LegacyPageHeader(
            title: '增长网络',
            actionIconWidget: const GrowthForcePulseIcon(),
            actionTooltip: '了解 AI 分身与 Airvana 网络',
            onAction: _openNetworkGuide,
          ),
          const _NetworkGlobeStage(),
          const SizedBox(height: 14),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              children: [
                _Metric(value: '1,280,000', label: '有效贡献'),
                SizedBox(width: 10),
                _Metric(value: '3,482', label: '运营节点'),
                SizedBox(width: 10),
                _Metric(value: '8,640', label: '价值转化', accent: true),
              ],
            ),
          ),
          const SizedBox(
            key: ValueKey('network-metrics-content-gap'),
            height: 12,
          ),
          Container(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(22)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: List.generate(4, (index) {
                    const labels = ['推荐', '运行中', '增长最快', '品牌合作'];
                    return Expanded(
                      child: Padding(
                        padding: EdgeInsets.only(right: index == 3 ? 0 : 6),
                        child: _FilterChip(
                          key: ValueKey('network-filter-$index'),
                          label: labels[index],
                          selected: _filter == index,
                          onTap: () => setState(() => _filter = index),
                        ),
                      ),
                    );
                  }),
                ),
                const SizedBox(height: 15),
                const Text(
                  '正在增长的 Agentic Playables',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900),
                ),
                const SizedBox(height: 3),
                const Text(
                  'Playable 是营销智能体，KOL 是运营者',
                  style: TextStyle(fontSize: 10, color: AirvanaColors.muted),
                ),
                const SizedBox(height: 10),
                ...playables.map(
                  (item) => Padding(
                    padding: const EdgeInsets.only(bottom: 9),
                    child: _NetworkPlayableCard(
                      playable: item.playable,
                      metrics: item.metrics,
                    ),
                  ),
                ),
                const SizedBox(height: 6),
                const Row(
                  children: [
                    Text(
                      '网络最新动态',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    Spacer(),
                    Text(
                      '版本、增长与里程碑',
                      style: TextStyle(
                        fontSize: 10,
                        color: AirvanaColors.muted,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                const _NetworkActivity(
                  title: 'Kai Chen',
                  body: '发布「Crypto City 安全挑战」v2',
                  value: '运行中',
                ),
                const _NetworkActivity(
                  title: 'Pixel_Mind',
                  body: '完成 18 个演示转化',
                  value: '待结算',
                ),
                const _NetworkActivity(
                  title: 'Nina',
                  body: '为社区版本启动新一轮互动实验',
                  value: 'v3',
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _NetworkEntry {
  const _NetworkEntry({required this.playable, required this.metrics});

  final Playable playable;
  final String metrics;
}

class _NetworkGlobeStage extends StatefulWidget {
  const _NetworkGlobeStage();

  @override
  State<_NetworkGlobeStage> createState() => _NetworkGlobeStageState();
}

class _NetworkGlobeStageState extends State<_NetworkGlobeStage>
    with TickerProviderStateMixin {
  static const _rotationDuration = Duration(seconds: 42);

  double _yaw = 0;
  double _tilt = .3;
  double _phase = 0;
  double _velocityX = 0;
  double _velocityY = 0;
  late final AnimationController _rotation;
  AnimationController? _inertia;

  @override
  void initState() {
    super.initState();
    _rotation = AnimationController(vsync: this, duration: _rotationDuration);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.disableAnimationsOf(context)) {
      _rotation.stop();
    } else if (!_rotation.isAnimating) {
      _rotation.repeat();
    }
  }

  @override
  void dispose() {
    _rotation.dispose();
    _inertia?.dispose();
    super.dispose();
  }

  void _stopInertia() {
    _inertia?.dispose();
    _inertia = null;
  }

  void _drag(DragUpdateDetails details) {
    _stopInertia();
    setState(() {
      _yaw += details.delta.dx * .008;
      _tilt = (_tilt + details.delta.dy * .0045).clamp(-.85, .85);
      _velocityX = details.delta.dx * .0014;
      _velocityY = details.delta.dy * .0008;
      _phase += .012;
    });
  }

  void _release(DragEndDetails details) {
    if (MediaQuery.disableAnimationsOf(context)) return;
    _stopInertia();
    _inertia =
        AnimationController(
          vsync: this,
          duration: const Duration(milliseconds: 720),
        )..addListener(() {
          if (!mounted) return;
          setState(() {
            _yaw += _velocityX;
            _tilt = (_tilt + _velocityY).clamp(-.85, .85);
            _phase += .0016;
            _velocityX *= .94;
            _velocityY *= .90;
          });
        });
    _inertia!.forward();
  }

  @override
  Widget build(BuildContext context) => Semantics(
    label: '缓慢顺时针自转、也可用手指拖动的增长网络地球',
    child: GestureDetector(
      key: const ValueKey('network-globe'),
      behavior: HitTestBehavior.opaque,
      onPanStart: (_) => _stopInertia(),
      onPanUpdate: _drag,
      onPanEnd: _release,
      onPanCancel: _stopInertia,
      child: SizedBox(
        height: 286,
        child: Center(
          child: SizedBox(
            width: 350,
            height: 280,
            child: AnimatedBuilder(
              animation: _rotation,
              builder: (context, child) => CustomPaint(
                key: const ValueKey('network-globe-paint'),
                painter: _NetworkPainter(
                  yaw: _yaw + _rotation.value * math.pi * 2,
                  tilt: _tilt,
                  phase: _phase + _rotation.value * 2,
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

class _NetworkPainter extends CustomPainter {
  const _NetworkPainter({
    required this.yaw,
    required this.tilt,
    required this.phase,
  });

  final double yaw;
  final double tilt;
  final double phase;

  static const Map<int, List<List<int>>> _land = {
    1: [
      [10, 14],
      [18, 21],
      [40, 47],
    ],
    2: [
      [8, 16],
      [17, 21],
      [26, 29],
      [30, 47],
    ],
    3: [
      [4, 8],
      [9, 17],
      [22, 22],
      [26, 47],
    ],
    4: [
      [3, 7],
      [8, 17],
      [23, 24],
      [25, 47],
    ],
    5: [
      [5, 17],
      [24, 46],
    ],
    6: [
      [5, 16],
      [23, 26],
      [27, 43],
      [44, 45],
    ],
    7: [
      [6, 15],
      [22, 33],
      [36, 43],
      [44, 44],
    ],
    8: [
      [7, 10],
      [12, 13],
      [21, 32],
      [33, 36],
      [37, 42],
    ],
    9: [
      [7, 10],
      [20, 30],
      [33, 36],
      [38, 42],
    ],
    10: [
      [9, 11],
      [21, 30],
      [33, 34],
      [38, 43],
    ],
    11: [
      [10, 14],
      [22, 29],
      [38, 44],
    ],
    12: [
      [10, 15],
      [23, 28],
      [38, 46],
    ],
    13: [
      [10, 15],
      [23, 28],
      [40, 43],
    ],
    14: [
      [10, 14],
      [23, 27],
      [40, 45],
    ],
    15: [
      [10, 13],
      [24, 26],
      [39, 45],
    ],
    16: [
      [10, 13],
      [24, 25],
      [40, 44],
    ],
    17: [
      [10, 12],
      [46, 47],
    ],
    18: [
      [10, 11],
      [46, 46],
    ],
    19: [
      [10, 10],
    ],
  };

  static final List<({double lat, double lon})> _cells = [
    for (final entry in _land.entries)
      for (final range in entry.value)
        for (var column = range[0]; column <= range[1]; column++)
          for (var subY = 0; subY < 2; subY++)
            for (var subX = 0; subX < 2; subX++)
              (
                lat: (90 - (entry.key + subY * .5 + .25) * 7.5) * math.pi / 180,
                lon: (-180 + (column + subX * .5 + .25) * 7.5) * math.pi / 180,
              ),
  ];

  static const _agentIndexes = [
    13,
    47,
    101,
    166,
    220,
    285,
    341,
    398,
    455,
    512,
    580,
    640,
  ];

  static const _arcs = [
    [0, 4],
    [2, 7],
    [5, 10],
    [1, 8],
    [3, 11],
    [6, 9],
  ];

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    const radius = 111.0;
    final glow = Paint()
      ..shader = RadialGradient(
        colors: [
          const Color(0xFFFF3B4A).withValues(alpha: 0),
          const Color(0xFFFF3B4A).withValues(alpha: .16),
          const Color(0xFFFF3B4A).withValues(alpha: 0),
        ],
        stops: const [.70, .79, 1],
      ).createShader(Rect.fromCircle(center: center, radius: radius * 1.26));
    canvas.drawCircle(center, radius * 1.26, glow);
    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..shader = RadialGradient(
          center: const Alignment(-.3, -.35),
          colors: [
            Colors.white,
            const Color(0xFFFFF4F5),
            const Color(0xFFFBE9EB),
          ],
          stops: const [0, .75, 1],
        ).createShader(Rect.fromCircle(center: center, radius: radius)),
    );
    canvas.drawCircle(
      center,
      radius,
      Paint()
        ..color = const Color(0xFFFF3B4A).withValues(alpha: .28)
        ..style = PaintingStyle.stroke
        ..strokeWidth = .75,
    );

    ({Offset point, double depth}) project(double lat, double lon) {
      final rotatedLon = lon + yaw;
      final x = math.cos(lat) * math.sin(rotatedLon);
      final y = math.sin(lat);
      final z = math.cos(lat) * math.cos(rotatedLon);
      final tiltedY = y * math.cos(tilt) - z * math.sin(tilt);
      final tiltedZ = y * math.sin(tilt) + z * math.cos(tilt);
      return (
        point: Offset(center.dx + radius * x, center.dy - radius * tiltedY),
        depth: tiltedZ,
      );
    }

    final red = const Color(0xFFFF3B4A);
    for (final cell in _cells) {
      final projected = project(cell.lat, cell.lon);
      if (projected.depth <= .02) continue;
      canvas.drawCircle(
        projected.point,
        .85 + .95 * projected.depth,
        Paint()..color = red.withValues(alpha: .16 + .60 * projected.depth),
      );
    }

    final agents = [
      for (final index in _agentIndexes)
        project(
          _cells[index % _cells.length].lat,
          _cells[index % _cells.length].lon,
        ),
    ];

    for (var index = 0; index < _arcs.length; index++) {
      final first = agents[_arcs[index][0]];
      final second = agents[_arcs[index][1]];
      if (first.depth <= .08 || second.depth <= .08) continue;
      final distance = (second.point - first.point).distance;
      final control = Offset(
        (first.point.dx + second.point.dx) / 2,
        (first.point.dy + second.point.dy) / 2 - math.min(50, distance * .35),
      );
      final path = Path()
        ..moveTo(first.point.dx, first.point.dy)
        ..quadraticBezierTo(
          control.dx,
          control.dy,
          second.point.dx,
          second.point.dy,
        );
      canvas.drawPath(
        path,
        Paint()
          ..color = red.withValues(alpha: .30)
          ..style = PaintingStyle.stroke
          ..strokeWidth = .6,
      );

      final progress = (phase * 3.5 + index * .37) % 1;
      final inverse = 1 - progress;
      final spark = Offset(
        inverse * inverse * first.point.dx +
            2 * inverse * progress * control.dx +
            progress * progress * second.point.dx,
        inverse * inverse * first.point.dy +
            2 * inverse * progress * control.dy +
            progress * progress * second.point.dy,
      );
      canvas.drawCircle(spark, 1.5, Paint()..color = red);
    }

    for (var index = 0; index < agents.length; index++) {
      final agent = agents[index];
      if (agent.depth <= .1) continue;
      final fromCenter = agent.point - center;
      final distance = fromCenter.distance;
      final direction = distance == 0 ? Offset.zero : fromCenter / distance;
      final pulse = (math.sin(phase * 24 + index * 2.1) + 1) / 2;
      final length = 13 + agent.depth * 13 + pulse * 4;
      final end = agent.point + direction * length;
      final pillar = Paint()
        ..shader = LinearGradient(
          colors: [red, red.withValues(alpha: 0)],
        ).createShader(Rect.fromPoints(agent.point, end))
        ..strokeCap = StrokeCap.round
        ..strokeWidth = 2;
      canvas.drawLine(agent.point, end, pillar);
      canvas.drawCircle(
        agent.point,
        2.1 + agent.depth * .8,
        Paint()..color = red,
      );
      canvas.drawCircle(
        agent.point,
        3 + pulse * 5,
        Paint()
          ..color = red.withValues(alpha: .4 * (1 - pulse))
          ..style = PaintingStyle.stroke
          ..strokeWidth = .75,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _NetworkPainter oldDelegate) =>
      yaw != oldDelegate.yaw ||
      tilt != oldDelegate.tilt ||
      phase != oldDelegate.phase;
}

class _Metric extends StatelessWidget {
  const _Metric({
    required this.value,
    required this.label,
    this.accent = false,
  });
  final String value;
  final String label;
  final bool accent;

  @override
  Widget build(BuildContext context) => Expanded(
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 5),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AirvanaColors.line),
      ),
      child: Column(
        children: [
          FittedBox(
            fit: BoxFit.scaleDown,
            child: Text(
              value,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w900,
                color: accent ? AirvanaColors.accent : AirvanaColors.ink,
              ),
            ),
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
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
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
      padding: const EdgeInsets.symmetric(vertical: 8),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: selected ? const Color(0xFFFFEFF1) : Colors.white,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: selected ? const Color(0xFFFFC5CA) : AirvanaColors.line,
        ),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w800,
          color: selected ? AirvanaColors.accent : AirvanaColors.muted,
        ),
      ),
    ),
  );
}

class _NetworkPlayableCard extends StatelessWidget {
  const _NetworkPlayableCard({required this.playable, required this.metrics});
  final Playable playable;
  final String metrics;

  @override
  Widget build(BuildContext context) => InkWell(
    onTap: () => context.push('/runtime/${playable.id}', extra: playable),
    borderRadius: BorderRadius.circular(16),
    child: Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AirvanaColors.line),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A1C1C1E),
            blurRadius: 14,
            offset: Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(13),
            child: SizedBox(
              width: 84,
              height: 92,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  Image.asset(playable.coverAsset, fit: BoxFit.cover),
                  const DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [Colors.transparent, Color(0xC205080C)],
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                      ),
                    ),
                  ),
                  Positioned(
                    right: 6,
                    top: 6,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 5,
                        vertical: 3,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.black54,
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        playable.stage,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 7,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 11),
          Expanded(
            child: SizedBox(
              height: 92,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    playable.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w900,
                      height: 1.35,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 11,
                        backgroundImage: AssetImage(
                          legacyWebAvatarAsset(
                            playable.ownerHandle.isEmpty
                                ? playable.authorName
                                : playable.ownerHandle,
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          '${playable.authorName} · v${playable.version}',
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 10,
                            color: Color(0xFF636366),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const Spacer(),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          metrics,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 9,
                            color: AirvanaColors.muted,
                          ),
                        ),
                      ),
                      const Text(
                        '立即体验 ›',
                        style: TextStyle(
                          fontSize: 9,
                          color: AirvanaColors.accent,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    ),
  );
}

class _NetworkActivity extends StatelessWidget {
  const _NetworkActivity({
    required this.title,
    required this.body,
    required this.value,
  });
  final String title;
  final String body;
  final String value;

  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(bottom: 8),
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
    decoration: BoxDecoration(
      color: const Color(0xFFF7F7FA),
      borderRadius: BorderRadius.circular(14),
      border: Border.all(color: AirvanaColors.line),
    ),
    child: Row(
      children: [
        const CircleAvatar(
          radius: 15,
          backgroundImage: AssetImage('assets/legacy/avatars/kai.png'),
        ),
        const SizedBox(width: 9),
        Expanded(
          child: Text.rich(
            TextSpan(
              style: const TextStyle(
                fontSize: 11,
                color: Color(0xFF3A3A3C),
                height: 1.45,
              ),
              children: [
                TextSpan(
                  text: '$title ',
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    color: AirvanaColors.ink,
                  ),
                ),
                TextSpan(text: body),
              ],
            ),
          ),
        ),
        Column(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            const Text(
              'LOCAL DEMO',
              style: TextStyle(
                fontSize: 7,
                color: AirvanaColors.accent,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 3),
            Text(
              value,
              style: const TextStyle(
                fontSize: 10,
                color: AirvanaColors.accent,
                fontWeight: FontWeight.w900,
              ),
            ),
          ],
        ),
      ],
    ),
  );
}

class LocalMessagesScreen extends StatefulWidget {
  const LocalMessagesScreen({super.key});

  @override
  State<LocalMessagesScreen> createState() => _LocalMessagesScreenState();
}

class _LocalMessagesScreenState extends State<LocalMessagesScreen> {
  int _tab = 0;
  final _readIds = <String>{};
  final _directReplies = <String, List<String>>{};

  static const _notifications = <_MessageRow>[
    _MessageRow(
      id: 'notification-kol-review',
      title: 'Crypto City v2 待复核',
      body: '素材授权、CTA 与归因字段需要在提交发布前确认。',
      status: '运营 · 本地演示',
      kind: _MessageKind.notification,
      initiallyUnread: true,
      actionLabel: '查看审核边界',
    ),
    _MessageRow(
      id: 'notification-kol-contract',
      title: 'Campaign Contract 待确认',
      body: '品牌目标、成功事件、地区和结算字段仍保持锁定。',
      status: 'Campaign · 本地演示',
      kind: _MessageKind.notification,
      initiallyUnread: true,
      actionLabel: '查看 Contract 摘要',
    ),
    _MessageRow(
      id: 'notification-kol-publish',
      title: '发布连接器等待服务接入',
      body: '获批作品可进入渠道确认页，当前不会自动对外发布。',
      status: '发布 · 服务端待接',
      kind: _MessageKind.notification,
      initiallyUnread: true,
      actionLabel: '查看发布边界',
    ),
    _MessageRow(
      id: 'notification-preview-generated-unread-1',
      title: '本地 Playable 预览已生成',
      body: '真实前端构建阶段已完成，可试玩成功、失败、重试与退出路径。',
      status: '未读',
      kind: _MessageKind.notification,
      initiallyUnread: true,
      countsTowardBadge: true,
      statusFollowsRead: true,
      actionLabel: '查看本地预览说明',
    ),
    _MessageRow(
      id: 'notification-preview-generated-read-1',
      title: '本地 Playable 预览已生成',
      body: '真实前端构建阶段已完成，可试玩成功、失败、重试与退出路径。',
      status: '已读',
      kind: _MessageKind.notification,
      statusFollowsRead: true,
      actionLabel: '查看本地预览说明',
    ),
    _MessageRow(
      id: 'notification-preview-campaign-unread',
      title: '本地 Playable 预览已生成',
      body: '已生成可试玩版本并保存 Campaign 结构化产物，等待人工审核。',
      status: '未读',
      kind: _MessageKind.notification,
      initiallyUnread: true,
      countsTowardBadge: true,
      statusFollowsRead: true,
      actionLabel: '查看 Campaign 产物说明',
    ),
    _MessageRow(
      id: 'notification-preview-campaign-read',
      title: '本地 Playable 预览已生成',
      body: '已生成可试玩版本并保存 Campaign 结构化产物，等待人工审核。',
      status: '已读',
      kind: _MessageKind.notification,
      statusFollowsRead: true,
      actionLabel: '查看 Campaign 产物说明',
    ),
    _MessageRow(
      id: 'notification-ait-settlement-approved',
      title: 'AIT 结算审核已通过',
      body: '10 AIT 对应权益已通过结算复核，已进入待付款队列；实际到账以付款凭证为准。',
      status: '已读',
      kind: _MessageKind.notification,
      statusFollowsRead: true,
      actionLabel: '查看结算边界',
    ),
    _MessageRow(
      id: 'notification-review',
      title: 'Playable v2 等待审核',
      body: '「Crypto City 安全挑战」正在核对互动、CTA 与归因节点。',
      status: '已读',
      kind: _MessageKind.notification,
      statusFollowsRead: true,
      actionLabel: '查看作品审核状态',
    ),
    _MessageRow(
      id: 'notification-attribution',
      title: '归因证据已更新',
      body: '只有通过服务器确认、去重与风控的成功事件才进入结算证据。',
      status: '已读',
      kind: _MessageKind.notification,
      statusFollowsRead: true,
      actionLabel: '查看归因说明',
    ),
    _MessageRow(
      id: 'notification-welcome',
      title: '欢迎使用 Airvana',
      body: '开始创作并运营属于你的 Agentic Playable。',
      status: '已读',
      kind: _MessageKind.notification,
      statusFollowsRead: true,
      actionLabel: '了解本地演示',
    ),
  ];

  static const _social = <_MessageRow>[
    _MessageRow(
      id: 'social-share-orchard',
      title: '打开分享面板',
      body: '准备分享「果园合合塔 Orchard Merge」',
      status: '分享 · 本地记录',
      kind: _MessageKind.social,
      actionLabel: '查看本地分享记录',
    ),
    _MessageRow(
      id: 'social-save-orchard',
      title: '收藏状态已更新',
      body: '已收藏「果园合合塔 Orchard Merge」',
      status: '收藏 · 本地记录',
      kind: _MessageKind.social,
      actionLabel: '查看本地收藏记录',
    ),
    _MessageRow(
      id: 'social-like-orchard',
      title: '点赞状态已更新',
      body: '已点赞「果园合合塔 Orchard Merge」',
      status: '互动 · 本地记录',
      kind: _MessageKind.social,
      actionLabel: '查看本地点赞记录',
    ),
  ];

  static const _direct = <_MessageRow>[
    _MessageRow(
      id: 'direct-ai-twin',
      title: 'Kai 的 AI 分身',
      body: '有一条访客问题需要你确认后回复。',
      status: 'AI 辅助 · 本地演示',
      kind: _MessageKind.direct,
      initiallyUnread: true,
      countsTowardBadge: true,
      messages: ['有一条访客问题需要你确认后回复。'],
    ),
    _MessageRow(
      id: 'direct-nina',
      title: 'Nina',
      body: '星际农场 v3 的版本说明已更新。',
      status: '@nina · 相互关注',
      kind: _MessageKind.direct,
      messages: ['星际农场 v3 的版本说明已更新。'],
    ),
    _MessageRow(
      id: 'direct-leo',
      title: 'Leo',
      body: '霓虹城市的可复制资产已经整理好了。',
      status: '@leo.art · 已关注',
      kind: _MessageKind.direct,
      messages: ['霓虹城市的可复制资产已经整理好了。'],
    ),
  ];

  bool _isUnread(_MessageRow row) =>
      row.initiallyUnread && !_readIds.contains(row.id);

  int _badgeFor(int tab) {
    final rows = [_notifications, _social, _direct][tab];
    return rows.where((row) => row.countsTowardBadge && _isUnread(row)).length;
  }

  Future<void> _openRow(_MessageRow row) async {
    if (_isUnread(row)) setState(() => _readIds.add(row.id));
    if (row.kind == _MessageKind.direct) {
      await showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        useSafeArea: true,
        backgroundColor: Colors.transparent,
        builder: (context) => _DirectMessageSheet(
          row: row,
          replies: _directReplies[row.id] ?? const [],
          onSend: (message) => setState(() {
            _directReplies.putIfAbsent(row.id, () => []).add(message);
          }),
        ),
      );
      return;
    }
    await showModalBottomSheet<void>(
      context: context,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _MessageDetailSheet(row: row),
    );
  }

  @override
  Widget build(BuildContext context) {
    final rows = [_notifications, _social, _direct][_tab];
    const titles = ['运营待处理', '互动关系', '私信与 AI 辅助'];
    return SafeArea(
      bottom: false,
      child: Column(
        children: [
          const _LegacyPageHeader(title: '消息'),
          Container(
            height: 51,
            padding: const EdgeInsets.symmetric(horizontal: 20),
            decoration: const BoxDecoration(
              border: Border(bottom: BorderSide(color: AirvanaColors.line)),
            ),
            child: Row(
              children: List.generate(3, (index) {
                const labels = ['通知', '互动', '私信'];
                final selected = _tab == index;
                return Expanded(
                  child: InkWell(
                    onTap: () => setState(() => _tab = index),
                    child: Container(
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        border: Border(
                          bottom: BorderSide(
                            width: 2,
                            color: selected
                                ? AirvanaColors.accent
                                : Colors.transparent,
                          ),
                        ),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            labels[index],
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: selected
                                  ? FontWeight.w900
                                  : FontWeight.w600,
                              color: selected
                                  ? AirvanaColors.ink
                                  : AirvanaColors.muted,
                            ),
                          ),
                          if (_badgeFor(index) > 0) ...[
                            const SizedBox(width: 4),
                            Container(
                              key: ValueKey('message-badge-$index'),
                              constraints: const BoxConstraints(minWidth: 15),
                              height: 15,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 3,
                              ),
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                color: AirvanaColors.accent,
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: Text(
                                '${_badgeFor(index)}',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 7,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                  ),
                );
              }),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 10, 20, 12),
            child: Row(
              children: [
                Text(
                  titles[_tab],
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 7,
                    vertical: 3,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFEFF1),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: const Text(
                    'LOCAL DEMO',
                    style: TextStyle(
                      fontSize: 7,
                      color: AirvanaColors.accent,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                const Spacer(),
                if (_tab == 0)
                  InkWell(
                    onTap: () => setState(
                      () => _readIds.addAll(
                        _notifications
                            .where((row) => row.countsTowardBadge)
                            .map((row) => row.id),
                      ),
                    ),
                    child: const Text(
                      '全部已读',
                      style: TextStyle(
                        fontSize: 11,
                        color: AirvanaColors.accent,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
              ],
            ),
          ),
          Expanded(
            child: ListView.builder(
              key: ValueKey('message-list-$_tab'),
              padding: const EdgeInsets.only(bottom: 90),
              itemCount: rows.length,
              itemBuilder: (_, index) {
                final row = rows[index];
                final unread = _isUnread(row);
                return InkWell(
                  key: ValueKey('message-row-$_tab-$index-${row.id}'),
                  onTap: () => _openRow(row),
                  child: Container(
                    width: double.infinity,
                    constraints: const BoxConstraints(minHeight: 82),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 15,
                    ),
                    decoration: BoxDecoration(
                      color: unread ? const Color(0xFFFFF9FA) : Colors.white,
                      border: const Border(
                        bottom: BorderSide(color: AirvanaColors.line),
                      ),
                    ),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 21,
                          backgroundColor: const Color(0xFFFFF1F2),
                          child: Icon(
                            _tab == 0
                                ? Icons.notifications_none_rounded
                                : _tab == 1
                                ? Icons.favorite_border_rounded
                                : Icons.person_outline_rounded,
                            color: AirvanaColors.accent,
                            size: 21,
                          ),
                        ),
                        const SizedBox(width: 11),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                row.title,
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              const SizedBox(height: 5),
                              Text(
                                row.body,
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: AirvanaColors.muted,
                                  height: 1.55,
                                ),
                              ),
                              const SizedBox(height: 7),
                              Text(
                                row.statusFollowsRead
                                    ? (unread ? '未读' : '已读')
                                    : '${row.status}${unread && row.kind == _MessageKind.direct ? ' · 1 条未读' : ''}',
                                style: const TextStyle(
                                  fontSize: 9,
                                  color: Color(0xFFA0A0A6),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Text(
                          '›',
                          style: TextStyle(
                            fontSize: 18,
                            color: Color(0xFFC7C7CC),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

enum _MessageKind { notification, social, direct }

class _MessageRow {
  const _MessageRow({
    required this.id,
    required this.title,
    required this.body,
    required this.status,
    required this.kind,
    this.initiallyUnread = false,
    this.countsTowardBadge = false,
    this.statusFollowsRead = false,
    this.actionLabel = '查看本地详情',
    this.messages = const [],
  });

  final String id;
  final String title;
  final String body;
  final String status;
  final _MessageKind kind;
  final bool initiallyUnread;
  final bool countsTowardBadge;
  final bool statusFollowsRead;
  final String actionLabel;
  final List<String> messages;
}

class _MessageDetailSheet extends StatelessWidget {
  const _MessageDetailSheet({required this.row});

  final _MessageRow row;

  @override
  Widget build(BuildContext context) => Material(
    color: Colors.white,
    borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
    child: Padding(
      padding: const EdgeInsets.fromLTRB(24, 18, 24, 28),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: const BoxDecoration(
                  color: Color(0xFFFFF1F2),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  row.kind == _MessageKind.social
                      ? Icons.favorite_border_rounded
                      : Icons.notifications_none_rounded,
                  color: AirvanaColors.accent,
                ),
              ),
              const SizedBox(width: 11),
              Expanded(
                child: Text(
                  row.title,
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              IconButton(
                tooltip: '关闭消息详情',
                onPressed: () => Navigator.of(context).pop(),
                icon: const Icon(Icons.close_rounded),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            row.body,
            style: const TextStyle(
              fontSize: 13,
              height: 1.65,
              color: Color(0xFF3A3A3C),
            ),
          ),
          const SizedBox(height: 12),
          Text(
            row.status,
            style: const TextStyle(fontSize: 10, color: AirvanaColors.muted),
          ),
          const SizedBox(height: 18),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFF7F7FA),
              borderRadius: BorderRadius.circular(13),
              border: Border.all(color: AirvanaColors.line),
            ),
            child: const Text(
              '本页只执行本机查看与已读操作，不代表服务端审核、外部发布或消息送达。',
              style: TextStyle(
                fontSize: 10,
                height: 1.5,
                color: AirvanaColors.muted,
              ),
            ),
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: () => Navigator.of(context).pop(),
              child: Text(row.actionLabel),
            ),
          ),
        ],
      ),
    ),
  );
}

class _DirectMessageSheet extends StatefulWidget {
  const _DirectMessageSheet({
    required this.row,
    required this.replies,
    required this.onSend,
  });

  final _MessageRow row;
  final List<String> replies;
  final ValueChanged<String> onSend;

  @override
  State<_DirectMessageSheet> createState() => _DirectMessageSheetState();
}

class _DirectMessageSheetState extends State<_DirectMessageSheet> {
  final _controller = TextEditingController();
  late final List<String> _replies = [...widget.replies];

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _send() {
    final message = _controller.text.trim();
    if (message.isEmpty) return;
    widget.onSend(message);
    setState(() => _replies.add(message));
    _controller.clear();
  }

  @override
  Widget build(BuildContext context) => FractionallySizedBox(
    heightFactor: .82,
    child: Material(
      color: AirvanaColors.canvas,
      borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          Container(
            height: 58,
            padding: const EdgeInsets.fromLTRB(20, 0, 10, 0),
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(bottom: BorderSide(color: AirvanaColors.line)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        widget.row.title,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      Text(
                        widget.row.status,
                        style: const TextStyle(
                          fontSize: 9,
                          color: AirvanaColors.muted,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  tooltip: '关闭本机对话',
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close_rounded),
                ),
              ],
            ),
          ),
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 10, 20, 0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  'LOCAL DEMO',
                  style: TextStyle(
                    fontSize: 8,
                    color: AirvanaColors.accent,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                SizedBox(width: 6),
                Text(
                  '本机对话 · 不会自动对外发送',
                  style: TextStyle(fontSize: 9, color: AirvanaColors.muted),
                ),
              ],
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                for (final message in widget.row.messages)
                  _MessageBubble(message: message, fromMe: false),
                for (final message in _replies)
                  _MessageBubble(message: message, fromMe: true),
              ],
            ),
          ),
          Container(
            color: Colors.white,
            padding: EdgeInsets.fromLTRB(
              14,
              10,
              14,
              10 + MediaQuery.paddingOf(context).bottom,
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    key: const ValueKey('direct-message-input'),
                    controller: _controller,
                    textInputAction: TextInputAction.send,
                    onSubmitted: (_) => _send(),
                    decoration: InputDecoration(
                      hintText: '输入本机回复…',
                      filled: true,
                      fillColor: const Color(0xFFF7F7FA),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 11,
                      ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(999),
                        borderSide: const BorderSide(color: AirvanaColors.line),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(999),
                        borderSide: const BorderSide(color: AirvanaColors.line),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  key: const ValueKey('direct-message-send'),
                  tooltip: '保存本机回复',
                  onPressed: _send,
                  icon: const Icon(Icons.arrow_upward_rounded, size: 19),
                ),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({required this.message, required this.fromMe});

  final String message;
  final bool fromMe;

  @override
  Widget build(BuildContext context) => Align(
    alignment: fromMe ? Alignment.centerRight : Alignment.centerLeft,
    child: Container(
      constraints: const BoxConstraints(maxWidth: 280),
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: fromMe ? AirvanaColors.accent : Colors.white,
        borderRadius: BorderRadius.circular(15),
        border: fromMe ? null : Border.all(color: AirvanaColors.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            message,
            style: TextStyle(
              fontSize: 12,
              height: 1.45,
              color: fromMe ? Colors.white : AirvanaColors.ink,
            ),
          ),
          if (fromMe) ...[
            const SizedBox(height: 4),
            const Text(
              'LOCAL DEMO · 本机保存',
              style: TextStyle(
                fontSize: 8,
                color: Color(0xCCFFFFFF),
                fontWeight: FontWeight.w700,
              ),
            ),
          ],
        ],
      ),
    ),
  );
}
