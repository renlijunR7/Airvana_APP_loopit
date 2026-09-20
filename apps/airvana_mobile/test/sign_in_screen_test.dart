import 'package:airvana_mobile/app/app_router.dart';
import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/test_create_workflow.dart';

/// 退出登录后的全屏登录页。
void main() {
  Future<TestCreateWorkflowHarness> pumpSignIn(WidgetTester tester) async {
    final harness = TestCreateWorkflowHarness();
    tester.view.physicalSize = const Size(430, 932);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          airvanaRepositoryProvider.overrideWithValue(harness.repository),
        ],
        child: MaterialApp.router(
          theme: buildAirvanaTheme(),
          routerConfig: buildAirvanaRouter(initialLocation: '/signin'),
        ),
      ),
    );
    await tester.pumpAndSettle();
    return harness;
  }

  testWidgets('the sign-in screen shows brand, form and legal entries', (
    tester,
  ) async {
    await pumpSignIn(tester);

    expect(find.byKey(const ValueKey('sign-in-screen')), findsOneWidget);
    expect(find.byKey(const ValueKey('sign-in-parity')), findsOneWidget);
    expect(find.textContaining('登录，开始运营'), findsOneWidget);
    expect(find.byKey(const ValueKey('sign-in-email-input')), findsOneWidget);
    expect(find.text('服务协议'), findsOneWidget);
    expect(find.text('隐私政策'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.byKey(const ValueKey('sign-in-wallet')),
      240,
      scrollable: find.byType(Scrollable).first,
    );
    expect(
      find.textContaining('不会索取助记词或私钥'),
      findsOneWidget,
      reason: '钱包安全声明必须可见，且只出现一次',
    );
  });

  testWidgets('it sits outside the shell so no bottom navigation shows', (
    tester,
  ) async {
    await pumpSignIn(tester);
    // 未登录时不应看到主导航，否则用户会以为自己还在已登录的主界面里
    expect(find.text('创作'), findsNothing);
    expect(find.byType(NavigationBar), findsNothing);
  });

  testWidgets('local demo content stays reachable through the skip action', (
    tester,
  ) async {
    await pumpSignIn(tester);
    final skip = find.byKey(const ValueKey('sign-in-skip'));
    expect(skip, findsOneWidget, reason: '本地演示内容不需要登录，不能把用户困在登录页');
    await tester.tap(skip);
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('sign-in-screen')), findsNothing);
  });

  testWidgets('the three methods are labelled by how real they actually are', (
    tester,
  ) async {
    await pumpSignIn(tester);
    expect(find.text('邮箱验证码登录'), findsOneWidget);
    expect(
      find.textContaining('本地适配器'),
      findsWidgets,
      reason: 'Google 不是真实 OAuth，必须标明',
    );
    await tester.scrollUntilVisible(
      find.byKey(const ValueKey('sign-in-wallet')),
      240,
      scrollable: find.byType(Scrollable).first,
    );
    expect(
      find.text('待接入签名器'),
      findsOneWidget,
      reason: '钱包登录没有签名器，不得提供入口也不得假装可用',
    );
  });

  testWidgets('the verify button stays disabled until a code is entered', (
    tester,
  ) async {
    await pumpSignIn(tester);
    await tester.enterText(
      find.byKey(const ValueKey('sign-in-email-input')),
      'kai@airvana.test',
    );
    await tester.pumpAndSettle();
    expect(
      tester
          .widget<OutlinedButton>(
            find.byKey(const ValueKey('sign-in-email-request')),
          )
          .onPressed,
      isNotNull,
      reason: '邮箱合法后才可请求验证码',
    );
    expect(
      find.byKey(const ValueKey('sign-in-email-verify')),
      findsNothing,
      reason: '还没请求验证码时不应出现登录按钮',
    );
  });
}
