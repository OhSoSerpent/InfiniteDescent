// Level 6 boss: Giordano Bruno. Fire and a flaming staff: walls of fire that split the
// arena, burning spirits, self-immolation (immune and aggressive for a few seconds),
// slow tracking fireballs. Phase 2: the arena's edges burn and the safe area shrinks.
(function () {
  'use strict';
  const U = G.U, TS = G.CFG.TILE;
  const A = G.Attacks;
  const BURN = { id: 'burn', dur: 2.5, power: 5 };

  A.add({
    id: 'bruno.fireWall',
    *run(b, K) {
      b.moveMode = 'stand';
      const B = K.bounds(), P = K.P();
      const vertical = G.rng.chance(0.5);
      const thick = 12;
      const len = vertical ? B.h : B.w;
      const gapSize = 40;
      const gaps = b.phase === 2 ? 1 : 2;
      const gapPos = [];
      for (let i = 0; i < gaps; i++) gapPos.push(G.rng.range(gapSize, len - gapSize * 2));
      // Build wall segments around the gaps, through the player's current line.
      const at = vertical ? U.clamp(P.x + G.rng.range(-30, 30), B.x0 + 20, B.x1 - 20) : U.clamp(P.y + G.rng.range(-30, 30), B.y0 + 20, B.y1 - 20);
      const cuts = gapPos.sort((a, c) => a - c);
      let s = 0;
      const segs = [];
      for (const g of cuts) { if (g > s) segs.push([s, g]); s = g + gapSize; }
      if (s < len) segs.push([s, len]);
      for (const [a0, a1] of segs) {
        const r = vertical ? { x: at - thick / 2, y: B.y0 + a0, w: thick, h: a1 - a0 } : { x: B.x0 + a0, y: at - thick / 2, w: a1 - a0, h: thick };
        K.teleRect(r.x, r.y, r.w, r.h, 1.0, '#ff6020');
        K.after(1.0, () => K.zone('fire', { shape: 'rect', x: r.x, y: r.y, w: r.w, h: r.h, life: 5, data: { dps: 16 } }));
      }
      yield 1.2;
    },
  });

  A.add({
    id: 'bruno.spirits',
    *run(b, K) {
      b.moveMode = 'keep';
      K.teleCircle(b.x, b.y, b.r + 12, 0.6, '#ff7020');
      yield 0.6;
      const n = b.phase === 2 ? 4 : 3;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * U.TAU;
        K.summon(b, 'burning_spirit', b.x + Math.cos(a) * 24, b.y + Math.sin(a) * 24, {});
      }
      yield 0.4;
    },
  });

  A.add({
    id: 'bruno.immolate',
    *run(b, K) {
      G.FX.text(b.x, b.y - b.r - 16, 'IMMOLATION', '#ff6020');
      K.teleCircle(b.x, b.y, b.r + 10, 0.6, '#ff6020');
      yield 0.6;
      b.invulnerable = true;
      b.data.burning = true;
      try {
        b.moveMode = 'chase'; b.moveMult = 1.8;
        let t = 0, trail = 0;
        while (t < 3.5 && !b.dead) {
          const dt = yield;
          t += dt; trail -= dt;
          if (trail <= 0) { trail = 0.15; K.zone('fire', { x: b.x, y: b.y + 6, r: 12, life: 2.5, arm: 0.25, data: { dps: 14 } }); }
          if (K.dist(b) < b.r + 8) K.hitCircle(b.x, b.y, b.r + 6, 14, { status: BURN, knock: 150 }, b);
        }
      } finally {
        b.invulnerable = false;
        b.data.burning = false;
      }
      yield 0.5;
    },
  });

  A.add({
    id: 'bruno.fireballs',
    *run(b, K) {
      b.moveMode = 'stand';
      K.teleCircle(b.x, b.y, b.r + 8, 0.5, '#ff6020');
      yield 0.5;
      const n = b.phase === 2 ? 6 : 4;
      for (let i = 0; i < n; i++) {
        K.shoot(b, K.aim(b) + (i / (n - 1) - 0.5) * 2.2, { speed: 80, kind: 'fire', r: 5, dmg: 14, homing: 1.0, life: 5.5, status: BURN });
        yield 0.12;
      }
      yield 0.5;
    },
  });

  G.Bosses.add({
    id: 'bruno', name: 'Giordano Bruno', title: 'Heretic of the Infinite', short: 'Bruno', level: 6,
    hp: 5200, r: 8, speed: 42, dmg: 14, move: 'keep', keepRange: [90, 160], rest: [1.3, 2.0], phase2At: 0.5,
    phase2Text: 'the pyre spreads',
    art: { type: 'humanoid', s: 1.6, body: '#2a2020', trim: '#a02010', skin: '#d8a880', eye: '#ff8020', head: 'hood', headCol: '#1a1414', weapon: 'staff', cape: '#401010' },
    attacks: {
      1: [['bruno.fireWall', 2.5], ['bruno.spirits', 2], ['bruno.immolate', 1.5], ['bruno.fireballs', 3]],
      2: [['bruno.fireWall', 2.5], ['bruno.spirits', 2], ['bruno.immolate', 2], ['bruno.fireballs', 3]],
    },
    // Phase 2: permanent fire creeps in from the edges, shrinking the safe area.
    onPhase2(b) { b.data.edge = 0; b.data.edgeT = 0.5; },
    update(b, dt) {
      if (b.data.burning && Math.random() < 0.6) G.FX.particle(b.x + (Math.random() - 0.5) * 16, b.y + (Math.random() - 0.5) * 16, 0, -30, 0.4, Math.random() < 0.5 ? '#ff9020' : '#ffe060', 2);
      if (b.phase !== 2 || b.isClone || b.data.edge >= 3) return;
      b.data.edgeT -= dt;
      if (b.data.edgeT > 0) return;
      b.data.edgeT = 5;
      const room = G.World.room;
      const k = b.data.edge++;
      const th = 22, x0 = TS + k * th, y0 = TS + k * th, w = room.pxW - 2 * TS - 2 * k * th, h = room.pxH - 2 * TS - 2 * k * th;
      const rects = [
        { x: x0, y: y0, w, h: th }, { x: x0, y: y0 + h - th, w, h: th },
        { x: x0, y: y0 + th, w: th, h: h - 2 * th }, { x: x0 + w - th, y: y0 + th, w: th, h: h - 2 * th },
      ];
      for (const r of rects) G.World.addZone(new G.Zone('fire', { shape: 'rect', x: r.x, y: r.y, w: r.w, h: r.h, arm: 1.5, life: 9999, data: { dps: 14 } }));
      G.HUD.toast('THE FLAMES CLOSE IN', '#ff8040');
    },
    drawExtra(b) { if (b.data.burning) G.Draw.alpha(0.35, () => G.Draw.circ(b.x, b.y, b.r + 6, '#ff6020')); },
    trophy: { icon: 'flame', color: '#ff8020' },
  });
})();
