import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/feed/presentation/feed_screen.dart';
import 'package:airvana_mobile/features/shared/data/legacy_demo_catalog.dart';
import 'package:airvana_mobile/features/shared/domain/airvana_models.dart';
import 'package:airvana_mobile/shared/presentation/airvana_shell.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  for (final device in [
    (size: const Size(360, 780), bottom: 48.0),
    (size: const Size(360, 800), bottom: 24.0),
    (size: const Size(390, 844), bottom: 0.0),
    (size: const Size(430, 932), bottom: 34.0),
  ]) {
    testWidgets(
      'author clears floating nav on ${device.size} / ${device.bottom}',
      (tester) async {
        tester.view.devicePixelRatio = 1;
        tester.view.physicalSize = device.size;
        tester.view.padding = FakeViewPadding(top: 24, bottom: device.bottom);
        tester.view.viewPadding = FakeViewPadding(
          top: 24,
          bottom: device.bottom,
        );
        addTearDown(tester.view.reset);
        await tester.pumpWidget(
          ProviderScope(
            overrides: [
              homeProvider.overrideWith(
                (_) async => HomeSnapshot(
                  user: LegacyDemoCatalog.user,
                  playables: LegacyDemoCatalog.legacyWebPlayables,
                  localDemo: true,
                ),
              ),
            ],
            child: MaterialApp(
              theme: buildAirvanaTheme(),
              home: const AirvanaShell(selectedIndex: 0, child: FeedScreen()),
            ),
          ),
        );
        await tester.pumpAndSettle();
        final author = tester.getRect(
          find.byKey(const ValueKey('feed-author-row')),
        );
        final nav = tester.getRect(
          find.byKey(const ValueKey('navigation-capsule')),
        );
        final footer = tester.getSize(
          find.byKey(const ValueKey('feed-social-footer')),
        );
        expect(footer.height, 188 + 24 + 8);
        // Include the follow badge, which extends 6 px below the avatar row.
        expect(nav.top - author.bottom - 6, greaterThanOrEqualTo(12));
        expect(
          nav.bottom,
          closeTo(
            device.size.height - (device.bottom < 14 ? 14 : device.bottom),
            .1,
          ),
        );
        expect(tester.takeException(), isNull);
      },
    );
  }
}
