/// Airvana 的 Power 能力目录。
///
/// 这份目录原先内联在 `create_playable_screen.dart`（6014 行）里，字段只够画卡片：
/// 分类、标题、描述、图标，外加一个只带 label 和 color 的 `_PowerSupport` 徽章。
/// 搬到 domain 层并补齐契约字段之后，它同时服务三个消费方：
///
/// * 创作侧——能力选择、依赖自动补齐、冲突自动消解；
/// * 运行侧——[PowerBinding.hosted] 的条目会被宿主注册成真实信号源；
/// * 审核侧——[PowerSupport.approval] 与 [PowerSupport.service] 的条目在本地
///   闭环里只做展示，不伪造行为。
///
/// 目录里真正能在运行时插拔的只有 [PowerBinding.hosted] 那一档。其余烘焙
/// 进生成代码，或属于创作与运营流程。把这个比例摆在类型系统里，比写在文档里
/// 更难被忽略——[PowerDescriptor] 的构造器断言会拒绝「要权限却不是 hosted」和
/// 「hosted 却没有降级方案」这两类声明。
library;

import 'power_capability.dart';

/// 全部能力。规模由 `test/power_catalog_test.dart` 断言，改动数量时
/// 那条测试会红——数字写在注释里守不住，写在断言里才守得住。
const List<PowerDescriptor> kPowerCatalog = <PowerDescriptor>[
    PowerDescriptor(
      id: 'textTypography',
      category: 'content',
      title: '文本与字体',
      description: '文本结构、文案层级与品牌字体',
      support: PowerSupport.generatable,
      binding: PowerBinding.baked,
    ),
    PowerDescriptor(
      id: 'imageGif',
      category: 'content',
      title: '图片与 GIF',
      description: '图片序列、GIF 与视觉反馈',
      support: PowerSupport.generatable,
      binding: PowerBinding.baked,
    ),
    PowerDescriptor(
      id: 'video',
      category: 'content',
      title: '视频',
      description: '视频片段、分支播放与行动节点',
      support: PowerSupport.generatable,
      binding: PowerBinding.baked,
    ),
    PowerDescriptor(
      id: 'audioVoice',
      category: 'content',
      title: '音频与配音',
      description: '音频、音乐、配音与静音模式',
      support: PowerSupport.prototype,
      binding: PowerBinding.baked,
    ),
    PowerDescriptor(
      id: 'themeEffects',
      category: 'content',
      title: '主题与特效',
      description: '主题、粒子、转场和状态动效',
      support: PowerSupport.prototype,
      binding: PowerBinding.baked,
    ),
    PowerDescriptor(
      id: 'coverLocale',
      category: 'content',
      title: '封面与多语言',
      description: '封面、标题与多语言版本管理',
      support: PowerSupport.generatable,
      binding: PowerBinding.baked,
    ),
    PowerDescriptor(
      id: 'spatialAssets',
      category: 'content',
      title: '2D / 3D / AR 素材',
      description: '2D、3D 与 AR 素材占位和授权',
      support: PowerSupport.prototype,
      binding: PowerBinding.baked,
    ),
    PowerDescriptor(
      id: 'touchControls',
      category: 'mechanics',
      title: '点击、滑动与长按',
      description: '三类基础触控输入与反馈',
      support: PowerSupport.generatable,
      binding: PowerBinding.baked,
    ),
    PowerDescriptor(
      id: 'dragPuzzle',
      category: 'mechanics',
      title: '拖拽与拼图',
      description: '拖拽、排序、匹配与拼图',
      support: PowerSupport.generatable,
      binding: PowerBinding.baked,
    ),
    PowerDescriptor(
      id: 'challenge',
      category: 'mechanics',
      title: '互动挑战',
      description: '问答、收集与即时反馈',
      support: PowerSupport.generatable,
      binding: PowerBinding.baked,
    ),
    PowerDescriptor(
      id: 'timerScore',
      category: 'mechanics',
      title: '计时与计分',
      description: '倒计时、得分规则和结果卡',
      support: PowerSupport.generatable,
      binding: PowerBinding.baked,
    ),
    PowerDescriptor(
      id: 'failureRetry',
      category: 'mechanics',
      title: '失败与重试',
      description: '补齐失败、退出与重新开始状态',
      support: PowerSupport.generatable,
      binding: PowerBinding.baked,
      visibleInCatalog: false,
    ),
    PowerDescriptor(
      id: 'levelSave',
      category: 'mechanics',
      title: '关卡与进度存档',
      description: '关卡、检查点与继续体验',
      support: PowerSupport.prototype,
      binding: PowerBinding.baked,
    ),
    PowerDescriptor(
      id: 'simulatorIdle',
      category: 'mechanics',
      title: '模拟器与放置经营',
      description: '模拟器、放置和经营循环',
      support: PowerSupport.prototype,
      binding: PowerBinding.baked,
    ),
    PowerDescriptor(
      id: 'strategyPhysics',
      category: 'mechanics',
      title: '策略、物理与 ASMR',
      description: '策略选择、物理反馈与 ASMR',
      support: PowerSupport.prototype,
      binding: PowerBinding.baked,
    ),
    PowerDescriptor(
      id: 'kolTwin',
      category: 'narrative',
      title: 'KOL 智能分身',
      description: '创作者分身：承载创作者记忆与玩家记忆，代为互动并绑定站内钱包口径',
      support: PowerSupport.service,
      binding: PowerBinding.hosted,
      // 交付：实时服务 —— 只能由宿主推送，对不可改动的作品不成立。
      delivery: {PowerDelivery.signal},
      dependencies: ['personaLibrary', 'stateMemory'],
      fallback: PowerFallback(hint: '实时服务未接入时按本地已有的人设与记忆展示，不伪造对话与收益', timeout: Duration(seconds: 12)),
    ),
    PowerDescriptor(
      id: 'personaLibrary',
      category: 'narrative',
      title: '角色库与 Persona',
      description: '角色库、Persona 和身份设定',
      support: PowerSupport.generatable,
      binding: PowerBinding.baked,
    ),
    PowerDescriptor(
      id: 'npc',
      category: 'narrative',
      title: 'NPC 交互',
      description: 'NPC 反馈、任务引导与有限行为',
      support: PowerSupport.prototype,
      binding: PowerBinding.baked,
    ),
    PowerDescriptor(
      id: 'worldRelations',
      category: 'narrative',
      title: '世界观与角色关系',
      description: '世界观、阵营与角色关系',
      support: PowerSupport.generatable,
      binding: PowerBinding.baked,
    ),
    PowerDescriptor(
      id: 'questBranch',
      category: 'narrative',
      title: '任务与分支剧情',
      description: '任务目标、选择和分支剧情',
      support: PowerSupport.generatable,
      binding: PowerBinding.baked,
    ),
    PowerDescriptor(
      id: 'dialogueStyle',
      category: 'narrative',
      title: '对话风格',
      description: '台词语气、节奏与安全表达',
      support: PowerSupport.generatable,
      binding: PowerBinding.baked,
    ),
    PowerDescriptor(
      id: 'stateMemory',
      category: 'narrative',
      title: '状态、记忆与表达',
      description: '角色状态、记忆、表情与声音',
      support: PowerSupport.prototype,
      binding: PowerBinding.baked,
    ),
    PowerDescriptor(
      id: 'cameraAr',
      category: 'sensing',
      title: '摄像头与 AR',
      description: '摄像头、AR 识别与触控降级',
      support: PowerSupport.permission,
      binding: PowerBinding.hosted,
      // 交付：getUserMedia —— 作品自带代码即可，宿主也能代劳。
      delivery: {PowerDelivery.container, PowerDelivery.signal},
      permissions: [PowerPermission.camera],
      provides: [
        PowerSignal(name: 'camera.anchor', dimensions: 2, min: 0.0, max: 1.0, nominalHz: 30),
        PowerSignal(name: 'camera.presence', dimensions: 1, min: 0.0, max: 1.0, nominalHz: 30),
      ],
      controls: [PowerControl.aim, PowerControl.pointer],
      parameters: [
        PowerParameter(name: 'smoothing', defaultValue: 0.5, min: 0.0, max: 1.0, label: '平滑'),
      ],
      conflicts: ['vrExperience'],
      fallback: PowerFallback(hint: '触屏拖动仍可取景与放置', control: PowerControl.pointer, timeout: Duration(seconds: 12)),
    ),
    PowerDescriptor(
      id: 'microphoneVoice',
      category: 'sensing',
      title: '麦克风与声控',
      description: '麦克风、声控与文字替代',
      support: PowerSupport.permission,
      binding: PowerBinding.hosted,
      // 交付：getUserMedia + WebAudio —— 作品自带代码即可，宿主也能代劳。
      delivery: {PowerDelivery.container, PowerDelivery.signal},
      permissions: [PowerPermission.microphone],
      provides: [
        PowerSignal(name: 'audio.level', dimensions: 1, min: 0.0, max: 1.0, nominalHz: 60),
        PowerSignal(name: 'audio.pitch', dimensions: 1, min: 0.0, max: 1.0, nominalHz: 60),
      ],
      controls: [PowerControl.sequence, PowerControl.trigger],
      parameters: [
        PowerParameter(name: 'threshold', defaultValue: 0.35, min: 0.05, max: 0.95, label: '触发阈值'),
        PowerParameter(name: 'cooldownMs', defaultValue: 250.0, min: 0.0, max: 2000.0, label: '冷却'),
      ],
      fallback: PowerFallback(hint: '点按仍可触发，无需吹气', control: PowerControl.trigger, timeout: Duration(seconds: 12)),
    ),
    PowerDescriptor(
      id: 'musicRecognition',
      category: 'sensing',
      title: '音乐识别',
      description: '音乐识别、节奏输入与服务降级',
      support: PowerSupport.service,
      binding: PowerBinding.hosted,
      // 交付：识别在服务端 —— 只能由宿主推送，对不可改动的作品不成立。
      delivery: {PowerDelivery.signal},
      permissions: [PowerPermission.microphone],
      provides: [
        PowerSignal(name: 'audio.beat', dimensions: 1, min: 0.0, max: 1.0, nominalHz: 30),
      ],
      controls: [PowerControl.sequence],
      parameters: [
        PowerParameter(name: 'sensitivity', defaultValue: 1.0, min: 0.1, max: 2.0, label: '灵敏度'),
      ],
      dependencies: ['audioVoice'],
      fallback: PowerFallback(hint: '可手动打拍，节奏识别未接入时不影响完成', control: PowerControl.sequence, timeout: Duration(seconds: 12)),
    ),
    PowerDescriptor(
      id: 'gestureVision',
      category: 'sensing',
      title: '手势识别',
      description: '摄像头手势与按钮替代',
      support: PowerSupport.permission,
      binding: PowerBinding.hosted,
      // 交付：getUserMedia，作品可自带 MediaPipe（切水果就是这么做的） —— 作品自带代码即可，宿主也能代劳。
      delivery: {PowerDelivery.container, PowerDelivery.signal},
      permissions: [PowerPermission.camera],
      provides: [
        PowerSignal(name: 'hand.indexTip', dimensions: 2, min: 0.0, max: 1.0, nominalHz: 30),
        PowerSignal(name: 'hand.pinch', dimensions: 1, min: 0.0, max: 1.0, nominalHz: 30),
      ],
      controls: [PowerControl.pointer, PowerControl.aim, PowerControl.trigger],
      parameters: [
        PowerParameter(name: 'smoothing', defaultValue: 0.4, min: 0.0, max: 1.0, label: '平滑'),
        PowerParameter(name: 'deadzone', defaultValue: 0.02, min: 0.0, max: 0.2, label: '死区'),
      ],
      fallback: PowerFallback(hint: '触屏滑动仍可操作', control: PowerControl.pointer, timeout: Duration(seconds: 12)),
    ),
    PowerDescriptor(
      id: 'motionHaptic',
      category: 'sensing',
      title: '体感与震动',
      description: '陀螺仪、倾斜、摇晃和震动反馈',
      support: PowerSupport.permission,
      binding: PowerBinding.hosted,
      // 交付：DeviceOrientationEvent / DeviceMotionEvent —— 作品自带代码即可，宿主也能代劳。
      delivery: {PowerDelivery.container, PowerDelivery.signal},
      permissions: [PowerPermission.motion],
      provides: [
        PowerSignal(name: 'orientation.tilt', dimensions: 1, min: -1.0, max: 1.0, nominalHz: 60),
        PowerSignal(name: 'motion.shake', dimensions: 1, min: 0.0, max: 1.0, nominalHz: 60),
      ],
      actuators: [
        PowerActuator(name: 'haptic.impact', description: '单次撞击反馈'),
        PowerActuator(name: 'haptic.pattern', description: '节奏化触觉图案，用于寻宝的冷热提示'),
      ],
      controls: [PowerControl.lane, PowerControl.steer, PowerControl.shuffle],
      parameters: [
        PowerParameter(name: 'sensitivity', defaultValue: 1.0, min: 0.1, max: 2.0, label: '灵敏度'),
        PowerParameter(name: 'deadzone', defaultValue: 0.09, min: 0.0, max: 0.4, label: '死区'),
      ],
      fallback: PowerFallback(hint: '按住左右仍可转向，点按画面仍可触发', control: PowerControl.steer, timeout: Duration(seconds: 12)),
    ),
    PowerDescriptor(
      id: 'shareEngagement',
      category: 'social',
      title: '分享与互动',
      description: '分享链接、点赞、评论和收藏',
      support: PowerSupport.generatable,
      binding: PowerBinding.baked,
    ),
    PowerDescriptor(
      id: 'socialGraph',
      category: 'social',
      title: '关注关系',
      description: '关注、回关与相互关注',
      support: PowerSupport.generatable,
      binding: PowerBinding.baked,
    ),
    PowerDescriptor(
      id: 'communityChallenge',
      category: 'social',
      title: '排行与社区挑战',
      description: '排行榜、社区挑战和反作弊',
      support: PowerSupport.prototype,
      binding: PowerBinding.baked,
      dependencies: ['timerScore'],
    ),
    PowerDescriptor(
      id: 'chatDm',
      category: 'social',
      title: '聊天与私信',
      description: '聊天、私信、频率限制和屏蔽',
      support: PowerSupport.service,
      binding: PowerBinding.hosted,
      // 交付：实时服务 —— 只能由宿主推送，对不可改动的作品不成立。
      delivery: {PowerDelivery.signal},
      dependencies: ['reportSafety'],
      fallback: PowerFallback(hint: '实时服务未接入时展示本地会话，不伪造在线状态', timeout: Duration(seconds: 12)),
    ),
    PowerDescriptor(
      id: 'reportSafety',
      category: 'social',
      title: '举报与社区安全',
      description: '举报、审核、申诉和未成年人保护',
      support: PowerSupport.prototype,
      binding: PowerBinding.baked,
    ),
    PowerDescriptor(
      id: 'multiplayer',
      category: 'social',
      title: '多人参与',
      description: '多人房间、同步状态与断线恢复',
      support: PowerSupport.service,
      binding: PowerBinding.hosted,
      // 交付：实时服务 —— 只能由宿主推送，对不可改动的作品不成立。
      delivery: {PowerDelivery.signal},
      dependencies: ['socialGraph'],
      fallback: PowerFallback(hint: '实时服务未接入时以单人模式进行，不伪造房间人数', timeout: Duration(seconds: 12)),
    ),
    PowerDescriptor(
      id: 'adsMcp',
      category: 'operations',
      // 与「广告投放管理」的分工写在名字里：那条是写（创建与管理投放），
      // 这条是读（让智能体看懂投放）。协议名留在描述里，不进标题。
      title: '营销智能体',
      description: '让 AI 智能体接入营销接口，读取活动设置与投放效果（MCP）',
      support: PowerSupport.approval,
      binding: PowerBinding.workflow,
      // 依赖广告 API：MCP 读的是它管理的那些活动数据，
      // 没有接口层就没有可读的东西。
      dependencies: ['adsApi'],
      quickAllowed: false,
    ),
    PowerDescriptor(
      id: 'adsApi',
      category: 'operations',
      // 标题不用「广告 API」：目录里的英文词（GIF / 3D / AR / NPC / Persona /
      // KOL / Remix）都是创作者本来就在用的，而 API、MCP 是开发者术语。
      // 这份目录是给创作者看的能力面板，不是给开发者看的接口文档。
      title: '广告投放管理',
      description: '程序化创建与管理广告系列、广告团队、创意、受众、定位与报告',
      support: PowerSupport.approval,
      binding: PowerBinding.workflow,
      // 和外部连接器同一类：接的是平台方的营销接口，要凭证、要合同，
      // 而且会真实花钱。所以沿用它的口径——需审批、快速模式下不可选。
      dependencies: ['externalConnectors'],
      quickAllowed: false,
    ),
    PowerDescriptor(
      id: 'draftPreview',
      category: 'operations',
      title: '草稿与预览',
      description: '草稿、预览和生成失败恢复',
      support: PowerSupport.prototype,
      binding: PowerBinding.workflow,
    ),
    PowerDescriptor(
      id: 'coverTags',
      category: 'operations',
      title: '封面与标签',
      description: '发布封面、描述和标签配置',
      support: PowerSupport.prototype,
      binding: PowerBinding.workflow,
    ),
    PowerDescriptor(
      id: 'versionLifecycle',
      category: 'operations',
      title: '版本生命周期',
      description: '版本、暂停、回滚与恢复',
      support: PowerSupport.prototype,
      binding: PowerBinding.workflow,
    ),
    PowerDescriptor(
      id: 'remixReview',
      category: 'operations',
      title: 'Remix 授权与审核',
      description: 'Remix 授权、内容审核和撤销边界',
      support: PowerSupport.approval,
      binding: PowerBinding.workflow,
    ),
    PowerDescriptor(
      id: 'appPublish',
      category: 'operations',
      title: '站内发布',
      description: '提交审核并发布到 Airvana APP',
      support: PowerSupport.approval,
      binding: PowerBinding.workflow,
    ),
    PowerDescriptor(
      id: 'externalConnectors',
      category: 'operations',
      title: '外部连接器',
      description: '审批后发布到 Telegram、Facebook、X 或 Discord',
      support: PowerSupport.approval,
      binding: PowerBinding.workflow,
      quickAllowed: false,
    ),
    PowerDescriptor(
      id: 'campaignAttribution',
      category: 'operations',
      title: '事件与归因',
      description: '事件、KOL 链接、归因证据和结算前置',
      support: PowerSupport.approval,
      binding: PowerBinding.workflow,
      quickAllowed: false,
    ),
    PowerDescriptor(
      id: 'campaignExperimentsKillSwitch',
      category: 'operations',
      title: '受控运营',
      description: 'A/B 测试、营销智能体与 Kill Switch',
      support: PowerSupport.approval,
      binding: PowerBinding.workflow,
      quickAllowed: false,
    ),
    PowerDescriptor(
      id: 'vrExperience',
      category: 'other',
      title: 'VR 体验',
      description: '空间交互与非 VR 降级入口',
      support: PowerSupport.permission,
      binding: PowerBinding.hosted,
      // 交付：需要宿主接管屏幕与姿态融合 —— 只能由宿主推送，对不可改动的作品不成立。
      delivery: {PowerDelivery.signal},
      permissions: [PowerPermission.motion],
      provides: [
        PowerSignal(name: 'orientation.pose', dimensions: 3, min: -1.0, max: 1.0, nominalHz: 60),
      ],
      controls: [PowerControl.aim],
      parameters: [
        PowerParameter(name: 'smoothing', defaultValue: 0.6, min: 0.0, max: 1.0, label: '平滑'),
      ],
      conflicts: ['cameraAr', 'faceExpression', 'bodyPose', 'environmentScan'],
      fallback: PowerFallback(hint: '可用触屏环视', control: PowerControl.aim, timeout: Duration(seconds: 12)),
    ),
    PowerDescriptor(
      id: 'proceduralAnimation',
      category: 'other',
      title: '程序化动画',
      description: '规则驱动的像素与序列动画',
      support: PowerSupport.prototype,
      binding: PowerBinding.baked,
    ),
    PowerDescriptor(
      id: 'mirrorDrawing',
      category: 'other',
      title: '镜像绘制',
      description: '对称、镜像与轨迹图案',
      support: PowerSupport.generatable,
      binding: PowerBinding.baked,
    ),
    PowerDescriptor(
      id: 'threeDScene',
      category: 'other',
      title: '3D 场景',
      description: '轻量 3D 场景与镜头交互',
      support: PowerSupport.prototype,
      binding: PowerBinding.baked,
    ),
    PowerDescriptor(
      id: 'touchscreenSimulation',
      category: 'other',
      title: '触屏界面模拟',
      description: '手机界面、手势与系统反馈模拟',
      support: PowerSupport.generatable,
      binding: PowerBinding.baked,
    ),
    PowerDescriptor(
      id: 'proceduralWorld',
      category: 'other',
      title: '程序化世界生成',
      description: '区块、地形与探索路径生成',
      support: PowerSupport.prototype,
      binding: PowerBinding.baked,
    ),
    PowerDescriptor(
      id: 'softBodyPhysics',
      category: 'other',
      title: '软体物理',
      description: '挤压、弹性与触感反馈',
      support: PowerSupport.prototype,
      binding: PowerBinding.baked,
    ),
    PowerDescriptor(
      id: 'guidedCreator',
      category: 'other',
      title: '分步创作器',
      description: '步骤拆解、进度提示与完成检查',
      support: PowerSupport.generatable,
      binding: PowerBinding.baked,
    ),
    // ── 以下 10 条按手机感应能力盘点补齐 ────────────────────────────────
    // 原有 sensing 分类只有 5 条，覆盖了陀螺仪/加速度计/麦克风音量/音高节奏/
    // 手部手势。下面补上盘点里缺失的那些，并按 H5 可行性如实标注：可行性低的
    // 几项在 WebView 里拿不到，只能由宿主原生侧提供，这正是它们必须是
    // hosted 而不能烘焙进作品的原因。
    PowerDescriptor(
      id: 'devicePosture',
      category: 'sensing',
      title: '手机姿态',
      description: '翻面、横竖屏、旋转与抬高，用作解谜与发射动作',
      support: PowerSupport.permission,
      binding: PowerBinding.hosted,
      // 交付：DeviceOrientationEvent + screen.orientation —— 作品自带代码即可，宿主也能代劳。
      delivery: {PowerDelivery.container, PowerDelivery.signal},
      permissions: [PowerPermission.motion],
      provides: [
        PowerSignal(name: 'posture.faceUp', dimensions: 1, min: -1.0, max: 1.0, nominalHz: 30),
        PowerSignal(name: 'posture.rotation', dimensions: 1, min: -1.0, max: 1.0, nominalHz: 60),
        PowerSignal(name: 'posture.elevation', dimensions: 1, min: -1.0, max: 1.0, nominalHz: 30),
      ],
      controls: [PowerControl.trigger, PowerControl.sequence],
      parameters: [
        PowerParameter(name: 'deadzone', defaultValue: 0.12, min: 0.0, max: 0.5, label: '死区'),
      ],
      fallback: PowerFallback(hint: '点按或拖动仍可完成同样的动作', control: PowerControl.trigger, timeout: Duration(seconds: 12)),
    ),
    PowerDescriptor(
      id: 'faceExpression',
      category: 'sensing',
      title: '面部表情',
      description: '微笑、眨眼、张嘴与摇头，前置摄像头本机识别',
      support: PowerSupport.permission,
      binding: PowerBinding.hosted,
      // 交付：getUserMedia，作品可自带人脸模型 —— 作品自带代码即可，宿主也能代劳。
      delivery: {PowerDelivery.container, PowerDelivery.signal},
      permissions: [PowerPermission.camera],
      provides: [
        PowerSignal(name: 'face.smile', dimensions: 1, min: 0.0, max: 1.0, nominalHz: 30),
        PowerSignal(name: 'face.blink', dimensions: 1, min: 0.0, max: 1.0, nominalHz: 30),
        PowerSignal(name: 'face.mouthOpen', dimensions: 1, min: 0.0, max: 1.0, nominalHz: 30),
        PowerSignal(name: 'face.headYaw', dimensions: 1, min: -1.0, max: 1.0, nominalHz: 30),
      ],
      controls: [PowerControl.trigger, PowerControl.steer, PowerControl.lane],
      parameters: [
        PowerParameter(name: 'threshold', defaultValue: 0.5, min: 0.1, max: 0.95, label: '触发阈值'),
        PowerParameter(name: 'smoothing', defaultValue: 0.4, min: 0.0, max: 1.0, label: '平滑'),
      ],
      conflicts: ['vrExperience'],
      fallback: PowerFallback(hint: '点按仍可触发，不使用摄像头也能完整通关', control: PowerControl.trigger, timeout: Duration(seconds: 12)),
    ),
    PowerDescriptor(
      id: 'bodyPose',
      category: 'sensing',
      title: '身体姿态',
      description: '舞蹈模仿与姿势挑战，全身关键点本机识别',
      support: PowerSupport.permission,
      binding: PowerBinding.hosted,
      // 交付：getUserMedia，作品可自带姿态模型 —— 作品自带代码即可，宿主也能代劳。
      delivery: {PowerDelivery.container, PowerDelivery.signal},
      permissions: [PowerPermission.camera],
      provides: [
        PowerSignal(name: 'body.keypoints', dimensions: 2, min: 0.0, max: 1.0, nominalHz: 30),
        PowerSignal(name: 'body.poseMatch', dimensions: 1, min: 0.0, max: 1.0, nominalHz: 30),
      ],
      controls: [PowerControl.pointer, PowerControl.trigger],
      parameters: [
        PowerParameter(name: 'tolerance', defaultValue: 0.35, min: 0.05, max: 0.9, label: '姿势容差'),
      ],
      conflicts: ['vrExperience'],
      fallback: PowerFallback(hint: '可改用触屏完成动作挑战', control: PowerControl.pointer, timeout: Duration(seconds: 12)),
    ),
    PowerDescriptor(
      id: 'environmentScan',
      category: 'sensing',
      title: '环境识别与扫描',
      description: '后置摄像头识别实物、海报与品牌色，用于线下寻宝',
      support: PowerSupport.permission,
      binding: PowerBinding.hosted,
      // 交付：getUserMedia + BarcodeDetector —— 作品自带代码即可，宿主也能代劳。
      delivery: {PowerDelivery.container, PowerDelivery.signal},
      permissions: [PowerPermission.camera],
      provides: [
        PowerSignal(name: 'scan.match', dimensions: 1, min: 0.0, max: 1.0, nominalHz: 10),
        PowerSignal(name: 'scan.color', dimensions: 3, min: 0.0, max: 1.0, nominalHz: 10),
      ],
      controls: [PowerControl.trigger],
      parameters: [
        PowerParameter(name: 'confidence', defaultValue: 0.6, min: 0.2, max: 0.95, label: '识别置信度'),
      ],
      conflicts: ['vrExperience'],
      fallback: PowerFallback(hint: '可上传图片或手动输入口令完成同一步', control: PowerControl.trigger, timeout: Duration(seconds: 12)),
    ),
    PowerDescriptor(
      id: 'geoLocation',
      category: 'sensing',
      title: '地理位置',
      description: '城市寻宝、门店打卡与路线收集',
      support: PowerSupport.permission,
      binding: PowerBinding.hosted,
      // 交付：navigator.geolocation —— 作品自带代码即可，宿主也能代劳。
      delivery: {PowerDelivery.container, PowerDelivery.signal},
      permissions: [PowerPermission.location],
      provides: [
        PowerSignal(name: 'geo.distance', dimensions: 1, min: 0.0, max: 1.0, nominalHz: 1),
        PowerSignal(name: 'geo.arrival', dimensions: 1, min: 0.0, max: 1.0, nominalHz: 1),
      ],
      controls: [PowerControl.trigger, PowerControl.sequence],
      parameters: [
        PowerParameter(name: 'radiusMeters', defaultValue: 80.0, min: 10.0, max: 2000.0, label: '判定半径'),
      ],
      fallback: PowerFallback(hint: '可用口令或二维码完成打卡，不必开启定位', control: PowerControl.trigger, timeout: Duration(seconds: 12)),
    ),
    PowerDescriptor(
      id: 'compassHeading',
      category: 'sensing',
      title: '电子罗盘',
      description: '指南针寻宝、转身找目标与方位解锁',
      support: PowerSupport.permission,
      binding: PowerBinding.hosted,
      // 交付：DeviceOrientationEvent.webkitCompassHeading —— 作品自带代码即可，宿主也能代劳。
      delivery: {PowerDelivery.container, PowerDelivery.signal},
      permissions: [PowerPermission.motion],
      provides: [
        PowerSignal(name: 'compass.heading', dimensions: 1, min: -1.0, max: 1.0, nominalHz: 30),
      ],
      controls: [PowerControl.aim, PowerControl.steer],
      parameters: [
        PowerParameter(name: 'smoothing', defaultValue: 0.5, min: 0.0, max: 1.0, label: '平滑'),
      ],
      fallback: PowerFallback(hint: '可拖动罗盘手动对准', control: PowerControl.aim, timeout: Duration(seconds: 12)),
    ),
    PowerDescriptor(
      id: 'ambientSensing',
      category: 'sensing',
      title: '环境光与距离',
      description: '遮住手机、暗室召唤与贴耳听秘密',
      support: PowerSupport.permission,
      binding: PowerBinding.hosted,
      // 交付：AmbientLightSensor 在移动端 WebView 基本不可用 —— 只能由宿主推送，对不可改动的作品不成立。
      delivery: {PowerDelivery.signal},
      provides: [
        PowerSignal(name: 'ambient.light', dimensions: 1, min: 0.0, max: 1.0, nominalHz: 10),
        PowerSignal(name: 'ambient.proximity', dimensions: 1, min: 0.0, max: 1.0, nominalHz: 10),
      ],
      controls: [PowerControl.trigger],
      parameters: [
        PowerParameter(name: 'threshold', defaultValue: 0.25, min: 0.02, max: 0.9, label: '触发阈值'),
      ],
      fallback: PowerFallback(hint: '点按即可代替遮挡动作', control: PowerControl.trigger, timeout: Duration(seconds: 12)),
    ),
    PowerDescriptor(
      id: 'stepActivity',
      category: 'sensing',
      title: '计步与运动数据',
      description: '步数养成、每日能量与现实走路闯关',
      support: PowerSupport.permission,
      binding: PowerBinding.hosted,
      // 交付：Web 无计步 API，必须走原生 CoreMotion / ActivityRecognition —— 只能由宿主推送，对不可改动的作品不成立。
      delivery: {PowerDelivery.signal},
      permissions: [PowerPermission.activityRecognition],
      provides: [
        PowerSignal(name: 'activity.steps', dimensions: 1, min: 0.0, max: 1.0, nominalHz: 1),
        PowerSignal(name: 'activity.distance', dimensions: 1, min: 0.0, max: 1.0, nominalHz: 1),
      ],
      controls: [PowerControl.sequence, PowerControl.trigger],
      parameters: [
        PowerParameter(name: 'dailyGoal', defaultValue: 6000.0, min: 500.0, max: 30000.0, label: '每日目标步数'),
      ],
      fallback: PowerFallback(hint: '未授权运动数据时改为手动签到推进', control: PowerControl.trigger, timeout: Duration(seconds: 12)),
    ),
    PowerDescriptor(
      id: 'proximityLink',
      category: 'sensing',
      title: '近场联动',
      description: 'NFC 碰一碰、蓝牙信标解锁与近距离组队',
      support: PowerSupport.permission,
      binding: PowerBinding.hosted,
      // 交付：WebNFC 仅 Android Chrome，蓝牙/UWB 无 Web API —— 只能由宿主推送，对不可改动的作品不成立。
      delivery: {PowerDelivery.signal},
      permissions: [PowerPermission.nearbyDevices],
      provides: [
        PowerSignal(name: 'link.detected', dimensions: 1, min: 0.0, max: 1.0, nominalHz: 2),
        PowerSignal(name: 'link.proximity', dimensions: 1, min: 0.0, max: 1.0, nominalHz: 2),
      ],
      controls: [PowerControl.trigger],
      parameters: [
        PowerParameter(name: 'rssiThreshold', defaultValue: -70.0, min: -100.0, max: -30.0, label: '信号强度阈值'),
      ],
      fallback: PowerFallback(hint: '可扫码或输入口令代替碰一碰', control: PowerControl.trigger, timeout: Duration(seconds: 12)),
    ),
];
