import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const script = fs.readFileSync(new URL('../public/playable-frame-v1.js', import.meta.url), 'utf8');
const context = { URL, AbortController, setTimeout, clearTimeout };
vm.runInNewContext(script, context, { filename: 'playable-frame-v1.js' });
const { createController, resolveSource, failureCopy } = context.AirvanaPlayableFrame;
const baseURL = 'http://127.0.0.1:8082/';

function deferred() {
  let resolve, reject;
  const promise = new Promise((accept, fail) => { resolve = accept; reject = fail; });
  return { promise, resolve, reject };
}

function response(status = 200, type = 'text/html; charset=utf-8') {
  return { ok: status >= 200 && status < 300, status, headers: { get: name => name.toLowerCase() === 'content-type' ? type : null } };
}

function fixture(fetchImpl = async () => response(), timeoutMs) {
  const states = [], requests = [], navigations = [], timers = new Map(), removals = [];
  let sequence = 0, frame = null;
  const controller = createController({
    baseURL,
    timeoutMs,
    fetch: (url, options) => { requests.push({ url, options }); return fetchImpl(url, options); },
    setTimeout: (callback, delay) => { const id = ++sequence; timers.set(id, { callback, delay }); return id; },
    clearTimeout: id => timers.delete(id),
    onState: state => states.push({ ...state }),
    onRemove: () => { removals.push(frame); frame = null; },
    onNavigate: (url, token) => { frame = { url, token }; navigations.push(frame); }
  });
  return {
    controller, states, requests, navigations, timers, removals,
    get frame() { return frame; },
    get state() { return states.at(-1); },
    fireTimeout() {
      assert.equal(timers.size, 1, 'one watchdog belongs to the current navigation');
      const [id, { callback }] = timers.entries().next().value;
      timers.delete(id); callback();
    },
    ready() { controller.loaded(frame.token, frame.url, true); }
  };
}

test('frame client exports pure controller helpers without custom element/browser globals', () => {
  assert.equal(context.customElements, undefined);
  assert.equal(context.AirvanaPlayableFrame.version, '1.0.1');
  assert.equal(Object.isFrozen(context.AirvanaPlayableFrame), true);
  assert.equal(typeof createController, 'function');
});

test('only exact same-origin content and preview artifact routes resolve', () => {
  for (const route of ['/content/game-123_abc', '/preview/game-123_abc', '/content/game?embed=1#intro']) {
    assert.equal(resolveSource(route, baseURL), `${baseURL.slice(0, -1)}${route}`);
    assert.equal(resolveSource(`${baseURL.slice(0, -1)}${route}`, baseURL), `${baseURL.slice(0, -1)}${route}`);
  }
  assert.equal(resolveSource('/preview/game', 'https://example.com/app'), 'https://example.com/preview/game');
});

test('external, script, credential-bearing and non-artifact sources are rejected', () => {
  for (const source of [
    'https://example.com/content/game', 'http://127.0.0.1:8096/content/game',
    'http://localhost:8082/content/game', '//example.com/content/game',
    'javascript:alert(1)', 'data:text/html,hello', 'file:///content/game',
    'http://user:pass@127.0.0.1:8082/content/game',
    '/', '/api/feed', '/content/', '/content/game/extra', '/preview/game/',
    '/content/game%2Fextra', '/content/../api', '/content/%2e%2e', ''
  ]) assert.throws(() => resolveSource(source, baseURL), /invalid_source/, source);
});

test('preflight uses a non-mutating credentialed HEAD and does not show the iframe before load verification', async () => {
  const f = fixture();
  assert.equal(f.controller.getState(), 'idle');
  await f.controller.start('/content/game');
  assert.equal(f.requests.length, 1);
  const request = f.requests[0];
  assert.equal(request.url, `${baseURL}content/game`);
  assert.equal(request.options.method, 'HEAD');
  assert.equal(request.options.credentials, 'same-origin');
  assert.equal(request.options.cache, 'no-store');
  assert.equal(request.options.redirect, 'error');
  assert.ok(request.options.signal instanceof AbortSignal);
  assert.equal(request.options.signal.aborted, false);
  assert.equal(f.controller.getState(), 'loading');
  assert.deepEqual(f.states.map(state => state.status), ['checking', 'loading']);
  assert.equal(f.navigations.length, 1);
  assert.equal(f.timers.size, 1, 'watchdog remains until the iframe is independently verified');
  f.ready();
  assert.equal(f.controller.getState(), 'ready');
  assert.equal(f.timers.size, 0);
  assert.equal(request.options.signal.aborted, true, 'completed navigation releases its controller');
});

test('same pending source shares one HEAD and one navigation, including loading phase', async () => {
  const head = deferred(), f = fixture(() => head.promise);
  const first = f.controller.start('/content/game');
  const second = f.controller.start(`${baseURL}content/game`);
  assert.equal(first, second);
  assert.equal(f.requests.length, 1);
  head.resolve(response()); await first;
  const third = f.controller.start('/content/game');
  assert.equal(first, third);
  await third;
  assert.equal(f.requests.length, 1);
  assert.equal(f.navigations.length, 1);
  f.controller.dispose();
});

test('a later iframe navigation cannot replace a ready game with a browser error page', async () => {
  const f = fixture();
  await f.controller.start('/content/game');
  const token = f.frame.token;
  f.ready();
  f.controller.loaded(token, 'chrome-error://chromewebdata/', false);
  assert.equal(f.controller.getState(), 'error');
  assert.equal(f.state.code, 'document');
  assert.equal(f.frame, null);
});

for (const [status, code] of [[404, 'unavailable'], [410, 'unavailable'], [401, 'auth'], [403, 'auth'], [429, 'busy'], [500, 'network'], [503, 'network'], [302, 'network']]) {
  test(`HEAD ${status} becomes ${code}, leaving no navigated error-page frame`, async () => {
    const f = fixture(async () => response(status));
    await f.controller.start('/content/game');
    assert.equal(f.controller.getState(), 'error');
    assert.equal(f.state.code, code);
    assert.equal(f.frame, null);
    assert.equal(f.navigations.length, 0);
    assert.equal(f.requests[0].options.signal.aborted, true);
    assert.equal(f.timers.size, 0);
  });
}

for (const type of ['', null, 'application/json', 'text/plain', 'application/xhtml+xml']) {
  test(`successful HEAD without supported HTML (${String(type)}) is not navigated`, async () => {
    const f = fixture(async () => response(200, type));
    await f.controller.start('/preview/game');
    assert.equal(f.state.code, 'document');
    assert.equal(f.frame, null);
    assert.equal(f.navigations.length, 0);
  });
}

test('HTML content type is case insensitive', async () => {
  const f = fixture(async () => response(200, 'Text/HTML; charset=UTF-8'));
  await f.controller.start('/content/game');
  assert.equal(f.controller.getState(), 'loading');
  f.ready();
  assert.equal(f.controller.getState(), 'ready');
});

test('fetch rejection becomes a recoverable connection failure, not an unhandled rejection', async () => {
  const f = fixture(async () => { throw new Error('connection refused'); });
  await f.controller.start('/content/game');
  assert.equal(f.state.code, 'network');
  assert.equal(f.controller.getState(), 'error');
  assert.equal(f.frame, null);
  assert.equal(f.timers.size, 0);
});

test('invalid source cancels previous navigation without making another request', async () => {
  const f = fixture();
  await f.controller.start('/content/game');
  const prior = f.frame;
  await f.controller.start('https://example.com/content/game');
  assert.equal(f.controller.getState(), 'error');
  assert.equal(f.state.code, 'invalid_source');
  assert.equal(f.state.url, '');
  assert.equal(f.frame, null);
  assert.equal(f.requests.length, 1);
  f.controller.loaded(prior.token, prior.url, true);
  assert.equal(f.state.code, 'invalid_source');
});

test('source changes abort prior checks and ignore their late success', async () => {
  const oldHead = deferred(), newHead = deferred();
  const f = fixture(url => url.endsWith('/old') ? oldHead.promise : newHead.promise);
  const oldRequest = f.controller.start('/content/old');
  const oldSignal = f.requests[0].options.signal;
  const newRequest = f.controller.start('/content/new');
  assert.equal(oldSignal.aborted, true);
  assert.equal(f.timers.size, 1);
  oldHead.resolve(response()); await oldRequest;
  assert.equal(f.controller.getState(), 'checking');
  assert.equal(f.navigations.length, 0);
  newHead.resolve(response()); await newRequest;
  assert.equal(f.navigations.length, 1);
  assert.equal(f.frame.url, `${baseURL}content/new`);
  f.ready();
  assert.equal(f.state.url, `${baseURL}content/new`);
});

test('source changes ignore prior fetch rejection and iframe load/error callbacks', async () => {
  const f = fixture();
  await f.controller.start('/content/old');
  const prior = f.frame;
  await f.controller.start('/preview/new');
  f.controller.loaded(prior.token, prior.url, true);
  f.controller.failed(prior.token);
  assert.equal(f.controller.getState(), 'loading');
  assert.equal(f.frame.url, `${baseURL}preview/new`);
  f.ready();
  assert.equal(f.controller.getState(), 'ready');

  const stale = deferred(), next = deferred();
  const g = fixture(url => url.endsWith('/old') ? stale.promise : next.promise);
  const staleRequest = g.controller.start('/content/old');
  const currentRequest = g.controller.start('/content/new');
  stale.reject(new Error('aborted old request')); await staleRequest;
  assert.equal(g.controller.getState(), 'checking');
  next.resolve(response()); await currentRequest; g.ready();
  assert.equal(g.controller.getState(), 'ready');
});

test('HEAD timeout aborts pending network work and ignores a late response', async () => {
  const head = deferred(), f = fixture(() => head.promise, 250);
  const pending = f.controller.start('/content/game');
  assert.equal([...f.timers.values()][0].delay, 250);
  f.fireTimeout();
  assert.equal(f.requests[0].options.signal.aborted, true);
  assert.equal(f.state.code, 'timeout');
  assert.equal(f.frame, null);
  head.resolve(response()); await pending;
  assert.equal(f.state.code, 'timeout');
  assert.equal(f.navigations.length, 0);
});

test('an AbortError caused by the watchdog preserves the timeout explanation', async () => {
  const f = fixture((_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })), { once: true });
  }));
  const pending = f.controller.start('/content/game');
  f.fireTimeout(); await pending;
  assert.equal(f.controller.getState(), 'error');
  assert.equal(f.state.code, 'timeout');
  assert.equal(f.states.filter(state => state.status === 'error').length, 1);
});

test('iframe load timeout removes its document and ignores later load events', async () => {
  const f = fixture();
  await f.controller.start('/content/game');
  const pendingFrame = f.frame;
  assert.equal([...f.timers.values()][0].delay, 12000);
  f.fireTimeout();
  assert.equal(f.frame, null);
  assert.equal(f.state.code, 'timeout');
  f.controller.loaded(pendingFrame.token, pendingFrame.url, true);
  assert.equal(f.controller.getState(), 'error');
  assert.equal(f.state.code, 'timeout');
});

for (const [actualURL, hasBody] of [
  ['about:blank', true], ['chrome-error://chromewebdata/', true],
  ['http://example.com/content/game', true], [`${baseURL}content/other`, true],
  [`${baseURL}content/game`, false], [null, false]
]) {
  test(`iframe load ${String(actualURL)} with body=${hasBody} cannot masquerade as a ready game`, async () => {
    const f = fixture();
    await f.controller.start('/content/game');
    const token = f.frame.token;
    f.controller.loaded(token, actualURL, hasBody);
    assert.equal(f.controller.getState(), 'error');
    assert.equal(f.state.code, 'document');
    assert.equal(f.frame, null, 'the browser error/empty document is removed rather than shown');
    assert.equal(f.timers.size, 0);
    f.controller.loaded(token, `${baseURL}content/game`, true);
    assert.equal(f.controller.getState(), 'error');
  });
}

test('iframe error is idempotent and removes the failed document', async () => {
  const f = fixture();
  await f.controller.start('/content/game');
  const token = f.frame.token;
  f.controller.failed(token);
  const removalCount = f.removals.length;
  f.controller.failed(token);
  assert.equal(f.removals.length, removalCount);
  assert.equal(f.state.code, 'document');
  assert.equal(f.frame, null);
  assert.equal(f.states.filter(state => state.status === 'error').length, 1);
});

test('retry rechecks the same source and recovers only when its new document is verified', async () => {
  let attempt = 0;
  const f = fixture(async () => response(++attempt === 1 ? 503 : 200));
  await f.controller.start('/content/game');
  assert.equal(f.controller.getState(), 'error');
  await f.controller.start('/content/game');
  assert.equal(f.requests.length, 2);
  assert.equal(f.controller.getState(), 'loading');
  f.ready();
  assert.equal(f.controller.getState(), 'ready');
  assert.deepEqual(f.states.map(state => state.status), ['checking', 'error', 'checking', 'loading', 'ready']);
  assert.equal(f.state.code, undefined);
});

test('retry after document error cannot be completed or failed by the previous iframe', async () => {
  const f = fixture();
  await f.controller.start('/content/game');
  const old = f.frame;
  f.controller.failed(old.token);
  await f.controller.start('/content/game');
  const current = f.frame;
  assert.notEqual(current.token, old.token);
  f.controller.loaded(old.token, old.url, true);
  f.controller.failed(old.token);
  assert.equal(f.controller.getState(), 'loading');
  assert.equal(f.frame, current);
  f.ready();
  assert.equal(f.controller.getState(), 'ready');
});

test('dispose aborts pending work, clears frames/timers and makes late completions inert', async () => {
  const head = deferred(), f = fixture(() => head.promise);
  const pending = f.controller.start('/content/game');
  f.controller.dispose();
  const stateCount = f.states.length;
  assert.equal(f.controller.getState(), 'idle');
  assert.equal(f.requests[0].options.signal.aborted, true);
  assert.equal(f.frame, null);
  assert.equal(f.timers.size, 0);
  head.resolve(response()); await pending;
  assert.equal(f.states.length, stateCount);
  assert.equal(f.navigations.length, 0);
  assert.equal(f.controller.getState(), 'idle');
});

test('disposed iframe callbacks cannot resurrect it and reconnect starts a fresh lifecycle', async () => {
  const f = fixture();
  await f.controller.start('/content/game');
  const old = f.frame;
  f.controller.dispose();
  f.controller.loaded(old.token, old.url, true);
  f.controller.failed(old.token);
  assert.equal(f.controller.getState(), 'idle');
  assert.equal(f.frame, null);
  f.controller.dispose();
  await f.controller.start('/content/game');
  assert.equal(f.requests.length, 2);
  assert.notEqual(f.frame.token, old.token);
  f.ready();
  assert.equal(f.controller.getState(), 'ready');
  f.controller.dispose();
  assert.equal(f.controller.getState(), 'idle');
  assert.equal(f.frame, null);
  assert.equal(f.timers.size, 0);
});

test('failure copy distinguishes local recovery, access, availability, limits and bad documents', () => {
  assert.match(failureCopy('network', true).description, /本地游戏服务.*恢复服务/);
  assert.match(failureCopy('network', false).description, /网络连接/);
  assert.doesNotMatch(failureCopy('network', false).description, /本地/);
  const titles = new Set();
  for (const code of ['unavailable', 'auth', 'busy', 'invalid_source', 'timeout', 'document', 'network']) {
    const copy = failureCopy(code, true);
    assert.equal(typeof copy.title, 'string');
    assert.ok(copy.description.length > 10);
    titles.add(copy.title);
  }
  assert.equal(titles.size, 7);
  assert.equal(failureCopy('unknown', true).title, failureCopy('network', true).title);
});
