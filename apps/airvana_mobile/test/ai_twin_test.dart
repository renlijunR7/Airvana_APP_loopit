import 'package:airvana_mobile/features/shared/data/local_airvana_store.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('ai twin state machine persists and appends audit entries', () async {
    final persistence = MemoryLocalAirvanaPersistence();
    final store = LocalAirvanaStore(
      persistence: persistence,
      clock: () => DateTime(2026, 9, 1, 12),
    );

    final initial = await store.loadAiTwinState();
    expect(initial.status, 'not_created');
    expect(initial.audit, isEmpty);

    var state = await store.saveAiTwinState(
      initial.copyWith(status: 'configuring', name: 'Kai 分身'),
      auditTitle: '创建 AI 分身草稿',
    );
    state = await store.saveAiTwinState(
      state.copyWith(status: 'testing'),
      auditTitle: '进入本地沙盒测试',
    );
    state = await store.saveAiTwinState(
      state.copyWith(status: 'active_demo'),
      auditTitle: '启用 AI 分身前端演示',
    );

    expect(state.status, 'active_demo');
    expect(state.audit, hasLength(3));
    expect(state.audit.first.title, '启用 AI 分身前端演示');

    // 持久化可恢复
    final reloaded = await LocalAirvanaStore(
      persistence: persistence,
    ).loadAiTwinState();
    expect(reloaded.status, 'active_demo');
    expect(reloaded.name, 'Kai 分身');
    expect(reloaded.audit, hasLength(3));
  });

  // The new end-to-end local workbench is covered by twin_demo_test.dart.
}
