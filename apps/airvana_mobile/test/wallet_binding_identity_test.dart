import 'package:airvana_mobile/app/app_router.dart';
import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_models.dart';
import 'package:airvana_mobile/features/shared/domain/airvana_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/test_create_workflow.dart';

Widget _app(TestCreateWorkflowHarness harness, String location) =>
    ProviderScope(
      overrides: [
        airvanaRepositoryProvider.overrideWithValue(harness.repository),
        homeProvider.overrideWith(
          (_) async => const HomeSnapshot(
            user: AppUser(id: 'user-1', displayName: 'Kai Chen'),
            playables: [],
          ),
        ),
      ],
      child: MaterialApp.router(
        theme: buildAirvanaTheme(),
        routerConfig: buildAirvanaRouter(initialLocation: location),
      ),
    );

void main() {
  testWidgets('wallet binding walks none → pending → verified and can unbind', (
    tester,
  ) async {
    final harness = TestCreateWorkflowHarness();
    tester.view.physicalSize = const Size(430, 932);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(_app(harness, '/profile/secondary/wallet'));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('wallet-tab-ait')));
    await tester.pumpAndSettle();

    // none：绑定按钮 + 安全提示
    expect(find.byKey(const ValueKey('wallet-bind')), findsOneWidget);
    expect(find.textContaining('不会索取助记词或私钥'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('wallet-bind')));
    await tester.pumpAndSettle();

    // pending：候选地址 + 继续验证 / 移除
    expect(find.text('待验证'), findsOneWidget);
    expect(
      find.byKey(const ValueKey('wallet-binding-address')),
      findsOneWidget,
    );
    await tester.tap(find.byKey(const ValueKey('wallet-binding-verify')));
    await tester.pumpAndSettle();

    // verified：状态 pill + 解除绑定；状态已持久化
    expect(find.text('已验证 · 演示'), findsOneWidget);
    expect((await harness.repository.loadWalletBinding()).status, 'verified');
    await tester.tap(find.byKey(const ValueKey('wallet-binding-unbind')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('wallet-bind')), findsOneWidget);
    expect((await harness.repository.loadWalletBinding()).status, 'none');
  });

  testWidgets('creator center gate blocks until demo activation completes', (
    tester,
  ) async {
    final harness = TestCreateWorkflowHarness();
    tester.view.physicalSize = const Size(430, 932);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    // 预置：身份未开通
    await harness.repository.saveIdentityState(
      const LocalIdentityState(
        creatorStatus: 'not_activated',
        kycStatus: 'unverified',
      ),
    );

    await tester.pumpWidget(_app(harness, '/profile/secondary/creatorCenter'));
    await tester.pumpAndSettle();

    expect(find.byKey(const ValueKey('creator-center-gate')), findsOneWidget);
    expect(find.text('请先完成创作者身份开通'), findsOneWidget);
    expect(find.byKey(const ValueKey('creator-center-scroll')), findsNothing);

    await tester.tap(find.byKey(const ValueKey('creator-gate-activate')));
    await tester.pumpAndSettle();

    expect(find.byKey(const ValueKey('creator-center-scroll')), findsOneWidget);
    expect(
      (await harness.repository.loadIdentityState()).creatorEntitled,
      isTrue,
    );
  });

  testWidgets('KOL twin route opens the local workbench without server controls', (tester) async {
    final harness = TestCreateWorkflowHarness();
    tester.view.physicalSize = const Size(430, 932);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(_app(harness, '/profile/secondary/aiTwin'));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('twin-demo-banner')), findsOneWidget);
    expect(find.byKey(const ValueKey('twin-preview')), findsOneWidget);
    expect(find.byKey(const ValueKey('ai-twin-server-save')), findsNothing);
    await tester.tap(find.byKey(const ValueKey('twin-tab-3')));
    await tester.pumpAndSettle();
    expect(find.textContaining('尚未保存分身'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
