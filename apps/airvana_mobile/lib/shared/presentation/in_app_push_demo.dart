import 'dart:ui';

import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:flutter/material.dart';

/// Web 基准中的站内提醒演示。
///
/// 这是明确的 LOCAL / DEMO 前端弹窗：不申请系统通知权限，也不代表服务端
/// 已经发送 APNs 推送。消息正文与 Web 默认未读通知保持一致。
class InAppPushDemo extends StatelessWidget {
  const InAppPushDemo({
    super.key,
    required this.onDismiss,
    required this.onOpenMessages,
  });

  final VoidCallback onDismiss;
  final VoidCallback onOpenMessages;

  @override
  Widget build(BuildContext context) => TweenAnimationBuilder<double>(
    tween: Tween(begin: 0, end: 1),
    duration: MediaQuery.disableAnimationsOf(context)
        ? Duration.zero
        : const Duration(milliseconds: 200),
    builder: (context, opacity, child) =>
        Opacity(opacity: opacity, child: child),
    child: Material(
      key: const ValueKey('in-app-push-demo'),
      color: Colors.transparent,
      child: Stack(
        fit: StackFit.expand,
        children: [
          Positioned.fill(
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 5, sigmaY: 5),
              child: const ColoredBox(color: Color(0x800D0D0F)),
            ),
          ),
          SafeArea(
            minimum: const EdgeInsets.all(22),
            child: Align(
              alignment: Alignment.bottomCenter,
              child: Container(
                constraints: const BoxConstraints(maxWidth: 386),
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AirvanaColors.surface,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: AirvanaColors.line),
                  boxShadow: const [
                    BoxShadow(
                      color: Color(0x47000000),
                      blurRadius: 60,
                      offset: Offset(0, 24),
                    ),
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 46,
                          height: 46,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFF0F1),
                            borderRadius: BorderRadius.circular(15),
                          ),
                          child: const Text(
                            '◌',
                            style: TextStyle(
                              color: AirvanaColors.accent,
                              fontSize: 22,
                              height: 1,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Playable v2 等待审核',
                                key: ValueKey('in-app-push-title'),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  color: AirvanaColors.ink,
                                  fontSize: 18,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                              SizedBox(height: 3),
                              Text(
                                '站内提醒 · 已保留在消息中心',
                                style: TextStyle(
                                  color: AirvanaColors.muted,
                                  fontSize: 10,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF7F7FA),
                        borderRadius: BorderRadius.circular(15),
                      ),
                      child: const Text(
                        '「Crypto City 安全挑战」正在核对互动、CTA 与归因节点。',
                        key: ValueKey('in-app-push-body'),
                        style: TextStyle(
                          color: Color(0xFF3A3A3C),
                          fontSize: 12,
                          height: 1.7,
                        ),
                      ),
                    ),
                    const SizedBox(height: 17),
                    Row(
                      children: [
                        Expanded(
                          flex: 100,
                          child: _PushAction(
                            key: const ValueKey('in-app-push-dismiss'),
                            label: '知道了',
                            onTap: onDismiss,
                          ),
                        ),
                        const SizedBox(width: 9),
                        Expanded(
                          flex: 135,
                          child: _PushAction(
                            key: const ValueKey('in-app-push-open'),
                            label: '查看消息',
                            primary: true,
                            onTap: onOpenMessages,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    ),
  );
}

class _PushAction extends StatelessWidget {
  const _PushAction({
    super.key,
    required this.label,
    required this.onTap,
    this.primary = false,
  });

  final String label;
  final VoidCallback onTap;
  final bool primary;

  @override
  Widget build(BuildContext context) => Material(
    color: primary ? AirvanaColors.accent : const Color(0xFFF7F7FA),
    shape: StadiumBorder(
      side: primary
          ? BorderSide.none
          : const BorderSide(color: AirvanaColors.line),
    ),
    clipBehavior: Clip.antiAlias,
    child: InkWell(
      onTap: onTap,
      child: SizedBox(
        height: 42,
        child: Center(
          child: Text(
            label,
            style: TextStyle(
              color: primary ? Colors.white : AirvanaColors.ink,
              fontSize: 12,
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
      ),
    ),
  );
}
