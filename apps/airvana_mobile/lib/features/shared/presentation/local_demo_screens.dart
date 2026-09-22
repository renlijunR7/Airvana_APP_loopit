import 'dart:math' as math;

import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/design_system/legacy_web_assets.dart';
import 'package:airvana_mobile/features/network/presentation/growth_network_detail_screen.dart';
import 'package:airvana_mobile/features/shared/data/legacy_demo_catalog.dart';
import 'package:airvana_mobile/features/shared/domain/airvana_models.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

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

  /// 一个池子，四个筛选按 Web 的规则从中取：运行中看 stage，增长最快按演示转化
  /// 排序，品牌合作按分类匹配「品牌」。
  static final _networkPool = <_NetworkEntry>[
    _NetworkEntry(
      playable: LegacyDemoCatalog.byId('plb_safety_workshop')!,
      interactions: 1284,
      conversions: 86,
    ),
    _NetworkEntry(
      playable: LegacyDemoCatalog.byId('plb_stellar_farm')!,
      interactions: 3860,
      conversions: 142,
    ),
    _NetworkEntry(
      playable: _productExploration,
      interactions: 640,
      conversions: 52,
    ),
    _NetworkEntry(
      playable: LegacyDemoCatalog.byId('plb_neon_dash')!,
      interactions: 2150,
      conversions: 74,
    ),
    _NetworkEntry(
      playable: LegacyDemoCatalog.byId('plb_sky_stack')!,
      interactions: 1960,
      conversions: 61,
    ),
    _NetworkEntry(
      playable: LegacyDemoCatalog.byId('plb_city_rush')!,
      interactions: 9240,
      conversions: 348,
    ),
    _NetworkEntry(
      playable: _perfectBlockTower,
      interactions: 8600,
      conversions: 305,
    ),
    _NetworkEntry(
      playable: LegacyDemoCatalog.byId('plb_sky_cannon')!,
      interactions: 7560,
      conversions: 296,
    ),
    _NetworkEntry(playable: _brandPuzzle, interactions: 512, conversions: 18),
    _NetworkEntry(
      playable: LegacyDemoCatalog.byId('plb_red_cup_shuffle')!,
      interactions: 5200,
      conversions: 210,
    ),
    _NetworkEntry(
      playable: LegacyDemoCatalog.byId('plb_puppet_studio')!,
      interactions: 4400,
      conversions: 176,
    ),
  ];

  /// Web 的 worldSource：四个筛选各自的口径，最后都截断到前 3 条。
  List<_NetworkEntry> get _filteredNetworkEntries {
    final pool = [..._networkPool];
    final result = switch (_filter) {
      1 =>
        pool
            .where(
              (item) =>
                  item.playable.stage == '运行中' || item.playable.stage == '优化中',
            )
            .toList(growable: false),
      2 =>
        (pool..sort(
          (left, right) => right.conversions.compareTo(left.conversions),
        )),
      3 =>
        pool
            .where((item) => item.playable.category.contains('品牌'))
            .toList(growable: false),
      _ => pool,
    };
    return result.take(3).toList(growable: false);
  }

  Future<void> _openNetworkGuide() =>
      Navigator.of(context, rootNavigator: true).push<void>(
        MaterialPageRoute<void>(
          builder: (_) => const GrowthNetworkDetailScreen(),
        ),
      );

  @override
  Widget build(BuildContext context) {
    final playables = _filteredNetworkEntries;
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
          const Padding(
            key: ValueKey('network-metrics-note'),
            padding: EdgeInsets.fromLTRB(20, 8, 20, 0),
            child: Text(
              '演示网络数据 · 不代表真实 AIP、AIT 或商业结算',
              style: TextStyle(fontSize: 9, color: AirvanaColors.muted),
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
  const _NetworkEntry({
    required this.playable,
    required this.interactions,
    required this.conversions,
  });

  final Playable playable;
  final int interactions;
  final int conversions;

  String get metrics =>
      '${_formatCount(interactions)} 互动 · '
      '$conversions 演示转化';

  static String _formatCount(int value) {
    final digits = '$value';
    final buffer = StringBuffer();
    for (var index = 0; index < digits.length; index += 1) {
      if (index > 0 && (digits.length - index) % 3 == 0) buffer.write(',');
      buffer.write(digits[index]);
    }
    return buffer.toString();
  }
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
