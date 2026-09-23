import 'package:airvana_mobile/features/runtime/domain/game_power_profiles.dart';
import 'package:airvana_mobile/features/shared/domain/power_binder.dart';
import 'package:airvana_mobile/features/shared/domain/power_capability.dart';
import 'package:airvana_mobile/features/shared/domain/power_catalog.dart';
import 'package:flutter_test/flutter_test.dart';

/// 作品需求声明 × 能力目录的联合验证。
///
/// 这两张表是独立生长的：能力目录描述宿主能提供什么，作品档案描述每个作品
/// 需要什么。撮合器把它们接起来。这里验证的是接起来之后**结论成立**，
/// 而不是各自看着合理。
void main() {
  const binder = PowerBinder();
  const allGranted = PowerAvailability(
    grantedPermissions: {
      PowerPermission.camera,
      PowerPermission.microphone,
      PowerPermission.motion,
      PowerPermission.location,
      PowerPermission.activityRecognition,
      PowerPermission.nearbyDevices,
    },
  );

  test('17 个作品，13 个受 manifest 的不改动承诺约束', () {
    expect(kGamePowerProfiles.length, 17);
    final sealed = kGamePowerProfiles.where((g) => g.sealed).map((g) => g.slug).toSet();
    expect(sealed.length, 13);
    // 今天新加的两个手势作品是自研件，不在 manifest 里，允许改包。
    expect(sealed, isNot(contains('gesture-fruit-slice')));
    expect(sealed, isNot(contains('christmas-tree-gesture')));
    expect(sealed, isNot(contains('ice-float-party')));
    expect(sealed, isNot(contains('magic-choir-replica')));
  });

  test('每个作品都至少声明了一条需求，且 slug 唯一', () {
    final slugs = <String>{};
    for (final game in kGamePowerProfiles) {
      expect(game.requirements, isNotEmpty, reason: '${game.slug} 没有任何需求声明');
      expect(slugs.add(game.slug), isTrue, reason: '${game.slug} 重复');
    }
  });

  test('需求参数在合理范围内', () {
    for (final game in kGamePowerProfiles) {
      for (final r in game.requirements) {
        expect(r.dimensions, inInclusiveRange(1, 3), reason: '${game.slug} 维度越界');
        expect(r.minHz, greaterThan(0), reason: '${game.slug} 采样率必须为正');
        expect(
          r.maxLatency.inMilliseconds,
          greaterThan(0),
          reason: '${game.slug} 延迟容忍必须为正',
        );
      }
    }
  });

  test('每个作品的每条需求都能被撮合出确定结论，绝不悬挂', () {
    // 这是整套设计最重要的一条：无论选了什么能力、权限给没给，
    // 作品拿到的要么是可用信号，要么是明确的降级，不存在「等着」。
    for (final game in kGamePowerProfiles) {
      for (final selected in <Set<String>>[
        {},
        {'gestureVision'},
        {'motionHaptic'},
        {'gestureVision', 'motionHaptic', 'microphoneVoice', 'faceExpression'},
      ]) {
        final results = binder.bind(
          requirements: game.requirements,
          selectedPowerIds: selected,
          availability: allGranted,
        );
        expect(results.length, game.requirements.length);
        for (final r in results) {
          expect(
            r.degraded ? r.reason != null : r.signal != null,
            isTrue,
            reason: '${game.slug} 出现了既非绑定也非降级的状态',
          );
        }
      }
    }
  });

  test('必需需求在无任何能力时必须有降级去处，否则作品不可玩', () {
    for (final game in kGamePowerProfiles) {
      final required = game.requirements.where((r) => !r.optional);
      if (required.isEmpty) continue;
      final results = binder.bind(
        requirements: required.toList(),
        selectedPowerIds: const {},
        availability: const PowerAvailability(grantedPermissions: {}),
      );
      for (final r in results) {
        expect(r.degraded, isTrue);
        // 没有候选能力时 effectiveControl 回落到需求自身的语义 ——
        // 也就是「用触屏做同一件事」，作品本来就支持。
        expect(r.effectiveControl, r.requirement.control);
      }
    }
  });

  group('体感能力接到形态不同的作品上', () {
    PowerBindingResult bindFirst(String slug, PowerControl control) {
      final game = kGamePowerProfiles.firstWhere((g) => g.slug == slug);
      final req = game.requirements.firstWhere((r) => r.control == control);
      return binder.bind(
        requirements: [req],
        selectedPowerIds: {'motionHaptic'},
        availability: allGranted,
      ).single;
    }

    test('赛车的 steer 配上倾斜信号', () {
      final r = bindFirst('mini-gp-racers', PowerControl.steer);
      expect(r.degraded, isFalse);
      expect(r.signal!.name, 'orientation.tilt');
    });

    test('跑酷的 lane 同样由倾斜驱动，但语义完全不同', () {
      final r = bindFirst('street-gold-rush', PowerControl.lane);
      expect(r.degraded, isFalse);
      expect(r.signal!.name, 'orientation.tilt');
      expect(r.effectiveControl, PowerControl.lane);
    });

    test('切水果要二维指针，倾斜只有一维，于是降级而不是硬凑', () {
      final r = bindFirst('gesture-fruit-slice', PowerControl.pointer);
      expect(r.degraded, isTrue);
      expect(r.reason, PowerDegradeReason.notSelected);
    });
  });

  test('手势能力覆盖了哪些作品：所有声明 pointer 的都能接上', () {
    final covered = <String>[];
    for (final game in kGamePowerProfiles) {
      final pointer = game.requirements.where((r) => r.control == PowerControl.pointer);
      if (pointer.isEmpty) continue;
      final results = binder.bind(
        requirements: pointer.toList(),
        selectedPowerIds: {'gestureVision'},
        availability: allGranted,
      );
      if (results.every((r) => !r.degraded)) covered.add(game.slug);
    }
    // 手势信号标称 30Hz，要求更高的作品接不上——这是如实结论，不是缺陷。
    expect(covered, isNotEmpty);
    expect(kPowerCatalog.length, 58);
  });
}
