# 第三方素材与授权记录

## JanaChumi · Isometric city

- 作者：JanaChumi
- 官方发布页：https://opengameart.org/content/isometric-city-0
- 原始压缩包：https://opengameart.org/sites/default/files/IsometricPack_ByJanaChumi_0.zip
- 发布页标注许可证：CC0 1.0 Universal
- CC0 说明：https://creativecommons.org/publicdomain/zero/1.0/
- 原始压缩包 SHA-256：`d7376663fd7d09c4cfd25a3fe3b373ce19a7d4402a5b585cb0ee98b29bd2ed3e`
- 授权核验日期：2026-09-03（Asia/Hong_Kong）
- 本地位置：`assets/vendor/janachumi-isometric-city-cc0/`

OpenGameArt 发布页将该素材包标记为 CC0；Creative Commons 的 CC0 说明允许复制、修改、分发和商用，无需另行申请许可。CC0 不授予商标、形象或隐私权，也不代表作者对本项目背书。

## Web3 Icons · Huobi Token（HT）图标

- 作者/维护者：0xa3k5 与 Web3 Icons contributors
- 项目地址：https://github.com/0xa3k5/web3icons
- 固定来源：`@web3icons/core@4.0.51` 的 `tokens/branded/HT.svg`
- 下载地址：https://unpkg.com/@web3icons/core@4.0.51/dist/svgs/tokens/branded/HT.svg.js
- 项目许可证：MIT
- 授权核验日期：2026-09-15（Asia/Hong_Kong）
- 本地位置：`assets/vendor/web3icons/HT.svg`
- 本地图标 SHA-256：`31f8ad03da31f734fe7eae061b3545f6892a4b895fbbb1eead0ce8adf8231e72`
- 许可文本：`assets/vendor/web3icons/LICENSE.txt`

运行时把该矢量图标叠加到降落伞纪念 Token 的实体币面上，不请求远程资源。MIT 许可证覆盖素材文件的复制与使用，但不自动授予“Huobi”“火币”“HTX”相关商标、联合营销或真实空投资格；当前仅用于明确标记为 `DEMO / LOCAL` 的本地预览，生产使用仍需品牌方与合规审批。

## 游戏内使用映射

| 游戏位置 | 素材文件 |
|---|---|
| HTX 旗舰大楼 | `building2.png` |
| 视频剧院 | `shop0.png` |
| 直播广场 | `building0.png` |
| 答题学院 | `school0.png` |
| 行情预测馆 | `building1.png` |
| TG 社群会所 | `purpleHouse.png` |
| 砖块商店 | `shop1.png` |
| 粉丝纪念广场 | `fountain.png` |
| 地图树木 | `tree0.png` 至 `tree4.png` |

运行时只加载上述本地 PNG，不向 OpenGameArt、Creative Commons 或其他第三方发起网络请求。素材包中的道路、地块、湖面、建筑与环境元素一并保留，方便后续继续扩充小镇。

## Live2D Cubism SDK for Web 5-r.5 · 官方示例 Mao

- 权利方：Live2D Inc.
- 来源：Cubism SDK for Web 5-r.5 中随附的 `Samples/Resources/Mao`
- 本地位置：`assets/live2d/mao-runtime/`
- 模型类型：真实 Cubism `.moc3`，包含纹理、物理、动作、表情、眨眼与嘴型参数
- Mao 资源清单 SHA-256：`76b41ae8b98012df6bcddf71a1bcdad50039de201f4d7e1b242e4f25f1b2707a`
- 使用范围：本地 Live2D 技术预览；运行时不请求远程脚本、模型或纹理
- 身份边界：这是官方示例 Mao，不是 Luna，也不得作为 Luna 数字孪生展示
- 生产边界：正式发布仍须按随附许可证和模型条款复核；经授权的 Luna 原画、分层建模、`.moc3`、动作和表情尚未提供

完整许可和通知保留在 `assets/live2d/mao-runtime/legal/`：`CORE-LICENSE.md`、`FRAMEWORK-LICENSE.md`、`SDK-LICENSE.md`、`MODEL-NOTICE.md` 与 `NOTICE.md`。资源门禁文件 `Resources/Mao/RESOURCE_SLOT.json` 将 Mao 固定为官方 Free Material 示例，并禁止把它表示为其他人物。
