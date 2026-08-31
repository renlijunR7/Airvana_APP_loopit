/* global React */
/* 任务弹层 / 提现弹层 / Toast — 挂到 window */

function Sheet({ open, onClose, children }) {
  return (
    <div className={"sheet-mask" + (open ? " open" : "")} onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  );
}

/* Demo account / 邀请好友任务弹层 */
function TaskSheet({ task, onClose, onComplete }) {
  const [copied, setCopied] = React.useState(false);
  if (!task) return null;
  const s = task.sheet;
  return (
    <Sheet open={!!task} onClose={onClose}>
      <span className="pill">🎁 {s.pill}</span>
      <h3>{s.title}</h3>
      <p className="desc">{s.desc}</p>

      {s.steps && (
        <ul className="steps">
          {s.steps.map(st => (
            <li key={st.n}><span className="n">{st.n}</span>
              <div><b>{st.t}</b><small>{st.s}</small></div></li>
          ))}
        </ul>
      )}

      {s.invite && (
        <div className="invite-box">
          <code>{s.invite}</code>
          <button onClick={() => {
            navigator.clipboard && navigator.clipboard.writeText("HTX MOCK DEMO · " + s.invite);
            setCopied(true); setTimeout(() => setCopied(false), 1600);
          }}>{copied ? "Copied ✓" : "Copy"}</button>
        </div>
      )}

      <button className="btn-primary" onClick={() => onComplete(task)}>{s.cta} →</button>
      <button className="btn-ghost" onClick={onClose}>Not now</button>
    </Sheet>
  );
}

/* 提现弹层 */
function RedeemSheet({ open, balance, threshold, onClose, onConfirm, done }) {
  const ok = balance >= threshold;
  return (
    <Sheet open={open} onClose={onClose}>
      {done ? (
        <div>
          <div className="ticket">
            <div className="ck">✅</div>
            <div className="big">{threshold} pts</div>
            <div className="sub">Demo claim complete · No real transfer</div>
          </div>
          <p className="desc" style={{ textAlign: "center" }}>
            Demo complete! <span className="moon" style={{ color: "var(--gold)" }}>fly to the moon 🚀</span><br />Keep catching tokens.
          </p>
          <button className="btn-primary" onClick={onClose}>Keep playing</button>
        </div>
      ) : (
        <div>
          <span className="pill">💰 Demo goal · {threshold} pts</span>
          <h3>Demo claim</h3>
          <p className="desc">
            {ok
              ? "Goal reached. Preview the claim flow. No account or transfer is used."
              : `${threshold - balance} pts to go. Catch tokens or clear a task.`}
          </p>
          <div className="ticket">
            <div className="big">{balance} <small style={{ fontSize: 14, color: "var(--matcha)" }}>pts</small></div>
            <div className="sub">Demo balance</div>
          </div>
          <button className="btn-primary" disabled={!ok}
            style={!ok ? { filter: "grayscale(.7) brightness(.7)" } : {}}
            onClick={onConfirm}>
            {ok ? "Run demo claim →" : "Keep playing"}
          </button>
          <button className="btn-ghost" onClick={onClose}>Back to game</button>
        </div>
      )}
    </Sheet>
  );
}

Object.assign(window, { Sheet, TaskSheet, RedeemSheet });
