// Meta-progression items (persist between runs).
// The design sheet marks the actual items as "PLACEHOLDER. DO NOT IMPLEMENT", so only the
// framework exists: Satan drops one of these, picking it up records it in the save file.
// To add real items later, register definitions here with an `id`, `name`, `desc`, and
// whatever hooks the run should read (e.g. an `onRunStart(run)` function).
(function () {
  'use strict';

  G.Meta.add({
    id: 'placeholder_relic',
    name: 'Unknown Relic',
    desc: 'A meta-progression item. (Placeholder: its effect has not been designed yet.)',
    placeholder: true,
  });

  // Picks a random meta item to drop.
  G.Meta.roll = function () {
    const all = G.Meta.all();
    return all.length ? G.rng.pick(all).id : null;
  };
})();
