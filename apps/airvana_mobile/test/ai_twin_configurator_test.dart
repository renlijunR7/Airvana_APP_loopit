import 'package:airvana_mobile/features/ai_twin/presentation/ai_twin_configurator.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_models.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_store.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('人物定位、角色库与自定义造型的取值与 Web 一致', () {
    expect(AiTwinConfigurator.positions.map((item) => item.$1), [
      'host',
      'idol',
      'game',
      'advisor',
    ]);
    expect(AiTwinConfigurator.positions.first.$3, '数字主播 / 客服型');
    expect(AiTwinConfigurator.styles.map((item) => item.$1), [
      'custom',
      'hyperreal',
      'semireal',
      'anime',
      'cyber',
    ]);
    expect(AiTwinConfigurator.customStyles.map((item) => item.$2), [
      '精致 CG',
      '潮流二次元',
      '赛博科技',
    ]);
    expect(AiTwinConfigurator.customLooks.map((item) => item.$2), [
      'Web3 游戏',
      '专业讲解',
      '潮流街头',
    ]);
    expect(AiTwinConfigurator.customMotions.map((item) => item.$2), [
      '自然讲解',
      '问候挥手',
      '指向作品',
    ]);
  });

  test('configurator 的选择落盘，冷启动后保留', () async {
    final persistence = MemoryLocalAirvanaPersistence();
    final store = LocalAirvanaStore(persistence: persistence);

    final initial = await store.loadWorkspace();
    expect(initial.aiTwinState.position, 'host');
    expect(initial.aiTwinState.visualStyle, 'hyperreal');
    expect(initial.aiTwinState.scenes, ['主分身']);

    await store.saveAiTwinState(
      initial.aiTwinState.copyWith(
        position: 'game',
        visualStyle: 'anime',
        customStyle: 'cyber',
        customSaved: true,
        scenes: ['主分身', '场景分身 1'],
      ),
    );

    final reopened = LocalAirvanaStore(persistence: persistence);
    final twin = (await reopened.loadWorkspace()).aiTwinState;
    expect(twin.position, 'game');
    expect(twin.visualStyle, 'anime');
    expect(twin.customStyle, 'cyber');
    expect(twin.customSaved, isTrue);
    expect(twin.scenes, ['主分身', '场景分身 1']);
    // 未设置的字段保持 Web 默认值。
    expect(twin.customLook, 'game');
    expect(twin.copyProfileOnCreate, isTrue);
  });
}
