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

/// Web「Google 一键登录」的演示人格。
///
/// Web 走的是 `localAdapterLogin('google', 'Kai Chen', …)`：不问邮箱，直接以这
/// 个人格建立身份。服务端 `/api/auth/google/local` 在没给邮箱时也缺省到
/// `kai.chen@airvana-demo.local`，两边本来就对得上。这里仍然显式传——
/// 服务端缺省值改了，不该悄悄换掉本机的登录身份。
abstract final class GoogleLocalAdapterPersona {
  static const email = 'kai.chen@airvana-demo.local';
  static const displayName = 'Kai Chen';
}

/// 与 Web `isValidEmail` 同一条正则。
///
/// 发请求前先在本地拦一次明显写错的地址，把「邮箱格式不对」和
/// 「服务端不可用」这两种失败分开，用户才知道该改什么。
bool isValidLoginEmail(String value) => _loginEmail.hasMatch(value.trim());

final _loginEmail = RegExp(
  r"^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?"
  r'(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$',
  caseSensitive: false,
);
