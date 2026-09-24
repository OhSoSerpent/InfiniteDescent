// Canvas setup, crisp pixel primitives, bitmap font, and the camera.
(function () {
  'use strict';
  const { W, H } = G.CFG;
  const U = G.U;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  // ---------- 5x7 bitmap font ----------
  const GLYPHS = {
    'A': [14, 17, 17, 31, 17, 17, 17], 'B': [30, 17, 17, 30, 17, 17, 30], 'C': [14, 17, 16, 16, 16, 17, 14],
    'D': [30, 17, 17, 17, 17, 17, 30], 'E': [31, 16, 16, 30, 16, 16, 31], 'F': [31, 16, 16, 30, 16, 16, 16],
    'G': [14, 17, 16, 23, 17, 17, 15], 'H': [17, 17, 17, 31, 17, 17, 17], 'I': [14, 4, 4, 4, 4, 4, 14],
    'J': [7, 2, 2, 2, 2, 18, 12], 'K': [17, 18, 20, 24, 20, 18, 17], 'L': [16, 16, 16, 16, 16, 16, 31],
    'M': [17, 27, 21, 21, 17, 17, 17], 'N': [17, 17, 25, 21, 19, 17, 17], 'O': [14, 17, 17, 17, 17, 17, 14],
    'P': [30, 17, 17, 30, 16, 16, 16], 'Q': [14, 17, 17, 17, 21, 18, 13], 'R': [30, 17, 17, 30, 20, 18, 17],
    'S': [15, 16, 16, 14, 1, 1, 30], 'T': [31, 4, 4, 4, 4, 4, 4], 'U': [17, 17, 17, 17, 17, 17, 14],
    'V': [17, 17, 17, 17, 17, 10, 4], 'W': [17, 17, 17, 21, 21, 21, 10], 'X': [17, 17, 10, 4, 10, 17, 17],
    'Y': [17, 17, 10, 4, 4, 4, 4], 'Z': [31, 1, 2, 4, 8, 16, 31],
    '0': [14, 17, 19, 21, 25, 17, 14], '1': [4, 12, 4, 4, 4, 4, 14], '2': [14, 17, 1, 2, 4, 8, 31],
    '3': [31, 2, 4, 2, 1, 17, 14], '4': [2, 6, 10, 18, 31, 2, 2], '5': [31, 16, 30, 1, 1, 17, 14],
    '6': [6, 8, 16, 30, 17, 17, 14], '7': [31, 1, 2, 4, 8, 8, 8], '8': [14, 17, 17, 14, 17, 17, 14],
    '9': [14, 17, 17, 15, 1, 2, 12],
    ' ': [0, 0, 0, 0, 0, 0, 0], '.': [0, 0, 0, 0, 0, 12, 12], ',': [0, 0, 0, 0, 12, 4, 8],
    '!': [4, 4, 4, 4, 4, 0, 4], '?': [14, 17, 1, 2, 4, 0, 4], ':': [0, 12, 12, 0, 12, 12, 0],
    ';': [0, 12, 12, 0, 12, 4, 8], "'": [4, 4, 8, 0, 0, 0, 0], '"': [10, 10, 0, 0, 0, 0, 0],
    '-': [0, 0, 0, 31, 0, 0, 0], '+': [0, 4, 4, 31, 4, 4, 0], '/': [1, 2, 2, 4, 8, 8, 16],
    '(': [2, 4, 8, 8, 8, 4, 2], ')': [8, 4, 2, 2, 2, 4, 8], '%': [24, 25, 2, 4, 8, 19, 3],
    '*': [0, 21, 14, 31, 14, 21, 0], '#': [10, 10, 31, 10, 31, 10, 10], '<': [2, 4, 8, 16, 8, 4, 2],
    '>': [8, 4, 2, 1, 2, 4, 8], '=': [0, 0, 31, 0, 31, 0, 0], '_': [0, 0, 0, 0, 0, 0, 31],
    '[': [14, 8, 8, 8, 8, 8, 14], ']': [14, 2, 2, 2, 2, 2, 14], '&': [12, 18, 20, 8, 21, 18, 13],
    '@': [0, 10, 31, 31, 14, 4, 0], // heart
    '~': [0, 0, 8, 21, 2, 0, 0],
  };
  const GW = 5, GH = 7, ADV = 6;
  const CHARS = Object.keys(GLYPHS);
  const atlasCache = new Map();
  function atlasFor(color) {
    let a = atlasCache.get(color);
    if (a) return a;
    a = document.createElement('canvas');
    a.width = CHARS.length * GW; a.height = GH;
    const c = a.getContext('2d');
    c.fillStyle = color;
    CHARS.forEach((ch, i) => {
      const rows = GLYPHS[ch];
      for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
        if (rows[y] & (1 << (GW - 1 - x))) c.fillRect(i * GW + x, y, 1, 1);
      }
    });
    atlasCache.set(color, a);
    return a;
  }
  const charIndex = {};
  CHARS.forEach((ch, i) => { charIndex[ch] = i; });

  const Draw = {
    canvas, ctx, scale: 1,

    resize() {
      const s = Math.min(window.innerWidth / W, window.innerHeight / H);
      const scale = s >= 1 ? Math.floor(s) : s;
      this.scale = scale;
      const stage = document.getElementById('stage');
      stage.style.width = W * scale + 'px';
      stage.style.height = H * scale + 'px';
      document.getElementById('ui').style.fontSize = Math.max(8, 4 * scale) + 'px';
      ctx.imageSmoothingEnabled = false;
    },

    rect(x, y, w, h, col) { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); },
    // Crisp filled circle built from horizontal spans.
    circ(x, y, r, col) {
      ctx.fillStyle = col;
      x = Math.round(x); y = Math.round(y);
      if (r <= 1.2) { ctx.fillRect(x - 1, y - 1, 2, 2); return; }
      const ri = Math.round(r);
      for (let dy = -ri; dy <= ri; dy++) {
        const w = Math.floor(Math.sqrt(r * r - dy * dy));
        ctx.fillRect(x - w, y + dy, w * 2 + 1, 1);
      }
    },
    ring(x, y, r, col, thick = 1) {
      if (r <= 0) return;
      ctx.strokeStyle = col; ctx.lineWidth = thick;
      ctx.beginPath(); ctx.arc(x, y, r, 0, U.TAU); ctx.stroke();
    },
    line(x1, y1, x2, y2, col, w = 1) {
      ctx.strokeStyle = col; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    },
    arcFill(x, y, r, a0, a1, col, r0 = 0) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(x, y, r, a0, a1);
      if (r0 > 0) ctx.arc(x, y, r0, a1, a0, true); else ctx.lineTo(x, y);
      ctx.closePath(); ctx.fill();
    },
    ellipse(x, y, rx, ry, col) {
      ctx.fillStyle = col;
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, U.TAU); ctx.fill();
    },
    alpha(a, fn) {
      const prev = ctx.globalAlpha;
      ctx.globalAlpha = prev * a;
      fn();
      ctx.globalAlpha = prev;
    },

    // ---------- text ----------
    textWidth(str, scale = 1) { return String(str).length * ADV * scale - scale; },
    // opts: { align:'left'|'center'|'right', scale, shadow: color|false }
    text(str, x, y, color = '#fff', opts = {}) {
      str = String(str).toUpperCase();
      const scale = opts.scale || 1;
      const w = this.textWidth(str, scale);
      let sx = Math.round(opts.align === 'center' ? x - w / 2 : opts.align === 'right' ? x - w : x);
      const sy = Math.round(y);
      const shadow = opts.shadow === undefined ? '#000' : opts.shadow;
      if (shadow) this._text(str, sx + scale, sy + scale, shadow, scale);
      this._text(str, sx, sy, color, scale);
      return w;
    },
    _text(str, x, y, color, scale) {
      const a = atlasFor(color);
      for (let i = 0; i < str.length; i++) {
        const ci = charIndex[str[i]];
        if (ci !== undefined) ctx.drawImage(a, ci * GW, 0, GW, GH, x + i * ADV * scale, y, GW * scale, GH * scale);
      }
    },
    // Word-wrap into lines of at most maxChars.
    wrap(str, maxChars) {
      const words = String(str).split(/\s+/);
      const lines = [];
      let cur = '';
      for (const w of words) {
        if ((cur + ' ' + w).trim().length > maxChars) { if (cur) lines.push(cur); cur = w; }
        else cur = (cur + ' ' + w).trim();
      }
      if (cur) lines.push(cur);
      return lines;
    },
  };

  // ---------- camera ----------
  const Cam = {
    x: 0, y: 0, shakeT: 0, shakeMag: 0, ox: 0, oy: 0,
    snap(px, py, roomW, roomH) { this.x = this._tx(px, roomW, W); this.y = this._tx(py, roomH, H); },
    _tx(p, size, view) {
      if (size <= view) return (size - view) / 2;
      return U.clamp(p - view / 2, 0, size - view);
    },
    follow(px, py, roomW, roomH, dt) {
      const tx = this._tx(px, roomW, W), ty = this._tx(py, roomH, H);
      const k = Math.min(1, dt * 10);
      this.x += (tx - this.x) * k;
      this.y += (ty - this.y) * k;
      if (this.shakeT > 0) {
        this.shakeT -= dt;
        const m = this.shakeMag * Math.min(1, this.shakeT * 4);
        this.ox = (Math.random() * 2 - 1) * m;
        this.oy = (Math.random() * 2 - 1) * m;
      } else { this.ox = 0; this.oy = 0; }
    },
    shake(mag, dur) {
      if (mag >= this.shakeMag || this.shakeT <= 0) this.shakeMag = mag;
      this.shakeT = Math.max(this.shakeT, dur);
    },
    get left() { return Math.round(this.x + this.ox); },
    get top() { return Math.round(this.y + this.oy); },
    toScreen(x, y) { return { x: x - this.left, y: y - this.top }; },
  };

  G.Draw = Draw;
  G.Cam = Cam;
})();
