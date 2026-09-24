// Level 7 - Violence: soldiers, monsters and violent spirits.
(function () {
  'use strict';
  const E = G.Enemies;

  E.add({
    id: 'soldier', name: 'Archer', hp: 34, speed: 40, dmg: 10, r: 5, brain: 'shooter',
    brainOpts: { range: [90, 170], cd: 2.4, wind: 0.45, pattern: 'burst', count: 3, burstGap: 0.14, projKind: 'arrow', projR: 2, projSpeed: 190 },
    art: { type: 'humanoid', body: '#6a5a40', skin: '#d0a070', head: 'helmet', headCol: '#808890', weapon: 'bow' },
  });
  E.add({
    id: 'legionary', name: 'Legionary', hp: 48, speed: 46, dmg: 13, r: 6, brain: 'chaser',
    brainOpts: { lunge: { range: 60, mult: 3.4, time: 0.25, wind: 0.4, cd: 2 } },
    art: { type: 'humanoid', body: '#8a2020', skin: '#d0a070', head: 'helmet', headCol: '#b0a060', plume: '#c02020', weapon: 'spear', shield: true, shieldCol: '#a03020' },
  });
  E.add({
    id: 'war_beast', name: 'War Beast', hp: 90, speed: 44, dmg: 16, r: 8, brain: 'charger', kbResist: 0.4,
    brainOpts: { range: 180, wind: 0.6, chargeMult: 5.5, chargeTime: 0.6, recover: 0.9, cd: 1.5 },
    art: { type: 'quadruped', s: 1.5, body: '#5a3a3a', belly: '#7a5050', horns: '#e0d0b0', glow: '#ff4020', spikes: '#3a2020' },
    gold: [0.7, 1, 3],
  });
  E.add({
    id: 'violent_spirit', name: 'Violent Spirit', hp: 26, speed: 64, dmg: 11, r: 5, brain: 'swooper', flying: true,
    brainOpts: { orbit: 65, dive: 4, diveTime: 0.45 },
    art: { type: 'spirit', body: '#d04040', glow: '#ffff80', weapon: 'sword' }, bloodColor: '#ff5050',
  });
})();
