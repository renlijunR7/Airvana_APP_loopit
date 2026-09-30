/// 首启引导页的内容。
///
/// 文案逐字取自 Web 版 `public/index.html:6507-6509` 的三张 slide。Web 版已不再
/// 作为产品面维护，但它仍是这套交互唯一的完整定义，照抄文案比重写更可靠——
/// 这几句是对外的产品主张，不该在移植过程中被"顺手改好一点"。
///
/// 第 2、3 页的图不再是 Web 的 ◎ / ✨ 文字符号，而是设计稿给的两张 180×180
/// 插图（2026-09-24，桌面 `Airvana-引导页图标/01-互动归因.svg`、`02-资产沉淀.svg`）。
/// SVG 源文件留在 `assets/legacy/onboarding/src/`，位图由它们光栅化出 1x/2x/3x。
library;

/// 一张引导页。
class OnboardingSlide {
  const OnboardingSlide({
    required this.title,
    required this.titleAccent,
    required this.description,
    this.image,
  });

  /// 插图资源路径；第一张为 null，显示 logo（Web 的 `obFirst` 分支）。
  final String? image;

  /// 标题分两行，第二行用强调色（Web 的 `obTitle` / `obTitleAccent`）。
  final String title;
  final String titleAccent;

  /// 第一张没有描述（Web 的 `obHasDesc` 仅在 1、2 页为真）。
  final String description;
}

const List<OnboardingSlide> kOnboardingSlides = <OnboardingSlide>[
  OnboardingSlide(
    title: 'Every KOL Owns',
    titleAccent: 'Agentic Playables',
    description: '让每一位 KOL 都能创建并运营属于自己的 Agentic Playable 智能营销体。',
  ),
  OnboardingSlide(
    image: 'assets/legacy/onboarding/attribute-results.png',
    title: 'Create, Interact,',
    titleAccent: 'Attribute Results',
    description: '从内容生成到互动转化，以 KOL 专属链接、版本和获批事件构建可审核的归因链路。',
  ),
  OnboardingSlide(
    image: 'assets/legacy/onboarding/compound-value.png',
    title: 'Operate, Settle,',
    titleAccent: 'Compound Value',
    description: '持续优化、交付与结算，并把 Playable、运营规则、受众洞察和归因记录沉淀为长期资产。',
  ),
];

/// 最后一页的按钮文案是「开始」，其余是「继续」（Web 的 `obBtn`）。
String onboardingButtonLabel(int index) =>
    index >= kOnboardingSlides.length - 1 ? '开始' : '继续';
