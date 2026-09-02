import 'package:airvana_mobile/features/shared/domain/airvana_models.dart';
import 'package:flutter/material.dart';

enum GeneratedGameKind {
  shop,
  io,
  deck,
  defense,
  journey,
  detective,
  hex,
  wardrobe,
  match,
}

class GeneratedGameProfile {
  const GeneratedGameProfile({
    required this.playableId,
    required this.kind,
    required this.eyebrow,
    required this.intro,
    required this.startLabel,
    required this.successTitle,
    required this.failureTitle,
    required this.prompts,
    required this.choices,
    required this.targets,
    required this.choiceIcons,
    required this.accent,
    required this.secondary,
    required this.surface,
    required this.correctFeedback,
    required this.wrongFeedback,
  });

  final String playableId;
  final GeneratedGameKind kind;
  final String eyebrow;
  final String intro;
  final String startLabel;
  final String successTitle;
  final String failureTitle;
  final List<String> prompts;
  final List<String> choices;
  final List<int> targets;
  final List<IconData> choiceIcons;
  final Color accent;
  final Color secondary;
  final Color surface;
  final String correctFeedback;
  final String wrongFeedback;

  int get rounds => prompts.length;
  int get successThreshold => (rounds * .67).ceil();

  String promptForRound(int round) => prompts[(round - 1) % prompts.length];
  int targetForRound(int round) => targets[(round - 1) % targets.length];
}

const generatedGameProfiles = <String, GeneratedGameProfile>{
  'plb_moonlight_tea_shop': GeneratedGameProfile(
    playableId: 'plb_moonlight_tea_shop',
    kind: GeneratedGameKind.shop,
    eyebrow: 'LOCAL DEMO · 四步订单经营',
    intro: '读取月光订单，依次完成茶底、奶量、配料与封杯。每一步都可失败并立即重试。',
    startLabel: '开始营业',
    successTitle: '月光订单制作完成',
    failureTitle: '订单超时需要重做',
    prompts: [
      '订单第 1 步：先加入乌龙茶底',
      '订单第 2 步：调整七分奶与甜度',
      '订单第 3 步：加入芋圆配料',
      '订单第 4 步：检查杯身并封杯',
    ],
    choices: ['加入茶底', '奶量与配料', '检查并封杯'],
    targets: [0, 1, 1, 2],
    choiceIcons: [
      Icons.emoji_food_beverage,
      Icons.bubble_chart,
      Icons.local_drink,
    ],
    accent: Color(0xFF4C9389),
    secondary: Color(0xFFD9A46A),
    surface: Color(0xFF203633),
    correctFeedback: '制作正确 · 订单进入下一步',
    wrongFeedback: '顺序不符 · 顾客耐心减少 1 格',
  ),
  'plb_microbe_arena': GeneratedGameProfile(
    playableId: 'plb_microbe_arena',
    kind: GeneratedGameKind.io,
    eyebrow: 'LOCAL DEMO · 三阶段 IO 竞技',
    intro: '拖动微粒吞噬更小的营养粒，观察危险提示并避开更大的本地机器人。',
    startLabel: '进入培养皿',
    successTitle: '微粒完成安全进化',
    failureTitle: '微粒被大型细胞吞噬',
    prompts: ['右侧营养粒更小：向右吞噬并成长', '左侧红色巨细胞逼近：立即绕开', '能量泡进入安全区：停留并吸收'],
    choices: ['吞噬小粒', '绕开巨细胞', '吸收能量泡'],
    targets: [0, 1, 2],
    choiceIcons: [Icons.bubble_chart, Icons.turn_left, Icons.auto_awesome],
    accent: Color(0xFF35D6CF),
    secondary: Color(0xFFFF745E),
    surface: Color(0xFF123B3C),
    correctFeedback: '移动有效 · 体型与能量已更新',
    wrongFeedback: '碰到危险目标 · 失去 1 格生命',
  ),
  'plb_star_deck': GeneratedGameProfile(
    playableId: 'plb_star_deck',
    kind: GeneratedGameKind.deck,
    eyebrow: 'LOCAL DEMO · 回合牌组战术',
    intro: '读取敌方意图，在攻击、护盾和蓄力之间做出连续三回合决策。',
    startLabel: '开始牌局',
    successTitle: '星轨牌阵获胜',
    failureTitle: '能量核心被击穿',
    prompts: ['敌方准备强攻：本回合先建立护盾', '敌方进入防守：蓄力积攒能量', '敌方护盾破裂：打出攻击完成收尾'],
    choices: ['星刃攻击', '护盾防御', '能量蓄力'],
    targets: [1, 2, 0],
    choiceIcons: [Icons.bolt, Icons.shield, Icons.auto_awesome],
    accent: Color(0xFF7C66F2),
    secondary: Color(0xFFE7B95B),
    surface: Color(0xFF211A39),
    correctFeedback: '卡牌生效 · 攻防节奏正确',
    wrongFeedback: '卡牌时机错误 · 失去 1 格生命',
  ),
  'plb_crystal_bastion': GeneratedGameProfile(
    playableId: 'plb_crystal_bastion',
    kind: GeneratedGameKind.defense,
    eyebrow: 'LOCAL DEMO · 三线晶塔防守',
    intro: '读取来袭警报，在左、中、右三条路径启动对应晶塔并管理能量。',
    startLabel: '启动晶核防线',
    successTitle: '三线石门防守成功',
    failureTitle: '晶核防线被突破',
    prompts: ['右路出现重甲怪物：启动右线晶塔', '左路出现高速单位：切换左线晶塔', '中路首领进入射程：集中中线火力'],
    choices: ['左线晶塔', '中线晶塔', '右线晶塔'],
    targets: [2, 0, 1],
    choiceIcons: [Icons.looks_one, Icons.looks_two, Icons.looks_3],
    accent: Color(0xFF5ED2D0),
    secondary: Color(0xFFD2A754),
    surface: Color(0xFF203638),
    correctFeedback: '晶塔锁定 · 当前波次已拦截',
    wrongFeedback: '防线选择错误 · 石门耐久下降',
  ),
  'plb_adventurer_journal': GeneratedGameProfile(
    playableId: 'plb_adventurer_journal',
    kind: GeneratedGameKind.journey,
    eyebrow: 'LOCAL DEMO · 分支旅程',
    intro: '在雾林、镜湖与观星台之间权衡生命、补给和士气，完成三段安全路线。',
    startLabel: '翻开冒险日志',
    successTitle: '冒险日志完成',
    failureTitle: '远征资源耗尽',
    prompts: ['补给低于安全线：先扎营恢复', '雾气短暂散开：穿越雾林捷径', '星图已经完整：登上观星台完成旅程'],
    choices: ['穿越雾林', '扎营补给', '登观星台'],
    targets: [1, 0, 2],
    choiceIcons: [Icons.forest, Icons.cabin, Icons.stars],
    accent: Color(0xFF73B7A8),
    secondary: Color(0xFFE4B25B),
    surface: Color(0xFF26382F),
    correctFeedback: '路线有效 · 资源状态保持安全',
    wrongFeedback: '路线风险过高 · 失去 1 格生命',
  ),
  'plb_idiom_detective': GeneratedGameProfile(
    playableId: 'plb_idiom_detective',
    kind: GeneratedGameKind.detective,
    eyebrow: 'LOCAL DEMO · 语言线索推理',
    intro: '核对证词、物证和字义线索，为三份案卷选择符合语义的成语。',
    startLabel: '开始调查',
    successTitle: '三份案卷全部侦破',
    failureTitle: '线索推理出现矛盾',
    prompts: ['线索：遮挡散去，真相突然清楚', '线索：等待偶然收获，却没有主动行动', '线索：多做一步，反而破坏原本结果'],
    choices: ['拨云见日', '画蛇添足', '守株待兔'],
    targets: [0, 2, 1],
    choiceIcons: [Icons.light_mode, Icons.edit_note, Icons.hourglass_bottom],
    accent: Color(0xFFCF835D),
    secondary: Color(0xFFE6C76B),
    surface: Color(0xFF3A2D28),
    correctFeedback: '语义吻合 · 新证据已归档',
    wrongFeedback: '语义冲突 · 失去 1 次判断机会',
  ),
  'plb_hex_frontier': GeneratedGameProfile(
    playableId: 'plb_hex_frontier',
    kind: GeneratedGameKind.hex,
    eyebrow: 'LOCAL DEMO · 六角节点战术',
    intro: '管理三点行动力，让侦察、守卫与工兵依次控制全部前哨节点。',
    startLabel: '进入六角前线',
    successTitle: '全部前哨已控制',
    failureTitle: '行动力耗尽',
    prompts: ['未知区域尚未揭示：先派侦察单位', '敌军准备反扑：守卫中枢节点', '资源点已经安全：派工兵完成占领'],
    choices: ['侦察前哨', '守卫中枢', '工兵占点'],
    targets: [0, 1, 2],
    choiceIcons: [Icons.visibility, Icons.shield, Icons.engineering],
    accent: Color(0xFF6FA5D8),
    secondary: Color(0xFFE1B75D),
    surface: Color(0xFF213043),
    correctFeedback: '行动有效 · 地图控制率提升',
    wrongFeedback: '行动顺序错误 · 失去 1 点行动力',
  ),
  'plb_studio_wardrobe': GeneratedGameProfile(
    playableId: 'plb_studio_wardrobe',
    kind: GeneratedGameKind.wardrobe,
    eyebrow: 'LOCAL DEMO · 三场景造型',
    intro: '根据通勤、晚餐与周末场景，从本地素材中完成三套造型搭配。',
    startLabel: '进入造型室',
    successTitle: '今日造型册完成',
    failureTitle: '造型不符合场景要求',
    prompts: ['场景：正式通勤，需要利落和低饱和', '场景：晚餐聚会，需要精致层次', '场景：户外周末，需要轻便与活动空间'],
    choices: ['轻便通勤', '优雅晚餐', '户外周末'],
    targets: [0, 1, 2],
    choiceIcons: [Icons.business_center, Icons.dinner_dining, Icons.hiking],
    accent: Color(0xFFD28E86),
    secondary: Color(0xFFC9A46B),
    surface: Color(0xFF3B2D2D),
    correctFeedback: '搭配符合场景 · 造型已保存',
    wrongFeedback: '风格不匹配 · 失去 1 次修改机会',
  ),
  'plb_garden_renewal': GeneratedGameProfile(
    playableId: 'plb_garden_renewal',
    kind: GeneratedGameKind.match,
    eyebrow: 'LOCAL DEMO · 三消庭院焕新',
    intro: '交换花砖、制造连锁，并把三阶段收集结果转化为庭院修复进度。',
    startLabel: '开始花园焕新',
    successTitle: '庭院焕新完成',
    failureTitle: '本轮收集目标未完成',
    prompts: ['高亮花砖已经相邻：先交换形成三连', '连锁能量已满：触发花瓣连锁', '材料收集完成：修复中央庭院'],
    choices: ['交换花砖', '触发连锁', '修复庭院'],
    targets: [0, 1, 2],
    choiceIcons: [Icons.swap_horiz, Icons.auto_awesome, Icons.park],
    accent: Color(0xFF7FC86A),
    secondary: Color(0xFFE995A8),
    surface: Color(0xFF263A2A),
    correctFeedback: '花砖连锁成功 · 修复进度提升',
    wrongFeedback: '没有形成有效组合 · 失去 1 次机会',
  ),
};

GeneratedGameProfile? generatedGameProfileFor(String playableId) =>
    generatedGameProfiles[playableId];

class GeneratedGameScene extends StatelessWidget {
  const GeneratedGameScene({
    super.key,
    required this.playable,
    required this.profile,
    required this.round,
    required this.targetChoice,
    required this.onChoice,
  });

  final Playable playable;
  final GeneratedGameProfile profile;
  final int round;
  final int targetChoice;
  final ValueChanged<int> onChoice;

  @override
  Widget build(BuildContext context) => Semantics(
    key: ValueKey('runtime-generated-scene-${profile.playableId}'),
    container: true,
    label: '${playable.title}专属玩法，第 $round 阶段',
    explicitChildNodes: true,
    child: ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: Stack(
        fit: StackFit.expand,
        children: [
          Image.asset(
            playable.coverAsset,
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => ColoredBox(color: profile.surface),
          ),
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  profile.surface.withValues(alpha: .42),
                  profile.surface.withValues(alpha: .96),
                ],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(10),
            child: Column(
              children: [
                Expanded(child: _interactiveIllustration()),
                Container(
                  width: double.infinity,
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 7,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xCC080B0D),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white24),
                  ),
                  child: Text(
                    profile.promptForRound(round),
                    textAlign: TextAlign.center,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 9,
                      height: 1.35,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                ),
                Row(
                  children: [
                    for (var index = 0; index < profile.choices.length; index++)
                      Expanded(
                        child: Padding(
                          padding: EdgeInsets.only(
                            right: index == profile.choices.length - 1 ? 0 : 6,
                          ),
                          child: _GeneratedActionCard(
                            key: ValueKey(
                              'runtime-generated-choice-${profile.playableId}-$index',
                            ),
                            label: profile.choices[index],
                            icon: profile.choiceIcons[index],
                            highlighted: index == targetChoice,
                            accent: profile.accent,
                            onTap: () => onChoice(index),
                          ),
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    ),
  );

  Widget _illustration() => switch (profile.kind) {
    GeneratedGameKind.shop => _ShopIllustration(round: round, profile: profile),
    GeneratedGameKind.io => _IoIllustration(round: round, profile: profile),
    GeneratedGameKind.deck => _DeckIllustration(round: round, profile: profile),
    GeneratedGameKind.defense => _DefenseIllustration(
      targetChoice: targetChoice,
      profile: profile,
    ),
    GeneratedGameKind.journey => _JourneyIllustration(
      round: round,
      profile: profile,
    ),
    GeneratedGameKind.detective => _DetectiveIllustration(
      round: round,
      profile: profile,
    ),
    GeneratedGameKind.hex => _HexIllustration(round: round, profile: profile),
    GeneratedGameKind.wardrobe => _WardrobeIllustration(
      round: round,
      profile: profile,
    ),
    GeneratedGameKind.match => _MatchIllustration(
      round: round,
      profile: profile,
    ),
  };

  Widget _interactiveIllustration() {
    final illustration = _illustration();
    if (profile.kind != GeneratedGameKind.io) return illustration;
    return Semantics(
      label: '微粒竞技场拖动区域：向右吞噬，向左闪避，点按吸收',
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () => onChoice(2),
        onHorizontalDragEnd: (details) {
          final velocity = details.primaryVelocity ?? 0;
          if (velocity > 180) {
            onChoice(0);
          } else if (velocity < -180) {
            onChoice(1);
          } else {
            onChoice(2);
          }
        },
        child: illustration,
      ),
    );
  }
}

class _GeneratedActionCard extends StatelessWidget {
  const _GeneratedActionCard({
    super.key,
    required this.label,
    required this.icon,
    required this.highlighted,
    required this.accent,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final bool highlighted;
  final Color accent;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Semantics(
    button: true,
    label: '$label${highlighted ? '，当前目标' : ''}',
    child: Material(
      color: highlighted ? accent : const Color(0xE6171A1D),
      borderRadius: BorderRadius.circular(13),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(13),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          height: 62,
          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 7),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(13),
            border: Border.all(
              color: highlighted ? Colors.white : Colors.white24,
              width: highlighted ? 2 : 1,
            ),
            boxShadow: highlighted
                ? [
                    BoxShadow(
                      color: accent.withValues(alpha: .55),
                      blurRadius: 12,
                    ),
                  ]
                : null,
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: Colors.white, size: 20),
              const SizedBox(height: 4),
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 8,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

class _ShopIllustration extends StatelessWidget {
  const _ShopIllustration({required this.round, required this.profile});
  final int round;
  final GeneratedGameProfile profile;

  @override
  Widget build(BuildContext context) => Center(
    child: Container(
      constraints: const BoxConstraints(maxWidth: 280),
      padding: const EdgeInsets.all(12),
      decoration: _panelDecoration(),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Icon(Icons.receipt_long, color: profile.secondary, size: 20),
              const SizedBox(width: 7),
              const Expanded(
                child: Text(
                  '月光订单 #018',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              Text(
                '¥ DEMO',
                style: TextStyle(color: profile.accent, fontSize: 9),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              for (var index = 0; index < 4; index++)
                _StepOrb(
                  icon: [
                    Icons.emoji_food_beverage,
                    Icons.water_drop,
                    Icons.bubble_chart,
                    Icons.local_drink,
                  ][index],
                  active: index == round - 1,
                  done: index < round - 1,
                  accent: profile.accent,
                ),
            ],
          ),
        ],
      ),
    ),
  );
}

class _IoIllustration extends StatelessWidget {
  const _IoIllustration({required this.round, required this.profile});
  final int round;
  final GeneratedGameProfile profile;

  @override
  Widget build(BuildContext context) => Stack(
    fit: StackFit.expand,
    children: [
      for (final data in const [
        (Alignment(-.72, -.45), 17.0),
        (Alignment(.7, -.25), 13.0),
        (Alignment(.5, .55), 10.0),
        (Alignment(-.55, .42), 11.0),
      ])
        Align(
          alignment: data.$1,
          child: _Cell(size: data.$2, color: profile.accent, icon: null),
        ),
      Align(
        alignment: round == 2
            ? const Alignment(-.58, .02)
            : const Alignment(.66, -.08),
        child: _Cell(
          size: 54,
          color: profile.secondary,
          icon: Icons.coronavirus,
        ),
      ),
      Align(
        alignment: Alignment(0, .15 - round * .08),
        child: _Cell(
          size: 72,
          color: profile.accent,
          icon: Icons.sentiment_satisfied_alt,
        ),
      ),
      Positioned(
        top: 6,
        left: 6,
        child: _MiniStatus(
          label: '体型 ${24 + round * 7}',
          color: profile.accent,
        ),
      ),
      Positioned(
        top: 6,
        right: 6,
        child: _MiniStatus(
          label: '能量 ${35 + round * 18}%',
          color: profile.secondary,
        ),
      ),
    ],
  );
}

class _DeckIllustration extends StatelessWidget {
  const _DeckIllustration({required this.round, required this.profile});
  final int round;
  final GeneratedGameProfile profile;

  @override
  Widget build(BuildContext context) => Column(
    mainAxisAlignment: MainAxisAlignment.center,
    children: [
      Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          _MiniStatus(label: '能量 ${round + 1}/4', color: profile.accent),
          const SizedBox(width: 6),
          _MiniStatus(
            label: '护盾 ${round == 1 ? 18 : 36}',
            color: profile.secondary,
          ),
        ],
      ),
      const SizedBox(height: 12),
      Container(
        width: 104,
        height: 76,
        decoration: _panelDecoration(),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              [
                Icons.flash_on_rounded,
                Icons.shield_moon,
                Icons.bolt,
              ][(round - 1) % 3],
              color: profile.secondary,
              size: 34,
            ),
            const Text(
              '敌方意图',
              style: TextStyle(color: Colors.white70, fontSize: 8),
            ),
          ],
        ),
      ),
    ],
  );
}

class _DefenseIllustration extends StatelessWidget {
  const _DefenseIllustration({
    required this.targetChoice,
    required this.profile,
  });
  final int targetChoice;
  final GeneratedGameProfile profile;

  @override
  Widget build(BuildContext context) => Row(
    children: [
      for (var lane = 0; lane < 3; lane++)
        Expanded(
          child: Container(
            margin: EdgeInsets.only(right: lane == 2 ? 0 : 7),
            decoration: BoxDecoration(
              color: const Color(0x99090D0F),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(
                color: lane == targetChoice ? profile.accent : Colors.white24,
                width: lane == targetChoice ? 2 : 1,
              ),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                Icon(
                  Icons.keyboard_double_arrow_down,
                  color: lane == targetChoice
                      ? profile.secondary
                      : Colors.white24,
                ),
                Icon(
                  Icons.coronavirus,
                  color: lane == targetChoice
                      ? profile.secondary
                      : Colors.white38,
                  size: lane == targetChoice ? 30 : 22,
                ),
                Icon(
                  Icons.castle,
                  color: lane == targetChoice ? profile.accent : Colors.white54,
                  size: 32,
                ),
              ],
            ),
          ),
        ),
    ],
  );
}

class _JourneyIllustration extends StatelessWidget {
  const _JourneyIllustration({required this.round, required this.profile});
  final int round;
  final GeneratedGameProfile profile;

  @override
  Widget build(BuildContext context) => Column(
    mainAxisAlignment: MainAxisAlignment.center,
    children: [
      Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          _MiniStatus(
            label: '生命 ${100 - (round - 1) * 12}',
            color: profile.accent,
          ),
          const SizedBox(width: 5),
          _MiniStatus(label: '补给 ${42 + round * 8}', color: profile.secondary),
          const SizedBox(width: 5),
          _MiniStatus(label: '士气 ${58 + round * 6}', color: profile.accent),
        ],
      ),
      const SizedBox(height: 16),
      Row(
        children: [
          for (var index = 0; index < 3; index++) ...[
            Expanded(
              child: _StepOrb(
                icon: [Icons.forest, Icons.cabin, Icons.stars][index],
                active: index == round - 1,
                done: index < round - 1,
                accent: profile.accent,
              ),
            ),
            if (index != 2)
              Expanded(
                child: Divider(
                  color: index < round - 1 ? profile.accent : Colors.white24,
                  thickness: 2,
                ),
              ),
          ],
        ],
      ),
    ],
  );
}

class _DetectiveIllustration extends StatelessWidget {
  const _DetectiveIllustration({required this.round, required this.profile});
  final int round;
  final GeneratedGameProfile profile;

  @override
  Widget build(BuildContext context) => Center(
    child: Transform.rotate(
      angle: -.025,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 260),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFFF5EBD4),
          borderRadius: BorderRadius.circular(9),
          boxShadow: const [BoxShadow(color: Colors.black45, blurRadius: 12)],
        ),
        child: Row(
          children: [
            Icon(Icons.manage_search, size: 42, color: profile.surface),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '案卷 0$round',
                    style: TextStyle(
                      color: profile.surface,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    profile.promptForRound(round),
                    style: TextStyle(
                      color: profile.surface,
                      fontSize: 9,
                      height: 1.35,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    ),
  );
}

class _HexIllustration extends StatelessWidget {
  const _HexIllustration({required this.round, required this.profile});
  final int round;
  final GeneratedGameProfile profile;

  @override
  Widget build(BuildContext context) => Center(
    child: Wrap(
      spacing: -3,
      runSpacing: -9,
      alignment: WrapAlignment.center,
      children: [
        for (var index = 0; index < 9; index++)
          SizedBox(
            width: 55,
            height: 55,
            child: Icon(
              Icons.hexagon,
              size: 51,
              color: index < round * 2
                  ? profile.accent
                  : index == round * 2
                  ? profile.secondary
                  : const Color(0x884B5563),
              shadows: const [Shadow(color: Colors.black54, blurRadius: 6)],
            ),
          ),
      ],
    ),
  );
}

class _WardrobeIllustration extends StatelessWidget {
  const _WardrobeIllustration({required this.round, required this.profile});
  final int round;
  final GeneratedGameProfile profile;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisAlignment: MainAxisAlignment.center,
    children: [
      Container(
        width: 92,
        height: 126,
        decoration: BoxDecoration(
          color: const Color(0xE6F6E9E4),
          borderRadius: const BorderRadius.vertical(
            top: Radius.circular(46),
            bottom: Radius.circular(18),
          ),
          border: Border.all(color: profile.secondary, width: 2),
        ),
        child: Icon(
          [Icons.business_center, Icons.dinner_dining, Icons.hiking][round - 1],
          color: profile.surface,
          size: 44,
        ),
      ),
      const SizedBox(width: 12),
      Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          for (final color in [
            profile.accent,
            profile.secondary,
            const Color(0xFFF4E5D0),
          ])
            Container(
              width: 42,
              height: 28,
              margin: const EdgeInsets.symmetric(vertical: 4),
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(9),
                border: Border.all(color: Colors.white54),
              ),
            ),
        ],
      ),
    ],
  );
}

class _MatchIllustration extends StatelessWidget {
  const _MatchIllustration({required this.round, required this.profile});
  final int round;
  final GeneratedGameProfile profile;

  @override
  Widget build(BuildContext context) {
    const icons = [
      Icons.local_florist,
      Icons.eco,
      Icons.filter_vintage,
      Icons.spa,
    ];
    final colors = [
      profile.accent,
      profile.secondary,
      const Color(0xFF9F7AEA),
      const Color(0xFFFFD166),
    ];
    return Center(
      child: SizedBox(
        width: 190,
        height: 150,
        child: GridView.builder(
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 4,
            crossAxisSpacing: 5,
            mainAxisSpacing: 5,
          ),
          itemCount: 12,
          itemBuilder: (_, index) {
            final type = (index + round) % 4;
            final highlighted = index >= round * 2 && index < round * 2 + 3;
            return Container(
              decoration: BoxDecoration(
                color: colors[type],
                borderRadius: BorderRadius.circular(9),
                border: Border.all(
                  color: highlighted ? Colors.white : Colors.white24,
                  width: highlighted ? 2 : 1,
                ),
                boxShadow: highlighted
                    ? [BoxShadow(color: colors[type], blurRadius: 8)]
                    : null,
              ),
              child: Icon(icons[type], color: Colors.white, size: 19),
            );
          },
        ),
      ),
    );
  }
}

class _Cell extends StatelessWidget {
  const _Cell({required this.size, required this.color, required this.icon});
  final double size;
  final Color color;
  final IconData? icon;

  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(
      color: color,
      shape: BoxShape.circle,
      border: Border.all(color: Colors.white70, width: 2),
      boxShadow: [
        BoxShadow(color: color.withValues(alpha: .65), blurRadius: 14),
      ],
    ),
    alignment: Alignment.center,
    child: icon == null
        ? null
        : Icon(icon, color: Colors.white, size: size * .48),
  );
}

class _StepOrb extends StatelessWidget {
  const _StepOrb({
    required this.icon,
    required this.active,
    required this.done,
    required this.accent,
  });
  final IconData icon;
  final bool active;
  final bool done;
  final Color accent;

  @override
  Widget build(BuildContext context) => AnimatedContainer(
    duration: const Duration(milliseconds: 180),
    width: 42,
    height: 42,
    decoration: BoxDecoration(
      color: done || active ? accent : const Color(0x33222222),
      shape: BoxShape.circle,
      border: Border.all(
        color: active ? Colors.white : Colors.white24,
        width: active ? 2 : 1,
      ),
      boxShadow: active
          ? [BoxShadow(color: accent.withValues(alpha: .55), blurRadius: 12)]
          : null,
    ),
    child: Icon(done ? Icons.check : icon, color: Colors.white, size: 21),
  );
}

class _MiniStatus extends StatelessWidget {
  const _MiniStatus({required this.label, required this.color});
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
    decoration: BoxDecoration(
      color: const Color(0xCC080B0D),
      borderRadius: BorderRadius.circular(99),
      border: Border.all(color: color.withValues(alpha: .8)),
    ),
    child: Text(
      label,
      style: const TextStyle(
        color: Colors.white,
        fontSize: 8,
        fontWeight: FontWeight.w800,
      ),
    ),
  );
}

BoxDecoration _panelDecoration() => BoxDecoration(
  color: const Color(0xD9111518),
  borderRadius: BorderRadius.circular(16),
  border: Border.all(color: Colors.white24),
  boxShadow: const [BoxShadow(color: Colors.black38, blurRadius: 14)],
);
