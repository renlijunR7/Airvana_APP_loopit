import 'dart:convert';

import 'package:airvana_mobile/core/config/app_environment.dart';
import 'package:airvana_mobile/core/network/airvana_api_client.dart';
import 'package:airvana_mobile/features/shared/data/airvana_repository.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_store.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

/// 退出登录必须真正生效。
///
/// 此前的缺陷：`_ensureLocalDemoSession` 把「没有 Cookie」一律当成
/// 「还没登录过」，于是退出后**下一个服务端请求就会静默登回去**，
/// 用户完全看不出退出生效过。
void main() {
  final baseUri = Uri.parse('http://192.0.2.1:8082');

  ({
    AirvanaRepository repository,
    MemorySessionStore store,
    List<String> log,
    MemoryLocalAirvanaPersistence disk,
  })
  build({MemoryLocalAirvanaPersistence? persistence}) {
    final log = <String>[];
    final store = MemorySessionStore();
    final disk = persistence ?? MemoryLocalAirvanaPersistence();
    return (
      repository: AirvanaRepository(
        api: AirvanaApiClient(
          baseUri: baseUri,
          sessionStore: store,
          httpClient: MockClient((request) async {
            log.add('${request.method} ${request.url.path}');
            return http.Response(
              jsonEncode({
                'ok': true,
                // 登录类接口需要合法的 me 才算成功
                'me': {'id': 'usr_1', 'displayName': 'Kai', 'role': 'creator'},
              }),
              200,
              headers: const {
                'content-type': 'application/json; charset=utf-8',
              },
            );
          }),
        ),
        environment: AppEnvironment(
          apiBaseUri: baseUri,
          // 关键：演示登录是开着的，正是它导致退出被撤销
          demoLoginEnabled: true,
          preferLocalData: true,
        ),
        localStore: LocalAirvanaStore(persistence: disk, ids: _Ids()),
      ),
      store: store,
      log: log,
      disk: disk,
    );
  }

  test('without a prior sign-out, a demo session is still created', () async {
    final built = build();
    await built.repository.reportContent(
      playableKey: 'content_x',
      title: 'X',
      reason: 'spam',
    );
    expect(built.log.first, 'POST /api/auth/demo', reason: '从没登录过时仍可自动建演示会话');
  });

  test(
    'after signing out, no request may silently sign the user back in',
    () async {
      final built = build();
      await built.repository.signOut();
      expect(await built.repository.signedOut, isTrue);
      built.log.clear();

      // 举报是写入类：必须抛出可识别的未登录错误
      await expectLater(
        built.repository.reportContent(
          playableKey: 'content_x',
          title: 'X',
          reason: 'spam',
        ),
        throwsA(isA<SignedOutException>()),
      );
      expect(
        built.log.where((entry) => entry.contains('/api/auth/demo')),
        isEmpty,
        reason: '退出后绝不能自动登回去',
      );
      expect(await built.store.readCookie(), isNull);
    },
  );

  test(
    'read-only surfaces degrade instead of throwing after sign-out',
    () async {
      final built = build();
      await built.repository.signOut();
      built.log.clear();

      // 读取类：静默降级，本地演示照常可用
      expect(
        (await built.repository.loadCreatorCenter()).serverConnected,
        isFalse,
      );
      expect((await built.repository.loadMinorModePolicy()).enabled, isFalse);
      expect(await built.repository.loadServerAiTwin(), isNull);
      expect(await built.repository.loadAccountDeletionRequest(), isNull);
      expect(
        built.log.where((entry) => entry.contains('/api/auth/demo')),
        isEmpty,
      );
    },
  );

  test('the sign-out flag survives an app restart', () async {
    final disk = MemoryLocalAirvanaPersistence();
    await build(persistence: disk).repository.signOut();

    // 全新仓储实例 = 冷启动
    final restarted = build(persistence: disk);
    expect(
      await restarted.repository.signedOut,
      isTrue,
      reason: '重启后仍处于已退出状态，否则冷启动会把用户登回去',
    );
    await expectLater(
      restarted.repository.boostContent('c1'),
      throwsA(isA<SignedOutException>()),
    );
  });

  test('signing in again clears the flag and restores server access', () async {
    final built = build();
    await built.repository.signOut();
    expect(await built.repository.signedOut, isTrue);

    await built.repository.verifyEmailLoginCode(
      email: 'kai@airvana.test',
      code: '123456',
    );
    expect(await built.repository.signedOut, isFalse);

    built.log.clear();
    await built.repository.reportContent(
      playableKey: 'content_x',
      title: 'X',
      reason: 'spam',
    );
    expect(
      built.log.any((entry) => entry.contains('/api/content-reports')),
      isTrue,
      reason: '重新登录后服务端能力恢复',
    );
  });

  test('a failed sign-in must not lift the signed-out state', () async {
    // 顺序陷阱：先清标记再解析结果的话，一次失败的登录会让自动演示登录复活。
    final store = MemorySessionStore();
    final repository = AirvanaRepository(
      api: AirvanaApiClient(
        baseUri: baseUri,
        sessionStore: store,
        httpClient: MockClient(
          (request) async => http.Response(
            jsonEncode({'created': true}), // 没有 me
            200,
            headers: const {'content-type': 'application/json; charset=utf-8'},
          ),
        ),
      ),
      environment: AppEnvironment(
        apiBaseUri: baseUri,
        demoLoginEnabled: true,
        preferLocalData: true,
      ),
      localStore: LocalAirvanaStore(
        persistence: MemoryLocalAirvanaPersistence(),
        ids: _Ids(),
      ),
    );
    await repository.signOut();
    await expectLater(
      repository.verifyEmailLoginCode(email: 'a@b.com', code: '1'),
      throwsA(isA<ApiException>()),
    );
    expect(await repository.signedOut, isTrue, reason: '登录没成功，退出状态必须保持');
  });

  test('the google adapter also clears the flag', () async {
    final built = build();
    await built.repository.signOut();
    await built.repository.signInWithGoogleLocalAdapter(
      email: 'kai@airvana.test',
    );
    expect(await built.repository.signedOut, isFalse);
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
