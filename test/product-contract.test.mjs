import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  AIP_REWARD_RULES,
  GAME_COIN_BOUNDARY,
  INVITE_BOUNDARY,
} from '../src/economy.mjs';

const root = path.resolve(import.meta.dirname, '..');
const contract = JSON.parse(
  fs.readFileSync(path.join(root, 'docs/product-contract/economy.json'), 'utf8'),
);

test('后端的 AIP 奖励金额逐条符合产品契约', () => {
  for (const [rule, amount] of Object.entries(contract.aipRewards)) {
    assert.ok(AIP_REWARD_RULES[rule], `契约里的 ${rule} 在后端不存在`);
    assert.equal(
      AIP_REWARD_RULES[rule].amount,
      amount,
      `${rule} 与契约不一致`,
    );
  }
  // 反向：后端不得偷偷多出契约之外的奖励规则。
  for (const rule of Object.keys(AIP_REWARD_RULES)) {
    assert.ok(
      rule in contract.aipRewards,
      `后端多出契约之外的奖励规则：${rule}`,
    );
  }
});

test('签到阶梯由 daily_login 与 streak_day_N 相加得到，第 7 天起封顶', () => {
  const base = AIP_REWARD_RULES.daily_login.amount;
  contract.checkIn.ladder.forEach((expected, index) => {
    const day = index + 1;
    const bonus = AIP_REWARD_RULES[`streak_day_${day}`]?.amount ?? 0;
    assert.equal(base + bonus, expected, `第 ${day} 天应发 ${expected} AIP`);
  });
  // 第 8 天起 src/app.mjs 用 Math.min(streak, 7)，仍是封顶值。
  const capBonus = AIP_REWARD_RULES[
    `streak_day_${contract.checkIn.capFromDay}`
  ].amount;
  assert.equal(base + capBonus, contract.checkIn.capAmount);
});

test('三类资产的边界声明与契约逐字一致', () => {
  assert.equal(GAME_COIN_BOUNDARY, contract.boundaries.gameCoin);
  assert.equal(INVITE_BOUNDARY, contract.boundaries.invite);
});
