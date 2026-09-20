import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/account/domain/auth_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// 「账号与登录」二级页：真实登录入口。
///
/// 三种方式的真实程度不同，界面必须分别如实标注，不能一视同仁地叫「登录」：
/// - 邮箱验证码：服务端真实签发、校验、一次性消费；当前验证码由本地适配器
///   内联返回（无邮件服务商），此时明确显示出来而不是假装「已发送到邮箱」。
/// - Google：服务端只有**本地适配器**，不是真实 OAuth。
/// - 钱包签名：设备上没有签名器，不做、也不假装能做。
class SignInPageBody extends ConsumerStatefulWidget {
  const SignInPageBody({this.padding, super.key});

  /// 全屏登录页与「设置与更多」二级页的留白不同，由调用方给定。
  final EdgeInsets? padding;

  @override
  ConsumerState<SignInPageBody> createState() => _SignInPageBodyState();
}

class _SignInPageBodyState extends ConsumerState<SignInPageBody> {
  final _email = TextEditingController();
  final _code = TextEditingController();
  final _wallet = TextEditingController();
  String? _walletCheck;
  EmailLoginChallenge? _challenge;
  SignedInIdentity? _signedIn;
  bool _busy = false;
  String? _error;

  static const _titleStyle = TextStyle(
    fontSize: 14,
    fontWeight: FontWeight.w900,
  );
  static const _metaStyle = TextStyle(
    fontSize: 10,
    color: AirvanaColors.muted,
    height: 1.7,
  );

  @override
  void dispose() {
    _email.dispose();
    _code.dispose();
    _wallet.dispose();
    super.dispose();
  }

  bool get _emailLooksValid {
    final value = _email.text.trim();
    return value.contains('@') && value.split('@').last.contains('.');
  }

  Future<void> _run(Future<void> Function() action) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
    } catch (error) {
      // 登录失败必须显式报错，绝不退回 demo 登录冒充成功
      if (mounted) setState(() => _error = '$error');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _refreshSessionScopedData() {
    ref.invalidate(homeProvider);
    ref.invalidate(accountProvider);
    ref.invalidate(creatorCenterProvider);
    ref.invalidate(notificationsProvider);
    ref.invalidate(accountSessionsProvider);
  }

  Widget _card({required Key key, required List<Widget> children}) => Container(
    key: key,
    width: double.infinity,
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      border: Border.all(color: AirvanaColors.line),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: children,
    ),
  );

  @override
  Widget build(BuildContext context) => ListView(
    key: const ValueKey('sign-in-parity'),
    padding: widget.padding ?? const EdgeInsets.fromLTRB(18, 18, 18, 32),
    children: [
      if (_signedIn != null) ...[
        _signedInCard(_signedIn!),
        const SizedBox(height: 12),
      ] else if (widget.padding == null) ...[
        // 全屏登录页的头部已经说明了状态，这里不再重复一张状态卡
        _statusCard(),
        const SizedBox(height: 12),
      ],
      _emailCard(),
      const SizedBox(height: 12),
      _googleCard(),
      const SizedBox(height: 12),
      _walletCard(),
    ],
  );

  /// 当前会话状态。主动退出后必须如实显示，并说明哪些能力会不可用——
  /// 本地演示内容不受影响，但服务端相关能力会显示「未登录」。
  Widget _statusCard() {
    final signedOut = ref.watch(signedOutProvider).value ?? false;
    return _card(
      key: const ValueKey('sign-in-status'),
      children: [
        Text(signedOut ? '当前未登录' : '当前会话状态未知', style: _titleStyle),
        const SizedBox(height: 6),
        Text(
          signedOut
              ? '你已主动退出。本地试玩与演示内容照常可用；创作者中心、互动、'
                    '举报、工单、推广等需要服务端身份的能力会显示「未登录」，'
                    '在下方重新登录后恢复。'
              : '尚未在本页登录过。若此前已有会话，服务端能力可继续使用。',
          style: _metaStyle,
        ),
      ],
    );
  }

  Widget _signedInCard(SignedInIdentity identity) => _card(
    key: const ValueKey('sign-in-current'),
    children: [
      const Text('当前已登录', style: _titleStyle),
      const SizedBox(height: 6),
      Text(
        '${identity.displayName.isEmpty ? identity.userId : identity.displayName}'
        ' · 服务端角色 ${identity.role}'
        '${identity.created ? ' · 本次新建账号' : ''}',
        style: const TextStyle(fontSize: 11),
      ),
      const SizedBox(height: 4),
      Text(
        identity.method == 'google_local' ? '通过 Google 本地适配器登录' : '通过邮箱验证码登录',
        style: _metaStyle,
      ),
    ],
  );

  Widget _emailCard() {
    final challenge = _challenge;
    return _card(
      key: const ValueKey('sign-in-email'),
      children: [
        const Text('邮箱验证码登录', style: _titleStyle),
        const SizedBox(height: 4),
        const Text('验证码 10 分钟有效、只能用一次；连续输错会锁定。', style: _metaStyle),
        const SizedBox(height: 12),
        TextField(
          key: const ValueKey('sign-in-email-input'),
          controller: _email,
          keyboardType: TextInputType.emailAddress,
          autocorrect: false,
          onChanged: (_) => setState(() {}),
          decoration: const InputDecoration(
            labelText: '邮箱地址',
            isDense: true,
            border: OutlineInputBorder(),
          ),
          style: const TextStyle(fontSize: 13),
        ),
        const SizedBox(height: 10),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton(
            key: const ValueKey('sign-in-email-request'),
            onPressed: !_emailLooksValid || _busy
                ? null
                : () => _run(() async {
                    final result = await ref
                        .read(airvanaRepositoryProvider)
                        .requestEmailLoginCode(_email.text);
                    if (mounted) setState(() => _challenge = result);
                  }),
            child: Text(_busy ? '处理中…' : '获取验证码'),
          ),
        ),
        if (challenge != null) ...[
          const SizedBox(height: 12),
          Container(
            key: const ValueKey('sign-in-email-delivery'),
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFF7F7FA),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(_deliveryMessage(challenge), style: _metaStyle),
          ),
          const SizedBox(height: 10),
          TextField(
            key: const ValueKey('sign-in-code-input'),
            controller: _code,
            keyboardType: TextInputType.number,
            onChanged: (_) => setState(() {}),
            decoration: const InputDecoration(
              labelText: '6 位验证码',
              isDense: true,
              border: OutlineInputBorder(),
            ),
            style: const TextStyle(fontSize: 13),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              key: const ValueKey('sign-in-email-verify'),
              onPressed: _code.text.trim().length < 4 || _busy
                  ? null
                  : () => _run(() async {
                      final identity = await ref
                          .read(airvanaRepositoryProvider)
                          .verifyEmailLoginCode(
                            email: _email.text,
                            code: _code.text,
                          );
                      _refreshSessionScopedData();
                      if (!mounted) return;
                      setState(() {
                        _signedIn = identity;
                        _challenge = null;
                      });
                      _code.clear();
                    }),
              child: Text(_busy ? '验证中…' : '登录'),
            ),
          ),
        ],
        if (_error != null) ...[
          const SizedBox(height: 10),
          Text(
            _error!,
            key: const ValueKey('sign-in-error'),
            style: const TextStyle(fontSize: 11, color: Color(0xFFC62836)),
          ),
        ],
      ],
    );
  }

  static String _deliveryMessage(EmailLoginChallenge challenge) {
    final code = challenge.demoCode;
    if (code != null) {
      return '尚未接入邮件服务商，验证码由本地适配器直接返回：$code\n'
          '上线接入真实邮件后此处不再显示验证码。';
    }
    if (!challenge.deliveredByRealProvider) {
      return '尚未接入邮件服务商，验证码不会真正送达邮箱，无法完成登录。';
    }
    return '验证码已发送，请查收邮箱（${challenge.expiresInMinutes} 分钟内有效）。';
  }

  Widget _googleCard() => _card(
    key: const ValueKey('sign-in-google'),
    children: [
      const Text('Google 登录（本地适配器）', style: _titleStyle),
      const SizedBox(height: 4),
      const Text(
        '这不是真实的 Google OAuth：服务端用本地适配器按邮箱建立身份，'
        '用于本地联调。接入真实 OAuth 后会替换为标准授权流程。',
        style: _metaStyle,
      ),
      const SizedBox(height: 12),
      SizedBox(
        width: double.infinity,
        child: OutlinedButton(
          key: const ValueKey('sign-in-google-button'),
          onPressed: !_emailLooksValid || _busy
              ? null
              : () => _run(() async {
                  final identity = await ref
                      .read(airvanaRepositoryProvider)
                      .signInWithGoogleLocalAdapter(email: _email.text);
                  _refreshSessionScopedData();
                  if (mounted) setState(() => _signedIn = identity);
                }),
          child: const Text('用上方邮箱通过本地适配器登录'),
        ),
      ),
    ],
  );

  Widget _walletCard() => _card(
    key: const ValueKey('sign-in-wallet'),
    children: [
      const Text('数字钱包签名登录', style: _titleStyle),
      const SizedBox(height: 4),
      const Text(
        '服务端已具备一次性 nonce 与签名验签能力，但移动端需要钱包应用完成签名'
        '（WalletConnect 或钱包深链），当前未接入，因此此处不提供登录入口。'
        '\n\nAirvana 不会索取助记词或私钥。',
        style: _metaStyle,
      ),
      const SizedBox(height: 10),
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        decoration: BoxDecoration(
          color: const Color(0xFFF1F1F6),
          borderRadius: BorderRadius.circular(999),
        ),
        child: const Text(
          '待接入签名器',
          style: TextStyle(
            fontSize: 9,
            fontWeight: FontWeight.w900,
            color: Color(0xFF636366),
          ),
        ),
      ),
      const SizedBox(height: 14),
      // 地址校验不需要签名，可以真实完成；它只验证格式与校验和，
      // 不等于绑定，界面必须说清楚这个区别。
      const Text('可以先校验地址格式（不需要签名，也不构成绑定）', style: _metaStyle),
      const SizedBox(height: 8),
      TextField(
        key: const ValueKey('wallet-address-input'),
        controller: _wallet,
        autocorrect: false,
        onChanged: (_) => setState(() => _walletCheck = null),
        decoration: const InputDecoration(
          labelText: '钱包地址（0x…）',
          isDense: true,
          border: OutlineInputBorder(),
        ),
        style: const TextStyle(fontSize: 12),
      ),
      const SizedBox(height: 8),
      SizedBox(
        width: double.infinity,
        child: OutlinedButton(
          key: const ValueKey('wallet-address-validate'),
          onPressed: _wallet.text.trim().isEmpty || _busy
              ? null
              : () => _run(() async {
                  final checked = await ref
                      .read(airvanaRepositoryProvider)
                      .validateWalletAddress(address: _wallet.text);
                  if (mounted) {
                    setState(
                      () => _walletCheck = '地址有效 · 校验和格式 ${checked.address}',
                    );
                  }
                }),
          child: const Text('校验地址'),
        ),
      ),
      if (_walletCheck != null) ...[
        const SizedBox(height: 8),
        Text(
          _walletCheck!,
          key: const ValueKey('wallet-address-result'),
          style: const TextStyle(fontSize: 10, color: AirvanaColors.success),
        ),
      ],
    ],
  );
}
