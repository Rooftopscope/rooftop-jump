const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;

const MELODY = [
  220.00, 261.63, 329.63, 392.00,
  329.63, 261.63, 293.66, 246.94,
];

/**
 * Small procedural soundtrack. It deliberately creates no network requests or
 * audio files, so the game stays easy to embed and package.
 */
export class RooftopAudio {
  constructor({ muted = false, disabled = false, tempo = 104 } = {}) {
    this.muted = Boolean(muted);
    this.disabled = disabled || !AudioContextClass;
    this.tempo = tempo;
    this.context = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.scheduler = 0;
    this.nextNoteAt = 0;
    this.step = 0;
    this.playing = false;
    this.started = false;
  }

  get supported() { return !this.disabled; }

  ensureContext() {
    if (this.disabled) return null;
    if (this.context) return this.context;
    try {
      this.context = new AudioContextClass();
      this.musicGain = this.context.createGain();
      this.sfxGain = this.context.createGain();
      this.musicGain.gain.value = 0.055;
      this.sfxGain.gain.value = 0.16;
      this.musicGain.connect(this.context.destination);
      this.sfxGain.connect(this.context.destination);
      return this.context;
    } catch {
      this.disabled = true;
      return null;
    }
  }

  start() {
    if (this.disabled || this.muted) return;
    const context = this.ensureContext();
    if (!context) return;
    this.playing = true;
    if (!this.started) {
      this.started = true;
      this.startCue();
    }
    this.nextNoteAt = context.currentTime + 0.05;
    this.schedule();
    if (!this.scheduler) this.scheduler = window.setInterval(() => this.schedule(), 100);
    context.resume?.().catch(() => {});
  }

  pause() {
    this.playing = false;
    if (this.scheduler) { window.clearInterval(this.scheduler); this.scheduler = 0; }
    if (this.context?.state === 'running') this.context.suspend?.().catch(() => {});
  }

  setMuted(muted) {
    this.muted = Boolean(muted);
    if (this.muted) this.pause();
    else this.start();
  }

  toggleMuted() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  getState() {
    return { supported: this.supported, muted: this.muted, playing: this.playing };
  }

  schedule() {
    if (!this.playing || !this.context || this.context.state === 'closed') return;
    const horizon = this.context.currentTime + 0.35;
    const beat = 60 / this.tempo / 2;
    while (this.nextNoteAt < horizon) {
      this.scheduleMusicStep(this.nextNoteAt, this.step);
      this.nextNoteAt += beat;
      this.step = (this.step + 1) % MELODY.length;
    }
  }

  scheduleMusicStep(at, step) {
    const note = MELODY[step];
    this.tone(note, at, 0.19, 'triangle', 0.52, this.musicGain);
    if (step % 4 === 0) this.tone(note / 2, at, 0.32, 'sine', 0.65, this.musicGain);
  }

  tone(frequency, at, duration, type = 'sine', volume = 1, output = this.sfxGain) {
    if (!this.context || !output) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, at);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(Math.max(0.0001, volume), at + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    oscillator.connect(gain); gain.connect(output);
    oscillator.start(at);
    oscillator.stop(at + duration + 0.035);
  }

  noise(at, duration = 0.12, volume = 0.5) {
    if (!this.context || !this.sfxGain) return;
    const length = Math.max(1, Math.floor(this.context.sampleRate * duration));
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(Math.max(0.0001, volume), at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source.connect(gain); gain.connect(this.sfxGain);
    source.start(at); source.stop(at + duration);
  }

  startCue() {
    const at = this.context?.currentTime || 0;
    this.tone(261.63, at, 0.18, 'sine', 0.42);
    this.tone(392.00, at + 0.06, 0.26, 'triangle', 0.34);
  }

  jump() {
    if (!this.playing || !this.context) return;
    const at = this.context.currentTime;
    this.tone(310, at, 0.08, 'triangle', 0.42);
    this.tone(520, at + 0.045, 0.12, 'sine', 0.28);
  }

  land() {
    if (!this.playing || !this.context) return;
    const at = this.context.currentTime;
    this.tone(115, at, 0.09, 'sine', 0.5);
    this.noise(at, 0.07, 0.08);
  }

  impact() {
    if (!this.playing || !this.context) return;
    const at = this.context.currentTime;
    this.tone(160, at, 0.18, 'sawtooth', 0.58);
    this.tone(72, at + 0.025, 0.26, 'square', 0.3);
    this.noise(at, 0.18, 0.17);
  }

  destroy() {
    this.pause();
    const context = this.context;
    this.context = null;
    if (context && context.state !== 'closed') context.close?.().catch(() => {});
  }
}
