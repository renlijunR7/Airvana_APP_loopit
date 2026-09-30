import 'dart:io';
import 'dart:ui' as ui;

import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:airvana_mobile/features/create/presentation/create_playable_screen.dart';
import 'package:airvana_mobile/features/create/presentation/power_presentation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import 'support/test_create_workflow.dart';

void main() {
  testWidgets('composer marketing icons load without changing Power controls', (
    tester,
  ) async {
    final harness = TestCreateWorkflowHarness();
    final boundaryKey = GlobalKey();
    final outputDirectory = Platform.environment['POWER_ICON_QA_OUTPUT'];
    final fontPath = Platform.environment['POWER_ICON_QA_FONT'];
    tester.view.physicalSize = const Size(430, 932);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    // Optional local visual evidence; ordinary test runs do not load system fonts.
    if (outputDirectory != null && fontPath != null) {
      await tester.runAsync(() async {
        final loader = FontLoader('Roboto')
          ..addFont(File(fontPath).readAsBytes().then(ByteData.sublistView));
        await loader.load();
      });
    }

    await tester.pumpWidget(
      RepaintBoundary(
        key: boundaryKey,
        child: MaterialApp(
          theme: buildAirvanaTheme(),
          home: CreatePlayableScreen(workflowRepository: harness.workflow),
        ),
      ),
    );
    await tester.pumpAndSettle();

    Finder card(String id) => find.byKey(ValueKey('composer-power-card-$id'));
    Finder toggle(String id) =>
        find.byKey(ValueKey('composer-power-toggle-$id'));
    Finder selectionMark(String id) => find.descendant(
      of: toggle(id),
      matching: find.byIcon(Icons.check_rounded),
    );
    Future<void> tapVisible(Finder finder) async {
      await tester.ensureVisible(finder);
      await tester.pumpAndSettle();
      await tester.tap(finder);
      await tester.pumpAndSettle();
    }

    await tapVisible(
      find.byKey(const ValueKey('composer-power-category-operations')),
    );
    expect(card('adsApi'), findsNothing, reason: '快速模式仍锁定广告能力');
    expect(card('adsMcp'), findsNothing);

    await tapVisible(find.text('深度'));
    await Scrollable.ensureVisible(
      tester.element(card('adsApi')),
      alignment: .45,
    );
    await tester.pumpAndSettle();
    await tester.runAsync(() async {
      final context = tester.element(card('adsApi'));
      for (final id in [
        'appPublish',
        'externalConnectors',
        'adsApi',
        'adsMcp',
      ]) {
        await precacheImage(AssetImage(powerIconAssetPath(id)), context);
      }
    });
    await tester.pumpAndSettle();

    for (final id in ['adsApi', 'adsMcp']) {
      final imageFinder = find.descendant(
        of: card(id),
        matching: find.byType(Image),
      );
      expect(imageFinder, findsOneWidget);
      expect(
        tester.widget<Image>(imageFinder).image,
        AssetImage(powerIconAssetPath(id)),
      );
      expect(tester.getSize(imageFinder), const Size(44, 44));
      final rawFinder = find.descendant(
        of: card(id),
        matching: find.byType(RawImage),
      );
      expect(rawFinder, findsOneWidget);
      expect(tester.widget<RawImage>(rawFinder).image, isNotNull);
      expect(
        find.descendant(of: card(id), matching: find.byIcon(kPowerIcons[id]!)),
        findsNothing,
        reason: '$id 不应退化为灰底线框图标',
      );
      expect(tester.getSize(toggle(id)), const Size(44, 44));
    }
    expect(tester.takeException(), isNull);

    if (outputDirectory != null) {
      await tester.runAsync(() async {
        final boundary =
            boundaryKey.currentContext!.findRenderObject()
                as RenderRepaintBoundary;
        final image = await boundary.toImage(pixelRatio: 2);
        try {
          final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
          final directory = await Directory(
            outputDirectory,
          ).create(recursive: true);
          await File('${directory.path}/composer-power-icons.png').writeAsBytes(
            bytes!.buffer.asUint8List(bytes.offsetInBytes, bytes.lengthInBytes),
          );
        } finally {
          image.dispose();
        }
      });
    }

    expect(selectionMark('adsMcp'), findsNothing);
    await tapVisible(toggle('adsMcp'));
    expect(selectionMark('adsMcp'), findsOneWidget);
    expect(selectionMark('adsApi'), findsOneWidget);
    expect(find.textContaining('并补全依赖：广告投放管理'), findsOneWidget);

    await tapVisible(toggle('adsMcp'));
    expect(selectionMark('adsMcp'), findsNothing);
    expect(selectionMark('adsApi'), findsOneWidget);
    expect(find.textContaining('已移除「营销智能体」'), findsOneWidget);

    await tapVisible(toggle('adsMcp'));
    expect(selectionMark('adsMcp'), findsOneWidget);
    expect(find.textContaining('Contract、审批与真实执行仍需服务端确认'), findsOneWidget);
    await tapVisible(find.text('快速'));
    expect(card('adsApi'), findsNothing);
    expect(card('adsMcp'), findsNothing);
    expect(find.textContaining('已安全降级：移除 广告投放管理、营销智能体'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
