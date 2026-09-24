// Level 2 boss: Socrates. Spits lingering poison, warps the player's pace with
// slow (dodgeable) orbs, lays slowing fields, and twice per fight turns invincible
// while a swarm of flies attacks (he keeps attacking until the flies are dead).
(function () {
  'use strict';
  const A = G.Attacks;

  function poisonGlob(b, K, angle) {
    const p = K.shoot(b, angle, { speed: 130, kind: 'poison', r: 4, dmg: 10, life: 1.3, status: { id: 'poison', dur: 3, power: 3 } });
    // Poison lingers on the ground where the glob lands.
    p.onExpire = (proj, reason) => {
      if (reason === 'caught') return;
      G.World.addZone(new G.Zone('poison', { x: proj.x, y: proj.y, r: 14, life: 2.5, source: 'enemy' }));
    };
    return p;
  }

  A.add({
    id: 'socrates.poisonSpit',
    *run(b, K) {
      b.moveMode = 'stand';
      for (let v = 0; v < 3; v++) {
        const a = K.face(b);
        K.teleArc(b.x, b.y, 30, a, 0.5, 0.35, '#60c030');
        yield 0.35;
        for (const off of [-0.3, 0, 0.3]) poisonGlob(b, K, a + off);
        K.sfx('enemyShot');
        yield 0.5;
      }
    },
  });

  // Slow, lightly homing orbs that warp the player's speed (slower OR faster) on contact.
  A.add({
    id: 'socrates.paceWarp',
    *run(b, K) {
      b.moveMode = 'stand';
      K.teleCircle(b.x, b.y, b.r + 8, 0.6, '#c080ff');
      yield 0.6;
      for (let i = 0; i < 3; i++) {
        const fast = G.rng.chance(0.5);
        const p = K.shoot(b, K.aim(b) + (i - 1) * 0.5, {
          speed: 70, r: 5, kind: 'ball', color: fast ? '#ff80ff' : '#8060ff', dmg: 5, homing: 0.6, life: 6,
          status: { id: 'speedmod', dur: 3, power: fast ? 1.6 : 0.5 },
        });
        p.onHitPlayer = () => G.FX.text(K.P().x, K.P().y - 18, fast ? 'HASTENED' : 'SLUGGISH', '#c080ff');
        yield 0.3;
      }
    },
  });

  A.add({
    id: 'socrates.slowFields',
    *run(b, K) {
      b.moveMode = 'keep';
      const P = K.P();
      for (let i = 0; i < 3; i++) {
        const pt = K.pointNear(P.x, P.y, 0, 70);
        K.zone('slow', { x: pt.x, y: pt.y, r: 30, arm: 0.9, life: 5, data: { power: 0.5 } });
        yield 0.3;
      }
      yield 0.4;
    },
  });

  A.add({
    id: 'socrates.flySwarm', maxUses: 2, noClone: true,
    *run(b, K) {
      b.moveMode = 'stand';
      b.invulnerable = true;
      G.FX.text(b.x, b.y - b.r - 16, 'THE SWARM', '#c0c080');
      const flies = [];
      try {
        const n = 10;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * G.U.TAU;
          flies.push(K.summon(b, 'fly', b.x + Math.cos(a) * 30, b.y + Math.sin(a) * 30, { instant: true }));
        }
        yield 0.8;
        b.moveMode = 'keep';
        // Keep attacking until every fly is dead.
        let t = 0;
        while (flies.some(f => K.summonAlive(f)) && !b.dead) {
          const dt = yield;
          t += dt;
          if (t >= 1.8) {
            t = 0;
            const a = K.face(b);
            for (const off of [-0.25, 0.25]) poisonGlob(b, K, a + off);
          }
        }
      } finally {
        b.invulnerable = false;
      }
    },
  });

  G.Bosses.add({
    id: 'socrates', name: 'Socrates', title: 'The Gadfly of Athens', short: 'Socrates', level: 2,
    hp: 1900, r: 8, speed: 40, dmg: 12, move: 'keep', keepRange: [90, 160], rest: [1.2, 2.0],
    art: { type: 'humanoid', s: 1.6, body: '#e0dcd0', legs: '#b0aca0', skin: '#d8b090', hair: '#909090', beard: '#b0b0b0', eye: '#202020', belt: '#8a7a60' },
    bloodColor: '#a09880',
    attacks: { 1: [['socrates.poisonSpit', 3], ['socrates.paceWarp', 2], ['socrates.slowFields', 2]] },
    thresholds: [{ at: 0.66, attack: 'socrates.flySwarm' }, { at: 0.33, attack: 'socrates.flySwarm' }],
    trophy: { icon: 'cup', color: '#c0c0c0' },
  });
})();
