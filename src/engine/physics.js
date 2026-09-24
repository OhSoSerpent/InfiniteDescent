// Axis-separated AABB-vs-tile collision with sub-stepping.
(function () {
  'use strict';
  const TS = G.CFG.TILE;
  const EPS = 0.01;

  const Physics = {
    // Moves ent (center x,y; half-size ent.r) by (dx,dy). blocked(tx,ty) decides solidity.
    // Returns { hitX, hitY } flags.
    move(ent, dx, dy, blocked) {
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 4));
      const sx = dx / steps, sy = dy / steps;
      let hitX = false, hitY = false;
      for (let i = 0; i < steps; i++) {
        if (sx !== 0 && this._axis(ent, sx, 0, blocked)) hitX = true;
        if (sy !== 0 && this._axis(ent, 0, sy, blocked)) hitY = true;
      }
      return { hitX, hitY };
    },
    _axis(ent, dx, dy, blocked) {
      const r = ent.r;
      ent.x += dx; ent.y += dy;
      const x0 = Math.floor((ent.x - r) / TS), x1 = Math.floor((ent.x + r - EPS) / TS);
      const y0 = Math.floor((ent.y - r) / TS), y1 = Math.floor((ent.y + r - EPS) / TS);
      let hit = false;
      for (let ty = y0; ty <= y1; ty++) {
        for (let tx = x0; tx <= x1; tx++) {
          if (!blocked(tx, ty)) continue;
          hit = true;
          if (dx > 0) ent.x = Math.min(ent.x, tx * TS - r - EPS);
          else if (dx < 0) ent.x = Math.max(ent.x, (tx + 1) * TS + r + EPS);
          if (dy > 0) ent.y = Math.min(ent.y, ty * TS - r - EPS);
          else if (dy < 0) ent.y = Math.max(ent.y, (ty + 1) * TS + r + EPS);
        }
      }
      return hit;
    },
    // True if the entity's box overlaps any blocked tile.
    overlaps(x, y, r, blocked) {
      const x0 = Math.floor((x - r) / TS), x1 = Math.floor((x + r - EPS) / TS);
      const y0 = Math.floor((y - r) / TS), y1 = Math.floor((y + r - EPS) / TS);
      for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (blocked(tx, ty)) return true;
      return false;
    },
  };

  G.Physics = Physics;
})();
