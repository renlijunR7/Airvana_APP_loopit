import 'package:airvana_mobile/app/app_router.dart';
import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/create/application/create_route_state.dart';
import 'package:airvana_mobile/features/create/presentation/create_playable_screen.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_store.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/test_create_workflow.dart';

void main() {
  test('create URL round-trips canonical draft task version and remix IDs', () {
    final route = CreateRouteState.fromUri(
      Uri.parse(
        '/create?draft_id=draft%2F7&task_id=task-9&version_id=version-3&remix=plb_source',
      ),
    );

    expect(route.draftId, 'draft/7');
    expect(route.taskId, 'task-9');
    expect(route.versionId, 'version-3');
    expect(route.remixSourceId, 'plb_source');
    expect(CreateRouteState.fromUri(route.uri), route);
  });

  testWidgets('legacy default idea migrates to the brand creation prompt', (
    tester,
  ) async {
    final harness = TestCreateWorkflowHarness();
    final draft = await harness.workflow.saveDraft(
      idea: '帮我创作一个可爱卡通风格的跳一跳游戏，长按蓄力，适合单手操作。',
      deepMode: true,
      selectedPowerIds: const ['touchControls'],
      workflowState: const {},
    );

    await tester.pumpWidget(
      MaterialApp(
        theme: buildAirvanaTheme(),
        home: CreatePlayableScreen(
          workflowRepository: harness.workflow,
          routeState: CreateRouteState(draftId: draft.draftId),
        ),
      ),
    );
    await tester.pumpAndSettle();

    final input = tester.widget<TextField>(
      find.byKey(const ValueKey('legacy-composer-input')),
    );
    expect(input.controller!.text, '描述品牌目标和游戏创意，创作一个 Agentic\u00A0Playable');
  });

  testWidgets(
    'runtime deep link resolves contentId from repository without extra',
    (tester) async {
      final harness = TestCreateWorkflowHarness();
      final router = buildAirvanaRouter(
        initialLocation: '/runtime/plb_orchard_merge',
      );
      addTearDown(router.dispose);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            airvanaRepositoryProvider.overrideWithValue(harness.repository),
          ],
          child: MaterialApp.router(
            theme: buildAirvanaTheme(),
            routerConfig: router,
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.textContaining('果园合合塔 Orchard Merge'), findsWidgets);
      expect(find.textContaining('缺少 Playable 上下文'), findsNothing);
    },
  );

  testWidgets(
    'runtime deep link resolves owned private local playable outside home feed',
    (tester) async {
      final harness = TestCreateWorkflowHarness();
      final draft = await harness.workflow.saveDraft(
        idea: '仅自己可见的深链作品',
        deepMode: false,
        selectedPowerIds: const ['touchControls'],
        workflowState: const {},
      );
      var task = await harness.workflow.startOrResumeGeneration(draft.draftId);
      task = await harness.workflow.updateGeneration(
        task.taskId,
        LocalGenerationStatus.completed,
      );
      final release = await harness.workflow.publishLocalPlayable(
        LocalReleaseRequest(
          generationTaskId: task.taskId,
          title: '私有本地 Playable',
          summary: '不进入公开首页，但当前所有者可按 playable_id 恢复。',
          contentType: 'game',
          authorName: 'Kai Chen',
          visibility: LocalVisibility.privateLocal,
          remixPolicy: LocalRemixPolicy.disabled,
          localReviewPassed: true,
        ),
      );
      final home = await harness.repository.loadHome();
      expect(
        home.playables.where((item) => item.id == release.playableId),
        isEmpty,
      );

      final router = buildAirvanaRouter(
        initialLocation: '/runtime/${release.playableId}',
      );
      addTearDown(router.dispose);
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            airvanaRepositoryProvider.overrideWithValue(harness.repository),
          ],
          child: MaterialApp.router(
            theme: buildAirvanaTheme(),
            routerConfig: router,
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.textContaining('私有本地 Playable'), findsWidgets);
      expect(find.text('无法打开 Playable'), findsNothing);
    },
  );

  testWidgets('refresh restores one completed task and its exact version', (
    tester,
  ) async {
    final harness = TestCreateWorkflowHarness();
    var draft = await harness.workflow.saveDraft(
      idea: '可恢复的跳跃草稿',
      deepMode: false,
      selectedPowerIds: const ['touchControls', 'timerScore', 'failureRetry'],
      workflowState: const {
        'stage': 5,
        'generationIndex': 6,
        'previewScore': 2,
        'previewStatus': 'running',
        'previewPlatform': 2,
        'coveredPaths': ['retry'],
        'composerOpen': false,
      },
    );
    var task = await harness.workflow.startOrResumeGeneration(draft.draftId);
    task = await harness.workflow.updateGeneration(
      task.taskId,
      LocalGenerationStatus.completed,
    );
    draft = await harness.workflow.saveDraft(
      draftId: draft.draftId,
      idea: draft.idea,
      deepMode: draft.deepMode,
      selectedPowerIds: draft.selectedPowerIds,
      workflowState: {
        ...draft.workflowState,
        'task_id': task.taskId,
        'version_id': task.versionId,
      },
    );
    final route = CreateRouteState(
      taskId: task.taskId,
      versionId: task.versionId,
    );
    final router = buildAirvanaRouter(initialLocation: route.uri.toString());
    addTearDown(router.dispose);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          airvanaRepositoryProvider.overrideWithValue(harness.repository),
        ],
        child: MaterialApp.router(
          theme: buildAirvanaTheme(),
          routerConfig: router,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text(task.versionId), findsOneWidget);
    expect(find.text('平台 2/6'), findsOneWidget);
    expect(find.text('已验证 1/4'), findsOneWidget);
    final restoredUri = router.routeInformationProvider.value.uri;
    expect(restoredUri.path, '/create');
    expect(restoredUri.queryParameters['draft_id'], draft.draftId);
    expect(restoredUri.queryParameters['task_id'], task.taskId);
    expect(restoredUri.queryParameters['version_id'], task.versionId);
    final workspace = await harness.repository.loadLocalWorkspace();
    expect(workspace.generationTasks, hasLength(1));
    expect(workspace.generationTasks.single.taskId, task.taskId);
    expect(workspace.generationTasks.single.versionId, task.versionId);
  });

  testWidgets('double submit creates one generation identity and URL pair', (
    tester,
  ) async {
    final harness = TestCreateWorkflowHarness();
    final draft = await harness.workflow.saveDraft(
      idea: '只生成一次',
      deepMode: false,
      selectedPowerIds: const ['touchControls', 'timerScore', 'failureRetry'],
      workflowState: const {'stage': 3, 'composerOpen': false},
    );
    CreateRouteState? syncedRoute;

    await tester.pumpWidget(
      MaterialApp(
        theme: buildAirvanaTheme(),
        home: CreatePlayableScreen(
          workflowRepository: harness.workflow,
          routeState: CreateRouteState(draftId: draft.draftId),
          onRouteStateChanged: (value) => syncedRoute = value,
        ),
      ),
    );
    await tester.pumpAndSettle();

    final submit = find.byKey(const ValueKey('confirm-generate'));
    await tester.ensureVisible(submit);
    await tester.tap(submit);
    await tester.tap(submit);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 40));
    await tester.pump(const Duration(milliseconds: 40));

    final workspace = await harness.repository.loadLocalWorkspace();
    expect(workspace.generationTasks, hasLength(1));
    final task = workspace.generationTasks.single;
    expect(syncedRoute?.taskId, task.taskId);
    expect(syncedRoute?.versionId, task.versionId);
    expect(find.textContaining('task_id: ${task.taskId}'), findsOneWidget);

    final cancel = find.text('取消生成');
    await tester.ensureVisible(cancel);
    await tester.tap(cancel);
    await tester.pump(const Duration(milliseconds: 40));
    expect(
      (await harness.repository.loadLocalWorkspace())
          .generationTasks
          .single
          .status,
      LocalGenerationStatus.paused,
    );
    final resume = find.text('恢复生成');
    await tester.ensureVisible(resume);
    await tester.tap(resume);
    await tester.pump(const Duration(milliseconds: 40));
    await tester.pump(const Duration(milliseconds: 40));
    final resumedWorkspace = await harness.repository.loadLocalWorkspace();
    expect(resumedWorkspace.generationTasks, hasLength(1));
    expect(resumedWorkspace.generationTasks.single.taskId, task.taskId);
    expect(resumedWorkspace.generationTasks.single.versionId, task.versionId);
    expect(
      resumedWorkspace.generationTasks.single.status,
      LocalGenerationStatus.running,
    );

    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('publish failure stays in review and creates no release', (
    tester,
  ) async {
    final harness = TestCreateWorkflowHarness();
    var draft = await harness.workflow.saveDraft(
      idea: '不可越过未完成任务发布',
      deepMode: false,
      selectedPowerIds: const ['touchControls', 'timerScore', 'failureRetry'],
      workflowState: const {
        'stage': 6,
        'approved': true,
        'composerOpen': false,
      },
    );
    var task = await harness.workflow.startOrResumeGeneration(draft.draftId);
    task = await harness.workflow.updateGeneration(
      task.taskId,
      LocalGenerationStatus.running,
    );
    draft = await harness.workflow.saveDraft(
      draftId: draft.draftId,
      idea: draft.idea,
      deepMode: draft.deepMode,
      selectedPowerIds: draft.selectedPowerIds,
      workflowState: {
        ...draft.workflowState,
        'task_id': task.taskId,
        'version_id': task.versionId,
      },
    );

    await tester.pumpWidget(
      MaterialApp(
        theme: buildAirvanaTheme(),
        home: CreatePlayableScreen(
          workflowRepository: harness.workflow,
          routeState: CreateRouteState(
            draftId: draft.draftId,
            taskId: task.taskId,
            versionId: task.versionId,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    final publish = find.byKey(const ValueKey('publish-local'));
    await tester.ensureVisible(publish);
    await tester.tap(publish);
    await tester.pumpAndSettle();

    expect(find.textContaining('发布失败，未进入已发布状态'), findsOneWidget);
    expect(find.text('已发布到本机 Airvana 首页 · 本地演示'), findsNothing);
    expect((await harness.repository.loadLocalWorkspace()).releases, isEmpty);
  });

  testWidgets('mismatched task and version IDs fail closed', (tester) async {
    final harness = TestCreateWorkflowHarness();
    final draft = await harness.workflow.saveDraft(
      idea: '版本校验',
      deepMode: false,
      selectedPowerIds: const ['touchControls'],
      workflowState: const {'stage': 3, 'composerOpen': false},
    );
    final task = await harness.workflow.startOrResumeGeneration(draft.draftId);

    await tester.pumpWidget(
      MaterialApp(
        theme: buildAirvanaTheme(),
        home: CreatePlayableScreen(
          workflowRepository: harness.workflow,
          routeState: CreateRouteState(
            draftId: draft.draftId,
            taskId: task.taskId,
            versionId: 'version_wrong',
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('无法恢复该创作链接'), findsOneWidget);
    expect(find.textContaining('不匹配'), findsOneWidget);
  });
}
