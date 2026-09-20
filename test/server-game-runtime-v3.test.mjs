import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { resolveGameConfig } from '../src/game-artifact-v3.mjs';
import { buildArtifact } from '../src/artifact.mjs';
import { openDatabase } from '../src/db.mjs';
import { planRegeneration, applyRegeneration } from '../scripts/regenerate-game-artifacts-v3.mjs';

const script = fs.readFileSync(new URL('../public/server-game-runtime-v3.js', import.meta.url), 'utf8');
const sandbox = { Math, console }; vm.runInNewContext(script, sandbox);
const { DecisionGame, MemoryGame } = sandbox.AirvanaServerGameV3;
const content = { id: 'wallet-game', title: '钱包安全守卫', content_type: 'game' };
const config = resolveGameConfig(content, {});

test('wallet decisions consume shields for mistakes, reject repeated answers, and can fail without progress', () => {
  const model = new DecisionGame(config, { random: () => .99 });
  for (let attempt = 0; attempt < 3; attempt++) {
    const wrong = model.rounds[model.round].choices.findIndex(choice => !choice.correct);
    assert.equal(model.choose(wrong).correct, false);
    assert.equal(model.choose(wrong), null, 'double clicking must not consume extra health');
    if (attempt < 2) assert.equal(model.advance(), true);
  }
  assert.equal(model.status, 'failure'); assert.equal(model.round, 0); assert.equal(model.score, 0);
  assert.equal(model.advance(), false);
});

test('all six correct decisions are needed to complete and pause blocks input', () => {
  const model = new DecisionGame(config, { random: () => .99 });
  model.paused = true; assert.equal(model.choose(0), null); model.paused = false;
  for (let round = 0; round < 6; round++) {
    assert.equal(model.status, 'playing');
    assert.equal(model.choose(model.rounds[round].choices.findIndex(choice => choice.correct)).correct, true);
    model.advance();
  }
  assert.equal(model.status, 'success'); assert.equal(model.score, 600); assert.equal(model.choose(0), null);
});

test('authored choices and their correct answer are retained instead of replaced by a generic checklist', () => {
  const custom = resolveGameConfig({ id: 'custom', title: '铜门谜题' }, { rounds: [{ title: '开启铜门', question: '哪一把钥匙匹配铜锁？', choices: [{ id: 'bronze', label: '铜钥匙', feedback: '材质匹配' }, { id: 'ice', label: '冰钥匙' }], correctChoiceId: 'bronze' }] });
  assert.equal(custom.mode, 'decision'); assert.equal(custom.authoredChoices, true);
  assert.equal(custom.rounds[0].body, '哪一把钥匙匹配铜锁？');
  assert.equal(custom.rounds[0].choices[0].correct, true); assert.equal(custom.rounds[0].choices[1].correct, false);
});

test('native registrations retain their actual mechanics, including hashed IDs resolved through titles', () => {
  assert.equal(resolveGameConfig({ id: 'content_mobilearcade_plb_star_deck', title: '星轨牌阵' }).gameKey, 'star-deck');
  assert.equal(resolveGameConfig({ id: 'content_mobilearcade_plb_12tt5tu', title: '果园合合塔 Orchard Merge' }).gameKey, 'orchard-merge');
  assert.equal(resolveGameConfig({ id: 'space-farm', title: '太空站种菜互动挑战' }).mode, 'native');
});

test('game intros select theme-specific objects instead of one shared knight', () => {
  assert.equal(resolveGameConfig({id:'orchard',title:'果园合合塔'}, {gameKey:'orchard-merge'}).art[0], 'green_apple');
  assert.equal(resolveGameConfig({id:'race',title:'城市极速'}, {gameKey:'city-rush'}).art[0], 'car');
  assert.equal(resolveGameConfig({id:'ocean',title:'深海寻光'}, {gameKey:'deep-catch'}).art[0], 'fish');
  assert.equal(resolveGameConfig({id:'space',title:'裂隙突击'}, {gameKey:'rift-strike'}).art[0], 'spacecraft');
  assert.equal(resolveGameConfig({id:'fashion',title:'今日造型师'}, {gameKey:'studio-wardrobe'}).art[0], 'model');
});

test('memory gameplay requires distinct matching cards, spends moves, and completes all three boards', () => {
  const game = new MemoryGame({ art: ['emerald', 'ruby', 'sapphire', 'amethyst', 'key', 'star'] }, { random: () => .99 });
  assert.ok(game.flip(0)); assert.equal(game.flip(0), null); game.flip(1); assert.equal(game.last.correct, false); assert.equal(game.moves, 11); game.advance();
  for (let stage = 1; stage <= 3; stage++) {
    const symbols = [...new Set(game.deck)];
    for (const symbol of symbols) { const indices = game.deck.flatMap((item, i) => item === symbol ? [i] : []); game.flip(indices[0]); game.flip(indices[1]); if (game.status === 'playing') game.advance(); }
    assert.equal(game.status, stage === 3 ? 'success' : 'stage-complete');
    if (stage < 3) game.advance();
  }
  assert.equal(game.score, 1200); assert.equal(game.flip(0), null);
});

test('unmatched pairs eventually exhaust a memory board and cannot complete', () => {
  const game = new MemoryGame({ art: ['emerald', 'ruby', 'sapphire', 'amethyst', 'key', 'star'] }, { random: () => .99 });
  while (game.status === 'playing') { game.flip(0); game.flip(1); game.advance(); }
  assert.equal(game.status, 'failure'); assert.equal(game.moves, 0); assert.equal(game.score, 0);
});

class FakeNode {
  constructor(tag, ownerDocument) { this.tagName = tag; this.ownerDocument = ownerDocument; this.children = []; this.style = {}; this.dataset = {}; this.className = ''; this.textContent = ''; this.listeners = {}; this.hidden = false; this.classList = { add: value => { this.className += ` ${value}`; }, remove: value => { this.className = this.className.replace(value, ''); } }; }
  append(...nodes) { for (const node of nodes) { node.remove(); node.parentNode = this; this.children.push(node); } }
  replaceChildren(...nodes) { for (const child of this.children) child.parentNode = null; this.children = []; this.append(...nodes); }
  remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(node => node !== this); this.parentNode = null; }
  setAttribute(name, value) { this[name] = value; }
  addEventListener(name, callback) { this.listeners[name] = callback; }
  removeEventListener(name) { delete this.listeners[name]; }
  getBoundingClientRect() { return { left: 0, top: 0, width: 360, height: 560 }; }
  getContext() { return new Proxy({}, { get(target, key) { if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => ({ addColorStop() {} }); if (key === 'measureText') return value => ({ width: String(value).length * 7 }); return target[key] || (() => {}); }, set(target, key, value) { target[key] = value; return true; } }); }
  setPointerCapture() {}
  releasePointerCapture() {}
  focus() {}
  async click() { if (!this.disabled) return this.listeners.click?.(); }
  find(predicate) { if (predicate(this)) return this; for (const child of this.children) { const found = child.find(predicate); if (found) return found; } return null; }
  findAll(predicate, { visibleOnly = false } = {}) { if (visibleOnly && this.hidden) return []; return [...(predicate(this) ? [this] : []), ...this.children.flatMap(child => child.findAll(predicate, { visibleOnly }))]; }
}

const CASUAL_BASE = '/assets/games/server-casual-v4/';
const CASUAL_ATLAS = `url("${CASUAL_BASE}atlas.png")`;
const CASUAL_KEYS = new Set(['guardian', 'raider', 'shield', 'key', 'scroll', 'treasure', 'emerald', 'ruby', 'sapphire', 'amethyst', 'crystal', 'potion', 'boots', 'tent', 'energy', 'sword', 'hero', 'sentinel', 'star', 'parcel', 'fire', 'frost']);
function artStub({ load = async () => true, retry = async () => true, ready = () => true } = {}) {
  const calls = { load: 0, retry: 0, css: [] };
  return { calls, ready, load: () => { calls.load++; return load(); }, retry: () => { calls.retry++; return retry(); }, css: key => { calls.css.push(key); return CASUAL_KEYS.has(key) ? { backgroundImage: CASUAL_ATLAS, backgroundRepeat: 'no-repeat' } : null; } };
}
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }

function adapter({ rejectComplete = false, nativeConfig = null, data = null, casualArt = artStub(), manualTimers = false, sessionGate = null, startEventGate = null, stepEventGate = null } = {}) {
  const requests = [];
  const document = { createElement: tag => new FakeNode(tag, document), listeners: {}, addEventListener(name, callback) { this.listeners[name] = callback; }, removeEventListener(name) { delete this.listeners[name]; } };
  document.head = new FakeNode('head', document);
  const container = new FakeNode('main', document);
  const localStorage = { getItem() { return null; }, setItem() {} };
  const legacyArtCalls = [], bridgeMessages = [], timers = new Map(); let timerId = 0;
  const context = { console, Math, URL, URLSearchParams, localStorage, crypto: { randomUUID: () => 'device-id' }, location: { search: '?embed=1', origin: 'http://localhost', href: 'http://localhost/content/wallet-game' }, navigator: {},
    AirvanaBridge: { postMessage: message => bridgeMessages.push(JSON.parse(message)) },
    AirvanaPlayableAssetsV3: { load: async () => true, ready: () => true, draw: () => true, css: key => { legacyArtCalls.push(key); return { backgroundImage: 'url(/assets/games/classic-v1/sprites.svg)' }; } },
    requestAnimationFrame: () => 1, cancelAnimationFrame() {}, addEventListener() {}, removeEventListener() {}, devicePixelRatio: 1,
    setTimeout: manualTimers ? (callback, ms) => { timers.set(++timerId, { callback, ms }); return timerId; } : setTimeout,
    clearTimeout: manualTimers ? id => timers.delete(id) : clearTimeout,
    fetch: async (url, options) => { const body = JSON.parse(options.body); requests.push({ url, body }); if (url.endsWith('/sessions') && sessionGate) await sessionGate; if (body.eventType === 'playable_start' && startEventGate) await startEventGate; if (body.eventType === 'step_complete' && stepEventGate) await stepEventGate; const error = rejectComplete && body.eventType === 'playable_complete'; return { ok: !error, status: error ? 503 : 200, json: async () => error ? { error: { message: '成绩服务暂时不可用' } } : url.endsWith('/sessions') ? { sessionToken: 'session' } : { accepted: true, points: 0 } }; },
  };
  if (casualArt) context.AirvanaServerCasualArtV4 = casualArt;
  context.window = context;
  if (nativeConfig) for (const file of ['sensor-interactions-v1.js', 'complete-games-v3.js', 'deep-games-v2.js']) vm.runInNewContext(fs.readFileSync(new URL(`../public/${file}`, import.meta.url), 'utf8'), context);
  vm.runInNewContext(script, context);
  data ||= { contentId: content.id, title: content.title, payload: {}, version: 2, game: nativeConfig || config };
  const mount = target => context.AirvanaServerGameV3.mount(target, data, { random: () => .99, difficulty: 2 });
  const instance = mount(container);
  return { container, requests, instance, data, document, context, casualArt, legacyArtCalls, bridgeMessages, timers, mount,
    button: text => container.find(node => node.tagName === 'button' && node.textContent === text),
    choice: label => container.find(node => node.tagName === 'button' && node.children.some(child => child.textContent === label)),
    settle: () => new Promise(resolve => setImmediate(resolve)) };
}

function assertCasualPresentation(runtime, state, mode = 'decision') {
  assert.equal(runtime.container.dataset.gameState, state);
  assert.equal(runtime.container.dataset.presentation, 'server-casual-v4');
  assert.equal(runtime.container.find(node => node.className === 'game-scene').src, `${CASUAL_BASE}${mode === 'decision' ? 'security-world' : 'memory-world'}.png`);
  const sprites = runtime.container.findAll(node => node.className.split(/\s+/).includes('sprite'), { visibleOnly: true });
  assert.ok(sprites.length, `${mode}/${state} must render actual sprite objects`);
  for (const node of sprites) assert.equal(node.style.backgroundImage, CASUAL_ATLAS, `${mode}/${state}/${node.dataset.sprite} must use the local PNG atlas`);
  for (const node of runtime.container.findAll(() => true)) assert.doesNotMatch(`${node.src || ''} ${node.style.backgroundImage || ''}`, /classic-v1|casual-v1|\.svg/);
  assert.deepEqual(runtime.legacyArtCalls, [], `${mode}/${state} must never call the legacy sprite API`);
}

test('all 38 native artifact adapters mount actual exported engines and every script reference exists', async () => {
  const catalog = JSON.parse(fs.readFileSync(new URL('../public/assets/games/classic-v1/manifest.json', import.meta.url), 'utf8')).assets;
  for (const item of catalog) {
    const native = resolveGameConfig({ id: `content_mobilearcade_plb_${item.game_key.replaceAll('-', '_')}`, title: item.title });
    const runtime = adapter({ nativeConfig: native }); await runtime.button('开始挑战').click();
    assert.equal(runtime.instance.inspect().active, true, `${item.game_key} must start in the artifact adapter`);
    assert.equal(runtime.instance.inspect().gameKey, item.game_key, `${item.game_key} must use the actual engine`);
    await runtime.button('暂停').click(); assert.equal(runtime.instance.inspect().paused, true);
    runtime.instance.destroy();
    const html = buildArtifact({ content: { id: item.game_key, title: item.title, content_type: 'game' }, payload: { gameKey: item.game_key }, version: 2 }).html;
    for (const match of html.matchAll(/<script src="([^"?]+)(?:\?[^"]*)?"/g)) assert.ok(fs.existsSync(new URL(`../public${match[1]}`, import.meta.url)), match[1]);
  }
});

async function winAdapter(runtime) {
  await runtime.button('开始挑战').click();
  for (const round of config.rounds) {
    const choice = round.choices.find(choice => choice.correct);
    const node = runtime.container.find(node => node.tagName === 'button' && node.children.some(child => child.textContent === choice.label));
    await node.click(); await runtime.button('继续前进').click();
  }
  await runtime.settle();
}

test('DOM gameplay reports start, one real checkpoint, then success only after six valid decisions', async () => {
  const runtime = adapter(); await winAdapter(runtime);
  const events = runtime.requests.filter(request => request.url.endsWith('/events')).map(request => request.body);
  assert.deepEqual(events.map(event => event.eventType), ['playable_start', 'step_complete', 'playable_complete']);
  assert.deepEqual(events.map(event => event.sequence), [1, 2, 3]);
  assert.equal(events[2].payload.score, 600);
  assert.ok(runtime.container.find(node => node.textContent === '成绩已保存。'));
});

test('DOM gameplay failure never submits completion and a failed API cannot claim a saved score', async () => {
  const failed = adapter(); await failed.button('开始挑战').click();
  const wrongLabel = config.rounds[0].choices.find(choice => !choice.correct).label;
  for (let i = 0; i < 3; i++) { await failed.container.find(node => node.tagName === 'button' && node.children.some(child => child.textContent === wrongLabel)).click(); await failed.button(i === 2 ? '查看结果' : '重新判断').click(); }
  await failed.settle(); assert.deepEqual(failed.requests.filter(request => request.url.endsWith('/events')).map(request => request.body.eventType), ['playable_start']);
  const unavailable = adapter({ rejectComplete: true }); await winAdapter(unavailable);
  assert.ok(unavailable.container.find(node => node.textContent.includes('成绩尚未保存：成绩服务暂时不可用')));
  assert.equal(unavailable.container.find(node => node.textContent === '成绩已保存。'), null);
});

test('decision intro, play, feedback, pause and success use only the new PNG world and sprites', async () => {
  const runtime = adapter(); await runtime.settle();
  assertCasualPresentation(runtime, 'intro');
  assert.equal(runtime.requests.length, 0, 'a rendered introduction is not a started session');
  assert.equal(runtime.casualArt.calls.load, 1);
  await runtime.button('开始挑战').click(); assertCasualPresentation(runtime, 'playing');
  assert.equal(runtime.casualArt.calls.retry, 1);
  for (const [index, round] of config.rounds.entries()) {
    await runtime.choice(round.choices.find(choice => choice.correct).label).click(); assertCasualPresentation(runtime, 'feedback');
    if (index === 0) {
      await runtime.button('暂停').click(); assertCasualPresentation(runtime, 'paused');
      const before = JSON.stringify(runtime.instance.inspect());
      await runtime.choice(round.choices.find(choice => !choice.correct).label).click();
      assert.equal(JSON.stringify(runtime.instance.inspect()), before, 'pause blocks hidden gameplay controls');
      await runtime.button('继续游戏').click(); assertCasualPresentation(runtime, 'feedback');
    }
    await runtime.button('继续前进').click(); assertCasualPresentation(runtime, index === config.rounds.length - 1 ? 'success' : 'playing');
  }
  await runtime.settle(); assert.equal(runtime.instance.inspect().score, 600);
  await runtime.button('重新体验').click(); assertCasualPresentation(runtime, 'intro');
  assert.equal(runtime.requests.filter(request => request.url.endsWith('/sessions')).length, 1, 'replay introduction must not silently create a session');
  runtime.instance.destroy();
});

test('decision wrong-answer feedback and failure keep the new art and never report completion', async () => {
  const runtime = adapter(); await runtime.button('开始挑战').click();
  const wrong = config.rounds[0].choices.find(choice => !choice.correct).label;
  for (let attempt = 0; attempt < 3; attempt++) {
    await runtime.choice(wrong).click(); assertCasualPresentation(runtime, 'feedback');
    await runtime.button(attempt === 2 ? '查看结果' : '重新判断').click();
    assertCasualPresentation(runtime, attempt === 2 ? 'failure' : 'playing');
  }
  await runtime.settle();
  assert.deepEqual(runtime.requests.filter(request => request.url.endsWith('/events')).map(request => request.body.eventType), ['playable_start']);
  assert.equal(runtime.instance.inspect().score, 0); runtime.instance.destroy();
});

const historicalMemory = () => ({ contentId: 'old-memory', title: '宝石记忆收集', version: 2, payload: {}, game: {
  mode: 'memory', gameKey: 'rune-circuit', background: '/assets/games/casual-v1/scenes/rune-circuit.webp',
  art: ['emerald', 'ruby', 'sapphire', 'amethyst', 'key', 'star'], instructions: '翻开卡片，完成三关配对。',
} });
const memoryCard = (runtime, index) => runtime.container.find(node => node.className === 'memory-card' && node['aria-label'] === `翻开第 ${index + 1} 张`);

test('memory cover, distinct card faces, all three boards, pause and success use the memory PNG world', async () => {
  const runtime = adapter({ data: historicalMemory() }); await runtime.settle(); assertCasualPresentation(runtime, 'intro', 'memory');
  await runtime.button('开始挑战').click(); assertCasualPresentation(runtime, 'playing', 'memory');
  for (let stage = 1; stage <= 3; stage++) {
    const pairs = stage + 2;
    assert.equal(runtime.container.findAll(node => node.className === 'memory-card').length, pairs * 2);
    for (let index = 0; index < pairs; index++) {
      await memoryCard(runtime, index).click(); assertCasualPresentation(runtime, 'playing', 'memory');
      const open = memoryCard(runtime, index);
      assert.equal(open.dataset.face, 'up'); assert.equal(open.children[0].dataset.sprite, runtime.data.game.art[index]);
      if (stage === 1 && index === 0) {
        await runtime.button('暂停').click(); assertCasualPresentation(runtime, 'paused', 'memory');
        const before = JSON.stringify(runtime.instance.inspect()); await memoryCard(runtime, pairs).click();
        assert.equal(JSON.stringify(runtime.instance.inspect()), before);
        await runtime.button('继续游戏').click(); assertCasualPresentation(runtime, 'playing', 'memory');
      }
      await memoryCard(runtime, index + pairs).click(); assertCasualPresentation(runtime, 'feedback', 'memory');
      assert.equal(runtime.container.findAll(node => node.dataset.face === 'matched').length, (index + 1) * 2);
      await runtime.button(index === pairs - 1 ? stage === 3 ? '查看结果' : '进入下一关' : '继续翻牌').click();
    }
    assertCasualPresentation(runtime, stage === 3 ? 'success' : 'playing', 'memory');
  }
  await runtime.settle(); assert.equal(runtime.instance.inspect().score, 1200);
  assert.deepEqual(runtime.requests.filter(request => request.url.endsWith('/events')).map(request => request.body.eventType), ['playable_start', 'step_complete', 'playable_complete']);
  runtime.instance.destroy();
});

test('memory exhausted moves show failure without falling back to legacy art or awarding completion', async () => {
  const runtime = adapter({ data: historicalMemory() }); await runtime.button('开始挑战').click();
  for (let move = 0; move < 12; move++) {
    await memoryCard(runtime, 0).click(); await memoryCard(runtime, 1).click(); assertCasualPresentation(runtime, 'feedback', 'memory');
    await runtime.button(move === 11 ? '查看结果' : '继续翻牌').click();
  }
  assertCasualPresentation(runtime, 'failure', 'memory'); await runtime.settle();
  assert.equal(runtime.instance.inspect().moves, 0);
  assert.deepEqual(runtime.requests.filter(request => request.url.endsWith('/events')).map(request => request.body.eventType), ['playable_start']);
  runtime.instance.destroy();
});

test('historical DATA backgrounds are overridden in presentation only and original authored content stays unchanged', async () => {
  for (const data of [
    { contentId: content.id, title: content.title, version: 4, payload: { hook: '原有文案', ctaUrl: 'https://example.test/approved' }, game: { ...JSON.parse(JSON.stringify(config)), background: '/assets/games/casual-v1/scenes/safety-workshop.webp' } },
    historicalMemory(),
  ]) {
    const original = JSON.stringify(data);
    const freeze = object => { if (object && typeof object === 'object') { Object.values(object).forEach(freeze); Object.freeze(object); } };
    freeze(data);
    const runtime = adapter({ data }); await runtime.settle(); assertCasualPresentation(runtime, 'intro', data.game.mode);
    await runtime.button('开始挑战').click(); assertCasualPresentation(runtime, 'playing', data.game.mode);
    if (data.game.mode === 'decision') await runtime.choice(data.game.rounds[0].choices.find(choice => choice.correct).label).click();
    else await memoryCard(runtime, 0).click();
    assert.equal(JSON.stringify(data), original, 'presentation migration must not change DATA, approved CTA, answers or stored backgrounds');
    runtime.instance.destroy();
  }
});

test('failed casual atlas loading creates no session or events and an explicit retry can recover', async () => {
  let ready = false;
  const casualArt = artStub({ ready: () => ready, load: async () => ready, retry: async () => ready });
  const runtime = adapter({ casualArt }); await runtime.settle();
  assertCasualPresentation(runtime, 'intro');
  assert.ok(runtime.container.find(node => node.className === 'game-error').textContent.includes('角色素材未能完整加载'));
  await runtime.button('开始挑战').click();
  assert.equal(runtime.requests.length, 0); assert.equal(runtime.instance.inspect().active, false);
  assert.equal(runtime.button('开始挑战').disabled, false); assert.equal(casualArt.calls.retry, 1);
  ready = true; await runtime.button('开始挑战').click(); assertCasualPresentation(runtime, 'playing');
  assert.equal(casualArt.calls.retry, 2);
  assert.deepEqual(runtime.requests.map(request => request.url), ['/api/runtime/sessions', '/api/runtime/events']);
  assert.equal(runtime.requests[1].body.eventType, 'playable_start'); runtime.instance.destroy();
});

test('missing casual script is loaded once across mounts and late completion never rebuilds a destroyed intro', async () => {
  const runtime = adapter({ casualArt: null, manualTimers: true });
  const other = new FakeNode('main', runtime.document), second = runtime.mount(other);
  assert.equal(runtime.document.head.children.length, 1);
  const loader = runtime.document.head.children[0]; assert.equal(loader.src, '/server-casual-art-v4.js?v=4.0.0');
  assert.equal(loader.async, true); assert.equal(runtime.timers.size, 1);
  assert.equal([...runtime.timers.values()][0].ms, 12000);
  runtime.instance.destroy();
  runtime.context.AirvanaServerCasualArtV4 = artStub(); loader.onload(); await runtime.settle();
  assert.equal(runtime.container.children.length, 0); assert.equal(runtime.requests.length, 0);
  assert.equal(runtime.instance.inspect().active, false); assert.equal(other.dataset.gameState, 'intro');
  assert.equal(other.find(node => node.dataset.sprite === 'guardian').style.backgroundImage, CASUAL_ATLAS);
  assert.equal(runtime.timers.size, 0); assert.deepEqual(runtime.legacyArtCalls, []); second.destroy();
});

test('dynamic script network failure or timeout stays on intro and explicit start retries without stale API calls', async () => {
  for (const failure of ['error', 'timeout', 'missing-export']) {
    const runtime = adapter({ casualArt: null, manualTimers: true });
    const first = runtime.document.head.children[0];
    if (failure === 'error') first.onerror();
    else if (failure === 'timeout') [...runtime.timers.values()][0].callback();
    else first.onload();
    await runtime.settle();
    assert.equal(runtime.document.head.children.length, 0); assert.equal(runtime.timers.size, 0);
    assert.equal(runtime.requests.length, 0); assert.equal(runtime.container.dataset.gameState, 'intro');
    assert.ok(runtime.container.find(node => node.className === 'game-error').textContent.includes('场景组件暂未加载'));
    const starting = runtime.button('开始挑战').click();
    assert.equal(runtime.document.head.children.length, 1);
    const replacement = runtime.document.head.children[0]; assert.notEqual(replacement, first);
    assert.equal(runtime.requests.length, 0, 'session must wait for the replacement loader');
    runtime.context.AirvanaServerCasualArtV4 = artStub(); replacement.onload(); await starting; await runtime.settle();
    assertCasualPresentation(runtime, 'playing');
    assert.equal(runtime.requests.filter(request => request.url.endsWith('/sessions')).length, 1);
    assert.equal(runtime.timers.size, 0); runtime.instance.destroy();
  }
});

test('destroy during an explicit start awaiting the casual atlas cannot create a late session or restart gameplay', async () => {
  const gate = deferred(), casualArt = artStub({ retry: () => gate.promise });
  const runtime = adapter({ casualArt }); await runtime.settle();
  const starting = runtime.button('开始挑战').click(); await runtime.settle();
  assert.equal(casualArt.calls.retry, 1); assert.equal(runtime.requests.length, 0);
  runtime.instance.destroy(); gate.resolve(true); await starting; await runtime.settle();
  assert.equal(runtime.requests.length, 0, 'destroyed artifacts must not create runtime sessions or events');
  assert.equal(runtime.instance.inspect().active, false); assert.equal(runtime.container.children.length, 0);
  assert.equal(runtime.document.listeners.visibilitychange, undefined);
});

test('destroy while session creation is pending prevents a late playable_start or active game', async () => {
  const gate = deferred(), runtime = adapter({ sessionGate: gate.promise }); await runtime.settle();
  const starting = runtime.button('开始挑战').click(); await runtime.settle();
  assert.deepEqual(runtime.requests.map(request => request.url), ['/api/runtime/sessions']);
  runtime.instance.destroy(); gate.resolve(); await starting; await runtime.settle();
  assert.deepEqual(runtime.requests.map(request => request.url), ['/api/runtime/sessions'], 'a late session response must not emit playable_start');
  assert.equal(runtime.instance.inspect().active, false); assert.equal(runtime.container.children.length, 0);
});

test('destroy while playable_start acknowledgement is pending cannot activate or notify the retired host', async () => {
  const gate = deferred(), runtime = adapter({ startEventGate: gate.promise }); await runtime.settle();
  const starting = runtime.button('开始挑战').click(); await runtime.settle();
  assert.deepEqual(runtime.requests.map(request => request.url), ['/api/runtime/sessions', '/api/runtime/events']);
  assert.equal(runtime.requests[1].body.eventType, 'playable_start');
  const messagesBeforeDestroy = JSON.stringify(runtime.bridgeMessages);
  runtime.instance.destroy(); gate.resolve(); await starting; await runtime.settle();
  assert.equal(runtime.instance.inspect().active, false); assert.equal(runtime.container.children.length, 0);
  assert.equal(runtime.requests.length, 2, 'already issued requests cannot be unsent, but no new requests may be emitted');
  assert.equal(JSON.stringify(runtime.bridgeMessages), messagesBeforeDestroy, 'late acknowledgements from a destroyed artifact must not notify its retired host');
});

test('an old checkpoint acknowledgement after restart cannot notify or contaminate the fresh run', async () => {
  const gate = deferred(), runtime = adapter({ stepEventGate: gate.promise }); await runtime.settle();
  await runtime.button('开始挑战').click();
  await runtime.choice(config.rounds[0].choices.find(choice => choice.correct).label).click(); await runtime.settle();
  assert.ok(runtime.requests.some(request => request.body.eventType === 'step_complete'));
  await runtime.button('重开').click(); await runtime.button('开始挑战').click();
  const currentState = JSON.stringify(runtime.instance.inspect()), currentMessages = JSON.stringify(runtime.bridgeMessages);
  gate.resolve(); await runtime.settle();
  assert.equal(JSON.stringify(runtime.instance.inspect()), currentState, 'old checkpoint errors must not set syncFailed or progress in the fresh run');
  assert.equal(runtime.container.find(node => node.className === 'game-error').textContent, '');
  assert.equal(JSON.stringify(runtime.bridgeMessages), currentMessages, 'the old checkpoint must not be attributed to the new host run');
  assertCasualPresentation(runtime, 'playing'); runtime.instance.destroy();
});

test('regeneration is versioned and rejects stale plans without mutating existing content', () => {
  const db = openDatabase(':memory:');
  try {
    const now = '2026-09-05T00:00:00Z';
    db.prepare("INSERT INTO users(id,role,display_name,created_at,updated_at) VALUES('owner','creator','Owner',?,?)").run(now, now);
    const payload = JSON.stringify({ title: '钱包安全', summary: '安全识别', sections: [{ heading: '域名', body: '检查域名' }, { heading: '权限', body: '核对授权' }], interactions: [{ trigger: '判断', result: '反馈' }], assets: ['sprite'], safetyNotes: ['never request secrets'] });
    db.prepare("INSERT INTO contents(id,owner_user_id,title,content_type,status,payload_json,current_version,created_at,updated_at) VALUES('local-game','owner','钱包安全','game','draft',?,1,?,?)").run(payload, now, now);
    db.prepare("INSERT INTO content_versions(id,content_id,version,title,payload_json,created_by,created_at) VALUES('v1','local-game',1,'钱包安全',?,'owner',?)").run(payload, now);
    db.prepare("INSERT INTO content_artifacts(id,content_id,version,artifact_type,status,html_text,manifest_json,validation_json,checksum,created_at) VALUES('a1','local-game',1,'game','ready','historical-html','{}','{}','old-checksum',?)").run(now);
    const plan = planRegeneration(db); assert.equal(plan[0].toVersion, 2); assert.equal(db.prepare('SELECT COUNT(*) n FROM content_artifacts').get().n, 1);
    const applied = applyRegeneration(db, plan); assert.equal(applied.length, 1);
    assert.equal(db.prepare('SELECT html_text FROM content_artifacts WHERE version=1').get().html_text, 'historical-html');
    const updated = db.prepare('SELECT * FROM contents').get(); assert.equal(updated.current_version, 2); assert.equal(updated.status, 'draft'); assert.equal(updated.payload_json, payload);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM content_versions').get().n, 2);
    assert.throws(() => applyRegeneration(db, plan), /changed since plan/);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM content_artifacts').get().n, 2);
  } finally { db.close(); }
});
