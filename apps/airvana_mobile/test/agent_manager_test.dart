import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/history/presentation/agent_manager_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _host(Widget child) => MaterialApp(
  theme: buildAirvanaTheme(),
  home: Scaffold(body: child),
);

void main() {
  testWidgets('agent manager walks list, detail and task like Web', (
    tester,
  ) async {
    await tester.pumpWidget(_host(const AgentManagerPageBody()));
    await tester.pump();

    expect(find.text('AI 运营策略'), findsOneWidget);
    expect(find.text('3 个'), findsOneWidget);
    expect(find.textContaining('发布始终需要人工确认'), findsOneWidget);
    for (final id in [1, 2, 3]) {
      expect(find.byKey(ValueKey('agent-row-$id')), findsOneWidget);
    }

    await tester.tap(find.byKey(const ValueKey('agent-manage-1')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('agent-detail-1')), findsOneWidget);
    expect(find.text('权限范围'), findsOneWidget);
    // Web 的种子数据里没有任何 Agent 拥有直接发布权限。
    expect(find.text('未授权'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('agent-open-task-1')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('agent-task-1')), findsOneWidget);
    expect(find.text('任务目标'), findsOneWidget);
    expect(find.textContaining('不会真正调用外部服务'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('agent-task-back')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('agent-detail-back')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('agent-manager-list')), findsOneWidget);
  });

  testWidgets('removing an agent goes through the destructive confirm', (
    tester,
  ) async {
    await tester.pumpWidget(_host(const AgentManagerPageBody()));
    await tester.pump();

    await tester.tap(find.byKey(const ValueKey('agent-manage-2')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('agent-delete-2')));
    await tester.pumpAndSettle();

    expect(find.text('移除“Kiko”？'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('destructive-removePower-cancel')));
    await tester.pumpAndSettle();
    // 取消后仍在详情页，Agent 未被移除。
    expect(find.byKey(const ValueKey('agent-detail-2')), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('agent-delete-2')));
    await tester.pumpAndSettle();
    await tester.tap(
      find.byKey(const ValueKey('destructive-removePower-confirm')),
    );
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('agent-row-2')), findsNothing);
    expect(find.text('2 个'), findsOneWidget);
  });
}
