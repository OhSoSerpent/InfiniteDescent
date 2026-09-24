// Ground zones: temporary areas with an effect (poison puddles, fire, gold floor,
// Styx floods, gravity wells, pressure-plate traps...). Types are registry entries.
(function () {
  'use strict';
  const U = G.U, D = G.Draw;

  class Zone {
    // o: { x, y, shape:'circle'|'rect', r, w, h, life, arm, team, source, follow, data }
    constructor(type, o) {
      this.def = G.ZoneTypes.get(type);
      Object.assign(this, {
        type, x: 0, y: 0, shape: 'circle', r: 20, w: 32, h: 32,
        life: 4, arm: 0, age: 0, team: 'enemy', source: 'enemy', follow: null,
        dead: false, tickT: 0, data: {},
      }, this.def.defaults || {}, o);
      if (this.def.init) this.def.init(this);
    }
    get active() { return this.age >= this.arm; }
    contains(x, y, pad = 0) {
      if (this.shape === 'rect') return x >= this.x - pad && x <= this.x + this.w + pad && y >= this.y - pad && y <= this.y + this.h + pad;
      return U.dist(x, y, this.x, this.y) <= this.r + pad;
    }
    update(dt) {
      this.age += dt;
      if (this.follow) {
        if (this.follow.dead) { this.end(); return; }
        this.x = this.follow.x; this.y = this.follow.y;
      }
      if (this.age >= this.arm + this.life) { this.end(); return; }
      if (!this.active) return;
      if (this.def.update) this.def.update(this, dt);
      const P = G.World.player;
      if (this.def.onPlayer && P && !P.dead && this.contains(P.x, P.y, P.r * 0.5)) this.def.onPlayer(this, P, dt);
      if (this.def.onEnemy) {
        for (const e of G.World.enemies) if (!e.dead && this.contains(e.x, e.y, e.r * 0.5)) this.def.onEnemy(this, e, dt);
      }
    }
    end() {
      if (this.dead) return;
      this.dead = true;
      if (this.def.onEnd) this.def.onEnd(this);
    }
    // Periodic damage to the player while inside (does not grant i-frames).
    tickPlayer(dt, dps) {
      this.tickT -= dt;
      if (this.tickT <= 0) {
        this.tickT = 0.5;
        G.Combat.damagePlayer(dps * 0.5, { tick: true, show: true, source: this.source });
      }
    }
    draw(ctx) {
      if (this.def.draw) { this.def.draw(this, ctx); return; }
      const col = this.def.color || '#ff0000';
      const fade = Math.min(1, (this.arm + this.life - this.age) * 2);
      if (!this.active) {
        const p = this.age / this.arm;
        D.alpha(0.2 + 0.2 * Math.sin(this.age * 18), () => this._fill(col));
        D.alpha(0.5, () => this._outline(col, p));
        return;
      }
      D.alpha((this.def.alpha || 0.45) * fade, () => this._fill(col));
      D.alpha(0.7 * fade, () => this._outline(U.shade(col, 0.2), 1));
    }
    _fill(col) {
      if (this.shape === 'rect') D.rect(this.x, this.y, this.w, this.h, col);
      else D.circ(this.x, this.y, this.r, col);
    }
    _outline(col) {
      const ctx = D.ctx;
      if (this.shape === 'rect') { ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.strokeRect(Math.round(this.x) + 0.5, Math.round(this.y) + 0.5, this.w - 1, this.h - 1); }
      else D.ring(this.x, this.y, this.r, col, 1);
    }
  }

  const Z = G.ZoneTypes;
  Z.add({
    id: 'poison', color: '#50b020',
    onPlayer(z, P, dt) {
      z.data.stackT = (z.data.stackT || 0) - dt;
      if (z.data.stackT <= 0) { z.data.stackT = 0.75; P.status.apply('poison', { dur: 2.5, power: 3, source: z.source }); }
    },
    update(z) { if (Math.random() < 0.15) G.FX.spark(z.x + (Math.random() - 0.5) * z.r * 1.4, z.y + (Math.random() - 0.5) * z.r, '#90e050'); },
  });
  Z.add({
    id: 'slow', color: '#6080c0', alpha: 0.35,
    onPlayer(z, P) { P.status.apply('slow', { dur: 0.25, power: z.data.power || 0.5 }); },
  });
  Z.add({
    id: 'fire', color: '#ff6010', alpha: 0.5,
    onPlayer(z, P, dt) { if (z.team === 'enemy') z.tickPlayer(dt, z.data.dps || 14); },
    onEnemy(z, e, dt) {
      if (z.team !== 'player') return;
      z.data.acc = z.data.acc || new Map();
      const t = (z.data.acc.get(e) || 0) - dt;
      if (t <= 0) { z.data.acc.set(e, 0.5); G.Combat.damageEnemy(e, (z.data.dps || 10) * 0.5, { source: 'relic', quiet: true }); e.status.apply('burn', { power: 4, dur: 2 }); }
      else z.data.acc.set(e, t);
    },
    update(z) { if (Math.random() < 0.4) G.FX.particle(z.x + (Math.random() - 0.5) * (z.shape === 'rect' ? 0 : z.r * 1.5) + (z.shape === 'rect' ? Math.random() * z.w : 0), z.y + (z.shape === 'rect' ? Math.random() * z.h : (Math.random() - 0.5) * z.r), 0, -25, 0.4, Math.random() < 0.5 ? '#ffb030' : '#ff5010'); },
  });
  Z.add({
    id: 'styx', color: '#28506a', alpha: 0.7,
    onPlayer(z, P, dt) { z.tickPlayer(dt, z.data.dps || 10); P.status.apply('slow', { dur: 0.25, power: 0.35 }); },
    update(z) { if (Math.random() < 0.3) G.FX.particle(z.shape === 'rect' ? z.x + Math.random() * z.w : z.x, z.shape === 'rect' ? z.y + Math.random() * z.h : z.y, 0, -8, 0.5, '#6aa0c0'); },
  });
  Z.add({
    id: 'gold', color: '#e0b020', alpha: 0.55,
    onPlayer(z, P, dt) { z.tickPlayer(dt, z.data.dps || 10); P.status.apply('slow', { dur: 0.25, power: 0.3 }); },
    update(z) { if (Math.random() < 0.1) G.FX.spark(z.shape === 'rect' ? z.x + Math.random() * z.w : z.x + (Math.random() - 0.5) * z.r, z.shape === 'rect' ? z.y + Math.random() * z.h : z.y, '#fff0a0'); },
  });
  Z.add({
    id: 'ice', color: '#b0e8ff', alpha: 0.4,
    onPlayer(z, P) { P.onIceZone = true; },
  });
  Z.add({
    id: 'gravity', color: '#5040a0', alpha: 0.25,
    onPlayer(z, P, dt) {
      const d = U.dist(P.x, P.y, z.x, z.y);
      if (d < 2) return;
      const pull = (z.data.pull || 60) * (0.4 + 0.6 * (1 - d / z.r));
      const a = U.angle(P.x, P.y, z.x, z.y);
      P.push(Math.cos(a) * pull, Math.sin(a) * pull);
    },
    onEnd(z) {
      if (z.data.collapseDmg) {
        G.FX.burst(z.x, z.y, 40, '#a080ff', z.r * 2, 0.5, 2);
        G.Cam.shake(5, 0.3);
        G.Audio.play('explode');
        const P = G.World.player;
        if (P && U.dist(P.x, P.y, z.x, z.y) <= z.r) G.Combat.damagePlayer(z.data.collapseDmg, { source: z.source });
      }
    },
    draw(z) {
      const k = z.data.collapseDmg ? (z.age - z.arm) / z.life : 0;
      D.alpha(0.18 + k * 0.2, () => D.circ(z.x, z.y, z.r, '#5040a0'));
      for (let i = 0; i < 3; i++) {
        const rr = z.r * (1 - ((z.age * 0.6 + i / 3) % 1));
        D.alpha(0.5, () => D.ring(z.x, z.y, rr, '#a090ff', 1));
      }
      if (z.data.collapseDmg) D.alpha(0.9, () => D.ring(z.x, z.y, z.r, '#ff60ff', 1));
    },
  });
  // Pressure plate. data.trigger(zone) is called once when the player steps on it.
  Z.add({
    id: 'trap', color: '#806040',
    onPlayer(z) { if (!z.data.fired) { z.data.fired = true; if (z.data.trigger) z.data.trigger(z); z.end(); } },
    draw(z) {
      D.alpha(z.data.hidden ? 0.25 : 0.7, () => {
        D.rect(z.x - 5, z.y - 5, 10, 10, '#5a4a38');
        D.rect(z.x - 4, z.y - 4, 8, 8, '#7a6a50');
        D.rect(z.x - 1, z.y - 1, 2, 2, '#c04030');
      });
    },
  });

  G.Zone = Zone;
})();
