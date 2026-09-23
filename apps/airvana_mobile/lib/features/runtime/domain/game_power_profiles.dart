/// 15 个 arcade 作品的能力需求声明。
///
/// 这是撮合的另一半：[kPowerCatalog] 描述「宿主能提供什么」，这里描述
/// 「每个作品需要什么」。在此之前作品侧对此**零声明**，于是能力只能像
///  的 PROFILES 那样按 gameKey
/// 硬编码——每接一个作品手写一行，能力被绑死在作品上。
///
/// 声明用的是**控制语义**（要一路二维指针、30Hz、容忍 80ms）而不是具体能力
/// （要手势识别）。后者会把作品和某个能力焊死，正是要避免的。
///
/// 数据来自对每个作品源码的逐行核查，每条都附了代码依据。
library;

import '../../shared/domain/power_capability.dart';

/// 一个作品的能力需求与可注入程度。
class GamePowerProfile {
  const GamePowerProfile({
    required this.slug,
    required this.genre,
    required this.requirements,
    required this.injectable,
    required this.sealed,
  });

  final String slug;
  final String genre;
  final List<PowerRequirement> requirements;

  /// 宿主能否在**不改动作品包**的前提下把信号喂进去。
  final GameInjectable injectable;

  /// 是否受  的「不改动」承诺约束。
  ///
  /// manifest 只列了 13 个第三方作品；christmas-tree-gesture 与
  /// gesture-fruit-slice 是自研件，不在其中，允许改包。
  final bool sealed;
}

enum GameInjectable {
  /// 可合成标准事件驱动，无需改包。
  full,

  /// 部分可注入：离散动作能触发，但连续量或内部状态拿不到。
  partial,

  /// 无法在不改包的前提下注入。
  none,
}

const List<GamePowerProfile> kGamePowerProfiles = <GamePowerProfile>[
  GamePowerProfile(
    slug: 'christmas-tree-gesture',
    genre: '4 步定制向导 + 摄像头手势驱动的 3D 粒子圣诞树演示（贺卡/氛围类互动，无关卡、无分数、无胜负；7 个手势各自映射一种粒子效果：聚拢/爆散/旋转/缩放/星光/文案切换）',
    sealed: false,
    injectable: GameInjectable.partial,
    requirements: [
      // 核心玩法是 7 个离散手势事件 → 7 种粒子效果，不是连续量：app.js:4-12 的 gestures 表（one/two/three/pinch/fist/palm/swipe → spin/message/sparkle/zoom/tree/explode/swipe），最终都收敛到 ap
      PowerRequirement(control: PowerControl.trigger, dimensions: 1, minHz: 12, maxLatency: Duration(milliseconds: 300), optional: false),
      // 水平连续转向：app.js:176 `this.rotationTarget += (e.clientX - this.lastX) * .012` 是一维增量积分（clientY 被丢弃，所以不是 pointer/2D），消费端是 app.js:213 `this.rotation += (thi
      PowerRequirement(control: PowerControl.steer, dimensions: 1, minHz: 60, maxLatency: Duration(milliseconds: 50), optional: true),
      // 第二条独立的一维连续轴：缩放。两个入口都写死成标量——app.js:179 wheel 的 `- e.deltaY * .001`，app.js:182-186 双指捏合的 `zoomTarget * distance / pinchStart`，值域被 clamp 在 [.65, 1.45]；消费
      PowerRequirement(control: PowerControl.steer, dimensions: 1, minHz: 30, maxLatency: Duration(milliseconds: 80), optional: true),
    ],
  ),
  GamePowerProfile(
    slug: 'city-squad',
    genre: '3D 第三人称「算术门跑酷 + 队伍集结」射击：横向滑动控制小队在公路上左右走位，穿过 ×/÷/+/− 算术门增减人数，躲避电锯/铁锤障碍，自动向前开火清怪，限时内击败 Boss',
    sealed: true,
    injectable: GameInjectable.full,
    requirements: [
      // 这是本作的主操作，且明确是**连续模拟量**而非离散跑道。pointermove 把屏幕位移线性映射成世界坐标：const t=(a.clientX-I.x)/u("game").clientWidth*13.5; m.setTargetX(I.target+t)（美化 951-955 行 / 偏移
      PowerRequirement(control: PowerControl.steer, dimensions: 1, minHz: 30, maxLatency: Duration(milliseconds: 120), optional: false),
      // 算术门这一层的判定是**严格二值**的，跟连续走位是两套语义。_applyGate 第一行（美化 217 行 / 偏移 8257）：t.selected=this.playerX<0?"left":"right"，只看 playerX 的符号，随后 const{operation:e,value:s
      PowerRequirement(control: PowerControl.lane, dimensions: 1, minHz: 15, maxLatency: Duration(milliseconds: 200), optional: true),
      // 局内流程控制需要单点脉冲，但**开火不算**——射击是纯自动的：_step 里 this._shootTimer-=t, this._shootTimer<=0&&(this._shoot(),this._shootTimer+=(Z[this.weapon]||Z.rifle).interval)
      PowerRequirement(control: PowerControl.trigger, dimensions: 1, minHz: 10, maxLatency: Duration(milliseconds: 250), optional: true),
      // 营地/商店/转盘这一层是二维命中，跟战斗层的一维走位不是同一个需求。证据：u("modal").addEventListener("click",a=>{const t=a.target.closest("[data-action]"); ...})（美化 937-942 行）要在弹窗里点到具体按钮
      PowerRequirement(control: PowerControl.pointer, dimensions: 2, minHz: 20, maxLatency: Duration(milliseconds: 200), optional: true),
    ],
  ),
  GamePowerProfile(
    slug: 'coin-castle',
    genre: '3D 推金币（coin pusher）休闲街机：在台面横向选落点投币，靠往复推板把金币/宝石/礼盒/宝箱从前沿推落计分；每投 10 枚可放一次「强力推」。three.js 渲染，单',
    sealed: true,
    injectable: GameInjectable.full,
    requirements: [
      // 游戏真正消费的连续量只有一个标量 this.aim（横向落点），见 game-pWvtUfW6.js:3832:61688 `this.aim=ct.clamp(this.aimPoint.x,-3.8,3.8)` —— 射线打在台面平面后只取 .x，.z 被丢弃，所以 dimensions=1 而
      PowerRequirement(control: PowerControl.steer, dimensions: 1, minHz: 30, maxLatency: Duration(milliseconds: 120), optional: false),
      // 投币是一次离散脉冲，与瞄准正交：`drop()` 只读 this.aim、不读指针（game-pWvtUfW6.js:3832:62763 `this.physics.add(this.aim+(this.physics.random()-.5)*.12, ...)`）。minHz=8：drop 自
      PowerRequirement(control: PowerControl.trigger, dimensions: 1, minHz: 8, maxLatency: Duration(milliseconds: 150), optional: false),
      // 第二路离散触发：强力推。`boost(){this.state.energy<10||this.physics.boosted>0||this.paused||(...this.physics.boosted=4.7,this.state.boost=4.7...)}`（game-pWvtUfW6.
      PowerRequirement(control: PowerControl.trigger, dimensions: 1, minHz: 1, maxLatency: Duration(milliseconds: 500), optional: true),
      // 声明它不是因为游戏要二维，而是因为**注入面**天然是二维：aimAt 吃的是 `e.clientX/e.clientY` 加 `this.host.getBoundingClientRect()`（game-pWvtUfW6.js:3832:61444）。如果宿主侧的 Power 只能产出平面指针
      PowerRequirement(control: PowerControl.pointer, dimensions: 2, minHz: 30, maxLatency: Duration(milliseconds: 120), optional: true),
    ],
  ),
  GamePowerProfile(
    slug: 'coin-dozer',
    genre: '2.5D Canvas 推币机(coin pusher)：横向选一个落点把币投下去，往复推板把台面币推向前沿落袋，附带宝石收集、连击、三种道具(挡板/摇一摇/巨型币)与 6 套玩法',
    sealed: true,
    injectable: GameInjectable.full,
    requirements: [
      // 落点 aim 是一根连续 1 维轴, 定义域被三处代码同时钉死在 [-3.65,3.65]: nc() 映射的 clamp (index-99Hni2nq.js:9 col 147215)、drop() 的入参校验 `if(!Number.isFinite(e)||e<-3.65||e>3.65..
      PowerRequirement(control: PowerControl.steer, dimensions: 1, minHz: 30, maxLatency: Duration(milliseconds: 80), optional: false),
      // 投币是带「按下/松开」语义的单点触发, 不是一次性脉冲: bc 状态机 (col 171932) 的 begin→tick→end 用 delay/interval 做长按连投, end() 里 `!this.started&&!this.moved&&t-this.pressedAt<this.d
      PowerRequirement(control: PowerControl.trigger, dimensions: 1, minHz: 15, maxLatency: Duration(milliseconds: 120), optional: false),
      // 游戏确实消费了二维坐标, 但只有 X 进 aim: be() 里同时把 (clientX,clientY) 交给 r.current.move() (col 261554), 而 move 用 `Math.hypot(t-this.startX,n-this.startY)>7` 判定是否算拖动、拖
      PowerRequirement(control: PowerControl.pointer, dimensions: 2, minHz: 60, maxLatency: Duration(milliseconds: 60), optional: true),
      // 「摇一摇」道具在语义上就是摇晃脉冲: `power(e)` 里 `else if(e===`shake`){if(this.time<this.state.shakeReady)return!1;this.state.shakeReady=this.time+35;this.shake=1;for(
      PowerRequirement(control: PowerControl.shuffle, dimensions: 1, minHz: 10, maxLatency: Duration(milliseconds: 200), optional: true),
    ],
  ),
  GamePowerProfile(
    slug: 'gesture-fruit-slice',
    genre: '45 秒限时的切水果街机：水果从屏幕下方抛出，用一条二维「刀尖」轨迹划过水果得分、连击加成，切到炸弹或漏掉水果扣命（3 条命）。',
    sealed: false,
    injectable: GameInjectable.partial,
    requirements: [
      // 整局玩法只有一条语义：一个二维刀尖位置流。app.js:131-150 `setBlade(clientX, clientY, source, now)` 把视口坐标换算成画布坐标存成 `this.blade`，并**自己**算出速度与角度（142 `point.speed = Math.hypot
      PowerRequirement(control: PowerControl.pointer, dimensions: 2, minHz: 20, maxLatency: Duration(milliseconds: 120), optional: false),
      // 局外流程（开始 / 再玩一次 / 返回首页 / 重试摄像头）是四个 DOM click：app.js:455-458 分别绑在 `#startButton`、`#restartButton`、`#homeButton`、`#cameraFallback` 上，对应 index.html:24、51、
      PowerRequirement(control: PowerControl.trigger, dimensions: 1, minHz: 5, maxLatency: Duration(milliseconds: 400), optional: true),
    ],
  ),
  GamePowerProfile(
    slug: 'htx-quest',
    genre: '横版自动奔跑跑酷（auto-runner）：角色自动向右跑，玩家只负责「跳跃（可二段跳）」和「按住下滑」两个动作躲障碍/断崖并收集 Token 碎片；死亡后进入三选一知识问答换复活',
    sealed: true,
    injectable: GameInjectable.full,
    requirements: [
      // 跳跃是**边沿脉冲**，不是模拟量：104:47834 `press(e,t){...e===\`jump\`&&this.engine.jump()}`，引擎 9:45967 `jump(){...e.vy=e.jumps===0?-770:-700,e.jumps++}`，最多二段（`e.jum
      PowerRequirement(control: PowerControl.trigger, dimensions: 1, minHz: 60, maxLatency: Duration(milliseconds: 80), optional: true),
      // 下滑是**保持态**而非脉冲，必须能表达 press/release 两个边沿：104:47675 `this.held={jump:new Set,slide:new Set}`，`get pressed(){return{jump:...size>0,slide:...size>0}}`，pre
      PowerRequirement(control: PowerControl.trigger, dimensions: 1, minHz: 30, maxLatency: Duration(milliseconds: 100), optional: true),
      // 这是给倾斜类 Power 准备的**合并通道**，可与上面两条二选一绑定：把 jump/slide 压成一条三态离散轴（前倾=下滑 / 回正=跑 / 后仰=跳），正是 sensor-interactions-v1.js:250 非 aim 分支 `direction = gamma<-9?-1:ga
      PowerRequirement(control: PowerControl.lane, dimensions: 1, minHz: 30, maxLatency: Duration(milliseconds: 100), optional: true),
    ],
  ),
  GamePowerProfile(
    slug: 'ice-float-party',
    genre: '五人泳圈冰面生存竞技（Three.js 实时 3D，拖动移动 + 冲撞击退，45 秒存活）',
    sealed: false,
    injectable: GameInjectable.full,
    requirements: [
      // 拖动控制泳圈：index.html:24 的 #joystick 与 game.js 的 pointer 事件构成
      // 一路二维模拟摇杆，是核心操作，没有它玩不了。
      PowerRequirement(control: PowerControl.pointer, dimensions: 2, minHz: 30, maxLatency: Duration(milliseconds: 80), optional: false),
      // 冲撞：index.html:25 的 #dashBtn 是离散单次触发，带冷却。
      PowerRequirement(control: PowerControl.trigger, dimensions: 1, minHz: 5, maxLatency: Duration(milliseconds: 200), optional: false),
      // 可选的倾斜转向：玩法是俯视平面移动，倾斜能自然映射到二维方向，
      // 但作品本身只接了触摸，属于「接上就多一种玩法」。
      PowerRequirement(control: PowerControl.steer, dimensions: 1, minHz: 30, maxLatency: Duration(milliseconds: 80), optional: true),
    ],
  ),
  GamePowerProfile(
    slug: 'kol-town',
    genre: '非实时的 2.5D 等距小镇经营/叙事枢纽：拖动地图 → 点建筑走位进屋 → 在弹窗里玩 6 个轻量子玩法（3 题问答、8 秒二选一方向预测、直播点亮×3、三幕剧情、3/4 枚收集',
    sealed: true,
    injectable: GameInjectable.full,
    requirements: [
      // 对应地图平移（game.js:1244-1310 bindMapPan）。它是本作唯一的连续模拟量通道：1277-1283 每个 pointermove 直接把 dx/dy 累加成 applyMapPan，1231-1232 写入 --map-pan-x/--map-pan-y CSS 变量，视觉逐
      PowerRequirement(control: PowerControl.steer, dimensions: 2, minHz: 30, maxLatency: Duration(milliseconds: 80), optional: true),
      // 对应室内 2.5D 地面点选走位（game.js:3077 → 2028-2038 → 1995）。游戏消费的是「一个落点」而非逐帧跟随：2001 行 `duration = clamp(180 + distance*12, 220, 850)` 说明角色收到目标点后自走 220-850ms，期间不
      PowerRequirement(control: PowerControl.pointer, dimensions: 2, minHz: 15, maxLatency: Duration(milliseconds: 200), optional: true),
      // 对应离散四向步进。game.js:2021-2026 moveInteriorBy 的向量表 `{up:[0,-8], down:[0,8], left:[-8,0], right:[8,0]}` 是固定步长，3079-3085 把 ArrowUp/W/ArrowDown/S/ArrowLeft/A
      PowerRequirement(control: PowerControl.lane, dimensions: 2, minHz: 10, maxLatency: Duration(milliseconds: 150), optional: true),
      // 对应所有单点确认：空投 Token 领取（1842 → 1786 claimAirdropToken）、答题选项（2698 → 2701）、方向预测（2728）、收集物（2808）。时间窗很宽：1830 行 `--drop-duration` 为 7.1-8.15s，1844 `removeAird
      PowerRequirement(control: PowerControl.trigger, dimensions: 1, minHz: 10, maxLatency: Duration(milliseconds: 300), optional: true),
      // 对应「累计到阈值才解锁」的两处门槛，而不是单次触发：game.js:2776-2782 直播点亮 `if (activeTask.reactions >= 3) return`，2774 按钮在 `activeTask.reactions < 3` 时 disabled；2803-2814 收集玩法
      PowerRequirement(control: PowerControl.sequence, dimensions: 1, minHz: 10, maxLatency: Duration(milliseconds: 300), optional: true),
    ],
  ),
  GamePowerProfile(
    slug: 'lucky-fruit',
    genre: '24 格环形跑灯式水果老虎机：先在 8 个水果上离散押注，按「开始」后跑灯定格开奖，中奖可再猜一次大小翻倍——完全回合制，没有任何连续操作或实时操作窗口。',
    sealed: true,
    injectable: GameInjectable.full,
    requirements: [
      // 「开始开奖」本质是一次脉冲。证据链：控制台 id=`spin`（js:9 c182607）→ `onSpin:e.spin` 传入（c189100）→ `E=(0,C.useCallback)(async()=>(x(`tap`),w(e=>sc(e,rc(),Date.now(),crypto.r
      PowerRequirement(control: PowerControl.trigger, dimensions: 1, minHz: 10, maxLatency: Duration(milliseconds: 300), optional: true),
      // 这个游戏的所有选择动作都是**离散索引步进**，正是 lane 的语义，而且游戏自己就用左右箭头在描述它：`{id:`subtract`,label:`左箭头：切换为减注`}` / `{id:`add`,label:`右箭头：切换为加注`}`（js:9 c182450-c182530），UI 文案也
      PowerRequirement(control: PowerControl.lane, dimensions: 1, minHz: 15, maxLatency: Duration(milliseconds: 300), optional: true),
      // 界面是「参考图 + 绝对定位热区」结构，所有可点区域都有写死的像素矩形，天然适合 2D 指针悬停+停留点击：水果热区 `var gl=[[121,1942,138,139],[241,1942,125,139],...]` 8 个（js:9 c181907 之后），控制台热区 `var _l=[[1
      PowerRequirement(control: PowerControl.pointer, dimensions: 2, minHz: 30, maxLatency: Duration(milliseconds: 150), optional: true),
      // 「摇一摇开转」是老虎机的自然映射，但必须说明：**游戏代码里对此零依据**（devicemotion/deviceorientation grep 计数为 0）。可以这么声明的理由是它并不需要新语义——它只是 trigger 的另一路信号源，最终仍然落到同一个 `spin` 按钮。游戏已有 `nav
      PowerRequirement(control: PowerControl.shuffle, dimensions: 3, minHz: 30, maxLatency: Duration(milliseconds: 200), optional: true),
    ],
  ),
  GamePowerProfile(
    slug: 'magic-choir-replica',
    genre: '滑动连线编排合唱（纯 DOM/SVG + Web Audio，15 种声线，连满 3 人开唱）',
    sealed: false,
    injectable: GameInjectable.full,
    requirements: [
      // 按住滑过多个角色是核心操作：app.js 的 pointer 轨迹 + path.js 的
      // segmentHits 补选途经角色，需要连续二维坐标。
      PowerRequirement(control: PowerControl.pointer, dimensions: 2, minHz: 30, maxLatency: Duration(milliseconds: 100), optional: false),
      // 「再来一次」等按钮是离散触发。
      PowerRequirement(control: PowerControl.trigger, dimensions: 1, minHz: 5, maxLatency: Duration(milliseconds: 250), optional: true),
      // 可选的声控编排：这一版不接麦克风（Web Audio 只做输出），
      // 但玩法语义上「按顺序点亮声部」正好对应 sequence。
      PowerRequirement(control: PowerControl.sequence, dimensions: 1, minHz: 10, maxLatency: Duration(milliseconds: 200), optional: true),
    ],
  ),
  GamePowerProfile(
    slug: 'mini-gp-racers',
    genre: '3D 第三人称方程式竞速：单圈限时挑战，目标是在倒计时内完成指定超车数，赛后结算赛车币并回车库买车/升级（不是打包产物，是可读源码：index.html + core.js/dri',
    sealed: true,
    injectable: GameInjectable.partial,
    requirements: [
      // 转向是单条有符号一维轴：driver-physics.js:11 var steer = (input.right ? 1 : 0) - (input.left ? 1 : 0)，取值只有 -1/0/+1；driver-physics.js:60 heading += steer * stats.s
      PowerRequirement(control: PowerControl.steer, dimensions: 1, minHz: 60, maxLatency: Duration(milliseconds: 80), optional: false),
      // 油门/刹车/OVR/漂移四个控制全部是布尔「按住」量，共用同一套开关语义：race-engine.js:348 this.controls = { left, right, throttle, brake, boost, drift } 全为 false 初始化；race-engine.js:113
      PowerRequirement(control: PowerControl.trigger, dimensions: 1, minHz: 30, maxLatency: Duration(milliseconds: 120), optional: true),
    ],
  ),
  GamePowerProfile(
    slug: 'niguolaia',
    genre: '波次制塔防：在 6 个固定空地建塔/升级/拆除，外加两个需要在战场上自选落点的 AoE 技能（闪电风暴、招兵），整体是慢节奏的布防决策，不是即时操作。',
    sealed: true,
    injectable: GameInjectable.full,
    requirements: [
      // 游戏唯一的自由二维输入面是 app.js:46 的 pointerdown，它用 e.clientX/e.clientY 反算出 0..750 / 0..1334 的落点交给 castAt→engine.castSkill(type,x,y)（engine.js:131，内部 clamp(x,0,7
      PowerRequirement(control: PowerControl.pointer, dimensions: 2, minHz: 30, maxLatency: Duration(milliseconds: 120), optional: false),
      // 位置和提交在这个游戏里是两个独立事件：app.js:46 靠 pointerdown 提交技能，app.js:27 靠 click 提交选地，app.js:34-36 靠 click 提交建/升/拆，app.js:49-50 靠 click 提交技能切换与开波。所以除了二维坐标还必须有一路离散脉冲，
      PowerRequirement(control: PowerControl.trigger, dimensions: 1, minHz: 10, maxLatency: Duration(milliseconds: 200), optional: false),
      // 这是游戏自己真正连续消费的那一路，但它只是预览。app.js:47 的 pointermove 仅在 target 非空（已点过 #fire/#reinforcements）时写 target.x/target.y，而这对值的唯一下游是 art.js:40：if(target){const x=ta
      PowerRequirement(control: PowerControl.aim, dimensions: 2, minHz: 30, maxLatency: Duration(milliseconds: 120), optional: true),
    ],
  ),
  GamePowerProfile(
    slug: 'risk-run',
    genre: '单列下落物收集（篮子横向接 / 直点收集两种模式）+ 18 套「空投版本」规则面板按钮决策，外层包一个 KOL 活动运营壳（AI 聊天 + Live2D 形象 + 任务/钱包/兑换',
    sealed: true,
    injectable: GameInjectable.full,
    requirements: [
      // 篮子模式（默认模式，index.html:9902 `TWEAK_DEFAULTS.mode = "basket"`）需要一路**一维连续模拟量**。依据 index.html:12029-12036 moveBasket 直接把 clientX 线性映射成 8%~92% 的水平百分比，既不是离散跑
      PowerRequirement(control: PowerControl.steer, dimensions: 1, minHz: 30, maxLatency: Duration(milliseconds: 150), optional: true),
      // tap / combo 两种模式（index.html:12918-12925 Tweaks 里的 Control mode 三档 `tap` / `basket`(Wallet) / `combo`）靠逐枚金币命中。index.html:12653 `onPointerDown: e => onC
      PowerRequirement(control: PowerControl.pointer, dimensions: 2, minHz: 30, maxLatency: Duration(milliseconds: 120), optional: true),
      // 18 套版本面板的规则决策全部是离散、无时限的按钮提交，没有连续量也没有坐标：index.html:6690-6697 QuizPanel `quiz.options.map((option, index) => ... onClick: () => onAction("quizAnswer", {
      PowerRequirement(control: PowerControl.trigger, dimensions: 1, minHz: 10, maxLatency: Duration(milliseconds: 200), optional: true),
    ],
  ),
  GamePowerProfile(
    slug: 'star-table',
    genre: '回合制"观战竞猜"UI：四阶段状态机(预约→实时竞猜→观战→结算)，玩家只做三件事——从 6 名 AI 选手里挑 1 个、从 100/200/400 三档里挑 1 个星币、按确认；',
    sealed: true,
    injectable: GameInjectable.full,
    requirements: [
      // 游戏的核心输入就是两组一维离散选择：6 名选手(render.js:111-117 `state.players.map(... data-action="select-player" data-player-id="${player.id}"`) 和 3 档星币(render.js:123-125
      PowerRequirement(control: PowerControl.lane, dimensions: 1, minHz: 10, maxLatency: Duration(milliseconds: 300), optional: true),
      // 确认与推进类动作全是单点触发，没有蓄力也没有长按：render.js:134 `data-action="place-bet"`(确认下注)、render.js:132 `data-action="start-now"`(立即观战)、render.js:216 `data-action="fast-
      PowerRequirement(control: PowerControl.trigger, dimensions: 1, minHz: 5, maxLatency: Duration(milliseconds: 500), optional: true),
      // 这是唯一需要二维的一档，用于让平面指针类能力(手势指尖、头部追踪)直接命中界面元素：头像区是 3 列 2 行网格(styles.css:638-641 `.avatar-grid { display: grid; grid-template-columns: repeat(3, 1fr); }`)，
      PowerRequirement(control: PowerControl.pointer, dimensions: 2, minHz: 15, maxLatency: Duration(milliseconds: 250), optional: true),
    ],
  ),
  GamePowerProfile(
    slug: 'street-gold-rush',
    genre: '三跑道自动跑酷（Talking Tom Gold Run 型）：角色恒定前进，玩家只负责左右换道 / 跳跃 / 滑铲躲避障碍并吃金条，周期性进入浣熊首领 Boss 战，需要跳起把炸',
    sealed: true,
    injectable: GameInjectable.full,
    requirements: [
      // 核心且不可替代。main.js:547-558 `handleAction` 对 left/right 的处理是 `game.targetLane = clamp(game.targetLane ± 1, 0, 2)` —— 纯离散、3 档、每次 ±1，没有任何模拟量入口，完全对应 PowerCon
      PowerRequirement(control: PowerControl.lane, dimensions: 1, minHz: 30, maxLatency: Duration(milliseconds: 80), optional: false),
      // 对应跳跃。main.js:559-567：jump 是带状态门的单次脉冲 —— `if (game.jumpY <= 0.02 && game.sliding <= 0)` 才置 `game.jumpVelocity = 8.9`，空中重复触发直接 return false，没有『按住蓄力』也没有连
      PowerRequirement(control: PowerControl.trigger, dimensions: 1, minHz: 30, maxLatency: Duration(milliseconds: 80), optional: false),
      // 对应滑铲。main.js:568-576：slide 同样是无参数单次脉冲，落地时置 `game.sliding = 0.72`，空中时改写 `game.jumpVelocity` 做快速下坠，两条分支都无模拟量，故 trigger/1。判为可选(optional:true) 的依据是障碍生成：lo
      PowerRequirement(control: PowerControl.trigger, dimensions: 1, minHz: 20, maxLatency: Duration(milliseconds: 120), optional: true),
      // 对应游戏外壳(非玩法)的按钮层。main.js:1857-1863 `bindButton` 走 DOM `click`，main.js:1865-1894 绑定了开始/教程/暂停/继续/退出/重跑/回家/升级/静音等十余个按钮，这些按钮散布在 index.html 各处(如 index.html:
      PowerRequirement(control: PowerControl.pointer, dimensions: 2, minHz: 15, maxLatency: Duration(milliseconds: 200), optional: true),
    ],
  ),
  GamePowerProfile(
    slug: 'sud-texas',
    genre: '回合制 9 席德州扑克单机复刻：玩家对本地 AI 机器人，每回合在「弃牌 / 让牌·跟注 / 加注·下注 / 全下」四选一，加注额用一条竖向滑杆定量；全程无实时循环，只有 15 秒',
    sealed: true,
    injectable: GameInjectable.full,
    requirements: [
      // 核心决策是一排三选一的离散槽位：index.html:146-150 的 `.decision-buttons` 横排「弃牌 / 跟注 / 加注」，main.js:701 用 `button[data-action]` 委托接收。合法性由 main.js:332-341 实时算出并逐个 disabl
      PowerRequirement(control: PowerControl.lane, dimensions: 1, minHz: 10, maxLatency: Duration(milliseconds: 200), optional: true),
      // 加注额是本游戏唯一的连续模拟量：index.html:222 的 range 滑杆，main.js:528-531 在每次开面板时把 `min/max` 设成引擎给的 `descriptor.min`/`descriptor.max`（holdem-engine.js:326/328 产出，max 
      PowerRequirement(control: PowerControl.steer, dimensions: 1, minHz: 30, maxLatency: Duration(milliseconds: 120), optional: true),
      // 选完档位必须有一个独立的「落子」脉冲，因为 steer 调出来的值不会自动提交：main.js:538 `function confirmRaise() { const amount = Number(els.raiseSlider.value); closeModals(); performHer
      PowerRequirement(control: PowerControl.trigger, dimensions: 1, minHz: 5, maxLatency: Duration(milliseconds: 250), optional: true),
      // 「全下」和「再来一局」这两个高情绪动作适合摇一摇脉冲：main.js:714 `els.allInRaise.addEventListener("click", () => { closeModals(); performHeroAction("all-in"); });`，以及 main.js:7
      PowerRequirement(control: PowerControl.shuffle, dimensions: 3, minHz: 20, maxLatency: Duration(milliseconds: 300), optional: true),
      // 除决策面板外还有 20 多个散落全屏的点击目标：顶栏 main.js:676/678/682、工具 main.js:696/697、底栏 main.js:722/729、空座 main.js:730、竞猜 main.js:716。要让一路能力覆盖这些而不逐个硬编码，只能走「二维指针 + 落点合成 c
      PowerRequirement(control: PowerControl.pointer, dimensions: 2, minHz: 30, maxLatency: Duration(milliseconds: 150), optional: true),
    ],
  ),
  GamePowerProfile(
    slug: 'token-harbor',
    genre: '3D 等距「放置经营」：拖动虚拟摇杆操控小人在港口跑动，靠近空投堆自动采集代币，背回柜台卖给 NPC 顾客换 USDT，再买升级和雇员扩张 BTC/ETH/SOL/BNB 四条产线',
    sealed: true,
    injectable: GameInjectable.full,
    requirements: [
      // 选 aim（平面瞄准/移动）而不是 steer：gameplay.js:7751-7764 读的是一个**已归一化的二维向量** `Vec2(Horizontal, Vertical).normalize()`，再经 CalculateCameraRelativeDirection 投到相机平面当作
      PowerRequirement(control: PowerControl.aim, dimensions: 2, minHz: 30, maxLatency: Duration(milliseconds: 80), optional: false),
      // 这是和方向向量**相互独立的第二路必需信号**，不能并进 aim 里。依据：gameplay.js:6143 `UnityEngine.Input.GetMouseButton(0)?this.IsDown=!0:this.IsDown=!1` 每帧从按键状态重算 IsDown；gameplay.j
      PowerRequirement(control: PowerControl.trigger, dimensions: 1, minHz: 30, maxLatency: Duration(milliseconds: 80), optional: false),
    ],
  ),
];
