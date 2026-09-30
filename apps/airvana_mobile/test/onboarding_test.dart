import 'dart:io';

import 'package:airvana_mobile/features/account/domain/onboarding_slides.dart';
import 'package:flutter_test/flutter_test.dart';

/// 引导页内容与 Web 基准的一致性。
///
/// 这三句是对外的产品主张，逐字取自 Web 版 `public/index.html:6507-6509`。
/// Web 已不再维护，所以这里就是它们唯一的定义——写成断言，
/// 改动时必须是有意识的，而不是顺手「润色一下」。
void main() {
  test('三张引导页，顺序与 Web 一致', () {
    expect(kOnboardingSlides, hasLength(3));
    expect(kOnboardingSlides.map((s) => s.title), [
      'Every KOL Owns',
      'Create, Interact,',
      'Operate, Settle,',
    ]);
    expect(kOnboardingSlides.map((s) => s.titleAccent), [
      'Agentic Playables',
      'Attribute Results',
      'Compound Value',
    ]);
  });

  test('第 2、3 页各有一张插图，第一页没有（显示 logo）', () {
    expect(kOnboardingSlides.first.image, isNull);
    expect(kOnboardingSlides.map((s) => s.image).skip(1), [
      'assets/legacy/onboarding/attribute-results.png',
      'assets/legacy/onboarding/compound-value.png',
    ]);
  });

  test('插图位图与 SVG 源文件都在，1x/2x/3x 齐全，且已在 pubspec 登记', () {
    for (final slide in kOnboardingSlides.skip(1)) {
      final path = slide.image!;
      final name = path.split('/').last;
      expect(File(path).existsSync(), isTrue, reason: '缺 $path');
      expect(
        File(
          path.replaceFirst('/onboarding/', '/onboarding/2.0x/'),
        ).existsSync(),
        isTrue,
        reason: '缺 2x $name',
      );
      expect(
        File(
          path.replaceFirst('/onboarding/', '/onboarding/3.0x/'),
        ).existsSync(),
        isTrue,
        reason: '缺 3x $name',
      );
      expect(
        File(
          'assets/legacy/onboarding/src/${name.replaceFirst('.png', '.svg')}',
        ).existsSync(),
        isTrue,
        reason: 'SVG 源文件要留在仓库里，以后改图从源文件重出',
      );
    }
    expect(
      File('pubspec.yaml').readAsStringSync(),
      contains('    - assets/legacy/onboarding/'),
    );
  });

  test('每张都有描述文案，且不是占位', () {
    for (final slide in kOnboardingSlides) {
      expect(slide.description.trim().length, greaterThan(20));
    }
    // 第一句是产品定位，单独钉住。
    expect(
      kOnboardingSlides.first.description,
      '让每一位 KOL 都能创建并运营属于自己的 Agentic Playable 智能营销体。',
    );
  });

  test('末页按钮是「开始」，其余是「继续」', () {
    expect(onboardingButtonLabel(0), '继续');
    expect(onboardingButtonLabel(1), '继续');
    expect(onboardingButtonLabel(2), '开始');
  });

  test('越界索引也要有确定行为，不能抛', () {
    expect(onboardingButtonLabel(99), '开始');
    expect(onboardingButtonLabel(-1), '继续');
  });
}
