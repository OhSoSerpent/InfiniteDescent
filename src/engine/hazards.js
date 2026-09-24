// Biome hazard modules. A biome lists modules + params; each room instantiates them.
// Module fields: id, init(room, params) -> state, update(room, state, dt, params),
//   draw(ctx, room, state, params) (world space), drawScreen(ctx, room, state, params) (screen space)
// room.hazardLevel (default 1) lets bosses intensify hazards (e.g. Achilles' storm).
(function () {
  'use strict';
  const U = G.U, D = G.Draw, TS = G.CFG.TILE, T = G.T;
  const { W, H } = G.CFG;
  const Hz = G.Hazards;

  // ---------------------------------------------------------------- ambient particles (screen space)
  Hz.add({
    id: 'particles',
    init(room, p) {
      const parts = [];
      for (let i = 0; i < (p.count || 40); i++) parts.push({ x: Math.random() * W, y: Math.random() * H, s: 0.5 + Math.random() });
      return { parts };
    },
    update(room, st, dt, p) {
      const lvl = room.hazardLevel || 1;
      for (const q of st.parts) {
        q.x += (p.vx || 0) * q.s * dt * (p.windy ? lvl : 1) + Math.sin((G.World.time + q.s * 10) * (p.sway || 0)) * (p.swayAmt || 0) * dt;
        q.y += (p.vy || 20) * q.s * dt;
        if (q.y > H + 4) { q.y = -4; q.x = Math.random() * W; }
        if (q.y < -6) { q.y = H + 2; q.x = Math.random() * W; }
        if (q.x > W + 4) q.x = -4;
        if (q.x < -6) q.x = W + 2;
      }
    },
    drawScreen(ctx, room, st, p) {
      ctx.fillStyle = p.color || '#ffffff';
      ctx.globalAlpha = p.alpha || 0.6;
      for (const q of st.parts) {
        if (p.streak) {
          ctx.fillRect(Math.round(q.x), Math.round(q.y), 1, p.streak);
        } else {
          const s = p.size || 1;
          ctx.fillRect(Math.round(q.x), Math.round(q.y), s, s);
        }
      }
      ctx.globalAlpha = 1;
    },
  });

  // ---------------------------------------------------------------- screen tint / fog
  Hz.add({
    id: 'tint',
    init() { return {}; },
    update() {},
    drawScreen(ctx, room, st, p) {
      D.alpha(p.alpha || 0.15, () => D.rect(0, 0, W, H, p.color || '#000'));
      if (p.vignette) {
        const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, p.vignette);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      }
    },
  });

  // ---------------------------------------------------------------- wind gusts (Lust)
  Hz.add({
    id: 'wind',
    init() { return { phase: 'calm', t: 3 + Math.random() * 3, dir: 0, strength: 0, streaks: [] }; },
    update(room, st, dt, p) {
      const lvl = room.hazardLevel || 1;
      st.t -= dt;
      if (st.phase === 'calm' && st.t <= 0) {
        st.phase = 'warn'; st.t = 1.0;
        st.dir = room.windChaos ? Math.random() * U.TAU : (Math.random() < 0.5 ? 0 : Math.PI) + (Math.random() - 0.5) * 0.8;
      } else if (st.phase === 'warn' && st.t <= 0) {
        st.phase = 'gust'; st.t = (1.4 + Math.random()) * (room.windChaos ? 0.7 : 1);
        st.strength = (p.strength || 70) * (lvl > 1 ? 1.5 : 1);
      } else if (st.phase === 'gust') {
        if (room.windChaos) st.dir += (Math.random() - 0.5) * 4 * dt;
        const P = G.World.player;
        if (P && !P.dead && !P.isDashing()) P.push(Math.cos(st.dir) * st.strength, Math.sin(st.dir) * st.strength);
        if (st.t <= 0) { st.phase = 'calm'; st.t = (4 + Math.random() * 4) / lvl; }
      }
      room.wind = st;
      // streak visuals
      if (st.phase === 'gust' || st.phase === 'warn') {
        const n = st.phase === 'gust' ? 3 : 1;
        for (let i = 0; i < n; i++) if (Math.random() < 0.8) st.streaks.push({ x: Math.random() * W, y: Math.random() * H, life: 0.4 });
      }
      for (let i = st.streaks.length - 1; i >= 0; i--) {
        const s = st.streaks[i];
        s.life -= dt; s.x += Math.cos(st.dir) * 300 * dt; s.y += Math.sin(st.dir) * 300 * dt;
        if (s.life <= 0) st.streaks.splice(i, 1);
      }
    },
    drawScreen(ctx, room, st) {
      ctx.strokeStyle = 'rgba(230,230,255,0.35)'; ctx.lineWidth = 1;
      for (const s of st.streaks) {
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - Math.cos(st.dir) * 14, s.y - Math.sin(st.dir) * 14); ctx.stroke();
      }
      if (st.phase === 'warn') {
        const x = W / 2 + Math.cos(st.dir) * 60, y = 40;
        D.alpha(0.6 + 0.4 * Math.sin(G.World.time * 20), () => {
          D.text('WIND', W / 2, 30, '#d0d8ff', { align: 'center' });
          D.line(W / 2, y, x, y + Math.sin(st.dir) * 12, '#d0d8ff', 2);
        });
      }
    },
  });

  // ---------------------------------------------------------------- flying debris (needs 'wind')
  Hz.add({
    id: 'debris',
    init() { return { cd: 1 }; },
    update(room, st, dt, p) {
      const wind = room.wind;
      if (!wind || wind.phase !== 'gust' || !room.hazardsLive()) return;
      st.cd -= dt;
      if (st.cd > 0) return;
      st.cd = (p.interval || 0.45) / (room.hazardLevel || 1);
      const P = G.World.player;
      if (!P) return;
      // Spawn upwind of the player, off to the side, flying with the wind.
      const back = wind.dir + Math.PI;
      const dist = 200;
      const side = (Math.random() - 0.5) * 220;
      const sx = P.x + Math.cos(back) * dist + Math.cos(back + Math.PI / 2) * side;
      const sy = P.y + Math.sin(back) * dist + Math.sin(back + Math.PI / 2) * side;
      const sp = 150 + Math.random() * 60;
      const kinds = p.colors || ['#5a3a20', '#3a6a2a', '#6a6a60'];
      G.World.spawnEnemyProjectile({
        x: sx, y: sy, vx: Math.cos(wind.dir) * sp, vy: Math.sin(wind.dir) * sp, r: 3 + Math.random() * 2,
        dmg: p.dmg || 8, kind: 'debris', color: kinds[Math.floor(Math.random() * kinds.length)], life: 3,
        spin: (Math.random() - 0.5) * 20, pierceWalls: true, hazard: true,
      });
    },
  });

  // ---------------------------------------------------------------- sinking floor (Wrath)
  Hz.add({
    id: 'sinking',
    init() { return { cd: 2, sinks: [] }; },
    update(room, st, dt, p) {
      const live = room.hazardsLive();
      st.cd -= dt;
      if (live && st.cd <= 0 && st.sinks.length < (p.max || 3)) {
        st.cd = (p.interval || 3) / (room.hazardLevel || 1);
        const P = G.World.player;
        // Prefer areas near the player so it matters.
        const size = p.size || 2;
        for (let tries = 0; tries < 20; tries++) {
          const cx = Math.floor((P.x + (Math.random() - 0.5) * 160) / TS), cy = Math.floor((P.y + (Math.random() - 0.5) * 120) / TS);
          const tiles = [];
          let ok = true;
          for (let y = cy; y < cy + size && ok; y++) for (let x = cx; x < cx + size; x++) {
            if (room.tileAt(x, y) !== T.FLOOR || room.nearDoor(x, y, 3) || room.occupiedByBoss(x, y)) { ok = false; break; }
            tiles.push([x, y]);
          }
          if (!ok || !tiles.length) continue;
          for (const [x, y] of tiles) room.reserveTile(x, y);
          st.sinks.push({ tiles, phase: 'warn', t: 1.5 });
          break;
        }
      }
      for (let i = st.sinks.length - 1; i >= 0; i--) {
        const s = st.sinks[i];
        s.t -= dt;
        if (s.phase === 'warn' && s.t <= 0) {
          s.phase = 'sunk'; s.t = p.sunkTime || 4;
          for (const [x, y] of s.tiles) room.setTile(x, y, T.LIQUID);
        } else if (s.phase === 'sunk' && s.t <= 0) {
          for (const [x, y] of s.tiles) { room.setTile(x, y, T.FLOOR); room.releaseTile(x, y); }
          st.sinks.splice(i, 1);
        }
      }
    },
    draw(ctx, room, st) {
      for (const s of st.sinks) {
        if (s.phase !== 'warn') continue;
        for (const [x, y] of s.tiles) {
          D.alpha(0.3 + 0.3 * Math.sin(G.World.time * 16), () => D.rect(x * TS, y * TS, TS, TS, '#c02010'));
          if (Math.random() < 0.1) G.FX.particle(x * TS + Math.random() * TS, y * TS + Math.random() * TS, 0, -10, 0.4, '#ff4020');
        }
      }
    },
  });

  // ---------------------------------------------------------------- battlefield chaos (Violence)
  Hz.add({
    id: 'battlefield',
    init() { return { cd: 2.5 }; },
    update(room, st, dt, p) {
      if (!room.hazardsLive()) return;
      st.cd -= dt;
      if (st.cd > 0) return;
      st.cd = (p.interval || 3) * (0.7 + Math.random() * 0.6);
      const P = G.World.player;
      const K = G.BossKit;
      const roll = Math.random();
      if (roll < 0.45) {
        // Explosion near the player
        const pt = K.pointNear(P.x, P.y, 10, 70);
        K.bomb(pt.x, pt.y, 26, 1.2, p.dmg || 14, { source: 'hazard', fx: '#ff8030' });
      } else if (roll < 0.8) {
        // Falling tree: a long line crashing down across the player's area
        const a = Math.random() * U.TAU, len = 90;
        const cx = P.x + (Math.random() - 0.5) * 40, cy = P.y + (Math.random() - 0.5) * 40;
        const x1 = cx - Math.cos(a) * len / 2, y1 = cy - Math.sin(a) * len / 2, x2 = cx + Math.cos(a) * len / 2, y2 = cy + Math.sin(a) * len / 2;
        K.teleLine(x1, y1, x2, y2, 12, 1.3, '#ff6020');
        K.after(1.3, () => {
          K.hitLine(x1, y1, x2, y2, 12, p.dmg || 14, { source: 'hazard' });
          G.Audio.play('slam'); K.shake(3, 0.2);
          for (let i = 0; i <= 8; i++) G.FX.burst(U.lerp(x1, x2, i / 8), U.lerp(y1, y2, i / 8), 3, i % 2 ? '#5a3a20' : '#ff7020', 40, 0.4);
        });
      } else {
        // Collapsing structure: a rectangle of rubble
        const w = 48, h = 32;
        const x = P.x - w / 2 + (Math.random() - 0.5) * 40, y = P.y - h / 2 + (Math.random() - 0.5) * 40;
        K.teleRect(x, y, w, h, 1.4, '#ff4020');
        K.after(1.4, () => {
          K.hitRect(x, y, w, h, (p.dmg || 14) * 1.2, { source: 'hazard' });
          G.Audio.play('explode'); K.shake(4, 0.25);
          for (let i = 0; i < 14; i++) G.FX.particle(x + Math.random() * w, y + Math.random() * h, (Math.random() - 0.5) * 60, (Math.random() - 0.5) * 60, 0.6, '#6a5a50', 2);
        });
      }
    },
  });

  // ---------------------------------------------------------------- traitors (Treachery)
  Hz.add({
    id: 'traitors',
    init() { return { cd: 5 }; },
    update(room, st, dt, p) {
      if (!room.hazardsLive()) return;
      st.cd -= dt;
      if (st.cd > 0) return;
      st.cd = (p.interval || 7) * (0.7 + Math.random() * 0.6);
      const cands = G.World.enemies.filter(e => !e.dead && !e.isBoss && !e.isClone && !e.disguised && e.spawning <= 0 && e.turncoat <= 0);
      if (cands.length < 2) return;
      const e = cands[Math.floor(Math.random() * cands.length)];
      e.turncoat = p.duration || 4;
      G.FX.text(e.x, e.y - 14, 'BETRAYAL!', '#40e0ff');
    },
  });
})();
