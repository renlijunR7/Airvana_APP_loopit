import 'package:airvana_mobile/design_system/airvana_shared_cards.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:flutter/material.dart';

/// Web 的 growthNetwork panel 分四个 tab，服务端版与本机版共用同一套顺序与文案。
const kGrowthTabs = <(String, String)>[
  ('network', '网络'),
  ('node', '我的连接'),
  ('contribution', '贡献'),
  ('rules', '规则'),
];

/// Web 的增长网络面板里，说明性 tab 只呈现结构与边界，数值部分需要服务端确认，
/// 因此这里不编造指标。
class GrowthNarrative extends StatelessWidget {
  const GrowthNarrative({
    super.key,
    required this.tab,
    this.shrinkWrap = false,
  });

  final String tab;

  /// 本机版嵌在外层 ListView 里，需要收缩高度而不是自己滚动。
  final bool shrinkWrap;

  static const content = <String, (String, List<String>, String)>{
    'network': (
      'Airvana 的持续增长飞轮',
      [
        '一个用户 → 一个 AI 分身 → 多个 Agentic Playable',
        '五人成节点，一人一个主要经济节点',
        '节点内角色分工：发起人 / 创作者 / 分发者 / 运营者 / 验证者',
      ],
      '网络结构为产品设计；真实节点状态由服务端确认。',
    ),
    'node': (
      '我的连接',
      ['节点席位固定五人，加入后角色不可重复', '邀请码只对一个席位生效，重复使用会被拒绝', '退出节点保留历史贡献记录，不影响已归因结果'],
      '本机不保存真实节点关系，席位与角色状态需要服务端确认。',
    ),
    'contribution': (
      '贡献以证据为准',
      ['贡献来自可验证结果，不按主观投入计分', '信用分达到 650 才能申请经济节点', '每笔贡献都保留归因证据链，可回溯到具体事件'],
      '信用分与贡献值需要服务端归因服务确认，本机不展示估算值。',
    ),
    'rules': (
      'NODE CHARTER · 产品规则',
      [
        '节点生命周期：招募 → 待确认 → 试运行 → 运行中',
        '支持暂停、退出与申诉，操作均留痕',
        '经济权限需要额外门槛：KYC 通过且信用分达标',
      ],
      '结算边界：节点关系不产生任何自动付款；反作弊与申诉由服务端裁决。',
    ),
  };

  @override
  Widget build(BuildContext context) {
    final entry = content[tab]!;
    return ListView(
      key: ValueKey('growth-narrative-$tab'),
      shrinkWrap: shrinkWrap,
      physics: shrinkWrap ? const NeverScrollableScrollPhysics() : null,
      padding: shrinkWrap
          ? EdgeInsets.zero
          : const EdgeInsets.fromLTRB(16, 4, 16, 110),
      children: [
        Text(
          entry.$1,
          style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900),
        ),
        const SizedBox(height: 12),
        for (final line in entry.$2)
          Container(
            margin: const EdgeInsets.only(bottom: 9),
            padding: const EdgeInsets.all(13),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AirvanaColors.line),
            ),
            child: Text(
              line,
              style: const TextStyle(fontSize: 12, height: 1.6),
            ),
          ),
        const SizedBox(height: 4),
        BoundaryCard(
          key: ValueKey('growth-boundary-$tab'),
          title: '边界',
          body: entry.$3,
        ),
      ],
    );
  }
}
