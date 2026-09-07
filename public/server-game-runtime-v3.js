(function (root) {
  'use strict';
  const copy = value => JSON.parse(JSON.stringify(value));
  const shuffle = (values, random) => { const list = values.slice(); for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; } return list; };

  class DecisionGame {
    constructor(config, options = {}) {
      this.rounds = copy(config.rounds).map(round => ({ ...round, choices: shuffle(round.choices, options.random || Math.random) }));
      this.health = options.difficulty >= 3 ? 2 : 3; this.round = 0; this.score = 0; this.status = 'playing'; this.last = null; this.paused = false;
    }
    choose(index) {
      if (this.status !== 'playing' || this.paused || this.last) return null;
      const choice = this.rounds[this.round]?.choices[index]; if (!choice) return null;
      const correct = choice.correct === true;
      if (correct) this.score += 100; else this.health--;
      this.last = { correct, index, explanation: choice.explanation || (correct ? '判断正确，继续前进。' : '这个选择没有解决当前风险，再观察一次。') };
      if (this.health <= 0) this.status = 'failure';
      return copy(this.last);
    }
    advance() {
      if (this.status !== 'playing' || !this.last || this.paused) return false;
      if (this.last.correct) this.round++;
      this.last = null;
      if (this.round >= this.rounds.length) this.status = 'success';
      return true;
    }
    snapshot() { return { mode: 'decision', status: this.status, round: this.round, rounds: this.rounds.length, health: this.health, score: this.score, paused: this.paused }; }
  }

  class MemoryGame {
    constructor(config, options = {}) { this.art = config.art; this.random = options.random || Math.random; this.difficulty = options.difficulty || 2; this.stage = 1; this.score = 0; this.paused = false; this.status = 'playing'; this.setup(); }
    setup() {
      this.pairs = this.stage + 2; this.moves = this.pairs * (this.difficulty >= 3 ? 3 : 4); this.matched = [];
      this.open = []; this.last = null; const symbols = this.art.slice(0, this.pairs);
      this.deck = shuffle([...symbols, ...symbols], this.random);
    }
    flip(index) {
      if (this.status !== 'playing' || this.paused || this.last || !Number.isInteger(index) || index < 0 || index >= this.deck.length || this.open.includes(index) || this.matched.includes(index)) return null;
      this.open.push(index); if (this.open.length < 2) return { revealed: true };
      this.moves--; const correct = this.deck[this.open[0]] === this.deck[this.open[1]];
      if (correct) { this.matched.push(...this.open); this.score += 100; }
      this.last = { correct, indices: this.open.slice() };
      if (this.matched.length === this.deck.length) this.status = this.stage === 3 ? 'success' : 'stage-complete';
      else if (this.moves <= 0) this.status = 'failure';
      return copy(this.last);
    }
    advance() {
      if (this.paused || this.status === 'failure' || this.status === 'success') return false;
      if (this.status === 'stage-complete') { this.stage++; this.status = 'playing'; this.setup(); return true; }
      if (!this.last) return false; this.open = []; this.last = null; return true;
    }
    snapshot() { return { mode: 'memory', status: this.status, stage: this.stage, stages: 3, score: this.score, moves: this.moves, matched: this.matched.length / 2, pairs: this.pairs, paused: this.paused }; }
  }

  function mount(container, data, options = {}) {
    const document = container.ownerDocument; const game = copy(data.game); game.title = data.title;
    // Historical artifacts retain metadata; rendering uses the active original vector pack.
    if (game.background && game.background.startsWith('/assets/games/casual-v1/scenes/')) game.background = game.background.replace('/casual-v1/','/classic-v1/').replace(/\.webp$/,'.svg');
    container.dataset.gameKey = game.gameKey;
    const themedRuntime = game.runtime === 'deep-games-v2' ? root.AirvanaDeepGames : root.AirvanaCompleteGames;
    const theme = themedRuntime?.uiTheme?.(game.gameKey) || (game.gameKey === 'rune-circuit'
      ? {hud:'#467B78',rim:'#CAB58A',badge:'#B99349',paper:'#F2E8D3',frame:'#6F5941',field:'#ABA079'}
      : {hud:'#315D82',rim:'#93C8DD',badge:'#E9AE3F',paper:'#EAF2F5',frame:'#29465F',field:'#6D94AE'});
    if (container.style?.setProperty) Object.entries(theme).forEach(([name,value]) => container.style.setProperty('--game-'+name,value));
    if (options.variant?.field === 'hook' && data.payload.hook) game.instructions = data.payload.hook;
    if (options.variant?.field === 'interactionOrder' && game.mode === 'decision') {
      const value = String(options.variant.value || '');
      if (/^reverse$/i.test(value)) game.rounds.reverse();
      else { const indices = value.split(/[,，\s]+/).map(value => Number.parseInt(value, 10) - 1).filter(index => index >= 0 && index < game.rounds.length); if (indices.length) game.rounds = [...new Set(indices), ...game.rounds.map((_, index) => index).filter(index => !indices.includes(index))].map(index => game.rounds[index]); }
    }
    const assets = root.AirvanaPlayableAssetsV3;
    let model = null, engine = null, active = false, paused = false, busy = false, syncFailed = false, checkpoint = false, token = null, sequence = 1, runId = 0, eventChain = Promise.resolve();
    const element = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text != null) node.textContent = text; return node; };
    const sprite = (key, extra = '') => { const node = element('span', `sprite ${extra}`); node.setAttribute('aria-hidden', 'true'); if (assets?.css) Object.assign(node.style, assets.css(key)); return node; };
    const button = (text, className, handler) => { const node = element('button', className, text); node.type = 'button'; if (handler) node.addEventListener('click', handler); return node; };
    const bridge = (type, payload = {}) => { try { root.AirvanaBridge?.postMessage(JSON.stringify({ version: 1, type, payload })); } catch (_) {} };
    const api = async (path, body) => {
      const id = localStorage.airvana_device_id || (localStorage.airvana_device_id = crypto.randomUUID());
      const response = await fetch(path, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Airvana-Device': id }, body: JSON.stringify(body) });
      const json = await response.json();
      if (!response.ok) throw new Error(response.status === 401 ? '请先在应用中登录，再开始游戏。' : json.error?.message || `请求失败 (${response.status})`);
      return json;
    };
    const send = (eventType, payload = {}) => {
      const targetRun = runId; const targetToken = token;
      eventChain = eventChain.then(async () => {
        if (targetRun !== runId) throw new Error('本局已结束');
        const sentSequence = sequence;
        const result = await api('/api/runtime/events', { sessionToken: targetToken, sequence: sentSequence, eventType, payload });
        if (result.accepted !== true) throw new Error('服务器尚未接受本次游戏事件');
        bridge('runtime_event_accepted', { eventType, sequence: sentSequence, accepted: result.accepted === true, points: Number(result.points || 0), rewardStatus: result.rewardStatus || 'not_applicable' });
        if (targetRun === runId) sequence++; return result;
      });
      return eventChain;
    };
    const progress = payload => {
      if (checkpoint || syncFailed) return;
      checkpoint = true;
      send('step_complete', payload).catch(error => { syncFailed = true; errorBox.textContent = `进度尚未保存：${error.message}`; });
    };
    const background = element('img', 'game-scene'); background.src = game.background; background.alt = '';
    container.replaceChildren(background, element('div', 'scene-shade'));
    const toolbar = element('nav', 'toolbar'); toolbar.setAttribute('aria-label', '游戏控制');
    const pauseButton = button('暂停', '', () => togglePause()); pauseButton.disabled = true;
    const restartButton = button('重开', '', () => { if (!busy) resetIntro(); });
    toolbar.append(pauseButton, restartButton, element('span', 'game-title', game.title)); container.append(toolbar);
    const field = element('section', 'game-playfield'); container.append(field); field.hidden = true;
    const overlay = element('section', 'overlay'); overlay.setAttribute('aria-live', 'polite'); container.append(overlay);
    const errorBox = element('div', 'game-error'); errorBox.setAttribute('role', 'alert');

    function resetIntro() {
      runId++;
      engine?.destroy(); engine = null; model = null; active = false; paused = false; pauseButton.disabled = true; pauseButton.textContent = '暂停';
      field.hidden = true; field.replaceChildren(); overlay.hidden = false; errorBox.textContent = '';
      overlay.replaceChildren(sprite(game.art[0]), element('h1', '', game.title), element('p', '', game.instructions));
      const startButton = button('开始挑战', 'primary', () => start(startButton));
      overlay.append(startButton, errorBox);
    }
    async function start(startButton) {
      if (busy) return; busy = true; startButton.disabled = true; errorBox.textContent = '';
      try {
        if (!assets) throw new Error('游戏素材组件未能加载，请刷新页面。');
        await assets.load();
        if (!assets.ready() && assets.retry) await assets.retry();
        if (!assets.ready()) throw new Error('游戏素材未能完整加载，请重试。');
        const query = new URLSearchParams(location.search);
        const session = await api('/api/runtime/sessions', { contentId: data.contentId, campaignId: query.get('campaign'), ref: query.get('ref') });
        token = session.sessionToken; sequence = 1; checkpoint = false; syncFailed = false; eventChain = Promise.resolve();
        await send('playable_start', { artifactVersion: data.version, runtime: 'server-game-v3', mechanic: game.mode });
        overlay.hidden = true; field.hidden = false; pauseButton.disabled = false; active = true;
        if (game.mode === 'native') mountNative();
        else { model = game.mode === 'decision' ? new DecisionGame(game, options) : new MemoryGame(game, options); render(); }
      } catch (error) { active = false; pauseButton.disabled = true; overlay.hidden = false; field.hidden = true; errorBox.textContent = error.message; startButton.disabled = false; }
      finally { busy = false; }
    }
    function mountNative() {
      field.classList.add('native-field'); const canvas = element('canvas', 'native-canvas'); canvas.setAttribute('role', 'application'); canvas.setAttribute('aria-label', game.title); field.replaceChildren(canvas);
      const runtime = game.runtime === 'deep-games-v2' ? root.AirvanaDeepGames : root.AirvanaCompleteGames;
      if (!runtime?.has(game.gameKey)) throw new Error('此游戏引擎暂未加载完成，请重试。');
      engine = runtime.mount(canvas, game.gameKey, { muted: true, reducedMotion: root.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false,
        onEvent(name, props) { if (name === 'level_complete') progress({ gameKey: game.gameKey, ...props }); },
        onStatus(status) { paused = status.paused; pauseButton.textContent = paused ? '继续' : '暂停'; },
        onComplete(result) { finish(result.success, result.score, result.summary); },
      });
    }
    function render() {
      field.classList.remove('native-field'); field.replaceChildren();
      const state = model.snapshot();
      const hud = element('div', 'game-hud');
      if (game.mode === 'decision') hud.append(element('span', '', `护盾 ${state.health} / ${options.difficulty >= 3 ? 2 : 3}`), element('em', '', `${Math.min(state.round + 1, state.rounds)} / ${state.rounds}`));
      else hud.append(element('span', '', `收集 ${state.matched} / ${state.pairs} · 剩余 ${state.moves} 次`), element('em', '', `${state.stage} / 3`));
      field.append(hud);
      if (game.mode === 'decision') renderDecision(); else renderMemory();
      field.append(errorBox);
    }
    function renderDecision() {
      const round = model.rounds[model.round]; if (!round) return;
      const actors = element('div', `scene-actors${model.last ? ' feedback-actors' : ''}`); actors.append(sprite('guardian'), sprite(round.art, 'center'), sprite(model.last?.correct ? 'crystal' : 'raider')); field.append(actors);
      const dialogue = element('div', 'dialogue'); dialogue.append(element('h2', '', model.last ? model.last.correct ? '防御成功' : '护盾受损' : round.title), element('p', '', model.last ? model.last.explanation : round.body)); field.append(dialogue);
      const choices = element('div', 'game-choices');
      round.choices.forEach((choice, index) => {
        const node = button('', `choice${model.last?.index === index ? model.last.correct ? ' correct' : ' wrong' : ''}`, () => {
          const result = model.choose(index); if (!result) return;
          if (result.correct) progress({ round: model.round + 1, correct: true, score: model.score });
          render();
        });
        node.append(sprite(choice.art), element('span', '', choice.label)); node.disabled = !!model.last || paused; choices.append(node);
      }); field.append(choices);
      if (model.last) {
        field.append(button(model.status === 'failure' ? '查看结果' : model.last.correct ? '继续前进' : '重新判断', 'primary', () => {
          if (model.status === 'failure') { finish(false, model.score, '护盾耗尽。观察每项权限与来源，再挑战一次。'); return; }
          model.advance(); if (model.status === 'success') finish(true, model.score, `已完成 ${model.rounds.length} 轮安全判断。`); else render();
        }));
      }
    }
    function renderMemory() {
      const grid = element('div', 'memory-grid'); grid.setAttribute('aria-label', '物品配对棋盘');
      grid.style.gridTemplateRows = `repeat(${Math.ceil(model.deck.length / 4)}, minmax(0, 1fr))`;
      model.deck.forEach((key, index) => {
        const matched = model.matched.includes(index); const up = matched || model.open.includes(index);
        const node = button('', 'memory-card', () => {
          const result = model.flip(index); if (!result) return;
          if (result.correct) progress({ stage: model.stage, matched: model.matched.length / 2, score: model.score });
          render();
        });
        node.dataset.face = matched ? 'matched' : up ? 'up' : 'down'; node.setAttribute('aria-label', matched ? `第 ${index + 1} 张，已配对` : `翻开第 ${index + 1} 张`);
        node.append(sprite(up ? key : 'scroll')); node.disabled = matched || !!model.last || paused; grid.append(node);
      }); field.append(grid);
      const feedback = element('div', 'feedback', model.last ? model.last.correct ? '配对成功，物品已收集。' : '这两个物品不同，记住它们的位置。' : '翻开两张卡，找到相同的物品。');
      if (model.last) feedback.dataset.result = model.last.correct ? 'correct' : 'wrong'; field.append(feedback);
      if (model.last) field.append(button(model.status === 'success' || model.status === 'failure' ? '查看结果' : model.status === 'stage-complete' ? '进入下一关' : '继续翻牌', 'primary', () => {
        if (model.status === 'success' || model.status === 'failure') finish(model.status === 'success', model.score, model.status === 'success' ? '三关收集完成！' : '步数用尽，记住物品位置再来一次。');
        else { model.advance(); render(); }
      }));
    }
    function togglePause() {
      if (!active) return;
      if (engine) { paused = engine.togglePause(); pauseButton.textContent = paused ? '继续' : '暂停'; return; }
      paused = !paused; model.paused = paused; pauseButton.textContent = paused ? '继续' : '暂停';
      if (paused) { overlay.hidden = false; overlay.replaceChildren(sprite('shield'), element('h2', '', '已暂停'), button('继续游戏', 'primary', togglePause)); }
      else { overlay.hidden = true; render(); }
    }
    async function finish(success, score, summary) {
      if (!active) return; active = false; pauseButton.disabled = true; overlay.hidden = false;
      overlay.replaceChildren(sprite(success ? 'treasure' : 'shield'), element('h2', '', success ? '挑战完成' : '再试一次'), element('p', '', summary), element('p', '', `得分 ${Math.max(0, Math.round(score || 0))}`));
      const status = element('p', 'status', success ? '正在保存成绩…' : '本局未通关。'); overlay.append(status);
      const actions = element('div', 'overlay-actions');
      actions.append(button('重新体验', 'primary', resetIntro));
      const back = element('a', 'secondary', '返回内容广场'); back.href = '/'; back.target = '_top'; actions.append(back);
      actions.append(button('保存到本设备', 'secondary', () => { try { const stored = JSON.parse(localStorage.getItem('airvana_saved_contents') || '[]'); localStorage.setItem('airvana_saved_contents', JSON.stringify([...new Set([...stored, data.contentId])])); status.textContent = '已保存到本设备。'; } catch (_) { status.textContent = '保存失败，请检查浏览器存储设置。'; } }));
      actions.append(button('分享 / 复制链接', 'secondary', async () => { try { const url = `${location.origin}/content/${encodeURIComponent(data.contentId)}`; if (navigator.share) await navigator.share({ title: data.title, url }); else await navigator.clipboard.writeText(url); status.textContent = '分享链接已准备好。'; } catch (error) { if (error.name !== 'AbortError') status.textContent = '分享失败，请复制浏览器地址。'; } }));
      if (data.payload.ctaUrl) { try { const url = new URL(data.payload.ctaUrl, location.href); if (['http:', 'https:'].includes(url.protocol)) { const link = element('a', 'secondary', data.payload.ctaLabel || '继续了解'); link.href = url.href; link.target = '_blank'; link.rel = 'noopener'; actions.append(link); } } catch (_) {} }
      overlay.append(actions);
      if (!success) return;
      try {
        if (syncFailed) throw new Error('先前进度同步失败');
        if (!checkpoint) throw new Error('未取得有效游戏步骤');
        const accepted = await send('playable_complete', { completed: true, score: Math.round(score || 0), gameKey: game.gameKey, mechanic: game.mode });
        status.textContent = accepted.accepted === true ? Number(accepted.points || 0) > 0 ? `成绩已保存 · +${Number(accepted.points)} AIP` : '成绩已保存。' : '已在本机通关，服务器尚未确认成绩。';
      } catch (error) { status.textContent = `已在本机通关，成绩尚未保存：${error.message}`; }
    }
    const visibility = () => { if (document.hidden && active && !paused) togglePause(); };
    document.addEventListener('visibilitychange', visibility);
    resetIntro(); assets?.load()?.then(() => { if (!active && !busy) resetIntro(); }).catch(() => { errorBox.textContent = '部分素材未加载，开始游戏时会重新尝试。'; });
    bridge('runtime_ready', { contentId: data.contentId, version: data.version });
    return { inspect: () => ({ active, paused, checkpoint, sequence, syncFailed, ...(model?.snapshot() || engine?.inspect() || {}) }), destroy() { engine?.destroy(); document.removeEventListener('visibilitychange', visibility); container.replaceChildren(); } };
  }
  root.AirvanaServerGameV3 = Object.freeze({ version: '3.0.0', DecisionGame, MemoryGame, mount });
})(typeof globalThis !== 'undefined' ? globalThis : window);
