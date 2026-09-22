import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/feed/presentation/feed_screen.dart';
import 'package:airvana_mobile/features/shared/data/legacy_demo_catalog.dart';
import 'package:airvana_mobile/features/shared/domain/airvana_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/test_create_workflow.dart';

void main() {
  testWidgets('冷启动读回收藏与点赞时，计数要把本人这一次算进去', (tester) async {
    final playable = LegacyDemoCatalog.legacyWebPlayables.firstWhere(
      (item) => item.likes == 0 && item.saves == 0,
    );
    final snapshot = HomeSnapshot(
      user: LegacyDemoCatalog.user,
      playables: [playable],
      localDemo: true,
      engagementsByContent: {
        playable.id: {'like', 'save'},
      },
    );

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          airvanaRepositoryProvider.overrideWithValue(
            TestCreateWorkflowHarness().repository,
          ),
          homeProvider.overrideWith((_) async => snapshot),
        ],
        child: MaterialApp(
          theme: buildAirvanaTheme(),
          home: const Scaffold(body: FeedScreen()),
        ),
      ),
    );
    await tester.pump(const Duration(milliseconds: 400));

    // 图标点亮的同时，计数不能还是 0。
    expect(find.text('1'), findsNWidgets(2));
    expect(find.text('0'), findsOneWidget);
  });
}
