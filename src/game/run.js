// State of the current run: level progression, relics, boss choices, stats.
(function () {
  'use strict';

  const LAST_LEVEL = 10;
  const LEVEL_HEAL = 0.25; // fraction of max HP restored when descending to the next level
  // Permanent (for the run) bonus granted for clearing a combat room without taking damage.
  const ROOM_BONUS = 0.03;
  const ROOM_BONUS_STATS = [
    { key: 'fireRate', label: 'FIRE RATE' },
    { key: 'moveSpeed', label: 'MOVE SPEED' },
    { key: 'reloadSpeed', label: 'RELOAD SPEED' },
  ];

  const Run = {
    active: false,
    levelIndex: 0,
    relics: [],
    relicPool: [],
    bossChoices: {},
    defeatedBosses: [],
    stats: null,
    player: null,
    level: null,
    seed: 0,

    start(seed) {
      this.seed = seed >>> 0;
      G.rng.seed(this.seed);
      this.active = true;
      this.relics = [];
      this.relicPool = G.rng.shuffle(G.Relics.ids());
      this.bossChoices = {};
      this.defeatedBosses = [];
      this.stats = { kills: 0, shots: 0, damageDealt: 0, damageTaken: 0, gold: 0, time: 0 };
      this.bonus = { fireRate: 0, moveSpeed: 0, reloadSpeed: 0 };
      this.levelHit = false;
      this.levelIndex = 0;
      this.player = new G.Player(0, 0);
      const S = G.Save.data;
      S.stats.runs++;
      G.Save.save();
      this.startLevel(1);
    },

    startLevel(i) {
      this.levelIndex = i;
      this.levelHit = false; // becomes true the first time the player loses HP this level
      const biome = G.biomeForLevel(i);
      this.chooseBoss(i);
      this.level = G.LevelGen.generate(i, biome, G.rng);
      G.World.reset();
      G.World.loadLevel(this.level, this.player);
      G.Hooks.relic('onLevelStart', { level: i, player: this.player });
      G.HUD.banner(i === LAST_LEVEL ? biome.name.toUpperCase() : 'LEVEL ' + i + ': ' + biome.name.toUpperCase(), biome.subtitle, 2.6);
      const S = G.Save.data;
      if (i > S.stats.bestLevel) { S.stats.bestLevel = i; G.Save.save(); }
    },

    nextLevel() {
      if (this.levelIndex >= LAST_LEVEL) return;
      const P = this.player;
      P.hp = Math.min(P.maxHp, P.hp + P.maxHp * LEVEL_HEAL);
      P.status.clear();
      P.buffs = [];
      P.stolen = {};
      this.startLevel(this.levelIndex + 1);
    },

    // Pick this level's boss (one of the biome's two; Achilles special case on level 5).
    chooseBoss(i) {
      if (this.bossChoices[i]) return this.bossChoices[i];
      const biome = G.biomeForLevel(i);
      let id;
      if (i === 5) {
        // Achilles returns (stronger) only if he was not the level-3 boss; otherwise Ajax.
        id = this.bossChoices[3] === 'achilles' ? 'ajax' : G.rng.pick(biome.bosses);
      } else {
        id = G.rng.pick(biome.bosses);
      }
      this.bossChoices[i] = id;
      return id;
    },
    bossIdFor(i) { return this.bossChoices[i] || this.chooseBoss(i); },

    onBossDefeated(def) {
      if (!this.defeatedBosses.includes(def.id)) this.defeatedBosses.push(def.id);
      const S = G.Save.data;
      S.bossesDefeated[def.id] = (S.bossesDefeated[def.id] || 0) + 1;
      G.Save.save();
    },
    // Bosses (by identity) not defeated this run — Satan borrows their attacks.
    undefeatedBosses() {
      const beaten = new Set(this.defeatedBosses.map(id => G.Bosses.get(id).identity || id));
      return G.Bosses.all().filter(d => !d.final && !beaten.has(d.identity || d.id));
    },

    // Called when a combat room is cleared: +2% (or +3% if untouched) to a random stat.
    // Called when a combat room is cleared without taking damage: +3% to a random stat.
    grantRoomBonus() {
      const stat = G.rng.pick(ROOM_BONUS_STATS);
      this.bonus[stat.key] += ROOM_BONUS;
      const P = this.player;
      const label = '+' + Math.round(ROOM_BONUS * 100) + '% ' + stat.label;
      G.FX.text(P.x, P.y - 30, label, '#ffe060');
      G.HUD.toast('FLAWLESS ROOM: ' + label, '#ffe060');
    },
    bonusSummary() {
      return ROOM_BONUS_STATS.map(s => s.label + ' +' + Math.round(this.bonus[s.key] * 100) + '%').join('   ');
    },

    // ---- relics
    drawRelic() {
      while (this.relicPool.length) {
        const id = this.relicPool.pop();
        if (!this.relics.some(r => r.def.id === id)) return id;
      }
      return null;
    },
    giveRelic(id) {
      const def = G.Relics.get(id);
      if (this.relics.some(r => r.def.id === id)) return;
      const inst = { def, state: {} };
      this.relics.push(inst);
      if (def.onAcquire) def.onAcquire({ player: this.player }, inst.state, inst);
      this.player.recalcStats();
      G.HUD.banner(def.name.toUpperCase(), def.desc, 3.2, true);
      G.Audio.play('relic');
      G.FX.burst(this.player.x, this.player.y, 30, def.color || '#ffd060', 80, 0.6);
    },

    // ---- cards
    rollCards(n) {
      const P = this.player;
      // Skip cards already equipped on both weapons (they would have no valid use).
      const pool = G.Cards.all().filter(c => !(P.weapons[0].hasCard(c.id) && P.weapons[1].hasCard(c.id)));
      return G.rng.shuffle(pool.slice()).slice(0, n);
    },

    end() { this.active = false; },
  };
  Run.LAST_LEVEL = LAST_LEVEL;

  G.Run = Run;
})();
