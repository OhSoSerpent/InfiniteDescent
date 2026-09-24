// Final boss: Satan. A huge health pool, and he can use any attack belonging to the
// bosses NOT defeated on this run (the alternates the player never faced). Two
// signature attacks of his own fill in between.
(function () {
  'use strict';
  const U = G.U;
  const A = G.Attacks;

  A.add({
    id: 'satan.hellfire',
    *run(b, K) {
      b.moveMode = 'stand';
      K.teleCircle(b.x, b.y, b.r + 12, 0.6, '#ff3020');
      yield 0.6;
      for (let i = 0; i < 5; i++) {
        K.ring(b, 16, { speed: 95, kind: 'fire', r: 4, dmg: 14, life: 5, status: { id: 'burn', dur: 2, power: 5 } }, i * 0.2);
        yield 0.35;
      }
    },
  });

  A.add({
    id: 'satan.claw',
    *run(b, K) {
      b.moveMode = 'chase'; b.moveMult = 1.5;
      const start = G.World.time;
      yield () => K.dist(b) < 70 || G.World.time - start > 1.4;
      b.moveMode = 'stand';
      for (let i = 0; i < 2; i++) {
        const a = K.face(b);
        K.teleArc(b.x, b.y, 72, a, 1.4, 0.45, '#ff3020');
        yield 0.45;
        K.melee(b, a, 72, 1.4, 24, { knock: 240, color: '#ff8060' });
        yield 0.25;
      }
    },
  });

  // Gather every attack of every boss not defeated this run.
  function borrowedAttacks() {
    const ids = new Set();
    for (const def of G.Run.undefeatedBosses()) {
      for (const phase of Object.values(def.attacks || {})) for (const e of phase) ids.add(Array.isArray(e) ? e[0] : e);
      for (const th of def.thresholds || []) ids.add(th.attack);
    }
    return Array.from(ids);
  }

  G.Bosses.add({
    id: 'satan', name: 'Satan', title: 'Emperor of the Dolorous Realm', short: 'Satan', level: 10, final: true,
    hp: 16000, r: 16, speed: 55, dmg: 22, move: 'keep', keepRange: [80, 170], rest: [0.6, 1.1], rest2Scale: 0.7, phase2At: 0.5,
    kbResist: 1, poise: 0.04,
    phase2Text: 'unleashes all of Hell',
    init(b) {
      b.data.borrowed = borrowedAttacks();
    },
    // Borrowed attacks (weighted evenly) plus his own signatures.
    getAttacks(b) {
      const own = [['satan.hellfire', 1.5], ['satan.claw', 1.5]];
      return b.data.borrowed.map(id => [id, 1]).concat(own);
    },
    draw(b, ctx) {
      G.Art.demon(ctx, b.x, b.y, { s: 3, facing: b.facing, t: b.t, moving: true, flash: b.flash > 0, weapon: 'staff', aim: b.aimAngle });
    },
    drawExtra(b) {
      if (Math.random() < 0.4) G.FX.particle(b.x + (Math.random() - 0.5) * 30, b.y + 14, 0, -25, 0.6, Math.random() < 0.5 ? '#ff3020' : '#ffa020');
    },
    trophy: { icon: 'horn', color: '#e0d0b0' },
  });
})();
