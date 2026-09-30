# Airvana 未完成功能闭环审计（代码实测版）

> 版本：v3.0
> 审计日期：2026-08-20
> 依据文档：`Airvana-UI与完整功能闭环结构性需求文档-v2.0`、`Airvana-全项目结构化需求清单-v1.0`、`Airvana-经济模型-v1.0`、`PROJECT_MEMORY.md`
> 审计方式：全量测试复跑 + 代码/数据库/路由静态清点 + 运行中实例真机视口实测
> 文档状态：事实记录，不含产品决策；不作为发布批准

---

## 0. 本次的验证基线（全部为本轮实测结果）

| 项目 | 实测结果 | 与文档基线对比 |
| --- | --- | --- |
| `npm test` | **260/260 通过** | v2.0 文档记录 140/140，审计 v2.0 记录 186/186 |
| `npm run verify` | **29/29 通过** | 一致 |
| 运行入口 | `http://127.0.0.1:8082/` 与 `/workspace` 均 200 | 一致 |
| 后端 API 路由 | **88 条** | 文档称"约 67 类"，已增长 |
| SQLite 表 | **51 张** | 文档称 37 张，已增长 |
| 有前端调用者的路由 | 59 条 | — |
| **零前端调用者的路由** | **29 条** | 新增量化 |
| **移动端引用的 API 端点** | **10 个**（全部为 auth / wallet / account） | 文档称"约 11 类"，**无变化** |
| 移动端实测网络请求 | 整页加载 + 首页 Feed + 节点页浏览，**0 次 `/api/` 请求**；10 个端点全部位于 `frontendDemoMode` 分支之后 | 新增实测证据 |
| `public/` 体积 | **177 MB** | 文档基线 101 MB，**增长 75%** |
| Android Debug APK | **175 MB** | 文档基线约 100 MB，**增长 75%** |

### 运行中数据库的真实计数（`data/airvana.db`）

```
campaign_economy_rules   0      ait_entitlements     0
attribution_touches      0      point_events         0
payment_settlements      0      benefit_claims       0
creator_applications     0      runtime_sessions     2  (均 reward_eligible=0)
runtime_events           6      settlements          1  (payment_pending)
```

这组数字是本次审计最关键的证据：**经济模型 V1 的全部账本、Campaign Contract、归因证据、创作者资格审核，在真实运行库中从未产生过任何一条记录。** 它们只存在于代码和内存测试中。

---

## 1. 结论

### 1.1 项目当前定性

**移动端是一个完整度很高、完全自洽的单机演示应用；服务端是一套测试覆盖良好、规则严格的本地状态机；两者之间没有连接。**

这不是"接线做了一部分"，而是"接线尚未开始"：

- 移动端 `frontendDemoMode = true` 硬编码于 `public/index.html:2116`，且**没有任何运行时开关可以关闭它**。
- 领域数据层（`RepositoryRegistry`）已声明 9 类接口，但实现为 `mode:'local-only', enabled:false`，任何调用固定返回 `REPOSITORY_DISABLED_LOCAL_ONLY / server_called:false`（`public/mobile-local-business-v1.js:338-352`）。
- 测试用例本身把这个状态固化了：`repository interfaces are present but disabled and never claim a server call`、`local CRUD repositories ... without server calls`。**测试通过并不意味着接线完成，恰恰锁定了未接线状态。**

因此："260/260 通过"是服务端与本地演示各自的质量证据，不是端到端闭环证据。

### 1.2 三个最严重的结构性问题

**P0-A｜整条 P0 主链路没有任何一条真实实例走通过。** Contract 表 0 行、归因 0 行、AIT 0 行。唯一带"验收"标签的 `/api/demo/seed-workflow` 是**直接 INSERT 终态**（`src/app.mjs:1093` 附近），不经过状态机，不创建 economy contract，并且终点落在一个已被 410 下线的发放入口上。

**P0-B｜Campaign Contract 不是全链路权威对象。** `contract_version` 只出现在 `campaign_economy_rules` / `ait_entitlements` / `point_events` 三张经济表；`contents`、`agent_tasks`、`content_versions`、`content_artifacts`、`campaign_deliverables`、`settlements`、`runtime_events`、`attribution_touches` **全部没有 contract 绑定字段**。全库检索 `contract_id` 为 0 处，`agentic_fields` 为 0 处，无签署表、无变更单表。需求 8.3 的核心约束"生成任务、Artifact、发布、事件、Deliverable 和 Settlement 均引用同一 Contract 版本"未成立。

**P0-C｜玩家 / KOL 的权限边界在服务端不存在。** `users.role` 的 CHECK 只允许 `creator / brand / admin`；`player` 被落库为 `creator`（`src/app.mjs:184`，`storageRole = role === 'player' ? 'creator' : role`）。`src/app.mjs` 全文**没有任何 entitlement 校验**，只有 role 校验。因此 `PROJECT_MEMORY.md` 中"商业动作必须由服务端 entitlements 判断"这条决策在代码中没有落点。运行库中唯一一条 `economy_profiles` 记录是 `creator_status='active'` + `kyc_status='verified_legacy'` + `region_status='unknown'`，即商业资格由历史默认值获得，而不是由 `account_active AND creator_approved AND kyc_valid AND region_allowed` 推导。

---

## 2. P0 十六步主链路：逐步断点

对照需求文档 6.3 节的 16 步验收链路。

| # | 步骤 | 现状 | 断点 |
| --- | --- | --- | --- |
| 1 | 品牌创建 Campaign Brief | LOCAL | Brief 存在 `campaigns.brief_json`，非独立版本化对象；移动端 Brief 是另一套本地对象 |
| 2 | 生成 `contract_id + contract_version` 并锁定字段 | **未闭环** | 无 `contract_id`；无签署、无变更单；`campaign_economy_rules` 实库 0 行 |
| 3 | 平台审核品牌组织与 Contract | 部分 | `/api/organizations/:id/review` 已接工作台；`economy-contract/approve` **无任何 UI** |
| 4 | KOL 申请/邀请 + 服务端确认 eligibility | **未闭环** | `/api/campaigns/:id/apply` 只校验 `role='creator'`，不校验创作者审核、KYC、地区 |
| 5 | KOL 接受 Contract 后创建 Playable | **未闭环** | 无"接受 Contract"动作；内容与 Contract 无关联字段 |
| 6 | 素材进 Asset Manifest，未授权阻止提交 | **未闭环** | 无 `assets` 表、无 `asset_id`、无服务端 manifest 门禁；素材仅在 `localStorage` |
| 7 | 移动端创建服务端 Agent Task | **未闭环** | 移动端 0 次 API 调用；工作台可完成（LOCAL） |
| 8 | 生成结果进人工审核，不可直接发布 | LOCAL | 服务端门禁完整且有测试；移动端走本地演示审核 |
| 9 | 构建版本化 Artifact + checksum + 验证报告 | 部分 | `content_artifacts` 有 `manifest_json`/`validation_json`；**无 checksum 字段** |
| 10 | KOL 人工确认站内发布，平台保留 Kill Switch | LOCAL | 服务端完整；移动端"发布"是独立本地链 |
| 11 | 生成 `campaign+playable+version+kol+link_id` 专属链接 | **未闭环** | `link_id` 只在前端出现 14 处，服务端 0 处，无链接对象与解析路由 |
| 12 | 运行事件顺序校验、去重、拒绝乱序 | 分离 | 服务端强校验（顺序、幂等、过速风控）；**移动端从不上报**，实库归因 0 行 |
| 13 | 外部成功事件仅由品牌系统确认 | **BLOCKED** | 无 `conversions` / `click_events` 表，无回调、无签名验签、无 `click_id` |
| 14 | Deliverable 提交/整改/重提/审批 | LOCAL | 服务端与工作台完整，移动端未接 |
| 15 | 结算生成独立账本，失败/冻结/申诉可追踪 | **未闭环** | 新路径（entitlement → benefit / payment）代码完备但**零 UI、零数据**；旧路径工作台有"确认发放 AIT"按钮，后端固定返回 410（`public/app.js:501` ↔ `src/app.mjs:1501`）→ 死路 |
| 16 | 漏斗复盘 + 允许字段新版本 + 回滚 | 部分 | 内容版本可回滚；无 `experiments`、无 Contract 变更单、无受控灰度 |

**16 步中：4 步达到本地服务闭环（LOCAL），4 步部分具备，8 步未闭环或被外部依赖阻塞。移动端参与度为 0 步。**

---

## 3. R01–R26：未闭环项清单

状态口径沿用需求文档：`UI / DEMO / LOCAL / INTEGRATED / EXTERNAL / PROD / BLOCKED`。
**本次审计中没有任何一项达到 INTEGRATED。**

### A. 用户、账号与身份

| ID | 功能 | 现状 | 未闭环的具体内容（含代码证据） |
| --- | --- | --- | --- |
| R01 | 品牌启动页 | DEMO | 无远程配置、版本检查、强制升级；弱网/离线/地区是本地模拟开关，非真实探测 |
| R02 | 登录与账号安全 | DEMO / LOCAL 分离 | **邮箱验证码在浏览器用 `Math.random()` 生成、在浏览器校验、并直接显示在提示文案里**（`public/index.html:3613-3641`）；Google 登录在演示模式下不发任何请求；无账号合并、找回、MFA、设备会话管理接线（`/api/account/sessions` 零调用者） |
| R03 | 创作 AI 分身 | DEMO | 无 `ai_twins` / `scenes` 表；`ai-twin/heygen` 下 69 MB 预生成 mp4 被当作分身效果展示；无模型、无声音/肖像授权记录、无训练任务 |
| R04 | AI 分身空间与渠道 | UI | 无渠道 OAuth、Token 保管、回复建议、人审确认、撤权；无 `connectors` 表 |

### B. 首页、发现与社交

| ID | 功能 | 现状 | 未闭环的具体内容 |
| --- | --- | --- | --- |
| R05 | Agentic Playable 体验 | DEMO / LOCAL 分离 | 首页 38 个本地游戏不加载服务端 Artifact；**`/api/runtime/sessions` 与 `/api/runtime/events` 零前端调用者**，运行证明链在 APP 内不可达 |
| R06 | 发现与增长网络 | DEMO | `/api/discover` 已存在但移动端不调用；增长网络指标为演示常量（已正确标注"演示网络数据"） |
| R07 | 通知、互动与私信 | DEMO | **无 `messages` / `conversations` 表**，私信完全是前端对象；未读数由页面各自维护；无实时同步、发送失败重试、撤回、屏蔽、会话归档 |
| R08 | 全局搜索 | DEMO | 无索引、无搜索建议、无历史、无无结果推荐；仅本地数组匹配 |
| R09 | 关注与互动关系 | DEMO | **无 `follows` / `relations` 表**，关系图不存在；点赞/收藏/关注只写 `localStorage` |

### C. 创作、素材与发布

| ID | 功能 | 现状 | 未闭环的具体内容 |
| --- | --- | --- | --- |
| R10 | 创作者中心 | DEMO / LOCAL 分离 | 移动端不消费服务端 `agent_tasks` / `contents` 状态；任务失败、权限不足、审核中状态来自本地状态机 |
| R11 | AI 创作流程 | DEMO / LOCAL 分离 | 服务端只有本地结构化文本生成器（`src/ai.mjs:88-105`），**无图像、视频、音频生成能力**；移动端创作器与 Worker 完全分离 |
| R12 | Asset Manifest | UI | **无 `assets` 表、无 `asset_id`、无 checksum、无来源/授权/到期/撤销、无扫描、无对象存储与 CDN**；素材只在当前设备 |
| R13 | Remix 与版本 | DEMO / LOCAL 分离 | 服务端有 `content_versions` 与恢复；前端 Remix 不产生服务端版本；跨作者授权与父子版本链未闭环 |
| R14 | 审核与发布门禁 | LOCAL | 服务端门禁完整；移动端未接，存在"发布到本地演示"独立链；无审核 SLA、申诉时限、审核人分派 |
| R15 | 外部发布连接器 | BLOCKED | 无 OAuth、无 `external_publications` 表、无目标选择、回调、重试、撤权 |

### D. Campaign、归因与商业

| ID | 功能 | 现状 | 未闭环的具体内容 |
| --- | --- | --- | --- |
| R16 | Campaign Brief → Contract | 部分 LOCAL | 见 P0-B。`campaign_economy_rules` 具备版本、锁定字段、审批与到期，但**无 `contract_id`、无签署、无变更单、不被生成/发布/事件/交付引用，且实库 0 行、零 UI** |
| R17 | 效果归因证据 | 部分 LOCAL | `attribution_touches` **缺 `click_id`、`consent_state`、`link_id`、`experiment_id`、归因窗口、优先级、去重规则**；CTA 点击与 confirmed conversion 未分离；无外部确认通道 |
| R18 | AIP / AIT 钱包 | LOCAL（代码）/ 0 数据 | 规则严格但**从未执行**。`createAitEntitlement` 的 `attributionReference` 仅做非空校验、`sourceEventId` 不校验存在性（`src/economy.mjs:400-402`）→ 归因证据与 AIT 的绑定是声明式而非强制式。旧提现 410 下线正确，但工作台残留死按钮 |
| R19 | AIP 站内权益中心 | DEMO | `/api/economy` `plans` `check-in` `creation/quote` `creation/consume` `appeals` **全部零前端调用者**；`point_events` 实库 0 行 |

### E. 信任、角色、增长网络与治理

| ID | 功能 | 现状 | 未闭环的具体内容 |
| --- | --- | --- | --- |
| R20 | KYC 与角色认证 | DEMO | 见 P0-C。`/api/creator-applications` 与 `/api/admin/creator-applications/:id/review` **零前端调用者**，实库 0 行；KYC 状态由 `verified_legacy` 默认值获得 |
| R21 | 五人增长网络节点 | DEMO | **无 `growth_nodes` / `node_invites` 表**；邀请、接受、唯一主节点、贡献证据、退出、替换、申诉均无服务端对象。清单明确要求删除的**"分别确认"文案仍存在 2 处**（`public/index.html`） |
| R22 | 客服与未成年人模式 | UI | **无 `support_tickets` 表**；未成年人模式无年龄、监护、时长、支付限制策略；法律文本仍留"正式运营主体…将补充"占位，未经法域复核 |
| R23 | 治理、风控与 Kill Switch | LOCAL | 服务端举报/申诉/风险/Kill Switch 完整且工作台已接；**移动端未接线**，移动端治理面板是独立本地状态机 |

### F. 平台与交付质量

| ID | 功能 | 现状 | 未闭环的具体内容 |
| --- | --- | --- | --- |
| R24 | 国际化与无障碍 | UI | **无任何 i18n 层**（`i18n` / `translations` 检索均为 0），文案硬编码中文；无字符串资源化、无中英切换 |
| R25 | 账号、数据与外部服务 | 部分 LOCAL | 导出/删除已接移动端，是移动端唯一接入的业务能力；生产数据库、队列、对象存储、密钥、备份全部未建设 |
| R26 | 测试、监控与发布质量 | LOCAL | 测试与结构校验强；**无 CI/CD、无视觉回归基线、无监控/告警/Trace、无容量与弱网演练**；控制台仍有错误（见 §5） |

---

## 4. 服务端已有但没有任何前端入口的 29 条路由

这是"后端能力 > 前端接线"最直接的量化。除 `/api/health` 外，其余 28 条全部是业务能力。

**经济模型 V1（整层无 UI）**
`/api/economy`、`/api/economy/plans`、`/api/economy/check-in`、`/api/economy/creation/quote`、`/api/economy/creation/consume`、`/api/economy/appeals`、`/api/campaigns/:id/economy-contract`、`/api/admin/campaigns/:id/economy-contract/approve`、`/api/admin/campaigns/:id/ait-entitlements`、`/api/admin/ait-entitlements/:id/review`、`/api/ait-entitlements/:id/settlements`、`/api/admin/benefit-claims/:id/review`、`/api/admin/payment-settlements/:id/review`、`/api/admin/payment-settlements/:id/complete`、`/api/admin/economy/appeals/:id/review`、`/api/admin/economy/rewards`、`/api/admin/aip-batches/:id/status`、`/api/admin/points/adjust`、`/api/admin/subscriptions/grant`

**运行证明与归因**
`/api/runtime/sessions`、`/api/runtime/events`

**创作者资格**
`/api/creator-applications`、`/api/admin/creator-applications/:id/review`

**账号与已下线路径**
`/api/account/sessions`、`/api/ait-withdrawals`、`/api/ait-withdrawals/:id/cancel`、`/api/admin/ait-withdrawals/:id/review`、`/api/admin/ait-withdrawals/:id/complete`

> `PROJECT_MEMORY.md` 把 `docs/Airvana-经济模型-v1.0.md` 定为"第一版经济模型的唯一来源文档"。该模型的服务端实现是本项目质量最高的部分之一，但目前**没有任何用户或运营者可以通过界面触达它**。

---

## 5. UI-001 – UI-016：未达成项

| ID | 需求 | 现状 | 证据 |
| --- | --- | --- | --- |
| UI-001 | 功能完成度真实化 | **部分达成** | 已去掉"26/26 已闭环"，改为"基线共 26 项 · 当前 N 项可见"，并拆出界面覆盖/本地演示/本地服务/待接四类计数。**但仍非要求的六层（UI/DEMO/LOCAL/INTEGRATED/EXTERNAL/PROD）**；进度条 = 本地演示数 ÷ 可见数，把"能本地点击"计为进度；无每项的证据、测试、依赖、负责人、阻塞展开 |
| UI-002 | 统一 Design Token | 未达成 | 62 个 token 已建立，但**内联 `style="` 1272 处**（文档基线 1224，已增加），token 无法覆盖 |
| UI-003 | 统一基础组件 | 未达成 | 无组件层；`role="button"` 278 处（基线 254，已增加） |
| UI-004 | 暗黑/浅色系统化 | 部分 | `prefers-color-scheme` 已接入；硬编码白色相关值仍 274 处 |
| UI-005 | 全局异步状态组件 | 部分 | `commonState` 工厂已覆盖 loading/empty/error/offline/permission 并有测试；但因无真实请求，"服务不可用、第三方授权过期、操作冲突、重试恢复"无法被触发验证 |
| UI-006 | 首页 Feed 虚拟化 | **已达成（口径不同）** | 实测首页 DOM 223 节点、可交互控件 26、同时挂载 2 个作品。未使用 `inert`（0 处），而是只渲染当前与相邻项 |
| UI-007 | 创作器渐进披露 | 未验证 / 部分 | 已有 `creator-workflow-v2`；"不填 Brief 必填项不能进入生产生成""修改锁定字段必须创建 Contract 变更"因无服务端 Contract 而无法成立 |
| UI-008 | 页面状态来源标识 | **基本达成** | "演示网络数据 · 不代表真实 AIP、AIT 或商业结算""本地互动 DEMO""Repository 接口已预留 · Local only"等标识一致且诚实 |
| UI-009 | 导航、返回与恢复 | 部分 | 有本地实现与测试；深链到服务端对象无法验证 |
| UI-010 | 语义化交互控件 | 未达成 | 见 UI-003 |
| UI-011 | 字体与内容密度 | 部分改善 | 单位数 px 字号声明 123 处（基线 329，已明显改善），但仍存在 |
| UI-012 | 图片/视频性能治理 | **反向恶化** | 需求明确要求"将 HeyGen 样片等可选媒体外置，目标显著低于 100 MB"。实测 `public/` **177 MB**、APK **175 MB**，`ai-twin/heygen` 仍有 **69 MB** mp4 在包内（单文件最大 27 MB） |
| UI-013 | 角色视角一致性 | 未达成 | 视角切换不改权限这一点前端做对了，但服务端没有 entitlement 可依据（P0-C） |
| UI-014 | 工作台响应式 | 未验证 | 本次未做桌面表格专项 |
| UI-015 | 视觉回归体系 | 未达成 | 无截图基线，无 360/390/430/WebView/桌面回归 |
| UI-016 | 国际化与无障碍 | 未达成 | 见 R24 |

### 控制台不再"为空"

需求文档 §13 记录"实页审计结束时浏览器控制台日志为空"。本次实测该结论已不成立：

- 大量 `<path> attribute d: Expected moveto path command` 错误 —— 未插值的 `{{ ... }}` 模板占位被浏览器当作 SVG 路径解析。
- 两次失败网络请求：`GET /{{ playerPostMediaPreview }}`、`GET /{{ aiTwinHeyGenVideoSrc }}` —— 模板占位被当作图片/视频 URL 发起请求。

这些不影响功能，但违反"核心路径无未捕获错误"的门禁，且会污染真机与 WebView 的崩溃/错误监控基线。

---

## 6. 应当从"未完成"移出的部分（对比文档基线的真实进展）

为避免审计只记录负面，以下是本轮核实**确实前进**的内容：

1. **测试规模翻倍且全绿**：140 → 186 → **260**，`verify` 29/29。
2. **首页 Feed 已收敛**（UI-006）：从"23 个作品同时挂载、144 个按钮"降到"2 个作品、26 个可交互控件"。
3. **功能中心不再谎报闭环**（UI-001 主要诉求）：`26/26 已闭环` 文案已完全移除。
4. **来源标识诚实（UI-008）**：演示数据、本地演示身份、Repository 未启用等都有明确标注，且 `RepositoryRegistry` 主动返回 `server_called:false` 而非静默假装成功 —— 这是很好的工程纪律。
5. **经济模型 V1 服务端规则严格**：Contract 锁定金额校验、主要成功事件校验、总预算与单用户上限、幂等键、批次期限、冻结/冲正/申诉状态机，均有测试。
6. **旧口径已按决策下线**：通用 AIT 提现、旧 AIT 发放、AIT 通用积分调整全部固定 410，未留后门。
7. **风控已落在服务端**：运行事件顺序强校验、过速与高频自动建案、`risk_cases` 联动奖励资格。

---

## 7. 建议的最小闭环顺序（不扩后端范围）

当前项目的瓶颈不是缺功能，而是**已有的服务端能力没有出口**。建议先做三件事，且每件都以"实库出现真实记录"为验收，而不是以"测试通过"为验收。

**第 1 步：打通一条最短真实链路（不碰 UI 美化）**
关闭 `frontendDemoMode` 的一条分支即可：让移动端"完整试玩"调用 `/api/runtime/sessions` + `/api/runtime/events`，把 5 AIP 真正写进 `point_events`。
验收：实库 `runtime_sessions ≥ 1 且 reward_eligible=1`、`point_events ≥ 1`。这是唯一一条不依赖 Contract、不依赖第三方就能真闭环的链路。

**第 2 步：给经济模型 V1 开一个运营出口**
在 `/workspace` 增加 Contract 提交/审批、AIT 权益创建/复核、权益申领与付款结算复核四个页面，接已有的 19 条零调用路由。
验收：实库 `campaign_economy_rules ≥ 1`、`ait_entitlements ≥ 1`、`payment_settlements` 走到 `paid`。

**第 3 步：把 Contract 变成真正的外键**
给 `contents`、`agent_tasks`、`content_versions`、`content_artifacts`、`campaign_deliverables`、`runtime_sessions`、`attribution_touches` 增加 `campaign_id + contract_version`；把 `createAitEntitlement` 的 `attributionReference` / `sourceEventId` 改成对 `attribution_touches` / `runtime_events` 的存在性校验。
验收：任意一条 AIT 记录可以反查到它的运行事件与 Contract 版本。

同时应立即处理的两个小项（成本极低、当前是明确缺陷）：

- 删除工作台"确认发放 AIT"死按钮（`public/app.js:501`），或改为跳转新权益路径。
- 修掉未插值模板占位导致的 SVG 报错与两次无效网络请求，恢复"控制台无错误"这条门禁的可用性。

---

## 8. 需求文档中仍未回答的产品决策

以下决策直接决定上面第 1–3 步的范围，本次审计不代为决定：

1. 移动端是否确认默认连接本地 API、失败后显式进入 DEMO（需求文档 §12.3）。当前实现是"永远 DEMO"，与该待确认项冲突。
2. Campaign Contract 是否独立于 Campaign 并采用签署记录（§12.4）。当前是 Campaign 的附属经济规则。
3. `player` 是否需要独立的服务端角色，或继续以 `creator` + entitlement 表达（PROJECT_MEMORY 与 `users.role` CHECK 目前不一致）。
4. 第一版是否接受"AIT 与归因证据为声明式绑定"，或必须改为强制外键。
5. HeyGen 样片是否可以移出基础包（直接决定 APK 能否从 175 MB 降下来）。

---

## 附录：本次审计的可复现命令

```bash
npm test                     # 260/260
npm run verify               # 29/29
grep -oE "'(/api/[^']*)'" src/app.mjs | sort -u | wc -l          # 后端路由
grep -oE "CREATE TABLE IF NOT EXISTS [a-z_]+" src/db.mjs | wc -l # 表数量
grep -c "frontendDemoMode" public/index.html                     # 演示模式开关
du -sh public && ls -lh android-demo/build/outputs/*.apk          # 体积
```
