import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/core/config/app_environment.dart';
import 'package:airvana_mobile/core/network/airvana_api_client.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/runtime/presentation/generated_playable_runtime.dart';
import 'package:airvana_mobile/features/runtime/presentation/playable_runtime_screen.dart';
import 'package:airvana_mobile/features/shared/data/airvana_repository.dart';
import 'package:airvana_mobile/features/shared/data/legacy_demo_catalog.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_models.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_store.dart';
import 'package:airvana_mobile/features/shared/domain/airvana_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  testWidgets(
    'all 38 legacy runtime entries render the common local demo structure',
    (tester) async {
      tester.view.physicalSize = const Size(430, 932);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final repository = _repository(_memoryStore());
      for (final playable in LegacyDemoCatalog.legacyWebPlayables) {
        await tester.pumpWidget(
          _runtimeHarness(playable, repository: repository),
        );
        await tester.pump();

        expect(find.text(playable.title), findsWidgets);
        expect(find.textContaining('LOCAL DEMO'), findsWidgets);
        expect(find.byKey(const ValueKey('runtime-start')), findsOneWidget);
        expect(
          find.byKey(ValueKey('runtime-author-${playable.id}')),
          findsOneWidget,
        );
        expect(find.textContaining('不代表服务端发放'), findsOneWidget);
        expect(tester.takeException(), isNull);
      }
    },
  );

  testWidgets(
    'local runtime completes three interactive stages without a server',
    (tester) async {
      tester.view.physicalSize = const Size(430, 932);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final store = _memoryStore();
      await tester.pumpWidget(
        _runtimeHarness(
          LegacyDemoCatalog.playables.first,
          repository: _repository(store),
        ),
      );
      await tester.pump();
      expect(find.text('开始完整试玩'), findsOneWidget);

      await tester.tap(find.byKey(const ValueKey('runtime-start')));
      await tester.pump();
      for (var i = 0; i < 3; i += 1) {
        await tester.tap(find.text('执行高亮操作'));
        await tester.pump();
      }

      expect(find.text('挑战完成'), findsOneWidget);
      await tester.pumpAndSettle();
      expect(find.textContaining('体验记录已保存到本机'), findsOneWidget);
      final records = (await store.loadWorkspace()).experienceRecords;
      expect(records, hasLength(1));
      expect(records.single.playableId, LegacyDemoCatalog.playables.first.id);
      expect(
        records.single.versionId,
        'legacy_${LegacyDemoCatalog.playables.first.id}_v${LegacyDemoCatalog.playables.first.version}',
      );
    },
  );

  testWidgets('orchard runtime keeps the legacy six-round fruit merge loop', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(430, 932);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final orchard = LegacyDemoCatalog.legacyWebPlayables.firstWhere(
      (item) => item.id == 'plb_orchard_merge',
    );
    await tester.pumpWidget(
      _runtimeHarness(orchard, repository: _repository(_memoryStore())),
    );

    expect(find.text('果园合合塔 Orchard Merge'), findsOneWidget);
    expect(find.text('开始合成'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('runtime-start')));
    await tester.pump();

    for (var round = 1; round <= 6; round += 1) {
      expect(find.text('$round/6'), findsOneWidget);
      final target = find.bySemanticsLabel(RegExp('当前目标'));
      expect(target, findsOneWidget);
      await tester.tap(target);
      await tester.pump();
    }

    expect(find.text('果园合成完成'), findsOneWidget);
    expect(find.textContaining('本局得分 6 / 6'), findsOneWidget);
  });

  testWidgets('orchard failure can retry immediately', (tester) async {
    tester.view.physicalSize = const Size(430, 932);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final orchard = LegacyDemoCatalog.legacyWebPlayables.firstWhere(
      (item) => item.id == 'plb_orchard_merge',
    );
    await tester.pumpWidget(
      _runtimeHarness(orchard, repository: _repository(_memoryStore())),
    );
    await tester.tap(find.byKey(const ValueKey('runtime-start')));
    await tester.pump();

    for (var attempt = 0; attempt < 3; attempt += 1) {
      await tester.tap(find.bySemanticsLabel('青苹果').first);
      await tester.pump();
    }

    expect(find.text('果箱暂时满了'), findsOneWidget);
    expect(find.text('立即重试'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('runtime-retry')));
    await tester.pump();
    expect(find.text('1/6'), findsOneWidget);
    expect(find.text('SCORE 0  ·  机会 3'), findsOneWidget);
  });

  testWidgets(
    'all complete and deep generated games use dedicated playable scenes',
    (tester) async {
      tester.view.physicalSize = const Size(360, 800);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      for (final profile in generatedGameProfiles.values) {
        final playable = LegacyDemoCatalog.legacyWebPlayables.firstWhere(
          (item) => item.id == profile.playableId,
        );
        await tester.pumpWidget(
          _runtimeHarness(playable, repository: _repository(_memoryStore())),
        );
        await tester.pump();
        await tester.tap(find.byKey(const ValueKey('runtime-start')));
        await tester.pump();

        expect(
          find.byKey(ValueKey('runtime-generated-scene-${profile.playableId}')),
          findsOneWidget,
        );
        for (var index = 0; index < profile.choices.length; index += 1) {
          expect(
            find.byKey(
              ValueKey('runtime-generated-choice-${profile.playableId}-$index'),
            ),
            findsOneWidget,
          );
        }
        expect(
          tester.takeException(),
          isNull,
          reason: '${profile.playableId} overflowed at 360x800',
        );

        for (var round = 0; round < profile.rounds; round += 1) {
          final target = find.bySemanticsLabel(RegExp('当前目标'));
          expect(target, findsOneWidget);
          await tester.tap(target);
          await tester.pump();
        }

        expect(find.text(profile.successTitle), findsOneWidget);
        expect(find.byKey(const ValueKey('runtime-retry')), findsOneWidget);
        expect(
          find.byKey(const ValueKey('runtime-result-exit')),
          findsOneWidget,
        );
        await tester.pumpWidget(const SizedBox.shrink());
        await tester.pump();
      }
    },
  );

  testWidgets('microbe arena supports failure and immediate retry', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(430, 932);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final profile = generatedGameProfiles['plb_microbe_arena']!;
    final playable = LegacyDemoCatalog.legacyWebPlayables.firstWhere(
      (item) => item.id == profile.playableId,
    );
    await tester.pumpWidget(
      _runtimeHarness(playable, repository: _repository(_memoryStore())),
    );
    await tester.tap(find.byKey(const ValueKey('runtime-start')));
    await tester.pump();

    for (final wrongChoice in const [1, 0, 0]) {
      await tester.tap(
        find.byKey(
          ValueKey(
            'runtime-generated-choice-${profile.playableId}-$wrongChoice',
          ),
        ),
      );
      await tester.pump();
    }

    expect(find.text(profile.failureTitle), findsOneWidget);
    expect(find.text('立即重试'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('runtime-retry')));
    await tester.pump();
    expect(
      find.byKey(const ValueKey('runtime-generated-scene-plb_microbe_arena')),
      findsOneWidget,
    );
    expect(find.text('1/3'), findsOneWidget);
    expect(find.text('SCORE 0  ·  机会 3'), findsOneWidget);
  });

  testWidgets(
    'published local runtime keeps playable/version identity and records one terminal result',
    (tester) async {
      tester.view.physicalSize = const Size(430, 932);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final store = _memoryStore();
      var historyLoads = 0;
      final draft = await store.saveDraft(
        ownerId: LegacyDemoCatalog.user.id,
        idea: '本机跳跃挑战',
        deepMode: false,
        selectedPowerIds: const ['touchControls'],
      );
      final task = await store.startGeneration(draft.draftId);
      await store.updateGeneration(
        task.taskId,
        LocalGenerationStatus.completed,
      );
      final release = await store.publishRelease(
        LocalReleaseRequest(
          generationTaskId: task.taskId,
          title: '本机跳跃挑战',
          summary: '三阶段本机互动',
          contentType: 'game',
          authorName: LegacyDemoCatalog.user.displayName,
          visibility: LocalVisibility.publicLocal,
          remixPolicy: LocalRemixPolicy.disabled,
          localReviewPassed: true,
        ),
      );
      final playable = Playable(
        id: release.playableId,
        title: release.title,
        authorName: release.authorName,
        contentType: release.contentType,
        version: release.versionNumber,
        summary: release.summary,
      );

      await tester.pumpWidget(
        _runtimeHarness(
          playable,
          repository: _repository(store),
          onHistoryLoad: () => historyLoads += 1,
        ),
      );
      await tester.pump();
      expect(
        find.byKey(ValueKey('runtime-cover-fallback-${release.playableId}')),
        findsOneWidget,
      );

      await tester.tap(find.byKey(const ValueKey('runtime-start')));
      await tester.pump();
      for (var i = 0; i < 3; i += 1) {
        await tester.tap(find.text('执行高亮操作'));
        await tester.pump();
      }
      await tester.pumpAndSettle();

      expect(find.textContaining('体验记录已保存到本机'), findsOneWidget);
      var records = (await store.loadWorkspace()).experienceRecords;
      expect(records, hasLength(1));
      expect(records.single.playableId, release.playableId);
      expect(records.single.versionId, release.versionId);
      expect(records.single.status, 'completed');
      expect(historyLoads, 2);

      await tester.pump(const Duration(milliseconds: 200));
      records = (await store.loadWorkspace()).experienceRecords;
      expect(records, hasLength(1));
    },
  );

  testWidgets('runtime social actions expose semantics and local feedback', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(430, 932);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final messenger =
        TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
    messenger.setMockMethodCallHandler(
      SystemChannels.platform,
      (_) async => null,
    );
    addTearDown(
      () => messenger.setMockMethodCallHandler(SystemChannels.platform, null),
    );

    final orchard = LegacyDemoCatalog.legacyWebPlayables.firstWhere(
      (item) => item.id == 'plb_orchard_merge',
    );
    await tester.pumpWidget(
      _runtimeHarness(orchard, repository: _repository(_memoryStore())),
    );

    await tester.tap(find.bySemanticsLabel('点赞 ${orchard.title}'));
    await tester.pump();
    expect(find.bySemanticsLabel('取消点赞 ${orchard.title}'), findsOneWidget);

    await tester.tap(find.bySemanticsLabel('分享 ${orchard.title}'));
    await tester.pumpAndSettle();
    expect(find.bySemanticsLabel('分享 Playable'), findsOneWidget);
    expect(find.byKey(const ValueKey('share-action-grid')), findsOneWidget);
    expect(find.text('已分享'), findsNothing);
    await tester.tap(find.byKey(const ValueKey('share-action-copy')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 800));
    expect(find.text('分享链接已复制；当前仅记录复制行为'), findsOneWidget);

    await tester.tap(find.bySemanticsLabel('关注 ${orchard.authorName}'));
    await tester.pump();
    expect(
      find.bySemanticsLabel('管理对 ${orchard.authorName} 的关注'),
      findsOneWidget,
    );

    await tester.tap(find.bySemanticsLabel('查看 ${orchard.title} 的评论'));
    await tester.pumpAndSettle();
    expect(find.text('2 条评论'), findsOneWidget);
    await tester.enterText(
      find.byKey(const ValueKey('comment-input')),
      '运行页本地评论',
    );
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('comment-submit')));
    await tester.pump();
    expect(find.text('3 条评论'), findsOneWidget);
    await tester.tap(find.byTooltip('关闭评论'));
    await tester.pumpAndSettle();
    final commentAction = find.bySemanticsLabel('查看 ${orchard.title} 的评论');
    expect(
      find.descendant(of: commentAction, matching: find.text('1')),
      findsOneWidget,
    );

    await tester.tap(
      find.bySemanticsLabel('基于 ${orchard.title} 创建受控 Remix 草稿'),
    );
    await tester.pumpAndSettle();
    expect(find.text('创建 Remix 草稿'), findsOneWidget);
    expect(find.text('仅复用互动结构'), findsOneWidget);
    expect(find.textContaining('受控 Remix'), findsWidgets);
    expect(find.text('创建受控 Remix 草稿'), findsOneWidget);
  });
}

LocalAirvanaStore _memoryStore() =>
    LocalAirvanaStore(persistence: MemoryLocalAirvanaPersistence());

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

Widget _runtimeHarness(
  Playable playable, {
  required AirvanaRepository repository,
  VoidCallback? onHistoryLoad,
}) => ProviderScope(
  overrides: [
    airvanaRepositoryProvider.overrideWithValue(repository),
    if (onHistoryLoad != null)
      experienceHistoryProvider.overrideWith((_) {
        onHistoryLoad();
        return repository.loadExperienceHistory();
      }),
  ],
  child: MaterialApp(
    theme: buildAirvanaTheme(),
    home: Stack(
      children: [
        PlayableRuntimeScreen(playable: playable),
        if (onHistoryLoad != null)
          Offstage(
            child: Consumer(
              builder: (_, ref, __) {
                ref.watch(experienceHistoryProvider);
                return const SizedBox.shrink();
              },
            ),
          ),
      ],
    ),
  ),
);
