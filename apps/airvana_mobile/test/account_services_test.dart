import 'dart:convert';

import 'package:airvana_mobile/core/config/app_environment.dart';
import 'package:airvana_mobile/core/network/airvana_api_client.dart';
import 'package:airvana_mobile/features/shared/data/airvana_repository.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_store.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

/// 账号与治理类写入能力。
///
/// 核心约定：删除账号、举报、工单、资格申请都是用户以为「已经提交」的动作，
/// **失败必须抛出**，绝不能静默降级成本地成功。读取类才允许静默降级。
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

  MockClient jsonRoutes(
    Map<String, (int, Object)> routes, {
    List<String>? log,
  }) => MockClient((request) async {
    log?.add('${request.method} ${request.url.path}');
    final match = routes[request.url.path];
    if (match == null) return http.Response('{}', 404);
    // 必须声明 charset：http.Response 在缺少 charset 时按 latin1 编码 body，
    // 含中文的响应会直接抛异常（真实服务端返回的正是 utf-8）。
    return http.Response(
      jsonEncode(match.$2),
      match.$1,
      headers: const {'content-type': 'application/json; charset=utf-8'},
    );
  });

  // ===== 账号删除 =====

  test(
    'deletion request returns the server schedule and idempotency flag',
    () async {
      final repository = repositoryWith(
        jsonRoutes({
          '/api/account/deletion-request': (
            202,
            {
              'id': 'delete_request_1',
              'status': 'pending',
              'scheduledFor': '2026-10-10T00:00:00.000Z',
              'idempotent': false,
            },
          ),
        }),
      );
      final result = await repository.requestAccountDeletion(reason: '不再使用');
      expect(result.id, 'delete_request_1');
      expect(result.pending, isTrue);
      expect(result.scheduledFor, '2026-10-10T00:00:00.000Z');
      expect(result.idempotent, isFalse);
    },
  );

  test(
    'a repeated deletion request is reported as idempotent, not as new',
    () async {
      final repository = repositoryWith(
        jsonRoutes({
          '/api/account/deletion-request': (
            200,
            {
              'id': 'delete_request_1',
              'status': 'pending',
              'scheduledFor': '2026-10-10T00:00:00.000Z',
              'idempotent': true,
            },
          ),
        }),
      );
      expect((await repository.requestAccountDeletion()).idempotent, isTrue);
    },
  );

  test(
    'a failed deletion request throws instead of pretending to succeed',
    () async {
      final repository = repositoryWith(
        MockClient((request) async => http.Response('{"error":{}}', 500)),
      );
      await expectLater(
        repository.requestAccountDeletion(),
        throwsA(isA<ApiException>()),
      );
    },
  );

  test(
    'deletion status reads pending only, and degrades to null when unavailable',
    () async {
      final pending = repositoryWith(
        jsonRoutes({
          '/api/bootstrap': (
            200,
            {
              'deletionRequest': {
                'id': 'd1',
                'status': 'pending',
                'scheduledFor': '2026-10-10T00:00:00.000Z',
              },
            },
          ),
        }),
      );
      expect((await pending.loadAccountDeletionRequest())!.id, 'd1');

      final cancelled = repositoryWith(
        jsonRoutes({
          '/api/bootstrap': (
            200,
            {
              'deletionRequest': {'id': 'd1', 'status': 'cancelled'},
            },
          ),
        }),
      );
      expect(
        await cancelled.loadAccountDeletionRequest(),
        isNull,
        reason: '已取消的申请不应显示为进行中',
      );

      final broken = repositoryWith(
        MockClient((request) async => http.Response('{"error":{}}', 500)),
      );
      expect(
        await broken.loadAccountDeletionRequest(),
        isNull,
        reason: '读取类接口允许静默降级',
      );
    },
  );

  // ===== 登录会话 =====

  test('sessions are listed and revoked through the server', () async {
    final log = <String>[];
    final repository = repositoryWith(
      jsonRoutes({
        '/api/account/sessions': (
          200,
          {
            'sessions': [
              {
                'id': 'abc123',
                'createdAt': '2026-09-01T00:00:00.000Z',
                'expiresAt': '2026-10-01T00:00:00.000Z',
              },
            ],
          },
        ),
        '/api/account/sessions/abc123/revoke': (200, {'ok': true}),
      }, log: log),
    );
    final sessions = await repository.loadAccountSessions();
    expect(sessions, hasLength(1));
    expect(sessions.single.id, 'abc123');
    expect(sessions.single.createdAt, isNotNull);

    await repository.revokeAccountSession('abc123');
    expect(log, contains('POST /api/account/sessions/abc123/revoke'));
  });

  // ===== 内容举报 =====

  test(
    'reporting a local playable registers it first, then files the report',
    () async {
      final log = <String>[];
      final repository = repositoryWith(
        jsonRoutes({
          '/api/demo/mobile-playables': (
            200,
            {
              'mapping': {'plb_x': 'content_mobilearcade_plb_x'},
            },
          ),
          '/api/content-reports': (201, {'status': 'open'}),
        }, log: log),
      );
      final result = await repository.reportContent(
        playableKey: 'plb_x',
        title: 'X',
        reason: 'unsafe',
      );
      expect(result.alreadyReported, isFalse);
      expect(log, [
        'POST /api/demo/mobile-playables',
        'POST /api/content-reports',
      ]);
    },
  );

  test(
    'a server-side content is reported directly without registration',
    () async {
      final log = <String>[];
      final repository = repositoryWith(
        jsonRoutes({
          '/api/content-reports': (200, {'status': 'already_reported'}),
        }, log: log),
      );
      final result = await repository.reportContent(
        playableKey: 'content_abc',
        title: 'A',
        reason: 'spam',
      );
      expect(result.alreadyReported, isTrue);
      expect(log, ['POST /api/content-reports'], reason: '服务端内容无需再登记');
    },
  );

  test('an unresolvable playable refuses to file a report', () async {
    final repository = repositoryWith(
      jsonRoutes({
        '/api/demo/mobile-playables': (200, {'mapping': <String, String>{}}),
      }),
    );
    await expectLater(
      repository.reportContent(playableKey: 'k', title: 'K', reason: 'spam'),
      throwsA(isA<ApiException>()),
    );
  });

  // ===== 客服工单 =====

  test(
    'a support ticket is created and listed with its server status',
    () async {
      final repository = repositoryWith(
        jsonRoutes({
          '/api/support-tickets': (
            201,
            {
              'ticket': {
                'id': 'ticket_1',
                'category': 'bug',
                'subject': '功能异常·移动端',
                'status': 'open',
                'createdAt': '2026-09-11T00:00:00.000Z',
              },
            },
          ),
        }),
      );
      final ticket = await repository.createSupportTicket(
        category: 'bug',
        subject: '功能异常·移动端',
        body: '打开创作者中心时白屏',
      );
      expect(ticket.id, 'ticket_1');
      expect(ticket.status, 'open');
      expect(ticket.answered, isFalse);
    },
  );

  test('a replied ticket is marked answered', () async {
    final repository = repositoryWith(
      jsonRoutes({
        '/api/support-tickets': (
          200,
          {
            'tickets': [
              {
                'id': 't1',
                'category': 'bug',
                'subject': 'S',
                'body': 'B',
                'status': 'answered',
                'replyBody': '已修复，请更新到最新版本',
                'createdAt': '2026-09-11T00:00:00.000Z',
              },
            ],
          },
        ),
      }),
    );
    final tickets = await repository.loadSupportTickets();
    expect(tickets.single.answered, isTrue);
    expect(tickets.single.replyBody, '已修复，请更新到最新版本');
  });

  test(
    'a failed ticket submission throws instead of silently saving locally',
    () async {
      final repository = repositoryWith(
        MockClient((request) async => http.Response('{"error":{}}', 500)),
      );
      await expectLater(
        repository.createSupportTicket(
          category: 'bug',
          subject: 'S',
          body: 'B',
        ),
        throwsA(isA<ApiException>()),
      );
    },
  );

  // ===== 创作者资格 =====

  test('creator application reports server status and idempotency', () async {
    final fresh = repositoryWith(
      jsonRoutes({
        '/api/creator-applications': (
          201,
          {
            'application': {'id': 'app_1', 'status': 'kyc_pending'},
            'idempotent': false,
          },
        ),
      }),
    );
    final created = await fresh.submitCreatorApplication(
      applicationNote: '我长期运营互动内容并希望承接品牌 Campaign 交付工作。',
      regionCode: 'CN',
      kycConsent: true,
    );
    expect(created.id, 'app_1');
    expect(created.status, 'kyc_pending');
    expect(created.idempotent, isFalse);

    final repeat = repositoryWith(
      jsonRoutes({
        '/api/creator-applications': (
          200,
          {
            'application': {'id': 'app_1', 'status': 'under_review'},
            'idempotent': true,
          },
        ),
      }),
    );
    expect(
      (await repeat.submitCreatorApplication(
        applicationNote: '同上说明，长度足够满足服务端校验要求。',
        regionCode: 'CN',
        kycConsent: true,
      )).idempotent,
      isTrue,
    );
  });

  test(
    'a rejected creator application throws so the UI cannot advance',
    () async {
      final repository = repositoryWith(
        MockClient(
          (request) async => http.Response(
            jsonEncode({
              'error': {'code': 'application_note_required'},
            }),
            400,
          ),
        ),
      );
      await expectLater(
        repository.submitCreatorApplication(
          applicationNote: '太短',
          regionCode: 'CN',
          kycConsent: true,
        ),
        throwsA(isA<ApiException>()),
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
