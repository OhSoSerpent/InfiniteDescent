// Greed treasures: temporary benefits, some of them trapped.
// def: { id, name, trap:bool, dur (s, 0 for instant), apply(player, dur, prop) }
(function () {
  'use strict';
  const T = G.Treasures;

  T.add({ id: 'gilded_might', name: 'GILDED MIGHT', dur: 12, apply(p, dur) { p.addBuff('tr_might', dur, { kind: 'dmg', mult: 1.5, label: 'MIGHT', color: '#ffd040' }); } });
  T.add({ id: 'quicksilver', name: 'QUICKSILVER', dur: 12, apply(p, dur) { p.addBuff('tr_quick', dur, { kind: 'speed', mult: 1.3, label: 'QUICK', color: '#c0e0ff' }); } });
  T.add({ id: 'hair_trigger', name: 'HAIR TRIGGER', dur: 12, apply(p, dur) { p.addBuff('tr_trigger', dur, { kind: 'interval', mult: 0.7, label: 'TRIGGER', color: '#ffb040' }); } });
  T.add({ id: 'endless_hoard', name: 'ENDLESS HOARD', dur: 8, apply(p, dur) { p.addBuff('infammo', dur, { kind: 'flag', label: 'ENDLESS', color: '#60e0ff' }); } });
  T.add({ id: 'golden_ward', name: 'GOLDEN WARD', dur: 20, apply(p, dur) { p.addBuff('ward', dur, { kind: 'flag', label: 'WARD', color: '#f0e090' }); } });
  T.add({ id: 'nectar', name: 'AMBROSIA', dur: 0, apply() { G.Combat.heal(25); } });

  T.add({
    id: 'cursed_gold', name: 'CURSED GOLD!', trap: true, dur: 0,
    apply(p, dur, prop) { G.BossKit.bomb(prop.x, prop.y, 30, 0.8, 18, { source: 'hazard', fx: '#ffd040' }); },
  });
  T.add({
    id: 'greedy_ghosts', name: 'GREEDY GHOSTS!', trap: true, dur: 0,
    apply(p, dur, prop) {
      for (let i = 0; i < 3; i++) {
        const pt = G.World.randomFloorNear(prop.x, prop.y, 30, 60) || { x: prop.x, y: prop.y };
        const e = G.World.spawnEnemy('gilded_spirit', pt.x, pt.y, {});
        e.aware = true;
      }
    },
  });
  T.add({
    id: 'leaden_curse', name: 'LEADEN CURSE!', trap: true, dur: 6,
    apply(p, dur) {
      p.addBuff('tr_lead', dur, { kind: 'speed', mult: 0.6, label: 'LEADEN', color: '#8080a0', negative: true });
      p.addBuff('tr_lead_dmg', dur, { kind: 'dmg', mult: 0.8, label: 'LEADEN', color: '#8080a0', negative: true });
    },
  });

  T.open = function (prop) {
    const P = G.World.player;
    const pool = T.all().filter(d => !!d.trap === !!prop.trapped);
    const def = G.rng.pick(pool);
    const ctx = { treasure: def, dur: def.dur, player: P, extended: false };
    if (!def.trap && def.dur > 0) G.Hooks.relic('onTreasure', ctx);
    def.apply(P, ctx.dur, prop);
    G.FX.text(prop.x, prop.y - 14, def.name + (ctx.extended ? ' (EXTENDED)' : ''), def.trap ? '#ff6060' : '#ffe080');
    G.FX.burst(prop.x, prop.y, 16, def.trap ? '#ff4040' : '#ffe080', 60, 0.5);
    G.Audio.play(def.trap ? 'hurt' : 'pickup');
  };
})();
