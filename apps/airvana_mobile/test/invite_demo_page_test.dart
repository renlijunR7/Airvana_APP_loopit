import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/history/presentation/kol_activation_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('invite rule preview copies only its disclosed example code', (
    tester,
  ) async {
    final clipboardWrites = <String>[];
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
      SystemChannels.platform,
      (call) async {
        if (call.method == 'Clipboard.setData') {
          clipboardWrites.add((call.arguments as Map)['text'] as String);
        }
        return null;
      },
    );
    addTearDown(
      () => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        SystemChannels.platform,
        null,
      ),
    );

    await tester.pumpWidget(
      MaterialApp(
        theme: buildAirvanaTheme(),
        home: const Scaffold(body: InvitePageBody()),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('邀请规则 · 演示'), findsOneWidget);
    expect(find.text('每位合格好友 100 AIP'), findsOneWidget);
    expect(find.text('示例邀请码 · 不用于真实注册'), findsOneWidget);
    expect(find.textContaining('不会登记真实邀请或发放奖励'), findsOneWidget);
    expect(find.text('我的邀请码'), findsNothing);
    expect(find.textContaining('1,000'), findsNothing);
    expect(find.text('模拟完成（本机）'), findsNothing);
    expect(clipboardWrites, isEmpty);

    await tester.tap(find.byKey(const ValueKey('invite-page-copy')));
    await tester.pumpAndSettle();

    expect(clipboardWrites, ['AIR-KAI-4821']);
    expect(find.text('示例邀请码已复制'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('clipboard failure never announces a successful copy', (
    tester,
  ) async {
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
      SystemChannels.platform,
      (call) async {
        if (call.method == 'Clipboard.setData') {
          throw PlatformException(code: 'clipboard_unavailable');
        }
        return null;
      },
    );
    addTearDown(
      () => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        SystemChannels.platform,
        null,
      ),
    );

    await tester.pumpWidget(
      MaterialApp(
        theme: buildAirvanaTheme(),
        home: const Scaffold(body: InvitePageBody()),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const ValueKey('invite-page-copy')));
    await tester.pumpAndSettle();

    expect(find.text('复制失败，请重试'), findsOneWidget);
    expect(find.text('示例邀请码已复制'), findsNothing);
    expect(tester.takeException(), isNull);
  });
}
