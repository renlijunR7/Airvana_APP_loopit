import 'dart:convert';
import 'dart:io';

import 'package:airvana_mobile/features/shared/data/local_airvana_models.dart';
import 'package:airvana_mobile/shared/presentation/system_modals.dart';
import 'package:flutter_test/flutter_test.dart';

/// 产品契约在仓库根的 docs/product-contract/；测试工作目录是 apps/airvana_mobile。
Map<String, dynamic> _contract(String name) {
  final file = File('../../docs/product-contract/$name');
  expect(file.existsSync(), isTrue, reason: '找不到契约文件：${file.path}');
  return jsonDecode(file.readAsStringSync()) as Map<String, dynamic>;
}

void main() {
  test('本机签到金额逐天符合产品契约，且第 7 天起封顶', () {
    final checkIn =
        _contract('economy.json')['checkIn'] as Map<String, dynamic>;
    final ladder = (checkIn['ladder'] as List).cast<int>();

    for (var day = 1; day <= ladder.length; day += 1) {
      // 连签 N-1 天之后签到，就是第 N 天。
      final state = LocalRewardState(checkInStreak: day - 1);
      expect(
        state.nextCheckInReward,
        ladder[day - 1],
        reason: '第 $day 天应发 ${ladder[day - 1]} AIP',
      );
    }

    final capAmount = checkIn['capAmount'] as int;
    for (final streak in [7, 8, 30, 365]) {
      expect(
        LocalRewardState(checkInStreak: streak).nextCheckInReward,
        capAmount,
        reason: '连签 $streak 天后仍应封顶在 $capAmount',
      );
    }
  });

  test('三个风控弹窗的文案与按钮与产品契约逐字一致', () {
    final modals =
        _contract('risk-modals.json')['modals'] as Map<String, dynamic>;
    const mapping = {
      'riskWeakNetwork': AirvanaSystemModal.riskWeakNetwork,
      'riskOffline': AirvanaSystemModal.riskOffline,
      'riskChinaRegion': AirvanaSystemModal.riskChinaRegion,
    };

    mapping.forEach((key, modal) {
      final expected = modals[key] as Map<String, dynamic>;
      final spec = systemModalSpec(modal);
      expect(spec.eyebrow, expected['eyebrow'], reason: '$key eyebrow');
      expect(spec.title, expected['title'], reason: '$key title');
      // 正文是产品承诺，不能被改写或降级成 note。
      expect(spec.body, expected['body'], reason: '$key body');
      expect(spec.note, expected['note'], reason: '$key note');
      expect(
        spec.primaryLabel,
        expected['primaryLabel'],
        reason: '$key primaryLabel',
      );
      expect(
        spec.secondaryLabel,
        expected['secondaryLabel'],
        reason: '$key secondaryLabel',
      );
    });
  });
}
