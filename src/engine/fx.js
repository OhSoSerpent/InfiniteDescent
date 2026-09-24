// Visual effects: particles, floating numbers, attack telegraphs, slashes, tracers.
(function () {
  'use strict';
  const D = G.Draw, U = G.U;

  const FX = {
    parts: [], texts: [], shapes: [], screenFlash: null,

    clear() { this.parts.length = 0; this.texts.length = 0; this.shapes.length = 0; },

    // ---- particles
    particle(x, y, vx, vy, life, col, size = 1, drag = 3) {
      if (this.parts.length > 900) return;
      this.parts.push({ x, y, vx, vy, life, max: life, col, size, drag });
    },
    burst(x, y, n, col, speed = 60, life = 0.4, size = 1) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * U.TAU, s = speed * (0.3 + Math.random() * 0.7);
        this.particle(x, y, Math.cos(a) * s, Math.sin(a) * s, life * (0.5 + Math.random() * 0.5), col, size);
      }
    },
    spark(x, y, col) { this.particle(x + (Math.random() - 0.5) * 6, y, (Math.random() - 0.5) * 10, -15 - Math.random() * 15, 0.5, col, 1, 1); },

    // ---- floating text
    text(x, y, str, col = '#fff', big = false) {
      if (this.texts.length > 80) this.texts.shift();
      this.texts.push({ x: x + (Math.random() - 0.5) * 6, y, str: String(str), col, life: 0.7, max: 0.7, big });
    },

    // ---- shapes (telegraphs, slashes, tracers)
    // Telegraph: { shape:'circle'|'line'|'arc'|'rect', x,y,r | x2,y2,w | a,half | w,h, dur, color, follow }
    telegraph(o) {
      const t = Object.assign({ kind: 'tele', t: 0, color: '#ff3030' }, o);
      this.shapes.push(t);
      return t;
    },
    slash(x, y, r, a, half, col = '#ffffff', life = 0.15) {
      this.shapes.push({ kind: 'slash', x, y, r, a, half, color: col, t: 0, dur: life });
    },
    tracer(points, col = '#fff6a0', life = 0.08) {
      this.shapes.push({ kind: 'tracer', points, color: col, t: 0, dur: life });
    },
    ringFx(x, y, r, col = '#fff', life = 0.25) {
      this.shapes.push({ kind: 'ring', x, y, r, color: col, t: 0, dur: life });
    },
    flash(col, dur = 0.15) { this.screenFlash = { col, t: dur, dur }; },

    update(dt) {
      for (let i = this.parts.length - 1; i >= 0; i--) {
        const p = this.parts[i];
        p.life -= dt;
        if (p.life <= 0) { this.parts[i] = this.parts[this.parts.length - 1]; this.parts.pop(); continue; }
        const k = Math.max(0, 1 - p.drag * dt);
        p.vx *= k; p.vy *= k;
        p.x += p.vx * dt; p.y += p.vy * dt;
      }
      for (let i = this.texts.length - 1; i >= 0; i--) {
        const t = this.texts[i];
        t.life -= dt; t.y -= 18 * dt;
        if (t.life <= 0) this.texts.splice(i, 1);
      }
      for (let i = this.shapes.length - 1; i >= 0; i--) {
        const s = this.shapes[i];
        s.t += dt;
        if (s.follow) {
          if (s.follow.dead) { this.shapes.splice(i, 1); continue; }
          s.x = s.follow.x + (s.fx || 0); s.y = s.follow.y + (s.fy || 0);
        }
        if (s.t >= s.dur || s.dead) this.shapes.splice(i, 1);
      }
      if (this.screenFlash) { this.screenFlash.t -= dt; if (this.screenFlash.t <= 0) this.screenFlash = null; }
    },

    // Drawn under entities (telegraphs on the ground).
    drawGround(ctx) {
      for (const s of this.shapes) if (s.kind === 'tele') this._tele(ctx, s);
    },
    // Drawn over entities.
    drawTop(ctx) {
      for (const s of this.shapes) {
        const k = 1 - s.t / s.dur;
        if (s.kind === 'slash') {
          D.alpha(k * 0.8, () => {
            D.arcFill(s.x, s.y, s.r, s.a - s.half, s.a + s.half, s.color, s.r * 0.6);
          });
        } else if (s.kind === 'tracer') {
          D.alpha(k, () => {
            ctx.strokeStyle = s.color; ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(s.points[0].x, s.points[0].y);
            for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y);
            ctx.stroke();
          });
        } else if (s.kind === 'ring') {
          D.alpha(k, () => D.ring(s.x, s.y, s.r * (1.2 - k * 0.2), s.color, 2));
        }
      }
      for (const p of this.parts) {
        const a = Math.min(1, (p.life / p.max) * 2);
        ctx.globalAlpha = a;
        ctx.fillStyle = p.col;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
      }
      ctx.globalAlpha = 1;
      for (const t of this.texts) {
        D.alpha(Math.min(1, (t.life / t.max) * 2), () => D.text(t.str, t.x, t.y, t.col, { align: 'center', scale: t.big ? 2 : 1 }));
      }
    },
    _tele(ctx, s) {
      const p = U.clamp(s.t / s.dur, 0, 1);
      const pulse = 0.25 + 0.15 * Math.sin(s.t * 20);
      const col = s.color;
      ctx.save();
      if (s.shape === 'circle') {
        ctx.globalAlpha = pulse;
        D.circ(s.x, s.y, s.r, col);
        ctx.globalAlpha = 0.35;
        D.circ(s.x, s.y, s.r * p, col);
        ctx.globalAlpha = 0.9;
        D.ring(s.x, s.y, s.r, col, 1);
      } else if (s.shape === 'line') {
        const a = Math.atan2(s.y2 - s.y, s.x2 - s.x), len = Math.hypot(s.x2 - s.x, s.y2 - s.y);
        ctx.translate(s.x, s.y); ctx.rotate(a);
        ctx.globalAlpha = pulse; ctx.fillStyle = col; ctx.fillRect(0, -s.w / 2, len, s.w);
        ctx.globalAlpha = 0.4; ctx.fillRect(0, -s.w / 2, len * p, s.w);
        ctx.globalAlpha = 0.9; ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.strokeRect(0, -s.w / 2, len, s.w);
      } else if (s.shape === 'arc') {
        ctx.globalAlpha = pulse;
        D.arcFill(s.x, s.y, s.r, s.a - s.half, s.a + s.half, col);
        ctx.globalAlpha = 0.4;
        D.arcFill(s.x, s.y, s.r * p, s.a - s.half, s.a + s.half, col);
      } else if (s.shape === 'rect') {
        ctx.globalAlpha = pulse; ctx.fillStyle = col; ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.globalAlpha = 0.4; ctx.fillRect(s.x, s.y, s.w, s.h * p);
        ctx.globalAlpha = 0.9; ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.strokeRect(s.x + 0.5, s.y + 0.5, s.w - 1, s.h - 1);
      } else if (s.shape === 'ringwarn') { // shrinking ring toward a point (e.g. charm / freeze warning)
        ctx.globalAlpha = 0.8;
        D.ring(s.x, s.y, s.r * (1 - p) + 4, col, 2);
      }
      ctx.restore();
    },
    drawScreen(ctx) {
      if (this.screenFlash) {
        const f = this.screenFlash;
        D.alpha((f.t / f.dur) * 0.5, () => D.rect(0, 0, G.CFG.W, G.CFG.H, f.col));
      }
    },
  };

  G.FX = FX;
})();
