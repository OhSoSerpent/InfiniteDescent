// Level 5 - Wrath: enraged spirits that attack recklessly. Their hits can enrage the
// player (stronger attacks, but sluggish, drifting movement).
(function () {
  'use strict';
  const E = G.Enemies;
  const RAGE = { id: 'rage', dur: 4 };

  E.add({
    id: 'berserker_shade', name: 'Berserker Shade', hp: 48, speed: 52, dmg: 14, r: 6, brain: 'charger', onHitStatus: RAGE,
    brainOpts: { range: 170, wind: 0.45, chargeMult: 5.2, chargeTime: 0.55, recover: 0.5, cd: 0.9 },
    art: { type: 'spirit', body: '#c03030', glow: '#ffe060', head: 'horns', weapon: 'club' }, bloodColor: '#ff3020',
  });
  E.add({
    id: 'fury', name: 'Fury', hp: 20, speed: 92, dmg: 9, r: 4, brain: 'chaser', flying: true, onHitStatus: RAGE,
    brainOpts: { wobble: 0.7 },
    art: { type: 'spirit', s: 0.8, body: '#ff5030', glow: '#ffffff' }, bloodColor: '#ff3020',
  });
  E.add({
    id: 'wrath_brute', name: 'Wrath Brute', hp: 115, speed: 34, dmg: 17, r: 8, brain: 'tank', kbResist: 0.5, onHitStatus: RAGE,
    brainOpts: { slamR: 34, slamRange: 42, wind: 0.7, cd: 2.2, slamColor: '#ff4020' },
    art: { type: 'humanoid', s: 1.5, body: '#7a2020', skin: '#c05040', hair: '#200000', head: 'horns', headCol: '#302020', weapon: 'club' },
    gold: [0.7, 1, 3], bloodColor: '#ff3020',
  });
  E.add({
    id: 'ember_caster', name: 'Ember Caster', hp: 30, speed: 40, dmg: 10, r: 5, brain: 'shooter',
    brainOpts: { range: [80, 150], cd: 2, wind: 0.35, pattern: 'spread', count: 3, arc: 0.4, projKind: 'fire', projSpeed: 125, status: { id: 'burn', dur: 2.5, power: 5 } },
    art: { type: 'spirit', body: '#a03020', glow: '#ffa030', head: 'horns' }, bloodColor: '#ff3020',
  });
})();
