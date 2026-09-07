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
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
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
}

function adapter({ rejectComplete = false, nativeConfig = null } = {}) {
  const requests = [];
  const document = { createElement: tag => new FakeNode(tag, document), addEventListener() {}, removeEventListener() {} };
  const container = new FakeNode('main', document);
  const localStorage = { getItem() { return null; }, setItem() {} };
  const context = { console, Math, URL, URLSearchParams, localStorage, crypto: { randomUUID: () => 'device-id' }, location: { search: '?embed=1', origin: 'http://localhost', href: 'http://localhost/content/wallet-game' }, navigator: {},
    AirvanaPlayableAssetsV3: { load: async () => true, ready: () => true, draw: () => true, css: () => ({ backgroundImage: 'url(/sprite.png)' }) },
    requestAnimationFrame: () => 1, cancelAnimationFrame() {}, addEventListener() {}, removeEventListener() {}, devicePixelRatio: 1, setTimeout, clearTimeout,
    fetch: async (url, options) => { const body = JSON.parse(options.body); requests.push({ url, body }); const error = rejectComplete && body.eventType === 'playable_complete'; return { ok: !error, status: error ? 503 : 200, json: async () => error ? { error: { message: '成绩服务暂时不可用' } } : url.endsWith('/sessions') ? { sessionToken: 'session' } : { accepted: true, points: 0 } }; },
  };
  context.window = context;
  if (nativeConfig) for (const file of ['sensor-interactions-v1.js', 'complete-games-v3.js', 'deep-games-v2.js']) vm.runInNewContext(fs.readFileSync(new URL(`../public/${file}`, import.meta.url), 'utf8'), context);
  vm.runInNewContext(script, context);
  const instance = context.AirvanaServerGameV3.mount(container, { contentId: content.id, title: content.title, payload: {}, version: 2, game: nativeConfig || config }, { random: () => .99, difficulty: 2 });
  return { container, requests, instance, button: text => container.find(node => node.tagName === 'button' && node.textContent === text), settle: () => new Promise(resolve => setImmediate(resolve)) };
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
