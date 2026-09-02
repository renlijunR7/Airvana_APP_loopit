(function (root) {
  'use strict';

  const VERSION = '3.0.0';
  const EMBLEM_ATLAS = '/assets/games/global-art-v1/runtime/game-family-emblems-v1.png';
  const MATERIAL_ATLAS = '/assets/games/global-art-v1/runtime/game-material-atlas-v1.jpg';
  const COVER_ROOT = '/assets/game-covers/store-fidelity-v4/';
  const IMMERSIVE_ROOT = '/assets/games/immersive-art-v2/runtime/';
  const DEDICATED_SCENE_ROOT = '/assets/games/dedicated-scenes-v1/runtime/';

  const FAMILIES = Object.freeze({
    safety: Object.freeze({index: 0, label: '安全判断'}),
    nature: Object.freeze({index: 1, label: '自然经营'}),
    motion: Object.freeze({index: 2, label: '移动挑战'}),
    collection: Object.freeze({index: 3, label: '观察收集'}),
    rhythm: Object.freeze({index: 4, label: '节奏演奏'}),
    creation: Object.freeze({index: 5, label: '造型创作'}),
    story: Object.freeze({index: 6, label: '叙事推理'}),
    stealth: Object.freeze({index: 7, label: '潜行探索'}),
    economy: Object.freeze({index: 8, label: '旅行交换'}),
    ocean: Object.freeze({index: 9, label: '水域生态'}),
    space: Object.freeze({index: 10, label: '太空行动'}),
    strategy: Object.freeze({index: 11, label: '策略防守'})
  });

  const IMMERSIVE_KITS = Object.freeze(Object.fromEntries(
    Object.keys(FAMILIES).map(familyKey => [familyKey, Object.freeze({
      src: `${IMMERSIVE_ROOT}${familyKey}-kit-v2.png`,
      columns: 3,
      rows: 2,
      blendMode: 'screen',
      authorization: 'LOCAL_DEMO',
      source: 'IMAGEGEN'
    })])
  ));

  const GROUPS = Object.freeze({
    safety: ['safety-workshop'],
    nature: ['stellar-farm', 'stardust-island', 'orchard-merge', 'garden-renewal'],
    motion: ['pixel-quest', 'city-rush', 'neon-dash', 'nova-drift', 'sky-stack'],
    collection: ['red-cup-shuffle', 'galaxy-toy-shop', 'star-cups', 'moonlight-tea-shop'],
    rhythm: ['magic-choir', 'paws-stage', 'pulse-forge'],
    creation: ['puppet-studio', 'studio-wardrobe'],
    story: ['firefly-mail', 'adventurer-journal', 'idiom-detective'],
    stealth: ['whisker-escape'],
    economy: ['coin-journey', 'prism-match'],
    ocean: ['jungle-dive', 'deep-catch', 'microbe-arena'],
    space: ['rift-strike', 'void-squadron', 'star-mower'],
    strategy: ['formation-knights', 'sky-cannon', 'ember-bastion', 'crystal-bastion', 'star-deck', 'hex-frontier', 'rune-circuit']
  });

  const BACKGROUND_OVERRIDES = Object.freeze({
    'safety-workshop': `${DEDICATED_SCENE_ROOT}safety-workshop-gameplay-v1.jpg`,
    'stellar-farm': `${DEDICATED_SCENE_ROOT}stellar-farm-gameplay-v1.jpg`,
    'stardust-island': `${DEDICATED_SCENE_ROOT}stardust-island-gameplay-v1.jpg`,
    'pixel-quest': `${DEDICATED_SCENE_ROOT}pixel-quest-gameplay-v1.jpg`,
    'city-rush': `${DEDICATED_SCENE_ROOT}city-rush-gameplay-v1.jpg`,
    'red-cup-shuffle': `${DEDICATED_SCENE_ROOT}red-cup-shuffle-gameplay-v1.jpg`,
    'galaxy-toy-shop': `${DEDICATED_SCENE_ROOT}galaxy-toy-shop-gameplay-v1.jpg`,
    'magic-choir': `${DEDICATED_SCENE_ROOT}magic-choir-gameplay-v1.jpg`,
    'paws-stage': `${DEDICATED_SCENE_ROOT}paws-stage-gameplay-v1.jpg`,
    'puppet-studio': `${DEDICATED_SCENE_ROOT}puppet-studio-gameplay-v1.jpg`,
    'firefly-mail': `${DEDICATED_SCENE_ROOT}firefly-mail-gameplay-v1.jpg`,
    'whisker-escape': `${DEDICATED_SCENE_ROOT}whisker-escape-gameplay-v1.jpg`,
    'coin-journey': `${DEDICATED_SCENE_ROOT}coin-journey-gameplay-v1.jpg`,
    'jungle-dive': `${DEDICATED_SCENE_ROOT}jungle-dive-gameplay-v1.jpg`,
    'rift-strike': `${DEDICATED_SCENE_ROOT}rift-strike-gameplay-v1.jpg`,
    'formation-knights': `${DEDICATED_SCENE_ROOT}formation-knights-gameplay-v1.jpg`,
    'sky-cannon': `${DEDICATED_SCENE_ROOT}sky-cannon-gameplay-v1.jpg`,
    'orchard-merge': '/assets/games/orchard-merge-v2/runtime/orchard-background-v2.jpg',
    'star-cups': '/assets/deep-games/v3/star-cups-gameplay-v3.jpg',
    'ember-bastion': '/assets/deep-games/v3/ember-bastion-gameplay-v3.jpg',
    'microbe-arena': `${DEDICATED_SCENE_ROOT}microbe-arena-gameplay-refined-v1.jpg`,
    'rune-circuit': '/assets/deep-games/v3/rune-circuit-gameplay-v3.jpg',
    'sky-stack': '/assets/deep-games/v3/sky-stack-gameplay-v3.jpg',
    'pulse-forge': `${DEDICATED_SCENE_ROOT}pulse-forge-gameplay-refined-v1.jpg`,
    'deep-catch': `${DEDICATED_SCENE_ROOT}deep-catch-gameplay-refined-v1.jpg`,
    'crystal-bastion': `${DEDICATED_SCENE_ROOT}crystal-bastion-gameplay-refined-v1.jpg`,
    'prism-match': '/assets/deep-games/v3/prism-match-gameplay-v3.jpg',
    'nova-drift': '/assets/deep-games/v3/nova-drift-gameplay-v3.jpg',
    'moonlight-tea-shop': '/assets/deep-games/v3/moonlight-tea-shop-gameplay-v3.jpg',
    'void-squadron': `${DEDICATED_SCENE_ROOT}void-squadron-gameplay-refined-v1.jpg`,
    'neon-dash': '/assets/deep-games/v3/neon-dash-gameplay-v3.jpg',
    'studio-wardrobe': `${DEDICATED_SCENE_ROOT}studio-wardrobe-gameplay-refined-v1.jpg`,
    'star-deck': '/assets/deep-games/v2/star-deck-gameplay-v2.jpg',
    'idiom-detective': '/assets/deep-games/v2/idiom-detective-gameplay-v2.jpg',
    'hex-frontier': '/assets/deep-games/v2/hex-frontier-gameplay-v2.jpg',
    'adventurer-journal': '/assets/deep-games/v2/adventurer-journal-gameplay-v2.jpg',
    'star-mower': `${DEDICATED_SCENE_ROOT}star-mower-gameplay-refined-v1.jpg`,
    'garden-renewal': '/assets/deep-games/v2/garden-renewal-gameplay-v2.jpg'
  });

  const familyByGame = {};
  Object.entries(GROUPS).forEach(([family, games]) => games.forEach(game => { familyByGame[game] = family; }));
  const gameKeys = Object.freeze(Object.keys(familyByGame));

  function get(gameKey) {
    const familyKey = familyByGame[gameKey];
    if (!familyKey) return null;
    const family = FAMILIES[familyKey];
    return Object.freeze({
      gameKey,
      familyKey,
      familyLabel: family.label,
      background: BACKGROUND_OVERRIDES[gameKey] || `${COVER_ROOT}${gameKey}.jpg`,
      backgroundKind: BACKGROUND_OVERRIDES[gameKey] ? 'gameplay-art' : 'store-cover-fallback',
      emblem: Object.freeze({src: EMBLEM_ATLAS, index: family.index, columns: 4, rows: 3}),
      material: Object.freeze({src: MATERIAL_ATLAS, index: family.index, columns: 4, rows: 3}),
      sprite: IMMERSIVE_KITS[familyKey],
      authorization: 'LOCAL_DEMO',
      version: VERSION
    });
  }

  root.AirvanaGameArtV1 = Object.freeze({
    version: VERSION,
    status: 'LOCAL_DEMO',
    gameCount: gameKeys.length,
    list: () => gameKeys.map(get),
    has: gameKey => !!familyByGame[gameKey],
    get
  });
})(typeof window !== 'undefined' ? window : globalThis);
