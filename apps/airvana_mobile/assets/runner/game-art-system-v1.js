(function (root) {
  'use strict';

  const VERSION = '6.0.0';
  const CLASSIC_ROOT = '/assets/games/classic-v1/';

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

  const FAMILY_OBJECTS = Object.freeze({safety:'shield',nature:'green_apple',motion:'car',collection:'cup',rhythm:'cat',creation:'dress',story:'scroll',stealth:'kitten',economy:'treasure',ocean:'fish',space:'spacecraft',strategy:'sword'});

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
      background: `${CLASSIC_ROOT}scenes/${gameKey}.svg`,
      cover: `${CLASSIC_ROOT}covers/${gameKey}.svg`,
      backgroundKind: 'classic-game-scene',
      emblem: Object.freeze({src: `${CLASSIC_ROOT}sprites/${FAMILY_OBJECTS[familyKey]}.svg`, index: 0, columns: 1, rows: 1}),
      material: Object.freeze({src: `${CLASSIC_ROOT}scenes/${gameKey}.svg`, index: 0, columns: 1, rows: 1}),
      sprite: Object.freeze({src: `${CLASSIC_ROOT}sprites/${FAMILY_OBJECTS[familyKey]}.svg`, columns: 1, rows: 1, source: 'ORIGINAL_CODE_NATIVE_VECTOR', authorization: 'LOCAL_DEMO'}),
      assetPack: 'classic-v1',
      gameplayAssetPack: 'classic-v1',
      artStyle: 'classic-flat-2d',
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
