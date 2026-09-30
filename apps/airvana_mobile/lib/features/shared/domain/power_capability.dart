/// Power 能力的领域模型。
///
/// 这一层存在的理由，是把原本散在 `create_playable_screen.dart`（6000 行的
/// presentation 文件）里的能力目录，从「一串用来画卡片的静态数据」
/// 升级成「运行时能据以撮合的契约」。
///
/// 在此之前，仓库里已经有两套各自成立、但互不相通的东西：
///
/// 1. 创作侧的 48 个 Power —— 有分类、有 `support` 徽章、有依赖/冲突字段，
///    但 `selectedPowerIds` 一路只流到草稿落盘，`features/runtime/` 下零引用。
/// 2. 运行侧的 `assets/runner/sensor-interactions-v1.js` —— 有 `has/profile/
///    list/mount` 这样完整的能力生命周期，但它的 `PROFILES` 以 gameKey 为索引，
///    等于把能力**绑死在具体游戏上**：每接一个新游戏就得手写一行。
///
/// 所以「即插即用」的本质动作是把那张表倒过来：
///
/// ```text
/// 旧：gameKey ──→ {kind, control, fallback}      每个游戏硬编码一行
/// 新：Power ──供给──→ [Signal]                    能力声明自己产出什么
///     Game ──需求──→ [Requirement]                游戏声明自己要什么
///                └──→ PowerBinder 撮合 + 适配     中间层负责映射与降级
/// ```
///
/// 倒过来之后，新增一个能力不需要改游戏，新增一个游戏不需要改能力。
library;

import 'package:flutter/foundation.dart';

/// 能力的实现层级。
///
/// 这个维度原本就存在（`_PowerSupport`），但当时只带 `label` 和 `color`
/// 两个字段，实际只用来画徽章——正确的分类被编码成了 UI 样式。
/// 这里把它恢复成真正的架构分层轴。
enum PowerSupport {
  /// 可生成原型：AI 生成期直接产出代码，运行时不依赖宿主。
  generatable('可生成原型'),

  /// 前端原型：纯客户端逻辑，无需权限也无需服务端。
  prototype('前端原型'),

  /// 需设备授权：必须经过宿主的权限通道才能拿到信号源。
  permission('需设备授权'),

  /// 需实时服务：依赖服务端，本地只能做展示。
  service('需实时服务'),

  /// 需审批：走审核流程，属于运营动作而非运行时能力。
  approval('需审批');

  const PowerSupport(this.label);

  final String label;
}

/// 能力在运行时的绑定方式——决定它「能不能插」，以及怎么插。
///
/// `support` 回答的是「做出来要付出什么代价」，`binding` 回答的是
/// 「运行时它以什么形态存在」。两者正交：同为 `prototype` 的能力，
/// 有的烘焙进代码，有的需要宿主在运行时喂信号。
enum PowerBinding {
  /// 烘焙：生成期写进作品代码，运行时没有宿主参与。
  ///
  /// 绝大多数内容类、叙事类能力属于这一档。它们不需要契约，
  /// 也因此**无法**在已发布的作品上事后插拔。
  baked,

  /// 宿主托管：运行时由宿主提供信号源或服务，作品按契约订阅。
  ///
  /// 这是唯一真正「即插即用」的一档。传感器类能力都在这里。
  hosted,

  /// 流程：只在创作、审核、发布、运营链路里生效，不进运行时。
  workflow,
}

/// 宿主把能力交付给作品的方式。这是「即插即用」到底能不能成立的分水岭。
///
/// 区分来自一个实测事实：`game_webview_controller.dart` 里的
/// `createGameWebViewController()` 对 manifest.json 里那 13 个**刻意不改动**的第三方作品
/// 零改动生效。它能生效不是因为做了什么注入，而是因为**游戏本来就在调
/// `getUserMedia` 和 `<audio>`，宿主只是换了答复**。
///
/// 把这一层和「宿主主动推信号」分开，才能如实回答「哪些能力能用在那些动不了的
/// 动不了的游戏上」——答案是 [container] 的那些，而且今天就能用。
enum PowerDelivery {
  /// 容器边界：宿主拦截并代答作品本就会调用的标准 Web API
  /// （权限、媒体自动播放、Range 请求、存储配额）。
  ///
  /// 作品**不需要知道宿主的存在**，因此对黑盒游戏同样生效。代价是能力被
  /// 限制在「浏览器已经有的东西」范围内。
  container,

  /// 宿主信号：宿主计算出归一化信号并推给作品，作品必须按契约订阅。
  ///
  /// 能力上限高得多（宿主可以跑原生模型、访问 WebView 拿不到的传感器），
  /// 但要求作品配合，对不可改动的第三方包**不成立**。
  signal,
}

/// 系统权限。宿主必须在**信号真正被使用前**申请，且必须保证有结论。
///
/// 这条规则是有代价换来的：Android 上 WebView 的 `grant()` 只放行网页层，
/// 宿主 App 自己没拿到运行时授权时 Chromium 打不开设备，而这个失败**不一定**
/// 回流成 `getUserMedia` 的 reject——真机上表现为 promise 永不 settle，
/// 界面永久卡在「正在连接…」。所以契约里把「必须有结论」写成硬约束。
enum PowerPermission {
  camera,
  microphone,
  motion,
  location,
  notification,

  /// 计步与运动数据。Android 是 ACTIVITY_RECOGNITION，iOS 是 CoreMotion 的
  /// 健身数据授权——和 [motion] 的传感器授权不是同一个。
  activityRecognition,

  /// 近场设备发现（NFC / 蓝牙 / UWB）。Android 12+ 拆成了 NEARBY_WIFI_DEVICES
  /// 与 BLUETOOTH_SCAN，iOS 需要 NFC / 蓝牙的单独描述。
  nearbyDevices,
}

/// 能力产出的一路信号。
///
/// 信号是**归一化**的：能力只负责把设备原始数据整理成稳定量纲的数值流，
/// 不关心游戏拿它当方向盘还是当准星。那是 [PowerControl] 的事。
@immutable
class PowerSignal {
  const PowerSignal({
    required this.name,
    required this.dimensions,
    this.min = -1.0,
    this.max = 1.0,
    this.nominalHz = 60,
    this.unit = 'normalized',
  });

  /// 信号名，形如 `orientation.tilt`、`hand.indexTip`、`audio.level`。
  final String name;

  /// 维度数：1 = 标量（音量），2 = 平面坐标（指尖），3 = 空间向量（加速度）。
  final int dimensions;

  final double min;
  final double max;

  /// 标称采样率，用于和游戏声明的 [PowerRequirement.minHz] 做匹配。
  final int nominalHz;

  final String unit;

  Map<String, dynamic> toJson() => {
    'name': name,
    'dimensions': dimensions,
    'min': min,
    'max': max,
    'nominalHz': nominalHz,
    'unit': unit,
  };
}

/// 能力的执行器——方向和 [PowerSignal] 相反。
///
/// 信号是宿主推给作品的输入，执行器是作品调用宿主去做一件事：震动、闪光、
/// 播放触觉图案。把两者分开是因为它们的失败语义不同：信号拿不到要降级到
/// 另一种输入，执行器拿不到**静默忽略即可**——没有震动的作品仍然完整，
/// 没有输入的作品则不可玩。
@immutable
class PowerActuator {
  const PowerActuator({required this.name, required this.description});

  /// 形如 `haptic.impact`、`haptic.pattern`、`torch.flash`。
  final String name;
  final String description;

  Map<String, dynamic> toJson() => {'name': name, 'description': description};
}

/// 游戏侧的控制语义。
///
/// 取值直接沿用 `sensor-interactions-v1.js` 里 `PROFILES.control` 已经跑通的
/// 那套词汇，再按 arcade 语料补齐。保持一致是为了让既有的 9 个游戏能平移过来，
/// 而不是另起一套让两边都要维护。
enum PowerControl {
  /// 左右切换跑道（离散）。
  lane,

  /// 连续转向（模拟量）。
  steer,

  /// 平面瞄准/移动。
  aim,

  /// 摇晃触发（脉冲）。
  shuffle,

  /// 序列点亮（阈值触发）。
  sequence,

  /// 平面指针——切水果的刀、画笔、拖拽。
  pointer,

  /// 单点触发。
  trigger,
}

/// 降级方案。**必填**，没有降级的能力不允许进目录。
///
/// 理由同 [PowerPermission]：任何依赖设备和权限的能力都必然有失败路径，
/// 失败路径没想清楚，用户看到的就是一个卡死的界面。
@immutable
class PowerFallback {
  const PowerFallback({
    required this.hint,
    this.control,
    this.timeout = const Duration(seconds: 12),
  });

  /// 降级后改用哪种控制方式。通常是触摸。
  ///
  /// 注意它可以和原来的 control **相同** —— 那表示「语义不变、信号源降级」，
  /// 例如倾斜转向退化成按住左右两侧，游戏拿到的仍然是 [PowerControl.steer]。
  /// 服务类能力没有控制语义可言，留空即可。
  final PowerControl? control;

  /// 给用户看的一句话，说明「还能怎么玩」，而不是「出错了」。
  final String hint;

  /// 等待上限。超过就走降级——宿主不答复时不能让作品无限期悬着。
  final Duration timeout;

  Map<String, dynamic> toJson() => {
    if (control != null) 'control': control!.name,
    'hint': hint,
    'timeoutMs': timeout.inMilliseconds,
  };
}

/// 可调参数。灵敏度、阈值、死区之类。
@immutable
class PowerParameter {
  const PowerParameter({
    required this.name,
    required this.defaultValue,
    required this.min,
    required this.max,
    this.label = '',
  });

  final String name;
  final double defaultValue;
  final double min;
  final double max;
  final String label;

  Map<String, dynamic> toJson() => {
    'name': name,
    'default': defaultValue,
    'min': min,
    'max': max,
  };
}

/// 一条能力的完整描述。
@immutable
class PowerDescriptor {
  const PowerDescriptor({
    required this.id,
    required this.category,
    required this.title,
    required this.description,
    required this.support,
    required this.binding,
    this.version = '1.0.0',
    this.permissions = const [],
    this.delivery = const {},
    this.provides = const [],
    this.actuators = const [],
    this.controls = const [],
    this.parameters = const [],
    this.dependencies = const [],
    this.conflicts = const [],
    this.fallback,
    this.quickAllowed = true,
    this.visibleInCatalog = true,
  }) : assert(
         binding != PowerBinding.hosted || fallback != null,
         '运行时托管的能力必须声明降级方案',
       );

  // 另一条不变量——「需要权限的能力只能是 hosted」——没法写成构造器断言，
  // 因为 const 求值不允许在列表上调用方法。它由 test/power_catalog_test.dart
  // 在 CI 上强制，效果等价且更早暴露。

  final String id;
  final String category;
  final String title;
  final String description;
  final PowerSupport support;
  final PowerBinding binding;
  final String version;

  final List<PowerPermission> permissions;

  /// 本能力支持的交付方式。同一条能力往往两种都支持：
  /// 自带识别代码的作品走 [PowerDelivery.container]，
  /// 不自带的走 [PowerDelivery.signal] 由宿主代劳。
  final Set<PowerDelivery> delivery;

  /// 本能力产出的归一化信号。只有 [PowerBinding.hosted] 才会非空。
  final List<PowerSignal> provides;

  /// 本能力提供的执行器。作品调用它们去驱动设备，方向与 [provides] 相反。
  final List<PowerActuator> actuators;

  /// 本能力能驱动的控制语义。撮合时用它和游戏需求求交集。
  final List<PowerControl> controls;

  final List<PowerParameter> parameters;
  final List<String> dependencies;
  final List<String> conflicts;

  /// 降级方案。hosted 能力必填（构造器断言保证）。
  final PowerFallback? fallback;

  final bool quickAllowed;
  final bool visibleInCatalog;

  /// 是否能在运行时插拔。
  bool get isRuntimePluggable => binding == PowerBinding.hosted;

  /// 是否对「不可改动的第三方游戏包」也生效。
  ///
  /// 这是判断一条能力能不能用在 manifest.json 承诺不改动的那 13 个作品上的
  /// 唯一标准（arcade 目录下另有 4 个自研件，允许改包）：
  /// 只有容器边界层的能力不要求作品配合。
  bool get worksOnSealedGames => delivery.contains(PowerDelivery.container);

  /// 本地是否只能做展示——需要服务端的能力在本地闭环里不具备真实行为。
  bool get isDisplayOnlyLocally => support == PowerSupport.service;

  Map<String, dynamic> toJson() => {
    'id': id,
    'category': category,
    'title': title,
    'version': version,
    'support': support.name,
    'binding': binding.name,
    'permissions': permissions.map((e) => e.name).toList(),
    'delivery': delivery.map((e) => e.name).toList(),
    'provides': provides.map((e) => e.toJson()).toList(),
    'actuators': actuators.map((e) => e.toJson()).toList(),
    'controls': controls.map((e) => e.name).toList(),
    'parameters': parameters.map((e) => e.toJson()).toList(),
    'dependencies': dependencies,
    'conflicts': conflicts,
    if (fallback != null) 'fallback': fallback!.toJson(),
  };
}

/// 游戏侧的能力需求声明。
///
/// 这是撮合的另一半。游戏说「我要一路二维指针，至少 30Hz，容忍 80ms 延迟」，
/// 而不是说「我要手势识别」——后者会把游戏和具体能力绑死，
/// 正是 `PROFILES` 以 gameKey 索引所犯的错。
@immutable
class PowerRequirement {
  const PowerRequirement({
    required this.control,
    required this.dimensions,
    this.minHz = 30,
    this.maxLatency = const Duration(milliseconds: 120),
    this.optional = true,
  });

  final PowerControl control;
  final int dimensions;
  final int minHz;
  final Duration maxLatency;

  /// 是否可选。可选需求匹配不上时游戏照常运行，只是少一种玩法。
  /// 必需需求匹配不上时必须走降级，而不是让作品起不来。
  final bool optional;

  Map<String, dynamic> toJson() => {
    'control': control.name,
    'dimensions': dimensions,
    'minHz': minHz,
    'maxLatencyMs': maxLatency.inMilliseconds,
    'optional': optional,
  };
}

/// 撮合结果。
@immutable
class PowerMatch {
  const PowerMatch({
    required this.requirement,
    required this.power,
    required this.signal,
    required this.degraded,
    this.reason = '',
  });

  final PowerRequirement requirement;
  final PowerDescriptor power;
  final PowerSignal signal;

  /// 是否是降级绑定（能力不可用，走了 fallback）。
  final bool degraded;
  final String reason;
}
