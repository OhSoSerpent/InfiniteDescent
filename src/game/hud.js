// In-canvas HUD: health, dashes, weapons + cards, relics, buffs, minimap, boss bar,
// banners, toasts and the crosshair.
(function () {
  'use strict';
  const U = G.U, D = G.Draw;
  // The view size (G.CFG.W x G.CFG.H) follows the window, so it is always read live.

  const HUD = {
    banners: [], toasts: [],

    reset() { this.banners = []; this.toasts = []; },

    // Big centred title card. small: use a smaller layout (relic pickups).
    banner(title, sub, dur = 2.5, small = false) {
      this.banners = this.banners.filter(b => b.small !== small);
      this.banners.push({ title, sub: sub || '', t: dur, max: dur, small });
    },
    toast(msg, color = '#ffffff') {
      this.toasts.push({ msg, color, t: 3 });
      if (this.toasts.length > 4) this.toasts.shift();
    },

    update(dt) {
      for (const b of this.banners) b.t -= dt;
      this.banners = this.banners.filter(b => b.t > 0);
      for (const t of this.toasts) t.t -= dt;
      this.toasts = this.toasts.filter(t => t.t > 0);
    },

    draw(ctx) {
      const P = G.World.player;
      if (!P) return;
      this._health(P);
      this._relics();
      this._buffs(P);
      this._weapons(P);
      this._minimap();
      this._boss();      this._banners();
      this._toasts();
      if (G.Input.device === 'kb' && G.Game.state === 'play') this._crosshair();
    },

    _health(P) {
      const x = 6, y = 6, w = 90;
      D.rect(x - 1, y - 1, w + 2, 9, '#000');
      D.rect(x, y, w, 7, '#3a0a0a');
      D.rect(x, y, w * U.clamp(P.hp / P.maxHp, 0, 1), 7, P.hp < P.maxHp * 0.25 ? '#ff3030' : '#d02828');
      D.rect(x, y, w * U.clamp(P.hp / P.maxHp, 0, 1), 2, '#ff7070');
      D.text(Math.ceil(P.hp) + '/' + P.maxHp, x + w + 5, y, '#ffffff');
      // Dash pips
      for (let i = 0; i < P.dashMax; i++) {
        const px = x + i * 9, py = y + 11;
        const full = i < P.dashCharges;
        D.rect(px, py, 7, 4, '#000');
        if (full) D.rect(px + 1, py + 1, 5, 2, P.stolen.dash ? '#606060' : '#60c0ff');
        else if (i === P.dashCharges) {
          const k = 1 - U.clamp(P.dashCdT / P.dashCooldown(), 0, 1);
          D.rect(px + 1, py + 1, 5 * k, 2, '#305a80');
        }
      }
      if (P.stolen.dash || P.stolen.swap || P.stolen.reload) {
        const what = Object.keys(P.stolen).filter(k => P.stolen[k]).join(', ').toUpperCase();
        D.text('STOLEN: ' + what, x + P.dashMax * 9 + 4, y + 10, '#f0c040');
      }
    },

    _relics() {
      const rel = G.Run.relics;
      let x = 6, y = 24;
      rel.forEach((r, i) => {
        const def = r.def;
        const dim = def.dim && def.dim(r.state);
        D.alpha(dim ? 0.4 : 1, () => {
          D.rect(x, y, 9, 9, '#000');
          D.rect(x + 1, y + 1, 7, 7, def.color || '#ffd060');
          D.text(def.glyph || '?', x + 2, y + 1, '#000', { shadow: false });
        });
        const badge = def.badge && def.badge(r.state);
        if (badge) D.text(badge, x + 5, y + 10, '#ffffff');
        x += 11;
        if (i % 12 === 11) { x = 6; y += 18; }
      });
    },

    _buffs(P) {
      let y = 44 + Math.floor(G.Run.relics.length / 12) * 18;
      const show = [];
      P.status.each(st => { if (!['reaper', 'marked'].includes(st.id)) show.push({ label: st.def.name.toUpperCase() + (st.stacks > 1 ? ' x' + st.stacks : ''), col: st.def.color, t: st.t, max: st.dur }); });
      for (const b of P.buffs) if (b.label) show.push({ label: b.label, col: b.color || '#fff', t: b.t, max: b.max });
      for (const s of show) {
        D.text(s.label, 6, y, s.col);
        if (isFinite(s.max) && s.max > 0) D.rect(6, y + 8, 40 * U.clamp(s.t / s.max, 0, 1), 1, s.col);
        y += 11;
      }
    },

    _weapons(P) {
      const baseY = G.CFG.H - 34;
      P.weapons.forEach((w, i) => {
        const x = 6 + i * 112, y = baseY;
        const active = i === P.cur;
        D.rect(x, y, 108, 28, active ? 'rgba(40,30,50,0.85)' : 'rgba(20,15,25,0.6)');
        D.rect(x, y, 108, 1, active ? '#f0c060' : '#4a3a50');
        D.text((i + 1) + ' ' + w.name.toUpperCase(), x + 3, y + 3, active ? '#f0e0b0' : '#8a7a8a');
        let ammo;
        if (w.flags.bloodMagic) ammo = 'BLOOD';
        else if (P.buffActive('infammo')) ammo = 'INF';
        else ammo = w.reloading ? 'RELOAD' : w.ammo + '/' + w.stats.mag;
        D.text(ammo, x + 105, y + 3, w.reloading ? '#f0e080' : w.ammo === 0 && !w.flags.bloodMagic ? '#ff5050' : '#ffffff', { align: 'right' });
        // card chips
        for (let c = 0; c < 3; c++) {
          const cx = x + 3 + c * 22, cy = y + 13;
          const card = w.cards[c];
          D.rect(cx, cy, 20, 10, '#000');
          if (card) {
            D.rect(cx + 1, cy + 1, 18, 8, card.def.color);
            D.text(card.def.glyph, cx + 4, cy + 2, '#000', { shadow: false });
          } else D.rect(cx + 1, cy + 1, 18, 8, '#1a141e');
        }
        // card HUD bars (overheat, fate counter...)
        let by = y + 13;
        for (const card of w.cards) {
          const h = card.def.hud && card.def.hud(w, card.state);
          if (!h) continue;
          D.rect(x + 71, by, 34, 3, '#000');
          D.rect(x + 71, by, 34 * U.clamp(h.frac, 0, 1), 3, h.color);
          by += 5;
        }
        if (w.overheatT > 0 && active) D.text('HOT', x + 88, y + 20, '#ff5030', { align: 'center' });
      });
      if (P.stolen.swap) D.text('SWAP STOLEN', 6 + 112 * (1 - P.cur) + 54, baseY + 20, '#f0c040', { align: 'center' });
    },

    _minimap() {
      const L = G.World.level;
      if (!L || L.rooms.length < 2) return;
      const cur = G.World.room;
      const known = new Set();
      for (const r of L.rooms) if (r.visited) { known.add(r); for (const d of r.doors) if (d.to) known.add(d.to); }
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const r of known) { minX = Math.min(minX, r.gx); minY = Math.min(minY, r.gy); maxX = Math.max(maxX, r.gx); maxY = Math.max(maxY, r.gy); }
      const cw = 9, ch = 6, gap = 2;
      const w = (maxX - minX + 1) * (cw + gap), h = (maxY - minY + 1) * (ch + gap);
      const ox = G.CFG.W - w - 6, oy = 6;
      D.alpha(0.5, () => D.rect(ox - 3, oy - 3, w + 5, h + 5, '#000'));
      for (const r of known) {
        const x = ox + (r.gx - minX) * (cw + gap), y = oy + (r.gy - minY) * (ch + gap);
        for (const d of r.doors) {
          if (!d.to || !known.has(d.to)) continue;
          if (d.side === 'E') D.rect(x + cw, y + ch / 2 - 1, gap, 2, '#6a6070');
          if (d.side === 'S') D.rect(x + cw / 2 - 1, y + ch, 2, gap, '#6a6070');
        }
        let col = r.visited ? (r.cleared || r.type !== 'combat' ? '#8a8090' : '#6a4050') : '#3a3440';
        if (r === cur) col = '#f0e0b0';
        D.rect(x, y, cw, ch, col);
        if (r.type === 'boss') D.rect(x + 3, y + 1, 3, 4, r === cur ? '#a02020' : '#ff3030');
        if (r.type === 'relic') D.rect(x + 3, y + 1, 3, 4, '#ffd040');
        if (r.type === 'treasure') D.rect(x + 3, y + 2, 3, 2, '#f0c040');
      }
    },

    _boss() {
      const b = G.World.boss;
      if (!b || b.dead) return;
      const w = 190, x = (G.CFG.W - w) / 2, y = 15;
      D.text(b.bossDef.name.toUpperCase(), G.CFG.W / 2, y - 10, '#f0c0a0', { align: 'center' });
      D.rect(x - 1, y - 1, w + 2, 7, '#000');
      D.rect(x, y, w, 5, '#2a0808');
      D.rect(x, y, w * U.clamp(b.hp / b.maxHp, 0, 1), 5, b.invulnerable ? '#8080a0' : '#c02020');
      if (b.bossDef.phase2At) D.rect(x + w * b.bossDef.phase2At, y - 1, 1, 7, '#ffffff');
    },

    _banners() {
      for (const b of this.banners) {
        const a = U.clamp(Math.min(b.t, b.max - b.t) * 3, 0, 1);
        D.alpha(a, () => {
          if (b.small) {
            const lines = D.wrap(b.sub, 60);
            const y = 60;
            D.alpha(0.6, () => D.rect(0, y - 6, G.CFG.W, 22 + lines.length * 9, '#000'));
            D.text(b.title, G.CFG.W / 2, y, '#ffd060', { align: 'center' });
            lines.forEach((l, i) => D.text(l, G.CFG.W / 2, y + 12 + i * 9, '#e0d8c8', { align: 'center' }));
          } else {
            const y = 88;
            D.alpha(0.55, () => D.rect(0, y - 8, G.CFG.W, 44, '#000'));
            D.text(b.title, G.CFG.W / 2, y, '#e04a3a', { align: 'center', scale: 2 });
            D.text(b.sub, G.CFG.W / 2, y + 20, '#d8c8b0', { align: 'center' });
          }
        });
      }
    },

    _toasts() {
      let y = 150;
      for (const t of this.toasts) {
        D.alpha(Math.min(1, t.t * 2), () => D.text(t.msg, G.CFG.W / 2, y, t.color, { align: 'center' }));
        y += 10;
      }
    },

    _crosshair() {
      const m = G.Input.mouse;
      const x = Math.round(m.x), y = Math.round(m.y);
      D.rect(x - 4, y, 3, 1, '#ffffff'); D.rect(x + 2, y, 3, 1, '#ffffff');
      D.rect(x, y - 4, 1, 3, '#ffffff'); D.rect(x, y + 2, 1, 3, '#ffffff');
      D.rect(x, y, 1, 1, '#ff4040');
    },
  };

  G.HUD = HUD;
})();
