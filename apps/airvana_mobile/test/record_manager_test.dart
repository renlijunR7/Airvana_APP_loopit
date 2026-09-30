import 'package:airvana_mobile/features/shared/data/local_airvana_models.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_store.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late MemoryLocalAirvanaPersistence persistence;
  late LocalAirvanaStore store;

  Future<LocalDraft> seedDraft(String idea) => store.saveDraft(
    ownerId: 'owner_local',
    idea: idea,
    deepMode: false,
    selectedPowerIds: const [],
    workflowState: const {},
  );

  setUp(() {
    persistence = MemoryLocalAirvanaPersistence();
    store = LocalAirvanaStore(persistence: persistence);
  });

  test('草稿复制排在原草稿之后，且拿到新 id', () async {
    final first = await seedDraft('第一个想法');
    await seedDraft('第二个想法');
    final copy = await store.duplicateDraft(first.draftId);

    final workspace = await store.loadWorkspace();
    expect(copy.draftId, isNot(first.draftId));
    expect(copy.idea, '第一个想法');
    expect(workspace.drafts[1].draftId, copy.draftId);
  });

  test('草稿排序在边界处不越界', () async {
    final first = await seedDraft('A');
    final second = await seedDraft('B');

    await store.moveDraft(draftId: second.draftId, delta: -1);
    var workspace = await store.loadWorkspace();
    expect(workspace.drafts.first.draftId, second.draftId);

    // 已经在头部，再往前不应该报错也不应该改变顺序。
    await store.moveDraft(draftId: second.draftId, delta: -1);
    workspace = await store.loadWorkspace();
    expect(workspace.drafts.first.draftId, second.draftId);
    expect(workspace.drafts.last.draftId, first.draftId);
  });

  test('删除草稿进墓碑并可恢复', () async {
    final draft = await seedDraft('要删掉的草稿');
    var snapshot = await store.trashDraft(draft.draftId);
    expect(snapshot.drafts, isEmpty);
    expect(snapshot.draftTrash.single.draftId, draft.draftId);

    snapshot = await store.restoreDraft(draft.draftId);
    expect(snapshot.draftTrash, isEmpty);
    expect(snapshot.drafts.single.draftId, draft.draftId);
  });

  test('收藏夹与备注落盘，重复保存只保留一条', () async {
    await store.saveSavedRelation(
      playableId: 'plb_kol_town',
      collection: '安全教育',
      note: '给新人看',
    );
    final relations = await store.saveSavedRelation(
      playableId: 'plb_kol_town',
      collection: '',
      note: '  改过的备注  ',
    );
    expect(relations, hasLength(1));
    // 空收藏夹回落到默认值，备注去掉首尾空格。
    expect(relations.single.collection, '默认收藏');
    expect(relations.single.note, '改过的备注');
  });

  test('体验记录支持单条删除、按作品清除与全部清空', () async {
    for (final id in ['plb_a', 'plb_a', 'plb_b']) {
      await store.recordExperience(
        playableId: id,
        versionId: 'legacy_${id}_v1',
        title: id,
        status: 'completed',
        dataMode: LocalDataMode.demo,
        allowLegacyDemo: true,
      );
    }
    var workspace = await store.loadWorkspace();
    expect(workspace.experienceRecords, hasLength(3));

    final target = workspace.experienceRecords.first.recordId;
    var records = await store.deleteExperienceRecord(target);
    expect(records, hasLength(2));

    records = await store.clearContentRuns('plb_a');
    expect(records.every((item) => item.playableId == 'plb_b'), isTrue);

    records = await store.clearAllRuns();
    expect(records, isEmpty);
  });
}
