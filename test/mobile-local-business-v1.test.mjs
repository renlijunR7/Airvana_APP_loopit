import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(import.meta.dirname,'..');
const source=fs.readFileSync(path.join(root,'public/mobile-local-business-v1.js'),'utf8');
const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');

function loadModule(){
  const sandbox={Date,Math,Object,Array,String,Number,Boolean,JSON,Map,Set,console};
  sandbox.globalThis=sandbox;
  vm.runInNewContext(source,sandbox);
  return sandbox.AirvanaLocalBusiness;
}

function memoryStorage(seed={}){
  const values=new Map(Object.entries(seed));
  return {
    getItem:key=>values.has(key)?values.get(key):null,
    setItem:(key,value)=>values.set(key,String(value)),
    removeItem:key=>values.delete(key),
    has:key=>values.has(key)
  };
}

test('mobile local business assigns stable local identity, role permissions and object IDs',()=>{
  const business=loadModule();
  const kol=business.normalizeUser({name:'Kai Chen',handle:'@kai.builds'},'kol');
  const player=business.normalizeUser({name:'Kai Chen',handle:'@kai.builds'},'player');
  assert.equal(kol.id,player.id);
  assert.equal(kol.active_role_id,'kol');
  assert.ok(kol.permission_ids.includes('release.rollback_local'));
  assert.ok(!player.permission_ids.includes('campaign.create_local'));
  assert.equal(business.ensureId(null,'plb',38),business.ensureId(null,'plb',38));
});

test('legacy v2 snapshot migrates into the versioned v6 envelope without losing social state',()=>{
  const business=loadModule();
  const legacy={profile:{name:'Kai Chen'},productCenterRoleView:'kol',sessions:[{id:24,game:'霓虹疾跑',owner:'@airvana.arcade',versions:[{id:'24-v1'}]}],likedContentIds:[24],savedContentIds:[24],commentsByContent:{24:[{text:'好玩'}]},localEventLog:[]};
  const storage=memoryStorage({'airvana.v5.agentic-positioning.v2':JSON.stringify(legacy)});
  const loaded=business.load(storage);
  assert.equal(loaded.source_key,'airvana.v5.agentic-positioning.v2');
  assert.equal(loaded.envelope.schema_version,6);
  assert.equal(loaded.envelope.migration.from_version,2);
  assert.deepEqual([...loaded.envelope.social.liked_content_ids],[24]);
  assert.equal(loaded.envelope.social.saved_relations[0].content_id,24);
  assert.equal(loaded.envelope.objects.playables.length,1);
  assert.equal(loaded.envelope.ui_state.sessions[0].game,'霓虹疾跑');
});

test('v6 store saves, reloads, exports and clears as one local data package',()=>{
  const business=loadModule();
  const storage=memoryStorage();
  const result=business.save(storage,{ui_state:{profile:{name:'Kai Chen'},sessions:[],drafts:[],gameRunRecords:[]}});
  assert.equal(result.ok,true);
  assert.equal(storage.has(business.STORAGE_KEY),true);
  assert.equal(business.load(storage).envelope.schema_name,'airvana-mobile-local-business');
  assert.match(business.exportData(result.envelope),/"schema_version": 6/);
  assert.equal(business.clear(storage).ok,true);
  assert.equal(storage.has(business.STORAGE_KEY),false);
});

test('v3 envelope migrates commercial, governance and ledger records into v6',()=>{
  const business=loadModule();
  const v3={schema_name:'airvana-mobile-local-business',schema_version:3,ui_state:{sessions:[],drafts:[]},objects:{reusable_assets:[{id:'rsa_v3'}]},operations:{attribution_reports:[{id:'atr_v3'}],settlement_reviews:[{id:'stl_v3'}],governance_cases:[{id:'gov_v3'}]},ledgers:{player_rights:{entries:[{id:'right_v3'}]}}};
  const storage=memoryStorage({'airvana.mobile-business.v3':JSON.stringify(v3)});
  const loaded=business.load(storage);
  assert.equal(loaded.envelope.schema_version,6);
  assert.equal(loaded.envelope.migration.from_version,3);
  assert.equal(loaded.envelope.objects.reusable_assets[0].id,'rsa_v3');
  assert.equal(loaded.envelope.operations.attribution_reports[0].id,'atr_v3');
  assert.equal(loaded.envelope.operations.settlement_reviews[0].id,'stl_v3');
  assert.equal(loaded.envelope.operations.governance_cases[0].id,'gov_v3');
  assert.equal(loaded.envelope.ledgers.player_rights.entries[0].id,'right_v3');
});

test('audit events use one privacy-safe local envelope',()=>{
  const business=loadModule();
  const event=business.auditEvent('comment_submit',{actor_user_id:'usr_kai',actor_role_id:'player',object_type:'playable',object_id:'plb_demo',playable_id:'plb_demo',session_id:'ses_local',properties:{comment_id:'c1'}});
  assert.equal(event.event_name,'comment_submit');
  assert.equal(event.actor_user_id,'usr_kai');
  assert.equal(event.privacy_safe_user_id,null);
  assert.equal(event.server_confirmed,false);
  assert.equal(event.properties.source,'local-demo');
});

test('common state factory covers loading, empty, error, offline and permission',()=>{
  const business=loadModule();
  for(const kind of ['loading','empty','error','offline','permission']){
    const state=business.commonState(kind);
    assert.equal(state.kind,kind);
    assert.ok(state.title);
    assert.ok(state.description);
  }
});

test('all games can share one run record lifecycle',()=>{
  const business=loadModule();
  const started=business.startGameRun({playable_id:'plb_neon',content_id:24,session_id:'ses_1',user_id:'usr_1'});
  const interacted=business.updateGameRun(started,'valid_interaction',{score:12,stage:2});
  const completed=business.updateGameRun(interacted,'play_complete',{score:30,stage:3});
  assert.equal(interacted.interactions,1);
  assert.equal(completed.status,'completed');
  assert.equal(completed.score,30);
  assert.ok(completed.ended_at);
  assert.equal(business.updateGameRun(completed,'play_exit',{}).status,'completed');
  assert.equal(business.updateGameRun(completed,'valid_interaction',{score:999}).score,30);
});

test('local CRUD repositories close draft, saved relation and game-run lifecycles without server calls',()=>{
  const business=loadModule();
  const repositories=business.createLocalRepositoryRegistry({drafts:[{id:7,title:'原始草稿'}]});
  const original=repositories.draft.list()[0];
  const updated=repositories.draft.update(original.id,{title:'已更新草稿'});
  const copied=repositories.draft.copy(original.id,{id:8});
  const tombstone=repositories.draft.remove(original.id,'usr_local');
  const restored=repositories.draft.restore(tombstone.id);
  assert.equal(updated.title,'已更新草稿');
  assert.equal(copied.title,'已更新草稿 副本');
  assert.equal(restored.title,'已更新草稿');
  const saved=repositories.saved.upsert({user_id:'usr_local',content_id:34,playable_id:'plb_orchard',note:'周末继续',collection:'休闲'});
  assert.equal(repositories.saved.get(34).note,'周末继续');
  assert.equal(repositories.saved.remove(saved.playable_id).collection,'休闲');
  const run=repositories.gameRun.create({id:'run_local_1',content_id:34,playable_id:'plb_orchard',status:'completed',score:88});
  assert.equal(repositories.gameRun.get(run.id).score,88);
  assert.equal(repositories.gameRun.clearForPlayable(34).length,1);
  assert.equal(repositories.calls.every(call=>call.server_called===false),true);
});

test('v4 migration preserves saved metadata, tombstones and run details in v6',()=>{
  const business=loadModule();
  const v4={schema_name:'airvana-mobile-local-business',schema_version:4,ui_state:{sessions:[{id:34,game:'果园合合塔',versions:[{id:'34-v1'}]}],drafts:[],savedContentIds:[34],savedRelations:[{id:'sav_34',content_id:34,playable_id:'plb_34',note:'保留',collection:'益智'}],draftTrash:[{id:'del_1',object_type:'draft',legacy_id:9,snapshot:{draft:{id:9,title:'旧草稿'}}}],gameRunRecords:[{id:'run_34',content_id:34,playable_id:'plb_34',status:'completed',score:66}]} };
  const storage=memoryStorage({'airvana.mobile-business.v4':JSON.stringify(v4)});
  const loaded=business.load(storage);
  assert.equal(loaded.source_key,'airvana.mobile-business.v4');
  assert.equal(loaded.envelope.migration.from_version,4);
  assert.equal(loaded.envelope.social.saved_relations[0].collection,'益智');
  assert.equal(loaded.envelope.objects.tombstones[0].legacy_id,9);
  assert.equal(loaded.envelope.operations.game_runs[0].score,66);
});

test('v5 migration preserves local unverified wallet candidates in v6 identity state',()=>{
  const business=loadModule();
  const candidate={id:'wlc_demo',address:'0x'+'4'.repeat(40),network_key:'eip155:1',chain_id:1,status:'saved_unverified',ownership_status:'unverified',server_confirmed:false,can_withdraw:false};
  const v5={schema_name:'airvana-mobile-local-business',schema_version:5,ui_state:{sessions:[],drafts:[],localWalletCandidates:[candidate]},identity:{users:[],active_role_id:'kol',wallet_candidates:[candidate]},objects:{},operations:{},social:{}};
  const storage=memoryStorage({'airvana.mobile-business.v5':JSON.stringify(v5)});
  const loaded=business.load(storage);
  assert.equal(loaded.source_key,'airvana.mobile-business.v5');
  assert.equal(loaded.envelope.schema_version,6);
  assert.equal(loaded.envelope.migration.from_version,5);
  assert.equal(loaded.envelope.identity.wallet_candidates[0].id,'wlc_demo');
  assert.equal(loaded.envelope.identity.wallet_candidates[0].server_confirmed,false);
  assert.equal(loaded.envelope.identity.wallet_candidates[0].can_withdraw,false);
});

test('Brief, Contract and Asset Manifest remain separate versioned artifacts',()=>{
  const business=loadModule();
  const brief=business.buildBrief({campaign_id:'cmp_demo',version:'local-v1',objective:'产品教育',audience:'新用户',success_event:'playable_complete',cta_type:'查看指南'});
  const contract=business.buildContract({campaign_id:'cmp_demo',version:'local-v1',fields:{region:'HK',success_event:'playable_complete'}});
  const manifest=business.buildAssetManifest({campaign_id:'cmp_demo',contract_version:'local-v1',assets:[{name:'cover.png',type:'image/png',size:100}]});
  assert.equal(brief.campaign_id,'cmp_demo');
  assert.ok(contract.locked_fields.includes('cta_destination'));
  assert.ok(contract.locked_fields.includes('kill_switch'));
  assert.equal(manifest.asset_count,1);
  assert.equal(manifest.assets[0].storage,'indexeddb-local');
  const envelope=business.createEnvelope({ui_state:{sessions:[],drafts:[]},brief_versions:[brief],contract_versions:[contract],asset_manifests:[manifest]});
  assert.equal(envelope.objects.brief_versions[0].id,brief.id);
  assert.equal(envelope.objects.contract_versions[0].id,contract.id);
  assert.equal(envelope.objects.asset_manifests[0].id,manifest.id);
});

test('runtime events build a local attribution funnel without inventing confirmed conversions',()=>{
  const business=loadModule();
  const seed=business.createCampaignDemoSeed({campaign_id:'cmp_demo',playable_id:'plb_demo',success_event:'registration_complete'});
  assert.equal(seed.events.length,17);
  assert.equal(seed.events.every(event=>event.runtime_event&&event.server_confirmed===false),true);
  assert.deepEqual(Array.from(seed.attribution_report.funnel,item=>item.unique_sessions),[5,4,3,2,2,1]);
  assert.equal(seed.attribution_report.confirmed_success_count,0);
  assert.equal(seed.attribution_report.status,'local-only-unverified');
  assert.equal(seed.attribution_report.data_quality.complete_for_settlement,false);
});

test('three ledgers stay independent and settlement never manufactures amount or currency',()=>{
  const business=loadModule();
  const ledgers=business.buildThreeLedgers({player_rights:[{id:'r1',amount:20}],kol_attribution:[{id:'a1',server_confirmed:false}],commercial_settlement:[{id:'s1',amount:999}]});
  assert.equal(ledgers.player_rights.cash_value,null);
  assert.equal(ledgers.kol_attribution.confirmed_count,0);
  assert.equal(ledgers.commercial_settlement.amount,null);
  assert.equal(ledgers.commercial_settlement.currency,null);
  const review=business.buildSettlementReview({campaign_id:'cmp_demo',checks:[{key:'server_success_event',passed:false}]});
  assert.equal(review.amount,null);
  assert.equal(review.currency,null);
  assert.equal(review.server_confirmed,false);
});

test('reusable asset creates new object IDs and resets locked commercial fields',()=>{
  const business=loadModule();
  const asset=business.buildReusableAsset({source_playable_id:'plb_source',source_campaign_id:'cmp_source',source_contract_version:'Contract v1'});
  assert.notEqual(asset.new_playable_id,asset.source_playable_id);
  assert.notEqual(asset.new_campaign_id,asset.source_campaign_id);
  for(const field of ['brand','region','cta_destination','reward_rule','attribution','settlement','approval','kill_switch']) assert.ok(asset.reset_fields.includes(field));
});

test('governance cases follow reversible report, review, takedown, appeal and restore transitions',()=>{
  const business=loadModule();
  const opened=business.buildGovernanceCase({type:'report',playable_id:'plb_demo'});
  const reviewing=business.transitionGovernanceCase(opened,'review');
  const takenDown=business.transitionGovernanceCase(reviewing,'takedown');
  const appealed=business.transitionGovernanceCase(takenDown,'appeal');
  const restored=business.transitionGovernanceCase(appealed,'restore');
  assert.equal(reviewing.status,'reviewing-local-demo');
  assert.equal(takenDown.status,'takedown-local-demo');
  assert.equal(appealed.status,'appeal-local-demo');
  assert.equal(restored.status,'restored-to-draft-local-demo');
  assert.equal(restored.server_confirmed,false);
  assert.equal(restored.history.length,5);
});

test('repository interfaces are present but disabled and never claim a server call',()=>{
  const business=loadModule();
  const repositories=business.createRepositoryRegistry();
  assert.equal(repositories.enabled,false);
  assert.equal(repositories.mode,'local-only');
  assert.equal(repositories.call_count,0);
  const result=repositories.invoke('settlement','submitReview');
  assert.equal(result.server_called,false);
  assert.equal(result.code,'REPOSITORY_DISABLED_LOCAL_ONLY');
  assert.equal(repositories.call_count,1);
});

test('mobile page wires migration, local release lifecycle, run records and local data controls',()=>{
  assert.match(html,/mobile-local-business-v1\.js\?v=3\.1\.0/);
  assert.match(html,/最近删除/);
  assert.match(html,/管理收藏/);
  assert.match(html,/清空全部体验记录/);
  assert.match(html,/localGenerationTasks/);
  assert.match(html,/localBriefVersions/);
  assert.match(html,/localReviewRecords/);
  assert.match(html,/localReleaseRecords/);
  assert.match(html,/gameRunRecords/);
  assert.match(html,/local_release_paused/);
  assert.match(html,/local_release_rolled_back/);
  assert.match(html,/导出本机数据/);
  assert.match(html,/恢复默认环境/);
  assert.match(html,/清除本机业务数据/);
  assert.match(html,/Runtime 事件漏斗/);
  assert.match(html,/已生成本地归因报告/);
  assert.match(html,/三账本分离展示/);
  assert.match(html,/Repository 接口已预留 · Local only/);
  assert.match(html,/persistCriticalStateNow\('pagehide'\)/);
  assert.doesNotMatch(html,/href="\/api\/account\/export"/);
});
