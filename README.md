# InfiniteDescent

**Nine Circles**: a twin-stick, top-down pixel roguelike built from `Game_Design_Sheet_Expanded.md`.
Plain JavaScript + Canvas, no build step and no dependencies.

## Running

Double-click `index.html` (Chrome, Edge or Firefox). Everything is drawn procedurally, so there are no asset files.

Or serve it locally (optional): `py -m http.server 8765`, then open http://localhost:8765.
`.claude/launch.json` holds the same command for the Claude desktop preview.

## Controls

| Input | Action |
|---|---|
| WASD / Arrows | Move |
| Mouse | Aim |
| Left click (hold) | Shoot |
| Space / Shift / Right click | Dash (invulnerable; also "jumps" shockwaves and pits) |
| R | Reload |
| 1 / 2, Q | Switch pistol |
| Esc / P | Pause (shows your cards and relics) |
| M | Mute |
| Gamepad | L-stick move, R-stick aim, RT/RB shoot, LT/LB/A dash, X reload, Y swap, Start pause |

## Structure

```
index.html            script load order (core -> engine -> gen -> content -> game)
css/style.css         DOM menu styling
src/core/             namespace + registries, math/RNG, input, audio, save, drawing, pixel-art painters
src/engine/           tiles, physics, flow-field pathing, statuses, combat, projectiles, zones, pickups,
                      props, weapon, player, enemy + AI brains, boss base, BossKit, hazards, room, world
src/gen/              room interiors (one generator per biome) and the level room-graph
src/content/          cards, relics, treasures, meta items, enemies (per circle), biomes, bosses (one file each)
src/game/             run state, HUD, DOM menus, debug helpers, game loop
```

Everything content-related is a definition object in a registry (`G.Cards`, `G.Relics`, `G.Enemies`,
`G.Bosses`, `G.Attacks`, `G.Biomes`, `G.Hazards`, `G.Statuses`, `G.ZoneTypes`, `G.Brains`, `G.RoomGens`,
`G.Treasures`, `G.Meta`). To add something, add a definition (and a `<script>` tag for a new file).

- **Card**: hooks such as `stats`, `onTrigger`, `modifyBullet`, `hitMult`, `onHit`, `onKill`. Cards sharing a
  `group` are mutually exclusive on one pistol. See `src/content/cards.js` and `src/engine/hooks.js`.
- **Relic**: hooks such as `stats`, `damageMult`, `takenMult`, `onKill`, `onPlayerHit`, `onLethal`. See `src/content/relics.js`.
- **Enemy**: pick a brain (`chaser`, `charger`, `shooter`, `swooper`, `tank`, `mimic`, `teleporter`, ...) and an art descriptor.
- **Boss**: attacks are generator functions (`yield` seconds / a predicate / nothing for one frame) using the
  `BossKit` (`K`) helpers. They're self-contained, which is how Satan borrows them.
- **Biome**: palette, obstacle styles, enemy weights, boss pair, room generator, hazard modules.

### Debug console helpers

```js
G.Debug.god = true
G.Debug.level(6)             // jump to a level
G.Debug.boss('galileo')      // fight a specific boss now
G.Debug.card('hydra', 0)     // put a card on pistol 1
G.Debug.relic('aegis')
G.Debug.sim(10)              // step 10s of simulation with an auto-aim bot (works in hidden tabs)
```

## How ambiguous parts of the design sheet were resolved

- **10 levels** = 9 circles (each with one of its two bosses, picked at random) + the Abyss: the trophy room
  (with trophies of the bosses you beat, a free card and a free relic) and then Satan.
- **Level 5**: if Achilles was the level 3 boss, level 5 is Ajax. Otherwise it's a random pick between Achilles
  (Wrath-Born) and Ajax. For Satan, both Achilles versions count as one boss.
- **Satan** uses every attack of every boss you did *not* defeat this run (the alternates), plus two of his own.
- **Cards**: after each boss you choose 1 of 3 (skip allowed) and pick a slot on either pistol. When you
  would equip a conflicting card (two projectile types, Five-Fold Wrath with Glass Cannon, Ricochet with
  Styx Rounds, or the same card twice) it replaces the conflicting one. The trophy-room card is also a pick of 3.
- **Relics** are random, one per level in the relic room, with no choice.
- **Jumping**: the dash doubles as the jump. Its i-frames pass through shockwaves, and you can dash over pits.
- **Healing**: enemies sometimes drop hearts, bosses drop a heal orb at 75/50/25% HP (Beowulf's phase 2
  stops doing this), and you regain 25% max HP when you descend.
- **Room bonuses**: clearing a combat room without taking any damage permanently (for the run) adds +3% to
  fire rate, move speed or reload speed at random. Rooms where you got hit give nothing. Totals are shown on
  the pause screen.
- **Flawless level**: losing no HP anywhere on a level makes an extra relic appear after its boss
  (not on the final level). Hits fully blocked by Aegis or Golden Ward don't count as damage.
- **Hard mode**: bosses on levels 1-8 drop a solid skull. Five bullet hits light its eyes red and lock the
  next level (only that level) into hard mode: double enemy HP (bosses, summons and clones included) and
  double damage taken, with the same enemy counts as normal, plus double rewards (two relics in the relic room, a +6% flawless-room
  bonus, two flawless-level relics). No skull after level 9, so the final fight is never hard.
- **Ammo packs**: every room has 1-2. Walking over one instantly refills both pistols. A pack stays on the
  floor if both pistols are already full.
- **Crits**: 5% base chance for 2x damage. Fate's Thread guarantees every 10th shot.
- **Meta-progression**: the items are marked "placeholder, do not implement", so only the framework exists.
  Satan drops an item, picking it up records it in the save file (localStorage) and returns you to the main
  menu. Add real items in `src/content/meta.js`.
- **Two relics had no name** in the sheet. They're called "Bloodlust Idol" (+20% damage for 10s on kill) and
  "Triune Anklet" (3 dashes). The six base cards were also given names (Lightspeed, Powder Keg, Five-Fold Wrath,
  Harvest Reload, Hellfire, Stasis Orbs).

Balance numbers (HP, damage, timings) are first-pass values and have not been play-tested by a person.
