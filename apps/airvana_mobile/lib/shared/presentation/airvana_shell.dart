import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

class ConnectedAirvanaShell extends ConsumerWidget {
  const ConnectedAirvanaShell({
    super.key,
    required this.selectedIndex,
    required this.child,
  });

  final int selectedIndex;
  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) => AirvanaShell(
    selectedIndex: selectedIndex,
    unreadCount: ref.watch(homeProvider).value?.unreadNotifications ?? 0,
    child: child,
  );
}

class AirvanaShell extends StatelessWidget {
  const AirvanaShell({
    super.key,
    required this.selectedIndex,
    required this.child,
    this.unreadCount = 0,
  });

  final int selectedIndex;
  final Widget child;
  final int unreadCount;

  static const _paths = ['/', '/discover', '/world', '/messages', '/profile'];
  static const _labels = ['首页', '发现', '节点', '消息', '我的'];

  @override
  Widget build(BuildContext context) {
    final dockWidth = (MediaQuery.sizeOf(context).width * .85)
        .clamp(0.0, AirvanaMetrics.navDockWidth)
        .toDouble();
    return Scaffold(
      extendBody: true,
      body: child,
      bottomNavigationBar: SafeArea(
        minimum: EdgeInsets.only(bottom: kIsWeb ? 46 : 14),
        child: Align(
          alignment: Alignment.bottomCenter,
          heightFactor: 1,
          child: SizedBox(
            width: dockWidth,
            child: Row(
              key: const ValueKey('primary-navigation'),
              children: [
                Expanded(
                  child: _LegacyGlassTabCapsule(
                    selectedIndex: selectedIndex,
                    labels: _labels,
                    unreadCount: unreadCount,
                    onSelected: (index) => context.go(_paths[index]),
                  ),
                ),
                const SizedBox(width: 10),
                Semantics(
                  button: true,
                  label: '创作游戏',
                  child: Material(
                    key: const ValueKey('creation-plus'),
                    color: AirvanaColors.accent,
                    elevation: 0,
                    shape: const CircleBorder(),
                    clipBehavior: Clip.antiAlias,
                    child: Ink(
                      decoration: const ShapeDecoration(
                        color: AirvanaColors.accent,
                        shape: CircleBorder(),
                        shadows: [
                          BoxShadow(
                            color: Color(0x66FF3B4A),
                            blurRadius: 22,
                            offset: Offset(0, 8),
                          ),
                        ],
                      ),
                      child: InkWell(
                        onTap: () => context.push('/create'),
                        customBorder: const CircleBorder(),
                        child: const SizedBox(
                          width: AirvanaMetrics.createButtonSize,
                          height: AirvanaMetrics.createButtonSize,
                          child: Center(
                            child: CustomPaint(
                              size: Size(24, 24),
                              painter: _WebNavIconPainter(
                                kind: _WebNavIconKind.plus,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _LegacyGlassTabCapsule extends StatelessWidget {
  const _LegacyGlassTabCapsule({
    required this.selectedIndex,
    required this.labels,
    required this.unreadCount,
    required this.onSelected,
  });

  final int selectedIndex;
  final List<String> labels;
  final int unreadCount;
  final ValueChanged<int> onSelected;

  static const _iconKinds = [
    _WebNavIconKind.home,
    _WebNavIconKind.discover,
    _WebNavIconKind.world,
    _WebNavIconKind.messages,
    _WebNavIconKind.me,
  ];

  @override
  Widget build(BuildContext context) {
    final reduceMotion = MediaQuery.disableAnimationsOf(context);
    return Container(
      key: const ValueKey('navigation-capsule'),
      height: AirvanaMetrics.navCapsuleHeight,
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: const Color(0xFFE5E5EA)),
        boxShadow: const [
          BoxShadow(
            color: Color(0x1A1C1C1E),
            blurRadius: 20,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          // Web 的 ::before 以整个胶囊（含内边距与边框）为定位基准：
          // left = 10%/30%/50%/70%/90% ± 2.4px 修正。
          final outerWidth = constraints.maxWidth + 12;
          final center =
              outerWidth * (.1 + .2 * selectedIndex) -
              6 +
              (2 - selectedIndex) * 2.4;
          final lensLeft = center - AirvanaMetrics.navLensWidth / 2;
          return Stack(
            clipBehavior: Clip.none,
            children: [
              AnimatedPositioned(
                key: const ValueKey('navigation-active-lens'),
                duration: reduceMotion
                    ? Duration.zero
                    : const Duration(milliseconds: 420),
                curve: const Cubic(.22, .9, .22, 1),
                left: lensLeft,
                top: (constraints.maxHeight - AirvanaMetrics.navLensHeight) / 2,
                width: AirvanaMetrics.navLensWidth,
                height: AirvanaMetrics.navLensHeight,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(999),
                    border: Border.all(
                      color: Colors.white.withValues(alpha: .9),
                    ),
                    gradient: const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [Color(0xF0FFFFFF), Color(0x8AFFFFFF)],
                    ),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x2423232D),
                        blurRadius: 16,
                        offset: Offset(0, 5),
                      ),
                      BoxShadow(
                        color: Color(0xE6FFFFFF),
                        blurRadius: 1,
                        offset: Offset(0, 1),
                      ),
                    ],
                  ),
                ),
              ),
              Positioned.fill(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: List.generate(_iconKinds.length, (index) {
                    final selected = selectedIndex == index;
                    final color = selected
                        ? AirvanaColors.accent
                        : const Color(0xFFA0A0A6);
                    return Semantics(
                      button: true,
                      selected: selected,
                      label: labels[index],
                      child: InkWell(
                        key: ValueKey('nav-$index'),
                        onTap: () => onSelected(index),
                        customBorder: const CircleBorder(),
                        child: SizedBox(
                          width: AirvanaMetrics.navItemSize,
                          height: AirvanaMetrics.navItemSize,
                          child: Stack(
                            clipBehavior: Clip.none,
                            alignment: Alignment.center,
                            children: [
                              CustomPaint(
                                size: const Size(
                                  AirvanaMetrics.navIconSize,
                                  AirvanaMetrics.navIconSize,
                                ),
                                painter: _WebNavIconPainter(
                                  kind: _iconKinds[index],
                                  color: color,
                                ),
                              ),
                              if (index == 3 && unreadCount > 0)
                                Positioned(
                                  key: const ValueKey('messages-unread-badge'),
                                  top: 1,
                                  right: 0,
                                  child: Container(
                                    constraints: const BoxConstraints(
                                      minWidth: 15,
                                    ),
                                    height: 15,
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 3,
                                    ),
                                    decoration: BoxDecoration(
                                      color: AirvanaColors.accent,
                                      borderRadius: BorderRadius.circular(999),
                                      border: Border.all(
                                        color: Colors.white,
                                        width: 2,
                                      ),
                                    ),
                                    alignment: Alignment.center,
                                    child: Text(
                                      '$unreadCount',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 9,
                                        fontWeight: FontWeight.w800,
                                        height: 1,
                                      ),
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

enum _WebNavIconKind { home, discover, world, messages, me, plus }

/// 逐条复刻旧版 Web bottom-nav 的描边 SVG 图标（24 网格）。
class _WebNavIconPainter extends CustomPainter {
  const _WebNavIconPainter({required this.kind, required this.color});

  final _WebNavIconKind kind;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final s = size.width / 24;
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..color = color;

    Offset p(double x, double y) => Offset(x * s, y * s);

    switch (kind) {
      case _WebNavIconKind.home:
        paint.strokeWidth = 1.9 * s;
        final roof = Path()
          ..moveTo(4 * s, 11.5 * s)
          ..lineTo(12 * s, 4 * s)
          ..lineTo(20 * s, 11.5 * s);
        final body = Path()
          ..moveTo(6 * s, 10 * s)
          ..lineTo(6 * s, 19 * s)
          ..quadraticBezierTo(6 * s, 20 * s, 7 * s, 20 * s)
          ..lineTo(10 * s, 20 * s)
          ..lineTo(10 * s, 14 * s)
          ..lineTo(14 * s, 14 * s)
          ..lineTo(14 * s, 20 * s)
          ..lineTo(17 * s, 20 * s)
          ..quadraticBezierTo(18 * s, 20 * s, 18 * s, 19 * s)
          ..lineTo(18 * s, 10 * s);
        canvas.drawPath(roof, paint);
        canvas.drawPath(body, paint);
      case _WebNavIconKind.discover:
        paint.strokeWidth = 1.9 * s;
        canvas.drawCircle(p(12, 12), 8.5 * s, paint);
        final needle = Path()
          ..moveTo(14.2 * s, 9.8 * s)
          ..lineTo(12.8 * s, 14.2 * s)
          ..lineTo(8.4 * s, 15.6 * s)
          ..lineTo(9.8 * s, 11.2 * s)
          ..close();
        canvas.drawPath(needle, paint);
      case _WebNavIconKind.world:
        paint.strokeWidth = 1.8 * s;
        canvas.drawCircle(p(12, 12), 8.5 * s, paint);
        canvas.drawOval(
          Rect.fromCenter(center: p(12, 12), width: 7.6 * s, height: 17 * s),
          paint,
        );
        canvas.drawLine(p(3.5, 12), p(20.5, 12), paint);
      case _WebNavIconKind.messages:
        paint.strokeWidth = 1.8 * s;
        final bubble = Path()
          ..moveTo(5 * s, 5.5 * s)
          ..lineTo(19 * s, 5.5 * s)
          ..lineTo(19 * s, 15.5 * s)
          ..lineTo(10 * s, 15.5 * s)
          ..lineTo(6 * s, 18.5 * s)
          ..lineTo(6 * s, 15.5 * s)
          ..lineTo(5 * s, 15.5 * s)
          ..close();
        canvas.drawPath(bubble, paint);
      case _WebNavIconKind.me:
        paint.strokeWidth = 1.8 * s;
        canvas.drawCircle(p(12, 8), 3.6 * s, paint);
        final shoulders = Path()
          ..moveTo(4.8 * s, 19.6 * s)
          ..cubicTo(6.2 * s, 16.4 * s, 8.8 * s, 14.8 * s, 12 * s, 14.8 * s)
          ..cubicTo(15.2 * s, 14.8 * s, 17.8 * s, 16.4 * s, 19.2 * s, 19.6 * s);
        canvas.drawPath(shoulders, paint);
      case _WebNavIconKind.plus:
        paint.strokeWidth = 2.2 * s;
        canvas.drawLine(p(12, 5), p(12, 19), paint);
        canvas.drawLine(p(5, 12), p(19, 12), paint);
    }
  }

  @override
  bool shouldRepaint(_WebNavIconPainter oldDelegate) =>
      oldDelegate.kind != kind || oldDelegate.color != color;
}
