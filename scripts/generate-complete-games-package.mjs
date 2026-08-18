import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.join(root,'docs/playable-demos/category-expansion');
const output=path.join(root,'docs/playable-demos/home-complete-v3');
const coverManifest=JSON.parse(fs.readFileSync(path.join(root,'public/assets/game-covers/code-art-v3/manifest.json'),'utf8'));
const deepIds=[35,38,40,41,42,44];
const contentIds=coverManifest.files.map(item=>item.id);
const names={1:'Crypto City 安全挑战',2:'星际农场',5:'像素冒险',6:'红杯速配',9:'魔法合唱团',10:'萌宠音乐盒',12:'玩偶造型工坊',14:'萤火信箱',15:'猫咪潜逃',16:'金币环游记',17:'丛林潜游',18:'裂隙突击',19:'星砂岛',20:'阵线骑士',21:'银河玩具店',22:'城市极速',23:'云端炮手',24:'霓虹疾跑',25:'节拍熔炉',26:'天际叠塔',27:'符文回路',28:'棱镜连击',29:'星杯幻术',30:'深海寻光',31:'赤焰防线',32:'新星漂移',33:'虚空小队',34:'果园合合塔',35:'星尘割草',36:'月光奶茶铺',37:'微粒竞技场',38:'星轨牌阵',39:'晶核防线',40:'冒险者日志',41:'成语侦探',42:'六角前线',43:'今日造型师',44:'花园焕新'};
const now='2026-08-15T16:00:00+08:00';
const campaignId='cmp_home_complete_games_v3_20260815';

const contract=JSON.parse(fs.readFileSync(path.join(source,'campaign-contract.json'),'utf8'));
contract.campaign_id=campaignId;
contract.version='3.0.0';
contract.objective.primary_kpi='completion, replay, interaction validity, and runtime stability across all 38 home games';
contract.objective.funnel_boundary='All 38 local games end at success/failure/replay. No external CTA, reward, wallet, commercial attribution, or settlement is enabled.';
contract.channels=[{channel_id:'airvana_home_complete_v3_local_demo',channel_type:'in_app',kol_id:null,placement:'Airvana home vertical feed and packaged iOS/Android WebView'}];
contract.brand.asset_manifest=[
  {asset_id:'asset_code_art_covers_v3',asset_type:'background',location:'public/assets/game-covers/code-art-v3/',locale:null,checksum:null,authorization_status:'approved',usage_restrictions:['Airvana original code-native vector artwork','No generative image','No third-party asset or IP association']},
  {asset_id:'asset_complete_games_runtime_v3',asset_type:'other',location:'public/complete-games-v3.js',locale:null,checksum:null,authorization_status:'approved',usage_restrictions:['Airvana local DEMO only','Deterministic Canvas 2D rendering','No external asset loading']},
  {asset_id:'asset_deep_games_runtime_v2',asset_type:'other',location:'public/deep-games-v2.js',locale:null,checksum:null,authorization_status:'approved',usage_restrictions:['Airvana local DEMO only','Code-native fallback rendering only','Generated gameplay backdrops disabled']}
];
contract.brand.approved_claims=['38 original local game concepts','38 complete playable and replayable local demos','Original code-native SVG covers and Canvas gameplay scenes'];
contract.brand.required_disclosures=['LOCAL DEMO - no reward, wallet, settlement, verified commercial conversion, or live multiplayer','Microbe Arena opponents are deterministic local bots'];
contract.gameplay.template_id='tpl_home_complete_games_v3';
contract.gameplay.target_duration_seconds=180;
contract.gameplay.rounds=3;
contract.gameplay.required_states=['intro','playing','paused','success','failure','retry','replay','exit'];
contract.measurement.primary_kpi=contract.objective.primary_kpi;
contract.release.targets=['web_h5','in_app_webview'];
contract.release.rollback_target='Previous verified Airvana local web bundle';
contract.release.kill_switch.mechanism='Disable campaign cmp_home_complete_games_v3_20260815 or restore the previous verified web bundle';
contract.metadata.created_at=now;
contract.metadata.updated_at=now;
contract.metadata.source_brief='docs/playable-demos/home-complete-v3/campaign-brief.yaml';
contract.metadata.notes=['Content IDs '+contentIds.join(', ')+' are governed by this package.','32 games use complete-games-v3.js and six depth games use deep-games-v2.js without generated background assets.','All runtime art and covers are code-native. External release remains subject to human approval.'];

const config=JSON.parse(fs.readFileSync(path.join(source,'playable-config.json'),'utf8'));
config.playable_id='plb_home_complete_games_collection';
config.campaign_id=campaignId;
config.contract_version='3.0.0';
config.version='3.0.0';
config.template_id='tpl_home_complete_games_v3';
config.presentation.title='Airvana Home Complete Games v3 - 38 Original Playables';
config.presentation.tone='polished, tactile, coherent, non-generative, responsive, and clearly labeled as a local demo';
config.presentation.theme='Original code-native vector cover system and deterministic Canvas gameplay';
config.presentation.logo_asset_id='asset_code_art_covers_v3';
config.presentation.copy_pack.intro_headline='38 款原创游戏 · 全部可玩可互动';
config.presentation.copy_pack.intro_body='Every home game includes a three-stage loop, live interaction, scoring, pause, success/failure, and replay. All game art is code-native.';
config.gameplay.core_loop='Choose a home game, learn its distinct mechanic, complete three progressively harder stages with live feedback, reach success or failure, and replay for a better local score.';
config.gameplay.target_duration_seconds=180;
config.gameplay.state_transitions=config.gameplay.state_transitions.map(item=>item.from==='intro'?{...item,guard:'selected content ID is governed by campaign '+campaignId}:item);
config.screens.forEach(screen=>{screen.asset_ids=screen.screen_id==='screen_playing'?['asset_code_art_covers_v3','asset_complete_games_runtime_v3','asset_deep_games_runtime_v2']:['asset_code_art_covers_v3'];});
config.build.entry='public/index.html';
config.constraints.approved_asset_ids=['asset_code_art_covers_v3','asset_complete_games_runtime_v3','asset_deep_games_runtime_v2'];
config.constraints.required_disclosures=contract.brand.required_disclosures;
config.metadata.created_at=now;
config.metadata.updated_at=now;
config.metadata.notes=['Playable content IDs: '+contentIds.join(', ')+'.','All 38 game covers are SVG files generated from version-controlled code.','No AI raster or third-party game artwork is referenced by the v3 home runtime.','Rewards, wallets, real multiplayer, commercial attribution, and settlement are disabled.'];

const brief=`brief_version: "3.0.0"
campaign:
  campaign_id: "${campaignId}"
  working_name: "Airvana 首页 38 款完整原创游戏重构"
  brand_legal_entity: "Airvana local prototype - no commercial offer"
  market_timezone: "Asia/Hong_Kong"
  target_launch_at: "${now}"
owners:
  business_owner: "Airvana local demo owner"
  operations_owner: "Airvana local demo owner"
  approval_owner: "User-approved rebuild scope; external release still requires human approval"
  kill_switch_owner: "Airvana local demo owner"
objective:
  primary: "engagement"
  primary_success_event: "play_complete"
  secondary: ["valid_interaction", "stage_complete", "replay", "error-free session"]
  funnel_boundary: "Ends at local success/failure/replay; no CTA, wallet, reward, attribution, or settlement."
audience:
  included_regions: ["HK", "SG"]
  languages: ["zh-CN"]
  minimum_age: 18
  accessibility_requirements: ["44px touch targets", "keyboard input", "reduced motion", "mute control", "non-color-only feedback"]
channels:
  distribution: ["Airvana home feed", "iOS WebView", "Android WebView"]
brand_assets:
  source_folder_or_url: "public/assets/game-covers/code-art-v3/"
  authorization_status: "Airvana original code-native art; no generated raster and no third-party asset"
gameplay:
  complete_playable_count: 38
  preview_only_count: 0
  stages_per_game: 3
  target_duration_seconds: "90-300"
  required_states: ["intro", "playing", "paused", "success", "failure", "retry", "replay", "exit"]
  prohibited_mechanics: ["real-money wagering", "wallet signing", "paid loot boxes", "unlabeled fake multiplayer"]
cta:
  type: "none"
reward:
  type: "none"
measurement:
  primary_kpi: "completion, replay, interaction validity, and runtime stability across all 38 games"
  required_events: ["impression", "play_start", "valid_interaction", "level_complete", "play_complete", "play_fail", "replay", "error"]
commercial_delivery:
  reward_budget: 0
  kol_settlement_budget: 0
  supported_targets: ["web_h5", "in_app_webview"]
assumptions:
  - "Application-market products inform mechanic readability only; no screenshot, logo, name, character, UI, or copy is copied."
  - "All covers are deterministic SVG and all gameplay scenes are deterministic Canvas 2D or code-native deep-game rendering."
  - "Microbe Arena uses local bots and never claims live multiplayer."
open_questions: []
`;

const covers=coverManifest.files.map(item=>{
  const relative=`public/assets/game-covers/code-art-v3/${item.file}`;
  const bytes=fs.readFileSync(path.join(root,relative));
  return {...item,name:names[item.id],path:relative,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),generativeAI:false,thirdPartyAsset:false};
});
const assetManifest={manifest_version:'3.0.0',campaign_id:campaignId,generated_at:now,source:'Version-controlled SVG and Canvas code',reference_policy:'Official application-market products informed mechanic and visual-readability research only. No third-party artwork, character, logo, screenshot, UI, trademark, or copy is used.',render_spec:{cover_viewbox:'900x1600',cover_format:'svg',gameplay:'Canvas 2D',text_inside_cover:false},quality_rules:['one readable focal mechanic','coherent geometry and perspective','restrained effects','no generated raster','no third-party asset','no pseudo-text, logo, reward, wallet, store badge, or watermark'],covers,runtimes:[{path:'public/complete-games-v3.js',content_ids:contentIds.filter(id=>!deepIds.includes(id)),art:'code-native Canvas 2D',generativeAI:false},{path:'public/deep-games-v2.js',content_ids:deepIds,art:'code-native Canvas 2D fallback; generated backdrop arguments disabled',generativeAI:false}]};
const gameCatalog={version:'3.0.0',campaign_id:campaignId,total_games:38,complete_games:38,preview_only_games:0,games:coverManifest.files.map(item=>({content_id:item.id,slug:item.key,title:names[item.id],mechanic:item.kind,runtime:deepIds.includes(item.id)?'deep-games-v2':'complete-games-v3',stages:3,states:['intro','playing','paused','success','failure','replay'],art:'code-native',external_asset_dependencies:[]}))};

fs.mkdirSync(output,{recursive:true});
fs.writeFileSync(path.join(output,'campaign-brief.yaml'),brief);
fs.writeFileSync(path.join(output,'campaign-contract.json'),JSON.stringify(contract,null,2)+'\n');
fs.writeFileSync(path.join(output,'playable-config.json'),JSON.stringify(config,null,2)+'\n');
fs.writeFileSync(path.join(output,'asset-manifest.json'),JSON.stringify(assetManifest,null,2)+'\n');
fs.writeFileSync(path.join(output,'game-catalog.json'),JSON.stringify(gameCatalog,null,2)+'\n');
console.log(`Generated v3 campaign package in ${output}`);
