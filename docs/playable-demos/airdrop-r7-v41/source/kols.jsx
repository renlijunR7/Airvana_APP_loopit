/* global React */
/* ============================================================
   多 KOL 形象系统：原有角色 + 6 个本地 Demo KOL 分身
   每个 KOL = 独立形象 + 名字 + 人设 + 口头禅 + 主色
   ============================================================ */
(function () {

/* 共用外框（光环 + 核心 + 扫描线） */
function Frame({ size, accent, talking, look, children }) {
  return (
    <div className={"suke-av" + (talking ? " talk" : "")}
         data-look={look} style={{ "--av": size + "px", "--accent": accent }}>
      <div className="ring"></div>
      <div className="ring r2"></div>
      <div className="core">
        <svg viewBox="0 0 100 100" width="100%" height="100%" className="ape-svg">{children}</svg>
        <div className="scan"></div>
      </div>
    </div>
  );
}

/* ---------- ① 苏克 Suke · 无聊猿（Web3 极客） ---------- */
function ApeFace({ uid, c }) {
  return (
    <g>
      <defs>
        <radialGradient id={uid + "bg"} cx="50%" cy="30%" r="85%">
          <stop offset="0%" stopColor={c.accent} stopOpacity="0.35" />
          <stop offset="55%" stopColor={c.fur2} stopOpacity="0.12" />
          <stop offset="100%" stopColor="#05101f" />
        </radialGradient>
        <linearGradient id={uid + "fur"} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.fur} /><stop offset="100%" stopColor={c.fur2} />
        </linearGradient>
        <linearGradient id={uid + "muz"} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.muz} /><stop offset="100%" stopColor={c.muz2} />
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${uid}bg)`} />
      {/* 花呢西装 + 圆点领带 */}
      <path d="M16 100 L16 90 Q50 74 84 90 L84 100 Z" fill="#6b5538" />
      <path d="M42 84 L50 92 L58 84 L58 100 L42 100 Z" fill="#e9e6dc" />
      <path d="M47 86 L50 90 L53 86 L54 100 L46 100 Z" fill="#22324d" />
      <circle cx="50" cy="92" r="0.9" fill="#cdd8ea" /><circle cx="48.4" cy="96" r="0.9" fill="#cdd8ea" /><circle cx="51.6" cy="96" r="0.9" fill="#cdd8ea" />
      {/* 耳 */}
      <ellipse cx="17" cy="46" rx="10" ry="13" fill={`url(#${uid}fur)`} />
      <ellipse cx="83" cy="46" rx="10" ry="13" fill={`url(#${uid}fur)`} />
      <ellipse cx="18" cy="46" rx="4.5" ry="6.5" fill={c.muz2} opacity="0.6" />
      <ellipse cx="82" cy="46" rx="4.5" ry="6.5" fill={c.muz2} opacity="0.6" />
      {/* 头 */}
      <path d="M50 12 C71 12 85 28 85 50 C85 74 70 90 50 90 C30 90 15 74 15 50 C15 28 29 12 50 12 Z" fill={`url(#${uid}fur)`} />
      {/* 口鼻 */}
      <path d="M50 40 C68 40 78 54 78 70 C78 84 65 91 50 91 C35 91 22 84 22 70 C22 54 32 40 50 40 Z" fill={`url(#${uid}muz)`} />
      <ellipse cx="43" cy="63" rx="2.6" ry="4" fill="#3a2c1c" /><ellipse cx="57" cy="63" rx="2.6" ry="4" fill="#3a2c1c" />
      <path className="ape-mouth" d="M38 77 Q50 79 62 77" stroke="#3a2c1c" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      {/* 慵懒半垂眼 */}
      <ellipse cx="39" cy="50" rx="8.5" ry="6.6" fill="#f3ead6" /><ellipse cx="61" cy="50" rx="8.5" ry="6.6" fill="#f3ead6" />
      <ellipse cx="39.5" cy="52.4" rx="3" ry="3.3" fill="#1c1208" /><ellipse cx="61.5" cy="52.4" rx="3" ry="3.3" fill="#1c1208" />
      <path d="M30 46 Q39.5 50 49 46 Q49 52 39.5 51.5 Q30 52 30 46 Z" fill={c.fur} />
      <path d="M51 46 Q60.5 50 70 46 Q70 52 60.5 51.5 Q51 52 51 46 Z" fill={c.fur} />
    </g>
  );
}

/* ---------- ② 狗神 Doge · 柴犬（Meme 网红） ---------- */
function DogeFace({ uid }) {
  return (
    <g>
      <defs>
        <radialGradient id={uid + "bg"} cx="50%" cy="28%" r="85%">
          <stop offset="0%" stopColor="#ffcc4d" stopOpacity="0.4" /><stop offset="60%" stopColor="#a9760a" stopOpacity="0.12" /><stop offset="100%" stopColor="#120a02" />
        </radialGradient>
        <linearGradient id={uid + "f"} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f1b34a" /><stop offset="100%" stopColor="#c8861f" /></linearGradient>
        <linearGradient id={uid + "cream"} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fbe6c0" /><stop offset="100%" stopColor="#e8c98a" /></linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${uid}bg)`} />
      {/* 尖耳 */}
      <path d="M20 44 L24 14 L44 34 Z" fill={`url(#${uid}f)`} />
      <path d="M80 44 L76 14 L56 34 Z" fill={`url(#${uid}f)`} />
      <path d="M25 36 L26.5 22 L36 32 Z" fill="#8a5b14" opacity="0.5" />
      <path d="M75 36 L73.5 22 L64 32 Z" fill="#8a5b14" opacity="0.5" />
      {/* 头 */}
      <path d="M50 22 C70 22 83 36 83 56 C83 76 68 90 50 90 C32 90 17 76 17 56 C17 36 30 22 50 22 Z" fill={`url(#${uid}f)`} />
      {/* 脸颊浅色 */}
      <path d="M50 50 C66 50 76 60 76 72 C76 84 64 90 50 90 C36 90 24 84 24 72 C24 60 34 50 50 50 Z" fill={`url(#${uid}cream)`} />
      <path d="M30 56 Q40 50 48 55 Q40 60 30 60 Z" fill="#fbe6c0" opacity="0.7" />
      <path d="M70 56 Q60 50 52 55 Q60 60 70 60 Z" fill="#fbe6c0" opacity="0.7" />
      {/* doge 经典斜眼 */}
      <ellipse cx="40" cy="50" rx="4.3" ry="4.8" fill="#2a1c0a" />
      <ellipse cx="60" cy="50" rx="4.3" ry="4.8" fill="#2a1c0a" />
      <circle cx="41.4" cy="48.6" r="1" fill="#fff" opacity="0.85" /><circle cx="61.4" cy="48.6" r="1" fill="#fff" opacity="0.85" />
      {/* 眉（疑惑感） */}
      <path d="M34 42 Q40 40 46 42" stroke="#b07d1c" strokeWidth="1.4" fill="none" opacity="0.6" strokeLinecap="round" />
      <path d="M54 42 Q60 40 66 42" stroke="#b07d1c" strokeWidth="1.4" fill="none" opacity="0.6" strokeLinecap="round" />
      {/* 鼻 + 嘴 */}
      <ellipse cx="50" cy="64" rx="4.6" ry="3.2" fill="#2a1c0a" />
      <path className="ape-mouth" d="M50 67 L50 73 M50 73 Q43 78 37 74 M50 73 Q57 78 63 74" stroke="#2a1c0a" strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>
  );
}

/* ---------- ③ 赛博喵 Neko · 机械猫（链上数据流） ---------- */
function NekoFace({ uid }) {
  return (
    <g>
      <defs>
        <radialGradient id={uid + "bg"} cx="50%" cy="30%" r="85%">
          <stop offset="0%" stopColor="#f03dd0" stopOpacity="0.4" /><stop offset="60%" stopColor="#7a1264" stopOpacity="0.14" /><stop offset="100%" stopColor="#0a020c" />
        </radialGradient>
        <linearGradient id={uid + "m"} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3a4763" /><stop offset="100%" stopColor="#1b2438" /></linearGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${uid}bg)`} />
      {/* 机械尖耳 + 霓虹内衬 */}
      <path d="M22 42 L20 12 L46 32 Z" fill={`url(#${uid}m)`} stroke="#f03dd0" strokeWidth="1" />
      <path d="M78 42 L80 12 L54 32 Z" fill={`url(#${uid}m)`} stroke="#f03dd0" strokeWidth="1" />
      <path d="M27 34 L26 20 L38 31 Z" fill="#f03dd0" opacity="0.5" />
      <path d="M73 34 L74 20 L62 31 Z" fill="#f03dd0" opacity="0.5" />
      {/* 头（金属） */}
      <path d="M50 20 C70 20 83 34 83 54 C83 76 68 90 50 90 C32 90 17 76 17 54 C17 34 30 20 50 20 Z" fill={`url(#${uid}m)`} />
      {/* 面板分割线 */}
      <path d="M50 22 L50 88 M22 54 L78 54" stroke="#0a0f1a" strokeWidth="0.6" opacity="0.4" />
      {/* 霓虹护目镜 */}
      <rect x="24" y="46" width="52" height="15" rx="7.5" fill="#0a0f1a" stroke="#f03dd0" strokeWidth="1.2" />
      <rect x="24" y="46" width="52" height="15" rx="7.5" fill="#f03dd0" opacity="0.12" />
      {/* 眼（霓虹弧线） */}
      <path className="ape-mouth" d="M31 54 Q37 49 43 54" stroke="#22f0ff" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M57 54 Q63 49 69 54" stroke="#22f0ff" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      {/* 数据小点 */}
      <circle cx="50" cy="53.5" r="1.4" fill="#f03dd0" />
      {/* 鼻 + 猫嘴 */}
      <path d="M48 68 L52 68 L50 71 Z" fill="#f03dd0" />
      <path d="M50 71 Q45 75 41 72 M50 71 Q55 75 59 72" stroke="#9fb0cc" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {/* 胡须 */}
      <path d="M30 66 L18 63 M30 70 L19 71 M70 66 L82 63 M70 70 L81 71" stroke="#9fb0cc" strokeWidth="1" opacity="0.6" strokeLinecap="round" />
    </g>
  );
}

/* ---------- ④ 泽塔 Zeta · 外星人（空投预言家） ---------- */
function AlienFace({ uid }) {
  return (
    <g>
      <defs>
        <radialGradient id={uid + "bg"} cx="50%" cy="30%" r="85%">
          <stop offset="0%" stopColor="#5be49b" stopOpacity="0.4" /><stop offset="60%" stopColor="#10623f" stopOpacity="0.14" /><stop offset="100%" stopColor="#02100a" />
        </radialGradient>
        <radialGradient id={uid + "skin"} cx="50%" cy="35%" r="75%"><stop offset="0%" stopColor="#aef7c9" /><stop offset="100%" stopColor="#3fae72" /></radialGradient>
      </defs>
      <rect width="100" height="100" fill={`url(#${uid}bg)`} />
      {/* 触角 */}
      <path d="M40 22 Q36 8 30 6" stroke="#3fae72" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M60 22 Q64 8 70 6" stroke="#3fae72" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle className="ape-mouth" cx="30" cy="6" r="3.2" fill="#7CFCA8" /><circle cx="70" cy="6" r="3.2" fill="#7CFCA8" />
      {/* 倒水滴头型 */}
      <path d="M50 16 C72 16 84 34 84 52 C84 74 68 92 50 92 C32 92 16 74 16 52 C16 34 28 16 50 16 Z" fill={`url(#${uid}skin)`} />
      {/* 额头高光 */}
      <ellipse cx="42" cy="34" rx="12" ry="8" fill="#dffbe9" opacity="0.4" />
      {/* 巨大杏仁黑眼 */}
      <path d="M28 50 Q38 44 46 52 Q40 64 30 60 Q25 55 28 50 Z" fill="#0a1410" />
      <path d="M72 50 Q62 44 54 52 Q60 64 70 60 Q75 55 72 50 Z" fill="#0a1410" />
      <ellipse cx="35" cy="52" rx="2" ry="3" fill="#7CFCA8" opacity="0.7" />
      <ellipse cx="65" cy="52" rx="2" ry="3" fill="#7CFCA8" opacity="0.7" />
      <circle cx="33" cy="50" r="1" fill="#fff" /><circle cx="63" cy="50" r="1" fill="#fff" />
      {/* 小嘴 */}
      <path d="M44 76 Q50 79 56 76" stroke="#1d6b46" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      {/* 鼻孔 */}
      <circle cx="47" cy="68" r="0.9" fill="#1d6b46" /><circle cx="53" cy="68" r="0.9" fill="#1d6b46" />
    </g>
  );
}

/* ---------- KOL 注册表 ---------- */
const KOLS = {
  wanzi: {
    id: "wanzi", name: "Wanzi", handle: "@wanzi_live", title: "Campaign Guide", tag: "GUIDE",
    catch: "Catch the drop! 🎀", accent: "#22d3ee", archetype: "Campaign Guide",
    expertise: ["HTX task flow", "new-player onboarding", "campaign status"],
    recommendedModes: ["live", "quiz", "route", "campaign"], visualMode: "2D/2.5D state frames", kbStatus: "Seed KB",
    personaLine: "I keep every step short and help you find the next verified task.",
    playTip: "Follow the called token, then check Tasks for the next HTX Mock milestone.",
    safetyTip: "Demo status is not real HTX verification.",
    photo: "assets/generated_v1/wanzi-face-v2.png", figure: "assets/generated_v1/wanzi-full-v2.png"
  },
  suke: {
    id: "suke", name: "Suke", handle: "@suke_w3", title: "Risk Runner", tag: "RISK",
    catch: "Shield up. Read the risk. 🚀", accent: "#22d3ee", archetype: "Risk Runner",
    expertise: ["Web3 safety", "gas and shields", "scam defense"],
    recommendedModes: ["risk", "guard", "boss"], visualMode: "SVG character motion", kbStatus: "Seed KB",
    personaLine: "I turn Web3 safety into fast decisions under pressure.",
    playTip: "Collect shields and demo gas before taking risky drops.",
    safetyTip: "Never share a seed phrase, private key or OTP.",
    palette: { fur: "#2E63B0", fur2: "#1C3F7A", muz: "#D8C7A8", muz2: "#B89E76", accent: "#22d3ee" }
  },
  doge: {
    id: "doge", name: "Doge", handle: "@doge_god", title: "Meme Captain", tag: "MEME",
    catch: "Such combo. Much team. 🐕", accent: "#ffcc4d", archetype: "Meme Captain",
    expertise: ["combo play", "social sharing", "team referral"],
    recommendedModes: ["live", "merge", "battle", "team"], visualMode: "SVG character motion", kbStatus: "Seed KB",
    personaLine: "I make sharing, combos and team progress easy to understand.",
    playTip: "Chain clean catches and invite a real teammate through your KOL link.",
    safetyTip: "A viral link still needs a verified source. Check before you connect.",
  },
  neko: {
    id: "neko", name: "Neko", handle: "@neko_x", title: "Data Sentinel", tag: "DATA",
    catch: "Signal checked. Route clear. 📡", accent: "#f03dd0", archetype: "Data Sentinel",
    expertise: ["contract scanning", "chain routing", "gas strategy"],
    recommendedModes: ["scanner", "bridge", "gasauction", "adaptive"], visualMode: "SVG character motion", kbStatus: "Seed KB",
    personaLine: "I read signals, compare routes and explain why a choice is safer.",
    playTip: "Read the chain and contract clues before you tap.",
    safetyTip: "A contract address and chain must match the approved campaign source.",
  },
  zeta: {
    id: "zeta", name: "Zeta", handle: "@zeta_oracle", title: "Drop Oracle", tag: "ORACLE",
    catch: "The rare window is opening. 🛸", accent: "#5be49b", archetype: "Drop Oracle",
    expertise: ["rare-drop timing", "map discovery", "boost strategy"],
    recommendedModes: ["magnet", "freeze", "treasure", "team"], visualMode: "SVG character motion", kbStatus: "Seed KB",
    personaLine: "I help you time boosts and explore hidden reward paths.",
    playTip: "Save Magnet and Freeze for crowded or rare-drop moments.",
    safetyTip: "Drop rates are simulated and never promise returns.",
  },
  ari: {
    id: "ari", name: "Ari", handle: "@ari_quest", title: "Quest Starter", tag: "START",
    catch: "Start clean. Stack the next win. ⚡", accent: "#5b8cff", archetype: "Quest Starter",
    expertise: ["new-player quests", "daily missions", "progress streaks"],
    recommendedModes: ["live", "route", "quiz"], visualMode: "Illustrated KOL portrait", kbStatus: "Seed KB",
    personaLine: "I turn the first mission into one clear action.",
    playTip: "Catch the called token, then complete the next unlocked mission.",
    safetyTip: "Only use campaign links shown inside this Demo.", avatarStripIndex: 0,
  },
  noah: {
    id: "noah", name: "Noah", handle: "@noah_social", title: "Community Host", tag: "SOCIAL",
    catch: "Bring the squad. Keep the streak. 🌊", accent: "#9b6cff", archetype: "Community Host",
    expertise: ["community quests", "invite flow", "team progress"],
    recommendedModes: ["team", "battle", "live"], visualMode: "Illustrated KOL portrait", kbStatus: "Seed KB",
    personaLine: "I make team progress and invite steps easy to follow.",
    playTip: "Build a clean streak, then use the attributed Demo invite flow.",
    safetyTip: "A social invite is never permission to share account secrets.", avatarStripIndex: 1,
  },
  dev: {
    id: "dev", name: "Dev", handle: "@dev_guard", title: "Safety Coach", tag: "SAFE",
    catch: "Check first. Tap second. 🛡️", accent: "#ff8a3d", archetype: "Safety Coach",
    expertise: ["wallet safety", "contract clues", "risk defense"],
    recommendedModes: ["risk", "scanner", "guard"], visualMode: "Illustrated KOL portrait", kbStatus: "Seed KB",
    personaLine: "I explain risk signals before you make a move.",
    playTip: "Collect shields and verify each clue before catching a risky drop.",
    safetyTip: "Never share a password, OTP, seed phrase or private key.", avatarStripIndex: 2,
  },
  milo: {
    id: "milo", name: "Milo", handle: "@milo_route", title: "Growth Navigator", tag: "GROW",
    catch: "Next route locked. Let’s move. 🧭", accent: "#28c7d9", archetype: "Growth Navigator",
    expertise: ["campaign route", "task sequence", "account milestones"],
    recommendedModes: ["route", "treasure", "bridge"], visualMode: "Illustrated KOL portrait", kbStatus: "Seed KB",
    personaLine: "I show the shortest verified path to the next milestone.",
    playTip: "Follow the mission order and keep account steps inside the approved flow.",
    safetyTip: "Demo milestones are not real account approval.", avatarStripIndex: 3,
  },
  kai: {
    id: "kai", name: "Kai", handle: "@kai_live", title: "Digital Host", tag: "LIVE",
    catch: "I’m live. Call the token. 🎙️", accent: "#8b5cf6", archetype: "Digital Host",
    expertise: ["HTX Demo questions", "mission guidance", "gameplay coaching"],
    recommendedModes: ["live", "quiz", "campaign"], visualMode: "3D digital-human viseme rig", kbStatus: "Seed KB",
    personaLine: "I answer in a concise presenter style and point to the next safe Demo step.",
    playTip: "Ask a question, listen to the local answer, then continue the active mission.",
    safetyTip: "My voice and account answers are local simulations, not official HTX support.", avatarStripIndex: 4,
    digitalHumanRig: "assets/kol-avatars/kai-live2d-visemes-v1.png",
  },
  leo: {
    id: "leo", name: "Leo", handle: "@leo_market", title: "Market Guide", tag: "GUIDE",
    catch: "Read the signal. Keep it simple. 📈", accent: "#f5b942", archetype: "Market Guide",
    expertise: ["token basics", "gas choices", "campaign status"],
    recommendedModes: ["gasauction", "adaptive", "live"], visualMode: "Illustrated KOL portrait", kbStatus: "Seed KB",
    personaLine: "I translate Web3 terms into short, practical choices.",
    playTip: "Compare the cost, timing and risk clue before you tap.",
    safetyTip: "Demo explanations are educational and are not financial advice.", avatarStripIndex: 5,
  },
};

/* ---------- 本地 Demo KOL 随机头像池 ---------- */
const KOL_AVATAR_POOL = [
  "assets/kol-avatars/avatar-01.png", "assets/kol-avatars/avatar-02.png", "assets/kol-avatars/avatar-03.png",
  "assets/kol-avatars/avatar-04.png", "assets/kol-avatars/avatar-05.png", "assets/kol-avatars/avatar-06.png",
  "assets/kol-avatars/avatar-07.png", "assets/kol-avatars/avatar-08.png", "assets/kol-avatars/avatar-09.png",
  "assets/kol-avatars/avatar-10.png", "assets/kol-avatars/avatar-11.png", "assets/kol-avatars/avatar-12.png",
  "assets/kol-avatars/avatar-13.png", "assets/kol-avatars/avatar-14.png", "assets/kol-avatars/avatar-15.png",
  "assets/kol-avatars/avatar-16.png", "assets/kol-avatars/avatar-17.png", "assets/kol-avatars/avatar-18.png",
  "assets/kol-avatars/avatar-19.png", "assets/kol-avatars/avatar-20.png", "assets/kol-avatars/avatar-21.png",
  "assets/kol-avatars/avatar-22.png", "assets/kol-avatars/avatar-23.png", "assets/kol-avatars/avatar-24.png",
  "assets/kol-avatars/avatar-25.png", "assets/kol-avatars/avatar-26.png", "assets/kol-avatars/avatar-27.png",
  "assets/kol-avatars/avatar-28.png", "assets/kol-avatars/avatar-29.png", "assets/kol-avatars/avatar-30.png",
  "assets/kol-avatars/avatar-31.png", "assets/kol-avatars/avatar-32.png", "assets/kol-avatars/avatar-33.png",
  "assets/kol-avatars/avatar-34.png", "assets/kol-avatars/avatar-35.png", "assets/kol-avatars/avatar-36.png",
  "assets/kol-avatars/avatar-37.png", "assets/kol-avatars/avatar-38.png"
];
const KOL_AVATAR_EVENT = "airvana:kol-avatar-change";
const KOL_AVATAR_KEY = "airvana_demo_kol_avatar_v1_";

function randomAvatarIndex(except = -1) {
  if (KOL_AVATAR_POOL.length < 2) return 0;
  let index = Math.floor(Math.random() * KOL_AVATAR_POOL.length);
  while (index === except) index = Math.floor(Math.random() * KOL_AVATAR_POOL.length);
  return index;
}

function readAvatarIndex(kol) {
  let index = -1;
  try {
    const stored = window.sessionStorage.getItem(KOL_AVATAR_KEY + kol);
    if (stored !== null) index = Number(stored);
  } catch (_) {}
  if (!Number.isInteger(index) || index < 0 || index >= KOL_AVATAR_POOL.length) {
    index = randomAvatarIndex();
    try { window.sessionStorage.setItem(KOL_AVATAR_KEY + kol, String(index)); } catch (_) {}
  }
  return index;
}

function randomizeKolAvatar(kol = "wanzi") {
  const previous = readAvatarIndex(kol);
  const index = randomAvatarIndex(previous);
  try { window.sessionStorage.setItem(KOL_AVATAR_KEY + kol, String(index)); } catch (_) {}
  window.dispatchEvent(new CustomEvent(KOL_AVATAR_EVENT, { detail: { kol, index } }));
  return { index, total: KOL_AVATAR_POOL.length };
}

function setKolAvatarIndex(kol = "wanzi", index = 0) {
  const safeIndex = Math.max(0, Math.min(KOL_AVATAR_POOL.length - 1, Number(index) || 0));
  try { window.sessionStorage.setItem(KOL_AVATAR_KEY + kol, String(safeIndex)); } catch (_) {}
  window.dispatchEvent(new CustomEvent(KOL_AVATAR_EVENT, { detail: { kol, index: safeIndex } }));
  return { index: safeIndex, total: KOL_AVATAR_POOL.length };
}

/* 头像分发器 */
function KolAvatar({ kol = "suke", size = 46, talking = false }) {
  const uid = React.useMemo(() => "k" + Math.random().toString(36).slice(2, 7), [kol]);
  const k = KOLS[kol] || KOLS.suke;
  const [avatarIndex, setAvatarIndex] = React.useState(() => readAvatarIndex(kol));
  React.useEffect(() => {
    setAvatarIndex(readAvatarIndex(kol));
    const onAvatarChange = (event) => {
      if (event.detail?.kol === kol) setAvatarIndex(event.detail.index);
    };
    window.addEventListener(KOL_AVATAR_EVENT, onAvatarChange);
    return () => window.removeEventListener(KOL_AVATAR_EVENT, onAvatarChange);
  }, [kol]);
  if (Number.isInteger(k.avatarStripIndex)) {
    return (
      <div className={"suke-av photo kol-strip-avatar" + (talking ? " talk" : "")} data-look={kol}
           data-avatar-strip-index={k.avatarStripIndex + 1}
           style={{ "--av": size + "px", "--accent": k.accent }}>
        <div className="ring"></div><div className="ring r2"></div>
        <div className="core">
          <span className="kol-strip-photo" style={{ backgroundPosition: `${k.avatarStripIndex * 20}% 0%` }}></span>
          <div className="scan"></div>
        </div>
      </div>
    );
  }
  const randomPhoto = KOL_AVATAR_POOL[avatarIndex];
  // 当前会话为每个 KOL 分配一张一致的本地随机头像。
  if (randomPhoto || k.photo) {
    return (
      <div className={"suke-av photo" + (talking ? " talk" : "")} data-look={kol}
           data-avatar-index={avatarIndex + 1}
           style={{ "--av": size + "px", "--accent": k.accent }}>
        <div className="ring"></div><div className="ring r2"></div>
        <div className="core"><img src={randomPhoto || k.photo} alt={k.name} className="av-photo" /><div className="scan"></div></div>
      </div>
    );
  }
  let face;
  if (kol === "doge") face = <DogeFace uid={uid} />;
  else if (kol === "neko") face = <NekoFace uid={uid} />;
  else if (kol === "zeta") face = <AlienFace uid={uid} />;
  else face = <ApeFace uid={uid} c={k.palette} />;
  return <Frame size={size} accent={k.accent} talking={talking} look={kol}>{face}</Frame>;
}

window.KOLS = KOLS;
window.KolAvatar = KolAvatar;
window.KOL_AVATAR_POOL_SIZE = KOL_AVATAR_POOL.length;
window.randomizeKolAvatar = randomizeKolAvatar;
window.setKolAvatarIndex = setKolAvatarIndex;
})();
