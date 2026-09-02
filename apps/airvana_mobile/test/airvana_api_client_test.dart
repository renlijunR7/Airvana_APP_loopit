import 'dart:convert';

import 'package:airvana_mobile/core/network/airvana_api_client.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  test('stores the login cookie and sends it on the next request', () async {
    final store = MemorySessionStore();
    var call = 0;
    final client = AirvanaApiClient(
      baseUri: Uri.parse('http://127.0.0.1:8082'),
      sessionStore: store,
      httpClient: MockClient((request) async {
        call += 1;
        if (call == 1) {
          expect(request.headers.containsKey('Cookie'), isFalse);
          return http.Response(
            jsonEncode({
              'me': {'id': 'user-1'},
            }),
            200,
            headers: {
              'set-cookie': 'airvana_session=token-1; Path=/; HttpOnly',
            },
          );
        }
        expect(request.headers['Cookie'], 'airvana_session=token-1');
        return http.Response(jsonEncode({'history': []}), 200);
      }),
    );

    await client.postJson('/api/auth/demo', {'role': 'creator'});
    await client.getJson('/api/runtime/history');
    expect(await store.readCookie(), 'airvana_session=token-1');
  });

  test('does not convert an API failure into a success value', () async {
    final client = AirvanaApiClient(
      baseUri: Uri.parse('http://127.0.0.1:8082'),
      sessionStore: MemorySessionStore(),
      httpClient: MockClient(
        (_) async => http.Response(
          jsonEncode({
            'error': {'code': 'offline', 'message': '服务不可用'},
          }),
          503,
          headers: {'content-type': 'application/json; charset=utf-8'},
        ),
      ),
    );

    expect(
      () => client.getJson('/api/bootstrap'),
      throwsA(
        isA<ApiException>()
            .having((error) => error.statusCode, 'statusCode', 503)
            .having((error) => error.message, 'message', '服务不可用'),
      ),
    );
  });

  test(
    'times out instead of leaving a physical-device screen loading',
    () async {
      final client = AirvanaApiClient(
        baseUri: Uri.parse('http://10.0.2.2:8082'),
        sessionStore: MemorySessionStore(),
        requestTimeout: const Duration(milliseconds: 5),
        httpClient: MockClient((_) async {
          await Future<void>.delayed(const Duration(milliseconds: 50));
          return http.Response('{}', 200);
        }),
      );

      expect(
        () => client.getJson('/api/bootstrap'),
        throwsA(
          isA<ApiException>().having(
            (error) => error.message,
            'message',
            contains('连接 Airvana 服务超时'),
          ),
        ),
      );
    },
  );
}
