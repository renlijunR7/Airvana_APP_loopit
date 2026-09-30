import 'dart:async';
import 'dart:convert';

import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/core/network/airvana_api_client.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/shared/data/legacy_demo_catalog.dart';
import 'package:airvana_mobile/features/shared/domain/comment_report.dart';
import 'package:airvana_mobile/features/shared/presentation/playable_social_sheets.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'support/test_create_workflow.dart';

http.Response jsonResponse(Object body, [int status = 200]) => http.Response(
  jsonEncode(body),
  status,
  headers: const {'content-type': 'application/json; charset=utf-8'},
);
Map<String, Object> receipt({
  bool duplicate = false,
  bool demo = true,
  String status = 'open',
}) => {
  'report': {
    'id': 'comment_report_test_1',
    'status': status,
    'demo': demo,
    'alreadyReported': duplicate,
  },
};

TestCreateWorkflowHarness harnessWith(
  Future<http.Response> Function(http.Request) report,
) => TestCreateWorkflowHarness(
  httpClient: MockClient((request) async {
    if (request.url.path == '/api/demo/mobile-playables') {
      final key =
          ((jsonDecode(request.body) as Map)['playables'] as List).first['key'];
      return jsonResponse({
        'mapping': {key: 'content_mobilearcade_$key'},
      });
    }
    if (request.url.path == '/api/comment-reports') return report(request);
    return jsonResponse({});
  }),
);

Future<void> openReport(
  WidgetTester tester,
  TestCreateWorkflowHarness harness,
) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        airvanaRepositoryProvider.overrideWithValue(harness.repository),
      ],
      child: MaterialApp(
        theme: buildAirvanaTheme(),
        home: Scaffold(
          body: Align(
            alignment: Alignment.bottomCenter,
            child: AirvanaLocalCommentSheet(
              playable: LegacyDemoCatalog.byId('plb_orchard_merge')!,
            ),
          ),
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
  await tester.tap(find.text('举报').first);
  await tester.pumpAndSettle();
}

Future<void> pick(WidgetTester tester, String reason) async {
  final finder = find.byKey(ValueKey('comment-report-reason-$reason'));
  await tester.ensureVisible(finder);
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

Finder get submit => find.byKey(const ValueKey('comment-report-submit'));

void main() {
  testWidgets('report opens for the selected comment; cancel sends nothing', (
    tester,
  ) async {
    var requests = 0;
    final harness = harnessWith((_) async {
      requests++;
      return jsonResponse(receipt());
    });
    await openReport(tester, harness);
    expect(find.byKey(const ValueKey('comment-report-sheet')), findsOneWidget);
    expect(find.text('玩法节奏很清楚，失败后也能立即重试。').last, findsOneWidget);
    expect(tester.widget<FilledButton>(submit).onPressed, isNull);
    await pick(tester, 'spam');
    await tester.tap(find.byKey(const ValueKey('comment-report-close')));
    await tester.pumpAndSettle();
    expect(requests, 0);
    expect(find.text('2 条评论'), findsOneWidget);
    expect(find.text('举报'), findsNWidgets(2));
  });

  testWidgets(
    'other requires details and only a confirmed server receipt succeeds',
    (tester) async {
      Map<String, dynamic>? sent;
      final harness = harnessWith((request) async {
        sent = jsonDecode(request.body) as Map<String, dynamic>;
        return jsonResponse(receipt(), 201);
      });
      await openReport(tester, harness);
      await pick(tester, 'other');
      expect(tester.widget<FilledButton>(submit).onPressed, isNull);
      final details = find.byKey(const ValueKey('comment-report-details'));
      await tester.ensureVisible(details);
      await tester.enterText(details, '  ');
      expect(tester.widget<FilledButton>(submit).onPressed, isNull);
      await tester.enterText(details, '  这是一条测试说明  ');
      await tester.pump();
      await tester.tap(submit);
      await tester.pumpAndSettle();
      expect(sent?['demoCommentKey'], 'demo-mina');
      expect(sent?['details'], '这是一条测试说明');
      expect(sent?.containsKey('commentId'), isFalse);
      expect(sent?.containsKey('author'), isFalse);
      expect(find.text('演示举报已记录'), findsOneWidget);
      expect(find.text('仅用于本地演示，不代表生产平台已受理。'), findsOneWidget);
      expect(find.textContaining('comment_report_test_1'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('comment-report-done')));
      await tester.pumpAndSettle();
      expect(find.text('已举报'), findsOneWidget);
      expect(find.text('2 条评论'), findsOneWidget);
    },
  );

  testWidgets(
    'double submit sends once and dismissal is blocked while pending',
    (tester) async {
      final pending = Completer<http.Response>();
      var requests = 0;
      final harness = harnessWith((_) {
        requests++;
        return pending.future;
      });
      await openReport(tester, harness);
      await pick(tester, 'spam');
      await tester.tap(submit);
      await tester.pump();
      await tester.tap(submit);
      await tester.pump();
      expect(requests, 1);
      expect(
        tester
            .widget<IconButton>(
              find.byKey(const ValueKey('comment-report-close')),
            )
            .onPressed,
        isNull,
      );
      expect(find.text('提交中…'), findsOneWidget);
      pending.complete(jsonResponse(receipt()));
      await tester.pumpAndSettle();
      expect(
        find.byKey(const ValueKey('comment-report-success')),
        findsOneWidget,
      );
    },
  );

  testWidgets(
    'failed submission retains details and retries without false success',
    (tester) async {
      var requests = 0;
      final harness = harnessWith((_) async {
        if (++requests == 1) {
          return jsonResponse({
            'error': {'message': '暂时无法连接'},
          }, 503);
        }
        return jsonResponse(receipt(duplicate: true, status: 'resolved'));
      });
      await openReport(tester, harness);
      await pick(tester, 'other');
      final details = find.byKey(const ValueKey('comment-report-details'));
      await tester.ensureVisible(details);
      await tester.enterText(details, '保留我的说明');
      await tester.pump();
      await tester.tap(submit);
      await tester.pumpAndSettle();
      expect(
        find.byKey(const ValueKey('comment-report-success')),
        findsNothing,
      );
      expect(find.textContaining('暂时无法连接'), findsOneWidget);
      expect(tester.widget<TextField>(details).controller!.text, '保留我的说明');
      await tester.tap(submit);
      await tester.pumpAndSettle();
      expect(find.text('这条评论已举报'), findsOneWidget);
      expect(find.text('该举报已有处理结果，本次未重复提交。'), findsOneWidget);
      expect(requests, 2);
    },
  );

  testWidgets(
    'small screen, scaled text and keyboard keep the submit action reachable',
    (tester) async {
      tester.view.physicalSize = const Size(320, 568);
      tester.view.devicePixelRatio = 1;
      tester.platformDispatcher.textScaleFactorTestValue = 1.3;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      addTearDown(tester.view.resetViewInsets);
      await openReport(
        tester,
        harnessWith((_) async => jsonResponse(receipt())),
      );
      await pick(tester, 'other');
      tester.view.viewInsets = const FakeViewPadding(bottom: 230);
      await tester.pumpAndSettle();
      final details = find.byKey(const ValueKey('comment-report-details'));
      await tester.ensureVisible(details);
      await tester.enterText(details, '小屏举报测试');
      await tester.pumpAndSettle();
      expect(submit.hitTestable(), findsOneWidget);
      expect(tester.getBottomRight(submit).dy, lessThanOrEqualTo(338));
      expect(tester.takeException(), isNull);
    },
  );

  test(
    'real reports use the comment id and never send a demo key or author snapshot',
    () async {
      Map<String, dynamic>? sent;
      final harness = harnessWith((request) async {
        sent = jsonDecode(request.body) as Map<String, dynamic>;
        return jsonResponse(receipt(demo: false));
      });
      final result = await harness.repository.reportComment(
        playableKey: 'content_actual',
        title: 'Actual',
        commentId: 'comment_1',
        reason: CommentReportReason.spam,
      );
      expect(result.demo, isFalse);
      expect(sent, {
        'contentId': 'content_actual',
        'commentId': 'comment_1',
        'reason': 'spam',
        'details': '',
      });
    },
  );

  test(
    'empty or mismatched responses and network failures cannot produce success',
    () async {
      for (final response in [
        {},
        {
          'report': {'id': 'x', 'status': 'open'},
        },
        receipt(demo: true),
      ]) {
        final harness = harnessWith((_) async => jsonResponse(response));
        await expectLater(
          harness.repository.reportComment(
            playableKey: 'content_actual',
            title: 'Actual',
            commentId: 'comment_1',
            reason: CommentReportReason.spam,
          ),
          throwsA(isA<ApiException>()),
        );
      }
      final offline = harnessWith(
        (_) async => throw http.ClientException('offline'),
      );
      await expectLater(
        offline.repository.reportComment(
          playableKey: 'content_actual',
          title: 'Actual',
          commentId: 'comment_1',
          reason: CommentReportReason.spam,
        ),
        throwsA(isA<ApiException>()),
      );
    },
  );

  test('signed out user is not silently logged in by reporting', () async {
    var requests = 0;
    final harness = harnessWith((_) async {
      requests++;
      return jsonResponse(receipt());
    });
    await harness.repository.signOut();
    await expectLater(
      harness.repository.reportComment(
        playableKey: 'content_actual',
        title: 'Actual',
        commentId: 'comment_1',
        reason: CommentReportReason.spam,
      ),
      throwsA(isA<ApiException>()),
    );
    expect(requests, 0);
  });
}
