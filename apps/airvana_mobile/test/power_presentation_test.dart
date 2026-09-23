import 'package:airvana_mobile/features/create/presentation/power_presentation.dart';
import 'package:airvana_mobile/features/shared/domain/power_capability.dart';
import 'package:airvana_mobile/features/shared/domain/power_catalog.dart';
import 'package:flutter_test/flutter_test.dart';

/// 表现层与 domain 的一致性。
///
/// 目录曾经存在四份互不连通的副本，新增能力要同时改四处，漏一处就静默失效。
/// 收敛成单一数据源之后，用这些测试守住「补充映射不许漏项」这条线。
void main() {
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
      expect(kPowerSupportColors.containsKey(support), isTrue, reason: '$support 缺配色');
    }
    for (final delivery in PowerDelivery.values) {
      expect(kPowerDeliveryLabels.containsKey(delivery), isTrue, reason: '$delivery 缺说明');
    }
  });
}
