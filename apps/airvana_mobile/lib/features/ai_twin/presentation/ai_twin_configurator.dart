import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// AI 分身的 configurator，对应 Web `aiTwin` panel 中常驻在 tab 之上的部分。
///
/// 边界与 Web 一致：只生成前端概念预览，不训练人脸模型、不生成真实口型视频，
/// 也不会获得发布或代理权限。
class AiTwinConfigurator extends ConsumerWidget {
  const AiTwinConfigurator({super.key, required this.state});

  final LocalAiTwinState state;

  static const positions = <(String, String, String, String)>[
    ('host', 'A', '数字主播 / 客服型', '快速接待、清晰答疑与流程引导'),
    ('idol', 'B', '品牌代言人 / 偶像型', '品牌故事、情绪价值与行动号召'),
    ('game', 'C', '游戏角色 / 元宇宙型', '世界观沉浸、任务提示与陪伴体验'),
    ('advisor', 'D', '虚拟助理 / 专业顾问型', '结构化解释、规则说明与风险提示'),
  ];

  static const styles = <(String, String, String, String)>[
    ('custom', 'MY', '我的 KOL 分身', '自定义虚拟角色'),
    ('hyperreal', 'A', '游戏 KOL', '三语精准口型'),
    ('semireal', 'B', '品牌讲解 KOL', '原生口型＋动作'),
    ('anime', 'C', '二次元 3D KOL', '角色保留 · 待口型'),
    ('cyber', 'D', '赛博科技 KOL', '原生口型＋动作'),
  ];

  static const customStyles = <(String, String)>[
    ('cg', '精致 CG'),
    ('anime', '潮流二次元'),
    ('cyber', '赛博科技'),
  ];

  static const customLooks = <(String, String)>[
    ('game', 'Web3 游戏'),
    ('professional', '专业讲解'),
    ('street', '潮流街头'),
  ];

  static const customMotions = <(String, String)>[
    ('explain', '自然讲解'),
    ('greet', '问候挥手'),
    ('point', '指向作品'),
  ];

  static const experiences = <(String, String, String)>[
    ('zh', '中文', '完整游戏介绍'),
    ('en', 'English', 'Full walkthrough'),
    ('ja', '日本語', 'ゲーム紹介'),
  ];

  Future<void> _save(WidgetRef ref, LocalAiTwinState next) async {
    await ref.read(airvanaRepositoryProvider).saveAiTwinState(next);
    ref.invalidate(aiTwinStateProvider);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) => Column(
    key: const ValueKey('ai-twin-configurator'),
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      _identitySplit(context, ref),
      const SizedBox(height: 12),
      _scenes(context, ref),
      const SizedBox(height: 12),
      _positions(ref),
      const SizedBox(height: 12),
      _styleLibrary(ref),
      const SizedBox(height: 12),
      _customBuilder(context, ref),
      const SizedBox(height: 12),
      _experiences(ref),
    ],
  );

  Widget _card({required Widget child, Key? key}) => Container(
    key: key,
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: AirvanaColors.line),
    ),
    child: child,
  );

  Widget _identitySplit(BuildContext context, WidgetRef ref) => _card(
    key: const ValueKey('ai-twin-identity-split'),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _Heading(
          title: '个人资料与 AI 分身独立管理',
          subtitle: '同一账户、两类公开身份；创建后互不覆盖',
        ),
        const SizedBox(height: 10),
        const _MiniRow(label: '平台个人资料', value: 'Kai Chen'),
        const _MiniRow(label: 'AI 分身资料', value: 'Nova'),
        const SizedBox(height: 8),
        CheckboxListTile(
          key: const ValueKey('ai-twin-copy-profile'),
          contentPadding: EdgeInsets.zero,
          controlAffinity: ListTileControlAffinity.leading,
          value: state.copyProfileOnCreate,
          onChanged: (value) =>
              _save(ref, state.copyWith(copyProfileOnCreate: value ?? false)),
          title: const Text(
            '复制当前公开资料',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900),
          ),
          subtitle: const Text(
            '只在首次创建时复制名称、简介与公开头像',
            style: TextStyle(fontSize: 9),
          ),
        ),
        SizedBox(
          width: double.infinity,
          child: FilledButton(
            key: const ValueKey('ai-twin-create-primary'),
            onPressed: state.status == 'not_created'
                ? () => _save(ref, state.copyWith(status: 'configuring'))
                : null,
            child: Text(
              state.status == 'not_created' ? '✦ 创建主分身 · 生成独立资料' : '主分身已创建',
            ),
          ),
        ),
        const SizedBox(height: 8),
        const Wrap(
          spacing: 10,
          runSpacing: 4,
          children: [
            Text('✓ 主分身唯一', style: TextStyle(fontSize: 9)),
            Text('✓ 创建后独立编辑', style: TextStyle(fontSize: 9)),
            Text('✓ AI 身份持续展示', style: TextStyle(fontSize: 9)),
            Text('✓ 授权可追溯', style: TextStyle(fontSize: 9)),
          ],
        ),
      ],
    ),
  );

  Widget _scenes(BuildContext context, WidgetRef ref) => _card(
    key: const ValueKey('ai-twin-scenes'),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _Heading(
          title: '场景分身',
          subtitle: '一个主分身，可派生多个独立场景',
          trailing: '${state.scenes.length} 个',
        ),
        const SizedBox(height: 9),
        for (var index = 0; index < state.scenes.length; index += 1)
          Padding(
            key: ValueKey('ai-twin-scene-$index'),
            padding: const EdgeInsets.only(bottom: 7),
            child: Row(
              children: [
                Text(
                  index == 0 ? 'AI' : '◇',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    state.scenes[index],
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                Text(
                  index == 0 ? '唯一主分身' : '场景分身',
                  style: const TextStyle(
                    fontSize: 9,
                    color: AirvanaColors.muted,
                  ),
                ),
              ],
            ),
          ),
        OutlinedButton(
          key: const ValueKey('ai-twin-add-scene'),
          onPressed: () => _save(
            ref,
            state.copyWith(
              scenes: [...state.scenes, '场景分身 ${state.scenes.length}'],
            ),
          ),
          child: const Text('＋ 新增场景'),
        ),
        const SizedBox(height: 4),
        const Text(
          '继承形象，不继承 Campaign 权限',
          style: TextStyle(fontSize: 9, color: AirvanaColors.muted),
        ),
      ],
    ),
  );

  Widget _positions(WidgetRef ref) => _card(
    key: const ValueKey('ai-twin-positions'),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _Heading(title: '人物定位', subtitle: '人物定位决定表达策略'),
        const SizedBox(height: 9),
        for (final position in positions)
          InkWell(
            key: ValueKey('ai-twin-position-${position.$1}'),
            onTap: () => _save(ref, state.copyWith(position: position.$1)),
            borderRadius: BorderRadius.circular(13),
            child: Container(
              margin: const EdgeInsets.only(bottom: 7),
              padding: const EdgeInsets.all(11),
              decoration: BoxDecoration(
                color: state.position == position.$1
                    ? const Color(0xFFFFF1F2)
                    : AirvanaColors.canvas,
                borderRadius: BorderRadius.circular(13),
                border: Border.all(
                  color: state.position == position.$1
                      ? AirvanaColors.accent
                      : AirvanaColors.line,
                ),
              ),
              child: Row(
                children: [
                  Text(
                    position.$2,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                      color: AirvanaColors.accent,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          position.$3,
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        Text(
                          position.$4,
                          style: const TextStyle(
                            fontSize: 9,
                            color: AirvanaColors.muted,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
      ],
    ),
  );

  Widget _styleLibrary(WidgetRef ref) => _card(
    key: const ValueKey('ai-twin-style-library'),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _Heading(title: 'KOL 分身角色库', subtitle: '视觉风格决定舞台形象'),
        const SizedBox(height: 9),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final style in styles)
              ChoiceChip(
                key: ValueKey('ai-twin-style-${style.$1}'),
                label: Text(
                  '${style.$3} · ${style.$4}',
                  style: const TextStyle(fontSize: 10),
                ),
                selected: state.visualStyle == style.$1,
                onSelected: (_) =>
                    _save(ref, state.copyWith(visualStyle: style.$1)),
              ),
          ],
        ),
      ],
    ),
  );

  Widget _customBuilder(BuildContext context, WidgetRef ref) => _card(
    key: const ValueKey('ai-twin-custom-builder'),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _Heading(
          title: '制作我的 KOL 分身',
          subtitle: '头像驱动的虚拟角色概念配置',
          trailing: state.customSaved ? '已保存 · 当前会话' : '待保存',
        ),
        const SizedBox(height: 10),
        _OptionRow(
          label: '角色风格',
          options: customStyles,
          selected: state.customStyle,
          keyPrefix: 'custom-style',
          onPick: (value) => _save(ref, state.copyWith(customStyle: value)),
        ),
        _OptionRow(
          label: '服装造型',
          options: customLooks,
          selected: state.customLook,
          keyPrefix: 'custom-look',
          onPick: (value) => _save(ref, state.copyWith(customLook: value)),
        ),
        _OptionRow(
          label: '默认动作',
          options: customMotions,
          selected: state.customMotion,
          keyPrefix: 'custom-motion',
          onPick: (value) => _save(ref, state.copyWith(customMotion: value)),
        ),
        const SizedBox(height: 8),
        SizedBox(
          width: double.infinity,
          child: FilledButton(
            key: const ValueKey('ai-twin-save-custom'),
            onPressed: () async {
              await _save(ref, state.copyWith(customSaved: true));
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('已保存为我的 KOL 分身（本机概念预览）')),
                );
              }
            },
            child: const Text('保存为我的 KOL 分身'),
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          '当前只生成前端概念预览，不训练人脸模型、不生成真实口型视频，'
          '也不会获得发布或代理权限。',
          key: ValueKey('ai-twin-custom-boundary'),
          style: TextStyle(
            fontSize: 9,
            height: 1.6,
            color: AirvanaColors.muted,
          ),
        ),
      ],
    ),
  );

  Widget _experiences(WidgetRef ref) => _card(
    key: const ValueKey('ai-twin-experiences'),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const _Heading(title: '多语言互动场景', subtitle: '前端即时切换'),
        const SizedBox(height: 9),
        for (final experience in experiences)
          RadioListTile<String>(
            key: ValueKey('ai-twin-experience-${experience.$1}'),
            contentPadding: EdgeInsets.zero,
            dense: true,
            value: experience.$1,
            groupValue: state.language,
            onChanged: (value) =>
                _save(ref, state.copyWith(language: value ?? 'zh')),
            title: Text(
              '${experience.$2} · ${experience.$3}',
              style: const TextStyle(fontSize: 11),
            ),
          ),
        const Text(
          '舞台为静态概念预览；真实口型视频依赖第三方服务，本机不生成。',
          style: TextStyle(fontSize: 9, color: AirvanaColors.muted),
        ),
      ],
    ),
  );
}

class _Heading extends StatelessWidget {
  const _Heading({required this.title, required this.subtitle, this.trailing});

  final String title;
  final String subtitle;
  final String? trailing;

  @override
  Widget build(BuildContext context) => Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 3),
            Text(
              subtitle,
              style: const TextStyle(fontSize: 9, color: AirvanaColors.muted),
            ),
          ],
        ),
      ),
      if (trailing != null)
        Text(
          trailing!,
          style: const TextStyle(
            fontSize: 9,
            fontWeight: FontWeight.w900,
            color: AirvanaColors.muted,
          ),
        ),
    ],
  );
}

class _MiniRow extends StatelessWidget {
  const _MiniRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 6),
    child: Row(
      children: [
        Expanded(
          child: Text(
            label,
            style: const TextStyle(fontSize: 10, color: AirvanaColors.muted),
          ),
        ),
        Text(
          value,
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900),
        ),
      ],
    ),
  );
}

class _OptionRow extends StatelessWidget {
  const _OptionRow({
    required this.label,
    required this.options,
    required this.selected,
    required this.keyPrefix,
    required this.onPick,
  });

  final String label;
  final List<(String, String)> options;
  final String selected;
  final String keyPrefix;
  final ValueChanged<String> onPick;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 9),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 5),
        Wrap(
          spacing: 7,
          runSpacing: 7,
          children: [
            for (final option in options)
              ChoiceChip(
                key: ValueKey('ai-twin-$keyPrefix-${option.$1}'),
                label: Text(option.$2, style: const TextStyle(fontSize: 10)),
                selected: selected == option.$1,
                onSelected: (_) => onPick(option.$1),
              ),
          ],
        ),
      ],
    ),
  );
}
