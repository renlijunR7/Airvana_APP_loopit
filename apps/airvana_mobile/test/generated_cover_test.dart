import 'dart:io';

import 'package:airvana_mobile/design_system/generated_cover.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

/// 服务端内容的生成封面。
///
/// 两条性质最关键：
/// 1. **稳定**——同一内容每次启动必须是同一张，否则用户会觉得封面在乱跳；
/// 2. **不冒充**——绝不借用其它作品的美术资源。
void main() {
  Future<void> pump(WidgetTester tester, Widget child) => tester.pumpWidget(
    MaterialApp(home: SizedBox(width: 200, height: 260, child: child)),
  );

  testWidgets('the same content always renders the same cover', (tester) async {
    Color gradientTop(Finder finder) {
      final decorated = tester.widget<DecoratedBox>(finder.first);
      final gradient =
          (decorated.decoration as BoxDecoration).gradient! as LinearGradient;
      return gradient.colors.first;
    }

    await pump(
      tester,
      const GeneratedCover(seed: 'content_abc', title: '灰度投放实测内容'),
    );
    final first = gradientTop(find.byType(DecoratedBox));

    // 重建一次，模拟冷启动
    await tester.pumpWidget(const SizedBox.shrink());
    await pump(
      tester,
      const GeneratedCover(seed: 'content_abc', title: '灰度投放实测内容'),
    );
    expect(
      gradientTop(find.byType(DecoratedBox)),
      first,
      reason: '同一 seed 必须得到同一配色，不能依赖每次运行都变的 hashCode',
    );
  });

  testWidgets('different contents are visually distinguishable', (
    tester,
  ) async {
    final seen = <Color>{};
    for (final seed in ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      await tester.pumpWidget(const SizedBox.shrink());
      await pump(tester, GeneratedCover(seed: seed, title: '内容 $seed'));
      final decorated = tester.widget<DecoratedBox>(
        find.byType(DecoratedBox).first,
      );
      seen.add(
        ((decorated.decoration as BoxDecoration).gradient! as LinearGradient)
            .colors
            .first,
      );
    }
    expect(seen.length, greaterThan(1), reason: '不同内容不应全是同一张封面');
  });

  testWidgets('the glyph skips brackets and punctuation in the title', (
    tester,
  ) async {
    await pump(tester, const GeneratedCover(seed: 's', title: '[演示] 钱包签名安全挑战'));
    expect(find.text('演'), findsOneWidget, reason: '应取第一个有意义的字，而不是「[」');
  });

  testWidgets('the content type badge reflects the real type', (tester) async {
    await pump(
      tester,
      const GeneratedCover(seed: 's', title: 'X', contentType: 'game'),
    );
    expect(find.text('互动游戏'), findsOneWidget);

    await tester.pumpWidget(const SizedBox.shrink());
    await pump(tester, const GeneratedCover(seed: 's', title: 'X'));
    expect(find.text('互动游戏'), findsNothing, reason: '类型未知时不得臆测');
  });

  test('generated covers never borrow another work\'s artwork', () {
    final source = File(
      'lib/design_system/generated_cover.dart',
    ).readAsStringSync();
    expect(
      source.contains('assets/legacy/covers'),
      isFalse,
      reason: '把某个游戏的美术配给无关的服务端内容会让人误以为那就是该作品',
    );
    expect(source.contains('Image.asset'), isFalse);
  });
}
