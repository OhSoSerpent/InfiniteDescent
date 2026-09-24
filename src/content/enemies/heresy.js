// Level 6 - Heresy: undead heretics. `graveBound` enemies rise again after dying
// unless their grave (spawned beside them) is destroyed.
(function () {
  'use strict';
  const E = G.Enemies;
  const BURN = { id: 'burn', dur: 2.5, power: 5 };

  E.add({
    id: 'heretic_zombie', name: 'Risen Heretic', hp: 40, speed: 36, dmg: 12, r: 5, brain: 'chaser', graveBound: true,
    brainOpts: { lunge: { range: 40, mult: 2.8, time: 0.25, wind: 0.45, cd: 2.4 } },
    art: { type: 'humanoid', body: '#4a4a5a', skin: '#8aa080', hair: '#303030', eye: '#e0e040', head: 'hood', headCol: '#3a3a48' },
    bloodColor: '#607050',
  });
  E.add({
    id: 'flame_cultist', name: 'Flame Cultist', hp: 32, speed: 38, dmg: 10, r: 5, brain: 'shooter', graveBound: true,
    brainOpts: { range: [80, 150], cd: 2.2, wind: 0.4, pattern: 'aimed', projKind: 'fire', projR: 3, projSpeed: 130, status: BURN },
    art: { type: 'humanoid', body: '#7a2020', skin: '#8aa080', eye: '#ff8020', head: 'hood', headCol: '#5a1010', weapon: 'staff' },
    bloodColor: '#607050',
  });
  E.add({
    id: 'bone_priest', name: 'Bone Priest', hp: 36, speed: 34, dmg: 10, r: 5, brain: 'teleporter',
    brainOpts: { cd: 3, pattern: 'spread', count: 5, arc: 0.9, projColor: '#e8e0d0', projSpeed: 115 },
    art: { type: 'humanoid', body: '#d0c8b0', skin: '#e8e0d0', eye: '#101010', glow: '#a080ff', head: 'hood', headCol: '#b0a890' },
    bloodColor: '#a09880',
  });
  E.add({
    id: 'heretic_knight', name: 'Heretic Knight', hp: 90, speed: 32, dmg: 16, r: 7, brain: 'tank', graveBound: true, kbResist: 0.5,
    brainOpts: { slamR: 30, slamRange: 38, wind: 0.8, cd: 2.4, slamColor: '#a0a0c0' },
    art: { type: 'humanoid', s: 1.3, body: '#505060', skin: '#8aa080', head: 'helmet', headCol: '#707080', weapon: 'bigsword', shield: true, shieldCol: '#606070' },
    gold: [0.7, 1, 3], bloodColor: '#607050',
  });
})();
