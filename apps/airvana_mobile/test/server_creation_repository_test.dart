import 'dart:convert';

import 'package:airvana_mobile/core/config/app_environment.dart';
import 'package:airvana_mobile/core/network/airvana_api_client.dart';
import 'package:airvana_mobile/features/shared/data/airvana_repository.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  test(
    'server creation resumes worker review and publishes only after artifact approval',
    () async {
      final calls = <String>[];
      final session = MemorySessionStore()
        ..value = 'airvana_session=test-session';
      final client = AirvanaApiClient(
        baseUri: Uri.parse('http://192.0.2.1:8082'),
        sessionStore: session,
        httpClient: MockClient((request) async {
          calls.add('${request.method} ${request.url.path}');
          if (request.method == 'GET' && request.url.path == '/api/bootstrap') {
            return _json({
              'agents': [
                {'id': 'agent_1', 'status': 'active', 'contentType': 'all'},
              ],
            });
          }
          if (request.method == 'POST' && request.url.path == '/api/tasks') {
            return _json({
              'task': {
                'id': 'task_1',
                'contentId': 'content_1',
                'status': 'queued',
                'progress': 0,
              },
              'content': {
                'id': 'content_1',
                'title': '服务端互动挑战',
                'status': 'generating',
                'currentVersion': 0,
              },
            }, status: 202);
          }
          if (request.method == 'GET' &&
              request.url.path == '/api/tasks/task_1') {
            return _json({
              'task': {
                'id': 'task_1',
                'contentId': 'content_1',
                'status': 'review_pending',
                'progress': 100,
              },
              'content': {
                'id': 'content_1',
                'title': '服务端互动挑战',
                'status': 'review_pending',
                'currentVersion': 0,
              },
            });
          }
          if (request.method == 'POST' &&
              request.url.path == '/api/tasks/task_1/review') {
            return _json({
              'task': {
                'id': 'task_1',
                'contentId': 'content_1',
                'status': 'approved',
                'progress': 100,
              },
              'content': {
                'id': 'content_1',
                'title': '服务端互动挑战',
                'status': 'draft',
                'currentVersion': 1,
              },
            });
          }
          if (request.method == 'POST' &&
              request.url.path == '/api/contents/content_1/publish') {
            return _json({
              'content': {
                'id': 'content_1',
                'title': '服务端互动挑战',
                'status': 'published',
                'currentVersion': 1,
              },
            });
          }
          return _json({
            'error': {'message': '未预期的请求'},
          }, status: 500);
        }),
      );
      final repository = AirvanaRepository(
        api: client,
        environment: AppEnvironment(
          apiBaseUri: Uri.parse('http://192.0.2.1:8082'),
          demoLoginEnabled: false,
          localFallbackEnabled: false,
          preferLocalData: false,
        ),
      );

      final release = await repository.publishServerPlayable(
        title: '服务端互动挑战',
        prompt: '一个完整三阶段互动挑战，包含成功、失败、重试和退出路径。',
        deepMode: false,
        idempotencyKey: 'flutter-draft-1',
      );

      expect(release.contentId, 'content_1');
      expect(release.taskId, 'task_1');
      expect(release.version, 1);
      expect(calls, [
        'GET /api/bootstrap',
        'POST /api/tasks',
        'GET /api/tasks/task_1',
        'POST /api/tasks/task_1/review',
        'POST /api/contents/content_1/publish',
      ]);
    },
  );

  test(
    'deep creation is blocked before any server call without Campaign Contract',
    () async {
      var called = false;
      final repository = AirvanaRepository(
        api: AirvanaApiClient(
          baseUri: Uri.parse('http://192.0.2.1:8082'),
          sessionStore: MemorySessionStore(),
          httpClient: MockClient((_) async {
            called = true;
            return _json({});
          }),
        ),
        environment: AppEnvironment(
          apiBaseUri: Uri.parse('http://192.0.2.1:8082'),
          demoLoginEnabled: false,
          localFallbackEnabled: false,
          preferLocalData: false,
        ),
      );

      await expectLater(
        repository.publishServerPlayable(
          title: 'Campaign Playable',
          prompt: '应被 Contract 门禁阻止的深度创作。',
          deepMode: true,
          idempotencyKey: 'flutter-deep-1',
        ),
        throwsA(isA<ApiException>()),
      );
      expect(called, isFalse);
    },
  );
}

http.Response _json(Map<String, dynamic> body, {int status = 200}) =>
    http.Response(
      jsonEncode(body),
      status,
      headers: {'content-type': 'application/json'},
    );
