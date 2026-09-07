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
    'crystal-bastion': ['#597DA2', '#C4BADA', '#5AAEC6', '#F0EAF7', '#757793', '#AEA5C5'],
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
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const pointIn = (point, rect) => point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
  const shuffle = values => {
    const result = values.slice();
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
  };

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

  function fillPanel(context, rect, fill, stroke) {
    paintCasualPanel(context, rect, fill, stroke, 3);
  }

  function text(context, value, x, y, options) {
    const settings = options || {};
    context.save();
    context.fillStyle = settings.color || '#FFFFFF';
    context.font = `${settings.weight || 600} ${settings.size || 14}px ${settings.family || 'system-ui, -apple-system, sans-serif'}`;
    context.textAlign = settings.align || 'left';
    context.textBaseline = settings.baseline || 'middle';
    context.shadowBlur = 0;
    if (settings.shadow || !settings.color || settings.color === '#FFFFFF') {
      context.shadowColor = 'rgba(60,44,22,.48)';
      context.shadowBlur = 2;
      context.shadowOffsetY = 1.5;
    }
    context.fillText(String(value), x, y, settings.maxWidth || undefined);
    context.restore();
  }

  class DeepGameBase {
    constructor(canvas, options) {
      if (!canvas || typeof canvas.getContext !== 'function') throw new Error('A canvas element is required.');
      this.canvas = canvas;
      this.options = options || {};
      this.context = canvas.getContext('2d');
      this.gameKey = this.constructor.gameKey || this.options.gameKey || '';
      this.uiTheme = uiTheme(this.gameKey);
      applyUiTheme(canvas, this.uiTheme);
      this.artProfile = root.AirvanaGameArtV1 && root.AirvanaGameArtV1.get ? root.AirvanaGameArtV1.get(this.gameKey) : null;
      this.stage = 1;
      this.score = 0;
      this.finished = false;
      this.paused = false;
      this.muted = !!this.options.muted;
      this.lastTime = 0;
      this.elapsed = 0;
      this.effects = [];
      this.drawnAssetKeys = new Set();
      this.raf = 0;
      this.pointer = {x: WIDTH / 2, y: HEIGHT / 2, down: false};
      this.background = null;
      this.assetErrors = [];
      this.audioContext = null;
      this.reducedMotion = !!this.options.reducedMotion;
      this.resize = this.resize.bind(this);
      this.frame = this.frame.bind(this);
      this.onPointerDown = this.onPointerDown.bind(this);
      this.onPointerMove = this.onPointerMove.bind(this);
      this.onPointerUp = this.onPointerUp.bind(this);
      this.onKeyDown = this.onKeyDown.bind(this);
      this.canvas.style.touchAction = 'none';
      this.canvas.addEventListener('pointerdown', this.onPointerDown);
      this.canvas.addEventListener('pointermove', this.onPointerMove);
      this.canvas.addEventListener('pointerup', this.onPointerUp);
      this.canvas.addEventListener('pointercancel', this.onPointerUp);
      this.canvas.addEventListener('keydown', this.onKeyDown);
      if (root.addEventListener) root.addEventListener('resize', this.resize);
      this.loadBackground(CLASSIC_SCENE_BASE + this.gameKey + '.svg');
      if (root.AirvanaPlayableAssetsV3 && root.AirvanaPlayableAssetsV3.load) root.AirvanaPlayableAssetsV3.load().catch(() => {});
      this.resize();
      this.emit('level_start', {stage: 1});
      this.status('第 1 / 3 阶段');
      this.raf = root.requestAnimationFrame(this.frame);
    }

    loadBackground(source) {
      if (!source || typeof root.Image !== 'function') return;
      const image = new root.Image();
      image.decoding = 'async';
      image.onload = () => { this.background = image; };
      image.onerror = () => {
        this.background = null;
        if (!this.assetErrors.includes(source)) this.assetErrors.push(source);
        this.emit('asset_load_failed', {asset: source, assetPack: 'classic-v1'});
      };
      image.src = source;
    }


    imageReady(image) {
      return !!(image && image.complete && image.naturalWidth > 0);
    }

    drawObject(key, rect, options) {
      const assets = root.AirvanaPlayableAssetsV3;
      if (assets && assets.draw && assets.draw(this.context, key, rect, options || {})) {
        this.drawnAssetKeys.add(key);
        return true;
      }
      fillPanel(this.context, {...rect, r: Math.min(rect.w, rect.h) / 4}, '#A9B3B9', '#AEB2B6');
      return false;
    }

    feedback(x, y, label, color, sprite) {
      this.effects.push({x, y, label, color: color || '#FFE29B', sprite, life: .8, total: .8});
      if (this.effects.length > 36) this.effects.splice(0, this.effects.length - 36);
    }

    drawFeedback() {
      this.effects.forEach(effect => {
        const progress = 1 - effect.life / effect.total;
        const y = effect.y - (this.reducedMotion ? 0 : progress * 30);
        this.context.save();
        this.context.globalAlpha = Math.min(1, effect.life * 3);
        if (effect.sprite) this.drawObject(effect.sprite, {x: effect.x - 19, y: y - 37, w: 38, h: 38}, {alpha: effect.life / effect.total});
        if (effect.label) text(this.context, effect.label, effect.x, y, {size: 17, weight: 900, align: 'center', color: effect.color, shadow: true});
        this.context.restore();
      });
    }


    resize() {
      const ratio = clamp(root.devicePixelRatio || 1, 1, 2);
      this.canvas.width = Math.round(WIDTH * ratio);
      this.canvas.height = Math.round(HEIGHT * ratio);
      this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
      this.context.imageSmoothingEnabled = true;
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
      if (this.finished) return;
      this.ensureAudio();
      this.pointer = {...this.coordinates(event), down: true};
      if (this.canvas.setPointerCapture && event.pointerId != null) {
        try { this.canvas.setPointerCapture(event.pointerId); } catch (error) {}
      }
      this.press(this.pointer);
    }

    onPointerMove(event) {
      if (!this.pointer.down || this.paused || this.finished) return;
      this.pointer = {...this.coordinates(event), down: true};
      this.move(this.pointer);
    }

    onPointerUp(event) {
      this.pointer = {...this.coordinates(event), down: false};
      this.release(this.pointer);
    }

    onKeyDown(event) {
      if (this.finished) return;
      if (event.key === 'Escape' || event.key.toLowerCase() === 'p') { event.preventDefault(); this.togglePause(); return; }
      if (this.paused) {
        if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); this.togglePause(false); }
        return;
      }
      if (event.key === ' ') {
        event.preventDefault();
        this.press(this.pointer);
        return;
      }
      if (event.key === 'Enter' || event.key.startsWith('Arrow')) event.preventDefault();
      this.key(event.key);
    }

    press() {}
    move() {}
    release() {}
    key() {}
    update() {}
    render() {}

    frame(timestamp) {
      if (this.finished) return;
      const delta = this.lastTime ? clamp((timestamp - this.lastTime) / 1000, 0, 0.04) : 0;
      this.lastTime = timestamp;
      if (!this.paused) {
        this.elapsed += delta;
        this.effects = this.effects.filter(effect => { effect.life -= delta; return effect.life > 0; });
        this.update(delta);
      }
      this.draw();
      this.raf = root.requestAnimationFrame(this.frame);
    }

    drawBackdrop(overlay) {
      const context = this.context;
      context.setTransform(this.canvas.width / WIDTH, 0, 0, this.canvas.height / HEIGHT, 0, 0);
      context.clearRect(0, 0, WIDTH, HEIGHT);
      if (this.background) {
        const imageRatio = this.background.width / this.background.height;
        const canvasRatio = WIDTH / HEIGHT;
        let sourceX = 0;
        let sourceY = 0;
        let sourceWidth = this.background.width;
        let sourceHeight = this.background.height;
        if (imageRatio > canvasRatio) {
          sourceWidth = this.background.height * canvasRatio;
          sourceX = (this.background.width - sourceWidth) / 2;
        } else {
          sourceHeight = this.background.width / canvasRatio;
          sourceY = (this.background.height - sourceHeight) / 2;
        }
        context.drawImage(this.background, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, WIDTH, HEIGHT);
      } else {
        context.fillStyle = this.uiTheme.field;
        context.fillRect(0, 0, WIDTH, HEIGHT);
      }
      // Bright casual backplates stay untinted; compact HUD panels carry the contrast.
    }

    drawHud(title, subtitle, accent) {
      fillPanel(this.context, {x: 12, y: 10, w: 336, h: 34, r: 17}, this.uiTheme.hud, this.uiTheme.rim);
      text(this.context, subtitle, 24, 27, {size: 10, weight: 700, maxWidth: 265});
      fillPanel(this.context, {x: 300, y: 15, w: 38, h: 24, r: 12}, this.uiTheme.badge, this.uiTheme.rim);
      text(this.context, `${this.stage}/3`, 319, 27, {size: 11, weight: 900, align: 'center'});
    }

    drawButton(rect, label, active) {
      fillPanel(this.context, rect, active === false ? '#ADB19A' : this.uiTheme.paper, this.uiTheme.rim);
      text(this.context, label, rect.x + rect.w / 2, rect.y + rect.h / 2, {size: 13, weight: 800, align: 'center', color: active === false ? '#80858C' : '#111318'});
    }

    drawPause() {
      if (!this.paused) return;
      this.context.fillStyle = 'rgba(30,39,50,.45)';
      this.context.fillRect(0, 0, WIDTH, HEIGHT);
      fillPanel(this.context, {x: 54, y: 205, w: 252, h: 142, r: 24}, this.uiTheme.hud, this.uiTheme.rim);
      text(this.context, '已暂停', 180, 249, {size: 24, weight: 900, align: 'center'});
      text(this.context, '点击下方继续按钮或按 P 恢复', 180, 282, {size: 12, weight: 600, align: 'center', color: '#BEC1C4'});
      this.drawButton({x: 96, y: 303, w: 168, h: 36, r: 18}, '继续游戏');
    }

    draw() {
      this.drawnAssetKeys.clear();
      this.drawBackdrop();
      this.render(this.context);
      this.drawFeedback();
      this.drawPause();
    }

    ensureAudio() {
      if (this.muted || this.audioContext) return this.audioContext;
      const AudioContextClass = root.AudioContext || root.webkitAudioContext;
      if (!AudioContextClass) return null;
      try {
        this.audioContext = new AudioContextClass();
        if (this.audioContext.state === 'suspended') this.audioContext.resume();
      } catch (error) {}
      return this.audioContext;
    }

    tone(kind) {
      if (this.muted) return;
      const context = this.ensureAudio();
      if (!context) return;
      const tones = {tap: [320, .04], good: [680, .09], bad: [140, .12], stage: [840, .2], success: [1040, .32]};
      const spec = tones[kind] || tones.tap;
      try {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = kind === 'bad' ? 'sawtooth' : 'triangle';
        oscillator.frequency.setValueAtTime(spec[0], context.currentTime);
        gain.gain.setValueAtTime(.045, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + spec[1]);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + spec[1]);
      } catch (error) {}
    }

    emit(name, properties) {
      if (typeof this.options.onEvent === 'function') this.options.onEvent(name, {stage: this.stage, score: this.score, ...(properties || {})});
    }

    status(message) {
      if (typeof this.options.onStatus === 'function') this.options.onStatus({paused: this.paused, stage: this.stage, score: this.score, text: message});
    }

    levelComplete(summary) {
      this.emit('level_complete', {summary});
      this.tone('stage');
    }

    nextStage(summary) {
      this.levelComplete(summary);
      this.stage += 1;
      this.emit('level_start', {stage: this.stage});
      this.status(`第 ${this.stage} / 3 阶段`);
    }

    finish(success, summary) {
      if (this.finished) return;
      this.finished = true;
      if (this.raf) root.cancelAnimationFrame(this.raf);
      this.tone(success ? 'success' : 'bad');
      if (typeof this.options.onComplete === 'function') this.options.onComplete({success: !!success, score: Math.max(0, Math.round(this.score)), stage: this.stage, summary: summary || ''});
    }

    togglePause(force) {
      if (this.finished) return this.paused;
      this.paused = typeof force === 'boolean' ? force : !this.paused;
      this.lastTime = 0;
      this.status(this.paused ? '游戏已暂停' : `第 ${this.stage} / 3 阶段进行中`);
      return this.paused;
    }

    setMuted(value) { this.muted = !!value; }

    inspect() {
      return {
        gameKey: this.constructor.gameKey,
        stage: this.stage,
        stages: 3,
        score: this.score,
        paused: this.paused,
        finished: this.finished,
        artPack: 'classic-v1',
        assetErrors: this.assetErrors.slice(),
        artReady: this.imageReady(this.background) && !!(root.AirvanaPlayableAssetsV3 && root.AirvanaPlayableAssetsV3.ready()),
        gameplayAssetPack: 'classic-v1',
        gameplayAssetsReady: !!(root.AirvanaPlayableAssetsV3 && root.AirvanaPlayableAssetsV3.ready()),
        drawnAssetKeys: Array.from(this.drawnAssetKeys),
        gameplayStates: ['intro', 'playing', 'paused', 'success', 'failure', 'retry']
      };
    }

    destroy() {
      this.finished = true;
      if (this.raf) root.cancelAnimationFrame(this.raf);
      this.canvas.removeEventListener('pointerdown', this.onPointerDown);
      this.canvas.removeEventListener('pointermove', this.onPointerMove);
      this.canvas.removeEventListener('pointerup', this.onPointerUp);
      this.canvas.removeEventListener('pointercancel', this.onPointerUp);
      this.canvas.removeEventListener('keydown', this.onKeyDown);
      if (root.removeEventListener) root.removeEventListener('resize', this.resize);
      if (this.audioContext && this.audioContext.close) {
        try { this.audioContext.close(); } catch (error) {}
      }
    }
  }

  class StarMowerGame extends DeepGameBase {
    constructor(canvas, options) {
      super(canvas, options);
      this.player = {x: 180, y: 370, targetX: 180, targetY: 370, hp: 100, radius: 12};
      this.enemies = [];
      this.orbs = [];
      this.spawnClock = 0;
      this.attackClock = 0;
      this.stageTime = 0;
      this.stageDurations = [50, 55, 60];
      this.upgradeChoices = null;
      this.bladeRadius = 42;
      this.speed = 92;
      this.damage = 2;
      this.shield = 0;
      this.kills = 0;
      this.hitClock = 0;
    }

    spawnEnemy() {
      const side = Math.floor(Math.random() * 4);
      const point = side === 0 ? {x: Math.random() * WIDTH, y: 70} : side === 1 ? {x: WIDTH - 5, y: 80 + Math.random() * 400} : side === 2 ? {x: Math.random() * WIDTH, y: HEIGHT - 5} : {x: 5, y: 80 + Math.random() * 400};
      const boss = this.stage === 3 && !this.enemies.some(enemy => enemy.boss) && this.stageTime > 24;
      this.enemies.push({...point, hp: boss ? 80 : 5 + this.stage * 2, maxHp: boss ? 80 : 5 + this.stage * 2, speed: boss ? 20 : 22 + this.stage * 5, radius: boss ? 24 : 8 + Math.random() * 4, boss});
    }

    press(point) {
      if (this.finished) return;
      if (this.paused) { this.togglePause(false); return; }
      if (this.upgradeChoices) {
        const index = this.upgradeChoices.findIndex(choice => pointIn(point, choice.rect));
        if (index >= 0) this.applyUpgrade(index);
        return;
      }
      this.player.targetX = clamp(point.x, 18, WIDTH - 18);
      this.player.targetY = clamp(point.y, 78, 536);
      this.emit('valid_interaction', {interaction_type: 'move_target'});
      this.tone('tap');
    }

    move(point) {
      if (!this.paused && !this.finished && !this.upgradeChoices) {
        this.player.targetX = clamp(point.x, 18, WIDTH - 18);
        this.player.targetY = clamp(point.y, 78, 536);
      }
    }

    key(keyName) {
      if (this.paused || this.finished) return;
      if (this.upgradeChoices) {
        if (['1', '2', '3'].includes(keyName)) this.applyUpgrade(Number(keyName) - 1);
        return;
      }
      const step = 34;
      if (keyName === 'ArrowLeft') this.player.targetX -= step;
      if (keyName === 'ArrowRight') this.player.targetX += step;
      if (keyName === 'ArrowUp') this.player.targetY -= step;
      if (keyName === 'ArrowDown') this.player.targetY += step;
      this.player.targetX = clamp(this.player.targetX, 14, WIDTH - 14);
      this.player.targetY = clamp(this.player.targetY, 78, HEIGHT - 14);
    }

    applyUpgrade(index) {
      if (this.finished || this.paused || !this.upgradeChoices || !this.upgradeChoices[index]) return;
      const upgrades = ['blade', 'speed', 'shield'];
      const picked = upgrades[index];
      if (picked === 'blade') { this.bladeRadius += 12; this.damage += 1; }
      if (picked === 'speed') this.speed += 24;
      if (picked === 'shield') { this.shield += 35; this.player.hp = Math.min(100, this.player.hp + 18); }
      this.upgradeChoices = null;
      this.enemies = [];
      this.orbs = [];
      this.stageTime = 0;
      this.nextStage(`选择升级：${picked}`);
      this.emit('valid_interaction', {interaction_type: 'upgrade_choice', upgrade: picked});
    }

    update(delta) {
      if (this.paused || this.finished || this.upgradeChoices) return;
      this.stageTime += delta;
      this.hitClock = Math.max(0, this.hitClock - delta);
      const dx = this.player.targetX - this.player.x;
      const dy = this.player.targetY - this.player.y;
      const length = Math.hypot(dx, dy);
      if (length > 2) {
        const travel = Math.min(length, this.speed * delta);
        this.player.x += dx / length * travel;
        this.player.y += dy / length * travel;
      }
      this.spawnClock -= delta;
      if (this.spawnClock <= 0 && this.enemies.length < 28) {
        this.spawnEnemy();
        this.spawnClock = Math.max(.34, 1.05 - this.stage * .17);
      }
      this.attackClock -= delta;
      const pulse = this.attackClock <= 0;
      if (pulse) this.attackClock = .36;
      this.enemies.forEach(enemy => {
        enemy.flash = Math.max(0, (enemy.flash || 0) - delta);
        const vx = this.player.x - enemy.x;
        const vy = this.player.y - enemy.y;
        const dist = Math.max(1, Math.hypot(vx, vy));
        enemy.x += vx / dist * enemy.speed * delta;
        enemy.y += vy / dist * enemy.speed * delta;
        if (pulse && dist < this.bladeRadius + enemy.radius) {
          enemy.hp -= this.damage;
          enemy.flash = .16;
          this.feedback(enemy.x, enemy.y - 14, `−${this.damage}`, '#FFF0AD');
        }
        if (dist < this.player.radius + enemy.radius + 2) {
          let hit = (enemy.boss ? 18 : 7) * delta;
          if (this.shield > 0) {
            const absorbed = Math.min(this.shield, hit);
            this.shield -= absorbed;
            hit -= absorbed;
          }
          this.player.hp -= hit;
          if (this.hitClock <= 0) { this.feedback(this.player.x, this.player.y - 25, hit > 0 ? '受击' : '格挡', hit > 0 ? '#FF9999' : '#8CDAFF'); this.hitClock = .7; }
        }
      });
      const defeated = this.enemies.filter(enemy => enemy.hp <= 0);
      defeated.forEach(enemy => {
        this.kills += 1;
        this.score += enemy.boss ? 450 : 18 + this.stage * 4;
        if (Math.random() < .32 || enemy.boss) this.orbs.push({x: enemy.x, y: enemy.y, value: enemy.boss ? 8 : 1});
      });
      this.enemies = this.enemies.filter(enemy => enemy.hp > 0);
      this.orbs = this.orbs.filter(orb => {
        if (distance(orb, this.player) < 24) {
          this.score += orb.value * 12;
          this.player.hp = Math.min(100, this.player.hp + orb.value * 1.5);
          this.feedback(this.player.x, this.player.y - 20, `+${orb.value * 12}`, '#B9FF7A', 'energy');
          this.tone('good');
          return false;
        }
        return true;
      });
      if (this.player.hp <= 0) this.finish(false, `清理 ${this.kills} 个星尘孢体`);
      const duration = this.stageDurations[this.stage - 1];
      if (!this.finished && this.stageTime >= duration) {
        if (this.stage >= 3) this.finish(true, `生存 ${Math.round(this.stageDurations.reduce((a, b) => a + b, 0))} 秒并清理 ${this.kills} 个目标`);
        else {
          this.upgradeChoices = [
            {label: '扩大星刃', desc: '范围 +12 · 伤害 +1', rect: {x: 22, y: 248, w: 98, h: 116, r: 18}},
            {label: '推进增压', desc: '移动速度 +24', rect: {x: 131, y: 248, w: 98, h: 116, r: 18}},
            {label: '恢复护盾', desc: '护盾 +35 · 修复', rect: {x: 240, y: 248, w: 98, h: 116, r: 18}}
          ];
        }
      }
    }

    render(context) {
      this.drawHud('星尘割草', `生命 ${Math.ceil(this.player.hp)} · 护盾 ${Math.ceil(this.shield)} · 击破 ${this.kills}`, '#85D34A');
      const remaining = Math.max(0, this.stageDurations[this.stage - 1] - this.stageTime);
      fillPanel(context, {x: 14, y: 52, w: 332, h: 18, r: 9}, '#45683C');
      context.fillStyle = '#8CE052';
      roundedRect(context, 17, 55, 326 * (1 - remaining / this.stageDurations[this.stage - 1]), 12, 6);
      context.fill();
      text(context, `${Math.ceil(remaining)} 秒`, 180, 61, {size: 10, weight: 900, align: 'center'});
      this.orbs.forEach(orb => {
        const size = orb.value > 1 ? 30 : 20;
        this.drawObject('energy', {x: orb.x - size / 2, y: orb.y - size / 2, w: size, h: size});
      });
      this.enemies.forEach(enemy => {
        const size = enemy.boss ? 74 : 38;
        this.drawObject(enemy.boss ? 'microbe_enemy' : 'spore', {x: enemy.x - size / 2, y: enemy.y - size / 2, w: size, h: size}, {alpha: enemy.flash > 0 ? .55 : 1});
        if (enemy.boss) {
          context.fillStyle = '#0B0F14'; context.fillRect(enemy.x - 25, enemy.y - 32, 50, 5);
          context.fillStyle = '#FF4D6F'; context.fillRect(enemy.x - 25, enemy.y - 32, 50 * enemy.hp / enemy.maxHp, 5);
        }
      });
      context.beginPath(); context.arc(this.player.x, this.player.y, this.bladeRadius, 0, TAU); context.strokeStyle = '#6E9557'; context.lineWidth = 2; context.stroke();
      this.drawObject('mower', {x: this.player.x - 30, y: this.player.y - 31, w: 60, h: 60}, {flipX: this.player.targetX < this.player.x});
      for (let blade = 0; blade < 2; blade += 1) {
        const angle = (this.reducedMotion ? 0 : this.elapsed * 5) + blade * Math.PI;
        this.drawObject('sword', {x: this.player.x + Math.cos(angle) * this.bladeRadius - 16, y: this.player.y + Math.sin(angle) * this.bladeRadius - 16, w: 32, h: 32}, {rotation: angle + Math.PI / 2});
      }
      if (this.shield > 0) { context.beginPath(); context.arc(this.player.x, this.player.y, 34, 0, TAU); context.strokeStyle = '#8CDAFF'; context.lineWidth = 3; context.stroke(); }
      context.beginPath(); context.arc(this.player.targetX, this.player.targetY, 7, 0, TAU); context.strokeStyle = '#9EA2A7'; context.stroke();
      if (this.elapsed < 4) text(context, '拖动移动 · 自动攻击', 180, 537, {size: 11, weight: 700, align: 'center', shadow: true});
      if (this.upgradeChoices) {
        context.fillStyle = 'rgba(30,39,50,.5)'; context.fillRect(0, 0, WIDTH, HEIGHT);
        text(context, '选择阶段升级', 180, 208, {size: 23, weight: 900, align: 'center'});
        this.upgradeChoices.forEach((choice, index) => {
          fillPanel(context, choice.rect, index === 0 ? '#283A1F' : index === 1 ? '#172E46' : '#3B223F', '#4F575F');
          this.drawObject(['sword', 'boots', 'shield'][index], {x: choice.rect.x + 23, y: choice.rect.y + 8, w: 52, h: 52});
          text(context, choice.label, choice.rect.x + choice.rect.w / 2, choice.rect.y + 65, {size: 13, weight: 900, align: 'center'});
          text(context, choice.desc, choice.rect.x + choice.rect.w / 2, choice.rect.y + 90, {size: 9, weight: 600, align: 'center', color: '#BEC1C4', maxWidth: 86});
        });
      }
    }
  }
  StarMowerGame.gameKey = 'star-mower';

  class StarDeckGame extends DeepGameBase {
    constructor(canvas, options) {
      super(canvas, options);
      this.heroHp = 42;
      this.heroMaxHp = 42;
      this.block = 0;
      this.energy = 3;
      this.turn = 1;
      this.weaken = 0;
      this.encounters = [
        {name: '轨道哨兵', sprite: 'sentinel', hp: 28, maxHp: 28, intents: [7, 9, 6]},
        {name: '双星掠夺者', sprite: 'raider', hp: 42, maxHp: 42, intents: [10, 7, 13]},
        {name: '失控星核', sprite: 'crystal', hp: 62, maxHp: 62, intents: [12, 15, 9]}
      ];
      this.enemy = {...this.encounters[0]};
      this.cards = [
        {id: 'strike', name: '星刃', sprite: 'sword', cost: 1, copy: '7 伤害'},
        {id: 'guard', name: '守护阵', sprite: 'shield', cost: 1, copy: '8 护盾'},
        {id: 'lance', name: '穿透矛', sprite: 'fire', cost: 2, copy: '12 伤害'},
        {id: 'heal', name: '回响', sprite: 'potion', cost: 1, copy: '恢复 5 生命'},
        {id: 'frost', name: '寒霜', sprite: 'frost', cost: 2, copy: '5 伤害 · 弱化'}
      ];
      this.hand = this.drawHand();
      this.relic = '';
      this.transition = null;
      this.enemyRecoil = 0;
      this.heroRecoil = 0;
    }

    drawHand() {
      const offset = (this.turn + this.stage) % this.cards.length;
      return Array.from({length: 5}, (_, index) => this.cards[(offset + index) % this.cards.length]);
    }

    currentIntent() {
      const base = this.enemy.intents[(this.turn - 1) % this.enemy.intents.length];
      return Math.max(2, base - this.weaken);
    }

    press(point) {
      if (this.finished) return;
      if (this.paused) { this.togglePause(false); return; }
      if (this.transition) {
        const index = this.transition.findIndex(option => pointIn(point, option.rect));
        if (index >= 0) this.chooseRelic(index);
        return;
      }
      const endTurn = {x: 250, y: 330, w: 92, h: 38};
      if (pointIn(point, endTurn)) { this.endTurn(); return; }
      const cardWidth = 62;
      const gap = 7;
      const startX = 11;
      const cardIndex = this.hand.findIndex((card, index) => pointIn(point, {x: startX + index * (cardWidth + gap), y: 394, w: cardWidth, h: 145}));
      if (cardIndex >= 0) this.playCard(cardIndex);
    }

    key(keyName) {
      if (this.paused || this.finished) return;
      const number = Number(keyName);
      if (this.transition) { if (number >= 1 && number <= 3) this.chooseRelic(number - 1); return; }
      if (number >= 1 && number <= 5) this.playCard(number - 1);
      if (keyName === 'Enter') this.endTurn();
    }

    playCard(index) {
      if (this.finished || this.paused || this.transition) return;
      const card = this.hand[index];
      if (!card) return;
      if (card.cost > this.energy) { this.feedback(180, 377, '能量不足', '#FFD38C'); this.tone('bad'); return; }
      const enemyHp = this.enemy.hp;
      const heroHp = this.heroHp;
      const shield = this.block;
      this.energy -= card.cost;
      if (card.id === 'strike') this.enemy.hp -= 7 + (this.relic === 'blade' ? 2 : 0);
      if (card.id === 'guard') this.block += 8 + (this.relic === 'ward' ? 3 : 0);
      if (card.id === 'lance') this.enemy.hp -= 12 + (this.relic === 'blade' ? 3 : 0);
      if (card.id === 'heal') this.heroHp = Math.min(this.heroMaxHp, this.heroHp + 5);
      if (card.id === 'frost') { this.enemy.hp -= 5; this.weaken = 4; }
      if (this.enemy.hp < enemyHp) { this.enemyRecoil = .22; this.feedback(269, 157, `−${enemyHp - this.enemy.hp}`, '#FFCB8A', card.sprite); }
      if (this.block > shield) this.feedback(82, 223, `护盾 +${this.block - shield}`, '#9EE9FF', 'shield');
      if (this.heroHp > heroHp) this.feedback(82, 223, `+${this.heroHp - heroHp}`, '#A2FFC0', 'potion');
      this.score += card.id === 'guard' ? 16 : card.id === 'heal' ? 12 : 28;
      this.emit('valid_interaction', {interaction_type: 'card_play', card: card.id, energy: this.energy});
      this.tone('good');
      this.hand.splice(index, 1);
      if (this.enemy.hp <= 0) this.winEncounter();
    }

    endTurn() {
      if (this.finished || this.paused || this.transition) return;
      const incoming = this.currentIntent();
      const damage = Math.max(0, incoming - this.block);
      this.heroHp -= damage;
      this.heroRecoil = damage ? .25 : 0;
      this.feedback(82, 222, damage ? `−${damage}` : '格挡', damage ? '#FF9C9C' : '#9EE9FF', damage ? 'sword' : 'shield');
      this.block = 0;
      this.weaken = Math.max(0, this.weaken - 2);
      this.turn += 1;
      this.energy = 3 + (this.relic === 'battery' ? 1 : 0);
      this.hand = this.drawHand();
      this.emit('valid_interaction', {interaction_type: 'end_turn', incoming, damage, turn: this.turn});
      this.tone(damage ? 'bad' : 'good');
      if (this.heroHp <= 0) this.finish(false, `坚持 ${this.turn} 回合，抵达第 ${this.stage} 战`);
    }

    winEncounter() {
      if (this.finished || this.transition || this.enemy.hp > 0) return;
      this.score += 320 * this.stage + Math.max(0, this.heroHp * 5);
      if (this.stage >= 3) { this.finish(true, `三战全胜，剩余生命 ${Math.ceil(this.heroHp)}`); return; }
      this.transition = [
        {name: '星刃徽记', copy: '攻击额外 +2', id: 'blade', rect: {x: 26, y: 242, w: 96, h: 126, r: 18}},
        {name: '守望徽记', copy: '护盾额外 +3', id: 'ward', rect: {x: 132, y: 242, w: 96, h: 126, r: 18}},
        {name: '脉冲电池', copy: '每回合 +1 能量', id: 'battery', rect: {x: 238, y: 242, w: 96, h: 126, r: 18}}
      ];
    }

    chooseRelic(index) {
      if (this.finished || this.paused || !this.transition) return;
      const choice = this.transition[index];
      if (!choice) return;
      this.relic = choice.id;
      this.transition = null;
      this.nextStage(`获得 ${choice.name}`);
      this.enemy = {...this.encounters[this.stage - 1]};
      this.turn = 1;
      this.energy = 3 + (this.relic === 'battery' ? 1 : 0);
      this.block = 0;
      this.hand = this.drawHand();
      this.heroHp = Math.min(this.heroMaxHp, this.heroHp + 6);
      this.emit('valid_interaction', {interaction_type: 'relic_choice', relic: choice.id});
    }

    update(delta) {
      this.enemyRecoil = Math.max(0, this.enemyRecoil - delta);
      this.heroRecoil = Math.max(0, this.heroRecoil - delta);
    }

    render(context) {
      this.drawHud('星轨牌阵', `生命 ${Math.max(0, Math.ceil(this.heroHp))}/${this.heroMaxHp} · 护盾 ${this.block} · 能量 ${this.energy}`, '#C49035');
      const recoil = this.reducedMotion ? 0 : Math.sin(this.enemyRecoil * 60) * this.enemyRecoil * 20;
      const heroRecoil = this.reducedMotion ? 0 : Math.sin(this.heroRecoil * 60) * this.heroRecoil * 20;
      fillPanel(context, {x:191,y:53,w:151,h:52,r:14}, this.uiTheme.hud, this.uiTheme.rim);
      text(context, this.enemy.name, 265, 70, {size: 15, weight: 900, align: 'center'});
      context.fillStyle = '#0A0F18'; roundedRect(context, 197, 86, 136, 14, 7); context.fill();
      context.fillStyle = '#E8696A'; roundedRect(context, 197, 86, 136 * clamp(this.enemy.hp / this.enemy.maxHp, 0, 1), 14, 7); context.fill();
      text(context, `${Math.max(0, this.enemy.hp)} / ${this.enemy.maxHp}`, 265, 93, {size: 9, weight: 900, align: 'center'});
      this.drawObject(this.enemy.sprite, {x: 195 + recoil, y: 109, w: 140, h: 162});
      this.drawObject('hero', {x: 10 + heroRecoil, y: 165, w: 152, h: 166}, {flipX: true});
      if (this.block > 0) this.drawObject('shield', {x: 98, y: 241, w: 61, h: 67}, {alpha: .9});
      fillPanel(context, {x: 191, y: 282, w: 151, h: 30, r: 15}, this.uiTheme.frame);
      this.drawObject(this.weaken ? 'frost' : 'sword', {x: 200, y: 284, w: 26, h: 26});
      text(context, `下回合 ${this.currentIntent()} 伤害`, 234, 297, {size: 11, weight: 800, color: '#FFD98B'});
      if (this.relic) {
        fillPanel(context, {x: 18, y: 336, w: 216, h: 32, r: 16}, this.uiTheme.hud);
        this.drawObject(({blade: 'sword', ward: 'shield', battery: 'energy'})[this.relic], {x: 24, y: 340, w: 24, h: 24});
        text(context, ({blade: '星刃徽记', ward: '守望徽记', battery: '脉冲电池'})[this.relic], 57, 352, {size: 11, weight: 800, color: '#EAC67B'});
      }
      this.drawButton({x: 250, y: 330, w: 92, h: 38, r: 19}, '结束回合');
      this.hand.forEach((card, index) => {
        const rect = {x: 11 + index * 69, y: 394, w: 62, h: 145, r: 13};
        const available = card.cost <= this.energy;
        fillPanel(context, rect, available ? this.uiTheme.paper : '#C6C2AF', available ? '#C4994D' : '#696B70');
        fillPanel(context, {x: rect.x + 5, y: rect.y + 6, w: 22, h: 22, r: 11}, available ? '#1B9AD1' : '#7D846D');
        text(context, card.cost, rect.x + 16, rect.y + 17, {size: 11, weight: 900, align: 'center'});
        this.drawObject(card.sprite, {x: rect.x + 3, y: rect.y + 29, w: 56, h: 60}, {alpha: available ? 1 : .38});
        text(context, card.name, rect.x + 31, rect.y + 96, {size: 11, weight: 900, align: 'center', color: available ? '#34462D' : '#626451'});
        text(context, card.copy, rect.x + 31, rect.y + 113, {size: 8, weight: 700, align: 'center', color: available ? '#5D634E' : '#626451', maxWidth: 54});
        text(context, String(index + 1), rect.x + 31, rect.y + 133, {size: 8, weight: 800, align: 'center', color: available ? '#8A7751' : '#626451'});
      });
      if (this.transition) {
        context.fillStyle = 'rgba(30,39,50,.5)'; context.fillRect(0, 0, WIDTH, HEIGHT);
        text(context, '选择一枚星轨徽记', 180, 206, {size: 22, weight: 900, align: 'center'});
        this.transition.forEach((choice, index) => {
          fillPanel(context, choice.rect, ['#2B2445', '#1D3B45', '#463823'][index], '#4B535B');
          this.drawObject(['sword', 'shield', 'energy'][index], {x: choice.rect.x + 23, y: choice.rect.y + 9, w: 50, h: 52});
          text(context, choice.name, choice.rect.x + 48, choice.rect.y + 70, {size: 12, weight: 900, align: 'center'});
          text(context, choice.copy, choice.rect.x + 48, choice.rect.y + 98, {size: 9, weight: 600, align: 'center', color: '#BEC1C4', maxWidth: 84});
        });
      }
    }
  }
  StarDeckGame.gameKey = 'star-deck';

  class AdventurerJournalGame extends DeepGameBase {
    constructor(canvas, options) {
      super(canvas, options);
      this.health = 8;
      this.supplies = 7;
      this.morale = 6;
      this.step = 0;
      this.relics = [];
      this.log = '从雾岭营地出发';
      this.chapters = [
        [
          {title: '雾林分岔', choices: [{name: '沿溪谷前进', copy: '补给 -1 · 士气 +1', delta: {supplies: -1, morale: 1}, score: 70}, {name: '翻越碎石坡', copy: '生命 -2 · 节省补给', delta: {health: -2}, score: 55}]},
          {title: '受伤的信使', choices: [{name: '分享药草', copy: '补给 -2 · 获得地图', delta: {supplies: -2}, relic: '古道地图', score: 110}, {name: '留下路标', copy: '士气 +1', delta: {morale: 1}, score: 60}]},
          {title: '暴雨将至', choices: [{name: '修补猎人小屋', copy: '补给 -1 · 安全过夜', delta: {supplies: -1, health: 1}, score: 90}, {name: '继续赶路', copy: '生命 -1 · 提前抵达', delta: {health: -1}, score: 70}]}
        ],
        [
          {title: '镜湖遗迹', choices: [{name: '记录符文', copy: '获得星纹拓片', delta: {morale: 1}, relic: '星纹拓片', score: 120}, {name: '取走石匣', copy: '生命 -1 · 补给 +2', delta: {health: -1, supplies: 2}, score: 80}]},
          {title: '断桥河谷', choices: [{name: '用绳索结伴渡河', copy: '补给 -1 · 士气 +1', delta: {supplies: -1, morale: 1}, score: 100}, {name: '寻找上游浅滩', copy: '补给 -2 · 生命 +1', delta: {supplies: -2, health: 1}, score: 85}]},
          {title: '夜间兽影', choices: [{name: '点燃驱兽火', copy: '补给 -2 · 保持健康', delta: {supplies: -2}, score: 100}, {name: '静默隐蔽', copy: '士气 -1 · 节省补给', delta: {morale: -1}, score: 65}]}
        ],
        [
          {title: '星塔门锁', choices: [{name: '使用星纹拓片', copy: '有拓片则安全开启', needs: '星纹拓片', delta: {morale: 1}, score: 150}, {name: '转动古代机关', copy: '生命 -2 · 强行开启', delta: {health: -2}, score: 70}]},
          {title: '最后的补给点', choices: [{name: '休整并清点装备', copy: '补给 -2 · 生命 +2', delta: {supplies: -2, health: 2}, score: 100}, {name: '直奔观星台', copy: '士气 +1 · 承担风险', delta: {morale: 1, health: -1}, score: 95}]},
          {title: '观星仪失衡', choices: [{name: '按地图校准方位', copy: '有地图则获得真结局', needs: '古道地图', delta: {morale: 2}, score: 180}, {name: '以队伍经验校准', copy: '消耗士气完成任务', delta: {morale: -2}, score: 110}]}
        ]
      ];
      const encounterArt = ['tree', 'hero', 'house', 'crystal', 'tree', 'raider', 'key', 'tent', 'crystal'];
      const choiceArt = [['tree', 'boots'], ['potion', 'scroll'], ['house', 'boots'], ['scroll', 'treasure'], ['boots', 'sapphire'], ['fire', 'tree'], ['scroll', 'key'], ['tent', 'boots'], ['scroll', 'crystal']];
      this.chapters.flat().forEach((event, index) => {
        event.sprite = encounterArt[index];
        event.choices.forEach((choice, choiceIndex) => { choice.sprite = choiceArt[index][choiceIndex]; });
      });
    }

    currentEvent() { return this.chapters[this.stage - 1][this.step]; }

    press(point) {
      if (this.finished) return;
      if (this.paused) { this.togglePause(false); return; }
      const event = this.currentEvent();
      if (!event) return;
      const cards = [{x: 18, y: 318, w: 155, h: 176}, {x: 187, y: 318, w: 155, h: 176}];
      const index = cards.findIndex(rect => pointIn(point, rect));
      if (index >= 0) this.choose(index);
    }

    key(keyName) {
      if (this.paused || this.finished) return;
      if (keyName === '1' || keyName === 'ArrowLeft') this.choose(0);
      if (keyName === '2' || keyName === 'ArrowRight') this.choose(1);
    }

    choose(index) {
      if (this.paused || this.finished) return;
      const event = this.currentEvent();
      const choice = event && event.choices[index];
      if (!choice) return;
      if (choice.needs && !this.relics.includes(choice.needs)) {
        this.feedback(index ? 264 : 95, 338, `需要${choice.needs}`, '#FFD18F', 'key');
        this.tone('bad');
        return;
      }
      let bonus = 0;
      if (choice.needs) bonus = this.relics.includes(choice.needs) ? 80 : -35;
      Object.entries(choice.delta || {}).forEach(([key, value]) => { this[key] = clamp(this[key] + value, 0, 10); });
      this.feedback(180, 260, choice.copy, '#FFE4A0', choice.sprite);
      if (choice.relic && !this.relics.includes(choice.relic)) this.relics.push(choice.relic);
      this.score += Math.max(20, choice.score + bonus);
      this.log = `${event.title}：${choice.name}`;
      this.emit('valid_interaction', {interaction_type: 'route_choice', event: event.title, choice: choice.name});
      this.tone(bonus < 0 ? 'bad' : 'good');
      if (this.health <= 0 || this.supplies <= 0 || this.morale <= 0) {
        this.finish(false, `旅程在「${event.title}」中止`);
        return;
      }
      this.step += 1;
      if (this.step >= 3) {
        if (this.stage >= 3) {
          const trueEnding = this.relics.includes('古道地图') && this.relics.includes('星纹拓片');
          this.score += trueEnding ? 420 : 180;
          this.finish(true, trueEnding ? '完成隐藏结局：星塔守望者' : '完成结局：平安抵达观星台');
        } else {
          this.nextStage(`第 ${this.stage} 章写入日志`);
          this.step = 0;
        }
      }
    }

    render(context) {
      this.drawHud('冒险者日志', `生命 ${this.health} · 补给 ${this.supplies} · 士气 ${this.morale}`, '#A97B45');
      text(context, `记录 ${Math.min(3, this.step + 1)}/3`, 180, 63, {size: 10, weight: 800, align: 'center', shadow: true});
      const event = this.currentEvent();
      if (!event) return;
      text(context, event.title, 180, 91, {size: 20, weight: 900, align: 'center', shadow: true});
      this.drawObject(event.sprite, {x: 119, y: 111, w: 122, h: 142});
      this.drawObject('hero', {x: 33, y: 155, w: 72, h: 96}, {flipX: true});
      if (this.relics.length) {
        fillPanel(context, {x: 34, y: 270, w: 292, h: 32, r: 16}, '#8C6840');
        this.drawObject('scroll', {x: 41, y: 273, w: 26, h: 26});
        text(context, this.relics.join(' · '), 192, 286, {size: 10, weight: 800, align: 'center', color: '#F0CE8B', maxWidth: 240});
      }
      event.choices.forEach((choice, index) => {
        const rect = index === 0 ? {x: 18, y: 318, w: 155, h: 176, r: 20} : {x: 187, y: 318, w: 155, h: 176, r: 20};
        fillPanel(context, rect, index === 0 ? '#E7D9B6' : '#D1C2A2', '#8A6B48');
        const available = !choice.needs || this.relics.includes(choice.needs);
        this.drawObject(choice.sprite, {x: rect.x + 37, y: rect.y + 11, w: 80, h: 84}, {alpha: available ? 1 : .4});
        text(context, choice.name, rect.x + rect.w / 2, rect.y + 111, {size: 14, weight: 900, align: 'center', color: '#34261A', maxWidth: 135});
        text(context, choice.copy, rect.x + rect.w / 2, rect.y + 137, {size: 10, weight: 700, align: 'center', color: '#66513B', maxWidth: 135});
        if (choice.needs) text(context, available ? '物件已备齐' : `缺少：${choice.needs}`, rect.x + rect.w / 2, rect.y + 159, {size: 9, weight: 900, align: 'center', color: available ? '#3E7A48' : '#A8463F'});
      });
    }
  }
  AdventurerJournalGame.gameKey = 'adventurer-journal';

  class IdiomDetectiveGame extends DeepGameBase {
    constructor(canvas, options) {
      super(canvas, options);
      this.insight = 5;
      this.caseIndex = 0;
      this.selected = [];
      this.message = '选择两张物证，放入分析环';
      this.cases = [
        {answer: '金玉满堂', hint: '黄金美玉，堆满厅堂', pair: ['金', '玉'], clues: [['金', '金宝箱', 'treasure'], ['剑', '长剑', 'sword'], ['玉', '翡翠', 'emerald'], ['火', '火焰', 'fire'], ['杯', '水杯', 'cup'], ['树', '古树', 'tree']]},
        {answer: '星火燎原', hint: '小小星火，能烧遍原野', pair: ['星', '火'], clues: [['鱼', '游鱼', 'fish'], ['星', '星芒', 'star'], ['靴', '长靴', 'boots'], ['火', '火焰', 'fire'], ['花', '花朵', 'flower'], ['盾', '盾牌', 'shield']]},
        {answer: '披荆斩棘', hint: '挥动利刃，劈开挡路荆木', pair: ['剑', '树'], clues: [['药', '药剂', 'potion'], ['剑', '长剑', 'sword'], ['杯', '水杯', 'cup'], ['树', '荆木', 'tree'], ['晶', '蓝晶', 'sapphire'], ['钥', '钥匙', 'key']]},
        {answer: '鱼目混珠', hint: '鱼眼冒充珠宝，以假乱真', pair: ['鱼', '珠'], clues: [['星', '星芒', 'star'], ['剑', '长剑', 'sword'], ['鱼', '游鱼', 'fish'], ['珠', '珠宝', 'sapphire'], ['盾', '盾牌', 'shield'], ['树', '古树', 'tree']]},
        {answer: '铁树开花', hint: '不常开花的树，竟然绽放', pair: ['树', '花'], clues: [['屋', '小屋', 'house'], ['树', '古树', 'tree'], ['兵', '哨兵', 'sentinel'], ['靴', '长靴', 'boots'], ['花', '花朵', 'flower'], ['火', '火焰', 'fire']]},
        {answer: '杯水车薪', hint: '一杯水，救不了整车柴火', pair: ['杯', '火'], clues: [['树', '古树', 'tree'], ['车', '车辆', 'car'], ['杯', '水杯', 'cup'], ['药', '药剂', 'potion'], ['火', '火焰', 'fire'], ['果', '金果', 'golden_fruit']]}
      ];
      this.solvedEvidence = [];
      this.solvedUntil = 0;
    }

    currentCase() { return this.cases[Math.min(this.caseIndex, this.cases.length - 1)]; }

    press(point) {
      if (this.finished) return;
      if (this.paused) { this.togglePause(false); return; }
      const clues = this.currentCase().clues;
      const index = clues.findIndex((clue, clueIndex) => {
        const col = clueIndex % 3;
        const row = Math.floor(clueIndex / 3);
        return pointIn(point, {x: 18 + col * 110, y: 334 + row * 82, w: 104, h: 70});
      });
      if (index >= 0) this.selectClue(index);
    }

    key(keyName) {
      if (this.paused || this.finished) return;
      const index = Number(keyName) - 1;
      if (index >= 0 && index < 6) this.selectClue(index);
    }

    selectClue(index) {
      if (this.paused || this.finished) return;
      const clue = this.currentCase().clues[index];
      if (!clue) return;
      this.solvedEvidence = [];
      if (this.selected.includes(index)) {
        this.selected = this.selected.filter(item => item !== index);
        return;
      }
      this.selected.push(index);
      this.emit('valid_interaction', {interaction_type: 'evidence_select', evidence: clue[1]});
      this.tone('tap');
      if (this.selected.length < 2) { this.message = `已放入「${clue[1]}」，再选一张`; return; }
      const selectedSymbols = this.selected.map(item => this.currentCase().clues[item][0]);
      const correct = this.currentCase().pair.every(symbol => selectedSymbols.includes(symbol));
      if (correct) {
        this.solvedEvidence = this.selected.map(item => this.currentCase().clues[item]);
        this.solvedUntil = this.elapsed + 1.1;
        this.score += 180 + this.insight * 15;
        this.message = `推理成立：${this.currentCase().answer}`;
        this.feedback(180, 270, this.currentCase().answer, '#B3FFD3', 'star');
        this.tone('good');
        this.caseIndex += 1;
        this.selected = [];
        if (this.caseIndex >= this.cases.length) { this.finish(true, `六案结清，剩余洞察 ${this.insight}`); return; }
        if (this.caseIndex % 2 === 0) this.nextStage(`还原 ${this.caseIndex} 个成语`);
      } else {
        this.insight -= 1;
        this.feedback(180, 266, '洞察 −1', '#FFB0A1');
        this.message = '物证无法互相印证，重新组合';
        this.selected = [];
        this.tone('bad');
        if (this.insight <= 0) this.finish(false, `完成 ${this.caseIndex} / 6 个案件`);
      }
    }

    render(context) {
      this.drawHud('成语侦探', `案件 ${Math.min(6, this.caseIndex + 1)}/6 · 洞察 ${this.insight} · 得分 ${this.score}`, '#A43B32');
      text(context, this.currentCase().hint, 180, 100, {size: 14, weight: 900, align: 'center', maxWidth: 316, shadow: true});
      text(context, '选择两件物证', 180, 128, {size: 10, weight: 700, align: 'center', shadow: true});
      context.beginPath(); context.arc(180, 233, 74, 0, TAU); context.fillStyle = '#4D7856'; context.fill(); context.strokeStyle = '#BD7547'; context.lineWidth = 2; context.stroke();
      [0, 1].forEach(slot => {
        const x = slot === 0 ? 145 : 215;
        context.beginPath(); context.arc(x, 224, 27, 0, TAU); context.fillStyle = '#E8DBBE'; context.fill();
        const selectedIndex = this.selected[slot];
        const clue = selectedIndex == null ? (this.elapsed < this.solvedUntil ? this.solvedEvidence[slot] : null) : this.currentCase().clues[selectedIndex];
        if (clue) this.drawObject(clue[2], {x: x - 28, y: 195, w: 56, h: 58});
        else text(context, '+', x, 224, {size: 24, weight: 900, align: 'center', color: '#8C7E67'});
      });
      text(context, this.message, 180, 289, {size: 12, weight: 800, align: 'center', maxWidth: 300});
      this.currentCase().clues.forEach((clue, index) => {
        const col = index % 3;
        const row = Math.floor(index / 3);
        const rect = {x: 18 + col * 110, y: 334 + row * 82, w: 104, h: 70, r: 14};
        const active = this.selected.includes(index);
        fillPanel(context, rect, active ? '#F3C77C' : '#E8DCC2', active ? '#FFF2CC' : '#805F42');
        this.drawObject(clue[2], {x: rect.x + 29, y: rect.y + 3, w: 46, h: 45});
        text(context, clue[1], rect.x + 52, rect.y + 57, {size: 10, weight: 900, align: 'center', color: '#392719'});
      });
    }
  }
  IdiomDetectiveGame.gameKey = 'idiom-detective';

  class HexFrontierGame extends DeepGameBase {
    constructor(canvas, options) {
      super(canvas, options);
      this.rows = 6;
      this.cols = 5;
      this.ap = 3;
      this.turn = 1;
      this.selected = null;
      this.message = '选择蓝色小队，再点相邻六角格移动';
      this.setupStage();
    }

    setupStage() {
      this.units = [
        {id: 'scout', side: 'player', type: '侦察', sprite: 'hero', r: 5, c: 1, hp: 5, maxHp: 5, attack: 2},
        {id: 'guard', side: 'player', type: '守卫', sprite: 'guardian', r: 5, c: 2, hp: 8, maxHp: 8, attack: 3},
        {id: 'engineer', side: 'player', type: '工兵', sprite: 'cannon', r: 5, c: 3, hp: 6, maxHp: 6, attack: 2}
      ];
      const enemyCount = this.stage + 1;
      for (let index = 0; index < enemyCount; index += 1) this.units.push({id: `enemy-${this.stage}-${index}`, side: 'enemy', type: '敌军', sprite: index % 2 ? 'sentinel' : 'raider', r: index % 2, c: clamp(1 + index, 0, 4), hp: 2 + this.stage, maxHp: 2 + this.stage});
      this.objectives = this.stage === 1 ? [{r: 1, c: 2, captured: false}] : this.stage === 2 ? [{r: 1, c: 0, captured: false}, {r: 1, c: 4, captured: false}] : [{r: 0, c: 2, captured: false}, {r: 2, c: 0, captured: false}, {r: 2, c: 4, captured: false}];
      this.ap = 3;
      this.turn = 1;
      this.selected = null;
    }

    center(r, c) {
      const size = 30;
      return {x: 60 + c * 60 + (r % 2 ? 30 : 0), y: 126 + r * 48, size};
    }

    hexAt(point) {
      let best = null;
      let bestDistance = Infinity;
      for (let r = 0; r < this.rows; r += 1) for (let c = 0; c < this.cols; c += 1) {
        const center = this.center(r, c);
        const dist = Math.hypot(point.x - center.x, point.y - center.y);
        if (dist < center.size && dist < bestDistance) { best = {r, c}; bestDistance = dist; }
      }
      return best;
    }

    neighbors(cell) {
      const offsets = cell.r % 2 ? [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, 0], [1, 1]] : [[-1, -1], [-1, 0], [0, -1], [0, 1], [1, -1], [1, 0]];
      return offsets.map(([dr, dc]) => ({r: cell.r + dr, c: cell.c + dc})).filter(item => item.r >= 0 && item.r < this.rows && item.c >= 0 && item.c < this.cols);
    }

    terrainCost(cell) { return (cell.r === 3 && [1, 2, 3].includes(cell.c)) ? 2 : 1; }

    press(point) {
      if (this.finished) return;
      if (this.paused) { this.togglePause(false); return; }
      if (pointIn(point, {x: 239, y: 462, w: 104, h: 42})) { this.endTurn(); return; }
      const cell = this.hexAt(point);
      if (!cell) return;
      const unit = this.units.find(item => item.r === cell.r && item.c === cell.c);
      if (unit && unit.side === 'player') {
        this.selected = unit.id;
        this.message = `已选择${unit.type}，行动力 ${this.ap}`;
        this.tone('tap');
        return;
      }
      const selected = this.units.find(item => item.id === this.selected);
      if (!selected || this.ap <= 0 || !this.neighbors(selected).some(item => item.r === cell.r && item.c === cell.c)) return;
      const cost = unit && unit.side === 'enemy' ? 1 : this.terrainCost(cell);
      if (cost > this.ap) { this.message = '沼泽需要 2 点行动力'; this.tone('bad'); return; }
      if (unit && unit.side === 'enemy') {
        const damage = selected.attack || (selected.type === '守卫' ? 3 : 2);
        unit.hp -= damage;
        this.ap -= 1;
        const targetCenter = this.center(unit.r, unit.c);
        this.feedback(targetCenter.x, targetCenter.y - 17, `−${damage}`, '#FFCB9D', 'sword');
        this.score += 45;
        if (unit.hp <= 0) this.units = this.units.filter(item => item.id !== unit.id);
        this.message = `${selected.type}攻击敌军`;
      } else {
        selected.r = cell.r;
        selected.c = cell.c;
        this.ap -= cost;
        this.message = `${selected.type}移动，剩余行动力 ${this.ap}`;
        this.capture(selected);
      }
      this.emit('valid_interaction', {interaction_type: 'hex_action', unit: selected.type, row: cell.r, column: cell.c, action_points: this.ap});
      this.tone('good');
    }

    capture(unit) {
      const objective = this.objectives.find(item => item.r === unit.r && item.c === unit.c && !item.captured);
      if (!objective) return;
      objective.captured = true;
      const marker = this.center(unit.r, unit.c);
      this.feedback(marker.x, marker.y - 15, '占领', '#9EDFFF', 'star');
      this.score += 220 + this.ap * 20;
      this.message = `${unit.type}控制了一座前哨`;
      if (this.objectives.every(item => item.captured)) {
        if (this.stage >= 3) this.finish(true, `第 ${this.turn} 回合控制全部战略节点`);
        else {
          this.nextStage(`控制 ${this.objectives.length} 座前哨`);
          this.setupStage();
        }
      }
    }

    endTurn() {
      if (this.finished || this.paused) return;
      this.units.filter(unit => unit.side === 'enemy').forEach(enemy => {
        const target = this.units.filter(unit => unit.side === 'player' && unit.hp > 0).sort((a, b) => Math.hypot(a.r - enemy.r, a.c - enemy.c) - Math.hypot(b.r - enemy.r, b.c - enemy.c))[0];
        if (!target) return;
        const adjacent = this.neighbors(enemy).some(cell => cell.r === target.r && cell.c === target.c);
        if (adjacent) {
          target.hp -= 1;
          const targetCenter = this.center(target.r, target.c);
          this.feedback(targetCenter.x, targetCenter.y - 15, '−1', '#FFADAD');
        }
        else {
          const choices = this.neighbors(enemy).filter(cell => !this.units.some(unit => unit.r === cell.r && unit.c === cell.c));
          choices.sort((a, b) => Math.hypot(a.r - target.r, a.c - target.c) - Math.hypot(b.r - target.r, b.c - target.c));
          if (choices[0]) { enemy.r = choices[0].r; enemy.c = choices[0].c; }
        }
      });
      this.units = this.units.filter(unit => unit.hp > 0);
      if (!this.units.some(unit => unit.side === 'player')) { this.finish(false, `前线在第 ${this.turn} 回合失守`); return; }
      this.turn += 1;
      this.ap = 3;
      this.selected = null;
      this.message = `敌军行动结束 · 第 ${this.turn} 回合`;
      this.emit('valid_interaction', {interaction_type: 'end_turn', turn: this.turn});
      this.tone('bad');
      if (this.turn > 12) this.finish(false, '未能在十二回合内完成控制');
    }

    key(keyName) { if (keyName === 'Enter') this.endTurn(); }

    drawHex(context, center, fill, stroke) {
      context.beginPath();
      for (let index = 0; index < 6; index += 1) {
        const angle = Math.PI / 3 * index;
        const x = center.x + center.size * Math.cos(angle);
        const y = center.y + center.size * Math.sin(angle);
        if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
      }
      context.closePath(); context.fillStyle = fill; context.fill(); context.strokeStyle = stroke; context.lineWidth = 1.4; context.stroke();
    }

    render(context) {
      this.drawHud('六角前线', `行动力 ${this.ap}/3 · 回合 ${this.turn}/12 · 前哨 ${this.objectives.filter(item => item.captured).length}/${this.objectives.length}`, '#1F80C8');
      for (let r = 0; r < this.rows; r += 1) for (let c = 0; c < this.cols; c += 1) {
        const center = this.center(r, c);
        const swamp = this.terrainCost({r, c}) === 2;
        const objective = this.objectives.find(item => item.r === r && item.c === c);
        const selectedUnit = this.units.find(unit => unit.id === this.selected);
        const reachable = selectedUnit && this.neighbors(selectedUnit).some(cell => cell.r === r && cell.c === c);
        this.drawHex(context, center, objective ? (objective.captured ? '#2B8FC8' : '#D49C32') : swamp ? '#598356' : reachable ? '#88C6AD' : '#8BB361', objective ? '#FFF1B8' : '#C1D597');
        if (objective) {
          this.drawObject('turret', {x: center.x - 20, y: center.y - 26, w: 40, h: 45}, {alpha: objective.captured ? .95 : .65});
          if (objective.captured) text(context, '✓', center.x + 18, center.y - 20, {size: 12, weight: 900, align: 'center', color: '#BCEFFF', shadow: true});
        } else if (swamp) this.drawObject('tree', {x: center.x - 13, y: center.y - 16, w: 26, h: 30}, {alpha: .36});
      }
      this.units.forEach(unit => {
        const center = this.center(unit.r, unit.c);
        context.beginPath(); context.arc(center.x, center.y + 8, 19, 0, TAU);
        context.strokeStyle = unit.id === this.selected ? '#FFFFFF' : unit.side === 'player' ? '#66C6FF' : '#FF756F'; context.lineWidth = unit.id === this.selected ? 3 : 2; context.stroke();
        this.drawObject(unit.sprite || (unit.side === 'player' ? 'hero' : 'raider'), {x: center.x - 22, y: center.y - 30, w: 44, h: 49}, {flipX: unit.side === 'player'});
        context.fillStyle = '#17212B'; context.fillRect(center.x - 17, center.y + 21, 34, 5);
        context.fillStyle = unit.side === 'player' ? '#7DD4FF' : '#FF8981'; context.fillRect(center.x - 17, center.y + 21, 34 * clamp(unit.hp / (unit.maxHp || unit.hp), 0, 1), 5);
        text(context, unit.hp, center.x, center.y + 23, {size: 7, weight: 900, align: 'center'});
      });
      fillPanel(context, {x: 17, y: 431, w: 208, h: 74, r: 16}, '#47734E', '#B6CD91');
      text(context, this.message, 31, 454, {size: 11, weight: 800, maxWidth: 180});
      text(context, '深色沼泽消耗 2 AP · 占领金色节点', 31, 483, {size: 9, weight: 600, color: '#B3B6BA', maxWidth: 184});
      this.drawButton({x: 239, y: 462, w: 104, h: 42, r: 21}, '结束回合');
    }
  }
  HexFrontierGame.gameKey = 'hex-frontier';

  class GardenRenewalGame extends DeepGameBase {
    constructor(canvas, options) {
      super(canvas, options);
      this.types = ['花朵', '蓝晶', '甜橙', '绿晶', '紫晶'];
      this.tileSprites = ['flower', 'sapphire', 'orange', 'emerald', 'amethyst'];
      this.colors = ['#E7859A', '#65B6C8', '#E6B84F', '#8DBD61', '#A888CB'];
      this.targets = [0, 1, 3];
      this.goals = [10, 12, 14];
      this.movesByStage = [20, 22, 24];
      this.collected = 0;
      this.movesLeft = this.movesByStage[0];
      this.selected = null;
      this.message = '交换相邻花砖，组成三个或更多相同图案';
      this.board = this.createBoard();
    }

    createBoard() {
      const target = this.targets[this.stage - 1];
      for (let attempt = 0; attempt < 60; attempt += 1) {
        const board = Array.from({length: 7}, () => Array.from({length: 7}, () => Math.floor(Math.random() * this.types.length)));
        for (let r = 0; r < 7; r += 1) for (let c = 0; c < 7; c += 1) {
          while ((c >= 2 && board[r][c] === board[r][c - 1] && board[r][c] === board[r][c - 2]) || (r >= 2 && board[r][c] === board[r - 1][c] && board[r][c] === board[r - 2][c])) board[r][c] = (board[r][c] + 1) % this.types.length;
        }
        board[0][0] = target;
        board[0][1] = (target + 1) % this.types.length;
        board[0][2] = target;
        board[1][1] = target;
        if (!this.findMatches(board).length) return board;
      }
      const board = Array.from({length: 7}, (_, r) => Array.from({length: 7}, (_, c) => (r * 2 + c) % this.types.length));
      board[0][0] = target;
      board[0][1] = (target + 1) % this.types.length;
      board[0][2] = target;
      board[1][1] = target;
      return board;
    }

    press(point) {
      if (this.finished) return;
      if (this.paused) { this.togglePause(false); return; }
      const col = Math.floor((point.x - 23) / 45);
      const row = Math.floor((point.y - 194) / 45);
      if (row < 0 || row >= 7 || col < 0 || col >= 7) return;
      if ((point.x - 23) % 45 > 40 || (point.y - 194) % 45 > 40) return;
      if (!this.selected) {
        this.selected = {r: row, c: col};
        this.message = '再点一块相邻花砖完成交换';
        this.tone('tap');
        return;
      }
      const adjacent = Math.abs(this.selected.r - row) + Math.abs(this.selected.c - col) === 1;
      if (!adjacent) { this.selected = {r: row, c: col}; return; }
      this.swap(this.selected, {r: row, c: col});
      this.selected = null;
    }

    key(keyName) {
      if (this.paused || this.finished) return;
      if (!this.selected) this.selected = {r: 3, c: 3};
      const delta = keyName === 'ArrowLeft' ? [0, -1] : keyName === 'ArrowRight' ? [0, 1] : keyName === 'ArrowUp' ? [-1, 0] : keyName === 'ArrowDown' ? [1, 0] : null;
      if (!delta) return;
      const next = {r: clamp(this.selected.r + delta[0], 0, 6), c: clamp(this.selected.c + delta[1], 0, 6)};
      if (next.r !== this.selected.r || next.c !== this.selected.c) this.swap(this.selected, next);
      this.selected = null;
    }

    swap(a, b) {
      if (this.paused || this.finished || !a || !b || ![a, b].every(cell => Number.isInteger(cell.r) && Number.isInteger(cell.c) && cell.r >= 0 && cell.r < 7 && cell.c >= 0 && cell.c < 7) || Math.abs(a.r - b.r) + Math.abs(a.c - b.c) !== 1) return false;
      [this.board[a.r][a.c], this.board[b.r][b.c]] = [this.board[b.r][b.c], this.board[a.r][a.c]];
      let matches = this.findMatches();
      if (!matches.length) {
        [this.board[a.r][a.c], this.board[b.r][b.c]] = [this.board[b.r][b.c], this.board[a.r][a.c]];
        this.message = '没有形成组合，花砖已复位';
        this.feedback(43 + b.c * 45, 211 + b.r * 45, '×', '#FFADA1');
        this.tone('bad');
        return false;
      }
      this.movesLeft -= 1;
      let cascade = 0;
      while (matches.length && cascade < 20) {
        const unique = new Map(matches.map(cell => [`${cell.r}-${cell.c}`, cell]));
        unique.forEach(cell => {
          const value = this.board[cell.r][cell.c];
          if (cascade === 0) this.feedback(43 + cell.c * 45, 213 + cell.r * 45, '', '#FFF3B0', this.tileSprites[value]);
          if (value === this.targets[this.stage - 1]) this.collected += 1;
          this.score += 18 + cascade * 7;
          this.board[cell.r][cell.c] = null;
        });
        for (let c = 0; c < 7; c += 1) {
          const values = [];
          for (let r = 6; r >= 0; r -= 1) if (this.board[r][c] != null) values.push(this.board[r][c]);
          for (let r = 6, index = 0; r >= 0; r -= 1, index += 1) this.board[r][c] = index < values.length ? values[index] : Math.floor(Math.random() * this.types.length);
        }
        cascade += 1;
        matches = this.findMatches();
      }
      this.emit('valid_interaction', {interaction_type: 'match_swap', cascade, moves_left: this.movesLeft, collected: this.collected});
      this.message = cascade > 1 ? `${cascade} 连锁！庭院修复推进` : '匹配成功，收集目标花砖';
      if (cascade > 1) this.feedback(180, 167, `${cascade} 连锁`, '#FFF4A0', 'star');
      this.tone('good');
      if (this.collected >= this.goals[this.stage - 1]) {
        this.score += this.movesLeft * 25;
        if (this.stage >= 3) this.finish(true, `三处庭院区域全部焕新，剩余 ${this.movesLeft} 步`);
        else {
          this.nextStage(`收集 ${this.collected} 个目标花砖`);
          this.collected = 0;
          this.movesLeft = this.movesByStage[this.stage - 1];
          this.board = this.createBoard();
          this.message = this.stage === 2 ? '喷泉区解锁：收集蓝晶' : '凉亭区解锁：收集绿晶';
        }
      } else if (this.movesLeft <= 0) this.finish(false, `还差 ${this.goals[this.stage - 1] - this.collected} 个目标花砖`);
      if (!this.finished && (this.findMatches().length || !this.findValidMoves().length)) {
        this.board = this.createBoard();
        this.message = '花砖已重新排列，继续收集';
        this.emit('board_reshuffled', {moves_left: this.movesLeft});
      }
      return true;
    }

    findValidMoves(board = this.board) {
      const result = [];
      for (let r = 0; r < 7; r += 1) for (let c = 0; c < 7; c += 1) {
        for (const [dr, dc] of [[0, 1], [1, 0]]) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 7 || nc >= 7 || board[r][c] === board[nr][nc]) continue;
          [board[r][c], board[nr][nc]] = [board[nr][nc], board[r][c]];
          const matches = this.findMatches(board);
          if (matches.length) result.push({a: {r, c}, b: {r: nr, c: nc}, matches: new Set(matches.map(cell => `${cell.r}-${cell.c}`)).size, targets: matches.filter(cell => board[cell.r][cell.c] === this.targets[this.stage - 1]).length});
          [board[r][c], board[nr][nc]] = [board[nr][nc], board[r][c]];
        }
      }
      return result;
    }

    findMatches(board = this.board) {
      const matches = [];
      for (let r = 0; r < 7; r += 1) {
        let start = 0;
        for (let c = 1; c <= 7; c += 1) {
          if (c < 7 && board[r][c] === board[r][start]) continue;
          if (c - start >= 3) for (let index = start; index < c; index += 1) matches.push({r, c: index});
          start = c;
        }
      }
      for (let c = 0; c < 7; c += 1) {
        let start = 0;
        for (let r = 1; r <= 7; r += 1) {
          if (r < 7 && board[r][c] === board[start][c]) continue;
          if (r - start >= 3) for (let index = start; index < r; index += 1) matches.push({r: index, c});
          start = r;
        }
      }
      return matches;
    }

    render(context) {
      this.drawHud('花园焕新', `步数 ${this.movesLeft} · 目标 ${this.types[this.targets[this.stage - 1]]} ${this.collected}/${this.goals[this.stage - 1]}`, '#4E9D67');
      this.drawObject(['flower', 'crystal', 'house'][this.stage - 1], {x: 133, y: 55, w: 94, h: 82});
      text(context, this.message, 180, 146, {size: 11, weight: 700, align: 'center', maxWidth: 304, shadow: true});
      fillPanel(context, {x: 17, y: 184, w: 326, h: 326, r: 18}, '#D8C29A', '#B99C72');
      for (let r = 0; r < 7; r += 1) for (let c = 0; c < 7; c += 1) {
        const value = this.board[r][c];
        const x = 23 + c * 45;
        const y = 194 + r * 45;
        const active = this.selected && this.selected.r === r && this.selected.c === c;
        fillPanel(context, {x, y, w: 40, h: 40, r: 10}, active ? '#FFF5C9' : '#E9E3CE', active ? '#FFFFFF' : '#D3BD97');
        this.drawObject(this.tileSprites[value], {x: x + 2, y: y + 2, w: 36, h: 36});
      }
    }
  }
  GardenRenewalGame.gameKey = 'garden-renewal';

  const registry = {
    'star-mower': StarMowerGame,
    'star-deck': StarDeckGame,
    'adventurer-journal': AdventurerJournalGame,
    'idiom-detective': IdiomDetectiveGame,
    'hex-frontier': HexFrontierGame,
    'garden-renewal': GardenRenewalGame
  };

  const metadata = {
    'star-mower': {title: '星尘割草', mechanic: 'real-time survival', stages: 3, targetDurationSeconds: 165},
    'star-deck': {title: '星轨牌阵', mechanic: 'turn-based deck tactics', stages: 3, targetDurationSeconds: 240},
    'adventurer-journal': {title: '冒险者日志', mechanic: 'branching resource RPG', stages: 3, targetDurationSeconds: 210},
    'idiom-detective': {title: '成语侦探', mechanic: 'evidence combination puzzle', stages: 3, targetDurationSeconds: 180},
    'hex-frontier': {title: '六角前线', mechanic: 'turn-based hex strategy', stages: 3, targetDurationSeconds: 300},
    'garden-renewal': {title: '花园焕新', mechanic: 'match-3 renovation', stages: 3, targetDurationSeconds: 240}
  };

  root.AirvanaDeepGames = Object.freeze({
    version: '3.2.0',
    width: WIDTH,
    height: HEIGHT,
    list: () => Object.keys(registry).map(key => ({
      key,
      ...metadata[key],
      playableId: `plb_${key.replace(/-/g, '_')}`,
      art: 'classic-v1',
      artSystem: 'classic-v1',
      assetPack: 'classic-v1',
      gameplayAssetPack: 'classic-v1',
      gameplayStates: ['intro', 'playing', 'paused', 'success', 'failure', 'retry']
    })),
    uiTheme,
    has: key => !!registry[key],
    mount(canvas, key, options) {
      const Game = registry[key];
      if (!Game) throw new Error(`Unknown Airvana deep game: ${key}`);
      return new Game(canvas, options || {});
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
