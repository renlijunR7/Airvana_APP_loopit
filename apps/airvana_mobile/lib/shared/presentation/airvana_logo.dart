import 'package:flutter/material.dart';

/// The legacy Web wordmark uses the bundled `logo.png` inside a deliberately
/// cropped 78 x 30 frame. Keep that geometry here instead of reconstructing the
/// mark with text, so Web and Flutter render the same artwork.
///
/// Web 端通过 `mix-blend-mode: multiply` 抹掉 PNG 的白底；这里用
/// [backgroundColor] 做 multiply 混色达到同样效果——白色像素恰好渲染为
/// 页面背景色，Logo 与大背景融为一体。
class AirvanaLogo extends StatelessWidget {
  const AirvanaLogo({
    super.key,
    this.width = 78,
    this.backgroundColor = const Color(0xFFF2F2F7),
  });

  final double width;

  /// Logo 所在区域的背景色；白底 PNG 会与它相乘融合。
  final Color backgroundColor;

  @override
  Widget build(BuildContext context) {
    final scale = width / 78;
    return Semantics(
      image: true,
      label: 'Airvana',
      child: SizedBox(
        key: const ValueKey('airvana-logo-frame'),
        width: width,
        height: 30 * scale,
        child: ClipRect(
          child: Stack(
            children: [
              Positioned(
                left: -15 * scale,
                top: -2.5 * scale,
                width: 105 * scale,
                height: 35 * scale,
                child: Image.asset(
                  'assets/legacy/logo.png',
                  key: const ValueKey('airvana-logo-image'),
                  fit: BoxFit.contain,
                  color: backgroundColor,
                  colorBlendMode: BlendMode.multiply,
                  excludeFromSemantics: true,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
