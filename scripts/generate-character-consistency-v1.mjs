import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const characterRoot=path.join(root,'public/assets/characters/v1');
const coverRoot=path.join(root,'public/assets/game-covers/character-consistency-v1');

const characters=[
  {
    gameId:5,gameKey:'pixel-quest',characterId:'chr_nova_runner',name:'Nova Runner',archetype:'cyber runner',
    palette:{primary:'#745CF4',secondary:'#22C7D6',accent:'#F4C35A',skin:'#8F573F',hair:'#15182A',ink:'#121522'},
    locked:['deep violet cropped hood','cyan single-lens visor','gold energy belt','asymmetric high-top boots','compact athletic silhouette'],
    variant:'runner',coverScene:'broken neon causeway with three readable lanes'
  },
  {
    gameId:10,gameKey:'paws-stage',characterId:'chr_mochi_beat',name:'Mochi Beat',archetype:'music cat',
    palette:{primary:'#F2777F',secondary:'#48B9B0',accent:'#F2C85B',skin:'#F1D4B4',hair:'#6B493D',ink:'#2C2430'},
    locked:['cream cat face','coral round headphones','teal short stage jacket','gold star chest badge','dark-tipped tail'],
    variant:'cat',coverScene:'four-pad theatre stage with warm practical lights'
  },
  {
    gameId:12,gameKey:'puppet-studio',characterId:'chr_lumi_doll',name:'Lumi Doll',archetype:'articulated maker doll',
    palette:{primary:'#4A91D8',secondary:'#ED9B68',accent:'#D9B465',skin:'#CFA27D',hair:'#314E6E',ink:'#24303B'},
    locked:['blue bob-cut cap','visible brass joint rings','apricot work apron','painted cheek dots','wooden articulated limbs'],
    variant:'puppet',coverScene:'tailor workbench with three costume silhouettes'
  },
  {
    gameId:20,gameKey:'formation-knights',characterId:'chr_aegis_rowan',name:'Aegis Rowan',archetype:'formation knight',
    palette:{primary:'#B84246',secondary:'#516D78',accent:'#D7B35D',skin:'#9A654A',hair:'#3B2B2B',ink:'#1E2024'},
    locked:['ivory split plume','oxblood half cape','gold-rimmed kite shield','steel scale cuirass','three-notch shoulder guard'],
    variant:'knight',coverScene:'stone formation line facing one shadow beast'
  },
  {
    gameId:36,gameKey:'moonlight-tea-shop',characterId:'chr_mina_vale',name:'Mina Vale',archetype:'night tea keeper',
    palette:{primary:'#3E8F86',secondary:'#E4A36C',accent:'#E9D17D',skin:'#B97958',hair:'#3B2426',ink:'#182927'},
    locked:['auburn loop bun','moon pin over left brow','teal cross-back apron','cream rolled-sleeve blouse','copper tea shaker'],
    variant:'tea',coverScene:'moonlit tea counter with layered drink ingredients'
  }
];

const esc=value=>String(value).replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[character]));
const sha256=value=>crypto.createHash('sha256').update(value).digest('hex');

function defs(item){
  const p=item.palette;
  return `<defs>
    <linearGradient id="primary" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${p.primary}"/><stop offset="1" stop-color="${p.ink}"/></linearGradient>
    <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#F7F0D7"/><stop offset=".46" stop-color="${p.secondary}"/><stop offset="1" stop-color="#1B2530"/></linearGradient>
    <linearGradient id="skin" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${p.skin}"/><stop offset="1" stop-color="${p.hair}" stop-opacity=".38"/></linearGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="12" stdDeviation="10" flood-color="#06080D" flood-opacity=".34"/></filter>
  </defs>`;
}

function runner(item){const p=item.palette;return `<g id="character" filter="url(#shadow)">
  <path d="M95 120Q102 45 160 32q58 13 65 88l-24 30H119Z" fill="${p.hair}"/>
  <ellipse cx="160" cy="116" rx="48" ry="55" fill="url(#skin)"/>
  <path d="M109 113q51-31 102 0l-8 29q-43 24-86 0Z" fill="${p.ink}" stroke="${p.secondary}" stroke-width="7"/>
  <path d="M125 123h70" stroke="${p.secondary}" stroke-width="11" stroke-linecap="round"/><circle cx="180" cy="123" r="6" fill="#E8FFFF"/>
  <path d="M117 164q43 25 86 0l27 113-70 29-70-29Z" fill="url(#primary)" stroke="${p.secondary}" stroke-width="5"/>
  <path d="M103 183 61 255l34 18 46-61M217 181l47 63-30 22-52-57" fill="none" stroke="${p.skin}" stroke-width="25" stroke-linecap="round"/>
  <path d="M94 278 75 375M201 282l44 80" stroke="${p.ink}" stroke-width="34" stroke-linecap="round"/>
  <path d="m53 367 59-7-4 25-60 8ZM218 356l58 25-14 22-58-28Z" fill="${p.secondary}" stroke="#EEF9FF" stroke-width="4"/>
  <path d="M101 254h118l-7 27H108Z" fill="${p.accent}"/><circle cx="160" cy="267" r="11" fill="#FFF5B7"/>
  <path d="m100 61-25 70 31 13 16-74ZM220 62l24 70-31 13-15-73Z" fill="${p.primary}"/>
 </g>`;}

function cat(item){const p=item.palette;return `<g id="character" filter="url(#shadow)">
  <path d="m97 107 6-62 43 35M223 107l-7-62-42 35" fill="${p.skin}" stroke="${p.hair}" stroke-width="8" stroke-linejoin="round"/>
  <ellipse cx="160" cy="126" rx="68" ry="65" fill="${p.skin}" stroke="${p.hair}" stroke-width="7"/>
  <path d="M94 112q66-36 132 0" fill="none" stroke="${p.primary}" stroke-width="18" stroke-linecap="round"/>
  <circle cx="93" cy="124" r="23" fill="${p.primary}" stroke="${p.accent}" stroke-width="5"/><circle cx="227" cy="124" r="23" fill="${p.primary}" stroke="${p.accent}" stroke-width="5"/>
  <ellipse cx="137" cy="126" rx="8" ry="12" fill="${p.ink}"/><ellipse cx="183" cy="126" rx="8" ry="12" fill="${p.ink}"/><path d="m154 146 6 5 6-5" fill="none" stroke="${p.hair}" stroke-width="6" stroke-linecap="round"/>
  <path d="M108 185q52 24 104 0l25 111-77 36-77-36Z" fill="${p.secondary}" stroke="#DBFFF6" stroke-width="5"/>
  <path d="M97 203 61 270M223 203l35 67M126 312l-14 78M194 312l16 78" stroke="${p.skin}" stroke-width="27" stroke-linecap="round"/>
  <path d="M115 389H80M205 389h35" stroke="${p.hair}" stroke-width="18" stroke-linecap="round"/>
  <path d="M217 296q82 12 45 82q-13 23-34 12" fill="none" stroke="${p.skin}" stroke-width="21" stroke-linecap="round"/><path d="M256 374q-13 18-28 16" fill="none" stroke="${p.hair}" stroke-width="21" stroke-linecap="round"/>
  <path d="m160 219 8 18 20 2-15 13 5 20-18-11-18 11 5-20-15-13 20-2Z" fill="${p.accent}"/>
 </g>`;}

function puppet(item){const p=item.palette;return `<g id="character" filter="url(#shadow)">
  <circle cx="160" cy="106" r="57" fill="url(#skin)" stroke="${p.ink}" stroke-width="6"/>
  <path d="M104 104q5-76 56-75 54 1 58 77l-27-14-7-37-19 31-27-27-10 36Z" fill="${p.hair}"/><path d="M112 87q45-28 96 3" fill="none" stroke="${p.primary}" stroke-width="12"/>
  <circle cx="139" cy="112" r="7" fill="${p.ink}"/><circle cx="181" cy="112" r="7" fill="${p.ink}"/><circle cx="126" cy="135" r="5" fill="${p.secondary}"/><circle cx="194" cy="135" r="5" fill="${p.secondary}"/>
  <path d="M123 177h74l20 111-57 35-57-35Z" fill="${p.secondary}" stroke="${p.accent}" stroke-width="6"/><path d="M130 190h60l-6 78h-48Z" fill="${p.primary}" opacity=".86"/>
  <circle cx="111" cy="195" r="12" fill="${p.accent}"/><circle cx="209" cy="195" r="12" fill="${p.accent}"/><path d="M105 202 69 273M215 202l36 71" stroke="${p.skin}" stroke-width="21" stroke-linecap="round"/>
  <circle cx="71" cy="276" r="11" fill="${p.accent}"/><circle cx="249" cy="276" r="11" fill="${p.accent}"/>
  <circle cx="132" cy="307" r="12" fill="${p.accent}"/><circle cx="188" cy="307" r="12" fill="${p.accent}"/><path d="M130 317 112 389M190 317l18 72" stroke="${p.skin}" stroke-width="23" stroke-linecap="round"/>
  <path d="M111 388H77M209 388h34" stroke="${p.ink}" stroke-width="17" stroke-linecap="round"/>
 </g>`;}

function knight(item){const p=item.palette;return `<g id="character" filter="url(#shadow)">
  <path d="M134 44q25-38 52 0l23 47H112Z" fill="url(#metal)" stroke="${p.accent}" stroke-width="6"/><path d="m159 39-32-28 12 54M163 39l42-23-21 52" fill="none" stroke="#F4E8C7" stroke-width="14" stroke-linecap="round"/>
  <path d="M112 90q48-33 96 0l-9 72h-78Z" fill="url(#metal)" stroke="${p.ink}" stroke-width="7"/><path d="M125 112h70" stroke="${p.ink}" stroke-width="13"/><path d="M136 112v12m24-12v12m24-12v12" stroke="${p.accent}" stroke-width="6"/>
  <path d="M104 166h112l26 135-82 38-82-38Z" fill="url(#metal)" stroke="${p.accent}" stroke-width="7"/><path d="M99 174 54 260M221 174l42 88" stroke="url(#metal)" stroke-width="30" stroke-linecap="round"/>
  <path d="M124 325 102 396M196 325l25 71" stroke="${p.ink}" stroke-width="31" stroke-linecap="round"/>
  <path d="M79 222q-40 28-30 112l49 28 43-41-16-91Z" fill="${p.primary}" stroke="${p.accent}" stroke-width="7"/><path d="m83 261 13 20 23 4-17 16 5 23-24-12-22 12 5-23-18-16 24-4Z" fill="${p.accent}"/>
  <path d="M206 171q30 52 12 145l49-40-24-105Z" fill="${p.primary}"/><path d="M202 166l17-22 18 13-11 20M226 177l15-19 17 14-10 21M248 193l15-15 15 15-13 19" fill="${p.accent}"/>
 </g>`;}

function tea(item){const p=item.palette;return `<g id="character" filter="url(#shadow)">
  <path d="M117 88q7-55 51-56 47 2 48 59l-10 42h-92Z" fill="${p.hair}"/><circle cx="191" cy="45" r="29" fill="${p.hair}"/>
  <ellipse cx="160" cy="120" rx="51" ry="60" fill="url(#skin)"/><path d="M119 99q40-28 84-3" fill="none" stroke="${p.hair}" stroke-width="15"/>
  <circle cx="141" cy="121" r="6" fill="${p.ink}"/><circle cx="180" cy="121" r="6" fill="${p.ink}"/><path d="m115 74 10-17 10 17-10 17Z" fill="${p.accent}" stroke="#FFF3B4" stroke-width="3"/>
  <path d="M109 176q51 23 102 0l29 121-80 39-80-39Z" fill="#F1E8D3" stroke="${p.secondary}" stroke-width="5"/><path d="M121 190h78l20 113-59 25-59-25Z" fill="${p.primary}"/><path d="M160 196v112M121 190l39 32 39-32" fill="none" stroke="${p.accent}" stroke-width="6"/>
  <path d="M102 197 61 274M218 197l42 77" stroke="${p.skin}" stroke-width="24" stroke-linecap="round"/><path d="M125 327 111 392M195 327l15 65" stroke="${p.ink}" stroke-width="29" stroke-linecap="round"/>
  <path d="M219 222h52l-6 75h-40Z" fill="${p.secondary}" stroke="${p.accent}" stroke-width="5"/><path d="M226 236h38" stroke="#FFF0D7" stroke-width="7"/>
  <circle cx="160" cy="253" r="15" fill="${p.accent}"/><path d="M153 253h14M160 246v14" stroke="${p.ink}" stroke-width="3"/>
 </g>`;}

function masterSvg(item){
  const body={runner,cat,puppet,knight,tea}[item.variant](item);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 420" role="img" aria-labelledby="title desc">
 <title id="title">${esc(item.name)} canonical character master</title>
 <desc id="desc">Airvana original code-native character master shared by cover and runtime.</desc>
 <metadata>Airvana character-consistency-v1; original vector artwork; no third-party IP; no generative runtime asset.</metadata>
 ${defs(item)}
 ${body}
</svg>\n`;
}

function sceneSvg(item){
  const p=item.palette;
  const scenes={
    runner:`<path d="M95 245 625 245 718 1040H2Z" fill="#111827" stroke="${p.secondary}" stroke-width="6"/><path d="m260 245-90 795m290-795 91 795" stroke="#FFFFFF" stroke-opacity=".16" stroke-width="8" stroke-dasharray="25 25"/><path d="m70 720 86-30 42 84-91 31Zm484-146 83-28 38 77-86 29Z" fill="${p.primary}" stroke="${p.accent}" stroke-width="7"/>`,
    cat:`<path d="M50 650q310-210 620 0v390H50Z" fill="#322837"/><circle cx="120" cy="330" r="72" fill="${p.primary}" opacity=".32"/><circle cx="600" cy="350" r="86" fill="${p.secondary}" opacity=".28"/><g fill="${p.accent}"><circle cx="130" cy="910" r="54"/><circle cx="285" cy="910" r="54"/><circle cx="440" cy="910" r="54"/><circle cx="595" cy="910" r="54"/></g>`,
    puppet:`<path d="M42 730h636v310H42Z" fill="#6A4935"/><path d="M70 775h580M100 855h520" stroke="#D8B17E" stroke-opacity=".33" stroke-width="8"/><path d="M90 270h135v210H90Zm405 0h135v210H495Z" fill="#E8D8C4" opacity=".16" stroke="${p.accent}" stroke-width="5"/><path d="M136 300v140m404-140v140" stroke="${p.primary}" stroke-width="22"/>`,
    knight:`<path d="M0 695 180 520l160 120 140-165 240 220v345H0Z" fill="#202730"/><path d="M0 860h720v180H0Z" fill="#111318"/><path d="M510 340q120 40 155 190-113-45-217 10 11-146 62-200Z" fill="#0A0B10" stroke="${p.primary}" stroke-width="8"/><circle cx="545" cy="430" r="12" fill="${p.primary}"/><circle cx="617" cy="443" r="12" fill="${p.primary}"/>`,
    tea:`<path d="M0 745h720v295H0Z" fill="#5A3C2B"/><path d="M38 795h644M80 900h560" stroke="#E2B578" stroke-opacity=".25" stroke-width="8"/><circle cx="580" cy="220" r="104" fill="${p.accent}" opacity=".86"/><circle cx="614" cy="187" r="104" fill="#17322F"/><g fill="#F1E8D3"><rect x="80" y="690" width="78" height="125" rx="18"/><rect x="180" y="650" width="88" height="165" rx="18"/><rect x="292" y="710" width="72" height="105" rx="18"/></g>`
  };
  return scenes[item.variant];
}

function coverSvg(item){const p=item.palette;const master=`/assets/characters/v1/${item.characterId}/master.svg`;const body={runner,cat,puppet,knight,tea}[item.variant](item);return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 1280" role="img" aria-labelledby="title desc">
 <title id="title">${esc(item.name)} game cover</title>
 <desc id="desc">Airvana original cover built from the same canonical master used inside the playable.</desc>
 <metadata>Airvana character-consistency-v1; canonical-master:${esc(master)}; no third-party IP.</metadata>
 <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${p.primary}"/><stop offset=".48" stop-color="${p.ink}"/><stop offset="1" stop-color="#07090F"/></linearGradient><radialGradient id="glow"><stop stop-color="${p.secondary}" stop-opacity=".65"/><stop offset="1" stop-color="${p.secondary}" stop-opacity="0"/></radialGradient><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset=".62" stop-color="#05070B" stop-opacity="0"/><stop offset="1" stop-color="#05070B" stop-opacity=".9"/></linearGradient></defs>
 ${defs(item)}
 <rect width="720" height="1280" fill="url(#bg)"/><circle cx="360" cy="440" r="360" fill="url(#glow)"/>${sceneSvg(item)}
 <g data-canonical-master="${master}" transform="translate(112 220) scale(1.55)">${body}</g>
 <path d="M0 810q180-65 360 0t360 0v470H0Z" fill="url(#shade)"/>
 <g fill="none" stroke="#FFFFFF" stroke-opacity=".14"><path d="M55 96h610"/><path d="M55 1120h610"/></g>
</svg>\n`;}

fs.mkdirSync(characterRoot,{recursive:true});
fs.mkdirSync(coverRoot,{recursive:true});
const files=[];
for(const item of characters){
  const dir=path.join(characterRoot,item.characterId);fs.mkdirSync(dir,{recursive:true});
  const master=masterSvg(item);const cover=coverSvg(item);
  fs.writeFileSync(path.join(dir,'master.svg'),master);
  fs.writeFileSync(path.join(coverRoot,`${item.gameKey}.svg`),cover);
  const contract={
    schema_version:'1.0.0',asset_version:'1.0.1',character_id:item.characterId,game_id:item.gameId,game_key:item.gameKey,name:item.name,archetype:item.archetype,
    art_direction:'Airvana original premium stylized 2D vector; readable at mobile scale; deterministic and editable',
    locked_identity_features:item.locked,editable_features:['pose','expression','camera angle','stage lighting','non-identity particle effects'],
    prohibited_transformations:['third-party character likeness','logo or branded costume','identity color replacement','silhouette replacement','photoreal face synthesis'],
    canonical_master:`public/assets/characters/v1/${item.characterId}/master.svg`,
    cover_asset:`public/assets/game-covers/character-consistency-v1/${item.gameKey}.svg`,
    runtime_asset:`public/assets/characters/v1/${item.characterId}/master.svg`,
    cover_scene:item.coverScene,authorization_status:'approved_local_prototype',external_release_status:'pending_human_review'
  };
  fs.writeFileSync(path.join(dir,'character.json'),JSON.stringify(contract,null,2)+'\n');
  files.push({game_id:item.gameId,game_key:item.gameKey,character_id:item.characterId,name:item.name,master:`${item.characterId}/master.svg`,cover:`/assets/game-covers/character-consistency-v1/${item.gameKey}.svg`,master_sha256:sha256(master),cover_sha256:sha256(cover)});
}
const manifest={version:'1.0.1',generatedBy:'scripts/generate-character-consistency-v1.mjs',license:'Airvana original local prototype vector artwork',generativeAI:false,thirdPartyAssets:false,canonicalSourceRule:'Each pilot cover and Canvas runtime resolve the same master.svg.',pilotGameIds:characters.map(item=>item.gameId),files};
fs.writeFileSync(path.join(characterRoot,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Generated ${characters.length} canonical character masters and shared-source covers.`);
