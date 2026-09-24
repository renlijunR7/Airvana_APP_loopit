/// 模糊搜索的匹配与排序。
///
/// 原来的搜索是一句 `haystack.contains(needle)`：漏一个字、词序颠倒、
/// 中英混排拆开写，全都搜不到。「果园合合塔 Orchard Merge」这种双语标题，
/// 用户搜「orchard 果园」就是零结果。
///
/// 这里按三级放宽，越往后越宽松、得分越低，保证严格匹配始终排在前面：
///
/// 1. **整串命中**——完全相等 / 前缀 / 子串；
/// 2. **分词全中**——把输入按空格切开，每一段都要在候选里出现，但不要求
///    连续也不要求顺序，于是「orchard 果园」和「果园 orchard」等价；
/// 3. **子序列命中**——字符按顺序出现即可，中间允许插字。中文没有空格分词，
///    这一级让「果合塔」能命中「果园合合塔」，也让英文容忍漏字母。
///
/// 纯函数，不碰 IO，可以在单测里穷举。
library;

/// 一条候选的匹配结果。[score] 越大越靠前，0 表示没命中。
class FuzzyMatch {
  const FuzzyMatch({required this.score, required this.matchedRanges});

  final int score;

  /// 命中的字符区间，供界面高亮。区间基于**原始文本**的下标。
  final List<(int, int)> matchedRanges;

  bool get hit => score > 0;

  static const none = FuzzyMatch(score: 0, matchedRanges: []);
}

/// 把文本归一化：转小写、全角转半角、去掉空白与常见分隔符。
///
/// 返回归一化串以及每个字符在原串中的下标，这样高亮区间才能落回原文。
(String, List<int>) _normalize(String raw) {
  final buffer = StringBuffer();
  final indices = <int>[];
  for (var i = 0; i < raw.length; i++) {
    final code = raw.codeUnitAt(i);
    // 全角 ASCII（！到～）映射回半角，中文标题里常混全角符号。
    final halfWidth = (code >= 0xFF01 && code <= 0xFF5E) ? code - 0xFEE0 : code;
    final char = String.fromCharCode(halfWidth).toLowerCase();
    if (char.trim().isEmpty) continue;
    // 分隔符不参与匹配，但也不能吞掉——它们只是不进 haystack。
    if ('·-_/|,，、。.'.contains(char)) continue;
    buffer.write(char);
    indices.add(i);
  }
  return (buffer.toString(), indices);
}

/// 用 [query] 去匹配 [text]。
FuzzyMatch fuzzyMatch(String text, String query) {
  final trimmedQuery = query.trim();
  if (trimmedQuery.isEmpty) return FuzzyMatch.none;

  final (haystack, indices) = _normalize(text);
  if (haystack.isEmpty) return FuzzyMatch.none;

  final (needle, _) = _normalize(trimmedQuery);
  if (needle.isEmpty) return FuzzyMatch.none;

  List<(int, int)> rangeFor(int start, int length) {
    if (start < 0 || start + length > indices.length) return const [];
    return [(indices[start], indices[start + length - 1] + 1)];
  }

  // ── 第一级：整串命中 ─────────────────────────────────────────
  if (haystack == needle) {
    return FuzzyMatch(score: 1000, matchedRanges: rangeFor(0, needle.length));
  }
  if (haystack.startsWith(needle)) {
    return FuzzyMatch(score: 900, matchedRanges: rangeFor(0, needle.length));
  }
  final at = haystack.indexOf(needle);
  if (at >= 0) {
    // 越靠前越相关，但不能盖过前缀命中。
    return FuzzyMatch(
      score: 800 - (at > 60 ? 60 : at),
      matchedRanges: rangeFor(at, needle.length),
    );
  }

  // ── 第二级：分词全中（顺序无关）───────────────────────────────
  final tokens = trimmedQuery
      .split(RegExp(r'\s+'))
      .map((token) => _normalize(token).$1)
      .where((token) => token.isNotEmpty)
      .toList();
  if (tokens.length > 1) {
    final ranges = <(int, int)>[];
    var allHit = true;
    var positionPenalty = 0;
    for (final token in tokens) {
      final index = haystack.indexOf(token);
      if (index < 0) {
        allHit = false;
        break;
      }
      positionPenalty += index;
      ranges.addAll(rangeFor(index, token.length));
    }
    if (allHit) {
      final penalty = positionPenalty > 100 ? 100 : positionPenalty;
      return FuzzyMatch(score: 600 - penalty, matchedRanges: ranges);
    }
  }

  // ── 第三级：子序列命中 ───────────────────────────────────────
  // 字符按顺序出现即可。跨度越紧凑、起点越靠前，分越高——
  // 否则「果...合...塔」这种散落全文的命中会和紧凑命中同分。
  final ranges = <(int, int)>[];
  var cursor = 0;
  var first = -1;
  for (var i = 0; i < needle.length; i++) {
    final found = haystack.indexOf(needle[i], cursor);
    if (found < 0) return FuzzyMatch.none;
    if (first < 0) first = found;
    ranges.addAll(rangeFor(found, 1));
    cursor = found + 1;
  }
  final span = cursor - first;
  final tightness = (span - needle.length).clamp(0, 200);
  final head = first.clamp(0, 100);
  final score = 400 - tightness - head;
  return FuzzyMatch(
    score: score < 1 ? 1 : score,
    matchedRanges: _mergeRanges(ranges),
  );
}

/// 相邻区间合并，避免高亮被切成一个字一段。
List<(int, int)> _mergeRanges(List<(int, int)> ranges) {
  if (ranges.isEmpty) return const [];
  final sorted = [...ranges]..sort((a, b) => a.$1.compareTo(b.$1));
  final merged = <(int, int)>[sorted.first];
  for (final range in sorted.skip(1)) {
    final last = merged.last;
    if (range.$1 <= last.$2) {
      merged[merged.length - 1] = (
        last.$1,
        range.$2 > last.$2 ? range.$2 : last.$2,
      );
    } else {
      merged.add(range);
    }
  }
  return merged;
}

/// 对多个字段打分，取最高分的那个字段作为该条目的得分。
///
/// [weights] 让标题的命中比作者、分类更值钱——搜「Nova」时，
/// 标题里带 Nova 的作品应当排在「作者叫 Nova」的作品前面。
FuzzyMatch fuzzyMatchFields(
  List<(String text, double weight)> fields,
  String query,
) {
  var best = FuzzyMatch.none;
  for (final (text, weight) in fields) {
    final match = fuzzyMatch(text, query);
    if (!match.hit) continue;
    final weighted = FuzzyMatch(
      score: (match.score * weight).round(),
      matchedRanges: match.matchedRanges,
    );
    if (weighted.score > best.score) best = weighted;
  }
  return best;
}
