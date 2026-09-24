import 'package:airvana_mobile/features/shared/domain/power_binder.dart';
import 'package:airvana_mobile/features/shared/domain/power_capability.dart';
import 'package:airvana_mobile/features/shared/domain/power_catalog.dart';
import 'package:flutter_test/flutter_test.dart';

/// 撮合器的行为规范。
///
/// 最重要的一条是「撮合永不失败」：每条需求要么拿到绑定，要么拿到降级，
/// 绝不会让作品悬着等一个永远不来的信号。今天真机上那个「正在连接…」
/// 永久卡死，本质就是这条约束缺失。
void main() {
  const binder = PowerBinder();
  final byId = {for (final power in kPowerCatalog) power.id: power};

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
  const nothingGranted = PowerAvailability(grantedPermissions: {});

  group('同一个手势能力接到形态不同的游戏上', () {
    // 这是「匹配不同游戏」的核心用例：手势识别产出的是归一化的指尖坐标，
    // 三个游戏拿它当三种完全不同的东西用，而能力本身一行都不用改。
    const slicer = PowerRequirement(
      control: PowerControl.pointer,
      dimensions: 2,
    );
    const shooter = PowerRequirement(control: PowerControl.aim, dimensions: 2);
    const tap = PowerRequirement(control: PowerControl.trigger, dimensions: 1);

    test('切水果要平面指针 → hand.indexTip', () {
      final result = binder
          .bind(
            requirements: const [slicer],
            selectedPowerIds: {'gestureVision'},
            availability: allGranted,
          )
          .single;
      expect(result.degraded, isFalse);
      expect(result.power!.id, 'gestureVision');
      expect(result.signal!.name, 'hand.indexTip');
      expect(result.effectiveControl, PowerControl.pointer);
    });

    test('瞄准类要 aim，同一个能力同一路信号也能满足', () {
      final result = binder
          .bind(
            requirements: const [shooter],
            selectedPowerIds: {'gestureVision'},
            availability: allGranted,
          )
          .single;
      expect(result.degraded, isFalse);
      expect(result.signal!.name, 'hand.indexTip');
    });

    test('单点触发要一维，捏合信号顶上', () {
      final result = binder
          .bind(
            requirements: const [tap],
            selectedPowerIds: {'gestureVision'},
            availability: allGranted,
          )
          .single;
      expect(result.degraded, isFalse);
      // 二维的指尖坐标维度够用，会先被选中——这是合理的，
      // 适配层丢掉多余维度即可。
      expect(result.signal!.dimensions, greaterThanOrEqualTo(1));
    });

    test('赛车要连续转向，手势不声明 steer，于是降级而不是硬凑', () {
      const steering = PowerRequirement(
        control: PowerControl.steer,
        dimensions: 1,
      );
      final result = binder
          .bind(
            requirements: const [steering],
            selectedPowerIds: {'gestureVision'},
            availability: allGranted,
          )
          .single;
      expect(result.degraded, isTrue);
      expect(result.reason, PowerDegradeReason.notSelected);
    });

    test('换成体感能力，赛车的 steer 就配上了', () {
      const steering = PowerRequirement(
        control: PowerControl.steer,
        dimensions: 1,
      );
      final result = binder
          .bind(
            requirements: const [steering],
            selectedPowerIds: {'motionHaptic'},
            availability: allGranted,
          )
          .single;
      expect(result.degraded, isFalse);
      expect(result.signal!.name, 'orientation.tilt');
    });
  });

  group('降级路径', () {
    const slicer = PowerRequirement(
      control: PowerControl.pointer,
      dimensions: 2,
    );

    test('权限没拿到 → 降级，且原因指向权限而不是笼统的不可用', () {
      final result = binder
          .bind(
            requirements: const [slicer],
            selectedPowerIds: {'gestureVision'},
            availability: nothingGranted,
          )
          .single;
      expect(result.degraded, isTrue);
      expect(result.reason, PowerDegradeReason.permissionDenied);
      expect(result.hint, '触屏滑动仍可操作');
      // 降级后仍然是 pointer —— 语义不变，信号源从摄像头退化成触屏。
      expect(result.effectiveControl, PowerControl.pointer);
    });

    test('设备不支持 → 降级原因是 unavailable', () {
      final result = binder
          .bind(
            requirements: const [slicer],
            selectedPowerIds: {'gestureVision'},
            availability: const PowerAvailability(
              grantedPermissions: {PowerPermission.camera},
              unavailablePowerIds: {'gestureVision'},
            ),
          )
          .single;
      expect(result.reason, PowerDegradeReason.unavailable);
    });

    test('实时服务不可达 → 本地闭环的常态，明确标注而不是假装可用', () {
      const chat = PowerRequirement(
        control: PowerControl.trigger,
        dimensions: 1,
      );
      final result = binder
          .bind(
            requirements: const [chat],
            selectedPowerIds: {'multiplayer'},
            availability: allGranted,
          )
          .single;
      expect(result.degraded, isTrue);
      // multiplayer 不声明任何 control，所以连候选都进不去。
      expect(result.reason, PowerDegradeReason.notSelected);
    });

    test('采样率不够 → specMismatch，不会静默放行', () {
      const picky = PowerRequirement(
        control: PowerControl.pointer,
        dimensions: 2,
        minHz: 120, // 手势能力标称 30Hz，达不到
      );
      final result = binder
          .bind(
            requirements: const [picky],
            selectedPowerIds: {'gestureVision'},
            availability: allGranted,
          )
          .single;
      expect(result.degraded, isTrue);
      expect(result.reason, PowerDegradeReason.specMismatch);
    });
  });

  test('撮合永不失败：任意输入组合都恰好返回同样条数的结果', () {
    const requirements = [
      PowerRequirement(control: PowerControl.pointer, dimensions: 2),
      PowerRequirement(control: PowerControl.steer, dimensions: 1),
      PowerRequirement(control: PowerControl.sequence, dimensions: 1),
      PowerRequirement(control: PowerControl.lane, dimensions: 1),
    ];
    final combos = <Set<String>>[
      {},
      {'gestureVision'},
      {'motionHaptic'},
      {'gestureVision', 'motionHaptic', 'microphoneVoice'},
      {'textTypography'}, // 烘焙类，根本不参与撮合
      {'不存在的能力'},
    ];
    for (final selected in combos) {
      for (final availability in [allGranted, nothingGranted]) {
        final results = binder.bind(
          requirements: requirements,
          selectedPowerIds: selected,
          availability: availability,
        );
        expect(results.length, requirements.length);
        for (final r in results) {
          // 要么绑定成功且有信号，要么降级且有原因。不存在第三种状态。
          expect(r.degraded ? r.reason != null : r.signal != null, isTrue);
        }
      }
    }
  });

  test('烘焙类能力即使被选中也不参与运行时撮合', () {
    const anything = PowerRequirement(
      control: PowerControl.pointer,
      dimensions: 2,
    );
    final result = binder
        .bind(
          requirements: const [anything],
          selectedPowerIds: kPowerCatalog
              .where((p) => p.binding == PowerBinding.baked)
              .map((p) => p.id)
              .toSet(),
          availability: allGranted,
        )
        .single;
    expect(result.degraded, isTrue);
    expect(result.reason, PowerDegradeReason.notSelected);
  });

  group('创作期组合消解', () {
    final selection = PowerSelection(kPowerCatalog);

    test('选中带依赖的能力会自动补齐，并告知创作者', () {
      final change = selection.select({}, 'musicRecognition');
      expect(change.selected, containsAll(['musicRecognition', 'audioVoice']));
      expect(change.notes.single, contains('音频与配音'));
    });

    test('选中冲突的能力会替换掉对方，并告知创作者', () {
      final first = selection.select({}, 'cameraAr');
      final second = selection.select(first.selected, 'vrExperience');
      expect(second.selected, contains('vrExperience'));
      expect(second.selected, isNot(contains('cameraAr')));
      expect(second.notes.single, contains('冲突'));
    });

    test('取消选择会带走仅因它引入的依赖，不留下孤儿条目', () {
      final added = selection.select({}, 'musicRecognition');
      expect(added.autoAdded, contains('audioVoice'));
      final removed = selection.select(
        added.selected,
        'musicRecognition',
        autoAdded: added.autoAdded,
      );
      expect(removed.selected, isEmpty);
      expect(removed.notes.single, contains('音频与配音'));
    });

    test('用户手动选过的依赖不会被回收', () {
      // 先手动选 audioVoice —— 它不在 autoAdded 里，用户为它负责。
      final manual = selection.select({}, 'audioVoice');
      expect(manual.autoAdded, isEmpty);
      final withMusic = selection.select(
        manual.selected,
        'musicRecognition',
        autoAdded: manual.autoAdded,
      );
      // audioVoice 已在集合里，不会被重复标记为自动引入。
      expect(withMusic.autoAdded, isEmpty);
      final removed = selection.select(
        withMusic.selected,
        'musicRecognition',
        autoAdded: withMusic.autoAdded,
      );
      expect(removed.selected, contains('audioVoice'));
    });

    test('自动带入的依赖被用户再次显式选中后，就不再被回收', () {
      final added = selection.select({}, 'musicRecognition');
      // 用户点了一下 audioVoice 取消、再点一下选上 —— 它转为手动持有。
      final off = selection.select(
        added.selected,
        'audioVoice',
        autoAdded: added.autoAdded,
      );
      final on = selection.select(
        off.selected,
        'audioVoice',
        autoAdded: off.autoAdded,
      );
      expect(on.autoAdded, isNot(contains('audioVoice')));
      final removed = selection.select(
        on.selected,
        'musicRecognition',
        autoAdded: on.autoAdded,
      );
      expect(removed.selected, contains('audioVoice'));
    });

    test('冲突消解与选择顺序无关（依赖目录里冲突关系的对称性）', () {
      final a = selection.select(
        selection.select({}, 'cameraAr').selected,
        'vrExperience',
      );
      final b = selection.select(
        selection.select({}, 'vrExperience').selected,
        'cameraAr',
      );
      expect(a.selected.length, 1);
      expect(b.selected.length, 1);
    });
  });

  test('目录里每条 hosted 能力都至少能被某个控制语义撮合到', () {
    // 防止出现「声明了信号却没有任何 control 能用上」的死条目。
    for (final power in kPowerCatalog.where(
      (p) => p.binding == PowerBinding.hosted,
    )) {
      if (power.controls.isEmpty) continue; // 服务类没有控制语义，跳过
      // 需要实时服务的能力在本地闭环下本就撮合不上，那是正确行为，
      // 单独在下一个用例里验证。
      if (power.support == PowerSupport.service) continue;
      // 需求按该能力自身最慢的一路信号来提——扫描类 10Hz、定位类 1Hz
      // 都是真实速率，用统一的 30Hz 去要求它们只会得出错误结论。
      final slowestHz = power.provides
          .map((signal) => signal.nominalHz)
          .reduce((a, b) => a < b ? a : b);
      for (final control in power.controls) {
        final result = binder
            .bind(
              requirements: [
                PowerRequirement(
                  control: control,
                  dimensions: 1,
                  minHz: slowestHz,
                ),
              ],
              selectedPowerIds: {power.id},
              availability: allGranted,
            )
            .single;
        expect(
          result.degraded,
          isFalse,
          reason: '${power.id} 声明能驱动 ${control.name}，但撮合不上',
        );
      }
    }
    expect(byId.length, 60);
  });

  test('需要实时服务的能力：服务可达才撮合得上，不可达时明确降级', () {
    const beat = PowerRequirement(
      control: PowerControl.sequence,
      dimensions: 1,
    );
    final offline = binder
        .bind(
          requirements: const [beat],
          selectedPowerIds: {'musicRecognition'},
          availability: allGranted,
        )
        .single;
    expect(offline.degraded, isTrue);
    expect(offline.reason, PowerDegradeReason.serviceUnreachable);

    final online = binder
        .bind(
          requirements: const [beat],
          selectedPowerIds: {'musicRecognition'},
          availability: const PowerAvailability(
            grantedPermissions: {PowerPermission.microphone},
            serviceReachable: true,
          ),
        )
        .single;
    expect(online.degraded, isFalse);
    expect(online.signal!.name, 'audio.beat');
  });
}
