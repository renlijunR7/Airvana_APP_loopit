import 'dart:convert';

import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/account/presentation/email_login_sheet.dart';
import 'package:airvana_mobile/features/account/presentation/wallet_login_sheet.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'support/test_create_workflow.dart';

void main() {
  for (final device in [
    (size: const Size(360, 780), bottom: 48.0, scale: 1.0),
    (size: const Size(320, 640), bottom: 24.0, scale: 1.3),
    (size: const Size(390, 844), bottom: 16.0, scale: 1.0),
  ]) {
    for (final wallet in [true, false]) {
      testWidgets(
        '${wallet ? "wallet" : "email"} sheet clears navigation and keyboard '
        '${device.size} / ${device.bottom} / ${device.scale}',
        (tester) async {
          tester.view.devicePixelRatio = 1;
          tester.view.physicalSize = device.size;
          tester.view.viewPadding = FakeViewPadding(
            top: 24,
            bottom: device.bottom,
          );
          tester.view.padding = FakeViewPadding(top: 24, bottom: device.bottom);
          addTearDown(tester.view.reset);
          final harness = TestCreateWorkflowHarness(
            httpClient: MockClient(
              (_) async => http.Response(
                jsonEncode({
                  'sent': true,
                  'expiresInMinutes': 10,
                  'delivery': 'local_adapter_inline',
                  'demoCode': '246810',
                }),
                200,
                headers: {'content-type': 'application/json; charset=utf-8'},
              ),
            ),
          );
          await tester.pumpWidget(
            ProviderScope(
              overrides: [
                airvanaRepositoryProvider.overrideWithValue(harness.repository),
              ],
              child: MaterialApp(
                theme: buildAirvanaTheme(),
                builder: (context, child) => MediaQuery(
                  data: MediaQuery.of(
                    context,
                  ).copyWith(textScaler: TextScaler.linear(device.scale)),
                  child: child!,
                ),
                home: Scaffold(
                  body: Builder(
                    builder: (context) => Center(
                      child: TextButton(
                        onPressed: () => wallet
                            ? showWalletLoginSheet(context)
                            : showEmailLoginSheet(context, onSignedIn: (_) {}),
                        child: const Text('Open login'),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          );
          await tester.tap(find.text('Open login'));
          await tester.pumpAndSettle();

          final action = find.byKey(
            ValueKey(
              wallet ? 'wallet-address-validate' : 'email-login-primary',
            ),
          );
          final field = find.byKey(
            ValueKey(wallet ? 'wallet-address-input' : 'email-login-input'),
          );
          Future<void> expectReachable(
            Finder target,
            double obstruction,
          ) async {
            await tester.ensureVisible(target);
            await tester.pumpAndSettle();
            final rect = tester.getRect(target);
            expect(
              rect.bottom,
              lessThanOrEqualTo(device.size.height - obstruction - 20 + .1),
            );
            expect(rect.top, greaterThanOrEqualTo(24));
            expect(target.hitTestable(), findsOneWidget);
            expect(tester.takeException(), isNull);
          }

          // Closed keyboard: the entire action stays above three-button/gesture nav.
          await expectReachable(action, device.bottom);
          await tester.ensureVisible(field);
          await tester.enterText(
            field,
            wallet
                ? '0x1111111111111111111111111111111111111111'
                : 'kai@example.com',
          );
          tester.view.viewInsets = const FakeViewPadding(bottom: 300);
          tester.view.padding = const FakeViewPadding(top: 24);
          await tester.pumpAndSettle();
          await expectReachable(field, 300);
          await expectReachable(action, 300);

          // Only one bottom obstruction is reserved, not keyboard + nav together.
          final scroll = find.byType(SingleChildScrollView);
          expect(
            tester.getBottomRight(scroll).dy,
            closeTo(device.size.height - 320, .1),
          );
          if (!wallet) {
            await tester.tap(action);
            await tester.pumpAndSettle();
            expect(
              find.byKey(const ValueKey('email-login-code')),
              findsOneWidget,
            );
            await expectReachable(
              find.byKey(const ValueKey('email-login-resend')),
              300,
            );
            await expectReachable(action, 300);
          }

          tester.view.viewInsets = const FakeViewPadding();
          tester.view.padding = FakeViewPadding(top: 24, bottom: device.bottom);
          await tester.pumpAndSettle();
          await expectReachable(action, device.bottom);
          if (!wallet) {
            await expectReachable(
              find.byKey(const ValueKey('email-login-resend')),
              device.bottom,
            );
          }
          await tester.pumpWidget(const SizedBox.shrink());
          await tester.pumpAndSettle();
        },
      );
    }
  }
}
