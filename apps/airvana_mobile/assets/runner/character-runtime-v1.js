(function (root) {
  'use strict';

  const VERSION = '1.0.1';
  const CHARACTER_BY_GAME = Object.freeze({
    'pixel-quest': Object.freeze({gameId: 5, characterId: 'chr_nova_runner', name: 'Nova Runner', master: '/assets/characters/v1/chr_nova_runner/master.svg', cover: '/assets/game-covers/character-consistency-v1/pixel-quest.svg'}),
    'paws-stage': Object.freeze({gameId: 10, characterId: 'chr_mochi_beat', name: 'Mochi Beat', master: '/assets/characters/v1/chr_mochi_beat/master.svg', cover: '/assets/game-covers/character-consistency-v1/paws-stage.svg'}),
    'puppet-studio': Object.freeze({gameId: 12, characterId: 'chr_lumi_doll', name: 'Lumi Doll', master: '/assets/characters/v1/chr_lumi_doll/master.svg', cover: '/assets/game-covers/character-consistency-v1/puppet-studio.svg'}),
    'formation-knights': Object.freeze({gameId: 20, characterId: 'chr_aegis_rowan', name: 'Aegis Rowan', master: '/assets/characters/v1/chr_aegis_rowan/master.svg', cover: '/assets/game-covers/character-consistency-v1/formation-knights.svg'}),
    'moonlight-tea-shop': Object.freeze({gameId: 36, characterId: 'chr_mina_vale', name: 'Mina Vale', master: '/assets/characters/v1/chr_mina_vale/master.svg', cover: '/assets/game-covers/character-consistency-v1/moonlight-tea-shop.svg'})
  });
  const imageCache = new Map();

  function profile(gameKey) {
    return CHARACTER_BY_GAME[gameKey] || null;
  }

  function imageFor(gameKey) {
    const item = profile(gameKey);
    if (!item || typeof root.Image !== 'function') return null;
    if (imageCache.has(item.characterId)) return imageCache.get(item.characterId);
    const image = new root.Image();
    image.decoding = 'async';
    image.src = item.master;
    imageCache.set(item.characterId, image);
    return image;
  }

  function preload(gameKey) {
    const image = imageFor(gameKey);
    if (!image) return Promise.resolve(false);
    if (image.complete && image.naturalWidth) return Promise.resolve(true);
    if (typeof image.decode === 'function') return image.decode().then(() => true).catch(() => false);
    return new Promise(resolve => {
      const finish = value => resolve(value);
      image.addEventListener('load', () => finish(true), {once: true});
      image.addEventListener('error', () => finish(false), {once: true});
    });
  }

  function draw(context, gameKey, rect, options) {
    const image = imageFor(gameKey);
    if (!context || !image || !image.complete || !image.naturalWidth) return false;
    const settings = options || {};
    const x = Number(rect && rect.x) || 0;
    const y = Number(rect && rect.y) || 0;
    const width = Math.max(1, Number(rect && rect.w) || 1);
    const height = Math.max(1, Number(rect && rect.h) || 1);
    context.save();
    context.globalAlpha = settings.alpha == null ? 1 : Math.max(0, Math.min(1, Number(settings.alpha) || 0));
    if (settings.shadow !== false) {
      context.shadowColor = settings.shadowColor || 'rgba(4, 7, 11, .34)';
      context.shadowBlur = Number(settings.shadowBlur) || 8;
      context.shadowOffsetY = Number(settings.shadowOffsetY) || 4;
    }
    if (settings.mirror) {
      context.translate(x + width, y);
      context.scale(-1, 1);
      context.drawImage(image, 0, 0, width, height);
    } else context.drawImage(image, x, y, width, height);
    context.restore();
    return true;
  }

  root.AirvanaCharacterRuntime = Object.freeze({
    version: VERSION,
    has: gameKey => !!profile(gameKey),
    getByGame: gameKey => profile(gameKey),
    list: () => Object.entries(CHARACTER_BY_GAME).map(([gameKey, item]) => ({gameKey, ...item})),
    preload,
    draw
  });
})(typeof window !== 'undefined' ? window : globalThis);
