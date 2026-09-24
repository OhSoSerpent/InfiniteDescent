// A single room: tile grid, doors, props, pickups, hazards and its render cache.
(function () {
  'use strict';
  const U = G.U, D = G.Draw, TS = G.CFG.TILE, T = G.T, INFO = G.TileInfo;

  const SPIKE_PERIOD = 2.6, SPIKE_ON = 0.9, SPIKE_WARN = 0.45;

  class Room {
    // o: { id, gx, gy, w, h, type, biome, level }
    constructor(o) {
      Object.assign(this, o);
      const n = this.w * this.h;
      this.tiles = new Uint8Array(n);
      this.tstate = new Float32Array(n);
      this.obstStyle = new Map();
      this.reserved = new Set();
      this.doors = [];
      this.locked = false;
      this.visited = false;
      this.cleared = false;
      this.props = [];
      this.pickups = [];
      this.waves = [];
      this.version = 0;
      this.cache = null;
      this.cacheDirty = true;
      this.crumbles = [];
      this.hazardLevel = 1;
      this.windChaos = false;
      this.bossFight = false;
      this.hazards = (this.biome.hazards || []).map(([id, params]) => {
        const def = G.Hazards.get(id);
        return { def, params: params || {}, state: null };
      });
      // Outer walls
      for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
        if (x === 0 || y === 0 || x === this.w - 1 || y === this.h - 1) this.tiles[y * this.w + x] = T.WALL;
      }
    }

    get pxW() { return this.w * TS; }
    get pxH() { return this.h * TS; }
    idx(tx, ty) { return ty * this.w + tx; }
    inBounds(tx, ty) { return tx >= 0 && ty >= 0 && tx < this.w && ty < this.h; }
    tileAt(tx, ty) { return this.inBounds(tx, ty) ? this.tiles[ty * this.w + tx] : T.WALL; }
    setTile(tx, ty, t) {
      if (!this.inBounds(tx, ty)) return;
      const i = ty * this.w + tx;
      if (this.tiles[i] === t) return;
      this.tiles[i] = t;
      this.tstate[i] = 0;
      if (t !== T.OBST) this.obstStyle.delete(i);
      this.version++;
      this.cacheDirty = true;
    }
    setObstacle(tx, ty, style) {
      this.setTile(tx, ty, T.OBST);
      this.obstStyle.set(this.idx(tx, ty), style);
      this.cacheDirty = true;
    }
    tileCenter(tx, ty) { return { x: (tx + 0.5) * TS, y: (ty + 0.5) * TS }; }

    // ---- queries
    solidAt(tx, ty, forEnemy) {
      const t = this.tileAt(tx, ty);
      if (t === T.WALL || t === T.OBST) return true;
      if (t === T.DOOR) return forEnemy || this.locked;
      return false;
    }
    blocksShot(tx, ty) {
      const t = this.tileAt(tx, ty);
      return t === T.WALL || t === T.OBST || t === T.DOOR;
    }
    isPitTile(tx, ty) {
      const t = this.tileAt(tx, ty);
      return t === T.PIT || (t === T.CRUMBLE && this.tstate[ty * this.w + tx] < 0);
    }
    walkable(tx, ty, flying) {
      if (this.solidAt(tx, ty, true)) return false;
      if (flying) return true;
      return !this.isPitTile(tx, ty) && this.tileAt(tx, ty) !== T.LIQUID;
    }
    isStandable(tx, ty) {
      const t = this.tileAt(tx, ty);
      return INFO[t].ground && t !== T.SPIKE && t !== T.CRUMBLE && t !== T.DOOR && !this.solidAt(tx, ty, true);
    }
    spikeActive(tx, ty) {
      const ph = ((G.World.time + U.hash2(tx, ty, 3) * 0.3 + (tx + ty) * 0.15) % SPIKE_PERIOD);
      return ph < SPIKE_ON;
    }
    spikeWarn(tx, ty) {
      const ph = ((G.World.time + U.hash2(tx, ty, 3) * 0.3 + (tx + ty) * 0.15) % SPIKE_PERIOD);
      return ph > SPIKE_PERIOD - SPIKE_WARN;
    }
    stepCrumble(tx, ty) {
      const i = ty * this.w + tx;
      if (this.tstate[i] === 0) this.tstate[i] = 0.5;
    }
    hazardsLive() { return this.locked || this.bossFight; }
    nearDoor(tx, ty, d) {
      for (const dr of this.doors) for (const [x, y] of dr.tiles) if (Math.abs(x - tx) <= d && Math.abs(y - ty) <= d) return true;
      return false;
    }
    occupiedByBoss(tx, ty) {
      for (const e of G.World.enemies) {
        if (e.dead || !e.isBoss && !e.isClone) continue;
        if (Math.abs(e.x - (tx + 0.5) * TS) < e.r + TS && Math.abs(e.y - (ty + 0.5) * TS) < e.r + TS) return true;
      }
      return false;
    }
    reserveTile(tx, ty) { this.reserved.add(this.idx(tx, ty)); }
    releaseTile(tx, ty) { this.reserved.delete(this.idx(tx, ty)); }
    isReserved(tx, ty) { return this.reserved.has(this.idx(tx, ty)); }

    // Line of sight (sampled). ground: pits/liquid also block (for walking directly).
    los(x1, y1, x2, y2, ground = false) {
      const d = Math.hypot(x2 - x1, y2 - y1);
      const n = Math.ceil(d / 4);
      for (let i = 1; i < n; i++) {
        const x = x1 + (x2 - x1) * i / n, y = y1 + (y2 - y1) * i / n;
        const tx = Math.floor(x / TS), ty = Math.floor(y / TS);
        if (this.blocksShot(tx, ty)) return false;
        if (ground && (this.isPitTile(tx, ty) || this.tileAt(tx, ty) === T.LIQUID)) return false;
      }
      return true;
    }

    nearestGround(x, y) {
      const cx = Math.floor(x / TS), cy = Math.floor(y / TS);
      if (this.isStandable(cx, cy)) return { x: U.clamp(x, cx * TS + 5, (cx + 1) * TS - 5), y: U.clamp(y, cy * TS + 5, (cy + 1) * TS - 5) };
      for (let r = 1; r < Math.max(this.w, this.h); r++) {
        let best = null, bd = Infinity;
        for (let ty = cy - r; ty <= cy + r; ty++) for (let tx = cx - r; tx <= cx + r; tx++) {
          if (Math.max(Math.abs(tx - cx), Math.abs(ty - cy)) !== r) continue;
          if (!this.isStandable(tx, ty)) continue;
          const c = this.tileCenter(tx, ty);
          const d = U.dist2(c.x, c.y, x, y);
          if (d < bd) { bd = d; best = c; }
        }
        if (best) return best;
      }
      return { x: this.pxW / 2, y: this.pxH / 2 };
    }

    // Nearest tile centre where a box of half-size r fits without touching a blocked tile.
    nearestFree(x, y, r, blocked) {
      const cx = Math.floor(x / TS), cy = Math.floor(y / TS);
      const fits = (tx, ty) => {
        if (!this.isStandable(tx, ty)) return null;
        const c = this.tileCenter(tx, ty);
        return G.Physics.overlaps(c.x, c.y, r, blocked) ? null : c;
      };
      if (!G.Physics.overlaps(x, y, r, blocked) && this.isStandable(cx, cy)) return { x, y };
      for (let rad = 0; rad < Math.max(this.w, this.h); rad++) {
        let best = null, bd = Infinity;
        for (let ty = cy - rad; ty <= cy + rad; ty++) for (let tx = cx - rad; tx <= cx + rad; tx++) {
          if (Math.max(Math.abs(tx - cx), Math.abs(ty - cy)) !== rad) continue;
          const c = fits(tx, ty);
          if (!c) continue;
          const d = U.dist2(c.x, c.y, x, y);
          if (d < bd) { bd = d; best = c; }
        }
        if (best) return best;
      }
      return this.nearestGround(x, y);
    }

    destroyObstacle(tx, ty) {
      if (this.tileAt(tx, ty) !== T.OBST) return;
      this.setTile(tx, ty, T.FLOOR);
      const c = this.tileCenter(tx, ty);
      G.FX.burst(c.x, c.y, 14, this.biome.palette.rock || '#7a7670', 60, 0.5, 2);
      G.Audio.play('explode');
    }

    // ---- per-frame
    updateTiles(dt) {
      for (const i of this.crumbles) {
        const s = this.tstate[i];
        if (s > 0) {
          this.tstate[i] = s - dt;
          if (this.tstate[i] <= 0) { this.tstate[i] = -3.5; this.version++; G.FX.burst((i % this.w + 0.5) * TS, (Math.floor(i / this.w) + 0.5) * TS, 6, '#6a5a70', 30, 0.4); }
        } else if (s < 0) {
          this.tstate[i] = s + dt;
          if (this.tstate[i] >= 0) { this.tstate[i] = 0; this.version++; }
        }
      }
    }
    updateHazards(dt) {
      for (const h of this.hazards) {
        if (!h.state) h.state = h.def.init(this, h.params);
        h.def.update(this, h.state, dt, h.params);
      }
    }

    // ---- rendering
    buildCache() {
      if (!this.cache) {
        this.cache = document.createElement('canvas');
        this.cache.width = this.pxW; this.cache.height = this.pxH;
      }
      const ctx = this.cache.getContext('2d');
      const pal = this.biome.palette;
      const wallLike = t => t === T.WALL || t === T.FAKEWALL;
      ctx.fillStyle = pal.pit || '#000';
      ctx.fillRect(0, 0, this.pxW, this.pxH);
      for (let ty = 0; ty < this.h; ty++) for (let tx = 0; tx < this.w; tx++) {
        const t = this.tiles[ty * this.w + tx];
        const x = tx * TS, y = ty * TS, h = U.hash2(tx, ty, this.id);
        switch (t) {
          case T.WALL: case T.FAKEWALL:
            G.Art.wallTile(ctx, x, y, pal, h, !wallLike(this.tileAt(tx, ty + 1)) && ty < this.h - 1);
            break;
          case T.PIT:
            G.Art.pitTile(ctx, x, y, pal, this.tileAt(tx, ty - 1) !== T.PIT);
            break;
          case T.LIQUID:
            G.Art.liquidTile(ctx, x, y, pal, h);
            break;
          case T.ICE:
            G.Art.iceTile(ctx, x, y, pal, h);
            if (pal.frozenBodies && h > 0.93) { ctx.fillStyle = 'rgba(40,40,80,0.35)'; ctx.fillRect(x + 4, y + 3, 3, 3); ctx.fillRect(x + 3, y + 6, 5, 6); ctx.fillRect(x + 8, y + 7, 4, 1); }
            break;
          case T.OBST: {
            const under = pal.obstacleFloor === 'ice' ? G.Art.iceTile : G.Art.floorTile;
            under(ctx, x, y, pal, h);
            const style = this.obstStyle.get(ty * this.w + tx) || 'rock';
            (G.Art.obstacles[style] || G.Art.obstacles.rock)(ctx, x, y, pal, h);
            break;
          }
          case T.DOOR:
            G.Art.floorTile(ctx, x, y, pal, h);
            break;
          default:
            G.Art.floorTile(ctx, x, y, pal, h);
            if (t === T.CRUMBLE) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x + 3, y + 5, 5, 1); ctx.fillRect(x + 7, y + 6, 1, 4); ctx.fillRect(x + 8, y + 9, 5, 1); ctx.fillRect(x + 11, y + 3, 1, 3); }
            if (t === T.SPIKE) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) ctx.fillRect(x + 3 + i * 4, y + 3 + j * 4, 2, 2); }
        }
      }
      this.cacheDirty = false;
    }

    draw(ctx) {
      if (this.cacheDirty || !this.cache) this.buildCache();
      const cam = G.Cam;
      const vx = cam.left, vy = cam.top;
      ctx.drawImage(this.cache, 0, 0);
      const pal = this.biome.palette;
      const time = G.World.time;
      const tx0 = Math.max(0, Math.floor(vx / TS)), ty0 = Math.max(0, Math.floor(vy / TS));
      const tx1 = Math.min(this.w - 1, Math.floor((vx + G.CFG.W) / TS)), ty1 = Math.min(this.h - 1, Math.floor((vy + G.CFG.H) / TS));
      for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
        const i = ty * this.w + tx, t = this.tiles[i];
        const x = tx * TS, y = ty * TS;
        if (t === T.LIQUID) {
          const ph = (time * 1.5 + U.hash2(tx, ty, 9) * 6) % 3;
          if (ph < 1) { ctx.fillStyle = pal.liquidHi || U.shade(pal.liquid || '#8a1010', 0.3); ctx.fillRect(x + 3 + ph * 6, y + 5 + ((tx * 7 + ty) % 6), 3, 1); }
          if (pal.boiling && Math.random() < 0.003) G.FX.particle(x + Math.random() * TS, y + Math.random() * TS, 0, -12, 0.5, pal.liquidHi || '#ff4020');
        } else if (t === T.SPIKE) {
          if (this.spikeActive(tx, ty)) {
            ctx.fillStyle = '#d0d0d8';
            for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) { ctx.fillRect(x + 3 + a * 4, y + 1 + b * 4, 2, 3); ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 3 + a * 4, y + 1 + b * 4, 1, 1); ctx.fillStyle = '#d0d0d8'; }
          } else if (this.spikeWarn(tx, ty)) {
            ctx.fillStyle = '#909098';
            for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) ctx.fillRect(x + 3 + a * 4, y + 3 + b * 4, 2, 1);
          }
        } else if (t === T.CRUMBLE) {
          const s = this.tstate[i];
          if (s < 0) G.Art.pitTile(ctx, x, y, pal, !this.isPitTile(tx, ty - 1));
          else if (s > 0) { const j = Math.round(Math.sin(time * 60) * 1); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(x + j, y, TS, TS); }
        } else if (t === T.DOOR) {
          this._drawDoorTile(ctx, tx, ty, x, y);
        }
      }
      for (const a of this.animDeco || []) {
        if (Math.random() < 0.3) G.FX.particle(a.x + (Math.random() - 0.5) * 6, a.y, (Math.random() - 0.5) * 6, -20 - Math.random() * 10, 0.5, Math.random() < 0.5 ? '#ffb030' : '#ff5010');
      }
    }
    _drawDoorTile(ctx, tx, ty, x, y) {
      const pal = this.biome.palette;
      const vertical = tx === 0 || tx === this.w - 1;
      ctx.fillStyle = '#0a070c';
      ctx.fillRect(x, y, TS, TS);
      ctx.fillStyle = U.shade(pal.wall, 0.25);
      if (vertical) { ctx.fillRect(x, y, TS, 1); ctx.fillRect(x, y + TS - 1, TS, 1); }
      else { ctx.fillRect(x, y, 1, TS); ctx.fillRect(x + TS - 1, y, 1, TS); }
      if (this.locked) {
        ctx.fillStyle = '#8a2a2a';
        if (vertical) for (let i = 2; i < TS; i += 4) ctx.fillRect(x, y + i, TS, 2);
        else for (let i = 2; i < TS; i += 4) ctx.fillRect(x + i, y, 2, TS);
      }
    }
  }

  G.Room = Room;
})();
