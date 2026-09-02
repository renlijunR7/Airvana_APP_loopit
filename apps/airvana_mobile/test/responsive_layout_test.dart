import 'package:airvana_mobile/app/airvana_app.dart';
import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/core/config/app_environment.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/create/presentation/create_playable_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/test_create_workflow.dart';

void main() {
  for (final size in const <Size>[
    Size(360, 800),
    Size(390, 844),
    Size(430, 932),
  ]) {
    testWidgets(
      'all primary pages stay within ${size.width.toInt()}x${size.height.toInt()}',
      (tester) async {
        tester.view.physicalSize = size;
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);

        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              appEnvironmentProvider.overrideWithValue(
                AppEnvironment(
                  apiBaseUri: Uri.parse('http://192.0.2.1:8082'),
                  demoLoginEnabled: false,
                  preferLocalData: true,
                ),
              ),
            ],
            child: const AirvanaApp(),
          ),
        );
        await tester.pumpAndSettle();

        for (var index = 0; index < 5; index += 1) {
          await tester.tap(find.byKey(ValueKey('nav-$index')));
          await tester.pump();
          await tester.pump(const Duration(milliseconds: 350));
          expect(
            tester.takeException(),
            isNull,
            reason: '第 $index 个主页面在 $size 出现布局或运行异常',
          );
        }

        expect(
          find.byKey(const ValueKey('primary-navigation')),
          findsOneWidget,
        );
        expect(find.byKey(const ValueKey('creation-plus')), findsOneWidget);
      },
    );
  }

  for (final size in const <Size>[
    Size(360, 800),
    Size(390, 844),
    Size(430, 932),
  ]) {
    testWidgets(
      'Web-parity composer and templates stay within ${size.width.toInt()}x${size.height.toInt()}',
      (tester) async {
        final harness = TestCreateWorkflowHarness();
        tester.view.physicalSize = size;
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);

        await tester.pumpWidget(
          MaterialApp(
            theme: buildAirvanaTheme(),
            home: CreatePlayableScreen(workflowRepository: harness.workflow),
          ),
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        expect(
          find.byKey(const ValueKey('legacy-composer-intro')),
          findsOneWidget,
        );

        await tester.tap(
          find.byKey(const ValueKey('create-home-tab-templates')),
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        expect(
          find.byKey(const ValueKey('create-template-grid')),
          findsOneWidget,
        );

        await tester.tap(
          find.byKey(const ValueKey('create-home-tab-abilities')),
        );
        await tester.pumpAndSettle();
        await tester.drag(
          find.byKey(const ValueKey('composer-power-category-scroll')),
          const Offset(-240, 0),
        );
        await tester.pump();
        expect(tester.takeException(), isNull);
      },
    );
  }

  testWidgets(
    'composer gradient covers the status area and the whole power panel scrolls',
    (tester) async {
      final harness = TestCreateWorkflowHarness();
      tester.view.physicalSize = const Size(390, 844);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        MaterialApp(
          theme: buildAirvanaTheme(),
          home: MediaQuery(
            data: const MediaQueryData(
              size: Size(390, 844),
              padding: EdgeInsets.only(top: 28, bottom: 24),
            ),
            child: CreatePlayableScreen(workflowRepository: harness.workflow),
          ),
        ),
      );
      await tester.pumpAndSettle();

      final intro = find.byKey(const ValueKey('legacy-composer-intro'));
      final scroll = find.byKey(const ValueKey('composer-power-scroll'));
      final dock = find.byKey(const ValueKey('create-home-dock'));
      final title = find.text('能力编排', skipOffstage: false);
      expect(tester.getTopLeft(intro).dy, 0);
      expect(scroll, findsOneWidget);
      expect(dock, findsOneWidget);
      expect(tester.getBottomRight(scroll).dy, closeTo(844, .1));
      expect(
        tester.getTopLeft(dock).dy,
        lessThan(tester.getBottomRight(scroll).dy),
      );

      final titleBefore = tester.getTopLeft(title).dy;
      await tester.drag(scroll, const Offset(0, -220));
      await tester.pumpAndSettle();
      final titleAfter = tester.getTopLeft(title).dy;
      expect(titleAfter, lessThan(titleBefore - 40));
      expect(tester.takeException(), isNull);
    },
  );
}
