// Level 3 - The Storm (Lust): vengeful lovers whose attacks can poison.
(function () {
  'use strict';
  const E = G.Enemies;
  const POISON = { id: 'poison', dur: 3.5, power: 3 };

  E.add({
    id: 'jilted_lover', name: 'Jilted Lover', hp: 30, speed: 58, dmg: 10, r: 5, brain: 'chaser', onHitStatus: POISON,
    brainOpts: { lunge: { range: 50, mult: 3, time: 0.25, wind: 0.35, cd: 2.2 } },
    art: { type: 'spirit', body: '#e08aa8', glow: '#ffffff', mouth: '#802040' }, bloodColor: '#c04080',
  });
  E.add({
    id: 'siren', name: 'Siren', hp: 26, speed: 40, dmg: 9, r: 5, brain: 'shooter', flying: true,
    brainOpts: { range: [80, 160], cd: 2.3, wind: 0.4, pattern: 'spread', count: 3, arc: 0.45, projKind: 'heart', projR: 3, projSpeed: 115, status: POISON },
    art: { type: 'spirit', body: '#c070d0', glow: '#ffe0ff', head: 'crown' }, bloodColor: '#c04080',
  });
  E.add({
    id: 'heartbreaker', name: 'Heartbreaker', hp: 40, speed: 46, dmg: 13, r: 6, brain: 'charger', onHitStatus: POISON,
    brainOpts: { range: 150, wind: 0.55, chargeMult: 4.8, chargeTime: 0.5, recover: 0.7, cd: 1.3 },
    art: { type: 'humanoid', body: '#a03060', skin: '#f0c0c0', hair: '#301020', head: 'long', weapon: 'dagger' }, bloodColor: '#c04080',
  });
  E.add({
    id: 'scorned_wraith', name: 'Scorned Wraith', hp: 55, speed: 34, dmg: 12, r: 7, brain: 'tank', onHitStatus: POISON,
    brainOpts: { slamR: 34, slamRange: 42, wind: 0.8, cd: 2.4, slamRing: 6, ringKind: 'heart', ringStatus: POISON, slamColor: '#e060a0' },
    art: { type: 'spirit', s: 1.4, body: '#8a3a6a', glow: '#ff80c0', head: 'horns' }, gold: [0.6, 1, 3], bloodColor: '#c04080',
  });
})();
