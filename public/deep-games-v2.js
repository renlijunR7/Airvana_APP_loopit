(function (root) {
  'use strict';

  const WIDTH = 360;
  const HEIGHT = 560;
  const TAU = Math.PI * 2;
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
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function fillPanel(context, rect, fill, stroke) {
    roundedRect(context, rect.x, rect.y, rect.w, rect.h, rect.r || 14);
    context.fillStyle = fill;
    context.fill();
    if (stroke) {
      context.strokeStyle = stroke;
      context.lineWidth = 1;
      context.stroke();
    }
  }

  function text(context, value, x, y, options) {
    const settings = options || {};
    context.save();
    context.fillStyle = settings.color || '#FFFFFF';
    context.font = `${settings.weight || 600} ${settings.size || 14}px ${settings.family || 'system-ui, -apple-system, sans-serif'}`;
    context.textAlign = settings.align || 'left';
    context.textBaseline = settings.baseline || 'middle';
    if (settings.shadow) {
      context.shadowColor = 'rgba(0,0,0,.7)';
      context.shadowBlur = 8;
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
      this.artProfile = root.AirvanaGameArtV1 && root.AirvanaGameArtV1.get ? root.AirvanaGameArtV1.get(this.gameKey) : null;
      this.stage = 1;
      this.score = 0;
      this.finished = false;
      this.paused = false;
      this.muted = !!this.options.muted;
      this.lastTime = 0;
      this.elapsed = 0;
      this.raf = 0;
      this.pointer = {x: WIDTH / 2, y: HEIGHT / 2, down: false};
      this.background = null;
      this.emblemAtlas = null;
      this.materialAtlas = null;
      this.spriteAtlas = null;
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
      this.loadBackground(this.artProfile ? this.artProfile.background : this.options.asset);
      if (this.artProfile) {
        this.loadArtAsset('emblemAtlas', this.artProfile.emblem.src);
        this.loadArtAsset('materialAtlas', this.artProfile.material.src);
        this.loadArtAsset('spriteAtlas', this.artProfile.sprite && this.artProfile.sprite.src);
      }
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
      image.src = source;
    }

    loadArtAsset(key, source) {
      if (!source || typeof root.Image !== 'function') return;
      const image = new root.Image();
      image.decoding = 'async';
      image.onload = () => { this[key] = image; };
      image.onerror = () => { this[key] = null; };
      image.src = source;
      this[key] = image;
    }

    imageReady(image) {
      return !!(image && image.complete && image.naturalWidth > 0);
    }

    drawAtlasTile(image, spec, rect, alpha) {
      if (!this.imageReady(image) || !spec) return false;
      const columns = spec.columns || 1;
      const rows = spec.rows || 1;
      const index = clamp(spec.index || 0, 0, columns * rows - 1);
      const sw = image.naturalWidth / columns;
      const sh = image.naturalHeight / rows;
      const sx = (index % columns) * sw;
      const sy = Math.floor(index / columns) * sh;
      this.context.save();
      this.context.globalAlpha = alpha == null ? 1 : alpha;
      this.context.drawImage(image, sx, sy, sw, sh, rect.x, rect.y, rect.w, rect.h);
      this.context.restore();
      return true;
    }

    drawImmersiveSprite(index, rect, options) {
      const image = this.spriteAtlas;
      const spec = this.artProfile && this.artProfile.sprite;
      if (!this.imageReady(image) || !spec) return false;
      const settings = options || {};
      const columns = spec.columns || 3;
      const rows = spec.rows || 2;
      const safeIndex = clamp(index || 0, 0, columns * rows - 1);
      const sw = image.naturalWidth / columns;
      const sh = image.naturalHeight / rows;
      const sx = (safeIndex % columns) * sw;
      const sy = Math.floor(safeIndex / columns) * sh;
      this.context.save();
      this.context.globalAlpha = settings.alpha == null ? 1 : settings.alpha;
      this.context.globalCompositeOperation = settings.blendMode || spec.blendMode || 'screen';
      this.context.shadowColor = 'rgba(0,0,0,.74)';
      this.context.shadowBlur = settings.shadowBlur == null ? 10 : settings.shadowBlur;
      this.context.shadowOffsetY = 5;
      this.context.drawImage(image, sx, sy, sw, sh, rect.x, rect.y, rect.w, rect.h);
      this.context.restore();
      return true;
    }

    drawImmersiveAccent() {
      if (!this.artProfile || !this.imageReady(this.spriteAtlas)) return;
      const family = this.artProfile.familyKey;
      const bob = this.reducedMotion ? 0 : Math.sin(this.elapsed * 3) * 2;
      if (family === 'space') {
        const player = this.player || {x: 180, y: 390};
        this.drawImmersiveSprite(0, {x: player.x - 38, y: player.y - 38, w: 76, h: 74}, {alpha: .96});
        (this.enemies || []).slice(0, 8).forEach((enemy, index) => {
          this.drawImmersiveSprite(index % 2 ? 2 : 1, {x: enemy.x - 24, y: enemy.y - 24, w: 48, h: 46}, {alpha: .9});
        });
        return;
      }
      if (family === 'strategy') {
        this.drawImmersiveSprite(0, {x: 24, y: 338 + bob, w: 96, h: 112}, {alpha: .82});
        this.drawImmersiveSprite(2, {x: 246, y: 335 - bob, w: 88, h: 96}, {alpha: .82});
        this.drawImmersiveSprite(4, {x: 132, y: 376, w: 96, h: 100}, {alpha: .46});
        return;
      }
      if (family === 'story') {
        this.drawImmersiveSprite(0, {x: 18, y: 366 + bob, w: 104, h: 116}, {alpha: .84});
        this.drawImmersiveSprite(2, {x: 244, y: 118, w: 88, h: 94}, {alpha: .76});
        this.drawImmersiveSprite(5, {x: 220, y: 374, w: 108, h: 96}, {alpha: .32});
        return;
      }
      if (family === 'nature') {
        this.drawImmersiveSprite(0, {x: 16, y: 344 + bob, w: 112, h: 132}, {alpha: .82});
        this.drawImmersiveSprite(1, {x: 232, y: 364 - bob, w: 106, h: 96}, {alpha: .82});
        this.drawImmersiveSprite(5, {x: 123, y: 250, w: 116, h: 108}, {alpha: .28});
      }
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
      if (this.canvas.setPointerCapture && event.pointerId != null) {
        try { this.canvas.setPointerCapture(event.pointerId); } catch (error) {}
      }
      this.press(this.pointer);
    }

    onPointerMove(event) {
      if (!this.pointer.down) return;
      this.pointer = {...this.coordinates(event), down: true};
      this.move(this.pointer);
    }

    onPointerUp(event) {
      this.pointer = {...this.coordinates(event), down: false};
      this.release(this.pointer);
    }

    onKeyDown(event) {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        this.press(this.pointer);
      }
      if (event.key === 'Escape' || event.key.toLowerCase() === 'p') this.togglePause();
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
        const gradient = context.createLinearGradient(0, 0, 0, HEIGHT);
        gradient.addColorStop(0, '#20283B');
        gradient.addColorStop(1, '#081018');
        context.fillStyle = gradient;
        context.fillRect(0, 0, WIDTH, HEIGHT);
      }
      context.fillStyle = `rgba(5,8,13,${overlay == null ? 0.25 : overlay})`;
      context.fillRect(0, 0, WIDTH, HEIGHT);
      this.drawAtlasTile(this.materialAtlas, this.artProfile && this.artProfile.material, {x: 0, y: 0, w: WIDTH, h: HEIGHT}, .08);
    }

    drawHud(title, subtitle, accent) {
      fillPanel(this.context, {x: 12, y: 10, w: 336, h: 52, r: 16}, 'rgba(7,10,16,.78)', 'rgba(255,255,255,.16)');
      const emblemDrawn = this.drawAtlasTile(this.emblemAtlas, this.artProfile && this.artProfile.emblem, {x: 20, y: 18, w: 34, h: 34}, 1);
      const copyX = emblemDrawn ? 64 : 26;
      text(this.context, title, copyX, 29, {size: 15, weight: 800});
      text(this.context, subtitle, copyX, 48, {size: 10, weight: 600, color: 'rgba(255,255,255,.72)', maxWidth: emblemDrawn ? 205 : undefined});
      fillPanel(this.context, {x: 281, y: 21, w: 54, h: 30, r: 15}, accent || '#FF4658');
      text(this.context, `S${this.stage}/3`, 308, 36, {size: 12, weight: 900, align: 'center'});
    }

    drawButton(rect, label, active) {
      fillPanel(this.context, rect, active === false ? 'rgba(255,255,255,.10)' : '#FFFFFF', 'rgba(255,255,255,.25)');
      text(this.context, label, rect.x + rect.w / 2, rect.y + rect.h / 2, {size: 13, weight: 800, align: 'center', color: active === false ? 'rgba(255,255,255,.45)' : '#111318'});
    }

    drawPause() {
      if (!this.paused) return;
      this.context.fillStyle = 'rgba(4,6,10,.76)';
      this.context.fillRect(0, 0, WIDTH, HEIGHT);
      fillPanel(this.context, {x: 54, y: 205, w: 252, h: 142, r: 24}, 'rgba(20,23,31,.96)', 'rgba(255,255,255,.22)');
      text(this.context, '已暂停', 180, 249, {size: 24, weight: 900, align: 'center'});
      text(this.context, '点击下方继续按钮或按 P 恢复', 180, 282, {size: 12, weight: 600, align: 'center', color: 'rgba(255,255,255,.72)'});
      this.drawButton({x: 96, y: 303, w: 168, h: 36, r: 18}, '继续游戏');
    }

    draw() {
      this.drawBackdrop();
      this.render(this.context);
      this.drawImmersiveAccent();
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
      return {game: this.constructor.gameKey, stage: this.stage, score: this.score, paused: this.paused, finished: this.finished};
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
    }

    spawnEnemy() {
      const side = Math.floor(Math.random() * 4);
      const point = side === 0 ? {x: Math.random() * WIDTH, y: 70} : side === 1 ? {x: WIDTH - 5, y: 80 + Math.random() * 400} : side === 2 ? {x: Math.random() * WIDTH, y: HEIGHT - 5} : {x: 5, y: 80 + Math.random() * 400};
      const boss = this.stage === 3 && !this.enemies.some(enemy => enemy.boss) && this.stageTime > 24;
      this.enemies.push({...point, hp: boss ? 80 : 5 + this.stage * 2, maxHp: boss ? 80 : 5 + this.stage * 2, speed: boss ? 20 : 22 + this.stage * 5, radius: boss ? 24 : 8 + Math.random() * 4, boss});
    }

    press(point) {
      if (this.paused) { this.togglePause(false); return; }
      if (this.upgradeChoices) {
        const index = this.upgradeChoices.findIndex(choice => pointIn(point, choice.rect));
        if (index >= 0) this.applyUpgrade(index);
        return;
      }
      this.player.targetX = point.x;
      this.player.targetY = clamp(point.y, 78, 536);
      this.emit('valid_interaction', {interaction_type: 'move_target'});
      this.tone('tap');
    }

    move(point) {
      if (!this.upgradeChoices) {
        this.player.targetX = point.x;
        this.player.targetY = clamp(point.y, 78, 536);
      }
    }

    key(keyName) {
      const step = 34;
      if (keyName === 'ArrowLeft') this.player.targetX -= step;
      if (keyName === 'ArrowRight') this.player.targetX += step;
      if (keyName === 'ArrowUp') this.player.targetY -= step;
      if (keyName === 'ArrowDown') this.player.targetY += step;
      this.player.targetX = clamp(this.player.targetX, 14, WIDTH - 14);
      this.player.targetY = clamp(this.player.targetY, 78, HEIGHT - 14);
    }

    applyUpgrade(index) {
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
      if (this.upgradeChoices) return;
      this.stageTime += delta;
      const dx = this.player.targetX - this.player.x;
      const dy = this.player.targetY - this.player.y;
      const length = Math.hypot(dx, dy);
      if (length > 2) {
        this.player.x += dx / length * this.speed * delta;
        this.player.y += dy / length * this.speed * delta;
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
        const vx = this.player.x - enemy.x;
        const vy = this.player.y - enemy.y;
        const dist = Math.max(1, Math.hypot(vx, vy));
        enemy.x += vx / dist * enemy.speed * delta;
        enemy.y += vy / dist * enemy.speed * delta;
        if (pulse && dist < this.bladeRadius + enemy.radius) enemy.hp -= this.damage;
        if (dist < this.player.radius + enemy.radius + 2) {
          let hit = (enemy.boss ? 18 : 7) * delta;
          if (this.shield > 0) {
            const absorbed = Math.min(this.shield, hit);
            this.shield -= absorbed;
            hit -= absorbed;
          }
          this.player.hp -= hit;
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
      fillPanel(context, {x: 14, y: 70, w: 332, h: 24, r: 12}, 'rgba(6,10,14,.72)');
      context.fillStyle = '#8CE052';
      roundedRect(context, 17, 73, 326 * (1 - remaining / this.stageDurations[this.stage - 1]), 18, 9);
      context.fill();
      text(context, `${Math.ceil(remaining)} 秒`, 180, 82, {size: 10, weight: 900, align: 'center'});
      this.orbs.forEach(orb => {
        context.beginPath(); context.arc(orb.x, orb.y, 5 + orb.value, 0, TAU); context.fillStyle = '#B9FF7A'; context.fill();
      });
      this.enemies.forEach(enemy => {
        context.beginPath(); context.arc(enemy.x, enemy.y, enemy.radius, 0, TAU); context.fillStyle = enemy.boss ? '#FF4D6F' : '#722B78'; context.fill();
        context.strokeStyle = enemy.boss ? '#FFD2DC' : '#D89CDF'; context.lineWidth = 2; context.stroke();
        if (enemy.boss) {
          context.fillStyle = 'rgba(0,0,0,.55)'; context.fillRect(enemy.x - 25, enemy.y - 32, 50, 5);
          context.fillStyle = '#FF4D6F'; context.fillRect(enemy.x - 25, enemy.y - 32, 50 * enemy.hp / enemy.maxHp, 5);
        }
      });
      context.beginPath(); context.arc(this.player.x, this.player.y, this.bladeRadius, 0, TAU); context.strokeStyle = 'rgba(190,255,126,.52)'; context.lineWidth = 2; context.stroke();
      context.beginPath(); context.arc(this.player.x, this.player.y, 13, 0, TAU); context.fillStyle = '#EAF8D0'; context.fill(); context.strokeStyle = '#5D982C'; context.lineWidth = 4; context.stroke();
      context.beginPath(); context.arc(this.player.targetX, this.player.targetY, 7, 0, TAU); context.strokeStyle = 'rgba(255,255,255,.58)'; context.stroke();
      text(context, '点按或拖动，清扫车会持续向目标移动', 180, 537, {size: 11, weight: 700, align: 'center'});
      if (this.upgradeChoices) {
        context.fillStyle = 'rgba(4,7,10,.76)'; context.fillRect(0, 0, WIDTH, HEIGHT);
        text(context, '选择阶段升级', 180, 208, {size: 23, weight: 900, align: 'center'});
        this.upgradeChoices.forEach((choice, index) => {
          fillPanel(context, choice.rect, index === 0 ? '#283A1F' : index === 1 ? '#172E46' : '#3B223F', 'rgba(255,255,255,.24)');
          text(context, ['✦', '➤', '⬡'][index], choice.rect.x + choice.rect.w / 2, choice.rect.y + 30, {size: 24, align: 'center'});
          text(context, choice.label, choice.rect.x + choice.rect.w / 2, choice.rect.y + 65, {size: 13, weight: 900, align: 'center'});
          text(context, choice.desc, choice.rect.x + choice.rect.w / 2, choice.rect.y + 90, {size: 9, weight: 600, align: 'center', color: 'rgba(255,255,255,.72)', maxWidth: 86});
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
        {name: '轨道哨兵', hp: 28, maxHp: 28, intents: [7, 9, 6]},
        {name: '双星掠夺者', hp: 42, maxHp: 42, intents: [10, 7, 13]},
        {name: '失控星核', hp: 62, maxHp: 62, intents: [12, 15, 9]}
      ];
      this.enemy = {...this.encounters[0]};
      this.cards = [
        {id: 'strike', name: '星刃', icon: '✦', cost: 1, copy: '造成 7 伤害'},
        {id: 'guard', name: '守护阵', icon: '⬡', cost: 1, copy: '获得 8 护盾'},
        {id: 'lance', name: '穿透矛', icon: '➤', cost: 2, copy: '造成 12 伤害'},
        {id: 'heal', name: '回响', icon: '✚', cost: 1, copy: '恢复 5 生命'},
        {id: 'frost', name: '寒霜', icon: '❄', cost: 2, copy: '5 伤害并弱化'}
      ];
      this.hand = this.drawHand();
      this.relic = '';
      this.transition = null;
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
      const number = Number(keyName);
      if (number >= 1 && number <= 5) this.playCard(number - 1);
      if (keyName === 'Enter') this.endTurn();
    }

    playCard(index) {
      if (this.finished || this.transition) return;
      const card = this.hand[index];
      if (!card || card.cost > this.energy) { this.tone('bad'); return; }
      this.energy -= card.cost;
      if (card.id === 'strike') this.enemy.hp -= 7 + (this.relic === 'blade' ? 2 : 0);
      if (card.id === 'guard') this.block += 8 + (this.relic === 'ward' ? 3 : 0);
      if (card.id === 'lance') this.enemy.hp -= 12 + (this.relic === 'blade' ? 3 : 0);
      if (card.id === 'heal') this.heroHp = Math.min(this.heroMaxHp, this.heroHp + 5);
      if (card.id === 'frost') { this.enemy.hp -= 5; this.weaken = 4; }
      this.score += card.id === 'guard' ? 16 : card.id === 'heal' ? 12 : 28;
      this.emit('valid_interaction', {interaction_type: 'card_play', card: card.id, energy: this.energy});
      this.tone('good');
      this.hand.splice(index, 1);
      if (this.enemy.hp <= 0) this.winEncounter();
    }

    endTurn() {
      if (this.finished || this.transition) return;
      const incoming = this.currentIntent();
      const damage = Math.max(0, incoming - this.block);
      this.heroHp -= damage;
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
      this.score += 320 * this.stage + Math.max(0, this.heroHp * 5);
      if (this.stage >= 3) { this.finish(true, `三战全胜，剩余生命 ${Math.ceil(this.heroHp)}`); return; }
      this.transition = [
        {name: '星刃徽记', copy: '攻击额外 +2', id: 'blade', rect: {x: 26, y: 242, w: 96, h: 126, r: 18}},
        {name: '守望徽记', copy: '护盾额外 +3', id: 'ward', rect: {x: 132, y: 242, w: 96, h: 126, r: 18}},
        {name: '脉冲电池', copy: '每回合 +1 能量', id: 'battery', rect: {x: 238, y: 242, w: 96, h: 126, r: 18}}
      ];
    }

    chooseRelic(index) {
      const choice = this.transition[index];
      this.relic = choice.id;
      this.transition = null;
      this.nextStage(`获得 ${choice.name}`);
      this.enemy = {...this.encounters[this.stage - 1]};
      this.turn = 1;
      this.energy = 3 + (this.relic === 'battery' ? 1 : 0);
      this.block = 0;
      this.hand = this.drawHand();
      this.heroHp = Math.min(this.heroMaxHp, this.heroHp + 6);
    }

    render(context) {
      this.drawHud('星轨牌阵', `生命 ${Math.max(0, Math.ceil(this.heroHp))}/${this.heroMaxHp} · 护盾 ${this.block} · 能量 ${this.energy}`, '#C49035');
      fillPanel(context, {x: 24, y: 82, w: 312, h: 118, r: 22}, 'rgba(8,15,27,.78)', 'rgba(235,198,119,.34)');
      text(context, this.enemy.name, 180, 106, {size: 16, weight: 900, align: 'center'});
      text(context, `下一行动：造成 ${this.currentIntent()} 伤害`, 180, 133, {size: 12, weight: 700, align: 'center', color: '#FFD98B'});
      context.fillStyle = 'rgba(255,255,255,.15)'; roundedRect(context, 68, 157, 224, 14, 7); context.fill();
      context.fillStyle = '#E8696A'; roundedRect(context, 68, 157, 224 * clamp(this.enemy.hp / this.enemy.maxHp, 0, 1), 14, 7); context.fill();
      text(context, `${Math.max(0, this.enemy.hp)} / ${this.enemy.maxHp}`, 180, 164, {size: 9, weight: 900, align: 'center'});
      fillPanel(context, {x: 18, y: 216, w: 216, h: 154, r: 20}, 'rgba(10,16,28,.72)', 'rgba(255,255,255,.15)');
      text(context, '作战提示', 34, 239, {size: 12, weight: 900, color: '#EAC67B'});
      text(context, '先看敌方意图，再组合攻击、', 34, 265, {size: 11, weight: 600, color: 'rgba(255,255,255,.75)'});
      text(context, '防御与控制。牌可连续打出。', 34, 283, {size: 11, weight: 600, color: 'rgba(255,255,255,.75)'});
      text(context, this.relic ? `徽记：${this.relic}` : '徽记：尚未获得', 34, 320, {size: 11, weight: 800});
      this.drawButton({x: 250, y: 330, w: 92, h: 38, r: 19}, '结束回合');
      this.hand.forEach((card, index) => {
        const rect = {x: 11 + index * 69, y: 394, w: 62, h: 145, r: 13};
        const available = card.cost <= this.energy;
        fillPanel(context, rect, available ? 'rgba(244,235,207,.96)' : 'rgba(86,88,94,.92)', available ? '#C4994D' : '#696B70');
        fillPanel(context, {x: rect.x + 5, y: rect.y + 6, w: 22, h: 22, r: 11}, available ? '#163253' : '#4A4C50');
        text(context, card.cost, rect.x + 16, rect.y + 17, {size: 11, weight: 900, align: 'center'});
        text(context, card.icon, rect.x + 31, rect.y + 55, {size: 25, weight: 500, align: 'center', color: available ? '#173254' : '#B7B7B7'});
        text(context, card.name, rect.x + 31, rect.y + 83, {size: 11, weight: 900, align: 'center', color: available ? '#111722' : '#D0D0D0'});
        text(context, card.copy, rect.x + 31, rect.y + 113, {size: 8, weight: 700, align: 'center', color: available ? '#46505A' : '#C0C0C0', maxWidth: 54});
        text(context, String(index + 1), rect.x + 31, rect.y + 133, {size: 8, weight: 800, align: 'center', color: available ? '#7A6949' : '#BBBBBB'});
      });
      if (this.transition) {
        context.fillStyle = 'rgba(3,8,15,.82)'; context.fillRect(0, 0, WIDTH, HEIGHT);
        text(context, '选择一枚星轨徽记', 180, 206, {size: 22, weight: 900, align: 'center'});
        this.transition.forEach((choice, index) => {
          fillPanel(context, choice.rect, ['#2B2445', '#1D3B45', '#463823'][index], 'rgba(255,255,255,.22)');
          text(context, ['✦', '⬡', '◉'][index], choice.rect.x + 48, choice.rect.y + 32, {size: 24, align: 'center'});
          text(context, choice.name, choice.rect.x + 48, choice.rect.y + 70, {size: 12, weight: 900, align: 'center'});
          text(context, choice.copy, choice.rect.x + 48, choice.rect.y + 98, {size: 9, weight: 600, align: 'center', color: 'rgba(255,255,255,.72)', maxWidth: 84});
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
    }

    currentEvent() { return this.chapters[this.stage - 1][this.step]; }

    press(point) {
      if (this.paused) { this.togglePause(false); return; }
      const event = this.currentEvent();
      if (!event) return;
      const cards = [{x: 18, y: 318, w: 155, h: 176}, {x: 187, y: 318, w: 155, h: 176}];
      const index = cards.findIndex(rect => pointIn(point, rect));
      if (index >= 0) this.choose(index);
    }

    key(keyName) {
      if (keyName === '1' || keyName === 'ArrowLeft') this.choose(0);
      if (keyName === '2' || keyName === 'ArrowRight') this.choose(1);
    }

    choose(index) {
      const event = this.currentEvent();
      const choice = event && event.choices[index];
      if (!choice) return;
      let bonus = 0;
      if (choice.needs) bonus = this.relics.includes(choice.needs) ? 80 : -35;
      Object.entries(choice.delta || {}).forEach(([key, value]) => { this[key] = clamp(this[key] + value, 0, 10); });
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
      fillPanel(context, {x: 20, y: 78, w: 320, h: 52, r: 14}, 'rgba(245,232,198,.92)', '#8D6E49');
      text(context, `第 ${this.stage} 章 · 记录 ${this.step + 1}/3`, 36, 98, {size: 13, weight: 900, color: '#3B2C1E'});
      text(context, this.log, 36, 117, {size: 9, weight: 700, color: '#765C41', maxWidth: 285});
      const event = this.currentEvent();
      if (!event) return;
      fillPanel(context, {x: 34, y: 152, w: 292, h: 126, r: 22}, 'rgba(25,22,19,.78)', 'rgba(246,223,172,.32)');
      text(context, event.title, 180, 187, {size: 22, weight: 900, align: 'center'});
      text(context, '选择一条路线，资源变化会影响后续事件与结局', 180, 222, {size: 11, weight: 600, align: 'center', color: 'rgba(255,255,255,.74)', maxWidth: 250});
      text(context, this.relics.length ? `旅途物件：${this.relics.join(' · ')}` : '旅途物件：尚无', 180, 258, {size: 10, weight: 800, align: 'center', color: '#F0CE8B', maxWidth: 260});
      event.choices.forEach((choice, index) => {
        const rect = index === 0 ? {x: 18, y: 318, w: 155, h: 176, r: 20} : {x: 187, y: 318, w: 155, h: 176, r: 20};
        fillPanel(context, rect, index === 0 ? 'rgba(240,225,188,.96)' : 'rgba(217,201,167,.96)', '#8A6B48');
        text(context, index === 0 ? '路线 A' : '路线 B', rect.x + 18, rect.y + 22, {size: 9, weight: 900, color: '#9A673A'});
        text(context, choice.name, rect.x + rect.w / 2, rect.y + 66, {size: 15, weight: 900, align: 'center', color: '#34261A', maxWidth: 130});
        text(context, choice.copy, rect.x + rect.w / 2, rect.y + 111, {size: 10, weight: 700, align: 'center', color: '#66513B', maxWidth: 130});
        if (choice.needs) text(context, `需要：${choice.needs}`, rect.x + rect.w / 2, rect.y + 148, {size: 9, weight: 900, align: 'center', color: this.relics.includes(choice.needs) ? '#3E7A48' : '#A8463F'});
      });
      text(context, '你的选择会被写进本局日志，并通向不同结局', 180, 528, {size: 10, weight: 700, align: 'center'});
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
        {answer: '井底之蛙', pair: ['井', '蛙'], clues: [['井', '水井'], ['叶', '树叶'], ['蛙', '青蛙'], ['铃', '铃铛'], ['月', '月亮'], ['箭', '箭矢']]},
        {answer: '一箭双雕', pair: ['箭', '雕'], clues: [['蛇', '长蛇'], ['箭', '箭矢'], ['羊', '山羊'], ['雕', '飞雕'], ['足', '脚印'], ['钟', '古钟']]},
        {answer: '一叶障目', pair: ['叶', '目'], clues: [['叶', '树叶'], ['井', '水井'], ['目', '眼睛'], ['蛙', '青蛙'], ['门', '木门'], ['马', '白马']]},
        {answer: '掩耳盗铃', pair: ['耳', '铃'], clues: [['耳', '耳朵'], ['舟', '小舟'], ['剑', '长剑'], ['铃', '铃铛'], ['兔', '白兔'], ['木', '树桩']]},
        {answer: '画蛇添足', pair: ['蛇', '足'], clues: [['蛇', '长蛇'], ['龙', '飞龙'], ['足', '脚印'], ['笔', '画笔'], ['月', '月亮'], ['杯', '酒杯']]},
        {answer: '亡羊补牢', pair: ['羊', '牢'], clues: [['羊', '山羊'], ['马', '白马'], ['牢', '围栏'], ['弓', '弯弓'], ['石', '石头'], ['花', '花朵']]}
      ];
    }

    currentCase() { return this.cases[this.caseIndex]; }

    press(point) {
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
      const index = Number(keyName) - 1;
      if (index >= 0 && index < 6) this.selectClue(index);
    }

    selectClue(index) {
      const clue = this.currentCase().clues[index];
      if (!clue) return;
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
        this.score += 180 + this.insight * 15;
        this.message = `推理成立：${this.currentCase().answer}`;
        this.tone('good');
        this.caseIndex += 1;
        this.selected = [];
        if (this.caseIndex >= this.cases.length) { this.finish(true, `六案结清，剩余洞察 ${this.insight}`); return; }
        if (this.caseIndex % 2 === 0) this.nextStage(`还原 ${this.caseIndex} 个成语`);
      } else {
        this.insight -= 1;
        this.message = '物证无法互相印证，重新组合';
        this.selected = [];
        this.tone('bad');
        if (this.insight <= 0) this.finish(false, `完成 ${this.caseIndex} / 6 个案件`);
      }
    }

    render(context) {
      this.drawHud('成语侦探', `案件 ${this.caseIndex + 1}/6 · 洞察 ${this.insight} · 得分 ${this.score}`, '#A43B32');
      fillPanel(context, {x: 24, y: 80, w: 312, h: 64, r: 18}, 'rgba(45,28,22,.83)', 'rgba(236,197,142,.34)');
      text(context, `第 ${this.caseIndex + 1} 案：组合两张关键物证`, 180, 103, {size: 14, weight: 900, align: 'center'});
      text(context, '不直接选择答案，用物证关系还原成语', 180, 126, {size: 10, weight: 700, align: 'center', color: '#E1C498'});
      context.beginPath(); context.arc(180, 233, 74, 0, TAU); context.fillStyle = 'rgba(12,14,16,.70)'; context.fill(); context.strokeStyle = '#BD7547'; context.lineWidth = 2; context.stroke();
      [0, 1].forEach(slot => {
        const x = slot === 0 ? 145 : 215;
        context.beginPath(); context.arc(x, 224, 27, 0, TAU); context.fillStyle = 'rgba(245,231,199,.94)'; context.fill();
        const selectedIndex = this.selected[slot];
        text(context, selectedIndex == null ? '?' : this.currentCase().clues[selectedIndex][0], x, 224, {size: 24, weight: 900, align: 'center', color: '#322217'});
      });
      text(context, this.message, 180, 289, {size: 12, weight: 800, align: 'center', maxWidth: 300});
      this.currentCase().clues.forEach((clue, index) => {
        const col = index % 3;
        const row = Math.floor(index / 3);
        const rect = {x: 18 + col * 110, y: 334 + row * 82, w: 104, h: 70, r: 14};
        const active = this.selected.includes(index);
        fillPanel(context, rect, active ? '#F3C77C' : 'rgba(245,232,203,.94)', active ? '#FFF2CC' : '#805F42');
        text(context, clue[0], rect.x + 26, rect.y + 30, {size: 24, weight: 900, align: 'center', color: '#392719'});
        text(context, clue[1], rect.x + 66, rect.y + 30, {size: 11, weight: 900, align: 'center', color: '#392719'});
        text(context, String(index + 1), rect.x + 92, rect.y + 58, {size: 8, weight: 800, align: 'center', color: '#7A5D43'});
      });
      text(context, '选错会消耗洞察；每两个案件进入下一阶段', 180, 523, {size: 10, weight: 700, align: 'center'});
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
        {id: 'scout', side: 'player', type: '侦察', r: 5, c: 1, hp: 3},
        {id: 'guard', side: 'player', type: '守卫', r: 5, c: 2, hp: 5},
        {id: 'engineer', side: 'player', type: '工兵', r: 5, c: 3, hp: 4}
      ];
      const enemyCount = this.stage + 1;
      for (let index = 0; index < enemyCount; index += 1) this.units.push({id: `enemy-${this.stage}-${index}`, side: 'enemy', type: '敌军', r: index % 2, c: clamp(1 + index, 0, 4), hp: 2 + this.stage});
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
      const cost = this.terrainCost(cell);
      if (cost > this.ap) { this.message = '沼泽需要 2 点行动力'; this.tone('bad'); return; }
      if (unit && unit.side === 'enemy') {
        unit.hp -= selected.type === '守卫' ? 2 : 1;
        this.ap -= 1;
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
      if (this.finished) return;
      const players = this.units.filter(unit => unit.side === 'player');
      this.units.filter(unit => unit.side === 'enemy').forEach(enemy => {
        const target = players.slice().sort((a, b) => Math.hypot(a.r - enemy.r, a.c - enemy.c) - Math.hypot(b.r - enemy.r, b.c - enemy.c))[0];
        if (!target) return;
        const adjacent = this.neighbors(enemy).some(cell => cell.r === target.r && cell.c === target.c);
        if (adjacent) target.hp -= 1;
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
        this.drawHex(context, center, objective ? (objective.captured ? '#2B8FC8' : '#D49C32') : swamp ? 'rgba(62,87,76,.82)' : reachable ? 'rgba(87,141,176,.78)' : 'rgba(43,63,83,.72)', objective ? '#FFF1B8' : 'rgba(255,255,255,.20)');
        if (objective) text(context, objective.captured ? '✓' : '◆', center.x, center.y, {size: 14, weight: 900, align: 'center'});
      }
      this.units.forEach(unit => {
        const center = this.center(unit.r, unit.c);
        context.beginPath(); context.arc(center.x, center.y, 14, 0, TAU); context.fillStyle = unit.side === 'player' ? '#5EB5EA' : '#E55B56'; context.fill();
        context.strokeStyle = unit.id === this.selected ? '#FFFFFF' : 'rgba(255,255,255,.55)'; context.lineWidth = unit.id === this.selected ? 4 : 2; context.stroke();
        text(context, unit.side === 'player' ? unit.type[0] : '敌', center.x, center.y, {size: 10, weight: 900, align: 'center'});
        text(context, `♥${unit.hp}`, center.x, center.y + 23, {size: 8, weight: 900, align: 'center'});
      });
      fillPanel(context, {x: 17, y: 431, w: 208, h: 74, r: 16}, 'rgba(6,11,18,.80)', 'rgba(255,255,255,.16)');
      text(context, this.message, 31, 454, {size: 11, weight: 800, maxWidth: 180});
      text(context, '深色沼泽消耗 2 AP · 占领金色节点', 31, 483, {size: 9, weight: 600, color: 'rgba(255,255,255,.67)', maxWidth: 184});
      this.drawButton({x: 239, y: 462, w: 104, h: 42, r: 21}, '结束回合');
      text(context, '先选蓝色小队，再点相邻六角格；也可攻击相邻敌军', 180, 531, {size: 10, weight: 700, align: 'center'});
    }
  }
  HexFrontierGame.gameKey = 'hex-frontier';

  class GardenRenewalGame extends DeepGameBase {
    constructor(canvas, options) {
      super(canvas, options);
      this.types = ['✿', '●', '◆', '✦', '❖'];
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
      const board = Array.from({length: 7}, () => Array.from({length: 7}, () => Math.floor(Math.random() * this.types.length)));
      for (let r = 0; r < 7; r += 1) for (let c = 0; c < 7; c += 1) {
        while ((c >= 2 && board[r][c] === board[r][c - 1] && board[r][c] === board[r][c - 2]) || (r >= 2 && board[r][c] === board[r - 1][c] && board[r][c] === board[r - 2][c])) board[r][c] = (board[r][c] + 1) % this.types.length;
      }
      const target = this.targets[this.stage - 1];
      board[0][0] = target;
      board[0][1] = (target + 1) % this.types.length;
      board[0][2] = target;
      board[1][1] = target;
      return board;
    }

    press(point) {
      if (this.paused) { this.togglePause(false); return; }
      const col = Math.floor((point.x - 23) / 45);
      const row = Math.floor((point.y - 194) / 45);
      if (row < 0 || row >= 7 || col < 0 || col >= 7) return;
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
      if (!this.selected) this.selected = {r: 3, c: 3};
      const delta = keyName === 'ArrowLeft' ? [0, -1] : keyName === 'ArrowRight' ? [0, 1] : keyName === 'ArrowUp' ? [-1, 0] : keyName === 'ArrowDown' ? [1, 0] : null;
      if (!delta) return;
      const next = {r: clamp(this.selected.r + delta[0], 0, 6), c: clamp(this.selected.c + delta[1], 0, 6)};
      if (next.r !== this.selected.r || next.c !== this.selected.c) this.swap(this.selected, next);
      this.selected = null;
    }

    swap(a, b) {
      [this.board[a.r][a.c], this.board[b.r][b.c]] = [this.board[b.r][b.c], this.board[a.r][a.c]];
      let matches = this.findMatches();
      if (!matches.length) {
        [this.board[a.r][a.c], this.board[b.r][b.c]] = [this.board[b.r][b.c], this.board[a.r][a.c]];
        this.message = '没有形成组合，花砖已复位';
        this.tone('bad');
        return;
      }
      this.movesLeft -= 1;
      let cascade = 0;
      while (matches.length && cascade < 5) {
        const unique = new Map(matches.map(cell => [`${cell.r}-${cell.c}`, cell]));
        unique.forEach(cell => {
          const value = this.board[cell.r][cell.c];
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
      this.tone('good');
      if (this.collected >= this.goals[this.stage - 1]) {
        this.score += this.movesLeft * 25;
        if (this.stage >= 3) this.finish(true, `三处庭院区域全部焕新，剩余 ${this.movesLeft} 步`);
        else {
          this.nextStage(`收集 ${this.collected} 个目标花砖`);
          this.collected = 0;
          this.movesLeft = this.movesByStage[this.stage - 1];
          this.board = this.createBoard();
          this.message = this.stage === 2 ? '喷泉区解锁：收集蓝色水滴' : '凉亭区解锁：收集绿色星叶';
        }
      } else if (this.movesLeft <= 0) this.finish(false, `还差 ${this.goals[this.stage - 1] - this.collected} 个目标花砖`);
    }

    findMatches() {
      const matches = [];
      for (let r = 0; r < 7; r += 1) {
        let start = 0;
        for (let c = 1; c <= 7; c += 1) {
          if (c < 7 && this.board[r][c] === this.board[r][start]) continue;
          if (c - start >= 3) for (let index = start; index < c; index += 1) matches.push({r, c: index});
          start = c;
        }
      }
      for (let c = 0; c < 7; c += 1) {
        let start = 0;
        for (let r = 1; r <= 7; r += 1) {
          if (r < 7 && this.board[r][c] === this.board[start][c]) continue;
          if (r - start >= 3) for (let index = start; index < r; index += 1) matches.push({r: index, c});
          start = r;
        }
      }
      return matches;
    }

    render(context) {
      this.drawHud('花园焕新', `步数 ${this.movesLeft} · 目标 ${this.types[this.targets[this.stage - 1]]} ${this.collected}/${this.goals[this.stage - 1]}`, '#4E9D67');
      fillPanel(context, {x: 22, y: 78, w: 316, h: 84, r: 20}, 'rgba(248,241,221,.92)', '#8B8C72');
      text(context, ['修复入口花坛', '重启中央喷泉', '焕新观景凉亭'][this.stage - 1], 180, 104, {size: 16, weight: 900, align: 'center', color: '#314434'});
      text(context, this.message, 180, 130, {size: 10, weight: 700, align: 'center', color: '#667065', maxWidth: 284});
      const progress = clamp(this.collected / this.goals[this.stage - 1], 0, 1);
      context.fillStyle = '#D6D3C0'; roundedRect(context, 55, 145, 250, 8, 4); context.fill();
      context.fillStyle = '#5BA06B'; roundedRect(context, 55, 145, 250 * progress, 8, 4); context.fill();
      fillPanel(context, {x: 17, y: 184, w: 326, h: 326, r: 18}, 'rgba(36,48,39,.72)', 'rgba(255,255,255,.25)');
      for (let r = 0; r < 7; r += 1) for (let c = 0; c < 7; c += 1) {
        const value = this.board[r][c];
        const x = 23 + c * 45;
        const y = 194 + r * 45;
        const active = this.selected && this.selected.r === r && this.selected.c === c;
        fillPanel(context, {x, y, w: 40, h: 40, r: 10}, active ? '#FFF5C9' : 'rgba(246,239,216,.94)', active ? '#FFFFFF' : 'rgba(65,70,59,.34)');
        text(context, this.types[value], x + 20, y + 20, {size: 21, weight: 900, align: 'center', color: this.colors[value]});
      }
      text(context, '点击两块相邻花砖交换 · 形成三连后自动连锁下落', 180, 532, {size: 10, weight: 700, align: 'center'});
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
    version: '2.2.0',
    width: WIDTH,
    height: HEIGHT,
    list: () => Object.keys(registry).map(key => ({key, ...metadata[key]})),
    has: key => !!registry[key],
    mount(canvas, key, options) {
      const Game = registry[key];
      if (!Game) throw new Error(`Unknown Airvana deep game: ${key}`);
      return new Game(canvas, options || {});
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
