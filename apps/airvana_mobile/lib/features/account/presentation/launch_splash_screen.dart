/// 启动页。冷启动的第一屏，之后是三页引导、登录、主应用。
///
/// 版式逐项取自 Web 的 `.launch-splash`（`public/index.html:52-56`，样式在
/// `airvana-v4.css:3025-3035`）：165° 的白→淡粉→灰渐变底；右上角一团呼吸的
/// 红色光晕；左上 112px 的 logo 加一行 8px 大写字距 .14em 的
/// 「Agentic Playable Network」；中段一句红色小字、两行 30px 黑体标题、
/// 一行灰色说明「正在恢复账号、版本与本地工作状态…」。
///
/// 停留时长照 Web：`this._launchT3 = setTimeout(() => setState({launchVisible:false}), 1040)`，
/// 固定 1040ms。这里同时把带本地状态的 provider 预热一遍（这就是那句
/// 「正在恢复…」真正在做的事），谁慢就等谁——但预热失败或超时不拦人，
/// 启动页不该因为一个 provider 报错把用户卡住。
library;

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/providers.dart';
import '../../../shared/presentation/airvana_logo.dart';

/// Web `_launchT3` 的 1040ms。
const kLaunchSplashMinimum = Duration(milliseconds: 1040);

/// 预热最多等这么久；再慢就先进引导页，数据在后面的页面里继续加载。
const kLaunchSplashRestoreCap = Duration(seconds: 3);

/// 等第一帧**真正上屏**最多等这么久。
///
/// Android 在 Flutter 光栅化出第一帧之前一直显示系统启动图，而 UI 线程的
/// post-frame 回调在光栅化之前就会触发——模拟器上 release 包首帧光栅化要
/// 一两秒（着色器编译），从 initState 或 post-frame 计时的话计时器在启动页
/// 露面之前就到点了，用户看到的是系统启动图直接切到引导页。
/// [WidgetsBinding.waitUntilFirstFrameRasterized] 才是「上屏」的信号；
/// widget 测试没有光栅化，它永远不完成，所以要有上限。
///
/// 实测（API 36 arm64 模拟器，release）：initState 后 2.1s 首帧才光栅化，
/// Android 再过 0.6s 才把系统启动图撤掉（`ActivityTaskManager: Displayed`），
/// 之后 1040ms 准时离开——从 initState 计时的话用户一帧都看不到。
const kLaunchSplashFirstFrameCap = Duration(milliseconds: 1500);

class LaunchSplashScreen extends ConsumerStatefulWidget {
  const LaunchSplashScreen({super.key});

  @override
  ConsumerState<LaunchSplashScreen> createState() => _LaunchSplashScreenState();
}

class _LaunchSplashScreenState extends ConsumerState<LaunchSplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _glow;

  @override
  void initState() {
    super.initState();
    // Web @keyframes launchGlow：2.2s ease-in-out 往返，scale .94↔1.08、opacity .55↔.9。
    _glow = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2200),
    )..repeat(reverse: true);
    unawaited(_run());
  }

  @override
  void dispose() {
    _glow.dispose();
    super.dispose();
  }

  Future<void> _run() async {
    // 1040ms 从第一帧上屏开始计（见 kLaunchSplashFirstFrameCap 的说明）。
    await WidgetsBinding.instance.waitUntilFirstFrameRasterized.timeout(
      kLaunchSplashFirstFrameCap,
      onTimeout: () {},
    );
    if (!mounted) return;
    final minimum = Future<void>.delayed(kLaunchSplashMinimum);
    // 「正在恢复账号、版本与本地工作状态」：把带本地状态的那几个 provider 先读一遍。
    final restore = Future.wait<Object?>([
      ref.read(profileFeatureStateProvider.future),
      ref.read(homeProvider.future),
    ]).timeout(kLaunchSplashRestoreCap).then<void>((_) {}, onError: (_) {});
    await Future.wait<void>([minimum, restore]);
    if (!mounted) return;
    context.go('/onboarding');
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    key: const ValueKey('launch-splash'),
    body: DecoratedBox(
      // CSS linear-gradient(165deg, #fff 0%, #fff5f6 56%, #f2f2f7 100%)：
      // 165° 即方向向量 (sin165°, -cos165°) = (.259, .966)，从左上偏下指向右下。
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment(-.259, -.966),
          end: Alignment(.259, .966),
          colors: [Color(0xFFFFFFFF), Color(0xFFFFF5F6), Color(0xFFF2F2F7)],
          stops: [0, .56, 1],
        ),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) => Stack(
          fit: StackFit.expand,
          children: [
            // .launch-splash__glow：top 10%、right -35%、360×360 的圆。
            Positioned(
              top: constraints.maxHeight * .10,
              right: -constraints.maxWidth * .35,
              width: 360,
              height: 360,
              child: IgnorePointer(
                child: AnimatedBuilder(
                  animation: _glow,
                  builder: (context, _) {
                    final t = Curves.easeInOut.transform(_glow.value);
                    return Opacity(
                      opacity: .55 + (.9 - .55) * t,
                      child: Transform.scale(
                        scale: .94 + (1.08 - .94) * t,
                        child: const DecoratedBox(
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: RadialGradient(
                              colors: [
                                Color(0x2EFF3B4A),
                                Color(0x05FF3B4A),
                                Color(0x00FF3B4A),
                              ],
                              stops: [0, .6, .72],
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(30, 42, 30, 30),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // .launch-splash__brand
                    const AirvanaLogo(
                      width: 112,
                      backgroundColor: Colors.white,
                    ),
                    const SizedBox(height: 7),
                    const Padding(
                      padding: EdgeInsets.only(left: 1),
                      child: Text(
                        'AGENTIC PLAYABLE NETWORK',
                        style: TextStyle(
                          fontSize: 8,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 8 * .14,
                          color: Color(0xFF8E8E93),
                        ),
                      ),
                    ),
                    // .launch-splash__story：flex:1 + 垂直居中
                    Expanded(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: const [
                          Text(
                            '让每一位 KOL',
                            style: TextStyle(
                              fontSize: 13,
                              color: Color(0xFFFF3B4A),
                            ),
                          ),
                          SizedBox(height: 10),
                          Text(
                            '创作并运营自己的\nAgentic Playable',
                            style: TextStyle(
                              fontSize: 30,
                              height: 1.12,
                              fontWeight: FontWeight.w900,
                              letterSpacing: -30 * .05,
                              color: Color(0xFF1C1C1E),
                            ),
                          ),
                          SizedBox(height: 16),
                          SizedBox(
                            width: 260,
                            child: Text(
                              '正在恢复账号、版本与本地工作状态…',
                              style: TextStyle(
                                fontSize: 11,
                                height: 1.7,
                                color: Color(0xFF737780),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    ),
  );
}
