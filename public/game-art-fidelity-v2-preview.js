(async function () {
  const params = new URLSearchParams(location.search);
  const start = Math.max(0, Number(params.get('start')) || 0);
  const limit = Math.max(1, Number(params.get('limit')) || 38);
  const response = await fetch('./assets/games/fidelity-v2/manifest.json', {cache: 'no-store'});
  if (!response.ok) throw new Error(`Manifest HTTP ${response.status}`);
  const manifest = await response.json();
  const assets = manifest.assets.slice(start, start + limit);
  document.querySelector('#summary').textContent = `显示 ${start + 1}–${start + assets.length} / ${manifest.game_count} · ${manifest.status} · ${manifest.version}`;
  const grid = document.querySelector('#grid');
  assets.forEach(asset => {
    const card = document.createElement('article');
    const image = document.createElement('img');
    image.src = asset.runtime_asset.path.replace(/^public\//, './');
    image.alt = `${asset.title} 游戏场景`;
    image.loading = 'eager';
    const meta = document.createElement('div');
    meta.className = 'meta';
    const title = document.createElement('strong');
    title.textContent = `${asset.content_id}. ${asset.title}`;
    const detail = document.createElement('span');
    detail.textContent = `${asset.game_key} · ${asset.mechanic}`;
    meta.append(title, detail);
    card.append(image, meta);
    grid.append(card);
  });
})();
