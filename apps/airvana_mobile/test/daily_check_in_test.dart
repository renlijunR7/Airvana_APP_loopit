import 'package:airvana_mobile/features/shared/data/local_airvana_store.dart';
import 'package:flutter_test/flutter_test.dart';

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
}
