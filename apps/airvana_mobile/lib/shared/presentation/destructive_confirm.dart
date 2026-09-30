import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:flutter/material.dart';

/// 复刻 Web 的破坏性操作确认层。Web 用一张 configs 表覆盖 17 种操作，
/// 这里保持同名 key 与同一套文案，避免两版对同一动作给出不同承诺。
enum DestructiveAction {
  clearPlayerMedia,
  clearSelectedPowers,
  removePower,
  removeComposerAsset,
  deleteComment,
  resetIdentity,
  resetAiTwin,
  resetSubscription,
  removeProfileAvatar,
  removeGrowthMember,
  removeWalletCandidate,
  deleteDraft,
  deleteGameRun,
  clearContentRuns,
  clearAllRuns,
  requestAccountDeletion,
  clearLocalBusiness,

  /// Web 删 Agent 走的是独立一层（index.html:2096），不在 17 条 configs 表里，
  /// 但承诺与它们相反——不可恢复——所以必须单列，不能复用 removePower。
  deleteAgent,
}

class DestructiveSpec {
  const DestructiveSpec({
    required this.title,
    required this.message,
    required this.label,
  });

  final String title;
  final String message;
  final String label;
}

/// `subject` 对应 Web 里插进标题的 payload（能力名、素材名、草稿标题）。
DestructiveSpec destructiveSpec(DestructiveAction action, {String? subject}) =>
    switch (action) {
      DestructiveAction.clearPlayerMedia => const DestructiveSpec(
        title: '移除这项媒体？',
        message: '媒体预览将从当前发布草稿中移除，正文内容会保留。',
        label: '确认移除',
      ),
      DestructiveAction.clearSelectedPowers => const DestructiveSpec(
        title: '清空全部能力？',
        message: '已选择的能力组合将被清空，其他创作内容不会改变。',
        label: '确认清空',
      ),
      DestructiveAction.deleteAgent => DestructiveSpec(
        title: '删除“${subject ?? '此 Agent'}”？',
        message: '删除后无法恢复；执行中的 Agent 必须先取消任务。',
        label: '确认删除',
      ),
      DestructiveAction.removePower => DestructiveSpec(
        title: '移除“${subject ?? '此能力'}”？',
        message: '该能力将从当前组合移除，稍后仍可重新添加。',
        label: '确认移除',
      ),
      DestructiveAction.removeComposerAsset => DestructiveSpec(
        title: '删除“${subject ?? '此素材'}”？',
        message: '素材会从当前本地清单中删除，不会影响设备原文件。',
        label: '确认删除',
      ),
      DestructiveAction.deleteComment => const DestructiveSpec(
        title: '删除这条评论？',
        message: '删除后评论与对应的本地互动计数会同步更新。',
        label: '确认删除',
      ),
      DestructiveAction.resetIdentity => const DestructiveSpec(
        title: '重置身份演示状态？',
        message: 'KYC、节点角色与本地审核记录将恢复到初始状态。',
        label: '确认重置',
      ),
      DestructiveAction.resetAiTwin => const DestructiveSpec(
        title: '重置本地 AI 分身？',
        message: '本地分身配置、测试对话与演示状态将恢复到初始值。',
        label: '确认重置',
      ),
      DestructiveAction.resetSubscription => const DestructiveSpec(
        title: '重置订阅与额度？',
        message:
            '本机订阅将恢复为 Free，额度使用记录和订阅历史会被清空；'
            'AIP、AIT、KYC、角色和商业权限不会改变。',
        label: '确认重置',
      ),
      DestructiveAction.removeProfileAvatar => const DestructiveSpec(
        title: '移除会话头像？',
        message: '当前会话上传的头像会被清除，原资料头像保持不变。',
        label: '确认移除',
      ),
      DestructiveAction.removeGrowthMember => const DestructiveSpec(
        title: '撤回成员邀请？',
        message: '该成员将从当前节点席位移除，节点恢复为招募中。',
        label: '确认撤回',
      ),
      DestructiveAction.removeWalletCandidate => const DestructiveSpec(
        title: '移除未验证钱包？',
        message:
            '只会从当前设备删除这个未验证地址，不会发起链上交易，'
            '也不会影响已通过服务端验证的钱包。',
        label: '确认移除',
      ),
      DestructiveAction.deleteDraft => DestructiveSpec(
        title: '删除草稿“${subject ?? '未命名 Playable'}”？',
        message: '草稿将移到最近删除，可从草稿箱恢复；已发布版本不会被硬删除。',
        label: '移到最近删除',
      ),
      DestructiveAction.deleteGameRun => const DestructiveSpec(
        title: '删除这次体验记录？',
        message: '只删除选中的本机运行记录，不影响作品和其他体验。',
        label: '确认删除',
      ),
      DestructiveAction.clearContentRuns => const DestructiveSpec(
        title: '清除该作品全部体验记录？',
        message: '该作品在本机的运行详情与体验标记都会被清除。',
        label: '确认清除',
      ),
      DestructiveAction.clearAllRuns => const DestructiveSpec(
        title: '清空全部体验记录？',
        message: '所有作品的本机运行详情与体验标记都会被清除，此操作无法恢复。',
        label: '确认清空',
      ),
      DestructiveAction.requestAccountDeletion => const DestructiveSpec(
        title: '提交账号删除申请？',
        message: '提交后进入 30 天冷静期；到期删除仍由账号服务执行并记录审计结果。',
        label: '提交申请',
      ),
      DestructiveAction.clearLocalBusiness => const DestructiveSpec(
        title: '清除全部本机业务数据？',
        message:
            '本机用户状态、草稿、发布版本、互动关系、游戏运行记录和审计事件'
            '都会被清除。此操作无法撤销，建议先导出数据。',
        label: '确认清除',
      ),
    };

/// 返回 true 表示用户确认执行。
Future<bool> confirmDestructiveAction(
  BuildContext context,
  DestructiveAction action, {
  String? subject,
}) async {
  final spec = destructiveSpec(action, subject: subject);
  final confirmed = await showDialog<bool>(
    context: context,
    builder: (context) => AlertDialog(
      key: ValueKey('destructive-${action.name}'),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: Text(
        spec.title,
        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900),
      ),
      content: Text(
        spec.message,
        style: const TextStyle(fontSize: 12, height: 1.7),
      ),
      actions: [
        TextButton(
          key: ValueKey('destructive-${action.name}-cancel'),
          onPressed: () => Navigator.of(context).pop(false),
          child: const Text('取消'),
        ),
        FilledButton(
          key: ValueKey('destructive-${action.name}-confirm'),
          style: FilledButton.styleFrom(backgroundColor: AirvanaColors.accent),
          onPressed: () => Navigator.of(context).pop(true),
          child: Text(spec.label),
        ),
      ],
    ),
  );
  return confirmed ?? false;
}
