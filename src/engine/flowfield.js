// Breadth-first flow fields toward the player, shared by all enemies in a room.
(function () {
  'use strict';
  const TS = G.CFG.TILE;
  const INF = 0x3fffffff;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

  class FlowField {
    constructor(room, flying) {
      this.room = room;
      this.flying = flying;
      this.dist = new Int32Array(room.w * room.h);
      this.tx = -1; this.ty = -1; this.version = -1;
      this.queue = new Int32Array(room.w * room.h);
    }
    passable(tx, ty) { return this.room.walkable(tx, ty, this.flying); }
    update(x, y) {
      const tx = Math.floor(x / TS), ty = Math.floor(y / TS);
      if (tx === this.tx && ty === this.ty && this.version === this.room.version) return;
      this.tx = tx; this.ty = ty; this.version = this.room.version;
      const { w, h } = this.room;
      const dist = this.dist;
      dist.fill(INF);
      if (tx < 0 || ty < 0 || tx >= w || ty >= h) return;
      let head = 0, tail = 0;
      dist[ty * w + tx] = 0;
      this.queue[tail++] = ty * w + tx;
      while (head < tail) {
        const idx = this.queue[head++];
        const cx = idx % w, cy = (idx - cx) / w;
        const nd = dist[idx] + 1;
        for (let i = 0; i < 8; i++) {
          const nx = cx + DIRS[i][0], ny = cy + DIRS[i][1];
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const ni = ny * w + nx;
          if (dist[ni] <= nd) continue;
          if (!this.passable(nx, ny)) continue;
          if (i >= 4 && (!this.passable(cx + DIRS[i][0], cy) || !this.passable(cx, cy + DIRS[i][1]))) continue;
          dist[ni] = nd;
          this.queue[tail++] = ni;
        }
      }
    }
    // Unit vector to steer along from world position (x,y), or null if unreachable.
    dir(x, y) {
      const { w, h } = this.room;
      const cx = Math.floor(x / TS), cy = Math.floor(y / TS);
      if (cx < 0 || cy < 0 || cx >= w || cy >= h) return null;
      const here = this.dist[cy * w + cx];
      let best = here, bx = 0, by = 0;
      for (let i = 0; i < 8; i++) {
        const nx = cx + DIRS[i][0], ny = cy + DIRS[i][1];
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        if (i >= 4 && (!this.passable(cx + DIRS[i][0], cy) || !this.passable(cx, cy + DIRS[i][1]))) continue;
        const d = this.dist[ny * w + nx];
        if (d < best) { best = d; bx = nx; by = ny; }
      }
      if (best === here) return here === 0 ? { x: 0, y: 0 } : null;
      const tx = (bx + 0.5) * TS - x, ty = (by + 0.5) * TS - y;
      const l = Math.hypot(tx, ty) || 1;
      return { x: tx / l, y: ty / l };
    }
    distAt(x, y) {
      const cx = Math.floor(x / TS), cy = Math.floor(y / TS);
      if (cx < 0 || cy < 0 || cx >= this.room.w || cy >= this.room.h) return INF;
      return this.dist[cy * this.room.w + cx];
    }
  }
  FlowField.INF = INF;

  G.FlowField = FlowField;
})();
