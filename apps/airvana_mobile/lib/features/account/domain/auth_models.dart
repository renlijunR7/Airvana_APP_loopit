/// 真实登录相关模型。
///
/// 边界：
/// - 邮箱验证码目前由**本地适配器**随响应返回（`demoCode`）；接入真实邮件服务后
///   服务端会移除该字段，届时客户端必须靠用户手动输入收到的验证码。
/// - Google 走服务端的**本地适配器**，不是真实 OAuth，界面必须如实标注。
/// - 钱包签名需要设备上的签名器（WalletConnect / 钱包 App 深链），
///   当前 Flutter 端没有接入，不得伪造签名结果。
library;

class EmailLoginChallenge {
  const EmailLoginChallenge({
    required this.sent,
    required this.expiresInMinutes,
    required this.delivery,
    this.demoCode,
  });

  final bool sent;
  final int expiresInMinutes;

  /// 'local_adapter_inline' = 本地适配器内联返回验证码；
  /// 'deferred_no_provider' = 没有邮件服务商，验证码不会真正送达。
  final String delivery;

  /// 仅本地适配器下存在；接入真实邮件服务后为 null。
  final String? demoCode;

  bool get deliveredByRealProvider =>
      delivery != 'local_adapter_inline' && delivery != 'deferred_no_provider';
}

/// 一次成功登录的结果。
class SignedInIdentity {
  const SignedInIdentity({
    required this.userId,
    required this.displayName,
    required this.role,
    required this.created,
    required this.method,
  });

  final String userId;
  final String displayName;

  /// 服务端权威角色（player / creator / brand / admin）。
  final String role;

  /// true = 本次登录顺带注册了新账号。
  final bool created;

  /// 'email' / 'google_local'，用于界面如实说明登录方式。
  final String method;
}
