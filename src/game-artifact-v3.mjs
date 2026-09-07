import fs from 'node:fs';

const catalog = JSON.parse(fs.readFileSync(new URL('../public/assets/games/classic-v1/manifest.json', import.meta.url), 'utf8')).assets;
const normalize = value => String(value || '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const scene = key => `/assets/games/classic-v1/scenes/${key}.svg`;
// Each intro uses objects from that game's own runtime mapping.
const gameIntroObjects = Object.freeze({"safety-workshop":["shield","key","scroll"],"stellar-farm":["seedling","seeds","watering_can"],"pixel-quest":["runner","roadblock","energy"],"red-cup-shuffle":["cup","star"],"magic-choir":["star","sapphire","amethyst"],"paws-stage":["kitten","star","sapphire"],"puppet-studio":["plush","dress","hat"],"firefly-mail":["letter","mailbox","parcel"],"whisker-escape":["cat","raider","key"],"coin-journey":["cannon","star","treasure"],"jungle-dive":["fish","predator_fish","hook"],"rift-strike":["spacecraft","enemy_ship","bullet"],"stardust-island":["seedling","seeds","watering_can"],"formation-knights":["hero","sentinel","sword"],"galaxy-toy-shop":["plush","parcel","star"],"city-rush":["car","roadblock","energy"],"sky-cannon":["cannon","raider","fire"],"neon-dash":["runner","roadblock","energy"],"pulse-forge":["star","sapphire","amethyst"],"sky-stack":["crystal","emerald","ruby"],"rune-circuit":["crystal","energy","sapphire"],"prism-match":["emerald","ruby","sapphire"],"star-cups":["cup","star"],"deep-catch":["fish","predator_fish","hook"],"ember-bastion":["turret","raider","fire"],"nova-drift":["car","roadblock","energy"],"void-squadron":["spacecraft","enemy_ship","bullet"],"orchard-merge":["green_apple","pear","red_apple"],"star-mower":["mower","spore","microbe_enemy"],"moonlight-tea-shop":["tea","coffee","cup"],"microbe-arena":["microbe","microbe_enemy","energy"],"star-deck":["hero","sentinel","guardian"],"crystal-bastion":["turret","raider","crystal"],"adventurer-journal":["hero","tent","tree"],"idiom-detective":["star","fire","tree"],"hex-frontier":["hero","guardian","raider"],"studio-wardrobe":["model","dress","hat"],"garden-renewal":["flower","sapphire","orange"]});
const text = value => typeof value === 'string' && value.trim();
const option = (label, art, correct, explanation) => ({ label, art, correct, explanation });

const safetyRounds = [
  { title: '一封限时空投邀请', body: '陌生私信让你打开 airvana-bonus.example 领取奖励。你会怎么做？', art: 'scroll', choices: [option('核对官方入口', 'shield', true, '先独立核对来源，不从陌生私信进入。'), option('立即连接钱包', 'key', false, '限时和奖励不能证明网站可信。')] },
  { title: '过大的授权范围', body: '一个领取徽章的页面请求无限额度代币授权。', art: 'crystal', choices: [option('签名领取徽章', 'treasure', false, '领取徽章不应需要无限代币额度。'), option('拒绝过度授权', 'shield', true, '权限应当与当前操作匹配。')] },
  { title: '身份验证请求', body: '“客服”声称需要你的恢复短语才能验证账户。', art: 'raider', choices: [option('拒绝并关闭对话', 'guardian', true, '恢复短语应当保密，客服无需知道它。'), option('继续客服验证', 'scroll', false, '任何索取恢复短语的验证都不可接受。')] },
  { title: '看不懂的签名', body: '签名窗口没有说明用途，只有一串无法理解的数据。', art: 'scroll', choices: [option('先签名再查看', 'sword', false, '签名前必须理解操作的作用。'), option('取消并核实用途', 'key', true, '无法确认用途时，停止签名。')] },
  { title: '历史连接检查', body: '你发现钱包还连接着一个已经不再使用的网站。', art: 'boots', choices: [option('检查连接与授权', 'shield', true, '断开连接和撤销代币授权是不同操作，应分别检查。'), option('忽略所有旧授权', 'tent', false, '不使用的网站也值得检查已有权限。')] },
  { title: '最后一次核对', body: '转账确认页的收款地址与你核对的地址不一致。', art: 'treasure', choices: [option('先确认再联系对方', 'energy', false, '地址错误可能导致无法追回的转账。'), option('取消并重新核对', 'guardian', true, '核对完整收款地址后再决定是否继续。')] },
];

function authoredRounds(payload) {
  const sources = payload.gameplay?.rounds || payload.rounds || payload.sections || [];
  if (!Array.isArray(sources)) return [];
  return sources.flatMap((item, roundIndex) => {
    const raw = item.choices || item.options;
    if (!Array.isArray(raw) || raw.length < 2) return [];
    const correctIndex = Number.isInteger(item.correctIndex) ? item.correctIndex : Number.isInteger(item.correct) ? item.correct : -1;
    const correctId = item.correctChoiceId ?? item.answer;
    const choices = raw.slice(0, 4).map((choice, index) => ({
      label: typeof choice === 'string' ? choice : choice.label || choice.text || choice.title,
      art: ['shield', 'sword', 'key', 'potion'][index],
      correct: typeof choice === 'object' && (choice.correct === true || choice.isCorrect === true) || index === correctIndex || (correctId != null && (typeof choice === 'string' ? choice === correctId : choice.id === correctId)),
      explanation: typeof choice === 'object' ? choice.feedback || choice.explanation || item.explanation || '' : item.explanation || '',
    }));
    if (!choices.every(choice => text(choice.label)) || !choices.some(choice => choice.correct) || choices.every(choice => choice.correct)) return [];
    return [{ title: item.title || item.heading || `挑战 ${roundIndex + 1}`, body: item.question || item.body || '', art: 'scroll', choices }];
  });
}

export function resolveGameConfig(content, payload = {}) {
  const title = payload.title || content.title;
  const explicit = payload.gameKey || payload.gameplay?.gameKey;
  const nativeId = String(content.id).replace(/^content_mobilearcade_plb_/, '').replaceAll('_', '-');
  const normalizedTitle = normalize(title);
  const registered = catalog.find(item => item.game_key === explicit || item.game_key === nativeId || (normalize(item.title).length > 3 && (normalizedTitle.includes(normalize(item.title)) || normalize(item.title).includes(normalizedTitle))))
    || catalog.find(item => normalizedTitle.includes(normalize(item.game_key)));
  if (registered) return { mode: 'native', gameKey: registered.game_key, runtime: registered.runtime, title, background: scene(registered.game_key), art: gameIntroObjects[registered.game_key], instructions: '完成画面内目标，连续闯过三关。点按或拖动游戏中的物体进行操作。' };
  const supplied = authoredRounds(payload);
  const theme = [title, payload.hook, ...(payload.sections || []).map(item => item.body)].join(' ');
  if (supplied.length || /钱包|钓鱼|签名|私钥|助记词|phish|wallet|security/i.test(theme)) return {
    mode: 'decision', title, gameKey: 'safety-workshop', background: scene('safety-workshop'),
    art: ['guardian', 'crystal', 'raider'], rounds: supplied.length ? supplied : safetyRounds,
    authoredChoices: supplied.length > 0, instructions: '守住三层护盾，识别每轮风险。选错会消耗护盾，全部判断正确后通关。',
  };
  const garden = /种菜|农场|种植|花园|farm|garden/i.test(theme);
  if (garden) return { mode: 'native', title, gameKey: 'stellar-farm', runtime: 'complete-games-v3', background: scene('stellar-farm'), art: ['green_apple', 'flower', 'tree'], instructions: '选择地块播种、浇水并收获，管理资源完成三关种植目标。' };
  return { mode: 'memory', title, gameKey: garden ? 'stellar-farm' : 'rune-circuit', background: scene(garden ? 'stellar-farm' : 'rune-circuit'),
    art: garden ? ['green_apple', 'flower', 'tree', 'pear', 'orange', 'golden_fruit'] : ['emerald', 'ruby', 'sapphire', 'amethyst', 'crystal', 'key'],
    instructions: '翻开两张相同物品完成收集。三关共收集 12 对，步数耗尽则挑战结束。',
  };
}

export function gameArtifactHtml({ content, payload, version, config }) {
  const escape = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const data = JSON.stringify({ contentId: content.id, title: payload.title || content.title, type: 'game', payload, version, game: config }).replaceAll('<', '\\u003c').replaceAll('>', '\\u003e').replaceAll('&', '\\u0026');
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${escape(config.title)} · Airvana</title><link rel="stylesheet" href="/server-game-runtime-v3.css?v=3.2.0"></head><body><main id="game-root" aria-label="${escape(config.title)}"><div class="game-loading">正在加载游戏素材…</div></main><script src="/game-art-system-v1.js?v=6.0.0"></script><script src="/playable-assets-v3.js?v=5.0.0"></script>${config.mode === 'native' ? '<script src="/sensor-interactions-v1.js?v=1.1.0"></script><script src="/complete-games-v3.js?v=4.2.0"></script><script src="/deep-games-v2.js?v=3.2.0"></script>' : ''}<script src="/server-game-runtime-v3.js?v=3.2.0"></script><script>
  const DATA=${data};const VARIANT=globalThis.__AIRVANA_VARIANT__||null;let requiredChecks=2;
  function applyVariant(){if(!VARIANT||!VARIANT.field)return;const v=String(VARIANT.value==null?'':VARIANT.value);const f=VARIANT.field;
    document.body.dataset.airvanaVariant=VARIANT.variant||'control';document.body.dataset.airvanaExperiment=VARIANT.experimentId||'';
    if(f==='title'&&v){DATA.title=v;document.title=v+' · Airvana';const h=document.querySelector('.hero h1');if(h)h.textContent=v}
    else if(f==='hook'&&v){DATA.payload=Object.assign({},DATA.payload,{hook:v,summary:v});const p=document.querySelector('.hero p');if(p)p.textContent=v}
    else if(f==='coverStyle'&&v){document.body.dataset.coverStyle=v;if(globalThis.CSS&&globalThis.CSS.supports&&globalThis.CSS.supports('color',v))document.documentElement.style.setProperty('--accent',v)}
    else if(f==='difficulty'){const map={easy:1,simple:1,'简单':1,normal:2,standard:2,'标准':2,hard:3,'困难':3};const n=map[v.toLowerCase()]||map[v]||Number(v);if(Number.isFinite(n)&&n>=1&&n<=5)requiredChecks=Math.trunc(n)}
    else if(f==='interactionOrder'){const src=DATA.payload.sections||[];let next=null;if(/^reverse$/i.test(v))next=src.slice().reverse();else{const idx=v.split(/[,，\s]+/).map(x=>Number.parseInt(x,10)).filter(n=>Number.isInteger(n)&&n>=1&&n<=src.length);if(idx.length)next=idx.map(n=>src[n-1])}if(next&&next.length)DATA.payload=Object.assign({},DATA.payload,{sections:next})}}
  applyVariant();
  AirvanaServerGameV3.mount(document.querySelector('#game-root'),DATA,{difficulty:requiredChecks,variant:VARIANT});
  </script><!-- Runtime proof: playable_start -> step_complete -> playable_complete. Completion actions: 重新体验 / 返回内容广场 / 保存到本设备 / 分享 / 复制链接 --></body></html>`;
}
