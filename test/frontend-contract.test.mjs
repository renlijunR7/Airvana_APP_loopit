import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const frontend = read('public/app.js');
const ui = read('public/ui.js');
const css = read('public/app.css');
const mobileCss = read('public/airvana-v4.css');
const artifact = read('src/artifact.mjs');
const mobileEntry = read('public/index.html');
const workspaceEntry = read('public/workspace.html');
const server = read('src/app.mjs');
const mobileRuntime = read('public/support.js');
const entryRedirect = read('public/entry-redirect.js');

test('root exposes the current five-destination mobile shell and keeps the workspace separate', () => {
  assert.match(mobileEntry, /Content Driven Agent World/);
  assert.match(mobileEntry, /class="bottom-nav"/);
  assert.match(mobileEntry, /feedTransform/);
  for (const label of ['首页', '发现', '节点', '消息', '我的']) {
    assert.match(mobileEntry, new RegExp(`aria-label="${label}"`));
  }
  assert.match(workspaceEntry, /id="app"/);
  assert.match(server, /pathname === '\/workspace'/);
  assert.match(server, /mobileShell/);
  assert.match(server, /script-src 'self' 'unsafe-eval'/);
  assert.match(mobileRuntime, /\/vendor\/react\.production\.min\.js/);
  assert.match(mobileRuntime, /\/vendor\/react-dom\.production\.min\.js/);
  assert.doesNotMatch(mobileRuntime, /var REACT_URL = "https:\/\/unpkg\.com/);
  assert.match(mobileEntry, /entry-redirect\.js/);
  assert.match(entryRedirect, /window\.location\.protocol === 'file:'/);
  assert.match(entryRedirect, /http:\/\/127\.0\.0\.1:8082\//);
});

test('Discover is a separate swipeable 2.5-card gallery while Home remains immersive', () => {
  const feedStart = mobileEntry.indexOf('onPointerDown="{{ feedDown }}"');
  const discoverStart = mobileEntry.indexOf('<sc-if value="{{ isDiscover }}"');
  assert.ok(feedStart >= 0 && discoverStart > feedStart, 'Discover must remain a separate destination after the immersive Home feed');
  assert.match(mobileEntry, /const discoverTabs = \[\['recommend','推荐'\],\['following','关注'\],\['hot','热门'\],\['latest','最新'\]\]/);
  assert.match(mobileEntry, /display:flex;gap:10px;overflow-x:auto/);
  assert.match(mobileEntry, /width:calc\(40% - 8px\);flex:none/);
  assert.match(mobileEntry, /scroll-snap-type:x proximity/);
  assert.match(mobileEntry, /loading="lazy"/);
  assert.match(mobileEntry, /loading:i===safePlayIdx\?'eager':'lazy'/);
  assert.match(mobileEntry, /fetchPriority:i===safePlayIdx\?'high':'low'/);
  assert.match(mobileEntry, /fetchpriority="\{\{ ss\.fetchPriority \}\}" decoding="async"/);
  assert.match(mobileEntry, /playFeedVisible:true/);
  assert.doesNotMatch(mobileEntry, /playTabs:|s\.playTab|playTab:/);
});

test('Home feed actions close the local front-end loop with accessible sheets and truthful events', () => {
  for (const sheet of ['comments-sheet', 'share-sheet', 'remix-sheet', 'unfollow-sheet']) {
    assert.match(mobileEntry, new RegExp(`class="social-action-sheet ${sheet}(?: [^"]*)?"[^>]*role="dialog"[^>]*aria-modal="true"`));
  }
  for (const label of ['评论', '分享 Playable', 'Remix 复用范围', '取消关注确认']) {
    assert.ok(mobileEntry.includes(label), `missing social action affordance: ${label}`);
  }
  assert.match(mobileEntry, /min-height:44px;display:flex;flex-direction:column/);
  assert.match(mobileEntry, /aria-label="\{\{ r\.ariaLabel \}\}"/);
  assert.match(mobileEntry, /<div onPointerDown="\{\{ stopFeedPointer \}\}" onClick="\{\{ stopFeedPointer \}\}" style="flex:none;background:#0B0D0C/);
  assert.match(mobileEntry, /min-width:44px;min-height:44px;margin-left:auto;flex:none;display:flex;align-items:center;justify-content:center;cursor:pointer/);
  assert.match(mobileEntry, /min-height:32px;display:flex;align-items:center;gap:6px;background:rgba\(255,255,255,\.12\)/);
  assert.match(mobileEntry, /position:relative;width:34px;height:34px;flex:none/);
  assert.match(mobileEntry, /position:absolute;right:-10px;bottom:-9px;width:30px;height:30px;border-radius:50%/);
  assert.match(mobileEntry, /background:#FF3B4A;border:2px solid #0B0D0C/);
  assert.match(mobileEntry, /showFollow:x\.owner!=='@kai\.builds'/);
  assert.match(mobileEntry, /followIcon:s\.followingOwners\.includes\(x\.owner\)\?'✓':'\+'/);
  assert.match(mobileEntry, /followIconPath:s\.followingOwners\.includes\(x\.owner\)\?'M5 12l4 4L19 6':'M12 5v14M5 12h14'/);
  assert.match(mobileEntry, /<path d="\{\{ ss\.followIconPath \}\}"><\/path>/);
  assert.doesNotMatch(mobileEntry, /followLabel:x\.owner==='@kai\.builds' \? '本人'/);
  assert.match(mobileEntry, /openCommentsSheet\(x\.id\)/);
  assert.match(mobileEntry, /openShareSheet\(x\.id\)/);
  assert.match(mobileEntry, /requestFeedFollow\(x\.owner\)/);
  assert.match(mobileEntry, /if\(this\.state\.followingOwners\.includes\(owner\)\)\{this\.setState\(\{pendingFollowOwner:owner,overlay:'unfollow'\}\)/);
  assert.match(mobileEntry, /event_name:eventName/);
  assert.match(mobileEntry, /properties:\{\.\.\.properties,server_confirmed:false\}/);
  assert.match(mobileEntry, /recordProductEvent\('share_intent'/);
  assert.match(mobileEntry, /recordProductEvent\('share_confirmed'/);
  assert.match(mobileEntry, /kind:'copy'/);
  assert.match(mobileEntry, /kind:'confirmed'/);
  assert.match(mobileEntry, /event\.kind==='confirmed'\)\?'已分享':'分享'/);
});

test('Home share action opens a light bottom sheet with channel and content controls', () => {
  assert.match(mobileEntry, /class="social-action-sheet share-sheet share-sheet--light"/);
  assert.match(mobileEntry, /background:var\(--surface-card,#FFFFFF\);color:var\(--text-primary,#1C1C1E\);border:1px solid var\(--border-primary,#E5E5EA\);border-bottom:0;border-radius:24px 24px 0 0/);
  assert.match(mobileEntry, /\.share-sheet--light \.share-action-grid>div>div\{background:#F2F2F7!important\}/);
  assert.match(mobileEntry, /\.share-sheet--light \.share-action-grid>div>span\{color:#636366!important\}/);
  assert.match(mobileEntry, /\.share-sheet--light \.share-action-grid>div:nth-child\(4\)>div\{background:radial-gradient/);
  assert.doesNotMatch(mobileEntry, /class="social-action-sheet share-sheet share-sheet--dark"/);
  assert.match(mobileEntry, /class="share-action-grid"[^>]*grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  for (const label of ['复制链接', '系统分享', '分享到 TikTok', '分享到 Instagram', '分享到 X', '重新体验', '全屏', '不感兴趣', '举报内容', '屏蔽作者']) {
    assert.match(mobileEntry, new RegExp(`aria-label="${label}"`));
  }
  assert.match(mobileEntry, /shareToChannel\('TikTok',socialContent\.id\)/);
  assert.match(mobileEntry, /shareToChannel\('Instagram',socialContent\.id\)/);
  assert.match(mobileEntry, /shareToChannel\('X',socialContent\.id\)/);
  assert.match(mobileEntry, /kind:'channel-intent'/);
  assert.match(mobileEntry, /recordProductEvent\('share_channel_intent'/);
  assert.match(mobileEntry, /仅系统回调成功才标记为已分享/);
});

test('Remix creates a governed draft with lineage and does not inherit locked cross-creator fields', () => {
  assert.match(mobileEntry, /sourcePlayableId:source\.id/);
  assert.match(mobileEntry, /sourceVersionId:sourceVersion\.id\|\|sourceVersion\.label\|\|null/);
  assert.match(mobileEntry, /remixKind:'new-playable'/);
  assert.match(mobileEntry, /lockedFieldsInherited:false/);
  assert.match(mobileEntry, /assetLicenseStatus:own\?'same-owner-local-demo':'unverified-local-demo'/);
  assert.match(mobileEntry, /campaignId:null,contract:null/);
  assert.match(mobileEntry, /const clearedContract=\{campaignBrand:'',campaignAudience:''/);
  for (const lockedField of ['campaignCTA', 'campaignRewardRule', 'campaignRegion', 'campaignAttributionModel', 'campaignSettlementBasis']) {
    assert.match(mobileEntry, new RegExp(`${lockedField}:''`));
  }
  assert.match(mobileEntry, /受控 Remix/);
  assert.match(mobileEntry, /完成后仍需通过 Campaign Contract 与人工审核/);
  assert.match(mobileEntry, /remixScopeAriaLabel:'Remix 复用范围'/);
  assert.match(mobileEntry, /remixLabel:'Remix',remixAriaLabel:'基于 '\+x\.game\+' 创建受控 Remix 草稿'/);
  assert.doesNotMatch(mobileEntry, /remixLabel:[^\n]*新版本/);
  assert.doesNotMatch(mobileEntry, /onRemix:\s*\(\)\s*=>\s*this\.setState\(\{overlay:'create'/);
});

test('mobile shell renders an iPhone-like status bar instead of placeholder glyphs', () => {
  assert.match(mobileEntry, /模拟设备状态：蜂窝网络、Wi-Fi、电量 74%/);
  assert.match(mobileEntry, /font-variant-numeric:tabular-nums/);
  assert.match(mobileEntry, /<rect x="14" y="0" width="3" height="12"/);
  assert.match(mobileEntry, /class="device-battery"[^>]*border:1\.5px solid currentColor/);
  assert.match(mobileEntry, /width:74%;height:100%;border-radius:1\.5px;background:currentColor/);
  assert.doesNotMatch(mobileEntry, /●●● ⌁ ▮/);
});

test('mobile login offers wallet signature, email verification code and Google one-click flows', () => {
  for (const term of ['Google 一键登录', '数字货币钱包登录', '邮箱验证码登录', '发送验证码', '验证并登录', '6 位验证码']) {
    assert.ok(mobileEntry.includes(term), `missing login term: ${term}`);
  }
  assert.match(mobileEntry, /window\.ethereum\.request\(\{method:'eth_requestAccounts'\}\)/);
  assert.match(mobileEntry, /method:'personal_sign'/);
  assert.match(mobileEntry, /fetch\('\/api\/auth\/wallet\/challenge'/);
  assert.match(mobileEntry, /fetch\('\/api\/auth\/wallet\/verify'/);
  assert.match(mobileEntry, /fetch\('\/api\/auth\/demo'/);
  assert.match(mobileEntry, /loginEmailCodeSent:true/);
  assert.match(mobileEntry, /autocomplete="one-time-code"/);
  assert.doesNotMatch(mobileEntry, />使用 Apple 继续</);
});

test('wallet supports verified binding and governed AIT withdrawal without enabling AIP cash-out', () => {
  for (const term of ['绑定数字货币钱包', 'AIT 提现到钱包', 'AIT 提现数量', '提交 AIT 提现', 'AIT 提现记录', '资产与提现规则']) {
    assert.ok(mobileEntry.includes(term), `missing wallet withdrawal term: ${term}`);
  }
  assert.match(mobileEntry, /fetch\('\/api\/wallet-bindings\/challenge'/);
  assert.match(mobileEntry, /fetch\('\/api\/wallet-bindings\/verify'/);
  assert.match(mobileEntry, /fetch\('\/api\/ait-withdrawals'/);
  assert.match(mobileEntry, /method:'personal_sign'/);
  assert.match(mobileEntry, /confirmOwnership:true,confirmCompliance:true/);
  assert.match(mobileEntry, /内容互动积分，仅用于平台权益，不支持提现/);
  assert.match(mobileEntry, /实际链上发放以交易哈希为准/);
  assert.match(mobileEntry, /AIT 不承诺固定现金、USDT 或投资价值/);
  assert.match(mobileEntry, />资产与提现规则<\/div>[\s\S]{0,260}>AIP 不支持提现，仅用于站内权益兑换。AIP 与 AIT 分开记账且不可互换。/);
  assert.equal((mobileEntry.match(/AIP 不支持提现，仅用于站内权益兑换/g) || []).length, 1);
  assert.match(server, /pathname === '\/api\/wallet-bindings\/challenge'/);
  assert.match(server, /pathname === '\/api\/wallet-bindings\/verify'/);
  assert.match(server, /pathname === '\/api\/ait-withdrawals'/);
  assert.match(server, /\/api\/admin\/ait-withdrawals\/:id\/complete/);
  assert.match(server, /'ait_withdrawal'/);
  assert.doesNotMatch(mobileEntry, /AIP 提现/);
});

test('frontend demo mode closes non-financial login locally and blocks server-authoritative actions', () => {
  assert.match(mobileEntry, /frontendDemoMode = true/);
  assert.match(mobileEntry, /serviceSessionReady: false/);
  assert.match(mobileEntry, /finishLogin\(false,label\+'仅建立当前设备的前端演示身份/);
  assert.match(mobileEntry, /钱包绑定、AIT 余额和提现申请需要账号与账本服务/);
  assert.match(mobileEntry, /if \(!this\.state\.walletSessionReady\)/);
  assert.match(mobileEntry, /前端演示模式不会伪造钱包绑定/);
  assert.match(mobileEntry, /当前为前端演示模式，不请求钱包连接或签名/);
  assert.match(mobileEntry, /aria-label="绑定数字货币钱包" aria-disabled="\{\{ walletBindingDisabled \}\}"/);
  assert.match(mobileEntry, /accountDeletionServiceRequired:!s\.serviceSessionReady/);
  assert.match(mobileEntry, /前端演示模式不会伪造删除申请/);
  assert.match(mobileEntry, /showAccountDeletionForm:!!s\.serviceSessionReady/);
});

test('user and KOL avatars use the supplied local avatar pool with a persistent random profile choice', () => {
  const avatarDir = path.join(root, 'public', 'avatars');
  const avatars = fs.readdirSync(avatarDir).filter(name => /^avatar_\d{2}\.png$/.test(name)).sort();

  assert.equal(avatars.length, 36);
  assert.equal(avatars[0], 'avatar_01.png');
  assert.equal(avatars.at(-1), 'avatar_36.png');
  assert.match(mobileEntry, /avatarAssets = Array\.from\(\{length:36\}/);
  assert.match(mobileEntry, /profileAvatar:this\.loadProfileAvatar\(\)/);
  assert.match(mobileEntry, /avatarStorageKey = 'airvana\.v5\.profile-avatar'/);
  assert.match(mobileEntry, /localStorage\.setItem\(this\.avatarStorageKey, selected\)/);
  assert.match(mobileEntry, /this\.avatarAssets\.includes\(restored\.profileAvatar\)/);
  assert.match(mobileEntry, /'profileAvatar'/);
  assert.match(mobileEntry, /src="\{\{ profileAvatar \}\}"/);
  assert.match(mobileEntry, /src="\{\{ ss\.avatar \}\}"/);
  assert.match(mobileEntry, /src="\{\{ wp\.avatar \}\}"/);
});

test('user-facing screens do not expose internal MVP development labels', () => {
  assert.doesNotMatch(mobileEntry, /本地\s*MVP|localFlowLabel/);
});

test('all secondary page titles share a true viewport-centered header treatment', () => {
  assert.match(mobileEntry, /\.secondary-page-title\{position:absolute!important;left:50%!important;transform:translateX\(-50%\)!important/);
  assert.ok((mobileEntry.match(/class="secondary-page-header/g) || []).length >= 8);
  for (const title of ['创作者中心', '模板', '我的钱包', 'AI 运营策略', 'AI 策略详情', 'Agent 任务']) {
    assert.match(mobileEntry, new RegExp(`class="secondary-page-title"[^>]*>${title}<\\/div>`));
  }
  assert.match(mobileEntry, /class="secondary-page-title">\{\{ detailHeaderTitle \}\}<\/div>/);
  assert.match(mobileEntry, /class="secondary-page-title"[^>]*>\{\{ createTitle \}\}<\/div>/);
  assert.match(mobileEntry, /class="secondary-page-title"[^>]*>\{\{ panelDisplayTitle \}\}<\/div>/);
});

test('Playable detail is experience-first and gates owner operations by role and ownership', () => {
  assert.match(mobileEntry, /aria-label="Playable 详情" class="playable-detail"/);
  assert.match(mobileEntry, /class="playable-detail-hero__image" src="\{\{ detailCover \}\}"/);
  assert.match(mobileEntry, /detailHasStarted:s\.detailMode!=='detail'/);
  assert.match(mobileEntry, /detailShowingAgentSuggestion:s\.detailMode==='advice'/);
  assert.match(mobileEntry, /const detailCanManage = isKolRoleView && !!detailContent\.isOwned && detailContent\.createdByRole !== 'player'/);
  assert.match(mobileEntry, /detailShowManageEntry:detailCanManage&&!detailManagementOpen/);
  assert.match(mobileEntry, /label:'发布与治理',meta:'审批、暂停与回滚'/);
  assert.doesNotMatch(mobileEntry, /互动试玩 · 得分 \{\{ detailScore \}\}/);
  assert.doesNotMatch(mobileEntry, /detailFollowLabel:detailContent\.owner==='@kai\.builds'\?'本人'/);
  assert.match(mobileCss, /\.playable-detail__header > \.playable-detail__back::before,[\s\S]*width: 44px/);
  assert.match(mobileCss, /\.playable-detail__header > \.playable-detail__back \{[\s\S]*width: 32px !important/);
});

test('template interpolation wrappers never receive component box styles twice', () => {
  assert.match(mobileRuntime, /className: "sc-interp"/);

  const authoredSpanSelectors = [
    '.profile-ai-twin-entry > span',
    '.growth-network-hero-tags > span',
    '.growth-signal-card__top > span',
    '.growth-node-status-card > span',
    '.growth-credit-factor > span',
    '.growth-node-progress__item > span',
    '.growth-contribution-chain > span',
    '.growth-credit-factor-card__foot > span',
    '.growth-lifecycle > span',
    '.ai-twin-position-grid button > span',
    '.ai-twin-experience-grid button > span',
    '.ai-twin-style-row button > span',
    '.ai-twin-scene-strip__list > button > span',
    '.ai-twin-identity-map__profiles article > div > span',
    '.ai-twin-identity-map__note > span',
    '.ai-twin-scene-manager article > button:first-child > span',
    '.ai-twin-language-tabs button > span',
    '.ai-twin-campaign-grid > article > div:first-child > span',
    '.ai-twin-permission-chips > span',
    '.product-role-switcher__options button > span',
    '.demo-environment-options button > span',
    '.demo-popup-switch > span',
    '.chat-day-divider > span',
    '.playable-detail-hero__badges > span',
    '.playable-detail-hero__tags > span',
    '.playable-detail-meta > span',
    '.playable-detail-video i > span',
    '.playable-detail-social > div > span',
    '.playable-detail-management__actions > div > span'
  ];

  for (const selector of authoredSpanSelectors) {
    assert.ok(mobileCss.includes(selector), `box styling must target only the authored wrapper: ${selector}`);
  }

  for (const selector of [
    '.profile-ai-twin-entry span',
    '.growth-network-hero-tags span',
    '.growth-signal-card__top span',
    '.growth-node-status-card span',
    '.growth-credit-factor span',
    '.growth-node-progress__item span',
    '.growth-contribution-chain span',
    '.growth-credit-factor-card__foot span',
    '.growth-lifecycle span',
    '.ai-twin-style-row button span',
    '.ai-twin-identity-map__profiles span',
    '.ai-twin-identity-map__note span',
    '.ai-twin-scene-manager article > button:first-child span',
    '.ai-twin-language-tabs button span',
    '.playable-detail-hero__badges span',
    '.playable-detail-hero__tags span',
    '.playable-detail-meta span',
    '.ai-twin-permission-chips span',
    '.demo-popup-switch span',
    '.demo-popup-switch[aria-checked="true"] span',
    '.playable-detail-video i span',
    '.playable-detail-social span'
  ]) {
    assert.ok(!mobileCss.includes(selector), `broad interpolation selector must not return: ${selector}`);
  }
});

test('first-batch UI foundation defines responsive shells, readable shared type and touch targets', () => {
  for (const token of ['--app-max-width: 430px', '--app-max-height: 932px', '--touch-target: 44px', '--type-caption: 11px', '--type-body: 13px', '--type-title: 20px']) {
    assert.ok(mobileCss.includes(token), `missing first-batch token: ${token}`);
  }
  assert.match(mobileCss, /\.secondary-page-header > \[role="button"\]:first-child,[\s\S]*min-height: var\(--touch-target\) !important/);
  assert.match(mobileCss, /\.feature-tab-row > div,[\s\S]*min-height: var\(--touch-target\)/);
  assert.match(mobileCss, /@media \(max-width: 374px\)/);
  assert.match(mobileCss, /@media \(max-width: 430px\)/);
  assert.match(mobileEntry, /\.app-shell\{width:min\(430px,100vw\)!important;height:min\(932px,100dvh\)!important/);
});

test('My screen follows a Douyin-inspired profile layout with ordered shortcuts and personal content tabs', () => {
  for (const term of ['>L3</span>', '获赞', '粉丝', '关注', '创作者中心', 'KOL AI 分身', '品牌合作', '站内权益', '身份与安全', '作品', '草稿箱', '收藏', '体验记录', '已点赞']) {
    assert.ok(mobileEntry.includes(term), `missing My screen term: ${term}`);
  }
  const shortcutStart = mobileEntry.indexOf('aria-label="KOL 专属入口"');
  const shortcutEnd = mobileEntry.indexOf('class="my-content-surface"', shortcutStart);
  const shortcutBlock = mobileEntry.slice(shortcutStart, shortcutEnd);
  assert.match(shortcutBlock, /<sc-for list="\{\{ profileShortcuts \}\}"/);
  assert.match(mobileEntry, /<sc-if value="\{\{ showProfileShortcuts \}\}"/);
  assert.doesNotMatch(mobileEntry, /class="profile-role-switcher"/);
  assert.doesNotMatch(mobileEntry, /class="feed-role-context"/);
  assert.doesNotMatch(mobileEntry, /class="growth-role-hint"/);
  assert.match(mobileEntry, /class="product-role-switcher" aria-label="功能中心角色视角切换"/);
  assert.match(mobileEntry, /class="player-publish" role="dialog"/);
  assert.match(mobileEntry, /游戏创作与站内发布/);
  assert.match(mobileEntry, /player_post_published/);
  assert.match(mobileEntry, /class="profile-avatar-shell"[\s\S]{0,500}aria-label="\{\{ profilePersonaAriaLabel \}\}"[^>]*onClick="\{\{ openRolePersona \}\}"[^>]*class="profile-ai-twin-entry"/);
  assert.match(mobileEntry, /aria-label="KOL 专属入口"/);
  assert.match(mobileEntry, /class="profile-shortcuts"[^>]*grid-template-columns:repeat\(3,1fr\)/);
  assert.match(mobileEntry, /class="my-content-surface"/);
  assert.match(mobileEntry, /border-radius:18px 18px 0 0;background:var\(--surface-card,#FFFFFF\)/);
  assert.match(mobileEntry, /class="my-content-tabs"[^>]*border-bottom:1px solid var\(--border-primary,#E5E5EA\)/);
  assert.match(mobileEntry, /label:'身份认证',meta:identityDrawerMeta,onPick:\(\)=>this\.setState\(\{drawerOpen:false,panel:'identity'/);
  assert.match(mobileEntry, /panelIdentity:s\.panel==='identity'/);
  assert.match(mobileEntry, /grid-template-columns:repeat\(3,1fr\);gap:7px;padding:10px/);
  assert.match(mobileEntry, /min-height:190px;border-radius:12px;background:\{\{ mi\.bg \}\}/);
  assert.match(mobileEntry, /profileLikeCount:fmt\(profileLikeSource\.reduce/);
  assert.match(mobileEntry, /profileFollowerCount:fmt\(profileFollowerOwners\.length\)/);
  assert.match(mobileEntry, /class="profile-like-gallery"/);
  assert.match(mobileEntry, /class="profile-like-grid"/);
  assert.match(mobileEntry, /class="profile-like-card"[^>]*aria-label="查看 \{\{ item\.title \}\}，\{\{ item\.likeLabel \}\}"/);
  assert.match(mobileEntry, /list="\{\{ profileLikeItems \}\}"/);
  assert.match(mobileEntry, /const profileLikeSource=ownedPlayables/);
  assert.match(mobileEntry, /profileLikeItems = profileLikeSource\.filter\(item=>Number\(item\.likes\|\|0\)>0\)\.sort/);
  assert.match(mobileCss, /\.profile-like-grid \{[\s\S]{0,180}grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(mobileCss, /\.profile-like-card \{[\s\S]{0,180}aspect-ratio: 3 \/ 4/);
  assert.match(mobileEntry, /\{\{ item\.likes \}\}<\/span>/);
  assert.match(mobileEntry, /class="profile-relations-list"[^>]*margin-left:-20px;margin-right:-20px/);
  assert.match(mobileEntry, /class="profile-relation-cell"[^>]*width:100%;min-height:78px/);
  for (const label of ['关注', '回关', '相互关注']) assert.ok(mobileEntry.includes(`'${label}'`));
  assert.match(mobileEntry, /aria-label="编辑与 \{\{ item\.name \}\} 的关系"/);
  assert.match(mobileEntry, /profileFollowerOwners:\['@nina','@leo\.art'\]/);
  assert.match(mobileEntry, /onClick="\{\{ openProfileEdit \}\}"/);
  assert.doesNotMatch(mobileEntry, /aria-label="分享个人主页"/);
  assert.match(mobileEntry, /aria-label="打开设置" onClick="\{\{ openSettings \}\}"/);
  assert.doesNotMatch(mobileEntry, /KOL Lv\.4/);
  assert.doesNotMatch(mobileEntry, /持续运营者/);
  assert.match(mobileEntry, /showScreenTitle:s\.screen!=='play'&&s\.screen!=='me'&&s\.screen!=='quests'&&s\.screen!=='discover'/);
  assert.match(mobileEntry, /meTab:'playables'/);
  assert.match(mobileEntry, /const ownedPlayables =/);
  assert.match(mobileEntry, /const roleMeTabs=\[\{key:'playables',isGrid:true,label:'作品'\},\{key:'drafts',isDraft:true,label:'草稿箱'\},\{key:'saved',isSaved:true,label:'收藏'\},\{key:'history',isHistory:true,label:'体验记录'\}\]/);
  assert.match(mobileEntry, /profileShortcuts,showProfileShortcuts:isKolRoleView/);
  assert.match(mobileEntry, /publish_scope:role==='kol'\?'campaign_and_connectors':'app_only'/);
  assert.match(mobileEntry, /x\.isOwned\|\|x\.owner==='@kai\.builds'/);
  assert.match(mobileEntry, /meItems,meHasItems/);
  assert.match(mobileEntry, /me:'我的'/);
});

test('identity and role center exposes truthful local-demo KYC and hierarchical role flows', () => {
  for (const term of ['身份与角色', '身份状态概览', 'KYC 身份认证', '创作者身份', '增长网络节点', '超级节点', '重置本地演示状态']) {
    assert.ok(mobileEntry.includes(term), `missing identity term: ${term}`);
  }
  assert.doesNotMatch(mobileEntry, /IDENTITY & ROLES · LOCAL DEMO/);
  assert.match(mobileEntry, /min-height:116px;flex:none;border-radius:22px/);
  for (const role of ['kyc', 'creator', 'node', 'super_node']) {
    assert.match(mobileEntry, new RegExp(`role:'${role}'`));
  }
  assert.match(mobileEntry, /identityKycStatus !== 'verified_demo'/);
  assert.match(mobileEntry, /identityNodeStatus !== 'active_demo'/);
  assert.match(mobileEntry, /source:'local-demo',[\s\S]*serverConfirmed:false/);
  for (const term of ['上传身份证明', '签发国家或地区', '身份证正面', '身份证背面', '护照资料页', '第三方 KYC 托管窗口', '不留存原件']) assert.ok(mobileEntry.includes(term), `missing KYC upload term: ${term}`);
  assert.match(mobileEntry, /accept="image\/jpeg,image\/png,image\/webp"/);
  for (const className of ['kyc-step-strip', 'kyc-document-types', 'kyc-document-preview', 'kyc-photo-checks', 'kyc-privacy-note']) {
    assert.ok(mobileEntry.includes(className), `missing refined KYC upload UI: ${className}`);
  }
  assert.match(mobileCss, /\.kyc-document-preview/);
  assert.match(mobileCss, /grid-template-columns: repeat\(3, 1fr\)/);
  assert.match(mobileEntry, /不显示照片、不记录文件名、不写入本地存储/);
  assert.match(mobileEntry, /identityKycUploads:\{\}/);
  assert.doesNotMatch(mobileEntry, /'identityKycUploads'/);
  assert.match(mobileEntry, /不代表区块链验证、代币质押、固定收益或法定资质/);
  assert.match(mobileEntry, /真实认证、审核和权限必须由服务端确认/);
  assert.doesNotMatch(mobileEntry, /identitySelfie|identityBiometric|FileReader\([^)]*identity|createObjectURL\([^)]*identity/);
  assert.doesNotMatch(mobileEntry, /panelPointsMall|panel:'pointsMall'/);
});

test('all mobile empty-data states share the screenshot-inspired visual treatment', () => {
  assert.match(mobileEntry, /\.airvana-empty\{padding:24px 18px 28px;text-align:center\}/);
  assert.match(mobileEntry, /\.airvana-empty-icon\{width:54px;height:54px;border-radius:18px;background:#FFF1F2;color:#FF3B4A/);
  assert.match(mobileEntry, /\.airvana-empty-title\{font-size:13px;font-weight:900/);
  assert.match(mobileEntry, /\.airvana-empty-desc\{font-size:10px;color:var\(--text-secondary,#8E8E93\)/);
  assert.ok((mobileEntry.match(/<div class="airvana-empty(?: |")/g) || []).length >= 7);
  for (const state of ['playFeedEmpty', 'discoverEmpty', 'worldPlayablesEmpty', 'meEmpty', 'aitWithdrawalsEmpty', 'profileStatEmpty', 'libraryEmpty']) {
    assert.match(mobileEntry, new RegExp(`<sc-if value="\\{\\{ ${state} \\}\\}"[\\s\\S]{0,5000}airvana-empty`));
  }
  assert.ok((mobileEntry.match(/<div class="airvana-empty-icon"><svg/g) || []).length >= 7);
  assert.doesNotMatch(mobileEntry, /profileStatEmptyImage|profileStatEmptyAlt|playFeedEmptyIcon|meEmptyIcon/);
});

test('Node screen follows the global data, discovery filters, growing Playables and network updates architecture', () => {
  for (const term of ['推荐', '运行中', '增长最快', '品牌合作', '正在增长的 Agentic Playables', '网络最新动态', '立即体验']) {
    assert.ok(mobileEntry.includes(term), `missing Node screen term: ${term}`);
  }
  assert.match(mobileEntry, /aria-label="节点内容筛选"/);
  assert.match(mobileEntry, /worldFilters:\[\['all','推荐'\],\['running','运行中'\],\['growing','增长最快'\],\['brand','品牌合作'\]\]/);
  assert.match(mobileEntry, /const worldPlayables = worldSource\.slice\(0,3\)/);
  assert.match(mobileEntry, /networkFeed:s\.feed\.slice\(0,3\)/);
  assert.doesNotMatch(mobileEntry, /liveChip/);
  assert.match(mobileEntry, /Playable 是营销智能体，KOL 是运营者/);
  assert.doesNotMatch(mobileEntry, /进入 Agentic Playable 网络/);
  assert.doesNotMatch(mobileEntry, />运营动态</);
  assert.doesNotMatch(mobileEntry, />持续运营榜</);
  assert.doesNotMatch(mobileEntry, />我关注的</);
  assert.match(mobileEntry, /@keyframes forcePulse/);
  assert.match(mobileEntry, /<sc-if value="\{\{ isWorld \}\}"[^>]*>[\s\S]{0,600}aria-label="了解增长网络与我的节点"[\s\S]{0,600}class="force-nav-icon"/);
  assert.match(mobileEntry, /aria-label="了解增长网络与我的节点"[^>]*style="[^"]*background:transparent;border:0/);
  assert.doesNotMatch(mobileEntry, /<circle class="force-nav-icon__spark"/);
  assert.match(mobileEntry, /aria-description="查看五人协作节点、贡献记录与经济网络规则"/);
  assert.match(mobileEntry, /aria-label="节点" onClick="\{\{ navWorld\.onClick \}\}"[\s\S]{0,500}<ellipse cx="12" cy="12" rx="3\.8" ry="8\.5"/);
  assert.doesNotMatch(mobileEntry, /aria-label="节点" aria-description=/);
  assert.match(mobileEntry, /openForceCenter:\(\) => this\.setState\(\{panel:'growthNetwork',growthNetworkTab:'network'\},\(\)=>this\.scrollPanelTop\(\)\)/);
});

test('Growth Network explains the governed five-person economic model and exposes the complete front-end loop', () => {
  assert.match(mobileEntry, /panelGrowthNetwork:s\.panel==='growthNetwork'/);
  assert.match(mobileEntry, /\[\['network','网络'\],\['node','我的节点'\],\['contribution','贡献'\],\['rules','规则'\]\]/);
  for (const term of [
    '五人成节点，',
    '节点连接成网络。',
    '最小协作单元',
    '5 个独立席位',
    '一人一席 · 关系需成员独立确认',
    '角色能力互补',
    '贡献证据可追溯',
    '协作节点',
    '经济节点',
    '不代表区块链验证节点',
    '不因邀请成员自动获得 Token',
    '每位用户只能加入一个主要经济节点',
    'Campaign Contract',
    '增长网络的双核心计算',
    '原力证明能力 × 信用分证明可靠',
    '信用分达到 650 才能申请经济节点',
    '履约记录 35%',
    '协作稳定性 25%',
    '贡献可信度 25%',
    '风险与合规 15%',
    '不是金融征信、借贷评分',
    '暂停、退出和申诉'
  ]) assert.ok(mobileEntry.includes(term), `missing Growth Network product term: ${term}`);
  assert.match(mobileEntry, /class="growth-network-orbit__links"[^>]*viewBox="0 0 284 242"[\s\S]{0,500}<circle cx="142" cy="52"/);
  assert.match(mobileEntry, /growth-network-orbit__member--one"><b>01<\/b><span>发起<\/span><small>建立协作<\/small>/);
  assert.match(mobileEntry, /growth-network-orbit__member--five"><b>05<\/b><span>验证<\/span><small>核验贡献<\/small>/);
  assert.doesNotMatch(mobileEntry, /<em>分别确认<\/em>/);
  assert.match(mobileCss, /\.growth-network-orbit__core \{[^}]*border-radius: 50%/);
  assert.match(mobileCss, /\.growth-network-orbit__member \{[^}]*width: 58px; height: 58px;[^}]*border-radius: 50%/);
  assert.match(mobileCss, /growth-network-orbit__member--one \{ left: 50%; top: 21\.49%; \}/);
  assert.match(mobileCss, /growth-network-orbit__member--five \{ left: 33\.80%; top: 79\.75%; \}/);
  for (const contract of ['NodeRegistry','CampaignEscrow','ContributionAttestation','SettlementSplitter']) {
    assert.match(mobileEntry, new RegExp(contract));
  }
  assert.match(mobileEntry, /growthNodeStatus:'not_created'/);
  assert.match(mobileEntry, /class="secondary-panel-scroll"/);
  assert.match(mobileEntry, /onPick:\(\)=>this\.setState\(\{growthNetworkTab:key\},\(\)=>this\.scrollPanelTop\(\)\)/);
  assert.match(mobileEntry, /growth_node_created_demo/);
  assert.match(mobileEntry, /growth_node_member_confirmed_demo/);
  assert.match(mobileEntry, /growth_node_trial_started_demo/);
  assert.match(mobileEntry, /growth_economic_node_application_demo/);
  assert.match(mobileEntry, /calculateGrowthCreditScore\(source=this\.state\)/);
  assert.match(mobileEntry, /Math\.round\(300\+weighted\*6\)/);
  assert.match(mobileEntry, /credit_score:credit\.score,credit_threshold:credit\.threshold/);
  assert.match(mobileCss, /\.growth-signal-grid \{[^}]*grid-template-columns: 1fr 1fr/);
  assert.match(mobileCss, /\.growth-credit-factor-grid \{[^}]*grid-template-columns: 1fr 1fr/);
  assert.match(mobileEntry, /server_confirmed:false,on_chain_confirmed:false/);
  assert.match(mobileEntry, /增长网络经济节点/);
  assert.match(mobileEntry, /真实状态必须由服务端、成员签署与链上交易共同确认/);
});

test('Node globe halo stays inside its canvas and does not clip above the metric cards', () => {
  assert.match(mobileEntry, /cx = W \/ 2, cy = H \/ 2, R = 222, tilt = 0\.3/);
  assert.match(mobileEntry, /Keep the 1\.26x brand halo fully inside the canvas/);
  assert.doesNotMatch(mobileEntry, /cy = H \/ 2 \+ 15, R = 238/);
});

test('creator operations are consolidated under Creator Center and the fourth tab is Messages', () => {
  assert.match(mobileEntry, /label:'创作者中心',meta:'创作与运营'/);
  assert.match(mobileEntry, /requireCreatorAction\(\(\)=>this\.setState\(\{screen:'quests'/);
  assert.match(mobileEntry, /aria-label="返回我的" onClick="\{\{ creatorCenterBack \}\}"/);
  assert.match(mobileEntry, /creatorCenterBack:\(\)=>this\.setState\(\{screen:'me',overlay:null,panel:null\}\)/);
  assert.match(mobileEntry, />创作者中心</);
  assert.match(mobileEntry, /Agentic Playable 增长闭环/);
  assert.match(mobileEntry, /Campaign 交付中心/);
  assert.match(mobileEntry, /待处理事项/);
  assert.match(mobileEntry, /<sc-if value="\{\{ showHeaderBell \}\}"/);
  assert.match(mobileEntry, /showHeaderBell:s\.screen!==\'quests\'[\s\S]{0,120}s\.screen!==\'world\'/);
  assert.doesNotMatch(mobileEntry, /<div style="display:grid;grid-template-columns:repeat\(3,1fr\);gap:9px">\s*<div role="button" tabindex="0" onClick="\{\{ openContentLibrary \}\}"/);
  assert.match(mobileEntry, /isMessages/);
  assert.match(mobileEntry, /navMessages/);
  assert.match(mobileEntry, /运营待处理/);
  assert.match(mobileEntry, /玩家动态/);
  assert.match(mobileEntry, /class="messages-screen"[^>]*padding:8px 0 20px[^>]*gap:0/);
  assert.match(mobileEntry, /class="message-card"[^>]*width:100%;min-height:82px;border-radius:0/);
  assert.match(mobileEntry, /border:0;border-bottom:1px solid \{\{ n\.border \}\};padding:15px 20px/);
  assert.doesNotMatch(mobileEntry, /class="message-card"[^>]*border-radius:16px/);
  assert.match(mobileEntry, /isLegacyLocalTitle=\/本地\\s\*MVP\/\.test\(n\.title\|\|''\)/);
  assert.doesNotMatch(mobileEntry, /我的持续增长资产/);
  assert.doesNotMatch(mobileEntry, /<span style="font-size:14px;font-weight:700">◆ 我的 Agentic Playables<\/span>/);
  assert.doesNotMatch(mobileEntry, /<span style="font-size:14px;font-weight:700">◎ 效果归因<\/span>/);
  assert.doesNotMatch(mobileEntry, /<span style="font-size:14px;font-weight:700">✓ Campaign 与商业结算<\/span>/);
});

test('structured frontend delivery exposes launch, AI twin, search, messaging, rights and governance loops', () => {
  for (const term of ['class="launch-splash"', 'AI 分身', '唯一主分身', '与 Agentic Playable 的关系', '全局搜索', '私信与 AI 辅助', '站内权益中心', '发布与治理', '全项目功能中心', '26 项结构化需求']) {
    assert.ok(mobileEntry.includes(term), `missing structured frontend term: ${term}`);
  }
  for (let index = 1; index <= 26; index += 1) {
    assert.match(mobileEntry, new RegExp(`['"]R${String(index).padStart(2, '0')}['"]`));
  }
  assert.match(mobileEntry, /aiTwinStatus:'not_created'/);
  assert.match(mobileEntry, /external[^\n]{0,220}服务端凭证与渠道审批/);
  assert.match(mobileEntry, /AIP 仅用于平台内展示、创作与运营权益，不可兑换 AIT、现金、USDT/);
  assert.match(mobileEntry, /真实停机必须由服务端策略执行/);
  assert.match(mobileEntry, /messageTabs,messageCards/);
  assert.match(mobileEntry, /panelProductCenter:s\.panel==='productCenter'/);
  assert.match(mobileEntry, /角色视角/);
  assert.match(mobileEntry, /权限不升级/);
  assert.match(mobileEntry, /productCenterRoleView:'kol'/);
  assert.match(mobileEntry, /product_center_role_view_change/);
  assert.match(mobileEntry, /permission_changed:false/);
  assert.match(mobileEntry, /当前仅为 KOL 功能预览，请先完成创作者身份开通/);
});

test('AI Twin separates public profile identity and completes scene, locale, campaign and version governance', () => {
  for (const term of [
    '个人资料与 AI 分身独立管理',
    '复制当前公开资料',
    '创建主分身',
    '创建后独立编辑',
    '场景分身管理',
    '多语言话术与声音',
    'Campaign 知识与权限隔离',
    '版本与发布治理',
    '授权记录',
    '回滚会保留失败版本和操作记录'
  ]) assert.match(mobileEntry, new RegExp(term));
  assert.match(mobileEntry, /创建时<br>复制一次/);
  for (const event of [
    'ai_twin_primary_created',
    'ai_twin_scene_created',
    'ai_twin_locale_saved',
    'ai_twin_version_created',
    'ai_twin_version_status_changed',
    'ai_twin_scene_pause_changed',
    'ai_twin_version_rolled_back'
  ]) assert.match(mobileEntry, new RegExp(event));
  assert.match(mobileEntry, /aiTwinCopyProfileOnCreate:true/);
  assert.match(mobileEntry, /aiTwinProfileCopyConsumed:false/);
  assert.match(mobileEntry, /kind:'primary'/);
  assert.match(mobileEntry, /General English Male/);
  assert.match(mobileEntry, /한국어 남성 일반 음성/);
  assert.match(mobileCss, /\.ai-twin-identity-map/);
  assert.match(mobileCss, /\.ai-twin-scene-manager/);
  assert.match(mobileCss, /\.ai-twin-language-editor/);
  assert.match(mobileCss, /\.ai-twin-campaign-grid/);
  assert.match(mobileCss, /\.ai-twin-version-list/);
  assert.match(mobileCss, /\.ai-twin-authorization-list/);
});

test('direct messaging uses complete chat rows and a governed bottom action area', () => {
  for (const affordance of ['direct-message-row', 'direct-message-avatar', 'chat-day-divider', 'direct-chat-actions', 'chat-handoff-button']) {
    assert.ok(mobileEntry.includes(affordance), `missing direct chat affordance: ${affordance}`);
  }
  assert.match(mobileEntry, /AI 只提供回复建议，不会自动代表本人发送/);
  assert.match(mobileEntry, /onKeyDown="\{\{ onMessageKeyDown \}\}"/);
  assert.match(mobileEntry, /activeThreadBadge:activeThread\.id==='ai-twin'\?'AI 辅助':'本地对话'/);
  assert.match(mobileCss, /\.direct-message-row \{ display:flex; width:100%; align-items:flex-start/);
  assert.match(mobileCss, /\.direct-message--me > span \{ border-radius:14px 14px 4px 14px/);
  assert.match(mobileCss, /\.direct-chat-actions \{ display:flex; flex-direction:column/);
  assert.match(mobileEntry, /class="direct-message-row \{\{ msg\.rowClassName \}\}"/);
});

test('AI Twin uses a controlled full-body action library with truthful speech and fallback states', () => {
  for (const action of ['greeting','nod','point','open-hands','thinking','thanks']) {
    const asset = `public/ai-twin/full-body/${action}.jpg`;
    assert.equal(fs.existsSync(path.join(root, asset)), true, `missing ${asset}`);
    assert.match(mobileEntry, new RegExp(`/ai-twin/full-body/${action}\\.jpg`));
  }
  for (const term of ['HeyGen 原生口型＋动作','受控动作库','声音＋字幕','仅字幕','安全拦截演示','静态身份卡','打断并停止']) {
    assert.match(mobileEntry, new RegExp(term));
  }
  assert.match(mobileEntry, /中文、英文和韩语场景均使用 HeyGen 真实视频口型/);
  assert.match(mobileEntry, /aiTwinVoiceState:'idle'/);
  assert.match(mobileEntry, /splitAiTwinSpeech\(text\)/);
  assert.match(mobileEntry, /ai_twin_safety_block_demo/);
  assert.match(mobileEntry, /window\.speechSynthesis/);
  assert.match(mobileCss, /\.ai-twin-stage--speaking/);
  assert.match(mobileCss, /\.ai-twin-stage--listening/);
  assert.match(mobileCss, /\.ai-twin-fallback/);
  assert.match(mobileCss, /prefers-reduced-motion/);
});

test('AI Twin KOL styles keep their role identity and expose truthful motion fallbacks', () => {
  for (const file of [
    'brand-kol-motion.mp4','brand-kol-poster.jpg',
    'cyber-tech-kol-motion.mp4','cyber-tech-kol-poster.jpg'
  ]) {
    const asset = `public/ai-twin/heygen/showcase/${file}`;
    assert.equal(fs.existsSync(path.join(root, asset)), true, `missing ${asset}`);
    assert.match(mobileEntry, new RegExp(`/ai-twin/heygen/showcase/${file.replace('.', '\\.')}`));
  }
  assert.match(mobileEntry, /HeyGen 原生口型＋动作/);
  assert.match(mobileEntry, /native_motion_preview/);
  assert.match(mobileEntry, /精准口型因当前账户生成额度为 0/);
  assert.match(mobileCss, /\.ai-twin-style--semireal \.ai-twin-heygen-video/);
  assert.match(mobileCss, /\.ai-twin-style--cyber \.ai-twin-heygen-video/);
});

test('AI Twin exposes four positioning modes, a unified five-role KOL library and a complete game introduction', () => {
  for (const file of ['web3-game-kol-poster.webp','web3-game-kol-zh-intro.mp4','web3-game-kol-en-gameplay.mp4','web3-game-kol-ko-community.mp4']) {
    const asset = `public/ai-twin/heygen/${file}`;
    assert.equal(fs.existsSync(path.join(root, asset)), true, `missing ${asset}`);
    assert.match(mobileEntry, new RegExp(`/ai-twin/heygen/${file.replace('.', '\\.')}`));
  }
  for (const term of [
    '数字主播 / 客服型',
    '品牌代言人 / 偶像型',
    '游戏角色 / 元宇宙型',
    '虚拟助理 / 专业顾问型',
    '我的 KOL 分身 · 自定义虚拟角色',
    'HeyGen Web3 游戏 KOL',
    '品牌讲解 KOL · 精致 CG',
    '二次元 3D KOL · 潮流游戏角色',
    '赛博科技 KOL · 虚拟顾问',
    '多语言互动场景',
    'English',
    'Gameplay Guide',
    '한국어',
    '커뮤니티 보안 미션',
    '开始完整介绍',
    '介绍游戏',
    '讲解玩法',
    '运营与贡献',
    '开始体验'
  ]) assert.match(mobileEntry, new RegExp(term));
  assert.equal(fs.existsSync(path.join(root, 'public/ai-twin/personas/anime-game.png')), true, 'missing fixed anime KOL role asset');
  assert.match(mobileEntry, /key:'anime'.*short:'二次元 3D KOL'.*asset:'\/ai-twin\/personas\/anime-game\.png'.*preserveIdentityStatic:true.*videoStatus:'角色保留 · 待口型'/);
  assert.match(mobileEntry, /角色固定保留/);
  assert.match(mobileEntry, /不使用真人样片替换/);
  assert.match(mobileEntry, /ai-twin-heygen-video/);
  assert.match(mobileEntry, /handleAiTwinHeyGenTimeUpdate/);
  assert.match(mobileEntry, /provider:'heygen'/);
  assert.match(mobileCss, /\.ai-twin-heygen-video/);
  assert.match(mobileEntry, /ai_twin_full_intro_start/);
  assert.match(mobileEntry, /ai_twin_full_intro_complete/);
  assert.match(mobileCss, /\.ai-twin-position-grid/);
  assert.match(mobileCss, /\.ai-twin-style-row/);
  assert.match(mobileCss, /\.ai-twin-experience-grid/);
  assert.match(mobileCss, /\.ai-twin-tour__steps/);
});

test('profile avatar upload feeds a session-only custom KOL twin builder without claiming real 3D generation', () => {
  for (const term of ['头像与 KOL 分身','制作我的 KOL 分身','KOL 分身角色库','角色风格','服装造型','默认动作','保存为我的 KOL 分身','头像驱动概念预览']) {
    assert.match(mobileEntry, new RegExp(term));
  }
  assert.match(mobileEntry, /accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(mobileEntry, /图片只保留在当前前端会话中，不上传云端、不写入本地持久化/);
  assert.match(mobileEntry, /当前只生成前端概念预览，不训练人脸模型、不生成真实口型视频/);
  assert.match(mobileEntry, /profileAvatarPreview:''/);
  assert.match(mobileEntry, /profileAvatarPreview:'', profileAvatarUploadName:'', profileAvatarUploadError:'', aiTwinCustomSaved:false/);
  const persistedKeys = mobileEntry.match(/const keys = \[[^\n]+\]/)?.[0] || '';
  assert.ok(persistedKeys.length > 0, 'missing persistence key list');
  assert.doesNotMatch(persistedKeys, /profileAvatarPreview|profileAvatarUploadName|profileAvatarUploadError/);
  assert.match(mobileCss, /\.profile-avatar-editor/);
  assert.match(mobileCss, /\.ai-twin-custom-builder/);
  assert.match(mobileCss, /\.ai-twin-custom-stage-character/);
});

test('top headers route messages explicitly and My keeps the settings drawer with a logout confirmation', () => {
  assert.doesNotMatch(mobileEntry, /aria-label="通知"/);
  assert.doesNotMatch(mobileEntry, />🔔/);
  assert.match(mobileEntry, /aria-label="消息" onClick="\{\{ openNotifications \}\}"/);
  assert.match(mobileEntry, /aria-label="打开设置" onClick="\{\{ openSettings \}\}"/);
  assert.match(mobileEntry, /M5 7h14M5 12h14M5 17h14/);
  assert.match(mobileEntry, /class="settings-drawer" role="dialog" aria-modal="true" aria-label="我的功能抽屉"/);
  assert.match(mobileEntry, /aria-label="关闭功能抽屉" onClick="\{\{ closeSettingsDrawer \}\}"/);
  assert.match(mobileEntry, /<svg class="settings-drawer-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="\{\{ d\.path \}\}"><\/path><\/svg>/);
  const drawerIconData = mobileEntry.slice(mobileEntry.indexOf('const drawerPrimaryRows'), mobileEntry.indexOf('const languageOptions'));
  assert.equal((drawerIconData.match(/\{path:'/g) || []).length, 16, 'both role-specific drawer sets should use semantic SVG paths');
  assert.doesNotMatch(drawerIconData, /\{icon:'/);
  assert.match(mobileCss, /\.settings-drawer-icon \{[\s\S]*width: 20px;[\s\S]*color: var\(--text-secondary\);[\s\S]*stroke-width: 1\.7;/);
  assert.match(mobileCss, /\.settings-drawer-label \{[\s\S]*color: var\(--text-primary\);[\s\S]*font-size: 12px;[\s\S]*font-weight: 700;/);
  assert.doesNotMatch(mobileEntry, /扫一扫|openScanner/);
  assert.doesNotMatch(mobileEntry, /更多功能|openMoreFeatures/);
  for (const term of ['身份认证', '品牌合作', '我的客服', '切换语言', '设置', '退出登录']) {
    assert.ok(mobileEntry.includes(term), `missing drawer term: ${term}`);
  }
  for (const term of ['观看历史', '稍后再看', '未成年人模式', '离线缓存', '我的二维码', '清理缓存', '切换账号']) {
    assert.ok(!drawerIconData.includes(term), `removed drawer term is still present: ${term}`);
  }
  assert.match(mobileEntry, /openSettings:\(\)=>this\.setState\(\{drawerOpen:true\}\)/);
  assert.match(mobileEntry, /label:'切换语言',meta:s\.uiLanguage==='en'\?'English':'简体中文'/);
  assert.match(mobileEntry, /label:'设置',meta:'',onPick:\(\)=>this\.setState\(\{drawerOpen:false,panel:'settings'\}\)/);
  assert.match(mobileEntry, /panelLanguage:s\.panel==='language',languageOptions/);
  assert.match(mobileEntry, /document\.documentElement\.lang=language\.code/);
  assert.match(mobileEntry, /showSettingsDrawer:!!s\.drawerOpen/);
  assert.match(mobileCss, /@keyframes drawerSlideIn/);
  assert.match(mobileEntry, /settings:'设置'/);
  assert.match(mobileEntry, /aria-label="退出登录" onClick="\{\{ confirmLogout \}\}"/);
  assert.match(mobileEntry, /confirmLogout:\(\)=>this\.setState\(\{systemModal:'logoutConfirm',systemModalQueue:\[\]\}\)/);
  assert.match(mobileEntry, /logoutConfirmed:\(\)=>\{this\.setState\(\{drawerOpen:false,systemModal:null,systemModalQueue:\[\]\}\);this\.logout\(\);\}/);
  assert.match(mobileEntry, /fetch\('\/api\/auth\/logout', \{method:'POST', credentials:'include', keepalive:true\}\)/);
  assert.match(mobileEntry, /this\._suspendPersist = true/);
  assert.match(mobileEntry, /sessionStorage\.setItem\('airvana\.v5\.force-login','1'\)/);
  assert.match(mobileEntry, /location\.reload\(\)/);
  assert.doesNotMatch(mobileEntry, />重置内部数据<\/div>/);
});

test('Settings exposes legal, product information, appearance and governed account deletion controls', () => {
  for (const term of ['用户协议', '隐私协议', '关于我们', '推送设置', '外观模式', '浅色', '深色', '删除账号', '30 天冷静期', '取消删除申请']) {
    assert.ok(mobileEntry.includes(term), `missing settings term: ${term}`);
  }
  assert.match(mobileEntry, /role="switch" tabindex="0" aria-label="推送设置"/);
  assert.match(mobileEntry, /pushEnabled: true, themeMode: 'light'/);
  assert.match(mobileEntry, /themeClass:s\.themeMode==='dark'\?'theme-dark':''/);
  assert.match(mobileEntry, /themeStorageKey = 'airvana\.v5\.theme-mode'/);
  assert.match(mobileEntry, /localStorage\.setItem\(this\.themeStorageKey, themeMode\)/);
  assert.match(mobileEntry, /useLightTheme:\(\)=>this\.setThemeMode\('light'\),useDarkTheme:\(\)=>this\.setThemeMode\('dark'\)/);
  assert.match(mobileEntry, /openTermsFromSettings:\(\)=>this\.setState\(\{panel:'terms',panelReturn:'settings'\}\)/);
  assert.match(mobileEntry, /openPrivacyFromSettings:\(\)=>this\.setState\(\{panel:'privacy',panelReturn:'settings'\}\)/);
  assert.match(mobileEntry, /openAbout:\(\)=>this\.setState\(\{panel:'about',panelReturn:'settings'\}\)/);
  assert.match(mobileEntry, /panelDeleteAccount:s\.panel==='deleteAccount'/);
  assert.match(mobileEntry, /panelReturn:s\.panel\|\|null/);
  assert.match(mobileEntry, /panel:s\.panelReturn\|\|null,panelReturn:null/);
  assert.match(mobileEntry, /输入“删除账号”确认/);
  assert.match(mobileEntry, /\(this\.state\.accountDeletionPhrase\|\|''\)\.trim\(\) !== '删除账号'/);
  assert.match(mobileEntry, /fetch\('\/api\/account\/deletion-request', \{method:'POST',credentials:'include'/);
  assert.match(mobileEntry, /fetch\('\/api\/account\/deletion-request\/'\+encodeURIComponent\(request\.id\)\+'\/cancel', \{method:'POST',credentials:'include'\}\)/);
  assert.match(mobileEntry, /payload\.deletionRequest && payload\.deletionRequest\.status === 'pending'/);
  assert.match(mobileEntry, /Airvana 不会也无法删除你的外部数字钱包或链上记录/);
  assert.doesNotMatch(mobileEntry, /localStorage\.clear\(/);
  assert.match(mobileEntry, /panelAbout:s\.panel==='about'/);
  assert.match(mobileCss, /\.app-shell\.theme-dark/);
  for (const token of ['--surface-canvas: #101114', '--surface-card: #1b1d21', '--surface-elevated: #202227', '--text-secondary: #a3a6ae', '--border-primary: #303238']) {
    assert.ok(mobileCss.includes(token), `missing dark theme token: ${token}`);
  }
  assert.match(mobileEntry, /class="message-card"/);
  assert.match(mobileEntry, /var\(--message-read-bg,#FFFFFF\)/);
  assert.match(mobileEntry, /var\(--message-unread-bg,#FFF8F8\)/);
  assert.match(mobileCss, /\.app-shell\.theme-dark \.settings-drawer-group/);
  assert.match(mobileCss, /\.app-shell\.theme-dark \.drawer-logout/);
  assert.match(mobileCss, /\.bottom-nav \[role="button"\]:focus-visible/);
  assert.doesNotMatch(mobileEntry, />全局演示标识<\/span>/);
});

test('full project center owns the startup popup demo controls and frontend environment boundary', () => {
  for (const term of ['演示控制', '版本升级弹窗', '运营任务弹窗', '消息提醒弹窗', '测试环境', '生产环境']) {
    assert.ok(mobileEntry.includes(term), `missing project-center demo control: ${term}`);
  }
  assert.match(mobileEntry, /productCenterIsDemo:s\.productCenterTab==='demo'/);
  assert.match(mobileEntry, /frontendEnvironment:'test',demoPopupVersionEnabled:true,demoPopupMessageEnabled:true,demoPopupOperationsEnabled:true/);
  assert.match(mobileEntry, /if \(this\.state\.frontendEnvironment !== 'test'\)/);
  assert.match(mobileEntry, /production_service_connected:false,permission_changed:false/);
  assert.match(mobileEntry, /环境开关只作用于当前设备的前端演示/);
  assert.match(mobileEntry, /不会连接生产服务、切换服务器凭证/);
  assert.match(mobileCss, /\.demo-environment-options/);
  assert.match(mobileCss, /\.demo-popup-switch\[aria-checked="true"\]/);
});

test('About exposes safe official media channel entries without unverified external URLs', () => {
  for (const term of ['官方媒体渠道', 'Facebook', 'Telegram', 'Discord', '即将开放', '官方人员不会索取助记词、私钥或验证码']) {
    assert.ok(mobileEntry.includes(term), `missing official media term: ${term}`);
  }
  assert.match(mobileEntry, /aria-label="X 官方渠道"/);
  assert.match(mobileEntry, /officialMediaUrls = Object\.freeze\(\{facebook:'',telegram:'',x:'',discord:''\}\)/);
  assert.match(mobileEntry, /openOfficialMedia\(platform, key\)/);
  assert.match(mobileEntry, /if \(!url\) \{ this\.toast\(platform \+ ' 官方渠道即将开放'\); return; \}/);
  assert.match(mobileEntry, /window\.open\(url, '_blank', 'noopener,noreferrer'\)/);
  const mediaConfigStart = mobileEntry.indexOf('officialMediaUrls = Object.freeze');
  const mediaConfigEnd = mobileEntry.indexOf(';', mediaConfigStart);
  assert.ok(mediaConfigStart >= 0 && mediaConfigEnd > mediaConfigStart, 'official media config must be extractable');
  assert.doesNotMatch(mobileEntry.slice(mediaConfigStart, mediaConfigEnd + 1), /https?:\/\/(?:www\.)?(?:facebook\.com|t\.me|x\.com|discord\.(?:gg|com))\//i);
});

test('center publish action uses a prompt-first quick/deep creator with governed review', () => {
  for (const term of [
    '描述品牌目标和游戏创意，创作一个 Agentic Playable',
    '描述你想创作的游戏玩法、角色或互动挑战',
    "label:'快速'",
    "label:'深度'",
    '能力编排',
    '模板',
    '互动挑战',
    '产品探索',
    '安全教育',
    '社区任务',
    'Crypto City 安全挑战',
    '星际农场 Community Launch',
    '产品探索路径',
    '霓虹城市品牌解谜'
  ]) assert.ok(mobileEntry.includes(term), `missing creator term: ${term}`);

  for (const capability of ['文本与字体','2D / 3D / AR 素材','互动挑战','关卡与进度存档','角色库与 Persona','NPC 交互','摄像头与 AR','体感与震动','多人参与','版本生命周期','外部连接器','事件与归因','受控运营','程序化动画','镜像绘制','VR 体验','3D 场景','触屏界面模拟','程序化世界生成','软体物理','分步创作器']) {
    assert.ok(mobileEntry.includes(`'${capability}'`), `missing creation capability: ${capability}`);
  }
  for (const category of ['推荐','内容素材','玩法系统','角色剧情','感知设备','社交共创','智能运营','其他']) {
    assert.ok(mobileEntry.includes(`'${category}'`), `missing creation capability category: ${category}`);
  }
  assert.match(mobileEntry, /const recommendedPowerIds=\[\.\.\.new Set\(\[\.\.\.recentRecommendationIds,\.\.\.promptRecommendationIds,\.\.\.complementRecommendationIds,\.\.\.defaultRecommendationIds\]\)\]/);
  assert.match(mobileEntry, /recommendationLabel=recentRecommendationIds\.includes\(p\.id\)\?'最近使用':promptRecommendationIds\.includes\(p\.id\)\?'按目标推荐':complementRecommendationIds\.includes\(p\.id\)\?'缺失能力补全':'热门组合'/);
  assert.match(mobileEntry, /powerCategoryHint:/);
  assert.match(mobileEntry, /itemKind:'capability'/);
  assert.doesNotMatch(mobileEntry, /power\('remixFlow'/);
  const powerGridPos = mobileEntry.indexOf('<div class="create-power-grid">');
  const atomicLoopPos = mobileEntry.indexOf('<sc-for list="{{ createPowers }}"', powerGridPos);
  assert.ok(powerGridPos >= 0 && atomicLoopPos > powerGridPos,
    '能力宫格必须直接从七类原子能力开始');
  assert.match(mobileEntry, /class="create-power-grid"><sc-for list="\{\{ createPowers \}\}"/);
  assert.match(mobileEntry, /const powerDisplayCount=visiblePowers\.length;/);
  assert.match(mobileEntry, /border:selected\?\(s\.composerMode==='deep'\?'#18D8DE':'#FF5A70'\):'#303034'/);
  assert.doesNotMatch(mobileEntry, /shadow:selected\?'inset\s+\d+px\s+0\s+0/);
  assert.doesNotMatch(mobileEntry, /box-shadow:\{\{ p\.shadow \}\}/);
  assert.match(mobileCss, /\.create-power-card\s*\{[^}]*box-sizing:\s*border-box;[^}]*border:\s*1px solid #303034;/);
  assert.doesNotMatch(mobileEntry, /showControlledRemix|openControlledRemix|showTemplateShortcut|openTemplateLibrary/);
  assert.doesNotMatch(mobileEntry, /create-remix-card|create-template-shortcut-card|从已发布作品 Remix|从模板库选择/);
  assert.doesNotMatch(mobileCss, /\.create-remix-card|\.create-template-shortcut-card/);
  assert.match(mobileEntry, /createHomeTabs:\[\{key:'create',label:'能力组合'/);
  assert.match(mobileEntry, /\{key:'templates',label:'模板',icon:'▦'\}/);
  assert.doesNotMatch(mobileEntry, /power\('templateLibrary'/);
  assert.match(mobileEntry, /原子能力：可加入能力组合的单项功能；模板：完整可运行结构。/);
  assert.match(mobileEntry, /营销智能体不能修改 Campaign Contract 锁定字段/);

  assert.match(mobileEntry, /composerMode==='deep'/);
  assert.doesNotMatch(mobileEntry, /aria-label="打开草稿和 Playables"/);
  assert.doesNotMatch(mobileEntry, /openContentLibrary:/);
  assert.doesNotMatch(mobileEntry, /KOL 是运营者，Playable 是可自主运营的营销智能体；当前生成的是本地演示预览。/);
  assert.match(mobileEntry, /class="create-idea-input \{\{ createModeClass \}\}"/);
  assert.match(mobileCss, /\.create-idea-input \{[\s\S]*min-height: 96px;[\s\S]*font-size: 17px;/);
  assert.doesNotMatch(mobileEntry, /createScopeTitle|createScopeBadge|createScopeDescription/);
  assert.match(mobileEntry, /createModeBg:s\.composerMode==='deep'\?'linear-gradient\(155deg,#18E4DF 0%,#00C8D4 52%,#16A8E8 100%\)'/);
  assert.match(mobileEntry, /'linear-gradient\(155deg,#FF5968 0%,#FF3B74 52%,#B62EE8 100%\)'/);
  assert.match(mobileEntry, /background:\{\{ createModeBg \}\}/);
  assert.match(mobileEntry, /createAccent:s\.composerMode==='deep'\?'#007E86':'#FF3B62'/);
  assert.match(mobileEntry, /class="composer-prep-bar" role="group" aria-label="创作准备栏"/);
  assert.match(mobileEntry, /class="composer-tool-button \{\{ t\.stateClass \}\}"/);
  assert.match(mobileEntry, /class="composer-tool-badge"/);
  assert.match(mobileEntry, /width="22\.5" height="22\.5"/);
  for (const label of ['AI 灵感','项目素材','目标']) assert.ok(mobileEntry.includes(`label:'${label}'`));
  assert.match(mobileEntry, /aria-label="搜索能力编排"[^>]*font-size:25\.5px;line-height:1/);
  assert.match(mobileEntry, /createToolColor:s\.composerMode==='deep'\?'#07191B':'#FFFFFF'/);
  assert.match(mobileCss, /\.composer-prep-bar \{/);
  assert.match(mobileCss, /\.composer-tool-button \{[\s\S]*width: 46\.8px;[\s\S]*height: 46\.8px;[\s\S]*border-radius: 50%;/);
  assert.match(mobileCss, /\.composer-tool-badge \{[\s\S]*border-radius: 999px;[\s\S]*background: #007e86;/);
  assert.match(mobileCss, /\.composer-primary-action \{[\s\S]*min-width: 92px;[\s\S]*height: 42\.5px;[\s\S]*border-radius: 999px;/);
  assert.match(mobileCss, /\.composer-primary-action\.is-ready/);
  assert.match(mobileCss, /\.create-idea-input\.mode-deep::placeholder/);
  assert.match(mobileEntry, /createTemplateHome:s\.createStep==='home'&&s\.createHomeTab==='templates'/);
  assert.match(mobileEntry, /aria-label="选用模板 \{\{ t\.title \}\}"/);
  assert.match(mobileEntry, /const capabilityIds=this\.sanitizeCapabilityIds\(t\.capabilityIds,createRoleScope\);this\.setState\(\{createHomeTab:'create',createPowerCat:t\.powerCat,selectedPowerIds:capabilityIds,recentPowerIds:capabilityIds,composerPromptHistory:\[\],[\s\S]*?gamePrompt:t\.prompt/);
  assert.match(mobileEntry, /const templateCatalog = s\.sessions\.map/);
  assert.match(mobileEntry, /badge:'首页内容'/);
  assert.match(mobileEntry, /不复制原 Campaign 的品牌声明、CTA、地区、归因或结算规则/);
  assert.match(mobileEntry, /class="template-browser" style="[^"]*background:var\(--surface-canvas,#F2F2F7\);color:var\(--text-primary,#1C1C1E\)/);
  assert.match(mobileEntry, /class="template-card" role="button"/);
  assert.match(mobileEntry, /class="template-card-preview" style="height:180px/);
  assert.match(mobileEntry, /templateHomeTabs:\[/);
  assert.match(mobileEntry, /bg:s\.createHomeTab===t\.key\?'#FFF1F2':'transparent'/);
  assert.doesNotMatch(mobileEntry, /class="template-browser" style="[^"]*background:#050506/);
  assert.doesNotMatch(mobileEntry, /class="template-browser" style="[^"]*background:#000000/);
  assert.match(mobileCss, /\.template-grid::\-webkit-scrollbar/);
  assert.match(mobileEntry, /createStep:'brief'/);
  assert.match(mobileEntry, /生成 Agentic Playable 预览/);
  assert.match(mobileEntry, /提交发布检查/);
  assert.match(mobileEntry, /发布到本地演示/);
  assert.match(mobileEntry, /品牌声明、地区、预算、归因、结算及发布必须锁定或人工确认/);
});

test('mobile presentation centers KOL-operated Agentic Playables and the complete value loop', () => {
  for (const term of [
    'KOL 是运营者',
    'Playable 是营销智能体，KOL 是运营者',
    '我的 Agentic Playables',
    '连接内容生成、互动转化、效果归因、商业结算与数字资产沉淀',
    'Campaign Contract',
    '归因证据链',
    '商业结算',
    '可复制资产'
  ]) assert.ok(mobileEntry.includes(term), `missing positioning term: ${term}`);

  assert.match(mobileEntry, /把 Playable、运营规则、受众洞察和归因记录沉淀为长期资产/);
  assert.match(mobileEntry, /不把演示数值作为真实收入、可提现余额或商业结果/);
  assert.match(mobileEntry, /AIP 与 AIT 分开记账/);
  assert.match(mobileEntry, />我的钱包</);
  assert.doesNotMatch(mobileEntry, /AIP \/ AIT 积分记录/);
  assert.doesNotMatch(mobileEntry, />我的 Agent<\/span>/);
  assert.doesNotMatch(mobileEntry, /热门 Agent/);
});

test('mobile navigation exposes four primary actions and an accessible more menu without horizontal overflow dependency', () => {
  assert.match(frontend, /const primaryNav = nav\.slice\(0, 4\)/);
  assert.match(frontend, /class="mobile-nav"/);
  assert.match(frontend, /aria-controls="mobile-more-menu"/);
  assert.match(css, /grid-template-columns:repeat\(5,1fr\)/);
  assert.match(css, /\.sidebar\{display:none\}/);
});

test('dialogs trap focus, close with Escape and restore the invoking control', () => {
  assert.match(ui, /event\.key === 'Escape'/);
  assert.match(ui, /event\.key !== 'Tab'/);
  assert.match(ui, /previousFocus\.focus\(\)/);
  assert.match(ui, /aria-modal="true"/);
});

test('Campaign and deliverable UI expose complete contracts, evidence and state-gated actions', () => {
  for (const field of ['audience', 'channel', 'conversionGoal', 'successMetric', 'brandAssets', 'optimizableFields', 'ctaLabel', 'ctaUrl']) {
    assert.ok(frontend.includes(field), `missing Campaign field ${field}`);
  }
  assert.match(frontend, /campaignWindowState\(c\)/);
  assert.match(frontend, /d\.status==='submitted'/);
  assert.doesNotMatch(frontend, /\['submitted','changes_requested'\]\.includes\(d\.status\)/);
  assert.match(frontend, /data-action="deliverable-evidence"/);
  assert.match(frontend, /查看成品/);
});

test('mobile P0 closes the local Campaign, Agent task and capability disclosure loops', () => {
  for (const field of [
    'gamePrompt', 'campaignBrand', 'campaignAudience', 'campaignRegion', 'campaignChannel',
    'campaignSuccessEvent', 'campaignCTA', 'campaignCTAUrl', 'campaignRewardRule',
    'campaignAttributionWindow', 'campaignAttributionModel', 'campaignSettlementBasis',
    'campaignAssets', 'campaignCompliance', 'campaignWorkflowStage',
    'campaignActiveContentId', 'campaignActiveVersionId', 'campaignAttributionEvidence',
    'campaignSettlementRecord', 'campaignAssetSnapshot'
  ]) assert.ok(mobileEntry.includes(field), `missing persisted mobile P0 field: ${field}`);

  for (const label of [
    '结构化输入', 'Campaign Contract {{ campaignContractVersion }}', '可优化：', '锁定：', '审批：',
    'Contract', 'Playable', '交付审批', '归因证据', '结算复核', '资产沉淀'
  ]) assert.ok(mobileEntry.includes(label), `missing mobile Campaign contract label: ${label}`);

  assert.match(mobileEntry, /const campaignAction = \(\) =>/);
  assert.match(mobileEntry, /const attributionAction = \(\) =>/);
  assert.match(mobileEntry, /const settlementAction = \(\) =>/);
  assert.match(mobileEntry, /不代表真实品牌批准、归因或结算/);
  assert.match(mobileEntry, /不生成真实应收或可提现余额/);

  assert.match(mobileEntry, /运营工作台/);
  assert.match(mobileEntry, /const ownedPublishedPlayables = s\.sessions\.filter/);
  assert.match(mobileEntry, /managerStartTask:\(\)=>managerTaskContent\?this\.setState/);
  assert.match(mobileEntry, /ownedPublishedPlayables\.find\(x=>x\.id===s\.selectedContentId\)/);
  assert.doesNotMatch(mobileEntry, /managerStartTask:\(\)=>this\.setState\(\{selGame:cur\.game/);
  assert.match(mobileEntry, /q\.id === 1\) this\.setState\(\{overlay:'task'/);
  assert.match(mobileEntry, /q\.id === 2\) this\.setState\(\{panel:'campaign'/);
  assert.match(mobileEntry, /q\.id === 3\) this\.setState\(\{panel:'attribution'/);
  assert.match(mobileEntry, /\+ 新建运营任务/);

  assert.match(mobileEntry, /permission:\{statusLabel:'需设备授权'/);
  assert.match(mobileEntry, /approval:\{statusLabel:'需审批'/);
  for (const status of ['可生成原型', '前端原型', '需设备授权', '需实时服务', '需审批']) {
    assert.ok(mobileEntry.includes(status), `missing capability support status: ${status}`);
  }
  assert.match(mobileEntry, /营销智能体不能修改 Campaign Contract 锁定字段/);

  assert.match(mobileEntry, /const campaignCompletedCounts = \[0,1,2,3,4,4,6\]/);
  assert.match(mobileEntry, /const hasOperationalPermission = !!/);
  assert.doesNotMatch(mobileEntry, /\{title:'运营权限', ok:true/);
  assert.match(mobileEntry, /status:s\.reviewPassed\?'reviewed-local-demo':'draft-local-demo'/);
  assert.match(mobileEntry, /campaignActiveVersionId:createIsKolScope&&s\.campaignId&&!scheduled\?nextVersionId:null/);
  assert.match(mobileEntry, /normalizeCampaignState\(data\)/);
  assert.match(mobileEntry, /serverConfirmed:false/);
  assert.match(mobileEntry, /contentVersionId:s\.campaignActiveVersionId/);
  assert.match(mobileEntry, /status:'submitted-local-demo'/);
  assert.match(mobileEntry, /status:'ready-local-copy'/);
  assert.match(mobileEntry, /campaignSettlement\.status!=='submitted-local-demo'/);
  assert.match(mobileEntry, /const copyRole=activeRoleView==='player'\?'player':'kol'/);
  assert.match(mobileEntry, /const newCampaignId=copyRole==='kol'\?'campaign-copy-'\+newId:null/);
  assert.match(mobileEntry, /createdByRole:copyRole,publishScope:copyRole==='kol'\?'campaign_and_connectors':'app_only'/);
  assert.match(mobileEntry, /const campaignContractVersionFor=state=>/);
  assert.match(mobileEntry, /return 'local-'\+\(hash>>>0\)\.toString\(36\)/);
  assert.match(mobileEntry, /const campaignContractVersion = campaignContractVersionFor\(s\)/);
  assert.doesNotMatch(mobileEntry, /version:'v0\.1'/);
  assert.match(mobileEntry, /evidence\.contractVersion === contractVersion/);
  assert.match(mobileEntry, /isReusableAssetSnapshot\(snapshot/);
  assert.match(mobileEntry, /snapshot\.status !== 'ready-local-copy'/);
  assert.match(mobileEntry, /parentSnapshotId:campaignDeliverable\.sourceAssetSnapshotId\|\|null/);
  assert.match(mobileEntry, /content:\{id:campaignDeliverable\.id,type:campaignDeliverable\.type/);
  assert.match(mobileEntry, /const reusableSnapshot=this\.isReusableAssetSnapshot\(i\.assetSnapshot[^;]+\?i\.assetSnapshot:null/);
  assert.match(mobileEntry, /const snapshotContent=reusableSnapshot\?reusableSnapshot\.content:\{\}/);
  assert.match(mobileEntry, /deliveryStatus:'submitted-local-demo',contract:\{\.\.\.x\.contract,approvalStatus:'submitted-local-demo'/);
  assert.match(mobileEntry, /deliveryStatus:'approved-local-demo',contract:\{\.\.\.x\.contract,approvalStatus:'approved-local-demo'/);
  assert.match(mobileEntry, /viewers:0,conversions:0/);
  assert.match(mobileEntry, /sourceAssetSnapshotId:\(sourceDraft&&sourceDraft\.sourceAssetSnapshotId\)\|\|\(old&&old\.sourceAssetSnapshotId\)\|\|null/);
  assert.match(mobileEntry, /sourceAssetSnapshotId:\(existingDraft&&existingDraft\.sourceAssetSnapshotId\)\|\|\(existingSession&&existingSession\.sourceAssetSnapshotId\)\|\|null/);
  assert.match(mobileEntry, /sourceAssetSnapshotId:lastPublished\.sourceAssetSnapshotId\|\|null/);
  assert.match(mobileEntry, /i\.status==='archived'\)\{this\.openContent\(i\.id,'detail'\);this\.toast\(/);
  assert.match(mobileEntry, /const belongsToActiveCampaign=/);
  assert.match(mobileEntry, /stage === 6 && !snapshotValid\) stage = deliverableValid/);
  assert.doesNotMatch(mobileEntry, /86 个已验证转化/);
  assert.doesNotMatch(mobileEntry, /示例已验证转化|互动 [^'\n]*已验证转化|完成 18 个示例已验证转化/);
  assert.doesNotMatch(mobileEntry, /Wallet Safety Week/);
});

test('mobile reusable asset snapshots fail closed when content or evidence lineage is incomplete', () => {
  const methodStart = mobileEntry.indexOf('  isReusableAssetSnapshot(');
  const methodEnd = mobileEntry.indexOf('\n  normalizeCampaignState(', methodStart);
  assert.ok(methodStart >= 0 && methodEnd > methodStart, 'snapshot validator method must be extractable');
  const SnapshotHarness = Function('"use strict";return class SnapshotHarness {' + mobileEntry.slice(methodStart, methodEnd) + '}')();
  const validator = new SnapshotHarness();
  const contract = {brand:'Brand',audience:'Adults',region:'Test',channel:'KOL link',successEvent:'complete',cta:'Continue',ctaUrl:'airvana-demo://cta',rewardRule:'No cash',attributionWindow:'7 days',attributionModel:'last valid touch',settlementBasis:'approved events',assets:'logo',compliance:'no promises',version:'contract-v1'};
  const attribution = {id:'evidence-1',status:'confirmed-local-demo',source:'local-demo',serverConfirmed:false,campaignId:'campaign-1',contentId:'content-1',contentVersionId:'content-1-v1',contractVersion:'contract-v1'};
  const settlement = {id:'settlement-1',status:'completed-local-demo',sourceOfTruth:'local-demo',campaignId:'campaign-1',contentId:'content-1',contentVersionId:'content-1-v1',contractVersion:'contract-v1',evidenceId:'evidence-1'};
  const valid = {id:'asset-1',snapshotVersion:1,status:'ready-local-copy',parentSnapshotId:null,campaignId:'campaign-1',contentId:'content-1',contentVersionId:'content-1-v1',contractVersion:'contract-v1',evidenceId:'evidence-1',settlementId:'settlement-1',content:{id:'content-1',type:'game',title:'Playable',summary:'Interactive summary',audience:'公开',agent:'Nova',tags:[]},versions:[{id:'content-1-v1',label:'v1'}],contract,attribution,settlement,learning:['retain evidence']};
  assert.equal(validator.isReusableAssetSnapshot(valid), true);
  const numericContentId = {...valid,contentId:42,content:{...valid.content,id:42},attribution:{...attribution,contentId:42},settlement:{...settlement,contentId:42}};
  assert.equal(validator.isReusableAssetSnapshot(numericContentId,{contentId:42}), true);
  assert.equal(validator.isReusableAssetSnapshot({...valid,content:null}), false);
  assert.equal(validator.isReusableAssetSnapshot({...valid,versions:[]}), false);
  assert.equal(validator.isReusableAssetSnapshot({...valid,snapshotVersion:2}), false);
  assert.equal(validator.isReusableAssetSnapshot({...valid,parentSnapshotId:'   '}), false);
  assert.equal(validator.isReusableAssetSnapshot({...valid,attribution:{...attribution,contentVersionId:'forged-version'}}), false);
  assert.equal(validator.isReusableAssetSnapshot(valid,{campaignId:'different-campaign'}), false);
});

test('content editor and task audit expose structured fields and read-only step evidence', () => {
  for (const field of ['sections', 'interactions', 'assets', 'safetyNotes', 'ctaLabel', 'ctaUrl']) {
    assert.ok(frontend.includes(`name:'${field}'`), `missing editor field ${field}`);
  }
  assert.match(frontend, /data-content-preview/);
  assert.match(frontend, /输入 \/ 输出证据/);
  assert.match(frontend, /旧任务兼容记录/);
});

test('prompt-first composer closes inspiration, asset, goal and preflight loops without publishing', () => {
  for (const label of [
    '预览改动（', '差异预览', '整合优化', '追加补充', '应用前检查', '确认应用', '返回调整', '撤销最近修改',
    '从设备选择', '支持图片、视频文件，单个文件不超过 20MB', '项目素材库', 'Asset Manifest', '用途 ·', '焦点 ·', '切换授权',
    '主要目标', '目标用户', '成功事件', 'CTA 类型', '保存目标',
    '生成前检查未通过', 'SCHEME CONFIRMATION · LOCAL DEMO', '确认并生成本地预览'
  ]) assert.ok(mobileEntry.includes(label), `missing composer closure affordance: ${label}`);

  assert.doesNotMatch(mobileEntry, /替换原文|追加到原文|撤销上次应用/);
  assert.match(mobileEntry, /cardClass:'inspiration-suggestion-card'/);
  assert.match(mobileEntry, /aria-pressed="\{\{ suggestion\.ariaPressed \}\}"/);
  assert.match(mobileEntry, /id="create-idea-input"/);
  assert.match(mobileEntry, /composerInspirationPrimaryLabel=\s*composerInspirationNeedsPrompt\?'先填写创意主题'/);
  assert.match(mobileEntry, /composerInspirationPrimaryAction=composerInspirationNeedsPrompt\?guideComposerInspirationPrompt:previewComposerInspiration/);
  assert.match(mobileEntry, /document\.getElementById\('create-idea-input'\)/);
  assert.match(mobileEntry, /composerInspirationNeedsPrompt\|\|composerInspirationCanPreview\?'':' action-disabled'/);
  assert.match(mobileEntry, /onClick="\{\{ composerInspirationPrimaryAction \}\}">\{\{ composerInspirationPrimaryLabel \}\}/);
  assert.match(mobileEntry, /composerInspirationPreviewOpen:true/);
  assert.match(mobileEntry, /composerInspirationBaseContractVersion:campaignContractVersion/);
  assert.match(mobileEntry, /campaignContractVersionFor\(this\.state\)!==s\.composerInspirationBaseContractVersion/);
  assert.match(mobileEntry, /gamePrompt:next,composerPromptHistory:/);
  assert.match(mobileEntry, /before:st\.gamePrompt,after:next,contextKey/);
  assert.match(mobileEntry, /composerInspirationSelectedIds:\[\],composerInspirationPreviewOpen:false/);
  assert.doesNotMatch(mobileEntry, /inspiration-lock-note|inspiration-boundary-note|inspiration-local-badge|主题已锁定|选择优化建议|本地演示建议|当前版本使用确定性的本地建议/);
  assert.doesNotMatch(mobileCss, /\.inspiration-lock-note|\.inspiration-boundary-note|\.inspiration-local-badge/);
  assert.match(mobileCss, /\.inspiration-sticky-footer\s*\{[\s\S]*?position:\s*sticky/);
  assert.match(mobileCss, /\.inspiration-suggestion-card\.is-selected/);
  assert.match(mobileCss, /\.inspiration-suggestion-card\s*\{[^}]*box-sizing:\s*border-box;[^}]*border:\s*1px solid #e5e5ea;/);
  assert.doesNotMatch(mobileCss, /\.inspiration-suggestion-card\.is-selected\s*\{[^}]*box-shadow\s*:\s*inset/i);
  assert.match(mobileCss, /\.composer-sheet-scroll\s*\{[\s\S]*?min-height:\s*0;[\s\S]*?overscroll-behavior-y:\s*contain/);
  assert.match(mobileCss, /\.inspiration-mode-option\s*\{[\s\S]*?min-height:\s*44px/);
  assert.match(mobileCss, /@media \(max-width: 360px\)/);
  assert.match(mobileEntry, /airvana-v4\.css\?v=5\.4\.30/);
  assert.match(mobileEntry, /indexedDB\.open\('airvana\.local-composer-assets\.v1',1\)/);
  assert.match(mobileEntry, /composerAssetManifest\(assets\)/);
  assert.match(mobileEntry, /authorization:'pending'/);
  assert.match(mobileEntry, /深度模式必须全部确认授权/);
  assert.doesNotMatch(mobileEntry, /图片 \/ 视频 ≤ 20MB/);
  assert.match(mobileEntry, /const composerActionLabel=s\.generating\?'生成中…':!composerPrompt\?'填写创意':composerPrompt\.length<12\?'继续完善':composerMissingCount\?'完善 '\+composerMissingCount\+' 项':composerWarningIssues\.length\?'检查并生成':'生成预览'/);
  assert.match(mobileEntry, /const composerActionClass=s\.generating\?'is-loading action-disabled':composerPrompt\.length<12\?'is-incomplete':composerMissingCount\?'is-progress':composerWarningIssues\.length\?'is-review':'is-ready'/);
  assert.match(mobileEntry, /composerSendDisabled:s\.generating/);
  assert.match(mobileEntry, /composerSheet:composerBlockingIssues\.length\?'preflight':'confirm'/);
  assert.match(mobileEntry, /if \(composerBlockingIssues\.length\) \{ this\.setState\(\{composerSheet:'preflight'\}\); return; \}/);
  assert.match(mobileEntry, /不会直接发布、花费预算、发送消息或产生真实归因与结算/);
  assert.match(mobileEntry, /确认后仅生成本地预览/);
  assert.doesNotMatch(mobileEntry, /confirmComposerGeneration[\s\S]{0,220}publishAction\(/);
});

test('completion screen exposes replay, return, save, share and optional CTA without reward claims', () => {
  for (const label of ['重新体验', '返回内容广场', '保存到本设备', '分享 / 复制链接', 'optional_cta']) assert.ok(artifact.includes(label));
  assert.match(artifact, /此操作不产生积分/);
});

test('product terminology uses 互动故事 and 运行记录 in the application UI', () => {
  assert.match(frontend, /互动故事/);
  assert.match(frontend, /运行记录/);
  assert.doesNotMatch(frontend, />Trace</);
  assert.doesNotMatch(frontend, /短视频/);
});

test('deep composer locks approved distribution connectors into the Campaign Contract', () => {
  for (const label of ['发布连接器', 'Telegram', 'Facebook', 'Discord', '审批及合规检查通过后解锁', '分发意图']) {
    assert.ok(mobileEntry.includes(label), `missing connector closure affordance: ${label}`);
  }
  assert.match(mobileEntry, /distributionConnectors:\[\.\.\.\(s\.composerConnectors\|\|\[\]\)\]/);
  assert.match(mobileEntry, /content\.contract\.status==='reviewed-local-demo'/);
  assert.match(mobileEntry, /content\.status==='published'/);
  assert.match(mobileEntry, /connector_publish_intent/);
  assert.match(mobileEntry, /channel_id='\+encodeURIComponent\(String\(channel\|\|'share'\)\.toLowerCase\(\)\)/);
  assert.match(mobileEntry, /https:\/\/t\.me\/share\/url\?url=/);
  assert.match(mobileEntry, /https:\/\/www\.facebook\.com\/sharer\/sharer\.php\?u=/);
  assert.match(mobileEntry, /https:\/\/twitter\.com\/intent\/tweet\?text=/);
  assert.match(mobileEntry, /https:\/\/discord\.com\/channels\/@me/);
  assert.match(mobileEntry, /不会在 Airvana 内伪造已发布状态/);
});

test('deep composer renders compliance as locked structured rules with an editable brand supplement', () => {
  for (const label of ['合规与发布约束', '平台锁定', '账号安全', '营销表达', '用户控制', '品牌补充限制', '3 项规则已纳入 Contract', '审批及合规检查通过后解锁', '品牌限制与平台规则冲突']) {
    assert.ok(mobileEntry.includes(label), `missing compliance closure affordance: ${label}`);
  }
  assert.doesNotMatch(mobileEntry, /aria-label="深度目标合规限制"/);
  assert.match(mobileEntry, /compliance:this\.platformComplianceText/);
  assert.match(mobileEntry, /brandRestrictions:\(s\.campaignBrandRestrictions\|\|''\)\.trim\(\)/);
  assert.match(mobileEntry, /campaignCompliance:this\.platformComplianceText/);
});
