import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/identity/presentation/kyc_countries.dart';
import 'package:flutter/material.dart';

/// KYC 证件上传向导，对应 Web 身份面板里的「上传身份证明」第 2 步。
///
/// 与 Web 一致：只校验格式与大小，选择后立即清空；不显示照片、不记录文件名、
/// 不写入本地存储。正式版由第三方 KYC SDK 加密上传。
class KycDocumentWizard extends StatefulWidget {
  const KycDocumentWizard({super.key});

  @override
  State<KycDocumentWizard> createState() => _KycDocumentWizardState();
}

class _KycDocumentWizardState extends State<KycDocumentWizard> {
  String _country = 'CN';
  String _documentType = 'id_card';
  final _selected = <String, String>{};
  String _error = '';

  List<(String, String, String, String)> get _slots =>
      _documentType == 'passport'
      ? const [('passport', '护照资料页', '单页', '照片与机读码完整')]
      : const [
          ('id_front', '身份证正面', '人像面', '姓名与证件号码清晰'),
          ('id_back', '身份证背面', '国徽面', '签发机关与有效期清晰'),
        ];

  String get _countryLabel => kKycCountries
      .firstWhere(
        (item) => item.$1 == _country,
        orElse: () => kKycCountries.first,
      )
      .$2;

  Future<void> _pickCountry() async {
    final picked = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      backgroundColor: Colors.white,
      builder: (_) => const _CountryPicker(),
    );
    if (picked != null && mounted) {
      setState(() {
        _country = picked;
        _error = '';
      });
    }
  }

  /// 演示用：不真的取文件，只模拟一次「格式与大小校验通过」。
  void _pickPhoto(String slot, String label) {
    setState(() {
      _selected[slot] = '已选择 · 2.4 MB';
      _error = '';
    });
  }

  @override
  Widget build(BuildContext context) {
    final ready = _slots.every((slot) => _selected.containsKey(slot.$1));
    return ListView(
      key: const ValueKey('kyc-document-wizard'),
      padding: const EdgeInsets.fromLTRB(18, 14, 18, 40),
      children: [
        const Text(
          '上传身份证明',
          style: TextStyle(fontSize: 19, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 4),
        const Text(
          '第 2 步，共 3 步 · 第三方 KYC 托管窗口 · 不留存原件',
          style: TextStyle(fontSize: 10, color: AirvanaColors.muted),
        ),
        const SizedBox(height: 12),
        const _StepBar(),
        const SizedBox(height: 16),
        const _StepHeading(index: '01', title: '选择证件', hint: '请按证件实际签发信息选择'),
        const SizedBox(height: 9),
        InkWell(
          key: const ValueKey('kyc-country-field'),
          onTap: _pickCountry,
          borderRadius: BorderRadius.circular(14),
          child: Container(
            padding: const EdgeInsets.all(13),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AirvanaColors.line),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        '签发国家或地区',
                        style: TextStyle(
                          fontSize: 9,
                          color: AirvanaColors.muted,
                        ),
                      ),
                      const SizedBox(height: 3),
                      Text(
                        _countryLabel,
                        key: const ValueKey('kyc-country-value'),
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ],
                  ),
                ),
                const Text(
                  '全球国家和地区 · 点击搜索选择',
                  style: TextStyle(fontSize: 9, color: AirvanaColors.muted),
                ),
                const Icon(Icons.chevron_right_rounded, size: 18),
              ],
            ),
          ),
        ),
        const SizedBox(height: 10),
        const Text(
          '证件类型',
          style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 7),
        Row(
          children: [
            for (final type in const [
              ('id_card', '身份证', '上传正反两面'),
              ('passport', '护照', '上传个人资料页'),
            ])
              Expanded(
                child: Padding(
                  padding: EdgeInsets.only(right: type.$1 == 'id_card' ? 9 : 0),
                  child: InkWell(
                    key: ValueKey('kyc-doc-type-${type.$1}'),
                    onTap: () => setState(() {
                      _documentType = type.$1;
                      _selected.clear();
                      _error = '';
                    }),
                    borderRadius: BorderRadius.circular(14),
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: _documentType == type.$1
                            ? const Color(0xFFFFF1F2)
                            : AirvanaColors.canvas,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: _documentType == type.$1
                              ? AirvanaColors.accent
                              : AirvanaColors.line,
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  type.$2,
                                  style: const TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                              ),
                              if (_documentType == type.$1)
                                const Text(
                                  '✓',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: AirvanaColors.accent,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                            ],
                          ),
                          const SizedBox(height: 3),
                          Text(
                            type.$3,
                            style: const TextStyle(
                              fontSize: 9,
                              color: AirvanaColors.muted,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 16),
        const _StepHeading(
          index: '02',
          title: '上传证件照片',
          hint: 'JPG、PNG、WebP · 单张不超过 10MB',
        ),
        const SizedBox(height: 9),
        for (final slot in _slots)
          Container(
            key: ValueKey('kyc-slot-${slot.$1}'),
            margin: const EdgeInsets.only(bottom: 9),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: _selected.containsKey(slot.$1)
                  ? const Color(0xFFF0FAF4)
                  : AirvanaColors.canvas,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: _selected.containsKey(slot.$1)
                    ? const Color(0xFF41A366)
                    : AirvanaColors.line,
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            slot.$2,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            slot.$3,
                            style: const TextStyle(
                              fontSize: 9,
                              color: AirvanaColors.muted,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Text(
                        _selected[slot.$1] ?? slot.$4,
                        style: TextStyle(
                          fontSize: 9,
                          color: _selected.containsKey(slot.$1)
                              ? const Color(0xFF147542)
                              : AirvanaColors.muted,
                        ),
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      _selected.containsKey(slot.$1) ? '已选择' : '待上传',
                      style: const TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    TextButton(
                      key: ValueKey('kyc-pick-${slot.$1}'),
                      onPressed: () => _pickPhoto(slot.$1, slot.$2),
                      child: Text(
                        _selected.containsKey(slot.$1) ? '重新选择' : '选择照片',
                        style: const TextStyle(fontSize: 10),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        if (_error.isNotEmpty)
          Text(
            _error,
            key: const ValueKey('kyc-file-error'),
            style: const TextStyle(fontSize: 10, color: Color(0xFFC62836)),
          ),
        const SizedBox(height: 4),
        const Wrap(
          spacing: 12,
          children: [
            Text('✓ 四角完整', style: TextStyle(fontSize: 9)),
            Text('✓ 文字清晰', style: TextStyle(fontSize: 9)),
            Text('✓ 无反光遮挡', style: TextStyle(fontSize: 9)),
          ],
        ),
        const SizedBox(height: 12),
        Container(
          key: const ValueKey('kyc-privacy-note'),
          padding: const EdgeInsets.all(13),
          decoration: BoxDecoration(
            color: const Color(0xFFFFF0F1),
            borderRadius: BorderRadius.circular(14),
          ),
          child: const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '隐私保护',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  color: AirvanaColors.accent,
                ),
              ),
              SizedBox(height: 5),
              Text(
                '本演示仅校验格式与大小，选择后立即清空；不显示照片、不记录文件名、'
                '不写入本地存储。正式版由第三方 KYC SDK 加密上传。',
                style: TextStyle(fontSize: 10, height: 1.65),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        FilledButton(
          key: const ValueKey('kyc-submit'),
          onPressed: ready
              ? () {
                  Navigator.of(context).maybePop();
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('证件已提交到第三方托管窗口（演示）')),
                  );
                }
              : null,
          child: const Text('提交给第三方 KYC 托管窗口'),
        ),
      ],
    );
  }
}

class _StepBar extends StatelessWidget {
  const _StepBar();

  @override
  Widget build(BuildContext context) => Row(
    children: const [
      _StepChip(label: '✓ 隐私授权', active: true),
      SizedBox(width: 8),
      _StepChip(label: '2 上传证件', active: true),
      SizedBox(width: 8),
      _StepChip(label: '3 等待审核', active: false),
    ],
  );
}

class _StepChip extends StatelessWidget {
  const _StepChip({required this.label, required this.active});

  final String label;
  final bool active;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
    decoration: BoxDecoration(
      color: active ? const Color(0xFFFFF1F2) : AirvanaColors.canvas,
      borderRadius: BorderRadius.circular(999),
    ),
    child: Text(
      label,
      style: TextStyle(
        fontSize: 9,
        fontWeight: FontWeight.w900,
        color: active ? AirvanaColors.accent : AirvanaColors.muted,
      ),
    ),
  );
}

class _StepHeading extends StatelessWidget {
  const _StepHeading({
    required this.index,
    required this.title,
    required this.hint,
  });

  final String index;
  final String title;
  final String hint;

  @override
  Widget build(BuildContext context) => Row(
    crossAxisAlignment: CrossAxisAlignment.end,
    children: [
      Text(
        index,
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w900,
          color: AirvanaColors.accent,
        ),
      ),
      const SizedBox(width: 7),
      Text(
        title,
        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900),
      ),
      const Spacer(),
      Text(
        hint,
        style: const TextStyle(fontSize: 9, color: AirvanaColors.muted),
      ),
    ],
  );
}

/// 国家/地区选择器：全球清单 + 搜索 + 清空 + 空态。
class _CountryPicker extends StatefulWidget {
  const _CountryPicker();

  @override
  State<_CountryPicker> createState() => _CountryPickerState();
}

class _CountryPickerState extends State<_CountryPicker> {
  final _controller = TextEditingController();
  String _query = '';

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final query = _query.trim();
    final upper = query.toUpperCase();
    final matches = kKycCountries
        .where(
          (item) =>
              query.isEmpty ||
              item.$2.contains(query) ||
              item.$1.contains(upper),
        )
        .toList(growable: false);
    return SizedBox(
      key: const ValueKey('kyc-country-picker'),
      height: MediaQuery.sizeOf(context).height * .7,
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(18, 4, 18, 10),
            child: TextField(
              key: const ValueKey('kyc-country-search'),
              controller: _controller,
              onChanged: (value) => setState(() => _query = value),
              decoration: InputDecoration(
                hintText: '搜索国家或地区',
                isDense: true,
                prefixIcon: const Icon(Icons.search_rounded, size: 18),
                suffixIcon: query.isEmpty
                    ? null
                    : IconButton(
                        key: const ValueKey('kyc-country-clear'),
                        icon: const Icon(Icons.close_rounded, size: 16),
                        onPressed: () {
                          _controller.clear();
                          setState(() => _query = '');
                        },
                      ),
              ),
            ),
          ),
          Expanded(
            child: matches.isEmpty
                ? const Center(
                    key: ValueKey('kyc-country-empty'),
                    child: Text(
                      '没有匹配的国家或地区',
                      style: TextStyle(
                        fontSize: 11,
                        color: AirvanaColors.muted,
                      ),
                    ),
                  )
                : ListView.builder(
                    itemCount: matches.length,
                    itemBuilder: (context, index) => ListTile(
                      key: ValueKey('kyc-country-${matches[index].$1}'),
                      dense: true,
                      title: Text(
                        matches[index].$2,
                        style: const TextStyle(fontSize: 12),
                      ),
                      trailing: Text(
                        matches[index].$1,
                        style: const TextStyle(
                          fontSize: 10,
                          color: AirvanaColors.muted,
                        ),
                      ),
                      onTap: () => Navigator.of(context).pop(matches[index].$1),
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}
