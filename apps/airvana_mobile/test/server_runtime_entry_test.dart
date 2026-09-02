import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/core/config/app_environment.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/runtime/presentation/playable_runtime_screen.dart';
import 'package:airvana_mobile/features/runtime/presentation/server_playable_runtime_screen.dart';
import 'package:airvana_mobile/features/shared/domain/airvana_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('server content selects the controlled runtime surface', (
    tester,
  ) async {
    const playable = Playable(
      id: 'content_server_demo',
      title: '服务端成品',
      authorName: 'Airvana Arcade',
      contentType: 'game',
      version: 1,
      summary: '必须由服务端确认完成。',
    );
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          appEnvironmentProvider.overrideWithValue(
            AppEnvironment(
              apiBaseUri: Uri.parse('http://127.0.0.1:8082'),
              demoLoginEnabled: true,
            ),
          ),
        ],
        child: MaterialApp(
          theme: buildAirvanaTheme(),
          home: const PlayableRuntimeEntryScreen(playable: playable),
        ),
      ),
    );
    await tester.pump();

    expect(find.byType(ServerPlayableRuntimeScreen), findsOneWidget);
    expect(find.textContaining('受控 WebView'), findsOneWidget);
    expect(find.byKey(const ValueKey('runtime-start')), findsNothing);
  });

  testWidgets('local content retains the explicitly local runtime', (
    tester,
  ) async {
    const playable = Playable(
      id: 'plb_local_demo',
      title: '本机作品',
      authorName: 'Kai Chen',
      contentType: 'game',
      version: 1,
      summary: '本机演示。',
      localDemo: true,
    );
    await tester.pumpWidget(
      const MaterialApp(home: PlayableRuntimeEntryScreen(playable: playable)),
    );
    await tester.pump();

    expect(find.byType(PlayableRuntimeScreen), findsOneWidget);
    expect(find.byKey(const ValueKey('runtime-start')), findsOneWidget);
  });
}
