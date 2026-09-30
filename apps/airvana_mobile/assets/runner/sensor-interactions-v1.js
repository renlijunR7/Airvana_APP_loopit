(function (root) {
  'use strict';

  const PROFILES = Object.freeze({
    'pixel-quest': Object.freeze({
      kind: 'orientation',
      control: 'lane',
      label: '陀螺仪',
      prompt: '开启陀螺仪',
      active: '倾斜控制已开启',
      fallback: '点按跑道仍可操作'
    }),
    'red-cup-shuffle': Object.freeze({
      kind: 'motion',
      control: 'shuffle',
      label: '摇晃',
      prompt: '开启摇晃',
      active: '摇晃开始洗牌',
      fallback: '点按画面仍可洗牌'
    }),
    'magic-choir': Object.freeze({
      kind: 'microphone',
      control: 'sequence',
      label: '吹气',
      prompt: '开启吹气',
      active: '吹气点亮声部',
      fallback: '点按声部仍可编排'
    }),
    'neon-dash': Object.freeze({
      kind: 'orientation',
      control: 'lane',
      label: '陀螺仪',
      prompt: '开启倾斜跑酷',
      active: '倾斜切换跑道',
      fallback: '点按跑道仍可操作'
    }),
    'city-rush': Object.freeze({
      kind: 'orientation',
      control: 'steer',
      label: '陀螺仪',
      prompt: '开启倾斜转向',
      active: '倾斜控制赛车',
      fallback: '按住左右仍可转向'
    }),
    'nova-drift': Object.freeze({
      kind: 'orientation',
      control: 'steer',
      label: '陀螺仪',
      prompt: '开启倾斜漂移',
      active: '倾斜控制漂移',
      fallback: '按住左右仍可转向'
    }),
    'rift-strike': Object.freeze({
      kind: 'orientation',
      control: 'aim',
      label: '陀螺仪',
      prompt: '开启倾斜瞄准',
      active: '倾斜移动战机',
      fallback: '拖动战机仍可操作'
    }),
    'void-squadron': Object.freeze({
      kind: 'orientation',
      control: 'aim',
      label: '陀螺仪',
      prompt: '开启倾斜编队',
      active: '倾斜移动编队',
      fallback: '拖动编队仍可操作'
    }),
    'star-cups': Object.freeze({
      kind: 'motion',
      control: 'shuffle',
      label: '摇晃',
      prompt: '开启摇晃',
      active: '摇晃开始幻术',
      fallback: '点按画面仍可洗牌'
    })
  });

  const now = () => Date.now();
  const finite = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));

  class SensorSession {
    constructor(gameKey, options) {
      this.gameKey = gameKey;
      this.profile = PROFILES[gameKey] || null;
      this.options = options || {};
      this.status = this.profile && this.isSupported() ? 'prompt' : 'unavailable';
      this.destroyed = false;
      this.listeners = [];
      this.lastVector = null;
      this.lastShakeAt = 0;
      this.lastTiltAt = 0;
      this.lastTiltDirection = null;
      this.lastOrientation = null;
      this.orientationCenterBeta = null;
      this.lastBlowAt = 0;
      this.blowFrames = 0;
      this.noiseFloor = .018;
      this.stream = null;
      this.audioContext = null;
      this.analyser = null;
      this.micFrame = 0;
      this.micFrameMode = '';
      this.handleMotion = this.handleMotion.bind(this);
      this.handleOrientation = this.handleOrientation.bind(this);
      this.sampleMicrophone = this.sampleMicrophone.bind(this);
      this.notify();
    }

    isSupported() {
      if (!this.profile) return false;
      if (this.profile.kind === 'motion') return !!(root.DeviceMotionEvent || 'ondevicemotion' in root);
      if (this.profile.kind === 'orientation') return !!(root.DeviceOrientationEvent || 'ondeviceorientation' in root);
      if (this.profile.kind === 'microphone') return !!(root.navigator && root.navigator.mediaDevices && typeof root.navigator.mediaDevices.getUserMedia === 'function');
      return false;
    }

    requiresGesture() {
      if (!this.profile) return false;
      if (this.profile.kind === 'microphone') return true;
      const EventClass = this.profile.kind === 'motion' ? root.DeviceMotionEvent : root.DeviceOrientationEvent;
      return !!(EventClass && typeof EventClass.requestPermission === 'function');
    }

    snapshot(extra) {
      return {
        gameKey: this.gameKey,
        kind: this.profile ? this.profile.kind : null,
        control: this.profile ? this.profile.control : null,
        label: this.profile ? this.profile.label : '',
        prompt: this.profile ? this.profile.prompt : '',
        activeLabel: this.profile ? this.profile.active : '',
        fallback: this.profile ? this.profile.fallback : '',
        status: this.status,
        ...(extra || {})
      };
    }

    notify(extra) {
      if (typeof this.options.onStatus === 'function') this.options.onStatus(this.snapshot(extra));
    }

    transition(status, extra) {
      if (this.destroyed) return;
      this.status = status;
      this.notify(extra);
      if (typeof this.options.onEvent === 'function') {
        this.options.onEvent('sensor_permission', {
          sensor_kind: this.profile ? this.profile.kind : null,
          permission_state: status,
          ...(extra || {})
        });
      }
    }

    async enable() {
      if (this.destroyed || !this.profile) return this.snapshot();
      if (this.status === 'active' || this.status === 'requesting') return this.snapshot();
      if (!this.isSupported()) {
        this.transition('unavailable', {reason: 'api_unavailable'});
        return this.snapshot();
      }
      this.transition('requesting');
      try {
        if (this.profile.kind === 'microphone') await this.enableMicrophone();
        else await this.enableMotionInput();
        this.transition('active');
      } catch (error) {
        const denied = error && (error.name === 'NotAllowedError' || error.name === 'SecurityError' || error.message === 'permission_denied');
        this.transition(denied ? 'denied' : 'error', {reason: denied ? 'permission_denied' : 'activation_failed'});
      }
      return this.snapshot();
    }

    async enableMotionInput() {
      const kind = this.profile.kind;
      const EventClass = kind === 'motion' ? root.DeviceMotionEvent : root.DeviceOrientationEvent;
      if (EventClass && typeof EventClass.requestPermission === 'function') {
        const permission = await EventClass.requestPermission();
        if (permission !== 'granted') throw Object.assign(new Error('permission_denied'), {name: 'NotAllowedError'});
      }
      const eventName = kind === 'motion' ? 'devicemotion' : 'deviceorientation';
      const handler = kind === 'motion' ? this.handleMotion : this.handleOrientation;
      root.addEventListener(eventName, handler, {passive: true});
      this.listeners.push([eventName, handler]);
    }

    async enableMicrophone() {
      const mediaDevices = root.navigator && root.navigator.mediaDevices;
      if (!mediaDevices || typeof mediaDevices.getUserMedia !== 'function') throw new Error('microphone_unavailable');
      this.stream = await mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
          channelCount: 1
        },
        video: false
      });
      const AudioContextClass = root.AudioContext || root.webkitAudioContext;
      if (!AudioContextClass) throw new Error('audio_context_unavailable');
      this.audioContext = new AudioContextClass();
      if (this.audioContext.state === 'suspended' && this.audioContext.resume) await this.audioContext.resume();
      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 512;
      this.analyser.smoothingTimeConstant = .16;
      source.connect(this.analyser);
      this.queueMicrophoneFrame();
    }

    handleMotion(event) {
      if (this.destroyed || this.status !== 'active') return;
      const acceleration = event && event.acceleration;
      const gravity = event && event.accelerationIncludingGravity;
      const vector = {
        x: finite(acceleration && acceleration.x || gravity && gravity.x),
        y: finite(acceleration && acceleration.y || gravity && gravity.y),
        z: finite(acceleration && acceleration.z || gravity && gravity.z)
      };
      const directMagnitude = acceleration ? Math.hypot(vector.x, vector.y, vector.z) : 0;
      const deltaMagnitude = this.lastVector ? Math.hypot(vector.x - this.lastVector.x, vector.y - this.lastVector.y, vector.z - this.lastVector.z) : 0;
      this.lastVector = vector;
      const strength = Math.max(directMagnitude, deltaMagnitude);
      const timestamp = now();
      if (strength < 12 || timestamp - this.lastShakeAt < 850) return;
      this.lastShakeAt = timestamp;
      if (typeof this.options.onShake === 'function') this.options.onShake({strength: Math.round(strength * 10) / 10});
    }

    handleOrientation(event) {
      if (this.destroyed || this.status !== 'active') return;
      const gamma = finite(event && event.gamma);
      const beta = finite(event && event.beta);
      const direction = gamma < -9 ? -1 : gamma > 9 ? 1 : 0;
      const timestamp = now();
      if (this.profile && this.profile.control === 'aim') {
        if (this.orientationCenterBeta === null) this.orientationCenterBeta = beta;
        const orientation = {
          x: Math.round(clamp(gamma / 28, -1, 1) * 100) / 100,
          y: Math.round(clamp((beta - this.orientationCenterBeta) / 28, -1, 1) * 100) / 100
        };
        const changed = !this.lastOrientation
          || Math.abs(orientation.x - this.lastOrientation.x) >= .04
          || Math.abs(orientation.y - this.lastOrientation.y) >= .04;
        if ((!changed && timestamp - this.lastTiltAt < 250) || timestamp - this.lastTiltAt < 48) return;
        this.lastOrientation = orientation;
        this.lastTiltDirection = direction;
        this.lastTiltAt = timestamp;
        if (typeof this.options.onTilt === 'function') {
          this.options.onTilt({direction, value: Math.round(gamma), gamma: Math.round(gamma), beta: Math.round(beta), ...orientation});
        }
        return;
      }
      if (direction === this.lastTiltDirection || timestamp - this.lastTiltAt < 150) return;
      this.lastTiltDirection = direction;
      this.lastTiltAt = timestamp;
      if (typeof this.options.onTilt === 'function') this.options.onTilt({direction, value: Math.round(gamma), gamma: Math.round(gamma), beta: Math.round(beta)});
    }

    queueMicrophoneFrame() {
      if (this.destroyed || !this.analyser) return;
      if (typeof root.requestAnimationFrame === 'function') {
        this.micFrameMode = 'animation';
        this.micFrame = root.requestAnimationFrame(this.sampleMicrophone);
      } else {
        this.micFrameMode = 'timeout';
        this.micFrame = setTimeout(this.sampleMicrophone, 32);
      }
    }

    sampleMicrophone() {
      if (this.destroyed || !this.analyser) return;
      const length = this.analyser.fftSize || 512;
      let rms = 0;
      if (typeof this.analyser.getFloatTimeDomainData === 'function') {
        const values = new Float32Array(length);
        this.analyser.getFloatTimeDomainData(values);
        for (const value of values) rms += value * value;
        rms = Math.sqrt(rms / values.length);
      } else {
        const values = new Uint8Array(length);
        this.analyser.getByteTimeDomainData(values);
        for (const value of values) { const normalized = (value - 128) / 128; rms += normalized * normalized; }
        rms = Math.sqrt(rms / values.length);
      }
      this.noiseFloor = this.noiseFloor * .985 + Math.min(rms, .08) * .015;
      const threshold = Math.max(.105, this.noiseFloor * 2.8);
      this.blowFrames = rms >= threshold ? this.blowFrames + 1 : 0;
      const timestamp = now();
      if (this.blowFrames >= 2 && timestamp - this.lastBlowAt >= 650) {
        this.lastBlowAt = timestamp;
        this.blowFrames = 0;
        if (typeof this.options.onBlow === 'function') this.options.onBlow({level: Math.round(rms * 100)});
      }
      this.queueMicrophoneFrame();
    }

    destroy() {
      if (this.destroyed) return;
      this.destroyed = true;
      for (const [eventName, handler] of this.listeners) root.removeEventListener(eventName, handler);
      this.listeners = [];
      if (this.micFrame) {
        if (this.micFrameMode === 'animation' && typeof root.cancelAnimationFrame === 'function') root.cancelAnimationFrame(this.micFrame);
        else clearTimeout(this.micFrame);
      }
      this.micFrame = 0;
      if (this.stream && this.stream.getTracks) this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
      if (this.audioContext && this.audioContext.close) { try { this.audioContext.close(); } catch (error) {} }
      this.audioContext = null;
      this.analyser = null;
    }
  }

  root.AirvanaSensorInteractions = Object.freeze({
    version: '1.1.0',
    has: gameKey => !!PROFILES[gameKey],
    profile: gameKey => PROFILES[gameKey] ? {...PROFILES[gameKey]} : null,
    list: () => Object.entries(PROFILES).map(([gameKey, profile]) => ({gameKey, ...profile})),
    mount: (gameKey, options) => new SensorSession(gameKey, options || {})
  });
})(typeof window !== 'undefined' ? window : globalThis);
