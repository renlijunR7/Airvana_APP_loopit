import 'dart:ui' as ui;

import 'package:airvana_mobile/shared/presentation/airvana_logo.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  for (final dark in [false, true]) {
    testWidgets(
      'transparent ${dark ? "dark" : "light"} logo preserves page gradient',
      (tester) async {
        final boundaryKey = GlobalKey();
        final asset = AssetImage(
          dark ? 'assets/legacy/logo-dark.png' : 'assets/legacy/logo.png',
        );
        Future<void> render(bool showLogo) async {
          await tester.pumpWidget(
            MaterialApp(
              home: Center(
                child: RepaintBoundary(
                  key: boundaryKey,
                  child: SizedBox(
                    width: 240,
                    height: 120,
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          colors: dark
                              ? [
                                  const Color(0xFF050D09),
                                  const Color(0xFF342433),
                                ]
                              : [
                                  const Color(0xFFFFDFE5),
                                  const Color(0xFFF2F2F7),
                                ],
                        ),
                      ),
                      child: Center(
                        child: showLogo
                            ? AirvanaLogo(width: 190, dark: dark)
                            : null,
                      ),
                    ),
                  ),
                ),
              ),
            ),
          );
          await tester.runAsync(
            () => precacheImage(asset, boundaryKey.currentContext!),
          );
          await tester.pumpAndSettle();
        }

        Future<List<int>> pixels() async => (await tester.runAsync(() async {
          final image =
              await (boundaryKey.currentContext!.findRenderObject()!
                      as RenderRepaintBoundary)
                  .toImage();
          try {
            final bytes = await image.toByteData(
              format: ui.ImageByteFormat.rawRgba,
            );
            return bytes!.buffer.asUint8List().toList();
          } finally {
            image.dispose();
          }
        }))!;

        await render(false);
        final background = await pixels();
        await render(true);
        final rendered = await pixels();
        final image = tester.widget<Image>(
          find.byKey(const ValueKey('airvana-logo-image')),
        );
        expect(image.image, asset);
        expect(image.color, isNull);
        expect(image.colorBlendMode, isNull);
        expect(
          tester
              .getSize(find.byKey(const ValueKey('airvana-logo-frame')))
              .width,
          190,
        );
        // Sample inside the transparent corners of the image, not outside it.
        for (final point in [(30, 25), (210, 25), (30, 92), (210, 92)]) {
          final offset = (point.$2 * 240 + point.$1) * 4;
          expect(
            rendered.sublist(offset, offset + 4),
            background.sublist(offset, offset + 4),
          );
        }
        expect(
          rendered,
          isNot(equals(background)),
          reason: 'The wordmark must still be visible',
        );
        expect(tester.takeException(), isNull);
      },
    );
  }
}
