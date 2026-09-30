import { OUTCOMES, PHASES } from './engine.js';

const AVATAR_PATHS = Object.freeze({
  p1: './assets/player-1.webp',
  p2: './assets/player-2.webp',
  p3: './assets/player-3.webp',
  p4: './assets/player-4.webp',
  p5: './assets/player-5.webp',
  p6: './assets/player-6.webp',
});

const PHASE_ORDER = [PHASES.PRE_BET, PHASES.LIVE_BET, PHASES.PLAYING, PHASES.RESULT];

export function avatarFor(playerId) {
  return AVATAR_PATHS[playerId] ?? AVATAR_PATHS.p1;
}

export function formatCredits(value) {
  return Number(value || 0).toLocaleString('zh-CN');
}

function supportCount(state, index) {
  const base = [34, 28, 41, 23, 31, 26][index] ?? 20;
  return base + state.roundId * 3 + Math.min(state.turn, 12);
}

export function updateShell(state) {
  const balance = document.querySelector('#balance-value');
  if (balance) balance.textContent = formatCredits(state.credits);

  const current = PHASE_ORDER.indexOf(state.phase);
  document.querySelectorAll('.phase-track li').forEach((item, index) => {
    item.classList.toggle('active', index === current);
    item.classList.toggle('done', index < current);
    if (index === current) item.setAttribute('aria-current', 'step');
    else item.removeAttribute('aria-current');
  });
}

export function renderLobby(state) {
  const [left, , right] = state.players;
  return `
    <section class="screen-view lobby-view" aria-labelledby="lobby-title">
      <p class="eyebrow">FEATURED MATCH</p>
      <h1 class="screen-title" id="lobby-title">精彩竞猜活动</h1>
      <p class="screen-subtitle">选出你看好的牌桌新星，观看对局，猜中可得 <strong class="odds-highlight">5 倍虚拟星币</strong></p>

      <article class="hero-card">
        <div class="event-header">
          <span class="live-pill">预约中</span>
          <span class="odds-pill">猜中 ×5</span>
        </div>
        <div class="matchup">
          <div class="duelist">
            <img class="duelist-avatar" src="${avatarFor(left.id)}" alt="${left.name}" />
            <strong>${left.name}</strong>
            <small>上局胜率 62%</small>
          </div>
          <div class="versus" aria-hidden="true">
            <strong>VS</strong>
            <small>星桌邀请赛</small>
          </div>
          <div class="duelist">
            <img class="duelist-avatar" src="${avatarFor(right.id)}" alt="${right.name}" />
            <strong>${right.name}</strong>
            <small>人气连胜王</small>
          </div>
        </div>
        <div class="event-metrics">
          <div><small>距离开赛</small><strong>00:00:${String(state.countdown).padStart(2, '0')}</strong></div>
          <div><small>已有观众</small><strong>${128 + state.roundId * 17} 人</strong></div>
        </div>
      </article>

      <button class="primary-button gold hero-cta" type="button" data-action="enter-prediction">
        <span aria-hidden="true">◆</span> 预约竞猜
      </button>

      <div class="section-heading">
        <h2>限时竞猜活动</h2><span>仅演示积分</span>
      </div>
      <div class="event-strip" aria-label="更多活动">
        <article class="mini-event" data-icon="♠"><strong>王牌冲刺夜</strong><small>今晚 20:30 开赛</small></article>
        <article class="mini-event" data-icon="✦"><strong>新星挑战赛</strong><small>明日 12:00 开赛</small></article>
      </div>
      <p class="trust-note">本作品为单机交互演示，星币不可充值、提现或兑换任何现实权益。</p>
    </section>`;
}

export function renderSelection(state) {
  const ticketPlayer = state.ticket
    ? state.players.find((player) => player.id === state.ticket.playerId)
    : null;
  const phaseText = state.phase === PHASES.PRE_BET ? '预约竞猜' : '实时竞猜';
  const locked = Boolean(state.ticket);

  return `
    <section class="screen-view selection-view" aria-labelledby="selection-heading">
      <p class="eyebrow">${phaseText}</p>
      <h1 class="screen-title" id="selection-heading">选择你支持的玩家</h1>
      <p class="screen-subtitle">封盘前可以选择一名选手；确认后本轮不可更换。</p>

      <div class="selection-card">
        <div class="selection-title">
          <div class="countdown-orb" data-live-countdown aria-label="剩余 ${state.countdown} 秒">${state.countdown}</div>
          <h1>${locked ? `已支持 ${ticketPlayer?.name ?? ''}` : '猜对得 5 倍奖励！'}</h1>
          <p>${locked ? '竞猜券已锁定，等待牌局开始' : '人气会随倒计时实时变化'}</p>
        </div>

        <div class="avatar-grid" role="group" aria-label="选择支持玩家">
          ${state.players.map((player, index) => `
            <button class="avatar-option" type="button" data-action="select-player" data-player-id="${player.id}"
              aria-pressed="${state.selectedPlayerId === player.id}" ${locked ? 'disabled' : ''}>
              <img src="${avatarFor(player.id)}" alt="" />
              <strong>${player.name}</strong>
              <small>已有 ${supportCount(state, index)} 人支持</small>
            </button>`).join('')}
        </div>

        <div class="stake-panel">
          <div class="stake-label"><span>选择星币</span><strong>余额 ${formatCredits(state.credits)}</strong></div>
          <div class="stake-options" role="group" aria-label="选择竞猜星币">
            ${state.config.allowedStakes.map((stake) => `
              <button class="stake-button" type="button" data-action="select-stake" data-stake="${stake}"
                aria-pressed="${state.stake === stake}" ${locked ? 'disabled' : ''}>✦ ${formatCredits(stake)}</button>`).join('')}
          </div>
        </div>

        <div class="selection-actions">
          ${locked ? `
            <button class="ghost-button" type="button" data-action="reselect-info">已锁定</button>
            <button class="primary-button gold" type="button" data-action="start-now">立即观战</button>` : `
            <button class="ghost-button" type="button" data-action="back-events">返回</button>
            <button class="primary-button gold" type="button" data-action="place-bet">确认（${formatCredits(state.stake)} 星币）</button>`}
        </div>
      </div>
      <p class="trust-note">竞猜仅使用游戏内演示星币；猜中返还所选星币的 5 倍，未猜中则扣除本次星币。</p>
    </section>`;
}

function renderSpectators(state) {
  return state.players.slice(0, 3).map((player) => (
    `<img class="mini-avatar" src="${avatarFor(player.id)}" alt="" />`
  )).join('');
}

function tableFeed(state) {
  if (state.phase === PHASES.RESULT) {
    const winner = state.players.find((player) => player.id === state.winnerId);
    return `<strong>${winner?.name ?? '本局选手'}</strong> 率先出完手牌，牌局结束。`;
  }
  const active = state.players.find((player) => player.isActive);
  if (active) return `<strong>${active.name}</strong> 打出一张牌，场上节奏正在加快…`;
  return '<strong>系统</strong> 洗牌完成，正在等待首位玩家出牌…';
}

export function renderTable(state) {
  const pool = state.ticket ? state.ticket.stake * 5 : 2_000;
  return `
    <section class="screen-view table-view" aria-labelledby="room-title">
      <header class="room-header">
        <div>
          <h1 id="room-title">星桌 · 六人邀请赛</h1>
          <p>房间 9333 · 第 ${state.roundId} 局 · 观战模式</p>
        </div>
        <div class="spectators" aria-label="${146 + state.turn} 人正在观看">
          ${renderSpectators(state)}<span data-live-spectators>+${146 + state.turn}</span>
        </div>
      </header>

      <div class="game-table" aria-label="六名玩家正在进行自动牌局">
        <div class="table-center" aria-live="polite">
          <span class="round-label">TURN</span>
          <strong class="turn-count" data-live-turn>${String(Math.max(1, state.turn)).padStart(2, '0')}</strong>
          <div class="card-pile" aria-hidden="true">
            <span class="playing-card">♥</span><span class="playing-card">7</span><span class="playing-card">♦</span>
          </div>
          <span class="pot-value">✦ 奖励池 ${formatCredits(pool)}</span>
        </div>

        ${state.players.map((player) => {
          const classes = [
            'player-seat',
            player.isActive ? 'active' : '',
            state.ticket?.playerId === player.id ? 'picked' : '',
            player.isWinner ? 'winner' : '',
          ].filter(Boolean).join(' ');
          return `
            <div class="${classes}" data-player-seat="${player.id}">
              <div class="seat-avatar-wrap">
                <img class="seat-avatar" src="${avatarFor(player.id)}" alt="${player.name}" />
                <span class="hand-badge" data-live-hand aria-label="剩余 ${player.handCount} 张牌">${player.handCount}</span>
              </div>
              <span class="seat-name">${player.name}</span>
              <span class="seat-score">✦ ${formatCredits(6800 + state.players.indexOf(player) * 730)}</span>
            </div>`;
        }).join('')}
      </div>

      <div class="live-feed" data-live-feed aria-live="polite">${tableFeed(state)}</div>
      <div class="ticket-bar">
        <div>
          <span>我的竞猜</span>
          <strong>${state.ticket ? `${state.ticket.playerName} · ${formatCredits(state.ticket.stake)} 星币` : '本轮未参与'}</strong>
        </div>
        <span class="ticket-status">${state.phase === PHASES.RESULT ? '已结算' : '等待结果'}</span>
      </div>
      ${state.phase === PHASES.RESULT ? `
        <div class="post-result-actions" aria-label="结算后操作">
          <button class="ghost-button" type="button" data-action="back-to-events">活动大厅</button>
          <button class="primary-button" type="button" data-action="reopen-result">查看结果</button>
          <button class="primary-button gold" type="button" data-action="next-round">再来一局</button>
        </div>` : `
        <div class="play-controls">
          <p class="auto-play-note"><span aria-hidden="true">●</span> AI 牌局自动进行中</p>
          <button class="ghost-button" type="button" data-action="fast-forward">快速看结果</button>
        </div>`}
    </section>`;
}

export function patchDynamicState(state) {
  updateShell(state);

  const countdown = document.querySelector('[data-live-countdown]');
  if (countdown) {
    countdown.textContent = String(state.countdown);
    countdown.setAttribute('aria-label', `剩余 ${state.countdown} 秒`);
  }

  const turn = document.querySelector('[data-live-turn]');
  if (turn) turn.textContent = String(Math.max(1, state.turn)).padStart(2, '0');

  const spectators = document.querySelector('[data-live-spectators]');
  if (spectators) spectators.textContent = `+${146 + state.turn}`;

  state.players.forEach((player) => {
    const seat = document.querySelector(`[data-player-seat="${player.id}"]`);
    if (!seat) return;
    seat.classList.toggle('active', player.isActive);
    seat.classList.toggle('picked', state.ticket?.playerId === player.id);
    seat.classList.toggle('winner', player.isWinner);
    const hand = seat.querySelector('[data-live-hand]');
    if (hand) {
      hand.textContent = String(player.handCount);
      hand.setAttribute('aria-label', `剩余 ${player.handCount} 张牌`);
    }
  });

  const feed = document.querySelector('[data-live-feed]');
  if (feed) feed.innerHTML = tableFeed(state);
}

function confettiMarkup() {
  const colors = ['#ffcc4a', '#c654e5', '#28d1a0', '#ff6d65', '#4c75ff'];
  return `<div class="confetti" aria-hidden="true">${Array.from({ length: 22 }, (_, index) => (
    `<i style="left:${(index * 37) % 100}%;--delay:-${(index % 7) * 0.23}s;--duration:${1.8 + (index % 5) * 0.19}s;--confetti:${colors[index % colors.length]}"></i>`
  )).join('')}</div>`;
}

export function renderResultModal(state) {
  const result = state.result;
  const won = result?.outcome === OUTCOMES.WIN;
  const winner = state.players.find((player) => player.id === state.winnerId);
  const picked = state.players.find((player) => player.id === result?.guessedPlayerId);
  const leaderboard = [...state.players]
    .sort((a, b) => Number(b.isWinner) - Number(a.isWinner) || a.handCount - b.handCount)
    .slice(0, 3);

  return `
    <section class="result-card" role="dialog" aria-modal="true" aria-labelledby="result-title">
      ${won ? confettiMarkup() : ''}
      <div class="result-stars" aria-hidden="true"><span>★</span><span>${won ? '★' : '☆'}</span><span>★</span></div>
      <div class="result-kicker">ROUND ${String(state.roundId).padStart(2, '0')} · SETTLED</div>
      <h2 id="result-title">${won ? '猜中了' : result?.outcome === OUTCOMES.NO_BET ? '牌局结束' : '差一点'}</h2>
      <div class="reward-value ${won ? '' : 'lost'}">${won ? '+' : ''}${formatCredits(result?.payout ?? 0)}</div>
      <p class="result-summary">${won
        ? `支持 ${picked?.name ?? ''} 命中，5 倍虚拟星币已到账`
        : result?.outcome === OUTCOMES.NO_BET
          ? '本轮没有提交竞猜，余额未发生变化'
          : `你支持了 ${picked?.name ?? ''}，本局冠军是 ${winner?.name ?? ''}`}</p>

      <div class="winner-strip">
        <img class="rank-avatar" src="${avatarFor(winner?.id)}" alt="" />
        <span>本局冠军<strong>${winner?.name ?? '—'} · ${state.turn} 回合</strong></span>
      </div>

      <div class="leaderboard" aria-label="本局排行">
        ${leaderboard.map((player, index) => `
          <div class="leader-row">
            <strong>${index + 1}</strong>
            <img class="rank-avatar" src="${avatarFor(player.id)}" alt="" />
            <span>${player.name}</span>
            <em>${player.isWinner ? '冠军' : `余 ${player.handCount} 张`}</em>
          </div>`).join('')}
      </div>

      <div class="result-actions">
        <button class="ghost-button" type="button" data-action="close-result">回看牌桌</button>
        <button class="primary-button gold" type="button" data-action="next-round">再来一局</button>
      </div>
    </section>`;
}

export function renderHistoryModal(state) {
  const history = [...state.history].reverse();
  return `
    <section class="history-card" role="dialog" aria-modal="true" aria-labelledby="history-title">
      <div class="modal-title-row">
        <h2 id="history-title">竞猜战报</h2>
        <button class="history-close" type="button" data-action="close-modal" aria-label="关闭">✕</button>
      </div>
      <div class="history-list">
        ${history.length ? history.map((item) => {
          const winner = state.players.find((player) => player.id === item.winnerId);
          const picked = state.players.find((player) => player.id === item.guessedPlayerId);
          return `<div class="history-row">
            <div><strong>第 ${item.roundId} 局 · ${item.outcome === OUTCOMES.WIN ? '竞猜命中' : item.outcome === OUTCOMES.LOSE ? '未命中' : '未参与'}</strong>
            <small>支持 ${picked?.name ?? '—'} · 冠军 ${winner?.name ?? '—'}</small></div>
            <em>${item.netChange > 0 ? '+' : ''}${formatCredits(item.netChange)}</em>
          </div>`;
        }).join('') : '<div class="empty-state">完成一局后，这里会生成你的竞猜战报。</div>'}
      </div>
    </section>`;
}

export function renderRulesModal() {
  return `
    <section class="rules-card" role="dialog" aria-modal="true" aria-labelledby="rules-title">
      <div class="modal-title-row">
        <h2 id="rules-title">玩法说明</h2>
        <button class="history-close" type="button" data-action="close-modal" aria-label="关闭">✕</button>
      </div>
      <ol>
        <li>在封盘前选择一名支持的玩家和竞猜星币。</li>
        <li>六名 AI 玩家自动出牌，最先将手牌出完的玩家获胜。</li>
        <li>猜中返还本次竞猜星币的 5 倍；未猜中仅扣本次星币。</li>
        <li>确认后无法更改玩家或星币，每局仅可竞猜一次。</li>
      </ol>
      <p class="demo-warning">这是基于单张宣传图制作的原创单机演示。星币不可购买、提现或兑换；不含真人联机、支付或原产品后台。</p>
      <button class="ghost-button" type="button" data-action="reset-progress">重置本地演示进度</button>
    </section>`;
}
