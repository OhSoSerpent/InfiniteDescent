// Status effects shared by the player and enemies. Statuses are registry
// definitions; each entity owns a StatusSet holding active instances.
(function () {
  'use strict';

  // def fields:
  //  id, name, color, dur (default seconds), stack: 'refresh' | 'stack' | 'replace', max (stacks)
  //  tags: [...] (e.g. 'speed' — blocked by Frozen Heart)
  //  speedMult(st) / takenMult(st) / dealtMult(st): multipliers
  //  flags: { noMove, noAct, noDash, reverse, noControl, sloppy }
  //  tick(owner, st, dt), onApply(owner, st), onExpire(owner, st)
  class StatusSet {
    constructor(owner) { this.owner = owner; this.map = new Map(); }

    apply(id, opts = {}) {
      const def = G.Statuses.get(id);
      const o = this.owner;
      if (o.dead) return false;
      if (o.immune && def.tags && def.tags.some(t => o.immune.has(t))) return false;
      if (o.statusImmune && o.statusImmune.has(id)) return false;
      const dur = opts.dur !== undefined ? opts.dur : def.dur;
      let st = this.map.get(id);
      if (st) {
        if (def.stack === 'stack') st.stacks = Math.min(opts.max || def.max || 99, st.stacks + (opts.stacks || 1));
        if (def.stack === 'replace') { st.power = opts.power !== undefined ? opts.power : def.power; }
        else if (opts.power !== undefined && opts.power > (st.power || 0)) st.power = opts.power;
        st.t = Math.max(st.t, dur);
        st.dur = Math.max(st.dur, dur);
        if (opts.weapon) st.weapon = opts.weapon;
        if (opts.source) st.source = opts.source;
      } else {
        st = {
          id, def, t: dur, dur, stacks: opts.stacks || 1,
          power: opts.power !== undefined ? opts.power : def.power,
          weapon: opts.weapon || null, source: opts.source || null, acc: 0,
        };
        this.map.set(id, st);
        if (def.onApply) def.onApply(o, st);
      }
      return true;
    }
    has(id) { return this.map.has(id); }
    get(id) { return this.map.get(id); }
    remove(id) {
      const st = this.map.get(id);
      if (!st) return;
      this.map.delete(id);
      if (st.def.onExpire) st.def.onExpire(this.owner, st);
    }
    clear() { for (const id of Array.from(this.map.keys())) this.remove(id); }
    update(dt) {
      for (const st of Array.from(this.map.values())) {
        if (st.def.tick) st.def.tick(this.owner, st, dt);
        if (this.owner.dead) return;
        st.t -= dt;
        if (st.t <= 0) this.remove(st.id);
      }
    }
    _mult(key) {
      let m = 1;
      for (const st of this.map.values()) if (st.def[key]) m *= st.def[key](st);
      return m;
    }
    speedMult() { return this._mult('speedMult'); }
    takenMult() { return this._mult('takenMult'); }
    dealtMult() { return this._mult('dealtMult'); }
    flag(name) {
      for (const st of this.map.values()) if (st.def.flags && st.def.flags[name]) return true;
      return false;
    }
    each(fn) { for (const st of this.map.values()) fn(st); }
  }

  // Damage-over-time helper: enemies take it directly, the player takes it as a "tick".
  function dot(owner, st, amount) {
    if (owner.isPlayer) G.Combat.damagePlayer(amount, { tick: true, source: st.source || 'enemy' });
    else G.Combat.damageEnemy(owner, amount, { source: 'dot', dot: st.id, weapon: st.weapon, quiet: true });
  }

  const S = G.Statuses;
  S.add({
    id: 'burn', name: 'Burning', color: '#ff7a20', dur: 3, power: 5, stack: 'refresh',
    tick(o, st, dt) { dot(o, st, st.power * dt); if (Math.random() < dt * 8) G.FX.spark(o.x, o.y - 2, '#ff9030'); },
  });
  S.add({
    id: 'poison', name: 'Poisoned', color: '#70e040', dur: 4, power: 3, stack: 'stack', max: 3,
    tick(o, st, dt) { dot(o, st, st.power * st.stacks * dt); if (Math.random() < dt * 5) G.FX.spark(o.x, o.y - 2, '#80f050'); },
  });
  S.add({
    id: 'slow', name: 'Slowed', color: '#80b0ff', dur: 1.5, power: 0.4, stack: 'refresh', tags: ['speed'],
    speedMult: st => 1 - st.power,
  });
  S.add({
    id: 'speedmod', name: 'Warped Pace', color: '#c080ff', dur: 3, power: 0.5, stack: 'replace', tags: ['speed'],
    speedMult: st => st.power,
  });
  S.add({
    id: 'curse', name: 'Cursed', color: '#a040c0', dur: Infinity, stack: 'refresh',
    takenMult: () => 1.25,
  });
  S.add({ id: 'stun', name: 'Stunned', color: '#f0f060', dur: 1, stack: 'refresh', flags: { noMove: true, noAct: true, noDash: true } });
  S.add({ id: 'freeze', name: 'Frozen', color: '#a0e0ff', dur: 1.5, stack: 'refresh', flags: { noMove: true, noAct: true, noDash: true } });
  S.add({ id: 'immobilize', name: 'Held', color: '#f0c040', dur: 1, stack: 'refresh', flags: { noMove: true, noDash: true } });
  S.add({ id: 'charm', name: 'Charmed', color: '#ff70c0', dur: 2.5, stack: 'refresh', flags: { reverse: true } });
  S.add({ id: 'reverse', name: 'Confused', color: '#40c040', dur: 2.5, stack: 'refresh', flags: { reverse: true } });
  S.add({
    id: 'rage', name: 'Enraged', color: '#ff3030', dur: 4, stack: 'refresh', flags: { sloppy: true },
    dealtMult: () => 1.3,
  });
  S.add({ id: 'slide', name: 'Sliding', color: '#c0f0ff', dur: 0.8, stack: 'refresh', flags: { noControl: true } });
  // Reaper's Mark bookkeeping (on enemies)
  S.add({ id: 'reaper', name: 'Reaping', color: '#8080a0', dur: 4, stack: 'stack', max: 3 });
  S.add({ id: 'marked', name: 'Marked', color: '#e0e0ff', dur: 4, stack: 'refresh' });

  G.StatusSet = StatusSet;
})();
