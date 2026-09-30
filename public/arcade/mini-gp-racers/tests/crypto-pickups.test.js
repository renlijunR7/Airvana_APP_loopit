const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadCatalog() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'crypto-pickups.js'), 'utf8');
  const context = { window: {} };
  vm.runInNewContext(source, context, { filename: 'crypto-pickups.js' });
  return context.window.MiniGPCryptoPickups.types;
}

test('track pickups expose seven equal-value arcade crypto variants', () => {
  const types = loadCatalog();
  assert.deepEqual(
    Array.from(types, (type) => type.symbol),
    ['BTC', 'ETH', 'USDT', 'SOL', 'BNB', 'DOGE', 'USDC']
  );
  assert.equal(new Set(Array.from(types, (type) => type.score)).size, 1);
  assert.ok(types.every((type) => /^#[0-9a-f]{6}$/i.test(type.color)));
});
