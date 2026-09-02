import 'package:airvana_mobile/core/config/app_environment.dart';
import 'package:airvana_mobile/core/network/airvana_api_client.dart';
import 'package:airvana_mobile/features/create/application/create_workflow_repository.dart';
import 'package:airvana_mobile/features/shared/data/airvana_repository.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_store.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

class TestCreateWorkflowHarness {
  TestCreateWorkflowHarness() {
    final baseUri = Uri.parse('http://192.0.2.1:8082');
    repository = AirvanaRepository(
      api: AirvanaApiClient(
        baseUri: baseUri,
        sessionStore: MemorySessionStore(),
        httpClient: MockClient((_) async => http.Response('{}', 200)),
      ),
      environment: AppEnvironment(
        apiBaseUri: baseUri,
        demoLoginEnabled: false,
        preferLocalData: true,
      ),
      localStore: LocalAirvanaStore(
        persistence: MemoryLocalAirvanaPersistence(),
        ids: _TestIds(),
      ),
    );
    workflow = AirvanaCreateWorkflowRepository(repository);
  }

  late final AirvanaRepository repository;
  late final CreateWorkflowRepository workflow;
}

class _TestIds implements LocalIdGenerator {
  final Map<String, int> _sequences = {};

  @override
  String next(String prefix) {
    final sequence = (_sequences[prefix] ?? 0) + 1;
    _sequences[prefix] = sequence;
    return '${prefix}_test_$sequence';
  }
}
