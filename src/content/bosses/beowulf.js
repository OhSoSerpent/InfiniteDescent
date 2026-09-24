// Level 7 boss: Beowulf. A fast unarmed warrior: punch flurries, grabs that throw you
// toward hazards, leaping slams, and a roar that stuns if you are close. Phase 2: a
// monstrous form with a long-range claw rake and a savage bite, and no more healing drops.
(function () {
  'use strict';
  const U = G.U, T = G.T, TS = G.CFG.TILE;
  const A = G.Attacks;

  // Direction from the player toward the nearest hazard (liquid/pit), or a wall.
  function hazardDir(P) {
    const room = G.World.room;
    const px = Math.floor(P.x / TS), py = Math.floor(P.y / TS);
    let best = null, bd = Infinity;
    for (let ty = 1; ty < room.h - 1; ty++) for (let tx = 1; tx < room.w - 1; tx++) {
      const t = room.tileAt(tx, ty);
      if (t !== T.LIQUID && !room.isPitTile(tx, ty)) continue;
      const d = (tx - px) ** 2 + (ty - py) ** 2;
      if (d < bd && d < 144) { bd = d; best = { tx, ty }; }
    }
    if (best) return U.angle(P.x, P.y, (best.tx + 0.5) * TS, (best.ty + 0.5) * TS);
    return null;
  }

  A.add({
    id: 'beowulf.punches',
    *run(b, K) {
      b.moveMode = 'chase'; b.moveMult = 1.5;
      const start = G.World.time;
      yield () => K.dist(b) < 45 || G.World.time - start > 1;
      b.moveMode = 'stand';
      const n = b.phase === 2 ? 4 : 3;
      for (let i = 0; i < n; i++) {
        const a = K.face(b);
        K.teleArc(b.x, b.y, 40, a, 0.8, 0.2, '#ff4020');
        yield 0.2;
        K.melee(b, a, 40, 0.8, 12, { knock: 140 });
        yield 0.08;
      }
    },
  });

  A.add({
    id: 'beowulf.grab',
    *run(b, K) {
      b.moveMode = 'stand';
      const a = K.face(b);
      K.teleLine(b.x, b.y, b.x + Math.cos(a) * 100, b.y + Math.sin(a) * 100, b.r * 2, 0.5, '#ffb040');
      yield 0.5;
      const res = yield* K.charge(b, a, 300, 0.35, { dmg: 8, knock: 1, status: { id: 'immobilize', dur: 0.7 } });
      if (!res.hitPlayer) { yield 0.4; return; }
      const P = K.P();
      G.FX.text(P.x, P.y - 18, 'GRABBED', '#ffb040');
      yield 0.6;
      // Throw: toward the nearest hazard if there is one.
      const dir = hazardDir(P);
      const ta = dir !== null ? dir : K.aim(b);
      P.status.remove('immobilize');
      P.knock(Math.cos(ta) * 420, Math.sin(ta) * 420);
      G.Combat.damagePlayer(12, { source: 'enemy', attacker: b });
      K.sfx('slam');
      yield 0.4;
    },
  });

  A.add({
    id: 'beowulf.leapSlam',
    *run(b, K) {
      const P = K.P();
      yield* K.leap(b, P.x, P.y, 0.75, { r: 34, dmg: 20, height: 50, shockwave: { speed: 140, maxR: 180, thick: 6, dmg: 12, color: '#c0a080' } });
      yield 0.4;
    },
  });

  A.add({
    id: 'beowulf.roar',
    *run(b, K) {
      b.moveMode = 'stand';
      G.FX.text(b.x, b.y - b.r - 16, 'ROAR', '#ffe060');
      K.teleCircle(b.x, b.y, 74, 0.85, '#ffe060');
      yield 0.85;
      K.shake(5, 0.4); K.sfx('boss');
      G.FX.ringFx(b.x, b.y, 74, '#ffe060', 0.4);
      const P = K.P();
      if (P && U.dist(P.x, P.y, b.x, b.y) < 74 + P.r && !P.isInvulnerable()) {
        P.status.apply('stun', { dur: 1.2 });
        G.FX.text(P.x, P.y - 18, 'STUNNED', '#ffe060');
      }
      yield 0.4;
    },
  });

  // Phase 2 monster attacks.
  A.add({
    id: 'beowulf.clawRake', cond: b => b.phase === 2,
    *run(b, K) {
      b.moveMode = 'stand';
      const a = K.face(b);
      const lines = [-0.25, 0, 0.25].map(o => ({ ex: b.x + Math.cos(a + o) * 170, ey: b.y + Math.sin(a + o) * 170 }));
      for (const l of lines) K.teleLine(b.x, b.y, l.ex, l.ey, 8, 0.55, '#ff2020');
      yield 0.55;
      K.sfx('swing');
      for (const l of lines) {
        G.FX.tracer([{ x: b.x, y: b.y }, { x: l.ex, y: l.ey }], '#ff8080', 0.15);
        if (K.hitLine(b.x, b.y, l.ex, l.ey, 8, 18, { knock: 120 }, b) > 0) break;
      }
      yield 0.3;
    },
  });

  A.add({
    id: 'beowulf.bite', cond: b => b.phase === 2,
    *run(b, K) {
      b.moveMode = 'stand';
      const a = K.face(b);
      K.teleLine(b.x, b.y, b.x + Math.cos(a) * 90, b.y + Math.sin(a) * 90, b.r * 2, 0.45, '#ff2020');
      yield 0.45;
      yield* K.charge(b, a, 320, 0.3, { dmg: 10, knock: 60 });
      K.melee(b, K.face(b), 40, 0.9, 26, { knock: 200, color: '#ff6060' });
      yield 0.4;
    },
  });

  G.Bosses.add({
    id: 'beowulf', name: 'Beowulf', title: 'Bane of Grendel', short: 'Beowulf', level: 7,
    hp: 5200, r: 9, speed: 92, dmg: 16, move: 'chase', rest: [0.35, 0.75], rest2Scale: 0.6, phase2At: 0.5,
    phase2Text: 'becomes the monster',
    art: { type: 'humanoid', s: 1.8, body: '#5a6a7a', trim: '#8a9aaa', skin: '#e0b088', hair: '#e0c060', beard: '#e0c060', head: 'wild', weapon: 'fists', wcol: { skin: '#e0b088' }, cape: '#3a2a1a' },
    attacks: {
      1: [['beowulf.punches', 3], ['beowulf.grab', 2], ['beowulf.leapSlam', 2], ['beowulf.roar', 1.5]],
      2: [['beowulf.punches', 2], ['beowulf.grab', 1.5], ['beowulf.leapSlam', 2], ['beowulf.roar', 1], ['beowulf.clawRake', 2.5], ['beowulf.bite', 2.5]],
    },
    onPhase2(b) {
      b.noHealDrops = true; // fewer opportunities to heal
      b.data.artOverride = { skin: '#8a5a4a', body: '#3a2a2a', glow: '#ff2020', hair: '#5a3a20', beard: '#5a3a20', weapon: 'claws' };
    },
    trophy: { icon: 'claw', color: '#e8e0d0' },
  });
})();
