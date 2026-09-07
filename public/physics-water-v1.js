/* Original Airvana water puzzles. No third-party character, artwork or level data.
 * Canvas coordinates: 360 × 560; this module owns the field at y=80…484.
 * Physics is deterministic and advanced only by the host's update(dt).
 */
(function (root) {
  'use strict';
  const W = 360, TOP = 80, BOTTOM = 484, WATER = 84, TARGET = 52;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const point = p => ({ x: clamp(Number(p.x) || 0, 16, 344), y: clamp(Number(p.y) || 0, 114, 472) });
  const CUP_LEVELS = [
    { source: [76, 144], cup: [220, 385], ink: 300, obstacles: [], hint: '在出水口下画斜坡，把水引向右边杯子' },
    { source: [282, 144], cup: [66, 392], ink: 330, obstacles: [[193, 334, 80, 18]], hint: '向左画导水坡，绕开悬空木架' },
    { source: [66, 140], cup: [236, 403], ink: 340, obstacles: [[114, 292, 112, 20]], hint: '在木架上方架起导水桥' },
    { source: [290, 144], cup: [58, 405], ink: 345, obstacles: [[158, 342, 118, 20], [28, 240, 44, 16]], hint: '画长斜坡，让水从木架左侧落入杯子' },
    { source: [170, 139], cup: [258, 410], ink: 270, obstacles: [[133, 270, 76, 20], [49, 363, 98, 16]], hint: '把水绕过中央平台，引向最右侧杯子' }
  ];
  const DIG_LEVELS = [
    { source: 74, cup: 228, budget: 310, rocks: [[144, 231, 66, 40]], hint: '向下挖，再从石头下方引水到浴池' },
    { source: 282, cup: 60, budget: 320, rocks: [[157, 245, 76, 40]], hint: '绕过岩石左下方，开一条连续水道' },
    { source: 66, cup: 242, budget: 340, rocks: [[105, 226, 75, 40], [184, 343, 55, 25]], hint: '从大石头左侧下挖，绕过第二块岩石' },
    { source: 282, cup: 64, budget: 360, rocks: [[203, 220, 72, 35], [93, 331, 65, 30]], hint: '沿右侧下挖，再从深处向左连接浴池' },
    { source: 178, cup: 247, budget: 350, rocks: [[147, 230, 74, 40], [58, 325, 91, 33], [280, 326, 44, 25]], hint: '从中央岩石右侧绕行，接通下方浴池' }
  ];

  function rounded(ctx, x, y, width, height, radius, fill, stroke, lineWidth = 1) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
  }
  function circle(ctx, x, y, radius, fill, stroke, width = 1) {
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
  }
  function line(ctx, points, color, width = 2) {
    if (!points.length) return;
    ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
    for (const p of points.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.lineWidth = width; ctx.strokeStyle = color; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
  }
  function label(ctx, text, x, y, size = 12, color = '#234051', align = 'left') {
    ctx.font = `700 ${size}px system-ui, sans-serif`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y);
  }
  function surface(ctx, x, y, w, h, colors) {
    const paint = ctx.createLinearGradient(x, y, x + w * .2, y + h);
    colors.forEach((color, index) => paint.addColorStop(index / Math.max(1, colors.length - 1), color));
    return paint;
  }
  const sceneArt = (ctx, key) => root.AirvanaPhysicsArt?.background?.(ctx, key, 0, 0, 360, 560) === true;
  const spriteArt = (ctx, name, x, y, w, h, angle = 0) => root.AirvanaPhysicsArt?.sprite?.(ctx, name, x, y, w, h, angle) === true;
  function droplet(ctx, x, y, radius = 3) {
    circle(ctx, x, y + radius * .14, radius, '#0878c7');
    circle(ctx, x, y, radius * .92, surface(ctx, x - radius, y - radius, radius * 2, radius * 2, ['#9bffff', '#30c7f5', '#138bdc']));
    circle(ctx, x - radius * .28, y - radius * .32, radius * .31, '#e2ffff');
  }
  function faucet(ctx, x, y, pouring) {
    ctx.save();
    ctx.shadowColor = '#31464a45'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 3;
    rounded(ctx, x - 29, y - 30, 41, 17, 7, surface(ctx, x, y - 30, 40, 17, ['#e8fbff', '#7dc9e5', '#3b87af']), '#356984', 2);
    rounded(ctx, x - 3, y - 29, 16, 32, 6, surface(ctx, x - 3, y - 29, 16, 32, ['#dbfaff', '#9adaec', '#468bad']), '#356984', 2);
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    rounded(ctx, x - 32, y - 31, 8, 20, 3, surface(ctx, x - 32, y - 31, 8, 20, ['#fff6bd', '#ebbd58', '#aa7234']), '#a47c40', 1.5);
    rounded(ctx, x - 7, y - 3, 23, 9, 4, surface(ctx, x - 7, y - 3, 23, 9, ['#fff0b7', '#dfad51', '#a77637']), '#9c783c', 1.5);
    line(ctx, [{ x: x - 17, y: y - 27 }, { x: x - 17, y: y - 39 }], '#4b8299', 5);
    rounded(ctx, x - 30, y - 45, 27, 9, 4, surface(ctx, x - 30, y - 45, 27, 9, pouring ? ['#d7fa84', '#80c945', '#579d35'] : ['#ffcfad', '#f48b60', '#c75b41']), '#8a6b43', 1.5);
    line(ctx, [{ x: x - 26, y: y - 43 }, { x: x - 7, y: y - 43 }], '#fff6ceaa', 1.5);
    line(ctx, [{ x: x - 20, y: y - 26 }, { x: x + 2, y: y - 26 }, { x: x + 2, y: y - 11 }], '#f4feff', 2.8);
    line(ctx, [{ x: x - 3, y: y + 4 }, { x: x + 11, y: y + 4 }], '#397796', 2);
    ctx.restore();
  }
  function gauge(ctx, x, y, width, progress, color, text) {
    ctx.save(); ctx.shadowColor = '#41674830'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 2;
    rounded(ctx, x, y, width, 27, 10, surface(ctx, x, y, width, 27, ['#fffff8', '#fbf4df']), '#ffffff', 1);
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    rounded(ctx, x + 8, y + 17, width - 16, 6, 3, '#d7dbca');
    if (progress > 0) {
      const fillWidth = Math.max(5, (width - 16) * clamp(progress, 0, 1));
      rounded(ctx, x + 8, y + 17, fillWidth, 6, 3, color);
      if (fillWidth > 7) line(ctx, [{ x: x + 11, y: y + 18.5 }, { x: x + 5 + fillWidth, y: y + 18.5 }], '#ffffff70', 1);
    }
    label(ctx, text, x + 9, y + 9, 10, '#455a52'); ctx.restore();
  }
  function cupArt(ctx, cup, filled, time, bath) {
    const { x, y, w, h } = cup;
    ctx.save();
    if (bath) {
      rounded(ctx, x + 4, y + h - 6, 11, 15, 4, '#436279');
      rounded(ctx, x + w - 16, y + h - 6, 11, 15, 4, '#436279');
    }
    ctx.shadowColor = '#3052693d'; ctx.shadowBlur = 7; ctx.shadowOffsetY = 4;
    rounded(ctx, x, y, w, h, [4, 4, 15, 15], surface(ctx, x, y, w, h, bath ? ['#ffffff', '#e8f5fa', '#9bc9df'] : ['#f8ffffe8', '#d3f3f1c7', '#91c9daeb']), '#4284a3', 2.5);
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    const waterHeight = clamp(filled / TARGET, 0, 1) * (h - 14);
    if (waterHeight > 0) {
      ctx.save(); ctx.beginPath(); ctx.roundRect(x + 5, y + 4, w - 10, h - 8, [0, 0, 10, 10]); ctx.clip();
      const waterY = y + h - 5 - waterHeight;
      ctx.fillStyle = surface(ctx, x, waterY, w, Math.max(1, waterHeight), ['#86edff', '#32c4ed', '#1496d1']); ctx.fillRect(x + 4, waterY, w - 8, h);
      line(ctx, Array.from({ length: 13 }, (_, i) => ({ x: x + 5 + i * (w - 10) / 12, y: waterY + Math.sin(time * 5 + i * .8) * 1.4 })), '#bdffff', 3);
      for (let i = 0; i < 3; i++) circle(ctx, x + 14 + i * 15, y + h - 12 - ((time * 7 + i * 9) % Math.max(4, waterHeight - 3)), 1.6 + (i % 2), '#c8faff90');
      ctx.restore();
    }
    ctx.setLineDash([3, 3]);
    line(ctx, [{ x: x + 5, y: y + 11 }, { x: x + w - 5, y: y + 11 }], '#dfab51', 1.4);
    ctx.setLineDash([]);
    line(ctx, [{ x: x + 9, y: y + 18 }, { x: x + 9, y: y + h - 18 }], '#ffffffdd', 3);
    const faceY = y + h * .66;
    circle(ctx, x + w * .38, faceY - 3, 2.5, '#284c63');
    circle(ctx, x + w * .64, faceY - 3, 2.5, '#284c63');
    ctx.beginPath();
    if (filled >= TARGET) ctx.arc(x + w * .51, faceY + 1, 6, 0, Math.PI);
    else if (filled > 0) ctx.arc(x + w * .51, faceY + 1, 4, 0, Math.PI);
    else ctx.arc(x + w * .51, faceY + 6, 3.5, Math.PI, 0);
    ctx.strokeStyle = '#284c63'; ctx.lineWidth = 2; ctx.stroke();
    rounded(ctx, x - 4, y - 3, w + 8, 8, 4, surface(ctx, x, y - 3, w, 8, ['#ffffff', '#d5faff', '#80bdd7']), '#4e8ba4', 1.7);
    line(ctx, [{ x: x + 3, y: y - 1 }, { x: x + w - 3, y: y - 1 }], '#ffffff', 2);
    line(ctx, [{ x: x + 15, y: y + h - 5 }, { x: x + w - 15, y: y + h - 5 }], '#ecffffb0', 2);
    ctx.restore();
  }
  function mole(ctx, x, y, happy) {
    if (spriteArt(ctx, 'buddy', x, y + 3, 60, 64)) return;
    ctx.save(); ctx.translate(x, y);
    rounded(ctx, -14, 4, 28, 24, 11, '#628dbc', '#385879', 1.5);
    circle(ctx, -12, -8, 5, '#a96a46'); circle(ctx, 12, -8, 5, '#a96a46');
    circle(ctx, 0, -1, 17, '#bc885c', '#724a35', 1.5);
    rounded(ctx, -17, -18, 34, 12, [12, 12, 3, 3], '#ffd663', '#b88431', 1.5);
    rounded(ctx, -20, -9, 40, 5, 2, '#ffe68b'); circle(ctx, 0, -12, 5, '#fffbcc', '#b88431');
    circle(ctx, -6, 0, 2, '#252e36'); circle(ctx, 6, 0, 2, '#252e36');
    circle(ctx, 0, 6, 5, '#ebbc8f'); circle(ctx, 0, 4, 2.5, '#55382e');
    if (happy) { ctx.beginPath(); ctx.arc(0, 8, 5, 0, Math.PI); ctx.strokeStyle = '#55382e'; ctx.lineWidth = 1.5; ctx.stroke(); }
    line(ctx, [{ x: 11, y: 18 }, { x: 25, y: 9 }], '#e5c693', 5);
    line(ctx, [{ x: 22, y: 14 }, { x: 29, y: 2 }], '#bcced8', 4);
    ctx.restore();
  }

  class WaterBase {
    constructor(options = {}) {
      this.level = clamp(Math.floor(options.level || 1), 1, 5);
      this.levelCount = 5; this.status = 'playing'; this.score = 0; this.time = 0;
      this.released = false; this.collected = 0; this.lost = 0; this.emitted = 0;
      this.accumulator = 0; this.releaseTime = 0; this.drag = null;
      this.random = options.random || (() => .5);
      this.feedback = ''; this.feedbackTime = 0;
    }
    finishCheck(activeCount) {
      this.score = this.collected * 10;
      if (this.collected >= TARGET) {
        this.status = 'success'; this.score += Math.round(Math.max(0, 24 - this.releaseTime) * 10);
      } else if (this.released && ((this.emitted >= WATER && activeCount === 0) || this.releaseTime >= 24 || this.lost > WATER - TARGET)) {
        this.status = 'failure';
      }
    }
    cancelPointer() { this.drag = null; }
    notice(message) { this.feedback = message; this.feedbackTime = 1.8; }
    key(key) { if (key === ' ' || key === 'Enter') this.perform('release'); if (key === 'z' || key === 'Z') this.perform('undo'); if (key === 'c' || key === 'C') this.perform('clear'); }
    commonSnapshot() {
      return { level: this.level, levelCount: 5, status: this.status, score: this.score, released: this.released,
        collected: this.collected, target: TARGET, totalWater: WATER, emitted: this.emitted, lost: this.lost,
        releaseTime: Number(this.releaseTime.toFixed(3)), feedback: this.feedback };
    }
    fieldMessage(ctx, color) {
      if (this.feedbackTime > 0) {
        rounded(ctx, 24, 449, 312, 25, 12, '#ffffffed', '#ffffff');
        label(ctx, this.feedback, 180, 462, 11, color, 'center');
      }
    }
  }

  class HappyCup extends WaterBase {
    constructor(options) {
      super(options); this.config = CUP_LEVELS[this.level - 1];
      const [x, y] = this.config.cup;
      this.cup = { x, y, w: 64, h: 60 };
      this.source = { x: this.config.source[0], y: this.config.source[1] };
      this.strokes = []; this.inkUsed = 0; this.particles = [];
      this.instruction = this.config.hint + '；画好后点「放水」';
    }
    actions() { return [
      { id: 'undo', label: '撤销', disabled: this.released || !this.strokes.length },
      { id: 'clear', label: '清空', disabled: this.released || !this.strokes.length },
      { id: 'release', label: this.released ? '水流中' : '放水', disabled: this.released || this.status !== 'playing' }
    ]; }
    perform(id) {
      if (this.status !== 'playing' || this.released) return;
      if (id === 'release') { this.released = true; this.cancelPointer(); }
      else if (id === 'undo') { this.strokes.pop(); this.cancelPointer(); this.countInk(); }
      else if (id === 'clear') { this.strokes = []; this.inkUsed = 0; this.cancelPointer(); }
    }
    countInk() { this.inkUsed = this.strokes.reduce((sum, stroke) => sum + stroke.slice(1).reduce((n, p, i) => n + distance(p, stroke[i]), 0), 0); }
    pointerDown(input) {
      if (this.status !== 'playing' || this.released || input.y < 114 || input.y > 473) return;
      if (this.strokes.length >= 16) { this.notice('最多 16 笔，可撤销后重新画'); return; }
      const p = point(input); this.drag = [p]; this.strokes.push(this.drag);
    }
    pointerMove(input) {
      if (!this.drag || this.released) return;
      const p = point(input), previous = this.drag[this.drag.length - 1];
      let length = distance(previous, p);
      if (length < 2) return;
      const remaining = this.config.ink - this.inkUsed;
      if (remaining <= .01) { this.notice('墨水用完了，试试更短的水道'); return; }
      if (length > remaining) { const ratio = remaining / length; p.x = previous.x + (p.x - previous.x) * ratio; p.y = previous.y + (p.y - previous.y) * ratio; length = remaining; }
      this.drag.push(p); this.inkUsed += length;
    }
    pointerUp(input) { if (input && this.drag) this.pointerMove(input); this.cancelPointer(); }
    collideSegment(p, a, b, thickness = 3) {
      const dx = b.x - a.x, dy = b.y - a.y, lengthSquared = dx * dx + dy * dy;
      if (lengthSquared < .01) return;
      const t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared, 0, 1);
      const qx = a.x + dx * t, qy = a.y + dy * t;
      let nx = p.x - qx, ny = p.y - qy, d = Math.hypot(nx, ny);
      const minimum = p.r + thickness;
      if (d >= minimum) return;
      if (d < .0001) { const length = Math.sqrt(lengthSquared); nx = dy / length; ny = -dx / length; if (ny > 0) { nx *= -1; ny *= -1; } d = 1; }
      else { nx /= d; ny /= d; }
      p.x = qx + nx * minimum; p.y = qy + ny * minimum;
      const normalVelocity = p.vx * nx + p.vy * ny;
      if (normalVelocity < 0) { p.vx -= normalVelocity * nx; p.vy -= normalVelocity * ny; }
      p.vx *= .998; p.vy *= .998;
    }
    physicsStep(dt) {
      this.releaseTime += dt;
      const shouldEmit = Math.min(WATER, Math.floor(this.releaseTime * 14) + 1);
      while (this.emitted < shouldEmit) {
        const i = this.emitted++;
        this.particles.push({ x: this.source.x + 4 + ((i * 7) % 11 - 5) * .52, y: this.source.y + 10, vx: ((i * 11) % 9 - 4) * .5, vy: 25, r: 2.7 });
      }
      const c = this.cup;
      const permanent = this.config.obstacles.map(([x, y, w, h]) => [
        [{ x, y }, { x: x + w, y }], [{ x, y }, { x, y: y + h }],
        [{ x: x + w, y }, { x: x + w, y: y + h }], [{ x, y: y + h }, { x: x + w, y: y + h }]
      ]).flat();
      permanent.push([{ x: c.x + 2, y: c.y }, { x: c.x + 2, y: c.y + c.h }],
        [{ x: c.x + c.w - 2, y: c.y }, { x: c.x + c.w - 2, y: c.y + c.h }],
        [{ x: c.x, y: c.y + c.h }, { x: c.x + c.w, y: c.y + c.h }]);
      for (const p of this.particles) {
        p.vy = Math.min(500, p.vy + 490 * dt); p.vx *= .9997;
        p.x += p.vx * dt; p.y += p.vy * dt;
        for (let pass = 0; pass < 2; pass++) {
          for (const stroke of this.strokes) for (let i = 1; i < stroke.length; i++) this.collideSegment(p, stroke[i - 1], stroke[i]);
          for (const [a, b] of permanent) this.collideSegment(p, a, b, 2);
        }
        if (p.x > c.x + 6.5 && p.x < c.x + c.w - 6.5 && p.y > c.y + 10 && p.y < c.y + c.h - 5) { p.dead = true; this.collected++; }
        else if (p.y > 477 || p.x < 0 || p.x > 360) { p.dead = true; this.lost++; }
      }
      this.particles = this.particles.filter(p => !p.dead);
      this.finishCheck(this.particles.length);
    }
    update(dt) {
      if (this.status !== 'playing') return;
      const elapsed = clamp(Number(dt) || 0, 0, .1); this.time += elapsed; this.feedbackTime = Math.max(0, this.feedbackTime - elapsed);
      if (!this.released) return;
      this.accumulator += elapsed;
      while (this.accumulator >= 1 / 120 && this.status === 'playing') { this.physicsStep(1 / 120); this.accumulator -= 1 / 120; }
    }
    snapshot() { return { ...this.commonSnapshot(), mode: 'happy-cup', inkUsed: Math.round(this.inkUsed), inkBudget: this.config.ink,
      strokes: this.strokes.map(s => s.map(p => ({ ...p }))), source: { ...this.source }, cup: { ...this.cup },
      particles: this.particles.map(p => ({ x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 })),
      obstacles: this.config.obstacles.map(r => r.slice()) }; }
    draw(ctx) {
      ctx.save(); ctx.beginPath(); ctx.rect(0, TOP, W, BOTTOM - TOP); ctx.clip();
      if (!sceneArt(ctx, 'happy-cup')) {
      const sky = ctx.createLinearGradient(0, TOP, 0, 480); sky.addColorStop(0, '#85d7ed'); sky.addColorStop(1, '#fff1c4');
      ctx.fillStyle = sky; ctx.fillRect(0, TOP, W, BOTTOM - TOP);
      // Original ceramic workshop: tiled wall, window, plants, cork shelf.
      ctx.strokeStyle = '#ffffff35'; ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 116); ctx.lineTo(x, 445); ctx.stroke(); }
      for (let y = 116; y < 445; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      rounded(ctx, 122, 126, 112, 89, 10, '#e6faff', '#ffffff', 5);
      ctx.save(); ctx.beginPath(); ctx.roundRect(128, 132, 100, 76, 5); ctx.clip();
      circle(ctx, 208, 149, 16, '#ffe3a0');
      ctx.fillStyle = '#9bc4b1'; ctx.beginPath(); ctx.moveTo(124, 209); ctx.lineTo(162, 177); ctx.lineTo(185, 196); ctx.lineTo(212, 171); ctx.lineTo(238, 209); ctx.fill();
      ctx.restore(); line(ctx, [{ x: 178, y: 128 }, { x: 178, y: 211 }], '#ffffff', 4);
      rounded(ctx, 0, 454, 360, 30, 0, surface(ctx, 0, 454, 360, 30, ['#f2c387', '#bf8955']));
      line(ctx, [{ x: 0, y: 456 }, { x: 360, y: 456 }], '#f6d1a1', 4);
      for (let i = 0; i < 8; i++) line(ctx, [{ x: i * 53 + 8, y: 475 }, { x: i * 53 + 39, y: 475 }], '#aa805e', 1);
      }
      for (const [x, y, w, h] of this.config.obstacles) {
        ctx.save(); ctx.shadowColor = '#624c3f35'; ctx.shadowBlur = 5; ctx.shadowOffsetY = 4;
        rounded(ctx, x, y + 3, w, h, 5, '#a36435', '#835132', 2);
        ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        rounded(ctx, x, y, w, Math.max(6, h - 4), 4, surface(ctx, x, y, w, h, ['#ffe0a1', '#e2a158', '#c67d3e']), '#b07840', 1);
        line(ctx, [{ x: x + 5, y: y + 3 }, { x: x + w - 5, y: y + 3 }], '#fff0c4', 2);
        line(ctx, [{ x: x + 13, y: y + h * .56 }, { x: x + w * .57, y: y + h * .48 }, { x: x + w - 13, y: y + h * .58 }], '#c88949', 1);
        for (const nailX of [x + 7, x + w - 7]) { circle(ctx, nailX, y + h - 3, 2, '#8f6742'); circle(ctx, nailX - .4, y + h - 3.5, .8, '#e5d5a8'); }
        ctx.restore();
      }
      for (const stroke of this.strokes) { line(ctx, stroke.map(p => ({ x: p.x, y: p.y + 3 })), '#295d7133', 9); line(ctx, stroke, '#3988a2', 7); line(ctx, stroke, '#dafff5', 3.3); line(ctx, stroke.map(p => ({ x: p.x, y: p.y - .6 })), '#ffffffbb', 1.2); }
      cupArt(ctx, this.cup, this.collected, this.time, false);
      faucet(ctx, this.source.x, this.source.y, this.released);
      for (const p of this.particles) droplet(ctx, p.x, p.y, p.r);
      gauge(ctx, 14, 86, 148, this.collected / TARGET, '#2baadd', `接水 ${this.collected} / ${TARGET}`);
      gauge(ctx, 170, 86, 176, 1 - this.inkUsed / this.config.ink, '#d79858', `墨水 ${Math.max(0, Math.round(this.config.ink - this.inkUsed))} / ${this.config.ink}`);
      if (!this.released && !this.strokes.length) {
        const guideY = this.source.y + 56;
        circle(ctx, this.source.x + 4, guideY, 15 + Math.sin(this.time * 3), '#ffffff55', '#ffffff', 1.5);
        label(ctx, '从这里画斜坡', this.source.x > 180 ? this.source.x - 5 : this.source.x + 7, guideY + 28, 11, '#55747b', this.source.x > 180 ? 'right' : 'left');
      }
      this.fieldMessage(ctx, '#4f7180'); ctx.restore();
    }
  }

  // Terrain is a real editable occupancy mask. Every droplet conserves one unit
  // of water and moves only to an immediately adjacent, empty, non-rock cell.
  // Gravity is attempted first, then diagonal flow and horizontal spreading.
  const CELL = 8, COLS = 42, ROWS = 40, GRID_X = 12, GRID_Y = 160;
  const SOIL_TONES = [
    ['#dea365', '#e5ac70', '#dda062', '#e1a769', '#dca16a'],
    ['#ce8d53', '#d8985b', '#d09354', '#cb8a50', '#d49459'],
    ['#bc7c49', '#c8844e', '#c17e47', '#b87946', '#c58450']
  ];
  class SpringDig extends WaterBase {
    constructor(options) {
      super(options); this.config = DIG_LEVELS[this.level - 1];
      this.cup = { x: this.config.cup, y: 420, w: 68, h: 48 };
      this.source = { x: this.config.source, y: 149 };
      this.soil = new Uint8Array(COLS * ROWS); this.rocks = new Uint8Array(COLS * ROWS);
      this.history = []; this.dug = 0; this.drops = []; this.tick = 0;
      for (let row = 0; row < ROWS; row++) for (let col = 0; col < COLS; col++) {
        const x = GRID_X + col * CELL + 4, y = GRID_Y + row * CELL + 4, index = row * COLS + col;
        this.soil[index] = y >= 184 && y < 440 ? 1 : 0;
        if (x >= this.cup.x && x <= this.cup.x + this.cup.w && y >= this.cup.y - 6) this.soil[index] = 0;
        if (this.config.rocks.some(([rx, ry, rw, rh]) => x >= rx && x <= rx + rw && y >= ry && y <= ry + rh)) { this.rocks[index] = 1; this.soil[index] = 0; }
      }
      this.instruction = this.config.hint + '；挖好后点「开闸」';
    }
    actions() { return [
      { id: 'undo', label: '撤销', disabled: this.released || !this.history.length },
      { id: 'clear', label: '复原', disabled: this.released || !this.history.length },
      { id: 'release', label: this.released ? '水流中' : '开闸', disabled: this.released || this.status !== 'playing' }
    ]; }
    perform(id) {
      if (this.status !== 'playing' || this.released) return;
      if (id === 'release') { this.released = true; this.cancelPointer(); }
      else if (id === 'undo') { const cells = this.history.pop() || []; for (const i of cells) this.soil[i] = 1; this.dug -= cells.length; this.cancelPointer(); }
      else if (id === 'clear') { for (const cells of this.history) for (const i of cells) this.soil[i] = 1; this.history = []; this.dug = 0; this.cancelPointer(); }
    }
    digAt(p) {
      const radius = 19;
      const minCol = clamp(Math.floor((p.x - radius - GRID_X) / CELL), 0, COLS - 1), maxCol = clamp(Math.floor((p.x + radius - GRID_X) / CELL), 0, COLS - 1);
      const minRow = clamp(Math.floor((p.y - radius - GRID_Y) / CELL), 0, ROWS - 1), maxRow = clamp(Math.floor((p.y + radius - GRID_Y) / CELL), 0, ROWS - 1);
      for (let row = minRow; row <= maxRow; row++) for (let col = minCol; col <= maxCol; col++) {
        const i = row * COLS + col, x = GRID_X + col * CELL + 4, y = GRID_Y + row * CELL + 4;
        if (this.dug >= this.config.budget) { this.notice('挖掘额度已用完，可撤销重画'); return; }
        if (this.soil[i] && !this.rocks[i] && Math.hypot(p.x - x, p.y - y) <= radius) { this.soil[i] = 0; this.drag.cells.push(i); this.dug++; }
      }
    }
    pointerDown(input) {
      if (this.status !== 'playing' || this.released || input.y < 150 || input.y > 472) return;
      if (this.history.length >= 60) { this.notice('可先撤销，再调整水道'); return; }
      const p = point(input), cells = []; this.drag = { last: p, cells }; this.history.push(cells); this.digAt(p);
    }
    pointerMove(input) {
      if (!this.drag || this.released) return;
      const p = point(input), last = this.drag.last, steps = Math.max(1, Math.ceil(distance(last, p) / 5));
      for (let i = 1; i <= steps; i++) this.digAt({ x: last.x + (p.x - last.x) * i / steps, y: last.y + (p.y - last.y) * i / steps });
      this.drag.last = p;
    }
    pointerUp(input) { if (input && this.drag) this.pointerMove(input); this.cancelPointer(); }
    physicsStep() {
      this.tick++; this.releaseTime += .04;
      const occupied = new Set(this.drops.map(p => p.row * COLS + p.col));
      const desired = Math.min(WATER, Math.floor(this.releaseTime * 12) + 1);
      if (this.emitted < desired) {
        const sourceCol = clamp(Math.floor((this.source.x - GRID_X) / CELL), 0, COLS - 1);
        const candidates = [sourceCol, sourceCol - 1, sourceCol + 1];
        const col = candidates.find(c => c >= 0 && c < COLS && !occupied.has(c));
        if (col !== undefined) { const id = this.emitted++; this.drops.push({ col, row: 0, oldCol: col, oldRow: 0, id }); occupied.add(col); }
      }
      const free = (col, row) => {
        if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
        const x = GRID_X + col * CELL + 4, y = GRID_Y + row * CELL + 4, c = this.cup;
        const touchesBath = y >= c.y && y <= c.y + c.h + 4 && x >= c.x - 3 && x <= c.x + c.w + 3;
        if (touchesBath && (x < c.x + 7 || x > c.x + c.w - 7 || y > c.y + c.h - 6)) return false;
        return !this.soil[row * COLS + col] && !this.rocks[row * COLS + col] && !occupied.has(row * COLS + col);
      };
      // Bottom-first means an upper droplet can replace the vacated cell below.
      this.drops.sort((a, b) => b.row - a.row || a.id - b.id);
      for (const p of this.drops) {
        p.oldCol = p.col; p.oldRow = p.row; occupied.delete(p.row * COLS + p.col);
        const side = ((p.id * 7 + Math.floor(this.tick / 5)) % 2) ? 1 : -1;
        // Diagonal flow may not clip through an impermeable rock/soil corner.
        const choices = [[p.col, p.row + 1]];
        for (const direction of [side, -side]) if (free(p.col + direction, p.row)) choices.push([p.col + direction, p.row + 1]);
        choices.push([p.col + side, p.row], [p.col - side, p.row]);
        const destination = choices.find(([col, row]) => free(col, row));
        if (destination) [p.col, p.row] = destination;
        const x = GRID_X + p.col * CELL + 4, y = GRID_Y + p.row * CELL + 4;
        if (x > this.cup.x + 6 && x < this.cup.x + this.cup.w - 6 && y > this.cup.y + 6 && y < this.cup.y + this.cup.h) { this.collected++; p.dead = true; }
        else if (p.row >= ROWS - 1 || p.col <= 0 || p.col >= COLS - 1) { this.lost++; p.dead = true; }
        if (!p.dead) occupied.add(p.row * COLS + p.col);
      }
      this.drops = this.drops.filter(p => !p.dead);
      this.finishCheck(this.drops.length);
    }
    update(dt) {
      if (this.status !== 'playing') return;
      const elapsed = clamp(Number(dt) || 0, 0, .1); this.time += elapsed; this.feedbackTime = Math.max(0, this.feedbackTime - elapsed);
      if (!this.released) return;
      this.accumulator += elapsed;
      while (this.accumulator >= .04 && this.status === 'playing') { this.physicsStep(); this.accumulator -= .04; }
    }
    snapshot() { return { ...this.commonSnapshot(), mode: 'spring-dig', dug: this.dug, digBudget: this.config.budget,
      source: { ...this.source }, cup: { ...this.cup }, grid: { x: GRID_X, y: GRID_Y, cell: CELL, cols: COLS, rows: ROWS },
      soil: Array.from(this.soil), rocks: Array.from(this.rocks), strokes: this.history.length,
      particles: this.drops.map(p => ({ x: GRID_X + p.col * CELL + 4, y: GRID_Y + p.row * CELL + 4 })) }; }
    draw(ctx) {
      ctx.save(); ctx.beginPath(); ctx.rect(0, TOP, W, BOTTOM - TOP); ctx.clip();
      const hasScene = sceneArt(ctx, 'spring-dig');
      if (!hasScene) {
      const sky = ctx.createLinearGradient(0, 80, 0, 185); sky.addColorStop(0, '#a9e1ec'); sky.addColorStop(1, '#e6f6e2');
      ctx.fillStyle = sky; ctx.fillRect(0, TOP, W, 110);
      ctx.fillStyle = '#86b76a'; ctx.beginPath(); ctx.moveTo(0, 175); ctx.quadraticCurveTo(83, 119, 182, 178); ctx.quadraticCurveTo(294, 133, 360, 173); ctx.lineTo(360, 203); ctx.lineTo(0, 203); ctx.fill();
      const ground = ctx.createLinearGradient(0, 184, 0, 484); ground.addColorStop(0, '#a87950'); ground.addColorStop(1, '#674939');
      ctx.fillStyle = ground; ctx.fillRect(0, 184, W, 300);
      }
      // Dark excavated channels remain visible; only solid soil cells get clay.
      ctx.fillStyle = surface(ctx, GRID_X, 184, COLS * CELL, 256, ['#81502e', '#6c422c', '#573624']); ctx.fillRect(GRID_X, 184, COLS * CELL, 256);
      const open = index => index < 0 || index >= this.soil.length || (!this.soil[index] && !this.rocks[index]);
      for (let row = 3; row < 35; row++) for (let col = 0; col < COLS; col++) {
        const i = row * COLS + col;
        if (!this.soil[i]) continue;
        const x = GRID_X + col * CELL, y = GRID_Y + row * CELL;
        const tone = (col * 7 + row * 11) % 5;
        const soilTones = SOIL_TONES[row < 8 ? 0 : row < 18 ? 1 : 2];
        ctx.fillStyle = soilTones[tone]; ctx.fillRect(x, y, CELL + .3, CELL + .3);
        const mark = (col * 17 + row * 13) % 29;
        if (mark < 5) { rounded(ctx, x + 1, y + 2, mark % 3 + 2, 2, 1, '#f2c48680'); }
        if (mark > 24) { circle(ctx, x + 5, y + 5, 1, '#8c542d66'); circle(ctx, x + 4.6, y + 4.5, .5, '#f7d19a99'); }
        if (open(i - COLS)) { ctx.fillStyle = '#f6c789'; ctx.fillRect(x, y, CELL, 2); ctx.fillStyle = '#ffe0a270'; ctx.fillRect(x + 1, y, CELL - 2, 1); }
        if (open(i + COLS)) { ctx.fillStyle = '#8f562e'; ctx.fillRect(x, y + CELL - 2, CELL, 2); }
        if (col > 0 && open(i - 1)) { ctx.fillStyle = '#efb779'; ctx.fillRect(x, y + 1, 1.5, CELL - 1); }
        if (col < COLS - 1 && open(i + 1)) { ctx.fillStyle = '#9f6036'; ctx.fillRect(x + CELL - 1.5, y + 1, 1.5, CELL - 1); }
      }
      for (const [x, y, width, height] of this.config.rocks) {
        rounded(ctx, x + 2, y + 5, width, height, 11, '#533f39aa');
        if (spriteArt(ctx, 'stone', x + width / 2, y + height / 2, width * 1.2, height * 1.2)) continue;
        ctx.beginPath(); ctx.moveTo(x + 9, y); ctx.lineTo(x + width - 11, y + 2); ctx.lineTo(x + width, y + 12); ctx.lineTo(x + width - 5, y + height - 3); ctx.lineTo(x + 12, y + height); ctx.lineTo(x, y + height - 12); ctx.lineTo(x + 2, y + 12); ctx.closePath();
        ctx.fillStyle = surface(ctx, x, y, width, height, ['#d5d9ca', '#a3b0a4', '#758d86']); ctx.fill(); ctx.strokeStyle = '#596f67'; ctx.lineWidth = 2; ctx.stroke();
        line(ctx, [{ x: x + 12, y: y + 7 }, { x: x + width - 16, y: y + 8 }, { x: x + width - 8, y: y + 14 }], '#d4d0ba', 3);
        line(ctx, [{ x: x + width * .56, y: y + 13 }, { x: x + width * .45, y: y + height - 8 }, { x: x + width * .6, y: y + height - 4 }], '#7b837c', 2);
      }
      // Turf and small flowers frame the terrain without obscuring its openings.
      for (let x = 0; x < W; x += 11) {
        if (Math.abs(x - this.source.x) < 22) continue;
        const col = clamp(Math.floor((x - GRID_X) / CELL), 0, COLS - 1);
        if (!this.soil[3 * COLS + col]) continue;
        rounded(ctx, x, 181, 13, 7 + (x % 3), 4, surface(ctx, x, 181, 13, 9, ['#b1e95b', '#71ba36', '#57952d']));
        line(ctx, [{ x: x + 2, y: 182 }, { x: x + 10, y: 182 }], '#d3f894', 1.2);
        if (x % 33 === 0) { line(ctx, [{ x: x + 3, y: 181 }, { x: x + 6, y: 170 }], '#5d8d46', 2); for (let p = 0; p < 5; p++) circle(ctx, x + 6 + Math.cos(p * Math.PI * .4) * 2.3, 169 + Math.sin(p * Math.PI * .4) * 2.3, 1.7, x % 66 ? '#fff8c9' : '#ffdab5'); circle(ctx, x + 6, 169, 1.5, '#ffc84e'); }
      }
      cupArt(ctx, this.cup, this.collected, this.time, true);
      const interp = clamp(this.accumulator / .04, 0, 1);
      for (const p of this.drops) {
        const x = GRID_X + (p.oldCol + (p.col - p.oldCol) * interp) * CELL + 4, y = GRID_Y + (p.oldRow + (p.row - p.oldRow) * interp) * CELL + 4;
        droplet(ctx, x, y, 4.3);
      }
      faucet(ctx, this.source.x - 4, this.source.y, this.released);
      mole(ctx, this.cup.x < 150 ? 314 : 45, 450, this.collected >= TARGET);
      gauge(ctx, 14, 86, 148, this.collected / TARGET, '#219ee3', `泉水 ${this.collected} / ${TARGET}`);
      gauge(ctx, 170, 86, 176, 1 - this.dug / this.config.budget, '#bc8848', `可挖 ${this.config.budget - this.dug} 格`);
      if (!this.released && !this.dug) { circle(ctx, this.source.x, 202, 19, '#ffffff30', '#fff6d8', 1.5); label(ctx, '拖动挖土', this.source.x, 230, 11, '#5d492d', 'center'); }
      if (this.drag) circle(ctx, this.drag.last.x, this.drag.last.y, 19, '#ffffff15', '#ffefb6', 1.5);
      this.fieldMessage(ctx, '#70583b'); ctx.restore();
    }
  }
  root.AirvanaPhysicsModes = { ...(root.AirvanaPhysicsModes || {}), 'happy-cup': HappyCup, 'spring-dig': SpringDig };
})(typeof window !== 'undefined' ? window : globalThis);
