import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {inflateSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const spriteRoot=path.join(root,'public/assets/games/casual-v1/sprites');
const mirrorRoot=path.join(root,'apps/airvana_mobile/assets/runner/assets/games/casual-v1/sprites');
const manifest=JSON.parse(fs.readFileSync(path.join(spriteRoot,'manifest.json'),'utf8'));
// The inactive generated pack remains a byte-preserved archive, not an active loader.
const source=fs.readFileSync(path.join(root,'public/assets/games/casual-v1/playable-assets-v3.js'),'utf8');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');

function decodePng(bytes) {
  assert.equal(bytes.subarray(1,4).toString(),'PNG');
  const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
  assert.equal(bytes[24],8,'8-bit channels');assert.equal(bytes[25],6,'genuine RGBA, not an RGB transparency mockup');
  assert.equal(bytes[28],0,'non-interlaced deterministic import');
  const chunks=[];let offset=8;
  while(offset<bytes.length){const length=bytes.readUInt32BE(offset),type=bytes.subarray(offset+4,offset+8).toString();if(type==='IDAT')chunks.push(bytes.subarray(offset+8,offset+8+length));offset+=length+12;}
  const raw=inflateSync(Buffer.concat(chunks)),pixels=Buffer.alloc(width*height*4),stride=width*4;
  function paeth(a,b,c){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;}
  for(let y=0;y<height;y++){
    const filter=raw[y*(stride+1)];assert.ok(filter>=0&&filter<=4);
    for(let x=0;x<stride;x++){
      const a=x>=4?pixels[y*stride+x-4]:0,b=y?pixels[(y-1)*stride+x]:0,c=x>=4&&y?pixels[(y-1)*stride+x-4]:0;
      const predictor=filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):paeth(a,b,c);
      pixels[y*stride+x]=(raw[y*(stride+1)+x+1]+predictor)&255;
    }
  }
  return {width,height,pixels};
}

test('64 polished casual gameplay PNGs have real clean alpha, uncut padding, checksums and byte-identical Flutter mirrors',()=>{
  assert.equal(manifest.pack,'casual-v1');assert.equal(manifest.version,'5.0.0');assert.equal(manifest.assets.length,64);
  assert.equal(manifest.source_assets.length,4);assert.match(manifest.processing,/chroma-key background/);
  const names=fs.readdirSync(spriteRoot).filter(name=>name.endsWith('.png')).sort();
  assert.deepEqual(names,manifest.assets.map(asset=>asset.file).sort());
  for(const asset of manifest.assets){
    const bytes=fs.readFileSync(path.join(spriteRoot,asset.file)),{width,height,pixels}=decodePng(bytes);
    assert.equal(hash(bytes),asset.sha256,asset.asset_id);assert.equal(bytes.length,asset.bytes);
    assert.equal(width,asset.width);assert.equal(height,asset.height);assert.ok(width>=100&&height>=100);
    assert.deepEqual(bytes,fs.readFileSync(path.join(mirrorRoot,asset.file)),asset.asset_id);
    let transparent=0,opaque=0,matte=0,borderMax=0;
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const offset=(y*width+x)*4,[r,g,b,a]=pixels.subarray(offset,offset+4);
      if(a===0){transparent++;assert.equal(r+g+b,0,asset.asset_id+' invisible matte RGB normalized');}
      if(a===255)opaque++;
      if(a>200&&r>200&&g<35&&b>200)matte++;
      if(x===0||y===0||x===width-1||y===height-1)borderMax=Math.max(borderMax,a);
    }
    assert.ok(transparent>width*height*0.05,asset.asset_id+' genuine transparent area');
    assert.ok(opaque>width*height*0.15,asset.asset_id+' substantial opaque subject');
    assert.equal(matte,0,asset.asset_id+' no opaque magenta residue');
    assert.ok(borderMax<=8,asset.asset_id+' complete subject does not touch crop edge');
    if(['green_apple','pear','red_apple','orange','plum','golden_fruit','emerald','ruby','sapphire','amethyst'].includes(asset.asset_id)){
      const alpha=pixels[(Math.floor(height*.55)*width+Math.floor(width*.5))*4+3];
      assert.equal(alpha,255,asset.asset_id+' center is not mistakenly keyed out');
    }
  }
});

test('all four source mattes, original attempts and complete prompts remain preserved with verifiable provenance',()=>{
  for(const record of manifest.source_assets){
    const bytes=fs.readFileSync(path.join(root,'public/assets/games/casual-v1',record.source_file));
    assert.equal(hash(bytes),record.sha256);assert.ok(record.prompt.includes('STYLE REFERENCE ONLY'));
    assert.ok(record.background_edit_prompt.includes('MAGENTA'));assert.equal(record.alpha_import,'uniform-magenta-key-boundary-unmix');
    for(const previous of record.source_history){
      const original=fs.readFileSync(path.join(root,'public/assets/games/casual-v1',previous.source_file));
      assert.equal(hash(original),previous.sha256);assert.ok(previous.prompt.length>100);
    }
  }
});

function makeRuntime({missing=null,script='http://127.0.0.1:8082/playable-assets-v3.js?v=5.0.0'}={}){
 const requests=[],blocked=new Set(missing?[missing]:[]);
 class LocalImage{set src(value){const file=path.basename(new URL(value).pathname);requests.push(file);if(blocked.has(file)){this.complete=true;this.naturalWidth=0;this.onerror?.();return;}const bytes=fs.readFileSync(path.join(spriteRoot,file));this.naturalWidth=bytes.readUInt32BE(16);this.naturalHeight=bytes.readUInt32BE(20);this.complete=true;this.onload?.();}}
 const window={Image:LocalImage,document:{currentScript:{src:script}}};
 vm.runInNewContext(source,{window,globalThis:window,URL,Promise,Math,Object,Number});
 return {assets:window.AirvanaPlayableAssetsV3,requests,blocked};
}

test('v5 helper loads 64 standalone PNGs, maps all 38 games and preserves full natural aspect ratios',async()=>{
 const {assets,requests}=makeRuntime();assert.equal(await assets.load(),true);
 assert.equal(assets.version,'5.0.0');assert.equal(assets.pack,'casual-v1');assert.equal(assets.ready(),true);
 assert.equal(requests.length,64);assert.equal(new Set(requests).size,64);assert.equal(assets.games().length,38);
 for(const game of assets.games())assert.ok(assets.forGame(game).length>0,game);
 const draws=[],context={globalAlpha:1,save(){},restore(){},translate(){},rotate(){},scale(){},drawImage(...args){draws.push(args);}};
 for(const key of assets.keys()){
   const frame=assets.get(key);assert.equal(frame.format,'png');assert.ok(frame.src.endsWith('/'+key+'.png'));
   assert.equal(assets.css(key).backgroundSize,'contain');assert.equal(assets.css(key).backgroundPosition,'center');
   assert.equal(assets.draw(context,key,{x:10,y:20,w:90,h:100},{rotation:.2,flipX:true,alpha:.7}),true,key);
 }
 assert.equal(draws.length,64);
 for(const [img,x,y,w,h,dx,dy,dw,dh] of draws){assert.deepEqual([x,y,w,h],[0,0,img.naturalWidth,img.naturalHeight]);assert.ok(Math.abs(dw/dh-w/h)<1e-10);assert.ok(dw<=90.00001&&dh<=100.00001);assert.equal(dx,-dw/2);assert.equal(dy,-dh/2);}
 assert.equal(Object.values(assets.snapshot().drawCounts).reduce((n,c)=>n+c,0),64);
 assert.equal(assets.draw(context,'missing-object',{x:0,y:0,w:10,h:10}),false);
 assert.equal(hash(source),'09012351246937a9ea91ce6191fc09e761c53c3f001fb2e3da4f797708099e06','archived casual helper must remain byte-identical to its pre-migration source');
 assert.doesNotMatch(source,/classic-v1|fidelity-v2|playables-v3\/runtime|atlas-v3\.png/);
});

test('missing PNG fails visibly, retries only the absent source and resolves correctly in Flutter file scheme',async()=>{
 const {assets,requests,blocked}=makeRuntime({missing:'hero.png'});assert.equal(await assets.load(),false);assert.equal(assets.ready(),false);assert.match(assets.snapshot().errors.hero,/casual game sprite/);
 blocked.clear();assert.equal(await assets.retry(),true);assert.equal(assets.ready(),true);assert.equal(requests.length,65);
 const mobile=makeRuntime({script:'file:///android_asset/flutter_assets/assets/runner/playable-assets-v3.js'}).assets;await mobile.load();
 assert.equal(mobile.get('tea').src,'file:///android_asset/flutter_assets/assets/runner/assets/games/casual-v1/sprites/tea.png');
});
