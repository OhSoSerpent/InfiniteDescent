// Relics: global passive modifiers, found one per level in the relic room (no choice).
// Hook reference: see engine/hooks.js. Extra UI hooks: badge(state) -> short string, dim(state) -> bool.
(function () {
  'use strict';
  const U = G.U;
  const R = G.Relics;
  const P = () => G.World.player;
  const fullHp = p => p.hp >= p.maxHp - 0.01;

  R.add({
    id: 'bloodlust', name: 'Bloodlust Idol', glyph: 'B', color: '#e04040',
    desc: 'When you kill an enemy, gain 20% damage for the next 10 seconds.',
    onKill(ctx, st) { st.t = 10; },
    update(ctx, st) { if (st.t > 0) st.t -= ctx.dt; },
    damageMult(ctx, st) { return st.t > 0 ? 1.2 : 1; },
    dim(st) { return !(st.t > 0); },
  });
  R.add({
    id: 'triune_anklet', name: 'Triune Anklet', glyph: '3', color: '#60c0ff',
    desc: 'You have 3 dashes.',
    stats(s) { s.dashCharges = Math.max(s.dashCharges, 3); },
  });
  R.add({
    id: 'blood_of_gods', name: 'Blood of the Gods', glyph: 'G', color: '#ff4060',
    desc: 'Killing an enemy restores 1% of your maximum health. Cannot trigger more than once every 0.25 seconds.',
    onKill(ctx, st) {
      const now = G.World.time;
      if (st.last !== undefined && now - st.last < 0.25) return;
      st.last = now;
      G.Combat.heal(P().maxHp * 0.01, true);
    },
  });
  R.add({
    id: 'hunters_eye', name: "Hunter's Eye", glyph: 'E', color: '#ff8040',
    desc: 'Enemies below 25% health are highlighted.',
  });
  R.add({
    id: 'hermes_sandals', name: "Hermes' Sandals", glyph: 'H', color: '#f0e060',
    desc: 'Movement speed increased by 10%.',
    stats(s) { s.speedMult *= 1.1; },
  });
  R.add({
    id: 'aegis', name: 'Aegis', glyph: 'A', color: '#80d0ff',
    desc: 'The first hit you take after entering a new room deals no damage.',
    onAcquire(ctx, st) { st.charged = true; },
    onRoomEnter(ctx, st) { if (ctx.first) st.charged = true; },
    onBeforeHit(ctx, st) { if (st.charged) { st.charged = false; return true; } return false; },
    dim(st) { return !st.charged; },
  });
  R.add({
    id: 'broken_hourglass', name: 'Broken Hourglass', glyph: 'X', color: '#d0b080',
    desc: 'Your dash cooldown is reduced by 20%.',
    stats(s) { s.dashCdMult *= 0.8; },
  });
  R.add({
    id: 'charons_coin', name: "Charon's Coin", glyph: 'C', color: '#c0a040',
    desc: 'Every 10th enemy killed drops a small amount of healing.',
    onKill(ctx, st) {
      st.n = (st.n || 0) + 1;
      if (st.n % 10 === 0) G.World.addPickup(new G.Pickup('heart', ctx.enemy.x, ctx.enemy.y, 5));
    },
    badge(st) { return String(10 - ((st.n || 0) % 10)); },
  });
  R.add({
    id: 'warriors_blood', name: "Warrior's Blood", glyph: 'W', color: '#c02020',
    desc: 'Gain 10% increased damage while below 50% health.',
    damageMult() { const p = P(); return p.hp < p.maxHp * 0.5 ? 1.1 : 1; },
    dim() { const p = P(); return !(p && p.hp < p.maxHp * 0.5); },
  });
  R.add({
    id: 'spartan_shield', name: 'Spartan Shield', glyph: 'S', color: '#c08030',
    desc: 'Taking damage temporarily reduces incoming damage by 25% for 2 seconds.',
    onPlayerHit(ctx, st) { st.t = 2; },
    update(ctx, st) { if (st.t > 0) st.t -= ctx.dt; },
    takenMult(ctx, st) { return st.t > 0 ? 0.75 : 1; },
    dim(st) { return !(st.t > 0); },
  });
  R.add({
    id: 'achilles_heel', name: "Achilles' Heel", glyph: 'A', color: '#e0c060',
    desc: 'Deal 50% more damage while at full health. Losing health removes the bonus until you heal back to full.',
    damageMult() { return fullHp(P()) ? 1.5 : 1; },
    dim() { const p = P(); return !(p && fullHp(p)); },
  });
  R.add({
    id: 'cerberus_fang', name: "Cerberus' Fang", glyph: 'F', color: '#b0a090',
    desc: 'Killing an enemy has a small chance to cause two additional enemies nearby to take a burst of damage.',
    onKill(ctx) {
      if (!G.rng.chance(0.15)) return;
      const src = ctx.enemy;
      const near = G.World.enemies.filter(e => !e.dead && e !== src && e.spawning <= 0 && U.dist(e.x, e.y, src.x, src.y) < 150)
        .sort((a, b) => U.dist2(a.x, a.y, src.x, src.y) - U.dist2(b.x, b.y, src.x, src.y)).slice(0, 2);
      for (const e of near) {
        G.FX.tracer([{ x: src.x, y: src.y }, { x: e.x, y: e.y }], '#ffd0a0', 0.2);
        G.Combat.damageEnemy(e, 30 * P().stats.dealtMult, { source: 'relic' });
      }
    },
  });
  R.add({
    id: 'midas_touch', name: "Midas' Touch", glyph: 'M', color: '#f0c040',
    desc: 'Gold pickups increase your damage slightly (+2% each, up to +50%) for the rest of the current level.',
    onGold(ctx, st) { st.bonus = Math.min(0.5, (st.bonus || 0) + 0.02 * ctx.amount); },
    onLevelStart(ctx, st) { st.bonus = 0; },
    damageMult(ctx, st) { return 1 + (st.bonus || 0); },
    badge(st) { return st.bonus ? '+' + Math.round(st.bonus * 100) : ''; },
  });
  R.add({
    id: 'spear_of_destiny', name: 'Spear of Destiny', glyph: 'D', color: '#a0a0ff',
    desc: 'Every 20th shot fired deals 5x damage.',
    onTrigger(ctx, st) {
      if (ctx.isEcho) return;
      st.n = (st.n || 0) + 1;
      if (st.n % 20 === 0) { ctx.fireMult *= 5; G.FX.text(P().x, P().y - 16, 'DESTINY', '#a0a0ff'); }
    },
    badge(st) { return String(20 - ((st.n || 0) % 20)); },
  });
  R.add({
    id: 'brunos_flame', name: "Bruno's Flame", glyph: 'B', color: '#ff7020',
    desc: 'Enemies that die while burning have a chance to leave a small patch of fire behind.',
    onKill(ctx) {
      const e = ctx.enemy;
      if (!e.status.has('burn') || !G.rng.chance(0.4)) return;
      G.World.addZone(new G.Zone('fire', { x: e.x, y: e.y, r: 14, life: 3, team: 'player', data: { dps: 10 } }));
    },
  });
  R.add({
    id: 'icarus_wings', name: "Icarus' Wings", glyph: 'I', color: '#f0f0ff',
    desc: 'Your dash travels farther. Does not give additional dashes.',
    stats(s) { s.dashDistMult *= 1.4; },
  });
  R.add({
    id: 'tortoise_shell', name: 'Tortoise Shell', glyph: 'T', color: '#60a060',
    desc: 'Take 15% less damage. Your movement speed is reduced by 5%.',
    stats(s) { s.takenMult *= 0.85; s.speedMult *= 0.95; },
  });
  R.add({
    id: 'ghost_step', name: 'Ghost Step', glyph: 'G', color: '#c0c0ff',
    desc: 'After dashing, you become slightly faster for 2 seconds.',
    onDash(ctx) { ctx.player.addBuff('ghost_step', 2.16, { kind: 'speed', mult: 1.2, label: 'GHOST', color: '#c0c0ff' }); },
  });
  R.add({
    id: 'styxwalker', name: 'Styxwalker', glyph: 'S', color: '#4080a0',
    desc: 'Environmental hazards deal 50% less damage.',
    stats(s) { s.hazardMult *= 0.5; },
  });
  R.add({
    id: 'fates_favor', name: "Fate's Favor", glyph: 'F', color: '#e0c0ff',
    desc: 'Once per level, surviving a hit that would kill you instead leaves you at 1 HP.',
    onLevelStart(ctx, st) { st.used = false; },
    onLethal(ctx, st) {
      if (st.used) return false;
      st.used = true;
      ctx.player.hp = 1;
      G.FX.text(ctx.player.x, ctx.player.y - 20, "FATE'S FAVOR", '#e0c0ff');
      G.FX.flash('#e0c0ff', 0.3);
      return true;
    },
    dim(st) { return !!st.used; },
  });
  R.add({
    id: 'frozen_heart', name: 'Frozen Heart', glyph: 'F', color: '#a0e0ff',
    desc: 'You cannot be slowed or have your movement speed altered by enemies or effects. Does not prevent stuns or immobilization.',
    stats(s) { s.immune.push('speed'); },
  });
  R.add({
    id: 'berserkers_crown', name: "Berserker's Crown", glyph: 'C', color: '#ff3030',
    desc: 'Deal 50% more damage. You take 25% more damage.',
    stats(s) { s.dealtMult *= 1.5; s.takenMult *= 1.25; },
  });
  R.add({
    id: 'glass_skull', name: 'Glass Skull', glyph: 'K', color: '#e0f0ff',
    desc: 'Deal 100% more damage. Your maximum health is reduced by 30%.',
    stats(s) { s.dealtMult *= 2; s.maxHpMult *= 0.7; },
  });
  function gamble(st) {
    st.good = G.rng.chance(0.5);
    G.HUD.toast(st.good ? "GAMBLER'S COIN: +50% DAMAGE" : "GAMBLER'S COIN: -25% DAMAGE", st.good ? '#80ff80' : '#ff8080');
  }
  R.add({
    id: 'gamblers_coin', name: "Gambler's Coin", glyph: '$', color: '#e0d060',
    desc: 'At the beginning of each level, randomly gain either 50% increased damage or 25% reduced damage.',
    onAcquire(ctx, st) { gamble(st); },
    onLevelStart(ctx, st) { gamble(st); },
    damageMult(ctx, st) { return st.good ? 1.5 : 0.75; },
    badge(st) { return st.good ? '+' : '-'; },
  });
  R.add({
    id: 'pandoras_jar', name: "Pandora's Jar", glyph: 'J', color: '#c080e0',
    desc: 'All healing is 50% more effective. Elite enemies deal 25% more damage.',
    stats(s) { s.healMult *= 1.5; s.eliteTakenMult *= 1.25; },
  });
  R.add({
    id: 'sisyphus_stone', name: "Sisyphus' Stone", glyph: 'O', color: '#909090',
    desc: 'Every time you take damage, your damage increases by 10%. The bonus resets when you enter a new level.',
    onPlayerHit(ctx, st) { st.stacks = (st.stacks || 0) + 1; },
    onLevelStart(ctx, st) { st.stacks = 0; },
    damageMult(ctx, st) { return 1 + 0.1 * (st.stacks || 0); },
    badge(st) { return st.stacks ? '+' + st.stacks * 10 : ''; },
  });
  R.add({
    id: 'narcissus', name: 'Narcissus', glyph: 'N', color: '#f0a0c0',
    desc: 'Deal 25% more damage while at full health. Take 25% more damage while below 25% health.',
    damageMult() { return fullHp(P()) ? 1.25 : 1; },
    takenMult(ctx) { const p = ctx.player; return p.hp < p.maxHp * 0.25 ? 1.25 : 1; },
  });
  R.add({
    id: 'golden_fleece', name: 'Golden Fleece', glyph: 'F', color: '#ffd040',
    desc: 'Picking up a temporary treasure has a chance to extend its duration.',
    onTreasure(ctx) { if (G.rng.chance(0.5)) { ctx.dur *= 2; ctx.extended = true; } },
  });
  R.add({
    id: 'thread_of_ariadne', name: 'Thread of Ariadne', glyph: 'T', color: '#f0e0a0',
    desc: 'The entrance and exit of each room are briefly revealed when you enter (and false doors are exposed).',
    onRoomEnter() { G.World.revealDoors(3); },
  });
  R.add({
    id: 'prometheus_flame', name: "Prometheus' Flame", glyph: 'P', color: '#ff9020',
    desc: 'Your first attack against an enemy always ignites it.',
    onHit(ctx) { if (ctx.firstHit && !ctx.target.dead) ctx.target.status.apply('burn', { weapon: ctx.weapon, power: 5, dur: 3 }); },
  });
  R.add({
    id: 'medusas_eye', name: "Medusa's Eye", glyph: 'M', color: '#60c060',
    desc: 'Enemies that stay within a short distance of you for too long are briefly slowed.',
    update(ctx) {
      const p = ctx.player;
      for (const e of G.World.enemies) {
        if (e.dead || e.spawning > 0) continue;
        if (U.dist(e.x, e.y, p.x, p.y) < 40 + e.r) {
          e.medusaT = (e.medusaT || 0) + ctx.dt;
          if (e.medusaT >= 1.5) { e.medusaT = 0; e.status.apply('slow', { power: 0.5, dur: 2 }); G.FX.text(e.x, e.y - e.r - 8, 'PETRIFIED', '#80d080'); }
        } else e.medusaT = Math.max(0, (e.medusaT || 0) - ctx.dt);
      }
    },
  });
  R.add({
    id: 'orpheus_lyre', name: "Orpheus' Lyre", glyph: 'L', color: '#d0c0ff',
    desc: 'Reviving an enemy takes twice as long.',
  });
  R.add({
    id: 'atlas_burden', name: "Atlas' Burden", glyph: 'A', color: '#8080a0',
    desc: 'You deal 20% more damage but your dash travels 20% less distance.',
    stats(s) { s.dealtMult *= 1.2; s.dashDistMult *= 0.8; },
  });
  R.add({
    id: 'hades_helm', name: "Hades' Helm", glyph: 'H', color: '#404060',
    desc: 'Enemies have a harder time detecting you when you enter a room. Your first attack against an unaware enemy deals double damage.',
    damageMult(ctx) { return ctx.target && !ctx.target.aware ? 2 : 1; },
  });
  R.add({
    id: 'moirai_thread', name: "Moirai's Thread", glyph: 'M', color: '#f0f0f0',
    desc: 'Once per level, lethal damage is delayed for 2 seconds. Killing an enemy during those 2 seconds prevents it.',
    onLevelStart(ctx, st) { st.used = false; st.pending = null; },
    onLethal(ctx, st) {
      if (st.used || st.pending) return false;
      st.used = true;
      st.pending = { amount: ctx.amount, t: 2 };
      G.FX.text(ctx.player.x, ctx.player.y - 20, 'FATE DELAYED', '#ffffff');
      G.FX.flash('#ffffff', 0.25);
      return true;
    },
    onKill(ctx, st) {
      if (!st.pending) return;
      st.pending = null;
      G.FX.text(P().x, P().y - 20, 'FATE DEFIED', '#80ff80');
    },
    update(ctx, st) {
      if (!st.pending) return;
      st.pending.t -= ctx.dt;
      if (st.pending.t <= 0) {
        const amt = st.pending.amount;
        st.pending = null;
        G.Combat.damagePlayer(amt, { tick: true, show: true, source: 'fate' });
      }
    },
    badge(st) { return st.pending ? Math.ceil(st.pending.t) + 'S' : ''; },
    dim(st) { return !!st.used && !st.pending; },
  });
})();
