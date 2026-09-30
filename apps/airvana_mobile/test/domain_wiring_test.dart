import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// domain 层的接线守门。
///
/// 起因：本轮新建的 `power_binder.dart` 写了 330 行、配了 19 条测试全绿，
/// 但 `grep -rn "power_binder" lib/` 返回 **0** —— 没有任何应用代码 import 它。
/// 测试保护的是一段从不执行的代码。
///
/// 这类断裂没有任何静态信号：`dart analyze lib` 返回 "No issues found!"，
/// 因为 Dart 不检测跨文件未使用的公开类。所以只能用测试兜住。
///
/// 这条测试**不强制**每个 domain 文件都被接线——有些确实还没到接线的时候。
/// 它强制的是「未接线必须是已知且写明原因的」：新增一个 domain 模块却忘了
/// 接，测试会红；明知故犯要在 [_knownUnwired] 里留下理由，而不是让它
/// 悄悄躺在那里。
void main() {
  /// 已知未接线，附原因。清掉一条的前提是真的接上了，而不是把它加进来。
  const knownUnwired = <String, String>{
    'power_binder.dart':
        '撮合器要等信号层落地才有消费方：宿主目前还不能把归一化信号推给作品，'
        '所以 bind() 没有真实调用点。PowerSelection 也还没替换创作屏幕里的'
        '内联消解——domain 那份缺少幽灵 id 守卫、用户确认分支与 quickAllowed '
        '门槛，直接顶替会引入回归（见创作期审计 P0-3）。',
  };

  late final List<File> domainFiles;
  late final String libSource;

  setUpAll(() {
    domainFiles = Directory('lib')
        .listSync(recursive: true)
        .whereType<File>()
        .where(
          (file) =>
              file.path.contains('/domain/') && file.path.endsWith('.dart'),
        )
        .toList();

    libSource = Directory('lib')
        .listSync(recursive: true)
        .whereType<File>()
        .where((file) => file.path.endsWith('.dart'))
        .where((file) => !file.path.contains('/domain/'))
        .map((file) => file.readAsStringSync())
        .join('\n');
  });

  test('能扫到 domain 文件，否则这条测试本身就是假绿', () {
    expect(domainFiles, isNotEmpty);
    expect(libSource, isNotEmpty);
  });

  test('每个 domain 模块要么被应用代码 import，要么在已知未接线名单里', () {
    final unwired = <String>[];
    for (final file in domainFiles) {
      final name = file.uri.pathSegments.last;
      // domain 之间互相 import 不算接线——那只是自己人引自己人。
      if (libSource.contains(name)) continue;
      unwired.add(name);
    }

    for (final name in unwired) {
      expect(
        knownUnwired.containsKey(name),
        isTrue,
        reason:
            '$name 没有被 lib/ 下任何应用代码 import。'
            '如果这是有意的，把它连同原因加进 knownUnwired；'
            '如果是忘了接线，现在就是发现它的时候。',
      );
    }
  });

  test('已知未接线名单不许留陈条目', () {
    // 接上之后忘了把它从名单里划掉，名单就会慢慢退化成摆设。
    for (final name in knownUnwired.keys) {
      expect(
        libSource.contains(name),
        isFalse,
        reason: '$name 已经被接线了，请从 knownUnwired 里移除',
      );
    }
  });

  test('未接线的理由必须写清楚，不能是一句占位', () {
    for (final entry in knownUnwired.entries) {
      expect(
        entry.value.trim().length,
        greaterThan(30),
        reason: '${entry.key} 的未接线原因太短，看不出是有意还是遗漏',
      );
    }
  });

  test('本轮接线的两个模块确实在应用代码里被使用', () {
    // 这两条是刚接上的，单独钉住：power_permission_broker 决定权限代答面，
    // game_power_profiles 决定按作品收窄的依据，任一被摘掉都会让收窄失效。
    expect(libSource.contains('power_permission_broker.dart'), isTrue);
    expect(libSource.contains('game_power_profiles.dart'), isTrue);
  });
}
