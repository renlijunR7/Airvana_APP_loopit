import 'package:flutter/material.dart';

/// The legacy Web wordmark uses the bundled `logo.png` inside a deliberately
/// cropped 78 x 30 frame. Keep that geometry here instead of reconstructing the
/// mark with text, so Web and Flutter render the same artwork.
///
/// Both bundled variants already have transparent backgrounds. Render their
/// original alpha without a color filter so gradients remain visible behind
/// the artwork and the red/blue brand colors remain unchanged.
class AirvanaLogo extends StatelessWidget {
  const AirvanaLogo({super.key, this.width = 78, this.dark = false});

  final double width;

  /// Use the transparent white wordmark on dark surfaces.
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
