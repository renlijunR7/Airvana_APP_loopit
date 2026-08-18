(function (root) {
  'use strict';

  const WIDTH = 360;
  const HEIGHT = 560;
  const TAU = Math.PI * 2;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const pointIn = (point, rect) => point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

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
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function panel(context, rect, fill, stroke, shadow) {
    context.save();
    if (shadow) {
      context.shadowColor = 'rgba(7, 12, 20, .24)';
      context.shadowBlur = shadow;
      context.shadowOffsetY = Math.max(2, shadow / 4);
    }
    roundedRect(context, rect.x, rect.y, rect.w, rect.h, rect.r || 16);
    context.fillStyle = fill;
    context.fill();
    context.shadowColor = 'transparent';
    if (stroke) {
      context.strokeStyle = stroke;
      context.lineWidth = rect.lineWidth || 1;
      context.stroke();
    }
    context.restore();
  }

  function label(context, value, x, y, options) {
    const settings = options || {};
    context.save();
    context.fillStyle = settings.color || '#F7F8FA';
    context.font = `${settings.weight || 700} ${settings.size || 13}px ${settings.family || 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif'}`;
    context.textAlign = settings.align || 'left';
    context.textBaseline = settings.baseline || 'middle';
    if (settings.shadow) {
      context.shadowColor = 'rgba(5, 9, 14, .45)';
      context.shadowBlur = 5;
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
    'puppet-studio': {id: 12, title: '玩偶造型工坊', mechanic: 'wardrobe', heroCharacterId: 'chr_lumi_doll', accent: '#4C94E8', secondary: '#F0A36B', surface: '#24364B', background: '#101927', instruction: '组合头饰、服装与动作，完成三张玩偶设定'},
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
    'orchard-merge': {id: 34, title: '果园合合塔', mechanic: 'merge', accent: '#7EA84E', secondary: '#D99A4D', surface: '#34402A', background: '#161E10', instruction: '移动相邻同级水果进行合成，培育最高级果实'},
    'moonlight-tea-shop': {id: 36, title: '月光奶茶铺', mechanic: 'shop', heroCharacterId: 'chr_mina_vale', accent: '#4C9389', secondary: '#D9A46A', surface: '#2C403D', background: '#111E1C', instruction: '读取订单并依次完成茶底、奶量、配料和封杯'},
    'microbe-arena': {id: 37, title: '微粒竞技场', mechanic: 'io', accent: '#4CA29C', secondary: '#D97962', surface: '#25413F', background: '#0F2322', instruction: '拖动微粒吞噬更小目标，避开体型更大的本地机器人'},
    'crystal-bastion': {id: 39, title: '晶核防线', mechanic: 'defense', accent: '#4C9EA1', secondary: '#D2A754', surface: '#2B3E40', background: '#111E20', instruction: '在路径节点部署晶塔，管理能量守住三阶段石门'},
    'studio-wardrobe': {id: 43, title: '今日造型师', mechanic: 'wardrobe', accent: '#9A665C', secondary: '#C39B68', surface: '#3C3230', background: '#191313', instruction: '按照场合要求组合上装、下装和配饰后提交造型'}
  };

  class CompleteGame {
    constructor(canvas, gameKey, options) {
      if (!canvas || typeof canvas.getContext !== 'function') throw new Error('A canvas element is required.');
      this.canvas = canvas;
      this.context = canvas.getContext('2d');
      this.gameKey = gameKey;
      this.config = GAME_CATALOG[gameKey];
      if (!this.config) throw new Error(`Unknown complete game: ${gameKey}`);
      this.options = options || {};
      this.characterRuntime = root.AirvanaCharacterRuntime || null;
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
      if (this.finished) return;
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
        case 'runner': this.world = {lane: 1, targetLane: 1, distance: 0, goal: 75 + difficulty * 25, speed: 112 + difficulty * 16, obstacles: [], spawn: .8, shield: 3}; break;
        case 'rhythm': this.world = {notes: [], spawn: .35, beat: 0, hits: 0, misses: 0, goal: 7 + difficulty * 2, combo: 0, bestCombo: 0}; break;
        case 'stack': this.world = {blocks: [{x: 95, y: 492, w: 170}], moving: {x: 35, y: 456, w: 170, dir: 1}, count: 0, goal: 6 + difficulty}; break;
        case 'circuit': this.initCircuit(); break;
        case 'match': this.initMatch(); break;
        case 'cups': this.initCups(); break;
        case 'fishing': this.world = {hook: 0, fish: this.makeFish(), caught: 0, goal: 2 + difficulty, oxygen: 100, holding: false}; break;
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
      const size = 4;
      const target = Array.from({length: size * size}, (_, index) => (index + this.stage + Math.floor(index / size)) % 4);
      const rotations = target.map((value, index) => (value + 1 + (index % 3)) % 4);
      this.world = {size, target, rotations, turns: 36 + this.stage * 4};
    }

    initMatch() {
      const size = 6;
      const colors = 5;
      const grid = Array.from({length: size * size}, (_, index) => (index * 3 + Math.floor(index / size) + Math.floor(this.random() * colors)) % colors);
      this.world = {size, colors, grid, selected: -1, moves: 18 - this.stage, collected: 0, goal: 8 + this.stage * 3, targetColor: this.stage % colors, resolving: 0};
    }

    initCups() {
      const swaps = [];
      for (let index = 0; index < 4 + this.stage * 2; index += 1) swaps.push([index % 2, index % 2 + 1]);
      this.world = {order: [0,1,2], ball: this.stage % 3, swaps, swapIndex: 0, swapTimer: 0, reveal: 1.1, ready: false, picked: -1, wins: 0, goal: 1, waitingForShuffle: !!(this.sensorProfile && this.sensorProfile.control === 'shuffle')};
    }

    initMerge() {
      const size = 5;
      const grid = Array.from({length: size * size}, (_, index) => (index + Math.floor(index / size)) % 3 + 1);
      this.world = {size, grid, selected: -1, moves: 18, bestLevel: 3, goal: 4 + Math.min(this.stage, 2)};
    }

    initShop() {
      const recipes = this.gameKey === 'moonlight-tea-shop'
        ? [[0,1,2,3],[0,2,1,3],[1,0,2,3]]
        : [[0,2,3],[1,2,3],[0,1,3]];
      this.world = {recipes, order: recipes[(this.stage - 1) % recipes.length], step: 0, orders: 0, goal: 2 + this.stage, patience: 100};
    }

    initIo() {
      const food = Array.from({length: 14}, () => ({x: 35 + this.random() * 290, y: 100 + this.random() * 410, r: 4 + this.random() * 4}));
      const bots = Array.from({length: 3 + this.stage}, (_, index) => ({x: 50 + this.random() * 260, y: 120 + this.random() * 350, r: 13 + index * 2, vx: (this.random() - .5) * 44, vy: (this.random() - .5) * 44}));
      this.world = {player: {x: 180, y: 360, r: 10}, food, bots, eaten: 0, goal: 5 + this.stage * 2};
    }

    initWardrobe() {
      const target = [(this.stage + 1) % 3, this.stage % 3, (this.stage + 2) % 3];
      this.world = {category: 0, choices: [-1,-1,-1], target, submitted: false};
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
      const sequence = Array.from({length: 4 + this.stage}, (_, index) => (index * 2 + this.stage) % 4);
      this.world = {sequence, input: [], preview: 1.4 + sequence.length * .25, cursor: 0, ready: false};
    }

    initSort() {
      const items = Array.from({length: 6 + this.stage * 2}, (_, index) => ({id: index, type: index % 3, x: 55 + this.random() * 250, y: 105 + this.random() * 270, r: 13, dragging: false}));
      this.world = {items, selected: null, sorted: 0, goal: items.length};
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
      const world = this.world;
      switch (this.config.mechanic) {
        case 'runner': {
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
          world.swapTimer -= delta;
          if (world.swapTimer <= 0) {
            const swap = world.swaps[world.swapIndex];
            if (swap) {
              [world.order[swap[0]], world.order[swap[1]]] = [world.order[swap[1]], world.order[swap[0]]];
              world.swapIndex += 1;
              world.swapTimer = this.reducedMotion ? .12 : .38;
              this.tone('tap');
            } else world.ready = true;
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
            else if (!enemy.dead && enemy.y > 525) enemy.dead = true;
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
      const world = this.world;
      switch (this.config.mechanic) {
        case 'runner': world.targetLane = clamp(Math.floor(point.x / 120), 0, 2); this.emitInteraction('lane_change', {lane: world.targetLane}); break;
        case 'rhythm': this.hitRhythmPad(clamp(Math.floor(point.x / 90), 0, 3)); break;
        case 'stack': this.dropStackBlock(); break;
        case 'circuit': this.rotateCircuit(point); break;
        case 'match': this.selectMatch(point); break;
        case 'cups': world.waitingForShuffle ? this.beginCupShuffle('touch') : this.pickCup(point); break;
        case 'fishing': world.holding = true; break;
        case 'defense': this.placeTower(point); break;
        case 'drift': world.steer = point.x < 180 ? -1 : 1; break;
        case 'shooter': world.ship.x = point.x; world.ship.y = clamp(point.y, 300, 505); break;
        case 'merge': this.selectMerge(point); break;
        case 'shop': this.selectShopStep(point); break;
        case 'io': world.player.x = point.x; world.player.y = clamp(point.y, 90, 520); break;
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
      if (this.config.mechanic === 'sort' && this.world.selected) {
        this.world.selected.x = point.x; this.world.selected.y = point.y;
      }
      if (this.config.mechanic === 'shooter') {
        this.world.ship.x = point.x; this.world.ship.y = clamp(point.y, 300, 505);
      }
      if (this.config.mechanic === 'io') {
        this.world.player.x = point.x; this.world.player.y = clamp(point.y, 90, 520);
      }
    }

    release(point) {
      if (this.config.mechanic === 'fishing') this.releaseHook();
      if (this.config.mechanic === 'drift') this.world.steer = 0;
      if (this.config.mechanic === 'sort') this.endSort(point);
    }

    key(action) {
      if (this.config.mechanic === 'runner') {
        if (action === 'left') this.world.targetLane = clamp(this.world.targetLane - 1, 0, 2);
        if (action === 'right') this.world.targetLane = clamp(this.world.targetLane + 1, 0, 2);
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
      if (world.rotations.every((value, index) => value === world.target[index])) this.completeStage('回路连续接通');
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
      for (const index of marks) {
        if (world.grid[index] === world.targetColor) world.collected += 1;
        world.grid[index] = Math.floor(this.random() * world.colors);
      }
      this.score += marks.size * 35; this.tone('score'); return true;
    }

    pickCup(point) {
      const world = this.world;
      if (!world.ready || world.picked >= 0) return;
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
      const hookPoint = {x: 180, y: 112 + world.hook};
      const correct = distance(hookPoint, world.fish) < world.fish.radius + 22;
      this.emitInteraction('hook_release', {depth: Math.round(world.hook), correct});
      if (correct) {
        world.caught += 1; this.score += 95; world.oxygen = Math.min(100, world.oxygen + 14); world.fish = this.makeFish(); this.tone('score');
        if (world.caught >= world.goal) this.completeStage('目标光鱼已捕获');
      } else { world.oxygen -= 12; this.tone('hit'); }
    }

    placeTower(point) {
      const world = this.world;
      const col = clamp(Math.floor(point.x / 120), 0, 2);
      const row = point.y < 315 ? 0 : 1;
      const index = row * 3 + col;
      const cost = 2 + world.towers[index];
      if (world.energy < cost || world.towers[index] >= 3) { this.tone('hit'); return; }
      world.energy -= cost; world.towers[index] += 1; this.score += 20; this.tone('tap');
      this.emitInteraction('tower_place', {index, level: world.towers[index], energy: Number(world.energy.toFixed(1))});
    }

    selectMerge(point) {
      const world = this.world;
      const cell = this.boardCell(point, world.size, {x: 35, y: 126, w: 290, h: 290});
      if (cell < 0 || world.moves <= 0) return;
      if (world.selected < 0) { world.selected = cell; this.tone('tap'); return; }
      const first = world.selected;
      world.selected = -1;
      const adjacent = Math.abs(first - cell) === 1 && Math.floor(first / world.size) === Math.floor(cell / world.size) || Math.abs(first - cell) === world.size;
      if (!adjacent || world.grid[first] !== world.grid[cell]) { this.tone('hit'); return; }
      const next = Math.min(6, world.grid[first] + 1);
      world.grid[cell] = next; world.grid[first] = 1 + Math.floor(this.random() * 2); world.moves -= 1; world.bestLevel = Math.max(world.bestLevel, next); this.score += next * 55; this.tone('score');
      this.emitInteraction('fruit_merge', {level: next, moves: world.moves});
      if (world.bestLevel >= world.goal) this.completeStage(`培育出 ${world.goal} 级果实`);
      else if (world.moves <= 0) this.fail('移动次数耗尽');
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
      if (point.y > 464) {
        const correct = world.choices.every((value, index) => value === world.target[index]);
        this.emitInteraction('look_submit', {choices: world.choices.slice(), correct});
        if (correct) { this.score += 180; this.tone('success'); this.completeStage('造型符合场合要求'); }
        else { this.tone('hit'); this.status('场合匹配度不足，请检查三个类别'); }
        return;
      }
      if (point.y < 123) { world.category = clamp(Math.floor(point.x / 120), 0, 2); return; }
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
      else { item.x = 55 + this.random() * 250; item.y = 115 + this.random() * 260; this.tone('hit'); }
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
      const power = clamp(length * 1.25, 150, 330);
      world.coin.vx = dx / length * power;
      world.coin.vy = dy / length * power;
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
      else if (world.turns <= 0) this.fail('建造回合耗尽');
    }

    battleAction(point) {
      const world = this.world;
      if (point.y < 430) return;
      const action = clamp(Math.floor(point.x / 120), 0, 2);
      if (action === 0) { const damage = 7 + this.stage * 2 + world.charge; world.enemy -= damage; world.charge = 0; world.message = `造成 ${damage} 点伤害`; this.score += damage * 5; }
      if (action === 1) { world.guard += 9 + this.stage * 2; world.message = '防御姿态已展开'; }
      if (action === 2) { world.charge = Math.min(14, world.charge + 6); world.message = '力量已蓄积'; }
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
      if (this.paused) this.drawPause();
    }

    drawBackdrop() {
      const context = this.context;
      const gradient = context.createLinearGradient(0, 0, 0, HEIGHT);
      gradient.addColorStop(0, this.config.surface);
      gradient.addColorStop(.58, this.config.background);
      gradient.addColorStop(1, '#070A0E');
      context.fillStyle = gradient;
      context.fillRect(0, 0, WIDTH, HEIGHT);
      context.save();
      context.globalAlpha = .08;
      context.strokeStyle = '#FFFFFF';
      context.lineWidth = 1;
      for (let y = 82; y < HEIGHT; y += 36) {
        context.beginPath(); context.moveTo(0, y); context.lineTo(WIDTH, y); context.stroke();
      }
      context.restore();
    }

    drawHud() {
      panel(this.context, {x: 12, y: 10, w: 336, h: 58, r: 18}, 'rgba(9, 13, 19, .86)', 'rgba(255,255,255,.14)', 8);
      label(this.context, this.config.title, 27, 29, {size: 15, weight: 850});
      label(this.context, this.config.instruction, 27, 50, {size: 9, weight: 650, color: 'rgba(255,255,255,.68)', maxWidth: 235});
      panel(this.context, {x: 277, y: 21, w: 58, h: 34, r: 17}, this.config.accent);
      label(this.context, `${this.stage}/3`, 306, 38, {size: 12, weight: 900, align: 'center'});
      label(this.context, `SCORE ${Math.round(this.score)}`, 336, 82, {size: 9, weight: 800, align: 'right', color: 'rgba(255,255,255,.68)'});
      this.drawSensorControl();
    }

    drawSensorControl() {
      if (!this.sensorProfile) return;
      const state = this.sensorState || {status: 'unavailable'};
      const active = state.status === 'active';
      const requesting = state.status === 'requesting';
      const unavailable = ['denied','error','unavailable'].includes(state.status);
      const copy = active ? state.activeLabel : requesting ? '等待系统授权…' : unavailable ? '触控模式 · 可重试' : state.prompt;
      const fill = active ? 'rgba(52, 176, 114, .92)' : unavailable ? 'rgba(69, 73, 83, .9)' : 'rgba(18, 23, 32, .9)';
      panel(this.context, this.sensorControlRect(), fill, active ? 'rgba(194,255,225,.72)' : 'rgba(255,255,255,.22)', active ? 7 : 2);
      label(this.context, active ? '✓' : requesting ? '…' : '◎', 28, 85.5, {size: 10, weight: 900, align: 'center'});
      label(this.context, copy, 42, 85.5, {size: 9, weight: 850, maxWidth: 134});
    }

    drawCanonicalCharacter(rect, options) {
      return !!(this.characterRuntime && this.characterRuntime.draw(this.context, this.gameKey, rect, options || {}));
    }

    drawRunner() {
      const context = this.context;
      const world = this.world;
      context.save();
      context.beginPath(); context.moveTo(78, 90); context.lineTo(282, 90); context.lineTo(344, 528); context.lineTo(16, 528); context.closePath();
      context.fillStyle = '#1C2730'; context.fill();
      context.strokeStyle = 'rgba(255,255,255,.18)'; context.lineWidth = 2; context.stroke();
      for (let lane = 1; lane < 3; lane += 1) {
        const top = 78 + 68 * lane;
        const bottom = 16 + 109.3 * lane;
        context.setLineDash([13, 13]); context.beginPath(); context.moveTo(top, 90); context.lineTo(bottom, 528); context.strokeStyle = 'rgba(255,255,255,.25)'; context.stroke();
      }
      context.setLineDash([]);
      world.obstacles.forEach(item => {
        const x = 71 + item.lane * 109;
        if (item.kind === 'chip') diamond(context, x, item.y, 12, this.config.secondary, '#FFF2B6');
        else { panel(context, {x: x - 25, y: item.y - 11, w: 50, h: 22, r: 7}, '#B54850', '#F29DA1'); label(context, '障碍', x, item.y, {size: 8, weight: 900, align: 'center'}); }
      });
      const playerX = 71 + world.lane * 109;
      if (!this.drawCanonicalCharacter({x: playerX - 30, y: 424, w: 60, h: 88}, {shadowBlur: 5, shadowOffsetY: 2})) {
        panel(context, {x: playerX - 20, y: 451, w: 40, h: 58, r: 14}, this.config.accent, 'rgba(255,255,255,.75)', 8);
        context.fillStyle = '#EAF4F4'; context.fillRect(playerX - 9, 461, 18, 16);
      }
      label(context, `${Math.min(100, Math.round(world.distance / world.goal * 100))}%`, 180, 105, {size: 11, weight: 850, align: 'center'});
      this.drawMeter({x: 42, y: 119, w: 276, h: 8}, world.distance / world.goal, this.config.accent);
      label(context, `护盾 ${world.shield}`, 26, 536, {size: 10, weight: 800});
      label(context, this.sensorProfile && this.sensorProfile.control === 'lane' ? '倾斜手机或点按跑道' : '点按三条跑道切换位置', 334, 536, {size: 9, weight: 700, align: 'right', color: 'rgba(255,255,255,.64)'});
      context.restore();
    }

    drawRhythm() {
      const context = this.context;
      const world = this.world;
      panel(context, {x: 24, y: 97, w: 312, h: 398, r: 24}, '#171B21', 'rgba(255,255,255,.16)', 8);
      for (let pad = 0; pad < 4; pad += 1) {
        const x = 32 + pad * 76;
        context.fillStyle = pad % 2 ? 'rgba(255,255,255,.045)' : 'rgba(255,255,255,.075)'; context.fillRect(x, 110, 68, 341);
        panel(context, {x: x + 5, y: 447, w: 58, h: 38, r: 14}, pad % 2 ? this.config.secondary : this.config.accent, 'rgba(255,255,255,.45)', 5);
        label(context, ['BASS','KICK','SYN','HIGH'][pad], x + 34, 467, {size: 8, weight: 900, align: 'center'});
      }
      context.strokeStyle = '#FFFFFF'; context.globalAlpha = .45; context.lineWidth = 2; context.beginPath(); context.moveTo(30, 439); context.lineTo(330, 439); context.stroke(); context.globalAlpha = 1;
      world.notes.forEach(note => {
        const x = 66 + note.pad * 76;
        circle(context, x, note.y, 13, note.pad % 2 ? this.config.secondary : this.config.accent, 'rgba(255,255,255,.68)', 2);
      });
      label(context, `HIT ${world.hits}/${world.goal}`, 35, 92, {size: 10, weight: 850});
      label(context, `COMBO ${world.combo}`, 325, 92, {size: 10, weight: 850, align: 'right'});
    }

    drawStack() {
      const context = this.context;
      const world = this.world;
      const gradient = context.createLinearGradient(0, 120, 0, 520); gradient.addColorStop(0, '#B9D9E3'); gradient.addColorStop(1, '#4E7684');
      panel(context, {x: 22, y: 94, w: 316, h: 426, r: 24}, gradient, 'rgba(255,255,255,.25)', 8);
      for (let index = 0; index < world.blocks.length; index += 1) {
        const block = world.blocks[index];
        panel(context, {x: block.x, y: block.y, w: block.w, h: 30, r: 6}, index % 2 ? '#E6B45F' : '#4B8CA4', 'rgba(255,255,255,.58)', 5);
      }
      if (world.moving) panel(context, {x: world.moving.x, y: world.moving.y, w: world.moving.w, h: 30, r: 6}, this.config.accent, '#FFFFFF', 8);
      label(context, `高度 ${world.count}/${world.goal}`, 180, 109, {size: 11, weight: 850, align: 'center', color: '#14242B'});
      label(context, '点按落下平台·偏移部分会被切掉', 180, 538, {size: 9, weight: 700, align: 'center', color: 'rgba(255,255,255,.7)'});
    }

    drawCircuit() {
      const context = this.context;
      const world = this.world;
      panel(context, {x: 28, y: 101, w: 304, h: 331, r: 24}, '#18302B', 'rgba(255,255,255,.16)', 8);
      const cellSize = 71;
      for (let index = 0; index < 16; index += 1) {
        const col = index % 4; const row = Math.floor(index / 4); const x = 38 + col * cellSize; const y = 118 + row * cellSize;
        const correct = world.rotations[index] === world.target[index];
        panel(context, {x, y, w: 64, h: 64, r: 14}, correct ? '#244F42' : '#243B38', correct ? '#5ED5A9' : 'rgba(255,255,255,.14)');
        context.save(); context.translate(x + 32, y + 32); context.rotate(world.rotations[index] * Math.PI / 2);
        context.strokeStyle = correct ? '#8CE7C6' : '#B5C7C1'; context.lineWidth = 7; context.lineCap = 'round';
        context.beginPath(); context.moveTo(-28, 0); context.lineTo(0, 0); context.lineTo(0, -28); context.stroke(); circle(context, 0, 0, 7, this.config.secondary);
        context.restore();
      }
      label(context, `剩余旋转 ${world.turns}`, 180, 456, {size: 12, weight: 850, align: 'center'});
      label(context, '每次点按旋转 90°·绿色表示节点已对齐', 180, 482, {size: 9, weight: 650, align: 'center', color: 'rgba(255,255,255,.65)'});
    }

    drawMatch() {
      const context = this.context; const world = this.world; const colors = ['#DE5B6A','#4BA4C4','#E0B24F','#8D6AC7','#64A46E'];
      panel(context, {x: 18, y: 99, w: 324, h: 382, r: 24}, '#202434', 'rgba(255,255,255,.16)', 8);
      const cell = 51;
      for (let index = 0; index < world.grid.length; index += 1) {
        const col = index % 6; const row = Math.floor(index / 6); const x = 28 + col * cell; const y = 112 + row * cell;
        panel(context, {x, y, w: 45, h: 45, r: 12}, '#2D3342', index === world.selected ? '#FFFFFF' : 'rgba(255,255,255,.11)');
        diamond(context, x + 22.5, y + 22.5, 13, colors[world.grid[index]], 'rgba(255,255,255,.6)');
      }
      circle(context, 48, 448, 9, colors[world.targetColor], '#FFFFFF');
      label(context, `收集 ${world.collected}/${world.goal}`, 66, 448, {size: 11, weight: 850});
      label(context, `剩余 ${world.moves} 步`, 319, 448, {size: 11, weight: 850, align: 'right'});
    }

    drawCups() {
      const context = this.context; const world = this.world;
      panel(context, {x: 20, y: 110, w: 320, h: 335, r: 24}, '#241E2D', 'rgba(255,255,255,.15)', 8);
      label(context, world.reveal > 0 ? '记住星核位置' : world.waitingForShuffle ? '摇晃手机开始洗牌' : world.ready ? '选择一只杯子' : '正在洗牌…', 180, 142, {size: 14, weight: 850, align: 'center'});
      for (let position = 0; position < 3; position += 1) {
        const cupId = world.order[position]; const x = 76 + position * 104;
        const showBall = world.reveal > 0 && cupId === world.ball || world.picked >= 0 && cupId === world.ball;
        if (showBall) { circle(context, x, 285, 16, this.config.secondary, '#FFF4C0', 2); label(context, '核', x, 285, {size: 10, weight: 900, align: 'center', color: '#4B3710'}); }
        context.save(); context.beginPath(); context.moveTo(x - 35, 222); context.lineTo(x + 35, 222); context.lineTo(x + 27, 336); context.lineTo(x - 27, 336); context.closePath();
        context.fillStyle = position === world.picked ? '#B73B50' : this.config.accent; context.fill(); context.strokeStyle = 'rgba(255,255,255,.62)'; context.lineWidth = 2; context.stroke(); context.restore();
        label(context, String(position + 1), x, 267, {size: 16, weight: 900, align: 'center'});
      }
      label(context, `交换 ${world.swapIndex}/${world.swaps.length}`, 180, 411, {size: 10, weight: 750, align: 'center', color: 'rgba(255,255,255,.65)'});
      if (world.waitingForShuffle) label(context, '也可以直接点按画面继续', 180, 430, {size: 9, weight: 700, align: 'center', color: 'rgba(255,255,255,.62)'});
    }

    drawFishing() {
      const context = this.context; const world = this.world;
      const water = context.createLinearGradient(0, 100, 0, 520); water.addColorStop(0, '#2D7188'); water.addColorStop(1, '#0B2737');
      panel(context, {x: 22, y: 99, w: 316, h: 414, r: 24}, water, 'rgba(255,255,255,.18)', 8);
      for (let y = 150; y < 500; y += 70) { context.strokeStyle = 'rgba(255,255,255,.09)'; context.beginPath(); context.moveTo(32, y); context.lineTo(328, y); context.stroke(); }
      context.strokeStyle = '#E6D6A4'; context.lineWidth = 2; context.beginPath(); context.moveTo(180, 103); context.lineTo(180, 112 + world.hook); context.stroke();
      context.beginPath(); context.arc(180, 116 + world.hook, 8, 0, Math.PI); context.stroke();
      context.save(); context.translate(world.fish.x, world.fish.y); context.fillStyle = this.config.secondary; context.beginPath(); context.ellipse(0, 0, 22, 12, 0, 0, TAU); context.fill(); context.beginPath(); context.moveTo(-18,0); context.lineTo(-34,-13); context.lineTo(-34,13); context.closePath(); context.fill(); circle(context, 10, -3, 2, '#18242B'); context.restore();
      label(context, `捕获 ${world.caught}/${world.goal}`, 35, 120, {size: 11, weight: 850});
      label(context, `氧气 ${Math.round(world.oxygen)}%`, 325, 120, {size: 11, weight: 850, align: 'right'});
      this.drawMeter({x: 45, y: 531, w: 270, h: 8}, world.oxygen / 100, '#61C2D1');
    }

    drawDefense() {
      const context = this.context; const world = this.world;
      panel(context, {x: 18, y: 99, w: 324, h: 410, r: 24}, '#252A2C', 'rgba(255,255,255,.16)', 8);
      for (let lane = 0; lane < 3; lane += 1) {
        const x = 72 + lane * 108;
        context.fillStyle = lane % 2 ? '#3B3B34' : '#343A36'; context.fillRect(x - 40, 116, 80, 368);
        context.strokeStyle = 'rgba(255,255,255,.12)'; context.strokeRect(x - 40, 116, 80, 368);
      }
      for (let index = 0; index < 6; index += 1) {
        const col = index % 3; const row = Math.floor(index / 3); const x = 72 + col * 108; const y = row ? 375 : 220;
        circle(context, x, y, 24, world.towers[index] ? this.config.accent : 'rgba(255,255,255,.09)', world.towers[index] ? '#F4D6A2' : 'rgba(255,255,255,.22)', 2);
        if (world.towers[index]) { context.fillStyle = '#D7C19D'; context.fillRect(x - 8, y - 22, 16, 44); label(context, `L${world.towers[index]}`, x, y, {size: 9, weight: 900, align: 'center', color: '#263034'}); }
      }
      world.enemies.forEach(enemy => {
        const x = 72 + enemy.lane * 108;
        hexagon(context, x, enemy.y, 15, '#A8454B', '#F1A1A6');
        this.drawMeter({x: x - 17, y: enemy.y - 25, w: 34, h: 4}, enemy.hp / enemy.max, '#E56D72');
      });
      label(context, `波次 ${world.wave}/${world.goal}`, 31, 91, {size: 10, weight: 850});
      label(context, `能量 ${world.energy.toFixed(1)} · 基地 ${world.base}`, 329, 91, {size: 10, weight: 850, align: 'right'});
      label(context, '点按塔位部署或升级·每条路线独立攻击', 180, 532, {size: 9, weight: 650, align: 'center', color: 'rgba(255,255,255,.64)'});
    }

    drawDrift() {
      const context = this.context; const world = this.world; const roadCenter = 180 + Math.sin((world.distance + this.stage * 17) * .055) * (45 + this.stage * 8);
      panel(context, {x: 18, y: 97, w: 324, h: 420, r: 24}, '#203139', 'rgba(255,255,255,.14)', 8);
      context.beginPath(); context.moveTo(94, 107); context.bezierCurveTo(48,240,312,345,70,507); context.lineTo(290,507); context.bezierCurveTo(112,350,326,220,266,107); context.closePath(); context.fillStyle = '#30363B'; context.fill(); context.strokeStyle = '#D7D2BA'; context.lineWidth = 4; context.stroke();
      context.setLineDash([14, 16]); context.strokeStyle = 'rgba(255,255,255,.45)'; context.lineWidth = 2; context.beginPath(); context.moveTo(180, 110); context.bezierCurveTo(120,240,248,345,180,505); context.stroke(); context.setLineDash([]);
      world.barriers.forEach(barrier => panel(context, {x: barrier.x - 17, y: barrier.y - 8, w: 34, h: 16, r: 5}, '#D66A55', '#F4C0AA'));
      panel(context, {x: world.carX - 17, y: 444, w: 34, h: 54, r: 11}, this.config.accent, '#FFFFFF', 7);
      context.fillStyle = '#D8EEF0'; context.fillRect(world.carX - 9, 452, 18, 13);
      label(context, `${Math.round(world.distance/world.goal*100)}%`, roadCenter, 124, {size: 10, weight: 850, align: 'center'});
      this.drawMeter({x: 42, y: 529, w: 276, h: 8}, world.grip / 100, '#57B8C8');
      label(context, this.sensorProfile && this.sensorProfile.control === 'steer' ? '倾斜转向 · 也可按住左右' : '按住左右控制方向', 180, 548, {size: 9, weight: 700, align: 'center', color: 'rgba(255,255,255,.64)'});
    }

    drawShooter() {
      const context = this.context; const world = this.world;
      panel(context, {x: 20, y: 98, w: 320, h: 418, r: 24}, '#151C31', 'rgba(255,255,255,.14)', 8);
      context.save(); context.globalAlpha = .35; context.fillStyle = '#FFFFFF'; for (let index = 0; index < 28; index += 1) circle(context, 35 + index * 47 % 290, 118 + index * 83 % 370, index % 3 + 1, '#FFFFFF'); context.restore();
      world.bullets.forEach(bullet => { context.fillStyle = this.config.secondary; context.fillRect(bullet.x - 2, bullet.y - 9, 4, 14); });
      world.enemies.forEach(enemy => { hexagon(context, enemy.x, enemy.y, 15, '#B94B69', '#ED9FB3'); context.fillStyle = '#28334B'; context.fillRect(enemy.x - 22, enemy.y - 3, 44, 6); });
      context.save(); context.translate(world.ship.x, world.ship.y); context.beginPath(); context.moveTo(0,-24); context.lineTo(22,19); context.lineTo(0,12); context.lineTo(-22,19); context.closePath(); context.fillStyle = this.config.accent; context.fill(); context.strokeStyle = '#DCE6FF'; context.stroke(); context.restore();
      label(context, `击破 ${world.kills}/${world.goal}`, 31, 91, {size: 10, weight: 850});
      label(context, `护盾 ${world.shield}`, 329, 91, {size: 10, weight: 850, align: 'right'});
      label(context, this.sensorProfile && this.sensorProfile.control === 'aim' ? '倾斜移动 · 也可拖动战机' : '拖动战机自动射击', 180, 536, {size: 9, weight: 700, align: 'center', color: 'rgba(255,255,255,.64)'});
    }

    drawMerge() {
      const context = this.context; const world = this.world; const colors = ['#90B75B','#D1A34C','#D96B58','#A85B7B','#6A77B5','#B89C5D'];
      panel(context, {x: 24, y: 105, w: 312, h: 354, r: 24}, '#332E23', 'rgba(255,255,255,.14)', 8);
      const cell = 58;
      for (let index = 0; index < world.grid.length; index += 1) {
        const col = index % 5; const row = Math.floor(index / 5); const x = 35 + col * cell; const y = 126 + row * cell;
        panel(context, {x, y, w: 52, h: 52, r: 13}, '#EEE4C9', index === world.selected ? '#FFFFFF' : '#B7A77E');
        circle(context, x + 26, y + 28, 13 + world.grid[index] * 1.8, colors[world.grid[index]-1], 'rgba(72,52,30,.38)');
        label(context, world.grid[index], x + 26, y + 28, {size: 10, weight: 900, align: 'center', color: '#FFFFFF'});
      }
      label(context, `最高等级 ${world.bestLevel}/${world.goal}`, 42, 486, {size: 11, weight: 850});
      label(context, `剩余 ${world.moves} 步`, 318, 486, {size: 11, weight: 850, align: 'right'});
    }

    drawShop() {
      const context = this.context; const world = this.world; const labels = this.gameKey === 'moonlight-tea-shop' ? ['茶底','鲜奶','配料','封杯'] : ['玩具','颜色','包装','交付'];
      panel(context, {x: 20, y: 98, w: 320, h: 405, r: 24}, '#F2E6D1', '#FFFFFF', 9);
      label(context, '当前订单', 42, 126, {size: 12, weight: 850, color: '#46392C'});
      panel(context, {x: 40, y: 146, w: 280, h: 96, r: 18}, '#FFFFFF', '#D7C6AA');
      world.order.forEach((step, index) => {
        const x = 72 + index * (210 / Math.max(1, world.order.length - 1));
        circle(context, x, 188, 17, index < world.step ? this.config.accent : '#E5DDD0', index === world.step ? this.config.accent : '#C7B8A2', 2);
        label(context, labels[step].slice(0,1), x, 188, {size: 10, weight: 900, align: 'center', color: index < world.step ? '#FFFFFF' : '#594B3E'});
      });
      this.drawMeter({x: 42, y: 264, w: 276, h: 9}, world.patience / 100, this.config.accent);
      label(context, `交付 ${world.orders}/${world.goal}`, 180, 290, {size: 12, weight: 850, align: 'center', color: '#46392C'});
      if (this.gameKey === 'moonlight-tea-shop') this.drawCanonicalCharacter({x: 244, y: 278, w: 76, h: 105}, {shadowColor: 'rgba(64,43,29,.28)', shadowBlur: 5, shadowOffsetY: 2});
      labels.forEach((value, index) => {
        const x = 8 + index * 88;
        panel(context, {x, y: 394, w: 80, h: 76, r: 18}, index === world.order[world.step] ? this.config.accent : '#FFFFFF', '#D7C6AA', 4);
        label(context, value, x + 40, 432, {size: 11, weight: 850, align: 'center', color: index === world.order[world.step] ? '#FFFFFF' : '#46392C'});
      });
    }

    drawIo() {
      const context = this.context; const world = this.world;
      panel(context, {x: 20, y: 98, w: 320, h: 420, r: 160}, '#17393A', 'rgba(255,255,255,.2)', 8);
      world.food.forEach(food => circle(context, food.x, food.y, food.r, '#E2C56E'));
      world.bots.forEach((bot, index) => { circle(context, bot.x, bot.y, bot.r, index % 2 ? '#C9665F' : '#6B8BB3', 'rgba(255,255,255,.45)', 2); circle(context, bot.x + bot.r*.28, bot.y - bot.r*.2, 2, '#17212A'); });
      circle(context, world.player.x, world.player.y, world.player.r, this.config.accent, '#D8FFF3', 2);
      label(context, `成长 ${world.eaten}/${world.goal}`, 34, 91, {size: 10, weight: 850});
      label(context, '本地机器人·非实时联网', 326, 91, {size: 9, weight: 750, align: 'right', color: 'rgba(255,255,255,.65)'});
    }

    drawWardrobe() {
      const context = this.context; const world = this.world; const tabs = ['上装','下装','配饰']; const palettes = [['#6E7D55','#874E58','#3F5A76'],['#A08162','#625C78','#456C68'],['#C7A56D','#A66A72','#62849A']];
      panel(context, {x: 18, y: 94, w: 324, h: 423, r: 24}, '#EDE4D9', '#FFFFFF', 9);
      tabs.forEach((value,index)=>{ panel(context,{x:22+index*106,y:104,w:102,h:42,r:14},world.category===index?this.config.accent:'#F9F5EF','#D5C7B6'); label(context,value,73+index*106,125,{size:11,weight:850,align:'center',color:world.category===index?'#FFFFFF':'#4B4037'}); });
      panel(context, {x: 116, y: 160, w: 128, h: 175, r: 48}, '#D9CEC1', '#C5B5A3');
      if (!this.drawCanonicalCharacter({x: 126, y: 161, w: 108, h: 173}, {shadowColor: 'rgba(63,45,34,.22)', shadowBlur: 4, shadowOffsetY: 2})) {
        circle(context,180,194,24,'#CDAF97'); context.fillStyle = palettes[0][world.choices[0] < 0 ? 0 : world.choices[0]]; context.fillRect(145,220,70,54); context.fillStyle = palettes[1][world.choices[1] < 0 ? 1 : world.choices[1]]; context.fillRect(151,274,58,56); circle(context,180,236,8,palettes[2][world.choices[2] < 0 ? 2 : world.choices[2]]);
      }
      const selectedColors=world.choices.map((choice,index)=>palettes[index][choice < 0 ? index : choice]);
      selectedColors.forEach((color,index)=>circle(context,128+index*52,326,7,color,'#FFFFFF',1));
      for (let option=0;option<3;option+=1){const x=28+option*104;panel(context,{x,y:354,w:96,h:82,r:16},palettes[world.category][option],world.choices[world.category]===option?'#FFFFFF':'rgba(255,255,255,.4)',5);label(context,`${tabs[world.category]} ${option+1}`,x+48,395,{size:10,weight:850,align:'center'});}
      panel(context,{x:76,y:462,w:208,h:42,r:21},this.config.accent,'rgba(255,255,255,.5)',6);label(context,'提交造型',180,483,{size:12,weight:900,align:'center'});
    }

    drawQuiz() {
      const context=this.context;const world=this.world;const question=world.questions[Math.min(world.index,world.questions.length-1)];
      panel(context,{x:20,y:98,w:320,h:405,r:24},'#F4F1EA','#FFFFFF',9);label(context,`安全情境 ${world.index+1}/3`,42,127,{size:11,weight:850,color:'#4A4239'});panel(context,{x:38,y:150,w:284,h:72,r:18},'#253B51');label(context,question.prompt,180,186,{size:14,weight:850,align:'center'});
      question.answers.forEach((answer,index)=>{const y=250+index*66;panel(context,{x:38,y,w:284,h:52,r:16},'#FFFFFF','#D9D1C5',4);label(context,String.fromCharCode(65+index),60,y+26,{size:11,weight:900,align:'center',color:this.config.accent});label(context,answer,84,y+26,{size:12,weight:800,color:'#332F2A'});});
      if(world.feedback)label(context,world.feedback,180,468,{size:11,weight:850,align:'center',color:world.feedback.includes('正确')?'#2D8A62':'#B54852'});
    }

    drawSequencer() {
      const context=this.context;const world=this.world;panel(context,{x:22,y:101,w:316,h:356,r:24},'#242535','rgba(255,255,255,.15)',8);
      if (this.gameKey === 'magic-choir') label(context,'吹气逐个点亮目标声部 · 也可点按',180,119,{size:9,weight:750,align:'center',color:'rgba(255,255,255,.7)'});
      const cell=67;for(let index=0;index<16;index+=1){const col=index%4,row=Math.floor(index/4),x=38+col*cell,y=140+row*cell;panel(context,{x,y,w:58,h:58,r:15},world.grid[index]?this.config.accent:'#343648',world.target[index]?'rgba(255,255,255,.42)':'rgba(255,255,255,.1)',world.grid[index]?5:0);label(context,`${row+1}.${col+1}`,x+29,y+29,{size:9,weight:850,align:'center'});}
      label(context,`尝试机会 ${world.attempts}`,180,472,{size:10,weight:800,align:'center'});panel(context,{x:78,y:490,w:204,h:42,r:21},this.config.accent);label(context,'校验四轨节奏',180,511,{size:11,weight:900,align:'center'});
    }

    drawSequence() {
      const context=this.context;const world=this.world;panel(context,{x:22,y:104,w:316,h:378,r:24},'#2E2936','rgba(255,255,255,.16)',8);label(context,world.ready?'请复现灯序':'记住舞台灯序',180,142,{size:14,weight:850,align:'center'});
      this.drawCanonicalCharacter({x: 133, y: 153, w: 94, h: 132}, {shadowBlur: 6, shadowOffsetY: 3});
      const previewIndex=Math.floor((1.4+world.sequence.length*.25-world.preview)/.25)%Math.max(1,world.sequence.length);for(let pad=0;pad<4;pad+=1){const x=34+pad*82;const active=!world.ready&&world.sequence[previewIndex]===pad;panel(context,{x,y:306,w:72,h:126,r:28},active?this.config.secondary:(pad%2?this.config.accent:'#72556A'),'rgba(255,255,255,.42)',active?12:3);circle(context,x+36,350,15,'rgba(255,255,255,.72)');label(context,['低音','节拍','和声','高音'][pad],x+36,397,{size:10,weight:850,align:'center'});}
      label(context,`进度 ${world.input.length}/${world.sequence.length}`,180,458,{size:10,weight:800,align:'center'});
    }

    drawSort() {
      const context=this.context;const world=this.world;panel(context,{x:20,y:97,w:320,h:421,r:24},'#203A37','rgba(255,255,255,.16)',8);world.items.filter(item=>!item.sorted).forEach(item=>{circle(context,item.x,item.y,item.r,[this.config.secondary,this.config.accent,'#7AA7C6'][item.type],'rgba(255,255,255,.65)',2);label(context,['A','B','C'][item.type],item.x,item.y,{size:8,weight:900,align:'center',color:'#20302F'});});
      for(let bin=0;bin<3;bin+=1){const x=10+bin*118;panel(context,{x,y:430,w:104,h:72,r:18},['#E1C35B','#57A795','#739EB9'][bin],'rgba(255,255,255,.55)',5);label(context,`${['金光','绿光','蓝光'][bin]}信箱`,x+52,466,{size:10,weight:900,align:'center'});}
      label(context,`已投递 ${world.sorted}/${world.goal}`,180,117,{size:10,weight:850,align:'center'});
    }

    drawMaze() {
      const context=this.context;const world=this.world;panel(context,{x:22,y:100,w:316,h:342,r:24},'#2B2D2B','rgba(255,255,255,.16)',8);const cell=42.57;for(let index=0;index<49;index+=1){const col=index%7,row=Math.floor(index/7),x=31+col*cell,y=113+row*cell;panel(context,{x,y,w:38,h:38,r:9},world.walls.has(index)?'#17191A':'#464943','rgba(255,255,255,.08)');if(index===world.exit){context.fillStyle='#6EC79A';context.fillRect(x+10,y+7,18,25);}}
      world.guards.forEach(guard=>{const col=guard.index%7,row=Math.floor(guard.index/7);circle(context,50+col*cell,132+row*cell,11,'#C95A58');context.fillStyle='rgba(232,202,94,.22)';context.beginPath();context.moveTo(50+col*cell,132+row*cell);context.lineTo(95+col*cell,112+row*cell);context.lineTo(95+col*cell,152+row*cell);context.closePath();context.fill();});const pc=world.player%7,pr=Math.floor(world.player/7);circle(context,50+pc*cell,132+pr*cell,12,this.config.accent,'#FFFFFF',2);context.beginPath();context.moveTo(43+pc*cell,122+pr*cell);context.lineTo(47+pc*cell,112+pr*cell);context.lineTo(52+pc*cell,122+pr*cell);context.fillStyle=this.config.accent;context.fill();label(context,`剩余 ${world.steps} 步·点按相邻格移动`,180,470,{size:10,weight:800,align:'center'});
    }

    drawCoin() {
      const context=this.context;const world=this.world;panel(context,{x:20,y:98,w:320,h:419,r:24},'#253746','rgba(255,255,255,.16)',8);world.rings.forEach((ring,index)=>{context.beginPath();context.arc(ring.x,ring.y,ring.r,0,TAU);context.strokeStyle=ring.hit?'rgba(255,255,255,.18)':this.config.secondary;context.lineWidth=7;context.stroke();label(context,index+1,ring.x,ring.y,{size:9,weight:900,align:'center',color:ring.hit?'rgba(255,255,255,.25)':'#FFFFFF'});});circle(context,world.coin.x,world.coin.y,13,this.config.accent,'#FFF0B7',3);label(context,`门环 ${world.hits}/${world.goal}`,32,91,{size:10,weight:850});label(context,`发射 ${world.launches}`,328,91,{size:10,weight:850,align:'right'});label(context,'点按目标方向发射·距离决定力度',180,536,{size:9,weight:700,align:'center',color:'rgba(255,255,255,.65)'});
    }

    drawBuilder() {
      const context=this.context;const world=this.world;panel(context,{x:22,y:98,w:316,h:344,r:24},'#213B34','rgba(255,255,255,.16)',8);const cell=85.3;for(let index=0;index<9;index+=1){const col=index%3,row=Math.floor(index/3),x=52+col*cell,y=145+row*cell;panel(context,{x,y,w:77,h:77,r:17},world.plots[index]?'#C9B987':'#395244','rgba(255,255,255,.16)');if(world.plots[index]){const colors=['','#6F9D54','#55A8B0','#D58D62'];circle(context,x+38,y+38,20,colors[world.plots[index]],'#FFFFFF',2);label(context,['','田','水','屋'][world.plots[index]],x+38,y+38,{size:12,weight:900,align:'center'});}}
      label(context,`水 ${world.water}  粮 ${world.food}  居所 ${world.homes}  回合 ${world.turns}`,180,120,{size:10,weight:850,align:'center'});['农田','水井','居所'].forEach((value,index)=>{const x=8+index*118;panel(context,{x,y:464,w:108,h:48,r:16},world.selectedType===index+1?this.config.accent:'#33453E','rgba(255,255,255,.22)');label(context,value,x+54,488,{size:11,weight:850,align:'center'});});
    }

    drawBattle() {
      const context=this.context;const world=this.world;panel(context,{x:18,y:98,w:324,h:355,r:24},'#302B2C','rgba(255,255,255,.16)',8);if(!this.drawCanonicalCharacter({x:42,y:157,w:98,h:151},{mirror:false,shadowBlur:6,shadowOffsetY:3})){circle(context,91,257,42,this.config.accent,'#F5D5C5',3);label(context,'骑',91,257,{size:23,weight:900,align:'center'});}hexagon(context,269,257,44,'#9F4548','#E3A3A4');label(context,'敌',269,257,{size:23,weight:900,align:'center'});this.drawMeter({x:43,y:318,w:96,h:9},world.hero/world.heroMax,'#5CB783');this.drawMeter({x:221,y:318,w:96,h:9},world.enemy/world.enemyMax,'#D75C65');label(context,`护盾 ${world.guard} · 蓄力 ${world.charge}`,91,345,{size:10,weight:800,align:'center'});label(context,`意图 ${['重击','连击','破防'][world.intent]}`,269,345,{size:10,weight:800,align:'center'});label(context,world.message,180,403,{size:11,weight:800,align:'center'});['攻击','防御','蓄力'].forEach((value,index)=>{const x=8+index*118;panel(context,{x,y:472,w:108,h:48,r:16},index===0?this.config.accent:index===1?'#4E7E74':'#8A704A','rgba(255,255,255,.3)',4);label(context,value,x+54,496,{size:11,weight:900,align:'center'});});
    }

    drawMeter(rect, ratio, color) {
      panel(this.context, {...rect, r: rect.h / 2}, 'rgba(255,255,255,.13)');
      const width = clamp(rect.w * clamp(ratio, 0, 1), 0, rect.w);
      if (width > 0) panel(this.context, {x: rect.x, y: rect.y, w: width, h: rect.h, r: rect.h / 2}, color);
    }

    drawPause() {
      this.context.fillStyle = 'rgba(6, 9, 13, .78)'; this.context.fillRect(0,0,WIDTH,HEIGHT);
      panel(this.context,{x:55,y:210,w:250,h:138,r:24},'#20252D','rgba(255,255,255,.2)',12);
      label(this.context,'已暂停',180,250,{size:24,weight:900,align:'center'});
      label(this.context,'点按画面或下方按钮继续',180,286,{size:11,weight:700,align:'center',color:'rgba(255,255,255,.7)'});
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

    later(callback, delay) {
      const timer = setTimeout(() => {
        this.timers.delete(timer);
        callback();
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
    version: '3.3.0',
    width: WIDTH,
    height: HEIGHT,
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
      art: value.heroCharacterId ? 'character-consistency-v1' : 'code-native-v3'
    })),
    mount(canvas, key, options) { return new CompleteGame(canvas, key, options || {}); }
  });
})(typeof window !== 'undefined' ? window : globalThis);
