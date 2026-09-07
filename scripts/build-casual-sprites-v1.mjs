import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const value = name => { const i = args.indexOf(name); return i < 0 ? null : args[i+1]; };
const configFile = value('--config');
if (!configFile) throw new Error('Pass --config with reviewed source paths and full prompts.');
const apply = args.includes('--apply');
const require = createRequire(import.meta.url);
const sharp = value('--sharp') ? require(path.resolve(value('--sharp'))) : require('sharp');
const config = JSON.parse(await fs.readFile(path.resolve(configFile), 'utf8'));
const directories = [
  path.join(root, 'public/assets/games/casual-v1'),
  path.join(root, 'apps/airvana_mobile/assets/runner/assets/games/casual-v1')
];
const sha = buffer => createHash('sha256').update(buffer).digest('hex');
const manifest = {
  pack:'casual-v1', version:'5.0.0', asset_kind:'gameplay_sprites',
  reference_role:'style only; user supplied farm-game screenshot',
  reference:config.reference, style:'bright polished 2.5D casual mobile game',
  generation:'built-in image_gen tool', count:64,
  processing:'Built-in ImageGen made all artwork and the uniform magenta source matte. Deterministic game import removes that chroma-key background, mathematically unmixes only boundary pixels, extracts reviewed sprite cells and trims transparent margins. No paintover, shape redesign, resynthesis, or previous-art fallback.',
  authorization_status:'user-requested new game art; reference artwork is not copied into output',
  production_status:'LOCAL_DEMO',
  source_assets:[], assets:[]
};
for (const atlas of config.atlases) {
  if (atlas.keys.length !== 16) throw new Error(atlas.family+' must define exactly 16 semantic keys.');
  const original = await fs.readFile(atlas.source);
  const metadata = await sharp(original).metadata();
  if (!metadata.width || !metadata.height) throw new Error(atlas.family+' source dimensions are missing.');
  if (!metadata.hasAlpha && !atlas.chromaKey) throw new Error(atlas.family+' source lacks alpha and no reviewed chroma-key import was requested.');
  let prepared=original;
  if(atlas.chromaKey) {
    const {data,info}=await sharp(original).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const keyed=new Uint8Array(info.width*info.height);
    let keyCount=0;
    for(let i=0;i<keyed.length;i++) {
      const r=data[i*4],g=data[i*4+1],b=data[i*4+2];
      if(Math.max(255-r,g,255-b)<55) {keyed[i]=1;keyCount++;}
    }
    if(keyCount/keyed.length<0.12) throw new Error(atlas.family+' does not have a reliable flat magenta source matte.');
    for(let y=0;y<info.height;y++) for(let x=0;x<info.width;x++) {
      const i=y*info.width+x,offset=i*4;
      if(keyed[i]) {data[offset]=0;data[offset+1]=0;data[offset+2]=0;data[offset+3]=0;continue;}
      let boundary=false;
      for(let dy=-1;dy<=1&&!boundary;dy++) for(let dx=-1;dx<=1;dx++) {
        const xx=x+dx,yy=y+dy;
        if(xx>=0&&xx<info.width&&yy>=0&&yy<info.height&&keyed[yy*info.width+xx]) {boundary=true;break;}
      }
      if(!boundary)continue;
      const excess=Math.max(0,Math.min(data[offset],data[offset+2])-data[offset+1]);
      const alpha=1-excess/255;
      if(alpha<0.08) {data[offset]=0;data[offset+1]=0;data[offset+2]=0;data[offset+3]=0;continue;}
      data[offset]=Math.max(0,Math.min(255,Math.round((data[offset]-(1-alpha)*255)/alpha)));
      data[offset+1]=Math.max(0,Math.min(255,Math.round(data[offset+1]/alpha)));
      data[offset+2]=Math.max(0,Math.min(255,Math.round((data[offset+2]-(1-alpha)*255)/alpha)));
      data[offset+3]=Math.round(alpha*255);
    }
    prepared=await sharp(data,{raw:{width:info.width,height:info.height,channels:4}}).png({compressionLevel:9}).toBuffer();
  }
  const history=[];
  for(const [index,item] of (atlas.sourceHistory||[]).entries()) {
    const bytes=await fs.readFile(item.path);
    const sourceFile='sources/sprites/'+atlas.family+'-source-'+index+'.png';
    history.push({...item,source_file:sourceFile,bytes:bytes.length,sha256:sha(bytes)});
    if(apply) for(const target of directories) {
      await fs.mkdir(path.join(target,'sources/sprites'),{recursive:true});
      await fs.writeFile(path.join(target,sourceFile),bytes);
    }
  }
  manifest.source_assets.push({family:atlas.family,source_file:'sources/sprites/'+atlas.family+'-atlas.png',original_generated_path:atlas.source,width:metadata.width,height:metadata.height,bytes:original.length,sha256:sha(original),has_generated_alpha:metadata.hasAlpha,alpha_import:atlas.chromaKey?'uniform-magenta-key-boundary-unmix':'preserved-generated-alpha',prompt:atlas.prompt,background_edit_prompt:atlas.backgroundEditPrompt,source_history:history});
  if (apply) for (const target of directories) {
    await fs.mkdir(path.join(target,'sources/sprites'),{recursive:true});
    await fs.mkdir(path.join(target,'sprites'),{recursive:true});
    await fs.writeFile(path.join(target,'sources/sprites',atlas.family+'-atlas.png'),original);
  }
  for (let index=0; index<16; index++) {
    const column=index%4,row=Math.floor(index/4);
    const override = atlas.rects?.[index];
    const rect = override ? {left:override[0],top:override[1],width:override[2],height:override[3]} : {
      left:Math.round(column*metadata.width/4),top:Math.round(row*metadata.height/4),
      width:Math.round((column+1)*metadata.width/4)-Math.round(column*metadata.width/4),
      height:Math.round((row+1)*metadata.height/4)-Math.round(row*metadata.height/4)
    };
    const {data,info}=await sharp(prepared).extract(rect).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    let left=info.width,top=info.height,right=-1,bottom=-1,transparent=0,opaque=0;
    for(let y=0;y<info.height;y++) for(let x=0;x<info.width;x++) {
      const alpha=data[(y*info.width+x)*info.channels+3];
      if(alpha===0) transparent++;
      if(alpha>8) {left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);opaque++;}
    }
    if(right<left || opaque<64) throw new Error(atlas.keys[index]+' is blank or unreadable.');
    const transparentFraction=transparent/(info.width*info.height);
    if(transparentFraction<0.12) throw new Error(atlas.keys[index]+' cell is not genuinely isolated on transparency.');
    const crop={left:Math.max(0,left-3),top:Math.max(0,top-3),width:0,height:0};
    crop.width=Math.min(info.width-crop.left,right-left+7);
    crop.height=Math.min(info.height-crop.top,bottom-top+7);
    const finalRect={left:rect.left+crop.left,top:rect.top+crop.top,width:crop.width,height:crop.height};
    const output=await sharp(prepared).extract(finalRect).png({compressionLevel:9}).toBuffer();
    const entry={asset_id:atlas.keys[index],family:atlas.family,file:atlas.keys[index]+'.png',width:crop.width,height:crop.height,source_cell:rect,source_crop:finalRect,transparent_fraction:Math.round(transparentFraction*10000)/10000,bytes:output.length,sha256:sha(output)};
    manifest.assets.push(entry);
    if(apply) for(const target of directories) await fs.writeFile(path.join(target,'sprites',entry.file),output);
  }
}
if(manifest.assets.length!==64 || new Set(manifest.assets.map(asset=>asset.asset_id)).size!==64) throw new Error('Exactly 64 unique assets required.');
if(apply) for(const target of directories) await fs.writeFile(path.join(target,'sprites/manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({mode:apply?'applied':'dry-run',count:manifest.assets.length,sourceCount:manifest.source_assets.length,sourceBytes:manifest.source_assets.reduce((n,item)=>n+item.bytes,0),runtimeBytes:manifest.assets.reduce((n,item)=>n+item.bytes,0),assets:manifest.assets.map(({asset_id,width,height,transparent_fraction})=>({asset_id,width,height,transparent_fraction}))},null,2));
