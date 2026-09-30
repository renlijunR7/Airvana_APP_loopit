/// 首启流程的第三段：登录页。Web 的 `s.ob === 3`。
///
/// 版式逐项对齐 Web 的 `obLogin` 分支（`public/index.html:121-131`）：
/// logo 左对齐 190px、一句 15px 灰色副标题、三个白底胶囊按钮（Google /
/// 钱包 / 邮箱，各带图标）、12px 的协议页脚加一行 10px 的钱包安全声明。
/// 三个入口的行为也照 Web：Google 一键直接以演示人格登录；邮箱、钱包点了
/// 才弹出各自的面板，而不是把三张表单同时铺在页上。
///
/// 登录成功等价于 Web 的 `ob:4`：刷新带服务端身份的数据、一条 toast、进首页。
/// 此前 Flutter 登录成功后停在原地显示一张「当前已登录」卡片，用户得自己
/// 找到出口——那是逻辑缺陷，不是设计。
///
/// 与 Web 的一处有意差别：Web 没有「跳过登录」，因为它的 Google 一键在没有
/// 服务端时会退成纯前端演示身份，用户永远不会被困住。Flutter 端明确不做这种
/// 降级（登录失败必须报错，见 airvana_repository.dart 的「真实登录」一节），
/// 所以保留一个「先逛逛」出口，放在引导页「跳过」的同一位置、同一字号。
///
/// 「设置与更多」里的账号页仍用 `SignInPageBody`（sign_in_page.dart，表单平铺版）；两处共用
/// 同一套仓储方法，只是壳不同。
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/providers.dart';
import '../../../design_system/airvana_theme.dart';
import '../../../shared/presentation/airvana_logo.dart';
import '../../history/presentation/profile_legal_document_screen.dart';
import '../domain/auth_models.dart';
import 'email_login_sheet.dart';
import 'onboarding_glow.dart';
import 'wallet_login_sheet.dart';

/// 逐字取自 Web `public/index.html:124`。
const kSignInSubtitle = '登录，开始运营属于你的 Agentic Playable营销智能体';

class SignInScreen extends ConsumerStatefulWidget {
  const SignInScreen({super.key});

  @override
  ConsumerState<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends ConsumerState<SignInScreen> {
  bool _busy = false;
  String? _error;

  /// Web `loginGoogle: () => this.localAdapterLogin('google','Kai Chen',…)`。
  Future<void> _loginGoogle() async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final identity = await ref
          .read(airvanaRepositoryProvider)
          .signInWithGoogleLocalAdapter(
            email: GoogleLocalAdapterPersona.email,
            displayName: GoogleLocalAdapterPersona.displayName,
          );
      if (!mounted) return;
      _enterApp(identity, label: 'Google 一键登录');
    } catch (error) {
      // Web 在这里会退成前端演示身份；Flutter 不退，把原因摆出来。
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _openEmail() => showEmailLoginSheet(
    context,
    onSignedIn: (identity) => _enterApp(identity, label: '邮箱验证码登录'),
  );

  void _openWallet() => showWalletLoginSheet(context);

  /// 登录成功 = Web 的 `ob:4` + `toast(label+'已完成')`。
  void _enterApp(SignedInIdentity identity, {required String label}) {
    // 邮箱面板的回调可能在面板被拖掉之后才到；登录页本身还在就照常进首页。
    if (!mounted) return;
    invalidateSessionScopedProviders(ref);
    final name = identity.displayName.isEmpty
        ? identity.userId
        : identity.displayName;
    // 根 ScaffoldMessenger 会把这条 SnackBar 带到首页的 Scaffold 上显示，
    // 所以先发 toast 再跳转也不会丢。
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text('$label已完成 · $name')));
    context.go('/');
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    key: const ValueKey('sign-in-screen'),
    backgroundColor: AirvanaColors.canvas,
    body: Stack(
      children: [
        const OnboardingGlow(),
        SafeArea(
          child: LayoutBuilder(
            // 正常手机上整块内容垂直居中（Web justify-content:center）；
            // 屏幕太矮时允许滚动，不让页脚被挤出可视区。
            builder: (context, constraints) => SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 24),
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  minHeight: math.max(0, constraints.maxHeight - 48),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Web: <img src="logo.png" style="width:190px;align-self:flex-start">
                    const Align(
                      alignment: Alignment.centerLeft,
                      child: AirvanaLogo(width: 190),
                    ),
                    const SizedBox(height: 10),
                    const Text(
                      kSignInSubtitle,
                      style: TextStyle(
                        fontSize: 15,
                        height: 1.7,
                        color: AirvanaColors.muted,
                      ),
                    ),
                    const SizedBox(height: 44),
                    _LoginPill(
                      key: const ValueKey('sign-in-google'),
                      // 点下去只把图标位换成同尺寸的进度圈，文案不变——
                      // 文案一变宽度就变，居中的整行会左右挪一下。
                      icon: _busy
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: AirvanaColors.muted,
                              ),
                            )
                          : const _GoogleMark(),
                      label: 'Google 一键登录',
                      enabled: !_busy,
                      onTap: _loginGoogle,
                    ),
                    const SizedBox(height: 12),
                    _LoginPill(
                      key: const ValueKey('sign-in-wallet'),
                      icon: const Icon(
                        Icons.account_balance_wallet_outlined,
                        size: 19,
                        color: AirvanaColors.ink,
                      ),
                      label: '数字货币钱包登录',
                      enabled: !_busy,
                      onTap: _openWallet,
                    ),
                    const SizedBox(height: 12),
                    _LoginPill(
                      key: const ValueKey('sign-in-email'),
                      icon: const Icon(
                        Icons.mail_outline_rounded,
                        size: 19,
                        color: AirvanaColors.ink,
                      ),
                      label: '邮箱验证码登录',
                      enabled: !_busy,
                      onTap: _openEmail,
                    ),
                    // 错误提示占一个固定高度的槽位：文字出现/消失都不改变布局，
                    // 否则整块居中的内容会上下跳一下。
                    SizedBox(
                      height: 44,
                      child: Center(
                        child: AnimatedOpacity(
                          opacity: _error == null ? 0 : 1,
                          duration: const Duration(milliseconds: 160),
                          child: Text(
                            _error ?? '',
                            key: const ValueKey('sign-in-error'),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontSize: 11,
                              height: 1.5,
                              color: Color(0xFFC62836),
                            ),
                          ),
                        ),
                      ),
                    ),
                    // 本地演示内容不需要登录，留一个明确出口而不是把人困在登录页。
                    // 位置与字号沿用引导页的「跳过」（13px / #A0A0A6）。
                    Center(
                      child: TextButton(
                        key: const ValueKey('sign-in-skip'),
                        onPressed: _busy ? null : () => context.go('/'),
                        style: TextButton.styleFrom(
                          foregroundColor: const Color(0xFFA0A0A6),
                          textStyle: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        child: const Text('先逛逛'),
                      ),
                    ),
                    const SizedBox(height: 12),
                    const _LegalFooter(),
                  ],
                ),
              ),
            ),
          ),
        ),
      ],
    ),
  );
}

/// Web 登录页的胶囊按钮：白底、1px 边、999 圆角、15px/700、图标在前间距 10。
class _LoginPill extends StatelessWidget {
  const _LoginPill({
    super.key,
    required this.icon,
    required this.label,
    required this.onTap,
    this.enabled = true,
  });

  final Widget icon;
  final String label;
  final VoidCallback onTap;
  final bool enabled;

  @override
  Widget build(BuildContext context) => Material(
    color: Colors.white,
    shape: const StadiumBorder(side: BorderSide(color: AirvanaColors.line)),
    clipBehavior: Clip.antiAlias,
    child: InkWell(
      onTap: enabled ? onTap : null,
      child: SizedBox(
        height: 50,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            SizedBox(width: 22, height: 22, child: Center(child: icon)),
            const SizedBox(width: 10),
            Text(
              label,
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: enabled ? AirvanaColors.ink : AirvanaColors.muted,
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

/// Google 的四色 G。
///
/// Web 内联的是官方 SVG（48×48 viewBox）；项目没有 SVG 依赖，这里用四段
/// 圆弧 + 一根横杠复现：外径 24、内径 14.5，各段起止角从 SVG 路径端点算出。
/// 18px 下与原图分不出差别。
class _GoogleMark extends StatelessWidget {
  const _GoogleMark();

  @override
  Widget build(BuildContext context) => const SizedBox(
    width: 18,
    height: 18,
    child: CustomPaint(painter: _GoogleMarkPainter()),
  );
}

class _GoogleMarkPainter extends CustomPainter {
  const _GoogleMarkPainter();

  static const _red = Color(0xFFEA4335);
  static const _yellow = Color(0xFFFBBC05);
  static const _green = Color(0xFF34A853);
  static const _blue = Color(0xFF4285F4);

  @override
  void paint(Canvas canvas, Size size) {
    final unit = size.width / 48;
    final ring = Rect.fromCircle(
      center: Offset(24 * unit, 24 * unit),
      radius: 19.25 * unit,
    );
    final stroke = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 9.5 * unit;

    void arc(Color color, double fromDeg, double toDeg) {
      stroke.color = color;
      canvas.drawArc(
        ring,
        fromDeg * math.pi / 180,
        (toDeg - fromDeg) * math.pi / 180,
        false,
        stroke,
      );
    }

    // 角度是屏幕坐标系（y 向下、顺时针为正）：270° 在正上方，90° 在正下方。
    arc(_red, 206.7, 312.1); // 左上 → 右上
    arc(_yellow, 153.3, 206.7); // 左
    arc(_green, 48.9, 153.3); // 下
    arc(_blue, 1.4, 48.9); // 右下
    // 蓝色横杠：SVG 里的 `H24v9.02h12.94…`。
    canvas.drawRect(
      Rect.fromLTRB(24 * unit, 20 * unit, 46.6 * unit, 29.02 * unit),
      Paint()..color = _blue,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Web 页脚：12px #A0A0A6 居中，协议是链接；下面一行 10px 的钱包安全声明。
class _LegalFooter extends StatelessWidget {
  const _LegalFooter();

  static const _footnote = TextStyle(
    fontSize: 12,
    height: 1.6,
    color: Color(0xFFA0A0A6),
  );

  void _open(BuildContext context, AirvanaLegalDocumentType type) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => ProfileLegalDocumentScreen(type: type),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => Column(
    children: [
      Wrap(
        alignment: WrapAlignment.center,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          const Text('继续即表示你已阅读并同意 ', style: _footnote),
          _LegalLink(
            label: '服务协议',
            onTap: () => _open(context, AirvanaLegalDocumentType.terms),
          ),
          const Text('，并已阅读 ', style: _footnote),
          _LegalLink(
            label: '隐私政策',
            onTap: () => _open(context, AirvanaLegalDocumentType.privacy),
          ),
        ],
      ),
      const SizedBox(height: 2),
      const Text(
        '钱包仅使用签名验证；Airvana 不会索取助记词或私钥',
        textAlign: TextAlign.center,
        style: TextStyle(fontSize: 10, height: 1.6, color: Color(0xFFA0A0A6)),
      ),
    ],
  );
}

class _LegalLink extends StatelessWidget {
  const _LegalLink({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    behavior: HitTestBehavior.opaque,
    child: Text(
      label,
      style: const TextStyle(
        fontSize: 12,
        height: 1.6,
        fontWeight: FontWeight.w700,
        color: AirvanaColors.accent,
      ),
    ),
  );
}
