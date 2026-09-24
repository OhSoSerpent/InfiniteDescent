// Level 1 - Earth: wild animals.
(function () {
  'use strict';
  const E = G.Enemies;

  E.add({
    id: 'wolf', name: 'Wolf', hp: 22, speed: 70, dmg: 10, r: 5, brain: 'chaser',
    brainOpts: { lunge: { range: 55, mult: 3.2, time: 0.22, wind: 0.35, cd: 2.2 } },
    art: { type: 'quadruped', body: '#7a7470', belly: '#a8a098', eye: '#e0c040' },
  });
  E.add({
    id: 'boar', name: 'Boar', hp: 36, speed: 42, dmg: 12, r: 6, brain: 'charger',
    brainOpts: { range: 150, wind: 0.6, chargeMult: 5, chargeTime: 0.5, recover: 0.8, cd: 1.4 },
    art: { type: 'quadruped', body: '#6a4a30', belly: '#8a6a50', tusks: '#f0f0e0', mane: '#4a3020' },
  });
  E.add({
    id: 'bear', name: 'Bear', hp: 80, speed: 32, dmg: 16, r: 8, brain: 'tank', kbResist: 0.5,
    brainOpts: { slamR: 30, slamRange: 38, wind: 0.8, cd: 2.4 },
    art: { type: 'quadruped', s: 1.4, body: '#4a3020', belly: '#6a4a30' },
    gold: [0.7, 1, 3],
  });
  E.add({
    id: 'hawk', name: 'Hawk', hp: 16, speed: 60, dmg: 8, r: 4, brain: 'swooper', flying: true,
    brainOpts: { orbit: 70, dive: 3.6, diveTime: 0.45 },
    art: { type: 'bird', body: '#7a5a3a', wing: '#5a3a20' },
  });
  E.add({
    id: 'viper', name: 'Viper', hp: 18, speed: 36, dmg: 8, r: 4, brain: 'shooter',
    brainOpts: { range: [60, 140], cd: 2.2, wind: 0.35, projKind: 'poison', projColor: '#60c030', projSpeed: 120, status: { id: 'poison', dur: 3, power: 3 } },
    art: { type: 'snake', body: '#5a8a3a', belly: '#9ac060' },
  });
})();
