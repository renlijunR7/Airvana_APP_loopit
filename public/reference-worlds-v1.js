(function (root) {
  'use strict';

  // Original, code-drawn local game worlds. No external assets, commerce, or rewards.
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const finite = (n) => typeof n === 'number' && Number.isFinite(n);
  const copy = (v) => JSON.parse(JSON.stringify(v));
  function round(ctx, x, y, w, h, r, fill, stroke) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
  }
  function poly(ctx, pts, fill, stroke) {
    ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill(); if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
  }
  function oval(ctx, x, y, rx, ry, fill) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); }
  function line(ctx, pts, color, width) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.strokeStyle = color; ctx.lineWidth = width || 1; ctx.stroke(); }
  function text(ctx, value, x, y, size, color, align) { ctx.fillStyle = color || '#24384a'; ctx.font = `700 ${size || 13}px system-ui, sans-serif`; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle'; ctx.fillText(String(value), x, y); }
  function gradient(ctx, top, bottom) { const g = ctx.createLinearGradient(0, 78, 0, 488); g.addColorStop(0, top); g.addColorStop(1, bottom); ctx.fillStyle = g; ctx.fillRect(0, 78, 360, 410); }
  function flower(ctx, x, y, color) { for (let i = 0; i < 5; i++) oval(ctx, x + Math.cos(i * 1.26) * 2, y + Math.sin(i * 1.26) * 2, 2, 2, color); oval(ctx, x, y, 1.5, 1.5, '#ffcf58'); }
  function tree(ctx, x, y, size, autumn) { line(ctx, [[x, y], [x, y - size * .7]], '#8a623e', size * .18); oval(ctx, x, y - size, size * .57, size * .75, autumn ? '#eba52f' : '#3c9954'); oval(ctx, x - size * .17, y - size * 1.17, size * .36, size * .46, autumn ? '#ffd45c' : '#70c56a'); }
  function iso(ctx, x, y, w, d, h, colors) {
    poly(ctx, [[x - w, y], [x, y + d], [x, y + d - h], [x - w, y - h]], colors[1]);
    poly(ctx, [[x + w, y], [x, y + d], [x, y + d - h], [x + w, y - h]], colors[2]);
    poly(ctx, [[x, y - d - h], [x + w, y - h], [x, y + d - h], [x - w, y - h]], colors[0]);
  }
  function person(ctx, x, y, color, scale) {
    ctx.save(); ctx.translate(x, y); ctx.scale(scale || 1, scale || 1);
    oval(ctx, 0, 0, 9, 3, '#28563733'); line(ctx, [[-3, -8], [-4, 0]], '#27455d', 3); line(ctx, [[3, -8], [4, 0]], '#27455d', 3);
    round(ctx, -6, -22, 12, 15, 4, color); oval(ctx, 0, -29, 8, 9, '#ffc991'); oval(ctx, 0, -35, 10, 4, '#f4ba40');
    oval(ctx, -2, -30, 1, 1, '#3f3835'); oval(ctx, 3, -30, 1, 1, '#3f3835'); ctx.restore();
  }
  class TapWorld {
    constructor(options) { options = options || {}; this.level = clamp(Math.floor(Number(options.level) || 1), 1, 3); this.levelCount = 3; this.status = 'playing'; this.score = 0; this.message = ''; this._touch = null; this.motion = 0; }
    pointerDown(p) { if (this.status === 'playing' && p && finite(p.x) && finite(p.y)) this._touch = { x: p.x, y: p.y, valid: true }; }
    pointerMove(p) { if (this._touch && (!p || !finite(p.x) || !finite(p.y) || Math.hypot(p.x - this._touch.x, p.y - this._touch.y) > 15)) this._touch.valid = false; }
    pointerUp(p) { const t = this._touch; this._touch = null; if (t && t.valid && this.status === 'playing' && p && finite(p.x) && finite(p.y) && Math.hypot(p.x - t.x, p.y - t.y) <= 15) this.tap(p); }
    cancelPointer() { this._touch = null; }
    key(key) { if (this.status !== 'playing') return; const index = ['1', '2', '3', '4'].indexOf(key); const action = this.actions()[index]; if (action && !action.disabled) this.perform(action.id); }
    fail(message) { this.status = 'failure'; this.message = message; this.cancelPointer(); }
    destroy() { this.cancelPointer(); }
  }

  const CROPS = [{ key: 'berry', name: '草莓', seconds: 4, color: '#e75358' }, { key: 'corn', name: '玉米', seconds: 6, color: '#f7c440' }, { key: 'carrot', name: '胡萝卜', seconds: 5, color: '#f58b33' }];
  const ORDERS = [
    [[2, 0, 1], [0, 2, 1], [2, 1, 1]],
    [[1, 2, 0], [2, 0, 2], [0, 2, 2], [2, 1, 1]],
    [[2, 1, 1], [0, 3, 1], [2, 0, 2], [1, 2, 2], [2, 2, 1]]
  ];
  function crop(ctx, type, x, y, size, growth) {
    const s = size || 1; ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    if (growth < .95) { line(ctx, [[0, 1], [0, -7 - growth * 13]], '#3b9250', 2); oval(ctx, -5, -7 - growth * 7, 7, 3, '#83c44a'); oval(ctx, 5, -12 - growth * 9, 7, 3, '#4faf50'); }
    else if (type === 0) { oval(ctx, 0, -9, 11, 12, '#bf3b48'); oval(ctx, -2, -12, 9, 10, '#f76063'); for (let i = 0; i < 8; i++) oval(ctx, (i % 3 - 1) * 5, -15 + Math.floor(i / 3) * 5, .8, 1.2, '#ffda82'); for (let i = 0; i < 5; i++) poly(ctx, [[0, -20], [(i - 2) * 5, -25 + Math.abs(i - 2) * 2], [(i - 2) * 4, -17]], '#48994b'); }
    else if (type === 1) { oval(ctx, 0, -15, 9, 17, '#e8a72a'); oval(ctx, -2, -17, 6, 14, '#ffe37c'); for (let r = 0; r < 5; r++) for (let c = 0; c < 2; c++) oval(ctx, c * 5 - 4, r * 5 - 27, 2, 2, '#f6bd40'); poly(ctx, [[0, 1], [-14, -19], [-9, 0]], '#559f45'); poly(ctx, [[0, 1], [15, -22], [9, 0]], '#83bb4a'); }
    else { poly(ctx, [[-9, -19], [9, -19], [0, 4]], '#ee8231', '#ce6829'); line(ctx, [[-5, -14], [3, -13]], '#ffc277', 2); line(ctx, [[-3, -6], [2, -5]], '#ffc277', 2); line(ctx, [[0, -18], [-7, -29], [0, -25], [4, -33], [7, -27]], '#50954b', 4); } ctx.restore();
  }
  class HarvestLane extends TapWorld {
    constructor(options) {
      super(options); this.instruction = '选择种子，点击农田种植、收获，再交付订单。';
      this.time = [78, 102, 128][this.level - 1]; this.water = 8; this.selectedCrop = 0; this.inventory = [0, 0, 0]; this.orderIndex = 0;
      this.orders = copy(ORDERS[this.level - 1]); this.plots = Array.from({ length: 6 }, (_, i) => ({ id: i, x: 66 + i % 3 * 114, y: 301 + Math.floor(i / 3) * 76, crop: null, growth: 0 })); this.deliveries = 0; this.truckAnimation = 0;
    }
    update(dt) {
      if (this.status !== 'playing' || !finite(dt) || dt <= 0) return;
      dt = Math.min(dt, 1); this.motion += dt; this.time = Math.max(0, this.time - dt); this.truckAnimation = Math.max(0, this.truckAnimation - dt);
      for (const p of this.plots) if (p.crop !== null) p.growth = Math.min(1, p.growth + dt / CROPS[p.crop].seconds);
      if (this.time <= 0) this.fail('集市收摊了。按订单种植，再来一局！');
    }
    tap(p) {
      const plot = this.plots.find(t => Math.abs(t.x - p.x) <= 49 && Math.abs(t.y - 7 - p.y) <= 31);
      if (!plot) return false;
      if (plot.crop === null && this.water > 0) { plot.crop = this.selectedCrop; plot.growth = 0; this.water--; return true; }
      if (plot.crop !== null && plot.growth >= 1) { this.inventory[plot.crop]++; this.score += 20; plot.crop = null; plot.growth = 0; return true; }
      return false;
    }
    canDeliver() { const order = this.orders[this.orderIndex]; return !!order && order.every((n, i) => this.inventory[i] >= n); }
    actions() { return [...CROPS.map((c, i) => ({ id: c.key, label: `${this.selectedCrop === i ? '✓ ' : ''}${c.name}`, disabled: this.status !== 'playing' })), { id: 'deliver', label: '交付订单', disabled: this.status !== 'playing' || !this.canDeliver() }]; }
    perform(id) {
      if (this.status !== 'playing') return false;
      const cropIndex = CROPS.findIndex(c => c.key === id); if (cropIndex !== -1) { this.selectedCrop = cropIndex; return true; }
      if (id !== 'deliver' || !this.canDeliver()) return false;
      this.orders[this.orderIndex].forEach((n, i) => { this.inventory[i] -= n; }); this.water += 5; this.orderIndex++; this.deliveries++; this.score += 200 + this.level * 25; this.truckAnimation = 1.1;
      if (this.orderIndex === this.orders.length) { this.status = 'success'; this.score += Math.ceil(this.time) * 2; this.message = '全部订单送达，丰收满载！'; this.cancelPointer(); } return true;
    }
    snapshot() { return copy({ key: 'harvest-lane', level: this.level, status: this.status, score: this.score, remainingSeconds: this.time, water: this.water, selectedCrop: this.selectedCrop, inventory: this.inventory, plots: this.plots, order: this.orders[this.orderIndex] || null, orderIndex: this.orderIndex, goal: this.orders.length, deliveries: this.deliveries, cropTypes: CROPS, actions: this.actions() }); }
    draw(ctx) {
      ctx.save(); gradient(ctx, '#acd9ed', '#b5d97a');
      poly(ctx, [[0, 201], [360, 169], [360, 488], [0, 488]], '#93c563'); poly(ctx, [[0, 224], [360, 199], [360, 232], [0, 267]], '#ead6a2');
      for (let i = 0; i < 46; i++) { const x = (i * 83) % 360, y = 243 + (i * 41) % 239; if (i % 3 === 0) flower(ctx, x, y, '#f9f4c8'); else line(ctx, [[x, y], [x + 2, y - 4]], '#70aa55', 1); }
      // Barn has a roof ridge, siding, split doors and silo, independent of the farm board.
      iso(ctx, 77, 226, 53, 20, 55, ['#e77663', '#bb4c43', '#dd6558']);
      poly(ctx, [[18, 172], [75, 133], [140, 162], [83, 194]], '#419b98', '#26716e'); poly(ctx, [[18, 172], [18, 183], [83, 205], [83, 194]], '#2d7b79');
      for (let i = 0; i < 5; i++) line(ctx, [[31 + i * 11, 164 - i * 7], [94 + i * 9, 187 - i * 4]], '#6dc6b0', 2);
      poly(ctx, [[87, 203], [118, 192], [118, 221], [87, 232]], '#f8eace'); poly(ctx, [[91, 204], [115, 197], [115, 221], [91, 228]], '#b9473f'); line(ctx, [[91, 204], [115, 221]], '#f8eace', 3); line(ctx, [[115, 197], [91, 228]], '#f8eace', 3);
      oval(ctx, 28, 217, 15, 6, '#657b78'); round(ctx, 13, 170, 30, 46, 6, '#b7c9b3'); oval(ctx, 28, 170, 15, 7, '#e2e6d3');
      tree(ctx, 326, 196, 31); tree(ctx, 345, 222, 24); tree(ctx, 166, 198, 22);
      const tx = 247 + (this.truckAnimation ? Math.sin(this.truckAnimation * Math.PI) * 39 : 0); oval(ctx, tx, 240, 46, 8, '#44623833');
      round(ctx, tx - 44, 202, 55, 29, 4, '#338bc0'); round(ctx, tx + 9, 210, 28, 25, 5, '#2476b0'); round(ctx, tx + 14, 213, 17, 10, 2, '#bceaf3');
      poly(ctx, [[tx - 44, 202], [tx - 29, 193], [tx + 24, 193], [tx + 11, 202]], '#64b8d4'); round(ctx, tx - 36, 202, 43, 18, 2, '#b1d6ba');
      for (const wx of [-27, 22]) { oval(ctx, tx + wx, 235, 10, 11, '#364959'); oval(ctx, tx + wx, 235, 5, 5, '#b4c4c7'); } person(ctx, 179, 244, '#e9ae43', .78);
      for (const p of this.plots) {
        oval(ctx, p.x, p.y + 7, 52, 24, '#49794b33'); iso(ctx, p.x, p.y, 51, 25, 7, ['#a4774a', '#805737', '#8e5c37']);
        for (let r = -2; r <= 2; r++) line(ctx, [[p.x - 34 + r * 9, p.y - 12 - r * 4], [p.x + 12 + r * 8, p.y + 6 - r * 4]], '#745437', 3);
        if (p.crop !== null) { for (const [dx, dy] of [[-21, -5], [0, 4], [22, -7]]) crop(ctx, p.crop, p.x + dx, p.y + dy, .77, p.growth); if (p.growth >= 1) { oval(ctx, p.x + 34, p.y - 24, 10, 10, '#ffed95'); text(ctx, '✓', p.x + 34, p.y - 23, 13, '#458348', 'center'); } else { round(ctx, p.x - 22, p.y + 18, 44, 5, 3, '#533e2b'); round(ctx, p.x - 22, p.y + 18, 44 * Math.max(.03, p.growth), 5, 3, '#bde27f'); } }
        else text(ctx, '+', p.x, p.y - 6, 24, '#f9e2aa', 'center');
      }
      for (let i = 0; i < 7; i++) { const x = 16 + i * 52; line(ctx, [[x, 440], [x, 421]], '#a87849', 5); if (i < 6) line(ctx, [[x, 428], [x + 52, 428]], '#cb9756', 4); }
      round(ctx, 12, 87, 336, 55, 14, '#fffae8', '#dec890'); const order = this.orders[this.orderIndex];
      text(ctx, `订单 ${Math.min(this.orderIndex + 1, this.orders.length)}/${this.orders.length}`, 24, 104, 12, '#6b673e');
      text(ctx, `水 ${this.water}  ·  ${Math.ceil(this.time)} 秒`, 336, 104, 12, '#627c48', 'right');
      if (order) order.forEach((n, i) => { crop(ctx, i, 30 + i * 106, 136, .45, 1); text(ctx, `${this.inventory[i]} / ${n}`, 46 + i * 106, 128, 15, this.inventory[i] >= n ? '#44844b' : '#9a573b'); });
      round(ctx, 18, 446, 324, 31, 10, '#fff9df'); text(ctx, this.canDeliver() ? '货物齐了！点击「交付订单」出发' : '点空地播种 · 点成熟作物收获', 180, 462, 13, '#526b3e', 'center'); ctx.restore();
    }
  }

  const BUILDINGS = [
    { key: 'home', name: '海风住宅', cost: 12, population: 20, income: 0, colors: ['#f5b76d', '#ffedc5', '#e9cf9a'] },
    { key: 'market', name: '码头商店', cost: 16, population: 6, income: 7, colors: ['#e46c65', '#f8e5c3', '#d6bf94'] },
    { key: 'park', name: '滨海花园', cost: 15, population: 8, income: 1, colors: ['#8cc768', '#568654', '#477b4f'] },
    { key: 'lighthouse', name: '灯塔地标', cost: 40, population: 18, income: 2, colors: ['#df8466', '#faf0d2', '#d7dbcf'] }
  ];
  function building(ctx, kind, x, y, level, small) {
    ctx.save(); ctx.translate(x, y); if (small) ctx.scale(small, small); const h = 18 + level * 10;
    if (kind === 'park') { iso(ctx, 0, 0, 29, 16, 5, ['#a3d780', '#62955e', '#79ae65']); tree(ctx, -10, -4, 17); tree(ctx, 14, 6, 13); line(ctx, [[-15, 9], [10, -4]], '#eee4b5', 5); oval(ctx, 9, -4, 7, 4, '#6fc7d2'); }
    else if (kind === 'lighthouse') { iso(ctx, 0, 0, 25, 14, 6, ['#c7d5ca', '#97b5ad', '#849d9b']); poly(ctx, [[-11, -5], [11, -5], [8, -65 - level * 8], [-8, -65 - level * 8]], '#fff4d9'); poly(ctx, [[1, -5], [11, -5], [8, -65 - level * 8], [2, -65 - level * 8]], '#d6ded7'); for (let j = 0; j < 3; j++) round(ctx, -9, -18 - j * 20, 18, 9, 1, '#e37867'); round(ctx, -11, -78 - level * 8, 22, 15, 3, '#70b8c3', '#426f83'); poly(ctx, [[-15, -78 - level * 8], [0, -92 - level * 8], [15, -78 - level * 8]], '#dc6c53'); oval(ctx, 0, -70 - level * 8, 4, 7, '#ffe999'); }
    else {
      const market = kind === 'market'; iso(ctx, 0, 0, 28, 16, h, market ? ['#f9d898', '#f9e5bd', '#dcbf96'] : ['#e9d5ab', '#fff0ca', '#dec69e']);
      poly(ctx, [[-32, -h], [0, -h - 28], [33, -h - 13], [0, -h + 17]], market ? '#bc6256' : '#dd9652'); poly(ctx, [[-32, -h], [0, -h + 17], [0, -h + 23], [-32, -h + 5]], market ? '#a74e47' : '#bf713d');
      for (let row = 0; row < level; row++) for (let col = 0; col < 2; col++) { const wx = col * 12 + 5, wy = -8 - row * 12 - col * 5; poly(ctx, [[wx, wy], [wx + 7, wy - 3], [wx + 7, wy - 10], [wx, wy - 7]], '#79bbc7'); }
      poly(ctx, [[-19, -4], [-9, 1], [-9, -14], [-19, -19]], '#739894');
      if (market) { for (let i = 0; i < 4; i++) poly(ctx, [[i * 8 - 31, -h + 8 + i * 4], [i * 8 - 23, -h + 12 + i * 4], [i * 8 - 27, -h + 20 + i * 4], [i * 8 - 35, -h + 16 + i * 4]], i % 2 ? '#ffefcb' : '#ee7970'); }
    } ctx.restore();
  }
  class PocketCity extends TapWorld {
    constructor(options) {
      super(options); this.instruction = '选择地块与建筑，用商店收入发展住宅，建成灯塔。'; this.materials = 55; this.day = 0; this.turnLimit = [12, 14, 16][this.level - 1]; this.goalPopulation = [60, 92, 128][this.level - 1]; this.requiredParks = this.level > 1 ? 1 : 0; this.selectedLot = 0; this.selectedType = 0;
      this.lots = Array.from({ length: 6 }, (_, i) => ({ id: i, x: 83 + i % 2 * 156, y: 263 + Math.floor(i / 2) * 67, kind: null, level: 0 }));
    }
    get population() { return this.lots.reduce((n, l) => n + (l.kind ? BUILDINGS.find(b => b.key === l.kind).population * l.level : 0), 0); }
    get income() { return 3 + this.lots.reduce((n, l) => n + (l.kind ? BUILDINGS.find(b => b.key === l.kind).income * l.level : 0), 0); }
    get parks() { return this.lots.filter(l => l.kind === 'park').length; }
    get landmark() { return this.lots.some(l => l.kind === 'lighthouse'); }
    update(dt) { if (this.status === 'playing' && finite(dt) && dt > 0) this.motion += Math.min(dt, 1); }
    tap(p) { const lot = this.lots.find(l => Math.abs(l.x - p.x) <= 57 && Math.abs(l.y - p.y) <= 29); if (!lot) return false; this.selectedLot = lot.id; return true; }
    actions() { const l = this.lots[this.selectedLot], b = BUILDINGS[this.selectedType], cost = this.upgradeCost(l), done = this.status !== 'playing'; return [{ id: 'build', label: `建造 · ${b.cost}`, disabled: done || !!l.kind || this.materials < b.cost || (b.key === 'lighthouse' && this.landmark) }, { id: 'cycle', label: '切换建筑', disabled: done }, { id: 'upgrade', label: `升级 · ${cost}`, disabled: done || !l.kind || l.level >= 3 || this.materials < cost }, { id: 'advance', label: '下一天', disabled: done }]; }
    upgradeCost(lot) { return lot.kind ? BUILDINGS.find(b => b.key === lot.kind).cost + lot.level * 6 : 0; }
    endDay() { this.day++; this.materials += this.income; this.score += 10; if (this.population >= this.goalPopulation && this.landmark && this.parks >= this.requiredParks) { this.status = 'success'; this.score += this.population * 5 + (this.turnLimit - this.day) * 20; this.message = '海港新城落成，居民入住！'; this.cancelPointer(); } else if (this.day >= this.turnLimit) this.fail('建设期限到了。先建商店增加每日收入。'); }
    perform(id) {
      if (this.status !== 'playing') return false; const action = this.actions().find(a => a.id === id); if (!action || action.disabled) return false;
      if (id === 'cycle') { this.selectedType = (this.selectedType + 1) % BUILDINGS.length; return true; }
      const lot = this.lots[this.selectedLot];
      if (id === 'build') { const b = BUILDINGS[this.selectedType]; this.materials -= b.cost; lot.kind = b.key; lot.level = 1; this.score += 75; }
      else if (id === 'upgrade') { this.materials -= this.upgradeCost(lot); lot.level++; this.score += 100; }
      this.endDay(); return true;
    }
    snapshot() { return copy({ key: 'pocket-city', level: this.level, status: this.status, score: this.score, materials: this.materials, day: this.day, turnLimit: this.turnLimit, population: this.population, goalPopulation: this.goalPopulation, income: this.income, landmark: this.landmark, parks: this.parks, requiredParks: this.requiredParks, selectedLot: this.selectedLot, selectedType: this.selectedType, buildings: BUILDINGS, lots: this.lots, actions: this.actions() }); }
    draw(ctx) {
      ctx.save(); gradient(ctx, '#a5dfef', '#6ac7d1');
      for (let i = 0; i < 10; i++) { const x = (i * 81 + this.motion * 5) % 390 - 20; line(ctx, [[x, 188 + i * 29], [x + 12, 190 + i * 29], [x + 23, 188 + i * 29]], '#b8f1e688', 2); }
      poly(ctx, [[16, 190], [281, 174], [346, 415], [82, 459], [14, 423]], '#5da1a0'); poly(ctx, [[16, 181], [281, 165], [346, 406], [82, 450], [14, 414]], '#deded0');
      line(ctx, [[151, 189], [162, 390], [263, 430]], '#899d9d', 23); line(ctx, [[42, 294], [307, 284]], '#899d9d', 20); line(ctx, [[51, 363], [323, 354]], '#899d9d', 20);
      ctx.setLineDash([5, 7]); line(ctx, [[151, 192], [162, 393], [265, 429]], '#f9f2d1', 1.5); ctx.setLineDash([]);
      // Distant harbor skyline, mooring bridge, tiny residents and cars.
      for (let i = 0; i < 5; i++) building(ctx, i % 2 ? 'home' : 'market', 34 + i * 55, 200 - i * 3, 1 + i % 2, .42);
      line(ctx, [[304, 425], [354, 447]], '#e8d7b7', 17); for (let i = 0; i < 4; i++) line(ctx, [[307 + i * 13, 420 + i * 6], [307 + i * 13, 431 + i * 6]], '#a7bdb6', 2);
      for (const lot of this.lots) {
        const selected = lot.id === this.selectedLot; iso(ctx, lot.x, lot.y, 56, 29, 4, [selected ? '#f7e7a0' : '#bed496', '#8aa98e', '#a0bc90']);
        if (selected) { ctx.setLineDash([4, 3]); poly(ctx, [[lot.x, lot.y - 29], [lot.x + 56, lot.y], [lot.x, lot.y + 29], [lot.x - 56, lot.y]], '#ffffff00', '#8e883e'); ctx.setLineDash([]); }
        if (lot.kind) { building(ctx, lot.kind, lot.x, lot.y + 6, lot.level); round(ctx, lot.x + 28, lot.y - 22, 20, 18, 6, '#fff8d8'); text(ctx, lot.level, lot.x + 38, lot.y - 13, 11, '#577477', 'center'); }
        else { line(ctx, [[lot.x - 13, lot.y - 5], [lot.x + 13, lot.y - 5]], selected ? '#a0893e' : '#769578', 3); line(ctx, [[lot.x, lot.y - 17], [lot.x, lot.y + 7]], selected ? '#a0893e' : '#769578', 3); }
      }
      tree(ctx, 24, 342, 16); tree(ctx, 330, 330, 18); tree(ctx, 316, 390, 15); person(ctx, 160, 351, '#e48761', .45); person(ctx, 148, 269, '#548daf', .4);
      const carY = 210 + (this.motion * 11) % 169; round(ctx, 144, carY, 13, 22, 4, '#f3c14c'); round(ctx, 146, carY + 4, 9, 6, 2, '#b9e0df');
      round(ctx, 12, 87, 336, 63, 13, '#fffff0', '#a9ccc4'); text(ctx, `人口 ${this.population}/${this.goalPopulation}`, 25, 104, 15, '#335b70'); text(ctx, `第 ${this.day}/${this.turnLimit} 天`, 336, 104, 12, '#5a7b88', 'right');
      text(ctx, `建材 ${this.materials}  ·  日收入 +${this.income}`, 25, 128, 12, '#58786e'); text(ctx, `灯塔 ${this.landmark ? '✓' : '○'}${this.requiredParks ? '  花园 ' + (this.parks ? '✓' : '○') : ''}`, 336, 128, 12, '#537768', 'right');
      round(ctx, 12, 445, 336, 34, 10, '#fffae7'); const lot = this.lots[this.selectedLot]; text(ctx, lot.kind ? `${BUILDINGS.find(b => b.key === lot.kind).name} · ${lot.level} 级 · 可升级` : `${BUILDINGS[this.selectedType].name} · ${BUILDINGS[this.selectedType].cost} 建材 · 点击建造`, 180, 462, 13, '#526c67', 'center'); ctx.restore();
    }
  }

  const ROUTE = [
    { x: 81, y: 197, type: 'harbor', label: '港口' }, { x: 147, y: 176, type: 'wood', label: '树林' }, { x: 213, y: 176, type: 'stone', label: '采石' }, { x: 279, y: 197, type: 'market', label: '集市' },
    { x: 304, y: 260, type: 'food', label: '补给' }, { x: 304, y: 325, type: 'storm', label: '风浪' }, { x: 279, y: 390, type: 'wood', label: '树林' }, { x: 213, y: 411, type: 'treasure', label: '宝藏' },
    { x: 147, y: 411, type: 'stone', label: '采石' }, { x: 81, y: 390, type: 'market', label: '集市' }, { x: 56, y: 325, type: 'food', label: '补给' }, { x: 56, y: 260, type: 'wood', label: '树林' }
  ];
  const ROUTE_COLORS = { harbor: '#e49b67', wood: '#91be68', stone: '#9cb8cb', market: '#eebd77', food: '#7ac7b9', storm: '#a3a0ca', treasure: '#f3d367' };
  class DiceVoyage extends TapWorld {
    constructor(options) {
      super(options); this.instruction = '掷骰探索；每座地标需 4 木 2 石，休整恢复补给。'; this.random = typeof options?.random === 'function' ? options.random : Math.random;
      this.turnLimit = [20, 26, 32][this.level - 1]; this.turn = 0; this.position = 0; this.displayPosition = 0; this.die = 1; this.moving = false; this.rollTime = 0; this.stepsLeft = 0; this.stepTime = 0;
      this.wood = 4; this.stone = 2; this.supplies = 6; this.shells = 0; this.landmarks = 0; this.goalLandmarks = this.level; this.visited = new Set([0]); this.goalVisits = this.level + 3; this.pendingChoice = false; this.lastEvent = '启航！环游岛屿并建造地标。';
    }
    actions() {
      const blocked = this.status !== 'playing' || this.moving;
      if (this.pendingChoice) return [{ id: 'choose-wood', label: '领取 3 木材', disabled: blocked }, { id: 'choose-stone', label: '领取 2 石材', disabled: blocked }, { id: 'choose-food', label: '领取 4 补给', disabled: blocked }];
      return [{ id: 'roll', label: '掷骰', disabled: blocked || this.supplies < 1 || this.turn >= this.turnLimit }, { id: 'build', label: '建造 4木2石', disabled: blocked || this.landmarks >= this.goalLandmarks || this.wood < 4 || this.stone < 2 || this.turn >= this.turnLimit }, { id: 'trade', label: '交易 2贝', disabled: blocked || this.shells < 2 || this.turn >= this.turnLimit }, { id: 'rest', label: '休整 +4', disabled: blocked || this.turn >= this.turnLimit }];
    }
    tap(p) { if (Math.hypot(p.x - 180, p.y - 314) < 45) return this.perform('roll'); if (p.x > 91 && p.x < 269 && p.y > 230 && p.y < 281) return this.perform('build'); return false; }
    finishTurn() {
      if (this.landmarks >= this.goalLandmarks && this.visited.size >= this.goalVisits) { this.status = 'success'; this.score += (this.turnLimit - this.turn) * 15; this.message = '航海日志完成，岛屿地标建成！'; this.cancelPointer(); }
      else if (this.turn >= this.turnLimit && !this.pendingChoice) this.fail('航期结束。善用集市补齐建造材料。');
    }
    perform(id) {
      if (this.status !== 'playing') return false; const a = this.actions().find(a => a.id === id); if (!a || a.disabled) return false;
      if (this.pendingChoice) { if (id === 'choose-wood') this.wood += 3; else if (id === 'choose-stone') this.stone += 2; else this.supplies += 4; this.pendingChoice = false; this.lastEvent = '物资已装船，继续航行！'; this.finishTurn(); return true; }
      this.turn++;
      if (id === 'roll') { this.supplies--; const r = Number(this.random()); this.die = clamp(Math.floor((finite(r) ? clamp(r, 0, .999999) : .5) * 6) + 1, 1, 6); this.moving = true; this.rollTime = .45; this.stepsLeft = this.die; this.stepTime = 0; this.lastEvent = '掷骰中…'; }
      else if (id === 'build') { this.wood -= 4; this.stone -= 2; this.landmarks++; this.score += 500; this.lastEvent = `第 ${this.landmarks} 座地标建成！`; this.finishTurn(); }
      else if (id === 'trade') { this.shells -= 2; this.pendingChoice = true; this.lastEvent = '选择要交换的物资'; }
      else { this.supplies += 4; this.lastEvent = '休整一天，补给 +4'; this.finishTurn(); } return true;
    }
    land() {
      this.moving = false; this.displayPosition = this.position; this.visited.add(this.position); this.score += 25; this.shells++;
      const type = ROUTE[this.position].type;
      if (type === 'wood') { this.wood += 3; this.lastEvent = '林场装货：木材 +3'; }
      else if (type === 'stone') { this.stone += 2; this.lastEvent = '采石码头：石材 +2'; }
      else if (type === 'market') { this.pendingChoice = true; this.lastEvent = '集市赠礼：选择一份物资'; }
      else if (type === 'food' || type === 'harbor') { this.supplies += 3; this.lastEvent = '港湾补给：补给 +3'; }
      else if (type === 'treasure') { this.shells += 3; this.wood++; this.stone++; this.lastEvent = '发现宝箱：贝壳 +3，木石各 +1'; }
      else { this.supplies = Math.max(0, this.supplies - 2); this.wood = Math.max(0, this.wood - 1); this.lastEvent = '遭遇风浪：补给 -2，木材 -1'; }
      this.finishTurn();
    }
    update(dt) {
      if (this.status !== 'playing' || !finite(dt) || dt <= 0) return; dt = Math.min(dt, 1); this.motion += dt; if (!this.moving) return;
      if (this.rollTime > 0) { const used = Math.min(this.rollTime, dt); this.rollTime -= used; dt -= used; }
      if (this.rollTime <= 0 && dt > 0) { this.stepTime += dt; while (this.stepTime >= .16 && this.stepsLeft > 0) { this.stepTime -= .16; this.position = (this.position + 1) % ROUTE.length; this.stepsLeft--; } if (this.stepsLeft <= 0) this.land(); else this.displayPosition = this.position + this.stepTime / .16; }
    }
    snapshot() { return copy({ key: 'dice-voyage', level: this.level, status: this.status, score: this.score, turn: this.turn, turnLimit: this.turnLimit, position: this.position, moving: this.moving, die: this.die, wood: this.wood, stone: this.stone, supplies: this.supplies, shells: this.shells, landmarks: this.landmarks, goalLandmarks: this.goalLandmarks, visited: [...this.visited], goalVisits: this.goalVisits, pendingChoice: this.pendingChoice, route: ROUTE, lastEvent: this.lastEvent, actions: this.actions() }); }
    draw(ctx) {
      ctx.save(); gradient(ctx, '#86d6e0', '#349dbd');
      for (let i = 0; i < 30; i++) { const x = (i * 73 + this.motion * 6) % 380 - 10, y = 156 + i * 11; line(ctx, [[x, y], [x + 9, y + 2], [x + 20, y]], '#c8f9ef55', 1.5); }
      oval(ctx, 181, 304, 150, 152, '#247d9955'); oval(ctx, 181, 299, 137, 143, '#eee0a8'); oval(ctx, 181, 296, 121, 127, '#8abc75'); oval(ctx, 181, 294, 107, 113, '#a9d381');
      line(ctx, [...ROUTE.map(t => [t.x, t.y]), [ROUTE[0].x, ROUTE[0].y]], '#f1ddb0', 12);
      for (let i = 0; i < ROUTE.length; i++) {
        const t = ROUTE[i], col = ROUTE_COLORS[t.type]; iso(ctx, t.x, t.y + 10, 29, 15, 9, [col, '#63878c', '#537981']); round(ctx, t.x - 24, t.y - 17, 48, 35, 8, col, this.visited.has(i) ? '#fff5c4' : '#537b82'); text(ctx, t.label, t.x, t.y, 11, '#294e56', 'center'); if (this.visited.has(i)) { oval(ctx, t.x + 20, t.y - 14, 6, 6, '#ffec96'); text(ctx, '✓', t.x + 20, t.y - 13, 8, '#4e8271', 'center'); }
      }
      tree(ctx, 113, 229, 18); tree(ctx, 243, 234, 22); flower(ctx, 118, 363, '#fff2c5'); flower(ctx, 241, 354, '#fff2c5');
      for (let i = 0; i < this.goalLandmarks; i++) { const x = 180 + (i - (this.goalLandmarks - 1) / 2) * 51; if (i < this.landmarks) building(ctx, i === 0 ? 'lighthouse' : i === 1 ? 'market' : 'home', x, 272, i === 2 ? 2 : 1, .53); else { oval(ctx, x, 264, 21, 12, '#719b6866'); text(ctx, '+', x, 257, 25, '#fbefc8', 'center'); } }
      // Animated die remains tactile; route movement is state-driven, not decorative.
      ctx.save(); ctx.translate(180, 319); if (this.moving && this.rollTime > 0) ctx.rotate(Math.sin(this.motion * 24) * .19);
      round(ctx, -32, -30, 64, 64, 14, '#538b8055'); round(ctx, -32, -35, 64, 64, 14, '#fff6d8', '#d0bc85');
      const die = this.rollTime > 0 ? Math.floor(this.motion * 14) % 6 + 1 : this.die; const dots = [[], [[0, 0]], [[-13, -13], [13, 13]], [[-13, -13], [0, 0], [13, 13]], [[-13, -13], [13, -13], [-13, 13], [13, 13]], [[-13, -13], [13, -13], [0, 0], [-13, 13], [13, 13]], [[-13, -13], [13, -13], [-13, 0], [13, 0], [-13, 13], [13, 13]]][die]; dots.forEach(d => oval(ctx, d[0], d[1] - 3, 4.5, 4.5, '#4f6f78')); ctx.restore();
      text(ctx, this.moving ? '航行中' : '点骰子出发', 180, 363, 12, '#3d705d', 'center');
      text(ctx, '地标 4木2石 · 交换 2贝壳', 180, 380, 10, '#47765e', 'center');
      const base = Math.floor(this.displayPosition) % 12, fraction = this.displayPosition - Math.floor(this.displayPosition), a = ROUTE[base], b = ROUTE[(base + 1) % 12], bx = a.x + (b.x - a.x) * fraction, by = a.y + (b.y - a.y) * fraction - 17;
      oval(ctx, bx, by + 17, 19, 7, '#37647555'); poly(ctx, [[bx - 21, by + 5], [bx + 21, by + 5], [bx + 12, by + 18], [bx - 12, by + 18]], '#cd7951', '#825b42'); line(ctx, [[bx, by + 5], [bx, by - 27]], '#7b6346', 3); poly(ctx, [[bx - 2, by - 25], [bx - 2, by + 1], [bx - 20, by + 1]], '#fff5d0'); poly(ctx, [[bx + 2, by - 19], [bx + 2, by + 1], [bx + 16, by + 1]], '#ed966e');
      round(ctx, 12, 86, 336, 62, 12, '#fff9dd', '#c7caad'); text(ctx, `地标 ${this.landmarks}/${this.goalLandmarks}  ·  足迹 ${this.visited.size}/${this.goalVisits}`, 24, 103, 14, '#406b66'); text(ctx, `${this.turn}/${this.turnLimit} 回合`, 336, 103, 11, '#628187', 'right'); text(ctx, `木 ${this.wood}   石 ${this.stone}   补给 ${this.supplies}   贝壳 ${this.shells}`, 24, 129, 12, '#657858');
      round(ctx, 12, 452, 336, 28, 10, '#f5f0cc'); text(ctx, this.lastEvent, 180, 466, 12, '#446d6e', 'center'); ctx.restore();
    }
  }

  root.AirvanaPhysicsModes = root.AirvanaPhysicsModes || {};
  root.AirvanaPhysicsModes['harvest-lane'] = HarvestLane;
  root.AirvanaPhysicsModes['pocket-city'] = PocketCity;
  root.AirvanaPhysicsModes['dice-voyage'] = DiceVoyage;
})(typeof window !== 'undefined' ? window : globalThis);
