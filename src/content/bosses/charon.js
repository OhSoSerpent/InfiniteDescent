// Level 1 boss: Charon — the ferryman. Normal-sized and fast: swings his huge oar,
// splashes waves of the Styx, throws his oar like a boomerang, and floods part of the arena.
(function () {
  'use strict';
  const U = G.U;
  const A = G.Attacks;

  A.add({
    id: 'charon.oarSwing',
    *run(b, K) {
      b.moveMode = 'chase'; b.moveMult = 1.4;
      const start = G.World.time;
      yield () => K.dist(b) < 50 || G.World.time - start > 1.5;
      b.moveMode = 'stand';
      const swings = b.phase === 2 ? 2 : 1;
      for (let i = 0; i < swings; i++) {
        const a = K.face(b);
        K.teleArc(b.x, b.y, 48, a, 1.1, 0.35, '#60a0c0');
        yield 0.35;
        b.aimAngle = a + (i % 2 ? -1.2 : 1.2);
        K.melee(b, a, 48, 1.1, 16, { knock: 160, color: '#a0d0ff' });
        yield 0.25;
      }
    },
  });

  A.add({
    id: 'charon.styxWave',
    *run(b, K) {
      b.moveMode = 'stand';
      const waves = b.phase === 2 ? 3 : 2;
      for (let w = 0; w < waves; w++) {
        const a = K.face(b);
        K.teleArc(b.x, b.y, 60, a, 0.6, 0.4, '#3070a0');
        yield 0.4;
        for (let i = 0; i < 11; i++) {
          const off = (i / 10 - 0.5) * 1.3;
          K.shoot(b, a + off, { speed: 120 - Math.abs(off) * 20, kind: 'water', r: 4, dmg: 11, status: { id: 'slow', dur: 1, power: 0.35 } });
        }
        K.sfx('swing');
        yield 0.45;
      }
    },
  });

  A.add({
    id: 'charon.oarBoomerang',
    *run(b, K) {
      b.moveMode = 'stand';
      const a = K.face(b);
      K.teleLine(b.x, b.y, b.x + Math.cos(a) * 180, b.y + Math.sin(a) * 180, 10, 0.4, '#60a0c0');
      yield 0.4;
      let caught = false;
      b.data.artOverride = { weapon: 'none' };
      K.shoot(b, K.aim(b, 0.2), {
        speed: 240, r: 7, kind: 'oar', dmg: 15, spin: 14, pierceWalls: true, life: 6,
        boomerang: { to: b, outTime: 0.85, speed: 240, onCatch: () => { caught = true; } },
      });
      K.sfx('swing');
      try {
        // While his oar is away, Charon keeps pressing the player.
        b.moveMode = 'chase'; b.moveMult = 1.25;
        const start = G.World.time;
        yield () => caught || G.World.time - start > 5;
      } finally {
        b.data.artOverride = null;
      }
    },
  });

  A.add({
    id: 'charon.flood',
    *run(b, K) {
      b.moveMode = 'stand';
      const B = K.bounds(), P = K.P();
      // Flood the half (or third, in phase 1) of the arena the player is standing in.
      const vertical = G.rng.chance(0.5);
      const frac = b.phase === 2 ? 0.5 : 0.38;
      let rect;
      if (vertical) {
        const w = B.w * frac;
        const left = P.x < B.x0 + B.w / 2;
        rect = { x: left ? B.x0 : B.x1 - w, y: B.y0, w, h: B.h };
      } else {
        const h = B.h * frac;
        const top = P.y < B.y0 + B.h / 2;
        rect = { x: B.x0, y: top ? B.y0 : B.y1 - h, w: B.w, h };
      }
      K.teleRect(rect.x, rect.y, rect.w, rect.h, 1.3, '#3070a0');
      yield 1.3;
      K.zone('styx', { shape: 'rect', x: rect.x, y: rect.y, w: rect.w, h: rect.h, life: 4.5, data: { dps: 12 } });
      K.sfx('slam');
      yield 0.3;
    },
  });

  G.Bosses.add({
    id: 'charon', name: 'Charon', title: 'Ferryman of the Dead', short: 'Charon', level: 1,
    hp: 800, r: 8, speed: 72, dmg: 14, move: 'chase', rest: [0.45, 0.9], phase2At: 0.5,
    phase2Text: 'the river rises',
    art: { type: 'humanoid', s: 1.6, body: '#3a3a44', skin: '#b8b0a0', hair: '#202020', eye: '#60d0ff', glow: '#60d0ff', head: 'hood', headCol: '#2a2a32', weapon: 'oar', cape: '#22222a' },
    bloodColor: '#606070',
    attacks: {
      1: [['charon.oarSwing', 3], ['charon.styxWave', 2], ['charon.oarBoomerang', 2], ['charon.flood', 1]],
      2: [['charon.oarSwing', 3], ['charon.styxWave', 2], ['charon.oarBoomerang', 2], ['charon.flood', 1.5]],
    },
    trophy: { icon: 'oar', color: '#7a5230' },
  });
})();
