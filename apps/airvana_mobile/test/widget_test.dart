import 'dart:ui' show SemanticsAction;

import 'package:airvana_mobile/app/airvana_app.dart';
import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/design_system/legacy_web_assets.dart';
import 'package:airvana_mobile/features/create/presentation/create_playable_screen.dart';
import 'package:airvana_mobile/shared/presentation/airvana_shell.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'support/test_create_workflow.dart';

Widget _testAirvanaApp(TestCreateWorkflowHarness harness) => ProviderScope(
  overrides: [airvanaRepositoryProvider.overrideWithValue(harness.repository)],
  child: const AirvanaApp(),
);

void main() {
  testWidgets(
    'bottom navigation keeps five tabs and a separate creation plus',
    (tester) async {
      final harness = TestCreateWorkflowHarness();
      final router = GoRouter(
        routes: [
          GoRoute(
            path: '/',
            builder: (_, __) => const AirvanaShell(
              selectedIndex: 0,
              child: Center(child: Text('首页内容')),
            ),
          ),
          GoRoute(
            path: '/create',
            builder: (_, __) =>
                CreatePlayableScreen(workflowRepository: harness.workflow),
          ),
        ],
      );
      addTearDown(router.dispose);

      await tester.pumpWidget(
        MaterialApp.router(theme: buildAirvanaTheme(), routerConfig: router),
      );
      await tester.pumpAndSettle();

      expect(find.text('首页内容'), findsOneWidget);
      for (var index = 0; index < 5; index += 1) {
        expect(find.byKey(ValueKey('nav-$index')), findsOneWidget);
      }
      expect(find.byKey(const ValueKey('creation-plus')), findsOneWidget);
      for (final label in ['首页', '发现', '节点', '消息', '我的', '创作游戏']) {
        expect(
          tester
              .getSemantics(find.bySemanticsLabel(label))
              .getSemanticsData()
              .hasAction(SemanticsAction.tap),
          isTrue,
          reason: '$label 必须可以通过读屏触发',
        );
      }
      expect(
        tester.getSize(find.byKey(const ValueKey('primary-navigation'))).width,
        365.5,
      );
      expect(
        tester.getSize(find.byKey(const ValueKey('navigation-capsule'))),
        const Size(316.5, 54),
      );
      expect(
        tester.getSize(find.byKey(const ValueKey('navigation-active-lens'))),
        const Size(46, 38),
      );
      expect(
        tester.getSize(find.byKey(const ValueKey('creation-plus'))),
        const Size(39, 39),
      );
      expect(
        find.byKey(const ValueKey('navigation-active-lens')),
        findsOneWidget,
      );
      expect(
        find.descendant(
          of: find.byKey(const ValueKey('primary-navigation')),
          matching: find.byType(Tooltip),
        ),
        findsNothing,
      );

      await tester.tap(find.byKey(const ValueKey('creation-plus')));
      await tester.pumpAndSettle();
      expect(find.text('描述你想创作的游戏玩法、角色或互动挑战'), findsOneWidget);
      expect(
        find.byKey(const ValueKey('legacy-composer-input')),
        findsOneWidget,
      );
      expect(
        tester
            .widget<TextField>(
              find.byKey(const ValueKey('legacy-composer-input')),
            )
            .controller!
            .text,
        '描述品牌目标和游戏创意，创作一个 Agentic\u00A0Playable',
      );
      expect(find.text('能力编排'), findsOneWidget);

      await tester.tap(find.byKey(const ValueKey('legacy-composer-close')));
      await tester.pumpAndSettle();
      expect(find.text('首页内容'), findsOneWidget);
    },
  );

  testWidgets('direct create link close button falls back to the home route', (
    tester,
  ) async {
    final harness = TestCreateWorkflowHarness();
    final router = GoRouter(
      initialLocation: '/create?draft_id=direct-link-draft',
      routes: [
        GoRoute(path: '/', builder: (_, __) => const Text('直达首页')),
        GoRoute(
          path: '/create',
          builder: (_, __) =>
              CreatePlayableScreen(workflowRepository: harness.workflow),
        ),
      ],
    );
    addTearDown(router.dispose);

    await tester.pumpWidget(
      MaterialApp.router(theme: buildAirvanaTheme(), routerConfig: router),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('legacy-composer-close')));
    await tester.pumpAndSettle();

    expect(find.text('直达首页'), findsOneWidget);
    expect(router.routeInformationProvider.value.uri.path, '/');
  });

  testWidgets('bottom navigation keeps the Web 85 percent ratio on phones', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(360, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      MaterialApp(
        theme: buildAirvanaTheme(),
        home: const AirvanaShell(
          selectedIndex: 0,
          child: Center(child: Text('窄屏首页')),
        ),
      ),
    );
    await tester.pumpAndSettle();

    final navigation = find.byKey(const ValueKey('primary-navigation'));
    expect(tester.getSize(navigation).width, 306);
    expect(tester.getTopLeft(navigation).dx, 27);
    expect(tester.getTopRight(navigation).dx, 333);
  });

  testWidgets(
    'five primary tabs switch legacy pages and move one glass selection lens',
    (tester) async {
      final harness = TestCreateWorkflowHarness();
      tester.view.physicalSize = const Size(430, 932);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(_testAirvanaApp(harness));
      await tester.pumpAndSettle();

      final destinations = <(int, String)>[
        (0, '果园合合塔'),
        (1, '#原创新游'),
        (2, '增长网络'),
        (3, '消息'),
        (4, 'Kai Chen'),
      ];
      var previousLensX = -1.0;

      for (final destination in destinations) {
        await tester.tap(find.byKey(ValueKey('nav-${destination.$1}')));
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 350));

        expect(find.textContaining(destination.$2), findsWidgets);
        expect(
          find.byKey(const ValueKey('navigation-active-lens')),
          findsOneWidget,
        );
        final lensX = tester
            .getCenter(find.byKey(const ValueKey('navigation-active-lens')))
            .dx;
        expect(lensX, greaterThan(previousLensX));
        previousLensX = lensX;
      }

      expect(
        find.descendant(
          of: find.byKey(const ValueKey('primary-navigation')),
          matching: find.byType(Tooltip),
        ),
        findsNothing,
      );
    },
  );

  testWidgets('growth network secondary screen hides the primary tab dock', (
    tester,
  ) async {
    final harness = TestCreateWorkflowHarness();
    tester.view.physicalSize = const Size(430, 932);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(_testAirvanaApp(harness));
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const ValueKey('nav-2')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 350));
    expect(find.byKey(const ValueKey('primary-navigation')), findsOneWidget);

    await tester.tap(find.byTooltip('了解 AI 分身与 Airvana 网络'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 450));

    expect(
      find.byKey(const ValueKey('growth-network-detail-screen')),
      findsOneWidget,
    );
    expect(find.byKey(const ValueKey('primary-navigation')), findsNothing);

    await tester.tap(find.byKey(const ValueKey('growth-network-back')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 450));
    expect(find.byKey(const ValueKey('primary-navigation')), findsOneWidget);
  });

  testWidgets('navigation lens animates between Web baseline tab positions', (
    tester,
  ) async {
    final harness = TestCreateWorkflowHarness();
    tester.view.physicalSize = const Size(430, 932);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(_testAirvanaApp(harness));
    await tester.pumpAndSettle();

    final lens = find.byKey(const ValueKey('navigation-active-lens'));
    final start = tester.getCenter(lens).dx;
    await tester.tap(find.byKey(const ValueKey('nav-1')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 180));
    final middle = tester.getCenter(lens).dx;
    await tester.pumpAndSettle();
    final end = tester.getCenter(lens).dx;

    expect(middle, greaterThan(start));
    expect(middle, lessThan(end));
  });

  testWidgets('feed author row keeps safe distance from the floating tabs', (
    tester,
  ) async {
    final harness = TestCreateWorkflowHarness();
    tester.view.physicalSize = const Size(430, 932);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(_testAirvanaApp(harness));
    await tester.pumpAndSettle();

    final authorRow = find.byKey(const ValueKey('feed-author-row'));
    final navigation = find.byKey(const ValueKey('navigation-capsule'));
    expect(authorRow, findsOneWidget);
    expect(navigation, findsOneWidget);

    final gap =
        tester.getTopLeft(navigation).dy - tester.getBottomLeft(authorRow).dy;
    expect(gap, greaterThanOrEqualTo(20));
  });

  testWidgets('wide Web preview centers one unscaled legacy phone canvas', (
    tester,
  ) async {
    final harness = TestCreateWorkflowHarness();
    tester.view.physicalSize = const Size(1440, 1100);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(_testAirvanaApp(harness));
    await tester.pumpAndSettle();

    final canvas = find.byKey(const ValueKey('legacy-device-canvas'));
    expect(canvas, findsOneWidget);
    expect(tester.getSize(canvas), const Size(430, 932));
    expect(tester.getCenter(canvas).dx, 720);
    expect(tester.getCenter(canvas).dy, 550);
  });

  testWidgets(
    'home feed exposes the legacy social actions with local feedback',
    (tester) async {
      final harness = TestCreateWorkflowHarness();
      final messenger =
          TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;
      messenger.setMockMethodCallHandler(SystemChannels.platform, (_) async {
        return null;
      });
      addTearDown(
        () => messenger.setMockMethodCallHandler(SystemChannels.platform, null),
      );
      tester.view.physicalSize = const Size(430, 932);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(_testAirvanaApp(harness));
      await tester.pumpAndSettle();

      expect(
        find.text('运营 Agentic Playable「果园合合塔 Orchard Merge」'),
        findsOneWidget,
      );
      expect(find.bySemanticsLabel('退出当前作品'), findsOneWidget);
      for (final label in ['开启作品音效', '退出当前作品']) {
        expect(
          tester
              .getSemantics(find.bySemanticsLabel(label))
              .getSemanticsData()
              .hasAction(SemanticsAction.tap),
          isTrue,
          reason: '$label 必须可以通过读屏触发',
        );
      }
      expect(find.bySemanticsLabel('关注 Airvana Arcade'), findsOneWidget);

      await tester.tap(find.byKey(const ValueKey('play-plb_orchard_merge')));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('feed-inline-game')), findsOneWidget);
      expect(find.bySemanticsLabel('暂停深度游戏'), findsOneWidget);
      expect(find.bySemanticsLabel('重新开始本局'), findsOneWidget);
      expect(
        find.byKey(const ValueKey('navigation-active-lens')),
        findsOneWidget,
      );
      await tester.tap(find.bySemanticsLabel('退出当前作品'));
      await tester.pump();
      expect(find.byKey(const ValueKey('feed-inline-game')), findsNothing);

      await tester.tap(find.bySemanticsLabel('关注 Airvana Arcade'));
      await tester.pump();
      expect(find.bySemanticsLabel('管理对 Airvana Arcade 的关注'), findsOneWidget);

      await tester.tap(find.bySemanticsLabel('管理对 Airvana Arcade 的关注'));
      await tester.pumpAndSettle();
      expect(find.bySemanticsLabel('取消关注确认'), findsOneWidget);
      expect(find.text('不再关注 Airvana Arcade？'), findsOneWidget);
      await tester.tap(find.text('保留关注'));
      await tester.pumpAndSettle();
      expect(find.bySemanticsLabel('管理对 Airvana Arcade 的关注'), findsOneWidget);

      await tester.tap(find.bySemanticsLabel('分享 果园合合塔 Orchard Merge'));
      await tester.pump(const Duration(milliseconds: 140));
      expect(find.bySemanticsLabel('分享 Playable'), findsOneWidget);
      expect(find.bySemanticsLabel('分享到 Instagram'), findsOneWidget);
      expect(find.text('复制链接'), findsOneWidget);
      expect(find.bySemanticsLabel('屏蔽'), findsOneWidget);
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('share-action-copy')));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 300));
      await tester.pump();
      await tester.pump();
      expect(find.text('分享链接已复制；当前仅记录复制行为'), findsOneWidget);
      expect(find.text('已分享'), findsNothing);

      await tester.tap(find.bySemanticsLabel('查看 果园合合塔 Orchard Merge 的评论'));
      await tester.pumpAndSettle();
      expect(find.text('2 条评论'), findsOneWidget);
      expect(find.text('Mina'), findsOneWidget);
      expect(find.bySemanticsLabel('Mina 的头像'), findsOneWidget);
      expect(find.bySemanticsLabel('Leo 的头像'), findsOneWidget);
      final minaAvatar = tester.widget<Image>(
        find.byKey(const ValueKey('comment-avatar-Mina')),
      );
      final leoAvatar = tester.widget<Image>(
        find.byKey(const ValueKey('comment-avatar-Leo')),
      );
      expect(
        (minaAvatar.image as AssetImage).assetName,
        legacyWebAvatarAsset('Mina'),
      );
      expect(
        (leoAvatar.image as AssetImage).assetName,
        legacyWebAvatarAsset('Leo'),
      );
      final headerDivider = tester.widget<Divider>(
        find.byKey(const ValueKey('comment-header-divider')),
      );
      expect(headerDivider.color, const Color(0xFFE5E5EA));
      expect(headerDivider.thickness, .7);
      expect(
        tester
            .getSize(find.byKey(const ValueKey('comment-row-divider-0')))
            .width,
        390,
      );
      final composer = tester.widget<Container>(
        find.byKey(const ValueKey('comment-composer')),
      );
      final composerBorder =
          (composer.decoration! as BoxDecoration).border! as Border;
      expect(composerBorder.top.color, const Color(0xFFE5E5EA));
      expect(composerBorder.top.width, .7);
      final commentInput = tester.widget<TextField>(
        find.byKey(const ValueKey('comment-input')),
      );
      expect(commentInput.style?.fontSize, 16);
      expect(commentInput.decoration?.hintStyle?.color, AirvanaColors.muted);
      await tester.enterText(
        find.byKey(const ValueKey('comment-input')),
        '本地评论测试',
      );
      await tester.pump();
      await tester.tap(find.byKey(const ValueKey('comment-submit')));
      await tester.pump();
      expect(find.text('3 条评论'), findsOneWidget);
      expect(find.bySemanticsLabel('Kai Chen 的头像'), findsOneWidget);
      final ownAvatar = tester.widget<Image>(
        find.byKey(const ValueKey('comment-avatar-Kai Chen')),
      );
      expect(
        (ownAvatar.image as AssetImage).assetName,
        'assets/legacy/avatars/kai.png',
      );
      await tester.tap(find.byTooltip('关闭评论'));
      await tester.pumpAndSettle();
      final commentAction = find.bySemanticsLabel('查看 果园合合塔 Orchard Merge 的评论');
      expect(
        find.descendant(of: commentAction, matching: find.text('1')),
        findsOneWidget,
      );

      await tester.tap(
        find.bySemanticsLabel('基于 果园合合塔 Orchard Merge 创建受控 Remix 草稿'),
      );
      await tester.pumpAndSettle();
      expect(find.text('创建 Remix 草稿'), findsOneWidget);
      expect(find.text('仅复用互动结构'), findsOneWidget);
      expect(find.text('创建受控 Remix 草稿'), findsOneWidget);
    },
  );
}
