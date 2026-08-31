/* global React, SukeAvatar, GAME */
/* ============================================================
   营销分发三件套：落地欢迎态 / 实时社交证明 / 战绩分享卡
   ============================================================ */
(function () {
const { useState, useEffect, useRef } = React;
const G = window.GAME;

/* ---------- ① 从社媒进来的落地欢迎态 ---------- */
function Welcome({ look, leaving, onEnter }) {
  const w = G.WELCOME;
  const k = (window.KOLS && window.KOLS[look]) || { name: "Suke", handle: "@suke_w3" };
  const shortName = k.name.split(" ")[0];
  const welcomeLine = "Catch tokens · Goal <span class='moon'>1,000 pts</span>";
  return (
    <div className={"welcome" + (leaving ? " leaving" : "")}>
      <div className="wl-aura"></div>
      <div className="wl-rain">
        {Array.from({ length: 7 }).map((_, i) => (
          <span key={i} style={{ left: (8 + i * 13) + "%", animationDelay: (i * 0.5) + "s", animationDuration: (3.4 + (i % 3)) + "s" }}>🪂</span>
        ))}
      </div>
      <div className="wl-card">
        <div className="po-grid"></div>
        <div className="wl-generated-art" aria-hidden="true">
          <img className="wl-crystals wl-crystals-top" src="assets/generated_v1/settlement-crystals-v1.png" alt="" />
          <img className="wl-crystals wl-crystals-bottom" src="assets/generated_v1/settlement-crystals-v1.png" alt="" />
        </div>
        <div className="wl-badge"><i /> {shortName.toUpperCase()} LIVE</div>
        <div className="wl-ava">
          {window.KolAvatar ? <window.KolAvatar kol={look} size={96} talking /> : <SukeAvatar size={96} look={look} />}
        </div>
        <h1 className="wl-title" dangerouslySetInnerHTML={{ __html: w.title }} />
        <p className="wl-summary" dangerouslySetInnerHTML={{ __html: welcomeLine }} />
        <button className="wl-cta" onClick={onEnter}>Play now →</button>
        <div className="wl-foot">DEMO ONLY</div>
      </div>
    </div>
  );
}

/* ---------- ② 实时社交证明滚动条 ---------- */
function ProofTicker() {
  const [feed, setFeed] = useState(() => G.proofFeed());
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => {
      setIdx(i => {
        const next = i + 1;
        if (next % feed.length === 0) setFeed(G.proofFeed());
        return next;
      });
    }, 2600);
    return () => clearInterval(iv);
  }, [feed.length]);
  const cur = feed[idx % feed.length];
  return (
    <div className="proof-ticker">
      <span className="pt-dot"></span>
      <div className="pt-track">
        <div key={idx} className="pt-item" dangerouslySetInnerHTML={{ __html: cur }} />
      </div>
      <span className="pt-live">LIVE</span>
    </div>
  );
}

/* ---------- ③ 战绩分享卡 ---------- */
const KIND = {
  withdraw: { tag: "DEMO CLAIM", emoji: "💸", headline: n => `${n} demo points claimed`, sub: "No real transfer" },
  moon:     { tag: "RARE DROP", emoji: "🌙", headline: () => `MOON token caught!`, sub: "+188 demo points" },
  levelup:  { tag: "LEVEL UP", emoji: "⬆️", headline: n => `Fan Lv.${n}`, sub: "Better demo drops" },
};

/* 节日 / 活动 换肤模板 */
const THEMES = [
  { id: "cyber", name: "Cyber", chip: "🚀", ribbon: null,
    decor: ["🚀","💎","⚡","🌙","✦","💠"] },
  { id: "cny",   name: "Lunar", chip: "🧧", ribbon: "Lunar New Year Drop",
    decor: ["🧧","🏮","🧨","🐉","✨","🪙"] },
  { id: "xmas",  name: "Xmas", chip: "🎄", ribbon: "Holiday Drop",
    decor: ["❄️","🎄","🎁","⛄","✨","🔔"] },
  { id: "bull",  name: "Bull", chip: "🐂", ribbon: "Bull Run · fly to the moon",
    decor: ["🐂","📈","🟢","💰","🔥","🚀"] },
  { id: "anniv", name: "Anniversary", chip: "🎉", ribbon: "HTX Anniversary Drop",
    decor: ["🎉","🎂","🎊","🎈","✨","🥳"] },
];

function ShareCard({ open, kind, value, look, fanLevel, lifetime, invite, onClose }) {
  const k = KIND[kind] || KIND.withdraw;
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState("cyber");
  useEffect(() => { if (open) { /* 每次打开默认赛博，可换肤 */ } }, [open]);
  if (!open) return null;
  const th = THEMES.find(x => x.id === theme) || THEMES[0];
  const creator = (window.KOLS && window.KOLS[look]) || { name: "Wanzi" };
  const creatorName = creator.name.split(" ")[0];
  const headline = k.headline(kind === "levelup" ? fanLevel : value);
  const share = () => {
    const text = `${headline} in ${creatorName}'s HTX Airdrop Demo! Code: ${invite} · MOCK DEMO only`;
    if (navigator.share) navigator.share({ title: `HTX Airdrop Demo · ${creatorName}`, text }).catch(() => {});
    else { navigator.clipboard && navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1600); }
  };
  return (
    <div className="share-mask open" onClick={onClose}>
      <div className="share-wrap" onClick={e => e.stopPropagation()}>
        {/* 海报本体 */}
        <div className={"poster look-" + look + (kind === "moon" ? " kind-moon" : "")} data-theme={theme}>
          <div className="po-grid"></div>
          <div className="po-generated-art" aria-hidden="true">
            {kind === "moon" && <img className="po-medallion" src="assets/generated_v1/moon-medallion-v1.png" alt="" />}
            <img className="po-crystals po-crystals-left" src="assets/generated_v1/settlement-crystals-v1.png" alt="" />
            <img className="po-crystals po-crystals-right" src="assets/generated_v1/settlement-crystals-v1.png" alt="" />
          </div>
          <div className="po-decor">
            {th.decor.map((d, i) => (
              <span key={i} style={{ left: (6 + (i * 16) % 88) + "%", top: (8 + (i * 27) % 78) + "%",
                animationDelay: (i * 0.4) + "s", animationDuration: (3.2 + (i % 3) * 0.9) + "s",
                fontSize: (16 + (i % 3) * 7) + "px" }}>{d}</span>
            ))}
          </div>
          {th.ribbon && <div className="po-ribbon">{th.chip} {th.ribbon}</div>}
          <div className="po-head">
            <div className="po-badge">{k.emoji} {k.tag}</div>
            <div className="po-brand">HTX × {creatorName}</div>
          </div>
          <div className="po-ava">
            {window.KolAvatar ? <window.KolAvatar kol={look} size={92} /> : <SukeAvatar size={92} look={look} />}
          </div>
          <div className="po-headline">{headline}</div>
          <div className="po-sub">{k.sub}</div>
          <div className="po-stats">
            <div><b>Lv.{fanLevel}</b><span>Fan level</span></div>
            <div><b>{lifetime}</b><span>Demo points</span></div>
            <div><b>{invite}</b><span>Invite code</span></div>
          </div>
          <div className="po-foot">
            <div className="po-qr">
              <div className="po-qr-box">{Array.from({ length: 36 }).map((_, i) => <i key={i} style={{ opacity: Math.random() > 0.45 ? 1 : 0 }} />)}</div>
            </div>
            <div className="po-foot-tx">
              <b>Join {creatorName}'s live room</b>
              <span>fly to the moon 🚀 · HTX mock demo</span>
            </div>
          </div>
        </div>

        {/* 换肤模板选择 */}
        <div className="po-skins">
          {THEMES.map(x => (
            <button key={x.id} className={"po-skin" + (theme === x.id ? " on" : "")}
              data-theme={x.id} onClick={() => setTheme(x.id)}>
              <span className="ps-emoji">{x.chip}</span>
              <span className="ps-name">{x.name}</span>
            </button>
          ))}
        </div>

        {/* 操作 */}
        <div className="share-actions">
          <button className="sh-tg" onClick={share}>📨 Telegram</button>
          <button className="sh-x" onClick={share}>𝕏 Share</button>
          <button className="sh-copy" onClick={share}>{copied ? "Copied ✓" : "Copy link"}</button>
        </div>
        <button className="sh-close" onClick={onClose}>Not now</button>
        <div className="sh-tip">🎁 DEMO: invites add a <b>simulated 20% boost</b></div>
      </div>
    </div>
  );
}

Object.assign(window, { Welcome, ProofTicker, ShareCard });
})();
