// Tile types and their static properties.
(function () {
  'use strict';

  const T = {
    FLOOR: 0,    // walkable ground
    WALL: 1,     // room boundary / maze wall; blocks movement and shots
    OBST: 2,     // cover (tree, rock, statue...); blocks movement and shots; breakable by some boss attacks
    PIT: 3,      // void; the player falls in unless dashing or on a platform
    LIQUID: 4,   // blood / Styx; walkable but damages the player; ground enemies avoid it
    ICE: 5,      // slippery floor
    FAKEWALL: 6, // looks like a wall, but is an illusion (walk and shoot through it)
    CRUMBLE: 7,  // floor that collapses into a pit shortly after being stepped on, then reforms
    SPIKE: 8,    // floor spike trap on a timer
    DOOR: 9,     // doorway in the boundary wall; solid while the room is locked
  };

  // solid: blocks movement; shots: blocks projectiles; ground: counts as standable floor
  const INFO = [];
  INFO[T.FLOOR] = { name: 'floor', solid: false, shots: false, ground: true };
  INFO[T.WALL] = { name: 'wall', solid: true, shots: true, ground: false };
  INFO[T.OBST] = { name: 'obstacle', solid: true, shots: true, ground: false };
  INFO[T.PIT] = { name: 'pit', solid: false, shots: false, ground: false, pit: true };
  INFO[T.LIQUID] = { name: 'liquid', solid: false, shots: false, ground: false, liquid: true };
  INFO[T.ICE] = { name: 'ice', solid: false, shots: false, ground: true, slippery: true };
  INFO[T.FAKEWALL] = { name: 'fakewall', solid: false, shots: false, ground: true };
  INFO[T.CRUMBLE] = { name: 'crumble', solid: false, shots: false, ground: true };
  INFO[T.SPIKE] = { name: 'spike', solid: false, shots: false, ground: true };
  INFO[T.DOOR] = { name: 'door', solid: false, shots: true, ground: true };

  G.T = T;
  G.TileInfo = INFO;
})();
