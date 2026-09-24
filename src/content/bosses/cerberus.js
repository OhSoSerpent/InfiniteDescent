// Level 1 boss: Cerberus — a giant stone statue of the three-headed hound.
// Slow and tanky: flings rocks, exudes waves of flame, slams the ground (shockwave
// to dash through), and sometimes plants itself to rain rocks in a pattern with gaps.
(function () {
  'use strict';
  const U = G.U;
  const A = G.Attacks;

  function shatter(p) {
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.random() * 0.5;
      G.World.spawnEnemyProjectile({ x: p.x, y: p.y, vx: Math.cos(a) * 110, vy: Math.sin(a) * 110, r: 2, dmg: 6, kind: 'rock', life: 0.6, owner: p.owner });
    }
  }

  A.add({
    id: 'cerberus.rockFling',
    *run(b, K) {
      b.moveMode = 'stand';
      const n = b.phase === 2 ? 4 : 3;
      for (let i = 0; i < n; i++) {
        const a = K.face(b);
        K.teleLine(b.x, b.y, b.x + Math.cos(a) * 140, b.y + Math.sin(a) * 140, 8, 0.45, '#ffa060');
        yield 0.45;
        const p = K.shoot(b, K.aim(b, 0.25), { speed: 185, r: 5, kind: 'rock', dmg: 14 });
        p.onWall = shatter;
        K.sfx('heavy');
        yield b.phase === 2 ? 0.25 : 0.4;
      }
    },
  });

  A.add({
    id: 'cerberus.flameWaves',
    *run(b, K) {
      b.moveMode = 'stand';
      K.teleCircle(b.x, b.y, b.r + 10, 0.7, '#ff8020');
      yield 0.7;
      const waves = b.phase === 2 ? 4 : 3;
      for (let w = 0; w < waves; w++) {
        const n = 22, gap = Math.floor(Math.random() * n);
        for (let i = 0; i < n; i++) {
          if (Math.abs(i - gap) <= 1 || Math.abs(i - gap) >= n - 1) continue; // a 3-projectile gap
          K.shoot(b, (i / n) * U.TAU + w * 0.14, { speed: 85, kind: 'fire', r: 4, dmg: 12, status: { id: 'burn', dur: 2, power: 4 }, life: 5 });
        }
        K.sfx('enemyShot');
        yield 0.6;
      }
    },
  });

  A.add({
    id: 'cerberus.groundSlam',
    *run(b, K) {
      b.moveMode = 'stand';
      K.teleCircle(b.x, b.y, 50, 0.9, '#ff3030');
      yield 0.9;
      K.shake(6, 0.4); K.sfx('slam');
      K.hitCircle(b.x, b.y, 50, 20, { knock: 200 }, b);
      K.shockwave(b.x, b.y, { speed: 150, maxR: 420, thick: 8, dmg: 18, color: '#c0a080', owner: b });
      if (b.phase === 2) {
        yield 0.55;
        K.sfx('slam');
        K.shockwave(b.x, b.y, { speed: 170, maxR: 420, thick: 8, dmg: 18, color: '#c0a080', owner: b });
      }
      yield 0.6;
    },
  });

  // Stationary barrage: rocks fall on a grid around the player, leaving a few gaps.
  A.add({
    id: 'cerberus.barrage',
    *run(b, K) {
      b.moveMode = 'stand';
      K.teleCircle(b.x, b.y, b.r + 14, 1.0, '#ffa060');
      yield 1.0;
      const rounds = b.phase === 2 ? 2 : 1;
      for (let r = 0; r < rounds; r++) {
        const P = K.P();
        const cell = 30, n = 5;
        const ox = P.x - (n - 1) / 2 * cell, oy = P.y - (n - 1) / 2 * cell;
        const cells = [];
        for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) cells.push([x, y]);
        // Leave about a quarter of the cells as safe gaps.
        const gaps = new Set(G.rng.shuffle(cells.slice()).slice(0, 6).map(c => c.join()));
        for (const [x, y] of cells) {
          if (gaps.has(x + ',' + y)) continue;
          K.bomb(ox + x * cell, oy + y * cell, 15, 1.3, 16, { fx: '#a09080', color: '#ff5030', attacker: b });
        }
        K.sfx('heavy');
        yield 1.6;
      }
    },
  });

  G.Bosses.add({
    id: 'cerberus', name: 'Cerberus', title: 'Stone Warden of the Gate', short: 'Cerberus', level: 1,
    hp: 1300, r: 20, speed: 26, dmg: 18, move: 'chase', rest: [1.1, 1.9], phase2At: 0.5, kbResist: 1,
    phase2Text: 'the stone cracks and burns',
    art: { type: 'quadruped', s: 3, heads: 3, stone: true, body: '#8a8680', belly: '#a09a90', glow: '#ff6020' },
    bloodColor: '#8a8680',
    attacks: {
      1: [['cerberus.rockFling', 3], ['cerberus.flameWaves', 2], ['cerberus.groundSlam', 2], ['cerberus.barrage', 1.5]],
      2: [['cerberus.rockFling', 2], ['cerberus.flameWaves', 2], ['cerberus.groundSlam', 2], ['cerberus.barrage', 2]],
    },
    trophy: { icon: 'rock', color: '#8a8680' },
  });
})();
