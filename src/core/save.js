// Persistent save (localStorage). Holds meta-progression items and lifetime stats.
(function () {
  'use strict';
  const KEY = 'nine_circles_save_v1';

  const Save = {
    data: null,
    defaults() {
      return {
        version: 1,
        meta: [],            // [{ id, name, obtainedAt }] — meta items are placeholders for now
        stats: { runs: 0, wins: 0, deaths: 0, bestLevel: 0, kills: 0 },
        bossesDefeated: {},  // bossId -> count
        settings: { muted: false },
      };
    },
    load() {
      let d = null;
      try {
        const raw = window.localStorage.getItem(KEY);
        if (raw) d = JSON.parse(raw);
      } catch (e) { d = null; }
      const def = this.defaults();
      if (!d || typeof d !== 'object') d = def;
      // Fill any missing fields from defaults (forward-compatible saves).
      for (const k of Object.keys(def)) if (d[k] === undefined) d[k] = def[k];
      for (const k of Object.keys(def.stats)) if (d.stats[k] === undefined) d.stats[k] = def.stats[k];
      if (!Array.isArray(d.meta)) d.meta = [];
      this.data = d;
      return d;
    },
    save() {
      try { window.localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* storage unavailable */ }
    },
  };

  G.Save = Save;
})();
