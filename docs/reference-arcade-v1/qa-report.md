# 截图灵感互动游戏批次：本地验收记录

验收日期：2026-09-07。交付范围：现有 Airvana H5 App 与独立试玩入口；不是生产发布或原生手机构建。

## 内容与美术

新增 8 款游戏，每款 3 关，共 24 关：首页及发现页优先展示。原有游戏保留。

| 游戏 | 核心互动 |
| --- | --- |
| 赤翼突围 | 拖动战机、弹幕躲避、编队与关底 Boss |
| 丰收小镇 | 种植、浇水、生长、收获、卡车订单 |
| 浮岛弹射队 | 拉弓弹射、刚体碰撞、建筑倒塌、有限弹药 |
| 口袋造城 | 建造、升级、人口、收入、地标目标 |
| 宝石方块工坊 | 拖放或点选放置、旋转、行列消除 |
| 环岛掷骰记 | 掷骰移动、格子事件、资源交易、地标建造 |
| 云端接龙 | 相邻点数接龙、遮挡解锁、抽牌、有限撤销 |
| 伙伴翻翻乐 | 角色记忆、翻牌配对、步数限制、提示 |

截图用于主题、玩法与构图参考。运行时采用独立的原创 Canvas 绘制和 SVG 封面，没有把截图当作游戏背景，也没有拷贝第三方 Logo、角色或原游戏素材。不同游戏保留各自的视觉体系；本轮未制作商业级完整 3D 素材包。

## 自动化验证

以下测试命令结果：244 项通过，0 项失败。

```sh
node --test --test-concurrency=2 test/reference-*.test.mjs test/physics-*.test.mjs test/active-classic-art-v1.test.mjs test/complete-games-v3.test.mjs test/deep-games-v2.test.mjs test/classic-scenes-v1.test.mjs test/classic-sprites-v1.test.mjs
```

- 8 款游戏的 24 个关卡均在真实浏览器宿主中通过；使用正常游戏操作、按钮事件和加速的固定步长模拟，没有直接修改生命、目标或通关状态。
- 浏览器通关流程覆盖下一关、最终完成与单次完成事件；新游戏独立页面未捕获到页面异常。
- 宝石方块在 360 × 800 独立页面及实际 App 容器内，另以浏览器原生鼠标点击、拖放完成全部 3 关，最终得分 1820。
- 8 款游戏分别检查 360 × 800、390 × 844、430 × 932 三档移动视口：无横向溢出；可见 DOM 操作按钮不小于 44 × 44；开始前与暂停后状态稳定。
- App 的紧凑游戏容器追加检查：方块棋盘实际单格约 50 × 45 CSS 像素，底部备选块不被控制栏遮挡。
- Campaign Contract 与 8 份 PlayableConfig 共 9 个 JSON 通过对应 schema 检查。
- 本地首页 HTTP 200，服务健康检查返回 ok。

浏览器证据位于仓库的 `output/playwright/`：`reference-complete-*.png`、`reference-*-{360,390,430}-final.png`、`reference-app-gem-full-complete.png` 等。

## 本轮修复

- 弹射最后一发命中后保留结算缓冲，避免建筑还在倒塌时提前判负。
- 正常 pointerup 与取消指针操作分离，修复方块点击选中状态被误清空。
- 放大方块棋盘、调整备选块托盘与宿主底部控制栏，适配 App 内较矮的画布。
- 失败事件使用规范中的 play_fail；关卡数量按每款定义动态处理。

## 本地与商业边界

按 Airvana 互动游戏规范先建立 Brief、草案 Contract、配置与素材来源记录。完成事件携带 `reference-arcade-local-v1`，只记录本地挑战分数。实际 App 完成记录确认：reward_issued、local_reward_recorded、server_confirmed 均为 false；金币与 AIP 演示奖励金额均为 0。

未发布到公网，未修改商业奖励权限；不代表生产验收或活动发布批准。移动验证使用桌面浏览器移动视口，尚未覆盖实体 iOS/Android 设备、原生 Flutter 构建、长期性能及所有随机游戏局面的穷举。
