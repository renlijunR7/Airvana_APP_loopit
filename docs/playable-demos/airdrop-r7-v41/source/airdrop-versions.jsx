/* global React */
/* 17 种空投机制：配置、初始状态和场内交互面板 */
(function () {
  const VERSION_CONFIGS = [
    { id: "live", priority: "P0", icon: "🎙️", name: "Live Drop", short: "Live", description: "Catch only the token Wanzi calls out.", accent: "#22d3ee", bg: "tech", scene: "Command Hub" },
    { id: "quiz", priority: "P0", icon: "🧠", name: "Quiz Drop", short: "Quiz", description: "Answer a safety question to unlock drops.", accent: "#9b6cff", bg: "matrix", scene: "Safety Grid" },
    { id: "route", priority: "P0", icon: "🗺️", name: "Quest Drop", short: "Quest", description: "Clear short tasks to unlock the map.", accent: "#5be49b", bg: "city", scene: "Cyber City" },
    { id: "merge", priority: "P1", icon: "🧬", name: "Merge Drop", short: "Merge", description: "Merge three matching tokens for a bonus.", accent: "#f03dd0", bg: "vault", scene: "Merge Vault" },
    { id: "guard", priority: "P1", icon: "🛡️", name: "Guard Drop", short: "Guard", description: "Catch safe tokens. Block scams and risks.", accent: "#ff8a3d", bg: "matrix", scene: "Defense Grid" },
    { id: "risk", priority: "P1", icon: "⛽", name: "Risk Run", short: "Risk", description: "Manage demo gas and shields. Avoid bombs.", accent: "#35e5ff", bg: "matrix", scene: "Gas Defense Grid" },
    { id: "bridge", priority: "P1", icon: "🌉", name: "Chain Bridge", short: "Bridge", description: "Select the target chain before routing tokens.", accent: "#6beeff", bg: "city", scene: "Cross-chain Hub" },
    { id: "magnet", priority: "P1", icon: "🧲", name: "Magnet Boost", short: "Magnet", description: "Charge and activate a six-second auto-catch boost.", accent: "#f03dd0", bg: "tech", scene: "Magnet Lab" },
    { id: "freeze", priority: "P1", icon: "❄️", name: "Time Freeze", short: "Freeze", description: "Charge and freeze all drops for four seconds.", accent: "#9be7ff", bg: "aurora", scene: "Frozen Aurora" },
    { id: "gasauction", priority: "P1", icon: "⛽", name: "Gas Auction", short: "Gas Bid", description: "Balance demo gas cost, speed and confirmation odds.", accent: "#ffd166", bg: "trading", scene: "Gas Market" },
    { id: "boss", priority: "P1", icon: "👾", name: "Boss Raid", short: "Boss", description: "Team up against a simulated scam contract boss.", accent: "#ff5d6c", bg: "matrix", scene: "Raid Grid" },
    { id: "scanner", priority: "P1", icon: "🔎", name: "Contract Scanner", short: "Scanner", description: "Read safety clues and flag high-risk contracts.", accent: "#5be49b", bg: "vault", scene: "Audit Vault" },
    { id: "treasure", priority: "P1", icon: "🧭", name: "Treasure Drop", short: "Treasure", description: "Explore tiles and find two chests.", accent: "#ffcc4d", bg: "ocean", scene: "Deep Sea" },
    { id: "team", priority: "P1", icon: "🤝", name: "Team Drop", short: "Team", description: "Build team progress and unlock a chest.", accent: "#5be49b", bg: "aurora", scene: "Aurora Base" },
    { id: "battle", priority: "P1", icon: "⚔️", name: "KOL Battle", short: "Battle", description: "Score for your KOL against a demo rival.", accent: "#f03dd0", bg: "trading", scene: "Battle Floor" },
    { id: "adaptive", priority: "P2", icon: "🤖", name: "AI Drop", short: "AI", description: "The pace adapts to your hit rate.", accent: "#22d3ee", bg: "space", scene: "AI Lab" },
    { id: "campaign", priority: "P2", icon: "✅", name: "Campaign Demo", short: "Campaign", description: "Preview account, eligibility and claim steps.", accent: "#5be49b", bg: "vault", scene: "Reward Vault" },
  ];

  const QUIZZES = [
    { q: "You receive an unknown airdrop link. What first?", options: ["Connect wallet", "Verify the source", "Share seed phrase"], answer: 1 },
    { q: "What does this demo balance represent?", options: ["Real assets", "Demo points", "Exchange funds"], answer: 1 },
    { q: "What should you never share?", options: ["Nickname", "Public address", "Seed phrase"], answer: 2 },
  ];

  const BRIDGE_CHAINS = ["Ethereum", "Base", "BNB Chain", "Polygon"];
  const SCANNER_CASES = [
    { clue: "Unknown dApp asks for your seed phrase.", answer: "risk", reason: "Never share a seed phrase." },
    { clue: "Official domain requests read-only wallet access.", answer: "lower", reason: "Lower risk, but verify the domain and permission." },
    { clue: "New contract requests unlimited token approval.", answer: "risk", reason: "Unlimited approval can expose funds." },
    { clue: "Contract address matches the official audited release.", answer: "lower", reason: "Lower risk, but audits never remove all risk." },
  ];

  function createVersionState(id) {
    const common = { id, startedAt: Date.now() };
    if (id === "live") return { ...common, target: "ETH", targetCount: 3, progress: 0, round: 1, mistakes: 0 };
    if (id === "quiz") return { ...common, question: 0, unlocked: false, correct: 0, attempts: 0 };
    if (id === "route") return { ...common, step: 0, coinCount: 0, completed: [] };
    if (id === "merge") return { ...common, inventory: {}, merges: 0, rareCreated: 0 };
    if (id === "guard") return { ...common, safe: 0, blocked: 0, mistakes: 0 };
    if (id === "risk") return { ...common, shield: 2, maxShield: 3, gas: 15, gasSpent: 0, safe: 0, bombsAvoided: 0, bombsBlocked: 0, bombsHit: 0 };
    if (id === "bridge") return { ...common, target: "Base", selected: "Ethereum", correct: 0, wrong: 0, transfers: 0 };
    if (id === "magnet") return { ...common, charge: 100, active: false, seconds: 0, captures: 0 };
    if (id === "freeze") return { ...common, charge: 100, active: false, seconds: 0, catches: 0 };
    if (id === "gasauction") return { ...common, strategy: "Medium", gasSpent: 0, confirmations: 0, failed: 0 };
    if (id === "boss") return { ...common, hp: 500, maxHp: 500, damage: 0, teamDamage: 0, hits: 0, defeated: false, round: 1 };
    if (id === "scanner") return { ...common, case: 0, unlocked: false, correct: 0, scans: 0 };
    if (id === "treasure") return { ...common, opened: [], found: 0, fragments: 0 };
    if (id === "team") return { ...common, progress: 18, target: 100, friends: 2, chest: false };
    if (id === "battle") return { ...common, ours: 0, rival: 16, round: 1 };
    if (id === "adaptive") return { ...common, level: 1, hits: 0, misses: 0, hint: "Starting at normal speed. AI adapts as you play." };
    return { ...common, account: false, eligible: false, claimed: false, stock: 873, requestId: "" };
  }

  function Meter({ value, max, label }) {
    const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));
    return (
      <div className="version-meter" aria-label={`${label} ${Math.round(pct)}%`}>
        <div className="version-meter-top"><span>{label}</span><b>{value}/{max}</b></div>
        <div className="version-meter-track"><i style={{ width: pct + "%" }} /></div>
      </div>
    );
  }

  function VersionHeader({ config }) {
    return (
      <div className="version-head">
        <span className="version-icon">{config.icon}</span>
        <div className="version-title"><b>{config.name}</b><small>{config.description}</small></div>
        <span className="version-priority">{config.priority}</span>
      </div>
    );
  }

  function LivePanel({ state }) {
    return (
      <div className="version-live-command">
        <span className="live-wave">▂▅▇▃▆</span>
        <div><small>Wanzi Live · Round {state.round}</small><b>Catch {state.target} × {state.targetCount}</b></div>
        <span className="live-progress">{state.progress}/{state.targetCount}</span>
      </div>
    );
  }

  function QuizPanel({ state, onAction }) {
    const quiz = QUIZZES[state.question % QUIZZES.length];
    return (
      <div className="version-quiz">
        <b>{state.unlocked ? "🎁 Unlocked. Keep catching." : quiz.q}</b>
        {!state.unlocked ? (
          <div className="version-actions three">
            {quiz.options.map((option, index) => (
              <button key={option} onClick={() => onAction("quizAnswer", { index, answer: quiz.answer })}>{option}</button>
            ))}
          </div>
        ) : (
          <button className="version-main-action" onClick={() => onAction("quizNext")}>Next question</button>
        )}
      </div>
    );
  }

  function RoutePanel({ state, onAction }) {
    const steps = ["Catch 3 tokens", "Pass safety quiz", "Clear mini game", "Create share card"];
    return (
      <div>
        <div className="route-line">
          {steps.map((step, index) => <span key={step} className={index < state.step ? "done" : index === state.step ? "on" : ""}>{index < state.step ? "✓" : index + 1}<i>{step}</i></span>)}
        </div>
        {state.step > 0 && state.step < steps.length && <button className="version-main-action" onClick={() => onAction("routeAdvance")}>Demo: {steps[state.step]}</button>}
        {state.step >= steps.length && <div className="version-success">Quest complete · Map unlocked</div>}
      </div>
    );
  }

  function MergePanel({ state }) {
    const entries = Object.entries(state.inventory || {}).sort((a, b) => b[1] - a[1]).slice(0, 4);
    return (
      <div className="merge-row">
        <div className="merge-slots">
          {entries.length ? entries.map(([sym, count]) => <span key={sym}><b>{sym}</b><i>{count % 3}/3</i></span>) : <em>Catch matching tokens to merge</em>}
        </div>
        <div className="merge-result"><small>Merged</small><b>{state.merges}</b><i>Rare {state.rareCreated}</i></div>
      </div>
    );
  }

  function GuardPanel({ state }) {
    return (
      <div className="guard-stats">
        <span><b>{state.safe}</b><i>Safe</i></span>
        <span className="good"><b>{state.blocked}</b><i>Blocked</i></span>
        <span className={state.mistakes ? "bad" : ""}><b>{state.mistakes}</b><i>Missed</i></span>
        <small>Tap risk items to block them.</small>
      </div>
    );
  }

  function RiskPanel({ state }) {
    return (
      <div className="risk-panel">
        <div className="risk-stats">
          <span className={state.shield ? "good" : "bad"}><b>🛡️ {state.shield}/{state.maxShield}</b><i>Shield</i></span>
          <span className={state.gas > 3 ? "" : "bad"}><b>⛽ {state.gas}</b><i>Demo gas</i></span>
          <span className="good"><b>{state.bombsAvoided}</b><i>Avoided</i></span>
          <span className={state.bombsHit ? "bad" : ""}><b>{state.bombsHit}</b><i>Bomb hits</i></span>
        </div>
        <small>Catch ⛽ and 🛡️ · Avoid 💣 · Each token costs 1 demo gas</small>
      </div>
    );
  }

  function BridgePanel({ state, onAction }) {
    return (
      <div className="bridge-panel">
        <div className="bridge-target"><small>Route to</small><b>{state.target}</b><span>{state.correct} correct · {state.wrong} wrong</span></div>
        <div className="version-actions bridge-actions">
          {BRIDGE_CHAINS.map(chain => <button key={chain} className={state.selected === chain ? "on" : ""} onClick={() => onAction("bridgeSelect", { chain })}>{chain}</button>)}
        </div>
      </div>
    );
  }

  function MagnetPanel({ state, onAction }) {
    return (
      <div className="power-panel">
        <Meter label={state.active ? `Magnet active · ${state.seconds}s` : "Magnet charge"} value={state.active ? state.seconds : state.charge} max={state.active ? 6 : 100} />
        <button className="version-main-action" disabled={state.active || state.charge < 100} onClick={() => onAction("magnetActivate")}>{state.active ? "Auto-catching…" : state.charge < 100 ? `Recharge ${state.charge}%` : "Activate magnet · 6s"}</button>
        <small>Auto-caught {state.captures}</small>
      </div>
    );
  }

  function FreezePanel({ state, onAction }) {
    return (
      <div className="power-panel">
        <Meter label={state.active ? `Time frozen · ${state.seconds}s` : "Freeze charge"} value={state.active ? state.seconds : state.charge} max={state.active ? 4 : 100} />
        <button className="version-main-action" disabled={state.active || state.charge < 100} onClick={() => onAction("freezeActivate")}>{state.active ? "Drops frozen…" : state.charge < 100 ? `Recharge ${state.charge}%` : "Freeze drops · 4s"}</button>
        <small>Catches {state.catches}</small>
      </div>
    );
  }

  function GasAuctionPanel({ state, onAction }) {
    const strategies = ["Low", "Medium", "High"];
    return (
      <div className="gas-auction-panel">
        <div className="version-actions">
          {strategies.map(strategy => <button key={strategy} className={state.strategy === strategy ? "on" : ""} onClick={() => onAction("gasStrategy", { strategy })}>{strategy}</button>)}
        </div>
        <div className="gas-auction-stats"><span>Spent <b>{state.gasSpent}</b></span><span>Confirmed <b>{state.confirmations}</b></span><span>Failed <b>{state.failed}</b></span></div>
        <small>Low: cheaper/slower · High: faster/costlier · Demo only</small>
      </div>
    );
  }

  function BossPanel({ state, onAction }) {
    return (
      <div className="boss-panel">
        <Meter label={state.defeated ? `Scam Boss defeated · Round ${state.round}` : `Scam Boss · Round ${state.round}`} value={state.maxHp - state.hp} max={state.maxHp} />
        <div className="boss-stats"><span>Your damage <b>{state.damage}</b></span><span>Team damage <b>{state.teamDamage}</b></span></div>
        <button className="version-main-action" onClick={() => onAction(state.defeated ? "bossNext" : "bossBoost")}>{state.defeated ? "Next boss" : "Demo team attack +20"}</button>
      </div>
    );
  }

  function ScannerPanel({ state, onAction }) {
    const scanCase = SCANNER_CASES[state.case % SCANNER_CASES.length];
    return (
      <div className="scanner-panel">
        <b>{state.unlocked ? `✓ ${scanCase.reason}` : scanCase.clue}</b>
        {!state.unlocked ? (
          <div className="version-actions"><button onClick={() => onAction("scannerAnswer", { choice: "lower", answer: scanCase.answer })}>Lower risk</button><button onClick={() => onAction("scannerAnswer", { choice: "risk", answer: scanCase.answer })}>High risk</button></div>
        ) : <small>Catch one token to load the next scan.</small>}
        <small>Educational demo · Always verify independently · {state.correct}/{state.scans} correct</small>
      </div>
    );
  }

  function TreasurePanel({ state, onAction }) {
    return (
      <div className="treasure-map">
        <div className="treasure-grid">
          {[0, 1, 2, 3, 4, 5].map(index => {
            const opened = state.opened.includes(index);
            const treasure = opened && (index === 1 || index === 4);
            return <button key={index} disabled={opened} className={treasure ? "found" : opened ? "empty" : ""} onClick={() => onAction("treasureOpen", { index })}>{treasure ? "🎁" : opened ? "·" : "?"}</button>;
          })}
        </div>
        <div className="treasure-copy"><b>Chests {state.found}/2</b><small>Keys {state.fragments}/2 · Tap a tile</small></div>
      </div>
    );
  }

  function TeamPanel({ state, onAction }) {
    return (
      <div>
        <Meter label={`Team · ${state.friends} players`} value={state.progress} max={state.target} />
        <button className="version-main-action" disabled={state.chest} onClick={() => onAction("teamBoost")}>{state.chest ? "Team chest unlocked ✓" : "Demo teammate +15"}</button>
      </div>
    );
  }

  function BattlePanel({ state, onAction, kolName }) {
    const max = Math.max(100, state.ours, state.rival);
    return (
      <div className="battle-board">
        <div><span><b>{kolName}</b><strong>{state.ours}</strong></span><Meter label="You" value={state.ours} max={max} /></div>
        <div><span><b>Rival KOL</b><strong>{state.rival}</strong></span><Meter label="Rival" value={state.rival} max={max} /></div>
        <button className="version-main-action" onClick={() => onAction("battleBoost")}>Boost KOL +20</button>
      </div>
    );
  }

  function AdaptivePanel({ state }) {
    const total = state.hits + state.misses;
    const rate = total ? Math.round(state.hits / total * 100) : 100;
    return (
      <div className="adaptive-panel">
        <span className="ai-orb-mini">AI</span>
        <div><b>AI Lv.{state.level} · Hit rate {rate}%</b><small>{state.hint}</small></div>
        <span className="adaptive-status">Live</span>
      </div>
    );
  }

  function CampaignPanel({ state, onAction }) {
    const steps = [
      { key: "account", label: "Account", done: state.account },
      { key: "eligible", label: "Eligibility", done: state.eligible },
      { key: "claimed", label: "Claim", done: state.claimed },
    ];
    const nextAction = !state.account ? "campaignAccount" : !state.eligible ? "campaignEligibility" : !state.claimed ? "campaignClaim" : null;
    const nextLabel = !state.account ? "Demo account" : !state.eligible ? "Check eligibility" : !state.claimed ? "Demo claim" : "Claim complete";
    return (
      <div className="campaign-panel">
        <div className="campaign-warning">DEMO · No real account or reward</div>
        <div className="campaign-steps">{steps.map(step => <span key={step.key} className={step.done ? "done" : ""}>{step.done ? "✓" : "○"}<i>{step.label}</i></span>)}</div>
        <div className="campaign-stock">Demo stock <b>{state.stock}</b> {state.requestId && <code>{state.requestId}</code>}</div>
        <button className="version-main-action" disabled={!nextAction} onClick={() => nextAction && onAction(nextAction)}>{nextLabel}</button>
      </div>
    );
  }

  function AirdropVersionPanel({ version, state, onAction, kolName }) {
    const config = VERSION_CONFIGS.find(item => item.id === version) || VERSION_CONFIGS[0];
    // Tweak 切换时 React 会先收到新版本名，再执行 App 中的状态重置 effect。
    // 这一个渲染帧用目标版本初始状态兜底，避免跨版本字段为空导致白屏。
    const safeState = state && state.id === config.id ? state : createVersionState(config.id);
    let body = <LivePanel state={safeState} />;
    if (version === "quiz") body = <QuizPanel state={safeState} onAction={onAction} />;
    else if (version === "route") body = <RoutePanel state={safeState} onAction={onAction} />;
    else if (version === "merge") body = <MergePanel state={safeState} />;
    else if (version === "guard") body = <GuardPanel state={safeState} />;
    else if (version === "risk") body = <RiskPanel state={safeState} />;
    else if (version === "bridge") body = <BridgePanel state={safeState} onAction={onAction} />;
    else if (version === "magnet") body = <MagnetPanel state={safeState} onAction={onAction} />;
    else if (version === "freeze") body = <FreezePanel state={safeState} onAction={onAction} />;
    else if (version === "gasauction") body = <GasAuctionPanel state={safeState} onAction={onAction} />;
    else if (version === "boss") body = <BossPanel state={safeState} onAction={onAction} />;
    else if (version === "scanner") body = <ScannerPanel state={safeState} onAction={onAction} />;
    else if (version === "treasure") body = <TreasurePanel state={safeState} onAction={onAction} />;
    else if (version === "team") body = <TeamPanel state={safeState} onAction={onAction} />;
    else if (version === "battle") body = <BattlePanel state={safeState} onAction={onAction} kolName={kolName} />;
    else if (version === "adaptive") body = <AdaptivePanel state={safeState} />;
    else if (version === "campaign") body = <CampaignPanel state={safeState} onAction={onAction} />;
    return (
      <section className={`version-panel version-${version}`} style={{ "--version-accent": config.accent }} data-airdrop-version={version}>
        <VersionHeader config={config} />
        <div className="version-body">{body}</div>
      </section>
    );
  }

  Object.assign(window, {
    AIRDROP_VERSION_CONFIGS: VERSION_CONFIGS,
    AIRDROP_VERSION_OPTIONS: VERSION_CONFIGS.map(item => ({ value: item.id, label: `${item.priority} · ${item.short}` })),
    AIRDROP_VERSION_QUIZZES: QUIZZES,
    AIRDROP_VERSION_SCANNER_CASES: SCANNER_CASES,
    createAirdropVersionState: createVersionState,
    AirdropVersionPanel,
  });
})();
