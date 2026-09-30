import 'package:airvana_mobile/features/discover/domain/fuzzy_search.dart';
import 'package:flutter_test/flutter_test.dart';

/// 模糊匹配的行为规范。
///
/// 目录里大量是「果园合合塔 Orchard Merge」这种中英双语标题，
/// 原来的 `contains` 只能整串子串匹配，用户稍微换个写法就是零结果。
void main() {
  group('整串命中', () {
    test('完全相等分最高', () {
      expect(fuzzyMatch('冰浪派对', '冰浪派对').score, 1000);
    });

    test('前缀命中高于中间命中', () {
      final prefix = fuzzyMatch('冰浪派对 Ice Float Party', '冰浪');
      final middle = fuzzyMatch('冰浪派对 Ice Float Party', 'float');
      expect(prefix.score, greaterThan(middle.score));
      expect(middle.hit, isTrue);
    });

    test('大小写与空格不影响命中', () {
      expect(fuzzyMatch('Orchard Merge', 'ORCHARDMERGE').hit, isTrue);
      expect(fuzzyMatch('Orchard Merge', '  orchard  ').hit, isTrue);
    });

    test('全角符号归一化后仍能命中', () {
      expect(fuzzyMatch('魔法合唱团（Magic Choir）', 'magic').hit, isTrue);
    });

    test('分隔符不挡路', () {
      expect(fuzzyMatch('Luna 小镇 · KOL Town', '小镇kol').hit, isTrue);
    });
  });

  group('分词全中，顺序无关', () {
    test('中英混搜，正序', () {
      expect(fuzzyMatch('果园合合塔 Orchard Merge', '果园 orchard').hit, isTrue);
    });

    test('中英混搜，倒序也一样命中', () {
      final forward = fuzzyMatch('果园合合塔 Orchard Merge', '果园 orchard');
      final reverse = fuzzyMatch('果园合合塔 Orchard Merge', 'orchard 果园');
      expect(reverse.hit, isTrue);
      // 顺序不同得分可以不同（位置惩罚），但都必须命中。
      expect(forward.hit && reverse.hit, isTrue);
    });

    test('有一个词没中就整体不按分词命中', () {
      // 「果园」在，「赛车」不在 —— 不能因为中了一半就算命中。
      final match = fuzzyMatch('果园合合塔 Orchard Merge', '果园 赛车');
      // 仍可能退到子序列级，但绝不能拿到分词级的高分。
      expect(match.score, lessThan(600));
    });
  });

  group('子序列命中', () {
    test('中文漏字仍能搜到', () {
      expect(fuzzyMatch('果园合合塔 Orchard Merge', '果合塔').hit, isTrue);
    });

    test('英文漏字母仍能搜到', () {
      expect(fuzzyMatch('Orchard Merge', 'ochrd').hit, isTrue);
    });

    test('顺序错了就不该命中', () {
      expect(fuzzyMatch('果园合合塔', '塔园果').hit, isFalse);
    });

    test('紧凑的命中排在散落的前面', () {
      final tight = fuzzyMatch('合合塔果园', '合塔');
      final loose = fuzzyMatch('合作与信任的高塔', '合塔');
      expect(tight.score, greaterThan(loose.score));
    });
  });

  group('不命中', () {
    test('空查询不命中', () {
      expect(fuzzyMatch('冰浪派对', '').hit, isFalse);
      expect(fuzzyMatch('冰浪派对', '   ').hit, isFalse);
    });

    test('完全无关不命中', () {
      expect(fuzzyMatch('冰浪派对', 'zzzz').hit, isFalse);
    });

    test('空文本不命中', () {
      expect(fuzzyMatch('', '冰浪').hit, isFalse);
    });
  });

  group('严格优先于宽松', () {
    test('三级之间不能倒挂', () {
      const text = '果园合合塔 Orchard Merge';
      final exactish = fuzzyMatch(text, '果园合合塔');
      final tokens = fuzzyMatch(text, '果园 merge');
      final subseq = fuzzyMatch(text, '果合塔');
      expect(exactish.score, greaterThan(tokens.score));
      expect(tokens.score, greaterThan(subseq.score));
    });
  });

  group('高亮区间', () {
    test('区间落在原文的正确位置上', () {
      const text = '冰浪派对 Ice Float Party';
      final match = fuzzyMatch(text, 'Float');
      expect(match.matchedRanges, hasLength(1));
      final (start, end) = match.matchedRanges.single;
      expect(text.substring(start, end).toLowerCase(), 'float');
    });

    test('相邻区间会被合并，不会一个字一段', () {
      final match = fuzzyMatch('果园合合塔', '果园');
      expect(match.matchedRanges, hasLength(1));
    });

    test('区间不越界', () {
      const text = 'Orchard Merge';
      for (final query in ['o', 'och', 'merge', 'orchard merge']) {
        for (final (start, end) in fuzzyMatch(text, query).matchedRanges) {
          expect(start, inInclusiveRange(0, text.length));
          expect(end, inInclusiveRange(0, text.length));
          expect(start, lessThan(end));
        }
      }
    });
  });

  group('多字段加权', () {
    test('标题命中排在作者命中前面', () {
      const query = 'nova';
      final titleHit = fuzzyMatchFields([
        ('Nova Drift 新星漂移', 1.0),
        ('Kai Chen', 0.6),
      ], query);
      final authorHit = fuzzyMatchFields([
        ('城市极速 City Rush', 1.0),
        ('Nova', 0.6),
      ], query);
      expect(titleHit.score, greaterThan(authorHit.score));
    });

    test('所有字段都不中则整体不中', () {
      final match = fuzzyMatchFields([
        ('冰浪派对', 1.0),
        ('Airvana Studio', 0.6),
      ], 'zzzz');
      expect(match.hit, isFalse);
    });
  });
}
