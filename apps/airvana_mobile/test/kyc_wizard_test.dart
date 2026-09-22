import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/identity/presentation/kyc_countries.dart';
import 'package:airvana_mobile/features/identity/presentation/kyc_document_wizard.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  Widget host() => MaterialApp(
    theme: buildAirvanaTheme(),
    home: const Scaffold(body: KycDocumentWizard()),
  );

  test('国家清单与 Web 的 identityKycCountries 一致', () {
    expect(kKycCountries, hasLength(250));
    expect(kKycCountries.first, ('CN', '中国大陆'));
    expect(kKycCountries.map((item) => item.$1), contains('XK'));
  });

  testWidgets('身份证要两面，护照只要一页，凑齐才能提交', (tester) async {
    // 提交按钮在列表底部，用更高的画布保证它被构建。
    tester.view.physicalSize = const Size(430, 1600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(host());
    await tester.pump();

    expect(find.byKey(const ValueKey('kyc-slot-id_front')), findsOneWidget);
    expect(find.byKey(const ValueKey('kyc-slot-id_back')), findsOneWidget);

    final submit = tester.widget<FilledButton>(
      find.byKey(const ValueKey('kyc-submit')),
    );
    expect(submit.onPressed, isNull);

    await tester.tap(find.byKey(const ValueKey('kyc-pick-id_front')));
    await tester.pump();
    // 只传一面仍然不能提交。
    expect(
      tester
          .widget<FilledButton>(find.byKey(const ValueKey('kyc-submit')))
          .onPressed,
      isNull,
    );

    await tester.tap(find.byKey(const ValueKey('kyc-pick-id_back')));
    await tester.pump();
    expect(
      tester
          .widget<FilledButton>(find.byKey(const ValueKey('kyc-submit')))
          .onPressed,
      isNotNull,
    );

    // 切成护照后只剩一个槽，且已选状态被清空。
    await tester.tap(find.byKey(const ValueKey('kyc-doc-type-passport')));
    await tester.pump();
    expect(find.byKey(const ValueKey('kyc-slot-passport')), findsOneWidget);
    expect(find.byKey(const ValueKey('kyc-slot-id_front')), findsNothing);
    expect(
      tester
          .widget<FilledButton>(find.byKey(const ValueKey('kyc-submit')))
          .onPressed,
      isNull,
    );
  });

  testWidgets('国家选择器可搜索、可清空、空态有文案', (tester) async {
    await tester.pumpWidget(host());
    await tester.pump();

    expect(find.byKey(const ValueKey('kyc-country-value')), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('kyc-country-field')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('kyc-country-picker')), findsOneWidget);

    await tester.enterText(
      find.byKey(const ValueKey('kyc-country-search')),
      '新加坡',
    );
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('kyc-country-SG')), findsOneWidget);

    await tester.enterText(
      find.byKey(const ValueKey('kyc-country-search')),
      '不存在的地方',
    );
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('kyc-country-empty')), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('kyc-country-clear')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('kyc-country-CN')), findsOneWidget);

    await tester.tap(find.byKey(const ValueKey('kyc-country-SG')));
    await tester.pumpAndSettle();
    expect(find.text('新加坡'), findsOneWidget);
  });

  testWidgets('隐私保护说明保留 Web 原文', (tester) async {
    await tester.pumpWidget(host());
    await tester.pump();
    await tester.drag(
      find.byKey(const ValueKey('kyc-document-wizard')),
      const Offset(0, -600),
    );
    await tester.pump();
    expect(find.textContaining('不显示照片、不记录文件名、不写入本地存储'), findsOneWidget);
  });
}
