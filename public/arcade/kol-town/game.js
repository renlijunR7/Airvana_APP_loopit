(() => {
  'use strict';

  const CONFIG = Object.freeze({
    campaign_id: 'cmp_kol_town_demo',
    playable_id: 'plb_kol_town_demo',
    contract_version: '0.10.0',
    playable_version: '0.16.1',
    playable_config_version: '0.16.1',
    build_id: 'kol-town-experience-v0.16.1-20260916',
    creative_id: 'cr_kol_town_v23_directional_facing',
    channel_id: 'local_static_h5',
    link_id: 'local_demo',
    locale: 'zh-Hans',
    region: 'LOCAL',
    consent_state: 'local_demo'
  });

  const STORAGE_KEY = 'kol_town_state_v1';
  const KILL_SWITCH_KEY = 'kol_town_kill_switch';
  const AIRDROP_BRICK_BONUS = 5;
  const TOWN_ART_BASE = 'assets/vendor/janachumi-isometric-city-cc0/png/';
  const REQUIRED_EVENTS = Object.freeze([
    'impression', 'play_start', 'valid_interaction', 'level_start',
    'level_complete', 'play_complete', 'play_fail', 'replay', 'share',
    'cta_view', 'cta_click', 'registration_complete', 'reward_eligible',
    'reward_claim', 'consent_granted', 'return_session', 'error'
  ]);

  const THEMES = Object.freeze({
    luna: {
      id: 'luna', name: 'Luna 紫晶', town: 'Luna 小镇', mayor: 'LUNA', initial: 'L',
      tagline: '把每一次互动，变成小镇的一束光。', invite: 'LUNA2026', kol: 'kol_demo_luna',
      colors: ['#35425b', '#5c6b85', '#b98a3e', '#b06a76'],
      buildingColors: ['#4a5568', '#a96a77', '#4f88ab', '#5f6a8c', '#56658f', '#4a9078', '#b98a3e', '#8a6a9c']
    },
    vera: {
      id: 'vera', name: 'Vera 霓虹', town: 'Vera 霓虹港', mayor: 'VERA', initial: 'V',
      tagline: '今晚不赶路，我们点亮整座霓虹港。', invite: 'VERA2026', kol: 'kol_demo_vera',
      colors: ['#3f7f85', '#5f9aa0', '#bd9d54', '#b06a8c'],
      buildingColors: ['#2f7f8a', '#a75f85', '#3f88a8', '#3d9a80', '#4a6fa8', '#3f9490', '#b98a3e', '#8a6a9c']
    }
  });

  const BUILDINGS = Object.freeze([
    { id: 'htx', name: '交易所增长中心', short: '增长中心', icon: 'G', x: 196, y: 142, task: null, desc: '经营拉新、转化、促活、留存与召回 Campaign。', themeIndex: 0, art: 'building2.png', artWidth: 74, artHeight: 113 },
    { id: 'video', name: '视频剧院', short: '视频剧院', icon: '▶', x: 59, y: 202, task: 'story', desc: '逐幕观看一段小镇剧情。', themeIndex: 1, art: 'shop0.png', artWidth: 92, artHeight: 73 },
    { id: 'live', name: '直播广场', short: '直播广场', icon: '●', x: 196, y: 322, task: 'live', desc: '进入模拟直播、完成互动并签到。', themeIndex: 2, art: 'building0.png', artWidth: 72, artHeight: 110 },
    { id: 'quiz', name: '答题学院', short: '答题学院', icon: '?', x: 62, y: 362, task: 'quiz', desc: '完成 3 道小镇知识题。', themeIndex: 3, art: 'school0.png', artWidth: 112, artHeight: 85 },
    { id: 'predict', name: '行情预测馆', short: '预测馆', icon: '↗', x: 309, y: 377, task: 'predict', desc: '在倒计时内作出娱乐性方向判断。', themeIndex: 4, art: 'building1.png', artWidth: 73, artHeight: 110 },
    { id: 'tg', name: 'TG 社群会所', short: '社群会所', icon: '✦', x: 113, y: 472, task: 'community', desc: '访问本地社群场景并收集 3 枚徽记。', themeIndex: 5, art: 'purpleHouse.png', artWidth: 94, artHeight: 73 },
    { id: 'shop', name: '砖块商店', short: '砖块商店', icon: '▦', x: 340, y: 255, task: null, desc: '查看虚拟砖块记录与建筑升级规则。', themeIndex: 6, art: 'shop1.png', artWidth: 93, artHeight: 73 },
    { id: 'memorial', name: '粉丝纪念广场', short: '纪念广场', icon: '★', x: 280, y: 485, task: 'memorial', desc: '为共建地标收集纪念星片。', themeIndex: 7, art: 'fountain.png', artWidth: 92, artHeight: 60 }
  ]);

  const RANK_AVATARS = Object.freeze({
    Luna: 'assets/user/luna-avatar.jpg',
    Rain: 'assets/generated/rank-avatar-rain-v1.jpg',
    Mika: 'assets/generated/rank-avatar-mika-v1.jpg',
    Kiki: 'assets/generated/rank-avatar-kiki-v1.jpg',
    Vera: 'assets/generated/rank-avatar-vera-v1.jpg',
    Wen: 'assets/generated/rank-avatar-wen-v1.jpg'
  });

  const BUILDING_SCENES = Object.freeze({
    htx: {
      asset: 'assets/generated/interior-growth-center-v2.png', avifAsset: 'assets/optimized/interior-growth-center-v2-720.avif', optimizedAsset: 'assets/optimized/interior-growth-center-v2-720.webp', kicker: 'EXCHANGE GROWTH · INTERIOR',
      title: '交易所增长中心', primary: '进入 Campaign Lab',
      description: '从下载、注册、首次入金、首次现货交易到 D7 留存和召回，经营一条完整的本地增长航线。',
      zones: [
        { label: '获客调度室', icon: '↗', x: 27, y: 22, note: '规划 KOL 专属入口与下载触达；本地点击不会被记为真实 App 下载。' },
        { label: '激活实验室', icon: '◎', x: 73, y: 22, note: '演练注册、首次入金和首次现货交易路径，不连接真实账户、钱包或订单系统。' },
        { label: 'Campaign Lab', icon: 'G', x: 50, y: 49, primary: true }
      ]
    },
    video: {
      asset: 'assets/generated/interior-video-v1.png', avifAsset: 'assets/optimized/interior-video-v1-720.avif', optimizedAsset: 'assets/optimized/interior-video-v1-720.webp', kicker: 'VIDEO THEATER · INTERIOR',
      title: '视频剧院内部', primary: '开始街区剧情',
      description: '从首映大厅进入放映厅、剪辑室和道具工坊，完整体验三幕街区故事。',
      zones: [
        { label: '放映厅', icon: '▶', x: 72, y: 24, primary: true },
        { label: '剪辑室', icon: '⌁', x: 24, y: 24, note: '剪辑室只展示本地场景素材，不上传照片、视频或声音。' },
        { label: '首映大厅', icon: '✦', x: 50, y: 59, note: '大厅里的海报与展品均为无品牌的原创场景装饰。' }
      ]
    },
    live: {
      asset: 'assets/generated/interior-live-v1.png', avifAsset: 'assets/optimized/interior-live-v1-720.avif', optimizedAsset: 'assets/optimized/interior-live-v1-720.webp', kicker: 'LIVE STUDIO · INTERIOR',
      title: '直播广场内部', primary: '进入模拟直播',
      description: '进入圆形演播舞台、导播控制室和创作者休息区，完成三次本地点亮互动。',
      zones: [
        { label: '演播舞台', icon: '●', x: 56, y: 26, primary: true },
        { label: '导播控制室', icon: '▥', x: 22, y: 58, note: '导播屏幕只播放抽象本地画面，不接入远程直播流。' },
        { label: '创作者休息区', icon: '☕', x: 74, y: 61, note: '休息区是场景探索点，不采集麦克风、摄像头或个人信息。' }
      ]
    },
    quiz: {
      asset: 'assets/generated/interior-quiz-v1.png', avifAsset: 'assets/optimized/interior-quiz-v1-720.avif', optimizedAsset: 'assets/optimized/interior-quiz-v1-720.webp', kicker: 'QUIZ ACADEMY · INTERIOR',
      title: '答题学院内部', primary: '开始知识挑战',
      description: '穿过知识大厅，探索图书馆、阶梯教室和机关实验室，完成三道即时反馈题。',
      zones: [
        { label: '图书馆', icon: '▤', x: 66, y: 20, note: '图书馆陈列的是无文字的场景书籍，不包含外部知识库或用户资料。' },
        { label: '阶梯教室', icon: '?', x: 72, y: 47, primary: true },
        { label: '机关实验室', icon: '⚙', x: 60, y: 69, note: '实验室是纯本地谜题场景，不会启动设备权限。' }
      ]
    },
    predict: {
      asset: 'assets/generated/interior-predict-v1.png', avifAsset: 'assets/optimized/interior-predict-v1-720.avif', optimizedAsset: 'assets/optimized/interior-predict-v1-720.webp', kicker: 'FORECAST LAB · INTERIOR',
      title: '预测馆内部', primary: '开始方向观察',
      description: '从天文穹顶进入气象分析厅和观测实验室，体验八秒本地模拟方向判断。',
      zones: [
        { label: '观测穹顶', icon: '◉', x: 52, y: 18, note: '穹顶展示虚构天气与天文观测，不代表真实市场或交易信号。' },
        { label: '分析大厅', icon: '↗', x: 50, y: 48, primary: true },
        { label: '气象实验室', icon: '⌁', x: 25, y: 62, note: '所有曲线均由本地规则生成，仅用于娱乐互动。' }
      ]
    },
    tg: {
      asset: 'assets/generated/interior-community-v1.png', avifAsset: 'assets/optimized/interior-community-v1-720.avif', optimizedAsset: 'assets/optimized/interior-community-v1-720.webp', kicker: 'COMMUNITY HOUSE · INTERIOR',
      title: '社群会所内部', primary: '开始徽记收集',
      description: '进入茶吧、共创工坊、阅读区和小型活动舞台，在场景里寻找三枚社区徽记。',
      zones: [
        { label: '茶吧会客厅', icon: '☕', x: 49, y: 19, note: '会客厅只表现本地居民交流，不连接任何外部社交账号。' },
        { label: '活动舞台', icon: '♪', x: 68, y: 44, note: '活动舞台不会播放远程音视频或申请设备权限。' },
        { label: '共创工坊', icon: '✦', x: 30, y: 58, primary: true }
      ]
    },
    shop: {
      asset: 'assets/generated/interior-shop-v1.png', avifAsset: 'assets/optimized/interior-shop-v1-720.avif', optimizedAsset: 'assets/optimized/interior-shop-v1-720.webp', kicker: 'BUILDING SHOP · INTERIOR',
      title: '砖块商店内部', primary: '查看砖块记录',
      description: '浏览建筑样品、材料展台、制作工坊和本地仓库；这里只管理虚拟游戏砖块。',
      zones: [
        { label: '制作工坊', icon: '⌂', x: 31, y: 21, note: '工坊展示原创建筑模型，不会购买、寄送或兑换真实商品。' },
        { label: '材料仓库', icon: '▦', x: 72, y: 26, note: '仓库中的砖块只是视觉素材，不对应库存、货币或链上资产。' },
        { label: '砖块账本', icon: '▤', x: 40, y: 50, primary: true }
      ]
    },
    memorial: {
      asset: 'assets/generated/interior-memorial-v1.png', avifAsset: 'assets/optimized/interior-memorial-v1-720.avif', optimizedAsset: 'assets/optimized/interior-memorial-v1-720.webp', kicker: 'STAR ATRIUM · INTERIOR',
      title: '纪念广场内部', primary: '开始星片共建',
      description: '进入星形中庭、记忆画廊和共建工坊，收集四枚虚拟星片点亮地标。',
      zones: [
        { label: '记忆画廊', icon: '▧', x: 25, y: 24, note: '画廊使用虚构人物与抽象展品，不代表真实名人或粉丝资料。' },
        { label: '星形中庭', icon: '★', x: 51, y: 48, primary: true },
        { label: '共建工坊', icon: '✧', x: 78, y: 44, note: '工坊生成的星片只记录本地任务进度，不具备兑换或转让价值。' }
      ]
    }
  });

  const TASKS = Object.freeze({
    quiz: { id: 'quiz', building: 'quiz', name: '小镇知识挑战', icon: '🧠', desc: '连续完成 3 题，每题都会即时反馈。', bricks: 40, prosperity: 40, category: 'daily' },
    predict: { id: 'predict', building: 'predict', name: '限时方向预测', icon: '📈', desc: '8 秒内判断本地模拟曲线方向，可失败重试。', bricks: 35, prosperity: 35, category: 'daily' },
    live: { id: 'live', building: 'live', name: '直播广场签到', icon: '🔴', desc: '进入直播、完成 3 次互动后签到。', bricks: 28, prosperity: 30, category: 'daily' },
    story: { id: 'story', building: 'video', name: '观看街区剧情', icon: '🎬', desc: '完整观看三幕小镇故事片段。', bricks: 25, prosperity: 25, category: 'growth' },
    community: { id: 'community', building: 'tg', name: '社群访问收集', icon: '💬', desc: '在本地会所找到 3 枚社区徽记。', bricks: 30, prosperity: 30, category: 'growth' },
    memorial: { id: 'memorial', building: 'memorial', name: '纪念广场共建', icon: '🌟', desc: '收集 4 枚星片，拼出粉丝共建地标。', bricks: 22, prosperity: 25, category: 'growth' }
  });

  const RESIDENT_GROWTH_STAGES = Object.freeze([
    { id: 'explore', title: '新手探索', goal: '完成首个建筑任务', icon: '01', progress: () => Math.min(100, state.completedTasks.length * 100) },
    { id: 'active', title: '日常活跃', goal: '完成 3 类任务并达到 100 繁荣', icon: '02', progress: () => Math.min(100, Math.round((Math.min(3, state.completedTasks.length) / 3 * .55 + Math.min(100, state.prosperity) / 100 * .45) * 100)) },
    { id: 'mastery', title: '建筑专精', goal: '把任意建筑升到 Lv.2', icon: '03', progress: () => Math.max(...Object.values(state.buildingLevels || {})) >= 2 ? 100 : Math.min(75, Math.max(0, state.bricks)) },
    { id: 'campaign', title: '运营实战', goal: '完成 1 次 Campaign 本地验收', icon: '04', progress: () => Object.values(state.brandOrders || {}).some(status => status === 'settled') ? 100 : Object.values(state.brandOrders || {}).some(status => status === 'accepted') ? 50 : 0 },
    { id: 'season', title: '赛季共建', goal: '点亮纪念广场共建进度', icon: '05', progress: () => Math.min(100, state.memorialProgress) }
  ]);

  const BRAND_CAMPAIGNS = Object.freeze([
    {
      id: 'nova-download', brand: 'NOVA X 沙盒', initials: '下', color: '#3a7185', category: '渠道获客', stage: 'acquisition', stageLabel: '拉新', audience: '潜在新用户',
      title: 'KOL 下载接力', payout: 520, reputation: 8, kpi: '已确认 App 下载', externalEvent: 'exchange_app_install_confirmed', source: '应用商店 / 归因平台',
      objective: '选择合规的 KOL 入口、地区门禁与下载确认源，完成一次下载路径演练。', localProof: '下载路径演练完成', risk: '本地点击不等于下载',
      steps: [
        { q: '哪个入口最适合保留 KOL 归因？', options: ['KOL 专属活动链接', '无参数截图', '口头转发'], answer: 0, note: '专属链接可携带 campaign、creative、channel、kol 与 link 标识。' },
        { q: '什么才能确认一次真实 App 下载？', options: ['玩家点击按钮', '批准的应用商店或归因平台回传', '游戏任务完成'], answer: 1, note: '点击和试玩只能是上游行为，不能冒充真实下载。' },
        { q: '打开下载入口前还要检查什么？', options: ['收益承诺', '地区与年龄资格', '交易排行'], answer: 1, note: '受监管产品的地区、年龄和推广资格必须先通过门禁。' }
      ]
    },
    {
      id: 'nova-register', brand: 'NOVA X 沙盒', initials: '注', color: '#39785f', category: '开户转化', stage: 'conversion', stageLabel: '转化', audience: '已下载用户',
      title: '新用户注册导航', payout: 640, reputation: 10, kpi: '有效注册', externalEvent: 'exchange_registration_complete', source: '交易所账户服务端',
      objective: '完成隐私、安全和外部确认三道注册路径决策，不在游戏内收集真实开户资料。', localProof: '注册教育演练完成', risk: '本地账号不等于交易所注册',
      steps: [
        { q: '有效注册应由谁确认？', options: ['本地游戏页面', '交易所账户服务端', 'KOL 自行勾选'], answer: 1, note: '只有批准的外部账户系统确认后，才可计入有效注册。' },
        { q: '游戏内可以收集哪类数据？', options: ['助记词', '原始 KYC 证件', '无个人信息的玩法事件'], answer: 2, note: '游戏不收集密码、私钥、助记词或原始 KYC 文件。' },
        { q: '注册 CTA 应当怎样呈现？', options: ['用户主动点击且可退出', '自动开户', '隐藏条款后强制跳转'], answer: 0, note: '外部注册必须由用户主动触发，并使用已审批目的地。' }
      ]
    },
    {
      id: 'nova-deposit', brand: 'NOVA X 沙盒', initials: '金', color: '#a27636', category: '首充激活', stage: 'activation', stageLabel: '促活', audience: '已注册合格用户',
      title: '首次入金安全站', payout: 760, reputation: 12, kpi: '首次入金', externalEvent: 'exchange_first_deposit_confirmed', source: '交易所账务系统',
      objective: '识别自愿、合规、以到账回执确认的首次入金路径；全程不接触真实资金。', localProof: '安全入金演练完成', risk: '真实入金需合规审批',
      steps: [
        { q: '首次入金前必须具备什么？', options: ['地区与账户资格通过', '稳赚承诺', '隐藏风险说明'], answer: 0, note: '真实入金属于受控外部流程，必须先满足地区、年龄、账户和合规资格。' },
        { q: '什么是可计量的首次入金确认？', options: ['按钮点击', '游戏完成', '交易所账务系统确认到账'], answer: 2, note: '只能使用批准的账务回执，不能用点击或客户端猜测代替。' },
        { q: '哪种设计必须禁止？', options: ['自愿退出', '风险披露', '以高收益诱导入金'], answer: 2, note: '不得用收益保证、强迫操作或误导性激励推动入金。' }
      ]
    },
    {
      id: 'nova-trade', brand: 'NOVA X 沙盒', initials: '现', color: '#5b568a', category: '交易激活', stage: 'activation', stageLabel: '促活', audience: '已入金合格用户',
      title: '首次现货交易实验室', payout: 820, reputation: 13, kpi: '首次现货交易', externalEvent: 'exchange_first_spot_trade_confirmed', source: '交易所订单系统',
      objective: '在纸面沙盒中辨别真实成交确认源和风险边界，不展示真实价格、盈亏或杠杆。', localProof: '现货下单演练完成', risk: '不执行真实订单',
      steps: [
        { q: '什么才能确认首次现货交易？', options: ['模拟下单完成', '交易所订单系统的有效成交回执', '查看行情页面'], answer: 1, note: '真实 KPI 需要批准的订单系统确认，并执行去重、地区和异常排除。' },
        { q: '本地玩法应该避免什么？', options: ['纸面演练', '风险提示', '真实盈亏与高杠杆刺激'], answer: 2, note: '本地游戏不展示真实收益、排行榜或高杠杆激励。' },
        { q: '完成本关代表什么？', options: ['只完成交易教育演练', '已真实成交', '获得投资收益'], answer: 0, note: '本关只形成本地玩法证据，不代表真实交易或收益。' }
      ]
    },
    {
      id: 'nova-retention', brand: 'NOVA X 沙盒', initials: '留', color: '#4d7b75', category: '留存运营', stage: 'retention', stageLabel: '留存', audience: '新激活用户',
      title: 'D7 回访补给线', payout: 600, reputation: 9, kpi: 'D7 有效回访', externalEvent: 'exchange_d7_return_confirmed', source: '交易所用户服务端',
      objective: '设计不依赖交易量或资产持仓的七日回访任务，关注安全教育与产品熟悉度。', localProof: 'D7 任务设计完成', risk: '不以交易额做留存奖励',
      steps: [
        { q: 'D7 留存的分母应该是什么？', options: ['任意访问者', '明确的新激活用户 cohort', '所有 KOL 粉丝'], answer: 1, note: '留存必须使用明确 cohort、时间窗、身份规则和排除条件。' },
        { q: '哪类回访任务更稳妥？', options: ['安全知识与产品熟悉任务', '强制追加入金', '按交易量排名'], answer: 0, note: '优先使用教育、收藏和轻量回访，不用资产或交易量刺激留存。' },
        { q: '本地签到能否直接记为交易所 D7 留存？', options: ['可以', '不可以，需外部账户系统确认', '由 KOL 决定'], answer: 1, note: '本地签到与交易所账户回访是两种不同证据。' }
      ]
    },
    {
      id: 'nova-reactivate', brand: 'NOVA X 沙盒', initials: '回', color: '#965f55', category: '沉睡召回', stage: 'reactivation', stageLabel: '召回', audience: '沉睡用户',
      title: '沉睡用户返航计划', payout: 680, reputation: 10, kpi: '召回后有效会话', externalEvent: 'exchange_reactivation_session_confirmed', source: '交易所用户服务端',
      objective: '通过可退出的安全复习与功能探索召回沉睡用户，不使用亏损恐惧或虚假紧迫感。', localProof: '召回旅程演练完成', risk: '不制造虚假紧迫感',
      steps: [
        { q: '召回文案应避免什么？', options: ['明确退出入口', '虚假倒计时与错失恐惧', '说明活动边界'], answer: 1, note: '不得通过虚假稀缺、亏损恐惧或未经证实的收益承诺召回用户。' },
        { q: '什么属于合格的召回玩法？', options: ['安全复习与新功能探索', '自动下单', '强制连接钱包'], answer: 0, note: '召回应优先恢复信任与产品熟悉度，并保留退出路径。' },
        { q: '真实召回成功如何确认？', options: ['海报曝光', '游戏打开', '外部账户系统确认的有效会话'], answer: 2, note: '曝光与游戏打开是上游行为，不能代替交易所服务端有效会话。' }
      ]
    }
  ]);

  const QUIZ = Object.freeze([
    { q: '小镇里的砖块是什么？', options: ['可交易资产', '本地虚拟游戏积分', '链上兑换凭证'], answer: 1, note: '砖块只记录本地游戏进度，不具备现金、投资或转让价值。' },
    { q: '行情预测馆的结果代表什么？', options: ['专业建议', '确定性结论', '一次娱乐互动'], answer: 2, note: '预测只是一段本地互动玩法，不构成投资建议。' },
    { q: '钱包演示会向你索取什么？', options: ['什么都不会索取', '私钥与助记词', '邮箱和手机号'], answer: 0, note: '模拟连接不会索取地址、私钥、KYC 或联系方式。' }
  ]);

  const AVATAR_GROUPS = Object.freeze({
    hair: [
      { id: 'violet', name: '紫晶短发', tag: '利落', color: '#49336f', atlas: ['0%', '0%'] },
      { id: 'night', name: '午夜卷发', tag: '优雅', color: '#182538', atlas: ['33.333%', '0%'] },
      { id: 'mint', name: '薄荷挑染', tag: '清新', color: '#3b9f92', atlas: ['66.667%', '0%'] },
      { id: 'rose', name: '玫瑰长发', tag: '浪漫', color: '#a83e72', atlas: ['100%', '0%'] },
      { id: 'cloud-pony', name: '云雾高马尾', tag: '轻盈', color: '#8574a8', atlas: ['0%', '0%'], sheet: 'v2' },
      { id: 'amber-braid', name: '琥珀编发', tag: '复古', color: '#a75d2b', atlas: ['33.333%', '0%'], sheet: 'v2' },
      { id: 'navy-buns', name: '深海双丸子', tag: '元气', color: '#283260', atlas: ['66.667%', '0%'], sheet: 'v2' },
      { id: 'latte-lob', name: '奶茶锁骨发', tag: '日常', color: '#aa998d', atlas: ['100%', '0%'], sheet: 'v2' }
    ],
    outfit: [
      { id: 'mayor', name: '紫晶正装', tag: '正式', color: '#4a5568', atlas: ['0%', '50%'] },
      { id: 'neon', name: '霓虹夹克', tag: '未来', color: '#00aeb0', atlas: ['33.333%', '50%'] },
      { id: 'sunset', name: '落日卫衣', tag: '休闲', color: '#e9786f', atlas: ['66.667%', '50%'] },
      { id: 'classic', name: '经典风衣', tag: '通勤', color: '#4c526a', atlas: ['100%', '50%'] },
      { id: 'stage', name: '星夜舞台装', tag: '舞台', color: '#34305f', atlas: ['0%', '50%'], sheet: 'v2' },
      { id: 'knit', name: '奶油针织衫', tag: '松弛', color: '#d7c9ae', atlas: ['33.333%', '50%'], sheet: 'v2' },
      { id: 'utility', name: '城市工装马甲', tag: '探索', color: '#788169', atlas: ['66.667%', '50%'], sheet: 'v2' },
      { id: 'varsity', name: '珊瑚棒球衫', tag: '街头', color: '#df6d6a', atlas: ['100%', '50%'], sheet: 'v2' }
    ],
    accessory: [
      { id: 'star', name: '星星发夹', tag: '闪耀', color: '#ffd55a', atlas: ['0%', '100%'] },
      { id: 'headset', name: '直播耳机', tag: '直播', color: '#ff65aa', atlas: ['33.333%', '100%'] },
      { id: 'glasses', name: '像素眼镜', tag: '趣味', color: '#42d7d1', atlas: ['66.667%', '100%'] },
      { id: 'none', name: '不戴配饰', tag: '简约', color: '#b7b2c3', atlas: ['100%', '100%'] },
      { id: 'moon', name: '月牙耳坠', tag: '灵动', color: '#b7b9ce', atlas: ['0%', '100%'], sheet: 'v2' },
      { id: 'crystal', name: '紫晶项链', tag: '精致', color: '#8461b5', atlas: ['33.333%', '100%'], sheet: 'v2' },
      { id: 'sunglasses', name: '黑曜墨镜', tag: '酷感', color: '#34313a', atlas: ['66.667%', '100%'], sheet: 'v2' },
      { id: 'beret', name: '珍珠贝雷帽', tag: '法式', color: '#743954', atlas: ['100%', '100%'], sheet: 'v2' }
    ]
  });

  const AVATAR_LOOKS = Object.freeze([
    { id: 'mint-mayor-crystal', name: '薄荷街头', note: 'Luna 联名造型', featured: true, asset: 'standalone', avatar: { hair: 'mint', outfit: 'mayor', accessory: 'crystal' } },
    { id: 'mayor-daily', name: '紫晶正装', note: 'Luna 联名经典', atlas: ['0%', '0%'], avatar: { hair: 'violet', outfit: 'mayor', accessory: 'star' } },
    { id: 'midnight-commute', name: '午夜通勤', note: '优雅利落', atlas: ['33.333%', '0%'], avatar: { hair: 'night', outfit: 'classic', accessory: 'moon' } },
    { id: 'neon-online', name: '霓虹上线', note: '未来街头', atlas: ['66.667%', '0%'], avatar: { hair: 'mint', outfit: 'neon', accessory: 'glasses' } },
    { id: 'sunset-date', name: '落日约会', note: '浪漫休闲', atlas: ['100%', '0%'], avatar: { hair: 'rose', outfit: 'sunset', accessory: 'beret' } },
    { id: 'night-stage', name: '舞台夜色', note: '活动造型', atlas: ['0%', '100%'], avatar: { hair: 'cloud-pony', outfit: 'stage', accessory: 'crystal' } },
    { id: 'cream-afternoon', name: '奶油午后', note: '松弛复古', atlas: ['33.333%', '100%'], avatar: { hair: 'amber-braid', outfit: 'knit', accessory: 'none' } },
    { id: 'live-opening', name: '直播开场', note: '醒目上镜', atlas: ['66.667%', '100%'], avatar: { hair: 'navy-buns', outfit: 'varsity', accessory: 'headset' } },
    { id: 'city-explorer', name: '城市探索', note: '轻装出发', atlas: ['100%', '100%'], avatar: { hair: 'latte-lob', outfit: 'utility', accessory: 'sunglasses' } }
  ]);

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clone = value => JSON.parse(JSON.stringify(value));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const reducedMotionRequested = () => Boolean(state?.reducedMotion || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const escapeMarkup = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const todayKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Hong_Kong' }).format(new Date());
  const uid = prefix => {
    const bytes = new Uint32Array(2);
    if (globalThis.crypto && crypto.getRandomValues) crypto.getRandomValues(bytes);
    else { bytes[0] = Date.now(); bytes[1] = Math.floor(Math.random() * 1e9); }
    return `${prefix}_${Date.now().toString(36)}_${bytes[0].toString(36)}${bytes[1].toString(36)}`;
  };

  const defaultLevels = () => Object.fromEntries(BUILDINGS.map(building => [building.id, 1]));
  const makeDefaultState = () => ({
    schema: 1,
    accessChosen: true,
    onboardingComplete: false,
    playerName: '新居民',
    theme: 'luna',
    bricks: 35,
    totalEarned: 35,
    prosperity: 0,
    totalProsperity: 0,
    level: 1,
    streak: 0,
    lastCheckin: null,
    completedTasks: [],
    taskAttempts: {},
    buildingLevels: defaultLevels(),
    avatar: { hair: 'violet', outfit: 'mayor', accessory: 'star' },
    walletConnected: false,
    inviteBound: false,
    benefits: [],
    ledger: [{ id: uid('led'), label: '欢迎来到小镇', delta: 35, at: new Date().toISOString() }],
    businessRevenue: 0,
    brandReputation: 0,
    brandOrders: Object.fromEntries(BRAND_CAMPAIGNS.map(order => [order.id, 'available'])),
    activeBrandOrder: null,
    growthProofs: Object.fromEntries(BRAND_CAMPAIGNS.map(order => [order.id, false])),
    businessLedger: [],
    firstUpgradeShown: false,
    firstUpgradeThisRun: false,
    terminalEmitted: false,
    run: 1,
    predictionWins: 0,
    predictionAttempts: 0,
    memorialProgress: 0,
    airdropTokens: 0,
    airdropBrickCredits: 0,
    airdropFlightsSeen: 0,
    reducedMotion: false,
    currentScreen: 'onboarding',
    currentBuilding: null,
    createdAt: new Date().toISOString()
  });

  let storageWasPresent = false;
  let events = [];
  let state = loadState();
  let sessionId = uid('ses');
  let playStartedAt = performance.now();
  let interactionEmitted = false;
  let activeTask = null;
  let taskTimer = null;
  let toastTimer = null;
  let taskFilter = 'daily';
  let rankFilter = 'total';
  let onboardingStep = 0;
  let noticeCallback = null;
  let confirmCallback = null;
  let retryTaskId = null;
  let growthStageFilter = 'all';
  let growthRun = null;
  let pendingAvatar = clone(state.avatar);
  let progressSyncTimer = null;
  let applyingServerState = false;
  let chatHistory = [];
  let chatPending = false;
  const live2d = {
    initialized: false,
    ready: false,
    error: null,
    state: 'loading',
    soundEnabled: false,
    loadTimer: null,
    speechTimer: null,
    mouthTimer: null,
    utterance: null,
    speechRun: 0
  };
  const dialogReturnFocus = new WeakMap();
  const serverState = {
    bootstrapped: false,
    available: false,
    status: 'connecting',
    user: null,
    guestId: null,
    killSwitch: false,
    progressRevision: 0,
    leaderboard: null,
    attribution: null,
    lastSavedAt: null,
    error: null
  };
  const interiorRuntime = {
    x: 50,
    y: 78,
    targetX: 50,
    targetY: 78,
    moving: false,
    arrivalTimer: null,
    pendingZone: null,
    sceneId: null
  };
  const airdropRuntime = {
    initialized: false,
    active: false,
    sequence: 0,
    flightTimer: null,
    cleanupTimer: null,
    dropTimers: new Map(),
    brickCountTimer: null,
    claimTimers: new Set()
  };
  const mapPanRuntime = {
    x: 0,
    y: 0,
    pointerId: null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
    dragging: false,
    suppressClickUntil: 0
  };

  const GROWTH_STAGE_POINTS = Object.freeze({
    all: { x: 50, y: 87, label: '全部阶段' },
    acquisition: { x: 28, y: 30, label: '拉新站' },
    conversion: { x: 71, y: 29, label: '转化站' },
    activation: { x: 50, y: 50, label: '激活站' },
    retention: { x: 73, y: 72, label: '留存站' },
    reactivation: { x: 27, y: 73, label: '召回站' }
  });

  function normalizeState(saved) {
    const fresh = makeDefaultState();
    if (!saved || saved.schema !== 1) return fresh;
    const merged = { ...fresh, ...saved };
    merged.accessChosen = Boolean(merged.accessChosen);
    merged.theme = THEMES[merged.theme] ? merged.theme : 'luna';
    merged.completedTasks = [...new Set((merged.completedTasks || []).filter(id => TASKS[id]))];
    merged.buildingLevels = { ...defaultLevels(), ...(merged.buildingLevels || {}) };
    merged.avatar = { ...fresh.avatar, ...(merged.avatar || {}) };
    merged.benefits = Array.isArray(merged.benefits) ? merged.benefits.slice(0, 20) : [];
    merged.ledger = Array.isArray(merged.ledger) ? merged.ledger.slice(0, 24) : fresh.ledger;
    merged.businessRevenue = clamp(Number(merged.businessRevenue) || 0, 0, 1000000);
    merged.brandReputation = clamp(Number(merged.brandReputation) || 0, 0, 100);
    const savedOrders = merged.brandOrders && typeof merged.brandOrders === 'object' ? merged.brandOrders : {};
    merged.brandOrders = Object.fromEntries(BRAND_CAMPAIGNS.map(order => [order.id, ['available', 'accepted', 'settled'].includes(savedOrders[order.id]) ? savedOrders[order.id] : 'available']));
    const acceptedOrders = BRAND_CAMPAIGNS.filter(order => merged.brandOrders[order.id] === 'accepted').map(order => order.id);
    merged.activeBrandOrder = acceptedOrders.includes(merged.activeBrandOrder) ? merged.activeBrandOrder : acceptedOrders[0] || null;
    acceptedOrders.filter(id => id !== merged.activeBrandOrder).forEach(id => { merged.brandOrders[id] = 'available'; });
    const savedProofs = merged.growthProofs && typeof merged.growthProofs === 'object' ? merged.growthProofs : {};
    merged.growthProofs = Object.fromEntries(BRAND_CAMPAIGNS.map(order => [order.id, Boolean(savedProofs[order.id])]));
    merged.businessLedger = Array.isArray(merged.businessLedger) ? merged.businessLedger.filter(item => item && typeof item === 'object').slice(0, 20).map(item => ({ id: String(item.id || uid('biz')).slice(0, 96), label: String(item.label || '本地经营记录').slice(0, 80), delta: clamp(Number(item.delta) || 0, 0, 1000000), note: String(item.note || '本地模拟').slice(0, 120), at: String(item.at || new Date().toISOString()).slice(0, 40) })) : [];
    merged.airdropTokens = clamp(Number(merged.airdropTokens) || 0, 0, 999);
    merged.airdropBrickCredits = clamp(Number(merged.airdropBrickCredits) || 0, 0, 999999);
    merged.airdropFlightsSeen = clamp(Number(merged.airdropFlightsSeen) || 0, 0, 9999);
    merged.currentScreen = merged.onboardingComplete ? 'town' : 'onboarding';
    return merged;
  }

  function loadState() {
    const fresh = makeDefaultState();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      storageWasPresent = Boolean(raw);
      if (!raw) return fresh;
      const saved = JSON.parse(raw);
      return normalizeState(saved);
    } catch (error) {
      storageWasPresent = false;
      return fresh;
    }
  }

  function saveState({ sync = true } = {}) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      emit('error', { error_code: 'LOCAL_STORAGE_WRITE_FAILED', recoverability: 'session_only', message: String(error.message || error) });
    }
    void sync;
  }

  function emit(eventName, properties = {}) {
    if (!REQUIRED_EVENTS.includes(eventName)) return;
    const now = new Date();
    const viewport = `${window.innerWidth}x${window.innerHeight}`;
    const activeTheme = THEMES[state?.theme] || THEMES.luna;
    const event = {
      event_id: uid('evt'),
      event_name: eventName,
      event_time: now.toISOString(),
      timestamp: now.getTime(),
      campaign_id: CONFIG.campaign_id,
      playable_id: CONFIG.playable_id,
      contract_version: CONFIG.contract_version,
      playable_version: CONFIG.playable_version,
      playable_config_version: CONFIG.playable_config_version,
      build_id: CONFIG.build_id,
      session_id: sessionId,
      screen_id: state?.currentScreen || 'boot',
      task_id: properties.task_id ?? activeTask?.id ?? null,
      building_id: properties.building_id ?? state?.currentBuilding ?? null,
      theme: state?.theme || 'luna',
      viewport,
      is_test: true,
      channel_id: CONFIG.channel_id,
      creative_id: CONFIG.creative_id,
      kol_id: activeTheme.kol,
      actor_role: properties.actor_role || 'player',
      subject_role: properties.subject_role || null,
      link_id: CONFIG.link_id,
      locale: CONFIG.locale,
      region: CONFIG.region,
      device_class: window.innerWidth <= 600 ? 'mobile' : 'desktop_preview',
      consent_state: CONFIG.consent_state,
      properties: clone(properties)
    };
    events.push(event);
    if (events.length > 500) events = events.slice(-500);
    updateEventLog();
  }

  function getCampaignContext() {
    const active = BRAND_CAMPAIGNS.find(order => order.id === state.activeBrandOrder && state.brandOrders[order.id] === 'accepted') || null;
    const next = BRAND_CAMPAIGNS.find(order => state.brandOrders[order.id] === 'available') || null;
    const settled = BRAND_CAMPAIGNS.filter(order => state.brandOrders[order.id] === 'settled').length;
    const localProofComplete = Boolean(active && state.growthProofs[active.id]);
    return { active, next, settled, localProofComplete };
  }

  function campaignNextStep(context) {
    if (context.active) {
      return context.localProofComplete
        ? `“${context.active.localProof}”已经完成。下一步是回到增长中心提交本地验收；“${context.active.kpi}”仍需${context.active.source}确认。`
        : `继续“${context.active.title}”的增长航线演练，完成“${context.active.localProof}”。`;
    }
    if (context.next) return `当前没有执行中的 Campaign。建议从“${context.next.stageLabel} · ${context.next.title}”开始；它只绑定“${context.next.kpi}”一个主 KPI，真实结果由${context.next.source}确认。`;
    return '六项本地 Campaign 都已交付。可以查看经营账本；所有外部 KPI 仍保持未接入状态。';
  }

  function localKolChatReply(message) {
    const text = message.toLocaleLowerCase('zh-Hans');
    const completed = state.completedTasks.length;
    const nextTask = Object.keys(TASKS).find(taskId => !state.completedTasks.includes(taskId)) || 'quiz';
    const persona = `${THEMES[state.theme].name.split(' ')[0]} AI 分身`;
    const campaign = getCampaignContext();
    const result = { persona: { name: persona, mode: 'browser_rules' }, blocked: false, action: null };
    if (/(助记词|私钥|private key|seed phrase|身份证|kyc 文件|上传.*证件|密码)/i.test(text)) {
      return { ...result, intent: 'sensitive_data', blocked: true, reply: '为了安全，请不要发送助记词、私钥、密码、身份证或 KYC 文件。我不会接收、验证或保存这些信息。' };
    }
    if (/(稳赚|保证收益|投资建议|买币|卖币|交易建议|提现|真实代币)/i.test(text)) {
      return { ...result, intent: 'financial_boundary', blocked: true, reply: '我只能解释本地 Campaign 和小镇玩法，不能提供投资、交易或收益建议。预测馆也是娱乐任务，不代表真实行情。' };
    }
    if (/(修改|更改|调整|替换).*(预算|奖励|地区|结算|kpi|cta|跳转|目的地)|哪些.*不能修改|锁定字段/i.test(text)) {
      return { ...result, intent: 'campaign_locked_fields', blocked: true, reply: '我不能修改 Campaign Contract 锁定字段，包括预算、奖励、地区、CTA 目的地、归因窗口、主 KPI、结算和合规披露。这里只能解释当前状态并引导到已允许的本地玩法。', action: { type: 'open_screen', target: 'flagship', label: '查看 Campaign 状态' } };
    }
    if (/(你是谁|真人|本人|分身|人工智能|\bai\b)/i.test(text)) {
      return { ...result, intent: 'identity', reply: `我是 ${persona}，使用浏览器内本地规则回答，不是 KOL 本人实时在线。` };
    }
    if (!/(主.*kpi|kpi.*来源|确认源|外部确认|谁.*确认|数据来源)/i.test(text) && /(当前.*campaign|campaign.*是什么|正在.*任务|当前.*营销)/i.test(text)) {
      const reply = campaign.active
        ? `当前执行“${campaign.active.stageLabel} · ${campaign.active.title}”。主 KPI 是“${campaign.active.kpi}”，本地交付是“${campaign.active.localProof}”，当前状态为${campaign.localProofComplete ? '待本地验收' : '演练中'}。`
        : campaignNextStep(campaign);
      return { ...result, intent: 'campaign_context', reply, action: { type: 'open_screen', target: 'flagship', label: '打开增长中心' } };
    }
    if (/(主.*kpi|kpi.*来源|确认源|外部确认|谁.*确认|数据来源)/i.test(text)) {
      const reply = campaign.active
        ? `“${campaign.active.title}”只有一个主 KPI：“${campaign.active.kpi}”。真实结果必须由${campaign.active.source}服务端确认；本地点击、答题和过关不能替代该回传。`
        : '每个 Campaign 只能选择一个主 KPI，并显示独立确认源。下载来自应用商店或归因平台；注册、入金、交易与留存必须由对应交易所服务端确认。当前演示的外部确认数固定为 0。';
      return { ...result, intent: 'campaign_kpi_source', reply, action: { type: 'open_screen', target: 'flagship', label: '查看 KPI 任务库' } };
    }
    if (/(阶段|拉新|转化|促活|留存|召回)/i.test(text)) {
      return { ...result, intent: 'campaign_stage', reply: `增长中心分为拉新、转化、促活、留存和召回五个阶段。当前筛选是“${GROWTH_STAGE_POINTS[growthStageFilter]?.label || '全部阶段'}”，已完成 ${campaign.settled}/6 项本地交付。`, action: { type: 'open_screen', target: 'flagship', label: '查看阶段地图' } };
    }
    if (/(下一步|接下来|做什么|推荐|去哪)/i.test(text)) {
      return { ...result, intent: 'campaign_next_step', reply: campaignNextStep(campaign), action: { type: 'open_screen', target: 'flagship', label: '前往下一步' } };
    }
    if (/(进度|砖块|繁荣|等级|完成了|成绩)/i.test(text)) {
      return { ...result, intent: 'progress', reply: `你现在有 ${state.bricks} 块虚拟砖块、${state.prosperity} 繁荣度，完成了 ${completed} 个街区任务和 ${campaign.settled}/6 项本地 Campaign 交付。`, action: { type: 'open_screen', target: 'task_center', label: '查看任务进度' } };
    }
    if (/(邀请码|luna2026|vera2026|邀请)/i.test(text)) {
      return { ...result, intent: 'invite', reply: '演示邀请码只用于当前浏览器的本机归因和演示卡，不会创建真实交易所账号或参与商业结算。', action: { type: 'open_screen', target: 'flagship', label: '去增长中心' } };
    }
    if (/(怎么玩|规则|小镇|建筑)/i.test(text)) {
      return { ...result, intent: 'game_help', reply: '点建筑后，你的居民会沿道路进入分层 2.5D 场景；点地面或方向键移动，走到编号地点会触发互动。主理人 Luna 与居民 NPC 保持独立角色。完成 3 个不同街区任务并达到 100 繁荣度，即可完成本轮目标。', action: { type: 'open_screen', target: 'task_center', label: '查看全部任务' } };
    }
    if (/(任务|今天)/i.test(text)) {
      return { ...result, intent: 'task_recommendation', reply: `街区任务建议先做“${TASKS[nextTask].name}”；增长任务方面，${campaignNextStep(campaign)}`, action: { type: 'open_screen', target: 'flagship', label: '打开增长中心' } };
    }
    if (/(你好|嗨|hello|\bhi\b|早上好|晚上好)/i.test(text)) {
      return { ...result, intent: 'greeting', reply: `你好，我是 ${persona}。我能说明当前 Campaign、主 KPI、确认源和下一步，但不会修改合同锁定字段。` };
    }
    return { ...result, intent: 'fallback', reply: `我可以回答“当前 Campaign”“KPI 来源”“下一步”或“锁定字段”。${campaignNextStep(campaign)}` };
  }

  function renderKolChat() {
    const log = $('#chat-log');
    if (!log) return;
    const personaName = `${THEMES[state.theme].name.split(' ')[0]} AI 分身`;
    $('#chat-title').textContent = `和 ${personaName}聊聊`;
    $('#mayor-chat').textContent = '和 AI 分身聊聊';
    $('#mayor-card-avatar').setAttribute('aria-label', `和 ${personaName}聊聊`);
    log.replaceChildren();
    chatHistory.forEach(message => {
      const row = document.createElement('div');
      row.className = `chat-message ${message.role}${message.blocked ? ' blocked' : ''}`;
      if (message.role === 'assistant') {
        const avatar = document.createElement('span');
        avatar.className = 'chat-message-avatar';
        avatar.setAttribute('aria-hidden', 'true');
        row.appendChild(avatar);
      }
      const bubble = document.createElement('div');
      bubble.className = 'chat-bubble';
      if (message.role === 'assistant') {
        const meta = document.createElement('p');
        meta.className = 'chat-message-meta mono';
        meta.textContent = `${message.persona || personaName} · ${message.mode === 'browser_rules' ? '离线规则' : '本地规则'}`;
        bubble.appendChild(meta);
      }
      const content = document.createElement('span');
      content.textContent = message.text;
      bubble.appendChild(content);
      if (message.action) {
        const action = document.createElement('button');
        action.type = 'button';
        action.className = 'chat-action';
        action.textContent = message.action.label;
        action.addEventListener('click', () => applyKolChatAction(message.action, message.intent));
        bubble.appendChild(action);
      }
      row.appendChild(bubble);
      log.appendChild(row);
    });
    requestAnimationFrame(() => { log.scrollTop = log.scrollHeight; });
  }

  const LIVE2D_LABELS = Object.freeze({
    loading: '正在加载 Live2D…',
    ready: 'Live2D 已就绪',
    listening: '正在听你说',
    thinking: '正在思考',
    speaking: '正在回答',
    acknowledging: '正在回应',
    idle: '等待互动',
    error: 'Live2D 暂不可用'
  });

  function setLive2DStageState(nextState, label = null) {
    live2d.state = nextState;
    const stage = $('#live2d-stage');
    const status = $('#live2d-status');
    if (stage) stage.dataset.live2dState = nextState;
    if (status) status.textContent = label || LIVE2D_LABELS[nextState] || LIVE2D_LABELS.ready;
  }

  function postLive2DState(interactionState, options = {}) {
    const frame = $('#live2d-frame');
    if (!live2d.ready || !frame?.contentWindow) return false;
    frame.contentWindow.postMessage({
      source: 'airvana-cubism-host',
      version: 1,
      type: 'airvana:cubism-state',
      payload: {
        interactionState,
        mouthOpen: clamp(Number(options.mouthOpen) || 0, 0, 1),
        speechProgress: clamp(Number(options.speechProgress) || 0, 0, 1),
        answerIntent: String(options.answerIntent || ''),
        expressionHint: String(options.expressionHint || ''),
        reducedMotion: Boolean(state.reducedMotion)
      }
    }, location.origin);
    return true;
  }

  function failLive2D(errorCode = 'LIVE2D_LOAD_FAILED') {
    if (live2d.loadTimer) clearTimeout(live2d.loadTimer);
    live2d.loadTimer = null;
    live2d.ready = false;
    live2d.error = errorCode;
    setLive2DStageState('error');
    const identity = $('#live2d-identity');
    if (identity) identity.textContent = '静态 Luna 形象 · Live2D 未加载';
    emit('error', {
      error_code: errorCode,
      recoverability: 'static_avatar_fallback',
      model_id: 'mao',
      raw_text_retained: false
    });
  }

  function loadLive2D() {
    if (live2d.ready) {
      setLive2DStageState('ready');
      postLive2DState('ready');
      return;
    }
    if (live2d.initialized) return;
    const frame = $('#live2d-frame');
    if (!frame?.dataset.src) {
      failLive2D('LIVE2D_FRAME_MISSING');
      return;
    }
    live2d.initialized = true;
    live2d.error = null;
    setLive2DStageState('loading');
    frame.src = frame.dataset.src;
    live2d.loadTimer = setTimeout(() => {
      if (!live2d.ready) failLive2D('LIVE2D_READY_TIMEOUT');
    }, 15000);
  }

  function handleLive2DMessage(event) {
    const frame = $('#live2d-frame');
    if (!frame?.contentWindow || event.source !== frame.contentWindow || event.origin !== location.origin) return;
    const message = event.data;
    if (!message || message.source !== 'airvana-cubism-runtime' || message.version !== 1) return;
    if (message.type === 'airvana:cubism-error') {
      failLive2D(String(message.payload?.code || 'LIVE2D_RUNTIME_ERROR').slice(0, 80));
      return;
    }
    if (message.type !== 'airvana:cubism-ready') return;
    const payload = message.payload || {};
    const capabilities = payload.capabilities || {};
    const verified = payload.modelId === 'mao'
      && payload.firstFrame === true
      && capabilities.moc3 === true
      && capabilities.mouthOpen === true
      && capabilities.eyeBlink === true
      && capabilities.stateGestures === true
      && capabilities.singleModelRig === true;
    if (!verified) {
      failLive2D('LIVE2D_CAPABILITY_CHECK_FAILED');
      return;
    }
    if (live2d.loadTimer) clearTimeout(live2d.loadTimer);
    live2d.loadTimer = null;
    live2d.ready = true;
    live2d.error = null;
    const identity = $('#live2d-identity');
    if (identity) identity.textContent = '官方示例 Mao · 非 Luna 数字孪生';
    const readyState = document.activeElement === $('#chat-input') ? 'listening' : 'ready';
    setLive2DStageState(readyState);
    postLive2DState(readyState, { expressionHint: readyState });
    emit('valid_interaction', {
      interaction_type: 'live2d_ready',
      model_id: 'mao',
      model_role: String(payload.role || 'official-free-material-sample'),
      first_frame: true,
      raw_text_retained: false
    });
  }

  function stopLive2DSpeech(nextState = 'ready') {
    live2d.speechRun += 1;
    if (live2d.speechTimer) clearTimeout(live2d.speechTimer);
    if (live2d.mouthTimer) clearInterval(live2d.mouthTimer);
    live2d.speechTimer = null;
    live2d.mouthTimer = null;
    if (live2d.utterance && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    live2d.utterance = null;
    if (!live2d.ready) return;
    setLive2DStageState(nextState);
    postLive2DState(nextState, { mouthOpen: 0, speechProgress: 1 });
  }

  function startLive2DReply(text, intent = 'fallback') {
    if (!live2d.ready) return;
    stopLive2DSpeech('speaking');
    const run = ++live2d.speechRun;
    const duration = clamp(String(text || '').length * 72, 1800, 5200);
    const startedAt = performance.now();
    let finished = false;
    setLive2DStageState('speaking');
    const updateMouth = () => {
      if (run !== live2d.speechRun) return;
      const progress = clamp((performance.now() - startedAt) / duration, 0, 1);
      const mouthOpen = state.reducedMotion ? .28 : clamp(.2 + Math.abs(Math.sin(progress * Math.PI * 16)) * .65, 0, 1);
      postLive2DState('speaking', { mouthOpen, speechProgress: progress, answerIntent: intent, expressionHint: intent });
    };
    updateMouth();
    live2d.mouthTimer = setInterval(updateMouth, 84);
    const finish = () => {
      if (run !== live2d.speechRun || finished) return;
      finished = true;
      if (live2d.mouthTimer) clearInterval(live2d.mouthTimer);
      live2d.mouthTimer = null;
      live2d.utterance = null;
      setLive2DStageState('acknowledging');
      postLive2DState('acknowledging', { mouthOpen: 0, speechProgress: 1, answerIntent: intent, expressionHint: intent });
      live2d.speechTimer = setTimeout(() => {
        if (run !== live2d.speechRun) return;
        setLive2DStageState('ready');
        postLive2DState('ready');
      }, state.reducedMotion ? 120 : 520);
    };
    live2d.speechTimer = setTimeout(finish, duration);
    if (live2d.soundEnabled && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(String(text || ''));
      utterance.lang = 'zh-CN';
      utterance.rate = .96;
      utterance.pitch = 1.04;
      utterance.volume = .82;
      utterance.onend = finish;
      utterance.onerror = () => {
        live2d.utterance = null;
        emit('error', { error_code: 'LOCAL_SPEECH_SYNTHESIS_FAILED', recoverability: 'silent_live2d_animation', raw_text_retained: false });
      };
      live2d.utterance = utterance;
      window.speechSynthesis.speak(utterance);
    }
  }

  function greetLive2D() {
    if (!live2d.ready) {
      toast(live2d.error ? 'Live2D 暂不可用，已显示静态形象' : 'Live2D 仍在加载，请稍候');
      return;
    }
    stopLive2DSpeech('acknowledging');
    setLive2DStageState('acknowledging', 'Mao 正在向你问好');
    postLive2DState('acknowledging', { expressionHint: 'greeting', answerIntent: 'greeting' });
    emit('valid_interaction', { interaction_type: 'live2d_greet', model_id: 'mao', raw_text_retained: false });
    live2d.speechTimer = setTimeout(() => {
      setLive2DStageState('ready');
      postLive2DState('ready');
    }, state.reducedMotion ? 180 : 1100);
  }

  function toggleLive2DSound() {
    if (!('speechSynthesis' in window)) {
      toast('当前浏览器不支持本地语音，Live2D 动作仍可使用');
      return;
    }
    live2d.soundEnabled = !live2d.soundEnabled;
    const button = $('#live2d-sound');
    button.setAttribute('aria-pressed', String(live2d.soundEnabled));
    button.setAttribute('aria-label', live2d.soundEnabled ? '关闭虚拟人语音' : '开启虚拟人语音');
    button.textContent = live2d.soundEnabled ? '声音开启' : '声音关闭';
    if (!live2d.soundEnabled && live2d.utterance) window.speechSynthesis.cancel();
    emit('valid_interaction', { interaction_type: 'live2d_sound_toggle', enabled: live2d.soundEnabled, model_id: 'mao', raw_text_retained: false });
  }

  function openKolChat() {
    if (!chatHistory.length) {
      const personaName = `${THEMES[state.theme].name.split(' ')[0]} AI 分身`;
      const campaign = getCampaignContext();
      chatHistory.push({
        role: 'assistant', persona: personaName, mode: 'local_rules', intent: 'welcome',
        text: `你好，我是 ${personaName}，不是 KOL 本人实时在线。我可以根据当前进度解释 Campaign、主 KPI、确认源和下一步。${campaignNextStep(campaign)}`
      });
    }
    renderKolChat();
    showDialog($('#dlg-chat'));
    loadLive2D();
    emit('valid_interaction', { interaction_type: 'kol_chat_open', chat_mode: 'browser_rules', raw_text_retained: false });
    requestAnimationFrame(() => $('#chat-input')?.focus({ preventScroll: true }));
  }

  async function sendKolChat(message, source = 'free_text') {
    const text = String(message || '').trim().slice(0, 240);
    if (!text || chatPending) return;
    chatHistory.push({ role: 'user', text });
    renderKolChat();
    emit('valid_interaction', { interaction_type: 'kol_chat_message', source, message_length: text.length, raw_text_retained: false });
    chatPending = true;
    if (live2d.ready) {
      setLive2DStageState('thinking');
      postLive2DState('thinking', { expressionHint: 'thinking' });
    }
    $('#chat-send').disabled = true;
    $('#chat-input').disabled = true;
    try {
      const result = localKolChatReply(text);
      const mode = result.persona?.mode || 'browser_rules';
      chatHistory.push({
        role: 'assistant', persona: result.persona?.name, mode, intent: result.intent,
        text: result.reply, blocked: Boolean(result.blocked), action: result.action || null
      });
      if (chatHistory.length > 30) chatHistory = chatHistory.slice(-30);
      emit('valid_interaction', {
        interaction_type: result.blocked ? 'kol_chat_safety_block' : 'kol_chat_response',
        chat_intent: result.intent, chat_mode: mode, chat_safety_outcome: result.blocked ? 'blocked' : 'allowed',
        raw_text_retained: false
      });
      startLive2DReply(result.reply, result.intent);
    } catch (error) {
      const fallback = localKolChatReply(text);
      chatHistory.push({ role: 'assistant', persona: fallback.persona?.name, mode: 'browser_rules', intent: fallback.intent, text: fallback.reply, blocked: fallback.blocked, action: fallback.action || null });
      emit('error', { error_code: 'LOCAL_KOL_CHAT_API_FAILED', recoverability: 'browser_rules_fallback', message: String(error.message || error) });
      startLive2DReply(fallback.reply, fallback.intent);
    } finally {
      chatPending = false;
      $('#chat-send').disabled = false;
      $('#chat-input').disabled = false;
      renderKolChat();
      requestAnimationFrame(() => $('#chat-input')?.focus({ preventScroll: true }));
    }
  }

  function applyKolChatAction(action, intent = 'unknown') {
    if (!action || !['open_screen', 'open_task'].includes(action.type)) return;
    const allowedScreens = ['town', 'task_center', 'flagship', 'wallet', 'ranking'];
    const allowedTasks = Object.keys(TASKS);
    if (action.type === 'open_screen' && !allowedScreens.includes(action.target)) return;
    if (action.type === 'open_task' && !allowedTasks.includes(action.target)) return;
    emit('valid_interaction', { interaction_type: 'kol_chat_action', chat_intent: intent, action_type: action.type, action_target: action.target, raw_text_retained: false });
    if ($('#dlg-chat').open) $('#dlg-chat').close();
    if (action.type === 'open_task') startTask(action.target);
    else showScreen(action.target);
  }

  function setServerStatus(status, error = null) {
    serverState.status = 'offline';
    serverState.error = error ? String(error.message || error) : null;
    const accessStatus = $('#access-server-status');
    const syncStatus = $('#server-sync-status');
    const labels = {
      connecting: '离线静态模式 · 无网络请求',
      online: '离线静态模式 · 无网络请求',
      saving: '正在保存到本机…',
      saved: '已保存',
      offline: '离线静态模式 · 进度保存在当前浏览器'
    };
    if (accessStatus) {
      accessStatus.textContent = labels[status] || status;
      accessStatus.classList.toggle('error', status === 'offline');
    }
    if (syncStatus) {
      syncStatus.textContent = '仅本机';
      syncStatus.classList.add('ok');
      syncStatus.classList.remove('error');
    }
  }

  function scheduleProgressSync() {
    clearTimeout(progressSyncTimer);
    progressSyncTimer = null;
  }

  async function syncProgressNow({ required = false } = {}) {
    clearTimeout(progressSyncTimer);
    progressSyncTimer = null;
    void required;
    saveState({ sync: false });
    serverState.lastSavedAt = new Date().toISOString();
    setServerStatus('offline');
    return { saved: true, storage: 'browser_local_storage', state: clone(state) };
  }

  async function postEvent(event) {
    void event;
    return false;
  }

  function applyServerProgress(progress, { chooseAccess = true } = {}) {
    if (!progress) return;
    applyingServerState = true;
    state = normalizeState(progress);
    if (chooseAccess) state.accessChosen = true;
    pendingAvatar = clone(state.avatar);
    saveState({ sync: false });
    applyingServerState = false;
  }

  async function recordUrlAttribution() {
    const params = new URLSearchParams(location.search);
    const keys = ['campaign_id', 'creative_id', 'channel_id', 'kol_id', 'link_id'];
    if (!keys.some(key => params.has(key))) return;
    const marker = `kol_town_attribution_${location.search}`;
    try {
      if (sessionStorage.getItem(marker) === '1') return;
    } catch (_) { /* session storage is optional */ }
    const payload = Object.fromEntries(keys.map(key => [key, params.get(key) || CONFIG[key] || null]));
    payload.campaign_id = payload.campaign_id || CONFIG.campaign_id;
    serverState.attribution = { ...payload, source: 'browser_query_local_only' };
    try { sessionStorage.setItem(marker, '1'); } catch (_) { /* optional */ }
  }

  async function refreshLeaderboard() {
    serverState.leaderboard = null;
    return null;
  }

  async function bootstrapServer() {
    serverState.bootstrapped = true;
    serverState.available = false;
    serverState.status = 'offline';
    await recordUrlAttribution();
    setServerStatus('offline');
    return true;
  }

  function setAccessTab(tab) {
    const register = tab === 'register';
    $('#register-form').hidden = !register;
    $('#login-form').hidden = register;
    $$('[data-access-tab]').forEach(button => {
      const active = button.dataset.accessTab === tab;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });
  }

  function enterAfterAccess() {
    renderAll();
    if (isKilled()) {
      showScreen('disabled');
      return;
    }
    if (state.onboardingComplete) {
      emit('play_start', { entry_state: serverState.user ? 'account_session' : 'guest_session', run: state.run });
      showScreen('town');
    } else showScreen('onboarding');
  }

  async function submitAuth(kind) {
    void kind;
    showNotice('纯静态演示', '账号功能未启用。请使用“游客进入”；进度会直接保存在当前浏览器，不会产生网络请求。');
  }

  async function logoutAccount() {
    showNotice('纯静态演示', '当前只有本地游客进度，没有可退出的远程或本地服务账号。');
  }

  async function deleteAccount() {
    resetProgress({ reload: true });
  }

  function validInteraction(type, details = {}) {
    if (interactionEmitted) return;
    interactionEmitted = true;
    emit('valid_interaction', { interaction_type: type, elapsed_ms: Math.round(performance.now() - playStartedAt), ...details });
  }

  function isKilled() {
    const queryDisabled = new URLSearchParams(location.search).get('disabled') === '1';
    let storedDisabled = false;
    try { storedDisabled = localStorage.getItem(KILL_SWITCH_KEY) === '1'; } catch (_) { storedDisabled = false; }
    return queryDisabled || storedDisabled || serverState.killSwitch;
  }

  function closeAllDialogs(except = null) {
    $$('dialog[open]').forEach(dialog => {
      if (dialog !== except) dialog.close();
    });
    syncDialogLayer();
  }

  function syncDialogLayer() {
    const hasOpenDialog = Boolean($('dialog[open]'));
    const scrim = $('#dialog-scrim');
    if (scrim) scrim.hidden = !hasOpenDialog;
    $('#app').classList.toggle('dialog-open', hasOpenDialog);
    ['#topbar', '#screens', '#bottom-nav', '#legal-strip'].forEach(selector => {
      const element = $(selector);
      if (element) element.inert = hasOpenDialog;
    });
  }

  function showDialog(dialog) {
    if (!dialog) return;
    closeAllDialogs(dialog);
    dialogReturnFocus.set(dialog, document.activeElement);
    if (!dialog.open) dialog.show();
    dialog.setAttribute('aria-modal', 'true');
    syncDialogLayer();
    requestAnimationFrame(() => {
      if (!dialog.open || dialog.contains(document.activeElement)) return;
      const firstControl = dialog.querySelector('[autofocus], input:not(:disabled), button:not(:disabled), [tabindex]:not([tabindex="-1"])');
      firstControl?.focus({ preventScroll: true });
    });
  }

  function showScreen(id, { focus = true } = {}) {
    const target = $(`#screen-${id}`);
    if (!target) return false;
    closeAllDialogs();
    $$('.screen').forEach(screen => { screen.hidden = screen !== target; });
    state.currentScreen = id;
    $('#app').dataset.fsm = id;
    if (id === 'town' && airdropRuntime.initialized && !airdropRuntime.active) {
      scheduleAirdropFlight(state.airdropFlightsSeen ? 9000 : 2200);
    }
    if (id === 'town') requestAnimationFrame(() => applyMapPan(mapPanRuntime.x, mapPanRuntime.y));
    const chromeHidden = ['access', 'disabled', 'onboarding', 'success', 'failure', 'exit'].includes(id);
    const immersiveInterior = id === 'building_interior';
    $('#topbar').hidden = chromeHidden;
    $('#bottom-nav').hidden = chromeHidden || id === 'share' || immersiveInterior;
    $('#legal-strip').hidden = chromeHidden || id === 'share' || immersiveInterior;
    $$('.nav-btn').forEach(button => {
      const isCurrent = button.dataset.nav === id || (['reskin', 'flagship', 'building_interior', 'host_profile'].includes(id) && button.dataset.nav === 'town');
      if (isCurrent) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    if (focus) requestAnimationFrame(() => (id === 'building_interior' ? $('#interior-stage') : $('h1', target))?.focus({ preventScroll: true }));
    if (id === 'success') renderSuccess();
    if (id === 'share') renderShare();
    if (id === 'ranking') renderRanking();
    if (id === 'flagship') renderFlagship();
    if (id === 'host_profile') renderHostProfile();
    if (id === 'building_interior') renderBuildingInterior();
    if (id === 'exit') $('#exit-summary').textContent = `本轮完成 ${state.completedTasks.length} 个任务，繁荣度 ${state.prosperity}，进度已保存在当前浏览器。`;
    renderTopbar();
    return true;
  }

  function toast(message) {
    const element = $('#toast');
    element.textContent = message;
    element.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => element.classList.remove('show'), 2200);
  }

  function rewardFx(bricks, prosperity) {
    const element = $('#reward-fx');
    element.textContent = `+${bricks} 砖块 · +${prosperity} 繁荣`;
    element.classList.remove('show');
    void element.offsetWidth;
    element.classList.add('show');
  }

  function showNotice(title, html, callback = null) {
    $('#notice-title').textContent = title;
    $('#notice-body').innerHTML = html;
    noticeCallback = callback;
    showDialog($('#dlg-notice'));
  }

  function showConfirm(title, body, callback) {
    $('#confirm-title').textContent = title;
    $('#confirm-body').textContent = body;
    confirmCallback = callback;
    showDialog($('#dlg-confirm'));
  }

  function closeTaskDialog() {
    clearTaskTimer();
    if ($('#dlg-task').open) $('#dlg-task').close();
    activeTask = null;
  }

  function clearTaskTimer() {
    if (taskTimer) clearInterval(taskTimer);
    taskTimer = null;
  }

  function addLedger(label, delta) {
    state.ledger.unshift({ id: uid('led'), label, delta, at: new Date().toISOString() });
    state.ledger = state.ledger.slice(0, 24);
  }

  function addBusinessLedger(label, delta, note) {
    state.businessLedger.unshift({ id: uid('biz'), label, delta, note, at: new Date().toISOString() });
    state.businessLedger = state.businessLedger.slice(0, 20);
  }

  function getPlayerName() {
    return String(serverState.user?.alias || state.playerName || '新居民').trim().slice(0, 24) || '新居民';
  }

  function syncPlayerVisuals() {
    const look = resolveAvatarLook(state.avatar);
    applyAvatarStyles($('#topbar-avatar'), state.avatar);
    applyAvatarLookArtwork($('#topbar-avatar-art'), look, 'avatar-face-art');
    applyAvatarStyles($('#player-pin'), state.avatar);
    applyAvatarLookArtwork($('#player-map-art'), look, 'player-map-art');
    applyAvatarStyles($('#interior-player'), state.avatar);
    applyAvatarLookArtwork($('#interior-player-art'), look, 'interior-player-avatar');
    const name = getPlayerName();
    $('#player-pin')?.setAttribute('aria-label', `当前玩家，${name}，居民等级 ${state.level}`);
    if ($('#player-map-label')) $('#player-map-label').textContent = `我 · ${name}`;
  }

  function renderTopbar() {
    const theme = THEMES[state.theme];
    const playerName = getPlayerName();
    $('#topbar-town').textContent = playerName;
    $('#topbar-season').textContent = `Lv.${state.level} · ${theme.town}`;
    $('#btn-town-chip').setAttribute('aria-label', `${playerName}，居民等级 ${state.level}，位于${theme.town}；打开我的居民形象`);
    $('#topbar-bricks').textContent = state.bricks;
    $$('.bricks-live').forEach(node => { node.textContent = state.bricks; });
    $('#goal-text').textContent = `任务 ${Math.min(3, state.completedTasks.length)}/3 · 繁荣度 ${Math.min(100, state.prosperity)}/100`;
    $('#goal-level').textContent = `Lv.${state.level}`;
    $('#goal-bar-fill').style.width = `${Math.min(100, Math.min(3, state.completedTasks.length) / 3 * 50 + Math.min(100, state.prosperity) / 2)}%`;
    syncPlayerVisuals();
    $('#mayor-card-avatar').setAttribute('aria-label', `和 ${THEMES[state.theme].name.split(' ')[0]} AI 分身聊聊`);
    $('#nav-task-dot').hidden = state.completedTasks.length >= Object.keys(TASKS).length;
  }

  function townSvg(mini = false) {
    const treeDots = [
      [48,216],[68,248],[318,233],[337,273],[48,339],[342,348],[104,453],[278,474],[162,166],[244,139],[75,420],[317,454]
    ];
    const trees = treeDots.map(([x,y], index) => {
      const size = index % 3 === 0 ? 34 : 29;
      return `<g transform="translate(${x} ${y})"><ellipse cx="0" cy="13" rx="12" ry="5" fill="rgba(23,22,49,.16)"/><image href="${TOWN_ART_BASE}tree${index % 5}.png" x="${-size / 2}" y="${-size + 10}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"/></g>`;
    }).join('');
    return `
      <defs>
        <linearGradient id="islandTop${mini ? 'M' : ''}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="var(--ground)"/><stop offset="1" stop-color="color-mix(in srgb,var(--ground) 72%,var(--tree))"/></linearGradient>
        <linearGradient id="islandSide${mini ? 'M' : ''}" x1="0" y1="0" x2="0" y2="1"><stop stop-color="var(--ground-2)"/><stop offset="1" stop-color="color-mix(in srgb,var(--ground-2) 55%,#1c1640)"/></linearGradient>
        <filter id="riverGlow${mini ? 'M' : ''}"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <ellipse cx="195" cy="537" rx="157" ry="34" fill="rgba(36,24,75,.15)"/>
      <path d="M25 174 L195 77 L366 175 L354 472 L196 562 L36 471 Z" fill="url(#islandSide${mini ? 'M' : ''})"/>
      <path d="M25 155 L195 58 L366 156 L354 450 L196 540 L36 451 Z" fill="url(#islandTop${mini ? 'M' : ''})" stroke="rgba(255,255,255,.35)" stroke-width="3"/>
      <path d="M39 292 C91 271 113 238 152 251 C195 266 213 348 255 353 C299 358 330 324 357 306" fill="none" stroke="rgba(34,70,120,.17)" stroke-width="38" stroke-linecap="round"/>
      <path d="M39 285 C91 264 113 231 152 244 C195 259 213 341 255 346 C299 351 330 317 357 299" fill="none" stroke="var(--river)" stroke-width="30" stroke-linecap="round" filter="url(#riverGlow${mini ? 'M' : ''})"/>
      <path d="M191 78 L188 520 M44 184 L346 426 M341 182 L58 429" fill="none" stroke="var(--road)" stroke-width="19" stroke-linecap="round" opacity=".86"/>
      <path d="M191 78 L188 520 M44 184 L346 426 M341 182 L58 429" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="3" stroke-dasharray="7 11" stroke-linecap="round"/>
      <g transform="translate(147 259) rotate(9)"><rect width="71" height="21" rx="5" fill="#8f6848"/><path d="M6 4h59M6 17h59" stroke="#c79b6e" stroke-width="3"/></g>
      ${trees}
      <g opacity=".65"><circle cx="194" cy="86" r="25" fill="none" stroke="var(--primary)" stroke-width="2"/><circle cx="194" cy="86" r="17" fill="none" stroke="var(--primary)" stroke-width="1"/></g>
    `;
  }

  function mapPanBounds() {
    const wrap = $('#map-wrap');
    const map = $('#map');
    if (!wrap || !map || !wrap.clientWidth || !map.offsetWidth) return { x: 0, y: 0 };
    return {
      x: Math.max(0, (map.offsetWidth - wrap.clientWidth) / 2 + 16),
      y: Math.max(0, (map.offsetHeight - wrap.clientHeight) / 2 + 24)
    };
  }

  function applyMapPan(x, y, { animate = false } = {}) {
    const map = $('#map');
    if (!map) return;
    const bounds = mapPanBounds();
    mapPanRuntime.x = clamp(Number(x) || 0, -bounds.x, bounds.x);
    mapPanRuntime.y = clamp(Number(y) || 0, -bounds.y, bounds.y);
    map.classList.toggle('is-resetting', animate);
    map.style.setProperty('--map-pan-x', `${mapPanRuntime.x.toFixed(1)}px`);
    map.style.setProperty('--map-pan-y', `${mapPanRuntime.y.toFixed(1)}px`);
    if (animate) setTimeout(() => map.classList.remove('is-resetting'), 320);
  }

  function resetMapPan({ announce = true, source = 'button' } = {}) {
    applyMapPan(0, 0, { animate: !reducedMotionRequested() });
    $('.map-pan-tools')?.classList.remove('has-moved');
    if (announce) {
      $('#map-pan-status').textContent = '地图已回到中心位置。';
      validInteraction('map_recenter', { source, actor_role: 'player', map_pan_x: 0, map_pan_y: 0 });
    }
  }

  function bindMapPan() {
    const map = $('#map');
    if (!map) return;
    const tools = $('.map-pan-tools');
    const finish = (event, cancelled = false) => {
      if (mapPanRuntime.pointerId === null || (event && event.pointerId !== mapPanRuntime.pointerId)) return;
      const moved = mapPanRuntime.dragging;
      if (map.hasPointerCapture?.(mapPanRuntime.pointerId)) map.releasePointerCapture(mapPanRuntime.pointerId);
      mapPanRuntime.pointerId = null;
      mapPanRuntime.dragging = false;
      map.classList.remove('is-dragging');
      if (!moved || cancelled) return;
      mapPanRuntime.suppressClickUntil = performance.now() + 420;
      tools?.classList.add('has-moved');
      $('#map-pan-status').textContent = '地图视野已移动；点回中按钮可恢复中心位置。';
      validInteraction('map_pan', {
        input_mode: event?.pointerType || 'pointer',
        actor_role: 'player',
        map_pan_x: Math.round(mapPanRuntime.x),
        map_pan_y: Math.round(mapPanRuntime.y)
      });
    };
    map.addEventListener('pointerdown', event => {
      if (event.button !== 0 || mapPanRuntime.pointerId !== null) return;
      mapPanRuntime.pointerId = event.pointerId;
      mapPanRuntime.startX = event.clientX;
      mapPanRuntime.startY = event.clientY;
      mapPanRuntime.originX = mapPanRuntime.x;
      mapPanRuntime.originY = mapPanRuntime.y;
      mapPanRuntime.dragging = false;
      map.setPointerCapture?.(event.pointerId);
    });
    map.addEventListener('pointermove', event => {
      if (event.pointerId !== mapPanRuntime.pointerId) return;
      const dx = event.clientX - mapPanRuntime.startX;
      const dy = event.clientY - mapPanRuntime.startY;
      if (!mapPanRuntime.dragging && Math.hypot(dx, dy) < 7) return;
      mapPanRuntime.dragging = true;
      map.classList.add('is-dragging');
      event.preventDefault();
      applyMapPan(mapPanRuntime.originX + dx, mapPanRuntime.originY + dy);
    });
    map.addEventListener('pointerup', event => finish(event));
    map.addEventListener('pointercancel', event => finish(event, true));
    map.addEventListener('click', event => {
      if (performance.now() >= mapPanRuntime.suppressClickUntil) return;
      event.preventDefault();
      event.stopPropagation();
    }, true);
    map.addEventListener('keydown', event => {
      if (event.target !== map) return;
      const delta = { ArrowLeft: [44, 0], ArrowRight: [-44, 0], ArrowUp: [0, 52], ArrowDown: [0, -52] }[event.key];
      if (event.key === 'Home') {
        event.preventDefault();
        resetMapPan({ source: 'keyboard' });
        return;
      }
      if (!delta) return;
      event.preventDefault();
      applyMapPan(mapPanRuntime.x + delta[0], mapPanRuntime.y + delta[1], { animate: !reducedMotionRequested() });
      tools?.classList.add('has-moved');
      $('#map-pan-status').textContent = '已使用方向键移动地图视野。';
    });
    $('#map-center-btn').addEventListener('click', () => resetMapPan());
    window.addEventListener('resize', () => applyMapPan(mapPanRuntime.x, mapPanRuntime.y));
  }

  function renderMap() {
    $('#map-bg').innerHTML = townSvg(false);
    $('#mini-map').innerHTML = townSvg(true);
    const theme = THEMES[state.theme];
    $('#map-buildings').innerHTML = BUILDINGS.map((building, index) => {
      const done = building.task && state.completedTasks.includes(building.task);
      const level = state.buildingLevels[building.id] || 1;
      const status = done ? '✓ 已完成' : building.task ? '任务可玩' : `Lv.${level}`;
      return `<button type="button" class="building ${done ? 'completed' : ''}" data-building="${building.id}" aria-label="打开${building.name}，等级 ${level}" style="left:${building.x / 3.9}%;top:${building.y / 6}%;margin-left:-48px;margin-top:-56px;z-index:${10 + index};--bld-color:${theme.buildingColors[building.themeIndex]};--art-w:${building.artWidth}px;--art-h:${building.artHeight}px">
        <span class="bld-status">${status}</span>
        <span class="iso-building" aria-hidden="true"><img class="building-art" src="${TOWN_ART_BASE}${building.art}" alt="" draggable="false" decoding="async"><span class="sign">${building.icon}</span></span>
        <span class="building-label">${building.short}</span>
      </button>`;
    }).join('');
    $$('[data-building]', $('#map-buildings')).forEach(button => button.addEventListener('click', () => walkPlayerTo(button.dataset.building)));
    $('#mayor-card-meta').textContent = `${theme.mayor} AI 分身 · 本地规则`;
    $('#mayor-card-text').textContent = state.completedTasks.length >= 3 && state.prosperity < 100
      ? `已完成 ${state.completedTasks.length} 个不同任务，还需 ${100 - state.prosperity} 繁荣度即可结算。`
      : state.completedTasks.length
        ? `已完成 ${Math.min(3, state.completedTasks.length)}/3 个目标任务，当前繁荣度 ${Math.min(100, state.prosperity)}/100。`
        : `${theme.tagline} 先从有“任务可玩”气泡的建筑开始吧。`;
    $('#success-banner').hidden = !(state.completedTasks.length >= 3 && state.prosperity >= 100);
  }


  // ---------- 小镇街头 NPC：沿当前城市场景的人行道路移动 ----------
  // v0.13.0 重新按 1024x1536 的实际运行底图描路，不再复用旧 SVG 地图的坐标。
  // 坐标为 .map 百分比；所有角色的脚底均锚定在折线路径上。
  const ROAD_NODES = Object.freeze({
    n0: [0, 44.8], n1: [14, 43.7], n2: [30, 42.2], n3: [47, 39.7], n4: [66, 36.3], n5: [83, 33.1], n6: [100, 31.4],
    m0: [0, 51.0], m1: [17, 49.5], m2: [32, 46.4], m3: [49, 43.4], m4: [68, 44.2], m5: [84, 47.2], m6: [100, 50.2],
    s0: [0, 63.0], s1: [17, 63.3], s2: [34, 64.0], s3: [51, 61.2], s4: [70, 58.5], s5: [84, 59.8], s6: [100, 64.0],
    l0: [0, 74.5], l1: [20, 71.0], l2: [39, 70.2], l3: [52, 72.0], l4: [74, 72.0], l5: [100, 69.2],
    b0: [0, 86.5], b1: [28, 82.0], b2: [51, 86.0], b3: [75, 82.8], b4: [100, 79.5]
  });
  const ROAD_EDGES = Object.freeze([
    ['n0','n1'], ['n1','n2'], ['n2','n3'], ['n3','n4'], ['n4','n5'], ['n5','n6'],
    ['m0','m1'], ['m1','m2'], ['m2','m3'], ['m3','m4'], ['m4','m5'], ['m5','m6'],
    ['s0','s1'], ['s1','s2'], ['s2','s3'], ['s3','s4'], ['s4','s5'], ['s5','s6'],
    ['l0','l1'], ['l1','l2'], ['l2','l3'], ['l3','l4'], ['l4','l5'],
    ['b0','b1'], ['b1','b2'], ['b2','b3'], ['b3','b4'],
    ['n1','m1'], ['n2','m2'], ['n3','m3'], ['n4','m4'], ['n5','m5'],
    ['m1','s1'], ['m3','s3'], ['m5','s5'],
    ['s1','l1'], ['s2','l2'], ['s3','l3'], ['s4','l4'], ['s5','l5'],
    ['l1','b1'], ['l3','b2'], ['l4','b3']
  ]);
  const NPC_Y_SCALE = 600 / 390;
  // 精灵直接从底图渲染人物中抠出（assets/generated/npc/），与场景同一渲染风格；w/h 为原图像素，按 1024 宽换算为地图百分比
  const TOWN_NPCS = Object.freeze([
    { id: 'n1', name: 'Kiki', role: '居民', sprite: 'assets/generated/npc/p1', w: 22, h: 60, hip: 0.550, mid: 0.608, pace: 3.6 },
    { id: 'n2', name: 'Rain', role: '居民', sprite: 'assets/generated/npc/p2', w: 22, h: 60, hip: 0.533, mid: 0.442, pace: 3.0 },
    { id: 'n3', name: 'Mika', role: '居民', sprite: 'assets/generated/npc/p3', w: 31, h: 67, hip: 0.493, mid: 0.512, pace: 4.2 },
    { id: 'n4', name: 'Vera', role: '居民', sprite: 'assets/generated/npc/p4', w: 22, h: 52, hip: 0.481, mid: 0.473, pace: 2.7 },
    { id: 'n5', name: 'Wen', role: '居民', sprite: 'assets/generated/npc/p5', w: 24, h: 55, hip: 0.527, mid: 0.459, pace: 3.3 }
  ]);
  const NPC_BUILDING_LINES = Object.freeze({
    htx: ['增长中心今天在开 Campaign 复盘。', '听说这里能看到整条增长航线。'],
    video: ['剧院刚换了新片。', '海报都是原创的，挺好看。'],
    live: ['广场傍晚有直播活动。', '舞台的灯又调亮了。'],
    quiz: ['学院的题目今天不难。', '先去做三道题拿砖块。'],
    predict: ['预测馆开放观测穹顶了。', '只是娱乐性的方向判断，别当真。'],
    tg: ['会所的茶吧不错。', '据说徽记藏在共创工坊。'],
    shop: ['商店到了一批新样品。', '砖块只是游戏积分。'],
    memorial: ['星片又亮了一枚。', '广场的星形中庭真安静。']
  });
  const NPC_IDLE_LINES = Object.freeze(['今天的繁荣度还差一点。', '主理人 Luna 今天也在广场。', '天气真好。', '晚点再去转一圈。']);
  const NPC_CHAT_LINES = Object.freeze(['你也来逛小镇？', '一起去预测馆看看？', '刚从会所出来。', '明天见。']);
  const npcRuntime = { started: false, frame: 0, last: 0, items: [], player: null };

  function roadPoint(id) { const [x, y] = ROAD_NODES[id]; return { x, y }; }
  function npcDistance(a, b) { return Math.hypot(a.x - b.x, (a.y - b.y) * NPC_Y_SCALE); }
  function lerpPoint(a, b, t) { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; }

  // 任意点投影到路网最近的一条边上
  function nearestRoadPoint(p) {
    let best = null;
    ROAD_EDGES.forEach(([u, v], edge) => {
      const a = roadPoint(u), b = roadPoint(v);
      const dx = b.x - a.x, dy = (b.y - a.y) * NPC_Y_SCALE;
      const len2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * NPC_Y_SCALE * dy) / len2));
      const q = lerpPoint(a, b, t);
      const d = npcDistance(p, q);
      if (!best || d < best.d) best = { edge, t, x: q.x, y: q.y, d };
    });
    return best;
  }

  // Dijkstra：从 from（边上一点）到 to（边上一点）的路点序列
  function roadPath(from, to) {
    if (from.edge === to.edge) return [{ x: from.x, y: from.y }, { x: to.x, y: to.y }];
    const adj = {};
    Object.keys(ROAD_NODES).forEach(id => { adj[id] = []; });
    ROAD_EDGES.forEach(([u, v]) => {
      const d = npcDistance(roadPoint(u), roadPoint(v));
      adj[u].push([v, d]); adj[v].push([u, d]);
    });
    const dist = {}, prev = {};
    const [fu, fv] = ROAD_EDGES[from.edge];
    dist[fu] = npcDistance(from, roadPoint(fu)); dist[fv] = npcDistance(from, roadPoint(fv));
    const open = new Set([fu, fv]);
    const [tu, tv] = ROAD_EDGES[to.edge];
    while (open.size) {
      let cur = null;
      open.forEach(id => { if (cur === null || dist[id] < dist[cur]) cur = id; });
      open.delete(cur);
      if (cur === tu || cur === tv) continue;
      adj[cur].forEach(([next, d]) => {
        const nd = dist[cur] + d;
        if (dist[next] === undefined || nd < dist[next]) { dist[next] = nd; prev[next] = cur; open.add(next); }
      });
    }
    const endNode = [tu, tv].filter(id => dist[id] !== undefined)
      .sort((p, q) => (dist[p] + npcDistance(roadPoint(p), to)) - (dist[q] + npcDistance(roadPoint(q), to)))[0];
    const nodes = [];
    for (let id = endNode; id; id = prev[id]) nodes.unshift(id);
    return [{ x: from.x, y: from.y }].concat(nodes.map(roadPoint), [{ x: to.x, y: to.y }]);
  }

  // 道路中心线同时是户外角色的碰撞导航网格：建筑占地永远不属于可走区域。
  // 每段路线在执行前重新采样；任何偏离路网的跳线都会 fail-closed，不允许穿模后再开门。
  let lastPlayerRouteAudit = null;
  function auditRoadRoute(path, target = null) {
    let maxDeviation = 0;
    let sampledPoints = 0;
    const unsafeSegments = [];
    for (let index = 1; index < path.length; index += 1) {
      const from = path[index - 1], to = path[index];
      const samples = Math.max(2, Math.ceil(npcDistance(from, to) / 0.7));
      let segmentDeviation = 0;
      for (let step = 0; step <= samples; step += 1) {
        const point = lerpPoint(from, to, step / samples);
        const deviation = nearestRoadPoint(point).d;
        sampledPoints += 1;
        segmentDeviation = Math.max(segmentDeviation, deviation);
        maxDeviation = Math.max(maxDeviation, deviation);
      }
      if (segmentDeviation > 0.35) unsafeSegments.push(index - 1);
    }
    return {
      target,
      safe: path.length >= 2 && unsafeSegments.length === 0,
      collisionModel: 'road_centerline_fail_closed',
      buildingPenetration: false,
      maxDeviation: Number(maxDeviation.toFixed(3)),
      sampledPoints,
      unsafeSegments,
      path: clone(path)
    };
  }

  function safeRoadRoute(from, to, target = null) {
    const path = roadPath(from, to);
    return { path, audit: auditRoadRoute(path, target) };
  }

  function buildingDoor(building) {
    return nearestRoadPoint({ x: building.x / 3.9, y: building.y / 6 + 4 });
  }

  // 三层骨架：上身 + 左右腿（以髋部为轴交替摆动），像素来自同一张渲染图
  function npcFigure(npc) {
    const part = name => `<img class="npc-part npc-${name}" src="${npc.sprite}-${name}.png" alt="" draggable="false" decoding="async">`;
    return `<span class="npc-rig" style="aspect-ratio:${npc.w}/${npc.h};--hip:${(npc.hip * 100).toFixed(1)}%;--mid:${(npc.mid * 100).toFixed(1)}%">${part('leg-l')}${part('leg-r')}${part('body')}</span><span class="npc-identity-label"><b>${npc.name}</b><em>${npc.role}</em></span><span class="npc-say" hidden></span>`;
  }

  // 目的地：8 栋建筑门口（投影到路边）+ 几个街角
  function npcPois() {
    const doors = BUILDINGS.map(b => {
      const road = buildingDoor(b);
      return Object.assign(road, { building: b.id });
    });
    const corners = ['n1', 'm2', 'm4', 's2', 's4', 'l1', 'l3', 'b3'].map((id, index) => {
      const p = roadPoint(id);
      const edge = ROAD_EDGES.findIndex(([u, v]) => u === id || v === id);
      const [u] = ROAD_EDGES[edge];
      return { edge, t: u === id ? 0 : 1, x: p.x, y: p.y, building: null };
    });
    return doors.concat(corners);
  }

  function pickNpcDestination(item) {
    const pois = npcPois().filter(poi => !(poi.building && poi.building === item.at) && npcDistance(item, poi) > 6);
    const weighted = pois.map(poi => ({ poi, w: 1 / (0.5 + npcDistance(item, poi) / 20) }));
    const total = weighted.reduce((sum, w) => sum + w.w, 0);
    let r = Math.random() * total;
    for (const w of weighted) { r -= w.w; if (r <= 0) return w.poi; }
    return weighted[weighted.length - 1].poi;
  }

  function startNpcTrip(item) {
    const dest = pickNpcDestination(item);
    const route = safeRoadRoute(item.road, dest, dest.building || 'street_corner');
    if (!route.audit.safe) {
      item.mode = 'dwell';
      item.dwell = 2.5;
      item.look = 1;
      return;
    }
    item.path = route.path;
    item.routeAudit = route.audit;
    item.seg = 0; item.t = 0;
    item.dest = dest;
    item.tripPace = item.npc.pace * (0.8 + Math.random() * 0.4);
    item.mode = 'walk';
  }

  function npcSay(item, text, ms = 2800) {
    const say = item.el.querySelector('.npc-say');
    say.textContent = text; say.hidden = false;
    clearTimeout(item.sayTimer);
    item.sayTimer = setTimeout(() => { say.hidden = true; }, ms);
  }

  function initTownNpcs() {
    const host = $('#town-npcs');
    if (!host || npcRuntime.started) return;
    npcRuntime.started = true;
    host.innerHTML = TOWN_NPCS.map(npc => `<div class="npc" data-npc="${npc.id}" style="width:${(npc.w / 1024 * 132).toFixed(2)}%">${npcFigure(npc)}</div>`).join('');
    const pois = npcPois();
    npcRuntime.items = TOWN_NPCS.map((npc, index) => {
      const start = pois[(index * 3 + 1) % pois.length];
      return { npc, el: host.querySelector(`[data-npc="${npc.id}"]`), x: start.x, y: start.y, road: start, at: start.building, facing: index % 2 ? -1 : 1, mode: 'dwell', dwell: 2 + Math.random() * 6, look: 1.5 + Math.random() * 2 };
    });
    npcRuntime.items.forEach(paintNpc);
    npcRuntime.last = performance.now();
    const animate = now => {
      if (!npcRuntime.started) return;
      stepNpcs(now);
      npcRuntime.frame = requestAnimationFrame(animate);
    };
    npcRuntime.frame = requestAnimationFrame(animate);
  }

  function paintNpc(item) {
    item.faceDirection = item.facing < 0 ? 'left' : 'right';
    item.el.style.left = `${item.x}%`;
    item.el.style.top = `${item.y}%`;
    item.el.style.setProperty('--facing', item.facing);
    item.el.style.setProperty('--depth', clamp(0.76 + item.y * 0.0032, 0.82, 1.06).toFixed(3));
    item.el.style.setProperty('--walk-lean', `${clamp(item.lean || 0, -2.2, 2.2).toFixed(2)}deg`);
    item.el.style.setProperty('--step-duration', `${clamp(0.78 - (item.tripPace || item.npc.pace) * 0.045, 0.48, 0.68).toFixed(2)}s`);
    item.el.dataset.direction = item.direction || 'right';
    item.el.dataset.faceDirection = item.faceDirection;
    item.el.style.zIndex = String(20 + Math.round(item.y * 2));
    item.el.classList.toggle('walking', item.mode === 'walk');
  }

  function syncPathFacing(item, from, to) {
    const dx = to.x - from.x;
    const dy = (to.y - from.y) * NPC_Y_SCALE;
    if (Math.hypot(dx, dy) < 0.01) {
      item.facing = item.facing === -1 ? -1 : 1;
      item.faceDirection = item.facing < 0 ? 'left' : 'right';
      item.direction ||= item.faceDirection;
      item.heading ??= item.facing < 0 ? 180 : 0;
      item.lean = 0;
      return;
    }
    if (Math.abs(dx) >= Math.abs(dy) * 0.42) item.direction = dx < 0 ? 'left' : 'right';
    else item.direction = dy < 0 ? 'up' : 'down';

    // 正面素材只能做左右侧身：优先使用路段真实横向分量；完全竖直时延续上一侧，避免掉头倒走。
    if (Math.abs(dx) > 0.08) item.facing = dx < 0 ? -1 : 1;
    else item.facing = item.facing === -1 ? -1 : 1;
    item.faceDirection = item.facing < 0 ? 'left' : 'right';
    item.heading = Math.atan2(dy, dx || .001) * 180 / Math.PI;
    item.lean = clamp(dx * 0.08, -2.2, 2.2);
  }

  // 沿路点序列推进一步；返回 true 表示到达
  function advanceAlongPath(item, pace, dt) {
    const from = item.path[item.seg];
    const to = item.path[item.seg + 1];
    syncPathFacing(item, from, to);
    const len = Math.max(0.5, npcDistance(from, to));
    const progress = (item.seg + item.t) / (item.path.length - 1);
    const ease = 0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, Math.max(0, progress)));
    item.t += (pace * ease * dt) / len;
    if (item.t >= 1) {
      item.seg += 1; item.t = 0;
      if (item.seg >= item.path.length - 1) {
        const end = item.path[item.path.length - 1];
        item.x = end.x; item.y = end.y;
        return true;
      }
      return false;
    }
    const p = lerpPoint(from, to, item.t);
    item.x = p.x; item.y = p.y;
    return false;
  }

  function stepNpcs(now) {
    const dt = Math.min(1, (now - npcRuntime.last) / 1000);
    npcRuntime.last = now;
    if ($('#app').dataset.fsm !== 'town' || reducedMotionRequested() || document.hidden) return;
    npcRuntime.items.forEach(item => {
      if (item.mode === 'dwell') {
        item.dwell -= dt; item.look -= dt;
        if (item.look <= 0) {
          item.facing = Math.random() < 0.5 ? -1 : 1;
          item.look = 1.5 + Math.random() * 2.5;
          if (Math.random() < 0.18) npcSay(item, item.at ? pick(NPC_BUILDING_LINES[item.at]) : pick(NPC_IDLE_LINES));
        }
        if (item.dwell <= 0) startNpcTrip(item);
      } else if (advanceAlongPath(item, item.tripPace, dt)) {
        item.road = item.dest; item.at = item.dest.building;
        item.mode = 'dwell';
        item.dwell = 4 + Math.random() * 6;
        item.look = 0.8 + Math.random() * 1.5;
        if (item.at && Math.random() < 0.6) npcSay(item, pick(NPC_BUILDING_LINES[item.at]));
      }
      paintNpc(item);
    });
    for (let i = 0; i < npcRuntime.items.length; i++) {
      for (let j = i + 1; j < npcRuntime.items.length; j++) {
        const a = npcRuntime.items[i], b = npcRuntime.items[j];
        if (a.mode !== 'dwell' || b.mode !== 'dwell' || npcDistance(a, b) > 9) continue;
        a.facing = b.x < a.x ? -1 : 1; b.facing = -a.facing;
        a.look = Math.max(a.look, 1.5); b.look = Math.max(b.look, 1.5);
        if (Math.random() < 0.004) npcSay(Math.random() < 0.5 ? a : b, pick(NPC_CHAT_LINES));
        paintNpc(a); paintNpc(b);
      }
    }
    // 当前玩家沿路走向建筑；Luna 主理人保持为独立固定角色。
    const movingPlayer = npcRuntime.player;
    if (movingPlayer) {
      const done = advanceAlongPath(movingPlayer, movingPlayer.pace, dt);
      const pin = $('#player-pin');
      pin.style.left = `${movingPlayer.x}%`; pin.style.top = `${movingPlayer.y}%`;
      pin.style.setProperty('--facing', movingPlayer.facing);
      pin.style.setProperty('--face-yaw', movingPlayer.facing < 0 ? '-10deg' : '10deg');
      pin.style.setProperty('--walk-lean', `${clamp(movingPlayer.lean || 0,-2,2).toFixed(2)}deg`);
      pin.dataset.direction = movingPlayer.direction || 'right';
      pin.dataset.faceDirection = movingPlayer.faceDirection || (movingPlayer.facing < 0 ? 'left' : 'right');
      const directionLabel = { left: '左前方', right: '右前方', up: '上方', down: '下方' }[pin.dataset.direction] || '前方';
      pin.setAttribute('aria-label', `当前玩家，${getPlayerName()}，居民等级 ${state.level}，正朝${directionLabel}行走`);
      pin.style.zIndex = String(60 + Math.round(movingPlayer.y * 2));
      if (done) {
        pin.classList.remove('walking');
        npcRuntime.player = null;
        playerWalking = false;
        openBuilding(movingPlayer.target);
      }
    }
  }

  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

  // 玩家自己的形象：点建筑先沿马路走到门口，再进入
  let playerWalking = false;
  function walkPlayerTo(id) {
    const building = BUILDINGS.find(item => item.id === id);
    const pin = $('#player-pin');
    if (!building || !pin || playerWalking) { if (!playerWalking) openBuilding(id); return; }
    if (reducedMotionRequested() || !npcRuntime.started) { openBuilding(id); return; }
    const cur = { x: parseFloat(pin.style.left || '49'), y: parseFloat(pin.style.top || '43.4') };
    const from = nearestRoadPoint(cur);
    const door = buildingDoor(building);
    const route = safeRoadRoute(from, door, id);
    lastPlayerRouteAudit = Object.assign(route.audit, {
      startSnappedToRoad: from.d > 0.35,
      originalStart: { x: cur.x, y: cur.y },
      snappedStart: { x: from.x, y: from.y }
    });
    if (!route.audit.safe) {
      playerWalking = false;
      pin.classList.remove('walking');
      $('#map-pan-status').textContent = `前往${building.name}的道路暂不可用，请稍后重试。`;
      toast('道路暂时拥堵，没有让角色穿过建筑');
      emit('error', { error_code: 'UNSAFE_OUTDOOR_ROUTE_BLOCKED', building_id: id, recoverability: 'retry' });
      return;
    }
    // 旧版本会从当前位置斜连到第二个路点。现在先吸附到最近道路，再只沿道路图边移动。
    pin.style.left = `${from.x}%`;
    pin.style.top = `${from.y}%`;
    const path = route.path;
    playerWalking = true;
    pin.classList.add('walking');
    let total = 0;
    for (let i = 1; i < path.length; i++) total += npcDistance(path[i - 1], path[i]);
    npcRuntime.player = { path, seg: 0, t: 0, x: from.x, y: from.y, facing: 1, target: id, pace: clamp(total / 3.6, 12, 20), routeAudit: lastPlayerRouteAudit };
  }

  // ---------- 小镇天空事件：品牌主题飞机 + 可点击纪念 Token ----------
  // 仅是浏览器本地演示收藏物；不连接账户、链、钱包、交易或真实奖励结算。
  function updateAirdropHud() {
    const count = $('#airdrop-count');
    const hud = $('#airdrop-hud');
    if (count) count.textContent = String(state.airdropTokens);
    if (hud) hud.setAttribute('aria-label', `已收集 ${state.airdropTokens} 枚带 HT 图标的火币主题纪念 Token。本地演示，不可交易、提现或兑换。`);
  }

  function removeAirdropToken(id, delay = 0) {
    const remove = () => {
      $(`[data-airdrop-token="${id}"]`)?.remove();
      const timer = airdropRuntime.dropTimers.get(id);
      if (timer) clearTimeout(timer);
      airdropRuntime.dropTimers.delete(id);
    };
    if (!delay) { remove(); return; }
    const prior = airdropRuntime.dropTimers.get(id);
    if (prior) clearTimeout(prior);
    airdropRuntime.dropTimers.set(id, setTimeout(remove, delay));
  }

  function animateBrickWalletGain() {
    const wallet = $('#btn-bricks');
    const counter = $('#topbar-bricks');
    if (!wallet || !counter) return;
    const target = state.bricks;
    const startValue = Number(counter.textContent) || Math.max(0, target - AIRDROP_BRICK_BONUS);
    wallet.classList.remove('wallet-gain');
    void wallet.offsetWidth;
    wallet.classList.add('wallet-gain');
    const badge = document.createElement('span');
    badge.className = 'wallet-gain-badge';
    badge.setAttribute('aria-hidden', 'true');
    badge.textContent = `+${AIRDROP_BRICK_BONUS}`;
    wallet.appendChild(badge);
    setTimeout(() => { wallet.classList.remove('wallet-gain'); badge.remove(); }, 1050);
    if (reducedMotionRequested()) {
      counter.textContent = String(target);
      return;
    }
    if (airdropRuntime.brickCountTimer) cancelAnimationFrame(airdropRuntime.brickCountTimer);
    const startedAt = performance.now();
    const tick = now => {
      const progress = Math.min(1, (now - startedAt) / 520);
      const eased = 1 - Math.pow(1 - progress, 3);
      counter.textContent = String(Math.round(startValue + (target - startValue) * eased));
      if (progress < 1) airdropRuntime.brickCountTimer = requestAnimationFrame(tick);
      else airdropRuntime.brickCountTimer = null;
    };
    airdropRuntime.brickCountTimer = requestAnimationFrame(tick);
  }

  function animateAirdropClaim(button, onArrive) {
    const wallet = $('#btn-bricks');
    if (reducedMotionRequested() || !wallet || !button.isConnected) {
      onArrive();
      return;
    }
    const sourceRect = (button.querySelector('.airdrop-token-brand') || button).getBoundingClientRect();
    const walletRect = wallet.getBoundingClientRect();
    const startX = sourceRect.left + sourceRect.width / 2;
    const startY = sourceRect.top + sourceRect.height / 2;
    const endX = walletRect.left + walletRect.width / 2;
    const endY = walletRect.top + walletRect.height / 2;
    const fly = document.createElement('span');
    fly.className = 'token-claim-fly';
    fly.setAttribute('aria-hidden', 'true');
    fly.style.left = `${startX}px`;
    fly.style.top = `${startY}px`;
    fly.style.setProperty('--claim-x', `${endX - startX}px`);
    fly.style.setProperty('--claim-y', `${endY - startY}px`);
    fly.innerHTML = '<span><img src="assets/vendor/web3icons/HT.svg" alt="" draggable="false"></span>';
    const burst = document.createElement('span');
    burst.className = 'token-claim-burst';
    burst.setAttribute('aria-hidden', 'true');
    burst.style.left = `${startX}px`;
    burst.style.top = `${startY}px`;
    burst.innerHTML = Array.from({ length: 8 }, (_, index) => `<i style="--burst-angle:${index * 45}deg"></i>`).join('');
    document.body.append(fly, burst);
    requestAnimationFrame(() => fly.classList.add('is-flying'));
    const timer = setTimeout(() => {
      airdropRuntime.claimTimers.delete(timer);
      fly.remove();
      burst.remove();
      onArrive();
    }, 720);
    airdropRuntime.claimTimers.add(timer);
  }

  function claimAirdropToken(button) {
    if (!button || button.disabled || button.classList.contains('claimed')) return;
    const id = button.dataset.airdropToken;
    button.disabled = true;
    button.classList.add('claimed');
    button.setAttribute('aria-label', '已领取带 HT 图标的火币主题纪念 Token');
    state.airdropTokens = clamp(state.airdropTokens + 1, 0, 999);
    state.airdropBrickCredits = clamp(state.airdropBrickCredits + AIRDROP_BRICK_BONUS, 0, 999999);
    state.bricks = clamp(state.bricks + AIRDROP_BRICK_BONUS, 0, 999999);
    state.totalEarned = clamp(state.totalEarned + AIRDROP_BRICK_BONUS, 0, 999999);
    addLedger('领取 HT 主题纪念 Token（本地演示）', AIRDROP_BRICK_BONUS);
    saveState();
    updateAirdropHud();
    renderWallet();
    emit('valid_interaction', {
      interaction_type: 'airdrop_token_claim',
      airdrop_theme: 'huobi_local_demo',
      collectible_id: id,
      virtual_bricks_granted: AIRDROP_BRICK_BONUS,
      airdrop_token_count: state.airdropTokens,
      external_confirmation: false,
      monetary_value: 0,
      reward_event: false,
      transferable: false,
      withdrawable: false
    });
    $('#airdrop-status').textContent = `已领取 1 枚带 HT 图标的火币主题纪念 Token，并获得 ${AIRDROP_BRICK_BONUS} 枚本地虚拟砖块。现在共有 ${state.airdropTokens} 枚纪念 Token。无现金或数字货币价值。`;
    toast(`纪念 Token 已收藏 · +${AIRDROP_BRICK_BONUS} 虚拟砖块`);
    animateAirdropClaim(button, () => {
      animateBrickWalletGain();
      rewardFx(AIRDROP_BRICK_BONUS, 0);
    });
    removeAirdropToken(id, reducedMotionRequested() ? 0 : 760);
  }

  function spawnAirdropToken(index, { staticMode = false } = {}) {
    const host = $('#airdrop-layer');
    if (!host) return null;
    const x = [24, 50, 76][index % 3];
    const drift = [-18, 12, -9][index % 3];
    const dropY = Math.round(Math.min(host.clientHeight * .53, 390));
    const id = `flight-${airdropRuntime.sequence}-token-${index + 1}`;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `airdrop-token${staticMode ? ' is-static' : ''}`;
    button.dataset.airdropToken = id;
    button.style.setProperty('--token-x', `${x}%`);
    button.style.setProperty('--drop-drift', `${drift}px`);
    button.style.setProperty('--drop-y', `${dropY}px`);
    button.style.setProperty('--drop-y-25', `${Math.round(dropY * .25)}px`);
    button.style.setProperty('--drop-y-58', `${Math.round(dropY * .58)}px`);
    button.style.setProperty('--drop-y-92', `${Math.round(dropY * .92)}px`);
    button.style.setProperty('--static-y', `${[32, 45, 58][index % 3]}%`);
    button.style.setProperty('--drop-duration', `${(7.1 + index * .35).toFixed(2)}s`);
    button.setAttribute('aria-label', '领取带 HT 图标的火币主题纪念 Token。本地演示，无现金、数字货币或兑换价值');
    button.innerHTML = `<span class="airdrop-token-visual" aria-hidden="true"><picture class="airdrop-token-picture"><source srcset="assets/optimized/town-airdrop-token-v1-256.webp" type="image/webp"><img class="airdrop-token-art" src="assets/generated/town-airdrop-token-v1.png" alt="" draggable="false" decoding="async"></picture><span class="airdrop-token-brand"><img src="assets/vendor/web3icons/HT.svg" alt="" draggable="false" decoding="async"></span></span><span class="airdrop-token-label" aria-hidden="true">领取</span>`;
    button.addEventListener('click', () => claimAirdropToken(button));
    host.appendChild(button);
    removeAirdropToken(id, staticMode ? 18000 : 11200);
    return button;
  }

  function finishAirdropFlight() {
    $('#airdrop-layer .airdrop-plane')?.remove();
    $('#airdrop-hud')?.classList.remove('in-flight');
    airdropRuntime.active = false;
    clearTimeout(airdropRuntime.cleanupTimer);
    airdropRuntime.cleanupTimer = null;
    scheduleAirdropFlight(56000);
  }

  function startAirdropFlight({ forced = false } = {}) {
    const host = $('#airdrop-layer');
    if (!host || airdropRuntime.active) return false;
    if (!forced && ($('#app').dataset.fsm !== 'town' || document.hidden)) return false;
    airdropRuntime.active = true;
    airdropRuntime.sequence += 1;
    state.airdropFlightsSeen = clamp(state.airdropFlightsSeen + 1, 0, 9999);
    saveState();
    $('#airdrop-hud')?.classList.add('in-flight');
    $('#airdrop-status').textContent = '火币主题演示飞机经过小镇，三枚降落伞纪念 Token 即将落下。';
    emit('impression', {
      placement: 'town_airdrop_flight',
      airdrop_theme: 'huobi_local_demo',
      collectible_count: 3,
      brand_asset_integrated: true,
      brand_asset_id: 'asset_web3icons_ht_token_icon',
      brand_asset_authorization: 'pending_demo_only',
      external_confirmation: false,
      monetary_value: 0
    });

    if (reducedMotionRequested()) {
      [0,1,2].forEach(index => spawnAirdropToken(index, { staticMode: true }));
      airdropRuntime.cleanupTimer = setTimeout(finishAirdropFlight, 18200);
      return true;
    }

    const plane = document.createElement('div');
    plane.className = 'airdrop-plane';
    plane.setAttribute('aria-hidden', 'true');
    plane.innerHTML = `<picture><source srcset="assets/optimized/town-airdrop-plane-v1-640.webp" type="image/webp"><img src="assets/generated/town-airdrop-plane-v1.png" alt="" draggable="false" decoding="async"></picture><span class="airdrop-plane-label">火币主题 · DEMO</span>`;
    host.appendChild(plane);
    [2450, 4100, 5750].forEach((delay, index) => {
      const timerId = `flight-${airdropRuntime.sequence}-spawn-${index}`;
      airdropRuntime.dropTimers.set(timerId, setTimeout(() => {
        airdropRuntime.dropTimers.delete(timerId);
        if (airdropRuntime.active) spawnAirdropToken(index);
      }, delay));
    });
    airdropRuntime.cleanupTimer = setTimeout(finishAirdropFlight, 10600);
    return true;
  }

  function scheduleAirdropFlight(delay = 2600) {
    if (!airdropRuntime.initialized || airdropRuntime.active) return;
    clearTimeout(airdropRuntime.flightTimer);
    airdropRuntime.flightTimer = setTimeout(() => {
      airdropRuntime.flightTimer = null;
      if ($('#app').dataset.fsm === 'town' && !document.hidden) startAirdropFlight();
      else scheduleAirdropFlight(2400);
    }, delay);
  }

  function initTownAirdrop() {
    updateAirdropHud();
    if (airdropRuntime.initialized) return;
    airdropRuntime.initialized = true;
    scheduleAirdropFlight(2600);
  }

  function openBuilding(id) {
    const building = BUILDINGS.find(item => item.id === id);
    const scene = BUILDING_SCENES[id];
    if (!building || !scene) return;
    state.currentBuilding = id;
    validInteraction('open_building', { building_id: id, destination: 'building_interior' });
    emit('valid_interaction', { interaction_type: 'enter_building_scene', building_id: id, scene_asset: scene.asset });
    renderBuildingInterior(id);
    resetInteriorRuntime(id);
    showScreen('building_interior');
  }

  function announceInterior(message) {
    const status = $('#interior-status');
    if (status) status.textContent = message;
  }

  function resetInteriorRuntime(id) {
    if (interiorRuntime.arrivalTimer) clearTimeout(interiorRuntime.arrivalTimer);
    Object.assign(interiorRuntime, {
      x: 50,
      y: 78,
      targetX: 50,
      targetY: 78,
      moving: false,
      arrivalTimer: null,
      pendingZone: null,
      sceneId: id
    });
    paintInteriorPlayer();
    announceInterior(`${BUILDING_SCENES[id]?.title || '建筑内部'}，${getPlayerName()}位于入口。点地面或使用方向键移动。`);
  }

  function paintInteriorPlayer() {
    const player = $('#interior-player');
    const world = $('#interior-world');
    if (!player || !world) return;
    const facingLabels = { up: '面向前方', down: '面向入口', left: '面向左侧', right: '面向右侧' };
    const scale = .72 + clamp(interiorRuntime.y, 12, 86) / 100 * .48;
    player.style.left = `${interiorRuntime.targetX}%`;
    player.style.top = `${interiorRuntime.targetY}%`;
    player.style.setProperty('--player-scale', scale.toFixed(3));
    const cameraX = clamp((50 - interiorRuntime.targetX) * .22, -8, 8);
    const cameraY = clamp((52 - interiorRuntime.targetY) * .12, -5, 5);
    world.style.setProperty('--camera-x', `${cameraX}px`);
    world.style.setProperty('--camera-y', `${cameraY}px`);
    player.classList.toggle('walking', interiorRuntime.moving && !state.reducedMotion);
    player.setAttribute('aria-label', `${getPlayerName()}，当前玩家，位于场景横向 ${Math.round(interiorRuntime.targetX)}%，纵向 ${Math.round(interiorRuntime.targetY)}%，${facingLabels[player.dataset.facing] || facingLabels.right}`);
  }

  function completeInteriorMove() {
    if (interiorRuntime.arrivalTimer) clearTimeout(interiorRuntime.arrivalTimer);
    interiorRuntime.arrivalTimer = null;
    interiorRuntime.x = interiorRuntime.targetX;
    interiorRuntime.y = interiorRuntime.targetY;
    interiorRuntime.moving = false;
    const player = $('#interior-player');
    player?.classList.remove('walking');
    player?.classList.add('arrived');
    setTimeout(() => player?.classList.remove('arrived'), state.reducedMotion ? 0 : 320);
    const pending = interiorRuntime.pendingZone;
    interiorRuntime.pendingZone = null;
    if (!pending) {
      announceInterior(`${getPlayerName()}已移动到场景横向 ${Math.round(interiorRuntime.x)}%，纵向 ${Math.round(interiorRuntime.y)}%。`);
      return;
    }
    const { sceneId, zoneIndex } = pending;
    const scene = BUILDING_SCENES[sceneId];
    const zone = scene?.zones[zoneIndex];
    if (!zone || sceneId !== state.currentBuilding) return;
    $$('[data-interior-zone]').forEach(button => button.removeAttribute('aria-current'));
    $(`[data-interior-zone="${zoneIndex}"]`)?.setAttribute('aria-current', 'location');
    announceInterior(`已到达${zone.label}。`);
    emit('valid_interaction', { interaction_type: 'building_scene_zone_reached', building_id: sceneId, zone: zone.label, primary: Boolean(zone.primary), input_mode: pending.inputMode });
    if (zone.primary) enterInteriorPrimary(sceneId);
    else showNotice(zone.label, `${zone.note}<br><span class="hint">你的居民角色已走到 ${scene.title} 的互动地点；这是本地分层 2.5D 场景。</span>`);
  }

  function moveInteriorPlayerTo(x, y, { zoneIndex = null, inputMode = 'tap' } = {}) {
    if (!state.currentBuilding || $('#app').dataset.fsm !== 'building_interior') return false;
    const nextX = clamp(Number(x) || 50, 8, 92);
    const nextY = clamp(Number(y) || 50, 14, 84);
    const distance = Math.hypot(nextX - interiorRuntime.x, nextY - interiorRuntime.y);
    const duration = state.reducedMotion ? 0 : clamp(180 + distance * 12, 220, 850);
    if (interiorRuntime.arrivalTimer) clearTimeout(interiorRuntime.arrivalTimer);
    interiorRuntime.targetX = nextX;
    interiorRuntime.targetY = nextY;
    interiorRuntime.moving = duration > 0;
    interiorRuntime.pendingZone = zoneIndex === null ? null : { sceneId: state.currentBuilding, zoneIndex, inputMode };
    const player = $('#interior-player');
    if (player) {
      const dx = nextX - interiorRuntime.x;
      const dy = nextY - interiorRuntime.y;
      player.dataset.facing = Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
      player.style.setProperty('--walk-duration', `${duration}ms`);
    }
    paintInteriorPlayer();
    emit('valid_interaction', { interaction_type: 'building_scene_move', building_id: state.currentBuilding, input_mode: inputMode, destination_x: Math.round(nextX), destination_y: Math.round(nextY), zone_index: zoneIndex });
    announceInterior(zoneIndex === null ? '你的居民角色正在场景内移动。' : `你的居民角色正在前往${BUILDING_SCENES[state.currentBuilding].zones[zoneIndex].label}。`);
    if (duration === 0) completeInteriorMove();
    else interiorRuntime.arrivalTimer = setTimeout(completeInteriorMove, duration + 30);
    return true;
  }

  function moveInteriorBy(direction) {
    const vectors = { up: [0, -8], down: [0, 8], left: [-8, 0], right: [8, 0] };
    const vector = vectors[direction];
    if (!vector) return;
    moveInteriorPlayerTo(interiorRuntime.targetX + vector[0], interiorRuntime.targetY + vector[1], { inputMode: `control_${direction}` });
  }

  function handleInteriorGroundTap(event) {
    if (event.target.closest('button,.interior-panel,.interior-location,.interior-help')) return;
    const world = $('#interior-world');
    if (!world) return;
    const rect = world.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width * 100;
    const y = (event.clientY - rect.top) / rect.height * 100;
    const scene = BUILDING_SCENES[state.currentBuilding];
    const nearest = scene?.zones.map((zone, index) => ({ index, distance: Math.hypot(zone.x - x, zone.y - y) })).sort((a, b) => a.distance - b.distance)[0];
    moveInteriorPlayerTo(x, y, { zoneIndex: nearest && nearest.distance < 8 ? nearest.index : null, inputMode: 'ground_tap' });
  }

  function renderBuildingInterior(id = state.currentBuilding) {
    const building = BUILDINGS.find(item => item.id === id);
    const scene = BUILDING_SCENES[id];
    if (!building || !scene) return false;
    const level = state.buildingLevels[id] || 1;
    const cost = level * 50;
    const task = building.task ? TASKS[building.task] : null;
    const done = task && state.completedTasks.includes(task.id);
    const art = $('#interior-scene-art');
    const avifSource = $('#interior-scene-source-avif');
    const source = $('#interior-scene-source');
    if (avifSource) {
      if (scene.avifAsset) avifSource.setAttribute('srcset', scene.avifAsset);
      else avifSource.removeAttribute('srcset');
    }
    if (source) {
      if (scene.optimizedAsset) source.setAttribute('srcset', scene.optimizedAsset);
      else source.removeAttribute('srcset');
    }
    if (art.getAttribute('src') !== scene.asset) art.setAttribute('src', scene.asset);
    art.alt = `${building.name}的分层 2.5D 游戏场景`;
    $('#interior-stage').dataset.sceneBuilding = id;
    $('#interior-heading').textContent = scene.title;
    $('#interior-icon').textContent = building.icon;
    $('#interior-title').textContent = building.short;
    $('#interior-level').textContent = `建筑等级 Lv.${level}`;
    $('#interior-kicker').textContent = scene.kicker;
    $('#interior-panel-title').textContent = scene.title;
    $('#interior-description').textContent = scene.description;
    const primary = $('#interior-primary');
    primary.textContent = done ? '本轮任务已完成' : scene.primary;
    primary.disabled = Boolean(done);
    const upgrade = $('#interior-upgrade');
    upgrade.textContent = state.bricks < cost ? `升级需 ${cost} 砖块` : `升级 · ${cost} 砖块`;
    upgrade.disabled = state.bricks < cost;
    upgrade.title = state.bricks < cost ? `当前 ${state.bricks} 砖块，还差 ${cost - state.bricks}` : `升级到 Lv.${level + 1}`;
    $('#interior-hotspots').innerHTML = scene.zones.map((zone, index) => `<button type="button" class="interior-hotspot" data-interior-zone="${index}" style="left:${zone.x}%;top:${zone.y}%" aria-label="前往${building.name}的${zone.label}${zone.primary ? '并进入主要玩法' : ''}"><span class="interior-hotspot-dot" aria-hidden="true">${index + 1}</span><span class="interior-hotspot-label">${zone.label}</span></button>`).join('');
    $$('[data-interior-zone]').forEach(button => button.addEventListener('click', () => {
      const zoneIndex = Number(button.dataset.interiorZone);
      const zone = scene.zones[zoneIndex];
      if (!zone) return;
      emit('valid_interaction', { interaction_type: 'building_scene_zone', building_id: id, zone: zone.label, primary: Boolean(zone.primary) });
      moveInteriorPlayerTo(zone.x, zone.y + 5, { zoneIndex, inputMode: 'hotspot' });
    }));
    if (interiorRuntime.sceneId !== id) resetInteriorRuntime(id);
    else paintInteriorPlayer();
    return true;
  }

  function enterInteriorPrimary(id = state.currentBuilding) {
    const building = BUILDINGS.find(item => item.id === id);
    if (!building) return;
    emit('valid_interaction', { interaction_type: 'building_scene_primary', building_id: id });
    if (id === 'htx') showScreen('flagship');
    else if (id === 'shop') showScreen('wallet');
    else if (building.task) startTask(building.task);
  }

  function upgradeBuilding(id) {
    const building = BUILDINGS.find(item => item.id === id);
    const level = state.buildingLevels[id] || 1;
    const cost = level * 50;
    if (state.bricks < cost) {
      showNotice('砖块不足', `当前只有 <strong>${state.bricks}</strong> 砖块，还差 <strong>${cost - state.bricks}</strong>。完成任务可获得本地虚拟砖块。`);
      return;
    }
    validInteraction('upgrade_building', { building_id: id });
    state.bricks -= cost;
    state.buildingLevels[id] = level + 1;
    state.prosperity += 8;
    state.totalProsperity += 8;
    state.level = 1 + Math.floor(state.totalProsperity / 100);
    addLedger(`升级 ${building.name} 至 Lv.${level + 1}`, -cost);
    saveState();
    if ($('#dlg-building').open) $('#dlg-building').close();
    renderAll();
    rewardFx(0, 8);
    toast(`${building.name} 已升级至 Lv.${level + 1}`);
    if (!state.firstUpgradeShown && !state.firstUpgradeThisRun) {
      state.firstUpgradeShown = true;
      state.firstUpgradeThisRun = true;
      saveState();
      $('#fu-body').textContent = `${building.name} 已升到 Lv.${level + 1}，并为本轮增加 8 点繁荣度。`;
      emit('cta_view', { cta_id: 'cta_first_upgrade_flagship', state: 'first_upgrade_modal', destination_id: 'local_flagship' });
      setTimeout(() => showDialog($('#dlg-first-upgrade')), state.reducedMotion ? 0 : 260);
    }
    checkSuccess();
  }

  function renderResidentGrowth() {
    let priorComplete = true;
    const stages = RESIDENT_GROWTH_STAGES.map(stage => {
      const raw = clamp(Number(stage.progress()) || 0, 0, 100);
      const unlocked = priorComplete;
      const progress = unlocked ? raw : 0;
      const complete = unlocked && progress >= 100;
      priorComplete = priorComplete && complete;
      return { ...stage, progress, complete, unlocked };
    });
    const current = stages.find(stage => stage.unlocked && !stage.complete) || stages[stages.length - 1];
    const overall = Math.round(stages.reduce((sum, stage) => sum + stage.progress, 0) / stages.length);
    $('#resident-growth-current').textContent = current.complete ? '本轮已贯通' : current.title;
    $('#resident-growth-progress').textContent = `${overall}%`;
    $('#resident-growth-next').textContent = current.complete ? '继续赛季共建与居民协作' : current.goal;
    $('#resident-growth-fill').style.width = `${overall}%`;
    $('#resident-growth-track').innerHTML = stages.map(stage => `<div class="resident-growth-stage ${stage.complete ? 'complete' : ''} ${stage.id === current.id ? 'current' : ''} ${stage.unlocked ? '' : 'locked'}" role="listitem" aria-label="${stage.title}，${stage.complete ? '已完成' : stage.unlocked ? `进行中 ${stage.progress}%` : '未解锁'}">
      <span>${stage.complete ? '✓' : stage.icon}</span><b>${stage.title}</b><small>${stage.complete ? '完成' : stage.unlocked ? `${stage.progress}%` : '待解锁'}</small>
    </div>`).join('');
  }

  function renderTasks() {
    renderResidentGrowth();
    const allTasks = Object.values(TASKS);
    const visible = taskFilter === 'done'
      ? allTasks.filter(task => state.completedTasks.includes(task.id))
      : allTasks.filter(task => task.category === taskFilter && !state.completedTasks.includes(task.id));
    $('#task-list').setAttribute('aria-labelledby', `tab-${taskFilter}`);
    $('#task-list').innerHTML = visible.length ? visible.map(task => {
      const done = state.completedTasks.includes(task.id);
      return `<article class="task-card ${done ? 'done' : ''}">
        <span class="task-icon task-icon-${task.id}" aria-hidden="true">${task.icon}</span>
        <span class="task-meta"><span class="task-name">${task.name}</span><span class="task-desc">${task.desc}</span><span class="reward mono">+${task.bricks} 砖块 · +${task.prosperity} 繁荣</span></span>
        <button type="button" class="btn btn-sm ${done ? 'btn-ghost' : 'btn-primary'}" data-task-start="${task.id}" ${done ? 'disabled' : ''}>${done ? '完成' : '开始'}</button>
      </article>`;
    }).join('') : `<div class="card center"><div class="h3">这里暂时没有任务</div><p class="hint">切换分类，或前往地图探索建筑。</p></div>`;
    $$('[data-task-start]').forEach(button => button.addEventListener('click', () => startTask(button.dataset.taskStart)));
    $('#streak-meta').textContent = `DAY ${state.streak} · +10 砖块`;
    const checked = state.lastCheckin === todayKey();
    $('#btn-checkin').disabled = checked;
    $('#btn-checkin').textContent = checked ? '今日已签到' : '今日签到 +10 砖块';
    $('#streak-hint').textContent = checked ? '本地签到已记录，明天可继续累计。' : '每个自然日可签到一次，连续 3 天解锁 Luna 联名发型。';
    $('#streak-days').innerHTML = Array.from({ length: 7 }, (_, index) => `<span class="streak-day ${index < state.streak ? 'on' : ''}"><b>D${index + 1}</b><span>${index < state.streak ? '✓' : `+${10 + index * 2}`}</span></span>`).join('');
  }

  function rankMetricLabel() {
    if (rankFilter === 'invite') return '有效邀请';
    if (rankFilter === 'weekly') return '本周贡献';
    return '繁荣贡献';
  }

  function rankAvatar(name, isMe = false) {
    if (isMe) return RANK_AVATARS.Luna;
    return RANK_AVATARS[name] || RANK_AVATARS.Kiki;
  }

  function renderRankBoard(rows) {
    const metric = rankMetricLabel();
    const sorted = rows.slice().sort((a, b) => a.rank - b.rank);
    const top = sorted.filter(row => row.rank <= 3);
    const visualTop = [2, 1, 3].map(rank => top.find(row => row.rank === rank)).filter(Boolean);
    const podium = visualTop.length ? `<div class="rank-podium">${visualTop.map(row => {
      const name = escapeMarkup(row.name);
      return `<article class="podium ${row.rank === 1 ? 'first' : ''}" aria-label="第 ${row.rank} 名，${name}，${row.score} ${metric}">
        <div class="podium-avatar-wrap"><img class="podium-avatar" src="${rankAvatar(row.name, row.is_me)}" alt="${name} 的游戏头像" loading="lazy"><span class="podium-medal">${row.rank}</span></div>
        <strong class="podium-name">${name}${row.is_me ? ' · 我' : ''}</strong>
        <span class="podium-stat"><strong>${row.score}</strong><small>${metric}</small></span>
      </article>`;
    }).join('')}</div>` : '';
    const remaining = sorted.filter(row => row.rank > 3);
    const list = remaining.length ? `<div class="rank-list">${remaining.map(row => {
      const name = escapeMarkup(row.name);
      return `<div class="rank-row ${row.is_me ? 'is-me' : ''}">
        <b class="rank-index mono">#${row.rank}</b>
        <img class="rank-list-avatar" src="${rankAvatar(row.name, row.is_me)}" alt="" loading="lazy">
        <span class="rank-person"><strong>${name}${row.is_me ? ' · 我' : ''}</strong><small>${row.is_me ? '本机玩家' : '小镇居民'}</small></span>
        <span class="rank-score"><strong>${row.score}</strong><small>${metric}</small></span>
      </div>`;
    }).join('')}</div>` : '';
    return `<section class="rank-board"><div class="rank-board-head"><strong>赛季领跑者</strong><span>${metric} · 本地演示</span></div>${podium}${list}</section>`;
  }

  function renderMyRank(rank, name, score, subtitle) {
    const safeName = escapeMarkup(name);
    return `<b class="rank-me-index mono">${rank ? `#${rank}` : '—'}</b>
      <img class="rank-me-avatar" src="${rankAvatar(name, true)}" alt="我的游戏头像">
      <span class="rank-person"><strong>${safeName}</strong><small>${escapeMarkup(subtitle)}</small></span>
      <span class="rank-score"><strong>${score}</strong><small>${rankMetricLabel()}</small></span>`;
  }

  function renderRanking() {
    if (serverState.leaderboard) {
      const rows = (serverState.leaderboard[rankFilter] || []).map(row => ({ ...row, rank: Number(row.rank), score: Number(row.score) }));
      $('#rank-panel').setAttribute('aria-labelledby', `rtab-${rankFilter}`);
      $('#rank-panel').innerHTML = rows.length
        ? renderRankBoard(rows)
        : '<div class="card center"><div class="h3">暂无本地榜单记录</div><p class="hint">创建演示账号并完成任务后，这里会显示真实的本机记录。</p></div>';
      const me = rows.find(row => row.is_me);
      $('#rank-me').innerHTML = serverState.user
        ? renderMyRank(me?.rank, `${serverState.user.alias} · 我`, me?.score ?? state.totalProsperity + state.completedTasks.length * 20, '本地账号 · 玩家身份')
        : renderMyRank(null, '游客 · 我', state.totalProsperity + state.completedTasks.length * 20, '注册后进入本机账号榜');
      $('#rank-source').textContent = 'S1 · LOCAL DEMO';
      $('#rank-note').textContent = serverState.leaderboard.note;
      $('#rank-predict-stat').textContent = `你的胜率 ${state.predictionAttempts ? Math.round(state.predictionWins / state.predictionAttempts * 100) : 0}% · ${state.predictionAttempts} 次`;
      $('#rank-memorial-title').textContent = `纪念广场 ${Math.min(100, state.memorialProgress)}% →`;
      $('#rank-memorial-fill').style.width = `${Math.min(100, state.memorialProgress)}%`;
      return;
    }
    const groups = {
      total: [['Mika', 426], ['Luna', 388], ['Rain', 354], ['Wen', 301], ['Kiki', 277]],
      weekly: [['Vera', 188], ['Kiki', 175], ['Luna', 162], ['Mika', 146], ['Rain', 120]],
      invite: [['Rain', 42], ['Luna', 36], ['Mika', 31], ['Kiki', 27], ['Vera', 18]]
    };
    const rows = groups[rankFilter].map((row, index) => ({ rank: index + 1, name: row[0], score: row[1], is_me: false }));
    $('#rank-panel').setAttribute('aria-labelledby', `rtab-${rankFilter}`);
    $('#rank-panel').innerHTML = renderRankBoard(rows);
    const localScore = state.totalProsperity + state.completedTasks.length * 20;
    $('#rank-me').innerHTML = renderMyRank(null, '我 · 本地玩家', localScore, `当前主题 ${THEMES[state.theme].name}`);
    $('#rank-source').textContent = 'S1 · LOCAL DEMO';
    $('#rank-note').textContent = '当前显示本地演示榜单与本浏览器进度，不代表真实排名。';
    $('#rank-predict-stat').textContent = `你的胜率 ${state.predictionAttempts ? Math.round(state.predictionWins / state.predictionAttempts * 100) : 0}% · ${state.predictionAttempts} 次`;
    $('#rank-memorial-title').textContent = `纪念广场 ${Math.min(100, state.memorialProgress)}% →`;
    $('#rank-memorial-fill').style.width = `${Math.min(100, state.memorialProgress)}%`;
  }

  function applyAvatarStyles(element, avatar) {
    if (!element) return;
    const hair = AVATAR_GROUPS.hair.find(item => item.id === avatar.hair)?.color || '#3a4152';
    const outfit = AVATAR_GROUPS.outfit.find(item => item.id === avatar.outfit)?.color || '#4a5568';
    const accessory = AVATAR_GROUPS.accessory.find(item => item.id === avatar.accessory)?.color || '#ffd55a';
    element.style.setProperty('--avatar-hair', hair);
    element.style.setProperty('--avatar-outfit', outfit);
    element.style.setProperty('--avatar-accessory-shadow', avatar.accessory === 'none' ? 'none' : `14px -13px 0 -8px ${accessory}`);
    element.dataset.accessorySymbol = ({ star: '★', headset: '◉', glasses: '◇', none: '', moon: '☾', crystal: '◆', sunglasses: '◼', beret: '●' })[avatar.accessory] || '';
    element.setAttribute('aria-label', `${AVATAR_GROUPS.hair.find(item => item.id === avatar.hair)?.name}、${AVATAR_GROUPS.outfit.find(item => item.id === avatar.outfit)?.name}、${AVATAR_GROUPS.accessory.find(item => item.id === avatar.accessory)?.name}`);
  }

  function findAvatarLook(avatar) {
    return AVATAR_LOOKS.find(look => Object.entries(look.avatar).every(([group, value]) => avatar[group] === value));
  }

  function resolveAvatarLook(avatar) {
    return findAvatarLook(avatar)
      || AVATAR_LOOKS.find(look => look.avatar.outfit === avatar.outfit)
      || AVATAR_LOOKS[0];
  }

  function applyAvatarLookArtwork(element, look, baseClass) {
    if (!element || !look) return;
    element.className = `${baseClass} ${look.asset === 'standalone' ? 'is-standalone' : 'is-atlas'}`;
    if (look.atlas) {
      element.style.setProperty('--look-x', look.atlas[0]);
      element.style.setProperty('--look-y', look.atlas[1]);
      if (baseClass === 'avatar-face-art' || baseClass === 'player-map-art') {
        element.style.setProperty('--face-y', look.atlas[1] === '100%' ? '77%' : '0%');
      }
    } else {
      element.style.removeProperty('--look-x');
      element.style.removeProperty('--look-y');
      element.style.removeProperty('--face-y');
    }
  }

  function renderAvatar() {
    let selectedLook = findAvatarLook(pendingAvatar);
    if (!selectedLook) {
      selectedLook = resolveAvatarLook(pendingAvatar);
      pendingAvatar = clone(selectedLook.avatar);
    }
    applyAvatarStyles($('#avatar-preview'), pendingAvatar);
    applyAvatarLookArtwork($('#avatar-look-art'), selectedLook, 'avatar-look-art');
    const selectedHair = AVATAR_GROUPS.hair.find(item => item.id === pendingAvatar.hair);
    const selectedOutfit = AVATAR_GROUPS.outfit.find(item => item.id === pendingAvatar.outfit);
    const selectedAccessory = AVATAR_GROUPS.accessory.find(item => item.id === pendingAvatar.accessory);
    $('#avatar-preview').dataset.look = selectedLook.id;
    $('#avatar-preview').dataset.hair = selectedHair.id;
    $('#avatar-preview').dataset.outfit = selectedOutfit.id;
    $('#avatar-preview').dataset.accessory = selectedAccessory.id;
    $('#avatar-hero-title').firstChild.textContent = `${selectedLook.name} `;
    $('#resident-profile-name').textContent = `${getPlayerName()} · 玩家`;
    $('#avatar-hero-desc').textContent = `${selectedHair.name}、${selectedOutfit.name}、${selectedAccessory.name}已统一渲染为你的居民造型。保存后只同步玩家，不会改变主理人 Luna 或她的 AI 分身。`;
    $('#avatar-presets').innerHTML = AVATAR_LOOKS.map(look => {
      const active = look.id === selectedLook.id;
      const thumbClass = look.asset === 'standalone' ? 'is-standalone' : 'is-atlas';
      const thumbStyle = look.atlas ? `--look-x:${look.atlas[0]};--look-y:${look.atlas[1]}` : '';
      return `<button type="button" class="avatar-preset${look.featured ? ' featured' : ''}" data-avatar-preset="${look.id}" aria-pressed="${active}" aria-label="${look.name}，${look.note}"><span class="avatar-preset-thumb ${thumbClass}" aria-hidden="true" style="${thumbStyle}"></span><span><strong>${look.name}</strong><small>${look.note}</small></span></button>`;
    }).join('');
    $('#avatar-groups').innerHTML = Object.entries(AVATAR_GROUPS).map(([group, items]) => {
      const labels = { hair: '发型', outfit: '服装', accessory: '配饰' };
      return `<section class="avatar-group" aria-labelledby="avatar-${group}-title"><div class="avatar-group-head"><h2 class="kicker" id="avatar-${group}-title">${labels[group]}</h2><span>${items.length} 款 · 点击自动成套</span></div><div class="avatar-options">${items.map(item => { const look = group === 'outfit' && item.id === 'mayor' ? AVATAR_LOOKS.find(candidate => candidate.id === 'mayor-daily') : AVATAR_LOOKS.find(candidate => candidate.avatar[group] === item.id); return `<button type="button" class="avatar-opt" data-avatar-group="${group}" data-avatar-value="${item.id}" aria-pressed="${pendingAvatar[group] === item.id}" aria-label="${item.name}，${item.tag}；点击切换为${look.name}整套造型"><span class="avatar-material atlas-${item.sheet || 'v1'}" aria-hidden="true" style="--atlas-x:${item.atlas[0]};--atlas-y:${item.atlas[1]}"></span><span class="avatar-option-name">${item.name}</span><span class="avatar-option-tag">${item.tag}</span><span class="avatar-opt-check" aria-hidden="true">✓</span></button>`; }).join('')}</div></section>`;
    }).join('');
    $$('[data-avatar-preset]').forEach(button => button.addEventListener('click', () => {
      const preset = AVATAR_LOOKS.find(item => item.id === button.dataset.avatarPreset);
      if (!preset) return;
      pendingAvatar = clone(preset.avatar);
      renderAvatar();
    }));
    $$('[data-avatar-group]').forEach(button => button.addEventListener('click', () => {
      const group = button.dataset.avatarGroup;
      const value = button.dataset.avatarValue;
      const look = group === 'outfit' && value === 'mayor'
        ? AVATAR_LOOKS.find(candidate => candidate.id === 'mayor-daily')
        : AVATAR_LOOKS.find(candidate => candidate.avatar[group] === value);
      if (!look) return;
      pendingAvatar = clone(look.avatar);
      renderAvatar();
    }));
    $('#avatar-save').disabled = JSON.stringify(pendingAvatar) === JSON.stringify(state.avatar);
  }

  function renderHostProfile() {
    const completed = state.completedTasks.length;
    const relationshipScore = clamp(completed * 18 + Math.min(100, state.prosperity) * .35 + (state.inviteBound ? 12 : 0), 0, 100);
    const stages = relationshipScore >= 75
      ? { name: '共建伙伴', level: 4, chapter: '共建终章' }
      : relationshipScore >= 45
        ? { name: '默契搭档', level: 3, chapter: '小镇共建' }
        : relationshipScore >= 18
          ? { name: '熟悉居民', level: 2, chapter: '主理人委托' }
          : { name: '初识', level: 1, chapter: '入镇序章' };
    $('#relationship-level').textContent = `${stages.name} Lv.${stages.level}`;
    $('#relationship-copy').textContent = completed
      ? `你已经协助 Luna 完成 ${completed} 项居民任务；继续参与建筑剧情可推进本季关系。`
      : '先完成一项由 Luna 发布的居民任务，开启主理人委托剧情。';
    $('#relationship-fill').style.width = `${relationshipScore}%`;
    $('.relationship-track').setAttribute('aria-valuenow', String(Math.round(relationshipScore)));
    $('#relationship-tasks').textContent = String(completed);
    $('#relationship-prosperity').textContent = String(state.prosperity);
    $('#relationship-chapter').textContent = stages.chapter;
    $('#host-campaign-player').textContent = getPlayerName();
  }

  function setGrowthStageFilter(stage, source = 'tabs') {
    if (!GROWTH_STAGE_POINTS[stage]) return;
    growthStageFilter = stage;
    $$('[role="tab"]', $('#growth-stage-tabs')).forEach(tab => {
      const selected = tab.dataset.tab === stage;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    emit('valid_interaction', { interaction_type: 'growth_stage_filter', lifecycle_stage: stage, source });
    renderFlagship();
  }

  function renderFlagship() {
    const activeOrder = BRAND_CAMPAIGNS.find(order => order.id === state.activeBrandOrder && state.brandOrders[order.id] === 'accepted') || null;
    const settledCount = BRAND_CAMPAIGNS.filter(order => state.brandOrders[order.id] === 'settled').length;
    const visibleOrders = growthStageFilter === 'all' ? BRAND_CAMPAIGNS : BRAND_CAMPAIGNS.filter(order => order.stage === growthStageFilter);
    $('#business-revenue').textContent = Number(state.businessRevenue).toLocaleString('zh-CN');
    $('#brand-reputation').textContent = state.brandReputation;
    $('#brand-settled-count').textContent = settledCount;
    $('#growth-external-count').textContent = '0';
    $('#brand-market-count').textContent = `${visibleOrders.length} 个 KPI 任务`;
    const campusStage = activeOrder?.stage || growthStageFilter;
    const campusPoint = GROWTH_STAGE_POINTS[campusStage] || GROWTH_STAGE_POINTS.all;
    const campusAvatar = $('.growth-campus-avatar');
    if (campusAvatar) {
      campusAvatar.style.setProperty('--campus-x', `${campusPoint.x}%`);
      campusAvatar.style.setProperty('--campus-y', `${campusPoint.y}%`);
    }
    $$('[data-growth-stage-map]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.growthStageMap === growthStageFilter)));
    const campusStatus = $('#growth-campus-status');
    if (campusStatus) campusStatus.textContent = activeOrder
      ? `Luna 位于${GROWTH_STAGE_POINTS[activeOrder.stage].label} · ${activeOrder.title}`
      : growthStageFilter === 'all' ? '点击建筑筛选 Campaign · 本地 KPI 沙盒' : `当前筛选：${campusPoint.label} · 点击其他建筑切换`;

    if (activeOrder) {
      const taskDone = Boolean(state.growthProofs[activeOrder.id]);
      $('#brand-active').innerHTML = `<article class="brand-active-card">
        <div class="brand-active-head"><span class="brand-mark" style="--brand-color:${activeOrder.color}" aria-hidden="true">${activeOrder.initials}</span><div><strong>${escapeMarkup(activeOrder.title)}</strong><small>${escapeMarkup(activeOrder.stageLabel)} · ${escapeMarkup(activeOrder.audience)}</small></div><span class="brand-status ${taskDone ? 'ready' : ''}">${taskDone ? '待验收' : '演练中'}</span></div>
        <div class="brand-contract-strip"><span><small>本地交付</small><b>${escapeMarkup(activeOrder.localProof)}</b></span><span><small>主 KPI</small><b>${escapeMarkup(activeOrder.kpi)}</b></span><span><small>确认源</small><b>${escapeMarkup(activeOrder.source)}</b></span></div>
        <div class="brand-active-actions"><button type="button" class="btn ${taskDone ? 'btn-accent' : 'btn-primary'} btn-block" data-brand-${taskDone ? 'settle' : 'task'}="${activeOrder.id}">${taskDone ? '提交本地 Campaign 验收' : '继续增长航线演练'}</button></div>
      </article>`;
    } else {
      $('#brand-active').innerHTML = `<div class="brand-active-empty"><strong>${settledCount === BRAND_CAMPAIGNS.length ? '本季增长任务已全部交付' : '当前没有执行中的增长任务'}</strong><span>${settledCount === BRAND_CAMPAIGNS.length ? '本地交付记录会保留在经营账本。' : '从任务库选择一个营销阶段；每个 Campaign 只绑定一个主 KPI。'}</span></div>`;
    }

    $('#brand-order-list').innerHTML = visibleOrders.map(order => {
      const savedStatus = state.brandOrders[order.id];
      const isActive = activeOrder?.id === order.id;
      const taskDone = Boolean(state.growthProofs[order.id]);
      const status = savedStatus === 'settled' ? 'settled' : isActive && taskDone ? 'ready' : isActive ? 'accepted' : 'available';
      const statusLabel = { available: '可启动', accepted: '演练中', ready: '待验收', settled: '已交付' }[status];
      let action = `<button type="button" class="btn btn-sm btn-primary" data-brand-accept="${order.id}">启动 Campaign</button>`;
      if (status === 'accepted') action = `<button type="button" class="btn btn-sm btn-primary" data-brand-task="${order.id}">继续演练</button>`;
      if (status === 'ready') action = `<button type="button" class="btn btn-sm btn-accent" data-brand-settle="${order.id}">提交本地验收</button>`;
      if (status === 'settled') action = '<button type="button" class="btn btn-sm btn-ghost" disabled>本地已交付</button>';
      if (status === 'available' && activeOrder) action = '<button type="button" class="btn btn-sm btn-ghost" disabled>已有任务</button>';
      return `<article class="brand-order-card ${isActive ? 'is-active' : ''} ${status === 'settled' ? 'is-settled' : ''}">
        <div class="brand-order-head"><span class="brand-mark" style="--brand-color:${order.color}" aria-hidden="true">${order.initials}</span><div><strong>${escapeMarkup(order.title)}</strong><small>${escapeMarkup(order.brand)} · ${escapeMarkup(order.category)}</small></div><span class="brand-stage-tag">${escapeMarkup(order.stageLabel)}</span><span class="brand-status ${status}">${statusLabel}</span></div>
        <p class="brand-order-copy">${escapeMarkup(order.objective)}</p>
        <div class="brand-kpi-line" style="--brand-color:${order.color}"><span>交易所主 KPI · 必须外部确认</span><strong>${escapeMarkup(order.kpi)}</strong><small>${escapeMarkup(order.source)} · ${escapeMarkup(order.externalEvent)}</small></div>
        <div class="brand-order-meta"><span><small>本地玩法证据</small><b>${escapeMarkup(order.localProof)}</b></span><span><small>模拟交付</small><b>${order.payout} 经营金</b></span><span><small>目标用户</small><b>${escapeMarkup(order.audience)}</b></span></div>
        <div class="brand-order-action"><span>${escapeMarkup(order.risk)} · 真实 KPI 当前为 0</span>${action}</div>
      </article>`;
    }).join('');

    $('#business-ledger').innerHTML = state.businessLedger.length ? state.businessLedger.map(entry => `<div class="business-ledger-row"><span><strong>${escapeMarkup(entry.label)}</strong><small>${escapeMarkup(entry.note)} · ${new Date(entry.at).toLocaleString('zh-CN', { hour12: false })}</small></span><output class="mono">${entry.delta > 0 ? '+' : ''}${entry.delta}</output></div>`).join('') : '<p class="business-ledger-empty">接单与交付记录将在这里生成；不写入真实财务系统。</p>';

    $$('[data-brand-accept]').forEach(button => button.addEventListener('click', () => acceptBrandCampaign(button.dataset.brandAccept)));
    $$('[data-brand-task]').forEach(button => button.addEventListener('click', () => openBrandCampaignTask(button.dataset.brandTask)));
    $$('[data-brand-settle]').forEach(button => button.addEventListener('click', () => settleBrandCampaign(button.dataset.brandSettle)));

    const theme = THEMES[state.theme];
    $('#invite-code').textContent = theme.invite;
    $('#bind-status').textContent = state.inviteBound ? '本机已绑定 · 新人演示卡已加入卡包' : '未绑定 · 仅在当前浏览器记录并解锁演示卡';
    $('#btn-bind-code').disabled = state.inviteBound;
    $('#btn-bind-code').textContent = state.inviteBound ? '本地已绑定' : '绑定本地演示邀请码';
    const perks = [
      { id: 'coffee', name: '小镇咖啡体验卡', cost: 60, note: '本地演示卡 · 无实际兑付效力' },
      { id: 'badge', name: '旗舰楼纪念徽章卡', cost: 90, note: '仅保存到本机权益卡包' }
    ];
    $('#perk-list').innerHTML = perks.map(perk => {
      const owned = state.benefits.includes(perk.id);
      const shortage = Math.max(0, perk.cost - state.bricks);
      return `<div class="list-row"><span class="ico-box" aria-hidden="true">✦</span><span class="grow"><span class="h3">${perk.name}</span><span class="hint">${perk.note}${shortage && !owned ? ` · 还差 ${shortage} 砖块` : ''}</span></span><button type="button" class="btn btn-sm ${owned ? 'btn-ghost' : 'btn-accent'}" data-perk="${perk.id}" ${owned || shortage ? 'disabled' : ''}>${owned ? '已加入' : `${perk.cost} 砖块`}</button></div>`;
    }).join('');
    $$('[data-perk]').forEach(button => button.addEventListener('click', () => redeemPerk(button.dataset.perk)));
  }

  function acceptBrandCampaign(id) {
    const order = BRAND_CAMPAIGNS.find(item => item.id === id);
    if (!order || state.brandOrders[id] !== 'available') return;
    if (state.activeBrandOrder) {
      showNotice('已有执行中的任务', '请先完成当前增长 Campaign 并提交本地验收，再启动下一项 KPI 任务。');
      return;
    }
    state.activeBrandOrder = id;
    state.brandOrders[id] = 'accepted';
    state.growthProofs[id] = false;
    addBusinessLedger(`启动 ${order.stageLabel} Campaign`, 0, `${order.title} · 主 KPI ${order.kpi} · 条款锁定`);
    emit('valid_interaction', { interaction_type: 'growth_campaign_accept', brand_campaign_id: id, lifecycle_stage: order.stage, growth_kpi: order.kpi, external_confirmation: false, settlement_mode: 'simulated_no_value' });
    saveState();
    renderFlagship();
    showNotice('增长 Campaign 已启动', `<strong>${escapeMarkup(order.stageLabel)} · ${escapeMarkup(order.title)}</strong><br>主 KPI：${escapeMarkup(order.kpi)}。本地将完成“${escapeMarkup(order.localProof)}”，真实 KPI 仍需 ${escapeMarkup(order.source)} 回传。`);
  }

  function openBrandCampaignTask(id) {
    const order = BRAND_CAMPAIGNS.find(item => item.id === id);
    if (!order || state.activeBrandOrder !== id || state.brandOrders[id] !== 'accepted') return;
    if (state.growthProofs[id]) {
      renderFlagship();
      showNotice('本地玩法证据已完成', `可以提交 Campaign 本地验收；${escapeMarkup(order.kpi)} 仍需外部系统确认。`);
      return;
    }
    growthRun = { campaignId: id, step: 0, mistakes: 0, advanceTimer: null };
    emit('level_start', { level_id: `growth_${id}`, brand_campaign_id: id, lifecycle_stage: order.stage, growth_kpi: order.kpi, external_confirmation: false });
    renderGrowthRun();
    showDialog($('#dlg-growth-run'));
  }

  function clearGrowthRun() {
    if (growthRun?.advanceTimer) clearTimeout(growthRun.advanceTimer);
    growthRun = null;
  }

  function renderGrowthRun() {
    if (!growthRun) return;
    const order = BRAND_CAMPAIGNS.find(item => item.id === growthRun.campaignId);
    if (!order) return;
    const question = order.steps[growthRun.step];
    const progress = growthRun.step / order.steps.length * 100;
    $('#growth-run-kicker').textContent = `${order.stageLabel.toUpperCase()} · ${order.category} · LOCAL`;
    $('#growth-run-title').textContent = order.title;
    $('#growth-run-body').innerHTML = `<div class="task-progress" aria-label="增长任务进度 ${growthRun.step}/${order.steps.length}"><span style="width:${progress}%"></span></div>
      <div class="growth-run-scene" data-stage-label="${escapeMarkup(order.stageLabel)}" role="img" aria-label="统一等距建筑语言绘制的${escapeMarkup(order.stageLabel)}营销站点"></div>
      <div class="growth-run-summary"><span class="brand-mark" style="--brand-color:${order.color}" aria-hidden="true">${order.initials}</span><div><strong>${escapeMarkup(order.localProof)}</strong><small>${escapeMarkup(order.audience)} · ${escapeMarkup(order.risk)}</small></div></div>
      <div class="growth-run-kpi"><span><small>本地交付</small><b>${escapeMarkup(order.localProof)}</b></span><span><small>外部主 KPI</small><b>${escapeMarkup(order.kpi)}</b></span></div>
      <section class="growth-question"><div class="growth-step-footer"><span class="mono">DECISION ${growthRun.step + 1} / ${order.steps.length}</span><span>错误可重选 · 不扣积分</span></div><h3 class="h2">${escapeMarkup(question.q)}</h3></section>
      <div class="choice-grid">${question.options.map((option, index) => `<button type="button" class="choice" data-growth-choice="${index}"><span class="pill-soft mono">${String.fromCharCode(65 + index)}</span>&nbsp; ${escapeMarkup(option)}</button>`).join('')}</div>
      <div class="feedback" id="growth-feedback" role="status" aria-live="polite">选择符合 Campaign Contract 与数据口径的做法。</div>`;
    $$('[data-growth-choice]').forEach(button => button.addEventListener('click', () => answerGrowthStep(Number(button.dataset.growthChoice))));
  }

  function answerGrowthStep(choice) {
    if (!growthRun) return;
    const order = BRAND_CAMPAIGNS.find(item => item.id === growthRun.campaignId);
    const question = order?.steps[growthRun.step];
    if (!question || growthRun.advanceTimer) return;
    const button = $(`[data-growth-choice="${choice}"]`, $('#growth-run-body'));
    const feedback = $('#growth-feedback');
    const correct = choice === question.answer;
    emit('valid_interaction', { interaction_type: 'growth_decision', brand_campaign_id: order.id, lifecycle_stage: order.stage, decision_step: growthRun.step + 1, outcome: correct ? 'correct' : 'retry', external_confirmation: false });
    if (!correct) {
      growthRun.mistakes += 1;
      button?.classList.add('wrong');
      feedback.className = 'feedback bad';
      feedback.textContent = `这会混淆 KPI 或突破安全边界。${question.note} 请重新选择。`;
      return;
    }
    $$('[data-growth-choice]', $('#growth-run-body')).forEach(choiceButton => { choiceButton.disabled = true; });
    button?.classList.add('correct');
    feedback.className = 'feedback good';
    feedback.textContent = `正确。${question.note}`;
    growthRun.advanceTimer = setTimeout(() => {
      if (!growthRun || !$('#dlg-growth-run').open) return;
      growthRun.advanceTimer = null;
      if (growthRun.step >= order.steps.length - 1) completeGrowthMission(order.id);
      else { growthRun.step += 1; renderGrowthRun(); }
    }, 650);
  }

  function completeGrowthMission(id) {
    const order = BRAND_CAMPAIGNS.find(item => item.id === id);
    if (!order || state.activeBrandOrder !== id || state.brandOrders[id] !== 'accepted') return;
    const mistakes = growthRun?.mistakes || 0;
    state.growthProofs[id] = true;
    addBusinessLedger(`本地玩法交付 · ${order.stageLabel}`, 0, `${order.localProof} · 外部 KPI 未确认`);
    emit('level_complete', { level_id: `growth_${id}`, brand_campaign_id: id, lifecycle_stage: order.stage, growth_kpi: order.kpi, mistakes, local_proof_complete: true, external_confirmation: false });
    saveState();
    growthRun = null;
    $('#dlg-growth-run').close();
    renderAll();
    showNotice('增长航线演练完成', `<strong>${escapeMarkup(order.localProof)}</strong><br>Campaign 已达到本地验收条件。${escapeMarkup(order.kpi)} 仍为“待 ${escapeMarkup(order.source)} 回传”，当前不计入真实转化。`);
  }

  function settleBrandCampaign(id) {
    const order = BRAND_CAMPAIGNS.find(item => item.id === id);
    if (!order || state.activeBrandOrder !== id || state.brandOrders[id] !== 'accepted') return;
    if (!state.growthProofs[id]) {
      showNotice('尚未达到验收条件', `请先完成“${escapeMarkup(order.localProof)}”。`);
      return;
    }
    state.brandOrders[id] = 'settled';
    state.activeBrandOrder = null;
    state.businessRevenue = clamp(state.businessRevenue + order.payout, 0, 1000000);
    state.brandReputation = clamp(state.brandReputation + order.reputation, 0, 100);
    addBusinessLedger(`Campaign 本地验收 · ${order.stageLabel}`, order.payout, `${order.localProof} · ${order.kpi} 未外部确认`);
    emit('valid_interaction', { interaction_type: 'growth_campaign_local_acceptance', brand_campaign_id: id, lifecycle_stage: order.stage, growth_kpi: order.kpi, simulated_business_revenue: order.payout, settlement_mode: 'simulated_no_value', external_confirmation: false });
    saveState();
    renderAll();
    showNotice('Campaign 本地验收通过', `<strong>+${order.payout} 模拟经营金</strong> · 运营评级 +${order.reputation}<br><span class="hint">只表示本地玩法交付完成；${escapeMarkup(order.kpi)} 仍未由交易所确认，不代表真实转化、收入或结算。</span>`);
  }

  function renderWallet() {
    $$('.bricks-live').forEach(node => { node.textContent = state.bricks; });
    $('#bal-earned').textContent = `累计获得 ${state.totalEarned}`;
    $('#wallet-airdrop-count').textContent = String(state.airdropTokens);
    $('#wallet-airdrop-credit').textContent = `累计带来 +${state.airdropBrickCredits} 虚拟砖块`;
    $('#wallet-connect').textContent = state.walletConnected ? '断开模拟' : '模拟连接';
    $('#wallet-connect').setAttribute('aria-pressed', String(state.walletConnected));
    $('#wallet-dot').classList.toggle('on', state.walletConnected);
    $('#wallet-addr').textContent = state.walletConnected ? 'LOCAL-DEMO · 已连接（未读取地址）' : '未连接 · 仅为界面演示';
    const cards = [
      { id: 'resident', name: '小镇居民卡', note: `Lv.${state.level} · 本地进度身份`, always: true },
      { id: 'welcome', name: '新人礼包演示卡', note: '邀请码模拟绑定后出现', always: state.inviteBound },
      { id: 'coffee', name: '咖啡体验演示卡', note: '无实际兑付效力', always: state.benefits.includes('coffee') },
      { id: 'badge', name: '旗舰徽章演示卡', note: '仅保存在本机', always: state.benefits.includes('badge') }
    ].filter(card => card.always);
    $('#card-pack').innerHTML = cards.map(card => `<article class="perk-card"><div class="kicker mono on-dark">BENEFIT · LOCAL</div><h2 class="h2 on-dark">${card.name}</h2><p class="body-sm on-dark-soft">${card.note}</p><div class="mono" style="position:absolute;bottom:15px">NO VALUE · DEMO</div></article>`).join('');
    $('#ledger').innerHTML = state.ledger.length ? state.ledger.map(entry => `<div class="ledger-row"><span><strong>${entry.label}</strong><span class="hint mono"> ${new Date(entry.at).toLocaleString('zh-CN', { hour12: false })}</span></span><strong class="mono" style="color:${entry.delta >= 0 ? 'var(--green)' : 'var(--danger)'}">${entry.delta >= 0 ? '+' : ''}${entry.delta}</strong></div>`).join('') : '<p class="hint">暂无记录</p>';
  }

  function renderAccount() {
    $('#settings-build').textContent = `DEMO / LOCAL · v${CONFIG.playable_version}`;
    $('#account-title').textContent = '本地游客身份';
    $('#account-subtitle').textContent = '进度仅保存在当前浏览器 · 无网络请求';
    $('#settings-account-action').hidden = true;
    $('#settings-logout').hidden = true;
    $('#settings-delete-account').hidden = true;
    $('#account-role-note').textContent = '玩家身份 · KOL 资格、商业权限、结算与真实奖励均未开放';
    setServerStatus(serverState.status, serverState.error);
  }

  function renderThemes() {
    $('#theme-cards').innerHTML = Object.values(THEMES).map(theme => `<button type="button" class="theme-card" role="radio" data-theme-value="${theme.id}" aria-checked="${state.theme === theme.id}"><span class="h3">${theme.name}</span><span class="theme-preview" aria-hidden="true">${theme.colors.map(color => `<span style="--preview:${color}"></span>`).join('')}</span><span class="body-sm">${theme.tagline}</span></button>`).join('');
    $$('[data-theme-value]').forEach(button => button.addEventListener('click', () => setTheme(button.dataset.themeValue)));
    $$('[data-theme-pick]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.themePick === state.theme)));
  }

  function renderShare() {
    const theme = THEMES[state.theme];
    const shareText = `我在 ${theme.town} 完成了 ${state.completedTasks.length} 个街区任务，繁荣度 ${state.prosperity}！\nDEMO / LOCAL · 砖块为虚拟游戏积分，无现金或投资价值。`;
    $('#share-text').textContent = shareText;
    $('#share-card').innerHTML = `<div class="kicker mono on-dark">KOL TOWN · DEMO / LOCAL</div><h2 class="share-card-title">我为 ${theme.town}<br>点亮了 ${state.prosperity} 繁荣度</h2><div class="share-card-map"><svg viewBox="0 0 390 600" width="100%" height="100%">${townSvg(true)}</svg></div><div class="share-card-foot"><div class="share-card-profile"><div class="share-card-avatar" id="share-card-avatar" aria-hidden="true"></div><div><div class="h3 on-dark">${state.completedTasks.length} 个任务 · Lv.${state.level}</div><div class="body-sm on-dark-soft">${theme.tagline}</div></div></div><span class="demo-badge inline">LOCAL</span></div>`;
    applyAvatarStyles($('#share-card-avatar'), state.avatar);
  }

  function renderSuccess() {
    applyAvatarStyles($('#success-avatar'), state.avatar);
    $('#success-line').textContent = `${THEMES[state.theme].town} 已完成本轮目标：至少 3 个不同任务，并达到 100 繁荣度。`;
    $('#success-stats').innerHTML = `<div class="stat"><dt>不同任务</dt><dd>${state.completedTasks.length}</dd></div><div class="stat"><dt>繁荣度</dt><dd>${state.prosperity}</dd></div><div class="stat"><dt>砖块余额</dt><dd>${state.bricks}</dd></div>`;
    $('#confetti').innerHTML = Array.from({ length: 26 }, (_, index) => `<i style="left:${(index * 37) % 100}%;--c:${THEMES[state.theme].colors[index % 4]};--d:${3 + index % 4}s;--delay:-${index % 5}s"></i>`).join('');
  }

  function renderAll() {
    document.documentElement.dataset.theme = state.theme;
    $('#app').classList.toggle('reduce-motion', state.reducedMotion);
    $('#settings-motion').setAttribute('aria-checked', String(state.reducedMotion));
    renderTopbar();
    renderMap();
    initTownNpcs();
    initTownAirdrop();
    if (state.currentBuilding) renderBuildingInterior(state.currentBuilding);
    renderTasks();
    renderRanking();
    renderAvatar();
    renderHostProfile();
    renderFlagship();
    renderWallet();
    renderAccount();
    renderThemes();
    renderKolChat();
    updateOnboarding();
  }

  function updateOnboarding() {
    const theme = THEMES[state.theme];
    const steps = [
      { body: '我是主理人 Luna。你会以自己的居民身份探索小镇；点建筑或方向键让居民角色移动，抵达地点后触发互动任务。', action: '好呀，出发' },
      { body: '完成 3 个不同任务，并把繁荣度提升到 100，就能进入本地成功结算。限时预测也可能失败，但可以重试。', action: '目标记住了' },
      { body: '所有钱包、邀请码、权益、分享与 CTA 都是本地模拟；不会索取地址、私钥、KYC 或联系方式。', action: '进入小镇' }
    ];
    const step = steps[onboardingStep];
    $('#onb-kol').textContent = theme.name.split(' ')[0];
    $('#onb-speaker').textContent = `主理人 ${theme.mayor} · KOL`;
    $('#onb-body').textContent = step.body;
    $('#onb-next').textContent = step.action;
    $('#onb-step').textContent = `第 ${onboardingStep + 1}/3 步 · 稍后可体验演示邀请码`;
    $$('#onb-dots span').forEach((dot, index) => dot.classList.toggle('on', index === onboardingStep));
  }

  function startTown() {
    state.onboardingComplete = true;
    state.currentScreen = 'town';
    saveState();
    emit('play_start', { entry_state: 'onboarding_complete', run: state.run });
    showScreen('town');
    renderAll();
    toast('欢迎来到小镇，先选择一栋有任务气泡的建筑');
  }

  function startTask(id, retry = false) {
    const task = TASKS[id];
    if (!task) return;
    if (state.completedTasks.includes(id)) {
      showNotice('本轮已完成', `${task.name} 已计入本轮进度。重玩下一轮后可再次体验。`);
      return;
    }
    validInteraction('start_task', { task_id: id, building_id: task.building });
    closeAllDialogs();
    if (['failure', 'success', 'exit'].includes(state.currentScreen)) showScreen('town');
    state.currentBuilding = task.building;
    state.taskAttempts[id] = (state.taskAttempts[id] || 0) + 1;
    activeTask = { id, step: 0, score: 0, selected: null, collected: [], reactions: 0, retry };
    $('#task-dialog-title').textContent = task.name;
    $('#task-dialog-kicker').textContent = `LEVEL · ${task.building.toUpperCase()} · 尝试 ${state.taskAttempts[id]}`;
    $('#task-dialog-legal').textContent = id === 'predict'
      ? '仅为互动玩法，不构成投资建议。砖块为虚拟游戏积分，无现金或投资价值。'
      : '砖块为虚拟游戏积分，无现金或投资价值。';
    emit('level_start', { level_id: id, task_id: id, building_id: task.building, difficulty: id === 'predict' ? 2 : 1, attempt: state.taskAttempts[id], retry });
    showDialog($('#dlg-task'));
    renderActiveTask();
  }

  function renderActiveTask() {
    if (!activeTask) return;
    if (activeTask.id === 'quiz') renderQuiz();
    else if (activeTask.id === 'predict') renderPrediction();
    else if (activeTask.id === 'live') renderLive();
    else if (activeTask.id === 'story') renderStory();
    else if (activeTask.id === 'community') renderCollection(false);
    else if (activeTask.id === 'memorial') renderCollection(true);
  }

  function renderQuiz() {
    const question = QUIZ[activeTask.step];
    const progress = activeTask.step / QUIZ.length * 100;
    $('#task-dialog-body').innerHTML = `<div class="task-progress" aria-label="答题进度 ${activeTask.step}/${QUIZ.length}"><span style="width:${progress}%"></span></div><div class="quiz-scene" role="img" aria-label="Luna 在知识学院探索发光题卡"></div><div><div class="kicker mono">QUESTION ${activeTask.step + 1} / ${QUIZ.length}</div><h3 class="h2">${question.q}</h3></div><div class="choice-grid">${question.options.map((option, index) => `<button type="button" class="choice" data-quiz-choice="${index}"><span class="pill-soft mono">${String.fromCharCode(65 + index)}</span>&nbsp; ${option}</button>`).join('')}</div><div class="feedback" id="quiz-feedback">选择一个答案后继续。</div>`;
    $$('[data-quiz-choice]').forEach(button => button.addEventListener('click', () => answerQuiz(Number(button.dataset.quizChoice))));
  }

  function answerQuiz(choice) {
    const question = QUIZ[activeTask.step];
    const correct = choice === question.answer;
    if (correct) activeTask.score += 1;
    $$('[data-quiz-choice]').forEach(button => {
      button.disabled = true;
      const value = Number(button.dataset.quizChoice);
      button.classList.toggle('correct', value === question.answer);
      button.classList.toggle('wrong', value === choice && !correct);
    });
    const feedback = $('#quiz-feedback');
    feedback.className = `feedback ${correct ? 'good' : 'bad'}`;
    feedback.textContent = `${correct ? '回答正确。' : '这题不对。'} ${question.note}`;
    setTimeout(() => {
      if (!activeTask) return;
      activeTask.step += 1;
      if (activeTask.step >= QUIZ.length) completeTask('quiz', { correct_answers: activeTask.score, total_questions: QUIZ.length });
      else renderQuiz();
    }, state.reducedMotion ? 0 : 900);
  }

  function renderPrediction() {
    const attempt = state.taskAttempts.predict || 1;
    activeTask.outcome = attempt % 2 === 1 ? 'down' : 'up';
    activeTask.remaining = 8;
    const points = activeTask.outcome === 'up' ? '5,72 65,58 125,64 184,41 242,51 300,17' : '5,28 65,36 125,24 184,49 242,43 300,72';
    $('#task-dialog-body').innerHTML = `<div class="prediction-board"><div class="row" style="justify-content:space-between"><div><div class="kicker mono on-dark">LOCAL SIMULATION</div><div class="h2 on-dark">方向观察窗</div></div><div class="timer-ring" id="prediction-ring"><span id="prediction-time">8</span></div></div><div class="ticker-line"><svg viewBox="0 0 305 90" preserveAspectRatio="none" aria-hidden="true"><polyline class="ticker-path" points="${points}"/></svg></div><div class="hint on-dark" style="position:absolute;bottom:12px">模拟序列 · 不代表任何真实市场</div></div><div class="choice-grid" style="grid-template-columns:1fr 1fr"><button type="button" class="choice" data-direction="up">↗ 选择上行</button><button type="button" class="choice" data-direction="down">↘ 选择下行</button></div><div class="feedback" id="prediction-feedback">请在倒计时结束前选择一个方向。仅为互动玩法，不构成投资建议。</div>`;
    $$('[data-direction]').forEach(button => button.addEventListener('click', () => {
      activeTask.selected = button.dataset.direction;
      $$('[data-direction]').forEach(item => {
        item.setAttribute('aria-pressed', String(item === button));
        item.classList.toggle('correct', item === button);
      });
      $('#prediction-feedback').textContent = `已锁定「${activeTask.selected === 'up' ? '上行' : '下行'}」，等待本地模拟序列揭晓。`;
    }));
    clearTaskTimer();
    taskTimer = setInterval(() => {
      if (!activeTask || activeTask.id !== 'predict') return clearTaskTimer();
      activeTask.remaining -= 1;
      const time = $('#prediction-time');
      const ring = $('#prediction-ring');
      if (time) time.textContent = activeTask.remaining;
      if (ring) ring.style.setProperty('--timer', `${activeTask.remaining / 8 * 100}%`);
      if (activeTask.remaining <= 0) resolvePrediction();
    }, 1000);
  }

  function resolvePrediction() {
    clearTaskTimer();
    if (!activeTask) return;
    const selected = activeTask.selected;
    const outcome = activeTask.outcome;
    state.predictionAttempts += 1;
    if (selected && selected === outcome) {
      state.predictionWins += 1;
      completeTask('predict', { selected_direction: selected, simulated_outcome: outcome, result: 'success' });
      return;
    }
    const reason = selected ? `你选择了${selected === 'up' ? '上行' : '下行'}，本地模拟序列结果为${outcome === 'up' ? '上行' : '下行'}。` : '倒计时结束前没有选择方向。';
    retryTaskId = 'predict';
    emit('play_fail', { reason: selected ? 'prediction_mismatch' : 'prediction_timeout', selected_direction: selected, simulated_outcome: outcome, score: state.prosperity, duration_ms: Math.round(performance.now() - playStartedAt) });
    saveState();
    closeTaskDialog();
    $('#failure-reason').textContent = `${reason} 这是本地娱乐互动，不造成任何真实损失。`;
    showScreen('failure');
    renderRanking();
  }

  function renderLive() {
    if (activeTask.step === 0) {
      $('#task-dialog-body').innerHTML = `<div class="story-scene" style="--scene:#bd356c;--scene-position:55% 48%" role="img" aria-label="Luna 的小镇夜间创作者工作室"><div class="story-copy"><div class="kicker mono on-dark">LIVE PREVIEW · LOCAL</div><h3 class="h2 on-dark">Luna 的小镇夜谈</h3><p class="body-sm on-dark-soft">模拟直播不会播放远程视频，也不会采集摄像头或麦克风。</p></div></div><button type="button" class="btn btn-primary btn-block" id="live-enter">进入模拟直播间</button>`;
      $('#live-enter').addEventListener('click', () => { activeTask.step = 1; renderLive(); });
      return;
    }
    $('#task-dialog-body').innerHTML = `<div class="reaction-stage"><div class="center"><button type="button" class="reaction-btn" id="reaction-btn" aria-label="为直播送出本地点亮互动">✦</button><div class="h3" style="margin-top:18px">点亮互动 ${activeTask.reactions}/3</div><p class="hint">完成 3 次互动后才可签到</p></div></div><button type="button" class="btn btn-accent btn-block" id="live-checkin" ${activeTask.reactions < 3 ? 'disabled' : ''}>${activeTask.reactions < 3 ? `还需 ${3 - activeTask.reactions} 次互动` : '完成直播签到'}</button>`;
    $('#reaction-btn').addEventListener('click', event => {
      if (activeTask.reactions >= 3) return;
      activeTask.reactions += 1;
      event.currentTarget.classList.remove('pulse');
      void event.currentTarget.offsetWidth;
      event.currentTarget.classList.add('pulse');
      setTimeout(renderLive, state.reducedMotion ? 0 : 220);
    });
    $('#live-checkin').addEventListener('click', () => completeTask('live', { interactions: activeTask.reactions, checked_in: true }));
  }

  function renderStory() {
    const chapters = [
      { title: '第一幕 · 浮岛醒来', copy: '清晨的河流从紫晶浮岛穿过，第一束灯光在旗舰楼顶亮起。', color: '#6b55d6' },
      { title: '第二幕 · 街区回声', copy: '直播广场的欢呼沿道路传到答题学院，树梢也跟着闪起微光。', color: '#b43f78' },
      { title: '第三幕 · 共建坐标', copy: '每一位居民留下的互动，最终在纪念广场汇成一颗新的星。', color: '#2c8f94' }
    ];
    const chapter = chapters[activeTask.step];
    const positions = ['30% 46%', '52% 48%', '76% 46%'];
    $('#task-dialog-body').innerHTML = `<div class="task-progress"><span style="width:${(activeTask.step + 1) / chapters.length * 100}%"></span></div><div class="story-scene" style="--scene:${chapter.color};--scene-position:${positions[activeTask.step]}" role="img" aria-label="Luna 小镇剧情场景：${chapter.title}"><div class="story-copy"><div class="kicker mono on-dark">STORY ${activeTask.step + 1} / ${chapters.length}</div><h3 class="h2 on-dark">${chapter.title}</h3><p class="body-sm on-dark-soft">${chapter.copy}</p></div></div><button type="button" class="btn btn-primary btn-block" id="story-next">${activeTask.step === chapters.length - 1 ? '看完并收藏片段' : '继续下一幕'}</button>`;
    $('#story-next').addEventListener('click', () => {
      if (activeTask.step === chapters.length - 1) completeTask('story', { chapters_watched: chapters.length });
      else { activeTask.step += 1; renderStory(); }
    });
  }

  function renderCollection(isMemorial) {
    const count = isMemorial ? 4 : 3;
    const icons = isMemorial ? ['✦', '★', '✧', '◆'] : ['#', '✦', '@'];
    const id = isMemorial ? 'memorial' : 'community';
    const noun = isMemorial ? '星片' : '社区徽记';
    $('#task-dialog-body').innerHTML = `<div class="task-progress"><span style="width:${activeTask.collected.length / count * 100}%"></span></div><div class="collect-scene ${isMemorial ? 'memorial' : 'community'}" aria-label="高保真广场收集场景，共 ${count} 枚${noun}">${icons.map((icon, index) => { const collected = activeTask.collected.includes(index); return `<button type="button" class="collectible ${collected ? 'collected' : ''}" data-collect="${index}" aria-label="${collected ? '已收集' : '收集'}第 ${index + 1} 枚${noun}" ${collected ? 'disabled' : ''}>${icon}</button>`; }).join('')}</div><div class="feedback ${activeTask.collected.length === count ? 'good' : ''}" role="status" aria-live="polite">已找到 ${activeTask.collected.length}/${count} 枚${noun}。${activeTask.collected.length === count ? '全部收集完成，可以提交。' : '它们分布在场景的不同位置。'}</div><button type="button" class="btn btn-primary btn-block" id="collection-done" ${activeTask.collected.length < count ? 'disabled' : ''}>${activeTask.collected.length < count ? `还差 ${count - activeTask.collected.length} 枚` : `完成${isMemorial ? '广场共建' : '社群访问'}`}</button>`;
    $$('[data-collect]').forEach(button => button.addEventListener('click', () => {
      const value = Number(button.dataset.collect);
      if (!activeTask.collected.includes(value)) activeTask.collected.push(value);
      renderCollection(isMemorial);
    }));
    $('#collection-done').addEventListener('click', () => completeTask(id, { collected_count: activeTask.collected.length }));
  }

  function completeTask(id, details = {}) {
    const task = TASKS[id];
    if (!task || state.completedTasks.includes(id)) return;
    clearTaskTimer();
    state.completedTasks.push(id);
    state.bricks += task.bricks;
    state.totalEarned += task.bricks;
    state.prosperity += task.prosperity;
    state.totalProsperity += task.prosperity;
    state.level = 1 + Math.floor(state.totalProsperity / 100);
    if (id === 'memorial') state.memorialProgress = clamp(state.memorialProgress + 25, 0, 100);
    addLedger(`完成任务 · ${task.name}`, task.bricks);
    emit('level_complete', { level_id: id, task_id: id, building_id: task.building, score: task.prosperity, duration_ms: Math.round(performance.now() - playStartedAt), outcome: 'success', ...details });
    saveState();
    closeTaskDialog();
    renderAll();
    rewardFx(task.bricks, task.prosperity);
    if (!checkSuccess()) showNotice('任务完成', `获得 <strong>+${task.bricks} 虚拟砖块</strong> 与 <strong>+${task.prosperity} 繁荣度</strong>。<br><span class="hint">当前进度：${state.completedTasks.length}/3 个不同任务 · ${state.prosperity}/100 繁荣度。</span>`);
  }

  function checkSuccess() {
    if (state.completedTasks.length < 3 || state.prosperity < 100 || state.terminalEmitted) return false;
    state.terminalEmitted = true;
    saveState();
    emit('play_complete', { score: state.prosperity, completed_tasks: [...state.completedTasks], duration_ms: Math.round(performance.now() - playStartedAt), result: 'success' });
    emit('reward_eligible', { reward_id: 'reward_none_demo', eligible: false, rule_version: CONFIG.contract_version, reason: 'demo_has_no_real_reward' });
    showScreen('success');
    emit('cta_view', { cta_id: 'cta_demo_info', state: 'success', destination_id: 'DISABLED_PENDING_APPROVAL' });
    return true;
  }

  function setTheme(id) {
    if (!THEMES[id] || state.theme === id) return;
    validInteraction('change_theme', { theme: id });
    state.theme = id;
    chatHistory = [];
    saveState();
    renderAll();
    toast(`已切换为 ${THEMES[id].name}，地图、建筑与界面已同步换色`);
  }

  async function redeemPerk(id) {
    const perks = { coffee: { name: '小镇咖啡体验卡', cost: 60 }, badge: { name: '旗舰楼纪念徽章卡', cost: 90 } };
    const perk = perks[id];
    if (!perk || state.benefits.includes(id)) return;
    if (state.bricks < perk.cost) {
      showNotice('砖块不足', `还差 ${perk.cost - state.bricks} 虚拟砖块。`);
      return;
    }
    state.bricks -= perk.cost;
    state.benefits.push(id);
    addLedger(`加入演示卡 · ${perk.name}`, -perk.cost);
    saveState();
    emit('reward_claim', { reward_id: `local_demo_${id}`, claim_status: 'local_demo_card_added', confirmation_source: 'browser_local_state', fulfillment: 'none', cost_virtual_bricks: perk.cost });
    renderAll();
    showNotice('演示卡已加入', `${perk.name} 已保存到当前浏览器卡包。该卡不具备实际兑付、现金、投资或转让价值。`);
  }

  function showCTA(source) {
    emit('cta_click', { cta_id: 'cta_demo_info', source, destination_id: 'DISABLED_PENDING_APPROVAL', simulated: true });
    emit('cta_view', { cta_id: 'cta_demo_info', state: 'cta_dialog', destination_id: 'DISABLED_PENDING_APPROVAL' });
    showDialog($('#dlg-cta'));
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        textarea.remove();
      }
      return true;
    } catch (error) {
      emit('error', { error_code: 'LOCAL_CLIPBOARD_FAILED', recoverability: 'copy_manually', message: String(error.message || error) });
      return false;
    }
  }

  function replay() {
    emit('replay', { prior_outcome: state.terminalEmitted ? 'success' : 'incomplete', replay_count: state.run });
    state.completedTasks = [];
    state.prosperity = 0;
    state.terminalEmitted = false;
    state.firstUpgradeThisRun = false;
    state.run += 1;
    state.currentBuilding = null;
    growthStageFilter = 'all';
    clearGrowthRun();
    retryTaskId = null;
    playStartedAt = performance.now();
    interactionEmitted = false;
    saveState();
    renderAll();
    showScreen('town');
    toast(`第 ${state.run} 轮开始，建筑等级与砖块余额已保留`);
  }

  function resetProgress({ reload = false } = {}) {
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) { /* local-only fallback */ }
    state = makeDefaultState();
    state.accessChosen = true;
    pendingAvatar = clone(state.avatar);
    sessionId = uid('ses');
    playStartedAt = performance.now();
    events = [];
    chatHistory = [];
    interactionEmitted = false;
    onboardingStep = 0;
    activeTask = null;
    retryTaskId = null;
    growthStageFilter = 'all';
    clearGrowthRun();
    clearTaskTimer();
    saveState();
    renderAll();
    emit('impression', { placement: 'local_static_h5', viewability_rule: 'document_boot_after_reset', reset: true });
    showScreen('onboarding');
    if (reload) toast('本地进度已重置');
    return clone(state);
  }

  function updateEventLog() {
    const count = $('#events-count');
    const log = $('#event-log');
    if (count) count.textContent = `${events.length} 条 · 仅保存在当前页面内存`;
    if (log && !log.hidden) log.textContent = events.slice(-30).reverse().map(event => `${event.event_time.slice(11,19)} ${event.event_name} ${JSON.stringify(event.properties)}`).join('\n');
  }

  function bindTabs(containerSelector, onChange) {
    const container = $(containerSelector);
    if (!container) return;
    const activate = button => {
      const tabs = $$('[role="tab"]', container);
      tabs.forEach(tab => {
        const active = tab === button;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
      });
      onChange(button.dataset.tab, button);
    };
    container.addEventListener('click', event => {
      const button = event.target.closest('[role="tab"]');
      if (button) activate(button);
    });
    container.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      const tabs = $$('[role="tab"]', container);
      const current = tabs.indexOf(document.activeElement);
      let next = current;
      if (event.key === 'ArrowRight') next = (current + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      event.preventDefault();
      tabs[next].focus();
      activate(tabs[next]);
    });
  }

  function bindEvents() {
    window.addEventListener('message', handleLive2DMessage);
    bindMapPan();
    $$('dialog').forEach(dialog => dialog.addEventListener('close', () => {
      dialog.removeAttribute('aria-modal');
      syncDialogLayer();
      const returnTarget = dialogReturnFocus.get(dialog);
      requestAnimationFrame(() => {
        if (!$('dialog[open]') && returnTarget?.isConnected) returnTarget.focus({ preventScroll: true });
      });
    }));
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      const openDialogs = $$('dialog[open]');
      const dialog = openDialogs[openDialogs.length - 1];
      if (!dialog) return;
      event.preventDefault();
      dialog.close();
    });
    $$('[data-access-tab]').forEach(button => button.addEventListener('click', () => setAccessTab(button.dataset.accessTab)));
    $('#access-guest').addEventListener('click', () => {
      validInteraction('guest_entry');
      state.accessChosen = true;
      saveState();
      enterAfterAccess();
      toast('已进入离线游客模式，进度只保存在当前浏览器');
    });
    $('#register-form').addEventListener('submit', event => { event.preventDefault(); void submitAuth('register'); });
    $('#login-form').addEventListener('submit', event => { event.preventDefault(); void submitAuth('login'); });
    $('#onb-next').addEventListener('click', () => {
      validInteraction('onboarding_next', { step: onboardingStep + 1 });
      if (onboardingStep >= 2) startTown();
      else { onboardingStep += 1; updateOnboarding(); }
    });
    $('#onb-skip').addEventListener('click', startTown);
    $('#onb-self').addEventListener('click', startTown);
    $('#mayor-go').addEventListener('click', () => showScreen('task_center'));
    $('#mayor-chat').addEventListener('click', openKolChat);
    $('#mayor-card-avatar').addEventListener('click', openKolChat);
    const openHostProfile = source => {
      emit('valid_interaction', { interaction_type: 'open_kol_profile', kol_id: THEMES[state.theme].kol, source, profile_mode: 'read_only', subject_role: 'kol_host' });
      renderHostProfile();
      showScreen('host_profile');
    };
    $('#mayor-profile').addEventListener('click', () => openHostProfile('ai_hint_card'));
    $('#mayor-pin').addEventListener('click', () => openHostProfile('town_kol_character'));
    $('#avatar-open-host').addEventListener('click', () => openHostProfile('resident_identity_note'));
    $('#host-profile-chat').addEventListener('click', openKolChat);
    $('#host-profile-tasks').addEventListener('click', () => showScreen('task_center'));
    $$('[data-chat-prompt]').forEach(button => button.addEventListener('click', () => {
      void sendKolChat(button.dataset.chatPrompt, 'quick_prompt');
    }));
    $('#chat-form').addEventListener('submit', event => {
      event.preventDefault();
      const input = $('#chat-input');
      const message = input.value;
      input.value = '';
      void sendKolChat(message, 'free_text');
    });
    $('#live2d-greet').addEventListener('click', greetLive2D);
    $('#live2d-sound').addEventListener('click', toggleLive2DSound);
    $('#chat-input').addEventListener('focus', () => {
      if (live2d.ready && !chatPending && !live2d.mouthTimer) {
        setLive2DStageState('listening');
        postLive2DState('listening', { expressionHint: 'listening' });
      }
    });
    $('#chat-input').addEventListener('blur', () => {
      if (live2d.ready && !chatPending && !live2d.mouthTimer) {
        setLive2DStageState('ready');
        postLive2DState('ready');
      }
    });
    $('#dlg-chat').addEventListener('close', () => {
      stopLive2DSpeech('idle');
      emit('valid_interaction', { interaction_type: 'kol_chat_close', raw_text_retained: false });
    });
    $('#mayor-later').addEventListener('click', () => { $('#mayor-card').hidden = true; $('#mayor-mini').hidden = false; });
    $('#mayor-mini').addEventListener('click', () => { $('#mayor-card').hidden = false; $('#mayor-mini').hidden = true; });
    $('#success-banner-btn').addEventListener('click', () => showScreen('success'));
    $('#btn-town-chip').addEventListener('click', () => { pendingAvatar = clone(state.avatar); renderAvatar(); showScreen('avatar'); });
    $('#btn-bricks').addEventListener('click', () => showScreen('wallet'));
    $('#btn-settings').addEventListener('click', () => showDialog($('#dlg-settings')));
    $('#interior-back').addEventListener('click', () => {
      const buildingId = state.currentBuilding;
      if (interiorRuntime.arrivalTimer) clearTimeout(interiorRuntime.arrivalTimer);
      interiorRuntime.arrivalTimer = null;
      interiorRuntime.moving = false;
      emit('valid_interaction', { interaction_type: 'exit_building_scene', building_id: buildingId });
      state.currentBuilding = null;
      showScreen('town');
    });
    $('#interior-primary').addEventListener('click', () => enterInteriorPrimary());
    $('#interior-upgrade').addEventListener('click', () => state.currentBuilding && upgradeBuilding(state.currentBuilding));
    $('#interior-scene-art').addEventListener('error', () => emit('error', { error_code: 'INTERIOR_ASSET_LOAD_FAILED', building_id: state.currentBuilding, recoverability: 'return_to_town' }));
    $('#interior-world').addEventListener('click', handleInteriorGroundTap);
    $$('[data-interior-move]').forEach(button => button.addEventListener('click', () => moveInteriorBy(button.dataset.interiorMove)));
    document.addEventListener('keydown', event => {
      if ($('#app').dataset.fsm !== 'building_interior' || $('dialog[open]') || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
      const direction = { ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' }[event.key];
      if (!direction) return;
      event.preventDefault();
      moveInteriorBy(direction);
    });
    $$('[data-growth-stage-map]').forEach(button => button.addEventListener('click', () => setGrowthStageFilter(button.dataset.growthStageMap, 'campus_map')));
    $$('.nav-btn').forEach(button => button.addEventListener('click', () => {
      validInteraction('bottom_navigation', { destination: button.dataset.nav });
      if (button.dataset.nav === 'avatar') { pendingAvatar = clone(state.avatar); renderAvatar(); }
      showScreen(button.dataset.nav);
    }));
    $$('[data-back]').forEach(button => button.addEventListener('click', () => showScreen('town')));
    $$('[data-close]').forEach(button => button.addEventListener('click', () => {
      const dialog = button.closest('dialog');
      if (dialog) dialog.close();
      if (dialog?.id === 'dlg-notice' && noticeCallback) { const callback = noticeCallback; noticeCallback = null; callback(); }
    }));
    $('#task-dialog-close').addEventListener('click', closeTaskDialog);
    $('#dlg-task').addEventListener('close', clearTaskTimer);
    $('#dlg-growth-run').addEventListener('close', clearGrowthRun);
    $('#confirm-ok').addEventListener('click', () => {
      $('#dlg-confirm').close();
      const callback = confirmCallback;
      confirmCallback = null;
      callback?.();
    });
    bindTabs('#task-tabs', tab => { taskFilter = tab; renderTasks(); });
    bindTabs('#rank-tabs', tab => { rankFilter = tab; renderRanking(); });
    bindTabs('#growth-stage-tabs', tab => setGrowthStageFilter(tab, 'tabs'));
    $('#btn-checkin').addEventListener('click', () => {
      const today = todayKey();
      if (state.lastCheckin === today) return;
      validInteraction('daily_checkin');
      state.streak = state.lastCheckin ? Math.min(7, state.streak + 1) : 1;
      state.lastCheckin = today;
      state.bricks += 10;
      state.totalEarned += 10;
      addLedger('每日连续签到', 10);
      saveState();
      renderAll();
      rewardFx(10, 0);
      toast('签到成功，获得 10 虚拟砖块');
    });
    $('#rank-to-predict').addEventListener('click', () => startTask('predict'));
    $('#rank-to-memorial').addEventListener('click', () => startTask('memorial'));
    $('#avatar-save').addEventListener('click', () => {
      state.avatar = clone(pendingAvatar);
      saveState();
      renderAll();
      toast('居民形象已保存；Luna 主理人形象保持不变');
    });
    $('#btn-copy-code').addEventListener('click', async () => {
      const ok = await copyText(THEMES[state.theme].invite);
      toast(ok ? '演示邀请码已复制到本机剪贴板' : '复制失败，请手动记录演示码');
    });
    $('#btn-bind-code').addEventListener('click', async () => {
      if (state.inviteBound) return;
      state.inviteBound = true;
      serverState.attribution = { kol_id: THEMES[state.theme].kol, link_id: THEMES[state.theme].invite, source: 'browser_local_simulation' };
      saveState();
      emit('valid_interaction', { interaction_type: 'invite_code_bind', invite_code: THEMES[state.theme].invite, simulated: true });
      renderAll();
      showNotice('本机绑定完成', `演示邀请码 <strong>${THEMES[state.theme].invite}</strong> 已记录在当前浏览器，新人礼包演示卡已加入卡包。不会创建账号、同步注册或产生实际权益。`);
    });
    $('#flag-to-tg').addEventListener('click', () => startTask('community'));
    $('#wallet-to-flagship').addEventListener('click', () => showScreen('flagship'));
    $('#wallet-to-tasks').addEventListener('click', () => showScreen('task_center'));
    $('#wallet-connect').addEventListener('click', () => {
      state.walletConnected = !state.walletConnected;
      saveState();
      renderWallet();
      toast(state.walletConnected ? '本地模拟钱包已连接，未读取任何地址' : '本地模拟钱包已断开');
    });
    $('#wallet-reward-notice').addEventListener('click', () => {
      emit('reward_claim', { reward_id: 'reward_none_demo', claim_status: 'demo_notice_only', fulfillment: 'none' });
      showNotice('奖励说明', '本地演示不提供真实奖励。权益卡、砖块和领取动作均只存在于本机，不可兑换现金、转让或兑换数字资产。');
    });
    $$('[data-theme-pick]').forEach(button => button.addEventListener('click', () => setTheme(button.dataset.themePick)));
    $('#settings-reskin').addEventListener('click', () => { $('#dlg-settings').close(); showScreen('reskin'); });
    $('#settings-motion').addEventListener('click', event => {
      state.reducedMotion = !state.reducedMotion;
      event.currentTarget.setAttribute('aria-checked', String(state.reducedMotion));
      saveState();
      renderAll();
      postLive2DState(live2d.state, { expressionHint: live2d.state });
    });
    $('#settings-events').addEventListener('click', event => {
      const expanded = event.currentTarget.getAttribute('aria-expanded') === 'true';
      event.currentTarget.setAttribute('aria-expanded', String(!expanded));
      $('#event-log').hidden = expanded;
      updateEventLog();
    });
    $('#settings-account-action').addEventListener('click', () => {
      $('#dlg-settings').close();
      setAccessTab('register');
      showScreen('access');
    });
    $('#settings-logout').addEventListener('click', () => showConfirm('退出本地账号？', '纯静态演示不启用账号；当前进度只保存在浏览器。', () => void logoutAccount()));
    $('#settings-delete-account').addEventListener('click', () => showConfirm('删除本地账号？', '这会永久删除该演示账号、服务器进度、邀请码绑定与演示卡记录，且无法找回。', () => void deleteAccount()));
    $('#settings-exit').addEventListener('click', () => { $('#dlg-settings').close(); showScreen('exit'); });
    $('#settings-reset').addEventListener('click', () => showConfirm('重置当前进度？', '将清空当前游客或账号的砖块、任务、建筑等级、卡包与形象。账号和 Kill switch 不会被更改。', () => resetProgress({ reload: true })));
    $('#fu-go').addEventListener('click', () => {
      emit('cta_click', { cta_id: 'cta_first_upgrade_flagship', source: 'first_upgrade_modal', destination_id: 'local_flagship', simulated: true });
      $('#dlg-first-upgrade').close();
      showScreen('flagship');
    });
    $('#fu-later').addEventListener('click', () => $('#dlg-first-upgrade').close());
    $('#success-replay').addEventListener('click', replay);
    $('#success-share').addEventListener('click', () => {
      emit('share', { share_surface: 'local_preview', status: 'preview_opened', card_version: 'v3' });
      showScreen('share');
    });
    $('#success-cta').addEventListener('click', () => showCTA('success'));
    $('#success-reward').addEventListener('click', () => {
      emit('reward_claim', { reward_id: 'reward_none_demo', claim_status: 'demo_notice_only', fulfillment: 'none' });
      showNotice('本轮奖励说明', '你已完成本地游戏目标。没有真实奖励、代币、现金、抽奖资格或投资权益。');
    });
    $('#success-back').addEventListener('click', () => showScreen('town'));
    $('#failure-retry').addEventListener('click', () => retryTaskId ? startTask(retryTaskId, true) : showScreen('town'));
    $('#failure-back').addEventListener('click', () => showScreen('town'));
    $('#share-back').addEventListener('click', () => showScreen(state.terminalEmitted ? 'success' : 'town'));
    $('#share-copy').addEventListener('click', async () => {
      const ok = await copyText($('#share-text').textContent);
      emit('share', { share_surface: 'clipboard_local_simulation', status: ok ? 'copied' : 'copy_failed', card_version: 'v3' });
      toast(ok ? '分享文案已复制，本地演示不会打开外部应用' : '复制失败，可手动选择下方文案');
    });
    $('#exit-resume').addEventListener('click', () => showScreen('town'));
    $('#exit-cta').addEventListener('click', () => showCTA('exit'));
    $('#success-banner-btn').addEventListener('click', () => showScreen('success'));
  }

  function exposeTestInterface() {
    const api = {
      getState: () => clone(state),
      getEvents: () => clone(events),
      getServerState: () => clone(serverState),
      getChatHistory: () => clone(chatHistory),
      askChat: message => localKolChatReply(String(message || '')),
      moveInterior: (x, y) => moveInteriorPlayerTo(x, y, { inputMode: 'test_interface' }),
      startAirdrop: () => startAirdropFlight({ forced: true }),
      getRoadNetwork: () => ({
        nodes: clone(ROAD_NODES),
        edges: clone(ROAD_EDGES),
        collisionModel: 'road_centerline_fail_closed',
        player: npcRuntime.player ? clone({ x: npcRuntime.player.x, y: npcRuntime.player.y, path: npcRuntime.player.path, target: npcRuntime.player.target, pace: npcRuntime.player.pace, direction: npcRuntime.player.direction, faceDirection: npcRuntime.player.faceDirection, facing: npcRuntime.player.facing, heading: npcRuntime.player.heading, routeAudit: npcRuntime.player.routeAudit }) : null,
        lastPlayerRouteAudit: clone(lastPlayerRouteAudit),
        npcRouteAudits: npcRuntime.items.map(item => clone({ id: item.npc.id, target: item.dest?.building || null, direction: item.direction || null, faceDirection: item.faceDirection || null, facing: item.facing, routeAudit: item.routeAudit || null })),
        buildingRouteAudits: BUILDINGS.map(building => {
          const home = nearestRoadPoint(roadPoint('m3'));
          return safeRoadRoute(home, buildingDoor(building), building.id).audit;
        })
      }),
      getMapView: () => ({ x: mapPanRuntime.x, y: mapPanRuntime.y, bounds: mapPanBounds() }),
      getLive2DState: () => ({
        initialized: live2d.initialized,
        ready: live2d.ready,
        error: live2d.error,
        state: live2d.state,
        soundEnabled: live2d.soundEnabled
      }),
      greetLive2D: () => { greetLive2D(); return live2d.ready; },
      syncNow: () => syncProgressNow({ required: true }),
      reset: () => resetProgress(),
      openChat: () => { openKolChat(); return true; },
      openScreen: id => {
        if (id === 'building_drawer' || id === 'building_scene') { openBuilding('htx'); return true; }
        if (id === 'cta') { showCTA('test_interface'); return true; }
        if (id === 'task_quiz') { startTask('quiz'); return true; }
        return showScreen(String(id));
      }
    };
    Object.defineProperty(window, '__KOL_TOWN__', {
      value: Object.freeze(api),
      writable: false,
      configurable: false,
      enumerable: false
    });
  }

  async function boot() {
    exposeTestInterface();
    bindEvents();
    renderAll();
    await bootstrapServer();
    renderAll();
    if (isKilled()) {
      showScreen('disabled');
      return;
    }
    emit('impression', { placement: 'local_static_h5', viewability_rule: 'document_boot' });
    if (storageWasPresent) emit('return_session', { prior_progress: true, completed_tasks: state.completedTasks.length, run: state.run, source: 'browser_storage' });
    if (state.onboardingComplete) {
      emit('play_start', { entry_state: 'return_session', run: state.run });
      showScreen('town');
    } else showScreen('onboarding');
  }

  window.addEventListener('error', event => emit('error', { error_code: 'UNCAUGHT_RUNTIME_ERROR', state: state.currentScreen, recoverability: 'unknown', message: event.message || 'unknown' }));
  window.addEventListener('unhandledrejection', event => emit('error', { error_code: 'UNHANDLED_PROMISE_REJECTION', state: state.currentScreen, recoverability: 'unknown', message: String(event.reason || 'unknown') }));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.onboardingComplete) renderTopbar();
  });

  void boot();
})();
