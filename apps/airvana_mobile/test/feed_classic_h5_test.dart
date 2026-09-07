import 'dart:convert';
import 'dart:io';

import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/features/feed/presentation/feed_screen.dart';
import 'package:airvana_mobile/features/runtime/presentation/h5_game_runtime.dart';
import 'package:airvana_mobile/features/shared/data/legacy_demo_catalog.dart';
import 'package:airvana_mobile/features/shared/domain/airvana_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:webview_flutter_platform_interface/webview_flutter_platform_interface.dart';

class _TestWebViewPlatform extends WebViewPlatform {
  late _TestController controller;
  late _TestNavigation navigation;

  @override
  PlatformWebViewController createPlatformWebViewController(
    PlatformWebViewControllerCreationParams params,
  ) => controller = _TestController(params);

  @override
  PlatformNavigationDelegate createPlatformNavigationDelegate(
    PlatformNavigationDelegateCreationParams params,
  ) => navigation = _TestNavigation(params);

  @override
  PlatformWebViewWidget createPlatformWebViewWidget(
    PlatformWebViewWidgetCreationParams params,
  ) => _TestWebViewWidget(params);

  void finishLoading() {
    navigation.onFinished?.call(
      'file:///flutter_assets/assets/runner/playable-runner.html',
    );
    controller.message({'type': 'ready'});
  }
}

class _TestController extends PlatformWebViewController {
  _TestController(super.params) : super.implementation();
  final scripts = <String>[];
  String? asset;
  JavaScriptChannelParams? channel;
  void message(Map<String, Object?> value) =>
      channel?.onMessageReceived(JavaScriptMessage(message: jsonEncode(value)));
  @override
  Future<void> setJavaScriptMode(JavaScriptMode mode) async {}
  @override
  Future<void> setBackgroundColor(Color color) async {}
  @override
  Future<void> addJavaScriptChannel(JavaScriptChannelParams params) async {
    channel = params;
  }

  @override
  Future<void> setPlatformNavigationDelegate(
    PlatformNavigationDelegate delegate,
  ) async {}
  @override
  Future<void> loadFlutterAsset(String key) async {
    asset = key;
  }

  @override
  Future<void> runJavaScript(String javaScript) async {
    scripts.add(javaScript);
  }
}

class _TestNavigation extends PlatformNavigationDelegate {
  _TestNavigation(super.params) : super.implementation();
  PageEventCallback? onFinished;
  @override
  Future<void> setOnNavigationRequest(
    NavigationRequestCallback callback,
  ) async {}
  @override
  Future<void> setOnPageFinished(PageEventCallback callback) async {
    onFinished = callback;
  }

  @override
  Future<void> setOnWebResourceError(WebResourceErrorCallback callback) async {}
}

class _TestWebViewWidget extends PlatformWebViewWidget {
  _TestWebViewWidget(super.params) : super.implementation();
  @override
  Widget build(BuildContext context) =>
      const SizedBox.expand(key: ValueKey('test-webview'));
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test(
    'all 38 native covers use the current reference-guided casual art pack',
    () {
      final playables = LegacyDemoCatalog.legacyWebPlayables;
      expect(playables, hasLength(38));
      for (final playable in playables) {
        expect(
          playable.coverAsset,
          startsWith('assets/runner/assets/games/casual-v1/covers-png/'),
        );
        expect(
          File(playable.coverAsset).existsSync(),
          isTrue,
          reason: playable.id,
        );
      }
      final manifest =
          jsonDecode(
                File(
                  'assets/runner/assets/games/casual-v1/covers-png/manifest.json',
                ).readAsStringSync(),
              )
              as Map;
      expect(manifest['source'], 'REFERENCE_GUIDED_CASUAL_2_5D');
      expect(manifest['entries'], hasLength(38));
    },
  );

  testWidgets(
    'existing H5 engine responds to mute, pause, restart and completion without restarting on mute',
    (tester) async {
      final platform = _TestWebViewPlatform();
      WebViewPlatform.instance = platform;
      H5GameResult? completed;
      Widget harness(bool muted) => MaterialApp(
        home: Scaffold(
          body: H5GameRuntime(
            key: const ValueKey('controlled-runtime'),
            gameKey: 'orchard-merge',
            muted: muted,
            onComplete: (value) => completed = value,
          ),
        ),
      );
      await tester.pumpWidget(harness(true));
      platform.finishLoading();
      await tester.pump();
      final controller = platform.controller;
      expect(controller.asset, 'assets/runner/playable-runner.html');
      expect(
        controller.scripts,
        contains('startAirvanaGame("orchard-merge", true)'),
      );
      await tester.pumpWidget(harness(false));
      expect(identical(platform.controller, controller), isTrue);
      expect(controller.scripts.last, 'airvanaRunnerControl.mute(false)');
      expect(
        controller.scripts.where(
          (value) => value.startsWith('startAirvanaGame'),
        ),
        hasLength(1),
      );
      await tester.tap(find.text('暂停'));
      expect(controller.scripts.last, 'airvanaRunnerControl.togglePause()');
      platform.controller.message({
        'type': 'status',
        'paused': true,
        'score': 120,
        'text': '已暂停',
      });
      await tester.pump();
      await tester.tap(find.text('继续'));
      expect(controller.scripts.last, 'airvanaRunnerControl.togglePause()');
      await tester.tap(find.text('重开'));
      expect(controller.scripts.last, 'airvanaRunnerControl.restart()');
      platform.controller.message({
        'type': 'complete',
        'success': false,
        'score': 120,
        'stage': 2,
        'summary': '步数耗尽',
      });
      expect(completed?.success, isFalse);
      expect(completed?.score, 120);
      expect(completed?.summary, '步数耗尽');
    },
  );

  testWidgets(
    'Orchard and other supported feed games use the complete H5 runtime, not simplified inline demos',
    (tester) async {
      tester.view.physicalSize = const Size(430, 932);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final platform = _TestWebViewPlatform();
      WebViewPlatform.instance = platform;
      for (final id in [
        'plb_orchard_merge',
        'plb_star_mower',
        'plb_magic_choir',
      ]) {
        final playable = LegacyDemoCatalog.byId(id)!;
        await tester.pumpWidget(
          ProviderScope(
            key: ValueKey(id),
            overrides: [
              homeProvider.overrideWith(
                (_) async => HomeSnapshot(
                  user: LegacyDemoCatalog.user,
                  playables: [playable],
                  localDemo: true,
                ),
              ),
            ],
            child: const MaterialApp(home: Scaffold(body: FeedScreen())),
          ),
        );
        await tester.pumpAndSettle();
        await tester.tap(find.byKey(ValueKey('play-$id')));
        await tester.pump();
        expect(find.byType(H5GameRuntime), findsOneWidget, reason: id);
        expect(
          find.byKey(const ValueKey('feed-demo-runtime-notice')),
          findsNothing,
        );
        expect(
          find.byKey(const ValueKey('feed-inline-action-0')),
          findsNothing,
        );
        platform.finishLoading();
        await tester.pump();
        expect(
          platform.controller.scripts,
          contains('startAirvanaGame("${h5GameKeyForPlayable(id)}", true)'),
        );
        await tester.tap(find.byTooltip('开启作品音效'));
        await tester.pump();
        expect(
          platform.controller.scripts.last,
          'airvanaRunnerControl.mute(false)',
        );
        expect(tester.takeException(), isNull);
      }
    },
  );
}
