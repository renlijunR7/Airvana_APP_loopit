import 'dart:ui' show SemanticsAction;

import 'package:airvana_mobile/app/app_router.dart';
import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/history/presentation/experience_history_screen.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_models.dart';
import 'package:airvana_mobile/features/shared/domain/airvana_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/test_create_workflow.dart';

/// 「我的」页昵称旁的 VIP 标是订阅入口；原来的 Free 订阅卡已去掉。
void main() {
  Future<TestCreateWorkflowHarness> pumpProfile(
    WidgetTester tester, {
    String planKey = 'free',
    bool planUnavailable = false,
  }) async {
    tester.view.physicalSize = const Size(430, 932);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final harness = TestCreateWorkflowHarness();
    final state = await harness.repository.loadLocalProfileFeatureState();
    await harness.repository.saveLocalProfileFeatureState(
      state.copyWith(subscriptionPlanKey: planKey),
    );
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          airvanaRepositoryProvider.overrideWithValue(harness.repository),
          if (planUnavailable)
            profileFeatureStateProvider.overrideWith(
              (_) async => throw StateError('subscription unavailable'),
            ),
          homeProvider.overrideWith(
            (_) async => const HomeSnapshot(
              user: AppUser(id: 'user-1', displayName: 'Kai Chen'),
              playables: [],
              localDemo: true,
            ),
          ),
          experienceHistoryProvider.overrideWith((_) async => const []),
          profileLocalWorkspaceProvider.overrideWith(
            (_) async => const LocalWorkspaceSnapshot(),
          ),
        ],
        child: MaterialApp.router(
          theme: buildAirvanaTheme(),
          routerConfig: buildAirvanaRouter(initialLocation: '/profile'),
        ),
      ),
    );
    await tester.pumpAndSettle();
    return harness;
  }

  testWidgets('昵称旁是 VIP 标，不再有 L3 等级章，也不再有 Free 订阅卡', (tester) async {
    await pumpProfile(tester);

    expect(find.byKey(const ValueKey('profile-vip-chip')), findsOneWidget);
    expect(find.text('VIP'), findsOneWidget);
    expect(find.text('L3'), findsNothing);
    expect(
      find.byKey(const ValueKey('profile-subscription-card')),
      findsNothing,
    );
    expect(find.text('订阅只提供功能与周期额度，不直接发放 AIP 或 AIT'), findsNothing);
  });

  testWidgets('VIP 标与昵称同一行，且在昵称右边', (tester) async {
    await pumpProfile(tester);
    final name = tester.getRect(
      find.byKey(const ValueKey('profile-display-name')),
    );
    final chip = tester.getRect(find.byKey(const ValueKey('profile-vip-chip')));
    expect(chip.left, greaterThanOrEqualTo(name.right));
    expect((chip.center.dy - name.center.dy).abs(), lessThan(6));
  });

  testWidgets('点 VIP 标进入「订阅与额度」', (tester) async {
    await pumpProfile(tester);
    await tester.tap(find.byKey(const ValueKey('profile-vip-entry')));
    await tester.pumpAndSettle();
    expect(find.text('订阅与额度'), findsWidgets);
  });

  testWidgets('触控区 44×44，读屏可触发，文案随订阅状态变化', (tester) async {
    await pumpProfile(tester);
    expect(
      tester.getSize(find.byKey(const ValueKey('profile-vip-entry'))),
      const Size.square(44),
    );
    final free = find.bySemanticsLabel('开通 VIP 订阅，当前 Free');
    expect(free, findsOneWidget);
    expect(
      tester
          .getSemantics(free)
          .getSemanticsData()
          .hasAction(SemanticsAction.tap),
      isTrue,
    );
  });

  testWidgets('已订阅 Creator Pro 时读屏说的是「管理」', (tester) async {
    await pumpProfile(tester, planKey: 'creator_pro');
    expect(find.bySemanticsLabel('管理 VIP 订阅，当前 Creator Pro'), findsOneWidget);
  });

  testWidgets('订阅状态不可用时不误报 Free，入口仍可打开', (tester) async {
    await pumpProfile(tester, planUnavailable: true);
    expect(find.bySemanticsLabel('查看 VIP 订阅'), findsOneWidget);
    expect(find.bySemanticsLabel('开通 VIP 订阅，当前 Free'), findsNothing);
    await tester.tap(find.byKey(const ValueKey('profile-vip-entry')));
    await tester.pumpAndSettle();
    expect(find.text('订阅与额度'), findsWidgets);
    expect(tester.takeException(), isNull);
  });
}
