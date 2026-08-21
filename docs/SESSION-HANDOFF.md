# Airvana 开发交接（2026-08-21 · 第二轮）

> 新会话请先读本文件 + `docs/Airvana-全项目结构化需求清单-v3.0.md`（v3.1 内容），即可接续工作。

## 项目与运行

- 目录：`airvana-v5-fullstack`（Node + SQLite 本地全栈，无第三方依赖）
- 启动：`npm start` → 移动端 `http://127.0.0.1:8082/`，工作台 `/workspace`
- 测试：`npm test`（298/298）、`npm run verify`（30/30）
- 缩放调试：`/?display-scale=0.7`

## 当前基线

| 维度 | 值 |
| --- | --- |
| 后端路由 | 125 条（**121 已接线**；未接 4 条 = 全部为退役 410 路径，无后门） |
| SQLite 表 | 69 张 |
| 移动端接入端点 | 46 个（当日之前为 10 个） |
| 桥接方法 | `public/local-api-bridge-v1.js`，约 56 个 |
| 测试 / 校验 | **298 / 298**，30 / 30 |
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

## 开发铁律（务必遵守）

- **桥接降级**：所有服务端调用失败必须静默降级回本地演示；只有服务端真实返回才标 `server_confirmed`
- **验收标准 = 实库出现真实记录**，不是"测试通过"
- 移动端演示行为测试依赖「harness 无 fetch → 桥接自动禁用」，改桥接时不要破坏
- AIP 不可提现/转让/交易；AIT 无全局兑换率；Contract 锁定字段变更须走变更单，旧版本只读保留
- 第三方（邮件 / OAuth / KYC / 外部发布 / 链上 / 支付 / 推送）只标注边界，不伪造成功
- 版本号三处一致：`build-apk.sh` 的 versionCode/versionName/产物名 + `MainActivity` 的 `app-version` + `index.html` 的 `nativeApkVersion`

## 剩余待办

1. **实验分支尚未作用于成品运行时**：分桶记录已是服务端权威，但成品渲染还没按 `variant/control` 切换；UI 已明确标注为待接能力，不伪造效果
2. **Web 端体积深化**：`public/` 127 MB 中 ai-twin 仍占 81 MB；若要 Web 也降到 100 MB 以下需外置 HeyGen 样片
3. **法律文本律师复核**：主体 Cerdar Ai Limited（BVI）已填入，上线前需目标法域律师意见
4. **边界项**：真实第三方接入、生产基础设施（PostgreSQL / 队列 / 对象存储 / CI/CD / 监控）

## 关键文件索引

| 用途 | 路径 |
| --- | --- |
| 需求唯一依据 | `docs/Airvana-全项目结构化需求清单-v3.0.md`（v3.1 内容） |
| 历史审计对照 | `docs/Airvana-未完成功能闭环审计-v3.0-代码实测版.md` |
| 服务端路由 | `src/app.mjs` |
| 数据表 | `src/db.mjs` |
| 经济模型 | `src/economy.mjs` |
| 移动端 | `public/index.html` + `public/boot.js` |
| 服务端桥接 | `public/local-api-bridge-v1.js` |
| 国际化 | `public/i18n-v1.js` |
| 工作台 | `public/app.js` |
| APK 构建 | `android-demo/build-apk.sh` |
| 图片原图备份 | `assets-original/`（已 gitignore，重压可回滚） |
