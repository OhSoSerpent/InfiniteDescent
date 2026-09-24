// Keyboard + mouse + gamepad input, exposed as game "actions".
(function () {
  'use strict';
  const { W, H } = G.CFG;

  const BIND = {
    up: ['KeyW', 'ArrowUp'],
    down: ['KeyS', 'ArrowDown'],
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    dash: ['Space', 'ShiftLeft', 'ShiftRight'],
    reload: ['KeyR'],
    weapon1: ['Digit1', 'Numpad1'],
    weapon2: ['Digit2', 'Numpad2'],
    swap: ['KeyQ'],
    pause: ['Escape', 'KeyP'],
    mute: ['KeyM'],
  };
  const PAD_DEAD = 0.25;

  const Input = {
    keys: new Set(),
    pressedKeys: new Set(),
    mouse: { x: W / 2, y: H / 2, buttons: [false, false, false], pressed: [false, false, false] },
    pad: { connected: false, axes: [0, 0, 0, 0], buttons: [], prev: [] },
    device: 'kb', // 'kb' or 'pad' — decides which aim source is used

    init(canvas) {
      window.addEventListener('keydown', e => {
        if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
        if (!this.keys.has(e.code)) this.pressedKeys.add(e.code);
        this.keys.add(e.code);
        this.device = 'kb';
        G.Audio.unlock();
      });
      window.addEventListener('keyup', e => this.keys.delete(e.code));
      window.addEventListener('blur', () => {
        this.keys.clear();
        this.mouse.buttons = [false, false, false];
      });
      const updateMouse = e => {
        const r = canvas.getBoundingClientRect();
        this.mouse.x = ((e.clientX - r.left) / r.width) * W;
        this.mouse.y = ((e.clientY - r.top) / r.height) * H;
      };
      window.addEventListener('mousemove', e => { updateMouse(e); this.device = 'kb'; });
      canvas.addEventListener('mousedown', e => {
        updateMouse(e);
        if (e.button < 3) { this.mouse.buttons[e.button] = true; this.mouse.pressed[e.button] = true; }
        this.device = 'kb';
        G.Audio.unlock();
      });
      window.addEventListener('mouseup', e => { if (e.button < 3) this.mouse.buttons[e.button] = false; });
      canvas.addEventListener('contextmenu', e => e.preventDefault());
    },

    // Called once per rendered frame before game updates.
    poll() {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      let p = null;
      for (const gp of pads) if (gp && gp.connected) { p = gp; break; }
      const pad = this.pad;
      pad.prev = pad.buttons.slice();
      if (!p) { pad.connected = false; pad.buttons = []; return; }
      pad.connected = true;
      pad.axes = [p.axes[0] || 0, p.axes[1] || 0, p.axes[2] || 0, p.axes[3] || 0];
      pad.buttons = p.buttons.map(b => b.pressed || b.value > 0.5);
      if (pad.buttons.some(b => b) || pad.axes.some(a => Math.abs(a) > 0.4)) this.device = 'pad';
    },
    // Called at the end of each fixed update step that consumed "pressed" edges.
    endStep() {
      this.pressedKeys.clear();
      this.mouse.pressed = [false, false, false];
      this.pad.prev = this.pad.buttons.slice();
    },

    down(action) { return BIND[action].some(k => this.keys.has(k)); },
    hit(action) { return BIND[action].some(k => this.pressedKeys.has(k)); },
    padDown(i) { return !!this.pad.buttons[i]; },
    padHit(i) { return !!this.pad.buttons[i] && !this.pad.prev[i]; },

    move() {
      let x = 0, y = 0;
      if (this.down('left')) x -= 1;
      if (this.down('right')) x += 1;
      if (this.down('up')) y -= 1;
      if (this.down('down')) y += 1;
      if (this.pad.connected) {
        const ax = this.pad.axes[0], ay = this.pad.axes[1];
        if (Math.hypot(ax, ay) > PAD_DEAD) { x += ax; y += ay; }
      }
      const l = Math.hypot(x, y);
      if (l > 1) { x /= l; y /= l; }
      return { x, y };
    },
    // Aim angle; (sx, sy) is the player's screen position.
    aim(sx, sy, prevAngle) {
      if (this.device === 'pad' && this.pad.connected) {
        const ax = this.pad.axes[2], ay = this.pad.axes[3];
        if (Math.hypot(ax, ay) > PAD_DEAD) return Math.atan2(ay, ax);
        const m = this.move();
        if (Math.hypot(m.x, m.y) > 0.2) return Math.atan2(m.y, m.x);
        return prevAngle;
      }
      return Math.atan2(this.mouse.y - sy, this.mouse.x - sx);
    },
    fire() { return this.mouse.buttons[0] || this.padDown(7) || this.padDown(5); },
    dash() { return this.hit('dash') || this.mouse.pressed[2] || this.padHit(6) || this.padHit(4) || this.padHit(0); },
    reload() { return this.hit('reload') || this.padHit(2); },
    weapon1() { return this.hit('weapon1'); },
    weapon2() { return this.hit('weapon2'); },
    swap() { return this.hit('swap') || this.padHit(3); },
    pause() { return this.hit('pause') || this.padHit(9); },
    mute() { return this.hit('mute'); },
  };

  G.Input = Input;
})();
