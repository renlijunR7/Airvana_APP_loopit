/* Reference Arcade: original artwork, deterministic local gameplay, no commercial rewards. */
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const point = p => p && Number.isFinite(p.x) && Number.isFinite(p.y);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function rect(c, x, y, w, h, fill, stroke) { c.fillStyle = fill; c.fillRect(x, y, w, h); if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1; c.strokeRect(x, y, w, h); } }
  function ellipse(c, x, y, rx, ry, fill, stroke) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fillStyle = fill; c.fill(); if (stroke) { c.strokeStyle = stroke; c.lineWidth = 1.8; c.stroke(); } }
  function path(c, points, fill, stroke, width = 2) { c.beginPath(); points.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); if (fill) { c.closePath(); c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = width; c.lineJoin = 'round'; c.stroke(); } }
  function label(c, value, x, y, size = 12, color = '#fff', align = 'left') { c.font = '800 ' + size + 'px system-ui,sans-serif'; c.fillStyle = color; c.textAlign = align; c.textBaseline = 'middle'; c.fillText(String(value), x, y); }
  function rounded(c, x, y, w, h, r, fill, stroke) { c.beginPath(); c.roundRect(x, y, w, h, r); c.fillStyle = fill; c.fill(); if (stroke) { c.strokeStyle = stroke; c.lineWidth = 2; c.stroke(); } }
  function sparks(m, x, y, color, n = 12) { for (let i = 0; i < n && m.particles.length < 120; i++) { const a = i / n * TAU; m.particles.push({ x, y, vx: Math.cos(a) * (25 + i % 4 * 15), vy: Math.sin(a) * 58, age: 0, color }); } }
  function tickSparks(m, dt) { m.particles = m.particles.filter(p => { p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; return p.age < .7; }); }
  function drawSparks(m, c) { m.particles.forEach(p => { c.globalAlpha = 1 - p.age / .7; rect(c, p.x, p.y, 3 + (p.age < .15 ? 3 : 0), 3, p.color); }); c.globalAlpha = 1; }
  function plane(c, x, y, kind, scale = 1, bank = 0) {
    c.save(); c.translate(Math.round(x), Math.round(y)); c.scale(scale, scale); c.rotate(bank);
    const friendly = kind === 'player', main = friendly ? '#b94435' : '#72936a', edge = friendly ? '#482b34' : '#273e40', light = friendly ? '#ffd077' : '#b9c784';
    rect(c, -23, -1, 46, 10, '#101c2790');
    path(c, [[-4,-25],[4,-25],[7,-7],[25,3],[25,10],[7,5],[6,17],[13,22],[13,26],[-13,26],[-13,22],[-6,17],[-7,5],[-25,10],[-25,3],[-7,-7]], main, edge, 2);
    rect(c, -3, -19, 6, 37, light); rect(c, -3, -14, 6, 15, '#263f51'); rect(c, -2, -12, 3, 10, '#72cde1');
    rect(c, -22, 3, 12, 3, light); rect(c, 10, 3, 12, 3, light); rect(c, -16, -1, 3, 12, edge); rect(c, 13, -1, 3, 12, edge);
    rect(c, -10, 22, 20, 2, light); rect(c, -10, -28, 20, 2, '#d1dadd'); rect(c, -2, -28, 4, 5, '#2a343e');
    if (friendly) { rect(c, -3, 27, 6, 8, '#fbd44a'); rect(c, -2, 27, 4, 5, '#fff1b6'); }
    c.restore();
  }
  class SkyRaid {
    constructor(options = {}) {
      this.level = clamp(Math.trunc(options.level || 1), 1, 3); this.levelCount = 3;
      this.title = ['赤沙前哨', '钢铁运输线', '风暴指挥舰'][this.level - 1];
      this.status = 'playing'; this.score = 0; this.time = 0; this.health = 5; this.maxHealth = 5; this.bombs = 2; this.shields = 1;
      this.player = { x: 180, y: 423, tx: 180, ty: 423 }; this.dragging = false; this.invulnerable = 0; this.shieldTime = 0;
      this.enemies = []; this.bullets = []; this.enemyBullets = []; this.particles = []; this.pickups = [];
      this.spawnIndex = 0; this.nextSpawn = .65; this.spawnTotal = 9 + this.level * 3; this.fireCooldown = 0; this.kills = 0; this.power = 1;
      this.boss = null; this.bossSpawned = false; this.flash = 0; this.destroyed = false; this.message = '';
    }
    get instruction() { return this.boss ? '拖动战机躲开红线；自动开火，击败指挥舰' : '拖动战机移动并自动射击，收集能量升级火力'; }
    spawnEnemy() {
      const i = this.spawnIndex++, type = i % 4 === 3 ? 'turret' : 'fighter';
      this.enemies.push({ id: i, x: 46 + (i * 73 + this.level * 17) % 268, y: 78, homeX: 46 + (i * 73 + this.level * 17) % 268, hp: type === 'turret' ? 10 : 4 + this.level, maxHp: type === 'turret' ? 10 : 4 + this.level, age: 0, type, cooldown: 1.5 + i % 3 * .25 });
    }
    fire() {
      const p = this.player;
      for (const offset of [-6, 6]) this.bullets.push({ x: p.x + offset, y: p.y - 25, vx: 0, vy: -410, damage: 1 });
      if (this.power > 1) for (const offset of [-1, 1]) this.bullets.push({ x: p.x + offset * 14, y: p.y - 16, vx: offset * 45, vy: -380, damage: 1 });
    }
    enemyFire(enemy) {
      const dx = this.player.x - enemy.x, dy = this.player.y - enemy.y, length = Math.max(1, Math.hypot(dx, dy)), speed = 82 + this.level * 11;
      this.enemyBullets.push({ x: enemy.x, y: enemy.y + 16, vx: dx / length * speed, vy: dy / length * speed, r: 4 });
      if (enemy.type === 'turret') for (const side of [-1, 1]) this.enemyBullets.push({ x: enemy.x + side * 12, y: enemy.y + 14, vx: dx / length * speed + side * 31, vy: dy / length * speed, r: 4 });
    }
    hurt() {
      if (this.status !== 'playing' || this.invulnerable > 0 || this.shieldTime > 0) return;
      this.health--; this.invulnerable = 1.1; this.flash = .15; sparks(this, this.player.x, this.player.y, '#ffb45e', 15);
      if (this.health <= 0) { this.status = 'failure'; this.message = '战机受损。留意瞄准红线，及时使用护盾或炸弹。'; this.cancelPointer(); }
    }
    killEnemy(enemy) {
      if (enemy.dead) return; enemy.dead = true; this.kills++; this.score += enemy.type === 'turret' ? 150 : 100; sparks(this, enemy.x, enemy.y, '#ffc04b', 16);
      if (this.kills % 3 === 0 && this.pickups.length < 8) this.pickups.push({ x: enemy.x, y: enemy.y, type: this.kills % 6 ? 'power' : 'repair' });
    }
    actions() { return [{ id: 'bomb', label: '清屏炸弹 ×' + this.bombs, disabled: this.status !== 'playing' || this.bombs < 1 }, { id: 'shield', label: '护盾 ×' + this.shields, disabled: this.status !== 'playing' || this.shields < 1 }]; }
    perform(id) {
      if (this.status !== 'playing' || this.destroyed) return false;
      if (id === 'bomb' && this.bombs > 0) {
        this.bombs--; this.enemyBullets = []; this.flash = .24;
        this.enemies.forEach(e => { e.hp -= 25; if (e.hp <= 0) this.killEnemy(e); });
        if (this.boss) { this.boss.hp = Math.max(0, this.boss.hp - 30); this.boss.laser = null; }
        sparks(this, 180, 260, '#fff0a8', 40); this.checkVictory(); return true;
      }
      if (id === 'shield' && this.shields > 0) { this.shields--; this.shieldTime = 4; return true; }
      return false;
    }
    pointerDown(p) { if (!this.destroyed && this.status === 'playing' && point(p)) { this.dragging = true; this.pointerMove(p); } }
    pointerMove(p) { if (!this.destroyed && this.status === 'playing' && this.dragging && point(p)) { this.player.tx = clamp(p.x, 24, 336); this.player.ty = clamp(p.y, 145, 458); } }
    pointerUp(p) { this.pointerMove(p); this.dragging = false; }
    cancelPointer() { this.dragging = false; }
    key(key) {
      if (this.status !== 'playing' || this.destroyed) return;
      if (key === ' ' || key === '1') this.perform('bomb'); else if (key === '2') this.perform('shield');
      else { const d = { ArrowLeft: [-18, 0], ArrowRight: [18, 0], ArrowUp: [0, -18], ArrowDown: [0, 18] }[key]; if (d) { this.player.tx = clamp(this.player.tx + d[0], 24, 336); this.player.ty = clamp(this.player.ty + d[1], 145, 458); } }
    }
    checkVictory() {
      if (this.status === 'playing' && this.boss && this.boss.hp <= 0) { this.status = 'success'; this.score += 1200 + this.health * 120 + this.bombs * 75; this.boss.hp = 0; this.cancelPointer(); }
    }
    update(dt) {
      if (this.status !== 'playing' || this.destroyed) return;
      dt = clamp(Number(dt) || 0, 0, .05); if (!dt) return; this.time += dt;
      this.invulnerable = Math.max(0, this.invulnerable - dt); this.shieldTime = Math.max(0, this.shieldTime - dt); this.flash = Math.max(0, this.flash - dt); tickSparks(this, dt);
      const p = this.player, dx = p.tx - p.x, dy = p.ty - p.y, ratio = Math.min(1, dt * 560 / Math.max(.001, Math.hypot(dx, dy))); p.x += dx * ratio; p.y += dy * ratio;
      this.fireCooldown -= dt; if (this.fireCooldown <= 0) { this.fire(); this.fireCooldown = .16; }
      if (this.spawnIndex < this.spawnTotal && this.time >= this.nextSpawn) { this.spawnEnemy(); this.nextSpawn += 1.2 - this.level * .08; }
      if (!this.bossSpawned && this.spawnIndex === this.spawnTotal && this.time > this.nextSpawn + 2) {
        this.bossSpawned = true; this.boss = { x: 180, y: 144, hp: 90 + this.level * 25, maxHp: 90 + this.level * 25, age: 0, cooldown: 1.2, laserCooldown: 4.2, laser: null };
      }
      this.enemies.forEach(e => { e.age += dt; e.y += dt * (e.type === 'turret' ? 29 : 43 + this.level * 3); e.x = clamp(e.homeX + Math.sin(e.age * 1.7 + e.id) * 23, 22, 338); e.cooldown -= dt; if (e.cooldown <= 0 && e.y < 375) { this.enemyFire(e); e.cooldown = 2.2 - this.level * .15; } if (!e.dead && dist(e, p) < 25) { this.hurt(); e.dead = true; } });
      const boss = this.boss;
      if (boss) {
        boss.age += dt; boss.x = 180 + Math.sin(boss.age * .6) * 91; boss.y = 145 + Math.sin(boss.age * .8) * 12; boss.cooldown -= dt; boss.laserCooldown -= dt;
        if (boss.cooldown <= 0) { for (let i = -2; i <= 2; i++) this.enemyBullets.push({ x: boss.x + i * 14, y: boss.y + 26, vx: i * (18 + this.level * 3), vy: 105 + this.level * 8, r: 4 }); boss.cooldown = 1.35 - this.level * .12; }
        if (boss.laserCooldown <= 0) { boss.laser = { x: p.x, age: 0 }; boss.laserCooldown = 4.5; }
        if (boss.laser) { boss.laser.age += dt; if (boss.laser.age > 1.15 && boss.laser.age < 1.6 && Math.abs(p.x - boss.laser.x) < 14) this.hurt(); if (boss.laser.age > 1.65) boss.laser = null; }
      }
      this.bullets.forEach(b => {
        b.x += b.vx * dt; b.y += b.vy * dt;
        const enemy = this.enemies.find(e => !e.dead && Math.abs(e.x - b.x) < (e.type === 'turret' ? 24 : 19) && Math.abs(e.y - b.y) < 24);
        if (enemy) { enemy.hp -= b.damage; b.dead = true; if (enemy.hp <= 0) this.killEnemy(enemy); }
        else if (boss && Math.abs(b.x - boss.x) < 48 && Math.abs(b.y - boss.y) < 27) { boss.hp -= b.damage; b.dead = true; sparks(this, b.x, b.y, '#fbea89', 2); }
      });
      this.enemyBullets.forEach(b => { b.x += b.vx * dt; b.y += b.vy * dt; if (dist(b, p) < 11 + b.r) { this.hurt(); b.dead = true; } });
      this.pickups = this.pickups.filter(item => { item.y += dt * 40; if (dist(item, p) < 28) { if (item.type === 'power') this.power = 2; else this.health = Math.min(this.maxHealth, this.health + 1); this.score += 50; sparks(this, item.x, item.y, '#81e5a5', 8); return false; } return item.y < 490; });
      this.bullets = this.bullets.filter(b => !b.dead && b.y > 72 && b.x > -20 && b.x < 380).slice(-100);
      this.enemyBullets = this.enemyBullets.filter(b => !b.dead && b.y < 500 && b.y > 75 && b.x > -20 && b.x < 380).slice(-100);
      this.enemies = this.enemies.filter(e => !e.dead && e.y < 505).slice(-24);
      if (this.status !== 'playing') return;
      this.checkVictory(); if (this.status === 'playing' && this.time > 75) { this.status = 'failure'; this.message = '突围时间结束。集中火力击破指挥舰！'; this.cancelPointer(); }
    }
    draw(c) {
      c.save(); c.beginPath(); c.rect(0, 78, 360, 410); c.clip();
      const palettes = [['#97574d','#b47560','#6b4b48'], ['#677579','#7d8985','#394f54'], ['#564e6b','#76647c','#383b52']][this.level - 1];
      rect(c, 0, 78, 360, 410, palettes[0]); const scroll = this.time * 29 % 188;
      for (let row = -1; row < 4; row++) { const y = 78 + row * 188 + scroll;
        for (let j = 0; j < 14; j++) { const x = (j * 79 + row * 23 + 720) % 360; rect(c, x, y + j * 11 % 168, 11 + j % 3 * 7, 3, palettes[j % 2 ? 1 : 2]); }
        path(c, [[260,y],[249,y+29],[273,y+64],[257,y+110],[267,y+153],[244,y+190]], null, palettes[2], 2);
        for (const x of [0, 318]) { rect(c, x, y + 15, 42, 135, '#37474c'); rect(c, x + 4, y + 20, 34, 126, '#596366'); rect(c, x + 8, y + 25, 26, 24, '#263c45'); for (let i = 0; i < 7; i++) rect(c, x + 6, y + 53 + i * 12, 30, 4, i % 2 ? '#343c40' : '#808879'); rect(c, x + 2, y + 13, 38, 4, '#b2aaa0'); }
        rect(c, 40, y + 66, 280, 7, '#343941'); rect(c, 40, y + 68, 280, 2, '#989999'); for (let x = 61; x < 315; x += 46) rect(c, x, y + 62, 5, 16, '#45505b', '#222f38');
        for (const x of [59, 104]) { rect(c, x, y + 104, 34, 48, '#36464b'); rect(c, x + 4, y + 100, 27, 46, '#687771'); rect(c, x + 8, y + 104, 19, 15, '#8a9881'); rect(c, x + 2, y + 119, 5, 14, '#263236'); rect(c, x + 28, y + 119, 5, 14, '#263236'); }
        rect(c, 182, y + 93, 58, 52, '#3b3c44'); rect(c, 186, y + 97, 50, 44, '#a18067'); for (let x = 188; x < 236; x += 12) rect(c, x, y + 97, 4, 44, '#625449'); rect(c, 184, y + 112, 54, 3, '#333944');
      }
      this.enemies.forEach(e => { if (e.type === 'turret') { c.save(); c.translate(e.x, e.y); ellipse(c, 0, 3, 25, 21, '#263d43'); rect(c, -21, -14, 42, 28, '#839292', '#243f4b'); rect(c, -13, -20, 26, 40, '#536f7c'); rect(c, -18, -10, 36, 20, '#657d88'); rect(c, -9, -8, 18, 16, '#b1b9a8'); rect(c, -4, 4, 8, 24, '#33444f'); rect(c, -2, 5, 3, 23, '#93a5a6'); c.restore(); } else plane(c, e.x, e.y, 'enemy', .72, Math.PI); rect(c, e.x - 18, e.y - 29, 36, 4, '#2b282d'); rect(c, e.x - 17, e.y - 28, 34 * Math.max(0, e.hp) / e.maxHp, 2, '#e46755'); });
      if (this.boss) { const b = this.boss; c.save(); c.translate(b.x, b.y); path(c, [[-51,-4],[-35,-20],[-11,-20],[-8,-32],[8,-32],[11,-20],[35,-20],[51,-4],[45,27],[20,27],[13,18],[-13,18],[-20,27],[-45,27]], '#526875', '#203944', 3); rect(c, -37, -12, 19, 32, '#bac2ab'); rect(c, 18, -12, 19, 32, '#bac2ab'); rect(c, -8, -23, 16, 43, '#657e8d'); rect(c, -6, -18, 12, 16, '#e68254'); rect(c, -5, -15, 10, 5, '#fff0a3'); for (const x of [-31, 27]) { rect(c, x, 9, 5, 22, '#202d3a'); rect(c, x + 1, 10, 2, 16, '#b4c5cd'); } c.restore(); rect(c, 64, 124, 232, 7, '#182b39'); rect(c, 65, 125, 230 * Math.max(0, b.hp) / b.maxHp, 5, '#efb14a'); if (b.laser) { const live = b.laser.age > 1.15; rect(c, b.laser.x - (live ? 9 : 1), b.y + 30, live ? 18 : 2, 400, live ? '#ffe995b8' : '#ff6b647d'); if (live) rect(c, b.laser.x - 2, b.y + 30, 4, 400, '#fffac9'); else label(c, '!', b.laser.x, 442, 19, '#fff0a3', 'center'); } }
      this.pickups.forEach(p => { rect(c, p.x - 9, p.y - 10, 18, 20, '#30433b'); rect(c, p.x - 7, p.y - 8, 14, 16, p.type === 'repair' ? '#8ce1a0' : '#f3d567'); label(c, p.type === 'repair' ? '+' : 'P', p.x, p.y, 13, '#294338', 'center'); });
      this.bullets.forEach(b => { rect(c, b.x - 2, b.y - 9, 4, 14, '#f4bb3e'); rect(c, b.x - 1, b.y - 9, 2, 9, '#fff6a8'); }); this.enemyBullets.forEach(b => { rect(c, b.x - 3, b.y - 4, 6, 8, '#ff644e'); rect(c, b.x - 1, b.y - 3, 2, 4, '#ffdf7e'); });
      if (this.invulnerable <= 0 || Math.floor(this.time * 10) % 2 === 0) plane(c, this.player.x, this.player.y, 'player', .82, clamp((this.player.tx - this.player.x) * .009, -.2, .2));
      if (this.shieldTime > 0) { c.beginPath(); c.arc(this.player.x, this.player.y, 33, 0, TAU); c.strokeStyle = '#99ebf1'; c.lineWidth = 3; c.stroke(); }
      drawSparks(this, c); rect(c, 11, 86, 338, 31, '#1d313be8'); label(c, this.title, 20, 101, 12, '#f5e0a8'); for (let i = 0; i < this.maxHealth; i++) rect(c, 153 + i * 14, 95, 10, 12, i < this.health ? '#8bce9c' : '#44565e'); label(c, this.boss ? 'BOSS' : '航程 ' + Math.min(100, Math.floor(this.spawnIndex / this.spawnTotal * 100)) + '%', 340, 101, 11, '#f5e0a8', 'right');
      rect(c, 14, 466, 332, 18, '#213439bf'); label(c, this.power > 1 ? '双翼散射已装载 · 炸弹可消除弹幕' : '自动射击 · 绿色补给修复机体', 180, 475, 10, '#f0e7c6', 'center');
      if (this.flash > 0) { c.globalAlpha = Math.min(.2, this.flash); rect(c, 0, 78, 360, 410, '#fff0bf'); c.globalAlpha = 1; } c.restore();
    }
    snapshot() { return { mode: 'sky-raid', level: this.level, title: this.title, status: this.status, score: this.score, time: this.time, health: this.health, bombs: this.bombs, shields: this.shields, shieldTime: this.shieldTime, invulnerable: this.invulnerable, power: this.power, kills: this.kills, player: { ...this.player }, dragging: this.dragging, spawned: this.spawnIndex, spawnTotal: this.spawnTotal, enemies: this.enemies.map(e => ({ id: e.id, x: e.x, y: e.y, hp: e.hp, type: e.type })), boss: this.boss ? { ...this.boss, laser: this.boss.laser ? { ...this.boss.laser } : null } : null, bullets: this.bullets.map(b => ({ ...b })), enemyBullets: this.enemyBullets.map(b => ({ ...b })), pickups: this.pickups.map(p => ({ ...p })), particleCount: this.particles.length }; }
    destroy() { if (this.destroyed) return; this.destroyed = true; this.cancelPointer(); this.enemies = []; this.bullets = []; this.enemyBullets = []; this.particles = []; this.pickups = []; }
  }
  const ISLAND_LEVELS = [
    { title: '薄荷海湾', ammo: 5, islands: [[258, 420, 104]], towers: [[258, 420, 1]], guards: [[258, 399]] },
    { title: '双瀑山谷', ammo: 6, islands: [[219, 425, 88], [299, 315, 86]], towers: [[219, 425, 1], [299, 315, 1]], guards: [[219, 404], [299, 294]] },
    { title: '悬空钟楼', ammo: 7, islands: [[212, 431, 82], [295, 329, 88], [218, 230, 100]], towers: [[212, 431, 1], [295, 329, 1], [218, 230, 1]], guards: [[212, 410], [295, 308], [218, 209]] }
  ];
  function leaf(c, x, y, size, fill, angle = 0) { c.save(); c.translate(x, y); c.rotate(angle); c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-size, -size, -size * .45, -size * 1.7, 0, -size * 2); c.bezierCurveTo(size * .5, -size * 1.4, size, -size * .2, 0, 0); c.fillStyle = fill; c.fill(); c.restore(); }
  function island(c, x, y, width, depth, near = true) { const colors = near ? ['#755f81','#514c70','#a8889b','#75c87b','#b5e183'] : ['#78bacb','#65a7c0','#95d6db','#7cc9bc','#a5e2d4']; path(c, [[x-width/2,y],[x-width*.36,y+depth*.56],[x-9,y+depth],[x+9,y+depth*.75],[x+width*.3,y+depth*.46],[x+width/2,y]], colors[0]); path(c, [[x-width/2,y],[x-9,y+depth],[x-width*.08,y+10]], colors[1]); path(c, [[x+width*.1,y+8],[x+9,y+depth*.75],[x+width*.3,y+depth*.46]], colors[2]); ellipse(c, x, y, width/2, 10, colors[3]); ellipse(c, x, y-3, width/2-4, 7, colors[4]); for (let i=0;i<4;i++) path(c, [[x-width*.35+i*width*.21,y+2],[x-width*.38+i*width*.21,y+13+i%2*7],[x-width*.32+i*width*.21,y+6]], colors[3]); }
  function seed(c, x, y, r, angle = 0) { c.save(); c.translate(x,y); c.rotate(angle); path(c,[[-r*.7,-r*.5],[-r*.76,-r*1.4],[-r*.17,-r*.7]], '#f9c56b','#a65d39'); path(c,[[r*.7,-r*.5],[r*.76,-r*1.4],[r*.17,-r*.7]], '#f9c56b','#a65d39'); ellipse(c,0,0,r,r*.86,'#ed9251','#a65d39'); ellipse(c,0,r*.33,r*.71,r*.47,'#ffe5b2'); ellipse(c,-r*.35,-r*.07,r*.1,r*.17,'#493746'); ellipse(c,r*.35,-r*.07,r*.1,r*.17,'#493746'); ellipse(c,0,r*.26,2,2,'#70404a'); leaf(c,0,-r*.66,r*.45,'#5aaf85',.7); c.restore(); }
  class IslandSling {
    constructor(options = {}) {
      if (!root.Matter) throw new Error('IslandSling requires the pinned Matter.js runtime');
      this.level = clamp(Math.trunc(options.level || 1), 1, 3); this.levelCount = 3; this.config = ISLAND_LEVELS[this.level-1]; this.title = this.config.title;
      this.status='playing'; this.score=0; this.time=0; this.ammo=this.config.ammo; this.shots=0; this.bursts=3; this.particles=[]; this.blocks=[]; this.guards=[]; this.accumulator=0;
      this.anchor={x:56,y:409}; this.aim={x:5,y:425}; this.drag=null; this.projectile=null; this.shotAge=0; this.destroyed=false; this.message=''; this.victoryAt=null; this.finalShotSettleAt=null;
      const M=root.Matter; this.engine=M.Engine.create({enableSleeping:true,gravity:{x:0,y:.66}});
      this.platforms=this.config.islands.map(([x,y,w])=>M.Bodies.rectangle(x,y+7,w,14,{isStatic:true,label:'island',friction:.8}));
      M.Composite.add(this.engine.world,this.platforms);
      const add=(x,y,w,h,material)=>{ const body=M.Bodies.rectangle(x,y,w,h,{density:material==='stone'?.002:.001,friction:.45,restitution:.05,chamfer:{radius:1},label:'structure'}); this.blocks.push({body,w,h,material}); M.Composite.add(this.engine.world,body); };
      this.config.towers.forEach(([x,y])=>{ add(x-28,y-23,10,46,'wood');add(x+28,y-23,10,46,'wood');add(x,y-52,71,12,this.level===3?'stone':'wood'); if(this.level>1)add(x+24,y-67,18,18,'stone'); });
      this.config.guards.forEach(([x,y],index)=>{ const body=M.Bodies.circle(x,y,14,{density:.0015,friction:.7,restitution:.1,label:'guard'}); this.guards.push({body,hp:2,alive:true,index}); M.Composite.add(this.engine.world,body); });
      for(let i=0;i<90;i++)M.Engine.update(this.engine,1000/60);
      this.collisionHandler=event=>{ if(this.status!=='playing'||!this.shots)return; for(const pair of event.pairs){for(const g of this.guards){if(!g.alive||(pair.bodyA!==g.body&&pair.bodyB!==g.body))continue; const other=pair.bodyA===g.body?pair.bodyB:pair.bodyA,speed=Math.hypot(other.velocity.x-g.body.velocity.x,other.velocity.y-g.body.velocity.y); if(other.label==='seed'&&speed>.6)this.hit(g,2);else if(other.label==='structure'&&speed>1.5)this.hit(g,speed>3?2:1); } } };
      M.Events.on(this.engine,'collisionStart',this.collisionHandler);
    }
    get instruction(){return this.finalShotSettleAt!==null?'最后一发结算中，等待木架坍塌…':this.projectile?'弹丸接近守卫时可点「爆破」，掀翻周围木架':'拖住左下小狐果，向后拉并松手；虚线预览弹道';}
    hit(g,damage){if(!g.alive)return;g.hp-=damage;sparks(this,g.body.position.x,g.body.position.y,'#a4f3dc',10);if(g.hp<=0){g.alive=false;this.score+=250;root.Matter.Composite.remove(this.engine.world,g.body);}}
    launch(){
      if(this.status!=='playing'||this.destroyed||this.victoryAt!==null||this.projectile||this.ammo<1)return false;
      const M=root.Matter,a=this.drag||this.aim;let dx=this.anchor.x-a.x,dy=this.anchor.y-a.y;if(Math.hypot(dx,dy)<8){dx=51;dy=-16;}
      this.projectile=M.Bodies.circle(this.anchor.x,this.anchor.y,12,{density:.008,friction:.35,frictionAir:.001,restitution:.36,label:'seed'});M.Composite.add(this.engine.world,this.projectile);M.Body.setVelocity(this.projectile,{x:dx*.2,y:dy*.2});this.ammo--;this.shots++;this.shotAge=0;this.drag=null;return true;
    }
    burst(){
      if(this.status!=='playing'||!this.projectile||this.bursts<1)return false;
      const M=root.Matter,p={...this.projectile.position};this.bursts--;sparks(this,p.x,p.y,'#ffe095',32);
      this.guards.forEach(g=>{if(g.alive&&dist(g.body.position,p)<79)this.hit(g,2);});
      this.blocks.forEach(b=>{const d=dist(b.body.position,p);if(d<100){const dx=b.body.position.x-p.x,dy=b.body.position.y-p.y;M.Sleeping.set(b.body,false);M.Body.setVelocity(b.body,{x:dx/Math.max(12,d)*7,y:dy/Math.max(12,d)*7-2});}});
      this.retireProjectile();this.checkVictory();return true;
    }
    retireProjectile(){if(!this.projectile)return;root.Matter.Composite.remove(this.engine.world,this.projectile);this.projectile=null;if(this.ammo===0&&this.finalShotSettleAt===null)this.finalShotSettleAt=this.time+2;}
    checkVictory(){if(this.status==='playing'&&this.guards.every(g=>!g.alive)){if(this.victoryAt===null){this.victoryAt=this.time+.6;this.cancelPointer();}if(this.time>=this.victoryAt){this.status='success';this.score+=this.ammo*55+this.bursts*50;}}}
    pointerDown(p){if(!this.destroyed&&this.status==='playing'&&this.victoryAt===null&&!this.projectile&&this.ammo>0&&point(p)&&dist(p,this.anchor)<54){this.drag={...this.anchor};this.pointerMove(p);}}
    pointerMove(p){if(!this.drag||!point(p)||this.status!=='playing')return;let dx=p.x-this.anchor.x,dy=p.y-this.anchor.y;const ratio=Math.min(1,78/Math.max(1,Math.hypot(dx,dy)));this.drag={x:this.anchor.x+dx*ratio,y:this.anchor.y+dy*ratio};this.aim={...this.drag};}
    pointerUp(p){if(this.drag&&this.status==='playing'){this.pointerMove(p);this.launch();}}
    cancelPointer(){this.drag=null;}
    actions(){return[{id:'angle',label:'切换高/低弹道',disabled:this.status!=='playing'||this.victoryAt!==null||this.finalShotSettleAt!==null||!!this.projectile},{id:'launch',label:'发射 ×'+this.ammo,disabled:this.status!=='playing'||this.victoryAt!==null||!!this.projectile||this.ammo<1},{id:'burst',label:'爆破 ×'+this.bursts,disabled:this.status!=='playing'||this.victoryAt!==null||!this.projectile||this.bursts<1}];}
    perform(id){if(this.status!=='playing'||this.destroyed||this.victoryAt!==null||this.finalShotSettleAt!==null)return false;if(id==='burst')return this.burst();if(id==='launch')return this.launch();if(id==='angle'&&!this.projectile){this.aim=this.aim.y>445?{x:5,y:425}:{x:20,y:473};return true;}return false;}
    key(key){if(key===' '||key==='Enter')this.perform('launch');else if(key==='1'||key==='ArrowUp'||key==='ArrowDown')this.perform('angle');else if(key==='2')this.perform('burst');}
    update(dt){
      if(this.status!=='playing'||this.destroyed)return;dt=clamp(Number(dt)||0,0,.05);if(!dt)return;this.time+=dt;this.accumulator+=dt;tickSparks(this,dt);
      while(this.accumulator>=1/120){root.Matter.Engine.update(this.engine,1000/120);this.accumulator-=1/120;this.guards.forEach(g=>{if(g.alive&&(g.body.position.y>499||g.body.position.x< -30||g.body.position.x>390))this.hit(g,2);});}
      this.checkVictory();if(this.status!=='playing')return;
      if(this.projectile){this.shotAge+=dt;const p=this.projectile.position;if(this.shotAge>6||p.x< -45||p.x>410||p.y>515||(this.shotAge>1.8&&this.projectile.speed<.4))this.retireProjectile();}
      const fallen=this.blocks.filter(b=>b.body.position.y>550||Math.abs(b.body.position.x-180)>450);fallen.forEach(b=>root.Matter.Composite.remove(this.engine.world,b.body));this.blocks=this.blocks.filter(b=>!fallen.includes(b));
      if(!this.projectile&&!this.ammo&&this.victoryAt===null&&this.finalShotSettleAt!==null&&this.time>=this.finalShotSettleAt){this.status='failure';this.message='弹药用尽。调整拉动角度，或靠近目标再引爆。';this.cancelPointer();}
      if(this.time>150){this.status='failure';this.message='探索时间已到。重新挑战悬空小岛！';this.cancelPointer();}
    }
    draw(c){
      c.save();c.beginPath();c.rect(0,78,360,410);c.clip();const sky=c.createLinearGradient(0,78,0,488);sky.addColorStop(0,['#66cae3','#69c7dd','#788ace'][this.level-1]);sky.addColorStop(1,'#d4f4e5');rect(c,0,78,360,410,sky);
      ellipse(c,292,146,32,32,'#fff3b7');ellipse(c,287,141,27,27,'#fff8d7');
      for(const [x,y,s]of[[42,155,1],[158,126,.7],[308,260,.7],[125,332,.9]]){ellipse(c,x,y,40*s,10*s,'#f4fffed9');ellipse(c,x-13*s,y-6*s,17*s,12*s,'#f4fffed9');ellipse(c,x+10*s,y-11*s,21*s,17*s,'#f4fffed9');}
      island(c,52,250,84,105,false);island(c,163,190,62,79,false);island(c,332,202,92,112,false);island(c,112,374,87,90,false);
      for(const [x,y,w]of[[44,259,9],[331,209,12],[160,197,6]]){rect(c,x,y,w,100,'#b0eeed8a');rect(c,x+2,y,2,96,'#e3ffff97');}
      for(const [x,y,w]of this.config.islands){island(c,x,y+4,w,64);for(let i=0;i<4;i++){const xx=x-w*.3+i*w*.2;path(c,[[xx,y-3],[xx-2,y-9],[xx+3,y-4],[xx+6,y-8]],null,'#4a9e69',1.5);}leaf(c,x+w*.39,y-3,12,'#3fa282',.3);leaf(c,x+w*.4,y-3,10,'#6fc57d',1);}
      island(c,50,449,108,69);path(c,[[46,445],[52,426],[47,390]],null,'#754a4d',12);path(c,[[52,426],[72,389]],null,'#754a4d',10);path(c,[[45,441],[50,419],[47,391]],null,'#d1a260',5);path(c,[[52,419],[70,391]],null,'#e7bb79',4);
      this.blocks.forEach(({body,w,h,material})=>{c.save();c.translate(body.position.x,body.position.y);c.rotate(body.angle);const stone=material==='stone';rounded(c,-w/2,-h/2,w,h,2,stone?'#9cafbd':'#c68b50',stone?'#5e778d':'#895638');path(c,[[-w/2+3,-h/2+3],[w/2-3,-h/2+3]],null,stone?'#dce6e6':'#f8d78d',2);if(h>w){path(c,[[0,-h/2+8],[-1,h/2-6]],null,'#ab693f',1);ellipse(c,1,8,2,4,'#a96d42');}else if(stone){path(c,[[-6,-h/2],[0,0],[-3,h/2]],null,'#6e8399',1.5);}else{for(const x of[-w/2+6,w/2-6])ellipse(c,x,0,1.5,1.5,'#6e4c39');}c.restore();});
      this.guards.filter(g=>g.alive).forEach(g=>{const p=g.body.position;c.save();c.translate(p.x,p.y);c.rotate(g.body.angle);ellipse(c,0,2,14,13,g.hp<2?'#97b5cf':'#68acaa','#3a777f');path(c,[[-9,-8],[-10,-20],[-1,-11]],'#9fd5be','#3a777f',1.4);path(c,[[5,-10],[12,-20],[11,-5]],'#9fd5be','#3a777f',1.4);ellipse(c,-5,-2,4,5,'#f0f5d6');ellipse(c,5,-2,4,5,'#f0f5d6');ellipse(c,-4,-1,1.6,2.4,'#324861');ellipse(c,4,-1,1.6,2.4,'#324861');path(c,[[-4,7],[0,9],[4,7]],null,'#345b6f',1.4);c.restore();});
      if(!this.projectile&&this.ammo>0&&this.status==='playing'){const v=this.drag||this.anchor;path(c,[[47,391],[v.x,v.y],[71,391]],null,'#563f50',3.5);seed(c,v.x,v.y,12);if(this.drag){const vx=(this.anchor.x-this.aim.x)*.2,vy=(this.anchor.y-this.aim.y)*.2;for(let i=1;i<25;i++){const t=i*2,x=this.anchor.x+vx*t,y=this.anchor.y+vy*t+.092*t*t;if(x<0||x>355||y<80||y>486)break;ellipse(c,x,y,2,2,'#ffffffd9');}}else{path(c,[[30,414],[17,425],[25,423]],null,'#fff5c4',2);}}
      if(this.projectile)seed(c,this.projectile.position.x,this.projectile.position.y,12,this.projectile.angle);
      drawSparks(this,c);rounded(c,12,86,336,28,14,'#edf9e8e8');label(c,this.title,24,100,12,'#316b76');label(c,'守卫 '+this.guards.filter(g=>!g.alive).length+'/'+this.guards.length,336,100,12,'#316b76','right');rounded(c,15,461,330,23,11,'#245e74c9');label(c,'小狐果 '+this.ammo+' 枚  ·  爆破 '+this.bursts+' 次',180,473,11,'#f5f7dc','center');c.restore();
    }
    snapshot(){return{mode:'island-sling',level:this.level,title:this.title,status:this.status,score:this.score,time:this.time,ammo:this.ammo,shots:this.shots,bursts:this.bursts,finalShotSettleAt:this.finalShotSettleAt,anchor:{...this.anchor},aim:{...this.aim},drag:this.drag?{...this.drag}:null,projectile:this.projectile?{x:this.projectile.position.x,y:this.projectile.position.y,vx:this.projectile.velocity.x,vy:this.projectile.velocity.y,age:this.shotAge}:null,guards:this.guards.map(g=>({x:g.body.position.x,y:g.body.position.y,hp:g.hp,alive:g.alive,index:g.index})),blocks:this.blocks.map(b=>({x:b.body.position.x,y:b.body.position.y,w:b.w,h:b.h,angle:b.body.angle,material:b.material})),particleCount:this.particles.length};}
    destroy(){if(this.destroyed)return;this.destroyed=true;this.cancelPointer();root.Matter.Events.off(this.engine,'collisionStart',this.collisionHandler);root.Matter.Composite.clear(this.engine.world,false);root.Matter.Engine.clear(this.engine);this.particles=[];}
  }
  SkyRaid.levelCount=3;IslandSling.levelCount=3;
  root.AirvanaPhysicsModes=Object.assign(root.AirvanaPhysicsModes||{},{'sky-raid':SkyRaid,'island-sling':IslandSling});
})(typeof window!=='undefined'?window:globalThis);
