import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// 发现页封面。
///
/// 封面走 `Image.asset` + `errorBuilder`，路径写错时会**静默**退化成占位图，
/// 界面上看不出是 bug。因此用测试守住：引用的资源必须真实存在且已声明。
void main() {
  final source = File(
    'lib/features/discover/presentation/connected_discover_screen.dart',
  ).readAsStringSync();

  final referenced = RegExp(
    r'\$_coverRoot/([A-Za-z0-9._-]+)',
  ).allMatches(source).map((match) => match.group(1)!).toSet();

  test('discover cards reference real, shipped cover assets', () {
    expect(referenced, isNotEmpty, reason: '发现页应当使用真实封面而不是 emoji 占位');
    for (final name in referenced) {
      expect(
        File('assets/legacy/covers/$name').existsSync(),
        isTrue,
        reason: '封面资源缺失：assets/legacy/covers/$name',
      );
    }
  });

  test('the covers directory is declared in pubspec', () {
    expect(
      File('pubspec.yaml').readAsStringSync(),
      contains('assets/legacy/covers/'),
      reason: '未在 pubspec 声明则打包后全部退化为占位图',
    );
  });

  test('no emoji placeholder survives on discover cards', () {
    // 之前服务端 Artifact 卡与静态卡都是深色底 + 单个 emoji
    for (final emoji in ['🛰', '🧭', '🛡️', '🧮', '🌃', '🧱']) {
      expect(
        source.contains("Text('$emoji'"),
        isFalse,
        reason: '仍存在 emoji 占位封面：$emoji',
      );
    }
  });
}
