import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app.mjs';

test('Flutter Web origin is explicit, credentialed and fail-closed for other origins', async () => {
  const app = createApp({
    dbFile: ':memory:',
    allowDemo: true,
    disableWorker: true,
    env: {
      AI_PROVIDER: 'local',
      APP_SECRET: 'test-secret',
      CORS_ALLOWED_ORIGINS: 'http://127.0.0.1:8083',
      API_RATE_LIMIT: '500',
      AUTH_RATE_LIMIT: '100',
    },
  });
  const server = http.createServer(app.handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  try {
    const preflight = await fetch(`${base}/api/auth/demo`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://127.0.0.1:8083',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,x-airvana-device',
      },
    });
    assert.equal(preflight.status, 204);
    assert.equal(
      preflight.headers.get('access-control-allow-origin'),
      'http://127.0.0.1:8083',
    );
    assert.equal(
      preflight.headers.get('access-control-allow-credentials'),
      'true',
    );

    const login = await fetch(`${base}/api/auth/demo`, {
      method: 'POST',
      headers: {
        Origin: 'http://127.0.0.1:8083',
        'Content-Type': 'application/json',
        'X-Airvana-Device': 'flutter-web-test',
      },
      body: JSON.stringify({ role: 'creator', persona: 'flutter-cors' }),
    });
    assert.equal(login.status, 200);
    assert.equal(
      login.headers.get('access-control-allow-origin'),
      'http://127.0.0.1:8083',
    );
    assert.ok(login.headers.get('set-cookie')?.startsWith('airvana_session='));

    const rejected = await fetch(`${base}/api/auth/demo`, {
      method: 'POST',
      headers: {
        Origin: 'https://untrusted.example',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'creator' }),
    });
    assert.equal(rejected.status, 403);
    assert.equal(rejected.headers.get('access-control-allow-origin'), null);
  } finally {
    server.closeAllConnections?.();
    await new Promise(resolve => server.close(resolve));
    app.close();
  }
});
