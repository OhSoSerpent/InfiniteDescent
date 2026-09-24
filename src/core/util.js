// Math, geometry, colour and RNG helpers.
(function () {
  'use strict';
  const TAU = Math.PI * 2;

  const U = {
    TAU,
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    approach(v, target, delta) { return v < target ? Math.min(v + delta, target) : Math.max(v - delta, target); },
    dist: (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay),
    dist2(ax, ay, bx, by) { const dx = bx - ax, dy = by - ay; return dx * dx + dy * dy; },
    angle: (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax),
    wrapAngle(a) {
      a %= TAU;
      if (a > Math.PI) a -= TAU; else if (a < -Math.PI) a += TAU;
      return a;
    },
    angDiff: (a, b) => U.wrapAngle(b - a),
    norm(x, y) { const l = Math.hypot(x, y); return l > 1e-9 ? { x: x / l, y: y / l } : { x: 0, y: 0 }; },
    // Distance from point p to segment a-b.
    pointSegDist(px, py, ax, ay, bx, by) {
      const dx = bx - ax, dy = by - ay;
      const l2 = dx * dx + dy * dy;
      let t = l2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
    },
    // Is point inside a circular sector centred on dir with half-angle halfArc?
    inArc(px, py, cx, cy, r, dir, halfArc, pr = 0) {
      const d = Math.hypot(px - cx, py - cy);
      if (d > r + pr) return false;
      if (d < pr + 2) return true;
      return Math.abs(U.angDiff(dir, Math.atan2(py - cy, px - cx))) <= halfArc;
    },
    rectCircle(rx, ry, rw, rh, cx, cy, cr) {
      const nx = U.clamp(cx, rx, rx + rw), ny = U.clamp(cy, ry, ry + rh);
      return (cx - nx) * (cx - nx) + (cy - ny) * (cy - ny) <= cr * cr;
    },
    // Deterministic hash in [0,1) for tile decoration.
    hash2(x, y, seed = 0) {
      let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
      h = (h ^ (h >>> 13)) * 1274126177 | 0;
      h = h ^ (h >>> 16);
      return (h >>> 0) / 4294967296;
    },
    hexToRgb(hex) {
      const h = hex.replace('#', '');
      const f = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
      const n = parseInt(f, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    },
    rgbToHex(r, g, b) {
      const c = v => U.clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0');
      return '#' + c(r) + c(g) + c(b);
    },
    mix(a, b, t) {
      const A = U.hexToRgb(a), B = U.hexToRgb(b);
      return U.rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
    },
    shade(hex, amt) { return amt >= 0 ? U.mix(hex, '#ffffff', amt) : U.mix(hex, '#000000', -amt); },
    rgba(hex, a) { const c = U.hexToRgb(hex); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; },
    pct(m) { const v = Math.round((m - 1) * 100); return (v >= 0 ? '+' : '') + v + '%'; },
  };

  // Mulberry32 seeded RNG.
  class RNG {
    constructor(seed) { this.seed(seed); }
    seed(s) { this.s = (s >>> 0) || 0x9e3779b9; }
    next() {
      let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    range(a, b) { return a + (b - a) * this.next(); }
    int(a, b) { return a + Math.floor(this.next() * (b - a + 1)); }
    chance(p) { return this.next() < p; }
    pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
    sign() { return this.next() < 0.5 ? -1 : 1; }
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(this.next() * (i + 1));
        const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
      }
      return arr;
    }
    // pairs: [[item, weight], ...]
    weighted(pairs) {
      let total = 0;
      for (const p of pairs) total += p[1];
      let r = this.next() * total;
      for (const p of pairs) { r -= p[1]; if (r < 0) return p[0]; }
      return pairs[pairs.length - 1][0];
    }
  }

  G.U = U;
  G.RNG = RNG;
  G.rng = new RNG(Date.now()); // reseeded on every run start
})();
