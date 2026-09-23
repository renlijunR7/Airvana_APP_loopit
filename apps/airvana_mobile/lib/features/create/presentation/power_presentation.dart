/// Power 在创作界面上的图标与配色。
///
/// 图标属于表现层，不该进 domain —— [PowerDescriptor] 只描述能力本身的契约。
/// 这份映射是 presentation 对 domain 的补充，新增能力时若漏了图标，
/// `power_presentation_test.dart` 会直接报错，而不是在界面上悄悄画成空白。
library;

import 'package:flutter/material.dart';

import '../../shared/domain/power_capability.dart';

/// 按 Power id 取图标。
const Map<String, IconData> kPowerIcons = <String, IconData>{
  'textTypography': Icons.text_fields_rounded,
  'imageGif': Icons.image_outlined,
  'video': Icons.videocam_outlined,
  'audioVoice': Icons.music_note_rounded,
  'themeEffects': Icons.auto_awesome_rounded,
  'coverLocale': Icons.translate_rounded,
  'spatialAssets': Icons.view_in_ar_outlined,
  'touchControls': Icons.touch_app_outlined,
  'dragPuzzle': Icons.grid_view_rounded,
  'challenge': Icons.bolt_rounded,
  'timerScore': Icons.timer_outlined,
  'failureRetry': Icons.replay_rounded,
  'levelSave': Icons.save_outlined,
  'simulatorIdle': Icons.agriculture_outlined,
  'strategyPhysics': Icons.blur_circular_rounded,
  'personaLibrary': Icons.people_outline_rounded,
  'npc': Icons.smart_toy_outlined,
  'worldRelations': Icons.hub_outlined,
  'questBranch': Icons.alt_route_rounded,
  'dialogueStyle': Icons.chat_bubble_outline_rounded,
  'stateMemory': Icons.memory_rounded,
  'cameraAr': Icons.camera_alt_outlined,
  'microphoneVoice': Icons.mic_none_rounded,
  'musicRecognition': Icons.graphic_eq_rounded,
  'gestureVision': Icons.back_hand_outlined,
  'motionHaptic': Icons.screen_rotation_alt_rounded,
  'shareEngagement': Icons.ios_share_outlined,
  'socialGraph': Icons.person_add_alt_1_outlined,
  'communityChallenge': Icons.emoji_events_outlined,
  'chatDm': Icons.forum_outlined,
  'reportSafety': Icons.shield_outlined,
  'multiplayer': Icons.groups_outlined,
  'draftPreview': Icons.preview_outlined,
  'coverTags': Icons.sell_outlined,
  'versionLifecycle': Icons.history_rounded,
  'remixReview': Icons.swap_horiz_rounded,
  'appPublish': Icons.publish_outlined,
  'externalConnectors': Icons.cable_rounded,
  'campaignAttribution': Icons.track_changes_rounded,
  'campaignExperimentsKillSwitch': Icons.power_settings_new_rounded,
  'vrExperience': Icons.view_in_ar_outlined,
  'proceduralAnimation': Icons.animation_rounded,
  'mirrorDrawing': Icons.gesture_rounded,
  'threeDScene': Icons.view_in_ar_rounded,
  'touchscreenSimulation': Icons.phone_iphone_rounded,
  'proceduralWorld': Icons.landscape_outlined,
  'softBodyPhysics': Icons.bubble_chart_outlined,
  'guidedCreator': Icons.format_list_numbered_rounded,
  'devicePosture': Icons.screen_rotation_rounded,
  'faceExpression': Icons.sentiment_satisfied_rounded,
  'bodyPose': Icons.accessibility_new_rounded,
  'environmentScan': Icons.qr_code_scanner_rounded,
  'geoLocation': Icons.place_outlined,
  'compassHeading': Icons.explore_outlined,
  'ambientSensing': Icons.light_mode_outlined,
  'stepActivity': Icons.directions_walk_rounded,
  'proximityLink': Icons.nfc_rounded,
  'kolTwin': Icons.smart_toy_outlined,
};

/// 实现层级对应的徽章配色。原本内联在 `_PowerSupport` 枚举里，
/// 把分类和配色捆在一起，导致正确的架构分层被当成 UI 样式使用。
const Map<PowerSupport, Color> kPowerSupportColors = <PowerSupport, Color>{
  PowerSupport.generatable: Color(0xFF7CE7A2),
  PowerSupport.prototype: Color(0xFFFFD17A),
  PowerSupport.permission: Color(0xFF8DC6FF),
  PowerSupport.service: Color(0xFFA0A0A6),
  PowerSupport.approval: Color(0xFFFF9AA3),
};

/// 交付方式的一句话说明，用在能力详情里回答「这条能力能不能用在现有作品上」。
const Map<PowerDelivery, String> kPowerDeliveryLabels = <PowerDelivery, String>{
  PowerDelivery.container: '现有作品可直接受益',
  PowerDelivery.signal: '需要作品按契约订阅',
};
