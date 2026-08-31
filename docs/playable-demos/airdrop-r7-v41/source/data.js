/* ============================================================
   数据层：代币、苏克 KOL 台词、任务、AI 人设
   全局挂到 window.GAME
   ============================================================ */
window.GAME = (function () {

  // ---- 代币定义（含稀有度权重）----
  const TOKENS = [
    { sym: "MX",   name: "MX Token", v: 8,   cc: "#2bd4a8", cc2: "#0c8f73", tier: "common", w: 30 },
    { sym: "USDT", name: "Tether",   v: 5,   cc: "#2ea98a", cc2: "#0c6e58", tier: "common", w: 26 },
    { sym: "DOGE", name: "Dogecoin", v: 6,   cc: "#d9b943", cc2: "#9c7e1e", tier: "common", w: 22 },
    { sym: "ETH",  name: "Ethereum", v: 20,  cc: "#7b8ff0", cc2: "#3c4fb0", tier: "rare",   w: 12 },
    { sym: "SOL",  name: "Solana",  v: 25,  cc: "#b06bff", cc2: "#5a2da0", tier: "rare",   w: 9  },
    { sym: "BTC",  name: "Bitcoin",  v: 60,  cc: "#f7a83a", cc2: "#c4760e", tier: "epic",   w: 5  },
    { sym: "🌙",   name: "MOON Token", v: 188, cc: "#ffe27a", cc2: "#ff8a3d", tier: "legend", w: 1, isMoon: true },
  ];

  // 按粉丝等级放大稀有币权重 + 掉落数
  function weightedPick(fanLv) {
    const boost = 1 + (fanLv - 1) * 0.6; // 等级越高，稀有更易出
    const pool = TOKENS.map(t => ({
      t,
      w: (t.tier === "common") ? t.w : t.w * boost,
    }));
    const total = pool.reduce((s, x) => s + x.w, 0);
    let r = Math.random() * total;
    for (const x of pool) { if ((r -= x.w) <= 0) return x.t; }
    return TOKENS[0];
  }

  // ---- 苏克 人设 ----
  const SUKE = {
    name: "Suke",
    handle: "@suke_w3",
    title: "Web3 host",
    catch: "fly to the moon 🚀",
    // 系统提示词（喂给真实 AI）
    persona:
      "You are Suke, a high-energy Web3 virtual host. Your catchphrase is 'fly to the moon 🚀'. " +
      "You host an HTX-themed airdrop game where players catch tokens and earn demo points. " +
      "Answer questions about the game, tasks and demo claim flow in clear English. Keep replies to 1-2 short sentences. " +
      "Never give financial advice, promise returns or imply that demo points are real assets.",
  };

  // ---- 公共业务背景（所有 KOL 共享）----
  const GAME_CONTEXT =
    "You host an HTX-themed token-catching game. All balances, tasks, referrals and claims are local demo data. " +
    "Answer in simple English using 1-2 short sentences. Help with rules, tasks and demo status. " +
    "Do not give financial advice, promise returns or present demo points as real assets.";

  // ---- 每个 KOL 的独立人设提示词 ----
  const KOL_PERSONA = {
    wanzi:
      "You are Wanzi, a warm and playful virtual host. Use friendly, simple English and light emoji. " + GAME_CONTEXT,
    suke:
      "You are Suke, an energetic Web3 host. Use concise crypto slang and end with 🚀. " + GAME_CONTEXT,
    doge:
      "You are Doge, a playful Shiba meme host. Use 'such', 'very', 'wow' and end with 🐕🌙. " + GAME_CONTEXT,
    neko:
      "You are Neko, a calm data-driven cyber cat. Use brief signal and probability language. End with 📡🐾. " + GAME_CONTEXT,
    zeta:
      "You are Zeta, a mysterious cosmic airdrop oracle. Use short space metaphors. End with 🛸✨. " + GAME_CONTEXT,
  };

  // ---- 全程喊话台词库（按场景）----
  const HAILS = {
    idle: [
      "Token rain is live. <span class='moon'>Catch them all!</span> 🚀",
      "See the glow? Tap the rare token. 🌙",
      "Quick taps. Clean catches. ⚡",
      "Stay sharp. Do not miss one!",
    ],
    rare: [
      "<span class='moon'>Rare drop!</span> Tap it now. 🤑",
      "Epic token incoming. Go! 🔥",
    ],
    moon: [
      "<span class='moon'>🌙 MOON token!</span> Catch it!",
      "Legendary drop · 188 demo pts. 🚀🚀",
    ],
    levelup: [
      "Fan level up! ⬆️ Better demo drops unlocked.",
    ],
    nearGoal: [
      "Almost 1,000 pts. Keep going! 💪",
    ],
    taskNudge: [
      "Try the <span class='moon'>demo account</span> task for bonus points.",
      "Invite a friend to test the demo team bonus. 😎",
    ],
  };

  // ---- 营销任务 ----
  const TASKS = [
    {
      id: "register",
      icon: "🟢",
      title: "Demo account",
      reward: "+150 pts · Fan Lv.+1",
      coins: 150,
      lvl: 1,
      sheet: {
        title: "Demo account setup",
        pill: "🔓 Unlock demo claim · +150 pts",
        desc: "Preview the account flow. No real account is connected and no data is sent.",
        steps: [
          { n: 1, t: "Start the demo flow", s: "Code: AIRVANA888" },
          { n: 2, t: "Preview account setup", s: "No personal data required" },
          { n: 3, t: "Return to the game", s: "+150 demo points" },
        ],
        cta: "Complete demo setup",
      },
    },
    {
      id: "invite",
      icon: "👥",
      title: "Invite a friend",
      reward: "+80 pts · Demo boost 20%",
      coins: 80,
      lvl: 1,
      sheet: {
        title: "Invite a friend",
        pill: "+80 pts · 20% demo boost",
        desc: "Copy your demo invite link. No real commission is paid.",
        invite: "AIRVANA-7F3K",
        cta: "Copy demo link",
      },
    },
  ];

  // ---- AI 快捷问题 ----
  const QUICK = [
    "What is HTX?",
    "How does demo claim work?",
    "How do rare drops work?",
    "How does the invite demo work?",
  ];

  // ---- 离线兜底回答（无 AI 时）----
  const FALLBACK = {
    "htx": "HTX is a digital-asset trading platform. This local demo does not connect to HTX or any real account.",
    "claim": "Reach <span class='moon'>1,000 demo points</span> to preview the claim flow. No real transfer occurs.",
    "rare": "Level up and watch for glowing tokens. Drop rates here are only a game simulation. 🌙",
    "invite": "The invite task adds demo points and a simulated boost. It does not pay commission.",
    "default": "Catch tokens, clear tasks and reach 1,000 demo points. Ask me about rules or your demo status. 🚀",
  };
  function offlineReply(q) {
    for (const k of Object.keys(FALLBACK)) {
      if (k !== "default" && q.includes(k)) return FALLBACK[k];
    }
    const text = q.toLowerCase();
    if (/htx|exchange|account|register/.test(text)) return FALLBACK.htx;
    if (/claim|withdraw|cash/.test(text)) return FALLBACK.claim;
    if (/rare|drop|moon/.test(text)) return FALLBACK.rare;
    if (/invite|friend|referral/.test(text)) return FALLBACK.invite;
    return FALLBACK.default;
  }

  // ---- 实时社交证明（滚动喊话）----
  const NAMES = ["0x7f…3aE","CryptoLin","MoonKing","DegenKK","MiaHTX","SatoshiZ","FOMOMax","OnchainJay",
    "0x9c…b21","WenMoon77","CryptoFan","ApeMax","DiamondDan","LuckyOne","0x3d…f08","TONight"];
  const PROOF_TPL = [
    n => `${n} completed a <b>1,000 pt demo claim</b> 💸`,
    n => `${n} caught a <b>🌙 MOON token</b>! +188`,
    n => `${n} reached <b>Fan Lv.6</b> ⬆️`,
    n => `${n} earned a <b>320 pt demo boost</b> 🤑`,
    n => `${n} unlocked bonus drops 🟢`,
    n => `${n} hit a <b>x4 combo</b> 🔥`,
    n => `${n} invited 5 demo players 👥`,
  ];
  function proofFeed() {
    return PROOF_TPL.map(fn => fn(rand(NAMES)));
  }

  // ---- 落地欢迎态文案 ----
  const WELCOME = {
    badge: "Suke invited you",
    title: "HTX Airdrop Quest 🪂",
    lines: [
      "Catch falling tokens and earn demo points.",
      "Reach <span class='moon'>1,000 pts</span> to preview a claim.",
    ],
    cta: "Enter the live room",
    foot: "DEMO only · No real assets or transfers",
  };

  const rand = a => a[Math.floor(Math.random() * a.length)];

  // ---- 场景专属喊话（切换背景时触发）----
  const SCENE_HAILS = {
    space:   "🪐 Deep-space drops. Watch for rare tokens.",
    tech:    "🔌 Command hub online. Catch the data stream.",
    city:    "🌃 Cyber City is live. Tap fast.",
    trading: "📈 Battle floor online. Build your score.",
    vault:   "🏦 Reward vault open. Fill your demo wallet.",
    ocean:   "🌊 Deep-sea hunt. Rare tokens hide below.",
    aurora:  "🌌 Aurora drop night. Look for MOON.",
    matrix:  "🟩 Safety grid online. Block risk items.",
  };

  return { TOKENS, weightedPick, SUKE, KOL_PERSONA, HAILS, SCENE_HAILS, TASKS, QUICK, offlineReply, rand, proofFeed, WELCOME };
})();
