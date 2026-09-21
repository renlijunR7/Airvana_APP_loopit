import 'package:airvana_mobile/features/shared/data/local_airvana_models.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('签到金额与 Web 阶梯一致并在第 7 天封顶', () {
    // 第 N 天 = 连签 N-1 天后签到，金额 20 + (N-1) x 10。
    const expected = <int, int>{
      0: 20,
      1: 30,
      2: 40,
      3: 50,
      4: 60,
      5: 70,
      6: 80,
      7: 80,
      30: 80,
    };
    expected.forEach((streak, amount) {
      final state = LocalRewardState(checkInStreak: streak);
      expect(
        state.nextCheckInReward,
        amount,
        reason: '连签 $streak 天后应发 $amount AIP',
      );
    });
  });
}
