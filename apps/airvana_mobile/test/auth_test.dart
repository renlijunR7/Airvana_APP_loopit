import 'dart:convert';

import 'package:airvana_mobile/core/config/app_environment.dart';
import 'package:airvana_mobile/core/network/airvana_api_client.dart';
import 'package:airvana_mobile/features/shared/data/airvana_repository.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_store.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

/// 真实登录与登出。
///
/// 三种方式真实程度不同，模型必须能把差别表达出来；
/// 登录失败一律抛出，绝不退回 demo 登录冒充成功。
void main() {
  final baseUri = Uri.parse('http://192.0.2.1:8082');

  ({AirvanaRepository repository, MemorySessionStore store}) build(
    MockClient client,
  ) {
    final store = MemorySessionStore();
    return (
      repository: AirvanaRepository(
        api: AirvanaApiClient(
          baseUri: baseUri,
          sessionStore: store,
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
      ),
      store: store,
    );
  }

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

  test(
    'the local email adapter is distinguishable from a real provider',
    () async {
      final local = build(
        routes({
          '/api/auth/email/challenge': (
            200,
            {
              'sent': true,
              'expiresInMinutes': 10,
              'delivery': 'local_adapter_inline',
              'demoCode': '123456',
            },
          ),
        }),
      ).repository;
      final adapter = await local.requestEmailLoginCode('kai@airvana.test');
      expect(adapter.demoCode, '123456');
      expect(
        adapter.deliveredByRealProvider,
        isFalse,
        reason: '本地适配器不得被当成真实邮件送达',
      );

      final real = build(
        routes({
          '/api/auth/email/challenge': (
            200,
            {'sent': true, 'expiresInMinutes': 10, 'delivery': 'smtp'},
          ),
        }),
      ).repository;
      final sent = await real.requestEmailLoginCode('kai@airvana.test');
      expect(sent.demoCode, isNull);
      expect(sent.deliveredByRealProvider, isTrue);

      final none = build(
        routes({
          '/api/auth/email/challenge': (
            200,
            {
              'sent': true,
              'expiresInMinutes': 10,
              'delivery': 'deferred_no_provider',
            },
          ),
        }),
      ).repository;
      final deferred = await none.requestEmailLoginCode('kai@airvana.test');
      expect(deferred.demoCode, isNull);
      expect(
        deferred.deliveredByRealProvider,
        isFalse,
        reason: '没有邮件服务商时不能显示为已送达',
      );
    },
  );

  test('email verification returns the server identity and role', () async {
    final repository = build(
      routes({
        '/api/auth/email/verify': (
          200,
          {
            'me': {'id': 'usr_1', 'displayName': 'Kai', 'role': 'player'},
            'created': true,
          },
        ),
      }),
    ).repository;
    final identity = await repository.verifyEmailLoginCode(
      email: 'kai@airvana.test',
      code: '123456',
    );
    expect(identity.userId, 'usr_1');
    expect(identity.role, 'player', reason: '角色以服务端为准，不在客户端推断');
    expect(identity.created, isTrue);
    expect(identity.method, 'email');
  });

  test(
    'google sign-in is labelled as the local adapter, not real OAuth',
    () async {
      final repository = build(
        routes({
          '/api/auth/google/local': (
            200,
            {
              'me': {'id': 'usr_2', 'displayName': 'Kai', 'role': 'creator'},
              'created': false,
              'adapter': 'local',
            },
          ),
        }),
      ).repository;
      final identity = await repository.signInWithGoogleLocalAdapter(
        email: 'kai@airvana.test',
      );
      expect(identity.method, 'google_local');
      expect(identity.userId, 'usr_2');
    },
  );

  test(
    'a wrong code throws instead of falling back to a demo session',
    () async {
      final built = build(
        MockClient(
          (request) async => http.Response(
            jsonEncode({
              'error': {'code': 'login_code_invalid'},
            }),
            401,
            headers: const {'content-type': 'application/json; charset=utf-8'},
          ),
        ),
      );
      await expectLater(
        built.repository.verifyEmailLoginCode(
          email: 'kai@airvana.test',
          code: '000000',
        ),
        throwsA(isA<ApiException>()),
      );
      expect(await built.store.readCookie(), isNull, reason: '登录失败不得留下任何会话凭证');
    },
  );

  test(
    'a response without a user is rejected rather than half-accepted',
    () async {
      final repository = build(
        routes({
          '/api/auth/email/verify': (200, {'created': true}),
        }),
      ).repository;
      await expectLater(
        repository.verifyEmailLoginCode(email: 'a@b.com', code: '1'),
        throwsA(isA<ApiException>()),
      );
    },
  );

  test(
    'sign out destroys the server session and clears the local cookie',
    () async {
      final log = <String>[];
      final built = build(
        routes({
          '/api/auth/logout': (200, {'ok': true}),
        }, log: log),
      );
      await built.store.writeCookie('airvana_session=abc');
      await built.repository.signOut();
      expect(log, contains('POST /api/auth/logout'));
      expect(await built.store.readCookie(), isNull);
    },
  );

  test(
    'sign out still clears local credentials when the server call fails',
    () async {
      final built = build(
        MockClient((request) async => http.Response('{"error":{}}', 500)),
      );
      await built.store.writeCookie('airvana_session=abc');
      await expectLater(
        built.repository.signOut(),
        throwsA(isA<ApiException>()),
      );
      expect(
        await built.store.readCookie(),
        isNull,
        reason: '否则用户以为已退出，设备上却还留着可用会话',
      );
    },
  );
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
