import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const frontend = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
const refreshSource = frontend.slice(frontend.indexOf('async function refresh'), frontend.indexOf('async function walletLogin'));

test('desktop task polling is single-flight and schedules the next request after completion', () => {
  assert.match(frontend, /refreshInFlight:\s*null/);
  assert.match(frontend, /while \(state\.refreshInFlight\)/);
  assert.match(frontend, /setTimeout\(\(\) => \{\s*state\.poller = null;\s*refresh\(\{ silent: true, background: true \}\);\s*\}, 900\)/s);
  assert.doesNotMatch(frontend, /setInterval\(\(\)=>refresh\(\{silent:true\}\), 900\)/);
});

test('background refresh avoids replacing the workspace while the user is editing', () => {
  assert.match(frontend, /function isUserEditing\(\)/);
  assert.match(frontend, /background && changed && isUserEditing\(\)/);
  assert.match(frontend, /state\.pendingData = nextData/);
  assert.match(frontend, /document\.addEventListener\('focusout',[\s\S]*applyPendingData/);
});

test('bootstrap refresh returns to login only for authentication failures', () => {
  assert.match(frontend, /error\.status = response\.status/);
  assert.match(refreshSource, /if \(\[401, 403\]\.includes\(error\.status\)\) \{[\s\S]*loginView\(\);[\s\S]*return;/);
  assert.doesNotMatch(refreshSource, /catch \(error\) \{\s*stopPolling\(\);\s*loginView\(\);/);
});

test('network and server refresh failures retain data and expose a retry state', () => {
  assert.match(frontend, /refreshError:\s*''/);
  assert.match(frontend, /Number\(error\?\.status\) >= 500/);
  assert.match(frontend, /网络连接失败，请检查网络后重试/);
  assert.match(frontend, /if \(!silent && !state\.data\) loading\(\)/);
  assert.match(refreshSource, /state\.refreshError = refreshFailureMessage\(error\)/);
  assert.match(refreshSource, /if \(state\.data\) \{\s*updateRefreshStatus\(\);\s*toast\(state\.refreshError, 'error'\);\s*\} else \{\s*refreshFailureView\(state\.refreshError\);/);
  assert.match(frontend, /data-action="refresh-retry"/);
  assert.match(frontend, /action === 'refresh-retry'\) await refresh\(\{ silent: Boolean\(state\.data\) \}\)/);
});

test('modal content actions can copy the mobile-wallet login link', () => {
  assert.match(frontend, /modalRoot\.addEventListener\('click'/);
  assert.match(frontend, /el\.dataset\.action !== 'wallet-copy'/);
  assert.match(frontend, /await copyCurrentLoginLink\(\)/);
});
