import 'dart:async';
import 'dart:ui' show PointerDeviceKind;

import 'package:airvana_mobile/app/app_router.dart';
import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/shared/presentation/in_app_push_demo.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

/// Web/桌面预览下允许鼠标拖拽滚动，令能力编排等列表和触屏一致可上下滑动。
class _DragEverywhereScrollBehavior extends MaterialScrollBehavior {
  const _DragEverywhereScrollBehavior();

  @override
  Set<PointerDeviceKind> get dragDevices => const {
    PointerDeviceKind.touch,
    PointerDeviceKind.mouse,
    PointerDeviceKind.stylus,
    PointerDeviceKind.trackpad,
  };
}

class AirvanaApp extends ConsumerStatefulWidget {
  const AirvanaApp({super.key});

  @override
  ConsumerState<AirvanaApp> createState() => _AirvanaAppState();
}

class _AirvanaAppState extends ConsumerState<AirvanaApp> {
  late final GoRouter _router = buildAirvanaRouter();
  Timer? _pushDemoTimer;
  bool _showPushDemo = false;

  @override
  void initState() {
    super.initState();
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.iOS) {
      _pushDemoTimer = Timer(const Duration(milliseconds: 720), () {
        if (mounted) setState(() => _showPushDemo = true);
      });
    }
  }

  @override
  void dispose() {
    _pushDemoTimer?.cancel();
    _router.dispose();
    super.dispose();
  }

  Widget _withPushDemo(Widget child, {required bool pushEnabled}) => Stack(
    fit: StackFit.expand,
    children: [
      child,
      if (pushEnabled && _showPushDemo)
        InAppPushDemo(
          onDismiss: () => setState(() => _showPushDemo = false),
          onOpenMessages: () {
            setState(() => _showPushDemo = false);
            _router.go('/messages');
          },
        ),
    ],
  );

  @override
  Widget build(BuildContext context) {
    final pushEnabled =
        ref.watch(profileFeatureStateProvider).value?.pushEnabled ?? true;
    return MaterialApp.router(
      title: 'Airvana',
      debugShowCheckedModeBanner: false,
      scrollBehavior: const _DragEverywhereScrollBehavior(),
      theme: buildAirvanaTheme(),
      routerConfig: _router,
      builder: (context, child) {
        final source = MediaQuery.of(context);
        final accessibleSource = source.copyWith(
          textScaler: source.textScaler.clamp(
            minScaleFactor: 0.95,
            maxScaleFactor: 1.15,
          ),
        );
        final appChild = child ?? const SizedBox.shrink();

        Widget deviceContent(MediaQueryData data, Widget content) {
          final chromeData = kIsWeb
              ? data.copyWith(
                  padding: EdgeInsets.fromLTRB(
                    data.padding.left,
                    data.padding.top < 36 ? 36 : data.padding.top,
                    data.padding.right,
                    data.padding.bottom < 34 ? 34 : data.padding.bottom,
                  ),
                )
              : data;
          return MediaQuery(
            data: chromeData,
            child: kIsWeb ? _LegacyWebDeviceChrome(child: content) : content,
          );
        }

        // A real phone always receives its actual logical viewport. Do not
        // report a capped 430 x 932 MediaQuery inside taller phones: doing so
        // makes Scaffolds and safe areas disagree with their render bounds.
        if (source.size.width <= AirvanaMetrics.referenceWidth) {
          return _withPushDemo(
            deviceContent(accessibleSource, appChild),
            pushEnabled: pushEnabled,
          );
        }

        final viewportHeight = source.size.height
            .clamp(0, AirvanaMetrics.referenceHeight)
            .toDouble();
        final content = deviceContent(
          accessibleSource.copyWith(
            size: Size(AirvanaMetrics.referenceWidth, viewportHeight),
          ),
          appChild,
        );

        // The legacy Web demo is a fixed 430 x 932 device canvas on desktop.
        // Keep that canvas as the visual contract while real phones continue
        // to use their native available width and height.
        return _withPushDemo(
          ColoredBox(
            color: const Color(0xFFE8E8ED),
            child: Center(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(28),
                  border: Border.all(color: const Color(0xFFD1D1D6)),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x24000000),
                      blurRadius: 80,
                      offset: Offset(0, 30),
                    ),
                  ],
                ),
                child: ClipRRect(
                  key: const ValueKey('legacy-device-canvas'),
                  borderRadius: BorderRadius.circular(28),
                  child: SizedBox(
                    width: AirvanaMetrics.referenceWidth,
                    height: viewportHeight,
                    child: content,
                  ),
                ),
              ),
            ),
          ),
          pushEnabled: pushEnabled,
        );
      },
    );
  }
}

class _LegacyWebDeviceChrome extends StatelessWidget {
  const _LegacyWebDeviceChrome({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        child,
        Positioned(
          left: 0,
          right: 0,
          top: 0,
          child: IgnorePointer(child: _LegacyStatusBar()),
        ),
        Positioned(
          left: 0,
          right: 0,
          bottom: 8,
          child: IgnorePointer(
            child: Center(
              child: DecoratedBox(
                key: const ValueKey('legacy-home-indicator'),
                decoration: BoxDecoration(
                  // The white fill matches the dark feed/runtime surfaces.
                  // A quiet dark outline keeps the simulated indicator visible
                  // on the legacy light pages without reading router state from
                  // MaterialApp.builder (which can run before router startup).
                  color: Colors.white,
                  border: Border.all(color: const Color(0x52050505), width: .8),
                  boxShadow: const [
                    BoxShadow(color: Color(0x29050505), blurRadius: 2),
                  ],
                  borderRadius: const BorderRadius.all(Radius.circular(99)),
                ),
                child: const SizedBox(width: 134, height: 5),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _LegacyStatusBar extends StatefulWidget {
  const _LegacyStatusBar();

  @override
  State<_LegacyStatusBar> createState() => _LegacyStatusBarState();
}

class _LegacyStatusBarState extends State<_LegacyStatusBar> {
  Timer? _clock;

  @override
  void initState() {
    super.initState();
    _clock = Timer.periodic(const Duration(minutes: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _clock?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final time =
        '${now.hour.toString().padLeft(2, '0')}:'
        '${now.minute.toString().padLeft(2, '0')}';
    return Semantics(
      image: true,
      label: '模拟设备状态：蜂窝网络、Wi-Fi、电量 74%',
      child: SizedBox(
        height: 36,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 18, 4),
          child: Row(
            children: [
              ExcludeSemantics(
                child: Text(
                  time,
                  style: const TextStyle(
                    color: Color(0xFF111111),
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -.2,
                  ),
                ),
              ),
              const Spacer(),
              const ExcludeSemantics(
                child: Icon(
                  Icons.signal_cellular_alt_rounded,
                  size: 17,
                  color: Color(0xFF111111),
                ),
              ),
              const SizedBox(width: 4),
              const ExcludeSemantics(
                child: Icon(
                  Icons.wifi_rounded,
                  size: 17,
                  color: Color(0xFF111111),
                ),
              ),
              const SizedBox(width: 5),
              const ExcludeSemantics(child: _LegacyBattery()),
            ],
          ),
        ),
      ),
    );
  }
}

class _LegacyBattery extends StatelessWidget {
  const _LegacyBattery();

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 25,
    height: 13,
    child: Stack(
      children: [
        Positioned(
          left: 0,
          top: 1,
          child: Container(
            width: 22,
            height: 11,
            padding: const EdgeInsets.all(1.5),
            decoration: BoxDecoration(
              border: Border.all(color: const Color(0xFF111111), width: 1.2),
              borderRadius: BorderRadius.circular(3),
            ),
            child: const Align(
              alignment: Alignment.centerLeft,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: Color(0xFF111111),
                  borderRadius: BorderRadius.all(Radius.circular(1.4)),
                ),
                child: SizedBox(width: 14, height: 6),
              ),
            ),
          ),
        ),
        const Positioned(
          right: 0,
          top: 5,
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: Color(0xFF111111),
              borderRadius: BorderRadius.horizontal(right: Radius.circular(1)),
            ),
            child: SizedBox(width: 2, height: 4),
          ),
        ),
      ],
    ),
  );
}
