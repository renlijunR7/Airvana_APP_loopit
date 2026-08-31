/* global React, SukeAvatar, AIChat, TaskSheet, RedeemSheet, GAME,
   useTweaks, TweaksPanel, TweakSection, TweakSlider, TweakRadio, TweakColor,
   TweakToggle, TweakSelect, TweakButton, CampaignTasksScreen, CampaignMeScreen,
   AppBottomNav, AirdropVersionPanel */
const { useState, useRef, useEffect, useCallback } = React;
const G = window.GAME;

const TWEAK_DEFAULTS = {
  airdropVersion: "risk", // 17 selectable airdrop modes
  dropSpeed: 1,
  tokens: "all",          // all | major | meme
  kolId: "kai",           // previous cases + six local Demo KOL hosts
  aiTone: "Hype",
  chatStyle: "command",   // command | neon | armor
  chatAvatarMode: "live2d", // live2d | full
  difficulty: "Normal",   // Easy | Normal | Hard
  bg: "matrix",           // tech | space | aurora | matrix | vault | trading | city | ocean
  mode: "basket",         // tap | basket | combo
  mockRegistration: "not_started",
  mockUid: "empty",
  mockKyc: "locked",
  mockDeposit: "0",
  mockDepositReversed: false,
  mockTrade: "none",
  mockTradeAmount: "100",
  mockAipService: "normal",
  campaignDay: 1,
  dailyPlayLimit: 3,
  distributionChannel: "web",
  mockQualifiedInvites: 0,
  mockReferralConverted: false,
  mockFulfillmentStatus: "auto",
};

const TOKEN_SETS = {
  all:   ["MX","USDT","DOGE","ETH","SOL","BTC","🌙"],
  major: ["MX","USDT","ETH","BTC","🌙"],
  meme:  ["MX","DOGE","SOL","USDT","🌙"],
};
const DIFF = { Easy: { thr: 600, gap: 720 }, Normal: { thr: 1000, gap: 900 }, Hard: { thr: 1500, gap: 1100 } };
const LIVE_TARGETS = ["ETH", "BTC", "MX", "SOL", "USDT"];
const GUARD_HAZARDS = [
  { sym: "⚠", name: "Phishing link", v: 0, cc: "#ff5d6c", cc2: "#791824", tier: "risk", w: 1, isHazard: true },
  { sym: "💣", name: "Risk bomb", v: 0, cc: "#ff8a3d", cc2: "#722306", tier: "risk", w: 1, isHazard: true },
  { sym: "🔑", name: "Seed request", v: 0, cc: "#f03dd0", cc2: "#641158", tier: "risk", w: 1, isHazard: true },
];
const RISK_ITEMS = {
  shield: { sym: "🛡️", name: "Shield", v: 0, cc: "#35e5ff", cc2: "#1265a8", tier: "power", w: 1, isShield: true },
  gas: { sym: "⛽", name: "Demo gas", v: 0, cc: "#ffd166", cc2: "#c77700", tier: "power", w: 1, isGas: true },
  bomb: { sym: "💣", name: "Bomb", v: 0, cc: "#ff5d6c", cc2: "#6f101c", tier: "risk", w: 1, isHazard: true, isBomb: true },
};
const BRIDGE_CHAINS = ["Ethereum", "Base", "BNB Chain", "Polygon"];
const GAS_STRATEGIES = {
  Low: { fee: 2, success: 0.68, speed: 0.72, bonus: 0 },
  Medium: { fee: 5, success: 0.9, speed: 1, bonus: 5 },
  High: { fee: 9, success: 1, speed: 1.35, bonus: 12 },
};

// 钱包只渲染三层可见 Token。达到容量后，最底层最早进入的 Token
// 先被视觉结算，剩余 Token 下沉，新 Token 落到顶部；真实 Demo 库存继续累计。
const WALLET_STACK_COLUMNS = 4;
const WALLET_STACK_LAYERS = 3;
const WALLET_STACK_VISIBLE_CAPACITY = WALLET_STACK_COLUMNS * WALLET_STACK_LAYERS;
const WALLET_STACK_COLUMN_ORDERS = [
  [1, 3, 0, 2],
  [2, 0, 3, 1],
  [0, 2, 1, 3],
];
const WALLET_STACK_COLUMN_X = [14, 38, 62, 86];

const CAMPAIGN_ID = "cmp_htx_kol_lifecycle_v1";
const PLAYABLE_ID = "plb_htx_kol_lifecycle_v1";
const PLAYABLE_CONFIG_VERSION = "1.5.3";
const BUILD_ID = "v41-full-body-viseme-parity";
const CAMPAIGN_DURATION_DAYS = 15;
const PERSIST_KEY = "airvana_htx_kol_lifecycle_v34";
const MOCK_REFERRAL_AIP = 50;
const MOCK_CONVERSION_AIP = 500;
const MOCK_REDEMPTION_THRESHOLD = 500;
const AIP_REWARDS = { registration_uid: 100, kyc: 200, deposit: 100, trade: 2000 };
const AIP_LABELS = {
  registration_uid: "HTX registration + UID",
  kyc: "HTX KYC",
  deposit: "First deposit",
  trade: "First trade",
};

function aipCredit(ledger, code) {
  return ledger.find((entry) => entry.taskCode === code && entry.entryType === "credit");
}

function aipReversal(ledger, code) {
  return ledger.find((entry) => entry.taskCode === code && entry.entryType === "reversal");
}

function hasAvailableAip(ledger, code) {
  const credit = aipCredit(ledger, code);
  return !!credit && credit.status === "available" && !aipReversal(ledger, code);
}

function maskHtxUid(uid) {
  if (!uid) return "";
  if (uid.length <= 4) return `${uid.slice(0, 1)}***${uid.slice(-1)}`;
  return `${uid.slice(0, 2)}${"*".repeat(Math.min(6, uid.length - 4))}${uid.slice(-2)}`;
}

function maskWalletAddress(address) {
  if (!address) return "";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

function readCampaignProgress() {
  try {
    const value = window.localStorage.getItem(PERSIST_KEY);
    return value ? JSON.parse(value) : {};
  } catch (error) {
    return {};
  }
}

function safeRecord(value, fallback) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : fallback;
}

function buildCampaignTasks(t, ledger) {
  const regVerified = t.mockRegistration === "verified";
  const regRewarded = hasAvailableAip(ledger, "registration_uid");
  const kycRewarded = hasAvailableAip(ledger, "kyc");
  const depositCredit = aipCredit(ledger, "deposit");
  const depositRevoked = !!aipReversal(ledger, "deposit");
  const depositRewarded = hasAvailableAip(ledger, "deposit");
  const tradeRewarded = hasAvailableAip(ledger, "trade");
  const pendingDetail = t.mockAipService === "failed" ? "AIP issue failed · use Retry in Tweaks" : "AIP issue pending";
  const rewardedOrPending = (code, readyDetail) => {
    const credit = aipCredit(ledger, code);
    if (hasAvailableAip(ledger, code)) return { status: "Rewarded", detail: readyDetail };
    if (credit?.status === "pending") return { status: "Verified", detail: pendingDetail };
    return { status: "Verified", detail: readyDetail };
  };

  let registration = { status: "Available", detail: "Create your HTX account through this campaign", actionLabel: "Start" };
  if (t.mockRegistration === "attributed") registration = { status: "In progress", detail: "Mock attribution received", actionLabel: "Confirm registration" };
  if (t.mockRegistration === "verified") registration = { status: "Verified", detail: "Registration verified · bind UID next", actionLabel: null };
  if (t.mockRegistration === "rejected") registration = { status: "Rejected", detail: "Registration could not be verified", actionLabel: "Try again" };

  let uid = { status: "Locked", detail: "Complete registration first" };
  if (regVerified) uid = { status: "Available", detail: "Enter a numeric HTX UID" };
  if (t.mockUid === "verifying") uid = { status: "Verifying", detail: "Checking UID with the local mock adapter" };
  if (t.mockUid === "verified") uid = rewardedOrPending("registration_uid", "UID verified · combined reward issued");
  if (["duplicate", "mismatch"].includes(t.mockUid)) uid = { status: "Rejected", detail: t.mockUid === "duplicate" ? "UID is already linked" : "UID does not match the mock account" };

  let kyc = { status: "Locked", detail: "Verify registration and UID first", actionLabel: null };
  if (regRewarded) kyc = { status: "Available", detail: "KYC approval is simulated locally", actionLabel: "Start KYC" };
  if (t.mockKyc === "pending") kyc = { status: "Verifying", detail: "Mock HTX review in progress" };
  if (t.mockKyc === "verified") kyc = rewardedOrPending("kyc", "KYC approved by the mock adapter");
  if (t.mockKyc === "rejected") kyc = { status: "Rejected", detail: "KYC rejected in mock state", actionLabel: regRewarded ? "Try again" : null };
  if (t.mockKyc === "expired") kyc = { status: "Expired", detail: "Mock KYC has expired", actionLabel: regRewarded ? "Restart KYC" : null };

  const depositAmount = Number(t.mockDeposit || 0);
  let deposit = { status: "Locked", detail: "Complete KYC first", actionLabel: null };
  if (kycRewarded) deposit = { status: "Available", detail: "Deposit at least 100 USDT", actionLabel: "Start deposit" };
  if (kycRewarded && depositAmount > 0 && depositAmount < 100) deposit = { status: "In progress", detail: `${depositAmount}/100 USDT credited`, actionLabel: "Add mock deposit" };
  if (depositAmount >= 100 && !depositRevoked) deposit = rewardedOrPending("deposit", `${depositAmount} USDT credited`);
  if (depositRevoked || (depositCredit && t.mockDepositReversed)) deposit = { status: "Revoked", detail: "Deposit was reversed · AIP revoked", actionLabel: null };

  const tradeAmount = Number(t.mockTradeAmount || 0);
  let trade = { status: "Locked", detail: "Complete the deposit task first", actionLabel: null };
  if (depositRewarded) trade = { status: "Available", detail: "Any trade type · minimum 100 USDT", actionLabel: "Start trade" };
  if (t.mockTrade === "pending") trade = { status: "Verifying", detail: "Waiting for mock backend confirmation" };
  if (t.mockTrade === "completed" && tradeAmount < 100) trade = { status: "In progress", detail: `${tradeAmount}/100 USDT trade volume`, actionLabel: depositRewarded ? "Add mock trade volume" : null };
  if (t.mockTrade === "completed" && tradeAmount >= 100) trade = rewardedOrPending("trade", `${tradeAmount} USDT trade confirmed`);
  if (t.mockTrade === "abnormal") trade = { status: "Rejected", detail: "Trade marked abnormal by mock risk control", actionLabel: depositRewarded ? "Retry mock trade" : null };

  return [
    { code: "registration", icon: "H", title: "Register on HTX", description: "Create your HTX account.", rewardLabel: "DEMO +$1 after UID", ...registration },
    { code: "uid", icon: "#", title: "Add HTX UID", description: "Add your UID to verify registration.", rewardLabel: "Verification", ...uid },
    { code: "kyc", icon: "✓", title: "Complete KYC", description: "Verify your account on HTX.", rewardLabel: "Required", ...kyc },
    { code: "deposit", icon: "$", title: "Deposit $100", description: "Deposit at least 100 USDT.", rewardLabel: "DEMO +$30", ...deposit },
    { code: "trade", icon: "↗", title: "Trade $100", description: "Complete at least 100 USDT in trading volume.", rewardLabel: "DEMO +$20", ...trade },
  ].map((task) => ({ ...task, statusKey: task.status.toLowerCase().replace(/\s+/g, "-"), actionDisabled: task.status === "Locked" }));
}

function layoutVisibleWalletTokens(tokens) {
  return tokens.map((token, index) => {
    const layer = Math.floor(index / WALLET_STACK_COLUMNS);
    const positionInLayer = index % WALLET_STACK_COLUMNS;
    const column = WALLET_STACK_COLUMN_ORDERS[layer][positionInLayer];
    return {
      ...token,
      x: WALLET_STACK_COLUMN_X[column] + token.jitterX,
      y: 9 + layer * 13 + token.jitterY,
      layer,
    };
  });
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const initialProgress = useRef(readCampaignProgress()).current;
  const mode = t.mode;
  const airdropVersion = t.airdropVersion || "risk";
  const diff = DIFF[t.difficulty] || DIFF.Normal;

  const [balance, setBalance] = useState(() => Number(initialProgress.balance || 0));
  const [lifetime, setLifetime] = useState(() => Number(initialProgress.lifetime || 0));
  const [tasks, setTasks] = useState(() => safeRecord(initialProgress.tasks, { register: false, invite: false }));
  const [invited, setInvited] = useState(() => Number(initialProgress.invited || 0));
  const [coins, setCoins] = useState([]);
  const [walletStack, setWalletStack] = useState(() => Array.isArray(initialProgress.walletStack) ? initialProgress.walletStack : []);
  const [walletInventory, setWalletInventory] = useState(() => safeRecord(initialProgress.walletInventory, {}));
  const [walletTotal, setWalletTotal] = useState(() => Number(initialProgress.walletTotal || 0));
  const [combo, setCombo] = useState(0);
  const [hail, setHail] = useState(G.HAILS.idle[0]);
  const [hailFlash, setHailFlash] = useState(false);
  const [talking, setTalking] = useState(false);
  const [bubbleHidden, setBubbleHidden] = useState(false);
  const bubbleHiddenRef = useRef(false);
  useEffect(() => { bubbleHiddenRef.current = bubbleHidden; }, [bubbleHidden]);
  const collapseTimer = useRef(null);
  const [, forceTick] = useState(0);
  useEffect(() => { const a = setTimeout(() => forceTick(1), 120), b = setTimeout(() => forceTick(2), 700); return () => { clearTimeout(a); clearTimeout(b); }; }, []);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiBadge, setAiBadge] = useState(true);
  const [sheetTask, setSheetTask] = useState(null);
  const [redeem, setRedeem] = useState(false);
  const [redeemDone, setRedeemDone] = useState(false);
  const [toast, setToast] = useState(null);
  const [entered, setEntered] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [share, setShare] = useState(null); // {kind, value}
  const [pendingWithdraw, setPendingWithdraw] = useState(false);
  const [versionState, setVersionState] = useState(() => window.createAirdropVersionState(airdropVersion));
  const [activeTab, setActiveTab] = useState("play");
  const [pageActive, setPageActive] = useState(() => !document.hidden);
  const [uidInput, setUidInput] = useState(() => String(initialProgress.uidInput || ""));
  const [uidConsent, setUidConsent] = useState(false);
  const [boundUid, setBoundUid] = useState(() => String(initialProgress.boundUid || ""));
  const [aipLedger, setAipLedger] = useState(() => Array.isArray(initialProgress.aipLedger) ? initialProgress.aipLedger : []);
  const [changeRequested, setChangeRequested] = useState(() => !!initialProgress.changeRequested);
  const [walletInput, setWalletInput] = useState(() => String(initialProgress.walletInput || ""));
  const [walletConsent, setWalletConsent] = useState(false);
  const [boundWallet, setBoundWallet] = useState(() => String(initialProgress.boundWallet || ""));
  const [walletBindingStatus, setWalletBindingStatus] = useState(() => String(initialProgress.walletBindingStatus || "Not linked"));
  const [walletChangeRequested, setWalletChangeRequested] = useState(() => !!initialProgress.walletChangeRequested);
  const [dailyPlaysByDay, setDailyPlaysByDay] = useState(() => safeRecord(initialProgress.dailyPlaysByDay, {}));
  const [totalPlayCount, setTotalPlayCount] = useState(() => Number(initialProgress.totalPlayCount || 0));
  const [currentPlayMode, setCurrentPlayMode] = useState("Rewarded");
  const [mockResetArmed, setMockResetArmed] = useState(false);
  const gamePaused = !entered || activeTab !== "play" || !pageActive;

  const stageRef = useRef(null);
  const fieldRef = useRef(null);
  const walletRef = useRef(null);
  const basketRef = useRef(null);
  const idRef = useRef(0);
  const walletTokenIdRef = useRef(0);
  const caughtRef = useRef(new Set());
  const comboTimer = useRef(null);
  const balanceRef = useRef(0);
  const versionStateRef = useRef(versionState);
  const versionBootRef = useRef(true);
  const sessionIdRef = useRef(`mock-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`);
  const issuedEventRef = useRef(new Set());

  useEffect(() => {
    if (initialProgress.mockBackend) setTweak(initialProgress.mockBackend);
  }, []);

  const fanLevel = Math.min(9, 1 + (tasks.register ? 1 : 0) + invited + Math.floor(lifetime / 600));
  const prevLevel = useRef(fanLevel);
  const kol = (window.KOLS && window.KOLS[t.kolId]) || { name: "Suke", catch: "fly to the moon 🚀", title: "Host" };
  const inviteCode = `${String(t.kolId || "airvana").toUpperCase()}-7F3K`;
  const versionConfig = (window.AIRDROP_VERSION_CONFIGS || []).find(item => item.id === airdropVersion) || { name: "Live Drop", description: "" };
  const campaignDay = Math.max(1, Math.min(CAMPAIGN_DURATION_DAYS, Number(t.campaignDay || 1)));
  const dailyPlayLimit = Math.max(1, Number(t.dailyPlayLimit || 3));
  const dailyPlayCount = Number(dailyPlaysByDay[String(campaignDay)] || 0);
  const previewPlayMode = dailyPlayCount < dailyPlayLimit ? "Rewarded" : "Practice";
  const channelId = t.distributionChannel === "telegram" ? "ch_tg_kol" : "ch_web_kol";
  const creativeId = `crv_${t.kolId}_${airdropVersion}_v1`;
  const linkId = `lnk_${t.kolId}_${t.distributionChannel}_001`;
  const referralLink = `https://demo.airvana.local/c/htx15?campaign_id=${CAMPAIGN_ID}&creative_id=${creativeId}&channel_id=${channelId}&kol_id=${t.kolId}&link_id=${linkId}`;
  const walletAddressValid = /^0x[a-fA-F0-9]{40}$/.test(walletInput);
  useEffect(() => { balanceRef.current = balance; }, [balance]);

  useEffect(() => {
    const mockBackend = {
      mockRegistration: t.mockRegistration, mockUid: t.mockUid, mockKyc: t.mockKyc,
      mockDeposit: t.mockDeposit, mockDepositReversed: t.mockDepositReversed,
      mockTrade: t.mockTrade, mockTradeAmount: t.mockTradeAmount, mockAipService: t.mockAipService,
      campaignDay: t.campaignDay, dailyPlayLimit: t.dailyPlayLimit,
      distributionChannel: t.distributionChannel, mockQualifiedInvites: t.mockQualifiedInvites,
      mockReferralConverted: t.mockReferralConverted, mockFulfillmentStatus: t.mockFulfillmentStatus,
      kolId: t.kolId, airdropVersion: t.airdropVersion, bg: t.bg, mode: t.mode,
      tokens: t.tokens, difficulty: t.difficulty, chatStyle: t.chatStyle,
      chatAvatarMode: t.chatAvatarMode, aiTone: t.aiTone,
    };
    try {
      window.localStorage.setItem(PERSIST_KEY, JSON.stringify({
        balance, lifetime, tasks, invited, walletStack, walletInventory, walletTotal,
        uidInput, boundUid, aipLedger, changeRequested, walletInput, boundWallet,
        walletBindingStatus, walletChangeRequested, dailyPlaysByDay, totalPlayCount, mockBackend,
      }));
      document.documentElement.dataset.airvanaPersisted = "true";
    } catch (error) {
      document.documentElement.dataset.airvanaPersisted = "false";
    }
  }, [balance, lifetime, tasks, invited, walletStack, walletInventory, walletTotal,
      uidInput, boundUid, aipLedger, changeRequested, walletInput, boundWallet,
      walletBindingStatus, walletChangeRequested, dailyPlaysByDay, totalPlayCount,
      t.mockRegistration, t.mockUid, t.mockKyc, t.mockDeposit, t.mockDepositReversed,
      t.mockTrade, t.mockTradeAmount, t.mockAipService, t.campaignDay, t.dailyPlayLimit,
      t.distributionChannel, t.mockQualifiedInvites, t.mockReferralConverted, t.mockFulfillmentStatus,
      t.kolId, t.airdropVersion, t.bg, t.mode, t.tokens, t.difficulty,
      t.chatStyle, t.chatAvatarMode, t.aiTone]);

  useEffect(() => {
    const onVisibility = () => setPageActive(!document.hidden);
    const onFocus = () => setPageActive(true);
    const onBlur = () => setPageActive(false);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  // ---------- Toast ----------
  const showToast = useCallback((txt) => {
    setToast({ txt, id: Date.now() });
    setTimeout(() => setToast(t => t && { ...t, hide: true }), 1800);
    setTimeout(() => setToast(null), 2200);
  }, []);

  const emitCampaignEvent = useCallback((name, properties = {}) => {
    const event = {
      name, campaignId: CAMPAIGN_ID, playableId: PLAYABLE_ID, playableConfigVersion: PLAYABLE_CONFIG_VERSION,
      buildId: BUILD_ID, creativeId, channelId, kolId: t.kolId, linkId,
      sessionId: sessionIdRef.current, at: new Date().toISOString(), properties,
    };
    const trace = Array.isArray(window.__AIRVANA_EVENT_TRACE__) ? window.__AIRVANA_EVENT_TRACE__ : [];
    window.__AIRVANA_EVENT_TRACE__ = trace.concat(event).slice(-200);
    document.documentElement.dataset.airvanaEventCount = String(window.__AIRVANA_EVENT_TRACE__.length);
    document.documentElement.dataset.airvanaLastEvent = name;
  }, [creativeId, channelId, linkId, t.kolId]);

  useEffect(() => {
    emitCampaignEvent("campaign_impression", { mode: "MOCK_DEMO", tab: "play" });
  }, [emitCampaignEvent]);

  const patchVersionState = useCallback((mutator) => {
    const current = versionStateRef.current;
    const next = mutator(current);
    versionStateRef.current = next;
    setVersionState(next);
    return next;
  }, []);

  // 切换空投版本时清空场内对象并载入该版本的独立状态。
  useEffect(() => {
    const next = window.createAirdropVersionState(airdropVersion);
    versionStateRef.current = next;
    setVersionState(next);
    setCoins([]);
    caughtRef.current.clear();
    setCombo(0);
    if (versionBootRef.current) {
      versionBootRef.current = false;
    } else {
      setHail(`<span class='moon'>${versionConfig.name}</span> selected. ${versionConfig.description}`);
      setBubbleHidden(false);
      setTalking(true);
      showToast(`Mode: ${versionConfig.name}`);
      setTimeout(() => setTalking(false), 1500);
    }
  }, [airdropVersion, versionConfig.name, versionConfig.description, showToast]);

  // KOL 对战中的对手为本地模拟分数，方便离线展示完整竞争节奏。
  useEffect(() => {
    if (airdropVersion !== "battle" || gamePaused) return undefined;
    const iv = setInterval(() => {
      patchVersionState(state => ({ ...state, rival: state.rival + 3 + Math.floor(Math.random() * 8) }));
    }, 2400);
    return () => clearInterval(iv);
  }, [airdropVersion, patchVersionState, gamePaused]);

  useEffect(() => {
    if (gamePaused || !["magnet", "freeze"].includes(airdropVersion) || !versionState.active) return undefined;
    const timer = setTimeout(() => {
      patchVersionState(current => current.seconds <= 1
        ? { ...current, active: false, seconds: 0 }
        : { ...current, seconds: current.seconds - 1 });
    }, 1000);
    return () => clearTimeout(timer);
  }, [airdropVersion, versionState.active, versionState.seconds, patchVersionState, gamePaused]);

  useEffect(() => {
    if (airdropVersion !== "boss" || gamePaused) return undefined;
    const timer = setInterval(() => {
      patchVersionState(current => {
        if (current.defeated || current.hp <= 1) return current;
        const hit = 6 + Math.floor(Math.random() * 10);
        return { ...current, hp: Math.max(1, current.hp - hit), teamDamage: current.teamDamage + hit };
      });
    }, 2400);
    return () => clearInterval(timer);
  }, [airdropVersion, patchVersionState, gamePaused]);

  // ---------- 喊话 ----------
  // 社交证明消息池（并入气泡轮播）
  const proofPool = useRef([]);
  const nextProof = () => {
    if (proofPool.current.length === 0) proofPool.current = G.proofFeed();
    return "📣 " + proofPool.current.shift();
  };
  const restartCollapse = useCallback(() => {
    clearTimeout(collapseTimer.current);
    collapseTimer.current = setTimeout(() => setBubbleHidden(true), 5000);
  }, []);
  const openAiChat = useCallback(() => {
    if (bubbleHiddenRef.current) {
      setBubbleHidden(false);
      restartCollapse();
    } else {
      setAiOpen(true);
      setAiBadge(false);
    }
  }, [restartCollapse]);
  // pop=true 时弹开气泡（重要事件）；pop=false 仅静默更新文字（常规闲聊）
  const sayHail = useCallback((arr, pop = false) => {
    setHail(G.rand(arr));
    if (pop) {
      setBubbleHidden(false); setHailFlash(true); setTalking(true); restartCollapse();
      setTimeout(() => setHailFlash(false), 500);
      setTimeout(() => setTalking(false), 1400);
    }
  }, [restartCollapse]);
  useEffect(() => {
    if (gamePaused) return undefined;
    const iv = setInterval(() => {
      const r = Math.random();
      if (balanceRef.current >= diff.thr - 200 && balanceRef.current < diff.thr) sayHail(G.HAILS.nearGoal, true);
      else if (r < 0.4) { setHail(nextProof()); }      // 社交证明并入气泡播报（静默更新）
      else if (r < 0.7) sayHail(G.HAILS.taskNudge, false);
      else sayHail(G.HAILS.idle, false);
    }, 4200);
    return () => clearInterval(iv);
  }, [sayHail, diff.thr, gamePaused]);

  // 升级提示
  useEffect(() => {
    if (fanLevel > prevLevel.current) {
      sayHail(G.HAILS.levelup, true);
      showToast(`⬆️ Fan Lv.${fanLevel} · Better demo drops`);
      if (entered && fanLevel >= 3) setTimeout(() => setShare({ kind: "levelup", value: fanLevel }), 900);
    }
    prevLevel.current = fanLevel;
  }, [fanLevel, sayHail, showToast, entered]);

  // 场景切换时苏克专属喊话（弹开气泡）
  const prevBg = useRef(t.bg);
  useEffect(() => {
    if (entered && t.bg !== prevBg.current && G.SCENE_HAILS && G.SCENE_HAILS[t.bg]) {
      setHail(G.SCENE_HAILS[t.bg]);
      setBubbleHidden(false); setHailFlash(true); setTalking(true); restartCollapse();
      setTimeout(() => setHailFlash(false), 500);
      setTimeout(() => setTalking(false), 1600);
    }
    prevBg.current = t.bg;
  }, [t.bg, entered, restartCollapse]);

  // ---------- 生成代币 ----------
  const adaptiveFactor = airdropVersion === "adaptive" ? Math.min(1.55, 0.85 + (versionState.level || 1) * 0.14) : 1;
  const gasAuctionFactor = airdropVersion === "gasauction" ? (GAS_STRATEGIES[versionState.strategy] || GAS_STRATEGIES.Medium).speed : 1;
  const freezeFactor = airdropVersion === "freeze" && versionState.active ? 0.25 : 1;
  const effectiveDropSpeed = t.dropSpeed * adaptiveFactor * gasAuctionFactor * freezeFactor;
  useEffect(() => {
    if (gamePaused) return undefined;
    const pool = G.TOKENS.filter(tk => TOKEN_SETS[t.tokens].includes(tk.sym));
    const gap = diff.gap / effectiveDropSpeed / (1 + (fanLevel - 1) * 0.12);
    const iv = setInterval(() => {
      let tk;
      if (airdropVersion === "risk") {
        const riskRoll = Math.random();
        if (riskRoll < 0.20) tk = RISK_ITEMS.bomb;
        else if (riskRoll < 0.32) tk = RISK_ITEMS.shield;
        else if (riskRoll < 0.47) tk = RISK_ITEMS.gas;
        else tk = pickFrom(pool, fanLevel);
      } else if (airdropVersion === "guard" && Math.random() < 0.34) {
        tk = G.rand(GUARD_HAZARDS);
      } else if (airdropVersion === "live" && Math.random() < 0.48) {
        const target = versionStateRef.current.target;
        tk = pool.find(item => item.sym === target) || pickFrom(pool, fanLevel);
      } else {
        tk = pickFrom(pool, fanLevel);
      }
      const id = ++idRef.current;
      const size = tk.isMoon ? 70 : 48 + Math.round(Math.random() * 16);
      const x = 6 + Math.random() * 76;
      const dur = (tk.isMoon ? 5.5 : 4.2 + Math.random() * 2) / Math.max(0.6, effectiveDropSpeed);
      setCoins(c => (c.length > 18 ? c.slice(c.length - 18) : c).concat({ id, tk, x, size, dur }));
      if (airdropVersion === "risk" && tk.isBomb) setHail("💣 Bomb incoming. Avoid it or use a shield.");
      else if (airdropVersion === "risk" && tk.isShield) setHail("🛡️ Shield drop. Catch it for protection.");
      else if (airdropVersion === "risk" && tk.isGas) setHail("⛽ Demo gas drop. Catch it to keep playing.");
      else if (tk.isHazard) setHail(`🛡️ <span class='moon'>${tk.name}</span> detected. Tap to block.`);
      else if (tk.isMoon) sayHail(G.HAILS.moon, true);
      else if (tk.tier === "epic" && Math.random() < 0.7) sayHail(G.HAILS.rare, true);
    }, gap);
    return () => clearInterval(iv);
  }, [t.tokens, effectiveDropSpeed, diff.gap, fanLevel, sayHail, airdropVersion, gamePaused]);

  function pickFrom(pool, lv) {
    const boost = 1 + (lv - 1) * 0.6;
    const arr = pool.map(tk => ({ tk, w: tk.tier === "common" ? tk.w : tk.w * boost }));
    const total = arr.reduce((s, x) => s + x.w, 0);
    let r = Math.random() * total;
    for (const x of arr) if ((r -= x.w) <= 0) return x.tk;
    return pool[0];
  }

  const removeCoin = useCallback((id) => {
    setCoins(c => c.filter(x => x.id !== id));
    caughtRef.current.delete(id);
  }, []);

  // 每种空投版本都在接币动作上叠加独立规则。
  const evaluateVersionCoin = useCallback((coin) => {
    const state = versionStateRef.current;
    if (airdropVersion === "live") {
      if (coin.tk.sym !== state.target) {
        patchVersionState(current => ({ ...current, mistakes: current.mistakes + 1 }));
        return { accept: false, message: `Catch ${state.target} only · ${coin.tk.sym} skipped` };
      }
      const completed = state.progress + 1 >= state.targetCount;
      patchVersionState(current => completed
        ? { ...current, progress: 0, round: current.round + 1, target: LIVE_TARGETS[current.round % LIVE_TARGETS.length] }
        : { ...current, progress: current.progress + 1 });
      return { accept: true, bonus: completed ? 45 : 0, message: completed ? "Live challenge complete · +45 pts" : `${state.target} caught · ${state.progress + 1}/${state.targetCount}` };
    }
    if (airdropVersion === "quiz" && !state.unlocked) {
      return { accept: false, message: "Answer the quiz first" };
    }
    if (airdropVersion === "route") {
      if (state.step === 0) {
        const nextCount = state.coinCount + 1;
        const done = nextCount >= 3;
        patchVersionState(current => ({ ...current, coinCount: done ? 3 : nextCount, step: done ? 1 : current.step, completed: done ? [0] : current.completed }));
        return { accept: true, bonus: done ? 30 : 0, message: done ? "Quest 1 complete · +30 pts" : `Quest progress ${nextCount}/3` };
      }
      return { accept: true, bonus: 0 };
    }
    if (airdropVersion === "merge") {
      const count = (state.inventory[coin.tk.sym] || 0) + 1;
      const merged = count % 3 === 0;
      const nextMerges = state.merges + (merged ? 1 : 0);
      patchVersionState(current => ({
        ...current,
        inventory: { ...current.inventory, [coin.tk.sym]: count },
        merges: nextMerges,
        rareCreated: current.rareCreated + (merged && nextMerges % 2 === 0 ? 1 : 0),
      }));
      return { accept: true, bonus: merged ? 50 : 0, message: merged ? `${coin.tk.sym} merged · +50 pts` : `${coin.tk.sym} merge ${count % 3}/3` };
    }
    if (airdropVersion === "guard") {
      if (coin.tk.isHazard) {
        patchVersionState(current => ({ ...current, blocked: current.blocked + 1 }));
        return { accept: false, reward: 8, message: `${coin.tk.name} blocked · +8 pts` };
      }
      patchVersionState(current => ({ ...current, safe: current.safe + 1 }));
      return { accept: true, bonus: 0 };
    }
    if (airdropVersion === "risk") {
      if (coin.tk.isShield) {
        const nextShield = Math.min(state.maxShield, state.shield + 1);
        patchVersionState(current => ({ ...current, shield: Math.min(current.maxShield, current.shield + 1) }));
        return { accept: false, message: nextShield > state.shield ? `Shield +1 · ${nextShield}/${state.maxShield}` : "Shield full" };
      }
      if (coin.tk.isGas) {
        patchVersionState(current => ({ ...current, gas: Math.min(30, current.gas + 8) }));
        return { accept: false, message: `Demo gas +8 · ${Math.min(30, state.gas + 8)}` };
      }
      if (coin.tk.isBomb) {
        if (state.shield > 0) {
          patchVersionState(current => ({ ...current, shield: current.shield - 1, bombsBlocked: current.bombsBlocked + 1 }));
          return { accept: false, resetCombo: true, message: `Shield blocked the bomb · ${state.shield - 1} left` };
        }
        patchVersionState(current => ({ ...current, bombsHit: current.bombsHit + 1 }));
        return { accept: false, penalty: 25, resetCombo: true, message: "Bomb hit · -25 demo points" };
      }
      if (state.gas <= 0) return { accept: false, resetCombo: true, message: "Out of demo gas · Catch ⛽" };
      const gasLeft = state.gas - 1;
      patchVersionState(current => ({ ...current, gas: Math.max(0, current.gas - 1), gasSpent: current.gasSpent + 1, safe: current.safe + 1 }));
      return { accept: true, bonus: 0, message: gasLeft <= 3 ? `Low gas · ${gasLeft} left` : `Gas -1 · ${gasLeft} left` };
    }
    if (airdropVersion === "bridge") {
      if (state.selected !== state.target) {
        patchVersionState(current => ({ ...current, wrong: current.wrong + 1, transfers: current.transfers + 1 }));
        return { accept: false, penalty: 20, resetCombo: true, message: `Wrong chain · Select ${state.target} · -20 pts` };
      }
      const targetIndex = BRIDGE_CHAINS.indexOf(state.target);
      const nextTarget = BRIDGE_CHAINS[(targetIndex + 1) % BRIDGE_CHAINS.length];
      patchVersionState(current => ({ ...current, correct: current.correct + 1, transfers: current.transfers + 1, target: nextTarget }));
      return { accept: true, bonus: 20, message: `Bridge confirmed on ${state.target} · +20 pts` };
    }
    if (airdropVersion === "magnet") {
      patchVersionState(current => ({
        ...current,
        captures: current.captures + (current.active ? 1 : 0),
        charge: current.active ? current.charge : Math.min(100, current.charge + 20),
      }));
      return { accept: true, bonus: state.active ? 8 : 0, message: state.active ? "Magnet catch · +8 pts" : `Magnet charge ${Math.min(100, state.charge + 20)}%` };
    }
    if (airdropVersion === "freeze") {
      patchVersionState(current => ({ ...current, catches: current.catches + 1, charge: current.active ? current.charge : Math.min(100, current.charge + 25) }));
      return { accept: true, bonus: state.active ? 10 : 0, message: state.active ? "Frozen catch · +10 pts" : `Freeze charge ${Math.min(100, state.charge + 25)}%` };
    }
    if (airdropVersion === "gasauction") {
      const strategy = GAS_STRATEGIES[state.strategy] || GAS_STRATEGIES.Medium;
      const confirmed = Math.random() < strategy.success;
      patchVersionState(current => ({
        ...current,
        gasSpent: current.gasSpent + strategy.fee,
        confirmations: current.confirmations + (confirmed ? 1 : 0),
        failed: current.failed + (confirmed ? 0 : 1),
      }));
      if (!confirmed) return { accept: false, resetCombo: true, message: `${state.strategy} gas bid expired · Fee ${strategy.fee}` };
      return { accept: true, bonus: strategy.bonus, message: `${state.strategy} gas confirmed · Fee ${strategy.fee}` };
    }
    if (airdropVersion === "boss") {
      if (state.defeated) return { accept: false, message: "Boss defeated · Start the next raid" };
      const damage = Math.max(8, Math.min(65, Math.round(coin.tk.v * 0.7)));
      const nextHp = Math.max(0, state.hp - damage);
      const defeated = nextHp === 0;
      patchVersionState(current => ({ ...current, hp: nextHp, damage: current.damage + damage, hits: current.hits + 1, defeated }));
      return { accept: true, bonus: defeated ? 200 : 0, message: defeated ? "Scam Boss defeated · +200 pts" : `Boss damage ${damage}` };
    }
    if (airdropVersion === "scanner") {
      if (!state.unlocked) return { accept: false, message: "Scan the contract clue first" };
      const caseCount = (window.AIRDROP_VERSION_SCANNER_CASES || []).length || 1;
      patchVersionState(current => ({ ...current, case: (current.case + 1) % caseCount, unlocked: false }));
      return { accept: true, bonus: 20, message: "Scan cleared · Next case · +20 pts" };
    }
    if (airdropVersion === "team") {
      const contribution = Math.max(2, Math.min(10, Math.round(coin.tk.v / 8)));
      const nextProgress = Math.min(state.target, state.progress + contribution);
      const unlocked = !state.chest && nextProgress >= state.target;
      patchVersionState(current => ({ ...current, progress: nextProgress, chest: current.chest || unlocked }));
      return { accept: true, bonus: unlocked ? 120 : 0, message: unlocked ? "Team goal complete · +120 pts" : `Team +${contribution}` };
    }
    if (airdropVersion === "battle") {
      patchVersionState(current => ({ ...current, ours: current.ours + coin.tk.v }));
      return { accept: true, bonus: state.ours < state.rival && coin.tk.tier === "epic" ? 15 : 0, message: "KOL battle score added" };
    }
    if (airdropVersion === "adaptive") {
      const hits = state.hits + 1;
      const level = Math.min(5, 1 + Math.floor(hits / 5));
      const hint = level > state.level
        ? `Strong hit rate. AI speed is now Lv.${level}.`
        : state.hint;
      patchVersionState(current => ({ ...current, hits, level, hint }));
      return { accept: true, bonus: level > state.level ? 35 : 0, message: level > state.level ? `AI Lv.${level} · +35 pts` : "Hit recorded" };
    }
    return { accept: true, bonus: 0 };
  }, [airdropVersion, patchVersionState]);

  const handleCoinMiss = useCallback((coin) => {
    const state = versionStateRef.current;
    if (airdropVersion === "guard" && coin.tk.isHazard) {
      patchVersionState(current => ({ ...current, mistakes: current.mistakes + 1 }));
      showToast(`Risk missed: ${coin.tk.name}`);
    } else if (airdropVersion === "risk" && coin.tk.isBomb) {
      patchVersionState(current => ({ ...current, bombsAvoided: current.bombsAvoided + 1 }));
      showToast("Bomb avoided · Nice move");
    } else if (airdropVersion === "adaptive") {
      const misses = state.misses + 1;
      const total = state.hits + misses;
      const rate = total ? state.hits / total : 1;
      const level = rate < 0.55 ? Math.max(1, state.level - 1) : state.level;
      patchVersionState(current => ({ ...current, misses, level, hint: rate < 0.55 ? "Misses detected. AI slowed the pace." : current.hint }));
    } else if (airdropVersion === "live" && coin.tk.sym === state.target) {
      patchVersionState(current => ({ ...current, mistakes: current.mistakes + 1, progress: Math.max(0, current.progress - 1) }));
    }
    removeCoin(coin.id);
  }, [airdropVersion, patchVersionState, removeCoin, showToast]);

  const addSimulatedReward = useCallback((amount) => {
    setBalance(value => value + amount);
    setLifetime(value => value + amount);
  }, []);

  const addTokenToWallet = useCallback((tk) => {
    if (!tk || tk.v <= 0 || tk.isHazard || tk.isShield || tk.isGas) return;
    const id = ++walletTokenIdRef.current;
    setWalletTotal(total => total + 1);
    setWalletInventory(current => ({ ...current, [tk.sym]: (current[tk.sym] || 0) + 1 }));
    setWalletStack(current => {
      const token = {
        id,
        sym: tk.sym,
        name: tk.name,
        cc: tk.cc,
        cc2: tk.cc2,
        jitterX: -2.5 + Math.random() * 5,
        jitterY: Math.random() * 2,
        rot: -18 + Math.random() * 36,
      };
      // FIFO visual settlement: when full, remove from the bottom first and
      // compact every remaining Token back into a bounded bottom-up pile.
      const retained = current.slice(-(WALLET_STACK_VISIBLE_CAPACITY - 1));
      return layoutVisibleWalletTokens(retained.concat(token));
    });
  }, []);

  const handleVersionAction = useCallback((action, payload = {}) => {
    const state = versionStateRef.current;
    if (action === "quizAnswer") {
      const correct = payload.index === payload.answer;
      patchVersionState(current => ({ ...current, attempts: current.attempts + 1, unlocked: correct, correct: current.correct + (correct ? 1 : 0) }));
      if (correct) { addSimulatedReward(120); showToast("Correct · Chest unlocked · +120 pts"); }
      else showToast("Try again · Check the safety rule");
    } else if (action === "quizNext") {
      patchVersionState(current => ({ ...current, question: (current.question + 1) % window.AIRDROP_VERSION_QUIZZES.length, unlocked: false }));
    } else if (action === "routeAdvance") {
      const nextStep = Math.min(4, state.step + 1);
      patchVersionState(current => ({ ...current, step: nextStep, completed: [...current.completed, current.step] }));
      addSimulatedReward(nextStep >= 4 ? 100 : 40);
      showToast(nextStep >= 4 ? "Quest complete · +100 pts" : `Quest ${nextStep + 1} unlocked · +40 pts`);
    } else if (action === "treasureOpen") {
      if (state.opened.includes(payload.index)) return;
      const found = payload.index === 1 || payload.index === 4;
      patchVersionState(current => ({ ...current, opened: [...current.opened, payload.index], found: current.found + (found ? 1 : 0), fragments: current.fragments + (found ? 1 : 0) }));
      if (found) { addSimulatedReward(88); showToast("Chest found · +88 pts"); }
      else showToast("Empty tile · Keep exploring");
    } else if (action === "teamBoost") {
      const progress = Math.min(state.target, state.progress + 15);
      const unlocked = !state.chest && progress >= state.target;
      patchVersionState(current => ({ ...current, progress, friends: current.friends + 1, chest: current.chest || unlocked }));
      if (unlocked) { addSimulatedReward(120); showToast("Team chest unlocked · +120 pts"); }
      else showToast("Demo teammate added · Team +15");
    } else if (action === "battleBoost") {
      patchVersionState(current => ({ ...current, ours: current.ours + 20 }));
      showToast("KOL boost · +20");
    } else if (action === "bridgeSelect") {
      patchVersionState(current => ({ ...current, selected: payload.chain }));
      showToast(`Bridge set to ${payload.chain}`);
    } else if (action === "magnetActivate") {
      if (state.active || state.charge < 100) return;
      patchVersionState(current => ({ ...current, active: true, seconds: 6, charge: 0 }));
      showToast("Magnet active · 6 seconds");
    } else if (action === "freezeActivate") {
      if (state.active || state.charge < 100) return;
      patchVersionState(current => ({ ...current, active: true, seconds: 4, charge: 0 }));
      showToast("Time freeze active · 4 seconds");
    } else if (action === "gasStrategy") {
      patchVersionState(current => ({ ...current, strategy: payload.strategy }));
      showToast(`${payload.strategy} demo gas selected`);
    } else if (action === "bossBoost") {
      if (state.defeated) return;
      const hit = Math.min(20, Math.max(0, state.hp));
      const nextHp = Math.max(0, state.hp - hit);
      patchVersionState(current => ({ ...current, hp: nextHp, teamDamage: current.teamDamage + hit, defeated: nextHp === 0 }));
      showToast(nextHp === 0 ? "Team defeated the Scam Boss" : "Demo team attack · 20 damage");
    } else if (action === "bossNext") {
      const nextMax = Math.min(900, state.maxHp + 100);
      patchVersionState(current => ({ ...current, hp: nextMax, maxHp: nextMax, damage: 0, teamDamage: 0, hits: 0, defeated: false, round: current.round + 1 }));
      showToast(`Boss Raid · Round ${state.round + 1}`);
    } else if (action === "scannerAnswer") {
      const correct = payload.choice === payload.answer;
      patchVersionState(current => ({ ...current, unlocked: correct, scans: current.scans + 1, correct: current.correct + (correct ? 1 : 0) }));
      if (correct) { addSimulatedReward(80); showToast("Correct risk check · +80 pts"); }
      else showToast("Check the permission and source again");
    } else if (action === "campaignAccount") {
      patchVersionState(current => ({ ...current, account: true }));
      showToast("Demo account step complete · No data sent");
    } else if (action === "campaignEligibility") {
      patchVersionState(current => ({ ...current, eligible: true }));
      showToast("Demo eligibility passed");
    } else if (action === "campaignClaim") {
      const requestId = `MOCK-${Date.now().toString().slice(-6)}`;
      patchVersionState(current => ({ ...current, claimed: true, stock: Math.max(0, current.stock - 1), requestId }));
      addSimulatedReward(300);
      showToast("Demo claim complete · +300 pts · No real reward");
    }
  }, [addSimulatedReward, patchVersionState, showToast]);

  // ---------- 收取 → 飞向钱包 ----------
  const collect = useCallback((coin, fromX, fromY) => {
    if (gamePaused) return;
    if (caughtRef.current.has(coin.id)) return;
    caughtRef.current.add(coin.id);
    const decision = evaluateVersionCoin(coin);
    if (!decision.accept) {
      if (decision.reward) addSimulatedReward(decision.reward);
      if (decision.penalty) setBalance(value => Math.max(0, value - decision.penalty));
      if (decision.resetCombo) setCombo(0);
      if (decision.message) showToast(decision.message);
      removeCoin(coin.id);
      return;
    }
    if (decision.message && (decision.bonus || ["live", "risk", "bridge", "magnet", "freeze", "gasauction", "boss", "scanner"].includes(airdropVersion))) showToast(decision.message);
    addTokenToWallet(coin.tk);
    const stage = stageRef.current, target = mode === "basket" ? basketRef.current : walletRef.current;
    if (!stage || !target) return removeCoin(coin.id);
    const sr = stage.getBoundingClientRect(), tr = target.getBoundingClientRect();

    // combo
    let mult = 1;
    if (mode === "combo") {
      setCombo(c => {
        const n = c + 1; mult = 1 + Math.floor(n / 5);
        return n;
      });
      clearTimeout(comboTimer.current);
      comboTimer.current = setTimeout(() => setCombo(0), 1500);
    }

    const fly = document.createElement("div");
    fly.className = "fly"; fly.textContent = coin.tk.sym;
    fly.style.setProperty("--cc", coin.tk.cc);
    fly.style.setProperty("--cc2", coin.tk.cc2);
    fly.style.left = (fromX - sr.left - 17) + "px";
    fly.style.top = (fromY - sr.top - 17) + "px";
    stage.appendChild(fly);
    const dx = (tr.left + tr.width / 2) - fromX, dy = (tr.top + tr.height / 2) - fromY;
    fly.animate([
      { transform: "translate(0,0) scale(1)", opacity: 1 },
      { transform: `translate(${dx * 0.4}px,${dy * 0.25}px) scale(1.25)`, opacity: 1, offset: .5 },
      { transform: `translate(${dx}px,${dy}px) scale(.25)`, opacity: .3 },
    ], { duration: 600, easing: "cubic-bezier(.4,0,.6,1)" }).onfinish = () => {
      fly.remove();
      const gain = coin.tk.v * (mode === "combo" ? (1 + Math.floor((combo + 1) / 5)) : 1) + (decision.bonus || 0);
      setBalance(b => b + gain);
      setLifetime(l => l + gain);
      if (coin.tk.isMoon) setTimeout(() => setShare({ kind: "moon", value: 188 }), 500);
      // +N pop
      const pop = document.createElement("div");
      pop.className = "pop"; pop.textContent = "+" + gain;
      pop.style.left = (tr.left - sr.left + tr.width / 2 - 14) + "px";
      pop.style.top = (tr.top - sr.top - 6) + "px";
      stage.appendChild(pop);
      setTimeout(() => pop.remove(), 800);
    };
    removeCoin(coin.id);
  }, [mode, combo, removeCoin, evaluateVersionCoin, addSimulatedReward, addTokenToWallet, showToast, airdropVersion, gamePaused]);

  const onCoinTap = (coin, e) => {
    if (mode === "basket" || gamePaused) return;
    const r = e.currentTarget.getBoundingClientRect();
    collect(coin, r.left + r.width / 2, r.top + r.height / 2);
  };

  // ---------- 钱包接币：拖拽 + 碰撞 ----------
  const basketX = useRef(50);
  useEffect(() => {
    if (mode !== "basket" || gamePaused) return undefined;
    let raf;
    const tick = () => {
      const basket = basketRef.current;
      if (basket) {
        const br = basket.getBoundingClientRect();
        document.querySelectorAll(".coin:not(.caught)").forEach(el => {
          const id = +el.dataset.cid;
          const cr = el.getBoundingClientRect();
          if (cr.bottom > br.top + 6 && cr.top < br.bottom &&
              cr.left + cr.width / 2 > br.left && cr.left + cr.width / 2 < br.right) {
            const coin = coinsRef.current.find(c => c.id === id);
            if (coin) { el.classList.add("caught"); collect(coin, cr.left + cr.width / 2, cr.top + cr.height / 2); }
          }
        });
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mode, collect, gamePaused]);

  const coinsRef = useRef([]);
  useEffect(() => { coinsRef.current = coins; }, [coins]);

  useEffect(() => {
    if (gamePaused || airdropVersion !== "magnet" || !versionState.active || coins.length === 0) return undefined;
    const timer = setTimeout(() => {
      document.querySelectorAll(".coin:not(.caught)").forEach(el => {
        const id = +el.dataset.cid;
        const coin = coinsRef.current.find(item => item.id === id);
        if (!coin) return;
        const rect = el.getBoundingClientRect();
        el.classList.add("caught");
        collect(coin, rect.left + rect.width / 2, rect.top + rect.height / 2);
      });
    }, 160);
    return () => clearTimeout(timer);
  }, [airdropVersion, versionState.active, coins, collect, gamePaused]);

  useEffect(() => {
    clearTimeout(comboTimer.current);
    if (!gamePaused && combo > 0) comboTimer.current = setTimeout(() => setCombo(0), 1500);
    return () => clearTimeout(comboTimer.current);
  }, [gamePaused, combo]);

  const moveBasket = (clientX) => {
    if (gamePaused) return;
    const f = fieldRef.current; if (!f) return;
    const fr = f.getBoundingClientRect();
    let pct = ((clientX - fr.left) / fr.width) * 100;
    pct = Math.max(8, Math.min(92, pct));
    basketX.current = pct;
    if (basketRef.current) basketRef.current.style.left = pct + "%";
  };

  // ---------- 任务 ----------
  const openTask = (id) => { setSheetTask(G.TASKS.find(x => x.id === id)); setAiBadge(false); };
  const completeTask = (task) => {
    setSheetTask(null);
    if (task.id === "register") {
      if (!tasks.register) { setTasks(s => ({ ...s, register: true })); setBalance(b => b + task.coins); setLifetime(l => l + task.coins); showToast("🟢 Demo account ready · +150 pts"); }
      // 注册是提现门槛：完成后续接提现流程
      if (pendingWithdraw) { setPendingWithdraw(false); setTimeout(() => { setRedeemDone(false); setRedeem(true); }, 400); }
    } else if (task.id === "invite") {
      setInvited(n => n + 1); setTasks(s => ({ ...s, invite: true }));
      setBalance(b => b + task.coins); setLifetime(l => l + task.coins);
      showToast(`👥 Demo friend added · +80 pts`);
    }
  };

  // 点“提现”：未完成 Demo account 时先弹本地任务，完成后自动续流程。
  const tryWithdraw = () => {
    if (balance < diff.thr) return;
    if (!tasks.register) { setPendingWithdraw(true); openTask("register"); return; }
    setRedeemDone(false); setRedeem(true);
  };

  const doWithdraw = () => {
    if (balance < diff.thr) return;
    setBalance(b => b - diff.thr); setRedeemDone(true);
    showToast("✅ Demo claim complete · No real transfer");
    setTimeout(() => { setRedeem(false); setShare({ kind: "withdraw", value: diff.thr }); }, 1200);
  };

  // ---------- HTX P0 Mock campaign adapter + immutable AIP ledger ----------
  useEffect(() => {
    const serviceStatus = ["normal", "retry"].includes(t.mockAipService) ? "available" : "pending";
    const eligible = {
      registration_uid: t.mockRegistration === "verified" && t.mockUid === "verified",
      kyc: hasAvailableAip(aipLedger, "registration_uid") && t.mockKyc === "verified",
      deposit: hasAvailableAip(aipLedger, "kyc") && Number(t.mockDeposit) >= 100 && !t.mockDepositReversed,
      trade: hasAvailableAip(aipLedger, "deposit") && t.mockTrade === "completed" && Number(t.mockTradeAmount) >= 100,
    };

    setAipLedger((current) => {
      let next = current;
      const ensureCopy = () => { if (next === current) next = current.slice(); };
      Object.entries(eligible).forEach(([code, isEligible]) => {
        if (!isEligible) return;
        const index = next.findIndex((entry) => entry.taskCode === code && entry.entryType === "credit");
        if (index < 0) {
          ensureCopy();
          next.push({
            id: `aip-${code}`,
            taskCode: code,
            label: AIP_LABELS[code],
            amount: AIP_REWARDS[code],
            status: serviceStatus,
            entryType: "credit",
            createdAt: "Mock now",
            idempotencyKey: `${CAMPAIGN_ID}:${sessionIdRef.current}:${code}`,
          });
        } else if (next[index].status === "pending" && serviceStatus === "available") {
          ensureCopy();
          next[index] = { ...next[index], status: "available", createdAt: "Mock verified" };
        }
      });

      const qualifiedInvites = Math.max(0, Math.min(5, Number(t.mockQualifiedInvites || 0)));
      for (let index = 1; index <= qualifiedInvites; index += 1) {
        const taskCode = `referral_${index}`;
        if (!next.some((entry) => entry.taskCode === taskCode && entry.entryType === "credit")) {
          ensureCopy();
          next.push({
            id: `aip-${taskCode}`, taskCode,
            label: `Qualified referral ${index} · Mock assumption`,
            amount: MOCK_REFERRAL_AIP, status: serviceStatus, entryType: "credit", createdAt: "Mock now",
            idempotencyKey: `${CAMPAIGN_ID}:${t.kolId}:${taskCode}:assumption-v1`, assumption: true,
          });
        }
      }

      const conversionEligible = t.mockReferralConverted && t.mockRegistration === "verified"
        && t.mockTrade === "completed" && Number(t.mockTradeAmount) >= 100;
      if (conversionEligible && !next.some((entry) => entry.taskCode === "referral_trade_bonus" && entry.entryType === "credit")) {
        ensureCopy();
        next.push({
          id: "aip-referral-trade-bonus", taskCode: "referral_trade_bonus",
          label: "Registration + trade bonus · Mock assumption",
          amount: MOCK_CONVERSION_AIP, status: serviceStatus, entryType: "credit", createdAt: "Mock now",
          idempotencyKey: `${CAMPAIGN_ID}:${t.kolId}:referral_trade_bonus:assumption-v1`, assumption: true,
        });
      }

      const depositCredit = next.find((entry) => entry.taskCode === "deposit" && entry.entryType === "credit" && entry.status === "available");
      const alreadyReversed = next.some((entry) => entry.taskCode === "deposit" && entry.entryType === "reversal");
      if (t.mockDepositReversed && depositCredit && !alreadyReversed) {
        ensureCopy();
        next.push({
          id: "aip-deposit-reversal",
          taskCode: "deposit",
          label: "Deposit reward reversal",
          amount: -AIP_REWARDS.deposit,
          status: "revoked",
          entryType: "reversal",
          createdAt: "Mock reversal",
          idempotencyKey: `${depositCredit.idempotencyKey}:reversal`,
        });
      }
      return next;
    });
  }, [t.mockRegistration, t.mockUid, t.mockKyc, t.mockDeposit, t.mockDepositReversed,
      t.mockTrade, t.mockTradeAmount, t.mockAipService, t.mockQualifiedInvites,
      t.mockReferralConverted, t.kolId, aipLedger]);

  useEffect(() => {
    aipLedger.forEach((entry) => {
      const key = `${entry.id}:${entry.status}`;
      if (issuedEventRef.current.has(key)) return;
      issuedEventRef.current.add(key);
      emitCampaignEvent(entry.entryType === "reversal" ? "aip_reward_revoked" : `aip_reward_${entry.status}`,
        { taskCode: entry.taskCode, amount: entry.amount, idempotencyKey: entry.idempotencyKey });
    });
  }, [aipLedger, emitCampaignEvent]);

  const aipSummary = aipLedger.reduce((summary, entry) => {
    if (entry.entryType === "credit" && entry.status === "available") {
      summary.available += entry.amount;
      summary.lifetime += entry.amount;
    } else if (entry.entryType === "credit" && entry.status === "pending") {
      summary.pending += entry.amount;
    } else if (entry.entryType === "reversal") {
      summary.available += entry.amount;
      summary.revoked += Math.abs(entry.amount);
    }
    return summary;
  }, { available: 0, pending: 0, revoked: 0, lifetime: 0 });
  aipSummary.available = Math.max(0, aipSummary.available);

  const redemptionStatusMap = {
    review: "Review", fulfilled: "Fulfilled", rejected: "Rejected", reversed: "Reversed",
  };
  const redemptionEligible = aipSummary.available >= MOCK_REDEMPTION_THRESHOLD && !!boundWallet;
  const redemptionStatus = t.mockFulfillmentStatus === "auto"
    ? (redemptionEligible ? "Eligible" : "Not eligible")
    : (redemptionStatusMap[t.mockFulfillmentStatus] || "Not eligible");
  const campaignMeta = {
    day: campaignDay, duration: CAMPAIGN_DURATION_DAYS, dailyUsed: dailyPlayCount,
    dailyLimit: dailyPlayLimit, playMode: entered ? currentPlayMode : previewPlayMode,
    totalPlayCount,
  };
  const referral = {
    link: referralLink, code: inviteCode, invited,
    qualified: Math.max(0, Number(t.mockQualifiedInvites || 0)),
    converted: !!t.mockReferralConverted, rewardPerQualified: MOCK_REFERRAL_AIP,
    conversionBonus: MOCK_CONVERSION_AIP, channel: channelId,
  };

  const campaignTasks = buildCampaignTasks(t, aipLedger);
  const maskedUid = maskHtxUid(boundUid);
  const htxStatus = t.mockUid === "verified" ? "Verified" : t.mockUid === "verifying" ? "Verifying" : "Not linked";
  const taskHistory = campaignTasks.filter((task) => task.status !== "Locked");
  const gameMissions = [
    { id: "register", icon: "◎", title: "Demo account", description: "Complete local setup", reward: "+150 pts", done: tasks.register },
    { id: "invite", icon: "👥", title: "Team mission", description: "Add a demo teammate", reward: "+80 pts", done: tasks.invite },
  ];

  const changeCampaignTab = useCallback((nextTab) => {
    if (nextTab === activeTab) return;
    emitCampaignEvent("tab_view", { from: activeTab, to: nextTab });
    emitCampaignEvent(nextTab === "play" ? "game_resumed" : "game_paused", { reason: "tab_change", tab: nextTab });
    setAiOpen(false);
    setSheetTask(null);
    setRedeem(false);
    setShare(null);
    setActiveTab(nextTab);
  }, [activeTab, emitCampaignEvent]);

  const handleCampaignTaskAction = useCallback((code) => {
    emitCampaignEvent("campaign_task_action", { code });
    if (code === "registration") {
      if (["not_started", "rejected"].includes(t.mockRegistration)) {
        setTweak("mockRegistration", "attributed");
        showToast("Mock HTX attribution received");
      } else if (t.mockRegistration === "attributed") {
        setTweak("mockRegistration", "verified");
        showToast("Mock HTX registration verified");
      }
    } else if (code === "kyc") {
      setTweak("mockKyc", "pending");
      showToast("Mock KYC review started");
      setTimeout(() => setTweak("mockKyc", "verified"), 700);
    } else if (code === "deposit") {
      const nextAmount = Number(t.mockDeposit) >= 50 ? "100" : "50";
      setTweak("mockDeposit", nextAmount);
      showToast(`Mock deposit · ${nextAmount}/100 USDT`);
    } else if (code === "trade") {
      setTweak("mockTrade", "pending");
      showToast("Mock trade verification started");
      setTimeout(() => setTweak({ mockTrade: "completed", mockTradeAmount: "100" }), 700);
    }
  }, [emitCampaignEvent, setTweak, showToast, t.mockRegistration, t.mockDeposit]);

  const submitMockUid = useCallback(() => {
    if (!uidConsent || uidInput.length < 5) return;
    setTweak("mockUid", "verifying");
    emitCampaignEvent("htx_uid_submit", { uidLength: uidInput.length, consent: true });
    showToast("Checking UID with local mock adapter");
    setTimeout(() => {
      setBoundUid(uidInput);
      setTweak("mockUid", "verified");
      showToast("HTX UID verified · mock only");
    }, 650);
  }, [uidConsent, uidInput, emitCampaignEvent, setTweak, showToast]);

  const startUidReverification = useCallback(() => {
    setUidInput(""); setUidConsent(false); setBoundUid(""); setChangeRequested(false);
    setTweak("mockUid", "empty");
    emitCampaignEvent("htx_uid_reverification_started");
    showToast("Enter the corrected HTX UID · previous rewards stay locked");
  }, [setTweak, emitCampaignEvent, showToast]);

  const submitMockWallet = useCallback(() => {
    if (!walletConsent || !walletAddressValid) return;
    setWalletBindingStatus("Verifying");
    emitCampaignEvent("reward_wallet_submitted", { addressLength: walletInput.length, consent: true });
    showToast("Checking Mock wallet format");
    setTimeout(() => {
      setBoundWallet(walletInput); setWalletBindingStatus("Verified"); setWalletChangeRequested(false);
      showToast("Reward wallet verified · Mock only");
    }, 650);
  }, [walletConsent, walletAddressValid, walletInput, emitCampaignEvent, showToast]);

  const startWalletReverification = useCallback(() => {
    setWalletInput(""); setWalletConsent(false); setBoundWallet("");
    setWalletBindingStatus("Not linked"); setWalletChangeRequested(false);
    emitCampaignEvent("reward_wallet_reverification_started");
    showToast("Enter the corrected Mock reward address");
  }, [emitCampaignEvent, showToast]);

  const copyReferralLink = useCallback(() => {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(referralLink).catch(() => {});
    emitCampaignEvent("referral_link_copy", { campaignDay, channelId });
    showToast("KOL Mock link copied");
  }, [referralLink, emitCampaignEvent, campaignDay, channelId, showToast]);

  const resetMockCampaign = useCallback(() => {
    if (!mockResetArmed) {
      setMockResetArmed(true);
      showToast("Press reset again to confirm");
      setTimeout(() => setMockResetArmed(false), 4000);
      return;
    }
    setTweak({
      mockRegistration: "not_started", mockUid: "empty", mockKyc: "locked",
      mockDeposit: "0", mockDepositReversed: false, mockTrade: "none",
      mockTradeAmount: "100", mockAipService: "normal", mockQualifiedInvites: 0,
      mockReferralConverted: false, mockFulfillmentStatus: "auto", campaignDay: 1,
      dailyPlayLimit: 3, distributionChannel: "web", kolId: "wanzi",
      airdropVersion: "risk", bg: "matrix", mode: "basket",
    });
    setBalance(0); setLifetime(0); setTasks({ register: false, invite: false }); setInvited(0);
    setCoins([]); setWalletStack([]); setWalletInventory({}); setWalletTotal(0); setCombo(0);
    setUidInput("");
    setUidConsent(false);
    setBoundUid("");
    setAipLedger([]);
    setChangeRequested(false);
    setWalletInput(""); setWalletConsent(false); setBoundWallet("");
    setWalletBindingStatus("Not linked"); setWalletChangeRequested(false);
    setDailyPlaysByDay({}); setTotalPlayCount(0); setCurrentPlayMode("Rewarded");
    setMockResetArmed(false);
    issuedEventRef.current.clear();
    emitCampaignEvent("mock_campaign_reset");
    showToast("Mock campaign state reset");
  }, [mockResetArmed, setTweak, emitCampaignEvent, showToast]);

  const enterGame = () => {
    if (leaving || entered) return;
    const dayKey = String(campaignDay);
    const nextMode = dailyPlayCount < dailyPlayLimit ? "Rewarded" : "Practice";
    setCurrentPlayMode(nextMode);
    setDailyPlaysByDay((current) => ({ ...current, [dayKey]: Number(current[dayKey] || 0) + 1 }));
    setTotalPlayCount((count) => count + 1);
    emitCampaignEvent("play_start", { campaignDay, dailyPlayIndex: dailyPlayCount + 1, playMode: nextMode });
    setLeaving(true);
    setTimeout(() => {
      setEntered(true);
      if (G.SCENE_HAILS && G.SCENE_HAILS[t.bg]) setHail(G.SCENE_HAILS[t.bg]);
      setBubbleHidden(false); restartCollapse();
    }, 440);
  };

  const pct = Math.min(100, (balance / diff.thr) * 100);
  const walletSummary = Object.entries(walletInventory).map(([sym, count]) => `${sym} ×${count}`).join(" · ") || "Empty demo inventory";

  return (
    <div id="stage" ref={stageRef} data-bg={t.bg} data-airdrop-version={airdropVersion}
      data-active-tab={activeTab} data-game-paused={gamePaused ? "on" : "off"}
      data-time-freeze={airdropVersion === "freeze" && versionState.active ? "on" : "off"}>
      {entered && window.Scene && <window.Scene bg={t.bg} />}
      {!entered && window.Welcome &&
        <window.Welcome look={t.kolId} leaving={leaving} onEnter={enterGame} />}

      {entered && activeTab === "tasks" && (
        <CampaignTasksScreen tasks={campaignTasks} aipSummary={aipSummary}
          uidState={{ value: uidInput, consent: uidConsent }}
          onUidChange={setUidInput} onConsentChange={setUidConsent} onUidSubmit={submitMockUid}
          onTaskAction={handleCampaignTaskAction} gameMissions={gameMissions}
          onGameMission={openTask} campaignMeta={campaignMeta} kol={{ ...kol, id: t.kolId }}
          currentMode={airdropVersion} referral={referral} onCopyReferral={copyReferralLink}
          onTerms={() => showToast("MOCK DEMO · AIP is non-transferable and has no cash value")} />
      )}
      {entered && activeTab === "me" && (
        <CampaignMeScreen kol={{ ...kol, id: t.kolId }} aipSummary={aipSummary} ledger={aipLedger}
          maskedUid={maskedUid} htxStatus={htxStatus} taskHistory={taskHistory}
          walletInventory={walletInventory} walletTotal={walletTotal} balance={balance} lifetime={lifetime}
          changeRequested={changeRequested} onRequestChange={() => { setChangeRequested(true); emitCampaignEvent("htx_uid_change_requested"); showToast("Mock UID change request recorded"); }}
          onStartUidReverify={startUidReverification}
          walletBinding={{ value: walletInput, consent: walletConsent, valid: walletAddressValid,
            masked: maskWalletAddress(boundWallet), status: walletBindingStatus, changeRequested: walletChangeRequested }}
          onWalletValueChange={setWalletInput} onWalletConsentChange={setWalletConsent}
          onWalletSubmit={submitMockWallet}
          onWalletRequestChange={() => { setWalletChangeRequested(true); emitCampaignEvent("reward_wallet_change_requested"); showToast("Mock wallet change request recorded"); }}
          onWalletStartReverify={startWalletReverification}
          redemption={{ status: redemptionStatus, eligible: redemptionEligible, threshold: MOCK_REDEMPTION_THRESHOLD }}
          onPreviewRedemption={() => { setTweak("mockFulfillmentStatus", "review"); emitCampaignEvent("redemption_request", { mock: true, aip: aipSummary.available }); showToast("Mock redemption moved to Review"); }}
          campaignMeta={campaignMeta} attribution={{ kolId: t.kolId, channelId, linkId }}
          onSupport={() => showToast("Demo support · no external request sent")}
          onTerms={() => showToast("Local demo only · no real HTX account, asset or reward")} />
      )}
      {/* ===== HUD ===== */}
      <div className="hud">
        <div className="hud-row">
          <button className="wallet-donut" onClick={tryWithdraw}
            title={balance >= diff.thr ? "Demo claim ready" : "Keep playing"}>
            <svg viewBox="0 0 80 80" className="wd-svg">
              <circle className="wd-track" cx="40" cy="40" r="33" />
              <circle className="wd-fill" cx="40" cy="40" r="33"
                strokeDasharray={2 * Math.PI * 33}
                strokeDashoffset={2 * Math.PI * 33 * (1 - Math.min(1, balance / diff.thr))} />
            </svg>
            <div className="wd-center" ref={walletRef}>
              <b>{balance}</b>
              <span>{Math.min(100, Math.round((balance / diff.thr) * 100))}%</span>
            </div>
          </button>
          <div className="wallet-side">
            <div className="ws-label">Demo wallet</div>
            <div className="ws-goal">Goal · {diff.thr} pts</div>
            <button className="ws-withdraw" disabled={balance < diff.thr} onClick={tryWithdraw}>
              {balance >= diff.thr ? "Claim demo →" : "Keep playing"}
            </button>
          </div>
          <div className="spacer"></div>
        </div>
      </div>

      {/* ===== 游戏场地 ===== */}
      <div className="field" ref={fieldRef}
        onPointerMove={mode === "basket" ? (e) => { if (e.buttons || e.pointerType === "touch") moveBasket(e.clientX); } : undefined}
        onPointerDown={mode === "basket" ? (e) => moveBasket(e.clientX) : undefined}>
        {entered && <AirdropVersionPanel version={airdropVersion} state={versionState}
          onAction={handleVersionAction} kolName={kol.name.split(" ")[0]} />}
        {coins.map(c => (
          <div key={c.id} data-cid={c.id}
            className={"coin " + (c.tk.isHazard ? "hazard " : "") + (c.tk.isShield ? "shield-pickup " : "") + (c.tk.isGas ? "gas-pickup " : "") + (c.tk.isMoon ? "legend" : c.tk.tier === "epic" || c.tk.tier === "rare" ? "rare" : "")}
            style={{ left: c.x + "%", "--sz": c.size + "px", "--cc": c.tk.cc, "--cc2": c.tk.cc2,
                     animationDuration: c.dur + "s" }}
            onAnimationEnd={() => handleCoinMiss(c)}
            onPointerDown={(e) => onCoinTap(c, e)}>
            <div className="chute">{window.Parachute && <window.Parachute cc={c.tk.cc} cc2={c.tk.cc2} />}</div>
            <div className="disc">{window.CoinFace ? <window.CoinFace tk={c.tk} /> : c.tk.sym}</div>
            <div className="tag">{c.tk.name}</div>
          </div>
        ))}

        {mode === "combo" && (
          <div className={"combo" + (combo >= 2 ? " show" : "")}>
            <b>x{1 + Math.floor(combo / 5)}</b><span>COMBO {combo}</span>
          </div>
        )}

        {mode === "basket" && (
          <div className="basket" ref={basketRef} style={{ left: "50%" }} aria-label={`Demo token wallet · ${walletSummary}`} title={walletSummary}>
            <div className={"wallet-stack" + (walletStack.length >= WALLET_STACK_VISIBLE_CAPACITY ? " full" : "")} aria-hidden="true">
              {walletStack.map((token, index) => (
                <span key={token.id} className={"wallet-stack-token" + (index === walletStack.length - 1 ? " newest" : "") + (String(token.sym).length > 2 ? " long" : "")}
                  style={{ left: token.x + "%", bottom: token.y + "px", transform: `translateX(-50%) rotate(${token.rot}deg)`, zIndex: token.layer + 2, "--token-cc": token.cc, "--token-cc2": token.cc2 }}
                  title={token.name}>{token.sym}</span>
              ))}
            </div>
            <div className="lip"></div><div className="face">👛</div>
            {walletTotal > 0 && <span className={"wallet-stack-count" + (walletTotal > WALLET_STACK_VISIBLE_CAPACITY ? " has-overflow" : "")} title={`${walletTotal} demo tokens collected`}>{walletTotal > 99 ? "99+" : walletTotal}</span>}
          </div>
        )}

        {/* AI 浮窗按钮已移至 #stage 顶层（见下方 kol-dock） */}
      </div>

      {/* KOL 浮窗：喊话气泡 + 头像（与钱包同一水平带） */}
      <div className={"kol-dock" + (hailFlash ? " flash" : "") + (bubbleHidden ? " collapsed" : "")}
           onClick={openAiChat}>
        <div className="kol-bubble">
          <div className="kb-top">
            <span className="kb-name">{kol.name}</span>
            <span className="kb-live">LIVE</span>
          </div>
          <div className="kb-tx" dangerouslySetInnerHTML={{ __html: hail }} />
          <div className="kb-tail"></div>
        </div>
        <button type="button" className="kol-orb" aria-label={`Open ${kol.name.split(" ")[0]} chat`}
                onClick={e => { e.stopPropagation(); openAiChat(); }}>
          <SukeAvatar size={62} kol={t.kolId} talking={talking} />
          {aiBadge && <div className="dot">1</div>}
          <div className="kol-cta">{bubbleHidden ? "Open" : "Chat"}</div>
        </button>
      </div>

      {/* ===== 弹层 ===== */}
      <AIChat open={aiOpen} onClose={() => setAiOpen(false)} look={t.kolId} tone={t.aiTone}
        chatStyle={t.chatStyle} avatarMode={t.chatAvatarMode}
        ctx={{ balance, fanLevel, tasks, airdropVersion, campaignDay,
          dailyPlayCount, dailyPlayLimit, referral }} onOpenTask={openTask} />
      <TaskSheet task={sheetTask} onClose={() => setSheetTask(null)} onComplete={completeTask} />
      <RedeemSheet open={redeem} balance={balance} threshold={diff.thr} done={redeemDone}
        onClose={() => setRedeem(false)} onConfirm={doWithdraw} />

      {window.ShareCard &&
        <window.ShareCard open={!!share} kind={share && share.kind} value={share && share.value}
          look={t.kolId} fanLevel={fanLevel} lifetime={lifetime} invite={inviteCode}
          onClose={() => setShare(null)} />}

      {toast && <div className={"toast show" + (toast.hide ? " hide" : "")}>{toast.txt}</div>}

      {entered && <AppBottomNav activeTab={activeTab} onChange={changeCampaignTab}
        tasksBadge={campaignTasks.filter((task) => task.status === "Available").length}
        aipAvailable={aipSummary.available} />}

      {/* ===== Tweaks ===== */}
      <TweaksPanel>
        <TweakSection label="Airdrop mode" />
        <TweakRadio label="Game mode" value={airdropVersion}
          options={window.AIRDROP_VERSION_OPTIONS}
          onChange={v => {
            const nextVersion = (window.AIRDROP_VERSION_CONFIGS || []).find(item => item.id === v);
            setTweak({ airdropVersion: v, bg: nextVersion?.bg || t.bg });
          }} />
        <TweakSection label="Gameplay" />
        <TweakRadio label="Control mode" value={mode}
          options={[{value:"tap",label:"Tap"},{value:"basket",label:"Wallet"},{value:"combo",label:"Combo"}]}
          onChange={v => setTweak("mode", v)} />
        <TweakSlider label="Drop speed" value={t.dropSpeed} min={0.5} max={2} step={0.1} unit="x"
          onChange={v => setTweak("dropSpeed", v)} />
        <TweakRadio label="Difficulty" value={t.difficulty} options={["Easy","Normal","Hard"]}
          onChange={v => setTweak("difficulty", v)} />
        <TweakSection label="Tokens & scene" />
        <TweakRadio label="Token set" value={t.tokens}
          options={[{value:"all",label:"All"},{value:"major",label:"Major"},{value:"meme",label:"Meme"}]}
          onChange={v => setTweak("tokens", v)} />
        <TweakRadio label="Scene override" value={t.bg}
          options={[{value:"space",label:"Space"},{value:"tech",label:"Tech"},{value:"city",label:"Cyber City"},{value:"trading",label:"Battle Floor"},{value:"vault",label:"Vault"},{value:"ocean",label:"Deep Sea"},{value:"aurora",label:"Aurora"},{value:"matrix",label:"Matrix"}]}
          onChange={v => setTweak("bg", v)} />
        <TweakSection label="KOL host" />
        <TweakRadio label="Host" value={t.kolId}
          options={[
            {value:"kai",label:"🎙️ Kai · Digital Host"},
            {value:"ari",label:"⚡ Ari · Quest Starter"},
            {value:"noah",label:"🌊 Noah · Community"},
            {value:"dev",label:"🛡️ Dev · Safety"},
            {value:"milo",label:"🧭 Milo · Navigator"},
            {value:"leo",label:"📈 Leo · Market Guide"},
            {value:"wanzi",label:"🎀 Wanzi · Previous Demo"},
            {value:"suke",label:"🦍 Suke"},
            {value:"doge",label:"🐕 Doge"},
            {value:"neko",label:"🐱 Neko"},
            {value:"zeta",label:"🛸 Zeta"},
          ]}
          onChange={v => setTweak("kolId", v)} />
        <TweakButton label={Number.isInteger(kol.avatarStripIndex) ? "Next new KOL" : "Shuffle avatar"} secondary onClick={() => {
          const featuredKols = ["ari", "noah", "dev", "milo", "kai", "leo"];
          if (Number.isInteger(kol.avatarStripIndex)) {
            const currentIndex = Math.max(0, featuredKols.indexOf(t.kolId));
            const nextKolId = featuredKols[(currentIndex + 1) % featuredKols.length];
            setTweak("kolId", nextKolId);
            showToast(`${window.KOLS?.[nextKolId]?.name || "KOL"} selected`);
            return;
          }
          const result = window.randomizeKolAvatar?.(t.kolId);
          showToast(result ? `Avatar ${result.index + 1} of ${result.total}` : "Avatar pool unavailable");
        }} />
        <TweakButton label={`Use ${kol.name}'s best mode`} secondary onClick={() => {
          const nextMode = (kol.recommendedModes || ["live"])[0];
          const nextVersion = (window.AIRDROP_VERSION_CONFIGS || []).find(item => item.id === nextMode);
          setTweak({ airdropVersion: nextMode, bg: nextVersion?.bg || t.bg });
          showToast(`${kol.name} recommends ${nextVersion?.name || nextMode}`);
        }} />
        <TweakRadio label="AI tone" value={t.aiTone} options={["Hype","Pro","Playful"]}
          onChange={v => setTweak("aiTone", v)} />
        <TweakSection label="Chat visual" />
        <TweakRadio label="Avatar mode" value={t.chatAvatarMode}
          options={[{value:"live2d",label:"Live2D Studio"},{value:"full",label:"Full Body"}]}
          onChange={v => setTweak("chatAvatarMode", v)} />
        <TweakRadio label="Chat style" value={t.chatStyle}
          options={[{value:"command",label:"Command Hub"},{value:"neon",label:"Neon Night"},{value:"armor",label:"Fantasy Armor"}]}
          onChange={v => setTweak("chatStyle", v)} />
        <TweakSection label="15-day campaign · Mock" />
        <TweakSelect label="Campaign day" value={String(campaignDay)}
          options={Array.from({ length: 15 }, (_, index) => ({ value: String(index + 1), label: `Day ${index + 1}` }))}
          onChange={v => setTweak("campaignDay", Number(v))} />
        <TweakRadio label="Rewarded plays/day" value={dailyPlayLimit}
          options={[{value:1,label:"1"},{value:3,label:"3"},{value:5,label:"5"}]}
          onChange={v => setTweak("dailyPlayLimit", Number(v))} />
        <TweakRadio label="Distribution" value={t.distributionChannel}
          options={[{value:"web",label:"H5 Link"},{value:"telegram",label:"TG Wrapper"}]}
          onChange={v => setTweak("distributionChannel", v)} />
        <TweakSection label="Referral · unapproved assumption" />
        <TweakSelect label="Qualified invites" value={String(Number(t.mockQualifiedInvites || 0))}
          options={Array.from({ length: 6 }, (_, index) => ({ value: String(index), label: String(index) }))}
          onChange={v => setTweak("mockQualifiedInvites", Number(v))} />
        <TweakToggle label="Registration + trade" value={t.mockReferralConverted}
          onChange={v => setTweak("mockReferralConverted", v)} />
        <TweakSection label="Fulfillment · Mock" />
        <TweakSelect label="Redemption status" value={t.mockFulfillmentStatus}
          options={[{value:"auto",label:"Auto eligibility"},{value:"review",label:"Review"},{value:"fulfilled",label:"Fulfilled"},{value:"rejected",label:"Rejected"},{value:"reversed",label:"Reversed"}]}
          onChange={v => setTweak("mockFulfillmentStatus", v)} />
        <TweakSection label="Mock HTX backend" />
        <TweakSelect label="Registration" value={t.mockRegistration}
          options={[{value:"not_started",label:"Not started"},{value:"attributed",label:"Attributed"},{value:"verified",label:"Verified"},{value:"rejected",label:"Rejected"}]}
          onChange={v => setTweak("mockRegistration", v)} />
        <TweakSelect label="UID verification" value={t.mockUid}
          options={[{value:"empty",label:"Empty"},{value:"verifying",label:"Verifying"},{value:"verified",label:"Verified"},{value:"duplicate",label:"Duplicate"},{value:"mismatch",label:"Mismatch"}]}
          onChange={v => setTweak("mockUid", v)} />
        <TweakSelect label="KYC" value={t.mockKyc}
          options={[{value:"locked",label:"Locked"},{value:"pending",label:"Pending"},{value:"verified",label:"Verified"},{value:"rejected",label:"Rejected"},{value:"expired",label:"Expired"}]}
          onChange={v => setTweak("mockKyc", v)} />
        <TweakRadio label="Deposit USDT" value={t.mockDeposit}
          options={[{value:"0",label:"0"},{value:"50",label:"50"},{value:"100",label:"100"},{value:"200",label:"200"}]}
          onChange={v => setTweak("mockDeposit", v)} />
        <TweakToggle label="Deposit reversed" value={t.mockDepositReversed}
          onChange={v => setTweak("mockDepositReversed", v)} />
        <TweakSelect label="Trade" value={t.mockTrade}
          options={[{value:"none",label:"None"},{value:"pending",label:"Pending"},{value:"completed",label:"Completed"},{value:"abnormal",label:"Abnormal"}]}
          onChange={v => setTweak("mockTrade", v)} />
        <TweakRadio label="Trade USDT" value={t.mockTradeAmount}
          options={[{value:"50",label:"50"},{value:"100",label:"100"},{value:"200",label:"200"}]}
          onChange={v => setTweak("mockTradeAmount", v)} />
        <TweakSelect label="AIP service" value={t.mockAipService}
          options={[{value:"normal",label:"Normal"},{value:"delayed",label:"Delayed"},{value:"failed",label:"Failed"},{value:"retry",label:"Retry succeeds"}]}
          onChange={v => setTweak("mockAipService", v)} />
        <TweakButton label={mockResetArmed ? "Confirm reset all local data" : "Reset all local demo"}
          secondary={!mockResetArmed} onClick={resetMockCampaign} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
