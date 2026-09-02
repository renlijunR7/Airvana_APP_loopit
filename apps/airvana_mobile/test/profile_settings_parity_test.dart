import 'package:airvana_mobile/app/app_router.dart';
import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/test_create_workflow.dart';

void main() {
  setUp(() {
    TestWidgetsFlutterBinding.ensureInitialized();
  });

  testWidgets(
    'all Web settings destinations expose functional Flutter controls',
    (tester) async {
      final harness = TestCreateWorkflowHarness();
      _usePhoneViewport(tester);

      final expectations = <String, List<Finder>>{
        'subscription': [
          find.byKey(const ValueKey('subscription-center-parity')),
          find.text('CURRENT PLAN · 本机演示'),
        ],
        'identityVerification': [
          find.byKey(const ValueKey('identity-roles-parity')),
          find.byKey(const ValueKey('identity-role-kyc')),
        ],
        'brandPartnership': [
          find.byKey(const ValueKey('campaign-workbench-parity')),
          find.text('Airvana Campaign Demo'),
        ],
        'creatorBenefits': [
          find.byKey(const ValueKey('rights-hub-parity')),
          find.text('可兑换权益'),
        ],
        'publishingGovernance': [
          find.byKey(const ValueKey('governance-parity')),
          find.byKey(const ValueKey('governance-tab-risk')),
        ],
        'feedback': [
          find.byKey(const ValueKey('feedback-parity')),
          find.text('联系客服'),
        ],
        'featureCenter': [
          find.byKey(const ValueKey('product-center-parity')),
          find.text('前端交付与依赖地图'),
        ],
        'language': [
          find.byKey(const ValueKey('language-parity')),
          find.byKey(const ValueKey('language-zh-CN')),
        ],
        'preferences': [
          find.byKey(const ValueKey('preferences-parity')),
          find.byKey(const ValueKey('settings-push-toggle')),
        ],
        'deleteAccount': [
          find.byKey(const ValueKey('delete-account-parity')),
          find.byKey(const ValueKey('delete-account-hero')),
          find.byKey(const ValueKey('delete-account-checklist')),
        ],
      };

      for (final entry in expectations.entries) {
        await _pumpRoute(tester, harness, entry.key);
        for (final finder in entry.value) {
          expect(finder, findsOneWidget, reason: '${entry.key} 缺少 Web 对齐控件');
        }
        if (entry.key == 'language') {
          expect(find.text('语言偏好'), findsNothing);
          expect(find.textContaining('语言偏好会保存在当前设备'), findsNothing);
        }
        expect(tester.takeException(), isNull, reason: '${entry.key} 渲染异常');
      }
    },
  );

  testWidgets(
    'settings actions persist subscription campaign and feedback state',
    (tester) async {
      final harness = TestCreateWorkflowHarness();
      _usePhoneViewport(tester);

      await _pumpRoute(tester, harness, 'subscription');
      await tester.tap(
        find.byKey(const ValueKey('subscription-plan-creator_pro')),
      );
      await tester.pumpAndSettle();
      final upgrade = find.text('模拟升级');
      await _expectOnPage(tester, upgrade, reason: '订阅升级按钮未渲染');
      await tester.tap(upgrade);
      await tester.pumpAndSettle();
      expect(
        (await harness.repository.loadLocalProfileFeatureState())
            .subscriptionPlanKey,
        'creator_pro',
      );

      await _pumpRoute(tester, harness, 'brandPartnership');
      final advance = find.text('确认规则并开始创作');
      await _expectOnPage(tester, advance, reason: 'Campaign 推进按钮未渲染');
      await tester.tap(advance);
      await tester.pumpAndSettle();
      expect(
        (await harness.repository.loadLocalProfileFeatureState()).campaignStage,
        1,
      );

      await _pumpRoute(tester, harness, 'feedback');
      await _expectOnPage(
        tester,
        find.byKey(const ValueKey('feedback-body')),
        reason: '反馈输入框未渲染',
      );
      await tester.enterText(
        find.byKey(const ValueKey('feedback-body')),
        '希望增加设置页面的完整功能验证。',
      );
      await tester.pump();
      final saveFeedback = find.text('保存意见反馈');
      await _expectOnPage(tester, saveFeedback, reason: '反馈保存按钮未渲染');
      await tester.tap(saveFeedback);
      await tester.pumpAndSettle();
      final feature = await harness.repository.loadLocalProfileFeatureState();
      expect(feature.feedbackTickets, hasLength(1));
      expect(feature.feedbackTickets.single['status'], 'local-record');
    },
  );

  testWidgets('feedback controls use the shared one-pixel border system', (
    tester,
  ) async {
    final harness = TestCreateWorkflowHarness();
    _usePhoneViewport(tester);
    await _pumpRoute(tester, harness, 'feedback');

    final body = tester.widget<TextField>(
      find.byKey(const ValueKey('feedback-body')),
    );
    final enabledBorder = body.decoration?.enabledBorder as OutlineInputBorder;
    final focusedBorder = body.decoration?.focusedBorder as OutlineInputBorder;
    expect(enabledBorder.borderSide.color, AirvanaColors.line);
    expect(enabledBorder.borderSide.width, 1);
    expect(focusedBorder.borderSide.color, const Color(0xFFFF7B85));
    expect(focusedBorder.borderSide.width, 1);

    final selected = tester.widget<ChoiceChip>(
      find.byKey(const ValueKey('feedback-category-product')),
    );
    final inactive = tester.widget<ChoiceChip>(
      find.byKey(const ValueKey('feedback-category-bug')),
    );
    expect(selected.side?.color, const Color(0xFFFF9099));
    expect(selected.side?.width, 1);
    expect(inactive.side?.color, AirvanaColors.line);
    expect(inactive.side?.width, 1);
  });

  testWidgets(
    'governance and notification settings update their real local consumers',
    (tester) async {
      final harness = TestCreateWorkflowHarness();
      _usePhoneViewport(tester);

      await _pumpRoute(tester, harness, 'publishingGovernance');
      await tester.tap(find.byKey(const ValueKey('governance-tab-control')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('governance-kill-switch')));
      await tester.pumpAndSettle();
      var feature = await harness.repository.loadLocalProfileFeatureState();
      expect(feature.governanceTab, 'control');
      expect(feature.governanceKillSwitch, isTrue);

      await _pumpRoute(tester, harness, 'preferences');
      await tester.tap(find.byKey(const ValueKey('settings-push-toggle')));
      await tester.pumpAndSettle();
      feature = await harness.repository.loadLocalProfileFeatureState();
      expect(feature.pushEnabled, isFalse);
    },
  );

  testWidgets('preferences use shared borders and a floating card notice', (
    tester,
  ) async {
    final harness = TestCreateWorkflowHarness();
    _usePhoneViewport(tester);
    await _pumpRoute(tester, harness, 'preferences');

    final displayDivider = tester.widget<Divider>(
      find.byKey(const ValueKey('settings-display-divider')),
    );
    expect(displayDivider.color, AirvanaColors.line);
    expect(displayDivider.thickness, 1);

    for (final label in ['服务协议', '隐私政策', '版本更新']) {
      final divider = tester.widget<Divider>(
        find.byKey(ValueKey('settings-link-divider-$label')),
      );
      expect(divider.color, AirvanaColors.line);
      expect(divider.thickness, 1);
    }

    for (final key in [
      'settings-display-surface',
      'settings-links-surface',
      'settings-delete-surface',
    ]) {
      final surface = tester.widget<Container>(
        find
            .descendant(
              of: find.byKey(ValueKey(key)),
              matching: find.byType(Container),
            )
            .first,
      );
      final decoration = surface.decoration! as BoxDecoration;
      expect(decoration.border!.top.color, AirvanaColors.line);
      expect(decoration.border!.top.width, 1);
    }

    final themeControl = tester.widget<Container>(
      find.byKey(const ValueKey('settings-theme-control')),
    );
    final themeDecoration = themeControl.decoration! as BoxDecoration;
    expect(themeDecoration.border!.top.color, AirvanaColors.line);
    expect(themeDecoration.border!.top.width, 1);

    await tester.tap(find.text('版本更新'));
    await tester.pump();
    final noticeFinder = find.byKey(const ValueKey('settings-floating-notice'));
    expect(noticeFinder, findsOneWidget);
    final notice = tester.widget<SnackBar>(noticeFinder);
    final noticeTheme = Theme.of(tester.element(noticeFinder)).snackBarTheme;
    expect(notice.behavior, isNull);
    expect(notice.backgroundColor, isNull);
    expect(noticeTheme.behavior, SnackBarBehavior.floating);
    expect(noticeTheme.backgroundColor, AirvanaColors.ink);
    expect(noticeTheme.width, 320);
    expect(noticeTheme.shape, isA<StadiumBorder>());
    expect(noticeTheme.contentTextStyle?.color, AirvanaColors.canvas);
    expect(noticeTheme.contentTextStyle?.fontSize, 13);
    expect(noticeTheme.contentTextStyle?.fontWeight, FontWeight.w800);
    expect(
      find.byKey(const ValueKey('settings-floating-notice-icon')),
      findsNothing,
    );
    expect(find.text('当前已是最新版本 v1.0.0'), findsOneWidget);
  });

  testWidgets('legal entries open the Web parity full-screen documents', (
    tester,
  ) async {
    final harness = TestCreateWorkflowHarness();
    _usePhoneViewport(tester);
    await _pumpRoute(tester, harness, 'preferences');

    await tester.tap(find.text('服务协议'));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('profile-legal-terms')), findsOneWidget);
    expect(find.text('Terms of Service / 服务协议'), findsOneWidget);
    expect(find.byKey(const ValueKey('profile-legal-hero')), findsOneWidget);
    await tester.scrollUntilVisible(
      find.byKey(const ValueKey('legal-draft-note')),
      260,
      scrollable: find.descendant(
        of: find.byKey(const ValueKey('profile-legal-scroll-terms')),
        matching: find.byType(Scrollable),
      ),
    );
    expect(find.byKey(const ValueKey('legal-draft-note')), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('目录'),
      180,
      scrollable: find.descendant(
        of: find.byKey(const ValueKey('profile-legal-scroll-terms')),
        matching: find.byType(Scrollable),
      ),
    );
    expect(find.text('目录'), findsOneWidget);
    expect(find.byType(AlertDialog), findsNothing);

    await tester.tap(find.byKey(const ValueKey('profile-legal-back')));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('preferences-parity')), findsOneWidget);

    await tester.tap(find.text('隐私政策'));
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('profile-legal-privacy')), findsOneWidget);
    expect(find.text('Privacy Policy / 隐私政策'), findsOneWidget);
    await tester.scrollUntilVisible(
      find.text('Personal Information We Collect'),
      300,
      scrollable: find.descendant(
        of: find.byKey(const ValueKey('profile-legal-scroll-privacy')),
        matching: find.byType(Scrollable),
      ),
    );
    expect(find.text('Personal Information We Collect'), findsOneWidget);
    expect(find.byType(AlertDialog), findsNothing);
  });

  testWidgets('delete account entry follows the Web full-page boundary flow', (
    tester,
  ) async {
    final harness = TestCreateWorkflowHarness();
    _usePhoneViewport(tester);
    await _pumpRoute(tester, harness, 'preferences');

    final deleteAccount = find.text('删除账号');
    await _expectOnPage(tester, deleteAccount, reason: '删除账号入口未渲染');
    await tester.tap(deleteAccount);
    await tester.pumpAndSettle();

    expect(
      find.byKey(const ValueKey('profile-secondary-deleteAccount')),
      findsOneWidget,
    );
    expect(find.text('申请删除 Airvana 账号'), findsOneWidget);
    expect(find.textContaining('提交前请确认'), findsOneWidget);
    expect(find.textContaining('当前为前端演示模式'), findsOneWidget);
    expect(find.byType(AlertDialog), findsNothing);
  });

  testWidgets(
    'logout keeps the Web confirmation step and preserves local data',
    (tester) async {
      final harness = TestCreateWorkflowHarness();
      _usePhoneViewport(tester);
      await _pumpRoute(tester, harness, 'settings');

      final logout = find.text('退出登录');
      await _expectOnPage(tester, logout, reason: '退出登录入口未渲染');
      await tester.tap(logout);
      await tester.pumpAndSettle();

      expect(
        find.byKey(const ValueKey('logout-confirm-dialog')),
        findsOneWidget,
      );
      expect(find.byKey(const ValueKey('logout-confirm-icon')), findsOneWidget);
      expect(find.byKey(const ValueKey('logout-confirm-copy')), findsOneWidget);
      expect(find.text('退出登录？'), findsOneWidget);
      expect(find.textContaining('本机保存的草稿、AIP 流水和功能状态不会丢失'), findsOneWidget);
      expect(find.text('确认退出'), findsOneWidget);
      expect(find.byType(AlertDialog), findsNothing);
      await tester.tap(find.byKey(const ValueKey('logout-confirm-cancel')));
      await tester.pumpAndSettle();
      expect(
        find.byKey(const ValueKey('profile-secondary-settings')),
        findsOneWidget,
      );
    },
  );
}

void _usePhoneViewport(WidgetTester tester) {
  tester.view.physicalSize = const Size(430, 932);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}

Future<void> _pumpRoute(
  WidgetTester tester,
  TestCreateWorkflowHarness harness,
  String destination,
) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        airvanaRepositoryProvider.overrideWithValue(harness.repository),
      ],
      child: MaterialApp.router(
        theme: buildAirvanaTheme(),
        routerConfig: buildAirvanaRouter(
          initialLocation: '/profile/secondary/$destination',
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> _expectOnPage(
  WidgetTester tester,
  Finder finder, {
  required String reason,
}) async {
  if (finder.evaluate().isEmpty) {
    await tester.scrollUntilVisible(
      finder,
      280,
      scrollable: find.byType(Scrollable).last,
    );
    await tester.pumpAndSettle();
  }
  expect(finder, findsOneWidget, reason: reason);
}
