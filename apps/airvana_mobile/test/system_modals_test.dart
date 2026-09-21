import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/shared/presentation/destructive_confirm.dart';
import 'package:airvana_mobile/shared/presentation/system_modals.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('every Web system modal keeps its own copy and actions', (
    tester,
  ) async {
    for (final modal in AirvanaSystemModal.values) {
      bool? result;
      await tester.pumpWidget(
        MaterialApp(
          theme: buildAirvanaTheme(),
          home: Scaffold(
            body: Builder(
              builder: (context) => TextButton(
                onPressed: () async =>
                    result = await showAirvanaSystemModal(context, modal),
                child: const Text('open'),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('open'));
      await tester.pumpAndSettle();

      final spec = systemModalSpec(modal);
      expect(find.byKey(ValueKey('system-modal-${modal.name}')), findsOneWidget);
      expect(find.text(spec.eyebrow), findsOneWidget);
      expect(find.text(spec.note), findsOneWidget);
      // 离线提示只有单一出口，其余三个都保留次要操作。
      expect(
        find.byKey(ValueKey('system-modal-${modal.name}-secondary')),
        modal == AirvanaSystemModal.riskOffline
            ? findsNothing
            : findsOneWidget,
      );

      await tester.tap(
        find.byKey(ValueKey('system-modal-${modal.name}-primary')),
      );
      await tester.pumpAndSettle();
      expect(result, isTrue);
    }
  });

  test('destructive confirm covers the seventeen Web actions', () {
    expect(DestructiveAction.values, hasLength(17));
    for (final action in DestructiveAction.values) {
      final spec = destructiveSpec(action);
      expect(spec.title, isNotEmpty, reason: action.name);
      expect(spec.message, isNotEmpty, reason: action.name);
      expect(spec.label, isNotEmpty, reason: action.name);
    }
    // 带主语的三种动作会把名称写进标题，和 Web 的 payload 行为一致。
    expect(
      destructiveSpec(DestructiveAction.removePower, subject: '实时反馈').title,
      '移除“实时反馈”？',
    );
    expect(
      destructiveSpec(DestructiveAction.deleteDraft).title,
      '删除草稿“未命名 Playable”？',
    );
    // 最危险的一项必须明说不可撤销。
    expect(
      destructiveSpec(DestructiveAction.clearLocalBusiness).message,
      contains('无法撤销'),
    );
  });

  testWidgets('destructive dialog returns false unless confirmed', (
    tester,
  ) async {
    bool? outcome;
    await tester.pumpWidget(
      MaterialApp(
        theme: buildAirvanaTheme(),
        home: Scaffold(
          body: Builder(
            builder: (context) => TextButton(
              onPressed: () async => outcome = await confirmDestructiveAction(
                context,
                DestructiveAction.clearAllRuns,
              ),
              child: const Text('open'),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();
    expect(find.text('清空全部体验记录？'), findsOneWidget);
    await tester.tap(
      find.byKey(const ValueKey('destructive-clearAllRuns-cancel')),
    );
    await tester.pumpAndSettle();
    expect(outcome, isFalse);

    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();
    await tester.tap(
      find.byKey(const ValueKey('destructive-clearAllRuns-confirm')),
    );
    await tester.pumpAndSettle();
    expect(outcome, isTrue);
  });
}
