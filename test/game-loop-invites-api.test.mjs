import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app.mjs';

let app;
let server;
let base;

before(async () => {
  app = createApp({ dbFile: ':memory:', allowDemo: true, disableWorker: true, env: { AI_PROVIDER: 'local', APP_SECRET: 'test-secret', RUNTIME_MIN_DURATION_MS: '0', API_RATE_LIMIT: '2000', AUTH_RATE_LIMIT: '500' } });
  server = http.createServer(app.handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.closeAllConnections?.();
  await new Promise(resolve => {
    server.close(resolve);
  });
  app.close();
});

async function req(path, { method = 'GET', body, cookie, device = 'test-device-0001' } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Airvana-Device': device, ...(cookie ? { Cookie: cookie } : {}) },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const data = await response.json();
  return { response, data, cookie: response.headers.get('set-cookie')?.split(';')[0] };
}

async function demoLogin(role, persona) {
  const result = await req('/api/auth/demo', { method: 'POST', body: { role, persona } });
  assert.equal(result.response.status, 200);
  return result.cookie;
}

async function aipAvailable(cookie) {
  const result = await req('/api/economy', { cookie });
  assert.equal(result.response.status, 200);
  return result.data.economy.aip.available;
}

test('game completion keeps per-playable coin isolation and grants 5 AIP once per playable per day', async () => {
  const cookie = await demoLogin('creator', 'game-loop-player');
  const baseline = await aipAvailable(cookie);

  const first = await req('/api/games/complete', { method: 'POST', cookie, body: { playableId: 'plb_star_mower', title: '星际割草机', success: true, score: 1212, stage: 'stage-3', summary: '深度生存测试' } });
  assert.equal(first.response.status, 201);
  assert.equal(first.data.coinsEarned, 1212);
  assert.equal(first.data.earnedAip, 5);
  assert.equal(first.data.alreadyRewardedToday, false);
  assert.equal(first.data.ledger.balance, 1212);
  assert.equal(first.data.ledger.completions, 1);
  assert.equal(first.data.economy.aip.available, baseline + 5);
  assert.match(first.data.boundary, /按作品隔离/);

  // 同一作品当日再次有效完成：金币照加，AIP 幂等不重复。
  const repeat = await req('/api/games/complete', { method: 'POST', cookie, body: { playableId: 'plb_star_mower', success: true, score: 300 } });
  assert.equal(repeat.response.status, 200);
  assert.equal(repeat.data.coinsEarned, 300);
  assert.equal(repeat.data.earnedAip, 0);
  assert.equal(repeat.data.alreadyRewardedToday, true);
  assert.equal(repeat.data.ledger.balance, 1512);
  assert.equal(repeat.data.economy.aip.available, baseline + 5);

  // 失败完成：不加金币、不发 AIP，但保留体验记录。
  const failed = await req('/api/games/complete', { method: 'POST', cookie, body: { playableId: 'plb_star_mower', success: false, score: 88 } });
  assert.equal(failed.response.status, 200);
  assert.equal(failed.data.coinsEarned, 0);
  assert.equal(failed.data.ledger.balance, 1512);

  // 另一作品有金币与当日 AIP 各自独立。
  const other = await req('/api/games/complete', { method: 'POST', cookie, body: { playableId: 'plb_neon_dash', title: '霓虹冲刺', success: true, score: 40 } });
  assert.equal(other.response.status, 201);
  assert.equal(other.data.earnedAip, 5);
  assert.equal(other.data.economy.aip.available, baseline + 10);

  const coins = await req('/api/games/coins', { cookie });
  assert.equal(coins.response.status, 200);
  const byId = Object.fromEntries(coins.data.ledgers.map(item => [item.playableId, item]));
  assert.equal(byId.plb_star_mower.balance, 1512);
  assert.equal(byId.plb_star_mower.completions, 2);
  assert.equal(byId.plb_neon_dash.balance, 40);
  assert.match(coins.data.boundary, /不可跨作品转移/);

  const invalid = await req('/api/games/complete', { method: 'POST', cookie, body: { playableId: 'star-mower', success: true, score: 10 } });
  assert.equal(invalid.response.status, 400);
  assert.equal(invalid.data.error.code, 'invalid_playable_id');
});

test('invite flow: code issuance, redemption binding, qualification reward is idempotent per invitee', async () => {
  const inviter = await demoLogin('creator', 'invite-inviter');
  const invitee = await demoLogin('creator', 'invite-invitee');

  const summary = await req('/api/invites/summary', { cookie: inviter });
  assert.equal(summary.response.status, 200);
  const code = summary.data.invite.inviteCode;
  assert.match(code, /^AIR-/);
  assert.equal(summary.data.invite.invitedCount, 0);
  assert.equal(summary.data.invite.rewardPerQualified, 100);

  // 邀请码稳定：重复获取不换码。
  const again = await req('/api/invites/summary', { cookie: inviter });
  assert.equal(again.data.invite.inviteCode, code);

  // 不能用自己的邀请码。
  const selfRedeem = await req('/api/invites/redeem', { method: 'POST', cookie: inviter, body: { inviteCode: code } });
  assert.equal(selfRedeem.response.status, 400);

  const redeem = await req('/api/invites/redeem', { method: 'POST', cookie: invitee, body: { inviteCode: code } });
  assert.equal(redeem.response.status, 201);
  assert.equal(redeem.data.status, 'registered');
  const redeemRepeat = await req('/api/invites/redeem', { method: 'POST', cookie: invitee, body: { inviteCode: code } });
  assert.equal(redeemRepeat.response.status, 200);
  assert.equal(redeemRepeat.data.idempotent, true);

  const inviterBaseline = await aipAvailable(inviter);
  const qualify = await req('/api/invites/qualify', { method: 'POST', cookie: invitee });
  assert.equal(qualify.response.status, 201);
  assert.equal(qualify.data.status, 'qualified');
  assert.equal(qualify.data.earnedAip, 100);
  assert.equal(await aipAvailable(inviter), inviterBaseline + 100);

  // 合格幂等：重复触发不重复入账。
  const qualifyRepeat = await req('/api/invites/qualify', { method: 'POST', cookie: invitee });
  assert.equal(qualifyRepeat.response.status, 200);
  assert.equal(qualifyRepeat.data.idempotent, true);
  assert.equal(await aipAvailable(inviter), inviterBaseline + 100);

  const after = await req('/api/invites/summary', { cookie: inviter });
  assert.equal(after.data.invite.invitedCount, 1);
  assert.equal(after.data.invite.qualifiedCount, 1);
  assert.equal(after.data.invite.earnedAip, 100);

  // 换绑防护：已绑定邀请关系的账号不能再用他人邀请码。
  const third = await demoLogin('creator', 'invite-third');
  const thirdSummary = await req('/api/invites/summary', { cookie: third });
  const rebind = await req('/api/invites/redeem', { method: 'POST', cookie: invitee, body: { inviteCode: thirdSummary.data.invite.inviteCode } });
  assert.equal(rebind.response.status, 409);

  // 没有邀请关系的账号触发合格 → 404。
  const orphan = await req('/api/invites/qualify', { method: 'POST', cookie: third });
  assert.equal(orphan.response.status, 404);
});
