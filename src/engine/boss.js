// Boss base class. Bosses are scripted with generator-based attacks registered in
// G.Attacks, which makes every attack self-contained and reusable (Satan borrows them).
//
// Boss definition fields:
//   id, name, title, identity (shared by alternate versions, e.g. both Achilles), hp, r, speed, dmg (contact),
//   art:{type,...} or draw(b, ctx), move:'chase'|'keep'|'strafe'|'wander'|'stand', keepRange:[min,max],
//   rest:[min,max] seconds between attacks, rest2Scale, phase2At (fraction, optional),
//   attacks:{ 1:[[attackId, weight], ...], 2:[...] }, thresholds:[{ at, attack }],
//   poise (fraction of max HP to stagger; 0 = never), kbResist, noHealDrops,
//   hooks: init(b), update(b,dt), onPhase2(b), onDamaged(b,amount,info), onBeforeDamage(b,amount,info),
//          hitParts(b) -> [{x,y,r,mult}], onDeath(b), drawExtra(b,ctx), restScale(b), getAttacks(b)
//   trophy:{ icon, color }
//
// Attack definition fields:
//   id, name, maxUses (per fight), cond(b) -> bool, noClone (clones never use it),
//   run: function* (b, K) - yield a number (seconds), a predicate function, or nothing (one frame).
//   Put cleanup in try/finally: interrupted attacks are closed with generator.return().
(function () {
  'use strict';
  const U = G.U, D = G.Draw;

  class Boss extends G.Enemy {
    constructor(def, x, y, opts = {}) {
      super(Object.assign({}, def, { brain: 'stationary', elite: false }), x, y, {
        instant: true, hpScale: 1, dmgScale: 1, elite: false, noCredit: !!opts.isClone,
      });
      this.bossDef = def;
      this.isClone = !!opts.isClone;
      this.isBoss = !this.isClone;
      this.maxHp = opts.hp || def.hp;
      this.hp = this.maxHp;
      this.dmg = opts.dmg || def.dmg || 15;
      this.speed = def.speed || 60;
      this.phase = 1;
      this.runner = null; this.waitT = 0; this.waitFn = null;
      this.restT = opts.restT !== undefined ? opts.restT : 2.0;
      this.moveMode = def.move || 'chase';
      this.moveMult = 1;
      this.uses = {};
      this.lastAttack = null;
      this.pending = [];
      this.thresholdsDone = new Set();
      this.kbResist = def.kbResist !== undefined ? def.kbResist : 0.9;
      this.poiseAcc = 0; this.staggerT = 0;
      this.invulnerable = false; this.takenMult = 1;
      this.unstaggerable = false;
      this.aware = true; this.spawning = 0;
      this.attackOverride = opts.attacks || null;
      this.healDropsAt = [0.75, 0.5, 0.25];
      this.children = [];
      this.alpha = opts.alpha || 1;
      this.statusImmune = new Set(['stun', 'freeze', 'immobilize']);
      this.data = {}; // free-form per-boss state
      this.cloneOf = opts.cloneOf || null;
      this.life = opts.life || 0; // clones: auto-despawn time (0 = never)
      if (def.hitParts) this.hitParts = () => def.hitParts(this);
      if (def.onBeforeDamage) this.onBeforeDamage = (a, info) => def.onBeforeDamage(this, a, info);
      if (def.init) def.init(this);
      if (opts.init) opts.init(this);
    }

    get hpFrac() { return this.hp / this.maxHp; }

    attackPool() {
      if (this.attackOverride) return this.attackOverride;
      if (this.bossDef.getAttacks) return this.bossDef.getAttacks(this);
      const a = this.bossDef.attacks;
      return a[this.phase] || a[1];
    }

    restScale() {
      let s = this.phase === 2 ? (this.bossDef.rest2Scale || 0.75) : 1;
      if (this.bossDef.restScale) s *= this.bossDef.restScale(this);
      return s;
    }

    update(dt) {
      this.t += dt;
      if (this.flash > 0) this.flash -= dt;
      this.status.update(dt);
      if (this.dead) return;
      const def = this.bossDef;

      if (this.isClone && this.life > 0) {
        this.life -= dt;
        if (this.life <= 0) { this.vanish(); return; }
      }
      if (this.isBoss) {
        if (this.phase === 1 && def.phase2At && this.hp <= this.maxHp * def.phase2At) this.enterPhase2();
        for (const th of def.thresholds || []) {
          if (!this.thresholdsDone.has(th) && this.hp <= this.maxHp * th.at) { this.thresholdsDone.add(th); this.pending.push(th.attack); }
        }
        if (!def.noHealDrops && !this.noHealDrops) {
          while (this.healDropsAt.length && this.hp <= this.maxHp * this.healDropsAt[0]) {
            this.healDropsAt.shift();
            G.World.addPickup(new G.Pickup('healorb', this.x, this.y, 12));
          }
        }
      }
      if (def.update) def.update(this, dt);
      if (this.dead) return;

      if (this.staggerT > 0) { this.staggerT -= dt; this._knock(dt); return; }
      this.poiseAcc = Math.max(0, this.poiseAcc - this.maxHp * 0.02 * dt);

      if (this.runner) this._step(dt);
      else {
        this.restT -= dt;
        this.doMove(dt);
        if (this.restT <= 0 && !G.World.bossIntro) this.startAttack();
      }
      this._knock(dt);
      if (!this.hidden && !this.data.airborne) this._contact(dt);
    }

    _knock(dt) {
      if (this.kx || this.ky) {
        this.move(this.kx * dt, this.ky * dt);
        const k = Math.max(0, 1 - 8 * dt);
        this.kx *= k; this.ky *= k;
        if (Math.abs(this.kx) < 1) this.kx = 0;
        if (Math.abs(this.ky) < 1) this.ky = 0;
      }
    }

    _step(dt) {
      this.doMove(dt);
      if (this.waitT > 0) { this.waitT -= dt; return; }
      if (this.waitFn) { if (!this.waitFn()) return; this.waitFn = null; }
      const runner = this.runner;
      let r;
      this._inStep = true;
      try { r = runner.next(dt); }
      catch (err) { console.error('Boss attack error in', this.curAttack, err); r = { done: true }; }
      finally { this._inStep = false; }
      // The attack may have been interrupted from inside itself (e.g. the boss died or vanished).
      if (this._deferredReturn) {
        const d = this._deferredReturn;
        this._deferredReturn = null;
        try { d.return(); } catch (e) { console.error(e); }
        return;
      }
      if (this.dead || this.runner !== runner) return;
      if (r.done) { this.endAttack(); return; }
      const v = r.value;
      if (typeof v === 'number') this.waitT = v;
      else if (typeof v === 'function') this.waitFn = v;
    }

    startAttack(forceId) {
      let id = forceId || this.pending.shift();
      if (!id) {
        const pool = this.attackPool().map(e => (Array.isArray(e) ? e : [e, 1])).filter(([aid]) => {
          const a = G.Attacks.get(aid);
          if (a.maxUses && (this.uses[aid] || 0) >= a.maxUses) return false;
          if (this.isClone && a.noClone) return false;
          if (a.cond && !a.cond(this)) return false;
          return true;
        });
        let choices = pool.length > 1 ? pool.filter(([aid]) => aid !== this.lastAttack) : pool;
        if (!choices.length) { this.restT = 0.5; return; }
        id = G.rng.weighted(choices);
      }
      const atk = G.Attacks.get(id);
      this.uses[id] = (this.uses[id] || 0) + 1;
      this.lastAttack = id;
      this.curAttack = id;
      this.runner = atk.run(this, G.BossKit);
      this.waitT = 0; this.waitFn = null;
    }

    endAttack() {
      this.runner = null;
      this.curAttack = null;
      this.moveMode = this.data.moveOverride || this.bossDef.move || 'chase';
      this.moveMult = 1;
      const [a, b] = this.bossDef.rest || [0.8, 1.6];
      this.restT = G.rng.range(a, b) * this.restScale();
    }

    // Abort the current attack (runs its finally blocks).
    interrupt() {
      const run = this.runner;
      this.runner = null; this.waitT = 0; this.waitFn = null; this.curAttack = null;
      if (run) {
        // A generator can't be closed while it is executing; defer until it yields.
        if (this._inStep) this._deferredReturn = run;
        else { try { run.return(); } catch (e) { console.error(e); } }
      }
      this.moveMode = this.data.moveOverride || this.bossDef.move || 'chase';
      this.moveMult = 1;
    }

    enterPhase2() {
      this.phase = 2;
      this.interrupt();
      this.restT = 1.2;
      G.FX.flash('#ffffff', 0.2);
      G.Cam.shake(5, 0.5);
      G.Audio.play('boss');
      G.FX.burst(this.x, this.y, 40, '#ffffff', 90, 0.6, 2);
      G.HUD.banner(this.bossDef.name.toUpperCase(), this.bossDef.phase2Text || 'grows desperate', 2);
      if (this.bossDef.onPhase2) this.bossDef.onPhase2(this);
    }

    doMove(dt) {
      const P = G.World.player;
      if (!P || P.dead) return;
      const mult = this.moveMult;
      switch (this.moveMode) {
        case 'chase':
          if (this.distTo(P) > this.r + P.r + 4) this.moveToward(P.x, P.y, mult, dt);
          break;
        case 'keep': {
          const [mn, mx] = this.bossDef.keepRange || [90, 160];
          const d = this.distTo(P);
          if (d > mx || !this.los(P)) this.moveToward(P.x, P.y, mult, dt);
          else if (d < mn) this.moveAway(P, mult, dt);
          else this.strafe(P, 0.4 * mult, dt, Math.sin(this.t * 0.7) > 0 ? 1 : -1);
          break;
        }
        case 'strafe':
          this.strafe(P, mult, dt, Math.sin(this.t * 0.5) > 0 ? 1 : -1);
          if (this.distTo(P) > 150) this.moveToward(P.x, P.y, mult * 0.6, dt);
          break;
        case 'wander': {
          if (!this.data.wanderPt || U.dist(this.x, this.y, this.data.wanderPt.x, this.data.wanderPt.y) < 10 || Math.random() < dt * 0.3) {
            this.data.wanderPt = G.BossKit.randPoint(48);
          }
          this.moveToward(this.data.wanderPt.x, this.data.wanderPt.y, mult, dt);
          break;
        }
        default: break; // 'stand' / 'none'
      }
      if (this.moveMode !== 'none' && !this.lockFacing) this.facing = P.x >= this.x ? 1 : -1;
    }

    onDamaged(amount, info) {
      const def = this.bossDef;
      if (def.poise !== 0 && !this.unstaggerable && !this.isClone) {
        this.poiseAcc += amount;
        if (this.poiseAcc > this.maxHp * (def.poise || 0.07)) {
          this.poiseAcc = 0;
          this.staggerT = 0.55;
          G.FX.text(this.x, this.y - this.r - 14, 'STAGGER', '#ffe060');
        }
      }
      if (this.data.stolen && this.hp <= this.data.stealHp) this.restoreStolen();
      if (def.onDamaged) def.onDamaged(this, amount, info);
      if (this.cloneOf && this.cloneOf.bossDef.onCloneDamaged) this.cloneOf.bossDef.onCloneDamaged(this.cloneOf, this, amount);
    }

    // Give back an ability stolen from the player (Croesus' steal; also usable by Satan).
    restoreStolen() {
      const P = G.World.player;
      if (this.data.stolen && P) {
        P.stolen[this.data.stolen] = false;
        G.FX.text(P.x, P.y - 18, this.data.stolen.toUpperCase() + ' RECLAIMED', '#80ff80');
      }
      this.data.stolen = null;
    }

    // Remove without credit (clones timing out, illusions).
    vanish() {
      if (this.dead) return;
      this.noCredit = true;
      G.FX.burst(this.x, this.y, 16, '#c0c0ff', 50, 0.4);
      this.dead = true;
      this.hp = 0;
      this.onDeath({ vanished: true });
    }

    onDeath(info) {
      this.interrupt();
      const def = this.bossDef;
      if (this.isClone) {
        if (this.cloneOf && def.onCloneDeath) def.onCloneDeath(this.cloneOf, this, info);
        return;
      }
      this.restoreStolen();
      for (const c of this.children) if (!c.dead) { if (c.vanish) c.vanish(); else { c.noCredit = true; G.Combat.kill(c, {}); } }
      if (def.onDeath) def.onDeath(this);
      G.World.onBossDefeated(this);
    }

    draw(ctx) {
      const def = this.bossDef;
      const moving = Math.hypot(this.vx, this.vy) > 5 || this.moveMode === 'chase';
      const draw = () => {
        if (def.draw) def.draw(this, ctx);
        else {
          const a = def.art;
          G.Art[a.type || 'humanoid'](ctx, this.x, this.y, Object.assign({}, a, this.data.artOverride || {}, {
            facing: this.facing, t: this.t, moving, flash: this.flash > 0, aim: this.aimAngle,
          }));
        }
      };
      const alpha = this.alpha * (this.hidden ? 0 : 1);
      if (alpha < 1) D.alpha(alpha, draw); else draw();
      if (this.invulnerable && !this.hidden) D.alpha(0.35 + 0.2 * Math.sin(this.t * 10), () => D.ring(this.x, this.y, this.r + 6, '#c0c0ff', 2));
      if (this.takenMult > 1 && !this.isClone) D.alpha(0.4 + 0.3 * Math.sin(this.t * 12), () => D.ring(this.x, this.y, this.r + 4, '#ff6060', 1));
      if (this.staggerT > 0) D.text('*', this.x + Math.cos(this.t * 9) * 8, this.y - this.r - 12, '#ffe060', { align: 'center' });
      if (def.drawExtra) def.drawExtra(this, ctx);
      this.drawOverlays(ctx);
      if (this.isClone && this.hp < this.maxHp) {
        D.rect(this.x - 8, this.y + this.r + 4, 16, 1, '#300');
        D.rect(this.x - 8, this.y + this.r + 4, 16 * this.hp / this.maxHp, 1, '#c0c0ff');
      }
    }
  }

  G.Boss = Boss;
})();
