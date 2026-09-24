// BossKit: the toolbox boss attacks are written with. Attack generators receive it as `K`.
// It also defines world "effects" (shockwaves, beams, orbiters, timers) that attacks spawn.
(function () {
  'use strict';
  const U = G.U, D = G.Draw, TS = G.CFG.TILE;

  // ---------------------------------------------------------------- effects
  class Effect {
    constructor(o) { Object.assign(this, { dead: false, t: 0, layer: 'top' }, o); }
    update(dt) { this.t += dt; }
    draw() {}
  }

  // Expanding ring. Hits the player when the wavefront passes them (dash through it to "jump" it).
  // gaps: [{ a, half }] angular openings the player can stand in.
  class Shockwave extends Effect {
    constructor(o) {
      super(Object.assign({ x: 0, y: 0, R: 4, speed: 140, maxR: 300, thick: 6, dmg: 15, color: '#e0c080', gaps: null, hitDone: false, source: 'enemy', owner: null, layer: 'ground' }, o));
    }
    update(dt) {
      super.update(dt);
      this.R += this.speed * dt;
      if (this.R >= this.maxR) { this.dead = true; return; }
      const P = G.World.player;
      if (!P || P.dead || this.hitDone) return;
      const d = U.dist(P.x, P.y, this.x, this.y);
      if (Math.abs(d - this.R) < this.thick / 2 + P.r) {
        if (this.gaps) {
          const a = U.angle(this.x, this.y, P.x, P.y);
          if (this.gaps.some(g => Math.abs(U.angDiff(g.a, a)) < g.half)) return;
        }
        if (G.Combat.damagePlayer(this.dmg, { source: this.source, attacker: this.owner }) > 0) {
          this.hitDone = true;
          if (this.onHit) this.onHit(P);
        }
      }
    }
    draw(ctx) {
      const k = 1 - this.R / this.maxR;
      ctx.save();
      ctx.globalAlpha = 0.35 + 0.5 * k;
      ctx.strokeStyle = this.color; ctx.lineWidth = this.thick;
      if (!this.gaps) { ctx.beginPath(); ctx.arc(this.x, this.y, this.R, 0, U.TAU); ctx.stroke(); }
      else {
        // Draw the ring minus the gaps.
        const segs = 64;
        for (let i = 0; i < segs; i++) {
          const a0 = (i / segs) * U.TAU, a1 = ((i + 1) / segs) * U.TAU, am = (a0 + a1) / 2;
          if (this.gaps.some(g => Math.abs(U.angDiff(g.a, am)) < g.half)) continue;
          ctx.beginPath(); ctx.arc(this.x, this.y, this.R, a0, a1 + 0.01); ctx.stroke();
        }
      }
      ctx.globalAlpha = 0.8 * k; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(this.x, this.y, this.R, 0, U.TAU); ctx.stroke();
      ctx.restore();
    }
  }

  // Rotating beam from an origin (entity or point). Windup shows a thin warning line first.
  class Beam extends Effect {
    constructor(o) {
      super(Object.assign({ origin: null, x: 0, y: 0, angle: 0, spin: 0, len: 400, width: 8, windup: 0.8, dur: 3, dmg: 15, color: '#fff0a0', source: 'enemy', layer: 'top' }, o));
    }
    get ox() { return this.origin ? this.origin.x : this.x; }
    get oy() { return this.origin ? this.origin.y : this.y; }
    update(dt) {
      super.update(dt);
      if (this.origin && this.origin.dead) { this.dead = true; return; }
      if (this.t >= this.windup + this.dur) { this.dead = true; return; }
      if (this.t < this.windup) { if (this.trackWindup) this.angle += this.spin * dt * 0.2; return; }
      this.angle += this.spin * dt;
      const P = G.World.player;
      if (!P || P.dead) return;
      const ex = this.ox + Math.cos(this.angle) * this.len, ey = this.oy + Math.sin(this.angle) * this.len;
      if (U.pointSegDist(P.x, P.y, this.ox, this.oy, ex, ey) < this.width / 2 + P.r) {
        G.Combat.damagePlayer(this.dmg, { source: this.source, attacker: this.origin });
      }
    }
    draw(ctx) {
      const ex = this.ox + Math.cos(this.angle) * this.len, ey = this.oy + Math.sin(this.angle) * this.len;
      if (this.t < this.windup) {
        D.alpha(0.4 + 0.4 * Math.sin(this.t * 30), () => D.line(this.ox, this.oy, ex, ey, this.color, 1));
        return;
      }
      D.alpha(0.5, () => D.line(this.ox, this.oy, ex, ey, this.color, this.width));
      D.alpha(0.9, () => D.line(this.ox, this.oy, ex, ey, '#ffffff', Math.max(1, this.width / 3)));
    }
  }

  // Bodies orbiting an entity that damage the player on contact.
  class Orbiters extends Effect {
    constructor(o) {
      super(Object.assign({ owner: null, n: 3, radius: 40, speed: 2, r: 5, dmg: 12, dur: 8, a: 0, color: '#6080ff', colors: null, layer: 'top' }, o));
    }
    positions() {
      const out = [];
      for (let i = 0; i < this.n; i++) {
        const a = this.a + (i / this.n) * U.TAU;
        out.push({ x: this.owner.x + Math.cos(a) * this.radius, y: this.owner.y + Math.sin(a) * this.radius, i });
      }
      return out;
    }
    update(dt) {
      super.update(dt);
      if (!this.owner || this.owner.dead || this.t >= this.dur) { this.dead = true; return; }
      this.a += this.speed * dt;
      const P = G.World.player;
      if (!P || P.dead) return;
      for (const p of this.positions()) {
        if (U.dist(p.x, p.y, P.x, P.y) < this.r + P.r) { G.Combat.damagePlayer(this.dmg, { source: 'enemy', attacker: this.owner }); break; }
      }
    }
    draw() {
      const fade = Math.min(1, this.t * 3, (this.dur - this.t) * 3);
      for (const p of this.positions()) {
        const c = this.colors ? this.colors[p.i % this.colors.length] : this.color;
        D.alpha(fade, () => { D.circ(p.x, p.y, this.r, c); D.circ(p.x - 1, p.y - 1, Math.max(1, this.r - 2), U.shade(c, 0.3)); });
      }
    }
  }

  // Calls fn after a delay (with an optional per-frame callback).
  class Timer extends Effect {
    constructor(o) { super(Object.assign({ dur: 1, fn: null, tick: null, layer: 'none' }, o)); }
    update(dt) {
      super.update(dt);
      if (this.tick) this.tick(this, dt);
      if (this.t >= this.dur) { this.dead = true; if (this.fn) this.fn(this); }
    }
  }

  // ---------------------------------------------------------------- kit
  const K = {
    Effect, Shockwave, Beam, Orbiters, Timer,

    P() { return G.World.player; },
    room() { return G.World.room; },
    rng() { return G.rng; },
    rand(a, b) { return G.rng.range(a, b); },
    pick(arr) { return G.rng.pick(arr); },
    sfx(name) { G.Audio.play(name); },
    shake(m, d) { G.Cam.shake(m, d); },

    aim(b, lead = 0) {
      const P = K.P();
      if (!P) return 0;
      return U.angle(b.x, b.y, P.x + P.vx * lead, P.y + P.vy * lead);
    },
    dist(b) { const P = K.P(); return P ? U.dist(b.x, b.y, P.x, P.y) : 9999; },
    face(b) { const a = K.aim(b); b.facing = Math.cos(a) >= 0 ? 1 : -1; b.aimAngle = a; return a; },

    // ---- projectiles. o.speed consumed here; other keys go to the Projectile.
    shoot(b, angle, o = {}) {
      const { speed = 140, from = null, ...rest } = o;
      const sx = from ? from.x : b.x + Math.cos(angle) * (b.r + 2);
      const sy = from ? from.y : b.y + Math.sin(angle) * (b.r + 2);
      const p = G.World.spawnEnemyProjectile(Object.assign({
        x: sx, y: sy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        r: 3, dmg: 12, owner: b, color: '#ff5050', life: 4,
      }, rest));
      return p;
    },
    spread(b, angle, n, arc, o) {
      const out = [];
      for (let i = 0; i < n; i++) out.push(K.shoot(b, angle + (n > 1 ? (i / (n - 1) - 0.5) * arc : 0), o));
      G.Audio.play('enemyShot');
      return out;
    },
    ring(b, n, o, offset = 0) {
      const out = [];
      for (let i = 0; i < n; i++) out.push(K.shoot(b, offset + (i / n) * U.TAU, o));
      G.Audio.play('enemyShot');
      return out;
    },

    // ---- telegraphs (return the telegraph object; set .dead = true to cancel)
    teleCircle(x, y, r, dur, color = '#ff3030') { G.Audio.play('telegraph'); return G.FX.telegraph({ shape: 'circle', x, y, r, dur, color }); },
    teleLine(x1, y1, x2, y2, w, dur, color = '#ff3030') { return G.FX.telegraph({ shape: 'line', x: x1, y: y1, x2, y2, w, dur, color }); },
    teleArc(x, y, r, a, half, dur, color = '#ff3030') { return G.FX.telegraph({ shape: 'arc', x, y, r, a, half, dur, color }); },
    teleRect(x, y, w, h, dur, color = '#ff3030') { return G.FX.telegraph({ shape: 'rect', x, y, w, h, dur, color }); },
    teleWarn(x, y, r, dur, color = '#ff70c0', follow = null) { return G.FX.telegraph({ shape: 'ringwarn', x, y, r, dur, color, follow }); },

    // ---- instant hit checks (return damage landed)
    _hit(dmg, o = {}, b = null) {
      const P = K.P();
      const landed = G.Combat.damagePlayer(dmg, { source: o.source || 'enemy', attacker: b });
      if (landed > 0) {
        if (o.status) P.status.apply(o.status.id, o.status);
        if (o.knock && b) { const a = U.angle(b.x, b.y, P.x, P.y); P.knock(Math.cos(a) * o.knock, Math.sin(a) * o.knock); }
        if (o.onHit) o.onHit(P);
      }
      return landed;
    },
    hitCircle(x, y, r, dmg, o = {}, b = null) {
      const P = K.P();
      if (!P || P.dead || U.dist(x, y, P.x, P.y) > r + P.r) return 0;
      return K._hit(dmg, o, b);
    },
    hitLine(x1, y1, x2, y2, w, dmg, o = {}, b = null) {
      const P = K.P();
      if (!P || P.dead || U.pointSegDist(P.x, P.y, x1, y1, x2, y2) > w / 2 + P.r) return 0;
      return K._hit(dmg, o, b);
    },
    hitArc(x, y, r, a, half, dmg, o = {}, b = null) {
      const P = K.P();
      if (!P || P.dead || !U.inArc(P.x, P.y, x, y, r, a, half, P.r)) return 0;
      return K._hit(dmg, o, b);
    },
    hitRect(x, y, w, h, dmg, o = {}, b = null) {
      const P = K.P();
      if (!P || P.dead || !U.rectCircle(x, y, w, h, P.x, P.y, P.r)) return 0;
      return K._hit(dmg, o, b);
    },
    // Melee swing: slash visual + arc hit.
    melee(b, angle, range, half, dmg, o = {}) {
      G.FX.slash(b.x, b.y, range, angle, half, o.color || '#ffffff');
      G.Audio.play('swing');
      return K.hitArc(b.x, b.y, range, angle, half, dmg, o, b);
    },
    knockPlayer(angle, power) { const P = K.P(); if (P) P.knock(Math.cos(angle) * power, Math.sin(angle) * power); },

    // ---- spawners
    shockwave(x, y, o = {}) { return G.World.addEffect(new Shockwave(Object.assign({ x, y }, o))); },
    beam(o) { return G.World.addEffect(new Beam(o)); },
    orbiters(o) { return G.World.addEffect(new Orbiters(o)); },
    after(dur, fn, tick) { return G.World.addEffect(new Timer({ dur, fn, tick })); },
    zone(type, o) { return G.World.addZone(new G.Zone(type, o)); },
    explode(x, y, r, dmg, o = {}) { G.Combat.explosion(x, y, r, dmg, Object.assign({ team: 'enemy' }, o)); },
    // Telegraph a circle, then explode it after dur.
    bomb(x, y, r, dur, dmg, o = {}) {
      K.teleCircle(x, y, r, dur, o.color || '#ff3030');
      return K.after(dur, () => {
        K.explode(x, y, r, dmg, { color: o.fx || '#ffa030', source: o.source, attacker: o.attacker });
        if (o.then) o.then(x, y);
      });
    },
    summon(b, enemyId, x, y, o = {}) {
      const pt = K.room().nearestGround(x, y);
      const e = G.World.spawnEnemy(enemyId, pt.x, pt.y, Object.assign({ noCredit: true, hpScale: o.hpScale }, o));
      e.aware = true;
      if (b) b.children.push(e);
      return e;
    },
    // Clone of a boss (same def), with its own HP / attack list / lifetime.
    spawnClone(b, o = {}) {
      const pt = o.x !== undefined ? K.room().nearestGround(o.x, o.y) : K.pointNear(b.x, b.y, 30, 70);
      const c = new G.Boss(b.bossDef, pt.x, pt.y, Object.assign({ isClone: true, cloneOf: b, restT: o.restT !== undefined ? o.restT : 0.6 }, o));
      c.phase = b.phase;
      G.World.enemies.push(c);
      b.children.push(c);
      G.FX.burst(c.x, c.y, 14, '#c0c0ff', 50, 0.4);
      return c;
    },

    // ---- movement generators (use with yield*)
    // Move in a straight line until a wall or time runs out; damages the player once on contact.
    *charge(b, angle, speed, maxTime, o = {}) {
      const prevMode = b.moveMode;
      b.moveMode = 'none';
      b.facing = Math.cos(angle) >= 0 ? 1 : -1;
      let t = 0, hitWall = false, hitPlayer = false;
      try {
        while (t < maxTime && !b.dead) {
          const dt = yield;
          t += dt;
          const blocked = o.breaks
            ? (tx, ty) => { const room = K.room(); if (room.tileAt(tx, ty) === G.T.OBST) { room.destroyObstacle(tx, ty); return false; } return room.solidAt(tx, ty, true) || (!b.flying && room.isPitTile(tx, ty)); }
            : b.blockFn();
          const r = G.Physics.move(b, Math.cos(angle) * speed * dt, Math.sin(angle) * speed * dt, blocked);
          b.vx = Math.cos(angle) * speed; b.vy = Math.sin(angle) * speed;
          if (o.trail) o.trail(b);
          else if (Math.random() < 0.6) G.FX.particle(b.x, b.y + b.r * 0.6, 0, 0, 0.35, '#a09080', 2);
          const P = K.P();
          if (!hitPlayer && P && !P.dead && U.dist(b.x, b.y, P.x, P.y) < b.r + P.r + 2) {
            if (K._hit(o.dmg || b.dmg * 1.3, { knock: o.knock || 180, status: o.status }, b) > 0) hitPlayer = true;
          }
          if (r.hitX || r.hitY) { hitWall = true; if (o.wallShake !== false) K.shake(3, 0.2); break; }
        }
      } finally {
        b.vx = 0; b.vy = 0;
        b.moveMode = prevMode === 'none' ? (b.bossDef.move || 'chase') : prevMode;
      }
      return { hitWall, hitPlayer };
    },
    // Glide to a point at a speed.
    *dashTo(b, x, y, speed, maxTime = 3) {
      b.moveMode = 'none';
      let t = 0;
      while (!b.dead && t < maxTime) {
        const dt = yield;
        t += dt;
        const d = U.dist(b.x, b.y, x, y);
        if (d < 4) break;
        const step = Math.min(d, speed * dt);
        const r = b.move((x - b.x) / d * step, (y - b.y) / d * step);
        b.facing = x >= b.x ? 1 : -1;
        if ((r.hitX || r.hitY) && step < d) { if (U.dist(b.x, b.y, x, y) > d - step * 0.3) break; }
      }
    },
    // Jump through the air to a point (invulnerable while airborne), landing with an impact.
    *leap(b, x, y, dur, o = {}) {
      const sx = b.x, sy = b.y;
      const tgt = K.room().nearestGround(x, y);
      b.moveMode = 'none';
      b.invulnerable = true;
      b.data.airborne = true;
      const tele = K.teleCircle(tgt.x, tgt.y, o.r || b.r + 16, dur, '#ff3030');
      let t = 0;
      try {
        while (t < dur && !b.dead) {
          const dt = yield;
          t += dt;
          const k = Math.min(1, t / dur);
          b.x = U.lerp(sx, tgt.x, k);
          b.y = U.lerp(sy, tgt.y, k) - Math.sin(k * Math.PI) * (o.height || 40);
        }
        b.x = tgt.x; b.y = tgt.y;
        K.shake(4, 0.25);
        G.Audio.play('slam');
        G.FX.burst(b.x, b.y, 20, o.dust || '#a09080', 80, 0.4, 2);
        K.hitCircle(b.x, b.y, o.r || b.r + 16, o.dmg || b.dmg * 1.5, { knock: 160 }, b);
        if (o.shockwave) K.shockwave(b.x, b.y, Object.assign({ owner: b }, o.shockwave));
      } finally {
        tele.dead = true;
        b.invulnerable = false;
        b.data.airborne = false;
      }
    },
    teleport(b, x, y) {
      G.FX.burst(b.x, b.y, 16, '#a080ff', 50, 0.4);
      const pt = K.room().nearestGround(x, y);
      b.x = pt.x; b.y = pt.y;
      G.FX.burst(b.x, b.y, 16, '#a080ff', 50, 0.4);
    },

    // ---- room geometry
    bounds() { const r = K.room(); return { x0: TS, y0: TS, x1: (r.w - 1) * TS, y1: (r.h - 1) * TS, w: (r.w - 2) * TS, h: (r.h - 2) * TS }; },
    center() { const r = K.room(); return { x: r.w * TS / 2, y: r.h * TS / 2 }; },
    randPoint(margin = 32) { return G.World.randomFloor(margin); },
    pointNear(x, y, min, max) { return G.World.randomFloorNear(x, y, min, max) || K.room().nearestGround(x, y); },
    // Circle of points around the player (useful for falling-object patterns).
    aroundPlayer(n, r) {
      const P = K.P(), out = [];
      for (let i = 0; i < n; i++) { const a = (i / n) * U.TAU; out.push({ x: P.x + Math.cos(a) * r, y: P.y + Math.sin(a) * r }); }
      return out;
    },
  };

  G.BossKit = K;
})();
