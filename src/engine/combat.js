// Damage pipeline for player -> enemy and enemy/hazard -> player, kills, healing, explosions.
(function () {
  'use strict';
  const U = G.U;
  const Hooks = G.Hooks;

  const Combat = {
    CRIT_MULT: 2,

    // Everything that scales the player's outgoing damage (except per-bullet fire-time multipliers).
    outgoingMult(ctx) {
      const P = G.World.player;
      if (!P) return 1;
      return P.stats.dealtMult * Hooks.relicMult('damageMult', ctx) * P.status.dealtMult() * P.buffMult('dmg');
    },

    // Final damage for a player bullet striking enemy e.
    bulletDamage(b, e, partMult = 1) {
      const P = G.World.player;
      const ctx = { bullet: b, weapon: b.weapon, target: e, player: P, dist: b.traveled, hitIndex: b.hitsCount };
      let d = b.dmg * b.fireMult * (b.crit ? this.CRIT_MULT : 1) * partMult;
      d *= Hooks.weaponMult(b.weapon, 'hitMult', ctx);
      d *= this.outgoingMult(ctx);
      if (b.pierceFalloff && b.hitsCount > 0) d *= b.pierceFalloff;
      return d;
    },

    // info: { source, weapon, bullet, crit, kb:{x,y,power}, quiet, noRevive, part }
    damageEnemy(e, amount, info = {}) {
      if (!e || e.dead || !(amount > 0)) return 0;
      if (e.spawning > 0) return 0;
      if (e.invulnerable) {
        if (!info.quiet && Math.random() < 0.3) G.FX.text(e.x, e.y - e.r - 4, 'IMMUNE', '#9090a0');
        return 0;
      }
      if (e.onBeforeDamage) {
        amount = e.onBeforeDamage(amount, info);
        if (!(amount > 0)) return 0;
      }
      amount *= e.status.takenMult() * (e.takenMult || 1);
      e.hp -= amount;
      e.flash = 0.08;
      e.aware = true;
      if (G.Run.active) G.Run.stats.damageDealt += amount;
      if (info.kb && !e.kbImmune) {
        const k = info.kb.power * (1 - (e.kbResist || 0));
        e.kx += info.kb.x * k; e.ky += info.kb.y * k;
      }
      if (info.quiet) {
        e.dotAcc = (e.dotAcc || 0) + amount;
        if (e.dotAcc >= 4) { G.FX.text(e.x, e.y - e.r - 4, Math.round(e.dotAcc), '#c0e080'); e.dotAcc = 0; }
      } else {
        G.FX.text(e.x, e.y - e.r - 4, Math.max(1, Math.round(amount)), info.crit ? '#ffe040' : '#ffffff', info.crit);
      }
      if (e.onDamaged) e.onDamaged(amount, info);
      if (e.hp <= 0 && !e.dead) this.kill(e, info);
      return amount;
    },

    kill(e, info = {}) {
      if (e.dead) return;
      e.dead = true;
      e.hp = 0;
      if (info.noRevive) e.noRevive = true;
      G.FX.burst(e.x, e.y, 10 + Math.min(20, e.r * 2), e.bloodColor || '#a01818', 70, 0.5);
      G.Audio.play('kill');
      if (e.onDeath) e.onDeath(info);
      if (e.noCredit) return;
      const P = G.World.player;
      if (G.Run.active) G.Run.stats.kills++;
      const ctx = { enemy: e, info, player: P, weapon: info.weapon || null, bullet: info.bullet || null };
      if (info.weapon) Hooks.weapon(info.weapon, 'onKill', ctx);
      Hooks.relic('onKill', ctx);
      G.World.dropLoot(e);
    },

    // Area damage. opts: { team:'player'|'enemy', weapon, exclude (entity), color, source, noFx, dmgPlayerMult }
    explosion(x, y, r, dmg, opts = {}) {
      const team = opts.team || 'player';
      if (!opts.noFx) {
        G.FX.burst(x, y, 16, opts.color || '#ffa030', r * 3, 0.35, 2);
        G.FX.burst(x, y, 8, '#fff0b0', r * 2, 0.2, 1);
        G.FX.ringFx(x, y, r, opts.color || '#ffa030', 0.25);
        G.Audio.play('explode');
        G.Cam.shake(Math.min(4, r / 10), 0.15);
      }
      if (team === 'player') {
        for (const e of G.World.enemies) {
          if (e.dead || e === opts.exclude) continue;
          if (U.dist(x, y, e.x, e.y) <= r + e.r) this.damageEnemy(e, dmg, { source: opts.source || 'explosion', weapon: opts.weapon, noRevive: opts.noRevive });
        }
        G.World.damageProps(x, y, r, dmg);
      } else {
        const P = G.World.player;
        if (P && !P.dead && U.dist(x, y, P.x, P.y) <= r + P.r) {
          this.damagePlayer(dmg, { source: opts.source || 'enemy', attacker: opts.attacker });
        }
        if (opts.hitsEnemies) {
          for (const e of G.World.enemies) {
            if (e.dead || e === opts.exclude || e.isBoss) continue;
            if (U.dist(x, y, e.x, e.y) <= r + e.r) this.damageEnemy(e, dmg, { source: 'hazard', quiet: false });
          }
        }
      }
    },

    // info: { source:'enemy'|'hazard'|'boss'|..., attacker, tick (continuous; no i-frames/hooks), status }
    damagePlayer(amount, info = {}) {
      const P = G.World.player;
      if (!P || P.dead || !(amount > 0)) return 0;
      if (G.Debug && G.Debug.god) return 0;
      const tick = !!info.tick;
      if (!tick && P.isInvulnerable()) return 0;

      let m = P.stats.takenMult * Hooks.relicMult('takenMult', { info, player: P });
      if (info.source === 'hazard') m *= P.stats.hazardMult;
      if (info.attacker && info.attacker.elite) m *= P.stats.eliteTakenMult;
      // Hard mode doubles all damage the player takes (Moirai's delayed damage was already scaled).
      if (info.source !== 'fate') m *= G.Run.hardMult();
      amount *= m;

      const ctx = { amount, info, player: P };
      if (!tick) {
        // Golden Ward treasure: blocks one hit.
        if (P.buffActive('ward')) {
          P.buffs = P.buffs.filter(b => b.id !== 'ward');
          P.hurtT = 0.5;
          G.FX.text(P.x, P.y - 12, 'WARDED', '#f0e090');
          G.FX.ringFx(P.x, P.y, 12, '#f0e090');
          return 0;
        }
        for (const r of Hooks.relics()) {
          if (r.def.onBeforeHit && r.def.onBeforeHit(ctx, r.state, r) === true) {
            P.hurtT = 0.5;
            G.FX.text(P.x, P.y - 12, 'BLOCKED', '#80d0ff');
            G.FX.ringFx(P.x, P.y, 12, '#80d0ff');
            return 0;
          }
        }
      }
      // The hit got through: it spoils this room's / level's flawless bonus.
      G.World.roomHit = true;
      if (G.Run.active) G.Run.levelHit = true;
      if (P.hp - amount <= 0) {
        for (const r of Hooks.relics()) {
          if (r.def.onLethal && r.def.onLethal(ctx, r.state, r) === true) {
            if (!tick) P.hurtT = Math.max(P.hurtT, 1.0);
            return 0;
          }
        }
      }
      P.hp -= amount;
      if (G.Run.active) G.Run.stats.damageTaken += amount;
      if (tick && info.show) G.FX.text(P.x, P.y - 12, '-' + Math.max(1, Math.round(amount)), '#ff8080');
      if (!tick) {
        P.hurtT = 0.6;
        G.Audio.play('hurt');
        G.Cam.shake(3, 0.2);
        G.FX.flash('#ff0000', 0.12);
        G.FX.text(P.x, P.y - 12, '-' + Math.max(1, Math.round(amount)), '#ff5050');
        Hooks.relic('onPlayerHit', ctx);
        Hooks.allWeapons('onPlayerHit', ctx);
      }
      if (P.hp <= 0) { P.hp = 0; P.die(); }
      return amount;
    },

    heal(amount, silent) {
      const P = G.World.player;
      if (!P || P.dead || !(amount > 0)) return 0;
      amount *= P.stats.healMult;
      const before = P.hp;
      P.hp = Math.min(P.maxHp, P.hp + amount);
      const gained = P.hp - before;
      if (gained > 0.05 && !silent) {
        G.FX.text(P.x, P.y - 12, '+' + Math.max(1, Math.round(gained)), '#60ff80');
        G.Audio.play('heal');
      }
      return gained;
    },

    // Health cost that can never reduce the player below 1 HP (Blood Magic).
    selfDamage(amount) {
      const P = G.World.player;
      if (!P || P.dead) return;
      P.hp = Math.max(Math.min(1, P.hp), P.hp - amount);
    },
  };

  G.Combat = Combat;
})();
