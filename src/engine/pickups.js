// Small collectibles: hearts, heal orbs and gold.
(function () {
  'use strict';
  const U = G.U, D = G.Draw;

  const TYPES = {
    heart: {
      r: 4, magnet: 30,
      collect(p) { G.Combat.heal(p.value); },
      draw(p, ctx) { G.Art.icon(ctx, 'heart', p.x, p.y + Math.sin(p.t * 5), 1.4); },
    },
    healorb: {
      r: 4, magnet: 40,
      collect(p) { G.Combat.heal(p.value); },
      draw(p) {
        D.alpha(0.4, () => D.circ(p.x, p.y, 5 + Math.sin(p.t * 6), '#60ff80'));
        D.circ(p.x, p.y, 3, '#b0ffc0');
      },
    },
    gold: {
      r: 3, magnet: 40,
      collect(p) {
        G.Run.stats.gold += p.value;
        G.Audio.play('pickup');
        G.Hooks.relic('onGold', { amount: p.value, player: G.World.player });
      },
      draw(p) {
        const w = Math.abs(Math.cos(p.t * 4)) * 2 + 1;
        D.rect(p.x - w / 2, p.y - 2, w, 4, '#f0c840');
        D.rect(p.x - w / 2, p.y - 2, Math.max(1, w / 2), 1, '#fff6c0');
      },
    },
  };

  class Pickup {
    constructor(type, x, y, value) {
      this.def = TYPES[type];
      this.type = type; this.x = x; this.y = y; this.value = value;
      const a = Math.random() * U.TAU, s = 30 + Math.random() * 40;
      this.vx = Math.cos(a) * s; this.vy = Math.sin(a) * s;
      this.t = 0; this.dead = false; this.r = this.def.r;
    }
    update(dt) {
      this.t += dt;
      const P = G.World.player;
      const k = Math.max(0, 1 - 4 * dt);
      this.vx *= k; this.vy *= k;
      if (P && !P.dead && this.t > 0.3) {
        const d = U.dist(this.x, this.y, P.x, P.y);
        if (d < this.def.magnet) {
          const a = U.angle(this.x, this.y, P.x, P.y);
          this.vx += Math.cos(a) * 500 * dt; this.vy += Math.sin(a) * 500 * dt;
        }
        if (d < P.r + this.r + 2) {
          this.dead = true;
          this.def.collect(this);
          return;
        }
      }
      const room = G.World.room;
      G.Physics.move(this, this.vx * dt, this.vy * dt, (tx, ty) => room.solidAt(tx, ty, false));
    }
    draw(ctx) { this.def.draw(this, ctx); }
  }
  Pickup.TYPES = TYPES;

  G.Pickup = Pickup;
})();
