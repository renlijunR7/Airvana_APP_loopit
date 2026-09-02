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
    'check-in writes an AIP txn and wallet txns sort newest first',
    () async {
      final persistence = MemoryLocalAirvanaPersistence();
      var now = DateTime(2026, 9, 1, 10);
      final store = LocalAirvanaStore(
        persistence: persistence,
        clock: () => now,
      );

      expect(await store.loadWalletTxns(), isEmpty);
      expect(await store.loadGameCoinLedgers(), isEmpty);

      final first = await store.checkInDaily();
      expect(first.earned, 60);
      now = DateTime(2026, 9, 2, 9);
      final second = await store.checkInDaily();
      expect(second.earned, 70);

      final txns = await store.loadWalletTxns();
      expect(txns, hasLength(2));
      expect(txns.first.title, '每日签到');
      expect(txns.first.amount, 70);
      expect(txns.last.amount, 60);
      expect(
        txns.first.occurredAt.isAfter(txns.last.occurredAt),
        isTrue,
        reason: '流水必须新到旧排序',
      );

      // 同日幂等签到不产生新流水
      final repeat = await store.checkInDaily();
      expect(repeat.idempotent, isTrue);
      expect(await store.loadWalletTxns(), hasLength(2));
    },
  );

  testWidgets('wallet page keeps the Web AIP/AIT structure and boundary copy', (
    tester,
  ) async {
    final harness = TestCreateWorkflowHarness();
    tester.view.physicalSize = const Size(430, 932);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    // 预先签到一次：钱包打开时流水已入账
    final checkIn = await harness.repository.checkInDaily();
    expect(checkIn.earned, 60);

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
        ],
        child: MaterialApp.router(
          theme: buildAirvanaTheme(),
          routerConfig: buildAirvanaRouter(
            initialLocation: '/profile/secondary/wallet',
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    // AIP Tab（默认）：标题、余额（签到后 2480+60）、订阅额度、金币分账、边界卡、流水
    expect(find.text('钱包'), findsOneWidget);
    expect(find.byKey(const ValueKey('wallet-hero-value')), findsOneWidget);
    expect(find.text('2540'), findsOneWidget);
    expect(find.textContaining('轻度创作：剩余 3 / 3'), findsOneWidget);
    expect(find.text('游戏金币与 AIP'), findsOneWidget);
    expect(find.byKey(const ValueKey('wallet-coin-empty')), findsOneWidget);
    expect(find.text('经济模型边界'), findsOneWidget);
    expect(find.textContaining('AIP 是站内行为积分，不可提现、转让或交易'), findsOneWidget);
    expect(find.byKey(const ValueKey('wallet-txn-list')), findsOneWidget);
    expect(find.text('每日签到'), findsOneWidget);
    expect(find.text('+60 AIP'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('wallet-tab-ait')));
    await tester.pumpAndSettle();

    // AIT Tab：三格统计 + 降级文案 + 权益空态
    expect(find.text('有效权益'), findsOneWidget);
    expect(find.text('可申领'), findsOneWidget);
    expect(find.text('待处理'), findsOneWidget);
    expect(find.byKey(const ValueKey('wallet-bind')), findsOneWidget);
    expect(find.textContaining('本机仅记录绑定意向'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.byKey(const ValueKey('wallet-ait-empty')),
      220,
      scrollable: find
          .descendant(
            of: find.byKey(const ValueKey('wallet-page-scroll')),
            matching: find.byType(Scrollable),
          )
          .first,
    );
    expect(find.byKey(const ValueKey('wallet-ait-empty')), findsOneWidget);
    expect(
      find.byKey(const ValueKey('wallet-open-settlement')),
      findsOneWidget,
    );

    // 回到 AIP：先滚回顶部（Tab 条随列表回收），内容保持
    await tester.drag(
      find.byKey(const ValueKey('wallet-page-scroll')),
      const Offset(0, 900),
    );
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('wallet-tab-aip')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('wallet-txn-list')), findsOneWidget);
  });
}
