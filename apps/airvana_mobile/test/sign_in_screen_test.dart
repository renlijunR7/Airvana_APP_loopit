import 'dart:async';
import 'dart:convert';

import 'package:airvana_mobile/app/app_router.dart';
import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/account/presentation/sign_in_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'support/test_create_workflow.dart';

const _demoCode = '246810';

/// http.Response 没有 content-type 时按 latin1 编码正文，中文会抛 ArgumentError，
/// 被 ApiClient 包成「无法连接本地服务」。所有假响应都显式声明 utf-8。
http.Response _json(Object body, [int status = 200]) => http.Response(
  jsonEncode(body),
  status,
  headers: const {'content-type': 'application/json; charset=utf-8'},
);

Map<String, Object> _me(String name) => {
  'me': {'id': 'user_1', 'displayName': name, 'role': 'player'},
  'created': false,
};

const _challenge = {
  'sent': true,
  'expiresInMinutes': 10,
  'delivery': 'local_adapter_inline',
  'demoCode': _demoCode,
};

/// 全屏登录页：版式对齐 Web `obLogin`，行为对齐 Web 的三个 login handler。
void main() {
  const demoCode = _demoCode;

  /// 一个会「真的」让人登录成功的服务端替身：邮箱挑战内联返回验证码，
  /// 校验通过 / Google 本地适配器都签发一个身份。
  http.Client loginCapableServer() => MockClient((request) async {
    final path = request.url.path;
    if (path == '/api/auth/email/challenge') return _json(_challenge);
    if (path == '/api/auth/email/verify') {
      final body = jsonDecode(request.body) as Map<String, dynamic>;
      if (body['code'] != demoCode) {
        return _json({
          'error': {'message': '验证码不正确', 'code': 'invalid_code'},
        }, 400);
      }
      return _json(_me('Kai'));
    }
    if (path == '/api/auth/google/local') {
      final body = jsonDecode(request.body) as Map<String, dynamic>;
      // 名字故意与客户端常量不同：这样断言命中的一定是服务端返回值，
      // 客户端把 displayName 写死也会被发现。请求体仍要带上演示人格。
      expect(body['displayName'], 'Kai Chen');
      expect(body['email'], 'kai.chen@airvana-demo.local');
      return _json(_me('Kai · 服务端'));
    }
    return _json(const <String, dynamic>{});
  });

  Future<TestCreateWorkflowHarness> pumpSignIn(
    WidgetTester tester, {
    http.Client? server,
  }) async {
    final harness = TestCreateWorkflowHarness(httpClient: server);
    tester.view.physicalSize = const Size(430, 932);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          airvanaRepositoryProvider.overrideWithValue(harness.repository),
        ],
        child: MaterialApp.router(
          theme: buildAirvanaTheme(),
          routerConfig: buildAirvanaRouter(initialLocation: '/signin'),
        ),
      ),
    );
    await tester.pumpAndSettle();
    return harness;
  }

  /// SnackBar 自带 4 秒自动关闭的 Timer；测试收尾前把它走完，
  /// 否则 flutter_test 会以「还有 Timer 未完成」判失败。
  Future<void> flushSnackBar(WidgetTester tester) async {
    await tester.pump(const Duration(seconds: 5));
    await tester.pumpAndSettle();
  }

  group('版式与 Web 一致', () {
    testWidgets('logo、副标题、三个胶囊按钮、协议页脚', (tester) async {
      await pumpSignIn(tester);

      expect(find.byKey(const ValueKey('sign-in-screen')), findsOneWidget);
      expect(find.byKey(const ValueKey('airvana-logo-frame')), findsOneWidget);
      // 逐字取自 Web，包括「Playable营销智能体」之间没有空格。
      expect(find.text(kSignInSubtitle), findsOneWidget);
      expect(find.text('Google 一键登录'), findsOneWidget);
      expect(find.text('数字货币钱包登录'), findsOneWidget);
      expect(find.text('邮箱验证码登录'), findsOneWidget);
      expect(find.text('服务协议'), findsOneWidget);
      expect(find.text('隐私政策'), findsOneWidget);
      expect(
        find.text('钱包仅使用签名验证；Airvana 不会索取助记词或私钥'),
        findsOneWidget,
        reason: '钱包安全声明必须可见，且只出现一次',
      );
    });

    testWidgets('三个按钮从上到下是 Google → 钱包 → 邮箱，与 Web 顺序一致', (tester) async {
      await pumpSignIn(tester);
      final google = tester.getTopLeft(
        find.byKey(const ValueKey('sign-in-google')),
      );
      final wallet = tester.getTopLeft(
        find.byKey(const ValueKey('sign-in-wallet')),
      );
      final email = tester.getTopLeft(
        find.byKey(const ValueKey('sign-in-email')),
      );
      expect(google.dy, lessThan(wallet.dy));
      expect(wallet.dy, lessThan(email.dy));
    });

    testWidgets('表单不再平铺在页上——邮箱输入框点了才出现', (tester) async {
      await pumpSignIn(tester);
      expect(find.byKey(const ValueKey('email-login-input')), findsNothing);
      expect(find.byKey(const ValueKey('wallet-address-input')), findsNothing);
    });

    testWidgets('在 Shell 之外，看不到底部主导航', (tester) async {
      await pumpSignIn(tester);
      // 未登录时不应看到主导航，否则用户会以为自己还在已登录的主界面里
      expect(find.byKey(const ValueKey('primary-navigation')), findsNothing);
    });

    testWidgets('本地演示内容仍可通过「先逛逛」到达', (tester) async {
      await pumpSignIn(tester);
      final skip = find.byKey(const ValueKey('sign-in-skip'));
      expect(skip, findsOneWidget, reason: '本地演示内容不需要登录，不能把用户困在登录页');
      await tester.tap(skip);
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('sign-in-screen')), findsNothing);
      expect(find.byKey(const ValueKey('primary-navigation')), findsOneWidget);
    });
  });

  group('Google 一键登录', () {
    testWidgets('一步登录成功 → 进首页并提示', (tester) async {
      await pumpSignIn(tester, server: loginCapableServer());
      await tester.tap(find.byKey(const ValueKey('sign-in-google')));
      await tester.pumpAndSettle();

      expect(find.byKey(const ValueKey('sign-in-screen')), findsNothing);
      expect(find.byKey(const ValueKey('primary-navigation')), findsOneWidget);
      // Web toast：label + '已完成'；身份名来自服务端而不是本地写死。
      expect(find.textContaining('Google 一键登录已完成'), findsOneWidget);
      expect(find.textContaining('Kai · 服务端'), findsOneWidget);
      await flushSnackBar(tester);
    });

    testWidgets('点下去文案不变、按钮位置不动——只把图标位换成进度圈', (tester) async {
      final gate = Completer<http.Response>();
      await pumpSignIn(tester, server: MockClient((request) => gate.future));
      final google = find.byKey(const ValueKey('sign-in-google'));
      final skip = find.byKey(const ValueKey('sign-in-skip'));
      final googleBefore = tester.getRect(google);
      final skipBefore = tester.getRect(skip);

      await tester.tap(google);
      await tester.pump();
      expect(find.text('Google 一键登录'), findsOneWidget, reason: '忙碌时不换文案');
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(tester.getRect(google), googleBefore);
      expect(tester.getRect(skip), skipBefore);

      // 出错后错误文字落在预留槽位里，按钮位置依旧不动。
      gate.complete(
        http.Response(
          '{}',
          200,
          headers: {'content-type': 'application/json; charset=utf-8'},
        ),
      );
      await tester.pumpAndSettle();
      expect(find.textContaining('服务端未返回登录用户'), findsOneWidget);
      expect(tester.getRect(google), googleBefore);
      expect(tester.getRect(skip), skipBefore);
    });

    testWidgets('服务端没给身份就报错留在原地，不退回演示身份', (tester) async {
      await pumpSignIn(tester);
      await tester.tap(find.byKey(const ValueKey('sign-in-google')));
      await tester.pumpAndSettle();

      expect(find.byKey(const ValueKey('sign-in-screen')), findsOneWidget);
      expect(find.byKey(const ValueKey('sign-in-error')), findsOneWidget);
      expect(find.textContaining('服务端未返回登录用户'), findsOneWidget);
    });
  });

  group('邮箱验证码登录面板', () {
    FilledButton primary(WidgetTester tester) => tester.widget<FilledButton>(
      find.byKey(const ValueKey('email-login-primary')),
    );

    testWidgets('点邮箱按钮弹面板；邮箱合法前主按钮不可点；发码前没有验证码框', (tester) async {
      await pumpSignIn(tester, server: loginCapableServer());
      await tester.tap(find.byKey(const ValueKey('sign-in-email')));
      await tester.pumpAndSettle();

      expect(find.byKey(const ValueKey('email-login-card')), findsOneWidget);
      expect(find.text('使用邮箱登录'), findsOneWidget);
      expect(find.text('发送验证码'), findsOneWidget);
      expect(primary(tester).onPressed, isNull);
      expect(find.byKey(const ValueKey('email-login-code')), findsNothing);

      await tester.enterText(
        find.byKey(const ValueKey('email-login-input')),
        'not-an-email',
      );
      await tester.pump();
      expect(
        primary(tester).onPressed,
        isNull,
        reason: '与 Web isValidEmail 同一条正则',
      );

      await tester.enterText(
        find.byKey(const ValueKey('email-login-input')),
        'kai@airvana.test',
      );
      await tester.pump();
      expect(primary(tester).onPressed, isNotNull);
    });

    testWidgets('发码 → 显示本地验证码 → 验证 → 进首页', (tester) async {
      await pumpSignIn(tester, server: loginCapableServer());
      await tester.tap(find.byKey(const ValueKey('sign-in-email')));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const ValueKey('email-login-input')),
        'kai@airvana.test',
      );
      await tester.pump();
      await tester.tap(find.byKey(const ValueKey('email-login-primary')));
      await tester.pumpAndSettle();

      expect(find.byKey(const ValueKey('email-login-code')), findsOneWidget);
      expect(find.text('验证并登录'), findsOneWidget);
      expect(
        find.textContaining(demoCode),
        findsOneWidget,
        reason: '本地适配器内联返回的验证码必须明示，不能假装「已发送到邮箱」',
      );
      expect(find.text('本地验证码'), findsOneWidget);
      expect(find.textContaining('秒后可重新发送'), findsOneWidget);
      expect(primary(tester).onPressed, isNull, reason: '没输验证码不能点');

      await tester.enterText(
        find.byKey(const ValueKey('email-login-code')),
        demoCode,
      );
      await tester.pump();
      await tester.tap(find.byKey(const ValueKey('email-login-primary')));
      await tester.pumpAndSettle();

      expect(find.byKey(const ValueKey('email-login-card')), findsNothing);
      expect(find.byKey(const ValueKey('sign-in-screen')), findsNothing);
      expect(find.byKey(const ValueKey('primary-navigation')), findsOneWidget);
      expect(find.textContaining('邮箱验证码登录已完成 · Kai'), findsOneWidget);
      await flushSnackBar(tester);
    });

    testWidgets('验证码错了显式报错，改对后照常登录', (tester) async {
      await pumpSignIn(tester, server: loginCapableServer());
      await tester.tap(find.byKey(const ValueKey('sign-in-email')));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const ValueKey('email-login-input')),
        'kai@airvana.test',
      );
      await tester.pump();
      await tester.tap(find.byKey(const ValueKey('email-login-primary')));
      await tester.pumpAndSettle();

      await tester.enterText(
        find.byKey(const ValueKey('email-login-code')),
        '000000',
      );
      await tester.pump();
      await tester.tap(find.byKey(const ValueKey('email-login-primary')));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('email-login-error')), findsOneWidget);
      expect(
        tester
            .widget<Text>(find.byKey(const ValueKey('email-login-error')))
            .data,
        '验证码不正确',
        reason: '服务端的错误原因要原样给到用户',
      );
      expect(find.byKey(const ValueKey('sign-in-screen')), findsOneWidget);

      await tester.enterText(
        find.byKey(const ValueKey('email-login-code')),
        demoCode,
      );
      await tester.pump();
      await tester.tap(find.byKey(const ValueKey('email-login-primary')));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('sign-in-screen')), findsNothing);
      await flushSnackBar(tester);
    });

    testWidgets('发完码再改邮箱，已发的验证码作废（Web handleEmailValueChange）', (tester) async {
      await pumpSignIn(tester, server: loginCapableServer());
      await tester.tap(find.byKey(const ValueKey('sign-in-email')));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const ValueKey('email-login-input')),
        'kai@airvana.test',
      );
      await tester.pump();
      await tester.tap(find.byKey(const ValueKey('email-login-primary')));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('email-login-code')), findsOneWidget);

      await tester.enterText(
        find.byKey(const ValueKey('email-login-input')),
        'kai2@airvana.test',
      );
      await tester.pump();
      expect(find.byKey(const ValueKey('email-login-code')), findsNothing);
      expect(find.text('发送验证码'), findsOneWidget);
    });
  });

  group('邮箱面板与请求时序', () {
    testWidgets('验证请求在飞时把面板拖掉，登录仍然完成并进首页', (tester) async {
      final gate = Completer<http.Response>();
      await pumpSignIn(
        tester,
        server: MockClient((request) {
          if (request.url.path == '/api/auth/email/verify') return gate.future;
          return Future.value(_json(_challenge));
        }),
      );
      await tester.tap(find.byKey(const ValueKey('sign-in-email')));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const ValueKey('email-login-input')),
        'kai@airvana.test',
      );
      await tester.pump();
      await tester.tap(find.byKey(const ValueKey('email-login-primary')));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const ValueKey('email-login-code')),
        demoCode,
      );
      await tester.pump();
      await tester.tap(find.byKey(const ValueKey('email-login-primary')));
      await tester.pump();

      // 点遮罩把面板拖掉——此时服务端还没回。
      await tester.tapAt(const Offset(215, 60));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('email-login-card')), findsNothing);
      expect(find.byKey(const ValueKey('sign-in-screen')), findsOneWidget);

      // 服务端此时才签发身份：登录必须照样完成，不能因为面板没了就吞掉。
      gate.complete(_json(_me('Kai')));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('sign-in-screen')), findsNothing);
      expect(find.byKey(const ValueKey('primary-navigation')), findsOneWidget);
      expect(find.textContaining('邮箱验证码登录已完成'), findsOneWidget);
      await flushSnackBar(tester);
    });

    testWidgets('发码请求在飞时改了邮箱，过期的验证码不会应用上去', (tester) async {
      final gate = Completer<http.Response>();
      await pumpSignIn(tester, server: MockClient((request) => gate.future));
      await tester.tap(find.byKey(const ValueKey('sign-in-email')));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byKey(const ValueKey('email-login-input')),
        'kai@airvana.test',
      );
      await tester.pump();
      await tester.tap(find.byKey(const ValueKey('email-login-primary')));
      await tester.pump();
      await tester.enterText(
        find.byKey(const ValueKey('email-login-input')),
        'kai2@airvana.test',
      );
      await tester.pump();

      gate.complete(_json(_challenge));
      await tester.pumpAndSettle();
      expect(
        find.byKey(const ValueKey('email-login-code')),
        findsNothing,
        reason: '旧地址的验证码不该出现',
      );
      expect(find.textContaining('秒后可重新发送'), findsNothing, reason: '不该被冷却锁住');
      expect(find.text('发送验证码'), findsOneWidget);
    });
  });

  group('钱包登录面板', () {
    testWidgets('没有签名器就不给「连接钱包并签名」入口，状态框说明原因', (tester) async {
      await pumpSignIn(tester);
      await tester.tap(find.byKey(const ValueKey('sign-in-wallet')));
      await tester.pumpAndSettle();

      expect(find.text('连接 EVM 数字货币钱包'), findsOneWidget);
      expect(find.byKey(const ValueKey('wallet-login-status')), findsOneWidget);
      expect(find.text('待接入签名器'), findsOneWidget);
      expect(
        find.text('连接钱包并签名'),
        findsNothing,
        reason: '钱包登录没有签名器，不得提供入口也不得假装可用',
      );
      // 能真做的只有地址格式校验，而且要说明它不构成绑定。
      expect(find.textContaining('不构成绑定'), findsOneWidget);
      expect(
        tester
            .widget<OutlinedButton>(
              find.byKey(const ValueKey('wallet-address-validate')),
            )
            .onPressed,
        isNull,
        reason: '没填地址不能点',
      );
    });
  });
}
