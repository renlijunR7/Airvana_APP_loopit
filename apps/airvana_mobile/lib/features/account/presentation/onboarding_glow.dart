import 'dart:math' as math;

import 'package:flutter/material.dart';

/// Web `onboarding-shell` 顶部那团淡红光晕。
///
/// 原样式：`top:-100px; width:400px; height:300px;
/// background:radial-gradient(ellipse, rgba(255,59,74,.10), transparent 70%)`。
/// 引导页和登录页在 Web 上是同一个壳（`s.ob < 4`），所以两页都带它。
///
/// CSS `radial-gradient(ellipse, …)` 缺省尺寸是 farthest-corner：椭圆要过盒子
/// 四角，半轴是 200√2 × 150√2。Flutter 的 [RadialGradient] 半径按短边比例取，
/// 所以在 400×300 的盒子里用 √½（≈.707）按短边画出 212px 半径的圆，再把 X 轴拉到
/// 4/3——得到 283×212 的椭圆，70% 停点落在 198×148，与 Web 一致。
class OnboardingGlow extends StatelessWidget {
  const OnboardingGlow({super.key});

  @override
  Widget build(BuildContext context) => Positioned(
    top: -100,
    left: 0,
    right: 0,
    child: IgnorePointer(
      child: Center(
        child: Transform.scale(
          scaleX: 4 / 3,
          child: const SizedBox(
            width: 400,
            height: 300,
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: RadialGradient(
                  radius: math.sqrt1_2,
                  colors: [Color(0x1AFF3B4A), Color(0x00FF3B4A)],
                  stops: [0, .7],
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
