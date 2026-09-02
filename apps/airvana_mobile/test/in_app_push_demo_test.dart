import 'package:airvana_mobile/shared/presentation/in_app_push_demo.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('in-app push demo mirrors the Web message modal', (tester) async {
    var dismissed = false;
    var openedMessages = false;

    await tester.pumpWidget(
      MaterialApp(
        home: InAppPushDemo(
          onDismiss: () => dismissed = true,
          onOpenMessages: () => openedMessages = true,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byKey(const ValueKey('in-app-push-demo')), findsOneWidget);
    expect(find.text('Playable v2 等待审核'), findsOneWidget);
    expect(find.text('站内提醒 · 已保留在消息中心'), findsOneWidget);
    expect(find.text('「Crypto City 安全挑战」正在核对互动、CTA 与归因节点。'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('in-app-push-dismiss')));
    expect(dismissed, isTrue);
    expect(openedMessages, isFalse);

    await tester.tap(find.byKey(const ValueKey('in-app-push-open')));
    expect(openedMessages, isTrue);
  });
}
