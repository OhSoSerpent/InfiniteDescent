// Level 9 boss: Brutus. Two daggers, relentless close-range flurries, vanishes beneath
// the ice to erupt directly under the player, and freezes patches of the arena to be
// extremely slippery. Phase 2: the ice breaks apart into holes and he grows faster
// as the arena shrinks.
(function () {
  'use strict';
  const U = G.U, T = G.T, TS = G.CFG.TILE;
  const A = G.Attacks;

  A.add({
    id: 'brutus.flurry',
    *run(b, K) {
      b.moveMode = 'chase'; b.moveMult = 1.6;
      const start = G.World.time;
      yield () => K.dist(b) < 42 || G.World.time - start > 1;
      b.moveMode = 'stand';
      for (let i = 0; i < 4; i++) {
        const a = K.face(b);
        K.teleArc(b.x, b.y, 38, a, 0.7, 0.18, '#a0e0ff');
        yield 0.18;
        K.melee(b, a, 38, 0.7, 11, { knock: 90, color: '#e0f8ff' });
        yield 0.06;
      }
    },
  });

  A.add({
    id: 'brutus.submerge', noClone: true,
    *run(b, K) {
      b.moveMode = 'stand';
      G.FX.burst(b.x, b.y, 18, '#c0f0ff', 60, 0.4);
      b.hidden = true; b.invulnerable = true;
      const P = K.P();
      const tele = G.FX.telegraph({ shape: 'circle', x: P.x, y: P.y, r: 24, dur: 1.9, color: '#80c0ff' });
      try {
        // Track the player, then lock in place.
        let t = 0;
        while (t < 1.4 && !b.dead) { const dt = yield; t += dt; tele.x += (P.x - tele.x) * Math.min(1, dt * 6); tele.y += (P.y - tele.y) * Math.min(1, dt * 6); }
        yield 0.5;
        const pt = K.room().nearestGround(tele.x, tele.y);
        b.x = pt.x; b.y = pt.y;
        K.sfx('slam'); K.shake(5, 0.3);
        G.FX.burst(b.x, b.y, 24, '#c0f0ff', 90, 0.5, 2);
        K.hitCircle(b.x, b.y, 24, 22, { knock: 220 }, b);
        K.ring(b, 10, { speed: 120, kind: 'ice', r: 3, dmg: 10 });
      } finally {
        tele.dead = true;
        b.hidden = false; b.invulnerable = false;
      }
      yield 0.4;
    },
  });

  A.add({
    id: 'brutus.freezeFloor',
    *run(b, K) {
      b.moveMode = 'chase';
      const P = K.P();
      for (let i = 0; i < 3; i++) {
        const pt = K.pointNear(P.x, P.y, 0, 80);
        K.zone('ice', { x: pt.x, y: pt.y, r: 40, arm: 0.6, life: 7 });
        yield 0.2;
      }
      yield 0.3;
    },
  });

  A.add({
    id: 'brutus.daggerThrow',
    *run(b, K) {
      b.moveMode = 'stand';
      const a = K.face(b);
      K.teleArc(b.x, b.y, 26, a, 0.6, 0.3, '#a0e0ff');
      yield 0.3;
      K.spread(b, a, 5, 0.7, { speed: 190, kind: 'dagger', r: 2, dmg: 12 });
      yield 0.25;
    },
  });

  A.add({
    id: 'brutus.lunge',
    *run(b, K) {
      b.moveMode = 'stand';
      const a = K.face(b);
      K.teleLine(b.x, b.y, b.x + Math.cos(a) * 150, b.y + Math.sin(a) * 150, b.r * 2, 0.4, '#a0e0ff');
      yield 0.4;
      yield* K.charge(b, a, 360, 0.42, { dmg: 16, knock: 200 });
      yield 0.2;
    },
  });

  G.Bosses.add({
    id: 'brutus', name: 'Brutus', title: 'The Betrayer of Caesar', short: 'Brutus', level: 9,
    hp: 6000, r: 8, speed: 100, dmg: 15, move: 'chase', rest: [0.3, 0.7], phase2At: 0.5,
    phase2Text: 'the ice shatters',
    art: { type: 'humanoid', s: 1.5, body: '#6a2020', trim: '#e0d0c0', skin: '#c8b0a0', hair: '#1a1a1a', weapon: 'daggers', cape: '#3a1010' },
    attacks: {
      1: [['brutus.flurry', 3], ['brutus.submerge', 2], ['brutus.freezeFloor', 1.5], ['brutus.daggerThrow', 2], ['brutus.lunge', 2]],
      2: [['brutus.flurry', 3], ['brutus.submerge', 2.5], ['brutus.freezeFloor', 1], ['brutus.daggerThrow', 2], ['brutus.lunge', 2]],
    },
    onPhase2(b) { b.data.holes = 0; b.data.holeT = 1; b.data.cracks = []; },
    update(b, dt) {
      if (b.phase !== 2 || b.isClone) return;
      const room = G.World.room, P = G.World.player;
      // Warned cracks become permanent holes.
      for (let i = b.data.cracks.length - 1; i >= 0; i--) {
        const c = b.data.cracks[i];
        c.t -= dt;
        if (c.t <= 0) {
          for (const [x, y] of c.tiles) {
            if (room.occupiedByBoss(x, y)) continue;
            room.setTile(x, y, T.PIT);
          }
          b.data.cracks.splice(i, 1);
          G.Audio.play('explode');
        }
      }
      b.data.holeT -= dt;
      if (b.data.holeT <= 0 && b.data.holes < 18) {
        b.data.holeT = 2;
        for (let tries = 0; tries < 30; tries++) {
          const tx = G.rng.int(2, room.w - 4), ty = G.rng.int(2, room.h - 4);
          const tiles = [[tx, ty], [tx + 1, ty], [tx, ty + 1], [tx + 1, ty + 1]];
          if (!tiles.every(([x, y]) => (room.tileAt(x, y) === T.ICE || room.tileAt(x, y) === T.FLOOR) && !room.nearDoor(x, y, 2) && !room.isReserved(x, y))) continue;
          const c = room.tileCenter(tx, ty);
          if (P && U.dist(c.x, c.y, P.x, P.y) < 44) continue;
          for (const [x, y] of tiles) room.reserveTile(x, y);
          const crack = { tiles, t: 1.5 };
          b.data.cracks.push(crack);
          G.FX.telegraph({ shape: 'rect', x: tx * TS, y: ty * TS, w: TS * 2, h: TS * 2, dur: 1.5, color: '#305080' });
          b.data.holes++;
          b.moveMult = 1 + b.data.holes * 0.02;
          break;
        }
      }
    },
    trophy: { icon: 'dagger', color: '#c8c8d0' },
  });
})();
