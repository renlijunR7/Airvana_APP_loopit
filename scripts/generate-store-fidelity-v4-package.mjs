import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sourceManifest=JSON.parse(fs.readFileSync(path.join(root,'public/assets/game-covers/code-art-v3/manifest.json'),'utf8'));
const assetDir=path.join(root,'public/assets/game-covers/store-fidelity-v4');
const docsDir=path.join(root,'docs/playable-demos/home-store-fidelity-v4');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

const scenes={
  'safety-workshop':'Stylized cyber-safety investigator compares a suspicious device with a secure console above a tabletop city map.',
  'stellar-farm':'Space farmer connects irrigation across five crop beds inside a planetary greenhouse.',
  'pixel-quest':'Blocky adventurer jumps a broken dungeon bridge toward an energy chip while a guardian wakes.',
  'red-cup-shuffle':'Three lacquer cups sweep across a carnival table with a golden target briefly visible.',
  'magic-choir':'Four original magical creatures perform separate rhythm parts that converge into one harmony.',
  'paws-stage':'Original four-member animal band reaches a synchronized festival-stage finale.',
  'puppet-studio':'Craft designer assembles a customizable wooden puppet from hats, outfits and poses.',
  'firefly-mail':'Moth mail carrier guides parcel-bearing fireflies to matching lantern mailboxes.',
  'whisker-escape':'Expressive orange cat stealths through an oversized living room past a flashlight beam.',
  'coin-journey':'Friendly travel medallion launches through floating rings above a stylized world-map diorama.',
  'jungle-dive':'Young explorer descends through a turquoise cenote to collect luminous fruit pods.',
  'rift-strike':'Three compact starfighters burst through a violet rift toward a drone formation.',
  'stardust-island':'Island builder places a windmill module among farms, water and homes on floating islets.',
  'formation-knights':'Five original knights hold a readable shield-wall formation against a shadow beast.',
  'galaxy-toy-shop':'Robot shopkeeper packs the correct rocket toy for a young alien customer.',
  'city-rush':'Stylized sports coupe powerslides around a rain-lit coastal city circuit.',
  'sky-cannon':'Cloud-fortress cannon defends three sky lanes against playful winged stone creatures.',
  'neon-dash':'Courier vaults a barrier on one of three elevated neon city lanes.',
  'pulse-forge':'Forge musician strikes four industrial rhythm pads as mechanical hammers answer.',
  'sky-stack':'Cheerful crane pilot aligns the next modular floor above a cloud city.',
  'rune-circuit':'Archivist rotates a stone circuit tile as teal energy travels toward a violet core.',
  'prism-match':'Three coral crystals lock into a satisfying match on a garden-temple prism board.',
  'star-cups':'Three celestial cups spin across velvet while an apprentice tracks the hidden star seed.',
  'deep-catch':'Research submarine lowers a light-hook through layered ocean depths toward one luminous fish.',
  'ember-bastion':'Fire-guardian towers defend a winding mountain-gate path from a creature wave.',
  'nova-drift':'Anti-gravity racer drifts through a banked orbital track above a glowing planet.',
  'void-squadron':'Five original starships hold formation through an asteroid channel toward a carrier.',
  'orchard-merge':'Chunky hand-painted fruit in a wooden orchard crate visually converges into a golden pear.',
  'star-mower':'Compact rover-mower cuts a clean path through alien grass while a spore swarm closes in.',
  'moonlight-tea-shop':'Tea-shop owner assembles a layered drink from clearly staged ingredients for night customers.',
  'microbe-arena':'Cute turquoise microbe absorbs smaller cells while larger red microbes circle nearby.',
  'star-deck':'Astral tactician plays a creature card that summons a guardian onto a hex strategy table.',
  'crystal-bastion':'Three crystal towers focus beams along a canyon path toward an ancient gate.',
  'adventurer-journal':'Explorer matches an illustrated journal clue to a ruined forest landmark.',
  'idiom-detective':'Old-city detective links a broken boat, sword, shadow lantern and bell as visual evidence.',
  'hex-frontier':'Blue squad advances across a physical hex diorama toward an enemy-held bridge.',
  'studio-wardrobe':'Expressive stylist coordinates jacket, trousers and accessory in a colorful boutique.',
  'garden-renewal':'Garden designer places the final flowering planter in a restored fountain courtyard.'
};

const files=sourceManifest.files.map(item=>{
  const file=`${item.key}.jpg`;
  const absolute=path.join(assetDir,file);
  if(!fs.existsSync(absolute)) throw new Error(`Missing v4 cover: ${file}`);
  return {...item,file,width:720,height:1280,bytes:fs.statSync(absolute).size,sha256:hash(absolute)};
});
if(files.length!==38) throw new Error(`Expected 38 covers, found ${files.length}`);

const manifest={
  version:'4.0.0',
  generatedBy:'OpenAI built-in image generation; resized and JPEG-encoded with macOS sips',
  license:'Airvana original local prototype artwork',
  generativeAI:true,
  thirdPartyAssets:false,
  assetMode:'original stylized mobile-game key art',
  restrictions:[
    'Airvana local DEMO and internal review only until human release approval',
    'No third-party game screenshot, logo, UI, character or branded visual was used as source material',
    'Do not claim association with any referenced application-market product'
  ],
  files
};
fs.writeFileSync(path.join(assetDir,'manifest.json'),`${JSON.stringify(manifest,null,2)}\n`);

fs.mkdirSync(docsDir,{recursive:true});
fs.writeFileSync(path.join(docsDir,'asset-manifest.json'),`${JSON.stringify(manifest,null,2)}\n`);

const commonPrompt=`ORIGINAL portrait 9:16 mobile-game store cover; premium stylized 3D illustration with hand-painted PBR textures, simplified intentional geometry, slightly exaggerated appealing proportions, bold readable silhouettes, clean color blocks, cohesive art direction, cinematic game lighting, and immediate core-mechanic readability. Not photographic realism, not an AI collage, stock photo, generic glossy toy render, or copy of an existing game. No text, logo, UI, watermark, currency, reward claim, copyrighted character, or branded design. Lower 28 percent remains calmer and darker for Airvana title overlay.`;
const promptLines=files.map(item=>`- \`${item.key}\`: ${scenes[item.key]}`);
fs.writeFileSync(path.join(docsDir,'prompt-set.md'),`# Store Fidelity v4 prompt set\n\n## Shared art direction\n\n${commonPrompt}\n\n## Per-game scene directions\n\n${promptLines.join('\n')}\n\n## Generation mode\n\n- Built-in image generation: one generation call per cover.\n- Four pilot images were restyled from the first overly realistic pass; the rejected realistic files were not connected to the product.\n- Final project assets are 720×1280 JPEG at quality 82.\n`);

fs.writeFileSync(path.join(docsDir,'campaign-brief.yaml'),`brief_version: "4.0.0"\ncampaign:\n  campaign_id: "cmp_home_store_fidelity_v4_20260815"\n  working_name: "Airvana 首页 38 款应用市场级风格化游戏封面"\n  brand_legal_entity: "Airvana local prototype - no commercial offer"\n  market_timezone: "Asia/Hong_Kong"\nowners:\n  business_owner: "Airvana local demo owner"\n  operations_owner: "Airvana local demo owner"\n  approval_owner: "Human approval required before external release"\nobjective:\n  primary: "engagement"\n  primary_success_event: "play_start"\n  secondary: ["cover-to-mechanic readability", "visual consistency", "home-feed performance"]\n  funnel_boundary: "Local Home and Discover display only; no CTA, reward, wallet, attribution, or settlement change."\naudience:\n  included_regions: ["HK", "SG"]\n  languages: ["zh-CN"]\n  minimum_age: 18\nchannels:\n  distribution: ["Airvana home feed", "Airvana Discover", "iOS WebView", "Android WebView"]\nbrand_assets:\n  source_folder_or_url: "public/assets/game-covers/store-fidelity-v4/"\n  authorization_status: "Original generated prototype art; no third-party marketplace asset copied"\ncreative:\n  count: 38\n  format: "720x1280 JPEG"\n  art_direction: "Stylized 3D mobile-game key art; non-photoreal; clear mechanic; lower title-safe zone"\n  prohibited: ["third-party character", "third-party logo", "store screenshot", "fake UI", "pseudo text", "wallet or reward claim"]\ncta:\n  type: "none"\nreward:\n  type: "none"\nopen_questions:\n  - "External commercial release license and final human art review remain pending."\n`);
const briefPath=path.join(docsDir,'campaign-brief.yaml');
fs.writeFileSync(briefPath,fs.readFileSync(briefPath,'utf8').replace('primary_success_event: "play_start"','primary_success_event: "impression"'));

const contract=JSON.parse(fs.readFileSync(path.join(root,'docs/playable-demos/home-complete-v3/campaign-contract.json'),'utf8'));
contract.campaign_id='cmp_home_store_fidelity_v4_20260815';
contract.version='4.0.0';
contract.objective.primary_success_event='impression';
contract.objective.primary_kpi='38/38 homepage covers load, preserve readable crop, and communicate their mechanic without third-party IP';
contract.objective.secondary=['cover-to-mechanic readability','visual consistency','home-feed performance'];
contract.objective.funnel_boundary='Visual asset revision only. Gameplay, CTA, reward, attribution, settlement, and data policy remain unchanged.';
contract.channels[0].channel_id='airvana_home_store_fidelity_v4_local_demo';
contract.brand.asset_manifest[0]={
  asset_id:'asset_store_fidelity_covers_v4',
  asset_type:'background',
  location:'public/assets/game-covers/store-fidelity-v4/',
  locale:null,
  checksum:hash(path.join(assetDir,'manifest.json')),
  authorization_status:'approved',
  usage_restrictions:manifest.restrictions
};
contract.brand.approved_claims=[
  '38 original stylized mobile-game cover images',
  'Each cover is mapped to one governed local game and depicts its core mechanic',
  'No third-party application-market asset is bundled'
];
contract.brand.required_disclosures=[
  'LOCAL DEMO - cover art is original prototype artwork and does not indicate a third-party game partnership',
  'No reward, wallet, settlement, verified commercial conversion, or live multiplayer is enabled'
];
contract.compliance.evidence_sources=[
  'docs/playable-demos/home-store-fidelity-v4/prompt-set.md',
  'docs/playable-demos/home-store-fidelity-v4/asset-manifest.json'
];
contract.measurement.primary_kpi=contract.objective.primary_kpi;
contract.measurement.primary_success_event='impression';
contract.attribution.success_event='impression';
contract.governance.editable_fields=['playable.presentation.cover_image','playable.presentation.cover_position'];
contract.approval.status='draft';
contract.approval.approved_by=[];
contract.approval.approved_at=null;
contract.approval.evidence=['User requested application-market fidelity and corrected the direction from photorealistic to game-like on 2026-08-15'];
contract.release.rollback_target='public/assets/game-covers/code-art-v3/';
contract.release.kill_switch.mechanism='Restore the v3 code-art cover mapping or disable campaign cmp_home_store_fidelity_v4_20260815';
contract.metadata.updated_at='2026-08-15T01:30:00+08:00';
contract.metadata.source_brief='docs/playable-demos/home-store-fidelity-v4/campaign-brief.yaml';
contract.metadata.notes=[
  'All 38 governed home games use one 720x1280 v4 JPEG cover.',
  'The v4 cover revision changes presentation only; complete-games-v3.js and deep-games-v2.js remain the gameplay runtimes.',
  'The application market informed genre conventions only; no third-party screenshot, character, logo, UI or copy was imported.',
  'External release remains subject to human approval.'
];
fs.writeFileSync(path.join(docsDir,'campaign-contract.json'),`${JSON.stringify(contract,null,2)}\n`);

fs.writeFileSync(path.join(docsDir,'README.md'),`# Home store-fidelity covers v4\n\nThis package governs the 38 original homepage and Discover cover images. It replaces the active v3 abstract SVG mapping while retaining v3 as the rollback target.\n\n## Scope\n\n- 38 original stylized mobile-game key-art covers.\n- One cover per governed game, 720×1280 JPEG.\n- No title text inside the art; Airvana supplies the title overlay.\n- No third-party app-store image, logo, character, interface, or brand association.\n- No gameplay, CTA, reward, wallet, attribution, settlement, or data-policy change.\n\n## Files\n\n- \`campaign-brief.yaml\` — structured visual brief.\n- \`campaign-contract.json\` — draft governed contract; external release still requires human approval.\n- \`prompt-set.md\` — shared art direction and all 38 scene directives.\n- \`asset-manifest.json\` — dimensions, bytes and SHA-256 checksums.\n- \`qa-report.md\` — automated and viewport verification evidence.\n`);

const qaPath=path.join(docsDir,'qa-report.md');
if(!fs.existsSync(qaPath)) fs.writeFileSync(qaPath,`# QA report\n\nStatus: pending final automated and viewport verification.\n\n## Required checks\n\n- 38/38 files exist and match the content ID mapping.\n- Every JPEG is 720×1280 and decodes in the local browser.\n- Home and Discover resolve only the v4 cover directory.\n- 360, 390 and 430 px viewports retain subject readability and title-safe crop.\n- Existing complete-game runtime, input, CTA, reward and analytics contracts remain unchanged.\n`);

console.log(`Generated v4 package with ${files.length} covers.`);
