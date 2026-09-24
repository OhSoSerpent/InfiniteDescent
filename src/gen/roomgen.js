// Room interior generators. Each biome names a generator for combat rooms and
// (optionally) one for its boss arena. Generators only touch interior tiles;
// door approaches are protected and connectivity is guaranteed afterwards.
(function () {
  'use strict';
  const U = G.U, TS = G.CFG.TILE, T = G.T;

  const RG = {
    // Tiles that must stay open: door approaches and the room's middle.
    isProtected(room, tx, ty) {
      if (room.nearDoor(tx, ty, 2)) return true;
      const cx = Math.floor(room.w / 2), cy = Math.floor(room.h / 2);
      return Math.abs(tx - cx) <= 1 && Math.abs(ty - cy) <= 1;
    },
    interior(room, tx, ty, margin = 1) {
      return tx >= margin && ty >= margin && tx < room.w - margin && ty < room.h - margin;
    },
    base(room) { return room.biome.baseTile !== undefined ? room.biome.baseTile : T.FLOOR; },
    fillBase(room) {
      const b = RG.base(room);
      for (let y = 1; y < room.h - 1; y++) for (let x = 1; x < room.w - 1; x++) room.setTile(x, y, b);
    },
    canPlace(room, tx, ty) {
      if (!RG.interior(room, tx, ty, 2)) return false;
      if (RG.isProtected(room, tx, ty)) return false;
      const t = room.tileAt(tx, ty);
      return t === T.FLOOR || t === T.ICE;
    },
    pickStyle(room, rng, list) {
      return rng.weighted(list || room.biome.obstacles);
    },
    // Scatter clusters of obstacles.
    scatter(room, rng, density = 0.05, list, maxCluster = 4) {
      const area = (room.w - 2) * (room.h - 2);
      const clusters = Math.round(area * density / 2.5);
      for (let c = 0; c < clusters; c++) {
        let tx = rng.int(2, room.w - 3), ty = rng.int(2, room.h - 3);
        const style = RG.pickStyle(room, rng, list);
        const n = rng.int(1, maxCluster);
        for (let i = 0; i < n; i++) {
          if (RG.canPlace(room, tx, ty)) room.setObstacle(tx, ty, style);
          if (rng.chance(0.5)) tx += rng.sign(); else ty += rng.sign();
        }
      }
    },
    blob(room, rng, cx, cy, r, tile, respectProtected = true) {
      for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        if (!RG.interior(room, x, y, 1)) continue;
        if (respectProtected && RG.isProtected(room, x, y)) continue;
        const d = Math.hypot(x - cx, y - cy) + U.hash2(x, y, room.id) * 0.8;
        if (d <= r) room.setTile(x, y, tile);
      }
    },
    rect(room, x0, y0, w, h, tile, respectProtected = true) {
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
        if (!RG.interior(room, x, y, 1)) continue;
        if (respectProtected && RG.isProtected(room, x, y)) continue;
        room.setTile(x, y, tile);
      }
    },
    addFlame(room, tx, ty) {
      room.animDeco = room.animDeco || [];
      room.animDeco.push({ x: (tx + 0.5) * TS, y: ty * TS + 3 });
    },

    // Guarantee every door (and the centre) is reachable on foot, carving if needed.
    ensureConnectivity(room) {
      const start = RG.doorInner(room, room.doors[0]) || { x: Math.floor(room.w / 2), y: Math.floor(room.h / 2) };
      const targets = room.doors.map(d => RG.doorInner(room, d)).filter(Boolean);
      targets.push({ x: Math.floor(room.w / 2), y: Math.floor(room.h / 2) });
      const reach = RG.flood(room, start.x, start.y);
      const ok = targets.every(t => reach.has(t.y * room.w + t.x));
      if (ok) return;
      const cx = Math.floor(room.w / 2), cy = Math.floor(room.h / 2);
      for (const t of targets) RG.carve(room, t.x, t.y, cx, cy);
    },
    doorInner(room, d) {
      if (!d) return null;
      const [a] = d.tiles;
      if (d.side === 'N') return { x: a[0], y: 1 };
      if (d.side === 'S') return { x: a[0], y: room.h - 2 };
      if (d.side === 'W') return { x: 1, y: a[1] };
      return { x: room.w - 2, y: a[1] };
    },
    flood(room, sx, sy) {
      const seen = new Set([sy * room.w + sx]);
      const q = [[sx, sy]];
      while (q.length) {
        const [x, y] = q.pop();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy, i = ny * room.w + nx;
          if (seen.has(i) || !room.inBounds(nx, ny)) continue;
          const t = room.tileAt(nx, ny);
          if (t === T.WALL || t === T.OBST || t === T.DOOR || t === T.PIT || t === T.LIQUID) continue;
          seen.add(i); q.push([nx, ny]);
        }
      }
      return seen;
    },
    // Carve a 2-wide L-shaped corridor.
    carve(room, x0, y0, x1, y1) {
      const b = RG.base(room);
      const open = (x, y) => {
        for (const [ox, oy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
          const tx = x + ox, ty = y + oy;
          if (!RG.interior(room, tx, ty, 1)) continue;
          const t = room.tileAt(tx, ty);
          if (t === T.WALL || t === T.OBST || t === T.PIT || t === T.LIQUID || t === T.FAKEWALL) room.setTile(tx, ty, b);
        }
      };
      let x = x0, y = y0;
      while (x !== x1) { open(x, y); x += Math.sign(x1 - x); }
      while (y !== y1) { open(x, y); y += Math.sign(y1 - y); }
      open(x, y);
    },
    // Four-fold symmetric pillars for arenas.
    arenaPillars(room, rng, style) {
      const cx = room.w / 2, cy = room.h / 2;
      const ox = Math.floor(room.w * 0.28), oy = Math.floor(room.h * 0.28);
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
        const x = Math.floor(cx + sx * ox), y = Math.floor(cy + sy * oy);
        if (RG.canPlace(room, x, y)) room.setObstacle(x, y, style || RG.pickStyle(room, rng));
      }
    },
  };

  const R = G.RoomGens;

  R.add({
    id: 'open',
    build(room, rng) { RG.scatter(room, rng, room.biome.density || 0.06); },
    arena(room, rng) { RG.arenaPillars(room, rng); },
  });

  R.add({
    id: 'storm',
    build(room, rng) { RG.scatter(room, rng, 0.035, null, 2); },
    arena(room, rng) { RG.arenaPillars(room, rng, 'rock'); },
  });

  R.add({
    id: 'treasury',
    build(room, rng) {
      // Rows of columns
      const step = rng.pick([4, 5]);
      for (let y = 3; y < room.h - 3; y += step) for (let x = 3; x < room.w - 3; x += step) {
        if (rng.chance(0.55) && RG.canPlace(room, x, y)) room.setObstacle(x, y, rng.weighted([['column', 3], ['goldstatue', 1], ['goldpile', 2], ['brokencolumn', 1]]));
      }
      // A chasm with a moving platform and maybe a treasure island
      if (rng.chance(0.7)) {
        const vertical = rng.chance(0.5);
        const len = vertical ? room.h - 4 : room.w - 4;
        const pos = vertical ? rng.int(5, room.w - 8) : rng.int(4, room.h - 7);
        const thick = 3;
        for (let i = 2; i < 2 + len; i++) for (let j = 0; j < thick; j++) {
          const x = vertical ? pos + j : i, y = vertical ? i : pos + j;
          if (!RG.isProtected(room, x, y) && RG.interior(room, x, y, 1)) room.setTile(x, y, T.PIT);
        }
        // platform ferrying across the chasm
        const mid = 2 + Math.floor(len / 2) + rng.int(-3, 3);
        if (vertical) {
          room.props.push(new G.Props.Platform({ w: 28, h: 28, ax: (pos - 1) * TS - 6, ay: mid * TS, bx: (pos + thick) * TS - 22, by: mid * TS, speed: 26 }));
        } else {
          room.props.push(new G.Props.Platform({ w: 28, h: 28, ax: mid * TS, ay: (pos - 1) * TS - 6, bx: mid * TS, by: (pos + thick) * TS - 22, speed: 26 }));
        }
        // treasure island in a pit pocket
        if (rng.chance(0.5)) {
          const ix = rng.int(4, room.w - 6), iy = rng.int(4, room.h - 6);
          if (!RG.isProtected(room, ix, iy)) {
            RG.rect(room, ix - 2, iy - 2, 5, 5, T.PIT);
            room.setTile(ix, iy, T.FLOOR);
            room.props.push(new G.Props.Platform({ w: 24, h: 24, ax: (ix - 3) * TS, ay: iy * TS - 4, bx: (ix - 1) * TS, by: iy * TS - 4, speed: 18 }));
            room.props.push(new G.Props.Treasure({ x: (ix + 0.5) * TS, y: (iy + 0.5) * TS, trapped: rng.chance(0.3) }));
          }
        }
      }
      // Spike patches
      for (let i = 0; i < rng.int(1, 3); i++) {
        const x = rng.int(3, room.w - 6), y = rng.int(3, room.h - 5);
        for (let yy = y; yy < y + 2; yy++) for (let xx = x; xx < x + 3; xx++) if (RG.canPlace(room, xx, yy)) room.setTile(xx, yy, T.SPIKE);
      }
      // Dart traps on the side walls
      for (let i = 0; i < rng.int(0, 2); i++) {
        const left = rng.chance(0.5);
        const ty = rng.int(3, room.h - 4);
        if (room.nearDoor(left ? 0 : room.w - 1, ty, 2)) continue;
        room.props.push(new G.Props.DartTrap({ x: left ? TS + 3 : (room.w - 1) * TS - 3, y: (ty + 0.5) * TS, angle: left ? 0 : Math.PI, phase: rng.next() }));
      }
      if (rng.chance(0.35)) {
        const pt = RG.freeSpot(room, rng);
        if (pt) room.props.push(new G.Props.Treasure({ x: pt.x, y: pt.y, trapped: rng.chance(0.35) }));
      }
    },
    arena(room, rng) {
      RG.arenaPillars(room, rng, 'goldstatue');
      for (let i = 0; i < 6; i++) { const pt = RG.freeSpot(room, rng); if (pt) room.setObstacle(Math.floor(pt.x / TS), Math.floor(pt.y / TS), 'goldpile'); }
    },
  });

  R.add({
    id: 'lake',
    build(room, rng) {
      const blobs = rng.int(2, 4);
      for (let i = 0; i < blobs; i++) RG.blob(room, rng, rng.range(4, room.w - 5), rng.range(4, room.h - 5), rng.range(2, 4.5), T.LIQUID);
      RG.scatter(room, rng, 0.03, [['ruin', 3], ['brokencolumn', 1]], 3);
      for (let i = 0; i < 3; i++) { const pt = RG.freeSpot(room, rng); if (pt) RG.addFlame(room, Math.floor(pt.x / TS), Math.floor(pt.y / TS)); }
    },
    arena(room, rng) {
      // Boiling blood ring around the arena edges
      for (let y = 1; y < room.h - 1; y++) for (let x = 1; x < room.w - 1; x++) {
        const edge = Math.min(x - 1, y - 1, room.w - 2 - x, room.h - 2 - y);
        if (edge < 2 && !room.nearDoor(x, y, 2)) room.setTile(x, y, T.LIQUID);
      }
      RG.arenaPillars(room, rng, 'ruin');
    },
  });

  R.add({
    id: 'cemetery',
    build(room, rng) {
      const vertical = rng.chance(0.5);
      const gap = rng.pick([3, 4]);
      if (vertical) {
        for (let x = 3; x < room.w - 3; x += gap) for (let y = 3; y < room.h - 3; y++) if (rng.chance(0.55) && RG.canPlace(room, x, y)) room.setObstacle(x, y, 'tomb');
      } else {
        for (let y = 3; y < room.h - 3; y += gap) for (let x = 3; x < room.w - 3; x++) if (rng.chance(0.5) && RG.canPlace(room, x, y)) room.setObstacle(x, y, 'tomb');
      }
      // Flaming graves (burning tombs)
      for (const [i, style] of room.obstStyle) if (style === 'tomb' && rng.chance(0.3)) RG.addFlame(room, i % room.w, Math.floor(i / room.w));
      RG.scatter(room, rng, 0.015, [['deadtree', 2], ['bones', 1]], 1);
    },
    arena(room, rng) {
      RG.arenaPillars(room, rng, 'tomb');
      for (const [i] of room.obstStyle) RG.addFlame(room, i % room.w, Math.floor(i / room.w));
    },
  });

  R.add({
    id: 'battlefield',
    build(room, rng) {
      // A meandering river of blood with bridges
      const vertical = rng.chance(0.5);
      let pos = vertical ? rng.int(6, room.w - 8) : rng.int(5, room.h - 7);
      const len = vertical ? room.h : room.w;
      for (let i = 1; i < len - 1; i++) {
        if (rng.chance(0.3)) pos += rng.sign();
        pos = U.clamp(pos, 4, (vertical ? room.w : room.h) - 6);
        for (let j = 0; j < 3; j++) {
          const x = vertical ? pos + j : i, y = vertical ? i : pos + j;
          if (!RG.isProtected(room, x, y) && RG.interior(room, x, y, 1)) room.setTile(x, y, T.LIQUID);
        }
      }
      RG.scatter(room, rng, 0.03, [['ruin', 3], ['rock', 1], ['bones', 1]], 3);
      // Burning forest along the edges
      for (let i = 0; i < rng.int(4, 8); i++) {
        const side = rng.int(0, 3);
        const x = side === 0 ? 2 : side === 1 ? room.w - 3 : rng.int(2, room.w - 3);
        const y = side === 2 ? 2 : side === 3 ? room.h - 3 : rng.int(2, room.h - 3);
        if (RG.canPlace(room, x, y)) { room.setObstacle(x, y, 'burningtree'); RG.addFlame(room, x, y); }
      }
    },
    arena(room, rng) {
      RG.arenaPillars(room, rng, 'ruin');
      for (let i = 0; i < 6; i++) {
        const x = rng.chance(0.5) ? 2 : room.w - 3, y = rng.int(3, room.h - 4);
        if (RG.canPlace(room, x, y)) { room.setObstacle(x, y, 'burningtree'); RG.addFlame(room, x, y); }
      }
    },
  });

  R.add({
    id: 'labyrinth',
    build(room, rng) {
      // Recursive-backtracker maze on a coarse grid; cells are 3x3 tiles with 1-tile walls.
      const cw = Math.floor((room.w - 2) / 4), ch = Math.floor((room.h - 2) / 4);
      const ox = Math.floor((room.w - 2 - cw * 4) / 2) + 1, oy = Math.floor((room.h - 2 - ch * 4) / 2) + 1;
      // Start with walls on a grid
      for (let cy = 0; cy <= ch; cy++) for (let x = ox; x <= ox + cw * 4; x++) { const y = oy + cy * 4 - 1; if (RG.interior(room, x, y, 1) && !RG.isProtected(room, x, y)) room.setTile(x, y, T.WALL); }
      for (let cx = 0; cx <= cw; cx++) for (let y = oy; y <= oy + ch * 4; y++) { const x = ox + cx * 4 - 1; if (RG.interior(room, x, y, 1) && !RG.isProtected(room, x, y)) room.setTile(x, y, T.WALL); }
      const seen = new Set();
      const stack = [[rng.int(0, cw - 1), rng.int(0, ch - 1)]];
      seen.add(stack[0].join());
      const openWall = (ax, ay, bx, by) => {
        // Open the wall segment between two cells (3 tiles wide)
        if (ax !== bx) {
          const x = ox + Math.max(ax, bx) * 4 - 1;
          for (let k = 0; k < 3; k++) room.setTile(x, oy + ay * 4 + k, RG.base(room));
        } else {
          const y = oy + Math.max(ay, by) * 4 - 1;
          for (let k = 0; k < 3; k++) room.setTile(ox + ax * 4 + k, y, RG.base(room));
        }
      };
      while (stack.length) {
        const [x, y] = stack[stack.length - 1];
        const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx, y + dy]).filter(([nx, ny]) => nx >= 0 && ny >= 0 && nx < cw && ny < ch && !seen.has(nx + ',' + ny));
        if (!nb.length) { stack.pop(); continue; }
        const [nx, ny] = rng.pick(nb);
        openWall(x, y, nx, ny);
        seen.add(nx + ',' + ny);
        stack.push([nx, ny]);
      }
      // Extra openings so it's not a pure maze (fights need room), and some illusory walls
      for (let y = 2; y < room.h - 2; y++) for (let x = 2; x < room.w - 2; x++) {
        if (room.tileAt(x, y) !== T.WALL) continue;
        if (rng.chance(0.18)) room.setTile(x, y, RG.base(room));
        else if (rng.chance(0.08)) room.setTile(x, y, T.FAKEWALL);
      }
      // Crumbling floor and spike traps
      for (let i = 0; i < rng.int(2, 4); i++) {
        const x = rng.int(2, room.w - 4), y = rng.int(2, room.h - 4);
        for (let yy = y; yy < y + 2; yy++) for (let xx = x; xx < x + 2; xx++) if (RG.canPlace(room, xx, yy)) { room.setTile(xx, yy, T.CRUMBLE); room.crumbles.push(room.idx(xx, yy)); }
      }
      for (let i = 0; i < rng.int(1, 2); i++) {
        const x = rng.int(2, room.w - 4), y = rng.int(2, room.h - 3);
        for (let xx = x; xx < x + 2; xx++) if (RG.canPlace(room, xx, y)) room.setTile(xx, y, T.SPIKE);
      }
      RG.scatter(room, rng, 0.015, [['facade', 2], ['crate', 2]], 1);
      for (let i = 0; i < rng.int(1, 3); i++) { const pt = RG.freeSpot(room, rng); if (pt) room.props.push(new G.Props.PressurePlate({ x: pt.x, y: pt.y, kind: rng.pick(['arrows', 'blast']) })); }
    },
    arena(room, rng) {
      RG.arenaPillars(room, rng, 'facade');
    },
  });

  R.add({
    id: 'ice',
    build(room, rng) {
      // Patches of snow give traction on otherwise slippery ice.
      for (let i = 0; i < rng.int(2, 4); i++) RG.blob(room, rng, rng.range(3, room.w - 4), rng.range(3, room.h - 4), rng.range(1.5, 3), T.FLOOR, false);
      RG.scatter(room, rng, 0.04, [['iceblock', 3], ['frozen', 2]], 3);
      if (rng.chance(0.4)) RG.blob(room, rng, rng.range(5, room.w - 6), rng.range(5, room.h - 6), rng.range(1, 2), T.PIT);
    },
    arena(room, rng) { RG.arenaPillars(room, rng, 'frozen'); },
  });

  R.add({
    id: 'abyss',
    build(room, rng) { RG.scatter(room, rng, 0.02, [['spire', 1]], 1); },
    arena(room, rng) { RG.arenaPillars(room, rng, 'spire'); },
  });

  RG.freeSpot = function (room, rng) {
    for (let i = 0; i < 100; i++) {
      const x = rng.int(2, room.w - 3), y = rng.int(2, room.h - 3);
      if (RG.canPlace(room, x, y)) return room.tileCenter(x, y);
    }
    return null;
  };

  G.RG = RG;
})();
