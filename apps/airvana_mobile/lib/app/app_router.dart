import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/design_system/app_state_view.dart';
import 'package:airvana_mobile/features/create/application/create_route_state.dart';
import 'package:airvana_mobile/features/create/presentation/create_playable_screen.dart';
import 'package:airvana_mobile/features/discover/presentation/connected_discover_screen.dart';
import 'package:airvana_mobile/features/feed/presentation/feed_screen.dart';
import 'package:airvana_mobile/features/history/presentation/experience_history_screen.dart';
import 'package:airvana_mobile/features/messages/presentation/connected_messages_screen.dart';
import 'package:airvana_mobile/features/network/presentation/connected_network_screen.dart';
import 'package:airvana_mobile/features/runtime/presentation/server_playable_runtime_screen.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_models.dart';
import 'package:airvana_mobile/features/shared/domain/airvana_models.dart';
import 'package:airvana_mobile/shared/presentation/airvana_shell.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

GoRouter buildAirvanaRouter({String? initialLocation}) {
  return GoRouter(
    // A supplied test/recovery route still wins. In production, null lets
    // go_router honor the browser or OS deep link instead of forcing every
    // refresh back to the feed.
    initialLocation: initialLocation,
    routes: [
      ShellRoute(
        builder: (_, state, child) => ConnectedAirvanaShell(
          selectedIndex: _primaryIndexForPath(state.uri.path),
          child: child,
        ),
        routes: [
          GoRoute(
            path: '/',
            pageBuilder: (_, state) =>
                NoTransitionPage(key: state.pageKey, child: const FeedScreen()),
          ),
          GoRoute(
            path: '/discover',
            pageBuilder: (_, state) => NoTransitionPage(
              key: state.pageKey,
              child: const ConnectedDiscoverScreen(),
            ),
          ),
          GoRoute(
            path: '/world',
            pageBuilder: (_, state) => NoTransitionPage(
              key: state.pageKey,
              child: const ConnectedNetworkScreen(),
            ),
          ),
          GoRoute(
            path: '/messages',
            pageBuilder: (_, state) => NoTransitionPage(
              key: state.pageKey,
              child: const ConnectedMessagesScreen(),
            ),
          ),
          GoRoute(
            path: '/profile',
            pageBuilder: (_, state) => NoTransitionPage(
              key: state.pageKey,
              child: const ProfileAndHistoryScreen(),
            ),
          ),
        ],
      ),
      GoRoute(
        path: '/create',
        builder: (context, state) => _CreateRouteEntry(
          routeState: CreateRouteState.fromUri(state.uri),
          onRouteStateChanged: (routeState) {
            final nextLocation = routeState.uri.toString();
            if (GoRouterState.of(context).uri.toString() != nextLocation) {
              context.replace(nextLocation);
            }
          },
        ),
      ),
      GoRoute(
        path: '/profile/secondary/:destination',
        builder: (_, state) {
          final destination = ProfileSecondaryDestination.fromSlug(
            state.pathParameters['destination'] ?? '',
          );
          return destination == null
              ? const ProfileAndHistoryScreen()
              : ProfileSecondaryScreen(destination: destination);
        },
      ),
      GoRoute(
        path: '/runtime/:contentId',
        builder: (_, state) =>
            _PlayableRouteEntry(contentId: state.pathParameters['contentId']!),
      ),
    ],
  );
}

class _CreateRouteEntry extends ConsumerWidget {
  const _CreateRouteEntry({
    required this.routeState,
    required this.onRouteStateChanged,
  });

  final CreateRouteState routeState;
  final ValueChanged<CreateRouteState> onRouteStateChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) => CreatePlayableScreen(
    routeState: routeState,
    onRouteStateChanged: onRouteStateChanged,
    workflowRepository: ref.watch(createWorkflowRepositoryProvider),
    onPublished: () {
      ref.invalidate(homeProvider);
      ref.invalidate(profileLocalWorkspaceProvider);
    },
  );
}

class _PlayableRouteEntry extends ConsumerWidget {
  const _PlayableRouteEntry({required this.contentId});

  final String contentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final home = ref.watch(homeProvider);
    return home.when(
      data: (snapshot) {
        Playable? playable;
        for (final candidate in <Playable>[
          ...snapshot.playables,
          ...snapshot.ownedPlayables,
        ]) {
          if (candidate.id == contentId) {
            playable = candidate;
            break;
          }
        }
        if (playable != null) {
          return PlayableRuntimeEntryScreen(playable: playable);
        }
        final local = ref.watch(localPlayableByIdProvider(contentId));
        return local.when(
          data: (candidate) {
            if (candidate != null &&
                candidate.ownerId == snapshot.user.id &&
                candidate.status == LocalPlayableStatus.publishedLocal) {
              return PlayableRuntimeEntryScreen(
                playable: _domainPlayable(candidate),
              );
            }
            return Scaffold(
              body: AppStateView(
                icon: Icons.link_off_rounded,
                title: '无法打开 Playable',
                message: '链接中的作品 $contentId 不存在、已下架或当前账号无权访问。',
                actionLabel: '返回首页',
                onAction: () => context.go('/'),
              ),
            );
          },
          loading: () => const Scaffold(
            body: AppStateView(
              icon: Icons.hourglass_top_rounded,
              title: '正在恢复个人 Playable',
              message: '公开 Feed 未命中，正在核对当前账号的本地已发布作品。',
            ),
          ),
          error: (_, __) => Scaffold(
            body: AppStateView(
              icon: Icons.cloud_off_rounded,
              title: '个人 Playable 加载失败',
              message: '未能核对 $contentId 的本地发布记录。',
              actionLabel: '重试',
              onAction: () =>
                  ref.invalidate(localPlayableByIdProvider(contentId)),
            ),
          ),
        );
      },
      loading: () => const Scaffold(
        body: AppStateView(
          icon: Icons.hourglass_top_rounded,
          title: '正在恢复 Playable',
          message: '正在根据链接中的 contentId 加载已发布版本。',
        ),
      ),
      error: (_, __) => Scaffold(
        body: AppStateView(
          icon: Icons.cloud_off_rounded,
          title: 'Playable 加载失败',
          message: '未能从作品仓库恢复 $contentId，请检查网络后重试。',
          actionLabel: '重试',
          onAction: () => ref.invalidate(homeProvider),
        ),
      ),
    );
  }
}

Playable _domainPlayable(LocalPlayable playable) => Playable(
  id: playable.playableId,
  title: playable.title,
  authorName: playable.authorName,
  contentType: playable.contentType,
  version: playable.currentVersionNumber,
  summary: playable.summary,
  stage: playable.dataMode == LocalDataMode.demo
      ? 'DEMO · LOCAL PUBLISHED'
      : 'LOCAL PUBLISHED',
  localDemo: true,
);

int _primaryIndexForPath(String path) {
  return switch (path) {
    '/discover' => 1,
    '/world' => 2,
    '/messages' => 3,
    '/profile' => 4,
    _ => 0,
  };
}
