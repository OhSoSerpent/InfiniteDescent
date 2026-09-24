// Level 7 boss: Heracles. Enormous and slow: devastating club smashes, thrown boulders,
// a triple shockwave slam, arena-crossing charges that smash obstacles, and hurling
// pieces of the environment. Phase 2: drops the club and brawls bare-handed — much
// faster, but he leaves bigger openings (takes extra damage between attacks).
(function () {
  'use strict';
  const U = G.U, T = G.T, TS = G.CFG.TILE;
  const A = G.Attacks;

  function shatter(p) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * U.TAU;
      G.World.spawnEnemyProjectile({ x: p.x, y: p.y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, r: 2, dmg: 8, kind: 'rock', life: 0.7, owner: p.owner });
    }
    G.Cam.shake(2, 0.15);
  }
  function hurl(b, K, from) {
    const P = K.P();
    const a = U.angle(from.x, from.y, P.x, P.y);
    const p = K.shoot(b, a, { from, speed: 170, kind: 'boulder', r: 9, dmg: 22, life: 3, breaksObstacles: true });
    p.onWall = shatter;
    p.onExpire = (pr, reason) => { if (reason === 'expire') shatter(pr); };
    K.sfx('heavy');
  }

  A.add({
    id: 'heracles.clubSmash', cond: b => b.phase === 1,
    *run(b, K) {
      b.moveMode = 'chase'; b.moveMult = 1.3;
      const start = G.World.time;
      yield () => K.dist(b) < 70 || G.World.time - start > 1.5;
      b.moveMode = 'stand';
      const a = K.face(b);
      const cx = b.x + Math.cos(a) * 34, cy = b.y + Math.sin(a) * 34;
      K.teleCircle(cx, cy, 36, 1.0, '#ff4020');
      yield 1.0;
      K.sfx('slam'); K.shake(6, 0.35);
      K.hitCircle(cx, cy, 36, 28, { knock: 280 }, b);
      K.shockwave(cx, cy, { speed: 130, maxR: 140, thick: 6, dmg: 14, color: '#c0a080', owner: b });
      yield 0.7;
    },
  });

  A.add({
    id: 'heracles.boulder',
    *run(b, K) {
      b.moveMode = 'stand';
      const n = b.phase === 2 ? 3 : 2;
      for (let i = 0; i < n; i++) {
        K.teleCircle(b.x, b.y - b.r, 10, 0.6, '#ff8040');
        yield 0.6;
        hurl(b, K, { x: b.x, y: b.y - b.r });
        yield 0.35;
      }
    },
  });

  A.add({
    id: 'heracles.tripleSlam',
    *run(b, K) {
      b.moveMode = 'stand';
      K.teleCircle(b.x, b.y, 40, 0.9, '#ff4020');
      yield 0.9;
      for (let i = 0; i < 3; i++) {
        K.sfx('slam'); K.shake(5, 0.3);
        K.hitCircle(b.x, b.y, 40, 22, { knock: 220 }, b);
        K.shockwave(b.x, b.y, { speed: 150 + i * 20, maxR: 420, thick: 8, dmg: 18, color: '#c0a080', owner: b });
        yield 0.5;
      }
      yield 0.4;
    },
  });

  A.add({
    id: 'heracles.charge',
    *run(b, K) {
      b.moveMode = 'stand';
      const a = K.face(b);
      K.teleLine(b.x, b.y, b.x + Math.cos(a) * 500, b.y + Math.sin(a) * 500, b.r * 2 + 4, 0.8, '#ff3020');
      yield 0.8;
      const res = yield* K.charge(b, a, 320, 1.6, { dmg: 24, knock: 340, breaks: true });
      if (res.hitWall) { K.sfx('slam'); K.shockwave(b.x, b.y, { speed: 140, maxR: 160, thick: 6, dmg: 12, owner: b }); }
      yield 0.6;
    },
  });

  A.add({
    id: 'heracles.throwEnvironment',
    *run(b, K) {
      b.moveMode = 'stand';
      const room = K.room();
      let best = null, bd = 150;
      for (let ty = 1; ty < room.h - 1; ty++) for (let tx = 1; tx < room.w - 1; tx++) {
        if (room.tileAt(tx, ty) !== T.OBST) continue;
        const c = room.tileCenter(tx, ty);
        const d = U.dist(b.x, b.y, c.x, c.y);
        if (d < bd) { bd = d; best = { tx, ty, c }; }
      }
      let from = { x: b.x, y: b.y - b.r };
      if (best) {
        room.setTile(best.tx, best.ty, T.FLOOR);
        G.FX.burst(best.c.x, best.c.y, 14, '#8a8680', 50, 0.4);
        from = best.c;
        G.FX.text(b.x, b.y - b.r - 16, 'HNNGH!', '#ffe0a0');
      }
      K.teleCircle(from.x, from.y, 12, 0.6, '#ff8040');
      yield 0.6;
      hurl(b, K, from);
      yield 0.4;
    },
  });

  // Phase 2 bare-handed attacks.
  A.add({
    id: 'heracles.punches', cond: b => b.phase === 2,
    *run(b, K) {
      b.moveMode = 'chase'; b.moveMult = 1.6;
      const start = G.World.time;
      yield () => K.dist(b) < 55 || G.World.time - start > 1.2;
      b.moveMode = 'stand';
      for (let i = 0; i < 3; i++) {
        const a = K.face(b);
        K.teleArc(b.x, b.y, 52, a, 0.9, 0.3, '#ff4020');
        yield 0.3;
        K.melee(b, a, 52, 0.9, 20, { knock: 220 });
        yield 0.15;
      }
      yield 0.8; // winded: a big opening
    },
  });

  A.add({
    id: 'heracles.leap', cond: b => b.phase === 2,
    *run(b, K) {
      const P = K.P();
      yield* K.leap(b, P.x, P.y, 0.9, { r: 40, dmg: 26, height: 60, shockwave: { speed: 150, maxR: 260, thick: 8, dmg: 16, color: '#c0a080' } });
      yield 0.9;
    },
  });

  G.Bosses.add({
    id: 'heracles', name: 'Heracles', title: 'Son of Zeus', short: 'Heracles', level: 7,
    hp: 7000, r: 13, speed: 36, dmg: 22, move: 'chase', rest: [1.4, 2.2], rest2Scale: 1.1, phase2At: 0.5,
    phase2Text: 'casts aside his club',
    art: { type: 'humanoid', s: 2.6, body: '#b08040', trim: '#d8b070', skin: '#c88858', hair: '#3a2410', beard: '#3a2410', head: 'wild', weapon: 'club', cape: '#c09050' },
    attacks: {
      1: [['heracles.clubSmash', 3], ['heracles.boulder', 2], ['heracles.tripleSlam', 2], ['heracles.charge', 1.5], ['heracles.throwEnvironment', 1.5]],
      2: [['heracles.punches', 3], ['heracles.leap', 2], ['heracles.tripleSlam', 1.5], ['heracles.charge', 1.5], ['heracles.throwEnvironment', 1], ['heracles.boulder', 1]],
    },
    onPhase2(b) {
      b.data.artOverride = { weapon: 'fists', wcol: { skin: '#c88858' } };
      b.speed *= 1.8;
      const club = G.BossKit.shoot(b, 0, { speed: 0, kind: 'club', r: 1, dmg: 0, life: 6 });
      club.x = b.x + 20; club.y = b.y;
    },
    update(b) {
      // Phase 2 openings: between attacks he takes extra damage.
      if (b.phase === 2 && !b.isClone) b.takenMult = b.runner ? 1 : 1.3;
    },
    trophy: { icon: 'club', color: '#7a5230' },
  });
})();
