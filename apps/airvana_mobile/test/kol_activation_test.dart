import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/history/presentation/kol_activation_page.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _host(Widget child) => MaterialApp(
  theme: buildAirvanaTheme(),
  home: Scaffold(body: child),
);

void main() {
  testWidgets('kol activation walks five steps and blocks incomplete input', (
    tester,
  ) async {
    await tester.pumpWidget(_host(const KolActivationPageBody()));
    await tester.pump();

    expect(find.text('第 1 / 5 步'), findsOneWidget);
    expect(find.text('欢迎成为 Airvana KOL'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('kol-activation-next')));
    await tester.pump();
    expect(find.text('完善 KOL 商业档案'), findsOneWidget);

    // 商业档案四项必填，缺项时不能前进。
    await tester.tap(find.byKey(const ValueKey('kol-activation-next')));
    await tester.pump();
    expect(find.byKey(const ValueKey('kol-activation-error')), findsOneWidget);
    expect(find.text('完善 KOL 商业档案'), findsOneWidget);

    for (final field in [
      'kol-field-category',
      'kol-field-audience',
      'kol-field-languages',
      'kol-field-collaboration',
    ]) {
      await tester.enterText(find.byKey(ValueKey(field)), '演示');
    }
    await tester.tap(find.byKey(const ValueKey('kol-activation-next')));
    await tester.pump();
    expect(find.text('确认创作者协议'), findsOneWidget);

    // 协议未勾选时同样不能前进。
    await tester.tap(find.byKey(const ValueKey('kol-activation-next')));
    await tester.pump();
    expect(find.byKey(const ValueKey('kol-activation-error')), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('kol-agreement-checkbox')));
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('kol-activation-next')));
    await tester.pump();
    expect(find.text('设置发布与运营渠道'), findsOneWidget);

    // 站内渠道是平台默认，不可取消。
    final airvana = tester.widget<CheckboxListTile>(
      find.byKey(const ValueKey('kol-channel-airvana')),
    );
    expect(airvana.value, isTrue);
    expect(airvana.onChanged, isNull);

    await tester.tap(find.byKey(const ValueKey('kol-activation-next')));
    await tester.pump();
    expect(find.text('创建首个 Campaign'), findsOneWidget);
    expect(find.text('第 5 / 5 步'), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('kol-activation-next')));
    await tester.pump();
    expect(find.byKey(const ValueKey('kol-activation-done')), findsOneWidget);
  });

  testWidgets('invite page states the qualification rule and reward', (
    tester,
  ) async {
    await tester.pumpWidget(_host(const InvitePageBody()));
    await tester.pump();

    expect(find.text('每位合格好友 100 AIP'), findsOneWidget);
    expect(find.byKey(const ValueKey('invite-page-code')), findsOneWidget);
    expect(find.textContaining('配置首个 Agent 后计为合格'), findsOneWidget);
    expect(find.textContaining('不可提现'), findsOneWidget);
  });
}
