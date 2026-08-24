# Airvana 38 款游戏内部美术系统 v1

状态：`LOCAL_DEMO`
范围：项目内 38 款本地可玩游戏的运行时背景、玩法族徽记、材质层和 HUD 视觉一致性。

## v2 运行时沉浸素材纠偏

v1 只接入了场景背景、材质与玩法徽标，车辆、敌人、道具等核心对象仍由基础 Canvas 几何图形绘制，不能作为保真游戏素材验收结果。

v2 新增 `public/assets/games/immersive-art-v2/`：

- 12 个 ImageGen 生成的生产级玩法精灵包；
- 每包 6 个角色、载具、敌人、道具或特效单元；
- 38 款游戏按玩法家族按需加载，不在首页预加载；
- Complete 与 Deep 两套运行时均在真实 Canvas 交互层绘制精灵；
- 场景遮罩降低，保留高保真玩法背景的可见度；
- 赛车、射击、防守、捕鱼等核心对象不再只依赖矩形或多边形占位图。

素材仍为 `LOCAL_DEMO`，正式商业发布前需要品牌、渠道和资产授权复核。

## v3 独立场景与定向精修

v3 新增 `public/assets/games/dedicated-scenes-v1/`：

- 为原先回退商店封面的 17 款游戏补齐独立玩法场景；
- 对 `star-mower`、`deep-catch`、`void-squadron`、`pulse-forge`、`studio-wardrobe`、`microbe-arena`、`crystal-bastion` 进行非破坏式视觉精修；
- 38 款游戏现在全部解析到独立 `gameplay-art`，商店封面回退数量为 0；
- 24 张新增/精修图的源文件、运行图、尺寸和 SHA-256 记录在 `public/assets/games/dedicated-scenes-v1/manifest.json`；
- 自动评测只授予 `technical_review_passed`，外部或商业发布仍为 `pending_human_release_approval`。

## 素材规划

- 38 款游戏全部使用独立玩法背景，不再使用应用市场封面作为运行时降级背景。
- 12 类玩法族使用一套 4×3 透明徽记图集与一套 4×3 材质图集。
- 「果园合合塔」保留独立水果图集和果园背景，作为精细对象美术基准。
- 图集只负责视觉主题，不改变三阶段状态机、成功、失败、重试、暂停和退出逻辑。

## 玩法族

| 玩法族 | 代表视觉 | 覆盖游戏数 |
|---|---|---:|
| 安全判断 | 盾牌 | 1 |
| 自然经营 | 幼苗 | 4 |
| 移动挑战 | 跑鞋 | 5 |
| 观察收集 | 星杯 | 4 |
| 节奏演奏 | 音垫 | 3 |
| 造型创作 | 戏剧面具 | 2 |
| 叙事推理 | 信封 | 3 |
| 潜行探索 | 猫爪 | 1 |
| 旅行交换 | 金币 | 2 |
| 水域生态 | 鱼钩 | 3 |
| 太空行动 | 飞船 | 3 |
| 策略防守 | 城堡 | 7 |

## 运行时结构

```text
game-art-system-v1.js
  -> gameKey
  -> gameplay family
  -> dedicated gameplay background (38/38)
  -> emblem atlas cell
  -> material atlas cell
  -> CompleteGame / DeepGameBase
```

所有素材加载失败时继续使用原有 Canvas 色彩和几何绘制，避免素材失败导致游戏不可玩。

- `/game-art-system-preview.html` 是 38 款素材目录，直接读取运行时映射。
- `/game-art-runtime-validation.html` 会逐款挂载引擎并检查画布输出。

## Figma 交付

- 文件：`WA3MynAwQekRNIY1s7cWX3`
- 页面：`Game Art System · 38 Titles`（`5:2`）
- 根节点：`5:3`
- 12 个玩法家族卡片组件，38 个游戏实例。
- 组件页已完成；浏览器像素级对照导入在 Figma Starter MCP 调用上限处暂停，未将其误标为完成。

## 完成标准

- 38 个 `gameKey` 都能解析到独立 `gameplay-art` 和玩法族图集单元，商店封面回退为 0。
- 两套运行时图集存在、可加载且图集索引有效。
- 32 个 Complete Games（含「果园合合塔」）与 6 个 Deep Games 均接入统一美术系统；「果园合合塔」继续使用独立精细对象素材。
- 360×800、390×844、430×932 无横向溢出，游戏画布可交互。
- 成功、失败、暂停、重试、退出和审计事件行为不因美术层改变。

## 边界

本次不增加品牌声明、CTA、奖励、归因或结算字段，不代表商业 Campaign 已批准。ImageGen 资产仅用于本机演示；外部发布前需要人工美术、授权和合规审核。
