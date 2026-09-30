import 'package:airvana_mobile/features/shared/data/local_airvana_store.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('清除本机业务数据保留个人资料与身份，清空业务对象', () async {
    final persistence = MemoryLocalAirvanaPersistence();
    final store = LocalAirvanaStore(persistence: persistence);

    await store.saveDraft(
      ownerId: 'owner_local',
      idea: '要被清掉的草稿',
      deepMode: false,
      selectedPowerIds: const [],
      workflowState: const {},
    );
    await store.saveProfile(displayName: 'Kai Chen', bio: '自定义简介');
    await store.setEngagement(
      playableId: 'plb_kol_town',
      eventType: 'save',
      active: true,
    );

    await store.clearBusinessData();
    final workspace = await store.loadWorkspace();

    expect(workspace.drafts, isEmpty);
    expect(workspace.experienceRecords, isEmpty);
    expect(workspace.socialState.savedPlayableIds, isEmpty);
    // 个人资料与身份不在清除范围内。
    expect(workspace.profileState.bio, '自定义简介');
    expect(workspace.identityState.creatorStatus, 'active_demo');
  });
}
