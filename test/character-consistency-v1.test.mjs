import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(import.meta.dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'public/assets/characters/v1/manifest.json'),'utf8'));
const runtimeSource=fs.readFileSync(path.join(root,'public/character-runtime-v1.js'),'utf8');
const completeSource=fs.readFileSync(path.join(root,'public/complete-games-v3.js'),'utf8');
const indexSource=fs.readFileSync(path.join(root,'public/index.html'),'utf8');

test('five pilot covers and runtime sprites resolve the same canonical master',()=>{
  assert.equal(manifest.version,'1.0.1');
  assert.equal(manifest.generativeAI,false);
  assert.equal(manifest.thirdPartyAssets,false);
  assert.deepEqual(manifest.pilotGameIds,[5,10,12,20,36]);
  assert.equal(manifest.files.length,5);
  for(const item of manifest.files){
    const master=path.join(root,'public/assets/characters/v1',item.master);
    const cover=path.join(root,'public/assets/game-covers/character-consistency-v1',`${item.game_key}.svg`);
    const contract=path.join(path.dirname(master),'character.json');
    assert.equal(fs.existsSync(master),true,item.master);
    assert.equal(fs.existsSync(cover),true,item.cover);
    assert.equal(fs.existsSync(contract),true,contract);
    const masterSvg=fs.readFileSync(master,'utf8');
    const coverSvg=fs.readFileSync(cover,'utf8');
    assert.match(masterSvg,/Airvana character-consistency-v1/);
    assert.match(coverSvg,new RegExp(`/assets/characters/v1/${item.character_id}/master\\.svg`));
    assert.doesNotMatch(masterSvg,/<image\b|href="https?:\/\//);
    assert.doesNotMatch(coverSvg,/<image\b|href="https?:\/\//);
    assert.match(coverSvg,/data-canonical-master=/);
  }
});

test('character runtime exposes the five canonical profiles and has a no-Image fallback',async()=>{
  const window={};
  vm.runInNewContext(runtimeSource,{window,globalThis:window,Map,Object,Array,String,Number,Boolean,Promise,Math});
  const runtime=window.AirvanaCharacterRuntime;
  assert.equal(runtime.version,'1.0.1');
  assert.deepEqual(Array.from(runtime.list(),item=>item.gameId),[5,10,12,20,36]);
  assert.equal(runtime.has('pixel-quest'),true);
  assert.equal(runtime.has('star-deck'),false);
  assert.equal(await runtime.preload('pixel-quest'),false);
  assert.equal(runtime.draw({},'pixel-quest',{x:0,y:0,w:10,h:10}),false);
});

test('complete runtime and Home load the character layer before using pilot covers',()=>{
  const scriptIndex=indexSource.indexOf('character-runtime-v1.js?v=1.0.1');
  const completeIndex=indexSource.indexOf('complete-games-v3.js?v=3.3.0');
  assert.ok(scriptIndex>=0&&completeIndex>scriptIndex);
  assert.match(indexSource,/const characterConsistencyPilotCoverKeys=\{5:'pixel-quest',10:'paws-stage',12:'puppet-studio',20:'formation-knights',36:'moonlight-tea-shop'\}/);
  assert.match(indexSource,/game-covers\/character-consistency-v1\/['"]?\+key\+'\.svg\?v=1\.0\.1/);
  for(const characterId of manifest.files.map(item=>item.character_id)) assert.ok(completeSource.includes(`heroCharacterId: '${characterId}'`),characterId);
  assert.match(completeSource,/version: '3\.3\.0'/);
  assert.match(completeSource,/drawCanonicalCharacter/);
});
