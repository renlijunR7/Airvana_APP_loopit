import 'package:airvana_mobile/features/runtime/presentation/h5_game_runtime.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_store.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('h5 game key mapping covers legacy ids and rejects others', () {
    expect(h5GameKeyForPlayable('plb_neon_dash'), 'neon-dash');
    expect(h5GameKeyForPlayable('plb_orchard_merge'), 'orchard-merge');
    expect(h5GameKeyForPlayable('plb_star_mower'), 'star-mower');
    expect(h5GameKeyForPlayable('playable_abc123'), isNull);
  });

  test('h5 runtime is unsupported in the widget-test environment', () {
    // WebViewPlatform 未注册时必须降级到本地演示结构，而不是抛错。
    expect(h5GameRuntimeSupported(), isFalse);
  });

  test(
    'recordGameCompletion books coins, daily 5 AIP once, and wallet txns',
    () async {
      final persistence = MemoryLocalAirvanaPersistence();
      var now = DateTime(2026, 9, 1, 12);
      final store = LocalAirvanaStore(
        persistence: persistence,
        clock: () => now,
      );

      // 首次有效完成：金币入账 + 5 AIP + 流水
      final first = await store.recordGameCompletion(
        playableId: 'plb_neon_dash',
        title: '霓虹疾跑 Neon Dash',
        coins: 320,
      );
      expect(first.coinBalance, 320);
      expect(first.earnedAip, 5);
      expect(first.aipBalance, 2485);

      // 同日再次完成：金币继续入账，AIP 不再发放
      final repeat = await store.recordGameCompletion(
        playableId: 'plb_neon_dash',
        title: '霓虹疾跑 Neon Dash',
        coins: 100,
      );
      expect(repeat.coinBalance, 420);
      expect(repeat.earnedAip, 0);
      expect(repeat.aipBalance, 2485);

      // 不同作品当日仍可发放；金币账本按 playable_id 隔离
      final other = await store.recordGameCompletion(
        playableId: 'plb_star_mower',
        title: '星尘割草 Star Mower',
        coins: 50,
      );
      expect(other.coinBalance, 50);
      expect(other.earnedAip, 5);
      final ledgers = await store.loadGameCoinLedgers();
      expect(ledgers['plb_neon_dash'], 420);
      expect(ledgers['plb_star_mower'], 50);

      // 次日同作品重新发放
      now = DateTime(2026, 9, 2, 8);
      final nextDay = await store.recordGameCompletion(
        playableId: 'plb_neon_dash',
        title: '霓虹疾跑 Neon Dash',
        coins: 10,
      );
      expect(nextDay.earnedAip, 5);

      // 流水包含每次发放，标题带作品名，且持久化可恢复
      final txns = await store.loadWalletTxns();
      expect(txns.where((txn) => txn.title.startsWith('有效完成')), hasLength(3));
      expect(txns.first.title, '有效完成 · 霓虹疾跑 Neon Dash');
      final reloaded = LocalAirvanaStore(
        persistence: persistence,
        clock: () => now,
      );
      expect((await reloaded.loadRewardState()).aipBalance, 2495);
    },
  );
}
