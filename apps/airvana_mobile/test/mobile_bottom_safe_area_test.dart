import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/shared/data/legacy_demo_catalog.dart';
import 'package:airvana_mobile/features/shared/presentation/playable_social_sheets.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('comment composer and send action clear Android navigation bar', (
    tester,
  ) async {
    const safeBottom = 34.0;
    final playable = LegacyDemoCatalog.byId('plb_orchard_merge')!;

    await tester.pumpWidget(
      MaterialApp(
        theme: buildAirvanaTheme(),
        home: MediaQuery(
          data: const MediaQueryData(
            size: Size(430, 932),
            viewPadding: EdgeInsets.only(bottom: safeBottom),
            padding: EdgeInsets.only(bottom: safeBottom),
          ),
          child: Scaffold(
            body: Align(
              alignment: Alignment.bottomCenter,
              child: AirvanaLocalCommentSheet(playable: playable),
            ),
          ),
        ),
      ),
    );
    await tester.pump();

    final composer = tester.widget<Container>(
      find.byKey(const ValueKey('comment-composer')),
    );
    expect(
      composer.padding,
      const EdgeInsets.fromLTRB(14, 10, 14, 12 + safeBottom),
    );
    expect(
      tester.getBottomRight(find.byKey(const ValueKey('comment-submit'))).dy,
      lessThanOrEqualTo(932 - safeBottom),
    );
  });

  testWidgets(
    'comment sheet uses keyboard inset instead of stacking safe area',
    (tester) async {
      final playable = LegacyDemoCatalog.byId('plb_orchard_merge')!;

      await tester.pumpWidget(
        MaterialApp(
          theme: buildAirvanaTheme(),
          home: MediaQuery(
            data: const MediaQueryData(
              size: Size(430, 932),
              viewPadding: EdgeInsets.only(bottom: 34),
              viewInsets: EdgeInsets.only(bottom: 320),
            ),
            child: Material(
              child: Align(
                alignment: Alignment.bottomCenter,
                child: AirvanaLocalCommentSheet(playable: playable),
              ),
            ),
          ),
        ),
      );
      await tester.pump();

      final composer = tester.widget<Container>(
        find.byKey(const ValueKey('comment-composer')),
      );
      expect(composer.padding, const EdgeInsets.fromLTRB(14, 10, 14, 12));
      final animatedPadding = tester.widget<AnimatedPadding>(
        find.byKey(const ValueKey('comment-keyboard-inset')),
      );
      expect(animatedPadding.padding, const EdgeInsets.only(bottom: 320));
    },
  );
}
