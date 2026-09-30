import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/create/presentation/create_playable_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/test_create_workflow.dart';

void main() {
  testWidgets(
    'composer Power categories search dependencies and guardrails are interactive',
    (tester) async {
      final harness = TestCreateWorkflowHarness();
      tester.view.physicalSize = const Size(430, 932);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        MaterialApp(
          theme: buildAirvanaTheme(),
          home: CreatePlayableScreen(workflowRepository: harness.workflow),
        ),
      );
      await tester.pumpAndSettle();

      Future<void> tapVisible(Finder finder) async {
        await tester.ensureVisible(finder);
        await tester.pump();
        await tester.tap(finder);
        await tester.pump();
      }

      for (final label in ['语音转文字', 'AI 灵感', '项目素材', '创作问答']) {
        expect(find.bySemanticsLabel(label), findsOneWidget);
      }
      expect(
        find.byKey(const ValueKey('composer-power-disclosure')),
        findsNothing,
      );
      expect(
        find.byKey(const ValueKey('composer-power-card-shareEngagement')),
        findsOneWidget,
      );
      expect(
        find.byKey(const ValueKey('legacy-composer-intent-strip')),
        findsNothing,
      );
      await tester.tap(find.bySemanticsLabel('项目素材'));
      await tester.pumpAndSettle();
      expect(
        find.byKey(const ValueKey('composer-assets-sheet')),
        findsOneWidget,
      );
      await tester.tap(
        find.byKey(const ValueKey('composer-asset-plb_safety_workshop')),
      );
      await tester.tap(find.byKey(const ValueKey('composer-assets-done')));
      await tester.pumpAndSettle();

      final categoryRail = find.byKey(
        const ValueKey('composer-power-category-scroll'),
      );
      expect(categoryRail, findsOneWidget);
      await tester.drag(categoryRail, const Offset(-260, 0));
      await tester.pump();

      await tapVisible(
        find.byKey(const ValueKey('composer-power-category-content')),
      );
      expect(find.text('文本与字体'), findsOneWidget);
      expect(find.text('点击、滑动与长按'), findsNothing);

      await tapVisible(
        find.byKey(const ValueKey('composer-power-category-mechanics')),
      );
      expect(find.text('点击、滑动与长按'), findsOneWidget);
      expect(
        find.descendant(
          of: find.byKey(const ValueKey('composer-power-toggle-touchControls')),
          matching: find.byIcon(Icons.check_rounded),
        ),
        findsOneWidget,
      );

      await tapVisible(
        find.byKey(const ValueKey('composer-power-category-social')),
      );
      await tester.drag(
        find.byKey(const ValueKey('composer-power-grid-social-')),
        const Offset(0, -220),
      );
      await tester.pump();
      await tapVisible(
        find.byKey(const ValueKey('composer-power-toggle-multiplayer')),
      );
      expect(find.textContaining('并补全依赖：关注关系'), findsOneWidget);
      expect(find.textContaining('关注关系'), findsWidgets);

      await tapVisible(find.byKey(const ValueKey('composer-power-search')));
      await tester.enterText(
        find.byKey(const ValueKey('composer-power-search-field')),
        '手势',
      );
      await tester.pump();
      expect(find.text('手势识别'), findsOneWidget);
      expect(find.text('多人参与'), findsNothing);

      await tapVisible(find.byKey(const ValueKey('composer-power-search')));
      await tapVisible(find.text('深度'));
      await tapVisible(
        find.byKey(const ValueKey('composer-power-category-operations')),
      );
      await tester.drag(
        find.byKey(const ValueKey('composer-power-grid-operations-')),
        const Offset(0, -300),
      );
      await tester.pump();
      expect(find.text('外部连接器'), findsOneWidget);
      await tapVisible(
        find.byKey(const ValueKey('composer-power-toggle-externalConnectors')),
      );
      expect(find.textContaining('Contract、审批与真实执行仍需服务端确认'), findsOneWidget);

      await tapVisible(find.text('快速'));
      expect(find.textContaining('已安全降级：移除 外部连接器'), findsOneWidget);
      expect(find.text('外部连接器'), findsNothing);

      await tapVisible(
        find.byKey(const ValueKey('composer-power-category-sensing')),
      );
      await tapVisible(
        find.byKey(const ValueKey('composer-power-toggle-cameraAr')),
      );
      await tapVisible(
        find.byKey(const ValueKey('composer-power-category-other')),
      );
      await tapVisible(
        find.byKey(const ValueKey('composer-power-toggle-vrExperience')),
      );
      expect(find.text('配置冲突'), findsOneWidget);
      await tapVisible(find.text('改用 VR 体验'));
      expect(
        find.descendant(
          of: find.byKey(const ValueKey('composer-power-toggle-vrExperience')),
          matching: find.byIcon(Icons.check_rounded),
        ),
        findsOneWidget,
      );
    },
  );

  testWidgets(
    'composer preparation buttons update the local draft truthfully',
    (tester) async {
      final harness = TestCreateWorkflowHarness();
      tester.view.physicalSize = const Size(430, 932);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        MaterialApp(
          theme: buildAirvanaTheme(),
          home: CreatePlayableScreen(workflowRepository: harness.workflow),
        ),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.bySemanticsLabel('语音转文字'));
      await tester.pumpAndSettle();
      expect(find.textContaining('未伪造麦克风授权'), findsOneWidget);
      final transcriptField = tester.widget<TextField>(
        find.byKey(const ValueKey('composer-voice-transcript')),
      );
      final transcriptBorder =
          transcriptField.decoration?.enabledBorder as OutlineInputBorder;
      final transcriptFocusedBorder =
          transcriptField.decoration?.focusedBorder as OutlineInputBorder;
      expect(transcriptBorder.borderSide.color, AirvanaColors.line);
      expect(transcriptBorder.borderSide.width, 1);
      expect(transcriptBorder.borderRadius.topLeft.x, 14);
      expect(transcriptFocusedBorder.borderSide.color, const Color(0xFFFF7B85));
      expect(transcriptFocusedBorder.borderSide.width, 1);
      await tester.enterText(
        find.byKey(const ValueKey('composer-voice-transcript')),
        '创建一个滑动收集星星并支持失败重试的游戏',
      );
      await tester.tap(find.byKey(const ValueKey('composer-voice-apply')));
      await tester.pumpAndSettle();

      await tester.tap(find.bySemanticsLabel('AI 灵感'));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('composer-suggestion-0')));
      await tester.pump();
      await tester.tap(
        find.byKey(const ValueKey('composer-inspiration-apply')),
      );
      await tester.pumpAndSettle();

      await tester.tap(find.bySemanticsLabel('创作问答'));
      await tester.pumpAndSettle();
      // Web 同款 4 道编号问题 + 选项芯片
      expect(find.text('这次创作最重要的目标是什么？'), findsOneWidget);
      expect(
        find.byKey(const ValueKey('composer-goal-objective')),
        findsOneWidget,
      );
      for (final option in ['互动参与', '新用户', '完成互动', '了解更多']) {
        await tester.tap(find.text(option));
        await tester.pump();
      }
      await tester.tap(find.byKey(const ValueKey('composer-goals-save')));
      await tester.pumpAndSettle();

      final prompt = tester.widget<TextField>(
        find.byKey(const ValueKey('legacy-composer-input')),
      );
      expect(prompt.controller!.text, contains('滑动收集星星'));
      expect(prompt.controller!.text, contains('连续落点与蓄力反馈'));
      expect(find.text('4/4'), findsOneWidget);
    },
  );

  testWidgets(
    'composer sheets share the Web safe footer and Airvana action colors',
    (tester) async {
      final harness = TestCreateWorkflowHarness();
      tester.view.physicalSize = const Size(430, 932);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        MaterialApp(
          theme: buildAirvanaTheme(),
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context).copyWith(
              size: const Size(430, 932),
              padding: const EdgeInsets.only(top: 36, bottom: 34),
            ),
            child: child!,
          ),
          home: CreatePlayableScreen(workflowRepository: harness.workflow),
        ),
      );
      await tester.pumpAndSettle();

      Future<void> verifySheet({
        required String semanticLabel,
        required String sheetKey,
        required String actionKey,
        required Color actionColor,
      }) async {
        await tester.tap(find.bySemanticsLabel(semanticLabel));
        await tester.pumpAndSettle();

        expect(find.byKey(ValueKey(sheetKey)), findsOneWidget);
        final safeFooter = find.byKey(
          const ValueKey('composer-sheet-safe-footer'),
        );
        expect(safeFooter, findsOneWidget);
        expect(tester.getTopLeft(safeFooter).dy, closeTo(898, .1));
        expect(tester.getBottomRight(safeFooter).dy, closeTo(932, .1));

        final action = tester.widget<FilledButton>(
          find.byKey(ValueKey(actionKey)),
        );
        final actionStates = action.onPressed == null
            ? <WidgetState>{WidgetState.disabled}
            : <WidgetState>{};
        expect(
          action.style?.backgroundColor?.resolve(actionStates),
          actionColor,
        );

        await tester.tap(find.byTooltip('关闭$semanticLabel'));
        await tester.pumpAndSettle();
      }

      await verifySheet(
        semanticLabel: '语音转文字',
        sheetKey: 'composer-voice-sheet',
        actionKey: 'composer-voice-apply',
        actionColor: AirvanaColors.accent,
      );
      await verifySheet(
        semanticLabel: 'AI 灵感',
        sheetKey: 'composer-inspiration-sheet',
        actionKey: 'composer-inspiration-apply',
        actionColor: const Color(0xFFD1D1D6),
      );
      await verifySheet(
        semanticLabel: '项目素材',
        sheetKey: 'composer-assets-sheet',
        actionKey: 'composer-assets-done',
        actionColor: AirvanaColors.accent,
      );
      await verifySheet(
        semanticLabel: '创作问答',
        sheetKey: 'composer-goals-sheet',
        actionKey: 'composer-goals-save',
        actionColor: const Color(0xFFD1D1D6),
      );
    },
  );

  testWidgets('quick creation questions do not reserve blank footer space', (
    tester,
  ) async {
    final harness = TestCreateWorkflowHarness();
    tester.view.physicalSize = const Size(430, 932);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      MaterialApp(
        theme: buildAirvanaTheme(),
        home: CreatePlayableScreen(workflowRepository: harness.workflow),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.bySemanticsLabel('创作问答'));
    await tester.pumpAndSettle();

    final lastQuestion = find.byKey(const ValueKey('composer-goal-question-3'));
    final footer = find.byKey(const ValueKey('composer-sheet-footer'));
    expect(lastQuestion, findsOneWidget);
    expect(footer, findsOneWidget);
    expect(
      tester.getTopLeft(footer).dy - tester.getBottomLeft(lastQuestion).dy,
      lessThanOrEqualTo(12),
    );
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'template tab mirrors Web cards and applies a complete structure',
    (tester) async {
      final harness = TestCreateWorkflowHarness();
      tester.view.physicalSize = const Size(430, 932);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        MaterialApp(
          theme: buildAirvanaTheme(),
          home: CreatePlayableScreen(workflowRepository: harness.workflow),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.bySemanticsLabel('创作首页：能力组合 · 4'), findsOneWidget);
      const retainedIdea = '描述品牌目标和游戏创意，创作一个 Agentic\u00a0Playable';
      await tester.enterText(
        find.byKey(const ValueKey('legacy-composer-input')),
        retainedIdea,
      );
      await tester.tap(find.byKey(const ValueKey('create-home-tab-templates')));
      await tester.pumpAndSettle();

      expect(
        find.byKey(const ValueKey('create-template-home')),
        findsOneWidget,
      );
      expect(find.text('模板'), findsWidgets);
      expect(find.text('Crypto City 安全挑战'), findsOneWidget);
      expect(find.text('星际农场 Community Launch'), findsOneWidget);
      expect(find.bySemanticsLabel('创作首页：模板'), findsOneWidget);

      final selectedTab = tester.widget<AnimatedContainer>(
        find.descendant(
          of: find.byKey(const ValueKey('create-home-tab-templates')),
          matching: find.byType(AnimatedContainer),
        ),
      );
      final selectedDecoration = selectedTab.decoration! as BoxDecoration;
      expect(selectedDecoration.color, const Color(0xFFFFF1F2));
      expect(selectedDecoration.boxShadow, isNotEmpty);

      await tester.tap(find.byKey(const ValueKey('create-template-close')));
      await tester.pumpAndSettle();

      expect(find.byKey(const ValueKey('create-template-home')), findsNothing);
      expect(
        find.byKey(const ValueKey('legacy-composer-intro')),
        findsOneWidget,
      );
      expect(find.bySemanticsLabel('创作首页：能力组合 · 4'), findsOneWidget);
      final retainedPrompt = tester.widget<TextField>(
        find.byKey(const ValueKey('legacy-composer-input')),
      );
      expect(retainedPrompt.controller!.text, retainedIdea);

      await tester.tap(find.byKey(const ValueKey('create-home-tab-templates')));
      await tester.pumpAndSettle();

      await tester.tap(
        find.byKey(const ValueKey('create-template-plb_safety_workshop')),
      );
      await tester.pumpAndSettle();
      expect(find.textContaining('已选用「Crypto City 安全挑战」模板'), findsOneWidget);
      final prompt = tester.widget<TextField>(
        find.byKey(const ValueKey('legacy-composer-input')),
      );
      expect(prompt.controller!.text, contains('Crypto City 安全挑战'));
      expect(prompt.controller!.text, contains('不复制原 Campaign'));
      expect(find.text('互动挑战'), findsWidgets);
      expect(find.text('计时与计分'), findsWidgets);
    },
  );

  testWidgets(
    'quick creation reaches local publication through all eight steps',
    (tester) async {
      final harness = TestCreateWorkflowHarness();
      var homeInvalidated = false;
      tester.view.physicalSize = const Size(430, 932);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        MaterialApp(
          theme: buildAirvanaTheme(),
          home: CreatePlayableScreen(
            workflowRepository: harness.workflow,
            onPublished: () => homeInvalidated = true,
          ),
        ),
      );
      await tester.pumpAndSettle();

      Future<void> tapVisible(Finder finder) async {
        await tester.ensureVisible(finder);
        await tester.pump();
        await tester.tap(finder);
        await tester.pump();
      }

      expect(find.text('描述你想创作的游戏玩法、角色或互动挑战'), findsOneWidget);
      expect(find.text('能力编排'), findsOneWidget);
      await tester.enterText(
        find.byKey(const ValueKey('legacy-composer-input')),
        '帮我创作一个可爱卡通风格的跳一跳游戏，长按蓄力，适合单手操作。',
      );
      await tester.pump();
      await tester.tap(find.byKey(const ValueKey('legacy-composer-submit')));
      await tester.pump();

      for (final answer in ['长按蓄力', '可爱卡通', '90 秒', '不允许']) {
        expect(find.text(answer), findsOneWidget);
        await tester.tap(find.text(answer));
        await tester.pump();
      }

      expect(find.text('Power 能力编排'), findsOneWidget);
      await tapVisible(find.textContaining('确认能力组合'));
      expect(find.text('核对创作方案'), findsOneWidget);

      await tapVisible(find.byKey(const ValueKey('confirm-generate')));
      await tester.pump(const Duration(milliseconds: 100));
      expect(find.text('正在创建 Agentic Playable'), findsOneWidget);
      await tapVisible(find.text('取消生成'));
      expect(find.textContaining('paused'), findsOneWidget);
      await tapVisible(find.text('恢复生成'));
      await tester.pump(const Duration(seconds: 6));
      // 主题标题由创意文本推导（对齐 Web 端 deriveThemeTitle）
      expect(find.text('跳一跳互动挑战'), findsOneWidget);

      // 覆盖 4 条试玩路径：失败（0% 蓄力起跳）→ 重试 → 成功（6 次有效落点）→ 退出
      await tapVisible(find.byKey(const ValueKey('preview-primary'))); // 开始试玩
      await tapVisible(find.byKey(const ValueKey('preview-secondary'))); // 起跳失败
      expect(find.text('失败路径完成'), findsOneWidget);
      await tapVisible(find.byKey(const ValueKey('preview-primary'))); // 重试本局
      for (var platform = 0; platform < 6; platform += 1) {
        for (var charge = 0; charge < 3; charge += 1) {
          await tapVisible(find.byKey(const ValueKey('preview-primary')));
        }
        await tapVisible(find.byKey(const ValueKey('preview-secondary')));
      }
      expect(find.text('已完成 6 次有效落点'), findsOneWidget);
      await tapVisible(find.byKey(const ValueKey('preview-exit')));
      expect(find.text('4/4 路径已验证'), findsOneWidget);
      await tapVisible(find.byKey(const ValueKey('preview-submit-review')));
      expect(find.text('发布设置与人工审核'), findsOneWidget);
      await tapVisible(find.text('模拟人工审核通过'));
      await tapVisible(find.byKey(const ValueKey('publish-local')));
      await tester.pumpAndSettle();
      expect(find.text('已发布到本机 Airvana 首页 · 本地演示'), findsOneWidget);
      for (final label in [
        'release_id:',
        'playable_id:',
        'version_id:',
        'build_id:',
        'review_id:',
      ]) {
        expect(find.textContaining(label), findsOneWidget);
      }
      final workspace = await harness.repository.loadLocalWorkspace();
      expect(workspace.releases, hasLength(1));
      expect(workspace.playables, hasLength(1));
      expect(homeInvalidated, isTrue);
    },
  );

  testWidgets('deep creation exposes campaign governance before generation', (
    tester,
  ) async {
    final harness = TestCreateWorkflowHarness();
    tester.view.physicalSize = const Size(430, 932);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      MaterialApp(
        theme: buildAirvanaTheme(),
        home: CreatePlayableScreen(workflowRepository: harness.workflow),
      ),
    );
    await tester.pumpAndSettle();

    Future<void> tapVisible(Finder finder) async {
      await tester.ensureVisible(finder);
      await tester.pump();
      await tester.tap(finder);
      await tester.pump();
    }

    await tapVisible(find.text('深度'));
    expect(find.text('生成 Brief'), findsOneWidget);
    await tapVisible(find.byKey(const ValueKey('legacy-composer-submit')));
    for (final answer in ['长按蓄力', '可爱卡通', '90 秒', '不允许']) {
      await tapVisible(find.text(answer));
    }
    await tapVisible(find.textContaining('确认能力组合'));

    expect(find.text('Campaign Brief'), findsOneWidget);
    expect(find.text('Campaign Contract'), findsOneWidget);
    expect(find.text('Asset Manifest'), findsOneWidget);
    expect(find.text('审批与 Kill Switch'), findsOneWidget);
    await tapVisible(find.byKey(const ValueKey('confirm-generate')));
    expect(find.text('正在创建 Agentic Playable'), findsOneWidget);
  });

  testWidgets(
    'deep creation questions mirror Web brief governance and connectors',
    (tester) async {
      final harness = TestCreateWorkflowHarness();
      tester.view.physicalSize = const Size(430, 932);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        MaterialApp(
          theme: buildAirvanaTheme(),
          home: CreatePlayableScreen(workflowRepository: harness.workflow),
        ),
      );
      await tester.pumpAndSettle();

      Future<void> tapVisible(Finder finder) async {
        await tester.ensureVisible(finder);
        await tester.pump();
        await tester.tap(finder);
        await tester.pumpAndSettle();
      }

      await tapVisible(find.text('深度'));
      await tapVisible(find.bySemanticsLabel('创作问答'));

      expect(
        find.text('依次确认目标、受众、完成事件与 CTA，再补充 Campaign Brief'),
        findsOneWidget,
      );
      expect(
        find.textContaining('成功事件、CTA 地址、地区、奖励、归因和结算属于锁定字段'),
        findsOneWidget,
      );
      expect(find.text('Deep Campaign Brief'), findsOneWidget);
      for (final key in [
        'campaign-brand',
        'campaign-region',
        'campaign-channel',
        'campaign-cta-url',
        'campaign-reward-rule',
        'campaign-attribution-window',
        'campaign-attribution-model',
        'campaign-settlement-basis',
      ]) {
        expect(find.byKey(ValueKey(key)), findsOneWidget);
      }
      for (final rule in ['账号安全', '营销表达', '用户控制']) {
        expect(find.text(rule), findsOneWidget);
      }
      expect(find.text('发布连接器'), findsOneWidget);
      expect(find.text('保存回答 0/4'), findsOneWidget);

      final brandField = find.descendant(
        of: find.byKey(const ValueKey('campaign-brand')),
        matching: find.byType(TextFormField),
      );
      await tester.enterText(brandField, 'Airvana Web Parity Brand');
      await tester.pump();

      await tapVisible(
        find.byKey(const ValueKey('composer-connector-telegram')),
      );
      expect(find.bySemanticsLabel('移除 Telegram 发布连接器'), findsOneWidget);

      await tapVisible(
        find.byKey(const ValueKey('composer-compliance-details')),
      );
      expect(
        find.byKey(const ValueKey('composer-compliance-sheet')),
        findsOneWidget,
      );
      await tester.enterText(
        find.byKey(const ValueKey('campaign-brand-restrictions')),
        '不得使用未授权 Logo',
      );
      await tapVisible(find.byKey(const ValueKey('composer-compliance-save')));
      expect(find.text('已补充品牌限制'), findsOneWidget);

      for (final option in ['互动参与', '新用户', '完成互动', '了解更多']) {
        await tapVisible(find.text(option));
      }
      expect(find.text('保存回答 4/4'), findsOneWidget);
      await tapVisible(find.byKey(const ValueKey('composer-goals-save')));
      expect(find.byKey(const ValueKey('composer-goals-sheet')), findsNothing);
      expect(find.text('4/4'), findsOneWidget);

      await tapVisible(find.bySemanticsLabel('创作问答'));
      final restoredBrandField = find.descendant(
        of: find.byKey(const ValueKey('campaign-brand')),
        matching: find.byType(TextFormField),
      );
      expect(
        tester.widget<TextFormField>(restoredBrandField).initialValue,
        'Airvana Web Parity Brand',
      );
      expect(find.bySemanticsLabel('移除 Telegram 发布连接器'), findsOneWidget);
      expect(find.text('已补充品牌限制'), findsOneWidget);
      expect(tester.takeException(), isNull);
    },
  );
}
