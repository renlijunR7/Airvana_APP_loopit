import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

// Packaging only: place approved raster environments and gameplay sprites into
// game-layout previews. This does not repaint, vectorize or synthesize artwork.
const require = createRequire(import.meta.url);
let sharp;
for (const candidate of [process.env.AIRVANA_SHARP_MODULE, 'sharp', path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp')].filter(Boolean)) {
  try {sharp=require(candidate);break;} catch {}
}
if(!sharp)throw new Error('Sharp is required. Set AIRVANA_SHARP_MODULE to an installed Sharp module.');
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const OUT=path.join(ROOT,'public/assets/games/casual-v1');
const MOBILE=path.join(ROOT,'apps/airvana_mobile/assets/runner/assets/games/casual-v1');
const CATALOG=JSON.parse(fs.readFileSync(path.join(ROOT,'public/assets/games/fidelity-v2/manifest.json'),'utf8')).assets;
const SIZE={width:720,height:1120};
const SCENES_ONLY=process.argv.includes('--scenes-only');
// Every game has its own world and its own independent source image. No theme
// fallback is allowed: sharing eight backdrops across 38 games was rejected.
const ENVIRONMENTS=CATALOG.map(game=>game.game_key);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const summary=(buffer,relative,extra={})=>({path:relative,format:path.extname(relative).slice(1),width:SIZE.width,height:SIZE.height,bytes:buffer.length,sha256:hash(buffer),...extra});
const themeBuffers=new Map();
const sources=new Map();
const spriteCache=new Map();
const validatedSprites=new Set();
const usedSprites=new Set();
const svg=(body)=>Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1120" viewBox="0 0 360 560"><defs><linearGradient id="cream" x2="0" y2="1"><stop stop-color="#fffbe6"/><stop offset="1" stop-color="#efcb93"/></linearGradient><linearGradient id="wood" x2="0" y2="1"><stop stop-color="#bb7e3c"/><stop offset="1" stop-color="#78441f"/></linearGradient><linearGradient id="soil" x2="0" y2="1"><stop stop-color="#9b663e"/><stop offset="1" stop-color="#684323"/></linearGradient><linearGradient id="pad" x2="0" y2="1"><stop stop-color="#edf8ff"/><stop offset="1" stop-color="#afcddd"/></linearGradient><filter id="drop"><feDropShadow dx="0" dy="3" stdDeviation="2" flood-color="#382810" flood-opacity=".23"/></filter></defs>${body}</svg>`);
const rect=(x,y,w,h,fill='url(#cream)',stroke='#aa743c',radius=12)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;
const line=(x,y,xx,yy,color='#f9e7b0',width=4)=>`<path d="M${x} ${y}L${xx} ${yy}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;
const circle=(x,y,r,fill,stroke='#82491f',width=2)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"/>`;
const polygon=(points,fill,stroke='#789850')=>`<polygon points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/>`;

async function sprite(key,x,y,w=64,h=w){
 const file=path.join(OUT,'sprites',`${key}.png`);
 if(!fs.existsSync(file))throw new Error(`Missing casual PNG sprite: ${key}`);
 if(!validatedSprites.has(key)){const metadata=await sharp(file).metadata(),stats=await sharp(file).stats();if(!metadata.hasAlpha||stats.channels.at(-1).min!==0||stats.channels.at(-1).max===0)throw new Error(`Sprite needs real transparent alpha, not a baked checkerboard: ${key}`);validatedSprites.add(key);}
 usedSprites.add(key);
 const cacheKey=`${key}:${w}:${h}`;
 if(!spriteCache.has(cacheKey))spriteCache.set(cacheKey,await sharp(file).resize(Math.round(w*2),Math.round(h*2),{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer());
 return {input:spriteCache.get(cacheKey),left:Math.round(x*2),top:Math.round(y*2)};
}

function coverLayout(game){
 const nodes=[],shapes=[];const key=game.game_key,m=({'orchard-merge':'merge','microbe-arena':'io','magic-choir':'sequencer','star-mower':'mower','star-deck':'deck','adventurer-journal':'journal','idiom-detective':'idiom','hex-frontier':'hex','garden-renewal':'garden'})[key]||game.mechanic;
 const put=(name,x,y,w=64,h=w)=>nodes.push([name,x,y,w,h]);
 const frame=(x,y,w,h,fill='url(#cream)')=>shapes.push(`<g filter="url(#drop)">${rect(x,y,w,h,fill,'#a3723c',18)}${rect(x+4,y+4,w-8,h-8,'none','#fff1c8',14)}</g>`);
 const board=(cols,rows,keys,soil=false)=>{const tile=cols===5?54:63,gap=5,bw=cols*(tile+gap)-gap,bh=rows*(tile+gap)-gap,x=(360-bw)/2,y=(560-bh)/2;frame(x-11,y-11,bw+22,bh+22,'url(#wood)');for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){let xx=x+col*(tile+gap),yy=y+row*(tile+gap);shapes.push(rect(xx,yy,tile,tile,soil?'url(#soil)':'url(#cream)',soil?'#704321':'#e8cc91',9));put(keys[(row*3+col*2+(game.content_id||0))%keys.length],xx+5,yy+5,tile-10);}};
 if(m==='merge'||m==='match')board(5,5,m==='merge'?['green_apple','pear','red_apple','orange','plum']:['emerald','ruby','sapphire','amethyst']);
 else if(m==='shooter'){for(let r=0;r<3;r++)for(let c=0;c<4;c++)put(r%2?'enemy_ship':'drone',36+c*76,107+r*66,61,54);for(let r=0;r<3;r++)put('bullet',173,311+r*32,13,27);put('spacecraft',135,422,92,105);}
 else if(m==='mower'){for(const[x,y]of[[41,111],[254,142],[67,367],[264,389],[237,259],[39,269]])put('spore',x,y,46);put('mower',133,247,99,111);shapes.push(line(123,300,89,300,'#ffed92',5),line(180,363,180,405,'#ffed92',5));}
 else if(m==='runner'){for(let i=0;i<5;i++)put(i%2?'roadblock':'energy',63+(i%3)*79,110+i*64,i%2?62:37);put('runner',143,407,87,115);}
 else if(m==='drift'){for(let i=0;i<3;i++)put('roadblock',88+(i%2)*141,139+i*104,47);put('car',134,379,93,127);}
 else if(m==='cups'){frame(22,171,316,242);for(let i=0;i<3;i++)put('cup',35+i*103,223,87,120);put(key==='red-cup-shuffle'?'ruby':'star',62,351,39);shapes.push(line(72,204,279,204,'#b97830',3),polygon('271,199 280,204 271,209','#b97830','#b97830'));}
 else if(m==='builder'||m==='garden'){board(4,5,key==='garden-renewal'?['seeds','flower','seedling','flower','watering_can','flower']:['tree','flower','house','green_apple','seedling'],true);}
 else if(m==='maze'){frame(26,100,308,369);for(let row=0;row<9;row++)for(let col=0;col<7;col++){const wall=row===0||row===8||col===0||col===6||(row%2===0&&col!==5-row%3);shapes.push(rect(40+col*40,115+row*38,38,36,wall?'url(#wood)':'#f2e2bb',wall?'#795324':'#dbc299',5));}put('cat',81,156,36,40);put('key',240,390,34);}
 else if(m==='fishing'){shapes.push(line(175,70,175,327,'#e7fcff',2));put('hook',160,324,36,54);for(let i=0;i<5;i++)put(i===3?'predator_fish':'fish',37+(i%3)*111,146+i*67,65,51);}
 else if(m==='io'){put('microbe',121,231,116);for(const[x,y,s]of[[31,111,50],[269,129,54],[52,421,48],[265,389,51],[144,103,32]])put('microbe_enemy',x,y,s);for(const[x,y]of[[65,293],[248,260],[184,427],[119,368]])put('spore',x,y,25);}
 else if(m==='battle'||m==='deck'){put('sentinel',209,87,101,144);put('hero',61,235,118,155);shapes.push(rect(198,247,113,8,'#6c4836','#fff0ba',4),rect(201,249,82,4,'#ed5e59','#ed5e59',2));for(let i=0;i<3;i++){frame(32+i*102,412,91,108);put(['sword','shield','potion'][i],44+i*102,428,68,77);}}
 else if(m==='defense'){for(let row=0;row<3;row++){shapes.push(rect(26,158+row*119,307,14,'url(#wood)','#683c25',7));put(row%2?'turret':'cannon',44,111+row*119,79,70);put('raider',226+(row%2)*35,105+row*119,60,77);}put('crystal',267,475,56,68);}
 else if(m==='hex'){for(let row=0;row<6;row++)for(let col=0;col<4;col++){const x=55+col*71+(row%2)*35,y=123+row*56;shapes.push(polygon(`${x},${y-32} ${x+30},${y-16} ${x+30},${y+16} ${x},${y+32} ${x-30},${y+16} ${x-30},${y-16}`,row%3===0?'#90c663':'#cee98b','#6a9c4c'));if((row+col)%4===0)put((row+col)%3?'guardian':'raider',x-24,y-31,48,58);}}
 else if(m==='sequencer'||m==='rhythm'||m==='sequence'){const cols=m==='sequence'?2:4,rows=m==='sequence'?2:6;frame(27,111,306,m==='sequence'?281:350);for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){const w=cols===2?123:61,h=cols===2?119:46,x=(360-cols*(w+8)+8)/2+col*(w+8),y=133+row*(h+8);shapes.push(rect(x,y,w,h,(row+col)%3===0?'#f2b944':'url(#pad)','#789cab',11));if(m==='sequence')put(['plush','cat','kitten','plush'][row*2+col],x+20,y+21,83);else if((row+col)%3===0)put('star',x+14,y+7,32);}}
 else if(m==='shop'){frame(22,149,316,309);for(let i=0;i<3;i++){shapes.push(rect(35+i*99,169,91,107,'url(#cream)','#d7ae78',12));put(key==='moonlight-tea-shop'?['tea','coffee','cup'][i]:['plush','parcel','star'][i],44+i*99,183,73);}shapes.push(rect(43,306,274,125,'url(#wood)','#825124',13));put(key==='moonlight-tea-shop'?'cup':'parcel',132,314,97,104);}
 else if(m==='wardrobe'){frame(116,103,130,258);put(key==='puppet-studio'?'plush':'model',125,145,113,174);for(let i=0;i<3;i++){frame(35+i*101,395,88,98);put(['dress','shoes','hat'][i],47+i*101,410,64,66);}}
 else if(m==='sort'){for(let i=0;i<3;i++){put('mailbox',29+i*108,365,84,118);put('letter',42+i*97,125+i*57,68,58);}}
 else if(m==='coin'){for(let i=0;i<4;i++)shapes.push(circle(88+(i%2)*186,143+i*80,27,'none','#b9771f',10),circle(88+(i%2)*186,141+i*80,27,'none','#ffd36e',6));put('star',143,455,75);}
 else if(m==='stack'){for(let row=0;row<8;row++)shapes.push(rect(70+row*8,466-row*33,222-row*16,30,row%2?'url(#cream)':'url(#wood)','#8d5b31',5));shapes.push(rect(127,156,155,29,'url(#cream)','#8d5b31',5));}
 else if(m==='circuit'){frame(34,131,293,293);for(let row=0;row<4;row++)for(let col=0;col<4;col++){const x=45+col*69,y=142+row*69;shapes.push(rect(x,y,64,64,'url(#pad)','#80a4a6',8),line(x+32,y+4,x+32,y+32,'#708c86',12),line(x+32,y+32,x+60,y+32,'#708c86',12),circle(x+32,y+32,8,'#eec16c','#eec16c',1));}}
 else if(m==='journal'){shapes.push(`<path d="M90 115L130 180L108 268L250 329L202 406L276 478" fill="none" stroke="#fce0a0" stroke-width="7" stroke-dasharray="6 9" stroke-linecap="round"/>`);for(const[x,y,name]of[[44,71,'tent'],[85,214,'tree'],[222,285,'house'],[164,361,'guardian'],[240,432,'treasure']])put(name,x,y,79,87);}
 else if(m==='idiom'){frame(32,125,296,224);put('tree',58,151,109,149);put('flower',202,188,82,82);for(let i=0;i<4;i++){frame(31+i*78,399,67,74);put(['scroll','key','star','treasure'][i],39+i*78,409,52);}}
 else if(m==='quiz'){frame(38,140,284,222);put('shield',126,179,109,129);for(let i=0;i<2;i++){frame(37+i*149,396,137,91);put(i?'key':'shield',76+i*149,410,62);}}
 else throw new Error(`Cover layout is not defined for ${key}: ${m}`);
 return {shapes,nodes};
}

for(const target of[OUT,MOBILE])for(const sub of['scenes','covers','covers-png'])fs.mkdirSync(path.join(target,sub),{recursive:true});
for(const theme of ENVIRONMENTS){
 const file=path.join(OUT,'environments',`${theme}.png`);
 if(!fs.existsSync(file))throw new Error(`Missing casual environment: ${file}`);
 const source=fs.readFileSync(file),metadata=await sharp(source).metadata();
 if(!metadata.width||metadata.height<=metadata.width)throw new Error(`Expected portrait environment: ${theme}`);
 sources.set(theme,{path:`public/assets/games/casual-v1/environments/${theme}.png`,format:'png',width:metadata.width,height:metadata.height,bytes:source.length,sha256:hash(source),source_generator:'OpenAI built-in ImageGen',reference_role:'user supplied visual style reference only',prompt_record:`public/assets/games/casual-v1/sources/${theme}.prompt.txt`});
 themeBuffers.set(theme,await sharp(source).resize(SIZE.width,SIZE.height,{fit:'cover',position:'centre'}).webp({quality:89,effort:6}).toBuffer());
}
if(new Set([...sources.values()].map(s=>s.sha256)).size!==38)throw new Error('Each game must have a different independent source environment; duplicate backgrounds are forbidden.');
if(new Set([...themeBuffers.values()].map(hash)).size!==38)throw new Error('All 38 runtime scenes must remain distinct after resizing.');
const assets=[];
for(const game of CATALOG){
 const key=game.game_key,theme=key;
 const scene=themeBuffers.get(theme),layout=SCENES_ONLY?{shapes:[],nodes:[]}:coverLayout(game);
 const layers=SCENES_ONLY?[]:[{input:svg(layout.shapes.join('')),left:0,top:0},...await Promise.all(layout.nodes.map(item=>sprite(...item)))];
 const coverPng=SCENES_ONLY?null:await sharp(scene).composite(layers).png().toBuffer();
 const cover=SCENES_ONLY?null:await sharp(coverPng).webp({quality:91,effort:6}).toBuffer();
 for(const target of[OUT,MOBILE]){fs.writeFileSync(path.join(target,'scenes',`${key}.webp`),scene);if(!SCENES_ONLY){fs.writeFileSync(path.join(target,'covers',`${key}.webp`),cover);fs.writeFileSync(path.join(target,'covers-png',`${key}.png`),coverPng);}}
 assets.push({asset_id:`asset_casual_v1_${key}`,game_key:key,content_id:game.content_id,title:game.title,mechanic:game.mechanic,runtime:game.runtime,world_id:theme,shared_environment:false,role:'dedicated_gameplay_scene',source_authoring:'reference-guided raster generation and deterministic game-layout composition',source_generator:'OpenAI built-in ImageGen',provenance:'Independent game-specific generated environment and transparent gameplay sprites guided by user reference; no third-party game screenshots or copied characters used',prompt_set:`public/assets/games/casual-v1/sources/${key}.prompt.txt`,reference_role:'style only',owner:'Airvana local demo owner',authorization_status:'local_preview_user_requested',release_approved:false,locale:'language-neutral',version:'1.0.0',source:sources.get(theme),runtime_asset:summary(scene,`public/assets/games/casual-v1/scenes/${key}.webp`),cover_asset:cover?summary(cover,`public/assets/games/casual-v1/covers/${key}.webp`):null,cover_png:coverPng?summary(coverPng,`public/assets/games/casual-v1/covers-png/${key}.png`):null,flutter_asset:`apps/airvana_mobile/assets/runner/assets/games/casual-v1/scenes/${key}.webp`,flutter_cover_png:`apps/airvana_mobile/assets/runner/assets/games/casual-v1/covers-png/${key}.png`,cover_sprite_keys:[...new Set(layout.nodes.map(n=>n[0]))]});
}
const manifest={schema:'airvana.game-art-manifest.v2',version:'1.0.0',status:'LOCAL_DEMO',build_scope:SCENES_ONLY?'scenes-ready-covers-pending':'complete-assets',art_pack:'casual-v1',visual_style:'bright polished 2.5D casual mobile game, dimensional materials and saturated friendly color',game_count:38,environment_count:38,asset_count:SCENES_ONLY?38:114,source_generator:'OpenAI built-in ImageGen',composition_builder:'scripts/build-casual-scenes-v1.mjs',source_artwork_policy:'Each game has an independent themed world and source environment. User reference is style guidance; original generated environments and sprites; no old classic-v1 SVG art reused',environments:[...sources.entries()].map(([game_key,source])=>({game_key,source})),cover_sprite_keys:[...usedSprites].sort(),assets};
const manifestText=JSON.stringify(manifest,null,2)+'\n';for(const target of[OUT,MOBILE])fs.writeFileSync(path.join(target,'manifest.json'),manifestText);
if(!SCENES_ONLY){const pngManifest=JSON.stringify({source:'REFERENCE_GUIDED_CASUAL_2_5D',generator:'OpenAI built-in ImageGen plus deterministic layout packaging',entries:assets.map(a=>({file:`${a.game_key}.png`,game_key:a.game_key,source:a.cover_asset.path,sha256:a.cover_png.sha256,bytes:a.cover_png.bytes,width:SIZE.width,height:SIZE.height}))},null,2)+'\n';for(const target of[OUT,MOBILE])fs.writeFileSync(path.join(target,'covers-png','manifest.json'),pngManifest);}
for(const kind of (SCENES_ONLY?['scenes']:['covers','scenes']))for(let page=0;page<5;page++){
 const html=`<!doctype html><html><head><meta charset="utf-8"><title>Casual 2.5D Game Art QA</title><style>body{margin:18px;background:#f7f3e9;color:#584127;font:12px system-ui}header{display:flex;gap:18px;align-items:center;margin-bottom:14px}a{color:#724718}main{display:grid;grid-template-columns:repeat(4,180px);gap:12px}figure{margin:0}img{display:block;width:180px;height:280px;border-radius:14px}figcaption{padding:6px 0}</style></head><body><header><b>Casual 2.5D / gameplay artwork</b><a href="preview-covers-0.html">Covers</a><a href="preview-scenes-0.html">Scenes</a><nav>${Array.from({length:5},(_,i)=>`<a href="preview-${kind}-${i}.html">${i+1}</a>`).join(' · ')}</nav></header><main>${assets.slice(page*8,page*8+8).map(a=>`<figure><img src="${kind}/${a.game_key}.webp" alt="${a.game_key}"><figcaption>${a.title}</figcaption></figure>`).join('')}</main></body></html>`;
 fs.writeFileSync(path.join(OUT,`preview-${kind}-${page}.html`),html);if(kind==='covers'&&page===0)fs.writeFileSync(path.join(OUT,'preview.html'),html);
}
console.log(JSON.stringify({games:assets.length,environments:sources.size,webp_scenes:38,webp_covers:SCENES_ONLY?0:38,png_covers:SCENES_ONLY?0:38,cover_sprite_keys:usedSprites.size,mirrored_into_flutter:true}));
