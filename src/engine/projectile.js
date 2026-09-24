// Projectiles for both teams. Player bullets carry card-driven flags; enemy
// projectiles carry attack options (homing, boomerang, statuses, callbacks...).
(function () {
  'use strict';
  const U = G.U, D = G.Draw, TS = G.CFG.TILE;

  let nextId = 1;

  class Projectile {
    // o: see defaults below. team: 'player' | 'enemy'
    constructor(o) {
      Object.assign(this, {
        id: nextId++,
        team: 'enemy', x: 0, y: 0, vx: 0, vy: 0, r: 2,
        dmg: 10, fireMult: 1, crit: false,
        life: 2, age: 0, traveled: 0,
        kind: 'ball', color: '#ff4040', color2: null,
        dead: false, owner: null, weapon: null,
        // player-bullet flags
        instant: false, pierce: 0, pierceFalloff: 0, ricochet: 0, explode: null,
        ignite: false, poison: false, slow: false, curseChance: 0, chain: false, shrapnel: false,
        hydra: false, orb: false, styx: false, knock: 0, sub: false, noRevive: false,
        // enemy flags
        status: null, homing: 0, accel: 0, maxSpeed: 0, boomerang: null, wallMode: 'die',
        pierceWalls: false, breaksObstacles: false, hitsEnemies: false, hazard: false,
        onExpire: null, onWall: null, onHitPlayer: null, onUpdate: null, spin: 0, angle: 0,
        hitSet: null, hitsCount: 0, trail: null, tickT: 0,
      }, o);
      if (!this.hitSet) this.hitSet = new Set();
      this.angle = Math.atan2(this.vy, this.vx);
    }

    get speed() { return Math.hypot(this.vx, this.vy); }
    setVel(angle, speed) { this.vx = Math.cos(angle) * speed; this.vy = Math.sin(angle) * speed; }

    kill(reason) {
      if (this.dead) return;
      this.dead = true;
      if (this.team === 'player' && this.explode && !this.sub && reason !== 'split') {
        G.Combat.explosion(this.x, this.y, this.explode.r, this.dmg * this.fireMult * this.explode.factor * G.Combat.outgoingMult({ bullet: this }),
          { team: 'player', weapon: this.weapon, noRevive: this.noRevive });
      }
      if (this.onExpire) this.onExpire(this, reason);
    }

    update(dt) {
      if (this.dead) return;
      this.age += dt;
      if (this.age >= this.life) { this.kill('expire'); return; }
      if (this.onUpdate) this.onUpdate(this, dt);
      if (this.dead) return;

      // Hydra: split into three weaker bullets shortly after firing.
      if (this.hydra && !this.sub && this.age >= 0.12) {
        const a = Math.atan2(this.vy, this.vx), sp = this.speed;
        for (const off of [-0.26, 0, 0.26]) {
          G.World.spawnPlayerBullet(Object.assign(this._cloneBase(), {
            dmg: this.dmg * 0.4, sub: true, vx: Math.cos(a + off) * sp, vy: Math.sin(a + off) * sp,
            life: this.life - this.age, x: this.x, y: this.y, r: Math.max(1, this.r - 1),
          }));
        }
        this.kill('split');
        return;
      }

      // Steering behaviours (enemy projectiles mostly).
      if (this.homing) {
        const P = G.World.player;
        if (P && !P.dead) {
          const want = U.angle(this.x, this.y, P.x, P.y);
          const cur = Math.atan2(this.vy, this.vx);
          const d = U.clamp(U.angDiff(cur, want), -this.homing * dt, this.homing * dt);
          this.setVel(cur + d, this.speed);
        }
      }
      if (this.accel) {
        const sp = this.speed, ns = this.maxSpeed ? Math.min(this.maxSpeed, sp + this.accel * dt) : sp + this.accel * dt;
        if (sp > 0.001) { this.vx *= ns / sp; this.vy *= ns / sp; }
      }
      if (this.boomerang) {
        const bm = this.boomerang;
        if (!bm.returning && this.age >= bm.outTime) bm.returning = true;
        if (bm.returning) {
          const tgt = bm.to && !bm.to.dead ? bm.to : null;
          if (!tgt) { this.kill('expire'); return; }
          const a = U.angle(this.x, this.y, tgt.x, tgt.y);
          const sp = Math.min(bm.speed * 1.2, this.speed + bm.speed * 2 * dt);
          this.setVel(a, sp);
          if (U.dist(this.x, this.y, tgt.x, tgt.y) < tgt.r + 6) { if (bm.onCatch) bm.onCatch(this); this.kill('caught'); return; }
        } else {
          const sp = Math.max(bm.speed * 0.25, this.speed - bm.speed * dt / bm.outTime);
          const a = Math.atan2(this.vy, this.vx);
          this.setVel(a, sp);
        }
      }
      if (this.spin) this.angle += this.spin * dt; else this.angle = Math.atan2(this.vy, this.vx);

      // Orb bullets tick damage on everything inside them.
      if (this.orb) {
        this.tickT -= dt;
        if (this.tickT <= 0) {
          this.tickT = 0.3;
          for (const e of G.World.enemies) {
            if (e.dead || e.spawning > 0 || e.hidden) continue;
            if (U.dist(this.x, this.y, e.x, e.y) <= this.r + e.r) this._hitEnemy(e, 0.35, true);
          }
          // Orbs strike each shootable prop they pass over once.
          for (const pr of G.World.room.props) {
            if (!pr.shootable || pr.dead || this.hitSet.has(pr)) continue;
            if (U.dist(this.x, this.y, pr.x, pr.y) <= pr.r + this.r) { this.hitSet.add(pr); pr.damage(this.dmg * this.fireMult, this); }
          }
        }
      }

      // Move in small sub-steps for reliable collisions.
      const dist = Math.hypot(this.vx, this.vy) * dt;
      const steps = Math.max(1, Math.ceil(dist / 3));
      const sx = (this.vx * dt) / steps, sy = (this.vy * dt) / steps;
      for (let i = 0; i < steps && !this.dead; i++) {
        const px = this.x, py = this.y;
        this.x += sx; this.y += sy;
        this.traveled += Math.hypot(sx, sy);
        if (this.trail) this.trail.push({ x: this.x, y: this.y });
        if (!this.pierceWalls && this._wallCheck(px, py)) continue;
        if (this.dead) break;
        if (this.team === 'player') this._collidePlayerBullet();
        else this._collideEnemyProjectile();
      }
    }

    _cloneBase() {
      const keys = ['team', 'weapon', 'fireMult', 'crit', 'kind', 'color', 'ignite', 'poison', 'slow', 'curseChance',
        'pierce', 'pierceFalloff', 'ricochet', 'styx', 'knock', 'noRevive', 'instant', 'orb'];
      const o = {};
      for (const k of keys) o[k] = this[k];
      return o;
    }

    _wallCheck(px, py) {
      const room = G.World.room;
      const tx = Math.floor(this.x / TS), ty = Math.floor(this.y / TS);
      if (!room.blocksShot(tx, ty)) return false;
      if (this.breaksObstacles && room.tileAt(tx, ty) === G.T.OBST) {
        room.destroyObstacle(tx, ty);
        return false;
      }
      if (this.team === 'player' && this.ricochet > 0) {
        this.ricochet--;
        // Reflect on the axis that caused the collision.
        const ptx = Math.floor(px / TS), pty = Math.floor(py / TS);
        const hitX = room.blocksShot(tx, pty);
        const hitY = room.blocksShot(ptx, ty);
        if (hitX) this.vx = -this.vx;
        if (hitY) this.vy = -this.vy;
        if (!hitX && !hitY) { this.vx = -this.vx; this.vy = -this.vy; }
        this.x = px; this.y = py;
        G.FX.burst(px, py, 3, '#ffffa0', 30, 0.15);
        return true;
      }
      if (this.team === 'enemy' && this.wallMode === 'bounce') {
        const ptx = Math.floor(px / TS), pty = Math.floor(py / TS);
        const bx = room.blocksShot(tx, pty), by = room.blocksShot(ptx, ty);
        if (bx) this.vx = -this.vx;
        if (by) this.vy = -this.vy;
        if (!bx && !by) { this.vx = -this.vx; this.vy = -this.vy; }
        this.x = px; this.y = py;
        return true;
      }
      if (this.team === 'enemy' && this.wallMode === 'stick') {
        this.x = px; this.y = py; this.vx = 0; this.vy = 0;
        if (this.onWall) this.onWall(this);
        return true;
      }
      this.x = px; this.y = py;
      G.FX.burst(px, py, 3, this.color, 30, 0.15);
      if (this.onWall) this.onWall(this);
      this.kill('wall');
      return true;
    }

    _collidePlayerBullet() {
      if (this.orb) return; // orbs deal damage via ticks
      for (const e of G.World.enemies) {
        if (e.dead || e.spawning > 0 || e.hidden || this.hitSet.has(e)) continue;
        // Weak spots (e.g. Achilles' heel) are checked first.
        let partMult = 1, hit = false;
        if (e.hitParts) {
          for (const part of e.hitParts()) {
            if (U.dist(this.x, this.y, part.x, part.y) <= part.r + this.r) { partMult = part.mult; hit = true; if (part.onHit) part.onHit(this); break; }
          }
        }
        if (!hit && U.dist(this.x, this.y, e.x, e.y) <= e.r + this.r) hit = true;
        if (!hit) continue;
        this._hitEnemy(e, partMult, false);
        if (this.dead) return;
      }
      // Shootable props (graves, etc.)
      for (const pr of G.World.room.props) {
        if (!pr.shootable || pr.dead || this.hitSet.has(pr)) continue;
        if (U.dist(this.x, this.y, pr.x, pr.y) <= pr.r + this.r) {
          this.hitSet.add(pr);
          pr.damage(this.dmg * this.fireMult, this);
          if (!this.pierce && !this.styx) { this.kill('prop'); return; }
        }
      }
    }

    // factor: extra damage factor (orb ticks); tick = orb tick (never consumes the bullet)
    _hitEnemy(e, factor, tick) {
      const P = G.World.player;
      if (!tick) this.hitSet.add(e);
      const firstHit = !e.wasHit;
      let dmg = G.Combat.bulletDamage(this, e, factor);
      const kb = this.knock ? { x: this.vx / (this.speed || 1), y: this.vy / (this.speed || 1), power: this.knock } : null;
      const dealt = G.Combat.damageEnemy(e, dmg, {
        source: 'bullet', bullet: this, weapon: this.weapon, crit: this.crit, kb, noRevive: this.noRevive || this.styx,
      });
      e.wasHit = true;
      if (!tick) G.Audio.play(this.crit ? 'crit' : 'hit');
      // Statuses from cards
      if (!e.dead) {
        if (this.ignite) e.status.apply('burn', { weapon: this.weapon, power: 5, dur: 3 });
        if (this.poison) e.status.apply('poison', { weapon: this.weapon, power: 3, dur: 4, max: 3 });
        if (this.slow) e.status.apply('slow', { power: 0.4, dur: 1.5 });
        if (this.curseChance && Math.random() < this.curseChance && !e.status.has('curse')) {
          e.status.apply('curse');
          G.FX.text(e.x, e.y - e.r - 10, 'CURSED', '#c060e0');
        }
      }
      const ctx = { bullet: this, target: e, weapon: this.weapon, player: P, dealt, firstHit, tick };
      G.Hooks.weapon(this.weapon, 'onHit', ctx);
      G.Hooks.relic('onHit', ctx);
      if (tick) return;
      this.hitsCount++;
      if (this.explode && !this.sub && (this.pierce > 0 || this.styx)) {
        // Piercing explosive rounds explode on every enemy they pass through.
        G.Combat.explosion(this.x, this.y, this.explode.r, this.dmg * this.fireMult * this.explode.factor * G.Combat.outgoingMult({ bullet: this }),
          { team: 'player', weapon: this.weapon, exclude: e, noRevive: this.noRevive });
      }
      if (this.styx) return; // passes through all enemies
      if (this.pierce > 0) { this.pierce--; return; }
      if (this.explode && !this.sub) {
        this.explodeExclude = e;
        this.dead = true; // explode manually to exclude the direct target from splash double-dipping
        G.Combat.explosion(this.x, this.y, this.explode.r, this.dmg * this.fireMult * this.explode.factor * G.Combat.outgoingMult({ bullet: this }),
          { team: 'player', weapon: this.weapon, exclude: e, noRevive: this.noRevive });
        if (this.onExpire) this.onExpire(this, 'hit');
        return;
      }
      this.kill('hit');
    }

    _collideEnemyProjectile() {
      const P = G.World.player;
      if (P && !P.dead && U.dist(this.x, this.y, P.x, P.y) <= P.r + this.r) {
        if (!this.hitSet.has(P)) {
          const landed = G.Combat.damagePlayer(this.dmg, { source: this.hazard ? 'hazard' : 'enemy', attacker: this.owner });
          if (landed > 0) {
            if (this.status) P.status.apply(this.status.id, this.status);
            if (this.onHitPlayer) this.onHitPlayer(this, P);
          }
          if (landed > 0 || !P.isDashing()) {
            if (this.pierce > 0 || this.boomerang) { this.hitSet.add(P); }
            else if (landed > 0) { this.kill('hit'); return; }
          }
        }
      }
      if (this.hitsEnemies) {
        for (const e of G.World.enemies) {
          if (e.dead || e === this.owner || e.isBoss || this.hitSet.has(e)) continue;
          if (U.dist(this.x, this.y, e.x, e.y) <= e.r + this.r) {
            this.hitSet.add(e);
            G.Combat.damageEnemy(e, this.dmg, { source: 'traitor' });
            if (!this.pierce) { this.kill('hit'); return; }
          }
        }
      }
    }

    // Instant ("no travel time") bullets simulate their entire flight in one frame.
    simulateInstant() {
      const pts = [{ x: this.x, y: this.y }];
      const dt = 1 / 240;
      let guard = 0;
      while (!this.dead && guard++ < 2000) {
        const vx = this.vx, vy = this.vy;
        this.update(dt);
        if (vx !== this.vx || vy !== this.vy || this.dead) pts.push({ x: this.x, y: this.y });
      }
      pts.push({ x: this.x, y: this.y });
      G.FX.tracer(pts, this.crit ? '#ffe040' : '#fff6a0', 0.09);
    }

    draw(ctx) {
      const x = Math.round(this.x), y = Math.round(this.y);
      const c = this.color;
      switch (this.kind) {
        case 'bullet':
          D.line(x, y, x - this.vx * 0.012, y - this.vy * 0.012, U.rgba(c, 0.5), this.r);
          D.circ(x, y, this.r, this.crit ? '#ffe040' : c);
          break;
        case 'fireball':
          D.circ(x, y, this.r + 1, '#e04010');
          D.circ(x, y, this.r, '#ff9020');
          D.circ(x, y, Math.max(1, this.r - 2), '#ffe070');
          if (Math.random() < 0.5) G.FX.particle(x, y, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, 0.3, '#ff7020');
          break;
        case 'orb':
          D.alpha(0.35, () => D.circ(x, y, this.r, c));
          D.alpha(0.8, () => D.ring(x, y, this.r, c, 1));
          D.circ(x, y, 2, '#ffffff');
          break;
        case 'rock': case 'boulder':
          D.circ(x, y, this.r, '#6a6660');
          D.circ(x - 1, y - 1, Math.max(1, this.r - 2), '#8a8680');
          break;
        case 'spear': case 'arrow': case 'dagger': {
          const len = this.kind === 'spear' ? 16 : this.kind === 'arrow' ? 8 : 6;
          const a = this.angle;
          D.line(x - Math.cos(a) * len, y - Math.sin(a) * len, x, y, this.kind === 'dagger' ? '#c8c8d0' : '#7a5230', 1.5);
          D.rect(x - 1, y - 1, 3, 3, this.color2 || '#d0d0d8');
          break;
        }
        case 'oar': case 'shield': case 'sword': case 'club': case 'chain':
          G.Art.weapon(ctx, x, y, this.angle, this.kind === 'shield' ? 'dagger' : this.kind === 'chain' ? 'chains' : this.kind, 1.4,
            this.kind === 'sword' && this.color2 ? { metal: this.color2 } : null);
          if (this.kind === 'shield') { D.circ(x, y, this.r, this.color); D.ring(x, y, this.r, U.shade(this.color, 0.3), 1); }
          break;
        case 'fire':
          D.circ(x, y, this.r, '#ff6010'); D.circ(x, y, Math.max(1, this.r - 1), '#ffd040');
          break;
        case 'poison':
          D.circ(x, y, this.r, '#40a020'); D.circ(x - 1, y - 1, Math.max(1, this.r - 1), '#90f060');
          break;
        case 'coin':
          D.circ(x, y, this.r, '#c09020'); D.circ(x, y, Math.max(1, this.r - 1), '#f0d050');
          break;
        case 'heart':
          G.Art.icon(ctx, 'heart', x, y, Math.max(1, this.r / 2), null);
          break;
        case 'ice':
          D.circ(x, y, this.r, '#a0e0ff'); D.rect(x - 1, y - 1, 1, 1, '#ffffff');
          break;
        case 'water':
          D.circ(x, y, this.r, '#305a80'); D.circ(x, y - 1, Math.max(1, this.r - 1), '#60a0c0');
          break;
        case 'planet':
          D.circ(x, y, this.r, c); D.circ(x - 1, y - 1, Math.max(1, this.r - 2), U.shade(c, 0.3));
          break;
        case 'debris':
          ctx.save(); ctx.translate(x, y); ctx.rotate(this.angle);
          ctx.fillStyle = c; ctx.fillRect(-this.r, -1, this.r * 2, 3);
          ctx.fillStyle = U.shade(c, -0.3); ctx.fillRect(-this.r + 1, 1, this.r, 1);
          ctx.restore();
          break;
        case 'gold':
          D.circ(x, y, this.r, '#b08010'); D.circ(x - 1, y - 1, Math.max(1, this.r - 1), '#f0c840');
          break;
        default:
          D.circ(x, y, this.r + 1, U.shade(c, -0.4));
          D.circ(x, y, this.r, c);
          D.rect(x - 1, y - 1, 1, 1, this.color2 || '#ffffff');
      }
    }
  }

  G.Projectile = Projectile;
})();
