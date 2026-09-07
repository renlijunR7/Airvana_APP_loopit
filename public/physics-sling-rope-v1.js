/* Original Airvana physics worlds. Painted assets are optional; authored Canvas fallbacks remain available. */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const validPoint = p => p && Number.isFinite(p.x) && Number.isFinite(p.y);
  function artBackground(c, key) {
    try { return !!(root.AirvanaPhysicsArt && typeof root.AirvanaPhysicsArt.background === 'function' && root.AirvanaPhysicsArt.background(c, key, 0, 0, 360, 560)); }
    catch (_) { return false; }
  }
  function artSprite(c, name, x, y, w, h, angle = 0) {
    try { return !!(root.AirvanaPhysicsArt && typeof root.AirvanaPhysicsArt.sprite === 'function' && root.AirvanaPhysicsArt.sprite(c, name, x, y, w, h, angle)); }
    catch (_) { return false; }
  }
  function roundRect(c, x, y, w, h, radius, fill, stroke, lineWidth = 2) {
    c.beginPath(); c.roundRect(x, y, w, h, radius); if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lineWidth; c.stroke(); }
  }
  function oval(c, x, y, rx, ry, fill, stroke, lineWidth = 2) {
    c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fillStyle = fill; c.fill();
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lineWidth; c.stroke(); }
  }
  function line(c, points, color, width = 2) {
    c.beginPath(); points.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]));
    c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
  }
  function star(c, x, y, r, fill = '#ffd84e', stroke = '#b87a17') {
    c.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, rr = i % 2 ? r * .47 : r; const xx = x + Math.cos(a) * rr, yy = y + Math.sin(a) * rr; if (i) c.lineTo(xx, yy); else c.moveTo(xx, yy); }
    c.closePath(); c.fillStyle = fill; c.fill(); c.lineWidth = 1.5; c.strokeStyle = stroke; c.stroke();
  }
  function text(c, value, x, y, size = 12, fill = '#344858', align = 'left') {
    c.font = '700 ' + size + 'px system-ui, sans-serif'; c.fillStyle = fill; c.textAlign = align; c.textBaseline = 'middle'; c.fillText(String(value), x, y);
  }
  function cloud(c, x, y, scale = 1, fill = '#fff') {
    c.save(); c.translate(x, y); c.scale(scale, scale); c.beginPath(); c.moveTo(-35, 10); c.bezierCurveTo(-60, 5, -45, -22, -24, -18); c.bezierCurveTo(-18, -48, 22, -45, 28, -20); c.bezierCurveTo(50, -25, 65, 4, 41, 12); c.closePath(); c.fillStyle = fill; c.fill(); c.restore();
  }
  function particles(model, x, y, color, count = 12) {
    for (let i = 0; i < count; i++) { const a = i / count * TAU; model.particles.push({ x, y, vx: Math.cos(a) * (35 + (i % 3) * 17), vy: Math.sin(a) * 55 - 25, age: 0, color }); }
  }
  function tickParticles(model, dt) {
    model.particles = model.particles.filter(p => { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += dt * 90; return p.age < .8; });
  }
  function drawParticles(model, c) {
    model.particles.forEach(p => { c.globalAlpha = 1 - p.age / .8; star(c, p.x, p.y, 3.5, p.color, p.color); }); c.globalAlpha = 1;
  }
  function puff(c, x, y, radius, angle = 0) {
    c.save(); c.shadowColor = '#56351f45'; c.shadowBlur = Math.max(2, radius * .3); c.shadowOffsetY = Math.max(1, radius * .12);
    const painted = artSprite(c, 'sling-ball', x, y, radius * 2.65, radius * 2.65, angle); c.restore(); if (painted) return;
    c.save(); c.translate(x, y); c.rotate(angle); oval(c, 0, 3, radius, radius * .92, '#ed8733', '#9d491e');
    oval(c, -radius * .1, -radius * .17, radius * .89, radius * .83, '#ffbe57');
    oval(c, -radius * .4, -radius * .45, radius * .25, radius * .14, '#ffe5a0');
    oval(c, -radius * .28, 0, 2, 3, '#41313e'); oval(c, radius * .28, 0, 2, 3, '#41313e');
    line(c, [[-3, 5], [0, 7], [3, 5]], '#9d491e', 1.5);
    c.beginPath(); c.moveTo(-3, -radius + 1); c.quadraticCurveTo(-2, -radius - 11, 5, -radius - 7); c.quadraticCurveTo(12, -radius - 10, 10, -radius - 1); c.fillStyle = '#4caa74'; c.fill(); c.restore();
  }
  const SLING_LEVELS = [
    { name: '第一座云堡', ammo: 4, structures: [[252, 1]], targets: [[252, 423]] },
    { name: '双子瞭望塔', ammo: 4, structures: [[224, 1], [309, 1]], targets: [[224, 423], [309, 423]] },
    { name: '空中岗哨', ammo: 5, structures: [[268, 2]], targets: [[268, 423], [268, 357]] },
    { name: '桥上的守卫', ammo: 5, structures: [[220, 2], [312, 1]], targets: [[220, 357], [312, 423]], bridge: true },
    { name: '云端大本营', ammo: 6, structures: [[216, 2], [309, 2]], targets: [[216, 423], [216, 357], [309, 357]], bridge: true }
  ];
  class CloudSling {
    constructor(options = {}) {
      if (!root.Matter) throw new Error('CloudSling requires the pinned Matter.js runtime.');
      this.level = clamp(Math.trunc(options.level || 1), 1, 5); this.levelCount = 5; this.config = SLING_LEVELS[this.level - 1];
      this.status = 'playing'; this.score = 0; this.time = 0; this.particles = []; this.accumulator = 0; this.shots = 0;
      this.ammo = this.config.ammo; this.anchor = { x: 66, y: 382 }; this.aim = { x: 16, y: 382 }; this.drag = null;
      this.projectile = null; this.shotAge = 0; this.blocks = []; this.targets = []; this.destroyed = false;
      const M = root.Matter; this.engine = M.Engine.create({ enableSleeping: true, gravity: { x: 0, y: .85 } });
      this.floor = M.Bodies.rectangle(180, 465, 650, 28, { isStatic: true, friction: .8, label: 'ground' });
      M.Composite.add(this.engine.world, this.floor);
      const addBlock = (x, y, w, h, style) => {
        const body = M.Bodies.rectangle(x, y, w, h, { density: .0011, friction: .5, frictionStatic: .8, restitution: .04, chamfer: { radius: 2 }, label: 'timber' });
        this.blocks.push({ body, w, h, style }); M.Composite.add(this.engine.world, body);
      };
      this.config.structures.forEach(([x, height]) => {
        for (let tier = 0; tier < height; tier++) {
          const bottom = 451 - tier * 66;
          addBlock(x - 28, bottom - 26, 12, 52, tier % 2 ? 'blue' : 'wood');
          addBlock(x + 28, bottom - 26, 12, 52, tier % 2 ? 'blue' : 'wood');
          addBlock(x, bottom - 58, 76, 12, 'wood');
        }
      });
      if (this.config.bridge) addBlock(267, 372, 94, 10, 'blue');
      this.config.targets.forEach(([x, y]) => {
        const body = M.Bodies.circle(x, y, 16, { density: .0015, friction: .75, restitution: .12, label: 'cloud-guard' });
        const target = { body, hp: 2, alive: true, origin: { x, y } }; this.targets.push(target); M.Composite.add(this.engine.world, body);
      });
      for (let i = 0; i < 90; i++) M.Engine.update(this.engine, 1000 / 60);
      this.targets.forEach(t => { t.origin = { ...t.body.position }; });
      this.collisionHandler = event => {
        if (this.status !== 'playing' || this.shots === 0) return;
        event.pairs.forEach(pair => {
          const a = pair.bodyA, b = pair.bodyB;
          this.targets.forEach(target => {
            if (!target.alive || (target.body !== a && target.body !== b)) return;
            const other = target.body === a ? b : a;
            const speed = Math.hypot(other.velocity.x - target.body.velocity.x, other.velocity.y - target.body.velocity.y);
            if (other.label === 'sun-puff' && speed > .75) this.hit(target, 2);
            else if (speed > 1.4 && other.label !== 'cloud-guard') this.hit(target, speed > 3 ? 2 : 1);
          });
        });
      };
      M.Events.on(this.engine, 'collisionStart', this.collisionHandler);
    }
    get instruction() { return this.projectile ? '击中云团，推倒木塔；弹丸落稳后可继续发射' : '拖住左下角太阳团，向后拉，松手发射'; }
    get title() { return this.config.name; }
    hit(target, damage) {
      if (!target.alive) return; target.hp -= damage;
      particles(this, target.body.position.x, target.body.position.y, '#a3e5ff', 7);
      if (target.hp <= 0) { target.alive = false; this.score += 100; root.Matter.Composite.remove(this.engine.world, target.body); }
    }
    launch() {
      if (this.status !== 'playing' || this.ammo < 1 || this.projectile) return false;
      const M = root.Matter, point = this.drag || this.aim;
      let dx = this.anchor.x - point.x, dy = this.anchor.y - point.y;
      if (Math.hypot(dx, dy) < 8) { dx = 50; dy = 0; }
      this.projectile = M.Bodies.circle(this.anchor.x, this.anchor.y, 13, { density: .008, friction: .55, frictionAir: .002, restitution: .25, label: 'sun-puff' });
      M.Composite.add(this.engine.world, this.projectile); M.Body.setVelocity(this.projectile, { x: dx * .205, y: dy * .205 });
      this.ammo--; this.shots++; this.shotAge = 0; this.drag = null; return true;
    }
    pointerDown(point) { if (this.status === 'playing' && !this.projectile && this.ammo && validPoint(point) && distance(point, this.anchor) < 58) { this.drag = { ...this.anchor }; this.pointerMove(point); } }
    pointerMove(point) {
      if (!this.drag || !validPoint(point)) return;
      let dx = point.x - this.anchor.x, dy = point.y - this.anchor.y;
      const scale = Math.min(1, 64 / Math.max(1, Math.hypot(dx, dy)));
      this.drag = { x: this.anchor.x + dx * scale, y: this.anchor.y + dy * scale };
      this.aim = { ...this.drag };
    }
    pointerUp(point) { if (this.drag) { this.pointerMove(point); this.launch(); } }
    cancelPointer() { this.drag = null; }
    actions() { return [{ id: 'aim-low', label: '低角度', disabled: !!this.projectile }, { id: 'aim-high', label: '高角度', disabled: !!this.projectile }, { id: 'launch', label: '发射', disabled: !!this.projectile || this.ammo === 0 }]; }
    perform(id) {
      if (this.status !== 'playing' || this.projectile) return;
      if (id === 'aim-low') this.aim = { x: 16, y: 372 };
      if (id === 'aim-high') this.aim = { x: 16, y: 387 };
      if (id === 'launch') this.launch();
    }
    key(key) { if (key === ' ' || key === 'Enter') this.launch(); else if (key === 'ArrowUp') this.perform('aim-high'); else if (key === 'ArrowDown') this.perform('aim-low'); }
    update(dt) {
      if (this.destroyed) return; dt = clamp(Number(dt) || 0, 0, .1); tickParticles(this, dt);
      if (this.status !== 'playing') return;
      this.time += dt; this.accumulator += dt;
      while (this.accumulator >= 1 / 120) {
        root.Matter.Engine.update(this.engine, 1000 / 120); this.accumulator -= 1 / 120;
        this.targets.forEach(t => { if (t.alive && (t.body.position.y > 482 || t.body.position.x < -25 || t.body.position.x > 390)) this.hit(t, 2); });
      }
      if (this.targets.every(t => !t.alive)) { this.status = 'success'; this.score += this.ammo * 40; particles(this, 180, 235, '#ffe079', 24); return; }
      if (this.projectile) {
        this.shotAge += dt; const p = this.projectile.position;
        if (this.shotAge > 6 || p.x < -45 || p.x > 410 || p.y > 500 || (this.shotAge > 1.3 && this.projectile.speed < .7)) {
          root.Matter.Composite.remove(this.engine.world, this.projectile); this.projectile = null;
        }
      }
      if (!this.projectile && this.ammo === 0) this.status = 'failure';
    }
    draw(c) {
      c.save(); c.beginPath(); c.rect(0, 80, 360, 405); c.clip();
      const paintedWorld = artBackground(c, 'cloud-sling');
      if (!paintedWorld) {
      const sky = c.createLinearGradient(0, 80, 0, 455); sky.addColorStop(0, '#71c6eb'); sky.addColorStop(1, '#d7f5f4'); c.fillStyle = sky; c.fillRect(0, 80, 360, 405);
      oval(c, 299, 135, 28, 28, '#ffed9d'); oval(c, 294, 130, 23, 23, '#fff4b9');
      cloud(c, 64, 169, .75, '#ebfbff'); cloud(c, 188, 112, .55, '#f9ffff'); cloud(c, 333, 232, .65, '#f0fbff');
      c.fillStyle = '#b3dfc7'; c.beginPath(); c.moveTo(0, 418); c.quadraticCurveTo(100, 324, 205, 424); c.quadraticCurveTo(310, 350, 360, 405); c.lineTo(360, 484); c.lineTo(0, 484); c.fill();
      for (const [x, y] of [[12, 315], [140, 345], [318, 307]]) {
        roundRect(c, x, y, 24, 95, 4, '#abd4d9'); c.fillStyle = '#96c3d0'; c.beginPath(); c.moveTo(x - 6, y + 4); c.lineTo(x + 12, y - 20); c.lineTo(x + 30, y + 4); c.fill();
        roundRect(c, x + 7, y + 14, 10, 20, 5, '#d5eff0');
      }
      }
      if (paintedWorld) { c.save(); c.shadowColor = '#4d442c2b'; c.shadowBlur = 4; c.shadowOffsetY = 2; roundRect(c, 11, 85, 208, 29, 13, '#fff9ecef', '#dbbc83', 1); c.restore(); }
      text(c, this.config.name, 18, 102, 13, '#295e73');
      roundRect(c, 234, 86, 110, 28, 14, '#ffffffdc'); text(c, '云团 ' + this.targets.filter(t => !t.alive).length + '/' + this.targets.length, 289, 100, 12, '#347787', 'center');
      if (!paintedWorld) {
      c.fillStyle = '#a8d77a'; c.fillRect(0, 448, 360, 38); c.fillStyle = '#70b06d'; c.fillRect(0, 451, 360, 6);
      for (let x = 12; x < 360; x += 28) { line(c, [[x, 465], [x + 2, 460], [x + 5, 465], [x + 8, 462]], '#86bd6d', 1.5); }
      } else {
        this.config.structures.forEach(([x]) => { oval(c, x, 452, 47, 5, '#3e442b32'); oval(c, x, 450, 43, 3, '#d9c9a24d'); });
        oval(c, 66, 451, 25, 5, '#37442645');
      }
      this.blocks.forEach(({ body, w, h, style }) => {
        c.save(); c.shadowColor = '#41281750'; c.shadowBlur = 3; c.shadowOffsetY = 2;
        const vertical = h > w, material = style === 'blue' ? 'glass' : 'wood';
        const paintedBlock = artSprite(c, material, body.position.x, body.position.y, Math.max(w, h) * 1.15, Math.min(w, h) * 1.25, body.angle + (vertical ? Math.PI / 2 : 0));
        c.restore(); if (paintedBlock) return;
        c.save(); c.translate(body.position.x, body.position.y); c.rotate(body.angle);
        const blue = style === 'blue'; roundRect(c, -w / 2, -h / 2, w, h, 2, blue ? '#97d9e7' : '#cc854c', blue ? '#387e9b' : '#8a532d', 1.5);
        line(c, [[-w / 2 + 3, -h / 2 + 3], [w / 2 - 3, -h / 2 + 3]], blue ? '#d9f6ff' : '#f5c784', 2);
        if (h > w) { line(c, [[-1, -h / 2 + 9], [-2, h / 2 - 8]], '#a8653d', 1); oval(c, 1, 8, 2, 4, '#b47646'); }
        else for (const xx of [-w / 2 + 7, w / 2 - 7]) oval(c, xx, 0, 1.6, 1.6, '#73472e'); c.restore();
      });
      this.targets.filter(t => t.alive).forEach(t => {
        const position = t.body.position; c.save(); c.shadowColor = '#1c413448'; c.shadowBlur = 4; c.shadowOffsetY = 2;
        if (t.hp < 2) c.globalAlpha = .78;
        const paintedTarget = artSprite(c, 'target', position.x, position.y - 1, 42, 42, t.body.angle); c.restore();
        if (paintedTarget) { if (t.hp < 2) { c.save(); c.translate(position.x, position.y); c.rotate(t.body.angle); line(c, [[-3, -12], [0, -8], [-2, -5]], '#ffe6a6', 1.5); c.restore(); } return; }
        const p = t.body.position; c.save(); c.translate(p.x, p.y); c.rotate(t.body.angle); oval(c, 0, 3, 16, 14, '#468da9', '#336681');
        oval(c, 0, -1, 15, 13, t.hp < 2 ? '#b6d4d9' : '#b8e7f0'); oval(c, -10, -5, 8, 8, '#cdecf4'); oval(c, 8, -7, 9, 8, '#cdecf4');
        oval(c, -5, 0, 2, 3, '#254c65'); oval(c, 6, 0, 2, 3, '#254c65'); line(c, [[-7, -6], [-2, -4]], '#254c65', 2); line(c, [[3, -4], [8, -6]], '#254c65', 2);
        line(c, [[-4, 8], [3, 6], [8, 8]], '#51809c', 2); c.restore();
      });
      c.save(); c.shadowColor = '#493a2759'; c.shadowBlur = 3; c.shadowOffsetX = 2; c.shadowOffsetY = 2;
      line(c, [[59, 447], [64, 399], [46, 369]], '#82482c', 13); line(c, [[64, 410], [82, 370]], '#82482c', 11);
      c.restore();
      line(c, [[59, 444], [63, 400], [48, 371]], '#d6954f', 5); line(c, [[65, 402], [81, 371]], '#d6954f', 4);
      line(c, [[60, 442], [64, 401], [49, 374]], '#f6c876', 1.5); line(c, [[67, 397], [80, 374]], '#f6c876', 1.5);
      for (const x of [47, 82]) { line(c, [[x - 3, 371], [x + 3, 373]], '#b66d39', 5); line(c, [[x - 3, 368], [x + 3, 370]], '#e3b260', 2); }
      const aim = this.drag || this.aim;
      if (!this.projectile && this.ammo > 0 && this.status === 'playing') {
        const visual = this.drag || this.anchor; line(c, [[47, 370], [visual.x, visual.y], [82, 370]], '#603c42', 4); puff(c, visual.x, visual.y, 13);
        if (this.drag) {
          const vx = (this.anchor.x - aim.x) * .205, vy = (this.anchor.y - aim.y) * .205;
          for (let i = 1; i < 17; i++) { const t = i * 2.5, x = this.anchor.x + vx * t, y = this.anchor.y + vy * t + .118 * t * t; if (x > 354 || y > 448 || y < 80) break; oval(c, x, y, 2.6, 2.6, '#ffffffcc'); }
        } else { line(c, [[45, 398], [30, 410]], '#fff', 2); line(c, [[32, 402], [30, 410], [38, 410]], '#fff', 2); }
      }
      if (this.projectile) puff(c, this.projectile.position.x, this.projectile.position.y, 13, this.projectile.angle);
      for (let i = 0; i < Math.min(this.ammo, 6); i++) puff(c, 17 + i * 19, 468, 7);
      drawParticles(this, c); c.restore();
    }
    snapshot() { return { mode: 'cloud-sling', level: this.level, title: this.title, status: this.status, score: this.score, ammo: this.ammo, shots: this.shots, time: this.time, aim: { ...this.aim }, targets: this.targets.map(t => ({ x: t.body.position.x, y: t.body.position.y, hp: t.hp, alive: t.alive })), projectile: this.projectile ? { x: this.projectile.position.x, y: this.projectile.position.y, vx: this.projectile.velocity.x, vy: this.projectile.velocity.y } : null, blockCount: this.blocks.length }; }
    destroy() { if (this.destroyed) return; this.destroyed = true; root.Matter.Events.off(this.engine, 'collisionStart', this.collisionHandler); root.Matter.Composite.clear(this.engine.world, false); root.Matter.Engine.clear(this.engine); this.particles = []; }
  }
  const ROPE_LEVELS = [
    { name: '甜点初体验', candy: [180, 220], anchors: [[180, 112]], goal: [180, 431], stars: [[180, 275], [180, 327], [180, 378]], hazards: [] },
    { name: '钟摆配送', candy: [116, 222], anchors: [[180, 112]], goal: [270, 431], stars: [[196, 240], [251, 308], [271, 367]], hazards: [] },
    { name: '双绳协奏', candy: [180, 222], anchors: [[105, 112], [255, 112]], goal: [275, 431], stars: [[217, 249], [268, 310], [276, 374]], hazards: [] },
    { name: '绕过小刺球', candy: [139, 225], anchors: [[219, 111]], goal: [277, 431], stars: [[224, 251], [274, 307], [279, 373]], hazards: [[153, 347, 23]] },
    { name: '午夜甜品快递', candy: [180, 221], anchors: [[110, 109], [250, 109]], goal: [82, 431], stars: [[146, 263], [96, 321], [83, 378]], hazards: [[219, 343, 25]] }
  ];
  const pointSegment = (p, a, b) => { const dx = b.x - a.x, dy = b.y - a.y, t = clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / Math.max(1, dx * dx + dy * dy), 0, 1); return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy); };
  function intersects(a, b, c, d) {
    const cross = (p, q, r) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
    const ab1 = cross(a, b, c), ab2 = cross(a, b, d), cd1 = cross(c, d, a), cd2 = cross(c, d, b);
    return (ab1 * ab2 < 0 && cd1 * cd2 < 0) || pointSegment(a, c, d) < 10 || pointSegment(b, c, d) < 10;
  }
  class CandySwing {
    constructor(options = {}) {
      this.level = clamp(Math.trunc(options.level || 1), 1, 5); this.levelCount = 5; this.config = ROPE_LEVELS[this.level - 1];
      this.status = 'playing'; this.score = 0; this.time = 0; this.particles = []; this.accumulator = 0; this.destroyed = false;
      this.candy = { x: this.config.candy[0], y: this.config.candy[1], vx: 0, vy: 0, radius: 12, angle: 0 };
      this.goal = { x: this.config.goal[0], y: this.config.goal[1], radius: 30 };
      this.ropes = this.config.anchors.map(([x, y], i) => ({ id: i, x, y, length: Math.hypot(x - this.candy.x, y - this.candy.y), active: true, cutAt: 0 }));
      this.stars = this.config.stars.map(([x, y]) => ({ x, y, collected: false })); this.hazards = this.config.hazards.map(([x, y, radius]) => ({ x, y, radius }));
      this.pointer = null; this.swipes = []; this.cuts = 0;
    }
    get instruction() { return this.ropes.some(r => r.active) ? '划过绳子剪断它，把糖果送进甜点精灵嘴里' : '糖果正在下落！收集星星，避开刺球'; }
    get title() { return this.config.name; }
    cut(index) {
      const rope = this.ropes[index]; if (this.status !== 'playing' || !rope || !rope.active) return false;
      rope.active = false; rope.cutAt = this.time; this.cuts++;
      particles(this, (rope.x + this.candy.x) / 2, (rope.y + this.candy.y) / 2, '#ffecc1', 7); return true;
    }
    cutBetween(a, b) { this.ropes.forEach((r, i) => { if (r.active && intersects(a, b, r, this.candy)) this.cut(i); }); }
    pointerDown(point) { if (this.status !== 'playing' || !validPoint(point)) return; this.pointer = { ...point }; this.cutBetween(point, point); }
    pointerMove(point) { if (!this.pointer || !validPoint(point)) return; this.cutBetween(this.pointer, point); this.swipes.push({ a: { ...this.pointer }, b: { ...point }, age: 0 }); this.pointer = { ...point }; }
    pointerUp(point) { if (this.pointer && validPoint(point)) this.pointerMove(point); this.pointer = null; }
    cancelPointer() { this.pointer = null; }
    actions() { return this.ropes.map((r, i) => ({ id: 'cut-' + i, label: this.ropes.length === 1 ? '剪断绳子' : i === 0 ? '剪左绳' : '剪右绳', disabled: !r.active })); }
    perform(id) { const match = /^cut-(\d+)$/.exec(id); if (match) this.cut(Number(match[1])); }
    key(key) { if (key === '1' || key === '2') this.cut(Number(key) - 1); else if (key === ' ' || key === 'Enter') { const next = this.ropes.findIndex(r => r.active); if (next >= 0) this.cut(next); } }
    step(h) {
      const p = this.candy, oldX = p.x, oldY = p.y; p.vy += 515 * h; p.x += p.vx * h; p.y += p.vy * h;
      for (let iteration = 0; iteration < 7; iteration++) this.ropes.forEach(r => {
        if (!r.active) return; const dx = p.x - r.x, dy = p.y - r.y, d = Math.hypot(dx, dy);
        if (d > r.length) { p.x = r.x + dx / d * r.length; p.y = r.y + dy / d * r.length; }
      });
      p.vx = (p.x - oldX) / h * .9995; p.vy = (p.y - oldY) / h * .9995;
      if (p.x < 13) { p.x = 13; p.vx = Math.abs(p.vx) * .65; } if (p.x > 347) { p.x = 347; p.vx = -Math.abs(p.vx) * .65; }
      p.angle += p.vx * h / 40;
      this.stars.forEach(s => { if (!s.collected && distance(p, s) < 25) { s.collected = true; this.score += 100; particles(this, s.x, s.y, '#ffcf42', 10); } });
      if (this.hazards.some(o => distance(p, o) < o.radius + 9)) { this.status = 'failure'; particles(this, p.x, p.y, '#e9827f'); return; }
      if (p.vy >= 0 && Math.abs(p.x - this.goal.x) < 29 && p.y > this.goal.y - 22 && p.y < this.goal.y + 17) {
        this.status = 'success'; this.score += 300 + Math.max(0, Math.round((45 - this.time) * 3)); particles(this, this.goal.x, this.goal.y - 16, '#ffdc67', 22); return;
      }
      if (p.y > 481 || this.time >= 45) { this.status = 'failure'; particles(this, p.x, Math.min(p.y, 471), '#e9827f'); }
    }
    update(dt) {
      if (this.destroyed) return; dt = clamp(Number(dt) || 0, 0, .1); tickParticles(this, dt);
      this.swipes = this.swipes.filter(s => { s.age += dt; return s.age < .22; });
      if (this.status !== 'playing') return;
      this.time += dt; this.accumulator += dt;
      while (this.accumulator >= 1 / 120 && this.status === 'playing') { this.step(1 / 120); this.accumulator -= 1 / 120; }
    }
    draw(c) {
      c.save(); c.beginPath(); c.rect(0, 80, 360, 405); c.clip();
      const paintedWorld = artBackground(c, 'candy-swing');
      if (!paintedWorld) {
      const bg = c.createLinearGradient(0, 80, 0, 484); bg.addColorStop(0, '#f7dbb1'); bg.addColorStop(1, '#fff1d6'); c.fillStyle = bg; c.fillRect(0, 80, 360, 405);
      for (let x = 0; x < 360; x += 36) { c.fillStyle = '#efcea5'; c.fillRect(x, 80, 14, 345); }
      roundRect(c, 264, 155, 74, 117, 32, '#aa7356', '#80523f', 3); roundRect(c, 271, 161, 60, 103, 27, '#8dd4df');
      cloud(c, 307, 191, .3, '#fff4df'); line(c, [[301, 160], [301, 264]], '#f7ead0', 5); line(c, [[272, 213], [330, 213]], '#f7ead0', 5);
      roundRect(c, 16, 156, 66, 11, 3, '#b67852', '#8b583d');
      for (let i = 0; i < 3; i++) { roundRect(c, 23 + i * 19, 127 - i % 2 * 9, 14, 28 + i % 2 * 9, 4, ['#eaa4a8', '#aacba5', '#dcb2de'][i], '#bd8479', 1); roundRect(c, 22 + i * 19, 124 - i % 2 * 9, 16, 6, 2, '#fbf0d6', '#ae8b71', 1); }
      }
      if (paintedWorld) { c.save(); c.shadowColor = '#68412729'; c.shadowBlur = 4; c.shadowOffsetY = 2; roundRect(c, 9, 85, 231, 28, 13, '#fff6e9ee', '#e2b583', 1); c.restore(); }
      text(c, this.config.name, 16, 99, 13, '#775342');
      roundRect(c, 255, 86, 88, 25, 12, '#fff8e8'); text(c, Math.ceil(Math.max(0, 45 - this.time)) + ' 秒', 299, 98, 12, '#966e4b', 'center');
      if (!paintedWorld) {
      for (let i = 0; i < 9; i++) { c.fillStyle = i % 2 ? '#e9b1aa' : '#f4c9bb'; c.fillRect(i * 44, 453, 44, 32); }
      c.fillStyle = '#986548'; c.fillRect(0, 450, 360, 8); c.fillStyle = '#cb9470'; c.fillRect(0, 449, 360, 4);
      }
      this.stars.forEach(s => {
        if (s.collected) return;
        c.save(); c.shadowColor = '#ffd75d8c'; c.shadowBlur = 9; c.shadowOffsetY = 1;
        const paintedStar = artSprite(c, 'star', s.x, s.y, 31, 31, Math.sin(this.time * 1.3 + s.y) * .08); c.restore();
        if (!paintedStar) { oval(c, s.x, s.y + 2, 13, 13, '#fff4c8'); star(c, s.x, s.y, 10); }
      });
      this.hazards.forEach(o => {
        c.save(); c.translate(o.x, o.y); c.rotate(this.time * .7); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; c.beginPath(); c.moveTo(Math.cos(a - .16) * (o.radius - 2), Math.sin(a - .16) * (o.radius - 2)); c.lineTo(Math.cos(a) * (o.radius + 4), Math.sin(a) * (o.radius + 4)); c.lineTo(Math.cos(a + .16) * (o.radius - 2), Math.sin(a + .16) * (o.radius - 2)); c.fillStyle = '#765b76'; c.fill(); }
        const paintedStone = artSprite(c, 'stone', 0, 0, o.radius * 2.5, o.radius * 2.5);
        if (!paintedStone) { oval(c, 0, 0, o.radius - 2, o.radius - 2, '#b88aa3', '#765b76'); oval(c, -6, -6, 4, 5, '#d9adc0'); }
        oval(c, -5, 2, 2, 2, '#684860'); oval(c, 5, 2, 2, 2, '#684860'); c.restore();
      });
      const g = this.goal, happy = this.status === 'success';
      oval(c, g.x, 457, 40, 7, '#bb96835c');
      c.save(); c.shadowColor = '#64394545'; c.shadowBlur = 5; c.shadowOffsetY = 3;
      const paintedBuddy = artSprite(c, 'buddy', g.x, g.y - 6, 96, 96); c.restore();
      if (!paintedBuddy) {
      // A strawberry-pastry spirit with cream ears and a chocolate mouth, not an existing character.
      oval(c, g.x - 25, g.y + 13, 10, 10, '#cc708d'); oval(c, g.x + 25, g.y + 13, 10, 10, '#cc708d');
      oval(c, g.x, g.y, 35, 30, '#ca6f8d', '#925772'); oval(c, g.x, g.y - 6, 34, 29, '#f5b2bd');
      oval(c, g.x - 22, g.y - 27, 10, 14, '#fff2d7', '#ba8790'); oval(c, g.x + 22, g.y - 27, 10, 14, '#fff2d7', '#ba8790');
      oval(c, g.x - 12, g.y - 13, 4, 6, '#634258'); oval(c, g.x + 12, g.y - 13, 4, 6, '#634258');
      oval(c, g.x - 13, g.y - 15, 1.3, 1.8, '#fff'); oval(c, g.x + 11, g.y - 15, 1.3, 1.8, '#fff');
      oval(c, g.x, g.y + 8, happy ? 14 : 22, happy ? 8 : 17, '#62364a'); oval(c, g.x, g.y + 17, 11, 6, '#ef8d9e');
      oval(c, g.x - 24, g.y - 2, 6, 3, '#f68f9f'); oval(c, g.x + 24, g.y - 2, 6, 3, '#f68f9f');
      c.beginPath(); c.moveTo(g.x - 9, g.y - 33); c.quadraticCurveTo(g.x - 4, g.y - 48, g.x + 5, g.y - 35); c.quadraticCurveTo(g.x + 15, g.y - 43, g.x + 10, g.y - 30); c.fillStyle = '#79ad7a'; c.fill();
      } else if (happy) {
        for (const [dx, dy, radius] of [[-32, -42, 7], [34, -43, 9], [4, -55, 6]]) star(c, g.x + dx, g.y + dy, radius, '#fff0a6', '#d6a347');
      }
      this.ropes.forEach((r, i) => {
        oval(c, r.x + 1, r.y + 2, 11, 8, '#72442f35'); oval(c, r.x, r.y, 10, 8, '#aa7052', '#825342'); oval(c, r.x, r.y - 2, 7, 5, '#dfb978'); oval(c, r.x - 1, r.y - 3, 4, 2, '#fff1c5');
        if (r.active) {
          line(c, [[r.x + 1, r.y + 1], [this.candy.x + 1, this.candy.y + 1]], '#6f452c55', 6);
          line(c, [[r.x, r.y], [this.candy.x, this.candy.y]], '#90623c', 5); line(c, [[r.x - 1, r.y], [this.candy.x - 1, this.candy.y]], '#ecdba7', 3);
          const dx = this.candy.x - r.x, dy = this.candy.y - r.y, length = Math.hypot(dx, dy), nx = -dy / Math.max(1, length), ny = dx / Math.max(1, length);
          for (let along = 10; along < length - 6; along += 8) { const t = along / length, x = r.x + dx * t, y = r.y + dy * t; line(c, [[x + nx * 1.7 - dx / Math.max(1, length) * 1.5, y + ny * 1.7 - dy / Math.max(1, length) * 1.5], [x - nx * 1.7 + dx / Math.max(1, length) * 1.5, y - ny * 1.7 + dy / Math.max(1, length) * 1.5]], '#b58b53', 1); }
        }
        else if (this.time - r.cutAt < .7) { const len = (1 - (this.time - r.cutAt) / .7) * r.length * .4; line(c, [[r.x, r.y], [r.x + Math.sin(this.time * 10) * 8, r.y + len]], '#ad8751', 3); }
        if (this.ropes.length > 1) text(c, i + 1, r.x, r.y - 15, 10, '#88633e', 'center');
      });
      if (this.status !== 'success') {
        const candy = this.candy; c.save(); c.shadowColor = '#733d4b40'; c.shadowBlur = 4; c.shadowOffsetY = 2;
        const paintedCandy = artSprite(c, 'candy', candy.x, candy.y, 56, 38, candy.angle); c.restore();
        if (!paintedCandy) {
        const p = this.candy; c.save(); c.translate(p.x, p.y); c.rotate(p.angle);
        c.fillStyle = '#86bfd0'; c.beginPath(); c.moveTo(-9, -7); c.lineTo(-21, -11); c.lineTo(-19, 9); c.lineTo(-8, 6); c.fill(); c.beginPath(); c.moveTo(9, -7); c.lineTo(21, -11); c.lineTo(19, 9); c.lineTo(8, 6); c.fill();
        oval(c, 0, 0, 13, 13, '#e788a0', '#a46075'); oval(c, -2, -3, 10, 10, '#ffd2cb');
        c.beginPath(); for (let i = 0; i < 38; i++) { const a = i / 5, r = .9 + i / 4.6; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (i) c.lineTo(x, y); else c.moveTo(x, y); } c.strokeStyle = '#e37f9b'; c.lineWidth = 3; c.stroke(); oval(c, -5, -6, 3, 2, '#fff3de'); c.restore();
        }
      }
      this.swipes.forEach(s => { c.globalAlpha = 1 - s.age / .22; line(c, [[s.a.x, s.a.y], [s.b.x, s.b.y]], '#fff', 4); }); c.globalAlpha = 1;
      drawParticles(this, c); c.restore();
    }
    snapshot() { return { mode: 'candy-swing', level: this.level, title: this.title, status: this.status, score: this.score, time: this.time, remaining: Math.max(0, 45 - this.time), candy: { ...this.candy }, goal: { ...this.goal }, cuts: this.cuts, ropes: this.ropes.map(r => ({ ...r })), stars: this.stars.map(s => ({ ...s })), hazards: this.hazards.map(h => ({ ...h })) }; }
    destroy() { this.destroyed = true; this.pointer = null; this.particles = []; this.swipes = []; }
  }
  CloudSling.levelCount = CandySwing.levelCount = 5;
  root.AirvanaPhysicsModes = Object.assign(root.AirvanaPhysicsModes || {}, { 'cloud-sling': CloudSling, 'candy-swing': CandySwing });
})(typeof window !== 'undefined' ? window : globalThis);
