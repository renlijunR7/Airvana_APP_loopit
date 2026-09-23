import 'package:airvana_mobile/features/shared/domain/power_capability.dart';
import 'package:airvana_mobile/features/shared/domain/power_catalog.dart';
import 'package:flutter_test/flutter_test.dart';

/// Power 目录的不变量。
///
/// 这些规则不是风格偏好，每一条都对应一个能把用户卡住的真实故障：
/// 没有降级方案的传感器能力会让作品停在「正在连接…」；把需要权限的能力
/// 标成烘焙会让它拿不到宿主的权限通道；依赖指向不存在的 id 会让自动补齐
/// 静默失效。所以放在测试里强制，而不是写进文档里指望别人记得。
void main() {
  final byId = {for (final power in kPowerCatalog) power.id: power};

  test('目录规模与唯一性', () {
    expect(kPowerCatalog.length, 58);
    expect(byId.length, kPowerCatalog.length, reason: 'Power id 必须唯一');
  });

  test('hosted 能力必须声明降级方案', () {
    for (final power in kPowerCatalog) {
      if (power.binding != PowerBinding.hosted) continue;
      expect(
        power.fallback,
        isNotNull,
        reason: '${power.id} 是运行时托管能力，必须有降级方案',
      );
      expect(
        power.fallback!.hint.trim(),
        isNotEmpty,
        reason: '${power.id} 的降级提示要告诉用户还能怎么玩',
      );
    }
  });

  test('需要系统权限的能力只能是 hosted', () {
    // 烘焙进作品代码的能力拿不到宿主的权限通道。真机上的表现是
    // WebView 层 grant 了、系统层没授权，Chromium 打不开设备，
    // 而这个失败不一定回流成 reject —— 作品会永久挂起。
    for (final power in kPowerCatalog) {
      if (power.permissions.isEmpty) continue;
      expect(
        power.binding,
        PowerBinding.hosted,
        reason: '${power.id} 声明了 ${power.permissions}，必须由宿主托管',
      );
    }
  });

  test('只有 hosted 能力能产出信号和控制语义', () {
    for (final power in kPowerCatalog) {
      if (power.binding == PowerBinding.hosted) continue;
      expect(power.provides, isEmpty, reason: '${power.id} 不是 hosted，不应产出信号');
      expect(power.actuators, isEmpty, reason: '${power.id} 不是 hosted，不应提供执行器');
      expect(power.controls, isEmpty, reason: '${power.id} 不是 hosted，不应声明控制语义');
    }
  });

  test('依赖与冲突必须指向目录内真实存在的能力', () {
    for (final power in kPowerCatalog) {
      for (final id in power.dependencies) {
        expect(byId.containsKey(id), isTrue, reason: '${power.id} 依赖了不存在的 $id');
        expect(id, isNot(power.id), reason: '${power.id} 不能依赖自己');
      }
      for (final id in power.conflicts) {
        expect(byId.containsKey(id), isTrue, reason: '${power.id} 冲突指向不存在的 $id');
        expect(id, isNot(power.id), reason: '${power.id} 不能与自己冲突');
      }
    }
  });

  test('冲突关系必须对称', () {
    // 单向声明会让消解结果取决于用户的选择顺序：先选 A 再选 B 会踢掉 A，
    // 反过来却不会。
    for (final power in kPowerCatalog) {
      for (final id in power.conflicts) {
        expect(
          byId[id]!.conflicts,
          contains(power.id),
          reason: '${power.id} 声明与 $id 冲突，但 $id 没有回指',
        );
      }
    }
  });

  test('依赖图无环', () {
    final visiting = <String>{};
    final done = <String>{};
    void walk(String id, List<String> path) {
      if (done.contains(id)) return;
      expect(
        visiting.contains(id),
        isFalse,
        reason: '依赖成环：${[...path, id].join(' → ')}',
      );
      visiting.add(id);
      for (final next in byId[id]!.dependencies) {
        walk(next, [...path, id]);
      }
      visiting.remove(id);
      done.add(id);
    }

    for (final power in kPowerCatalog) {
      walk(power.id, const []);
    }
  });

  test('信号维度与量纲合法', () {
    for (final power in kPowerCatalog) {
      for (final signal in power.provides) {
        expect(
          signal.dimensions,
          inInclusiveRange(1, 3),
          reason: '${power.id}/${signal.name} 维度越界',
        );
        expect(
          signal.min,
          lessThan(signal.max),
          reason: '${power.id}/${signal.name} 值域颠倒',
        );
        expect(
          signal.nominalHz,
          greaterThan(0),
          reason: '${power.id}/${signal.name} 采样率必须为正',
        );
      }
    }
  });

  test('参数默认值落在值域内', () {
    for (final power in kPowerCatalog) {
      for (final parameter in power.parameters) {
        expect(
          parameter.defaultValue,
          inInclusiveRange(parameter.min, parameter.max),
          reason: '${power.id}/${parameter.name} 默认值越界',
        );
      }
    }
  });

  test('运行时可插拔的能力只有 8 条，其余走烘焙或流程', () {
    // 这个比例本身就是结论：48 条能力里绝大多数无法事后插拔。
    // 数字变化时应当是有意识的架构决策，而不是顺手加了个条目。
    final byBinding = <PowerBinding, int>{};
    for (final power in kPowerCatalog) {
      byBinding.update(power.binding, (v) => v + 1, ifAbsent: () => 1);
    }
    expect(byBinding[PowerBinding.hosted], 18);
    expect(byBinding[PowerBinding.workflow], 8);
    expect(byBinding[PowerBinding.baked], 32);
  });

  test('每条 hosted 能力都必须说明交付方式', () {
    for (final power in kPowerCatalog) {
      if (power.binding != PowerBinding.hosted) {
        expect(power.delivery, isEmpty, reason: '${power.id} 不是 hosted，不应声明交付方式');
        continue;
      }
      expect(
        power.delivery,
        isNotEmpty,
        reason: '${power.id} 没说明靠容器边界还是靠宿主推信号',
      );
    }
  });

  test('对不可改动的第三方游戏生效的，只有容器边界那一档', () {
    // assets/arcade 下 15 个游戏在 manifest.json 里被明确承诺不改动。
    // 能用在它们身上的能力，必须是「作品本来就在调标准 Web API、宿主只换答复」
    // 那一类 —— 需要作品主动订阅的能力对黑盒不成立。
    final sealed = kPowerCatalog.where((p) => p.worksOnSealedGames).map((p) => p.id).toSet();
    expect(sealed, {
      'cameraAr', 'microphoneVoice', 'gestureVision', 'motionHaptic',
      'devicePosture', 'faceExpression', 'bodyPose', 'environmentScan',
      'geoLocation', 'compassHeading',
    });
    // 反向确认：WebView 里根本没有对应 Web API 的，一定不在这张表里。
    for (final id in ['stepActivity', 'proximityLink', 'ambientSensing', 'multiplayer', 'kolTwin']) {
      expect(sealed, isNot(contains(id)), reason: '$id 需要作品配合，对黑盒不成立');
    }
  });

  test('需要实时服务的能力在本地只做展示', () {
    final serviceIds = kPowerCatalog
        .where((power) => power.support == PowerSupport.service)
        .map((power) => power.id)
        .toList();
    expect(serviceIds, ['musicRecognition', 'chatDm', 'multiplayer', 'kolTwin']);
    for (final id in serviceIds) {
      expect(byId[id]!.isDisplayOnlyLocally, isTrue);
    }
  });
}
