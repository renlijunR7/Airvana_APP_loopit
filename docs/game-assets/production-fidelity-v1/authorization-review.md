# Airvana 游戏素材生产保真升级 v1 · 评测与授权审核

审核日期：2026-08-24
当前状态：`TECHNICAL_REVIEW_PASSED / BLOCKED_PENDING_HUMAN_APPROVAL`

## 交付范围

- 17 款原封面回退游戏已补齐独立玩法场景。
- 7 款低可读性素材已完成非破坏式精修，旧文件保留，新文件以 `refined-v1` 接入。
- 38 款游戏当前全部解析到独立 `gameplay-art`；商店封面回退数量为 0。
- 24 张源图与 24 张运行图的路径、尺寸和 SHA-256 已写入 `public/assets/games/dedicated-scenes-v1/manifest.json`。

## 17 款独立场景评测

| 分组 | game_key | 独立场景 | 玩法可读性 | 文字/Logo/水印 | 结果 |
|---|---|---|---|---|---|
| 安全/经营 | safety-workshop, stellar-farm, stardust-island | 通过 | 通过 | 无 | 通过 |
| 移动/收集 | pixel-quest, city-rush, red-cup-shuffle, galaxy-toy-shop | 通过 | 通过 | 无 | 通过 |
| 节奏/创作 | magic-choir, paws-stage, puppet-studio | 通过 | 通过 | 无 | 通过 |
| 叙事/潜行 | firefly-mail, whisker-escape | 通过 | 通过 | 无 | 通过 |
| 旅行/水域 | coin-journey, jungle-dive | 通过 | 通过 | 无 | 通过 |
| 太空/策略 | rift-strike, formation-knights, sky-cannon | 通过 | 通过 | 无 | 通过 |

## 7 款视觉精修评测

| game_key | 修复前问题 | 精修结果 | 结果 |
|---|---|---|---|
| star-mower | 泥灰、中央安全区和敌人来向不清楚 | 清晰椭圆安全区、三向进入路径、对比与材质分离增强 | 通过 |
| deep-catch | 暗部压死，手机上深度与捕捞区不清楚 | 暗部抬升、三层深度光带和中央捕捞环明确 | 通过 |
| void-squadron | 飞船过小、黑区过大、飞行通道不清楚 | 主机可读、中央走廊和三向敌方来向建立 | 通过 |
| pulse-forge | 节奏轨道与判定关系弱 | 四条发光轨道、几何音符和判定线建立 | 通过 |
| studio-wardrobe | 摄影质感与风格化运行时不统一 | 统一为高保真 3D 游戏工作室，三套造型选择区明确 | 通过 |
| microbe-arena | 静态培养皿、核心对象过小 | 中央出生区、三类目标环和两方大型微生物明确 | 通过 |
| crystal-bastion | 暖灰占位感强，路径与塔位层级不足 | 三路路径、六个塔位和晶体能量层级明确 | 通过 |

## 自动化与运行时证据

- `node --test test/game-art-system-v1.test.mjs test/game-assets-manifest-v1.test.mjs`：8/8 通过。
- 38 个 `gameKey`：38/38 运行挂载通过；12 类玩法均有代表性 Canvas 采样。
- 360×800、390×844、430×932：均无横向溢出；每档 38 条结果、0 条失败；12 个代表性 Canvas 均有有效尺寸。
- 浏览器控制台：0 条 warning/error。
- 所有新增运行图统一为 941×1672 JPEG；源图保留为无损 PNG。

## 来源与授权边界

- 生成来源：OpenAI 内置 ImageGen。
- 参考边界：17 款只使用项目内封面作题材与色板参考；7 款只编辑项目内既有玩法图；未使用第三方游戏截图、角色、Logo、UI 或商标。
- 自动化审核能力上限：只能确认文件、视觉、运行时和清单技术门禁，不能代替权利人或商业发布审批。
- 当前允许：Airvana `LOCAL_DEMO`、项目内评审和技术验证。
- 当前禁止：外部投放、商业 Campaign、商店发布、品牌背书或授权完成声明。

## 发布前人工审核清单

- [ ] 美术负责人确认画风、构图和逐张瑕疵。
- [ ] 品牌/IP 负责人确认视觉来源与商标边界。
- [ ] 渠道/商店负责人确认分发与 WebView 要求。
- [ ] 法务与合规确认商业使用、地区与广告政策。
- [ ] Release Owner 在 `release-gate.json` 中记录姓名、时间和批准版本。

任一项未完成时，发布状态必须保持 `blocked_pending_human_approval`。
