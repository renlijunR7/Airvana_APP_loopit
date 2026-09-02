# ADR-001：Flutter 移动架构与受控 Playable Runtime

- 状态：Accepted for migration
- 日期：2026-08-27
- 当前交付级别：`LOCAL / DEMO`

## 背景

现有 Airvana 前端为 H5，Android 与 iOS 外壳主要承载静态资源。Node.js 服务端已经具备本地登录、内容发布、Runtime Session、顺序事件证明、体验去重、AIP 本地账本和审计记录。移动端重构不能在 Flutter 内另造一套“成功状态”，也不能把本机演示描述成生产发布。

## 决策

1. 在 `apps/airvana_mobile` 建立独立 Flutter 应用，旧 H5 与现有原生 Demo 外壳继续保留，迁移期间可并行验证和回滚。
2. Flutter 使用 Feature-first 分层：`app / core / design_system / features / shared`。
3. 页面状态由 Riverpod 管理，导航使用 GoRouter；API、存储和 Runtime 通过 Repository 接口隔离。
4. Node.js 服务端继续作为本地数据事实源。Flutter 不复制发布、奖励、审核或完成状态。
5. 可玩内容通过受控 WebView 承载：
   - 仅允许配置的 Airvana 同源地址；
   - 外部跳转默认拒绝；
   - JS Bridge 采用版本化 JSON 白名单；
   - Bridge 只接收运行状态回执，不执行任意脚本，也不代替服务端事件证明；
   - Session Cookie 通过安全存储保留并注入 WebView。
6. 第一条迁移纵切为：`本地演示登录 → 首页作品 → 进入可玩成品 → 服务端 Runtime 事件 → 体验记录`。

## 商业与治理边界

- 本阶段不接真实支付、KYC、结算、外部连接器或应用市场生产服务。
- Campaign 生产流程仍必须从 `Campaign Brief → 经批准且版本化的 Campaign Contract` 开始。
- 品牌声明、奖励、CTA、地区、归因、结算和 Kill Switch 属于锁定字段，Agent 与 Flutter 客户端不得擅自修改。
- 预览成功不等于审核通过，审核通过不等于全网发布成功。
- 网络、权限或服务端状态不明确时 Fail Closed，不显示虚假成功。

## 第一批完成标准

- 首页只展示服务端已发布且具有 ready Artifact 的作品。
- 进入作品后 WebView 只能加载 Airvana 同源 Runtime。
- `playable_start → step_complete → playable_complete` 由服务端校验；客户端刷新或重复操作不能制造重复奖励。
- 完成后体验记录可查询，并与相同 `content_id` 对齐。
- API 离线、空数据和失败都有明确状态及重试入口。
- Bridge 非法版本、非法类型、超长内容与非同源导航都有自动化测试。
- Flutter analyze、test 与 Android debug build 通过后，才能将该纵切标记为已迁移。

## 非目标

- 本 ADR 不宣布旧 H5 已下线。
- 不宣布真实服务端、真实登录、真实 Campaign 发布或应用市场上线完成。
- 不在 Flutter 端实现账本真相、审核真相或商业授权真相。

