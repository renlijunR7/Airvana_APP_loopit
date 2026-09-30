import 'package:airvana_mobile/app/airvana_app.dart';
import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/features/account/presentation/launch_splash_screen.dart';
import 'package:airvana_mobile/shared/presentation/airvana_logo.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/test_create_workflow.dart';

/// 冷启动流程：启动页 → 三页引导 → 登录 → 主应用。
///
/// 与 Web 一致，引导页**每次**冷启动都出现（Web 的 `s.ob` 每次加载从 0 开始，
/// 恢复本地状态时也不碰它）。这里刻意用 `AirvanaApp()` 的缺省落点，
/// 其余 widget 测试都传 `initialLocation: '/'` 直奔主应用——
/// 所以只有这一组能发现「引导页不出现」或「引导页直接跳过登录」这类反向故障。
Widget _app(TestCreateWorkflowHarness harness, {String? at}) => ProviderScope(
  overrides: [airvanaRepositoryProvider.overrideWithValue(harness.repository)],
  child: at == null ? const AirvanaApp() : AirvanaApp(initialLocation: at),
);

/// 冷启动先落启动页，停 [kLaunchSplashMinimum] 后自己走到引导页。
Future<void> _coldStart(
  WidgetTester tester,
  TestCreateWorkflowHarness harness,
) async {
  await tester.pumpWidget(_app(harness));
  await tester.pump();
  expect(find.byKey(const ValueKey('launch-splash')), findsOneWidget);
  expect(find.byType(AirvanaLogo), findsOneWidget);
  await tester.pump(
    kLaunchSplashFirstFrameCap +
        kLaunchSplashMinimum +
        const Duration(milliseconds: 50),
  );
  await tester.pumpAndSettle();
  expect(find.byKey(const ValueKey('launch-splash')), findsNothing);
}

void main() {
  testWidgets('冷启动：启动页停够时长后落在引导页，而不是信息流', (tester) async {
    final harness = TestCreateWorkflowHarness();
    await _coldStart(tester, harness);

    expect(find.byKey(const ValueKey('onboarding-pager')), findsOneWidget);
    expect(find.text('Every KOL Owns'), findsOneWidget);
    final illustration = find.byKey(
      const ValueKey(
        'onboarding-image-assets/legacy/onboarding/kol-playables.png',
      ),
    );
    expect(illustration, findsOneWidget);
    expect(tester.getSize(illustration), const Size(180, 180));
    expect(find.byType(AirvanaLogo), findsNothing);
    expect(
      find.text('让每一位 KOL 都能创建并运营属于自己的 Agentic Playable 智能营销体。'),
      findsNothing,
    );
    expect(find.text('继续'), findsOneWidget);
    expect(find.text('跳过'), findsOneWidget);
    expect(find.byKey(const ValueKey('primary-navigation')), findsNothing);
  });

  testWidgets('再一次冷启动仍然是引导页——没有「看过就不再出现」', (tester) async {
    // 同一份本地存储、两次冷启动，第二次也得从引导页起步。
    final harness = TestCreateWorkflowHarness();
    await _coldStart(tester, harness);
    await tester.tap(find.byKey(const ValueKey('onboarding-skip')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('sign-in-screen')), findsOneWidget);

    await tester.pumpWidget(const SizedBox.shrink());
    await _coldStart(tester, harness);
    expect(find.byKey(const ValueKey('onboarding-pager')), findsOneWidget);
  });

  testWidgets('「跳过」落到登录页，不是直接进主应用', (tester) async {
    final harness = TestCreateWorkflowHarness();
    await _coldStart(tester, harness);
    await tester.tap(find.byKey(const ValueKey('onboarding-skip')));
    await tester.pumpAndSettle();

    expect(find.byKey(const ValueKey('onboarding-pager')), findsNothing);
    expect(find.byKey(const ValueKey('sign-in-screen')), findsOneWidget);
    expect(find.byKey(const ValueKey('primary-navigation')), findsNothing);
  });

  testWidgets('三页都能翻到，末页按钮变「开始」，点了进登录页', (tester) async {
    final harness = TestCreateWorkflowHarness();
    await _coldStart(tester, harness);

    expect(find.text('继续'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('onboarding-next')));
    await tester.pumpAndSettle();
    expect(find.text('Create, Interact,'), findsOneWidget);
    expect(find.text('Attribute Results'), findsOneWidget);
    expect(
      find.text('从内容生成到互动转化，以 KOL 专属链接、版本和获批事件构建可审核的归因链路。'),
      findsNothing,
    );
    expect(
      find.byKey(
        const ValueKey(
          'onboarding-image-assets/legacy/onboarding/attribute-results.png',
        ),
      ),
      findsOneWidget,
    );
    expect(find.text('继续'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('onboarding-next')));
    await tester.pumpAndSettle();
    expect(find.text('Operate, Settle,'), findsOneWidget);
    expect(find.text('Compound Value'), findsOneWidget);
    expect(
      find.text('持续优化、交付与结算，并把 Playable、运营规则、受众洞察和归因记录沉淀为长期资产。'),
      findsNothing,
    );
    expect(
      find.byKey(
        const ValueKey(
          'onboarding-image-assets/legacy/onboarding/compound-value.png',
        ),
      ),
      findsOneWidget,
    );
    expect(find.text('开始'), findsOneWidget);
    expect(find.text('继续'), findsNothing);

    await tester.tap(find.byKey(const ValueKey('onboarding-next')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('sign-in-screen')), findsOneWidget);
  });

  testWidgets('点圆点可直达某一页', (tester) async {
    final harness = TestCreateWorkflowHarness();
    await _coldStart(tester, harness);

    await tester.tap(find.byKey(const ValueKey('onboarding-dot-2')));
    await tester.pumpAndSettle();
    expect(find.text('Operate, Settle,'), findsOneWidget);
    expect(find.text('开始'), findsOneWidget);
  });

  testWidgets('小屏与放大字号下插图可滚动，继续和跳过仍可用', (tester) async {
    tester.view.physicalSize = const Size(320, 568);
    tester.view.devicePixelRatio = 1;
    tester.platformDispatcher.textScaleFactorTestValue = 1.5;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    final harness = TestCreateWorkflowHarness();
    await _coldStart(tester, harness);

    expect(tester.takeException(), isNull);
    expect(
      find.byKey(const ValueKey('onboarding-next')).hitTestable(),
      findsOneWidget,
    );
    await tester.tap(find.byKey(const ValueKey('onboarding-next')));
    await tester.pumpAndSettle();
    expect(find.text('Create, Interact,'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.tap(find.byKey(const ValueKey('onboarding-skip')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('sign-in-screen')), findsOneWidget);
  });

  testWidgets('末页连点「开始」只跳一次，登录页不会被压两层', (tester) async {
    final harness = TestCreateWorkflowHarness();
    await _coldStart(tester, harness);
    await tester.tap(find.byKey(const ValueKey('onboarding-dot-2')));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('onboarding-next')));
    await tester.tap(find.byKey(const ValueKey('onboarding-next')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('sign-in-screen')), findsOneWidget);
  });

  testWidgets('测试入口：initialLocation 给 `/` 直接进主应用', (tester) async {
    final harness = TestCreateWorkflowHarness();
    await tester.pumpWidget(_app(harness, at: '/'));
    await tester.pumpAndSettle();

    expect(find.byKey(const ValueKey('onboarding-pager')), findsNothing);
    expect(find.byKey(const ValueKey('primary-navigation')), findsOneWidget);
  });
}
