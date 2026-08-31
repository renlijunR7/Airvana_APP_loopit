/* global React, SukeAvatar */

const CAMPAIGN_DONE_STATUSES = ["Rewarded", "Verified", "Revoked"];
const CAMPAIGN_ACTIONABLE_STATUSES = ["Available", "In progress", "Verifying", "Rejected", "Expired"];
const CAMPAIGN_DEMO_USD_REWARDS = [
  { code: "uid", label: "Register", requirement: "UID verified", amount: 1 },
  { code: "deposit", label: "Deposit", requirement: "$100+", amount: 30 },
  { code: "trade", label: "Trade", requirement: "$100+", amount: 20 },
];

function campaignRewardSummary(tasks) {
  const taskByCode = Object.fromEntries((tasks || []).map((task) => [task.code, task]));
  const steps = CAMPAIGN_DEMO_USD_REWARDS.map((step) => ({
    ...step,
    unlocked: CAMPAIGN_DONE_STATUSES.includes(taskByCode[step.code]?.status),
  }));
  const unlocked = steps.reduce((sum, step) => sum + (step.unlocked ? step.amount : 0), 0);
  const total = steps.reduce((sum, step) => sum + step.amount, 0);
  return {
    steps,
    unlocked,
    total,
    completed: steps.filter((step) => step.unlocked).length,
    progress: total > 0 ? Math.round((unlocked / total) * 100) : 0,
  };
}

function CampaignRewardOrbit({ summary }) {
  return (
    <section className="campaign-reward-orbit" aria-label={`${summary.unlocked} of ${summary.total} demo US dollars unlocked`}>
      <div className="campaign-reward-orbit-heading">
        <div><b>Reward climb</b><small>VERIFIED MILESTONES</small></div>
        <span>{summary.completed}/{summary.steps.length} unlocked</span>
      </div>
      <div className="campaign-reward-orbit-body">
        <div className="campaign-reward-ring" style={{ "--reward-angle": `${summary.progress * 3.6}deg` }}>
          <div><small>UNLOCKED</small><strong>${summary.unlocked}</strong><span>of ${summary.total}</span></div>
        </div>
        <div className="campaign-reward-milestones">
          {summary.steps.map((step, index) => (
            <div key={step.code} className={step.unlocked ? "unlocked" : ""}>
              <i>{step.unlocked ? "✓" : index + 1}</i>
              <span><b>{step.label}</b><small>{step.requirement}</small></span>
              <strong>+${step.amount}</strong>
            </div>
          ))}
        </div>
      </div>
      <div className="campaign-reward-flow">Register → UID check → KYC → Deposit → Trade</div>
      <small className="campaign-reward-disclosure">DEMO rewards · Backend verification required · No real payment</small>
    </section>
  );
}

function CampaignStatusBadge({ status }) {
  const key = String(status || "Locked").toLowerCase().replace(/\s+/g, "-");
  return <span className={`campaign-status ${key}`}>{status}</span>;
}

function CampaignTaskCard({ task, uidState, onUidChange, onConsentChange, onUidSubmit, onAction }) {
  const showUidForm = task.code === "uid" && ["Available", "Verifying", "Rejected"].includes(task.status);
  return (
    <article className={`campaign-task-card campaign-task-featured status-${task.statusKey}`}>
      <div className="campaign-quest-ribbon"><span>PRIMARY QUEST</span><i>◆ {task.rewardLabel}</i></div>
      <div className="campaign-task-icon" aria-hidden="true">{task.icon}</div>
      <div className="campaign-task-main">
        <div className="campaign-task-title-row">
          <div><h3>{task.title}</h3><strong>{task.rewardLabel}</strong></div>
          <CampaignStatusBadge status={task.status} />
        </div>
        <p>{task.description}</p>
        <div className="campaign-task-detail"><span aria-hidden="true">→</span>{task.detail}</div>

        {showUidForm && (
          <form className="campaign-uid-form" onSubmit={(event) => { event.preventDefault(); onUidSubmit(); }}>
            <label htmlFor="mock-htx-uid">HTX UID</label>
            <input id="mock-htx-uid" inputMode="numeric" pattern="[0-9]*" maxLength="20"
              value={uidState.value} disabled={task.status === "Verifying"}
              placeholder="Enter your numeric UID"
              onChange={(event) => onUidChange(event.target.value.replace(/\D/g, ""))} />
            <label className="campaign-consent">
              <input type="checkbox" checked={uidState.consent} disabled={task.status === "Verifying"}
                onChange={(event) => onConsentChange(event.target.checked)} />
              <span>Use this UID for mock verification.</span>
            </label>
            <button type="submit" disabled={task.status === "Verifying" || !uidState.consent || uidState.value.length < 5}>
              {task.status === "Verifying" ? "Verifying…" : "Verify UID"}
            </button>
          </form>
        )}

        {task.actionLabel && !showUidForm && (
          <button type="button" className="campaign-task-action" disabled={task.actionDisabled}
            onClick={() => onAction(task.code)}>{task.actionLabel}</button>
        )}
      </div>
    </article>
  );
}

function CampaignTaskRow({ task, expanded, onToggle }) {
  const isDone = CAMPAIGN_DONE_STATUSES.includes(task.status);
  return (
    <button type="button" className={`campaign-task-row status-${task.statusKey} ${expanded ? "expanded" : ""}`}
      aria-expanded={expanded} onClick={onToggle}>
      <span className="campaign-task-row-icon" aria-hidden="true">{isDone ? "✓" : task.icon}</span>
      <span className="campaign-task-row-copy">
        <b>{task.title}</b>
        <small>{expanded ? task.detail : (task.status === "Locked" ? "Complete the previous step" : task.description)}</small>
      </span>
      <span className="campaign-task-row-end">
        <em>{task.rewardLabel}</em>
        <CampaignStatusBadge status={task.status} />
      </span>
    </button>
  );
}

function KolAffinityCard({ kol }) {
  return (
    <aside className="campaign-kol-affinity" style={{ "--kol-accent": kol?.accent || "#18bca6" }}>
      <SukeAvatar size={34} kol={kol?.id || "wanzi"} />
      <div><b>{kol?.name || "Wanzi"} Mission Comms</b><span>Campaign tips, quest guidance and game help.</span></div>
      <small><i /> ONLINE</small>
    </aside>
  );
}

function ReferralCard({ referral, onCopy }) {
  return (
    <article className="campaign-referral-card">
      <div className="campaign-card-heading"><b>Invite friends</b><span>DEMO</span></div>
      <p>Share your campaign link. Qualification and rewards still require backend verification.</p>
      <div className="campaign-referral-link"><code>{referral.link}</code><button type="button" onClick={onCopy}>Copy link</button></div>
      <div className="campaign-referral-stats">
        <span><b>{referral.invited}</b><small>Opened</small></span>
        <span><b>{referral.qualified}</b><small>Qualified</small></span>
        <span><b>{referral.converted ? "Yes" : "No"}</b><small>Traded</small></span>
      </div>
      <small className="campaign-assumption">Demo rewards are assumptions and are not approved.</small>
    </article>
  );
}

function CampaignTasksScreen({ tasks, aipSummary, uidState, onUidChange, onConsentChange, onUidSubmit,
  onTaskAction, gameMissions, onGameMission, onTerms, campaignMeta, kol, referral, onCopyReferral }) {
  const [expandedTask, setExpandedTask] = React.useState(null);
  const activeTask = tasks.find((task) => CAMPAIGN_ACTIONABLE_STATUSES.includes(task.status))
    || tasks.find((task) => task.status === "Verified") || null;
  const otherTasks = tasks.filter((task) => !activeTask || task.code !== activeTask.code);
  const meta = campaignMeta || { day: 1, duration: 15, dailyUsed: 0, dailyLimit: 3 };
  const playEnergy = Math.max(0, meta.dailyLimit - Math.min(meta.dailyUsed, meta.dailyLimit));
  const rewardSummary = campaignRewardSummary(tasks);

  return (
    <section className="campaign-view campaign-tasks-view" aria-label="Tasks">
      <header className="campaign-page-header campaign-utility-header campaign-quest-header campaign-quest-header-compact">
        <div>
          <span className="campaign-kicker"><i /> HTX × AIRVANA</span>
          <h1>HTX Quest</h1>
        </div>
        <div className="campaign-quest-meta" aria-label={`Day ${meta.day} of ${meta.duration}, ${playEnergy} plays left`}>
          <span><small>DAY</small><b>{meta.day}/{meta.duration}</b></span>
          <span><small>PLAYS</small><b>{playEnergy} left</b></span>
        </div>
      </header>

      <CampaignRewardOrbit summary={rewardSummary} />

      <KolAffinityCard kol={kol} />

      <div className="campaign-section-title"><span>{activeTask ? "Active quest" : "Campaign complete"}</span><small>MAIN MISSION</small></div>
      {activeTask ? (
        <CampaignTaskCard task={activeTask} uidState={uidState}
          onUidChange={onUidChange} onConsentChange={onConsentChange}
          onUidSubmit={onUidSubmit} onAction={onTaskAction} />
      ) : (
        <article className="campaign-complete-card"><span aria-hidden="true">✓</span><div><b>All tasks complete</b><p>Your verified rewards appear in Me.</p></div></article>
      )}

      {otherTasks.length > 0 && <div className="campaign-section-title compact"><span>Mission path</span><small>TAP FOR INTEL</small></div>}
      <div className="campaign-task-rows">
        {otherTasks.map((task) => (
          <CampaignTaskRow key={task.code} task={task} expanded={expandedTask === task.code}
            onToggle={() => setExpandedTask((current) => current === task.code ? null : task.code)} />
        ))}
      </div>

      <details className="campaign-expand-section">
        <summary><span><b>Side quests</b><small>Earn demo game points</small></span><i>›</i></summary>
        <div className="campaign-mission-grid">
          {gameMissions.map((mission) => (
            <button type="button" key={mission.id} className={mission.done ? "done" : ""}
              onClick={() => onGameMission(mission.id)}>
              <span>{mission.icon}</span>
              <div><b>{mission.title}</b><small>{mission.done ? "Completed" : mission.description}</small></div>
              <em>{mission.done ? "✓" : mission.reward}</em>
            </button>
          ))}
        </div>
      </details>

      <details className="campaign-expand-section">
        <summary><span><b>Invite friends</b><small>Demo referral activity</small></span><i>›</i></summary>
        <ReferralCard referral={referral} onCopy={onCopyReferral} />
      </details>

      <button type="button" className="campaign-legal-link" onClick={onTerms}>Terms & eligibility</button>
    </section>
  );
}

function AipHistoryRow({ entry }) {
  const sign = entry.amount > 0 ? "+" : "";
  return (
    <li>
      <span className={`campaign-ledger-icon ${entry.entryType}`}>{entry.entryType === "reversal" ? "↩" : "A"}</span>
      <div><b>{entry.label}</b><small>{entry.createdAt} · {entry.status}</small></div>
      <strong className={entry.amount < 0 ? "negative" : ""}>{sign}{entry.amount} AIP</strong>
    </li>
  );
}

function RewardWalletPanel({ walletBinding, redemption, onPreview, onValueChange, onConsentChange, onSubmit, onRequestChange, onStartReverify }) {
  const status = walletBinding.status || "Not linked";
  const canSubmit = walletBinding.consent && walletBinding.valid && status !== "Verifying";
  const rewardMessage = redemption.eligible ? "Ready for reward review" : `Reach ${redemption.threshold} AIP and connect a wallet`;
  const canPreview = redemption.eligible && redemption.status === "Eligible";
  return (
    <div className="campaign-setup-panel">
      <p>{walletBinding.masked || "Add an EVM address for future reward eligibility checks."}</p>
      {!walletBinding.masked && (
        <form className="campaign-uid-form" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
          <label htmlFor="mock-reward-wallet">EVM address</label>
          <input id="mock-reward-wallet" value={walletBinding.value} placeholder="0x…"
            onChange={(event) => onValueChange(event.target.value.trim())} />
          <label className="campaign-consent"><input type="checkbox" checked={walletBinding.consent}
            onChange={(event) => onConsentChange(event.target.checked)} /><span>This is my mock reward address.</span></label>
          <button type="submit" disabled={!canSubmit}>{status === "Verifying" ? "Verifying…" : "Verify address"}</button>
        </form>
      )}
      {walletBinding.masked && <button type="button" className="campaign-secondary-action" disabled={walletBinding.changeRequested}
        onClick={walletBinding.changeRequested ? onStartReverify : onRequestChange}>
        {walletBinding.changeRequested ? "Start reverification" : "Request change"}
      </button>}
      <div className="campaign-wallet-eligibility">
        <span><b>Rewards</b><small>{rewardMessage}</small></span>
        <CampaignStatusBadge status={redemption.status} />
        {canPreview && <button type="button" onClick={onPreview}>Review</button>}
      </div>
    </div>
  );
}

function RedemptionCard({ redemption, onPreview }) {
  const nextRequirement = redemption.eligible ? "Ready for review" : `Reach ${redemption.threshold} AIP and verify a reward wallet`;
  const canPreview = redemption.eligible && redemption.status === "Eligible";
  return (
    <article className="campaign-redemption-card">
      <div className="campaign-card-heading"><div><span className="brand-mark reward">A</span><b>Rewards</b></div><CampaignStatusBadge status={redemption.status} /></div>
      <p>{nextRequirement}</p>
      {canPreview && <button type="button" onClick={onPreview}>Review redemption</button>}
      <small className="campaign-assumption">Mock preview only. No real transfer occurs.</small>
    </article>
  );
}

function SetupRow({ icon, title, description, status, expanded, onClick }) {
  return (
    <button type="button" className={`campaign-setup-row ${expanded ? "expanded" : ""}`} aria-expanded={expanded} onClick={onClick}>
      <span className="brand-mark">{icon}</span>
      <span><b>{title}</b><small>{description}</small></span>
      <CampaignStatusBadge status={status} />
      <i aria-hidden="true">›</i>
    </button>
  );
}

function CampaignMeScreen({ kol, aipSummary, ledger, maskedUid, htxStatus, taskHistory,
  walletInventory, walletTotal, balance, lifetime, changeRequested, onRequestChange, onStartUidReverify,
  walletBinding, onWalletValueChange, onWalletConsentChange, onWalletSubmit, onWalletRequestChange, onWalletStartReverify,
  redemption, onPreviewRedemption, onSupport, onTerms }) {
  const [openSetup, setOpenSetup] = React.useState(null);
  const [showAllInventory, setShowAllInventory] = React.useState(false);
  const inventory = Object.entries(walletInventory).sort((a, b) => b[1] - a[1]);
  const registrationTask = taskHistory.find((task) => task.code === "registration");
  const registrationStatus = registrationTask?.status === "Available"
    ? "Not started"
    : (registrationTask?.status || "Not started");
  const toggleSetup = (key) => setOpenSetup((current) => current === key ? null : key);
  const playerLevel = Math.max(1, Math.floor(lifetime / 600) + 1);
  const levelXp = lifetime % 600;
  const levelProgress = Math.round((levelXp / 600) * 100);
  const identityVerified = ["Verified", "Rewarded"].includes(registrationStatus)
    && ["Verified", "Rewarded"].includes(htxStatus);
  const walletDescription = walletBinding.masked
    || (redemption.eligible ? "Connect to unlock rewards" : `${redemption.threshold} AIP + wallet required`);
  const activityCount = ledger.length + taskHistory.length;

  return (
    <section className="campaign-view campaign-me-view" aria-label="Me">
      <header className="campaign-profile-card campaign-player-card">
        <span className="campaign-player-avatar" aria-hidden="true">DP</span>
        <div><h1>Demo Player</h1><p>Local profile · Mock only</p></div>
        <span className="campaign-profile-level"><small>LEVEL</small> Lv.{playerLevel}</span>
        <details className="campaign-profile-aip">
          <summary><small>AVAILABLE AIP</small><b>{aipSummary.available}</b></summary>
          <div className="campaign-profile-aip-details">
            <span><small>Pending</small><b>{aipSummary.pending}</b></span>
            <span><small>Revoked</small><b>{aipSummary.revoked}</b></span>
            <span><small>Lifetime</small><b>{aipSummary.lifetime}</b></span>
          </div>
        </details>
        <div className="campaign-profile-xp"><span>XP</span><i><b style={{ width: `${levelProgress}%` }} /></i><em>{levelXp}/600</em></div>
      </header>

      <div className="campaign-section-title"><span>Account & rewards</span></div>
      <article className="campaign-setup-card">
        {identityVerified ? <React.Fragment>
          <SetupRow icon="H" title="HTX account" description={maskedUid ? `UID ${maskedUid}` : "Account and UID verified"}
            status="Verified" expanded={openSetup === "identity"} onClick={() => toggleSetup("identity")} />
          {openSetup === "identity" && <div className="campaign-setup-panel">
            <p>{registrationTask?.detail || "Campaign registration verified."}</p>
            {maskedUid && <button type="button" className="campaign-secondary-action" disabled={changeRequested}
              onClick={changeRequested ? onStartUidReverify : onRequestChange}>
              {changeRequested ? "Start reverification" : "Request UID change"}
            </button>}
          </div>}
        </React.Fragment> : <React.Fragment>
          <SetupRow icon="H" title="HTX account" description="Campaign registration"
            status={registrationStatus} expanded={openSetup === "htx"} onClick={() => toggleSetup("htx")} />
          {openSetup === "htx" && <div className="campaign-setup-panel"><p>{registrationTask?.detail || "Complete registration from Tasks."}</p></div>}
          <SetupRow icon="#" title="HTX UID" description={maskedUid || "Not added"}
            status={htxStatus} expanded={openSetup === "uid"} onClick={() => toggleSetup("uid")} />
          {openSetup === "uid" && <div className="campaign-setup-panel"><p>{maskedUid ? `Verified UID ${maskedUid}` : "Add and verify your HTX UID from Tasks."}</p></div>}
        </React.Fragment>}

        <SetupRow icon="◇" title="Reward wallet" description={walletDescription}
          status={walletBinding.status || "Not linked"} expanded={openSetup === "wallet"} onClick={() => toggleSetup("wallet")} />
        {openSetup === "wallet" && <RewardWalletPanel walletBinding={walletBinding}
          redemption={redemption} onPreview={onPreviewRedemption}
          onValueChange={onWalletValueChange} onConsentChange={onWalletConsentChange} onSubmit={onWalletSubmit}
          onRequestChange={onWalletRequestChange} onStartReverify={onWalletStartReverify} />}
      </article>

      <article className="campaign-wallet-card">
        <div className="campaign-card-heading"><div><span className="brand-mark game">◈</span><b>Token inventory</b></div>
          <div className="campaign-inventory-summary"><span>{walletTotal} tokens · {balance} pts</span>
            {inventory.length > 4 && <button type="button" onClick={() => setShowAllInventory((value) => !value)}>{showAllInventory ? "Show less" : "View all"}</button>}
          </div>
        </div>
        <div className={`campaign-inventory-row ${showAllInventory ? "expanded" : ""}`}>
          {inventory.length === 0 && <small>Catch tokens in Play to build your wallet.</small>}
          {(showAllInventory ? inventory : inventory.slice(0, 4)).map(([symbol, count]) => <span key={symbol}><b>{symbol}</b><em>×{count}</em></span>)}
        </div>
      </article>

      <details className="campaign-history-card campaign-expand-section campaign-activity-card">
        <summary><span><b>Activity</b><small>{activityCount} entries</small></span><i>View all ›</i></summary>
        {ledger.length === 0 ? <p>No AIP entries yet.</p> : <ul>{ledger.slice().reverse().map((entry) => <AipHistoryRow key={entry.id} entry={entry} />)}</ul>}
        <ul>{taskHistory.map((task) => (
          <li key={task.code}><span className="campaign-ledger-icon task">✓</span><div><b>{task.title}</b><small>{task.detail}</small></div><CampaignStatusBadge status={task.status} /></li>
        ))}</ul>
      </details>

      <div className="campaign-footer-links">
        <button type="button" onClick={onSupport}>Help & support</button>
        <button type="button" onClick={onTerms}>Privacy & terms</button>
      </div>
    </section>
  );
}

function AppNavIcon({ id }) {
  if (id === "tasks") return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="3" width="16" height="18" rx="3" />
      <path d="M8 3.5h8v3H8z" />
      <path d="m8 12 1.7 1.7L13 10.4M8 17h8" />
    </svg>
  );
  if (id === "play") return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 7h8a5 5 0 0 1 4.8 3.7l1 4.2a3 3 0 0 1-5.1 2.8L15.3 16H8.7l-1.4 1.7a3 3 0 0 1-5.1-2.8l1-4.2A5 5 0 0 1 8 7Z" />
      <path d="M7 10v4M5 12h4M16.5 11h.01M18.5 13h.01" />
    </svg>
  );
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

function AppBottomNav({ activeTab, onChange, tasksBadge, aipAvailable }) {
  const items = [
    { id: "tasks", label: "Tasks", badge: tasksBadge > 0 ? tasksBadge : null },
    { id: "play", label: "Play" },
    { id: "me", label: "Me" },
  ];
  return (
    <nav className="app-bottom-nav" aria-label="Main navigation">
      {items.map((item) => (
        <button key={item.id} type="button" className={activeTab === item.id ? "active" : ""}
          aria-current={activeTab === item.id ? "page" : undefined} onClick={() => onChange(item.id)}>
          <span className="app-nav-icon"><AppNavIcon id={item.id} /></span><b>{item.label}</b>
          {item.badge != null && <em>{item.badge > 999 ? "999+" : item.badge}</em>}
        </button>
      ))}
    </nav>
  );
}

Object.assign(window, { CampaignTasksScreen, CampaignMeScreen, AppBottomNav });
