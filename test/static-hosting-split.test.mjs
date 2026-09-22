import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app.mjs';

const baseEnv = {
  AI_PROVIDER: 'local',
  APP_SECRET: 'test-secret',
  API_RATE_LIMIT: '5000',
  AUTH_RATE_LIMIT: '1000',
};

async function withServer(options, run) {
  const app = createApp({ dbFile: ':memory:', allowDemo: true, ...options });
  const server = http.createServer(app.handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await run(async path => {
      const response = await fetch(base + path, { redirect: 'manual' });
      return { status: response.status, body: await response.text() };
    });
  } finally {
    await app.close?.();
    await new Promise(resolve => server.close(resolve));
  }
}

test('默认仍由本进程托管静态资源，本地开发一条命令即可跑起来', async () => {
  await withServer({ env: baseEnv }, async get => {
    const home = await get('/');
    assert.equal(home.status, 200);
    assert.match(home.body, /<!doctype html>/i);

    const workspace = await get('/workspace');
    assert.equal(workspace.status, 200);
  });
});

test('SERVE_STATIC=false 后只剩接口层，静态资源交给 nginx/CDN', async () => {
  await withServer(
    { env: { ...baseEnv, SERVE_STATIC: 'false' } },
    async get => {
      // 静态资源不再由本服务提供。
      const home = await get('/');
      assert.equal(home.status, 404);
      assert.match(home.body, /api_only/);

      const asset = await get('/boot.js');
      assert.equal(asset.status, 404);

      const workspace = await get('/workspace');
      assert.equal(workspace.status, 404);

      // 接口层不受影响。
      const health = await get('/api/health');
      assert.equal(health.status, 200);

      // /content 等受控页面路由仍由本服务负责，只是内容不存在时报 404 业务错。
      const content = await get('/content/not-a-real-id');
      assert.equal(content.status, 404);
      assert.doesNotMatch(content.body, /api_only/);
    },
  );
});
