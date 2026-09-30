import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/ai_twin/domain/twin_demo.dart';
import 'package:airvana_mobile/features/ai_twin/presentation/ai_twin_configurator.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class AiTwinPageBody extends ConsumerStatefulWidget {
  const AiTwinPageBody({super.key});
  @override
  ConsumerState<AiTwinPageBody> createState() => _AiTwinPageBodyState();
}

class _AiTwinPageBodyState extends ConsumerState<AiTwinPageBody> {
  TwinDemoState? _saved;
  TwinDemoConfig _draft = const TwinDemoConfig();
  List<LocalPlayable> _playables = [];
  String? _error;
  bool _busy = false, _leave = false;
  int _tab = 0;
  final _scroll = ScrollController();
  final _question = TextEditingController();
  late final _name = TextEditingController();
  late final _tagline = TextEditingController();
  late final _knowledge = TextEditingController();
  late final _blocked = TextEditingController();
  bool get _dirty => _saved != null && !_draft.sameAs(_saved!.config);

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    for (final c in [_question, _name, _tagline, _knowledge, _blocked]) {
      c.dispose();
    }
    _scroll.dispose();
    super.dispose();
  }

  void _setDraft(TwinDemoConfig config) {
    _draft = config;
    _name.text = config.name;
    _tagline.text = config.tagline;
    _knowledge.text = config.knowledge;
    _blocked.text = config.blockedTopics;
  }

  Future<void> _load() async {
    try {
      final workspace = await ref
          .read(airvanaRepositoryProvider)
          .loadLocalWorkspace();
      if (!mounted) return;
      final legacy = workspace.aiTwinState;
      final demo =
          legacy.demo ??
          TwinDemoState(
            config: TwinDemoConfig(
              name: legacy.name.trim().isEmpty ? '我的 KOL 分身' : legacy.name,
              tagline: legacy.tagline.isEmpty
                  ? '陪你发现更有趣的 Agentic Playable。'
                  : legacy.tagline,
              style: legacy.customStyle,
              look: legacy.customLook,
              motion: legacy.customMotion,
              language: legacy.language,
              blockedTopics: legacy.blockedTopics,
            ),
          );
      setState(() {
        _saved = demo;
        _setDraft(demo.config);
        _playables = workspace.playables;
        _error = null;
      });
    } catch (_) {
      if (mounted) setState(() => _error = '本机分身读取失败，请重试。');
    }
  }

  Future<bool> _persist(TwinDemoState next, String message) async {
    if (_busy) return false;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(airvanaRepositoryProvider).saveTwinDemo(next);
      if (!mounted) return true;
      setState(() => _saved = next);
      ref.invalidate(aiTwinStateProvider);
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text(message)));
      return true;
    } catch (_) {
      if (mounted) setState(() => _error = '保存到本机失败，修改尚未生效。请重试。');
      return false;
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _change(TwinDemoConfig config) => setState(() {
    _draft = config;
    _error = null;
  });

  Future<void> _saveConfig() async {
    final config = _draft.copyWith(
      name: _draft.name.trim(),
      tagline: _draft.tagline.trim(),
    );
    if (config.validationError != null) {
      setState(() => _error = config.validationError);
      return;
    }
    final next = _saved!.save(config, DateTime.now());
    if (await _persist(next, '已保存到本机 · v${next.revision}，可继续互动测试')) {
      if (!mounted) return;
      setState(() {
        _setDraft(next.config);
        _tab = 1;
      });
      _scroll.jumpTo(0);
    }
  }

  Future<bool> _confirm(String title, String body) async =>
      await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(title),
          content: Text(body),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('取消'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('确认'),
            ),
          ],
        ),
      ) ??
      false;

  Future<void> _send([String? prompt]) async {
    if (_busy || _saved!.revision == 0 || _dirty) return;
    final question = prompt ?? _question.text.trim();
    if (question.isEmpty) return;
    if (await _persist(_saved!.test(question), '当前版本已完成一次本机互动测试') && mounted) {
      _question.clear();
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = _saved;
    if (state == null) {
      return Center(
        child: _error == null
            ? const CircularProgressIndicator()
            : Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(_error!),
                  TextButton(onPressed: _load, child: const Text('重新加载')),
                ],
              ),
      );
    }
    return PopScope(
      canPop: _leave || (!_dirty && !_busy),
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop || _busy) return;
        if (await _confirm('放弃未保存的修改？', '本机已保存的版本不受影响。') && mounted) {
          setState(() => _leave = true);
          await WidgetsBinding.instance.endOfFrame;
          if (context.mounted) Navigator.of(context).pop();
        }
      },
      child: Column(
        children: [
          Container(
            key: const ValueKey('twin-demo-banner'),
            width: double.infinity,
            color: AirvanaColors.surface,
            padding: const EdgeInsets.fromLTRB(20, 10, 20, 12),
            child: const Text(
              'LOCAL DEMO · 仅保存到本机，不连接模型或外部渠道',
              style: TextStyle(fontSize: 11, color: AirvanaColors.muted),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            child: Row(
              children: [
                for (final item in [
                  (0, '配置'),
                  (1, '互动测试'),
                  (2, '应用作品'),
                  (3, '版本'),
                ])
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 2),
                      child: TextButton(
                        key: ValueKey('twin-tab-${item.$1}'),
                        style: TextButton.styleFrom(
                          backgroundColor: _tab == item.$1
                              ? AirvanaColors.surface
                              : Colors.transparent,
                          foregroundColor: _tab == item.$1
                              ? AirvanaColors.accent
                              : AirvanaColors.muted,
                          minimumSize: const Size(44, 44),
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                        ),
                        onPressed: _busy
                            ? null
                            : () {
                                setState(() => _tab = item.$1);
                                _scroll.jumpTo(0);
                              },
                        child: Text(
                          item.$2,
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                          ),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 8),
              child: Text(
                _error!,
                key: const ValueKey('twin-error'),
                style: const TextStyle(color: AirvanaColors.accent),
              ),
            ),
          Expanded(
            key: const ValueKey('twin-scroll-body'),
            child: ListView(
              key: const ValueKey('twin-demo-scroll'),
              controller: _scroll,
              padding: EdgeInsets.fromLTRB(
                20,
                0,
                20,
                MediaQuery.viewPaddingOf(context).bottom + 24,
              ),
              children: [
                if (_tab == 0) ..._configuration(state),
                if (_tab == 1) ..._interaction(state),
                if (_tab == 2) ..._applications(state),
                if (_tab == 3) ..._history(state),
              ],
            ),
          ),
          if (_busy) const LinearProgressIndicator(minHeight: 2),
        ],
      ),
    );
  }

  Widget _card(String title, List<Widget> children, {String? subtitle}) =>
      Container(
        width: double.infinity,
        margin: const EdgeInsets.only(bottom: 14),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AirvanaColors.surface,
          borderRadius: BorderRadius.circular(22),
          border: Border.all(color: AirvanaColors.line),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
            ),
            if (subtitle != null) ...[
              const SizedBox(height: 6),
              Text(
                subtitle,
                style: const TextStyle(
                  fontSize: 11,
                  color: AirvanaColors.muted,
                  height: 1.5,
                ),
              ),
            ],
            const SizedBox(height: 14),
            ...children,
          ],
        ),
      );
  Widget _action(String label, String key, VoidCallback? onPressed) => SizedBox(
    width: double.infinity,
    child: FilledButton(
      key: ValueKey(key),
      onPressed: _busy ? null : onPressed,
      child: Text(label),
    ),
  );

  Widget _field(
    String key,
    String label,
    TextEditingController controller,
    int limit,
    ValueChanged<String> onChanged, {
    int lines = 1,
  }) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: TextField(
      key: ValueKey(key),
      controller: controller,
      enabled: !_busy,
      maxLength: limit,
      maxLines: lines,
      style: const TextStyle(fontSize: 13),
      decoration: InputDecoration(
        labelText: label,
        border: const OutlineInputBorder(),
      ),
      onChanged: onChanged,
    ),
  );

  Widget _choices(
    String title,
    String key,
    List<(String, String)> options,
    String value,
    ValueChanged<String> onChanged,
  ) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 6),
        Wrap(
          spacing: 7,
          runSpacing: 5,
          children: [
            for (final option in options)
              ChoiceChip(
                key: ValueKey('$key-${option.$1}'),
                label: Text(option.$2, style: const TextStyle(fontSize: 12)),
                selected: value == option.$1,
                selectedColor: AirvanaColors.accent.withValues(alpha: .09),
                checkmarkColor: AirvanaColors.accent,
                side: BorderSide(
                  color: value == option.$1
                      ? AirvanaColors.accent.withValues(alpha: .25)
                      : AirvanaColors.line,
                ),
                onSelected: _busy ? null : (_) => onChanged(option.$1),
              ),
          ],
        ),
      ],
    ),
  );

  List<Widget> _configuration(TwinDemoState state) => [
    TwinDemoPreview(
      config: _draft,
      caption: _dirty
          ? '未保存的预览'
          : state.revision == 0
          ? '选择造型，创建你的分身'
          : '本机已保存 · v${state.revision}',
    ),
    const SizedBox(height: 14),
    _card('制作我的 KOL 分身', [
      _field(
        'twin-name',
        '分身名称',
        _name,
        24,
        (v) => _change(_draft.copyWith(name: v)),
      ),
      _field(
        'twin-tagline',
        '一句话介绍',
        _tagline,
        100,
        (v) => _change(_draft.copyWith(tagline: v)),
        lines: 2,
      ),
      _choices(
        '人物定位',
        'twin-role',
        const [('游戏伙伴', '游戏伙伴'), ('品牌讲解', '品牌讲解'), ('社区答疑', '社区答疑')],
        _draft.role,
        (v) => _change(_draft.copyWith(role: v)),
      ),
      _choices(
        '角色风格',
        'twin-style',
        AiTwinConfigurator.customStyles,
        _draft.style,
        (v) => _change(_draft.copyWith(style: v)),
      ),
      _choices(
        '服装示意',
        'twin-look',
        AiTwinConfigurator.customLooks,
        _draft.look,
        (v) => _change(_draft.copyWith(look: v)),
      ),
      _choices(
        '默认动作',
        'twin-motion',
        AiTwinConfigurator.customMotions,
        _draft.motion,
        (v) => _change(_draft.copyWith(motion: v)),
      ),
      _choices(
        '讲解语言',
        'twin-language',
        const [('zh', '中文'), ('en', 'English'), ('ja', '日本語')],
        _draft.language,
        (v) => _change(_draft.copyWith(language: v)),
      ),
    ], subtitle: '造型与动作使用内置示意素材即时预览，不训练人脸或生成口型视频。'),
    _card('知识与回答边界', [
      _field(
        'twin-knowledge',
        '本机知识（可留空）',
        _knowledge,
        1000,
        (v) => _change(_draft.copyWith(knowledge: v)),
        lines: 4,
      ),
      _field(
        'twin-blocked',
        '拒答关键词，用顿号分隔',
        _blocked,
        200,
        (v) => _change(_draft.copyWith(blockedTopics: v)),
        lines: 2,
      ),
      const Text(
        '只填写获授权的公开信息，不要输入私钥、助记词等秘密。清空知识并保存后，后续回复即不再引用旧内容。',
        style: TextStyle(fontSize: 11, color: AirvanaColors.muted, height: 1.6),
      ),
    ]),
    _action(
      _busy
          ? '保存中…'
          : state.revision == 0
          ? '保存分身，开始测试'
          : '保存并测试新版本',
      'twin-save',
      _saveConfig,
    ),
    if (_dirty)
      TextButton(
        key: const ValueKey('twin-discard'),
        onPressed: _busy
            ? null
            : () async {
                if (await _confirm('恢复已保存配置？', '本次未保存的修改将被丢弃。') && mounted) {
                  setState(() => _setDraft(state.config));
                }
              },
        child: const Text('放弃未保存的修改'),
      ),
  ];

  List<Widget> _interaction(TwinDemoState state) => [
    TwinDemoPreview(
      config: state.config,
      caption: state.revision == 0 ? '请先保存配置' : '正在测试本机 v${state.revision}',
    ),
    const SizedBox(height: 14),
    _card('互动测试', [
      if (_dirty || state.revision == 0) ...[
        const Text('请先保存当前配置，再测试和启用。'),
        TextButton(
          onPressed: () => setState(() => _tab = 0),
          child: const Text('返回配置'),
        ),
      ] else ...[
        Wrap(
          spacing: 6,
          children: [
            for (final prompt in ['你好', '介绍你的知识', '帮我做投资建议'])
              ActionChip(
                label: Text(prompt, style: const TextStyle(fontSize: 11)),
                onPressed: _busy ? null : () => _send(prompt),
              ),
          ],
        ),
        for (final message in state.messages.where(
          (m) => m.revision == state.revision,
        )) ...[_bubble(message.question, true), _bubble(message.answer, false)],
        TextField(
          key: const ValueKey('twin-question'),
          controller: _question,
          enabled: !_busy,
          maxLength: 300,
          decoration: const InputDecoration(hintText: '输入测试问题…'),
          onSubmitted: (_) => _send(),
        ),
        _action('发送测试消息', 'twin-send', () => _send()),
        if (state.messages.isNotEmpty)
          TextButton(
            onPressed: _busy
                ? null
                : () async {
                    if (await _confirm('清空本机测试对话？', '不会删除分身配置和版本。')) {
                      await _persist(state.clearMessages(), '本机测试对话已清空');
                    }
                  },
            child: const Text('清空测试对话'),
          ),
      ],
    ], subtitle: '规则模板回复 · 非真实大模型。测试记录保存在本机；这里的拒答演示不是生产安全防护。'),
    _card('启用站内演示', [
      Text(
        state.tested ? '✓ 当前版本已测试' : '先发送一条测试消息，检查表现后再启用',
        style: const TextStyle(fontSize: 12),
      ),
      CheckboxListTile(
        key: const ValueKey('twin-consent'),
        contentPadding: EdgeInsets.zero,
        value: state.consent,
        activeColor: AirvanaColors.accent,
        title: const Text('允许在本机以 AI 身份展示此分身', style: TextStyle(fontSize: 12)),
        subtitle: const Text(
          '可随时撤销；不授予真实发布、声音克隆或代理权限',
          style: TextStyle(fontSize: 10),
        ),
        onChanged: _busy
            ? null
            : (v) => _persist(
                state.authorize(v == true),
                v == true ? '已记录本机演示授权' : '授权已撤销，模拟接待已停止',
              ),
      ),
      _action(
        state.active ? '暂停分身演示' : '启用分身演示',
        'twin-enable',
        !_dirty && (state.active || (state.tested && state.consent))
            ? () => _persist(
                state.activate(!state.active),
                state.active ? '已暂停所有本机作品的模拟接待' : '本机演示已启用，可到“应用作品”体验',
              )
            : null,
      ),
      const SizedBox(height: 10),
      Text(
        state.active ? '已启用 · 仅本机' : '未启用 · 不对外接待',
        key: const ValueKey('twin-status'),
        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
      ),
    ]),
  ];

  Widget _bubble(String text, bool mine) => Align(
    alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
    child: Container(
      margin: const EdgeInsets.symmetric(vertical: 5),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: mine
            ? AirvanaColors.accent.withValues(alpha: .07)
            : AirvanaColors.canvas,
        borderRadius: BorderRadius.circular(14),
      ),
      child: Text(text, style: const TextStyle(fontSize: 12, height: 1.6)),
    ),
  );

  List<Widget> _applications(TwinDemoState state) => [
    _card('应用到作品 · 本机模拟', [
      const Text(
        '在此绑定并预览分身接待。不发布、不修改游戏、不接入真实访客。',
        style: TextStyle(fontSize: 12, color: AirvanaColors.muted, height: 1.6),
      ),
      if (_dirty)
        const Padding(
          padding: EdgeInsets.only(top: 10),
          child: Text(
            '有未保存的配置，请先保存并完成测试。',
            style: TextStyle(color: AirvanaColors.accent),
          ),
        ),
      if (!state.active)
        TextButton(
          onPressed: () => setState(() => _tab = 1),
          child: const Text('先测试并启用分身'),
        ),
    ]),
    for (final item in <(String, String)>[
      for (final p in _playables) (p.playableId, p.title),
      if (_playables.isEmpty) ('demo:twin-playground', '互动体验示例（非已发布作品）'),
    ])
      _card(item.$2, [
        SwitchListTile(
          key: ValueKey('twin-bind-${item.$1}'),
          contentPadding: EdgeInsets.zero,
          title: const Text('模拟接待', style: TextStyle(fontSize: 13)),
          subtitle: Text(
            state.playableIds.contains(item.$1)
                ? state.active
                      ? '使用当前 v${state.revision} · 仅本机'
                      : '绑定保留 · 接待已停止'
                : '未绑定',
            style: const TextStyle(fontSize: 11),
          ),
          value: state.playableIds.contains(item.$1),
          activeColor: AirvanaColors.accent,
          onChanged:
              _busy ||
                  _dirty ||
                  (!state.active && !state.playableIds.contains(item.$1))
              ? null
              : (value) => _persist(
                  state.bind(item.$1, value),
                  value ? '已绑定本机分身预览' : '已移除本机绑定',
                ),
        ),
        _action(
          '以访客身份体验',
          'twin-visit-${item.$1}',
          !_dirty && state.active && state.playableIds.contains(item.$1)
              ? () => showModalBottomSheet<void>(
                  context: context,
                  isScrollControlled: true,
                  useSafeArea: true,
                  backgroundColor: AirvanaColors.canvas,
                  builder: (_) => _VisitorPreview(state: state, title: item.$2),
                )
              : null,
        ),
      ]),
    _card('外部渠道', [
      const Text(
        'X、Telegram、Discord 等尚未连接。当前闭环仅在本机体验，不会对外发送消息。',
        style: TextStyle(fontSize: 12, color: AirvanaColors.muted, height: 1.6),
      ),
    ]),
  ];

  List<Widget> _history(TwinDemoState state) => [
    _card('版本记录 · ${state.versions.length}', [
      const Text(
        '保留最近 20 个本机版本。恢复会生成新版本，并暂停模拟接待，需重新测试后启用。',
        style: TextStyle(fontSize: 12, color: AirvanaColors.muted, height: 1.6),
      ),
      if (state.versions.isEmpty)
        const Padding(
          padding: EdgeInsets.only(top: 16),
          child: Text('尚未保存分身，去配置页创建第一个版本。'),
        ),
      for (final version in state.versions)
        ListTile(
          contentPadding: EdgeInsets.zero,
          title: Text(
            'v${version.number} · ${version.config.name}',
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
          ),
          subtitle: Text(
            '${version.createdAt.toLocal().toString().substring(0, 16)}\n${version.config.role} · ${version.config.language}',
            style: const TextStyle(fontSize: 11),
          ),
          trailing: version.number == state.revision
              ? const Text('当前', style: TextStyle(color: AirvanaColors.accent))
              : TextButton(
                  key: ValueKey('twin-restore-${version.number}'),
                  onPressed: _busy
                      ? null
                      : () async {
                          if (!await _confirm(
                            '恢复 v${version.number}？',
                            '未保存的修改会被替换，已有记录不会删除。恢复后需要重新测试。',
                          )) {
                            return;
                          }
                          final next = state.save(
                            version.config,
                            DateTime.now(),
                            restoring: true,
                          );
                          if (await _persist(
                                next,
                                '已恢复为本机 v${next.revision}，请重新测试',
                              ) &&
                              mounted) {
                            setState(() {
                              _setDraft(next.config);
                              _tab = 0;
                            });
                            _scroll.jumpTo(0);
                          }
                        },
                  child: const Text('恢复'),
                ),
        ),
    ]),
  ];
}

class TwinDemoPreview extends StatefulWidget {
  const TwinDemoPreview({
    super.key,
    required this.config,
    required this.caption,
  });
  final TwinDemoConfig config;
  final String caption;
  @override
  State<TwinDemoPreview> createState() => _TwinDemoPreviewState();
}

class _TwinDemoPreviewState extends State<TwinDemoPreview>
    with SingleTickerProviderStateMixin {
  late final _motion = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1200),
  );
  @override
  void dispose() {
    _motion.dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(covariant TwinDemoPreview oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.config.motion != widget.config.motion &&
        !MediaQuery.disableAnimationsOf(context)) {
      _motion.forward(from: 0);
    }
  }

  @override
  Widget build(BuildContext context) {
    final config = widget.config;
    final motionIcon = switch (config.motion) {
      'greet' => Icons.waving_hand_outlined,
      'point' => Icons.touch_app_outlined,
      _ => Icons.chat_bubble_outline_rounded,
    };
    final lookIcon = switch (config.look) {
      'professional' => Icons.business_center_outlined,
      'street' => Icons.headphones_rounded,
      _ => Icons.sports_esports_outlined,
    };
    return Container(
      key: const ValueKey('twin-preview'),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AirvanaColors.surface,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AirvanaColors.line),
      ),
      child: Column(
        children: [
          Row(
            children: [
              const Text(
                'AI 分身',
                style: TextStyle(
                  fontSize: 12,
                  color: AirvanaColors.accent,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const Spacer(),
              Flexible(
                child: Text(
                  widget.caption,
                  textAlign: TextAlign.right,
                  style: const TextStyle(
                    fontSize: 10,
                    color: AirvanaColors.muted,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          AnimatedBuilder(
            animation: _motion,
            builder: (_, child) => Transform.rotate(
              angle:
                  (_motion.value < .5 ? _motion.value : 1 - _motion.value) *
                  (config.motion == 'greet' ? .25 : -.15),
              child: child,
            ),
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  width: 100,
                  height: 110,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: AirvanaColors.accent.withValues(alpha: .06),
                    borderRadius: BorderRadius.circular(
                      config.style == 'cyber' ? 20 : 44,
                    ),
                  ),
                  child: config.style == 'cg'
                      ? ClipOval(
                          child: Image.asset(
                            'assets/legacy/avatars/kai.png',
                            width: 72,
                            height: 72,
                            fit: BoxFit.cover,
                          ),
                        )
                      : Icon(
                          config.style == 'cyber'
                              ? Icons.smart_toy_outlined
                              : Icons.face_3_rounded,
                          key: ValueKey('twin-avatar-${config.style}'),
                          size: 66,
                          color: AirvanaColors.ink,
                        ),
                ),
                Positioned(
                  bottom: -5,
                  right: -7,
                  child: CircleAvatar(
                    radius: 18,
                    backgroundColor: AirvanaColors.accent,
                    child: Icon(lookIcon, color: Colors.white, size: 20),
                  ),
                ),
                Positioned(
                  top: 4,
                  right: -38,
                  child: Icon(
                    motionIcon,
                    size: 23,
                    color: AirvanaColors.accent,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 18),
          Text(
            config.name.trim().isEmpty ? '你的 KOL 分身' : config.name,
            textAlign: TextAlign.center,
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
          ),
          const SizedBox(height: 5),
          Text(
            '${config.role} · ${config.language.toUpperCase()}',
            style: const TextStyle(fontSize: 11, color: AirvanaColors.muted),
          ),
          TextButton(
            key: const ValueKey('twin-preview-motion'),
            onPressed: () {
              if (!MediaQuery.disableAnimationsOf(context)) {
                _motion.forward(from: 0);
              }
            },
            child: const Text('预览动作 · 示意动画', style: TextStyle(fontSize: 11)),
          ),
        ],
      ),
    );
  }
}

class _VisitorPreview extends StatefulWidget {
  const _VisitorPreview({required this.state, required this.title});
  final TwinDemoState state;
  final String title;
  @override
  State<_VisitorPreview> createState() => _VisitorPreviewState();
}

class _VisitorPreviewState extends State<_VisitorPreview> {
  final _input = TextEditingController();
  final List<String> _messages = [];
  bool _handoff = false;
  @override
  void dispose() {
    _input.dispose();
    super.dispose();
  }

  void _send() {
    if (_input.text.trim().isEmpty || _handoff) return;
    setState(() {
      _messages.add('访客：${_input.text.trim()}');
      _messages.add(
        widget.state.config.reply(
          _input.text.trim(),
          playableTitle: widget.title,
        ),
      );
      _input.clear();
    });
  }

  @override
  Widget build(BuildContext context) => SizedBox(
    height: MediaQuery.sizeOf(context).height * .85,
    child: Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        16,
        20,
        MediaQuery.viewInsetsOf(context).bottom + 12,
      ),
      child: Column(
        children: [
          Row(
            children: [
              const Expanded(
                child: Text(
                  '访客体验 · LOCAL DEMO',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                ),
              ),
              IconButton(
                tooltip: '关闭访客体验',
                onPressed: () => Navigator.pop(context),
                icon: const Icon(Icons.close),
              ),
            ],
          ),
          Text(
            widget.title,
            style: const TextStyle(fontSize: 12, color: AirvanaColors.muted),
          ),
          Expanded(
            child: ListView(
              reverse: true,
              children: [
                for (final text in [
                  _handoff
                      ? '【本机模拟】已切换人工接管，分身停止回复。未向真人发送请求。'
                      : widget.state.config.reply(
                          '你好',
                          playableTitle: widget.title,
                        ),
                  ..._messages,
                ].reversed)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Text(
                      text,
                      style: const TextStyle(fontSize: 13, height: 1.6),
                    ),
                  ),
              ],
            ),
          ),
          TextField(
            key: const ValueKey('twin-visitor-input'),
            controller: _input,
            enabled: !_handoff,
            maxLength: 300,
            decoration: const InputDecoration(hintText: '以访客身份提问'),
            onSubmitted: (_) => _send(),
          ),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  key: const ValueKey('twin-handoff'),
                  onPressed: () => setState(() => _handoff = !_handoff),
                  child: Text(_handoff ? '恢复分身' : '模拟人工接管'),
                ),
              ),
              const SizedBox(width: 8),
              FilledButton(
                key: const ValueKey('twin-visitor-send'),
                onPressed: _handoff ? null : _send,
                child: const Text('发送'),
              ),
            ],
          ),
        ],
      ),
    ),
  );
}
