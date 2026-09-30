(function (root) {
  'use strict';

  // Airvana 移动端 → 本地服务桥接。
  // 边界：所有请求失败都静默降级回本地演示；不改变任何本地状态机；
  // 只有服务端真实返回的结果才会被标记为 server_confirmed。
  const state = {
    probed: false,
    serviceUp: false,
    sessionReady: false,
    me: null,
    mapping: {},
    runtime: null,
    lastReward: null,
    registering: null,
  };

  function httpContext() {
    return typeof location !== 'undefined' && /^https?:$/.test(location.protocol) && typeof fetch === 'function';
  }

  function deviceId() {
    try {
      const store = root.localStorage;
      if (store) {
        let id = store.getItem('airvana.mobile.device-id');
        if (!id || id.length < 8) {
          id = 'mob_' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
          store.setItem('airvana.mobile.device-id', id);
        }
        return id;
      }
    } catch (error) { /* 存储不可用时用会话级标识 */ }
    if (!state.fallbackDeviceId) state.fallbackDeviceId = 'mob_' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
    return state.fallbackDeviceId;
  }

  async function api(path, options = {}) {
    const response = await fetch(path, {
      credentials: 'include',
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json', 'X-Airvana-Device': deviceId() },
      body: options.body == null ? undefined : JSON.stringify(options.body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error((data.error && data.error.message) || `HTTP ${response.status}`);
      error.status = response.status;
      error.code = data.error && data.error.code;
      throw error;
    }
    return data;
  }

  async function probe() {
    if (!httpContext()) { state.probed = true; state.serviceUp = false; return false; }
    try {
      const response = await fetch('/api/health', { credentials: 'include' });
      state.serviceUp = response.ok;
    } catch (error) {
      state.serviceUp = false;
    }
    state.probed = true;
    return state.serviceUp;
  }

  async function login(provider) {
    if (!state.probed) await probe();
    if (!state.serviceUp) return null;
    try {
      const persona = 'mobile-' + String(provider || 'guest').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 20);
      const result = await api('/api/auth/demo', { method: 'POST', body: { role: 'creator', persona } });
      state.sessionReady = true;
      state.me = result.me || null;
      return state.me;
    } catch (error) {
      state.sessionReady = false;
      return null;
    }
  }

  async function emailChallenge(email) {
    if (!state.probed) await probe();
    if (!state.serviceUp) return null;
    try { return await api('/api/auth/email/challenge', { method: 'POST', body: { email } }); }
    catch (error) { return { error: error.message, code: error.code }; }
  }

  async function emailVerify(email, code) {
    if (!state.serviceUp) return null;
    try {
      const result = await api('/api/auth/email/verify', { method: 'POST', body: { email, code } });
      state.sessionReady = true;
      state.me = result.me || null;
      return result;
    } catch (error) { return { error: error.message, code: error.code }; }
  }

  async function googleLocal(email, displayName) {
    if (!state.probed) await probe();
    if (!state.serviceUp) return null;
    try {
      const result = await api('/api/auth/google/local', { method: 'POST', body: { email, displayName } });
      state.sessionReady = true;
      state.me = result.me || null;
      return result;
    } catch (error) { return null; }
  }

  async function registerPlayable(key, title) {
    if (!state.sessionReady || !key) return null;
    if (state.mapping[key]) return state.mapping[key];
    if (!state.registering) {
      state.registering = api('/api/demo/mobile-playables', {
        method: 'POST',
        body: { playables: [{ key, title: title || key, contentType: 'game' }] },
      }).then(result => {
        Object.assign(state.mapping, result.mapping || {});
        state.registering = null;
        return state.mapping[key] || null;
      }).catch(() => { state.registering = null; return null; });
    }
    return state.registering;
  }

  async function startRuntime(key, title) {
    if (!state.sessionReady) return null;
    try {
      const contentId = await registerPlayable(key, title);
      if (!contentId) return null;
      const session = await api('/api/runtime/sessions', { method: 'POST', body: { contentId } });
      state.runtime = {
        key, contentId,
        token: session.sessionToken,
        rewardEligible: !!session.rewardEligible,
        sequence: 1, stepSent: false, done: false,
      };
      await sendEvent('playable_start', { key });
      return { contentId, rewardEligible: state.runtime.rewardEligible, server_confirmed: true };
    } catch (error) {
      state.runtime = null;
      return null;
    }
  }

  async function sendEvent(eventType, payload) {
    const runtime = state.runtime;
    if (!runtime || runtime.done) return null;
    const result = await api('/api/runtime/events', {
      method: 'POST',
      body: { sessionToken: runtime.token, sequence: runtime.sequence, eventType, payload: payload || {} },
    });
    runtime.sequence += 1;
    if (eventType === 'step_complete') runtime.stepSent = true;
    if (eventType === 'playable_complete') { runtime.done = true; state.lastReward = result; }
    return result;
  }

  async function step(payload) {
    const runtime = state.runtime;
    if (!runtime || runtime.done || runtime.stepSent || runtime.sequence !== 2) return null;
    try { return await sendEvent('step_complete', payload); }
    catch (error) { return null; }
  }

  async function complete(payload) {
    const runtime = state.runtime;
    if (!runtime || runtime.done) return null;
    try {
      if (!runtime.stepSent) await sendEvent('step_complete', { auto_forwarded: true });
      return await sendEvent('playable_complete', payload);
    } catch (error) {
      state.runtime = null;
      return null;
    }
  }

  async function engage(eventType, key, title) {
    if (!state.sessionReady || !key) return null;
    try {
      const contentId = await registerPlayable(key, title);
      if (!contentId) return null;
      const eventKey = `${eventType}:${key}:${new Date().toISOString().slice(0, 10)}`;
      const result = await api('/api/engagements', { method: 'POST', body: { eventType, contentId, eventKey } });
      return { ...result, server_confirmed: true };
    } catch (error) { return null; }
  }

  async function comment(key, title, body) {
    if (!state.sessionReady || !key) return null;
    try {
      const contentId = await registerPlayable(key, title);
      if (!contentId) return null;
      const result = await api(`/api/contents/${contentId}/comments`, { method: 'POST', body: { body } });
      return { ...result.comment, server_confirmed: true };
    } catch (error) { return null; }
  }

  async function follow(key, title) {
    if (!state.sessionReady || !key) return null;
    try {
      const contentId = await registerPlayable(key, title);
      if (!contentId) return null;
      const result = await api('/api/follows', { method: 'POST', body: { contentId } });
      return { ...result, server_confirmed: true };
    } catch (error) { return null; }
  }

  async function unfollow(key) {
    if (!state.sessionReady || !key || !state.mapping[key]) return null;
    try { return await api('/api/follows/remove', { method: 'POST', body: { contentId: state.mapping[key] } }); }
    catch (error) { return null; }
  }

  async function discover(query) {
    if (!state.sessionReady) return null;
    try {
      const suffix = query ? `?q=${encodeURIComponent(String(query).slice(0, 60))}` : '';
      const result = await api(`/api/discover${suffix}`);
      return Array.isArray(result.results) ? result.results : [];
    } catch (error) { return null; }
  }

  async function notifications() {
    if (!state.sessionReady) return null;
    try { return await api('/api/notifications'); }
    catch (error) { return null; }
  }

  async function readNotification(id) {
    if (!state.sessionReady || !id) return null;
    try { return await api(`/api/notifications/${id}/read`, { method: 'POST' }); }
    catch (error) { return null; }
  }

  async function readAllNotifications() {
    if (!state.sessionReady) return null;
    try { return await api('/api/notifications/read-all', { method: 'POST' }); }
    catch (error) { return null; }
  }

  async function socialSummary() {
    if (!state.sessionReady) return null;
    try { return await api('/api/social/summary'); }
    catch (error) { return null; }
  }

  async function checkIn() {
    if (!state.sessionReady) return null;
    try { return await api('/api/economy/check-in', { method: 'POST' }); }
    catch (error) { return null; }
  }

  async function creationConsume(usageType, idempotencyKey) {
    if (!state.sessionReady) return null;
    try { return await api('/api/economy/creation/consume', { method: 'POST', body: { usageType, units: 1, idempotencyKey } }); }
    catch (error) { return { error: error.message, code: error.code }; }
  }

  async function boostContent(contentId) {
    if (!state.sessionReady || !contentId) return null;
    try { return await api(`/api/contents/${contentId}/boost`, { method: 'POST' }); }
    catch (error) { return { error: error.message, code: error.code }; }
  }

  async function report(key, title, reason, details) {
    if (!state.sessionReady || !key) return null;
    try {
      const contentId = await registerPlayable(key, title);
      if (!contentId) return null;
      return await api('/api/content-reports', { method: 'POST', body: { contentId, reason, details } });
    } catch (error) { return null; }
  }

  async function deleteComment(commentId) {
    if (!state.sessionReady || !commentId) return null;
    try { return await api(`/api/comments/${commentId}`, { method: 'DELETE' }); }
    catch (error) { return null; }
  }

  async function listSessions() {
    if (!state.sessionReady) return null;
    try { return await api('/api/account/sessions'); }
    catch (error) { return null; }
  }

  async function revokeSession(id) {
    if (!state.sessionReady || !id) return null;
    try { return await api(`/api/account/sessions/${id}/revoke`, { method: 'POST' }); }
    catch (error) { return { error: error.message }; }
  }

  async function creatorApply(applicationNote, regionCode) {
    if (!state.sessionReady) return null;
    try { return await api('/api/creator-applications', { method: 'POST', body: { applicationNote, regionCode, kycConsent: true } }); }
    catch (error) { return { error: error.message, code: error.code }; }
  }

  async function ensureAgent() {
    if (!state.sessionReady) return null;
    const cacheKey = 'airvana.mobile.agent-id.' + ((state.me && state.me.id) || 'anon');
    try {
      const cached = root.localStorage && root.localStorage.getItem(cacheKey);
      if (cached) return cached;
    } catch (error) { /* 忽略存储异常 */ }
    try {
      const result = await api('/api/agents', { method: 'POST', body: { name: '移动端创作 Agent', description: '移动端快速创作管线', contentType: 'all', reviewMode: 'human', permissions: { draft: true } } });
      const agentId = result.agent && result.agent.id;
      try { if (agentId && root.localStorage) root.localStorage.setItem(cacheKey, agentId); } catch (error) { /* 忽略 */ }
      return agentId || null;
    } catch (error) { return null; }
  }

  async function createTask({ title, contentType, prompt, creationMode, idempotencyKey }) {
    if (!state.sessionReady) return null;
    try {
      const agentId = await ensureAgent();
      if (!agentId) return null;
      return await api('/api/tasks', { method: 'POST', body: { agentId, title, contentType, prompt, creationMode, idempotencyKey } });
    } catch (error) { return { error: error.message, code: error.code }; }
  }

  async function taskStatus(taskId) {
    if (!state.sessionReady || !taskId) return null;
    try { return await api(`/api/tasks/${taskId}`); }
    catch (error) { return null; }
  }

  async function reviewTask(taskId, decision, note) {
    if (!state.sessionReady || !taskId) return null;
    try { return await api(`/api/tasks/${taskId}/review`, { method: 'POST', body: { decision, note: note || '' } }); }
    catch (error) { return { error: error.message, code: error.code }; }
  }

  async function publishContent(contentId) {
    if (!state.sessionReady || !contentId) return null;
    try { return await api(`/api/contents/${contentId}/publish`, { method: 'POST' }); }
    catch (error) { return { error: error.message, code: error.code }; }
  }

  async function dmConversations() {
    if (!state.sessionReady) return null;
    try { return await api('/api/dm/conversations'); } catch (error) { return null; }
  }
  async function dmOpen(target) {
    if (!state.sessionReady) return null;
    try { return await api('/api/dm/conversations', { method: 'POST', body: target }); }
    catch (error) { return { error: error.message, code: error.code }; }
  }
  async function dmMessages(conversationId) {
    if (!state.sessionReady || !conversationId) return null;
    try { return await api(`/api/dm/conversations/${conversationId}/messages`); } catch (error) { return null; }
  }
  async function dmSend(conversationId, body) {
    if (!state.sessionReady || !conversationId) return null;
    try { return await api(`/api/dm/conversations/${conversationId}/messages`, { method: 'POST', body: { body } }); }
    catch (error) { return { error: error.message, code: error.code }; }
  }
  async function dmRecall(messageId) {
    if (!state.sessionReady || !messageId) return null;
    try { return await api(`/api/dm/messages/${messageId}/recall`, { method: 'POST' }); }
    catch (error) { return { error: error.message, code: error.code }; }
  }
  async function supportCreate(category, subject, body) {
    if (!state.sessionReady) return null;
    try { return await api('/api/support-tickets', { method: 'POST', body: { category, subject, body } }); }
    catch (error) { return { error: error.message, code: error.code }; }
  }
  async function supportTickets() {
    if (!state.sessionReady) return null;
    try { return await api('/api/support-tickets'); } catch (error) { return null; }
  }
  async function growthNodes() {
    if (!state.sessionReady) return null;
    try { return await api('/api/growth-nodes'); } catch (error) { return null; }
  }
  async function growthCreate(name) {
    if (!state.sessionReady) return null;
    try { return await api('/api/growth-nodes', { method: 'POST', body: { name } }); }
    catch (error) { return { error: error.message, code: error.code }; }
  }
  async function growthJoin(inviteCode) {
    if (!state.sessionReady) return null;
    try { return await api('/api/growth-nodes/join', { method: 'POST', body: { inviteCode } }); }
    catch (error) { return { error: error.message, code: error.code }; }
  }

  async function assetList() {
    if (!state.sessionReady) return null;
    try { return await api('/api/assets'); } catch (error) { return null; }
  }
  async function assetRegister(payload) {
    if (!state.sessionReady) return null;
    try { return await api('/api/assets', { method: 'POST', body: payload }); }
    catch (error) { return { error: error.message, code: error.code }; }
  }
  async function assetRevoke(assetId) {
    if (!state.sessionReady || !assetId) return null;
    try { return await api(`/api/assets/${assetId}/revoke`, { method: 'POST' }); }
    catch (error) { return { error: error.message, code: error.code }; }
  }
  async function assetAttach(contentId, assetId, usage) {
    if (!state.sessionReady || !contentId || !assetId) return null;
    try { return await api(`/api/contents/${contentId}/assets`, { method: 'POST', body: { assetId, usage } }); }
    catch (error) { return { error: error.message, code: error.code }; }
  }
  async function remixContent(contentId) {
    if (!state.sessionReady || !contentId) return null;
    try { return await api(`/api/contents/${contentId}/remix`, { method: 'POST' }); }
    catch (error) { return { error: error.message, code: error.code }; }
  }
  async function twinGet() {
    if (!state.sessionReady) return null;
    try { return await api('/api/ai-twin'); } catch (error) { return null; }
  }
  async function twinSave(payload) {
    if (!state.sessionReady) return null;
    try { return await api('/api/ai-twin', { method: 'POST', body: payload }); }
    catch (error) { return { error: error.message, code: error.code }; }
  }
  async function twinToggle(action) {
    if (!state.sessionReady) return null;
    try { return await api(`/api/ai-twin/${action}`, { method: 'POST' }); }
    catch (error) { return null; }
  }
  async function minorPolicy() {
    if (!state.probed) await probe();
    if (!state.serviceUp) return null;
    try { return await api('/api/policies/minor-mode'); } catch (error) { return null; }
  }
  async function subscriptionPlans() {
    if (!state.sessionReady) return null;
    try { return await api('/api/economy/plans'); } catch (error) { return null; }
  }

  function abandonRuntime() {
    state.runtime = null;
  }

  async function resume() {
    if (!httpContext()) { state.probed = true; state.serviceUp = false; return false; }
    try {
      const response = await fetch('/api/bootstrap', { credentials: 'include' });
      state.probed = true;
      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        state.serviceUp = true;
        state.sessionReady = true;
        state.me = data.me || null;
        return true;
      }
      state.serviceUp = response.status === 401;
      state.sessionReady = false;
      return false;
    } catch (error) {
      state.probed = true;
      state.serviceUp = false;
      state.sessionReady = false;
      return false;
    }
  }

  root.AirvanaLocalApiBridge = {
    state, probe, login, resume, emailChallenge, emailVerify, googleLocal, registerPlayable, engage, comment, follow, unfollow, discover, notifications, readNotification, readAllNotifications, socialSummary, checkIn, creationConsume, boostContent, report, deleteComment, listSessions, revokeSession, creatorApply, ensureAgent, createTask, taskStatus, reviewTask, publishContent, dmConversations, dmOpen, dmMessages, dmSend, dmRecall, supportCreate, supportTickets, growthNodes, growthCreate, growthJoin, assetList, assetRegister, assetRevoke, assetAttach, remixContent, twinGet, twinSave, twinToggle, minorPolicy, subscriptionPlans, startRuntime, step, complete, abandonRuntime,
    get ready() { return state.serviceUp && state.sessionReady; },
  };

  // 页面加载即尝试用现有 HttpOnly 会话恢复；失败静默，保持本地演示。
  if (httpContext()) resume().catch(() => {});
})(typeof window !== 'undefined' ? window : globalThis);
