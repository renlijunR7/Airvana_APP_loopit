const PENTATONIC_NOTES = Object.freeze([
  130.81, 146.83, 164.81, 196.0, 220.0,
  261.63, 293.66, 329.63, 392.0, 440.0,
  523.25, 587.33, 659.25, 783.99, 880.0,
]);

const VOWELS = Object.freeze({
  ah: Object.freeze([
    Object.freeze([730, 3.2, 0.42]),
    Object.freeze([1090, 4.2, 0.25]),
    Object.freeze([2440, 5.4, 0.1]),
  ]),
  oh: Object.freeze([
    Object.freeze([500, 3.4, 0.46]),
    Object.freeze([900, 4.4, 0.24]),
    Object.freeze([2400, 5.6, 0.09]),
  ]),
  oo: Object.freeze([
    Object.freeze([340, 3.1, 0.48]),
    Object.freeze([700, 4.1, 0.22]),
    Object.freeze([2200, 5.2, 0.08]),
  ]),
});

const VOWEL_NAMES = Object.freeze(["ah", "oh", "oo"]);
const PARTIAL_LEVELS = Object.freeze([0.42, 0.22, 0.13, 0.075, 0.04]);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Small, dependency-free choir synth for the 15 Magic Choir characters.
 *
 * The sound is generated in Web Audio from oscillators and filters. It is an
 * original vocal-like approximation, not a recording or recreation of any
 * game's original audio.
 */
export class ChoirAudio {
  constructor() {
    this._ctx = null;
    this._voiceBus = null;
    this._dryGain = null;
    this._wetGain = null;
    this._masterGain = null;
    this._compressor = null;
    this._convolver = null;
    this._reverbBuffer = null;

    this._muted = false;
    this._unavailable = false;
    this._voices = new Set();
    this._timers = new Set();
    this._runId = 0;
    this._pendingResolve = null;
    this._unlockPromise = null;
    this._lastSingIndex = -1;
    this._lastSingAt = 0;
  }

  /**
   * Create/resume AudioContext. Call this directly from a pointer/click event.
   * It is intentionally the only method that can construct an AudioContext.
   */
  async unlock() {
    const scope = typeof window !== "undefined" ? window : null;
    const AudioContextClass = scope && (scope.AudioContext || scope.webkitAudioContext);

    if (!AudioContextClass) {
      this._unavailable = true;
      return false;
    }

    if (!this._ctx || this._ctx.state === "closed") {
      this.stop();

      try {
        this._ctx = new AudioContextClass({ latencyHint: "interactive" });
      } catch (_withOptionsError) {
        try {
          this._ctx = new AudioContextClass();
        } catch (_constructorError) {
          this._ctx = null;
          this._unavailable = true;
          return false;
        }
      }

      this._unavailable = false;
      this._buildGraph();
    }

    if (this._ctx.state === "running") {
      this._applyMute(true);
      return true;
    }

    // Reuse an in-flight attempt so a WebKit resume Promise that is slow to
    // settle cannot accumulate silent buffer sources on repeated taps.
    if (this._unlockPromise) return this._unlockPromise;

    // Calling resume before the first await preserves the user-gesture token on
    // iOS Safari. A one-frame silent source handles older WebKit unlock logic.
    let resumePromise;
    if (this._ctx.state === "suspended" || this._ctx.state === "interrupted") {
      try {
        resumePromise = this._ctx.resume();
      } catch (_resumeError) {
        return false;
      }
    } else {
      resumePromise = Promise.resolve();
    }

    const unlockNodes = [];
    try {
      const silent = this._ctx.createBufferSource();
      silent.buffer = this._ctx.createBuffer(1, 1, this._ctx.sampleRate);
      const silentGain = this._ctx.createGain();
      silentGain.gain.value = 0;
      silent.connect(silentGain);
      silentGain.connect(this._ctx.destination);
      unlockNodes.push(silent, silentGain);
      silent.start(0);
    } catch (_silentSourceError) {
      // Modern browsers do not require the silent-buffer workaround.
    }

    const ctx = this._ctx;
    let unlockTask;
    unlockTask = (async () => {
      let watchdog = null;
      try {
        const resumed = await Promise.race([
          Promise.resolve(resumePromise).then(() => true, () => false),
          new Promise((resolve) => {
            watchdog = setTimeout(() => resolve(false), 900);
          }),
        ]);
        if (!resumed || ctx !== this._ctx || ctx.state !== "running") return false;
        this._applyMute(true);
        return true;
      } catch (_resumeError) {
        return false;
      } finally {
        if (watchdog !== null) clearTimeout(watchdog);
        for (const node of unlockNodes) {
          try {
            node.disconnect();
          } catch (_disconnectError) {
            // WebKit may already have detached the one-shot source.
          }
        }
        if (this._unlockPromise === unlockTask) this._unlockPromise = null;
      }
    })();

    this._unlockPromise = unlockTask;
    return unlockTask;
  }

  /**
   * Play one quick syllable. Intended for pointer-slide interaction.
   */
  sing(index, strength = 1) {
    const noteIndex = this._normaliseIndex(index);
    const amount = clamp(Number(strength) || 0, 0, 1.35);
    const ctx = this._ctx;

    if (noteIndex < 0 || amount <= 0 || !ctx || ctx.state === "closed") {
      return false;
    }

    if (ctx.state === "suspended" || ctx.state === "interrupted") {
      // This can succeed when sing itself is reached from a gesture. Do not
      // await it: scheduling against currentTime remains deterministic.
      try {
        const resumed = ctx.resume();
        if (resumed && typeof resumed.catch === "function") resumed.catch(() => {});
      } catch (_resumeError) {
        return false;
      }
    }

    // Never queue notes on a frozen context: otherwise a failed resume can
    // release a burst of stale swipe sounds on the next successful gesture.
    if (ctx.state !== "running") return false;

    const nowMs = typeof performance !== "undefined" ? performance.now() : Date.now();
    if (noteIndex === this._lastSingIndex && nowMs - this._lastSingAt < 55) {
      return false;
    }

    this._lastSingIndex = noteIndex;
    this._lastSingAt = nowMs;
    this._playVoice(noteIndex, {
      when: ctx.currentTime + 0.006,
      duration: 0.25 + amount * 0.1,
      strength: 0.62 + amount * 0.34,
      vowel: VOWEL_NAMES[noteIndex % VOWEL_NAMES.length],
      sleepy: false,
    });
    return true;
  }

  /**
   * Perform a roughly four-second, multi-part phrase.
   *
   * Starting a new performance cancels the previous one. A cancelled Promise
   * resolves to false without invoking its old onDone callback; a completed
   * performance resolves to true.
   */
  async perform(indices, { onBeat, onDone } = {}) {
    this.stop();
    const runId = this._runId;
    const selected = this._normaliseIndices(indices);

    return new Promise((resolve) => {
      this._pendingResolve = resolve;

      if (selected.length === 0) {
        this._schedule(runId, 0, () => this._completeRun(runId, onDone));
        return;
      }

      let ctx = this._ctx && this._ctx.state !== "closed" ? this._ctx : null;
      if (ctx && (ctx.state === "suspended" || ctx.state === "interrupted")) {
        try {
          const resumed = ctx.resume();
          if (resumed && typeof resumed.catch === "function") resumed.catch(() => {});
        } catch (_resumeError) {
          // Animation and completion continue even if audio cannot resume.
        }
      }

      // Keep the visual phrase and callbacks alive, but do not schedule a
      // delayed "ghost choir" if WebKit has not actually resumed yet.
      if (ctx && ctx.state !== "running") ctx = null;

      const audioStart = ctx ? ctx.currentTime + 0.055 : 0;
      const events = this._makePhrase(selected);

      for (const event of events) {
        if (ctx) {
          this._playVoice(event.index, {
            when: audioStart + event.time,
            duration: event.duration,
            strength: event.intensity,
            vowel: event.vowel,
            sleepy: event.sleepy,
          });
        }

        this._schedule(runId, event.time * 1000 + 55, () => {
          this._safeCallback(onBeat, event.index, event.intensity);
        });
      }

      // The last sustained chord settles through progressively smaller mouth
      // movements, so the characters visibly slow down and fall asleep.
      const sleepers = this._representativeChord(selected, 4);
      for (const [time, intensity] of [[3.36, 0.34], [3.72, 0.14], [4.02, 0]]) {
        for (const index of sleepers) {
          this._schedule(runId, time * 1000 + 55, () => {
            this._safeCallback(onBeat, index, intensity);
          });
        }
      }

      this._schedule(runId, 4160, () => this._completeRun(runId, onDone));
    });
  }

  /**
   * Cancel callbacks and silence all current/scheduled voices. Safe to repeat.
   */
  stop() {
    this._runId += 1;

    for (const timer of this._timers) clearTimeout(timer);
    this._timers.clear();

    for (const voice of Array.from(this._voices)) this._disposeVoice(voice, true);
    this._flushReverb();

    if (this._pendingResolve) {
      const resolve = this._pendingResolve;
      this._pendingResolve = null;
      resolve(false);
    }

    this._lastSingIndex = -1;
    this._lastSingAt = 0;
  }

  setMuted(value) {
    this._muted = Boolean(value);
    this._applyMute(false);
  }

  get muted() {
    return this._muted;
  }

  get state() {
    if (this._ctx) return this._ctx.state;
    return this._unavailable ? "unavailable" : "locked";
  }

  _buildGraph() {
    const ctx = this._ctx;
    if (!ctx) return;

    this._voiceBus = ctx.createGain();
    this._voiceBus.gain.value = 0.9;

    this._dryGain = ctx.createGain();
    this._dryGain.gain.value = 0.82;

    this._wetGain = ctx.createGain();
    this._wetGain.gain.value = 0.13;

    this._masterGain = ctx.createGain();
    this._masterGain.gain.value = this._muted ? 0 : 0.72;

    this._compressor = ctx.createDynamicsCompressor();
    this._compressor.threshold.value = -20;
    this._compressor.knee.value = 16;
    this._compressor.ratio.value = 4;
    this._compressor.attack.value = 0.005;
    this._compressor.release.value = 0.2;

    this._voiceBus.connect(this._dryGain);
    this._dryGain.connect(this._masterGain);
    this._wetGain.connect(this._masterGain);
    this._masterGain.connect(this._compressor);
    this._compressor.connect(ctx.destination);

    this._reverbBuffer = this._createReverbBuffer(ctx);
    this._installReverb();
  }

  _createReverbBuffer(ctx) {
    const length = Math.max(1, Math.floor(ctx.sampleRate * 0.38));
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);

    for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i += 1) {
        const progress = i / length;
        const decay = Math.pow(1 - progress, 2.7);
        data[i] = (Math.random() * 2 - 1) * decay * 0.72;
      }
    }

    return impulse;
  }

  _installReverb() {
    if (!this._ctx || !this._voiceBus || !this._wetGain || !this._reverbBuffer) return;

    const convolver = this._ctx.createConvolver();
    convolver.normalize = true;
    convolver.buffer = this._reverbBuffer;
    this._voiceBus.connect(convolver);
    convolver.connect(this._wetGain);
    this._convolver = convolver;
  }

  _flushReverb() {
    if (!this._convolver) return;

    try {
      if (this._voiceBus) this._voiceBus.disconnect(this._convolver);
      this._convolver.disconnect();
    } catch (_disconnectError) {
      // The graph may already be detached after a browser interruption.
    }

    this._convolver = null;
    if (this._ctx && this._ctx.state !== "closed") this._installReverb();
  }

  _applyMute(immediate) {
    if (!this._ctx || !this._masterGain || this._ctx.state === "closed") return;

    const now = this._ctx.currentTime;
    const target = this._muted ? 0 : 0.72;
    const gain = this._masterGain.gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);

    if (immediate) gain.setValueAtTime(target, now);
    else gain.linearRampToValueAtTime(target, now + 0.018);
  }

  _normaliseIndex(index) {
    const numeric = Number(index);
    if (!Number.isFinite(numeric)) return -1;
    const integer = Math.trunc(numeric);
    return integer >= 0 && integer < PENTATONIC_NOTES.length ? integer : -1;
  }

  _normaliseIndices(indices) {
    if (indices == null) return [];

    let input;
    if (typeof indices === "number" || typeof indices === "string") {
      input = [indices];
    } else {
      try {
        input = Array.from(indices);
      } catch (_iterableError) {
        input = [indices];
      }
    }

    const unique = [];
    const seen = new Set();
    for (const value of input) {
      const index = this._normaliseIndex(value);
      if (index >= 0 && !seen.has(index)) {
        seen.add(index);
        unique.push(index);
      }
    }
    return unique;
  }

  _makePhrase(selected) {
    const events = [];
    const count = selected.length;

    // Part one: every selected singer enters as a gently overlapping ripple.
    for (let i = 0; i < count; i += 1) {
      const progress = count === 1 ? 0 : i / (count - 1);
      events.push({
        index: selected[i],
        time: 0.06 + progress * 1.52,
        duration: 0.48 + (i % 3) * 0.055,
        intensity: 0.66 + (i % 4) * 0.065,
        vowel: VOWEL_NAMES[i % VOWEL_NAMES.length],
        sleepy: false,
      });
    }

    // Part two: a short answering line moves back through the choir.
    const answerCount = Math.min(5, count);
    for (let i = 0; i < answerCount; i += 1) {
      const sourcePosition = answerCount === 1
        ? count - 1
        : Math.round((count - 1) * (1 - i / (answerCount - 1)));
      events.push({
        index: selected[sourcePosition],
        time: 1.48 + i * 0.255,
        duration: 0.7,
        intensity: 0.73 - i * 0.035,
        vowel: VOWEL_NAMES[(i + 1) % VOWEL_NAMES.length],
        sleepy: false,
      });
    }

    // Part three: low/mid/high representatives settle into a long final chord.
    const chord = this._representativeChord(selected, 4);
    chord.forEach((index, position) => {
      events.push({
        index,
        time: 2.76 + position * 0.035,
        duration: 1.2 - position * 0.03,
        intensity: 0.65 - position * 0.055,
        vowel: position % 2 === 0 ? "oh" : "oo",
        sleepy: true,
      });
    });

    return events;
  }

  _representativeChord(selected, maximum) {
    if (selected.length <= maximum) return selected.slice();

    const chord = [];
    for (let i = 0; i < maximum; i += 1) {
      const position = Math.round((selected.length - 1) * (i / (maximum - 1)));
      const index = selected[position];
      if (!chord.includes(index)) chord.push(index);
    }
    return chord;
  }

  _playVoice(index, { when, duration, strength, vowel, sleepy }) {
    const ctx = this._ctx;
    if (!ctx || ctx.state === "closed" || !this._voiceBus) return null;

    while (this._voices.size >= 40) {
      const oldest = this._voices.values().next().value;
      if (!oldest) break;
      this._disposeVoice(oldest, true);
    }

    const start = Math.max(ctx.currentTime, Number(when) || ctx.currentTime);
    const length = clamp(Number(duration) || 0.4, 0.16, 1.6);
    const end = start + length;
    const tail = end + 0.07;
    const amount = clamp(Number(strength) || 0.7, 0.05, 1.25);
    const frequency = PENTATONIC_NOTES[index];
    const formants = VOWELS[vowel] || VOWELS.ah;
    const sources = [];
    const nodes = [];

    const harmonicBus = ctx.createGain();
    harmonicBus.gain.value = 0.76;
    nodes.push(harmonicBus);

    const envelope = ctx.createGain();
    const attack = sleepy ? 0.085 : 0.032;
    const release = sleepy ? Math.min(0.78, length * 0.62) : Math.min(0.24, length * 0.48);
    const releaseAt = Math.max(start + attack, end - release);
    const peak = 0.105 * amount;
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.linearRampToValueAtTime(peak, start + attack);
    envelope.gain.linearRampToValueAtTime(peak * 0.82, releaseAt);
    envelope.gain.exponentialRampToValueAtTime(0.0001, end);
    nodes.push(envelope);

    const vibrato = ctx.createOscillator();
    const vibratoDepth = ctx.createGain();
    vibrato.type = "sine";
    vibrato.frequency.setValueAtTime(sleepy ? 4.25 : 5.05, start);
    vibratoDepth.gain.setValueAtTime(0, start);
    vibratoDepth.gain.linearRampToValueAtTime(3.2 + amount * 1.1, start + 0.12);
    if (sleepy) vibratoDepth.gain.linearRampToValueAtTime(1.4, end);
    vibrato.connect(vibratoDepth);
    sources.push(vibrato);
    nodes.push(vibrato, vibratoDepth);

    for (let harmonic = 1; harmonic <= PARTIAL_LEVELS.length; harmonic += 1) {
      const partialFrequency = frequency * harmonic;
      if (partialFrequency > Math.min(7200, ctx.sampleRate * 0.42)) break;

      const oscillator = ctx.createOscillator();
      const partialGain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(partialFrequency, start);
      oscillator.detune.setValueAtTime((index - 7) * 0.32, start);
      if (sleepy) {
        oscillator.frequency.exponentialRampToValueAtTime(partialFrequency * 0.945, end);
      }
      vibratoDepth.connect(oscillator.detune);
      partialGain.gain.value = PARTIAL_LEVELS[harmonic - 1];
      oscillator.connect(partialGain);
      partialGain.connect(harmonicBus);
      sources.push(oscillator);
      nodes.push(oscillator, partialGain);
    }

    // A broad body path keeps the fundamental warm; three moderate-Q parallel
    // formants provide ah/oh/oo colour without a sharp sine-wave whistle.
    const bodyFilter = ctx.createBiquadFilter();
    const bodyGain = ctx.createGain();
    bodyFilter.type = "lowpass";
    bodyFilter.frequency.value = clamp(frequency * 5.5, 980, 2300);
    bodyFilter.Q.value = 0.58;
    bodyGain.gain.value = 0.3;
    harmonicBus.connect(bodyFilter);
    bodyFilter.connect(bodyGain);
    bodyGain.connect(envelope);
    nodes.push(bodyFilter, bodyGain);

    for (const [formantFrequency, q, level] of formants) {
      const filter = ctx.createBiquadFilter();
      const formantGain = ctx.createGain();
      filter.type = "bandpass";
      filter.frequency.value = Math.min(formantFrequency, ctx.sampleRate * 0.43);
      filter.Q.value = q;
      formantGain.gain.value = level;
      harmonicBus.connect(filter);
      filter.connect(formantGain);
      formantGain.connect(envelope);
      nodes.push(filter, formantGain);
    }

    let output = envelope;
    if (typeof ctx.createStereoPanner === "function") {
      const panner = ctx.createStereoPanner();
      panner.pan.value = clamp((index - 7) / 13, -0.55, 0.55);
      envelope.connect(panner);
      output = panner;
      nodes.push(panner);
    }
    output.connect(this._voiceBus);

    const voice = { sources, nodes, stopped: false };
    this._voices.add(voice);

    vibrato.onended = () => this._disposeVoice(voice, false);
    for (const source of sources) {
      try {
        source.start(start);
        source.stop(tail);
      } catch (_scheduleError) {
        this._disposeVoice(voice, true);
        return null;
      }
    }

    return voice;
  }

  _disposeVoice(voice, halt) {
    if (!voice || voice.stopped) return;
    voice.stopped = true;

    for (const source of voice.sources) {
      source.onended = null;
      if (halt) {
        try {
          source.stop(this._ctx ? this._ctx.currentTime : 0);
        } catch (_stopError) {
          // A source that ended naturally cannot be stopped twice.
        }
      }
    }

    for (const node of voice.nodes) {
      try {
        node.disconnect();
      } catch (_disconnectError) {
        // Some WebKit versions throw when an already-detached node disconnects.
      }
    }

    this._voices.delete(voice);
  }

  _schedule(runId, delayMs, callback) {
    const timer = setTimeout(() => {
      this._timers.delete(timer);
      if (runId !== this._runId) return;
      callback();
    }, Math.max(0, delayMs));
    this._timers.add(timer);
    return timer;
  }

  _completeRun(runId, onDone) {
    if (runId !== this._runId || !this._pendingResolve) return;

    const resolve = this._pendingResolve;
    this._pendingResolve = null;
    this._safeCallback(onDone);
    resolve(true);
  }

  _safeCallback(callback, ...args) {
    if (typeof callback !== "function") return;
    try {
      callback(...args);
    } catch (error) {
      setTimeout(() => {
        throw error;
      }, 0);
    }
  }
}
