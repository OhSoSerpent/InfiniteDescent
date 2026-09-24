// DOM overlay screens: main menu, how-to-play, collection, card pick, pause, death, victory.
(function () {
  'use strict';
  const root = document.getElementById('ui');

  function el(tag, attrs = {}, children = []) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'style') e.style.cssText = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    for (const c of [].concat(children)) if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    return e;
  }
  function btn(text, onclick, cls = 'btn') {
    return el('button', { class: cls, text, onclick: () => { G.Audio.play('select'); onclick(); } });
  }
  function glyph(def, cls = 'glyph') {
    return el('div', { class: cls, text: def.glyph || '?', style: `background:${def.color || '#ccc'}` });
  }
  function cardEl(def, opts = {}) {
    const c = el('div', { class: 'card' + (opts.mini ? ' mini' : '') + (opts.cls ? ' ' + opts.cls : '') }, [
      glyph(def),
      el('div', { class: 'name', text: def.name }),
      el('div', { class: 'desc', text: def.desc }),
    ]);
    if (opts.warn) c.appendChild(el('div', { class: 'warn', text: opts.warn }));
    if (opts.onclick) c.addEventListener('click', opts.onclick);
    return c;
  }
  function relicEl(def) {
    return el('div', { class: 'relic' }, [glyph(def), el('div', {}, [el('div', { class: 'name', text: def.name }), el('div', { class: 'desc', text: def.desc })])]);
  }
  function fmtTime(s) { const m = Math.floor(s / 60), r = Math.floor(s % 60); return m + ':' + String(r).padStart(2, '0'); }
  function statsTable(st) {
    const rows = [['Level reached', G.Run.levelIndex], ['Time', fmtTime(st.time)], ['Kills', st.kills], ['Shots fired', st.shots],
      ['Damage dealt', Math.round(st.damageDealt)], ['Damage taken', Math.round(st.damageTaken)], ['Gold', st.gold],
      ['Bosses defeated', G.Run.defeatedBosses.map(id => G.Bosses.get(id).name).join(', ') || 'none']];
    return el('table', { class: 'stats' }, rows.map(([k, v]) => el('tr', {}, [el('td', { text: k }), el('td', { text: String(v) })])));
  }

  const UI = {
    current: null,
    hide() { root.innerHTML = ''; this.current = null; },
    _screen(cls = '') {
      root.innerHTML = '';
      const s = el('div', { class: 'screen ' + cls });
      root.appendChild(s);
      return s;
    },

    // message: optional line shown under the title (e.g. after a victory).
    menu(message) {
      this.current = 'menu';
      const s = this._screen('clear');
      const S = G.Save.data;
      s.appendChild(el('h1', { text: G.CFG.TITLE }));
      s.appendChild(el('p', { class: 'sub', text: 'Descend through the nine circles. Defeat what waits at the bottom.' }));
      if (message) s.appendChild(el('div', { class: 'panel', style: 'margin-top:0.6em' }, [el('p', { text: message })]));
      s.appendChild(el('div', { style: 'height:1em' }));
      s.appendChild(btn('DESCEND', () => G.Game.newRun()));
      s.appendChild(btn('HOW TO PLAY', () => this.howto()));
      s.appendChild(btn('COLLECTION', () => this.collection()));
      s.appendChild(btn(G.Audio.muted ? 'SOUND: OFF' : 'SOUND: ON', () => { G.Game.toggleMute(); this.menu(); }));
      s.appendChild(el('div', { style: 'height:1em' }));
      s.appendChild(el('p', { class: 'sub', text: `Runs ${S.stats.runs}  |  Victories ${S.stats.wins}  |  Deepest level ${S.stats.bestLevel}  |  Meta items ${S.meta.length}` }));
    },

    howto() {
      this.current = 'howto';
      const s = this._screen();
      s.appendChild(el('h2', { text: 'HOW TO PLAY' }));
      const rows = [
        ['WASD / Arrows', 'Move'], ['Mouse', 'Aim'], ['Left click (hold)', 'Shoot'],
        ['Space / Shift / Right click', 'Dash (invulnerable; jumps shockwaves and pits)'],
        ['R', 'Reload'], ['1 / 2  or  Q', 'Switch pistol'], ['Esc / P', 'Pause'], ['M', 'Mute'],
        ['Gamepad', 'L-stick move, R-stick aim, RT/RB shoot, LT/LB/A dash, X reload, Y swap, Start pause'],
      ];
      s.appendChild(el('div', { class: 'panel' }, [
        el('table', { class: 'controls' }, rows.map(([k, v]) => el('tr', {}, [el('td', { text: k }), el('td', { text: v })]))),
        el('div', { style: 'height:0.6em' }),
        el('p', { text: 'You carry two pistols (20 rounds each). After each level\'s boss, choose one of three cards and slot it into a pistol - each pistol holds 3 cards. Cards of the same kind (e.g. two projectile types) replace each other.' }),
        el('p', { text: 'Every level hides a relic room. Relics are global and you get what you get. Clear rooms to open the doors; the boss waits in the farthest room.' }),
        el('p', { text: 'Nine circles, nine bosses - then the one below them all.' }),
      ]));
      s.appendChild(el('div', { style: 'height:0.6em' }));
      s.appendChild(btn('BACK', () => this.menu()));
    },

    collection() {
      this.current = 'collection';
      const s = this._screen();
      const S = G.Save.data;
      s.appendChild(el('h2', { text: 'COLLECTION' }));
      const panel = el('div', { class: 'panel scroll' });
      panel.appendChild(el('h3', { text: 'Meta-progression items (' + S.meta.length + ')' }));
      if (!S.meta.length) panel.appendChild(el('p', { class: 'sub', text: 'None yet. Defeat Satan to claim one.' }));
      const counts = {};
      for (const m of S.meta) counts[m.id] = (counts[m.id] || 0) + 1;
      for (const [id, n] of Object.entries(counts)) {
        const def = G.Meta.has(id) ? G.Meta.get(id) : { name: id, desc: '' };
        panel.appendChild(el('p', { text: `${def.name} x${n} - ${def.desc}` }));
      }
      panel.appendChild(el('h3', { text: 'Bosses defeated' }));
      const bd = Object.entries(S.bossesDefeated);
      if (!bd.length) panel.appendChild(el('p', { class: 'sub', text: 'None yet.' }));
      for (const [id, n] of bd) if (G.Bosses.has(id)) panel.appendChild(el('p', { text: `${G.Bosses.get(id).name} x${n}` }));
      s.appendChild(panel);
      s.appendChild(el('div', { style: 'height:0.6em' }));
      s.appendChild(btn('BACK', () => this.menu()));
    },

    // cards: array of defs. onDone(chosenOrNull)
    cardPick(cards, opts, onDone) {
      this.current = 'cardpick';
      const P = G.World.player;
      let selected = null;
      const s = this._screen();
      const render = () => {
        s.innerHTML = '';
        s.appendChild(el('h2', { text: opts.title || 'CHOOSE A CARD' }));
        s.appendChild(el('p', { class: 'sub', text: selected ? 'Choose a slot for ' + selected.name + '.' : (opts.subtitle || 'Pick one card to add to a pistol.') }));
        s.appendChild(el('div', { style: 'height:0.5em' }));
        s.appendChild(el('div', { class: 'row' }, cards.map(def => cardEl(def, {
          cls: selected === def ? 'selected' : '',
          onclick: () => { G.Audio.play('select'); selected = def; render(); },
        }))));
        s.appendChild(el('div', { style: 'height:0.8em' }));
        if (selected) {
          const row = el('div', { class: 'row' });
          P.weapons.forEach(w => {
            const pl = G.CardRules.placements(selected, w);
            const box = el('div', { class: 'weaponbox' }, [el('h3', { text: w.name.toUpperCase() + (pl.forced ? ' - ' + pl.reason : '') })]);
            const slots = el('div', { class: 'row' });
            for (let i = 0; i < 3; i++) {
              const card = w.cards[i];
              const allowed = pl.slots.includes(i);
              const cls = 'slot' + (card ? '' : ' empty') + (allowed ? (pl.forced ? ' forced' : '') : ' blocked');
              const click = allowed ? () => {
                G.Audio.play('relic');
                w.setCard(selected, i);
                this.hide();
                onDone(selected);
              } : null;
              if (card) slots.appendChild(cardEl(card.def, { mini: true, cls, onclick: click, warn: allowed ? 'Replace' : null }));
              else slots.appendChild(el('div', { class: 'card mini ' + cls, text: allowed ? 'EMPTY - PLACE HERE' : 'EMPTY', onclick: click || (() => {}) }));
            }
            box.appendChild(slots);
            row.appendChild(box);
          });
          s.appendChild(row);
        }
        s.appendChild(el('div', { style: 'height:0.6em' }));
        s.appendChild(btn('SKIP', () => { this.hide(); onDone(null); }, 'btn small'));
      };
      render();
    },

    pause() {
      this.current = 'pause';
      const s = this._screen();
      const P = G.World.player;
      s.appendChild(el('h2', { text: 'PAUSED' }));
      s.appendChild(el('p', { class: 'sub', text: 'Level ' + G.Run.levelIndex + ' - ' + G.World.level.biome.name }));
      const row = el('div', { class: 'row' });
      P.weapons.forEach(w => {
        const box = el('div', { class: 'weaponbox' }, [el('h3', { text: w.name.toUpperCase() + '  (' + (w.flags.bloodMagic ? 'blood' : w.stats.mag) + ' rds)' })]);
        const cards = el('div', { class: 'row' });
        for (let i = 0; i < 3; i++) cards.appendChild(w.cards[i] ? cardEl(w.cards[i].def, { mini: true }) : el('div', { class: 'card mini slot empty', text: 'EMPTY' }));
        box.appendChild(cards);
        row.appendChild(box);
      });
      s.appendChild(row);
      if (G.Run.relics.length) {
        s.appendChild(el('h3', { text: 'RELICS' }));
        s.appendChild(el('div', { class: 'relicgrid scroll', style: 'max-height:30vh' }, G.Run.relics.map(r => relicEl(r.def))));
      }
      s.appendChild(el('div', { style: 'height:0.6em' }));
      s.appendChild(btn('RESUME', () => G.Game.resume()));
      s.appendChild(btn(G.Audio.muted ? 'SOUND: OFF' : 'SOUND: ON', () => { G.Game.toggleMute(); this.pause(); }));
      s.appendChild(btn('ABANDON RUN', () => this.confirmQuit()));
    },
    confirmQuit() {
      const s = this._screen();
      s.appendChild(el('h2', { text: 'ABANDON THIS RUN?' }));
      s.appendChild(el('p', { class: 'sub', text: 'Progress in this run will be lost.' }));
      s.appendChild(btn('YES, ABANDON', () => G.Game.quitToMenu()));
      s.appendChild(btn('NO, KEEP GOING', () => this.pause()));
    },

    dead() {
      this.current = 'dead';
      const s = this._screen();
      s.appendChild(el('h1', { text: 'YOU DIED' }));
      s.appendChild(el('p', { class: 'sub', text: 'Fallen in ' + G.World.level.biome.name + '.' }));
      s.appendChild(el('div', { class: 'panel' }, [statsTable(G.Run.stats)]));
      s.appendChild(el('div', { style: 'height:0.6em' }));
      s.appendChild(btn('DESCEND AGAIN', () => G.Game.newRun()));
      s.appendChild(btn('MAIN MENU', () => G.Game.quitToMenu()));
    },

  };

  G.UI = UI;
})();
