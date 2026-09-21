import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/shared/data/legacy_demo_catalog.dart';
import 'package:airvana_mobile/features/shared/presentation/playable_detail_screen.dart';
import 'package:airvana_mobile/features/shared/presentation/player_publish_sheet.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

Widget _host(Widget child) =>
    MaterialApp(theme: buildAirvanaTheme(), home: child);

void main() {
  final item = LegacyDemoCatalog.legacyWebPlayables.first;

  testWidgets('playable detail separates viewer and owner views', (
    tester,
  ) async {
    await tester.pumpWidget(
      _host(PlayableDetailScreen(playable: item, ownerView: false)),
    );
    await tester.pump();

    expect(find.text('AGENTIC PLAYABLE'), findsOneWidget);
    expect(find.byKey(const ValueKey('playable-detail-body')), findsOneWidget);
    // 非所有者看不到管理入口。
    expect(find.byKey(const ValueKey('playable-detail-manage')), findsNothing);

    await tester.pumpWidget(
      _host(PlayableDetailScreen(playable: item, ownerView: true)),
    );
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('playable-detail-manage')));
    await tester.pumpAndSettle();

    expect(find.text('KOL 所有者视图'), findsOneWidget);
    expect(find.text('版本治理'), findsOneWidget);
    expect(find.textContaining('本机操作只记录意图'), findsOneWidget);
  });

  testWidgets('player publish keeps Web types, visibility and empty guard', (
    tester,
  ) async {
    PlayerPostDraft? draft;
    await tester.pumpWidget(
      _host(
        Scaffold(
          body: Builder(
            builder: (context) => TextButton(
              onPressed: () async =>
                  draft = await showModalBottomSheet<PlayerPostDraft>(
                    context: context,
                    isScrollControlled: true,
                    builder: (_) =>
                        const PlayerPublishSheet(displayName: 'Kai Chen'),
                  ),
              child: const Text('open'),
            ),
          ),
        ),
      ),
    );
    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();

    for (final type in ['图文', '短视频', '游戏攻略']) {
      expect(find.byKey(ValueKey('player-post-type-$type')), findsOneWidget);
    }
    for (final v in ['公开', '好友可见', '仅自己']) {
      expect(find.byKey(ValueKey('player-post-visibility-$v')), findsOneWidget);
    }

    // 正文为空时不能发布。
    final submit = tester.widget<FilledButton>(
      find.byKey(const ValueKey('player-post-submit')),
    );
    expect(submit.onPressed, isNull);

    await tester.enterText(
      find.byKey(const ValueKey('player-post-body')),
      '今天通关了星尘割草',
    );
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('player-post-visibility-仅自己')));
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('player-post-submit')));
    await tester.pumpAndSettle();

    expect(draft, isNotNull);
    expect(draft!.body, '今天通关了星尘割草');
    expect(draft!.visibility, '仅自己');
    expect(draft!.type, '图文');
  });
}
