# 原游戏 UI 素材提取与实图映射

来源：http://game.zhongyigames.com/jizhan/ ，2026-09-08 下载。公开资源来源记录不构成开放许可；本次未取得新的公开重分发许可，素材不标记为 CC0。

本目录完全来自指定原站公开资源；未使用第三方替代素材。只读取 JSON、PNG，未执行原站项目脚本或 SDK。UI 文件来源是 `assets/UI/config.json` → import pack SpriteFrame → Texture2D → native PNG。

## 当前随游戏提供的目录

`selected/`：42 个按用途命名的原图 PNG。`selected/mapping.json` 可追溯到原始资源路径。

| 用途 | PNG | 尺寸 / 说明 |
|---|---|---|
| 绿色队伍人数卡 | selected/squad-card.png | 228×328；包含原版蓝衣小队插画、绿色底板 |
| 橙色金币加成卡 | selected/coins-card.png | 221×269；包含原版纸币与橙色底板 |
| 紫色巨人助力卡 | selected/giant-card.png | 231×363；包含原版盾牌巨人插画、紫色底板 |
| 三张卡的原字体标题 | selected/squad-title.png / coins-title.png / giant-title.png | 实图分别为“队伍人数”“金币加成”“巨人助力” |
| 关卡标题 | selected/level-title.png | 原版黄色“关卡”二字 |
| Lv 前缀 | selected/level-prefix.png | 原版黄色“Lv:” |
| 卡片价格底板 | selected/price-frame.png | 原版黄色圆角价格条，116×38 |
| 顶部金币底板 | selected/wallet-frame.png | 深色金额背景，172×46 |
| 纸币 | selected/currency.png / currency-small.png | 原版绿色钞票，62×64 / 42×43 |
| 签到入口 | selected/sign-icon.png | 含签到文字与剪贴板，102×98 |
| 武器入口 | selected/weapons-icon.png | 含持枪人物与武器文字，103×128 |
| 转盘入口 | selected/wheel-icon.png | 含转盘文字和轮盘，103×100 |
| 设置入口 | selected/settings-icon.png | 蓝底白色齿轮，74×72 |
| 奖励 / 加号 | selected/reward-icon.png / add-icon.png | 原版纸币紫底图标 / 白底加号 |
| 新手提示手势 | selected/hand.png | 白色手，119×114 |
| 左右拖动指示线 | selected/swipe-arrows.png | 双向白箭头，476×88 |
| 引导循环光圈 | selected/hint-loop.png | 原版发光 ∞，389×196 |
| 引导手 | selected/hint-hand.png / touch-hand.png | 原版有描边手 / 白色向下手 |
| 通用按钮底图 | selected/button-orange.png / button-blue.png / button-purple.png / button-yellow.png | 不带文字的原版按钮底板 |
| 继续游戏 / 重新开始 | selected/resume-button.png / restart-button.png | 带原版文字的完整绿按钮 |
| 关闭 / 返回 | selected/close-button.png / back-button.png | 原版红色叉 / 蓝色返回箭头 |
| 设置开关 | selected/setting-on.png / setting-off.png | 原版“开”“关”按钮 |
| 实际转盘 | selected/wheel.png / wheel-arrow.png / wheel-title.png | 原版八格货币转盘及指针、标题 |
| 签到面板 | selected/sign-panel.png / sign-day-frame.png / sign-today-frame.png / sign-claimed.png | 原版七日签到外框、格子、高亮、已签标记 |

**使用注意：** 三张卡片的 PNG 原始高度不同，是角色/纸币上凸与底板构图造成；不要统一拉伸到相同图像宽高比。图中只包含卡面美术，等级、价格与标题应按原布局覆盖。任何将 `font_attack` 按英文名解释为“攻击力”的做法都不正确，实图是“巨人助力”。`winui/font_continue@2x` 实图是“分享”，不要仅按文件名判定文案。

## 完整提取与元数据

- `sprites/`：205 个从三张原图集提取出的 SpriteFrame，保留原游戏目录名。
- [manifest.json](manifest.json)：每张图的原始路径、UUID、atlas、矩形、旋转、原始尺寸、偏移与来源 URL。
- [selected/mapping.json](selected/mapping.json)：42 张精选图的用途文件名与原始资源路径映射。
- 完整 CSV 映射表仅保留在项目工作目录 `work/original-ui/mapping.csv`。
- 原图集仅保留在项目工作目录 `work/original-ui/`：`14eb2c5c3.png`（1809×1808）、`1f0709741.png`（2048×2048）、`1fca82b4d.png`（939×944）。
- 原 import JSON、`config.json` 和本地编写的 `extract.py` 也仅保留在 `work/original-ui/`，不属于本交付目录中的运行资源。

提取方法：按 SpriteFrame rect 从原图集裁切；rotated=true 的条目交换裁切宽高后逆时针还原 90°；再按 originalSize 和 offset 补回透明留白。没有重绘、AI 生成或色彩替换。

## 数字字形

`fonts/` 里为直接从原站 native 下载的六条数字字体图，每条按从左至右 0–9 排列；`fonts/digits/<字体名>/0.png` 至 `9.png` 是按固定等宽字格切出的独立数字。

| 字体 | 整图尺寸 | 单字格 | 实图 |
|---|---:|---:|---|
| number_gold | 260×26 | 26×26 | 白色紧凑货币数字 |
| UI_shuzi_002 | 400×44 | 40×44 | 白色手写数字 |
| font_white | 1000×126 | 100×126 | 黑描边白色大数字 |
| cost_font_gold | 200×20 | 20×20 | 小号浅黄价格数字 |
| font_level_lnumber | 220×22 | 22×22 | 绿色小数字 |
| fonr_sign | 220×22 | 22×22 | 白色签到数字 |

六个 native 来源 URL 在 [font-downloads.json](font-downloads.json)。图像均成功解码为 PNG，非网页错误页。

## 已做的实图校验

提取时已打开并检查以下预览，确认切图方向正确、透明背景保留、文字和角色可辨认。预览文件仅保留在项目工作目录 `work/original-ui/`：

- `home-contact-sheet.jpg`：全部首页卡片与入口；三张卡片确实是原版蓝衣警察、钞票与盾牌巨人。
- `common-contact-sheet.jpg`：手势、双箭头、货币、返回/关闭按钮。
- `sign-contact-sheet.jpg`：签到图标、格子、已签、七日礼包。
- `buttons-contact-sheet.jpg`、`all-buttons-contact-sheet.jpg`：实际按钮外形及文字。
- `fonts-contact-sheet.jpg`：六种数字条完整实图。
