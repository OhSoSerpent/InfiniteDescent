// The player: movement, dash (with i-frames; doubles as a jump), two weapons,
// statuses, temporary buffs and terrain interaction.
(function () {
  'use strict';
  const U = G.U, D = G.Draw, TS = G.CFG.TILE, T = G.T;

  const BASE_SPEED = 105;
  const BASE_HP = 100;
  const DASH_DIST = 64;
  const DASH_TIME = 0.16;
  const DASH_CD = 0.9;
  const FALL_TIME = 0.45;
  const FALL_DMG = 10;

  class Player {
    constructor(x, y) {
      this.isPlayer = true;
      this.x = x; this.y = y; this.r = 4;
      this.vx = 0; this.vy = 0; this.kx = 0; this.ky = 0; this.pushX = 0; this.pushY = 0;
      this.weapons = [new G.Weapon(0, 'Pistol I'), new G.Weapon(1, 'Pistol II')];
      this.cur = 0;
      this.aimAngle = 0; this.facing = 1; this.t = 0; this.moving = false;
      this.maxHp = BASE_HP; this.hp = BASE_HP;
      this.dashCharges = 1; this.dashMax = 1; this.dashCdT = 0; this.dashT = 0; this.dashDir = { x: 1, y: 0 }; this.dashSpeed = 0;
      this.hurtT = 0; this.dashIT = 0;
      this.status = new G.StatusSet(this);
      this.immune = new Set();
      this.buffs = [];
      this.critChance = 0.05;
      this.lastSafe = { x, y };
      this.falling = 0;
      this.stolen = {};
      this.onIceZone = false;
      this.moveTime = 0; this.stillT = 0; this.sinceDash = 99;
      this.liquidT = 0;
      this.dead = false;
      this.trail = [];
      this.recalcStats();
      this.hp = this.maxHp;
    }

    get weapon() { return this.weapons[this.cur]; }

    recalcStats() {
      const s = {
        speedMult: 1, maxHpMult: 1, dashCharges: 1, dashCdMult: 1, dashDistMult: 1,
        takenMult: 1, dealtMult: 1, healMult: 1, hazardMult: 1, eliteTakenMult: 1, immune: [],
      };
      for (const r of G.Hooks.relics()) if (r.def.stats) r.def.stats(s, r.state, r);
      this.stats = s;
      const newMax = Math.max(1, Math.round(BASE_HP * s.maxHpMult));
      if (newMax > this.maxHp) this.hp += newMax - this.maxHp;
      this.maxHp = newMax;
      this.hp = Math.min(this.hp, this.maxHp);
      if (s.dashCharges > this.dashMax) this.dashCharges += s.dashCharges - this.dashMax;
      this.dashMax = s.dashCharges;
      this.dashCharges = Math.min(this.dashCharges, this.dashMax);
      this.immune = new Set(s.immune);
    }

    isInvulnerable() { return this.hurtT > 0 || this.dashIT > 0 || this.falling > 0; }
    isDashing() { return this.dashT > 0; }
    push(x, y) { this.pushX += x; this.pushY += y; }     // continuous force this frame (px/s)
    knock(x, y) { this.kx += x; this.ky += y; }          // impulse (px/s, decays)

    // ---- temporary buffs: { id, t, kind:'dmg'|'interval'|'speed'|'flag', mult, label, color, negative }
    addBuff(id, dur, o = {}) {
      if (o.negative && o.kind === 'speed' && this.immune.has('speed')) return;
      const b = this.buffs.find(x => x.id === id);
      if (b) { b.t = Math.max(b.t, dur); b.max = Math.max(b.max, dur); return; }
      this.buffs.push(Object.assign({ id, t: dur, max: dur, kind: 'flag', mult: 1 }, o));
    }
    buffActive(id) { return this.buffs.some(b => b.id === id); }
    buffMult(kind) {
      let m = 1;
      for (const b of this.buffs) if (b.kind === kind) m *= b.mult;
      return m;
    }

    speed() {
      return BASE_SPEED * this.stats.speedMult * this.status.speedMult() * this.buffMult('speed');
    }

    switchTo(i) {
      if (i === this.cur || this.stolen.swap) return;
      this.weapon.cancelTransient();
      this.cur = i;
      this.weapon.cool = Math.max(this.weapon.cool, 0.12);
      G.Audio.play('select');
    }

    tileUnder() {
      const room = G.World.room;
      return room.tileAt(Math.floor(this.x / TS), Math.floor(this.y / TS));
    }

    update(dt) {
      this.t += dt;
      if (this.dead) return;
      const room = G.World.room;
      const In = G.Input;

      this.status.update(dt);
      if (this.dead) return;
      for (let i = this.buffs.length - 1; i >= 0; i--) { this.buffs[i].t -= dt; if (this.buffs[i].t <= 0) this.buffs.splice(i, 1); }
      this.hurtT -= dt; this.dashIT -= dt;
      this.sinceDash += dt;

      if (this.falling > 0) {
        this.falling -= dt;
        if (this.falling <= 0) this._land();
        return;
      }

      // Aim
      const sp = G.Cam.toScreen(this.x, this.y);
      this.aimAngle = In.aim(sp.x, sp.y, this.aimAngle);
      this.facing = Math.cos(this.aimAngle) >= 0 ? 1 : -1;

      const noMove = this.status.flag('noMove');
      const noAct = this.status.flag('noAct');
      const noDash = this.status.flag('noDash') || this.stolen.dash;
      const noControl = this.status.flag('noControl');
      let m = In.move();
      if (this.status.flag('reverse')) { m = { x: -m.x, y: -m.y }; }
      if (G.World.inputLocked) m = { x: 0, y: 0 };

      // Dash charges
      if (this.dashCharges < this.dashMax) {
        this.dashCdT -= dt;
        if (this.dashCdT <= 0) {
          this.dashCharges++;
          this.dashCdT = this.dashCharges < this.dashMax ? this.dashCooldown() : 0;
        }
      }
      if (In.dash() && !noDash && !noAct && !noMove && this.dashCharges > 0 && this.dashT <= 0 && !G.World.inputLocked) this._startDash(m);

      const blocked = (tx, ty) => room.solidAt(tx, ty, false);
      const platform = G.World.platformAt(this.x, this.y);

      if (this.dashT > 0) {
        this.dashT -= dt;
        G.Physics.move(this, this.dashDir.x * this.dashSpeed * dt, this.dashDir.y * this.dashSpeed * dt, blocked);
        this.trail.push({ x: this.x, y: this.y, t: 0.18 });
        if (this.dashT <= 0) {
          this.sinceDash = 0;
          this.vx = this.dashDir.x * this.speed() * 0.6; this.vy = this.dashDir.y * this.speed() * 0.6;
        }
      } else {
        const speed = this.speed();
        const tx = noMove || noAct ? 0 : m.x * speed, ty = noMove || noAct ? 0 : m.y * speed;
        const onIce = this.onIceZone || G.TileInfo[this.tileUnder()].slippery;
        let accel = 25;
        if (onIce) accel = 2.2;
        if (this.status.flag('sloppy')) accel = Math.min(accel, 3.5);
        if (noControl) accel = 0;
        if (noMove) { this.vx = 0; this.vy = 0; }
        else {
          const k = Math.min(1, accel * dt);
          this.vx += (tx - this.vx) * k; this.vy += (ty - this.vy) * k;
        }
        if (this.status.flag('sloppy') && !noMove) {
          this.vx += (Math.random() - 0.5) * 400 * dt; this.vy += (Math.random() - 0.5) * 400 * dt;
        }
        let dx = (this.vx + this.kx + this.pushX) * dt, dy = (this.vy + this.ky + this.pushY) * dt;
        if (platform) { dx += platform.vx * dt; dy += platform.vy * dt; }
        if (noMove) { dx = (this.kx + this.pushX) * dt * 0.3; dy = (this.ky + this.pushY) * dt * 0.3; }
        const hit = G.Physics.move(this, dx, dy, blocked);
        if (hit.hitX) { this.vx *= onIce ? -0.3 : 0; this.kx = 0; }
        if (hit.hitY) { this.vy *= onIce ? -0.3 : 0; this.ky = 0; }
      }
      const kd = Math.max(0, 1 - 6 * dt);
      this.kx *= kd; this.ky *= kd;
      this.pushX = 0; this.pushY = 0;

      const spd = Math.hypot(this.vx, this.vy);
      this.moving = spd > 12 || this.dashT > 0;
      if (this.moving) { this.moveTime += dt; this.stillT = 0; }
      else { this.stillT += dt; if (this.stillT > 0.12) this.moveTime = 0; }

      if (this.dashT <= 0) this._terrain(dt, platform);
      if (this.dead || this.falling > 0) return;

      // Weapons
      if (!G.World.inputLocked) {
        if (In.weapon1()) this.switchTo(0);
        if (In.weapon2()) this.switchTo(1);
        if (In.swap()) this.switchTo(1 - this.cur);
        if (In.reload() && !this.stolen.reload) this.weapon.startReload();
      }
      const wantFire = In.fire() && !noAct && !G.World.inputLocked;
      for (const w of this.weapons) w.tick(dt, this);
      this.weapon.activeUpdate(dt, this, wantFire);

      G.Hooks.relic('update', { player: this, dt });
      this.onIceZone = false;
      for (let i = this.trail.length - 1; i >= 0; i--) { this.trail[i].t -= dt; if (this.trail[i].t <= 0) this.trail.splice(i, 1); }
    }

    dashCooldown() { return DASH_CD * this.stats.dashCdMult; }

    _startDash(m) {
      let dx = m.x, dy = m.y;
      if (Math.hypot(dx, dy) < 0.2) { dx = Math.cos(this.aimAngle); dy = Math.sin(this.aimAngle); }
      const n = U.norm(dx, dy);
      this.dashDir = n;
      const dist = DASH_DIST * this.stats.dashDistMult;
      this.dashT = DASH_TIME;
      this.dashSpeed = dist / DASH_TIME;
      this.dashIT = DASH_TIME + 0.06;
      if (this.dashCharges === this.dashMax) this.dashCdT = this.dashCooldown();
      this.dashCharges--;
      this.kx = 0; this.ky = 0;
      G.Audio.play('dash');
      G.Hooks.relic('onDash', { player: this });
      G.Hooks.allWeapons('onDash', { player: this });
    }

    _terrain(dt, platform) {
      const room = G.World.room;
      const tx = Math.floor(this.x / TS), ty = Math.floor(this.y / TS);
      if (room.isPitTile(tx, ty) && !platform) { this._startFall(); return; }
      const t = room.tileAt(tx, ty);
      if (t === T.LIQUID) {
        this.liquidT -= dt;
        if (this.liquidT <= 0) {
          this.liquidT = 0.5;
          G.Combat.damagePlayer((room.biome.liquidDps || 12) * 0.5, { tick: true, show: true, source: 'hazard' });
        }
      } else this.liquidT = 0;
      if (t === T.SPIKE && room.spikeActive(tx, ty)) G.Combat.damagePlayer(12, { source: 'hazard' });
      if (t === T.CRUMBLE) room.stepCrumble(tx, ty);
      if (!platform && G.TileInfo[t].ground && t !== T.SPIKE && t !== T.CRUMBLE) {
        this.lastSafe.x = (tx + 0.5) * TS; this.lastSafe.y = (ty + 0.5) * TS;
      }
    }

    _startFall() {
      this.falling = FALL_TIME;
      this.vx = 0; this.vy = 0; this.kx = 0; this.ky = 0;
      G.FX.burst(this.x, this.y, 6, '#40304a', 20, 0.3);
    }
    _land() {
      this.falling = 0;
      const room = G.World.room;
      const safe = room.nearestGround(this.lastSafe.x, this.lastSafe.y);
      this.x = safe.x; this.y = safe.y;
      this.hurtT = 0; this.dashIT = 0;
      G.Combat.damagePlayer(FALL_DMG, { source: 'hazard' });
      this.hurtT = Math.max(this.hurtT, 1.0);
    }

    die() {
      if (this.dead) return;
      this.dead = true;
      G.FX.burst(this.x, this.y, 40, '#c02020', 90, 0.8, 2);
      G.Cam.shake(6, 0.5);
      G.Game.onPlayerDeath();
    }

    draw(ctx) {
      if (this.dead) return;
      for (const tr of this.trail) {
        D.alpha(tr.t * 2.5, () => D.rect(tr.x - 3, tr.y - 7, 6, 12, '#6080ff'));
      }
      if (this.falling > 0) {
        const k = this.falling / FALL_TIME;
        D.alpha(k, () => D.rect(this.x - 3 * k, this.y - 3 * k, 6 * k, 6 * k, '#3a4a8a'));
        return;
      }
      if (this.hurtT > 0 && Math.floor(this.t * 20) % 2 === 0) return;
      const flash = false;
      G.Art.humanoid(ctx, this.x, this.y, {
        s: 1, facing: this.facing, t: this.t, moving: this.moving,
        skin: '#e0b088', body: '#3a4a9a', legs: '#2a2a3a', hair: '#2a1a10', eye: '#101020',
        cape: '#8a2020', weapon: 'pistol', aim: this.aimAngle, flash,
      });
      // Status visuals
      if (this.status.has('freeze')) D.alpha(0.6, () => D.rect(this.x - 6, this.y - 9, 12, 16, '#a0e0ff'));
      if (this.status.has('charm') || this.status.has('reverse')) {
        const c = this.status.has('charm') ? '#ff70c0' : '#40e040';
        D.text(this.status.has('charm') ? '@' : '?', this.x, this.y - 18 + Math.sin(this.t * 6), c, { align: 'center' });
      }
      if (this.status.has('stun')) D.text('*', this.x + Math.cos(this.t * 8) * 5, this.y - 16, '#ffff60', { align: 'center' });
      if (this.status.has('rage')) D.alpha(0.3, () => D.circ(this.x, this.y, 9, '#ff2020'));
      if (this.status.has('immobilize')) D.alpha(0.7, () => D.ring(this.x, this.y + 4, 6, '#f0c040', 2));
      const w = this.weapon;
      if (w.reloading) {
        const k = 1 - w.reloadT / w.reloadMax;
        D.rect(this.x - 7, this.y - 14, 14, 2, '#000');
        D.rect(this.x - 7, this.y - 14, 14 * k, 2, '#f0e080');
      } else if (w.overheatT > 0) {
        D.text('HOT', this.x, this.y - 18, '#ff6030', { align: 'center' });
      }
    }
  }

  G.Player = Player;
})();
