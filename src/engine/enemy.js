// Base enemy. Behaviour comes from a "brain" (see brains.js), visuals from an art
// descriptor on the definition, so each enemy type is a small data object.
//
// Enemy definition fields:
//   id, name, hp, speed, dmg (contact), r, brain, brainOpts, flying, art:{ type, ...painter opts },
//   onHitStatus:{ id, dur, power }, gold:[chance, min, max], kbResist, contact (default true),
//   bloodColor, disguise ('crate' etc. for mimics), elite:false to never be elite
(function () {
  'use strict';
  const U = G.U, D = G.Draw, TS = G.CFG.TILE;

  let nextId = 1;

  class Enemy {
    constructor(def, x, y, opts = {}) {
      this.def = def;
      this.id = nextId++;
      this.x = x; this.y = y;
      this.elite = !!opts.elite && def.elite !== false;
      const lvl = Math.max(1, G.Run.levelIndex || 1);
      const hpScale = opts.hpScale !== undefined ? opts.hpScale : 1 + 0.22 * (lvl - 1);
      const dmgScale = opts.dmgScale !== undefined ? opts.dmgScale : 1 + 0.1 * (lvl - 1);
      this.r = (def.r || 6) * (this.elite ? 1.2 : 1);
      this.maxHp = def.hp * hpScale * (this.elite ? 2.5 : 1);
      this.hp = this.maxHp * (opts.hpFrac || 1);
      this.speed = def.speed || 50;
      this.dmg = (def.dmg || 10) * dmgScale * (this.elite ? 1.3 : 1);
      this.flying = !!def.flying;
      this.status = new G.StatusSet(this);
      this.vx = 0; this.vy = 0; this.kx = 0; this.ky = 0;
      this.facing = 1;
      this.t = Math.random() * 10;
      this.flash = 0;
      this.dead = false;
      this.kbResist = def.kbResist || 0;
      this.bloodColor = def.bloodColor || '#a01818';
      this.spawning = opts.instant ? 0 : 0.6;
      const helm = G.Hooks.hasRelic('hades_helm');
      this.aware = false;
      this.awareT = (helm ? 3 : 0.35) + this.spawning;
      this.detectR = helm ? 50 : 9999;
      this.grave = opts.grave || null;
      this.contactCd = 0;
      this.turncoat = 0;
      this.disguised = !!def.disguise;
      this.bs = {}; // brain state
      this.brain = G.Brains.get(def.brain || 'chaser');
      this.opts = Object.assign({}, def.brainOpts || {}, opts.brainOpts || {});
      this.noCredit = !!opts.noCredit;
      if (this.brain.init) this.brain.init(this);
    }

    // ---- helpers used by brains
    get room() { return G.World.room; }
    speedNow() { return this.speed * this.status.speedMult(); }
    blockFn() {
      const room = this.room, fly = this.flying;
      return (tx, ty) => room.solidAt(tx, ty, true) || (!fly && room.isPitTile(tx, ty));
    }
    move(dx, dy) { return G.Physics.move(this, dx, dy, this.blockFn()); }
    // Current target: the player, or (when turned traitor) the nearest other enemy.
    target() {
      if (this.turncoat > 0) {
        let best = null, bd = Infinity;
        for (const e of G.World.enemies) {
          if (e === this || e.dead || e.isBoss || e.spawning > 0) continue;
          const d = U.dist2(this.x, this.y, e.x, e.y);
          if (d < bd) { bd = d; best = e; }
        }
        if (best) return best;
      }
      return G.World.player;
    }
    distTo(o) { return U.dist(this.x, this.y, o.x, o.y); }
    angleTo(o) { return U.angle(this.x, this.y, o.x, o.y); }
    los(o) { return this.room.los(this.x, this.y, o.x, o.y); }
    // Steer toward a point: direct if visible, otherwise via the room's flow field (for the player).
    moveToward(tx, ty, mult, dt) {
      const sp = this.speedNow() * mult * dt;
      let dir;
      const P = G.World.player;
      const direct = this.room.los(this.x, this.y, tx, ty, !this.flying);
      if (direct) dir = U.norm(tx - this.x, ty - this.y);
      else if (P && tx === P.x && ty === P.y) dir = G.World.flowDir(this.x, this.y, this.flying) || U.norm(tx - this.x, ty - this.y);
      else dir = U.norm(tx - this.x, ty - this.y);
      this.vx = dir.x * sp / dt; this.vy = dir.y * sp / dt;
      if (Math.abs(dir.x) > 0.1) this.facing = dir.x > 0 ? 1 : -1;
      this.move(dir.x * sp, dir.y * sp);
    }
    moveAway(o, mult, dt) {
      const a = U.angle(o.x, o.y, this.x, this.y);
      const sp = this.speedNow() * mult * dt;
      this.move(Math.cos(a) * sp, Math.sin(a) * sp);
    }
    strafe(o, mult, dt, dir = 1) {
      const a = U.angle(o.x, o.y, this.x, this.y) + dir * Math.PI / 2;
      const sp = this.speedNow() * mult * dt;
      this.move(Math.cos(a) * sp, Math.sin(a) * sp);
    }
    // o: projectile options; o.speed (px/s) is consumed here, not passed on.
    shoot(angle, o = {}) {
      const { speed = 120, ...rest } = o;
      const p = G.World.spawnEnemyProjectile(Object.assign({
        x: this.x + Math.cos(angle) * (this.r + 2), y: this.y + Math.sin(angle) * (this.r + 2),
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        r: 3, dmg: this.dmg, owner: this, color: '#ff5050', life: 3,
        hitsEnemies: this.turncoat > 0,
      }, rest));
      G.Audio.play('enemyShot');
      return p;
    }

    update(dt) {
      this.t += dt;
      if (this.flash > 0) this.flash -= dt;
      if (this.spawning > 0) { this.spawning -= dt; return; }
      this.status.update(dt);
      if (this.dead) return;
      const room = this.room;
      if (!this.flying && !this.isBoss && room.isPitTile(Math.floor(this.x / TS), Math.floor(this.y / TS))) {
        G.FX.text(this.x, this.y - 8, 'FELL', '#a0a0a0');
        G.Combat.kill(this, { source: 'pit' });
        return;
      }
      if (this.turncoat > 0) this.turncoat -= dt;
      const P = G.World.player;
      if (!this.aware) {
        this.awareT -= dt;
        if (this.awareT <= 0 || (P && this.distTo(P) < this.detectR)) this.aware = true;
      }
      const stunned = this.status.flag('noAct') || this.status.flag('noMove');
      if (!stunned && this.aware) this.brain.update(this, dt);
      else if (!stunned && !this.aware && this.brain.idle) this.brain.idle(this, dt);
      if (this.kx || this.ky) {
        this.move(this.kx * dt, this.ky * dt);
        const k = Math.max(0, 1 - 8 * dt);
        this.kx *= k; this.ky *= k;
        if (Math.abs(this.kx) < 1) this.kx = 0;
        if (Math.abs(this.ky) < 1) this.ky = 0;
      }
      this._contact(dt);
    }

    _contact(dt) {
      if (this.contactCd > 0) this.contactCd -= dt;
      if (this.def.contact === false || this.disguised || !this.aware || this.status.flag('noAct')) return;
      if (this.turncoat > 0) {
        const tgt = this.target();
        if (tgt && tgt !== G.World.player && this.contactCd <= 0 && this.distTo(tgt) < this.r + tgt.r) {
          this.contactCd = 0.6;
          G.Combat.damageEnemy(tgt, this.dmg * 1.5, { source: 'traitor' });
        }
        return;
      }
      const P = G.World.player;
      if (P && !P.dead && this.distTo(P) < this.r + P.r) this.hitPlayer(this.dmg);
    }
    hitPlayer(dmg, status) {
      const P = G.World.player;
      const landed = G.Combat.damagePlayer(dmg, { source: 'enemy', attacker: this });
      const st = status || this.def.onHitStatus;
      if (landed > 0 && st) P.status.apply(st.id, st);
      return landed;
    }

    onDeath(info) {
      if (this.brain.onDeath) this.brain.onDeath(this, info);
      if (this.def.onDeath) this.def.onDeath(this, info);
      if (this.def.splitInto && !this.noCredit) {
        for (let i = 0; i < this.def.splitInto.n; i++) {
          const a = Math.random() * U.TAU;
          const e = G.World.spawnEnemy(this.def.splitInto.id, this.x + Math.cos(a) * 6, this.y + Math.sin(a) * 6, { instant: true });
          e.aware = true;
        }
      }
      // Heresy: grave-bound enemies come back unless their grave is destroyed.
      if (this.grave && !this.grave.dead && !this.noRevive) {
        const timer = 4 * (G.Hooks.hasRelic('orpheus_lyre') ? 2 : 1);
        G.World.room.props.push(new G.Props.Corpse({ x: this.x, y: this.y, enemyId: this.def.id, grave: this.grave, timer, max: timer, elite: this.elite }));
      }
    }

    draw(ctx) {
      if (this.spawning > 0) {
        const k = 1 - this.spawning / 0.6;
        D.alpha(0.6, () => D.ring(this.x, this.y + 3, 10 * (1 - k) + 3, '#ff4060', 1));
        D.alpha(k * 0.5, () => D.circ(this.x, this.y + 3, 4 * k, '#ff4060'));
        return;
      }
      if (this.elite) D.alpha(0.5 + 0.2 * Math.sin(this.t * 6), () => D.ring(this.x, this.y + 2, this.r + 3, '#f0c040', 1));
      if (this.turncoat > 0) D.alpha(0.6, () => D.ring(this.x, this.y + 2, this.r + 2, '#40e0ff', 1));
      if (this.brain.draw) this.brain.draw(this, ctx);
      else this.drawBody(ctx);
      this.drawOverlays(ctx);
    }
    drawBody(ctx, override) {
      const a = Object.assign({}, this.def.art, this.artOverride || {}, override || {});
      const painter = G.Art[a.type || 'humanoid'];
      const moving = Math.hypot(this.vx, this.vy) > 5;
      painter(ctx, this.x, this.y, Object.assign({}, a, {
        s: (a.s || 1) * (this.elite ? 1.2 : 1), facing: this.facing, t: this.t, moving,
        flash: this.flash > 0, aim: this.aimAngle,
      }));
    }
    drawOverlays() {
      const top = this.y - this.r - 8;
      let ix = this.x - 6;
      const dot = col => { D.rect(ix, top, 2, 2, col); ix += 3; };
      if (this.status.has('burn')) dot('#ff7020');
      if (this.status.has('poison')) dot('#70e040');
      if (this.status.has('slow')) dot('#80b0ff');
      if (this.status.has('curse')) dot('#b040e0');
      if (this.status.has('marked')) dot('#ffffff');
      if (this.status.has('stun')) dot('#ffff60');
      if (this.hp < this.maxHp && !this.isBoss && !this.disguised) {
        const w = Math.max(8, this.r * 2);
        D.rect(this.x - w / 2, this.y + this.r + 3, w, 1, '#300');
        D.rect(this.x - w / 2, this.y + this.r + 3, w * this.hp / this.maxHp, 1, '#e04040');
      }
      if (G.Hooks.hasRelic('hunters_eye') && this.hp < this.maxHp * 0.25 && !this.disguised) {
        D.alpha(0.6 + 0.4 * Math.sin(this.t * 10), () => D.ring(this.x, this.y, this.r + 4, '#ff2020', 1));
      }
      if (!this.aware && !this.disguised && G.Hooks.hasRelic('hades_helm')) D.text('Z', this.x + 5, this.y - this.r - 12, '#a0a0ff');
    }
  }

  G.Enemy = Enemy;
})();
