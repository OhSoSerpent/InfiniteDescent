// Level 9 - Treachery: traitorous spirits. They sometimes turn on each other
// (see the 'traitors' hazard) and some disguise themselves as allies.
(function () {
  'use strict';
  const E = G.Enemies;

  E.add({
    id: 'traitor_shade', name: 'Traitor Shade', hp: 44, speed: 58, dmg: 13, r: 5, brain: 'chaser',
    brainOpts: { lunge: { range: 55, mult: 3.4, time: 0.24, wind: 0.35, cd: 1.9 } },
    art: { type: 'spirit', body: '#8aa8c8', glow: '#ff4040', weapon: 'daggers' }, bloodColor: '#a0c0e0',
  });
  E.add({
    id: 'frost_wraith', name: 'Frost Wraith', hp: 36, speed: 40, dmg: 11, r: 5, brain: 'shooter', flying: true,
    brainOpts: {
      range: [80, 160], cd: 2.4, wind: 0.4,
      onFire(e, tgt) {
        const a = e.angleTo(tgt);
        for (const off of [-0.2, 0, 0.2]) {
          const p = e.shoot(a + off, { speed: 140, kind: 'ice', r: 3, dmg: e.dmg * 0.8, status: { id: 'slide', dur: 0.7 } });
          // Hits shove the player into an uncontrolled slide.
          p.onHitPlayer = (proj, P) => { const n = G.U.norm(proj.vx, proj.vy); P.vx = n.x * 150; P.vy = n.y * 150; };
        }
      },
    },
    art: { type: 'spirit', body: '#a0d8f0', glow: '#ffffff', head: 'crown' }, bloodColor: '#a0e0ff',
  });
  E.add({
    id: 'false_ally', name: 'False Ally', hp: 40, speed: 60, dmg: 14, r: 5, brain: 'falseally',
    art: { type: 'spirit', body: '#5a7aa0', glow: '#ff3030', weapon: 'dagger' }, bloodColor: '#a0c0e0',
  });
  E.add({
    id: 'ice_warden', name: 'Ice Warden', hp: 100, speed: 30, dmg: 17, r: 8, brain: 'tank', kbResist: 0.5,
    brainOpts: { slamR: 34, slamRange: 42, wind: 0.8, cd: 2.5, slamRing: 8, ringKind: 'ice', ringStatus: { id: 'slow', dur: 1.5, power: 0.4 }, slamColor: '#a0e0ff' },
    art: { type: 'humanoid', s: 1.4, body: '#4a6a8a', skin: '#b0d0e0', head: 'helmet', headCol: '#a0c8e0', weapon: 'bigsword' },
    gold: [0.7, 1, 3], bloodColor: '#a0e0ff',
  });
})();
