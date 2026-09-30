import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const web=path.join(root,'public/assets/games/casual-v1');
const mobile=path.join(root,'apps/airvana_mobile/assets/runner/assets/games/casual-v1');
const manifest=JSON.parse(fs.readFileSync(path.join(web,'manifest.json'),'utf8'));
const catalog=JSON.parse(fs.readFileSync(path.join(root,'public/assets/games/fidelity-v2/manifest.json'),'utf8')).assets;
const sha=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');

test('casual art catalog preserves all 38 game identities and 32+6 engine assignments',()=>{
 assert.equal(manifest.game_count,38);
 assert.equal(manifest.assets.length,38);
 assert.deepEqual(manifest.assets.map(a=>a.game_key).sort(),catalog.map(a=>a.game_key).sort());
 for(const asset of manifest.assets){const original=catalog.find(a=>a.game_key===asset.game_key);for(const field of ['title','content_id','mechanic','runtime'])assert.equal(asset[field],original[field],`${asset.game_key} ${field}`);}
 assert.equal(manifest.assets.filter(a=>a.runtime==='complete-games-v3').length,32);
 assert.equal(manifest.assets.filter(a=>a.runtime==='deep-games-v2').length,6);
});

test('38 games each use their own independent source environment, never a shared theme fallback',()=>{
 assert.equal(manifest.environment_count,38);
 assert.equal(manifest.environments.length,38);
 assert.equal(new Set(manifest.assets.map(a=>a.source.sha256)).size,38);
 assert.equal(new Set(manifest.assets.map(a=>a.runtime_asset.sha256)).size,38);
 for(const asset of manifest.assets){assert.equal(asset.world_id,asset.game_key);assert.equal(asset.shared_environment,false);assert.equal(asset.source.path,`public/assets/games/casual-v1/environments/${asset.game_key}.png`);}
});

test('all source environments have truthful generation provenance, prompt records and checksums',()=>{
 assert.equal(manifest.source_generator,'OpenAI built-in ImageGen');
 for(const asset of manifest.assets){const buffer=fs.readFileSync(path.join(root,asset.source.path));assert.equal(sha(buffer),asset.source.sha256);assert.equal(buffer.length,asset.source.bytes);assert.equal(asset.source.format,'png');assert.ok(asset.source.height>asset.source.width);assert.equal(asset.reference_role,'style only');assert.equal(asset.release_approved,false);assert.ok(fs.readFileSync(path.join(root,asset.source.prompt_record),'utf8').trim().length>100);}
});

test('complete casual build contains 38 WebP scenes, 38 WebP covers and 38 PNG covers',()=>{
 assert.equal(manifest.build_scope,'complete-assets');
 assert.equal(manifest.asset_count,114);
 for(const asset of manifest.assets)for(const role of ['runtime_asset','cover_asset','cover_png']){const record=asset[role];assert.ok(record,`${asset.game_key}: ${role}`);const buffer=fs.readFileSync(path.join(root,record.path));assert.equal(sha(buffer),record.sha256);assert.equal(buffer.length,record.bytes);assert.equal(record.width,720);assert.equal(record.height,1120);if(role==='cover_png'){assert.deepEqual([...buffer.subarray(0,8)],[137,80,78,71,13,10,26,10]);}else{assert.equal(buffer.toString('ascii',0,4),'RIFF');assert.equal(buffer.toString('ascii',8,12),'WEBP');}assert.ok(record.bytes>1000);assert.equal(/classic-v1|\.svg$|fidelity-v2|playables-v3/.test(record.path),false);}
 assert.equal(new Set(manifest.assets.map(a=>a.cover_asset.sha256)).size,38);
});

test('all 114 runtime/cover images and manifests match their Flutter mirrors exactly',()=>{
 for(const asset of manifest.assets)for(const[folder,extension]of[['scenes','webp'],['covers','webp'],['covers-png','png']]){const relative=path.join(folder,`${asset.game_key}.${extension}`);assert.deepEqual(fs.readFileSync(path.join(web,relative)),fs.readFileSync(path.join(mobile,relative)),relative);}
 assert.deepEqual(fs.readFileSync(path.join(web,'manifest.json')),fs.readFileSync(path.join(mobile,'manifest.json')));
 assert.deepEqual(fs.readFileSync(path.join(web,'covers-png/manifest.json')),fs.readFileSync(path.join(mobile,'covers-png/manifest.json')));
});

test('Flutter PNG cover manifest provides source paths, dimensions and per-file hashes',()=>{
 const pngs=JSON.parse(fs.readFileSync(path.join(web,'covers-png/manifest.json'),'utf8'));
 assert.equal(pngs.source,'REFERENCE_GUIDED_CASUAL_2_5D');assert.equal(pngs.entries.length,38);
 for(const entry of pngs.entries){assert.equal(entry.file,`${entry.game_key}.png`);assert.equal(entry.width,720);assert.equal(entry.height,1120);assert.equal(entry.sha256,sha(fs.readFileSync(path.join(web,'covers-png',entry.file))));assert.equal(entry.source,`public/assets/games/casual-v1/covers/${entry.game_key}.webp`);}
});

test('cover builder fails closed on duplicate environments, missing PNG sprites and fake transparency',()=>{
 const source=fs.readFileSync(path.join(root,'scripts/build-casual-scenes-v1.mjs'),'utf8');
 assert.match(source,/duplicate backgrounds are forbidden/);
 assert.match(source,/Missing casual PNG sprite/);
 assert.match(source,/Sprite needs real transparent alpha, not a baked checkerboard/);
 assert.ok(manifest.cover_sprite_keys.length>=48);
 for(const key of manifest.cover_sprite_keys){const buffer=fs.readFileSync(path.join(web,'sprites',`${key}.png`));assert.deepEqual([...buffer.subarray(0,8)],[137,80,78,71,13,10,26,10]);}
});

test('38 cover and scene preview images remain reachable without inline script execution',()=>{
 for(const kind of ['covers','scenes'])for(let page=0;page<5;page++){const html=fs.readFileSync(path.join(web,`preview-${kind}-${page}.html`),'utf8');assert.equal(/<script\b/.test(html),false);assert.equal((html.match(/<img\b/g)||[]).length,page===4?6:8);}
});
