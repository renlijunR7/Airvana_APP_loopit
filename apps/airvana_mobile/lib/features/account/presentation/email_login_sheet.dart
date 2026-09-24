/// 邮箱验证码登录面板。
///
/// Web 里点「邮箱验证码登录」是打开 `panel:'emailLogin'`，内容是
/// `.email-login-card`（`public/index.html:1912-1923`，样式在
/// `airvana-v4.css:5312-5334`）：一张白卡，@ 图标 + 说明、邮箱输入、
/// 发送后再出现验证码输入与「本地验证码」提示，底部一颗主按钮，
/// 文案在「发送验证码 / 验证并登录」之间切换，再加一条 60 秒冷却的重发。
///
/// 流程语义也照 Web（`sendEmailCode` / `verifyEmailCode`）：改邮箱就作废已发的
/// 验证码；验证成功即视为登录完成——通过 [EmailLoginSheet.onSignedIn] 回调交给
/// 登录页去进首页，而**不是**用面板的返回值：验证请求在飞的那几秒里用户可以
/// 把面板拖掉，服务端此时已经签发了会话，若靠 pop 回传身份，这次登录就会被
/// 静默吞掉——设备已登录、界面却停在登录页。回调不依赖面板还活着。
library;

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/providers.dart';
import '../../../design_system/airvana_theme.dart';
import '../domain/auth_models.dart';

/// 打开面板。登录成功时调用 [onSignedIn]——不论面板当时是否还在。
Future<void> showEmailLoginSheet(
  BuildContext context, {
  required ValueChanged<SignedInIdentity> onSignedIn,
}) => showModalBottomSheet<void>(
  context: context,
  isScrollControlled: true,
  useSafeArea: true,
  showDragHandle: true,
  backgroundColor: AirvanaColors.canvas,
  builder: (_) => EmailLoginSheet(onSignedIn: onSignedIn),
);

class EmailLoginSheet extends ConsumerStatefulWidget {
  const EmailLoginSheet({super.key, required this.onSignedIn});

  /// 验证通过后的出口。见文件头：不能用 pop 的返回值代替它。
  final ValueChanged<SignedInIdentity> onSignedIn;

  @override
  ConsumerState<EmailLoginSheet> createState() => _EmailLoginSheetState();
}

class _EmailLoginSheetState extends ConsumerState<EmailLoginSheet> {
  final _email = TextEditingController();
  final _code = TextEditingController();

  EmailLoginChallenge? _challenge;

  /// 验证码实际发往的地址。Web 用它拦「发完码又改了邮箱」的情况。
  String _sentTo = '';
  int _cooldown = 0;
  Timer? _cooldownTimer;
  bool _busy = false;
  String? _error;

  static final _sixDigits = RegExp(r'^\d{6}$');

  bool get _codeSent => _challenge != null;
  bool get _emailValid => isValidLoginEmail(_email.text);
  bool get _codeReady => _sixDigits.hasMatch(_code.text.trim());

  @override
  void dispose() {
    _cooldownTimer?.cancel();
    _email.dispose();
    _code.dispose();
    super.dispose();
  }

  /// Web `handleEmailValueChange`：邮箱一变，已发的验证码、冷却与错误全部作废。
  void _onEmailChanged(String _) {
    _cooldownTimer?.cancel();
    _cooldownTimer = null;
    setState(() {
      _challenge = null;
      _sentTo = '';
      _cooldown = 0;
      _error = null;
      _code.clear();
    });
  }

  Future<void> _send() async {
    final email = _email.text.trim().toLowerCase();
    if (!isValidLoginEmail(email)) {
      setState(() => _error = '请输入有效邮箱地址，例如 name@example.com。');
      return;
    }
    if (_cooldown > 0 || _busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final challenge = await ref
          .read(airvanaRepositoryProvider)
          .requestEmailLoginCode(email);
      if (!mounted) return;
      // 请求在飞的时候用户又改了邮箱：这份验证码对应的是旧地址，应用上去
      // 会让「重新发送」被 60 秒冷却锁死、而「验证并登录」永远报地址已改变。
      // 直接丢掉，界面保持在 _onEmailChanged 清空后的状态。
      if (_email.text.trim().toLowerCase() != email) return;
      setState(() {
        _challenge = challenge;
        _sentTo = email;
        _code.clear();
      });
      _startCooldown();
    } catch (error) {
      // 失败要让人看见原因，绝不退回演示登录冒充成功。
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _startCooldown() {
    _cooldownTimer?.cancel();
    setState(() => _cooldown = 60);
    _cooldownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      setState(() => _cooldown -= 1);
      if (_cooldown <= 0) {
        timer.cancel();
        _cooldownTimer = null;
      }
    });
  }

  Future<void> _verify() async {
    final email = _email.text.trim().toLowerCase();
    if (email != _sentTo) {
      setState(() => _error = '邮箱地址已改变，请重新发送验证码。');
      return;
    }
    if (!_codeReady) {
      setState(() => _error = '请输入完整的 6 位验证码。');
      return;
    }
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final identity = await ref
          .read(airvanaRepositoryProvider)
          .verifyEmailLoginCode(email: email, code: _code.text.trim());
      _cooldownTimer?.cancel();
      _cooldownTimer = null;
      // 面板可能在等待期间已被拖掉；那样就跳过 pop，但身份照样交出去。
      if (mounted) Navigator.of(context).pop();
      widget.onSignedIn(identity);
    } catch (error) {
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  /// 「本地验证码」提示块的标签与正文。
  ///
  /// Web 只有本地适配器一种情况；这里要分三种如实说：本地返回了验证码、
  /// 没有邮件服务商所以送不到、真的发出去了。
  (String, String) _notice(EmailLoginChallenge challenge) {
    final code = challenge.demoCode;
    if (code != null) {
      return (
        '本地验证码',
        '尚未接入邮件服务商，验证码由本地适配器直接返回：$code。'
            '上线接入真实邮件后此处不再显示验证码。',
      );
    }
    if (!challenge.deliveredByRealProvider) {
      return ('未送达', '尚未接入邮件服务商，验证码不会真正送达邮箱，无法完成登录。');
    }
    return ('已发送', '验证码已发送到 $_sentTo，请在 ${challenge.expiresInMinutes} 分钟内输入。');
  }

  @override
  Widget build(BuildContext context) {
    final challenge = _challenge;
    return Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        0,
        20,
        20 + MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Web panelTitle: emailLogin → '邮箱验证码登录'
            const Text(
              '邮箱验证码登录',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w900,
                color: AirvanaColors.ink,
              ),
            ),
            const SizedBox(height: 14),
            Container(
              key: const ValueKey('email-login-card'),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AirvanaColors.line),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x0D1C1C1E),
                    blurRadius: 28,
                    offset: Offset(0, 8),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const _Intro(),
                  const SizedBox(height: 13),
                  _Field(
                    label: '邮箱地址',
                    child: TextField(
                      key: const ValueKey('email-login-input'),
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      autocorrect: false,
                      enableSuggestions: false,
                      textInputAction: TextInputAction.done,
                      onChanged: _onEmailChanged,
                      onSubmitted: (_) => _codeSent ? _verify() : _send(),
                      decoration: _decoration('name@example.com'),
                      style: const TextStyle(fontSize: 13),
                    ),
                  ),
                  if (challenge != null) ...[
                    const SizedBox(height: 13),
                    _Field(
                      label: '6 位验证码',
                      child: TextField(
                        key: const ValueKey('email-login-code'),
                        controller: _code,
                        keyboardType: TextInputType.number,
                        maxLength: 6,
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly,
                        ],
                        autofillHints: const [AutofillHints.oneTimeCode],
                        textInputAction: TextInputAction.done,
                        onChanged: (_) => setState(() => _error = null),
                        onSubmitted: (_) => _verify(),
                        decoration: _decoration(
                          '000000',
                        ).copyWith(counterText: ''),
                        // Web .email-login-code：letter-spacing .34em + 等宽数字
                        style: const TextStyle(
                          fontSize: 13,
                          letterSpacing: 13 * .34,
                          fontFeatures: [FontFeature.tabularFigures()],
                        ),
                      ),
                    ),
                    const SizedBox(height: 13),
                    _Notice(
                      key: const ValueKey('email-login-delivery'),
                      entry: _notice(challenge),
                    ),
                  ],
                  if (_error != null) ...[
                    const SizedBox(height: 13),
                    Text(
                      _error!,
                      key: const ValueKey('email-login-error'),
                      style: const TextStyle(
                        fontSize: 10,
                        height: 1.5,
                        color: Color(0xFFC62836),
                      ),
                    ),
                  ],
                  const SizedBox(height: 13),
                  FilledButton(
                    key: const ValueKey('email-login-primary'),
                    onPressed: _busy || !(_codeSent ? _codeReady : _emailValid)
                        ? null
                        : (_codeSent ? _verify : _send),
                    style: FilledButton.styleFrom(
                      backgroundColor: AirvanaColors.accent,
                      foregroundColor: Colors.white,
                      // Web :disabled { background:#d1d1d6; color:#fff }
                      disabledBackgroundColor: const Color(0xFFD1D1D6),
                      disabledForegroundColor: Colors.white,
                      minimumSize: const Size.fromHeight(46),
                      shape: const StadiumBorder(),
                      textStyle: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                    child: Text(
                      _busy ? '处理中…' : (_codeSent ? '验证并登录' : '发送验证码'),
                    ),
                  ),
                  if (_codeSent)
                    TextButton(
                      key: const ValueKey('email-login-resend'),
                      onPressed: _cooldown > 0 || _busy ? null : _send,
                      style: TextButton.styleFrom(
                        foregroundColor: const Color(0xFF636366),
                        disabledForegroundColor: const Color(0xFFA0A0A6),
                        minimumSize: const Size.fromHeight(38),
                        textStyle: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      child: Text(
                        _cooldown > 0 ? '$_cooldown 秒后可重新发送' : '重新发送验证码',
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  /// Web `.email-login-field input`：46px 高、#F7F7FA 底、13px 圆角、聚焦变浅红边。
  static InputDecoration _decoration(String hint) => InputDecoration(
    hintText: hint,
    hintStyle: const TextStyle(fontSize: 13, color: AirvanaColors.muted),
    filled: true,
    fillColor: const Color(0xFFF7F7FA),
    isDense: true,
    contentPadding: const EdgeInsets.symmetric(horizontal: 13, vertical: 14),
    border: const OutlineInputBorder(
      borderRadius: BorderRadius.all(Radius.circular(13)),
      borderSide: BorderSide(color: AirvanaColors.line),
    ),
    enabledBorder: const OutlineInputBorder(
      borderRadius: BorderRadius.all(Radius.circular(13)),
      borderSide: BorderSide(color: AirvanaColors.line),
    ),
    focusedBorder: const OutlineInputBorder(
      borderRadius: BorderRadius.all(Radius.circular(13)),
      borderSide: BorderSide(color: Color(0xFFFF7B85)),
    ),
  );
}

/// Web `.email-login-intro`：42px 的 @ 方块 + 标题 + 一行小字，下面一条细分隔线。
class _Intro extends StatelessWidget {
  const _Intro();

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.only(bottom: 12),
    decoration: const BoxDecoration(
      border: Border(bottom: BorderSide(color: Color(0xFFF1F1F6))),
    ),
    child: Row(
      children: [
        Container(
          width: 42,
          height: 42,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: const Color(0xFFFFF1F2),
            borderRadius: BorderRadius.circular(14),
          ),
          child: const Text(
            '@',
            style: TextStyle(
              fontSize: 21,
              fontWeight: FontWeight.w900,
              color: AirvanaColors.accent,
              height: 1,
            ),
          ),
        ),
        const SizedBox(width: 11),
        const Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '使用邮箱登录',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900),
              ),
              SizedBox(height: 3),
              Text(
                '验证码将在 10 分钟后失效；当前预览使用本地适配器。',
                style: TextStyle(
                  fontSize: 9,
                  height: 1.5,
                  color: AirvanaColors.muted,
                ),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

class _Field extends StatelessWidget {
  const _Field({required this.label, required this.child});

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        label,
        style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900),
      ),
      const SizedBox(height: 6),
      child,
    ],
  );
}

/// Web `.email-login-notice`：浅红底、红字标签、灰正文。
class _Notice extends StatelessWidget {
  const _Notice({super.key, required this.entry});

  final (String, String) entry;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 10),
    decoration: BoxDecoration(
      color: const Color(0xFFFFF1F2),
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: const Color(0xFFFFD6DA)),
    ),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          entry.$1,
          style: const TextStyle(
            fontSize: 9,
            height: 1.5,
            fontWeight: FontWeight.w900,
            color: Color(0xFFC62836),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            entry.$2,
            style: const TextStyle(
              fontSize: 9,
              height: 1.5,
              color: Color(0xFF6E5A5D),
            ),
          ),
        ),
      ],
    ),
  );
}
