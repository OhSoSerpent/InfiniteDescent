Summary:
A JS-based twin stick style 2d topdown shooter with simplistic pixel graphics and procedural generation. Each upgrade is a card that modifies what your gun does. You can have 3 cards active on a weapon at a time, and you start with two pistols. A pistol has 20 bullets. You can swap between your weapons with 1 and 2. You have a dash, to play cover. The dash has I-frames. Each level is procedurally generated, and you get a new card after each level. The game goes on for 10 levels, after which you fight the final boss. Each level also has a relic room, which are global modifiers that don't need to be equipped. These are not pick-3's, it's a get-what-you-get situation. After you beat the boss each time, you get a random meta-progression item, which persist on your save, between runs.

Levels:
1st level: Earth, normal. Obstacles and cover are trees and rocks. The boss can either be Cerberus or Charon. Enemies are wild animals.
Cerberus:

- Giant stone statue who flings rocks at you
- Exudes waves of flames sometimes
- Can slam the ground, sending a shockwave outward that the player has to jump over
- High health pool, attacks are reasonably slow
- Occasionally becomes stationary and launches several rocks at once, creating gaps the player has to move through

Charon:

- Normal sized, swings huge oar at player
- Splashes waves of the Styx sometimes
- Can throw his oar like a boomerang, forcing the player to keep moving
- Lower health pool, notably faster attacks
- Occasionally floods part of the arena with the Styx, reducing the player's safe movement area for a short period

2nd level: Limbo, much the same as Earth. The boss can either be Socrates or Julius Caesar. Enemies are strange, twisted versions of animals from the first level.
Socrates:

- Spits poison projectiles
- Can manipulate the player's speed (always needs to be dodgeable)
- Occasionally creates areas where the player's movement is temporarily slowed
- Becomes invincible and summons swarms of flies to attack the player, isn't damageable until they're dead (he still attacks during this). He will only do this twice all fight
- Higher health pool, slower attacks
- Poison attacks linger on the ground briefly, forcing the player to keep repositioning

Julius Caesar:

- Constantly rushing towards the player
- Has stabbing and sweeping attacks with his spears
- Can throw one of his spears across the arena
- Twice a fight, he summons a second version of himself that dies in a few hits, but does the same thing he does (like Pontiff Sulyvahn)
- Lower health, very fast
- The clone disappears after Caesar takes enough damage, or after a short amount of time if the player avoids it

3rd level: A violent storm blows around endlessly. Enemies are vengeful lovers who attack you and can inflict poison. The wind will sometimes knock the player around as well. There are also trees, branches, and other debris that blow around that can hit and damage the player. There is also perpetual rain (doesn't do anything, it's there for atmosphere). The boss can either be Achilles or Helen of Troy.
Achilles:

- Fast melee-focused boss who constantly moves around the arena
- Uses a spear for quick stabbing attacks and long sweeping attacks
- Can throw his spear at the player, then rush over to retrieve it
- Occasionally charges directly at the player, requiring a well-timed dodge
- Has a weak spot on his heel that takes significantly more damage, but is difficult to hit
- Lower health pool, extremely fast attacks and movement
- During his second phase, the storm becomes stronger and more debris is thrown around the arena
- Occasionally becomes enraged and performs a series of rapid attacks before briefly becoming vulnerable

Helen of Troy:

- Uses a combination of ranged attacks and area-of-effect attacks
- Creates illusions of herself that attack the player and disappear after taking a few hits
- Can launch projectiles that inflict poison
- Occasionally charms the player, briefly reversing or disrupting their movement controls (always with a clear visual warning and enough time to react)
- Can summon a large storm around herself that pulls the player toward her
- Higher health pool, slower attacks
- During her second phase, she summons multiple illusions at once and the wind becomes more unpredictable
- The real Helen can be identified by a visual difference between her and the illusions, rewarding the player for paying attention rather than simply attacking everything

4th level: Greed, a massive ruined treasury filled with gold, statues, broken temples, and piles of treasure. The environment is filled with traps and moving platforms. Enemies are greedy spirits who attack the player with weapons made from gold and other valuables. Picking up certain treasures can give the player temporary benefits, but some are trapped. The boss can either be King Midas or Croesus.
King Midas:

- Large golden king who fights primarily with melee attacks
- Anything he touches temporarily turns to gold, including parts of the arena
- Can fire golden projectiles from his hands
- Can turn sections of the floor into gold, making them temporarily dangerous to stand on
- Occasionally attempts to grab the player; being hit causes the player to become slowed and partially immobilized
- Higher health pool, slower attacks
- During his second phase, Midas begins turning environmental objects into weapons and throwing them at the player
- Eventually covers large portions of the arena in gold, significantly reducing the available safe space

Croesus:

- Uses a massive golden sword and moves surprisingly quickly
- Can summon piles of gold that fall from the ceiling and damage the player
- Creates golden copies of himself that perform a single attack before disappearing
- Can temporarily steal one of the player's abilities, preventing its use until Croesus is damaged enough
- Lower health pool, faster attacks
- Becomes increasingly aggressive as his health decreases
- During his second phase, the entire arena begins filling with gold, forcing the player to keep moving

5th level: Wrath, a huge lake of boiling blood surrounded by burning ruins. The arena is constantly shifting as sections of the ground sink into the blood and rise back up. Enemies are enraged spirits who attack recklessly and can inflict a temporary rage effect that makes the player's attacks stronger but their movement more difficult. The boss can either be Achilles or Ajax.
Achilles:

- Returns as a more powerful version of the warrior from the third level if he was not the boss there; otherwise this boss is replaced by Ajax
- Uses a massive spear and shield
- Extremely aggressive, constantly closing distance with the player
- Can block attacks with his shield and counterattack
- Performs a long charging attack that can knock the player into the boiling blood
- Occasionally throws his shield and fights without it, becoming faster but easier to damage
- High health pool, very aggressive attacks
- During his second phase, his shield becomes covered in flames and his attacks leave burning areas behind
- Becomes increasingly reckless as his health decreases

Ajax:

- Massive warrior wielding a giant shield and sword
- Uses wide sweeping attacks that cover a large portion of the arena
- Can slam his shield into the ground, creating a shockwave
- Occasionally enters a rage state where he ignores stagger and charges continuously toward the player
- Can throw his sword and temporarily fight with his shield alone
- Higher health pool, slower but extremely powerful attacks
- During his second phase, the arena begins collapsing into the boiling blood while Ajax becomes faster and more aggressive

6th level: Heresy, a massive burning cemetery filled with open stone tombs and flaming graves. Enemies are undead followers of various heretical beliefs. Some enemies can resurrect after being killed unless their graves are destroyed. The boss can either be Galileo Galilei or Giordano Bruno.
Galileo Galilei:

- Uses a strange astronomical device to attack the player
- Fires concentrated beams of light that rotate around the arena
- Can summon miniature planets that orbit around him and damage the player
- Occasionally reverses the direction of his attacks, requiring the player to learn their patterns
- Can create a gravitational field that pulls the player toward a specific point
- Lower health pool, complicated attacks
- During his second phase, the number of planets orbiting him increases and his attacks become faster
- Occasionally stops attacking and creates a large gravitational field that the player must escape before it collapses

Giordano Bruno:

- Uses fire-based attacks and a flaming staff
- Can create walls of fire that divide the arena
- Summons burning spirits that chase the player
- Occasionally sets himself on fire, becoming immune to damage for a short period while aggressively attacking
- Can launch several fireballs that slowly track the player
- Higher health pool, slower but more predictable attacks
- During his second phase, much of the arena becomes engulfed in flames and the safe areas become smaller

7th level: Violence, a ruined battlefield surrounded by burning forests and rivers of blood. Enemies are soldiers, monsters, and violent spirits who aggressively attack the player. The environment itself is dangerous, with collapsing structures, falling trees, and explosions occurring throughout the level. The boss can either be Heracles or Beowulf.
Heracles:

- Extremely large and powerful melee boss
- Uses a massive club with slow but devastating attacks
- Can throw massive boulders at the player
- Has a powerful ground slam that creates several expanding shockwaves
- Occasionally charges across the entire arena, destroying obstacles in his path
- Can pick up and throw pieces of the environment
- Very high health pool, very slow attacks
- During his second phase, drops his club and begins fighting with his bare hands, becoming significantly faster
- His attacks become more dangerous but leave larger openings for counterattacks

Beowulf:

- Fast warrior who fights with his hands rather than a weapon
- Has a series of quick punches and grabs
- Can leap across the arena and slam into the ground
- Occasionally grabs the player and attempts to throw them into environmental hazards
- Can roar, temporarily stunning the player if they are too close
- Lower health than Heracles, extremely fast attacks
- During his second phase, becomes partially transformed into a monstrous form
- Gains a long-range claw attack and a powerful bite attack
- Becomes increasingly aggressive and gives the player fewer opportunities to heal

8th level: Fraud, a massive labyrinthine city filled with fake buildings, false paths, traps, and illusions. The environment constantly tries to deceive the player. Some doors lead nowhere, some platforms disappear when stepped on, and enemies can disguise themselves as harmless objects. The boss can either be Odysseus or Loki.
Odysseus:

- Primarily uses ranged attacks and traps
- Fires arrows from hidden positions around the arena
- Can create fake copies of himself that imitate his attacks
- Places traps on the ground that activate when the player walks over them
- Occasionally disappears completely and attacks from somewhere else in the arena
- Lower health pool, highly evasive
- During his second phase, creates a maze-like arena and repeatedly teleports between sections
- Some paths are fake and lead directly into traps
- The real Odysseus can be identified by subtle visual differences between him and his copies

Loki:

- Extremely deceptive boss who constantly changes appearance
- Can disguise himself as objects in the arena before suddenly attacking
- Creates several copies of himself that perform different attacks
- Can temporarily reverse the player's controls
- Occasionally changes the layout of the arena
- Can teleport behind the player and perform a melee attack
- Lower health pool, extremely fast and unpredictable
- During his second phase, almost the entire arena becomes filled with illusions
- The player must identify the real Loki through his attack patterns rather than simply attacking every copy

9th level: Treachery, an enormous frozen wasteland. Everything is covered in ice, with massive frozen structures and bodies trapped beneath the surface. Movement is more difficult because of the ice, and certain attacks can cause the player to slide uncontrollably. Enemies are traitorous spirits who can temporarily turn against each other or disguise themselves as allies. The boss can either be Brutus or Judas.
Brutus:

- Uses two massive daggers and focuses on quick, close-range attacks
- Can disappear beneath the ice and emerge directly underneath
- Occasionally freezes parts of the arena, making them extremely slippery
- Lower health pool, extremely fast attacks
- During his second phase, the ice begins breaking apart, creating holes that the player must avoid
- Becomes faster and more aggressive as the arena gets smaller

Judas:

- Large, imposing figure standing in the center of the arena
- Uses chains to attack the player from long distances
- Can summon frozen copies of enemies from previous levels
- Occasionally freezes the player in place, but gives a clear visual warning beforehand
- Can create walls of ice that divide the arena
- Very high health pool, slow but powerful attacks
- During his second phase, the entire arena begins freezing over
- Summons increasingly powerful enemies from previous levels
- Eventually begins breaking apart the arena, forcing the player to fight on increasingly small pieces of ice
- Final attack creates a massive freezing wave that covers almost the entire arena, leaving only a small safe area that the player must reach

There is a mostly empty room before the final boss, decorated by things from previously defeated bosses. There is one free card and one free relic in this room. It leads to the final boss, Satan himself.

Satan

- Huge health pool
- Can do any of the attacks from the bosses not defeated on this run

When he is defeated, he drops a meta progression item. Once that item is picked up, the player is brought back to the main menu.

Cards:

- Bullets have no travel time
- Bullets explode
- Your bullets do 5x damage, but have a maximum clip size of 2
- If a bullet kills a enemy, instantly reload
- Bullets are replaced with fireballs
- Bullets are instead slow moving orbs that deal damage over time to the enemy standing in them

Additional Cards:

- Glass Cannon
  - Your bullets deal 2.5x damage, but your weapon has half its normal ammunition.
  - Does not stack with the 5x damage card.

- Ricochet
  - Bullets bounce off walls once before disappearing.
  - Great for tight rooms, but slightly less reliable in open areas.

- Chain Shot
  - Every third bullet fired automatically bounces toward a nearby enemy after hitting its first target.
  - The chained shot deals 50% damage.

- Scattershot
  - Each shot fires 5 weaker projectiles in a spread.
  - Individual bullets deal 35% normal damage.

- Piercing
  - Bullets pass through enemies and can hit multiple targets.
  - Each enemy after the first takes 25% less damage.

- Executioner
  - Bullets deal 2x damage against enemies below 25% health.
  - Otherwise they deal normal damage.

- Heavy Rounds
  - Bullets travel more slowly but deal 2x damage and knock enemies back significantly.

- Hollow Point
  - Bullets deal 75% more damage to enemies at close range.
  - Damage falls off significantly with distance.

- Shrapnel
  - When a bullet hits an enemy, it releases several tiny projectiles in random directions.
  - The shrapnel deals very little damage individually but is effective against groups.

- Incendiary
  - Bullets ignite enemies.
  - Burning enemies take damage over time for several seconds.

- Venom
  - Bullets poison enemies.
  - Poison damage stacks up to three times.

- Cold Iron
  - Bullets slow enemies for a short period.
  - Repeated hits refresh the slow rather than stacking it infinitely.

- Cursed Ammunition
  - Every bullet has a small chance to curse an enemy.
  - Cursed enemies take increased damage from all sources.
  - Curses disappear when the enemy dies.

- Blood Rounds
  - Killing an enemy restores a small amount of health.
  - The effect has an internal cooldown so that large groups cannot completely refill the player's health instantly.

- Double Tap
  - Every time you fire, two bullets are released instead of one.
  - Maximum ammunition is reduced by 40%.

- Burst Fire
  - Each trigger pull fires three bullets rapidly.
  - Uses three ammunition per shot.

- Last Bullet
  - The final bullet in the magazine deals 4x damage.
  - Encourages deliberately emptying the weapon.

- Bottomless Magazine
  - Magazine size is doubled.
  - Reload time is increased substantially.

- Quick Loader
  - Reload 50% faster.
  - Magazine size is reduced by 25%.

- Overheat
  - Continuously firing increases damage.
  - After firing too long, the weapon overheats and becomes unusable briefly.
  - Encourages controlled bursts.

- Desperation
  - Fire rate increases as the magazine gets closer to empty.
  - Maximum fire rate is reached with the final three bullets.

- Dash Shot
  - Your next shot after dashing deals 3x damage.

- Death From Above
  - Shooting immediately after a dash causes the bullet to deal bonus damage and knock enemies back.

- Reaper's Mark
  - Hitting an enemy three times marks them.
  - Killing a marked enemy causes a small explosion.
  - Mark disappears if the enemy is not hit for several seconds.

- Momentum
  - Moving quickly increases your bullet damage, up to 50%.
  - Standing still removes the bonus.

- Blood Magic
  - Your weapon no longer uses ammunition.
  - Every shot instead costs a small amount of health.
  - Cannot reduce you below 1 HP.

- The Hydra
  - Every bullet splits into three smaller bullets shortly after being fired.
  - Each split bullet deals 40% damage.

- Pandora's Box
  - Every shot has a small chance to gain a random beneficial effect and a smaller chance to gain a random negative effect.
  - Effects last for only a few seconds.

- Echo
  - Every fifth shot repeats itself automatically a moment later.
  - The repeated shot deals 75% damage.

- Minotaur's Charge
  - Bullets gain damage based on how long the player has been moving continuously.
  - Stopping resets the bonus.

- Styx Rounds
  - Bullets pass through enemies but disappear when they hit a wall.
  - Enemies killed by these bullets cannot be revived.

- Fate's Thread
  - Every 10th shot is guaranteed to critically hit.
  - The counter is shared across the weapon.

- Nemesis
  - Every time you take damage, your weapon gains 25% damage for 5 seconds.
  - Taking damage again refreshes the duration but does not stack the bonus.

Relics:

- When you kill an enemy, gain 20% damage for the next 10 seconds
- You have 3 dashes

Additional Relics:

- Blood of the Gods
  - Killing an enemy restores 1% of your maximum health.
  - Cannot trigger more than once every 0.25 seconds.

- Hunter's Eye
  - Enemies below 25% health are highlighted.

- Hermes' Sandals
  - Movement speed increased by 10%.

- Aegis
  - The first hit you take after entering a new room deals no damage.
  - The protection disappears after triggering.

- Broken Hourglass
  - Your dash cooldown is reduced by 20%.

- Charon's Coin
  - Every 10th enemy killed drops a small amount of healing.
  - Healing is deliberately modest.

- Warrior's Blood
  - Gain 10% increased damage while below 50% health.

- Spartan Shield
  - Taking damage temporarily reduces incoming damage by 25% for 2 seconds.

- Achilles' Heel
  - Deal 50% more damage while at full health.
  - Losing health removes the bonus until you heal back to full.

- Cerberus' Fang
  - Killing an enemy has a small chance to cause two additional enemies nearby to take a burst of damage.

- Midas' Touch
  - Gold pickups increase your damage slightly for the remainder of the current level.
  - The bonus resets when entering a new level.

- Spear of Destiny
  - Every 20th shot fired deals 5x damage.

- Bruno's Flame
  - Enemies that die while burning have a chance to leave a small patch of fire behind.

- Icarus' Wings
  - Your dash travels farther.
  - Does not give additional dashes.

- Tortoise Shell
  - Take 15% less damage.
  - Your movement speed is reduced by 5%.

- Ghost Step
  - After dashing, you become slightly faster for 2 seconds.

- Styxwalker
  - Environmental hazards deal 50% less damage.

- Fate's Favor
  - Once per level, surviving a hit that would kill you instead leaves you at 1 HP.
  - Does not activate again until the next level.

- Frozen Heart
  - You cannot be slowed or have your movement speed altered.
  - Does not prevent direct stuns or immobilization.

- Berserker's Crown
  - Deal 50% more damage.
  - You take 25% more damage.

- Glass Skull
  - Deal 100% more damage.
  - Your maximum health is reduced by 30%.

- Gambler's Coin
  - At the beginning of each level, randomly gain either 50% increased damage or 25% reduced damage.
  - The effect is revealed when the level begins.

- Pandora's Jar
  - All healing is 50% more effective.
  - Elite enemies deal 25% more damage.

- Sisyphus' Stone
  - Every time you take damage, your damage increases by 10%.
  - The bonus resets when you enter a new level.

- Narcissus
  - Deal 25% more damage while at full health.
  - Take 25% more damage while below 25% health.

- Golden Fleece
  - Picking up a temporary treasure has a chance to extend its duration.

- Thread of Ariadne
  - The entrance and exit of each room are briefly revealed when you enter.

- Prometheus' Flame
  - Your first attack against an enemy always ignites it.

- Medusa's Eye
  - Enemies that stay within a short distance of you for too long are briefly slowed.

- Orpheus' Lyre
  - Reviving an enemy takes twice as long.

- Atlas' Burden
  - You deal 20% more damage but your dash travels 20% less distance.

- Hades' Helm
  - Enemies have a harder time detecting you when you enter a room.
  - Your first attack against an unaware enemy deals bonus damage.

- Moirai's Thread
  - Once per level, when you would take lethal damage, the damage is delayed for 2 seconds.
  - Killing an enemy during those 2 seconds prevents the delayed damage.

Meta progression items:
PLACEHOLDER. DO NOT IMPLEMENT
