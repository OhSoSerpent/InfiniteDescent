// Weapons: a pistol with up to 3 cards. Cards modify stats (static), fire-time
// behaviour (onTrigger), each bullet (modifyBullet), and hit/kill behaviour.
(function () {
  'use strict';
  const U = G.U;

  const BASE = { damage: 10, interval: 0.2, mag: 20, reload: 1.2, speed: 380, life: 0.9, r: 2, spread: 0.035, knock: 25 };
  const MAX_CARDS = 3;
  const BURST_GAP = 0.07;

  class Weapon {
    constructor(index, name) {
      this.index = index;
      this.name = name;
      this.cards = []; // [{ def, state }]
      this.ammo = 0;
      this.reloadT = 0; this.reloadMax = 1;
      this.cool = 0;
      this.queue = [];
      this.shots = 0;
      this.overheatT = 0;
      this.recalc();
      this.ammo = this.stats.mag;
    }
    get reloading() { return this.reloadT > 0; }

    // Rebuild stats/flags from cards.
    recalc() {
      const s = Object.assign({}, BASE, { magMult: 1, reloadMult: 1, dmgMult: 1, speedMult: 1, intervalMult: 1 });
      const f = {};
      for (const c of this.cards) if (c.def.stats) c.def.stats(s, f, c);
      s.mag = Math.max(1, Math.round(BASE.mag * s.magMult));
      if (f.magCap) s.mag = Math.min(s.mag, f.magCap);
      s.reload = BASE.reload * s.reloadMult;
      s.damage = BASE.damage * s.dmgMult;
      s.speed = BASE.speed * s.speedMult;
      s.interval = BASE.interval * s.intervalMult;
      this.stats = s;
      this.flags = f;
      if (this.ammo > s.mag) this.ammo = s.mag;
    }

    hasCard(id) { return this.cards.some(c => c.def.id === id); }

    // Which equipped slots conflict with this card (same exclusive group or same card)?
    conflictsWith(def) {
      const out = [];
      this.cards.forEach((c, i) => {
        if (c.def.id === def.id || (def.group && c.def.group === def.group)) out.push(i);
      });
      return out;
    }
    // Put a card into a slot (replacing what was there). slot === cards.length appends.
    setCard(def, slot) {
      const inst = { def, state: {} };
      if (slot >= this.cards.length) {
        if (this.cards.length >= MAX_CARDS) throw new Error('weapon has no free slot');
        this.cards.push(inst);
      } else {
        this.cards[slot] = inst;
      }
      if (def.onEquip) def.onEquip({ weapon: this }, inst.state, inst);
      this.recalc();
      this.ammo = this.flags.bloodMagic ? this.stats.mag : Math.min(this.stats.mag, Math.max(this.ammo, this.stats.mag));
      this.reloadT = 0;
    }

    cancelTransient() { this.reloadT = 0; this.queue.length = 0; }

    startReload() {
      if (this.flags.bloodMagic || this.reloadT > 0 || this.ammo >= this.stats.mag) return;
      const bonus = (G.Run.bonus && G.Run.bonus.reloadSpeed) || 0;
      this.reloadT = this.reloadMax = this.stats.reload / (1 + bonus);
      G.Audio.play('reload');
    }

    // Always runs for both weapons (timers, card state).
    tick(dt, player) {
      if (this.overheatT > 0) this.overheatT -= dt;
      G.Hooks.weapon(this, 'update', { weapon: this, player, dt, active: player.weapon === this });
    }

    // Runs only for the held weapon.
    activeUpdate(dt, player, wantFire) {
      this.cool -= dt;
      if (this.reloadT > 0) {
        this.reloadT -= dt;
        if (this.reloadT <= 0) { this.reloadT = 0; this.ammo = this.stats.mag; G.Audio.play('reload'); }
      }
      for (let i = this.queue.length - 1; i >= 0; i--) {
        const q = this.queue[i];
        q.t -= dt;
        if (q.t <= 0) { this.queue.splice(i, 1); q.fn(); }
      }
      if (wantFire) this.tryFire(player);
    }

    tryFire(player) {
      if (this.cool > 0 || this.reloadT > 0 || this.overheatT > 0) return false;
      if (player.buffActive('jam')) return false;
      const f = this.flags;
      const unlimited = f.bloodMagic || player.buffActive('infammo');
      if (!unlimited && this.ammo <= 0) { this.startReload(); G.Audio.play('empty'); return false; }

      const n = f.burst ? (unlimited ? 3 : Math.min(3, this.ammo)) : 1;
      this.shots++;
      if (G.Run.active) G.Run.stats.shots++;
      const ctx = {
        weapon: this, player, shotNo: this.shots, globalShotNo: G.Run.active ? G.Run.stats.shots : this.shots,
        fireMult: 1, crit: Math.random() < player.critChance, bullets: n, lastIndex: -1, lastMult: 1, isEcho: false,
      };
      if (f.bloodMagic) {
        G.Combat.selfDamage(n);
      } else if (!unlimited) {
        if (this.ammo - n <= 0) ctx.lastIndex = n - 1;
        this.ammo -= n;
      }
      G.Hooks.weapon(this, 'onTrigger', ctx);
      G.Hooks.relic('onTrigger', ctx);

      this.emit(player, ctx, 0);
      for (let i = 1; i < n; i++) this.queue.push({ t: i * BURST_GAP, fn: () => this.emit(player, ctx, i) });

      const fireBonus = (G.Run.bonus && G.Run.bonus.fireRate) || 0;
      const interval = this.stats.interval * G.Hooks.weaponMult(this, 'intervalMult', ctx) * player.buffMult('interval') / (1 + fireBonus);
      this.cool = interval + (n - 1) * BURST_GAP;
      G.Audio.play(this.stats.dmgMult >= 2 ? 'heavy' : 'shoot');
      if (!unlimited && this.ammo <= 0) this.startReload();
      return true;
    }

    // Spawns the bullets for one trigger pull (or one bullet of a burst / an echo).
    emit(player, ctx, burstIndex, dmgFactor = 1) {
      const f = this.flags, s = this.stats;
      const base = player.aimAngle;
      const pellets = f.pellets || 1;
      const multi = f.doubleTap ? 2 : 1;
      const mx = player.x + Math.cos(base) * 7, my = player.y - 1 + Math.sin(base) * 7;
      for (let p = 0; p < pellets; p++) {
        for (let m = 0; m < multi; m++) {
          const a = base + (pellets > 1 ? (p / (pellets - 1) - 0.5) * (f.pelletArc || 0.5) : 0) + (Math.random() - 0.5) * s.spread * 2;
          const off = multi > 1 ? (m === 0 ? -3 : 3) : 0;
          // Bullets start at the player's centre (not the muzzle) so point-blank enemies still get hit.
          const b = {
            team: 'player',
            x: player.x + Math.cos(base + Math.PI / 2) * off, y: player.y - 1 + Math.sin(base + Math.PI / 2) * off,
            vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed, r: s.r,
            dmg: s.damage * (pellets > 1 ? (f.pelletFactor || 1) : 1) * dmgFactor,
            fireMult: ctx.fireMult * (burstIndex === ctx.lastIndex ? ctx.lastMult : 1),
            crit: ctx.crit, life: s.life, kind: 'bullet', color: '#ffe890', weapon: this, knock: s.knock,
          };
          G.Hooks.weapon(this, 'modifyBullet', { bullet: b, trig: ctx, weapon: this, player, burstIndex });
          G.World.spawnPlayerBullet(b);
        }
      }
      G.FX.particle(mx, my, Math.cos(base) * 40, Math.sin(base) * 40, 0.08, '#fff0a0', 2, 10);
    }
  }
  Weapon.BASE = BASE;
  Weapon.MAX_CARDS = MAX_CARDS;

  G.Weapon = Weapon;
})();
