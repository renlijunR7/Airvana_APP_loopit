import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:flutter/material.dart';

/// 服务端作品的**确定性生成封面**。
///
/// 服务端的 artifact 生成器只产出结构化文本，没有配图（真实图像生成在需求里
/// 是标注为 EXTERNAL 的边界项）。这里不从已有游戏封面里挑一张塞进去——把某个
/// 游戏的美术配给一条无关的服务端内容，会让人以为那就是那个作品。
///
/// 改为按内容 id 生成：同一内容永远得到同一张封面，明显是平台生成的图形，
/// 不冒充任何具体作品。
class GeneratedCover extends StatelessWidget {
  const GeneratedCover({
    required this.seed,
    required this.title,
    this.contentType = '',
    super.key,
  });

  /// 决定配色与图形的种子，用内容 id 以保证同一内容封面稳定。
  final String seed;
  final String title;

  /// game / video / article，用于右上角类型标识；为空则不显示。
  final String contentType;

  static const _palettes = <(Color, Color)>[
    (Color(0xFF2B3A67), Color(0xFF11172B)),
    (Color(0xFF4A2545), Color(0xFF17101B)),
    (Color(0xFF1F4037), Color(0xFF0D1A17)),
    (Color(0xFF553C2B), Color(0xFF1C1310)),
    (Color(0xFF2C4A63), Color(0xFF101A23)),
    (Color(0xFF3F2E56), Color(0xFF15101F)),
  ];

  static const _typeLabels = {'game': '互动游戏', 'video': '互动故事', 'article': '图文'};

  /// 稳定哈希：不能用 Object.hashCode，它在不同运行间可能变化，
  /// 会导致同一内容每次启动换一张封面。
  static int _hash(String value) {
    var hash = 0;
    for (final unit in value.codeUnits) {
      hash = (hash * 31 + unit) & 0x7fffffff;
    }
    return hash;
  }

  /// 取标题里第一个有意义的字符，跳过括号与标点。
  static String _glyph(String title) {
    for (final char in title.trim().split('')) {
      if (RegExp(r'[A-Za-z0-9一-龥]').hasMatch(char)) {
        return char.toUpperCase();
      }
    }
    return 'A';
  }

  @override
  Widget build(BuildContext context) {
    final hash = _hash(seed.isEmpty ? title : seed);
    final (top, bottom) = _palettes[hash % _palettes.length];
    final label = _typeLabels[contentType];
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [top, bottom],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          // 由种子决定偏移的柔光斑，让不同内容一眼可区分
          Align(
            alignment: Alignment(
              ((hash >> 3) % 100) / 100 * 1.6 - 0.8,
              ((hash >> 7) % 100) / 100 * 1.2 - 0.6,
            ),
            child: FractionallySizedBox(
              widthFactor: 0.85,
              child: AspectRatio(
                aspectRatio: 1,
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: RadialGradient(
                      colors: [
                        AirvanaColors.accent.withValues(alpha: 0.22),
                        Colors.transparent,
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
          Center(
            child: Text(
              _glyph(title),
              style: TextStyle(
                fontSize: 46,
                fontWeight: FontWeight.w900,
                color: Colors.white.withValues(alpha: 0.92),
                letterSpacing: -1,
              ),
            ),
          ),
          if (label != null)
            Positioned(
              top: 8,
              right: 8,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.35),
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  label,
                  style: const TextStyle(
                    fontSize: 8,
                    fontWeight: FontWeight.w900,
                    color: Colors.white70,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
