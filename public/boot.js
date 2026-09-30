  (() => {
    const key = 'airvana.v5.theme-mode';
    let preference = 'light';
    try {
      const saved = localStorage.getItem(key);
      if (saved === 'system' || saved === 'light' || saved === 'dark') preference = saved;
    } catch (err) {}
    const systemDark = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
    const resolved = preference === 'dark' || (preference === 'system' && systemDark) ? 'dark' : 'light';
    document.documentElement.dataset.airvanaTheme = resolved;
    document.documentElement.dataset.airvanaThemePreference = preference;
    document.documentElement.style.colorScheme = resolved;
    document.documentElement.style.backgroundColor = resolved === 'dark' ? '#0F1013' : '#E8E8ED';
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', resolved === 'dark' ? '#0F1013' : '#F2F2F7');
  })();

  (() => {
    const userAgent = navigator.userAgent || '';
    const nativeParams = new URLSearchParams(location.search);
    const forcedNativePreview = nativeParams.get('native-shell') === '1';
    if (forcedNativePreview || /;\s*wv\)/i.test(userAgent)) {
      document.documentElement.classList.add('native-app-shell');
    }
    if (nativeParams.get('native-platform') === 'ios') {
      document.documentElement.classList.add('native-ios-shell');
    }
  })();

  (() => {
    const root = document.documentElement;
    const textControlSelector = [
      'textarea',
      'select',
      'input:not([type])',
      'input[type="text"]',
      'input[type="email"]',
      'input[type="password"]',
      'input[type="search"]',
      'input[type="tel"]',
      'input[type="url"]',
      'input[type="number"]'
    ].join(',');
    const isTextControl = element => !!(element && element.matches && element.matches(textControlSelector));
    const syncMobileTextViewport = () => {
      const viewport = window.visualViewport;
      const width = viewport ? viewport.width : window.innerWidth;
      const height = viewport ? viewport.height : window.innerHeight;
      const left = viewport ? viewport.offsetLeft : 0;
      const top = viewport ? viewport.offsetTop : 0;
      root.style.setProperty('--mobile-visual-width', `${Math.max(1, Math.round(width))}px`);
      root.style.setProperty('--mobile-visual-height', `${Math.max(1, Math.round(height))}px`);
      root.style.setProperty('--mobile-visual-left', `${Math.max(0, Math.round(left))}px`);
      root.style.setProperty('--mobile-visual-top', `${Math.max(0, Math.round(top))}px`);
    };
    const focusActiveControl = event => {
      if (!isTextControl(event.target)) return;
      root.classList.add('mobile-text-entry-active');
      syncMobileTextViewport();
      window.setTimeout(syncMobileTextViewport, 80);
      window.setTimeout(() => {
        syncMobileTextViewport();
        if (event.target && event.target.scrollIntoView) {
          event.target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
      }, 280);
    };
    const releaseActiveControl = () => {
      window.setTimeout(() => {
        if (isTextControl(document.activeElement)) return;
        root.classList.remove('mobile-text-entry-active');
        root.style.removeProperty('--mobile-visual-width');
        root.style.removeProperty('--mobile-visual-height');
        root.style.removeProperty('--mobile-visual-left');
        root.style.removeProperty('--mobile-visual-top');
      }, 180);
    };
    const dismissTextEntryOutside = event => {
      const active = document.activeElement;
      if (!isTextControl(active)) return;
      const target = event.target;
      if (!target || target === active || (active.contains && active.contains(target))) return;
      const field = active.closest && active.closest('label');
      if (field && field.contains(target)) return;
      active.blur();
    };
    document.addEventListener('focusin', focusActiveControl, true);
    document.addEventListener('focusout', releaseActiveControl, true);
    document.addEventListener('pointerdown', dismissTextEntryOutside, true);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', syncMobileTextViewport);
      window.visualViewport.addEventListener('scroll', syncMobileTextViewport);
    }
  })();

(() => {
  try {
    const params = new URLSearchParams(location.search);
    const raw = parseFloat(params.get('display-scale') || '');
    if (Number.isFinite(raw) && raw >= 0.4 && raw <= 1) {
      document.documentElement.style.zoom = String(raw);
    }
  } catch (error) {
    /* 展示比例参数无效时保持默认布局 */
  }
})();
