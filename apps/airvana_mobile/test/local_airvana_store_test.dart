import 'package:airvana_mobile/core/config/app_environment.dart';
import 'package:airvana_mobile/core/network/airvana_api_client.dart';
import 'package:airvana_mobile/features/shared/data/airvana_repository.dart';
import 'package:airvana_mobile/features/shared/data/legacy_demo_catalog.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_models.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_store.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  late MemoryLocalAirvanaPersistence persistence;
  late _SequenceIds ids;
  late LocalAirvanaStore store;
  final publishedAt = DateTime.utc(2026, 8, 31, 8, 30);

  setUp(() {
    persistence = MemoryLocalAirvanaPersistence();
    ids = _SequenceIds();
    store = LocalAirvanaStore(
      persistence: persistence,
      ids: ids,
      clock: () => publishedAt,
    );
  });

  test(
    'persists draft workflow and atomically resumes stable task/version IDs',
    () async {
      final draft = await store.saveDraft(
        ownerId: 'local-owner',
        idea: '本机果园互动',
        deepMode: true,
        selectedPowerIds: const ['touch', 'timer', 'touch'],
        workflowState: const {
          'stage': 4,
          'questionIndex': 2,
          'answers': {'audience': '新用户'},
        },
        dataMode: LocalDataMode.demo,
      );
      final concurrentStarts = await Future.wait(
        List.generate(4, (_) => store.startOrResumeGeneration(draft.draftId)),
      );
      final task = concurrentStarts.first;
      final resumed = await store.startOrResumeGeneration(
        draft.draftId,
        taskId: task.taskId,
      );
      final recoveredWithoutUrl = await store.startOrResumeGeneration(
        draft.draftId,
      );

      expect(draft.draftId, 'draft_local_1');
      expect(draft.selectedPowerIds, ['touch', 'timer']);
      expect(task.taskId, 'task_local_2');
      expect(task.versionId, 'version_local_3');
      expect(concurrentStarts.map((item) => item.taskId).toSet(), {
        task.taskId,
      });
      expect(resumed.taskId, task.taskId);
      expect(recoveredWithoutUrl.versionId, task.versionId);

      final reopened = LocalAirvanaStore(
        persistence: persistence,
        ids: _SequenceIds(start: 50),
        clock: () => publishedAt,
      );
      final restoredDraft = await reopened.loadDraft(draft.draftId);
      final restoredTask = await reopened.loadGeneration(task.taskId);

      expect(restoredDraft?.workflowState['stage'], 4);
      expect(restoredDraft?.dataMode, LocalDataMode.demo);
      expect(restoredTask?.versionId, task.versionId);
    },
  );

  test(
    'pauses and resumes the same task/version but keeps cancel terminal',
    () async {
      final first = await _draft(store, idea: 'first');
      final second = await _draft(store, idea: 'second');
      final task = await store.startGeneration(first.draftId);

      expect(
        () =>
            store.startOrResumeGeneration(second.draftId, taskId: task.taskId),
        throwsA(isA<LocalStoreException>()),
      );

      final paused = await store.updateGeneration(
        task.taskId,
        LocalGenerationStatus.paused,
      );
      final recovered = await store.startOrResumeGeneration(first.draftId);
      final resumed = await store.updateGeneration(
        task.taskId,
        LocalGenerationStatus.running,
      );
      expect(paused.taskId, task.taskId);
      expect(recovered.versionId, task.versionId);
      expect(recovered.status, LocalGenerationStatus.paused);
      expect(resumed.taskId, task.taskId);
      expect(resumed.versionId, task.versionId);

      await store.updateGeneration(
        task.taskId,
        LocalGenerationStatus.cancelled,
      );
      expect(
        () =>
            store.updateGeneration(task.taskId, LocalGenerationStatus.running),
        throwsA(isA<LocalStoreException>()),
      );
    },
  );

  test(
    'appends immutable releases and keeps every release identity stable',
    () async {
      final draft = await _draft(store, idea: '果园合合塔');
      final firstTask = await store.startGeneration(draft.draftId);
      await store.updateGeneration(
        firstTask.taskId,
        LocalGenerationStatus.completed,
      );
      final first = await store.publishRelease(
        _releaseRequest(firstTask.taskId, title: '果园合合塔'),
      );
      final repeated = await store.publishRelease(
        _releaseRequest(firstTask.taskId, title: '不应覆盖的标题'),
      );

      expect(repeated.toJson(), first.toJson());
      expect(first.releaseId, startsWith('release_local_'));
      expect(first.playableId, startsWith('playable_local_'));
      expect(first.versionId, firstTask.versionId);
      expect(first.buildId, startsWith('build_local_'));
      expect(first.reviewId, startsWith('review_local_'));
      expect(first.publishedAt, publishedAt);
      expect(first.visibility, LocalVisibility.publicLocal);
      expect(first.remixPolicy, LocalRemixPolicy.disabled);
      expect(first.rollbackVersionId, isNull);
      expect(first.dataMode, LocalDataMode.local);
      expect(
        (await store.loadDraft(draft.draftId))?.status,
        LocalDraftStatus.publishedLocal,
      );

      final secondTask = await store.startOrResumeGeneration(
        draft.draftId,
        forceNew: true,
      );
      await store.updateGeneration(
        secondTask.taskId,
        LocalGenerationStatus.completed,
      );
      final second = await store.publishRelease(
        _releaseRequest(
          secondTask.taskId,
          title: '果园合合塔 v2',
          playableId: first.playableId,
        ),
      );

      expect(second.releaseId, isNot(first.releaseId));
      expect(second.playableId, first.playableId);
      expect(second.versionId, secondTask.versionId);
      expect(second.versionNumber, 2);
      expect(second.rollbackVersionId, first.versionId);
      final releases = await store.loadReleases(first.playableId);
      expect(releases.map((item) => item.title), ['果园合合塔', '果园合合塔 v2']);
    },
  );

  test('does not turn a failed local review into a release', () async {
    final draft = await _draft(store, idea: 'review gate');
    final task = await store.startGeneration(draft.draftId);
    await store.updateGeneration(task.taskId, LocalGenerationStatus.completed);

    expect(
      () => store.publishRelease(
        LocalReleaseRequest(
          generationTaskId: task.taskId,
          title: '本地作品',
          summary: '仅本机',
          contentType: 'game',
          authorName: 'Local Creator',
          visibility: LocalVisibility.privateLocal,
          remixPolicy: LocalRemixPolicy.disabled,
          localReviewPassed: false,
        ),
      ),
      throwsA(isA<LocalStoreException>()),
    );
    expect((await store.loadWorkspace()).releases, isEmpty);
  });

  test(
    'repository home and history read the same persisted local source',
    () async {
      final draft = await _draft(store, idea: '本机发布');
      final task = await store.startGeneration(draft.draftId);
      await store.updateGeneration(
        task.taskId,
        LocalGenerationStatus.completed,
      );
      final release = await store.publishRelease(
        _releaseRequest(task.taskId, title: '本机发布 Playable'),
      );
      final record = await store.recordExperience(
        playableId: release.playableId,
        versionId: release.versionId,
        title: release.title,
        status: 'completed',
        completedAt: publishedAt.add(const Duration(minutes: 1)),
      );
      final repository = _repository(store);

      final home = await repository.loadHome();
      final history = await repository.loadExperienceHistory();

      expect(home.playables.first.id, release.playableId);
      expect(home.playables.first.stage, 'LOCAL PUBLISHED');
      expect(home.playables.first.localDemo, isTrue);
      expect(history.single.id, record.recordId);
      expect(history.single.contentId, release.playableId);
      expect(history.single.version, 1);
      expect(history.single.localDemo, isTrue);
    },
  );

  test('experience rejects unknown playable and mismatched version', () async {
    final draft = await _draft(store, idea: '体验关联');
    final task = await store.startGeneration(draft.draftId);
    await store.updateGeneration(task.taskId, LocalGenerationStatus.completed);
    final release = await store.publishRelease(
      _releaseRequest(task.taskId, title: '体验关联 Playable'),
    );

    expect(
      () => store.recordExperience(
        playableId: 'playable_missing',
        versionId: release.versionId,
        title: release.title,
        status: 'completed',
      ),
      throwsA(isA<LocalStoreException>()),
    );
    expect(
      () => store.recordExperience(
        playableId: release.playableId,
        versionId: 'version_wrong',
        title: release.title,
        status: 'completed',
      ),
      throwsA(isA<LocalStoreException>()),
    );
  });

  test('repository records catalog-verified legacy demo identity', () async {
    final repository = _repository(store);
    final legacy = LegacyDemoCatalog.legacyWebPlayables.firstWhere(
      (item) => item.version > 1,
    );

    final record = await repository.recordPlayableExperience(
      legacy,
      status: 'completed',
      completedAt: publishedAt,
    );

    expect(record.playableId, legacy.id);
    expect(record.versionId, 'legacy_${legacy.id}_v${legacy.version}');
    expect(record.dataMode, LocalDataMode.demo);
    expect(
      (await repository.loadExperienceHistory()).single.version,
      legacy.version,
    );
  });

  test(
    'persists every settings feature state without upgrading authority',
    () async {
      const state = LocalProfileFeatureState(
        subscriptionPlanKey: 'creator_pro',
        subscriptionStatus: 'grace_period',
        campaignStage: 3,
        campaignPaused: true,
        governanceKillSwitch: true,
        governanceTab: 'risk',
        feedbackTickets: [
          {'id': 'feedback-1', 'body': '本机反馈记录'},
        ],
        uiLanguage: 'zh-CN',
        pushEnabled: false,
        themeMode: 'dark',
        identityNodeActive: true,
        productRoleView: 'player',
        networkProfile: 'weak',
      );

      await store.saveProfileFeatureState(state);
      final reopened = LocalAirvanaStore(
        persistence: persistence,
        ids: _SequenceIds(start: 50),
        clock: () => publishedAt,
      );
      final restored = await reopened.loadProfileFeatureState();

      expect(restored.subscriptionPlanKey, 'creator_pro');
      expect(restored.subscriptionStatus, 'grace_period');
      expect(restored.campaignStage, 3);
      expect(restored.campaignPaused, isTrue);
      expect(restored.governanceKillSwitch, isTrue);
      expect(restored.governanceTab, 'risk');
      expect(restored.feedbackTickets.single['id'], 'feedback-1');
      expect(restored.pushEnabled, isFalse);
      expect(restored.themeMode, 'dark');
      expect(restored.identityNodeActive, isTrue);
      expect(restored.productRoleView, 'player');
      expect(restored.networkProfile, 'weak');
    },
  );

  test('redeems a right with one atomic AIP ledger update', () async {
    final redeemed = await store.redeemProfileRight(
      rightId: 'theme',
      title: '创作主题包',
      cost: 180,
    );
    final duplicate = await store.redeemProfileRight(
      rightId: 'theme',
      title: '创作主题包',
      cost: 180,
    );
    final snapshot = await store.loadWorkspace();

    expect(redeemed.activeRightIds, ['theme']);
    expect(duplicate.activeRightIds, ['theme']);
    expect(snapshot.rewardState.aipBalance, 2300);
    expect(snapshot.profileFeatureState.rightsOrders, hasLength(1));
    expect(snapshot.walletTxns, hasLength(1));
    expect(snapshot.walletTxns.single.amount, -180);
    expect(snapshot.walletTxns.single.title, '兑换权益 · 创作主题包');
  });
}

Future<LocalDraft> _draft(LocalAirvanaStore store, {required String idea}) =>
    store.saveDraft(
      ownerId: 'local-owner',
      idea: idea,
      deepMode: false,
      selectedPowerIds: const ['touch'],
    );

LocalReleaseRequest _releaseRequest(
  String taskId, {
  required String title,
  String? playableId,
}) => LocalReleaseRequest(
  generationTaskId: taskId,
  title: title,
  summary: '可验证的本机摘要',
  contentType: 'game',
  authorName: 'Local Creator',
  visibility: LocalVisibility.publicLocal,
  remixPolicy: LocalRemixPolicy.disabled,
  localReviewPassed: true,
  playableId: playableId,
);

AirvanaRepository _repository(LocalAirvanaStore store) {
  final api = AirvanaApiClient(
    baseUri: Uri.parse('http://192.0.2.1:8082'),
    sessionStore: MemorySessionStore(),
    httpClient: MockClient((_) async => http.Response('offline', 503)),
  );
  return AirvanaRepository(
    api: api,
    environment: AppEnvironment(
      apiBaseUri: Uri.parse('http://192.0.2.1:8082'),
      demoLoginEnabled: false,
      preferLocalData: true,
    ),
    localStore: store,
  );
}

class _SequenceIds implements LocalIdGenerator {
  _SequenceIds({int start = 0}) : _value = start;

  int _value;

  @override
  String next(String prefix) => '${prefix}_${++_value}';
}
