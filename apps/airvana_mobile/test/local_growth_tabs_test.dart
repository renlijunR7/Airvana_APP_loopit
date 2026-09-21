import 'package:airvana_mobile/features/shared/presentation/local_demo_screens.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('本机增长网络保留 Web 的四个 tab 与说明内容', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(home: Scaffold(body: LocalNetworkScreen())),
    );
    await tester.pump(const Duration(milliseconds: 300));

    for (final key in ['network', 'node', 'contribution', 'rules']) {
      expect(find.byKey(ValueKey('growth-tab-$key')), findsOneWidget);
    }

    // 默认 tab 展示本机作品列表，不展示说明页。
    expect(find.byKey(const ValueKey('network-filter-0')), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('growth-tab-contribution')));
    await tester.pump(const Duration(milliseconds: 300));

    expect(
      find.byKey(const ValueKey('growth-narrative-contribution')),
      findsOneWidget,
    );
    expect(
      find.byKey(const ValueKey('growth-boundary-contribution')),
      findsOneWidget,
    );
    expect(find.byKey(const ValueKey('network-filter-0')), findsNothing);
  });
}
