import 'package:airvana_mobile/app/app_router.dart';
import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_store.dart';
import 'package:airvana_mobile/features/shared/domain/airvana_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/test_create_workflow.dart';

void main() {
  test(
    'checkInDaily awards streak-based AIP once per day and persists',
    () async {
      final persistence = MemoryLocalAirvanaPersistence();
      var now = DateTime(2026, 8, 31, 10);
      final store = LocalAirvanaStore(
        persistence: persistence,
        clock: () => now,
      );

      final initial = await store.loadRewardState();
      expect(initial.aipBalance, 2480);
      expect(initial.checkInStreak, 4);
      expect(initial.nextCheckInReward, 60);

      final first = await store.checkInDaily();
      expect(first.idempotent, isFalse);
      expect(first.earned, 60);
      expect(first.state.aipBalance, 2540);
      expect(first.state.checkInStreak, 5);
      expect(first.state.lastCheckInDate, '2026-08-31');

      // 同一天重复签到保持幂等
      final repeat = await store.checkInDaily();
      expect(repeat.idempotent, isTrue);
      expect(repeat.earned, 0);
      expect(repeat.state.aipBalance, 2540);

      // 状态写入持久层：新 store 实例可恢复
      final reloaded = LocalAirvanaStore(
        persistence: persistence,
        clock: () => now,
      );
      expect((await reloaded.loadRewardState()).aipBalance, 2540);

      // 次日可再次签到，奖励随连签递增
      now = DateTime(2026, 9, 1, 9);
      final nextDay = await store.checkInDaily();
      expect(nextDay.idempotent, isFalse);
      expect(nextDay.earned, 70);
      expect(nextDay.state.checkInStreak, 6);
    },
  );

  testWidgets('profile reward action opens the Web-parity task list', (
    tester,
  ) async {
    final harness = TestCreateWorkflowHarness();
    tester.view.physicalSize = const Size(430, 932);
    tester.view.devicePixelRatio = 1;
    tester.view.padding = const FakeViewPadding(bottom: 34);
    tester.view.viewPadding = const FakeViewPadding(bottom: 34);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPadding);
    addTearDown(tester.view.resetViewPadding);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          airvanaRepositoryProvider.overrideWithValue(harness.repository),
          homeProvider.overrideWith(
            (_) async => const HomeSnapshot(
              user: AppUser(id: 'user-1', displayName: 'Kai Chen'),
              playables: [],
            ),
          ),
          experienceHistoryProvider.overrideWith((_) async => const []),
        ],
        child: MaterialApp.router(
          theme: buildAirvanaTheme(),
          routerConfig: buildAirvanaRouter(initialLocation: '/profile'),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('获取积分'));
    await tester.pumpAndSettle();

    final page = find.byKey(const ValueKey('profile-secondary-checkIn'));
    expect(page, findsOneWidget);
    expect(tester.getSize(page), const Size(430, 932));
    expect(find.byType(BottomSheet), findsNothing);
    expect(find.byKey(const ValueKey('primary-navigation')), findsNothing);
    expect(find.text('获取积分'), findsOneWidget);
    expect(find.text('完成任务，持续获得 AIP'), findsOneWidget);
    expect(find.text('每日签到'), findsOneWidget);
    expect(find.text('创作 Agentic Playable'), findsOneWidget);
    expect(find.text('发布游戏即可获得 AIP'), findsOneWidget);
    expect(find.text('邀请好友'), findsOneWidget);
    expect(find.text('好友完成注册并配置 Agent 后领取奖励'), findsOneWidget);
    expect(find.text('签到领 60 AIP'), findsOneWidget);

    expect(
      tester.getSize(find.byKey(const ValueKey('earn-task-check-in'))).height,
      66,
    );
    expect(
      tester.getSize(find.byKey(const ValueKey('earn-task-create'))).height,
      66,
    );
    expect(
      tester.getSize(find.byKey(const ValueKey('earn-task-invite'))).height,
      66,
    );

    await tester.tap(find.byKey(const ValueKey('earn-task-check-in')));
    await tester.pumpAndSettle();

    expect(
      find.byKey(const ValueKey('earn-task-check-in-sheet')),
      findsOneWidget,
    );
    expect(find.byType(BottomSheet), findsOneWidget);
    expect(find.text('AIP 余额'), findsOneWidget);
    expect(find.text('2480'), findsOneWidget);
    expect(
      tester
          .widget<SingleChildScrollView>(
            find.byKey(const ValueKey('earn-task-check-in-scroll')),
          )
          .padding,
      const EdgeInsets.fromLTRB(18, 14, 18, 58),
    );

    final activeCheckInButton = tester.widget<FilledButton>(
      find.byKey(const ValueKey('daily-check-in')),
    );
    expect(
      activeCheckInButton.style?.backgroundColor?.resolve(<WidgetState>{}),
      AirvanaColors.accent,
    );
    expect(
      tester.getSize(find.byKey(const ValueKey('daily-check-in'))).height,
      48,
    );

    await tester.tap(find.byKey(const ValueKey('daily-check-in')));
    await tester.pumpAndSettle();

    expect(find.text('签到成功 +60 AIP'), findsOneWidget);
    expect(find.text('今日已签到 ✓'), findsNWidgets(2));
    expect(find.text('2540'), findsOneWidget);

    final button = tester.widget<FilledButton>(
      find.byKey(const ValueKey('daily-check-in')),
    );
    expect(button.onPressed, isNull);
  });

  testWidgets('earn task actions keep create and invite interactions usable', (
    tester,
  ) async {
    final harness = TestCreateWorkflowHarness();
    tester.view.physicalSize = const Size(430, 932);
    tester.view.devicePixelRatio = 1;
    tester.view.padding = const FakeViewPadding(bottom: 34);
    tester.view.viewPadding = const FakeViewPadding(bottom: 34);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPadding);
    addTearDown(tester.view.resetViewPadding);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          airvanaRepositoryProvider.overrideWithValue(harness.repository),
          homeProvider.overrideWith(
            (_) async => const HomeSnapshot(
              user: AppUser(id: 'user-1', displayName: 'Kai Chen'),
              playables: [],
            ),
          ),
          experienceHistoryProvider.overrideWith((_) async => const []),
        ],
        child: MaterialApp.router(
          theme: buildAirvanaTheme(),
          routerConfig: buildAirvanaRouter(
            initialLocation: '/profile/secondary/checkIn',
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('earn-task-invite')));
    await tester.pumpAndSettle();
    expect(
      find.byKey(const ValueKey('earn-task-invite-sheet')),
      findsOneWidget,
    );
    expect(find.text('AIR-KAI-4821'), findsOneWidget);
    expect(
      tester
          .widget<SliverPadding>(
            find.byKey(const ValueKey('earn-task-invite-content')),
          )
          .padding,
      const EdgeInsets.fromLTRB(18, 18, 18, 58),
    );
    final inviteHero = tester.widget<Container>(
      find.byKey(const ValueKey('invite-hero')),
    );
    final inviteHeroDecoration = inviteHero.decoration! as BoxDecoration;
    expect((inviteHeroDecoration.gradient! as LinearGradient).colors, const [
      Color(0xFFFF3B4A),
      Color(0xFFFF7180),
    ]);
    expect(find.text('1,000'), findsOneWidget);
    expect(find.text('AIP'), findsWidgets);
    expect(find.byKey(const ValueKey('invite-code-card')), findsOneWidget);
    expect(find.byKey(const ValueKey('copy-invite-code')), findsOneWidget);
    expect(find.byKey(const ValueKey('invite-stats')), findsOneWidget);
    expect(find.byKey(const ValueKey('invite-step-1')), findsOneWidget);
    expect(find.byKey(const ValueKey('invite-step-2')), findsOneWidget);
    expect(find.byKey(const ValueKey('invite-step-3')), findsOneWidget);
    expect(find.byKey(const ValueKey('invite-boundary-note')), findsOneWidget);
    expect(find.byKey(const ValueKey('copy-invite-link')), findsOneWidget);
    expect(
      find.byKey(const ValueKey('simulate-invite-complete')),
      findsOneWidget,
    );
    final copyButton = tester.widget<FilledButton>(
      find.byKey(const ValueKey('copy-invite-link')),
    );
    expect(
      copyButton.style?.backgroundColor?.resolve(<WidgetState>{}),
      AirvanaColors.accent,
    );
    expect(
      tester
          .widget<OutlinedButton>(
            find.byKey(const ValueKey('simulate-invite-complete')),
          )
          .style
          ?.side
          ?.resolve(<WidgetState>{})
          ?.color,
      AirvanaColors.line,
    );
    expect(
      tester.getSize(find.byKey(const ValueKey('copy-invite-link'))).height,
      48,
    );

    await tester.ensureVisible(
      find.byKey(const ValueKey('simulate-invite-complete')),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('simulate-invite-complete')));
    await tester.pumpAndSettle();
    expect(find.text('邀请任务已完成'), findsOneWidget);

    await tester.tap(find.byTooltip('关闭邀请好友'));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('earn-task-create')));
    await tester.pumpAndSettle();

    expect(find.byKey(const ValueKey('create-home-dock')), findsOneWidget);
  });
}
