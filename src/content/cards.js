// Weapon cards. Each weapon holds up to 3. Cards sharing a `group` are mutually
// exclusive on the same weapon (e.g. only one projectile type).
//
// Hook reference (see engine/hooks.js): stats(s, f), onTrigger(ctx, st), modifyBullet(ctx, st) [ctx.bullet, ctx.trig],
// hitMult(ctx, st) -> number, onHit(ctx, st), onKill(ctx, st), update(ctx, st), onPlayerHit(ctx, st),
// onDash(ctx, st), intervalMult(ctx, st) -> number, hud(weapon, st) -> { label, frac, color }
(function () {
  'use strict';
  const U = G.U;
  const C = G.Cards;

  const OFF = '#e05050', ELEM = '#f09030', TECH = '#60a0e0', RISK = '#c060d0', MOVE = '#50c080';

  // Helper: nearest living enemy to (x,y) within range, excluding a set.
  function nearestEnemy(x, y, range, exclude) {
    let best = null, bd = range * range;
    for (const e of G.World.enemies) {
      if (e.dead || e.spawning > 0 || e.hidden || (exclude && exclude.has(e))) continue;
      const d = U.dist2(x, y, e.x, e.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  // ------------------------------------------------------------------ base cards
  C.add({
    id: 'lightspeed', name: 'Lightspeed', glyph: 'LS', color: TECH, group: 'projectile',
    desc: 'Bullets have no travel time.',
    modifyBullet(ctx) { ctx.bullet.instant = true; },
  });
  C.add({
    id: 'powder_keg', name: 'Powder Keg', glyph: 'PK', color: ELEM,
    desc: 'Bullets explode, splashing 50% damage to nearby enemies.',
    modifyBullet(ctx) { ctx.bullet.explode = { r: 22, factor: 0.5 }; },
  });
  C.add({
    id: 'five_fold', name: 'Five-Fold Wrath', glyph: 'x5', color: RISK, group: 'bigdamage',
    desc: 'Your bullets do 5x damage, but have a maximum clip size of 2.',
    stats(s, f) { s.dmgMult *= 5; f.magCap = 2; },
  });
  C.add({
    id: 'harvest', name: 'Harvest Reload', glyph: 'HR', color: TECH,
    desc: 'If a bullet kills an enemy, instantly reload.',
    onKill(ctx) {
      if (!ctx.bullet || !ctx.weapon || ctx.weapon.flags.bloodMagic) return;
      const w = ctx.weapon;
      w.ammo = w.stats.mag; w.reloadT = 0;
      G.FX.text(G.World.player.x, G.World.player.y - 16, 'RELOAD', '#f0e080');
    },
  });
  C.add({
    id: 'hellfire', name: 'Hellfire', glyph: 'HF', color: ELEM, group: 'projectile',
    desc: 'Bullets are replaced with fireballs: bigger, slower, 20% more damage, ignite and scorch nearby foes.',
    modifyBullet(ctx) {
      const b = ctx.bullet;
      b.kind = 'fireball'; b.r = 4; b.vx *= 0.75; b.vy *= 0.75; b.dmg *= 1.2; b.ignite = true;
      if (!b.explode) b.explode = { r: 16, factor: 0.35 };
    },
  });
  C.add({
    id: 'stasis_orbs', name: 'Stasis Orbs', glyph: 'SO', color: TECH, group: 'projectile',
    desc: 'Bullets are instead slow-moving orbs that repeatedly damage enemies standing in them.',
    modifyBullet(ctx) {
      const b = ctx.bullet;
      const sp = Math.hypot(b.vx, b.vy) || 1;
      b.vx = b.vx / sp * 70; b.vy = b.vy / sp * 70;
      b.kind = 'orb'; b.orb = true; b.r = 8; b.life = 3; b.color = '#b070ff';
    },
  });

  // ------------------------------------------------------------------ additional cards
  C.add({
    id: 'glass_cannon', name: 'Glass Cannon', glyph: 'GC', color: RISK, group: 'bigdamage',
    desc: 'Bullets deal 2.5x damage, but your weapon has half its normal ammunition. Does not stack with Five-Fold Wrath.',
    stats(s) { s.dmgMult *= 2.5; s.magMult *= 0.5; },
  });
  C.add({
    id: 'ricochet', name: 'Ricochet', glyph: 'RC', color: TECH, group: 'walls',
    desc: 'Bullets bounce off walls once before disappearing.',
    modifyBullet(ctx) { ctx.bullet.ricochet += 1; },
  });
  C.add({
    id: 'chain_shot', name: 'Chain Shot', glyph: 'CH', color: TECH,
    desc: 'Every third shot bounces toward a nearby enemy after hitting its first target. The chained shot deals 50% damage.',
    onTrigger(ctx, st) { st.n = (st.n || 0) + 1; if (st.n % 3 === 0) ctx.chain = true; },
    modifyBullet(ctx) { if (ctx.trig.chain) ctx.bullet.chain = true; },
    onHit(ctx) {
      const b = ctx.bullet;
      if (ctx.tick || !b.chain || b.sub || b.chained) return;
      b.chained = true;
      const tgt = nearestEnemy(ctx.target.x, ctx.target.y, 140, b.hitSet);
      if (!tgt) return;
      const a = U.angle(ctx.target.x, ctx.target.y, tgt.x, tgt.y);
      G.World.spawnPlayerBullet({
        team: 'player', x: ctx.target.x, y: ctx.target.y, vx: Math.cos(a) * 420, vy: Math.sin(a) * 420, r: 2,
        dmg: b.dmg * 0.5, fireMult: b.fireMult, crit: b.crit, life: 0.6, kind: 'bullet', color: '#80e0ff',
        weapon: b.weapon, sub: true, hitSet: new Set([ctx.target]), ignite: b.ignite, poison: b.poison, slow: b.slow, curseChance: b.curseChance,
      });
    },
  });
  C.add({
    id: 'scattershot', name: 'Scattershot', glyph: 'SS', color: OFF,
    desc: 'Each shot fires 5 weaker projectiles in a spread. Each deals 35% damage.',
    stats(s, f) { f.pellets = 5; f.pelletFactor = 0.35; f.pelletArc = 0.55; },
  });
  C.add({
    id: 'piercing', name: 'Piercing', glyph: 'PI', color: OFF,
    desc: 'Bullets pass through enemies and can hit multiple targets. Each enemy after the first takes 25% less damage.',
    modifyBullet(ctx) { const b = ctx.bullet; b.pierce = Math.max(b.pierce, 3); b.pierceFalloff = 0.75; },
  });
  C.add({
    id: 'executioner', name: 'Executioner', glyph: 'EX', color: OFF,
    desc: 'Bullets deal 2x damage against enemies below 25% health.',
    hitMult(ctx) { return ctx.target.hp < ctx.target.maxHp * 0.25 ? 2 : 1; },
  });
  C.add({
    id: 'heavy_rounds', name: 'Heavy Rounds', glyph: 'HV', color: OFF,
    desc: 'Bullets travel more slowly but deal 2x damage and knock enemies back significantly.',
    stats(s) { s.dmgMult *= 2; s.speedMult *= 0.6; s.knock = Math.max(s.knock, 130); },
    modifyBullet(ctx) { ctx.bullet.r = Math.max(ctx.bullet.r, 3); },
  });
  C.add({
    id: 'hollow_point', name: 'Hollow Point', glyph: 'HP', color: OFF,
    desc: 'Bullets deal 75% more damage at close range. Damage falls off significantly with distance.',
    hitMult(ctx) {
      const d = ctx.dist || 0;
      if (d <= 50) return 1.75;
      if (d >= 180) return 0.5;
      return U.lerp(1.75, 0.5, (d - 50) / 130);
    },
  });
  C.add({
    id: 'shrapnel', name: 'Shrapnel', glyph: 'SH', color: OFF,
    desc: 'Hits release several tiny projectiles in random directions. Weak alone, strong against groups.',
    onHit(ctx) {
      const b = ctx.bullet;
      if (ctx.tick || b.sub) return;
      for (let i = 0; i < 5; i++) {
        const a = Math.random() * U.TAU;
        G.World.spawnPlayerBullet({
          team: 'player', x: ctx.target.x, y: ctx.target.y, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220, r: 1,
          dmg: b.dmg * 0.15, fireMult: b.fireMult, crit: false, life: 0.3, kind: 'bullet', color: '#ffc080',
          weapon: b.weapon, sub: true, hitSet: new Set([ctx.target]),
        });
      }
    },
  });
  C.add({
    id: 'incendiary', name: 'Incendiary', glyph: 'IN', color: ELEM,
    desc: 'Bullets ignite enemies. Burning enemies take damage over time for several seconds.',
    modifyBullet(ctx) { ctx.bullet.ignite = true; },
  });
  C.add({
    id: 'venom', name: 'Venom', glyph: 'VN', color: ELEM,
    desc: 'Bullets poison enemies. Poison stacks up to three times.',
    modifyBullet(ctx) { ctx.bullet.poison = true; },
  });
  C.add({
    id: 'cold_iron', name: 'Cold Iron', glyph: 'CI', color: ELEM,
    desc: 'Bullets slow enemies briefly. Repeated hits refresh the slow rather than stacking it.',
    modifyBullet(ctx) { ctx.bullet.slow = true; },
  });
  C.add({
    id: 'cursed_ammo', name: 'Cursed Ammunition', glyph: 'CU', color: RISK,
    desc: 'Every bullet has a small chance to curse an enemy. Cursed enemies take 25% more damage from all sources until they die.',
    modifyBullet(ctx) { ctx.bullet.curseChance = Math.max(ctx.bullet.curseChance, 0.1); },
  });
  C.add({
    id: 'blood_rounds', name: 'Blood Rounds', glyph: 'BR', color: MOVE,
    desc: 'Killing an enemy restores a small amount of health (at most once every 1.5 seconds).',
    onKill(ctx, st) {
      const now = G.World.time;
      if (st.last !== undefined && now - st.last < 1.5) return;
      st.last = now;
      G.Combat.heal(3);
    },
  });
  C.add({
    id: 'double_tap', name: 'Double Tap', glyph: 'DT', color: OFF,
    desc: 'Every time you fire, two bullets are released instead of one. Maximum ammunition is reduced by 40%.',
    stats(s, f) { f.doubleTap = true; s.magMult *= 0.6; },
  });
  C.add({
    id: 'burst_fire', name: 'Burst Fire', glyph: 'BF', color: OFF,
    desc: 'Each trigger pull fires three bullets rapidly. Uses three ammunition per shot.',
    stats(s, f) { f.burst = true; },
  });
  C.add({
    id: 'last_bullet', name: 'Last Bullet', glyph: 'LB', color: RISK,
    desc: 'The final bullet in the magazine deals 4x damage.',
    onTrigger(ctx) { ctx.lastMult *= 4; },
  });
  C.add({
    id: 'bottomless', name: 'Bottomless Magazine', glyph: 'BM', color: TECH,
    desc: 'Magazine size is doubled. Reload time is increased substantially.',
    stats(s) { s.magMult *= 2; s.reloadMult *= 1.75; },
  });
  C.add({
    id: 'quick_loader', name: 'Quick Loader', glyph: 'QL', color: TECH,
    desc: 'Reload 50% faster. Magazine size is reduced by 25%.',
    stats(s) { s.reloadMult *= 0.5; s.magMult *= 0.75; },
  });
  C.add({
    id: 'overheat', name: 'Overheat', glyph: 'OH', color: RISK,
    desc: 'Continuous firing increases damage (up to +60%). Fire too long and the weapon overheats, becoming unusable briefly.',
    onTrigger(ctx, st) {
      st.heat = st.heat || 0;
      ctx.fireMult *= 1 + st.heat * 0.6;
      st.heat += 0.075;
      st.since = 0;
      if (st.heat >= 1) {
        st.heat = 0;
        ctx.weapon.overheatT = 1.5;
        G.FX.text(G.World.player.x, G.World.player.y - 16, 'OVERHEATED', '#ff6030');
        G.FX.burst(G.World.player.x, G.World.player.y, 10, '#ff6030', 40, 0.4);
      }
    },
    update(ctx, st) {
      st.since = (st.since || 0) + ctx.dt;
      if (st.since > 0.35) st.heat = Math.max(0, (st.heat || 0) - 0.5 * ctx.dt);
    },
    hud(w, st) { return { label: 'HEAT', frac: w.overheatT > 0 ? 1 : (st.heat || 0), color: w.overheatT > 0 ? '#ff3020' : '#ff9030' }; },
  });
  C.add({
    id: 'desperation', name: 'Desperation', glyph: 'DS', color: RISK,
    desc: 'Fire rate increases as the magazine gets closer to empty, peaking with the final three bullets.',
    intervalMult(ctx) {
      const w = ctx.weapon;
      if (w.flags.bloodMagic || ctx.player.buffActive('infammo')) return 1;
      const mag = w.stats.mag;
      if (w.ammo <= 3 || mag <= 3) return 0.45;
      return 0.45 + 0.55 * U.clamp((w.ammo - 3) / (mag - 3), 0, 1);
    },
  });
  C.add({
    id: 'dash_shot', name: 'Dash Shot', glyph: 'D3', color: MOVE,
    desc: 'Your next shot after dashing deals 3x damage.',
    onDash(ctx, st) { st.ready = true; },
    onTrigger(ctx, st) { if (st.ready) { st.ready = false; ctx.fireMult *= 3; } },
    hud(w, st) { return st.ready ? { label: 'READY', frac: 1, color: '#60ff90' } : null; },
  });
  C.add({
    id: 'death_from_above', name: 'Death From Above', glyph: 'DA', color: MOVE,
    desc: 'Shooting immediately after a dash deals 60% bonus damage and knocks enemies back.',
    onTrigger(ctx) {
      const P = ctx.player;
      if (P.isDashing() || P.sinceDash < 0.4) { ctx.fireMult *= 1.6; ctx.dfa = true; }
    },
    modifyBullet(ctx) { if (ctx.trig.dfa) ctx.bullet.knock = Math.max(ctx.bullet.knock, 170); },
  });
  C.add({
    id: 'reapers_mark', name: "Reaper's Mark", glyph: 'RM', color: RISK,
    desc: 'Hitting an enemy three times marks them. Killing a marked enemy causes a small explosion. Marks fade if not hit for several seconds.',
    onHit(ctx) {
      const e = ctx.target;
      if (e.dead || ctx.tick) return;
      if (e.status.has('marked')) { e.status.apply('marked', { dur: 4 }); return; }
      e.status.apply('reaper', { dur: 4 });
      const st = e.status.get('reaper');
      if (st && st.stacks >= 3) { e.status.remove('reaper'); e.status.apply('marked', { dur: 4 }); G.FX.text(e.x, e.y - e.r - 10, 'MARKED', '#e0e0ff'); }
    },
    onKill(ctx) {
      const e = ctx.enemy;
      if (!e.status.has('marked') || !ctx.weapon) return;
      const dmg = ctx.weapon.stats.damage * 2 * G.Combat.outgoingMult({ weapon: ctx.weapon });
      G.Combat.explosion(e.x, e.y, 32, dmg, { team: 'player', weapon: ctx.weapon, exclude: e, color: '#d0d0ff' });
    },
  });
  C.add({
    id: 'momentum', name: 'Momentum', glyph: 'MO', color: MOVE,
    desc: 'Moving quickly increases your bullet damage, up to +50%. Standing still removes the bonus.',
    onTrigger(ctx) {
      const P = ctx.player;
      const frac = U.clamp(Math.hypot(P.vx, P.vy) / Math.max(1, P.speed()), 0, 1);
      ctx.fireMult *= 1 + 0.5 * frac;
    },
  });
  C.add({
    id: 'blood_magic', name: 'Blood Magic', glyph: 'BL', color: RISK,
    desc: 'Your weapon no longer uses ammunition. Every shot instead costs 1 health. Cannot reduce you below 1 HP.',
    stats(s, f) { f.bloodMagic = true; },
  });
  C.add({
    id: 'hydra', name: 'The Hydra', glyph: 'HY', color: OFF,
    desc: 'Every bullet splits into three smaller bullets shortly after being fired. Each split bullet deals 40% damage.',
    modifyBullet(ctx) { if (!ctx.bullet.sub) ctx.bullet.hydra = true; },
  });

  // Pandora's Box buff tables (player-wide, a few seconds each).
  const PANDORA_GOOD = [
    { id: 'pb_power', label: 'POWER', kind: 'dmg', mult: 1.75, color: '#ff6060' },
    { id: 'pb_rapid', label: 'RAPID', kind: 'interval', mult: 0.6, color: '#ffd060' },
    { id: 'infammo', label: 'ENDLESS', kind: 'flag', mult: 1, color: '#60e0ff' },
    { id: 'pb_swift', label: 'SWIFT', kind: 'speed', mult: 1.25, color: '#60ff90' },
    { id: 'pb_flame', label: 'FLAME', kind: 'flag', mult: 1, color: '#ff9030' },
  ];
  const PANDORA_BAD = [
    { id: 'pb_weak', label: 'WEAK', kind: 'dmg', mult: 0.6, color: '#8080a0', negative: true },
    { id: 'pb_sluggish', label: 'SLUGGISH', kind: 'interval', mult: 1.5, color: '#8080a0', negative: true },
    { id: 'pb_slow', label: 'HEAVY FEET', kind: 'speed', mult: 0.8, color: '#8080a0', negative: true },
    { id: 'jam', label: 'JAMMED', kind: 'flag', mult: 1, color: '#8080a0', negative: true, dur: 1 },
  ];
  C.add({
    id: 'pandoras_box', name: "Pandora's Box", glyph: 'PB', color: RISK,
    desc: 'Every shot has a small chance to grant a random beneficial effect, and a smaller chance of a random negative one. Effects last a few seconds.',
    onTrigger(ctx) {
      const r = Math.random();
      let b = null;
      if (r < 0.1) b = G.rng.pick(PANDORA_GOOD);
      else if (r < 0.14) b = G.rng.pick(PANDORA_BAD);
      if (!b) return;
      ctx.player.addBuff(b.id, b.dur || 4, b);
      G.FX.text(ctx.player.x, ctx.player.y - 18, b.label, b.color);
    },
    modifyBullet(ctx) { if (ctx.player.buffActive('pb_flame')) ctx.bullet.ignite = true; },
  });
  C.add({
    id: 'echo', name: 'Echo', glyph: 'EC', color: TECH,
    desc: 'Every fifth shot repeats itself automatically a moment later. The repeated shot deals 75% damage.',
    onTrigger(ctx, st) {
      if (ctx.isEcho) return;
      st.n = (st.n || 0) + 1;
      if (st.n % 5 !== 0) return;
      const w = ctx.weapon, P = ctx.player;
      w.queue.push({ t: 0.25, fn: () => w.emit(P, Object.assign({}, ctx, { isEcho: true, lastIndex: -1 }), 0, 0.75) });
    },
  });
  C.add({
    id: 'minotaurs_charge', name: "Minotaur's Charge", glyph: 'MC', color: MOVE,
    desc: 'Bullets gain damage the longer you keep moving (up to +100% after 5 seconds). Stopping resets the bonus.',
    onTrigger(ctx) { ctx.fireMult *= 1 + Math.min(ctx.player.moveTime / 5, 1); },
    hud(w) { const P = G.World.player; return P && P.moveTime > 0 ? { label: 'CHARGE', frac: Math.min(P.moveTime / 5, 1), color: '#c08040' } : null; },
  });
  C.add({
    id: 'styx_rounds', name: 'Styx Rounds', glyph: 'SX', color: TECH, group: 'walls',
    desc: 'Bullets pass through enemies but disappear when they hit a wall. Enemies killed by these bullets cannot be revived.',
    modifyBullet(ctx) { ctx.bullet.styx = true; ctx.bullet.noRevive = true; ctx.bullet.color = '#80c0e0'; },
  });
  C.add({
    id: 'fates_thread', name: "Fate's Thread", glyph: 'FT', color: RISK,
    desc: 'Every 10th shot from this weapon is guaranteed to critically hit.',
    onTrigger(ctx, st) { st.n = (st.n || 0) + 1; if (st.n % 10 === 0) ctx.crit = true; },
    hud(w, st) { return { label: 'FATE', frac: ((st.n || 0) % 10) / 9, color: '#e0c0ff' }; },
  });
  C.add({
    id: 'nemesis', name: 'Nemesis', glyph: 'NE', color: RISK,
    desc: 'Every time you take damage, this weapon gains 25% damage for 5 seconds. Refreshes, does not stack.',
    onPlayerHit(ctx, st) { st.t = 5; },
    update(ctx, st) { if (st.t > 0) st.t -= ctx.dt; },
    onTrigger(ctx, st) { if (st.t > 0) ctx.fireMult *= 1.25; },
    hud(w, st) { return st.t > 0 ? { label: 'NEMESIS', frac: st.t / 5, color: '#ff4060' } : null; },
  });

  // Card rule helpers used by the card-pick UI.
  G.CardRules = {
    // Returns { ok, slots:[...] } — the slots on this weapon the card may go into.
    placements(def, weapon) {
      const conflicts = weapon.conflictsWith(def);
      if (conflicts.length) return { forced: true, slots: conflicts, reason: 'Replaces ' + conflicts.map(i => weapon.cards[i].def.name).join(', ') };
      const slots = [];
      for (let i = 0; i < G.Weapon.MAX_CARDS; i++) slots.push(i);
      return { forced: false, slots: slots.filter(i => i <= weapon.cards.length) };
    },
  };
})();
