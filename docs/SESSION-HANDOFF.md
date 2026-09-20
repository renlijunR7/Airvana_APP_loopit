# Airvana 开发交接（2026-08-31 · 第三轮）

> 新会话请先读本文件 + `docs/Airvana-全项目结构化需求清单-v3.0.md`（v3.1 内容），即可接续工作。

## 项目与运行

- 目录：`airvana-v5-fullstack`（Node + SQLite 本地全栈，无第三方依赖）
- 启动：`npm start` → 移动端 `http://127.0.0.1:8082/`，工作台 `/workspace`
- 测试：`npm test`（315/315）、`npm run verify`（30/30）
- 缩放调试：`/?display-scale=0.7`

## 当前基线

| 维度 | 值 |
| --- | --- |
| 后端路由 | 125 条（**121 已接线**；未接 4 条 = 全部为退役 410 路径，无后门） |
| SQLite 表 | 69 张 |
| 移动端接入端点 | 46 个（当日之前为 10 个） |
| 桥接方法 | `public/local-api-bridge-v1.js`，约 56 个 |
| 测试 / 校验 | **315 / 315**，30 / 30 |
| `public/` 体积 | 127 MB；APK **55 MB**（v1.1.0，桌面已有产物） |

## 已完成主线（2026-08-20 ~ 08-21）

1. 闭环审计 → 三大结构性问题（seed 死路 / Contract 未贯穿 / 权限边界缺失）**已全部修复**
2. 工作台开出经济模型 V1 全部出口（Contract 审批、AIT 权益、申领、付款结算、申诉、经济四工具、创作者资格审核、客服工单）
3. 移动端全面接线：登录身份、运行证明 + AIP、点赞/收藏/分享/评论/关注、私信、通知、发现与搜索、钱包、创作管线、素材、Remix、AI 分身、节点、未成年人模式
4. 账号合并（策略 A：主身份 + 绑定）、创作者资格链（申请 → KYC → 审批）
5. 缺口清单 13 项全清（P0 六项 / P1 四项 / P2 三项）
6. 全流程 E2E 实测通过：注册 → KYC → 创作 → Power → 生成 → 审核 → 发布 → 他人可发现

## 本轮新增（2026-08-21 下午）

1. **P2 管理面全部接入工作台 UI**（纯接线，无服务端改动）
   - `Contract 签署与变更单`：品牌 / 平台 / 创作者三方签署（幂等，重复签署不生成第二条）、品牌对已获批版本发起变更单、平台批准/拒绝；批准不改写旧版本
     - 位置：品牌「AIT 结算」、平台「结算复核」、创作者「积分账本」页底部；按需拉取，未载入时明确显示「未载入」而不是空状态伪装
   - `AI 分身与场景知识隔离`：创作者「Agent」页；分身创建/人设递增/授权时间戳/暂停恢复 + 场景（通用 / Campaign）创建与同名递增 + 单场景隔离知识查看
   - `受控实验与灰度`：创作者「内容与发布」页；每条内容「灰度实验」按钮载入实验列表，新建实验只提供 5 个可优化字段，状态机按钮按 draft/running/paused 分别渲染，另有「我的分桶」查看稳定分桶
2. **顺带补齐两条此前无前端调用者的路由**
   - `/api/admin/policies/minor-mode`：平台「信任与风控」页新增「未成年人模式策略」卡片（启用、每日时长、宵禁、支付拦截、社交限制）
   - `/api/economy/creation/quote`：创作者「内容工厂」页新增「查询创作扣费」（订阅额度优先 / AIP 补充预估，明确标注不产生记账）
   - `/api/experiments/:id/assignment`：实验「我的分桶」按钮
3. **Logo 统一**：工作台侧边栏与登录页不再使用占位字母标「A」，统一使用 `public/logo.png`；新增 `public/brand-mark.svg`（三色圆点，与 iOS `AppIcon-master.svg` 同色）作为两端 favicon
4. **实库验证记录**（`data/airvana.db`）：`contract_signatures` 3 条（品牌/平台/创作者各一，含幂等复签返回 200）、`contract_change_orders` 2 条（其中一条经工作台 UI 完成审批）、`ai_twin_scenes` 2 条（通用 + Campaign 各一，跨账号读取 404）、`experiments` 2 条、`experiment_assignments` 2 条（同用户 sticky、不同用户不同分支）、`minor_mode_policy` 已由工作台写入
5. **拒绝路径实测**：变更来源版本未获批 409、创作者复核变更单 403、场景绑定未获批 Contract 409、实验锁定字段 409、实验非法状态跃迁 409

## 移动端（Flutter · apps/airvana_mobile）

Web 端 `public/index.html` 之外，仓库里还有一套 Flutter 应用，二者是**两份独立实现**，改一边不会同步另一边。

- 运行：`flutter run --dart-define=AIRVANA_PREFER_LOCAL_DATA=false --dart-define=AIRVANA_API_BASE_URL=http://127.0.0.1:8082`
  - 不传 `AIRVANA_PREFER_LOCAL_DATA=false` 时默认走本地演示数据，看不到服务端真实值
- 测试：`flutter test`（126/126）、`flutter analyze`（0 issue）

### 2026-09-10 全量审计结论

**Web 全栈端已成熟**：132 路由、`npm test` **683/683**（连跑 4 轮稳定）、`npm run verify` 30/30。
剩余项均为边界/可选：Web 体积（ai-twin 81MB）、法律文本律师复核、实验效果度量报表、真实第三方与生产基础设施。

**真正的缺口全部在 Flutter 端。** Web 移动端接了 54 个接口，Flutter 只接 23 个。
注意：纯接口 diff 会高估缺口——部分数据 Flutter 走 `/api/bootstrap` 聚合拿（如社交数字），
不算缺失。逐项核实后，**真实缺失 16 项**：

| 优先级 | 缺口 | 现状 |
| --- | --- | --- |
| **P0** | ~~运行证明与 AIP~~ | **已完成**（见下） |
| ~~P0~~ | ~~真实登录与登出~~ | **已完成**（钱包签名为设备侧边界，见下） |
| ~~P1~~ | ~~删除账号 / 内容举报 / 客服工单 / 创作者资格 / 会话管理~~ | **已全部完成**（见下） |
| ~~P2~~ | ~~Boost / 素材授权 / AI 分身 / 订阅计划 / 钱包地址 / 未成年人模式~~ | **已全部完成**（见下） |

已实现的：人工审核、发布、Remix、评论、关注、私信、通知、发现、增长节点、签到、创作者中心五模块。

### 已修复：退出登录不生效（2026-09-11）

**缺陷**：`_ensureLocalDemoSession()`（46 处调用）把「没有 Cookie」一律当成「还没登录过」，
于是主动退出后**下一个服务端请求就会静默 POST `/api/auth/demo` 登回去**。
退出本身是成功的（服务端确实 401），但用户完全看不出生效过。

真机上会触发自动登回的操作有 24 个：打开创作者中心 / AI 分身 / 订阅 / 设置 / 删除账号 /
账号与登录，以及点赞、关注、评论、私信、开始试玩、推广、举报、提工单、报名 Campaign、
创建或加入节点等。也就是说退出后随便点一下就复活。

**修法（产品口径 C：退出 = 仅断开服务端身份，本地演示照常）**：

1. 新增持久化标记 `LocalProfileFeatureState.serverSignedOut`，区分「从没登录过」与「刚刚退出」；
   冷启动仍然保持已退出状态。
2. `_ensureLocalDemoSession` 在已退出时抛 `SignedOutException`（区别于普通 `ApiException`），
   不再自动建会话。
3. 读取类（创作者中心、未成年人策略、AI 分身、删除申请状态）**静默降级为「未登录 / 未接入」**，
   本地试玩与演示内容完全不受影响；写入类（举报、工单、推广、素材、互动）抛出可识别的未登录错误。
4. 退出后直接跳转「账号与登录」页，并在页首如实显示当前未登录及哪些能力受影响。
5. 重新登录（邮箱验证码或 Google 适配器）清除标记，服务端能力恢复。

**过程中发现并修掉一个自己写出来的顺序错误**：原本先 `_setSignedOut(false)` 再解析登录结果，
导致**一次失败的登录也会解除退出状态**、自动登录随之复活。改为先解析出合法身份再清标记，
并加了专门的回归测试。

新增 `test/signed_out_test.dart` 7 项，覆盖：从没登录过仍可自动建会话、退出后任何请求都不得
自动登回、读取类降级而非报错、标记跨重启保留、失败登录不得解除退出、重新登录后恢复。

### 已完成：Flutter P2 六项（2026-09-11）

| 能力 | 位置 | 实库证据 |
| --- | --- | --- |
| Boost 发现加权 | 创作者中心「创作激励」卡片底部；只列真实已发布且未在加权中的作品 | `content_boosts` 一条 active，`balance.AIP` 真实扣减 |
| 素材授权 | 「发布与治理」页；撤销后引用它的内容将无法发布 | `assets` 一条 `brand_supplied/authorized`；缺授权凭证被 400 `license_ref_required` 拒绝 |
| AI 分身 | 「我的 AI 分身」页新增服务端注册表；与上方本机概念配置区分开 | `ai_twins` 一条，保存后版本递增，授权时间戳由服务端落 |
| 订阅计划 | 「订阅与额度」页新增服务端目录 | 三个计划均 `pending_approval` → **不提供下单入口** |
| 钱包地址校验 | 登录页钱包卡片；只校验格式与校验和，**不等于绑定** | `checksumVerified:true / ownershipVerified:false`；非法地址 400 |
| 未成年人模式 | 「设置」页；平台配置、客户端执行 | 服务端实测 enabled/90 分钟/22:00-06:00/支付拦截/社交限制 |

**钱包绑定仍是边界**：`/api/wallet-bindings/verify` 需要设备侧签名，与钱包登录同因未接入，界面标注「待接入签名器」，不伪造。

**真机验证抓到两处契约不符**（单测用 mock 复现不出来，因为 mock 编码的是我的假设而非真实契约）：
1. Boost 实际返回 `{id,status,expiresAt,idempotent,balance:{AIP,AIT}}`，没有 `costAip`，也不是 `economy.aip.available`——按原猜测解析余额会显示成 **0**。现已改为读 `balance.AIP`，费用作为服务端常量 `BoostResult.costAip = 20` 声明，并补上此前漏掉的幂等标志（重复推广不得提示又扣了 20 AIP）。
2. 未成年策略实际字段是 `curfew:'22:00-06:00'`（单字符串）、`paymentsBlocked`、`socialRestricted`——按 `curfewStart/blockPayments` 解析会把**已启用**的策略全部读成关闭。

两处的测试报文现已改为**对真实服务端实测抓取后原样固定**，不再按猜测构造。新增 `test/platform_services_test.dart` 15 项。

### 已完成：Flutter 真实登录与登出（P0，2026-09-11）

新增「账号与登录」二级页（`/profile/secondary/signIn`，入口在「设置与更多」）。
**三种方式真实程度不同，界面分别如实标注，没有一视同仁地叫「登录」**：

| 方式 | 实现程度 | 界面口径 |
| --- | --- | --- |
| 邮箱验证码 | **真实**：服务端签发、10 分钟有效、一次性消费、错误锁定 | 当前无邮件服务商，验证码由本地适配器内联返回——直接显示出来，不假装「已发送到邮箱」；接真实邮件后该字段消失，界面自动改为「请查收邮箱」 |
| Google | 服务端只有**本地适配器**，不是真实 OAuth | 标题即写明「本地适配器」，说明接入真实 OAuth 后会替换 |
| 钱包签名 | 服务端已具备 nonce + 验签，但**移动端没有签名器** | 不提供登录入口，标注「待接入签名器」，并声明不索取助记词或私钥 |

**顺带修掉一个安全相关实缺陷**：原「退出登录」只清本地头像并跳首页，**服务端会话依然有效**，等于没退成。现在真实调用 `/api/auth/logout` 销毁会话、清本地 Cookie、并失效所有会话相关缓存。即使服务端调用失败也必须清本地凭证——否则用户以为已退出、设备上却还留着可用会话。

**实库验证**（`data/airvana.db`）：错码 401 `code_invalid`、验证码一次性（复用返回 `code_expired`）、登出后同一 Cookie 访问 `/api/bootstrap` 返回 **401**、Google 适配器与邮箱登录落到**同一账号**（`login_identities` 两条 provider 记录，审计含 `identity_registered` → `email_login` → `identity_linked` → `google_local_login`）。

新增 `test/auth_test.dart` 7 项，含三种 delivery 口径必须可区分、登录失败不得留下会话凭证、登出失败也要清本地凭证。

### 已完成：Flutter P1 五项（2026-09-11）

全部从「有界面、不落服务端」改为真实写入，并在 `data/airvana.db` 验证到行。

| 能力 | 实现 | 实库证据 |
| --- | --- | --- |
| 删除账号 | 页面原先只有说明文案、**连提交按钮都没有**；新增状态读取 + 输入「删除账号」二次确认 + 提交/取消 | `account_deletion_requests` 一条 `cancelled`（提交 202 → 幂等重提 → 取消 200），审计含 `deletion_requested` / `deletion_cancelled` |
| 内容举报 | 新增理由选择表单（服务端白名单 6 选 1），Feed 与运行页共用；本地试玩先幂等登记为服务端内容再举报 | `content_reports` 一条 `misleading/open`，复报返回 `already_reported` 且**不产生第二行**；自动建 `user_report_misleading` 风险案 |
| 客服工单 | 「保存意见反馈」改为「提交客服工单」，真实建单；新增「我的工单」显示服务端状态与平台回复 | `support_tickets` 一条 `bug/open` |
| 创作者资格 | 新增申请弹窗（说明 ≥20 字 + 地区 + KYC 授权），提交失败则**不推进本机状态** | `creator_applications` 一条 `kyc_pending/CN`，说明过短被 400 拒绝，重复提交幂等 |
| 会话管理 | 设置页新增「登录设备」卡片，列出有效会话并可逐个撤销 | `/api/account/sessions` 返回真实会话，撤销走 `account.session_revoked` 审计 |

**刻意的设计取舍**：这五项都是用户以为「已经提交」的**写入类**动作，一律**不做静默降级**，失败必须显式报错。桥接降级只适用于展示类读取（如创作者中心、工单列表、会话列表），把写入失败伪装成本地成功才是真正危险的。

**过程中发现的两个问题**：
1. `dropdownButtonFormField` 用 `initialValue` 不存在（Flutter 3.32 为 `value`）——编译期拦截。
2. 测试里 `http.Response` 缺 `charset` 时按 **latin1** 编码 body，含中文的 mock 响应直接抛异常，表现为「无法连接服务」的误导性错误。真实服务端返回 `utf-8`，属测试夹具缺陷，已在 helper 里统一声明 charset。

新增 `test/account_services_test.dart` 13 项；另修正 3 条锁定旧口径的断言（`当前为前端演示模式`、`保存意见反馈`、`local-record`），并加反向守卫防止回退。

### 已完成：Flutter 运行证明与真实 AIP（P0）

Flutter 原先玩游戏**只记本机 AIP**，不产生任何服务端运行证明——整个经济模型入口在 Flutter 端是断的。

实现（与 `local-api-bridge-v1.js` 同构）：`openRuntimeProof` 在游戏**真正开始**时登记本地试玩为服务端内容（幂等）、开运行会话、发 `playable_start`；`completeRuntimeProof` 在有效完成时补 `step_complete` + `playable_complete`。任一步失败返回 null 静默降级，本地演示文案原样保留。

**真机测试抓到的真实缺陷**：最初把三步在结束时一次性连发，服务端返回 `too_fast`、AIP 为 0，
并自动建 `impossibly_fast_completion` 风险案（score 65）。原因是服务端以 `playable_start`
事件时间为计时起点，最短 2 秒（`RUNTIME_MIN_DURATION_MS`）。**批量补发不只是拿不到奖励，
还会给用户刷风险案。** 改为会话式后实库对比：

| | AIP | 风险案 |
| --- | --- | --- |
| 批量补发（0 秒） | 无 | `impossibly_fast_completion` 1 条未结 |
| 正确时序（3 秒） | `registration_first_play` 100 + `playable_complete` 5，均 posted | 0 |

`flutter test` **134/134**、`flutter analyze` 0 issue；新增 `test/server_runtime_proof_test.dart` 7 项，
含 `too_fast` / `daily_duplicate` / `ineligible` 不得判为已入账、以及三处失败点的静默降级守卫。

### 真机运行（iOS 实机，非模拟器）

一次完整流程，四个坑都必须处理，缺一个就跑不起来：

1. **服务端要监听局域网**：默认 `npm start` 只绑 `127.0.0.1`，手机访问不到。用 `npm run start:lan`（= `HOST=0.0.0.0 node server.mjs`）。
   > 该端口带 demo 登录（`allowDemo` 开发态默认开），绑 `0.0.0.0` 等于把创建创作者会话的能力和本地 SQLite 数据暴露给整个局域网。只在可信网络下用，用完切回 `npm start`。
2. **App 要指向 Mac 的局域网 IP**，不能是 `127.0.0.1`（那是手机自己）：
   `ipconfig getifaddr en0` 取 IP，然后 `--dart-define=AIRVANA_API_BASE_URL=http://<Mac IP>:8082`
   > **不要**再加 `--dart-define=AIRVANA_PREFER_LOCAL_DATA=false`。这个开关会让**所有**页面改读服务端，
   > 而服务端没有那套本地演示内容（38 款游戏、增长节点、作品库），整个 App 会显示成空的。
   > 创作者中心的五个模块已单独绕过该开关，始终尝试服务端并静默降级，因此默认构建就能同时拿到
   > 「本地演示内容 + 服务端真实创作者数据」。
3. **必须打 release 包**。iOS 14+ 不允许 debug 版在无调试器附着时独立运行；从桌面点图标会直接 `signal 11` 闪退，日志是
   `Cannot create a FlutterEngine instance in debug mode without Flutter tooling or Xcode.`
   要么 `flutter run -d <device>` 保持连线调试，要么 `flutter build ios --release` 后装机独立运行。
4. **Info.plist 两个键**（已补，勿删）：`NSLocalNetworkUsageDescription`（iOS 14+ 访问局域网必需，缺失会被静默拦截）、`NSBonjourServices` = `_dartVmService._tcp`（缺失时真机构建脚本报 `No value at that key path: NSBonjourServices`）。

命令：

```bash
npm run start:lan                       # 仓库根目录
cd apps/airvana_mobile
flutter build ios --release \
  --dart-define=AIRVANA_API_BASE_URL=http://<Mac IP>:8082
xcrun devicectl device install app --device <UDID> build/ios/iphoneos/Runner.app
xcrun devicectl device process launch --device <UDID> ai.airvana.airvanaMobile
```

**已知构建故障**：`flutter build ios` 偶发 `Failed to codesign ... Flutter.framework` / `resource fork, Finder information, or similar detritus not allowed`，原因是 macOS 的 `com.apple.provenance` 扩展属性。修复：`xattr -cr build` 后重建（必要时一并清 Flutter SDK 缓存 `bin/cache/artifacts/engine/ios`）。

**验收**：在手机上打开「创作者中心」，`data/airvana.db` 的 `sessions` 与 `audit_logs` 会出现新的 `auth.demo_login`（首页等其它页面走本地演示数据，不会发请求）；创作者中心若显示「未接入」则说明请求没到服务端，查防火墙、网段与上面第 1/2 条。

### 2026-09-10 变更

1. **「关于我们」由弹窗改为独立二级页**：`/profile/secondary/about`，内容与 Web 端对齐（产品定位 / 版本 / 官方渠道 / 安全提示）；未开通的媒体渠道显示「即将开放」，官网只复制地址（未引入 `url_launcher`，不假装打开浏览器）
2. **创作者中心融合五个模块**（对标 Soul，全部接服务端真实数据，一次 `/api/bootstrap` 派生）：
   - `创作周报` → 运营数据 tab 置顶：本周发布、本周获得 AIP 由真实行按 7 天窗口算；曝光/粉丝/获赞**增量**需要历史快照，服务端只存总量，因此如实标注为不可得而不是编数字
   - `创作激励` → 运营数据 tab：真实 `point_events` 入账 + 生效中的 `content_boosts`（Boost 记为负数）
   - `创作灵感挑战` → 运营建议 tab：真实 active Campaign，展示单条奖励/剩余预算/剩余天数替代虚构「热度」；「去参与」真实写 `campaign_participants`
   - `成长计划奖励任务` → 增长体系 tab：进度由真实对象判定（已发布内容 / moderation passed / engagement_events / campaign_participants），每条标注依据；明确不自动发 AIP
   - `创作学院` → 增长体系 tab 底部：只指向应用内真实规则页，不虚构课程目录
   - 派生逻辑集中在 `lib/features/creator_center/domain/creator_center_snapshot.dart`（纯函数，7 项单元测试覆盖）；服务端不可用时返回 `CreatorCenterSnapshot.offline`，UI 显示「未接入」而不是本地估算值

### 移动端遗留

- 创作者中心「核心指标」区块仍是写死的演示值（`'128'` / `'512'` / `'86'` / `'0 · 待接入'`），现在紧挨着真实的创作周报，口径上不一致，建议后续用真实数据替换或移除

## 仓库与提交（务必先看）

- **Git 仓库根是 `airvana-v5-fullstack/`，不是外层 `Airvana_APP_v1.0.0_loopit_hifi/`。**
  外层目录也是一个 git 仓库，但零提交、无远程；在那里操作 git 推不上去。
- 远程：`https://github.com/renlijunR7/Airvana_APP_loopit`（分支 `main`）

### 提交 `5db7a0a` 的内容与其信息不符

`5db7a0a feat: replicate Web game catalogue into Flutter (38 to 51 playables)`
共 **1877 文件 / 32 万行**，实际同时包含**两条互不相关的工作线**：

1. 信息里写的：Web 游戏目录复刻到 Flutter（38 → 51 个 playable）；
2. **信息里没写的**：Flutter 服务端全面接线——运行证明与真实 AIP、P1 五项
   （删除账号 / 举报 / 工单 / 创作者资格 / 会话管理）、真实登录与登出、
   P2 六项（Boost / 素材授权 / AI 分身 / 订阅 / 钱包地址 / 未成年人模式）、
   退出登录不生效的修复、发现页封面与生成封面、全屏登录页。

按第 2 条找改动时，不要按提交信息搜，直接按文件路径查：
`lib/features/account/`、`lib/features/creator_center/`、`lib/design_system/generated_cover.dart`、
以及测试 `auth_test` / `signed_out_test` / `account_services_test` /
`platform_services_test` / `server_runtime_proof_test` / `generated_cover_test` /
`sign_in_screen_test` / `discover_covers_test`。

该提交已推送，不再改写历史。后续提交请一条工作线一条 commit。

## 开发铁律（务必遵守）

- **桥接降级**：所有服务端调用失败必须静默降级回本地演示；只有服务端真实返回才标 `server_confirmed`
- **验收标准 = 实库出现真实记录**，不是"测试通过"
- 移动端演示行为测试依赖「harness 无 fetch → 桥接自动禁用」，改桥接时不要破坏
- AIP 不可提现/转让/交易；AIT 无全局兑换率；Contract 锁定字段变更须走变更单，旧版本只读保留
- 第三方（邮件 / OAuth / KYC / 外部发布 / 链上 / 支付 / 推送）只标注边界，不伪造成功
- 版本号三处一致：`build-apk.sh` 的 versionCode/versionName/产物名 + `MainActivity` 的 `app-version` + `index.html` 的 `nativeApkVersion`

## 本轮新增（2026-08-31 · 第三轮）

**实验分支已真正作用于成品运行时**（上一轮遗留的第 1 号待办已关闭）：

1. 新增 `src/experiments.mjs`：分桶解析、可优化字段白名单、真实分配统计的单一来源；`/api/experiments/:id/assignment` 与投放层复用同一套逻辑
2. `/content/:id` 投放期解析分桶并注入 `globalThis.__AIRVANA_VARIANT__`；成品内 `applyVariant()` 真实消费 5 个字段：
   - `title` / `hook` → 改写标题与首屏文案（同时改 `document.title` 与 DATA）
   - `coverStyle` → 写入 `data-cover-style`，取值为合法颜色时改 `--accent`（成品配色已改为走该变量）
   - `interactionOrder` → 支持 `reverse` 或 `3,1` 式索引重排 sections
   - `difficulty` → 真实改变通关所需检查数（easy/normal/hard → 1/2/3）
3. **不破坏的三件事**：存量成品 `html_text` 与 `checksum` 不变（注入只在投放副本）；运行证明链恒为 `playable_start → step_complete → playable_complete`；旧成品（manifest 无 `variantAware`）不注入，工作台如实提示而不是假定生效
4. **缓存正确性**：内容存在 running 实验时 `/content/:id` 返回 `private, no-store` + `Vary: Cookie`；无实验时恢复 `public, max-age=60`
5. **边界**：匿名访问不分桶、不注入、不落记录；实验 paused 后立即停止影响投放
6. 工作台展示真实分支分配数（对照 N / 实验 N）与 `runtimeVariantAware`；旧的「待接能力」文案已删除，测试加了反向守卫防止回退
7. 顺带修掉根目录 `.claude/launch.json` 里 `cwd` 与 `--prefix` 同时存在导致路径拼两次、dev server 起不来的问题
8. **实库验证**（`data/airvana.db`）：`experiments` 新增 1 条（hook 字段、100% 放量）、`experiment_assignments` 新增真实分配、最新成品 `manifest.variantAware=1` 且 checksum 自洽无注入残留；浏览器实测首屏副标题变为实验值、点击通关三事件齐全且保留奖励资格

## 剩余待办

1. **Web 端体积深化**：`public/` 127 MB 中 ai-twin 仍占 81 MB；若要 Web 也降到 100 MB 以下需外置 HeyGen 样片
2. **法律文本律师复核**：主体 Cerdar Ai Limited（BVI）已填入，上线前需目标法域律师意见
3. **实验效果度量（可选）**：分支已真实投放，但还没把运行/互动数据按分支聚合成对照报表；没有统计口径前不展示"哪个分支更好"的结论
4. **边界项**：真实第三方接入、生产基础设施（PostgreSQL / 队列 / 对象存储 / CI/CD / 监控）

## 关键文件索引

| 用途 | 路径 |
| --- | --- |
| 需求唯一依据 | `docs/Airvana-全项目结构化需求清单-v3.0.md`（v3.1 内容） |
| 历史审计对照 | `docs/Airvana-未完成功能闭环审计-v3.0-代码实测版.md` |
| 服务端路由 | `src/app.mjs` |
| 数据表 | `src/db.mjs` |
| 经济模型 | `src/economy.mjs` |
| 灰度分桶 | `src/experiments.mjs` |
| 移动端 | `public/index.html` + `public/boot.js` |
| 服务端桥接 | `public/local-api-bridge-v1.js` |
| 国际化 | `public/i18n-v1.js` |
| 工作台 | `public/app.js` |
| APK 构建 | `android-demo/build-apk.sh` |
| 图片原图备份 | `assets-original/`（已 gitignore，重压可回滚） |
