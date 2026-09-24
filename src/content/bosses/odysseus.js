// Level 8 boss: Odysseus. Ranged trickster: arrow volleys, arrows loosed from hidden
// positions, decoy copies that imitate his shots (the real one wears a red plume;
// copies don't), hidden pressure traps, and vanishing. Phase 2: raises a maze in the
// arena (some walls are false and hide traps) and teleports between its sections.
(function () {
  'use strict';
  const U = G.U, T = G.T, TS = G.CFG.TILE;
  const A = G.Attacks;

  function trap(K, x, y, hidden = true) {
    K.zone('trap', {
      x, y, r: 7, life: 30, data: {
        hidden,
        trigger: z => { K.bomb(z.x, z.y, 26, 0.45, 16, { color: '#ff6040' }); G.FX.text(z.x, z.y - 10, 'TRAP!', '#ff6040'); },
      },
    });
  }

  A.add({
    id: 'odysseus.volley',
    *run(b, K) {
      b.moveMode = 'keep';
      for (let v = 0; v < 3; v++) {
        const a = K.face(b);
        K.teleLine(b.x, b.y, b.x + Math.cos(a) * 60, b.y + Math.sin(a) * 60, 3, 0.3, '#ffa060');
        yield 0.3;
        K.spread(b, K.aim(b, 0.2), 3, 0.25, { speed: 230, kind: 'arrow', r: 2, dmg: 12 });
        yield 0.35;
      }
    },
  });

  // Vanish; arrows fly in from hidden spots at the arena's edges; reappear elsewhere.
  A.add({
    id: 'odysseus.hiddenArrows', noClone: true,
    *run(b, K) {
      b.moveMode = 'stand';
      G.FX.burst(b.x, b.y, 16, '#a0a0c0', 50, 0.4);
      b.hidden = true; b.invulnerable = true;
      try {
        const B = K.bounds();
        const shots = b.phase === 2 ? 6 : 4;
        for (let i = 0; i < shots; i++) {
          const P = K.P();
          const side = G.rng.int(0, 3);
          const sx = side === 0 ? B.x0 + 4 : side === 1 ? B.x1 - 4 : G.rng.range(B.x0, B.x1);
          const sy = side === 2 ? B.y0 + 4 : side === 3 ? B.y1 - 4 : G.rng.range(B.y0, B.y1);
          const a = U.angle(sx, sy, P.x, P.y);
          K.teleLine(sx, sy, sx + Math.cos(a) * 500, sy + Math.sin(a) * 500, 4, 0.6, '#ffa060');
          K.after(0.6, () => G.World.spawnEnemyProjectile({ x: sx, y: sy, vx: Math.cos(a) * 280, vy: Math.sin(a) * 280, r: 2, dmg: 13, kind: 'arrow', life: 3, owner: b, pierceWalls: true }));
          yield 0.35;
        }
        yield 0.6;
        const pt = K.randPoint(48);
        b.x = pt.x; b.y = pt.y;
      } finally {
        b.hidden = false; b.invulnerable = false;
        G.FX.burst(b.x, b.y, 16, '#a0a0c0', 50, 0.4);
      }
    },
  });

  A.add({
    id: 'odysseus.decoys', noClone: true,
    *run(b, K) {
      b.moveMode = 'stand';
      K.teleCircle(b.x, b.y, b.r + 10, 0.5, '#a0a0c0');
      yield 0.5;
      const n = b.phase === 2 ? 3 : 2;
      for (let i = 0; i < n; i++) {
        K.spawnClone(b, {
          hp: 40, life: 14, restT: 0.6 + i * 0.4, attacks: ['odysseus.volley'],
          init: c => { c.data.artOverride = { plume: null }; },
        });
      }
      const pt = K.randPoint(56);
      K.teleport(b, pt.x, pt.y);
      yield 0.3;
    },
  });

  A.add({
    id: 'odysseus.traps',
    *run(b, K) {
      b.moveMode = 'keep';
      const P = K.P();
      for (let i = 0; i < 3; i++) {
        const pt = K.pointNear(P.x + P.vx * 0.6, P.y + P.vy * 0.6, 10, 60);
        G.FX.burst(pt.x, pt.y, 5, '#806040', 20, 0.3);
        trap(K, pt.x, pt.y);
        yield 0.2;
      }
      yield 0.3;
    },
  });

  A.add({
    id: 'odysseus.vanish', noClone: true,
    *run(b, K) {
      b.moveMode = 'stand';
      G.FX.burst(b.x, b.y, 14, '#a0a0c0', 50, 0.4);
      b.hidden = true; b.invulnerable = true;
      try {
        yield 0.7;
        const P = K.P();
        const pt = K.pointNear(P.x, P.y, 90, 150);
        b.x = pt.x; b.y = pt.y;
      } finally {
        b.hidden = false; b.invulnerable = false;
        G.FX.burst(b.x, b.y, 14, '#a0a0c0', 50, 0.4);
      }
      yield 0.25;
      K.spread(b, K.aim(b), 3, 0.3, { speed: 230, kind: 'arrow', r: 2, dmg: 12 });
      yield 0.2;
    },
  });

  // Phase 2: build a maze. Some wall segments are false and conceal traps.
  function buildMaze(b) {
    const room = G.World.room, K = G.BossKit, P = G.World.player;
    const w = room.w, h = room.h;
    const segs = [];
    const x1 = Math.floor(w / 3), x2 = Math.floor(2 * w / 3), y1 = Math.floor(h / 2);
    for (let y = 2; y < h - 2; y++) { segs.push([x1, y]); segs.push([x2, y]); }
    for (let x = 2; x < w - 2; x++) segs.push([x, y1]);
    // Openings (3 tiles) in each wall line.
    const openings = new Set();
    const open = (cx, cy, vertical) => { for (let k = -1; k <= 1; k++) openings.add(vertical ? cx + ',' + (cy + k) : (cx + k) + ',' + cy); };
    open(x1, G.rng.int(4, y1 - 3), true); open(x1, G.rng.int(y1 + 3, h - 5), true);
    open(x2, G.rng.int(4, y1 - 3), true); open(x2, G.rng.int(y1 + 3, h - 5), true);
    open(G.rng.int(3, x1 - 2), y1, false); open(G.rng.int(x1 + 2, x2 - 2), y1, false); open(G.rng.int(x2 + 2, w - 4), y1, false);
    for (const [x, y] of segs) {
      if (openings.has(x + ',' + y)) continue;
      if (room.tileAt(x, y) !== T.FLOOR || room.nearDoor(x, y, 2) || room.occupiedByBoss(x, y)) continue;
      const c = room.tileCenter(x, y);
      if (P && Math.abs(P.x - c.x) < 14 && Math.abs(P.y - c.y) < 14) continue;
      if (G.rng.chance(0.12)) {
        // False path: an illusory wall with a trap behind it.
        room.setTile(x, y, T.FAKEWALL);
        trap(K, c.x, c.y, true);
      } else room.setTile(x, y, T.WALL);
    }
    G.Cam.shake(5, 0.5);
    G.Audio.play('slam');
    G.HUD.toast('THE ARENA BECOMES A LABYRINTH', '#c0a0ff');
  }

  G.Bosses.add({
    id: 'odysseus', name: 'Odysseus', title: 'Man of Many Wiles', short: 'Odysseus', level: 8,
    hp: 5200, r: 8, speed: 72, dmg: 14, move: 'keep', keepRange: [120, 190], rest: [0.8, 1.3], phase2At: 0.5,
    phase2Text: 'weaves a labyrinth',
    art: { type: 'humanoid', s: 1.5, body: '#3a5a7a', trim: '#c0a060', skin: '#d0a070', hair: '#3a2410', beard: '#3a2410', head: 'helmet', headCol: '#8a8a90', plume: '#e02020', weapon: 'bow', cape: '#2a3a5a' },
    attacks: {
      1: [['odysseus.volley', 3], ['odysseus.hiddenArrows', 2], ['odysseus.decoys', 1.5], ['odysseus.traps', 1.5], ['odysseus.vanish', 1.5]],
      2: [['odysseus.volley', 2], ['odysseus.hiddenArrows', 2], ['odysseus.decoys', 1.5], ['odysseus.traps', 1.5], ['odysseus.vanish', 3]],
    },
    onPhase2(b) { buildMaze(b); },
    trophy: { icon: 'bow', color: '#7a5230' },
  });
})();
