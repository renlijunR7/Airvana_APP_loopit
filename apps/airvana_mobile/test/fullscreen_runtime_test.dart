import 'package:airvana_mobile/app/app_router.dart';
import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/test_create_workflow.dart';

void main() {
  testWidgets('全屏路由只有游戏画面：没有顶栏、没有介绍页', (tester) async {
    tester.view.physicalSize = const Size(430, 932);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          airvanaRepositoryProvider.overrideWithValue(
            TestCreateWorkflowHarness().repository,
          ),
        ],
        child: MaterialApp.router(
          theme: buildAirvanaTheme(),
          routerConfig: buildAirvanaRouter(
            initialLocation: '/runtime/plb_kol_town?fullscreen=1',
          ),
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 600));

    expect(find.byKey(const ValueKey('runtime-fullscreen')), findsOneWidget);
    expect(
      find.byKey(const ValueKey('runtime-fullscreen-exit')),
      findsOneWidget,
    );
    // 全屏下不该再出现普通运行页的顶栏与介绍页按钮。
    expect(find.text('开始完整试玩'), findsNothing);
  });

  testWidgets('普通路由仍然保留顶栏与介绍页', (tester) async {
    tester.view.physicalSize = const Size(430, 932);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          airvanaRepositoryProvider.overrideWithValue(
            TestCreateWorkflowHarness().repository,
          ),
        ],
        child: MaterialApp.router(
          theme: buildAirvanaTheme(),
          routerConfig: buildAirvanaRouter(
            initialLocation: '/runtime/plb_kol_town',
          ),
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 600));

    expect(find.byKey(const ValueKey('runtime-fullscreen')), findsNothing);
  });
}
