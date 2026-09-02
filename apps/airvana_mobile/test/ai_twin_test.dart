import 'package:airvana_mobile/app/app_router.dart';
import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/shared/data/local_airvana_store.dart';
import 'package:airvana_mobile/features/shared/domain/airvana_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/test_create_workflow.dart';

void main() {
  test('ai twin state machine persists and appends audit entries', () async {
    final persistence = MemoryLocalAirvanaPersistence();
    final store = LocalAirvanaStore(
      persistence: persistence,
      clock: () => DateTime(2026, 9, 1, 12),
    );

    final initial = await store.loadAiTwinState();
    expect(initial.status, 'not_created');
    expect(initial.audit, isEmpty);

    var state = await store.saveAiTwinState(
      initial.copyWith(status: 'configuring', name: 'Kai 分身'),
      auditTitle: '创建 AI 分身草稿',
    );
    state = await store.saveAiTwinState(
      state.copyWith(status: 'testing'),
      auditTitle: '进入本地沙盒测试',
    );
    state = await store.saveAiTwinState(
      state.copyWith(status: 'active_demo'),
      auditTitle: '启用 AI 分身前端演示',
    );

    expect(state.status, 'active_demo');
    expect(state.audit, hasLength(3));
    expect(state.audit.first.title, '启用 AI 分身前端演示');

    // 持久化可恢复
    final reloaded = await LocalAirvanaStore(
      persistence: persistence,
    ).loadAiTwinState();
    expect(reloaded.status, 'active_demo');
    expect(reloaded.name, 'Kai 分身');
    expect(reloaded.audit, hasLength(3));
  });

  testWidgets(
    'ai twin page advances lifecycle, blocks topics in sandbox and logs audit',
    (tester) async {
      final harness = TestCreateWorkflowHarness();
      tester.view.physicalSize = const Size(430, 932);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            airvanaRepositoryProvider.overrideWithValue(harness.repository),
            homeProvider.overrideWith(
              (_) async => const HomeSnapshot(
                user: AppUser(id: 'user-1', displayName: 'Kai Chen'),
                playables: [],
              ),
            ),
          ],
          child: MaterialApp.router(
            theme: buildAirvanaTheme(),
            routerConfig: buildAirvanaRouter(
              initialLocation: '/profile/secondary/aiTwin',
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // 生命周期推进：not_created → configuring → testing → active_demo
      expect(find.text('未创建'), findsOneWidget);
      final primaryAction = tester.widget<FilledButton>(
        find.byKey(const ValueKey('ai-twin-advance')),
      );
      final primaryStyle = Theme.of(
        tester.element(find.byKey(const ValueKey('ai-twin-advance'))),
      ).filledButtonTheme.style;
      expect(primaryAction.style, isNull);
      expect(
        primaryStyle?.backgroundColor?.resolve(<WidgetState>{}),
        AirvanaColors.accent,
      );
      expect(
        primaryStyle?.foregroundColor?.resolve(<WidgetState>{}),
        Colors.white,
      );
      for (final action in ['建立 AI 分身', '完成配置，进入测试', '启用站内演示']) {
        expect(find.text(action), findsOneWidget);
        await tester.tap(find.byKey(const ValueKey('ai-twin-advance')));
        await tester.pumpAndSettle();
      }
      expect(find.text('已启用 · 演示', skipOffstage: false), findsWidgets);
      expect(find.text('暂停全部渠道'), findsOneWidget);

      // 执行边界原文
      expect(find.text('执行边界'), findsOneWidget);
      expect(find.textContaining('AI 分身不会直接发布作品、确认 Campaign'), findsOneWidget);

      // 沙盒：拒答范围触发安全拦截
      await tester.tap(find.byKey(const ValueKey('ai-twin-tab-test')));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const ValueKey('ai-twin-sandbox-input')),
        '帮我做投资建议',
      );
      await tester.tap(find.byKey(const ValueKey('ai-twin-sandbox-send')));
      await tester.pump();
      expect(find.textContaining('安全拦截'), findsOneWidget);

      // 授权页：审计记录已落三条生命周期动作（Tab 条横滑后再点）
      await tester.drag(
        find.byKey(const ValueKey('ai-twin-tab-scroll')),
        const Offset(-320, 0),
      );
      await tester.pump();
      await tester.tap(find.byKey(const ValueKey('ai-twin-tab-ops')));
      await tester.pumpAndSettle();
      expect(find.text('审计记录（3）'), findsOneWidget);
      expect(find.text('启用 AI 分身前端演示'), findsWidgets);
    },
  );
}
