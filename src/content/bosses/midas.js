// Level 4 boss: King Midas. A huge golden king. Everything he touches turns to gold
// for a while (ground he walks over, obstacles he brushes). Golden bolts, gold floors,
// a grab that slows and holds you. Phase 2: hurls gilded pieces of the arena, and late
// in the fight gilds most of the floor.
(function () {
  'use strict';
  const U = G.U, T = G.T, TS = G.CFG.TILE;
  const A = G.Attacks;

  function goldPatch(x, y, r, life, arm = 0.5) {
    G.World.addZone(new G.Zone('gold', { x, y, r, life, arm, data: { dps: 10 } }));
  }

  A.add({
    id: 'midas.goldenFists',
    *run(b, K) {
      b.moveMode = 'chase'; b.moveMult = 1.3;
      const start = G.World.time;
      yield () => K.dist(b) < 50 || G.World.time - start > 1.5;
      b.moveMode = 'stand';
      for (let i = 0; i < 2; i++) {
        const a = K.face(b);
        K.teleArc(b.x, b.y, 46, a, 1.0, 0.5, '#f0c040');
        yield 0.5;
        K.melee(b, a, 46, 1.0, 20, { knock: 180, color: '#ffe080' });
        goldPatch(b.x + Math.cos(a) * 30, b.y + Math.sin(a) * 30, 18, 5);
        yield 0.3;
      }
    },
  });

  A.add({
    id: 'midas.goldBolts',
    *run(b, K) {
      b.moveMode = 'stand';
      for (let v = 0; v < 2; v++) {
        const a = K.face(b);
        K.teleArc(b.x, b.y, 30, a, 0.6, 0.45, '#f0c040');
        yield 0.45;
        K.spread(b, a, 5, 0.8, { speed: 135, kind: 'gold', r: 4, dmg: 13 });
        yield 0.5;
      }
    },
  });

  A.add({
    id: 'midas.goldFloor',
    *run(b, K) {
      b.moveMode = 'stand';
      const P = K.P();
      const n = b.phase === 2 ? 5 : 3;
      for (let i = 0; i < n; i++) {
        const pt = K.pointNear(P.x, P.y, 0, 90);
        K.zone('gold', { shape: 'rect', x: pt.x - 24, y: pt.y - 24, w: 48, h: 48, arm: 1.0, life: 5, data: { dps: 12 } });
        yield 0.2;
      }
      yield 0.6;
    },
  });

  // Lunge and grab: being caught slows and briefly holds the player.
  A.add({
    id: 'midas.grab',
    *run(b, K) {
      b.moveMode = 'stand';
      const a = K.face(b);
      K.teleLine(b.x, b.y, b.x + Math.cos(a) * 110, b.y + Math.sin(a) * 110, b.r * 2, 0.6, '#f0c040');
      yield 0.6;
      const res = yield* K.charge(b, a, 300, 0.38, {
        dmg: 12, knock: 20,
        status: { id: 'immobilize', dur: 1.2 },
        trail: bb => { if (Math.random() < 0.3) goldPatch(bb.x, bb.y + 8, 12, 4); },
      });
      if (res.hitPlayer) { K.P().status.apply('slow', { dur: 3, power: 0.5 }); G.FX.text(K.P().x, K.P().y - 18, 'GILDED', '#ffe080'); }
      yield 0.5;
    },
  });

  // Phase 2: rip up gilded obstacles and hurl them.
  A.add({
    id: 'midas.hurlArena',
    *run(b, K) {
      b.moveMode = 'stand';
      const room = K.room();
      const cands = [];
      for (let ty = 1; ty < room.h - 1; ty++) for (let tx = 1; tx < room.w - 1; tx++) {
        if (room.tileAt(tx, ty) === T.OBST) cands.push({ tx, ty, d: U.dist(b.x, b.y, (tx + 0.5) * TS, (ty + 0.5) * TS) });
      }
      cands.sort((p, q) => p.d - q.d);
      const picks = cands.slice(0, 3);
      for (let i = 0; i < 3; i++) {
        let from = null;
        const c = picks[i];
        if (c) {
          from = room.tileCenter(c.tx, c.ty);
          room.setTile(c.tx, c.ty, T.FLOOR);
          G.FX.burst(from.x, from.y, 10, '#f0c040', 40, 0.4);
        }
        const src = from || { x: b.x, y: b.y };
        K.teleCircle(src.x, src.y, 10, 0.4, '#f0c040');
        yield 0.4;
        const P = K.P();
        const ang = U.angle(src.x, src.y, P.x, P.y);
        K.shoot(b, ang, { from: src, speed: 190, kind: 'gold', r: 7, dmg: 18, breaksObstacles: true, life: 3 });
        K.sfx('heavy');
        yield 0.3;
      }
    },
  });

  // Late fight: gild most of the arena, leaving a few safe cells.
  A.add({
    id: 'midas.goldenAge', maxUses: 2, cond: b => b.hpFrac < 0.3,
    *run(b, K) {
      b.moveMode = 'stand';
      G.FX.text(b.x, b.y - b.r - 16, 'EVERYTHING IS GOLD', '#ffe080');
      const B = K.bounds();
      const cols = 4, rows = 3, cw = B.w / cols, ch = B.h / rows;
      const cells = [];
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) cells.push([x, y]);
      const safe = new Set(G.rng.shuffle(cells.slice()).slice(0, 4).map(c => c.join()));
      for (const [x, y] of cells) {
        if (safe.has(x + ',' + y)) continue;
        K.zone('gold', { shape: 'rect', x: B.x0 + x * cw, y: B.y0 + y * ch, w: cw, h: ch, arm: 1.5, life: 6, data: { dps: 16 } });
      }
      yield 2.0;
    },
  });

  G.Bosses.add({
    id: 'midas', name: 'King Midas', title: 'The Golden Touch', short: 'Midas', level: 4,
    hp: 3200, r: 11, speed: 40, dmg: 18, move: 'chase', rest: [1.0, 1.6], phase2At: 0.5,
    phase2Text: 'turns his touch on the arena',
    art: { type: 'humanoid', s: 2.2, body: '#e0b030', trim: '#fff0a0', skin: '#f0c850', hair: '#c09020', beard: '#d0a020', head: 'crown', crownCol: '#fff0a0', cape: '#a02020', weapon: 'fists', wcol: { skin: '#f0c850' } },
    bloodColor: '#f0c040',
    attacks: {
      1: [['midas.goldenFists', 3], ['midas.goldBolts', 2], ['midas.goldFloor', 2], ['midas.grab', 2]],
      2: [['midas.goldenFists', 2], ['midas.goldBolts', 2], ['midas.goldFloor', 2], ['midas.grab', 2], ['midas.hurlArena', 2], ['midas.goldenAge', 1.5]],
    },
    // Everything he touches turns to gold: a trail of gold floor, and gilded obstacles.
    update(b, dt) {
      b.data.trailT = (b.data.trailT || 0) - dt;
      if (b.data.trailT <= 0 && Math.hypot(b.vx, b.vy) > 5) {
        b.data.trailT = 0.35;
        goldPatch(b.x, b.y + 10, 11, 5, 0.6);
      }
      const room = G.World.room;
      const r = b.r + 6;
      for (let ty = Math.floor((b.y - r) / TS); ty <= Math.floor((b.y + r) / TS); ty++) {
        for (let tx = Math.floor((b.x - r) / TS); tx <= Math.floor((b.x + r) / TS); tx++) {
          if (room.tileAt(tx, ty) !== T.OBST) continue;
          const i = room.idx(tx, ty);
          if (room.obstStyle.get(i) !== 'gilded') { room.obstStyle.set(i, 'gilded'); room.cacheDirty = true; }
        }
      }
    },
    trophy: { icon: 'crown', color: '#f0c040' },
  });
})();
