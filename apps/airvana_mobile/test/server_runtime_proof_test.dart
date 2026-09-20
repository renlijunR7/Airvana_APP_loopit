import 'dart:convert';

import 'package:airvana_mobile/core/config/app_environment.dart';
import 'package:airvana_mobile/core/network/airvana_api_client.dart';
import 'package:airvana_mobile/features/runtime/domain/server_runtime_proof.dart';
import 'package:airvana_mobile/features/shared/data/airvana_repository.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_store.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

/// 运行证明必须是**服务端权威**的：
/// `playable_start` 在游戏真正开始时发出（服务端以它为计时起点），
/// 结束时才补 `step_complete` + `playable_complete`；任何失败静默降级。
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
      // 故意设为 true：运行证明不应受该开关影响
      preferLocalData: true,
    ),
    localStore: LocalAirvanaStore(
      persistence: MemoryLocalAirvanaPersistence(),
      ids: _Ids(),
    ),
  );

  const handle = RuntimeProofHandle(
    contentId: 'content_k',
    sessionToken: 'tok-1',
    rewardEligible: true,
  );

  test(
    'open registers the playable, opens a session and emits only playable_start',
    () async {
      final calls = <(String, Map<String, dynamic>)>[];
      final repository = repositoryWith(
        MockClient((request) async {
          final body = request.body.isEmpty
              ? <String, dynamic>{}
              : jsonDecode(request.body) as Map<String, dynamic>;
          calls.add((request.url.path, body));
          return switch (request.url.path) {
            '/api/demo/mobile-playables' => http.Response(
              jsonEncode({
                'mapping': {
                  'plb_orchard_merge': 'content_mobilearcade_plb_orchard_merge',
                },
              }),
              200,
            ),
            '/api/runtime/sessions' => http.Response(
              jsonEncode({'sessionToken': 'tok-1', 'rewardEligible': true}),
              201,
            ),
            _ => http.Response(jsonEncode({'accepted': true}), 201),
          };
        }),
      );

      final opened = await repository.openRuntimeProof(
        playableKey: 'plb_orchard_merge',
        title: '果园合合塔',
      );

      expect(opened, isNotNull);
      expect(opened!.contentId, 'content_mobilearcade_plb_orchard_merge');
      expect(opened.rewardEligible, isTrue);
      expect(opened.sessionToken, 'tok-1');
      expect(calls.map((call) => call.$1), [
        '/api/demo/mobile-playables',
        '/api/runtime/sessions',
        '/api/runtime/events',
      ]);
      final events = calls.where((call) => call.$1 == '/api/runtime/events');
      expect(events, hasLength(1), reason: '开局只发第一步，不得预发后两步');
      expect(events.single.$2['eventType'], 'playable_start');
      expect(events.single.$2['sequence'], 1);
    },
  );

  test(
    'complete emits the remaining two events in order and returns real AIP',
    () async {
      final events = <Map<String, dynamic>>[];
      final repository = repositoryWith(
        MockClient((request) async {
          final body = jsonDecode(request.body) as Map<String, dynamic>;
          events.add(body);
          return http.Response(
            jsonEncode(
              body['eventType'] == 'playable_complete'
                  ? {'rewardStatus': 'posted', 'points': 5}
                  : {'accepted': true},
            ),
            201,
          );
        }),
      );

      final proof = await repository.completeRuntimeProof(handle, score: 88);

      expect(proof!.posted, isTrue);
      expect(proof.points, 5);
      expect(proof.rewardStatus, 'posted');
      expect(events.map((event) => event['eventType']), [
        'step_complete',
        'playable_complete',
      ]);
      expect(events.map((event) => event['sequence']), [2, 3]);
      expect(events.every((event) => event['sessionToken'] == 'tok-1'), isTrue);
      expect(events.last['payload'], {'score': 88});
    },
  );

  test(
    'too_fast is surfaced as not-posted, never inflated into a reward',
    () async {
      // 服务端最短时长风控：不足 2 秒不发 AIP，并自动建
      // impossibly_fast_completion 风险案。客户端必须如实反映。
      final repository = repositoryWith(
        MockClient(
          (request) async => http.Response(
            jsonEncode({'rewardStatus': 'too_fast', 'points': 0}),
            201,
          ),
        ),
      );
      final proof = await repository.completeRuntimeProof(handle);
      expect(proof!.rewardStatus, 'too_fast');
      expect(proof.points, 0);
      expect(proof.posted, isFalse);
    },
  );

  test(
    'daily duplicate and ineligible outcomes are reported, not inflated',
    () async {
      Future<void> check(String status) async {
        final repository = repositoryWith(
          MockClient(
            (request) async => http.Response(
              jsonEncode({'rewardStatus': status, 'points': 0}),
              201,
            ),
          ),
        );
        final proof = await repository.completeRuntimeProof(handle);
        expect(proof!.rewardStatus, status);
        expect(proof.posted, isFalse, reason: '未真实入账不得判为 posted');
      }

      await check('daily_duplicate');
      await check('ineligible');
    },
  );

  test('any failure while opening degrades silently to null', () async {
    for (final failing in [
      '/api/demo/mobile-playables',
      '/api/runtime/sessions',
      '/api/runtime/events',
    ]) {
      final repository = repositoryWith(
        MockClient((request) async {
          if (request.url.path == failing) {
            return http.Response('{"error":{}}', 500);
          }
          return switch (request.url.path) {
            '/api/demo/mobile-playables' => http.Response(
              jsonEncode({
                'mapping': {'k': 'content_k'},
              }),
              200,
            ),
            '/api/runtime/sessions' => http.Response(
              jsonEncode({'sessionToken': 't', 'rewardEligible': true}),
              201,
            ),
            _ => http.Response('{}', 201),
          };
        }),
      );
      expect(
        await repository.openRuntimeProof(playableKey: 'k', title: 'K'),
        isNull,
        reason: '$failing 失败时必须静默降级',
      );
    }
  });

  test(
    'a failure while completing degrades silently instead of guessing',
    () async {
      final repository = repositoryWith(
        MockClient((request) async => http.Response('{"error":{}}', 500)),
      );
      expect(await repository.completeRuntimeProof(handle), isNull);
    },
  );

  test('an unmapped playable stops before opening a runtime session', () async {
    var sessions = 0;
    final repository = repositoryWith(
      MockClient((request) async {
        if (request.url.path == '/api/runtime/sessions') sessions += 1;
        return switch (request.url.path) {
          '/api/demo/mobile-playables' => http.Response(
            jsonEncode({
              'mapping': {'other': 'content_other'},
            }),
            200,
          ),
          _ => http.Response('{}', 201),
        };
      }),
    );
    expect(
      await repository.openRuntimeProof(playableKey: 'k', title: 'K'),
      isNull,
    );
    expect(sessions, 0, reason: '拿不到 contentId 就不该开会话');
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
