import 'package:airvana_mobile/app/app_router.dart';
import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/core/config/app_environment.dart';
import 'package:airvana_mobile/core/network/airvana_api_client.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/shared/data/airvana_repository.dart';
import 'package:airvana_mobile/features/shared/data/legacy_demo_catalog.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_models.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_store.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

void main() {
  testWidgets(
    'home profile runtime and history keep one published playable_id',
    (tester) async {
      tester.view.physicalSize = const Size(430, 932);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final store = LocalAirvanaStore(
        persistence: MemoryLocalAirvanaPersistence(),
      );
      final draft = await store.saveDraft(
        ownerId: LegacyDemoCatalog.user.id,
        idea: '跨页面 Playable',
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
          title: '跨页面 Playable',
          summary: '验证首页、个人作品、运行与体验记录共享身份。',
          contentType: 'game',
          authorName: LegacyDemoCatalog.user.displayName,
          visibility: LocalVisibility.publicLocal,
          remixPolicy: LocalRemixPolicy.disabled,
          localReviewPassed: true,
        ),
      );
      final repository = _repository(store);
      final router = buildAirvanaRouter();
      addTearDown(router.dispose);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [airvanaRepositoryProvider.overrideWithValue(repository)],
          child: MaterialApp.router(
            theme: buildAirvanaTheme(),
            routerConfig: router,
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(
        find.byKey(ValueKey('play-${release.playableId}')),
        findsOneWidget,
      );
      expect(
        find.byKey(ValueKey('feed-cover-fallback-${release.playableId}')),
        findsOneWidget,
      );
      await tester.tap(find.byKey(ValueKey('play-${release.playableId}')));
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const ValueKey('runtime-start')));
      await tester.pump();
      for (var i = 0; i < 3; i += 1) {
        await tester.tap(find.text('执行高亮操作'));
        await tester.pump();
      }
      await tester.pumpAndSettle();
      expect(find.textContaining('体验记录已保存到本机'), findsOneWidget);
      expect(
        (await store.loadWorkspace()).experienceRecords.single.playableId,
        release.playableId,
      );

      await tester.tap(find.byKey(const ValueKey('runtime-result-exit')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('nav-4')));
      await tester.pumpAndSettle();

      final profilePlayable = find.byKey(
        ValueKey('profile-playable-${release.playableId}'),
      );
      expect(profilePlayable, findsOneWidget);
      await tester.ensureVisible(profilePlayable);
      await tester.tap(profilePlayable);
      await tester.pumpAndSettle();
      expect(find.text(release.title), findsWidgets);
      expect(find.byKey(const ValueKey('runtime-start')), findsOneWidget);

      await tester.tap(find.byTooltip('退出游戏'));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('profile-tab-3')));
      await tester.pumpAndSettle();
      expect(
        find.byKey(ValueKey('profile-playable-${release.playableId}')),
        findsOneWidget,
      );
      expect(find.textContaining('体验过 · v1'), findsOneWidget);
    },
  );
}

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
