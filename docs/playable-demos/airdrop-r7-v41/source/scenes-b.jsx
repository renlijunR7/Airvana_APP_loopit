/* global React */
/* 空投背景场景层 part2: 太空/科技/极光/矩阵 + Scene 分发器 */
(function () {
const R = (n) => Array.from({ length: n });

function SpaceScene() {
  return (
    <g>
      <defs>
        <radialGradient id="planetG" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#b89bff" /><stop offset="55%" stopColor="#6a3fd0" /><stop offset="100%" stopColor="#2a1366" />
        </radialGradient>
        <radialGradient id="nebG" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f03dd0" stopOpacity="0.4" /><stop offset="100%" stopColor="#f03dd0" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="120" cy="240" rx="230" ry="150" fill="url(#nebG)" />
      <g className="sp-planet">
        {/* 光环后半段：在星球后面，会被星球挡住 */}
        <g transform="rotate(-18 320 205)">
          <ellipse cx="320" cy="205" rx="152" ry="34" fill="none" stroke="#9b6cff" strokeWidth="7" opacity="0.4" />
          <ellipse cx="320" cy="205" rx="152" ry="34" fill="none" stroke="#f03dd0" strokeWidth="2" opacity="0.5" />
        </g>
        {/* 星球本体（遮住后半段环）*/}
        <circle cx="320" cy="200" r="92" fill="url(#planetG)" />
        {/* 光环前半段：只显示下半部分，画在星球前面 */}
        <clipPath id="ringFront"><rect x="120" y="206" width="400" height="220" /></clipPath>
        <g clipPath="url(#ringFront)">
          <g transform="rotate(-18 320 205)">
            <ellipse cx="320" cy="205" rx="152" ry="34" fill="none" stroke="#b98cff" strokeWidth="7" opacity="0.6" />
            <ellipse cx="320" cy="205" rx="152" ry="34" fill="none" stroke="#f03dd0" strokeWidth="2.4" opacity="0.6" />
          </g>
        </g>
      </g>
      <circle cx="92" cy="150" r="22" fill="#cfe0ff" opacity="0.9" />
      <circle cx="85" cy="143" r="5" fill="#9fb4d8" opacity="0.7" />
      <circle cx="101" cy="158" r="3.4" fill="#9fb4d8" opacity="0.7" />
      {R(64).map((_,i)=>(<circle key={i} cx={(i*47)%440} cy={(i*151)%900} r={(i%3)*0.7+0.6} fill="#fff" opacity={0.3+(i%4)*0.16} />))}
      <text x="320" y="206" textAnchor="middle" fontSize="30" fontWeight="800"
        fill="#ffb27a" opacity="0.92" style={{ letterSpacing: "1px", textShadow: "0 0 18px rgba(255,150,90,.8)" }}>Airvan</text>
    </g>
  );
}

function TechScene() {
  const nodes = [[40,120],[200,90],[360,160],[120,260],[300,300],[80,440],[240,480],[400,440],[160,640],[340,680],[60,760],[260,800]];
  return (
    <g>
      <g stroke="#22d3ee" strokeWidth="1.4" fill="none" opacity="0.4">
        <path d="M40 120 H200 V90 M200 90 H360 V160 M120 260 H300 V300 M80 440 H240 V480 H400 V440 M160 640 H340 V680 M60 760 H260 V800" />
        <path d="M40 120 V260 M360 160 V300 M80 440 V760 M240 480 V640 M400 440 V680" />
      </g>
      {nodes.map(([x,y],i)=>(
        <g key={i}>
          <circle cx={x} cy={y} r="9" fill="none" stroke="#22d3ee" strokeWidth="1.4" opacity="0.5" />
          <circle cx={x} cy={y} r="4" fill={i%3?"#22d3ee":"#5be49b"} opacity="0.85" />
        </g>
      ))}
      {R(6).map((_,i)=>{const x=60+i*70,y=370+(i%3)*150;
        return <polygon key={i} points={`${x},${y-15} ${x+13},${y-7} ${x+13},${y+7} ${x},${y+15} ${x-13},${y+7} ${x-13},${y-7}`}
          fill="none" stroke="#5be49b" strokeWidth="1.2" opacity="0.3" />;})}
    </g>
  );
}

function AuroraScene() {
  return (
    <g>
      <defs>
        <linearGradient id="aurG1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5be49b" stopOpacity="0.5" /><stop offset="100%" stopColor="#5be49b" stopOpacity="0" /></linearGradient>
        <linearGradient id="aurG2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22d3ee" stopOpacity="0.45" /><stop offset="100%" stopColor="#22d3ee" stopOpacity="0" /></linearGradient>
        <linearGradient id="aurG3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#9b6cff" stopOpacity="0.4" /><stop offset="100%" stopColor="#9b6cff" stopOpacity="0" /></linearGradient>
      </defs>
      <path d="M-20 120 Q120 40 240 140 Q360 240 460 120 L460 380 Q360 300 240 360 Q120 420 -20 340 Z" fill="url(#aurG1)" opacity="0.8" />
      <path d="M-20 200 Q140 120 260 220 Q380 320 460 200 L460 440 Q360 380 240 430 Q120 480 -20 420 Z" fill="url(#aurG2)" opacity="0.7" />
      <path d="M-20 90 Q120 30 250 110 Q380 190 460 90 L460 260 Q360 200 240 250 Q120 300 -20 240 Z" fill="url(#aurG3)" opacity="0.6" />
      {R(40).map((_,i)=>(<circle key={i} cx={(i*61)%440} cy={500+((i*97)%380)} r={(i%3)*0.6+0.6} fill="#fff" opacity={0.25+(i%4)*0.14} />))}
      <path d="M0 880 Q110 850 220 875 Q330 900 440 870 L440 900 L0 900 Z" fill="#06241a" opacity="0.7" />
    </g>
  );
}

function MatrixScene() {
  const cols = R(15).map((_, i) => ({ x: 8 + i * 30, len: 6 + (i % 7), top: (i * 53) % 500, sp: 5 + (i % 5) }));
  const ch = "01ΞΣ฿Δ¥";
  return (
    <g fontFamily="monospace" fontSize="15" fontWeight="700">
      {cols.map((c, i) => (
        <g key={i} className="mx-col" style={{ animationDuration: c.sp + "s", animationDelay: (i * 0.2) + "s" }}>
          {R(c.len).map((_, r) => (
            <text key={r} x={c.x} y={c.top + r * 24} fill="#5be49b" opacity={r === c.len - 1 ? 0.95 : 0.16 + (r / c.len) * 0.4}>
              {ch[(i + r) % ch.length]}
            </text>
          ))}
        </g>
      ))}
    </g>
  );
}

function Scene({ bg }) {
  const A = window.SCENES_A || {};
  const map = {
    city: A.CityScene, trading: A.TradingScene, vault: A.VaultScene, ocean: A.OceanScene,
    space: SpaceScene, tech: TechScene, aurora: AuroraScene, matrix: MatrixScene,
  };
  const C = map[bg];
  if (!C) return null;
  return (
    <div className="scene" data-scene={bg} aria-hidden="true">
      <svg className="scene-svg" viewBox="0 0 440 900" preserveAspectRatio="xMidYMid slice">
        <C />
      </svg>
    </div>
  );
}

window.Scene = Scene;
})();
