import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

// Original, deterministic vector drawing. No raster inputs, diffusion output,
// external artwork, trademark characters, textures, gradients or filters.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public/assets/games/classic-v1');
const MOBILE = path.join(ROOT, 'apps/airvana_mobile/assets/runner/assets/games/classic-v1');
const LEGACY_CATALOG = new Map(JSON.parse(fs.readFileSync(path.join(ROOT,'public/assets/games/fidelity-v2/manifest.json'),'utf8')).assets.map(item=>[item.game_key,item]));
const P = {
  meadow: {bg:'#8FAE76', light:'#B5C88E', dark:'#405943', ink:'#253D35', path:'#D4BE91', edge:'#728958', accent:'#DB8753'},
  coast: {bg:'#51919A', light:'#9AC7BD', dark:'#286170', ink:'#233B4F', path:'#D9C99A', edge:'#3A7B86', accent:'#E2915C'},
  night: {bg:'#17263B', light:'#405B79', dark:'#101B2B', ink:'#0C1626', path:'#6F829A', edge:'#253A53', accent:'#EBC977'},
  track: {bg:'#79A487', light:'#B5CCA2', dark:'#304348', ink:'#22323B', path:'#59676C', edge:'#638E76', accent:'#E77C60'},
  city: {bg:'#5F8197', light:'#B0CED0', dark:'#294354', ink:'#172F42', path:'#7D929D', edge:'#45677E', accent:'#E9B15B'},
  wood: {bg:'#B38F68', light:'#DDC9A1', dark:'#806247', ink:'#493D36', path:'#C9AD7F', edge:'#A7805C', accent:'#B9564F'},
  puzzle: {bg:'#CED6C0', light:'#F5EBD0', dark:'#7E9D89', ink:'#334D49', path:'#B6C7B2', edge:'#B7C5AA', accent:'#DA9363'},
  rose: {bg:'#CEB4AB', light:'#F0DECA', dark:'#927779', ink:'#584751', path:'#E2C8B8', edge:'#B49A98', accent:'#BD685F'},
  dungeon: {bg:'#596776', light:'#8995A0', dark:'#364552', ink:'#202F3D', path:'#71808A', edge:'#4A5969', accent:'#CEA866'},
  citadel: {bg:'#A7CD77', light:'#F8EAC8', dark:'#55734D', ink:'#344E42', path:'#E7D6AE', edge:'#8EB964', accent:'#51A9BC'},
  sand: {bg:'#D0B98A', light:'#EDD9A6', dark:'#987C57', ink:'#4F4A40', path:'#B19A72', edge:'#BEA57B', accent:'#C8724D'},
  violet: {bg:'#766988', light:'#B6A7BF', dark:'#49435E', ink:'#2C2C44', path:'#94839F', edge:'#655A78', accent:'#E6BC79'},
  sea: {bg:'#467B95', light:'#8BB7C1', dark:'#28465F', ink:'#19334C', path:'#6B9BAC', edge:'#3D6B84', accent:'#D6BB7B'},
};

// Motifs describe an original genre convention, not copied game IP.
const GAMES = [
 ['safety-workshop','safety','city','quiz','security-terminal'],
 ['stellar-farm','nature','meadow','builder','irrigated-farm'],
 ['pixel-quest','motion','meadow','runner','forest-trail'],
 ['red-cup-shuffle','collection','wood','cups','red-tabletop'],
 ['magic-choir','rhythm','violet','sequencer','four-track-studio'],
 ['paws-stage','rhythm','rose','sequence','pet-theatre'],
 ['puppet-studio','creation','rose','wardrobe','doll-workbench'],
 ['firefly-mail','story','night','sort','village-post-office'],
 ['whisker-escape','stealth','dungeon','maze','castle-corridor'],
 ['coin-journey','economy','sand','coin','desert-rings'],
 ['jungle-dive','ocean','coast','fishing','mangrove-lagoon'],
 ['rift-strike','space','night','shooter','orbital-sector'],
 ['stardust-island','nature','coast','builder','small-island'],
 ['formation-knights','strategy','meadow','battle','walled-training-ground'],
 ['galaxy-toy-shop','collection','violet','shop','toy-counter'],
 ['city-rush','motion','city','drift','city-road'],
 ['sky-cannon','strategy','city','defense','airship-deck'],
 ['neon-dash','motion','night','runner','city-lanes'],
 ['pulse-forge','rhythm','wood','rhythm','drum-machine'],
 ['sky-stack','motion','city','stack','construction-site'],
 ['rune-circuit','strategy','puzzle','circuit','circuit-table'],
 ['prism-match','economy','puzzle','match','jewel-board'],
 ['star-cups','collection','violet','cups','violet-tabletop'],
 ['deep-catch','ocean','sea','fishing','deep-sea'],
 ['ember-bastion','strategy','sand','defense','sandstone-rampart'],
 ['nova-drift','motion','track','drift','country-circuit'],
 ['void-squadron','space','night','shooter','deep-space'],
 ['orchard-merge','nature','meadow','merge','orchard-table'],
 ['moonlight-tea-shop','collection','wood','shop','tea-counter'],
 ['microbe-arena','ocean','sea','io','laboratory-slide'],
 ['crystal-bastion','strategy','citadel','defense','stone-citadel'],
 ['studio-wardrobe','creation','rose','wardrobe','tailor-workshop'],
 ['garden-renewal','nature','meadow','garden','garden-plots'],
 ['adventurer-journal','story','sand','journal','overland-map'],
 ['idiom-detective','story','wood','idiom','study-desk'],
 ['star-deck','strategy','dungeon','deck','tactical-tabletop'],
 ['hex-frontier','strategy','meadow','hex','borderlands'],
 ['star-mower','space','night','mower','orbital-arena'],
].map(([key,family,palette,mechanic,motif])=>({key,family,palette,mechanic,motif}));

const rect=(x,y,w,h,c,s='',sw=2)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"${s?` stroke="${s}" stroke-width="${sw}"`:''}/>`;
const line=(x1,y1,x2,y2,c,w=2)=>`<path d="M${x1} ${y1}H${x2}" fill="none" stroke="${c}" stroke-width="${w}"/>`.replace(`H${x2}`,`L${x2} ${y2}`);
const poly=(pts,c,s='',sw=2)=>`<polygon points="${pts}" fill="${c}"${s?` stroke="${s}" stroke-width="${sw}" stroke-linejoin="miter"`:''}/>`;
const circle=(x,y,r,c,s='',sw=2)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"${s?` stroke="${s}" stroke-width="${sw}"`:''}/>`;
const group=(x,y,inner,scale=1)=>`<g transform="translate(${x} ${y}) scale(${scale})">${inner}</g>`;
const hash = value => [...value].reduce((a,c)=>((a*31+c.charCodeAt(0))>>>0),7);
const svg=(inner)=>`<svg xmlns="http://www.w3.org/2000/svg" width="360" height="560" viewBox="0 0 360 560" shape-rendering="geometricPrecision">${inner}</svg>\n`;
function tree(x,y,p,s=1){return group(x,y,rect(-4,9,8,16,p.dark)+poly('-18,8 -18,-7 -10,-7 -10,-18 9,-18 9,-9 18,-9 18,8',p.dark)+rect(-13,-10,21,14,p.edge)+rect(-8,-14,12,5,p.light),s);}
function blocks(p,y=440,variant=0){let out='';for(let i=0;i<9;i++){const h=22+((i*29+variant*17)%64);out+=rect(i*44-12,y-h,38,h+560-y,p.dark);out+=rect(i*44-7,y-h+7,8,8,p.light);if(i%2===0)out+=rect(i*44+9,y-h+22,8,8,p.edge);}return out;}
function tiles(p,size=40){let out='';for(let y=0;y<560;y+=size)for(let x=0;x<360;x+=size){out+=rect(x,y,size,size,((x/size+y/size)%2)?p.bg:p.edge);out+=line(x+3,y+size-2,x+size-3,y+size-2,p.dark,1);}return out;}
function tabletop(p){let out=rect(0,0,360,560,p.bg);for(let y=20;y<560;y+=64){out+=line(0,y,360,y,p.edge,2);out+=line((y*7)%340,y,(y*7)%340,y+64,p.edge,2);}return out+rect(18,66,324,420,p.path,p.dark,3)+rect(24,72,312,408,p.light,p.edge,2);}
function stars(p,key){let out=rect(0,0,360,560,p.bg),h=hash(key);for(let i=0;i<54;i++){const x=12+(h+i*97)%336,y=12+(h*3+i*73)%536;out+=rect(x,y,i%8===0?3:2,i%8===0?3:2,i%3?p.edge:p.path);}return out+line(12,0,12,560,p.edge,2)+line(348,0,348,560,p.edge,2);}
function coast(p,deep=false){let out=rect(0,0,360,560,p.bg);for(let y=35;y<560;y+=58)for(let x=(y%3)*15;x<360;x+=88)out+=line(x,y,x+27,y,p.edge,3);if(!deep){out+=poly('0,0 360,0 360,85 295,85 295,106 221,106 221,117 108,117 108,103 38,103 38,86 0,86',p.path);out+=poly('0,0 360,0 360,64 289,64 289,83 210,83 210,92 113,92 113,81 35,81 35,64 0,64',p.light);}else{out+=poly('0,500 32,500 32,474 54,474 54,512 102,512 102,530 254,530 254,510 306,510 306,485 330,485 330,509 360,509 360,560 0,560',p.dark);}return out;}
function meadow(p,key){let out=rect(0,0,360,560,p.bg);for(let i=0;i<46;i++){const x=(hash(key)+i*73)%356,y=(i*47+19)%556;out+=line(x,y,x+4,y,p.edge,2);}out+=rect(18,65,324,429,p.light,p.dark,2);for(const [x,y]of[[7,60],[354,70],[9,496],[352,500]])out+=tree(x,y,p,1.3);out+=rect(0,525,360,35,p.path);for(let x=0;x<360;x+=36)out+=rect(x,531,26,4,p.bg);return out;}
function scene(g){const p=P[g.palette],k=g.key;let out='';
 if(['shooter','mower'].includes(g.mechanic)) {out=stars(p,k);if(k==='rift-strike'){out+=poly('0,0 68,0 68,17 46,17 46,37 0,37',p.dark)+poly('360,523 310,523 310,544 292,544 292,560 360,560',p.dark);}if(k==='star-mower')out+=rect(22,74,316,433,'none',p.edge,3);}
 else if(g.mechanic==='drift'){out=rect(0,0,360,560,p.bg)+rect(0,0,360,85,p.light);if(k==='city-rush')out+=blocks(p,95,2);else out+=poly('0,80 35,80 35,64 95,64 95,43 155,43 155,59 245,59 245,45 310,45 310,77 360,77 360,105 0,105',p.edge);out+=poly('132,85 226,85 336,560 18,560',p.dark)+poly('141,85 217,85 318,560 36,560',p.path);for(let y=100;y<560;y+=42){const d=(y-85)*.22;out+=rect(176,y,6,23,p.light)+rect(137-d,y,6,23,p.accent)+rect(219+d,y,6,23,p.light);} }
 else if(g.mechanic==='runner'){out=rect(0,0,360,560,p.bg);if(k==='pixel-quest'){out+=rect(28,0,304,560,p.light);out+=rect(62,0,236,560,p.path);for(let y=0;y<560;y+=98){out+=tree(20,y+28,p,1.25)+tree(344,y+76,p,1.25);} }else{out+=rect(38,0,284,560,p.dark)+rect(44,0,272,560,p.edge);for(let y=0;y<560;y+=72){out+=rect(26,y,8,28,p.path)+rect(326,y+34,8,28,p.accent);}}for(let x of[135,225])out+=line(x,0,x,560,p.bg,3);}
 else if(g.mechanic==='fishing'||g.mechanic==='io'){out=coast(p,k==='deep-catch'||g.mechanic==='io');if(k==='jungle-dive')for(const [x,y]of[[12,29],[333,39],[37,83]])out+=tree(x,y,P.meadow,1.25);if(g.mechanic==='io'){out+=rect(22,68,316,425,'none',p.light,3);for(const [x,y]of[[15,60],[325,60],[15,475],[325,475]])out+=rect(x,y,20,20,p.dark,p.edge);}}
 else if(['builder','garden','merge','hex'].includes(g.mechanic)){out=g.key==='stardust-island'?coast(p):meadow(p,k);if(k==='stardust-island')out+=poly('50,75 302,75 302,101 329,101 329,471 300,471 300,502 54,502 54,479 28,479 28,104 50,104',p.path)+rect(43,98,273,383,P.meadow.light,P.meadow.dark,3);if(k==='stellar-farm')out+=rect(21,65,12,429,'#659CAC')+rect(21,473,322,13,'#659CAC');if(k==='orchard-merge'){out+=rect(17,68,326,438,'#F3E4B5',p.dark,3)+rect(26,77,308,420,'#E7D59F','#B6A16B',2);}if(k==='garden-renewal')for(let i=0;i<8;i++)out+=rect(i*48,519,7,36,p.dark)+rect(i*48-6,525,42,5,p.dark);}
 else if(k==='crystal-bastion'){
  // Dedicated original citadel. The three 72/180/288 attack lanes align with
  // the live defense engine; y220 and y375 tower sites remain undecorated.
  out=rect(0,0,360,560,p.bg)+rect(21,103,318,373,'#B4D68A');
  out+=poly('22,106 112,106 112,173 133,173 133,304 112,304 112,471 22,471','#ADCF7F');
  out+=poly('245,106 339,106 339,471 227,471 227,318 246,318','#ADCF7F');
  for(const x of[72,180,288]){
   out+=rect(x-31,105,64,371,'#82A95D')+rect(x-29,103,58,369,'#B9A876')+rect(x-26,106,52,366,p.path);
   for(let y=111,row=0;y<466;y+=27,row++){
    out+=`<rect x="${x-24}" y="${y+2}" width="48" height="23" rx="3" fill="#C6B48A"/>`;
    out+=`<rect x="${x-24}" y="${y}" width="47" height="22" rx="3" fill="${row%3===0?'#F3E4BE':'#ECDDAD'}"/>`;
    out+=line(x-20,y+3,x+19,y+3,'#FFF2CE',1.5);
    if(row%3===1)out+=line(x+(row%2?4:-4),y+3,x+(row%2?4:-4),y+19,'#D0BF95',1);
   }
  }
  // Perimeter curtain walls: plain blocks and hard offset shadows, no glow.
  for(const x of[0,341]){
   out+=rect(x+3,109,18,369,'#799D5B')+rect(x,106,16,365,'#C8B990');
   for(let y=112;y<465;y+=30){out+=rect(x,y,15,25,'#E9D9B4')+rect(x+2,y+2,11,3,'#FFF0CA');if(y%60===22)out+=line(x+7,y+6,x+7,y+24,'#C9B994',1);}
  }
  // Battlement entrances sit above the incoming units, not on a tower site.
  out+=rect(0,53,360,46,'#B7A681')+rect(0,48,360,44,p.light)+rect(0,89,360,6,'#D3BF98');
  for(let x=5;x<360;x+=28)out+=rect(x,37,19,21,'#C9B38C')+rect(x,35,18,20,'#F6E8C7')+rect(x+2,37,14,3,'#FFF5DB');
  for(const x of[72,180,288]){
   out+=rect(x-32,78,65,29,'#91B567')+rect(x-29,73,58,31,'#AF9E78')+rect(x-25,77,50,32,p.path);
   out+=rect(x-36,66,10,46,'#D0BC95')+rect(x+26,66,10,46,'#D0BC95')+rect(x-37,64,9,43,p.light)+rect(x+27,64,9,43,p.light);
   out+=rect(x-31,64,62,9,'#F6E8C7')+rect(x-26,66,51,3,'#FFF4D8');
  }
  // Low courtyard wall and crystal plinth, beyond the playable lanes.
  out+=rect(14,479,334,64,'#86AE61')+rect(12,475,336,63,'#C8B48D')+rect(12,473,336,56,'#ECDDAD');
  for(let y=480;y<527;y+=20)for(let x=(y===500?-14:12);x<347;x+=43){out+=line(Math.max(13,x),y,Math.min(x+40,347),y,'#F7ECCC',2);if(x>12)out+=line(x,y+3,x,y+17,'#CCBA92',1);}
  for(let x=18;x<350;x+=34)out+=rect(x,468,23,13,'#C9B48C')+rect(x,466,22,12,'#F7E9C8');
  out+=poly('167,510 183,505 199,510 199,519 183,525 167,519','#AEA987')+poly('168,508 183,503 198,508 183,514','#F6E9C6');
  out+=poly('183,473 194,486 190,507 181,514 173,496','#438C9C')+poly('183,473 181,496 173,496','#B6EBE1')+poly('183,473 194,486 181,496','#75CBD0')+poly('181,496 190,507 181,514','#5AAEB9');
  // Small clipped-canopy shrubs, flowers and crystals stay between lanes.
  for(const[x,y]of[[126,146],[234,297],[126,323],[234,153]]){
   out+=circle(x+3,y+5,13,'#88AA63')+circle(x-6,y,9,'#588B50')+circle(x+6,y+1,10,'#588B50')+circle(x,y-6,11,'#79B562')+circle(x-3,y-10,5,'#9BD079');
  }
  for(const[x,y]of[[22,267],[335,326],[124,269],[232,414],[124,442]]){
   out+=line(x,y+5,x+2,y-4,'#6B9850',1.5)+circle(x+2,y-5,2.5,'#FFF1BD')+circle(x+2,y-5,.9,'#D8A759');
  }
  for(const[x,y]of[[23,414],[334,154]])out+=poly(`${x},${y-13} ${x+6},${y-4} ${x+4},${y+8} ${x-5},${y+5} ${x-6},${y-4}`,'#4C9DAC')+poly(`${x},${y-13} ${x},${y+5} ${x-6},${y-4}`,'#AFE5D9');
  for(const[x,y]of[[127,184],[235,262],[24,341],[333,438]])out+=line(x-3,y,x,y-4,'#8DB664',1.5)+line(x,y,x+3,y-3,'#8DB664',1.5);
 }
 else if(['battle','defense'].includes(g.mechanic)){out=tiles(p,40);out+=rect(20,66,320,420,p.path,p.dark,3);for(let y=76;y<480;y+=76){out+=rect(0,y,16,42,p.dark)+rect(344,y,16,42,p.dark);}if(k==='sky-cannon'){out=rect(0,0,360,560,p.light)+rect(17,75,326,421,p.path,p.dark,3);for(let y=97;y<480;y+=48)out+=line(20,y,340,y,p.bg,2);for(let x=44;x<360;x+=84)out+=rect(x,30,48,6,p.bg)+rect(x-13,36,75,8,p.bg);} }
 else if(g.mechanic==='maze'){out=tiles(p,36)+rect(18,66,324,420,p.path,p.ink,3);for(let y=12;y<560;y+=136)out+=rect(2,y,10,18,p.accent)+rect(348,y+47,10,18,p.accent);}
 else if(['sequencer','sequence','rhythm'].includes(g.mechanic)){out=rect(0,0,360,560,p.bg)+rect(16,71,328,427,p.dark,p.ink,3);for(let x=0;x<360;x+=20)out+=rect(x,0,12,54,p.edge);out+=rect(0,515,360,45,p.edge);for(let x of[32,294])out+=rect(x,476,34,45,p.ink)+circle(x+17,499,9,p.bg);}
 else if(g.mechanic==='stack'){out=rect(0,0,360,560,p.light)+blocks(p,525,1);out+=rect(24,505,312,14,p.dark);for(let i=0;i<3;i++)out+=rect(30+i*119,70+i*23,57,8,p.bg)+rect(40+i*119,61+i*23,35,9,p.bg);}
 else if(g.mechanic==='coin'){out=rect(0,0,360,560,p.light)+poly('0,471 60,421 103,435 162,389 205,411 276,388 360,440 360,560 0,560',p.bg);for(let x of[20,318])out+=rect(x,183,22,318,p.bg)+rect(x-5,173,32,16,p.dark);out+=rect(0,531,360,29,p.dark);}
 else if(g.mechanic==='sort'){out=rect(0,0,360,560,p.bg)+blocks(p,530,3);out+=rect(19,77,322,409,p.edge,p.dark,3);for(let x of[20,330])out+=rect(x,31,8,32,p.path)+rect(x-6,22,20,19,p.accent,p.dark);}
 else if(g.mechanic==='quiz'){out=rect(0,0,360,560,p.light)+blocks(p,560,1)+rect(19,65,322,429,p.bg,p.ink,3);out+=rect(0,0,360,42,p.dark);for(let i=0;i<6;i++)out+=rect(24+i*54,15,29,5,p.path);}
 else {out=tabletop(p);if(['wardrobe','shop'].includes(g.mechanic)){out+=rect(0,31,360,17,p.dark)+rect(0,502,360,19,p.dark);for(let x=15;x<360;x+=61)out+=rect(x,1,31,30,p.light,p.edge,2);}if(g.mechanic==='journal')out+=rect(14,70,5,420,p.dark)+line(38,89,322,89,p.edge);if(g.mechanic==='deck')out=tiles(p,48)+rect(20,65,320,434,'#718579',p.dark,4)+rect(30,75,300,414,'#A8B397',p.dark,2);}
 if(k==='rune-circuit'){for(let x=40;x<340;x+=40)out+=rect(x,45,8,20,p.dark)+rect(x,486,8,23,p.dark);out+=line(44,54,324,54,p.dark,3)+line(44,501,324,501,p.dark,3);}
 if(k==='prism-match'){for(const[x,y]of[[32,35],[328,35],[32,522],[328,522]])out+=poly(`${x},${y-10} ${x+9},${y} ${x},${y+10} ${x-9},${y}`,p.dark);}
 if(k==='idiom-detective'){for(let i=0;i<7;i++)out+=rect(19+i*44,25,34,22,i%2?p.dark:p.edge)+line(24+i*44,33,47+i*44,33,p.light,2);out+=rect(285,507,44,8,p.dark)+rect(302,501,10,12,p.ink);}
 if(k==='studio-wardrobe'){out+=rect(5,129,6,276,p.dark)+rect(349,129,6,276,p.dark);for(let y=137;y<397;y+=20)out+=rect(6,y,4,8,p.light)+rect(350,y,4,8,p.light);}
 if(k==='puppet-studio'){for(let y=106;y<466;y+=27)out+=rect(6,y,5,10,p.light)+rect(349,y,5,10,p.light);}
 return out;
}

const spriteSources = new Set();
function sprite(key,x,y,w=64,h=w){const f=path.join(OUT,'sprites',`${key}.svg`);if(fs.existsSync(f)){const data=fs.readFileSync(f,'utf8');const tag=data.match(/<svg\b[^>]*>/);const vb=tag?.[0].match(/viewBox=["']([^"']+)["']/)?.[1]||'0 0 64 64';const [vx,vy,vw,vh]=vb.split(/[ ,]+/).map(Number);const s=Math.min(w/vw,h/vh);spriteSources.add(key);return `<g transform="translate(${x+(w-vw*s)/2} ${y+(h-vh*s)/2}) scale(${s}) translate(${-vx} ${-vy})">${data.slice(data.indexOf('>',tag.index)+1,data.lastIndexOf('</svg>'))}</g>`;}
 throw new Error(`Missing original sprite: ${key}. Build classic sprites before classic scenes.`);}
function board(g,cols=5,rows=5,keys=['green_apple','pear','red_apple']){const p=P[g.palette],size=cols>4?53:64,gap=5,w=cols*(size+gap)-gap,h=rows*(size+gap)-gap,x=(360-w)/2,y=(560-h)/2;let out=rect(x-9,y-9,w+18,h+18,p.dark)+rect(x-5,y-5,w+10,h+10,p.path);for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){let xx=x+col*(size+gap),yy=y+row*(size+gap);out+=rect(xx,yy,size,size,p.light,p.edge,2)+sprite(keys[(row*3+col*2+hash(g.key))%keys.length],xx+4,yy+4,size-8);}return out;}
function cover(g){const p=P[g.palette];let out=scene(g),m=g.mechanic;
 if(m==='merge'||m==='match')out+=board(g,5,5,m==='merge'?['green_apple','pear','red_apple','orange','plum']:['emerald','ruby','sapphire','amethyst']);
 else if(m==='shooter'){for(let r=0;r<3;r++)for(let c=0;c<4;c++)out+=sprite(r%2?'enemy_ship':'drone',39+c*74,100+r*65,55,51);for(let c=0;c<3;c++)out+=sprite('bullet',160+c*10,318-c*44,12,25);out+=sprite('spacecraft',139,432,82,82);}
 else if(m==='mower'){for(const[x,y]of[[54,153],[214,132],[270,262],[74,393],[246,436],[29,281]])out+=sprite('spore',x,y,40);out+=sprite('mower',142,269,82);out+=line(182,358,182,405,p.accent,4)+line(124,312,80,312,p.path,4);}
 else if(m==='runner'){for(let i=0;i<4;i++)out+=sprite(i%2?'roadblock':'energy',58+(i%3)*91,113+i*80,i%2?54:34);out+=sprite('runner',151,423,61,80);}
 else if(m==='drift'){for(let i=0;i<3;i++)out+=sprite('roadblock',94+(i%2)*125,130+i*114,38);out+=sprite('car',141,390,78,111);}
 else if(m==='cups'){for(let i=0;i<3;i++)out+=sprite('cup',40+i*101,234,82,108);out+=sprite(g.key==='red-cup-shuffle'?'ruby':'star',62,365,34);out+=line(89,203,276,203,p.dark,3)+poly('267,195 280,203 267,211',p.dark);}
 else if(m==='builder'||m==='garden'){out+=board(g,4,5,['tree','flower','house','tree','green_apple','flower']);out+=rect(173,112,12,337,'#5F95A1')+rect(54,266,252,12,'#5F95A1');}
 else if(m==='maze'){const x=40,y=105,s=40;for(let r=0;r<9;r++)for(let c=0;c<7;c++){const wall=r===0||r===8||c===0||c===6||(r%2===0&&c!==5-r%3);out+=rect(x+c*s,y+r*s,s-2,s-2,wall?p.dark:p.light);if(wall)out+=rect(x+c*s+4,y+r*s+4,s-10,6,p.bg);}out+=sprite('cat',80,142,34,40)+sprite('key',238,392,34);}
 else if(m==='fishing'){out+=line(177,115,177,338,p.light,3)+sprite('hook',161,330,43,52);for(let i=0;i<5;i++)out+=sprite(i===3?'predator_fish':'fish',37+(i%3)*102,164+i*63,62,46);}
 else if(m==='io'){out+=sprite('microbe',133,224,103);for(const[x,y,s]of[[39,136,38],[258,128,48],[66,405,36],[265,385,36],[120,100,23]])out+=sprite('microbe_enemy',x,y,s);for(const[x,y]of[[70,287],[248,230],[190,430],[117,359]])out+=sprite('spore',x,y,22);}
 else if(m==='battle'||m==='deck'){out+=sprite('sentinel',204,105,92,126)+sprite('hero',65,238,102,146);out+=rect(196,245,106,8,p.dark)+rect(198,247,72,4,'#BE6150');for(let i=0;i<3;i++){out+=rect(39+i*97,403,88,113,p.light,p.ink,3)+sprite(['sword','shield','potion'][i],51+i*97,421,62);out+=rect(50+i*97,492,62,4,p.dark);} }
 else if(m==='defense'&&g.key==='crystal-bastion'){
  for(const[x,y,key]of[[72,220,'cannon'],[180,375,'turret'],[288,220,'cannon']])out+=circle(x+3,y+10,25,'#A9A57D')+sprite(key,x-29,y-34,58,66);
  for(const[x,y]of[[72,138],[180,172],[288,130],[288,294]])out+=sprite('raider',x-20,y-26,40,51);
  out+=line(73,186,73,176,'#A8D8D5',3)+circle(73,173,4,'#E4F5D8')+line(180,336,180,317,'#85BBC1',3)+circle(180,312,4,'#D9ECE0');
 }
 else if(m==='defense'){for(let row=0;row<3;row++){out+=rect(25,144+row*113,309,12,p.dark)+rect(26,148+row*113,307,4,p.light);out+=sprite(row%2?'turret':'cannon',50,107+row*113,64);out+=sprite('raider',213+(row%2)*48,111+row*113,52,65);}out+=sprite('crystal',272,452,47,66);}
 else if(m==='hex'){const s=32;for(let r=0;r<6;r++)for(let c=0;c<4;c++){const x=58+c*70+(r%2)*35,y=118+r*55;out+=poly(`${x},${y-s} ${x+30},${y-s/2} ${x+30},${y+s/2} ${x},${y+s} ${x-30},${y+s/2} ${x-30},${y-s/2}`,r%3===0?p.edge:p.light,p.dark,2);if((r+c)%4===0)out+=sprite((r+c)%3?'guardian':'raider',x-21,y-27,42,50);}}
 else if(m==='sequencer'||m==='rhythm'||m==='sequence'){const cols=m==='sequence'?2:4,rows=m==='sequence'?2:6;for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const w=cols===2?112:57,h=cols===2?115:42,x=(360-cols*(w+8)+8)/2+c*(w+8),y=127+r*(h+8);out+=rect(x,y,w,h,(r+c)%3===0?p.accent:p.path,p.ink,3);if(m==='sequence')out+=sprite(['plush','cat','kitten','plush'][r*2+c],x+22,y+23,68);else if((r+c)%3===0)out+=sprite('star',x+(w-30)/2,y+(h-30)/2,30);} }
 else if(m==='shop'){for(let i=0;i<3;i++){out+=rect(38+i*98,137,87,108,p.light,p.dark,3)+sprite(g.key==='moonlight-tea-shop'?['tea','coffee','cup'][i]:['plush','parcel','star'][i],49+i*98,155,63);}out+=rect(34,302,292,124,p.path,p.dark,3)+sprite(g.key==='moonlight-tea-shop'?'cup':'parcel',138,302,85,103);out+=rect(37,442,285,15,p.dark);}
 else if(m==='wardrobe'){out+=rect(119,99,122,247,p.light,p.dark,3)+sprite(g.key==='puppet-studio'?'plush':'model',133,144,96,157);for(let i=0;i<3;i++)out+=rect(47+i*94,378,80,89,p.light,p.dark,2)+sprite(['dress','shoes','hat'][i],57+i*94,391,61);}
 else if(m==='sort'){for(let i=0;i<3;i++){out+=rect(29+i*107,367,89,93,['#A87256','#5C8D7D','#617A9A'][i],p.ink,3)+rect(41+i*107,382,64,9,p.ink);out+=sprite('letter',52+i*92,137+i*42,54);} }
 else if(m==='coin'){for(let i=0;i<4;i++)out+=circle(89+(i%2)*179,153+i*76,25,'none',p.dark,9)+circle(89+(i%2)*179,153+i*76,25,'none',p.accent,5);out+=sprite('star',147,430,63);}
 else if(m==='stack'){for(let r=0;r<8;r++)out+=rect(83+r*7,459-r*32,197-r*14,28,r%2?p.dark:p.path,p.ink,2);out+=rect(136,140,144,25,p.accent,p.ink,2);}
 else if(m==='circuit'){for(let r=0;r<4;r++)for(let c=0;c<4;c++){const x=46+c*68,y=149+r*68;out+=rect(x,y,62,62,p.light,p.dark,2)+line(x+31,y+1,x+31,y+32,p.dark,9)+line(x+31,y+32,x+61,y+32,p.dark,9)+circle(x+31,y+32,7,p.accent);} }
 else if(m==='journal'){out+=`<polyline points="82,112 139,143 113,236 248,285 198,394 275,452" fill="none" stroke="${p.dark}" stroke-width="6"/>`;for(const[x,y,key]of[[51,76,'tent'],[81,211,'tree'],[220,254,'house'],[168,363,'guardian'],[243,429,'treasure']])out+=sprite(key,x,y,65);}
 else if(m==='idiom'){out+=rect(38,125,284,229,p.light,p.dark,3)+sprite('tree',65,147,88,142)+sprite('flower',204,183,79,89);for(let i=0;i<4;i++)out+=rect(39+i*73,395,63,63,p.light,p.dark,3)+sprite(['scroll','key','star','treasure'][i],47+i*73,403,47);}
 else if(m==='quiz'){out+=rect(43,121,274,214,p.dark,p.ink,3)+rect(51,129,258,192,p.light)+sprite('shield',141,163,79,103);for(let i=0;i<2;i++)out+=rect(44+i*143,382,129,73,i?p.accent:p.light,p.ink,3)+sprite(i?'key':'shield',87+i*143,396,42);}
 return svg(out);
}

for(const dir of[OUT,MOBILE])for(const sub of['scenes','covers'])fs.mkdirSync(path.join(dir,sub),{recursive:true});
const entries=[];
for(const game of GAMES){const sceneData=svg(scene(game)),coverData=cover(game),files={};for(const[kind,data]of[['scene',sceneData],['cover',coverData]]){const relative=`${kind==='scene'?'scenes':'covers'}/${game.key}.svg`;for(const target of[OUT,MOBILE])fs.writeFileSync(path.join(target,relative),data);files[kind]={path:`/assets/games/classic-v1/${relative}`,width:360,height:560,bytes:Buffer.byteLength(data),sha256:crypto.createHash('sha256').update(data).digest('hex')};}entries.push({...game,source_authoring:'code-authored',license:'Original project artwork; no third-party art inputs',palette_colors:P[game.palette],...files});}
const assets=entries.map(entry=>{const legacy=LEGACY_CATALOG.get(entry.key);if(!legacy)throw new Error(`Missing game catalog entry: ${entry.key}`);return {asset_id:`asset_classic_v1_${entry.key}`,game_key:entry.key,content_id:legacy.content_id,title:legacy.title,mechanic:legacy.mechanic,runtime:legacy.runtime,family:entry.family,palette:entry.palette,motif:entry.motif,role:'dedicated_gameplay_scene',owner:'Airvana local demo owner',source_authoring:'code-authored',source_generator:'scripts/build-classic-scenes-v1.mjs',license:'Original project artwork; no third-party art inputs',provenance:'Original SVG geometry authored in source code; no raster or generative image inputs',authorization_status:'local_preview_user_requested',locale:'language-neutral',version:'1.0.0',release_approved:false,source:{path:'scripts/build-classic-scenes-v1.mjs',format:'javascript'},runtime_asset:{...entry.scene,path:`public${entry.scene.path}`,format:'svg'},cover_asset:{...entry.cover,path:`public${entry.cover.path}`,format:'svg'},flutter_asset:`apps/airvana_mobile/assets/runner${entry.scene.path}`};});
const manifest={schema:'airvana.game-art-manifest.v2',version:'1.0.0',status:'LOCAL_DEMO',source_authoring:'code-authored',source_generator:'scripts/build-classic-scenes-v1.mjs',asset_count:76,game_count:38,reference_policy:'Original drawings informed by classic arcade, 16-bit strategy, puzzle-board and tabletop design conventions; no copied characters or assets.',raster_inputs:0,ai_image_inputs:0,visual_rules:['limited palette','solid fills','hard-edged shade shapes','readable gameplay area','no gradient','no glow','no filter','no baked text'],cover_sprite_keys:[...spriteSources].sort(),assets,games:entries};
const manifestData=JSON.stringify(manifest,null,2)+'\n';for(const target of[OUT,MOBILE])fs.writeFileSync(path.join(target,'manifest.json'),manifestData);
const preview='<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Original Classic Game Art QA</title><style>body{margin:0;background:#ece7dc;color:#273b3b;font:12px system-ui;padding:18px}header{margin-bottom:14px;display:flex;gap:15px;align-items:center}a{color:inherit}main{display:grid;grid-template-columns:repeat(4,180px);gap:12px}figure{margin:0}img{width:180px;height:280px;display:block;border:1px solid #b4b8ac}figcaption{padding:7px 0;max-width:180px;overflow:hidden;white-space:nowrap}b{font-size:15px}</style></head><body><header><b>Classic / original vector art</b><nav><a href="?page=0&kind=covers">Covers</a> · <a href="?page=0&kind=scenes">Scenes</a></nav><span id="pages"></span></header><main id="grid"></main><script>const games='+JSON.stringify(entries.map(e=>({key:e.key,motif:e.motif})))+';const p=new URLSearchParams(location.search),kind=p.get("kind")==="scenes"?"scenes":"covers",page=Math.max(0,Math.min(4,Number(p.get("page"))||0));document.querySelector("#pages").innerHTML=Array.from({length:5},(_,i)=>`<a href="?page=${i}&kind=${kind}">${i+1}</a>`).join(" · ");document.querySelector("#grid").innerHTML=games.slice(page*8,page*8+8).map(g=>`<figure><img src="${kind}/${g.key}.svg" alt="${g.key}"><figcaption>${g.key}</figcaption></figure>`).join("");</script></body></html>';
// Static pages work under the application's strict no-inline-script CSP.
for(const kind of ['covers','scenes'])for(let page=0;page<5;page++){
 const controls=`<span>${Array.from({length:5},(_,i)=>`<a href="preview-${kind}-${i}.html">${i+1}</a>`).join(' · ')}</span>`;
 const grid=entries.slice(page*8,page*8+8).map(g=>`<figure><img src="${kind}/${g.key}.svg" alt="${g.key}"><figcaption>${g.key}</figcaption></figure>`).join('');
 const staticPreview=preview.slice(0,preview.indexOf('<script>')).replace('?page=0&kind=covers','preview-covers-0.html').replace('?page=0&kind=scenes','preview-scenes-0.html').replace('<span id="pages"></span>',controls).replace('<main id="grid"></main>',`<main>${grid}</main>`)+'</body></html>';
 fs.writeFileSync(path.join(OUT,`preview-${kind}-${page}.html`),staticPreview);
 if(kind==='covers'&&page===0)fs.writeFileSync(path.join(OUT,'preview.html'),staticPreview);
}
console.log(JSON.stringify({game_count:entries.length,asset_count:entries.length*2,cover_sprite_count:spriteSources.size,output:OUT,mobile:MOBILE}));
