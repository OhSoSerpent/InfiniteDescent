// Level 8 - Fraud: deceivers. Some hide as harmless objects, some conjure illusions.
(function () {
  'use strict';
  const E = G.Enemies;

  E.add({
    id: 'mimic_crate', name: 'Crate Mimic', hp: 45, speed: 60, dmg: 14, r: 6, brain: 'mimic', disguise: 'crate',
    brainOpts: { revealRange: 44, speedMult: 1.3 },
    art: { type: 'quadruped', body: '#8a5a2a', belly: '#5a3a1a', glow: '#ff3030', spikes: '#e0e0e0' }, gold: [0.9, 2, 4],
  });
  E.add({
    id: 'mimic_statue', name: 'Statue Mimic', hp: 55, speed: 50, dmg: 15, r: 6, brain: 'mimic', disguise: 'statue',
    brainOpts: { revealRange: 40, speedMult: 1.2 },
    art: { type: 'humanoid', body: '#b8b0a0', skin: '#c8c0b0', legs: '#908878', eye: '#ff3030', glow: '#ff3030', weapon: 'sword' }, gold: [0.9, 2, 4],
  });
  E.add({
    id: 'deceiver', name: 'Deceiver', hp: 34, speed: 40, dmg: 10, r: 5, brain: 'teleporter',
    brainOpts: { cd: 2.6, pattern: 'spread', count: 3, arc: 0.5, projColor: '#40e080', projSpeed: 135 },
    art: { type: 'humanoid', body: '#305a40', skin: '#c0d0b0', head: 'hood', headCol: '#204030', eye: '#40ff80', glow: '#40ff80' },
  });
  E.add({
    id: 'forger', name: 'Forger', hp: 38, speed: 38, dmg: 10, r: 5, brain: 'shooter',
    brainOpts: {
      range: [80, 150], cd: 3.2, wind: 0.5,
      onFire(e, tgt) {
        // Conjure two illusory copies, then fire.
        for (let i = 0; i < 2; i++) {
          const pt = G.World.randomFloorNear(e.x, e.y, 20, 40) || { x: e.x, y: e.y };
          const c = G.World.spawnEnemy('illusion_copy', pt.x, pt.y, { noCredit: true, instant: true });
          c.aware = true;
        }
        G.BrainUtil.firePattern(e, tgt, { pattern: 'aimed', projColor: '#e0a0ff', projSpeed: 140 });
      },
    },
    art: { type: 'humanoid', body: '#6a4a8a', skin: '#d0b0e0', head: 'veil', headCol: '#4a2a6a', eye: '#e0a0ff' },
  });
  E.add({
    id: 'illusion_copy', name: 'Illusion', hp: 1, speed: 60, dmg: 6, r: 5, brain: 'illusion', elite: false,
    brainOpts: { life: 7 },
    art: { type: 'humanoid', body: '#6a4a8a', skin: '#d0b0e0', head: 'veil', headCol: '#4a2a6a', eye: '#e0a0ff' },
    gold: [0, 0, 0], bloodColor: '#e0a0ff',
  });
})();
