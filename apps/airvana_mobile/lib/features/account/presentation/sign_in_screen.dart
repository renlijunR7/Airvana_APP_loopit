import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/account/presentation/sign_in_page.dart';
import 'package:airvana_mobile/features/history/presentation/profile_legal_document_screen.dart';
import 'package:airvana_mobile/shared/presentation/airvana_logo.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// 退出登录后的全屏登录 / 注册页。
///
/// 与 `SignInPageBody`（「设置与更多」里的二级页）共用同一套表单，
/// 这里只补上品牌头部、协议入口与「先逛逛」出口，避免两处逻辑分叉。
///
/// 视觉沿用 Flutter 端既有语言：浅色 canvas + 白卡 + 红 accent，
/// 不照搬 Web 基准的深色 hero。
class SignInScreen extends StatelessWidget {
  const SignInScreen({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
    key: const ValueKey('sign-in-screen'),
    backgroundColor: AirvanaColors.canvas,
    body: SafeArea(
      child: Column(
        children: [
          const _SignInHero(),
          const Expanded(
            child: SignInPageBody(
              padding: EdgeInsets.fromLTRB(
                AirvanaMetrics.pageGutter,
                14,
                AirvanaMetrics.pageGutter,
                18,
              ),
            ),
          ),
          const _SignInFooter(),
        ],
      ),
    ),
  );
}

class _SignInHero extends StatelessWidget {
  const _SignInHero();

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(
      AirvanaMetrics.pageGutter,
      26,
      AirvanaMetrics.pageGutter,
      6,
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const AirvanaLogo(width: 96),
            const Spacer(),
            // 本地演示内容不需要登录，留一个明确出口而不是把人困在登录页
            TextButton(
              key: const ValueKey('sign-in-skip'),
              onPressed: () => context.go('/'),
              style: TextButton.styleFrom(
                foregroundColor: AirvanaColors.muted,
                textStyle: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                ),
              ),
              child: const Text('先逛逛'),
            ),
          ],
        ),
        const SizedBox(height: 16),
        const Text(
          '登录，开始运营\n属于你的 Agentic Playable',
          style: TextStyle(
            fontSize: 24,
            height: 1.35,
            fontWeight: FontWeight.w900,
            letterSpacing: -0.6,
            color: AirvanaColors.ink,
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          '登录后可使用创作者中心、互动与运行证明、品牌 Campaign 与结算。'
          '未登录也能继续试玩本地内容。',
          style: TextStyle(
            fontSize: 11,
            height: 1.75,
            color: AirvanaColors.muted,
          ),
        ),
      ],
    ),
  );
}

class _SignInFooter extends StatelessWidget {
  const _SignInFooter();

  void _openLegal(BuildContext context, AirvanaLegalDocumentType type) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => ProfileLegalDocumentScreen(type: type),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(
      AirvanaMetrics.pageGutter,
      4,
      AirvanaMetrics.pageGutter,
      14,
    ),
    child: Column(
      children: [
        Wrap(
          alignment: WrapAlignment.center,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            const Text('继续即表示你已阅读并同意 ', style: _footnote),
            _LegalLink(
              label: '服务协议',
              onTap: () => _openLegal(context, AirvanaLegalDocumentType.terms),
            ),
            const Text('，并已阅读 ', style: _footnote),
            _LegalLink(
              label: '隐私政策',
              onTap: () =>
                  _openLegal(context, AirvanaLegalDocumentType.privacy),
            ),
          ],
        ),
      ],
    ),
  );

  static const _footnote = TextStyle(
    fontSize: 10,
    height: 1.6,
    color: AirvanaColors.muted,
  );
}

class _LegalLink extends StatelessWidget {
  const _LegalLink({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Text(
      label,
      style: const TextStyle(
        fontSize: 10,
        height: 1.6,
        fontWeight: FontWeight.w900,
        color: AirvanaColors.accent,
      ),
    ),
  );
}
