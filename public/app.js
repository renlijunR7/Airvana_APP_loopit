import { campaignWindowState, createDialogManager, downloadCsv, splitList } from './ui.js';

const app = document.querySelector('#app');
const modalRoot = document.querySelector('#modal-root');
const toastEl = document.querySelector('#toast');
const deviceId = localStorage.airvana_device_id || (localStorage.airvana_device_id = crypto.randomUUID());
const state = { data: null, dataSignature: '', pendingData: null, pendingDataSignature: '', view: 'dashboard', loginRole: 'creator', loading: true, poller: null, refreshInFlight: null, refreshError: '', searchResults: null, mobileMore: false, settlementFilter: 'all', notificationFilter: 'all' };

const LABELS = {
  creator: '创作者', brand: '品牌方', admin: '平台审核', game: '互动游戏', video: '互动故事', article: '文章', all: '全部类型',
  active: '进行中', paused: '已暂停', archived: '已归档', queued: '排队中', running: '运行中', review_pending: '待人工审核', approved: '已批准',
  rejected: '已拒绝', failed: '失败', cancelled: '已取消', generating: '生成中', generation_failed: '生成失败', draft: '草稿', scheduled: '定时发布', published: '已发布',
  not_run: '未审核', passed: '审核通过', blocked: '审核阻止', pending_review: '平台审核中', submitted: '已提交', changes_requested: '需要修改', eligible: '已获得资格',
  pending_application: '申请审核中', invited: '待接受邀请', pending: '待处理', payment_pending: '平台复核中', platform_approved: '平台已批准', issued: '已发放', completed: '已完成', verified: '已验证', open: '待处理', resolved: '已处理', confirmed: '风险确认', dismissed: '已排除', frozen: '已冻结', revoked: '已撤销', expired: '已过期', AIP: 'AIP 行为积分', AIT: 'AIT Campaign 积分',
  ready: '已就绪', local: '本地生成服务', openai: '外部 AI 生成服务', restored: '已恢复为草稿', upheld: '维持下架', brand_confirmed: '品牌已确认',
  campaign: 'Campaign', deliverable: '交付', settlement: '结算', organization: '组织', account: '账户', brand_voice: '品牌语气', audience: '受众偏好', constraint: '约束', learning: '历史学习',
};
const label = value => LABELS[value] || value || '—';
const esc = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
const fmtDate = value => value ? new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '—';
const fmtStat = value => typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : esc(value);
const toLocalInput = value => value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : '';
const status = value => `<span class="status ${esc(value)}">${esc(label(value))}</span>`;
const empty = (title, text) => `<div class="empty"><strong>${esc(title)}</strong>${esc(text)}</div>`;

function toast(message, type = '') {
  toastEl.textContent = message;
  toastEl.className = `toast show ${type}`;
  toastEl.setAttribute('role', type === 'error' ? 'alert' : 'status');
  clearTimeout(toastEl._timer);
  toastEl._timer = setTimeout(() => toastEl.className = 'toast', 2800);
}

const { openDialog } = createDialogManager(modalRoot);

function stopPolling() {
  clearTimeout(state.poller);
  state.poller = null;
}

function isUserEditing() {
  const active = document.activeElement;
  return active instanceof HTMLElement
    && (app.contains(active) || modalRoot.contains(active))
    && active.matches('input, textarea, select, [contenteditable="true"]');
}

function applyPendingData() {
  if (!state.pendingData || isUserEditing()) return;
  state.data = state.pendingData;
  state.dataSignature = state.pendingDataSignature;
  state.pendingData = null;
  state.pendingDataSignature = '';
  shell();
}

function schedulePolling(hasActiveTasks) {
  stopPolling();
  if (!hasActiveTasks) return;
  state.poller = setTimeout(() => {
    state.poller = null;
    refresh({ silent: true, background: true });
  }, 900);
}

async function copyCurrentLoginLink() {
  await navigator.clipboard.writeText(location.href);
  toast('登录链接已复制');
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    ...options,
    headers: { 'Content-Type': 'application/json', 'X-Airvana-Device': deviceId, ...(options.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error?.message || `请求失败：${response.status}`);
    error.status = response.status;
    throw error;
  }
  return body;
}

function loading(text = '加载 Airvana 工作区') {
  app.innerHTML = `<div class="loading"><div><div class="spinner"></div>${esc(text)}</div></div>`;
}

function refreshFailureMessage(error) {
  if (Number(error?.status) >= 500) return `服务暂时不可用（${error.status}），请稍后重试。`;
  if (error?.status) return `数据刷新失败：${error.message}`;
  return '网络连接失败，请检查网络后重试。';
}

function refreshStatusMarkup() {
  if (!state.refreshError) return '';
  return `<div class="card" role="alert" style="margin:0 0 14px;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;gap:14px"><div><strong>数据可能不是最新</strong><p class="muted" style="margin:4px 0 0;font-size:12px">${esc(state.refreshError)} 当前显示上次成功数据。</p></div><button class="btn small soft" data-action="refresh-retry">重试刷新</button></div>`;
}

function updateRefreshStatus() {
  const statusRoot = document.querySelector('#refresh-status');
  if (statusRoot) statusRoot.innerHTML = refreshStatusMarkup();
}

function refreshFailureView(message) {
  app.innerHTML = `<div class="loading"><div><strong>暂时无法刷新工作区</strong><p class="muted" style="margin:8px 0 14px">${esc(message)}</p><button class="btn small primary" data-action="refresh-retry">重试刷新</button></div></div>`;
}

function loginView() {
  state.data = null;
  state.dataSignature = '';
  state.pendingData = null;
  state.pendingDataSignature = '';
  state.refreshError = '';
  app.innerHTML = `<main class="login">
    <section class="login-hero">
      <div class="logo"><span class="logo-mark">A</span>airvana.ai</div>
      <div class="hero-copy">
        <div class="eyebrow">内容驱动的 Agent World</div>
        <h1>让内容成为<br><em>Agent 的行动结果</em></h1>
        <p>从安全约束、真实任务运行到内容发布、Campaign 交付与双积分账本，每个状态都可验证、可审核、可追溯。</p>
      </div>
      <div class="hero-grid">
        <div class="hero-chip"><strong>Agent 运行管线</strong>队列、权限、审核、版本</div>
        <div class="hero-chip"><strong>信任账本</strong>AIP / AIT 独立记账</div>
        <div class="hero-chip"><strong>Campaign 工作台</strong>品牌合同、交付、审批</div>
      </div>
    </section>
    <section class="login-panel"><div class="login-card">
      <div class="eyebrow">数字钱包身份工作区</div>
      <h2>进入你的内容世界</h2>
      <p class="muted">选择身份后使用数字钱包签名登录。签名不会触发链上交易，也不会申请资产转移权限。</p>
      <div class="role-switch" role="group" aria-label="登录身份">
        <button data-action="login-role" data-role="creator" class="${state.loginRole === 'creator' ? 'active' : ''}">创作者</button>
        <button data-action="login-role" data-role="brand" class="${state.loginRole === 'brand' ? 'active' : ''}">品牌方</button>
      </div>
      <button class="btn wallet-btn" data-action="wallet-login">连接浏览器钱包并签名</button>
      <button class="btn ghost" data-action="wallet-options">使用手机钱包打开</button>
      <div id="login-status" class="login-status" role="status" aria-live="polite"></div>
      <div class="login-separator">本地开发验收入口</div>
      <div class="demo-grid">
        <button class="btn ghost" data-action="demo-login" data-role="creator">创作者</button>
        <button class="btn ghost" data-action="demo-login" data-role="brand">品牌方</button>
        <button class="btn ghost" data-action="demo-login" data-role="admin">平台审核</button>
      </div>
      <p class="login-note">开发入口只在 ALLOW_DEMO_AUTH 启用时可用；生产环境应关闭。钱包地址只用于身份验证，不代表 AIP/AIT 可交易或可兑换。</p>
    </div></section>
  </main>`;
}

const NAV = {
  creator: [['dashboard','◫','概览'],['factory','✦','内容工厂'],['agents','◉','Agent'],['contents','▤','内容与发布'],['tasks','◷','任务审核'],['campaigns','◇','Campaign'],['ledger','◎','积分账本'],['account','⚙','账户']],
  brand: [['dashboard','◫','概览'],['campaigns','◇','Campaign 工作台'],['deliverables','✓','交付审批'],['settlements','◎','AIT 结算'],['account','⚙','账户']],
  admin: [['dashboard','◫','审核概览'],['campaigns','◇','Campaign 审核'],['deliverables','✓','交付记录'],['settlements','◎','结算复核'],['governance','⚑','信任与风控'],['account','⚙','账户']],
};

function shell() {
  const { me, ai } = state.data;
  const nav = NAV[me.role];
  const current = nav.find(item => item[0] === state.view) || nav[0];
  const primaryNav = nav.slice(0, 4);
  const moreNav = nav.slice(4);
  app.innerHTML = `<div class="shell">
    <aside class="sidebar">
      <div class="logo"><span class="logo-mark">A</span>airvana.ai</div>
      <div class="role-pill">当前工作区：<strong>${esc(label(me.role))}</strong></div>
      <nav class="nav desktop-nav" aria-label="工作区主导航">${nav.map(([id,icon,text]) => `<button data-action="nav" data-view="${id}" class="${state.view === id ? 'active' : ''}"><span class="icon">${icon}</span>${esc(text)}</button>`).join('')}</nav>
      <div class="side-bottom">
        <div class="side-user"><div class="avatar">${esc(me.displayName.slice(0,1))}</div><div><strong>${esc(me.displayName)}</strong><span>${esc(me.walletAddress || me.email || '开发会话')}</span></div></div>
        <button class="btn ghost small" data-action="logout">退出登录</button>
      </div>
    </aside>
    <main class="main">
      <header class="topbar"><div><div class="eyebrow">${esc(label(me.role))}工作区</div><h1>${esc(current[2])}</h1><div class="muted" style="font-size:12px">服务端数据 · 权限校验 · 审计留痕</div></div><div class="provider"><span class="dot"></span>${ai.external ? '外部 AI 生成服务' : '本地生成服务'} · ${esc(ai.model)}</div></header>
      <div id="refresh-status">${refreshStatusMarkup()}</div>
      <div id="view">${renderView()}</div>
    </main>
    <nav class="mobile-nav" aria-label="移动端主导航">${primaryNav.map(([id,icon,text]) => `<button data-action="nav" data-view="${id}" class="${state.view === id ? 'active' : ''}"><span class="icon">${icon}</span><span>${esc(text)}</span></button>`).join('')}<button data-action="more-nav" class="${moreNav.some(item=>item[0]===state.view)||state.mobileMore?'active':''}" aria-expanded="${state.mobileMore}" aria-controls="mobile-more-menu"><span class="icon">•••</span><span>更多</span></button></nav>
    ${state.mobileMore?`<div class="mobile-more-backdrop" data-action="more-nav"><div id="mobile-more-menu" class="mobile-more-menu" role="dialog" aria-modal="true" aria-label="更多导航" data-stop-click><div class="section-head"><h2>更多功能</h2><button class="btn small ghost" data-action="more-nav" aria-label="关闭更多导航">关闭</button></div>${moreNav.map(([id,icon,text])=>`<button data-action="nav" data-view="${id}" class="${state.view===id?'active':''}"><span class="icon">${icon}</span>${esc(text)}</button>`).join('')}<button class="danger-link" data-action="logout">退出登录</button></div></div>`:''}
  </div>`;
}

function renderView() {
  const role = state.data.me.role;
  if (state.view === 'dashboard') return dashboardView();
  if (state.view === 'factory') return factoryView();
  if (state.view === 'agents') return agentsView();
  if (state.view === 'contents') return contentsView();
  if (state.view === 'tasks') return tasksView();
  if (state.view === 'campaigns') return campaignsView(role);
  if (state.view === 'deliverables') return deliverablesView();
  if (state.view === 'settlements') return settlementsView();
  if (state.view === 'ledger') return ledgerView();
  if (state.view === 'governance') return governanceView();
  if (state.view === 'account') return accountView();
  return dashboardView();
}

function dashboardView() {
  const d = state.data;
  const role = d.me.role;
  const cards = role === 'creator'
    ? [['AIP',d.points.AIP,'当前可用行为积分'],['AIT',d.points.AIT,'已发放 Campaign 积分'],['运行任务',d.stats.activeTasks,'含待人工审核'],['已发布',d.stats.publishedContents,'通过审核的内容']]
    : role === 'brand'
      ? [['Campaign',d.campaigns.length,'全部 Campaign'],['待审批',d.stats.pendingDeliverables,'创作者交付'],['待发放',d.settlements.filter(x=>x.status==='payment_pending').length,'AIT 结算'],['已发放',d.settlements.filter(x=>x.status==='issued').reduce((n,x)=>n+x.amount,0),'累计 AIT']]
      : [['待审 Campaign',d.campaigns.filter(x=>x.status==='pending_review').length,'平台策略审核'],['全部 Campaign',d.campaigns.length,'审计范围'],['交付记录',d.deliverables.length,'只读监督'],['AI 生成服务',d.ai.external?'外部':'本地','运行环境']];
  const recent = role === 'creator' ? d.tasks.slice(0,5).map(taskRow).join('') : d.campaigns.slice(0,5).map(campaignRow).join('');
  return `<div class="grid cols-4">${cards.map((x,i)=>`<div class="card stat ${i===0?'accent':''}"><div class="label">${esc(x[0])}</div><div class="value">${fmtStat(x[1])}</div><div class="hint">${esc(x[2])}</div></div>`).join('')}</div>
    <section class="section"><div class="section-head"><h2>${role==='creator'?'最近的 Agent 任务':'最近的 Campaign'}</h2><span>实时读取服务端状态</span></div><div class="list">${recent || empty('暂时没有记录','创建第一条业务记录后会显示在这里')}</div></section>
    <section class="section"><div class="grid cols-3"><div class="card"><div class="eyebrow">权威状态</div><h3>服务端唯一权威</h3><p class="muted" style="font-size:12px;line-height:1.7">发布、奖励、审批与结算不能由浏览器直接改变。</p></div><div class="card"><div class="eyebrow">审计记录</div><h3>关键动作全程留痕</h3><p class="muted" style="font-size:12px;line-height:1.7">任务、审核、发布和账本事件均具有独立 ID。</p></div><div class="card"><div class="eyebrow">产品边界</div><h3>AIP / AIT 两套账本</h3><p class="muted" style="font-size:12px;line-height:1.7">均为平台积分记录，不承诺现金、USDT 或交易价值。</p></div></div></section>`;
}

function factoryView() {
  const active = state.data.agents.filter(a=>a.status==='active'&&a.permissions.draft);
  return `<div class="grid cols-2">
    <form class="form-card" data-form="create-task"><div class="eyebrow">Agent 运行管线</div><h2>创建内容任务</h2><p>提交后由服务端队列运行，生成结果先通过安全审核，再根据 Agent 设置进入人工审核或草稿。</p>
      <div class="form-grid"><div class="field"><label for="task-agent">执行 Agent</label><select id="task-agent" name="agentId" required>${active.map(a=>`<option value="${a.id}">${esc(a.name)} · ${esc(label(a.contentType))}</option>`).join('')}</select></div><div class="field"><label for="task-type">内容类型</label><select id="task-type" name="contentType"><option value="game">互动游戏</option><option value="video">互动故事</option><option value="article">文章</option></select></div><div class="field full"><label for="task-title">内容标题</label><input id="task-title" name="title" maxlength="80" required placeholder="例如：60 秒保护数字钱包挑战"></div><div class="field full"><label for="task-prompt">创作目标与约束</label><textarea id="task-prompt" name="prompt" required maxlength="3000" placeholder="目标受众、核心信息、互动方式、必须遵守的品牌边界……"></textarea></div></div>
      <div class="form-actions"><button class="btn primary" ${active.length?'':'disabled'}>${active.length?'提交到运行队列':'没有可用 Agent'}</button></div></form>
    <div><div class="section-head"><h2>实时任务</h2><span>自动刷新</span></div><div class="list">${state.data.tasks.slice(0,6).map(taskRow).join('') || empty('还没有任务','创建内容任务后会显示运行进度')}</div></div>
  </div>`;
}

function taskRow(t) {
  const content = state.data.contents.find(c=>c.id===t.contentId);
  return `<div class="list-row"><div><h3>${esc(content?.title || '内容任务')}</h3><p>${esc(t.prompt)}</p><div class="progress"><span style="width:${Number(t.progress)}%"></span></div></div><div>${status(t.status)}<p style="margin-top:5px">${esc(label(t.provider))}</p></div><div><strong>${t.progress}%</strong><p>${fmtDate(t.updatedAt)}</p></div><div class="row-actions"><button class="btn small soft" data-action="task-trace" data-id="${t.id}">运行记录</button>${t.status==='review_pending'?`<button class="btn small primary" data-action="task-review" data-id="${t.id}" data-decision="approve">批准</button><button class="btn small danger" data-action="task-review" data-id="${t.id}" data-decision="reject">拒绝</button>`:''}${['queued','running'].includes(t.status)?`<button class="btn small danger" data-action="task-cancel" data-id="${t.id}">取消</button>`:''}${['failed','rejected','cancelled'].includes(t.status)?`<button class="btn small" data-action="task-retry" data-id="${t.id}">重试</button>`:''}</div></div>`;
}

function agentsView() {
  return `<div class="grid cols-3">${state.data.agents.map(a=>{const memories=(state.data.agentMemories||[]).filter(m=>m.agentId===a.id);return `<div class="card agent-card"><div class="agent-head"><div class="agent-icon">✦</div><div><h3>${esc(a.name)}</h3><p>${esc(label(a.contentType))} · ${esc(label(a.reviewMode==='human'?'review_pending':'approved'))}</p></div><div style="margin-left:auto">${status(a.status)}</div></div><p class="muted" style="font-size:12px;line-height:1.6">${esc(a.description||'暂无说明')}</p><div class="chips">${Object.entries(a.permissions).filter(([,v])=>v).map(([k])=>`<span class="chip">${esc({draft:'生成草稿',readAnalytics:'读取数据',useBrandAssets:'品牌素材',publish:'自动发布'}[k]||k)}</span>`).join('')||'<span class="chip">无执行权限</span>'}</div><div class="memory-list">${memories.map(m=>`<div class="memory-item"><div><strong>${esc(label(m.memoryType))} · P${m.priority}</strong><p>${esc(m.content)}</p><span>${esc(m.source)} · ${fmtDate(m.updatedAt)}</span></div><div class="row-actions"><button class="btn small soft" data-action="agent-memory-edit" data-id="${m.id}">编辑</button><button class="btn small danger" data-action="agent-memory-delete" data-id="${m.id}">删除</button></div></div>`).join('')||'<p class="muted">尚未添加品牌语气、受众或约束记忆。</p>'}</div><div class="row-actions"><button class="btn small soft" data-action="agent-memory" data-id="${a.id}">添加记忆</button><button class="btn small ${a.status==='active'?'danger':'soft'}" data-action="agent-status" data-id="${a.id}" data-status="${a.status==='active'?'paused':'active'}">${a.status==='active'?'暂停':'恢复'}</button></div></div>`}).join('')}
    <form class="form-card" data-form="create-agent"><div class="eyebrow">Agent 权限注册表</div><h2>新建 Agent</h2><p>自动发布在 MVP 中始终关闭；内容必须经过明确发布动作。</p><div class="form-grid"><div class="field"><label for="agent-name">名称</label><input id="agent-name" name="name" required maxlength="40"></div><div class="field"><label for="agent-type">内容类型</label><select id="agent-type" name="contentType"><option value="all">全部</option><option value="game">互动游戏</option><option value="video">互动故事</option><option value="article">文章</option></select></div><div class="field full"><label for="agent-desc">职责说明</label><input id="agent-desc" name="description" maxlength="160"></div><div class="field full"><label for="agent-prompt">系统约束</label><textarea id="agent-prompt" name="systemPrompt" maxlength="1200"></textarea></div><div class="field"><label for="review-mode">审核模式</label><select id="review-mode" name="reviewMode"><option value="human">人工审核</option><option value="auto">规则通过后进入草稿</option></select></div><div class="field"><label>权限</label><div class="checks"><label class="check"><input name="draft" type="checkbox" checked>生成草稿</label><label class="check"><input name="readAnalytics" type="checkbox" checked>读取数据</label><label class="check"><input name="useBrandAssets" type="checkbox">品牌素材</label></div></div></div><div class="form-actions"><button class="btn primary">创建 Agent</button></div></form>
  </div>`;
}

function contentsView() {
  const rows = state.data.contents.map(contentRow).join('');
  const feed = state.searchResults || state.data.feed || [];
  return `<section><div class="section-head"><h2>我的内容生命周期</h2><span>生成 → 审核 → 成品构建 → 定时/发布 → 归档</span></div><div class="list">${rows || empty('还没有内容','前往内容工厂创建第一条任务')}</div></section>
    <section class="section"><div class="section-head"><h2>内容广场 · 运行时证明</h2><span>完整体验事件顺序验证后才产生 AIP</span></div><form class="card" data-form="discover" style="display:grid;grid-template-columns:1fr 150px auto;gap:8px;margin-bottom:12px"><input name="q" placeholder="搜索内容或创作者"><select name="type"><option value="">全部类型</option><option value="game">互动游戏</option><option value="video">互动故事</option><option value="article">文章</option></select><button class="btn">搜索</button></form><div class="grid cols-3">${feed.map(c=>`<div class="card"><div class="eyebrow">${esc(label(c.contentType))}${c.boostedUntil?' · AIP 推广中':''}</div><h3>${esc(c.title)}</h3><p class="muted" style="font-size:12px">创作者：${esc(c.authorName)}</p><div class="row-actions"><a class="btn small" href="/content/${c.id}" target="_blank" rel="noopener">打开成品</a><button class="btn small danger" data-action="report-content" data-id="${c.id}">举报</button></div></div>`).join('') || empty('暂无匹配内容','调整搜索条件或等待其他创作者发布')}</div></section>`;
}

function contentRow(c) {
  const moderation = c.moderation?.checks?.flatMap(x=>x.hits||[]) || [];
  const artifact = (state.data.artifacts||[]).find(a=>a.contentId===c.id&&a.version===c.currentVersion);
  const boost = (state.data.activeBoosts||[]).find(x=>x.contentId===c.id);
  const appeal = (state.data.contentAppeals||[]).find(x=>x.contentId===c.id&&x.status==='open');
  const appealable = (state.data.appealableContentIds||[]).includes(c.id);
  const canBoost = Number(state.data.points.AIP) >= 20;
  return `<div class="list-row"><div><h3>${esc(c.title)}</h3><p>${esc(label(c.contentType))} · v${c.currentVersion} · ${artifact?`成品 ${label(artifact.status)}`:'尚未构建'}${boost?` · 推广至 ${fmtDate(boost.expiresAt)}`:''}${moderation.length?` · ${moderation.map(x=>esc(x.label||x)).join('、')}`:''}</p></div><div>${status(c.status)}</div><div>${appeal?status('open'):status(c.moderationStatus)}<p>${appeal?'申诉待平台复核':fmtDate(c.updatedAt)}</p></div><div class="row-actions">${artifact?`<a class="btn small soft" href="${c.status==='published'?'/content':'/preview'}/${c.id}" target="_blank" rel="noopener">预览成品</a>`:''}${c.currentVersion>0?`<button class="btn small soft" data-action="content-versions" data-id="${c.id}">版本</button>`:''}${['draft','rejected'].includes(c.status)?`<button class="btn small soft" data-action="content-edit" data-id="${c.id}">编辑</button>`:''}${c.status==='draft'?`<button class="btn small primary" data-action="publish" data-id="${c.id}">立即发布</button><button class="btn small soft" data-action="schedule" data-id="${c.id}">定时</button>`:''}${c.status==='published'&&!boost?`<button class="btn small" data-action="content-boost" data-id="${c.id}" ${canBoost?'':'disabled'}>${canBoost?'推广 24h · 20 AIP':'AIP 不足（需 20）'}</button>`:''}${appealable&&!appeal?`<button class="btn small" data-action="content-appeal" data-id="${c.id}">提交下架申诉</button>`:''}${['published','scheduled'].includes(c.status)?`<button class="btn small danger" data-action="archive" data-id="${c.id}">归档</button>`:''}</div></div>`;
}

function tasksView() {
  return `<div class="list">${state.data.tasks.map(taskRow).join('') || empty('没有任务记录','内容工厂创建的任务会在这里等待审核')}</div>`;
}

function campaignRow(c) {
  return `<div class="list-row"><div><h3>${esc(c.title)}</h3><p>${esc(c.objective)}</p></div><div>${status(c.status)}</div><div><strong>${Number(c.budgetAit).toLocaleString()} AIT</strong><p>${fmtDate(c.endsAt)} 截止</p></div><div></div></div>`;
}

function campaignsView(role) {
  if (role === 'brand') return brandCampaigns();
  if (role === 'admin') return adminCampaigns();
  return creatorCampaigns();
}

function brandCampaigns() {
  return `<div class="card" style="margin-bottom:16px"><div class="eyebrow">品牌组织</div><h3>${esc(state.data.organization?.name||'品牌组织')}</h3><p class="muted" style="font-size:12px">组织状态：${esc(label(state.data.organization?.verificationStatus||'pending_review'))}。只有已验证组织可以提交 Campaign 平台审核。</p><div class="row-actions" style="justify-content:flex-start"><button class="btn small soft" data-action="demo-seed">载入标注演示工作流</button></div></div><div class="grid cols-2"><form class="form-card" data-form="create-campaign"><div class="eyebrow">Campaign 合同</div><h2>创建品牌 Campaign</h2><p>预算、奖励、地区、声明与成功指标属于锁定字段；Agent 只能优化明确授权的内容字段。</p><div class="form-grid"><div class="field full"><label for="camp-title">名称</label><input id="camp-title" name="title" required maxlength="100"></div><div class="field full"><label for="camp-obj">业务目标</label><textarea id="camp-obj" name="objective" required maxlength="500"></textarea></div><div class="field full"><label for="camp-audience">目标受众</label><textarea id="camp-audience" name="audience" required maxlength="800"></textarea></div><div class="field"><label for="camp-channel">分发渠道</label><input id="camp-channel" name="channel" required maxlength="120" placeholder="内容广场 / KOL 渠道"></div><div class="field"><label for="camp-goal">转化目标</label><input id="camp-goal" name="conversionGoal" required maxlength="500"></div><div class="field full"><label for="camp-metric">成功指标</label><input id="camp-metric" name="successMetric" required maxlength="500" placeholder="例如：有效完成率与 CTA 打开率"></div><div class="field"><label for="camp-cta-label">CTA 文案</label><input id="camp-cta-label" name="ctaLabel" maxlength="60"></div><div class="field"><label for="camp-cta-url">CTA 链接</label><input id="camp-cta-url" name="ctaUrl" type="url" placeholder="https://"></div><div class="field"><label for="camp-budget">AIT 预算</label><input id="camp-budget" type="number" min="1" name="budgetAit" value="5000" required></div><div class="field"><label for="camp-reward">单份交付 AIT</label><input id="camp-reward" type="number" min="1" name="rewardAit" value="500" required></div><div class="field"><label for="camp-start">开始时间</label><input id="camp-start" type="datetime-local" name="startsAt" required></div><div class="field"><label for="camp-end">结束时间</label><input id="camp-end" type="datetime-local" name="endsAt" required></div><div class="field full"><label for="camp-regions">投放地区（逗号分隔）</label><input id="camp-regions" name="regions" value="Global" required maxlength="240"></div><div class="field full"><label>允许内容类型</label><div class="checks"><label class="check"><input type="checkbox" name="game" checked>互动游戏</label><label class="check"><input type="checkbox" name="video">互动故事</label><label class="check"><input type="checkbox" name="article">文章</label></div></div><div class="field full"><label for="camp-assets">品牌素材（每行一个）</label><textarea id="camp-assets" name="brandAssets"></textarea></div><div class="field full"><label for="camp-opt">Agent 可优化字段（每行一个）</label><textarea id="camp-opt" name="optimizableFields" placeholder="标题&#10;开场 Hook&#10;互动顺序"></textarea></div><div class="field full"><label for="camp-req">交付要求</label><textarea id="camp-req" name="deliverableRequirements" required></textarea></div><div class="field full"><label for="camp-allow">允许的品牌声明</label><input id="camp-allow" name="allowedClaims"></div><div class="field full"><label for="camp-ban">禁止表达</label><input id="camp-ban" name="prohibitedClaims" value="收益保证、诱导转账、索取私钥或助记词"></div></div><div class="form-actions"><button class="btn primary">保存 Campaign 草稿</button></div></form>
    <div><div class="section-head"><h2>我的 Campaign</h2><span>需平台审核后上线</span></div><div class="grid">${state.data.campaigns.map(c=>campaignCard(c,'brand')).join('') || empty('还没有 Campaign','创建品牌 Campaign 合同')}</div></div></div><section class="section"><div class="section-head"><h2>创作者申请</h2><span>品牌审核后获得交付资格</span></div><div class="list">${(state.data.participants||[]).map(participantRow).join('')||empty('暂无申请','Campaign 上线后创作者可以提交参加申请')}</div></section>`;
}

function campaignCard(c, role) {
  const b = c.brief || {};
  const availability = campaignWindowState(c);
  const metrics=(state.data.attribution||[]).find(x=>x.campaignId===c.id)||{impression:0,playable_start:0,playable_complete:0};
  const budget=c.budgetSummary||{total:Number(c.budgetAit)||0,committed:0,issued:0,remaining:Number(c.budgetAit)||0};
  const startRate=metrics.impression?Math.round(metrics.playable_start/metrics.impression*100):0;
  const completeRate=metrics.playable_start?Math.round(metrics.playable_complete/metrics.playable_start*100):0;
  return `<div class="card campaign-card"><div style="display:flex;justify-content:space-between">${status(c.status)}<span class="muted" style="font-size:10px">${fmtDate(c.endsAt)} 截止</span></div><h3>${esc(c.title)}</h3><p>${esc(c.objective)}</p><div class="campaign-meta"><div class="meta"><span>总预算</span><strong>${Number(budget.total).toLocaleString()} AIT</strong></div><div class="meta"><span>已承诺</span><strong>${Number(budget.committed).toLocaleString()} AIT</strong></div><div class="meta"><span>可用余额</span><strong>${Number(budget.remaining).toLocaleString()} AIT</strong></div></div><div class="campaign-meta"><div class="meta"><span>归因访问</span><strong>${metrics.impression}</strong></div><div class="meta"><span>开始率</span><strong>${startRate}%</strong></div><div class="meta"><span>完成率</span><strong>${completeRate}%</strong></div></div><div class="campaign-contract"><div><strong>受众：</strong>${esc(b.audience||'—')}</div><div><strong>渠道 / 转化：</strong>${esc(b.channel||'—')} · ${esc(b.conversionGoal||'—')}</div><div><strong>成功指标：</strong>${esc(b.successMetric||'—')}</div><div><strong>CTA：</strong>${esc(b.ctaLabel||'—')}${b.ctaUrl?` · <a href="${esc(b.ctaUrl)}" target="_blank" rel="noopener">打开链接</a>`:''}</div><div><strong>单份交付：</strong>${Number(c.rewardAit).toLocaleString()} AIT · ${(b.contentTypes||[]).map(label).join(' / ')}</div><div><strong>地区：</strong>${esc((b.regions||[]).join('、')||'—')}</div><div><strong>品牌素材：</strong>${esc((b.brandAssets||[]).join('、')||'—')}</div><div><strong>Agent 可优化：</strong>${esc((b.optimizableFields||[]).join('、')||'无')}</div><div><strong>交付：</strong>${esc(b.deliverableRequirements||'—')}</div><div><strong>锁定：</strong>${esc((b.lockedFields||[]).join('、'))}</div>${c.reviewNote?`<div><strong>审核意见：</strong>${esc(c.reviewNote)}</div>`:''}</div>${role==='creator'&&!availability.open?`<p class="action-unavailable">${esc(availability.reason)}，当前不显示申请、归因或交付操作。</p>`:''}<div class="row-actions" style="margin-top:13px">${role==='brand'&&['draft','rejected'].includes(c.status)?`<button class="btn small soft" data-action="campaign-edit" data-id="${c.id}">编辑草稿</button>`:''}${role==='brand'&&c.status==='draft'?`<button class="btn small primary" data-action="campaign-submit" data-id="${c.id}">提交平台审核</button>`:''}${role==='brand'&&c.status==='active'?`${availability.open?`<button class="btn small primary" data-action="campaign-invite" data-id="${c.id}">邀请创作者</button>`:''}<button class="btn small soft" data-action="campaign-status" data-id="${c.id}" data-status="paused">暂停</button><button class="btn small soft" data-action="campaign-status" data-id="${c.id}" data-status="completed">完成</button><button class="btn small danger" data-action="campaign-status" data-id="${c.id}" data-status="cancelled">取消</button>`:''}${role==='brand'&&c.status==='paused'?`<button class="btn small" data-action="campaign-status" data-id="${c.id}" data-status="active">恢复</button>`:''}${role==='admin'&&c.status==='pending_review'?`<button class="btn small primary" data-action="campaign-review" data-id="${c.id}" data-decision="approve">批准上线</button><button class="btn small danger" data-action="campaign-review" data-id="${c.id}" data-decision="reject">拒绝</button>`:''}${role==='creator'&&availability.open&&!c.participantStatus?`<button class="btn small primary" data-action="campaign-apply" data-id="${c.id}">申请参加</button>`:''}${role==='creator'&&c.participantStatus==='pending_application'?status('pending_application'):''}${role==='creator'&&availability.open&&c.participantStatus==='invited'?`<button class="btn small primary" data-action="campaign-invite-response" data-id="${c.id}" data-decision="accept">接受邀请</button><button class="btn small danger" data-action="campaign-invite-response" data-id="${c.id}" data-decision="reject">拒绝</button>`:''}${role==='creator'&&availability.open&&c.participantStatus==='eligible'?`<button class="btn small" data-action="campaign-tracking-link" data-id="${c.id}">生成归因链接</button><button class="btn small" data-action="deliverable-submit" data-id="${c.id}">提交已发布内容</button>`:''}</div></div>`;
}

function participantRow(p){return `<div class="list-row"><div><h3>${esc(p.creatorName)}</h3><p>${esc(p.campaignTitle)}</p></div><div>${status(p.status)}</div><div><p>${fmtDate(p.updatedAt)}</p></div><div class="row-actions">${state.data.me.role==='brand'&&p.status==='pending_application'?`<button class="btn small primary" data-action="participant-review" data-campaign="${p.campaignId}" data-creator="${p.creatorUserId}" data-decision="approve">批准</button><button class="btn small danger" data-action="participant-review" data-campaign="${p.campaignId}" data-creator="${p.creatorUserId}" data-decision="reject">拒绝</button>`:''}</div></div>`}

function creatorCampaigns() {
  return `<div class="grid cols-3">${state.data.campaigns.map(c=>campaignCard(c,'creator')).join('') || empty('暂时没有开放的 Campaign','品牌 Campaign 通过平台审核后会出现在这里')}</div><section class="section"><div class="section-head"><h2>我的交付</h2><span>提交后由品牌方审批</span></div><div class="list">${state.data.deliverables.map(deliverableRow).join('')||empty('还没有交付','参加 Campaign 后提交已发布内容')}</div></section>`;
}

function adminCampaigns() {
  return `<div class="grid cols-3">${state.data.campaigns.map(c=>campaignCard(c,'admin')).join('') || empty('没有待审 Campaign','品牌方提交后会出现在这里')}</div>`;
}

function deliverableRow(d) {
  const campaign=state.data.campaigns.find(c=>c.id===d.campaignId);
  const allowed=(campaign?.brief?.contentTypes||[]).includes(d.contentType);
  const evidenceReady=allowed&&d.moderationStatus==='passed'&&d.artifactStatus==='ready'&&Number(d.contentVersion)>0;
  return `<div class="list-row deliverable-row"><div><h3>${esc(d.contentTitle||d.campaignTitle)}</h3><p>${esc(d.creatorName||'我的交付')} · ${esc(d.submissionNote)}</p><div class="chips"><span class="chip">${esc(label(d.contentType))}</span><span class="chip">v${Number(d.contentVersion||0)}</span><span class="chip">审核 ${esc(label(d.moderationStatus))}</span><span class="chip">成品 ${esc(label(d.artifactStatus))}</span></div></div><div>${status(d.status)}<p>${evidenceReady?'证据完整':'需核对证据'}</p></div><div><p>${fmtDate(d.submittedAt)}</p>${d.reviewNote?`<p>${esc(d.reviewNote)}</p>`:''}</div><div class="row-actions"><a class="btn small soft" href="/content/${d.contentId}" target="_blank" rel="noopener">查看成品</a><button class="btn small soft" data-action="deliverable-evidence" data-id="${d.id}">交付证据</button>${state.data.me.role==='brand'&&d.status==='submitted'?`<button class="btn small primary" data-action="deliverable-review" data-id="${d.id}" data-decision="approve">批准</button><button class="btn small soft" data-action="deliverable-review" data-id="${d.id}" data-decision="changes">要求修改</button><button class="btn small danger" data-action="deliverable-review" data-id="${d.id}" data-decision="reject">拒绝</button>`:''}${state.data.me.role==='creator'&&d.status==='changes_requested'?`<button class="btn small primary" data-action="deliverable-resubmit" data-id="${d.id}">重新提交</button>`:''}</div></div>`;
}

function deliverablesView() {
  return `<div class="list">${state.data.deliverables.map(deliverableRow).join('') || empty('没有交付记录','创作者提交 Campaign 内容后会出现在这里')}</div>`;
}

function settlementsView() {
  const role=state.data.me.role;
  const records=state.settlementFilter==='all'?state.data.settlements:state.data.settlements.filter(s=>s.status===state.settlementFilter);
  const totalBudget=state.data.campaigns.reduce((sum,c)=>sum+Number(c.budgetSummary?.total||0),0);
  const committed=state.data.campaigns.reduce((sum,c)=>sum+Number(c.budgetSummary?.committed||0),0);
  const issued=state.data.campaigns.reduce((sum,c)=>sum+Number(c.budgetSummary?.issued||0),0);
  const filters=['all','approved','payment_pending','platform_approved','issued','rejected'];
  return `<div class="grid cols-3"><div class="card stat"><div class="label">Campaign 总预算</div><div class="value">${totalBudget.toLocaleString()}</div><div class="hint">AIT</div></div><div class="card stat"><div class="label">已承诺</div><div class="value">${committed.toLocaleString()}</div><div class="hint">已批准及后续状态</div></div><div class="card stat"><div class="label">已发放</div><div class="value">${issued.toLocaleString()}</div><div class="hint">服务端账本已写入</div></div></div><div class="toolbar"><div class="filter-tabs" role="group" aria-label="结算状态筛选">${filters.map(value=>`<button class="btn small ${state.settlementFilter===value?'primary':'soft'}" data-action="settlement-filter" data-filter="${value}">${value==='all'?'全部':label(value)}</button>`).join('')}</div><button class="btn small" data-action="settlement-export">导出 CSV</button></div><div class="list">${records.map(s=>`<div class="list-row"><div><h3>${esc(s.campaignTitle)}</h3><p>${esc(s.creatorName)} · 交付 ${esc(s.deliverableId.slice(-8))}</p></div><div>${status(s.status)}</div><div><strong>${Number(s.amount).toLocaleString()} ${esc(s.currency)}</strong><p>${fmtDate(s.updatedAt)}</p></div><div class="row-actions"><button class="btn small soft" data-action="settlement-details" data-id="${s.id}">审批轨迹</button>${role==='brand'&&s.status==='approved'?`<button class="btn small" data-action="settlement-pending" data-id="${s.id}">提交平台复核</button>`:''}${role==='admin'&&s.status==='payment_pending'?`<button class="btn small primary" data-action="settlement-platform" data-id="${s.id}" data-decision="approve">批准</button><button class="btn small danger" data-action="settlement-platform" data-id="${s.id}" data-decision="reject">拒绝</button>`:''}${role==='brand'&&s.status==='platform_approved'?`<button class="btn small primary" data-action="settlement-issue" data-id="${s.id}">确认发放 AIT</button>`:''}</div></div>`).join('') || empty('没有匹配的结算记录','切换筛选条件查看其他状态')}</div><div class="card" style="margin-top:18px"><strong>结算边界</strong><p class="muted" style="font-size:12px;line-height:1.7">AIT 记录 Campaign 贡献与活动资格，不代表现金、USDT、证券或可自由交易资产。品牌确认与平台复核分离，发放动作由服务端幂等记账。</p></div>`;
}

function ledgerView() {
  return `<div class="grid cols-2"><div class="card stat accent"><div class="label">当前可用 AIP</div><div class="value">${Number(state.data.points.AIP).toLocaleString()}</div><div class="hint">已验证互动行为</div></div><div class="card stat"><div class="label">已发放 AIT</div><div class="value">${Number(state.data.points.AIT).toLocaleString()}</div><div class="hint">已批准 Campaign 交付</div></div></div><section class="section"><div class="section-head"><h2>服务端账本</h2><span>按事件 ID 幂等写入</span></div><div class="list">${state.data.ledger.map(x=>`<div class="list-row"><div><h3>${esc(label(x.currency))}</h3><p>${esc(label(x.eventType))} · <span class="code">${esc(x.id.slice(-10))}</span></p></div><div>${status(x.status)}</div><div class="ledger-amount ${x.amount>0?'plus':''}">${x.amount>0?'+':''}${x.amount} ${esc(x.currency)}</div><div><span class="muted" style="font-size:10px">${fmtDate(x.createdAt)}</span></div></div>`).join('') || empty('账本为空','通过有效互动或 Campaign 交付获得积分记录')}</div></section>`;
}

function governanceView(){
  const d=state.data;
  return `<div class="grid cols-3"><div class="card stat ${d.runtimeEnabled?'':'accent'}"><div class="label">Agent 运行管线</div><div class="value" style="font-size:22px">${d.runtimeEnabled?'运行中':'已停止'}</div><div class="hint">平台全局紧急开关</div><div class="row-actions" style="margin-top:12px"><button class="btn small ${d.runtimeEnabled?'danger':'primary'}" data-action="runtime-toggle" data-enabled="${d.runtimeEnabled?'false':'true'}">${d.runtimeEnabled?'紧急停止':'恢复运行'}</button></div></div><div class="card stat"><div class="label">开放风险案件</div><div class="value">${d.riskCases.filter(x=>x.status==='open').length}</div><div class="hint">按风险分数排序</div></div><div class="card stat"><div class="label">开放内容举报</div><div class="value">${d.reports.filter(x=>x.status==='open').length}</div><div class="hint">需要平台处理</div></div></div>
  <section class="section"><div class="section-head"><h2>品牌组织验证</h2><span>品牌方提交 Campaign 前必须通过</span></div><div class="list">${(d.organizations||[]).map(o=>`<div class="list-row"><div><h3>${esc(o.name)}</h3><p>${esc(o.ownerName)}</p></div><div>${status(o.verificationStatus)}</div><div><p>${fmtDate(o.createdAt)}</p></div><div class="row-actions">${o.verificationStatus==='pending'?`<button class="btn small primary" data-action="org-review" data-id="${o.id}" data-decision="approve">批准</button><button class="btn small danger" data-action="org-review" data-id="${o.id}" data-decision="reject">拒绝</button>`:''}</div></div>`).join('')||empty('没有组织申请','品牌钱包首次登录后会创建组织验证申请')}</div></section>
  <section class="section"><div class="section-head"><h2>风险案件</h2><span>运行证据与异常速度</span></div><div class="list">${d.riskCases.map(r=>`<div class="list-row"><div><h3>${esc(label(r.riskType))}</h3><p>${esc(r.subjectType)} · ${esc(r.subjectId.slice(-10))}</p></div><div>${status(r.status)}</div><div><strong>风险 ${r.score}</strong><p>${fmtDate(r.createdAt)}</p></div><div class="row-actions">${r.status==='open'?`<button class="btn small danger" data-action="risk-resolve" data-id="${r.id}" data-decision="confirm">确认风险</button><button class="btn small soft" data-action="risk-resolve" data-id="${r.id}" data-decision="dismiss">排除</button>`:''}</div></div>`).join('')||empty('没有风险案件','异常运行事件会自动进入这里')}</div></section>
  <section class="section"><div class="section-head"><h2>内容举报</h2><span>举报、下架与申诉治理</span></div><div class="list">${d.reports.map(r=>`<div class="list-row"><div><h3>${esc(r.contentTitle)}</h3><p>${esc(label(r.reason))} · ${esc(r.reporterName)}</p></div><div>${status(r.status)}</div><div><p>${fmtDate(r.createdAt)}</p></div><div class="row-actions">${r.status==='open'?`<button class="btn small danger" data-action="report-resolve" data-id="${r.id}" data-resolution="takedown">下架</button><button class="btn small soft" data-action="report-resolve" data-id="${r.id}" data-resolution="dismiss">驳回</button>`:''}</div></div>`).join('')||empty('没有内容举报','用户举报后会进入平台复核')}</div></section>
  <section class="section"><div class="section-head"><h2>内容下架申诉</h2><span>恢复后回到草稿，需创作者重新确认发布</span></div><div class="list">${(d.contentAppeals||[]).map(a=>`<div class="list-row"><div><h3>${esc(a.contentTitle)}</h3><p>${esc(a.appellantName)} · ${esc(a.reason)}</p></div><div>${status(a.status)}</div><div><p>${fmtDate(a.createdAt)}</p></div><div class="row-actions">${a.status==='open'?`<button class="btn small primary" data-action="appeal-resolve" data-id="${a.id}" data-decision="restore">恢复为草稿</button><button class="btn small danger" data-action="appeal-resolve" data-id="${a.id}" data-decision="uphold">维持下架</button>`:''}</div></div>`).join('')||empty('没有待处理申诉','创作者对平台下架提出申诉后会显示在这里')}</div></section>
  <section class="section"><div class="section-head"><h2>积分账本治理</h2><span>冻结、恢复与撤销均记录原因</span></div><div class="list">${(d.managedPointEvents||[]).map(x=>`<div class="list-row"><div><h3>${esc(x.userName)} · ${esc(label(x.currency))}</h3><p>${esc(label(x.eventType))} · <span class="code">${esc(x.id.slice(-10))}</span></p></div><div>${status(x.status)}</div><div class="ledger-amount ${x.amount>0?'plus':''}">${x.amount>0?'+':''}${x.amount} ${esc(x.currency)}</div><div class="row-actions">${x.amount>0&&x.status==='posted'?`<button class="btn small soft" data-action="point-status" data-id="${x.id}" data-status="frozen">冻结</button><button class="btn small danger" data-action="point-status" data-id="${x.id}" data-status="revoked">撤销</button>`:''}${x.amount>0&&x.status==='frozen'?`<button class="btn small" data-action="point-status" data-id="${x.id}" data-status="posted">恢复</button><button class="btn small danger" data-action="point-status" data-id="${x.id}" data-status="revoked">撤销</button>`:''}</div></div>`).join('')||empty('没有积分事件','有效互动或 AIT 发放后会进入治理账本')}</div></section>
  <section class="section"><div class="section-head"><h2>最近审计日志</h2><span>关键动作不可省略</span></div><div class="list">${d.auditLogs.slice(0,30).map(a=>`<div class="list-row"><div><h3>${esc(a.action)}</h3><p>${esc(a.subjectType)} · ${esc(a.subjectId.slice(-12))}</p></div><div><span class="code">${esc(a.actorUserId?.slice(-8)||'system')}</span></div><div><p>${fmtDate(a.createdAt)}</p></div><div></div></div>`).join('')}</div></section>`;
}

function accountView(){
  const d=state.data;
  const accepted=type=>(d.termsAcceptances||[]).some(x=>x.documentType===type&&x.documentVersion==='1.0');
  const deletion=d.deletionRequest;
  const notices=(d.notifications||[]).filter(n=>state.notificationFilter==='all'||(state.notificationFilter==='unread'&&!n.readAt)||n.category===state.notificationFilter);
  const noticeFilters=['all','unread',...new Set((d.notifications||[]).map(n=>n.category))];
  return `<div class="grid cols-2"><form class="form-card" data-form="profile"><div class="eyebrow">资料与身份</div><h2>账户资料</h2><p>钱包地址仅用于身份验证。修改显示名称不会改变钱包所有权。</p><div class="field"><label for="profile-name">显示名称</label><input id="profile-name" name="displayName" value="${esc(d.me.displayName)}" required maxlength="60"></div><div class="field" style="margin-top:12px"><label>钱包 / 账户</label><input value="${esc(d.me.walletAddress||d.me.email||'—')}" disabled></div><div class="form-actions"><button type="button" class="btn ghost" data-action="logout">退出登录</button><button class="btn primary">保存资料</button></div></form><div class="card"><div class="eyebrow">隐私与数据</div><h3>数据权利</h3><p class="muted" style="font-size:12px;line-height:1.7">可导出当前账户数据，或提交 30 天冷静期账户删除申请。</p><div class="row-actions" style="justify-content:flex-start"><a class="btn small" href="/api/account/export" target="_blank">导出数据</a>${deletion?.status==='pending'?`<button class="btn small" data-action="cancel-deletion" data-id="${deletion.id}">取消删除申请（${fmtDate(deletion.scheduledFor)}）</button>`:'<button class="btn small danger" data-action="delete-account">申请删除账户</button>'}</div><hr style="border:0;border-top:1px solid var(--line);margin:18px 0"><strong>协议记录</strong><div class="row-actions" style="justify-content:flex-start;margin-top:10px"><button class="btn small soft" data-action="accept-terms" data-type="terms" ${accepted('terms')?'disabled':''}>${accepted('terms')?'服务条款已接受':'接受服务条款 v1.0'}</button><button class="btn small soft" data-action="accept-terms" data-type="privacy" ${accepted('privacy')?'disabled':''}>${accepted('privacy')?'隐私政策已接受':'接受隐私政策 v1.0'}</button>${d.me.role==='creator'?`<button class="btn small soft" data-action="accept-terms" data-type="campaign_rules" ${accepted('campaign_rules')?'disabled':''}>${accepted('campaign_rules')?'Campaign 规则已接受':'接受 Campaign 规则 v1.0'}</button>`:''}</div></div></div>
  <section class="section"><div class="section-head"><h2>登录会话</h2><span>可撤销不再使用的设备会话</span></div><div class="list">${(d.sessions||[]).map(s=>`<div class="list-row"><div><h3>会话 ${esc(s.id.slice(-8))}</h3><p>创建于 ${fmtDate(s.createdAt)}</p></div><div>${status(new Date(s.expiresAt)>new Date()?'active':'expired')}</div><div><p>${fmtDate(s.expiresAt)} 到期</p></div><div><button class="btn small danger" data-action="session-revoke" data-id="${s.id}">撤销</button></div></div>`).join('')||empty('没有有效会话','重新登录后会显示设备会话')}</div></section>
  <section class="section"><div class="section-head"><h2>通知中心</h2><span>${d.notifications.filter(n=>!n.readAt).length} 条未读</span></div><div class="toolbar"><div class="filter-tabs" role="group" aria-label="通知筛选">${noticeFilters.map(value=>`<button class="btn small ${state.notificationFilter===value?'primary':'soft'}" data-action="notification-filter" data-filter="${esc(value)}">${value==='all'?'全部':value==='unread'?'未读':label(value)}</button>`).join('')}</div>${d.notifications.some(n=>!n.readAt)?'<button class="btn small" data-action="notification-read-all">全部标为已读</button>':''}</div><div class="list">${notices.map(n=>`<div class="list-row"><div><h3>${esc(n.title)}</h3><p>${esc(n.body)}</p></div><div>${n.readAt?status('resolved'):status('open')}</div><div><p>${fmtDate(n.createdAt)}</p></div><div class="row-actions"><button class="btn small soft" data-action="notification-open" data-id="${n.id}">查看相关模块</button>${!n.readAt?`<button class="btn small soft" data-action="notification-read" data-id="${n.id}">标为已读</button>`:''}</div></div>`).join('')||empty('暂无匹配通知','切换筛选条件查看其他通知')}</div></section>`;
}

function notificationTarget(notification) {
  const role=state.data.me.role;
  if (notification.subjectType==='campaign') return 'campaigns';
  if (notification.subjectType==='deliverable') return role==='creator'?'campaigns':'deliverables';
  if (notification.subjectType==='settlement') return role==='creator'?'ledger':'settlements';
  if (notification.subjectType==='organization') return role==='admin'?'governance':'campaigns';
  return 'dashboard';
}

async function refresh({ silent = false, background = false } = {}) {
  while (state.refreshInFlight) {
    await state.refreshInFlight;
    if (background) return;
  }
  if (!silent && !state.data) loading();
  const operation = (async () => {
    try {
      const nextData = await api('/api/bootstrap');
      const nextSignature = JSON.stringify(nextData);
      const changed = nextSignature !== state.dataSignature;
      state.refreshError = '';
      const allowed = NAV[nextData.me.role].map(x=>x[0]);
      if (!allowed.includes(state.view)) state.view = 'dashboard';

      if (background && changed && isUserEditing()) {
        state.pendingData = nextData;
        state.pendingDataSignature = nextSignature;
      } else if (!state.data || !silent || changed) {
        state.data = nextData;
        state.dataSignature = nextSignature;
        state.pendingData = null;
        state.pendingDataSignature = '';
        shell();
      }

      updateRefreshStatus();
      schedulePolling(nextData.tasks.some(t=>['queued','running'].includes(t.status)));
    } catch (error) {
      stopPolling();
      if ([401, 403].includes(error.status)) {
        loginView();
        toast('登录状态已失效，请重新登录', 'error');
        return;
      }
      state.refreshError = refreshFailureMessage(error);
      if (state.data) {
        updateRefreshStatus();
        toast(state.refreshError, 'error');
      } else {
        refreshFailureView(state.refreshError);
      }
    }
  })();
  state.refreshInFlight = operation;
  try {
    await operation;
  } finally {
    if (state.refreshInFlight === operation) state.refreshInFlight = null;
  }
}

async function walletLogin() {
  const statusEl = document.querySelector('#login-status');
  if (!window.ethereum) { statusEl.textContent = '未检测到 EVM 钱包。请安装 MetaMask，或在手机钱包的内置浏览器中打开本页；WalletConnect 扫码将在生产钱包接入阶段启用。'; return; }
  try {
    statusEl.textContent = '正在请求钱包账户…';
    const [address] = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const chainHex = await window.ethereum.request({ method: 'eth_chainId' });
    const challenge = await api('/api/auth/wallet/challenge', { method:'POST', body:JSON.stringify({ address, chainId:parseInt(chainHex,16), role:state.loginRole }) });
    statusEl.textContent = '请在钱包中确认登录签名…';
    const signature = await window.ethereum.request({ method:'personal_sign', params:[challenge.message,address] });
    await api('/api/auth/wallet/verify', { method:'POST', body:JSON.stringify({ address, message:challenge.message, signature }) });
    await refresh();
  } catch (error) { statusEl.textContent = error.message; }
}

async function openContentEditor(content) {
  const payload=content.payload||{};
  const answer=await openDialog({
    title:'结构化编辑并生成新版本', message:'摘要、章节、互动、素材、安全说明和 CTA 会一起重新审核并构建成品。', wide:true,
    contentHtml:'<aside class="content-live-preview" aria-live="polite"><div class="eyebrow">实时预览</div><div data-content-preview></div></aside>',
    fields:[
      {name:'title',label:'标题',value:content.title,required:true},
      {name:'summary',label:'摘要',type:'textarea',value:payload.summary||'',required:true},
      {name:'hook',label:'开场 Hook',type:'textarea',value:payload.hook||'',required:true},
      {name:'sections',label:'章节（每行：标题 | 正文）',type:'textarea',value:(payload.sections||[]).map(item=>`${item.heading||''} | ${item.body||''}`).join('\n'),required:true},
      {name:'interactions',label:'互动（每行：触发 | 结果）',type:'textarea',value:(payload.interactions||[]).map(item=>`${item.trigger||''} | ${item.result||''}`).join('\n')},
      {name:'assets',label:'素材（每行一个）',type:'textarea',value:(payload.assets||[]).join('\n')},
      {name:'safetyNotes',label:'安全说明（每行一个）',type:'textarea',value:(payload.safetyNotes||[]).join('\n'),required:true},
      {name:'ctaLabel',label:'CTA 文案',value:payload.ctaLabel||''},
      {name:'ctaUrl',label:'CTA 链接',type:'url',value:payload.ctaUrl||''},
    ],
    confirmText:'审核并保存新版本',
    onMount(form){
      const preview=form.querySelector('[data-content-preview]');
      const render=()=>{
        const data=Object.fromEntries(new FormData(form));
        const sections=String(data.sections||'').split('\n').map(line=>line.split('|')).filter(parts=>parts.some(Boolean));
        preview.innerHTML=`<h3>${esc(data.title||'未命名内容')}</h3><p class="preview-hook">${esc(data.hook||'填写开场 Hook')}</p><p>${esc(data.summary||'填写内容摘要')}</p><div class="preview-sections">${sections.slice(0,4).map(parts=>`<div><strong>${esc(parts[0]?.trim()||'章节')}</strong><span>${esc(parts.slice(1).join('|').trim()||'正文')}</span></div>`).join('')}</div>${data.ctaLabel?`<span class="btn small primary">${esc(data.ctaLabel)}</span>`:''}`;
      };
      form.addEventListener('input',render);
      render();
    },
  });
  if(!answer)return null;
  const pairLines=(value,left,right)=>String(value||'').split('\n').map(line=>line.split('|')).map(parts=>({[left]:parts.shift()?.trim()||'',[right]:parts.join('|').trim()})).filter(item=>item[left]||item[right]);
  return {
    title:answer.title,
    payload:{...payload,title:answer.title,summary:answer.summary,hook:answer.hook,sections:pairLines(answer.sections,'heading','body'),interactions:pairLines(answer.interactions,'trigger','result'),assets:splitList(answer.assets),safetyNotes:splitList(answer.safetyNotes),ctaLabel:answer.ctaLabel||'',ctaUrl:answer.ctaUrl||''},
  };
}

app.addEventListener('click', async event => {
  const el = event.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  try {
    if (action === 'login-role') { state.loginRole = el.dataset.role; loginView(); }
    else if (action === 'wallet-login') await walletLogin();
    else if (action === 'wallet-options') { const page=encodeURIComponent(location.href); const host=encodeURIComponent(`${location.host}${location.pathname}`); await openDialog({title:'使用手机钱包打开',message:'请选择已安装的钱包，在其内置浏览器中打开本页后使用“连接浏览器钱包并签名”。',contentHtml:`<div class="wallet-options"><a class="btn" href="https://metamask.app.link/dapp/${host}">MetaMask</a><a class="btn" href="https://link.trustwallet.com/open_url?coin_id=60&url=${page}">Trust Wallet</a><a class="btn" href="https://go.cb-w.com/dapp?cb_url=${page}">Coinbase Wallet</a><button type="button" class="btn soft" data-action="wallet-copy">复制当前登录链接</button></div><p class="field-hint">这是钱包内置浏览器入口，不会发起链上交易。签名挑战仍由 Airvana 服务端验证。</p>`,confirmText:'关闭',cancelText:null}); }
    else if (action === 'wallet-copy') await copyCurrentLoginLink();
    else if (action === 'refresh-retry') await refresh({ silent: Boolean(state.data) });
    else if (action === 'demo-login') { await api('/api/auth/demo',{method:'POST',body:JSON.stringify({role:el.dataset.role})}); state.view='dashboard'; await refresh(); }
    else if (action === 'logout') { await api('/api/auth/logout',{method:'POST'}); stopPolling(); loginView(); }
    else if (action === 'nav') { state.view=el.dataset.view; state.mobileMore=false; shell(); }
    else if (action === 'more-nav') { if(event.target.closest('[data-stop-click]')&&el.classList.contains('mobile-more-backdrop'))return; state.mobileMore=!state.mobileMore; shell(); }
    else if (action === 'agent-status') { await api(`/api/agents/${el.dataset.id}`,{method:'PATCH',body:JSON.stringify({status:el.dataset.status})}); toast('Agent 状态已更新'); await refresh({silent:true}); }
    else if (action === 'agent-memory') { const answer=await openDialog({title:'添加 Agent 记忆',message:'记忆会进入下一次任务的上下文，但不会覆盖 Campaign 锁定字段。',fields:[{name:'memoryType',label:'记忆类型',type:'select',options:[{value:'brand_voice',label:'品牌语气'},{value:'audience',label:'受众偏好'},{value:'constraint',label:'约束'},{value:'learning',label:'历史学习'}]},{name:'priority',label:'优先级',type:'select',value:'2',options:[{value:'3',label:'P3 高'},{value:'2',label:'P2 中'},{value:'1',label:'P1 低'}]},{name:'source',label:'来源',value:'user',required:true},{name:'content',label:'记忆内容',type:'textarea',required:true}],confirmText:'保存记忆'}); if(!answer)return; await api(`/api/agents/${el.dataset.id}/memory`,{method:'POST',body:JSON.stringify({...answer,priority:Number(answer.priority)})}); toast('Agent 记忆已保存'); await refresh({silent:true}); }
    else if (action === 'agent-memory-edit') { const memory=(state.data.agentMemories||[]).find(item=>item.id===el.dataset.id); if(!memory)throw new Error('Agent 记忆不存在'); const answer=await openDialog({title:'编辑 Agent 记忆',message:'变更会写入审计记录，并用于后续任务。',fields:[{name:'memoryType',label:'记忆类型',type:'select',value:memory.memoryType,options:[{value:'brand_voice',label:'品牌语气'},{value:'audience',label:'受众偏好'},{value:'constraint',label:'约束'},{value:'learning',label:'历史学习'}]},{name:'priority',label:'优先级',type:'select',value:String(memory.priority),options:[{value:'3',label:'P3 高'},{value:'2',label:'P2 中'},{value:'1',label:'P1 低'}]},{name:'source',label:'来源',value:memory.source,required:true},{name:'content',label:'记忆内容',type:'textarea',value:memory.content,required:true}],confirmText:'保存修改'}); if(!answer)return; await api(`/api/agent-memory/${memory.id}`,{method:'PATCH',body:JSON.stringify({...answer,priority:Number(answer.priority)})}); toast('Agent 记忆已更新'); await refresh({silent:true}); }
    else if (action === 'agent-memory-delete') { const answer=await openDialog({title:'删除 Agent 记忆',message:'删除后后续任务不再使用该条记忆，删除动作会保留审计记录。',confirmText:'确认删除',danger:true}); if(!answer)return; await api(`/api/agent-memory/${el.dataset.id}`,{method:'DELETE'}); toast('Agent 记忆已删除'); await refresh({silent:true}); }
    else if (action === 'task-trace') { const task=state.data.tasks.find(item=>item.id===el.dataset.id); const steps=(state.data.taskSteps||[]).filter(s=>s.taskId===el.dataset.id); const duration=(start,end)=>start&&end?`${Math.max(0,new Date(end)-new Date(start))} ms`:'—'; const timeline=steps.length?steps.map(s=>`<article class="trace-step"><div class="trace-sequence">${s.sequence}</div><div><div class="trace-head"><strong>${esc(s.stepType)}</strong>${status(s.status)}</div><p>${fmtDate(s.startedAt)} → ${fmtDate(s.finishedAt)} · ${duration(s.startedAt,s.finishedAt)}</p><details><summary>输入 / 输出证据</summary><div class="trace-io"><div><span>输入</span><pre>${esc(JSON.stringify(s.input||{},null,2))}</pre></div><div><span>输出</span><pre>${esc(JSON.stringify(s.output||{},null,2))}</pre></div></div></details></div></article>`).join(''):`<div class="legacy-trace"><strong>旧任务兼容记录</strong><p>该任务创建于逐步运行记录启用前，因此仅展示任务级审计字段，不将其冒充为逐步证据。</p><dl><dt>生成服务</dt><dd>${esc(label(task?.provider))}</dd><dt>状态</dt><dd>${esc(label(task?.status))}</dd><dt>开始</dt><dd>${fmtDate(task?.startedAt)}</dd><dt>结束</dt><dd>${fmtDate(task?.finishedAt)}</dd><dt>错误</dt><dd>${esc(task?.errorText||'无')}</dd></dl></div>`; await openDialog({title:'Agent 任务运行记录',message:'服务端记录步骤、输入、输出、时长、审核和成品构建证据。',contentHtml:`<div class="trace-summary"><span>${status(task?.status)}</span><span>生成服务：${esc(label(task?.provider))}</span><span>任务耗时：${duration(task?.startedAt,task?.finishedAt)}</span></div><div class="trace-timeline">${timeline}</div>`,confirmText:'关闭',cancelText:null,wide:true}); }
    else if (action === 'task-cancel') { const answer=await openDialog({title:'取消 Agent 任务',message:'运行中的任务将停止，未完成内容不会发布。',confirmText:'确认取消',danger:true}); if(!answer)return; await api(`/api/tasks/${el.dataset.id}/cancel`,{method:'POST'}); toast('任务已取消'); await refresh({silent:true}); }
    else if (action === 'task-retry') { await api(`/api/tasks/${el.dataset.id}/retry`,{method:'POST'}); toast('任务已重新进入队列'); await refresh({silent:true}); }
    else if (action === 'task-review') { const answer=await openDialog({title:el.dataset.decision==='reject'?'拒绝 Agent 输出':'批准 Agent 输出',message:'审核决定将写入任务和内容版本审计记录。',fields:[{name:'note',label:el.dataset.decision==='reject'?'拒绝原因':'审核备注（可选）',type:'textarea',required:el.dataset.decision==='reject'}],confirmText:el.dataset.decision==='reject'?'确认拒绝':'确认批准',danger:el.dataset.decision==='reject'}); if(!answer)return; await api(`/api/tasks/${el.dataset.id}/review`,{method:'POST',body:JSON.stringify({decision:el.dataset.decision,note:answer.note})}); toast('任务审核已完成'); await refresh({silent:true}); }
    else if (action === 'publish') { const answer=await openDialog({title:'确认立即发布',message:'发布后，符合资格的其他用户互动才可能获得 AIP。',confirmText:'确认发布'}); if(!answer)return; await api(`/api/contents/${el.dataset.id}/publish`,{method:'POST'}); toast('内容已发布'); await refresh({silent:true}); }
    else if (action === 'schedule') { const answer=await openDialog({title:'设置定时发布',message:'服务器会按 ISO 时间执行发布任务。',fields:[{name:'scheduledAt',label:'发布时间',type:'datetime-local',required:true}],confirmText:'保存定时任务'}); if(!answer)return; await api(`/api/contents/${el.dataset.id}/schedule`,{method:'POST',body:JSON.stringify({scheduledAt:new Date(answer.scheduledAt).toISOString()})}); toast('已设置定时发布'); await refresh({silent:true}); }
    else if (action === 'archive') { const answer=await openDialog({title:'确认归档内容',message:'归档后该内容不再产生新的 AIP 有效互动。',confirmText:'确认归档',danger:true}); if(!answer)return; await api(`/api/contents/${el.dataset.id}/archive`,{method:'POST'}); toast('内容已归档'); await refresh({silent:true}); }
    else if (action === 'content-edit') { const content=state.data.contents.find(c=>c.id===el.dataset.id); if(!content)throw new Error('内容不存在'); const change=await openContentEditor(content); if(!change)return; await api(`/api/contents/${content.id}`,{method:'PATCH',body:JSON.stringify(change)}); toast('结构化新版本已审核并构建'); await refresh({silent:true}); }
    else if (action === 'content-versions') { const content=state.data.contents.find(c=>c.id===el.dataset.id); const result=await api(`/api/contents/${el.dataset.id}/versions`); const restorable=result.versions.filter(v=>v.version!==content?.currentVersion); if(!restorable.length){await openDialog({title:`${content?.title||'内容'} · 版本历史`,message:`当前仅有 v${content?.currentVersion||1}，还没有可恢复的历史版本。`,fields:[{name:'history',label:'版本记录',type:'textarea',readonly:true,value:result.versions.map(v=>`v${v.version} · 当前版本 · ${fmtDate(v.createdAt)}`).join('\n')}],confirmText:'关闭'});return;} const answer=await openDialog({title:`${content?.title||'内容'} · 版本历史`,message:'只可选择历史版本；恢复会创建一个新的草稿版本，不会覆盖任何记录。',fields:[{name:'version',label:'选择要恢复的历史版本',type:'select',options:restorable.map(v=>({value:String(v.version),label:`v${v.version} · ${v.title} · ${fmtDate(v.createdAt)}`}))},{name:'history',label:'完整版本记录（只读）',type:'textarea',readonly:true,value:result.versions.map(v=>`v${v.version}${v.version===content?.currentVersion?' · 当前':''} · ${v.title} · ${fmtDate(v.createdAt)}`).join('\n')}],confirmText:'恢复为新草稿'}); if(!answer)return; await api(`/api/contents/${el.dataset.id}/versions/${answer.version}/restore`,{method:'POST'}); toast('历史版本已恢复并重新构建成品'); await refresh({silent:true}); }
    else if (action === 'content-boost') { const answer=await openDialog({title:'使用 AIP 推广内容',message:'将消费 20 AIP，使该内容在内容广场优先展示 24 小时。AIP 仅用于平台功能，不可兑换现金或 USDT。',confirmText:'确认消费 20 AIP'}); if(!answer)return; const result=await api(`/api/contents/${el.dataset.id}/boost`,{method:'POST'}); toast(`推广已生效至 ${fmtDate(result.expiresAt)}`); await refresh({silent:true}); }
    else if (action === 'report-content') { const answer=await openDialog({title:'举报内容',message:'平台会记录举报并进入人工复核。',fields:[{name:'reason',label:'举报原因',type:'select',options:[{value:'unsafe',label:'不安全内容'},{value:'copyright',label:'版权或商标'},{value:'spam',label:'垃圾内容'},{value:'misleading',label:'误导性内容'},{value:'privacy',label:'隐私问题'},{value:'other',label:'其他'}]},{name:'details',label:'详细说明',type:'textarea',required:true}],confirmText:'提交举报',danger:true}); if(!answer)return; await api('/api/content-reports',{method:'POST',body:JSON.stringify({contentId:el.dataset.id,...answer})}); toast('举报已提交'); }
    else if (action === 'content-appeal') { const answer=await openDialog({title:'提交内容下架申诉',message:'请说明内容为何符合平台规则，或你已经完成的修正。平台会保留原下架记录并重新复核。',fields:[{name:'reason',label:'申诉说明',type:'textarea',required:true}],confirmText:'提交申诉'}); if(!answer)return; await api('/api/content-appeals',{method:'POST',body:JSON.stringify({contentId:el.dataset.id,reason:answer.reason})}); toast('申诉已提交，等待平台复核'); await refresh({silent:true}); }
    else if (action === 'engage') { const eventKey=`${el.dataset.event}:${el.dataset.id}:${crypto.randomUUID()}`; const result=await api('/api/engagements',{method:'POST',body:JSON.stringify({contentId:el.dataset.id,eventType:el.dataset.event,eventKey})}); toast(result.status==='eligible'?`有效互动，+${result.points} AIP`:result.reason,result.status==='eligible'?'':'error'); await refresh({silent:true}); }
    else if (action === 'demo-seed') { const result=await api('/api/demo/seed-workflow',{method:'POST'}); toast(result.idempotent?'演示工作流已存在':'已载入标注演示工作流'); await refresh({silent:true}); }
    else if (action === 'campaign-submit') { await api(`/api/campaigns/${el.dataset.id}/submit`,{method:'POST'}); toast('已提交平台审核'); await refresh({silent:true}); }
    else if (action === 'campaign-edit') { const campaign=state.data.campaigns.find(c=>c.id===el.dataset.id); if(!campaign)throw new Error('Campaign 不存在'); const b=campaign.brief||{}; const answer=await openDialog({title:'编辑 Campaign 合同草稿',message:'保存后保持草稿状态；预算、地区、声明和成功指标仍由品牌锁定。',wide:true,fields:[{name:'title',label:'名称',value:campaign.title,required:true},{name:'objective',label:'业务目标',type:'textarea',value:campaign.objective,required:true},{name:'audience',label:'目标受众',type:'textarea',value:b.audience||'',required:true},{name:'channel',label:'分发渠道',value:b.channel||'',required:true},{name:'conversionGoal',label:'转化目标',value:b.conversionGoal||'',required:true},{name:'successMetric',label:'成功指标',value:b.successMetric||'',required:true},{name:'ctaLabel',label:'CTA 文案',value:b.ctaLabel||''},{name:'ctaUrl',label:'CTA 链接',type:'url',value:b.ctaUrl||''},{name:'budgetAit',label:'AIT 预算',type:'number',value:campaign.budgetAit,required:true},{name:'rewardAit',label:'单份交付 AIT',type:'number',value:campaign.rewardAit,required:true},{name:'startsAt',label:'开始时间',type:'datetime-local',value:toLocalInput(campaign.startsAt),required:true},{name:'endsAt',label:'结束时间',type:'datetime-local',value:toLocalInput(campaign.endsAt),required:true},{name:'regions',label:'投放地区（逗号分隔）',value:(b.regions||[]).join(', '),required:true},{name:'contentTypes',label:'内容类型（game, video, article）',value:(b.contentTypes||[]).join(', '),required:true},{name:'brandAssets',label:'品牌素材（每行一个）',type:'textarea',value:(b.brandAssets||[]).join('\n')},{name:'optimizableFields',label:'Agent 可优化字段（每行一个）',type:'textarea',value:(b.optimizableFields||[]).join('\n')},{name:'deliverableRequirements',label:'交付要求',type:'textarea',value:b.deliverableRequirements||'',required:true},{name:'allowedClaims',label:'允许的品牌声明',type:'textarea',value:b.allowedClaims||''},{name:'prohibitedClaims',label:'禁止表达',type:'textarea',value:b.prohibitedClaims||''}],confirmText:'保存合同草稿'}); if(!answer)return; await api(`/api/campaigns/${campaign.id}`,{method:'PATCH',body:JSON.stringify({...answer,budgetAit:Number(answer.budgetAit),rewardAit:Number(answer.rewardAit),startsAt:new Date(answer.startsAt).toISOString(),endsAt:new Date(answer.endsAt).toISOString(),regions:splitList(answer.regions),contentTypes:splitList(answer.contentTypes),brandAssets:splitList(answer.brandAssets),optimizableFields:splitList(answer.optimizableFields),lockedFields:b.lockedFields||['预算','奖励规则','地区','品牌声明','成功指标']})}); toast('Campaign 合同草稿已更新'); await refresh({silent:true}); }
    else if (action === 'campaign-review') { const answer=await openDialog({title:el.dataset.decision==='reject'?'拒绝 Campaign':'批准 Campaign 上线',message:'平台审核需确认预算、地区、品牌声明和禁止表达边界。',fields:[{name:'note',label:el.dataset.decision==='reject'?'拒绝原因':'审核备注（可选）',type:'textarea',required:el.dataset.decision==='reject'}],confirmText:el.dataset.decision==='reject'?'确认拒绝':'批准上线',danger:el.dataset.decision==='reject'}); if(!answer)return; await api(`/api/campaigns/${el.dataset.id}/platform-review`,{method:'POST',body:JSON.stringify({decision:el.dataset.decision,note:answer.note})}); toast('Campaign 审核已完成'); await refresh({silent:true}); }
    else if (action === 'campaign-status') { const answer=await openDialog({title:`确认${label(el.dataset.status)} Campaign`,message:'状态变化会立即影响申请、交付和预算。',fields:[{name:'note',label:'状态说明',type:'textarea'}],confirmText:'确认变更',danger:el.dataset.status==='cancelled'}); if(!answer)return; await api(`/api/campaigns/${el.dataset.id}/status`,{method:'POST',body:JSON.stringify({status:el.dataset.status,note:answer.note})}); toast('Campaign 状态已更新'); await refresh({silent:true}); }
    else if (action === 'campaign-apply') { await api(`/api/campaigns/${el.dataset.id}/apply`,{method:'POST'}); toast('参加申请已提交，等待品牌审核'); await refresh({silent:true}); }
    else if (action === 'campaign-invite') { const search=await openDialog({title:'搜索并邀请创作者',message:'邀请需要创作者本人接受后才获得交付资格。',fields:[{name:'q',label:'创作者名称',required:true}],confirmText:'搜索'}); if(!search)return; const result=await api(`/api/creators?q=${encodeURIComponent(search.q)}`); if(!result.creators.length)throw new Error('没有找到匹配的创作者'); const answer=await openDialog({title:'选择创作者',fields:[{name:'creatorUserId',label:'创作者',type:'select',options:result.creators.map(c=>({value:c.id,label:`${c.displayName}${c.walletAddress?` · ${c.walletAddress.slice(0,8)}…`:''}`}))}],confirmText:'发送邀请'}); if(!answer)return; await api(`/api/campaigns/${el.dataset.id}/invites`,{method:'POST',body:JSON.stringify(answer)}); toast('Campaign 邀请已发送'); await refresh({silent:true}); }
    else if (action === 'campaign-invite-response') { await api(`/api/campaigns/${el.dataset.id}/invite-response`,{method:'POST',body:JSON.stringify({decision:el.dataset.decision})}); toast(el.dataset.decision==='accept'?'已接受 Campaign 邀请':'已拒绝 Campaign 邀请'); await refresh({silent:true}); }
    else if (action === 'campaign-tracking-link') { const campaign=state.data.campaigns.find(c=>c.id===el.dataset.id); const allowed=campaign?.brief?.contentTypes||[]; const published=state.data.contents.filter(c=>c.status==='published'&&allowed.includes(c.contentType)); if(!published.length)throw new Error('请先发布一条符合 Campaign 内容类型的内容'); const answer=await openDialog({title:'生成 Campaign 归因链接',message:'访问、开始体验和完成体验会分别进入 Campaign 漏斗。',fields:[{name:'contentId',label:'选择符合类型的已发布内容',type:'select',options:published.map(c=>({value:c.id,label:`${c.title} · ${label(c.contentType)}`}))}],confirmText:'生成链接'}); if(!answer)return; const link=`${location.origin}/content/${answer.contentId}?campaign=${encodeURIComponent(el.dataset.id)}&ref=${encodeURIComponent(state.data.me.id)}`; try{await navigator.clipboard.writeText(link);toast('归因链接已复制');}catch{await openDialog({title:'Campaign 归因链接',fields:[{name:'link',label:'复制链接',type:'textarea',value:link}],confirmText:'关闭'});} }
    else if (action === 'participant-review') { await api(`/api/campaigns/${el.dataset.campaign}/participants/${el.dataset.creator}/review`,{method:'POST',body:JSON.stringify({decision:el.dataset.decision})}); toast('创作者资格已更新'); await refresh({silent:true}); }
    else if (action === 'deliverable-submit') { const campaign=state.data.campaigns.find(c=>c.id===el.dataset.id); const allowed=campaign?.brief?.contentTypes||[]; const published=state.data.contents.filter(c=>c.status==='published'&&allowed.includes(c.contentType)); if(!published.length)throw new Error('请先发布一条符合 Campaign 类型要求的内容'); const answer=await openDialog({title:'提交 Campaign 交付',message:`允许类型：${allowed.map(label).join('、')}。仅可提交审核通过且成品就绪的已发布内容。`,fields:[{name:'contentId',label:'选择符合类型的内容',type:'select',required:true,options:published.map(c=>({value:c.id,label:`${c.title} · ${label(c.contentType)} · v${c.currentVersion}`}))},{name:'note',label:'交付说明',type:'textarea',required:true,value:'内容已按 Campaign 要求完成并发布。'}],confirmText:'提交交付'}); if(!answer)return; await api(`/api/campaigns/${el.dataset.id}/deliverables`,{method:'POST',body:JSON.stringify(answer)}); toast('交付已提交'); await refresh({silent:true}); }
    else if (action === 'deliverable-evidence') { const delivery=state.data.deliverables.find(item=>item.id===el.dataset.id); if(!delivery)throw new Error('交付不存在'); const campaign=state.data.campaigns.find(item=>item.id===delivery.campaignId); const brief=campaign?.brief||{}; const checks=[['内容类型',`${label(delivery.contentType)} · ${(brief.contentTypes||[]).includes(delivery.contentType)?'符合':'不符合'} Campaign`],['内容审核',label(delivery.moderationStatus)],['正式版本',`v${Number(delivery.contentVersion||0)}`],['成品构建',label(delivery.artifactStatus)],['提交时间',fmtDate(delivery.submittedAt)],['审核时间',fmtDate(delivery.reviewedAt)]]; const validation=delivery.artifactValidation||{}; const failedChecks=(validation.checks||[]).filter(item=>!item.passed).map(item=>item.id); await openDialog({title:'Campaign 交付证据',message:'审批前核对合同要求、内容状态与成品构建证据。',contentHtml:`<div class="evidence-grid">${checks.map(([name,value])=>`<div><span>${esc(name)}</span><strong>${esc(value)}</strong></div>`).join('')}</div><div class="campaign-contract"><div><strong>交付要求：</strong>${esc(brief.deliverableRequirements||'—')}</div><div><strong>允许类型：</strong>${esc((brief.contentTypes||[]).map(label).join('、'))}</div><div><strong>成功指标：</strong>${esc(brief.successMetric||'—')}</div><div><strong>成品校验：</strong>${esc(validation.passed===false?'未通过':validation.passed===true?'通过':'无结构化结果')}</div>${failedChecks.length?`<div><strong>未通过项：</strong>${esc(failedChecks.join('、'))}</div>`:''}</div><div class="approval-history"><strong>审核记录</strong><p>${delivery.reviewNote?`${fmtDate(delivery.reviewedAt)} · ${esc(delivery.reviewNote)}`:'尚无品牌审核记录'}</p></div>`,confirmText:'关闭',cancelText:null,wide:true}); }
    else if (action === 'deliverable-review') { const answer=await openDialog({title:el.dataset.decision==='approve'?'批准交付':el.dataset.decision==='changes'?'要求修改':'拒绝交付',message:'批准后将生成 AIT 结算记录，但不会自动发放。',fields:[{name:'note',label:el.dataset.decision==='approve'?'审批备注（可选）':'审核意见',type:'textarea',required:el.dataset.decision!=='approve'}],confirmText:el.dataset.decision==='approve'?'批准并生成结算':'保存审核结果',danger:el.dataset.decision==='reject'}); if(!answer)return; await api(`/api/deliverables/${el.dataset.id}/review`,{method:'POST',body:JSON.stringify({decision:el.dataset.decision,note:answer.note})}); toast('交付审批已更新'); await refresh({silent:true}); }
    else if (action === 'deliverable-resubmit') { const delivery=state.data.deliverables.find(item=>item.id===el.dataset.id); const campaign=state.data.campaigns.find(item=>item.id===delivery?.campaignId); const allowed=campaign?.brief?.contentTypes||[]; const published=state.data.contents.filter(c=>c.status==='published'&&allowed.includes(c.contentType)); if(!published.length)throw new Error('没有符合 Campaign 类型的已发布内容'); const answer=await openDialog({title:'重新提交交付',fields:[{name:'contentId',label:'选择更新后的符合类型内容',type:'select',options:published.map(c=>({value:c.id,label:`${c.title} · ${label(c.contentType)} · v${c.currentVersion}`}))},{name:'note',label:'修改说明',type:'textarea',required:true}],confirmText:'重新提交'}); if(!answer)return; await api(`/api/deliverables/${el.dataset.id}/resubmit`,{method:'POST',body:JSON.stringify(answer)}); toast('交付已重新提交'); await refresh({silent:true}); }
    else if (action === 'settlement-filter') { state.settlementFilter=el.dataset.filter; shell(); }
    else if (action === 'settlement-export') { downloadCsv(`airvana-settlements-${new Date().toISOString().slice(0,10)}.csv`,[['Campaign','创作者','交付ID','状态','金额','币种','审批时间','发放时间'],...state.data.settlements.map(s=>[s.campaignTitle,s.creatorName,s.deliverableId,label(s.status),s.amount,s.currency,s.approvedAt||'',s.issuedAt||''])]); toast('结算 CSV 已导出'); }
    else if (action === 'settlement-details') { const settlement=state.data.settlements.find(item=>item.id===el.dataset.id); if(!settlement)throw new Error('结算记录不存在'); const history=(settlement.approvals||[]).map(a=>`<article class="approval-step"><span>${fmtDate(a.createdAt)}</span><strong>${esc(label(a.decision))}</strong><p>${esc(a.approverName)} · ${esc(a.note||'无备注')}</p></article>`).join('')||'<p>尚未产生独立审批记录。</p>'; await openDialog({title:'AIT 结算审批轨迹',message:`${settlement.campaignTitle} · ${Number(settlement.amount).toLocaleString()} ${settlement.currency}`,contentHtml:`<div class="trace-timeline">${history}</div><div class="evidence-grid"><div><span>品牌交付批准</span><strong>${fmtDate(settlement.approvedAt)}</strong></div><div><span>当前状态</span><strong>${esc(label(settlement.status))}</strong></div><div><span>账本发放</span><strong>${fmtDate(settlement.issuedAt)}</strong></div></div>`,confirmText:'关闭',cancelText:null}); }
    else if (action === 'settlement-pending') { await api(`/api/settlements/${el.dataset.id}/mark-pending`,{method:'POST'}); toast('结算已进入待发放'); await refresh({silent:true}); }
    else if (action === 'settlement-platform') { const answer=await openDialog({title:el.dataset.decision==='approve'?'批准 AIT 结算':'拒绝 AIT 结算',fields:[{name:'note',label:'复核意见',type:'textarea',required:el.dataset.decision==='reject'}],confirmText:el.dataset.decision==='approve'?'批准':'拒绝',danger:el.dataset.decision==='reject'}); if(!answer)return; await api(`/api/settlements/${el.dataset.id}/platform-approve`,{method:'POST',body:JSON.stringify({decision:el.dataset.decision,note:answer.note})}); toast('平台结算复核已完成'); await refresh({silent:true}); }
    else if (action === 'settlement-issue') { const answer=await openDialog({title:'确认发放 AIT',message:'此操作会生成不可重复的服务端账本事件。AIT 不代表现金、USDT 或固定兑换价值。',confirmText:'确认发放'}); if(!answer)return; await api(`/api/settlements/${el.dataset.id}/issue`,{method:'POST'}); toast('AIT 已发放'); await refresh({silent:true}); }
    else if (action === 'runtime-toggle') { const enabled=el.dataset.enabled==='true'; const answer=await openDialog({title:enabled?'恢复 Agent 运行管线':'紧急停止 Agent 运行管线',message:enabled?'新任务将恢复执行。':'所有新任务停止领取；已落库记录保留。',confirmText:enabled?'确认恢复':'确认停止',danger:!enabled}); if(!answer)return; await api('/api/admin/agent-runtime',{method:'POST',body:JSON.stringify({enabled})}); toast('Agent 运行管线状态已更新'); await refresh({silent:true}); }
    else if (action === 'org-review') { const answer=await openDialog({title:el.dataset.decision==='approve'?'批准品牌组织':'拒绝品牌组织',fields:[{name:'note',label:'审核意见',type:'textarea',required:el.dataset.decision==='reject'}],confirmText:'保存审核'}); if(!answer)return; await api(`/api/organizations/${el.dataset.id}/review`,{method:'POST',body:JSON.stringify({decision:el.dataset.decision,note:answer.note})}); toast('组织审核已完成'); await refresh({silent:true}); }
    else if (action === 'risk-resolve') { const answer=await openDialog({title:el.dataset.decision==='confirm'?'确认风险':'排除风险',fields:[{name:'note',label:'处理说明',type:'textarea',required:true}],confirmText:'保存处理'}); if(!answer)return; await api(`/api/admin/risk-cases/${el.dataset.id}/resolve`,{method:'POST',body:JSON.stringify({decision:el.dataset.decision,note:answer.note})}); toast('风险案件已处理'); await refresh({silent:true}); }
    else if (action === 'report-resolve') { const answer=await openDialog({title:el.dataset.resolution==='takedown'?'下架被举报内容':'驳回内容举报',fields:[{name:'note',label:'处理说明',type:'textarea',required:true}],confirmText:'确认处理',danger:el.dataset.resolution==='takedown'}); if(!answer)return; await api(`/api/admin/content-reports/${el.dataset.id}/resolve`,{method:'POST',body:JSON.stringify({action:el.dataset.resolution,note:answer.note})}); toast('举报已处理'); await refresh({silent:true}); }
    else if (action === 'appeal-resolve') { const answer=await openDialog({title:el.dataset.decision==='restore'?'通过申诉并恢复为草稿':'维持内容下架',message:'恢复为草稿后不会自动公开，创作者需再次确认发布。',fields:[{name:'note',label:'复核说明',type:'textarea',required:true}],confirmText:'保存申诉结果',danger:el.dataset.decision==='uphold'}); if(!answer)return; await api(`/api/admin/content-appeals/${el.dataset.id}/resolve`,{method:'POST',body:JSON.stringify({decision:el.dataset.decision,note:answer.note})}); toast('内容申诉已处理'); await refresh({silent:true}); }
    else if (action === 'point-status') { const answer=await openDialog({title:`确认${label(el.dataset.status)}账本事件`,message:'该操作会立即影响用户可用余额并写入审计日志。撤销后不可恢复。',fields:[{name:'reason',label:'处理原因',type:'textarea',required:true}],confirmText:'确认变更',danger:el.dataset.status==='revoked'}); if(!answer)return; await api(`/api/admin/point-events/${el.dataset.id}/status`,{method:'POST',body:JSON.stringify({status:el.dataset.status,reason:answer.reason})}); toast('账本状态已更新'); await refresh({silent:true}); }
    else if (action === 'notification-filter') { state.notificationFilter=el.dataset.filter; shell(); }
    else if (action === 'notification-read-all') { const result=await api('/api/notifications/read-all',{method:'POST'}); toast(`已将 ${result.updated} 条通知标为已读`); await refresh({silent:true}); }
    else if (action === 'notification-open') { const notice=state.data.notifications.find(item=>item.id===el.dataset.id); if(!notice)return; if(!notice.readAt)await api(`/api/notifications/${notice.id}/read`,{method:'POST'}); state.view=notificationTarget(notice); await refresh({silent:true}); }
    else if (action === 'notification-read') { await api(`/api/notifications/${el.dataset.id}/read`,{method:'POST'}); await refresh({silent:true}); }
    else if (action === 'session-revoke') { const answer=await openDialog({title:'撤销登录会话',message:'如果撤销的是当前会话，页面会返回登录页。',confirmText:'确认撤销',danger:true}); if(!answer)return; await api(`/api/account/sessions/${el.dataset.id}/revoke`,{method:'POST'}); toast('会话已撤销'); await refresh({silent:true}); }
    else if (action === 'accept-terms') { await api('/api/terms/accept',{method:'POST',body:JSON.stringify({documentType:el.dataset.type,documentVersion:'1.0'})}); toast('协议接受记录已保存'); await refresh({silent:true}); }
    else if (action === 'delete-account') { const answer=await openDialog({title:'申请删除账户',message:'提交后进入 30 天冷静期，期间可在此页面取消。',fields:[{name:'reason',label:'删除原因（可选）',type:'textarea'}],confirmText:'提交删除申请',danger:true}); if(!answer)return; const result=await api('/api/account/deletion-request',{method:'POST',body:JSON.stringify(answer)}); toast(`删除申请已提交，计划时间 ${fmtDate(result.scheduledFor)}`); await refresh({silent:true}); }
    else if (action === 'cancel-deletion') { await api(`/api/account/deletion-request/${el.dataset.id}/cancel`,{method:'POST'}); toast('账户删除申请已取消'); await refresh({silent:true}); }
  } catch (error) { toast(error.message,'error'); }
});

app.addEventListener('submit', async event => {
  const form = event.target.closest('[data-form]');
  if (!form) return;
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  try {
    if (form.dataset.form === 'create-task') await api('/api/tasks',{method:'POST',body:JSON.stringify(data)});
    if (form.dataset.form === 'create-agent') await api('/api/agents',{method:'POST',body:JSON.stringify({...data,permissions:{draft:Boolean(data.draft),readAnalytics:Boolean(data.readAnalytics),useBrandAssets:Boolean(data.useBrandAssets)}})});
    if (form.dataset.form === 'create-campaign') {
      data.contentTypes=['game','video','article'].filter(type=>data[type]);
      data.regions=splitList(data.regions);
      data.brandAssets=splitList(data.brandAssets);
      data.optimizableFields=splitList(data.optimizableFields);
      data.lockedFields=['预算','奖励规则','地区','品牌声明','成功指标'];
      await api('/api/campaigns',{method:'POST',body:JSON.stringify(data)});
    }
    if (form.dataset.form === 'profile') await api('/api/profile',{method:'PATCH',body:JSON.stringify(data)});
    if (form.dataset.form === 'discover') { const result=await api(`/api/discover?q=${encodeURIComponent(data.q||'')}&type=${encodeURIComponent(data.type||'')}`); state.searchResults=result.results; shell(); toast(`找到 ${result.results.length} 条内容`); return; }
    toast('已保存到服务端');
    form.reset();
    await refresh({silent:true});
  } catch (error) { toast(error.message,'error'); }
});

modalRoot.addEventListener('click', async event => {
  const el = event.target.closest('[data-action]');
  if (!el || el.dataset.action !== 'wallet-copy') return;
  try {
    await copyCurrentLoginLink();
  } catch (error) {
    toast(error.message, 'error');
  }
});

document.addEventListener('focusout', () => {
  setTimeout(applyPendingData, 0);
});

refresh();

if (window.ethereum?.on) {
  window.ethereum.on('accountsChanged', accounts => {
    if (state.data?.me?.walletAddress && (!accounts.length || accounts[0].toLowerCase() !== state.data.me.walletAddress.toLowerCase())) {
      api('/api/auth/logout',{method:'POST'}).catch(()=>{}).finally(()=>{ stopPolling(); loginView(); toast('钱包账户已变更，请重新签名登录'); });
    }
  });
  window.ethereum.on('chainChanged', () => {
    if (state.data?.me?.walletAddress) toast('钱包网络已变更；下次签名将使用当前网络');
  });
}
