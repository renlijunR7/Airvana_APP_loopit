import 'package:airvana_mobile/core/config/app_environment.dart';
import 'package:airvana_mobile/core/network/airvana_api_client.dart';
import 'package:airvana_mobile/features/create/application/create_workflow_repository.dart';
import 'package:airvana_mobile/features/shared/data/airvana_repository.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_store.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

class TestCreateWorkflowHarness {
  /// [httpClient] 缺省时所有服务端请求都回空对象——读取类接口按「无数据」
  /// 呈现，写入类接口（登录等）会因为拿不到期望字段而报错。要演一次
  /// 成功登录，就传一个按路径应答的 MockClient 进来。
  TestCreateWorkflowHarness({http.Client? httpClient}) {
    final baseUri = Uri.parse('http://192.0.2.1:8082');
    repository = AirvanaRepository(
      api: AirvanaApiClient(
        baseUri: baseUri,
        sessionStore: MemorySessionStore(),
        httpClient:
            httpClient ?? MockClient((_) async => http.Response('{}', 200)),
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

  /// 关掉「消息提醒」启动弹窗。
  ///
  /// 进入主应用 720ms 后它会盖住整屏并吞掉点击，断言主应用行为的 widget 测试
  /// 得先把它关掉——用的是设置页里那个真实开关，而不是测试专用的后门。
  /// 弹窗本身的行为由 test/startup_popup_gate_test.dart 单独覆盖。
  Future<void> disableStartupPopups() async {
    final state = await repository.loadLocalProfileFeatureState();
    await repository.saveLocalProfileFeatureState(
      state.copyWith(popupStates: {...state.popupStates, 'message': false}),
    );
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
