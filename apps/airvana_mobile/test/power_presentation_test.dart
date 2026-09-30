import 'dart:io';
import 'dart:ui' as ui;

import 'package:airvana_mobile/features/create/presentation/power_presentation.dart';
import 'package:airvana_mobile/features/shared/domain/power_capability.dart';
import 'package:airvana_mobile/features/shared/domain/power_catalog.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

/// 表现层与 domain 的一致性。
///
/// 目录曾经存在四份互不连通的副本，新增能力要同时改四处，漏一处就静默失效。
/// 收敛成单一数据源之后，用这些测试守住「补充映射不许漏项」这条线。
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  final visiblePowers = kPowerCatalog
      .where((power) => power.visibleInCatalog)
      .toList(growable: false);

  test('广告能力与含缩写的 Power 使用正确的图片路径', () {
    expect(
      powerIconAssetPath('adsApi'),
      'assets/legacy/capability-icons/ads-api.png',
    );
    expect(
      powerIconAssetPath('adsMcp'),
      'assets/legacy/capability-icons/ads-mcp.png',
    );
    expect(
      powerIconAssetPath('threeDScene'),
      'assets/legacy/capability-icons/three-d-scene.png',
    );
  });

  test('每个可见 Power 都有可解码的 256 像素正方形图片', () async {
    expect(visiblePowers, isNotEmpty);
    for (final power in visiblePowers) {
      final path = powerIconAssetPath(power.id);
      final file = File(path);
      expect(
        file.existsSync(),
        isTrue,
        reason: '${power.title} 缺少 $path，会静默退化为线框图标',
      );
      final codec = await ui.instantiateImageCodec(await file.readAsBytes());
      try {
        final frame = await codec.getNextFrame();
        try {
          expect(frame.image.width, 256, reason: '$path 图片宽度不一致');
          expect(frame.image.height, 256, reason: '$path 图片高度不一致');
        } finally {
          frame.image.dispose();
        }
      } finally {
        codec.dispose();
      }
    }
  });

  test('每个可见 Power 图标都注册并可从应用资源包加载', () async {
    expect(
      File('pubspec.yaml').readAsStringSync(),
      contains('    - assets/legacy/capability-icons/'),
      reason: '图标目录必须在 pubspec 声明才能随应用打包',
    );
    final manifest = await AssetManifest.loadFromAssetBundle(rootBundle);
    final bundledPaths = manifest.listAssets().toSet();
    for (final power in visiblePowers) {
      final path = powerIconAssetPath(power.id);
      expect(bundledPaths, contains(path), reason: '${power.title} 未随应用打包');
      final data = await rootBundle.load(path);
      expect(data.lengthInBytes, greaterThan(0), reason: '$path 资源为空');
    }
  });

  test('每条能力都有图标，不会在界面上画成空白', () {
    for (final power in kPowerCatalog) {
      expect(
        kPowerIcons.containsKey(power.id),
        isTrue,
        reason: '${power.id} 缺少图标映射',
      );
    }
  });

  test('图标映射里没有已经不存在的能力', () {
    final ids = kPowerCatalog.map((power) => power.id).toSet();
    for (final id in kPowerIcons.keys) {
      expect(ids, contains(id), reason: '$id 已从目录移除，图标映射应同步清理');
    }
  });

  test('每个实现层级都有配色，交付方式都有说明', () {
    for (final support in PowerSupport.values) {
      expect(
        kPowerSupportColors.containsKey(support),
        isTrue,
        reason: '$support 缺配色',
      );
    }
    for (final delivery in PowerDelivery.values) {
      expect(
        kPowerDeliveryLabels.containsKey(delivery),
        isTrue,
        reason: '$delivery 缺说明',
      );
    }
  });
}
