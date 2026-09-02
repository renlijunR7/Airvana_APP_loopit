import 'dart:ui' show BlurStyle, MaskFilter, lerpDouble;

import 'package:airvana_mobile/design_system/airvana_theme.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class GrowthForcePulseIcon extends StatefulWidget {
  const GrowthForcePulseIcon({super.key});

  @override
  State<GrowthForcePulseIcon> createState() => _GrowthForcePulseIconState();
}

class _GrowthForcePulseIconState extends State<GrowthForcePulseIcon>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1800),
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.disableAnimationsOf(context)) {
      _controller.stop();
      _controller.value = 0.64;
    } else if (!_controller.isAnimating) {
      _controller.repeat();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  double _segment(
    double progress,
    double begin,
    double end,
    double from,
    double to,
  ) {
    if (progress <= begin) return from;
    if (progress >= end) return to;
    final t = Curves.easeInOut.transform((progress - begin) / (end - begin));
    return lerpDouble(from, to, t)!;
  }

  double _value(double progress, List<(double, double)> stops) {
    for (var i = 0; i < stops.length - 1; i++) {
      if (progress <= stops[i + 1].$1) {
        return _segment(
          progress,
          stops[i].$1,
          stops[i + 1].$1,
          stops[i].$2,
          stops[i + 1].$2,
        );
      }
    }
    return stops.last.$2;
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _controller,
    builder: (context, _) {
      final progress = MediaQuery.disableAnimationsOf(context)
          ? 0.64
          : _controller.value;
      final scale = _value(progress, const [
        (0, .96),
        (.45, 1.08),
        (.52, .98),
        (.64, 1.04),
        (1, .96),
      ]);
      final opacity = _value(progress, const [
        (0, .82),
        (.45, 1),
        (.52, .72),
        (.64, 1),
        (1, .82),
      ]);
      final glow = _value(progress, const [
        (0, 0),
        (.45, 3),
        (.52, 1),
        (.64, 4),
        (1, 0),
      ]);
      return Transform.scale(
        key: const ValueKey('network-force-icon-transform'),
        scale: scale,
        child: Opacity(
          key: const ValueKey('network-force-icon-opacity'),
          opacity: opacity,
          child: CustomPaint(
            key: const ValueKey('network-force-icon'),
            size: const Size.square(23),
            painter: _GrowthBoltPainter(glow: glow),
          ),
        ),
      );
    },
  );
}

class _GrowthBoltPainter extends CustomPainter {
  const _GrowthBoltPainter({required this.glow});

  final double glow;

  @override
  void paint(Canvas canvas, Size size) {
    final sx = size.width / 24;
    final sy = size.height / 24;
    final path = Path()
      ..moveTo(13.7 * sx, 2.4 * sy)
      ..lineTo(5.9 * sx, 13.1 * sy)
      ..lineTo(11.1 * sx, 13.1 * sy)
      ..lineTo(10.3 * sx, 21.6 * sy)
      ..lineTo(18.1 * sx, 9.8 * sy)
      ..lineTo(12.7 * sx, 9.8 * sy)
      ..close();
    if (glow > 0) {
      canvas.drawPath(
        path,
        Paint()
          ..color = AirvanaColors.accent.withValues(
            alpha: .62 * (glow / 4).clamp(0.0, 1.0).toDouble(),
          )
          ..maskFilter = MaskFilter.blur(BlurStyle.normal, glow),
      );
    }
    canvas.drawPath(path, Paint()..color = AirvanaColors.accent);
  }

  @override
  bool shouldRepaint(covariant _GrowthBoltPainter oldDelegate) =>
      oldDelegate.glow != glow;
}

class GrowthNetworkDetailScreen extends StatefulWidget {
  const GrowthNetworkDetailScreen({super.key});

  @override
  State<GrowthNetworkDetailScreen> createState() =>
      _GrowthNetworkDetailScreenState();
}

class _GrowthNetworkDetailScreenState extends State<GrowthNetworkDetailScreen> {
  int _tab = 0;
  bool _joinMode = false;
  bool _hasLocalCircle = false;
  final _inviteController = TextEditingController();

  static const _tabs = ['网络', '我的连接', '贡献', '规则'];

  @override
  void dispose() {
    _inviteController.dispose();
    super.dispose();
  }

  void _selectTab(int index) => setState(() => _tab = index);

  @override
  Widget build(BuildContext context) => Scaffold(
    key: const ValueKey('growth-network-detail-screen'),
    backgroundColor: AirvanaColors.canvas,
    body: SafeArea(
      bottom: false,
      child: Column(
        children: [
          SizedBox(
            width: double.infinity,
            height: 56,
            child: Stack(
              alignment: Alignment.center,
              children: [
                const Text(
                  '增长网络',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900),
                ),
                Positioned(
                  left: 8,
                  top: 4,
                  bottom: 4,
                  child: SizedBox(
                    width: 48,
                    child: IconButton(
                      key: const ValueKey('growth-network-back'),
                      tooltip: '返回增长网络',
                      color: AirvanaColors.ink,
                      padding: EdgeInsets.zero,
                      onPressed: () {
                        final navigator = Navigator.of(context);
                        if (navigator.canPop()) {
                          navigator.pop();
                        } else {
                          context.go('/world');
                        }
                      },
                      icon: const Icon(
                        Icons.arrow_back_ios_new_rounded,
                        size: 22,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          Container(
            key: const ValueKey('growth-network-tabs'),
            height: 54,
            padding: const EdgeInsets.symmetric(horizontal: 22),
            decoration: const BoxDecoration(
              color: AirvanaColors.canvas,
              border: Border(bottom: BorderSide(color: AirvanaColors.line)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: List.generate(_tabs.length, (index) {
                final selected = _tab == index;
                return Semantics(
                  selected: selected,
                  button: true,
                  child: InkWell(
                    key: ValueKey('growth-network-tab-$index'),
                    onTap: () => _selectTab(index),
                    child: SizedBox(
                      height: 54,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 7),
                            child: Text(
                              _tabs[index],
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: selected
                                    ? FontWeight.w900
                                    : FontWeight.w700,
                                color: selected
                                    ? AirvanaColors.ink
                                    : AirvanaColors.muted,
                              ),
                            ),
                          ),
                          if (selected)
                            const Positioned(
                              right: 0,
                              bottom: 0,
                              left: 0,
                              child: SizedBox(
                                height: 2,
                                child: ColoredBox(color: AirvanaColors.accent),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                );
              }),
            ),
          ),
          Expanded(
            child: IndexedStack(
              index: _tab,
              children: [
                _tabScroll(const _GrowthNetworkOverview()),
                _tabScroll(_connections()),
                _tabScroll(const _GrowthContributionView()),
                _tabScroll(const _GrowthRulesView()),
              ],
            ),
          ),
        ],
      ),
    ),
  );

  Widget _tabScroll(Widget child) => SingleChildScrollView(
    key: PageStorageKey('growth-network-scroll-$_tab'),
    padding: EdgeInsets.fromLTRB(
      20,
      16,
      20,
      MediaQuery.viewPaddingOf(context).bottom + 16,
    ),
    child: child,
  );

  Widget _connections() {
    if (_hasLocalCircle) return const _GrowthLocalCircle();
    if (_joinMode) {
      return _GrowthCard(
        key: const ValueKey('growth-network-join-card'),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('通过邀请码建立 Agent 连接', style: _titleStyle),
            const SizedBox(height: 8),
            const Text(
              '输入协作发起人分享的邀请码。演示提交只会生成一组本地协作关系，不共享真实记忆、钱包数据，也不发送服务端请求。',
              style: _bodyStyle,
            ),
            const SizedBox(height: 18),
            const Text('协作邀请码', style: _labelStyle),
            const SizedBox(height: 7),
            TextField(
              key: const ValueKey('growth-network-invite-input'),
              controller: _inviteController,
              decoration: _fieldDecoration('例如 AIR-NINA-2050'),
              textCapitalization: TextCapitalization.characters,
            ),
            const SizedBox(height: 14),
            _GrowthAction(
              key: const ValueKey('growth-network-submit-invite'),
              label: '确认连接（演示）',
              primary: true,
              onTap: () => setState(() => _hasLocalCircle = true),
            ),
            const SizedBox(height: 4),
            Center(
              child: TextButton(
                onPressed: () => setState(() => _joinMode = false),
                child: const Text('取消'),
              ),
            ),
          ],
        ),
      );
    }
    return _GrowthCard(
      key: const ValueKey('growth-network-empty'),
      child: Column(
        children: [
          Container(
            width: 58,
            height: 58,
            alignment: Alignment.center,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: Color(0xFFFFF1F2),
            ),
            child: const Text(
              '◎',
              style: TextStyle(
                color: AirvanaColors.accent,
                fontSize: 29,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          const SizedBox(height: 14),
          const Text('建立你的第一个 Agent 协作连接', style: _titleStyle),
          const SizedBox(height: 8),
          const Text(
            '邀请其他用户的 AI 分身建立协作；连接在对方接受邀请后生效，只共享完成任务所需的最小信息，且连接本身不产生奖励。',
            textAlign: TextAlign.center,
            style: _bodyStyle,
          ),
          const SizedBox(height: 20),
          _GrowthAction(
            key: const ValueKey('growth-network-create-circle'),
            label: '建立协作连接',
            primary: true,
            onTap: () => setState(() => _hasLocalCircle = true),
          ),
          const SizedBox(height: 9),
          _GrowthAction(
            key: const ValueKey('growth-network-open-invite'),
            label: '通过邀请码连接',
            onTap: () => setState(() => _joinMode = true),
          ),
        ],
      ),
    );
  }
}

const _titleStyle = TextStyle(
  color: AirvanaColors.ink,
  fontSize: 15,
  fontWeight: FontWeight.w900,
);
const _labelStyle = TextStyle(
  color: AirvanaColors.ink,
  fontSize: 11,
  fontWeight: FontWeight.w800,
);
const _bodyStyle = TextStyle(
  color: Color(0xFF636366),
  fontSize: 11,
  height: 1.65,
);

InputDecoration _fieldDecoration(String hint) => InputDecoration(
  hintText: hint,
  hintStyle: const TextStyle(color: AirvanaColors.muted, fontSize: 11),
  filled: true,
  fillColor: const Color(0xFFF7F7FA),
  contentPadding: const EdgeInsets.symmetric(horizontal: 13, vertical: 13),
  enabledBorder: OutlineInputBorder(
    borderRadius: BorderRadius.circular(13),
    borderSide: const BorderSide(color: AirvanaColors.line),
  ),
  focusedBorder: OutlineInputBorder(
    borderRadius: BorderRadius.circular(13),
    borderSide: const BorderSide(color: AirvanaColors.accent),
  ),
);

class _GrowthNetworkOverview extends StatelessWidget {
  const _GrowthNetworkOverview();

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      const _GrowthAgentHero(),
      const _GrowthSectionTitle('从一次互动，到持续创作'),
      GridView.count(
        physics: const NeverScrollableScrollPhysics(),
        shrinkWrap: true,
        crossAxisCount: MediaQuery.sizeOf(context).width < 375 ? 1 : 2,
        crossAxisSpacing: 8,
        mainAxisSpacing: 8,
        childAspectRatio: MediaQuery.sizeOf(context).width < 375 ? 3.15 : 1.42,
        children: const [
          _LoopCard('01', '理解你', '在用户授权范围内沉淀偏好、目标、内容与协作关系。'),
          _LoopCard('02', '连接玩家', '陪伴玩家体验产品，理解选择、反馈与未被满足的需求。'),
          _LoopCard('03', '发现方向', '把互动信号整理为可解释的洞察与下一轮创作建议。'),
          _LoopCard(
            '04',
            '自主运营',
            '在 Campaign Contract 边界内迭代、测试和运营 Agentic Playable。',
          ),
        ],
      ),
      const _GrowthSectionTitle('一个 AI 分身的完整能力'),
      const _FoundationCard(
        'M',
        '长期记忆',
        '记住用户明确授权的偏好、创作历史与长期目标，支持查看、纠正和删除。',
        'USER CONTROLLED',
      ),
      const SizedBox(height: 8),
      const _FoundationCard(
        'ID',
        '数字分身',
        '保持稳定的身份、形象、声音和表达方式，与玩家建立连续关系。',
        'IDENTITY',
      ),
      const SizedBox(height: 8),
      const _FoundationCard(
        'W',
        '数字钱包',
        '用于签名、身份与授权确认；Airvana 不读取私钥、助记词或未经批准的资产数据。',
        'PERMISSION',
      ),
      const SizedBox(height: 8),
      const _FoundationCard(
        'AP',
        'Playable OS',
        '一个用户可拥有并持续运营多个 Agentic Playable，每个 Playable 独立版本化。',
        'OPERATIONS',
      ),
      const _GrowthSectionTitle('分身彼此连接，形成 Airvana Network'),
      const _AgentNetworkCard(),
      const _GrowthSectionTitle('Airvana 的持续增长飞轮'),
      const _Flywheel(),
      const SizedBox(height: 14),
      const _BoundaryCard(
        title: '自主，但不越界',
        bullets: [
          '长期记忆由用户授权、可查看、可修正、可删除。',
          '钱包只完成签名与授权，不触碰私钥、助记词或原始 KYC 数据。',
          '预算、奖励、CTA、地区、归因、结算和 Kill Switch 由 Campaign Contract 锁定。',
          'Agent 之间只共享完成协作所需的最小信息，高风险动作必须人工批准。',
        ],
        note: '以上为产品目标叙事；真实长期记忆、钱包授权、跨 Agent 协作与自动运营仍依赖后端、权限、审计和安全基础设施。',
      ),
      const SizedBox(height: 14),
      _GrowthAction(
        label: '查看我的 AI 分身',
        primary: true,
        onTap: () => context.push('/profile/secondary/aiTwin'),
      ),
      const SizedBox(height: 9),
      _GrowthAction(
        label: '查看我的 Agent 连接',
        onTap: () {
          final state = context
              .findAncestorStateOfType<_GrowthNetworkDetailScreenState>();
          state?._selectTab(1);
        },
      ),
    ],
  );
}

class _GrowthAgentHero extends StatelessWidget {
  const _GrowthAgentHero();

  @override
  Widget build(BuildContext context) => Container(
    key: const ValueKey('growth-network-hero'),
    padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(24),
      gradient: const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Color(0xFF24252A), Color(0xFF17181D)],
      ),
      border: Border.all(color: const Color(0xFF3C3D44)),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'AIRVANA AGENT NETWORK · 产品规划',
          style: TextStyle(
            color: Color(0xFFFF9CA6),
            fontSize: 9,
            fontWeight: FontWeight.w900,
            letterSpacing: .8,
          ),
        ),
        const SizedBox(height: 10),
        const Text(
          '每个人都有一个，\n持续成长的 AI 分身。',
          style: TextStyle(
            color: Colors.white,
            fontSize: 25,
            height: 1.16,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 9),
        const Text(
          '它带着你的长期记忆、数字身份与钱包，在获得授权的边界内与玩家持续互动，把产品体验与真实反馈转化为新的创作方向，并自主运营你拥有的 Agentic Playable。',
          style: TextStyle(
            color: Color(0xFFB9BBC2),
            fontSize: 11,
            height: 1.72,
          ),
        ),
        const SizedBox(height: 14),
        const _AgentCoreVisual(),
      ],
    ),
  );
}

class _AgentCoreVisual extends StatelessWidget {
  const _AgentCoreVisual();

  @override
  Widget build(BuildContext context) => Container(
    height: 270,
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(22),
      color: const Color(0xFF1D1E24),
      border: Border.all(color: const Color(0xFF3A3B42)),
    ),
    child: Stack(
      children: [
        const Positioned(
          left: 10,
          top: 24,
          child: _Capability('记', '长期记忆', '偏好与关系'),
        ),
        const Positioned(
          right: 10,
          top: 24,
          child: _Capability('人', '数字分身', '身份与表达'),
        ),
        const Positioned(
          left: 10,
          bottom: 47,
          child: _Capability('签', '数字钱包', '签名与授权'),
        ),
        const Positioned(
          right: 10,
          bottom: 47,
          child: _Capability('玩', '玩家互动', '体验与反馈'),
        ),
        Center(
          child: Container(
            width: 116,
            height: 132,
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(30),
              color: Colors.white.withValues(alpha: .08),
              border: Border.all(color: Colors.white.withValues(alpha: .18)),
              boxShadow: [
                BoxShadow(
                  color: AirvanaColors.accent.withValues(alpha: .08),
                  spreadRadius: 10,
                ),
              ],
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Stack(
                  clipBehavior: Clip.none,
                  children: [
                    const CircleAvatar(
                      radius: 30,
                      backgroundImage: AssetImage(
                        'assets/legacy/avatars/kai.png',
                      ),
                    ),
                    Positioned(
                      right: -4,
                      bottom: -2,
                      child: Container(
                        width: 25,
                        height: 25,
                        alignment: Alignment.center,
                        decoration: const BoxDecoration(
                          color: AirvanaColors.accent,
                          shape: BoxShape.circle,
                        ),
                        child: const Text(
                          'AI',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 8,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                const Text(
                  'Kai Chen 的分身',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 9,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  '● 持续学习中',
                  style: TextStyle(color: Color(0xFFB9BBC2), fontSize: 7),
                ),
              ],
            ),
          ),
        ),
        Positioned(
          right: 10,
          bottom: 10,
          left: 10,
          child: Container(
            height: 27,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: Colors.black.withValues(alpha: .3),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Text(
              '一个用户  →  一个 AI 分身  →  多个 Agentic Playable',
              style: TextStyle(
                color: Color(0xFFD5D6DA),
                fontSize: 7,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
        ),
      ],
    ),
  );
}

class _Capability extends StatelessWidget {
  const _Capability(this.icon, this.title, this.subtitle);
  final String icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) => SizedBox(
    width: 76,
    child: Row(
      children: [
        Container(
          width: 27,
          height: 27,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: .08),
            borderRadius: BorderRadius.circular(9),
          ),
          child: Text(
            icon,
            style: const TextStyle(
              color: Color(0xFFFF9CA6),
              fontSize: 8,
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
        const SizedBox(width: 5),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 7.5,
                  fontWeight: FontWeight.w900,
                ),
              ),
              Text(
                subtitle,
                style: const TextStyle(color: Color(0xFF92949D), fontSize: 6),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

class _GrowthSectionTitle extends StatelessWidget {
  const _GrowthSectionTitle(this.title);
  final String title;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(2, 22, 2, 10),
    child: Text(
      title,
      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900),
    ),
  );
}

class _LoopCard extends StatelessWidget {
  const _LoopCard(this.number, this.title, this.body);
  final String number;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) => _GrowthCard(
    padding: const EdgeInsets.all(12),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 28,
          height: 28,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: const Color(0xFFFFF1F2),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(
            number,
            style: const TextStyle(
              color: AirvanaColors.accent,
              fontSize: 8,
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
        const SizedBox(width: 9),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 5),
              Text(
                body,
                style: const TextStyle(
                  color: Color(0xFF636366),
                  fontSize: 8,
                  height: 1.6,
                ),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

class _FoundationCard extends StatelessWidget {
  const _FoundationCard(this.icon, this.title, this.body, this.tag);
  final String icon;
  final String title;
  final String body;
  final String tag;

  @override
  Widget build(BuildContext context) => _GrowthCard(
    padding: const EdgeInsets.all(13),
    child: Stack(
      children: [
        Row(
          children: [
            Container(
              width: 42,
              height: 42,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: const Color(0xFFFFE7E9),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Text(
                icon,
                style: const TextStyle(
                  color: AirvanaColors.accent,
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
            const SizedBox(width: 11),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    body,
                    style: const TextStyle(
                      color: Color(0xFF636366),
                      fontSize: 8.5,
                      height: 1.6,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        Positioned(
          right: 0,
          top: 0,
          child: Text(
            tag,
            style: const TextStyle(
              color: Color(0xFFC7C7CC),
              fontSize: 5.5,
              fontWeight: FontWeight.w900,
              letterSpacing: .5,
            ),
          ),
        ),
      ],
    ),
  );
}

class _AgentNetworkCard extends StatelessWidget {
  const _AgentNetworkCard();

  @override
  Widget build(BuildContext context) => Container(
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(22),
      gradient: const LinearGradient(colors: [Colors.white, Color(0xFFFFF5F6)]),
      border: Border.all(color: const Color(0xFFFFD6DA)),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          height: 210,
          child: Stack(
            children: const [
              Positioned(left: 20, top: 30, child: _AgentNode('K', 'Kai AI')),
              Positioned(right: 20, top: 30, child: _AgentNode('N', 'Nina AI')),
              Positioned(
                left: 20,
                bottom: 24,
                child: _AgentNode('L', 'Leo AI'),
              ),
              Positioned(
                right: 20,
                bottom: 24,
                child: _AgentNode('S', 'Sora AI'),
              ),
              Center(child: _AgentNetworkCore()),
            ],
          ),
        ),
        const Padding(
          padding: EdgeInsets.fromLTRB(15, 0, 15, 6),
          child: Text(
            '连接的不是账号列表，而是可协作的 Agent 能力。',
            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900),
          ),
        ),
        const Padding(
          padding: EdgeInsets.fromLTRB(15, 0, 15, 13),
          child: Text(
            '不同分身可以围绕同一个目标联合创作、协作分发、持续运营和验证贡献，让每一次玩家互动都回到下一轮内容与产品决策。',
            style: TextStyle(
              color: Color(0xFF6E5A5D),
              fontSize: 8.5,
              height: 1.65,
            ),
          ),
        ),
        const Padding(
          padding: EdgeInsets.fromLTRB(15, 0, 15, 15),
          child: Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [_Tag('联合创作'), _Tag('协作运营'), _Tag('玩家洞察'), _Tag('贡献归因')],
          ),
        ),
      ],
    ),
  );
}

class _AgentNode extends StatelessWidget {
  const _AgentNode(this.initial, this.label);
  final String initial;
  final String label;
  @override
  Widget build(BuildContext context) => SizedBox(
    width: 72,
    child: Column(
      children: [
        Container(
          width: 42,
          height: 42,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(15),
            border: Border.all(color: const Color(0xFFFFD6DA)),
          ),
          child: Text(
            initial,
            style: const TextStyle(
              color: AirvanaColors.accent,
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
        const SizedBox(height: 5),
        Text(
          label,
          style: const TextStyle(
            color: Color(0xFF7B484E),
            fontSize: 7,
            fontWeight: FontWeight.w900,
          ),
        ),
      ],
    ),
  );
}

class _AgentNetworkCore extends StatelessWidget {
  const _AgentNetworkCore();
  @override
  Widget build(BuildContext context) => Container(
    width: 96,
    height: 96,
    alignment: Alignment.center,
    decoration: BoxDecoration(
      shape: BoxShape.circle,
      gradient: const LinearGradient(
        colors: [Color(0xFFFF5663), Color(0xFFFF3042)],
      ),
      boxShadow: [
        BoxShadow(
          color: AirvanaColors.accent.withValues(alpha: .23),
          blurRadius: 30,
        ),
      ],
    ),
    child: const Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          'Agentic\nPlayable',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: Colors.white,
            fontSize: 12,
            height: 1.15,
            fontWeight: FontWeight.w900,
          ),
        ),
        SizedBox(height: 5),
        Text(
          '协作运行',
          style: TextStyle(
            color: Color(0xFFFFD9DD),
            fontSize: 7,
            fontWeight: FontWeight.w800,
          ),
        ),
      ],
    ),
  );
}

class _Tag extends StatelessWidget {
  const _Tag(this.text);
  final String text;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(99),
      border: Border.all(color: const Color(0xFFFFD6DA)),
    ),
    child: Text(
      text,
      style: const TextStyle(
        color: Color(0xFFA43A45),
        fontSize: 7,
        fontWeight: FontWeight.w900,
      ),
    ),
  );
}

class _Flywheel extends StatelessWidget {
  const _Flywheel();
  @override
  Widget build(BuildContext context) => _GrowthCard(
    padding: const EdgeInsets.all(12),
    child: const Wrap(
      alignment: WrapAlignment.center,
      crossAxisAlignment: WrapCrossAlignment.center,
      spacing: 7,
      runSpacing: 7,
      children: [
        _FlywheelStep('玩家体验'),
        _Arrow(),
        _FlywheelStep('互动记忆'),
        _Arrow(),
        _FlywheelStep('创作方向'),
        _Arrow(),
        _FlywheelStep('Playable 版本'),
        _Arrow(),
        _FlywheelStep('Agent 协作'),
        _Arrow(symbol: '↻'),
      ],
    ),
  );
}

class _FlywheelStep extends StatelessWidget {
  const _FlywheelStep(this.text);
  final String text;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 7),
    decoration: BoxDecoration(
      color: const Color(0xFFF7F7FA),
      borderRadius: BorderRadius.circular(10),
    ),
    child: Text(
      text,
      style: const TextStyle(fontSize: 8, fontWeight: FontWeight.w900),
    ),
  );
}

class _Arrow extends StatelessWidget {
  const _Arrow({this.symbol = '→'});
  final String symbol;
  @override
  Widget build(BuildContext context) => Text(
    symbol,
    style: const TextStyle(
      color: AirvanaColors.accent,
      fontWeight: FontWeight.w900,
    ),
  );
}

class _BoundaryCard extends StatelessWidget {
  const _BoundaryCard({
    required this.title,
    required this.note,
    this.bullets = const [],
  });
  final String title;
  final List<String> bullets;
  final String note;

  @override
  Widget build(BuildContext context) => Container(
    key: ValueKey('growth-boundary-$title'),
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: const Color(0xFFFFF8F8),
      borderRadius: BorderRadius.circular(18),
      border: Border.all(color: const Color(0xFFFFD6DA)),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(
            color: Color(0xFFC62836),
            fontSize: 12,
            fontWeight: FontWeight.w900,
          ),
        ),
        if (bullets.isNotEmpty) ...[
          const SizedBox(height: 10),
          ...bullets.map(
            (text) => Padding(
              padding: const EdgeInsets.only(bottom: 6),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Padding(
                    padding: EdgeInsets.only(top: 5),
                    child: Icon(
                      Icons.circle,
                      size: 5,
                      color: AirvanaColors.accent,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      text,
                      style: const TextStyle(
                        color: Color(0xFF6E5A5D),
                        fontSize: 8.5,
                        height: 1.55,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
        const SizedBox(height: 8),
        Container(height: 1, color: const Color(0xFFF1C9CE)),
        const SizedBox(height: 8),
        Text(
          note,
          style: const TextStyle(
            color: Color(0xFF9B6F74),
            fontSize: 8,
            height: 1.6,
          ),
        ),
      ],
    ),
  );
}

class _GrowthContributionView extends StatelessWidget {
  const _GrowthContributionView();

  static const factors = [
    ('履约记录', '35%', 82, '交付、版本、时效与 Contract 完成情况'),
    ('协作稳定性', '25%', 76, '成员确认、持续协作与争议处理'),
    ('贡献可信度', '25%', 71, '归因、反作弊与品牌批准证据'),
    ('风险与合规', '15%', 88, '身份、权限与风险记录'),
  ];

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      const _GrowthHero(
        eyebrow: 'CONTRIBUTION LEDGER · 前端演示',
        title: '贡献来自可验证结果',
        body: '创作、分发、运营和验证行为只有在 Campaign Contract 范围内形成证据，才可能进入正式贡献与结算流程。',
      ),
      const _GrowthSectionTitle('信用分计算因子'),
      ...factors.map(
        (factor) => Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: _CreditFactorCard(factor.$1, factor.$2, factor.$3, factor.$4),
        ),
      ),
      const _NetworkNote(
        '信用分范围为 300–900；只采信已确认的成员关系、履约事件、贡献证据和风险记录。邀请人数、资产余额与原力高低不会直接增加信用分。',
      ),
      const _GrowthSectionTitle('贡献证据链'),
      const _Chain(),
      const _GrowthSectionTitle('最近记录'),
      const _Record('Playable 版本交付', 'Campaign Contract v2 · 等待服务端证据', '本地演示'),
      const _Record('社区分发协作', 'KOL 专属链接 · 归因待确认', '待核验'),
      const _Record('归因与反作弊复核', '去重、地区、窗口与异常流量', '规划中'),
      const SizedBox(height: 14),
      const _TierCard('AIP', 'AIP · 行为积分', '中心化记录经验证的站内互动贡献，不支持提现，也不等于收入。'),
      const SizedBox(height: 8),
      const _TierCard(
        'AIT',
        'AIT · Campaign 权益',
        '仅在获批 Campaign 中记录参与权益或创作者收益资格；不承诺固定价格或通用兑换。',
      ),
      const SizedBox(height: 14),
      const _BoundaryCard(
        title: '结算边界',
        note:
            '成员贡献、节点公共池和 KOL 服务费应使用独立账本。正式金额必须来自获批 Campaign Contract、服务器事件、反作弊复核、成员签署与权威结算记录。',
      ),
    ],
  );
}

class _GrowthRulesView extends StatelessWidget {
  const _GrowthRulesView();
  static const rules = [
    ('01', '五人成节点', '最小协作节点由 5 位不同用户构成，每位成员通过邀请接受后加入；至少覆盖创作、分发与运营能力。'),
    ('02', '一人一个主要经济节点', '用户可参与公开协作，但只能选择一个主要经济节点承接正式资格与结算关系。'),
    ('03', '邀请不产生奖励', '不因邀请、凑满人数或层级扩张自动获得 Token、固定收益、返佣或结算资格。'),
    ('04', '经济权限需要额外门槛', 'KYC、钱包、成员签署、获批 Campaign Contract、服务端审核与链上确认缺一不可。'),
    (
      '05',
      '信用分达到 650 才能申请经济节点',
      '信用分采用 300–900 分区间，由履约记录 35%、协作稳定性 25%、贡献可信度 25%、风险与合规 15% 共同计算。',
    ),
    ('06', '贡献以证据为准', '只有完成交付、有效分发、归因结果、运营优化与验证复核等可证明贡献才进入评估。'),
    ('07', '支持暂停、退出与申诉', '异常、争议或风险触发暂停；退出需处理未完成 Contract，申诉由人工与证据共同复核。'),
  ];

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      const _GrowthHero(
        eyebrow: 'NODE CHARTER · 产品规则',
        title: '先建立可信协作，\n再申请经济权限。',
      ),
      const SizedBox(height: 14),
      ...rules.map(
        (rule) => Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: _RuleCard(rule.$1, rule.$2, rule.$3),
        ),
      ),
      const _GrowthSectionTitle('节点生命周期'),
      const _Lifecycle(),
      const SizedBox(height: 14),
      const _BoundaryCard(
        title: '风险声明',
        note:
            '增长网络是 Airvana 的产品叙事与目标架构，并非已经部署的公链、DeFi 协议或投资产品。信用分只用于平台协作可信度评估，不是金融征信、借贷评分、Token 价格或收益承诺。',
      ),
    ],
  );
}

class _GrowthHero extends StatelessWidget {
  const _GrowthHero({required this.eyebrow, required this.title, this.body});
  final String eyebrow;
  final String title;
  final String? body;
  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(24),
      gradient: const LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Colors.white, Color(0xFFFFE5E8)],
      ),
      border: Border.all(color: const Color(0xFFFFD6DA)),
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          eyebrow,
          style: const TextStyle(
            color: Color(0xFFC62836),
            fontSize: 9,
            fontWeight: FontWeight.w900,
            letterSpacing: .8,
          ),
        ),
        const SizedBox(height: 10),
        Text(
          title,
          style: const TextStyle(
            fontSize: 25,
            height: 1.16,
            fontWeight: FontWeight.w900,
          ),
        ),
        if (body != null) ...[
          const SizedBox(height: 9),
          Text(body!, style: _bodyStyle),
        ],
      ],
    ),
  );
}

class _CreditFactorCard extends StatelessWidget {
  const _CreditFactorCard(this.label, this.weight, this.value, this.desc);
  final String label;
  final String weight;
  final int value;
  final String desc;
  @override
  Widget build(BuildContext context) => _GrowthCard(
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              width: 34,
              height: 34,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: const Color(0xFFFFF1F2),
                borderRadius: BorderRadius.circular(11),
              ),
              child: const Text(
                '◇',
                style: TextStyle(color: AirvanaColors.accent, fontSize: 18),
              ),
            ),
            const SizedBox(width: 9),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label,
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const Text(
                    '信用因子',
                    style: TextStyle(fontSize: 8, color: AirvanaColors.muted),
                  ),
                ],
              ),
            ),
            Text(
              '$weight 权重',
              style: const TextStyle(
                color: Color(0xFFC62836),
                fontSize: 9,
                fontWeight: FontWeight.w900,
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Text(
          '$value / 100  当前表现',
          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800),
        ),
        const SizedBox(height: 7),
        ClipRRect(
          borderRadius: BorderRadius.circular(99),
          child: LinearProgressIndicator(
            value: value / 100,
            minHeight: 5,
            color: AirvanaColors.accent,
            backgroundColor: const Color(0xFFF1F1F6),
          ),
        ),
        const SizedBox(height: 7),
        Text(
          desc,
          style: const TextStyle(color: Color(0xFF636366), fontSize: 8.5),
        ),
      ],
    ),
  );
}

class _NetworkNote extends StatelessWidget {
  const _NetworkNote(this.text);
  final String text;
  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: const Color(0xFFF7F7FA),
      borderRadius: BorderRadius.circular(14),
    ),
    child: Text(
      text,
      style: const TextStyle(
        color: AirvanaColors.muted,
        fontSize: 8.5,
        height: 1.55,
      ),
    ),
  );
}

class _Chain extends StatelessWidget {
  const _Chain();
  @override
  Widget build(BuildContext context) => _GrowthCard(
    padding: const EdgeInsets.all(12),
    child: const Wrap(
      alignment: WrapAlignment.center,
      crossAxisAlignment: WrapCrossAlignment.center,
      spacing: 6,
      runSpacing: 6,
      children: [
        _FlywheelStep('成员动作'),
        _Arrow(),
        _FlywheelStep('事件记录'),
        _Arrow(),
        _FlywheelStep('归因与反作弊'),
        _Arrow(),
        _FlywheelStep('品牌/平台批准'),
        _Arrow(),
        _FlywheelStep('合约结算'),
      ],
    ),
  );
}

class _Record extends StatelessWidget {
  const _Record(this.title, this.meta, this.status);
  final String title;
  final String meta;
  final String status;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(vertical: 11),
    decoration: const BoxDecoration(
      border: Border(bottom: BorderSide(color: AirvanaColors.line)),
    ),
    child: Row(
      children: [
        const Text(
          '◇',
          style: TextStyle(color: AirvanaColors.accent, fontSize: 18),
        ),
        const SizedBox(width: 9),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                meta,
                style: const TextStyle(color: AirvanaColors.muted, fontSize: 8),
              ),
            ],
          ),
        ),
        Text(
          status,
          style: const TextStyle(
            color: Color(0xFFC62836),
            fontSize: 8,
            fontWeight: FontWeight.w800,
          ),
        ),
      ],
    ),
  );
}

class _TierCard extends StatelessWidget {
  const _TierCard(this.icon, this.title, this.desc);
  final String icon;
  final String title;
  final String desc;
  @override
  Widget build(BuildContext context) => _GrowthCard(
    child: Row(
      children: [
        Container(
          width: 48,
          height: 48,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: const Color(0xFFFFF1F2),
            borderRadius: BorderRadius.circular(15),
          ),
          child: Text(
            icon,
            style: const TextStyle(
              color: AirvanaColors.accent,
              fontSize: 11,
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                desc,
                style: const TextStyle(
                  color: Color(0xFF636366),
                  fontSize: 8.5,
                  height: 1.55,
                ),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}

class _RuleCard extends StatelessWidget {
  const _RuleCard(this.number, this.title, this.body);
  final String number;
  final String title;
  final String body;
  @override
  Widget build(BuildContext context) => _GrowthCard(
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          width: 32,
          height: 32,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: const Color(0xFFFFF1F2),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(
            number,
            style: const TextStyle(
              color: AirvanaColors.accent,
              fontSize: 9,
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
        const SizedBox(width: 11),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 5),
              Text(body, style: _bodyStyle),
            ],
          ),
        ),
      ],
    ),
  );
}

class _Lifecycle extends StatelessWidget {
  const _Lifecycle();
  @override
  Widget build(BuildContext context) => _GrowthCard(
    padding: const EdgeInsets.all(12),
    child: const Wrap(
      alignment: WrapAlignment.center,
      crossAxisAlignment: WrapCrossAlignment.center,
      spacing: 6,
      runSpacing: 6,
      children: [
        _FlywheelStep('招募中'),
        _Arrow(),
        _FlywheelStep('待成员确认'),
        _Arrow(),
        _FlywheelStep('已组成'),
        _Arrow(),
        _FlywheelStep('试运行'),
        _Arrow(),
        _FlywheelStep('待身份验证'),
        _Arrow(),
        _FlywheelStep('待合约签署'),
        _Arrow(),
        _FlywheelStep('运行中'),
      ],
    ),
  );
}

class _GrowthLocalCircle extends StatelessWidget {
  const _GrowthLocalCircle();
  @override
  Widget build(BuildContext context) => Column(
    children: [
      _GrowthCard(
        key: const ValueKey('growth-network-local-circle'),
        child: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '我的 Agent 协作组',
              style: TextStyle(
                color: Color(0xFFC62836),
                fontSize: 9,
                fontWeight: FontWeight.w900,
              ),
            ),
            SizedBox(height: 5),
            Text(
              'Kai Agent Circle',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w900),
            ),
            SizedBox(height: 4),
            Text(
              '协作编号 AIR-NODE-4821 · 1/5 已确认',
              style: TextStyle(color: AirvanaColors.muted, fontSize: 9),
            ),
          ],
        ),
      ),
      const SizedBox(height: 10),
      const _GrowthCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('五个协作角色', style: _titleStyle),
            SizedBox(height: 10),
            _MemberRow('1', 'Kai Chen', '发起人 · 创作与运营', '已确认'),
            _MemberRow('2', '等待成员', '内容与创意', '待邀请'),
            _MemberRow('3', '等待成员', '社区与分发', '待邀请'),
            _MemberRow('4', '等待成员', '运营与归因', '待邀请'),
            _MemberRow('5', '等待成员', '审核与合规', '待邀请'),
          ],
        ),
      ),
      const SizedBox(height: 10),
      const _NetworkNote('暂停、退出和申诉在当前版本仅保存本地意向，不会修改真实成员关系、服务端资格、合约或资产。'),
    ],
  );
}

class _MemberRow extends StatelessWidget {
  const _MemberRow(this.index, this.name, this.role, this.status);
  final String index;
  final String name;
  final String role;
  final String status;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 8),
    child: Row(
      children: [
        CircleAvatar(
          radius: 16,
          backgroundColor: const Color(0xFFFFF1F2),
          child: Text(
            index,
            style: const TextStyle(
              color: AirvanaColors.accent,
              fontSize: 9,
              fontWeight: FontWeight.w900,
            ),
          ),
        ),
        const SizedBox(width: 9),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                name,
                style: const TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                ),
              ),
              Text(
                role,
                style: const TextStyle(color: AirvanaColors.muted, fontSize: 8),
              ),
            ],
          ),
        ),
        Text(
          status,
          style: const TextStyle(
            color: Color(0xFF147542),
            fontSize: 8,
            fontWeight: FontWeight.w800,
          ),
        ),
      ],
    ),
  );
}

class _GrowthCard extends StatelessWidget {
  const _GrowthCard({
    required this.child,
    this.padding = const EdgeInsets.all(15),
    super.key,
  });
  final Widget child;
  final EdgeInsets padding;
  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: padding,
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(18),
      border: Border.all(color: AirvanaColors.line),
    ),
    child: child,
  );
}

class _GrowthAction extends StatelessWidget {
  const _GrowthAction({
    required this.label,
    required this.onTap,
    this.primary = false,
    super.key,
  });
  final String label;
  final VoidCallback onTap;
  final bool primary;
  @override
  Widget build(BuildContext context) => SizedBox(
    width: double.infinity,
    height: 48,
    child: primary
        ? FilledButton(
            onPressed: onTap,
            style: AirvanaButtonStyles.primary(),
            child: Text(
              label,
              style: const TextStyle(fontWeight: FontWeight.w900),
            ),
          )
        : OutlinedButton(
            onPressed: onTap,
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: AirvanaColors.line),
              foregroundColor: AirvanaColors.ink,
            ),
            child: Text(
              label,
              style: const TextStyle(fontWeight: FontWeight.w900),
            ),
          ),
  );
}
