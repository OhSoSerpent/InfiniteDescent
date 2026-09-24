// Level generator: builds a tree-like graph of rooms on a grid (start, combat rooms,
// one relic room, one boss room, plus biome extras), then fills each room.
(function () {
  'use strict';
  const T = G.T;
  const DIRS = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
  const OPP = { N: 'S', S: 'N', E: 'W', W: 'E' };

  const SIZES = {
    start: () => [22, 14],
    combat: rng => [rng.int(24, 34), rng.int(16, 22)],
    relic: () => [18, 13],
    treasure: () => [20, 14],
    boss: () => [36, 24],
    trophy: () => [28, 18],
  };

  let roomId = 1;

  const LevelGen = {
    generate(index, biome, rng) {
      if (biome.special === 'abyss') return this.abyss(index, biome, rng);
      const nCombat = 5 + Math.floor(index / 2) + rng.int(0, 1);
      const cells = new Map();
      const key = (x, y) => x + ',' + y;
      const neighbors = (x, y) => Object.values(DIRS).filter(([dx, dy]) => cells.has(key(x + dx, y + dy))).length;
      const add = (x, y, type, parent) => {
        const c = { x, y, type, parent, depth: parent ? parent.depth + 1 : 0, links: [] };
        cells.set(key(x, y), c);
        if (parent) { const d = this._dirBetween(parent, c); parent.links.push({ dir: d, to: c }); c.links.push({ dir: OPP[d], to: parent }); }
        return c;
      };
      const start = add(0, 0, 'start', null);
      let guard = 0;
      while (cells.size < nCombat + 1 && guard++ < 2000) {
        const list = Array.from(cells.values());
        const from = rng.pick(list);
        const [dname, [dx, dy]] = rng.pick(Object.entries(DIRS));
        const nx = from.x + dx, ny = from.y + dy;
        if (cells.has(key(nx, ny))) continue;
        if (neighbors(nx, ny) > 1 && rng.chance(0.85)) continue;
        if (from.links.length >= 3) continue;
        add(nx, ny, 'combat', from);
      }
      // Attach dead-end special rooms.
      const attach = (type, candidates) => {
        for (const c of candidates) {
          const dirs = rng.shuffle(Object.entries(DIRS).slice());
          for (const [, [dx, dy]] of dirs) {
            const nx = c.x + dx, ny = c.y + dy;
            if (cells.has(key(nx, ny)) || neighbors(nx, ny) !== 1) continue;
            return add(nx, ny, type, c);
          }
        }
        // Fallback: any free adjacent spot
        for (const c of candidates) for (const [, [dx, dy]] of Object.entries(DIRS)) {
          const nx = c.x + dx, ny = c.y + dy;
          if (!cells.has(key(nx, ny))) return add(nx, ny, type, c);
        }
        return null;
      };
      const combats = Array.from(cells.values()).filter(c => c.type === 'combat');
      const byDepth = combats.slice().sort((a, b) => b.depth - a.depth);
      const boss = attach('boss', byDepth);
      const relic = attach('relic', rng.shuffle(combats.filter(c => c !== boss.parent).concat([start])));
      for (const extra of biome.extraRooms || []) attach(extra, rng.shuffle(combats.slice()));
      // A loop or two between adjacent combat rooms keeps layouts from being pure trees.
      for (const c of combats) {
        if (!rng.chance(0.25)) continue;
        for (const [dname, [dx, dy]] of Object.entries(DIRS)) {
          const o = cells.get(key(c.x + dx, c.y + dy));
          if (!o || o.type !== 'combat' || c.links.some(l => l.to === o)) continue;
          c.links.push({ dir: dname, to: o }); o.links.push({ dir: OPP[dname], to: c });
          break;
        }
      }

      // Build rooms
      const rooms = [];
      const map = new Map();
      for (const c of cells.values()) {
        const [w, h] = SIZES[c.type](rng);
        const room = new G.Room({ id: roomId++, gx: c.x, gy: c.y, w, h, type: c.type, biome, level: index });
        map.set(c, room);
        rooms.push(room);
      }
      for (const c of cells.values()) {
        const room = map.get(c);
        for (const l of c.links) this.addDoor(room, l.dir, map.get(l.to));
        if (biome.fakeDoors && c.type === 'combat') {
          for (const d of Object.keys(DIRS)) {
            if (room.doors.some(x => x.side === d)) continue;
            if (rng.chance(0.4)) this.addDoor(room, d, null, true);
          }
        }
      }
      for (const c of cells.values()) this.fill(map.get(c), rng, index);
      return { index, biome, rooms, start: map.get(start), boss: map.get(boss), relic: map.get(relic) };
    },

    _dirBetween(a, b) {
      if (b.x > a.x) return 'E';
      if (b.x < a.x) return 'W';
      if (b.y > a.y) return 'S';
      return 'N';
    },

    addDoor(room, side, to, fake = false) {
      const cx = Math.floor(room.w / 2), cy = Math.floor(room.h / 2);
      let tiles;
      if (side === 'N') tiles = [[cx - 1, 0], [cx, 0]];
      else if (side === 'S') tiles = [[cx - 1, room.h - 1], [cx, room.h - 1]];
      else if (side === 'W') tiles = [[0, cy - 1], [0, cy]];
      else tiles = [[room.w - 1, cy - 1], [room.w - 1, cy]];
      for (const [x, y] of tiles) room.setTile(x, y, T.DOOR);
      const d = { side, to, fake, tiles };
      room.doors.push(d);
      return d;
    },

    // Fill a room's interior by type.
    fill(room, rng, index) {
      const biome = room.biome;
      G.RG.fillBase(room);
      const gen = G.RoomGens.get(biome.roomGen || 'open');
      switch (room.type) {
        case 'start':
          G.RG.scatter(room, rng, 0.02, null, 2);
          break;
        case 'combat':
          gen.build(room, rng);
          room.waves = this.makeWaves(room, rng, index);
          break;
        case 'relic': {
          const c = room.tileCenter(Math.floor(room.w / 2), Math.floor(room.h / 2));
          // Hard mode: two relics side by side.
          const n = G.Run.hardMult();
          for (let k = 0; k < n; k++) {
            const x = c.x - 8 + (n > 1 ? (k === 0 ? -28 : 28) : 0);
            room.props.push(new G.Props.RelicPedestal({ x, y: c.y, relicId: G.Run.drawRelic() }));
          }
          G.RG.arenaPillars(room, rng, biome.obstacles[0][0]);
          break;
        }
        case 'treasure': {
          const cy = Math.floor(room.h / 2);
          const trapIdx = rng.int(0, 2);
          for (let i = 0; i < 3; i++) {
            const c = room.tileCenter(Math.floor(room.w / 2) - 4 + i * 4, cy);
            room.props.push(new G.Props.Treasure({ x: c.x - 8, y: c.y, trapped: i === trapIdx }));
          }
          G.RG.arenaPillars(room, rng, 'goldstatue');
          break;
        }
        case 'boss':
          if (gen.arena) gen.arena(room, rng);
          break;
      }
      if (room.doors.length) G.RG.ensureConnectivity(room);
      this.placeAmmo(room, rng);
    },

    // 1-2 ammo packs on floor tiles reachable on foot from the room's entrances.
    placeAmmo(room, rng) {
      const T2 = G.T;
      const start = G.RG.doorInner(room, room.doors[0]) || { x: Math.floor(room.w / 2), y: Math.floor(room.h / 2) };
      const reach = G.RG.flood(room, start.x, start.y);
      const spots = [];
      for (const i of reach) {
        const tx = i % room.w, ty = Math.floor(i / room.w);
        const t = room.tileAt(tx, ty);
        if ((t !== T2.FLOOR && t !== T2.ICE) || G.RG.isProtected(room, tx, ty) || !G.RG.interior(room, tx, ty, 2)) continue;
        const c = room.tileCenter(tx, ty);
        if (room.props.some(p => Math.hypot(p.x - c.x, p.y - c.y) < 24)) continue;
        spots.push(c);
      }
      rng.shuffle(spots);
      const n = Math.min(spots.length, rng.int(1, 2));
      for (let i = 0; i < n; i++) room.pickups.push(new G.Pickup('ammo', spots[i].x, spots[i].y, 0, true));
    },

    makeWaves(room, rng, index) {
      const biome = room.biome;
      const area = (room.w - 2) * (room.h - 2);
      let count = Math.round(3 + index * 0.6 + rng.int(0, 2) + area / 300);
      const waves = [];
      const nWaves = count >= 10 ? 3 : count >= 6 ? 2 : 1;
      const eliteChance = index >= 2 ? 0.03 + 0.015 * index : 0;
      for (let w = 0; w < nWaves; w++) {
        const n = Math.round(count / nWaves);
        const list = [];
        for (let i = 0; i < n; i++) list.push({ id: rng.weighted(biome.enemies), elite: rng.chance(eliteChance) });
        waves.push(list);
      }
      return waves;
    },

    // Level 10: the trophy room with a free card and relic, leading to Satan.
    abyss(index, biome, rng) {
      const [tw, th] = SIZES.trophy();
      const trophy = new G.Room({ id: roomId++, gx: 0, gy: 0, w: tw, h: th, type: 'trophy', biome, level: index });
      const [bw, bh] = SIZES.boss();
      const boss = new G.Room({ id: roomId++, gx: 0, gy: -1, w: bw, h: bh, type: 'boss', biome, level: index });
      this.addDoor(trophy, 'N', boss);
      this.addDoor(boss, 'S', trophy);
      G.RG.fillBase(trophy);
      G.RG.fillBase(boss);
      G.RoomGens.get('abyss').arena(boss, rng);
      // Trophies of the bosses defeated this run, arranged along the side walls.
      const defeated = G.Run.defeatedBosses.slice();
      defeated.forEach((id, i) => {
        const def = G.Bosses.get(id);
        const left = i % 2 === 0;
        const row = Math.floor(i / 2);
        const tx = left ? 3 : tw - 4, ty = 3 + row * 3;
        const c = trophy.tileCenter(tx, Math.min(ty, th - 3));
        const tr = def.trophy || { icon: 'skull', color: '#ddd' };
        trophy.props.push(new G.Props.Trophy({ x: c.x, y: c.y, icon: tr.icon, color: tr.color, name: def.short || def.name.split(' ')[0] }));
      });
      const mid = trophy.tileCenter(Math.floor(tw / 2), Math.floor(th / 2) + 2);
      trophy.props.push(new G.Props.CardPedestal({ x: mid.x - 40, y: mid.y }));
      trophy.props.push(new G.Props.RelicPedestal({ x: mid.x + 40, y: mid.y, relicId: G.Run.drawRelic() }));
      trophy.spawn = trophy.tileCenter(Math.floor(tw / 2), th - 3);
      G.RG.ensureConnectivity(trophy);
      G.RG.ensureConnectivity(boss);
      this.placeAmmo(trophy, rng);
      this.placeAmmo(boss, rng);
      return { index, biome, rooms: [trophy, boss], start: trophy, boss, relic: null };
    },
  };

  G.LevelGen = LevelGen;
})();
