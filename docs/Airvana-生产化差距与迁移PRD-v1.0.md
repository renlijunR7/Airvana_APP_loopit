# Airvana 生产化差距与迁移 PRD

> 文档版本：v1.0
> 日期：2026-08-27
> 文档状态：DRAFT / 待产品、技术、合规共同确认
> 适用范围：Airvana iOS、Android、Web、服务端、Agentic Playable 运行时与运营后台
> 当前基线：`airvana-v5-fullstack` 本地产品 MVP
> 目标：将已完成的本地产品闭环迁移为可真实运营、可审计、可灰度、可回滚并满足应用市场审核要求的生产系统
> 非发布声明：本文描述目标架构、迁移计划与验收门槛，不代表相关能力已集成、上线、取得监管许可或产生商业结果。

---

## 0. 结论先行

Airvana 当前不是“从零开始的原型”，而是具备大量 UI、本地业务状态机、服务端领域对象和自动化测试的**单机产品 MVP**。真正的生产化差距集中在四件事：

1. **移动端与服务端未形成统一事实源**：iOS/Android Demo Wrapper 内嵌 `public/`，不携带 Node/SQLite 后端；移动前端仍以 `frontendDemoMode = true` 和 `local-only` Repository 运行。
2. **基础设施是单机开发形态**：Node 原生 HTTP + SQLite + 进程内任务，缺少 PostgreSQL、分布式任务、对象存储、CDN、多实例租约、密钥管理、监控、备份和容量治理。
3. **真实外部确认链未接入**：邮件、Google/Apple 登录、KYC、商店支付、推送、品牌 confirmed conversion、渠道 OAuth、真实结算等仍需要生产 Provider 和服务端回调。
4. **商店与运营门禁尚未系统化**：Creator Content / UGC 审核、每个 H5 作品索引与深链、年龄限制、数字商品支付、账号删除、隐私披露、审核账号和商店素材需要成为发布门禁，而不是上线前临时补充。

推荐路线：

```text
保留现有产品逻辑、H5 游戏与已验证状态机
-> 建立生产 API、PostgreSQL、队列、对象存储与审计底座
-> 用 Repository 接口逐域替换 localStorage / SQLite 单机事实源
-> 建立 Flutter 移动外壳，H5 游戏仅运行在受控 WebView
-> 接入支付、推送、登录、KYC 与外部 confirmed event Provider
-> TestFlight / Play Internal Testing 灰度
-> 商店审核与分地区发布
```

不建议第一阶段直接拆微服务，也不建议先重写 38 个 H5 游戏。服务端先采用**模块化单体 + 独立 Worker**，待负载和组织边界被真实数据证明后再拆分。

---

## 1. 产品目标与非目标

### 1.1 生产化目标

生产版本必须做到：

- 玩家、KOL、品牌和平台运营在 iOS、Android、Web 看到同一服务端对象与状态。
- 所有核心流程从入口走到结果；刷新、换设备和 APP 重启后状态一致。
- 每个关键动作具备稳定 ID、鉴权、幂等、审计、失败、取消、重试和回滚。
- Campaign 从版本化 `Campaign Brief` 开始，并以获批 `Campaign Contract` 作为生产事实源。
- Agent 只能提出允许字段的结构化 Patch；预算、奖励、CTA、地区、合规、归因、结算和 Kill Switch 保持锁定。
- Agentic Playable 的构建、审核、发布、运行、事件、归因和结算引用同一 Campaign / Contract / Playable / Version 链。
- 客户端点击不得被写成注册、KYC、购买或结算成功；下游成功只能由获批服务端确认。
- 弱网、离线、地区、权限、合同、风控和 Kill Switch 失败时 Fail Closed。
- 具备商店支付、隐私、账号删除、UGC 治理、年龄限制、审核账号和商店材料闭环。
- 可通过灰度、监控、暂停、回滚和 Kill Switch 控制生产风险。

### 1.2 本次迁移非目标

以下不进入首发生产范围：

- 真实加密货币玩家奖励、公开 Token 发行、挖矿或收益承诺。
- 托管钱包、交易所、链上兑换或 APP 内 USDT 提现。
- AIT 直接提现或平台统一 AIT / 法币兑换率。
- Agent 自动扩大地区、渠道、预算、奖励、CTA、归因或结算范围。
- 未经人工确认的自动社交媒体发布、自动营销消息或自动投放。
- 运行时模型直接生成并执行未沙箱化生产代码。
- 第一阶段微服务化、跨云、多活和复杂数据中台。

---

## 2. 术语与状态口径

### 2.1 产品术语

- **KOL**：Agentic Playable 的创作者、所有者和运营者，不是 Agent 本身。
- **Agentic Playable**：Airvana 唯一前台营销智能体产品对象，可拥有多个版本。
- **Campaign Brief**：结构化需求输入，不等于生产批准。
- **Campaign Contract**：目标、地区、渠道、资产、奖励、CTA、归因、结算、审批和 Kill Switch 的版本化生产事实源。
- **PlayableConfig**：由获批 Contract 约束、可被确定性构建的版本化配置。
- **Release**：某个不可变 Build 在指定地区、渠道、KOL 和流量范围内的发布记录。

### 2.2 能力状态

| 状态 | 定义 |
| --- | --- |
| `UI` | 只有界面或静态入口 |
| `DEMO` | 本地模拟可演示，不代表真实外部结果 |
| `LOCAL` | 本地对象与规则闭环，但只在单机 / 单进程内成立 |
| `INTEGRATED` | 客户端、服务端和获批 Provider 已接通测试环境 |
| `EXTERNAL` | 依赖外部主体、许可、Provider 或渠道审批 |
| `PROD` | 生产发布、监控、审计、回滚与运营负责人均已生效 |
| `BLOCKED` | 合同、合规、权限、安全或外部依赖未满足，必须阻止继续 |

迁移期间不得把 `DEMO`、`LOCAL` 或测试通过描述为 `PROD`。

---

## 3. 当前基线与证据

### 3.1 已验证的当前事实

| 领域 | 当前事实 | 状态 | 本地证据 |
| --- | --- | --- | --- |
| 移动外壳 | iOS 为 SwiftUI/WKWebView Demo Wrapper；Android 为内嵌 `public/` 的 Demo APK；两者均不携带 Node 后端 | `DEMO` | `ios-demo/README.md`、`android-demo/README.md` |
| 移动数据源 | `frontendDemoMode = true`；Repository 为 `local-only` 且返回 `server_called:false` | `LOCAL` | `public/index.html`、`public/mobile-local-business-v1.js` |
| 服务端 | Node 22 ESM、原生 `http.createServer`、默认 `127.0.0.1:8082` | `LOCAL` | `server.mjs`、`package.json` |
| 数据库 | `node:sqlite` / `DatabaseSync`；单文件中内联建表与迁移；静态发现 69 张表 | `LOCAL` | `src/db.mjs` |
| 服务端组织 | `src/app.mjs` 约 2,741 行，路由、鉴权、业务编排集中在单模块 | `LOCAL` | `src/app.mjs` |
| AI | 默认本地结构化生成；配置 API Key 后可调用 OpenAI Responses / Moderation Adapter | `LOCAL` / `EXTERNAL` | `src/ai.mjs` |
| 领域能力 | 账号、资产、Campaign、内容、Artifact、运行事件、归因、三账本、风控、治理等对象已存在 | `LOCAL` | `src/db.mjs`、`README.md` |
| 前端资产 | `public/` 当前约 227 MB，包含 3 个大于 10 MB 的 HeyGen 视频 | `LOCAL` | 本轮 `du` / `find` 静态检查 |
| 自动化 | 静态发现 27 个 Node 测试文件；本 PRD 生成过程未重新运行全量测试 | `LOCAL` | `test/*.test.mjs` |
| 生产基础设施 | PostgreSQL、分布式队列、多实例、对象存储/CDN、密钥、可观测、备份、容量测试明确延后 | 未完成 | `README.md` |

### 3.2 可复用资产

迁移不应丢弃以下已有成果：

- 38 个 H5 游戏及运行容器、成功/失败/重试/暂停等交互状态。
- P0 快速创作、P1 Campaign、P2 本地商业演示状态机。
- Brief、Contract、Asset Manifest、内容版本、Artifact、发布与回滚领域模型。
- 运行事件顺序校验、风险控制、AIP / AIT / Payment 分账规则。
- 本地治理、举报、申诉、下架和 Kill Switch 流程。
- 大量自动化测试、演示数据和设计基线。

生产化重点是把这些规则迁移到服务端权威对象和真实移动端，而不是重新发明产品。

---

## 4. 生产化差距矩阵

| ID | 领域 | 当前 | 生产目标 | 核心差距 | 优先级 |
| --- | --- | --- | --- | --- | --- |
| GAP-01 | 移动架构 | 内嵌 Web Demo Wrapper | Flutter 原生外壳 + 受控 H5 Runtime | 无统一 API、原生导航、支付、推送、深链、商店配置 | P0 |
| GAP-02 | API | 原生 Node HTTP，单模块 | TypeScript 模块化单体 + OpenAPI | 路由/领域/鉴权耦合，缺契约与版本治理 | P0 |
| GAP-03 | 数据库 | SQLite 单文件 | Managed PostgreSQL + 版本化 migration | 并发、多实例、备份、恢复、审计与迁移工具不足 | P0 |
| GAP-04 | 异步任务 | 单进程 Worker / 租约 | Redis + BullMQ（或等价托管队列）+ 独立 Worker | 重启、重复执行、多实例抢占、死信和重放能力不足 | P0 |
| GAP-05 | Artifact / 资产 | 本地静态文件，APP 包体大 | S3 兼容对象存储 + CDN + 签名 URL | 无 checksum、授权生命周期、病毒扫描、按需下载 | P0 |
| GAP-06 | 身份与会话 | 本地适配器 / Cookie | OIDC/OAuth PKCE、设备会话、Keychain/Keystore | Apple 登录、真实邮件、刷新令牌、MFA/设备撤销未接 | P0 |
| GAP-07 | 权限 | 部分 role / 本地状态 | 服务端 RBAC + Campaign entitlement | 视角、KYC、订阅不能成为商业授权；需资源级校验 | P0 |
| GAP-08 | Campaign 权威链 | 本地/服务端对象并存 | Contract 绑定全部生产对象 | 生成、资产、构建、发布、事件、归因、结算需统一版本链 | P0 |
| GAP-09 | 生成与构建 | 本地生成、单机 Artifact | 队列化生成、确定性 Builder、隔离构建 | 无资源配额、沙箱、签名、制品登记、跨实例恢复 | P0 |
| GAP-10 | UGC / Creator Content | 本地举报与审核演示 | 服务端审核队列、过滤、举报、屏蔽、申诉、SLA | 商店要求的及时处置、年龄限制和联系入口未生产化 | P0 |
| GAP-11 | Runtime / Event | 本地记录或单机 API | 事件入口、去重、顺序、同意、反作弊、数据仓 | 缺生产数据质量、回放、延迟事件与外部确认 | P0 |
| GAP-12 | 支付与订阅 | 本地套餐 / AIP 展示 | StoreKit 2 + Play Billing + 服务端收据验证 | 数字商品不能用自有支付；恢复购买和退款未闭环 | P0 |
| GAP-13 | AIP / AIT / 结算 | 中心化规则已建、本地运行 | 三账本、审批、证据与财务对账 | 需避免购买积分与可过期行为积分混账；真实付款需独立 | P0 |
| GAP-14 | KYC / 钱包 | 本地状态和地址采集 | 外部 KYC + 状态回调；可选收款地址绑定 | 不得收集原始证件/私钥；法域与主体资格未确认 | P0 |
| GAP-15 | 连接器 | 前端状态模拟 | OAuth、Token Vault、渠道独立发布与回调 | 授权、部分失败、撤权、重试、审计均未接 | P1 |
| GAP-16 | 通知与私信 | 本地持久化 | Push + 站内信 + WebSocket/SSE | 多设备一致、重试、撤回、举报、反滥用未生产化 | P1 |
| GAP-17 | 可观测 | 本地日志 / 测试 | Metrics、Logs、Trace、Crash、告警、成本归因 | 无生产 SLO、事件关联 ID、值班和事故流程 | P0 |
| GAP-18 | 安全 | 开发环境保护 | WAF、限流、密钥管理、Attestation、安全扫描 | 缺威胁模型、依赖/SAST/DAST、入侵与滥用治理 | P0 |
| GAP-19 | 数据治理 | 本地导出/删除演示 | 数据地图、同意、留存、导出、删除、审计 | 需第三方 SDK 清单、跨境/地区和删除 SLA | P0 |
| GAP-20 | 商店交付 | Debug / Personal Team Demo | Release signing、商店资料、审核账号、灰度 | 正式 App ID、组织账号、隐私标签、年龄分级未完成 | P0 |

---

## 5. 首发范围

### 5.1 V1 必须上线

#### 玩家侧

- 注册 / 登录 / 账号删除 / 数据导出。
- 首页、发现、搜索、个人主页。
- Agentic Playable 加载、试玩、暂停、失败、成功、重试、退出。
- 点赞、评论、收藏、关注、分享、举报、屏蔽和体验记录。
- 站内通知与关键 Push。
- 年龄声明 / 限制、地区和网络 Fail Closed。

#### KOL 侧

- 创作者资格申请、KYC 状态、平台审核和申诉。
- 快速创作：描述 → 问答 → Power → Review → 生成 → 预览 → 人工审核 → APP 发布。
- Campaign 创作：Brief → Contract → Asset Manifest → 锁定字段 → 审核 → 版本 → 发布 / 暂停 / 回滚。
- 草稿、版本、审核意见、定时发布、下架和 Kill Switch 状态。
- 仅在服务端 entitlement 允许时开放 Campaign、渠道、归因和结算能力。

#### 品牌与平台运营

- 品牌组织审核、Campaign Contract 审核和版本变更。
- Asset 授权、到期、撤销和未授权阻断。
- 内容审核、举报、申诉、下架、恢复和 Kill Switch。
- Runtime 事件、归因报告、AIT entitlement、Payment settlement 分账与人工复核。
- 审计日志、证据导出、发布范围、灰度和回滚。

### 5.2 V1 主动延期

- 真实链上奖励、托管钱包、交易、兑换、质押或提现。
- 玩家在 APP 内获得或购买可交易 Token。
- 自动外部分发与自动投放；连接器首发仅可做受控 Beta。
- 跨地区复杂金融 Campaign。
- 运行时模型直接生成生产代码。
- 多活、跨云和微服务拆分。

### 5.3 经济模型首发原则

1. AIP 继续作为不可提现、不可转让、不可交易的站内行为积分。
2. 首发不直接销售 AIP；订阅和数字能力使用 App Store / Google Play 的商店支付。
3. 若未来销售 Credits，必须建立独立“已购买且不可过期”的 Credits 账本，不与可过期的行为 AIP 混账。
4. AIT 是 Campaign 绑定、不可自由转让的权益 / 收益凭证，不是公开流通 Token。
5. 真实现金或 USDT 付款必须写入独立 Payment Settlement，并具备合同、KYC、地区、审批和凭证；不得在 APP 内描述为 AIT 直接提现。

---

## 6. 目标架构

```text
Flutter iOS / Android App                  Web Workspace
        |                                       |
        +--------- HTTPS / OpenAPI -------------+
                          |
                    API / BFF Edge
                          |
       +------------------+------------------+
       |                  |                  |
 Identity & Entitlement  Campaign/Content   UGC/Governance
       |                  |                  |
       +------------------+------------------+
                          |
                PostgreSQL + Redis
                          |
             Queue -> Generation / Build Workers
                          |
              Object Storage -> CDN Artifacts
                          |
       Runtime Event API -> Event Store / Warehouse
                          |
 Provider Adapters: Email / Apple / Google / KYC / Billing
                    Push / Connector / Confirmed Conversion
                          |
             Audit / Metrics / Logs / Trace / Alert
```

### 6.1 移动端

推荐 Flutter，负责：

- 原生启动、登录、导航、深链、Push、支付、权限、安全存储和无障碍。
- Feed、搜索、个人主页、创作者中心、审核与设置等产品 UI。
- H5 Agentic Playable 通过受控 WebView Runtime 加载，不把整站作为唯一 App 内容。
- WebView 只暴露版本化 Bridge allowlist；每个 Playable 的相机、麦克风、运动、钱包和通知权限逐次征得用户同意。
- 每个 Playable 具有稳定 Universal Link / App Link、软件索引、年龄元数据和举报入口。

### 6.2 服务端

推荐 TypeScript 模块化单体，首期模块：

- `identity`：账户、登录身份、设备会话、删除和导出。
- `creator-entitlement`：KOL 审核、KYC 状态、角色与资源级权限。
- `campaign`：Brief、Contract、签署、变更单和审批。
- `asset`：上传、授权、扫描、Manifest、到期和撤销。
- `creation`：Power、Agent Task、Review、Patch、Version。
- `builder`：PlayableConfig、确定性 Build、Artifact、checksum。
- `release`：审核、灰度、发布、暂停、回滚、Kill Switch。
- `runtime`：Session、Event、Consent、Fraud、Experiment。
- `social`：互动、关系、评论、私信、通知。
- `governance`：举报、申诉、下架、审计和 SLA。
- `economy`：AIP、AIT、Benefit、Subscription、Payment Settlement。
- `attribution`：Link、Click、Confirmed Event、归因与对账。

模块间先用明确接口和同库事务，不在首期引入分布式事务。

### 6.3 生产真相链

```text
Brief -> Contract -> PlayableConfig -> Asset Manifest
-> Build Manifest -> Artifact -> Review -> Release
-> Runtime Session -> Event -> Confirmed Success
-> Attribution -> AIT Entitlement -> Payment Settlement
```

每个下游对象必须保存上游 ID、版本和 checksum；锁定字段变化必须创建 Contract 变更单并使后续审核失效。

---

## 7. 核心功能需求

### 7.1 身份、角色与权限

| ID | 需求 | 验收 |
| --- | --- | --- |
| PROD-ID-001 | 支持邮箱、Apple、Google 登录；移动端使用 OAuth/OIDC + PKCE | Google 登录存在时 iOS 提供等价的隐私保护登录选项；Token 仅存 Keychain/Keystore |
| PROD-ID-002 | 钱包签名只作为登录 / 地址绑定证据，不自动授予商业权限 | nonce 单次、短时、域绑定；零地址/烧毁地址拦截；不收集私钥/助记词 |
| PROD-ID-003 | 一个账户保留玩家身份，可叠加 KOL 资格 | `view_role` 只影响展示，不改变服务端权限 |
| PROD-ID-004 | `kol_active` 由账户、创作者审核、KYC 有效和地区允许共同决定 | 任一条件失效，停止新 Campaign / 外发 / 结算，但保留玩家权利和历史 |
| PROD-ID-005 | 商业动作必须校验 Campaign-specific entitlement | `kol_active AND campaign_eligible AND contract_accepted AND entitlement_granted`，绑定具体 Campaign / Playable / Version / Channel |
| PROD-ID-006 | 支持设备会话查看、撤销、刷新令牌轮换和异常登录通知 | 被撤销设备下一次请求失败；所有撤销写审计 |

### 7.2 Campaign、创作与发布

| ID | 需求 | 验收 |
| --- | --- | --- |
| PROD-CMP-001 | 自然语言需求先规范化为版本化 Brief | 未知值保留为待录入，不伪造品牌、授权、预算或结果 |
| PROD-CMP-002 | 生产生成前必须存在获批 Contract | Contract 未批准、有占位或已过期时返回 `BLOCKED` |
| PROD-CMP-003 | 锁定字段不可被 KOL、Agent、模板或运行时修改 | 预算、奖励、CTA、地区、合规、数据、归因、结算、审批、Kill Switch 均为服务端门禁 |
| PROD-CMP-004 | KOL 只提交结构化 Creative Patch | Patch 有 base version、diff、校验、审核与审计，不接受任意生产代码 |
| PROD-CRE-001 | Generation Task 异步、幂等、可取消、可恢复 | 同一 idempotency key 不产生多个版本；APP 重启可继续观察任务 |
| PROD-CRE-002 | Builder 使用批准模板、Config、Asset 和语言包确定性构建 | 输出 Build ID、输入版本、checksum、验证报告和可重现日志 |
| PROD-CRE-003 | Preview 支持真实交互、成功/失败/重试/退出、设备尺寸和反馈 | 预览不等于审核或发布；修改锁定字段会重置审核 |
| PROD-REL-001 | 发布前经过内容、品牌、玩法、数据、隐私、无障碍和合规审核 | 审核记录包含版本、checksum、范围、到期、证据和责任人 |
| PROD-REL-002 | Release 不可变，支持灰度、暂停、下架、回滚和 Kill Switch | 每次 Release 指向 previous stable build；切换后保留失败记录 |
| PROD-REL-003 | 服务端未确认时禁止显示“全网发布成功” | 测试环境显示明确环境；生产发布以 Release 记录为准 |

### 7.3 Runtime、社交与治理

| ID | 需求 | 验收 |
| --- | --- | --- |
| PROD-RUN-001 | 运行事件使用统一 envelope | 至少包含 event/campaign/contract/playable/config/build/creative/channel/KOL/link/session/consent/locale/region/device/experiment ID |
| PROD-RUN-002 | 服务端校验状态顺序、幂等、速率、同意和地区 | 乱序、重复、过速、未同意或禁区事件被拒绝并可审计 |
| PROD-RUN-003 | CTA 点击与 confirmed conversion 分开 | `kyc_complete`、购买等只接受获批外部系统签名回调 |
| PROD-RUN-004 | H5 Runtime 提供加载失败、离线、暂停、重试和安全降级 | Analytics / Asset / Reward / CTA Provider 失败不阻塞安全退出 |
| PROD-UGC-001 | 发布内容经过自动过滤 + 人工复核 | 风险内容不可直接公开；模型结论不等于人工批准 |
| PROD-UGC-002 | 用户可举报内容、屏蔽用户、申诉并联系平台 | 每个入口可达；有处理状态、SLA、通知和审计 |
| PROD-UGC-003 | Creator Content 具有年龄标签和限制 | 超出 App 年龄分级的作品默认不可向未成年人展示 |
| PROD-UGC-004 | 评论、私信与分享具备反滥用控制 | 限流、重复/垃圾检测、撤回、屏蔽和证据保留生效 |

### 7.4 经济、归因与外部确认

| ID | 需求 | 验收 |
| --- | --- | --- |
| PROD-ECO-001 | AIP、AIT、Payment Settlement 为三个独立账本 | 无平台固定汇率；跨账本变化必须有业务对象和审计证据 |
| PROD-ECO-002 | 订阅和 APP 内数字能力走商店支付 | iOS / Android 支持购买、服务端收据验证、恢复购买、退款/撤销和跨设备权益 |
| PROD-ECO-003 | KOL 真实付款独立于 APP 内数字商品 | 付款需要 Contract、归因、KYC、地区、审批和支付凭证；不伪造链上状态 |
| PROD-ATT-001 | 每个 KOL/渠道生成可撤销专属 Link | 保存 campaign/creative/channel/KOL/link/click ID，地区和窗口门禁生效 |
| PROD-ATT-002 | 外部成功事件签名、去重、延迟与冲正 | 客户端点击不能触发结算；退款/撤销可反向调整归因和结算 |
| PROD-ATT-003 | 归因、玩家权利和品牌结算分账 | 每条结果可追溯原始事件、规则版本和人工批准 |

### 7.5 平台、数据与运维

| ID | 需求 | 验收 |
| --- | --- | --- |
| PROD-OPS-001 | Dev / Staging / Prod 隔离 | 数据、密钥、域名、Bucket、队列、支付商品和回调不可混用 |
| PROD-OPS-002 | 所有写接口支持幂等和审计 | 重试不产生重复账号、发布、事件、积分或结算 |
| PROD-OPS-003 | 可观测链贯穿 App、API、Worker、Build 和 Provider | 使用 trace/request/task/build/release/event ID 关联；告警有负责人 |
| PROD-OPS-004 | 具备备份、恢复和灾难演练 | PostgreSQL PITR；对象存储版本化；恢复演练有 RPO/RTO 证据 |
| PROD-OPS-005 | 隐私和数据主体权利生产化 | APP 内删除入口、Web 删除入口、导出、留存和删除审计可验证 |
| PROD-OPS-006 | Production Build 禁用 Demo 事实源 | 编译时检查阻止 `frontendDemoMode=true`、Demo Provider 和测试密钥进入生产 |

---

## 8. 数据迁移方案

### 8.1 迁移原则

- 不直接把本机 SQLite / localStorage 全量上传为生产数据。
- 所有迁移对象必须有稳定 ID、来源、所有权、授权、版本、checksum 和数据分类。
- Demo 数据、测试余额、模拟 KYC、模拟结算和本地认证会话不得进入生产。
- 迁移脚本可重复运行，使用 idempotency key，并输出逐表计数、checksum、失败清单和回滚点。
- 切换前至少完成一次脱敏 Dry Run 和一次 Staging 全量演练。

### 8.2 数据分类

| 分类 | 示例 | 迁移策略 |
| --- | --- | --- |
| 可直接迁移 | 获批模板、游戏分类、Power 目录、公开规则、正式法律文本 | 校验版本与 checksum 后导入 |
| 条件迁移 | 创作者作品、素材、Campaign、Contract、版本历史 | 需所有权、授权、隐私同意、合同和人工复核 |
| 仅统计迁移 | 合法且脱敏的产品使用统计 | 只迁移聚合结果，不迁移原始本地身份 |
| 禁止迁移 | Demo 用户、localStorage 会话、模拟验证码、模拟 KYC、测试 AIP/AIT/付款、演示审计 | 丢弃或保留在隔离归档，不进入 Prod |

### 8.3 SQLite → PostgreSQL 步骤

1. 固化当前 schema 和 ID 规则，生成字段映射、枚举映射和数据字典。
2. 将内联 `CREATE TABLE` 拆为版本化 migration，并为生产约束补充外键、唯一键和索引。
3. 建立 Repository contract tests，保证 SQLite Adapter 与 PostgreSQL Adapter 的业务语义一致。
4. 导出脱敏快照，校验行数、主键、外键、金额、时间、状态机和 checksum。
5. Staging 导入，运行全量 API / 状态机 / 账本 / 回滚测试。
6. 客户端分域切换 API：先只读，再写入；禁止同一对象出现两个权威写源。
7. 若必须短期双写，以 Outbox 和对账任务实现；不在客户端双写。
8. 生产切换前冻结旧写入口，执行最终增量、对账和批准。
9. 切换后旧 SQLite 只读保留一个审计周期；达到删除条件后安全销毁。

### 8.4 必须新增的生产约束

- 所有生产对象使用稳定 UUID / ULID，不使用显示名称作为关联键。
- Contract、Config、Build、Release、Event、Attribution、Settlement 保存版本与关联 ID。
- 金额使用 Decimal / 最小货币单位，不使用浮点数。
- 每个账本事件不可变；更正使用反向事件，不直接覆盖余额。
- 外部回调保存 Provider event ID、签名校验结果、接收时间和去重状态。
- PII、认证、KYC 状态、行为事件和结算证据按数据域隔离并设置留存策略。

---

## 9. 移动端迁移方案

### 9.1 推荐结构

```text
Flutter App
├── Native shell: 启动、登录、导航、Push、支付、深链、设置
├── Product UI: Feed、搜索、个人页、创作、审核、Campaign
├── Secure storage: access/refresh token、device key
├── API client: OpenAPI 生成、重试、幂等、错误映射
└── Playable Runtime WebView
    ├── versioned bridge allowlist
    ├── per-playable permission consent
    ├── event/signature adapter
    ├── safe-area / keyboard / back stack
    └── crash / timeout / offline fallback
```

### 9.2 渐进替换顺序

1. Flutter 建立设计 Token、导航、登录和统一状态组件。
2. 接入账号、Feed、作品详情和个人主页 API。
3. 接入受控 WebView Runtime，复用现有 H5 游戏。
4. 接入点赞、评论、收藏、关注、举报和体验记录。
5. 接入 KOL 快速创作与任务恢复。
6. 接入 Campaign、Asset、审核、发布和版本治理。
7. 接入 StoreKit / Play Billing、Push、Universal Link / App Link。
8. 完成真机、弱网、后台、杀进程、升级和数据恢复测试。

### 9.3 WebView 生产门禁

- 只加载允许域名、HTTPS、已登记 Build 和 checksum。
- 禁止任意远程脚本注入、任意导航和未批准的 Native API。
- 每个作品声明所需权限；未授权时提供可玩降级或阻止启动。
- Bridge 消息必须包含 runtime version、origin、session、nonce 和 schema version。
- 一个作品崩溃不得导致主 App 崩溃；退出、举报和 Kill Switch 永远可达。
- 生产 App 不随意下载可改变 App 核心功能的代码；作品作为受控 Creator Content / Mini Game 管理。

---

## 10. AI、生成与构建生产化

### 10.1 标准链路

```text
Natural Language
-> Brief Agent
-> Campaign Contract / Quick Creation Intent
-> Strategy + Power recommendation
-> PlayableConfig + Asset Manifest
-> Generation Patch
-> Schema / Policy / Contract Validation
-> Deterministic Builder
-> Preview
-> Human Review
-> QA
-> Release
```

### 10.2 Agent 权限

| 字段类型 | 示例 | 控制 |
| --- | --- | --- |
| Locked | 主体、地区、年龄、预算、奖励、CTA、声明、数据、归因、结算、审批、Kill Switch | Contract + 人工批准，Agent 不可改 |
| Editable | 标题、获批语气、获批资产、非关键布局、允许模板 | Schema / Rule 校验 + 预览审核 |
| Agentic | 获批文案变体、视觉变体、界内难度、允许 CTA 时机 | Allowlist + 边界 + 实验 + Telemetry + 回滚 |
| Runtime | Session、Locale、Device、Consent、Region Bucket、Experiment | 系统提供，不由模型伪造 |

### 10.3 生成任务要求

- 状态：`queued -> planning -> preparing_assets -> generating -> validating -> building_preview -> preview_ready`。
- 异常：`paused / failed / cancelled / offline_waiting / permission_blocked`。
- 进度来自真实 Stage，不使用纯计时伪进度。
- 每个任务记录模型、Prompt/Context 版本、输入 checksum、输出 Patch、Validator、成本、批准和 Build。
- Provider 超时可回退已批准模板；合规、合同、权限、地区和奖励失败不能降级绕过。
- 生成运行在隔离 Worker；资源配额、超时、并发、输出大小和依赖均受控。

---

## 11. 安全、隐私与合规

### 11.1 安全基线

- TLS、HSTS、WAF、速率限制、Bot/Fraud 防护。
- 密钥进入 Secret Manager，不进入仓库、客户端 Bundle、日志或 Artifact。
- Access Token 短时，Refresh Token 轮换，设备会话可撤销。
- 敏感管理操作要求 MFA、最小权限和双人复核。
- API 资源级鉴权，不能只判断 UI role。
- 写操作使用幂等键；Webhook 使用签名、时间窗、防重放和 Provider event ID。
- CI 执行依赖扫描、Secret Scan、SAST；Staging 执行 DAST 和权限测试。
- iOS 接入 App Attest / DeviceCheck，Android 接入 Play Integrity，结果用于风险判断而非唯一身份依据。
- 审计日志追加写、限制访问、可导出并保留完整时间与主体信息。

### 11.2 隐私基线

- 建立数据地图：字段、目的、法理基础、来源、共享方、地区、留存、删除和负责人。
- APP 内和商店元数据提供可访问的隐私政策。
- 收集前提供用途说明和必要同意；拒绝同意不上传禁止数据。
- 用户可在 APP 内请求删除，并能在 Web 外部入口发起删除。
- 第三方 SDK / Provider 建立清单、DPA、权限、数据流和关闭开关。
- 不在事件中写姓名、邮箱、手机号、助记词、私钥、原始 KYC、Token 或目的地 Secret。
- KYC 由批准 Provider 处理；Airvana 只保存状态、Provider reference、时间、地区和审计。

### 11.3 Web3 / 受监管边界

任何涉及钱包、KYC、加密资产、交易、奖励或结算的功能，必须按以下维度审查：

```text
具体法律实体 x 监管机构 x 牌照
x 推广的服务/活动 x 目标地区 x 推广方式
```

品牌名称、集团牌照、公开网页或历史 Campaign 不等于当前功能获批。

---

## 12. 应用市场发布要求

### 12.1 Apple App Store

首发前必须满足：

- Creator Content / UGC：过滤、举报、及时处理、屏蔽、联系信息和年龄限制。
- HTML5 / JS Mini Games：每个作品纳入软件索引，提供 Universal Link；逐作品授权隐私权限；遵守支付和年龄规则。
- 数字能力、订阅、游戏币、站内 Boost 等按适用规则使用 In-App Purchase；不使用钱包或加密货币绕过解锁。
- 使用 Google 等第三方登录时，提供符合 4.8 的等价隐私保护登录选项。
- 钱包能力如保留，开发者账号主体与目标地区资格需单独确认；首发推荐只保留“签名登录 / 收款地址绑定”，不提供托管、兑换或交易。
- 隐私政策在 App 内和 App Store Connect 均可访问；账号可删除。
- 审核期间后端可访问，提供完整 Demo Account / 审核模式和非显而易见功能说明。

### 12.2 Google Play

首发前必须满足：

- 数字功能、订阅和站内数字商品使用 Google Play Billing（适用例外需单独法务确认）。
- UGC 具备持续审核、举报、屏蔽和处置机制。
- 支持账号创建时，同时提供 APP 内和有效 Web 入口的账号删除路径。
- Data Safety 与真实 SDK、数据收集、共享、留存和删除行为一致。
- App 必须提供独特、有效的移动功能；不能只是低价值 WebView 包装。
- 如展示或销售 Tokenized Digital Assets，必须完成 Blockchain-based Content 声明与适用限制；V1 推荐不启用该能力。

### 12.3 商店交付物

- 正式组织开发者账号、唯一 Bundle ID / Application ID、Release Signing Key。
- App 名称、图标、启动图、截图、预览视频、描述、关键词、支持 URL、营销 URL。
- 年龄分级、内容标签、隐私标签 / Data Safety、出口合规和地区列表。
- IAP / Subscription 商品、权益、价格、恢复购买和审核截图。
- Review Notes、测试账号、角色账号、示例 Campaign、示例 QR / Deep Link。
- 版本隐私政策、服务协议、社区规范、版权 / 申诉政策、客服入口。

---

## 13. 事件、指标与归因

### 13.1 统一事件信封

每个允许事件至少包含：

```text
event_id, event_name, event_time,
campaign_id, contract_version,
playable_id, playable_config_version, build_id,
creative_id, channel_id, kol_id, link_id,
session_id, privacy_safe_user_id,
locale, region, device_class, consent_state,
experiment_id, variant_id, properties
```

### 13.2 首发事件字典

`impression`、`play_start`、`valid_interaction`、`level_start`、`level_complete`、`play_complete`、`play_fail`、`replay`、`share_intent`、`share_confirmed`、`cta_view`、`cta_click`、`consent_granted`、`error`。

下游事件 `registration_complete`、`kyc_complete`、`coupon_claim`、`purchase`、`reward_claim` 只能由获批服务端来源确认。

### 13.3 建议生产指标（待批准）

| 指标 | 建议门槛 | 说明 |
| --- | --- | --- |
| API 可用性 | 月度 99.9% | 工作目标，不是当前承诺 |
| 普通读 API P95 | <= 500 ms | 不含生成和大文件 |
| 普通写 API P95 | <= 800 ms | 不含异步任务 |
| Playable 首次可交互 | 标准 4G / 代表机型 <= 3 s | 记录设备、网络和缓存状态 |
| Crash-free sessions | >= 99.5% | iOS / Android 分开统计 |
| 事件重复 / 丢失 | 有可量化阈值与自动对账 | 阈值在 M0 确认 |
| Kill Switch 生效 | P95 <= 60 s | 覆盖 App 与 CDN 缓存 |
| P0 安全 / 结算事故 | 0 | 触发立即暂停与复盘 |

这些是迁移验收建议，批准后才成为正式 SLO。

---

## 14. 测试与验收策略

### 14.1 自动化层级

1. **Unit**：状态机、锁定字段、额度、归因、结算、风控。
2. **Contract**：OpenAPI、Repository Adapter、Provider webhook、WebView Bridge。
3. **Integration**：PostgreSQL、Redis、Queue、Object Storage、Billing Sandbox、Push Sandbox。
4. **E2E**：玩家、KOL、品牌、审核员和管理员主链。
5. **Mobile**：iOS / Android 真机、前后台、杀进程、升级、权限、键盘、安全区、返回、深链。
6. **Runtime**：360x800、390x844、430x932 及目标 WebView；成功/失败/重试/CTA/举报/退出。
7. **Failure**：离线、弱网、超时、重复提交、队列重放、Provider 重复回调、资产失败、库存耗尽。
8. **Security**：越权、IDOR、重放、伪造 webhook、上传攻击、XSS、Bridge 注入、依赖和密钥扫描。
9. **Performance**：API、Event、Feed、CDN、Builder 并发和容量测试。
10. **Visual / Accessibility**：固定视口截图、动态字体、对比度、读屏、Reduced Motion、非颜色反馈。

### 14.2 核心闭环验收

#### 玩家链

```text
登录 -> Feed -> 打开 Playable -> 同意 -> 试玩
-> 成功/失败 -> 重试 -> 点赞/评论/收藏/分享
-> 体验记录 -> 换设备状态一致 -> 举报/屏蔽可达
```

#### 快速创作链

```text
描述 -> 问答 -> Power -> Review -> 异步生成
-> 退出/恢复 -> Preview -> 人工审核
-> 发布 -> Feed/个人主页一致 -> 暂停/回滚
```

#### Campaign 商业链

```text
Brief -> Contract -> 审批 -> KOL entitlement
-> Asset Manifest -> 生成/构建 -> 审核/Release
-> KOL Link -> Runtime Events -> Confirmed Success
-> Attribution -> AIT Entitlement -> Payment Settlement 复核
```

#### 治理链

```text
举报 -> 受理 -> 下架 -> 申诉 -> 恢复
Kill Switch -> App 与 CDN 停止新会话 -> 证据保留 -> 回滚
```

### 14.3 上线阻断条件

任一条件成立即阻断发布：

- Production Build 仍启用 Demo Provider / Demo 数据源。
- Contract 不获批、锁定字段不一致或审核过期。
- 数字商品绕过商店支付。
- 账号删除、举报、屏蔽、年龄限制或隐私政策不可达。
- 客户端可伪造 confirmed conversion、奖励或结算。
- 无上一稳定版本、Kill Switch 或明确负责人。
- 关键 API / Event / Billing / KYC / Push Provider 无监控与失败降级。
- 存在 P0 安全漏洞、崩溃、账本不平或数据删除失败。

---

## 15. 发布、灰度与回滚

每次 Release Manifest 至少包含：

```yaml
campaign_id: "..."
contract_version: "..."
playable_id: "..."
playable_config_version: "..."
build_id: "..."
artifact_checksum: "..."
environment: "staging|production"
release_scope: "regions/channels/KOLs/traffic percentage"
approved_by: []
approval_evidence: []
released_by: "..."
released_at: "..."
previous_stable_build_id: "..."
rollback_target: "..."
kill_switch_owner: "..."
monitoring_window: "..."
rollback_triggers: []
```

发布顺序：

```text
Internal Preview
-> Staging QA
-> TestFlight / Play Internal Testing
-> 1% approved traffic
-> 10%
-> 50%
-> 100% approved scope
```

发生错误声明、错误奖励、错误 CTA、地区越界、严重事件缺失、账本异常、隐私/安全事故或主要护栏恶化时，立即暂停或切换上一稳定 Build；失败 Release 和原始日志不得删除。

---

## 16. 迁移批次与里程碑

为避免与现有产品 P0 / P1 / P2 混淆，生产迁移使用 `M0–M5`。

### M0｜范围、主体与合规冻结（1–2 周）

交付：

- 首发法律实体、地区、年龄分级、App 类别和商店账号确认。
- V1 功能清单与延期清单批准。
- 支付、AIP/AIT、KYC、钱包、连接器边界批准。
- 数据地图、Provider 清单、商店政策矩阵。
- 目标架构 ADR、OpenAPI 规则、ID / 幂等 / 审计规范。

退出标准：所有 P0 业务决策有 Owner、Decision、Deadline；无法确认项明确 `BLOCKED`。

### M1｜生产基础设施（3–5 周）

交付：

- Dev / Staging / Prod 环境。
- Managed PostgreSQL、Redis / Queue、Object Storage / CDN。
- CI/CD、Secret Manager、日志/指标/Trace、告警、备份/PITR。
- TypeScript API 骨架、OpenAPI、统一错误、鉴权、审计和幂等中间件。

退出标准：多实例 API 与 Worker 可部署；备份恢复、队列重试和死信演练通过。

### M2｜领域 API 与数据迁移（4–6 周，可与 M1 后半并行）

交付：

- Identity / Entitlement / Campaign / Content / Asset / Release / Runtime / Governance / Economy 模块。
- PostgreSQL migration、Repository Adapter 和导入/对账工具。
- Contract 生产真相链、服务端资源级权限和锁定字段门禁。
- Event、Link、Confirmed Event、Attribution 与三账本。

退出标准：Staging 完成三条主链；Demo 数据不能进入 Prod；账本、ID 和审计对账为零差异。

### M3｜Flutter App 与外部 Provider（4–6 周，可与 M2 并行）

交付：

- Flutter 原生外壳、登录、导航、Feed、个人主页、创作与设置。
- 受控 WebView Runtime、Bridge、Deep Link、Push。
- Apple / Google / Email、StoreKit / Play Billing、KYC Sandbox。
- UGC 举报/屏蔽、账号删除、隐私和年龄限制。

退出标准：iOS / Android 真机完成玩家、快速创作、Campaign 和治理闭环；杀进程/换设备可恢复。

### M4｜安全、质量与 Beta（3–4 周）

交付：

- 全量自动化、视觉回归、无障碍、性能、容量和安全测试。
- TestFlight / Play Internal Testing；真实网络和代表机型。
- 运营手册、告警、值班、审核 SLA、事故、暂停和回滚演练。

退出标准：所有 P0 问题关闭；Store Review 账号和全功能审核环境可用。

### M5｜商店提交与灰度（1–2 周，不含商店不可控审核等待）

交付：

- 商店元数据、截图、隐私/Data Safety、年龄分级、IAP 商品和 Review Notes。
- 组织签名、Release Build、地区和分阶段发布计划。
- 审核反馈处理、1% → 10% → 50% → 100% 灰度。

退出标准：首发地区生产运行，监控、客服、审核、Kill Switch 和回滚负责人在岗。

### 16.1 总体工期建议

- 3–4 名工程师 + 设计 / QA / 合规支持，并行执行：约 **12–18 周**。
- 1 名工程师配合 Codex、设计和外部合规：约 **4–6 个月**。
- 商店审核、法律主体、KYC / 支付 / 渠道 Provider 审批属于外部时间，不计入纯开发工期。

---

## 17. 团队与责任

| 角色 | 建议投入 | 责任 |
| --- | --- | --- |
| Product / Owner | 1 | 范围、决策、验收、外部协调 |
| Backend | 2 | API、DB、Queue、Builder、Event、Economy |
| Flutter | 1–2 | App、WebView Runtime、支付、Push、深链 |
| Web / H5 | 1 | Workspace、游戏 Runtime、性能和 Bridge |
| QA / Automation | 1 | E2E、真机、视觉、性能、商店验收 |
| DevOps / Security | 0.5–1 | 环境、CI/CD、监控、备份、安全 |
| Design | 0.5 | Design System、商店素材、无障碍 |
| Legal / Compliance / Finance | 按阶段 | 主体、地区、UGC、Web3、KYC、支付、结算 |

小团队可角色兼任，但批准、结算和 Kill Switch 不应只由同一开发者单人控制。

---

## 18. 风险登记

| 风险 | 概率 / 影响 | 缓解 |
| --- | --- | --- |
| H5 Creator Content 被视为动态下载软件 | 中 / 高 | 建立作品索引、Universal Link、审核、年龄、权限和受控 Runtime；提前 TestFlight 沟通 |
| Web3 / 钱包导致主体或地区审核升级 | 高 / 高 | V1 限定签名登录/地址绑定；不提供托管、交易、兑换和玩家币奖励 |
| 数字能力支付模型不合规 | 中 / 高 | 订阅/数字权益走 StoreKit / Play Billing；AIP 首发不售卖 |
| Demo 与生产状态混用 | 高 / 高 | 环境隔离、编译门禁、Demo Provider 不打入 Prod、UI 显式来源 |
| 227 MB 前端资产拖慢包体与启动 | 高 / 中 | 视频/游戏按需下载、对象存储/CDN、Manifest 与缓存预算 |
| SQLite 语义迁移产生账本偏差 | 中 / 高 | Repository contract tests、Dry Run、逐表 checksum、账本零差异门禁 |
| 外部 Provider 重复/延迟回调 | 高 / 高 | 签名、幂等、Outbox/Inbox、状态查询、对账、冲正 |
| UGC 审核量超出运营能力 | 中 / 高 | 风险分级、自动过滤、发布限额、人工队列、SLA 与 Kill Switch |
| Flutter 重构导致现有 UI 回归 | 中 / 中 | 分域迁移、黄金截图、Feature Flag、同 ID/状态契约、旧版只读回退 |
| 合规/商店决策晚于开发 | 高 / 高 | M0 冻结主体、地区、支付、KYC、钱包与年龄策略，不确认不进入实现 |

---

## 19. 生产完成标准（Definition of Done）

只有同时满足以下条件，才可标记“Airvana 移动端生产闭环完成”：

1. 所有核心流程从真实入口走到服务端结果。
2. APP 重启、换设备和升级后业务状态仍一致。
3. 页面之间同一对象使用相同 ID、版本和服务端状态。
4. 每一步都有失败、返回、取消、重试或回滚路径。
5. 发布、归因、结算、KYC 和外部分发不制造真实成功假象。
6. 每个关键动作有身份、权限、幂等和审计记录。
7. 弱网、离线、地区、权限、Contract 和 Kill Switch Fail Closed。
8. 数据可导出、删除、恢复；删除在 APP 与 Web 均可发起。
9. iOS、Android 和 Web 使用同一套服务端业务状态机。
10. 数字商品支付、恢复购买、退款和权益对账通过沙箱与真机测试。
11. Creator Content / UGC 的过滤、举报、屏蔽、申诉、年龄限制和客服有效。
12. Release 有审核、范围、Build、checksum、previous stable、监控和 Kill Switch。
13. 生产监控、告警、备份恢复、值班和事故演练有证据。
14. TestFlight / Play Internal Testing 全链通过，商店审核账号和后端可用。
15. 所有首发法律实体、地区、KYC、支付、Web3 和结算边界获得负责人书面批准。

---

## 20. 待确认决策

| ID | 决策 | 推荐 | 不确认的影响 |
| --- | --- | --- | --- |
| DEC-01 | 首发法律实体和开发者组织账号 | 使用正式运营主体，不使用 Personal Team | 无法正式签名和判断钱包/结算资格 |
| DEC-02 | 首发地区 | 先选 1–2 个合规清晰地区 | 隐私、KYC、支付、Web3 和内容规则无法冻结 |
| DEC-03 | App 类别与年龄分级 | Creator Content + Casual Games，非 Kids Category | 商店素材、审核、未成年人策略无法确定 |
| DEC-04 | Flutter 是否作为正式移动架构 | 确认 Flutter；保留 H5 游戏 Runtime | 不确认会阻塞移动工程与设计系统 |
| DEC-05 | V1 钱包范围 | 仅签名登录 / 收款地址绑定；无托管/交易/提现 | 主体和地区审核风险显著上升 |
| DEC-06 | AIP 是否可购买 | V1 不售卖 AIP | 若售卖，需拆 purchased credits 且走商店支付 |
| DEC-07 | 订阅与 Boost 商品 | 订阅走商店支付；Boost 使用 earned AIP | 商品、权益和退款模型无法开发 |
| DEC-08 | KYC Provider | 选有目标地区能力且只回传状态的 Provider | KOL/结算资格无法进入 `INTEGRATED` |
| DEC-09 | 云厂商与主区域 | 选择一种托管栈，先单区域 | DB、对象存储、CDN、队列和数据驻留无法落地 |
| DEC-10 | UGC 审核 SLA 与负责人 | 高风险发布前审；举报分级 SLA | 商店治理无法验收 |
| DEC-11 | 首发创作者 / 品牌队列 | 白名单小规模 Beta | 灰度、支持和审核容量无法估算 |
| DEC-12 | 外部连接器首发范围 | V1 延期；仅保留受控 Beta 接口 | OAuth、渠道审计会扩大首发范围 |

---

## 21. 启动后两周可执行 Backlog

### Week 1｜冻结与架构

- [ ] 确认 DEC-01–DEC-12 Owner 和截止时间。
- [ ] 输出首发范围、地区、年龄、支付、钱包、KYC 一页决策表。
- [ ] 建立 `dev / staging / prod` 环境命名、域名和密钥规范。
- [ ] 完成模块化单体、Flutter、PostgreSQL、Queue、Object Storage ADR。
- [ ] 从当前代码生成领域表清单、API 清单和 Repository 接口清单。
- [ ] 建立 canonical ID、idempotency、error、audit 和 event envelope 规范。
- [ ] 建立商店政策矩阵与每条要求的 Owner / Evidence / Status。
- [ ] 建立数据地图和 Demo / Conditional / Production 数据分类。

### Week 2｜最小生产骨架

- [ ] 创建 TypeScript API 骨架、OpenAPI、统一错误和 `/health/ready`。
- [ ] 创建 PostgreSQL migration 工程与首批 Identity / Session 表。
- [ ] 创建 CI：lint、unit、contract、secret scan、dependency scan、build。
- [ ] 创建 Redis / Queue 与幂等 Job 示例、失败重试和死信测试。
- [ ] 创建 Object Storage Artifact 上传、checksum 和签名读取示例。
- [ ] 创建 Flutter Shell、环境配置、安全存储和登录占位。
- [ ] 创建 WebView Bridge v1 schema、origin allowlist 和拒绝测试。
- [ ] 选定首条贯通切片：`登录 -> Feed -> Playable -> play_start/event -> 体验记录`。

两周结束必须交付可部署的 Staging 骨架和一条真实 API 垂直切片，而不只是架构图。

---

## 22. 政策与项目证据

### 22.1 官方政策（2026-08-27 查阅，提交前必须再次复核）

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
  - 重点：1.2 / 1.2.1 Creator Content，3.1.1 In-App Purchase，3.1.5 Cryptocurrencies，4.7 Mini Apps，4.8 Login Services，5.1 Privacy。
- [Google Play Payments Policy](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en)
- [Google Play Payments FAQ](https://support.google.com/googleplay/android-developer/answer/10281818?hl=en)
- [Google Play UGC Moderation](https://support.google.com/googleplay/android-developer/answer/12923286?hl=en-GB)
- [Google Play User Data Policy](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en)
- [Google Play Account Deletion Requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en)
- [Google Play Blockchain-based Content](https://support.google.com/googleplay/android-developer/answer/13607354?hl=en)
- [Google Play Functionality, Content, and User Experience](https://support.google.com/googleplay/android-developer/answer/9898783?hl=en)
- [Google Play Spam / WebView Policy](https://support.google.com/googleplay/android-developer/answer/9899034?hl=en)

### 22.2 本地项目证据

- `README.md`
- `package.json`
- `server.mjs`
- `src/db.mjs`
- `src/app.mjs`
- `src/ai.mjs`
- `public/index.html`
- `public/mobile-local-business-v1.js`
- `ios-demo/README.md`
- `android-demo/README.md`
- `docs/Airvana-本地闭环审计-v3.1-本地数据口径.md`
- `docs/Airvana-未完成功能闭环审计-v3.0-代码实测版.md`
- `docs/Airvana-营销模块-结构性设计-2026-08-20.md`

---

## 23. 文档批准记录

| 角色 | 姓名 | 决策 | 日期 | 备注 |
| --- | --- | --- | --- | --- |
| Product Owner | 待填写 | 待确认 | — | 首发范围与优先级 |
| Tech Lead | 待填写 | 待确认 | — | 架构、工期与迁移 |
| Mobile Lead | 待填写 | 待确认 | — | Flutter、Runtime 与商店 |
| Security / Privacy | 待填写 | 待确认 | — | 数据、安全和 Provider |
| Legal / Compliance | 待填写 | 待确认 | — | 主体、地区、UGC、Web3、KYC |
| Finance / Operations | 待填写 | 待确认 | — | 支付、结算、对账和 SLA |

本文未获上述责任人批准前，仅用于规划和拆解，不作为生产发布授权。
