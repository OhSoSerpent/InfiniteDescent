// The live world: current level/room, entity lists, room transitions, waves,
// boss fights, and the main update/draw of gameplay.
(function () {
  'use strict';
  const U = G.U, D = G.Draw, TS = G.CFG.TILE, T = G.T;
  const FADE = 0.18;
  const OPPOSITE = { N: 'S', S: 'N', E: 'W', W: 'E' };

  const W = {
    level: null, room: null, player: null,
    enemies: [], projectiles: [], zones: [], effects: [],
    time: 0, inputLocked: false, bossIntro: false, boss: null,
    trans: null, flowG: null, flowF: null,
    waveIndex: 0, waveDelay: 0, reveal: null, enteredFrom: null,

    reset() {
      this.level = null; this.room = null; this.player = null;
      this.enemies = []; this.projectiles = []; this.zones = []; this.effects = [];
      this.time = 0; this.inputLocked = false; this.bossIntro = false; this.boss = null; this.trans = null;
      this.reveal = null;
      G.FX.clear();
    },

    loadLevel(level, player) {
      this.level = level;
      this.player = player;
      this.enterRoom(level.start, null);
    },

    // ------------------------------------------------------------ rooms
    enterRoom(room, viaDoor) {
      const prev = this.room;
      this.enemies = []; this.projectiles = []; this.zones = []; this.effects = [];
      G.FX.clear();
      this.room = room;
      this.flowG = new G.FlowField(room, false);
      this.flowF = new G.FlowField(room, true);
      this.boss = null; this.bossIntro = false;
      const P = this.player;
      let pos;
      let entry = null;
      if (viaDoor && prev) {
        entry = room.doors.find(d => d.to === prev && d.side === OPPOSITE[viaDoor.side]) || room.doors.find(d => d.to === prev);
      }
      if (entry) {
        const [a, b] = entry.tiles;
        const cx = (a[0] + b[0] + 1) / 2 * TS, cy = (a[1] + b[1] + 1) / 2 * TS;
        const inset = 2.2 * TS;
        pos = { x: cx + (entry.side === 'W' ? inset : entry.side === 'E' ? -inset : 0), y: cy + (entry.side === 'N' ? inset : entry.side === 'S' ? -inset : 0) };
        pos = room.nearestGround(pos.x, pos.y);
      } else {
        pos = room.spawn || room.nearestGround(room.pxW / 2, room.pxH / 2);
      }
      this.enteredFrom = entry;
      P.x = pos.x; P.y = pos.y; P.vx = 0; P.vy = 0; P.kx = 0; P.ky = 0; P.trail = [];
      P.lastSafe = { x: pos.x, y: pos.y };
      P.dashT = 0;
      const first = !room.visited;
      room.visited = true;
      this.roomHit = false;
      G.Cam.snap(P.x, P.y, room.pxW, room.pxH);
      this.reveal = null;
      if ((room.type === 'combat') && !room.cleared) {
        room.locked = true;
        this.waveIndex = 0;
        this.waveDelay = 0.7;
        G.Audio.play('door');
      } else if ((room.type === 'boss') && !room.cleared) {
        room.locked = true;
        this.startBossFight();
      }
      G.Hooks.relic('onRoomEnter', { room, first, player: P });
      if (room.onEnter) room.onEnter(room, first);
    },

    // Thread of Ariadne: highlight the way in and the way toward the boss.
    revealDoors(dur) {
      const room = this.room;
      let exit = null;
      if (this.level && this.level.boss && room !== this.level.boss) {
        // BFS over rooms to find the first door on the path to the boss room.
        const prev = new Map([[room, null]]);
        const q = [room];
        while (q.length) {
          const r = q.shift();
          if (r === this.level.boss) break;
          for (const d of r.doors) if (d.to && !prev.has(d.to)) { prev.set(d.to, { r, d }); q.push(d.to); }
        }
        let cur = this.level.boss;
        while (prev.get(cur) && prev.get(cur).r !== room) cur = prev.get(cur).r;
        if (prev.get(cur)) exit = prev.get(cur).d;
      }
      this.reveal = { t: dur, entrance: this.enteredFrom, exit };
    },

    startBossFight() {
      const room = this.room;
      const id = G.Run.bossIdFor(this.level.index);
      const def = G.Bosses.get(id);
      room.bossFight = true;
      const b = this.spawnEnemy(id, room.pxW / 2, room.pxH * 0.32);
      this.boss = b;
      this.bossIntro = true;
      G.HUD.banner(def.name.toUpperCase(), def.title || '', 2.4);
      G.Audio.play('boss');
      G.BossKit.after(2.2, () => { this.bossIntro = false; });
    },

    onBossDefeated(b) {
      const room = this.room;
      room.bossFight = false;
      room.hazardLevel = 1;
      room.windChaos = false;
      for (const e of this.enemies) if (!e.dead && e !== b) { e.noCredit = true; G.Combat.kill(e, {}); }
      this.projectiles = this.projectiles.filter(p => p.team === 'player');
      this.zones = [];
      this.effects = this.effects.filter(e => e instanceof G.BossKit.Timer && e.keep);
      G.FX.shapes.length = 0;
      G.FX.flash('#ffffff', 0.4);
      G.Cam.shake(8, 0.8);
      G.FX.burst(b.x, b.y, 80, '#ffffff', 140, 1, 2);
      G.Run.onBossDefeated(b.bossDef);
      this.dropSkull(b);
      G.Game.slowmo(1.0);
      room.cleared = true;
      room.locked = false;
      const t = new G.BossKit.Timer({ dur: 1.6, fn: () => G.Game.afterBoss(room, b) });
      t.keep = true;
      this.addEffect(t);
    },

    // Levels 1-8: the boss leaves a skull; shooting it makes the next level hard mode.
    // (Not after level 9, whose next level is the final one, nor after Satan.)
    dropSkull(b) {
      if (G.Run.levelIndex > 8) return;
      const room = this.room;
      const cx = room.pxW / 2, cy = room.pxH / 2;
      let x = b.x, y = b.y;
      // Keep clear of the portal (centre) and the flawless-relic spot just below it.
      if (U.dist(x, y, cx, cy + 28) < 70) {
        const a = U.dist(x, y, cx, cy) > 1 ? U.angle(cx, cy, x, y) : 0;
        x = cx + Math.cos(a) * 90; y = cy + Math.sin(a) * 90;
      }
      const pt = room.nearestFree(x, y, 8, (tx, ty) => room.solidAt(tx, ty, true) || room.isPitTile(tx, ty));
      room.props.push(new G.Props.Skull({ x: pt.x, y: pt.y }));
      G.FX.burst(pt.x, pt.y, 20, '#e0d8c4', 60, 0.5);    },

    spawnWave(list) {
      const P = this.player;
      this.flowG.update(P.x, P.y); // spawn only where the player can walk to
      for (const entry of list) {
        const pt = this.randomReachable(90) || this.randomReachable(0) || this.randomFloor(32);
        const def = G.Enemies.get(entry.id);
        const opts = { elite: entry.elite };
        if (def.disguise || def.brain === 'falseally') opts.instant = true; // disguised enemies appear silently
        if (def.graveBound) {
          const gp = this.randomFloorNear(pt.x, pt.y, 18, 40) || pt;
          const grave = new G.Props.Grave({ x: gp.x, y: gp.y });
          this.room.props.push(grave);
          opts.grave = grave;
        }
        this.spawnEnemy(entry.id, pt.x, pt.y, opts);
      }
    },

    clearRoom() {
      const room = this.room;
      room.cleared = true;
      room.locked = false;
      for (const e of this.enemies) if (!e.dead) { e.noCredit = true; G.Combat.kill(e, {}); }
      this.projectiles = this.projectiles.filter(p => p.team === 'player');
      G.Audio.play('door');
      G.FX.text(this.player.x, this.player.y - 20, 'CLEARED', '#a0ffa0');
      if (!this.roomHit) G.Run.grantRoomBonus(); // only flawless rooms grant a stat bonus
      if (G.rng.chance(0.12)) this.addPickup(new G.Pickup('heart', room.pxW / 2, room.pxH / 2, 8));
      G.Hooks.relic('onRoomClear', { room, player: this.player });
    },

    // ------------------------------------------------------------ spawning
    spawnEnemy(id, x, y, opts = {}) {
      const room = this.room;
      const isBoss = G.Bosses.has(id);
      const def = isBoss ? G.Bosses.get(id) : G.Enemies.get(id);
      const e = isBoss ? new G.Boss(def, x, y, opts) : new G.Enemy(def, x, y, opts);
      // Check the spot with the enemy's real size (elites are 20% larger than their definition).
      const p = room.nearestFree(e.x, e.y, e.r, e.blockFn());
      e.x = p.x; e.y = p.y;
      if (opts.tint === 'frozen') {
        e.tint = 'frozen';
        e.artOverride = { body: '#8ec8e8', belly: '#c0e8ff', skin: '#c0e8ff', wing: '#70a8c8', legs: '#6090b0', glow: '#ffffff' };
        e.bloodColor = '#a0e0ff';
      }
      this.enemies.push(e);
      return e;
    },
    spawnPlayerBullet(o) {
      const b = new G.Projectile(o);
      if (b.instant) b.simulateInstant();
      else this.projectiles.push(b);
      return b;
    },
    spawnEnemyProjectile(o) {
      const { speed, ...rest } = o; // never pass 'speed' (a getter on Projectile)
      const p = new G.Projectile(Object.assign({ team: 'enemy' }, rest));
      this.projectiles.push(p);
      return p;
    },
    addZone(z) { this.zones.push(z); return z; },
    addEffect(e) { this.effects.push(e); return e; },
    addPickup(p) { this.room.pickups.push(p); return p; },

    dropLoot(e) {
      if (e.noCredit || e.isBoss || e.isClone) return;
      const g = e.def.gold || [0.4, 1, 2];
      if (G.rng.chance(g[0] * (e.elite ? 2 : 1))) {
        const n = G.rng.int(g[1], g[2]) * (e.elite ? 2 : 1);
        for (let i = 0; i < n; i++) this.addPickup(new G.Pickup('gold', e.x, e.y, 1));
      }
      if (G.rng.chance(e.elite ? 0.25 : 0.04)) this.addPickup(new G.Pickup('heart', e.x, e.y, 6));
    },
    damageProps(x, y, r, dmg) {
      for (const pr of this.room.props) if (pr.shootable && !pr.dead && U.dist(x, y, pr.x, pr.y) <= r + pr.r) pr.damage(dmg);
    },
    platformAt(x, y) {
      for (const pr of this.room.props) if (pr instanceof G.Props.Platform && pr.contains(x, y)) return pr;
      return null;
    },
    flowDir(x, y, flying) { return (flying ? this.flowF : this.flowG).dir(x, y); },

    randomFloor(margin = 32) {
      const room = this.room;
      for (let i = 0; i < 300; i++) {
        const x = G.rng.range(margin, room.pxW - margin), y = G.rng.range(margin, room.pxH - margin);
        const tx = Math.floor(x / TS), ty = Math.floor(y / TS);
        if (room.isStandable(tx, ty) && !room.nearDoor(tx, ty, 2)) return room.tileCenter(tx, ty);
      }
      return room.nearestGround(room.pxW / 2, room.pxH / 2);
    },
    randomFloorNear(x, y, min, max) {
      const room = this.room;
      for (let i = 0; i < 60; i++) {
        const a = Math.random() * U.TAU, d = G.rng.range(min, max);
        const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
        const tx = Math.floor(px / TS), ty = Math.floor(py / TS);
        if (room.isStandable(tx, ty)) return room.tileCenter(tx, ty);
      }
      return null;
    },
    // Random floor tile at least minDist from the player that is reachable on foot
    // (uses the ground flow field, which must be up to date for the player's position).
    randomReachable(minDist) {
      const P = this.player;
      for (let i = 0; i < 150; i++) {
        const p = this.randomFloor(24);
        if (U.dist(p.x, p.y, P.x, P.y) < minDist) continue;
        if (this.flowG.distAt(p.x, p.y) < G.FlowField.INF) return p;
      }
      return null;
    },
    randomFloorFar(x, y, minDist) {
      for (let i = 0; i < 80; i++) {
        const p = this.randomFloor(24);
        if (U.dist(p.x, p.y, x, y) >= minDist) return p;
      }
      return null;
    },

    startTransition(door) {
      this.trans = { phase: 'out', t: 0, door };
      G.Audio.play('door');
    },

    // ------------------------------------------------------------ update
    update(dt) {
      this.time += dt;
      if (this.trans) {
        this.trans.t += dt;
        if (this.trans.phase === 'out' && this.trans.t >= FADE) {
          const door = this.trans.door;
          this.enterRoom(door.to, door);
          this.trans = { phase: 'in', t: 0 };
        } else if (this.trans.phase === 'in' && this.trans.t >= FADE) this.trans = null;
        G.FX.update(dt);
        return;
      }
      const room = this.room, P = this.player;
      room.updateTiles(dt);
      room.updateHazards(dt);
      P.update(dt);
      if (this.enemies.length) { this.flowG.update(P.x, P.y); this.flowF.update(P.x, P.y); }

      for (let i = 0; i < this.enemies.length; i++) { const e = this.enemies[i]; if (!e.dead) e.update(dt); }
      this._separate();
      this.enemies = this.enemies.filter(e => !e.dead);

      for (let i = 0; i < this.projectiles.length; i++) this.projectiles[i].update(dt);
      this.projectiles = this.projectiles.filter(p => !p.dead);

      for (const z of this.zones) z.update(dt);
      this.zones = this.zones.filter(z => !z.dead);
      for (let i = 0; i < this.effects.length; i++) this.effects[i].update(dt);
      this.effects = this.effects.filter(e => !e.dead);
      for (let i = 0; i < room.props.length; i++) room.props[i].update(dt);
      room.props = room.props.filter(p => !p.dead);
      for (const p of room.pickups) p.update(dt);
      room.pickups = room.pickups.filter(p => !p.dead);
      G.FX.update(dt);
      if (this.reveal) { this.reveal.t -= dt; if (this.reveal.t <= 0) this.reveal = null; }

      this._waves(dt);
      this._doors();
      G.Cam.follow(P.x, P.y, room.pxW, room.pxH, dt);
    },

    _separate() {
      const es = this.enemies;
      for (let i = 0; i < es.length; i++) {
        const a = es[i];
        if (a.dead || a.spawning > 0 || a.disguised) continue;
        for (let j = i + 1; j < es.length; j++) {
          const b = es[j];
          if (b.dead || b.spawning > 0 || b.disguised) continue;
          const dx = b.x - a.x, dy = b.y - a.y;
          const min = a.r + b.r;
          const d2 = dx * dx + dy * dy;
          if (d2 >= min * min || d2 < 0.0001) continue;
          const d = Math.sqrt(d2), push = (min - d) * 0.5;
          const nx = dx / d, ny = dy / d;
          const aw = a.isBoss ? 0 : b.isBoss ? 1 : 0.5, bw = 1 - aw;
          if (!a.isBoss) a.move(-nx * push * aw * 2, -ny * push * aw * 2);
          if (!b.isBoss) b.move(nx * push * bw * 2, ny * push * bw * 2);
        }
      }
    },

    _waves(dt) {
      const room = this.room;
      if (!room.locked || room.type !== 'combat') return;
      this._unstick(dt);
      const alive = this.enemies.some(e => !e.dead && !e.noCredit);
      const corpses = room.props.some(p => p instanceof G.Props.Corpse && !p.dead);
      if (alive || corpses) return;
      if (this.waveDelay > 0) {
        this.waveDelay -= dt;
        if (this.waveDelay <= 0 && this.waveIndex < room.waves.length) this.spawnWave(room.waves[this.waveIndex++]);
        return;
      }
      if (this.waveIndex < room.waves.length) this.waveDelay = 0.8;
      else this.clearRoom();
    },

    // Safety net so a room can never stall: an enemy the player can neither reach nor see
    // (walled-in pocket, stuck in a wall, stranded by changing terrain) for 3 seconds is
    // moved to a reachable spot.
    _unstick(dt) {
      const room = this.room, P = this.player;
      for (const e of this.enemies) {
        if (e.dead || e.noCredit || e.spawning > 0 || e.disguised || e.isBoss || e.isClone) continue;
        const tx = Math.floor(e.x / TS), ty = Math.floor(e.y / TS);
        const inSolid = room.solidAt(tx, ty, true) || (!e.flying && room.isPitTile(tx, ty));
        const flow = e.flying ? this.flowF : this.flowG;
        const unreachable = inSolid || flow.distAt(e.x, e.y) >= G.FlowField.INF;
        if (unreachable && (inSolid || !room.los(P.x, P.y, e.x, e.y))) e.stuckT = (e.stuckT || 0) + dt;
        else e.stuckT = 0;
        if (e.stuckT < 3) continue;
        e.stuckT = 0;
        const pt = this.randomReachable(80) || this.randomReachable(0);
        if (!pt) continue;
        const free = room.nearestFree(pt.x, pt.y, e.r, e.blockFn());
        G.FX.burst(e.x, e.y, 10, '#ff4060', 40, 0.3);
        e.x = free.x; e.y = free.y; e.kx = 0; e.ky = 0;
        e.spawning = 0.6; // re-enter with the usual summon circle so it's visible and fair
      }
    },

    _doors() {
      const room = this.room, P = this.player;
      if (room.locked || P.dead || P.falling > 0) return;
      const tx = Math.floor(P.x / TS), ty = Math.floor(P.y / TS);
      for (const d of room.doors) {
        if (!d.tiles.some(([x, y]) => x === tx && y === ty)) continue;
        if (d.fake) {
          // "Some doors lead nowhere": bounce the player back.
          const c = room.nearestGround(room.pxW / 2, room.pxH / 2);
          const a = U.angle(P.x, P.y, c.x, c.y);
          P.x += Math.cos(a) * 18; P.y += Math.sin(a) * 18;
          P.knock(Math.cos(a) * 200, Math.sin(a) * 200);
          G.FX.text(P.x, P.y - 16, 'IT LEADS NOWHERE', '#c0a0ff');
          G.Audio.play('empty');
          d.revealedFake = true;
          return;
        }
        if (d.to) { this.startTransition(d); return; }
      }
    },

    // ------------------------------------------------------------ draw
    draw(ctx) {
      const room = this.room;
      if (!room) return;
      ctx.save();
      ctx.translate(-G.Cam.left, -G.Cam.top);
      room.draw(ctx);
      for (const p of room.props) if (p.layer < 0) p.draw(ctx);
      for (const z of this.zones) z.draw(ctx);
      for (const h of room.hazards) if (h.state && h.def.draw) h.def.draw(ctx, room, h.state, h.params);
      G.FX.drawGround(ctx);
      for (const e of this.effects) if (e.layer === 'ground') e.draw(ctx);
      for (const p of room.props) if (p.layer >= 0) p.draw(ctx);
      for (const p of room.pickups) p.draw(ctx);
      const ents = this.enemies.filter(e => !e.dead);
      if (this.player && !this.player.dead) ents.push(this.player);
      ents.sort((a, b) => a.y - b.y);
      for (const e of ents) e.draw(ctx);
      for (const p of this.projectiles) p.draw(ctx);
      for (const e of this.effects) if (e.layer === 'top') e.draw(ctx);
      G.FX.drawTop(ctx);
      this._drawReveal(ctx);
      ctx.restore();
      for (const h of room.hazards) if (h.state && h.def.drawScreen) h.def.drawScreen(ctx, room, h.state, h.params);
      G.FX.drawScreen(ctx);
      if (this.trans) {
        const k = this.trans.phase === 'out' ? this.trans.t / FADE : 1 - this.trans.t / FADE;
        D.alpha(U.clamp(k, 0, 1), () => D.rect(0, 0, G.CFG.W, G.CFG.H, '#000'));
      }
    },
    _drawReveal() {
      const room = this.room;
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 8);
      const mark = (d, col) => {
        for (const [x, y] of d.tiles) D.alpha(0.3 + 0.4 * pulse, () => D.rect(x * TS, y * TS, TS, TS, col));
      };
      const center = d => {
        const [a, b] = d.tiles;
        return { x: (a[0] + b[0] + 1) / 2 * TS, y: (a[1] + b[1] + 1) / 2 * TS - 3 };
      };
      if (this.reveal) {
        if (this.reveal.entrance) mark(this.reveal.entrance, '#60a0ff');
        if (this.reveal.exit) mark(this.reveal.exit, '#ffd040');
        for (const d of room.doors) if (d.fake) {
          const c = center(d);
          D.text('X', c.x, c.y, '#ff4040', { align: 'center' });
        }
      }
      for (const d of room.doors) if (d.fake && d.revealedFake) {
        const c = center(d);
        D.alpha(0.6, () => D.text('X', c.x, c.y, '#a06060', { align: 'center' }));
      }
    },
  };

  G.World = W;
})();
