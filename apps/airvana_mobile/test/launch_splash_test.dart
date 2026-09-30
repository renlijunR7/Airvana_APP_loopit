import 'package:airvana_mobile/app/airvana_app.dart';
import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/features/account/presentation/launch_splash_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/test_create_workflow.dart';

/// 启动页：冷启动第一屏，文案与 Web `.launch-splash` 一致，停 1040ms 后进引导页。
void main() {
  Widget app(TestCreateWorkflowHarness harness) => ProviderScope(
    overrides: [
      airvanaRepositoryProvider.overrideWithValue(harness.repository),
    ],
    child: const AirvanaApp(),
  );

  testWidgets('品牌区与三段文案都在，且与 Web 逐字一致', (tester) async {
    await tester.pumpWidget(app(TestCreateWorkflowHarness()));
    await tester.pump();

    expect(find.byKey(const ValueKey('launch-splash')), findsOneWidget);
    expect(find.byKey(const ValueKey('airvana-logo-frame')), findsOneWidget);
    expect(find.text('AGENTIC PLAYABLE NETWORK'), findsOneWidget);
    expect(find.text('让每一位 KOL'), findsOneWidget);
    expect(find.text('创作并运营自己的\nAgentic Playable'), findsOneWidget);
    expect(find.text('正在恢复账号、版本与本地工作状态…'), findsOneWidget);
    // 启动页没有任何可点的东西，也不该露出主导航。
    expect(find.byKey(const ValueKey('primary-navigation')), findsNothing);

    // 收尾：把动画和计时器走完，免得测试框架报「还有 Timer 未完成」。
    await tester.pump(
      kLaunchSplashFirstFrameCap +
          kLaunchSplashMinimum +
          const Duration(milliseconds: 50),
    );
    await tester.pumpAndSettle();
  });

  testWidgets('首帧上屏后不到 1040ms 不走；到点自动进引导页', (tester) async {
    await tester.pumpWidget(app(TestCreateWorkflowHarness()));
    await tester.pump();

    // 测试里没有光栅化：先等满首帧上限，再从那一刻数 1040ms。
    await tester.pump(kLaunchSplashFirstFrameCap);
    await tester.pump(const Duration(milliseconds: 900));
    expect(
      find.byKey(const ValueKey('launch-splash')),
      findsOneWidget,
      reason: 'Web 固定停 1040ms（_launchT3），不能因为本地数据快就闪一下',
    );

    await tester.pump(const Duration(milliseconds: 200));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('launch-splash')), findsNothing);
    expect(find.byKey(const ValueKey('onboarding-pager')), findsOneWidget);
  });
}
