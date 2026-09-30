# 素材来源与授权说明

提取日期：2026-09-15

原作发行版本根地址：

`https://10ca02fd-a195-46e7-9011-40ff3b9fd112.gdn.poki.com/4880872c-7969-45ab-af22-6866671bbb8d/`

## 已打包的原作素材

### 赛车模型

- 本地文件：`assets/original/f1car-2026.glb`
- 原作相对路径：`assets/f1car-2026.glb`
- 大小：526,660 bytes
- SHA-256：`0b20da105369014b2525caecafe022d66b1e2fa55625deff5a1c6ab3ec7bb00b`
- glTF 2.0 二进制模型；本地版用它作为 8 辆赛车的共同基础模型，再通过本地材质、尺寸和程序化套件区分车型。

### 赛道与场景纹理

以下文件来自原作版本根地址的 `textures/` 目录，均保存在 `assets/original/`。10 张纹理都会在启动阶段预加载；当前日间赛道实际渲染使用标为“已使用”的 6 张，其余 4 张保留给后续场景变体：

- `asphalt.png` — 1024×1024，已用于路面
- `grass.png` — 1024×1024，已用于地面和远山
- `gravel.png` — 1024×1024，已用于缓冲区
- `crowd.png` — 1024×512，已用于看台观众
- `tree-broadleaf.png` — 768×768，已用于赛道树木
- `tree-pine.png` — 512×1024，已用于赛道树木
- `facade-day.png` — 512×1024，已预加载、当前未渲染
- `facade-night.png` — 512×1024，已预加载、当前未渲染
- `tree-palm.png` — 512×1024，已预加载、当前未渲染
- `scrub.png` — 512×512，已预加载、当前未渲染

### 游戏图标

- 当前使用：`assets/original/mini-gp-racers-logo.png`，1254×1254 PNG
- SHA-256：`436a9d9f0b0165487830154300b45400df78cbb0d3cb94ce8983dda9d3c428f7`
- 包中还保留了 `assets/original/mini-gp-racers-logo.jpg`，为 628×628 的 Poki CDN 优化版本；当前页面不使用该 JPG。

## 本项目实现的内容

- 首场赛道中心线采用从原作运行数据提取的 SPA 65 个控制点，本地归零后统一缩放至 0.25；道路网格、山体、护栏、广告牌、发车门架和场景物体布局由本地代码生成。
- 车辆颜色、尺寸、身份贴片和外观套件由本地代码施加在共同 GLB 模型上。
- 游戏规则、车辆控制、AI、HUD、车库、升级、存档与 Web Audio 声音由本项目实现。
- BTC、ETH、USDT、SOL、BNB、DOGE、USDC 拾取物图形由本项目在 Canvas 中绘制，只作为等值街机奖励标识，不接入钱包、行情或真实转账。
- 本地实现只按截图和运行时观察复现可见效果，因此不应描述为原作全部赛道、物理、界面或音频的完整 1:1 副本。

## 第三方库

- Three.js r158：`vendor/three.min.js`
- Copyright 2010-2023 Three.js Authors
- License：MIT；许可证声明保留在分发文件头部
- 官方项目：https://threejs.org/

## 权利状态

Mini GP Racers、Poki、Jiru Games、赛车模型、场景纹理、游戏图标及相关名称的权利归各自权利人所有。本地提取时未发现能够覆盖上述原作素材再分发或商业使用的公开许可证。当前打包仅用于本地复刻、比对和验收；任何公开发布、广告投放或商业分发都需要事先取得相关权利方许可。
