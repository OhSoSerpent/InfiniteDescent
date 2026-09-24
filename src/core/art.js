// Procedural pixel-art painters. Everything visual in the game is drawn from
// these parametric painters, so new enemies/bosses only need a palette + options.
(function () {
  'use strict';
  const U = G.U;
  const D = G.Draw;

  // Returns a function that draws grid-pixel rects, mirrored when flip is set.
  function grid(ctx, ox, oy, s, flip, gw, flash) {
    return (x, y, w, h, col) => {
      if (!col) return;
      ctx.fillStyle = flash ? '#ffffff' : col;
      const gx = flip ? gw - x - w : x;
      ctx.fillRect(ox + gx * s, oy + y * s, w * s, h * s);
    };
  }

  // Crisp circle on an arbitrary context (obstacle painters draw into room caches).
  function circOn(ctx, x, y, r, col) {
    ctx.fillStyle = col;
    for (let dy = -r; dy <= r; dy++) {
      const w = Math.floor(Math.sqrt(r * r - dy * dy));
      ctx.fillRect(x - w, y + dy, w * 2 + 1, 1);
    }
  }

  const Art = {};

  // ---------------------------------------------------------------- weapons
  // Draws a held weapon at hand position, rotated to angle (world radians).
  Art.weapon = function (ctx, hx, hy, ang, type, s, col, flash) {
    if (!type || type === 'none') return;
    const c = x => (flash ? '#ffffff' : x);
    const wood = c(col && col.wood || '#7a5230');
    const metal = c(col && col.metal || '#c8c8d0');
    const accent = c(col && col.accent || '#f0c040');
    ctx.save();
    ctx.translate(Math.round(hx), Math.round(hy));
    ctx.rotate(ang);
    const R = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x * s, y * s, w * s, h * s); };
    switch (type) {
      case 'pistol':
        R(0, -1, 6, 2, metal); R(0, 0, 2, 3, wood); R(5, -1, 1, 1, '#333');
        break;
      case 'spear':
        R(-6, -0.5, 22, 1, wood); R(16, -1.5, 3, 3, metal); R(19, -0.5, 2, 1, metal);
        break;
      case 'bigspear':
        R(-8, -0.5, 26, 1.2, wood); R(18, -2, 4, 4, metal); R(22, -1, 3, 2, metal);
        break;
      case 'oar':
        R(-6, -0.5, 20, 1, wood); R(14, -2, 7, 4, wood); R(15, -1, 5, 2, c('#5a3a20'));
        break;
      case 'sword':
        R(-1, -1.5, 1, 3, accent); R(0, -0.5, 10, 1.2, metal); R(-3, -0.5, 2, 1, wood);
        break;
      case 'bigsword':
        R(-1, -2.5, 1.5, 5, accent); R(0, -1, 15, 2, metal); R(14, -0.5, 2, 1, metal); R(-4, -0.5, 3, 1, wood);
        break;
      case 'goldsword':
        R(-1, -2.5, 1.5, 5, c('#fff0a0')); R(0, -1, 15, 2, accent); R(14, -0.5, 2, 1, accent); R(-4, -0.5, 3, 1, wood);
        break;
      case 'club':
        R(-2, -0.5, 6, 1.5, wood); R(4, -1.5, 6, 3, wood); R(9, -2, 3, 4, wood); R(6, -2, 1, 1, c('#4a3018'));
        break;
      case 'staff':
        R(-5, -0.5, 18, 1, wood); ctx.fillStyle = c('#ff8a20'); ctx.fillRect(13 * s, -2 * s, 3 * s, 4 * s);
        ctx.fillStyle = c('#ffe060'); ctx.fillRect(14 * s, -1 * s, 1 * s, 2 * s);
        break;
      case 'daggers':
        R(0, -0.5, 6, 1, metal); R(-1, -1.5, 1, 3, accent); R(0, 2, 5, 1, metal); R(-1, 1, 1, 3, accent);
        break;
      case 'dagger':
        R(0, -0.5, 6, 1, metal); R(-1, -1.5, 1, 3, accent);
        break;
      case 'chains':
        for (let i = 0; i < 5; i++) R(i * 2, (i % 2) - 0.5, 2, 1, metal);
        break;
      case 'bow':
        ctx.strokeStyle = wood; ctx.lineWidth = s;
        ctx.beginPath(); ctx.arc(-2 * s, 0, 6 * s, -1.1, 1.1); ctx.stroke();
        ctx.strokeStyle = c('#ddd'); ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(Math.cos(-1.1) * 6 * s - 2 * s, Math.sin(-1.1) * 6 * s);
        ctx.lineTo(Math.cos(1.1) * 6 * s - 2 * s, Math.sin(1.1) * 6 * s); ctx.stroke();
        break;
      case 'device':
        R(0, -1, 9, 2, accent); R(8, -1.5, 2, 3, accent); R(2, -1.5, 1, 3, c('#8a6a20'));
        break;
      case 'claws':
        R(0, -2, 5, 1, c('#e8e0d0')); R(0, 0, 6, 1, c('#e8e0d0')); R(0, 2, 5, 1, c('#e8e0d0'));
        break;
      case 'fists':
        R(0, -1, 3, 3, c(col && col.skin || '#d8a070'));
        break;
      case 'heart':
        R(1, -1, 1, 1, c('#ff4080')); R(3, -1, 1, 1, c('#ff4080')); R(1, 0, 3, 1, c('#ff4080')); R(2, 1, 1, 1, c('#ff4080'));
        break;
      default:
        R(0, -0.5, 6, 1, metal);
    }
    ctx.restore();
  };

  // ---------------------------------------------------------------- humanoid
  // o: { s, facing, t, moving, aim, skin, body, legs, hair, eye, head, headCol, plume,
  //      beard, cape, weapon, wcol, shield, shieldCol, flash, glow, crownCol, belt }
  Art.humanoid = function (ctx, x, y, o) {
    const s = o.s || 1, gw = 10;
    const flip = (o.facing || 1) < 0;
    const ox = Math.round(x - (gw * s) / 2), oy = Math.round(y - 8 * s);
    const f = !!o.flash;
    const p = grid(ctx, ox, oy, s, flip, gw, f);
    const skin = o.skin || '#d8a070', body = o.body || '#8a3030', legs = o.legs || U.shade(body, -0.35);
    const hair = o.hair || '#3a2a1a', eye = o.eye || '#101010';

    if (!o.noShadow) D.ellipse(x, oy + 14 * s, 3.5 * s, 1.2 * s, 'rgba(0,0,0,0.35)');

    // legs
    const step = o.moving ? Math.sin((o.t || 0) * 14) : 0;
    const lUp = step > 0.3 ? 1 : 0, rUp = step < -0.3 ? 1 : 0;
    p(3, 11 - lUp, 2, 3, legs); p(5, 11 - rUp, 2, 3, legs);
    p(3, 13 - lUp, 2, 1, U.shade(legs, -0.4)); p(5, 13 - rUp, 2, 1, U.shade(legs, -0.4));
    // cape (behind)
    if (o.cape) { p(1, 5, 2, 7, o.cape); p(2, 12, 1, 1, U.shade(o.cape, -0.3)); }
    // torso
    p(2, 6, 6, 5, body);
    p(2, 6, 6, 1, U.shade(body, 0.15));
    p(2, 9, 6, 1, o.belt || U.shade(body, -0.35));
    if (o.trim) p(4, 6, 2, 3, o.trim);
    // arms
    p(1, 6, 1, 4, U.shade(body, -0.2)); p(1, 10, 1, 1, skin);
    p(8, 6, 1, 3, body); p(8, 9, 1, 1, skin);
    // head
    p(3, 1, 4, 5, skin);
    p(3, 1, 4, 1, hair); p(3, 2, 1, 2, hair);
    p(5, 3, 1, 1, o.glow || eye); p(6, 3, 1, 1, o.glow || eye);
    if (o.beard) { p(4, 4, 3, 2, o.beard); p(3, 4, 1, 1, o.beard); }
    const hc = o.headCol || '#9aa0a8';
    switch (o.head) {
      case 'helmet':
        p(2, 0, 6, 2, hc); p(2, 2, 1, 3, hc); p(7, 2, 1, 1, hc);
        if (o.plume) { p(3, -2, 4, 2, o.plume); p(2, -1, 1, 1, o.plume); }
        break;
      case 'crown': {
        const cc = o.crownCol || '#f0c040';
        p(3, 0, 4, 1, cc); p(3, -1, 1, 1, cc); p(5, -1, 1, 1, cc); p(6, -1, 1, 1, cc);
        break;
      }
      case 'laurel':
        p(2, 1, 1, 2, '#5aa040'); p(7, 1, 1, 2, '#5aa040'); p(3, 0, 4, 1, '#5aa040');
        break;
      case 'hood':
        p(2, 0, 6, 2, hc); p(2, 2, 1, 4, hc); p(7, 2, 1, 1, hc); p(3, 1, 1, 1, hc);
        break;
      case 'horns':
        p(2, -1, 1, 2, hc); p(7, -1, 1, 2, hc); p(1, -2, 1, 1, hc); p(8, -2, 1, 1, hc);
        break;
      case 'wild':
        p(2, 0, 6, 1, hair); p(2, 1, 1, 3, hair); p(3, -1, 1, 1, hair); p(6, -1, 1, 1, hair);
        break;
      case 'veil':
        p(2, 0, 6, 1, hc); p(2, 1, 1, 6, hc); p(7, 1, 1, 2, hc);
        break;
      case 'long':
        p(2, 0, 6, 1, hair); p(2, 1, 1, 6, hair); p(3, 5, 1, 2, hair);
        break;
      default: break;
    }
    // shield (front)
    if (o.shield) {
      const sc = o.shieldCol || '#b08030';
      p(7, 5, 3, 6, sc); p(7, 5, 3, 1, U.shade(sc, 0.3)); p(8, 7, 1, 2, U.shade(sc, -0.3));
    }
    // weapon
    if (o.weapon) {
      const hx = x + (flip ? -3 : 3) * s, hy = oy + 9 * s;
      Art.weapon(ctx, hx, hy, o.aim !== undefined ? o.aim : (flip ? Math.PI : 0), o.weapon, s, o.wcol, f);
    }
  };

  // ---------------------------------------------------------------- quadruped
  // o: { s, facing, t, moving, body, belly, eye, heads, horns, tusks, mane, spikes,
  //      stone, flash, legsN }
  Art.quadruped = function (ctx, x, y, o) {
    const s = o.s || 1, gw = 16;
    const flip = (o.facing || 1) < 0;
    const ox = Math.round(x - (gw * s) / 2), oy = Math.round(y - 6 * s);
    const p = grid(ctx, ox, oy, s, flip, gw, !!o.flash);
    const body = o.body || '#7a6a5a', belly = o.belly || U.shade(body, 0.2), eye = o.eye || '#101010';
    const dark = U.shade(body, -0.3);
    if (!o.noShadow) D.ellipse(x, oy + 10 * s, 6 * s, 1.5 * s, 'rgba(0,0,0,0.35)');
    const step = o.moving ? Math.sin((o.t || 0) * 16) : 0;
    const a = step > 0 ? 1 : 0, b = step <= 0 && o.moving ? 1 : 0;
    // legs
    p(3, 7, 2, 3 - a, dark); p(6, 7, 2, 3 - b, dark); p(10, 7, 2, 3 - b, dark); p(12, 7, 2, 3 - a, dark);
    // tail
    p(0, 2, 2, 1, body); p(1, 3, 2, 1, body);
    // body
    p(2, 3, 12, 4, body); p(3, 2, 10, 1, body);
    p(4, 6, 8, 1, belly);
    if (o.stone) { p(5, 3, 1, 1, dark); p(9, 4, 1, 1, dark); p(7, 5, 2, 1, U.shade(body, 0.25)); }
    if (o.spikes) for (let i = 3; i < 13; i += 2) p(i, 1, 1, 1, o.spikes);
    if (o.mane) p(10, 1, 3, 4, o.mane);
    // heads
    const heads = o.heads || 1;
    const offs = heads === 1 ? [0] : heads === 2 ? [-2, 1] : [-3, 0, 3];
    offs.forEach((dy, i) => {
      const hx = 12 + (i === 1 && heads === 3 ? 1 : 0);
      p(hx, 1 + dy, 4, 3, body);
      p(hx + 3, 2 + dy, 1, 2, U.shade(body, -0.15)); // snout
      p(hx + 2, 1 + dy, 1, 1, o.glow || eye);
      p(hx, 0 + dy, 1, 1, dark); // ear
      if (o.horns) { p(hx, -1 + dy, 1, 1, o.horns); p(hx + 1, -2 + dy, 1, 1, o.horns); }
      if (o.tusks) p(hx + 3, 4 + dy, 1, 1, o.tusks);
    });
  };

  // ---------------------------------------------------------------- bird
  Art.bird = function (ctx, x, y, o) {
    const s = o.s || 1, gw = 12;
    const flip = (o.facing || 1) < 0;
    const ox = Math.round(x - (gw * s) / 2), oy = Math.round(y - 4 * s);
    const p = grid(ctx, ox, oy, s, flip, gw, !!o.flash);
    const body = o.body || '#6a4a2a', wing = o.wing || U.shade(body, -0.2);
    D.ellipse(x, y + 9 * s, 3 * s, 1 * s, 'rgba(0,0,0,0.25)');
    const flap = Math.sin((o.t || 0) * 18) > 0;
    p(3, 3, 6, 3, body); p(9, 2, 2, 2, body); p(11, 3, 1, 1, o.beak || '#e0b030');
    p(10, 2, 1, 1, o.glow || '#101010');
    p(1, 4, 2, 1, body);
    if (flap) { p(4, 0, 4, 3, wing); p(3, 0, 1, 1, wing); } else { p(4, 6, 4, 2, wing); p(3, 7, 1, 1, wing); }
    if (o.extraEyes) { p(8, 3, 1, 1, o.glow || '#f00'); }
  };

  // ---------------------------------------------------------------- spirit
  // Ghostly humanoid top with a wispy tail. o: { s, facing, t, body, glow, weapon, aim, alpha, head }
  Art.spirit = function (ctx, x, y, o) {
    const s = o.s || 1, gw = 10;
    const flip = (o.facing || 1) < 0;
    const bob = Math.sin((o.t || 0) * 4) * s;
    const ox = Math.round(x - (gw * s) / 2), oy = Math.round(y - 8 * s + bob);
    const p = grid(ctx, ox, oy, s, flip, gw, !!o.flash);
    const body = o.body || '#a0c0ff', dark = U.shade(body, -0.3), glow = o.glow || '#ffffff';
    D.ellipse(x, y + 7 * s, 3 * s, 1 * s, 'rgba(0,0,0,0.25)');
    const wave = Math.floor((o.t || 0) * 6) % 2;
    p(3, 1, 4, 4, body); p(2, 2, 1, 2, dark);
    p(5, 2, 1, 1, glow); p(6, 2, 1, 1, glow);
    if (o.mouth) p(5, 4, 2, 1, o.mouth);
    p(2, 5, 6, 3, body); p(1, 5, 1, 3, dark); p(8, 5, 1, 2, body);
    p(3, 8, 4, 2, dark); p(4 + wave, 10, 2, 2, dark); p(5 - wave, 12, 1, 1, dark);
    if (o.head === 'crown') { p(3, 0, 4, 1, '#f0c040'); p(3, -1, 1, 1, '#f0c040'); p(6, -1, 1, 1, '#f0c040'); }
    if (o.head === 'horns') { p(2, 0, 1, 1, '#301010'); p(7, 0, 1, 1, '#301010'); }
    if (o.head === 'helmet') { p(2, 0, 6, 2, '#707880'); }
    if (o.weapon) {
      const hx = x + (flip ? -3 : 3) * s, hy = oy + 7 * s;
      Art.weapon(ctx, hx, hy, o.aim !== undefined ? o.aim : (flip ? Math.PI : 0), o.weapon, s, o.wcol, !!o.flash);
    }
  };

  // ---------------------------------------------------------------- snake
  Art.snake = function (ctx, x, y, o) {
    const s = o.s || 1;
    const dir = (o.facing || 1);
    const body = o.flash ? '#fff' : (o.body || '#5a8a3a');
    const belly = o.flash ? '#fff' : (o.belly || U.shade(body, 0.3));
    D.ellipse(x, y + 3 * s, 6 * s, 1.2 * s, 'rgba(0,0,0,0.3)');
    const t = o.t || 0;
    for (let i = 0; i < 6; i++) {
      const sx = x - dir * (i - 2.5) * 2 * s;
      const sy = y + Math.sin(t * 8 + i * 0.9) * 1.5 * s;
      ctx.fillStyle = i % 2 ? belly : body;
      ctx.fillRect(Math.round(sx - s), Math.round(sy - s), 2 * s, 2 * s);
    }
    const hx = x + dir * 6 * s, hy = y + Math.sin(t * 8 - 0.9) * 1.5 * s - s;
    ctx.fillStyle = body; ctx.fillRect(Math.round(hx - 1.5 * s), Math.round(hy - s), 3 * s, 3 * s);
    ctx.fillStyle = o.glow || '#f0e040'; ctx.fillRect(Math.round(hx + dir * s * 0.5), Math.round(hy - s), s, s);
    if (Math.sin(t * 5) > 0.6) { ctx.fillStyle = '#e03030'; ctx.fillRect(Math.round(hx + dir * 2 * s), Math.round(hy + s * 0.5), 2 * s * dir, s * 0.5); }
  };

  // ---------------------------------------------------------------- fly
  Art.fly = function (ctx, x, y, o) {
    const s = o.s || 1;
    const col = o.flash ? '#fff' : (o.body || '#303020');
    D.rect(x - s, y - s, 2 * s, 2 * s, col);
    const wing = Math.floor((o.t || 0) * 30) % 2;
    D.rect(x - 2 * s, y - (wing ? 2 : 1) * s, s, s, 'rgba(220,220,255,0.7)');
    D.rect(x + s, y - (wing ? 2 : 1) * s, s, s, 'rgba(220,220,255,0.7)');
    D.rect(x, y - s, 1, 1, o.eye || '#f00');
  };

  // ---------------------------------------------------------------- demon (Satan)
  Art.demon = function (ctx, x, y, o) {
    const s = o.s || 3;
    const t = o.t || 0;
    // wings behind
    const wingCol = o.flash ? '#fff' : '#3a0a10';
    const flap = Math.sin(t * 3) * 3 * s;
    ctx.fillStyle = wingCol;
    ctx.beginPath();
    ctx.moveTo(x - 3 * s, y - 4 * s);
    ctx.lineTo(x - 14 * s, y - 10 * s - flap);
    ctx.lineTo(x - 12 * s, y + 2 * s);
    ctx.lineTo(x - 8 * s, y - 1 * s);
    ctx.lineTo(x - 5 * s, y + 3 * s);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + 3 * s, y - 4 * s);
    ctx.lineTo(x + 14 * s, y - 10 * s - flap);
    ctx.lineTo(x + 12 * s, y + 2 * s);
    ctx.lineTo(x + 8 * s, y - 1 * s);
    ctx.lineTo(x + 5 * s, y + 3 * s);
    ctx.closePath(); ctx.fill();
    Art.humanoid(ctx, x, y, Object.assign({}, o, {
      skin: '#b01818', body: '#5a0808', legs: '#300404', hair: '#200000', eye: '#ffe040',
      glow: '#ffe040', head: 'horns', headCol: '#e0d0b0', cape: '#200008',
    }));
  };

  // ---------------------------------------------------------------- icons (trophies, UI)
  Art.icon = function (ctx, kind, x, y, s, col) {
    const R = (px, py, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x + px * s), Math.round(y + py * s), w * s, h * s); };
    const c = col || '#ddd';
    switch (kind) {
      case 'rock': R(-2, -1, 4, 3, '#8a8a8a'); R(-1, -2, 3, 1, '#a0a0a0'); R(1, 0, 1, 1, '#5a5a5a'); break;
      case 'oar': R(-3, 2, 1, 1, '#7a5230'); R(-2, 1, 1, 1, '#7a5230'); R(-1, 0, 1, 1, '#7a5230'); R(0, -1, 1, 1, '#7a5230'); R(1, -3, 2, 3, '#7a5230'); break;
      case 'cup': R(-2, -2, 4, 1, c); R(-2, -1, 4, 2, c); R(-1, 1, 2, 1, c); R(-2, 2, 4, 1, c); R(-1, -2, 2, 1, '#50c040'); break;
      case 'laurel': R(-3, -1, 1, 3, '#5aa040'); R(2, -1, 1, 3, '#5aa040'); R(-2, -2, 1, 1, '#5aa040'); R(1, -2, 1, 1, '#5aa040'); R(-2, 2, 4, 1, '#5aa040'); break;
      case 'spear': R(-3, 3, 1, 1, '#7a5230'); R(-2, 2, 1, 1, '#7a5230'); R(-1, 1, 1, 1, '#7a5230'); R(0, 0, 1, 1, '#7a5230'); R(1, -2, 2, 2, '#c8c8d0'); break;
      case 'mirror': R(-2, -3, 4, 4, '#f0c040'); R(-1, -2, 2, 2, '#b0e0ff'); R(-0.5, 1, 1, 2, '#f0c040'); break;
      case 'crown': R(-3, 0, 6, 2, '#f0c040'); R(-3, -2, 1, 2, '#f0c040'); R(-0.5, -2, 1, 2, '#f0c040'); R(2, -2, 1, 2, '#f0c040'); R(-1, 0, 1, 1, '#e04040'); break;
      case 'coin': R(-2, -2, 4, 4, '#f0c040'); R(-1, -1, 2, 2, '#c09020'); break;
      case 'shield': R(-2, -3, 4, 5, c); R(-1, 2, 2, 1, c); R(-0.5, -2, 1, 3, U.shade(c, -0.3)); break;
      case 'sword': R(-0.5, -3, 1, 5, '#c8c8d0'); R(-2, 1, 4, 1, '#f0c040'); R(-0.5, 2, 1, 1, '#7a5230'); break;
      case 'telescope': R(-3, 1, 2, 2, '#c09020'); R(-1, 0, 2, 2, '#f0c040'); R(1, -1, 2, 2, '#f0c040'); R(2, -2, 1, 1, '#b0e0ff'); break;
      case 'flame': R(-1, -3, 2, 1, '#ffe060'); R(-2, -2, 4, 2, '#ff9020'); R(-2, 0, 4, 2, '#e04010'); break;
      case 'club': R(-3, 2, 2, 1, '#7a5230'); R(-1, 0, 2, 2, '#7a5230'); R(0, -3, 3, 3, '#6a4220'); break;
      case 'claw': R(-2, -3, 1, 4, '#e8e0d0'); R(0, -3, 1, 5, '#e8e0d0'); R(2, -2, 1, 4, '#e8e0d0'); break;
      case 'bow': R(-2, -3, 1, 6, '#7a5230'); R(-1, -3, 1, 1, '#7a5230'); R(-1, 2, 1, 1, '#7a5230'); R(1, -3, 0.5, 6, '#ddd'); break;
      case 'mask': R(-3, -2, 6, 4, '#40a040'); R(-2, -1, 1, 1, '#000'); R(1, -1, 1, 1, '#000'); R(-1, 1, 2, 1, '#205020'); R(-3, -3, 1, 1, '#f0c040'); R(2, -3, 1, 1, '#f0c040'); break;
      case 'dagger': R(-0.5, -3, 1, 4, '#c8c8d0'); R(-1.5, 1, 3, 1, '#f0c040'); R(-0.5, 2, 1, 1, '#7a5230'); break;
      case 'chain': R(-3, -1, 2, 2, '#a0a0b0'); R(-1, -1, 2, 2, '#707080'); R(1, -1, 2, 2, '#a0a0b0'); break;
      case 'horn': R(-2, 1, 2, 2, '#e0d0b0'); R(-1, -1, 2, 2, '#e0d0b0'); R(0, -3, 2, 2, '#e0d0b0'); break;
      case 'skull': R(-2, -2, 4, 3, '#e8e0d0'); R(-1, -1, 1, 1, '#000'); R(1, -1, 1, 1, '#000'); R(-1, 1, 2, 1, '#e8e0d0'); break;
      case 'heart': R(-2, -2, 1, 1, '#ff4060'); R(1, -2, 1, 1, '#ff4060'); R(-2, -1, 4, 1, '#ff4060'); R(-1, 0, 2, 1, '#ff4060'); break;
      default: R(-2, -2, 4, 4, c);
    }
  };

  // ---------------------------------------------------------------- tiles
  const FLOOR_DETAIL = {
    grass(ctx, x, y, h, pal) {
      if (h < 0.25) { ctx.fillStyle = pal.detail; ctx.fillRect(x + ((h * 97) | 0) % 12 + 2, y + ((h * 53) | 0) % 10 + 3, 1, 2); ctx.fillRect(x + ((h * 97) | 0) % 12 + 3, y + ((h * 53) | 0) % 10 + 4, 1, 1); }
      else if (h > 0.93) { ctx.fillStyle = pal.flower || '#e0d060'; ctx.fillRect(x + 7, y + 8, 1, 1); }
    },
    stone(ctx, x, y, h, pal) {
      ctx.fillStyle = pal.detail;
      ctx.fillRect(x, y + 15, 16, 1); ctx.fillRect(x + 15, y, 1, 16);
      if (h < 0.2) { ctx.fillRect(x + 4, y + 5, 3, 1); ctx.fillRect(x + 6, y + 6, 1, 2); }
    },
    ash(ctx, x, y, h, pal) {
      if (h < 0.3) { ctx.fillStyle = pal.detail; ctx.fillRect(x + ((h * 131) | 0) % 13 + 1, y + ((h * 71) | 0) % 13 + 1, 2, 1); }
    },
    gold(ctx, x, y, h, pal) {
      ctx.fillStyle = pal.detail;
      ctx.fillRect(x, y, 16, 1); ctx.fillRect(x, y, 1, 16);
      if (h < 0.15) { ctx.fillStyle = '#fff6b0'; ctx.fillRect(x + 8, y + 6, 1, 1); }
    },
    ice(ctx, x, y, h, pal) {
      ctx.fillStyle = pal.detail;
      if (h < 0.4) { ctx.fillRect(x + 2, y + 3 + ((h * 40) | 0) % 8, 6, 1); ctx.fillRect(x + 7, y + 2 + ((h * 40) | 0) % 8, 4, 1); }
    },
    cobble(ctx, x, y, h, pal) {
      ctx.fillStyle = pal.detail;
      ctx.fillRect(x, y + 7, 16, 1); ctx.fillRect(x + (h < 0.5 ? 5 : 9), y, 1, 7); ctx.fillRect(x + (h < 0.5 ? 11 : 3), y + 8, 1, 8);
    },
    dirt(ctx, x, y, h, pal) {
      if (h < 0.35) { ctx.fillStyle = pal.detail; ctx.fillRect(x + ((h * 91) | 0) % 13 + 1, y + ((h * 37) | 0) % 13 + 1, 1, 1); ctx.fillRect(x + ((h * 57) | 0) % 13 + 1, y + ((h * 17) | 0) % 13 + 1, 1, 1); }
    },
  };

  Art.floorTile = function (ctx, x, y, pal, h) {
    const fl = pal.floor;
    ctx.fillStyle = fl[Math.floor(h * fl.length) % fl.length];
    ctx.fillRect(x, y, 16, 16);
    const fn = FLOOR_DETAIL[pal.floorStyle || 'dirt'];
    if (fn) fn(ctx, x, y, U.hash2(x, y, 7), pal);
  };

  Art.wallTile = function (ctx, x, y, pal, h, frontVisible) {
    ctx.fillStyle = pal.wall; ctx.fillRect(x, y, 16, 16);
    ctx.fillStyle = pal.wallTop || U.shade(pal.wall, 0.15);
    ctx.fillRect(x, y, 16, frontVisible ? 10 : 16);
    ctx.fillStyle = U.shade(pal.wall, -0.25);
    ctx.fillRect(x, y + 4, 16, 1); ctx.fillRect(x + (h < 0.5 ? 5 : 10), y, 1, 4); ctx.fillRect(x + (h < 0.5 ? 12 : 3), y + 5, 1, 5);
    if (frontVisible) { ctx.fillStyle = U.shade(pal.wall, -0.4); ctx.fillRect(x, y + 10, 16, 6); ctx.fillStyle = U.shade(pal.wall, -0.2); ctx.fillRect(x, y + 10, 16, 1); }
  };

  Art.pitTile = function (ctx, x, y, pal, topEdge) {
    ctx.fillStyle = pal.pit || '#050308'; ctx.fillRect(x, y, 16, 16);
    if (topEdge) { ctx.fillStyle = pal.pitEdge || '#2a2028'; ctx.fillRect(x, y, 16, 4); ctx.fillStyle = U.shade(pal.pitEdge || '#2a2028', -0.4); ctx.fillRect(x, y + 4, 16, 2); }
  };

  Art.liquidTile = function (ctx, x, y, pal, h) {
    ctx.fillStyle = pal.liquid || '#8a1010'; ctx.fillRect(x, y, 16, 16);
    ctx.fillStyle = U.shade(pal.liquid || '#8a1010', -0.2);
    if (h < 0.5) ctx.fillRect(x + 3, y + 9, 5, 1);
  };

  Art.iceTile = function (ctx, x, y, pal, h) {
    ctx.fillStyle = pal.ice || '#a8d8f0'; ctx.fillRect(x, y, 16, 16);
    ctx.fillStyle = U.shade(pal.ice || '#a8d8f0', 0.35);
    if (h < 0.5) { ctx.fillRect(x + 2, y + 4, 5, 1); ctx.fillRect(x + 6, y + 3, 3, 1); }
    else if (h < 0.7) ctx.fillRect(x + 9, y + 11, 4, 1);
  };

  // Obstacles: drawn into a 16x16 cell at (x,y). pal = biome palette.
  Art.obstacles = {
    tree(ctx, x, y, pal, h) {
      const leaf = pal.leaf || ['#2e5a26', '#3a7030', '#4a8a3a'];
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x + 2, y + 12, 12, 3);
      ctx.fillStyle = pal.trunk || '#5a3a20'; ctx.fillRect(x + 6, y + 9, 4, 6);
      circOn(ctx, x + 8, y + 6, 7, leaf[0]);
      circOn(ctx, x + 7, y + 5, 5, leaf[1]);
      circOn(ctx, x + 6, y + 3, 2, leaf[2]);
    },
    deadtree(ctx, x, y, pal) {
      const c = pal.deadwood || '#4a3a30';
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x + 3, y + 13, 10, 2);
      ctx.fillStyle = c;
      ctx.fillRect(x + 7, y + 3, 2, 12); ctx.fillRect(x + 4, y + 5, 3, 1); ctx.fillRect(x + 3, y + 3, 1, 2);
      ctx.fillRect(x + 9, y + 7, 3, 1); ctx.fillRect(x + 12, y + 5, 1, 2); ctx.fillRect(x + 6, y + 1, 1, 2); ctx.fillRect(x + 9, y + 2, 1, 2);
    },
    burningtree(ctx, x, y, pal, h) {
      Art.obstacles.deadtree(ctx, x, y, { deadwood: '#2a1a14' });
      ctx.fillStyle = '#ff6a10'; ctx.fillRect(x + 5, y + 2, 2, 2); ctx.fillRect(x + 9, y + 4, 2, 2);
    },
    rock(ctx, x, y, pal, h) {
      const c = pal.rock || '#7a7670';
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x + 2, y + 12, 13, 3);
      ctx.fillStyle = U.shade(c, -0.25); ctx.fillRect(x + 1, y + 5, 14, 9);
      ctx.fillStyle = c; ctx.fillRect(x + 2, y + 3, 12, 9); ctx.fillRect(x + 4, y + 2, 7, 1);
      ctx.fillStyle = U.shade(c, 0.25); ctx.fillRect(x + 4, y + 4, 4, 2);
      if (h < 0.5) { ctx.fillStyle = U.shade(c, -0.35); ctx.fillRect(x + 9, y + 6, 1, 3); }
    },
    statue(ctx, x, y, pal) {
      const c = pal.statue || '#b8b0a0';
      ctx.fillStyle = U.shade(c, -0.3); ctx.fillRect(x + 2, y + 11, 12, 5);
      ctx.fillStyle = c; ctx.fillRect(x + 6, y + 1, 4, 3); ctx.fillRect(x + 5, y + 4, 6, 7); ctx.fillRect(x + 4, y + 5, 1, 4); ctx.fillRect(x + 11, y + 5, 1, 4);
    },
    goldstatue(ctx, x, y) { Art.obstacles.statue(ctx, x, y, { statue: '#e0b030' }); },
    column(ctx, x, y, pal) {
      const c = pal.column || '#c8c0b0';
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x + 3, y + 13, 11, 3);
      ctx.fillStyle = U.shade(c, -0.1); ctx.fillRect(x + 3, y, 10, 2); ctx.fillRect(x + 3, y + 13, 10, 3);
      ctx.fillStyle = c; ctx.fillRect(x + 4, y + 2, 8, 11);
      ctx.fillStyle = U.shade(c, -0.25); ctx.fillRect(x + 6, y + 2, 1, 11); ctx.fillRect(x + 9, y + 2, 1, 11);
    },
    brokencolumn(ctx, x, y, pal) {
      const c = pal.column || '#c8c0b0';
      ctx.fillStyle = U.shade(c, -0.1); ctx.fillRect(x + 3, y + 12, 10, 4);
      ctx.fillStyle = c; ctx.fillRect(x + 4, y + 5, 8, 7); ctx.fillRect(x + 4, y + 4, 3, 1); ctx.fillRect(x + 9, y + 3, 3, 2);
      ctx.fillStyle = U.shade(c, -0.25); ctx.fillRect(x + 6, y + 5, 1, 7); ctx.fillRect(x + 9, y + 5, 1, 7);
    },
    goldpile(ctx, x, y) {
      ctx.fillStyle = '#9a7010'; ctx.fillRect(x + 1, y + 9, 14, 6);
      ctx.fillStyle = '#e0b030'; ctx.fillRect(x + 2, y + 6, 12, 7); ctx.fillRect(x + 5, y + 3, 6, 3);
      ctx.fillStyle = '#fff0a0'; ctx.fillRect(x + 6, y + 4, 1, 1); ctx.fillRect(x + 10, y + 8, 1, 1); ctx.fillRect(x + 4, y + 10, 1, 1);
    },
    tomb(ctx, x, y, pal) {
      const c = pal.tomb || '#8a8490';
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x + 1, y + 13, 15, 3);
      ctx.fillStyle = U.shade(c, -0.3); ctx.fillRect(x + 1, y + 4, 14, 11);
      ctx.fillStyle = c; ctx.fillRect(x + 1, y + 2, 14, 9);
      ctx.fillStyle = '#1a0a0a'; ctx.fillRect(x + 3, y + 4, 10, 5); // open lid
      ctx.fillStyle = '#ff6a10'; ctx.fillRect(x + 5, y + 6, 6, 2);
    },
    crate(ctx, x, y) {
      ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x + 1, y + 2, 14, 13);
      ctx.fillStyle = '#8a5a2a'; ctx.fillRect(x + 2, y + 3, 12, 11);
      ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x + 2, y + 8, 12, 1); ctx.fillRect(x + 7, y + 3, 1, 11);
    },
    facade(ctx, x, y, pal) {
      const c = pal.facade || '#8a7a9a';
      ctx.fillStyle = U.shade(c, -0.3); ctx.fillRect(x, y + 2, 16, 14);
      ctx.fillStyle = c; ctx.fillRect(x + 1, y + 3, 14, 12);
      ctx.fillStyle = U.shade(c, -0.5); ctx.fillRect(x + 1, y + 1, 14, 2);
      ctx.fillStyle = '#20182a'; ctx.fillRect(x + 6, y + 9, 4, 6);
      ctx.fillStyle = '#e0c060'; ctx.fillRect(x + 3, y + 5, 2, 2); ctx.fillRect(x + 11, y + 5, 2, 2);
    },
    iceblock(ctx, x, y) {
      ctx.fillStyle = '#5a8aa8'; ctx.fillRect(x + 1, y + 2, 14, 13);
      ctx.fillStyle = '#9ad0f0'; ctx.fillRect(x + 2, y + 2, 12, 10);
      ctx.fillStyle = '#e0f6ff'; ctx.fillRect(x + 3, y + 3, 5, 1); ctx.fillRect(x + 3, y + 4, 1, 3);
    },
    frozen(ctx, x, y) {
      Art.obstacles.iceblock(ctx, x, y);
      ctx.fillStyle = 'rgba(30,30,60,0.6)'; ctx.fillRect(x + 6, y + 4, 4, 3); ctx.fillRect(x + 5, y + 7, 6, 4); ctx.fillRect(x + 4, y + 7, 1, 3); ctx.fillRect(x + 11, y + 7, 1, 3);
    },
    ruin(ctx, x, y, pal) {
      const c = pal.ruin || '#6a5a50';
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x + 1, y + 13, 15, 3);
      ctx.fillStyle = U.shade(c, -0.3); ctx.fillRect(x + 1, y + 6, 14, 9);
      ctx.fillStyle = c; ctx.fillRect(x + 1, y + 4, 6, 8); ctx.fillRect(x + 7, y + 6, 8, 6); ctx.fillRect(x + 2, y + 2, 3, 2);
      ctx.fillStyle = U.shade(c, -0.45); ctx.fillRect(x + 1, y + 8, 14, 1); ctx.fillRect(x + 7, y + 4, 1, 4);
    },
    bones(ctx, x, y) {
      Art.obstacles.rock(ctx, x, y, { rock: '#5a5048' });
      ctx.fillStyle = '#e8e0d0'; ctx.fillRect(x + 4, y + 3, 4, 3); ctx.fillRect(x + 9, y + 6, 4, 1); ctx.fillRect(x + 5, y + 8, 1, 3);
      ctx.fillStyle = '#000'; ctx.fillRect(x + 5, y + 4, 1, 1); ctx.fillRect(x + 7, y + 4, 1, 1);
    },
    spire(ctx, x, y, pal) {
      const c = pal.spire || '#4a1010';
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x + 2, y + 13, 12, 3);
      ctx.fillStyle = U.shade(c, -0.3); ctx.fillRect(x + 3, y + 9, 10, 6);
      ctx.fillStyle = c; ctx.fillRect(x + 5, y + 4, 6, 8); ctx.fillRect(x + 7, y, 2, 4);
      ctx.fillStyle = '#ff4020'; ctx.fillRect(x + 7, y + 6, 1, 2);
    },
    gilded(ctx, x, y) { // an obstacle Midas turned to gold
      Art.obstacles.rock(ctx, x, y, { rock: '#d8a828' });
      ctx.fillStyle = '#fff6b0'; ctx.fillRect(x + 5, y + 4, 2, 1);
    },
  };

  G.Art = Art;
})();
