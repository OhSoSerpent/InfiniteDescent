// Room props: interactive / persistent objects that live in a room
// (pedestals, portals, graves, corpses, moving platforms, dart traps, treasures, trophies).
(function () {
  'use strict';
  const U = G.U, D = G.Draw, TS = G.CFG.TILE;

  class Prop {
    constructor(o) {
      Object.assign(this, { x: 0, y: 0, r: 6, dead: false, t: 0, shootable: false, layer: 0 }, o);
    }
    update(dt) { this.t += dt; }
    draw() {}
    touching(pad = 0) {
      const P = G.World.player;
      return P && !P.dead && U.dist(P.x, P.y, this.x, this.y) <= this.r + P.r + pad;
    }
  }

  // ------------------------------------------------------------ pedestals
  class RelicPedestal extends Prop {
    constructor(o) { super(Object.assign({ r: 8, relicId: null, taken: false }, o)); }
    update(dt) {
      super.update(dt);
      if (!this.taken && this.relicId && this.touching()) {
        this.taken = true;
        G.Run.giveRelic(this.relicId);
      }
    }
    draw(ctx) {
      D.rect(this.x - 8, this.y + 2, 16, 6, '#5a5060');
      D.rect(this.x - 6, this.y - 2, 12, 5, '#7a7080');
      if (!this.taken && this.relicId) {
        const def = G.Relics.get(this.relicId);
        const bob = Math.sin(this.t * 3) * 2;
        D.alpha(0.3, () => D.circ(this.x, this.y - 10 + bob, 8, def.color || '#ffd060'));
        D.rect(this.x - 5, this.y - 15 + bob, 10, 10, '#000');
        D.rect(this.x - 4, this.y - 14 + bob, 8, 8, def.color || '#ffd060');
        D.text((def.glyph || '?').slice(0, 1), this.x, this.y - 13 + bob, '#000', { align: 'center', shadow: false });
        D.text('RELIC', this.x, this.y + 10, '#f0d080', { align: 'center' });
      }
    }
  }

  class CardPedestal extends Prop {
    constructor(o) { super(Object.assign({ r: 8, taken: false }, o)); }
    update(dt) {
      super.update(dt);
      if (!this.taken && this.touching()) {
        this.taken = true;
        G.Game.openCardPick({ title: 'A FREE CARD', subtitle: 'Choose one card to equip.' });
      }
    }
    draw() {
      D.rect(this.x - 8, this.y + 2, 16, 6, '#5a5060');
      D.rect(this.x - 6, this.y - 2, 12, 5, '#7a7080');
      if (!this.taken) {
        const bob = Math.sin(this.t * 3) * 2;
        D.alpha(0.3, () => D.circ(this.x, this.y - 10 + bob, 8, '#80c0ff'));
        D.rect(this.x - 4, this.y - 17 + bob, 9, 12, '#000');
        D.rect(this.x - 3, this.y - 16 + bob, 7, 10, '#e0e8ff');
        D.rect(this.x - 2, this.y - 14 + bob, 5, 3, '#6080c0');
        D.text('CARD', this.x, this.y + 10, '#a0c0ff', { align: 'center' });
      }
    }
  }

  // ------------------------------------------------------------ portal
  class Portal extends Prop {
    constructor(o) { super(Object.assign({ r: 10, onEnter: null, used: false, label: 'DESCEND', color: '#c040ff' }, o)); }
    update(dt) {
      super.update(dt);
      if (!this.used && this.t > 0.8 && this.touching(-4)) {
        this.used = true;
        if (this.onEnter) this.onEnter();
      }
      if (Math.random() < 0.5) {
        const a = Math.random() * U.TAU;
        G.FX.particle(this.x + Math.cos(a) * 14, this.y + Math.sin(a) * 8, -Math.cos(a) * 20, -Math.sin(a) * 12, 0.6, this.color);
      }
    }
    draw() {
      const k = Math.min(1, this.t * 2);
      D.ellipse(this.x, this.y, 14 * k, 8 * k, '#100018');
      D.alpha(0.8, () => { D.ctx.strokeStyle = this.color; D.ctx.lineWidth = 2; D.ctx.beginPath(); D.ctx.ellipse(this.x, this.y, 14 * k, 8 * k, 0, 0, U.TAU); D.ctx.stroke(); });
      D.alpha(0.5, () => { D.ctx.strokeStyle = '#ffffff'; D.ctx.lineWidth = 1; D.ctx.beginPath(); D.ctx.ellipse(this.x, this.y, 9 * k * (0.8 + 0.2 * Math.sin(this.t * 5)), 5 * k, 0, 0, U.TAU); D.ctx.stroke(); });
      D.text(this.label, this.x, this.y - 20, '#e0b0ff', { align: 'center' });
    }
  }

  // ------------------------------------------------------------ meta item (Satan's drop)
  class MetaItem extends Prop {
    constructor(o) { super(Object.assign({ r: 8, taken: false, metaId: null }, o)); }
    update(dt) {
      super.update(dt);
      if (!this.taken && this.t > 1 && this.touching()) {
        this.taken = true;
        G.Game.collectMetaItem(this.metaId);
      }
    }
    draw() {
      if (this.taken) return;
      const bob = Math.sin(this.t * 3) * 2;
      D.alpha(0.35 + 0.15 * Math.sin(this.t * 6), () => D.circ(this.x, this.y - 6 + bob, 12, '#ffffff'));
      D.rect(this.x - 4, this.y - 10 + bob, 8, 8, '#fff6d0');
      D.rect(this.x - 2, this.y - 8 + bob, 4, 4, '#e04040');
      D.text('???', this.x, this.y + 10, '#ffffff', { align: 'center' });
    }
  }

  // ------------------------------------------------------------ trophy (decor in the pre-boss room)
  class Trophy extends Prop {
    constructor(o) { super(Object.assign({ r: 6, icon: 'rock', color: '#ddd', name: '' }, o)); }
    draw(ctx) {
      D.rect(this.x - 7, this.y, 14, 8, '#3a2a30');
      D.rect(this.x - 6, this.y - 1, 12, 2, '#5a4a50');
      D.alpha(0.25, () => D.circ(this.x, this.y - 8, 7, '#ffd080'));
      G.Art.icon(ctx, this.icon, this.x, this.y - 8, 2, this.color);
      D.text(this.name, this.x, this.y + 11, '#a08070', { align: 'center' });
    }
  }

  // ------------------------------------------------------------ graves & corpses (Heresy)
  class Grave extends Prop {
    constructor(o) { super(Object.assign({ r: 6, hp: 30, maxHp: 30, shootable: true, flash: 0 }, o)); }
    damage(amount) {
      if (this.dead) return;
      this.hp -= amount;
      this.flash = 0.08;
      if (this.hp <= 0) {
        this.dead = true;
        G.FX.burst(this.x, this.y, 14, '#8a8490', 60, 0.5);
        G.FX.text(this.x, this.y - 10, 'GRAVE BROKEN', '#c0b0ff');
        G.Audio.play('explode');
      }
    }
    update(dt) {
      super.update(dt);
      if (this.flash > 0) this.flash -= dt;
      if (Math.random() < dt * 4) G.FX.particle(this.x + (Math.random() - 0.5) * 6, this.y - 8, 0, -20, 0.5, Math.random() < 0.5 ? '#ff8020' : '#ffd040');
    }
    draw() {
      const c = this.flash > 0 ? '#ffffff' : '#7a7480';
      D.rect(this.x - 5, this.y + 2, 10, 4, '#4a4450');
      D.rect(this.x - 4, this.y - 8, 8, 11, c);
      D.rect(this.x - 3, this.y - 9, 6, 1, c);
      D.rect(this.x - 1, this.y - 6, 2, 6, '#3a3440');
      D.rect(this.x - 3, this.y - 4, 6, 2, '#3a3440');
      D.alpha(0.5 + 0.3 * Math.sin(this.t * 8), () => D.rect(this.x - 2, this.y - 13, 4, 3, '#ff9020'));
      const w = Math.round(10 * this.hp / this.maxHp);
      D.rect(this.x - 5, this.y + 7, 10, 1, '#300');
      D.rect(this.x - 5, this.y + 7, w, 1, '#c0a0ff');
    }
  }

  class Corpse extends Prop {
    constructor(o) { super(Object.assign({ r: 5, enemyId: null, grave: null, timer: 4, max: 4, elite: false }, o)); }
    update(dt) {
      super.update(dt);
      if (!this.grave || this.grave.dead) {
        this.dead = true;
        G.FX.burst(this.x, this.y, 8, '#6a6070', 30, 0.4);
        return;
      }
      this.timer -= dt;
      if (this.timer <= 0) {
        this.dead = true;
        const e = G.World.spawnEnemy(this.enemyId, this.x, this.y, { elite: this.elite, grave: this.grave, hpFrac: 0.5, instant: true });
        e.aware = true;
        G.FX.burst(this.x, this.y, 16, '#a080ff', 50, 0.5);
        G.FX.text(this.x, this.y - 10, 'RISEN', '#c0a0ff');
      }
    }
    draw() {
      const k = 1 - this.timer / this.max;
      D.rect(this.x - 5, this.y, 10, 3, '#6a6070');
      D.rect(this.x - 3, this.y - 2, 3, 2, '#d8d0c0');
      D.alpha(0.3 + k * 0.5, () => D.ring(this.x, this.y, 8 - k * 4, '#a080ff', 1));
    }
  }

  // ------------------------------------------------------------ moving platform (Greed)
  class Platform extends Prop {
    // x,y is the top-left of a w*h rect moving between (ax,ay) and (bx,by).
    constructor(o) { super(Object.assign({ w: 32, h: 32, ax: 0, ay: 0, bx: 0, by: 0, speed: 30, dir: 1, pause: 0, layer: -1, vx: 0, vy: 0 }, o)); this.x = this.ax; this.y = this.ay; }
    contains(px, py) { return px >= this.x && px <= this.x + this.w && py >= this.y && py <= this.y + this.h; }
    update(dt) {
      super.update(dt);
      const ox = this.x, oy = this.y;
      if (this.pause > 0) { this.pause -= dt; this.vx = 0; this.vy = 0; return; }
      const tx = this.dir > 0 ? this.bx : this.ax, ty = this.dir > 0 ? this.by : this.ay;
      const d = U.dist(this.x, this.y, tx, ty);
      const step = this.speed * dt;
      if (d <= step) { this.x = tx; this.y = ty; this.dir = -this.dir; this.pause = 0.8; }
      else { this.x += (tx - this.x) / d * step; this.y += (ty - this.y) / d * step; }
      this.vx = (this.x - ox) / dt; this.vy = (this.y - oy) / dt;
    }
    draw() {
      D.rect(this.x, this.y + 2, this.w, this.h, 'rgba(0,0,0,0.4)');
      D.rect(this.x, this.y, this.w, this.h, '#8a6a30');
      D.rect(this.x + 1, this.y + 1, this.w - 2, this.h - 2, '#b08a40');
      for (let i = 4; i < this.w; i += 8) D.rect(this.x + i, this.y + 1, 1, this.h - 2, '#8a6a30');
      D.rect(this.x + 2, this.y + 2, 2, 2, '#f0d060'); D.rect(this.x + this.w - 4, this.y + this.h - 4, 2, 2, '#f0d060');
    }
  }

  // ------------------------------------------------------------ dart trap (wall turret)
  class DartTrap extends Prop {
    constructor(o) { super(Object.assign({ r: 4, angle: 0, period: 2.4, phase: 0, dmg: 10 }, o)); this.cd = this.period * (0.3 + this.phase); }
    update(dt) {
      super.update(dt);
      if (!G.World.room.hazardsLive()) return;
      this.cd -= dt;
      if (this.cd <= 0) {
        this.cd = this.period;
        const p = G.World.spawnEnemyProjectile({
          x: this.x + Math.cos(this.angle) * 8, y: this.y + Math.sin(this.angle) * 8,
          vx: Math.cos(this.angle) * 170, vy: Math.sin(this.angle) * 170, r: 2, dmg: this.dmg, kind: 'arrow', life: 3, hazard: true,
        });
        p.color2 = '#f0c040';
      }
    }
    draw() {
      const warn = this.cd < 0.4 && G.World.room.hazardsLive();
      D.rect(this.x - 4, this.y - 4, 8, 8, '#5a4a20');
      D.rect(this.x - 3, this.y - 3, 6, 6, warn ? '#ff6040' : '#c09030');
      D.rect(this.x + Math.cos(this.angle) * 4 - 1, this.y + Math.sin(this.angle) * 4 - 1, 2, 2, '#1a1008');
    }
  }

  // ------------------------------------------------------------ treasure (Greed temporary buffs, some trapped)
  class Treasure extends Prop {
    constructor(o) { super(Object.assign({ r: 6, trapped: false, opened: false }, o)); }
    update(dt) {
      super.update(dt);
      if (!this.opened && this.touching()) {
        this.opened = true;
        G.Treasures.open(this);
      }
    }
    draw() {
      if (this.opened) {
        D.rect(this.x - 6, this.y - 2, 12, 7, '#4a3010');
        D.rect(this.x - 5, this.y - 1, 10, 3, '#1a1008');
        return;
      }
      D.rect(this.x - 6, this.y - 4, 12, 9, '#6a4010');
      D.rect(this.x - 5, this.y - 3, 10, 3, '#9a6a20');
      D.rect(this.x - 6, this.y, 12, 1, '#e0b030');
      D.rect(this.x - 1, this.y - 1, 2, 3, '#e0b030');
      // A subtle tell: trapped chests glint red instead of white.
      if ((this.t * 1.3) % 2 < 0.15) D.rect(this.x + 3, this.y - 3, 1, 1, this.trapped ? '#ff6060' : '#ffffff');
    }
  }

  // ------------------------------------------------------------ pressure plate (Fraud)
  class PressurePlate extends Prop {
    constructor(o) { super(Object.assign({ r: 5, kind: 'blast', cd: 0 }, o)); }
    update(dt) {
      super.update(dt);
      if (this.cd > 0) { this.cd -= dt; return; }
      if (!this.touching(-2)) return;
      this.cd = 3.5;
      G.Audio.play('telegraph');
      const K = G.BossKit, x = this.x, y = this.y;
      if (this.kind === 'blast') {
        K.bomb(x, y, 28, 0.6, 14, { source: 'hazard' });
      } else {
        for (let i = 0; i < 4; i++) {
          const a = i * Math.PI / 2 + Math.PI / 4;
          const sx = x + Math.cos(a) * 90, sy = y + Math.sin(a) * 90;
          K.teleLine(sx, sy, x, y, 4, 0.5, '#ff8040');
          K.after(0.5, () => {
            G.World.spawnEnemyProjectile({ x: sx, y: sy, vx: -Math.cos(a) * 220, vy: -Math.sin(a) * 220, r: 2, dmg: 10, kind: 'arrow', life: 1.2, hazard: true, pierceWalls: true });
          });
        }
      }
    }
    draw() {
      const pressed = this.cd > 0;
      D.rect(this.x - 5, this.y - 5, 10, 10, '#4a4038');
      D.rect(this.x - 4, this.y - 4 + (pressed ? 1 : 0), 8, 8, pressed ? '#5a5040' : '#6a6050');
      D.rect(this.x - 1, this.y - 1, 2, 2, pressed ? '#a04030' : '#7a3a30');
    }
  }

  // ------------------------------------------------------------ boss skull (hard-mode switch)
  // Dropped by bosses on levels 1-8. Five bullet hits light its eyes red and commit the NEXT
  // level to hard mode (one level only; cannot be undone). It is solid to the player.
  class Skull extends Prop {
    constructor(o) { super(Object.assign({ r: 8, shootable: true, hits: 0, lit: false, flash: 0 }, o)); }
    static get HITS() { return 5; }
    damage(amount, source) {
      if (this.lit || !(source instanceof G.Projectile)) return; // only bullets count
      this.hits++;
      this.flash = 0.08;
      G.Audio.play('hit');
      G.FX.burst(this.x, this.y - 4, 4, '#e8e0d0', 30, 0.2);
      if (this.hits >= Skull.HITS) this.light();
    }
    light() {
      this.lit = true;
      G.Run.hardNext = true;
      G.Audio.play('boss');
      G.Cam.shake(4, 0.4);
      G.FX.flash('#ff0000', 0.25);
      G.FX.burst(this.x, this.y - 4, 30, '#ff2020', 70, 0.6);    }
    update(dt) {
      super.update(dt);
      if (this.flash > 0) this.flash -= dt;
      // Solid: push the player out.
      const P = G.World.player;
      if (P && !P.dead) {
        const d = U.dist(P.x, P.y, this.x, this.y), min = this.r + P.r;
        if (d < min) {
          const a = d > 0.01 ? U.angle(this.x, this.y, P.x, P.y) : 0;
          const room = G.World.room;
          G.Physics.move(P, Math.cos(a) * (min - d), Math.sin(a) * (min - d), (tx, ty) => room.solidAt(tx, ty, false));
        }
      }
      if (this.lit && Math.random() < dt * 10) {
        for (const ex of [-3, 3]) G.FX.particle(this.x + ex, this.y - 5, (Math.random() - 0.5) * 6, -12, 0.5, '#ff3020');
      }
    }
    draw() {
      const x = Math.round(this.x), y = Math.round(this.y);
      const bone = this.flash > 0 ? '#ffffff' : '#e0d8c4', dark = '#8a8070';
      D.ellipse(x, y + 7, 9, 2, 'rgba(0,0,0,0.35)');
      D.rect(x - 7, y - 11, 14, 11, dark);
      D.rect(x - 6, y - 12, 12, 11, bone);
      D.rect(x - 7, y - 9, 14, 6, bone);
      D.rect(x - 4, y - 1, 8, 5, bone);              // jaw
      D.rect(x - 3, y + 1, 1, 3, dark); D.rect(x - 1, y + 1, 1, 3, dark); D.rect(x + 1, y + 1, 1, 3, dark); D.rect(x + 3, y + 1, 1, 3, dark);
      D.rect(x - 1, y - 3, 2, 2, dark);              // nose
      // Cracks appear with each hit.
      const cracks = [[-5, -11, 1, 3], [3, -12, 1, 4], [-2, -12, 1, 2], [5, -8, 1, 3], [-6, -6, 1, 2]];
      for (let i = 0; i < Math.min(this.hits, cracks.length); i++) { const c = cracks[i]; D.rect(x + c[0], y + c[1], c[2], c[3], dark); }
      // Eyes: dark sockets, or glowing red once lit.
      const eye = this.lit ? '#ff2020' : '#1a1410';
      D.rect(x - 5, y - 8, 3, 3, eye); D.rect(x + 2, y - 8, 3, 3, eye);
      // No labels or counters: the cracks and the glow are the only hints (hard mode is meant to be cryptic).
      if (this.lit) {
        D.alpha(0.35 + 0.25 * Math.sin(this.t * 8), () => { D.circ(x - 3.5, y - 6.5, 4, '#ff2020'); D.circ(x + 3.5, y - 6.5, 4, '#ff2020'); });
      }
    }
  }

  G.Prop = Prop;
  G.Props = { RelicPedestal, CardPedestal, Portal, MetaItem, Trophy, Grave, Corpse, Platform, DartTrap, Treasure, PressurePlate, Skull };
})();
