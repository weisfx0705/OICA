// Generative music and sound effects, synthesised live with the Web Audio API.
// No audio files: nothing extra to download, and the score adapts to each chapter.

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

// D major pentatonic gives an open, East-Asian-leaning colour without sounding like a cliché.
const SCALE = [62, 64, 66, 69, 71, 74, 76, 78, 81, 83];
const MOODS = {
  space: { bpm: 54, chords: [[50, 57, 62, 66, 69], [47, 54, 59, 62, 66], [43, 50, 55, 59, 62], [45, 52, 57, 61, 64]], arp: 0.25, pad: 0.15, wind: 0.05, bright: 1400 },
  day: { bpm: 72, chords: [[50, 57, 64, 66, 69], [47, 54, 61, 62, 66], [43, 50, 57, 59, 66], [45, 52, 59, 61, 64]], arp: 0.55, pad: 0.12, wind: 0.035, bright: 2600 },
  golden: { bpm: 66, chords: [[43, 50, 57, 59, 66], [50, 57, 64, 66, 69], [47, 54, 61, 62, 66], [45, 52, 57, 61, 64]], arp: 0.5, pad: 0.13, wind: 0.03, bright: 2200 },
  dusk: { bpm: 58, chords: [[47, 54, 59, 62, 66], [43, 50, 57, 59, 62], [50, 57, 62, 66, 69], [45, 52, 57, 61, 64]], arp: 0.35, pad: 0.14, wind: 0.04, bright: 1700 },
};

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.on = false;
    this.mood = 'day';
    this.step = 0;
  }

  init() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = (this.ctx = new Ctx());
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 3;
    this.master.connect(comp).connect(ctx.destination);

    // shared reverb from a generated impulse response
    this.verb = ctx.createConvolver();
    this.verb.buffer = this.impulse(3.2, 2.6);
    const verbGain = ctx.createGain();
    verbGain.gain.value = 0.55;
    this.verb.connect(verbGain).connect(this.master);

    this.music = ctx.createGain(); this.music.gain.value = this.ducked ? 0.11 : 0.55;
    this.sfx = ctx.createGain(); this.sfx.gain.value = 0.7;
    this.tone = ctx.createBiquadFilter(); this.tone.type = 'lowpass'; this.tone.frequency.value = 2400; this.tone.Q.value = 0.4;
    this.music.connect(this.tone);
    this.tone.connect(this.master); this.tone.connect(this.verb);
    this.sfx.connect(this.master); this.sfx.connect(this.verb);
    this.buildWind();
  }

  impulse(seconds, decay) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  noiseBuffer(seconds = 2) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  buildWind() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(4);
    src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 500; bp.Q.value = 0.6;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 260;
    lfo.connect(lfoGain).connect(bp.frequency);
    this.windGain = ctx.createGain(); this.windGain.gain.value = 0.03;
    src.connect(bp).connect(this.windGain).connect(this.master);
    src.start(); lfo.start();
  }

  start() {
    this.init();
    if (!this.ctx) return;
    this.ctx.resume();
    this.on = true;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setTargetAtTime(0.9, this.ctx.currentTime, 0.8);
    if (!this.timer) {
      this.nextTime = this.ctx.currentTime + 0.1;
      this.timer = setInterval(() => this.schedule(), 90);
    }
  }

  stop() {
    if (!this.ctx) return;
    this.on = false;
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
  }

  toggle() { if (this.on) this.stop(); else this.start(); return this.on; }

  duck(on) {
    this.ducked = on;
    if (this.ctx) this.music.gain.setTargetAtTime(on ? 0.11 : 0.55, this.ctx.currentTime, 0.2);
  }

  setMood(name) {
    if (!MOODS[name]) return;
    this.mood = name;
    if (!this.ctx) return;
    const m = MOODS[name], t = this.ctx.currentTime;
    this.tone.frequency.setTargetAtTime(m.bright, t, 2);
    this.windGain.gain.setTargetAtTime(m.wind, t, 2);
  }

  // ---------- music scheduler: one eighth-note per step, a chord every 2 bars ----------
  schedule() {
    if (!this.on || this.ctx.state !== 'running') return;
    const m = MOODS[this.mood];
    const eighth = 30 / m.bpm;
    while (this.nextTime < this.ctx.currentTime + 0.3) {
      const s = this.step;
      const chord = m.chords[Math.floor(s / 16) % m.chords.length];
      if (s % 16 === 0) this.padChord(chord, eighth * 16, m.pad, this.nextTime);
      if (s % 8 === 0) this.bass(chord[0] - 12, eighth * 7, this.nextTime);
      if (Math.random() < m.arp * (s % 2 === 0 ? 1 : 0.45)) {
        const pool = SCALE.filter((n) => chord.some((c) => (n - c) % 12 === 0) || Math.random() < 0.35);
        const note = pool[Math.floor(Math.random() * pool.length)] + (Math.random() < 0.2 ? 12 : 0);
        this.pluck(midi(note), this.nextTime, 0.06 + Math.random() * 0.04, 1.8, this.music);
      }
      this.nextTime += eighth;
      this.step++;
    }
  }

  padChord(notes, dur, vol, t) {
    const ctx = this.ctx;
    for (const n of notes.slice(1)) {
      for (const det of [-6, 6]) {
        const o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = midi(n);
        o.detune.value = det;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol * 0.12, t + dur * 0.35);
        g.gain.linearRampToValueAtTime(0, t + dur * 1.05);
        o.connect(g).connect(this.music);
        o.start(t); o.stop(t + dur * 1.1);
      }
    }
  }

  bass(n, dur, t) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = midi(n);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.11, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g).connect(this.music);
    o.start(t); o.stop(t + dur + 0.05);
  }

  // soft plucked tone (two partials, fast attack, exponential decay)
  pluck(freq, t, vol, decay, bus) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0005, t + decay);
    for (const [mul, type, lvl] of [[1, 'sine', 1], [2, 'triangle', 0.25], [3.01, 'sine', 0.08]]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq * mul;
      const og = ctx.createGain(); og.gain.value = lvl;
      o.connect(og).connect(g);
      o.start(t); o.stop(t + decay + 0.05);
    }
    g.connect(bus);
  }

  // ---------- sound effects ----------
  ready() { return this.on && this.ctx && this.ctx.state === 'running'; }
  now() { return this.ctx.currentTime + 0.01; }

  tap() { if (!this.ready()) return; this.pluck(midi(81), this.now(), 0.05, 0.25, this.sfx); }

  select() {
    if (!this.ready()) return;
    const t = this.now();
    this.pluck(midi(74), t, 0.07, 0.6, this.sfx);
    this.pluck(midi(81), t + 0.07, 0.06, 0.8, this.sfx);
  }

  whoosh(dur = 1.2) {
    if (!this.ready()) return;
    const ctx = this.ctx, t = this.now();
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer(dur + 0.2);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(300, t);
    f.frequency.exponentialRampToValueAtTime(2200, t + dur * 0.55);
    f.frequency.exponentialRampToValueAtTime(500, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.22, t + dur * 0.5);
    g.gain.linearRampToValueAtTime(0, t + dur);
    src.connect(f).connect(g).connect(this.sfx);
    src.start(t); src.stop(t + dur + 0.1);
  }

  bell(n, t, vol = 0.09, decay = 3) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0004, t + decay);
    for (const [mul, lvl] of [[1, 1], [2.76, 0.4], [5.4, 0.18], [8.93, 0.08]]) {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = midi(n) * mul;
      const og = ctx.createGain(); og.gain.value = lvl;
      o.connect(og).connect(g);
      o.start(t); o.stop(t + decay);
    }
    g.connect(this.sfx);
  }


  sparkle() {
    if (!this.ready()) return;
    const t = this.now();
    [74, 78, 81, 86, 90, 93].forEach((n, i) => this.bell(n, t + i * 0.09, 0.05, 2.2));
  }

  bridge() {
    if (!this.ready()) return;
    const t = this.now();
    [62, 66, 69, 74, 78, 81].forEach((n, i) => this.pluck(midi(n), t + i * 0.11, 0.08, 1.6, this.sfx));
    this.padChord([50, 57, 62, 66, 69, 74], 3, 0.5, t);
  }

  badge() {
    if (!this.ready()) return;
    const t = this.now();
    this.bell(81, t, 0.08, 2.5);
    this.bell(86, t + 0.14, 0.07, 2.5);
    this.bell(93, t + 0.28, 0.06, 3);
  }

  flag() {
    if (!this.ready()) return;
    const t = this.now();
    [[62, 66, 69], [64, 67, 71], [66, 69, 74]].forEach((ch, i) => ch.forEach((n) => this.pluck(midi(n), t + i * 0.16, 0.06, 1.8, this.sfx)));
    this.bell(86, t + 0.5, 0.07, 3.5);
  }
}

export const sound = new SoundEngine();
