import 'dart:async';

import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/design_system/app_state_view.dart';
import 'package:airvana_mobile/features/create/application/create_route_state.dart';
import 'package:airvana_mobile/features/create/application/create_workflow_repository.dart';
import 'package:airvana_mobile/features/shared/data/legacy_demo_catalog.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_models.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_store.dart';
import 'package:airvana_mobile/features/shared/domain/airvana_models.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class CreatePlayableScreen extends StatefulWidget {
  const CreatePlayableScreen({
    super.key,
    required this.workflowRepository,
    this.routeState = const CreateRouteState(),
    this.onRouteStateChanged,
    this.onPublished,
  });

  final CreateWorkflowRepository workflowRepository;
  final CreateRouteState routeState;
  final ValueChanged<CreateRouteState>? onRouteStateChanged;
  final VoidCallback? onPublished;

  @override
  State<CreatePlayableScreen> createState() => _CreatePlayableScreenState();
}

class _CreatePlayableScreenState extends State<CreatePlayableScreen> {
  static const _steps = ['描述', '问答', 'Power', 'Review', '生成', '预览', '审核', '发布'];
  static const _generationSteps = [
    'queued',
    'planning',
    'preparing_assets',
    'generating',
    'validating',
    'building_preview',
    'preview_ready',
  ];
  static const _questions = [
    ('希望采用哪种主要操作方式？', ['长按蓄力', '点击操作'], '点击操作'),
    ('偏好哪种视觉风格？', ['可爱卡通', '轻写实'], '可爱卡通'),
    ('一局预计持续多久？', ['30 秒', '60 秒', '90 秒'], '90 秒'),
    ('是否允许其他用户 Remix？', ['不允许', '允许'], '不允许'),
  ];
  static const _defaultCampaignBrand = 'Airvana Demo Brand';
  static const _defaultCampaignRegion = '测试环境 · 不对外发布';
  static const _defaultCampaignChannel = 'KOL 专属链接';
  static const _defaultCampaignCtaUrl =
      'airvana-demo://approved-cta/safety-guide';
  static const _defaultCampaignRewardRule = '无现金奖励；AIP 仅记录站内互动贡献';
  static const _defaultCampaignAttributionWindow = '点击后 7 天；完成后 24 小时';
  static const _defaultCampaignAttributionModel = 'KOL 专属链接优先；末次有效触点并去重';
  static const _defaultCampaignSettlementBasis = '仅获批成功事件；本地演示不计金额';
  static const _deepComplianceRules = <(IconData, String, String, String)>[
    (
      Icons.shield_outlined,
      '账号安全',
      '不收集助记词、私钥或验证码',
      '不得索取助记词、私钥、验证码、密码或原始身份材料。',
    ),
    (
      Icons.campaign_outlined,
      '营销表达',
      '不承诺收益、保本或保证获批',
      '不得承诺收益、保本、保证获批、保证通过或其他未经批准的结果。',
    ),
    (Icons.logout_rounded, '用户控制', '必须支持退出、重试与举报', '互动过程中必须始终提供可达的退出、重试和举报路径。'),
  ];
  static const _deepConnectors =
      <(String, String, String, String, Color, Color)>[
        (
          'telegram',
          'Telegram',
          '➤',
          '选择聊天、群组或频道后确认发送',
          Color(0xFFEAF7FF),
          Color(0xFF229ED9),
        ),
        (
          'facebook',
          'Facebook',
          'f',
          '打开 Facebook 分享页后确认发布',
          Color(0xFFEEF3FF),
          Color(0xFF1877F2),
        ),
        ('x', 'X', '𝕏', '打开 X 发帖页后确认发布', Color(0xFF111111), Colors.white),
        (
          'discord',
          'Discord',
          '◉',
          '复制链接并打开 Discord 选择频道',
          Color(0xFFEEF0FF),
          Color(0xFF5865F2),
        ),
      ];

  /// 与 Web 端 creator-workflow-v2.js 的 deriveThemeTitle 保持一致：
  /// 从创意文本中提取主题词生成作品标题，提炼失败时返回空串。
  static String deriveThemeTitle(String source) {
    var text = source.trim().split(RegExp(r'[，。,.!！？?；;\n]')).first;
    text = text.replaceFirst(
      RegExp(r'^(我想要?|帮我|请|来|做一个|做一款|创作一个|设计一款|设计一个|一个|一款)+'),
      '',
    );
    text = text.replaceFirst(RegExp(r'^(针对|面向)(.{1,8})的'), '');
    text = text.replaceFirst(
      RegExp(r'^(可爱卡通|轻写实|像素|赛博朋克|霓虹赛博|国风|水墨|现代)(风格)?的?'),
      '',
    );
    text = text.replaceFirst(
      RegExp(r'(的)?(休闲|经营|益智|放置|互动|闯关|蓄力)*(小)?(游戏|挑战|故事|测评|指南|问答|玩法|体验)?$'),
      '',
    );
    text = text.replaceFirstMapped(
      RegExp(r'在(.{1,6})(里|上|中|内)'),
      (match) => match.group(1)!,
    );
    text = text.replaceFirst(RegExp(r'的$'), '').trim();
    if (text.isEmpty) return '';
    if (text.length > 12) text = text.substring(0, 12);
    final isQuiz = RegExp(r'问答|知识|答题').hasMatch(source);
    return '$text${isQuiz ? '互动问答' : '互动挑战'}';
  }

  static const _powerCategories = <(String, String)>[
    ('recommended', '推荐'),
    ('content', '内容素材'),
    ('mechanics', '玩法系统'),
    ('narrative', '角色剧情'),
    ('sensing', '感知设备'),
    ('social', '社交共创'),
    ('operations', '智能运营'),
    ('other', '其他'),
  ];
  static const _powerCategoryHints = <String, String>{
    'recommended': '最近使用 · 热门组合 · 按目标推荐 · 缺失能力补全',
    'content': '文本、媒体、声音、视觉与多语言素材',
    'mechanics': '触控、核心循环、反馈、计分与进度状态',
    'narrative': '角色、NPC、世界观、任务与分支叙事',
    'sensing': '设备权限、感知输入与无权限降级方案',
    'social': '关系互动、社区、分享与多人参与',
    'operations': '草稿、版本、审核、发布、归因与智能运营',
    'other': '实验型、跨媒介与专用创作能力',
  };
  static const _powerCatalog = <_PowerDefinition>[
    _PowerDefinition(
      'textTypography',
      'content',
      '文本与字体',
      '文本结构、文案层级与品牌字体',
      Icons.text_fields_rounded,
    ),
    _PowerDefinition(
      'imageGif',
      'content',
      '图片与 GIF',
      '图片序列、GIF 与视觉反馈',
      Icons.image_outlined,
    ),
    _PowerDefinition(
      'video',
      'content',
      '视频',
      '视频片段、分支播放与行动节点',
      Icons.videocam_outlined,
    ),
    _PowerDefinition(
      'audioVoice',
      'content',
      '音频与配音',
      '音频、音乐、配音与静音模式',
      Icons.music_note_rounded,
      support: _PowerSupport.prototype,
    ),
    _PowerDefinition(
      'themeEffects',
      'content',
      '主题与特效',
      '主题、粒子、转场和状态动效',
      Icons.auto_awesome_rounded,
      support: _PowerSupport.prototype,
    ),
    _PowerDefinition(
      'coverLocale',
      'content',
      '封面与多语言',
      '封面、标题与多语言版本管理',
      Icons.translate_rounded,
    ),
    _PowerDefinition(
      'spatialAssets',
      'content',
      '2D / 3D / AR 素材',
      '2D、3D 与 AR 素材占位和授权',
      Icons.view_in_ar_outlined,
      support: _PowerSupport.prototype,
    ),

    _PowerDefinition(
      'touchControls',
      'mechanics',
      '点击、滑动与长按',
      '三类基础触控输入与反馈',
      Icons.touch_app_outlined,
    ),
    _PowerDefinition(
      'dragPuzzle',
      'mechanics',
      '拖拽与拼图',
      '拖拽、排序、匹配与拼图',
      Icons.grid_view_rounded,
    ),
    _PowerDefinition(
      'challenge',
      'mechanics',
      '互动挑战',
      '问答、收集与即时反馈',
      Icons.bolt_rounded,
    ),
    _PowerDefinition(
      'timerScore',
      'mechanics',
      '计时与计分',
      '倒计时、得分规则和结果卡',
      Icons.timer_outlined,
    ),
    _PowerDefinition(
      'failureRetry',
      'mechanics',
      '失败与重试',
      '补齐失败、退出与重新开始状态',
      Icons.replay_rounded,
      visibleInCatalog: false,
    ),
    _PowerDefinition(
      'levelSave',
      'mechanics',
      '关卡与进度存档',
      '关卡、检查点与继续体验',
      Icons.save_outlined,
      support: _PowerSupport.prototype,
    ),
    _PowerDefinition(
      'simulatorIdle',
      'mechanics',
      '模拟器与放置经营',
      '模拟器、放置和经营循环',
      Icons.agriculture_outlined,
      support: _PowerSupport.prototype,
    ),
    _PowerDefinition(
      'strategyPhysics',
      'mechanics',
      '策略、物理与 ASMR',
      '策略选择、物理反馈与 ASMR',
      Icons.blur_circular_rounded,
      support: _PowerSupport.prototype,
    ),

    _PowerDefinition(
      'personaLibrary',
      'narrative',
      '角色库与 Persona',
      '角色库、Persona 和身份设定',
      Icons.people_outline_rounded,
    ),
    _PowerDefinition(
      'npc',
      'narrative',
      'NPC 交互',
      'NPC 反馈、任务引导与有限行为',
      Icons.smart_toy_outlined,
      support: _PowerSupport.prototype,
    ),
    _PowerDefinition(
      'worldRelations',
      'narrative',
      '世界观与角色关系',
      '世界观、阵营与角色关系',
      Icons.hub_outlined,
    ),
    _PowerDefinition(
      'questBranch',
      'narrative',
      '任务与分支剧情',
      '任务目标、选择和分支剧情',
      Icons.alt_route_rounded,
    ),
    _PowerDefinition(
      'dialogueStyle',
      'narrative',
      '对话风格',
      '台词语气、节奏与安全表达',
      Icons.chat_bubble_outline_rounded,
    ),
    _PowerDefinition(
      'stateMemory',
      'narrative',
      '状态、记忆与表达',
      '角色状态、记忆、表情与声音',
      Icons.memory_rounded,
      support: _PowerSupport.prototype,
    ),

    _PowerDefinition(
      'cameraAr',
      'sensing',
      '摄像头与 AR',
      '摄像头、AR 识别与触控降级',
      Icons.camera_alt_outlined,
      support: _PowerSupport.permission,
      conflicts: ['vrExperience'],
    ),
    _PowerDefinition(
      'microphoneVoice',
      'sensing',
      '麦克风与声控',
      '麦克风、声控与文字替代',
      Icons.mic_none_rounded,
      support: _PowerSupport.permission,
    ),
    _PowerDefinition(
      'musicRecognition',
      'sensing',
      '音乐识别',
      '音乐识别、节奏输入与服务降级',
      Icons.graphic_eq_rounded,
      support: _PowerSupport.service,
      dependencies: ['audioVoice'],
    ),
    _PowerDefinition(
      'gestureVision',
      'sensing',
      '手势识别',
      '摄像头手势与按钮替代',
      Icons.back_hand_outlined,
      support: _PowerSupport.permission,
    ),
    _PowerDefinition(
      'motionHaptic',
      'sensing',
      '体感与震动',
      '陀螺仪、倾斜、摇晃和震动反馈',
      Icons.screen_rotation_alt_rounded,
      support: _PowerSupport.permission,
    ),

    _PowerDefinition(
      'shareEngagement',
      'social',
      '分享与互动',
      '分享链接、点赞、评论和收藏',
      Icons.ios_share_outlined,
    ),
    _PowerDefinition(
      'socialGraph',
      'social',
      '关注关系',
      '关注、回关与相互关注',
      Icons.person_add_alt_1_outlined,
    ),
    _PowerDefinition(
      'communityChallenge',
      'social',
      '排行与社区挑战',
      '排行榜、社区挑战和反作弊',
      Icons.emoji_events_outlined,
      support: _PowerSupport.prototype,
      dependencies: ['timerScore'],
    ),
    _PowerDefinition(
      'chatDm',
      'social',
      '聊天与私信',
      '聊天、私信、频率限制和屏蔽',
      Icons.forum_outlined,
      support: _PowerSupport.service,
      dependencies: ['reportSafety'],
    ),
    _PowerDefinition(
      'reportSafety',
      'social',
      '举报与社区安全',
      '举报、审核、申诉和未成年人保护',
      Icons.shield_outlined,
      support: _PowerSupport.prototype,
    ),
    _PowerDefinition(
      'multiplayer',
      'social',
      '多人参与',
      '多人房间、同步状态与断线恢复',
      Icons.groups_outlined,
      support: _PowerSupport.service,
      dependencies: ['socialGraph'],
    ),

    _PowerDefinition(
      'draftPreview',
      'operations',
      '草稿与预览',
      '草稿、预览和生成失败恢复',
      Icons.preview_outlined,
      support: _PowerSupport.prototype,
    ),
    _PowerDefinition(
      'coverTags',
      'operations',
      '封面与标签',
      '发布封面、描述和标签配置',
      Icons.sell_outlined,
      support: _PowerSupport.prototype,
    ),
    _PowerDefinition(
      'versionLifecycle',
      'operations',
      '版本生命周期',
      '版本、暂停、回滚与恢复',
      Icons.history_rounded,
      support: _PowerSupport.prototype,
    ),
    _PowerDefinition(
      'remixReview',
      'operations',
      'Remix 授权与审核',
      'Remix 授权、内容审核和撤销边界',
      Icons.swap_horiz_rounded,
      support: _PowerSupport.approval,
    ),
    _PowerDefinition(
      'appPublish',
      'operations',
      '站内发布',
      '提交审核并发布到 Airvana APP',
      Icons.publish_outlined,
      support: _PowerSupport.approval,
    ),
    _PowerDefinition(
      'externalConnectors',
      'operations',
      '外部连接器',
      '审批后发布到 Telegram、Facebook、X 或 Discord',
      Icons.cable_rounded,
      support: _PowerSupport.approval,
      quickAllowed: false,
    ),
    _PowerDefinition(
      'campaignAttribution',
      'operations',
      '事件与归因',
      '事件、KOL 链接、归因证据和结算前置',
      Icons.track_changes_rounded,
      support: _PowerSupport.approval,
      quickAllowed: false,
    ),
    _PowerDefinition(
      'campaignExperimentsKillSwitch',
      'operations',
      '受控运营',
      'A/B 测试、营销智能体与 Kill Switch',
      Icons.power_settings_new_rounded,
      support: _PowerSupport.approval,
      quickAllowed: false,
    ),

    _PowerDefinition(
      'vrExperience',
      'other',
      'VR 体验',
      '空间交互与非 VR 降级入口',
      Icons.view_in_ar_outlined,
      support: _PowerSupport.permission,
      conflicts: ['cameraAr'],
    ),
    _PowerDefinition(
      'proceduralAnimation',
      'other',
      '程序化动画',
      '规则驱动的像素与序列动画',
      Icons.animation_rounded,
      support: _PowerSupport.prototype,
    ),
    _PowerDefinition(
      'mirrorDrawing',
      'other',
      '镜像绘制',
      '对称、镜像与轨迹图案',
      Icons.gesture_rounded,
    ),
    _PowerDefinition(
      'threeDScene',
      'other',
      '3D 场景',
      '轻量 3D 场景与镜头交互',
      Icons.view_in_ar_rounded,
      support: _PowerSupport.prototype,
    ),
    _PowerDefinition(
      'touchscreenSimulation',
      'other',
      '触屏界面模拟',
      '手机界面、手势与系统反馈模拟',
      Icons.phone_iphone_rounded,
    ),
    _PowerDefinition(
      'proceduralWorld',
      'other',
      '程序化世界生成',
      '区块、地形与探索路径生成',
      Icons.landscape_outlined,
      support: _PowerSupport.prototype,
    ),
    _PowerDefinition(
      'softBodyPhysics',
      'other',
      '软体物理',
      '挤压、弹性与触感反馈',
      Icons.bubble_chart_outlined,
      support: _PowerSupport.prototype,
    ),
    _PowerDefinition(
      'guidedCreator',
      'other',
      '分步创作器',
      '步骤拆解、进度提示与完成检查',
      Icons.format_list_numbered_rounded,
    ),
  ];
  static const _workflowPowerIds = [
    'touchControls',
    'timerScore',
    'failureRetry',
    'coverLocale',
    'shareEngagement',
    'draftPreview',
  ];
  static const _defaultIdea = '描述品牌目标和游戏创意，创作一个 Agentic\u00A0Playable';
  static const _legacySingleLineDefaultIdea =
      '描述品牌目标和游戏创意，创作一个 Agentic Playable';
  static const _legacyWrappedDefaultIdea = '描述品牌目标和游戏创意，创作一个 Agentic\nPlayable';
  static const _legacyDefaultIdea = '帮我创作一个可爱卡通风格的跳一跳游戏，长按蓄力，适合单手操作。';

  final _ideaController = TextEditingController(text: _defaultIdea);
  final _powerSearchController = TextEditingController();
  final Map<int, String> _answers = {};
  final Set<String> _selectedPowerIds = {
    'touchControls',
    'timerScore',
    'failureRetry',
    'draftPreview',
  };
  Timer? _generationTimer;
  int _stage = 0;
  int _questionIndex = 0;
  int _generationIndex = 0;
  int _previewScore = 0;
  // 预览互动运行时：对齐 Web 端「蓄力跳跃 + 试玩路径验证」
  String _previewStatus =
      'ready'; // ready / running / success / failure / exited
  int _previewCharge = 0;
  int _previewPlatform = 0;
  final Set<String> _coveredPaths = <String>{};
  int _visibilityChoice = 0; // 0 公开仅查看 / 1 公开可 Remix / 2 仅链接可见 / 3 私密草稿
  bool _visibilityInitialized = false;
  bool _deepMode = false;
  bool _saved = true;
  bool _cancelled = false;
  bool _approved = false;
  bool _composerOpen = true;
  String _createHomeTab = 'abilities';
  bool _powerSearchOpen = false;
  String _selectedPowerCategory = 'recommended';
  final Set<String> _composerAssetIds = <String>{};
  String _composerGoalObjective = '';
  String _composerGoalAudience = '';
  String _composerGoalSuccessEvent = '';
  String _composerGoalCta = '';
  String _campaignBrand = _defaultCampaignBrand;
  String _campaignRegion = _defaultCampaignRegion;
  String _campaignChannel = _defaultCampaignChannel;
  String _campaignCtaUrl = _defaultCampaignCtaUrl;
  String _campaignRewardRule = _defaultCampaignRewardRule;
  String _campaignAttributionWindow = _defaultCampaignAttributionWindow;
  String _campaignAttributionModel = _defaultCampaignAttributionModel;
  String _campaignSettlementBasis = _defaultCampaignSettlementBasis;
  String _campaignBrandRestrictions = '';
  final Set<String> _composerConnectorIds = <String>{};
  String? _powerNotice;
  String? _draftId;
  String? _taskId;
  String? _versionId;
  String? _restoreError;
  bool _restoring = true;
  bool _generationRequestInFlight = false;
  bool _publishRequestInFlight = false;
  LocalRelease? _release;
  ServerPlayableRelease? _serverRelease;
  String? _serverTaskId;
  String? _serverContentId;
  String _serverCreationStatus = '';
  Future<void> _draftWriteTail = Future<void>.value();

  @override
  void initState() {
    super.initState();
    _draftId = widget.routeState.draftId;
    _taskId = widget.routeState.taskId;
    _versionId = widget.routeState.versionId;
    _restoreDraft();
  }

  @override
  void didUpdateWidget(covariant CreatePlayableScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    final route = widget.routeState;
    final changedExternally =
        (route.draftId != _draftId &&
            route.draftId != oldWidget.routeState.draftId) ||
        (route.taskId != _taskId &&
            route.taskId != oldWidget.routeState.taskId) ||
        (route.versionId != _versionId &&
            route.versionId != oldWidget.routeState.versionId);
    if (changedExternally) {
      _generationTimer?.cancel();
      _draftId = route.draftId;
      _taskId = route.taskId;
      _versionId = route.versionId;
      _restoreDraft();
    }
  }

  @override
  void dispose() {
    _generationTimer?.cancel();
    _ideaController.dispose();
    _powerSearchController.dispose();
    super.dispose();
  }

  Future<void> _restoreDraft() async {
    if (mounted) {
      setState(() {
        _restoring = true;
        _restoreError = null;
      });
    }
    var resumeGeneration = false;
    try {
      LocalGenerationTask? task;
      final requestedTaskId = _taskId;
      if (requestedTaskId != null) {
        task = await widget.workflowRepository.loadGeneration(requestedTaskId);
        if (task == null) {
          throw StateError('链接中的 task_id 不存在：$requestedTaskId');
        }
        _draftId ??= task.draftId;
      }

      LocalDraft? draft;
      final requestedDraftId = _draftId;
      if (requestedDraftId != null) {
        draft = await widget.workflowRepository.loadDraft(requestedDraftId);
        if (draft == null) {
          throw StateError('链接中的 draft_id 不存在：$requestedDraftId');
        }
      } else {
        draft = await widget.workflowRepository.saveDraft(
          idea: _ideaController.text,
          deepMode: _deepMode,
          selectedPowerIds: _selectedPowerIds.toList(growable: false),
          workflowState: _workflowState(),
          sourcePlayableId: widget.routeState.remixSourceId,
        );
        _draftId = draft.draftId;
      }

      _applyDraft(draft);
      final persistedTaskId = _nonEmpty(draft.workflowState['task_id']);
      if (task == null && persistedTaskId != null) {
        task = await widget.workflowRepository.loadGeneration(persistedTaskId);
      }
      if (task == null && _stage >= 4) {
        task = await widget.workflowRepository.startOrResumeGeneration(
          draft.draftId,
        );
      }
      if (task != null) {
        _validateAndApplyTask(task);
        final release = await widget.workflowRepository.loadReleaseForTask(
          task.taskId,
        );
        if (release != null) {
          if (release.versionId != task.versionId) {
            throw StateError(
              'release_id ${release.releaseId} 与 task_id ${task.taskId} 的 version_id 不匹配。',
            );
          }
          _release = release;
          _stage = 7;
        }
        resumeGeneration =
            _stage == 4 &&
            !_cancelled &&
            (task.status == LocalGenerationStatus.queued ||
                task.status == LocalGenerationStatus.running);
      }
      if (!mounted) return;
      setState(() {
        _restoring = false;
        if (widget.routeState.remixSourceId != null) {
          _powerNotice =
              'Remix 来源：${widget.routeState.remixSourceId}；只继承可复用内容，商业、奖励、CTA 与授权字段不自动继承。';
        }
      });
      _syncRoute();
      if (resumeGeneration) unawaited(_startGeneration());
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _restoring = false;
        _restoreError = '$error';
      });
    }
  }

  void _applyDraft(LocalDraft draft) {
    final workflow = draft.workflowState;
    _draftId = draft.draftId;
    _ideaController.text =
        draft.idea.isEmpty ||
            draft.idea == _legacyDefaultIdea ||
            draft.idea == _legacySingleLineDefaultIdea ||
            draft.idea == _legacyWrappedDefaultIdea
        ? _defaultIdea
        : draft.idea;
    _deepMode = draft.deepMode;
    _stage = _boundedInt(workflow['stage'], 0, 7, fallback: 0);
    _questionIndex = _boundedInt(
      workflow['questionIndex'],
      0,
      _questions.length - 1,
      fallback: 0,
    );
    _generationIndex = _boundedInt(
      workflow['generationIndex'],
      0,
      _generationSteps.length - 1,
      fallback: 0,
    );
    _previewScore = _boundedInt(workflow['previewScore'], 0, 999, fallback: 0);
    _previewStatus =
        const [
          'ready',
          'running',
          'success',
          'failure',
          'exited',
        ].contains(workflow['previewStatus'])
        ? '${workflow['previewStatus']}'
        : 'ready';
    _previewPlatform = _boundedInt(
      workflow['previewPlatform'],
      0,
      6,
      fallback: 0,
    );
    _coveredPaths.clear();
    if (workflow['coveredPaths'] is List) {
      for (final path in workflow['coveredPaths'] as List) {
        if (const {'success', 'failure', 'retry', 'exit'}.contains(path)) {
          _coveredPaths.add('$path');
        }
      }
    }
    _visibilityChoice = _boundedInt(
      workflow['visibilityChoice'],
      0,
      3,
      fallback: 0,
    );
    _visibilityInitialized = workflow['visibilityInitialized'] == true;
    _cancelled = workflow['cancelled'] == true;
    _approved = workflow['approved'] == true;
    _serverTaskId = _nonEmpty(workflow['server_task_id']);
    _serverContentId = _nonEmpty(workflow['server_content_id']);
    _serverCreationStatus = _nonEmpty(workflow['server_status']) ?? '';
    final serverContentId = _serverContentId;
    if (serverContentId != null &&
        workflow['server_published'] == true &&
        _stage == 7) {
      _serverRelease = ServerPlayableRelease(
        taskId: _serverTaskId ?? '',
        contentId: serverContentId,
        version: _boundedInt(
          workflow['server_version'],
          1,
          999999,
          fallback: 1,
        ),
        title: _nonEmpty(workflow['server_title']) ?? _workTitle,
      );
    }
    _composerOpen = workflow['composerOpen'] is bool
        ? workflow['composerOpen'] == true
        : _stage == 0;
    _composerGoalObjective = '${workflow['composerGoalObjective'] ?? ''}';
    _composerGoalAudience = '${workflow['composerGoalAudience'] ?? ''}';
    _composerGoalSuccessEvent = '${workflow['composerGoalSuccessEvent'] ?? ''}';
    _composerGoalCta = '${workflow['composerGoalCta'] ?? ''}';
    _campaignBrand = '${workflow['campaignBrand'] ?? _defaultCampaignBrand}';
    _campaignRegion = '${workflow['campaignRegion'] ?? _defaultCampaignRegion}';
    _campaignChannel =
        '${workflow['campaignChannel'] ?? _defaultCampaignChannel}';
    _campaignCtaUrl = '${workflow['campaignCtaUrl'] ?? _defaultCampaignCtaUrl}';
    _campaignRewardRule =
        '${workflow['campaignRewardRule'] ?? _defaultCampaignRewardRule}';
    _campaignAttributionWindow =
        '${workflow['campaignAttributionWindow'] ?? _defaultCampaignAttributionWindow}';
    _campaignAttributionModel =
        '${workflow['campaignAttributionModel'] ?? _defaultCampaignAttributionModel}';
    _campaignSettlementBasis =
        '${workflow['campaignSettlementBasis'] ?? _defaultCampaignSettlementBasis}';
    _campaignBrandRestrictions =
        '${workflow['campaignBrandRestrictions'] ?? ''}';
    _composerConnectorIds.clear();
    final restoredConnectors = workflow['composerConnectorIds'];
    if (restoredConnectors is List) {
      final validIds = _deepConnectors.map((item) => item.$1).toSet();
      _composerConnectorIds.addAll(
        restoredConnectors.map((item) => '$item').where(validIds.contains),
      );
    }
    final rawAnswers = workflow['answers'];
    _answers.clear();
    if (rawAnswers is Map) {
      for (final entry in rawAnswers.entries) {
        final index = int.tryParse('${entry.key}');
        if (index != null && index >= 0 && index < _questions.length) {
          _answers[index] = '${entry.value}';
        }
      }
    }
    final restoredPowerIds = draft.selectedPowerIds
        .where((id) => _powerById(id) != null)
        .toSet();
    if (restoredPowerIds.isNotEmpty) {
      _selectedPowerIds
        ..clear()
        ..addAll(restoredPowerIds);
    }
    _saved = true;
  }

  void _validateAndApplyTask(LocalGenerationTask task) {
    if (_draftId != task.draftId) {
      throw StateError('task_id ${task.taskId} 属于其他草稿，拒绝合并状态。');
    }
    final requestedVersionId = _versionId;
    if (requestedVersionId != null && requestedVersionId != task.versionId) {
      throw StateError(
        'version_id $requestedVersionId 与 task_id ${task.taskId} 不匹配。',
      );
    }
    _taskId = task.taskId;
    _versionId = task.versionId;
    switch (task.status) {
      case LocalGenerationStatus.completed:
        _generationIndex = _generationSteps.length - 1;
        if (_stage < 5) _stage = 5;
        _cancelled = false;
        break;
      case LocalGenerationStatus.cancelled:
      case LocalGenerationStatus.failed:
      case LocalGenerationStatus.paused:
        _stage = 4;
        _cancelled = true;
        break;
      case LocalGenerationStatus.queued:
      case LocalGenerationStatus.running:
        if (_stage < 4) _stage = 4;
        _cancelled = false;
        break;
    }
  }

  Map<String, dynamic> _workflowState() => {
    'schemaVersion': 1,
    'stage': _stage,
    'questionIndex': _questionIndex,
    'answers': _answers.map((key, value) => MapEntry('$key', value)),
    'generationIndex': _generationIndex,
    'previewScore': _previewScore,
    'previewStatus': _previewStatus,
    'previewPlatform': _previewPlatform,
    'coveredPaths': _coveredPaths.toList(growable: false),
    'visibilityChoice': _visibilityChoice,
    'visibilityInitialized': _visibilityInitialized,
    'cancelled': _cancelled,
    'approved': _approved,
    'composerOpen': _composerOpen,
    'composerGoalObjective': _composerGoalObjective,
    'composerGoalAudience': _composerGoalAudience,
    'composerGoalSuccessEvent': _composerGoalSuccessEvent,
    'composerGoalCta': _composerGoalCta,
    'campaignBrand': _campaignBrand,
    'campaignRegion': _campaignRegion,
    'campaignChannel': _campaignChannel,
    'campaignCtaUrl': _campaignCtaUrl,
    'campaignRewardRule': _campaignRewardRule,
    'campaignAttributionWindow': _campaignAttributionWindow,
    'campaignAttributionModel': _campaignAttributionModel,
    'campaignSettlementBasis': _campaignSettlementBasis,
    'campaignBrandRestrictions': _campaignBrandRestrictions,
    'composerConnectorIds': _composerConnectorIds.toList(growable: false),
    'task_id': _taskId,
    'version_id': _versionId,
    'server_task_id': _serverTaskId,
    'server_content_id': _serverContentId,
    'server_status': _serverCreationStatus,
    'server_published': _serverRelease != null,
    'server_version': _serverRelease?.version,
    'server_title': _serverRelease?.title,
  };

  Future<bool> _saveDraft() {
    final operation = _draftWriteTail.then((_) => _persistCurrentDraft());
    _draftWriteTail = operation.then<void>((_) {});
    return operation;
  }

  Future<bool> _persistCurrentDraft() async {
    try {
      final draft = await widget.workflowRepository.saveDraft(
        draftId: _draftId,
        idea: _ideaController.text,
        deepMode: _deepMode,
        selectedPowerIds: _selectedPowerIds.toList(growable: false),
        workflowState: _workflowState(),
        sourcePlayableId: widget.routeState.remixSourceId,
      );
      _draftId = draft.draftId;
      if (mounted) setState(() => _saved = true);
      _syncRoute();
      return true;
    } catch (error) {
      if (mounted) {
        setState(() {
          _saved = false;
          _powerNotice = '草稿保存失败：$error';
        });
      }
      return false;
    }
  }

  void _syncRoute() {
    final draftId = _draftId;
    if (draftId == null) return;
    widget.onRouteStateChanged?.call(
      CreateRouteState(
        draftId: draftId,
        taskId: _taskId,
        versionId: _versionId,
        remixSourceId: widget.routeState.remixSourceId,
      ),
    );
  }

  void _exitCreate(BuildContext context) {
    final router = GoRouter.of(context);
    if (router.canPop()) {
      router.pop();
      return;
    }
    router.go('/');
  }

  void _showAbilityHome() {
    if (_createHomeTab == 'abilities') return;
    setState(() {
      _createHomeTab = 'abilities';
      _selectedPowerCategory = 'recommended';
    });
  }

  static int _boundedInt(
    Object? value,
    int minimum,
    int maximum, {
    required int fallback,
  }) {
    final parsed = value is num ? value.toInt() : int.tryParse('$value');
    return (parsed ?? fallback).clamp(minimum, maximum).toInt();
  }

  static String? _nonEmpty(Object? value) {
    final normalized = value == null ? null : '$value'.trim();
    return normalized == null || normalized.isEmpty ? null : normalized;
  }

  void _goTo(int stage) {
    setState(() {
      _stage = stage;
      _saved = false;
    });
    _saveDraft();
  }

  void _useComposerTool(String label, {String? inspiration}) {
    if (inspiration != null) {
      setState(() {
        _ideaController.text = inspiration;
        _ideaController.selection = TextSelection.collapsed(
          offset: _ideaController.text.length,
        );
        _saved = false;
      });
    }
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(
            inspiration == null
                ? '$label为本机演示入口，尚未伪造上传或授权成功状态。'
                : '已填入一条可继续编辑的本地灵感。',
          ),
          duration: const Duration(seconds: 2),
        ),
      );
  }

  Future<void> _openVoiceComposer() async {
    final transcriptController = TextEditingController();
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => _ComposerSheetFrame(
        key: const ValueKey('composer-voice-sheet'),
        title: '语音转文字',
        subtitle: '设备语音权限只在使用时申请；不可用时可直接输入转写文本。',
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const _ComposerSheetNotice(
              icon: Icons.mic_none_rounded,
              text: '当前 Flutter 本地演示未伪造麦克风授权。输入或粘贴转写结果后，内容才会写入创意。',
            ),
            const SizedBox(height: 14),
            TextField(
              key: const ValueKey('composer-voice-transcript'),
              controller: transcriptController,
              minLines: 3,
              maxLines: 5,
              decoration: const InputDecoration(
                labelText: '转写文本',
                hintText: '例如：做一个长按蓄力的单手跳跃游戏',
                filled: true,
                fillColor: Colors.white,
                border: _composerSheetFieldBorder,
                enabledBorder: _composerSheetFieldBorder,
                focusedBorder: _composerSheetFieldFocusedBorder,
                disabledBorder: _composerSheetFieldBorder,
              ),
            ),
            const SizedBox(height: 14),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                key: const ValueKey('composer-voice-apply'),
                style: _composerPrimaryButtonStyle(),
                onPressed: () {
                  final transcript = transcriptController.text.trim();
                  if (transcript.isEmpty) return;
                  setState(() {
                    _ideaController.text = transcript;
                    _ideaController.selection = TextSelection.collapsed(
                      offset: transcript.length,
                    );
                    _saved = false;
                  });
                  Navigator.pop(sheetContext);
                },
                icon: const Icon(Icons.check_rounded),
                label: const Text('写入创意'),
              ),
            ),
          ],
        ),
      ),
    );
    await Future<void>.delayed(const Duration(milliseconds: 350));
    transcriptController.dispose();
  }

  Future<void> _openInspirationComposer() async {
    const suggestions = <String>[
      '保留可爱卡通主题，加入连续落点与蓄力反馈。',
      '把一局控制在 30–60 秒，并补齐失败、重试和退出路径。',
      '加入清晰的新手引导，让单手操作在首局即可理解。',
    ];
    final selected = <int>{};
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => StatefulBuilder(
        builder: (context, setSheetState) => _ComposerSheetFrame(
          key: const ValueKey('composer-inspiration-sheet'),
          title: 'AI 灵感',
          subtitle: '主题保持不变 · 选择建议后再应用到当前本地草稿',
          child: Column(
            children: [
              for (var index = 0; index < suggestions.length; index++) ...[
                _ComposerSuggestionRow(
                  key: ValueKey('composer-suggestion-$index'),
                  text: suggestions[index],
                  selected: selected.contains(index),
                  onTap: () => setSheetState(() {
                    selected.contains(index)
                        ? selected.remove(index)
                        : selected.add(index);
                  }),
                ),
                if (index != suggestions.length - 1) const SizedBox(height: 9),
              ],
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  key: const ValueKey('composer-inspiration-apply'),
                  style: _composerPrimaryButtonStyle(),
                  onPressed: selected.isEmpty
                      ? null
                      : () {
                          final additions = selected.toList(growable: false)
                            ..sort();
                          final next = [
                            _ideaController.text.trim(),
                            ...additions.map((index) => suggestions[index]),
                          ].where((line) => line.isNotEmpty).join('\n');
                          setState(() {
                            _ideaController.text = next;
                            _ideaController.selection = TextSelection.collapsed(
                              offset: next.length,
                            );
                            _saved = false;
                          });
                          Navigator.pop(sheetContext);
                        },
                  icon: const Icon(Icons.auto_awesome_rounded),
                  label: Text('应用建议（${selected.length}）'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _openAssetComposer() async {
    final assets = LegacyDemoCatalog.playables.take(6).toList(growable: false);
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => StatefulBuilder(
        builder: (context, setSheetState) => _ComposerSheetFrame(
          key: const ValueKey('composer-assets-sheet'),
          title: '项目素材',
          subtitle: '本地 Asset Manifest · 仅选择已收录素材，不上传云端',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 3,
                  crossAxisSpacing: 8,
                  mainAxisSpacing: 8,
                  childAspectRatio: .78,
                ),
                itemCount: assets.length,
                itemBuilder: (_, index) {
                  final asset = assets[index];
                  final selected = _composerAssetIds.contains(asset.id);
                  return _ComposerAssetTile(
                    key: ValueKey('composer-asset-${asset.id}'),
                    playable: asset,
                    selected: selected,
                    onTap: () {
                      setState(() {
                        selected
                            ? _composerAssetIds.remove(asset.id)
                            : _composerAssetIds.add(asset.id);
                        _saved = false;
                      });
                      setSheetState(() {});
                    },
                  );
                },
              ),
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  key: const ValueKey('composer-assets-done'),
                  style: _composerPrimaryButtonStyle(),
                  onPressed: () => Navigator.pop(sheetContext),
                  icon: const Icon(Icons.check_rounded),
                  label: Text('保存素材清单（${_composerAssetIds.length}）'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// 与旧版 Web「创作问答」sheet 一致：4 道编号问题，每题 4 个选项芯片。
  static const _goalQuestions =
      <(String, String, String, List<(String, String)>)>[
        (
          '01',
          '这次创作最重要的目标是什么？',
          '选择一个主要目标，后续可通过版本继续优化。',
          [
            ('品牌认知', '品牌认知'),
            ('互动参与', '互动参与'),
            ('线索收集', '线索收集'),
            ('注册转化', '注册转化'),
          ],
        ),
        (
          '02',
          '谁会体验这个 Playable？',
          '用于内容语气与难度，不代表已完成身份或地区验证。',
          [
            ('新用户', '18+ 新用户（本地演示）'),
            ('活跃用户', '活跃用户（本地演示）'),
            ('社区成员', 'KOL 社区成员（本地演示）'),
            ('待唤回用户', '待唤回用户（本地演示）'),
          ],
        ),
        (
          '03',
          '什么事件代表一次有效完成？',
          '成功事件进入 Contract；服务器未接入前只记录本地演示。',
          [
            ('完成互动', 'playable_complete（需服务器确认）'),
            ('提交线索', 'lead_submit（需服务器确认）'),
            ('完成注册', 'registration_complete（需外部系统确认）'),
            ('完成 KYC', 'kyc_complete（仅外部 KYC 系统确认）'),
          ],
        ),
        (
          '04',
          '体验完成后希望用户做什么？',
          '快速模式仅配置站内 CTA；深度模式由 Contract 锁定目标。',
          [
            ('了解更多', '了解更多'),
            ('开始注册', '开始注册'),
            ('查看指南', '查看指南'),
            ('领取资格', '查看资格说明'),
          ],
        ),
      ];

  static bool _hasBrandRestrictionConflict(String value) => RegExp(
    r'(允许|可以|可)(索取|收集|提交).{0,12}(助记词|私钥|验证码)|(允许|可以|可)(承诺|保证).{0,12}(收益|保本|获批|通过)|(无需|不必|取消|删除).{0,12}(退出|重试|举报)',
  ).hasMatch(value.trim());

  Future<String?> _openComplianceComposer(String initialValue) async {
    var restrictions = initialValue;
    return showModalBottomSheet<String>(
      context: context,
      useRootNavigator: true,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (complianceContext) => StatefulBuilder(
        builder: (complianceContext, setComplianceState) {
          final conflict = _hasBrandRestrictionConflict(restrictions);
          return _ComposerSheetFrame(
            key: const ValueKey('composer-compliance-sheet'),
            title: '合规与发布约束',
            subtitle: '平台规则不可删除 · 品牌限制可补充',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: conflict
                        ? const Color(0xFFFFF1F2)
                        : const Color(0xFFEAF8EF),
                    border: Border.all(
                      color: conflict
                          ? const Color(0xFFFFD6DA)
                          : const Color(0xFFB9E5C6),
                    ),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          conflict ? '品牌限制与平台规则冲突' : '3 项规则已纳入 Contract',
                          style: TextStyle(
                            color: conflict
                                ? const Color(0xFFC62836)
                                : const Color(0xFF147542),
                            fontSize: 12,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                      Container(
                        width: 30,
                        height: 30,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Text(
                          '3',
                          style: TextStyle(fontWeight: FontWeight.w900),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 10),
                for (final rule in _deepComplianceRules) ...[
                  _DeepComplianceRule(
                    icon: rule.$1,
                    title: rule.$2,
                    summary: rule.$4,
                    detailed: true,
                  ),
                  const SizedBox(height: 9),
                ],
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF7F7FA),
                    border: Border.all(color: const Color(0xFFE5E5EA)),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Expanded(
                            child: Text(
                              '品牌补充限制',
                              style: TextStyle(fontWeight: FontWeight.w900),
                            ),
                          ),
                          Text(
                            '可选 · 修改后重新审核',
                            style: TextStyle(
                              color: AirvanaColors.muted,
                              fontSize: 9,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 5),
                      const Text(
                        '可补充品牌禁用词、素材限制或地区说明，但不能覆盖平台强制规则。',
                        style: TextStyle(
                          color: AirvanaColors.muted,
                          fontSize: 9,
                          height: 1.5,
                        ),
                      ),
                      const SizedBox(height: 9),
                      TextFormField(
                        key: const ValueKey('campaign-brand-restrictions'),
                        initialValue: restrictions,
                        minLines: 3,
                        maxLines: 4,
                        onChanged: (value) =>
                            setComplianceState(() => restrictions = value),
                        decoration: InputDecoration(
                          hintText: '例如：不得使用未授权 Logo；不得面向限制地区展示…',
                          filled: true,
                          fillColor: Colors.white,
                          errorText: conflict
                              ? '该补充内容试图覆盖平台强制规则，请删除冲突表述后继续。'
                              : null,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    key: const ValueKey('composer-compliance-save'),
                    style: _composerPrimaryButtonStyle(),
                    onPressed: conflict
                        ? null
                        : () => Navigator.pop(
                            complianceContext,
                            restrictions.trim(),
                          ),
                    child: const Text('保存并返回目标'),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Future<void> _openGoalsComposer() async {
    var objective = _composerGoalObjective;
    var audience = _composerGoalAudience;
    var success = _composerGoalSuccessEvent;
    var cta = _composerGoalCta;
    var brand = _campaignBrand;
    var region = _campaignRegion;
    var channel = _campaignChannel;
    var ctaUrl = _campaignCtaUrl;
    var rewardRule = _campaignRewardRule;
    var attributionWindow = _campaignAttributionWindow;
    var attributionModel = _campaignAttributionModel;
    var settlementBasis = _campaignSettlementBasis;
    var brandRestrictions = _campaignBrandRestrictions;
    final connectorIds = <String>{..._composerConnectorIds};

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => StatefulBuilder(
        builder: (sheetContext, setSheetState) {
          final values = [objective, audience, success, cta];
          final completeCount = values.where((v) => v.trim().isNotEmpty).length;
          final canSave = completeCount == 4;
          final restrictionConflict = _hasBrandRestrictionConflict(
            brandRestrictions,
          );

          void syncParentDraft() {
            setState(() {
              _composerGoalObjective = objective;
              _composerGoalAudience = audience;
              _composerGoalSuccessEvent = success;
              _composerGoalCta = cta;
              _campaignBrand = brand;
              _campaignRegion = region;
              _campaignChannel = channel;
              _campaignCtaUrl = ctaUrl;
              _campaignRewardRule = rewardRule;
              _campaignAttributionWindow = attributionWindow;
              _campaignAttributionModel = attributionModel;
              _campaignSettlementBasis = settlementBasis;
              _campaignBrandRestrictions = brandRestrictions;
              _composerConnectorIds
                ..clear()
                ..addAll(connectorIds);
              _saved = false;
            });
          }

          void select(int index, String value) {
            setSheetState(() {
              switch (index) {
                case 0:
                  objective = value;
                case 1:
                  audience = value;
                case 2:
                  success = value;
                default:
                  cta = value;
              }
            });
            syncParentDraft();
          }

          void updateDeepField(VoidCallback update) {
            setSheetState(update);
            syncParentDraft();
          }

          Widget buildQuestion(int qIndex) {
            final question = _goalQuestions[qIndex];
            final content = Column(
              key: ValueKey('composer-goal-question-$qIndex'),
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      question.$1,
                      style: const TextStyle(
                        color: AirvanaColors.accent,
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            question.$2,
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            question.$3,
                            style: const TextStyle(
                              color: AirvanaColors.muted,
                              fontSize: 10,
                              height: 1.4,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final option in question.$4)
                      _GoalChip(
                        key: qIndex == 0 && option.$1 == question.$4.first.$1
                            ? const ValueKey('composer-goal-objective')
                            : null,
                        label: option.$1,
                        selected: values[qIndex] == option.$2,
                        onTap: () => select(qIndex, option.$2),
                      ),
                  ],
                ),
              ],
            );
            if (!_deepMode) return content;
            return Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF7F7FA),
                border: Border.all(color: const Color(0xFFE5E5EA)),
                borderRadius: BorderRadius.circular(16),
              ),
              child: content,
            );
          }

          final scopeText = _deepMode
              ? '创作问答完成度 $completeCount/4。成功事件、CTA 地址、地区、奖励、归因和结算属于锁定字段，修改会重置后续审核状态。'
              : '关键问答完成度 $completeCount/4。非关键项可以跳过，但所有默认值会在 Review 中明确展示。';

          return _ComposerSheetFrame(
            key: const ValueKey('composer-goals-sheet'),
            title: '创作问答',
            subtitle: _deepMode
                ? '依次确认目标、受众、完成事件与 CTA，再补充 Campaign Brief'
                : '依次确认关键玩法问题；默认值会在 Review 中显示',
            footer: SizedBox(
              width: double.infinity,
              child: FilledButton(
                key: const ValueKey('composer-goals-save'),
                style: _composerPrimaryButtonStyle(),
                onPressed: canSave
                    ? () async {
                        syncParentDraft();
                        await _saveDraft();
                        if (!sheetContext.mounted) return;
                        Navigator.pop(sheetContext);
                        if (!mounted) return;
                        ScaffoldMessenger.of(context)
                          ..hideCurrentSnackBar()
                          ..showSnackBar(
                            SnackBar(
                              content: Text(
                                _deepMode
                                    ? '目标已保存；成功事件、CTA 与商业规则仍受 Contract 约束'
                                    : '创作问答已保存；默认值已在 Review 中标注',
                              ),
                            ),
                          );
                      }
                    : null,
                child: Text('保存回答 $completeCount/4'),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  key: const ValueKey('composer-goal-scope'),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 10,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF2FBFB),
                    border: Border.all(color: const Color(0xFFC7EEEE)),
                    borderRadius: BorderRadius.circular(13),
                  ),
                  child: Text(
                    scopeText,
                    style: const TextStyle(
                      color: Color(0xFF31686C),
                      fontSize: 9,
                      height: 1.6,
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                for (
                  var qIndex = 0;
                  qIndex < _goalQuestions.length;
                  qIndex++
                ) ...[buildQuestion(qIndex), const SizedBox(height: 10)],
                if (_deepMode) ...[
                  Container(
                    key: const ValueKey('composer-deep-brief'),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF7F7FA),
                      border: Border.all(color: const Color(0xFFE5E5EA)),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Deep Campaign Brief',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 10),
                        LayoutBuilder(
                          builder: (context, constraints) {
                            final halfWidth = (constraints.maxWidth - 9) / 2;
                            return Wrap(
                              spacing: 9,
                              runSpacing: 9,
                              children: [
                                _DeepBriefField(
                                  key: const ValueKey('campaign-brand'),
                                  width: halfWidth,
                                  semanticLabel: '深度目标品牌',
                                  hint: '品牌 / 项目',
                                  initialValue: brand,
                                  onChanged: (value) =>
                                      updateDeepField(() => brand = value),
                                ),
                                _DeepBriefField(
                                  key: const ValueKey('campaign-region'),
                                  width: halfWidth,
                                  semanticLabel: '深度目标地区',
                                  hint: '目标地区',
                                  initialValue: region,
                                  onChanged: (value) =>
                                      updateDeepField(() => region = value),
                                ),
                                _DeepBriefField(
                                  key: const ValueKey('campaign-channel'),
                                  width: halfWidth,
                                  semanticLabel: '深度目标渠道',
                                  hint: '渠道',
                                  initialValue: channel,
                                  onChanged: (value) =>
                                      updateDeepField(() => channel = value),
                                ),
                                _DeepBriefField(
                                  key: const ValueKey('campaign-cta-url'),
                                  width: halfWidth,
                                  semanticLabel: '深度目标 CTA 地址',
                                  hint: 'CTA 地址',
                                  initialValue: ctaUrl,
                                  onChanged: (value) =>
                                      updateDeepField(() => ctaUrl = value),
                                ),
                                _DeepBriefField(
                                  key: const ValueKey('campaign-reward-rule'),
                                  width: constraints.maxWidth,
                                  semanticLabel: '深度目标奖励规则',
                                  hint: '奖励规则',
                                  initialValue: rewardRule,
                                  onChanged: (value) =>
                                      updateDeepField(() => rewardRule = value),
                                ),
                                _DeepBriefField(
                                  key: const ValueKey(
                                    'campaign-attribution-window',
                                  ),
                                  width: halfWidth,
                                  semanticLabel: '深度目标归因窗口',
                                  hint: '归因窗口',
                                  initialValue: attributionWindow,
                                  onChanged: (value) => updateDeepField(
                                    () => attributionWindow = value,
                                  ),
                                ),
                                _DeepBriefField(
                                  key: const ValueKey(
                                    'campaign-attribution-model',
                                  ),
                                  width: halfWidth,
                                  semanticLabel: '深度目标归因模型',
                                  hint: '归因模型',
                                  initialValue: attributionModel,
                                  onChanged: (value) => updateDeepField(
                                    () => attributionModel = value,
                                  ),
                                ),
                                _DeepBriefField(
                                  key: const ValueKey(
                                    'campaign-settlement-basis',
                                  ),
                                  width: constraints.maxWidth,
                                  semanticLabel: '深度目标结算口径',
                                  hint: '结算口径',
                                  initialValue: settlementBasis,
                                  onChanged: (value) => updateDeepField(
                                    () => settlementBasis = value,
                                  ),
                                ),
                              ],
                            );
                          },
                        ),
                        const SizedBox(height: 10),
                        Container(
                          key: const ValueKey('composer-deep-governance'),
                          padding: const EdgeInsets.all(11),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFF8F8),
                            border: Border.all(color: const Color(0xFFFFD6DA)),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Column(
                            children: [
                              Row(
                                children: [
                                  const Expanded(
                                    child: Text(
                                      '合规与发布约束',
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w900,
                                      ),
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 7,
                                      vertical: 4,
                                    ),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFFFE6E9),
                                      borderRadius: BorderRadius.circular(999),
                                    ),
                                    child: const Text(
                                      '平台锁定',
                                      style: TextStyle(
                                        color: Color(0xFFC62836),
                                        fontSize: 8,
                                        fontWeight: FontWeight.w900,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 9),
                              for (final rule in _deepComplianceRules) ...[
                                _DeepComplianceRule(
                                  icon: rule.$1,
                                  title: rule.$2,
                                  summary: rule.$3,
                                ),
                                const SizedBox(height: 7),
                              ],
                              const Divider(height: 18),
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      restrictionConflict
                                          ? '品牌限制与平台规则冲突'
                                          : '3 项规则已纳入 Contract',
                                      style: TextStyle(
                                        color: restrictionConflict
                                            ? const Color(0xFFC62836)
                                            : const Color(0xFF147542),
                                        fontSize: 9,
                                        fontWeight: FontWeight.w900,
                                      ),
                                    ),
                                  ),
                                  TextButton(
                                    key: const ValueKey(
                                      'composer-compliance-details',
                                    ),
                                    onPressed: () async {
                                      final next =
                                          await _openComplianceComposer(
                                            brandRestrictions,
                                          );
                                      if (next == null ||
                                          !sheetContext.mounted) {
                                        return;
                                      }
                                      updateDeepField(
                                        () => brandRestrictions = next,
                                      );
                                    },
                                    child: const Text('查看详情 ›'),
                                  ),
                                ],
                              ),
                              SizedBox(
                                width: double.infinity,
                                child: OutlinedButton.icon(
                                  key: const ValueKey(
                                    'composer-brand-restrictions',
                                  ),
                                  onPressed: () async {
                                    final next = await _openComplianceComposer(
                                      brandRestrictions,
                                    );
                                    if (next == null || !sheetContext.mounted) {
                                      return;
                                    }
                                    updateDeepField(
                                      () => brandRestrictions = next,
                                    );
                                  },
                                  icon: const Icon(Icons.add_rounded, size: 16),
                                  label: Text(
                                    brandRestrictions.trim().isEmpty
                                        ? '添加品牌补充限制'
                                        : '已补充品牌限制',
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),
                        const Row(
                          children: [
                            Expanded(
                              child: Text(
                                '发布连接器',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                            ),
                            Text(
                              '审批及合规检查通过后解锁',
                              style: TextStyle(
                                color: Color(0xFF147542),
                                fontSize: 8,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 3),
                        const Text(
                          '选择纳入本次 Contract 的渠道；修改选择会重置发布检查，不会自动对外发送。',
                          style: TextStyle(
                            color: AirvanaColors.muted,
                            fontSize: 8,
                            height: 1.5,
                          ),
                        ),
                        const SizedBox(height: 9),
                        GridView.count(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          crossAxisCount: 2,
                          mainAxisSpacing: 7,
                          crossAxisSpacing: 7,
                          childAspectRatio: 2.15,
                          children: [
                            for (final connector in _deepConnectors)
                              _DeepConnectorTile(
                                key: ValueKey(
                                  'composer-connector-${connector.$1}',
                                ),
                                label: connector.$2,
                                iconText: connector.$3,
                                hint: connector.$4,
                                iconBackground: connector.$5,
                                iconColor: connector.$6,
                                selected: connectorIds.contains(connector.$1),
                                onTap: () {
                                  updateDeepField(() {
                                    connectorIds.contains(connector.$1)
                                        ? connectorIds.remove(connector.$1)
                                        : connectorIds.add(connector.$1);
                                  });
                                },
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }

  void _runComposerPrimaryAction() {
    final prompt = _ideaController.text.trim();
    if (prompt.length < 12) {
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(const SnackBar(content: Text('请先填写至少 12 个字的创意，再进入创作。')));
      return;
    }
    setState(() {
      _composerOpen = false;
      _stage = 1;
      _saved = false;
    });
    _saveDraft();
  }

  void _applyTemplate(int index) {
    final playable = LegacyDemoCatalog.playables[index];
    final powerIds = index == 1
        ? <String>['challenge', 'communityChallenge']
        : index == 2
        ? <String>['npc', 'questBranch']
        : <String>['challenge', 'timerScore'];
    final category = index == 1
        ? 'social'
        : index == 2
        ? 'narrative'
        : 'mechanics';
    final prompt =
        '参考首页「${playable.title}」的互动结构，创建一个面向新 Campaign 的 Agentic Playable。保留互动结构，不复制原 Campaign 的品牌声明、CTA、地区、归因或结算规则。';
    setState(() {
      _createHomeTab = 'abilities';
      _selectedPowerCategory = category;
      _selectedPowerIds
        ..clear()
        ..addAll(powerIds);
      _ideaController.text = prompt;
      _ideaController.selection = TextSelection.collapsed(
        offset: prompt.length,
      );
      _powerNotice = '已选用「${playable.title}」模板，并恢复完整能力结构。';
      _saved = false;
    });
    _saveDraft();
  }

  void _answer(String answer) {
    setState(() {
      _answers[_questionIndex] = answer;
      if (_questionIndex < _questions.length - 1) {
        _questionIndex += 1;
      } else {
        _stage = 2;
      }
    });
    _saveDraft();
  }

  void _skipQuestion() => _answer(_questions[_questionIndex].$3);

  static _PowerDefinition? _powerById(String id) {
    for (final power in _powerCatalog) {
      if (power.id == id) return power;
    }
    return null;
  }

  List<String> get _recommendedPowerIds {
    final normalized = _ideaController.text.toLowerCase();
    final selectedCategories = _selectedPowerIds
        .map(_powerById)
        .whereType<_PowerDefinition>()
        .map((power) => power.category)
        .toSet();
    final ids = <String>[
      if (RegExp(r'摄像头|相机|\bar\b').hasMatch(normalized)) 'cameraAr',
      if (RegExp(r'摇晃|倾斜|陀螺仪|体感').hasMatch(normalized)) 'motionHaptic',
      if (RegExp(r'社区|排行|挑战|互动参与').hasMatch(normalized)) ...[
        'challenge',
        'communityChallenge',
        'timerScore',
      ],
      if (RegExp(r'视频|短片').hasMatch(normalized)) 'video',
      if (RegExp(r'角色|剧情|npc|故事').hasMatch(normalized)) ...[
        'npc',
        'questBranch',
      ],
      if (RegExp(r'音频|音乐|配音|声音').hasMatch(normalized)) ...[
        'audioVoice',
        'microphoneVoice',
      ],
      if (!selectedCategories.contains('content')) 'coverLocale',
      if (!selectedCategories.contains('mechanics')) 'challenge',
      if (!selectedCategories.contains('operations')) 'draftPreview',
      'challenge',
      'video',
      'npc',
      'draftPreview',
      'versionLifecycle',
      'shareEngagement',
    ];
    return ids
        .toSet()
        .where((id) => _powerById(id)?.visibleInCatalog == true)
        .take(8)
        .toList(growable: false);
  }

  String _recommendationLabelFor(_PowerDefinition power) {
    final normalized = _ideaController.text.toLowerCase();
    final goalMatch = switch (power.id) {
      'cameraAr' => RegExp(r'摄像头|相机|\bar\b').hasMatch(normalized),
      'motionHaptic' => RegExp(r'摇晃|倾斜|陀螺仪|体感').hasMatch(normalized),
      'challenge' ||
      'communityChallenge' ||
      'timerScore' => RegExp(r'社区|排行|挑战|互动参与').hasMatch(normalized),
      'video' => RegExp(r'视频|短片').hasMatch(normalized),
      'npc' || 'questBranch' => RegExp(r'角色|剧情|npc|故事').hasMatch(normalized),
      'audioVoice' ||
      'microphoneVoice' => RegExp(r'音频|音乐|配音|声音').hasMatch(normalized),
      _ => false,
    };
    if (goalMatch) return '按目标推荐';
    final selectedCategories = _selectedPowerIds
        .map(_powerById)
        .whereType<_PowerDefinition>()
        .map((item) => item.category)
        .toSet();
    if ((power.id == 'coverLocale' &&
            !selectedCategories.contains('content')) ||
        (power.id == 'challenge' &&
            !selectedCategories.contains('mechanics')) ||
        (power.id == 'draftPreview' &&
            !selectedCategories.contains('operations'))) {
      return '缺失能力补全';
    }
    return '热门组合';
  }

  List<_PowerDefinition> get _visibleComposerPowers {
    final allowed = _powerCatalog.where(
      (power) => power.visibleInCatalog && (_deepMode || power.quickAllowed),
    );
    final query = _powerSearchController.text.trim().toLowerCase();
    if (query.isNotEmpty) {
      return allowed
          .where(
            (power) =>
                power.title.toLowerCase().contains(query) ||
                power.description.toLowerCase().contains(query) ||
                power.requirement.toLowerCase().contains(query),
          )
          .toList(growable: false);
    }
    if (_selectedPowerCategory == 'recommended') {
      final recommended = _recommendedPowerIds;
      return recommended
          .map(_powerById)
          .whereType<_PowerDefinition>()
          .where((power) => _deepMode || power.quickAllowed)
          .toList(growable: false);
    }
    return allowed
        .where((power) => power.category == _selectedPowerCategory)
        .toList(growable: false);
  }

  void _setDeepMode(bool deep) {
    final blocked = _selectedPowerIds
        .map(_powerById)
        .whereType<_PowerDefinition>()
        .where((power) => !power.quickAllowed)
        .map((power) => power.title)
        .toList(growable: false);
    setState(() {
      _deepMode = deep;
      if (!deep && blocked.isNotEmpty) {
        _selectedPowerIds.removeWhere(
          (id) => _powerById(id)?.quickAllowed == false,
        );
        _composerConnectorIds.clear();
        _powerNotice = '已安全降级：移除 ${blocked.join('、')}；快速模式不启用外部分发与商业能力。';
      } else {
        if (!deep) _composerConnectorIds.clear();
        _powerNotice = deep ? '深度模式仅解锁前端配置；Contract、审批与真实连接器仍需服务端确认。' : null;
      }
    });
    _saveDraft();
  }

  Future<void> _toggleComposerPower(_PowerDefinition power) async {
    if (!power.quickAllowed && !_deepMode) {
      setState(() {
        _powerNotice =
            '「${power.title}」需要深度模式、Campaign Contract 与人工审批；快速模式保持锁定。';
      });
      return;
    }
    if (_selectedPowerIds.contains(power.id)) {
      setState(() {
        _selectedPowerIds.remove(power.id);
        _powerNotice = '已移除「${power.title}」，Review 状态需重新确认。';
      });
      _saveDraft();
      return;
    }

    String? conflictingId;
    for (final candidate in power.conflicts) {
      if (_selectedPowerIds.contains(candidate)) {
        conflictingId = candidate;
        break;
      }
    }
    if (conflictingId != null && mounted) {
      final existing = _powerById(conflictingId);
      final replace = await showDialog<bool>(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: const Text('配置冲突'),
          content: Text(
            '「${power.title}」与「${existing?.title ?? conflictingId}」会争用同一设备交互。请选择保留现有能力，或替换为新能力。',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('保留现有能力'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(dialogContext, true),
              child: Text('改用 ${power.title}'),
            ),
          ],
        ),
      );
      if (replace != true || !mounted) return;
      setState(() => _selectedPowerIds.remove(conflictingId));
    }

    final addedDependencies = <String>[];
    for (final dependencyId in power.dependencies) {
      final dependency = _powerById(dependencyId);
      if (dependency != null && !_selectedPowerIds.contains(dependencyId)) {
        _selectedPowerIds.add(dependencyId);
        addedDependencies.add(dependency.title);
      }
    }
    setState(() {
      _selectedPowerIds.add(power.id);
      _powerNotice = addedDependencies.isEmpty
          ? power.support == _PowerSupport.approval
                ? '已启用「${power.title}」前端配置；Contract、审批与真实执行仍需服务端确认。'
                : '已启用「${power.title}」；生成前仍需 Review。'
          : '已启用「${power.title}」，并补全依赖：${addedDependencies.join('、')}。';
    });
    _saveDraft();
  }

  Future<void> _startGeneration({bool forceNew = false}) async {
    if (_generationRequestInFlight) return;
    _generationTimer?.cancel();
    setState(() {
      _generationRequestInFlight = true;
      _stage = 4;
      if (forceNew) _generationIndex = 0;
      _cancelled = false;
    });
    try {
      if (!await _saveDraft()) return;
      final draftId = _draftId;
      if (draftId == null) {
        throw StateError('草稿尚未获得 draft_id，不能启动生成。');
      }
      var task = await widget.workflowRepository.startOrResumeGeneration(
        draftId,
        taskId: forceNew ? null : _taskId,
        forceNew: forceNew,
      );
      _validateAndApplyTask(task);
      if (task.status == LocalGenerationStatus.completed) {
        if (mounted) setState(() {});
        _syncRoute();
        await _saveDraft();
        return;
      }
      if (task.status == LocalGenerationStatus.cancelled ||
          task.status == LocalGenerationStatus.failed) {
        task = await widget.workflowRepository.startOrResumeGeneration(
          draftId,
          forceNew: true,
        );
        _generationIndex = 0;
        _validateAndApplyTask(task);
      }
      if (task.status == LocalGenerationStatus.paused) {
        task = await widget.workflowRepository.resumeGeneration(task.taskId);
        _validateAndApplyTask(task);
      }
      if (task.status == LocalGenerationStatus.queued) {
        task = await widget.workflowRepository.updateGeneration(
          task.taskId,
          LocalGenerationStatus.running,
        );
        _validateAndApplyTask(task);
      }
      if (!mounted) return;
      setState(() {
        _stage = 4;
        _cancelled = false;
      });
      _syncRoute();
      await _saveDraft();
      _runGenerationTimer();
    } catch (error) {
      if (mounted) {
        setState(() {
          _cancelled = true;
          _powerNotice = '生成任务无法启动或恢复：$error';
        });
      }
    } finally {
      if (mounted) setState(() => _generationRequestInFlight = false);
    }
  }

  void _runGenerationTimer() {
    _generationTimer?.cancel();
    _generationTimer = Timer.periodic(const Duration(milliseconds: 650), (
      timer,
    ) {
      if (!mounted || _cancelled) {
        timer.cancel();
        return;
      }
      if (_generationIndex >= _generationSteps.length - 1) {
        timer.cancel();
        unawaited(_finishGeneration());
        return;
      }
      setState(() => _generationIndex += 1);
      unawaited(_saveDraft());
    });
  }

  Future<void> _finishGeneration() async {
    final taskId = _taskId;
    if (taskId == null) return;
    try {
      final task = await widget.workflowRepository.updateGeneration(
        taskId,
        LocalGenerationStatus.completed,
      );
      _validateAndApplyTask(task);
      if (!mounted) return;
      setState(() {
        _stage = 5;
        _generationIndex = _generationSteps.length - 1;
      });
      await _saveDraft();
    } catch (error) {
      if (mounted) {
        setState(() {
          _cancelled = true;
          _powerNotice = '生成完成状态保存失败：$error';
        });
      }
    }
  }

  Future<void> _cancelGeneration() async {
    _generationTimer?.cancel();
    setState(() => _cancelled = true);
    final taskId = _taskId;
    if (taskId != null) {
      try {
        final task = await widget.workflowRepository.cancelGeneration(taskId);
        _validateAndApplyTask(task);
      } catch (error) {
        if (mounted) {
          setState(() => _powerNotice = '取消生成失败：$error');
        }
      }
    }
    await _saveDraft();
  }

  String get _workTitle {
    final idea = _ideaController.text;
    // 占位默认文案不参与主题推导，避免生成无意义标题。
    if (idea.trim() == _defaultIdea.trim()) return '玩家互动挑战';
    final derived = deriveThemeTitle(idea);
    return derived.isEmpty ? '玩家互动挑战' : derived;
  }

  void _coverPath(String path) {
    _coveredPaths.add(path);
    unawaited(_saveDraft());
  }

  void _previewStart() {
    setState(() {
      _previewStatus = 'running';
      _previewCharge = 0;
      _previewPlatform = 0;
      _previewScore = 0;
    });
    unawaited(_saveDraft());
  }

  void _previewCharge25() {
    if (_previewStatus != 'running') return;
    setState(() {
      _previewCharge = (_previewCharge + 25).clamp(0, 100);
    });
  }

  void _previewJump() {
    if (_previewStatus != 'running') return;
    setState(() {
      if (_previewCharge < 25 || _previewCharge > 85) {
        _previewStatus = 'failure';
        _previewCharge = 0;
        _coverPath('failure');
        return;
      }
      _previewPlatform += 1;
      _previewScore = _previewPlatform;
      _previewCharge = 0;
      if (_previewPlatform >= 6) {
        _previewStatus = 'success';
        _coverPath('success');
      }
    });
  }

  void _previewRetry() {
    setState(() {
      _previewStatus = 'running';
      _previewCharge = 0;
      _previewPlatform = 0;
      _previewScore = 0;
      _coverPath('retry');
    });
  }

  void _previewExit() {
    setState(() {
      _previewStatus = 'exited';
      _coverPath('exit');
    });
  }

  void _previewForceFailure() {
    if (_previewStatus != 'running') return;
    setState(() {
      _previewStatus = 'failure';
      _previewCharge = 0;
      _coverPath('failure');
    });
  }

  bool get _allPathsCovered => const {
    'success',
    'failure',
    'retry',
    'exit',
  }.every(_coveredPaths.contains);

  Future<void> _publishPlayable() =>
      widget.workflowRepository.serverPublishingEnabled
      ? _publishServerPlayable()
      : _publishLocalPlayable();

  Future<void> _publishServerPlayable() async {
    if (_publishRequestInFlight) return;
    if (_deepMode) {
      setState(() {
        _powerNotice =
            '发布被阻止：Campaign 模式尚未选择已批准的 Campaign Contract 和当前 KOL 的参与资格。';
      });
      return;
    }
    final draftId = _draftId;
    if (draftId == null) {
      setState(() => _powerNotice = '发布被阻止：草稿尚未获得 draft_id。');
      return;
    }
    setState(() {
      _publishRequestInFlight = true;
      _powerNotice = '正在提交服务端 Agent 生成任务…';
    });
    try {
      final release = await widget.workflowRepository.publishServerPlayable(
        title: _workTitle,
        prompt: _ideaController.text,
        deepMode: _deepMode,
        idempotencyKey: 'flutter:$draftId:${_versionId ?? 'v1'}',
        existingTaskId: _serverTaskId,
        onProgress: (progress) {
          if (!mounted) return;
          setState(() {
            _serverTaskId = progress.taskId;
            _serverContentId = progress.contentId;
            _serverCreationStatus = progress.status;
            _powerNotice =
                '服务端任务 ${progress.taskId} · ${progress.status} · ${progress.progress}%';
          });
          unawaited(_saveDraft());
        },
      );
      if (!mounted) return;
      setState(() {
        _serverRelease = release;
        _serverTaskId = release.taskId;
        _serverContentId = release.contentId;
        _serverCreationStatus = 'published';
        _stage = 7;
        _saved = true;
        _powerNotice = null;
      });
      await _saveDraft();
      widget.onPublished?.call();
    } catch (error) {
      if (mounted) {
        setState(() {
          _powerNotice = '服务端发布未完成，不展示发布成功：$error';
        });
        await _saveDraft();
      }
    } finally {
      if (mounted) setState(() => _publishRequestInFlight = false);
    }
  }

  Future<void> _publishLocalPlayable() async {
    if (_publishRequestInFlight) return;
    final taskId = _taskId;
    final versionId = _versionId;
    if (taskId == null || versionId == null) {
      setState(() {
        _powerNotice = '发布被阻止：生成 task_id 或 version_id 尚未恢复。';
      });
      return;
    }
    setState(() {
      _publishRequestInFlight = true;
      _powerNotice = null;
    });
    try {
      final release = await widget.workflowRepository.publishLocalPlayable(
        LocalReleaseRequest(
          generationTaskId: taskId,
          title: _workTitle,
          summary: _ideaController.text,
          contentType: 'game',
          authorName: 'Kai Chen',
          visibility: switch (_visibilityChoice) {
            2 => LocalVisibility.unlistedLocal,
            3 => LocalVisibility.privateLocal,
            _ => LocalVisibility.publicLocal,
          },
          remixPolicy: _visibilityChoice == 1
              ? LocalRemixPolicy.localWithAttribution
              : LocalRemixPolicy.disabled,
          localReviewPassed: _approved,
        ),
      );
      if (release.generationTaskId != taskId ||
          release.versionId != versionId) {
        throw StateError('发布返回的 task_id/version_id 与当前生成版本不一致。');
      }
      if (!mounted) return;
      setState(() {
        _release = release;
        _stage = 7;
        _saved = true;
      });
      widget.onPublished?.call();
    } catch (error) {
      if (mounted) {
        setState(() {
          _powerNotice = '发布失败，未进入已发布状态：$error';
        });
      }
    } finally {
      if (mounted) setState(() => _publishRequestInFlight = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_restoring) {
      return const Scaffold(
        backgroundColor: AirvanaColors.canvas,
        body: AppStateView(
          icon: Icons.drafts_outlined,
          title: '正在恢复创作现场',
          message: '正在根据 URL 中的 draft_id、task_id 和 version_id 核对草稿与生成任务。',
        ),
      );
    }
    final restoreError = _restoreError;
    if (restoreError != null) {
      return Scaffold(
        backgroundColor: AirvanaColors.canvas,
        body: AppStateView(
          icon: Icons.link_off_rounded,
          title: '无法恢复该创作链接',
          message: restoreError,
          actionLabel: '新建草稿',
          onAction: () => context.go('/create'),
        ),
      );
    }
    if (_composerOpen) return _legacyComposer(context);
    return Scaffold(
      backgroundColor: AirvanaColors.canvas,
      body: SafeArea(
        child: Column(
          children: [
            _WorkspaceHeader(
              saved: _saved,
              onBack: () {
                setState(() => _composerOpen = true);
                unawaited(_saveDraft());
              },
              onSave: _saveDraft,
            ),
            _Progress(stage: _stage, steps: _steps),
            Expanded(
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 220),
                child: SingleChildScrollView(
                  key: ValueKey(_stage),
                  padding: const EdgeInsets.fromLTRB(18, 16, 18, 128),
                  child: _body(),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _legacyComposer(BuildContext context) {
    if (_createHomeTab == 'templates') return _templateHome(context);
    final visiblePowers = _visibleComposerPowers;
    final searching = _powerSearchController.text.trim().isNotEmpty;
    final viewportHeight = MediaQuery.sizeOf(context).height;
    final introHeight = (viewportHeight * (viewportHeight < 700 ? .36 : .38))
        .clamp(210.0, 344.0)
        .toDouble();
    final safeTop = MediaQuery.paddingOf(context).top;
    final safeBottom = MediaQuery.paddingOf(context).bottom;
    final narrow = MediaQuery.sizeOf(context).width <= 374;
    final modeInk = _deepMode ? const Color(0xFF07191B) : Colors.white;
    final modeAccent = _deepMode
        ? const Color(0xFF007E86)
        : const Color(0xFFFF3B62);
    return Scaffold(
      backgroundColor: const Color(0xFF0E0E10),
      body: Stack(
        children: [
          Positioned.fill(
            child: Column(
              children: [
                Container(
                  key: const ValueKey('legacy-composer-intro'),
                  height: introHeight + safeTop,
                  padding: EdgeInsets.fromLTRB(
                    narrow ? 14 : 18,
                    safeTop + 20,
                    narrow ? 14 : 18,
                    13,
                  ),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: _deepMode
                          ? const [
                              Color(0xFF18E4DF),
                              Color(0xFF00C8D4),
                              Color(0xFF16A8E8),
                            ]
                          : const [
                              Color(0xFFFF5968),
                              Color(0xFFFF3B74),
                              Color(0xFFB62EE8),
                            ],
                      stops: const [0, .52, 1],
                    ),
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          IconButton(
                            key: const ValueKey('legacy-composer-close'),
                            tooltip: '关闭创作器',
                            onPressed: () => _exitCreate(context),
                            icon: const Icon(Icons.close_rounded),
                            color: modeInk,
                          ),
                          const Spacer(),
                          Container(
                            padding: const EdgeInsets.all(3),
                            decoration: BoxDecoration(
                              color: const Color(0xFF20171A),
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Row(
                              children: [
                                _ModeButton(
                                  label: '快速',
                                  icon: Icons.bolt_rounded,
                                  selected: !_deepMode,
                                  selectedColor: const Color(0xFFFF3B62),
                                  onTap: () => _setDeepMode(false),
                                ),
                                _ModeButton(
                                  label: '深度',
                                  icon: Icons.lock_outline_rounded,
                                  selected: _deepMode,
                                  selectedColor: const Color(0xFF007E86),
                                  onTap: () => _setDeepMode(true),
                                ),
                              ],
                            ),
                          ),
                          const Spacer(),
                          const SizedBox(width: 48),
                        ],
                      ),
                      Expanded(
                        child: TextField(
                          key: const ValueKey('legacy-composer-input'),
                          controller: _ideaController,
                          onChanged: (_) => setState(() => _saved = false),
                          expands: true,
                          minLines: null,
                          maxLines: null,
                          textAlignVertical: TextAlignVertical.top,
                          style: TextStyle(
                            color: modeInk,
                            fontSize: 17,
                            fontWeight: FontWeight.w500,
                            height: 1.45,
                          ),
                          decoration: InputDecoration(
                            border: InputBorder.none,
                            contentPadding: const EdgeInsets.fromLTRB(
                              2,
                              16,
                              2,
                              8,
                            ),
                            hintText: '描述你想创作的游戏玩法、角色或互动挑战',
                            hintStyle: TextStyle(
                              color: _deepMode
                                  ? const Color(0x7A07191B)
                                  : Colors.white.withValues(alpha: .68),
                            ),
                          ),
                        ),
                      ),
                      Row(
                        children: [
                          _ComposerTool(
                            icon: Icons.mic_none_rounded,
                            label: '语音转文字',
                            dark: _deepMode,
                            badge: null,
                            onTap: _openVoiceComposer,
                          ),
                          const SizedBox(width: 8),
                          _ComposerTool(
                            icon: Icons.auto_awesome_rounded,
                            label: 'AI 灵感',
                            dark: _deepMode,
                            badge: null,
                            onTap: _openInspirationComposer,
                          ),
                          const SizedBox(width: 8),
                          _ComposerTool(
                            icon: Icons.image_outlined,
                            label: '项目素材',
                            dark: _deepMode,
                            badge: _composerAssetIds.isEmpty
                                ? null
                                : '${_composerAssetIds.length}',
                            onTap: _openAssetComposer,
                          ),
                          const SizedBox(width: 8),
                          _ComposerTool(
                            icon: Icons.track_changes_rounded,
                            label: '创作问答',
                            dark: _deepMode,
                            badge:
                                [
                                  _composerGoalObjective,
                                  _composerGoalAudience,
                                  _composerGoalSuccessEvent,
                                  _composerGoalCta,
                                ].where((value) => value.isNotEmpty).isEmpty
                                ? null
                                : '${[_composerGoalObjective, _composerGoalAudience, _composerGoalSuccessEvent, _composerGoalCta].where((value) => value.isNotEmpty).length}/4',
                            onTap: _openGoalsComposer,
                          ),
                          const Spacer(),
                          FilledButton.icon(
                            key: const ValueKey('legacy-composer-submit'),
                            onPressed: _runComposerPrimaryAction,
                            style: FilledButton.styleFrom(
                              backgroundColor: Colors.white,
                              foregroundColor: modeAccent,
                              minimumSize: const Size(92, 43),
                              padding: const EdgeInsets.symmetric(
                                horizontal: 13,
                              ),
                            ),
                            icon: const Icon(Icons.send_rounded, size: 18),
                            label: Text(
                              _ideaController.text.trim().isEmpty
                                  ? '填写创意'
                                  : _ideaController.text.trim().length < 12
                                  ? '继续完善'
                                  : _deepMode
                                  ? '生成 Brief'
                                  : '进入创作',
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: Container(
                    key: const ValueKey('legacy-power-sheet'),
                    width: double.infinity,
                    padding: const EdgeInsets.fromLTRB(16, 18, 16, 0),
                    decoration: const BoxDecoration(
                      color: Color(0xFF0E0E10),
                      borderRadius: BorderRadius.vertical(
                        top: Radius.circular(28),
                      ),
                    ),
                    child: SingleChildScrollView(
                      key: const ValueKey('composer-power-scroll'),
                      physics: const ClampingScrollPhysics(),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '能力编排',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 16,
                                      fontWeight: FontWeight.w900,
                                    ),
                                  ),
                                  SizedBox(height: 3),
                                  Text(
                                    '组合原子能力，补全玩法与运行需求',
                                    style: TextStyle(
                                      color: Colors.white54,
                                      fontSize: 10,
                                    ),
                                  ),
                                ],
                              ),
                              const Spacer(),
                              IconButton(
                                key: const ValueKey('composer-power-search'),
                                tooltip: '搜索 Power 能力',
                                onPressed: () {
                                  setState(() {
                                    _powerSearchOpen = !_powerSearchOpen;
                                    if (!_powerSearchOpen) {
                                      _powerSearchController.clear();
                                    }
                                  });
                                },
                                style: IconButton.styleFrom(
                                  minimumSize: const Size(38, 38),
                                  maximumSize: const Size(38, 38),
                                  backgroundColor: const Color(0xFF242428),
                                  foregroundColor: Colors.white,
                                ),
                                icon: Icon(
                                  _powerSearchOpen
                                      ? Icons.close_rounded
                                      : Icons.search_rounded,
                                ),
                              ),
                            ],
                          ),
                          if (_powerSearchOpen) ...[
                            const SizedBox(height: 10),
                            TextField(
                              key: const ValueKey(
                                'composer-power-search-field',
                              ),
                              controller: _powerSearchController,
                              autofocus: true,
                              onChanged: (_) => setState(() {}),
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                              ),
                              decoration: InputDecoration(
                                hintText: '搜索能力、场景或目标',
                                hintStyle: const TextStyle(
                                  color: Colors.white38,
                                ),
                                prefixIcon: const Icon(
                                  Icons.search_rounded,
                                  color: Colors.white54,
                                  size: 18,
                                ),
                                filled: true,
                                fillColor: const Color(0xFF19191C),
                                contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 10,
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: const BorderSide(
                                    color: Color(0xFF303034),
                                  ),
                                ),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: const BorderSide(
                                    color: AirvanaColors.accent,
                                  ),
                                ),
                              ),
                            ),
                          ],
                          const SizedBox(height: 13),
                          SingleChildScrollView(
                            key: const ValueKey(
                              'composer-power-category-scroll',
                            ),
                            scrollDirection: Axis.horizontal,
                            child: Row(
                              children: _powerCategories
                                  .map(
                                    (category) => _ComposerCategory(
                                      category.$2,
                                      _selectedPowerCategory == category.$1,
                                      key: ValueKey(
                                        'composer-power-category-${category.$1}',
                                      ),
                                      onTap: () => setState(() {
                                        _selectedPowerCategory = category.$1;
                                        _powerNotice = null;
                                      }),
                                    ),
                                  )
                                  .toList(growable: false),
                            ),
                          ),
                          const SizedBox(height: 5),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Text(
                                  searching
                                      ? '正在搜索 Power 能力'
                                      : _powerCategoryHints[_selectedPowerCategory] ??
                                            '',
                                  style: const TextStyle(
                                    color: Color(0xFF77777D),
                                    fontSize: 9,
                                    height: 1.45,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Text(
                                searching
                                    ? '搜索结果 ${visiblePowers.length} 项'
                                    : _selectedPowerCategory == 'recommended'
                                    ? '动态推荐 ${_recommendedPowerIds.length} 项'
                                    : '当前分类 ${visiblePowers.length} 项',
                                style: const TextStyle(
                                  color: Color(0xFFA0A0A6),
                                  fontSize: 8,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ],
                          ),
                          if (_selectedPowerIds.isNotEmpty) ...[
                            const SizedBox(height: 8),
                            _ComposerPowerSelection(
                              powers: _selectedPowerIds
                                  .map(_powerById)
                                  .whereType<_PowerDefinition>()
                                  .toList(growable: false),
                              onRemove: _toggleComposerPower,
                              onClear: () {
                                setState(() {
                                  _selectedPowerIds.clear();
                                  _powerNotice = '已清空能力组合；生成前需重新 Review。';
                                });
                                _saveDraft();
                              },
                            ),
                          ],
                          if (_powerNotice != null) ...[
                            const SizedBox(height: 8),
                            Container(
                              key: const ValueKey('composer-power-notice'),
                              width: double.infinity,
                              padding: const EdgeInsets.symmetric(
                                horizontal: 11,
                                vertical: 8,
                              ),
                              decoration: BoxDecoration(
                                color: const Color(0xFF29191D),
                                borderRadius: BorderRadius.circular(11),
                                border: Border.all(
                                  color: const Color(0x665A3038),
                                ),
                              ),
                              child: Text(
                                _powerNotice!,
                                style: const TextStyle(
                                  color: Color(0xFFFF9AA3),
                                  fontSize: 8,
                                  height: 1.45,
                                ),
                              ),
                            ),
                          ],
                          const SizedBox(height: 10),
                          if (visiblePowers.isEmpty)
                            const _ComposerPowerEmpty()
                          else
                            GridView.builder(
                              key: ValueKey(
                                'composer-power-grid-$_selectedPowerCategory-${_powerSearchController.text}',
                              ),
                              padding: EdgeInsets.zero,
                              shrinkWrap: true,
                              physics: const NeverScrollableScrollPhysics(),
                              gridDelegate:
                                  const SliverGridDelegateWithFixedCrossAxisCount(
                                    crossAxisCount: 2,
                                    crossAxisSpacing: 10,
                                    mainAxisSpacing: 10,
                                    mainAxisExtent: 156,
                                  ),
                              itemCount: visiblePowers.length,
                              itemBuilder: (_, index) {
                                final power = visiblePowers[index];
                                return _ComposerPowerTile(
                                  key: ValueKey(
                                    'composer-power-card-${power.id}',
                                  ),
                                  power: power,
                                  selected: _selectedPowerIds.contains(
                                    power.id,
                                  ),
                                  recommendationLabel:
                                      _selectedPowerCategory == 'recommended' &&
                                          !searching
                                      ? _recommendationLabelFor(power)
                                      : null,
                                  onTap: () => _toggleComposerPower(power),
                                );
                              },
                            ),
                          SizedBox(height: 88 + safeBottom),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          Positioned(
            left: 0,
            right: 0,
            bottom: 17 + safeBottom,
            child: Center(
              child: _CreateHomeDock(
                selectedCount: _selectedPowerIds.length,
                selectedTab: 'abilities',
                onAbilities: () {},
                onTemplates: () => setState(() {
                  _createHomeTab = 'templates';
                  _selectedPowerCategory = 'recommended';
                }),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _templateHome(BuildContext context) {
    final templates = LegacyDemoCatalog.playables
        .take(6)
        .toList(growable: false);
    final safeBottom = MediaQuery.paddingOf(context).bottom;
    return Scaffold(
      key: const ValueKey('create-template-home'),
      backgroundColor: const Color(0xFFF2F2F7),
      body: SafeArea(
        bottom: false,
        child: Stack(
          children: [
            Positioned.fill(
              child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 20, 16, 8),
                    child: Row(
                      children: [
                        IconButton(
                          key: const ValueKey('create-template-close'),
                          tooltip: '关闭模板',
                          onPressed: _showAbilityHome,
                          icon: const Icon(Icons.close_rounded),
                        ),
                        const Expanded(
                          child: Text(
                            '模板',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: AirvanaColors.ink,
                              fontSize: 19,
                              fontWeight: FontWeight.w900,
                              letterSpacing: -.3,
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 5,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFF1F2),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            '${templates.length} 个',
                            style: const TextStyle(
                              color: AirvanaColors.accent,
                              fontSize: 9,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Padding(
                    padding: EdgeInsets.fromLTRB(18, 0, 18, 10),
                    child: Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        '复用首页内容的互动结构，再补充新 Campaign 的目标与规则。',
                        style: TextStyle(
                          color: AirvanaColors.muted,
                          fontSize: 10,
                          height: 1.5,
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: GridView.builder(
                      key: const ValueKey('create-template-grid'),
                      padding: EdgeInsets.fromLTRB(14, 4, 14, 104 + safeBottom),
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            crossAxisSpacing: 12,
                            mainAxisSpacing: 12,
                            mainAxisExtent: 253,
                          ),
                      itemCount: templates.length,
                      itemBuilder: (_, index) => _CreateTemplateCard(
                        key: ValueKey('create-template-${templates[index].id}'),
                        playable: templates[index],
                        onTap: () => _applyTemplate(index),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Positioned(
              left: 0,
              right: 0,
              bottom: 17 + safeBottom,
              child: Center(
                child: _CreateHomeDock(
                  selectedCount: _selectedPowerIds.length,
                  selectedTab: 'templates',
                  templateSurface: true,
                  onAbilities: _showAbilityHome,
                  onTemplates: () {},
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _body() {
    return switch (_stage) {
      0 => _description(),
      1 => _question(),
      2 => _power(),
      3 => _review(),
      4 => _generation(),
      5 => _preview(),
      6 => _audit(),
      _ => _published(),
    };
  }

  Widget _description() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _LocalNotice(),
        const SizedBox(height: 18),
        Text(
          _deepMode ? '创建 Campaign Playable' : '描述你的创意',
          style: const TextStyle(fontSize: 23, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 6),
        Text(
          _deepMode ? '先定义品牌目标、授权边界和锁定字段。' : '文本、语音、参考图片、已授权素材和历史模板均保留为本机演示入口。',
          style: const TextStyle(color: AirvanaColors.muted, height: 1.5),
        ),
        const SizedBox(height: 14),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFFFF5367),
            borderRadius: BorderRadius.circular(24),
          ),
          child: Column(
            children: [
              TextField(
                key: const ValueKey('create-idea-input'),
                controller: _ideaController,
                onChanged: (_) => setState(() => _saved = false),
                minLines: 6,
                maxLines: 9,
                style: const TextStyle(color: Colors.white, fontSize: 15),
                decoration: const InputDecoration(
                  border: InputBorder.none,
                  hintText: '描述游戏玩法、角色或互动挑战…',
                  hintStyle: TextStyle(color: Colors.white70),
                ),
              ),
              Row(
                children: [
                  _RoundTool(
                    icon: Icons.mic_none_rounded,
                    label: '语音转文字',
                    onTap: () => _useComposerTool('语音转文字'),
                  ),
                  const SizedBox(width: 8),
                  _RoundTool(
                    icon: Icons.image_outlined,
                    label: '参考图片',
                    onTap: () => _useComposerTool('参考图片'),
                  ),
                  const SizedBox(width: 8),
                  _RoundTool(
                    icon: Icons.folder_copy_outlined,
                    label: '已授权素材与历史作品',
                    onTap: () => _useComposerTool('已授权素材与历史作品'),
                  ),
                  const Spacer(),
                  FilledButton.icon(
                    key: const ValueKey('start-creation'),
                    onPressed: () => _goTo(1),
                    style: FilledButton.styleFrom(
                      backgroundColor: Colors.white,
                      foregroundColor: AirvanaColors.accent,
                      minimumSize: const Size(126, 46),
                    ),
                    icon: const Icon(Icons.arrow_forward_rounded),
                    label: Text(_deepMode ? '生成 Brief' : '开始创作'),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        const _IntentCard(),
      ],
    );
  }

  Widget _question() {
    final question = _questions[_questionIndex];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _AssistantBubble(text: '我只询问会影响玩法或发布结果的信息；未回答项会明确使用安全默认值。'),
        const SizedBox(height: 18),
        _Panel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '关键问题 ${_questionIndex + 1} / ${_questions.length}',
                style: const TextStyle(
                  color: AirvanaColors.accent,
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 12),
              Text(
                question.$1,
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 14),
              ...question.$2.map(
                (option) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _Choice(label: option, onTap: () => _answer(option)),
                ),
              ),
              Center(
                child: TextButton(
                  onPressed: _skipQuestion,
                  child: Text('跳过，使用默认值：${question.$3}'),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _power() {
    final workflowPowers = _workflowPowerIds
        .map(_powerById)
        .whereType<_PowerDefinition>()
        .toList(growable: false);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Power 能力编排',
          style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 5),
        const Text(
          '快速模式已过滤外部连接器、商业归因、品牌结算、外部奖励及自动社媒运营。',
          style: TextStyle(color: AirvanaColors.muted, height: 1.45),
        ),
        const SizedBox(height: 14),
        ...workflowPowers.map((power) {
          final selected = _selectedPowerIds.contains(power.id);
          return Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: _Panel(
              child: Row(
                children: [
                  _SoftIcon(icon: power.icon),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          power.title,
                          style: const TextStyle(fontWeight: FontWeight.w900),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          power.description,
                          style: const TextStyle(
                            color: AirvanaColors.muted,
                            fontSize: 11,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          power.requirement,
                          style: TextStyle(
                            color: power.support == _PowerSupport.generatable
                                ? AirvanaColors.success
                                : AirvanaColors.muted,
                            fontSize: 9,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    key: ValueKey('power-${power.id}'),
                    tooltip: selected
                        ? '移除 ${power.title}'
                        : '添加 ${power.title}',
                    onPressed: () => _toggleComposerPower(power),
                    icon: Icon(
                      selected ? Icons.check_circle : Icons.add_circle_outline,
                      color: selected
                          ? AirvanaColors.accent
                          : AirvanaColors.ink,
                    ),
                  ),
                ],
              ),
            ),
          );
        }),
        FilledButton(
          onPressed: _selectedPowerIds.length >= 3 ? () => _goTo(3) : null,
          child: Text('确认能力组合 · ${_selectedPowerIds.length}'),
        ),
      ],
    );
  }

  Widget _review() {
    final entries = <(String, String)>[
      ('标题和创意摘要', '$_workTitle · ${_ideaController.text}'),
      ('目标玩家', '移动端休闲玩家 · 单手操作'),
      ('核心玩法', '完成短局互动挑战'),
      ('操作方式', _answers[0] ?? _questions[0].$3),
      ('视觉风格', _answers[1] ?? _questions[1].$3),
      ('成功 / 失败 / 重试', '达成目标即成功；失误可立即重试'),
      (
        '已选 Power',
        _selectedPowerIds
            .map(_powerById)
            .whereType<_PowerDefinition>()
            .map((power) => power.title)
            .join('、'),
      ),
      (
        '站内可见性',
        (_answers[3] ?? _questions[3].$3) == '允许' ? '公开，可 Remix' : '公开，仅查看',
      ),
      ('Remix', _answers[3] ?? _questions[3].$3),
    ];
    if (_deepMode) {
      entries.addAll(const [
        ('Campaign Brief', '本机草案 · 待品牌方确认'),
        ('Campaign Contract', '未批准 · CTA / 奖励 / 地区字段锁定'),
        ('Asset Manifest', '3 项本机素材 · 授权状态待确认'),
        ('审批与 Kill Switch', '负责人待配置 · 不允许外部分发'),
      ]);
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '核对创作方案',
          style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 5),
        const Text(
          '逐项确认；确认不代表审核通过或已发布。',
          style: TextStyle(color: AirvanaColors.muted),
        ),
        const SizedBox(height: 14),
        ...entries.map(
          (entry) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: _ReviewRow(
              label: entry.$1,
              value: entry.$2,
              onEdit: () => _goTo(0),
            ),
          ),
        ),
        const SizedBox(height: 8),
        FilledButton(
          key: const ValueKey('confirm-generate'),
          onPressed: _generationRequestInFlight
              ? null
              : () => _startGeneration(),
          child: Text(_deepMode ? '确认 Brief 并生成 Contract 草案' : '确认并开始创作'),
        ),
      ],
    );
  }

  Widget _generation() {
    final progress = (_generationIndex + 1) / _generationSteps.length;
    return _Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '正在创建 Agentic Playable',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 6),
          Text(
            _cancelled
                ? 'paused · 已保存，可恢复'
                : _generationSteps[_generationIndex],
            style: const TextStyle(
              color: AirvanaColors.accent,
              fontWeight: FontWeight.w800,
            ),
          ),
          if (_taskId != null && _versionId != null) ...[
            const SizedBox(height: 8),
            Text(
              key: const ValueKey('generation-identity'),
              'task_id: $_taskId\nversion_id: $_versionId',
              style: const TextStyle(
                color: AirvanaColors.muted,
                fontSize: 9,
                height: 1.45,
              ),
            ),
          ],
          if (_powerNotice != null) ...[
            const SizedBox(height: 8),
            Text(
              _powerNotice!,
              style: const TextStyle(
                color: AirvanaColors.accent,
                fontSize: 9,
                height: 1.4,
              ),
            ),
          ],
          const SizedBox(height: 18),
          LinearProgressIndicator(
            value: _cancelled ? null : progress,
            minHeight: 7,
            borderRadius: BorderRadius.circular(99),
          ),
          const SizedBox(height: 18),
          ...List.generate(
            _generationSteps.length,
            (index) => _StatusRow(
              label: _generationSteps[index],
              done: index < _generationIndex,
              active: index == _generationIndex && !_cancelled,
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              OutlinedButton.icon(
                onPressed: _saveDraft,
                icon: const Icon(Icons.drafts_outlined),
                label: const Text('退出并存草稿'),
              ),
              const Spacer(),
              if (_cancelled)
                FilledButton(
                  onPressed: _generationRequestInFlight
                      ? null
                      : () => _startGeneration(),
                  child: const Text('恢复生成'),
                )
              else
                TextButton(
                  onPressed: _cancelGeneration,
                  child: const Text('取消生成'),
                ),
            ],
          ),
          const Text(
            '各阶段由本地状态机推进；未调用生成、审核或发布服务。',
            style: TextStyle(color: AirvanaColors.muted, fontSize: 9),
          ),
        ],
      ),
    );
  }

  Widget _preview() {
    return Column(
      children: [
        _Panel(
          child: Column(
            children: [
              Row(
                children: [
                  const Text('Chat / '),
                  const Text(
                    'Preview',
                    style: TextStyle(
                      fontWeight: FontWeight.w900,
                      color: AirvanaColors.accent,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    _versionId ?? '版本标识待恢复',
                    style: const TextStyle(
                      fontSize: 9,
                      color: AirvanaColors.muted,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              Container(
                height: 320,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF14121B),
                  borderRadius: BorderRadius.circular(22),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _PreviewStat(
                          label: '得分',
                          value: '${_previewPlatform * 100}',
                        ),
                        _PreviewStat(label: '平台', value: '$_previewPlatform/6'),
                        _PreviewStat(label: '蓄力', value: '$_previewCharge%'),
                      ],
                    ),
                    const Spacer(),
                    Text(
                      _workTitle,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 21,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      switch (_previewStatus) {
                        'running' => '本局已开始',
                        'success' => '已完成 6 次有效落点',
                        'failure' => '失败路径完成',
                        'exited' => '已安全退出试玩',
                        _ => '等待开始',
                      },
                      style: const TextStyle(
                        color: Colors.white70,
                        fontSize: 12,
                      ),
                    ),
                    const Spacer(),
                    Row(
                      children: [
                        Expanded(
                          child: FilledButton(
                            key: const ValueKey('preview-primary'),
                            style: FilledButton.styleFrom(
                              backgroundColor: Colors.white,
                              foregroundColor: const Color(0xFF14121B),
                            ),
                            onPressed: switch (_previewStatus) {
                              'running' => _previewCharge25,
                              'success' || 'failure' => _previewRetry,
                              _ => _previewStart,
                            },
                            child: Text(switch (_previewStatus) {
                              'running' => '蓄力 +25%',
                              'success' || 'failure' => '重试本局',
                              _ => '开始试玩',
                            }),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: OutlinedButton(
                            key: const ValueKey('preview-secondary'),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: Colors.white,
                              side: const BorderSide(color: Colors.white38),
                            ),
                            onPressed: _previewStatus == 'running'
                                ? _previewJump
                                : null,
                            child: const Text('起跳'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        if (_previewStatus == 'running')
                          TextButton(
                            key: const ValueKey('preview-force-failure'),
                            onPressed: _previewForceFailure,
                            child: const Text(
                              '模拟失败',
                              style: TextStyle(
                                color: Colors.white70,
                                fontSize: 11,
                              ),
                            ),
                          ),
                        TextButton(
                          key: const ValueKey('preview-exit'),
                          onPressed: _previewStatus == 'exited'
                              ? null
                              : _previewExit,
                          child: const Text(
                            '退出',
                            style: TextStyle(
                              color: Colors.white70,
                              fontSize: 11,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        _Panel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Text(
                    '试玩路径验证',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900),
                  ),
                  const Spacer(),
                  Text(
                    _allPathsCovered
                        ? '4/4 路径已验证'
                        : '已验证 ${_coveredPaths.length}/4',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w900,
                      color: _allPathsCovered
                          ? const Color(0xFF147542)
                          : AirvanaColors.accent,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final entry in const [
                    ('success', '成功'),
                    ('failure', '失败'),
                    ('retry', '重试'),
                    ('exit', '退出'),
                  ])
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: _coveredPaths.contains(entry.$1)
                            ? const Color(0xFFEAF8EF)
                            : const Color(0xFFF2F2F7),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Text(
                        '${_coveredPaths.contains(entry.$1) ? '✓' : '○'} ${entry.$2}',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          color: _coveredPaths.contains(entry.$1)
                              ? const Color(0xFF147542)
                              : AirvanaColors.muted,
                        ),
                      ),
                    ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        FilledButton(
          key: const ValueKey('preview-submit-review'),
          onPressed: _allPathsCovered
              ? () {
                  if (!_visibilityInitialized) {
                    _visibilityChoice =
                        (_answers[3] ?? _questions[3].$3) == '允许' ? 1 : 0;
                    _visibilityInitialized = true;
                  }
                  _goTo(6);
                }
              : null,
          child: const Text('试玩通过 · 提交人工审核'),
        ),
        TextButton(
          onPressed: () => _goTo(3),
          child: const Text('返回 Chat 生成 Creative Patch'),
        ),
      ],
    );
  }

  Widget _audit() {
    const checks = ['内容安全', '素材完整性', '移动端可玩性', '状态机完整性', '权限安全降级', '站内发布信息'];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          '发布设置与人工审核',
          style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 12),
        _Panel(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _FieldLine(label: 'Playable 标题', value: _workTitle),
              const _FieldLine(label: '内容语言', value: '简体中文'),
              const SizedBox(height: 8),
              const Text(
                '可见性',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  for (final (index, label) in const [
                    (0, '公开，仅查看'),
                    (1, '公开，可 Remix'),
                    (2, '仅链接可见'),
                    (3, '私密草稿'),
                  ])
                    ChoiceChip(
                      key: ValueKey('visibility-choice-$index'),
                      label: Text(label),
                      selected: _visibilityChoice == index,
                      onSelected: (_) {
                        setState(() {
                          _visibilityChoice = index;
                          _visibilityInitialized = true;
                        });
                        unawaited(_saveDraft());
                      },
                    ),
                ],
              ),
              const SizedBox(height: 8),
              _FieldLine(
                label: 'Remix 权限',
                value: _visibilityChoice == 1 ? '已开启' : '默认关闭',
              ),
              const _FieldLine(label: '评论权限', value: '允许'),
              _FieldLine(
                label: '发布版本',
                value: _versionId ?? 'v1 · build-local-001',
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        _Panel(
          child: Column(
            children: checks
                .map((item) => _AuditRow(label: item, approved: _approved))
                .toList(),
          ),
        ),
        const SizedBox(height: 12),
        if (!_approved)
          FilledButton(
            onPressed: () {
              setState(() => _approved = true);
              unawaited(_saveDraft());
            },
            child: Text(
              widget.workflowRepository.serverPublishingEnabled
                  ? '确认试玩与发布信息'
                  : '模拟人工审核通过',
            ),
          )
        else
          FilledButton(
            key: const ValueKey('publish-local'),
            onPressed: _publishRequestInFlight ? null : _publishPlayable,
            child: Text(
              _publishRequestInFlight
                  ? widget.workflowRepository.serverPublishingEnabled
                        ? '服务端生成、审核与发布中…'
                        : '正在保存发布记录…'
                  : '发布到 Airvana APP',
            ),
          ),
        if (_powerNotice != null) ...[
          const SizedBox(height: 8),
          Text(
            _powerNotice!,
            style: const TextStyle(
              color: AirvanaColors.accent,
              fontSize: 10,
              height: 1.4,
            ),
          ),
        ],
        const SizedBox(height: 8),
        Text(
          widget.workflowRepository.serverPublishingEnabled
              ? '确认后将创建真实服务端 task；只有 worker、内容审核、Artifact 构建和发布接口全部通过才会显示成功。'
              : '结果仅代表本机审核演示，不代表服务端、应用市场或外部渠道审核。',
          style: const TextStyle(
            color: AirvanaColors.muted,
            fontSize: 10,
            height: 1.4,
          ),
        ),
      ],
    );
  }

  Widget _published() {
    final serverRelease = _serverRelease;
    if (serverRelease != null) {
      return _Panel(
        child: Column(
          children: [
            const _SoftIcon(icon: Icons.cloud_done_rounded, large: true),
            const SizedBox(height: 14),
            const Text(
              '已由服务端发布到 Airvana APP',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 10),
            Text(
              'task_id: ${serverRelease.taskId}\n'
              'content_id: ${serverRelease.contentId}\n'
              'version: ${serverRelease.version}\n'
              'status: SERVER PUBLISHED',
              textAlign: TextAlign.center,
              style: const TextStyle(color: AirvanaColors.muted, height: 1.5),
            ),
            const SizedBox(height: 8),
            const Text(
              '服务端生成、审核、Artifact 构建与 publish 已全部返回成功。',
              textAlign: TextAlign.center,
              style: TextStyle(color: AirvanaColors.muted, height: 1.5),
            ),
            const SizedBox(height: 18),
            FilledButton.icon(
              onPressed: () =>
                  context.go('/runtime/${serverRelease.contentId}'),
              icon: const Icon(Icons.play_arrow_rounded),
              label: const Text('打开已发布 Playable'),
            ),
          ],
        ),
      );
    }
    final release = _release;
    if (release == null) {
      return const _Panel(
        child: Text(
          '草稿记录了发布阶段，但未找到可核对的 LocalRelease；不展示伪造的发布成功。',
          style: TextStyle(color: AirvanaColors.muted, height: 1.5),
        ),
      );
    }
    return _Panel(
      child: Column(
        children: [
          const _SoftIcon(icon: Icons.check_rounded, large: true),
          const SizedBox(height: 14),
          const Text(
            '已发布到本机 Airvana 首页 · 本地演示',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 10),
          Text(
            'release_id: ${release.releaseId}\n'
            'playable_id: ${release.playableId}\n'
            'version_id: ${release.versionId}\n'
            'build_id: ${release.buildId}\n'
            'review_id: ${release.reviewId}',
            textAlign: TextAlign.center,
            style: const TextStyle(color: AirvanaColors.muted, height: 1.5),
          ),
          const SizedBox(height: 8),
          const Text(
            '草稿状态已更新为已发布，可继续暂停、回滚或生成新版本。',
            textAlign: TextAlign.center,
            style: TextStyle(color: AirvanaColors.muted, height: 1.5),
          ),
          const SizedBox(height: 18),
          FilledButton.icon(
            onPressed: () => context.go('/'),
            icon: const Icon(Icons.home_rounded),
            label: const Text('查看本机首页'),
          ),
        ],
      ),
    );
  }
}

class _DeepBriefField extends StatelessWidget {
  const _DeepBriefField({
    super.key,
    required this.width,
    required this.semanticLabel,
    required this.hint,
    required this.initialValue,
    required this.onChanged,
  });

  final double width;
  final String semanticLabel;
  final String hint;
  final String initialValue;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: width,
    child: Semantics(
      textField: true,
      label: semanticLabel,
      child: TextFormField(
        initialValue: initialValue,
        onChanged: onChanged,
        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(color: AirvanaColors.muted, fontSize: 10),
          filled: true,
          fillColor: Colors.white,
          isDense: true,
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 10,
            vertical: 12,
          ),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFFE5E5EA)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFFE5E5EA)),
          ),
        ),
      ),
    ),
  );
}

class _DeepComplianceRule extends StatelessWidget {
  const _DeepComplianceRule({
    required this.icon,
    required this.title,
    required this.summary,
    this.detailed = false,
  });

  final IconData icon;
  final String title;
  final String summary;
  final bool detailed;

  @override
  Widget build(BuildContext context) => Container(
    padding: detailed ? const EdgeInsets.all(11) : EdgeInsets.zero,
    decoration: detailed
        ? BoxDecoration(
            color: const Color(0xFFFFF8F8),
            border: Border.all(color: const Color(0xFFFFD6DA)),
            borderRadius: BorderRadius.circular(15),
          )
        : null,
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: detailed ? 34 : 24,
          height: detailed ? 34 : 24,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(detailed ? 11 : 8),
          ),
          child: Icon(
            icon,
            size: detailed ? 19 : 14,
            color: AirvanaColors.accent,
          ),
        ),
        const SizedBox(width: 7),
        SizedBox(
          width: detailed ? 76 : 58,
          child: Text(
            title,
            style: TextStyle(
              fontSize: detailed ? 11 : 8,
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
        Expanded(
          child: Text(
            summary,
            style: TextStyle(
              color: const Color(0xFF6E5A5D),
              fontSize: detailed ? 9 : 8,
              height: 1.45,
            ),
          ),
        ),
        if (detailed)
          Container(
            margin: const EdgeInsets.only(left: 6),
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
            decoration: BoxDecoration(
              color: const Color(0xFFFFE6E9),
              borderRadius: BorderRadius.circular(999),
            ),
            child: const Text(
              '平台锁定',
              style: TextStyle(
                color: Color(0xFFC62836),
                fontSize: 7,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
      ],
    ),
  );
}

class _DeepConnectorTile extends StatelessWidget {
  const _DeepConnectorTile({
    super.key,
    required this.label,
    required this.iconText,
    required this.hint,
    required this.iconBackground,
    required this.iconColor,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final String iconText;
  final String hint;
  final Color iconBackground;
  final Color iconColor;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    excludeSemantics: true,
    label: '${selected ? '移除' : '选择'} $label 发布连接器',
    child: Material(
      color: selected ? const Color(0xFFFFF1F2) : Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: selected ? const Color(0xFFFF9DA6) : const Color(0xFFE5E5EA),
        ),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(9),
          child: Row(
            children: [
              Container(
                width: 27,
                height: 27,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: iconBackground,
                  borderRadius: BorderRadius.circular(9),
                ),
                child: Text(
                  iconText,
                  style: TextStyle(
                    color: iconColor,
                    fontSize: 13,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      label,
                      style: const TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    Text(
                      hint,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AirvanaColors.muted,
                        fontSize: 7,
                        height: 1.25,
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                selected ? '✓' : '+',
                style: TextStyle(
                  color: selected ? const Color(0xFFC62836) : AirvanaColors.ink,
                  fontSize: 14,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

/// Web composer-goal-chip 同款：选中绿底描边，未选灰底。
class _GoalChip extends StatelessWidget {
  const _GoalChip({
    super.key,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 8),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFFEAF8EF) : const Color(0xFFF7F7FA),
          borderRadius: BorderRadius.circular(999),
          border: Border.all(
            color: selected ? const Color(0xFF9ED9B1) : const Color(0xFFE5E5EA),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w800,
            color: selected ? const Color(0xFF147542) : const Color(0xFF636366),
          ),
        ),
      ),
    );
  }
}

class _PreviewStat extends StatelessWidget {
  const _PreviewStat({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: .12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        '$label $value',
        style: const TextStyle(
          color: Colors.white,
          fontSize: 11,
          fontWeight: FontWeight.w800,
        ),
      ),
    );
  }
}

class _WorkspaceHeader extends StatelessWidget {
  const _WorkspaceHeader({
    required this.saved,
    required this.onBack,
    required this.onSave,
  });
  final bool saved;
  final VoidCallback onBack;
  final VoidCallback onSave;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 58,
      padding: const EdgeInsets.symmetric(horizontal: 8),
      decoration: const BoxDecoration(
        color: Colors.white,
        border: Border(bottom: BorderSide(color: AirvanaColors.line)),
      ),
      child: Row(
        children: [
          IconButton(
            tooltip: '返回创作器',
            onPressed: onBack,
            icon: const Icon(Icons.chevron_left_rounded),
          ),
          const Spacer(),
          Container(
            padding: const EdgeInsets.all(3),
            decoration: BoxDecoration(
              color: const Color(0xFFE9E9EF),
              borderRadius: BorderRadius.circular(999),
            ),
            child: Row(
              children: [
                const _WorkspaceTab(label: 'Chat', selected: true),
                const _WorkspaceTab(label: 'Preview', selected: false),
              ],
            ),
          ),
          const Spacer(),
          TextButton(onPressed: onSave, child: Text(saved ? '已存草稿' : '存草稿')),
        ],
      ),
    );
  }
}

class _WorkspaceTab extends StatelessWidget {
  const _WorkspaceTab({required this.label, required this.selected});
  final String label;
  final bool selected;
  @override
  Widget build(BuildContext context) => Container(
    constraints: const BoxConstraints(minWidth: 76),
    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 9),
    alignment: Alignment.center,
    decoration: BoxDecoration(
      color: selected ? Colors.white : Colors.transparent,
      borderRadius: BorderRadius.circular(999),
      boxShadow: selected
          ? const [BoxShadow(color: Color(0x12000000), blurRadius: 8)]
          : null,
    ),
    child: Text(
      label,
      style: TextStyle(
        fontSize: 12,
        color: selected ? AirvanaColors.ink : AirvanaColors.muted,
      ),
    ),
  );
}

class _Progress extends StatelessWidget {
  const _Progress({required this.stage, required this.steps});
  final int stage;
  final List<String> steps;
  @override
  Widget build(BuildContext context) {
    return Container(
      height: 45,
      color: Colors.white,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        scrollDirection: Axis.horizontal,
        itemCount: steps.length,
        separatorBuilder: (_, __) => const SizedBox(width: 6),
        itemBuilder: (_, index) => Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: index == stage
                ? const Color(0xFFFFE8EB)
                : const Color(0xFFF4F4F7),
            borderRadius: BorderRadius.circular(99),
          ),
          child: Text(
            '${index + 1} ${steps[index]}',
            style: TextStyle(
              fontSize: 9,
              fontWeight: FontWeight.w800,
              color: index == stage
                  ? AirvanaColors.accent
                  : AirvanaColors.muted,
            ),
          ),
        ),
      ),
    );
  }
}

class _ModeButton extends StatelessWidget {
  const _ModeButton({
    required this.label,
    required this.icon,
    required this.selected,
    required this.selectedColor,
    required this.onTap,
  });
  final String label;
  final IconData icon;
  final bool selected;
  final Color selectedColor;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Material(
    color: selected ? Colors.white : Colors.transparent,
    elevation: selected ? 5 : 0,
    shadowColor: const Color(0x38000000),
    borderRadius: BorderRadius.circular(999),
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: ConstrainedBox(
        constraints: const BoxConstraints(minWidth: 88),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 17,
                color: selected ? selectedColor : Colors.white,
              ),
              const SizedBox(width: 6),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                  color: selected ? selectedColor : Colors.white,
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

class _CreateHomeDock extends StatelessWidget {
  const _CreateHomeDock({
    required this.selectedCount,
    required this.selectedTab,
    required this.onAbilities,
    required this.onTemplates,
    this.templateSurface = false,
  });

  final int selectedCount;
  final String selectedTab;
  final VoidCallback onAbilities;
  final VoidCallback onTemplates;
  final bool templateSurface;

  @override
  Widget build(BuildContext context) {
    return Material(
      key: const ValueKey('create-home-dock'),
      color: Colors.white,
      elevation: 8,
      shadowColor: templateSurface
          ? const Color(0x241F1F23)
          : const Color(0x47000000),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(999),
        side: templateSurface
            ? const BorderSide(color: Color(0xFFE5E5EA))
            : BorderSide.none,
      ),
      child: Padding(
        padding: const EdgeInsets.all(4),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _CreateHomeDockItem(
              key: const ValueKey('create-home-tab-abilities'),
              label: '能力组合${selectedCount > 0 ? ' · $selectedCount' : ''}',
              icon: Icons.auto_awesome_rounded,
              selected: selectedTab == 'abilities',
              templateSurface: templateSurface,
              onTap: onAbilities,
            ),
            _CreateHomeDockItem(
              key: const ValueKey('create-home-tab-templates'),
              label: '模板',
              icon: Icons.grid_view_rounded,
              selected: selectedTab == 'templates',
              templateSurface: templateSurface,
              onTap: onTemplates,
            ),
          ],
        ),
      ),
    );
  }
}

class _CreateHomeDockItem extends StatelessWidget {
  const _CreateHomeDockItem({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
    required this.templateSurface,
    super.key,
  });

  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;
  final bool templateSurface;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    selected: selected,
    label: '创作首页：$label',
    excludeSemantics: true,
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(999),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        curve: Curves.easeOutCubic,
        constraints: const BoxConstraints(minWidth: 112),
        padding: const EdgeInsets.symmetric(horizontal: 13, vertical: 10),
        decoration: BoxDecoration(
          color: selected
              ? templateSurface
                    ? const Color(0xFFFFF1F2)
                    : const Color(0xFFECECEF)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(999),
          boxShadow: selected
              ? const [
                  BoxShadow(
                    color: Color(0x1F1F1F23),
                    blurRadius: 12,
                    offset: Offset(0, 4),
                  ),
                ]
              : const [],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 17,
              color: selected
                  ? templateSurface
                        ? AirvanaColors.accent
                        : AirvanaColors.ink
                  : AirvanaColors.muted,
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: selected
                    ? templateSurface
                          ? AirvanaColors.accent
                          : AirvanaColors.ink
                    : AirvanaColors.muted,
                fontSize: 12,
                fontWeight: FontWeight.w900,
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

class _ComposerTool extends StatelessWidget {
  const _ComposerTool({
    required this.icon,
    required this.label,
    required this.dark,
    required this.onTap,
    this.badge,
  });
  final IconData icon;
  final String label;
  final bool dark;
  final VoidCallback onTap;
  final String? badge;
  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    excludeSemantics: true,
    label: label,
    child: Material(
      color: dark ? const Color(0x24005358) : const Color(0x2E780032),
      shape: CircleBorder(
        side: BorderSide(
          color: dark ? const Color(0x2107191B) : Colors.white24,
        ),
      ),
      child: InkWell(
        onTap: onTap,
        customBorder: const CircleBorder(),
        child: SizedBox(
          width: 46.8,
          height: 46.8,
          child: Stack(
            clipBehavior: Clip.none,
            children: [
              Center(
                child: Icon(
                  icon,
                  color: dark ? const Color(0xFF07191B) : Colors.white,
                  size: 22.5,
                ),
              ),
              if (badge != null)
                Positioned(
                  right: -3,
                  top: -3,
                  child: Container(
                    constraints: const BoxConstraints(minWidth: 18),
                    height: 18,
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: AirvanaColors.accent,
                      borderRadius: BorderRadius.circular(999),
                      border: Border.all(color: Colors.white, width: 2),
                    ),
                    child: Text(
                      badge!,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 7,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    ),
  );
}

ButtonStyle _composerPrimaryButtonStyle() =>
    AirvanaButtonStyles.primary(minimumSize: const Size(0, 48));

const _composerSheetFieldBorder = OutlineInputBorder(
  borderRadius: BorderRadius.all(Radius.circular(14)),
  borderSide: BorderSide(color: AirvanaColors.line, width: 1),
);

const _composerSheetFieldFocusedBorder = OutlineInputBorder(
  borderRadius: BorderRadius.all(Radius.circular(14)),
  borderSide: BorderSide(color: Color(0xFFFF7B85), width: 1),
);

class _ComposerSheetFrame extends StatelessWidget {
  const _ComposerSheetFrame({
    required this.title,
    required this.subtitle,
    required this.child,
    this.footer,
    super.key,
  });

  final String title;
  final String subtitle;
  final Widget child;
  final Widget? footer;

  Widget _header(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Align(
        child: Container(
          width: 38,
          height: 4,
          decoration: BoxDecoration(
            color: const Color(0xFF4A4042),
            borderRadius: BorderRadius.circular(999),
          ),
        ),
      ),
      const SizedBox(height: 18),
      Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: AirvanaColors.ink,
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: const TextStyle(
                    color: AirvanaColors.muted,
                    fontSize: 10,
                    height: 1.45,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            tooltip: '关闭$title',
            onPressed: () => Navigator.pop(context),
            icon: const Icon(Icons.close_rounded),
          ),
        ],
      ),
    ],
  );

  @override
  Widget build(BuildContext context) {
    final keyboardInset = MediaQuery.viewInsetsOf(context).bottom;
    final safeBottom = keyboardInset > 0
        ? 0.0
        : MediaQuery.paddingOf(context).bottom;
    final body = footer == null
        ? SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(18, 10, 18, 22),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [_header(context), const SizedBox(height: 16), child],
            ),
          )
        : Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(18, 10, 18, 0),
                child: _header(context),
              ),
              const SizedBox(height: 12),
              Flexible(
                fit: FlexFit.loose,
                child: SingleChildScrollView(
                  key: const ValueKey('composer-sheet-scroll'),
                  padding: const EdgeInsets.symmetric(horizontal: 18),
                  child: child,
                ),
              ),
              Container(
                key: const ValueKey('composer-sheet-footer'),
                padding: const EdgeInsets.fromLTRB(18, 10, 18, 16),
                decoration: const BoxDecoration(
                  color: Color(0xFFF2F2F7),
                  border: Border(top: BorderSide(color: Color(0xFFE5E5EA))),
                ),
                child: footer,
              ),
            ],
          );

    return AnimatedPadding(
      duration: const Duration(milliseconds: 180),
      padding: EdgeInsets.only(bottom: keyboardInset),
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.sizeOf(context).height * .82 + safeBottom,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Flexible(
              child: Material(
                color: AirvanaColors.canvas,
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(28),
                ),
                clipBehavior: Clip.antiAlias,
                child: body,
              ),
            ),
            if (safeBottom > 0)
              ColoredBox(
                key: const ValueKey('composer-sheet-safe-footer'),
                color: const Color(0xFF0B0B0D),
                child: SizedBox(width: double.infinity, height: safeBottom),
              ),
          ],
        ),
      ),
    );
  }
}

class _ComposerSheetNotice extends StatelessWidget {
  const _ComposerSheetNotice({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: AirvanaColors.line),
    ),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: AirvanaColors.accent, size: 22),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            text,
            style: const TextStyle(
              color: AirvanaColors.muted,
              fontSize: 11,
              height: 1.5,
            ),
          ),
        ),
      ],
    ),
  );
}

class _ComposerSuggestionRow extends StatelessWidget {
  const _ComposerSuggestionRow({
    required this.text,
    required this.selected,
    required this.onTap,
    super.key,
  });

  final String text;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Material(
    color: selected ? const Color(0xFFFFF1F2) : Colors.white,
    borderRadius: BorderRadius.circular(16),
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: selected ? const Color(0xFFFF9DA6) : AirvanaColors.line,
          ),
        ),
        child: Row(
          children: [
            Expanded(
              child: Text(
                text,
                style: const TextStyle(
                  color: AirvanaColors.ink,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  height: 1.45,
                ),
              ),
            ),
            const SizedBox(width: 10),
            Icon(
              selected
                  ? Icons.check_circle_rounded
                  : Icons.add_circle_outline_rounded,
              color: selected ? AirvanaColors.accent : AirvanaColors.muted,
            ),
          ],
        ),
      ),
    ),
  );
}

class _ComposerAssetTile extends StatelessWidget {
  const _ComposerAssetTile({
    required this.playable,
    required this.selected,
    required this.onTap,
    super.key,
  });

  final Playable playable;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Material(
    color: Colors.white,
    borderRadius: BorderRadius.circular(14),
    clipBehavior: Clip.antiAlias,
    child: InkWell(
      onTap: onTap,
      child: Stack(
        fit: StackFit.expand,
        children: [
          Image.asset(playable.coverAsset, fit: BoxFit.cover),
          const DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [Colors.transparent, Color(0xC9000000)],
              ),
            ),
          ),
          Positioned(
            left: 7,
            right: 7,
            bottom: 7,
            child: Text(
              playable.title,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 8,
                fontWeight: FontWeight.w800,
              ),
            ),
          ),
          Positioned(
            right: 6,
            top: 6,
            child: CircleAvatar(
              radius: 10,
              backgroundColor: selected
                  ? AirvanaColors.accent
                  : const Color(0x99000000),
              child: Icon(
                selected ? Icons.check_rounded : Icons.add_rounded,
                size: 13,
                color: Colors.white,
              ),
            ),
          ),
        ],
      ),
    ),
  );
}

class _ComposerPowerSelection extends StatelessWidget {
  const _ComposerPowerSelection({
    required this.powers,
    required this.onRemove,
    required this.onClear,
  });

  final List<_PowerDefinition> powers;
  final ValueChanged<_PowerDefinition> onRemove;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) => Container(
    key: const ValueKey('composer-power-selection'),
    padding: const EdgeInsets.all(10),
    decoration: BoxDecoration(
      color: const Color(0xFF19191C),
      borderRadius: BorderRadius.circular(13),
    ),
    child: Column(
      children: [
        Row(
          children: [
            Text(
              '能力组合 · ${powers.length} 项',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 10,
                fontWeight: FontWeight.w800,
              ),
            ),
            const Spacer(),
            InkWell(
              onTap: onClear,
              child: const Text(
                '清空',
                style: TextStyle(
                  color: Color(0xFFFF7B85),
                  fontSize: 9,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 7),
        SizedBox(
          height: 32,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: powers.length,
            separatorBuilder: (_, __) => const SizedBox(width: 6),
            itemBuilder: (_, index) {
              final power = powers[index];
              return InkWell(
                onTap: () => onRemove(power),
                borderRadius: BorderRadius.circular(999),
                child: Container(
                  alignment: Alignment.center,
                  padding: const EdgeInsets.symmetric(horizontal: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF2A2A2E),
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text.rich(
                    TextSpan(
                      text: power.title,
                      children: const [
                        TextSpan(
                          text: '  ×',
                          style: TextStyle(color: Color(0xFFFF7B85)),
                        ),
                      ],
                    ),
                    style: const TextStyle(
                      color: Color(0xFFF2F2F7),
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    ),
  );
}

class _CreateTemplateCard extends StatelessWidget {
  const _CreateTemplateCard({
    required this.playable,
    required this.onTap,
    super.key,
  });

  final Playable playable;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Material(
    color: Colors.white,
    elevation: 2,
    shadowColor: const Color(0x181F1F23),
    borderRadius: BorderRadius.circular(20),
    clipBehavior: Clip.antiAlias,
    child: InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Stack(
                fit: StackFit.expand,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(15),
                    child: Image.asset(playable.coverAsset, fit: BoxFit.cover),
                  ),
                  Positioned(
                    left: 9,
                    top: 9,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 7,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0x8F0A0A0C),
                        borderRadius: BorderRadius.circular(999),
                        border: Border.all(color: Colors.white12),
                      ),
                      child: const Text(
                        '首页内容',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 8,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    left: 9,
                    right: 9,
                    bottom: 9,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 5,
                      ),
                      decoration: BoxDecoration(
                        color: const Color(0xA006080C),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Row(
                        children: [
                          const CircleAvatar(
                            radius: 11,
                            backgroundImage: AssetImage(
                              'assets/legacy/avatars/kai.png',
                            ),
                          ),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              playable.authorName,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 8,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(3, 9, 3, 4),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    playable.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: AirvanaColors.ink,
                      fontSize: 11,
                      fontWeight: FontWeight.w900,
                      height: 1.35,
                    ),
                  ),
                  const SizedBox(height: 5),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          '${playable.category} · v${playable.version}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            color: AirvanaColors.muted,
                            fontSize: 8,
                          ),
                        ),
                      ),
                      const Text(
                        '选用 ›',
                        style: TextStyle(
                          color: AirvanaColors.accent,
                          fontSize: 8,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

class _ComposerCategory extends StatelessWidget {
  const _ComposerCategory(
    this.label,
    this.selected, {
    required this.onTap,
    super.key,
  });
  final String label;
  final bool selected;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    selected: selected,
    label: 'Power 分类：$label',
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        margin: const EdgeInsets.only(right: 17),
        padding: const EdgeInsets.only(bottom: 7, top: 3),
        decoration: BoxDecoration(
          border: Border(
            bottom: BorderSide(
              width: 2,
              color: selected ? AirvanaColors.accent : Colors.transparent,
            ),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: selected ? Colors.white : Colors.white54,
            fontSize: 12,
            fontWeight: selected ? FontWeight.w900 : FontWeight.w600,
          ),
        ),
      ),
    ),
  );
}

class _ComposerPowerTile extends StatelessWidget {
  const _ComposerPowerTile({
    required this.power,
    required this.selected,
    required this.recommendationLabel,
    required this.onTap,
    super.key,
  });
  final _PowerDefinition power;
  final bool selected;
  final String? recommendationLabel;
  final VoidCallback onTap;

  static String _assetName(String id) => id.replaceAllMapped(
    RegExp(r'[A-Z]'),
    (match) => '-${match.group(0)!.toLowerCase()}',
  );

  LinearGradient get _cardGradient => switch (power.category) {
    'content' => const LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [Color(0xFF272128), Color(0xFF171719)],
    ),
    'mechanics' => const LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [Color(0xFF252227), Color(0xFF171719)],
    ),
    'narrative' => const LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [Color(0xFF25212A), Color(0xFF171719)],
    ),
    'sensing' => const LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [Color(0xFF20262A), Color(0xFF171719)],
    ),
    'social' => const LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [Color(0xFF202728), Color(0xFF171719)],
    ),
    'operations' => const LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [Color(0xFF28251E), Color(0xFF171719)],
    ),
    _ => const LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [Color(0xFF23242B), Color(0xFF171719)],
    ),
  };

  @override
  Widget build(BuildContext context) => AnimatedContainer(
    duration: const Duration(milliseconds: 180),
    padding: const EdgeInsets.all(13),
    decoration: BoxDecoration(
      gradient: _cardGradient,
      borderRadius: BorderRadius.circular(18),
      border: Border.all(
        color: selected ? AirvanaColors.accent : const Color(0xFF303034),
      ),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                power.title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                  height: 1.25,
                ),
              ),
            ),
            const SizedBox(width: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 3),
              decoration: BoxDecoration(
                color: power.support.color.withValues(alpha: 0.14),
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                power.support.label,
                style: TextStyle(
                  color: power.support.color,
                  fontSize: 6,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          power.description,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
            color: Color(0xFFA0A0A6),
            fontSize: 9,
            height: 1.4,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          power.requirement,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(color: Colors.white30, fontSize: 6.5),
        ),
        if (recommendationLabel != null) ...[
          const SizedBox(height: 5),
          Text(
            '推荐原因 · $recommendationLabel',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Color(0xFFFF7080),
              fontSize: 8,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
        const Spacer(),
        Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(13),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x3D000000),
                    blurRadius: 14,
                    offset: Offset(0, 5),
                  ),
                ],
              ),
              clipBehavior: Clip.antiAlias,
              child: Image.asset(
                'assets/legacy/capability-icons/${_assetName(power.id)}.png',
                fit: BoxFit.cover,
                errorBuilder: (_, __, ___) => Container(
                  color: const Color(0xFF2C2C34),
                  child: Icon(
                    power.icon,
                    color: AirvanaColors.accent,
                    size: 21,
                  ),
                ),
              ),
            ),
            const Spacer(),
            Semantics(
              button: true,
              label: '${selected ? '移除' : '加入'} ${power.title}',
              child: InkWell(
                key: ValueKey('composer-power-toggle-${power.id}'),
                onTap: onTap,
                customBorder: const CircleBorder(),
                child: SizedBox(
                  width: 44,
                  height: 44,
                  child: Center(
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 160),
                      width: selected ? 28 : 32,
                      height: selected ? 28 : 32,
                      decoration: BoxDecoration(
                        color: selected ? AirvanaColors.accent : Colors.black,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        selected ? Icons.check_rounded : Icons.add_rounded,
                        color: selected
                            ? const Color(0xFF07191B)
                            : Colors.white,
                        size: selected ? 16 : 18,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    ),
  );
}

class _ComposerPowerEmpty extends StatelessWidget {
  const _ComposerPowerEmpty();

  @override
  Widget build(BuildContext context) => const Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.search_off_rounded, color: Colors.white38, size: 30),
        SizedBox(height: 8),
        Text(
          '没有匹配的能力，请更换关键词或分类。',
          style: TextStyle(color: Colors.white54, fontSize: 10),
        ),
      ],
    ),
  );
}

enum _PowerSupport {
  generatable('可生成原型', Color(0xFF7CE7A2)),
  prototype('前端原型', Color(0xFFFFD17A)),
  permission('需设备授权', Color(0xFF8DC6FF)),
  service('需实时服务', Color(0xFFA0A0A6)),
  approval('需审批', Color(0xFFFF9AA3));

  const _PowerSupport(this.label, this.color);
  final String label;
  final Color color;
}

class _PowerDefinition {
  const _PowerDefinition(
    this.id,
    this.category,
    this.title,
    this.description,
    this.icon, {
    this.support = _PowerSupport.generatable,
    this.dependencies = const [],
    this.conflicts = const [],
    this.quickAllowed = true,
    this.visibleInCatalog = true,
  });

  final String id;
  final String category;
  final String title;
  final String description;
  final IconData icon;
  final _PowerSupport support;
  final List<String> dependencies;
  final List<String> conflicts;
  final bool quickAllowed;
  final bool visibleInCatalog;

  String get requirement => switch (support) {
    _PowerSupport.permission => '权限：用户授权 · 拒绝后安全降级',
    _PowerSupport.service => '服务：需实时服务 · 离线时阻断或降级',
    _PowerSupport.approval => '要求：人工审核 · 不自动发布',
    _PowerSupport.prototype || _PowerSupport.generatable => '依赖：本地前端运行时',
  };
}

class _LocalNotice extends StatelessWidget {
  const _LocalNotice();
  @override
  Widget build(BuildContext context) => const _Panel(
    child: Row(
      children: [
        Icon(Icons.phone_android_rounded, color: AirvanaColors.accent),
        SizedBox(width: 10),
        Expanded(
          child: Text(
            'LOCAL DEMO · 草稿与流程保存在当前设备，不代表审核或全网发布成功',
            style: TextStyle(
              fontSize: 10,
              color: AirvanaColors.accent,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ],
    ),
  );
}

class _IntentCard extends StatelessWidget {
  const _IntentCard();
  @override
  Widget build(BuildContext context) => const _Panel(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('系统将提取', style: TextStyle(fontWeight: FontWeight.w900)),
        SizedBox(height: 12),
        Wrap(
          spacing: 7,
          runSpacing: 7,
          children: [
            Chip(label: Text('作品类型')),
            Chip(label: Text('目标玩家')),
            Chip(label: Text('核心玩法')),
            Chip(label: Text('操作方式')),
            Chip(label: Text('视觉风格')),
            Chip(label: Text('目标时长')),
            Chip(label: Text('成功条件')),
            Chip(label: Text('Power 推荐')),
          ],
        ),
      ],
    ),
  );
}

class _Panel extends StatelessWidget {
  const _Panel({required this.child});
  final Widget child;
  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: AirvanaColors.line),
      boxShadow: const [
        BoxShadow(
          color: Color(0x0D15151A),
          blurRadius: 18,
          offset: Offset(0, 8),
        ),
      ],
    ),
    child: child,
  );
}

class _AssistantBubble extends StatelessWidget {
  const _AssistantBubble({required this.text});
  final String text;
  @override
  Widget build(BuildContext context) => Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      const CircleAvatar(
        backgroundColor: AirvanaColors.accent,
        child: Text(
          'A',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900),
        ),
      ),
      const SizedBox(width: 10),
      Expanded(
        child: _Panel(child: Text(text, style: const TextStyle(height: 1.5))),
      ),
    ],
  );
}

class _Choice extends StatelessWidget {
  const _Choice({required this.label, required this.onTap});
  final String label;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Material(
    color: AirvanaColors.canvas,
    borderRadius: BorderRadius.circular(16),
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Expanded(
              child: Text(
                label,
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
            ),
            const Icon(Icons.chevron_right_rounded),
          ],
        ),
      ),
    ),
  );
}

class _ReviewRow extends StatelessWidget {
  const _ReviewRow({
    required this.label,
    required this.value,
    required this.onEdit,
  });
  final String label;
  final String value;
  final VoidCallback onEdit;
  @override
  Widget build(BuildContext context) => _Panel(
    child: Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(
                  color: AirvanaColors.muted,
                  fontSize: 10,
                ),
              ),
              const SizedBox(height: 5),
              Text(
                value,
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  height: 1.35,
                ),
              ),
            ],
          ),
        ),
        IconButton(
          tooltip: '修改$label',
          onPressed: onEdit,
          icon: const Icon(Icons.edit_outlined, size: 18),
        ),
      ],
    ),
  );
}

class _StatusRow extends StatelessWidget {
  const _StatusRow({
    required this.label,
    required this.done,
    required this.active,
  });
  final String label;
  final bool done;
  final bool active;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 6),
    child: Row(
      children: [
        Icon(
          done
              ? Icons.check_circle
              : active
              ? Icons.pending
              : Icons.radio_button_unchecked,
          size: 18,
          color: done
              ? AirvanaColors.success
              : active
              ? AirvanaColors.accent
              : AirvanaColors.muted,
        ),
        const SizedBox(width: 9),
        Text(
          label,
          style: TextStyle(
            fontWeight: active ? FontWeight.w900 : FontWeight.w500,
          ),
        ),
        const Spacer(),
        Text(
          done
              ? '完成'
              : active
              ? '执行中'
              : '等待',
          style: const TextStyle(color: AirvanaColors.muted, fontSize: 9),
        ),
      ],
    ),
  );
}

class _FieldLine extends StatelessWidget {
  const _FieldLine({required this.label, required this.value});
  final String label;
  final String value;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 8),
    child: Row(
      children: [
        Expanded(
          child: Text(
            label,
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
        ),
        Text(
          value,
          style: const TextStyle(color: AirvanaColors.muted, fontSize: 11),
        ),
      ],
    ),
  );
}

class _AuditRow extends StatelessWidget {
  const _AuditRow({required this.label, required this.approved});
  final String label;
  final bool approved;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 8),
    child: Row(
      children: [
        Icon(
          approved ? Icons.check_circle : Icons.schedule_rounded,
          color: approved ? AirvanaColors.success : AirvanaColors.muted,
          size: 19,
        ),
        const SizedBox(width: 10),
        Expanded(child: Text(label)),
        Text(
          approved ? 'approved' : 'pending_review',
          style: const TextStyle(fontSize: 9, color: AirvanaColors.muted),
        ),
      ],
    ),
  );
}

class _SoftIcon extends StatelessWidget {
  const _SoftIcon({required this.icon, this.large = false});
  final IconData icon;
  final bool large;
  @override
  Widget build(BuildContext context) => Container(
    width: large ? 64 : 44,
    height: large ? 64 : 44,
    decoration: BoxDecoration(
      color: const Color(0xFFFFEDF0),
      borderRadius: BorderRadius.circular(large ? 22 : 14),
    ),
    child: Icon(icon, color: AirvanaColors.accent, size: large ? 34 : 21),
  );
}

class _RoundTool extends StatelessWidget {
  const _RoundTool({
    required this.icon,
    required this.label,
    required this.onTap,
  });
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    label: label,
    child: Material(
      color: const Color(0x26FFFFFF),
      shape: const CircleBorder(),
      child: InkWell(
        onTap: onTap,
        customBorder: const CircleBorder(),
        child: SizedBox(
          width: 42,
          height: 42,
          child: Icon(icon, size: 21, color: Colors.white),
        ),
      ),
    ),
  );
}
