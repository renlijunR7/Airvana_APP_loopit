/// Power 撮合器。
///
/// 这是「即插即用」真正发生的地方。它替代的是
/// `assets/runner/sensor-interactions-v1.js` 里那张以 gameKey 为索引的
/// `PROFILES` 硬编码表——那张表每接一个游戏就要手写一行，等于把能力
/// 绑死在具体游戏上。
///
/// 撮合器把它倒过来：能力声明自己产出什么信号、能驱动哪些控制语义
/// （[PowerDescriptor.provides] / [PowerDescriptor.controls]），游戏声明
/// 自己需要什么样的输入（[PowerRequirement]），撮合器负责配对、按参数
/// 适配、配不上就降级。新增能力不用改游戏，新增游戏不用改能力。
///
/// 撮合**永不抛异常、永不返回空**：每条需求要么拿到一个可用绑定，
/// 要么拿到一个降级绑定。作品不会因为某个能力不可用就起不来，
/// 也不会悬在那里等一个永远不来的信号。
library;

import 'power_capability.dart';
import 'power_catalog.dart';

/// 能力在当前设备上的可用性。由宿主在撮合前查询并填入。
///
/// 把它作为入参而不是让撮合器自己去查，是为了让这一层保持纯函数——
/// 可以在单元测试里穷举「权限被拒」「传感器缺失」「服务未接入」这些
/// 分支，而不需要真机。
class PowerAvailability {
  const PowerAvailability({
    required this.grantedPermissions,
    this.unavailablePowerIds = const {},
    this.serviceReachable = false,
  });

  /// 宿主已经拿到的系统权限。
  final Set<PowerPermission> grantedPermissions;

  /// 明确不可用的能力（传感器缺失、能力被下架、机型不支持）。
  final Set<String> unavailablePowerIds;

  /// 实时服务是否可达。本地闭环下恒为 false。
  final bool serviceReachable;

  bool allows(PowerDescriptor power) {
    if (unavailablePowerIds.contains(power.id)) return false;
    if (power.support == PowerSupport.service && !serviceReachable) return false;
    for (final permission in power.permissions) {
      if (!grantedPermissions.contains(permission)) return false;
    }
    return true;
  }
}

/// 撮合失败的原因。降级时原样透给用户看，所以措辞要说明「还能怎么玩」。
enum PowerDegradeReason {
  /// 创作者没有选择任何能提供该控制语义的能力。
  notSelected,

  /// 选了，但系统权限没拿到。
  permissionDenied,

  /// 选了，但设备不具备该传感器，或能力已下架。
  unavailable,

  /// 选了，但实时服务不可达（本地闭环的常态）。
  serviceUnreachable,

  /// 信号规格达不到游戏声明的下限（采样率不够等）。
  specMismatch,
}

extension PowerDegradeReasonLabel on PowerDegradeReason {
  String get label => switch (this) {
    PowerDegradeReason.notSelected => '未选择对应能力',
    PowerDegradeReason.permissionDenied => '系统权限未授予',
    PowerDegradeReason.unavailable => '设备不支持或能力不可用',
    PowerDegradeReason.serviceUnreachable => '实时服务未接入',
    PowerDegradeReason.specMismatch => '信号规格不满足要求',
  };
}

/// 一条需求的撮合结果。
class PowerBindingResult {
  const PowerBindingResult.bound({
    required this.requirement,
    required this.power,
    required this.signal,
  }) : degraded = false,
       reason = null,
       hint = '';

  const PowerBindingResult.degraded({
    required this.requirement,
    required this.reason,
    this.power,
    this.hint = '',
  }) : signal = null,
       degraded = true;

  final PowerRequirement requirement;

  /// 降级时可能为 null（压根没有候选能力）。
  final PowerDescriptor? power;
  final PowerSignal? signal;
  final bool degraded;
  final PowerDegradeReason? reason;

  /// 降级时给用户看的提示。取自 [PowerFallback.hint]。
  final String hint;

  /// 降级后游戏应当使用的控制语义。
  ///
  /// 注意它常常**等于**原来的 control——那表示「语义不变、信号源退化」，
  /// 例如倾斜转向退化成按住左右两侧，游戏拿到的仍然是 steer。
  PowerControl get effectiveControl =>
      degraded
          ? (power?.fallback?.control ?? requirement.control)
          : requirement.control;

  Map<String, dynamic> toJson() => {
    'control': effectiveControl.name,
    'degraded': degraded,
    if (power != null) 'powerId': power!.id,
    if (signal != null) 'signal': signal!.toJson(),
    if (reason != null) 'reason': reason!.name,
    if (hint.isNotEmpty) 'hint': hint,
  };
}

/// 纯逻辑的撮合器。不碰 IO，不碰平台，可在单元测试里穷举分支。
class PowerBinder {
  const PowerBinder({this.catalog});

  /// 默认用全量目录；测试里可以注入子集。
  final List<PowerDescriptor>? catalog;

  /// 把游戏的每条需求撮合到一个能力信号上。
  ///
  /// [selectedPowerIds] 是创作者在创作期选定的能力组合。只有被选中、
  /// 且当前可用的能力才参与撮合——这正是把创作期的选择接到运行时的那根线，
  /// 在此之前 `selectedPowerIds` 只流到草稿落盘就断了。
  List<PowerBindingResult> bind({
    required List<PowerRequirement> requirements,
    required Set<String> selectedPowerIds,
    required PowerAvailability availability,
  }) {
    final all = catalog ?? kPowerCatalog;
    final selected = all
        .where((power) => selectedPowerIds.contains(power.id))
        .where((power) => power.binding == PowerBinding.hosted)
        .toList(growable: false);

    return [
      for (final requirement in requirements)
        _bindOne(requirement, selected, availability),
    ];
  }

  PowerBindingResult _bindOne(
    PowerRequirement requirement,
    List<PowerDescriptor> selected,
    PowerAvailability availability,
  ) {
    // 候选 = 选中的、且声明能驱动这条控制语义的能力。
    final candidates = selected
        .where((power) => power.controls.contains(requirement.control))
        .toList(growable: false);

    if (candidates.isEmpty) {
      return PowerBindingResult.degraded(
        requirement: requirement,
        reason: PowerDegradeReason.notSelected,
      );
    }

    // 先在可用的候选里找规格达标的信号。
    PowerDescriptor? blockedBySpec;
    for (final power in candidates) {
      if (!availability.allows(power)) continue;
      final signal = _pickSignal(power, requirement);
      if (signal != null) {
        return PowerBindingResult.bound(
          requirement: requirement,
          power: power,
          signal: signal,
        );
      }
      blockedBySpec = power;
    }

    // 到这里说明没有可用且达标的候选。降级原因要指向**最具体**的那一个，
    // 这样用户看到的是「系统权限未授予」而不是笼统的「不可用」。
    if (blockedBySpec != null) {
      return PowerBindingResult.degraded(
        requirement: requirement,
        power: blockedBySpec,
        reason: PowerDegradeReason.specMismatch,
        hint: blockedBySpec.fallback?.hint ?? '',
      );
    }

    final blocked = candidates.first;
    final reason = _whyBlocked(blocked, availability);
    return PowerBindingResult.degraded(
      requirement: requirement,
      power: blocked,
      reason: reason,
      hint: blocked.fallback?.hint ?? '',
    );
  }

  PowerSignal? _pickSignal(
    PowerDescriptor power,
    PowerRequirement requirement,
  ) {
    for (final signal in power.provides) {
      // 维度要够用。多出来的维度由适配层丢弃（三维姿态取其中两维当平面指针
      // 是合理的），少了则无法合成。
      if (signal.dimensions < requirement.dimensions) continue;
      if (signal.nominalHz < requirement.minHz) continue;
      return signal;
    }
    return null;
  }

  PowerDegradeReason _whyBlocked(
    PowerDescriptor power,
    PowerAvailability availability,
  ) {
    if (availability.unavailablePowerIds.contains(power.id)) {
      return PowerDegradeReason.unavailable;
    }
    if (power.support == PowerSupport.service && !availability.serviceReachable) {
      return PowerDegradeReason.serviceUnreachable;
    }
    for (final permission in power.permissions) {
      if (!availability.grantedPermissions.contains(permission)) {
        return PowerDegradeReason.permissionDenied;
      }
    }
    return PowerDegradeReason.unavailable;
  }
}

/// 创作期的能力组合消解。
///
/// 原本这段逻辑内联在 `create_playable_screen.dart` 的 `setState` 里
/// （2313-2363 行），既无法单测，也无法被生成链路和运行时复用。
class PowerSelection {
  const PowerSelection(this.catalog);

  final List<PowerDescriptor> catalog;

  Map<String, PowerDescriptor> get _byId => {
    for (final power in catalog) power.id: power,
  };

  /// 选中/取消一条能力，自动补齐依赖、自动踢掉冲突项。
  ///
  /// [autoAdded] 记录哪些条目是被自动带进来的。没有这份来源追踪就无法
  /// 区分「用户自己选的 audioVoice」和「因为选了音乐识别才被带进来的
  /// audioVoice」——取消音乐识别时前者必须留下，后者应当一起清掉。
  ///
  /// 返回值里附带一份变更说明：自动改动别人的选择必须让创作者看见，
  /// 静默修改比不修改更糟。
  PowerSelectionChange select(
    Set<String> current,
    String powerId, {
    Set<String> autoAdded = const {},
  }) {
    final byId = _byId;
    final power = byId[powerId];
    if (power == null) {
      return PowerSelectionChange(
        selected: current,
        autoAdded: autoAdded,
        notes: const [],
      );
    }

    final next = {...current};
    final auto = {...autoAdded};
    final notes = <String>[];

    if (next.contains(powerId)) {
      next.remove(powerId);
      auto.remove(powerId);
      // 只回收「自动带进来、且已经没有别的在选项依赖它」的条目。
      // 用户手动选过的依赖不动。
      for (final id in power.dependencies) {
        if (!auto.contains(id)) continue;
        final stillNeeded = next.any(
          (other) => byId[other]?.dependencies.contains(id) ?? false,
        );
        if (stillNeeded) continue;
        if (next.remove(id)) {
          auto.remove(id);
          notes.add('已移除随「${power.title}」引入的「${byId[id]?.title ?? id}」');
        }
      }
      return PowerSelectionChange(
        selected: next,
        autoAdded: auto,
        notes: notes,
      );
    }

    for (final conflictId in power.conflicts) {
      if (next.remove(conflictId)) {
        auto.remove(conflictId);
        notes.add(
          '「${power.title}」与「${byId[conflictId]?.title ?? conflictId}」冲突，已替换',
        );
      }
    }
    for (final dependencyId in power.dependencies) {
      if (next.add(dependencyId)) {
        auto.add(dependencyId);
        notes.add(
          '「${power.title}」需要「${byId[dependencyId]?.title ?? dependencyId}」，已一并加入',
        );
      }
    }
    next.add(powerId);
    // 显式选中的条目不再算自动引入——用户从此为它负责。
    auto.remove(powerId);
    return PowerSelectionChange(selected: next, autoAdded: auto, notes: notes);
  }
}

class PowerSelectionChange {
  const PowerSelectionChange({
    required this.selected,
    required this.notes,
    this.autoAdded = const {},
  });

  final Set<String> selected;

  /// 其中哪些是被依赖关系自动带进来的。调用方要把它连同 [selected]
  /// 一起持久化，否则下一次取消选择时来源信息就丢了。
  final Set<String> autoAdded;

  final List<String> notes;
}
