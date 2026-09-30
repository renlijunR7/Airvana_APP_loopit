# Airvana 全项目结构化需求清单

> 版本：v3.3
> 更新日期：2026-08-31（实验分支已作用于成品运行时，投放期分桶闭环）
> 取代：`Airvana-全项目结构化需求清单-v1.0`（26 项前端口径）、`Airvana-UI与完整功能闭环结构性需求文档-v2.0`（服务端未接线口径）
> 当前阶段：**本地全栈已接线**——移动端、工作台与本地服务端（Node + SQLite）形成单一权威链路；第三方能力保持边界标注
> 文档定位：唯一开发与验收依据；每项需求带真实状态与验收证据

---

## 0. 事实基线（2026-08-20 实测）

| 维度 | 当前值 | 说明 |
| --- | --- | --- |
| 后端 API 路由 | **125 条** | 全部本地服务，无第三方依赖 |
| 有前端调用者 | **121 / 125** | 未接 4 条全部为已退役 410 路径（通用 AIT 提现链路），无后门 |
| SQLite 表 | **69 张** | 含身份、内容、经济、社交、治理、素材、节点 |
| 移动端接入端点 | **46 个** | 今日之前为 10 个 |
| 桥接方法 | **47 个** | `public/local-api-bridge-v1.js` |
| 自动化测试 | **315 / 315 通过** | 27 个测试文件 |
| 结构校验 | **30 / 30 通过** | `npm run verify`（含法律文本占位符守卫） |
| `public/` 体积 | **127 MB** | 大图已重压（-48.8 MB）；原生包再排除 69 MB HeyGen 样片后约 **58 MB** |

### 状态口径

| 标记 | 含义 | 可作为验收证据 |
| --- | --- | --- |
| **DONE** | 服务端权威 + 前端接线 + 自动化测试 + 实库有真实记录 | 是（本地口径） |
| **PARTIAL** | 服务端已具备，前端仅部分接线或缺状态覆盖 | 否 |
| **LOCAL-ONLY** | 仅本地演示状态机，无服务端对象 | 否 |
| **EXTERNAL** | 依赖第三方凭证/回调，本地保留适配位 | 否，边界标注 |
| **DEFERRED** | 明确延后，不计入当前缺口 | 否 |

---

## 1. 产品基线

Airvana 的核心对象是 **Agentic Playable**。KOL 是其创作者、所有者与运营者。

标准生产链路（当前已在本地全链走通）：

`注册登录 → 创作者资格（申请 → KYC → 审批）→ Campaign Brief → Campaign Contract → 创作与素材 → 生成任务 → 人工审核 → 版本化 Artifact → 发布 → 互动与运行证明 → 归因 → 交付审批 → 结算与复盘`

不可违背的边界：

- AIP 不可提现、不可转让、不可交易；AIT 是中心化 Campaign 权益凭证，无全局兑换率。
- Campaign 的预算、奖励、地区、CTA、归因、结算与 Kill Switch 为锁定字段。
- 玩家与 KOL 的商业边界由服务端资格判定，视角切换不改变权限。
- 第三方结果（真实邮件、OAuth、KYC 服务商、外部发布、链上）未接入时不得伪造成功。

---

## 2. A 组｜身份、账号与资格

| ID | 需求 | 状态 | 服务端对象 | 验收证据 |
| --- | --- | --- | --- | --- |
| A-01 | 品牌启动页与冷启动 | LOCAL-ONLY | — | 启动、跳过、弱网/离线模拟为本地开关；无远程配置与版本服务 |
| A-02 | 邮箱验证码登录 | **DONE** | `login_challenges` | 服务端签发 6 位码、10 分钟有效、一次性、错 5 次锁定；实测新账号注册成功 |
| A-03 | Google 一键登录（本地适配器） | **DONE**（适配器）/ EXTERNAL（真实 OAuth） | `login_identities` | 本地适配器建立真实会话；真实 OAuth 待接入，替换点已留 |
| A-04 | 钱包签名登录 | **DONE** | `auth_challenges` `wallet_bindings` | 一次性 nonce + `personal_sign` + 服务端验签；移动端演示门已解除，服务可用即走真实流程 |
| A-05 | 账号合并（策略 A：主身份 + 绑定） | **DONE** | `login_identities`（provider+identifier 唯一） | 同邮箱始终同账号；Google 携带已验证邮箱自动关联；工作台可绑定邮箱，冲突 409 |
| A-06 | 会话恢复与设备管理 | **DONE** | `sessions` | 刷新自动 resume；移动端设置页列会话并可撤销 |
| A-07 | 创作者资格链 | **DONE** | `creator_applications` `economy_profiles` | `kyc_pending → verify_kyc（需凭证引用）→ under_review → approved`；批准后 profile 变 `active/verified`；移动端收到服务端通知 |
| A-08 | 真实 KYC 服务商 | EXTERNAL | — | 平台只存状态、引用与时间，不存证件原件 |
| A-09 | 账号数据导出与删除 | **DONE** | `account_deletion_requests` | 导出、删除申请、30 天冷静期、取消 |
| A-10 | 协议接受记录 | **DONE** | `terms_acceptances` | 版本化接受记录 |

---

## 3. B 组｜内容消费、社交与发现

| ID | 需求 | 状态 | 服务端对象 | 验收证据 |
| --- | --- | --- | --- | --- |
| B-01 | 首页 Feed 与虚拟化 | **DONE** | — | 仅挂载当前与相邻项（DOM 223 节点、26 个可交互控件） |
| B-02 | 本地完整游戏体验 | **DONE**（本地运行时） | — | 38 款离线游戏，三阶段玩法与重玩闭环 |
| B-03 | 运行证明与 AIP 奖励 | **DONE** | `runtime_sessions` `runtime_events` `point_events` | 有序 `playable_start → step_complete → playable_complete`；乱序/重复拒绝；首完成 5 AIP，24 小时去重；过速自动建风险案 |
| B-04 | 服务端 Artifact 混入 Feed | **DONE** | `contents` `content_artifacts` | Feed 第 3 位为服务端作品卡片，"进入作品"在应用内同源运行容器打开 |
| B-05 | 点赞 / 收藏 / 分享 | **DONE** | `engagement_events` | 服务端幂等（事件键带日期）、设备+IP 频率限制、同内容每日一次、自己内容不计 |
| B-06 | 评论 | **DONE** | `content_comments` | 创建/列表/软删除、仅本人或 admin 删除、每分钟 10 条限制、通知作者 |
| B-07 | 关注关系 | **DONE** | `user_follows` | 幂等、禁止自关注、按内容解析作者、通知被关注方 |
| B-08 | 私信 | **DONE** | `dm_conversations` `dm_messages` | 会话/收发/未读/已读/2 分钟撤回/每分钟 20 条限制/通知 |
| B-09 | 通知中心 | **DONE** | `notifications` | 服务端通知流、未读计数、点击标已读、全部已读 |
| B-10 | 发现与搜索 | **DONE** | `/api/discover` | 服务端已发布作品分组（过滤镜像）、关键词搜索、Boost 置顶；搜索历史 chips（本地） |
| B-11 | 社交数字（获赞/粉丝/关注） | **DONE** | `/api/social/summary` | 服务端权威值，无会话时回退本地 |
| B-12 | 实时推送 | DEFERRED | — | 当前为拉取；推送需生产基础设施 |

---

## 4. C 组｜创作、素材与发布

| ID | 需求 | 状态 | 服务端对象 | 验收证据 |
| --- | --- | --- | --- | --- |
| C-01 | 创作器（Brief → 问答 → Power → Review） | **DONE** | — | 8 步流程；4 个关键问答；Power 加入与难度配置；Review 显示锁定边界 |
| C-02 | 服务端生成管线 | **DONE** | `agents` `agent_tasks` `agent_task_steps` `task_runtime` | 创作触发真实任务；Worker 生成；步骤证据、重试、取消 |
| C-03 | 创作扣费 | **DONE** | `economy_usage_events` `subscription_allowances` | 订阅额度优先、AIP 补充；幂等键；任务创建自带扣费（无双重扣费）；**内容工厂已接「查询创作扣费」预估**（明确标注预估不产生记账） |
| C-04 | 人工审核门禁 | **DONE** | `agent_tasks.review` | 生成后必须人工审核，不能直接发布 |
| C-05 | 版本化 Artifact + checksum | **DONE** | `content_artifacts` | sha256 checksum 落列并写入 manifest；验证报告；版本恢复重建 |
| C-06 | 站内发布 | **DONE** | `contents` | 审核通过 + Artifact ready + 素材授权有效才可发布 |
| C-07 | Asset Manifest 与授权门禁 | **DONE** | `assets` `content_asset_links` | 必须声明授权类型与 checksum；第三方/品牌素材需凭证；**撤销或到期即阻止发布**并返回受影响内容；移动端素材提交自动登记服务端并可撤销 |
| C-08 | Remix 与血缘 | **DONE** | `contents.remix_of_*` | 派生内容重跑审核、商业字段重置、通知原作者；移动端对服务端作品 Remix 时同步创建派生 |
| C-09 | 对象存储 / CDN / 转码 | DEFERRED | — | 生产基础设施阶段 |
| C-10 | 真实图像/视频/音频生成 | EXTERNAL | — | 当前为本地结构化文本生成器 |
| C-11 | 外部发布连接器 | EXTERNAL | — | 前端有状态机，无 OAuth 与回调；不得显示"发布成功" |

---

## 5. D 组｜Campaign、归因与经济

| ID | 需求 | 状态 | 服务端对象 | 验收证据 |
| --- | --- | --- | --- | --- |
| D-01 | Campaign Brief 与审批 | **DONE** | `campaigns` | 品牌创建 → 提交 → 平台审核 → 上线/拒绝 |
| D-02 | Campaign Contract（经济规则） | **DONE** | `campaign_economy_rules` `contract_signatures` `contract_change_orders` | 版本化、13 个必备锁定字段校验、预算不超 Campaign、审批与到期；**三方签署与变更单已接工作台**（品牌 / 平台 / 创作者三视角，实库 3 条签署 + 2 条变更单，其中一条经 UI 审批；批准不改写旧版本） |
| D-03 | **Contract 全链外键** | **DONE** | 6 张表带 `campaign_id + contract_version` | 印记贯穿 task → content → version → artifact → deliverable → runtime_session；未获批版本 409、未获资格 403 |
| D-04 | 参与资格 | **DONE** | `campaign_participants` | 申请/邀请 → 品牌审批 → eligible；归因与交付均校验 |
| D-05 | KOL 追踪链接 | **DONE** | `tracking_links` | 服务端链接对象、`/l/:linkId` 302 解析与访问计数、幂等、资格校验 |
| D-06 | 权威归因触点 | **DONE** | `attribution_touches`（含 `link_id`） | 带 linkId 的运行会话落权威触点；impression → start → complete 漏斗 |
| D-07 | 外部 confirmed conversion | EXTERNAL | — | 无品牌系统回调；CTA 点击只算意图，不算转化 |
| D-08 | Deliverable 审批 | **DONE** | `campaign_deliverables`（带 contract_version） | 提交 → 整改 → 重提 → 批准/拒绝，证据快照可查 |
| D-09 | AIT 权益（三账本分离） | **DONE** | `ait_entitlements` `ledger_batches` | 预算/单用户上限/Contract 锁定金额/主要成功事件校验；`pending → available/frozen/reversed → settlement_pending → settled` |
| D-10 | **归因证据强制解析** | **DONE** | — | 引用必须解析到真实 deliverable/runtime/touch 行且同 Campaign；假引用 409；`partner:` 前缀为外部声明边界（记 `evidenceVerified:false`） |
| D-11 | 权益申领与独立付款结算 | **DONE** | `benefit_claims` `payment_settlements` | 申领 → 批准 → 履约；付款需付款引用 + 回执双证据；与 AIT 分账 |
| D-12 | AIP 站内权益与 Boost | **DONE** | `content_boosts` `point_events` | 20 AIP 兑换 24 小时发现加权；服务端账本扣减 |
| D-13 | 每日签到与规则奖励 | **DONE** | `point_events` `ledger_batches` | 服务端幂等签到 + 连签；管理端白名单规则奖励（需幂等键与证据） |
| D-14 | 账本申诉 | **DONE** | `ledger_appeals` | 提交 → 平台复核 → 通过/驳回 |
| D-15 | 真实支付 / 链上广播 | EXTERNAL | — | 只保留付款记录与人工审批；不伪造链上完成 |
| D-16 | 旧口径退役 | **DONE** | — | 通用 AIT 提现、旧发放、AIT 积分调整固定 410，无后门 |

---

## 6. E 组｜治理、信任与增长

| ID | 需求 | 状态 | 服务端对象 | 验收证据 |
| --- | --- | --- | --- | --- |
| E-01 | 内容举报与下架 | **DONE** | `content_reports` | 移动端举报进入服务端治理队列；去重；平台处理 |
| E-02 | 内容申诉与恢复 | **DONE** | `content_appeals` | 申诉 → 复核 → 恢复为草稿或维持 |
| E-03 | 风险案件 | **DONE** | `risk_cases` | 过速完成、高频运行自动建案；联动奖励资格 |
| E-04 | 平台 Kill Switch | **DONE** | `app_settings` | 全局停止新任务，历史证据保留 |
| E-05 | 积分账本治理 | **DONE** | `point_events` `ledger_batches` | 冻结/恢复/撤销/批次状态变更，均记原因与审计 |
| E-06 | 客服工单 | **DONE** | `support_tickets` | 移动端反馈直通工单；工作台回复/关闭；用户收通知 |
| E-07 | 五人增长网络 | **DONE** | `growth_nodes` `growth_node_members` | 唯一主节点 409、五席位、邀请码加入幂等、满员自动 active；移动端节点页展示服务端五席位与邀请码 |
| E-08 | 未成年人模式 | **DONE** | `app_settings.minor_mode_policy` | 平台可配置时长/宵禁/支付/社交限制；**工作台「信任与风控」页已接策略配置入口**（实库已写入 enabled/90 分钟/22:00-06:00）；策略在客户端强制执行：支付/对外分发拦截 + 宵禁时段拦截 |
| E-09 | 审计日志 | **DONE** | `audit_logs` | 关键动作全链留痕（实测 8 步链路完整） |
| E-10 | 法律文本落地 | **DONE**（待律师复核） | 运营主体 Cerdar Ai Limited、BVI 注册地址、法域表述已填入；verify 增加占位符守卫；正式上线前仍需目标法域律师复核 |

---

## 7. F 组｜AI 分身

| ID | 需求 | 状态 | 服务端对象 | 验收证据 |
| --- | --- | --- | --- | --- |
| F-01 | 分身注册与人设版本 | **DONE** | `ai_twins` | 人设 JSON、版本递增、状态 draft/active/paused |
| F-02 | 声音与肖像授权记录 | **DONE** | `ai_twins.*_consent_at` | 分别记录 consent 时间戳 |
| F-03 | 暂停 / 恢复 | **DONE** | — | 状态切换与审计 |
| F-04 | 场景隔离与 Campaign 知识 | **DONE** | `ai_twin_scenes` | 场景独立知识互不可见；Campaign 场景强制绑定获批 Contract + 参与资格；同名更新递增版本；**工作台「Agent」页已接分身与场景操作入口**（实库 2 条场景，跨账号读取 404） |
| F-05 | 真实模型 / 实时语音视频 | EXTERNAL | — | 当前为预生成样片；不得描述为实时分身 |
| F-06 | 外部渠道自动运营 | EXTERNAL | — | 仅生成建议，需本人确认 |

---

## 8. G 组｜平台与交付质量

| ID | 需求 | 状态 | 说明 |
| --- | --- | --- | --- |
| G-01 | 自动化测试 | **DONE** | 315/315 通过，27 个测试文件，覆盖状态机、权限边界、幂等、频率限制、工作台接线契约 |
| G-02 | 结构校验 | **DONE** | 30/30 通过 |
| G-03 | 控制台零错误 | **DONE** | 模板惰性化 + 内联脚本外置，干净环境零日志 |
| G-04 | 桥接降级纪律 | **DONE** | 所有服务端调用失败静默降级回本地演示；只有真实返回才标 `server_confirmed` |
| G-05 | 布局回归基线 | **DONE**（结构断言版） | 5 条断言守护：响应式断点、安全区、触控下限、Feed 窗口化、覆盖层层级、模板占位不泄漏、MIME 覆盖全部出货图片格式 |
| G-06 | CI/CD | **未做** | 无流水线 |
| G-07 | 监控 / 告警 / Trace | **未做** | 无可观测性 |
| G-08 | 国际化 | **DONE**（框架 + 关键路径） | `public/i18n-v1.js`：中文基准、英文覆盖 61 条关键路径、缺失回落中文、设置页可切换、`html lang` 同步 |
| G-09 | 无障碍系统化 | PARTIAL | 有 aria/焦点/减少动画基础，未做系统性检查 |
| G-10 | 包体积治理 | **DONE** | 30 张大图重压为 JPEG（-48.8 MB，原图备份在 `assets-original/`）；原生包 rsync 排除 HeyGen 样片；顺带修复静态 MIME 缺 jpg 导致 nosniff 拒绝解码的 bug |
| G-11 | 生产基础设施 | DEFERRED | PostgreSQL、队列、对象存储、密钥管理、备份、灰度 |
| G-12 | 商店发布 | DEFERRED | iOS/Android 演示壳存在，非生产签名 |

---

## 9. 当前缺口汇总

> **2026-08-21：v3.0 列出的 P0（6 项）、P1（4 项）、P2（3 项）缺口已全部完成并通过测试。**

### 已完成（本轮）

| 原编号 | 内容 | 验收 |
| --- | --- | --- |
| P0-1 | 移动端素材库接服务端 Asset Manifest | 提交素材自动登记（checksum + 授权类型），撤销返回受影响内容 |
| P0-2 | 移动端 Remix 接服务端派生 | 对服务端作品 Remix 时创建带血缘的派生草稿 |
| P0-3 | 移动端 AI 分身接注册表 | 保存资料同步服务端，版本递增，consent 时间戳 |
| P0-4 | 移动端节点面板接服务端 | 节点页展示五席位权威状态 + 邀请码复制 |
| P0-5 | 未成年人模式客户端执行 | 支付/对外分发/宵禁三类拦截接入全局风控闸门 |
| P0-6 | 工作台 AIP 批次治理 | 复核发现 v3.0 误判，实际已完成 |
| P1-1 | 布局回归基线 | 7 条结构断言（含 MIME 与模板占位守卫） |
| P1-2 | 包体积 | public 177 MB → 127 MB；原生包约 58 MB |
| P1-3 | 国际化框架 | i18n 模块 + 61 条关键路径 + 语言切换 |
| P1-4 | 法律文本 | 真实运营主体与地址填入 + verify 守卫 |
| P2-1 | AI 分身场景隔离 | `ai_twin_scenes`，知识严格隔离 + Contract 绑定 |
| P2-2 | Contract 签署与变更单 | 三方签署幂等 + 变更单审批；旧版本只读保留 |
| P2-3 | 受控实验与灰度 | 仅可优化字段、稳定分桶、状态机守卫、可回滚；**分支已在投放期作用于成品运行时** |

### 已完成（第二轮 · 2026-08-21 下午）

| 项目 | 内容 | 验收 |
| --- | --- | --- |
| P2-UI-1 | Contract 签署与变更单接工作台 | 品牌「AIT 结算」/ 平台「结算复核」/ 创作者「积分账本」三视角入口；签署幂等（复签返回 200 同一条）；来源版本未获批 409；创作者复核 403；实库 3 签署 + 2 变更单 |
| P2-UI-2 | AI 分身与场景接工作台 | 创作者「Agent」页；分身人设递增 + 授权时间戳 + 暂停恢复；通用 / Campaign 场景创建与同名递增；单场景隔离知识查看；绑定未获批 Contract 409；跨账号读取 404 |
| P2-UI-3 | 受控实验与灰度接工作台 | 创作者「内容与发布」页按内容载入；新建实验仅提供 5 个可优化字段（锁定字段 409）；状态机按钮按 draft/running/paused 渲染；非法跃迁 409；「我的分桶」验证同用户 sticky、不同用户不同分支 |
| P2-UI-4 | 未成年人模式策略接工作台 | 平台「信任与风控」页可配置启用 / 每日时长 / 宵禁 / 支付拦截 / 社交限制，实库已写入 |
| P2-UI-5 | 创作扣费预估接工作台 | 内容工厂「查询创作扣费」显示订阅额度覆盖与 AIP 补充，标注不产生记账 |
| P2-UI-6 | Logo 统一 | 工作台移除占位字母标，统一 `public/logo.png`；新增 `public/brand-mark.svg`（与 iOS AppIcon 同色）作为两端 favicon；测试守卫防回退 |

> 按需拉取的面板（签署与变更单、分身、实验、策略）在未载入时显式显示「未载入」，载入失败静默回落为空并保留提示，不伪造服务端数据。

### 已完成（第三轮 · 2026-08-31）

| 项目 | 内容 | 验收 |
| --- | --- | --- |
| P2-RT-1 | 实验分支作用于成品运行时 | 投放 `/content/:id` 时服务端解析分桶并注入 `globalThis.__AIRVANA_VARIANT__`；成品 `applyVariant()` 真实消费 5 个可优化字段；实库 `experiment_assignments` 落真实记录；浏览器实测首屏文案随分支改变 |
| P2-RT-2 | 存量成品与 checksum 不受灰度影响 | 注入只发生在投放副本；`content_artifacts.html_text` 与 `checksum` 保持自洽，无注入残留 |
| P2-RT-3 | 灰度期缓存正确性 | 内容有 running 实验时 `/content/:id` 返回 `private, no-store` + `Vary: Cookie`，杜绝共享缓存把他人分支投给别人；无实验时恢复 `public, max-age=60` |
| P2-RT-4 | 边界与降级 | 匿名访问不分桶不注入不落记录；实验 paused 立即停止影响投放；旧成品（manifest 无 `variantAware`）不注入，工作台如实提示「渲染不会改变」而不是假定生效 |
| P2-RT-5 | 运行证明链不被难度变体破坏 | `difficulty` 真实改变通关所需检查数（1–5），但事件序列恒为 `playable_start → step_complete → playable_complete`；实库实测三事件齐全且保留奖励资格 |
| P2-RT-6 | 分配可观测 | 实验列表返回真实分支分配数（`assignmentCounts`）与 `runtimeVariantAware`，工作台展示「对照 N / 实验 N」 |

**新增代码**：`src/experiments.mjs`（分桶解析与白名单单一来源）、`test/experiment-runtime.test.mjs`（7 项）。

### 新增待办（本轮产生）

1. **G-10 深化（可选）**：`public/` 127 MB 中 ai-twin 仍占 81 MB；若要 Web 端也降到 100 MB 以下，需把 HeyGen 样片移到外部存储或按需下载。
2. **E-10 律师复核**：法律文本主体信息已填，正式上线前需目标法域律师出具意见。
3. **实验效果度量（可选）**：分支已真实投放，但尚未把 `runtime_sessions` / `engagement_events` 按分支聚合成对照报表；在没有统计口径前不做"哪个分支更好"的结论展示。

### 边界（不计入缺口，接入时替换适配位）

真实邮件发送、Google OAuth、KYC 服务商、外部发布连接器、品牌系统 confirmed conversion、真实支付与链上广播、推送服务、生产基础设施（PostgreSQL / 队列 / 对象存储 / CI/CD / 监控）。

## 10. 验收标准（任一需求标记 DONE 的充要条件）

1. 有服务端权威对象与稳定 ID。
2. 有明确角色与动作权限校验（含拒绝路径的状态码）。
3. 关键写操作幂等，重复请求不产生重复对象或重复记账。
4. 有审计留痕或通知。
5. 前端已接线，失败时静默降级且不伪造成功。
6. 有自动化测试覆盖成功路径与至少一条拒绝路径。
7. **实库出现过真实记录**（不是仅测试通过）。
8. 数据来源在 UI 上标注清楚（本地演示 / 服务端确认 / 外部待接）。

---

## 11. 与旧文档的关系

- `v1.0 26 项清单`：R01–R26 的功能划分仍有参考价值，但状态标记（F1/F2/S/X/P）已全面过时，本文件的 A–G 分组取代之。
- `v2.0 UI 与闭环文档`：UI-001–UI-016 中 UI-001/006/008 已达成，UI-002/003/010/015/016 仍未达成（见 G 组）；6.3 节的 16 步 P0 链路已全部走通并有实库记录。
- `未完成功能闭环审计 v3.0`：其三大结构性问题（P0-A seed 死路、P0-B Contract 未贯穿、P0-C 权限边界缺失）**已全部修复**，可作为历史对照。
