// Level 3 boss: Achilles. Fast, always moving, quick stabs and long sweeps, throws his
// spear then rushes to retrieve it, and charges. His heel is a small weak spot that
// takes triple damage. Phase 2 strengthens the storm; sometimes he flies into a rage
// of rapid attacks, then is briefly vulnerable.
(function () {
  'use strict';
  const U = G.U;
  const A = G.Attacks;

  A.add({
    id: 'achilles.stabs',
    *run(b, K) {
      b.moveMode = 'chase'; b.moveMult = 1.5;
      const start = G.World.time;
      yield () => K.dist(b) < 55 || G.World.time - start > 1;
      b.moveMode = 'stand';
      const n = b.phase === 2 ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const a = K.face(b);
        const ex = b.x + Math.cos(a) * 54, ey = b.y + Math.sin(a) * 54;
        K.teleLine(b.x, b.y, ex, ey, 8, 0.22, '#ff6040');
        yield 0.22;
        K.sfx('swing');
        G.FX.tracer([{ x: b.x, y: b.y }, { x: ex, y: ey }], '#ffffff', 0.1);
        K.hitLine(b.x, b.y, ex, ey, 8, 13, { knock: 100 }, b);
        yield 0.1;
      }
    },
  });

  A.add({
    id: 'achilles.sweep',
    *run(b, K) {
      b.moveMode = 'chase'; b.moveMult = 1.5;
      const start = G.World.time;
      yield () => K.dist(b) < 64 || G.World.time - start > 1;
      b.moveMode = 'stand';
      const a = K.face(b);
      K.teleArc(b.x, b.y, 66, a, 1.6, 0.4, '#ff6040');
      yield 0.4;
      K.melee(b, a, 66, 1.6, 17, { knock: 200 });
      yield 0.15;
    },
  });

  // Throw the spear, then dash over to pick it up (no spear attacks in between).
  A.add({
    id: 'achilles.throwRetrieve',
    *run(b, K) {
      b.moveMode = 'stand';
      const a = K.face(b);
      K.teleLine(b.x, b.y, b.x + Math.cos(a) * 300, b.y + Math.sin(a) * 300, 6, 0.45, '#ff6040');
      yield 0.45;
      let landed = null;
      const p = K.shoot(b, a, { speed: 330, r: 3, kind: 'spear', dmg: 18, life: 1.2, wallMode: 'stick' });
      const mark = pr => { if (!landed) landed = { x: pr.x, y: pr.y }; };
      p.onWall = mark;
      p.onExpire = mark;
      b.data.artOverride = { weapon: 'none' };
      K.sfx('heavy');
      try {
        const start = G.World.time;
        yield () => landed || G.World.time - start > 1.5;
        if (!landed) landed = { x: p.x, y: p.y };
        yield 0.2;
        // Rush to the spear; contact hurts.
        const tgt = K.room().nearestGround(landed.x, landed.y);
        b.moveMode = 'none';
        let t = 0;
        while (!b.dead && t < 2 && U.dist(b.x, b.y, tgt.x, tgt.y) > 6) {
          const dt = yield;
          t += dt;
          const ang = U.angle(b.x, b.y, tgt.x, tgt.y);
          b.move(Math.cos(ang) * 260 * dt, Math.sin(ang) * 260 * dt);
          b.facing = Math.cos(ang) >= 0 ? 1 : -1;
          if (Math.random() < 0.5) G.FX.particle(b.x, b.y + 8, 0, 0, 0.3, '#c0a080', 2);
        }
        p.dead = true;
      } finally {
        b.data.artOverride = null;
      }
      yield 0.15;
    },
  });

  A.add({
    id: 'achilles.charge',
    *run(b, K) {
      b.moveMode = 'stand';
      const a = K.face(b);
      K.teleLine(b.x, b.y, b.x + Math.cos(a) * 240, b.y + Math.sin(a) * 240, b.r * 2 + 4, 0.55, '#ff3020');
      yield 0.55;
      yield* K.charge(b, a, 340, 0.7, { dmg: 18, knock: 240 });
      yield 0.3;
    },
  });

  // Enraged flurry: rapid attacks, then a vulnerable pause.
  A.add({
    id: 'achilles.rage',
    *run(b, K) {
      G.FX.text(b.x, b.y - b.r - 16, 'ENRAGED', '#ff3030');
      b.moveMode = 'stand';
      K.teleCircle(b.x, b.y, b.r + 10, 0.5, '#ff3030');
      yield 0.5;
      try {
        for (let i = 0; i < 6; i++) {
          b.moveMode = 'chase'; b.moveMult = 2;
          yield 0.25;
          b.moveMode = 'stand';
          const a = K.face(b);
          K.teleArc(b.x, b.y, 50, a, 1.0, 0.16, '#ff3030');
          yield 0.16;
          K.melee(b, a, 50, 1.0, 12, { knock: 120, color: '#ffa0a0' });
        }
        // Exhausted: open to punishment.
        b.takenMult = 1.5;
        G.FX.text(b.x, b.y - b.r - 16, 'EXHAUSTED', '#ffe060');
        b.moveMode = 'stand';
        yield 2.0;
      } finally {
        b.takenMult = 1;
      }
    },
  });

  G.Bosses.add({
    id: 'achilles', identity: 'achilles', name: 'Achilles', title: 'Swift-Footed Hero', short: 'Achilles', level: 3,
    hp: 1500, r: 8, speed: 95, dmg: 14, move: 'strafe', rest: [0.25, 0.6], phase2At: 0.5,
    phase2Text: 'the storm howls louder',
    art: { type: 'humanoid', s: 1.5, body: '#b08030', trim: '#e0c060', skin: '#d8a070', head: 'helmet', headCol: '#c09040', plume: '#c02020', weapon: 'spear', cape: '#8a1a1a' },
    attacks: {
      1: [['achilles.stabs', 3], ['achilles.sweep', 2], ['achilles.throwRetrieve', 2], ['achilles.charge', 2], ['achilles.rage', 1]],
      2: [['achilles.stabs', 3], ['achilles.sweep', 2], ['achilles.throwRetrieve', 2], ['achilles.charge', 2], ['achilles.rage', 1.5]],
    },
    // The heel: small, behind and below him, triple damage.
    hitParts(b) { return [{ x: b.x - b.facing * 5, y: b.y + 11, r: 2.5, mult: 3 }]; },
    drawExtra(b) {
      const x = b.x - b.facing * 5, y = b.y + 11;
      G.Draw.alpha(0.5 + 0.4 * Math.sin(b.t * 8), () => G.Draw.rect(x - 1, y - 1, 3, 3, '#ffe060'));
    },
    onPhase2(b) { G.World.room.hazardLevel = 2; },
    trophy: { icon: 'spear', color: '#c8c8d0' },
  });
})();
