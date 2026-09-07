import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/feed/presentation/feed_screen.dart';
import 'package:airvana_mobile/features/shared/data/legacy_demo_catalog.dart';
import 'package:airvana_mobile/features/shared/domain/airvana_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets(
    'legacy feed keeps all 38 entries ordered, bilingual and launchable',
    (tester) async {
      tester.view.physicalSize = const Size(430, 932);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            homeProvider.overrideWith(
              (_) async => HomeSnapshot(
                user: LegacyDemoCatalog.user,
                playables: LegacyDemoCatalog.legacyWebPlayables,
                localDemo: true,
              ),
            ),
          ],
          child: MaterialApp(
            theme: buildAirvanaTheme(),
            home: const Scaffold(body: FeedScreen()),
          ),
        ),
      );
      await tester.pumpAndSettle();

      final pager = tester.widget<PageView>(
        find.byKey(const ValueKey('legacy-feed-pager')),
      );
      expect(pager.childrenDelegate.estimatedChildCount, 38);
      expect(find.textContaining('Orchard Merge'), findsWidgets);
      expect(find.textContaining('AIRVANA ORIGINAL'), findsWidgets);
      expect(find.textContaining('本地互动 DEMO'), findsWidgets);
      expect(
        find.byKey(const ValueKey('feed-author-plb_orchard_merge')),
        findsOneWidget,
      );
      expect(
        find.byKey(const ValueKey('play-plb_orchard_merge')),
        findsOneWidget,
      );
      expect(
        tester
            .getSize(find.byKey(const ValueKey('feed-bottom-nav-reserve')))
            .height,
        65,
      );

      for (final playable in LegacyDemoCatalog.legacyWebPlayables.skip(1)) {
        await tester.drag(
          find.byKey(const ValueKey('legacy-feed-pager')),
          const Offset(0, -620),
        );
        await tester.pumpAndSettle();
        expect(
          find.byKey(ValueKey('feed-playable-${playable.id}')),
          findsOneWidget,
        );
        expect(find.byKey(ValueKey('play-${playable.id}')), findsOneWidget);
      }

      expect(find.textContaining('Star Cups'), findsWidgets);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'published playable with no cover renders a reliable feed fallback',
    (tester) async {
      tester.view.physicalSize = const Size(430, 932);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      const playable = Playable(
        id: 'playable_local_no_cover',
        title: '无封面本机作品',
        authorName: 'Kai Chen',
        contentType: 'game',
        version: 1,
        summary: '发布后首页仍应可靠展示。',
      );
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            homeProvider.overrideWith(
              (_) async => const HomeSnapshot(
                user: AppUser(id: 'user-1', displayName: 'Kai Chen'),
                playables: [playable],
                localDemo: true,
              ),
            ),
          ],
          child: MaterialApp(
            theme: buildAirvanaTheme(),
            home: const Scaffold(body: FeedScreen()),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(
        find.byKey(
          const ValueKey('feed-cover-fallback-playable_local_no_cover'),
        ),
        findsOneWidget,
      );
      expect(find.text('无封面本机作品'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'local playable starts, completes, retries and exits inside the feed media area',
    (tester) async {
      tester.view.physicalSize = const Size(430, 932);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final playable = LegacyDemoCatalog.legacyWebPlayables.firstWhere(
        (item) => item.id == 'plb_star_mower',
      );
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            homeProvider.overrideWith(
              (_) async => HomeSnapshot(
                user: LegacyDemoCatalog.user,
                playables: [playable],
                localDemo: true,
              ),
            ),
          ],
          child: MaterialApp(
            theme: buildAirvanaTheme(),
            home: const Scaffold(body: FeedScreen()),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const ValueKey('play-plb_star_mower')));
      await tester.pump();
      expect(
        find.byKey(const ValueKey('feed-inline-game-plb_star_mower')),
        findsOneWidget,
      );
      expect(
        find.byKey(const ValueKey('feed-author-plb_star_mower')),
        findsOneWidget,
      );
      expect(
        find.byKey(const ValueKey('feed-inline-action-0')),
        findsOneWidget,
      );

      for (var stage = 0; stage < 3; stage += 1) {
        await tester.tap(find.byKey(const ValueKey('feed-inline-action-0')));
        await tester.pump();
      }
      expect(find.byKey(const ValueKey('feed-inline-result')), findsOneWidget);
      expect(find.text('本地交互演示完成'), findsOneWidget);

      await tester.tap(find.byKey(const ValueKey('feed-inline-retry')));
      await tester.pump();
      expect(find.byKey(const ValueKey('feed-inline-result')), findsNothing);
      expect(find.text('1/3'), findsOneWidget);

      await tester.tap(find.byTooltip('退出当前作品'));
      await tester.pump();
      expect(
        find.byKey(const ValueKey('feed-inline-game-plb_star_mower')),
        findsNothing,
      );
      expect(find.byKey(const ValueKey('play-plb_star_mower')), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets(
    'active game footer swipes pages without breaking social button taps',
    (tester) async {
      tester.view.physicalSize = const Size(430, 932);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      final first = LegacyDemoCatalog.legacyWebPlayables.firstWhere(
        (item) => item.id == 'plb_star_mower',
      );
      final second = LegacyDemoCatalog.legacyWebPlayables.firstWhere(
        (item) => item.id == 'plb_moonlight_tea_shop',
      );
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            homeProvider.overrideWith(
              (_) async => HomeSnapshot(
                user: LegacyDemoCatalog.user,
                playables: [first, second],
                localDemo: true,
              ),
            ),
          ],
          child: MaterialApp(
            theme: buildAirvanaTheme(),
            home: const Scaffold(body: FeedScreen()),
          ),
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byKey(const ValueKey('play-plb_star_mower')));
      await tester.pump();
      expect(
        find.byKey(const ValueKey('feed-inline-game-plb_star_mower')),
        findsOneWidget,
      );

      await tester.tap(find.bySemanticsLabel('点赞 星尘割草 Star Mower'));
      await tester.pump();
      expect(find.bySemanticsLabel('取消点赞 星尘割草 Star Mower'), findsOneWidget);

      final firstFooter = find.byKey(
        const ValueKey('feed-footer-swipe-plb_star_mower'),
      );
      await tester.flingFrom(
        tester.getTopLeft(firstFooter) + const Offset(215, 70),
        const Offset(0, -120),
        1200,
      );
      await tester.pumpAndSettle();

      expect(
        find.byKey(const ValueKey('play-plb_moonlight_tea_shop')),
        findsOneWidget,
      );
      expect(
        find.byKey(const ValueKey('feed-inline-game-plb_star_mower')),
        findsNothing,
      );
      expect(find.bySemanticsLabel('当前作品 2，共 2 个'), findsOneWidget);

      final secondFooter = find.byKey(
        const ValueKey('feed-footer-swipe-plb_moonlight_tea_shop'),
      );
      await tester.flingFrom(
        tester.getTopLeft(secondFooter) + const Offset(215, 70),
        const Offset(0, 500),
        1200,
      );
      await tester.pumpAndSettle();

      expect(find.byKey(const ValueKey('play-plb_star_mower')), findsOneWidget);
      expect(find.bySemanticsLabel('当前作品 1，共 2 个'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('double tap likes once and plays the 700ms Web heart burst', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(430, 932);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    const playable = Playable(
      id: 'plb_double_tap_test',
      title: '双击动效测试',
      authorName: 'Airvana Arcade',
      contentType: 'game',
      version: 1,
      summary: '验证 Web 同款爱心弹出。',
      localDemo: true,
    );
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          homeProvider.overrideWith(
            (_) async => const HomeSnapshot(
              user: AppUser(id: 'user-1', displayName: 'Kai Chen'),
              playables: [playable],
              localDemo: true,
            ),
          ),
        ],
        child: MaterialApp(
          theme: buildAirvanaTheme(),
          home: const Scaffold(body: FeedScreen()),
        ),
      ),
    );
    await tester.pumpAndSettle();

    final surface = find.byKey(
      const ValueKey('feed-double-tap-plb_double_tap_test'),
    );
    final tapPoint = tester.getTopLeft(surface) + const Offset(36, 160);
    await tester.tapAt(tapPoint);
    await tester.pump(const Duration(milliseconds: 90));
    await tester.tapAt(tapPoint);
    await tester.pump(const Duration(milliseconds: 120));

    expect(find.byKey(const ValueKey('feed-heart-burst')), findsOneWidget);
    expect(find.bySemanticsLabel('取消点赞 双击动效测试'), findsOneWidget);

    await tester.pump(const Duration(milliseconds: 700));
    expect(find.byKey(const ValueKey('feed-heart-burst')), findsNothing);
  });
}
