(function (root) {
  'use strict';

  const WIDTH = 360;
  const HEIGHT = 560;
  const CLASSIC_SCENE_BASE = root.document && root.document.currentScript && typeof URL !== 'undefined'
    ? new URL('./assets/games/classic-v1/scenes/', root.document.currentScript.src).href
    : '/assets/games/classic-v1/scenes/';
  const TAU = Math.PI * 2;

  // Shared dimensional controls, with each game's own material and color world.
  const UI_THEME_COLORS = {
    'safety-workshop': ['#315D82', '#93C8DD', '#E9AE3F', '#EAF2F5', '#29465F', '#6D94AE'],
    'stellar-farm': ['#427B54', '#AAD287', '#339ABD', '#FFF1D2', '#806447', '#76995C'],
    'pixel-quest': ['#476A94', '#ACCBDA', '#EAAE43', '#F0EBD8', '#425976', '#8BA4B7'],
    'red-cup-shuffle': ['#A34F46', '#F1B888', '#D9A83B', '#FFF1D8', '#80503B', '#B17D55'],
    'magic-choir': ['#755790', '#C6ABD8', '#49A5BB', '#F2E9F4', '#65517B', '#A898BF'],
    'paws-stage': ['#B16B64', '#F3C9B1', '#B392D0', '#FFF2E2', '#946658', '#C99B8D'],
    'puppet-studio': ['#7C739D', '#D3C1DA', '#B97E94', '#FBF0EF', '#83728B', '#C2B0C5'],
    'firefly-mail': ['#377E70', '#B4D898', '#CCA347', '#F5F1D6', '#52714D', '#7D9B73'],
    'whisker-escape': ['#B27845', '#EACC9F', '#549DA5', '#FFF0D7', '#947045', '#BFAB87'],
    'coin-journey': ['#AE8539', '#ECD390', '#5096BE', '#FFF4D4', '#927747', '#AABBAC'],
    'jungle-dive': ['#237C83', '#89D8C8', '#E8B448', '#E5F4E6', '#426F66', '#4A9A94'],
    'rift-strike': ['#356D99', '#9CD6EA', '#D56D6D', '#EAF4F9', '#385571', '#6389A7'],
    'stardust-island': ['#3E8882', '#ADE0C3', '#DAAE53', '#F5F3DF', '#5D877A', '#72AEA0'],
    'formation-knights': ['#355782', '#CFB972', '#D3A646', '#F8EAD0', '#365476', '#C4A674'],
    'galaxy-toy-shop': ['#5D72A0', '#C2D8EF', '#DB8D69', '#F7EDE4', '#657490', '#AFBCD2'],
    'city-rush': ['#326B93', '#98CCDD', '#D85452', '#EAF0F4', '#3C546E', '#647F96'],
    'sky-cannon': ['#397E9E', '#B4DDEA', '#D5A546', '#EFF5EF', '#567C8A', '#91BDCD'],
    'neon-dash': ['#446A99', '#B7D5EA', '#D56478', '#EDF2F8', '#445E7E', '#7898B6'],
    'pulse-forge': ['#8E5763', '#E4BE90', '#DBA746', '#F9EADC', '#76545D', '#B58F84'],
    'sky-stack': ['#437E9D', '#B8E1ED', '#E8B54B', '#F0F4E9', '#688490', '#ABD2D5'],
    'rune-circuit': ['#467B78', '#CAB58A', '#B99349', '#F2E8D3', '#6F5941', '#ABA079'],
    'prism-match': ['#8C678D', '#E0BADB', '#4BA5BC', '#F8EAF1', '#7F6081', '#C6AFD0'],
    'star-cups': ['#65528A', '#CBB6DB', '#D9B051', '#F0E6F1', '#665371', '#AA9ABC'],
    'deep-catch': ['#226D89', '#8FCBDB', '#D9BB58', '#E7F3F2', '#365D70', '#3C92AA'],
    'ember-bastion': ['#8C513D', '#D4AA76', '#D98539', '#F4DFC4', '#69504A', '#AF8068'],
    'nova-drift': ['#435F86', '#9EBED8', '#D66553', '#EAF0F6', '#4E6279', '#829BB3'],
    'void-squadron': ['#3E557F', '#AABCD9', '#6BAECB', '#E8EEF5', '#394D6A', '#6A819E'],
    'orchard-merge': ['#3B8B4D', '#A0CC70', '#20A9E3', '#FFF7E5', '#805936', '#C6B68B'],
    'moonlight-tea-shop': ['#A8695F', '#E7BA97', '#5A9E99', '#FFF1DD', '#9B6C50', '#C7AD8F'],
    'microbe-arena': ['#387F93', '#91D0D4', '#C48BBA', '#E6F4EE', '#4A7782', '#72ADB4'],
    'crystal-bastion': ['#27584B', '#F5E4B5', '#278BA1', '#FFF6DB', '#203F37', '#91BC68'],
    'studio-wardrobe': ['#A57470', '#E7C6A9', '#7D9C87', '#FFF0E4', '#9C7A66', '#D0AEA2'],
    'star-mower': ['#376584', '#9DC8DA', '#52A9C7', '#EAF1F3', '#405873', '#718CA8'],
    'star-deck': ['#354F78', '#CBB06C', '#C89C3E', '#F5E6C6', '#394A67', '#6B7B95'],
    'adventurer-journal': ['#66714C', '#C4C28D', '#BC9653', '#F5EDCF', '#796743', '#ACA876'],
    'idiom-detective': ['#91634D', '#DAB895', '#A07B55', '#F6ECD6', '#7A5D46', '#B9A387'],
    'hex-frontier': ['#626F48', '#BBC188', '#547F9E', '#EDEACF', '#686747', '#9DA36E'],
    'garden-renewal': ['#4D8759', '#B9D294', '#DAAA53', '#FFF1D5', '#8B714E', '#A8BE81']
  };
  function uiTheme(key) {
    const colors = UI_THEME_COLORS[key] || UI_THEME_COLORS['safety-workshop'];
    return Object.fromEntries(['hud','rim','badge','paper','frame','field'].map((name,index) => [name,colors[index]]));
  }
  function applyUiTheme(canvas, theme) {
    const host = canvas.closest && canvas.closest('.feed-mini-game, #game-root');
    if (host && host.style && host.style.setProperty) {
      Object.entries(theme).forEach(([name,value]) => host.style.setProperty('--game-' + name,value));
    }
  }

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const pointIn = (point, rect) => point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const rotatePipe = (mask, turns) => { let value=mask; for(let turn=0;turn<turns%4;turn+=1)value=((value<<1)&15)|((value>>3)&1); return value; };

  function hashSeed(value) {
    let result = 2166136261;
    for (const character of String(value)) {
      result ^= character.charCodeAt(0);
      result = Math.imul(result, 16777619);
    }
    return result >>> 0;
  }

  function seeded(seed) {
    let value = hashSeed(seed) || 1;
    return () => {
      value += 0x6D2B79F5;
      let next = value;
      next = Math.imul(next ^ next >>> 15, next | 1);
      next ^= next + Math.imul(next ^ next >>> 7, next | 61);
      return ((next ^ next >>> 14) >>> 0) / 4294967296;
    };
  }

  function roundedRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, 18, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }


  function shadedColor(value, amount) {
    if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) return value;
    const target = amount > 0 ? 255 : 0;
    return '#' + [1,3,5].map(offset => {
      const channel = parseInt(value.slice(offset, offset + 2), 16);
      return Math.round(channel + (target - channel) * Math.abs(amount)).toString(16).padStart(2, '0');
    }).join('');
  }

  function paintCasualPanel(context, rect, fill, stroke, shadow) {
    context.save();
    const radius = rect.w > 200 && rect.h > 100 ? Math.max(18, rect.r || 16) : (rect.r == null ? 16 : rect.r);
    if (rect.h > 20) {
      context.shadowColor = 'rgba(68,44,20,.24)';
      context.shadowBlur = Math.min(5, Math.max(2, shadow || 3));
      context.shadowOffsetY = 2;
    }
    roundedRect(context, rect.x, rect.y, rect.w, rect.h, radius);
    if (typeof fill === 'string' && /^#[0-9a-f]{6}$/i.test(fill)) {
      const surface = context.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
      surface.addColorStop(0, shadedColor(fill, .17));
      surface.addColorStop(.24, fill);
      surface.addColorStop(1, shadedColor(fill, -.07));
      context.fillStyle = surface;
    } else context.fillStyle = fill;
    context.fill();
    context.shadowColor = 'transparent';
    context.shadowBlur = 0;
    context.shadowOffsetY = 0;
    if (stroke) {
      context.strokeStyle = stroke;
      context.lineWidth = rect.lineWidth || 1.5;
      context.stroke();
    }
    if (rect.w > 20 && rect.h > 20) {
      roundedRect(context, rect.x + 1.5, rect.y + 1.5, rect.w - 3, rect.h - 3, Math.max(1, radius - 1.5));
      context.strokeStyle = 'rgba(255,255,241,.36)';
      context.lineWidth = 1;
      context.stroke();
    }
    context.restore();
  }

  function panel(context, rect, fill, stroke, shadow) {
    paintCasualPanel(context, rect, fill, stroke, shadow);
  }

  // Continuous worlds need legible bounds, not an opaque second scenery layer.
  function fieldBoundary(context, rect, stroke) {
    context.save();
    roundedRect(context,rect.x,rect.y,rect.w,rect.h,16);
    context.strokeStyle=stroke || 'rgba(235,246,235,.48)';
    context.lineWidth=1.2; context.setLineDash([14,10]); context.stroke();
    context.restore();
  }

  function contactShadow(context,x,y,width,height) {
    context.save();context.beginPath();context.ellipse(x,y,width,height,0,0,TAU);
    context.fillStyle='rgba(40,45,37,.19)';context.fill();context.restore();
  }

  function label(context, value, x, y, options) {
    const settings = options || {};
    context.save();
    context.fillStyle = settings.color || '#F7F8FA';
    context.font = `${settings.weight || 700} ${settings.size || 13}px ${settings.family || 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif'}`;
    context.textAlign = settings.align || 'left';
    context.textBaseline = settings.baseline || 'middle';
    context.shadowBlur = 0;
    if (!settings.color || settings.color === '#FFFFFF' || settings.shadow) {
      context.shadowColor = 'rgba(53,46,24,.44)';
      context.shadowBlur = 2;
      context.shadowOffsetY = 1;
    }
    context.fillText(String(value), x, y, settings.maxWidth || undefined);
    context.restore();
  }

  function circle(context, x, y, radius, fill, stroke, lineWidth) {
    context.beginPath();
    context.arc(x, y, radius, 0, TAU);
    context.fillStyle = fill;
    context.fill();
    if (stroke) {
      context.lineWidth = lineWidth || 1;
      context.strokeStyle = stroke;
      context.stroke();
    }
  }

  function hexagon(context, x, y, radius, fill, stroke) {
    context.beginPath();
    for (let index = 0; index < 6; index += 1) {
      const angle = Math.PI / 3 * index - Math.PI / 6;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (!index) context.moveTo(px, py); else context.lineTo(px, py);
    }
    context.closePath();
    context.fillStyle = fill;
    context.fill();
    if (stroke) { context.strokeStyle = stroke; context.lineWidth = 1.5; context.stroke(); }
  }

  function diamond(context, x, y, radius, fill, stroke) {
    context.beginPath();
    context.moveTo(x, y - radius);
    context.lineTo(x + radius, y);
    context.lineTo(x, y + radius);
    context.lineTo(x - radius, y);
    context.closePath();
    context.fillStyle = fill;
    context.fill();
    if (stroke) { context.strokeStyle = stroke; context.lineWidth = 1.5; context.stroke(); }
  }

  const GAME_CATALOG = {
    'safety-workshop': {id: 1, title: 'Crypto City 安全挑战', mechanic: 'quiz', accent: '#EE4D5F', secondary: '#F4B54B', surface: '#152438', background: '#09111C', instruction: '判断请求风险，完成三阶段安全路线'},
    'stellar-farm': {id: 2, title: '星际农场', mechanic: 'builder', accent: '#58B77A', secondary: '#EBCB62', surface: '#263E32', background: '#10251B', instruction: '铺设水渠并配置农田，让五块土地持续产出'},
    'pixel-quest': {id: 5, title: '像素冒险', mechanic: 'runner', heroCharacterId: 'chr_nova_runner', accent: '#7C66F2', secondary: '#F0B954', surface: '#24213B', background: '#11101E', instruction: '切换路线、跳过障碍并收集关卡芯片'},
    'red-cup-shuffle': {id: 6, title: '红杯速配', mechanic: 'cups', accent: '#E9484F', secondary: '#F4C34D', surface: '#3B2026', background: '#170E11', instruction: '观察标记，跟随真实洗牌轨迹找到目标杯'},
    'magic-choir': {id: 9, title: '魔法合唱团', mechanic: 'sequencer', accent: '#9B6CE7', secondary: '#62CFCA', surface: '#2B2340', background: '#120F1E', instruction: '编排四轨节奏，让所有声部在终点同步'},
    'paws-stage': {id: 10, title: '萌宠音乐盒', mechanic: 'sequence', heroCharacterId: 'chr_mochi_beat', accent: '#F58A7B', secondary: '#F2C95D', surface: '#3B2C37', background: '#1A1218', instruction: '记住舞台灯序，让四位萌宠完成连奏'},
    'puppet-studio': {id: 12, title: '玩偶造型工坊', mechanic: 'wardrobe', heroCharacterId: 'chr_lumi_doll', accent: '#4C94E8', secondary: '#F0A36B', surface: '#24364B', background: '#101927', instruction: '组合衣装、鞋履与配饰，完成三张玩偶设定'},
    'firefly-mail': {id: 14, title: '萤火信箱', mechanic: 'sort', accent: '#F0C85A', secondary: '#5CB9A7', surface: '#233D39', background: '#101F1D', instruction: '拖动萤火邮票进入同色信箱，完成夜间投递'},
    'whisker-escape': {id: 15, title: '猫咪潜逃', mechanic: 'maze', accent: '#F09B58', secondary: '#7BC3B0', surface: '#35312C', background: '#171512', instruction: '逐格潜行，避开巡逻灯并抵达安全出口'},
    'coin-journey': {id: 16, title: '金币环游记', mechanic: 'coin', accent: '#E8B43E', secondary: '#4F9ACC', surface: '#3B3422', background: '#19160C', instruction: '控制力度与方向，让金币连续穿过旅行门环'},
    'jungle-dive': {id: 17, title: '丛林潜游', mechanic: 'fishing', accent: '#41A99C', secondary: '#E0A648', surface: '#193E40', background: '#092126', instruction: '控制下潜深度，收集果实并避开暗礁'},
    'rift-strike': {id: 18, title: '裂隙突击', mechanic: 'shooter', accent: '#4C83E8', secondary: '#E65972', surface: '#1D2C4C', background: '#0A1020', instruction: '拖动战机自动射击，清除三波裂隙无人机'},
    'stardust-island': {id: 19, title: '星砂岛', mechanic: 'builder', accent: '#4EAA8A', secondary: '#E6B864', surface: '#24403B', background: '#0F211F', instruction: '平衡水、粮与居住资源，扩建三座岛屿'},
    'formation-knights': {id: 20, title: '阵线骑士', mechanic: 'battle', heroCharacterId: 'chr_aegis_rowan', accent: '#C64F4F', secondary: '#D7B562', surface: '#3A2B2C', background: '#190F11', instruction: '读取敌方意图，在攻击、防御和蓄力间决策'},
    'galaxy-toy-shop': {id: 21, title: '银河玩具店', mechanic: 'shop', accent: '#5E86DD', secondary: '#EAA45C', surface: '#2A3147', background: '#111523', instruction: '读取订单，按类别、颜色和包装完成顾客需求'},
    'city-rush': {id: 22, title: '城市极速', mechanic: 'drift', accent: '#E55050', secondary: '#46A2C7', surface: '#242D39', background: '#0D1219', instruction: '按住左右控制赛车，通过检查点并避开路障'},
    'sky-cannon': {id: 23, title: '云端炮手', mechanic: 'defense', accent: '#D76543', secondary: '#5DA2C8', surface: '#3A302B', background: '#191410', instruction: '部署炮台、积累能量并守住三条云端航线'},
    'neon-dash': {id: 24, title: '霓虹疾跑', mechanic: 'runner', accent: '#E84D6B', secondary: '#45B9C6', surface: '#252D3B', background: '#0E131C', instruction: '在三条跑道间移动，跳过障碍并收集能量'},
    'pulse-forge': {id: 25, title: '节拍熔炉', mechanic: 'rhythm', accent: '#D55B69', secondary: '#D5A34A', surface: '#342B30', background: '#171215', instruction: '音符进入判定线时敲击四枚音垫，维持连击'},
    'sky-stack': {id: 26, title: '天际叠塔', mechanic: 'stack', accent: '#4E9DB8', secondary: '#E2B15E', surface: '#293947', background: '#101A22', instruction: '在移动平台经过塔顶时落下，尽量保留重叠宽度'},
    'rune-circuit': {id: 27, title: '符文回路', mechanic: 'circuit', accent: '#45A485', secondary: '#B36BC4', surface: '#263B37', background: '#0D1C19', instruction: '旋转十六块回路，让能量从入口连续抵达核心'},
    'prism-match': {id: 28, title: '棱镜连击', mechanic: 'match', accent: '#D75491', secondary: '#4AB4C6', surface: '#322A42', background: '#14101E', instruction: '交换相邻晶体制造三连，收集本阶段目标颜色'},
    'star-cups': {id: 29, title: '星杯幻术', mechanic: 'cups', accent: '#805BC2', secondary: '#E0B650', surface: '#2D2742', background: '#130F20', instruction: '观察星核所在杯，跟随多次交换后做出选择'},
    'deep-catch': {id: 30, title: '深海寻光', mechanic: 'fishing', accent: '#3B9DBC', secondary: '#E0C35C', surface: '#1E3748', background: '#091824', instruction: '按住下潜、松开回收，在正确深度捕获光鱼'},
    'ember-bastion': {id: 31, title: '赤焰防线', mechanic: 'defense', accent: '#D96045', secondary: '#D5B05B', surface: '#3D2D29', background: '#1A100E', instruction: '选择塔位部署守卫，自动攻击并阻止六波敌军'},
    'nova-drift': {id: 32, title: '新星漂移', mechanic: 'drift', accent: '#D24F49', secondary: '#4C9CB5', surface: '#28343C', background: '#0D151A', instruction: '按住左右完成连续弯道，保持在赛道安全区'},
    'void-squadron': {id: 33, title: '虚空小队', mechanic: 'shooter', accent: '#5C76D9', secondary: '#D45A8C', surface: '#242C4A', background: '#0A0E1D', instruction: '拖动编队自动射击，击破敌舰并收集护盾芯片'},
    'orchard-merge': {id: 34, title: '果园合合塔', mechanic: 'merge', artKey: 'classic-v1', accent: '#7EA84E', secondary: '#FF6B55', surface: '#315A35', background: '#F7EED8', instruction: '移动相邻同级水果进行合成，培育黄金果王'},
    'moonlight-tea-shop': {id: 36, title: '月光奶茶铺', mechanic: 'shop', heroCharacterId: 'chr_mina_vale', accent: '#4C9389', secondary: '#D9A46A', surface: '#2C403D', background: '#111E1C', instruction: '读取订单，按顺序选茶、调味、加料并出杯'},
    'microbe-arena': {id: 37, title: '微粒竞技场', mechanic: 'io', accent: '#4CA29C', secondary: '#D97962', surface: '#25413F', background: '#0F2322', instruction: '拖动微粒吞噬更小目标，避开体型更大的本地机器人'},
    'crystal-bastion': {id: 39, title: '晶核防线', mechanic: 'defense', accent: '#4C9EA1', secondary: '#D2A754', surface: '#2B3E40', background: '#111E20', instruction: '在路径节点部署晶塔，管理能量守住三阶段石门'},
    'studio-wardrobe': {id: 43, title: '今日造型师', mechanic: 'wardrobe', accent: '#9A665C', secondary: '#C39B68', surface: '#3C3230', background: '#191313', instruction: '按照场合要求组合衣装、鞋履和配饰后提交造型'}
  };

  class CompleteGame {
    constructor(canvas, gameKey, options) {
      if (!canvas || typeof canvas.getContext !== 'function') throw new Error('A canvas element is required.');
      this.canvas = canvas;
      this.context = canvas.getContext('2d');
      this.gameKey = gameKey;
      this.uiTheme = uiTheme(gameKey);
      applyUiTheme(canvas, this.uiTheme);
      this.config = GAME_CATALOG[gameKey];
      if (!this.config) throw new Error(`Unknown complete game: ${gameKey}`);
      this.artProfile = root.AirvanaGameArtV1 && root.AirvanaGameArtV1.get ? root.AirvanaGameArtV1.get(gameKey) : null;
      this.options = options || {};
      // Casual sprites are the only in-game character source; previous art packs stay out.
      this.characterRuntime = null;
      this.assetErrors = [];
      this.stage = 1;
      this.score = 0;
      this.lives = 3;
      this.finished = false;
      this.paused = false;
      this.muted = !!this.options.muted;
      this.reducedMotion = !!this.options.reducedMotion;
      this.pointer = {x: WIDTH / 2, y: HEIGHT / 2, down: false};
      this.lastTime = 0;
      this.elapsed = 0;
      this.stageElapsed = 0;
      this.raf = 0;
      this.world = {};
      this.timers = new Set();
      this.random = seeded(`${gameKey}:1`);
      this.sensorRuntime = root.AirvanaSensorInteractions || null;
      this.sensorProfile = this.sensorRuntime && this.sensorRuntime.profile ? this.sensorRuntime.profile(gameKey) : null;
      this.sensorState = this.sensorProfile ? {status: 'prompt', ...this.sensorProfile} : null;
      this.sensorSession = null;
      this.art = {};
      this.onPointerDown = this.onPointerDown.bind(this);
      this.onPointerMove = this.onPointerMove.bind(this);
      this.onPointerUp = this.onPointerUp.bind(this);
      this.onKeyDown = this.onKeyDown.bind(this);
      this.frame = this.frame.bind(this);
      this.resize = this.resize.bind(this);
      this.canvas.style.touchAction = 'none';
      this.canvas.addEventListener('pointerdown', this.onPointerDown);
      this.canvas.addEventListener('pointermove', this.onPointerMove);
      this.canvas.addEventListener('pointerup', this.onPointerUp);
      this.canvas.addEventListener('pointercancel', this.onPointerUp);
      this.canvas.addEventListener('keydown', this.onKeyDown);
      if (root.addEventListener) root.addEventListener('resize', this.resize);
      this.resize();
      this.preloadGameArt();
      if (root.AirvanaPlayableAssetsV3 && root.AirvanaPlayableAssetsV3.load) root.AirvanaPlayableAssetsV3.load().catch(() => {});
      if (this.characterRuntime && this.characterRuntime.has(gameKey)) this.characterRuntime.preload(gameKey);
      this.initStage();
      this.mountSensorInteractions();
      this.emit('level_start', {stage: this.stage, mechanic: this.config.mechanic});
      this.status(`第 ${this.stage} / 3 阶段 · ${this.config.instruction}`);
      this.raf = root.requestAnimationFrame(this.frame);
    }

    resize() {
      const ratio = clamp(root.devicePixelRatio || 1, 1, 2);
      this.canvas.width = Math.round(WIDTH * ratio);
      this.canvas.height = Math.round(HEIGHT * ratio);
      this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
      this.context.imageSmoothingEnabled = true;
    }

    preloadGameArt() {
      if (typeof root.Image !== 'function') return;
      const assets = {background: CLASSIC_SCENE_BASE + this.gameKey + '.svg'};
      Object.entries(assets).forEach(([key, src]) => {
        const image = new root.Image();
        image.decoding = 'async';
        image.onload = () => { this.art[key] = image; };
        image.onerror = () => {
          this.art[key] = null;
          if (!this.assetErrors.includes(src)) this.assetErrors.push(src);
          this.emit('asset_load_failed', {asset: src, assetPack: 'classic-v1'});
        };
        image.src = src;
        this.art[key] = image;
      });
    }

    imageReady(image) {
      return !!(image && image.complete && image.naturalWidth > 0);
    }

    drawImageCover(image, rect) {
      if (!this.imageReady(image)) return false;
      const sourceRatio = image.naturalWidth / image.naturalHeight;
      const targetRatio = rect.w / rect.h;
      let sx = 0; let sy = 0; let sw = image.naturalWidth; let sh = image.naturalHeight;
      if (sourceRatio > targetRatio) {
        sw = image.naturalHeight * targetRatio;
        sx = (image.naturalWidth - sw) / 2;
      } else {
        sh = image.naturalWidth / targetRatio;
        sy = (image.naturalHeight - sh) / 2;
      }
      this.context.drawImage(image, sx, sy, sw, sh, rect.x, rect.y, rect.w, rect.h);
      return true;
    }

    drawSprite(key, rect, options) {
      const assets = root.AirvanaPlayableAssetsV3;
      return !!(assets && typeof assets.draw === 'function' && assets.draw(this.context, key, rect, options || {}));
    }

    drawInputFeedback() {
      if (this.reducedMotion || !this.inputFeedback) return;
      const age = this.elapsed - this.inputFeedback.at;
      if (age > .38) return;
      this.context.save();
      this.context.globalAlpha = .55 * (1 - age / .38);
      circle(this.context, this.inputFeedback.x, this.inputFeedback.y, 12 + age * 35, 'transparent', this.config.secondary, 2);
      this.context.restore();
    }

    coordinates(event) {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: clamp((event.clientX - rect.left) * WIDTH / Math.max(rect.width, 1), 0, WIDTH),
        y: clamp((event.clientY - rect.top) * HEIGHT / Math.max(rect.height, 1), 0, HEIGHT)
      };
    }

    onPointerDown(event) {
      if (event.preventDefault) event.preventDefault();
      this.ensureAudio();
      this.pointer = {...this.coordinates(event), down: true};
      if (this.paused) { this.togglePause(); return; }
      if (this.handleSensorControl(this.pointer)) return;
      this.press(this.pointer);
    }

    onPointerMove(event) {
      if (!this.pointer.down || this.paused || this.finished) return;
      this.pointer = {...this.coordinates(event), down: true};
      this.move(this.pointer);
    }

    onPointerUp(event) {
      const point = this.coordinates(event);
      this.pointer = {...point, down: false};
      if (!this.paused && !this.finished) this.release(point);
    }

    onKeyDown(event) {
      if (event.key === 'Escape' || event.key.toLowerCase() === 'p') { this.togglePause(); return; }
      if (this.finished || this.paused) return;
      if (['ArrowLeft', 'a', 'A'].includes(event.key)) this.key('left');
      if (['ArrowRight', 'd', 'D'].includes(event.key)) this.key('right');
      if (['ArrowUp', 'w', 'W', ' ', 'Enter'].includes(event.key)) this.key('action');
      if (['ArrowDown', 's', 'S'].includes(event.key)) this.key('down');
    }

    frame(timestamp) {
      if (this.finished) return;
      const delta = this.lastTime ? clamp((timestamp - this.lastTime) / 1000, 0, 0.04) : 0;
      this.lastTime = timestamp;
      if (!this.paused) {
        this.elapsed += delta;
        this.stageElapsed += delta;
        this.update(delta);
      }
      this.draw();
      this.raf = root.requestAnimationFrame(this.frame);
    }

    initStage() {
      this.random = seeded(`${this.gameKey}:${this.stage}`);
      this.stageElapsed = 0;
      const difficulty = this.stage;
      switch (this.config.mechanic) {
        case 'runner': this.world = {lane: 1, targetLane: 1, distance: 0, goal: 75 + difficulty * 25, speed: 112 + difficulty * 16, obstacles: [], spawn: .8, shield: 3, jump: 0, jumpCooldown: 0}; break;
        case 'rhythm': this.world = {notes: [], spawn: .35, beat: 0, hits: 0, misses: 0, goal: 7 + difficulty * 2, combo: 0, bestCombo: 0}; break;
        case 'stack': this.world = {blocks: [{x: 95, y: 492, w: 170}], moving: {x: 35, y: 456, w: 170, dir: 1}, count: 0, goal: 6 + difficulty}; break;
        case 'circuit': this.initCircuit(); break;
        case 'match': this.initMatch(); break;
        case 'cups': this.initCups(); break;
        case 'fishing': this.world = {hookX: 180, hook: 0, fish: this.makeFish(), caught: 0, goal: 2 + difficulty, oxygen: 100, holding: false}; break;
        case 'defense': this.world = {towers: [0,0,0,0,0,0], enemies: [], shots: [], energy: 4, base: 5, wave: 0, goal: 4 + difficulty, spawn: .6, waveGap: 0}; break;
        case 'drift': this.world = {carX: 180, steer: 0, distance: 0, goal: 75 + difficulty * 25, speed: 96 + difficulty * 13, barriers: [], spawn: .7, grip: 100}; break;
        case 'shooter': this.world = {ship: {x: 180, y: 470}, bullets: [], enemies: [], chips: [], spawn: .45, fire: 0, kills: 0, goal: 7 + difficulty * 3, shield: 3}; break;
        case 'merge': this.initMerge(); break;
        case 'shop': this.initShop(); break;
        case 'io': this.initIo(); break;
        case 'wardrobe': this.initWardrobe(); break;
        case 'quiz': this.initQuiz(); break;
        case 'sequencer': this.initSequencer(); break;
        case 'sequence': this.initSequence(); break;
        case 'sort': this.initSort(); break;
        case 'maze': this.initMaze(); break;
        case 'coin': this.initCoin(); break;
        case 'builder': this.initBuilder(); break;
        case 'battle': this.initBattle(); break;
        default: this.world = {progress: 0, goal: 5};
      }
    }

    makeFish() {
      return {x: 70 + this.random() * 220, y: 160 + this.random() * 250, vx: (this.random() > .5 ? 1 : -1) * (28 + this.stage * 7), radius: 18};
    }

    initCircuit() {
      const size=4,path=[];
      for(let row=0;row<size;row+=1)for(let step=0;step<size;step+=1)path.push(row*size+(row%2?size-1-step:step));
      const direction=(from,to)=>to===from-size?1:to===from+1?2:to===from+size?4:8;
      const targetMasks=Array(16).fill(0);
      path.forEach((index,step)=>{targetMasks[index]=(step?direction(index,path[step-1]):8)|(step<path.length-1?direction(index,path[step+1]):4);});
      const pipes=targetMasks.map(mask=>mask===5||mask===10?10:3);
      const target=targetMasks.map((mask,index)=>{for(let turns=0;turns<4;turns+=1)if(rotatePipe(pipes[index],turns)===mask)return turns;return 0;});
      const rotations=target.map((value,index)=>(value+1+index%3)%4);
      this.world={size,target,targetMasks,pipes,rotations,turns:40+this.stage*4,exit:path[path.length-1]};
    }

    circuitPowered() {
      const world=this.world,masks=world.pipes.map((mask,index)=>rotatePipe(mask,world.rotations[index])),powered=new Set();
      if(!(masks[0]&8))return powered;
      const queue=[0];powered.add(0);
      for(let cursor=0;cursor<queue.length;cursor+=1){
        const index=queue[cursor];
        for(const [bit,offset,opposite] of [[1,-4,4],[2,1,8],[4,4,1],[8,-1,2]]){
          const next=index+offset;
          if(!(masks[index]&bit)||next<0||next>=16||((bit===2||bit===8)&&Math.floor(next/4)!==Math.floor(index/4))||!(masks[next]&opposite)||powered.has(next))continue;
          powered.add(next);queue.push(next);
        }
      }
      return powered;
    }

    initMatch() {
      const size = 6;
      const colors = 5;
      const grid = Array.from({length: size * size}, (_, index) => (index * 3 + Math.floor(index / size) + Math.floor(this.random() * colors)) % colors);
      this.world = {size, colors, grid, selected: -1, moves: 18 - this.stage, collected: 0, goal: 8 + this.stage * 3, targetColor: this.stage % colors, resolving: 0};
      this.ensureMatchOpportunity();
    }

    initCups() {
      const swaps = [];
      for (let index = 0; index < 4 + this.stage * 2; index += 1) swaps.push([index % 2, index % 2 + 1]);
      this.world = {order: [0,1,2], ball: this.stage % 3, swaps, swapIndex: 0, swapTimer: 0, reveal: 1.1, ready: false, picked: -1, wins: 0, goal: 1, waitingForShuffle: !!(this.sensorProfile && this.sensorProfile.control === 'shuffle')};
    }

    initMerge() {
      const size = 5;
      const grid = Array.from({length: size * size}, (_, index) => (index + Math.floor(index / size)) % 3 + 1);
      // A visible adjacent merge chain guarantees every stage has a legal route.
      [0, 5, 6, 11, 12, 17].forEach((cell, step) => { grid[cell] = Math.max(1, step); });
      if (this.stage === 1) grid[17] = 1;
      this.world = {size, grid, selected: -1, moves: 18, bestLevel: Math.max(...grid), goal: this.stage === 1 ? 5 : 6, combo: 0, mergedCell: -1, mergeAt: -10};
    }

    initShop() {
      const recipes = this.gameKey === 'moonlight-tea-shop'
        ? [[0,1,2,3],[0,2,1,3],[1,0,2,3]]
        : [[0,2,3],[1,2,3],[0,1,3]];
      this.world = {recipes, order: recipes[(this.stage - 1) % recipes.length], step: 0, orders: 0, goal: 2 + this.stage, patience: 100};
    }

    initIo() {
      const food = Array.from({length: 14}, () => ({x: 35 + this.random() * 290, y: 100 + this.random() * 410, r: 4 + this.random() * 4}));
      const bots = Array.from({length: 3 + this.stage}, (_, index) => ({
        x: index % 2 ? 315 : 45, y: 145 + Math.floor(index / 2) * 140,
        r: 13 + index * 2, vx: (index % 2 ? -1 : 1) * (9 + this.stage * 2), vy: (index % 3 - 1) * 10
      }));
      this.world = {player: {x: 180, y: 360, r: 10}, food, bots, eaten: 0, goal: 5 + this.stage * 2};
    }

    initWardrobe() {
      const target = [(this.stage + 1) % 3, this.stage % 3, (this.stage + 2) % 3];
      this.world = {category: 0, choices: [-1,-1,-1], target, submitted: false, attempts: 3};
    }

    initQuiz() {
      const questions = [
        {prompt: '陌生页面请求无限授权', answers: ['立即确认', '核对来源与范围', '忽略提示'], correct: 1},
        {prompt: '页面索取助记词', answers: ['退出并举报', '只填一半', '发给客服'], correct: 0},
        {prompt: '签名内容与说明不一致', answers: ['暂停并复核', '继续签名', '关闭风险提示'], correct: 0}
      ];
      this.world = {questions, index: 0, correct: 0, locked: false, feedback: ''};
    }

    initSequencer() {
      const target = Array.from({length: 16}, (_, index) => ((index + this.stage) % 5 === 0 || index === 6 + this.stage));
      this.world = {grid: Array(16).fill(false), target, playing: false, playhead: 0, timer: 0, attempts: 3};
    }

    initSequence() {
      const sequence = Array.from({length: 4 + this.stage}, () => Math.floor(this.random()*4));
      const previewDuration=.8+sequence.length*.6;
      this.world = {sequence, input: [], preview: previewDuration, previewDuration, cursor: 0, ready: false};
    }

    initSort() {
      const items = Array.from({length: 6 + this.stage * 2}, (_, index) => ({id: index, type: index % 3, x: 55 + this.random() * 250, y: 105 + this.random() * 270, r: 13, dragging: false}));
      this.world = {items, selected: null, sorted: 0, goal: items.length, mistakes: 0, maxMistakes: 3};
    }

    initMaze() {
      const size = 7;
      const walls = new Set([9,10,12,17,22,24,25,31,33,38,39]);
      const guards = [{index: 20, dir: 1},{index: 41, dir: -1}];
      this.world = {size, player: 42, exit: 6, walls, guards, steps: 28 - this.stage * 2};
    }

    initCoin() {
      const rings = Array.from({length: 4 + this.stage}, (_, index) => ({x: 70 + (index % 3) * 110, y: 120 + Math.floor(index / 3) * 120, r: 22 - this.stage, hit: false}));
      this.world = {coin: {x: 180, y: 480, vx: 0, vy: 0, moving: false}, rings, hits: 0, goal: rings.length, launches: 6 + this.stage};
    }

    initBuilder() {
      const plots = Array(9).fill(0);
      this.world = {plots, selectedType: 1, water: 4, food: 2, homes: 0, goal: 6 + this.stage * 2, turns: 14};
    }

    initBattle() {
      this.world = {hero: 42 + this.stage * 6, heroMax: 42 + this.stage * 6, guard: 0, charge: 0, enemy: 34 + this.stage * 12, enemyMax: 34 + this.stage * 12, intent: 0, turn: 1, message: '敌方准备进攻'};
    }

    update(delta) {
      if (this.finished || this.paused) return;
      const world = this.world;
      switch (this.config.mechanic) {
        case 'runner': {
          world.jump = Math.max(0, world.jump - delta);
          world.jumpCooldown = Math.max(0, world.jumpCooldown - delta);
          world.distance += delta * 7;
          world.lane += (world.targetLane - world.lane) * Math.min(1, delta * 14);
          world.spawn -= delta;
          if (world.spawn <= 0) {
            world.obstacles.push({lane: Math.floor(this.random() * 3), y: 76, hit: false, kind: this.random() > .72 ? 'chip' : 'barrier'});
            world.spawn = Math.max(.42, 1.08 - this.stage * .12);
          }
          world.obstacles.forEach(item => { item.y += world.speed * delta; });
          for (const item of world.obstacles) {
            if (item.hit || item.y < 430 || item.y > 492 || Math.abs(item.lane - world.lane) > .38) continue;
            item.hit = true;
            if (item.kind === 'chip') { this.score += 55; world.distance += 5; this.tone('score'); }
            else if (world.jump > .14) { this.score += 30; this.tone('score'); this.emitInteraction('barrier_jump', {lane: world.targetLane}); }
            else { world.shield -= 1; this.score = Math.max(0, this.score - 25); this.tone('hit'); }
          }
          world.obstacles = world.obstacles.filter(item => item.y < 525 && !item.hit);
          if (world.shield <= 0) this.fail('护盾耗尽，调整路线后再试');
          else if (world.distance >= world.goal) this.completeStage('跑道节点已通过');
          break;
        }
        case 'rhythm': {
          world.spawn -= delta;
          if (world.spawn <= 0 && world.beat < world.goal + 4) {
            world.notes.push({pad: world.beat % 4, y: 84, hit: false});
            world.beat += 1;
            world.spawn = Math.max(.34, .74 - this.stage * .06);
          }
          world.notes.forEach(note => { note.y += (150 + this.stage * 12) * delta; });
          for (const note of world.notes) {
            if (!note.hit && note.y > 492) {
              note.hit = true; world.misses += 1; world.combo = 0; this.tone('hit');
            }
          }
          world.notes = world.notes.filter(note => note.y < 525 && !note.hit);
          if (world.hits >= world.goal) this.completeStage(`节拍同步·最高连击 ${world.bestCombo}`);
          else if (world.misses >= 5) this.fail('失误过多，节拍同步中断');
          break;
        }
        case 'stack': {
          if (!world.moving) break;
          world.moving.x += world.moving.dir * (92 + this.stage * 12) * delta;
          if (world.moving.x <= 22 || world.moving.x + world.moving.w >= 338) world.moving.dir *= -1;
          break;
        }
        case 'cups': {
          if (world.reveal > 0) { world.reveal -= delta; break; }
          if (world.waitingForShuffle) break;
          if (world.ready) break;
          if(world.activeSwap){
            world.activeSwap.progress += delta;
            if(world.activeSwap.progress >= world.activeSwap.duration){
              const {a,b}=world.activeSwap;
              [world.order[a],world.order[b]]=[world.order[b],world.order[a]];
              world.activeSwap=null;world.swapIndex+=1;world.swapTimer=.14;
            }
          }else{
            world.swapTimer-=delta;
            if(world.swapTimer<=0){
              const swap=world.swaps[world.swapIndex];
              if(swap){world.activeSwap={a:swap[0],b:swap[1],progress:0,duration:this.reducedMotion?.12:.64};this.tone('tap');}
              else world.ready=true;
            }
          }
          break;
        }
        case 'fishing': {
          world.fish.x += world.fish.vx * delta;
          if (world.fish.x < 35 || world.fish.x > 325) world.fish.vx *= -1;
          world.hook += (world.holding ? 128 : -156) * delta;
          world.hook = clamp(world.hook, 0, 390);
          world.oxygen -= delta * (world.holding ? 4.5 : 1.3);
          if (world.oxygen <= 0) this.fail('氧气耗尽，未能完成捕获');
          break;
        }
        case 'defense': {
          world.spawn -= delta;
          if (world.wave < world.goal && world.spawn <= 0) {
            world.enemies.push({lane: world.wave % 3, y: 88, hp: 20 + this.stage * 5, max: 20 + this.stage * 5, speed: 21 + this.stage * 4});
            world.wave += 1;
            world.spawn = 1.3;
          }
          world.energy = Math.min(8, world.energy + delta * .32);
          world.enemies.forEach(enemy => {
            const laneTowers = world.towers.filter((level, index) => level && index % 3 === enemy.lane);
            const damage = laneTowers.reduce((total, level) => total + level * 7, 0);
            enemy.hp -= damage * delta;
            enemy.y += enemy.speed * delta * (damage ? .55 : 1);
          });
          for (const enemy of world.enemies) {
            if (enemy.dead) continue;
            if (enemy.hp <= 0) { enemy.dead = true; world.energy = Math.min(8, world.energy + 1); this.score += 80; this.tone('score'); }
            else if (enemy.y > 482) { enemy.dead = true; world.base -= 1; this.tone('hit'); }
          }
          world.enemies = world.enemies.filter(enemy => !enemy.dead);
          if (world.base <= 0) this.fail('防线被突破，需要重新部署');
          else if (world.wave >= world.goal && !world.enemies.length) this.completeStage('本阶段防线守住');
          break;
        }
        case 'drift': {
          const roadCenter = 180 + Math.sin((world.distance + this.stage * 17) * .055) * (45 + this.stage * 8);
          world.carX += world.steer * delta * 108;
          world.carX += (roadCenter - world.carX) * delta * .23;
          world.carX = clamp(world.carX, 58, 302);
          world.distance += delta * 12;
          world.spawn -= delta;
          if (world.spawn <= 0) {
            world.barriers.push({x: roadCenter + (this.random() > .5 ? -42 : 42), y: 78, hit: false});
            world.spawn = .9;
          }
          world.barriers.forEach(barrier => { barrier.y += world.speed * delta; });
          for (const barrier of world.barriers) {
            if (!barrier.hit && barrier.y > 435 && barrier.y < 493 && Math.abs(barrier.x - world.carX) < 24) {
              barrier.hit = true; world.grip -= 34; this.score = Math.max(0, this.score - 30); this.tone('hit');
            }
          }
          world.barriers = world.barriers.filter(item => item.y < 525 && !item.hit);
          if (Math.abs(world.carX - roadCenter) > 76) world.grip -= delta * 20; else world.grip = Math.min(100, world.grip + delta * 5);
          if (world.grip <= 0) this.fail('车辆失去抓地力');
          else if (world.distance >= world.goal) this.completeStage('连续弯道已通过');
          break;
        }
        case 'shooter': {
          if (this.pointer.down) {
            world.ship.x += (this.pointer.x - world.ship.x) * Math.min(1, delta * 12);
            world.ship.y += (this.pointer.y - world.ship.y) * Math.min(1, delta * 12);
          }
          world.fire -= delta;
          if (world.fire <= 0) { world.bullets.push({x: world.ship.x, y: world.ship.y - 18}); world.fire = .2; }
          world.spawn -= delta;
          if (world.spawn <= 0) {
            world.enemies.push({x: 35 + this.random() * 290, y: 82, hp: 1 + Math.floor(this.stage / 2), vx: (this.random() - .5) * 25});
            world.spawn = Math.max(.36, .78 - this.stage * .08);
          }
          world.bullets.forEach(bullet => { bullet.y -= 260 * delta; });
          world.enemies.forEach(enemy => { enemy.y += (40 + this.stage * 7) * delta; enemy.x += enemy.vx * delta; });
          for (const bullet of world.bullets) for (const enemy of world.enemies) {
            if (bullet.dead || enemy.dead || distance(bullet, enemy) > 18) continue;
            bullet.dead = true; enemy.hp -= 1;
            if (enemy.hp <= 0) { enemy.dead = true; world.kills += 1; this.score += 65; this.tone('score'); }
          }
          for (const enemy of world.enemies) {
            if (!enemy.dead && enemy.y > 445 && distance(enemy, world.ship) < 32) { enemy.dead = true; world.shield -= 1; this.tone('hit'); }
            else if (!enemy.dead && enemy.y > 525) { enemy.dead = true; world.shield -= 1; this.tone('hit'); }
          }
          world.bullets = world.bullets.filter(item => item.y > 70 && !item.dead);
          world.enemies = world.enemies.filter(item => !item.dead);
          if (world.shield <= 0) this.fail('编队护盾已耗尽');
          else if (world.kills >= world.goal) this.completeStage('裂隙航道已清理');
          break;
        }
        case 'shop': {
          world.patience -= delta * (3.3 + this.stage * .55);
          if (world.patience <= 0) this.fail('顾客等待超时，订单未完成');
          break;
        }
        case 'io': {
          if (this.pointer.down) {
            world.player.x += (this.pointer.x - world.player.x) * Math.min(1, delta * 6.5);
            world.player.y += (this.pointer.y - world.player.y) * Math.min(1, delta * 6.5);
          }
          world.bots.forEach(bot => {
            bot.x += bot.vx * delta; bot.y += bot.vy * delta;
            if (bot.x < 25 || bot.x > 335) bot.vx *= -1;
            if (bot.y < 90 || bot.y > 520) bot.vy *= -1;
          });
          for (const food of world.food) {
            if (!food.eaten && distance(food, world.player) < food.r + world.player.r) {
              food.eaten = true; world.eaten += 1; world.player.r += .7; this.score += 45; this.tone('score');
            }
          }
          for (const bot of world.bots) if (distance(bot, world.player) < bot.r + world.player.r - 2) {
            if (world.player.r > bot.r + 3) { bot.eaten = true; world.player.r += 1.4; world.eaten += 2; this.score += 90; }
            else { this.fail('碰到体型更大的本地机器人'); break; }
          }
          world.food = world.food.filter(item => !item.eaten);
          world.bots = world.bots.filter(item => !item.eaten);
          if (world.eaten >= world.goal) this.completeStage('微粒安全成长');
          break;
        }
        case 'sequence': {
          if (!world.ready) {
            world.preview -= delta;
            if (world.preview <= 0) { world.ready = true; world.cursor = 0; this.status('请按照刚才的灯序点击四个声部'); }
          }
          break;
        }
        case 'coin': {
          if (!world.coin.moving) break;
          world.coin.x += world.coin.vx * delta;
          world.coin.y += world.coin.vy * delta;
          world.coin.vy += 190 * delta;
          if (world.coin.x < 18 || world.coin.x > 342) world.coin.vx *= -.7;
          for (const ring of world.rings) if (!ring.hit && distance(world.coin, ring) < ring.r) {
            ring.hit = true; world.hits += 1; this.score += 70; this.tone('score');
          }
          if (world.coin.y > 530 || world.coin.y < 60) {
            world.coin = {x: 180, y: 480, vx: 0, vy: 0, moving: false};
            if (world.hits >= world.goal) this.completeStage('金币通过全部门环');
            else if (world.launches <= 0) this.fail('发射次数耗尽');
          }
          break;
        }
        default: break;
      }
    }

    press(point) {
      if (this.finished || this.paused) return;
      this.inputFeedback = {...point, at: this.elapsed};
      const world = this.world;
      switch (this.config.mechanic) {
        case 'runner': world.targetLane = clamp(Math.floor(point.x / 120), 0, 2); if(point.y>410)this.jumpRunner(); this.emitInteraction('lane_change', {lane: world.targetLane}); break;
        case 'rhythm': this.hitRhythmPad(clamp(Math.floor(point.x / 90), 0, 3)); break;
        case 'stack': this.dropStackBlock(); break;
        case 'circuit': this.rotateCircuit(point); break;
        case 'match': this.selectMatch(point); break;
        case 'cups': world.waitingForShuffle ? this.beginCupShuffle('touch') : this.pickCup(point); break;
        case 'fishing': world.hookX = clamp(point.x, 35, 325); world.holding = true; break;
        case 'defense': this.placeTower(point); break;
        case 'drift': world.steer = point.x < 180 ? -1 : 1; break;
        case 'shooter': world.ship.x = point.x; world.ship.y = clamp(point.y, 300, 505); break;
        case 'merge': this.selectMerge(point); break;
        case 'shop': this.selectShopStep(point); break;
        case 'io': this.pointer = {x: clamp(point.x, 30, 330), y: clamp(point.y, 100, 505), down: true}; break;
        case 'wardrobe': this.selectWardrobe(point); break;
        case 'quiz': this.answerQuiz(point); break;
        case 'sequencer': this.toggleSequencer(point); break;
        case 'sequence': this.tapSequence(point); break;
        case 'sort': this.beginSort(point); break;
        case 'maze': this.moveMaze(point); break;
        case 'coin': this.launchCoin(point); break;
        case 'builder': this.buildPlot(point); break;
        case 'battle': this.battleAction(point); break;
        default: break;
      }
    }

    move(point) {
      if (this.finished || this.paused) return;
      if (this.config.mechanic === 'fishing') this.world.hookX = clamp(point.x, 35, 325);
      if (this.config.mechanic === 'sort' && this.world.selected) {
        this.world.selected.x = point.x; this.world.selected.y = point.y;
      }
      if (this.config.mechanic === 'shooter') {
        this.world.ship.x = point.x; this.world.ship.y = clamp(point.y, 300, 505);
      }
      if (this.config.mechanic === 'io') {
        this.pointer = {x: clamp(point.x, 30, 330), y: clamp(point.y, 100, 505), down: true};
      }
    }

    release(point) {
      if (this.finished || this.paused) return;
      if (this.config.mechanic === 'fishing') this.releaseHook();
      if (this.config.mechanic === 'drift') this.world.steer = 0;
      if (this.config.mechanic === 'sort') this.endSort(point);
    }

    key(action) {
      if (this.finished || this.paused) return;
      if (this.config.mechanic === 'runner') {
        if (action === 'left') this.world.targetLane = clamp(this.world.targetLane - 1, 0, 2);
        if (action === 'right') this.world.targetLane = clamp(this.world.targetLane + 1, 0, 2);
        if (action === 'action') this.jumpRunner();
      } else if (this.config.mechanic === 'drift') {
        this.world.steer = action === 'left' ? -1 : action === 'right' ? 1 : 0;
      } else if (action === 'action') this.press(this.pointer);
    }

    mountSensorInteractions() {
      if (!this.sensorProfile || !this.sensorRuntime || typeof this.sensorRuntime.mount !== 'function') return;
      this.sensorSession = this.sensorRuntime.mount(this.gameKey, {
        onStatus: state => { this.sensorState = {...state}; },
        onEvent: (eventName, properties) => this.emit(eventName, {stage: this.stage, ...(properties || {})}),
        onTilt: input => this.handleSensorTilt(input),
        onShake: input => this.handleSensorShake(input),
        onBlow: input => this.handleSensorBlow(input)
      });
      if (this.sensorSession && !this.sensorSession.requiresGesture()) {
        Promise.resolve(this.sensorSession.enable()).catch(() => {});
      }
    }

    sensorControlRect() { return {x: 12, y: 72, w: 172, h: 27, r: 13}; }

    handleSensorControl(point) {
      if (!this.sensorProfile || !pointIn(point, this.sensorControlRect())) return false;
      if (!this.sensorSession || ['active','requesting'].includes((this.sensorState || {}).status)) return true;
      Promise.resolve(this.sensorSession.enable()).catch(() => {});
      return true;
    }

    handleSensorTilt(input) {
      if (this.finished || this.paused || !this.sensorProfile) return;
      const control = this.sensorProfile.control;
      if (control === 'lane' && this.config.mechanic === 'runner') {
        const lane = input.direction < 0 ? 0 : input.direction > 0 ? 2 : 1;
        if (lane === this.world.targetLane) return;
        this.world.targetLane = lane;
        this.emitInteraction('sensor_tilt', {input_source: 'device_orientation', control, lane, direction: input.direction});
        return;
      }
      if (control === 'steer' && this.config.mechanic === 'drift') {
        if (this.world.steer === input.direction) return;
        this.world.steer = input.direction;
        this.emitInteraction('sensor_tilt', {input_source: 'device_orientation', control, direction: input.direction});
        return;
      }
      if (control === 'aim' && this.config.mechanic === 'shooter') {
        this.world.ship.x = clamp(180 + Number(input.x || 0) * 140, 35, 325);
        this.world.ship.y = clamp(405 + Number(input.y || 0) * 95, 300, 505);
        this.emitInteraction('sensor_tilt', {
          input_source: 'device_orientation', control,
          normalized_x: Math.round(Number(input.x || 0) * 100) / 100,
          normalized_y: Math.round(Number(input.y || 0) * 100) / 100
        });
      }
    }

    handleSensorShake() {
      if (this.finished || this.paused || !this.sensorProfile || this.sensorProfile.control !== 'shuffle' || this.config.mechanic !== 'cups') return;
      this.beginCupShuffle('device_motion');
    }

    handleSensorBlow() {
      if (this.finished || this.paused || !this.sensorProfile || this.sensorProfile.control !== 'sequence' || this.config.mechanic !== 'sequencer') return;
      const world = this.world;
      const nextCell = world.target.findIndex((required, index) => required && !world.grid[index]);
      if (nextCell < 0 || world.sensorSubmitting) return;
      world.grid[nextCell] = true;
      this.score += 24;
      this.tone('score');
      this.emitInteraction('sensor_blow', {input_source: 'microphone', cell: nextCell, activated_cells: world.grid.filter(Boolean).length});
      if (world.grid.every((value, index) => value === world.target[index])) {
        world.sensorSubmitting = true;
        this.later(() => {
          if (this.finished || this.world !== world) return;
          world.sensorSubmitting = false;
          this.toggleSequencer({x: 180, y: 510});
        }, 180);
      }
    }

    jumpRunner() {
      if(this.finished||this.paused||this.world.jumpCooldown>0)return;
      this.world.jump=.7;this.world.jumpCooldown=1.05;
      this.emitInteraction('runner_jump',{lane:this.world.targetLane});this.tone('tap');
    }

    hitRhythmPad(pad) {
      const world = this.world;
      const candidate = world.notes.filter(note => !note.hit && note.pad === pad).sort((a, b) => Math.abs(454 - a.y) - Math.abs(454 - b.y))[0];
      if (candidate && Math.abs(candidate.y - 454) < 55) {
        candidate.hit = true; world.hits += 1; world.combo += 1; world.bestCombo = Math.max(world.bestCombo, world.combo); this.score += 50 + world.combo * 4; this.tone('score');
        this.emitInteraction('rhythm_hit', {pad, combo: world.combo, timing_error: Math.round(Math.abs(candidate.y - 454))});
      } else { world.misses += 1; world.combo = 0; this.tone('hit'); this.emitInteraction('rhythm_miss', {pad}); }
    }

    beginCupShuffle(inputSource) {
      const world = this.world;
      if (!world || !world.waitingForShuffle || world.reveal > 0 || world.ready) return false;
      world.waitingForShuffle = false;
      world.swapTimer = 0;
      this.tone('tap');
      this.emitInteraction('cup_shuffle_start', {input_source: inputSource || 'touch'});
      this.status(inputSource === 'device_motion' ? '已感应摇晃，开始洗牌' : '触控洗牌已开始');
      return true;
    }

    dropStackBlock() {
      const world = this.world;
      const previous = world.blocks[world.blocks.length - 1];
      const current = world.moving;
      if (!current) return;
      const left = Math.max(previous.x, current.x);
      const right = Math.min(previous.x + previous.w, current.x + current.w);
      const overlap = right - left;
      if (overlap < 13) { this.fail('平台失去重心'); return; }
      world.blocks.push({x: left, y: current.y, w: overlap});
      world.count += 1;
      this.score += Math.round(overlap);
      this.tone('score');
      this.emitInteraction('block_drop', {overlap: Math.round(overlap), floor: world.count});
      if (world.count >= world.goal) { this.completeStage('塔楼结构稳定'); return; }
      const nextY = current.y - 36;
      world.moving = {x: world.count % 2 ? 24 : 336 - overlap, y: nextY, w: overlap, dir: world.count % 2 ? 1 : -1};
    }

    rotateCircuit(point) {
      const world = this.world;
      const cell = this.boardCell(point, world.size, {x: 38, y: 118, w: 284, h: 284});
      if (cell < 0 || world.turns <= 0) return;
      world.rotations[cell] = (world.rotations[cell] + 1) % 4;
      world.turns -= 1;
      this.tone('tap');
      this.emitInteraction('tile_rotate', {cell, rotation: world.rotations[cell], turns: world.turns});
      if (this.circuitPowered().size === world.size * world.size && (rotatePipe(world.pipes[world.exit], world.rotations[world.exit]) & 4)) this.completeStage('能量已沿完整回路抵达核心');
      else if (world.turns <= 0) this.fail('旋转次数耗尽');
    }

    selectMatch(point) {
      const world = this.world;
      const cell = this.boardCell(point, world.size, {x: 27, y: 111, w: 306, h: 306});
      if (cell < 0 || world.moves <= 0) return;
      if (world.selected < 0) { world.selected = cell; this.tone('tap'); return; }
      const first = world.selected;
      world.selected = -1;
      const adjacent = Math.abs(first - cell) === 1 && Math.floor(first / world.size) === Math.floor(cell / world.size) || Math.abs(first - cell) === world.size;
      if (!adjacent) { world.selected = cell; return; }
      [world.grid[first], world.grid[cell]] = [world.grid[cell], world.grid[first]];
      const matched = this.resolveMatches();
      world.moves -= 1;
      if (!matched) [world.grid[first], world.grid[cell]] = [world.grid[cell], world.grid[first]];
      this.emitInteraction('gem_swap', {first, second: cell, matched, moves: world.moves});
      if (world.collected >= world.goal) this.completeStage('目标晶体已收集');
      else if (world.moves <= 0) this.fail('步数耗尽，未达到收集目标');
    }

    resolveMatches() {
      const world = this.world;
      const marks = new Set();
      for (let row = 0; row < world.size; row += 1) for (let col = 0; col < world.size - 2; col += 1) {
        const index = row * world.size + col;
        if (world.grid[index] === world.grid[index + 1] && world.grid[index] === world.grid[index + 2]) [index,index+1,index+2].forEach(value => marks.add(value));
      }
      for (let col = 0; col < world.size; col += 1) for (let row = 0; row < world.size - 2; row += 1) {
        const index = row * world.size + col;
        if (world.grid[index] === world.grid[index + world.size] && world.grid[index] === world.grid[index + world.size * 2]) [index,index+world.size,index+world.size*2].forEach(value => marks.add(value));
      }
      if (!marks.size) { this.tone('hit'); return false; }
      for (const index of marks) if (world.grid[index] === world.targetColor) world.collected += 1;
      // Matched gems fall out and each column refills from the top.
      for (let col=0;col<world.size;col+=1) {
        const survivors=[];
        for(let row=world.size-1;row>=0;row-=1){const index=row*world.size+col;if(!marks.has(index))survivors.push(world.grid[index]);}
        while(survivors.length<world.size)survivors.push(Math.floor(this.random()*world.colors));
        for(let row=world.size-1;row>=0;row-=1)world.grid[row*world.size+col]=survivors[world.size-1-row];
      }
      this.ensureMatchOpportunity();
      this.score += marks.size * 35; this.tone('score'); return true;
    }

    ensureMatchOpportunity() {
      const world=this.world,size=world.size;
      const hasTargetLine=grid=>grid.some((value,index)=>value===world.targetColor&&(
        (index%size<size-2&&value===grid[index+1]&&value===grid[index+2])||
        (index<size*(size-2)&&value===grid[index+size]&&value===grid[index+size*2])
      ));
      for(let first=0;first<world.grid.length;first+=1)for(const second of [first+1,first+size]){
        if(second>=world.grid.length||(second===first+1&&Math.floor(first/size)!==Math.floor(second/size)))continue;
        const grid=world.grid.slice();[grid[first],grid[second]]=[grid[second],grid[first]];
        if(hasTargetLine(grid))return;
      }
      // A dead target board is reshuffled into a visible, legal one-swap pattern.
      world.grid=world.grid.map((_,index)=>(index%size+Math.floor(index/size)*2+this.stage)%world.colors);
      world.grid[0]=world.targetColor;world.grid[1]=(world.targetColor+1)%world.colors;
      world.grid[2]=world.targetColor;world.grid[size+1]=world.targetColor;
      world.selected=-1;
      this.status('棋盘已重新排列，继续交换相邻晶体');
    }

    pickCup(point) {
      const world = this.world;
      if (!world.ready || world.picked >= 0 || point.y < 185 || point.y > 430 || point.x < 24 || point.x > 336) return;
      const index = clamp(Math.floor((point.x - 24) / 104), 0, 2);
      world.picked = index;
      const cupId = world.order[index];
      const correct = cupId === world.ball;
      this.emitInteraction('cup_pick', {index, correct});
      if (correct) { this.score += 120; this.tone('success'); this.later(() => !this.finished && this.completeStage('星核位置判断正确'), 420); }
      else { this.tone('hit'); this.later(() => !this.finished && this.fail('星核在另一只杯子下'), 420); }
    }

    releaseHook() {
      const world = this.world;
      if (!world.holding) return;
      world.holding = false;
      const hookPoint = {x: world.hookX, y: 112 + world.hook};
      const correct = distance(hookPoint, world.fish) < world.fish.radius + 22;
      this.emitInteraction('hook_release', {depth: Math.round(world.hook), correct});
      if (correct) {
        world.caught += 1; this.score += 95; world.oxygen = Math.min(100, world.oxygen + 14); world.fish = this.makeFish(); this.tone('score');
        if (world.caught >= world.goal) this.completeStage('目标光鱼已捕获');
      } else { world.oxygen -= 12; this.tone('hit'); if (world.oxygen <= 0) this.fail('氧气耗尽，未能完成捕获'); }
    }

    placeTower(point) {
      const world = this.world;
      if (point.y < 120 || point.y > 430) return;
      const col = clamp(Math.floor(point.x / 120), 0, 2);
      const row = point.y < 315 ? 0 : 1;
      const index = row * 3 + col;
      const cost = 2 + world.towers[index];
      if (world.energy < cost || world.towers[index] >= 3) { this.tone('hit'); return; }
      world.energy -= cost; world.towers[index] += 1; this.score += 20; this.tone('tap');
      this.emitInteraction('tower_place', {index, level: world.towers[index], energy: Number(world.energy.toFixed(1))});
    }

    mergeBoardRect() { return {x:20, y:84, w:320, h:420}; }

    selectMerge(point) {
      const world = this.world;
      const cell = this.boardCell(point, world.size, this.mergeBoardRect());
      if (cell < 0 || world.moves <= 0) return;
      if (world.selected < 0) { world.selected = cell; this.tone('tap'); return; }
      const first = world.selected;
      if (first === cell) { world.selected = -1; this.tone('tap'); return; }
      const adjacent = Math.abs(first - cell) === 1 && Math.floor(first / world.size) === Math.floor(cell / world.size) || Math.abs(first - cell) === world.size;
      if (!adjacent || world.grid[first] !== world.grid[cell]) { world.selected = cell; world.combo = 0; this.tone('hit'); return; }
      world.selected = -1;
      const next = Math.min(6, world.grid[first] + 1);
      world.grid[cell] = next; world.grid[first] = 1 + Math.floor(this.random() * 2); world.moves -= 1; world.bestLevel = Math.max(world.bestLevel, next); this.score += next * 55; this.tone('score');
      world.combo += 1; world.mergedCell = cell; world.mergeAt = this.stageElapsed;
      this.emitInteraction('fruit_merge', {level: next, moves: world.moves});
      if (world.bestLevel >= world.goal) this.completeStage(`培育出 ${world.goal} 级果实`);
      else if (world.moves <= 0) this.fail('移动次数耗尽');
      else if (!world.grid.some((value, index) => (index % world.size < world.size - 1 && value === world.grid[index + 1]) || (index + world.size < world.grid.length && value === world.grid[index + world.size]))) this.fail('没有可合并的相邻果实');
    }

    selectShopStep(point) {
      const world = this.world;
      if (point.y < 394) return;
      const choice = clamp(Math.floor(point.x / 90), 0, 3);
      const correct = world.order[world.step] === choice;
      this.emitInteraction('order_step', {choice, expected: world.order[world.step], correct});
      if (!correct) { world.patience -= 18; this.tone('hit'); return; }
      world.step += 1; this.score += 35; this.tone('tap');
      if (world.step >= world.order.length) {
        world.orders += 1; this.score += 100; world.step = 0; world.patience = Math.min(100, world.patience + 24);
        world.order = world.recipes[(world.orders + this.stage) % world.recipes.length];
        this.tone('score');
        if (world.orders >= world.goal) this.completeStage('本阶段订单全部交付');
      }
    }

    selectWardrobe(point) {
      const world = this.world;
      if (point.y >= 462 && point.y <= 504) {
        const correct = world.choices.every((value, index) => value === world.target[index]);
        this.emitInteraction('look_submit', {choices: world.choices.slice(), correct});
        if (correct) { this.score += 180; this.tone('success'); this.completeStage('造型符合场合要求'); }
        else { world.attempts -= 1; this.tone('hit'); this.status('场合匹配度不足，请检查三个类别'); if (world.attempts <= 0) this.fail('造型提交机会已用完'); }
        return;
      }
      if (point.y >= 104 && point.y <= 146) { world.category = clamp(Math.floor((point.x - 22) / 106), 0, 2); return; }
      if (point.y < 354 || point.y > 436 || point.x < 28 || point.x > 332) return;
      const option = clamp(Math.floor((point.x - 28) / 104), 0, 2);
      world.choices[world.category] = option; this.tone('tap');
      this.emitInteraction('wardrobe_select', {category: world.category, option});
    }

    answerQuiz(point) {
      const world = this.world;
      if (world.locked) return;
      const choice = clamp(Math.floor((point.y - 250) / 66), 0, 2);
      if (point.y < 245 || point.y > 455) return;
      const question = world.questions[world.index];
      const correct = choice === question.correct;
      world.locked = true; world.feedback = correct ? '判断正确' : '需要停止并重新核验';
      if (correct) { world.correct += 1; this.score += 100; this.tone('score'); } else this.tone('hit');
      this.emitInteraction('scenario_choice', {question: world.index, choice, correct});
      this.later(() => {
        if (this.finished) return;
        world.index += 1; world.locked = false; world.feedback = '';
        if (world.index >= world.questions.length) {
          if (world.correct >= 2) this.completeStage('安全路线判断完成'); else this.fail('安全判断未达标');
        }
      }, 520);
    }

    toggleSequencer(point) {
      const world = this.world;
      if (point.y > 468) {
        const correct = world.grid.every((value, index) => value === world.target[index]);
        this.emitInteraction('sequence_submit', {correct, attempts: world.attempts});
        if (correct) { this.score += 220; this.tone('success'); this.completeStage('四轨节奏已同步'); }
        else { world.attempts -= 1; this.tone('hit'); if (world.attempts <= 0) this.fail('编排次数耗尽'); }
        return;
      }
      const cell = this.boardCell(point, 4, {x: 38, y: 140, w: 284, h: 284});
      if (cell >= 0) { world.grid[cell] = !world.grid[cell]; this.tone('tap'); }
    }

    tapSequence(point) {
      const world = this.world;
      if (!world.ready || point.y < 306) return;
      const pad = clamp(Math.floor(point.x / 90), 0, 3);
      const expected = world.sequence[world.input.length];
      world.input.push(pad); this.tone(pad === expected ? 'tap' : 'hit');
      this.emitInteraction('voice_pad', {pad, expected, correct: pad === expected});
      if (pad !== expected) { this.fail('声部顺序中断'); return; }
      if (world.input.length >= world.sequence.length) { this.score += 160 + world.sequence.length * 10; this.completeStage('舞台连奏完成'); }
    }

    beginSort(point) {
      const item = this.world.items.filter(entry => !entry.sorted).sort((a, b) => distance(a, point) - distance(b, point))[0];
      if (item && distance(item, point) < 28) { item.dragging = true; this.world.selected = item; }
    }

    endSort(point) {
      const world = this.world;
      const item = world.selected;
      if (!item) return;
      item.dragging = false; world.selected = null;
      const bin = clamp(Math.floor(point.x / 120), 0, 2);
      const correct = point.y > 430 && bin === item.type;
      this.emitInteraction('mail_sort', {type: item.type, bin, correct});
      if (correct) { item.sorted = true; world.sorted += 1; this.score += 55; this.tone('score'); }
      else { world.mistakes += 1; item.x = 55 + this.random() * 250; item.y = 115 + this.random() * 260; this.tone('hit'); if (world.mistakes >= world.maxMistakes) this.fail('错投次数过多，请核对信箱颜色'); }
      if (world.sorted >= world.goal) this.completeStage('夜间邮件全部投递');
    }

    moveMaze(point) {
      const world = this.world;
      const cell = this.boardCell(point, world.size, {x: 31, y: 113, w: 298, h: 298});
      if (cell < 0 || world.walls.has(cell) || world.steps <= 0) return;
      const adjacent = Math.abs(cell - world.player) === 1 && Math.floor(cell / world.size) === Math.floor(world.player / world.size) || Math.abs(cell - world.player) === world.size;
      if (!adjacent) return;
      world.player = cell; world.steps -= 1; this.tone('tap');
      world.guards.forEach(guard => {
        const next = guard.index + guard.dir;
        if (next < 0 || next >= world.size * world.size || world.walls.has(next) || Math.floor(next / world.size) !== Math.floor(guard.index / world.size)) guard.dir *= -1;
        else guard.index = next;
      });
      this.emitInteraction('maze_step', {cell, steps: world.steps});
      if (world.guards.some(guard => guard.index === world.player)) this.fail('被巡逻灯发现');
      else if (world.player === world.exit) this.completeStage('安全抵达出口');
      else if (world.steps <= 0) this.fail('潜行步数耗尽');
    }

    launchCoin(point) {
      const world = this.world;
      if (world.coin.moving || world.launches <= 0) return;
      const dx = point.x - world.coin.x;
      const dy = point.y - world.coin.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      // Choose a flight time then solve the ballistic arc, so even top rings are reachable.
      const flightTime = clamp(length / 360, .65, 1.1);
      const power = length / flightTime;
      world.coin.vx = dx / flightTime;
      world.coin.vy = (dy - .5 * 190 * flightTime * flightTime) / flightTime;
      world.coin.moving = true; world.launches -= 1; this.tone('tap');
      this.emitInteraction('coin_launch', {power: Math.round(power), launches: world.launches});
    }

    buildPlot(point) {
      const world = this.world;
      if (point.y > 448) { world.selectedType = clamp(Math.floor(point.x / 120), 0, 2) + 1; return; }
      const cell = this.boardCell(point, 3, {x: 52, y: 145, w: 256, h: 256});
      if (cell < 0 || world.plots[cell] || world.turns <= 0) return;
      const type = world.selectedType;
      if (type === 1 && world.water < 1) return;
      if (type === 2 && world.food < 1) return;
      if (type === 1) { world.water -= 1; world.food += 3; }
      if (type === 2) { world.food -= 1; world.water += 2; }
      if (type === 3) { if (world.food < 2 || world.water < 1) return; world.food -= 2; world.water -= 1; world.homes += 1; }
      world.plots[cell] = type; world.turns -= 1; this.score += type * 30; this.tone('tap');
      const production = world.food + world.water + world.homes * 2;
      this.emitInteraction('building_place', {cell, type, production});
      if (production >= world.goal && world.homes >= this.stage) this.completeStage('岛屿资源循环已建立');
      else if (world.turns <= 0 || world.plots.every(Boolean)) this.fail('土地已用完，资源配置未达到目标');
    }

    battleAction(point) {
      const world = this.world;
      if (point.y < 430) return;
      const action = clamp(Math.floor(point.x / 120), 0, 2);
      if (action === 0) { const damage = 7 + this.stage * 2 + world.charge; world.enemy -= damage; world.charge = 0; world.message = `造成 ${damage} 点伤害`; this.score += damage * 5; }
      if (action === 1) { world.guard += 14 + this.stage * 4; world.message = '防御姿态已展开'; }
      if (action === 2) { world.charge = Math.min(24, world.charge + 8); world.message = '力量已蓄积'; }
      this.tone('tap');
      this.emitInteraction('battle_action', {action, turn: world.turn});
      if (world.enemy <= 0) { this.completeStage('敌方阵线已击破'); return; }
      const incoming = [8 + this.stage * 2, 5 + this.stage, 11 + this.stage * 2][world.intent];
      const blocked = Math.min(world.guard, incoming);
      world.guard -= blocked; world.hero -= incoming - blocked;
      world.intent = (world.intent + world.turn + this.stage) % 3; world.turn += 1;
      if (world.hero <= 0) this.fail('骑士队伍失去战斗力');
    }

    boardCell(point, size, rect) {
      if (!pointIn(point, rect)) return -1;
      const col = clamp(Math.floor((point.x - rect.x) / (rect.w / size)), 0, size - 1);
      const row = clamp(Math.floor((point.y - rect.y) / (rect.h / size)), 0, size - 1);
      return row * size + col;
    }

    draw() {
      const context = this.context;
      context.setTransform(this.canvas.width / WIDTH, 0, 0, this.canvas.height / HEIGHT, 0, 0);
      context.clearRect(0, 0, WIDTH, HEIGHT);
      this.drawBackdrop();
      this.drawHud();
      switch (this.config.mechanic) {
        case 'runner': this.drawRunner(); break;
        case 'rhythm': this.drawRhythm(); break;
        case 'stack': this.drawStack(); break;
        case 'circuit': this.drawCircuit(); break;
        case 'match': this.drawMatch(); break;
        case 'cups': this.drawCups(); break;
        case 'fishing': this.drawFishing(); break;
        case 'defense': this.drawDefense(); break;
        case 'drift': this.drawDrift(); break;
        case 'shooter': this.drawShooter(); break;
        case 'merge': this.drawMerge(); break;
        case 'shop': this.drawShop(); break;
        case 'io': this.drawIo(); break;
        case 'wardrobe': this.drawWardrobe(); break;
        case 'quiz': this.drawQuiz(); break;
        case 'sequencer': this.drawSequencer(); break;
        case 'sequence': this.drawSequence(); break;
        case 'sort': this.drawSort(); break;
        case 'maze': this.drawMaze(); break;
        case 'coin': this.drawCoin(); break;
        case 'builder': this.drawBuilder(); break;
        case 'battle': this.drawBattle(); break;
        default: break;
      }
      this.drawInputFeedback();
      if (this.paused) this.drawPause();
    }

    drawBackdrop() {
      // Bright casual backplates stay visible without a dark photographic wash.
      if (this.drawImageCover(this.art.background, {x:0,y:0,w:WIDTH,h:HEIGHT})) return;
      this.context.fillStyle = this.gameKey === 'orchard-merge' ? '#DDE8B3' : this.config.surface;
      this.context.fillRect(0, 0, WIDTH, HEIGHT);
    }

    drawHud() {
      if (this.gameKey === 'orchard-merge') { this.drawMergeHud(); return; }
      panel(this.context, {x:12,y:12,w:336,h:34,r:17}, this.uiTheme.hud, this.uiTheme.rim, 3);
      panel(this.context, {x:20,y:16,w:54,h:26,r:12}, this.uiTheme.badge, this.uiTheme.rim, 2);
      label(this.context, `${this.stage} / 3`, 47, 29, {size:11,weight:900,align:'center'});
      label(this.context, `${Math.round(this.score)} 分`, 333, 29, {size:11,weight:800,align:'right'});
      if (this.stage === 1 && this.stageElapsed < 4) {
        label(this.context, this.config.instruction, 180, 59, {size:10,weight:650,align:'center',color:'#FFFFFF',shadow:true,maxWidth:324});
      }
      this.drawSensorControl();
    }

    drawMergeHud() {
      const context = this.context; const world = this.world;
      panel(context, {x:12,y:18,w:336,h:42,r:18}, '#3B8B4D', '#A0CC70', 4);
      panel(context, {x:158,y:24,w:78,h:30,r:14}, '#20A9E3', '#9EDAF1', 2);
      panel(context, {x:288,y:24,w:51,h:30,r:14}, '#E5AF36', '#FFDF7D', 2);
      label(context, '合成', 27, 39, {size:12,weight:850,color:'#FFF8DE',shadow:true});
      this.drawMergeFruit(world.goal, {x:60,y:23,w:31,h:32});
      label(context, `${world.moves} 步`, 197, 39, {size:14,weight:900,align:'center',color:'#FFFFFF'});
      label(context, `${this.stage} / 3`, 313, 39, {size:11,weight:900,align:'center',color:'#FFFFFF'});
    }

    drawSensorControl() {
      if (!this.sensorProfile) return;
      const state = this.sensorState || {status: 'unavailable'};
      const active = state.status === 'active';
      const requesting = state.status === 'requesting';
      const unavailable = ['denied','error','unavailable'].includes(state.status);
      const copy = active ? state.activeLabel : requesting ? '等待系统授权…' : unavailable ? '触控模式 · 可重试' : state.prompt;
      const fill = active ? '#32A56C' : unavailable ? '#41454F' : '#131821';
      panel(this.context, this.sensorControlRect(), fill, active ? '#92C1AF' : '#4B535B', active ? 7 : 2);
      label(this.context, active ? '✓' : requesting ? '…' : '◎', 28, 85.5, {size: 10, weight: 900, align: 'center'});
      label(this.context, copy, 42, 85.5, {size: 9, weight: 850, maxWidth: 134});
    }

    drawCanonicalCharacter(rect, options) {
      const character = {'pixel-quest':'runner','paws-stage':'kitten','puppet-studio':'plush','formation-knights':'hero','moonlight-tea-shop':'model'}[this.gameKey];
      return !!(character && this.drawSprite(character, rect, {flipX: !!(options && (options.mirror || options.flipX))}));
    }

    drawRunner() {
      const context = this.context;
      const world = this.world;
      context.save();
      context.beginPath(); context.moveTo(78, 90); context.lineTo(282, 90); context.lineTo(344, 528); context.lineTo(16, 528); context.closePath();
      // The environment is the running surface; these are lane guides, not a second backdrop.
      context.fillStyle = this.gameKey === 'pixel-quest' ? 'rgba(245,225,170,.09)' : 'rgba(134,215,242,.07)'; context.fill();
      context.strokeStyle = this.gameKey === 'pixel-quest' ? 'rgba(255,242,193,.78)' : 'rgba(191,235,249,.82)';
      context.lineWidth = 2; context.stroke();
      for (let lane = 1; lane < 3; lane += 1) {
        const top = 78 + 68 * lane;
        const bottom = 16 + 109.3 * lane;
        context.setLineDash([9, 15]); context.lineDashOffset = -world.distance * 3;
        context.beginPath(); context.moveTo(top, 90); context.lineTo(bottom, 528);
        context.strokeStyle = 'rgba(255,253,230,.62)'; context.lineWidth = 1.5; context.stroke();
      }
      context.setLineDash([]);
      for (const y of [172,282,392,502]) {
        const spread = (y - 90) / 438;
        for (const x of [78 - 62 * spread,282 + 62 * spread]) {
          panel(context,{x:x-3,y:y-5,w:6,h:10,r:2},this.gameKey === 'pixel-quest' ? '#D6B475' : '#79B5CA','rgba(255,249,218,.75)',0);
        }
      }
      world.obstacles.forEach(item => {
        const x = 71 + item.lane * 109;
        if (!this.drawSprite(item.kind === 'chip' ? 'energy' : 'roadblock', {x:x-24,y:item.y-24,w:48,h:48})) {
          if (item.kind === 'chip') diamond(context, x, item.y, 12, this.config.secondary, '#FFF2B6');
          else panel(context, {x:x-25,y:item.y-11,w:50,h:22,r:7}, '#B54850', '#F29DA1');
        }
      });
      const playerX = 71 + world.lane * 109;
      const jumpHeight=world.jump>0?Math.sin(world.jump/.7*Math.PI)*36:0;
      if (!this.drawCanonicalCharacter({x: playerX - 30, y: 424-jumpHeight, w: 60, h: 88}, {shadowBlur: 5, shadowOffsetY: 2}) && !this.drawSprite('runner', {x:playerX-30,y:424-jumpHeight,w:60,h:88})) {
        panel(context, {x: playerX - 20, y: 451-jumpHeight, w: 40, h: 58, r: 14}, this.config.accent, '#C5C8CB', 8);
        context.fillStyle = '#EAF4F4'; context.fillRect(playerX - 9, 461-jumpHeight, 18, 16);
      }
      label(context, `${Math.min(100, Math.round(world.distance / world.goal * 100))}%`, 180, 105, {size: 11, weight: 850, align: 'center'});
      this.drawMeter({x: 42, y: 119, w: 276, h: 8}, world.distance / world.goal, this.config.accent);
      label(context, `护盾 ${world.shield}`, 26, 536, {size: 10, weight: 800});
      label(context, this.sensorProfile && this.sensorProfile.control === 'lane' ? '倾斜换道 · 点按角色跳跃' : '点按换道 · 点按角色跳跃', 334, 536, {size: 9, weight: 700, align: 'right', color: '#FFFFFF', shadow: true});
      context.restore();
    }

    drawRhythm() {
      const context = this.context;
      const world = this.world;
      fieldBoundary(context,{x:24,y:97,w:312,h:398},'rgba(248,221,187,.4)');
      panel(context,{x:24,y:78,w:312,h:25,r:12},this.uiTheme.hud,this.uiTheme.rim,2);
      for (let pad = 0; pad < 4; pad += 1) {
        const x = 32 + pad * 76;
        context.save();roundedRect(context,x,110,68,341,12);
        context.fillStyle=pad%2?'rgba(214,177,145,.10)':'rgba(145,199,213,.10)';context.fill();
        context.strokeStyle='rgba(246,239,223,.3)';context.lineWidth=1;context.stroke();context.restore();
        panel(context, {x: x + 5, y: 447, w: 58, h: 38, r: 14}, pad % 2 ? this.config.secondary : this.config.accent, '#80858C', 5);
        this.drawSprite(['emerald','ruby','sapphire','amethyst'][pad], {x:x+17,y:450,w:34,h:28});
      }
      context.strokeStyle = '#FFFFFF'; context.globalAlpha = .45; context.lineWidth = 2; context.beginPath(); context.moveTo(30, 439); context.lineTo(330, 439); context.stroke(); context.globalAlpha = 1;
      world.notes.forEach(note => {
        const x = 66 + note.pad * 76;
        if (!this.drawSprite('star', {x:x-17,y:note.y-17,w:34,h:34})) circle(context, x, note.y, 13, note.pad % 2 ? this.config.secondary : this.config.accent, '#FFFFFF', 2);
      });
      label(context, `HIT ${world.hits}/${world.goal}`, 35, 92, {size: 10, weight: 850});
      label(context, `COMBO ${world.combo}`, 325, 92, {size: 10, weight: 850, align: 'right'});
    }

    drawStack() {
      const context = this.context;
      const world = this.world;
      fieldBoundary(context,{x:22,y:94,w:316,h:426},'rgba(243,245,222,.58)');
      panel(context,{x:111,y:96,w:138,h:26,r:13},this.uiTheme.hud,this.uiTheme.rim,2);
      contactShadow(context,180,516,90,8);
      context.save();context.strokeStyle='rgba(249,234,168,.8)';context.lineWidth=2;
      context.beginPath();context.moveTo(44,518);context.lineTo(316,518);context.stroke();context.restore();
      for (let index = 0; index < world.blocks.length; index += 1) {
        const block = world.blocks[index];
        panel(context,{x:block.x,y:block.y,w:block.w,h:30,r:6},index%2?'#E6B45F':'#4B8CA4','#FFF5CC',3);
        this.drawSprite('house',{x:block.x,y:block.y-4,w:block.w,h:36});
      }
      if(world.moving){
        panel(context,{x:world.moving.x,y:world.moving.y,w:world.moving.w,h:30,r:6},this.config.accent,'#FFF5CC',3);
        this.drawSprite('house',{x:world.moving.x,y:world.moving.y-4,w:world.moving.w,h:36});
      }
      label(context, `高度 ${world.count}/${world.goal}`, 180, 109, {size: 11, weight: 850, align: 'center', color: '#FFFFFF'});
      label(context, '点按落下平台·偏移部分会被切掉', 180, 538, {size: 9, weight: 700, align: 'center', color: '#BABDC0'});
    }

    drawCircuit() {
      const context=this.context,world=this.world,powered=this.circuitPowered(),cellSize=71;
      panel(context,{x:28,y:101,w:304,h:331,r:24},'#182E2B','#B9A278',8);
      for(let index=0;index<16;index+=1){
        const x=38+index%4*cellSize,y=118+Math.floor(index/4)*cellSize,active=powered.has(index),mask=rotatePipe(world.pipes[index],world.rotations[index]);
        panel(context,{x,y,w:64,h:64,r:14},active?'#244F42':'#243B38',active?'#5ED5A9':'#B7C79C');
        context.strokeStyle=active?'#8CE7C6':'#B5C7C1';context.lineWidth=7;context.lineCap='round';
        for(const [bit,dx,dy] of [[1,0,-31],[2,31,0],[4,0,31],[8,-31,0]])if(mask&bit){context.beginPath();context.moveTo(x+32,y+32);context.lineTo(x+32+dx,y+32+dy);context.stroke();}
        if(!this.drawSprite(index===world.exit?'crystal':active?'emerald':'sapphire',{x:x+21,y:y+21,w:22,h:22},{rotation:world.rotations[index]*Math.PI/2}))circle(context,x+32,y+32,7,this.config.secondary);
      }
      label(context,'→',22,150,{size:20,color:'#FFD567',align:'center'});
      label(context,'↓',70,420,{size:20,color:'#8CE7C6',align:'center'});
      label(context,`剩余旋转 ${world.turns} · 连通 ${powered.size}/16`,180,456,{size:12,align:'center'});
      label(context,'旋转管道，让入口能量穿过所有节点抵达核心',180,482,{size:9,align:'center',color:'#BABDC0'});
    }

    drawMatch() {
      const context = this.context; const world = this.world; const colors = ['#DE5B6A','#4BA4C4','#E0B24F','#8D6AC7','#64A46E'];
      panel(context, {x: 18, y: 99, w: 324, h: 382, r: 24}, '#AA8057', '#B9A278', 8);
      const cell = 51;
      for (let index = 0; index < world.grid.length; index += 1) {
        const col = index % 6; const row = Math.floor(index / 6); const x = 28 + col * cell; const y = 112 + row * cell;
        panel(context, {x, y, w: 45, h: 45, r: 12}, '#F5E9CD', index === world.selected ? '#FFFFFF' : '#313A44');
        if (!this.drawSprite(['ruby','sapphire','star','amethyst','emerald'][world.grid[index]],{x:x+4,y:y+4,w:37,h:37})) diamond(context,x+22.5,y+22.5,13,colors[world.grid[index]],'#FFFFFF');
      }
      if (!this.drawSprite(['ruby','sapphire','star','amethyst','emerald'][world.targetColor],{x:34,y:434,w:28,h:28})) circle(context,48,448,9,colors[world.targetColor],'#FFFFFF');
      label(context, `收集 ${world.collected}/${world.goal}`, 66, 448, {size: 11, weight: 850});
      label(context, `剩余 ${world.moves} 步`, 319, 448, {size: 11, weight: 850, align: 'right'});
    }

    drawCups() {
      const context=this.context,world=this.world;
      panel(context,{x:86,y:125,w:188,h:32,r:15},this.uiTheme.hud,this.uiTheme.rim,2);
      fieldBoundary(context,{x:20,y:175,w:320,h:255},'rgba(247,230,179,.34)');
      label(context,world.reveal>0?'记住星核位置':world.waitingForShuffle?'点按开始洗牌':world.ready?'找到星核':'跟随杯子移动',180,142,{size:14,align:'center'});
      for(let position=0;position<3;position+=1){
        const cupId=world.order[position];
        let visualPosition=position,arc=0;
        if(world.activeSwap){
          const swap=world.activeSwap,t=clamp(swap.progress/swap.duration,0,1),eased=t*t*(3-2*t);
          if(position===swap.a){visualPosition=position+(swap.b-swap.a)*eased;arc=-Math.sin(t*Math.PI)*24;}
          if(position===swap.b){visualPosition=position+(swap.a-swap.b)*eased;arc=Math.sin(t*Math.PI)*24;}
        }
        const x=76+visualPosition*104;
        contactShadow(context,x,352+arc,39,10);
        const reveal=(world.reveal>0||world.picked>=0)&&cupId===world.ball;
        if(!this.drawSprite('cup',{x:x-43,y:210+arc-(reveal?28:0),w:86,h:134})){
          panel(context,{x:x-34,y:218+arc-(reveal?28:0),w:68,h:110,r:12},this.config.accent,'#FFFFFF');
        }
        if(reveal&&!this.drawSprite('star',{x:x-19,y:336,w:38,h:38})) circle(context,x,354,14,this.config.secondary,'#FFFFFF');
        if(world.ready)label(context,position+1,76+position*104,399,{size:12,align:'center'});
      }
      label(context,`交换 ${world.swapIndex}/${world.swaps.length}`,180,426,{size:10,align:'center',color:'#BABDC0'});
    }

    drawFishing() {
      const context = this.context; const world = this.world;
      // Keep the river / deep-water world visible. Only depth guides sit over it.
      context.save();
      context.strokeStyle = this.gameKey === 'jungle-dive' ? 'rgba(232,250,211,.72)' : 'rgba(182,234,249,.76)';
      context.lineWidth = 1.5; context.beginPath(); context.moveTo(28,144); context.lineTo(28,500); context.stroke();
      for (let index=0;index<=10;index+=1) {
        const y=150+index*35;
        context.beginPath(); context.moveTo(28,y); context.lineTo(index%2?34:39,y); context.stroke();
        if(index%2===0) label(context,String(index*4),43,y,{size:8,weight:800,color:'#FFFFFF',shadow:true});
      }
      for (const y of [240,375]) {
        context.strokeStyle = this.gameKey === 'jungle-dive' ? 'rgba(194,236,178,.25)' : 'rgba(147,212,240,.3)';
        context.setLineDash([3,9]); context.beginPath(); context.moveTo(64,y);
        context.bezierCurveTo(128,y-7,238,y+7,326,y); context.stroke();
      }
      context.setLineDash([]);
      context.strokeStyle = 'rgba(34,65,61,.68)'; context.lineWidth=3.5;
      context.beginPath(); context.moveTo(world.hookX,103); context.lineTo(world.hookX,112+world.hook); context.stroke();
      context.strokeStyle = '#E6D6A4'; context.lineWidth=1.5; context.stroke();
      context.restore();
      panel(context,{x:24,y:103,w:312,h:30,r:14},this.uiTheme.hud,this.uiTheme.rim,2);
      if(!this.drawSprite('hook',{x:world.hookX-15,y:102+world.hook,w:30,h:32})){context.beginPath();context.arc(world.hookX,116+world.hook,8,0,Math.PI);context.stroke();}
      if(!this.drawSprite('fish',{x:world.fish.x-30,y:world.fish.y-21,w:60,h:42},{flipX:world.fish.vx<0})){context.save();context.translate(world.fish.x,world.fish.y);context.fillStyle=this.config.secondary;context.beginPath();context.ellipse(0,0,22,12,0,0,TAU);context.fill();context.restore();}
      label(context, `捕获 ${world.caught}/${world.goal}`, 35, 120, {size: 11, weight: 850});
      label(context, `氧气 ${Math.round(world.oxygen)}%`, 325, 120, {size: 11, weight: 850, align: 'right'});
      this.drawMeter({x: 45, y: 531, w: 270, h: 8}, world.oxygen / 100, '#61C2D1');
    }

    drawDefense() {
      const context = this.context; const world = this.world;
      // Keep the three interactive approach routes aligned with each authored map.
      const crystal = this.gameKey === 'crystal-bastion';
      if (crystal) panel(context,{x:24,y:78,w:312,h:25,r:8},this.uiTheme.hud,this.uiTheme.rim,1.5);
      context.save();
      for (let lane = 0; lane < 3; lane += 1) {
        const x = 72 + lane * 108;
        context.beginPath(); context.moveTo(x,130); context.lineTo(x,463);
        context.strokeStyle = 'rgba(255,248,220,.08)'; context.lineWidth=34; context.stroke();
        context.setLineDash([4,12]); context.strokeStyle = crystal ? 'rgba(107,92,60,.40)' : this.gameKey === 'ember-bastion' ? 'rgba(255,216,155,.46)' : 'rgba(229,249,255,.48)';
        context.lineWidth=1.2; context.stroke(); context.setLineDash([]);
        for (const y of [147,294,452]) {
          context.beginPath(); context.moveTo(x-6,y-3); context.lineTo(x,y+3); context.lineTo(x+6,y-3); context.stroke();
        }
      }
      context.restore();
      for (let index = 0; index < 6; index += 1) {
        const col = index % 3; const row = Math.floor(index / 3); const x = 72 + col * 108; const y = row ? 375 : 220;
        context.save();
        context.beginPath(); context.ellipse(x,y+16,31,13,0,0,TAU);
        context.fillStyle = crystal ? '#F6E8BD' : this.gameKey === 'ember-bastion' ? 'rgba(237,191,124,.28)' : 'rgba(224,241,243,.34)';
        context.fill(); context.strokeStyle=this.uiTheme.rim; context.lineWidth=1.5; context.stroke();
        context.beginPath(); context.ellipse(x,y+13,25,9,0,0,TAU); context.strokeStyle='rgba(255,253,222,.65)'; context.lineWidth=1; context.stroke();
        context.restore();
        if(!world.towers[index]){
          this.drawSprite(this.gameKey==='sky-cannon'?'cannon':'turret',{x:x-20,y:y-29,w:40,h:46},{alpha:crystal?.58:.30});
          circle(context,x+22,y-13,8,'#F9E6A9',this.uiTheme.rim,1);
          label(context,'+',x+22,y-13,{size:12,weight:900,align:'center',color:'#665335'});
        }
        if(world.towers[index]){
          if(!this.drawSprite(this.gameKey==='sky-cannon'?'cannon':'turret',{x:x-29,y:y-34,w:58,h:68})){context.fillStyle='#D7C19D';context.fillRect(x-8,y-22,16,44);}
          label(context,`L${world.towers[index]}`,x,y+34,{size:9,align:'center',color:crystal?'#253D32':'#FFFFFF'});
          const target=world.enemies.find(enemy=>enemy.lane===col);
          if(target&&Math.floor(this.elapsed*7)%2===0){context.strokeStyle=this.config.secondary;context.lineWidth=2;context.beginPath();context.moveTo(x,y-20);context.lineTo(x,target.y);context.stroke();}
        }
      }
      world.enemies.forEach(enemy => {
        const x = 72 + enemy.lane * 108;
        if(!this.drawSprite('raider',{x:x-22,y:enemy.y-25,w:44,h:50})) hexagon(context,x,enemy.y,15,'#A8454B','#F1A1A6');
        this.drawMeter({x: x - 17, y: enemy.y - 25, w: 34, h: 4}, enemy.hp / enemy.max, '#E56D72');
      });
      this.drawSprite('crystal',{x:153,y:462,w:54,h:49});
      label(context, `波次 ${world.wave}/${world.goal}`, 31, 91, {size: 10, weight: 850});
      label(context, `能量 ${world.energy.toFixed(1)} · 基地 ${world.base}`, 329, 91, {size: 10, weight: 850, align: 'right'});
      label(context, '点按塔位部署或升级·每条路线独立攻击', 180, 532, {size: 9, weight: 650, align: 'center', color: crystal ? '#253D32' : '#FFFFFF', shadow: !crystal});
    }

    drawDrift() {
      const context = this.context; const world = this.world;
      // Guides follow the simulated road center at the car's y=471 collision line.
      const centerAt = y => 180 + Math.sin((world.distance + this.stage * 17 + (471-y)*.06)*.055)*(45+this.stage*8);
      const roadYs = Array.from({length:21},(_,index)=>107+index*20);
      context.save(); context.beginPath();
      roadYs.forEach((y,index)=>{const x=centerAt(y)-76;if(index===0)context.moveTo(x,y);else context.lineTo(x,y);});
      roadYs.slice().reverse().forEach(y=>context.lineTo(centerAt(y)+76,y));context.closePath();
      context.fillStyle = this.gameKey === 'city-rush' ? 'rgba(107,153,172,.10)' : 'rgba(240,205,151,.10)'; context.fill();
      context.strokeStyle='rgba(245,250,241,.72)';context.lineWidth=2;context.stroke();
      context.setLineDash([10,18]);context.lineDashOffset=-world.distance*3;
      context.beginPath();roadYs.forEach((y,index)=>{if(index===0)context.moveTo(centerAt(y),y);else context.lineTo(centerAt(y),y);});
      context.strokeStyle='rgba(255,247,217,.56)';context.lineWidth=1.4;context.stroke();context.setLineDash([]);
      for(const y of [151,221,291,361,431,501]){
        for(const side of [-1,1]){
          const x=centerAt(y)+side*78;
          panel(context,{x:x-3,y:y-5,w:6,h:10,r:1},this.gameKey==='city-rush'?'#D47A69':'#D3B06F','rgba(255,251,228,.78)',0);
        }
      }
      context.restore();
      world.barriers.forEach(barrier=>{if(!this.drawSprite('roadblock',{x:barrier.x-26,y:barrier.y-22,w:52,h:44}))panel(context,{x:barrier.x-17,y:barrier.y-8,w:34,h:16,r:5},'#D66A55','#F4C0AA');});
      if(!this.drawSprite('car',{x:world.carX-26,y:431,w:52,h:80},{rotation:world.steer*.12}))panel(context,{x:world.carX-17,y:444,w:34,h:54,r:11},this.config.accent,'#FFFFFF',7);
      label(context, `${Math.round(world.distance/world.goal*100)}%`, 180, 124, {size: 10, weight: 850, align: 'center'});
      this.drawMeter({x: 42, y: 529, w: 276, h: 8}, world.grip / 100, '#57B8C8');
      label(context, this.sensorProfile && this.sensorProfile.control === 'steer' ? '倾斜转向 · 也可按住左右' : '按住左右控制方向', 180, 548, {size: 9, weight: 700, align: 'center', color: '#FFFFFF', shadow: true});
    }

    drawShooter() {
      const context = this.context; const world = this.world;
      fieldBoundary(context,{x:20,y:98,w:320,h:418},'rgba(198,231,249,.52)');
      panel(context,{x:24,y:78,w:312,h:25,r:12},this.uiTheme.hud,this.uiTheme.rim,2);
      // Dock lights indicate the flight limit while the planet / starfield remains visible.
      context.save();context.strokeStyle='rgba(205,233,252,.48)';context.lineWidth=1;
      for(const y of [155,250,345,440]){context.beginPath();context.moveTo(20,y);context.lineTo(28,y);context.moveTo(332,y);context.lineTo(340,y);context.stroke();}
      context.restore();
      world.bullets.forEach(bullet=>{if(!this.drawSprite('bullet',{x:bullet.x-5,y:bullet.y-12,w:10,h:24})){context.fillStyle=this.config.secondary;context.fillRect(bullet.x-2,bullet.y-9,4,14);}});
      world.enemies.forEach(enemy=>{if(!this.drawSprite(this.gameKey==='rift-strike'?'drone':'enemy_ship',{x:enemy.x-23,y:enemy.y-23,w:46,h:46}))hexagon(context,enemy.x,enemy.y,15,'#B94B69','#ED9FB3');});
      if(!this.drawSprite('spacecraft',{x:world.ship.x-29,y:world.ship.y-32,w:58,h:64})){context.save();context.translate(world.ship.x,world.ship.y);context.beginPath();context.moveTo(0,-24);context.lineTo(22,19);context.lineTo(-22,19);context.closePath();context.fillStyle=this.config.accent;context.fill();context.restore();}
      label(context, `击破 ${world.kills}/${world.goal}`, 31, 91, {size: 10, weight: 850});
      label(context, `护盾 ${world.shield}`, 329, 91, {size: 10, weight: 850, align: 'right'});
      label(context, this.sensorProfile && this.sensorProfile.control === 'aim' ? '倾斜移动 · 也可拖动战机' : '拖动战机自动射击', 180, 536, {size: 9, weight: 700, align: 'center', color: '#FFFFFF', shadow: true});
    }

    drawMerge() {
      const context = this.context; const world = this.world;
      const board = this.mergeBoardRect();
      const cellWidth = board.w / world.size; const cellHeight = board.h / world.size;
      panel(context, {x:10,y:74,w:340,h:440,r:26}, '#F4E5BB', '#C8A875', 5);
      for (let index = 0; index < world.grid.length; index += 1) {
        const col = index % world.size; const row = Math.floor(index / world.size);
        const tileX = board.x + col * cellWidth + 3; const tileY = board.y + row * cellHeight + 4;
        const tileWidth = cellWidth - 6; const tileHeight = cellHeight - 8;
        const selected = index === world.selected;
        panel(context, {x:tileX,y:tileY,w:tileWidth,h:tileHeight,r:16,lineWidth:selected?3:1}, selected ? '#EDF7CD' : '#FFF7E5', selected ? '#75B13F' : '#D4BC93', selected ? 4 : 3);
        this.drawMergeFruit(world.grid[index], {x:tileX+3,y:tileY+5,w:tileWidth-6,h:tileHeight-10});
        if (world.mergedCell === index) this.drawMergeBurst(tileX + tileWidth/2, tileY + tileHeight/2, this.stageElapsed - world.mergeAt);
      }
      if (world.moves === 18 || (world.combo > 1 && this.stageElapsed-world.mergeAt < 1.2)) {
        const hint = world.combo > 1 ? `连合 ×${world.combo}` : '点选两个相邻的同级果实';
        label(context, hint, 180, 538, {size:10,weight:800,align:'center',color:'#FFFFFF'});
      }
    }

    drawMergeFruit(level, rect) {
      const context = this.context;
      if (this.drawSprite(['green_apple','pear','red_apple','orange','plum','golden_fruit'][clamp(level-1,0,5)], rect)) return;
      const colors = ['#86B94E','#E6B74C','#E2644D','#F08B70','#875998','#F0C64B'];
      circle(context, rect.x + rect.w / 2, rect.y + rect.h / 2 + 2, 17, colors[clamp(level-1,0,5)], '#262729');
      context.fillStyle='#5A4728';context.fillRect(rect.x+rect.w/2-1,rect.y+4,3,8);
      circle(context, rect.x+rect.w/2-7, rect.y+14, 5, '#696F77');
    }

    drawMergeBurst(x, y, elapsed) {
      if (elapsed < 0 || elapsed > .55 || this.reducedMotion) return;
      const context = this.context; const progress = elapsed / .55;
      context.save(); context.globalAlpha = 1 - progress;
      for (let index=0; index<8; index+=1) {
        const angle = TAU * index / 8; const radius = 12 + progress * 22;
        circle(context, x + Math.cos(angle)*radius, y + Math.sin(angle)*radius, 2.4-progress, index%2 ? '#FFE8A3' : '#FF765C');
      }
      context.restore();
    }

    drawShop() {
      const context = this.context; const world = this.world; const labels = this.gameKey === 'moonlight-tea-shop' ? ['选茶','调味','加料','出杯'] : ['玩具','颜色','包装','交付'];
      const itemKeys=this.gameKey==='moonlight-tea-shop'?['tea','coffee','flower','cup']:['plush','ruby','parcel','treasure'];
      panel(context,{x:32,y:110,w:296,h:28,r:13},this.uiTheme.paper,this.uiTheme.rim,2);
      panel(context,{x:116,y:276,w:128,h:28,r:13},this.uiTheme.paper,this.uiTheme.rim,2);
      label(context, '当前订单', 42, 126, {size: 12, weight: 850, color: '#46392C'});
      panel(context, {x: 40, y: 146, w: 280, h: 96, r: 18}, '#FFFFFF', '#D7C6AA');
      world.order.forEach((step, index) => {
        const x = 72 + index * (210 / Math.max(1, world.order.length - 1));
        circle(context, x, 188, 17, index < world.step ? this.config.accent : '#E5DDD0', index === world.step ? this.config.accent : '#C7B8A2', 2);
        if(!this.drawSprite(itemKeys[step],{x:x-20,y:166,w:40,h:44}))label(context,labels[step].slice(0,1),x,188,{size:10,align:'center',color:'#594B3E'});
        if(index<world.step)label(context,'✓',x+19,215,{size:13,color:'#24845C',align:'center'});
      });
      this.drawMeter({x: 42, y: 264, w: 276, h: 9}, world.patience / 100, this.config.accent);
      label(context, `交付 ${world.orders}/${world.goal}`, 180, 290, {size: 12, weight: 850, align: 'center', color: '#46392C'});
      if (this.gameKey === 'moonlight-tea-shop') this.drawCanonicalCharacter({x: 244, y: 278, w: 76, h: 105}, {shadowColor: '#232529', shadowBlur: 5, shadowOffsetY: 2});
      labels.forEach((value, index) => {
        const x = 8 + index * 88;
        panel(context, {x, y: 394, w: 80, h: 76, r: 18}, index === world.order[world.step] ? this.config.accent : '#FFFFFF', '#D7C6AA', 4);
        this.drawSprite(itemKeys[index],{x:x+21,y:399,w:38,h:40});
        label(context,value,x+40,456,{size:10,align:'center',color:index===world.order[world.step]?'#FFFFFF':'#46392C'});
      });
    }

    drawIo() {
      const context = this.context; const world = this.world;
      fieldBoundary(context,{x:20,y:98,w:320,h:420},'rgba(193,238,225,.64)');
      panel(context,{x:24,y:78,w:312,h:25,r:12},this.uiTheme.hud,this.uiTheme.rim,2);
      world.food.forEach(food=>{if(!this.drawSprite('energy',{x:food.x-food.r,y:food.y-food.r,w:food.r*2,h:food.r*2}))circle(context,food.x,food.y,food.r,'#E2C56E');});
      world.bots.forEach(bot=>{if(!this.drawSprite('microbe_enemy',{x:bot.x-bot.r,y:bot.y-bot.r,w:bot.r*2,h:bot.r*2}))circle(context,bot.x,bot.y,bot.r,'#C9665F','#FFFFFF',2);});
      if(!this.drawSprite('microbe',{x:world.player.x-world.player.r,y:world.player.y-world.player.r,w:world.player.r*2,h:world.player.r*2}))circle(context,world.player.x,world.player.y,world.player.r,this.config.accent,'#D8FFF3',2);
      label(context, `成长 ${world.eaten}/${world.goal}`, 34, 91, {size: 10, weight: 850});
      label(context, '本地机器人·非实时联网', 326, 91, {size: 9, weight: 750, align: 'right', color: '#FFFFFF', shadow: true});
    }

    drawWardrobe() {
      const context = this.context; const world = this.world; const tabs = ['衣装','鞋履','配饰']; const palettes = [['#6E7D55','#874E58','#3F5A76'],['#A08162','#625C78','#456C68'],['#C7A56D','#A66A72','#62849A']];
      panel(context,{x:24,y:150,w:312,h:22,r:10},this.uiTheme.paper,this.uiTheme.rim,2);
      tabs.forEach((value,index)=>{ panel(context,{x:22+index*106,y:104,w:102,h:42,r:14},world.category===index?this.config.accent:'#F9F5EF','#D5C7B6'); label(context,value,73+index*106,125,{size:11,weight:850,align:'center',color:world.category===index?'#FFFFFF':'#4B4037'}); });
      contactShadow(context,180,319,60,14);
      label(context,`搭配要求 ${world.target.map((n,i)=>tabs[i]+(n+1)).join(' · ')}  ·  ${world.attempts} 次`,180,160,{size:9,align:'center',color:'#4B4037'});
      if (!this.drawSprite(this.gameKey==='puppet-studio'?'plush':'model',{x:126,y:161,w:108,h:173}) && !this.drawCanonicalCharacter({x: 126, y: 161, w: 108, h: 173}, {shadowColor: '#21242B', shadowBlur: 4, shadowOffsetY: 2})) {
        circle(context,180,194,24,'#CDAF97'); context.fillStyle = palettes[0][world.choices[0] < 0 ? 0 : world.choices[0]]; context.fillRect(145,220,70,54); context.fillStyle = palettes[1][world.choices[1] < 0 ? 1 : world.choices[1]]; context.fillRect(151,274,58,56); circle(context,180,236,8,palettes[2][world.choices[2] < 0 ? 2 : world.choices[2]]);
      }
      const outfitKeys=[['dress','dress','dress'],['shoes','shoes','shoes'],['hat','glasses','flower']];
      const wornRects=[{x:149,y:217,w:62,h:73},{x:155,y:295,w:50,h:31},world.choices[2]===1?{x:158,y:188,w:44,h:24}:{x:149,y:161,w:62,h:44}];
      world.choices.forEach((choice,index)=>{if(choice>=0)this.drawSprite(outfitKeys[index][choice],wornRects[index],{flipX:choice===1});});
      const selectedColors=world.choices.map((choice,index)=>palettes[index][choice < 0 ? index : choice]);
      selectedColors.forEach((color,index)=>circle(context,128+index*52,326,7,color,'#FFFFFF',1));
      for (let option=0;option<3;option+=1){const x=28+option*104;panel(context,{x,y:354,w:96,h:82,r:16},palettes[world.category][option],world.choices[world.category]===option?'#FFFFFF':'#747A81',5);this.drawSprite(outfitKeys[world.category][option],{x:x+24,y:358,w:48,h:48});label(context,`${tabs[world.category]} ${option+1}`,x+48,421,{size:10,weight:850,align:'center'});}
      panel(context,{x:76,y:462,w:208,h:42,r:21},this.config.accent,'#8C9196',6);label(context,'提交造型',180,483,{size:12,weight:900,align:'center'});
    }

    drawQuiz() {
      const context=this.context;const world=this.world;const question=world.questions[Math.min(world.index,world.questions.length-1)];
      panel(context,{x:20,y:98,w:320,h:405,r:24},'#F4F1EA','#FFFFFF',9);label(context,`安全情境 ${world.index+1}/3`,42,127,{size:11,weight:850,color:'#4A4239'});panel(context,{x:38,y:150,w:284,h:72,r:18},'#448093');this.drawSprite('scroll',{x:46,y:168,w:36,h:36});label(context,question.prompt,194,186,{size:13,weight:850,align:'center',maxWidth:221});
      question.answers.forEach((answer,index)=>{const y=250+index*66;panel(context,{x:38,y,w:284,h:52,r:16},'#FFFFFF','#D9D1C5',4);if(!this.drawSprite(['shield','key','fire'][index],{x:45,y:y+11,w:30,h:30}))label(context,String.fromCharCode(65+index),60,y+26,{size:11,align:'center',color:this.config.accent});label(context,answer,84,y+26,{size:12,weight:800,color:'#332F2A'});});
      if(world.feedback)label(context,world.feedback,180,468,{size:11,weight:850,align:'center',color:world.feedback.includes('正确')?'#2D8A62':'#B54852'});
    }

    drawSequencer() {
      const context=this.context;const world=this.world;panel(context,{x:22,y:101,w:316,h:356,r:24},'#447994','#C6AD82',8);
      if (this.gameKey === 'magic-choir') label(context,'吹气逐个点亮目标声部 · 也可点按',180,119,{size:9,weight:750,align:'center',color:'#BABDC0'});
      const cell=71;for(let index=0;index<16;index+=1){const col=index%4,row=Math.floor(index/4),x=38+col*cell,y=140+row*cell;panel(context,{x,y,w:58,h:58,r:15},world.grid[index]?this.config.accent:'#6297AD',world.target[index]?'#797F85':'#A7C6CF',world.grid[index]?5:0);this.drawSprite(['emerald','ruby','sapphire','amethyst'][row],{x:x+12,y:y+12,w:34,h:34},{alpha:world.grid[index]?1:.42});if(world.target[index])label(context,'•',x+48,y+9,{size:17,align:'center'});}
      label(context,`尝试机会 ${world.attempts}`,180,472,{size:10,weight:800,align:'center'});panel(context,{x:78,y:490,w:204,h:42,r:21},this.config.accent);label(context,'校验四轨节奏',180,511,{size:11,weight:900,align:'center'});
    }

    drawSequence() {
      const context=this.context;const world=this.world;panel(context,{x:89,y:126,w:182,h:32,r:15},this.uiTheme.hud,this.uiTheme.rim,2);contactShadow(context,180,281,48,11);label(context,world.ready?'请复现灯序':'记住舞台灯序',180,142,{size:14,weight:850,align:'center'});
      if(!this.drawSprite('kitten',{x:133,y:153,w:94,h:132}))this.drawCanonicalCharacter({x: 133, y: 153, w: 94, h: 132}, {shadowBlur: 6, shadowOffsetY: 3});
      const previewTime=world.previewDuration-world.preview-.8;const previewIndex=Math.floor(previewTime/.6);for(let pad=0;pad<4;pad+=1){const x=34+pad*82;const active=!world.ready&&previewIndex>=0&&previewIndex<world.sequence.length&&previewTime%.6<.42&&world.sequence[previewIndex]===pad;panel(context,{x,y:306,w:72,h:126,r:28},active?this.config.secondary:(pad%2?this.config.accent:'#72556A'),'#797F85',active?12:3);if(!this.drawSprite('kitten',{x:x+12,y:325-(active?5:0),w:48,h:54},{alpha:active?1:.74,flipX:pad%2===1}))circle(context,x+36,350,15,'#BEC1C4');label(context,['低音','节拍','和声','高音'][pad],x+36,397,{size:10,weight:850,align:'center'});}
      label(context,`进度 ${world.input.length}/${world.sequence.length}`,180,458,{size:10,weight:800,align:'center'});
    }

    drawSort(){
      const context=this.context,world=this.world,colors=['#E1C35B','#57A795','#739EB9'],gems=['star','emerald','sapphire'];
      fieldBoundary(context,{x:20,y:97,w:320,h:421},'rgba(239,245,185,.42)');
      panel(context,{x:24,y:104,w:312,h:26,r:13},this.uiTheme.hud,this.uiTheme.rim,2);
      for(const item of world.items.filter(item=>!item.sorted)){
        circle(context,item.x,item.y,20,colors[item.type],'#BABDC0',item.dragging?3:1);
        if(!this.drawSprite('letter',{x:item.x-18,y:item.y-18,w:36,h:36}))label(context,['A','B','C'][item.type],item.x,item.y,{size:10,align:'center',color:'#20302F'});
        this.drawSprite(gems[item.type],{x:item.x+7,y:item.y+7,w:16,h:16});
      }
      for(let bin=0;bin<3;bin++){
        const x=10+bin*118;panel(context,{x,y:430,w:104,h:72,r:18},colors[bin],'#979CA1',5);
        this.drawSprite('mailbox',{x:x+27,y:432,w:50,h:43});
        this.drawSprite(gems[bin],{x:x+65,y:445,w:17,h:17});
        label(context,`${['金光','绿光','蓝光'][bin]}信箱`,x+52,486,{size:10,align:'center'});
      }
      label(context,`已投递 ${world.sorted}/${world.goal} · 可错投 ${world.maxMistakes-world.mistakes} 次`,180,117,{size:10,align:'center'});
    }

    drawMaze(){
      const context=this.context,world=this.world,cell=298/7;
      panel(context,{x:22,y:100,w:316,h:342,r:24},'#8B784E','#B9A278',8);
      for(let index=0;index<49;index++){
        const x=31+index%7*cell,y=113+Math.floor(index/7)*cell;
        panel(context,{x,y,w:38,h:38,r:9},world.walls.has(index)?'#648354':'#D5BD91','#B89C6F');
        if(world.walls.has(index))this.drawSprite('tree',{x:x+2,y:y-2,w:34,h:40});
        if(index===world.exit)this.drawSprite('key',{x:x+4,y:y+4,w:30,h:30});
      }
      world.guards.forEach(guard=>{const x=50+guard.index%7*cell,y=132+Math.floor(guard.index/7)*cell;if(!this.drawSprite('drone',{x:x-17,y:y-17,w:34,h:34},{flipX:guard.dir<0}))circle(context,x,y,11,'#C95A58');});
      const x=50+world.player%7*cell,y=132+Math.floor(world.player/7)*cell;
      if(!this.drawSprite('cat',{x:x-17,y:y-20,w:34,h:40}))circle(context,x,y,12,this.config.accent,'#FFFFFF',2);
      label(context,`剩余 ${world.steps} 步 · 到达钥匙格`,180,470,{size:10,align:'center'});
    }

    drawCoin() {
      const context=this.context;const world=this.world;fieldBoundary(context,{x:20,y:98,w:320,h:419},'rgba(249,237,188,.48)');panel(context,{x:24,y:78,w:312,h:25,r:12},this.uiTheme.hud,this.uiTheme.rim,2);world.rings.forEach((ring,index)=>{context.beginPath();context.arc(ring.x,ring.y,ring.r,0,TAU);context.strokeStyle=ring.hit?'rgba(171,186,169,.6)':this.config.secondary;context.lineWidth=7;context.shadowColor='rgba(71,52,28,.44)';context.shadowBlur=2;context.shadowOffsetY=2;context.stroke();context.shadowColor='transparent';context.shadowBlur=0;context.shadowOffsetY=0;label(context,index+1,ring.x,ring.y,{size:9,weight:900,align:'center',color:ring.hit?'#525962':'#FFFFFF'});});if(!this.drawSprite('star',{x:world.coin.x-17,y:world.coin.y-17,w:34,h:34},{rotation:world.coin.moving?this.elapsed*3:0}))circle(context,world.coin.x,world.coin.y,13,this.config.accent,'#FFF0B7',3);label(context,`门环 ${world.hits}/${world.goal}`,32,91,{size:10,weight:850});label(context,`发射 ${world.launches}`,328,91,{size:10,weight:850,align:'right'});label(context,'点按门环瞄准发射',180,536,{size:9,weight:700,align:'center',color:'#AEB2B6'});
    }

    drawBuilder() {
      const context=this.context;const world=this.world;panel(context,{x:22,y:98,w:316,h:344,r:24},'#729E4D','#B9A278',8);const cell=85.3;for(let index=0;index<9;index+=1){const col=index%3,row=Math.floor(index/3),x=52+col*cell,y=145+row*cell;panel(context,{x,y,w:77,h:77,r:17},world.plots[index]?'#C9B987':'#8F7552','#B9A278');if(world.plots[index]){const colors=['','#6F9D54','#55A8B0','#D58D62'];if(!this.drawSprite(['','seedling','watering_can','house'][world.plots[index]],{x:x+9,y:y+8,w:60,h:61})){circle(context,x+38,y+38,20,colors[world.plots[index]],'#FFFFFF',2);label(context,['','田','水','屋'][world.plots[index]],x+38,y+38,{size:12,align:'center'});}}}
      label(context,`水 ${world.water}  粮 ${world.food}  居所 ${world.homes}`,180,120,{size:10,weight:850,align:'center'});label(context,`目标产出 ${world.goal} · 至少 ${this.stage} 间居所`,180,432,{size:9,align:'center'});['农田','水井','居所'].forEach((value,index)=>{const x=8+index*118;panel(context,{x,y:464,w:108,h:48,r:16},world.selectedType===index+1?this.config.accent:'#708B4F','#4B535B');this.drawSprite(['seeds','watering_can','house'][index],{x:x+10,y:471,w:31,h:33});label(context,value,x+68,488,{size:11,weight:850,align:'center'});});
    }

    drawBattle() {
      const context=this.context;const world=this.world;contactShadow(context,91,309,48,11);contactShadow(context,269,309,47,11);panel(context,{x:32,y:333,w:119,h:24,r:12},this.uiTheme.hud,this.uiTheme.rim,2);panel(context,{x:208,y:333,w:119,h:24,r:12},this.uiTheme.hud,this.uiTheme.rim,2);panel(context,{x:34,y:386,w:292,h:34,r:15},this.uiTheme.hud,this.uiTheme.rim,2);if(!this.drawCanonicalCharacter({x:42,y:157,w:98,h:151},{mirror:false,shadowBlur:6,shadowOffsetY:3})&&!this.drawSprite('hero',{x:42,y:157,w:98,h:151})){circle(context,91,257,42,this.config.accent,'#F5D5C5',3);label(context,'骑',91,257,{size:23,weight:900,align:'center'});}if(!this.drawSprite('raider',{x:224,y:190,w:90,h:120}))hexagon(context,269,257,44,'#9F4548','#E3A3A4');this.drawMeter({x:43,y:318,w:96,h:9},world.hero/world.heroMax,'#5CB783');this.drawMeter({x:221,y:318,w:96,h:9},world.enemy/world.enemyMax,'#D75C65');label(context,`护盾 ${world.guard} · 蓄力 ${world.charge}`,91,345,{size:10,weight:800,align:'center'});label(context,`意图 ${['重击','连击','破防'][world.intent]}`,269,345,{size:10,weight:800,align:'center'});label(context,world.message,180,403,{size:11,weight:800,align:'center'});['攻击','防御','蓄力'].forEach((value,index)=>{const x=8+index*118;panel(context,{x,y:472,w:108,h:48,r:16},index===0?this.config.accent:index===1?'#4E7E74':'#8A704A','#5D646C',4);this.drawSprite(['sword','shield','fire'][index],{x:x+9,y:479,w:32,h:33});label(context,value,x+68,496,{size:11,weight:900,align:'center'});});
    }

    drawMeter(rect, ratio, color) {
      panel(this.context, {...rect, r: rect.h / 2}, '#363F48');
      const width = clamp(rect.w * clamp(ratio, 0, 1), 0, rect.w);
      if (width > 0) panel(this.context, {x: rect.x, y: rect.y, w: width, h: rect.h, r: rect.h / 2}, color);
    }

    drawPause() {
      this.context.fillStyle = 'rgba(30,39,50,.45)'; this.context.fillRect(0,0,WIDTH,HEIGHT);
      panel(this.context,{x:55,y:210,w:250,h:138,r:24},this.uiTheme.hud,this.uiTheme.rim,4);
      label(this.context,'已暂停',180,250,{size:24,weight:900,align:'center'});
      label(this.context,'点按画面或下方按钮继续',180,286,{size:11,weight:700,align:'center',color:'#BABDC0'});
      panel(this.context,{x:103,y:308,w:154,h:34,r:17},this.config.accent);label(this.context,'继续游戏',180,325,{size:11,weight:900,align:'center'});
    }

    completeStage(summary) {
      if (this.finished) return;
      this.emit('level_complete', {stage: this.stage, score: Math.round(this.score), summary});
      this.tone('success');
      if (this.stage >= 3) { this.finish(true, `${this.config.title}三阶段完成·${summary}`); return; }
      this.stage += 1;
      this.score += 150 * this.stage;
      this.initStage();
      this.emit('level_start', {stage: this.stage, mechanic: this.config.mechanic});
      this.status(`第 ${this.stage} / 3 阶段·${summary}`);
    }

    fail(summary) {
      if (this.finished) return;
      this.finish(false, summary);
    }

    finish(success, summary) {
      this.finished = true;
      if (this.raf) root.cancelAnimationFrame(this.raf);
      this.emit(success ? 'play_complete' : 'play_fail', {stage: this.stage, score: Math.round(this.score), summary});
      if (typeof this.options.onComplete === 'function') this.options.onComplete({success, stage: this.stage, score: Math.round(this.score), summary});
    }

    emitInteraction(interactionType, properties) {
      this.emit('valid_interaction', {stage: this.stage, score: Math.round(this.score), interaction_type: interactionType, ...(properties || {})});
    }

    emit(name, properties) {
      if (typeof this.options.onEvent === 'function') this.options.onEvent(name, properties || {});
    }

    status(textValue) {
      if (typeof this.options.onStatus === 'function') this.options.onStatus({paused: this.paused, stage: this.stage, score: Math.round(this.score), text: textValue});
    }

    togglePause() {
      if (this.finished) return this.paused;
      this.paused = !this.paused;
      this.lastTime = 0;
      this.status(this.paused ? '游戏已暂停' : `第 ${this.stage} / 3 阶段进行中`);
      this.emit(this.paused ? 'pause' : 'resume', {stage: this.stage, score: Math.round(this.score)});
      return this.paused;
    }

    setMuted(value) { this.muted = !!value; }

    inspect() {
      return {
        gameKey: this.gameKey,
        mechanic: this.config.mechanic,
        stage: this.stage,
        stages: 3,
        score: Math.round(this.score),
        paused: this.paused,
        finished: this.finished,
        artPack: 'classic-v1',
        assetErrors: this.assetErrors.slice(),
        artReady: this.imageReady(this.art.background) && !!(root.AirvanaPlayableAssetsV3 && root.AirvanaPlayableAssetsV3.ready()),
        gameplayAssetPack: 'classic-v1',
        gameplayAssetsReady: !!(root.AirvanaPlayableAssetsV3 && root.AirvanaPlayableAssetsV3.ready()),
        gameplayStates: ['intro', 'playing', 'paused', 'success', 'failure', 'retry']
      };
    }

    later(callback, delay) {
      const timer = setTimeout(() => {
        this.timers.delete(timer);
        if (this.paused) this.later(callback, 80); else if (!this.finished) callback();
      }, delay);
      this.timers.add(timer);
      return timer;
    }

    ensureAudio() {
      if (this.muted) return null;
      const AudioContextClass = root.AudioContext || root.webkitAudioContext;
      if (!AudioContextClass) return null;
      try {
        if (!this.audioContext) this.audioContext = new AudioContextClass();
        if (this.audioContext.state === 'suspended') this.audioContext.resume();
        return this.audioContext;
      } catch (error) { return null; }
    }

    tone(kind) {
      const audio = this.ensureAudio();
      if (!audio || this.muted) return;
      const oscillator = audio.createOscillator(); const gain = audio.createGain(); const now = audio.currentTime;
      oscillator.type = kind === 'hit' ? 'square' : 'sine'; oscillator.frequency.setValueAtTime(kind === 'success' ? 620 : kind === 'score' ? 480 : kind === 'hit' ? 150 : 280, now);
      if (kind === 'success') oscillator.frequency.exponentialRampToValueAtTime(880, now + .12);
      gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(.05, now + .008); gain.gain.exponentialRampToValueAtTime(.0001, now + .12);
      oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(now); oscillator.stop(now + .13);
    }

    destroy() {
      if (this.raf) root.cancelAnimationFrame(this.raf);
      this.timers.forEach(timer => clearTimeout(timer));
      this.timers.clear();
      this.canvas.removeEventListener('pointerdown', this.onPointerDown);
      this.canvas.removeEventListener('pointermove', this.onPointerMove);
      this.canvas.removeEventListener('pointerup', this.onPointerUp);
      this.canvas.removeEventListener('pointercancel', this.onPointerUp);
      this.canvas.removeEventListener('keydown', this.onKeyDown);
      if (root.removeEventListener) root.removeEventListener('resize', this.resize);
      if (this.sensorSession && this.sensorSession.destroy) this.sensorSession.destroy();
      this.sensorSession = null;
      if (this.audioContext && this.audioContext.close) { try { this.audioContext.close(); } catch (error) {} }
    }
  }

  root.AirvanaCompleteGames = Object.freeze({
    version: '4.2.0',
    width: WIDTH,
    height: HEIGHT,
    uiTheme,
    has: key => !!GAME_CATALOG[key],
    list: () => Object.entries(GAME_CATALOG).map(([key, value]) => ({
      key,
      id: value.id,
      title: value.title,
      mechanic: value.mechanic,
      instruction: value.instruction,
      characterId: value.heroCharacterId || null,
      sensor: root.AirvanaSensorInteractions && root.AirvanaSensorInteractions.profile ? root.AirvanaSensorInteractions.profile(key) : null,
      playableId: `plb_${key.replace(/-/g, '_')}`,
      palette: {accent: value.accent, secondary: value.secondary, surface: value.surface, background: value.background},
      art: 'classic-v1',
      artSystem: 'classic-v1',
      assetPack: 'classic-v1',
      gameplayAssetPack: 'classic-v1',
      stages: 3,
      gameplayStates: ['intro', 'playing', 'paused', 'success', 'failure', 'retry']
    })),
    mount(canvas, key, options) { return new CompleteGame(canvas, key, options || {}); }
  });
})(typeof window !== 'undefined' ? window : globalThis);
