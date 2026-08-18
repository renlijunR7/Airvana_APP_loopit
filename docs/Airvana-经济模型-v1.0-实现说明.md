# Airvana 经济模型 V1 实现说明

> 代码基线：2026-08-18  
> 状态：本地全栈闭环已实现；外部 KYC、权威归因、真实付款和法务批准待生产接入

## 1. 已实现范围

- 单账号角色层：所有账号保留玩家能力；申请、KYC 凭证核验和平台审批后增加 KOL membership 与 entitlements。
- AIP 统一账本：来源规则、幂等键、批次、有效期、冻结、撤销、消费和申诉。
- 普通试玩规则：`playable_start → step_complete → playable_complete` 运行证明后统一发 5 AIP；首次有效试玩另按注册规则一次性发放。
- 订阅：Free、Creator Pro、Brand / Campaign 套餐、周期额度、用量账本及到期取消；订阅不发 AIP/AIT，价格状态保持 `pending_approval`。
- 创作计费：周期额度优先，余额不足部分使用 AIP；AIT 永不用于创作。
- Campaign Contract：锁定商业、地区、年龄、CTA、奖励、合规、数据、归因、成功事件、审批和 Kill Switch；Brief 未批准时 Contract 不能批准。
- AIT：只允许获批、未过期 Contract；强制成功事件、归因引用、金额规则、单用户上限、总预算和风控验证。
- 结算：非金融权益申领与现金/USDT 付款记录分表处理；付款需要人工批准、付款引用和回执引用，代码不伪造真实支付。
- 治理：AIT/AIP 冻结、撤销、过期、原因码、审计和用户申诉。
- 用户数据导出：包含角色、订阅、额度用量、账本批次、AIT 权益、权益申领、付款记录和申诉。

## 2. 核心状态机

### 玩家升级 KOL

`player → application submitted → kyc_pending → under_review → approved(KOL)`

失败或治理分支：`rejected / suspended`。暂停 KOL 不删除玩家身份、历史作品或无争议权益。

### AIP 批次

`pending → available → spent / expired`，治理可以进入 `frozen / reversed`。

### AIT 权益

`pending → available / frozen / reversed → settlement_pending → settled`，达到 Contract 期限且未结算时进入 `expired`。

### 独立付款记录

`submitted → approved → paid`，或 `submitted → rejected`。`paid` 必须有付款引用和回执引用。

## 3. 权威数据源

- 经济规则与状态机：`src/economy.mjs`
- SQLite schema 与迁移：`src/db.mjs`
- API、鉴权、通知与审计：`src/app.mjs`
- 用户端展示：`public/index.html`
- 产品规则：`docs/Airvana-经济模型-v1.0.md`

`point_events` 保留事件级审计，`ledger_batches` 是 AIP/AIT 批次与余额状态的权威来源。现金、USDT 和非金融权益不进入 AIP/AIT 余额。

## 4. 兼容与迁移

- `/api/ait-withdrawals` 及旧审核/完成入口固定返回 HTTP `410`。
- 旧 `ait_withdrawal_requests` 数据表仅用于兼容历史数据库和后续数据迁移，不再写入。
- 旧 Campaign `settlements` 不再作为新 AIT 发放入口；新权益必须从获批 Contract 生成。

## 5. 生产上线门槛

1. 选择并接入 KYC 服务商，只保留状态与凭证引用。
2. 接入品牌/合作方的权威成功事件，建立签名、去重、时间窗和重放防护。
3. 接入付款提供商或财务操作台，保存付款及回执引用，完成对账与异常处理。
4. 配置定时过期、告警、风控队列和审计监控。
5. 产品、财务、风控和法务批准订阅价格、退款、税费、目标地区及专项结算条款。

正式《服务协议》和《隐私政策》属于用户提供且有逐字测试保护的法律文本。本次没有静默改写；经济模型相关条款应由法务确认后形成新版本并重新获取用户同意。
