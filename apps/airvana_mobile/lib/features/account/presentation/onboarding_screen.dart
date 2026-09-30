/// 首启引导页。
///
/// 对齐 Web 版的三段式：`s.ob` 0-2 是引导、3 是登录、≥4 进主应用。
/// 这里只负责 0-2，看完（或跳过）之后进登录页。
///
/// 每次冷启动都会出现，不做「看过就不再出现」——Web 的 `s.ob` 每次加载
/// 都从 0 开始，恢复本地状态时也不碰它；产品要求「启动页 → 引导页 → 登录」
/// 在杀掉进程重开时原样走一遍。
///
/// 交互沿用 Web：可左右滑动、点圆点直达、末页按钮文案变「开始」、
/// 右下角常驻「跳过」。第一页显示 logo，后两页是设计稿插图。
library;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../design_system/airvana_theme.dart';
import '../../../shared/presentation/airvana_logo.dart';
import '../domain/onboarding_slides.dart';
import 'onboarding_glow.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _pages = PageController();
  int _index = 0;
  bool _leaving = false;

  @override
  void dispose() {
    _pages.dispose();
    super.dispose();
  }

  /// 看完或跳过都走这里。
  ///
  /// `_leaving` 防重入——末页快速连点「开始」会触发两次跳转，
  /// 在 go_router 下表现为登录页被压两层，返回时要按两次。
  void _finish() {
    if (_leaving) return;
    _leaving = true;
    context.go('/signin');
  }

  void _next() {
    if (_index >= kOnboardingSlides.length - 1) {
      _finish();
      return;
    }
    _pages.nextPage(
      duration: const Duration(milliseconds: 260),
      curve: Curves.easeOutCubic,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AirvanaColors.canvas,
      body: Stack(
        children: [
          const OnboardingGlow(),
          SafeArea(
            child: Column(
              children: [
                Expanded(
                  child: PageView.builder(
                    key: const ValueKey('onboarding-pager'),
                    controller: _pages,
                    itemCount: kOnboardingSlides.length,
                    onPageChanged: (value) => setState(() => _index = value),
                    itemBuilder: (context, index) => _Slide(
                      slide: kOnboardingSlides[index],
                      isFirst: index == 0,
                    ),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(36, 0, 36, 56),
                  child: Column(
                    children: [
                      _Dots(
                        count: kOnboardingSlides.length,
                        active: _index,
                        onPick: (value) => _pages.animateToPage(
                          value,
                          duration: const Duration(milliseconds: 260),
                          curve: Curves.easeOutCubic,
                        ),
                      ),
                      const SizedBox(height: 10),
                      SizedBox(
                        width: double.infinity,
                        height: 56,
                        child: FilledButton(
                          key: const ValueKey('onboarding-next'),
                          onPressed: _next,
                          style: FilledButton.styleFrom(
                            backgroundColor: AirvanaColors.accent,
                            shape: const StadiumBorder(),
                            textStyle: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          child: Text(onboardingButtonLabel(_index)),
                        ),
                      ),
                      const SizedBox(height: 6),
                      TextButton(
                        key: const ValueKey('onboarding-skip'),
                        onPressed: _finish,
                        style: TextButton.styleFrom(
                          foregroundColor: AirvanaColors.muted,
                          textStyle: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        child: const Text('跳过'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Slide extends StatelessWidget {
  const _Slide({required this.slide, required this.isFirst});

  final OnboardingSlide slide;
  final bool isFirst;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    // 正常手机上内容居中；屏幕过矮（小机型、放大字号、横屏）时允许滚动，
    // 而不是让 180px 的图标圈把标题挤出可视区。
    builder: (context, constraints) => SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 36, vertical: 12),
      child: ConstrainedBox(
        constraints: BoxConstraints(minHeight: constraints.maxHeight - 24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // 第一页放 logo；后两页放设计稿的 180×180 插图，占 Web 那个 180px
            // 圆圈的位置——插图自带浅粉底，不再另画圆圈。
            if (slide.image == null) ...[
              const AirvanaLogo(width: 220),
              const SizedBox(height: 44),
            ] else ...[
              Image.asset(
                slide.image!,
                key: ValueKey('onboarding-image-${slide.image}'),
                width: 180,
                height: 180,
                filterQuality: FilterQuality.medium,
              ),
              const SizedBox(height: 40),
            ],
            Text(
              slide.title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 30,
                height: 1.2,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.5,
                color: AirvanaColors.ink,
              ),
            ),
            Text(
              slide.titleAccent,
              textAlign: TextAlign.center,
              // Web 的强调行是斜体（font-style:italic），不只是换个颜色。
              style: const TextStyle(
                fontSize: 30,
                height: 1.2,
                fontWeight: FontWeight.w800,
                letterSpacing: -0.5,
                fontStyle: FontStyle.italic,
                color: AirvanaColors.accent,
              ),
            ),
            if (!isFirst) ...[
              const SizedBox(height: 14),
              Text(
                slide.description,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 15,
                  height: 1.7,
                  color: AirvanaColors.muted,
                ),
              ),
            ],
          ],
        ),
      ),
    ),
  );
}

/// 分页点。选中的拉长成 22px 并变成强调色，与 Web 的 obDots 一致。
class _Dots extends StatelessWidget {
  const _Dots({
    required this.count,
    required this.active,
    required this.onPick,
  });

  final int count;
  final int active;
  final ValueChanged<int> onPick;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisAlignment: MainAxisAlignment.center,
    children: [
      for (var i = 0; i < count; i++)
        Semantics(
          button: true,
          selected: i == active,
          label: '查看第 ${i + 1} 页引导',
          child: GestureDetector(
            key: ValueKey('onboarding-dot-$i'),
            onTap: () => onPick(i),
            behavior: HitTestBehavior.opaque,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 11),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 220),
                curve: Curves.easeOut,
                width: i == active ? 22 : 6,
                height: 6,
                decoration: BoxDecoration(
                  color: i == active
                      ? AirvanaColors.accent
                      : const Color(0xFFC7C7CC),
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
            ),
          ),
        ),
    ],
  );
}
