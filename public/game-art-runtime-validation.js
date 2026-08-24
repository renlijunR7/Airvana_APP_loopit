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

  const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

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

  for (const profile of registry.list()) {
    const canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 640;
    let engine = null;
    let error = null;
    try {
      const runtime = complete.has(profile.gameKey) ? complete : deep;
      engine = runtime.mount(canvas, profile.gameKey, {muted: true});
      await wait(160);
      if (!hasVisiblePixels(canvas)) throw new Error('canvas remained transparent');
    } catch (caught) {
      error = caught instanceof Error ? caught.message : String(caught);
    }

    const passed = !error;
    results.push({key: profile.gameKey, family: profile.familyKey, passed, error});
    const row = document.createElement('li');
    row.className = passed ? 'is-pass' : 'is-fail';
    row.textContent = `${passed ? '通过' : '失败'} · ${profile.gameKey}${error ? ` · ${error}` : ''}`;
    resultList.appendChild(row);

    const preferredSample = preferredSampleByFamily[profile.familyKey];
    const shouldRepresent = preferredSample ? preferredSample === profile.gameKey : !representedFamilies.has(profile.familyKey);
    if (passed && !representedFamilies.has(profile.familyKey) && shouldRepresent) {
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
  summary.textContent = `${passed} / ${results.length} 运行通过${failed ? ` · ${failed} 款失败` : ' · 12 类玩法均已采样'}`;
  window.__AIRVANA_GAME_ART_VALIDATION__ = Object.freeze({passed, failed, total: results.length, results});
})();
