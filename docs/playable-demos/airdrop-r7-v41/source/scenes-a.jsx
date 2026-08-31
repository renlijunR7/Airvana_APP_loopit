/* global React */
/* 空投背景场景层 part1: 框架 + 城市/交易所/金库/深海 */
(function () {
const R = (n) => Array.from({ length: n });

function CityScene() {
  const towers = [[0,560,46,340],[44,480,38,420],[80,600,52,300],[130,430,44,470],[172,540,40,360],
    [210,360,50,540],[258,500,42,400],[298,580,48,320],[344,450,44,450],[386,540,54,360]];
  return (
    <g>
      <ellipse cx="220" cy="300" rx="260" ry="160" fill="#22d3ee" opacity="0.10" />
      <circle cx="330" cy="150" r="44" fill="#f03dd0" opacity="0.32" />
      <circle cx="330" cy="150" r="44" fill="none" stroke="#f03dd0" strokeWidth="1.5" opacity="0.5" />
      {towers.map(([x,y,w,h],i) => (
        <g key={i}>
          <rect x={x} y={y} width={w} height={h} fill="#0b1830" stroke="#22d3ee" strokeWidth="1" opacity="0.9" />
          <rect x={x} y={y-3} width={w} height="3" fill="#f03dd0" opacity="0.85" />
          {R(Math.floor(h/26)).map((_,r) => R(Math.max(1,Math.floor(w/14))).map((_,c) => (
            <rect key={r+"-"+c} x={x+5+c*13} y={y+9+r*24} width="6" height="9"
              fill={(i+r+c)%3===0?"#5be49b":(i+c)%2?"#22d3ee":"#f03dd0"} opacity={(i*7+r*3+c)%4?0.7:0.12} />
          )))}
        </g>
      ))}
    </g>
  );
}

function TradingScene() {
  const bars = []; let price = 480;
  for (let i=0;i<22;i++){const open=price;const d=(Math.sin(i*1.3)+(i%3?0.4:-0.7))*38;price=Math.max(200,Math.min(700,price-d));
    const top=Math.min(open,price),bot=Math.max(open,price);bars.push({x:14+i*20,top,bot,wT:top-(18+(i%4)*8),wB:bot+(16+(i%3)*7),up:price<open});}
  return (
    <g>
      {R(9).map((_,r)=>(<line key={r} x1="0" y1={120+r*80} x2="440" y2={120+r*80} stroke="#5be49b" strokeWidth="0.5" opacity="0.12" />))}
      <polyline points={bars.map(b=>`${b.x+6},${(b.top+b.bot)/2}`).join(" ")} fill="none" stroke="#ffcc4d" strokeWidth="1.5" opacity="0.5" />
      {bars.map((b,i)=>(
        <g key={i} opacity="0.82">
          <line x1={b.x+6} y1={b.wT} x2={b.x+6} y2={b.wB} stroke={b.up?"#5be49b":"#ff5e6c"} strokeWidth="1.4" />
          <rect x={b.x} y={b.top} width="12" height={Math.max(4,b.bot-b.top)} fill={b.up?"#5be49b":"#ff5e6c"} opacity="0.85" />
        </g>
      ))}
      <ellipse cx="220" cy="800" rx="300" ry="130" fill="#5be49b" opacity="0.10" />
    </g>
  );
}

function VaultScene() {
  return (
    <g>
      <circle cx="220" cy="320" r="172" fill="#1a1306" stroke="#ffcc4d" strokeWidth="3" opacity="0.55" />
      <circle cx="220" cy="320" r="142" fill="none" stroke="#ffcc4d" strokeWidth="1.5" opacity="0.4" />
      <circle cx="220" cy="320" r="42" fill="#2a1f08" stroke="#ffcc4d" strokeWidth="2.5" opacity="0.7" />
      {R(8).map((_,i)=>{const a=(i/8)*Math.PI*2;return <line key={i} x1={220+Math.cos(a)*42} y1={320+Math.sin(a)*42} x2={220+Math.cos(a)*140} y2={320+Math.sin(a)*140} stroke="#ffcc4d" strokeWidth="1.5" opacity="0.3" />;})}
      {R(6).map((_,i)=>{const a=(i/6)*Math.PI*2;return <circle key={i} cx={220+Math.cos(a)*42} cy={320+Math.sin(a)*42} r="6" fill="#ffcc4d" opacity="0.6" />;})}
      <g opacity="0.9">
        {[[110,770],[175,800],[250,778],[318,802],[142,832],[222,842],[298,834],[195,706],[258,720]].map(([x,y],i)=>(
          <g key={i}>
            <ellipse cx={x} cy={y} rx="34" ry="13" fill="#d99a1e" />
            <ellipse cx={x} cy={y-5} rx="34" ry="13" fill="#ffcc4d" />
            <text x={x} y={y-1} textAnchor="middle" fontSize="13" fontWeight="800" fill="#7a5410">$</text>
          </g>
        ))}
      </g>
    </g>
  );
}

function OceanScene() {
  return (
    <g>
      {[80,180,280,360].map((x,i)=>(<polygon key={i} points={`${x},0 ${x+30},0 ${x+90},900 ${x-30},900`} fill="#bfeaff" opacity={0.05+(i%2)*0.03} />))}
      {R(24).map((_,i)=>{const x=(i*73)%440,r=3+(i%5)*2.2,y=(i*137)%900;
        return <circle key={i} className="oc-bub" cx={x} cy={y} r={r} fill="none" stroke="#bfeaff" strokeWidth="1" opacity="0.35"
          style={{animationDelay:(i*0.3)+"s",animationDuration:(6+i%5)+"s"}} />;})}
      <path d="M0 868 Q60 820 120 858 Q190 900 260 853 Q330 815 440 863 L440 900 L0 900 Z" fill="#04263e" opacity="0.8" />
      <path d="M70 868 q-6 -36 6 -54 M82 858 q10 -30 0 -52 M340 866 q-8 -40 4 -60 M356 860 q10 -28 2 -48" stroke="#22d3ee" strokeWidth="3" fill="none" opacity="0.4" strokeLinecap="round" />
    </g>
  );
}

window.SCENES_A = { CityScene, TradingScene, VaultScene, OceanScene };
})();
