/* global React */
/* ============================================================
   KOL 全息数字人「立绘」— 用于 AI 直播答疑界面
   半身全息：头 + 躯干 + 手臂 + 光台，下半身全息消散
   <KolFigure kol="suke|doge|neko|zeta" talking />
   ============================================================ */
(function () {
const U = () => "f" + Math.random().toString(36).slice(2, 7);

/* 苏克：无聊猿，花呢西装，举手打招呼 */
function SukeFigure({ uid, talking }) {
  return (
    <g>
      <defs>
        <linearGradient id={uid + "fur"} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2E63B0" /><stop offset="100%" stopColor="#16335f" /></linearGradient>
        <linearGradient id={uid + "jac"} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6b5538" /><stop offset="100%" stopColor="#3c3020" /></linearGradient>
        <linearGradient id={uid + "muz"} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#D8C7A8" /><stop offset="100%" stopColor="#b89e76" /></linearGradient>
      </defs>
      {/* 躯干/西装 */}
      <path d="M150 250 Q150 232 168 230 L232 230 Q250 232 250 252 L268 470 Q200 500 132 470 Z" fill={`url(#${uid}jac)`} />
      {/* 衬衫 V */}
      <path d="M185 232 L200 268 L215 232 L215 360 L185 360 Z" fill="#e9e6dc" />
      <path d="M194 236 L200 250 L206 236 L209 360 L191 360 Z" fill="#22324d" />
      <circle cx="200" cy="260" r="2.4" fill="#cdd8ea" /><circle cx="196" cy="280" r="2.4" fill="#cdd8ea" /><circle cx="204" cy="280" r="2.4" fill="#cdd8ea" /><circle cx="200" cy="300" r="2.4" fill="#cdd8ea" />
      {/* 左臂 自然垂 */}
      <path d="M150 256 Q116 300 120 380 Q120 410 138 412 Q150 410 150 388 Q150 320 168 280 Z" fill={`url(#${uid}jac)`} />
      <ellipse cx="130" cy="408" rx="16" ry="18" fill={`url(#${uid}muz)`} />
      {/* 右臂 举起招呼 */}
      <path className={talking ? "fig-wave" : ""} style={{ transformOrigin: "250px 256px" }}
        d="M250 256 Q300 250 320 196 Q330 176 314 168 Q300 164 292 182 Q276 220 232 250 Z" fill={`url(#${uid}jac)`} />
      <ellipse className={talking ? "fig-wave" : ""} style={{ transformOrigin: "250px 256px" }} cx="312" cy="172" rx="17" ry="19" fill={`url(#${uid}muz)`} />
      {/* 头 */}
      <g>
        {/* 耳 */}
        <ellipse cx="158" cy="150" rx="20" ry="26" fill={`url(#${uid}fur)`} /><ellipse cx="242" cy="150" rx="20" ry="26" fill={`url(#${uid}fur)`} />
        <ellipse cx="160" cy="150" rx="9" ry="13" fill="#b89e76" opacity="0.6" /><ellipse cx="240" cy="150" rx="9" ry="13" fill="#b89e76" opacity="0.6" />
        {/* 头型 */}
        <path d="M200 76 Q262 76 266 150 Q266 224 200 232 Q134 224 134 150 Q138 76 200 76 Z" fill={`url(#${uid}fur)`} />
        {/* 口鼻 */}
        <path d="M200 142 Q254 142 254 188 Q254 224 200 228 Q146 224 146 188 Q146 142 200 142 Z" fill={`url(#${uid}muz)`} />
        <ellipse cx="184" cy="178" rx="5" ry="8" fill="#3a2c1c" /><ellipse cx="216" cy="178" rx="5" ry="8" fill="#3a2c1c" />
        <path className="fig-mouth" d={talking ? "M176 204 Q200 214 224 204 Q224 210 200 212 Q176 210 176 204 Z" : "M178 206 Q200 211 222 206"} stroke="#3a2c1c" strokeWidth="3.4" fill={talking ? "#5a3a22" : "none"} strokeLinecap="round" />
        {/* 慵懒半垂眼 */}
        <ellipse cx="180" cy="150" rx="17" ry="13" fill="#f3ead6" /><ellipse cx="220" cy="150" rx="17" ry="13" fill="#f3ead6" />
        <ellipse cx="181" cy="155" rx="6" ry="6.6" fill="#1c1208" /><ellipse cx="221" cy="155" rx="6" ry="6.6" fill="#1c1208" />
        <circle cx="183.5" cy="152.5" r="1.8" fill="#fff" opacity="0.85" /><circle cx="223.5" cy="152.5" r="1.8" fill="#fff" opacity="0.85" />
        <path d="M162 142 Q180 150 198 142 Q198 154 180 153 Q162 154 162 142 Z" fill="#2E63B0" /><path d="M202 142 Q220 150 238 142 Q238 154 220 153 Q202 154 202 142 Z" fill="#2E63B0" />
      </g>
    </g>
  );
}

/* 狗神：柴犬，坐姿，吐舌 */
function DogeFigure({ uid, talking }) {
  return (
    <g>
      <defs>
        <linearGradient id={uid + "f"} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f1b34a" /><stop offset="100%" stopColor="#b8801c" /></linearGradient>
        <linearGradient id={uid + "cr"} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#fbe6c0" /><stop offset="100%" stopColor="#e8c98a" /></linearGradient>
      </defs>
      {/* 坐姿身体 */}
      <path d="M140 300 Q140 250 200 250 Q260 250 260 300 L274 460 Q200 490 126 460 Z" fill={`url(#${uid}f)`} />
      <path d="M170 320 Q200 300 230 320 L240 470 Q200 486 160 470 Z" fill={`url(#${uid}cr)`} />
      {/* 前爪 */}
      <ellipse cx="166" cy="468" rx="22" ry="16" fill={`url(#${uid}f)`} /><ellipse cx="234" cy="468" rx="22" ry="16" fill={`url(#${uid}f)`} />
      <ellipse cx="166" cy="466" rx="14" ry="9" fill={`url(#${uid}cr)`} /><ellipse cx="234" cy="466" rx="14" ry="9" fill={`url(#${uid}cr)`} />
      {/* 头 */}
      <g>
        <path d="M150 120 L158 64 L196 100 Z" fill={`url(#${uid}f)`} /><path d="M250 120 L242 64 L204 100 Z" fill={`url(#${uid}f)`} />
        <path d="M158 108 L162 80 L182 98 Z" fill="#8a5b14" opacity="0.5" /><path d="M242 108 L238 80 L218 98 Z" fill="#8a5b14" opacity="0.5" />
        <path d="M200 86 Q262 86 266 156 Q266 220 200 228 Q134 220 134 156 Q138 86 200 86 Z" fill={`url(#${uid}f)`} />
        <path d="M200 150 Q254 150 254 192 Q254 224 200 228 Q146 224 146 192 Q146 150 200 150 Z" fill={`url(#${uid}cr)`} />
        <path d="M132 158 Q150 148 168 156 Q150 164 132 162 Z" fill="#fbe6c0" opacity="0.7" /><path d="M268 158 Q250 148 232 156 Q250 164 268 162 Z" fill="#fbe6c0" opacity="0.7" />
        <ellipse cx="178" cy="150" rx="7" ry="8" fill="#2a1c0a" /><ellipse cx="222" cy="150" rx="7" ry="8" fill="#2a1c0a" />
        <circle cx="180" cy="147" r="2" fill="#fff" opacity="0.85" /><circle cx="224" cy="147" r="2" fill="#fff" opacity="0.85" />
        <ellipse cx="200" cy="180" rx="7" ry="5" fill="#2a1c0a" />
        {/* 吐舌（说话时动） */}
        <path className="fig-mouth" d="M200 185 L200 196 M200 196 Q188 204 178 198 M200 196 Q212 204 222 198" stroke="#2a1c0a" strokeWidth="2.6" fill="none" strokeLinecap="round" />
        <ellipse className={talking ? "fig-tongue" : ""} cx="200" cy="202" rx="7" ry={talking ? 11 : 6} fill="#ff7a9c" />
      </g>
    </g>
  );
}

/* 赛博喵：机械猫，纤细身形，霓虹护目镜 */
function NekoFigure({ uid, talking }) {
  return (
    <g>
      <defs>
        <linearGradient id={uid + "m"} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3a4763" /><stop offset="100%" stopColor="#1b2438" /></linearGradient>
      </defs>
      {/* 纤细躯干 */}
      <path d="M168 250 Q168 236 200 236 Q232 236 232 250 L244 460 Q200 484 156 460 Z" fill={`url(#${uid}m)`} stroke="#f03dd0" strokeWidth="1" opacity="0.96" />
      <path d="M200 240 L200 450" stroke="#f03dd0" strokeWidth="1" opacity="0.4" />
      <path d="M168 300 L232 300 M162 360 L238 360" stroke="#f03dd0" strokeWidth="1" opacity="0.3" />
      {/* 手臂 */}
      <path d="M168 256 Q140 300 144 380 Q146 404 160 404 Q170 402 168 382 Q166 320 184 282 Z" fill={`url(#${uid}m)`} stroke="#f03dd0" strokeWidth="0.8" />
      <path d="M232 256 Q260 300 256 380 Q254 404 240 404 Q230 402 232 382 Q234 320 216 282 Z" fill={`url(#${uid}m)`} stroke="#f03dd0" strokeWidth="0.8" />
      {/* 尾巴 */}
      <path className={talking ? "fig-tail" : ""} style={{ transformOrigin: "250px 440px" }} d="M250 440 Q300 420 300 360 Q300 330 282 332 Q270 334 272 358 Q272 400 236 426 Z" fill="#f03dd0" opacity="0.5" />
      {/* 头 */}
      <g>
        <path d="M156 120 L152 60 L204 100 Z" fill={`url(#${uid}m)`} stroke="#f03dd0" strokeWidth="1" /><path d="M244 120 L248 60 L196 100 Z" fill={`url(#${uid}m)`} stroke="#f03dd0" strokeWidth="1" />
        <path d="M166 104 L164 76 L188 98 Z" fill="#f03dd0" opacity="0.5" /><path d="M234 104 L236 76 L212 98 Z" fill="#f03dd0" opacity="0.5" />
        <path d="M200 84 Q262 84 266 154 Q266 220 200 228 Q134 220 134 154 Q138 84 200 84 Z" fill={`url(#${uid}m)`} />
        <path d="M200 86 L200 226 M134 154 L266 154" stroke="#0a0f1a" strokeWidth="1" opacity="0.4" />
        {/* 霓虹护目镜 */}
        <rect x="146" y="140" width="108" height="30" rx="15" fill="#0a0f1a" stroke="#f03dd0" strokeWidth="1.4" />
        <rect x="146" y="140" width="108" height="30" rx="15" fill="#f03dd0" opacity="0.12" />
        <path className="fig-mouth" d={talking ? "M166 154 Q176 146 186 154" : "M166 156 Q176 150 186 156"} stroke="#22f0ff" strokeWidth="3.4" fill="none" strokeLinecap="round" />
        <path d="M214 156 Q224 150 234 156" stroke="#22f0ff" strokeWidth="3.4" fill="none" strokeLinecap="round" />
        <circle cx="200" cy="155" r="2" fill="#f03dd0" />
        {/* 鼻 + 猫嘴 + 须 */}
        <path d="M195 194 L205 194 L200 200 Z" fill="#f03dd0" />
        <path d="M200 200 Q190 207 182 202 M200 200 Q210 207 218 202" stroke="#9fb0cc" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M150 188 L120 182 M150 196 L122 200 M250 188 L280 182 M250 196 L278 200" stroke="#9fb0cc" strokeWidth="1.2" opacity="0.6" strokeLinecap="round" />
      </g>
    </g>
  );
}

/* 泽塔：外星人，纤长身形，触角 */
function ZetaFigure({ uid, talking }) {
  return (
    <g>
      <defs>
        <radialGradient id={uid + "sk"} cx="50%" cy="35%" r="75%"><stop offset="0%" stopColor="#aef7c9" /><stop offset="100%" stopColor="#3fae72" /></radialGradient>
      </defs>
      {/* 纤长躯干 */}
      <path d="M172 250 Q172 236 200 236 Q228 236 228 250 L238 460 Q200 482 162 460 Z" fill={`url(#${uid}sk)`} />
      {/* 四指长臂 */}
      <path d="M172 256 Q138 310 140 396 Q140 420 154 420 Q166 418 164 396 Q162 326 186 284 Z" fill={`url(#${uid}sk)`} />
      <path d="M228 256 Q262 310 260 396 Q260 420 246 420 Q234 418 236 396 Q238 326 214 284 Z" fill={`url(#${uid}sk)`} />
      <path d="M148 418 L142 440 M154 420 L154 442 M160 418 L166 440" stroke="#3fae72" strokeWidth="3" strokeLinecap="round" />
      {/* 头：倒水滴 */}
      <g>
        <path className={talking ? "fig-ant" : ""} style={{ transformOrigin: "170px 96px" }} d="M170 96 Q160 60 148 56" stroke="#3fae72" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path className={talking ? "fig-ant" : ""} style={{ transformOrigin: "230px 96px" }} d="M230 96 Q240 60 252 56" stroke="#3fae72" strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="148" cy="56" r="6" fill="#7CFCA8" /><circle cx="252" cy="56" r="6" fill="#7CFCA8" />
        <path d="M200 70 Q266 70 270 150 Q270 218 200 232 Q130 218 130 150 Q134 70 200 70 Z" fill={`url(#${uid}sk)`} />
        <ellipse cx="174" cy="138" rx="14" ry="9" fill="#dffbe9" opacity="0.4" />
        {/* 巨大黑眼 */}
        <path d="M150 148 Q172 138 188 156 Q176 184 152 176 Q140 162 150 148 Z" fill="#0a1410" />
        <path d="M250 148 Q228 138 212 156 Q224 184 248 176 Q260 162 250 148 Z" fill="#0a1410" />
        <ellipse cx="166" cy="156" rx="4" ry="6" fill="#7CFCA8" opacity="0.7" /><ellipse cx="234" cy="156" rx="4" ry="6" fill="#7CFCA8" opacity="0.7" />
        <circle cx="160" cy="150" r="2.4" fill="#fff" /><circle cx="240" cy="150" r="2.4" fill="#fff" />
        <circle cx="190" cy="196" r="1.8" fill="#1d6b46" /><circle cx="210" cy="196" r="1.8" fill="#1d6b46" />
        <path className="fig-mouth" d={talking ? "M186 210 Q200 220 214 210 Q214 216 200 217 Q186 216 186 210 Z" : "M188 212 Q200 216 212 212"} stroke="#1d6b46" strokeWidth="2.4" fill={talking ? "#0f3d28" : "none"} strokeLinecap="round" />
      </g>
    </g>
  );
}

function KolFigure({ kol = "suke", talking = false }) {
  const uid = React.useMemo(U, [kol]);
  const k = (window.KOLS && window.KOLS[kol]) || {};
  const accent = k.accent || "#22d3ee";
  // 真人/视频形象：直接用图片立绘
  if (k.figure) {
    return (
      <div className={"kol-figure photo" + (talking ? " talking" : "")} style={{ "--fac": accent }}>
        <div className="kf-photo-wrap">
          <img src={k.figure} alt={k.name} className="kf-photo" />
          {talking && kol === "wanzi" && (
            <svg className="kf-lipsync" viewBox="0 0 80 54" aria-hidden="true">
              {/* 参考视频：用嘴唇轮廓、上齿和下唇组成真实的多口型切换。 */}
              <g className="mouth-state mouth-closed">
                <path d="M12 26 C20 21 31 21 40 25 C49 21 60 21 68 26 C59 31 49 32 40 28 C31 32 21 31 12 26Z" fill="#efb3b0" opacity=".9" />
                <path d="M14 26 C23 22 31 23 40 26 C49 23 57 22 66 26 C57 29 49 30 40 27 C31 30 23 29 14 26Z" fill="none" stroke="#9d556e" strokeWidth="1.6" strokeLinecap="round" />
              </g>
              <g className="mouth-state mouth-o">
                <path d="M20 25 C22 17 31 14 40 15 C49 14 58 17 60 25 C58 35 49 40 40 40 C31 40 22 35 20 25Z" fill="#572843" stroke="#a85b76" strokeWidth="1.5" />
                <path d="M28 22 C34 19 46 19 52 22 C49 25 45 26 40 26 C35 26 31 25 28 22Z" fill="#fff1eb" opacity=".96" />
                <path d="M27 34 C34 38 46 38 53 34 C49 40 31 40 27 34Z" fill="#df789d" opacity=".9" />
              </g>
              <g className="mouth-state mouth-open">
                <path d="M10 24 C18 14 30 12 40 15 C50 12 62 14 70 24 C67 37 54 44 40 44 C26 44 13 37 10 24Z" fill="#54243f" stroke="#9f526e" strokeWidth="1.6" />
                <path d="M17 21 C24 16 33 16 40 18 C47 16 56 16 63 21 C57 25 49 26 40 25 C31 26 23 25 17 21Z" fill="#fff3ed" />
                <path d="M19 34 C27 38 53 38 61 34 C57 43 25 43 19 34Z" fill="#e27b9d" opacity=".94" />
              </g>
              <g className="mouth-state mouth-wide">
                <path d="M8 23 C19 12 31 11 40 14 C49 11 61 12 72 23 C69 38 55 47 40 47 C25 47 11 38 8 23Z" fill="#4c203b" stroke="#944c69" strokeWidth="1.7" />
                <path d="M14 20 C23 14 32 15 40 17 C48 15 57 14 66 20 C60 25 50 27 40 26 C30 27 20 25 14 20Z" fill="#fff6ef" />
                <path d="M16 35 C25 41 55 41 64 35 C59 46 22 46 16 35Z" fill="#e783a3" opacity=".95" />
              </g>
            </svg>
          )}
        </div>
      </div>
    );
  }
  let body;
  if (kol === "doge") body = <DogeFigure uid={uid} talking={talking} />;
  else if (kol === "neko") body = <NekoFigure uid={uid} talking={talking} />;
  else if (kol === "zeta") body = <ZetaFigure uid={uid} talking={talking} />;
  else body = <SukeFigure uid={uid} talking={talking} />;
  return (
    <div className={"kol-figure" + (talking ? " talking" : "")} style={{ "--fac": accent }}>
      <svg viewBox="0 0 400 520" preserveAspectRatio="xMidYMid meet" className="kf-svg">
        {/* 全息光台 */}
        <ellipse className="kf-stage" cx="200" cy="500" rx="150" ry="26" fill={accent} opacity="0.25" />
        <ellipse cx="200" cy="500" rx="96" ry="15" fill={accent} opacity="0.35" />
        {/* 下半身全息消散遮罩 */}
        <defs>
          <linearGradient id={uid + "fade"} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity="1" />
            <stop offset="78%" stopColor="#fff" stopOpacity="1" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <mask id={uid + "m"}><rect width="400" height="520" fill={`url(#${uid}fade)`} /></mask>
        </defs>
        <g mask={`url(#${uid}m)`} className="kf-body">{body}</g>
      </svg>
    </div>
  );
}

window.KolFigure = KolFigure;
})();
