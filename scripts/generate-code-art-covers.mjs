import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'public/assets/game-covers/code-art-v3');
const games=[
  [1,'safety-workshop','quiz','#EE4D5F','#F4B54B','#09111C'],[2,'stellar-farm','builder','#58B77A','#EBCB62','#10251B'],[5,'pixel-quest','runner','#7C66F2','#F0B954','#11101E'],[6,'red-cup-shuffle','cups','#E9484F','#F4C34D','#170E11'],
  [9,'magic-choir','rhythm','#9B6CE7','#62CFCA','#120F1E'],[10,'paws-stage','sequence','#F58A7B','#F2C95D','#1A1218'],[12,'puppet-studio','wardrobe','#4C94E8','#F0A36B','#101927'],[14,'firefly-mail','sort','#F0C85A','#5CB9A7','#101F1D'],
  [15,'whisker-escape','maze','#F09B58','#7BC3B0','#171512'],[16,'coin-journey','coin','#E8B43E','#4F9ACC','#19160C'],[17,'jungle-dive','fishing','#41A99C','#E0A648','#092126'],[18,'rift-strike','shooter','#4C83E8','#E65972','#0A1020'],
  [19,'stardust-island','builder','#4EAA8A','#E6B864','#0F211F'],[20,'formation-knights','battle','#C64F4F','#D7B562','#190F11'],[21,'galaxy-toy-shop','shop','#5E86DD','#EAA45C','#111523'],[22,'city-rush','drift','#E55050','#46A2C7','#0D1219'],
  [23,'sky-cannon','defense','#D76543','#5DA2C8','#191410'],[24,'neon-dash','runner','#E84D6B','#45B9C6','#0E131C'],[25,'pulse-forge','rhythm','#D55B69','#D5A34A','#171215'],[26,'sky-stack','stack','#4E9DB8','#E2B15E','#101A22'],
  [27,'rune-circuit','circuit','#45A485','#B36BC4','#0D1C19'],[28,'prism-match','match','#D75491','#4AB4C6','#14101E'],[29,'star-cups','cups','#805BC2','#E0B650','#130F20'],[30,'deep-catch','fishing','#3B9DBC','#E0C35C','#091824'],
  [31,'ember-bastion','defense','#D96045','#D5B05B','#1A100E'],[32,'nova-drift','drift','#D24F49','#4C9CB5','#0D151A'],[33,'void-squadron','shooter','#5C76D9','#D45A8C','#0A0E1D'],[34,'orchard-merge','match','#7EA84E','#D99A4D','#161E10'],
  [35,'star-mower','survival','#8B9B6A','#D6B75D','#151816'],[36,'moonlight-tea-shop','shop','#4C9389','#D9A46A','#111E1C'],[37,'microbe-arena','survival','#4CA29C','#D97962','#0F2322'],[38,'star-deck','cards','#7A6AB2','#D4B15A','#111322'],
  [39,'crystal-bastion','defense','#4C9EA1','#D2A754','#111E20'],[40,'adventurer-journal','maze','#6E8A72','#D1A661','#171A16'],[41,'idiom-detective','cards','#A1674E','#D2AD65','#1D1713'],[42,'hex-frontier','battle','#698770','#D0AA5C','#131B17'],
  [43,'studio-wardrobe','wardrobe','#9A665C','#C39B68','#191313'],[44,'garden-renewal','match','#71946A','#D5A65B','#151D14']
];

const escape=value=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const seed=value=>[...value].reduce((total,char)=>Math.imul(total^char.charCodeAt(0),16777619)>>>0,2166136261);

function motif(kind,accent,secondary,number){
  const rand=index=>((Math.imul(number+index*2654435761,1597334677)>>>0)%1000)/1000;
  if(['runner','drift'].includes(kind)) return `
    <path d="M110 1470 L360 500 L540 500 L790 1470Z" fill="#111823" stroke="${secondary}" stroke-opacity=".34" stroke-width="10"/>
    <path d="M450 1440 L450 560" stroke="#F7F2E8" stroke-opacity=".75" stroke-width="22" stroke-dasharray="64 54"/>
    <path d="M230 1420 L390 1040 L510 1040 L670 1420Z" fill="${accent}" filter="url(#shadow)"/>
    <rect x="350" y="1110" width="200" height="170" rx="48" fill="#F7F2E8" opacity=".92"/><circle cx="300" cy="1360" r="46" fill="#111"/><circle cx="600" cy="1360" r="46" fill="#111"/>`;
  if(['defense','battle','builder'].includes(kind)) return `
    <path d="M0 980 Q190 850 360 930 T900 900 V1600 H0Z" fill="${accent}" opacity=".3"/>
    <path d="M90 1330 C260 1070 500 1150 820 820" fill="none" stroke="#E9DCC3" stroke-opacity=".72" stroke-width="76"/>
    ${[0,1,2].map(index=>{const x=170+index*260,y=850-index*90;return `<g filter="url(#shadow)"><rect x="${x-62}" y="${y}" width="124" height="210" rx="18" fill="#252A2E"/><path d="M${x-74} ${y+20} L${x} ${y-48} L${x+74} ${y+20}Z" fill="${index%2?secondary:accent}"/><circle cx="${x}" cy="${y+85}" r="25" fill="${secondary}"/></g>`}).join('')}
    <circle cx="720" cy="690" r="100" fill="${secondary}" opacity=".85" filter="url(#glow)"/>`;
  if(['match','circuit','cards','cups','quiz'].includes(kind)) return `
    <rect x="90" y="470" width="720" height="910" rx="76" fill="#F2EEE4" fill-opacity=".08" stroke="#FFFFFF" stroke-opacity=".16" stroke-width="6"/>
    ${Array.from({length:12},(_,index)=>{const column=index%3,row=Math.floor(index/3),x=180+column*270,y=600+row*210,r=60+Math.round(rand(index)*18),fill=index%3===0?accent:index%3===1?secondary:'#E7E1D4';return `<rect x="${x-r}" y="${y-r}" width="${r*2}" height="${r*2}" rx="${kind==='circuit'?18:42}" fill="${fill}" fill-opacity="${.62+rand(index+20)*.3}" transform="rotate(${Math.round(rand(index+40)*18-9)} ${x} ${y})" filter="url(#shadow)"/>`}).join('')}
    <circle cx="450" cy="385" r="92" fill="${secondary}" filter="url(#glow)"/><path d="M410 385 L438 416 L500 345" fill="none" stroke="#17202A" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>`;
  if(['rhythm','sequence','shop','wardrobe','sort'].includes(kind)) return `
    <path d="M80 1350 V560 Q80 470 170 470 H730 Q820 470 820 560 V1350Z" fill="#F4EFE5" fill-opacity=".07" stroke="#FFFFFF" stroke-opacity=".16" stroke-width="6"/>
    ${[0,1,2,3].map(index=>{const x=175+(index%2)*370,y=650+Math.floor(index/2)*330;return `<g filter="url(#shadow)"><rect x="${x-120}" y="${y-105}" width="240" height="230" rx="48" fill="${index%2?secondary:accent}"/><circle cx="${x}" cy="${y-10}" r="54" fill="#F4EFE5" fill-opacity=".84"/><path d="M${x-62} ${y+78} Q${x} ${y+24} ${x+62} ${y+78}" fill="none" stroke="#1A2026" stroke-width="22" stroke-linecap="round"/></g>`}).join('')}
    <path d="M140 420 C280 250 590 250 760 420" fill="none" stroke="${secondary}" stroke-width="28" stroke-linecap="round"/>`;
  if(['fishing','shooter','survival'].includes(kind)) return `
    ${Array.from({length:18},(_,index)=>{const x=60+rand(index)*780,y=360+rand(index+40)*980,r=10+rand(index+80)*38;return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(0)}" fill="${index%2?secondary:accent}" fill-opacity="${(.28+rand(index+100)*.52).toFixed(2)}"/>`}).join('')}
    <path d="M150 1220 Q450 980 750 1220 L690 1390 Q450 1290 210 1390Z" fill="#EDF0E7" fill-opacity=".9" filter="url(#shadow)"/>
    <circle cx="450" cy="1070" r="120" fill="${accent}"/><path d="M390 1070 L450 970 L510 1070 L450 1170Z" fill="#F5E6B2"/>
    <path d="M450 900 V590" stroke="${secondary}" stroke-width="22" stroke-linecap="round"/><circle cx="450" cy="520" r="58" fill="${secondary}" filter="url(#glow)"/>`;
  return `<circle cx="450" cy="820" r="300" fill="${accent}" opacity=".7"/><circle cx="450" cy="820" r="180" fill="${secondary}"/>`;
}

function svg(game){
  const [id,key,kind,accent,secondary,background]=game;
  const number=seed(`${id}:${key}`);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1600" role="img" aria-labelledby="title description">
  <title id="title">${escape(key)} original cover art</title>
  <desc id="description">Airvana code-native vector game artwork. No generative image or third-party asset.</desc>
  <defs>
    <linearGradient id="background" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${background}"/><stop offset=".58" stop-color="${accent}" stop-opacity=".42"/><stop offset="1" stop-color="#070A0D"/></linearGradient>
    <radialGradient id="light"><stop stop-color="${secondary}" stop-opacity=".48"/><stop offset="1" stop-color="${secondary}" stop-opacity="0"/></radialGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="24" stdDeviation="24" flood-color="#05070A" flood-opacity=".44"/></filter>
    <filter id="glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="8" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="900" height="1600" fill="url(#background)"/>
  <circle cx="${160+(number%520)}" cy="330" r="380" fill="url(#light)"/>
  <path d="M0 220 Q180 130 350 220 T900 180" fill="none" stroke="#FFFFFF" stroke-opacity=".08" stroke-width="3"/>
  ${motif(kind,accent,secondary,number)}
  <rect x="34" y="34" width="832" height="1532" rx="64" fill="none" stroke="#FFFFFF" stroke-opacity=".12" stroke-width="4"/>
</svg>`;
}

fs.mkdirSync(output,{recursive:true});
for(const game of games) fs.writeFileSync(path.join(output,`${game[1]}.svg`),svg(game));
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify({version:'3.0.0',generatedBy:'scripts/generate-code-art-covers.mjs',license:'Airvana original',generativeAI:false,thirdPartyAssets:false,files:games.map(([id,key,kind])=>({id,key,kind,file:`${key}.svg`}))},null,2)+'\n');
console.log(`Generated ${games.length} code-native covers in ${output}`);
