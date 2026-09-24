// Developer helpers, callable from the browser console, e.g.:
//   G.Debug.god = true
//   G.Debug.level(6)            jump to level 6 (keeps cards/relics)
//   G.Debug.boss('galileo')     teleport into the current level's boss room with that boss
//   G.Debug.card('hydra', 0)    put a card on pistol 1 (next free slot)
//   G.Debug.relic('aegis')
//   G.Debug.killAll()
(function () {
  'use strict';

  const Debug = {
    god: false,
    ensureRun() { if (!G.Run.active) G.Game.newRun(); },
    level(n) {
      this.ensureRun();
      G.Run.startLevel(n);
    },
    boss(id) {
      this.ensureRun();
      const L = G.World.level;
      if (id) G.Run.bossChoices[L.index] = id;
      const room = L.boss;
      room.cleared = false;
      G.World.enterRoom(room, null);
    },
    card(id, weapon = 0) {
      const w = G.Run.player.weapons[weapon];
      const def = G.Cards.get(id);
      const conflicts = w.conflictsWith(def);
      const slot = conflicts.length ? conflicts[0] : Math.min(w.cards.length, 2);
      w.setCard(def, slot);
    },
    relic(id) { G.Run.giveRelic(id); },
    killAll() { for (const e of G.World.enemies) if (!e.dead) G.Combat.kill(e, {}); },
    // Step the simulation manually (useful when the tab is hidden). auto: aim at the
    // nearest enemy and hold fire.
    sim(seconds, auto = true) {
      const steps = Math.round(seconds * 60);
      const In = G.Input;
      for (let i = 0; i < steps; i++) {
        if (auto && G.World.player) {
          const P = G.World.player;
          let best = null, bd = Infinity;
          for (const e of G.World.enemies) {
            if (e.dead || e.disguised || e.hidden) continue;
            const d = G.U.dist(P.x, P.y, e.x, e.y);
            if (d < bd) { bd = d; best = e; }
          }
          if (best) {
            const s = G.Cam.toScreen(best.x, best.y);
            In.mouse.x = s.x; In.mouse.y = s.y; In.mouse.buttons[0] = true;
          } else In.mouse.buttons[0] = false;
        }
        G.Game.step(1 / 60);
      }
      if (auto) In.mouse.buttons[0] = false;
      G.Game.render();
    },
    heal() { const P = G.Run.player; P.hp = P.maxHp; },
  };

  G.Debug = Debug;
})();
