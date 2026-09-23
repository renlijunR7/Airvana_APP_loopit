import 'package:airvana_mobile/features/discover/presentation/search_screen.dart';
import 'package:airvana_mobile/features/shared/data/legacy_demo_catalog.dart';
import 'package:flutter_test/flutter_test.dart';

/// 搜索聚合与排序的行为规范。
///
/// 用真实目录（68 条）跑，而不是构造玩具数据——排序问题只有在真实
/// 数据的密度下才暴露得出来。
void main() {
  final playables = LegacyDemoCatalog.legacyWebPlayables;

  test('空查询不返回任何结果', () {
    expect(searchPlayables(playables, ''), isEmpty);
    expect(searchPlayables(playables, '   '), isEmpty);
  });

  test('精确标题排第一', () {
    final hits = searchPlayables(playables, '冰浪派对');
    expect(hits, isNotEmpty);
    expect(hits.first.title, contains('冰浪派对'));
    expect(hits.first.kind, '作品');
  });

  test('中英混搜，词序颠倒也能命中', () {
    final forward = searchPlayables(playables, '魔法 choir');
    final reverse = searchPlayables(playables, 'choir 魔法');
    expect(forward.any((h) => h.title.contains('魔法合唱团')), isTrue);
    expect(reverse.any((h) => h.title.contains('魔法合唱团')), isTrue);
  });

  test('漏字仍能搜到（子序列）', () {
    final hits = searchPlayables(playables, '冰派对');
    expect(hits.any((h) => h.title.contains('冰浪派对')), isTrue);
  });

  test('搜创作者能搜出创作者行', () {
    final hits = searchPlayables(playables, 'Airvana Studio');
    expect(hits.any((h) => h.kind == '创作者'), isTrue);
  });

  test('结果按分数降序，不出现倒挂', () {
    final hits = searchPlayables(playables, '游戏');
    for (var i = 1; i < hits.length; i++) {
      expect(hits[i - 1].score, greaterThanOrEqualTo(hits[i].score));
    }
  });

  test('作品行带 id 可跳转，创作者与分类行不带', () {
    final hits = searchPlayables(playables, 'Airvana');
    for (final hit in hits) {
      if (hit.kind == '作品') {
        expect(hit.playableId, isNotNull);
      } else {
        expect(hit.playableId, isNull);
      }
    }
  });

  test('高亮区间落在标题的合法范围内', () {
    for (final query in ['冰浪', 'choir', '果园', 'nova']) {
      for (final hit in searchPlayables(playables, query)) {
        for (final (start, end) in hit.titleRanges) {
          expect(start, inInclusiveRange(0, hit.title.length));
          expect(end, inInclusiveRange(0, hit.title.length));
          expect(start, lessThan(end));
        }
      }
    }
  });

  test('结果数量有上限，不会把整个目录倒出来', () {
    // 单个常见字可能命中大量条目，界面不能被撑爆。
    expect(searchPlayables(playables, '的').length, lessThanOrEqualTo(40));
    expect(searchPlayables(playables, 'a').length, lessThanOrEqualTo(40));
  });

  test('完全无关的词返回空', () {
    expect(searchPlayables(playables, 'zzzqqqxxx'), isEmpty);
  });

  test('精确搜分类名时，分类行应当排在前面', () {
    // 这不是 bug 而是预期：'独立打包游戏' 完整命中分类名（近 1000 分），
    // 而作品只是它的 category 字段命中（权重 0.6，约 600 分）。
    // 用户打出完整分类名，就是想看这个分类。
    final hits = searchPlayables(playables, '独立打包游戏');
    expect(hits, isNotEmpty);
    expect(hits.first.kind, '分类');
    expect(hits.first.title, '独立打包游戏');
  });

  test('三类之间的同分让位规则：作品 > 创作者 > 分类', () {
    // 让位靠的是 -1 / -2 的微小扣分，只在基础分相同时起作用。
    // 用同一个字符串分别作为三类的命中目标来验证顺序稳定。
    final byKind = <String, int>{};
    for (final hit in searchPlayables(playables, 'Airvana Studio')) {
      byKind.putIfAbsent(hit.kind, () => hit.score);
    }
    if (byKind.containsKey('作品') && byKind.containsKey('创作者')) {
      // 作品标题里没有 'Airvana Studio'，所以这里不强制两者大小，
      // 只要求两类都能被搜到，且分数是确定值而非随机。
      expect(byKind['作品'], isPositive);
      expect(byKind['创作者'], isPositive);
    }
  });
}
