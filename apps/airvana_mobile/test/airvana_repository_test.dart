import 'package:airvana_mobile/core/config/app_environment.dart';
import 'package:airvana_mobile/core/network/airvana_api_client.dart';
import 'package:airvana_mobile/features/shared/data/airvana_repository.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  late AirvanaRepository repository;

  setUp(() {
    final client = AirvanaApiClient(
      baseUri: Uri.parse('http://192.0.2.1:8082'),
      sessionStore: MemorySessionStore(),
      httpClient: MockClient((_) async => http.Response('offline', 503)),
    );
    repository = AirvanaRepository(
      api: client,
      environment: AppEnvironment(
        apiBaseUri: Uri.parse('http://192.0.2.1:8082'),
        demoLoginEnabled: true,
        localFallbackEnabled: true,
        preferLocalData: true,
      ),
    );
  });

  test('falls back to explicitly labelled local home data', () async {
    final snapshot = await repository.loadHome();

    expect(snapshot.localDemo, isTrue);
    expect(snapshot.user.displayName, 'Kai Chen');
    expect(snapshot.playables, hasLength(38));
    expect(snapshot.playables.every((item) => item.localDemo), isTrue);
  });

  test('keeps the legacy Web initial experience history empty', () async {
    final records = await repository.loadExperienceHistory();

    expect(records, isEmpty);
  });

  test('uses the fresh Web profile social baseline in local mode', () async {
    final account = await repository.loadAccount();

    expect(account.likesReceived, 0);
    expect(account.followerCount, 0);
    expect(account.followingCount, 0);
    expect(account.allowances['light_creation']?.remaining, 3);
  });

  test('defaults to the Web-compatible local presentation mode', () {
    final environment = AppEnvironment(
      apiBaseUri: Uri.parse('http://127.0.0.1:8082'),
      demoLoginEnabled: true,
    );

    expect(environment.preferLocalData, isTrue);
  });
}
