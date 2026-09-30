(async function () {
  'use strict';

  const registry = window.AirvanaGameArtV1;
  const complete = window.AirvanaCompleteGames;
  const deep = window.AirvanaDeepGames;
  const summary = document.getElementById('summary');
  const samples = document.getElementById('samples');
  const resultList = document.getElementById('results');
  const representedFamilies = new Set();
  const preferredSampleByFamily = Object.freeze({
    safety: 'safety-workshop',
    nature: 'orchard-merge',
    motion: 'nova-drift',
    collection: 'red-cup-shuffle',
    rhythm: 'pulse-forge',
    creation: 'studio-wardrobe',
    story: 'adventurer-journal',
    stealth: 'whisker-escape',
    economy: 'coin-journey',
    ocean: 'microbe-arena',
    space: 'rift-strike',
    strategy: 'crystal-bastion'
  });
  const results = [];
  const sprites = window.AirvanaPlayableAssetsV3;

  const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

  async function preloadArt() {
    const sources = [...new Set(registry.list().map(profile => profile.background).filter(Boolean))];
    await Promise.all(sources.map(source => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = resolve;
      image.onerror = () => reject(new Error(`art asset failed to load: ${source}`));
      image.src = source;
    })));
  }

  async function waitForRuntimeReady(engine, timeoutMilliseconds) {
    const startedAt = performance.now();
    while (performance.now() - startedAt < timeoutMilliseconds) {
      const inspection = engine && typeof engine.inspect === 'function' ? engine.inspect() : null;
      if (inspection && inspection.artReady) return inspection;
      await wait(40);
    }
    return engine && typeof engine.inspect === 'function' ? engine.inspect() : null;
  }

  async function waitForVisiblePixels(canvas, timeoutMilliseconds) {
    const startedAt = performance.now();
    while (performance.now() - startedAt < timeoutMilliseconds) {
      if (hasVisiblePixels(canvas)) return true;
      await wait(40);
    }
    return hasVisiblePixels(canvas);
  }

  function titleFor(key) {
    const item = [...complete.list(), ...deep.list()].find(entry => entry.key === key);
    return item ? item.title : key;
  }

  function hasVisiblePixels(canvas) {
    const context = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const points = [
      [Math.floor(width * .14), Math.floor(height * .12)],
      [Math.floor(width * .5), Math.floor(height * .32)],
      [Math.floor(width * .82), Math.floor(height * .64)],
      [Math.floor(width * .5), Math.floor(height * .86)]
    ];
    return points.some(([x, y]) => context.getImageData(x, y, 1, 1).data[3] > 0);
  }

  await preloadArt();
  if (!sprites || !await sprites.load() || sprites.keys().length !== 64) throw new Error('64 gameplay sprites failed to load');

  for (const profile of registry.list()) {
    const canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 640;
    canvas.getContext('2d', {willReadFrequently: true});
    let engine = null;
    let error = null;
    try {
      const runtime = complete.has(profile.gameKey) ? complete : deep;
      const drawsBefore = Object.values(sprites.snapshot().drawCounts).reduce((sum,count)=>sum+count,0);
      engine = runtime.mount(canvas, profile.gameKey, {muted: true, reducedMotion: true});
      if (typeof engine.togglePause !== 'function' || engine.togglePause() !== true) throw new Error('pause contract failed');
      const inspection = await waitForRuntimeReady(engine, 3500);
      if (!inspection || !inspection.artReady) throw new Error('classic-v1 art did not become ready');
      if (inspection.artPack !== 'classic-v1') throw new Error(`unexpected art pack: ${inspection.artPack || 'none'}`);
      if (inspection.stages !== 3) throw new Error(`unexpected stage count: ${inspection.stages}`);
      if ((inspection.gameplayStates || []).join('>') !== 'intro>playing>paused>success>failure>retry') throw new Error('incomplete gameplay state contract');
      if (engine.togglePause() !== false) throw new Error('resume contract failed');
      if (typeof engine.draw === 'function') engine.draw();
      if (!await waitForVisiblePixels(canvas, 1200)) throw new Error('canvas remained transparent');
      const drawsAfter = Object.values(sprites.snapshot().drawCounts).reduce((sum,count)=>sum+count,0);
      if (drawsAfter <= drawsBefore) throw new Error('no actual gameplay sprite drawn');
      if (!sprites.forGame(profile.gameKey).length) throw new Error('gameplay assets missing from registry');
    } catch (caught) {
      error = caught instanceof Error ? caught.message : String(caught);
    }

    const passed = !error;
    results.push({key: profile.gameKey, family: profile.familyKey, artPack: profile.assetPack, stages: 3, passed, error});
    const row = document.createElement('li');
    row.className = passed ? 'is-pass' : 'is-fail';
    row.textContent = `${passed ? '通过' : '失败'} · ${profile.gameKey} · classic-v1 · 三阶段${error ? ` · ${error}` : ''}`;
    resultList.appendChild(row);

    const preferredSample = preferredSampleByFamily[profile.familyKey];
    const shouldRepresent = preferredSample ? preferredSample === profile.gameKey : !representedFamilies.has(profile.familyKey);
    if (passed) {
      representedFamilies.add(profile.familyKey);
      const figure = document.createElement('figure');
      figure.className = 'sample';
      const caption = document.createElement('figcaption');
      caption.innerHTML = `<strong>${titleFor(profile.gameKey)}</strong><span>${profile.familyLabel} · ${profile.gameKey}</span>`;
      figure.append(canvas, caption);
      samples.appendChild(figure);
    }

    if (engine && typeof engine.destroy === 'function') engine.destroy();
  }

  const passed = results.filter(item => item.passed).length;
  const failed = results.length - passed;
  summary.dataset.validationComplete = 'true';
  summary.dataset.pass = String(failed === 0);
  summary.textContent = `${passed} / ${results.length} 运行通过${failed ? ` · ${failed} 款失败` : ' · 64 个游戏对象已加载 · 逐款绘制与暂停验证通过'}`;
  window.__AIRVANA_GAME_ART_VALIDATION__ = Object.freeze({passed, failed, total: results.length, results});
})();
