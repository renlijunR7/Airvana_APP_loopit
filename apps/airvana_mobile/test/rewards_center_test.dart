import 'dart:async';

import 'package:airvana_mobile/app/app_router.dart';
import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/core/config/app_environment.dart';
import 'package:airvana_mobile/core/network/airvana_api_client.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/shared/data/airvana_repository.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_models.dart';
import 'package:airvana_mobile/features/shared/domain/airvana_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'support/test_create_workflow.dart';

void main() {
  testWidgets(
    'profile calendar opens rewards and check-in updates balance once',
    (tester) async {
      final harness = TestCreateWorkflowHarness();
      await _mount(tester, harness.repository, initialLocation: '/profile');
      await tester.tap(find.byTooltip('奖励中心'));
      await tester.pumpAndSettle();
      expect(find.text('奖励中心'), findsOneWidget);
      expect(
        find.byKey(const ValueKey('rewards-balance-card')),
        findsOneWidget,
      );
      expect(find.byKey(const ValueKey('earn-task-check-in')), findsOneWidget);
      expect(find.textContaining('1,000'), findsNothing);
      expect(find.byType(BottomSheet), findsNothing);

      await tester.tap(find.byKey(const ValueKey('earn-task-check-in')));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('check-in-days')), findsOneWidget);
      for (var day = 1; day <= 7; day++) {
        expect(find.byKey(ValueKey('check-in-day-$day')), findsOneWidget);
      }
      expect(
        tester.getSize(find.byKey(const ValueKey('check-in-day-1'))).width,
        tester.getSize(find.byKey(const ValueKey('check-in-day-5'))).width,
      );
      expect(
        tester.getSize(find.byKey(const ValueKey('check-in-day-7'))).width,
        greaterThan(
          tester.getSize(find.byKey(const ValueKey('check-in-day-6'))).width *
              1.9,
        ),
      );
      final action = find.byKey(const ValueKey('daily-check-in'));
      await tester.ensureVisible(action);
      await tester.pumpAndSettle();
      expect(tester.widget<FilledButton>(action).onPressed, isNotNull);
      expect(
        tester.widget<FilledButton>(action).style?.backgroundColor?.resolve({}),
        AirvanaColors.accent,
      );
      await tester.tap(action);
      await tester.pumpAndSettle();
      expect(find.text('签到成功 +60 AIP'), findsOneWidget);
      expect(tester.widget<FilledButton>(action).onPressed, isNull);
      expect((await harness.repository.loadRewardState()).aipBalance, 2540);
      expect(
        (await harness.repository.loadWalletTxns()).where(
          (txn) => txn.title == '每日签到',
        ),
        hasLength(1),
      );
      await tester.tap(find.byTooltip('关闭签到'));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('earn-task-check-in')));
      await tester.pumpAndSettle();
      expect(tester.widget<FilledButton>(action).onPressed, isNull);
    },
  );

  testWidgets('wallet, create and invite remain real navigation actions', (
    tester,
  ) async {
    final harness = TestCreateWorkflowHarness();
    final router = await _mount(tester, harness.repository);
    await tester.tap(find.byKey(const ValueKey('rewards-balance-card')));
    await tester.pumpAndSettle();
    expect(
      find.byKey(const ValueKey('profile-secondary-wallet')),
      findsOneWidget,
    );
    router.pop();
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.byKey(const ValueKey('earn-task-invite')));
    await tester.tap(find.byKey(const ValueKey('earn-task-invite')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('invite-page-body')), findsOneWidget);
    expect(find.text('邀请规则 · 演示'), findsOneWidget);
    expect(find.textContaining('1,000'), findsNothing);
    router.pop();
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.byKey(const ValueKey('earn-task-create')));
    await tester.tap(find.byKey(const ValueKey('earn-task-create')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('create-home-dock')), findsOneWidget);
  });

  testWidgets('claim disables double taps and shows recoverable failure', (
    tester,
  ) async {
    final repository = _ControlledRewardsRepository();
    await _mount(tester, repository);
    await tester.tap(find.byKey(const ValueKey('earn-task-check-in')));
    await tester.pumpAndSettle();
    final action = find.byKey(const ValueKey('daily-check-in'));
    await tester.ensureVisible(action);
    await tester.pumpAndSettle();
    await tester.tap(action);
    await tester.pump();
    expect(repository.claimCalls, 1);
    expect(tester.widget<FilledButton>(action).onPressed, isNull);
    await tester.tap(action);
    await tester.pump();
    expect(repository.claimCalls, 1);
    repository.pending.completeError(StateError('offline'));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('check-in-error')), findsOneWidget);
    expect(find.textContaining('签到成功'), findsNothing);
    expect(tester.widget<FilledButton>(action).onPressed, isNotNull);
    repository.pending = Completer<LocalCheckInResult>();
    await tester.ensureVisible(action);
    await tester.tap(action);
    await tester.pump();
    expect(repository.claimCalls, 2);
    repository.succeed();
    await tester.pumpAndSettle();
    expect(tester.widget<FilledButton>(action).onPressed, isNull);
    expect(find.text('签到成功 +60 AIP'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('failed balance load retries without inventing a balance', (
    tester,
  ) async {
    final repository = _ControlledRewardsRepository()..failLoad = true;
    await _mount(tester, repository);
    expect(find.text('2,480'), findsNothing);
    expect(find.byKey(const ValueKey('rewards-retry')), findsOneWidget);
    repository.failLoad = false;
    await tester.tap(find.byKey(const ValueKey('rewards-retry')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('rewards-retry')), findsNothing);
    expect(find.byKey(const ValueKey('rewards-balance-card')), findsOneWidget);
  });

  testWidgets('closing an in-flight check-in is safe and refreshes overview', (
    tester,
  ) async {
    final repository = _ControlledRewardsRepository();
    await _mount(tester, repository);
    await tester.tap(find.byKey(const ValueKey('earn-task-check-in')));
    await tester.pumpAndSettle();
    final action = find.byKey(const ValueKey('daily-check-in'));
    await tester.ensureVisible(action);
    await tester.tap(action);
    await tester.pump();
    await tester.tap(find.byTooltip('关闭签到'));
    // An unresolved spinner prevents pumpAndSettle until the sheet exits.
    await tester.pump(const Duration(seconds: 1));
    repository.succeed();
    await tester.pumpAndSettle();
    expect(find.byType(BottomSheet), findsNothing);
    expect(tester.takeException(), isNull);
    await tester.tap(find.byKey(const ValueKey('earn-task-check-in')));
    await tester.pumpAndSettle();
    expect(tester.widget<FilledButton>(action).onPressed, isNull);
  });

  testWidgets('server mode does not promise the local reward estimate', (
    tester,
  ) async {
    final repository = _ControlledRewardsRepository(localMode: false);
    await _mount(tester, repository);
    expect(find.textContaining('60 AIP'), findsNothing);
    await tester.tap(find.byKey(const ValueKey('earn-task-check-in')));
    await tester.pumpAndSettle();
    expect(find.textContaining('签到领 60'), findsNothing);
    expect(find.textContaining('服务端'), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  for (final size in [
    const Size(320, 568),
    const Size(360, 800),
    const Size(390, 844),
    const Size(430, 932),
  ]) {
    testWidgets('rewards and check-in fit ${size.width} at enlarged text', (
      tester,
    ) async {
      final harness = TestCreateWorkflowHarness();
      await _mount(tester, harness.repository, size: size, textScale: 1.5);
      expect(tester.takeException(), isNull);
      final task = find.byKey(const ValueKey('earn-task-check-in'));
      await tester.ensureVisible(task);
      await tester.pumpAndSettle();
      await tester.tap(task);
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      final action = find.byKey(const ValueKey('daily-check-in'));
      await tester.ensureVisible(action);
      await tester.pumpAndSettle();
      expect(action.hitTestable(), findsOneWidget);
      expect(tester.getRect(action).left, greaterThanOrEqualTo(0));
      expect(tester.getRect(action).right, lessThanOrEqualTo(size.width));
      expect(tester.takeException(), isNull);
      await tester.tap(find.byTooltip('关闭签到'));
      await tester.pumpAndSettle();
      expect(find.byType(BottomSheet), findsNothing);
    });
  }
}

Future<GoRouter> _mount(
  WidgetTester tester,
  AirvanaRepository repository, {
  String initialLocation = '/profile/secondary/checkIn',
  Size size = const Size(430, 932),
  double textScale = 1,
}) async {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  tester.view.padding = const FakeViewPadding(bottom: 34);
  tester.view.viewPadding = const FakeViewPadding(bottom: 34);
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  addTearDown(tester.view.resetPadding);
  addTearDown(tester.view.resetViewPadding);
  final router = buildAirvanaRouter(initialLocation: initialLocation);
  addTearDown(router.dispose);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        airvanaRepositoryProvider.overrideWithValue(repository),
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
        routerConfig: router,
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(
            context,
          ).copyWith(textScaler: TextScaler.linear(textScale)),
          child: child!,
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
  return router;
}

class _ControlledRewardsRepository extends AirvanaRepository {
  _ControlledRewardsRepository({bool localMode = true})
    : super(
        api: AirvanaApiClient(
          baseUri: Uri.parse('http://192.0.2.1'),
          sessionStore: MemorySessionStore(),
        ),
        environment: AppEnvironment(
          apiBaseUri: Uri.parse('http://192.0.2.1'),
          demoLoginEnabled: false,
          preferLocalData: localMode,
        ),
      );
  var state = const LocalRewardState();
  var pending = Completer<LocalCheckInResult>();
  var claimCalls = 0;
  var failLoad = false;

  @override
  Future<LocalRewardState> loadRewardState() async {
    if (failLoad) throw StateError('offline');
    return state;
  }

  @override
  Future<LocalCheckInResult> checkInDaily() {
    claimCalls++;
    return pending.future;
  }

  void succeed() {
    final now = DateTime.now();
    final date =
        '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';
    state = LocalRewardState(
      aipBalance: 2540,
      checkInStreak: 5,
      lastCheckInDate: date,
    );
    pending.complete(
      LocalCheckInResult(state: state, earned: 60, idempotent: false),
    );
  }
}
