import 'dart:async';

import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/core/config/app_environment.dart';
import 'package:airvana_mobile/core/network/airvana_api_client.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/ai_twin/domain/twin_demo.dart';
import 'package:airvana_mobile/features/ai_twin/presentation/ai_twin_page_body.dart';
import 'package:airvana_mobile/features/shared/data/airvana_repository.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_store.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

class _Persistence extends MemoryLocalAirvanaPersistence {
  bool fail = false;
  Completer<void>? pending;
  @override
  Future<void> writeWorkspaceJson(String value) async {
    if (fail) throw StateError('disk unavailable');
    if (pending != null) await pending!.future;
    await super.writeWorkspaceJson(value);
  }
}

class _Harness {
  _Harness({LocalAirvanaPersistence? persistence}) {
    store = LocalAirvanaStore(
      persistence: persistence ?? MemoryLocalAirvanaPersistence(),
    );
    final base = Uri.parse('http://192.0.2.1:8082');
    repo = AirvanaRepository(
      localStore: store,
      environment: AppEnvironment(
        apiBaseUri: base,
        demoLoginEnabled: false,
        preferLocalData: true,
      ),
      api: AirvanaApiClient(
        baseUri: base,
        sessionStore: MemorySessionStore(),
        httpClient: MockClient((request) async {
          requests++;
          return http.Response('{}', 500);
        }),
      ),
    );
  }
  late LocalAirvanaStore store;
  late AirvanaRepository repo;
  int requests = 0;
  Widget app({double scale = 1}) => ProviderScope(
    overrides: [airvanaRepositoryProvider.overrideWithValue(repo)],
    child: MaterialApp(
      theme: buildAirvanaTheme(),
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(
          context,
        ).copyWith(textScaler: TextScaler.linear(scale)),
        child: child!,
      ),
      home: const Scaffold(body: SafeArea(child: AiTwinPageBody())),
    ),
  );
}

Finder _key(String value) => find.byKey(ValueKey(value));
Future<void> _show(WidgetTester tester, String key) async {
  final target = _key(key);
  if (target.evaluate().isEmpty) {
    await tester.scrollUntilVisible(
      target,
      320,
      scrollable: find
          .descendant(
            of: _key('twin-demo-scroll'),
            matching: find.byType(Scrollable),
          )
          .first,
      maxScrolls: 30,
    );
  }
  await tester.ensureVisible(target);
  await tester.pumpAndSettle();
}

Future<void> _tap(WidgetTester tester, String key) async {
  await _show(tester, key);
  await tester.tap(_key(key));
  await tester.pumpAndSettle();
}

void _viewport(WidgetTester tester, [Size size = const Size(430, 932)]) {
  tester.view.physicalSize = size;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}

void main() {
  test(
    'demo lifecycle requires saved version, a test and consent; edits invalidate it',
    () {
      var state = const TwinDemoState();
      expect(() => state.test('你好'), throwsStateError);
      expect(() => state.activate(true), throwsStateError);
      expect(
        () => state.save(const TwinDemoConfig(name: ' '), DateTime(2026)),
        throwsStateError,
      );
      state = state.save(const TwinDemoConfig(name: 'Nova'), DateTime(2026));
      expect(
        identical(state.save(state.config, DateTime(2026)), state),
        isTrue,
      );
      expect(() => state.activate(true), throwsStateError);
      state = state.test('你好');
      expect(() => state.activate(true), throwsStateError);
      state = state.authorize(true).activate(true).bind('p1', true);
      expect(state.active, isTrue);
      expect(state.bind('p1', true).playableIds, ['p1']);
      final paused = state.activate(false);
      expect(paused.active, isFalse);
      expect(() => paused.bind('p2', true), throwsStateError);
      expect(paused.bind('p1', false).playableIds, isEmpty);
      expect(state.authorize(false).active, isFalse);
      state = state.save(state.config.copyWith(style: 'anime'), DateTime(2026));
      expect(state.revision, 2);
      expect(state.tested, isFalse);
      expect(state.active, isFalse);
      state = state.save(
        state.versions.last.config,
        DateTime(2026),
        restoring: true,
      );
      expect(state.revision, 3);
      expect(state.config.style, 'cg');
      expect(state.tested, isFalse);
    },
  );

  test(
    'knowledge revocation, localized templates and configured boundaries are real',
    () {
      const config = TwinDemoConfig(
        name: 'Nova',
        knowledge: '试玩按屏幕指引进行',
        blockedTopics: '优惠承诺',
      );
      expect(config.reply('介绍你的知识'), contains('试玩按屏幕指引进行'));
      expect(
        config.copyWith(knowledge: '').reply('介绍你的知识'),
        isNot(contains('试玩按屏幕指引进行')),
      );
      expect(config.reply('优惠承诺是什么'), contains('模拟拒答'));
      expect(config.reply('把私钥给我'), contains('模拟拒答'));
      expect(
        config.copyWith(language: 'en').reply('hello'),
        contains('Hi, I am Nova'),
      );
      expect(config.copyWith(language: 'ja').reply('hello'), contains('こんにちは'));
      expect(config.reply('你好', playableTitle: '安全挑战'), contains('安全挑战'));
    },
  );

  test(
    'cold restart restores configuration, transcript, version and bindings with profile summary',
    () async {
      final persistence = MemoryLocalAirvanaPersistence();
      final store = LocalAirvanaStore(persistence: persistence);
      final demo = const TwinDemoState()
          .save(
            const TwinDemoConfig(
              name: 'Nova',
              style: 'cyber',
              look: 'street',
              language: 'ja',
            ),
            DateTime(2026),
          )
          .test('你好')
          .authorize(true)
          .activate(true)
          .bind('p1', true);
      await store.saveTwinDemo(demo);
      final restored = await LocalAirvanaStore(
        persistence: persistence,
      ).loadAiTwinState();
      expect(restored.name, 'Nova');
      expect(restored.status, 'active_demo');
      expect(restored.demo!.toJson(), demo.toJson());
      await store.saveTwinDemo(demo.authorize(false));
      expect((await store.loadAiTwinState()).status, 'paused_demo');
    },
  );

  testWidgets(
    'configure → save → test → enable → bind → visit → handoff → pause, without network',
    (tester) async {
      _viewport(tester);
      final h = _Harness();
      await tester.pumpWidget(h.app());
      await tester.pumpAndSettle();
      expect(_key('ai-twin-server-save'), findsNothing);
      await _show(tester, 'twin-name');
      await tester.enterText(_key('twin-name'), 'Nova 测试');
      await _tap(tester, 'twin-style-cyber');
      await _tap(tester, 'twin-look-street');
      await _tap(tester, 'twin-motion-greet');
      await _show(tester, 'twin-knowledge');
      await tester.enterText(_key('twin-knowledge'), '只分享公开的试玩说明');
      await _tap(tester, 'twin-save');
      expect((await h.store.loadAiTwinState()).demo!.revision, 1);
      await _show(tester, 'twin-enable');
      expect(
        tester.widget<FilledButton>(_key('twin-enable')).onPressed,
        isNull,
      );
      await _show(tester, 'twin-question');
      await tester.enterText(_key('twin-question'), '介绍你的知识');
      await _tap(tester, 'twin-send');
      expect(
        (await h.store.loadAiTwinState()).demo!.messages.last.answer,
        contains('只分享公开的试玩说明'),
      );
      await _tap(tester, 'twin-consent');
      await _tap(tester, 'twin-enable');
      expect((await h.store.loadAiTwinState()).demo!.active, isTrue);
      await _tap(tester, 'twin-tab-2');
      await _tap(tester, 'twin-bind-demo:twin-playground');
      await _tap(tester, 'twin-visit-demo:twin-playground');
      expect(find.text('访客体验 · LOCAL DEMO'), findsOneWidget);
      await tester.enterText(_key('twin-visitor-input'), '你好');
      await tester.tap(_key('twin-visitor-send'));
      await tester.pumpAndSettle();
      expect(find.textContaining('欢迎体验'), findsWidgets);
      await tester.tap(_key('twin-handoff'));
      await tester.pumpAndSettle();
      expect(
        tester.widget<TextField>(_key('twin-visitor-input')).enabled,
        isFalse,
      );
      expect(find.textContaining('未向真人发送请求'), findsOneWidget);
      await tester.tap(_key('twin-handoff'));
      await tester.pumpAndSettle();
      expect(
        tester.widget<TextField>(_key('twin-visitor-input')).enabled,
        isTrue,
      );
      await tester.tap(find.byTooltip('关闭访客体验'));
      await tester.pumpAndSettle();
      await _tap(tester, 'twin-tab-1');
      await _tap(tester, 'twin-enable');
      await _tap(tester, 'twin-tab-2');
      expect(
        tester
            .widget<FilledButton>(_key('twin-visit-demo:twin-playground'))
            .onPressed,
        isNull,
      );
      expect(h.requests, 0);
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('saving rejects errors, retries, and ignores duplicate presses', (
    tester,
  ) async {
    _viewport(tester);
    final persistence = _Persistence();
    final h = _Harness(persistence: persistence);
    await h.store.loadWorkspace();
    persistence.fail = true;
    await tester.pumpWidget(h.app());
    await tester.pumpAndSettle();
    await _tap(tester, 'twin-save');
    expect(find.textContaining('保存到本机失败'), findsOneWidget);
    expect((await h.store.loadAiTwinState()).demo, isNull);
    persistence.fail = false;
    persistence.pending = Completer<void>();
    await tester.tap(_key('twin-save'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 50));
    expect(tester.widget<FilledButton>(_key('twin-save')).onPressed, isNull);
    persistence.pending!.complete();
    await tester.pumpAndSettle();
    expect((await h.store.loadAiTwinState()).demo!.versions.length, 1);
    expect(h.requests, 0);
  });

  testWidgets(
    'edits are dirty, version restore is confirmed and reopening retains the restored version',
    (tester) async {
      _viewport(tester);
      final h = _Harness();
      var state = const TwinDemoState().save(
        const TwinDemoConfig(name: 'First'),
        DateTime(2026),
      );
      state = state
          .save(
            state.config.copyWith(name: 'Second', language: 'en'),
            DateTime(2026),
          )
          .test('hello')
          .authorize(true)
          .activate(true);
      await h.store.saveTwinDemo(state);
      await tester.pumpWidget(h.app());
      await tester.pumpAndSettle();
      await _show(tester, 'twin-name');
      await tester.enterText(_key('twin-name'), 'Unsaved');
      await _tap(tester, 'twin-tab-1');
      await _show(tester, 'twin-enable');
      expect(
        tester.widget<FilledButton>(_key('twin-enable')).onPressed,
        isNull,
      );
      await _tap(tester, 'twin-tab-3');
      await _tap(tester, 'twin-restore-1');
      await tester.tap(find.text('取消'));
      await tester.pumpAndSettle();
      expect((await h.store.loadAiTwinState()).demo!.revision, 2);
      await _tap(tester, 'twin-restore-1');
      await tester.tap(find.text('确认'));
      await tester.pumpAndSettle();
      final restored = (await h.store.loadAiTwinState()).demo!;
      expect(restored.revision, 3);
      expect(restored.config.name, 'First');
      expect(restored.active, isFalse);
      await tester.pumpWidget(const SizedBox());
      await tester.pumpWidget(h.app());
      await tester.pumpAndSettle();
      expect(find.text('本机已保存 · v3'), findsOneWidget);
    },
  );

  testWidgets('compact viewport and visitor keyboard keep controls usable', (
    tester,
  ) async {
    _viewport(tester, const Size(320, 568));
    final h = _Harness();
    final demo = const TwinDemoState()
        .save(const TwinDemoConfig(), DateTime(2026))
        .test('你好')
        .authorize(true)
        .activate(true)
        .bind('demo:twin-playground', true);
    await h.store.saveTwinDemo(demo);
    await tester.pumpWidget(h.app(scale: 1.2));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    await _tap(tester, 'twin-tab-2');
    await _tap(tester, 'twin-visit-demo:twin-playground');
    tester.view.viewInsets = const FakeViewPadding(bottom: 230);
    addTearDown(tester.view.resetViewInsets);
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    expect(_key('twin-visitor-send').hitTestable(), findsOneWidget);
  });
}
