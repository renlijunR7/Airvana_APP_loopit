const REFERENCE_SCALE=750/640;
const IMAGE_BASE='assets/';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export class BattleRenderer {
 constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.images={};this.tints=new Map();this.loading=new Map();this.used=new Map();this.pinned=new Set();this.reset();this.resize();}
 reset(){this.attackTimes=new Map();this.positions=new Map();this.effects=new Map();this.seenEffects=new Set();this.construction=new Map();}
 attack(id,time){this.attackTimes.set(id,time);}
 resize(){const r=this.canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);this.canvas.width=Math.round(r.width*d);this.canvas.height=Math.round(r.height*d);}
 async load(onProgress=()=>{}){
  onProgress(0);
  const read=async path=>{const r=await fetch(IMAGE_BASE+path);if(!r.ok)throw Error(`Missing asset manifest: ${path}`);return r.json();};
  [this.manifest,this.fx,this.effectConfig]=await Promise.all([read('sprites/manifest.json'),read('fx/manifest.json'),read('fx/effect-config.json')]);
  onProgress(.06);
  const urls=new Set(['map_9991.png','map_9992.png','map_9993.png']);
  const walk=(node,base)=>{if(!node||typeof node!=='object')return;if(node.file)urls.add(base+node.file);for(const value of Object.values(node))if(typeof value==='object')walk(value,base);};
  for(const [key,meta] of Object.entries(this.manifest))urls.add('sprites/'+(meta.file||key+'.png'));
  for(const group of ['projectiles','animations','static'])walk(this.fx[group],'fx/');
  for(const name of ['Battle_End','Battle_EnemyPosition_Bg','Battle_EnemyPosition_Icon','Battle_EnemyPosition_Arrow','range_circle_attack','range_circle_skill','range_circle_position','enemy_shadow','hp_bg_role','hp_normal','hp_self','move_lightring'])urls.add(`ui/${name}.png`);
  this.pinned=urls;let loaded=0;
  await Promise.all([...urls].map(async path=>{const img=await this.loadImage(path);await img.decode();onProgress(.06+.94*(++loaded/urls.size));}));
 }
 loadImage(path){if(this.images[path])return Promise.resolve(this.images[path]);if(this.loading.has(path))return this.loading.get(path);const task=new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{this.images[path]=img;this.used.set(path,performance.now());this.loading.delete(path);this.trimCache();resolve(img);};img.onerror=()=>{this.canvas.dataset.assetError=path;reject(Error('Missing image: '+path));};img.src=IMAGE_BASE+path;});this.loading.set(path,task);return task;}
 ensure(path){this.used.set(path,performance.now());if(!this.images[path]&&!this.loading.has(path))this.loadImage(path).catch(error=>console.error(error));return this.images[path];}
 trimCache(){let pixels=Object.entries(this.images).reduce((n,[p,i])=>n+(this.pinned.has(p)?0:i.width*i.height),0);if(pixels<20000000)return;const now=performance.now();for(const [path,last] of [...this.used.entries()].sort((a,b)=>a[1]-b[1])){if(this.pinned.has(path)||now-last<2500)continue;const img=this.images[path];if(!img)continue;pixels-=img.width*img.height;delete this.images[path];this.used.delete(path);if(pixels<16000000)break;}}

 image(c,path,x,y,w,h,alpha=1){const img=this.images[path];if(!img)return;c.save();c.globalAlpha*=alpha;c.drawImage(img,x-w/2,y-h/2,w,h);c.restore();}
 draw(s,time,selected=-1,target=null){
  const c=this.ctx;c.setTransform(this.canvas.width/750,0,0,this.canvas.height/1334,0,0);c.clearRect(0,0,750,1334);
  c.drawImage(this.images[`map_999${s.level+1}.png`],-23.4375,-242.375,796.875,1818.75);
  const end=s.levelConfig.path.at(-1);if(end&&end.y<1320)this.image(c,'ui/Battle_End.png',end.x,end.y,72*REFERENCE_SCALE,72*REFERENCE_SCALE,.6);
  if(s.status==='ready'||s.status==='between'){const p=s.levelConfig.path[0];this.image(c,'ui/Battle_EnemyPosition_Bg.png',p.x,145,53*REFERENCE_SCALE,52*REFERENCE_SCALE);this.image(c,'ui/Battle_EnemyPosition_Icon.png',p.x,145,38*REFERENCE_SCALE,38*REFERENCE_SCALE);this.image(c,'ui/Battle_EnemyPosition_Arrow.png',p.x,105,17*REFERENCE_SCALE,22*REFERENCE_SCALE);}
  const selectedTower=s.towers.find(t=>t.slotIndex===selected);if(selectedTower)this.image(c,selectedTower.type==='barracks'?'ui/range_circle_position.png':'ui/range_circle_attack.png',selectedTower.x,selectedTower.y,selectedTower.range*2,selectedTower.range*2*301/364);
  const units=[...s.towers.map(u=>({...u,kind:'tower'})),...s.soldiers.map(u=>({...u,kind:'soldier'})),...s.enemies.map(u=>({...u,kind:'enemy'}))].sort((a,b)=>a.y-b.y);
  this.entities=new Map(units.map(u=>[u.id,u]));
  for(const u of units){if(u.hp<=0)continue;if(u.kind==='tower')this.tower(c,u,s.time,time);else this.unit(c,u,s.time);}
  for(const p of s.projectiles)this.projectile(c,p);
  for(const e of s.effects){if(this.seenEffects.has(e.id))continue;this.seenEffects.add(e.id);const duration=e.type==='fire'?e.maxTtl:e.type==='explosion'?1.5:e.type==='hit'||e.type==='slash'?.45:e.type==='death'?(this.manifest[e.spriteType]?.death?.duration||.5):.75;this.effects.set(e.id,{...e,start:s.time-(e.age||0),duration,particles:e.element==='magic'?this.smokeParticles(e.id,this.effectConfig.particleParameters.tower_bullet02_hit_smoke):null});}
  for(const [id,e] of this.effects){const age=s.time-e.start;if(age>e.duration){this.effects.delete(id);continue;}this.effect(c,e,age);}
  if(target){const x=target.x??375,y=target.y??670,r=target.type==='fire'?150:85;this.image(c,'ui/range_circle_skill.png',x,y,r*2,r*2);}
  for(const u of units)this.positions.set(u.id,{x:u.x,y:u.y});
 }
 direction(u){const target=this.entities.get(u.target||u.targetId||u.blockedBy),previous=this.positions.get(u.id);let dx=target?target.x-u.x:previous?u.x-previous.x:0,dy=target?target.y-u.y:previous?u.y-previous.y:0;if(Math.abs(dx)+Math.abs(dy)<.01)return u.kind==='tower'?'down':u.facing<0?'left':'right';return Math.abs(dy)>Math.abs(dx)*1.4?(dy<0?'up':'down'):(dx<0?'left':'right');}
 pose(c,key,u,time,animation=null){
  const meta=this.manifest[key];if(!meta)return;
  const direction=this.direction(u),directional=meta.directions?.[direction]||meta;let source=directional;
  const clip=animation&&(directional[animation.name]||meta[animation.name]);if(clip?.file)source=clip;
  const path='sprites/'+(source.file||meta.file||key+'.png');let im=this.ensure(path);if(!im){source=directional;im=this.ensure('sprites/'+(source.file||meta.file||key+'.png'));if(!im){source=meta;im=this.images['sprites/'+(meta.file||key+'.png')];}}if(!im)return;
  const fw=source.frameWidth||source.width||im.width,fh=source.frameHeight||source.height||im.height;
  const count=source.frames||1,phase=animation?.phase||0;
  const frame=count>1?clamp((source.loop===false?Math.floor((animation?.time??time)*(source.fps||count/source.duration)+phase):Math.floor((animation?.time??time)*(source.fps||count/source.duration)+phase)%count),0,count-1):0;
  const origin=source.origin||directional.origin||meta.origin||[fw/2,fh];
  const native=meta.nativeScale??.36,scale=native*REFERENCE_SCALE;
  const flip=direction==='left'&&!meta.directions?.left;
  c.save();c.translate(u.x,u.y);if(flip)c.scale(-1,1);c.drawImage(im,frame*fw,0,fw,fh,-origin[0]*scale,-origin[1]*scale,fw*scale,fh*scale);c.restore();
 }
 tower(c,u,time,visualTime=time){const key=u.type+(u.level>1?'-'+u.level:'');const meta=this.manifest[key];if(!meta)return;
  let creation=this.construction.get(u.id);if(!creation||creation.level!==u.level){creation={level:u.level,name:creation?'upgrade':'build',start:visualTime,particles:this.smokeParticles(u.id)};this.construction.set(u.id,creation);}
  const direction=this.direction(u),directional=meta.directions?.[direction]||meta;
  const elapsed=time-(this.attackTimes.get(u.id)??-100),shoot=directional.shoot||meta.shoot,build=directional[creation.name]||meta[creation.name],buildAge=visualTime-creation.start;
  let animation=shoot&&elapsed>=0&&elapsed<shoot.duration?{name:'shoot',time:elapsed}:null;
  if(build&&buildAge<build.duration)animation={name:creation.name,time:buildAge};
  this.pose(c,key,u,time,animation);if(buildAge<1)this.smoke(c,u.x,u.y,buildAge,creation.particles);
 }
 smokeParticles(id,p=this.effectConfig.particleParameters.tower_build_smoke){let seed=0;for(const ch of id)seed=(Math.imul(seed,31)+ch.charCodeAt(0))>>>0;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},vary=(v,r)=>v+(random()*2-1)*r;
  return Array.from({length:Math.min(p.maxParticles,Math.round(p.emissionRate*p.duration))},(_,i)=>{const angle=vary(p.angle,p.angleVariance)*Math.PI/180,life=Math.max(.01,vary(p.particleLifespan,p.particleLifespanVariance)),endSize=Math.max(0,vary(p.finishParticleSize,p.finishParticleSizeVariance));let x=vary(0,p.sourcePositionVariancex),y=vary(0,p.sourcePositionVariancey),vx=Math.cos(angle)*p.speed,vy=Math.sin(angle)*p.speed;const radial=vary(p.radialAcceleration,p.radialAccelVariance),tangent=vary(p.tangentialAcceleration,p.tangentialAccelVariance),points=[];
   for(let t=0;t<=life+1/60;t+=1/60){points.push([x,-y]);const length=Math.hypot(x,y)||1,rx=x/length,ry=y/length;vx+=(rx*radial-ry*tangent+p.gravityx)/60;vy+=(ry*radial+rx*tangent+p.gravityy)/60;x+=vx/60;y+=vy/60;}
   return {birth:i/p.emissionRate,life,startSize:p.startParticleSize,endSize,points,spinStart:p.rotationStart||0,spinEnd:vary(p.rotationEnd||0,p.rotationEndVariance||0),startColor:[p.startColorRed,p.startColorGreen,p.startColorBlue],endColor:[p.finishColorRed,p.finishColorGreen,p.finishColorBlue]};});
 }
 smoke(c,x,y,age,particles,texture='tower-build-smoke'){const img=this.images['fx/'+texture+'.png'];if(!img)return;for(const p of particles){const t=age-p.birth;if(t<0||t>p.life)continue;const f=t/p.life,[dx,dy]=p.points[Math.min(p.points.length-1,Math.floor(t*60))],size=(p.startSize+(p.endSize-p.startSize)*f)*REFERENCE_SCALE;if(size<=0)continue;c.save();c.translate(x+dx*REFERENCE_SCALE,y+dy*REFERENCE_SCALE);c.rotate((p.spinStart+(p.spinEnd-p.spinStart)*f)*Math.PI/180);c.globalAlpha=1-f;let art=img;if(texture!=='tower-build-smoke'){const step=Math.round(f*12),key=texture+'-'+step;if(!this.tints.has(key)){const tint=document.createElement('canvas');tint.width=img.width;tint.height=img.height;const tc=tint.getContext('2d');tc.drawImage(img,0,0);tc.globalCompositeOperation='source-in';tc.fillStyle=`rgb(${p.startColor.map((v,i)=>Math.round((v+(p.endColor[i]-v)*step/12)*255)).join(',')})`;tc.fillRect(0,0,tint.width,tint.height);this.tints.set(key,tint);}art=this.tints.get(key);}c.drawImage(art,-size/2,-size/2,size,size);c.restore();}}

 unit(c,u,time){const key=u.kind==='soldier'?'soldier'+(u.level>1?'-'+u.level:''):u.type;const meta=this.manifest[key];if(!meta)return;const moving=typeof u.moving==='boolean'?u.moving:!u.blockedBy&&!u.target;let hash=0;for(const char of String(u.id))hash=(Math.imul(hash,31)+char.charCodeAt(0))>>>0;
  if(!meta.includesShadow)this.image(c,'ui/enemy_shadow.png',u.x,u.y,32*REFERENCE_SCALE,25.92*REFERENCE_SCALE);
  const attack=!moving&&(u.target||u.blockedBy)&&(meta.attack||meta.directions?.[this.direction(u)]?.attack);
  this.pose(c,key,u,time,moving?{name:'walk',time,phase:hash%6}:attack?{name:'attack',time:(time+hash%5*.05)%(u.interval||.7)}:null);
  if(u.hp<u.maxHp){const x=u.x,y=u.y-(meta.healthBarOffset||47)*REFERENCE_SCALE,w=38*REFERENCE_SCALE,h=9*REFERENCE_SCALE;this.image(c,'ui/hp_bg_role.png',x,y,w,h);const fill=this.images[u.kind==='soldier'?'ui/hp_self.png':'ui/hp_normal.png'];const ratio=clamp(u.hp/u.maxHp,0,1);if(fill&&ratio>0)c.drawImage(fill,0,0,fill.width*ratio,fill.height,x-w/2,y-h/2,w*ratio,h);}
 }
 projectile(c,p){const key=(p.type==='shell'?'cannon':p.type)+'-'+p.level,meta=this.fx.projectiles[key],im=meta&&this.images['fx/'+meta.file];if(!im)return;const angle=p.angle??Math.atan2(p.targetY-p.y,p.targetX-p.x),scale=meta.originalIconBaseScale*REFERENCE_SCALE;c.save();c.translate(p.x,p.y);if(p.type==='arrow')c.rotate(angle);else if(p.type==='shell')c.rotate(p.age*5);c.drawImage(im,-im.width*scale/2,-im.height*scale/2,im.width*scale,im.height*scale);c.restore();}
 curve(keys,time,initial=255){if(!keys?.length)return initial;if(time<=keys[0].frame)return keys[0].value;for(let i=1;i<keys.length;i++){if(time<=keys[i].frame){const a=keys[i-1],b=keys[i],f=(time-a.frame)/(b.frame-a.frame);return a.value+(b.value-a.value)*f;}}return keys.at(-1).value;}
 sequence(c,name,x,y,age,scale=1,instance=null){const meta=this.fx.animations[name],im=meta&&this.images['fx/'+meta.file];if(!im)return;const times=meta.effectiveFrameTimes;let frame=times?times.findLastIndex(t=>t<=age):Math.floor(age*(meta.effectiveFps||meta.fps));if(frame<0||age>meta.effectiveDuration)return;frame=Math.min(meta.frames-1,frame);const node=instance||meta.referenceNode,opacity=this.curve(meta.originalNodeCurves?.opacity,age*(meta.clipSpeed||1))/255;if(opacity<=0)return;const [nw,nh]=node?.referenceRenderSize||meta.referenceRenderSize||[meta.frameWidth,meta.frameHeight],pos=node?.positionCanvas||[0,0],a=node?.anchor||meta.anchor||[.5,.5],unit=REFERENCE_SCALE*scale,w=nw*unit,h=nh*unit;c.save();c.globalAlpha*=opacity;c.globalCompositeOperation=node?.blend||'source-over';c.drawImage(im,frame*meta.frameWidth,0,meta.frameWidth,meta.frameHeight,x+pos[0]*unit-w*a[0],y+pos[1]*unit-h*a[1],w,h);c.restore();}
 effect(c,e,age){
  if(e.type==='fire'){const phase=age%1.05,fade=clamp((e.duration-age)*3,0,1);this.image(c,'fx/lightning-ground-bg.png',e.x,e.y,300,180,.45*fade);this.image(c,'fx/lightning-ground-rune.png',e.x,e.y,290,170,.7*fade);for(const name of ['lightning-strip','lightning-hit-strip'])for(const node of this.fx.animations[name].referenceInstances||[])this.sequence(c,name,e.x,e.y,phase,1,node);}
  else if(e.type==='explosion'){this.image(c,'fx/cannon-scorch.png',e.x,e.y,112,80,clamp(1-age/1.5,0,1));this.sequence(c,'cannon-hit-strip',e.x,e.y,age,.9);}
  else if(e.type==='hit'||e.type==='slash'){if(e.element==='magic'){this.smoke(c,e.x,e.y-18,age,e.particles,'magic-smoke');}else this.sequence(c,'arrow-hit-strip',e.x,e.y-15,age,.5);}
  else if(e.type==='death'&&e.spriteType){this.pose(c,e.spriteType,{...e,kind:'dead'},age,{name:'death',time:age});}
 }
}
