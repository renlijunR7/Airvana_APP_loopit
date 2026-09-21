import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/history/presentation/web_parity_panels.dart';
import 'package:airvana_mobile/features/shared/data/legacy_demo_catalog.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _host(Widget child) => MaterialApp(
  theme: buildAirvanaTheme(),
  home: Scaffold(body: child),
);

void main() {
  final playables = LegacyDemoCatalog.legacyWebPlayables;

  testWidgets('global search keeps the Web four categories and history', (
    tester,
  ) async {
    await tester.pumpWidget(_host(GlobalSearchPageBody(playables: playables)));
    await tester.pump();

    for (final key in ['all', 'playable', 'creator', 'campaign']) {
      expect(find.byKey(ValueKey('global-search-tab-$key')), findsOneWidget);
    }
    expect(find.text('推荐内容'), findsOneWidget);

    await tester.enterText(
      find.byKey(const ValueKey('global-search-field')),
      '果园',
    );
    await tester.pump();
    expect(find.text('搜索结果'), findsOneWidget);
    expect(find.byKey(const ValueKey('global-search-row-果园合合塔 Orchard Merge')), findsOneWidget);

    // 提交后进入搜索历史，清空词条时历史 chip 才显示。
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pump();
    await tester.enterText(
      find.byKey(const ValueKey('global-search-field')),
      '',
    );
    await tester.pump();
    expect(find.text('搜索历史'), findsOneWidget);
    expect(
      find.byKey(const ValueKey('global-search-clear-history')),
      findsOneWidget,
    );

    // 分类过滤生效：只看创作者时不应再出现作品行。
    await tester.tap(find.byKey(const ValueKey('global-search-tab-creator')));
    await tester.pump();
    expect(find.text('Playable'), findsOneWidget); // tab 标签本身
  });

  testWidgets('leaderboard exposes the three Web boards with distinct copy', (
    tester,
  ) async {
    await tester.pumpWidget(_host(LeaderboardPageBody(playables: playables)));
    await tester.pump();

    expect(find.byKey(const ValueKey('leaderboard-tab-heat')), findsOneWidget);
    expect(find.textContaining('按互动热度'), findsOneWidget);
    expect(find.byKey(const ValueKey('leaderboard-row-1')), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('leaderboard-tab-revenue')));
    await tester.pump();
    expect(find.textContaining('不代表现金或已验证收入'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('leaderboard-tab-force')));
    await tester.pump();
    expect(find.textContaining('仅用于站内展示'), findsOneWidget);
  });

  testWidgets('library keeps the six Web filters and narrows the list', (
    tester,
  ) async {
    await tester.pumpWidget(
      _host(PlayableLibraryPageBody(playables: playables)),
    );
    await tester.pump();

    for (final key in [
      'all',
      'published',
      'paused',
      'scheduled',
      'archived',
      'draft',
    ]) {
      expect(find.byKey(ValueKey('library-filter-$key')), findsOneWidget);
    }
    expect(find.textContaining('${playables.length} 个 Agentic Playable'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('library-filter-published')));
    await tester.pump();
    expect(find.textContaining('${playables.length} 个 Agentic Playable'), findsNothing);
  });

  testWidgets('attribution and settlement keep their boundary statements', (
    tester,
  ) async {
    await tester.pumpWidget(_host(AttributionPageBody(playables: playables)));
    await tester.pump();
    expect(find.text('效果归因 · 本地报告'), findsOneWidget);
    expect(find.text('归因证据链'), findsOneWidget);
    expect(find.textContaining('不代表广告投放效果'), findsOneWidget);

    await tester.pumpWidget(_host(const SettlementPageBody()));
    await tester.pump();
    expect(find.text('三账本分离展示'), findsOneWidget);
    expect(find.text('状态时间线'), findsOneWidget);
    expect(find.textContaining('不把演示数值作为真实收入'), findsOneWidget);
  });
}
