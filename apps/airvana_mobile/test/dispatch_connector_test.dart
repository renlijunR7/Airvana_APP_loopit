import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/history/presentation/agent_manager_page.dart';
import 'package:airvana_mobile/features/history/presentation/connector_publish_sheet.dart';
import 'package:airvana_mobile/features/shared/data/legacy_demo_catalog.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _host(Widget child) => MaterialApp(
  theme: buildAirvanaTheme(),
  home: Scaffold(body: child),
);

void main() {
  testWidgets('派发任务列出空闲 Agent，选中后进入任务并可取消', (tester) async {
    await tester.pumpWidget(_host(const AgentManagerPageBody()));
    await tester.pump();

    await tester.tap(find.byKey(const ValueKey('agent-dispatch-open')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('agent-dispatch-sheet')), findsOneWidget);
    expect(
      find.byKey(const ValueKey('agent-dispatch-option-1')),
      findsOneWidget,
    );

    await tester.tap(find.text('选它 ›').first);
    await tester.pumpAndSettle();
    // 选中后进入任务视图，并显示派发的作品。
    expect(find.byKey(const ValueKey('agent-task-meta-1')), findsOneWidget);
    expect(find.textContaining('执行中'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('agent-task-cancel-1')));
    await tester.pumpAndSettle();
    expect(find.textContaining('执行中'), findsNothing);
  });

  testWidgets('全部 Agent 都在忙时给出 Web 的空态文案', (tester) async {
    await tester.pumpWidget(_host(const AgentManagerPageBody()));
    await tester.pump();

    // 依次把三个 Agent 都派出去。
    for (var i = 0; i < 3; i += 1) {
      await tester.tap(find.byKey(const ValueKey('agent-dispatch-open')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('选它 ›').first);
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('agent-task-back')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('agent-detail-back')));
      await tester.pumpAndSettle();
    }

    await tester.tap(find.byKey(const ValueKey('agent-dispatch-open')));
    await tester.pumpAndSettle();
    expect(
      find.byKey(const ValueKey('agent-dispatch-no-idle')),
      findsOneWidget,
    );
    expect(find.text('所有 Agent 都在忙，等它们完成任务或新建一个'), findsOneWidget);
  });

  testWidgets('连接器发布逐渠道生成链接，且保留不代表全部渠道的边界', (tester) async {
    final playable = LegacyDemoCatalog.legacyWebPlayables.first;
    await tester.pumpWidget(_host(ConnectorPublishSheet(playable: playable)));
    await tester.pump();

    for (final key in ['x', 'telegram', 'discord', 'instagram']) {
      expect(find.byKey(ValueKey('connector-row-$key')), findsOneWidget);
    }
    expect(find.text('未发布'), findsNWidgets(4));

    await tester.tap(find.byKey(const ValueKey('connector-publish-telegram')));
    await tester.pump(const Duration(milliseconds: 800));
    // 只有被点的渠道状态变化，其余三个仍是未发布。
    expect(find.text('已生成链接 · 待平台内确认'), findsOneWidget);
    expect(find.text('未发布'), findsNWidgets(3));

    expect(find.textContaining('绝不会用一个渠道的结果代表全部渠道'), findsOneWidget);
  });
}
