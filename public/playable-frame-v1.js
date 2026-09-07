(function (root) {
  'use strict';

  // The parent owns connection recovery; game logic, sessions and rewards stay in the artifact.
  function resolveSource(source, base) {
    const url = new URL(source, base);
    if (!/^https?:$/.test(url.protocol) || url.origin !== new URL(base).origin ||
        url.username || url.password || !/^\/(content|preview)\/[a-zA-Z0-9_-]+$/.test(url.pathname)) {
      throw new Error('invalid_source');
    }
    return url.href;
  }

  function failureCopy(code, local) {
    if (code === 'unavailable') return { title: '这款游戏暂不可用', description: '作品可能已下架，或还没有发布。可以稍后重试，或先看看其他游戏。' };
    if (code === 'auth') return { title: '需要重新验证访问权限', description: '请返回应用确认登录状态，再重新打开这款游戏。' };
    if (code === 'busy') return { title: '加载请求有点多', description: '请稍等片刻，再点击重新连接。' };
    if (code === 'invalid_source') return { title: '游戏地址暂不可用', description: '这不是可在应用内运行的作品地址，请返回选择其他游戏。' };
    if (code === 'timeout') return { title: '游戏加载时间较长', description: '这次加载没有完成。可以重新连接，也可以先看看其他游戏。' };
    if (code === 'document') return { title: '游戏未能正常打开', description: '运行页面没有加载完成，请重新连接后再试。' };
    return { title: '游戏暂时连接不上', description: local ? '本地游戏服务可能已停止。恢复服务后，点击下方重新连接。' : '请检查网络连接，再重新打开这款游戏。' };
  }

  function createController(options) {
    let generation = 0, controller, timer, phase = 'idle', activeURL = '', pending;
    const delay = options.setTimeout || setTimeout;
    const cancel = options.clearTimeout || clearTimeout;
    function clearWork() { cancel(timer); timer = null; if (controller) controller.abort(); controller = null; }
    function emit(status, code) { phase = status; options.onState({ status, code, url: activeURL }); }
    function fail(token, code) {
      if (token !== generation || phase === 'idle' || phase === 'error') return;
      clearWork(); options.onRemove(); emit('error', code);
    }
    function dispose() { generation++; clearWork(); options.onRemove(); phase = 'idle'; activeURL = ''; }
    function start(source) {
      let url;
      try { url = resolveSource(source, options.baseURL); } catch (_) {
        dispose(); emit('error', 'invalid_source'); return Promise.resolve();
      }
      if (url === activeURL && (phase === 'checking' || phase === 'loading')) return pending;
      dispose(); activeURL = url;
      const token = generation;
      controller = new AbortController();
      emit('checking');
      timer = delay(() => fail(token, 'timeout'), options.timeoutMs || 12000);
      pending = (async () => {
        try {
          const response = await options.fetch(url, { method: 'HEAD', credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal: controller.signal });
          if (token !== generation || phase !== 'checking') return;
          if (!response.ok) {
            const code = response.status === 404 || response.status === 410 ? 'unavailable' :
              response.status === 401 || response.status === 403 ? 'auth' : response.status === 429 ? 'busy' : 'network';
            fail(token, code); return;
          }
          if (!/^text\/html\b/i.test(response.headers.get('content-type') || '')) { fail(token, 'document'); return; }
          emit('loading');
          options.onNavigate(url, token);
        } catch (_) { if (token === generation && phase !== 'error') fail(token, 'network'); }
      })();
      return pending;
    }
    function loaded(token, actualURL, hasBody) {
      if (token !== generation || (phase !== 'loading' && phase !== 'ready')) return;
      // iframe load also fires on Chrome error pages. Never treat it alone as success.
      if (!hasBody || actualURL !== activeURL) { fail(token, 'document'); return; }
      clearWork(); emit('ready');
    }
    return { start, loaded, failed: token => fail(token, 'document'), dispose, getState: () => phase };
  }

  root.AirvanaPlayableFrame = Object.freeze({ version: '1.0.1', resolveSource, failureCopy, createController });
  if (!root.customElements || root.customElements.get('airvana-playable-frame')) return;

  class PlayableFrame extends HTMLElement {
    static get observedAttributes() { return ['src', 'title']; }
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = `
        <style>
          :host{display:block;position:relative;min-height:0;overflow:hidden;isolation:isolate;background:#111821;color:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",system-ui,sans-serif}
          *{box-sizing:border-box}[hidden]{display:none!important}
          .viewport{position:absolute;inset:0}.viewport iframe{width:100%;height:100%;border:0;display:block;background:#111821;visibility:hidden}
          :host([data-state="ready"]) .viewport iframe{visibility:visible}
          .status{position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px;overflow:auto;text-align:center;background:radial-gradient(ellipse at 50% 15%,#253747 0%,#141e2b 50%,#101620 100%);touch-action:pan-y}
          .badge{position:absolute;top:22px;left:22px;font-size:10px;font-weight:700;letter-spacing:1.5px;color:#91a3b8}
          .symbol{display:grid;place-items:center;width:82px;height:82px;flex:none;border-radius:25px;background:#243141;border:1px solid #3a4b60;color:#ff737c;margin-top:20px;box-shadow:0 12px 30px #0003}
          .symbol svg{width:42px;height:42px}.signal{animation:breathe 1.3s ease-in-out infinite}
          :host([data-state="error"]) .signal{animation:none}.game-title{max-width:100%;font-size:12px;line-height:1.6;color:#a7b8cc;overflow-wrap:anywhere}
          h2{font-size:22px;line-height:1.3;letter-spacing:-.4px;margin:0;font-weight:800}p{max-width:290px;margin:0;font-size:13px;line-height:1.8;color:#a9b8ca}
          .actions{display:flex;flex-direction:column;gap:12px;align-items:stretch;width:min(230px,100%);margin-top:6px}
          button,::slotted(button){font:inherit;font-size:14px;font-weight:700;min-height:46px;border-radius:24px;padding:12px 22px;cursor:pointer;width:100%;border:0}
          button{background:#ff4255;color:white;box-shadow:0 6px 20px #ff425522}button:hover{background:#ff596a}button:focus-visible,::slotted(button:focus-visible){outline:3px solid #ff98a1;outline-offset:3px}
          ::slotted(button){background:transparent;color:#d6e0ed;border:1px solid #506074}
          small{font-size:11px;color:#8394aa;line-height:1.7;max-width:280px}
          @keyframes breathe{50%{opacity:.45;transform:translateY(-2px)}}
          @media(prefers-reduced-motion:reduce){.signal{animation:none}}
          @media(max-height:550px){.status{gap:12px;padding:20px}.symbol{width:64px;height:64px;margin-top:16px}.symbol svg{width:34px;height:34px}h2{font-size:20px}}
        </style>
        <div class="viewport"></div>
        <section class="status" aria-live="polite" aria-atomic="true">
          <span class="badge" aria-hidden="true">AIRVANA PLAYABLE</span>
          <div class="symbol" aria-hidden="true"><svg class="signal" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 15h18c5 0 8 5 9 16 0 4-4 6-7 3l-5-5H18l-5 5c-3 3-7 1-7-3 1-11 4-16 9-16Z"/><path d="M16 19v8m-4-4h8"/><circle cx="31" cy="21" r="1"/><circle cx="35" cy="25" r="1"/></svg></div>
          <div class="game-title"></div>
          <h2>正在加载游戏</h2><p>正在连接游戏世界，请稍候…</p>
          <div class="actions"><button type="button" hidden>重新连接</button><slot name="secondary-action"></slot></div>
          <small>游戏加载完成后即可开始互动</small>
        </section>`;
      this._status = this.shadowRoot.querySelector('.status');
      this._viewport = this.shadowRoot.querySelector('.viewport');
      this._retry = this.shadowRoot.querySelector('button');
      this._retry.addEventListener('click', event => { event.stopPropagation(); this.load(); });
      this._controller = createController({
        baseURL: root.location.href,
        fetch: (...args) => root.fetch(...args),
        onState: state => this.renderState(state),
        onRemove: () => this._viewport.replaceChildren(),
        onNavigate: (url, token) => this.navigate(url, token)
      });
    }
    connectedCallback() { this.updateTitle(); this.load(); }
    disconnectedCallback() { this._controller.dispose(); }
    attributeChangedCallback(name, oldValue, value) {
      if (name === 'title') this.updateTitle();
      if (name === 'src' && oldValue !== value && this.isConnected) this.load();
    }
    updateTitle() {
      const title = this.getAttribute('title') || '互动游戏';
      this.shadowRoot.querySelector('.game-title').textContent = title;
      const frame = this._viewport.querySelector('iframe');
      if (frame) frame.title = title;
    }
    load() {
      const source = this.getAttribute('src');
      if (source) return this._controller.start(source);
      this._controller.dispose();
      this.renderState({ status: 'idle' });
    }
    navigate(url, token) {
      const frame = document.createElement('iframe');
      frame.title = this.getAttribute('title') || '互动游戏';
      frame.setAttribute('aria-hidden', 'true');
      frame.setAttribute('tabindex', '-1');
      frame.addEventListener('load', () => {
        try {
          const doc = frame.contentDocument;
          // Verify a real same-origin HTML body, not about:blank, a blocked frame, or an HTTP error.
          this._controller.loaded(token, doc && doc.URL, !!(doc && doc.body && doc.body.children.length));
        } catch (_) { this._controller.failed(token); }
      });
      frame.addEventListener('error', () => this._controller.failed(token));
      frame.src = url;
      this._viewport.replaceChildren(frame);
    }
    renderState(state) {
      this.dataset.state = state.status;
      this.dataset.error = state.code || '';
      this.setAttribute('aria-busy', String(state.status === 'checking' || state.status === 'loading'));
      this._status.hidden = state.status === 'ready';
      this._retry.hidden = state.status !== 'error' || state.code === 'invalid_source';
      if (state.status === 'ready') {
        const frame = this._viewport.querySelector('iframe');
        if (frame) { frame.removeAttribute('aria-hidden'); frame.removeAttribute('tabindex'); }
        return;
      }
      const local = ['localhost', '127.0.0.1', '[::1]'].includes(root.location.hostname);
      const copy = state.status === 'error' ? failureCopy(state.code, local) : { title: '正在加载游戏', description: '正在连接游戏世界，请稍候…' };
      this.shadowRoot.querySelector('h2').textContent = copy.title;
      this.shadowRoot.querySelector('p').textContent = copy.description;
      this.shadowRoot.querySelector('small').textContent = state.status === 'error' ? '重试只会重新打开当前游戏，不会刷新整个 App' : '游戏加载完成后即可开始互动';
    }
  }
  root.customElements.define('airvana-playable-frame', PlayableFrame);
})(globalThis);
