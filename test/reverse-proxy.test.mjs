import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { Wallet } from 'ethers';
import { createApp } from '../src/app.mjs';

test('trusted reverse proxy preserves the public HTTPS origin', async () => {
  const app = createApp({
    dbFile: ':memory:',
    disableWorker: true,
    env: {
      AI_PROVIDER: 'local',
      APP_SECRET: 'test-secret',
      TRUST_PROXY: 'loopback',
      API_RATE_LIMIT: '500',
      AUTH_RATE_LIMIT: '100',
    },
  });
  const server = http.createServer(app.handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  try {
    const wallet = Wallet.createRandom();
    const response = await fetch(`${base}/api/auth/wallet/challenge`, {
      method: 'POST',
      headers: {
        Origin: 'https://app.example.com',
        'X-Forwarded-For': '203.0.113.42',
        'X-Forwarded-Host': 'app.example.com',
        'X-Forwarded-Proto': 'https',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address: wallet.address, chainId: 1, role: 'creator' }),
    });

    assert.equal(response.status, 200);
    const body = await response.json();
    assert.match(body.message, /^app\.example\.com wants you to sign in/m);
    assert.match(body.message, /URI: https:\/\/app\.example\.com/);
  } finally {
    server.closeAllConnections?.();
    await new Promise(resolve => server.close(resolve));
    app.close();
  }
});
