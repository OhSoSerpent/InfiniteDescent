// Level 2 - Limbo: strange, twisted versions of the animals from Earth.
(function () {
  'use strict';
  const E = G.Enemies;

  E.add({
    id: 'hollow_wolf', name: 'Hollow Wolf', hp: 26, speed: 78, dmg: 11, r: 5, brain: 'chaser',
    brainOpts: { lunge: { range: 60, mult: 3.4, time: 0.22, wind: 0.3, cd: 2 } },
    art: { type: 'quadruped', body: '#9a98a8', belly: '#c0c0d0', glow: '#80f0ff', spikes: '#50506a' },
    splitInto: { id: 'wisp_pup', n: 2 }, bloodColor: '#8090c0',
  });
  E.add({
    id: 'wisp_pup', name: 'Wisp Pup', hp: 8, speed: 95, dmg: 6, r: 3, brain: 'chaser', elite: false,
    art: { type: 'quadruped', s: 0.7, body: '#b0b0c8', glow: '#80f0ff' }, gold: [0.1, 1, 1], bloodColor: '#8090c0',
  });
  E.add({
    id: 'twin_boar', name: 'Two-Headed Boar', hp: 44, speed: 44, dmg: 13, r: 6, brain: 'charger',
    brainOpts: { range: 160, wind: 0.5, chargeMult: 5.2, chargeTime: 0.45, recover: 0.35, cd: 0.4 },
    art: { type: 'quadruped', heads: 2, body: '#5a4a5a', belly: '#7a6a7a', glow: '#ff4040', tusks: '#e0e0d0' },
    bloodColor: '#6a3060',
  });
  E.add({
    id: 'wretched_bear', name: 'Wretched Bear', hp: 95, speed: 30, dmg: 16, r: 8, brain: 'tank', kbResist: 0.5,
    brainOpts: { slamR: 32, slamRange: 40, wind: 0.8, cd: 2.6, slamRing: 8, ringKind: 'ball', ringColor: '#d8d0c0' },
    art: { type: 'quadruped', s: 1.4, body: '#3a3440', belly: '#5a5060', spikes: '#d8d0c0', glow: '#ff3030' },
    gold: [0.7, 1, 3], bloodColor: '#6a3060',
  });
  E.add({
    id: 'eyeless_hawk', name: 'Eyeless Hawk', hp: 18, speed: 66, dmg: 9, r: 4, brain: 'swooper', flying: true,
    brainOpts: { orbit: 60, dive: 4.2, diveTime: 0.4 },
    art: { type: 'bird', body: '#4a4050', wing: '#2a2030', glow: '#ff3030', extraEyes: true }, bloodColor: '#6a3060',
  });
  E.add({
    id: 'shade_serpent', name: 'Shade Serpent', hp: 22, speed: 36, dmg: 8, r: 4, brain: 'shooter',
    brainOpts: { range: [70, 150], cd: 2.4, wind: 0.4, pattern: 'spread', count: 3, arc: 0.5, projColor: '#b080ff', projSpeed: 110 },
    art: { type: 'snake', body: '#4a4060', belly: '#8070a0', glow: '#c080ff' }, bloodColor: '#6a3060',
  });
})();
