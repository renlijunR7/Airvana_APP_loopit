# KOL 小镇互动游戏

这是根据 Claude Design 项目「KOL主题街区互动游戏」制作的高保真、本地静态可交互演示版。0.16.0 将玩家和 NPC 限制在经过采样校验的道路中心线导航网，发现越界路线时会直接阻止移动；地图玩家改为与主理人同体系的圆形居民头像，不再显示带白底的矩形换装卡。领取 HT 主题纪念 Token 时会播放吸入顶部钱包的动效，每枚同步增加 5 枚无价值虚拟砖块，并写入本地钱包收藏与砖块账本。0.15.1 的 176% 可拖动世界画布继续保留；这仍是本地演示，不代表火币或 HTX 品牌授权、赞助或真实空投。

主街区手机预览见 `preview-mobile.png`，素材升级版备份见 `preview-assets.png`。

## 直接运行

在 macOS 上双击 `启动游戏.command`，浏览器会打开：

`http://127.0.0.1:4173/`

如系统阻止首次双击，可在终端进入本目录后运行：

```bash
python3 server.py --port 4173 --host 127.0.0.1
```

然后打开上面的地址。停止服务时在终端按 `Control-C`。

页面按手机样式展示：真实手机上占满当前视口；桌面浏览器中使用居中的 430×932 手机画布，并限制在可用窗口高度内。

## 已实现

- 游客优先入口；账号创建、登录和服务端会话在当前静态前端中明确停用，不伪装为已完成
- Luna 小镇与 Vera 霓虹港两套完整主题
- 3 步主理人引导、等距街区地图和 8 栋可交互建筑
- 主街区采用 176% 放大的可拖动画布：建筑之间的视觉距离更大，可按住地图上下左右探索；拖动超过 7px 会抑制建筑点击，回中按钮、方向键与 Home 键可恢复或精确移动视野
- 玩家以独立居民身份进入 Luna 小镇：顶部显示玩家名称与居民等级，地图中以圆形居民头像和“我”徽标显示；头像使用独立头部锚点，第二排造型也会显示完整头部与发型；保存造型只更新玩家，完整服装只在居民形象页与室内展示
- Luna 是独立固定的 KOL 主理人；地图带“主理人 Luna / KOL”标识，并提供只读档案、主理人动态、居民关系与当前 Campaign 上下文
- AI 分身使用 Luna 头像，但所有入口、卡片、抽屉与披露文案均明确标记“AI 分身”，不冒充本人实时在线
- 5 位街道 NPC 使用 Kiki、Rain、Mika、Vera、Wen 姓名和“居民”标识，与玩家及 KOL 分开
- 8 个风格统一但功能各异的可进入分层 2.5D 室内：可点击地面移动、使用屏幕方向盘或键盘/WASD 行走，到达热点后再进入任务
- 交易所增长中心：拉新、转化、促活、留存、召回 5 个阶段筛选，以及下载、注册、首次入金、首次现货交易、D7 回访、召回会话 6 个独立 Campaign
- 单主 KPI 规则：每个 Campaign 只绑定一个主 KPI、三道确定性决策、一个本地交付证据和一个外部确认源；一次只允许执行 1 单
- 决策型玩法：答错显示测量或合规原因，可重选且不扣分；三题完成后才可提交本地验收
- 增长驾驶舱：模拟经营金、运营评级、本地交付数、外部确认数与本机审计账本；外部确认在未接入服务端时固定为 0
- 代码原生的增长园区 SVG：用于增长中心生命周期总览与 Campaign 任务背景；建筑内部则统一使用高保真等距 3D 切面场景
- 专业榜单页：高保真人物头像、紧凑前三名领奖台、明确排名指标、普通名次列表，以及不会遮挡内容的本机玩家排名卡
- 每个室内以 3 个可访问的 HTML 热点承载探索；玩家居民会转向、改变景深并走到目标，减少动态效果时则直接到达；主操作可进入既有任务或本地服务
- Luna / Vera AI 分身本地规则对话：快捷提问、自由输入、Campaign 上下文、KPI 与确认源、未完成步骤、下一行动、任务推荐和受控页内跳转
- Contract 锁定字段保护：分身不会修改 CTA、奖励、合规约束、外部 KPI、结算或商业权限
- 对话内嵌官方示例 Mao 的真实 Live2D `.moc3`：首帧资源门禁、眨眼、物理、动作、表情、倾听、思考、回答嘴型与问候
- 可选浏览器本地语音，默认关闭；语音不调用远程模型或远程语音服务
- 分身明确标记“非本人实时发言”；拦截助记词、私钥、KYC 文件及投资/交易建议
- 使用本地化的 CC0 等距城镇 PNG 素材：8 个独立建筑/地标、树木与环境元素
- 主街区使用原创城市经营环境底图；八栋完整地标、连续道路、路缘、人行道、居民、绿化与水系采用统一透视和材质，任务仍由可访问的 DOM 按钮承载
- 主街区云层由透明体积云素材构成，按远近使用不同尺寸、透明度、阴影和低速漂移；系统或游戏设置为“减少动效”时改为静态云层
- 户外道路图已按当前 `1024×1536` 城市底图重描；玩家和 NPC 的位置只允许落在道路中心线图边上，路线执行前逐段采样，任何偏离道路的跳线会被阻止，因此不会穿过建筑
- 玩家点击建筑后先吸附到最近道路，再沿 Dijkstra 路线前往门口；NPC 使用双腿交替接触、身体重心起伏和脚底阴影，主理人 Luna 继续作为固定剧情角色
- 火币主题演示飞机的机头与从左向右的飞行轨迹一致，并分三次投放带 HT 图标的降落伞纪念 Token；领取时 Token 吸入顶部钱包、余额数字递增，每枚增加 5 枚无价值虚拟砖块并写入本地账本；`monetary_value=0`、`external_confirmation=false`、`reward_event=false`，不可交易、提现、转让或兑换
- 小镇页不再叠加旧 CC0 建筑精灵，避免同一界面出现多套透视、光照和渲染风格
- 形象定制提供 8 款发型、8 套服装与 8 个配饰入口，并以 9 套已统一渲染的完整造型承载预览；点击单品自动成套，避免面部、头发、衣领、身体比例和光影生硬拼接
- 全局界面统一为实色按钮、较小圆角、低强度阴影与更中性的纸面色；旧 AI 场景图保留为回滚资产但不再由运行时 CSS 引用
- 6 个游戏任务：答题、限时预测、直播互动、三幕剧情、社群收集、纪念星片共建
- 五阶段居民任务成长线：新手探索 → 日常活跃 → 建筑专精 → 运营实战 → 赛季共建；个人任务进度与真实营销 KPI 确认分开显示
- 任务成功、失败、倒计时、重试、结算、分享卡与再玩一轮
- 虚拟砖块、繁荣度、建筑升级、等级与浏览器 `localStorage` 静态存档
- 任务中心、确定性本地演示榜单、形象定制、增长中心、钱包与无价值演示卡包
- URL 中 `campaign_id`、`creative_id`、`channel_id`、`kol_id`、`link_id` 仅作当前浏览器内的本机归因上下文
- 规范化事件保留在当前页面内存，并提供只读调试接口 `window.__KOL_TOWN__`
- 服务端账号、邀请码绑定、SQLite 排名与兑换校验代码仅作为未接入的回滚/后续实现保留；当前界面会明确阻止这些操作
- URL 停用开关：`?disabled=1`
- 本地存储停用开关：`kol_town_kill_switch=1`

## 街头 NPC 与玩家走动

- 小镇主页有 5 位会走动的居民 NPC。精灵不是另画的，而是用 `tools/extract_npc_sprites.py` 从底图 `luna-town-citybuilder-v3.png` 里把渲染好的居民抠出来（边缘泛洪去背景 + 只保留人物主体），所以和场景是同一渲染风格、同一比例；主页实际显示的是补掉原位的副本 `luna-town-citybuilder-v3-npc.png`，原图未改动
- 每个居民精灵切成上身 / 左腿 / 右腿三层（`assets/generated/npc/pN-{body,leg-l,leg-r}.png`），步态包含交替触地、过渡帧、重心起伏、脚底阴影和基于纵深的缩放；驻足后恢复原站姿
- 行为：沿 0.13.0 根据当前城市底图重描的路网（`game.js` 中 `ROAD_NODES` / `ROAD_EDGES`）Dijkstra 寻路；目的地在 8 栋建筑门口和街角里随机挑选，到点驻足、转身并进行场景相关短对话
- 玩家：点建筑时先吸附到最近道路，再只沿已校验的道路图边移动，到达门口后进入；地图使用圆形居民头像避免白底卡片，室内继续使用当前已保存的完整居民造型；系统或游戏设置为「减少动效」时直接进入
- 加人物：在脚本 `PEOPLE` 里追加原图像素框（人物需站在同一路面上），运行后按打印的 `hip` / `mid` 到 `TOWN_NPCS` 登记

## 视觉说明

0.16.0 为头像、道路与 Token 交互增加专用运行时表现：头部头像不复用全身居中裁切；方向与脸朝向随路段同步；路线执行前进行道路中心线采样；Token 动效、收藏与本地砖块账本形成可见闭环。0.15.1 在不拆分或重绘场景的前提下放大整张世界画布，因此建筑、路网、角色路径和点击热点不会相互错位；天空、空投 HUD、AI 分身提示和底部导航保持固定。角色语义继续统一为“玩家居民 / 主理人 Luna / AI 分身 / 居民 NPC”。云、飞行器、降落伞 Token 与步态素材均提供透明 WebP 运行时版本和原 PNG 回退，HT.svg 作为本地矢量币面叠层加载。0.12.2 起增长中心室内与另外 7 个建筑使用同一纵向等距切面语言；全部室内具有人物移动、景深、热点到达和分层遮挡，属于可导航 2.5D，并非实时三维模型。大图按 AVIF → WebP → 原 PNG 顺序加载，现代格式失败时自动回退。

## 边界说明

此版本始终标记为 `DEMO / LOCAL`。室内是可导航的分层 2.5D，不是 WebGL 自由漫游或真实三维模型。浏览器静态前端不发起 API 或远程资源请求；`server.py` 只作为可选本机文件服务器，已有 SQLite/API 代码当前未被前端调用。虚构 “NOVA X 沙盒” 的 Campaign、预算、验收和经营收入不代表真实品牌授权、合同、发票、回款或结算。火币主题飞机和纪念 Token 是用户指定的本地主题演示；Token 币面使用 Web3 Icons 中 MIT 许可的 HT 图标，但商标和联合 Campaign 授权仍待确认，不代表火币或 HTX 赞助、真实空投或真实数字货币；纪念 Token 不进入 `reward_claim` 或任何商业结算。游戏不下载真实 App、不创建交易所账户、不提交 KYC、不连接钱包、不入金、不下单，也不展示真实价格、盈亏或收益承诺。下载、注册、首次入金、首次现货交易、D7 留存和召回必须由批准的应用商店、归因平台或交易所账户、账务、订单服务端确认；本版本没有接入这些系统，所以外部 KPI 始终为 0。

当前静态前端不会产生账号注册成功事件；即使未来恢复本地演示别名，`registration_complete` 也必须排除在交易所有效注册 KPI 之外。首次入金与首次现货交易 Campaign 在正式使用前还需要法务、合规、风控和适当性审批。该版本尚未发布到生产环境。

## 本地数据

- 浏览器进度：`localStorage` 中的 `kol_town_state_v1`
- SQLite：`data/kol-town.db` 仅供保留的服务端实现使用，当前静态前端不读写
- 聊天原文：仅保存在当前页面内存中用于本次回答；不写入 SQLite、事件或 `localStorage`，刷新、换主题、退出或删号后清空
- “删除账号/重置进度”在当前静态前端中只清除浏览器本地演示数据

## 主要文件

- `index.html`：页面与界面结构
- `styles.css`：高保真视觉、响应式与无障碍样式
- `game.js`：完整交互、任务、存档与事件逻辑
- `server.py`：可选的本机静态文件服务器；其中旧账号/SQLite API 当前未被前端调用
- `data/kol-town.db`：保留服务端实现的本地数据库（当前静态前端不读写）
- `campaign-brief.yaml`：Campaign Brief
- `campaign-contract.json`：Campaign Contract
- `playable-config.json`：玩法配置
- `asset-manifest.json`：资产清单
- `THIRD_PARTY_ASSETS.md`：第三方素材来源、许可证与游戏内映射
- `assets/vendor/janachumi-isometric-city-cc0/`：完整 CC0 城镇素材包的本地副本
- `assets/generated/luna-avatar-customization-atlas-v1.png`：12 件高保真角色物料图集（OpenAI ImageGen，本地演示边界）
- `assets/generated/luna-avatar-customization-atlas-v2.png`：新增 12 件高保真角色物料图集（OpenAI ImageGen，1254×1254，本地演示边界）
- `assets/generated/luna-complete-looks-atlas-v1.png`：8 套身份一致的完整 Luna 造型图集（OpenAI ImageGen，1401×1123，本地演示边界）
- `assets/generated/luna-look-mint-mayor-crystal-v1.png`：玩家“薄荷挑染 + 紫晶正装 + 紫晶项链”的完整 Luna 联名造型（OpenAI ImageGen，1086×1448，本地演示边界）
- `assets/generated/luna-town-citybuilder-v3.png`：0.7.0 原创城市经营主地图（OpenAI ImageGen，本地演示边界）
- `assets/generated/interior-growth-center-v2.png`：0.12.2 交易所增长中心等距 3D 切面室内，与其他 7 个建筑统一镜头、材质和光照（OpenAI ImageGen，本地演示边界）
- `assets/generated/town-cloud-bank-v1.png`：0.13.0 透明体积云素材（OpenAI ImageGen，本地演示边界）
- `assets/generated/town-airdrop-plane-v1.png`：0.13.0 中性红橙涂装飞机，不含真实品牌 Logo（OpenAI ImageGen，本地演示边界）
- `assets/generated/town-airdrop-token-v1.png`：0.13.0 降落伞纪念 Token，不代表真实币或奖励（OpenAI ImageGen，本地演示边界）
- `assets/vendor/web3icons/HT.svg`：0.13.1 Token 币面使用的 HT 矢量图标；来源 `@web3icons/core@4.0.51`，MIT 许可文本随包保存在 `assets/vendor/web3icons/LICENSE.txt`，品牌商标授权仍待确认
- `assets/generated/luna-walk-strip-v1.png`：0.13.0 Luna 四帧全身步行图集（OpenAI ImageGen，本地演示边界）
- `assets/authored/growth-campus-v1.svg`：0.12.1 代码原生增长园区，当前运行时使用
- `assets/optimized/`：主地图、7 个室内和角色图集的 AVIF/WebP 运行时衍生文件；原 PNG 保留为回退
- `assets/generated/exchange-growth-ops-hub-v1.png`：0.12.0 旧交易所增长作战街区，仅作回滚，0.12.1 运行时不引用
- `assets/generated/interior-{flagship,video,live,quiz,predict,community,shop,memorial}-v1.png`：0.8.0 八个独立可进入的预渲染 3D 室内场景；旗舰楼旧图为回滚资产（OpenAI ImageGen，本地演示边界）
- `assets/generated/rank-avatar-{rain,mika,kiki,vera,wen}-v1.jpg`：0.8.1 五个原创小镇居民榜单头像（OpenAI ImageGen，512×512，本地演示边界）
- `assets/generated/luna-town-garden-v2.png`：0.6.0 花园城镇回滚素材（当前运行时不引用）
- `assets/live2d/mao-runtime/`：Cubism SDK for Web 5-r.5 + 官方示例 Mao 的本地运行时、资源门禁和许可文件
- `qa-report.md`：浏览器验收记录
- `release-manifest.yaml`：交付与回滚边界
- `campaign-contract.v0.1.0.json`、`playable-config.v0.1.0.json`、`release-manifest.v0.1.0.yaml`：0.1.0 静态版回滚基线
- `preview-mobile.png`：430×932 手机样式主街区预览
- `preview-assets.png`：采用 CC0 PNG 建筑素材后的 430×932 验收预览
- `preview-avatar-optimized-430.png`：头像层级优化后的 430×932 验收预览
- `preview-avatar-optimized-360.png`：头像层级优化后的 360×800 窄屏验收预览
- `output/playwright/live2d-chat-final-430x932.png`：Live2D 对话 430×932 最终验收截图
- `output/playwright/live2d-chat-360x800.png`：Live2D 对话 360×800 窄屏验收截图
- `output/playwright/town-clouds-390x844.png`：0.13.0 体积云首屏验收截图
- `output/playwright/town-motion-airdrop-390x844.png`：0.13.0 飞机与降落伞 Token 验收截图
- `output/playwright/town-motion-airdrop-360x800.png`：0.13.0 窄屏飞机、云层与降落伞 Token 验收截图
- `output/playwright/town-road-walk-390x844.png`：0.13.0 Luna 沿道路行走中间帧验收截图
- `output/playwright/town-airdrop-forward-ht-final-390x844.png`：0.13.1 飞机正向飞行与 HT Token 同屏验收截图
- `output/playwright/town-airdrop-forward-ht-360x800.png`：0.13.1 窄屏飞机正向飞行与 HT Token 验收截图
- `output/playwright/ht-token-detail-390x844.png`：0.13.1 HT Token 局部验收截图
- `output/playwright/identity-town-390x844-v0.14.0.png`：0.14.0 玩家、固定主理人 Luna、AI 分身与命名居民同屏验收截图
- `output/playwright/resident-avatar-390x844-v0.14.0.png`：0.14.0 “我的居民”与 Luna 联名造型验收截图
- `output/playwright/host-profile-390x844-v0.14.0.png`：0.14.0 只读主理人档案验收截图
- `output/playwright/host-profile-after-player-save-390x844-v0.14.0.png`：0.14.0 玩家换装后 Luna 形象保持不变的验收截图
- `output/playwright/drag-map-center-390x844-v0.15.0.png`：0.15.0 放大地图中心视野 390×844 验收截图
- `output/playwright/drag-map-center-360x800-v0.15.0.png`：0.15.0 放大地图中心视野 360×800 窄屏验收截图
- `output/playwright/drag-map-panned-360x800-v0.15.0.png`：0.15.0 窄屏拖动到边界后的验收截图
- `output/playwright/player-full-head-second-row-390x844-v0.16.0.png`：第二排造型完整头部与圆形地图玩家标记验收截图
- `output/playwright/player-full-head-360x800-v0.16.0.png`：360×800 完整头部与无横向溢出验收截图
- `output/playwright/token-claim-midflight-390x844-v0.16.0.png`：HT 主题纪念 Token 飞入顶部钱包的中间帧
- `output/playwright/token-wallet-390x844-v0.16.0.png`：Token 收藏、+5 虚拟砖块与本地账本验收截图
- `output/playwright/task-growth-390x844-v0.16.0.png`：五阶段居民任务成长线验收截图
- `preview.png`：原始主街区预览
