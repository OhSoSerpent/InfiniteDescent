// Level 8 boss: Loki. Constantly changes appearance (and so do his copies), so he can
// only be told apart by his attack patterns: each copy repeats ONE attack forever,
// while the real Loki keeps switching. Disguises himself as an object, reverses the
// player's controls, reshuffles the arena, and teleports behind the player to strike.
// Phase 2: the arena fills with copies.
(function () {
  'use strict';
  const U = G.U, T = G.T, TS = G.CFG.TILE;
  const A = G.Attacks;
  const LOOKS = [
    { body: '#206030', trim: '#f0c040', skin: '#d0b090', headCol: '#f0c040' },
    { body: '#30306a', trim: '#c0c0ff', skin: '#c0b0a0', headCol: '#c0c0ff' },
    { body: '#6a2030', trim: '#ff8060', skin: '#d8a080', headCol: '#ff8060' },
    { body: '#5a5020', trim: '#f0f060', skin: '#e0c0a0', headCol: '#e0e040' },
  ];
  const COPY_ATTACKS = ['loki.daggerFan', 'loki.greenBolts', 'loki.slash'];

  A.add({
    id: 'loki.daggerFan',
    *run(b, K) {
      b.moveMode = 'strafe';
      const a = K.face(b);
      K.teleArc(b.x, b.y, 26, a, 0.6, 0.35, '#40e060');
      yield 0.35;
      K.spread(b, a, 5, 0.8, { speed: 170, kind: 'dagger', r: 2, dmg: 11 });
      yield 0.4;
    },
  });

  A.add({
    id: 'loki.greenBolts',
    *run(b, K) {
      b.moveMode = 'strafe';
      K.teleCircle(b.x, b.y, b.r + 6, 0.35, '#40e060');
      yield 0.35;
      for (let i = 0; i < 3; i++) {
        K.shoot(b, K.aim(b, 0.25), { speed: 150, r: 3, color: '#40e060', dmg: 11, homing: 0.5 });
        yield 0.16;
      }
    },
  });

  A.add({
    id: 'loki.slash',
    *run(b, K) {
      b.moveMode = 'chase'; b.moveMult = 1.5;
      const start = G.World.time;
      yield () => K.dist(b) < 45 || G.World.time - start > 1.2;
      b.moveMode = 'stand';
      const a = K.face(b);
      K.teleArc(b.x, b.y, 44, a, 1.1, 0.3, '#40e060');
      yield 0.3;
      K.melee(b, a, 44, 1.1, 15, { knock: 160, color: '#a0ffb0' });
      yield 0.2;
    },
  });

  A.add({
    id: 'loki.copies', noClone: true,
    *run(b, K) {
      b.moveMode = 'stand';
      K.teleCircle(b.x, b.y, b.r + 12, 0.5, '#40e060');
      yield 0.5;
      const n = b.phase === 2 ? 6 : 3;
      for (let i = 0; i < n; i++) {
        const fixed = COPY_ATTACKS[i % COPY_ATTACKS.length];
        K.spawnClone(b, { hp: 30, life: 14, restT: 0.5 + i * 0.25, attacks: [fixed] });
      }
      const pt = K.randPoint(56);
      K.teleport(b, pt.x, pt.y);
      yield 0.3;
    },
  });

  // Disguised as an object; bursts out when you come close (or after a while).
  A.add({
    id: 'loki.disguise', noClone: true,
    *run(b, K) {
      b.moveMode = 'stand';
      G.FX.burst(b.x, b.y, 16, '#40e060', 50, 0.4);
      const pt = K.randPoint(48);
      b.x = pt.x; b.y = pt.y;
      b.data.disguise = G.rng.pick(['crate', 'statue', 'facade']);
      try {
        const start = G.World.time;
        yield () => K.dist(b) < 50 || G.World.time - start > 4 || b.hp < b.data.disguiseHp;
      } finally {
        b.data.disguise = null;
      }
      G.FX.text(b.x, b.y - b.r - 16, 'SURPRISE!', '#40e060');
      const a = K.face(b);
      K.melee(b, a, 50, 1.4, 16, { knock: 180, color: '#a0ffb0' });
      yield 0.3;
    },
  });

  A.add({
    id: 'loki.reverse',
    *run(b, K) {
      b.moveMode = 'stand';
      G.FX.text(b.x, b.y - b.r - 16, 'TRICKERY', '#40e060');
      K.teleWarn(b.x, b.y, 60, 0.9, '#40e060');
      yield 0.9;
      K.shockwave(b.x, b.y, {
        speed: 130, maxR: 360, thick: 10, dmg: 5, color: '#40e060', owner: b,
        onHit: P => P.status.apply('reverse', { dur: 2.5 }),
      });
      yield 0.4;
    },
  });

  // Reshuffle the arena's obstacles.
  A.add({
    id: 'loki.layout', noClone: true,
    *run(b, K) {
      b.moveMode = 'stand';
      K.teleCircle(b.x, b.y, b.r + 10, 0.6, '#40e060');
      yield 0.6;
      const room = K.room(), P = K.P();
      const obs = [];
      for (let ty = 1; ty < room.h - 1; ty++) for (let tx = 1; tx < room.w - 1; tx++) {
        if (room.tileAt(tx, ty) === T.OBST) { obs.push(room.obstStyle.get(room.idx(tx, ty)) || 'rock'); room.setTile(tx, ty, T.FLOOR); }
      }
      const count = Math.max(obs.length, 6);
      let placed = 0, guard = 0;
      while (placed < count && guard++ < 400) {
        const tx = G.rng.int(2, room.w - 3), ty = G.rng.int(2, room.h - 3);
        if (room.tileAt(tx, ty) !== T.FLOOR || room.nearDoor(tx, ty, 2) || room.occupiedByBoss(tx, ty)) continue;
        const c = room.tileCenter(tx, ty);
        if (U.dist(c.x, c.y, P.x, P.y) < 28) continue;
        room.setObstacle(tx, ty, obs[placed % Math.max(1, obs.length)] || 'crate');
        placed++;
      }
      G.FX.flash('#40e060', 0.2);
      K.sfx('boss');
      yield 0.3;
    },
  });

  A.add({
    id: 'loki.backstab',
    *run(b, K) {
      b.moveMode = 'stand';
      const P = K.P();
      const behind = P.aimAngle + Math.PI;
      G.FX.burst(b.x, b.y, 12, '#40e060', 50, 0.3);
      b.hidden = true;
      yield 0.25;
      const pt = K.room().nearestGround(P.x + Math.cos(behind) * 26, P.y + Math.sin(behind) * 26);
      b.x = pt.x; b.y = pt.y;
      b.hidden = false;
      G.FX.burst(b.x, b.y, 12, '#40e060', 50, 0.3);
      const a = K.face(b);
      K.teleArc(b.x, b.y, 42, a, 1.1, 0.3, '#40e060');
      yield 0.3;
      K.melee(b, a, 42, 1.1, 18, { knock: 180, color: '#a0ffb0' });
      yield 0.3;
    },
  });

  function applyLook(b, look) {
    b.data.artOverride = Object.assign({}, look);
    for (const c of b.children) if (c.isClone && !c.dead) c.data.artOverride = Object.assign({}, look);
  }

  G.Bosses.add({
    id: 'loki', name: 'Loki', title: 'The Shapeshifter', short: 'Loki', level: 8,
    hp: 5000, r: 8, speed: 95, dmg: 14, move: 'strafe', rest: [0.4, 0.8], phase2At: 0.5,
    phase2Text: 'the arena fills with lies',
    art: { type: 'humanoid', s: 1.5, body: '#206030', trim: '#f0c040', skin: '#d0b090', hair: '#1a1a1a', head: 'horns', headCol: '#f0c040', weapon: 'daggers', cape: '#103018' },
    attacks: {
      1: [['loki.daggerFan', 2], ['loki.greenBolts', 2], ['loki.slash', 2], ['loki.copies', 1.5], ['loki.disguise', 1], ['loki.reverse', 1], ['loki.layout', 0.7], ['loki.backstab', 1.5]],
      2: [['loki.daggerFan', 2], ['loki.greenBolts', 2], ['loki.slash', 2], ['loki.copies', 2], ['loki.disguise', 1], ['loki.reverse', 1.2], ['loki.layout', 0.8], ['loki.backstab', 1.5]],
    },
    init(b) { b.data.lookT = 4; },
    onPhase2(b) { b.pending.push('loki.copies'); },
    update(b, dt) {
      if (b.isClone) return;
      if (b.data.disguise && b.data.disguiseHp === undefined) b.data.disguiseHp = b.hp;
      if (!b.data.disguise) b.data.disguiseHp = undefined;
      // Constantly changing appearance — copies always match him.
      b.data.lookT -= dt;
      if (b.data.lookT <= 0) {
        b.data.lookT = 4;
        applyLook(b, G.rng.pick(LOOKS));
        G.FX.burst(b.x, b.y, 8, '#40e060', 30, 0.3);
      }
    },
    draw(b, ctx) {
      if (b.data.disguise) {
        const painter = G.Art.obstacles[b.data.disguise];
        painter(ctx, Math.round(b.x - 8), Math.round(b.y - 10), G.World.room.biome.palette, 0.4);
        return;
      }
      G.Art.humanoid(ctx, b.x, b.y, Object.assign({}, b.bossDef.art, b.data.artOverride || {}, {
        facing: b.facing, t: b.t, moving: true, flash: b.flash > 0, aim: b.aimAngle,
      }));
    },
    trophy: { icon: 'mask', color: '#40a040' },
  });
})();
