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
const completeGamesRuntime = read('public/complete-games-v3.js');
const termsOfService = read('public/legal-terms-v1.js');
const privacyPolicy = read('public/legal-privacy-v1.js');

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

test('frontend-only phases expose truthful evidence, progressive creation and a bounded feed window', () => {
  for (const marker of [
    '前端交付与依赖地图', 'product-status-summary',
    '界面覆盖', '本地演示', '本地服务', '待接能力',
    'create-power-disclosure'
  ]) assert.ok(mobileEntry.includes(marker), `missing frontend delivery marker: ${marker}`);

  assert.doesNotMatch(mobileEntry, /page-truth-banner|showPageTruthBanner|pageTruthMap/);
  assert.doesNotMatch(mobileCss, /\.page-truth-banner/);
  assert.doesNotMatch(mobileEntry, /local-create-flow|localCreateFlowSteps/);
  assert.doesNotMatch(mobileCss, /\.local-create-flow/);

  assert.match(mobileEntry, /\.filter\(\(item,i\)=>Math\.abs\(i-safePlayIdx\)<=1\)/);
  assert.match(mobileCss, /\.play-feed__slide\.is-buffered/);
  assert.match(frontend, /class="workspace-scope"/);
  assert.match(frontend, /后端阶段暂缓/);
  assert.match(css, /\.workspace-scope/);
});

test('visible divider lines use the shared 0.7px thickness without changing component borders', () => {
  assert.match(mobileCss, /--divider-height:\s*0\.7px;/);
  assert.match(css, /--divider-height:\s*\.7px;/);
  assert.match(mobileEntry, /airvana-v4\.css\?v=5\.5\.80/);
  assert.doesNotMatch(mobileEntry, /border-(?:top|bottom):\s*1px\s+solid/);
  assert.doesNotMatch(mobileCss, /border-(?:top|bottom):\s*1px\s+solid/);
  assert.doesNotMatch(css, /border-(?:top|bottom):\s*1px\s+solid/);
  assert.match(mobileEntry, /height:var\(--divider-height\);background:#F3D7DA/);
  assert.match(mobileCss, /\.kyc-upload-divider\s*\{[^}]*height:\s*var\(--divider-height\)/);
  assert.match(mobileCss, /\.create-power-card\s*\{[^}]*border:\s*1px solid #303034/);
});

test('dark composer sheets use semantic dark surfaces and compact close controls', () => {
  for (const hook of [
    'composer-goal-scope', 'composer-goal-deep', 'composer-goal-governance', 'composer-goal-save',
    'composer-asset-row', 'composer-asset-control'
  ]) assert.match(mobileEntry, new RegExp(`class="[^"]*${hook}`), `missing dark composer hook: ${hook}`);
  assert.doesNotMatch(mobileEntry, /composer-asset-boundary/);
  assert.doesNotMatch(mobileCss, /composer-asset-boundary/);
  assert.match(mobileEntry, /className:'composer-goal-chip'/);
  assert.match(mobileEntry, /className:'composer-goal-connector'/);

  assert.match(mobileCss, /\.composer-sheet-close\s*\{[^}]*width:\s*32px;[^}]*height:\s*32px;/);
  assert.match(mobileCss, /\.composer-sheet-close::before\s*\{[^}]*inset:\s*-6px;/);
  assert.match(mobileCss, /\.app-shell\.theme-dark \.composer-sheet-close\s*\{[^}]*background:\s*rgba\(255, 255, 255, 0\.06\)\s*!important;[^}]*color:\s*var\(--text-primary\)\s*!important;[^}]*box-shadow:\s*none;/);
  assert.match(mobileCss, /\.app-shell\.theme-dark \.composer-goal-chip\s*\{[^}]*background:\s*var\(--surface-control\)\s*!important;/);
  assert.match(mobileCss, /\.app-shell\.theme-dark \.composer-goal-deep,[\s\S]*?background:\s*var\(--surface-subtle\)\s*!important;/);
  assert.match(mobileCss, /\.app-shell\.theme-dark \.composer-goal-governance\s*\{[^}]*background:\s*#25191d\s*!important;/);
  assert.match(mobileCss, /\.app-shell\.theme-dark \.composer-goal-save\[aria-disabled="true"\][\s\S]*?background:\s*var\(--surface-control\)\s*!important;/);
});

test('dark AI inspiration cards avoid light pills and white selection controls', () => {
  assert.match(mobileCss, /\.app-shell\.theme-dark \.inspiration-suggestion-card\s*\{[^}]*background:\s*var\(--surface-subtle\)/);
  assert.match(mobileCss, /\.app-shell\.theme-dark \.inspiration-suggestion-title,[\s\S]*?color:\s*var\(--text-primary\)/);
  assert.match(mobileCss, /\.app-shell\.theme-dark \.inspiration-suggestion-tags > div\s*\{[^}]*background:\s*var\(--surface-control\);[^}]*color:\s*var\(--text-secondary\)/);
  assert.match(mobileCss, /\.app-shell\.theme-dark \.inspiration-suggestion-check\s*\{[^}]*background:\s*var\(--surface-control\)/);
  assert.match(mobileCss, /\.app-shell\.theme-dark \.inspiration-suggestion-card\.is-selected \.inspiration-suggestion-check\s*\{[^}]*background:\s*var\(--accent-primary\)/);
  assert.match(mobileCss, /\.app-shell\.theme-dark \.inspiration-secondary-action\s*\{[^}]*background:\s*var\(--surface-control\);[^}]*color:\s*var\(--text-primary\)/);
});

test('primary navigation is mounted only on first-level destinations', () => {
  const navStart = mobileEntry.indexOf('<div class="bottom-nav" role="navigation" aria-label="主导航"');
  const guardStart = mobileEntry.lastIndexOf('<sc-if value="{{ showPrimaryNavigation }}"', navStart);
  assert.ok(navStart >= 0 && guardStart >= 0 && guardStart < navStart, 'the primary navigation must be guarded by page hierarchy');
  assert.match(mobileEntry, /const primaryNavigationScreens = new Set\(\['play','discover','world','messages','me'\]\)/);
  assert.match(mobileEntry, /const showPrimaryNavigation = s\.ob >= 4[\s\S]{0,320}!s\.panel[\s\S]{0,160}!s\.overlay[\s\S]{0,160}!s\.drawerOpen[\s\S]{0,160}!s\.systemModal[\s\S]{0,160}!s\.pendingDeleteAgentId/);
  assert.match(mobileEntry, /showPrimaryNavigation,primaryNavActiveIndex,navPlay:/);
  assert.match(mobileEntry, /class="\{\{ navWorld\.className \}\}" aria-current="\{\{ navWorld\.ariaCurrent \}\}" aria-label="节点"/);
  assert.match(mobileEntry, /className:active\?'is-active':''[\s\S]{0,100}ariaCurrent:active\?'page':'false'/);
  assert.match(mobileCss, /\.app-shell\.theme-dark \.bottom-nav__capsule \[aria-current="page"\][\s\S]{0,180}color: #ffffff !important;/);
  assert.doesNotMatch(mobileEntry, /n\.key === 'me' && s\.screen === 'quests'/);
});

test('Discover is a separate swipeable 2.5-card gallery while Home remains immersive', () => {
  const feedStart = mobileEntry.indexOf('onPointerDown="{{ feedDown }}"');
  const discoverStart = mobileEntry.indexOf('<sc-if value="{{ isDiscover }}"');
  assert.ok(feedStart >= 0 && discoverStart > feedStart, 'Discover must remain a separate destination after the immersive Home feed');
  assert.match(mobileEntry, /const discoverTabs = \[\['recommend','推荐'\],\['following','关注'\],\['hot','热门'\],\['latest','最新'\]\]/);
  assert.match(mobileEntry, /class="discover-page"[\s\S]*?class="discover-tab-bar"[\s\S]*?class="discover-content main-tab-scroll" role="region" aria-label="发现内容列表"/);
  assert.match(mobileCss, /\.discover-page\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;[^}]*overflow:\s*hidden;/s);
  assert.match(mobileCss, /\.discover-tab-bar\s*\{[^}]*flex:\s*none;[^}]*background:\s*var\(--surface-canvas,/s);
  assert.match(mobileEntry, /const homeArcadeDiscoverIds = \[34,35,36,37,38,39,40,41,42,43,44,24,25,26,27,28,29,30,31,32,33,1,2,5,6,9,10,12,14,15,16,17,18,19,20,21,22,23\]/);
  assert.match(mobileEntry, /tag:'原创新游'/);
  assert.match(mobileEntry, /38 款原创离线游戏 · 全部具备三阶段玩法与重玩闭环/);
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

test('Home keeps the additional Playables under original names and store-fidelity covers', () => {
  const additions = [
    [15, '猫咪潜逃 Whisker Escape', 'whisker-escape.jpg'],
    [16, '撒币之旅', 'coin-journey.jpg'],
    [17, '丛林潜游 Jungle Dive', 'jungle-dive.jpg'],
    [18, '星际前线：裂隙突击', 'rift-strike.jpg'],
    [19, '星砂岛', 'stardust-island.jpg'],
    [20, '斗阵骑士', 'formation-knights.jpg'],
    [21, '银河玩具店', 'galaxy-toy-shop.jpg'],
    [22, '城市极速 City Rush', 'city-rush.jpg'],
    [23, '小炮手大战空降恶魔', 'sky-cannon.jpg']
  ];
  for (const [id, title, file] of additions) {
    assert.ok(mobileEntry.includes(`id:${id},type:'game',status:'published',game:'${title}'`), `missing seeded game: ${title}`);
    assert.ok(mobileEntry.includes(file.replace('.jpg','')), `missing store-fidelity cover key: ${file}`);
    assert.equal(fs.existsSync(path.join(root, 'public/assets/game-covers/store-fidelity-v4', file)), true, `missing store-fidelity cover file: ${file}`);
  }
  assert.match(mobileEntry, /const governedArcadeIds = new Set\(\[1,2,5,6,9,10,12,14,15,16,17,18,19,20,21,22,23,\.\.\.Array\.from\(\{length:21\},\(_,index\)=>index\+24\)\]\)/);
  assert.match(mobileEntry, /const sessions = \[\.\.\.sessionsWithCurrentArcadeCatalog, \.\.\.seededSessions\.filter\(item => !restoredSessionIds\.has\(item\.id\)\)\]/);
});

test('Home and Discover keep all eleven category games on the governed v3 package', () => {
  const additions = [
    [34,'果园合合塔 Orchard Merge','orchard-merge.jpg','plb_orchard_merge'],
    [35,'星尘割草 Star Mower','star-mower.jpg','plb_star_mower'],
    [36,'月光奶茶铺 Moonlight Tea Shop','moonlight-tea-shop.jpg','plb_moonlight_tea_shop'],
    [37,'微粒竞技场 Microbe Arena','microbe-arena.jpg','plb_microbe_arena'],
    [38,'星轨牌阵 Star Deck Tactics','star-deck.jpg','plb_star_deck'],
    [39,'晶核防线 Crystal Bastion','crystal-bastion.jpg','plb_crystal_bastion'],
    [40,'冒险者日志 Adventurer Journal','adventurer-journal.jpg','plb_adventurer_journal'],
    [41,'成语侦探 Idiom Detective','idiom-detective.jpg','plb_idiom_detective'],
    [42,'六角前线 Hex Frontier','hex-frontier.jpg','plb_hex_frontier'],
    [43,'今日造型师 Studio Wardrobe','studio-wardrobe.jpg','plb_studio_wardrobe'],
    [44,'花园焕新 Garden Renewal','garden-renewal.jpg','plb_garden_renewal']
  ];
  for (const [id,title,file,playableId] of additions) {
    assert.ok(mobileEntry.includes(`id:${id},type:'game',status:'published',game:'${title}'`),`missing category game: ${title}`);
    assert.equal(fs.existsSync(path.join(root,'public/assets/game-covers/store-fidelity-v4',file)),true,`missing category cover: ${file}`);
    assert.ok(mobileEntry.includes(playableId),`missing complete playable: ${playableId}`);
  }
  assert.match(mobileEntry,/contract_version:'3\.0\.0'/);
  assert.match(mobileEntry,/playable_config_version:'3\.0\.0'/);
  assert.match(mobileEntry,/deep-games-v2\.js\?v=2\.0\.0/);
  assert.match(mobileEntry,/sensor-interactions-v1\.js\?v=1\.1\.0/);
  assert.match(mobileEntry,/complete-games-v3\.js\?v=3\.3\.0/);
  assert.match(mobileEntry,/runtime:'complete-v3'/);
  assert.match(mobileEntry,/miniGameDeepVisible/);
  assert.match(mobileEntry,/对手均为确定性本地机器人，不是真人联机/);
  assert.match(mobileEntry,/cmp_home_complete_games_v3_20260815/);
  assert.match(mobileCss,/\.feed-arcade-game\.is-mower/);
  assert.match(mobileCss,/\.feed-arcade-game\.is-garden/);
  assert.equal(fs.existsSync(path.join(root,'docs/playable-demos/home-complete-v3/asset-manifest.json')),true);
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
  assert.match(mobileEntry, /<div class="play-feed__actions" aria-label="作品信息与上下切换区域" onPointerDown="\{\{ feedInfoDown \}\}" onPointerMove="\{\{ feedInfoMove \}\}" onPointerUp="\{\{ feedInfoUp \}\}" onPointerCancel="\{\{ feedInfoUp \}\}" onClick="\{\{ feedInfoTap \}\}"/);
  assert.match(mobileEntry, /const isFeedActionTarget=e=>/);
  assert.match(mobileEntry, /source==='info'&&isFeedActionTarget\(e\)/);
  assert.match(mobileEntry, /const runFeedInfoAction=action=>e=>/);
  assert.match(mobileEntry, /if\(this\._feedInfoDidSwipe\)/);
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
  assert.match(mobileEntry, /properties:\{\.\.\.properties,server_confirmed:false,source:'local-demo'\}/);
  assert.match(mobileEntry, /recordProductEvent\('share_intent'/);
  assert.match(mobileEntry, /recordProductEvent\('share_confirmed'/);
  assert.match(mobileEntry, /kind:'copy'/);
  assert.match(mobileEntry, /kind:'confirmed'/);
  assert.match(mobileEntry, /event\.kind==='confirmed'\)\?'已分享':'分享'/);
});

test('mobile text entry avoids iOS focus zoom and keeps comment and email fields above the keyboard', () => {
  assert.match(mobileEntry, /width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover/);
  assert.match(mobileEntry, /const textControlSelector = \[/);
  assert.match(mobileEntry, /--mobile-visual-width/);
  assert.match(mobileEntry, /--mobile-visual-left/);
  assert.match(mobileEntry, /window\.visualViewport\.addEventListener\('resize', syncMobileTextViewport\)/);
  assert.match(mobileEntry, /const dismissTextEntryOutside = event =>/);
  assert.match(mobileEntry, /document\.addEventListener\('pointerdown', dismissTextEntryOutside, true\)/);
  assert.match(mobileEntry, /const previousLayer = this\._activeLayerKey \|\| ''/);
  assert.match(mobileEntry, /this\._activeLayerKey = currentLayer/);
  assert.doesNotMatch(mobileEntry, /const previousLayer = layerKey\(prevState\)/);
  assert.match(mobileEntry, /class="comments-sheet__composer"/);
  assert.match(mobileEntry, /class="comments-sheet__input"/);
  assert.match(mobileCss, /\.comments-sheet__input\s*\{[^}]*border:\s*0;[^}]*background:\s*transparent;[^}]*font-size:\s*16px;[^}]*line-height:\s*1\.45;/);
  assert.match(mobileCss, /@media \(max-width: 430px\)[\s\S]*?input\[type="email"\],[\s\S]*?font-size:\s*16px !important;/);
  assert.match(mobileCss, /html\.native-app-shell \.app-shell input\[type="email"\],[\s\S]*?font-size:\s*16px !important;/);
  assert.match(mobileCss, /html\.mobile-text-entry-active \.app-shell\s*\{[^}]*left:\s*var\(--mobile-visual-left, 0px\) !important;[^}]*width:\s*var\(--mobile-visual-width, 100vw\) !important;[^}]*height:\s*var\(--mobile-visual-height, 100dvh\) !important;/);
  assert.match(mobileCss, /html\.native-app-shell \.app-shell input:focus-visible,[\s\S]*?outline:\s*0 !important;[\s\S]*?box-shadow:\s*none !important;/);
  assert.match(mobileCss, /\.email-login-card\s*\{[^}]*min-width:\s*0;[^}]*max-width:\s*100%;[^}]*overflow-x:\s*hidden;/);
});

test('Home media area exposes all 38 governed complete local games', () => {
  for (const gameKey of ['safety-workshop','stellar-farm','pixel-quest','red-cup-shuffle','magic-choir','paws-stage','puppet-studio','firefly-mail','whisker-escape','coin-journey','jungle-dive','rift-strike','stardust-island','formation-knights','galaxy-toy-shop','city-rush','sky-cannon','neon-dash','pulse-forge','sky-stack','rune-circuit','prism-match','star-cups','deep-catch','ember-bastion','nova-drift','void-squadron','orchard-merge','moonlight-tea-shop','microbe-arena','crystal-bastion','studio-wardrobe']) {
    assert.ok(completeGamesRuntime.includes(`'${gameKey}'`), `missing complete game runtime entry: ${gameKey}`);
  }
  for (const playableId of ['plb_star_mower','plb_star_deck','plb_adventurer_journal','plb_idiom_detective','plb_hex_frontier','plb_garden_renewal']) assert.ok(mobileEntry.includes(playableId),`missing deep playable: ${playableId}`);
  const storeFidelityManifest=JSON.parse(fs.readFileSync(path.join(root,'public/assets/game-covers/store-fidelity-v4/manifest.json'),'utf8'));
  assert.equal(storeFidelityManifest.files.length,38);
  assert.equal(storeFidelityManifest.generativeAI,true);
  assert.equal(storeFidelityManifest.thirdPartyAssets,false);
  assert.ok(storeFidelityManifest.files.every(item=>item.file.endsWith('.jpg')&&item.width===720&&item.height===1280&&item.sha256));
  for (const eventName of ['play_start','valid_interaction','level_complete','play_complete','play_fail','replay']) {
    assert.ok(mobileEntry.includes(`'${eventName}'`), `missing feed game event: ${eventName}`);
  }
  assert.match(mobileEntry, /class="\{\{ ss\.miniGameClass \}\}" role="region" aria-label="\{\{ ss\.miniGameAriaLabel \}\}" onPointerDown="\{\{ stopMiniGamePointer \}\}" onPointerMove="\{\{ stopMiniGamePointer \}\}" onPointerUp="\{\{ stopMiniGamePointer \}\}"/);
  assert.match(mobileEntry, /class="play-feed__cover" src="\{\{ ss\.cover \}\}"/);
  assert.match(mobileCss, /\.feed-mini-game\.is-arcade\.state-idle\s*\{[^}]*background:linear-gradient\([^}]*rgba\(5,8,12,\.02\)[^}]*backdrop-filter:none/);
  assert.match(mobileCss, /\.feed-mini-game\.is-arcade\.state-idle \.feed-mini-game__intro\s*\{[^}]*justify-content:center/);
  assert.match(mobileEntry, /本地互动 DEMO · 游戏金币按作品隔离；有效完成可记录本机 AIP/);
  assert.match(mobileEntry, /reward_issued:false/);
  assert.match(mobileEntry, /campaign_id:'cmp_home_complete_games_v3_20260815'/);
  assert.match(mobileEntry, /clearTimeout\(this\._feedMiniGameT\)/);
  assert.match(mobileEntry, /feedMiniGameDismissedContentId/);
  assert.match(mobileEntry, /class="feed-mini-game-launcher" aria-label="重新打开互动游戏"/);
  assert.match(mobileEntry, /class="feed-mini-game__sound"/);
  assert.match(mobileEntry, /ensureFeedAudio\(\)/);
  assert.match(mobileEntry, /airvana\.feed-mini-game\.muted/);
  assert.match(mobileEntry, /feedMiniGameBestScores/);
  assert.match(mobileEntry, /const featuredInteractiveIds=\[34,35,36,37,38,39,40,41,42,43,44,24,25,26,27,28,29,30,31,32,33,1,2,5,6,9,10,12,14,15,16,17,18,19,20,21,22,23\]/);
  assert.match(mobileEntry, /character-runtime-v1\.js\?v=1\.0\.1/);
  assert.match(mobileEntry, /sensor-interactions-v1\.js\?v=1\.1\.0/);
  assert.match(mobileEntry, /complete-games-v3\.js\?v=3\.3\.0/);
  assert.match(mobileEntry, /runtime=definition\.runtime==='complete-v3'\?window\.AirvanaCompleteGames:window\.AirvanaDeepGames/);
  assert.match(mobileCss, /\.feed-mini-game\s*\{[^}]*touch-action:manipulation/);
  assert.match(mobileCss, /\.feed-mini-game-launcher\s*\{[^}]*min-height:44px/);
  assert.match(mobileCss, /\.feed-safety-game__choice > \.sc-interp\s*\{[^}]*width:100%[^}]*grid-column:2/);
  assert.match(mobileCss, /\.feed-farm-game__cell\.is-target/);
  assert.match(mobileCss, /\.feed-cups-game\.is-shuffled/);
  assert.match(mobileCss, /\.feed-arcade-game__choice\.is-target/);
  assert.match(mobileCss, /@media \(prefers-reduced-motion:reduce\)/);
  assert.match(mobileCss, /\.play-feed__actions\s*\{[^}]*touch-action:\s*none/);
  assert.match(mobileCss, /\.play-feed__actions \[role="button"\]\s*\{[^}]*touch-action:\s*manipulation/);
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

test('desktop phone preview renders a theme-matched iPhone home indicator without duplicating native shells', () => {
  assert.match(mobileCss, /@media \(min-width: 431px\)[\s\S]*?html:not\(\.native-app-shell\)\s*\{[^}]*--safe-bottom:\s*34px;/);
  assert.match(mobileCss, /html:not\(\.native-app-shell\) \.app-shell::before\s*\{[^}]*height:\s*34px;[^}]*background:\s*var\(--surface-canvas, #f2f2f7\);/);
  assert.match(mobileCss, /html:not\(\.native-app-shell\) \.app-shell::after\s*\{[^}]*bottom:\s*8px;[^}]*width:\s*134px;[^}]*height:\s*5px;[^}]*background:\s*var\(--text-primary, #1c1c1e\);/);
  assert.match(mobileEntry, /class="app-shell \{\{ themeClass \}\} \{\{ nativeShellClass \}\} \{\{ shellScreenClass \}\}"/);
  assert.match(mobileEntry, /shellScreenClass:s\.screen==='play'\?'is-home-screen':s\.screen==='me'\?'is-secondary-screen is-me-screen':'is-secondary-screen'/);
  assert.match(mobileCss, /html:not\(\.native-app-shell\) \.app-shell\.is-home-screen::before\s*\{[^}]*background:\s*#000;/);
  assert.match(mobileCss, /html:not\(\.native-app-shell\) \.app-shell\.is-home-screen::after\s*\{[^}]*background:\s*#fff;/);
  assert.match(mobileCss, /html:not\(\.native-app-shell\) \.app-shell\.is-me-screen::before\s*\{[^}]*background:\s*#fff;/);
});

test('primary tab switching uses one animated iOS-style glass lens across five accessible targets', () => {
  assert.match(mobileEntry, /class="bottom-nav__capsule" data-active-index="\{\{ primaryNavActiveIndex \}\}"/);
  assert.match(mobileEntry, /const primaryNavActiveIndex=Math\.max\(0,nav\.findIndex\(item=>item\.active\)\)/);
  assert.match(mobileEntry, /showPrimaryNavigation,primaryNavActiveIndex,navPlay:/);
  assert.match(mobileCss, /\.app-shell \.bottom-nav__capsule\s*\{[^}]*background:\s*rgba\(248, 248, 250, 0\.68\)\s*!important;[^}]*backdrop-filter:\s*blur\(24px\) saturate\(1\.8\);/);
  assert.match(mobileCss, /\.app-shell\.is-home-screen:not\(\.theme-dark\) \.bottom-nav__capsule\s*\{[^}]*border-color:\s*rgba\(255, 255, 255, 0\.94\)\s*!important;[^}]*background:\s*#fff\s*!important;/);
  assert.match(mobileCss, /\.app-shell\.is-secondary-screen:not\(\.theme-dark\) \.bottom-nav__capsule\s*\{[^}]*border-color:\s*rgba\(255, 255, 255, 0\.94\)\s*!important;[^}]*background:\s*#fff\s*!important;/);
  assert.match(mobileEntry, /class="composer-deep-field__display" aria-hidden="true">\{\{ campaignBrand \}\}/);
  assert.match(mobileCss, /\.composer-deep-field__display\s*\{[^}]*font-size:\s*10px;[^}]*text-overflow:\s*ellipsis;/);
  assert.match(mobileCss, /\.app-shell \.composer-deep-field > input\s*\{[^}]*color:\s*transparent\s*!important;[^}]*font-size:\s*16px\s*!important;/);
  assert.match(mobileCss, /\.composer-deep-field > input:focus \+ \.composer-deep-field__display\s*\{[^}]*opacity:\s*0;/);
  assert.match(mobileCss, /\.app-shell \.bottom-nav__capsule::before\s*\{[^}]*left:\s*calc\(10% \+ 4\.8px\);[^}]*width:\s*46px;[^}]*height:\s*38px;[^}]*transition:\s*left 420ms cubic-bezier/);
  assert.match(mobileCss, /\.bottom-nav__capsule\[data-active-index="1"\]::before \{ left: calc\(30% \+ 2\.4px\); \}/);
  assert.match(mobileCss, /\.bottom-nav__capsule\[data-active-index="2"\]::before \{ left: 50%; \}/);
  assert.match(mobileCss, /\.bottom-nav__capsule\[data-active-index="3"\]::before \{ left: calc\(70% - 2\.4px\); \}/);
  assert.match(mobileCss, /\.bottom-nav__capsule\[data-active-index="4"\]::before \{ left: calc\(90% - 4\.8px\); \}/);
  assert.match(mobileCss, /\.bottom-nav__capsule > \[role="button"\]\s*\{[^}]*display:\s*flex !important;[^}]*flex:\s*0 0 44px;[^}]*align-items:\s*center !important;[^}]*justify-content:\s*center !important;[^}]*width:\s*44px !important;[^}]*height:\s*44px !important;[^}]*padding:\s*0 !important;/);
  assert.match(mobileCss, /@keyframes airvanaGlassTabSettle/);
  assert.match(mobileCss, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.bottom-nav__capsule > \.is-active \.bottom-nav__icon \{ animation: none; \}/);
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

test('wallet presents AIP, subscription allowances and Contract-bound AIT entitlements without a global withdrawal flow', () => {
  for (const term of ['AIP 与 AIT', 'Campaign 结算钱包（可选）', 'AIT 权益与结算', '进入商业结算', '经济模型边界', '订阅优先抵扣对应创作额度']) {
    assert.ok(mobileEntry.includes(term), `missing economy wallet term: ${term}`);
  }
  assert.match(mobileEntry, /fetch\('\/api\/wallet-bindings\/challenge'/);
  assert.match(mobileEntry, /fetch\('\/api\/wallet-bindings\/verify'/);
  assert.match(mobileEntry, /fetch\('\/api\/wallet-bindings\/validate-address'/);
  assert.match(mobileEntry, /method:'personal_sign'/);
  assert.match(mobileEntry, /AIP 是站内行为积分，不可提现、转让或交易/);
  assert.match(mobileEntry, /AIT 是 Campaign 权益与收益凭证，不可转让或交易/);
  assert.match(mobileEntry, /订阅只增加功能和创作额度，不直接发放 AIP 或 AIT/);
  assert.match(mobileEntry, /通用提现不可用/);
  assert.doesNotMatch(mobileEntry, /fetch\('\/api\/ait-withdrawals'/);
  assert.match(server, /pathname === '\/api\/wallet-bindings\/challenge'/);
  assert.match(server, /pathname === '\/api\/wallet-bindings\/verify'/);
  assert.match(server, /pathname === '\/api\/wallet-bindings\/validate-address'/);
  assert.match(server, /pathname === '\/api\/ait-withdrawals'/);
  assert.match(server, /'ait_withdrawal_retired'/);
  assert.match(server, /\/api\/ait-entitlements\/:id\/settlements/);
  assert.match(server, /\/api\/admin\/payment-settlements\/:id\/complete/);
  assert.doesNotMatch(mobileEntry, /AIP 提现/);
});

test('frontend demo mode closes non-financial login locally and blocks server-authoritative actions', () => {
  assert.match(mobileEntry, /frontendDemoMode = true/);
  assert.match(mobileEntry, /serviceSessionReady: false/);
  assert.match(mobileEntry, /finishLogin\(false,label\+'仅建立当前设备的前端演示身份/);
  assert.match(mobileEntry, /AIT 权益、订阅额度和结算状态需要账号与账本服务/);
  assert.match(mobileEntry, /if \(this\.frontendDemoMode\|\|!this\.state\.walletSessionReady\)/);
  assert.match(mobileEntry, /当前未连接账号服务，不请求绑定签名，所有权仍为未验证/);
  assert.match(mobileEntry, /this\.frontendDemoMode\|\|!this\.state\.walletSessionReady/);
  assert.match(mobileEntry, /当前为前端演示模式，不请求钱包连接或签名/);
  assert.match(mobileEntry, /aria-label="绑定数字货币钱包" aria-disabled="\{\{ walletBindingDisabled \}\}"/);
  assert.match(mobileEntry, /accountDeletionServiceRequired:!s\.serviceSessionReady/);
  assert.match(mobileEntry, /前端演示模式不会伪造删除申请/);
  assert.match(mobileEntry, /showAccountDeletionForm:!!s\.serviceSessionReady/);
});

test('wallet acquisition offers connection and manual address entry without inventing ownership', () => {
  for (const term of ['添加收款钱包', '连接钱包', '输入收款地址', '从剪贴板粘贴', '扫码填写', '保存为未验证地址', '所有权未验证 · 不可用于付款']) {
    assert.ok(mobileEntry.includes(term), `missing wallet acquisition term: ${term}`);
  }
  assert.match(mobileEntry, /wallet-binding-v1\.js\?v=1\.0\.0/);
  assert.match(mobileEntry, /WalletConnect[\s\S]{0,180}Reown Project ID/);
  assert.match(mobileEntry, /不会索取助记词、私钥或钱包密码/);
  assert.match(mobileEntry, /wallet_manual_address_saved/);
  assert.match(mobileEntry, /raw_address_recorded:false/);
  assert.match(mobileEntry, /content_recorded:false/);
  assert.match(mobileEntry, /image_uploaded:false,raw_qr_recorded:false/);
  assert.match(mobileEntry, /runGuardedAction\('wallet-bind','保存收款钱包地址'/);
  assert.match(mobileEntry, /requestDestructiveAction\('remove-wallet-candidate'/);
  assert.match(mobileEntry, /walletBindingSheetOpen \? 'wallet-binding'/);
  assert.match(mobileEntry, /!s\.walletBindingSheetOpen/);
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
  for (const title of ['创作者中心', '模板', 'AIP 与 AIT', 'AI 运营策略', 'AI 策略详情', 'Agent 任务']) {
    assert.match(mobileEntry, new RegExp(`class="secondary-page-title"[^>]*>${title}<\\/div>`));
  }
  assert.match(mobileEntry, /class="secondary-page-title">\{\{ detailHeaderTitle \}\}<\/div>/);
  assert.match(mobileEntry, /class="secondary-page-title"[^>]*>\{\{ createTitle \}\}<\/div>/);
  assert.match(mobileEntry, /class="secondary-page-title"[^>]*>\{\{ panelResolvedTitle \}\}<\/div>/);
  assert.match(mobileEntry, /aria-label="\{\{ panelResolvedTitle \}\}"/);
});

test('Playable detail is experience-first and gates owner operations by role and ownership', () => {
  assert.match(mobileEntry, /aria-label="Playable 详情" class="playable-detail"/);
  assert.match(mobileEntry, /class="playable-detail-hero__image" src="\{\{ detailCover \}\}"/);
  assert.match(mobileEntry, /detailHasStarted:s\.detailMode!=='detail'/);
  assert.match(mobileEntry, /detailShowingAgentSuggestion:s\.detailMode==='advice'/);
  assert.match(mobileEntry, /const detailMiniGameDefinition = this\.getFeedMiniGameDefinition\(detailContent\.id\)/);
  assert.match(mobileEntry, /targetPlayIdx=publishedSessions\.findIndex\(item=>item\.id===detailContent\.id\)/);
  assert.match(mobileEntry, /=>this\.startFeedMiniGame\(detailContent\.id,false\)/);
  assert.match(mobileEntry, /const detailCanManage = isKolRoleView && !!detailContent\.isOwned && detailContent\.createdByRole !== 'player'/);
  assert.match(mobileEntry, /detailShowManageEntry:detailCanManage&&!detailManagementOpen/);
  assert.match(mobileEntry, /label:'发布与治理',meta:'审批、暂停与回滚'/);
  assert.doesNotMatch(mobileEntry, /互动试玩 · 得分 \{\{ detailScore \}\}/);
  assert.doesNotMatch(mobileEntry, /detailFollowLabel:detailContent\.owner==='@kai\.builds'\?'本人'/);
  assert.match(mobileEntry, /class="app-back-button playable-detail__back"[\s\S]*?<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18 9 12 15 6"><\/path><\/svg>/);
  assert.match(mobileCss, /\.app-back-button \{[\s\S]*?width: var\(--touch-target\) !important;[\s\S]*?background: transparent !important;[\s\S]*?box-shadow: none !important;/);
  assert.match(mobileCss, /\.app-back-button svg \{[\s\S]*?width: 22px;[\s\S]*?height: 22px;[\s\S]*?stroke-width: 2\.2;/);
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
  assert.match(mobileCss, /\.app-back-button \{[\s\S]*min-height: var\(--touch-target\) !important/);
  assert.ok((mobileEntry.match(/class="app-back-button/g) || []).length >= 9, 'all page-level back controls should use the shared component');
  assert.doesNotMatch(mobileEntry, />‹<\/div>|>‹<\/button>/);
  assert.match(mobileCss, /\.feature-tab-row > div,[\s\S]*min-height: var\(--touch-target\)/);
  assert.match(mobileCss, /@media \(max-width: 374px\)/);
  assert.match(mobileCss, /@media \(max-width: 430px\)/);
  assert.match(mobileEntry, /\.app-shell\{width:min\(430px,100vw\)!important;height:min\(932px,100dvh\)!important/);
});

test('My screen follows a Douyin-inspired profile layout with ordered shortcuts and personal content tabs', () => {
  assert.match(mobileEntry, /class="me-page main-tab-scroll" data-me-page-scroll role="region" aria-label="我的页面内容" tabindex="0"[^>]*overflow-y:auto/);
  assert.match(mobileEntry, /class="my-content-surface"[^>]*min-height:0;flex:1 0 auto/);
  assert.match(mobileCss, /\.me-page\[data-me-page-scroll\]::after\s*\{[^}]*display:\s*none;/);
  assert.match(mobileEntry, /class="app-topbar__action app-topbar__action--rewards"[^>]*aria-label="获取积分"[^>]*width:40px;height:40px[^>]*><svg aria-hidden="true" width="24" height="24"/);
  assert.match(mobileEntry, /class="app-topbar__action app-topbar__action--notifications"[^>]*aria-label="消息"[^>]*width:40px;height:40px[^>]*><svg aria-hidden="true" width="24" height="24"/);
  assert.match(mobileEntry, /class="app-topbar__action app-topbar__action--settings"[^>]*aria-label="打开设置"[^>]*width:40px;height:40px[^>]*><svg aria-hidden="true" width="26" height="26"/);
  assert.match(mobileEntry, /class="profile-edit-trigger"[^>]*aria-label="编辑个人信息"[^>]*><svg aria-hidden="true" width="17" height="17"/);
  assert.match(mobileCss, /\.bottom-nav__icon\s*\{[^}]*width:\s*27px\s*!important;[^}]*height:\s*27px\s*!important;/);
  for (const term of ['>L3</span>', '获赞', '粉丝', '关注', '创作者中心', 'KOL AI 分身', "label:'钱包'", "meta:'AIP 与 AIT'", '站内权益', '身份与安全', '作品', '草稿箱', '收藏', '体验记录', '已点赞']) {
    assert.ok(mobileEntry.includes(term), `missing My screen term: ${term}`);
  }
  const shortcutStart = mobileEntry.indexOf('aria-label="KOL 专属入口"');
  const shortcutEnd = mobileEntry.indexOf('class="my-content-surface"', shortcutStart);
  const shortcutBlock = mobileEntry.slice(shortcutStart, shortcutEnd);
  assert.match(shortcutBlock, /<sc-for list="\{\{ profileShortcuts \}\}"/);
  assert.match(mobileEntry, /label:'钱包',meta:'AIP 与 AIT',onPick:\(\)=>this\.runGuardedAction\('wallet','钱包中心'/);
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
  assert.match(mobileEntry, /class="my-content-tabs"[^>]*border-bottom:var\(--divider-height\) solid var\(--border-primary,#E5E5EA\)/);
  assert.match(mobileEntry, /label:'身份认证',meta:identityDrawerMeta,onPick:\(\)=>this\.setState\(\{drawerOpen:false,panel:'identity'/);
  assert.match(mobileEntry, /panelIdentity:s\.panel==='identity'/);
  assert.match(mobileEntry, /grid-template-columns:repeat\(3,1fr\);gap:7px;padding:10px/);
  assert.match(mobileEntry, /min-height:190px;border-radius:12px;background:\{\{ mi\.bg \}\}/);
  assert.match(mobileEntry, /class="me-content-card__edit" aria-label="\{\{ mi\.editAria \}\}" onClick="\{\{ mi\.onEdit \}\}"/);
  assert.match(mobileEntry, /class="me-content-card__more" aria-hidden="true">•••<\/span>/);
  assert.match(mobileEntry, /hasEditAction:effectiveMeTab==='drafts'\|\|effectiveMeTab==='history'/);
  assert.match(mobileEntry, /editAria:effectiveMeTab==='history'\?'管理 '\+item\.game\+' 的体验记录':'编辑草稿 '\+item\.game/);
  assert.match(mobileCss, /\.me-content-card__edit \{[^}]*width:40px;[^}]*height:40px;/);
  assert.doesNotMatch(mobileCss, /\.me-content-card__edit::before/);
  assert.match(mobileCss, /\.me-content-card__more \{[^}]*color:#fff;[^}]*font-size:12px;/);
  assert.match(mobileEntry, /profileLikeCount:fmt\(profileLikeSource\.reduce/);
  assert.match(mobileEntry, /profileFollowerCount:fmt\(profileFollowerOwners\.length\)/);
  assert.match(mobileEntry, /class="profile-stats-page" aria-label="互动关系内容"/);
  assert.match(mobileEntry, /class="profile-stats-surface"/);
  assert.match(mobileEntry, /class="profile-stats-tabs" role="tablist" aria-label="互动关系分类"/);
  assert.match(mobileEntry, /class="profile-stats-grid"/);
  assert.match(mobileEntry, /class="profile-like-card"[^>]*aria-label="查看 \{\{ item\.title \}\}，\{\{ item\.likeLabel \}\}"/);
  assert.match(mobileEntry, /list="\{\{ profileLikeItems \}\}"/);
  assert.match(mobileEntry, /const profileLikeSource=ownedPlayables/);
  assert.match(mobileEntry, /profileLikeItems = profileLikeSource\.filter\(item=>Number\(item\.likes\|\|0\)>0\)\.sort/);
  assert.match(mobileEntry, /panelScrollClass:s\.panel==='profileStats'\?'secondary-panel-scroll secondary-panel-scroll--profile-stats':'secondary-panel-scroll'/);
  assert.match(mobileCss, /\[role="dialog"\] > \.secondary-page-header \+ \.secondary-panel-scroll--profile-stats \{[\s\S]{0,120}padding: 12px 0 0 !important;/);
  assert.match(mobileCss, /\.profile-stats-surface \{[\s\S]{0,320}border-radius: 18px 18px 0 0;[\s\S]{0,100}background: var\(--surface-card, #fff\);/);
  assert.match(mobileCss, /\.profile-stats-tabs \{[\s\S]{0,180}grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(mobileCss, /\.profile-stats-tab \{[\s\S]{0,180}min-height: 64px;/);
  assert.match(mobileCss, /\.profile-stats-grid \{[\s\S]{0,180}grid-template-columns: repeat\(3, minmax\(0, 1fr\)\);[\s\S]{0,80}gap: 7px;[\s\S]{0,80}padding: 10px;/);
  assert.match(mobileCss, /\.profile-like-card \{[\s\S]{0,180}min-height: 190px;[\s\S]{0,80}border-radius: 12px;/);
  assert.match(mobileEntry, /\{\{ item\.likes \}\}<\/span>/);
  assert.match(mobileEntry, /class="profile-relations-list"/);
  assert.match(mobileEntry, /class="profile-relation-cell"/);
  assert.match(mobileCss, /\.profile-relation-cell \{[\s\S]{0,160}width: 100%;[\s\S]{0,80}min-height: 78px;/);
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
  assert.match(mobileEntry, /aiTwinCustomSaved:false, meTab:'playables'/);
  assert.doesNotMatch(mobileEntry, /'distributionEvents','meTab','supportDraft'/);
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
  assert.match(mobileEntry, /setIdentitySimulationStatus\(kind, nextStatus\)/);
  assert.match(mobileEntry, /identityCreatorStatus === 'active_demo' && s\.identityKycStatus === 'verified_demo'/);
  for (const className of ['identity-simulator__toggle', 'identity-simulator__options', 'identity-permission-matrix', 'identity-permission-row']) assert.ok(mobileCss.includes(`.${className}`), `missing identity simulator style: ${className}`);
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
  for (const state of ['playFeedEmpty', 'discoverEmpty', 'worldPlayablesEmpty', 'meEmpty', 'aitEntitlementsEmpty', 'profileStatEmpty', 'libraryEmpty']) {
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
  assert.match(mobileEntry, /<sc-if value="\{\{ isWorld \}\}"[^>]*>[\s\S]{0,600}aria-label="了解 AI 分身与 Airvana 网络"[\s\S]{0,600}class="force-nav-icon"/);
  assert.match(mobileEntry, /aria-label="了解 AI 分身与 Airvana 网络"[^>]*style="[^"]*background:transparent;border:0/);
  assert.doesNotMatch(mobileEntry, /<circle class="force-nav-icon__spark"/);
  assert.match(mobileEntry, /aria-description="查看个人 AI 分身、Agentic Playable、自主运营与协作网络"/);
  assert.match(mobileEntry, /aria-label="节点" onClick="\{\{ navWorld\.onClick \}\}"[\s\S]{0,500}<ellipse cx="12" cy="12" rx="3\.8" ry="8\.5"/);
  assert.doesNotMatch(mobileEntry, /aria-label="节点" aria-description=/);
  assert.match(mobileEntry, /openForceCenter:\(\) => this\.setState\(\{panel:'growthNetwork',growthNetworkTab:'network'\},\(\)=>this\.scrollPanelTop\(\)\)/);
});

test('Growth Network explains the personal AI twin network and preserves governed collaboration', () => {
  assert.match(mobileEntry, /panelGrowthNetwork:s\.panel==='growthNetwork'/);
  assert.match(mobileEntry, /\[\['network','网络'\],\['node','我的连接'\],\['contribution','贡献'\],\['rules','规则'\]\]/);
  for (const term of [
    '每个人都有一个，',
    '持续成长的 AI 分身。',
    '长期记忆、数字身份与钱包',
    '把产品体验与真实反馈转化为新的创作方向',
    '一个用户',
    '一个 AI 分身',
    '多个 Agentic Playable',
    '从一次互动，到持续创作',
    '理解你',
    '连接玩家',
    '发现方向',
    '自主运营',
    '一个 AI 分身的完整能力',
    '数字分身',
    '数字钱包',
    'Playable OS',
    '分身彼此连接，形成 Airvana Network',
    '联合创作',
    '协作运营',
    '玩家洞察',
    '贡献归因',
    'Airvana 的持续增长飞轮',
    '自主，但不越界',
    '长期记忆由用户授权、可查看、可修正、可删除',
    '钱包只完成签名与授权',
    'Campaign Contract',
    'Agent 之间只共享完成协作所需的最小信息',
    '真实长期记忆、钱包授权、跨 Agent 协作与自动运营仍依赖后端',
    '不因邀请成员自动获得 Token',
    '每位用户只能加入一个主要经济节点',
    '信用分达到 650 才能申请经济节点',
    '履约记录 35%',
    '协作稳定性 25%',
    '贡献可信度 25%',
    '风险与合规 15%',
    '不是金融征信、借贷评分',
    '暂停、退出和申诉'
  ]) assert.ok(mobileEntry.includes(term), `missing Growth Network product term: ${term}`);
  assert.match(mobileEntry, /class="growth-agent-visual" role="img" aria-label="由长期记忆、数字分身、数字钱包和玩家互动共同驱动的个人 AI 分身"/);
  assert.match(mobileEntry, /class="growth-agent-twin__avatar"><img src="\{\{ profileAvatar \}\}"/);
  assert.match(mobileEntry, /class="growth-agent-network-map"[^>]*aria-label="多个用户的 AI 分身围绕 Agentic Playable 协作连接"/);
  assert.match(mobileEntry, /aria-label="查看我的 AI 分身" onClick="\{\{ openGrowthAiTwin \}\}"/);
  assert.match(mobileEntry, /aria-label="查看我的 Agent 连接" onClick="\{\{ openGrowthConnections \}\}"/);
  assert.match(mobileEntry, /openGrowthAiTwin:\(\)=>this\.openAiTwin\(\),openGrowthConnections:\(\)=>this\.setState\(\{growthNetworkTab:'node'\}/);
  assert.match(mobileCss, /\.growth-agent-hero \{[\s\S]{0,260}border-radius: 26px;[\s\S]{0,260}linear-gradient\(150deg, #18191d 0%, #22232a 55%, #16171b 100%\)/);
  assert.match(mobileCss, /\.growth-agent-loop \{[^}]*grid-template-columns: 1fr 1fr/);
  assert.match(mobileCss, /\.growth-agent-network-core \{[^}]*width: 96px; height: 96px;[^}]*border-radius: 50%/);
  assert.match(mobileCss, /@media \(max-width: 374px\) \{[\s\S]{0,260}\.growth-agent-loop \{ grid-template-columns: 1fr; \}/);
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
  assert.match(mobileCss, /\.growth-credit-factor-grid \{[^}]*grid-template-columns: 1fr 1fr/);
  assert.match(mobileEntry, /server_confirmed:false,on_chain_confirmed:false/);
  assert.match(mobileEntry, /增长网络经济节点/);
});

test('dark Growth contribution view uses layered surfaces instead of light pills', () => {
  assert.match(mobileCss, /\.app-shell\.theme-dark \.growth-contribution-hero \{[^}]*background: linear-gradient\(148deg, #24181c 0%, #1c1c21 58%, #181a1f 100%\) !important;/);
  assert.match(mobileCss, /\.app-shell\.theme-dark \.growth-credit-factor-card \{[^}]*background: linear-gradient\(150deg, #191b20 0%, #1d1b20 100%\) !important;/);
  assert.match(mobileCss, /\.app-shell\.theme-dark \.growth-contribution-chain > span \{[^}]*background: var\(--surface-control\);/);
  assert.match(mobileCss, /\.app-shell\.theme-dark \.growth-contribution-row \{[^}]*background: transparent !important;[^}]*box-shadow: none !important;/);
  assert.match(mobileCss, /\.app-shell\.theme-dark \.growth-network-tier-card \{[^}]*background: var\(--surface-card\);/);
});

test('Node globe halo stays inside its canvas and does not clip above the metric cards', () => {
  assert.match(mobileEntry, /cx = W \/ 2, cy = H \/ 2, R = 222/);
  assert.match(mobileEntry, /Keep the 1\.26x brand halo fully inside the canvas/);
  assert.doesNotMatch(mobileEntry, /cy = H \/ 2 \+ 15, R = 238/);
  assert.match(mobileEntry, /class="world-globe-canvas"[^>]*aria-label="可用手指拖动旋转的增长网络地球"/);
  assert.doesNotMatch(mobileEntry, /class="world-globe-drag-hint"/);
  assert.doesNotMatch(mobileEntry, /拖动地球旋转/);
  assert.match(mobileEntry, /addEventListener\('pointerdown',globePointerDown,\{passive:false\}\)/);
  assert.match(mobileEntry, /addEventListener\('pointermove',globePointerMove,\{passive:false\}\)/);
  assert.match(mobileEntry, /rotation \+= dx \* 0\.008/);
  assert.match(mobileEntry, /tilt = clamp\(tilt \+ dy \* 0\.0045,-0\.85,0\.85\)/);
  assert.match(mobileEntry, /velocityX \*= 0\.94/);
  assert.match(mobileEntry, /this\.disposeGlobe\(\)/);
  assert.match(mobileCss, /\.world-globe-canvas\s*\{[^}]*cursor:\s*grab;[^}]*touch-action:\s*none;/);
  assert.match(mobileCss, /\.world-globe-canvas\.is-dragging\s*\{[^}]*cursor:\s*grabbing;/);
});

test('creator operations are consolidated under Creator Center and the fourth tab is Messages', () => {
  assert.match(mobileEntry, /label:'创作者中心',meta:'创作与运营'/);
  assert.match(mobileEntry, /requireCreatorAction\(\(\)=>this\.setState\(\{screen:'quests'/);
  assert.match(mobileEntry, /aria-label="返回我的" onClick="\{\{ creatorCenterBack \}\}"/);
  assert.match(mobileEntry, /creatorCenterBack:\(\)=>this\.setState\(\{screen:'me',overlay:null,panel:null\}\)/);
  assert.match(mobileEntry, />创作者中心</);
  assert.match(mobileEntry, /data-creator-center="operations\|advice\|growth"/);
  assert.match(mobileEntry, /运营数据/);
  assert.match(mobileEntry, /运营建议/);
  assert.match(mobileEntry, /增长体系/);
  assert.match(mobileEntry, /Campaign Contract 与交付/);
  assert.match(mobileEntry, /<sc-if value="\{\{ showHeaderBell \}\}"/);
  assert.match(mobileEntry, /showHeaderBell:s\.screen!==\'quests\'[\s\S]{0,120}s\.screen!==\'world\'/);
  assert.doesNotMatch(mobileEntry, /<div style="display:grid;grid-template-columns:repeat\(3,1fr\);gap:9px">\s*<div role="button" tabindex="0" onClick="\{\{ openContentLibrary \}\}"/);
  assert.match(mobileEntry, /isMessages/);
  assert.match(mobileEntry, /navMessages/);
  assert.match(mobileEntry, /运营待处理/);
  assert.match(mobileEntry, /玩家动态/);
  assert.match(mobileEntry, /color:s\.messageTab===key\?'var\(--text-primary,#1C1C1E\)'\s*:\s*'var\(--text-tertiary,#8E8E93\)'/);
  assert.doesNotMatch(mobileEntry, /color:s\.messageTab===key\?'#1C1C1E':'#8E8E93'/);
  assert.match(mobileEntry, /class="messages-screen main-tab-scroll" data-message-list role="region" aria-label="消息列表" tabindex="0"[^>]*padding:0 0 20px[^>]*gap:0/);
  assert.match(mobileEntry, /class="message-card"[^>]*width:100%;min-height:82px;border-radius:0/);
  assert.match(mobileEntry, /border:0;border-bottom:var\(--divider-height\) solid \{\{ n\.border \}\};padding:15px 20px/);
  assert.doesNotMatch(mobileEntry, /class="message-card"[^>]*border-radius:16px/);
  assert.match(mobileEntry, /isLegacyLocalTitle=\/本地\\s\*MVP\/\.test\(n\.title\|\|''\)/);
  assert.doesNotMatch(mobileEntry, /我的持续增长资产/);
  assert.doesNotMatch(mobileEntry, /<span style="font-size:14px;font-weight:700">◆ 我的 Agentic Playables<\/span>/);
  assert.doesNotMatch(mobileEntry, /<span style="font-size:14px;font-weight:700">◎ 效果归因<\/span>/);
  assert.doesNotMatch(mobileEntry, /<span style="font-size:14px;font-weight:700">✓ Campaign 与商业结算<\/span>/);
});

test('creator center closes the governed Brief-to-settlement loop without claiming backend outcomes', () => {
  assert.match(mobileEntry, /creatorCenterTab:'operations'/);
  assert.match(mobileEntry, /creatorDataPeriod:'7d'/);
  assert.match(mobileEntry, /creatorAdviceCat:'priority'/);
  assert.match(mobileEntry, /creatorInspirationCat:'recommend'/);
  assert.match(mobileEntry, /creatorOpportunityCat:'recommended'/);
  assert.match(mobileEntry, /creatorOpportunityApplicationStates:\{\}/);
  for (const term of ['运营数据', '运营建议', '增长体系', '生成 Brief 草稿', 'Campaign Contract', '互动贡献趋势', '成长里程碑', '结算服务待接入', '事件服务待接入', '待服务端确认']) {
    assert.ok(mobileEntry.includes(term), `missing creator center term: ${term}`);
  }
  for (const term of ['依据', '假设', '目标', 'playable_impression', 'play_start', 'play_complete', 'approved success event']) {
    assert.ok(mobileEntry.includes(term), `missing evidence or funnel term: ${term}`);
  }
  assert.match(mobileEntry, /已提交本地演示申请，不代表品牌已收到或资格已通过/);
  assert.match(mobileEntry, /收益、收入与可提现金额均不在前端估算/);
  assert.match(mobileEntry, /campaignId:'campaign-'\+Date\.now\(\)/);
  assert.match(mobileEntry, /campaignBrand:'【待人工录入】'/);
  assert.match(mobileEntry, /campaignCTAUrl:'【待人工录入】'/);
  assert.match(mobileEntry, /campaignSettlementBasis:'【待人工录入】'/);
  assert.match(mobileCss, /\.creator-center-page\s*\{/);
  assert.match(mobileCss, /\.creator-center-tabs\s*\{/);
  assert.match(mobileEntry, /airvana-v4\.css\?v=5\.5\.80/);
  assert.match(mobileEntry, /class="creator-center-tab \{\{ tab\.className \}\}"[^>]*><span>\{\{ tab\.label \}\}<\/span><\/div>/);
  assert.doesNotMatch(mobileEntry, /<em>\{\{ tab\.meta \}\}<\/em>/);
  assert.match(mobileCss, /\.creator-center-tab\.is-active\s*\{\s*color:\s*var\(--creator-ink\);\s*\}/);
  assert.match(mobileCss, /\.creator-center-tab\.is-active::after\s*\{[^}]*width:\s*34px;[^}]*height:\s*3px;[^}]*transform:\s*translateX\(-50%\);/s);
  assert.doesNotMatch(mobileCss, /\.creator-center-tab\.is-active\s*\{[^}]*box-shadow:/s);
  assert.match(mobileCss, /\.creator-trend-card,/);
  assert.match(mobileCss, /\.creator-advice-card,/);
  assert.match(mobileCss, /\.creator-growth-section/);
  assert.match(mobileCss, /\.creator-opportunity-card\s*\{/);
  assert.match(mobileCss, /\.app-shell\.theme-dark \.creator-stage-card/);
  assert.match(mobileCss, /@media \(max-width: 380px\)/);
  assert.match(mobileCss, /@media \(min-width: 420px\)/);
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
  assert.match(mobileEntry, /txns:\s*s\.txns\.filter\(txn=>txn\.currency==='AIP'\)/);
  for (const term of ['获取 AIP', 'AIP 明细', '可兑换权益', '确认兑换', '使用范围', '有效期', '已生效 · 本地演示']) assert.ok(mobileEntry.includes(term), `missing rights hub term: ${term}`);
  for (const selector of ['.rights-rule-strip', '.rights-grid__action', '.rights-order-list', '.rights-redeem-modal', '.rights-redeem-actions']) assert.ok(mobileCss.includes(selector), `missing rights hub CSS: ${selector}`);
  assert.match(mobileEntry, /真实停机必须由服务端策略执行/);
  assert.match(mobileEntry, /data-message-tabs="通知\|互动\|私信"/);
  assert.match(mobileEntry, /class="messages-page"[\s\S]*?class="message-tab-row"[\s\S]*?class="messages-screen main-tab-scroll" data-message-list role="region" aria-label="消息列表"/);
  assert.match(mobileCss, /\.message-tab-row > \[role="tab"\]\[aria-selected="true"\]::after\s*\{[^}]*width:\s*34px;[^}]*height:\s*3px;[^}]*transform:\s*translateX\(-50%\);/);
  for (const label of ['通知', '互动', '私信']) assert.match(mobileEntry, new RegExp(`aria-label="${label}"`));
  assert.match(mobileEntry, /messageTabs,messageNotificationTab:messageTabs\[0\],messageSocialTab:messageTabs\[1\],messageDirectTab:messageTabs\[2\],messageCards/);
  assert.match(mobileEntry, /panelProductCenter:s\.panel==='productCenter'/);
  assert.match(mobileEntry, /角色视角/);
  assert.match(mobileEntry, /权限不升级/);
  assert.match(mobileEntry, /productCenterRoleView:'kol'/);
  assert.match(mobileEntry, /product_center_role_view_change/);
  assert.match(mobileEntry, /permission_changed:false/);
  assert.match(mobileEntry, /class="launch-splash__logo" src="logo\.png" alt="airvana\.ai"/);
  assert.match(mobileCss, /\.launch-splash__logo\s*\{[^}]*background:transparent;[^}]*filter:none;[^}]*mix-blend-mode:multiply;/);
  assert.match(mobileCss, /img\[alt="airvana\.ai"\]:not\(\.launch-splash__logo\)/);
  assert.match(mobileCss, /\.app-shell\.theme-dark \.launch-splash__logo\s*\{[^}]*filter:none;[^}]*mix-blend-mode:multiply !important;/);
  assert.match(mobileEntry, /当前仅为 KOL 功能预览，请先完成创作者身份开通/);
});

test('global search uses a legible SVG icon without inflating the input layout', () => {
  assert.match(mobileEntry, /class="global-search-icon" aria-hidden="true"><svg viewBox="0 0 24 24"/);
  assert.doesNotMatch(mobileEntry, /class="global-search-box"><span>⌕<\/span>/);
  assert.match(mobileEntry, /aria-label="搜索 Playable、KOL、Campaign" placeholder="搜索 Playable、KOL、Campaign"/);
  assert.match(mobileCss, /\.global-search-icon\s*\{[^}]*width:\s*32px;[^}]*height:\s*32px;/);
  assert.match(mobileCss, /\.global-search-icon svg\s*\{[^}]*width:\s*22px;[^}]*height:\s*22px;[^}]*stroke-width:\s*2\.2;/);
  assert.match(mobileCss, /\.global-search-box input\s*\{[^}]*min-height:\s*var\(--touch-target\)/);
  assert.match(mobileCss, /\.global-search-box input:focus,[\s\S]{0,100}\.global-search-box input:focus-visible\s*\{[^}]*outline:\s*0\s*!important;[^}]*box-shadow:\s*none\s*!important;/);
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
  assert.match(mobileEntry, /data-message-tabs="通知\|互动\|私信"/);
  assert.doesNotMatch(mobileEntry, />🔔/);
  assert.match(mobileEntry, /aria-label="消息" onClick="\{\{ openNotifications \}\}"/);
  assert.match(mobileEntry, /aria-label="打开设置" onClick="\{\{ openSettings \}\}"/);
  assert.match(mobileEntry, /M5 7h14M5 12h14M5 17h14/);
  assert.match(mobileEntry, /class="settings-drawer" role="dialog" aria-modal="true" aria-label="我的功能抽屉"/);
  assert.match(mobileEntry, /aria-label="关闭功能抽屉" onClick="\{\{ closeSettingsDrawer \}\}"/);
  assert.match(mobileEntry, /<svg class="settings-drawer-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="\{\{ d\.path \}\}"><\/path><\/svg>/);
  const drawerIconData = mobileEntry.slice(mobileEntry.indexOf('const drawerPrimaryRows'), mobileEntry.indexOf('const languageOptions'));
  assert.equal((drawerIconData.match(/\{path:'/g) || []).length, 18, 'both role-specific drawer sets should use semantic SVG paths');
  assert.doesNotMatch(drawerIconData, /\{icon:'/);
  assert.match(mobileCss, /\.settings-drawer-icon \{[\s\S]*width: 20px;[\s\S]*color: var\(--text-secondary\);[\s\S]*stroke-width: 1\.7;/);
  assert.match(mobileCss, /\.settings-drawer-label \{[\s\S]*color: var\(--text-primary\);[\s\S]*font-size: 12px;[\s\S]*font-weight: 700;/);
  assert.doesNotMatch(mobileEntry, /扫一扫|openScanner/);
  assert.doesNotMatch(mobileEntry, /更多功能|openMoreFeatures/);
  for (const term of ['身份认证', '品牌合作', '意见反馈', '切换语言', '设置', '退出登录']) {
    assert.ok(mobileEntry.includes(term), `missing drawer term: ${term}`);
  }
  for (const term of ['观看历史', '稍后再看', '未成年人模式', '离线缓存', '我的二维码', '清理缓存', '切换账号']) {
    assert.ok(!drawerIconData.includes(term), `removed drawer term is still present: ${term}`);
  }
  assert.match(mobileEntry, /openSettings:\(\)=>this\.setState\(\{drawerOpen:true\},\(\)=>requestAnimationFrame/);
  assert.match(mobileEntry, /label:'切换语言',meta:s\.uiLanguage==='en'\?'English':'简体中文'/);
  assert.match(mobileEntry, /label:'设置',meta:'',onPick:\(\)=>this\.setState\(\{drawerOpen:false,panel:'settings'\}\)/);
  assert.match(mobileEntry, /panelLanguage:s\.panel==='language',languageOptions/);
  assert.match(mobileEntry, /document\.documentElement\.lang=language\.code/);
  assert.match(mobileEntry, /showSettingsDrawer:!!s\.drawerOpen/);
  assert.match(mobileCss, /@keyframes drawerSlideIn/);
  assert.match(mobileEntry, /settings:'设置'/);
  assert.match(mobileEntry, /aria-label="退出登录" onClick="\{\{ confirmLogoutFromDrawer \}\}"/);
  assert.match(mobileEntry, /confirmLogout:\(\)=>this\.setState\(\{systemModal:'logoutConfirm',systemModalQueue:\[\]\}\)/);
  assert.match(mobileEntry, /logoutConfirmed:\(\)=>\{this\.setState\(\{drawerOpen:false,systemModal:null,systemModalQueue:\[\]\}\);this\.logout\(\);\}/);
  assert.match(mobileEntry, /fetch\('\/api\/auth\/logout', \{method:'POST', credentials:'include', keepalive:true\}\)/);
  assert.match(mobileEntry, /this\._suspendPersist = true/);
  assert.match(mobileEntry, /sessionStorage\.setItem\('airvana\.v5\.force-login','1'\)/);
  assert.match(mobileEntry, /location\.reload\(\)/);
  assert.doesNotMatch(mobileEntry, />重置内部数据<\/div>/);
});

test('Opinion feedback owns the support entry and contains a truthful customer-service path', () => {
  for (const term of ['帮助我们做得更好', '联系客服', '提交意见反馈', '产品建议', '功能异常', '内容与社区', '账号与安全', '请勿填写密码、验证码、助记词或身份证件', '正式提交需接入后端工单服务']) {
    assert.ok(mobileEntry.includes(term), `missing feedback term: ${term}`);
  }
  assert.match(mobileEntry, /label:'意见反馈',meta:s\.supportTickets\.length\?s\.supportTickets\.length\+' 条本地记录'/);
  assert.doesNotMatch(mobileEntry, /label:'我的客服'/);
  assert.doesNotMatch(mobileEntry, /label:'帮助与客服'/);
  assert.match(mobileEntry, /supportCategory:'product', supportDraft:'', supportContact:'', supportTickets:\[\]/);
  assert.match(mobileEntry, /status:'local-record'/);
  assert.match(mobileEntry, /panelReturn:'support',messageThreadId:'support'/);
  assert.match(mobileCss, /\.feedback-category-option\.is-active/);
  assert.match(mobileCss, /\.feedback-submit\[aria-disabled="true"\]/);
});

test('Settings exposes legal, product information, appearance and governed account deletion controls', () => {
  for (const term of ['服务协议', '隐私政策', '关于我们', '推送设置', '外观模式', '跟随系统', '浅色', '深色', '删除账号', '30 天冷静期', '取消删除申请']) {
    assert.ok(mobileEntry.includes(term), `missing settings term: ${term}`);
  }
  assert.match(mobileEntry, /role="switch" tabindex="0" aria-label="推送设置"/);
  assert.match(mobileEntry, /pushEnabled: true, themeMode:\(typeof document!==/);
  assert.match(mobileEntry, /themeClass:this\.resolveThemeMode\(s\.themeMode\)==='dark'\?'theme-dark':''/);
  assert.match(mobileEntry, /themeStorageKey = 'airvana\.v5\.theme-mode'/);
  assert.match(mobileEntry, /localStorage\.setItem\(this\.themeStorageKey, themeMode\)/);
  assert.match(mobileEntry, /useSystemTheme:\(\)=>this\.setThemeMode\('system'\),useLightTheme:\(\)=>this\.setThemeMode\('light'\),useDarkTheme:\(\)=>this\.setThemeMode\('dark'\)/);
  assert.match(mobileEntry, /matchMedia\('\(prefers-color-scheme: dark\)'\)/);
  assert.match(mobileEntry, /dataset\.airvanaTheme/);
  assert.match(mobileEntry, /meta\[name="theme-color"\]/);
  assert.match(mobileEntry, /openTermsFromSettings:\(\)=>this\.setState\(\{panel:'terms',panelReturn:'settings'\}\)/);
  assert.match(mobileEntry, /openPrivacyFromSettings:\(\)=>this\.setState\(\{panel:'privacy',panelReturn:'settings'\}\)/);
  assert.match(mobileEntry, /openAbout:\(\)=>this\.setState\(\{panel:'about',panelReturn:'settings'\}\)/);
  for (const legalTerm of ['Airvana 隐私政策', '长期记忆与知识授权', 'AIP、AIT与钱包', '我们不会出售你的个人信息', '运营主体：【上线前补充】']) {
    assert.ok(mobileEntry.includes(legalTerm), `missing legal document term: ${legalTerm}`);
  }
  assert.match(mobileEntry, /legal-terms-v1\.js\?v=1\.0\.0/);
  for (const legalTerm of ['Terms of Service / 服务协议', 'Cerdar Ai Limited', 'Last Updated', 'Aug 11th, 2026', 'Airvana Points', 'Campaign Conversion', 'Governing Law and Disputes', '[AIRVANA CONTACT EMAIL]']) {
    assert.ok(termsOfService.includes(legalTerm), `missing service agreement term: ${legalTerm}`);
  }
  assert.match(termsOfService, /"sections": \[/);
  assert.match(mobileEntry, /window\.AirvanaTermsOfServiceV1\|\|legalDocuments\.terms/);
  assert.match(mobileEntry, /legal-privacy-v1\.js\?v=1\.0\.0/);
  for (const legalTerm of ['Privacy Policy / 隐私政策', 'Cerdar Ai Limited', 'Personal Information We Collect', 'Your Choices and Rights', 'Restricted Locations', '[AIRVANA CONTACT EMAIL]']) {
    assert.ok(privacyPolicy.includes(legalTerm), `missing privacy policy term: ${legalTerm}`);
  }
  assert.match(privacyPolicy, /"sections": \[/);
  assert.match(mobileEntry, /window\.AirvanaPrivacyPolicyV1\|\|legalDocuments\.privacy/);
  assert.match(mobileEntry, /class="legal-document__preamble"/);
  assert.match(mobileEntry, /class="legal-document__sections"/);
  assert.match(mobileCss, /\.legal-document__preamble/);
  assert.match(mobileCss, /\.legal-document__sections section > div/);
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
  for (const token of ['--surface-canvas: #0f1013', '--surface-card: #181a1f', '--surface-elevated: #202329', '--surface-media: #08090b', '--text-primary: #f5f6f8', '--text-secondary: #b1b4bc', '--text-tertiary: #7d818b', '--border-primary: #30333a', '--accent-primary: #ff5869']) {
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

test('AIT settlement approval can surface as an accessible top in-app notification', () => {
  for (const term of ['airvana-top-notification', 'AIT 结算审核已通过', '10 AIT 对应权益已通过结算复核，已进入待付款队列；实际到账以付款凭证为准。', '查看 AIT 结算记录', 'demo-notification']) {
    assert.ok(mobileEntry.includes(term), `missing AIT top notification term: ${term}`);
  }
  assert.match(mobileEntry, /role="status" aria-live="assertive" aria-label="AIT 结算审核结果"/);
  assert.match(mobileEntry, /\['ait-approved','ait-settlement-approved'\]\.includes\(params\.get\('demo-notification'\)\)/);
  assert.match(mobileCss, /\.airvana-top-notification \{/);
  assert.match(mobileCss, /\.native-app-shell \.airvana-top-notification \{/);
  assert.doesNotMatch(mobileEntry, /airvana-top-notification__timer/);
  assert.doesNotMatch(mobileCss, /airvanaNotificationTimer/);
  assert.match(mobileEntry, /dismissTopNotification\('timeout'\),3000/);
});

test('full project center owns network, region, risk and startup-popup simulation controls', () => {
  for (const term of [
    '演示控制', '场景模拟与风控', '身份状态模拟器', '当前有效权限', '网络环境模拟', '正常网络', '弱网', '无网络',
    '地区风控模拟', '中国大陆', '非金融模式', '弱网提醒', '无网络提醒',
    '中国大陆访问提醒', '恢复默认模拟环境', '版本升级弹窗', '运营任务弹窗',
    '消息提醒弹窗', 'AIT 结算通过通知', '测试环境', '生产环境'
  ]) {
    assert.ok(mobileEntry.includes(term), `missing project-center demo control: ${term}`);
  }
  assert.match(mobileEntry, /productCenterIsDemo:s\.productCenterTab==='demo'/);
  assert.match(mobileEntry, /role="switch" aria-checked="\{\{ identitySimulationOpen \}\}" aria-label="开关身份状态模拟器"/);
  const productCenterStart=mobileEntry.indexOf('<sc-if value="{{ panelProductCenter }}"');
  const identityCenterStart=mobileEntry.indexOf('<sc-if value="{{ panelIdentity }}"');
  const identityCardsStart=mobileEntry.indexOf('<sc-for list="{{ identityCards }}"', identityCenterStart);
  assert.ok(productCenterStart>=0&&identityCenterStart>productCenterStart, 'product center should render before identity center');
  assert.match(mobileEntry.slice(productCenterStart, identityCenterStart), /aria-label="身份状态模拟器"/);
  assert.doesNotMatch(mobileEntry.slice(identityCenterStart, identityCardsStart), /aria-label="身份状态模拟器"/);
  assert.match(mobileEntry, /frontendEnvironment:'test',demoPopupDefaultsVersion:1,demoPopupVersionEnabled:false,demoPopupMessageEnabled:false,demoPopupOperationsEnabled:false/);
  assert.match(mobileEntry, /demoPopupAitSettlementEnabled:false,aitSettlementPrompted:false/);
  assert.match(mobileEntry, /airvana\.v5\.product-center-preferences\.v1/);
  assert.match(mobileEntry, /persistProductCenterPreferences\(this\.state\)/);
  assert.doesNotMatch(mobileEntry, /panel:'productCenter',productCenterTab:'map'/);
  assert.match(mobileEntry, /networkSimulationProfile:'normal',regionSimulationProfile:'global',nonFinancialMode:false/);
  assert.match(mobileEntry, /if \(this\.state\.frontendEnvironment !== 'test'\)/);
  assert.match(mobileEntry, /production_service_connected:false,permission_changed:false/);
  assert.match(mobileEntry, /环境开关只作用于当前设备的前端演示/);
  assert.match(mobileEntry, /不会连接生产服务、切换服务器凭证/);
  assert.match(mobileEntry, /生产环境中的真实地区、合规和服务端风控不可由这里关闭/);
  assert.match(mobileEntry, /effectiveRiskSimulation\(state=this\.state\)/);
  assert.match(mobileEntry, /blockRestrictedAction\(scope,label\)/);
  assert.match(mobileEntry, /raw_ip_collected:false/);
  assert.match(mobileEntry, /blockRestrictedAction\('wallet-login'/);
  assert.match(mobileEntry, /blockRestrictedAction\('external-distribution'/);
  assert.match(mobileEntry, /blockRestrictedAction\('settlement'/);
  assert.match(mobileCss, /\.demo-environment-options/);
  assert.match(mobileCss, /\.demo-scenario-options/);
  assert.match(mobileCss, /\.demo-region-options/);
  assert.match(mobileCss, /\.runtime-risk-bar/);
  assert.match(mobileCss, /\.risk-modal-actions/);
  assert.match(mobileCss, /\.demo-popup-switch\[aria-checked="true"\]/);
});

test('About exposes the verified official website and safe social channel placeholders', () => {
  for (const term of ['官方渠道', '官方网站', 'www.airvana.ai', '官方媒体渠道', 'Facebook', 'Telegram', 'Discord', '即将开放', '官方人员不会索取助记词、私钥或验证码']) {
    assert.ok(mobileEntry.includes(term), `missing official media term: ${term}`);
  }
  assert.match(mobileEntry, /aria-label="访问 Airvana 官方网站"/);
  assert.match(mobileEntry, /aria-label="X 官方渠道"/);
  assert.match(mobileEntry, /officialMediaUrls = Object\.freeze\(\{website:'https:\/\/www\.airvana\.ai',facebook:'',telegram:'',x:'',discord:''\}\)/);
  assert.match(mobileEntry, /openOfficialWebsite:\(\)=>this\.openOfficialMedia\('Airvana','website'\)/);
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
  assert.match(mobileEntry, /actionClass:selected\?'is-selected':''/);
  assert.match(mobileEntry, /class="create-power-card__action \{\{ p\.actionClass \}\}"/);
  assert.match(mobileEntry, /class="create-power-card__action-visual"/);
  assert.match(mobileEntry, /class="create-power-card__icon"/);
  assert.match(mobileEntry, /<img src="\{\{ p\.iconImage \}\}" alt="" aria-hidden="true"/);
  assert.match(mobileEntry, /<path d="\{\{ p\.iconPath \}\}"><\/path>/);
  assert.match(mobileEntry, /const capabilityIconImages = \{/);
  assert.match(mobileEntry, /const capabilityIconPaths = \{/);
  const capabilityIconImageBlock = mobileEntry.match(/const capabilityIconImages = \{([\s\S]*?)\n    \};/)[1];
  assert.equal((capabilityIconImageBlock.match(/\.png'/g)||[]).length, 47);
  assert.equal(fs.readdirSync(path.join(root,'public/assets/capability-icons')).filter(file=>file.endsWith('.png')).length, 47);
  assert.match(mobileEntry, /class="create-mode-option"[\s\S]*?data-locked="\{\{ m\.locked \}\}"[\s\S]*?aria-haspopup="\{\{ m\.ariaHasPopup \}\}"[\s\S]*?<path d="\{\{ m\.iconPath \}\}"><\/path>/);
  assert.match(mobileEntry, /class="create-mode-lock" aria-hidden="true">锁定<\/small>/);
  assert.match(mobileEntry, /class="create-power-search"[\s\S]*?<circle cx="10\.8" cy="10\.8" r="5\.8"><\/circle>/);
  assert.match(mobileEntry, /class="composer-primary-action[\s\S]*?<path d="M4 4\.8 21 12 4 19\.2/);
  assert.match(mobileEntry, /class="create-home-dock__item"[\s\S]*?<path d="\{\{ t\.iconPath \}\}"><\/path>/);
  assert.match(mobileEntry, /actionIconPath=selected\?'M5 12\.5 9\.2 17 19 7':'M12 5v14M5 12h14'/);
  assert.match(mobileCss, /\.create-power-card__action\s*\{[^}]*min-width:\s*44px;[^}]*height:\s*44px;/);
  assert.match(mobileCss, /\.create-power-card__action-visual\s*\{[^}]*width:\s*32px;[^}]*height:\s*32px;/);
  assert.match(mobileCss, /\.create-power-card__icon > svg\s*\{[^}]*width:\s*21px;[^}]*height:\s*21px;/);
  assert.match(mobileCss, /\.create-power-card__icon > img\s*\{[^}]*width:\s*100%;[^}]*height:\s*100%;/);
  assert.match(mobileCss, /\.create-power-card__action\.is-selected \.create-power-card__action-visual\s*\{[^}]*width:\s*28px;[^}]*height:\s*28px;[^}]*font-size:\s*13px !important;/);
  assert.match(mobileEntry, /const actionFontSize=actionLabel\.length>1\?'8px':'15px'/);
  assert.doesNotMatch(mobileEntry, /shadow:selected\?'inset\s+\d+px\s+0\s+0/);
  assert.doesNotMatch(mobileEntry, /box-shadow:\{\{ p\.shadow \}\}/);
  assert.match(mobileCss, /\.create-power-card\s*\{[^}]*box-sizing:\s*border-box;[^}]*border:\s*1px solid #303034;/);
  assert.doesNotMatch(mobileEntry, /showControlledRemix|openControlledRemix|showTemplateShortcut|openTemplateLibrary/);
  assert.doesNotMatch(mobileEntry, /create-remix-card|create-template-shortcut-card|从已发布作品 Remix|从模板库选择/);
  assert.doesNotMatch(mobileCss, /\.create-remix-card|\.create-template-shortcut-card/);
  assert.match(mobileEntry, /createHomeTabs:\[\{key:'create',label:'能力组合'/);
  assert.match(mobileEntry, /\{key:'templates',label:'模板',iconPath:'M4 4h6v6H4z/);
  assert.doesNotMatch(mobileEntry, /power\('templateLibrary'/);
  assert.match(mobileEntry, /原子能力：可加入能力组合的单项功能；模板：完整可运行结构。/);
  assert.match(mobileEntry, /营销智能体不能修改 Campaign Contract 锁定字段/);

  assert.match(mobileEntry, /composerMode==='deep'/);
  assert.doesNotMatch(mobileEntry, /aria-label="打开草稿和 Playables"/);
  assert.doesNotMatch(mobileEntry, /openContentLibrary:/);
  assert.doesNotMatch(mobileEntry, /KOL 是运营者，Playable 是可自主运营的营销智能体；当前生成的是本地演示预览。/);
  assert.match(mobileEntry, /class="create-idea-input \{\{ createModeClass \}\}"/);
  assert.match(mobileCss, /\.create-idea-input \{[\s\S]*min-height: 96px;[\s\S]*font-size: 17px;/);
  assert.match(mobileCss, /\.app-shell\.theme-dark \.create-mode-canvas \.create-idea-input \{[\s\S]*?background: transparent !important;[\s\S]*?box-shadow: none !important;[\s\S]*?color: #ffffff !important;/);
  assert.match(mobileCss, /\.app-shell\.theme-dark \.create-mode-canvas \.create-idea-input\.mode-deep \{[\s\S]*?color: #07191b !important;[\s\S]*?caret-color: #07191b;/);
  assert.match(mobileCss, /\.app-shell\.theme-dark \.create-mode-canvas \.create-idea-input\.mode-deep::placeholder \{[\s\S]*?color: rgba\(7, 25, 27, 0\.48\) !important;/);
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
  assert.match(mobileEntry, /class="create-power-search" role="button" tabindex="0" aria-label="搜索能力编排"/);
  assert.match(mobileCss, /\.create-power-search svg\s*\{[^}]*width:\s*20px;[^}]*height:\s*20px;/);
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
  assert.match(mobileEntry, /AIP 与 AIT 分账记录/);
  assert.match(mobileEntry, />AIP 与 AIT</);
  assert.doesNotMatch(mobileEntry, /AIP \/ AIT 积分记录/);
  assert.doesNotMatch(mobileEntry, />我的 Agent<\/span>/);
  assert.doesNotMatch(mobileEntry, /热门 Agent/);
});

test('onboarding removes the first-page description and supports clickable dots plus horizontal swipes', () => {
  assert.match(mobileEntry, /class="onboarding-shell"[^>]*onPointerDown="\{\{ obSwipeStart \}\}"[^>]*onPointerMove="\{\{ obSwipeMove \}\}"[^>]*onPointerUp="\{\{ obSwipeEnd \}\}"[^>]*onPointerCancel="\{\{ obSwipeCancel \}\}"/);
  assert.match(mobileEntry, /<sc-if value="\{\{ obHasDesc \}\}"[^>]*><div[^>]*>\{\{ obDesc \}\}<\/div><\/sc-if>/);
  assert.match(mobileEntry, /obHasDesc:s\.ob > 0 && s\.ob < 3/);
  assert.match(mobileEntry, /class="onboarding-dots" role="tablist" aria-label="引导页分页"/);
  assert.match(mobileEntry, /class="onboarding-dot \{\{ d\.className \}\}" role="tab" aria-label="\{\{ d\.ariaLabel \}\}" aria-selected="\{\{ d\.ariaSelected \}\}" onClick="\{\{ d\.onPick \}\}"/);
  assert.match(mobileEntry, /selectOnboardingSlide\(index\)[\s\S]{0,180}Math\.max\(0,Math\.min\(2,Number\(index\)\|\|0\)\)/);
  assert.match(mobileEntry, /onboardingSwipeFinish\(event,cancelled=false\)[\s\S]{0,900}Math\.abs\(dx\)<48[\s\S]{0,240}Math\.min\(2,this\.state\.ob\+1\)/);
  assert.match(mobileCss, /\.onboarding-shell\s*\{[^}]*touch-action:\s*pan-y;[^}]*overscroll-behavior:\s*none;/);
  assert.match(mobileCss, /\.onboarding-dot::before\s*\{[^}]*inset:\s*-8px;/);
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
    '结构化输入', 'Campaign 工作台', 'Campaign Contract {{ campaignContractVersion }}',
    '我的任务', 'Agentic Playable 交付', '创作空间与限制', '可以调整', '平台锁定',
    '审核与发布进度', '数据、归因与结算', '交付审批', '归因证据', '结算复核', '资产沉淀'
  ]) assert.ok(mobileEntry.includes(label), `missing mobile Campaign workbench label: ${label}`);
  assert.match(mobileEntry, /待品牌配置 · 不展示虚构金额/);
  assert.match(mobileEntry, /规则与审计依据/);
  assert.match(mobileCss, /\.campaign-workbench\s*\{/);
  assert.match(mobileCss, /\.campaign-contract-details\s*\{/);

  assert.match(mobileEntry, /const campaignAction = \(\) =>/);
  assert.match(mobileEntry, /const attributionAction = \(\) =>/);
  assert.match(mobileEntry, /const settlementAction = \(\) =>/);
  assert.match(mobileEntry, /不代表真实品牌批准、对外发布、服务器归因或商业结算/);
  assert.match(mobileEntry, /不生成真实应收或可提现余额/);

  assert.match(mobileEntry, /创作与运营/);
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

test('game coins remain playable-scoped while local AIP completion records are independently deduplicated', () => {
  for (const term of [
    '游戏金币与 AIP',
    '进度资产与平台参与积分严格分账',
    '每个 Agentic Playable 使用独立金币账本',
    '每个作品 24 小时一次',
    '点赞、启动、失败或刷金币均不发放',
    'AIP 与 AIT 分账记录'
  ]) assert.ok(mobileEntry.includes(term), `missing game economy boundary: ${term}`);

  assert.match(mobileEntry, /gameCoinLedgers:\{\}/);
  assert.match(mobileEntry, /aipPlayRewardClaims:\[\]/);
  assert.match(mobileEntry, /currency_id:'GAME:'\+playableId/);
  assert.match(mobileEntry, /rule_key:'playable_complete_24h'/);
  assert.match(mobileEntry, /convertible_to_aip:false/);
  assert.match(mobileEntry, /game_coin_conversion_rate:null/);
  assert.match(mobileEntry, /_localAipClaimedAtByPlayable/);
  assert.match(mobileEntry, /_localTerminalEventKeys/);
  assert.match(mobileEntry, /eventName==='play_complete'\?this\.applyLocalPlayableCompletion/);
  assert.match(mobileEntry, /eventName==='play_complete'\|\|eventName==='play_fail'/);
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
    '从设备选择', '支持图片、视频文件，单个文件不超过 20MB', '项目素材库', 'Asset Manifest', '用途 ·', '焦点 ·',
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
  assert.match(mobileEntry, /const resetComposerSheetScroll=\(\)=>requestAnimationFrame\([\s\S]*?scroller\.scrollTop=0/);
  assert.match(mobileEntry, /ariaLabel:'目标完成度 '\+composerGoalCompleteCount\+'\/4'[\s\S]*?onPick:\(\)=>openComposerSheetAtTop\('goals'\)/);
  assert.match(mobileEntry, /class="composer-sheet-footer"[\s\S]*?class="composer-goal-save"/);
  assert.match(mobileCss, /\.composer-sheet-footer\s*\{[^}]*flex:\s*none;[^}]*border-top:\s*var\(--divider-height\) solid #efeff4;/);
  assert.match(mobileCss, /\.composer-sheet-dialog\s*\{[^}]*max-height:\s*min\(82%, calc\(100% - 8px\)\) !important;[^}]*padding-bottom:\s*0 !important;/);
  assert.doesNotMatch(mobileCss, /\.composer-sheet-dialog\s*\{[^}]*max-height:\s*calc\(100dvh/);
  assert.match(mobileCss, /\.inspiration-mode-option\s*\{[\s\S]*?min-height:\s*44px/);
  assert.match(mobileCss, /@media \(max-width: 360px\)/);
  assert.match(mobileEntry, /airvana-v4\.css\?v=5\.5\.80/);
  assert.match(mobileEntry, /indexedDB\.open\('airvana\.local-composer-assets\.v1',1\)/);
  assert.match(mobileEntry, /composerAssetManifest\(assets\)/);
  assert.doesNotMatch(mobileEntry, /素材授权待确认|授权状态默认为待确认|授权状态已重置为待确认|切换授权|深度模式必须全部确认授权|pending-assets|blocked-assets/);
  assert.doesNotMatch(mobileEntry, /图片 \/ 视频 ≤ 20MB/);
  assert.match(mobileEntry, /const composerActionLabel=s\.generating\?'生成中…':!composerPrompt\?'填写创意':composerPrompt\.length<12\?'继续完善':composerMissingCount\?'完善 '\+composerMissingCount\+' 项':'生成预览'/);
  assert.match(mobileEntry, /const composerActionClass=s\.generating\?'is-loading action-disabled':composerPrompt\.length<12\?'is-incomplete':composerMissingCount\?'is-progress':'is-ready'/);
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

test('mobile polish unifies the dark logo, global KYC, email login, confirmations and safe overlays', () => {
  assert.match(mobileCss, /\.app-shell\.theme-dark img\[alt="airvana\.ai"\][^{]*\{[^}]*filter:\s*none;[^}]*mix-blend-mode:\s*normal\s*!important;/);
  assert.match(mobileEntry, /identityKycCountries\s*=\s*Object\.freeze/);
  assert.match(mobileEntry, /identityCountryTotal:this\.identityKycCountries\.length/);
  assert.match(mobileEntry, /class="identity-country-sheet adaptive-bottom-sheet"/);
  assert.match(mobileCss, /\.adaptive-bottom-sheet\s*\{[^}]*max-height:\s*min\(88%, calc\(100% - 8px\)\);/);
  assert.match(mobileCss, /\.identity-country-sheet\s*\{[^}]*min-height:\s*0;[^}]*height:\s*88%;/);
  assert.match(mobileCss, /\.identity-country-list > button\s*\{[^}]*min-height:\s*56px;/);
  assert.doesNotMatch(mobileCss, /\.adaptive-bottom-sheet\s*\{[^}]*100dvh/);
  assert.match(mobileEntry, /type="email"[^>]*autocomplete="email"[^>]*autocapitalize="none"/);
  assert.match(mobileEntry, /loginEmailExpiresAt:Date\.now\(\)\+10\*60\*1000/);
  assert.match(mobileEntry, /requestDestructiveAction\('delete-comment'/);
  assert.match(mobileEntry, /requestDestructiveAction\('delete-draft'/);
  assert.match(mobileEntry, /class="destructive-confirm-modal"/);
  assert.match(mobileCss, /\.settings-drawer-scroll\s*\{[^}]*position:\s*absolute;[^}]*overflow-y:\s*scroll\s*!important;[^}]*touch-action:\s*none;/);
  assert.match(mobileCss, /\.system-modal__card\s*\{[^}]*max-height:\s*calc\(100dvh[^}]*overflow-y:\s*auto;/);
});

test('My, wallet and drawer expose one governed local subscription center', () => {
  for (const term of ['订阅与额度','CURRENT PLAN · 本机演示','管理订阅与额度','只增加功能和周期额度','不增加 AIP/AIT','不创建订单、不扣款','Creator Pro','Brand / Campaign','恢复 Free 默认状态']) {
    assert.ok(mobileEntry.includes(term), `missing subscription term: ${term}`);
  }
  const profileCardIndex=mobileEntry.indexOf('class="profile-card"');
  const subscriptionCardIndex=mobileEntry.indexOf('查看订阅与额度，当前');
  const shortcutIndex=mobileEntry.indexOf('class="profile-shortcuts"');
  assert.ok(profileCardIndex>=0&&subscriptionCardIndex>profileCardIndex&&shortcutIndex>subscriptionCardIndex, 'subscription card should sit between profile and KOL shortcuts');
  const subscriptionCardMarkup=mobileEntry.slice(subscriptionCardIndex, shortcutIndex);
  assert.match(subscriptionCardMarkup, /profile-subscription-icon[\s\S]*<rect[\s\S]*<circle/);
  assert.doesNotMatch(subscriptionCardMarkup, /✦/);
  assert.match(mobileCss, /\.profile-subscription-card\s*\{[^}]*background:var\(--surface-card,#fff\)/);
  assert.match(mobileCss, /\.profile-subscription-icon\s*\{[^}]*width:38px;[^}]*height:38px;/);
  assert.match(mobileEntry, /class="subscription-plan-tabs" role="tablist" aria-label="套餐方案"/);
  assert.match(mobileEntry, /role="tab" aria-selected="\{\{ plan\.isSelected \}\}"/);
  assert.match(mobileEntry, /subscriptionSelectedPlan\.allowanceRows/);
  assert.match(mobileCss, /\.subscription-plan-tabs\s*\{[^}]*grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(mobileEntry, /localSubscription:this\.buildLocalSubscription\('free'\)/);
  assert.match(mobileEntry, /snapshot\.localSubscription=this\.normalizeLocalSubscription/);
  assert.match(mobileEntry, /subscription_plan_activated_demo/);
  assert.match(mobileEntry, /creation_aip_fallback_consumed/);
  assert.match(mobileEntry, /kyc_changed:false,creator_role_changed:false,commercial_permission_changed:false/);
});
