/* global React */
(function () {
const { useState, useRef, useEffect } = React;

/* ---------- KOL 头像：分发到多形象系统（来自 kols.jsx） ---------- */
function SukeAvatar(props) {
  const kol = props.kol || props.look || "suke";
  return window.KolAvatar
    ? <window.KolAvatar kol={kol} size={props.size} talking={props.talking} />
    : <div className="suke-av" style={{ "--av": (props.size||46) + "px" }}><div className="ring"></div><div className="core"></div></div>;
}

/* ---------- 本地模拟互动层 ---------- */
const GREET = {
  wanzi: "Hi! I’m <b>Wanzi</b>, your Campaign Guide. I can explain the HTX Mock journey and the next game step. 🎀",
  suke: "I’m <b>Suke</b>, your Risk Runner. Ask me about shields, demo gas and scam defense. 🛡️",
  doge: "I’m <b>Doge</b>, your Meme Captain. Ask me about combos, teams and referral progress. 🐕",
  neko: "I’m <b>Neko</b>, your Data Sentinel. Ask me about contracts, chains and gas strategy. 📡",
  zeta: "I’m <b>Zeta</b>, your Drop Oracle. Ask me when to use Magnet, Freeze or treasure clues. 🛸",
  ari: "I’m <b>Ari</b>, your Quest Starter. Ask me what to do first and how to keep today’s streak. ⚡",
  noah: "I’m <b>Noah</b>, your Community Host. Ask me about teams, invites and shared progress. 🌊",
  dev: "I’m <b>Dev</b>, your Safety Coach. Ask me about wallet safety, risk clues and shields. 🛡️",
  milo: "I’m <b>Milo</b>, your Growth Navigator. Ask me for the next verified campaign step. 🧭",
  kai: "Hi, I’m <b>Kai</b>, your local Digital Host. Ask me about HTX Demo tasks or the current game mission. 🎙️",
  leo: "I’m <b>Leo</b>, your Market Guide. Ask me about gas choices, token basics and campaign status. 📈",
};
window.GREET = GREET;

// 聊天室视觉主题：参考用户提供的三组碗子角色图，可在 Tweaks 中即时切换。
const CHAT_STYLES = {
  command: {
    label: "Command Hub",
    image: "assets/generated_v3/command-idle.jpg",
    frames: {
      idle: "assets/generated_v3/command-idle.jpg",
      listening: "assets/generated_v3/command-listening.jpg",
      thinking: "assets/generated_v3/command-thinking.jpg",
      "talk-open": "assets/generated_v3/command-talk-open.jpg",
      "talk-closed": "assets/generated_v3/command-talk-closed.jpg",
      emphasis: "assets/generated_v3/command-emphasis.jpg",
    },
    accent: "#46e7ff",
  },
  neon: {
    label: "Neon Night",
    image: "assets/generated_v3/neon-idle.jpg",
    frames: {
      idle: "assets/generated_v3/neon-idle.jpg",
      listening: "assets/generated_v3/neon-listening.jpg",
      thinking: "assets/generated_v3/neon-thinking.jpg",
      "talk-open": "assets/generated_v3/neon-talk-open.jpg",
      "talk-closed": "assets/generated_v3/neon-talk-closed.jpg",
      emphasis: "assets/generated_v3/neon-emphasis.jpg",
    },
    accent: "#7cffbb",
  },
  armor: {
    label: "Fantasy Armor",
    image: "assets/generated_v3/armor-idle.jpg",
    frames: {
      idle: "assets/generated_v3/armor-idle.jpg",
      listening: "assets/generated_v3/armor-listening.jpg",
      thinking: "assets/generated_v3/armor-thinking.jpg",
      "talk-open": "assets/generated_v3/armor-talk-open.jpg",
      "talk-closed": "assets/generated_v3/armor-talk-closed.jpg",
      emphasis: "assets/generated_v3/armor-emphasis.jpg",
    },
    accent: "#f8d77a",
  },
};
window.CHAT_STYLES = CHAT_STYLES;

const FRAME_LABELS = {
  idle: "Idle",
  listening: "Listening",
  thinking: "Thinking",
  "talk-open": "Speaking",
  "talk-closed": "Speaking",
  emphasis: "Emphasis",
};

function plainText(value) {
  const el = document.createElement("div");
  el.innerHTML = String(value || "");
  return el.textContent || el.innerText || "";
}

function mockReply(q, ctx, look) {
  const text = String(q || "").toLowerCase();
  const kol = (window.KOLS && window.KOLS[look]) || { name: "Host", archetype: "Game Guide", recommendedModes: ["live"], expertise: ["game rules"], playTip: "Catch the target token.", safetyTip: "This is a local Mock Demo.", kbStatus: "Seed KB" };
  const balance = Number(ctx && ctx.balance || 0);
  const fanLevel = Number(ctx && ctx.fanLevel || 1);
  const registered = !!(ctx && ctx.tasks && ctx.tasks.register);
  const invited = !!(ctx && ctx.tasks && ctx.tasks.invite);
  const mode = String(ctx && ctx.airdropVersion || "live");
  const recommended = (kol.recommendedModes || ["live"]).join(", ");
  if (/knowledge|knowledge base|kb|what do you know|source/.test(text)) {
    return `<strong>${kol.kbStatus || "Seed KB"}</strong> only: ${(kol.expertise || []).join(", ")}. No live HTX account, external RAG or private user data is connected.`;
  }
  if (/best|recommend|which game|mode|special|expert/.test(text)) {
    return `I’m the <strong>${kol.archetype}</strong>. My recommended modes are <span class='moon'>${recommended}</span>. Current mode: <strong>${mode}</strong>.`;
  }
  if (/htx|exchange|platform/.test(text)) {
    return `This is a <strong>local Mock Demo</strong>. HTX registration, UID, KYC, deposit and trade statuses are simulated until an approved backend is connected.`;
  }
  if (/claim|withdraw|cash|transfer/.test(text)) {
    return `You have <span class='moon'>${balance} demo points</span>. Reach 1,000 pts to preview a claim. No real transfer occurs.`;
  }
  if (/balance|points|score|status/.test(text)) {
    return `Balance: <span class='moon'>${balance} demo pts</span> · Fan Lv.${fanLevel} · Invite: <strong>${invited ? "done" : "open"}</strong>.`;
  }
  if (/task|play|catch|game|rule|how/.test(text)) {
    return `${kol.playTip} Current mode: <strong>${mode}</strong>. Switching Tabs or apps pauses the round and keeps saved campaign progress. 🪂`;
  }
  if (/rare|drop|rate|chance|moon/.test(text)) {
    return `Level up and watch for glowing tokens. Drop rates are simulated and do not represent real odds or returns. 🌙`;
  }
  if (/invite|friend|referral|commission/.test(text)) {
    return `Use this KOL’s attributed Mock link. Qualified invite and conversion bonuses shown in Tweaks are <strong>unapproved assumptions</strong>, not real commission. 👥`;
  }
  if (/hello|hi|who are you|about you/.test(text)) {
    return `I’m <strong>${kol.name}</strong>, the ${kol.archetype}. ${kol.personaLine || "I guide this local demo."}`;
  }
  if (/safe|risk|scam|seed|private|wallet/.test(text)) {
    return `<strong>Safety:</strong> ${kol.safetyTip} This Demo never needs a password, OTP, seed phrase or private key.`;
  }
  return `${kol.name}: ${kol.playTip} Ask about my best mode, Seed KB, HTX tasks or your Demo status. ✨`;
}

function SimulatedLive2DAvatar({ look, name, state, voiceBeat, talkFrame, speechProgress, variant = "portrait" }) {
  const isSpeaking = state === "speaking";
  const studioRigs = {
    wanzi: {
      sprite: "assets/kol-avatars/wanzi-live2d-studio-sprite-v2.png",
      badge: "LIVE2D STUDIO · LOCAL",
      caption: "Natural viseme portrait rig · Local simulation",
      avatarIndex: 13,
    },
    kai: {
      sprite: "assets/kol-avatars/kai-live2d-visemes-v1.png",
      badge: "DIGITAL HUMAN · LOCAL",
      caption: "Presenter viseme rig · Simulated answer",
      fullBody: "assets/kol-avatars/kol-hosts-six-v1.png",
      fullBodyPosition: "80% 0%",
    },
  };
  const studioRig = studioRigs[look];
  const useStudioRig = !!studioRig;
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    if (!useStudioRig) return;
    if (Number.isInteger(studioRig.avatarIndex)) window.setKolAvatarIndex?.(look, studioRig.avatarIndex);
  }, [useStudioRig, look]);
  useEffect(() => {
    if (!useStudioRig || isSpeaking) {
      setBlink(false);
      return undefined;
    }
    let openTimer;
    let closeTimer;
    const scheduleBlink = () => {
      openTimer = window.setTimeout(() => {
        setBlink(true);
        closeTimer = window.setTimeout(() => {
          setBlink(false);
          scheduleBlink();
        }, 130);
      }, 1900 + Math.random() * 2500);
    };
    scheduleBlink();
    return () => {
      window.clearTimeout(openTimer);
      window.clearTimeout(closeTimer);
    };
  }, [useStudioRig, isSpeaking, state]);
  const stateLabel = {
    idle: "Ready",
    listening: "Listening",
    thinking: "Thinking",
    speaking: "Speaking",
  }[state] || "Ready";
  // Insert a relaxed/rest pose between vowel shapes so the mouth never jumps
  // directly from a wide A to a rounded O. A short blink is included in the
  // speaking loop to keep the portrait alive without changing facial identity.
  const speakingFrames = [
    "rest", "mouth-a", "rest", "mouth-e", "rest", "mouth-o",
    "rest", "mouth-a", "rest", "mouth-e", "rest", "mouth-o",
    "blink", "rest",
  ];
  const targetStudioFrame = isSpeaking
    ? speakingFrames[talkFrame % speakingFrames.length]
    : (blink ? "blink" : "idle");
  const [activeStudioFrame, setActiveStudioFrame] = useState("idle");
  const [previousStudioFrame, setPreviousStudioFrame] = useState("idle");
  useEffect(() => {
    if (!useStudioRig || targetStudioFrame === activeStudioFrame) return;
    setPreviousStudioFrame(activeStudioFrame);
    setActiveStudioFrame(targetStudioFrame);
  }, [useStudioRig, targetStudioFrame, activeStudioFrame]);
  const bars = [4, 8, 12, 7, 15, 10, 5, 13, 9, 6, 14, 8];
  if (variant === "full" && studioRig?.fullBody) {
    return (
      <div className={`fullbody-avatar-demo state-${state}`} role="img"
           aria-label={`${name} full-body local digital-human simulation, ${stateLabel}`}>
        <div className="l2d-demo-badge"><i></i>FULL BODY · SAME VOICE RIG</div>
        <div className={`l2d-full-holo-field beat-${voiceBeat % 2}`} aria-hidden="true">
          <div className="l2d-full-orbit orbit-a"></div>
          <div className="l2d-full-orbit orbit-b"></div>
          <div className="l2d-full-figure" style={{
            backgroundImage: `url("${studioRig.fullBody}")`,
            backgroundPosition: studioRig.fullBodyPosition,
          }}>
            <div className="l2d-full-viseme">
              <div aria-hidden="true" style={{ backgroundImage: `url("${studioRig.sprite}")` }} className={`l2d-studio-sprite is-previous frame-${previousStudioFrame}`}></div>
              <div key={activeStudioFrame} style={{ backgroundImage: `url("${studioRig.sprite}")` }} className={`l2d-studio-sprite is-active frame-${activeStudioFrame}`}></div>
            </div>
            <div className="l2d-full-scan"></div>
            <div className="l2d-full-platform"></div>
          </div>
        </div>
        <div className="l2d-state" aria-live="polite"><i></i>{stateLabel}</div>
        <div className="l2d-wave" aria-hidden="true">
          {bars.map((height, index) => <i key={index} style={{ "--bar": `${height}px`, "--delay": `${index * -0.055}s` }}></i>)}
        </div>
        <div className="l2d-progress" aria-hidden="true">
          <i style={{ width: `${Math.max(0, Math.min(100, speechProgress || 0))}%` }}></i>
        </div>
        <span className="l2d-caption">Full-body composition · Same local viseme lifecycle</span>
      </div>
    );
  }
  return (
    <div className={`live2d-avatar-demo state-${state}`} role="img"
         aria-label={`${name} high-fidelity local Live2D simulation, ${stateLabel}`}>
      <div className="l2d-demo-badge"><i></i>{studioRig?.badge || "PORTRAIT · LOCAL"}</div>
      <div className="l2d-holo-field" aria-hidden="true">
        <div className="l2d-orbit orbit-a"></div>
        <div className="l2d-orbit orbit-b"></div>
        <div className={`l2d-portrait beat-${voiceBeat % 2}`}>
          <div className="l2d-portrait-motion">
            {useStudioRig
              ? <div className="l2d-studio-stage">
                  <div aria-hidden="true" style={{ backgroundImage: `url("${studioRig.sprite}")` }} className={`l2d-studio-sprite is-previous frame-${previousStudioFrame}`}></div>
                  <div key={activeStudioFrame} style={{ backgroundImage: `url("${studioRig.sprite}")` }} className={`l2d-studio-sprite is-active frame-${activeStudioFrame}`}></div>
                  <i aria-hidden="true"></i>
                </div>
              : <SukeAvatar size={196} look={look} talking={isSpeaking} />}
          </div>
          <div className="l2d-scan-sweep"></div>
        </div>
      </div>
      <div className="l2d-state" aria-live="polite"><i></i>{stateLabel}</div>
      <div className="l2d-wave" aria-hidden="true">
        {bars.map((height, index) => <i key={index} style={{ "--bar": `${height}px`, "--delay": `${index * -0.055}s` }}></i>)}
      </div>
      <div className="l2d-progress" aria-hidden="true">
        <i style={{ width: `${Math.max(0, Math.min(100, speechProgress || 0))}%` }}></i>
      </div>
      <span className="l2d-caption">{studioRig?.caption || "Local portrait simulation"}</span>
    </div>
  );
}

function AIChat({ open, onClose, look, tone, ctx, onOpenTask, chatStyle = "command", avatarMode = "live2d" }) {
  const G = window.GAME;
  const kol = (window.KOLS && window.KOLS[look]) || { name: "Suke" };
  const chatTheme = CHAT_STYLES[chatStyle] || CHAT_STYLES.command;
  const useStyleArt = look === "wanzi" && !!chatTheme.image;
  const [msgs, setMsgs] = useState([
    { who: "bot", t: (window.GREET && window.GREET[look]) || "Hi! I’m <b>Suke</b> 🦍" },
  ]);
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceError, setVoiceError] = useState("");
  const [talkFrame, setTalkFrame] = useState(0);
  const [voiceBeat, setVoiceBeat] = useState(0);
  const [speechProgress, setSpeechProgress] = useState(0);
  const logRef = useRef(null);
  const histRef = useRef([]);
  const recognitionRef = useRef(null);
  const voiceTextRef = useRef("");
  const speechTimerRef = useRef(null);
  const replyTimerRef = useRef(null);
  const boundarySeenRef = useRef(false);

  // 切换 KOL 时重置对话为该 KOL 专属开场白
  useEffect(() => {
    setMsgs([{ who: "bot", t: (window.GREET && window.GREET[look]) || "Hi! I’m Suke." }]);
    histRef.current = [];
  }, [look]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [msgs, busy]);

  // 说话时在张嘴、闭嘴和强调帧之间循环；聆听/思考使用对应的独立状态帧。
  useEffect(() => {
    if (!speaking) {
      setTalkFrame(0);
      return undefined;
    }
    const timer = window.setInterval(() => {
      setTalkFrame(n => n + 1);
      if (!boundarySeenRef.current) {
        setVoiceBeat(n => n + 1);
        setSpeechProgress(value => Math.min(92, value + 7));
      }
    }, 190);
    return () => window.clearInterval(timer);
  }, [speaking]);

  const frameState = listening
    ? "listening"
    : busy
      ? "thinking"
      : speaking
        ? ["talk-closed", "talk-open", "talk-closed", "talk-open", "emphasis", "talk-open"][talkFrame % 6]
        : "idle";
  const interactionState = listening ? "listening" : busy ? "thinking" : speaking ? "speaking" : "idle";
  const frameEntries = Object.entries(chatTheme.frames || { idle: chatTheme.image });

  useEffect(() => () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) { /* already stopped */ }
    }
    if (speechTimerRef.current) window.clearTimeout(speechTimerRef.current);
    if (replyTimerRef.current) window.clearTimeout(replyTimerRef.current);
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }, []);

  // 主动引导：根据上下文推荐下一个任务
  const guide = (() => {
    if (!ctx.tasks.register) {
      return {
        x: "data:image/png;base64,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",
        b: "Demo account", p: "+150 pts · Fan Lv.+1", id: "register", logo: true,
      };
    }
    if (ctx.balance < 1000) {
      return { x: "👥", b: "Invite demo", p: "+80 pts · Demo boost", id: "invite" };
    }
    return null;
  })();

  function speak(reply) {
    if (!voiceEnabled) return;
    const speechText = plainText(reply);
    const minimumMotionMs = Math.max(1000, Math.min(2600, speechText.length * 32));
    const motionStartedAt = Date.now();
    const finishMotion = (showFallback) => {
      const remaining = Math.max(0, minimumMotionMs - (Date.now() - motionStartedAt));
      if (speechTimerRef.current) window.clearTimeout(speechTimerRef.current);
      if (showFallback) setVoiceError("Voice unavailable · Simulating avatar motion");
      speechTimerRef.current = window.setTimeout(() => {
        setSpeaking(false);
        setSpeechProgress(100);
        if (showFallback) setVoiceError("");
      }, remaining);
    };
    boundarySeenRef.current = false;
    setSpeechProgress(0);
    setVoiceBeat(0);
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      const duration = Math.max(900, Math.min(3600, speechText.length * 72));
      setSpeaking(true);
      setVoiceError("Voice unavailable · Simulating avatar motion");
      if (speechTimerRef.current) window.clearTimeout(speechTimerRef.current);
      speechTimerRef.current = window.setTimeout(() => {
        setSpeaking(false);
        setSpeechProgress(100);
        setVoiceError("");
      }, duration);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(speechText);
    utterance.lang = "en-US";
    const voiceProfile = look === "kai"
      ? { rate: 0.96, pitch: 0.9, names: /Daniel|Alex|Aaron|Arthur|Guy|Ryan|Male/i }
      : { rate: 1.02, pitch: 1.08, names: /Samantha|Ava|Victoria|Female/i };
    utterance.rate = voiceProfile.rate;
    utterance.pitch = voiceProfile.pitch;
    const availableVoices = window.speechSynthesis.getVoices?.() || [];
    const preferredVoice = availableVoices.find(voice => /^en/i.test(voice.lang || "") && voiceProfile.names.test(voice.name || ""))
      || availableVoices.find(voice => /^en/i.test(voice.lang || ""));
    if (preferredVoice) utterance.voice = preferredVoice;
    // Start the visual rig immediately. Some embedded browsers expose the
    // speech API but finish it before an onstart event is delivered.
    setSpeaking(true);
    utterance.onstart = () => {
      setSpeaking(true);
      setSpeechProgress(0);
    };
    utterance.onboundary = event => {
      boundarySeenRef.current = true;
      setVoiceBeat(value => value + 1);
      if (speechText.length > 0) {
        setSpeechProgress(Math.min(98, Math.round((Number(event.charIndex || 0) / speechText.length) * 100)));
      }
    };
    utterance.onend = () => {
      finishMotion(false);
    };
    utterance.onerror = () => {
      finishMotion(true);
    };
    window.speechSynthesis.speak(utterance);
  }

  function ask(q, options) {
    const clean = String(q || "").trim();
    if (!clean || busy || listening) return;
    const opts = options || {};
    setMsgs(m => [...m, { who: "me", t: clean }]);
    setVal("");
    setBusy(true);
    setVoiceError("");
    histRef.current.push({ role: "user", content: clean });
    const reply = mockReply(clean, ctx, look);
    replyTimerRef.current = window.setTimeout(() => {
      replyTimerRef.current = null;
      histRef.current.push({ role: "assistant", content: reply });
      setBusy(false);
      setMsgs(m => [...m, { who: "bot", t: reply }]);
      if (opts.speak !== false) speak(reply);
    }, 520);
  }

  function startListening(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (busy || listening) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError("Voice input is not supported. Please type.");
      return;
    }
    setVoiceError("Listening… release to send");
    voiceTextRef.current = "";
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => setListening(true);
    recognition.onresult = event => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += transcript;
        else interimText += transcript;
      }
      if (finalText.trim()) voiceTextRef.current = finalText.trim();
      setVal((finalText + interimText).trim());
    };
    recognition.onerror = event => {
      setListening(false);
      voiceTextRef.current = "";
      setVoiceError(event.error === "not-allowed" ? "Allow microphone access and try again." : "I did not catch that. Try again.");
    };
    recognition.onend = () => {
      setListening(false);
      const transcript = voiceTextRef.current.trim();
      recognitionRef.current = null;
      if (transcript) ask(transcript, { speak: true });
    };
    recognitionRef.current = recognition;
    try { recognition.start(); } catch (err) {
      recognitionRef.current = null;
      setListening(false);
      setVoiceError("Microphone failed. Please type instead.");
    }
  }

  function stopListening(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (err) { /* already stopped */ }
    }
  }

  function stopVoicePlayback() {
    if (speechTimerRef.current) {
      window.clearTimeout(speechTimerRef.current);
      speechTimerRef.current = null;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setSpeaking(false);
    setSpeechProgress(0);
    boundarySeenRef.current = false;
  }

  function closeChat() {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    if (recognition) {
      recognition.onend = null;
      try { recognition.stop(); } catch (err) { /* already stopped */ }
    }
    if (replyTimerRef.current) {
      window.clearTimeout(replyTimerRef.current);
      replyTimerRef.current = null;
    }
    voiceTextRef.current = "";
    setBusy(false);
    setListening(false);
    setVoiceError("");
    stopVoicePlayback();
    onClose();
  }

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = event => { if (event.key === "Escape") closeChat(); };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <div className={"ai-live" + (open ? " open" : "") + (listening ? " listening" : "")}
         data-look={look} data-chat-style={chatStyle} data-avatar-mode={avatarMode}
         style={{ "--chat-accent": chatTheme.accent }}
         role="dialog" aria-modal="true" aria-label={`${kol.name} chat`}>
      {/* 数字人立绘背景 */}
      <div className="al-stage">
        {avatarMode === "live2d" ? (
          <SimulatedLive2DAvatar look={look} name={kol.name} state={interactionState}
            voiceBeat={voiceBeat} talkFrame={talkFrame} speechProgress={speechProgress} />
        ) : look === "kai" ? (
          <SimulatedLive2DAvatar look={look} name={kol.name} state={interactionState}
            voiceBeat={voiceBeat} talkFrame={talkFrame} speechProgress={speechProgress} variant="full" />
        ) : useStyleArt ? (
          <div className="chat-style-art" data-frame={frameState}>
            {frameEntries.map(([state, src]) => (
              <img key={state} className={"chat-frame" + (state === frameState ? " active" : "")}
                   src={src} alt={state === frameState ? `${kol.name} · ${chatTheme.label} · ${FRAME_LABELS[state] || state}` : ""}
                   aria-hidden={state === frameState ? undefined : "true"} />
            ))}
          </div>
        ) : (window.KolFigure && <window.KolFigure kol={look} talking={busy || speaking} />)}
      </div>
      <div className="al-scrim"></div>

      {/* 顶栏 */}
      <div className="al-top">
        <div className="al-id">
          <SukeAvatar size={34} look={look} talking={busy || speaking} />
          <div className="al-name"><b>{kol.name}</b><span><i className="dot"></i>{kol.archetype || kol.title} · {kol.kbStatus || "Seed KB"}</span></div>
        </div>
        <span className="al-mode">MOCK DEMO</span>
        <span className="al-style-tag">{chatTheme.label}</span>
        <button className="al-close" aria-label="Close chat" onClick={closeChat}>✕</button>
      </div>

      {/* 模拟账户状态 */}
      <div className="al-status">
        <div><b>{ctx.balance}</b><span>Demo pts</span></div>
        <div><b>Lv.{ctx.fanLevel}</b><span>Fan level</span></div>
        <div><b>{ctx.tasks.register ? "Ready" : "Open"}</b><span>Account</span></div>
        <button className={"al-voice-toggle" + (voiceEnabled ? " on" : "")} aria-pressed={voiceEnabled} onClick={() => {
          const next = !voiceEnabled;
          setVoiceEnabled(next);
          if (!next) {
            stopVoicePlayback();
            setVoiceError("");
          }
        }}>{voiceEnabled ? "🔊 Voice" : "🔇 Muted"}</button>
      </div>

      {/* 右侧竖排功能 */}
      <div className="al-rail">
        <button className="al-action" onClick={closeChat}>
          <span className="ai-ic">🪂</span><span>Play</span>
        </button>
        <button className="al-action" onClick={() => { closeChat(); onOpenTask && onOpenTask("invite"); }}>
          <span className="ai-ic">🎁</span><span>Share</span>
        </button>
        {guide &&
          <button className="al-action hot" onClick={() => { closeChat(); onOpenTask(guide.id); }}>
            <span className={"ai-ic" + (guide.logo ? " htx-ic" : "")}>
              {guide.logo ? <img className="htx-action-logo" src={guide.x} alt="HTX" /> : guide.x}
            </span><span>{guide.b.length > 4 ? guide.b.slice(0, 4) : guide.b}</span>
          </button>}
      </div>

      {/* 对话浮层（贴底） */}
      <div className="al-convo" ref={logRef}>
        {msgs.slice(-4).map((m, i) => (
          <div key={i} className={"al-msg " + (m.who === "me" ? "me" : "bot")}>
            {m.who === "bot" && <span className="al-msg-nm">{kol.name}</span>}
            {m.who === "bot" ? <span dangerouslySetInnerHTML={{ __html: m.t }} /> : <span>{m.t}</span>}
          </div>
        ))}
        {busy && <div className="al-msg bot"><span className="al-msg-nm">{kol.name}</span><span className="al-typing"><i></i><i></i><i></i></span></div>}
      </div>

      {/* 快捷问题 */}
      <div className="al-quick">
        {G.QUICK.map((q, i) => (<button key={i} onClick={() => ask(q)}>{q}</button>))}
      </div>

      {/* 底部输入栏 */}
      <div className="al-input">
        <div className="al-field">
          <input value={val} placeholder={`Ask ${kol.name.split(" ")[0]}…`}
                 onChange={e => setVal(e.target.value)}
                 onKeyDown={e => { if (e.key === "Enter") ask(val); }} />
          <button className={"al-voice" + (listening ? " listening" : "")} title="Hold to talk"
                  aria-label="Hold microphone to talk" aria-pressed={listening}
                  onPointerDown={startListening} onPointerUp={stopListening} onPointerCancel={stopListening}
                  onMouseLeave={stopListening}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") startListening(e); }}
                  onKeyUp={e => { if (e.key === "Enter" || e.key === " ") stopListening(e); }}>🎙️</button>
        </div>
        <button className="al-send" aria-label="Send message" disabled={busy || !val.trim()} onClick={() => ask(val)}>
          {val.trim() ? "➤" : "AI"}
        </button>
      </div>
      <div className="al-foot">{voiceError || "Hold to talk · Local demo · No real account"}</div>
    </div>
  );
}

Object.assign(window, { SukeAvatar, AIChat });
})();
