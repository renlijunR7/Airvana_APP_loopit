(function (root) {
  'use strict';

  const VERSION = '1.0.0';
  const NETWORKS = Object.freeze([
    Object.freeze({key:'eip155:1',chainId:1,label:'Ethereum',shortLabel:'ETH',namespace:'eip155'}),
    Object.freeze({key:'eip155:8453',chainId:8453,label:'Base',shortLabel:'Base',namespace:'eip155'})
  ]);
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  const BURN_ADDRESSES = Object.freeze(new Set([
    ZERO_ADDRESS,
    '0x000000000000000000000000000000000000dead'
  ]));
  const OWNERSHIP_STATES = Object.freeze(['unverified','verification_pending','verified']);
  const RISK_STATES = Object.freeze(['not_started','pending','clear','blocked']);
  const BINDING_STATES = Object.freeze(['saved_unverified','address_detected','verification_pending','risk_review','active','cooldown','blocked','disabled']);

  function nowIso() {
    return new Date().toISOString();
  }

  function hashString(value) {
    let hash = 2166136261;
    const text = String(value == null ? '' : value);
    for (let index = 0; index < text.length; index += 1) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
    return (hash >>> 0).toString(36);
  }

  function networkByKey(key) {
    return NETWORKS.find(item => item.key === key) || null;
  }

  function networkByChainId(chainId) {
    return NETWORKS.find(item => item.chainId === Number(chainId)) || null;
  }

  function normalizeAddressInput(value) {
    return String(value == null ? '' : value).trim().replace(/^ethereum:/i, '').split(/[?@]/)[0].trim();
  }

  function validateEvmAddress(value) {
    const input = normalizeAddressInput(value);
    if (!input) return {valid:false,code:'address_required',message:'请输入钱包地址。',input};
    if (!/^0x[0-9a-fA-F]{40}$/.test(input)) return {valid:false,code:'invalid_format',message:'请输入 0x 开头的 42 位 EVM 钱包地址。',input};
    const normalized = input.toLowerCase();
    if (BURN_ADDRESSES.has(normalized)) return {valid:false,code:'blocked_address',message:'零地址或销毁地址不能作为收款地址。',input,normalized};
    return {
      valid:true,
      code:'structural_valid',
      message:'地址格式已通过本地结构检查；钱包所有权仍需签名验证。',
      input,
      normalized,
      display:input,
      checksum_status:/[A-F]/.test(input)&&/[a-f]/.test(input)?'mixed_case_unverified':'not_provided'
    };
  }

  function maskAddress(value) {
    const address = normalizeAddressInput(value);
    return address.length >= 12 ? address.slice(0, 6) + '\u2026' + address.slice(-4) : address || '\u2014';
  }

  function createCandidate(input) {
    const source = input || {};
    const validation = validateEvmAddress(source.address);
    if (!validation.valid) return {...validation,candidate:null};
    const network = networkByKey(source.networkKey) || networkByChainId(source.chainId);
    if (!network) return {valid:false,code:'unsupported_network',message:'请选择 Airvana 当前支持的 EVM 网络。',candidate:null};
    const createdAt = source.created_at || nowIso();
    const acquisition = ['manual','qr','injected','login_wallet','mobile_wallet'].includes(source.acquisition_method) ? source.acquisition_method : 'manual';
    const status = acquisition === 'manual' || acquisition === 'qr' ? 'saved_unverified' : 'address_detected';
    const candidate = {
      id: source.id || 'wlc_' + hashString(validation.normalized + ':' + network.key),
      address: validation.normalized,
      display_address: validation.display,
      address_masked: maskAddress(validation.normalized),
      network_key: network.key,
      chain_id: network.chainId,
      network_label: network.label,
      namespace: network.namespace,
      acquisition_method: acquisition,
      checksum_status: source.checksum_status || validation.checksum_status,
      ownership_status: 'unverified',
      risk_status: 'not_started',
      status,
      primary: false,
      can_withdraw: false,
      server_confirmed: false,
      on_chain_confirmed: false,
      created_at: createdAt,
      updated_at: source.updated_at || createdAt
    };
    return {valid:true,code:'candidate_created',message:validation.message,candidate};
  }

  function transition(candidate, eventName, context) {
    const current = candidate && typeof candidate === 'object' ? {...candidate} : null;
    if (!current || !BINDING_STATES.includes(current.status)) return {ok:false,code:'candidate_required',candidate:current};
    const input = context || {};
    const now = input.at || nowIso();
    const transitions = {
      request_signature: ['saved_unverified','address_detected'],
      signature_verified: ['verification_pending'],
      risk_approved: ['risk_review'],
      risk_blocked: ['risk_review','verification_pending','address_detected','saved_unverified'],
      enter_cooldown: ['active'],
      cooldown_complete: ['cooldown'],
      disable: BINDING_STATES.filter(state => state !== 'disabled')
    };
    if (!(transitions[eventName] || []).includes(current.status)) return {ok:false,code:'invalid_transition:' + current.status + ':' + eventName,candidate:current};
    let next = {...current,updated_at:now};
    if (eventName === 'request_signature') next = {...next,status:'verification_pending',ownership_status:'verification_pending'};
    if (eventName === 'signature_verified') {
      if (input.server_confirmed !== true) return {ok:false,code:'server_confirmation_required',candidate:current};
      next = {...next,status:'risk_review',ownership_status:'verified',risk_status:'pending',verified_at:now,server_confirmed:true};
    }
    if (eventName === 'risk_approved') {
      if (input.server_confirmed !== true) return {ok:false,code:'server_confirmation_required',candidate:current};
      next = {...next,status:'active',risk_status:'clear',primary:input.primary === true,can_withdraw:input.withdrawal_enabled === true,server_confirmed:true};
    }
    if (eventName === 'risk_blocked') next = {...next,status:'blocked',risk_status:'blocked',primary:false,can_withdraw:false,risk_reason:input.reason || 'policy_blocked'};
    if (eventName === 'enter_cooldown') next = {...next,status:'cooldown',primary:false,can_withdraw:false,cooldown_until:input.cooldown_until || null};
    if (eventName === 'cooldown_complete') next = {...next,status:'active',primary:input.primary === true,can_withdraw:input.withdrawal_enabled === true,cooldown_until:null};
    if (eventName === 'disable') next = {...next,status:'disabled',primary:false,can_withdraw:false,disabled_at:now};
    return {ok:true,code:eventName,candidate:next};
  }

  function normalizeCandidate(value) {
    const source = value || {};
    const created = createCandidate({
      id:source.id,
      address:source.address || source.display_address,
      networkKey:source.network_key,
      chainId:source.chain_id,
      acquisition_method:source.acquisition_method,
      created_at:source.created_at,
      updated_at:source.updated_at,
      checksum_status:source.checksum_status
    });
    if (!created.valid) return null;
    const ownership = OWNERSHIP_STATES.includes(source.ownership_status) ? source.ownership_status : created.candidate.ownership_status;
    const risk = RISK_STATES.includes(source.risk_status) ? source.risk_status : created.candidate.risk_status;
    const status = BINDING_STATES.includes(source.status) ? source.status : created.candidate.status;
    return {...created.candidate,...source,ownership_status:ownership,risk_status:risk,status,primary:source.primary === true,can_withdraw:source.can_withdraw === true,server_confirmed:source.server_confirmed === true,on_chain_confirmed:source.on_chain_confirmed === true};
  }

  function dedupeCandidates(values) {
    const seen = new Set();
    return (Array.isArray(values) ? values : []).map(normalizeCandidate).filter(candidate => {
      if (!candidate) return false;
      const key = candidate.network_key + ':' + candidate.address;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  root.AirvanaWalletBinding = Object.freeze({
    version:VERSION,
    NETWORKS,
    BINDING_STATES,
    OWNERSHIP_STATES,
    RISK_STATES,
    networkByKey,
    networkByChainId,
    normalizeAddressInput,
    validateEvmAddress,
    maskAddress,
    createCandidate,
    transition,
    normalizeCandidate,
    dedupeCandidates
  });
})(typeof window !== 'undefined' ? window : globalThis);
