import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtempSync, rmSync, existsSync, statSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { probeLocalPreview, startLocalPreview, PREVIEW_URL } from '../scripts/start-local-preview.mjs';

const validHealth = { ok: true, service: 'airvana-v5.3-economy-v1', economyVersion: 'airvana-economy-v1.0' };
function mockRequest({ body = JSON.stringify(validHealth), status = 200, error, timeout = false } = {}) {
  return (url, options, onResponse) => {
    assert.equal(url, 'http://127.0.0.1:8082/api/health');
    assert.equal(options.headers.Accept, 'application/json');
    const req = new EventEmitter();
    req.destroy = () => {};
    req.setTimeout = (_, callback) => { if (timeout) queueMicrotask(callback); };
    queueMicrotask(() => {
      if (timeout) return;
      if (error) return req.emit('error', Object.assign(new Error(error), { code: error }));
      const res = new EventEmitter();
      res.statusCode = status;
      res.setEncoding = () => {};
      res.destroy = () => {};
      onResponse(res);
      res.emit('data', body);
      res.emit('end');
    });
    return req;
  };
}

test('health probe accepts only the expected Airvana service on the fixed loopback URL', async () => {
  assert.equal((await probeLocalPreview({ request: mockRequest() })).state, 'healthy');
  for (const response of [
    { body: '<html>another app</html>' },
    { status: 503 },
    { body: JSON.stringify({ ...validHealth, service: 'another-app' }) },
    { body: JSON.stringify({ ...validHealth, ok: false }) },
    { body: JSON.stringify({ ...validHealth, economyVersion: 'unrecognized' }) },
    { body: 'x'.repeat(65537) },
    { timeout: true },
    { error: 'ECONNRESET' },
  ]) assert.equal((await probeLocalPreview({ request: mockRequest(response) })).state, 'occupied');
  assert.equal((await probeLocalPreview({ request: mockRequest({ error: 'ECONNREFUSED' }) })).state, 'free');
});

test('existing healthy service is reused without touching the filesystem or spawning', async () => {
  const result = await startLocalPreview({
    projectRoot: '/does-not-exist/local-preview-test',
    probe: async () => ({ state: 'healthy' }),
    spawnProcess: () => { assert.fail('must not spawn'); },
  });
  assert.deepEqual(result, { state: 'existing', url: PREVIEW_URL });
});

test('health check has an absolute deadline even if an unknown listener never completes', async () => {
  let destroyed = false;
  const result = await probeLocalPreview({
    timeoutMs: 10,
    request: () => {
      const req = new EventEmitter();
      req.setTimeout = () => {};
      req.destroy = () => { destroyed = true; };
      return req;
    },
  });
  assert.equal(result.state, 'occupied');
  assert.match(result.reason, /total deadline/);
  assert.equal(destroyed, true);
});

test('foreign or unverified listener is refused without stopping or replacing it', async () => {
  await assert.rejects(startLocalPreview({
    probe: async () => ({ state: 'occupied', reason: 'other app' }),
    spawnProcess: () => { assert.fail('must not spawn'); },
  }), /other app.*No process was stopped or replaced/);
});

test('new local child is detached, unreferenced, logged in the project, and health-verified', async () => {
  const fixture = mkdtempSync(join(tmpdir(), 'airvana-preview-launcher-'));
  let unreferenced = false;
  let probes = 0;
  try {
    const result = await startLocalPreview({
      projectRoot: fixture,
      env: { HOST: '0.0.0.0', PORT: '9999', AIRVANA_TEST: 'retained' },
      probe: async () => ({ state: ++probes < 3 ? 'free' : 'healthy' }),
      wait: async () => {},
      spawnProcess: (executable, args, options) => {
        assert.equal(executable, process.execPath);
        assert.deepEqual(args, [join(fixture, 'server.mjs')]);
        assert.equal(options.cwd, fixture);
        assert.equal(options.detached, true);
        assert.deepEqual(options.env, { HOST: '127.0.0.1', PORT: '8082', AIRVANA_TEST: 'retained' });
        assert.equal(options.stdio[0], 'ignore');
        assert.equal(typeof options.stdio[1], 'number');
        assert.equal(options.stdio[1], options.stdio[2]);
        const child = new EventEmitter();
        child.pid = 123456;
        child.unref = () => { unreferenced = true; };
        queueMicrotask(() => child.emit('spawn'));
        return child;
      },
    });
    assert.equal(result.state, 'started');
    assert.equal(result.url, PREVIEW_URL);
    assert.equal(result.pid, 123456);
    assert.equal(result.logPath, join(fixture, '.runtime', 'local-preview.log'));
    assert.equal(unreferenced, true);
    assert.equal(probes, 3);
    assert.equal(statSync(result.logPath).mode & 0o777, 0o600);
  } finally { rmSync(fixture, { recursive: true, force: true }); }
});

test('spawn error is reported and does not claim a healthy preview', async () => {
  const fixture = mkdtempSync(join(tmpdir(), 'airvana-preview-launcher-'));
  try {
    await assert.rejects(startLocalPreview({
      projectRoot: fixture,
      probe: async () => ({ state: 'free' }),
      spawnProcess: () => {
        const child = new EventEmitter();
        queueMicrotask(() => child.emit('error', new Error('spawn denied')));
        return child;
      },
    }), /spawn denied/);
  } finally { rmSync(fixture, { recursive: true, force: true }); }
});

test('failed health verification is bounded and never kills a process', async () => {
  const fixture = mkdtempSync(join(tmpdir(), 'airvana-preview-launcher-'));
  let probes = 0;
  try {
    await assert.rejects(startLocalPreview({
      projectRoot: fixture,
      attempts: 2,
      probe: async () => { probes += 1; return { state: 'free' }; },
      wait: async () => {},
      spawnProcess: () => {
        const child = new EventEmitter();
        child.pid = 123456;
        child.unref = () => {};
        child.kill = () => { assert.fail('must not kill'); };
        queueMicrotask(() => child.emit('spawn'));
        return child;
      },
    }), /health could not be verified.*No process was stopped or replaced/);
    assert.equal(probes, 3);
  } finally { rmSync(fixture, { recursive: true, force: true }); }
});

test('npm start is unchanged and runtime logs are ignored', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.scripts.start, 'node server.mjs');
  assert.equal(pkg.scripts.preview, 'node scripts/start-local-preview.mjs');
  const ignore = readFileSync(new URL('../.gitignore', import.meta.url), 'utf8');
  assert.match(ignore, /^\.runtime\/$/m);
  assert.equal(existsSync(new URL('../scripts/start-local-preview.mjs', import.meta.url)), true);
});
