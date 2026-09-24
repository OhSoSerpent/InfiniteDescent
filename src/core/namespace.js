// Global namespace + generic registries. Every content file registers itself
// into one of these, so adding a card/relic/enemy/boss/biome is just adding a
// definition object in a new (or existing) file and a <script> tag.
(function () {
  'use strict';

  class Registry {
    constructor(kind) { this.kind = kind; this.map = new Map(); }
    add(def) {
      if (!def || !def.id) throw new Error(`[${this.kind}] definition is missing an id`);
      if (this.map.has(def.id)) throw new Error(`[${this.kind}] duplicate id "${def.id}"`);
      this.map.set(def.id, def);
      return def;
    }
    get(id) {
      const d = this.map.get(id);
      if (!d) throw new Error(`[${this.kind}] unknown id "${id}"`);
      return d;
    }
    has(id) { return this.map.has(id); }
    all() { return Array.from(this.map.values()); }
    ids() { return Array.from(this.map.keys()); }
  }

  window.G = {
    Registry,
    CFG: { W: 480, H: 270, TILE: 16, TITLE: 'NINE CIRCLES', VERSION: '1.0.0' },

    Cards: new Registry('card'),
    Relics: new Registry('relic'),
    Treasures: new Registry('treasure'),
    Meta: new Registry('meta'),
    Enemies: new Registry('enemy'),
    Bosses: new Registry('boss'),
    Attacks: new Registry('attack'),
    Biomes: new Registry('biome'),
    Statuses: new Registry('status'),
    ZoneTypes: new Registry('zone'),
    Hazards: new Registry('hazard'),
    Brains: new Registry('brain'),
    RoomGens: new Registry('roomgen'),
  };
})();
