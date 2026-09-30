(function () {
  'use strict';

  const registry = window.AirvanaGameArtV1;
  const complete = window.AirvanaCompleteGames;
  const deep = window.AirvanaDeepGames;
  const grid = document.getElementById('art-grid');
  const filters = document.getElementById('family-filter');

  if (!registry || !grid || !filters) return;

  const titleByKey = new Map();
  [complete, deep].forEach(runtime => {
    if (!runtime || typeof runtime.list !== 'function') return;
    runtime.list().forEach(item => titleByKey.set(item.key, item.name || item.title || item.key));
  });

  const profiles = registry.list();
  const families = [];
  profiles.forEach(profile => {
    if (!families.some(item => item.key === profile.familyKey)) {
      families.push({key: profile.familyKey, label: profile.familyLabel});
    }
  });

  function render(family) {
    const visible = family === 'all' ? profiles : profiles.filter(profile => profile.familyKey === family);
    grid.innerHTML = visible.map(profile => {
      const title = titleByKey.get(profile.gameKey) || profile.gameKey;
      const kind = '休闲 2.5D';
      return `
        <article class="art-card" data-game-key="${profile.gameKey}" data-family="${profile.familyKey}">
          <img class="art-card__background" src="${profile.background}" alt="${title} 游戏内部背景" loading="lazy">
          <div class="art-card__top">
            <span class="family-pill">${profile.familyLabel}</span>
            <span class="art-kind">${kind}</span>
          </div>
          <div class="art-card__body">
            <img class="family-emblem" src="${profile.emblem.src}" alt="" aria-hidden="true">
            <h2>${title}</h2>
            <div class="art-card__key">${profile.gameKey}</div>
            <div class="art-card__meta">
              <span>独立主题素材 v${profile.version}</span>
              <span class="art-card__status">${profile.authorization}</span>
            </div>
          </div>
        </article>`;
    }).join('') || '<div class="empty">当前筛选下没有游戏</div>';
    document.getElementById('game-count').textContent = String(visible.length);
  }

  families.forEach(family => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.family = family.key;
    button.textContent = family.label;
    filters.appendChild(button);
  });

  filters.addEventListener('click', event => {
    const button = event.target.closest('button[data-family]');
    if (!button) return;
    filters.querySelectorAll('button').forEach(item => item.classList.toggle('is-active', item === button));
    render(button.dataset.family);
  });

  render('all');
})();
