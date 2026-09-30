import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/discover/presentation/connected_discover_screen.dart';
import 'package:airvana_mobile/features/shared/data/legacy_demo_catalog.dart';
import 'package:airvana_mobile/features/shared/domain/airvana_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('discover rails fit exactly three cards across the viewport', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(411, 890);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          homeProvider.overrideWith(
            (_) async => HomeSnapshot(
              user: LegacyDemoCatalog.user,
              playables: LegacyDemoCatalog.legacyWebPlayables,
              localDemo: true,
            ),
          ),
        ],
        child: MaterialApp(
          theme: buildAirvanaTheme(),
          home: const Scaffold(body: ConnectedDiscoverScreen()),
        ),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    // 一行三张：卡片宽 = (视口 - 左右各 20 页边距 - 两条 10px 间隔) / 3
    const expected = (411 - AirvanaMetrics.pageGutter * 2 - 20) / 3;
    final covers = find.byKey(const ValueKey('discover-rail-cover'));
    expect(covers, findsWidgets);
    expect(tester.getSize(covers.first).width, closeTo(expected, 0.5));

    // 三张卡加两条间隔必须落在视口内，否则第三张会被裁切。
    expect(expected * 3 + 20, lessThanOrEqualTo(411 - 40 + 0.5));
  });

  testWidgets('connected discover carries the Web tabs and full catalogue', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(430, 932);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          homeProvider.overrideWith(
            (_) async => HomeSnapshot(
              user: LegacyDemoCatalog.user,
              playables: LegacyDemoCatalog.legacyWebPlayables,
              localDemo: true,
            ),
          ),
        ],
        child: MaterialApp(
          theme: buildAirvanaTheme(),
          home: const Scaffold(body: ConnectedDiscoverScreen()),
        ),
      ),
    );
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 100));

    // Web 的四个发现 tab
    for (final label in ['推荐', '关注', '热门', '最新']) {
      expect(find.text(label), findsOneWidget);
    }
    // 目录规模与首页一致，并标注本地离线口径
    expect(
      find.textContaining(
        '${LegacyDemoCatalog.legacyWebPlayables.length} 款原创离线游戏',
      ),
      findsOneWidget,
    );
    expect(find.text('#原创新游'), findsOneWidget);
  });
}
