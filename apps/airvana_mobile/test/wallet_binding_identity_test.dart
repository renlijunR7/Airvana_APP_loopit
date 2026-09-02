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
  testWidgets(
    'wallet binding walks none → pending → verified and can unbind',
    (tester) async {
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
      expect(
        (await harness.repository.loadWalletBinding()).status,
        'verified',
      );
      await tester.tap(find.byKey(const ValueKey('wallet-binding-unbind')));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('wallet-bind')), findsOneWidget);
      expect((await harness.repository.loadWalletBinding()).status, 'none');
    },
  );

  testWidgets(
    'creator center gate blocks until demo activation completes',
    (tester) async {
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

      await tester.pumpWidget(
        _app(harness, '/profile/secondary/creatorCenter'),
      );
      await tester.pumpAndSettle();

      expect(find.byKey(const ValueKey('creator-center-gate')), findsOneWidget);
      expect(find.text('请先完成创作者身份开通'), findsOneWidget);
      expect(find.byKey(const ValueKey('creator-center-scroll')), findsNothing);

      await tester.tap(find.byKey(const ValueKey('creator-gate-activate')));
      await tester.pumpAndSettle();

      expect(
        find.byKey(const ValueKey('creator-center-scroll')),
        findsOneWidget,
      );
      expect(
        (await harness.repository.loadIdentityState()).creatorEntitled,
        isTrue,
      );
    },
  );

  testWidgets(
    'ai twin scenes languages stage and versions mirror the Web behaviors',
    (tester) async {
      final harness = TestCreateWorkflowHarness();
      tester.view.physicalSize = const Size(430, 932);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(_app(harness, '/profile/secondary/aiTwin'));
      await tester.pumpAndSettle();

      // 场景切换：整组替换人格并写审计 + 版本
      await tester.tap(find.byKey(const ValueKey('ai-twin-tab-scenes')));
      await tester.pumpAndSettle();
      expect(find.text('当前场景'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('ai-twin-scene-brand')));
      await tester.pumpAndSettle();
      final afterScene = await harness.repository.loadAiTwinState();
      expect(afterScene.sceneId, 'brand');
      expect(afterScene.name, 'Kai · 品牌讲解人');
      expect(afterScene.versions.first.label, '切换场景 · 品牌讲解');
      expect(afterScene.audit.first.title, '切换场景 · 品牌讲解');

      // 语言切换
      await tester.tap(find.byKey(const ValueKey('ai-twin-tab-languages')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('ai-twin-language-en')));
      await tester.pumpAndSettle();
      expect((await harness.repository.loadAiTwinState()).language, 'en');

      // 舞台：语音状态流 + 静音 + 降级
      await tester.tap(find.byKey(const ValueKey('ai-twin-tab-stage')));
      await tester.pumpAndSettle();
      expect(find.text('待机'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('ai-twin-voice-toggle')));
      await tester.pump(const Duration(milliseconds: 1000));
      expect(find.text('思考中…'), findsOneWidget);
      await tester.pump(const Duration(milliseconds: 1200));
      expect(find.text('讲解中'), findsOneWidget);
      expect(find.textContaining('AI twin'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('ai-twin-voice-toggle')));
      await tester.pump();
      expect(find.text('待机'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('ai-twin-fallback-toggle')));
      await tester.pump();
      expect(find.textContaining('已降级为静态身份卡'), findsOneWidget);

      // 版本记录（Tab 条横滑后再点）
      await tester.drag(
        find.byKey(const ValueKey('ai-twin-tab-scroll')),
        const Offset(-260, 0),
      );
      await tester.pump();
      await tester.tap(find.byKey(const ValueKey('ai-twin-tab-versions')));
      await tester.pumpAndSettle();
      expect(find.text('版本记录（1）'), findsOneWidget);
      expect(find.text('切换场景 · 品牌讲解'), findsOneWidget);
    },
  );
}
