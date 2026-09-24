// Level 4 boss: Croesus. Quick despite a massive golden sword; rains gold from the
// ceiling, sends golden copies that strike once and vanish, and can steal one of the
// player's abilities until he has taken enough damage. Grows more aggressive as he
// weakens; in phase 2 the arena keeps filling with gold.
(function () {
  'use strict';
  const U = G.U;
  const A = G.Attacks;
  const ABILITIES = ['dash', 'swap', 'reload'];

  A.add({
    id: 'croesus.swordCombo',
    *run(b, K) {
      b.moveMode = 'chase'; b.moveMult = 1.4;
      const start = G.World.time;
      yield () => K.dist(b) < 60 || G.World.time - start > 1.2;
      b.moveMode = 'stand';
      const n = b.phase === 2 ? 3 : 2;
      for (let i = 0; i < n; i++) {
        const a = K.face(b);
        K.teleArc(b.x, b.y, 60, a, 1.3, 0.32, '#f0c040');
        yield 0.32;
        K.melee(b, a, 60, 1.3, 17, { knock: 170, color: '#ffe080' });
        yield 0.18;
      }
    },
  });

  A.add({
    id: 'croesus.goldRain',
    *run(b, K) {
      b.moveMode = 'keep';
      const n = b.phase === 2 ? 10 : 7;
      for (let i = 0; i < n; i++) {
        const P = K.P();
        const pt = i === 0 ? { x: P.x, y: P.y } : K.pointNear(P.x, P.y, 10, 80);
        K.bomb(pt.x, pt.y, 16, 1.1, 15, { color: '#f0c040', fx: '#ffe080', attacker: b });
        yield 0.12;
      }
      yield 0.8;
    },
  });

  // Used by the golden copies: one lunging strike, then they vanish.
  A.add({
    id: 'croesus.copyStrike',
    *run(b, K) {
      b.moveMode = 'stand';
      const a = K.face(b);
      K.teleLine(b.x, b.y, b.x + Math.cos(a) * 130, b.y + Math.sin(a) * 130, 14, 0.7, '#f0c040');
      yield 0.7;
      yield* K.charge(b, a, 300, 0.45, { dmg: 14, knock: 150 });
      if (b.isClone) b.vanish();
    },
  });

  A.add({
    id: 'croesus.goldenCopies', noClone: true,
    *run(b, K) {
      b.moveMode = 'stand';
      K.teleCircle(b.x, b.y, b.r + 12, 0.5, '#f0c040');
      yield 0.5;
      const P = K.P();
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * U.TAU + Math.random();
        K.spawnClone(b, {
          x: P.x + Math.cos(a) * 90, y: P.y + Math.sin(a) * 90, hp: 30, life: 4, alpha: 0.8, restT: 0.2 + i * 0.25,
          attacks: ['croesus.copyStrike'],
          init: c => { c.data.artOverride = { body: '#f0c040', skin: '#f0d060', cape: '#c09020' }; },
        });
      }
      yield 0.6;
    },
  });

  // A grasping golden hand: if it touches the player, one ability is stolen.
  A.add({
    id: 'croesus.steal', cond: b => !b.data.stolen,
    *run(b, K) {
      b.moveMode = 'stand';
      K.teleCircle(b.x, b.y, b.r + 8, 0.5, '#f0c040');
      yield 0.5;
      const p = K.shoot(b, K.aim(b), { speed: 150, kind: 'coin', r: 5, dmg: 8, homing: 1.2, life: 3.5 });
      p.onHitPlayer = (proj, P) => {
        if (b.dead || b.data.stolen) return;
        const opts = ABILITIES.filter(a => !P.stolen[a]);
        if (!opts.length) return;
        const what = G.rng.pick(opts);
        P.stolen[what] = true;
        b.data.stolen = what;
        b.data.stealHp = b.hp - b.maxHp * 0.1;
        G.FX.text(P.x, P.y - 18, what.toUpperCase() + ' STOLEN!', '#f0c040');
      };
      yield 0.4;
    },
  });

  G.Bosses.add({
    id: 'croesus', name: 'Croesus', title: 'Richest of Kings', short: 'Croesus', level: 4,
    hp: 2200, r: 9, speed: 80, dmg: 15, move: 'chase', rest: [0.6, 1.2], phase2At: 0.5,
    phase2Text: 'the treasury overflows',
    art: { type: 'humanoid', s: 1.6, body: '#7a2070', trim: '#f0c040', skin: '#d8a878', hair: '#2a1a10', beard: '#2a1a10', head: 'crown', weapon: 'goldsword', wcol: { metal: '#f0c040', accent: '#fff0a0' }, cape: '#f0c040' },
    attacks: {
      1: [['croesus.swordCombo', 3], ['croesus.goldRain', 2], ['croesus.goldenCopies', 1.5], ['croesus.steal', 1.5]],
      2: [['croesus.swordCombo', 3], ['croesus.goldRain', 2], ['croesus.goldenCopies', 2], ['croesus.steal', 1.5]],
    },
    // Increasingly aggressive as his health drops.
    // (Stolen abilities are returned by the Boss base class once enough damage is dealt.)
    restScale(b) { return 0.45 + 0.55 * b.hpFrac; },
    update(b, dt) {
      if (b.phase !== 2 || b.isClone) return;
      b.data.fillT = (b.data.fillT || 1) - dt;
      if (b.data.fillT <= 0) {
        b.data.fillT = 1.1;
        const P = G.World.player;
        const pt = G.rng.chance(0.5) && P ? G.BossKit.pointNear(P.x, P.y, 20, 100) : G.BossKit.randPoint(32);
        G.World.addZone(new G.Zone('gold', { x: pt.x, y: pt.y, r: 22, arm: 0.9, life: 8, data: { dps: 10 } }));
      }
    },
    trophy: { icon: 'coin', color: '#f0c040' },
  });
})();
