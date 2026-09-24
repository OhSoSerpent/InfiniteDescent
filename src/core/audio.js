// Tiny procedural sound effects via WebAudio (no audio files needed).
(function () {
  'use strict';

  // Each preset: wave, start freq, end freq, duration, volume, noise?
  const PRESETS = {
    shoot: { wave: 'square', f0: 900, f1: 300, dur: 0.06, vol: 0.05 },
    heavy: { wave: 'sawtooth', f0: 300, f1: 80, dur: 0.12, vol: 0.07 },
    hit: { wave: 'square', f0: 300, f1: 120, dur: 0.05, vol: 0.05 },
    crit: { wave: 'square', f0: 1400, f1: 600, dur: 0.08, vol: 0.06 },
    kill: { wave: 'triangle', f0: 500, f1: 60, dur: 0.14, vol: 0.08 },
    hurt: { wave: 'sawtooth', f0: 220, f1: 60, dur: 0.22, vol: 0.12 },
    dash: { noise: true, f0: 2000, f1: 400, dur: 0.12, vol: 0.06 },
    reload: { wave: 'square', f0: 200, f1: 420, dur: 0.1, vol: 0.04 },
    empty: { wave: 'square', f0: 120, f1: 110, dur: 0.05, vol: 0.04 },
    explode: { noise: true, f0: 800, f1: 60, dur: 0.35, vol: 0.14 },
    pickup: { wave: 'triangle', f0: 600, f1: 1200, dur: 0.1, vol: 0.06 },
    relic: { wave: 'triangle', f0: 300, f1: 1400, dur: 0.5, vol: 0.09 },
    door: { wave: 'square', f0: 90, f1: 60, dur: 0.2, vol: 0.07 },
    boss: { wave: 'sawtooth', f0: 60, f1: 40, dur: 0.9, vol: 0.14 },
    telegraph: { wave: 'sine', f0: 700, f1: 900, dur: 0.12, vol: 0.04 },
    slam: { noise: true, f0: 300, f1: 40, dur: 0.45, vol: 0.16 },
    swing: { noise: true, f0: 1500, f1: 300, dur: 0.14, vol: 0.06 },
    enemyShot: { wave: 'triangle', f0: 500, f1: 250, dur: 0.07, vol: 0.035 },
    heal: { wave: 'sine', f0: 500, f1: 900, dur: 0.25, vol: 0.07 },
    select: { wave: 'square', f0: 660, f1: 660, dur: 0.05, vol: 0.04 },
  };

  const Audio = {
    ctx: null, master: null, muted: false, last: {},
    unlock() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.muted ? 0 : 0.8;
        this.master.connect(this.ctx.destination);
        this.noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.5, this.ctx.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) { this.ctx = null; }
    },
    setMuted(m) {
      this.muted = m;
      if (this.master) this.master.gain.value = m ? 0 : 0.8;
    },
    play(name) {
      if (!this.ctx || this.muted) return;
      const p = PRESETS[name];
      if (!p) return;
      const now = this.ctx.currentTime;
      if (this.last[name] && now - this.last[name] < 0.03) return; // rate limit
      this.last[name] = now;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(p.vol, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + p.dur);
      g.connect(this.master);
      if (p.noise) {
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuf;
        const f = this.ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.setValueAtTime(p.f0, now);
        f.frequency.exponentialRampToValueAtTime(Math.max(20, p.f1), now + p.dur);
        src.connect(f); f.connect(g);
        src.start(now); src.stop(now + p.dur);
      } else {
        const o = this.ctx.createOscillator();
        o.type = p.wave;
        o.frequency.setValueAtTime(p.f0, now);
        o.frequency.exponentialRampToValueAtTime(Math.max(20, p.f1), now + p.dur);
        o.connect(g);
        o.start(now); o.stop(now + p.dur);
      }
    },
  };

  G.Audio = Audio;
})();
