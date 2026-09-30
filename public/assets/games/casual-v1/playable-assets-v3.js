(function(root) {
  'use strict';
  const VERSION = '5.0.0';
  const FAMILY_KEYS = Object.freeze({
    action: ['runner','roadblock','energy','car','spacecraft','enemy_ship','bullet','drone','fish','predator_fish','hook','microbe','microbe_enemy','mower','spore','cannon'],
    puzzle: ['green_apple','pear','red_apple','orange','plum','golden_fruit','emerald','ruby','sapphire','amethyst','cup','star','parcel','scroll','key','flower'],
    strategy: ['hero','sentinel','guardian','crystal','turret','raider','sword','shield','potion','frost','fire','boots','tent','house','tree','treasure'],
    lifestyle: ['cat','kitten','plush','model','dress','hat','shoes','glasses','tea','coffee','seedling','watering_can','seeds','shovel','mailbox','letter']
  });
  // New painted 2.5D sprites, imported from ImageGen source mattes as genuine-alpha PNGs.
  const SPRITE_SIZES = Object.freeze({"runner":[205,270],"roadblock":[236,247],"energy":[159,223],"car":[231,243],"spacecraft":[226,248],"enemy_ship":[248,255],"bullet":[169,137],"drone":[284,220],"fish":[220,169],"predator_fish":[286,166],"hook":[168,249],"microbe":[213,214],"microbe_enemy":[217,227],"mower":[252,269],"spore":[209,230],"cannon":[221,254],"green_apple":[230,255],"pear":[216,263],"red_apple":[231,251],"orange":[230,228],"plum":[210,233],"golden_fruit":[243,271],"emerald":[202,212],"ruby":[197,214],"sapphire":[195,204],"amethyst":[196,203],"cup":[210,233],"star":[213,212],"parcel":[222,237],"scroll":[212,224],"key":[218,241],"flower":[223,252],"hero":[144,289],"sentinel":[264,282],"guardian":[246,291],"crystal":[199,255],"turret":[191,235],"raider":[210,252],"sword":[172,229],"shield":[186,228],"potion":[170,222],"frost":[207,225],"fire":[179,231],"boots":[241,222],"tent":[246,243],"house":[229,246],"tree":[221,255],"treasure":[230,250],"cat":[189,298],"kitten":[189,261],"plush":[231,282],"model":[130,343],"dress":[211,271],"hat":[285,211],"shoes":[255,187],"glasses":[290,157],"tea":[258,212],"coffee":[252,216],"seedling":[180,249],"watering_can":[296,216],"seeds":[189,236],"shovel":[211,241],"mailbox":[203,262],"letter":[253,208]});
  const GAME_KEYS = Object.freeze({
    'safety-workshop':['shield','key','scroll','raider','guardian'],
    'stellar-farm':['seedling','seeds','watering_can','tree','flower','green_apple','house'],
    'pixel-quest':['runner','roadblock','energy','star'],
    'red-cup-shuffle':['cup','star'],
    'magic-choir':['star','sapphire','amethyst','emerald','ruby'],
    'paws-stage':['kitten','star','sapphire','amethyst','emerald','ruby'],
    'puppet-studio':['plush','dress','hat','shoes','glasses','flower'],
    'firefly-mail':['letter','mailbox','parcel','star','tree','house'],
    'whisker-escape':['cat','raider','key','treasure'],
    'coin-journey':['cannon','star','treasure','energy'],
    'jungle-dive':['fish','predator_fish','hook','star'],
    'rift-strike':['spacecraft','enemy_ship','bullet','energy'],
    'stardust-island':['seedling','seeds','watering_can','house','tree','tent','flower','energy'],
    'formation-knights':['hero','sentinel','sword','shield','fire'],
    'galaxy-toy-shop':['plush','parcel','star','sapphire','ruby','treasure'],
    'city-rush':['car','roadblock','energy','star'],
    'sky-cannon':['cannon','raider','fire','star'],
    'neon-dash':['runner','roadblock','energy','star'],
    'pulse-forge':['star','sapphire','amethyst','emerald','ruby'],
    'sky-stack':['crystal','emerald','ruby','sapphire'],
    'rune-circuit':['crystal','energy','sapphire'],
    'prism-match':['emerald','ruby','sapphire','amethyst','star'],
    'star-cups':['cup','star'],
    'deep-catch':['fish','predator_fish','hook','star'],
    'ember-bastion':['turret','raider','fire','energy','guardian'],
    'nova-drift':['car','roadblock','energy','star'],
    'void-squadron':['spacecraft','enemy_ship','bullet','energy'],
    'orchard-merge':['green_apple','pear','red_apple','orange','plum','golden_fruit'],
    'star-mower':['mower','spore','microbe_enemy','boots','energy','sword','shield','potion'],
    'moonlight-tea-shop':['tea','coffee','cup','parcel','flower','potion','star'],
    'microbe-arena':['microbe','microbe_enemy','energy','emerald'],
    'star-deck':['hero','sentinel','guardian','raider','crystal','energy','star','sword','shield','potion','frost','fire'],
    'crystal-bastion':['turret','raider','crystal','energy','guardian'],
    'adventurer-journal':['hero','tent','tree','scroll','treasure','potion','boots','house','crystal','key','sapphire','fire','raider'],
    'idiom-detective':['star','fire','tree','flower','fish','emerald','cup','treasure','sword','boots','shield','potion','sapphire','key','house','sentinel','car','golden_fruit'],
    'hex-frontier':['hero','guardian','raider','house','tree','crystal','sentinel','cannon','turret','sword','star'],
    'studio-wardrobe':['model','dress','hat','shoes','glasses','flower'],
    'garden-renewal':['flower','sapphire','orange','emerald','amethyst','crystal','house','star']
  });
  const script = root.document && root.document.currentScript;
  let base = '/assets/games/casual-v1/sprites/';
  if (script && script.src && typeof URL === 'function') base = new URL('./assets/games/casual-v1/sprites/', script.src).href;
  const frames = {};
  const images = {};
  const errors = {};
  const drawCounts = {};
  let loading = null;
  Object.entries(FAMILY_KEYS).forEach(([family, keys]) => keys.forEach((key,index) => {
    frames[key] = Object.freeze({
      key, family, atlas:family, src:base+key+'.png', index, columns:1, rows:1,
      format:'png', style:'casual-painted-2.5d', pixel:false,
      rect:Object.freeze({x:0,y:0,w:SPRITE_SIZES[key][0],h:SPRITE_SIZES[key][1]})
    });
  }));
  function imageReady(image) { return !!(image && image.complete && (image.naturalWidth || image.width) > 0); }
  function load() {
    if (loading) return loading;
    if (typeof root.Image !== 'function') return Promise.resolve(false);
    loading = Promise.all(Object.keys(frames).map(key => new Promise(resolve => {
      if (imageReady(images[key])) { resolve(true); return; }
      const image = new root.Image();
      images[key] = image;
      image.decoding = 'async';
      image.onload = () => { delete errors[key]; resolve(true); };
      image.onerror = () => { errors[key] = 'Unable to load casual game sprite: '+key; resolve(false); };
      image.src = frames[key].src;
    }))).then(values => values.every(Boolean));
    return loading;
  }
  function draw(context,key,rect,options) {
    const frame=frames[key]; if(!frame || !context || !rect) return false;
    const image=images[key]; if(!imageReady(image)) { load(); return false; }
    const sourceWidth=image.naturalWidth || image.width, sourceHeight=image.naturalHeight || image.height;
    const scale=Math.min(rect.w/sourceWidth,rect.h/sourceHeight);
    if(!Number.isFinite(scale) || scale<=0) return false;
    const opts=options||{}, width=sourceWidth*scale,height=sourceHeight*scale;
    context.save();
    if(frame.pixel) context.imageSmoothingEnabled=false;
    if(Number.isFinite(opts.alpha)) context.globalAlpha*=Math.max(0,Math.min(1,opts.alpha));
    context.translate(rect.x+rect.w/2,rect.y+rect.h/2);
    if(opts.rotation) context.rotate(opts.rotation);
    if(opts.flipX) context.scale(-1,1);
    context.drawImage(image,0,0,sourceWidth,sourceHeight,-width/2,-height/2,width,height);
    context.restore();
    drawCounts[key]=(drawCounts[key]||0)+1;
    return true;
  }
  function css(key) {
    const frame=frames[key]; if(!frame) return {};
    return {
      backgroundImage:'url("'+frame.src+'")',backgroundSize:'contain',
      backgroundPosition:'center',backgroundRepeat:'no-repeat',aspectRatio:String(frame.rect.w/frame.rect.h),
      imageRendering:frame.pixel?'pixelated':'auto'
    };
  }
  root.AirvanaPlayableAssetsV3=Object.freeze({
    version:VERSION,pack:'casual-v1',load,draw,css,
    ready:()=>Object.keys(frames).every(key=>imageReady(images[key])),
    get:key=>frames[key]||null,
    keys:()=>Object.keys(frames),
    forGame:key=>(GAME_KEYS[key]||[]).map(item=>frames[item]),
    games:()=>Object.keys(GAME_KEYS),
    snapshot:()=>({version:VERSION,pack:'casual-v1',ready:Object.keys(frames).every(key=>imageReady(images[key])),errors:{...errors},drawCounts:{...drawCounts}}),
    retry:()=>{loading=null;return load();}
  });
  if(typeof root.Image==='function') load();
})(typeof window!=='undefined'?window:globalThis);
