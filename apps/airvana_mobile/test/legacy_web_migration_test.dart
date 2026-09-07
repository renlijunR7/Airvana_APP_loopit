import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/shared/data/legacy_demo_catalog.dart';
import 'package:airvana_mobile/features/shared/presentation/local_demo_screens.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  setUp(() {
    TestWidgetsFlutterBinding.ensureInitialized();
  });

  test('legacy Web catalog keeps all 38 playables in its exact order', () {
    final playables = LegacyDemoCatalog.legacyWebPlayables;
    expect(playables, hasLength(38));
    expect(playables.map((item) => item.id), const [
      'plb_orchard_merge',
      'plb_star_mower',
      'plb_moonlight_tea_shop',
      'plb_microbe_arena',
      'plb_star_deck',
      'plb_crystal_bastion',
      'plb_adventurer_journal',
      'plb_idiom_detective',
      'plb_hex_frontier',
      'plb_studio_wardrobe',
      'plb_garden_renewal',
      'plb_deep_catch',
      'plb_ember_bastion',
      'plb_nova_drift',
      'plb_void_squadron',
      'plb_safety_workshop',
      'plb_stellar_farm',
      'plb_pixel_quest',
      'plb_red_cup_shuffle',
      'plb_magic_choir',
      'plb_paws_stage',
      'plb_puppet_studio',
      'plb_firefly_mail',
      'plb_whisker_escape',
      'plb_coin_journey',
      'plb_jungle_dive',
      'plb_rift_strike',
      'plb_stardust_island',
      'plb_formation_knights',
      'plb_galaxy_toy_shop',
      'plb_city_rush',
      'plb_sky_cannon',
      'plb_neon_dash',
      'plb_pulse_forge',
      'plb_sky_stack',
      'plb_rune_circuit',
      'plb_prism_match',
      'plb_star_cups',
    ]);
  });

  test('legacy Web discover covers and categories stay exact and complete', () {
    final playables = LegacyDemoCatalog.legacyWebPlayables;
    expect(playables.map((item) => item.coverAsset), const [
      'assets/runner/assets/games/casual-v1/covers-png/orchard-merge.png',
      'assets/runner/assets/games/casual-v1/covers-png/star-mower.png',
      'assets/runner/assets/games/casual-v1/covers-png/moonlight-tea-shop.png',
      'assets/runner/assets/games/casual-v1/covers-png/microbe-arena.png',
      'assets/runner/assets/games/casual-v1/covers-png/star-deck.png',
      'assets/runner/assets/games/casual-v1/covers-png/crystal-bastion.png',
      'assets/runner/assets/games/casual-v1/covers-png/adventurer-journal.png',
      'assets/runner/assets/games/casual-v1/covers-png/idiom-detective.png',
      'assets/runner/assets/games/casual-v1/covers-png/hex-frontier.png',
      'assets/runner/assets/games/casual-v1/covers-png/studio-wardrobe.png',
      'assets/runner/assets/games/casual-v1/covers-png/garden-renewal.png',
      'assets/runner/assets/games/casual-v1/covers-png/deep-catch.png',
      'assets/runner/assets/games/casual-v1/covers-png/ember-bastion.png',
      'assets/runner/assets/games/casual-v1/covers-png/nova-drift.png',
      'assets/runner/assets/games/casual-v1/covers-png/void-squadron.png',
      'assets/runner/assets/games/casual-v1/covers-png/safety-workshop.png',
      'assets/runner/assets/games/casual-v1/covers-png/stellar-farm.png',
      'assets/runner/assets/games/casual-v1/covers-png/pixel-quest.png',
      'assets/runner/assets/games/casual-v1/covers-png/red-cup-shuffle.png',
      'assets/runner/assets/games/casual-v1/covers-png/magic-choir.png',
      'assets/runner/assets/games/casual-v1/covers-png/paws-stage.png',
      'assets/runner/assets/games/casual-v1/covers-png/puppet-studio.png',
      'assets/runner/assets/games/casual-v1/covers-png/firefly-mail.png',
      'assets/runner/assets/games/casual-v1/covers-png/whisker-escape.png',
      'assets/runner/assets/games/casual-v1/covers-png/coin-journey.png',
      'assets/runner/assets/games/casual-v1/covers-png/jungle-dive.png',
      'assets/runner/assets/games/casual-v1/covers-png/rift-strike.png',
      'assets/runner/assets/games/casual-v1/covers-png/stardust-island.png',
      'assets/runner/assets/games/casual-v1/covers-png/formation-knights.png',
      'assets/runner/assets/games/casual-v1/covers-png/galaxy-toy-shop.png',
      'assets/runner/assets/games/casual-v1/covers-png/city-rush.png',
      'assets/runner/assets/games/casual-v1/covers-png/sky-cannon.png',
      'assets/runner/assets/games/casual-v1/covers-png/neon-dash.png',
      'assets/runner/assets/games/casual-v1/covers-png/pulse-forge.png',
      'assets/runner/assets/games/casual-v1/covers-png/sky-stack.png',
      'assets/runner/assets/games/casual-v1/covers-png/rune-circuit.png',
      'assets/runner/assets/games/casual-v1/covers-png/prism-match.png',
      'assets/runner/assets/games/casual-v1/covers-png/star-cups.png',
    ]);
    expect(playables.map((item) => item.category), const [
      '休闲益智',
      '实时生存',
      '模拟经营',
      'IO 竞技',
      '回合牌组',
      '射击塔防',
      '分支 RPG',
      '语言推理',
      '六角策略',
      '换装穿搭',
      '三消焕新',
      '钓鱼反应',
      '塔防策略',
      '竞速漂移',
      '太空射击',
      '安全教育',
      '社区增长',
      '产品教育',
      '品牌互动',
      '音乐编排',
      '萌宠互动',
      'UGC 共创',
      '情感互动',
      '潜行迷宫',
      '收集挑战',
      '探索冒险',
      '科幻战术',
      '海岛经营',
      '阵容策略',
      '商店经营',
      '竞速挑战',
      '塔防策略',
      '疾跑躲避',
      '节奏点按',
      '叠塔时机',
      '拖放拼图',
      '三消判断',
      '杯子记忆',
    ]);
    expect(playables.every((item) => item.localDemo), isTrue);
  });

  test(
    'legacy Web visual metrics stay frozen for cross-platform rendering',
    () {
      expect(AirvanaMetrics.referenceWidth, 430);
      expect(AirvanaMetrics.referenceHeight, 932);
      expect(AirvanaMetrics.pageGutter, 20);
      expect(AirvanaMetrics.compactGutter, 16);
      // 与旧版 Web bottom-nav 内联样式一致：85%×430、36 条目、23 图标、39 加号
      expect(AirvanaMetrics.navDockWidth, 365.5);
      expect(AirvanaMetrics.navCapsuleHeight, 54);
      expect(AirvanaMetrics.navItemSize, 36);
      expect(AirvanaMetrics.navIconSize, 23);
      expect(AirvanaMetrics.navLensWidth, 46);
      expect(AirvanaMetrics.navLensHeight, 38);
      expect(AirvanaMetrics.createButtonSize, 39);
      expect(AirvanaMetrics.feedFooterHeight, 210);
      expect(AirvanaMetrics.cardRadius, 18);
    },
  );

  testWidgets(
    'discover renders all 38 legacy games and provides working local filters and search',
    (tester) async {
      tester.view.physicalSize = const Size(430, 932);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        MaterialApp(
          theme: buildAirvanaTheme(),
          home: const Scaffold(body: LocalDiscoverScreen()),
        ),
      );
      await tester.pump();

      expect(find.text('38 / 38'), findsOneWidget);
      expect(find.textContaining('LOCAL DEMO · 38 款原创离线游戏'), findsOneWidget);
      expect(
        find.byKey(const ValueKey('discover-card-plb_orchard_merge')),
        findsOneWidget,
      );
      expect(
        find.byKey(const ValueKey('discover-cover-plb_orchard_merge')),
        findsOneWidget,
      );
      expect(
        find.byKey(const ValueKey('discover-category-plb_orchard_merge')),
        findsOneWidget,
      );
      expect(find.text('休闲益智'), findsOneWidget);
      for (final section in ['safety', 'community', 'attribution']) {
        expect(
          find.byKey(ValueKey('discover-showcase-section-$section')),
          findsOneWidget,
        );
      }
      expect(find.text('#安全教育'), findsOneWidget);
      expect(find.text('#社区增长'), findsOneWidget);
      expect(find.text('#效果归因'), findsOneWidget);

      final walletCard = find.byKey(
        const ValueKey('discover-showcase-safety-wallet-safety-report'),
      );
      expect(walletCard, findsOneWidget);
      expect(
        find.descendant(of: walletCard, matching: find.text('钱包安全体检报告')),
        findsOneWidget,
      );
      expect(
        find.descendant(of: walletCard, matching: find.text('Wren')),
        findsOneWidget,
      );
      expect(
        find.descendant(of: walletCard, matching: find.text('940')),
        findsOneWidget,
      );
      expect(
        find.descendant(of: walletCard, matching: find.text('76')),
        findsOneWidget,
      );

      final towerCard = find.byKey(
        const ValueKey('discover-showcase-community-perfect-block-tower'),
      );
      expect(towerCard, findsOneWidget);
      expect(
        find.descendant(
          of: towerCard,
          matching: find.text('完美叠叠塔 Perfect Block Tower'),
        ),
        findsOneWidget,
      );
      expect(
        find.descendant(of: towerCard, matching: find.text('Jaspe')),
        findsOneWidget,
      );
      expect(
        find.descendant(of: towerCard, matching: find.text('28500')),
        findsOneWidget,
      );
      expect(
        find.descendant(of: towerCard, matching: find.text('4900')),
        findsOneWidget,
      );

      await tester.dragUntilVisible(
        find.byKey(const ValueKey('discover-card-plb_star_cups')),
        find.byKey(const ValueKey('discover-playable-rail-0')),
        const Offset(-480, 0),
      );
      expect(
        find.byKey(const ValueKey('discover-card-plb_star_cups')),
        findsOneWidget,
      );

      await tester.dragUntilVisible(
        find.byKey(
          const ValueKey('discover-showcase-safety-creator-revenue-calculator'),
        ),
        find.byKey(const ValueKey('discover-showcase-rail-safety')),
        const Offset(-220, 0),
      );
      await tester.tap(
        find.byKey(
          const ValueKey('discover-showcase-safety-creator-revenue-calculator'),
        ),
      );
      await tester.pumpAndSettle();
      expect(
        find.byKey(
          const ValueKey('discover-showcase-detail-creator-revenue-calculator'),
        ),
        findsOneWidget,
      );
      expect(find.textContaining('当前未接入 Flutter 可运行容器'), findsOneWidget);
      await tester.tap(find.byTooltip('关闭本地展示详情'));
      await tester.pumpAndSettle();

      await tester.dragUntilVisible(
        find.byKey(const ValueKey('discover-showcase-section-attribution')),
        find.byKey(const ValueKey('legacy-discover-scroll')),
        const Offset(0, -520),
      );
      expect(
        tester
            .getTopLeft(
              find.byKey(
                const ValueKey('discover-showcase-section-attribution'),
              ),
            )
            .dy,
        lessThan(932),
      );
      await tester.ensureVisible(
        find.byKey(const ValueKey('discover-showcase-rail-attribution')),
      );
      await tester.pumpAndSettle();

      await tester.dragUntilVisible(
        find.byKey(
          const ValueKey('discover-showcase-attribution-starlight-collector'),
        ),
        find.byKey(const ValueKey('discover-showcase-rail-attribution')),
        const Offset(-240, 0),
      );
      final starlightCard = find.byKey(
        const ValueKey('discover-showcase-attribution-starlight-collector'),
      );
      expect(
        find.descendant(
          of: starlightCard,
          matching: find.text('夜空拾光 Starlight Collector'),
        ),
        findsOneWidget,
      );
      expect(
        find.descendant(of: starlightCard, matching: find.text('TomAnger')),
        findsOneWidget,
      );
      expect(
        find.descendant(of: starlightCard, matching: find.text('680')),
        findsOneWidget,
      );
      expect(
        find.descendant(of: starlightCard, matching: find.text('140')),
        findsOneWidget,
      );
      await tester.tap(find.text('关注'));
      await tester.pump();
      expect(find.text('0 / 38'), findsOneWidget);
      expect(find.text('暂无关注作品'), findsOneWidget);
      expect(find.textContaining('关注创作者后'), findsOneWidget);
      expect(find.text('#安全教育'), findsNothing);
      expect(find.text('#社区增长'), findsNothing);
      expect(find.text('#效果归因'), findsNothing);

      await tester.tap(find.text('热门'));
      await tester.pump();
      final city = find.byKey(const ValueKey('discover-card-plb_city_rush'));
      final orchard = find.byKey(
        const ValueKey('discover-card-plb_orchard_merge'),
      );
      expect(city, findsOneWidget);
      expect(orchard, findsNothing);

      await tester.tap(find.text('最新'));
      await tester.pump();
      expect(
        find.byKey(const ValueKey('discover-card-plb_garden_renewal')),
        findsOneWidget,
      );
      expect(
        find.byKey(const ValueKey('discover-card-plb_star_cups')),
        findsNothing,
      );

      await tester.tap(find.byTooltip('搜索 Agentic Playable'));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const ValueKey('discover-search-field')),
        '果园',
      );
      await tester.pump();
      expect(find.text('搜索结果 · 1'), findsOneWidget);
      expect(
        find.byKey(const ValueKey('discover-search-plb_orchard_merge')),
        findsOneWidget,
      );

      await tester.enterText(
        find.byKey(const ValueKey('discover-search-field')),
        '塔防策略',
      );
      await tester.pump();
      expect(find.text('搜索结果 · 2'), findsOneWidget);
      expect(
        find.byKey(const ValueKey('discover-search-plb_ember_bastion')),
        findsOneWidget,
      );
      expect(
        find.byKey(const ValueKey('discover-search-plb_sky_cannon')),
        findsOneWidget,
      );
    },
  );

  testWidgets('growth network matches the legacy Web structure and demo data', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(430, 932);
    tester.view.devicePixelRatio = 1;
    tester.view.padding = const FakeViewPadding(bottom: 34);
    tester.view.viewPadding = const FakeViewPadding(bottom: 34);
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetPadding);
    addTearDown(tester.view.resetViewPadding);

    await tester.pumpWidget(
      MaterialApp(
        theme: buildAirvanaTheme(),
        home: const Scaffold(body: LocalNetworkScreen()),
      ),
    );

    expect(find.text('增长网络'), findsOneWidget);
    expect(find.text('演示网络数据 · 不代表真实 AIP、AIT 或商业结算'), findsNothing);
    expect(
      tester
          .getSize(find.byKey(const ValueKey('network-metrics-content-gap')))
          .height,
      12,
    );
    for (final label in ['推荐', '运行中', '增长最快', '品牌合作']) {
      expect(find.text(label), findsWidgets);
    }
    for (final title in [
      'Crypto City 安全挑战',
      '星际农场 Community Launch',
      '产品探索路径',
    ]) {
      expect(find.text(title), findsOneWidget);
    }
    expect(find.text('1,284 互动 · 86 演示转化'), findsOneWidget);
    expect(find.text('3,860 互动 · 142 演示转化'), findsOneWidget);
    expect(find.text('640 互动 · 52 演示转化'), findsOneWidget);

    final forceIconTransform = find.byKey(
      const ValueKey('network-force-icon-transform'),
    );
    final forceIconPaint = find.byKey(const ValueKey('network-force-icon'));
    final initialForceScale = tester
        .widget<Transform>(forceIconTransform)
        .transform
        .getMaxScaleOnAxis();
    final initialForceGlow =
        (tester.widget<CustomPaint>(forceIconPaint).painter! as dynamic).glow
            as double;
    await tester.pump(const Duration(milliseconds: 810));
    final pulsedForceScale = tester
        .widget<Transform>(forceIconTransform)
        .transform
        .getMaxScaleOnAxis();
    final pulsedForceGlow =
        (tester.widget<CustomPaint>(forceIconPaint).painter! as dynamic).glow
            as double;
    expect(pulsedForceScale, isNot(equals(initialForceScale)));
    expect(pulsedForceGlow, greaterThan(initialForceGlow));

    final globePaint = find.byKey(const ValueKey('network-globe-paint'));
    final initialYaw =
        (tester.widget<CustomPaint>(globePaint).painter! as dynamic).yaw
            as double;
    await tester.pump(const Duration(seconds: 1));
    final rotatedYaw =
        (tester.widget<CustomPaint>(globePaint).painter! as dynamic).yaw
            as double;
    expect(rotatedYaw, greaterThan(initialYaw));

    await tester.drag(
      find.byKey(const ValueKey('network-globe')),
      const Offset(48, -22),
    );
    await tester.pump();
    expect(tester.takeException(), isNull);

    await tester.tap(find.byTooltip('了解 AI 分身与 Airvana 网络'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 350));
    final growthDetail = find.byKey(
      const ValueKey('growth-network-detail-screen'),
    );
    expect(growthDetail, findsOneWidget);
    final growthBack = find.byKey(const ValueKey('growth-network-back'));
    expect(growthBack, findsOneWidget);
    final growthBackIcon = find.descendant(
      of: growthBack,
      matching: find.byIcon(Icons.arrow_back_ios_new_rounded),
    );
    expect(growthBackIcon, findsOneWidget);
    expect(
      tester.getCenter(growthBackIcon).dx - tester.getTopLeft(growthDetail).dx,
      lessThanOrEqualTo(56),
    );
    final visibleDetailScroll = find
        .byType(SingleChildScrollView)
        .hitTestable();
    expect(visibleDetailScroll, findsOneWidget);
    expect(
      tester.getBottomRight(visibleDetailScroll).dy,
      tester.getBottomRight(growthDetail).dy,
    );
    expect(
      tester.widget<SingleChildScrollView>(visibleDetailScroll).padding,
      const EdgeInsets.fromLTRB(20, 16, 20, 50),
    );
    expect(find.text('每个人都有一个，\n持续成长的 AI 分身。'), findsOneWidget);
    expect(find.text('网络'), findsOneWidget);
    expect(find.text('我的连接'), findsOneWidget);
    expect(find.text('贡献'), findsOneWidget);
    expect(find.text('规则'), findsOneWidget);
    final growthHero = tester.widget<Container>(
      find.byKey(const ValueKey('growth-network-hero')),
    );
    final growthHeroDecoration = growthHero.decoration! as BoxDecoration;
    expect(growthHeroDecoration.borderRadius, BorderRadius.circular(26));
    expect((growthHeroDecoration.gradient! as LinearGradient).colors, const [
      Color(0xFF18191D),
      Color(0xFF22232A),
      Color(0xFF16171B),
    ]);
    expect(find.byKey(const ValueKey('growth-hero-dots')), findsOneWidget);
    expect(find.byKey(const ValueKey('growth-hero-links')), findsOneWidget);
    expect(
      tester.getSize(find.byKey(const ValueKey('growth-agent-visual'))).height,
      282,
    );
    expect(
      tester.getSize(find.byKey(const ValueKey('growth-loop-01'))).height,
      102,
    );
    expect(
      tester
          .getSize(find.byKey(const ValueKey('growth-foundation-OPERATIONS')))
          .height,
      greaterThanOrEqualTo(88),
    );
    expect(
      find.byKey(const ValueKey('growth-agent-network-card')),
      findsOneWidget,
    );
    expect(find.byKey(const ValueKey('growth-network-links')), findsOneWidget);
    expect(find.byKey(const ValueKey('growth-agent-flywheel')), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('growth-network-tab-1')));
    await tester.pump();
    expect(find.text('建立你的第一个 Agent 协作连接'), findsOneWidget);
    final primaryConnectionButton = tester.widget<FilledButton>(
      find.descendant(
        of: find.byKey(const ValueKey('growth-network-create-circle')),
        matching: find.byType(FilledButton),
      ),
    );
    expect(
      primaryConnectionButton.style?.backgroundColor?.resolve(<WidgetState>{}),
      AirvanaColors.accent,
    );
    expect(
      primaryConnectionButton.style?.foregroundColor?.resolve(<WidgetState>{}),
      Colors.white,
    );
    await tester.tap(find.byKey(const ValueKey('growth-network-open-invite')));
    await tester.pump();
    expect(find.text('通过邀请码建立 Agent 连接'), findsOneWidget);
    await tester.enterText(
      find.byKey(const ValueKey('growth-network-invite-input')),
      'AIR-NINA-2050',
    );
    await tester.tap(
      find.byKey(const ValueKey('growth-network-submit-invite')),
    );
    await tester.pump();
    expect(find.text('Kai Agent Circle'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('growth-network-tab-2')));
    await tester.pump();
    expect(find.text('贡献来自可验证结果'), findsOneWidget);
    expect(find.text('结算边界'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('growth-network-tab-3')));
    await tester.pump();
    expect(find.text('先建立可信协作，\n再申请经济权限。'), findsOneWidget);
    expect(find.text('风险声明'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('growth-network-back')));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 350));
    expect(find.byKey(const ValueKey('legacy-network-scroll')), findsOneWidget);

    await tester.ensureVisible(find.byKey(const ValueKey('network-filter-1')));
    await tester.pump(const Duration(milliseconds: 350));
    await tester.tap(find.byKey(const ValueKey('network-filter-1')));
    await tester.pump();
    expect(find.text('霓虹疾跑 Neon Dash'), findsOneWidget);
    expect(find.text('节拍熔炉 Pulse Forge'), findsOneWidget);
    expect(find.text('天际叠塔 Sky Stack'), findsOneWidget);
    expect(find.text('0 互动 · 0 演示转化'), findsNWidgets(3));

    await tester.tap(find.byKey(const ValueKey('network-filter-2')));
    await tester.pump();
    expect(find.text('城市极速 City Rush'), findsOneWidget);
    expect(find.text('完美叠叠塔 Perfect Block Tower'), findsOneWidget);
    expect(find.text('小炮手大战空降恶魔'), findsOneWidget);
    expect(find.text('9,240 互动 · 348 演示转化'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('network-filter-3')));
    await tester.pump();
    expect(find.text('霓虹城市品牌解谜'), findsOneWidget);
    expect(find.text('红杯速配 Red Cup Shuffle'), findsOneWidget);
    expect(find.text('翻照片做玩偶 Make Your Photo Playable'), findsOneWidget);
  });

  testWidgets('messages keeps the legacy three-tab information architecture', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(430, 932);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      MaterialApp(
        theme: buildAirvanaTheme(),
        home: const Scaffold(body: LocalMessagesScreen()),
      ),
    );

    expect(find.text('消息'), findsOneWidget);
    expect(find.text('通知'), findsOneWidget);
    expect(find.text('互动'), findsOneWidget);
    expect(find.text('私信'), findsOneWidget);
    expect(find.byKey(const ValueKey('message-badge-0')), findsOneWidget);
    expect(find.text('2'), findsOneWidget);

    await tester.tap(find.text('Crypto City v2 待复核'));
    await tester.pumpAndSettle();
    expect(find.text('本页只执行本机查看与已读操作，不代表服务端审核、外部发布或消息送达。'), findsOneWidget);
    await tester.tap(find.byTooltip('关闭消息详情'));
    await tester.pumpAndSettle();

    final notificationRows =
        <({String id, String title, String body, String status})>[
          (
            id: 'notification-kol-review',
            title: 'Crypto City v2 待复核',
            body: '素材授权、CTA 与归因字段需要在提交发布前确认。',
            status: '运营 · 本地演示',
          ),
          (
            id: 'notification-kol-contract',
            title: 'Campaign Contract 待确认',
            body: '品牌目标、成功事件、地区和结算字段仍保持锁定。',
            status: 'Campaign · 本地演示',
          ),
          (
            id: 'notification-kol-publish',
            title: '发布连接器等待服务接入',
            body: '获批作品可进入渠道确认页，当前不会自动对外发布。',
            status: '发布 · 服务端待接',
          ),
          (
            id: 'notification-preview-generated-unread-1',
            title: '本地 Playable 预览已生成',
            body: '真实前端构建阶段已完成，可试玩成功、失败、重试与退出路径。',
            status: '未读',
          ),
          (
            id: 'notification-preview-generated-read-1',
            title: '本地 Playable 预览已生成',
            body: '真实前端构建阶段已完成，可试玩成功、失败、重试与退出路径。',
            status: '已读',
          ),
          (
            id: 'notification-preview-campaign-unread',
            title: '本地 Playable 预览已生成',
            body: '已生成可试玩版本并保存 Campaign 结构化产物，等待人工审核。',
            status: '未读',
          ),
          (
            id: 'notification-preview-campaign-read',
            title: '本地 Playable 预览已生成',
            body: '已生成可试玩版本并保存 Campaign 结构化产物，等待人工审核。',
            status: '已读',
          ),
          (
            id: 'notification-ait-settlement-approved',
            title: 'AIT 结算审核已通过',
            body: '10 AIT 对应权益已通过结算复核，已进入待付款队列；实际到账以付款凭证为准。',
            status: '已读',
          ),
          (
            id: 'notification-review',
            title: 'Playable v2 等待审核',
            body: '「Crypto City 安全挑战」正在核对互动、CTA 与归因节点。',
            status: '已读',
          ),
          (
            id: 'notification-attribution',
            title: '归因证据已更新',
            body: '只有通过服务器确认、去重与风控的成功事件才进入结算证据。',
            status: '已读',
          ),
          (
            id: 'notification-welcome',
            title: '欢迎使用 Airvana',
            body: '开始创作并运营属于你的 Agentic Playable。',
            status: '已读',
          ),
        ];
    final notificationList = tester.widget<ListView>(
      find.byKey(const ValueKey('message-list-0')),
    );
    final notificationScrollable = find.descendant(
      of: find.byKey(const ValueKey('message-list-0')),
      matching: find.byType(Scrollable),
    );
    expect(notificationList.childrenDelegate.estimatedChildCount, 11);
    for (var index = 0; index < notificationRows.length; index++) {
      final expected = notificationRows[index];
      final row = find.byKey(ValueKey('message-row-0-$index-${expected.id}'));
      await tester.scrollUntilVisible(
        row,
        96,
        scrollable: notificationScrollable,
      );
      await tester.pump();
      expect(row, findsOneWidget);
      expect(
        find.descendant(of: row, matching: find.text(expected.title)),
        findsOneWidget,
      );
      expect(
        find.descendant(of: row, matching: find.text(expected.body)),
        findsOneWidget,
      );
      expect(
        find.descendant(of: row, matching: find.text(expected.status)),
        findsOneWidget,
      );
    }

    await tester.tap(find.text('全部已读'));
    await tester.pump();
    expect(find.byKey(const ValueKey('message-badge-0')), findsNothing);

    await tester.tap(find.text('互动'));
    await tester.pump();
    final socialList = tester.widget<ListView>(
      find.byKey(const ValueKey('message-list-1')),
    );
    expect(socialList.childrenDelegate.estimatedChildCount, 3);
    expect(find.text('打开分享面板'), findsOneWidget);
    expect(find.text('准备分享「果园合合塔 Orchard Merge」'), findsOneWidget);
    expect(find.text('分享 · 本地记录'), findsOneWidget);
    expect(find.text('收藏状态已更新'), findsOneWidget);
    expect(find.text('已收藏「果园合合塔 Orchard Merge」'), findsOneWidget);
    expect(find.text('收藏 · 本地记录'), findsOneWidget);
    expect(find.text('点赞状态已更新'), findsOneWidget);
    expect(find.text('已点赞「果园合合塔 Orchard Merge」'), findsOneWidget);
    expect(find.text('互动 · 本地记录'), findsOneWidget);

    await tester.tap(find.text('私信'));
    await tester.pump();
    final directList = tester.widget<ListView>(
      find.byKey(const ValueKey('message-list-2')),
    );
    expect(directList.childrenDelegate.estimatedChildCount, 3);
    expect(find.text('Kai 的 AI 分身'), findsOneWidget);
    expect(find.text('有一条访客问题需要你确认后回复。'), findsOneWidget);
    expect(find.text('AI 辅助 · 本地演示 · 1 条未读'), findsOneWidget);
    expect(find.text('Nina'), findsOneWidget);
    expect(find.text('星际农场 v3 的版本说明已更新。'), findsOneWidget);
    expect(find.text('@nina · 相互关注'), findsOneWidget);
    expect(find.text('Leo'), findsOneWidget);
    expect(find.text('霓虹城市的可复制资产已经整理好了。'), findsOneWidget);
    expect(find.text('@leo.art · 已关注'), findsOneWidget);
    expect(find.byKey(const ValueKey('message-badge-2')), findsOneWidget);

    await tester.tap(find.text('Kai 的 AI 分身'));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('message-badge-2')), findsNothing);
    expect(find.text('LOCAL DEMO'), findsWidgets);
    expect(find.text('本机对话 · 不会自动对外发送'), findsOneWidget);
    await tester.enterText(
      find.byKey(const ValueKey('direct-message-input')),
      '收到，本机回复',
    );
    await tester.tap(find.byKey(const ValueKey('direct-message-send')));
    await tester.pump();
    expect(find.text('收到，本机回复'), findsOneWidget);
    expect(find.text('LOCAL DEMO · 本机保存'), findsOneWidget);

    await tester.tap(find.byTooltip('关闭本机对话'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Kai 的 AI 分身'));
    await tester.pumpAndSettle();
    expect(find.text('收到，本机回复'), findsOneWidget);
    expect(find.text('LOCAL DEMO · 本机保存'), findsOneWidget);
  });
}
