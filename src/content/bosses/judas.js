// Level 9 boss: Judas Iscariot. A towering, stationary figure at the centre: long chain
// lashes, frozen copies of enemies from earlier circles, a clearly telegraphed freeze,
// and walls of ice that divide the arena. Phase 2: stronger summons and the arena
// breaks apart. A final freezing wave covers nearly everything except one safe spot.
(function () {
  'use strict';
  const U = G.U, T = G.T, TS = G.CFG.TILE;
  const A = G.Attacks;
  const EARLY = ['wolf', 'boar', 'hollow_wolf', 'twin_boar', 'jilted_lover', 'gilded_spirit', 'heartbreaker'];
  const LATE = ['berserker_shade', 'heretic_knight', 'legionary', 'war_beast', 'deceiver', 'wrath_brute', 'soldier'];

  A.add({
    id: 'judas.chains',
    *run(b, K) {
      b.moveMode = 'stand';
      const n = b.phase === 2 ? 3 : 2;
      for (let v = 0; v < n; v++) {
        const base = K.aim(b, 0.2);
        const lines = [-0.3, 0, 0.3].map(o => ({ ex: b.x + Math.cos(base + o) * 280, ey: b.y + Math.sin(base + o) * 280 }));
        for (const l of lines) K.teleLine(b.x, b.y, l.ex, l.ey, 8, 0.7, '#a0a0c0');
        yield 0.7;
        K.sfx('swing');
        for (const l of lines) {
          G.FX.tracer([{ x: b.x, y: b.y }, { x: l.ex, y: l.ey }], '#c0c0d0', 0.2);
          K.hitLine(b.x, b.y, l.ex, l.ey, 8, 20, { knock: 160 }, b);
        }
        yield 0.35;
      }
    },
  });

  A.add({
    id: 'judas.summonFrozen',
    *run(b, K) {
      b.moveMode = 'stand';
      K.teleCircle(b.x, b.y, b.r + 14, 0.7, '#a0e0ff');
      yield 0.7;
      const pool = b.phase === 2 ? LATE : EARLY;
      const n = b.phase === 2 ? 4 : 3;
      for (let i = 0; i < n; i++) {
        const pt = K.pointNear(b.x, b.y, 50, 110);
        K.summon(b, G.rng.pick(pool), pt.x, pt.y, { tint: 'frozen', elite: b.phase === 2 && G.rng.chance(0.4) });
      }
      yield 0.4;
    },
  });

  // Telegraphed freeze: step out of the ring before it closes.
  A.add({
    id: 'judas.freeze',
    *run(b, K) {
      b.moveMode = 'stand';
      const P = K.P();
      const x = P.x, y = P.y;
      G.FX.text(P.x, P.y - 20, 'FREEZE', '#a0e0ff');
      K.teleCircle(x, y, 28, 1.2, '#a0e0ff');
      K.teleWarn(x, y, 40, 1.2, '#ffffff');
      yield 1.2;
      G.FX.burst(x, y, 24, '#e0f8ff', 60, 0.5);
      if (U.dist(P.x, P.y, x, y) <= 28 + P.r && !P.isInvulnerable()) {
        P.status.apply('freeze', { dur: 1.5 });
        G.Combat.damagePlayer(8, { source: 'enemy', attacker: b });
      }
      yield 0.3;
    },
  });

  A.add({
    id: 'judas.iceWall',
    *run(b, K) {
      b.moveMode = 'stand';
      const room = K.room(), P = K.P();
      const vertical = G.rng.chance(0.5);
      const at = vertical ? Math.floor(P.x / TS) + G.rng.pick([-2, 2]) : Math.floor(P.y / TS) + G.rng.pick([-2, 2]);
      const len = vertical ? room.h : room.w;
      const gap = G.rng.int(3, len - 5);
      const tiles = [];
      for (let i = 1; i < len - 1; i++) {
        if (i >= gap && i < gap + 3) continue;
        const x = vertical ? at : i, y = vertical ? i : at;
        const t = room.tileAt(x, y);
        if ((t !== T.ICE && t !== T.FLOOR) || room.nearDoor(x, y, 2) || room.occupiedByBoss(x, y) || room.isReserved(x, y)) continue;
        const c = room.tileCenter(x, y);
        if (U.dist(c.x, c.y, P.x, P.y) < 16) continue;
        tiles.push([x, y, t]);
      }
      for (const [x, y] of tiles) K.teleRect(x * TS, y * TS, TS, TS, 0.8, '#a0e0ff');
      yield 0.8;
      const P2 = K.P();
      const raised = [];
      for (const [x, y, t] of tiles) {
        const c = room.tileCenter(x, y);
        if (Math.abs(c.x - P2.x) < 12 && Math.abs(c.y - P2.y) < 12) continue; // never entomb the player
        room.setObstacle(x, y, 'iceblock');
        room.reserveTile(x, y);
        raised.push([x, y, t]);
      }
      K.sfx('slam');
      // The walls melt after a while.
      const t = K.after(8, () => {
        for (const [x, y, orig] of raised) { if (room.tileAt(x, y) === T.OBST) room.setTile(x, y, orig); room.releaseTile(x, y); }
      });
      t.keep = true;
      yield 0.3;
    },
  });

  // Final attack: a freezing wave covers everything except one small safe circle.
  A.add({
    id: 'judas.finalFreeze', maxUses: 1, noClone: true,
    *run(b, K) {
      b.moveMode = 'stand';
      b.invulnerable = true;
      try {
        const P = K.P();
        let safe = null;
        for (let i = 0; i < 40; i++) {
          const p = K.randPoint(48);
          if (U.dist(p.x, p.y, P.x, P.y) > 110 && U.dist(p.x, p.y, b.x, b.y) > 40) { safe = p; break; }
        }
        if (!safe) safe = K.randPoint(48);
        G.HUD.banner('JUDAS', 'reach the light before the freeze', 2);
        const B = K.bounds();
        G.FX.telegraph({ shape: 'rect', x: B.x0, y: B.y0, w: B.w, h: B.h, dur: 3.8, color: '#6090c0' });
        G.FX.telegraph({ shape: 'circle', x: safe.x, y: safe.y, r: 28, dur: 3.8, color: '#ffffa0' });
        yield 3.8;
        G.FX.flash('#c0f0ff', 0.6);
        K.shake(8, 0.6);
        K.sfx('explode');
        if (U.dist(P.x, P.y, safe.x, safe.y) > 28 + P.r) {
          G.Combat.damagePlayer(45, { source: 'enemy', attacker: b });
          P.status.apply('freeze', { dur: 2 });
        }
      } finally {
        b.invulnerable = false;
      }
      yield 0.8;
    },
  });

  G.Bosses.add({
    id: 'judas', name: 'Judas Iscariot', title: 'Lowest of the Traitors', short: 'Judas', level: 9,
    hp: 9000, r: 13, speed: 0, dmg: 18, move: 'stand', rest: [1.1, 1.7], phase2At: 0.5, kbResist: 1, poise: 0,
    phase2Text: 'the lake itself breaks',
    art: { type: 'humanoid', s: 2.6, body: '#3a3a4a', trim: '#a0a0c0', skin: '#a8c0d0', hair: '#1a1a24', eye: '#80e0ff', glow: '#80e0ff', head: 'hood', headCol: '#2a2a38', weapon: 'chains', cape: '#1a1a28' },
    attacks: {
      1: [['judas.chains', 3], ['judas.summonFrozen', 1.5], ['judas.freeze', 2], ['judas.iceWall', 1.5]],
      2: [['judas.chains', 3], ['judas.summonFrozen', 2], ['judas.freeze', 2], ['judas.iceWall', 1.5]],
    },
    thresholds: [{ at: 0.12, attack: 'judas.finalFreeze' }],
    init(b) { b.data.moveOverride = 'stand'; },
    onPhase2(b) { b.data.breakT = 1.5; b.data.breaks = 0; b.data.cracks = []; },
    update(b, dt) {
      if (b.phase !== 2 || b.isClone) return;
      const room = G.World.room, P = G.World.player;
      for (let i = b.data.cracks.length - 1; i >= 0; i--) {
        const c = b.data.cracks[i];
        c.t -= dt;
        if (c.t > 0) continue;
        for (const [x, y] of c.tiles) {
          const cc = room.tileCenter(x, y);
          if (room.occupiedByBoss(x, y) || (P && Math.abs(cc.x - P.x) < 12 && Math.abs(cc.y - P.y) < 12)) continue;
          room.setTile(x, y, T.PIT);
        }
        b.data.cracks.splice(i, 1);
        G.Audio.play('explode');
      }
      // Break the lake into floes: 2-tile-wide cracks (dashable) creeping inward.
      b.data.breakT -= dt;
      if (b.data.breakT > 0 || b.data.breaks >= 8) return;
      b.data.breakT = 3;
      b.data.breaks++;
      const vertical = b.data.breaks % 2 === 0;
      const tiles = [];
      const at = vertical ? G.rng.int(3, room.w - 5) : G.rng.int(3, room.h - 5);
      const len = vertical ? room.h : room.w;
      for (let i = 1; i < len - 1; i++) for (let k = 0; k < 2; k++) {
        const x = vertical ? at + k : i, y = vertical ? i : at + k;
        const t = room.tileAt(x, y);
        if ((t !== T.ICE && t !== T.FLOOR) || room.nearDoor(x, y, 2) || room.isReserved(x, y)) continue;
        // Keep a small area around Judas intact.
        const cc = room.tileCenter(x, y);
        if (U.dist(cc.x, cc.y, b.x, b.y) < b.r + 36) continue;
        tiles.push([x, y]);
      }
      for (const [x, y] of tiles) G.FX.telegraph({ shape: 'rect', x: x * TS, y: y * TS, w: TS, h: TS, dur: 1.6, color: '#305080' });
      b.data.cracks.push({ tiles, t: 1.6 });
    },
    trophy: { icon: 'chain', color: '#a0a0b0' },
  });
})();
