import 'package:airvana_mobile/features/shared/presentation/local_demo_screens.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/shared/data/legacy_demo_catalog.dart';
import 'package:airvana_mobile/app/providers.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'support/test_create_workflow.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  setUp(() {
    TestWidgetsFlutterBinding.ensureInitialized();
  });

  test('legacy Web catalog keeps all 64 playables in its exact order', () {
    final playables = LegacyDemoCatalog.legacyWebPlayables;
    expect(playables, hasLength(64));
    expect(playables.map((item) => item.id), const [
      'plb_kol_town',
      'plb_coin_dozer',
      'plb_htx_quest',
      'plb_token_harbor',
      'plb_coin_castle',
      'plb_lucky_fruit',
      'plb_city_squad',
      'plb_mini_gp_racers',
      'plb_street_gold_rush',
      'plb_star_table',
      'plb_sud_texas',
      'plb_risk_run',
      'plb_niguolaia',
      'plb_sky_raid',
      'plb_harvest_lane',
      'plb_island_sling',
      'plb_pocket_city',
      'plb_gem_blocks',
      'plb_dice_voyage',
      'plb_cloud_solitaire',
      'plb_buddy_flip',
      'plb_cloud_sling',
      'plb_candy_swing',
      'plb_happy_cup',
      'plb_spring_dig',
      'plb_fruit_drop',
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
      'assets/featured-originals-v2/kol-town-user-20260916-srgb.png',
      'assets/featured-originals-v2/coin-dozer-user-20260915-srgb.png',
      'assets/featured-originals-v2/htx-quest-user-20260915-srgb.png',
      'assets/featured-originals-v2/token-harbor-user-20260915-srgb.png',
      'assets/featured-originals-v2/coin-castle-user-20260915-srgb.png',
      'assets/featured-originals-v2/lucky-fruit-user-20260915-srgb.png',
      'assets/featured-originals-v2/city-squad-user-20260915-srgb.png',
      'assets/featured-originals-v2/mini-gp-racers-user-20260915-srgb.png',
      'assets/featured-originals-v2/street-gold-rush-user-20260915-srgb.png',
      'assets/featured-originals-v2/star-table-user-20260915-srgb.png',
      'assets/featured-originals-v2/sud-texas-user-20260915-srgb.png',
      'assets/featured-originals-v2/risk-run-user-20260915-srgb.png',
      'assets/featured-originals-v2/niguolaia.png',
      'assets/runner/assets/games/reference-screenshots-v1/sky-raid.jpg',
      'assets/runner/assets/games/reference-screenshots-v1/harvest-lane.jpg',
      'assets/runner/assets/games/reference-screenshots-v1/island-sling.jpg',
      'assets/runner/assets/games/reference-screenshots-v1/pocket-city.jpg',
      'assets/runner/assets/games/reference-screenshots-v1/gem-blocks.jpg',
      'assets/runner/assets/games/reference-screenshots-v1/dice-voyage.jpg',
      'assets/runner/assets/games/reference-screenshots-v1/cloud-solitaire.jpg',
      'assets/runner/assets/games/reference-screenshots-v1/buddy-flip.jpg',
      'assets/runner/assets/games/physics-casual-v2/cloud-sling.png',
      'assets/runner/assets/games/physics-casual-v2/candy-swing.png',
      'assets/runner/assets/games/physics-casual-v2/happy-cup.png',
      'assets/runner/assets/games/physics-casual-v2/spring-dig.png',
      'assets/runner/assets/games/physics-casual-v2/fruit-drop.png',
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
      '独立打包游戏',
      '独立打包游戏',
      '独立打包游戏',
      '独立打包游戏',
      '独立打包游戏',
      '独立打包游戏',
      '独立打包游戏',
      '独立打包游戏',
      '独立打包游戏',
      '独立打包游戏',
      '独立打包游戏',
      '独立打包游戏',
      '独立打包游戏',
      '原创小游戏',
      '原创小游戏',
      '原创小游戏',
      '原创小游戏',
      '原创小游戏',
      '原创小游戏',
      '原创小游戏',
      '原创小游戏',
      '原创小游戏',
      '原创小游戏',
      '原创小游戏',
      '原创小游戏',
      '原创小游戏',
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
      expect(AirvanaMetrics.feedFooterHeight, 188);
      expect(AirvanaMetrics.cardRadius, 18);
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
      // 「我的连接」现在读本机协作组状态，详情页需要 ProviderScope；
      // 用内存仓库让建立/加入协作组真的写得进去。
      ProviderScope(
        overrides: [
          airvanaRepositoryProvider.overrideWithValue(
            TestCreateWorkflowHarness().repository,
          ),
        ],
        child: MaterialApp(
          theme: buildAirvanaTheme(),
          home: const Scaffold(body: LocalNetworkScreen()),
        ),
      ),
    );

    expect(find.text('增长网络'), findsOneWidget);
    // Web 在三项指标下方有这句边界声明，早前没搬过来，现在按 Web 补齐。
    expect(find.text('演示网络数据 · 不代表真实 AIP、AIT 或商业结算'), findsOneWidget);
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
    // 加入写本机存储后 provider 才重新解析，需要等异步完成。
    await tester.pumpAndSettle();
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
}
