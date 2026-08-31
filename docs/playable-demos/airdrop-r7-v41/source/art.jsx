/* global React */
/* ============================================================
   美术资产：无聊猿风格 KOL 头像 / 真实感代币 / 写实降落伞
   ============================================================ */
(function () {

/* ---------- 无聊猿 PFP 风格头像（原创绘制） ---------- */
const APE_PALETTE = {
  cyan:    { fur: "#2E63B0", fur2: "#1C3F7A", muz: "#D8C7A8", muz2: "#B89E76", accent: "#22d3ee" },
  matcha:  { fur: "#2F8A5C", fur2: "#1C5C3C", muz: "#D6CDA6", muz2: "#B3A878", accent: "#5be49b" },
  magenta: { fur: "#9C3A86", fur2: "#6A2459", muz: "#E0C4B0", muz2: "#BC9C84", accent: "#f03dd0" },
  gold:    { fur: "#B98A2E", fur2: "#8A641E", muz: "#E6D6A8", muz2: "#C2AE76", accent: "#ffcc4d" },
};

function ApeAvatar({ size = 46, look = "cyan", talking = false }) {
  const p = APE_PALETTE[look] || APE_PALETTE.cyan;
  const uid = React.useMemo(() => "ape" + Math.random().toString(36).slice(2, 7), []);
  return (
    <div className={"suke-av" + (talking ? " talk" : "")}
         data-look={look} style={{ "--av": size + "px", "--accent": p.accent }}>
      <div className="ring"></div>
      <div className="ring r2"></div>
      <div className="core">
        <svg viewBox="0 0 100 100" width="100%" height="100%" className="ape-svg">
          <defs>
            <radialGradient id={uid + "bg"} cx="50%" cy="30%" r="85%">
              <stop offset="0%" stopColor={p.accent} stopOpacity="0.35" />
              <stop offset="55%" stopColor={p.fur2} stopOpacity="0.12" />
              <stop offset="100%" stopColor="#05101f" />
            </radialGradient>
            <linearGradient id={uid + "fur"} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={p.fur} />
              <stop offset="100%" stopColor={p.fur2} />
            </linearGradient>
            <linearGradient id={uid + "muz"} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={p.muz} />
              <stop offset="100%" stopColor={p.muz2} />
            </linearGradient>
          </defs>
          <rect width="100" height="100" fill={`url(#${uid}bg)`} />

          {/* 花呢西装肩部 */}
          <path d="M16 100 L16 90 Q50 74 84 90 L84 100 Z" fill="#6b5538" />
          <path d="M16 100 L16 90 Q50 74 84 90 L84 100 Z" fill="none" stroke="#8a7048" strokeWidth="0.6"
                strokeDasharray="2 2" opacity="0.7" />
          {/* 衬衫 V + 圆点领带 */}
          <path d="M42 84 L50 92 L58 84 L58 100 L42 100 Z" fill="#e9e6dc" />
          <path d="M47 86 L50 90 L53 86 L54 100 L46 100 Z" fill="#22324d" />
          <circle cx="50" cy="92" r="0.9" fill="#cdd8ea" />
          <circle cx="48.4" cy="96" r="0.9" fill="#cdd8ea" />
          <circle cx="51.6" cy="96" r="0.9" fill="#cdd8ea" />

          {/* 耳朵 */}
          <ellipse cx="17" cy="46" rx="10" ry="13" fill={`url(#${uid}fur)`} />
          <ellipse cx="83" cy="46" rx="10" ry="13" fill={`url(#${uid}fur)`} />
          <ellipse cx="18" cy="46" rx="4.5" ry="6.5" fill={p.muz2} opacity="0.6" />
          <ellipse cx="82" cy="46" rx="4.5" ry="6.5" fill={p.muz2} opacity="0.6" />

          {/* 头部（蓝毛） */}
          <path d="M50 12 C71 12 85 28 85 50 C85 74 70 90 50 90 C30 90 15 74 15 50 C15 28 29 12 50 12 Z"
                fill={`url(#${uid}fur)`} />

          {/* 大块米色口鼻区 */}
          <path d="M50 40 C68 40 78 54 78 70 C78 84 65 91 50 91 C35 91 22 84 22 70 C22 54 32 40 50 40 Z"
                fill={`url(#${uid}muz)`} />
          {/* 口鼻顶部柔和阴影 */}
          <path d="M50 40 C40 40 31 47 27 57 Q50 50 73 57 C69 47 60 40 50 40 Z" fill={p.fur2} opacity="0.12" />

          {/* 鼻孔 */}
          <ellipse cx="43" cy="63" rx="2.6" ry="4" fill="#3a2c1c" />
          <ellipse cx="57" cy="63" rx="2.6" ry="4" fill="#3a2c1c" />
          {/* 平直闭合的「无聊」嘴（几乎水平、略downturn） */}
          <path className="ape-mouth" d="M38 77 Q50 79 62 77" stroke="#3a2c1c" strokeWidth="2.4"
                fill="none" strokeLinecap="round" />

          {/* 慵懒半垂眼（BAYC bored 神态） */}
          <g>
            <ellipse cx="39" cy="50" rx="8.5" ry="6.6" fill="#f3ead6" />
            <ellipse cx="61" cy="50" rx="8.5" ry="6.6" fill="#f3ead6" />
            {/* 眼珠下垂，看向斜下方 */}
            <ellipse cx="39.5" cy="52.4" rx="3" ry="3.3" fill="#1c1208" />
            <ellipse cx="61.5" cy="52.4" rx="3" ry="3.3" fill="#1c1208" />
            <circle cx="40.6" cy="51.4" r="0.8" fill="#fff" opacity="0.8" />
            <circle cx="62.6" cy="51.4" r="0.8" fill="#fff" opacity="0.8" />
            {/* 厚重下垂上眼皮：盖住眼球上 2/3，外角下沉 → 慵懒 */}
            <path d="M30 46 Q39.5 50 49 46 Q49 52 39.5 51.5 Q30 52 30 46 Z" fill={p.fur} />
            <path d="M51 46 Q60.5 50 70 46 Q70 52 60.5 51.5 Q51 52 51 46 Z" fill={p.fur} />
            {/* 眼皮褶皱线（柔和、平缓） */}
            <path d="M31 47.5 Q39.5 50.5 48 47.5" stroke={p.fur2} strokeWidth="0.9" fill="none" opacity="0.5" strokeLinecap="round" />
            <path d="M52 47.5 Q60.5 50.5 69 47.5" stroke={p.fur2} strokeWidth="0.9" fill="none" opacity="0.5" strokeLinecap="round" />
          </g>

          {/* 头顶毛发纹理 */}
          <path d="M34 22 q3 6 1 11 M44 17 q2 7 0 12 M56 17 q-2 7 0 12 M66 22 q-3 6 -1 11"
                stroke={p.fur2} strokeWidth="1.6" fill="none" opacity="0.45" strokeLinecap="round" />
        </svg>
        <div className="scan"></div>
      </div>
    </div>
  );
}

/* ---------- 真实感代币标识 ---------- */
function CoinLogo({ sym }) {
  switch (sym) {
    case "BTC": return <text className="cglyph" x="50" y="50">₿</text>;
    case "USDT": return <text className="cglyph" x="50" y="50">₮</text>;
    case "DOGE": return <text className="cglyph" x="50" y="50">Ð</text>;
    case "MX": return <text className="cglyph" x="50" y="50" style={{ fontSize: 38 }}>M</text>;
    case "ETH": return (
      <g fill="#fff">
        <path d="M50 18 L50 43 L66 50 Z" opacity="0.85" />
        <path d="M50 18 L34 50 L50 43 Z" opacity="0.6" />
        <path d="M50 70 L50 54 L66 53 Z" opacity="0.85" />
        <path d="M50 70 L34 53 L50 54 Z" opacity="0.6" />
      </g>
    );
    case "SOL": return (
      <g>
        <path d="M30 36 L66 36 Q72 36 67 42 L31 42 Q25 42 30 36 Z" fill="#fff" />
        <path d="M30 47 L66 47 Q72 47 67 53 L31 53 Q25 53 30 47 Z" fill="#fff" opacity="0.85" />
        <path d="M33 58 L69 58 Q74 58 69 64 L34 64 Q28 64 33 58 Z" fill="#fff" opacity="0.7" />
      </g>
    );
    default: return <text className="cglyph" x="50" y="50">{sym}</text>;
  }
}

/* 整枚金属币（含 logo），用于降落和飞行 */
function CoinFace({ tk }) {
  const uid = React.useMemo(() => "c" + Math.random().toString(36).slice(2, 7), []);
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" className="coin-svg">
      <defs>
        <radialGradient id={uid + "m"} cx="34%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="22%" stopColor={tk.cc} />
          <stop offset="100%" stopColor={tk.cc2} />
        </radialGradient>
        <linearGradient id={uid + "r"} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.7" />
          <stop offset="100%" stopColor={tk.cc2} stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="36" fill={`url(#${uid}r)`} />
      <circle cx="50" cy="50" r="33" fill={`url(#${uid}m)`} stroke="#ffffff66" strokeWidth="1.5" />
      <ellipse cx="40" cy="38" rx="14" ry="8" fill="#fff" opacity="0.18" />
      <CoinLogo sym={tk.sym} />
      <image href="assets/generated_v1/coin-rim-v1.png" x="0" y="0" width="100" height="100"
             preserveAspectRatio="xMidYMid meet" />
    </svg>
  );
}

/* ---------- 写实降落伞 ---------- */
function Parachute({ cc = "#5be49b", cc2 = "#1f8a5b" }) {
  return (
    <img src="assets/generated_v1/parachute-v1.png" alt="" className="chute-img"
         style={{ "--chute-accent": cc, "--chute-accent-2": cc2 }} />
  );
}

Object.assign(window, { ApeAvatar, CoinFace, Parachute });
})();
