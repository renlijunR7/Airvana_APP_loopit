import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(import.meta.dirname,'..');
const source=fs.readFileSync(path.join(root,'public/wallet-binding-v1.js'),'utf8');

function loadModule(){
  const sandbox={Date,Math,Object,Array,String,Number,Boolean,JSON,Map,Set,console};
  sandbox.globalThis=sandbox;
  vm.runInNewContext(source,sandbox);
  return sandbox.AirvanaWalletBinding;
}

test('wallet acquisition supports only the approved Ethereum and Base networks',()=>{
  const wallet=loadModule();
  assert.deepEqual(Array.from(wallet.NETWORKS,item=>item.chainId),[1,8453]);
  assert.equal(wallet.networkByKey('eip155:1').label,'Ethereum');
  assert.equal(wallet.networkByChainId(8453).label,'Base');
  assert.equal(wallet.networkByChainId(10),null);
});

test('manual EVM address validation blocks invalid, zero and burn addresses',()=>{
  const wallet=loadModule();
  assert.equal(wallet.validateEvmAddress('0x'+'1'.repeat(40)).valid,true);
  assert.equal(wallet.validateEvmAddress('0x1234').code,'invalid_format');
  assert.equal(wallet.validateEvmAddress('0x'+'0'.repeat(40)).code,'blocked_address');
  assert.equal(wallet.validateEvmAddress('0x000000000000000000000000000000000000dEaD').code,'blocked_address');
});

test('manual and QR entries remain local unverified candidates without withdrawal capability',()=>{
  const wallet=loadModule();
  for(const method of ['manual','qr']){
    const result=wallet.createCandidate({address:'0x'+'2'.repeat(40),networkKey:'eip155:1',acquisition_method:method});
    assert.equal(result.valid,true);
    assert.equal(result.candidate.status,'saved_unverified');
    assert.equal(result.candidate.ownership_status,'unverified');
    assert.equal(result.candidate.server_confirmed,false);
    assert.equal(result.candidate.can_withdraw,false);
  }
});

test('detected wallet requires server confirmation before ownership or risk approval',()=>{
  const wallet=loadModule();
  const detected=wallet.createCandidate({address:'0x'+'3'.repeat(40),chainId:8453,acquisition_method:'injected'}).candidate;
  assert.equal(detected.status,'address_detected');
  const pending=wallet.transition(detected,'request_signature',{});
  assert.equal(pending.ok,true);
  assert.equal(pending.candidate.status,'verification_pending');
  const localClaim=wallet.transition(pending.candidate,'signature_verified',{server_confirmed:false});
  assert.equal(localClaim.ok,false);
  assert.equal(localClaim.code,'server_confirmation_required');
  const verified=wallet.transition(pending.candidate,'signature_verified',{server_confirmed:true});
  assert.equal(verified.candidate.status,'risk_review');
  assert.equal(verified.candidate.can_withdraw,false);
  const localRiskClaim=wallet.transition(verified.candidate,'risk_approved',{server_confirmed:false,withdrawal_enabled:true});
  assert.equal(localRiskClaim.ok,false);
  const active=wallet.transition(verified.candidate,'risk_approved',{server_confirmed:true,primary:true,withdrawal_enabled:true});
  assert.equal(active.candidate.status,'active');
  assert.equal(active.candidate.primary,true);
  assert.equal(active.candidate.can_withdraw,true);
});

test('wallet candidates deduplicate by network and normalized public address',()=>{
  const wallet=loadModule();
  const address='0x'+'a'.repeat(40);
  const candidates=wallet.dedupeCandidates([
    wallet.createCandidate({address,networkKey:'eip155:1',acquisition_method:'manual'}).candidate,
    wallet.createCandidate({address:address.toUpperCase().replace('0X','0x'),networkKey:'eip155:1',acquisition_method:'qr'}).candidate,
    wallet.createCandidate({address,networkKey:'eip155:8453',acquisition_method:'manual'}).candidate,
  ]);
  assert.equal(candidates.length,2);
  assert.equal(candidates.every(item=>item.can_withdraw===false),true);
});
