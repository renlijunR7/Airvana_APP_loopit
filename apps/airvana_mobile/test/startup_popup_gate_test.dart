import 'package:airvana_mobile/app/airvana_app.dart';
import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/features/account/presentation/launch_splash_screen.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'support/test_create_workflow.dart';

/// 启动弹窗的门禁。
///
/// Web：`if (this.state.ob >= 4) this.queueStartupPopups()`——只在进入主应用
/// 之后排队。此前 Flutter 冷启动 720ms 就弹，第一次打开 App 时推送演示会盖在
/// 引导页或登录页上。这里钉住三件事：引导页 / 登录页上不弹；进首页后才弹、
/// 且只弹一次；设置里的开关和环境能把它关掉。
///
/// flutter_test 缺省平台是 Android；iOS 单独补一条，钉住「两个真机平台都弹」。
Widget _app(TestCreateWorkflowHarness harness, {String? at}) => ProviderScope(
  overrides: [airvanaRepositoryProvider.overrideWithValue(harness.repository)],
  child: at == null ? const AirvanaApp() : AirvanaApp(initialLocation: at),
);

const _popup = ValueKey('in-app-push-demo');

/// 720ms 的排队延迟 + 200ms 的淡入。
Future<void> _waitForPopupWindow(WidgetTester tester) async {
  await tester.pump(const Duration(milliseconds: 800));
  await tester.pump(const Duration(milliseconds: 250));
}

void main() {
  testWidgets('冷启动：启动页、引导页、登录页上都不弹；点「先逛逛」进首页后才弹', (tester) async {
    final harness = TestCreateWorkflowHarness();
    await tester.pumpWidget(_app(harness));
    await tester.pump();
    expect(find.byKey(const ValueKey('launch-splash')), findsOneWidget);
    await tester.pump(const Duration(seconds: 1));
    expect(find.byKey(_popup), findsNothing, reason: '启动页上不该有启动弹窗');
    await tester.pump(kLaunchSplashFirstFrameCap + kLaunchSplashMinimum);
    await tester.pumpAndSettle();

    expect(find.byKey(const ValueKey('onboarding-pager')), findsOneWidget);
    await tester.pump(const Duration(seconds: 2));
    expect(find.byKey(_popup), findsNothing, reason: '引导页上不该有启动弹窗');

    await tester.tap(find.byKey(const ValueKey('onboarding-skip')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('sign-in-screen')), findsOneWidget);
    await tester.pump(const Duration(seconds: 2));
    expect(find.byKey(_popup), findsNothing, reason: '登录页上不该有启动弹窗');

    await tester.tap(find.byKey(const ValueKey('sign-in-skip')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('primary-navigation')), findsOneWidget);
    expect(find.byKey(_popup), findsNothing, reason: '刚进首页那一帧还没到 720ms');

    await _waitForPopupWindow(tester);
    expect(find.byKey(_popup), findsOneWidget, reason: '进入主应用后才排队弹出');
  });

  testWidgets('进首页 720ms 后弹一次；关掉后同一次冷启动不再弹', (tester) async {
    final harness = TestCreateWorkflowHarness();
    await tester.pumpWidget(_app(harness, at: '/'));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('primary-navigation')), findsOneWidget);

    await _waitForPopupWindow(tester);
    expect(find.byKey(_popup), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('in-app-push-dismiss')));
    await tester.pumpAndSettle();
    expect(find.byKey(_popup), findsNothing);

    // 在主应用里换个标签页，不该把启动弹窗再排一次。
    // 底部导航是纯图标胶囊，没有可 find 的文字，直接走路由。
    GoRouter.of(
      tester.element(find.byKey(const ValueKey('primary-navigation'))),
    ).go('/discover');
    await tester.pumpAndSettle();
    await tester.pump(const Duration(seconds: 3));
    expect(find.byKey(_popup), findsNothing, reason: '一次冷启动只排一次队');
  });

  testWidgets('设置里关掉「消息提醒弹窗」，进首页也不弹', (tester) async {
    final harness = TestCreateWorkflowHarness();
    final state = await harness.repository.loadLocalProfileFeatureState();
    await harness.repository.saveLocalProfileFeatureState(
      state.copyWith(popupStates: {...state.popupStates, 'message': false}),
    );

    await tester.pumpWidget(_app(harness, at: '/'));
    await tester.pumpAndSettle();
    await _waitForPopupWindow(tester);
    await tester.pump(const Duration(seconds: 2));
    expect(find.byKey(_popup), findsNothing);
  });

  testWidgets('生产环境统一停用启动弹窗', (tester) async {
    final harness = TestCreateWorkflowHarness();
    final state = await harness.repository.loadLocalProfileFeatureState();
    await harness.repository.saveLocalProfileFeatureState(
      state.copyWith(frontendEnvironment: 'production'),
    );

    await tester.pumpWidget(_app(harness, at: '/'));
    await tester.pumpAndSettle();
    await _waitForPopupWindow(tester);
    await tester.pump(const Duration(seconds: 2));
    expect(find.byKey(_popup), findsNothing);
  });

  testWidgets('iOS 上同样进首页后才弹', (tester) async {
    debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
    try {
      final harness = TestCreateWorkflowHarness();
      await tester.pumpWidget(_app(harness));
      await tester.pump(
        kLaunchSplashFirstFrameCap +
            kLaunchSplashMinimum +
            const Duration(milliseconds: 50),
      );
      await tester.pumpAndSettle();
      await tester.pump(const Duration(seconds: 2));
      expect(find.byKey(_popup), findsNothing, reason: '引导页上不该有启动弹窗');

      await tester.tap(find.byKey(const ValueKey('onboarding-skip')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('sign-in-skip')));
      await tester.pumpAndSettle();
      await _waitForPopupWindow(tester);
      expect(find.byKey(_popup), findsOneWidget);
    } finally {
      // 必须在测试体内还原：flutter_test 在 tearDown 之前就校验 foundation 调试变量。
      debugDefaultTargetPlatformOverride = null;
    }
  });
}
