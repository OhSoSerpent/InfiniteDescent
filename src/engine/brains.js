// Reusable enemy AI "brains". An enemy definition picks one by id and tunes it via brainOpts.
(function () {
  'use strict';
  const U = G.U, D = G.Draw;
  const B = G.Brains;

  function wander(e, dt) {
    e.bs.wt = (e.bs.wt || 0) - dt;
    if (e.bs.wt <= 0) { e.bs.wt = 1 + Math.random() * 2; e.bs.wa = Math.random() * U.TAU; e.bs.wm = Math.random() < 0.5; }
    if (e.bs.wm) {
      const sp = e.speedNow() * 0.3 * dt;
      e.move(Math.cos(e.bs.wa) * sp, Math.sin(e.bs.wa) * sp);
      e.facing = Math.cos(e.bs.wa) >= 0 ? 1 : -1;
    }
  }
  function warnMark(e) {
    if (e.bs.warn > 0) D.text('!', e.x, e.y - e.r - 16, '#ff4040', { align: 'center' });
  }
  // Fire a projectile pattern at a target.
  function firePattern(e, tgt, o) {
    const a = e.angleTo(tgt);
    const proj = {
      speed: o.projSpeed || 120, kind: o.projKind || 'ball', color: o.projColor || '#ff5050', r: o.projR || 3,
      dmg: e.dmg * (o.dmgMult || 0.8), status: o.status || null, life: o.projLife || 3,
    };
    const n = o.count || 1;
    switch (o.pattern || 'aimed') {
      case 'spread':
        for (let i = 0; i < n; i++) e.shoot(a + (n > 1 ? (i / (n - 1) - 0.5) * (o.arc || 0.6) : 0), proj);
        break;
      case 'ring':
        for (let i = 0; i < n; i++) e.shoot(a + (i / n) * U.TAU, proj);
        break;
      case 'burst':
        e.bs.burstLeft = n; e.bs.burstT = 0; e.bs.burstProj = proj;
        break;
      default:
        e.shoot(a + (Math.random() - 0.5) * (o.inaccuracy || 0), proj);
    }
  }
  function updateBurst(e, dt, tgt) {
    if (!e.bs.burstLeft) return;
    e.bs.burstT -= dt;
    if (e.bs.burstT <= 0) {
      e.bs.burstT = e.opts.burstGap || 0.12;
      e.bs.burstLeft--;
      e.shoot(e.angleTo(tgt) + (Math.random() - 0.5) * 0.1, e.bs.burstProj);
    }
  }

  // ---------------------------------------------------------------- chaser
  // opts: speedMult, lunge:{ range, mult, time, wind }, wobble
  B.add({
    id: 'chaser',
    idle: wander,
    update(e, dt) {
      const tgt = e.target();
      if (!tgt || tgt.dead) return;
      const o = e.opts, bs = e.bs;
      if (bs.lungeT > 0) {
        bs.lungeT -= dt;
        const sp = e.speedNow() * o.lunge.mult * dt;
        e.move(Math.cos(bs.la) * sp, Math.sin(bs.la) * sp);
        return;
      }
      if (bs.warn > 0) {
        bs.warn -= dt;
        if (bs.warn <= 0) { bs.lungeT = o.lunge.time || 0.25; }
        return;
      }
      bs.lcd = (bs.lcd || 0) - dt;
      if (o.lunge && bs.lcd <= 0 && e.distTo(tgt) < o.lunge.range && e.los(tgt)) {
        bs.lcd = o.lunge.cd || 2;
        bs.warn = o.lunge.wind || 0.35;
        bs.la = e.angleTo(tgt);
        e.facing = Math.cos(bs.la) >= 0 ? 1 : -1;
        return;
      }
      if (o.wobble) {
        const a = e.angleTo(tgt) + Math.sin(e.t * 5) * o.wobble;
        const sp = e.speedNow() * (o.speedMult || 1) * dt;
        e.facing = Math.cos(a) >= 0 ? 1 : -1;
        e.vx = Math.cos(a); e.vy = Math.sin(a);
        e.move(Math.cos(a) * sp, Math.sin(a) * sp);
      } else {
        e.moveToward(tgt.x, tgt.y, o.speedMult || 1, dt);
      }
    },
    draw(e, ctx) { e.drawBody(ctx); warnMark(e); },
  });

  // ---------------------------------------------------------------- charger
  // opts: range, wind, chargeMult, chargeTime, recover, cd
  B.add({
    id: 'charger',
    idle: wander,
    init(e) { e.bs.state = 'approach'; e.bs.t = 0.5 + Math.random(); },
    update(e, dt) {
      const tgt = e.target();
      if (!tgt || tgt.dead) return;
      const o = e.opts, bs = e.bs;
      bs.t -= dt;
      switch (bs.state) {
        case 'approach':
          e.moveToward(tgt.x, tgt.y, o.speedMult || 1, dt);
          if (bs.t <= 0 && e.distTo(tgt) < (o.range || 130) && e.los(tgt)) {
            bs.state = 'wind'; bs.t = o.wind || 0.6; bs.a = e.angleTo(tgt); bs.warn = bs.t;
            const len = (o.chargeMult || 4.5) * e.speed * (o.chargeTime || 0.5);
            G.FX.telegraph({ shape: 'line', x: e.x, y: e.y, x2: e.x + Math.cos(bs.a) * len, y2: e.y + Math.sin(bs.a) * len, w: e.r * 2, dur: bs.t, color: '#ff4040' });
            e.facing = Math.cos(bs.a) >= 0 ? 1 : -1;
          }
          break;
        case 'wind':
          bs.warn = bs.t;
          if (bs.t <= 0) { bs.state = 'charge'; bs.t = o.chargeTime || 0.5; }
          break;
        case 'charge': {
          const sp = e.speed * (o.chargeMult || 4.5) * e.status.speedMult() * dt;
          e.vx = Math.cos(bs.a); e.vy = Math.sin(bs.a);
          const hit = e.move(Math.cos(bs.a) * sp, Math.sin(bs.a) * sp);
          if (Math.random() < 0.5) G.FX.particle(e.x, e.y + e.r, 0, 0, 0.3, '#a09080');
          if (hit.hitX || hit.hitY || bs.t <= 0) { bs.state = 'recover'; bs.t = o.recover || 0.7; if (hit.hitX || hit.hitY) G.Cam.shake(1.5, 0.1); }
          break;
        }
        case 'recover':
          if (bs.t <= 0) { bs.state = 'approach'; bs.t = o.cd || 1.2; }
          break;
      }
    },
    draw(e, ctx) { e.drawBody(ctx); warnMark(e); },
  });

  // ---------------------------------------------------------------- shooter
  // opts: range:[min,max], cd, wind, pattern, count, arc, projSpeed, projKind, projColor, projR,
  //       status, dmgMult, burstGap, onFire(e, tgt), speedMult
  B.add({
    id: 'shooter',
    idle: wander,
    init(e) { e.bs.cd = 0.6 + Math.random() * (e.opts.cd || 2); e.bs.sdir = Math.random() < 0.5 ? -1 : 1; e.bs.st = 1.5; },
    update(e, dt) {
      const tgt = e.target();
      if (!tgt || tgt.dead) return;
      const o = e.opts, bs = e.bs;
      const [mn, mx] = o.range || [70, 150];
      const d = e.distTo(tgt), los = e.los(tgt);
      updateBurst(e, dt, tgt);
      if (bs.warn > 0) {
        bs.warn -= dt;
        if (bs.warn <= 0) { if (o.onFire) o.onFire(e, tgt); else firePattern(e, tgt, o); }
        return;
      }
      const sm = o.speedMult || 1;
      if (!los || d > mx) e.moveToward(tgt.x, tgt.y, sm, dt);
      else if (d < mn) e.moveAway(tgt, 0.8 * sm, dt);
      else {
        bs.st -= dt;
        if (bs.st <= 0) { bs.st = 1 + Math.random() * 1.5; bs.sdir = -bs.sdir; }
        e.strafe(tgt, 0.45 * sm, dt, bs.sdir);
      }
      e.facing = tgt.x >= e.x ? 1 : -1;
      e.aimAngle = e.angleTo(tgt);
      bs.cd -= dt;
      if (bs.cd <= 0 && los && d < mx * 1.3) {
        bs.cd = (o.cd || 2) * (0.8 + Math.random() * 0.4);
        bs.warn = o.wind || 0.3;
      }
    },
    draw(e, ctx) { e.drawBody(ctx); warnMark(e); },
  });

  // ---------------------------------------------------------------- swooper (flying)
  // opts: orbit, dive (speed mult), diveTime
  B.add({
    id: 'swooper',
    idle: wander,
    init(e) { e.bs.state = 'circle'; e.bs.t = 1 + Math.random() * 2; e.bs.a = Math.random() * U.TAU; e.bs.dir = Math.random() < 0.5 ? 1 : -1; },
    update(e, dt) {
      const tgt = e.target();
      if (!tgt || tgt.dead) return;
      const o = e.opts, bs = e.bs;
      bs.t -= dt;
      if (bs.state === 'circle') {
        bs.a += dt * 1.6 * bs.dir;
        const r = o.orbit || 70;
        e.moveToward(tgt.x + Math.cos(bs.a) * r, tgt.y + Math.sin(bs.a) * r, 1.2, dt);
        if (bs.t <= 0) { bs.state = 'wind'; bs.t = 0.35; bs.warn = 0.35; bs.da = e.angleTo(tgt); }
      } else if (bs.state === 'wind') {
        bs.warn = bs.t;
        if (bs.t <= 0) { bs.state = 'dive'; bs.t = o.diveTime || 0.45; }
      } else if (bs.state === 'dive') {
        const sp = e.speedNow() * (o.dive || 3.5) * dt;
        e.vx = Math.cos(bs.da); e.vy = Math.sin(bs.da);
        e.facing = Math.cos(bs.da) >= 0 ? 1 : -1;
        const hit = e.move(Math.cos(bs.da) * sp, Math.sin(bs.da) * sp);
        if (bs.t <= 0 || hit.hitX || hit.hitY) { bs.state = 'circle'; bs.t = 1.5 + Math.random() * 1.5; bs.a = e.angleTo(tgt) + Math.PI; }
      }
    },
    draw(e, ctx) { e.drawBody(ctx); warnMark(e); },
  });

  // ---------------------------------------------------------------- tank (slow, telegraphed slam)
  // opts: slamRange, slamR, wind, cd, speedMult
  B.add({
    id: 'tank',
    idle: wander,
    init(e) { e.bs.cd = 1.5; },
    update(e, dt) {
      const tgt = e.target();
      if (!tgt || tgt.dead) return;
      const o = e.opts, bs = e.bs;
      bs.cd -= dt;
      if (bs.warn > 0) {
        bs.warn -= dt;
        if (bs.warn <= 0) {
          G.Combat.explosion(e.x, e.y, o.slamR || 30, e.dmg * 1.4, { team: 'enemy', attacker: e, color: e.opts.slamColor || '#c0a080', hitsEnemies: e.turncoat > 0, exclude: e });
          G.Audio.play('slam');
          bs.cd = o.cd || 2.5;
          if (o.slamRing) {
            for (let i = 0; i < o.slamRing; i++) {
              e.shoot((i / o.slamRing) * U.TAU + e.t, { speed: 110, kind: o.ringKind || 'ball', color: o.ringColor || '#d0c0a0', r: 2, dmg: e.dmg * 0.6, status: o.ringStatus || null });
            }
          }
        }
        return;
      }
      if (bs.cd <= 0 && e.distTo(tgt) < (o.slamRange || 40)) {
        bs.warn = o.wind || 0.8;
        G.FX.telegraph({ shape: 'circle', x: e.x, y: e.y, r: o.slamR || 30, dur: bs.warn, color: '#ff4040' });
        return;
      }
      e.moveToward(tgt.x, tgt.y, o.speedMult || 1, dt);
    },
    draw(e, ctx) { e.drawBody(ctx); warnMark(e); },
  });

  // ---------------------------------------------------------------- mimic (disguised as an object)
  // def.disguise: obstacle painter name; opts: revealRange, speedMult
  B.add({
    id: 'mimic',
    init(e) { e.disguised = true; },
    idle() {},
    update(e, dt) {
      const P = G.World.player;
      const bs = e.bs;
      if (e.disguised) {
        // If only disguised enemies are left, they give themselves away after a while
        // so a room can never stall with nothing visible to fight.
        const othersAwake = G.World.enemies.some(o => o !== e && !o.dead && !o.disguised && !o.noCredit);
        bs.lonely = othersAwake ? 0 : (bs.lonely || 0) + dt;
        if (bs.lonely > 4 || (P && e.distTo(P) < (e.opts.revealRange || 42)) || e.hp < e.maxHp) {
          e.disguised = false; bs.reveal = 0.35;
          G.FX.text(e.x, e.y - 14, '!', '#ff4040', true);
          G.FX.burst(e.x, e.y, 10, '#a08060', 50, 0.3);
        }
        return;
      }
      if (bs.reveal > 0) { bs.reveal -= dt; return; }
      const tgt = e.target();
      if (tgt && !tgt.dead) e.moveToward(tgt.x, tgt.y, e.opts.speedMult || 1.3, dt);
    },
    draw(e, ctx) {
      if (e.disguised) {
        const painter = G.Art.obstacles[e.def.disguise || 'crate'];
        painter(ctx, Math.round(e.x - 8), Math.round(e.y - 10), G.World.room.biome.palette, 0.3);
        if (e.flash > 0) D.alpha(0.6, () => D.rect(e.x - 8, e.y - 8, 16, 16, '#ffffff'));
        return;
      }
      e.drawBody(ctx);
    },
  });

  // ---------------------------------------------------------------- teleporter
  // opts: cd, pattern/count/arc/proj* like shooter
  B.add({
    id: 'teleporter',
    idle: wander,
    init(e) { e.bs.cd = 1 + Math.random() * 2; e.bs.phase = 'idle'; e.bs.alpha = 1; },
    update(e, dt) {
      const tgt = e.target();
      if (!tgt || tgt.dead) return;
      const o = e.opts, bs = e.bs;
      updateBurst(e, dt, tgt);
      e.facing = tgt.x >= e.x ? 1 : -1;
      if (bs.phase === 'idle') {
        e.strafe(tgt, 0.3, dt, 1);
        bs.cd -= dt;
        if (bs.cd <= 0) { bs.phase = 'out'; bs.t = 0.35; }
      } else if (bs.phase === 'out') {
        bs.t -= dt; bs.alpha = bs.t / 0.35;
        if (bs.t <= 0) {
          const pt = G.World.randomFloorNear(tgt.x, tgt.y, 60, 110);
          if (pt) { G.FX.burst(e.x, e.y, 8, '#a060ff', 40, 0.3); e.x = pt.x; e.y = pt.y; }
          bs.phase = 'in'; bs.t = 0.3;
        }
      } else if (bs.phase === 'in') {
        bs.t -= dt; bs.alpha = 1 - bs.t / 0.3;
        if (bs.t <= 0) { bs.phase = 'aim'; bs.t = 0.35; bs.warn = 0.35; }
      } else if (bs.phase === 'aim') {
        bs.t -= dt; bs.warn = bs.t;
        if (bs.t <= 0) { firePattern(e, tgt, o); bs.phase = 'idle'; bs.cd = (o.cd || 3) * (0.8 + Math.random() * 0.4); bs.alpha = 1; }
      }
    },
    draw(e, ctx) { D.alpha(U.clamp(e.bs.alpha, 0.1, 1), () => e.drawBody(ctx)); warnMark(e); },
  });

  // ---------------------------------------------------------------- illusion (pops when hit)
  B.add({
    id: 'illusion',
    update(e, dt) {
      const tgt = e.target();
      if (tgt && !tgt.dead) e.moveToward(tgt.x, tgt.y, e.opts.speedMult || 1, dt);
      e.bs.life = (e.bs.life === undefined ? (e.opts.life || 8) : e.bs.life) - dt;
      if (e.bs.life <= 0) { e.noCredit = true; G.Combat.kill(e, {}); }
    },
    draw(e, ctx) { D.alpha(0.55 + 0.25 * Math.sin(e.t * 12), () => e.drawBody(ctx)); },
  });

  // ---------------------------------------------------------------- false ally (Treachery)
  B.add({
    id: 'falseally',
    init(e) { e.disguised = true; e.bs.t = 4 + Math.random() * 4; },
    idle(e, dt) { B.get('falseally').update(e, dt); },
    update(e, dt) {
      const P = G.World.player;
      if (!P || P.dead) return;
      const bs = e.bs;
      if (e.disguised) {
        bs.t -= dt;
        const a = U.angle(P.x, P.y, e.x, e.y);
        const d = e.distTo(P);
        if (d > 45) e.moveToward(P.x + Math.cos(a) * 35, P.y + Math.sin(a) * 35, 0.9, dt);
        if (d < 22 || bs.t <= 0 || e.hp < e.maxHp) {
          e.disguised = false; e.aware = true; bs.burst = 0.8;
          G.FX.text(e.x, e.y - 16, 'TRAITOR!', '#ff4040');
          G.FX.burst(e.x, e.y, 12, '#40a0ff', 50, 0.4);
        }
        return;
      }
      const tgt = e.target();
      if (!tgt || tgt.dead) return;
      if (bs.burst > 0) bs.burst -= dt;
      e.moveToward(tgt.x, tgt.y, bs.burst > 0 ? 2 : 1.1, dt);
    },
    draw(e, ctx) {
      if (e.disguised) {
        G.Art.spirit(ctx, e.x, e.y, { s: 1, facing: e.facing, t: e.t, body: '#a0d0ff', glow: '#ffffff', flash: e.flash > 0 });
        D.rect(e.x - 1, e.y - 16, 3, 3, '#60ff80');
        return;
      }
      e.drawBody(ctx);
    },
  });

  // ---------------------------------------------------------------- stationary (spawners, turrets)
  B.add({ id: 'stationary', update() {} });

  G.BrainUtil = { firePattern, wander };
})();
