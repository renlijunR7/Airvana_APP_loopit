import 'dart:convert';

import 'package:airvana_mobile/app/app_router.dart';
import 'package:airvana_mobile/app/providers.dart';
import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image_picker/image_picker.dart';

import 'support/test_create_workflow.dart';

void main() {
  testWidgets('profile stats tabs open works and persist follow changes', (
    tester,
  ) async {
    final harness = TestCreateWorkflowHarness();
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
          routerConfig: buildAirvanaRouter(
            initialLocation: '/profile/secondary/likes',
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('互动关系'), findsOneWidget);
    expect(find.text('Crypto City 安全挑战'), findsOneWidget);
    expect(find.text('892'), findsOneWidget);
    final statsBackground = tester.widget<ColoredBox>(
      find.byKey(const ValueKey('profile-stats-background')),
    );
    expect(statsBackground.color, Colors.white);
    final statsSurface = tester.widget<Container>(
      find.byKey(const ValueKey('profile-stats-surface')),
    );
    final statsDecoration = statsSurface.decoration! as BoxDecoration;
    expect(statsDecoration.border, isNull);
    expect(find.text('关系与操作保存在当前设备；接入账号服务后再进行跨设备同步。'), findsNothing);

    await tester.tap(find.byKey(const ValueKey('profile-stats-tab-followers')));
    await tester.pumpAndSettle();
    expect(find.text('Nina'), findsOneWidget);
    expect(find.text('Leo'), findsOneWidget);
    expect(find.text('回关'), findsOneWidget);

    await tester.tap(find.byTooltip('编辑与 Nina 的关系'));
    await tester.pumpAndSettle();
    expect(find.text('相互关注'), findsNWidgets(2));

    await tester.tap(find.byKey(const ValueKey('profile-stats-tab-following')));
    await tester.pumpAndSettle();
    expect(find.text('Nina'), findsOneWidget);
    expect(find.text('Leo'), findsOneWidget);

    await tester.tap(find.byTooltip('编辑与 Leo 的关系'));
    await tester.pumpAndSettle();
    expect(find.text('Leo'), findsNothing);

    final persisted = await harness.repository.loadLocalSocialState();
    expect(persisted.followingOwners, ['@nina']);
  });

  testWidgets('profile edit saves fields and updates the profile card', (
    tester,
  ) async {
    final harness = TestCreateWorkflowHarness();
    final avatarBytes = base64Decode(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    );
    tester.view.physicalSize = const Size(430, 932);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          airvanaRepositoryProvider.overrideWithValue(harness.repository),
          profileAvatarPickerProvider.overrideWithValue(
            () async => XFile.fromData(
              avatarBytes,
              name: 'avatar.png',
              mimeType: 'image/png',
            ),
          ),
        ],
        child: MaterialApp.router(
          theme: buildAirvanaTheme(),
          routerConfig: buildAirvanaRouter(initialLocation: '/profile'),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('编辑个人信息'));
    await tester.pumpAndSettle();
    expect(find.text('上传头像'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('profile-avatar-upload')));
    await tester.pumpAndSettle();
    expect(find.text('已选择 · 当前会话'), findsOneWidget);
    expect(find.text('更换头像'), findsOneWidget);
    expect(
      find.byKey(const ValueKey('profile-avatar-preview-memory')),
      findsOneWidget,
    );
    await tester.enterText(
      find.byKey(const ValueKey('profile-name-field')),
      'Kai Studio',
    );
    await tester.enterText(
      find.byKey(const ValueKey('profile-bio-field')),
      '持续创作并运营 Agentic Playable。',
    );
    await tester.tap(find.byKey(const ValueKey('profile-save')));
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));

    expect(find.text('Kai Studio'), findsOneWidget);
    expect(find.text('持续创作并运营 Agentic Playable。'), findsOneWidget);
    final avatar = tester.widget<Container>(
      find.byKey(const ValueKey('profile-avatar')),
    );
    final avatarDecoration = avatar.decoration! as BoxDecoration;
    expect(avatarDecoration.image?.image, isA<MemoryImage>());

    final persisted = await harness.repository.loadLocalProfileState();
    expect(persisted.displayName, 'Kai Studio');
    expect(persisted.bio, '持续创作并运营 Agentic Playable。');
  });

  testWidgets('liked playable card opens the existing runtime', (tester) async {
    final harness = TestCreateWorkflowHarness();
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
          routerConfig: buildAirvanaRouter(
            initialLocation: '/profile/secondary/likes',
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(
      find.byKey(const ValueKey('profile-like-plb_safety_workshop')),
    );
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('runtime-start')), findsOneWidget);
  });
}
