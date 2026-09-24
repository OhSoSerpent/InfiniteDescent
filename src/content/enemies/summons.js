// Minions summoned by bosses.
(function () {
  'use strict';
  const E = G.Enemies;

  E.add({
    id: 'fly', name: 'Fly', hp: 6, speed: 85, dmg: 6, r: 3, brain: 'chaser', flying: true, elite: false,
    brainOpts: { wobble: 0.9 },
    art: { type: 'fly', body: '#303020', eye: '#ff3030' }, gold: [0, 0, 0], bloodColor: '#404020',
  });
  E.add({
    id: 'burning_spirit', name: 'Burning Spirit', hp: 20, speed: 55, dmg: 12, r: 4, brain: 'chaser', flying: true, elite: false,
    onHitStatus: { id: 'burn', dur: 2.5, power: 5 },
    art: { type: 'spirit', s: 0.9, body: '#ff7020', glow: '#ffff80' }, gold: [0, 0, 0], bloodColor: '#ff9030',
  });
  E.add({
    id: 'storm_wisp', name: 'Storm Wisp', hp: 14, speed: 70, dmg: 8, r: 4, brain: 'swooper', flying: true, elite: false,
    brainOpts: { orbit: 55, dive: 3.8, diveTime: 0.4 },
    art: { type: 'spirit', s: 0.8, body: '#c0d0ff', glow: '#ffffff' }, gold: [0, 0, 0], bloodColor: '#c0d0ff',
  });
})();
