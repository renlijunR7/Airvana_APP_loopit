import 'dart:convert';

import 'package:airvana_mobile/core/config/app_environment.dart';
import 'package:airvana_mobile/core/network/airvana_api_client.dart';
import 'package:airvana_mobile/features/account/domain/platform_service_models.dart';
import 'package:airvana_mobile/features/creator_center/domain/creator_center_snapshot.dart';
import 'package:airvana_mobile/features/shared/data/airvana_repository.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_store.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

/// P2 平台能力。
///
/// 分界：扣费与撤销是**写入**，失败必须抛出；目录与策略是**读取**，
/// 失败静默降级为「空 / 未配置」，绝不编造限制或可购买状态。
void main() {
  final baseUri = Uri.parse('http://192.0.2.1:8082');

  AirvanaRepository repositoryWith(MockClient client) => AirvanaRepository(
    api: AirvanaApiClient(
      baseUri: baseUri,
      sessionStore: MemorySessionStore(),
      httpClient: client,
    ),
    environment: AppEnvironment(
      apiBaseUri: baseUri,
      demoLoginEnabled: false,
      preferLocalData: true,
    ),
    localStore: LocalAirvanaStore(
      persistence: MemoryLocalAirvanaPersistence(),
      ids: _Ids(),
    ),
  );

  MockClient routes(Map<String, (int, Object)> map, {List<String>? log}) =>
      MockClient((request) async {
        log?.add('${request.method} ${request.url.path}');
        final match = map[request.url.path];
        if (match == null) return http.Response('{}', 404);
        return http.Response(
          jsonEncode(match.$2),
          match.$1,
          headers: const {'content-type': 'application/json; charset=utf-8'},
        );
      });

  final broken = MockClient(
    (request) async => http.Response('{"error":{}}', 500),
  );

  // ===== Boost =====

  // 下面的报文是对真实服务端实测抓取后原样固定的，不是按猜测构造——
  // 之前按猜测写的字段名与服务端不符，余额会被读成 0。
  test('boost parses the real server payload shape', () async {
    final repository = repositoryWith(
      routes({
        '/api/contents/c1/boost': (
          201,
          {
            'id': 'boost_1',
            'status': 'active',
            'expiresAt': '2026-09-12T07:03:11.177Z',
            'idempotent': false,
            'balance': {'AIP': 30, 'AIT': 0},
          },
        ),
      }),
    );
    final result = await repository.boostContent('c1');
    expect(result.id, 'boost_1');
    expect(result.remainingAip, 30, reason: '余额来自 balance.AIP');
    expect(result.idempotent, isFalse);
    expect(result.expiresAt, isNotNull);
    expect(BoostResult.costAip, 20, reason: '费用是服务端常量，不从响应臆测');
  });

  test(
    're-boosting an already boosted content is reported as idempotent',
    () async {
      final repository = repositoryWith(
        routes({
          '/api/contents/c1/boost': (
            200,
            {
              'id': 'boost_1',
              'status': 'active',
              'expiresAt': '2026-09-12T07:03:11.177Z',
              'idempotent': true,
              'balance': {'AIP': 30},
            },
          ),
        }),
      );
      final result = await repository.boostContent('c1');
      expect(result.idempotent, isTrue, reason: '不得提示又扣了一次 20 AIP');
    },
  );

  test(
    'a failed boost throws so the user is not told it took effect',
    () async {
      await expectLater(
        repositoryWith(broken).boostContent('c1'),
        throwsA(isA<ApiException>()),
      );
    },
  );

  // ===== 素材授权 =====

  test(
    'asset registration passes the licence fields the server enforces',
    () async {
      final bodies = <Map<String, dynamic>>[];
      final repository = repositoryWith(
        MockClient((request) async {
          bodies.add(jsonDecode(request.body) as Map<String, dynamic>);
          return http.Response(
            jsonEncode({
              'asset': {
                'id': 'asset_1',
                'name': '品牌主视觉',
                'kind': 'image',
                'licenseType': 'brand_supplied',
                'status': 'authorized',
              },
            }),
            201,
            headers: const {'content-type': 'application/json; charset=utf-8'},
          );
        }),
      );
      final asset = await repository.registerAsset(
        name: '品牌主视觉',
        kind: 'image',
        licenseType: 'brand_supplied',
        checksum: 'a' * 16,
        licenseRef: 'BRAND-LIC-001',
      );
      expect(asset.id, 'asset_1');
      expect(asset.authorized, isTrue);
      expect(bodies.single['licenseType'], 'brand_supplied');
      expect(bodies.single['licenseRef'], 'BRAND-LIC-001');
    },
  );

  test('third-party and brand assets are flagged as needing a licence ref', () {
    expect(CreatorAsset.requiresLicenseRef('licensed'), isTrue);
    expect(CreatorAsset.requiresLicenseRef('brand_supplied'), isTrue);
    expect(CreatorAsset.requiresLicenseRef('original'), isFalse);
    expect(CreatorAsset.requiresLicenseRef('cc0'), isFalse);
  });

  test(
    'a failed revoke throws so the licence is not shown as withdrawn',
    () async {
      await expectLater(
        repositoryWith(broken).revokeAsset('asset_1'),
        throwsA(isA<ApiException>()),
      );
    },
  );

  test(
    'asset listing degrades to empty rather than failing the page',
    () async {
      expect(await repositoryWith(broken).loadAssets(), isEmpty);
    },
  );

  // ===== AI 分身 =====

  test(
    'saving the twin reports the server version and consent timestamps',
    () async {
      final repository = repositoryWith(
        routes({
          '/api/ai-twin': (
            200,
            {
              'twin': {
                'id': 'twin_1',
                'displayName': '我的 AI 分身',
                'status': 'active',
                'version': 3,
                'voiceConsentAt': '2026-09-11T00:00:00.000Z',
              },
            },
          ),
        }),
      );
      final twin = await repository.saveServerAiTwin(displayName: '我的 AI 分身');
      expect(twin.version, 3);
      expect(twin.voiceConsent, isTrue);
      expect(twin.likenessConsent, isFalse, reason: '没有时间戳就不算已授权');
    },
  );

  test('a failed twin save throws instead of faking a sync', () async {
    await expectLater(
      repositoryWith(broken).saveServerAiTwin(displayName: 'X'),
      throwsA(isA<ApiException>()),
    );
  });

  // ===== 订阅 =====

  test(
    'plans are only purchasable when the server says the price is settled',
    () async {
      final repository = repositoryWith(
        routes({
          '/api/economy/plans': (
            200,
            {
              'plans': [
                {
                  'planKey': 'free',
                  'name': 'Free',
                  'audience': '新用户',
                  'priceStatus': 'available',
                },
                {
                  'planKey': 'creator_pro',
                  'name': 'Creator Pro',
                  'audience': '职业创作者',
                  'priceStatus': 'pending_approval',
                },
              ],
            },
          ),
        }),
      );
      final plans = await repository.loadSubscriptionPlans();
      expect(plans.first.purchasable, isTrue);
      expect(plans.last.purchasable, isFalse, reason: '价格待商业审批时不得显示为可订阅');
    },
  );

  test('cancelling returns the real period end, and failure throws', () async {
    final repository = repositoryWith(
      routes({
        '/api/economy/subscription/cancel': (
          200,
          {'cancelAtPeriodEnd': true, 'endsAt': '2026-10-01T00:00:00.000Z'},
        ),
      }),
    );
    expect(
      await repository.cancelSubscriptionAtPeriodEnd(),
      DateTime.parse('2026-10-01T00:00:00.000Z'),
    );
    await expectLater(
      repositoryWith(broken).cancelSubscriptionAtPeriodEnd(),
      throwsA(isA<ApiException>()),
    );
  });

  // ===== 钱包地址（不含签名）=====

  test('address validation is a format check, not a binding', () async {
    final repository = repositoryWith(
      routes({
        '/api/wallet-bindings/validate-address': (
          200,
          {
            'valid': true,
            'address': '0xAbC0000000000000000000000000000000000001',
            'normalized': '0xabc0000000000000000000000000000000000001',
          },
        ),
      }),
    );
    final checked = await repository.validateWalletAddress(
      address: '0xabc0000000000000000000000000000000000001',
    );
    expect(checked.address.startsWith('0x'), isTrue);
    expect(checked.normalized, checked.normalized.toLowerCase());
  });

  // ===== 未成年人模式 =====

  test('an unconfigured or unreachable policy imposes nothing', () async {
    expect(
      (await repositoryWith(broken).loadMinorModePolicy()).enabled,
      isFalse,
    );
    final empty = repositoryWith(
      routes({
        '/api/policies/minor-mode': (
          200,
          {
            'policy': {'enabled': false, 'note': '未配置'},
          },
        ),
      }),
    );
    final policy = await empty.loadMinorModePolicy();
    expect(policy.enabled, isFalse);
    expect(policy.dailyMinutes, 0, reason: '未配置时不得编造限制');
  });

  test(
    'an enabled policy is surfaced exactly as the server configured it',
    () async {
      final repository = repositoryWith(
        routes({
          '/api/policies/minor-mode': (
            200,
            {
              // 真实服务端返回：curfew 是单个字符串，拦截项叫
              // paymentsBlocked / socialRestricted。按 curfewStart /
              // blockPayments 解析会把「已启用」的策略全部读成关闭。
              'policy': {
                'enabled': true,
                'dailyMinutes': 90,
                'curfew': '22:00-06:00',
                'paymentsBlocked': true,
                'socialRestricted': true,
                'updatedAt': '2026-08-21T08:35:02.409Z',
              },
            },
          ),
        }),
      );
      final policy = await repository.loadMinorModePolicy();
      expect(policy.enabled, isTrue);
      expect(policy.dailyMinutes, 90);
      expect(policy.curfew, '22:00-06:00');
      expect(policy.paymentsBlocked, isTrue);
      expect(policy.socialRestricted, isTrue);
    },
  );

  // ===== 快照里的可推广作品 =====

  test('published works exclude drafts and mark the already-boosted ones', () {
    final snapshot = CreatorCenterSnapshot.fromBootstrap({
      'stats': {'publishedContents': 2},
      'contents': [
        {'id': 'c1', 'title': 'A', 'status': 'published'},
        {'id': 'c2', 'title': 'B', 'status': 'published'},
        {'id': 'c3', 'title': 'C', 'status': 'draft'},
      ],
      'activeBoosts': [
        {'id': 'b1', 'contentId': 'c1', 'costAip': 20},
      ],
    });
    expect(snapshot.publishedWorks.map((work) => work.contentId), ['c1', 'c2']);
    expect(snapshot.publishedWorks.first.boosted, isTrue);
    expect(snapshot.publishedWorks.last.boosted, isFalse);
  });
}

class _Ids implements LocalIdGenerator {
  final Map<String, int> _sequences = {};

  @override
  String next(String prefix) {
    final value = (_sequences[prefix] ?? 0) + 1;
    _sequences[prefix] = value;
    return '$prefix-$value';
  }
}
