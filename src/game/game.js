// Game state machine and main loop (fixed 60 Hz simulation, render every frame).
(function () {
  'use strict';
  const D = G.Draw, U = G.U;
  const { W, H } = G.CFG;
  const STEP = 1 / 60;

  const Game = {
    state: 'menu', // 'menu' | 'play' | 'paused' | 'cardpick' | 'dead' | 'victory'
    slowT: 0,
    timers: [],
    acc: 0, last: 0,
    menuT: 0,

    init() {
      D.resize();
      window.addEventListener('resize', () => D.resize());
      G.Input.init(D.canvas);
      G.Save.load();
      G.Audio.setMuted(!!G.Save.data.settings.muted);
      G.UI.menu();
      requestAnimationFrame(ts => { this.last = ts; this.loop(ts); });
    },

    loop(ts) {
      const dt = Math.min(0.1, (ts - this.last) / 1000);
      this.last = ts;
      G.Input.poll();
      this.acc += dt;
      let steps = 0;
      while (this.acc >= STEP && steps < 6) {
        this.step(STEP);
        this.acc -= STEP;
        steps++;
      }
      if (steps >= 6) this.acc = 0;
      this.render();
      requestAnimationFrame(t => this.loop(t));
    },

    after(t, fn) { this.timers.push({ t, fn }); },

    step(dt) {
      const In = G.Input;
      if (In.mute()) this.toggleMute();
      for (let i = this.timers.length - 1; i >= 0; i--) {
        const tm = this.timers[i];
        if (this.state === 'paused' || this.state === 'cardpick') break;
        tm.t -= dt;
        if (tm.t <= 0) { this.timers.splice(i, 1); tm.fn(); }
      }
      switch (this.state) {
        case 'play': {
          if (In.pause()) { this.pause(); break; }
          let edt = dt;
          if (this.slowT > 0) { this.slowT -= dt; edt = dt * 0.35; }
          G.World.update(edt);
          G.HUD.update(dt);
          if (G.Run.active) G.Run.stats.time += dt;
          break;
        }
        case 'paused':
          if (In.pause()) this.resume();
          break;
        case 'dead':
          G.World.update(dt * 0.5);
          break;
        case 'menu':
          this.menuT += dt;
          break;
        default: break;
      }
      In.endStep();
    },

    render() {
      const ctx = D.ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#07060a';
      ctx.fillRect(0, 0, W, H);
      if (this.state === 'menu') { this._menuBg(ctx); return; }
      G.World.draw(ctx);
      if (this.state !== 'dead') G.HUD.draw(ctx);
    },

    _menuBg(ctx) {
      const t = this.menuT;
      for (let i = 0; i < 9; i++) {
        const r = 30 + i * 22 + (t * 6) % 22;
        D.alpha(0.08 + i * 0.012, () => D.ring(W / 2, H * 0.62, r, i % 2 ? '#e0443a' : '#6a2030', 2));
      }
      for (let i = 0; i < 40; i++) {
        const x = (U.hash2(i, 1) * W + Math.sin(t * 0.5 + i) * 10) % W;
        const y = H - ((t * (10 + U.hash2(i, 2) * 30) + U.hash2(i, 3) * H) % H);
        D.rect(x, y, 1, 1, i % 3 ? '#ff6020' : '#ffd060');
      }
    },

    // ---------------------------------------------------------------- flow
    newRun() {
      G.UI.hide();
      G.HUD.reset();
      this.timers = [];
      this.slowT = 0;
      G.FX.clear();
      G.Run.start((Math.random() * 0xffffffff) >>> 0);
      this.state = 'play';
    },
    pause() {
      if (this.state !== 'play') return;
      this.state = 'paused';
      G.UI.pause();
    },
    resume() {
      if (this.state !== 'paused') return;
      G.UI.hide();
      this.state = 'play';
    },
    quitToMenu(message) {
      G.Run.end();
      G.World.reset();
      G.HUD.reset();
      this.timers = [];
      this.state = 'menu';
      G.UI.menu(message);
    },
    toggleMute() {
      G.Audio.setMuted(!G.Audio.muted);
      G.Save.data.settings.muted = G.Audio.muted;
      G.Save.save();
    },
    slowmo(t) { this.slowT = t; },

    // opts: { title, subtitle, onDone }
    openCardPick(opts = {}) {
      if (this.state !== 'play') return;
      this.state = 'cardpick';
      const cards = G.Run.rollCards(3);
      G.UI.cardPick(cards, opts, () => {
        this.state = 'play';
        if (opts.onDone) opts.onDone();
      });
    },

    // Called shortly after a boss dies.
    afterBoss(room, boss) {
      const cx = room.pxW / 2, cy = room.pxH / 2;
      if (G.Run.levelIndex >= G.Run.LAST_LEVEL) {
        room.props.push(new G.Props.MetaItem({ x: boss.x, y: boss.y, metaId: G.Meta.roll() }));
        G.HUD.banner('SATAN FALLS', 'Claim your prize.', 3);
        return;
      }
      // Flawless level (no HP lost anywhere on it): an extra relic drops.
      if (!G.Run.levelHit) {
        const id = G.Run.drawRelic();
        if (id) {
          const pt = room.nearestGround(cx, cy + 56);
          room.props.push(new G.Props.RelicPedestal({ x: pt.x, y: pt.y, relicId: id }));
          G.HUD.toast('FLAWLESS LEVEL! A RELIC APPEARS', '#ffe060');
          G.FX.burst(pt.x, pt.y, 30, '#ffe060', 70, 0.6);
        }
      }
      const spawnPortal = () => {
        const pt = room.nearestGround(cx, cy);
        const last = G.Run.levelIndex === G.Run.LAST_LEVEL - 1;
        room.props.push(new G.Props.Portal({
          x: pt.x, y: pt.y, label: last ? 'THE ABYSS' : 'DESCEND', color: last ? '#ff3030' : '#c040ff',
          onEnter: () => this.nextLevel(),
        }));
      };
      this.openCardPick({ title: 'LEVEL ' + G.Run.levelIndex + ' COMPLETE', subtitle: 'Choose one card to add to a pistol.', onDone: spawnPortal });
    },

    nextLevel() {
      G.FX.flash('#000000', 0.3);
      G.Run.nextLevel();
    },

    onPlayerDeath() {
      const S = G.Save.data;
      S.stats.deaths++;
      S.stats.kills += G.Run.stats.kills;
      G.Save.save();
      this.after(1.6, () => {
        this.state = 'dead';
        G.UI.dead();
      });
    },

    collectMetaItem(id) {
      const S = G.Save.data;
      const def = id && G.Meta.has(id) ? G.Meta.get(id) : null;
      if (def) S.meta.push({ id: def.id, name: def.name, obtainedAt: Date.now() });
      S.stats.wins++;
      S.stats.kills += G.Run.stats.kills;
      G.Save.save();
      G.Audio.play('relic');
      G.FX.flash('#ffffff', 0.6);
      G.HUD.banner(def ? def.name.toUpperCase() : 'VICTORY', 'The descent is over.', 2.5);
      G.World.inputLocked = true;
      this.after(2.5, () => {
        G.World.inputLocked = false;
        this.quitToMenu('Satan has fallen. You claimed: ' + (def ? def.name : 'nothing') + '.');
      });
    },
  };

  G.Game = Game;
})();
