'use strict';
    const frames = [...document.querySelectorAll('iframe')];
    const summary = document.querySelector('#summary');
    const auditButton = document.querySelector('#run-audit');
    let lastAudit = [];
    function loadGames() {
      const contentId = document.querySelector('#game-select').value;
      for (const frame of frames) {
        frame.src = '/content/' + encodeURIComponent(contentId) + '?embed=1';
        const result = document.querySelector('#result-' + frame.width); result.textContent = '已重新载入，等待检查'; delete result.dataset.status;
      }
      summary.textContent = '游戏已重新载入'; document.querySelector('#audit-json').textContent = '暂无'; lastAudit = [];
    }
    const rectJSON = rect => Object.fromEntries(['x','y','width','height','right','bottom'].map(key => [key, Math.round(rect[key] * 100) / 100]));
    function visible(node, view) {
      const rect = node.getBoundingClientRect(); const style = view.getComputedStyle(node);
      if (rect.width <= 0 || rect.height <= 0 || style.visibility === 'hidden' || style.display === 'none') return false;
      for (let parent = node; parent; parent = parent.parentElement) if (view.getComputedStyle(parent).opacity === '0' || parent.hidden) return false;
      return true;
    }
    async function checkImage(url, view) {
      const resolved = new URL(url, view.location.href);
      if (resolved.origin !== location.origin) return { url: resolved.href, loaded: false, reason: 'not same origin' };
      return await new Promise(resolve => {
        const image = new Image(); let finished = false;
        const finish = loaded => { if (finished) return; finished = true; clearTimeout(timer); resolve({ url: resolved.pathname, loaded, width: image.naturalWidth, height: image.naturalHeight }); };
        const timer = setTimeout(() => finish(false), 6000);
        image.onload = () => finish(image.naturalWidth > 0); image.onerror = () => finish(false); image.src = resolved.href;
      });
    }
    async function auditFrame(frame) {
      try {
        const doc = frame.contentDocument; const view = frame.contentWindow;
        if (!doc || !view || doc.readyState !== 'complete') throw new Error('画面尚未加载完成');
        const width = view.innerWidth, height = view.innerHeight;
        const controls = [...new Set(doc.querySelectorAll('button,[role="button"],.choice,.memory-card'))].filter(node => visible(node, view));
        const checked = controls.map(node => {
          const rect = node.getBoundingClientRect();
          return { label: (node.getAttribute('aria-label') || node.textContent || node.tagName).trim().slice(0,70), rect: rectJSON(rect), inside: rect.left >= -.5 && rect.top >= -.5 && rect.right <= width + .5 && rect.bottom <= height + .5 };
        });
        const surfaces = [...doc.querySelectorAll('#game-root,canvas,.overlay > .sprite,.overlay > h1,.overlay > h2,.overlay > p,.overlay > [role="alert"]')].filter(node => visible(node, view)).map(node => {
          const rect = node.getBoundingClientRect();
          const overlayChild = node.parentElement?.classList.contains('overlay');
          const minimumTop = overlayChild ? (doc.querySelector('.toolbar')?.getBoundingClientRect().bottom || 0) : 0;
          return { element: node.id || node.className || node.tagName, rect: rectJSON(rect), inside: rect.left >= -.5 && rect.top >= minimumTop -.5 && rect.right <= width + .5 && rect.bottom <= height + .5 };
        });
        const sprites = [...doc.querySelectorAll('.sprite')].filter(node => visible(node, view));
        const urls = new Set(); let missingSprite = 0;
        for (const node of sprites) { const value = view.getComputedStyle(node).backgroundImage; const match = /url\(["']?(.*?)["']?\)/.exec(value); if (match) urls.add(match[1]); else missingSprite++; }
        for (const img of doc.images) if (visible(img, view) && img.currentSrc) urls.add(img.currentSrc);
        const images = await Promise.all([...urls].map(url => checkImage(url, view)));
        const badControls = checked.filter(item => !item.inside); const badSurfaces = surfaces.filter(item => !item.inside);
        const failedImages = images.filter(item => !item.loaded);
        const passed = checked.length > 0 && !badControls.length && !badSurfaces.length && !failedImages.length && !missingSprite;
        return { frame: frame.id, width, height, url: view.location.pathname, passed, visibleControls: checked.length, outsideControls: badControls,
          surfaces, visibleSprites: sprites.length, spritesWithoutImage: missingSprite, images, controls: checked,
          scope: 'DOM geometry and same-origin image load only; no gameplay state or completion inferred' };
      } catch (error) { return { frame: frame.id, passed: false, error: error.message }; }
    }
    document.querySelector('#reload').addEventListener('click', loadGames);
    document.querySelector('#game-select').addEventListener('change', loadGames);
    auditButton.addEventListener('click', async () => {
      auditButton.disabled = true; summary.textContent = '正在检查边界和素材…';
      try {
        lastAudit = await Promise.all(frames.map(auditFrame));
        for (const result of lastAudit) {
          const frame = document.getElementById(result.frame); const target = document.querySelector('#result-' + frame.width);
          target.dataset.status = result.passed ? 'pass' : 'fail';
          target.textContent = result.error ? '检查失败：' + result.error : `${result.passed ? '通过' : '需要检查'} · 可见控件 ${result.visibleControls} · 越界 ${result.outsideControls.length}\n可见精灵 ${result.visibleSprites} · 素材 ${result.images.filter(item => item.loaded).length}/${result.images.length} 已加载`;
        }
        summary.textContent = lastAudit.filter(result => result.passed).length + ' / 3 个尺寸通过';
        document.querySelector('#audit-json').textContent = JSON.stringify(lastAudit, null, 2);
      } finally { auditButton.disabled = false; }
    });
