// Level 4 - Greed: greedy spirits wielding weapons made of gold and valuables.
(function () {
  'use strict';
  const E = G.Enemies;
  const GOLD = { metal: '#f0c040', accent: '#fff0a0', wood: '#a07020' };

  E.add({
    id: 'gilded_spirit', name: 'Gilded Spirit', hp: 40, speed: 55, dmg: 12, r: 5, brain: 'chaser',
    brainOpts: { lunge: { range: 50, mult: 3.2, time: 0.22, wind: 0.35, cd: 2 } },
    art: { type: 'spirit', body: '#e0c060', glow: '#ffffff', weapon: 'goldsword', wcol: GOLD },
    gold: [0.8, 2, 4], bloodColor: '#f0c040',
  });
  E.add({
    id: 'coin_hurler', name: 'Coin Hurler', hp: 32, speed: 40, dmg: 10, r: 5, brain: 'shooter',
    brainOpts: { range: [80, 160], cd: 2.1, wind: 0.35, pattern: 'burst', count: 4, burstGap: 0.12, projKind: 'coin', projR: 2, projSpeed: 140 },
    art: { type: 'spirit', body: '#c0a050', glow: '#ffffa0', head: 'crown' },
    gold: [0.9, 2, 5], bloodColor: '#f0c040',
  });
  E.add({
    id: 'hoarder', name: 'Hoarder', hp: 100, speed: 30, dmg: 16, r: 8, brain: 'tank', kbResist: 0.5,
    brainOpts: { slamR: 32, slamRange: 40, wind: 0.8, cd: 2.4, slamRing: 8, ringKind: 'coin', slamColor: '#f0c040' },
    art: { type: 'spirit', s: 1.5, body: '#b09040', glow: '#fff080', head: 'crown', mouth: '#402000' },
    gold: [1, 4, 7], bloodColor: '#f0c040',
  });
  E.add({
    id: 'jeweled_lancer', name: 'Jeweled Lancer', hp: 38, speed: 46, dmg: 13, r: 5, brain: 'charger',
    brainOpts: { range: 160, wind: 0.55, chargeMult: 5, chargeTime: 0.45, recover: 0.7, cd: 1.3 },
    art: { type: 'spirit', body: '#d0b060', glow: '#60ffe0', weapon: 'spear', wcol: GOLD },
    gold: [0.8, 2, 4], bloodColor: '#f0c040',
  });
})();
