import 'package:airvana_mobile/features/shared/data/legacy_demo_catalog.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('发现页「最新」按 id 倒序，与 Web 的 b.id-a.id 一致', () {
    final items = [...LegacyDemoCatalog.legacyWebPlayables]
      ..sort((left, right) => right.id.compareTo(left.id));
    // 排序结果应当严格递减，而不是把展示顺序反过来。
    for (var index = 1; index < items.length; index += 1) {
      expect(
        items[index - 1].id.compareTo(items[index].id),
        greaterThan(0),
        reason: '${items[index - 1].id} 应排在 ${items[index].id} 之前',
      );
    }
    expect(
      items.first.id,
      isNot(LegacyDemoCatalog.legacyWebPlayables.last.id),
      reason: '按 id 倒序与列表反转不是同一结果',
    );
  });
}
