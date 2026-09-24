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
    // Moves along one axis and resolves only against the leading edge (the column/row the box
    // is moving into). Tiles overlapped on the other axis are ignored, so a pre-existing
    // overlap can never drag an entity sideways into (or through) a wall.
    _axis(ent, dx, dy, blocked) {
      const r = ent.r;
      ent.x += dx; ent.y += dy;
      if (dx !== 0) {
        const tx = dx > 0 ? Math.floor((ent.x + r - EPS) / TS) : Math.floor((ent.x - r) / TS);
        const y0 = Math.floor((ent.y - r) / TS), y1 = Math.floor((ent.y + r - EPS) / TS);
        for (let ty = y0; ty <= y1; ty++) {
          if (!blocked(tx, ty)) continue;
          ent.x = dx > 0 ? tx * TS - r - EPS : (tx + 1) * TS + r + EPS;
          return true;
        }
      } else if (dy !== 0) {
        const ty = dy > 0 ? Math.floor((ent.y + r - EPS) / TS) : Math.floor((ent.y - r) / TS);
        const x0 = Math.floor((ent.x - r) / TS), x1 = Math.floor((ent.x + r - EPS) / TS);
        for (let tx = x0; tx <= x1; tx++) {
          if (!blocked(tx, ty)) continue;
          ent.y = dy > 0 ? ty * TS - r - EPS : (ty + 1) * TS + r + EPS;
          return true;
        }
      }
      return false;
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
