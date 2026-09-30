(function (root) {
  'use strict';

  // Original fruit art and level design. Physics is supplied by local Matter.js.
  const FRUITS = [null,
    { name: '红樱桃', radius: 12, light: '#ff9694', mid: '#ee4560', dark: '#ab203e', shape: 'cherry' },
    { name: '金杏子', radius: 16, light: '#ffe593', mid: '#ffb936', dark: '#db7724', shape: 'apricot' },
    { name: '青苹果', radius: 22, light: '#d4f48a', mid: '#83c842', dark: '#408d3e', shape: 'apple' },
    { name: '蜜桃', radius: 28, light: '#ffcfb3', mid: '#ff8c98', dark: '#df567b', shape: 'peach' },
    { name: '甜橙', radius: 36, light: '#ffe298', mid: '#ffac37', dark: '#e37a27', shape: 'orange' },
    { name: '蓝莓王', radius: 46, light: '#c4b9f6', mid: '#8d85de', dark: '#5355a3', shape: 'berry' },
    { name: '花纹蜜瓜', radius: 58, light: '#dbef95', mid: '#97cb62', dark: '#4a9560', shape: 'melon' }
  ];
  const TARGETS = [3, 4, 5, 6, 7];
  const STEP = 1 / 120;
  const MAX_FRUITS = 72;
  const LEFT = 38;
  const RIGHT = 322;
  const FLOOR = 454;
  const DANGER = 205;
  const DROP_Y = 174;
  const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
  const finite = (value) => typeof value === 'number' && Number.isFinite(value);
  const FRUIT_SPRITES = [null, 'cherry', 'apricot', 'apple', 'peach', 'orange', 'blueberry', 'melon'];
  const sceneArt = (ctx) => root.AirvanaPhysicsArt?.background?.(ctx, 'fruit-drop', 0, 0, 360, 560) === true;
  const spriteArt = (ctx, name, x, y, w, h, angle = 0) => root.AirvanaPhysicsArt?.sprite?.(ctx, name, x, y, w, h, angle) === true;

  function surface(ctx, x, y, w, h, colors) {
    const paint = ctx.createLinearGradient(x, y, x + w * .18, y + h);
    colors.forEach((color, index) => paint.addColorStop(index / Math.max(1, colors.length - 1), color));
    return paint;
  }

  function panel(ctx, x, y, w, h) {
    ctx.save();
    ctx.shadowColor = '#5e5a273d'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3;
    rounded(ctx, x, y, w, h, 16);
    ctx.fillStyle = surface(ctx, x, y, w, h, ['#fffef8', '#ffedc9']); ctx.fill();
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.strokeStyle = '#d8b574'; ctx.lineWidth = 1.5; ctx.stroke();
    rounded(ctx, x + 3, y + 2, w - 6, h - 5, 13);
    ctx.strokeStyle = '#ffffffdc'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  }

  function rounded(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function leaf(ctx, x, y, size, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(size * 0.3, -size * 0.9, size, -size * 0.25);
    ctx.quadraticCurveTo(size * 0.75, size * 0.25, 0, 0);
    ctx.fillStyle = '#4e9854';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size * 0.76, -size * 0.2);
    ctx.strokeStyle = '#badc89';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.restore();
  }

  function fruitPath(ctx, r, shape) {
    ctx.beginPath();
    if (shape === 'apple' || shape === 'peach') {
      ctx.moveTo(0, -r * 0.83);
      ctx.bezierCurveTo(r * 0.6, -r * 1.2, r * 1.08, -r * 0.52, r * 0.94, r * 0.13);
      ctx.bezierCurveTo(r * 0.84, r * 0.72, r * 0.4, r * 1.07, 0, r * 0.93);
      ctx.bezierCurveTo(-r * 0.45, r * 1.06, -r * 0.9, r * 0.7, -r * 0.96, r * 0.07);
      ctx.bezierCurveTo(-r * 1.06, -r * 0.56, -r * 0.57, -r * 1.15, 0, -r * 0.83);
    } else {
      ctx.ellipse(0, 0, r * (shape === 'apricot' ? 0.98 : 1), r, 0, 0, Math.PI * 2);
    }
    ctx.closePath();
  }

  function drawFruit(ctx, rank, x, y, radius, angle, alpha) {
    const art = FRUITS[rank];
    if (!art) return;
    const r = radius || art.radius;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle || 0);
    ctx.globalAlpha *= alpha == null ? 1 : alpha;
    ctx.shadowColor = 'rgba(42,75,50,.2)';
    ctx.shadowBlur = Math.max(3, r * 0.1);
    ctx.shadowOffsetY = Math.max(2, r * 0.08);
    if (FRUIT_SPRITES[rank] && spriteArt(ctx, FRUIT_SPRITES[rank], 0, 0, r * 2.45, r * 2.45)) {
      ctx.restore();
      return;
    }
    const fill = ctx.createRadialGradient(-r * 0.34, -r * 0.45, r * 0.06, r * 0.15, r * 0.2, r * 1.18);
    fill.addColorStop(0, art.light);
    fill.addColorStop(0.5, art.mid);
    fill.addColorStop(1, art.dark);
    fruitPath(ctx, r, art.shape);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.strokeStyle = art.dark;
    ctx.lineWidth = Math.max(1.2, r * 0.035);
    ctx.stroke();

    if (art.shape === 'melon') {
      ctx.save();
      fruitPath(ctx, r, art.shape);
      ctx.clip();
      ctx.lineWidth = r * 0.105;
      ctx.strokeStyle = 'rgba(69,143,83,.65)';
      [-0.65, -0.23, 0.23, 0.65].forEach((offset) => {
        ctx.beginPath();
        ctx.moveTo(offset * r * 0.52, -r);
        ctx.bezierCurveTo(offset * r * 1.6, -r * 0.3, offset * r * 1.6, r * 0.4, offset * r * 0.58, r);
        ctx.stroke();
      });
      ctx.restore();
    }
    if (art.shape === 'orange') {
      ctx.fillStyle = 'rgba(215,113,29,.23)';
      for (let i = 0; i < 12; i += 1) {
        const a = i * 2.4;
        const d = r * (0.42 + (i % 3) * 0.14);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * d, Math.sin(a) * d, r * 0.025, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (art.shape === 'peach' || art.shape === 'apricot') {
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.66);
      ctx.bezierCurveTo(r * 0.27, -r * 0.2, r * 0.19, r * 0.5, 0, r * 0.76);
      ctx.strokeStyle = art.shape === 'peach' ? 'rgba(196,65,99,.32)' : 'rgba(198,110,31,.3)';
      ctx.lineWidth = Math.max(1, r * 0.04);
      ctx.stroke();
    }
    if (art.shape === 'berry') {
      ctx.save();
      ctx.translate(r * 0.22, -r * 0.5);
      ctx.fillStyle = '#57599d';
      ctx.beginPath();
      for (let i = 0; i < 10; i += 1) {
        const a = -Math.PI / 2 + i * Math.PI / 5;
        const d = r * (i % 2 ? 0.1 : 0.2);
        ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.82);
      ctx.quadraticCurveTo(-r * 0.07, -r * 1.08, r * 0.13, -r * 1.15);
      ctx.strokeStyle = '#81613c';
      ctx.lineWidth = Math.max(1.6, r * 0.065);
      ctx.lineCap = 'round';
      ctx.stroke();
      leaf(ctx, r * 0.02, -r * 0.89, r * 0.55, -0.1);
    }
    ctx.beginPath();
    ctx.ellipse(-r * 0.34, -r * 0.35, r * 0.13, r * 0.29, Math.PI / 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,235,.48)';
    ctx.fill();
    ctx.restore();
  }

  class FruitDropGame {
    constructor(options) {
      options = options || {};
      this.level = clamp(Math.floor(Number(options.level) || 1), 1, 5);
      this.levelCount = 5;
      this.status = 'playing';
      this.score = 0;
      this.targetRank = TARGETS[this.level - 1];
      this.instruction = '左右拖动瞄准，松手投下；相同果实碰撞合成。';
      this._random = typeof options.random === 'function' ? options.random : Math.random;
      this.M = root.Matter;
      if (!this.M || !this.M.Engine) throw new Error('FruitDropGame requires local Matter.js');
      const M = this.M;
      this.engine = M.Engine.create({ enableSleeping: true, positionIterations: 8, velocityIterations: 8 });
      this.engine.gravity.y = 1.25;
      M.Composite.add(this.engine.world, [
        M.Bodies.rectangle(31, 345, 14, 250, { isStatic: true, friction: 0.3, label: 'jar-left' }),
        M.Bodies.rectangle(329, 345, 14, 250, { isStatic: true, friction: 0.3, label: 'jar-right' }),
        M.Bodies.rectangle(180, 463, 312, 18, { isStatic: true, friction: 0.38, label: 'jar-bottom' })
      ]);
      this.fruits = [];
      this.effects = [];
      this.elapsed = 0;
      this._accumulator = 0;
      this._cooldown = 0;
      this._dangerTime = 0;
      this._pairs = [];
      this._bag = [];
      this._intro = [1, 1, 2];
      this._drops = 0;
      this._merges = 0;
      this._highestRank = 0;
      this._pointer = false;
      this.aimX = 180;
      this.currentRank = this._nextRank();
      this.nextRank = this._nextRank();
      const collect = (event) => { this._pairs.push(...event.pairs); };
      M.Events.on(this.engine, 'collisionStart', collect);
      M.Events.on(this.engine, 'collisionActive', collect);
    }

    _rand() {
      const value = Number(this._random());
      return Number.isFinite(value) ? clamp(value, 0, 0.99999999) : 0.5;
    }

    _nextRank() {
      if (this._intro.length) return this._intro.shift();
      if (!this._bag.length) {
        const max = Math.min(3, this.targetRank - 1);
        for (let rank = 1; rank <= max; rank += 1) this._bag.push(rank, rank);
        for (let i = this._bag.length - 1; i > 0; i -= 1) {
          const j = Math.floor(this._rand() * (i + 1));
          [this._bag[i], this._bag[j]] = [this._bag[j], this._bag[i]];
        }
      }
      return this._bag.pop();
    }

    _makeFruit(rank, x, y, fresh) {
      const M = this.M;
      const r = FRUITS[rank].radius;
      const body = M.Bodies.circle(clamp(x, LEFT + r, RIGHT - r), y, r, {
        restitution: 0.13,
        friction: 0.2,
        frictionStatic: 0.5,
        frictionAir: 0.012,
        density: 0.0014,
        sleepThreshold: 75,
        label: 'orchard-fruit'
      });
      body.fruitRank = rank;
      body.fruitBorn = this.elapsed;
      body.fruitMergeAt = this.elapsed + (fresh ? 0.13 : 0.055);
      body.fruitEverBelow = false;
      this.fruits.push(body);
      M.Composite.add(this.engine.world, body);
      this._highestRank = Math.max(this._highestRank, rank);
      return body;
    }

    _drop() {
      if (this.status !== 'playing' || this._cooldown > 0 || this.fruits.length >= MAX_FRUITS) return false;
      const r = FRUITS[this.currentRank].radius;
      this.aimX = clamp(this.aimX, LEFT + r + 1, RIGHT - r - 1);
      this._makeFruit(this.currentRank, this.aimX, DROP_Y, true);
      this._drops += 1;
      this.currentRank = this.nextRank;
      this.nextRank = this._nextRank();
      this._cooldown = 0.48;
      return true;
    }

    _mergePairs() {
      const used = new Set();
      const present = new Set(this.fruits);
      for (const pair of this._pairs) {
        const a = pair.bodyA;
        const b = pair.bodyB;
        if (!present.has(a) || !present.has(b) || used.has(a.id) || used.has(b.id)) continue;
        if (!a.fruitRank || a.fruitRank !== b.fruitRank || a.fruitRank >= 7) continue;
        if (a.fruitMergeAt > this.elapsed || b.fruitMergeAt > this.elapsed) continue;
        used.add(a.id);
        used.add(b.id);
        const rank = a.fruitRank + 1;
        const r = FRUITS[rank].radius;
        const x = clamp((a.position.x + b.position.x) / 2, LEFT + r, RIGHT - r);
        const y = Math.min(FLOOR - r, (a.position.y + b.position.y) / 2);
        this.M.Composite.remove(this.engine.world, a);
        this.M.Composite.remove(this.engine.world, b);
        this.fruits = this.fruits.filter((fruit) => fruit !== a && fruit !== b);
        const merged = this._makeFruit(rank, x, y, false);
        this.M.Body.setVelocity(merged, {
          x: clamp((a.velocity.x + b.velocity.x) * 0.22, -2, 2),
          y: Math.min(-0.6, (a.velocity.y + b.velocity.y) * 0.15)
        });
        this._merges += 1;
        const points = 10 * (2 ** (rank - 1));
        this.score += points;
        this.effects.push({ x, y, age: 0, points, color: FRUITS[rank].mid, radius: r });
        if (this.effects.length > 16) this.effects.shift();
        if (rank >= this.targetRank) this.status = 'success';
      }
      this._pairs.length = 0;
    }

    _step() {
      this.elapsed += STEP;
      this._cooldown = Math.max(0, this._cooldown - STEP);
      this.M.Engine.update(this.engine, STEP * 1000);
      this._mergePairs();
      let endangered = false;
      for (const body of this.fruits) {
        const r = FRUITS[body.fruitRank].radius;
        const p = body.position;
        if (!finite(p.x) || !finite(p.y) || !finite(body.velocity.x) || !finite(body.velocity.y)) {
          this.status = 'failure';
          return;
        }
        // Closed jar walls extend upward virtually, preventing numerical escape.
        if (p.x < LEFT + r || p.x > RIGHT - r) {
          this.M.Body.setPosition(body, { x: clamp(p.x, LEFT + r, RIGHT - r), y: p.y });
          this.M.Body.setVelocity(body, { x: -body.velocity.x * 0.2, y: body.velocity.y });
        }
        if (p.y - r > DANGER + 4) body.fruitEverBelow = true;
        const graceFinished = this.elapsed - body.fruitBorn > 1.5;
        if ((graceFinished || body.fruitEverBelow) && p.y - r < DANGER && Math.abs(body.velocity.y) < 1.25) endangered = true;
      }
      if (this.status !== 'playing') return;
      this._dangerTime = endangered ? this._dangerTime + STEP : Math.max(0, this._dangerTime - STEP * 2);
      if (this._dangerTime >= 2.2 || this.fruits.length >= MAX_FRUITS) this.status = 'failure';
    }

    update(dt) {
      if (this.status !== 'playing' || !finite(dt) || dt <= 0) return;
      const delta = Math.min(dt, 0.1);
      this._accumulator += delta;
      let steps = 0;
      while (this._accumulator >= STEP && steps < 12 && this.status === 'playing') {
        this._step();
        this._accumulator -= STEP;
        steps += 1;
      }
      for (const effect of this.effects) effect.age += delta;
      this.effects = this.effects.filter((effect) => effect.age < 0.75);
    }

    _setAim(point) {
      if (!point || !finite(point.x) || !finite(point.y)) return false;
      const r = FRUITS[this.currentRank].radius;
      this.aimX = clamp(point.x, LEFT + r + 1, RIGHT - r - 1);
      return true;
    }

    pointerDown(point) {
      if (this.status !== 'playing' || !point || !finite(point.y) || point.y < 80 || point.y > 484) return;
      this._pointer = this._setAim(point);
    }

    pointerMove(point) {
      if (this.status === 'playing' && this._pointer) this._setAim(point);
    }

    pointerUp(point) {
      if (!this._pointer) return;
      this._pointer = false;
      if (this.status !== 'playing' || !this._setAim(point)) return;
      if (point.y < 80 || point.y > 484 || point.x < 0 || point.x > 360) return;
      this._drop();
    }

    cancelPointer() { this._pointer = false; }

    key(key) {
      if (key === 'ArrowLeft' || key === 'a') this.perform('left');
      if (key === 'ArrowRight' || key === 'd') this.perform('right');
      if (key === ' ' || key === 'Enter' || key === 'ArrowDown') this.perform('drop');
    }

    actions() {
      const stopped = this.status !== 'playing';
      return [
        { id: 'left', label: '向左', disabled: stopped },
        { id: 'drop', label: this._cooldown > 0 ? '准备中…' : '投下果实', disabled: stopped || this._cooldown > 0 },
        { id: 'right', label: '向右', disabled: stopped }
      ];
    }

    perform(id) {
      if (this.status !== 'playing') return false;
      if (id === 'drop') return this._drop();
      if (id === 'left' || id === 'right') {
        const r = FRUITS[this.currentRank].radius;
        this.aimX = clamp(this.aimX + (id === 'left' ? -24 : 24), LEFT + r + 1, RIGHT - r - 1);
        return true;
      }
      return false;
    }

    snapshot() {
      return {
        mode: 'fruit-drop', title: '果冻果园', level: this.level, levelCount: this.levelCount,
        status: this.status, score: this.score, targetRank: this.targetRank,
        target: FRUITS[this.targetRank].name, highestRank: this._highestRank,
        drops: this._drops, merges: this._merges, aimX: this.aimX,
        currentRank: this.currentRank, nextRank: this.nextRank,
        canDrop: this.status === 'playing' && this._cooldown <= 0,
        danger: Math.min(1, this._dangerTime / 2.2), bodyCount: this.fruits.length,
        fruits: this.fruits.map((body) => ({
          id: body.id, rank: body.fruitRank, radius: FRUITS[body.fruitRank].radius,
          x: body.position.x, y: body.position.y, vx: body.velocity.x, vy: body.velocity.y
        }))
      };
    }

    draw(ctx) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 80, 360, 404);
      ctx.clip();
      if (!sceneArt(ctx)) {
      const sky = ctx.createLinearGradient(0, 80, 0, 484);
      sky.addColorStop(0, '#a8e5ec');
      sky.addColorStop(0.48, '#d7f1aa');
      sky.addColorStop(1, '#9dce60');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 80, 360, 404);
      ctx.fillStyle = '#fdf9d4';
      ctx.beginPath();
      ctx.arc(310, 105, 38, 0, Math.PI * 2);
      ctx.fill();
      // Illustrated orchard outside the jar, kept subordinate to the playfield.
      [-14, 371].forEach((x, index) => {
        ctx.fillStyle = '#a77c4b';
        ctx.fillRect(x - 4, 180, 9, 202);
        const colors = ['#71b948', '#91d755', '#b9e577'];
        for (let n = 0; n < 3; n += 1) {
          ctx.fillStyle = colors[n];
          ctx.beginPath();
          ctx.ellipse(x + (n % 2 ? 11 : -8), 222 + n * 32 + index * 17, 33, 44, 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.fillStyle = '#8bc253';
      ctx.beginPath();
      ctx.ellipse(170, 485, 280, 82, -0.06, 0, Math.PI * 2);
      ctx.fill();
      }
      // Compact goal and next-fruit cards; the host owns global score/progression.
      panel(ctx, 15, 90, 148, 52);
      drawFruit(ctx, this.targetRank, 39, 118, 17, 0, 1);
      ctx.fillStyle = '#90805c';
      ctx.font = '600 10px system-ui, sans-serif';
      ctx.fillText('本关合成', 65, 108);
      ctx.fillStyle = '#54722d';
      ctx.font = '800 15px system-ui, sans-serif';
      ctx.fillText(FRUITS[this.targetRank].name, 65, 129);
      panel(ctx, 265, 90, 80, 52);
      ctx.fillStyle = '#90805c';
      ctx.font = '600 10px system-ui, sans-serif';
      ctx.fillText('下一个', 276, 109);
      drawFruit(ctx, this.nextRank, 318, 122, 13, 0, 1);

      // Clear glass preserves the individual fruit silhouettes and contact points.
      ctx.save(); ctx.shadowColor = '#66502f45'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 6;
      rounded(ctx, 27, 194, 306, 276, 29);
      ctx.fillStyle = surface(ctx, 27, 194, 306, 276, ['#fffdf3ed', '#fbf0d7e8', '#e8d3aae8']);
      ctx.fill();
      ctx.lineWidth = 9;
      ctx.strokeStyle = '#c49857';
      ctx.stroke();
      ctx.restore();
      rounded(ctx, 33, 196, 294, 266, 25);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#fff9d9';
      ctx.stroke();
      rounded(ctx, 35, 199, 290, 261, 23);
      ctx.lineWidth = 1.5; ctx.strokeStyle = '#d8bb8870'; ctx.stroke();
      ctx.fillStyle = surface(ctx, 26, 461, 308, 16, ['#bd8248', '#8d5c36']);
      rounded(ctx, 26, 461, 308, 16, 8);
      ctx.fill();
      ctx.fillStyle = surface(ctx, 30, 459, 300, 9, ['#ffdfa0', '#d49b59']);
      rounded(ctx, 30, 459, 300, 9, 4);
      ctx.fill();
      ctx.beginPath(); ctx.moveTo(42, 462); ctx.lineTo(318, 462); ctx.strokeStyle = '#ffedbd'; ctx.lineWidth = 1.5; ctx.stroke();

      ctx.save();
      ctx.setLineDash([4, 6]);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = this._dangerTime > 0 ? '#e37a51' : '#bc9c6870';
      ctx.beginPath();
      ctx.moveTo(44, DANGER);
      ctx.lineTo(316, DANGER);
      ctx.stroke();
      ctx.restore();
      if (this._dangerTime > 0) {
        ctx.fillStyle = '#cd644d';
        ctx.font = '800 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('快满了！让上方果实合成', 180, DANGER - 10);
        ctx.textAlign = 'left';
      }

      if (this.status === 'playing') {
        const r = FRUITS[this.currentRank].radius;
        let landing = FLOOR - r;
        for (const body of this.fruits) {
          const combined = r + FRUITS[body.fruitRank].radius;
          const dx = this.aimX - body.position.x;
          if (Math.abs(dx) < combined) landing = Math.min(landing, body.position.y - Math.sqrt(combined * combined - dx * dx));
        }
        ctx.save();
        ctx.setLineDash([2, 7]);
        ctx.strokeStyle = '#93a36180';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.aimX, DROP_Y + r + 4);
        ctx.lineTo(this.aimX, Math.max(DROP_Y + r + 6, landing));
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = '#97764720';
        ctx.beginPath();
        ctx.ellipse(this.aimX, FLOOR - 2, r * 0.8, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        drawFruit(ctx, this.currentRank, this.aimX, DROP_Y, r, 0, this._cooldown > 0 ? 0.45 : 1);
      }
      this.fruits.forEach((body) => drawFruit(ctx, body.fruitRank, body.position.x, body.position.y, undefined, body.angle, 1));
      for (const effect of this.effects) {
        const t = effect.age / 0.75;
        ctx.save();
        ctx.globalAlpha = 1 - t;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3 * (1 - t);
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, effect.radius * (1 + t * 0.7), 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < 7; i += 1) {
          const a = i * Math.PI * 2 / 7;
          ctx.fillStyle = i % 2 ? '#fff2b0' : effect.color;
          const sparkX = effect.x + Math.cos(a) * (effect.radius + 28 * t);
          const sparkY = effect.y + Math.sin(a) * (effect.radius + 28 * t);
          if (i % 2 && spriteArt(ctx, 'star', sparkX, sparkY, 14 * (1 - t) + 4, 14 * (1 - t) + 4, a + t)) continue;
          ctx.beginPath();
          ctx.arc(sparkX, sparkY, 3 * (1 - t) + 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.textAlign = 'center';
        ctx.font = '900 19px system-ui, sans-serif';
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#fffef0';
        ctx.strokeText('+' + effect.points, effect.x, effect.y - effect.radius - t * 28);
        ctx.fillStyle = '#467642';
        ctx.fillText('+' + effect.points, effect.x, effect.y - effect.radius - t * 28);
        ctx.restore();
      }
      // The bright rim sits in front of the physical fruit, completing the jar.
      ctx.strokeStyle = 'rgba(255,255,252,.9)';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(36, 223);
      ctx.lineTo(36, 424);
      ctx.moveTo(324, 223);
      ctx.lineTo(324, 332);
      ctx.stroke();
      if (!this._drops) {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#9a835d';
        ctx.font = '700 13px system-ui, sans-serif';
        ctx.fillText('拖动瞄准 · 松手投下', 180, 339);
        ctx.font = '500 11px system-ui, sans-serif';
        ctx.fillText('相同果实碰到一起，就会长大', 180, 360);
      }
      ctx.restore();
    }
  }

  FruitDropGame.title = '果冻果园';
  FruitDropGame.levelCount = 5;
  root.AirvanaPhysicsModes = root.AirvanaPhysicsModes || {};
  root.AirvanaPhysicsModes['fruit-drop'] = FruitDropGame;
}(typeof window !== 'undefined' ? window : globalThis));
