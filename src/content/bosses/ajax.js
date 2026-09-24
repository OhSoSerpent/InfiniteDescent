// Level 5 boss: Ajax the Great. Giant shield and sword: huge sweeps, a shield slam
// shockwave, a rage state of continuous unstoppable charges, and a sword throw after
// which he fights with only his shield. Phase 2: the arena crumbles into the boiling
// blood while he speeds up.
(function () {
  'use strict';
  const U = G.U, T = G.T, TS = G.CFG.TILE;
  const A = G.Attacks;
  const armed = b => !b.data.swordless;

  A.add({
    id: 'ajax.wideSweep', cond: armed,
    *run(b, K) {
      b.moveMode = 'chase'; b.moveMult = 1.2;
      const start = G.World.time;
      yield () => K.dist(b) < 75 || G.World.time - start > 1.5;
      b.moveMode = 'stand';
      const a = K.face(b);
      K.teleArc(b.x, b.y, 84, a, 1.65, 0.8, '#ff4020');
      yield 0.8;
      K.melee(b, a, 84, 1.65, 26, { knock: 260 });
      K.shake(3, 0.2);
      yield 0.5;
    },
  });

  A.add({
    id: 'ajax.shieldSlam',
    *run(b, K) {
      b.moveMode = 'stand';
      K.teleCircle(b.x, b.y, 44, 0.8, '#ff4020');
      yield 0.8;
      K.sfx('slam'); K.shake(6, 0.35);
      K.hitCircle(b.x, b.y, 44, 22, { knock: 240 }, b);
      K.shockwave(b.x, b.y, { speed: 160, maxR: 400, thick: 8, dmg: 18, color: '#c09060', owner: b });
      yield 0.6;
    },
  });

  A.add({
    id: 'ajax.shieldBash',
    *run(b, K) {
      b.moveMode = 'stand';
      const a = K.face(b);
      K.teleLine(b.x, b.y, b.x + Math.cos(a) * 100, b.y + Math.sin(a) * 100, b.r * 2, 0.45, '#ff4020');
      yield 0.45;
      yield* K.charge(b, a, 300, 0.35, { dmg: 18, knock: 320 });
      yield 0.35;
    },
  });

  // Rage: ignores stagger and keeps charging.
  A.add({
    id: 'ajax.rage',
    *run(b, K) {
      G.FX.text(b.x, b.y - b.r - 16, 'RAGE', '#ff2020');
      b.unstaggerable = true;
      try {
        const n = b.phase === 2 ? 4 : 3;
        for (let i = 0; i < n; i++) {
          b.moveMode = 'stand';
          const a = K.face(b);
          K.teleLine(b.x, b.y, b.x + Math.cos(a) * 200, b.y + Math.sin(a) * 200, b.r * 2, 0.35, '#ff2020');
          yield 0.35;
          yield* K.charge(b, a, 320, 0.7, { dmg: 20, knock: 300 });
        }
      } finally {
        b.unstaggerable = false;
      }
      yield 0.6;
    },
  });

  A.add({
    id: 'ajax.swordThrow', cond: armed,
    *run(b, K) {
      b.moveMode = 'stand';
      const a = K.face(b);
      K.teleLine(b.x, b.y, b.x + Math.cos(a) * 300, b.y + Math.sin(a) * 300, 12, 0.55, '#ff4020');
      yield 0.55;
      K.shoot(b, a, { speed: 280, kind: 'sword', r: 6, dmg: 22, spin: 16, life: 1.8, wallMode: 'stick' });
      K.sfx('heavy');
      b.data.swordless = true;
      b.data.artOverride = { weapon: 'none' };
      K.after(7, () => {
        if (b.dead) return;
        b.data.swordless = false;
        b.data.artOverride = null;
        G.FX.text(b.x, b.y - b.r - 16, 'REARMED', '#c0c0c0');
      });
      yield 0.3;
    },
  });

  G.Bosses.add({
    id: 'ajax', name: 'Ajax the Great', title: 'Bulwark of the Achaeans', short: 'Ajax', level: 5,
    hp: 4200, r: 12, speed: 45, dmg: 20, move: 'chase', rest: [1.1, 1.7], rest2Scale: 0.65, phase2At: 0.5,
    phase2Text: 'the ground gives way to blood',
    art: { type: 'humanoid', s: 2.4, body: '#6a5a40', trim: '#b09060', skin: '#c89060', head: 'helmet', headCol: '#8a8a90', plume: '#303030', weapon: 'bigsword', shield: true, shieldCol: '#7a5a30', beard: '#3a2a1a' },
    attacks: {
      1: [['ajax.wideSweep', 3], ['ajax.shieldSlam', 2], ['ajax.shieldBash', 1.5], ['ajax.rage', 1], ['ajax.swordThrow', 1]],
      2: [['ajax.wideSweep', 3], ['ajax.shieldSlam', 2], ['ajax.shieldBash', 2], ['ajax.rage', 1.5], ['ajax.swordThrow', 1]],
    },
    onPhase2(b) { b.data.moveOverride = 'chase'; b.speed *= 1.3; b.data.collapse = 0; b.data.collapseT = 1.5; },
    update(b, dt) {
      if (b.phase !== 2 || b.isClone) return;
      // The arena crumbles into the boiling blood, ring by ring from the outside in.
      b.data.collapseT -= dt;
      if (b.data.collapseT > 0 || b.data.collapse >= 4) return;
      b.data.collapseT = 3.5;
      const layer = b.data.collapse++;
      const room = G.World.room, P = G.World.player;
      for (let y = 1; y < room.h - 1; y++) for (let x = 1; x < room.w - 1; x++) {
        const edge = Math.min(x - 1, y - 1, room.w - 2 - x, room.h - 2 - y);
        if (edge !== layer + 2 || room.tileAt(x, y) !== T.FLOOR) continue;
        if (room.nearDoor(x, y, 2) || room.occupiedByBoss(x, y)) continue;
        if (P && Math.abs(P.x - (x + 0.5) * TS) < 12 && Math.abs(P.y - (y + 0.5) * TS) < 12) continue;
        room.setTile(x, y, T.LIQUID);
      }
      G.Cam.shake(4, 0.4);
      G.Audio.play('slam');
    },
    trophy: { icon: 'sword', color: '#c8c8d0' },
  });
})();
