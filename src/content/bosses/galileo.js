// Level 6 boss: Galileo Galilei. Rotating beams of light (that sometimes reverse),
// orbiting miniature planets, gravity fields that pull the player, star shots that turn
// back on themselves, and a collapsing gravity well the player must escape.
(function () {
  'use strict';
  const U = G.U;
  const A = G.Attacks;
  const PLANET_COLORS = ['#c08040', '#6090e0', '#e0c080', '#c04030', '#80c0a0'];

  A.add({
    id: 'galileo.beams',
    *run(b, K) {
      b.moveMode = 'stand';
      const n = b.phase === 2 ? 3 : 2;
      const base = K.aim(b) + Math.PI / 2;
      const spin = (G.rng.chance(0.5) ? 1 : -1) * (b.phase === 2 ? 1.1 : 0.85);
      const beams = [];
      for (let i = 0; i < n; i++) {
        beams.push(K.beam({ origin: b, angle: base + (i / n) * U.TAU, spin, len: 420, width: 7, windup: 1.0, dur: 4, dmg: 16 }));
      }
      yield 1.0 + 1.8;
      // "Reverses the direction of his attacks": flip the spin mid-sweep (with a flash).
      if (G.rng.chance(0.6)) {
        G.FX.flash('#fff0a0', 0.1);
        G.FX.text(b.x, b.y - b.r - 16, 'REVERSE', '#fff0a0');
        for (const bm of beams) bm.spin = -bm.spin;
      }
      yield 2.2;
    },
  });

  A.add({
    id: 'galileo.planets', cond: b => !b.data.planets || b.data.planets.dead,
    *run(b, K) {
      b.moveMode = 'stand';
      K.teleCircle(b.x, b.y, 50, 0.6, '#6090e0');
      yield 0.6;
      const p2 = b.phase === 2;
      b.data.planets = K.orbiters({ owner: b, n: p2 ? 5 : 3, radius: p2 ? 58 : 48, speed: p2 ? 2.6 : 1.8, r: 6, dmg: 14, dur: 9, colors: PLANET_COLORS });
      yield 0.3;
    },
  });

  A.add({
    id: 'galileo.gravity',
    *run(b, K) {
      b.moveMode = 'keep';
      const P = K.P();
      const pt = K.pointNear(P.x, P.y, 40, 90);
      K.teleCircle(pt.x, pt.y, 90, 0.6, '#8060ff');
      yield 0.6;
      K.zone('gravity', { x: pt.x, y: pt.y, r: 100, life: 3.5, data: { pull: 70 } });
      for (let i = 0; i < 4; i++) {
        K.spread(b, K.aim(b), 3, 0.5, { speed: 100, r: 3, color: '#fff0a0', dmg: 11 });
        yield 0.7;
      }
    },
  });

  // Star shots fly out, stop, and come back the other way.
  A.add({
    id: 'galileo.starShots',
    *run(b, K) {
      b.moveMode = 'stand';
      K.teleCircle(b.x, b.y, b.r + 10, 0.5, '#fff0a0');
      yield 0.5;
      const rings = b.phase === 2 ? 3 : 2;
      for (let r = 0; r < rings; r++) {
        const shots = K.ring(b, 14, { speed: 120, r: 3, color: '#fff0a0', dmg: 11, life: 4 }, r * 0.22);
        for (const s of shots) {
          s.onUpdate = (p) => {
            if (!p.reversed && p.age > 0.9) { p.reversed = true; p.vx = -p.vx * 0.9; p.vy = -p.vy * 0.9; }
          };
        }
        yield 0.5;
      }
      yield 0.6;
    },
  });

  // A huge well that collapses after a few seconds: get out before it does.
  A.add({
    id: 'galileo.collapse', maxUses: 3,
    *run(b, K) {
      b.moveMode = 'stand';
      const c = K.center();
      G.FX.text(b.x, b.y - b.r - 16, 'SINGULARITY', '#ff60ff');
      K.zone('gravity', { x: c.x, y: c.y, r: 150, life: 4.2, data: { pull: 75, collapseDmg: 35 } });
      yield 4.6;
    },
  });

  G.Bosses.add({
    id: 'galileo', name: 'Galileo Galilei', title: 'Eppur Si Muove', short: 'Galileo', level: 6,
    hp: 3800, r: 8, speed: 45, dmg: 14, move: 'keep', keepRange: [100, 170], rest: [1.0, 1.5], phase2At: 0.5,
    phase2Text: 'the heavens accelerate',
    art: { type: 'humanoid', s: 1.6, body: '#5a4030', trim: '#c09040', skin: '#d8b090', hair: '#909090', beard: '#b0b0b0', weapon: 'device', cape: '#2a2040' },
    attacks: {
      1: [['galileo.beams', 3], ['galileo.planets', 2], ['galileo.gravity', 2], ['galileo.starShots', 2], ['galileo.collapse', 0.8]],
      2: [['galileo.beams', 3], ['galileo.planets', 2.5], ['galileo.gravity', 2], ['galileo.starShots', 2], ['galileo.collapse', 1]],
    },
    onPhase2(b) { if (b.data.planets) b.data.planets.dead = true; },
    trophy: { icon: 'telescope', color: '#f0c040' },
  });
})();
