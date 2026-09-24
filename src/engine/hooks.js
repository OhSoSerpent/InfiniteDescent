// Hook dispatch for relics (global) and cards (per weapon).
//
// Relic hooks (all optional; each receives (ctx, state, instance)):
//   stats(s)            static player stats: s.speedMult, s.maxHpMult, s.dashCharges, s.dashCdMult,
//                       s.dashDistMult, s.takenMult, s.dealtMult, s.healMult, s.hazardMult
//   damageMult(ctx)     dynamic outgoing multiplier at hit time -> number
//   takenMult(ctx)      dynamic incoming multiplier -> number
//   onKill(ctx) onHit(ctx) onPlayerHit(ctx) onTrigger(ctx) onRoomEnter(ctx) onLevelStart(ctx)
//   onDash(ctx) update(ctx) onLethal(ctx) -> true if it prevented death, onGold(ctx), onTreasure(ctx)
//
// Card hooks (per weapon; each receives (ctx, state, instance)):
//   stats(stats, flags) onTrigger(ctx) modifyBullet(bullet, ctx) hitMult(ctx) -> number
//   onHit(ctx) onKill(ctx) update(ctx) onPlayerHit(ctx) onDash(ctx) intervalMult(ctx) -> number
(function () {
  'use strict';

  const Hooks = {
    relics() { return (G.Run && G.Run.relics) || []; },
    hasRelic(id) { return this.relics().some(r => r.def.id === id); },
    relicInst(id) { return this.relics().find(r => r.def.id === id) || null; },

    relic(name, ctx) {
      let result = false;
      for (const r of this.relics()) {
        const fn = r.def[name];
        if (fn && fn(ctx, r.state, r) === true) result = true;
      }
      return result;
    },
    relicMult(name, ctx) {
      let m = 1;
      for (const r of this.relics()) {
        const fn = r.def[name];
        if (fn) { const v = fn(ctx, r.state, r); if (typeof v === 'number') m *= v; }
      }
      return m;
    },
    weapon(weapon, name, ctx) {
      if (!weapon) return;
      for (const c of weapon.cards) {
        const fn = c.def[name];
        if (fn) fn(ctx, c.state, c);
      }
    },
    weaponMult(weapon, name, ctx) {
      let m = 1;
      if (!weapon) return m;
      for (const c of weapon.cards) {
        const fn = c.def[name];
        if (fn) { const v = fn(ctx, c.state, c); if (typeof v === 'number') m *= v; }
      }
      return m;
    },
    allWeapons(name, ctx) {
      const p = G.World.player;
      if (!p) return;
      for (const w of p.weapons) this.weapon(w, name, Object.assign({}, ctx, { weapon: w }));
    },
  };

  G.Hooks = Hooks;
})();
