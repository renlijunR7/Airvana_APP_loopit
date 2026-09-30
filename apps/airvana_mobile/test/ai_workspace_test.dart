import 'package:airvana_mobile/features/history/presentation/ai_workspace_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  Widget host() => const ProviderScope(
    child: MaterialApp(home: Scaffold(body: AiWorkspacePageBody())),
  );

  testWidgets('AI 分身工作台有三个 tab、对话输入与执行边界', (tester) async {
    await tester.pumpWidget(host());
    await tester.pump(const Duration(milliseconds: 300));

    for (final key in ['chat', 'tasks', 'memory']) {
      expect(find.byKey(ValueKey('ai-workspace-tab-$key')), findsOneWidget);
    }
    expect(find.byKey(const ValueKey('ai-workspace-input')), findsOneWidget);

    // 执行边界在列表底部，滚到底再断言。
    await tester.drag(
      find.byKey(const ValueKey('ai-workspace-body')),
      const Offset(0, -1200),
    );
    await tester.pump(const Duration(milliseconds: 300));
    expect(find.byKey(const ValueKey('ai-workspace-boundary')), findsOneWidget);
    expect(find.textContaining('不会直接发布作品'), findsOneWidget);
  });

  testWidgets('提问后按关键词给出对应回复并保留在对话里', (tester) async {
    await tester.pumpWidget(host());
    await tester.pump(const Duration(milliseconds: 300));

    await tester.enterText(
      find.byKey(const ValueKey('ai-workspace-input')),
      '帮我检查当前 Campaign Brief 和 Contract',
    );
    await tester.tap(find.byKey(const ValueKey('ai-workspace-send')));
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.textContaining('应从 Campaign Brief 开始'), findsOneWidget);
    expect(find.text('帮我检查当前 Campaign Brief 和 Contract'), findsOneWidget);
  });

  test('关键词路由与 Web 的 sendGlobalAiMessage 一致', () {
    expect(
      _AiWorkspaceProbe.reply('帮我继续创作一个 Agentic Playable'),
      contains('Creator AI'),
    );
    expect(_AiWorkspaceProbe.reply('我的钱包 AIP 怎么提现'), contains('不会修改余额'));
    expect(_AiWorkspaceProbe.reply('有哪些私信要处理'), contains('不会代替本人自动回复'));
    expect(_AiWorkspaceProbe.reply('今天天气如何'), contains('整理为本机任务'));
  });
}

class _AiWorkspaceProbe {
  static String reply(String text) => AiWorkspacePageBodyState.replyFor(text);
}
