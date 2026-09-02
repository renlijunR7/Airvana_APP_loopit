import 'dart:async';

import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/design_system/airvana_shared_cards.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// 旧版 Web「KOL AI 分身」管理面板的第一批迁移：
/// 状态机（not_created → configuring → testing → active_demo ⇄ paused_demo）、
/// 概览 / 资料 / 测试沙盒 / 渠道 / 授权审计。
/// 舞台演示（HeyGen 视频与语音状态流）按需求书降级为静态身份卡，待后续批次。
class AiTwinPageBody extends ConsumerStatefulWidget {
  const AiTwinPageBody({super.key});

  @override
  ConsumerState<AiTwinPageBody> createState() => _AiTwinPageBodyState();
}

class _AiTwinPageBodyState extends ConsumerState<AiTwinPageBody> {
  static const _boundaryCopy =
      'AI 分身不会直接发布作品、确认 Campaign、改变钱包或结算状态，'
      '也不会自动调用外部连接器。所有关键动作都必须进入权威业务模块并由用户确认。'
      '对外输出必须带 AI 标识，支持人工接管。';

  String _tab = 'overview';
  final List<({bool fromUser, String text})> _sandbox = [];
  final TextEditingController _sandboxInput = TextEditingController();

  // 舞台演示：语音状态流（idle → listening → thinking → speaking → idle）。
  String _voiceState = 'idle';
  bool _voiceMuted = false;
  bool _visualFallback = false;
  Timer? _voiceTimer;

  @override
  void dispose() {
    _voiceTimer?.cancel();
    _sandboxInput.dispose();
    super.dispose();
  }

  void _stopVoiceDemo() {
    _voiceTimer?.cancel();
    _voiceTimer = null;
    setState(() => _voiceState = 'idle');
  }

  void _startVoiceDemo() {
    _voiceTimer?.cancel();
    setState(() => _voiceState = 'listening');
    _voiceTimer = Timer(const Duration(milliseconds: 900), () {
      if (!mounted) return;
      setState(() => _voiceState = 'thinking');
      _voiceTimer = Timer(const Duration(milliseconds: 1100), () {
        if (!mounted) return;
        setState(() => _voiceState = 'speaking');
        _voiceTimer = Timer(const Duration(milliseconds: 2600), () {
          if (!mounted) return;
          setState(() => _voiceState = 'idle');
        });
      });
    });
  }

  Future<void> _save(
    LocalAiTwinState next, {
    String? auditTitle,
    String? toast,
    String? versionLabel,
  }) async {
    var payload = next;
    if (versionLabel != null) {
      final now = DateTime.now();
      payload = payload.copyWith(
        versions: [
          (
            label: versionLabel,
            time:
                '${now.year}-${now.month.toString().padLeft(2, '0')}-'
                '${now.day.toString().padLeft(2, '0')} '
                '${now.hour.toString().padLeft(2, '0')}:'
                '${now.minute.toString().padLeft(2, '0')}',
            scene: payload.sceneId,
          ),
          ...payload.versions,
        ],
      );
    }
    await ref
        .read(airvanaRepositoryProvider)
        .saveAiTwinState(payload, auditTitle: auditTitle);
    ref.invalidate(aiTwinStateProvider);
    if (toast != null && mounted) {
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text(toast)));
    }
  }

  ({String label, String action, String audit, String next}) _stage(
    LocalAiTwinState state,
  ) => switch (state.status) {
    'not_created' => (
      label: '未创建',
      action: '建立 AI 分身',
      audit: '创建 AI 分身草稿',
      next: 'configuring',
    ),
    'configuring' => (
      label: '配置中',
      action: '完成配置，进入测试',
      audit: '进入本地沙盒测试',
      next: 'testing',
    ),
    'testing' => (
      label: '测试中',
      action: '启用站内演示',
      audit: '启用 AI 分身前端演示',
      next: 'active_demo',
    ),
    'active_demo' => (
      label: '已启用 · 演示',
      action: '暂停全部渠道',
      audit: '暂停全部渠道',
      next: 'paused_demo',
    ),
    _ => (
      label: '已暂停 · 演示',
      action: '恢复演示',
      audit: '恢复 AI 分身演示',
      next: 'active_demo',
    ),
  };

  @override
  Widget build(BuildContext context) {
    final twin = ref.watch(aiTwinStateProvider);
    return twin.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, _) => Center(
        child: Text(
          'AI 分身状态加载失败：$error',
          style: const TextStyle(color: AirvanaColors.muted),
        ),
      ),
      data: (state) {
        final stage = _stage(state);
        return ListView(
          key: const ValueKey('ai-twin-scroll'),
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 30),
          children: [
            _Panel(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 46,
                        height: 46,
                        decoration: const BoxDecoration(
                          color: Color(0xFFFFF1F2),
                          shape: BoxShape.circle,
                        ),
                        alignment: Alignment.center,
                        child: const Text(
                          'AI',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w900,
                            color: AirvanaColors.accent,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              state.name.isEmpty ? '尚未命名的分身' : state.name,
                              style: const TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            const SizedBox(height: 3),
                            Text(
                              state.tagline.isEmpty
                                  ? '静态身份卡 · 舞台演示待迁移'
                                  : state.tagline,
                              style: const TextStyle(
                                fontSize: 10,
                                color: AirvanaColors.muted,
                              ),
                            ),
                          ],
                        ),
                      ),
                      StatusPill(
                        key: const ValueKey('ai-twin-status-pill'),
                        label: stage.label,
                        tone: switch (state.status) {
                          'active_demo' => AirvanaStatusTone.confirmed,
                          'paused_demo' => AirvanaStatusTone.alert,
                          'not_created' => AirvanaStatusTone.demo,
                          _ => AirvanaStatusTone.pending,
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      key: const ValueKey('ai-twin-advance'),
                      onPressed: () => _save(
                        state.copyWith(status: stage.next),
                        auditTitle: stage.audit,
                        toast: stage.audit,
                      ),
                      child: Text(stage.action),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            SingleChildScrollView(
              key: const ValueKey('ai-twin-tab-scroll'),
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  for (final (key, label) in const [
                    ('overview', '概览'),
                    ('persona', '资料'),
                    ('scenes', '场景'),
                    ('languages', '语言'),
                    ('stage', '舞台'),
                    ('test', '测试'),
                    ('channels', '渠道'),
                    ('versions', '版本'),
                    ('ops', '授权'),
                  ])
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: _TwinTab(
                        key: ValueKey('ai-twin-tab-$key'),
                        label: label,
                        active: _tab == key,
                        onTap: () => setState(() => _tab = key),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            if (_tab == 'overview') ..._overview(state),
            if (_tab == 'persona') ..._persona(state),
            if (_tab == 'scenes') ..._scenes(state),
            if (_tab == 'languages') ..._languages(state),
            if (_tab == 'stage') ..._stageDemo(state),
            if (_tab == 'versions') ..._versions(state),
            if (_tab == 'test') ..._test(state),
            if (_tab == 'channels') ..._channels(state, stage),
            if (_tab == 'ops') ..._ops(state),
            const SizedBox(height: 14),
            const BoundaryCard(
              key: ValueKey('ai-twin-boundary-card'),
              title: '执行边界',
              body: _boundaryCopy,
            ),
          ],
        );
      },
    );
  }

  List<Widget> _overview(LocalAiTwinState state) => [
    _Panel(
      child: Column(
        children: [
          for (final (index, title, desc, ready) in [
            ('1', '公开身份', '姓名、简介与公开创作领域', state.name.trim().isNotEmpty),
            (
              '2',
              '人格与边界',
              '表达语气、擅长话题和拒答范围',
              state.status != 'not_created',
            ),
            ('3', '知识授权', '公开资料、作品与 Contract 约束（待迁移）', false),
            (
              '4',
              '测试与启用',
              '本地沙盒、AI 标识与人工接管',
              state.status == 'active_demo',
            ),
          ])
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Row(
                children: [
                  Container(
                    width: 24,
                    height: 24,
                    alignment: Alignment.center,
                    decoration: const BoxDecoration(
                      color: Color(0xFFF2F2F7),
                      shape: BoxShape.circle,
                    ),
                    child: Text(
                      index,
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        Text(
                          desc,
                          style: const TextStyle(
                            fontSize: 9,
                            color: AirvanaColors.muted,
                          ),
                        ),
                      ],
                    ),
                  ),
                  StatusPill(
                    label: ready ? '已就绪' : '待完善',
                    tone: ready
                        ? AirvanaStatusTone.confirmed
                        : AirvanaStatusTone.pending,
                  ),
                ],
              ),
            ),
        ],
      ),
    ),
  ];

  List<Widget> _persona(LocalAiTwinState state) => [
    _Panel(
      child: Column(
        children: [
          for (final field in [
            ('ai-twin-name', '名称', state.name, (String v) => state.copyWith(name: v)),
            (
              'ai-twin-tagline',
              '标语',
              state.tagline,
              (String v) => state.copyWith(tagline: v),
            ),
            ('ai-twin-tone', '语气', state.tone, (String v) => state.copyWith(tone: v)),
            (
              'ai-twin-topics',
              '擅长话题',
              state.topics,
              (String v) => state.copyWith(topics: v),
            ),
            (
              'ai-twin-blocked',
              '拒答范围',
              state.blockedTopics,
              (String v) => state.copyWith(blockedTopics: v),
            ),
          ])
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: TextField(
                key: ValueKey(field.$1),
                controller: TextEditingController(text: field.$3)
                  ..selection = TextSelection.collapsed(
                    offset: field.$3.length,
                  ),
                decoration: InputDecoration(labelText: field.$2),
                onSubmitted: (value) => _save(
                  field.$4(value.trim()),
                  toast: '${field.$2}已保存到本机',
                  versionLabel: '更新资料 · ${field.$2}',
                ),
              ),
            ),
          const Text(
            '每个字段回车保存；造型与 HeyGen 舞台演示属于后续批次，当前使用静态身份卡降级态。',
            style: TextStyle(fontSize: 9, color: AirvanaColors.muted),
          ),
        ],
      ),
    ),
  ];

  /// 预置场景：切换时整组替换人格、话术并落审计与版本（对齐 Web scenes Tab）。
  static const _sceneCatalog = <(String, String, String, String, String, String, String)>[
    (
      'default',
      '通用创作者',
      '日常创作与互动答疑',
      'Kai 分身',
      '运营可持续创作、互动、归因与转化的 Agentic Playable。',
      '友好、专业、直接',
      'Agentic Playable 创作、互动增长、安全教育',
    ),
    (
      'brand',
      '品牌讲解',
      'Campaign 品牌合作场景',
      'Kai · 品牌讲解人',
      '以获批 Campaign Contract 为边界的品牌互动讲解。',
      '克制、准确、合规优先',
      '品牌合作流程、Contract 边界、互动转化',
    ),
    (
      'community',
      '社区答疑',
      '增长网络与节点社区',
      'Kai · 社区伙伴',
      '帮助社区成员理解玩法、成长体系与安全边界。',
      '轻松、耐心、鼓励',
      '玩法答疑、成长体系、节点协作',
    ),
  ];

  List<Widget> _scenes(LocalAiTwinState state) => [
    _Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '场景隔离',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 4),
          const Text(
            '每个场景隔离人格名、话术、知识与版本；切换即整组替换并写入审计。',
            style: TextStyle(fontSize: 9, color: AirvanaColors.muted),
          ),
          const SizedBox(height: 10),
          for (final scene in _sceneCatalog)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: InkWell(
                key: ValueKey('ai-twin-scene-${scene.$1}'),
                borderRadius: BorderRadius.circular(14),
                onTap: state.sceneId == scene.$1
                    ? null
                    : () => _save(
                        state.copyWith(
                          sceneId: scene.$1,
                          name: scene.$4,
                          tagline: scene.$5,
                          tone: scene.$6,
                          topics: scene.$7,
                        ),
                        auditTitle: '切换场景 · ${scene.$2}',
                        versionLabel: '切换场景 · ${scene.$2}',
                        toast: '已切换到「${scene.$2}」，知识、话术和版本均按场景隔离',
                      ),
                child: Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: state.sceneId == scene.$1
                        ? const Color(0xFFFFF1F2)
                        : const Color(0xFFF7F7FA),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: state.sceneId == scene.$1
                          ? const Color(0xFFFFD6DA)
                          : const Color(0xFFF1F1F6),
                    ),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              scene.$2,
                              style: const TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            Text(
                              scene.$3,
                              style: const TextStyle(
                                fontSize: 9,
                                color: AirvanaColors.muted,
                              ),
                            ),
                          ],
                        ),
                      ),
                      StatusPill(
                        label: state.sceneId == scene.$1 ? '当前场景' : '可切换',
                        tone: state.sceneId == scene.$1
                            ? AirvanaStatusTone.confirmed
                            : AirvanaStatusTone.demo,
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    ),
  ];

  List<Widget> _languages(LocalAiTwinState state) => [
    _Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '讲解语言',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 4),
          const Text(
            '驱动舞台演示的字幕与讲解语言；对外输出仍必须带 AI 标识。',
            style: TextStyle(fontSize: 9, color: AirvanaColors.muted),
          ),
          const SizedBox(height: 10),
          Wrap(
            spacing: 8,
            children: [
              for (final (code, label) in const [('zh', '简体中文'), ('en', 'English')])
                ChoiceChip(
                  key: ValueKey('ai-twin-language-$code'),
                  label: Text(label),
                  selected: state.language == code,
                  onSelected: (_) => _save(
                    state.copyWith(language: code),
                    toast: '讲解语言已切换为$label',
                  ),
                ),
            ],
          ),
        ],
      ),
    ),
  ];

  List<Widget> _stageDemo(LocalAiTwinState state) {
    const voiceLabels = {
      'idle': '待机',
      'listening': '聆听中…',
      'thinking': '思考中…',
      'speaking': '讲解中',
    };
    final subtitle = switch (_voiceState) {
      'listening' => '（正在聆听你的问题）',
      'thinking' => '（正在组织讲解思路）',
      'speaking' => state.language == 'en'
          ? 'Hi, I am the AI twin of ${state.name.isEmpty ? 'this creator' : state.name}. All key actions still need human confirmation.'
          : '大家好，我是${state.name.isEmpty ? '这位创作者' : state.name}的 AI 分身。所有关键动作仍需本人确认。',
      _ => '点击「自由讲解」开始语音状态流演示。',
    };
    return [
      _Panel(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Expanded(
                  child: Text(
                    '舞台演示',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900),
                  ),
                ),
                StatusPill(
                  key: const ValueKey('ai-twin-voice-pill'),
                  label: voiceLabels[_voiceState] ?? '待机',
                  tone: _voiceState == 'speaking'
                      ? AirvanaStatusTone.confirmed
                      : _voiceState == 'idle'
                      ? AirvanaStatusTone.demo
                      : AirvanaStatusTone.pending,
                ),
              ],
            ),
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              height: 180,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFF14121B), Color(0xFF2A2233)],
                ),
                borderRadius: BorderRadius.circular(18),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: .12),
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: _voiceState == 'speaking'
                            ? AirvanaColors.accent
                            : Colors.white38,
                        width: 2,
                      ),
                    ),
                    alignment: Alignment.center,
                    child: const Text(
                      'AI',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 17,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    _visualFallback
                        ? '视频形象异常，已降级为静态身份卡'
                        : 'HeyGen 视频形象待迁移 · 当前为静态身份卡',
                    key: const ValueKey('ai-twin-stage-note'),
                    style: const TextStyle(color: Colors.white54, fontSize: 9),
                  ),
                  const SizedBox(height: 8),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 18),
                    child: Text(
                      _voiceMuted && _voiceState == 'speaking'
                          ? '（已静音 · 字幕继续显示）$subtitle'
                          : subtitle,
                      key: const ValueKey('ai-twin-subtitle'),
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 11,
                        height: 1.6,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                FilledButton(
                  key: const ValueKey('ai-twin-voice-toggle'),
                  onPressed: _voiceState == 'idle'
                      ? _startVoiceDemo
                      : _stopVoiceDemo,
                  child: Text(_voiceState == 'idle' ? '自由讲解' : '打断并停止'),
                ),
                OutlinedButton(
                  key: const ValueKey('ai-twin-mute-toggle'),
                  onPressed: () =>
                      setState(() => _voiceMuted = !_voiceMuted),
                  child: Text(_voiceMuted ? '取消静音' : '静音'),
                ),
                OutlinedButton(
                  key: const ValueKey('ai-twin-fallback-toggle'),
                  onPressed: () =>
                      setState(() => _visualFallback = !_visualFallback),
                  child: Text(_visualFallback ? '恢复形象' : '模拟异常降级'),
                ),
              ],
            ),
          ],
        ),
      ),
    ];
  }

  List<Widget> _versions(LocalAiTwinState state) => [
    _Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '版本记录（${state.versions.length}）',
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 4),
          const Text(
            '人格与知识的版本随场景隔离；资料更新与场景切换都会生成版本行。',
            style: TextStyle(fontSize: 9, color: AirvanaColors.muted),
          ),
          const SizedBox(height: 10),
          if (state.versions.isEmpty)
            const Text(
              '还没有版本记录。更新资料或切换场景后会显示在这里。',
              key: ValueKey('ai-twin-versions-empty'),
              style: TextStyle(fontSize: 10, color: AirvanaColors.muted),
            )
          else
            for (final version in state.versions)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: LedgerRow(
                  title: version.label,
                  subtitle: version.time,
                  pill: StatusPill(
                    label: '场景 ${version.scene}',
                    tone: AirvanaStatusTone.demo,
                  ),
                ),
              ),
        ],
      ),
    ),
  ];

  List<Widget> _test(LocalAiTwinState state) => [
    _Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            '本地沙盒对话',
            style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 4),
          const Text(
            '验证语气与拒答边界；对话只存在于当前页面，不产生外部输出。',
            style: TextStyle(fontSize: 9, color: AirvanaColors.muted),
          ),
          const SizedBox(height: 10),
          for (final message in _sandbox)
            Align(
              alignment: message.fromUser
                  ? Alignment.centerRight
                  : Alignment.centerLeft,
              child: Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 8,
                ),
                constraints: const BoxConstraints(maxWidth: 280),
                decoration: BoxDecoration(
                  color: message.fromUser
                      ? const Color(0xFFFFF1F2)
                      : const Color(0xFFF2F2F7),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Text(
                  message.text,
                  style: const TextStyle(fontSize: 11, height: 1.5),
                ),
              ),
            ),
          Row(
            children: [
              Expanded(
                child: TextField(
                  key: const ValueKey('ai-twin-sandbox-input'),
                  controller: _sandboxInput,
                  decoration: const InputDecoration(hintText: '发一条测试消息…'),
                  onSubmitted: (_) => _sendSandbox(state),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(
                key: const ValueKey('ai-twin-sandbox-send'),
                onPressed: () => _sendSandbox(state),
                child: const Text('发送'),
              ),
            ],
          ),
        ],
      ),
    ),
  ];

  void _sendSandbox(LocalAiTwinState state) {
    final text = _sandboxInput.text.trim();
    if (text.isEmpty) return;
    final blocked = state.blockedTopics
        .split(RegExp(r'[、,，\s]+'))
        .where((topic) => topic.isNotEmpty)
        .any(text.contains);
    setState(() {
      _sandbox.add((fromUser: true, text: text));
      _sandbox.add(
        (
          fromUser: false,
          text: blocked
              ? '【AI 分身 · 安全拦截】这个话题在拒答范围内，我不能回答。你可以调整拒答范围后再测试。'
              : '【AI 分身 · 演示】收到。我会用「${state.tone}」的语气围绕擅长话题回应；真实回复需服务端模型接入。',
        ),
      );
      _sandboxInput.clear();
    });
  }

  List<Widget> _channels(
    LocalAiTwinState state,
    ({String label, String action, String audit, String next}) stage,
  ) => [
    _Panel(
      child: Column(
        children: [
          for (final (channel, meta, enabled) in [
            ('Airvana APP', '站内发布 · 平台默认', state.status == 'active_demo'),
            ('X', '外部连接意向 · 待授权', false),
            ('Telegram', '社区分发意向 · 待授权', false),
            ('Discord', '社区运营意向 · 待授权', false),
            ('Instagram', '内容分发意向 · 待授权', false),
          ])
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 6),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          channel,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        Text(
                          meta,
                          style: const TextStyle(
                            fontSize: 9,
                            color: AirvanaColors.muted,
                          ),
                        ),
                      ],
                    ),
                  ),
                  StatusPill(
                    label: enabled ? '已启用 · 演示' : '仅保存意向',
                    tone: enabled
                        ? AirvanaStatusTone.confirmed
                        : AirvanaStatusTone.demo,
                  ),
                ],
              ),
            ),
          const SizedBox(height: 8),
          const Text(
            '外部渠道只记录意向；真实连接需要单独授权与人工审核。',
            style: TextStyle(fontSize: 9, color: AirvanaColors.muted),
          ),
        ],
      ),
    ),
  ];

  List<Widget> _ops(LocalAiTwinState state) => [
    _Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Checkbox(
                key: const ValueKey('ai-twin-consent'),
                value: state.consent,
                onChanged: (value) => _save(
                  state.copyWith(consent: value == true),
                  auditTitle: value == true ? '确认本人授权' : '撤销本人授权',
                ),
              ),
              const Expanded(
                child: Text(
                  '我确认本人授权使用我的公开身份创建 AI 分身，并了解全部关键动作需人工确认。',
                  style: TextStyle(fontSize: 10, height: 1.5),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            '审计记录（${state.audit.length}）',
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 8),
          if (state.audit.isEmpty)
            const Text(
              '启用、暂停与授权变更都会写入本地审计记录。',
              style: TextStyle(fontSize: 10, color: AirvanaColors.muted),
            )
          else
            for (final entry in state.audit)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: LedgerRow(
                  title: entry.title,
                  subtitle: entry.time,
                  pill: StatusPill(
                    label: entry.status,
                    tone: AirvanaStatusTone.demo,
                  ),
                ),
              ),
        ],
      ),
    ),
  ];
}

class _TwinTab extends StatelessWidget {
  const _TwinTab({
    super.key,
    required this.label,
    required this.active,
    required this.onTap,
  });

  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    borderRadius: BorderRadius.circular(999),
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: active ? const Color(0xFFFFF1F2) : Colors.white,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: active ? const Color(0xFFFFD6DA) : AirvanaColors.line,
        ),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w900,
          color: active ? AirvanaColors.accent : AirvanaColors.ink,
        ),
      ),
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
    ),
    child: child,
  );
}
