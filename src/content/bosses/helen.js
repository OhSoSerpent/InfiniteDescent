// Level 3 boss: Helen of Troy. Ranged and area attacks, poison projectiles, illusions
// of herself (the real Helen casts a shadow and glitters gold; illusions do not),
// a telegraphed charm wave that reverses controls, and a storm that pulls you toward her.
(function () {
  'use strict';
  const U = G.U;
  const A = G.Attacks;

  A.add({
    id: 'helen.heartFan',
    *run(b, K) {
      b.moveMode = 'keep';
      for (let v = 0; v < 2; v++) {
        const a = K.face(b);
        K.teleArc(b.x, b.y, 28, a, 0.7, 0.35, '#ff70c0');
        yield 0.35;
        K.spread(b, a, 5, 0.9, { speed: 120, kind: 'heart', r: 3, dmg: 11 });
        yield 0.45;
      }
    },
  });

  A.add({
    id: 'helen.poisonBolts',
    *run(b, K) {
      b.moveMode = 'keep';
      K.teleCircle(b.x, b.y, b.r + 8, 0.4, '#70e040');
      yield 0.4;
      for (let i = 0; i < 3; i++) {
        K.shoot(b, K.aim(b) + (i - 1) * 0.35, { speed: 110, kind: 'poison', r: 4, dmg: 10, homing: 0.8, life: 4, status: { id: 'poison', dur: 4, power: 3 } });
        yield 0.15;
      }
    },
  });

  A.add({
    id: 'helen.radiance',
    *run(b, K) {
      b.moveMode = 'stand';
      for (let i = 0; i < 3; i++) {
        const P = K.P();
        K.bomb(P.x, P.y, 28, 1.0, 16, { color: '#ff70c0', fx: '#ffb0e0', attacker: b });
        yield 0.45;
      }
      yield 0.5;
    },
  });

  A.add({
    id: 'helen.illusions', noClone: true,
    *run(b, K) {
      b.moveMode = 'stand';
      K.teleCircle(b.x, b.y, b.r + 14, 0.6, '#ffd0f0');
      yield 0.6;
      const n = b.phase === 2 ? 4 : 2;
      for (let i = 0; i < n; i++) {
        K.spawnClone(b, {
          hp: 40, life: 14, restT: 0.8 + i * 0.3,
          attacks: [['helen.heartFan', 2], ['helen.poisonBolts', 1]],
          init: c => { c.data.artOverride = { noShadow: true }; c.data.illusion = true; },
        });
      }
      // The real Helen repositions so the player has to track her.
      const pt = K.randPoint(64);
      K.teleport(b, pt.x, pt.y);
      yield 0.3;
    },
  });

  // Charm: a clearly telegraphed pink wave; getting hit reverses your controls briefly.
  A.add({
    id: 'helen.charm',
    *run(b, K) {
      b.moveMode = 'stand';
      G.FX.text(b.x, b.y - b.r - 16, 'CHARM', '#ff70c0');
      K.teleWarn(b.x, b.y, 60, 1.0, '#ff70c0');
      yield 1.0;
      K.shockwave(b.x, b.y, {
        speed: 120, maxR: 360, thick: 10, dmg: 5, color: '#ff70c0', owner: b,
        onHit: P => P.status.apply('charm', { dur: 2.5 }),
      });
      yield 0.5;
    },
  });

  A.add({
    id: 'helen.storm',
    *run(b, K) {
      b.moveMode = 'stand';
      K.teleCircle(b.x, b.y, 150, 0.8, '#8080ff');
      yield 0.8;
      K.zone('gravity', { x: b.x, y: b.y, r: 160, life: 4, follow: b, data: { pull: 55 } });
      for (let i = 0; i < 8; i++) {
        K.ring(b, 6, { speed: 90, kind: 'heart', r: 3, dmg: 9 }, i * 0.4);
        yield 0.5;
      }
    },
  });

  G.Bosses.add({
    id: 'helen', name: 'Helen of Troy', title: 'The Face That Launched a Thousand Ships', short: 'Helen', level: 3,
    hp: 2400, r: 8, speed: 50, dmg: 12, move: 'keep', keepRange: [100, 170], rest: [1.0, 1.7], phase2At: 0.5,
    phase2Text: 'the winds turn wild',
    art: { type: 'humanoid', s: 1.5, body: '#f0e0f0', trim: '#e0b040', skin: '#f0d0b0', hair: '#e8c060', head: 'long', eye: '#305080', cape: '#c080a0' },
    attacks: {
      1: [['helen.heartFan', 3], ['helen.poisonBolts', 2], ['helen.radiance', 2], ['helen.illusions', 1.5], ['helen.charm', 1.5], ['helen.storm', 1]],
      2: [['helen.heartFan', 2], ['helen.poisonBolts', 2], ['helen.radiance', 2], ['helen.illusions', 2], ['helen.charm', 1.5], ['helen.storm', 1.5]],
    },
    // The real Helen glitters gold (illusions don't, and cast no shadow).
    drawExtra(b) {
      if (b.data.illusion) return;
      if (Math.random() < 0.3) G.FX.particle(b.x + (Math.random() - 0.5) * 14, b.y - 10 + (Math.random() - 0.5) * 16, 0, -8, 0.5, '#ffe070');
    },
    onPhase2(b) { G.World.room.windChaos = true; G.World.room.hazardLevel = 1.5; },
    trophy: { icon: 'mirror', color: '#f0c040' },
  });
})();
