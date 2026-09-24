// Level 5 boss: Achilles, Wrath-Born (only if he was not the level 3 boss).
// Massive spear and shield; frontal shots are blocked and enough blocks trigger a
// counterattack. Long charges that can knock you into the blood. Sometimes throws his
// shield and fights faster but more exposed. Phase 2: flaming shield, burning trails.
(function () {
  'use strict';
  const U = G.U;
  const A = G.Attacks;

  function fireTrail(b) {
    if (b.phase === 2 && Math.random() < 0.35) {
      G.World.addZone(new G.Zone('fire', { x: b.x, y: b.y + 8, r: 12, life: 3, arm: 0.2, data: { dps: 12 } }));
    }
  }

  A.add({
    id: 'achillesW.spearCombo',
    *run(b, K) {
      b.moveMode = 'chase'; b.moveMult = 1.5;
      const start = G.World.time;
      yield () => K.dist(b) < 70 || G.World.time - start > 1.2;
      b.moveMode = 'stand';
      for (let i = 0; i < 3; i++) {
        const a = K.face(b);
        const ex = b.x + Math.cos(a) * 72, ey = b.y + Math.sin(a) * 72;
        K.teleLine(b.x, b.y, ex, ey, 10, 0.28, '#ff5020');
        yield 0.28;
        K.sfx('swing');
        G.FX.tracer([{ x: b.x, y: b.y }, { x: ex, y: ey }], '#ffffff', 0.1);
        K.hitLine(b.x, b.y, ex, ey, 10, 16, { knock: 140 }, b);
        if (b.phase === 2) G.World.addZone(new G.Zone('fire', { x: ex, y: ey, r: 14, life: 3, arm: 0.3, data: { dps: 12 } }));
        yield 0.12;
      }
    },
  });

  A.add({
    id: 'achillesW.longCharge',
    *run(b, K) {
      b.moveMode = 'stand';
      const a = K.face(b);
      K.teleLine(b.x, b.y, b.x + Math.cos(a) * 320, b.y + Math.sin(a) * 320, b.r * 2 + 4, 0.7, '#ff3020');
      yield 0.7;
      yield* K.charge(b, a, 360, 1.0, { dmg: 20, knock: 420, trail: fireTrail });
      yield 0.4;
    },
  });

  A.add({
    id: 'achillesW.counter',
    *run(b, K) {
      G.FX.text(b.x, b.y - b.r - 16, 'COUNTER', '#ffe060');
      b.moveMode = 'stand';
      const a = K.face(b);
      K.teleLine(b.x, b.y, b.x + Math.cos(a) * 90, b.y + Math.sin(a) * 90, 16, 0.3, '#ffe060');
      yield 0.3;
      yield* K.charge(b, a, 320, 0.3, { dmg: 18, knock: 260 });
      const a2 = K.face(b);
      K.melee(b, a2, 60, 1.2, 16, { knock: 200 });
      yield 0.3;
    },
  });

  A.add({
    id: 'achillesW.shieldThrow', cond: b => !b.data.shieldless,
    *run(b, K) {
      b.moveMode = 'stand';
      const a = K.face(b);
      K.teleLine(b.x, b.y, b.x + Math.cos(a) * 260, b.y + Math.sin(a) * 260, 12, 0.5, '#ff5020');
      yield 0.5;
      K.shoot(b, a, { speed: 260, kind: 'shield', r: 7, dmg: 18, color: b.phase === 2 ? '#ff6020' : '#b08030', spin: 12, life: 1.6, pierceWalls: false });
      K.sfx('heavy');
      b.data.shieldless = true;
      G.FX.text(b.x, b.y - b.r - 16, 'SHIELDLESS', '#ffe060');
      K.after(7, () => {
        if (b.dead) return;
        b.data.shieldless = false;
        b.takenMult = 1;
        b.data.artOverride = null;
        G.FX.text(b.x, b.y - b.r - 16, 'SHIELD RAISED', '#c0c0c0');
      });
      yield 0.3;
    },
  });

  G.Bosses.add({
    id: 'achilles_wrath', identity: 'achilles', name: 'Achilles, Wrath-Born', title: 'The Rage of Peleus\' Son', short: 'Achilles', level: 5,
    hp: 4000, r: 10, speed: 85, dmg: 18, move: 'chase', rest: [0.5, 1.0], phase2At: 0.5,
    phase2Text: 'his shield bursts into flame',
    art: { type: 'humanoid', s: 2, body: '#9a6020', trim: '#e0c060', skin: '#d8a070', head: 'helmet', headCol: '#c09040', plume: '#e02020', weapon: 'bigspear', shield: true, shieldCol: '#b08030', cape: '#7a1010' },
    attacks: {
      1: [['achillesW.spearCombo', 3], ['achillesW.longCharge', 2], ['achillesW.shieldThrow', 1.2]],
      2: [['achillesW.spearCombo', 3], ['achillesW.longCharge', 2.5], ['achillesW.shieldThrow', 1.2]],
    },
    // Increasingly reckless as his health falls.
    restScale(b) { return 0.5 + 0.5 * b.hpFrac; },
    // Shield: blocks bullets arriving from the front while he carries it.
    onBeforeDamage(b, amount, info) {
      if (b.data.shieldless || !info.bullet) return amount;
      const bl = info.bullet;
      const toBullet = U.angle(b.x, b.y, bl.x, bl.y);
      const facing = K_face(b);
      if (Math.abs(U.angDiff(facing, toBullet)) < 1.0) {
        b.data.blocks = (b.data.blocks || 0) + 1;
        G.FX.burst(bl.x, bl.y, 4, '#ffe080', 40, 0.15);
        if (Math.random() < 0.3) G.FX.text(b.x, b.y - b.r - 10, 'BLOCKED', '#c0c0c0');
        if (b.data.blocks >= 8 && !b.pending.includes('achillesW.counter')) { b.data.blocks = 0; b.pending.push('achillesW.counter'); }
        return 0;
      }
      return amount;
    },
    update(b, dt) {
      if (b.data.shieldless) {
        // Without the shield: faster, but easier to damage.
        b.takenMult = 1.3;
        b.moveMult = Math.max(b.moveMult, 1.3);
        b.data.artOverride = { shield: false };
      } else if (b.phase === 2) {
        b.data.artOverride = { shieldCol: '#ff6020' };
      }
      if (b.phase === 2 && Math.random() < dt * 6) G.FX.particle(b.x + b.facing * 10, b.y - 4, 0, -20, 0.4, '#ff8020');
    },
    trophy: { icon: 'shield', color: '#b08030' },
  });

  // Facing angle toward the player (shield side).
  function K_face(b) {
    const P = G.World.player;
    return P ? U.angle(b.x, b.y, P.x, P.y) : (b.facing > 0 ? 0 : Math.PI);
  }
})();
