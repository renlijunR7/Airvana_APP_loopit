# Airvana 移动端对应后端接口 v1.0

对应 Flutter 版本本地闭环（`LocalAirvanaStore`）的服务端接口。经济口径与移动端一致：**游戏金币按作品隔离、不可转移不可兑换；每作品每日首次有效完成 +5 AIP（`playable_complete` 规则）；合格邀请 +100 AIP（`qualified_invitation` 规则）。**

所有接口需登录态（Cookie 会话），错误统一返回 `{ error: { code, message } }`。

## 游戏完整闭环

### POST /api/games/complete
记录一次完整玩法结果（对应移动端 `recordGameCompletion` / H5 引擎 `onComplete`）。

请求体：
```json
{ "playableId": "plb_star_mower", "title": "星际割草机", "success": true, "score": 1212, "stage": "stage-3", "summary": "清扫车被草浪包围" }
```
- `playableId` 必须匹配 `^plb_[a-z0-9_-]{1,72}$`，否则 400 `invalid_playable_id`。
- `success=true` 时金币 +`score`（写入该作品独立账本）；当日该作品首次有效完成再 +5 AIP（幂等键 `game-daily:{userId}:{playableId}:{day}`）。
- `success=false` 只记录体验，不加金币、不发 AIP。

响应（首次发 AIP 时 201，否则 200）：
```json
{
  "ledger": { "playableId": "plb_star_mower", "title": "星际割草机", "balance": 1212, "completions": 1, "lastRewardDate": "2026-09-03" },
  "success": true, "coinsEarned": 1212, "earnedAip": 5, "alreadyRewardedToday": false,
  "boundary": "游戏金币按作品隔离，不可跨作品转移，不支持兑换 AIP/AIT 或提现。",
  "economy": { "aip": { "available": 105 } }
}
```

### GET /api/games/coins
返回当前用户全部作品金币账本：`{ ledgers: [ledger...], boundary }`。

数据表：`game_coin_ledgers`（user_id+playable_id 唯一）、`game_completions`（逐次完成流水，含 coins_earned / aip_earned）。

## 邀请任务

### GET /api/invites/summary
首次调用为用户生成稳定邀请码（`AIR-XXX-9999` 格式，唯一）。
```json
{ "invite": { "inviteCode": "AIR-KAI-4821", "invitedCount": 1, "qualifiedCount": 1, "earnedAip": 100, "rewardPerQualified": 100, "boundary": "…" } }
```

### POST /api/invites/redeem
被邀请人绑定邀请码：`{ "inviteCode": "AIR-KAI-4821" }`。
- 不能使用自己的邀请码（400 `self_invite_forbidden`）。
- 每个账号只能绑定一次；换绑他人邀请码 → 409 `invite_already_bound`；重复同码 → 200 幂等。

### POST /api/invites/qualify
被邀请人达成合格条件（完成注册并配置 Agent）后触发：将本人邀请关系置为 `qualified`，给**邀请人**入账 100 AIP（按被邀请人幂等，重复触发 200 且不重复入账）。无邀请关系 → 404 `invite_not_found`。

数据表：`invite_profiles`（邀请码）、`invite_redemptions`（invitee 唯一，registered→qualified）。

## 已有接口（移动端其余模块直接对接）
- 签到：`POST /api/economy/check-in`（daily_login 5 + streak_day_N 加成）
- 钱包绑定：`POST /api/wallet-bindings/{validate-address|challenge|verify}`
- 订阅/额度/创作扣费：`GET /api/economy`、`GET /api/economy/plans`、`POST /api/economy/creation/consume`
- 创作者身份：`POST /api/creator-applications`
- KOL 分身：`GET|POST /api/ai-twin`、`/api/ai-twin/scenes`

## 已知口径差异（待产品定夺）
移动端/旧版 Web 前端本地签到公式为 `20 + streak×10`（连签 4 → 60 AIP）；服务端经济 v1 为 `daily_login 5 + streak_day_N（10~30）`（连签 4 → 25 AIP）。两套口径目前并存（前端本地记账 + 服务端独立入账），上线前需统一为其中一种。

## 测试
`test/game-loop-invites-api.test.mjs`（HTTP 级，覆盖金币隔离、每日 AIP 幂等、失败不入账、邀请绑定/合格/幂等/换绑防护）。全量后端测试 319/319 通过。
