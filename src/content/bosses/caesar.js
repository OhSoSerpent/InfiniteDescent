// Level 2 boss: Julius Caesar. Constantly rushes the player, stabs and sweeps with
// his spear, hurls spears across the arena, and twice per fight summons a fragile
// double that fights exactly like him (it fades if Caesar takes enough damage or after a while).
(function () {
  'use strict';
  const A = G.Attacks;

  A.add({
    id: 'caesar.rush',
    *run(b, K) {
      const a = K.face(b);
      K.teleLine(b.x, b.y, b.x + Math.cos(a) * 110, b.y + Math.sin(a) * 110, b.r * 2, 0.35, '#ff5040');
      yield 0.35;
      yield* K.charge(b, a, 280, 0.45, { dmg: 14, knock: 160 });
    },
  });

  A.add({
    id: 'caesar.stab',
    *run(b, K) {
      b.moveMode = 'chase'; b.moveMult = 1.4;
      const start = G.World.time;
      yield () => K.dist(b) < 55 || G.World.time - start > 1.2;
      b.moveMode = 'stand';
      for (let i = 0; i < 3; i++) {
        const a = K.face(b);
        const ex = b.x + Math.cos(a) * 56, ey = b.y + Math.sin(a) * 56;
        K.teleLine(b.x, b.y, ex, ey, 10, 0.28, '#ff5040');
        yield 0.28;
        G.FX.tracer([{ x: b.x, y: b.y }, { x: ex, y: ey }], '#ffffff', 0.1);
        K.sfx('swing');
        K.hitLine(b.x, b.y, ex, ey, 10, 14, { knock: 120 }, b);
        yield 0.12;
      }
    },
  });

  A.add({
    id: 'caesar.sweep',
    *run(b, K) {
      b.moveMode = 'chase'; b.moveMult = 1.4;
      const start = G.World.time;
      yield () => K.dist(b) < 60 || G.World.time - start > 1.2;
      b.moveMode = 'stand';
      const a = K.face(b);
      K.teleArc(b.x, b.y, 62, a, 1.4, 0.4, '#ff5040');
      yield 0.4;
      K.melee(b, a, 62, 1.4, 16, { knock: 180 });
      yield 0.2;
    },
  });

  A.add({
    id: 'caesar.spearThrow',
    *run(b, K) {
      b.moveMode = 'stand';
      const a = K.face(b);
      K.teleLine(b.x, b.y, b.x + Math.cos(a) * 400, b.y + Math.sin(a) * 400, 6, 0.5, '#ff5040');
      yield 0.5;
      K.shoot(b, a, { speed: 340, r: 3, kind: 'spear', dmg: 18, life: 2.5, wallMode: 'stick' });
      K.sfx('heavy');
      yield 0.25;
    },
  });

  A.add({
    id: 'caesar.summonDouble', maxUses: 2, noClone: true,
    *run(b, K) {
      b.moveMode = 'stand';
      K.teleCircle(b.x, b.y, b.r + 12, 0.7, '#c0c0ff');
      yield 0.7;
      const c = K.spawnClone(b, {
        hp: 70, life: 15, alpha: 0.75,
        attacks: [['caesar.rush', 1], ['caesar.stab', 2], ['caesar.sweep', 2], ['caesar.spearThrow', 1]],
      });
      b.data.double = c;
      b.data.doubleDmg = 0;
      G.FX.text(b.x, b.y - b.r - 16, 'ET TU?', '#c0c0ff');
    },
  });

  G.Bosses.add({
    id: 'caesar', name: 'Julius Caesar', title: 'Dictator Perpetuo', short: 'Caesar', level: 2,
    hp: 1200, r: 8, speed: 88, dmg: 14, move: 'chase', rest: [0.3, 0.7],
    art: { type: 'humanoid', s: 1.5, body: '#e8e0d0', trim: '#a02020', skin: '#d8a878', hair: '#3a2a1a', head: 'laurel', weapon: 'spear', cape: '#6a1a6a' },
    attacks: { 1: [['caesar.rush', 2], ['caesar.stab', 3], ['caesar.sweep', 3], ['caesar.spearThrow', 2]] },
    thresholds: [{ at: 0.66, attack: 'caesar.summonDouble' }, { at: 0.33, attack: 'caesar.summonDouble' }],
    // The double fades once Caesar himself takes enough damage.
    onDamaged(b, amount) {
      const c = b.data.double;
      if (!c || c.dead) return;
      b.data.doubleDmg += amount;
      if (b.data.doubleDmg >= b.maxHp * 0.08) c.vanish();
    },
    trophy: { icon: 'laurel', color: '#5aa040' },
  });
})();
