// Biomes (one per level). Fields:
//   id, index, name, subtitle, palette{...}, obstacles:[[style,w]], enemies:[[id,w]], bosses:[ids],
//   roomGen, hazards:[[hazardId, params]], liquidDps, baseTile, fakeDoors, extraRooms, special
(function () {
  'use strict';
  const B = G.Biomes;
  const T = G.T;

  B.add({
    id: 'earth', index: 1, name: 'Earth', subtitle: 'The mortal wilds',
    palette: {
      floor: ['#3d6b35', '#437539', '#39632f'], floorStyle: 'grass', detail: '#5a8f4a', flower: '#e0d060',
      wall: '#3a3430', wallTop: '#5a524a', pit: '#0a0806', pitEdge: '#2a2018', liquid: '#2f5fa8', liquidHi: '#6a9ae0',
      leaf: ['#2e5a26', '#3a7030', '#4a8a3a'], trunk: '#5a3a20', rock: '#7a7670',
    },
    obstacles: [['tree', 3], ['rock', 2]],
    enemies: [['wolf', 3], ['boar', 2], ['bear', 1], ['hawk', 2], ['viper', 2]],
    bosses: ['cerberus', 'charon'],
    roomGen: 'open', density: 0.07, liquidDps: 8,
    hazards: [],
  });

  B.add({
    id: 'limbo', index: 2, name: 'Limbo', subtitle: 'Much the same, yet wrong',
    palette: {
      floor: ['#4a4a52', '#50505a', '#46464e'], floorStyle: 'grass', detail: '#6a6a78', flower: '#a0a0c0',
      wall: '#2a2a32', wallTop: '#44444e', pit: '#050508', pitEdge: '#1a1a22', liquid: '#40405a', liquidHi: '#8080a0',
      leaf: ['#3a4040', '#465050', '#566060'], trunk: '#2a2a2a', rock: '#6a6a74', deadwood: '#3a3a40',
    },
    obstacles: [['deadtree', 2], ['tree', 1], ['rock', 2]],
    enemies: [['hollow_wolf', 3], ['twin_boar', 2], ['wretched_bear', 1], ['eyeless_hawk', 2], ['shade_serpent', 2]],
    bosses: ['socrates', 'caesar'],
    roomGen: 'open', density: 0.07, liquidDps: 8,
    hazards: [['particles', { color: '#c0c0d0', count: 30, vy: 6, vx: 4, alpha: 0.35, sway: 1, swayAmt: 8 }], ['tint', { color: '#303048', alpha: 0.18, vignette: 'rgba(10,10,20,0.6)' }]],
  });

  B.add({
    id: 'lust', index: 3, name: 'The Storm', subtitle: 'Where lovers are blown forever',
    palette: {
      floor: ['#3a4a3a', '#34443a', '#3e4e40'], floorStyle: 'grass', detail: '#4a6050', flower: '#c06080',
      wall: '#2a2a34', wallTop: '#40404c', pit: '#06060a', pitEdge: '#20202a', liquid: '#304860', liquidHi: '#6080a0',
      leaf: ['#2a3a2a', '#344a34', '#406040'], trunk: '#3a2a20', rock: '#5a5a60', deadwood: '#3a3028',
    },
    obstacles: [['deadtree', 2], ['rock', 2]],
    enemies: [['jilted_lover', 3], ['siren', 2], ['heartbreaker', 2], ['scorned_wraith', 1]],
    bosses: ['achilles', 'helen'],
    roomGen: 'storm', liquidDps: 8,
    hazards: [
      ['wind', { strength: 70 }],
      ['debris', { interval: 0.5, dmg: 8, colors: ['#5a3a20', '#3a5a2a', '#6a6a60'] }],
      ['particles', { color: '#a0b0d0', count: 90, vy: 260, vx: -60, alpha: 0.4, streak: 4, windy: true }],
      ['tint', { color: '#101828', alpha: 0.25 }],
    ],
  });

  B.add({
    id: 'greed', index: 4, name: 'Greed', subtitle: 'A ruined treasury',
    palette: {
      floor: ['#6a5a3a', '#72603e', '#665636'], floorStyle: 'gold', detail: '#8a7448',
      wall: '#4a3a20', wallTop: '#7a6030', pit: '#0a0600', pitEdge: '#3a2a10', liquid: '#b08820', liquidHi: '#f0d060',
      column: '#d8c890', statue: '#e0b030', rock: '#9a8a60',
    },
    obstacles: [['column', 2], ['goldpile', 2], ['goldstatue', 1], ['brokencolumn', 1]],
    enemies: [['gilded_spirit', 3], ['coin_hurler', 2], ['hoarder', 1], ['jeweled_lancer', 2]],
    bosses: ['midas', 'croesus'],
    roomGen: 'treasury', liquidDps: 10, extraRooms: ['treasure'],
    hazards: [['particles', { color: '#ffe080', count: 18, vy: -8, alpha: 0.5, sway: 2, swayAmt: 10 }]],
  });

  B.add({
    id: 'wrath', index: 5, name: 'Wrath', subtitle: 'The boiling lake of blood',
    palette: {
      floor: ['#3a2420', '#40281f', '#36201c'], floorStyle: 'ash', detail: '#5a3028',
      wall: '#2a1410', wallTop: '#4a2418', pit: '#080202', pitEdge: '#2a0a06', liquid: '#8a1010', liquidHi: '#e03020', boiling: true,
      ruin: '#5a4038', column: '#7a5a50', rock: '#5a3a30',
    },
    obstacles: [['ruin', 3], ['brokencolumn', 1], ['rock', 1]],
    enemies: [['berserker_shade', 3], ['fury', 3], ['wrath_brute', 1], ['ember_caster', 2]],
    bosses: ['achilles_wrath', 'ajax'],
    roomGen: 'lake', liquidDps: 20,
    hazards: [
      ['sinking', { interval: 3.2, size: 2, sunkTime: 4, max: 3 }],
      ['particles', { color: '#ff6020', count: 30, vy: -18, alpha: 0.6, sway: 2, swayAmt: 12 }],
      ['tint', { color: '#400800', alpha: 0.15, vignette: 'rgba(40,0,0,0.5)' }],
    ],
  });

  B.add({
    id: 'heresy', index: 6, name: 'Heresy', subtitle: 'The burning cemetery',
    palette: {
      floor: ['#3a3438', '#36303a', '#3e383c'], floorStyle: 'cobble', detail: '#2a2428',
      wall: '#241e24', wallTop: '#3e3440', pit: '#050305', pitEdge: '#1e161e', liquid: '#6a2010', liquidHi: '#ff6020',
      tomb: '#8a8490', rock: '#6a6470', deadwood: '#2a2020',
    },
    obstacles: [['tomb', 3], ['deadtree', 1]],
    enemies: [['heretic_zombie', 3], ['flame_cultist', 2], ['bone_priest', 1], ['heretic_knight', 1]],
    bosses: ['galileo', 'bruno'],
    roomGen: 'cemetery', liquidDps: 14,
    hazards: [['particles', { color: '#ff8030', count: 35, vy: -22, alpha: 0.6, sway: 3, swayAmt: 10 }], ['tint', { color: '#200808', alpha: 0.15, vignette: 'rgba(20,0,0,0.5)' }]],
  });

  B.add({
    id: 'violence', index: 7, name: 'Violence', subtitle: 'A battlefield without end',
    palette: {
      floor: ['#4a3a2a', '#443424', '#4e3e2c'], floorStyle: 'dirt', detail: '#2e2418',
      wall: '#2a2018', wallTop: '#443628', pit: '#060402', pitEdge: '#241a10', liquid: '#7a1010', liquidHi: '#c02020',
      ruin: '#6a5a50', rock: '#6a6058',
    },
    obstacles: [['ruin', 3], ['rock', 1], ['burningtree', 1]],
    enemies: [['soldier', 3], ['legionary', 3], ['war_beast', 1], ['violent_spirit', 2]],
    bosses: ['heracles', 'beowulf'],
    roomGen: 'battlefield', liquidDps: 16,
    hazards: [['battlefield', { interval: 3, dmg: 14 }], ['particles', { color: '#a09080', count: 40, vy: 10, vx: 12, alpha: 0.35 }], ['tint', { color: '#301000', alpha: 0.12 }]],
  });

  B.add({
    id: 'fraud', index: 8, name: 'Fraud', subtitle: 'The city of lies',
    palette: {
      floor: ['#4a4458', '#46405a', '#4e4860'], floorStyle: 'stone', detail: '#3a3448',
      wall: '#2a2638', wallTop: '#4a4460', pit: '#040308', pitEdge: '#1a1628', liquid: '#40305a', liquidHi: '#8060c0',
      facade: '#8a7a9a', statue: '#b8b0a0', rock: '#6a6478',
    },
    obstacles: [['facade', 2], ['crate', 2], ['statue', 1]],
    enemies: [['mimic_crate', 2], ['mimic_statue', 1], ['deceiver', 3], ['forger', 2]],
    bosses: ['odysseus', 'loki'],
    roomGen: 'labyrinth', liquidDps: 12, fakeDoors: true,
    hazards: [['tint', { color: '#100820', alpha: 0.18, vignette: 'rgba(10,0,20,0.55)' }]],
  });

  B.add({
    id: 'treachery', index: 9, name: 'Treachery', subtitle: 'The frozen lake',
    palette: {
      floor: ['#d8e8f0', '#d0e0ea', '#e0eef4'], floorStyle: 'ice', detail: '#b8d0e0',
      wall: '#5a7088', wallTop: '#8aa8c0', pit: '#02060c', pitEdge: '#304860', liquid: '#1a3050', liquidHi: '#4a70a0',
      ice: '#a8d8f0', frozenBodies: true, obstacleFloor: 'ice', rock: '#8aa0b0',
    },
    obstacles: [['iceblock', 3], ['frozen', 2]],
    enemies: [['traitor_shade', 3], ['frost_wraith', 2], ['false_ally', 2], ['ice_warden', 1]],
    bosses: ['brutus', 'judas'],
    roomGen: 'ice', liquidDps: 12, baseTile: T.ICE,
    hazards: [['traitors', { interval: 7, duration: 4 }], ['particles', { color: '#ffffff', count: 60, vy: 25, vx: 10, alpha: 0.7, sway: 1.5, swayAmt: 12 }]],
  });

  B.add({
    id: 'abyss', index: 10, name: 'The Abyss', subtitle: 'At the bottom of everything', special: 'abyss',
    palette: {
      floor: ['#2a1418', '#2e161a', '#261216'], floorStyle: 'stone', detail: '#1a0a0e',
      wall: '#1a080c', wallTop: '#3a1418', pit: '#000000', pitEdge: '#200408', liquid: '#8a1010', liquidHi: '#ff3020', boiling: true,
      spire: '#4a1010', rock: '#4a2024', ice: '#a8d8f0',
    },
    obstacles: [['spire', 1]],
    enemies: [],
    bosses: ['satan'],
    roomGen: 'abyss', liquidDps: 20,
    hazards: [['particles', { color: '#ff4020', count: 30, vy: -14, alpha: 0.5, sway: 2, swayAmt: 8 }], ['tint', { color: '#200000', alpha: 0.2, vignette: 'rgba(30,0,0,0.6)' }]],
  });

  G.biomeForLevel = function (index) {
    return B.all().find(b => b.index === index);
  };
})();
