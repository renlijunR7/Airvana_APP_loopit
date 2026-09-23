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
    this.dark = false,
  });

  final double width;

  /// Logo 所在区域的背景色；白底 PNG 会与它相乘融合。
  final Color backgroundColor;

  /// 深色底上用反转灰阶的那份 PNG：黑底白字，红蓝圆点保持原色。
  /// multiply 在黑底上会把整个 Logo 抹成黑色，所以这里换成 screen——
  /// 黑色像素被抬到背景色，白字保持白色。
  final bool dark;

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
                  dark
                      ? 'assets/legacy/logo-dark.png'
                      : 'assets/legacy/logo.png',
                  key: const ValueKey('airvana-logo-image'),
                  fit: BoxFit.contain,
                  color: backgroundColor,
                  colorBlendMode: dark ? BlendMode.screen : BlendMode.multiply,
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
