import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:flutter/material.dart';

/// 复刻旧版 Web 的 systemModal 家族。Web 用一个统一容器承载版本更新、
/// 每日任务与三种风险提示；这里保持同一套文案与操作语义。
enum AirvanaSystemModal {
  version,
  daily,
  riskWeakNetwork,
  riskOffline,
  riskChinaRegion,
}

class AirvanaSystemModalSpec {
  const AirvanaSystemModalSpec({
    required this.eyebrow,
    required this.title,
    required this.body,
    required this.note,
    required this.primaryLabel,
    this.secondaryLabel,
  });

  final String eyebrow;
  final String title;
  final String body;
  final String note;
  final String primaryLabel;
  final String? secondaryLabel;
}

const _specs = <AirvanaSystemModal, AirvanaSystemModalSpec>{
  AirvanaSystemModal.version: AirvanaSystemModalSpec(
    eyebrow: 'VERSION · 本地模拟',
    title: '发现新版本',
    body:
        '• 点赞、关注、收藏与分享状态可追踪\n'
        '• 新增推送消息弹窗和每日任务奖励\n'
        '• 修复预约发布、签到跨日与弹窗键盘操作',
    note: '版本检查为本机演示；不会真正下载或安装安装包。',
    primaryLabel: '立即更新',
    secondaryLabel: '稍后再说',
  ),
  AirvanaSystemModal.daily: AirvanaSystemModalSpec(
    eyebrow: '每日推荐任务',
    title: '完成今日推荐体验',
    body: '体验一款推荐 Playable 并走完一次完整流程，即可领取今日奖励。',
    note: 'AIP 仅记录本地内容互动贡献，不代表现金、收入或已验证商业转化。',
    primaryLabel: '领取 +20 AIP',
    secondaryLabel: '稍后再说',
  ),
  AirvanaSystemModal.riskWeakNetwork: AirvanaSystemModalSpec(
    eyebrow: 'NETWORK DEGRADED · 本地模拟',
    title: '当前网络连接较慢',
    body:
        '内容加载和提交可能出现延迟。你的输入和本地草稿会被保留，'
        '可以继续使用已缓存内容或重新检测连接。',
    note: '弱网模拟会为联网入口增加 1.2 秒演示延迟；不会修改系统网络、浏览器设置或生产服务。',
    primaryLabel: '继续使用',
    secondaryLabel: '重新检测',
  ),
  AirvanaSystemModal.riskOffline: AirvanaSystemModalSpec(
    eyebrow: 'OFFLINE · 本地模拟',
    title: '当前无法连接网络',
    body:
        '需要服务器确认的登录、发布、钱包、归因和结算操作已暂停。'
        '本地草稿、离线游戏和已缓存内容仍可使用。',
    note: '离线状态采用 Fail closed：不会把本地结果伪装成服务器已确认状态。',
    primaryLabel: '使用离线功能',
    secondaryLabel: '重新连接',
  ),
  AirvanaSystemModal.riskChinaRegion: AirvanaSystemModalSpec(
    eyebrow: 'REGION RISK · CN 模拟',
    title: '当前访问可能来自中国大陆',
    // 这段是 Web 的风控口径原文，不能替换成自造文案。
    body:
        '根据当前地区风控策略，钱包连接、代币相关功能、Web3 营销发布及结算暂不可用。'
        'IP 仅作为风险信号，最终权限仍由账号、KYC、Campaign Contract 与服务端策略确认。',
    note: '当前设备已进入非金融模式；普通浏览、本地草稿和不含 Token 奖励的互动体验保持可用。',
    primaryLabel: '进入非金融模式',
    secondaryLabel: '查看限制范围',
  ),
};

AirvanaSystemModalSpec systemModalSpec(AirvanaSystemModal modal) =>
    _specs[modal]!;

/// 与 Web 一致：遮罩 + 居中卡片，主操作在下方。
Future<bool?> showAirvanaSystemModal(
  BuildContext context,
  AirvanaSystemModal modal, {
  String? versionName,
}) {
  final spec = systemModalSpec(modal);
  final title = modal == AirvanaSystemModal.version && versionName != null
      ? '${spec.title} $versionName'
      : spec.title;
  return showDialog<bool>(
    context: context,
    barrierColor: const Color(0x7A0A0A0C),
    builder: (context) => Dialog(
      key: ValueKey('system-modal-${modal.name}'),
      backgroundColor: Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(22)),
      insetPadding: const EdgeInsets.symmetric(horizontal: 28),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              spec.eyebrow,
              style: const TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w800,
                color: AirvanaColors.accent,
                letterSpacing: .6,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              title,
              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 10),
            Text(spec.body, style: const TextStyle(fontSize: 12, height: 1.7)),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(11),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF8F8),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFFFD6DA)),
              ),
              child: Text(
                spec.note,
                style: const TextStyle(
                  fontSize: 10,
                  height: 1.7,
                  color: Color(0xFF6E5A5D),
                ),
              ),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                if (spec.secondaryLabel != null) ...[
                  Expanded(
                    child: OutlinedButton(
                      key: ValueKey('system-modal-${modal.name}-secondary'),
                      onPressed: () => Navigator.of(context).pop(false),
                      child: Text(spec.secondaryLabel!),
                    ),
                  ),
                  const SizedBox(width: 9),
                ],
                Expanded(
                  child: FilledButton(
                    key: ValueKey('system-modal-${modal.name}-primary'),
                    onPressed: () => Navigator.of(context).pop(true),
                    child: Text(spec.primaryLabel),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    ),
  );
}
