import 'package:airvana_mobile/app/app_router.dart';
import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/shared/domain/airvana_models.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/test_create_workflow.dart';

void main() {
  testWidgets(
    'creator center keeps three tabs with evidence-based advice and growth',
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
              initialLocation: '/profile/secondary/creatorCenter',
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      // 运营数据（默认）：身份卡 + 周期切换 + 指标口径 + 免责声明
      expect(find.text('创作者中心'), findsOneWidget);
      // 创作周报置顶：服务端未接入时如实显示未接入，不给任何数字
      expect(find.byKey(const ValueKey('creator-weekly-report')), findsOneWidget);
      expect(find.textContaining('创作周报需要服务端数据'), findsOneWidget);
      await tester.scrollUntilVisible(find.text('创作者已开通 · 演示'), 200);
      expect(find.text('创作者已开通 · 演示'), findsOneWidget);
      await tester.scrollUntilVisible(find.text('互动完成 · 演示'), 200);
      expect(find.text('互动完成 · 演示'), findsOneWidget);
      expect(find.text('0 · 待接入'), findsOneWidget);
      expect(find.byKey(const ValueKey('creator-trend-chart')), findsOneWidget);
      expect(
        find.byKey(const ValueKey('creator-earnings-disclaimer')),
        findsOneWidget,
      );
      expect(find.text('128'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('creator-period-30d')));
      await tester.pump();
      expect(find.text('512'), findsOneWidget);

      // Campaign 漏斗：canonical 事件 + 接入状态
      await tester.scrollUntilVisible(find.text('playable_complete'), 200);
      expect(find.text('lead_submit'), findsOneWidget);
      expect(find.text('待接入'), findsNWidgets(2));

      // 运营建议：证据四件套（先滚回顶部再切 Tab）
      Future<void> scrollToTop() async {
        for (var round = 0; round < 3; round += 1) {
          await tester.drag(
            find.byKey(const ValueKey('creator-center-scroll')),
            const Offset(0, 900),
          );
          await tester.pump();
        }
      }

      await scrollToTop();
      await tester.tap(find.byKey(const ValueKey('creator-center-tab-advice')));
      await tester.pumpAndSettle();
      expect(find.text('本周诊断摘要'), findsOneWidget);
      expect(find.text('依据'), findsNWidgets(3));
      expect(find.text('假设'), findsNWidgets(3));
      expect(find.text('目标'), findsNWidgets(3));
      // 创作灵感挑战置顶，且未接入时不编造话题热度
      expect(find.byKey(const ValueKey('creator-challenges')), findsOneWidget);
      expect(find.textContaining('灵感挑战需要服务端数据'), findsOneWidget);
      await tester.scrollUntilVisible(find.text('灵感转 Brief'), 200);
      expect(find.text('灵感转 Brief'), findsOneWidget);

      // 增长体系：阶段免责声明 + 里程碑 + 机会申请状态本地记录
      await scrollToTop();
      await tester.tap(find.byKey(const ValueKey('creator-center-tab-growth')));
      await tester.pumpAndSettle();
      // 成长计划奖励任务置顶：未接入时不给进度
      expect(
        find.byKey(const ValueKey('creator-growth-tasks')),
        findsOneWidget,
      );
      expect(find.textContaining('成长任务进度需要服务端数据'), findsOneWidget);
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('creator-growth-disclaimer')),
        200,
      );
      expect(
        find.byKey(const ValueKey('creator-growth-disclaimer')),
        findsOneWidget,
      );
      expect(find.text('开通创作者身份'), findsOneWidget);
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('creator-opportunity-opp_wallet_edu')),
        200,
      );
      expect(find.text('可申请'), findsWidgets);
      await tester.ensureVisible(
        find.byKey(const ValueKey('creator-opportunity-opp_wallet_edu')),
      );
      await tester.pump();
      await tester.tap(
        find.byKey(const ValueKey('creator-opportunity-opp_wallet_edu')),
      );
      await tester.pump();
      expect(find.text('已申请 · 待审核'), findsOneWidget);
      expect(find.text('已提交申请意向'), findsOneWidget);

      // 创作学院垫底：只指向应用内真实规则页，不虚构课程
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('creator-academy')),
        260,
      );
      expect(find.text('暂无视频课程'), findsNothing);
      expect(find.textContaining('指向应用内真实规则页面'), findsOneWidget);
      expect(
        find.byKey(const ValueKey('creator-academy-publishingGovernance')),
        findsOneWidget,
      );
      await tester.tap(
        find.byKey(const ValueKey('creator-academy-publishingGovernance')),
      );
      await tester.pumpAndSettle();
      expect(
        find.byKey(const ValueKey('profile-secondary-publishingGovernance')),
        findsOneWidget,
        reason: '学院条目应打开真实存在的二级页',
      );
    },
  );
}
