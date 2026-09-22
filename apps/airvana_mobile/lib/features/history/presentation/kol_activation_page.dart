import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:flutter/material.dart';

/// 复刻 Web 的 `kolActivation` overlay：5 步开通向导。
/// 校验口径与 Web 一致：商业档案四项必填、协议必须勾选才能继续。
class KolActivationPageBody extends StatefulWidget {
  const KolActivationPageBody({super.key});

  @override
  State<KolActivationPageBody> createState() => _KolActivationPageBodyState();
}

class _KolActivationPageBodyState extends State<KolActivationPageBody> {
  static const _steps = <(String, String)>[
    ('welcome', '欢迎'),
    ('profile', '商业档案'),
    ('agreement', '创作者协议'),
    ('channels', '渠道设置'),
    ('campaign', '首个 Campaign'),
  ];

  static const _copy = <String, (String, String)>{
    'welcome': ('欢迎成为 Airvana KOL', '资格审核演示已通过。接下来完成首次商业设置。'),
    'profile': ('完善 KOL 商业档案', '让品牌了解你的内容方向、受众和合作偏好。'),
    'agreement': ('确认创作者协议', '明确内容责任、数据边界、收益复核与平台治理规则。'),
    'channels': ('设置发布与运营渠道', '这里只记录渠道意向；外部连接仍需单独授权和人工审核。'),
    'campaign': (
      '创建首个 Campaign',
      '先建立 Campaign Brief，再由受控流程生成 Campaign Contract。',
    ),
  };

  static const _channels = <(String, String, String)>[
    ('airvana', 'Airvana APP', '站内发布 · 平台默认'),
    ('x', 'X', '外部连接意向 · 待授权'),
    ('telegram', 'Telegram', '社区分发意向 · 待授权'),
    ('discord', 'Discord', '社区运营意向 · 待授权'),
    ('instagram', 'Instagram', '内容分发意向 · 待授权'),
  ];

  int _index = 0;
  String? _error;
  bool _agreementAccepted = false;
  bool _completed = false;
  final _selectedChannels = <String>{'airvana'};
  final _category = TextEditingController();
  final _audience = TextEditingController();
  final _languages = TextEditingController();
  final _collaboration = TextEditingController();

  @override
  void dispose() {
    for (final c in [_category, _audience, _languages, _collaboration]) {
      c.dispose();
    }
    super.dispose();
  }

  void _advance() {
    final key = _steps[_index].$1;
    if (key == 'profile' &&
        [
          _category,
          _audience,
          _languages,
          _collaboration,
        ].any((c) => c.text.trim().isEmpty)) {
      setState(() => _error = '请完整填写内容类型、受众、语言和合作方向。');
      return;
    }
    if (key == 'agreement' && !_agreementAccepted) {
      setState(() => _error = '请先阅读并同意创作者协议。');
      return;
    }
    setState(() {
      _error = null;
      if (_index < _steps.length - 1) {
        _index += 1;
      } else {
        _completed = true;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final step = _steps[_index];
    final copy = _copy[step.$1]!;
    return ListView(
      key: const ValueKey('kol-activation-body'),
      padding: const EdgeInsets.fromLTRB(18, 14, 18, 40),
      children: [
        Row(
          children: [
            Text(
              '第 ${_index + 1} / ${_steps.length} 步',
              style: const TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w800,
                color: AirvanaColors.muted,
              ),
            ),
            const Spacer(),
            if (_index > 0)
              GestureDetector(
                key: const ValueKey('kol-activation-back'),
                onTap: () => setState(() {
                  _index -= 1;
                  _error = null;
                }),
                child: const Text(
                  '返回上一步',
                  style: TextStyle(fontSize: 10, color: AirvanaColors.muted),
                ),
              ),
          ],
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: LinearProgressIndicator(
            key: const ValueKey('kol-activation-progress'),
            value: (_index + 1) / _steps.length,
            minHeight: 4,
            backgroundColor: AirvanaColors.line,
            valueColor: const AlwaysStoppedAnimation(AirvanaColors.accent),
          ),
        ),
        const SizedBox(height: 16),
        Text(
          copy.$1,
          style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 6),
        Text(
          copy.$2,
          style: const TextStyle(
            fontSize: 11,
            height: 1.6,
            color: AirvanaColors.muted,
          ),
        ),
        const SizedBox(height: 16),
        ..._stepBody(step.$1),
        if (_error != null) ...[
          const SizedBox(height: 12),
          Text(
            _error!,
            key: const ValueKey('kol-activation-error'),
            style: const TextStyle(fontSize: 11, color: Color(0xFFC62836)),
          ),
        ],
        const SizedBox(height: 18),
        if (_completed)
          Container(
            key: const ValueKey('kol-activation-done'),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFFF2FBF5),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFFBFE6CD)),
            ),
            child: const Text(
              '开通流程已完成（本机演示）。真实身份与商业权限仍以服务端审核为准。',
              style: TextStyle(
                fontSize: 11,
                height: 1.7,
                color: Color(0xFF14653A),
              ),
            ),
          )
        else
          SizedBox(
            height: 48,
            child: FilledButton(
              key: const ValueKey('kol-activation-next'),
              onPressed: _advance,
              child: Text(_index == _steps.length - 1 ? '完成开通' : '下一步'),
            ),
          ),
      ],
    );
  }

  List<Widget> _stepBody(String key) => switch (key) {
    'profile' => [
      _field('内容类型', _category, 'kol-field-category'),
      _field('目标受众', _audience, 'kol-field-audience'),
      _field('内容语言', _languages, 'kol-field-languages'),
      _field('合作方向', _collaboration, 'kol-field-collaboration'),
    ],
    'agreement' => [
      Container(
        padding: const EdgeInsets.all(13),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AirvanaColors.line),
        ),
        child: const Text(
          '创作者需对发布内容负责；平台保留审核、下架与暂停结算的权利。'
          '演示环境下的权益与收益数值不构成任何付款承诺。',
          style: TextStyle(fontSize: 11, height: 1.7),
        ),
      ),
      const SizedBox(height: 10),
      CheckboxListTile(
        key: const ValueKey('kol-agreement-checkbox'),
        contentPadding: EdgeInsets.zero,
        controlAffinity: ListTileControlAffinity.leading,
        value: _agreementAccepted,
        onChanged: (value) =>
            setState(() => _agreementAccepted = value ?? false),
        title: const Text('我已阅读并同意《创作者协议》', style: TextStyle(fontSize: 12)),
      ),
    ],
    'channels' => [
      for (final channel in _channels)
        CheckboxListTile(
          key: ValueKey('kol-channel-${channel.$1}'),
          contentPadding: EdgeInsets.zero,
          controlAffinity: ListTileControlAffinity.leading,
          value: _selectedChannels.contains(channel.$1),
          // Airvana 站内渠道是平台默认，不允许取消。
          onChanged: channel.$1 == 'airvana'
              ? null
              : (value) => setState(() {
                  if (value == true) {
                    _selectedChannels.add(channel.$1);
                  } else {
                    _selectedChannels.remove(channel.$1);
                  }
                }),
          title: Text(
            channel.$2,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
          ),
          subtitle: Text(
            channel.$3,
            style: const TextStyle(fontSize: 10, color: AirvanaColors.muted),
          ),
        ),
    ],
    'campaign' => [
      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AirvanaColors.line),
        ),
        child: const Text(
          'Campaign Brief 会记录目标、受众、投放区域与成功事件；'
          '锁定字段由品牌方确认后才能生成 Contract。',
          style: TextStyle(fontSize: 11, height: 1.7),
        ),
      ),
    ],
    _ => [
      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AirvanaColors.line),
        ),
        child: const Text(
          '开通后可使用深度创作、Campaign 工作台与创作者中心的运营数据。'
          '这些能力在本机为演示形态。',
          style: TextStyle(fontSize: 11, height: 1.7),
        ),
      ),
    ],
  };

  Widget _field(String label, TextEditingController controller, String key) =>
      Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: TextField(
          key: ValueKey(key),
          controller: controller,
          decoration: InputDecoration(labelText: label, isDense: true),
        ),
      );
}

/// 复刻 Web 的 `recordManager` overlay：收藏 / 体验记录 / 草稿 / 最近删除 四类。
/// Web 里它是从内容卡片长按进入的 sheet；这里作为同名二级页提供统一入口。
class RecordManagerPageBody extends StatefulWidget {
  const RecordManagerPageBody({super.key});

  @override
  State<RecordManagerPageBody> createState() => _RecordManagerPageBodyState();
}

class _RecordManagerPageBodyState extends State<RecordManagerPageBody> {
  static const _kinds = <(String, String, String)>[
    ('saved', '收藏', '收藏夹与备注可按作品维护，仅存在本机。'),
    ('history', '体验记录', '每次完整体验都会留下一条记录，可按作品回溯。'),
    ('draft', '草稿', '草稿保留创作流的阶段状态，可继续编辑或删除。'),
    ('trash', '最近删除', '删除的草稿保留墓碑记录，最多 50 条。'),
  ];

  String _kind = 'saved';

  @override
  Widget build(BuildContext context) {
    final active = _kinds.firstWhere((k) => k.$1 == _kind);
    return ListView(
      key: const ValueKey('record-manager-body'),
      padding: const EdgeInsets.fromLTRB(18, 14, 18, 40),
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final kind in _kinds)
              ChoiceChip(
                key: ValueKey('record-kind-${kind.$1}'),
                label: Text(kind.$2, style: const TextStyle(fontSize: 11)),
                selected: _kind == kind.$1,
                onSelected: (_) => setState(() => _kind = kind.$1),
              ),
          ],
        ),
        const SizedBox(height: 14),
        Text(
          active.$3,
          style: const TextStyle(
            fontSize: 11,
            height: 1.6,
            color: AirvanaColors.muted,
          ),
        ),
        const SizedBox(height: 14),
        Container(
          key: ValueKey('record-empty-$_kind'),
          padding: const EdgeInsets.symmetric(vertical: 40),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AirvanaColors.line),
          ),
          child: Column(
            children: [
              Text(
                '还没有${active.$2}记录',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                '在作品卡片上长按即可管理该作品的记录。',
                style: TextStyle(fontSize: 11, color: AirvanaColors.muted),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// 复刻 Web 的 `invite` panel：邀请码、进度与合格规则。
class InvitePageBody extends StatelessWidget {
  const InvitePageBody({super.key});

  @override
  Widget build(BuildContext context) => ListView(
    key: const ValueKey('invite-page-body'),
    padding: const EdgeInsets.fromLTRB(18, 14, 18, 40),
    children: [
      Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFFFF3B4A), Color(0xFFFF7180)],
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text(
              '邀请好友',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w800,
                color: Colors.white70,
              ),
            ),
            SizedBox(height: 8),
            Text(
              '每位合格好友 100 AIP',
              style: TextStyle(
                fontSize: 21,
                fontWeight: FontWeight.w900,
                color: Colors.white,
              ),
            ),
            SizedBox(height: 6),
            Text(
              '好友完成注册并配置 Agent 后，奖励才会入账。',
              style: TextStyle(
                fontSize: 11,
                height: 1.6,
                color: Colors.white70,
              ),
            ),
          ],
        ),
      ),
      const SizedBox(height: 12),
      Container(
        key: const ValueKey('invite-page-code'),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AirvanaColors.line),
        ),
        child: Row(
          children: [
            const Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '我的邀请码',
                    style: TextStyle(fontSize: 10, color: AirvanaColors.muted),
                  ),
                  SizedBox(height: 5),
                  Text(
                    'AIR-KAI-4821',
                    style: TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.2,
                    ),
                  ),
                ],
              ),
            ),
            OutlinedButton(
              key: const ValueKey('invite-page-copy'),
              onPressed: () => ScaffoldMessenger.of(
                context,
              ).showSnackBar(const SnackBar(content: Text('邀请码已复制'))),
              child: const Text('复制'),
            ),
          ],
        ),
      ),
      const SizedBox(height: 12),
      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AirvanaColors.line),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text(
              '合格规则',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800),
            ),
            SizedBox(height: 8),
            Text(
              '· 好友使用你的邀请码完成注册\n'
              '· 好友配置首个 Agent 后计为合格\n'
              '· 同一好友只计一次，奖励为不可提现的 AIP',
              style: TextStyle(
                fontSize: 11,
                height: 1.8,
                color: AirvanaColors.muted,
              ),
            ),
          ],
        ),
      ),
    ],
  );
}

/// 复刻 Web 的 `globalAi` panel：AI 分身工作台入口卡片。
/// 注意与「我的 AI 分身」（aiTwin，9 个 tab）是两个不同入口。
