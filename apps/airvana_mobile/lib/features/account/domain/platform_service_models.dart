/// P2 平台能力模型：Boost、素材授权、AI 分身、订阅、钱包地址校验、未成年人策略。
library;

DateTime? _time(Object? value) =>
    value is String ? DateTime.tryParse(value) : null;

/// 发现加权（Boost）：消耗 20 AIP 换取 24 小时曝光加权。
///
/// 字段严格对齐服务端实际返回 `{id,status,expiresAt,idempotent,balance:{AIP,AIT}}`；
/// 费用不在响应里，由服务端固定为 20，作为常量声明而不是从响应臆测。
class BoostResult {
  const BoostResult({
    required this.id,
    required this.status,
    required this.expiresAt,
    required this.idempotent,
    required this.remainingAip,
  });

  /// 服务端固定的 Boost 费用。
  static const costAip = 20;

  final String id;
  final String status;
  final DateTime? expiresAt;

  /// true = 该内容已在加权中，本次未重复扣费。
  final bool idempotent;

  /// 扣减后的服务端 AIP 余额（来自 `balance.AIP`）。
  final int remainingAip;

  factory BoostResult.fromJson(Map<String, dynamic> json) {
    final balance = json['balance'];
    final aip = balance is Map<String, dynamic> ? balance['AIP'] : null;
    return BoostResult(
      id: '${json['id'] ?? ''}',
      status: '${json['status'] ?? 'active'}',
      expiresAt: _time(json['expiresAt']),
      idempotent: json['idempotent'] == true,
      remainingAip: aip is num ? aip.toInt() : 0,
    );
  }
}

/// 素材授权登记。授权撤销或到期会直接阻止使用它的内容发布。
class CreatorAsset {
  const CreatorAsset({
    required this.id,
    required this.name,
    required this.kind,
    required this.licenseType,
    required this.status,
    this.usage,
    this.expiresAt,
  });

  final String id;
  final String name;
  final String kind;

  /// original / licensed / brand_supplied / cc0
  final String licenseType;

  /// authorized / revoked / expired
  final String status;

  /// 只有按内容查询时才有：该素材在内容中的用途。
  final String? usage;
  final DateTime? expiresAt;

  bool get authorized => status == 'authorized';

  /// 第三方与品牌素材必须有授权凭证引用，界面据此提示必填。
  static bool requiresLicenseRef(String licenseType) =>
      licenseType == 'licensed' || licenseType == 'brand_supplied';

  factory CreatorAsset.fromJson(Map<String, dynamic> json) => CreatorAsset(
    id: '${json['id'] ?? ''}',
    name: '${json['name'] ?? ''}',
    kind: '${json['kind'] ?? 'other'}',
    licenseType: '${json['licenseType'] ?? ''}',
    status: '${json['status'] ?? 'authorized'}',
    usage: json['usage'] is String ? json['usage'] as String : null,
    expiresAt: _time(json['expiresAt']),
  );
}

/// 服务端 AI 分身。人设每次保存版本号递增，授权时间戳由服务端落。
class ServerAiTwin {
  const ServerAiTwin({
    required this.id,
    required this.displayName,
    required this.status,
    required this.version,
    required this.voiceConsent,
    required this.likenessConsent,
  });

  final String id;
  final String displayName;
  final String status;
  final int version;

  /// 声音 / 形象授权是否已由服务端记录时间戳。
  final bool voiceConsent;
  final bool likenessConsent;

  factory ServerAiTwin.fromJson(Map<String, dynamic> json) => ServerAiTwin(
    id: '${json['id'] ?? ''}',
    displayName: '${json['displayName'] ?? ''}',
    status: '${json['status'] ?? 'active'}',
    version: (json['version'] as num?)?.toInt() ?? 1,
    voiceConsent: json['voiceConsentAt'] != null,
    likenessConsent: json['likenessConsentAt'] != null,
  );
}

/// 订阅计划。
///
/// `priceStatus` 通常是「待商业审批」——此时**不得提供购买入口**，
/// 订阅也永远不直接发放 AIP 或 AIT。
class SubscriptionPlan {
  const SubscriptionPlan({
    required this.planKey,
    required this.name,
    required this.audience,
    required this.priceStatus,
    required this.features,
  });

  final String planKey;
  final String name;
  final String audience;
  final String priceStatus;
  final List<String> features;

  bool get purchasable => priceStatus == 'available';

  factory SubscriptionPlan.fromJson(Map<String, dynamic> json) =>
      SubscriptionPlan(
        planKey: '${json['planKey'] ?? ''}',
        name: '${json['name'] ?? ''}',
        audience: '${json['audience'] ?? ''}',
        priceStatus: '${json['priceStatus'] ?? 'pending_approval'}',
        features: json['features'] is List
            ? (json['features'] as List)
                  .map((item) => '$item')
                  .toList(growable: false)
            : const [],
      );
}

/// 钱包地址校验结果（纯格式与校验和，不涉及签名）。
class WalletAddressCheck {
  const WalletAddressCheck({required this.address, required this.normalized});

  final String address;
  final String normalized;
}

/// 未成年人模式策略（服务端配置，客户端强制执行）。
///
/// 字段名严格对齐服务端：`curfew` 是 `'22:00-06:00'` 单个字符串，
/// 拦截项叫 `paymentsBlocked` / `socialRestricted`。
class MinorModePolicy {
  const MinorModePolicy({
    required this.enabled,
    required this.dailyMinutes,
    required this.curfew,
    required this.paymentsBlocked,
    required this.socialRestricted,
    required this.note,
  });

  final bool enabled;
  final int dailyMinutes;

  /// 宵禁时段，形如 '22:00-06:00'；未配置时为空。
  final String curfew;
  final bool paymentsBlocked;
  final bool socialRestricted;
  final String note;

  static const unconfigured = MinorModePolicy(
    enabled: false,
    dailyMinutes: 0,
    curfew: '',
    paymentsBlocked: false,
    socialRestricted: false,
    note: '未成年人模式策略未配置；启用前不提供未成年人专属限制。',
  );

  factory MinorModePolicy.fromJson(Map<String, dynamic> json) =>
      MinorModePolicy(
        enabled: json['enabled'] == true,
        dailyMinutes: (json['dailyMinutes'] as num?)?.toInt() ?? 0,
        curfew: '${json['curfew'] ?? ''}',
        paymentsBlocked: json['paymentsBlocked'] == true,
        socialRestricted: json['socialRestricted'] == true,
        note: '${json['note'] ?? ''}',
      );
}
