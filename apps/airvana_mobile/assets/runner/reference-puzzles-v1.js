(function (root) {
  'use strict';

  // Original, dependency-free artwork and curated local-only puzzle rules.
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const levelOf = (options) => clamp(Math.floor(Number(options && options.level) || 1), 1, 3);
  const inside = (p, r) => !!p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= r.x && p.y >= r.y && p.x < r.x + r.w && p.y < r.y + r.h;
  const copy = (value) => JSON.parse(JSON.stringify(value));
  function round(ctx, x, y, w, h, r, fill, stroke) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
  }
  function oval(ctx, x, y, rx, ry, fill) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); }
  function text(ctx, value, x, y, size, color, align, family) { ctx.font = '700 ' + size + 'px ' + (family || 'system-ui, sans-serif'); ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = color; ctx.fillText(String(value), x, y); }
  function gradient(ctx, y, end, a, b) { const g = ctx.createLinearGradient(0, y, 0, end); g.addColorStop(0, a); g.addColorStop(1, b); return g; }
  function star(ctx, x, y, r, color) { ctx.beginPath(); for (let i = 0; i < 10; i += 1) { const a = i * Math.PI / 5 - Math.PI / 2; const d = i % 2 ? r * .46 : r; ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d); } ctx.closePath(); ctx.fillStyle = color; ctx.fill(); }
  const JEWELS = [null, ['#ace9ff', '#4da6ed', '#205bb0'], ['#ffd8f2', '#ed79ba', '#b33a7c'], ['#d8ff9e', '#86ca47', '#3b8738'], ['#fff1ab', '#efbf3c', '#bd7b24'], ['#e6d9ff', '#a987e7', '#6547af'], ['#ffc1b2', '#f1786f', '#bb3c50']];
  function jewel(ctx, x, y, s, color, alpha) {
    const pal = JEWELS[color || 1]; ctx.save(); ctx.globalAlpha = alpha == null ? 1 : alpha;
    round(ctx, x + 1, y + 2, s - 2, s - 2, 5, pal[2]); round(ctx, x + 2, y + 1, s - 4, s - 5, 4, pal[1]);
    ctx.beginPath(); ctx.moveTo(x + 3, y + 2); ctx.lineTo(x + s - 4, y + 2); ctx.lineTo(x + s - 10, y + 8); ctx.lineTo(x + 9, y + 8); ctx.closePath(); ctx.fillStyle = pal[0]; ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 3, y + 3); ctx.lineTo(x + 9, y + 9); ctx.lineTo(x + 9, y + s - 10); ctx.lineTo(x + 3, y + s - 4); ctx.closePath(); ctx.fillStyle = pal[0]; ctx.globalAlpha *= .65; ctx.fill(); ctx.restore();
  }
  const GEM_GEOMETRY = Object.freeze({ x: 24, y: 110, cell: 52, size: 6, trayX: 14, trayY: 430, trayWidth: 108, trayHeight: 54, trayStride: 112 });
  const GEM_LEVELS = [
    { target: 3, board: ['001111', '110011', '111100', '000000', '000000', '000000'], pieces: [[[0, 0], [1, 0]], [[0, 0], [1, 0]], [[0, 0], [1, 0]]] },
    { target: 4, board: ['110011', '110011', '000111', '111000', '010101', '101010'], pieces: [[[0, 0], [1, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [2, 0]], [[0, 0], [1, 0], [2, 0]]] },
    { target: 5, board: ['001111', '011111', '110011', '110011', '111000', '000000'], pieces: [[[0, 0], [1, 0], [0, 1]], [[0, 0], [1, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [2, 0]]] }
  ];
  class GemBlocksGame {
    constructor(options) {
      this.level = levelOf(options); this.levelCount = 3; this.status = 'playing'; this.score = 0; this.lines = 0; this.combo = 0; this.selected = null; this.drag = null; this.hover = null; this.cursor = { col: 0, row: 0 }; this.message = ''; this.flash = 0; this.cleared = [];
      const data = GEM_LEVELS[this.level - 1]; this.target = data.target;
      this.board = data.board.map((row, r) => row.split('').map((cell, c) => cell === '1' ? 1 + (r + c + this.level) % 6 : 0));
      this.pieces = data.pieces.map((cells, id) => ({ id, cells: copy(cells), color: [3, 5, 4][id], used: false }));
      this.instruction = '选方块再点空格，填满整行或整列';
    }
    fits(piece, col, row) { return !!piece && !piece.used && piece.cells.every(([x, y]) => col + x >= 0 && col + x < 6 && row + y >= 0 && row + y < 6 && this.board[row + y][col + x] === 0); }
    placements() {
      const result = []; this.pieces.forEach(piece => {
        if (piece.used) return; let cells = copy(piece.cells); const orientations = new Set();
        for (let turns = 0; turns < 4; turns += 1) {
          const signature = cells.map(c => c.join(',')).sort().join(';');
          if (!orientations.has(signature)) { orientations.add(signature); for (let row = 0; row < 6; row += 1) for (let col = 0; col < 6; col += 1) if (this.fits({ ...piece, cells }, col, row)) result.push({ piece: piece.id, col, row, turns }); }
          const rotated = cells.map(([x, y]) => [-y, x]); const minX = Math.min(...rotated.map(c => c[0])); cells = rotated.map(([x, y]) => [x - minX, y]);
        }
      }); return result;
    }
    place(col, row) {
      if (this.status !== 'playing') return false; const piece = this.pieces[this.selected];
      if (!this.fits(piece, col, row)) { this.message = '这里放不下，试试其他空位'; this.flash = 1.1; return false; }
      piece.cells.forEach(([x, y]) => { this.board[row + y][col + x] = piece.color; }); piece.used = true; this.score += piece.cells.length * 10;
      const rows = [], cols = []; for (let i = 0; i < 6; i += 1) { if (this.board[i].every(Boolean)) rows.push(i); if (this.board.every(r => r[i] > 0)) cols.push(i); }
      const count = rows.length + cols.length; this.combo = count ? this.combo + 1 : 0; this.cleared = [];
      for (let r = 0; r < 6; r += 1) for (let c = 0; c < 6; c += 1) if (rows.includes(r) || cols.includes(c)) { this.cleared.push({ x: GEM_GEOMETRY.x + (c + .5) * GEM_GEOMETRY.cell, y: GEM_GEOMETRY.y + (r + .5) * GEM_GEOMETRY.cell, color: this.board[r][c] }); this.board[r][c] = 0; }
      this.lines += count; this.score += count * 100 + Math.max(0, this.combo - 1) * 40; this.flash = 1;
      this.message = count ? '消除 ' + count + ' 条 · 连击 ×' + this.combo : '方块已放好'; this.selected = null; this.drag = null; this.hover = null;
      if (this.lines >= this.target) { this.status = 'success'; this.message = '宝石订单完成！'; }
      else if (this.pieces.every(p => p.used)) { this.status = 'failure'; this.message = '方块用完了，还差 ' + (this.target - this.lines) + ' 条'; }
      else if (!this.placements().length) { this.status = 'failure'; this.message = '剩余方块没有可放的位置'; }
      return true;
    }
    boardCell(p) { const g = GEM_GEOMETRY; return inside(p, { x: g.x, y: g.y, w: g.cell * g.size, h: g.cell * g.size }) ? { col: Math.floor((p.x - g.x) / g.cell), row: Math.floor((p.y - g.y) / g.cell) } : null; }
    pointerDown(p) {
      if (this.status !== 'playing') return;
      const g = GEM_GEOMETRY; const tray = this.pieces.find(piece => !piece.used && inside(p, { x: g.trayX + piece.id * g.trayStride, y: g.trayY, w: g.trayWidth, h: g.trayHeight }));
      if (tray) { this.selected = tray.id; this.drag = { fromTray: true, moved: false, start: { x: p.x, y: p.y } }; this.message = '点棋盘放置，也可以拖动'; return; }
      const cell = this.boardCell(p); if (cell && this.selected != null) { this.drag = { fromTray: false }; this.hover = cell; }
    }
    pointerMove(p) { if (this.status !== 'playing' || !this.drag) return; this.hover = this.boardCell(p); if (this.drag.start && Math.hypot(p.x - this.drag.start.x, p.y - this.drag.start.y) > 5) this.drag.moved = true; }
    pointerUp(p) { if (this.status !== 'playing' || !this.drag) return; const drag = this.drag; this.drag = null; const cell = this.boardCell(p); if (cell && (!drag.fromTray || drag.moved)) this.place(cell.col, cell.row); this.hover = null; }
    cancelPointer() { this.drag = null; this.hover = null; this.selected = null; }
    key(key) {
      if (this.status !== 'playing') return;
      if (/^[123]$/.test(key) && !this.pieces[Number(key) - 1].used) this.selected = Number(key) - 1;
      if (key === 'ArrowLeft') this.cursor.col = Math.max(0, this.cursor.col - 1); if (key === 'ArrowRight') this.cursor.col = Math.min(5, this.cursor.col + 1);
      if (key === 'ArrowUp') this.cursor.row = Math.max(0, this.cursor.row - 1); if (key === 'ArrowDown') this.cursor.row = Math.min(5, this.cursor.row + 1); if (key === 'Enter' || key === ' ') this.place(this.cursor.col, this.cursor.row);
    }
    actions() { return [{ id: 'rotate', label: '旋转方块', disabled: this.selected == null || this.status !== 'playing' }, { id: 'clear', label: '取消选择', disabled: this.selected == null || this.status !== 'playing' }]; }
    perform(id) {
      if (this.status !== 'playing') return;
      if (id === 'clear') this.cancelPointer();
      if (id === 'rotate' && this.selected != null) { const piece = this.pieces[this.selected]; const cells = piece.cells.map(([x, y]) => [-y, x]); const minX = Math.min(...cells.map(c => c[0])); piece.cells = cells.map(([x, y]) => [x - minX, y]); this.message = '旋转后从左上角对齐空位'; }
    }
    update(dt) { if (this.status !== 'playing' || !Number.isFinite(dt) || dt < 0) return; this.flash = Math.max(0, this.flash - Math.min(dt, .1)); }
    snapshot() { return { key: 'gem-blocks', level: this.level, status: this.status, score: this.score, lines: this.lines, target: this.target, board: copy(this.board), pieces: copy(this.pieces), selected: this.selected, placements: this.placements(), message: this.message, geometry: { ...GEM_GEOMETRY } }; }
    draw(ctx) {
      ctx.save(); ctx.fillStyle = gradient(ctx, 78, 488, '#454390', '#262b67'); ctx.fillRect(0, 78, 360, 410);
      for (let i = 0; i < 24; i += 1) { ctx.save(); ctx.translate((i * 83 + 15) % 360, 84 + (i * 71) % 404); ctx.rotate(.7); ctx.strokeStyle = 'rgba(165,168,247,.075)'; ctx.lineWidth = 2; ctx.strokeRect(-12, -12, 24, 24); ctx.restore(); }
      const g = GEM_GEOMETRY;
      round(ctx, 48, 82, 264, 24, 12, '#24275f', '#7275c3'); star(ctx, 69, 94, 8, '#b6f07a'); text(ctx, '消除 ' + this.lines + ' / ' + this.target + ' 条线', 182, 94, 13, '#f8f4ff');
      round(ctx, g.x - 5, g.y - 3, g.cell * g.size + 10, g.cell * g.size + 6, 10, '#151d46', '#777abc');
      for (let r = 0; r < 6; r += 1) for (let c = 0; c < 6; c += 1) { const x = g.x + c * g.cell, y = g.y + r * g.cell; round(ctx, x + 1, y + 1, g.cell - 2, g.cell - 2, 4, (r + c) % 2 ? '#26335e' : '#233057', '#34416d'); if (this.board[r][c]) jewel(ctx, x + 1, y + 1, g.cell - 2, this.board[r][c]); }
      const preview = this.hover || (this.selected != null ? this.cursor : null); if (preview && this.selected != null) { const piece = this.pieces[this.selected]; const fits = this.fits(piece, preview.col, preview.row); piece.cells.forEach(([x, y]) => { const c = preview.col + x, r = preview.row + y; if (c < 6 && r < 6) round(ctx, g.x + 2 + c * g.cell, g.y + 2 + r * g.cell, g.cell - 4, g.cell - 4, 4, fits ? 'rgba(193,251,146,.35)' : 'rgba(248,100,120,.4)', fits ? '#daffbd' : '#ff939e'); }); }
      if (this.flash > 0) this.cleared.forEach((p, i) => { const t = 1 - this.flash; star(ctx, p.x + Math.sin(i * 2) * t * 12, p.y - t * 16, (1 - t) * 9, '#fff3a7'); });
      this.pieces.forEach(piece => { const x = g.trayX + piece.id * g.trayStride; round(ctx, x, g.trayY, g.trayWidth, g.trayHeight, 10, this.selected === piece.id ? '#57579e' : '#363971', this.selected === piece.id ? '#d7e5ff' : '#53578b'); if (piece.used) { text(ctx, '✓', x + g.trayWidth / 2, g.trayY + g.trayHeight / 2, 24, '#8697c4'); return; } const maxX = Math.max(...piece.cells.map(c => c[0])) + 1, maxY = Math.max(...piece.cells.map(c => c[1])) + 1, size = Math.min(20, (g.trayHeight - 10) / maxY); piece.cells.forEach(([cx, cy]) => jewel(ctx, x + (g.trayWidth - maxX * size) / 2 + cx * size, g.trayY + (g.trayHeight - maxY * size) / 2 + cy * size, size, piece.color)); });
      ctx.restore();
    }
  }

  const DEALS = [
    { start: 5, sequence: [6, 7, 8, 9, 10, 9, 8, 7], stock: [2, 11, 4] },
    { start: 8, sequence: [9, 10, 11, 12, 13, 1, 2, 3, 8, 9, 10, 11], stock: [7, 4, 12] },
    { start: 2, sequence: [3, 4, 5, 6, 7, 8, 9, 10, 5, 4, 3, 2, 10, 11, 12, 13], stock: [6, 9, 4] }
  ];
  const rankName = (rank) => ({ 1: 'A', 11: 'J', 12: 'Q', 13: 'K' })[rank] || String(rank);
  const SUITS = ['♥', '♠', '♦', '♣'];
  function cloud(ctx, x, y, s, color) { oval(ctx, x, y + 6 * s, 34 * s, 12 * s, color); oval(ctx, x - 15 * s, y, 14 * s, 13 * s, color); oval(ctx, x + 5 * s, y - 8 * s, 20 * s, 20 * s, color); oval(ctx, x + 24 * s, y, 13 * s, 13 * s, color); }
  function balloon(ctx, x, y, s) { ctx.save(); ctx.translate(x, y); ctx.scale(s, s); oval(ctx, 0, 0, 20, 27, '#f598ad'); oval(ctx, 0, 0, 8, 27, '#ffe9b4'); ctx.strokeStyle = '#9c7181'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-9, 22); ctx.lineTo(-5, 38); ctx.moveTo(9, 22); ctx.lineTo(5, 38); ctx.stroke(); round(ctx, -7, 35, 14, 10, 3, '#cb9571', '#a47769'); ctx.restore(); }
  function drawCard(ctx, card, foundation, blocked, accent) {
    const { x, y, w, h } = card; ctx.save();
    round(ctx, x + 1, y + 4, w, h, 9, 'rgba(38,77,115,.18)');
    round(ctx, x, y, w, h, 9, blocked ? '#e3e7e9' : '#fffdf4', accent ? '#ecc06b' : '#a8bfd0');
    if (card.back) { round(ctx, x + 5, y + 5, w - 10, h - 10, 6, '#4f9ed3', '#a8e8f4'); for (let row = 0; row < 4; row += 1) for (let col = 0; col < 3; col += 1) star(ctx, x + 15 + col * 18, y + 17 + row * 17, 3, '#b6e5ee'); return ctx.restore(); }
    const suit = SUITS[card.suit || 0], red = suit === '♥' || suit === '♦', color = blocked ? '#879bac' : red ? '#d84d70' : '#294d68';
    text(ctx, rankName(card.rank), x + 13, y + 15, 14, color); text(ctx, suit, x + w - 13, y + 15, 13, color);
    text(ctx, rankName(card.rank), x + w / 2, y + h * .49, foundation ? 35 : 29, color, 'center', 'Georgia, serif'); text(ctx, suit, x + w / 2, y + h * .78, 17, color);
    if (blocked) { ctx.strokeStyle = '#94a5b6'; ctx.lineWidth = 1.4; round(ctx, x + w / 2 - 4, y + h - 15, 8, 7, 2, '#acbcc7'); }
    ctx.restore();
  }
  class CloudSolitaireGame {
    constructor(options) {
      this.level = levelOf(options); this.levelCount = 3; this.status = 'playing'; this.score = 0; this.streak = 0; this.bestStreak = 0; this.history = []; this.undoLeft = 3; this.focus = 0; this.pending = null; this.message = ''; this.time = 0;
      const deal = DEALS[this.level - 1]; this.foundation = deal.start; this.stock = deal.stock.slice(); const layers = deal.sequence.length / 4;
      this.cards = deal.sequence.map((rank, id) => { const col = id % 4, row = layers - 1 - Math.floor(id / 4); return { id, rank, suit: (id + this.level) % 4, col, row, x: 24 + col * 80, y: 131 + row * 46, w: 68, h: 88, removed: false }; });
      this.instruction = '点比底牌大 1 或小 1 的牌 · A 可接 K';
    }
    unblocked(card) { return !card.removed && !this.cards.some(other => other.col === card.col && other.row > card.row && !other.removed); }
    matches(rank) { const d = Math.abs(rank - this.foundation); return d === 1 || d === 12; }
    available() { return this.cards.filter(card => this.unblocked(card) && this.matches(card.rank)); }
    save() { this.history.push({ foundation: this.foundation, stock: this.stock.slice(), removed: this.cards.map(c => c.removed), score: this.score, streak: this.streak, bestStreak: this.bestStreak }); if (this.history.length > 24) this.history.shift(); }
    check() { if (this.cards.every(c => c.removed)) { this.status = 'success'; this.message = '云端航线清空！'; this.score += this.stock.length * 30; } else if (!this.stock.length && !this.available().length) { this.status = 'failure'; this.message = '牌堆用完且没有可接的牌'; } }
    play(id) {
      if (this.status !== 'playing') return false; const card = this.cards.find(c => c.id === id);
      if (!card || !this.unblocked(card)) { this.message = '先移走压在上面的牌'; return false; }
      if (!this.matches(card.rank)) { this.message = '需要 ' + rankName(this.foundation === 1 ? 13 : this.foundation - 1) + ' 或 ' + rankName(this.foundation === 13 ? 1 : this.foundation + 1); return false; }
      this.save(); card.removed = true; this.foundation = card.rank; this.streak += 1; this.bestStreak = Math.max(this.bestStreak, this.streak); this.score += 50 + Math.min(10, this.streak) * 10; this.message = this.streak > 1 ? '连续接龙 ×' + this.streak : '漂亮的一步'; this.check(); return true;
    }
    pointerDown(p) {
      if (this.status !== 'playing') return; this.pending = null;
      if (inside(p, { x: 69, y: 376, w: 74, h: 96 })) { this.pending = 'draw'; return; }
      const card = this.cards.slice().sort((a, b) => b.row - a.row).find(c => !c.removed && inside(p, c)); if (card) this.pending = card.id;
    }
    pointerMove() {}
    pointerUp(p) { if (this.status !== 'playing') return; const pending = this.pending; this.pending = null; if (pending === 'draw' && inside(p, { x: 69, y: 376, w: 74, h: 96 })) this.perform('draw'); else if (typeof pending === 'number' && inside(p, this.cards[pending])) this.play(pending); }
    cancelPointer() { this.pending = null; }
    actions() { return [{ id: 'draw', label: '翻牌 · ' + this.stock.length, disabled: !this.stock.length || this.status !== 'playing' }, { id: 'undo', label: '撤销 · ' + this.undoLeft, disabled: !this.history.length || !this.undoLeft || this.status !== 'playing' }]; }
    perform(id) {
      if (this.status !== 'playing') return;
      if (id === 'draw' && this.stock.length) { this.save(); this.foundation = this.stock.shift(); this.streak = 0; this.message = '新底牌 ' + rankName(this.foundation); this.check(); }
      if (id === 'undo' && this.history.length && this.undoLeft > 0) { const state = this.history.pop(); this.foundation = state.foundation; this.stock = state.stock; this.cards.forEach((c, i) => { c.removed = state.removed[i]; }); this.score = state.score; this.streak = state.streak; this.bestStreak = state.bestStreak; this.undoLeft -= 1; this.message = '已撤回上一步'; }
    }
    key(key) { if (this.status !== 'playing') return; if (/^[1234]$/.test(key)) { const col = Number(key) - 1; const card = this.cards.find(c => c.col === col && this.unblocked(c)); if (card) this.play(card.id); } if (key === 'ArrowLeft') this.focus = (this.focus + 3) % 4; if (key === 'ArrowRight') this.focus = (this.focus + 1) % 4; if (key === 'Enter' || key === ' ') this.key(String(this.focus + 1)); if (key === 'z' || key === 'Z') this.perform('undo'); }
    update(dt) { if (this.status === 'playing' && Number.isFinite(dt) && dt > 0) this.time += Math.min(dt, .1); }
    snapshot() { return { key: 'cloud-solitaire', level: this.level, status: this.status, score: this.score, foundation: this.foundation, stock: this.stock.slice(), stockCount: this.stock.length, streak: this.streak, undoLeft: this.undoLeft, historyCount: this.history.length, cards: this.cards.map(c => ({ ...c, blocked: !c.removed && !this.unblocked(c) })), available: this.available().map(c => c.id), message: this.message }; }
    draw(ctx) {
      ctx.save(); ctx.fillStyle = gradient(ctx, 78, 488, '#a7dcf2', '#ffe0bf'); ctx.fillRect(0, 78, 360, 410);
      ctx.lineWidth = 13; ['#efacc5', '#f9d69e', '#d4e5a9', '#afd8e6'].forEach((color, i) => { ctx.strokeStyle = color; ctx.beginPath(); ctx.arc(374, 441, 205 + i * 14, Math.PI, Math.PI * 1.65); ctx.stroke(); });
      cloud(ctx, 24, 137, 1.2, 'rgba(255,255,255,.6)'); cloud(ctx, 335, 342, 1.1, 'rgba(255,255,255,.65)'); cloud(ctx, 28, 434, .9, '#ffecd8'); balloon(ctx, 329, 110 + Math.sin(this.time * .7) * 3, .48); balloon(ctx, 29, 334 + Math.sin(this.time * .5) * 4, .35);
      round(ctx, 54, 86, 252, 31, 15, 'rgba(255,255,255,.78)', '#c3d5df'); text(ctx, '航线收集  ' + this.cards.filter(c => c.removed).length + ' / ' + this.cards.length, 180, 102, 14, '#456479');
      this.cards.slice().sort((a, b) => a.row - b.row).forEach(card => { if (!card.removed) drawCard(ctx, card, false, !this.unblocked(card), this.unblocked(card) && this.matches(card.rank)); });
      if (this.stock.length) { for (let i = Math.min(2, this.stock.length - 1); i >= 0; i -= 1) drawCard(ctx, { x: 72 - i * 3, y: 380 - i * 3, w: 68, h: 88, back: true }, false, false, false); text(ctx, this.stock.length, 105, 420, 23, '#fff'); }
      else { round(ctx, 72, 380, 68, 88, 9, 'rgba(255,255,255,.22)', '#aac6d0'); text(ctx, '已用完', 106, 423, 13, '#648292'); }
      drawCard(ctx, { x: 204, y: 380, w: 72, h: 92, rank: this.foundation, suit: 0 }, true, false, true);
      text(ctx, '→', 172, 421, 25, '#7c8d9f'); text(ctx, '底牌', 241, 366, 12, '#566e81'); text(ctx, '备用牌', 106, 366, 12, '#566e81'); ctx.restore();
    }
  }

  const BUDDIES = [
    { name: '橘尾', species: 'fox', fur: '#edab65', shade: '#c87843', bg: '#ffdfaa' },
    { name: '竹团', species: 'panda', fur: '#fff7e2', shade: '#455564', bg: '#b3e4d0' },
    { name: '泡泡', species: 'frog', fur: '#88c78c', shade: '#4a9c73', bg: '#b9e0fb' },
    { name: '咕咕', species: 'owl', fur: '#b99dde', shade: '#8066ad', bg: '#e4ccf7' },
    { name: '绵绵', species: 'bunny', fur: '#fff3dd', shade: '#eab1ae', bg: '#f8cbd8' },
    { name: '小麦', species: 'cat', fur: '#efc779', shade: '#b68b4c', bg: '#d8e9ab' },
    { name: '点点', species: 'penguin', fur: '#607d91', shade: '#384e67', bg: '#bfe6ef' },
    { name: '松果', species: 'bear', fur: '#c99572', shade: '#956847', bg: '#f1d9bd' }
  ];
  function buddyPortrait(ctx, id, x, y, size) {
    const b = BUDDIES[id]; ctx.save(); ctx.translate(x, y); ctx.scale(size / 60, size / 60);
    // Distinct silhouettes and restrained hand-authored shading, not emoji glyphs.
    oval(ctx, 0, 18, 22, 14, b.shade); oval(ctx, -13, -12, 9, b.species === 'bunny' ? 24 : 12, b.shade); oval(ctx, 13, -12, 9, b.species === 'bunny' ? 24 : 12, b.shade);
    if (b.species === 'fox' || b.species === 'cat' || b.species === 'owl') { [-1, 1].forEach(sign => { ctx.beginPath(); ctx.moveTo(sign * 8, -13); ctx.lineTo(sign * 22, -28); ctx.lineTo(sign * 23, -4); ctx.closePath(); ctx.fillStyle = b.fur; ctx.fill(); }); }
    if (b.species === 'bunny') { oval(ctx, -13, -16, 4, 16, '#f3c0c1'); oval(ctx, 13, -16, 4, 16, '#f3c0c1'); }
    oval(ctx, 0, 0, 25, 24, b.fur); oval(ctx, -7, 9, 10, 11, '#fff1d7'); oval(ctx, 7, 9, 10, 11, '#fff1d7');
    if (b.species === 'panda') { oval(ctx, -10, -4, 8, 10, b.shade); oval(ctx, 10, -4, 8, 10, b.shade); }
    if (b.species === 'owl') { oval(ctx, -10, -4, 11, 12, '#fff1d7'); oval(ctx, 10, -4, 11, 12, '#fff1d7'); }
    if (b.species === 'frog') { oval(ctx, -12, -16, 10, 10, b.fur); oval(ctx, 12, -16, 10, 10, b.fur); }
    const eyeY = b.species === 'frog' ? -15 : -4; [-1, 1].forEach(sign => { oval(ctx, sign * 9, eyeY, 3.4, 4.6, '#354758'); oval(ctx, sign * 9 - 1, eyeY - 1.5, 1.2, 1.4, '#fff'); });
    oval(ctx, -17, 6, 4, 2.5, '#ecaca0'); oval(ctx, 17, 6, 4, 2.5, '#ecaca0');
    if (b.species === 'owl' || b.species === 'penguin') { ctx.beginPath(); ctx.moveTo(-4, 6); ctx.lineTo(4, 6); ctx.lineTo(0, 12); ctx.closePath(); ctx.fillStyle = '#e3a24d'; ctx.fill(); }
    else { oval(ctx, 0, 6, 3, 2.2, '#69534c'); ctx.beginPath(); ctx.arc(0, 9, 5, .3, Math.PI - .3); ctx.strokeStyle = '#69534c'; ctx.lineWidth = 1.3; ctx.stroke(); }
    if (b.species === 'cat') { ctx.strokeStyle = b.shade; ctx.lineWidth = 2; [-1, 0, 1].forEach(n => { ctx.beginPath(); ctx.moveTo(n * 7, -20); ctx.lineTo(n * 5, -13); ctx.stroke(); }); }
    round(ctx, -15, 21, 30, 6, 3, ['#7aa9a4', '#e4aa65', '#eea4ad', '#dfb76c'][id % 4]); ctx.restore();
  }
  class BuddyFlipGame {
    constructor(options) {
      this.level = levelOf(options); this.levelCount = 3; this.status = 'playing'; this.score = 0; this.pairCount = [4, 6, 8][this.level - 1]; this.movesLeft = [7, 10, 13][this.level - 1]; this.matched = 0; this.open = []; this.resolveTime = 0; this.peek = 1.8; this.hintsLeft = 1; this.pending = null; this.focus = 0; this.message = '记住伙伴的位置'; this.time = 0;
      const values = Array.from({ length: this.pairCount * 2 }, (_, i) => Math.floor(i / 2)); let seed = 721 + this.level * 177; const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      for (let i = values.length - 1; i > 0; i -= 1) { const j = Math.floor(random() * (i + 1)); [values[i], values[j]] = [values[j], values[i]]; }
      const rows = values.length / 4, startY = 133 + (4 - rows) * 29;
      this.cards = values.map((buddy, id) => ({ id, buddy, x: 21 + id % 4 * 81, y: startY + Math.floor(id / 4) * 82, w: 72, h: 76, matched: false, face: 1 }));
      this.instruction = '翻开两张相同伙伴，在步数内集齐';
    }
    flip(id) { if (this.status !== 'playing' || this.peek > 0 || this.resolveTime > 0) return false; const card = this.cards[id]; if (!card || card.matched || this.open.includes(id)) return false; this.open.push(id); this.message = '再找一张相同的伙伴'; if (this.open.length === 2) { this.movesLeft -= 1; this.resolveTime = .72; this.message = this.cards[this.open[0]].buddy === card.buddy ? '找到一对好朋友！' : '记住位置，再试一次'; } return true; }
    pointerDown(p) { if (this.status !== 'playing' || this.peek > 0 || this.resolveTime > 0) return; const card = this.cards.find(c => inside(p, c)); this.pending = card ? card.id : null; }
    pointerMove() {}
    pointerUp(p) { if (this.status !== 'playing') return; const pending = this.pending; this.pending = null; if (pending != null && inside(p, this.cards[pending])) this.flip(pending); }
    cancelPointer() { this.pending = null; }
    actions() { return [{ id: 'peek', label: '回想一下 · ' + this.hintsLeft, disabled: !this.hintsLeft || this.peek > 0 || this.resolveTime > 0 || this.status !== 'playing' }]; }
    perform(id) { if (this.status !== 'playing') return; if (id === 'peek' && this.hintsLeft > 0 && this.peek <= 0 && this.resolveTime <= 0) { this.hintsLeft -= 1; this.peek = 1.15; this.message = '最后一次全体亮相，记住了吗？'; } }
    key(key) { if (this.status !== 'playing') return; if (key === 'ArrowLeft') this.focus = (this.focus + this.cards.length - 1) % this.cards.length; if (key === 'ArrowRight') this.focus = (this.focus + 1) % this.cards.length; if (key === 'ArrowUp') this.focus = (this.focus + this.cards.length - 4) % this.cards.length; if (key === 'ArrowDown') this.focus = (this.focus + 4) % this.cards.length; if (key === 'Enter' || key === ' ') this.flip(this.focus); }
    update(dt) {
      if (this.status !== 'playing' || !Number.isFinite(dt) || dt <= 0) return; dt = Math.min(dt, .1); this.time += dt;
      if (this.peek > 0) { this.peek = Math.max(0, this.peek - dt); if (!this.peek) this.message = '开始寻找伙伴'; }
      if (this.resolveTime > 0) { this.resolveTime = Math.max(0, this.resolveTime - dt); if (!this.resolveTime) { const [a, b] = this.open.map(id => this.cards[id]); if (a.buddy === b.buddy) { a.matched = b.matched = true; this.matched += 1; this.score += 100 + this.movesLeft * 5; } this.open = []; if (this.matched === this.pairCount) { this.status = 'success'; this.message = '伙伴图鉴收集完成！'; } else if (!this.movesLeft) { this.status = 'failure'; this.message = '步数用完了，还差 ' + (this.pairCount - this.matched) + ' 对'; } } }
      this.cards.forEach(card => { const target = this.peek > 0 || card.matched || this.open.includes(card.id) ? 1 : 0; card.face += Math.sign(target - card.face) * Math.min(Math.abs(target - card.face), dt * 7); });
    }
    snapshot() { return { key: 'buddy-flip', level: this.level, status: this.status, score: this.score, movesLeft: this.movesLeft, pairCount: this.pairCount, matched: this.matched, open: this.open.slice(), resolveTime: this.resolveTime, peek: this.peek, hintsLeft: this.hintsLeft, cards: this.cards.map(c => ({ ...c, name: BUDDIES[c.buddy].name, visible: this.peek > 0 || c.matched || this.open.includes(c.id) })), message: this.message }; }
    draw(ctx) {
      ctx.save(); ctx.fillStyle = gradient(ctx, 78, 488, '#e2f0de', '#f8e9d1'); ctx.fillRect(0, 78, 360, 410);
      oval(ctx, -22, 273, 64, 207, '#c5ddbe'); oval(ctx, 384, 236, 64, 194, '#c9dfc0');
      for (let i = 0; i < 14; i += 1) { const x = i % 2 ? 346 : 13, y = 120 + i * 25; oval(ctx, x, y, 7, 3, '#aacba7'); }
      round(ctx, 26, 87, 308, 32, 16, '#fffaf0', '#d8dfc6'); text(ctx, '伙伴 ' + this.matched + '/' + this.pairCount, 98, 103, 14, '#55755c'); text(ctx, '剩余 ' + this.movesLeft + ' 步', 261, 103, 14, '#8e7058');
      if (this.peek > 0) text(ctx, '记忆时间 · ' + Math.ceil(this.peek) + ' 秒', 180, 128, 12, '#6b8271');
      this.cards.forEach(card => {
        const cx = card.x + card.w / 2, cy = card.y + card.h / 2, face = card.face, width = Math.max(.08, Math.abs(face * 2 - 1)); ctx.save(); ctx.translate(cx, cy); ctx.scale(width, 1); ctx.translate(-cx, -cy);
        round(ctx, card.x + 1, card.y + 3, card.w, card.h, 11, 'rgba(108,128,93,.18)');
        const front = face >= .5, b = BUDDIES[card.buddy]; round(ctx, card.x, card.y, card.w, card.h, 11, front ? b.bg : '#6faaa1', card.matched ? '#bba660' : front ? '#fffdf2' : '#568b84');
        if (front) { buddyPortrait(ctx, card.buddy, cx, cy - 1, 46); text(ctx, b.name, cx, card.y + 65, 11, '#4b5b53'); if (card.matched) star(ctx, card.x + 60, card.y + 12, 7, '#fff9cf'); }
        else { round(ctx, card.x + 6, card.y + 6, card.w - 12, card.h - 12, 7, null, '#acd1bf'); oval(ctx, cx, cy + 3, 12, 10, '#d7e7c9'); [-12, -4, 4, 12].forEach((dx, i) => oval(ctx, cx + dx, cy - 10 - (i === 1 || i === 2 ? 3 : 0), 4, 5, '#d7e7c9')); }
        ctx.restore();
      });
      if (this.cards.length < 16) { const y = this.cards[this.cards.length - 1].y + 102; text(ctx, '林间伙伴图鉴', 180, y, 12, '#7a9275'); for (let id = 0; id < this.pairCount; id += 1) { const x = 180 + (id - (this.pairCount - 1) / 2) * 32; const complete = this.cards.filter(c => c.buddy === id).every(c => c.matched); oval(ctx, x, y + 26, 12, 12, complete ? '#e3ba70' : '#d8dec6'); if (complete) star(ctx, x, y + 26, 8, '#fff3ca'); else text(ctx, '?', x, y + 26, 12, '#9cac92'); } }
      ctx.restore();
    }
  }

  root.AirvanaPhysicsModes = root.AirvanaPhysicsModes || {};
  root.AirvanaPhysicsModes['gem-blocks'] = GemBlocksGame;
  root.AirvanaPhysicsModes['cloud-solitaire'] = CloudSolitaireGame;
  root.AirvanaPhysicsModes['buddy-flip'] = BuddyFlipGame;
})(typeof window !== 'undefined' ? window : globalThis);
