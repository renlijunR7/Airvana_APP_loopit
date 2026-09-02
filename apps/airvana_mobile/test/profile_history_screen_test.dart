import 'dart:async';
import 'dart:ui' show SemanticsAction;

import 'package:airvana_mobile/app/app_router.dart';
import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/history/presentation/experience_history_screen.dart';
import 'package:airvana_mobile/features/shared/data/legacy_demo_catalog.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_models.dart';
import 'package:airvana_mobile/features/shared/domain/airvana_models.dart';
import 'package:airvana_mobile/shared/presentation/airvana_shell.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'support/test_create_workflow.dart';

void main() {
  testWidgets('profile uses compact skeletons while server data is pending', (
    tester,
  ) async {
    final home = Completer<HomeSnapshot>();
    final history = Completer<List<ExperienceRecord>>();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          airvanaRepositoryProvider.overrideWithValue(
            TestCreateWorkflowHarness().repository,
          ),
          homeProvider.overrideWith((_) => home.future),
          experienceHistoryProvider.overrideWith((_) => history.future),
          profileLocalWorkspaceProvider.overrideWith(
            (_) async => const LocalWorkspaceSnapshot(),
          ),
        ],
        child: MaterialApp.router(
          theme: buildAirvanaTheme(),
          routerConfig: buildAirvanaRouter(initialLocation: '/profile'),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const ValueKey('profile-loading-card')), findsOneWidget);
    expect(find.byKey(const ValueKey('profile-skeleton')), findsOneWidget);
    expect(find.byKey(const ValueKey('history-loading-list')), findsOneWidget);
    expect(find.byType(SliverFillRemaining), findsNothing);

    home.complete(
      const HomeSnapshot(
        user: AppUser(id: 'user-1', displayName: 'Kai Chen'),
        playables: [],
      ),
    );
    history.complete(const []);
    await tester.pumpAndSettle();

    expect(find.text('Kai Chen'), findsOneWidget);
    expect(
      find.byKey(const ValueKey('profile-playable-plb_safety_workshop')),
      findsOneWidget,
    );
    expect(
      find.byKey(
        const ValueKey('profile-playable-profile_demo_kol_brand_draft_1'),
      ),
      findsOneWidget,
    );
    expect(
      find.byKey(
        const ValueKey('profile-playable-profile_demo_kol_brand_draft_2'),
      ),
      findsOneWidget,
    );

    await tester.tap(find.byKey(const ValueKey('profile-tab-1')));
    await tester.pumpAndSettle();
    expect(find.text('草稿箱是空的'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('profile-tab-2')));
    await tester.pumpAndSettle();
    expect(find.text('还没有收藏'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('profile-tab-3')));
    await tester.pumpAndSettle();
    expect(find.text('还没有体验记录'), findsOneWidget);
  });

  testWidgets('profile actions stay accessible while the plan card is hidden', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(430, 932);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          airvanaRepositoryProvider.overrideWithValue(
            TestCreateWorkflowHarness().repository,
          ),
          homeProvider.overrideWith(
            (_) async => const HomeSnapshot(
              user: AppUser(id: 'user-1', displayName: 'Kai Chen'),
              playables: [],
              localDemo: true,
            ),
          ),
          experienceHistoryProvider.overrideWith((_) async => const []),
          profileLocalWorkspaceProvider.overrideWith(
            (_) async => const LocalWorkspaceSnapshot(),
          ),
        ],
        child: MaterialApp.router(
          theme: buildAirvanaTheme(),
          routerConfig: buildAirvanaRouter(initialLocation: '/profile'),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.bySemanticsLabel('获取积分'), findsOneWidget);
    expect(find.bySemanticsLabel('通知'), findsOneWidget);
    expect(find.bySemanticsLabel('设置与更多'), findsOneWidget);
    expect(find.bySemanticsLabel('查看订阅与额度，当前 Free'), findsNothing);
    expect(find.bySemanticsLabel('创作者中心'), findsOneWidget);
    final profileCard = tester.widget<Container>(
      find.byKey(const ValueKey('profile-card')),
    );
    final profileCardDecoration = profileCard.decoration! as BoxDecoration;
    final profileCardBorder = profileCardDecoration.border! as Border;
    expect(profileCardBorder.top.color, const Color(0xFFE1E1E8));
    expect(profileCardBorder.top.width, 1);

    expect(
      tester.getSize(find.byKey(const ValueKey('profile-rewards-action'))),
      const Size.square(40),
    );
    expect(
      tester.getSize(find.byKey(const ValueKey('profile-edit-action'))),
      const Size.square(44),
    );

    final horizontalDivider = tester.widget<Divider>(
      find.byKey(const ValueKey('profile-metrics-divider')),
    );
    expect(horizontalDivider.color, const Color(0xFFEDEDF3));
    expect(horizontalDivider.thickness, .7);

    final verticalDividers = tester.widgetList<VerticalDivider>(
      find.byKey(const ValueKey('profile-metric-divider')),
    );
    expect(verticalDividers, hasLength(2));
    for (final divider in verticalDividers) {
      expect(divider.color, const Color(0xFFEDEDF3));
      expect(divider.thickness, 1);
    }
    for (final label in ['获取积分', '通知', '设置与更多', '创作者中心']) {
      expect(
        tester
            .getSemantics(find.bySemanticsLabel(label))
            .getSemanticsData()
            .hasAction(SemanticsAction.tap),
        isTrue,
        reason: '$label 必须可以通过读屏触发',
      );
    }
  });

  testWidgets('profile tab content uses the shared 20px page gutters', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    for (final width in [360.0, 390.0, 430.0]) {
      tester.view.physicalSize = Size(width, 932);
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            airvanaRepositoryProvider.overrideWithValue(
              TestCreateWorkflowHarness().repository,
            ),
            homeProvider.overrideWith(
              (_) async => const HomeSnapshot(
                user: AppUser(id: 'user-1', displayName: 'Kai Chen'),
                playables: [],
                localDemo: true,
              ),
            ),
            experienceHistoryProvider.overrideWith((_) async => const []),
            profileLocalWorkspaceProvider.overrideWith(
              (_) async => const LocalWorkspaceSnapshot(),
            ),
          ],
          child: MaterialApp.router(
            theme: buildAirvanaTheme(),
            routerConfig: buildAirvanaRouter(initialLocation: '/profile'),
          ),
        ),
      );
      await tester.pumpAndSettle();

      final displayName = find.byKey(const ValueKey('profile-display-name'));
      final displayNameWidget = tester.widget<Text>(displayName);
      expect(
        tester.getSize(displayName).width,
        greaterThanOrEqualTo(110),
        reason: '$width px 宽度下用户名应优先获得完整显示空间',
      );
      expect(displayNameWidget.textScaler, TextScaler.noScaling);

      final first = find.byKey(
        const ValueKey('profile-playable-plb_safety_workshop'),
      );
      final last = find.byKey(
        const ValueKey('profile-playable-profile_demo_kol_brand_draft_2'),
      );
      expect(tester.getTopLeft(first).dx, AirvanaMetrics.pageGutter);
      expect(
        tester.getTopRight(last).dx,
        closeTo(width - AirvanaMetrics.pageGutter, .01),
      );
      expect(tester.takeException(), isNull);
    }
  });

  testWidgets(
    'settings and every nested profile destination use full-screen routes',
    (tester) async {
      tester.view.physicalSize = const Size(430, 932);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            airvanaRepositoryProvider.overrideWithValue(
              TestCreateWorkflowHarness().repository,
            ),
            homeProvider.overrideWith(
              (_) async => const HomeSnapshot(
                user: AppUser(id: 'user-1', displayName: 'Kai Chen'),
                playables: [],
                localDemo: true,
              ),
            ),
            experienceHistoryProvider.overrideWith((_) async => const []),
            profileLocalWorkspaceProvider.overrideWith(
              (_) async => const LocalWorkspaceSnapshot(),
            ),
          ],
          child: MaterialApp.router(
            theme: buildAirvanaTheme(),
            routerConfig: buildAirvanaRouter(initialLocation: '/profile'),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.bySemanticsLabel('设置与更多'));
      await tester.pumpAndSettle();

      final settings = find.byKey(const ValueKey('profile-secondary-settings'));
      expect(settings, findsOneWidget);
      expect(tester.getSize(settings), const Size(430, 932));
      expect(find.byType(BottomSheet), findsNothing);
      expect(find.byKey(const ValueKey('primary-navigation')), findsNothing);
      for (final label in [
        '我的钱包',
        '订阅与额度',
        'KOL AI 分身',
        '创作者中心',
        '身份认证',
        '品牌合作',
        '创作者权益',
        '发布与治理',
        '意见反馈',
        '全项目功能中心',
        '切换语言',
        '设置',
        '退出登录',
      ]) {
        expect(
          find.descendant(of: settings, matching: find.text(label)),
          findsOneWidget,
        );
      }

      await tester.tap(find.text('我的钱包'));
      await tester.pumpAndSettle();
      final wallet = find.byKey(const ValueKey('profile-secondary-wallet'));
      expect(wallet, findsOneWidget);
      expect(tester.getSize(wallet), const Size(430, 932));
      expect(find.byKey(const ValueKey('primary-navigation')), findsNothing);
      expect(find.text('钱包'), findsOneWidget);
      expect(find.text('2480'), findsOneWidget);
      expect(find.text('经济模型边界'), findsOneWidget);

      await tester.tap(find.byKey(const ValueKey('profile-secondary-back')));
      await tester.pumpAndSettle();
      expect(settings, findsOneWidget);

      await tester.tap(find.byKey(const ValueKey('profile-secondary-back')));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('primary-navigation')), findsOneWidget);
    },
  );

  testWidgets('all profile secondary destinations fill compact phone screens', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    for (final width in [360.0, 390.0, 430.0]) {
      tester.view.physicalSize = Size(width, 844);
      for (final destination in ProfileSecondaryDestination.values) {
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              homeProvider.overrideWith(
                (_) async => const HomeSnapshot(
                  user: AppUser(id: 'user-1', displayName: 'Kai Chen'),
                  playables: [],
                  localDemo: true,
                ),
              ),
              rewardStateProvider.overrideWith(
                (_) async => const LocalRewardState(),
              ),
            ],
            child: MaterialApp(
              theme: buildAirvanaTheme(),
              home: ProfileSecondaryScreen(destination: destination),
            ),
          ),
        );
        await tester.pump();

        final page = find.byKey(
          ValueKey('profile-secondary-${destination.name}'),
        );
        expect(page, findsOneWidget, reason: '${destination.name} 未渲染');
        expect(
          tester.getSize(page),
          Size(width, 844),
          reason: '${destination.name} 在 ${width.toInt()}px 下未全屏',
        );
        expect(find.byType(BottomSheet), findsNothing);
        expect(find.byKey(const ValueKey('primary-navigation')), findsNothing);
        final back = find.byKey(const ValueKey('profile-secondary-back'));
        expect(back, findsOneWidget);
        expect(tester.getTopLeft(back).dx, 8);
        expect(tester.getSize(back).width, 48);
        expect(tester.getSize(back).height, greaterThanOrEqualTo(44));
        expect(
          find.descendant(
            of: back,
            matching: find.byIcon(Icons.arrow_back_ios_new_rounded),
          ),
          findsOneWidget,
        );
        if (destination == ProfileSecondaryDestination.legacyDraft) {
          expect(find.textContaining('未绑定 draft_id'), findsOneWidget);
          expect(find.textContaining('不会伪装为已保存'), findsOneWidget);
          expect(find.textContaining('写入本机草稿箱'), findsOneWidget);
        }
        expect(tester.takeException(), isNull);
      }
    }
  });

  testWidgets(
    'server profile only shows server-owned published works and stats',
    (tester) async {
      const account = AccountSnapshot(
        aip: 120,
        ait: 0,
        planName: 'Free',
        allowances: {},
        followerCount: 3,
        followingCount: 4,
        likesReceived: 7,
        unreadNotifications: 0,
      );
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            airvanaRepositoryProvider.overrideWithValue(
              TestCreateWorkflowHarness().repository,
            ),
            homeProvider.overrideWith(
              (_) async => const HomeSnapshot(
                user: AppUser(id: 'server-user', displayName: 'Server Creator'),
                playables: [],
                ownedPlayables: [
                  Playable(
                    id: 'content_server_owned',
                    title: '服务端作品',
                    authorName: 'Server Creator',
                    contentType: 'game',
                    version: 2,
                    summary: '服务端已发布作品',
                    ownerUserId: 'server-user',
                    stage: 'SERVER VERIFIED',
                  ),
                ],
                account: account,
              ),
            ),
            experienceHistoryProvider.overrideWith((_) async => const []),
            profileLocalWorkspaceProvider.overrideWith(
              (_) async => const LocalWorkspaceSnapshot(),
            ),
          ],
          child: MaterialApp(
            theme: buildAirvanaTheme(),
            home: const Scaffold(body: ProfileAndHistoryScreen()),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.text('服务端作品'), findsOneWidget);
      expect(find.text('Server Creator · v2'), findsOneWidget);
      expect(find.text('892'), findsNothing);
      expect(find.text('7'), findsOneWidget);
      expect(find.text('Crypto City 安全挑战'), findsNothing);
      expect(find.text('KOL 品牌互动挑战'), findsNothing);
      expect(find.text('LOCAL DEMO'), findsNothing);
    },
  );

  testWidgets(
    'works tab keeps three legacy baseline cards in order and demo drafts never fake persistence',
    (tester) async {
      tester.view.physicalSize = const Size(430, 932);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final router = buildAirvanaRouter(initialLocation: '/profile');
      addTearDown(router.dispose);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            airvanaRepositoryProvider.overrideWithValue(
              TestCreateWorkflowHarness().repository,
            ),
            homeProvider.overrideWith(
              (_) async => const HomeSnapshot(
                user: LegacyDemoCatalog.user,
                playables: [],
                localDemo: true,
              ),
            ),
            experienceHistoryProvider.overrideWith((_) async => const []),
            profileLocalWorkspaceProvider.overrideWith(
              (_) async => const LocalWorkspaceSnapshot(),
            ),
          ],
          child: MaterialApp.router(
            theme: buildAirvanaTheme(),
            routerConfig: router,
          ),
        ),
      );
      await tester.pumpAndSettle();

      final safety = find.byKey(
        const ValueKey('profile-playable-plb_safety_workshop'),
      );
      final firstDemo = find.byKey(
        const ValueKey('profile-playable-profile_demo_kol_brand_draft_1'),
      );
      final secondDemo = find.byKey(
        const ValueKey('profile-playable-profile_demo_kol_brand_draft_2'),
      );
      final profileCards = find.byWidgetPredicate((widget) {
        final key = widget.key;
        return key is ValueKey<String> &&
            key.value.startsWith('profile-playable-');
      });

      expect(profileCards, findsNWidgets(3));
      expect(find.text('Crypto City 安全挑战'), findsOneWidget);
      expect(find.text('运行中'), findsOneWidget);
      expect(find.text('Nova · v2'), findsOneWidget);
      expect(find.text('KOL 品牌互动挑战'), findsNWidgets(2));
      expect(find.text('草稿'), findsNWidgets(2));
      expect(find.text('Nova · 未发布'), findsNWidgets(2));
      expect(find.text('LOCAL DEMO'), findsNothing);

      final safetyPosition = tester.getTopLeft(safety);
      final firstDemoPosition = tester.getTopLeft(firstDemo);
      final secondDemoPosition = tester.getTopLeft(secondDemo);
      expect(safetyPosition.dy, firstDemoPosition.dy);
      expect(firstDemoPosition.dy, secondDemoPosition.dy);
      expect(safetyPosition.dx, lessThan(firstDemoPosition.dx));
      expect(firstDemoPosition.dx, lessThan(secondDemoPosition.dx));

      for (final demo in [firstDemo, secondDemo]) {
        expect(
          tester
              .getSemantics(demo)
              .getSemanticsData()
              .hasAction(SemanticsAction.tap),
          isTrue,
        );
      }

      expect(
        tester
            .getSemantics(safety)
            .getSemanticsData()
            .hasAction(SemanticsAction.tap),
        isTrue,
      );
    },
  );

  testWidgets(
    'works show owned published local playable plus safety demo using stable IDs',
    (tester) async {
      tester.view.physicalSize = const Size(430, 932);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final now = DateTime.utc(2026, 8, 31, 9);
      final owned = LocalPlayable(
        playableId: 'playable_local_owned',
        ownerId: LegacyDemoCatalog.user.id,
        title: '我的本机作品',
        summary: '同一 playable_id 的作品',
        contentType: 'game',
        authorName: LegacyDemoCatalog.user.displayName,
        currentReleaseId: 'release_local_owned',
        currentVersionId: 'version_local_owned',
        currentVersionNumber: 2,
        status: LocalPlayableStatus.publishedLocal,
        dataMode: LocalDataMode.local,
        createdAt: now,
        updatedAt: now,
      );
      final otherOwner = LocalPlayable(
        playableId: 'playable_local_other',
        ownerId: 'another-user',
        title: '他人的本机作品',
        summary: '不应出现在个人作品',
        contentType: 'game',
        authorName: 'Other',
        currentReleaseId: 'release_local_other',
        currentVersionId: 'version_local_other',
        currentVersionNumber: 1,
        status: LocalPlayableStatus.publishedLocal,
        dataMode: LocalDataMode.local,
        createdAt: now,
        updatedAt: now,
      );
      final paused = LocalPlayable(
        playableId: 'playable_local_paused',
        ownerId: LegacyDemoCatalog.user.id,
        title: '已暂停作品',
        summary: '不应出现在已发布作品',
        contentType: 'game',
        authorName: LegacyDemoCatalog.user.displayName,
        currentReleaseId: 'release_local_paused',
        currentVersionId: 'version_local_paused',
        currentVersionNumber: 1,
        status: LocalPlayableStatus.pausedLocal,
        dataMode: LocalDataMode.local,
        createdAt: now,
        updatedAt: now,
      );
      final safety = LegacyDemoCatalog.byId('plb_safety_workshop')!;
      final anotherLegacy = LegacyDemoCatalog.legacyWebPlayables.firstWhere(
        (item) => item.id != safety.id,
      );
      final router = GoRouter(
        initialLocation: '/profile',
        routes: [
          GoRoute(
            path: '/profile',
            builder: (_, __) => const Scaffold(body: ProfileAndHistoryScreen()),
          ),
          GoRoute(
            path: '/runtime/:contentId',
            builder: (_, state) => Scaffold(
              body: Text('runtime:${state.pathParameters['contentId']}'),
            ),
          ),
        ],
      );
      addTearDown(router.dispose);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            airvanaRepositoryProvider.overrideWithValue(
              TestCreateWorkflowHarness().repository,
            ),
            homeProvider.overrideWith(
              (_) async => HomeSnapshot(
                user: LegacyDemoCatalog.user,
                playables: [safety, anotherLegacy],
                localDemo: true,
              ),
            ),
            experienceHistoryProvider.overrideWith((_) async => const []),
            profileLocalWorkspaceProvider.overrideWith(
              (_) async => LocalWorkspaceSnapshot(
                playables: [owned, otherOwner, paused],
              ),
            ),
          ],
          child: MaterialApp.router(
            theme: buildAirvanaTheme(),
            routerConfig: router,
          ),
        ),
      );
      await tester.pumpAndSettle();

      final profileCards = find.byWidgetPredicate((widget) {
        final key = widget.key;
        return key is ValueKey<String> &&
            key.value.startsWith('profile-playable-');
      });
      final ownedFinder = find.byKey(
        const ValueKey('profile-playable-playable_local_owned'),
      );
      expect(profileCards, findsNWidgets(4));
      expect(ownedFinder, findsOneWidget);
      expect(
        find.byKey(const ValueKey('profile-playable-plb_safety_workshop')),
        findsOneWidget,
      );
      expect(
        find.byKey(const ValueKey('profile-playable-playable_local_other')),
        findsNothing,
      );
      expect(
        find.byKey(const ValueKey('profile-playable-playable_local_paused')),
        findsNothing,
      );
      expect(
        find.byKey(ValueKey('profile-playable-${anotherLegacy.id}')),
        findsNothing,
      );

      await tester.ensureVisible(ownedFinder);
      await tester.tap(ownedFinder);
      await tester.pumpAndSettle();
      expect(find.text('runtime:${owned.playableId}'), findsOneWidget);
    },
  );

  testWidgets(
    'draft tab shows only current editable drafts and restores by draft_id',
    (tester) async {
      tester.view.physicalSize = const Size(430, 932);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final now = DateTime.utc(2026, 8, 31, 10);
      final editing = _draft(
        id: 'draft_local_editing',
        ownerId: LegacyDemoCatalog.user.id,
        status: LocalDraftStatus.editing,
        updatedAt: now,
      );
      final ready = _draft(
        id: 'draft_local_ready',
        ownerId: LegacyDemoCatalog.user.id,
        status: LocalDraftStatus.readyForGeneration,
        updatedAt: now.subtract(const Duration(minutes: 1)),
      );
      final published = _draft(
        id: 'draft_local_published',
        ownerId: LegacyDemoCatalog.user.id,
        status: LocalDraftStatus.publishedLocal,
        updatedAt: now,
      );
      final archived = _draft(
        id: 'draft_local_archived',
        ownerId: LegacyDemoCatalog.user.id,
        status: LocalDraftStatus.archived,
        updatedAt: now,
      );
      final otherOwner = _draft(
        id: 'draft_local_other',
        ownerId: 'another-user',
        status: LocalDraftStatus.editing,
        updatedAt: now,
      );
      final router = GoRouter(
        initialLocation: '/profile',
        routes: [
          GoRoute(
            path: '/profile',
            builder: (_, __) => const Scaffold(body: ProfileAndHistoryScreen()),
          ),
          GoRoute(
            path: '/create',
            builder: (_, state) => Scaffold(
              body: Text('draft:${state.uri.queryParameters['draft_id']}'),
            ),
          ),
        ],
      );
      addTearDown(router.dispose);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            airvanaRepositoryProvider.overrideWithValue(
              TestCreateWorkflowHarness().repository,
            ),
            homeProvider.overrideWith(
              (_) async => HomeSnapshot(
                user: LegacyDemoCatalog.user,
                playables: const [],
                localDemo: true,
              ),
            ),
            experienceHistoryProvider.overrideWith((_) async => const []),
            profileLocalWorkspaceProvider.overrideWith(
              (_) async => LocalWorkspaceSnapshot(
                drafts: [editing, ready, published, archived, otherOwner],
              ),
            ),
          ],
          child: MaterialApp.router(
            theme: buildAirvanaTheme(),
            routerConfig: router,
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('profile-tab-1')));
      await tester.pumpAndSettle();

      final editingFinder = find.byKey(
        const ValueKey('profile-draft-draft_local_editing'),
      );
      expect(editingFinder, findsOneWidget);
      expect(
        find.byKey(const ValueKey('profile-draft-draft_local_ready')),
        findsOneWidget,
      );
      expect(
        find.byKey(const ValueKey('profile-draft-draft_local_published')),
        findsNothing,
      );
      expect(
        find.byKey(const ValueKey('profile-draft-draft_local_archived')),
        findsNothing,
      );
      expect(
        find.byKey(const ValueKey('profile-draft-draft_local_other')),
        findsNothing,
      );

      await tester.ensureVisible(editingFinder);
      await tester.tap(editingFinder);
      await tester.pumpAndSettle();
      expect(find.text('draft:${editing.draftId}'), findsOneWidget);
    },
  );

  testWidgets('profile loading layout matches the compact phone baseline', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final home = Completer<HomeSnapshot>();
    final history = Completer<List<ExperienceRecord>>();

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          airvanaRepositoryProvider.overrideWithValue(
            TestCreateWorkflowHarness().repository,
          ),
          homeProvider.overrideWith((_) => home.future),
          experienceHistoryProvider.overrideWith((_) => history.future),
          profileLocalWorkspaceProvider.overrideWith(
            (_) async => const LocalWorkspaceSnapshot(),
          ),
        ],
        child: MaterialApp(
          theme: buildAirvanaTheme(),
          home: const AirvanaShell(
            selectedIndex: 4,
            unreadCount: 1,
            child: ProfileAndHistoryScreen(),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    final profileScroll = tester.state<ScrollableState>(
      find
          .descendant(
            of: find.byType(ProfileAndHistoryScreen),
            matching: find.byType(Scrollable),
          )
          .first,
    );
    expect(profileScroll.position.pixels, 0);
    expect(
      tester.getTopLeft(find.byKey(const ValueKey('profile-loading-card'))).dy,
      inInclusiveRange(50, 80),
    );
    final primaryNavigation = find.byKey(const ValueKey('primary-navigation'));
    expect(primaryNavigation, findsOneWidget);
    final primaryNavigationRect = tester.getRect(primaryNavigation);
    expect(primaryNavigationRect.top, greaterThan(700));
    expect(primaryNavigationRect.bottom, lessThanOrEqualTo(844));

    await expectLater(
      find.byType(AirvanaShell),
      matchesGoldenFile('goldens/profile_history_loading.png'),
    );
  });
}

LocalDraft _draft({
  required String id,
  required String ownerId,
  required LocalDraftStatus status,
  required DateTime updatedAt,
}) => LocalDraft(
  draftId: id,
  ownerId: ownerId,
  idea: '草稿 $id',
  deepMode: false,
  selectedPowerIds: const ['touchControls'],
  workflowState: const {'stage': 2},
  status: status,
  dataMode: LocalDataMode.local,
  createdAt: updatedAt.subtract(const Duration(hours: 1)),
  updatedAt: updatedAt,
);
