'use strict';
const TAU = Math.PI * 2, wrap = a => { a = (a + Math.PI) % TAU; return (a < 0 ? a + TAU : a) - Math.PI; };
const rand = (a = 1, b = 0) => b + Math.random() * (a - b);
const CODES = { pathfinder: 'SV-12', atlas: 'FT-31', mule: 'TK-08', bastion: 'CV-07', lancer: 'FF-22', pike: 'DD-15', ark: 'CS-03', lighthouse: 'ST-01', harvester: 'HV-02' };
for (const s of SPECS) s.code = CODES[s.id] || '';
const ROLE = { x1: 'Hostile cruiser', x2: 'Hostile escort', harvester: 'Gas harvester' };
const specOf = id => spec(id) || ENEMY[id];
const ctl = () => $('#ctl');
function button(label, fn, on) { const b = document.createElement('button'); b.textContent = label; if (on) b.classList.add('on'); b.onclick = () => fn(b); ctl().append(b); return b; }
function select(opts, val, fn) { const s = document.createElement('select'); for (const [v, t] of opts) { const o = document.createElement('option'); o.value = v; o.textContent = t; s.append(o); } s.value = val; s.onchange = () => fn(s.value); ctl().append(s); return s; }
const meter = (v, cls = '') => `<i class="mt ${cls}" style="--v:${clamp(Math.round(v * 100), 0, 100)}%"></i>`;
const NCOL = 26, NLAY = 4;
const armGrid = arm => `<div class="arm">${Array.from({ length: NLAY }, (_, l) => arm.map(d => `<i class="${d > l ? 'x' : ''}"></i>`).join('')).join('')}</div>`;
const fmt = n => Math.round(n).toLocaleString('en');
function custom(text) { $('#bar').hidden = true; $('#scaleTxt').textContent = text; }
const mpp = S => { const m = 5 / S; return m >= 10 ? Math.round(m) : +m.toFixed(1); };
const camHooks = get => ({ wheel(e) { get().wheel(e); }, down(e, mx, my) { get().down(mx, my); }, move(e, mx, my) { get().move(mx, my); }, up() { get().up(); } });

let FX = [];
const SMK = [[96, 90, 112], [62, 58, 84], [50, 44, 62], [34, 30, 48], [240, 150, 80]];
const fx = (type, x, y, o) => { if (FX.length < 900) FX.push({ type, x, y, vx: 0, vy: 0, t: 0, life: 1, r: 1, ...o }); };
function stepFx(dt) {
  for (let i = FX.length - 1; i >= 0; i--) { const p = FX[i]; p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.drag) { p.vx *= 1 - p.drag * dt; p.vy *= 1 - p.drag * dt; } if (p.t >= p.life) FX.splice(i, 1); }
}
function burst(x, y, n, sp, o = {}) { for (let i = 0; i < n; i++) { const a = rand(TAU), v = rand(sp, sp * .2); fx('spark', x, y, { vx: Math.cos(a) * v + (o.vx || 0), vy: Math.sin(a) * v + (o.vy || 0), life: rand(.9, .3), drag: 1.5, ...o }); } }
function explode(x, y, r, o = {}) {
  fx('flash', x, y, { r, life: .35 + r * .02 });
  burst(x, y, Math.round(6 + r * 2.5), 14 + r * 3, o);
  for (let i = 0; i < 2 + r * .6; i++) fx('smoke', x + rand(r, -r) * .4, y + rand(r, -r) * .4, { r: r * rand(.9, .4), life: rand(2.6, 1.2), vx: rand(2, -2) + (o.vx || 0), vy: rand(2, -2) + (o.vy || 0) });
  if (r > 5) { fx('ring', x, y, { r: r * 3.5, life: .7 }); for (let i = 0; i < r; i++) { const a = rand(TAU), v = rand(16, 3); fx('debris', x, y, { vx: Math.cos(a) * v + (o.vx || 0), vy: Math.sin(a) * v + (o.vy || 0), life: rand(9, 4), r: rand(1, .3) }); } }
}
function drawFx(f, W, S) {
  for (const p of FX) {
    const [x, y] = W(p.x, p.y), u = p.t / p.life;
    if (x < -60 || y < -60 || x > f.w + 60 || y > f.h + 60) continue;
    if (p.type === 'spark') { const c = p.col ? (u < .5 ? p.col : [p.col[0] * .5, p.col[1] * .5, p.col[2] * .6]) : u < .25 ? F1 : u < .55 ? F2 : u < .8 ? F3 : [150, 62, 60]; f.px(x, y, c); if (S >= 6 && u < .5) f.px(x + 1, y, c); }
    else if (p.type === 'debris') { const c = (Math.floor(p.t * 6 + p.r * 9) & 1) ? [96, 100, 126] : [58, 60, 84], n = Math.max(1, Math.round(p.r * S * .5)); for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) f.px(x + a, y + b, c); }
    else if (p.type === 'smoke') {
      const R = Math.max(1, p.r * S * (.5 + u * .9)), al = (1 - u) * .85, dk = p.dark;
      const c1 = u < .15 && !dk ? SMK[4] : dk ? SMK[2] : SMK[0], c2 = u < .15 && !dk ? SMK[4] : dk ? SMK[3] : SMK[1], X0 = Math.round(x), Y0 = Math.round(y), RR = Math.ceil(R), R2 = R * R;
      for (let j = -RR; j <= RR; j++) for (let i = -RR; i <= RR; i++) { const d = (i * i + j * j) / R2; if (d > 1) continue; if (dith(X0 + i, Y0 + j) < al * (1 - d * .8)) f.px(X0 + i, Y0 + j, (d < .25) === (u < .5) ? c1 : c2); }
    } else if (p.type === 'flash') {
      const R = Math.max(1, p.r * S * (.4 + u * .8));
      for (let j = -Math.ceil(R); j <= R; j++) for (let i = -Math.ceil(R); i <= R; i++) { const d = Math.hypot(i, j) / R; if (d > 1) continue; const X = Math.round(x + i), Y = Math.round(y + j), q = d + u * .9 + (dith(X, Y) - .5) * .3; if (q < 1.25) f.px(X, Y, q < .45 ? [255, 252, 236] : q < .75 ? F1 : q < 1 ? F2 : F3); }
    } else if (p.type === 'ring' || p.type === 'jump') {
      const R = p.r * S * (p.type === 'jump' ? 1 - u : u), n = Math.max(12, Math.round(R * 6.3)), col = p.col || (p.type === 'jump' ? PAL.jump : [255, 230, 190]);
      for (let i = 0; i < n; i++) { const a = i / n * TAU, X = Math.round(x + Math.cos(a) * R), Y = Math.round(y + Math.sin(a) * R); if (dith(X, Y) < 1 - u * .9) { f.px(X, Y, col); if (S >= 3 && u < .5) f.px(X + 1, Y, col); } }
      if (p.type === 'jump') for (let i = 0; i < 40; i++) { const a = hash(i, 3, 1) * TAU, rr = R * hash(i, 4, FRAME >> 1); f.px(x + Math.cos(a) * rr, y + Math.sin(a) * rr, [220, 250, 245]); }
    }
  }
}
function compCentres(sp) {
  if (sp.cen) return sp.cen;
  const n = sp.comps.length, sx = new Float64Array(n), sy = new Float64Array(n), ct = new Float64Array(n), mx = new Float64Array(n);
  for (let j = 0; j < sp.h; j++) for (let i = 0; i < sp.w; i++) { const c = sp.c[j * sp.w + i]; if (sp.m[j * sp.w + i] && c) { sx[c] += i; sy[c] += j; ct[c]++; mx[c] = Math.max(mx[c], Math.abs(j - sp.pvy)); } }
  return sp.cen = sp.comps.map((q, c) => q && ct[c] ? { x: (sx[c] / ct[c] - sp.pvx) / sp.S, y: (sy[c] / ct[c] - sp.pvy) / sp.S, hw: mx[c] / sp.S, c } : null);
}

const KM_U = 2000;
const CLS = {
  bastion: { hp: 1000, sh: 560, v: 6.5, turn: .11, R: 120, mode: 'orbit', pd: 4, craft: 5, kms: 3200 },
  pike: { hp: 400, sh: 240, v: 12, turn: .3, R: 105, mode: 'joust', pd: 2, kms: 5800 },
  lancer: { hp: 320, sh: 200, v: 10.5, turn: .27, R: 150, mode: 'orbit', pd: 2, kms: 5200 },
  x1: { hp: 900, sh: 460, v: 7.5, turn: .13, R: 110, mode: 'joust', pd: 3, craft: 4, kms: 3600 },
  x2: { hp: 280, sh: 170, v: 12.5, turn: .32, R: 135, mode: 'orbit', pd: 1, kms: 6100 },
};
const NAMES = [['Resolute', 'Vigilant', 'Kestrel', 'Harrier', 'Merlin', 'Osprey', 'Falcon', 'Sparrowhawk', 'Tern', 'Petrel'], ['C-014', 'C-015', 'C-017', 'C-018', 'C-021', 'C-022', 'C-025', 'C-026', 'C-030', 'C-031']];
const B = { ships: [], mis: [], shots: [], beams: [], flares: [], craft: [], cam: new Cam(3, .6, 8), sel: null, t: 0, nn: [0, 0], queue: [], kills: [0, 0] };
function spawn(id, team, x, y, a, jump) {
  const c = CLS[id], s = new Craft(specOf(id), team ? PALS.foe : PALS.navy, { x, y, a, id, team, cls: c, hp: c.hp, sh: c.sh, v: c.v, side: Math.random() < .5 ? 1 : -1, name: NAMES[team][B.nn[team]++ % 10], arm: new Array(NCOL).fill(0), salvo: rand(7, 2), pass: false, launch: [], hangar: c.craft || 0, hcd: rand(4, 1), spin: 0, vx: 0, vy: 0, dying: 0 });
  const sp = shipSprite(s.spec, 3);
  s.cells = sp.cells; s.spinal = sp.spinal; s.scd = rand(4, 1);
  for (let i = 0; i < c.pd; i++) { const px = (i >> 1 ? -1 : 1) * s.len * .18 + rand(4, -4), m = { x: px, y: (i & 1 ? 1 : -1) * 2.6, type: 'pd', face: (i & 1 ? 1 : -1) * Math.PI / 2, arc: 2.2, comp: 0 }; s.tur.push({ m, a: m.face, cd: rand(1), fire: 0 }); }
  s.hot = !!team;
  B.ships.push(s);
  if (jump) { fx('jump', x, y, { r: s.len * .8, life: .8 }); fx('flash', x, y, { r: s.len * .35, life: .5 }); }
  return s;
}
function battleInit() {
  Object.assign(B, { ships: [], mis: [], shots: [], beams: [], flares: [], craft: [], sel: null, t: 0, nn: [0, 0], queue: [], kills: [0, 0], panel: null });
  FX.length = 0;
  B.cam = new Cam(3, .6, 8);
  spawn('bastion', 0, -150, 10, 0); spawn('pike', 0, -120, -62, .1); spawn('pike', 0, -125, 78, -.1); spawn('lancer', 0, -200, -40, 0); spawn('lancer', 0, -205, 60, 0);
  spawn('x1', 1, 150, -20, Math.PI); spawn('x1', 1, 190, 70, Math.PI); spawn('x2', 1, 120, -85, Math.PI); spawn('x2', 1, 125, 110, Math.PI); spawn('x2', 1, 215, -70, Math.PI);
  B.sel = B.ships[0];
}
const worldOf = (s, xu, yu) => { const c = Math.cos(s.a), n = Math.sin(s.a); return [s.x + c * xu - n * yu, s.y + n * xu + c * yu]; };
function hurt(T, dmg, xu, yu, fromA) {
  if (T.dead) return;
  if (T.sh > 0) { T.sh -= dmg; const ph = fromA - T.a, ea = T.len / 2 + 5, eb = Math.min(T.half, 9) + 5; B.flares.push({ s: T, a: Math.atan2(ea * Math.sin(ph), eb * Math.cos(ph)), t: 0, big: dmg > 20 }); if (T.sh <= 0) { T.sh = 0; const [wx, wy] = worldOf(T, xu, yu); fx('ring', wx, wy, { r: T.len * .5, life: .5 }); } return; }
  T.hp -= dmg;
  T.hit(xu, yu, 1.1 + dmg * .045, 140 + rand(110));
  const col = clamp(Math.floor((xu / T.len + .5) * NCOL), 0, NCOL - 1), dep = dmg > 30 ? 2 : 1;
  for (let c = col - (dmg > 30 ? 1 : 0); c <= col + (dmg > 30 ? 1 : 0); c++) if (c >= 0 && c < NCOL) T.arm[c] = Math.min(NLAY, T.arm[c] + (c === col ? dep : 1));
  const [wx, wy] = worldOf(T, xu, yu);
  burst(wx, wy, 5 + dmg * .2, 12, { vx: Math.cos(T.a) * T.v, vy: Math.sin(T.a) * T.v });
  if (dmg > 20) fx('smoke', wx, wy, { r: 2, life: 2, dark: true });
  if (T.hp <= 0) { T.dead = true; T.dying = 3.2; T.thr = 0; T.vx = Math.cos(T.a) * T.v * .6; T.vy = Math.sin(T.a) * T.v * .6; T.spin = rand(.12, -.12); B.kills[1 - T.team]++; B.queue.push({ id: T.id, team: T.team, t: 9 }); if (B.sel === T) B.selDead = 4; }
}
function aimPoint(T, fromX, fromY) {
  const sp = shipSprite(T.spec, 3), side = Math.sign(-Math.sin(T.a) * (fromX - T.x) + Math.cos(T.a) * (fromY - T.y)) || 1;
  return hullPoint(sp, rand(T.len * .38, -T.len * .38), side * rand(Math.min(T.half, 7) * .85, 1));
}
function battleStep(dt) {
  B.t += dt;
  const alive = B.ships.filter(s => !s.dead);
  for (const q of B.queue) q.t -= dt;
  for (let i = B.queue.length - 1; i >= 0; i--) if (B.queue[i].t <= 0) {
    const q = B.queue.splice(i, 1)[0], foes = alive.filter(s => s.team !== q.team);
    const cx = foes.length ? foes.reduce((a, s) => a + s.x, 0) / foes.length : 0, cy = foes.length ? foes.reduce((a, s) => a + s.y, 0) / foes.length : 0, a = rand(TAU);
    spawn(q.id, q.team, cx + Math.cos(a) * 230, cy + Math.sin(a) * 150, a + Math.PI, true);
  }
  for (const s of B.ships) {
    if (s.dead) {
      s.x += s.vx * dt; s.y += s.vy * dt; s.a += s.spin * dt; s.age = (s.age || 0) + dt;
      if (s.dying > 0) {
        s.dying -= dt;
        if (Math.random() < dt * 9) { const p = hullPoint(shipSprite(s.spec, 3), rand(s.len * .45, -s.len * .45), rand(6, -6)), [wx, wy] = worldOf(s, p[0], p[1]); explode(wx, wy, rand(5, 2), { vx: s.vx, vy: s.vy }); s.hit(p[0], p[1], rand(4, 2), 230); }
        if (s.dying <= 0) { explode(s.x, s.y, s.len * .22, { vx: s.vx, vy: s.vy }); for (let k = 0; k < 6; k++) s.hit(rand(s.len * .45, -s.len * .45), rand(5, -5), rand(7, 4), 200); }
      } else if (Math.random() < dt * 1.2) { const p = hullPoint(shipSprite(s.spec, 3), rand(s.len * .4, -s.len * .4), rand(4, -4)), [wx, wy] = worldOf(s, p[0], p[1]); fx('smoke', wx, wy, { r: 2.5, life: 3, dark: true, vx: s.vx, vy: s.vy }); }
      continue;
    }
    const c = s.cls;
    if (!s.tgt || s.tgt.dead || Math.random() < dt * .03) { let best = null, bd = 1e9; for (const o of alive) if (o.team !== s.team) { const d = Math.hypot(o.x - s.x, o.y - s.y) * (o.cls.hp > 500 === c.hp > 500 ? .7 : 1); if (d < bd) { bd = d; best = o; } } s.tgt = best; }
    const T = s.tgt;
    let wx = Math.cos(s.a), wy = Math.sin(s.a), dist = 1e9, bearing = s.a;
    if (T) {
      const dx = T.x - s.x, dy = T.y - s.y; dist = Math.hypot(dx, dy); bearing = Math.atan2(dy, dx);
      let want;
      if (c.mode === 'orbit') want = bearing + s.side * (Math.PI / 2) * (1 - clamp((dist - c.R) / c.R * 1.6, -.5, 1));
      else { if (dist < (s.len + T.len) * .5 + 18) s.pass = true; else if (dist > c.R) s.pass = false; want = s.pass ? bearing + s.side * 1.9 : bearing + s.side * .22; }
      wx = Math.cos(want); wy = Math.sin(want);
    }
    for (const o of B.ships) if (o !== s) { const dx = s.x - o.x, dy = s.y - o.y, d = Math.hypot(dx, dy), r = (s.len + o.len) * .62 + 6; if (d < r && d > .1) { const k = (1 - d / r) * 7; wx += dx / d * k; wy += dy / d * k; if (d < r * .55) { s.x += dx / d * dt * 5; s.y += dy / d * dt * 5; } } }
    const cd = Math.hypot(s.x, s.y); if (cd > 330) { wx -= s.x / cd * (cd - 330) * .03; wy -= s.y / cd * (cd - 330) * .03; }
    const da = wrap(Math.atan2(wy, wx) - s.a);
    s.a += clamp(da, -c.turn * dt, c.turn * dt);
    s.thr = .55 + .45 * Math.max(0, Math.cos(da)); s.v = c.v * s.thr;
    s.x += Math.cos(s.a) * s.v * dt; s.y += Math.sin(s.a) * s.v * dt;
    if (s.sh > 0 && s.sh < c.sh) s.sh = Math.min(c.sh, s.sh + dt * 4);
    for (const t of s.tur) {
      t.cd -= dt; t.fire -= dt;
      const [mx, my] = worldOf(s, t.m.x, t.m.y), pd = t.m.type === 'pd';
      let aim = null;
      if (pd) { let bd = 75; for (const m of B.mis) if (m.team !== s.team) { const d = Math.hypot(m.x - mx, m.y - my); if (d < bd) { bd = d; aim = m; } } for (const k of B.craft) if (k.team !== s.team && !aim) { const d = Math.hypot(k.x - mx, k.y - my); if (d < 55) aim = k; } }
      else if (T && dist < 190) aim = T;
      let goal = t.m.face, ok = false;
      if (aim) { const rel = wrap(Math.atan2(aim.y - my, aim.x - mx) - s.a - t.m.face); ok = Math.abs(rel) < t.m.arc; goal = t.m.face + clamp(rel, -t.m.arc, t.m.arc); }
      const dA = wrap(goal - t.a), rate = pd ? 5 : 1.4;
      t.a += clamp(dA, -rate * dt, rate * dt);
      if (aim && ok && Math.abs(dA) < .07 && t.cd <= 0) {
        if (pd) {
          t.cd = .09; t.burst = (t.burst || 0) + 1; if (t.burst > 9) { t.burst = 0; t.cd = rand(1.2, .5); }
          const a = s.a + t.a + rand(.05, -.05); B.shots.push({ x: mx, y: my, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, life: Math.hypot(aim.x - mx, aim.y - my) / 260, team: s.team });
          if (Math.random() < (aim.fighter ? .045 : .075)) aim.kill = .12;
        } else {
          t.cd = rand(3.6, 2.2); t.fire = .3;
          const p = aimPoint(T, mx, my);
          B.beams.push({ s, t, T, p, life: .3, age: 0, team: s.team, w: 1 });
          hurt(T, 13, p[0], p[1], Math.atan2(my - T.y, mx - T.x));
        }
      }
    }
    if (s.spinal && T) { s.scd -= dt; if (s.scd <= 0 && dist < 210 && Math.abs(wrap(bearing - s.a)) < .09) { s.scd = rand(8, 6); const [mx, my] = worldOf(s, s.spinal.x, 0), p = aimPoint(T, mx, my); B.beams.push({ s, spinal: true, T, p, life: .7, age: 0, team: s.team, w: 2 }); hurt(T, 55, p[0], p[1], Math.atan2(my - T.y, mx - T.x)); } }
    if (s.cells.length && T) { s.salvo -= dt; if (s.salvo <= 0 && dist < 280) { s.salvo = rand(13, 9); s.launch = s.cells.map((cell, i) => ({ cell, t: i * .11 })); } }
    for (let i = s.launch.length - 1; i >= 0; i--) { const L = s.launch[i]; L.t -= dt; if (L.t <= 0 && s.tgt) { s.launch.splice(i, 1); const [mx, my] = worldOf(s, L.cell.x, L.cell.y), a = s.a + Math.sign(L.cell.y || rand(1, -1)) * rand(1.3, .8); B.mis.push({ x: mx, y: my, a, v: 14, T: s.tgt, team: s.team, life: 9, p: aimPoint(s.tgt, mx, my) }); fx('flash', mx, my, { r: 1.2, life: .2 }); } }
    if (s.hangar > 0) { s.hcd -= dt; if (s.hcd <= 0) { s.hcd = .7; s.hangar--; const [hx, hy] = worldOf(s, 0, 0); B.craft.push({ x: hx, y: hy, a: s.a + rand(.6, -.6), v: 26, team: s.team, home: s, fighter: true, cd: rand(1), away: 0, pal: s.pal }); } }
  }
  for (let i = B.mis.length - 1; i >= 0; i--) {
    const m = B.mis[i]; m.life -= dt; m.v = Math.min(70, m.v + 60 * dt);
    if (m.kill != null) { m.kill -= dt; if (m.kill <= 0) { explode(m.x, m.y, 1.6); B.mis.splice(i, 1); continue; } }
    if (m.T.dead && !m.T.dying) m.life = Math.min(m.life, .3);
    const [tx, ty] = worldOf(m.T, m.p[0], m.p[1]), d = Math.hypot(tx - m.x, ty - m.y);
    m.a += clamp(wrap(Math.atan2(ty - m.y, tx - m.x) - m.a), -3.2 * dt, 3.2 * dt);
    m.x += Math.cos(m.a) * m.v * dt; m.y += Math.sin(m.a) * m.v * dt;
    if (Math.random() < dt * 24) fx('smoke', m.x - Math.cos(m.a) * 1.5, m.y - Math.sin(m.a) * 1.5, { r: .6, life: .7 });
    if (d < 4 + m.v * dt) { hurt(m.T, 34, m.p[0], m.p[1], m.a + Math.PI); explode(tx, ty, m.T.sh > 0 ? 2 : 3.5); B.mis.splice(i, 1); } else if (m.life <= 0) { fx('smoke', m.x, m.y, { r: 1.5, life: 1 }); B.mis.splice(i, 1); }
  }
  for (let i = B.craft.length - 1; i >= 0; i--) {
    const k = B.craft[i];
    if (k.kill != null) { k.kill -= dt; if (k.kill <= 0) { explode(k.x, k.y, 2.2); B.craft.splice(i, 1); if (k.home && !k.home.dead) k.home.hangar++; continue; } }
    if (!k.T || k.T.dead || (k.T.fighter && !B.craft.includes(k.T))) { let best = null, bd = 1e9; for (const o of B.craft) if (o.team !== k.team) { const d = Math.hypot(o.x - k.x, o.y - k.y); if (d < 90 && d < bd) { bd = d; best = o; } } if (!best) for (const o of alive) if (o.team !== k.team) { const d = Math.hypot(o.x - k.x, o.y - k.y); if (d < bd) { bd = d; best = o; } } k.T = best; }
    k.away -= dt; k.cd -= dt;
    let want = k.a;
    if (k.T) { const dx = k.T.x - k.x, dy = k.T.y - k.y, d = Math.hypot(dx, dy), br = Math.atan2(dy, dx); if (d < (k.T.fighter ? 8 : 14)) k.away = rand(1.6, .8); want = k.away > 0 ? k.a + .9 * dt * 8 * (i & 1 ? 1 : -1) : br; if (k.away <= 0 && d < 45 && Math.abs(wrap(br - k.a)) < .2 && k.cd <= 0) { k.cd = .14; B.shots.push({ x: k.x, y: k.y, vx: Math.cos(k.a) * 180, vy: Math.sin(k.a) * 180, life: d / 180, team: k.team }); if (k.T.fighter) { if (Math.random() < .05) k.T.kill = .1; } else if (Math.random() < .25) { const p = aimPoint(k.T, k.x, k.y); hurt(k.T, 1.5, p[0], p[1], br + Math.PI); } } }
    for (const o of B.craft) if (o !== k) { const dx = k.x - o.x, dy = k.y - o.y, d = Math.hypot(dx, dy); if (d < 5 && d > .01) want += .3 * Math.sign(wrap(Math.atan2(dy, dx) - k.a)); }
    k.a += clamp(wrap(want - k.a), -2.4 * dt, 2.4 * dt);
    k.x += Math.cos(k.a) * k.v * dt; k.y += Math.sin(k.a) * k.v * dt;
  }
  for (let i = B.shots.length - 1; i >= 0; i--) { const s = B.shots[i]; s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt; if (s.life <= 0) B.shots.splice(i, 1); }
  for (let i = B.beams.length - 1; i >= 0; i--) { const b = B.beams[i]; b.age += dt; if (b.age > b.life) B.beams.splice(i, 1); }
  for (let i = B.flares.length - 1; i >= 0; i--) { const b = B.flares[i]; b.t += dt; if (b.t > .55) B.flares.splice(i, 1); }
  for (let i = B.ships.length - 1; i >= 0; i--) { const s = B.ships[i]; if (s.dead && s.age > 45) B.ships.splice(i, 1); }
  if (B.selDead) { B.selDead -= dt; if (B.selDead <= 0) { B.selDead = 0; B.sel = B.ships.find(s => !s.dead && s.team === 0) || null; } }
  stepFx(dt);
  const cam = B.cam;
  if (!cam.free) {
    let tx, ty;
    if (B.sel && cam.S >= 2) { tx = B.sel.x; ty = B.sel.y; if (B.sel.tgt && !B.sel.dead && cam.S < 4.5) { tx = mix(tx, B.sel.tgt.x, .3); ty = mix(ty, B.sel.tgt.y, .3); } }
    else { const big = alive.length ? alive : B.ships; tx = big.reduce((a, s) => a + s.x, 0) / (big.length || 1); ty = big.reduce((a, s) => a + s.y, 0) / (big.length || 1); }
    const k = 1 - Math.exp(-dt * 2.2); cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
  }
}
function battleSite(f, W, S, dt, ts, foc) {
  battleStep(Math.min(dt, .05));
  const order = [...B.ships].sort((a, b) => (a.dead ? 0 : 1) - (b.dead ? 0 : 1) || b.len - a.len);
  for (const s of order) { const [X, Y] = W(s.x, s.y); s.sx = X; s.sy = Y; s.draw(f, X, Y, S); }
  for (const k of B.craft) { const [X, Y] = W(k.x, k.y); if (X < -20 || Y < -20 || X > f.w + 20 || Y > f.h + 20) continue; if (S >= 1.2) { plume(f, X - Math.cos(k.a) * 2 * S, Y - Math.sin(k.a) * 2 * S, k.a, .45 * S, 2.2 * S, k.team); drawSmall(f, 'fighter', X, Y, k.a, k.pal, S); } else { f.px(X, Y, k.team ? [239, 111, 94] : [182, 222, 240]); f.px(X - Math.cos(k.a), Y - Math.sin(k.a), F2); } }
  for (const m of B.mis) { const [X, Y] = W(m.x, m.y), c = Math.cos(m.a), n = Math.sin(m.a), L = Math.max(1, S * .9); for (let i = 0; i <= L; i++) f.px(X + c * i, Y + n * i, i > L - 1.5 ? (m.team ? [255, 150, 120] : [236, 240, 250]) : [150, 154, 176]); f.px(X - c, Y - n, F1); f.px(X - c * 2, Y - n * 2, F2); if (S >= 3) { f.px(X - c * 3, Y - n * 3, F3); f.px(X - c * 4, Y - n * 4, F3); } }
  for (const s of B.shots) { const [X, Y] = W(s.x, s.y), k = S * .012; f.line(X, Y, X - s.vx * k, Y - s.vy * k, s.team ? [255, 150, 110] : [255, 236, 170]); }
  for (const b of B.beams) {
    const [x0, y0] = b.spinal ? W(...worldOf(b.s, b.s.spinal.x, 0)) : W(...worldOf(b.s, b.t.m.x + Math.cos(b.t.a) * 5.6, b.t.m.y + Math.sin(b.t.a) * 5.6));
    let [tx, ty] = worldOf(b.T, b.p[0], b.p[1]);
    if (b.T.sh > 0) { const ph = Math.atan2(b.s.y - b.T.y, b.s.x - b.T.x) - b.T.a, ea = b.T.len / 2 + 5, eb = Math.min(b.T.half, 9) + 5, la = Math.atan2(ea * Math.sin(ph), eb * Math.cos(ph)), c = Math.cos(b.T.a), n = Math.sin(b.T.a), ex = Math.cos(la) * ea, ey = Math.sin(la) * eb; tx = b.T.x + c * ex - n * ey; ty = b.T.y + n * ex + c * ey; }
    const [x1, y1] = W(tx, ty), u = b.age / b.life, fl = (FRAME & 1), wd = Math.max(1, Math.round(S * (b.w === 2 ? 1.6 : .85) * (u > .7 ? .6 : 1)));
    const core = b.team ? [255, 236, 214] : [236, 252, 255], edge = b.team ? (fl ? [239, 111, 94] : [255, 150, 110]) : (fl ? [95, 208, 197] : [130, 230, 250]);
    thick(f, x0, y0, x1, y1, wd, core, edge);
    if (u < .5) { const R = Math.round((b.w === 2 ? 3 : 1.6) * Math.max(1, S * .6)); for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) if (i * i + j * j <= R * R && dith(Math.round(x1 + i), Math.round(y1 + j)) < .8) f.px(x1 + i, y1 + j, i * i + j * j < R * R * .3 ? core : edge); }
  }
  drawFx(f, W, S);
  for (const b of B.flares) {
    const s = b.s, ea = (s.len / 2 + 5) * S, eb = (Math.min(s.half, 9) + 5) * S, u = b.t / .55, c = Math.cos(s.a), n = Math.sin(s.a), [X, Y] = W(s.x, s.y), N = Math.round((b.big ? 26 : 15) * S), foe = s.team;
    for (let i = -N; i <= N; i++) {
      const la = b.a + i / Math.max(ea, eb), ex = Math.cos(la) * ea, ey = Math.sin(la) * eb, I = (1 - Math.abs(i) / N) * (1 - u);
      for (let t = 0; t < (S >= 3 ? 3 : S >= 1.5 ? 2 : 1); t++) { const k = 1 - t * 1.3 / Math.max(ea, eb), x = Math.round(X + c * ex * k - n * ey * k), y = Math.round(Y + n * ex * k + c * ey * k); if (dith(x, y) < I * 1.6 - t * .2 && ((x + y * 2 + FRAME) % 5 !== 0)) f.px(x, y, I > .62 ? [240, 250, 255] : foe ? (I > .3 ? [255, 170, 110] : [170, 80, 70]) : (I > .3 ? [110, 220, 230] : [52, 128, 150])); }
    }
  }
  for (const s of order) {
    const X = s.sx, Y = s.sy, r = Math.max(8, s.len * S * .5);
    if (X < -r || Y < -r || X > f.w + r || Y > f.h + r) continue;
    if (!s.dead && (S >= 1.2 || s.len > 60 || s === B.sel)) label(s.name, X, Y + Math.min(r, s.half * S + 6), s.team ? 'hot' : 'fl', 'c', 12);
    if (s === B.sel) { const bw = Math.round(r + 4), bh = Math.round(Math.min(r, s.half * S) + 4); for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) for (let i = 0; i < 5; i++) { f.px(X + dx * (bw - i), Y + dy * bh, PAL.sel); f.px(X + dx * bw, Y + dy * (bh - i), PAL.sel); } }
  }
  if (foc && ((FRAME % 6) === 0 || !B.panel)) {
    const s = B.sel, n0 = B.ships.filter(q => !q.dead && !q.team).length, n1 = B.ships.filter(q => !q.dead && q.team).length;
    if (s) {
      const c = s.cls, T = s.tgt && !s.tgt.dead ? s.tgt : null, d = T ? Math.hypot(T.x - s.x, T.y - s.y) : 0, beams = s.tur.filter(t => t.m.type === 'beam').length;
      B.panel = [`${s.spec.role || ROLE[s.id]} · ${s.dead ? 'DESTROYED' : fmt(c.kms * s.thr) + ' km/s'}`, `Shields ${meter(s.sh / c.sh, 'sh')} ${fmt(Math.max(0, s.sh))}`, `Hull ${meter(s.hp / c.hp)} ${Math.max(0, Math.round(s.hp / c.hp * 100))}%`, `Armour, ${NLAY} layers${armGrid(s.arm)}`, T ? `Target ${T.name} · ${fmt(d * KM_U)} km` : 'No target', `${beams ? beams + ' beam turrets · ' : ''}${s.cells.length ? s.cells.length + ' cells · ' : ''}${c.craft ? (c.craft - s.hangar) + ' craft out' : s.spinal ? 'spinal lance' : ''}`, `<span class="dim">Fleet ${n0} v ${n1} · missiles ${B.mis.length} · kills ${B.kills[0]}–${B.kills[1]}</span>`];
      readout(`${s.name} · ${s.spec.name || s.id.toUpperCase()} class`, B.panel);
    } else readout('Engagement', B.panel = [`Fleet ${n0} v ${n1}`, `Missiles in flight ${B.mis.length}`, 'Click a ship to follow it']);
  }
}

const D = { cls: 'bastion', pal: 'navy', a: -.14, rot: false, sys: false, mx: -1, my: -1, craft: null, cam: new Cam(6, 2, 12) };
function detailCraft() { D.craft = new Craft(specOf(D.cls), PALS[D.pal], { a: D.a, arm: new Array(NCOL).fill(0), hot: D.pal === 'foe' }); D.sum = null; }
function detailDraw(f, ts, dt) {
  const c = D.craft, cam = D.cam; cam.step(dt);
  const S = cam.S, W = cam.W(f);
  if (D.rot) D.a += dt * .22;
  c.a = D.a; c.thr = .75;
  const [X, Y] = W(0, 0), lod = lodFor(S), k = S / lod, sp = shipSprite(c.spec, lod);
  setTier('near'); custom(`1 px = ${+(5 / S).toFixed(2)} m · ${Math.round(sp.len * S)} px hull`);
  let hov = null;
  for (const t of c.tur) {
    const [tx, ty] = c.toScreen(t.m.x, t.m.y, X, Y, S);
    if (D.mx >= 0) { const rel = wrap(Math.atan2(D.my - ty, D.mx - tx) - c.a - t.m.face); t.a += clamp(wrap(t.m.face + clamp(rel, -t.m.arc, t.m.arc) - t.a), -2.5 * dt, 2.5 * dt); }
    if (D.mx >= 0 && pickSprite(turretSprite(t.m.type, lod), tx, ty, c.a + t.a, D.mx, D.my, k)) hov = t.m.comp;
  }
  const pk = D.mx >= 0 ? pickSprite(sp, X, Y, c.a, D.mx, D.my, k) : null;
  if (!hov && pk) hov = pk.comp;
  c.draw(f, X, Y, S, { hi: hov, sys: D.sys });
  if (!D.sum) {
    const cnt = {}; let tons = 0, crew = 0;
    for (const q of sp.comps) if (q) { tons += q.tons || 0; crew += q.crew || 0; cnt[q.name] = (cnt[q.name] || 0) + 1; }
    D.sum = { tons, crew, list: Object.entries(cnt).map(([n, k]) => (k > 1 ? k + '× ' : '') + n) };
  }
  const q = hov ? sp.comps[hov] : null, sm = D.sum;
  const lines = [`${c.spec.role || ROLE[c.spec.id] || ''} · ${fmt(sm.tons)} t · crew ${fmt(sm.crew)}`, `Armour, ${NLAY} layers${armGrid(c.arm)}`];
  if (q) lines.push(`<span class="gold">${q.name}</span>`, [q.tons && fmt(q.tons) + ' t', q.htk && 'hits to destroy ' + q.htk, q.crew && 'crew ' + q.crew, q.power && q.power + ' MW', q.thrust && 'thrust ' + fmt(q.thrust), q.range && 'range ' + q.range, q.dmg && 'damage ' + q.dmg, q.track && 'tracking ' + q.track, q.fuel, q.cargo, q.craft && q.craft + ' craft', q.salvo && 'salvo ' + q.salvo, q.reload && 'reload ' + q.reload, q.res, q.layers && q.layers + ' layers'].filter(Boolean).join(' · '));
  else lines.push(`<span class="dim">${sm.list.join(' · ')}</span>`, '<span class="dim">Hover a part · wheel zooms · drag pans</span>');
  readout(`${c.spec.name || c.spec.id.toUpperCase()} class ${c.spec.code || ''}`, lines);
  if (q && pk) label(q.name, D.mx, D.my - 10, 'gold', 14);
}
const detailScene = {
  name: 'Ship close-up', draw: detailDraw, note: 'Every ship is generated top-down from its design: each part of the hull is a component with its own stats, lit by the sun as the ship turns. Turrets follow the cursor.',
  enter() {
    D.cam = new Cam(6, 2, 12);
    detailCraft();
    select([...SPECS.map(s => [s.id, s.name + ' · ' + (s.role || ROLE[s.id])]), ['x1', 'Hostile cruiser'], ['x2', 'Hostile escort']], D.cls, v => { D.cls = v; D.pal = ENEMY[v] ? 'foe' : ['atlas', 'mule', 'ark', 'lighthouse', 'harvester'].includes(v) ? 'civ' : 'navy'; D.cam.x = D.cam.y = 0; detailCraft(); });
    button('Turn', b => { D.rot = !D.rot; b.classList.toggle('on', D.rot); }, D.rot);
    button('Systems', b => { D.sys = !D.sys; b.classList.toggle('on', D.sys); }, D.sys);
    button('Take hit', () => { const c = D.craft, sp = shipSprite(c.spec, 3), p = hullPoint(sp, rand(c.len * .42, -c.len * .42), rand(6, -6)), big = Math.random() < .3; c.hit(p[0], p[1], big ? rand(4.5, 3) : rand(2.4, 1.2), rand(255, 170)); const col = clamp(Math.floor((p[0] / c.len + .5) * NCOL), 0, NCOL - 1); for (let k = col - (big ? 1 : 0); k <= col + (big ? 1 : 0); k++) if (k >= 0 && k < NCOL) c.arm[k] = Math.min(NLAY, c.arm[k] + (k === col ? (big ? 3 : 1) : 1)); });
    button('Repair', () => detailCraft());
  },
  wheel(e) { D.cam.wheel(e); },
  down(e, mx, my) { D.cam.down(mx, my); },
  move(e, mx, my) { D.mx = mx; D.my = my; D.cam.move(mx, my); },
  up() { D.cam.up(); },
};

const ladderCraft = {};
function ladderDraw(f, ts) {
  setTier('near'); custom('Same design at every detail level');
  const id = 'bastion', sp = specOf(id), a = Math.sin(ts * .35) * .22, W = f.w, H = f.h;
  const old = ship(f, id, W * .08, H * .13, 1);
  label(`Before · side view · ${Math.round(old.x1 - old.x0)} px`, old.x0, old.y1 + 4, 'dim', 0, 10);
  let x = W * .2;
  for (const S of [.375, .75, 1.5, 3]) {
    const c = ladderCraft[S] = ladderCraft[S] || new Craft(sp, PALS.navy, {}), L = c.len * S;
    c.a = a; c.draw(f, x + L / 2, H * .15, S);
    label(`${Math.round(L)} px`, x, H * .15 + Math.max(10, c.half * S) + 2, 'fl', 0, 10);
    x += L + W * .04;
  }
  const c6 = ladderCraft[6] = ladderCraft[6] || new Craft(sp, PALS.navy, {});
  c6.a = a * .6; c6.draw(f, W * .5, H * .62, 6);
  label(`${Math.round(c6.len * 6)} px · twice this in Ship close-up`, W * .5 - 120, H * .62 + c6.half * 6 + 6, 'fl', 0, 10);
  $('#readout').hidden = true;
}
const ladderScene = { name: 'Detail ladder', draw: ladderDraw, note: 'One design drawn at each zoom level. Each level is generated for its size, not shrunk from a bigger picture, so small ships stay crisp.' };

function limb(f, type, o = {}) {
  f.makeBg('space');
  const R = f.w * (o.R || 1.25);
  drawBody(f, { type, rot: o.rot ?? .45, tilt: o.tilt || 0, lights: o.lights }, f.w * (o.x ?? .02), f.h + R * (o.y ?? .62), R, true);
  if (o.moon) planet(f, Math.round(f.w * .9), Math.round(f.h * .12), o.moon, 'rock', 1.2);
  f.bg = f.d.slice();
}
function shuttles(f, list, pts, W, S, dt, pal) {
  for (const s of list) {
    if (s.u >= 1) { s.from = s.to || [s.x, s.y]; s.to = pts[Math.floor(Math.random() * pts.length)]; s.u = 0; s.dur = Math.max(3, Math.hypot(s.to[0] - s.from[0], s.to[1] - s.from[1]) / 16); s.wait = rand(3, .5); }
    if (s.wait > 0) s.wait -= dt; else s.u += dt / s.dur;
    const e = ease(s.u), nx = mix(s.from[0], s.to[0], e), ny = mix(s.from[1], s.to[1], e) + Math.sin(e * Math.PI) * (s.i % 2 ? 10 : -10);
    if (Math.hypot(nx - s.x, ny - s.y) > .01) s.a = Math.atan2(ny - s.y, nx - s.x);
    s.x = nx; s.y = ny;
    const [X, Y] = W(s.x, s.y);
    if (S >= 2 && s.wait <= 0 && s.u < 1) plume(f, X - Math.cos(s.a) * 1.6 * S, Y - Math.sin(s.a) * 1.6 * S, s.a, .4 * S, 1.6 * S);
    drawSmall(f, 'shuttle', X, Y, s.a, pal, S);
  }
}
const mkShuttles = n => Array.from({ length: n }, (_, i) => ({ x: rand(60, -60), y: rand(40, -40), a: 0, from: null, to: null, u: 1, i }));

const O = { cam: new Cam(3, 1, 8, .56, .44), t: 0, shut: [] };
function orbitInit() {
  O.t = 0; O.cam = new Cam(3, 1, 8, .56, .44); FX.length = 0;
  O.atlas = new Craft(specOf('atlas'), PALS.civ, { thr: 0 });
  O.atlas.x = -46 - O.atlas.len / 2 + 1; O.atlas.y = 0;
  O.build = new Craft(specOf('pike'), PALS.navy, { thr: 0 });
  O.bx = 47 + O.build.len / 2;
  O.mule = new Craft(specOf('mule'), PALS.civ, {});
  O.path = new Craft(specOf('pathfinder'), PALS.navy, {});
  O.shut = mkShuttles(7);
}
function orbitSite(f, W, S, dt, ts, foc) {
  O.t += dt; stepFx(dt);
  const lod = Math.min(6, lodFor(S)), k = S / lod;
  const cyc = O.t % 46, prog = cyc < 34 ? .22 + cyc / 34 * .78 : 1, leave = cyc > 37 ? (cyc - 37) : 0;
  const [sx, sy] = W(0, 0);
  for (const s of [-1, 1]) { const [gx, gy] = W(46, s * 9.5), [gx2] = W(46 + O.build.len + 4, 0); for (let x = Math.max(0, Math.round(gx)); x < Math.min(f.w, gx2); x++) for (let j = 0; j < Math.max(2, S); j++) f.px(x, gy + j * s, (Math.floor((x - gx) / S) + j) % 4 === 0 ? [96, 100, 126] : [58, 60, 84]); for (let q = 0; q < 5; q++) { const [px] = W(50 + q * (O.build.len / 4.4), 0); for (let j = 0; j < 3 * S; j++) f.px(px, gy - s * j, [74, 76, 98]); f.px(px, gy - s * 3 * S, (FRAME >> 4) % 5 === q ? PAL.sel : [150, 62, 60]); } }
  drawSprite(f, stationSprite(lod, false), sx, sy, 0, PALS.civ, { k });
  O.atlas.a = 0; { const [X, Y] = W(O.atlas.x, O.atlas.y); O.atlas.draw(f, X, Y, S); label('Ceres Star · unloading 2,400 t machinery', X - O.atlas.len * S * .3, Y + O.atlas.half * S, 'fl', 0, 14); }
  drawSprite(f, stationSprite(lod, true), sx, sy, O.t * .07, PALS.civ, { k });
  { const b = O.build, x = O.bx + leave * leave * 1.6; b.x = x; b.a = 0; b.thr = leave ? Math.min(1, leave * .4) : 0; const [X, Y] = W(x, 0); b.draw(f, X, Y, S, prog < 1 ? { build: prog } : {});
    if (prog < 1 && Math.random() < .5) fx('spark', O.bx - b.len / 2 + prog * b.len, rand(4, -4), { vx: rand(8, -8), vy: rand(8, -8), life: .4, col: [200, 240, 255] });
    label(prog < 1 ? `Slipway 1 · Pike class · ${Math.round(prog * 100)}% · ${Math.round((1 - prog) * 118)} days` : leave ? 'Tern · launched' : 'Slipway 1 · Pike class · fitting out', W(O.bx, 0)[0] - 60, W(0, -13)[1], 'gold', 0, -10); }
  { const m = O.mule, a = O.t * .045 + 2.2; m.x = Math.cos(a) * 150; m.y = Math.sin(a) * 86 + 6; m.a = a + Math.PI / 2 + .12; m.thr = .5; const [X, Y] = W(m.x, m.y); m.draw(f, X, Y, S); if (X > 0 && X < f.w && Y > 0 && Y < f.h) label('Juno Star · tanker', X + 10, Y + m.half * S, 'fl', 0, 12); }
  { const p = O.path, u = (O.t % 60) / 60; p.x = -260 + u * 620; p.y = -78 + Math.sin(u * 3) * 14; p.a = Math.atan2(Math.cos(u * 3) * 14 * 3 / 620, 1); p.thr = .9; const [X, Y] = W(p.x, p.y); p.draw(f, X, Y, S); if (X > 0 && X < f.w) label('Halley · outbound survey', X + 10, Y + p.half * S, 'fl', 0, 12); }
  shuttles(f, O.shut, [[-46, 4], [46, -4], [0, 34], [0, -34], [O.atlas.x, 12], [O.atlas.x + 14, -12], [O.bx, 14], [-150, 120], [-110, 150], [O.mule.x, O.mule.y]], W, S, dt, PALS.civ);
  for (const i of [0, 1, 2]) { const a = O.t * .22 + 1, x = Math.cos(a) * 96 - Math.cos(a + 1.57) * i * 6, y = Math.sin(a) * 60 - 4 + (i - 1) * 7, h = a + Math.PI / 2, [X, Y] = W(x, y); plume(f, X - Math.cos(h) * 2 * S, Y - Math.sin(h) * 2 * S, h, .45 * S, 2.2 * S); drawSmall(f, 'fighter', X, Y, h, PALS.navy, S); }
  drawFx(f, W, S);
  label('Sol Station · habitat ring 12,000', sx - 60, sy - 34 * S, 'fl', 0, -12);
  if (foc && FRAME % 10 === 0) readout('Sol Station · Earth orbit', [`Slipway 1 ${meter(prog)} Pike`, `Slipway 2 ${meter(.31)} Atlas`, `Slipway 3 <span class="dim">idle</span>`, `Fuel ${meter(.72, 'sh')} 4.1 Ml`, 'Iron 412 kt · Titanium 96 kt', 'Copper 58 kt · Uranium 7 kt', `<span class="dim">Shuttles ${O.shut.length} · patrol 3 · docked 1</span>`]);
}

const BD = { cam: new Cam(4.5, 1.5, 10), t: 0 };
function boardInit() {
  BD.t = 0; BD.cam = new Cam(4.5, 1.5, 10); FX.length = 0;
  const T = BD.T = new Craft(specOf('x1'), PALS.foe, { a: .22, thr: .3, hot: true });
  const sp = shipSprite(T.spec, 3), cen = compCentres(sp).filter(Boolean);
  const start = [cen.find(q => q.x < -T.len * .3), cen.reduce((a, q) => Math.abs(q.x) < Math.abs(a.x) ? q : a), cen.find(q => q.x > T.len * .12 && Math.abs(q.y) < 2)].filter(Boolean);
  BD.pods = start.map((q, i) => ({ q, side: i % 2 ? 1 : -1, from: [-T.len * .5 - 70 - i * 18, (i % 2 ? 1 : -1) * (50 + i * 12)] }));
  const dist = a => Math.min(...start.map(s => Math.abs(s.x - a.x) + Math.abs(s.y - a.y) * .4));
  BD.sched = [...cen].sort((a, b) => dist(a) - dist(b)).map((q, i) => ({ q, name: sp.comps[q.c].name, t0: 8 + Math.max(0, i - start.length + 1) * 1.7, t1: 11 + Math.max(0, i - start.length + 1) * 1.7 }));
  BD.end = BD.sched[BD.sched.length - 1].t1;
  BD.own = new Uint8Array(sp.comps.length);
}
function boardSite(f, W, S, dt, ts, foc) {
  BD.t += dt; stepFx(dt);
  if (BD.t > BD.end + 7) boardInit();
  const T = BD.T, t = BD.t, done = t > BD.end;
  T.a = .22 + Math.sin(t * .13) * .04; T.thr = done ? .6 : .3; T.hot = !done;
  let taken = 0; const fight = [];
  for (const s of BD.sched) { BD.own[s.q.c] = t >= s.t1 ? 2 : t >= s.t0 ? 1 : 0; if (t >= s.t1) taken++; else if (t >= s.t0) fight.push(s); }
  for (const tu of T.tur) { const o = BD.own[tu.m.comp]; tu.a += clamp(wrap((o === 2 ? tu.m.face : tu.m.face + Math.sin(t * 1.7 + tu.m.x) * 1.2) - tu.a), -1.5 * dt, 1.5 * dt); }
  const [X, Y] = W(0, 0);
  T.draw(f, X, Y, S, { own: BD.own, pal2: PALS.navy });
  fight.forEach((s, i) => { const q = s.q, [wx, wy] = worldOf(T, q.x + rand(3, -3), q.y + rand(2, -2)); if (Math.random() < dt * 5) fx('spark', wx, wy, { vx: rand(5, -5), vy: rand(5, -5), life: .35, col: Math.random() < .5 ? [255, 236, 170] : [255, 130, 100] }); if (i < 2) { const [lx, ly] = W(...worldOf(T, q.x, q.y)); label(s.name + ' · fighting', lx, ly, 'hot', 10, -14 - i * 16); } });
  const u = ease(t / 7);
  BD.pods.forEach((p, i) => {
    const lp = [p.q.x, p.side * (p.q.hw + 1.4)], pos = t < 7 ? lerp2(p.from, lp, u) : lp, [wx, wy] = worldOf(T, pos[0], pos[1]), [px, py] = W(wx, wy), a = t < 7 ? T.a + Math.atan2(lp[1] - p.from[1], lp[0] - p.from[0]) : T.a - p.side * Math.PI / 2;
    drawSmall(f, 'shuttle', px, py, a, PALS.navy, S, t < 7 ? { ghost: .5 } : {});
    if (t < 7 && i === 0) label('Boarding craft ×3 · cloaked', px, py - 8, 'fl', 12);
    if (t >= 7 && !p.lit) { p.lit = true; fx('flash', wx, wy, { r: 2.5, life: .4 }); fx('ring', wx, wy, { r: 7, life: .5, col: [110, 220, 230] }); }
  });
  drawFx(f, W, S);
  label(done ? 'C-014 · taken as prize' : 'C-014 · hostile cruiser', X - 40, Y + T.half * S * .8 + 8, done ? 'fl' : 'hot', 0, 12);
  const n = BD.sched.length, marines = Math.round(36 - clamp((t - 8) / (BD.end - 8), 0, 1) * 9);
  if (foc && FRAME % 6 === 0) readout('Boarding action', [t < 7 ? 'Approach under cloak · enemy sensors blind' : t < 8 ? 'Latched · breaching' : done ? '<span class="gold">Ship taken · prize crew aboard</span>' : `Marines aboard ${marines} · Sgt. Rhee`, `Sections held ${meter(taken / n, 'sh')} ${taken}/${n}`, fight.length ? `Fighting in ${fight.length} section${fight.length > 1 ? 's' : ''}` : done ? 'Crew captured 212' : 'No contact yet', '<span class="dim">Grey hull = held · flashing = contested</span>']);
}

const SV = { cam: new Cam(3, 1, 8), t: 0 };
function salvInit() {
  SV.t = 0; SV.cam = new Cam(3, 1, 8); FX.length = 0;
  const w = SV.w = new Craft(specOf('x1'), PALS.foe, { dead: true, thr: 0 });
  for (let i = 0; i < 9; i++) { const p = hullPoint(shipSprite(w.spec, 3), rand(w.len * .46, -w.len * .46), rand(7, -7)); w.hit(p[0], p[1], rand(4.5, 2), rand(255, 170)); }
  for (const y of [-6, -2, 2, 6]) w.hit(4, y, 3.4, 255);
  SV.ship = new Craft(specOf('atlas'), PALS.civ, { thr: 0, x: -92, y: 26, a: -.12 });
  SV.dr = mkShuttles(5);
  for (let i = 0; i < 70; i++) { const a = rand(TAU), r = rand(70, 6); fx('debris', 34 + Math.cos(a) * r, -6 + Math.sin(a) * r * .7, { vx: rand(.5, -.5), vy: rand(.5, -.5), life: 1e6, r: rand(1.3, .3) }); }
}
function salvSite(f, W, S, dt, ts, foc) {
  SV.t += dt; stepFx(dt);
  const w = SV.w, t = SV.t % 120;
  const A = { x: 20 - t * .1, y: -14 - t * .04, a: .5 + t * .006 }, Bp = { x: 24 + t * .12, y: -8 + t * .07, a: .74 - t * .009 };
  w.a = A.a; { const [X, Y] = W(A.x, A.y); w.draw(f, X, Y, S, { cutU: [4, 1] }); }
  w.a = Bp.a; { const [X, Y] = W(Bp.x, Bp.y); w.draw(f, X, Y, S, { cutU: [4, -1] }); }
  const sh = SV.ship; { const [X, Y] = W(sh.x, sh.y); sh.draw(f, X, Y, S); label('Ceres Star · salvage tender', X - 50, Y + sh.half * S * .8 + 6, 'fl', 0, 12); }
  const pa = worldOf(A, -18, 3), pb = worldOf(Bp, 22, -2), bow = worldOf(sh, sh.len / 2 + 2, 0);
  shuttles(f, SV.dr, [pa, pb, worldOf(A, -6, -4), worldOf(Bp, 10, 4), worldOf(sh, 10, -8), worldOf(sh, -4, 9)], W, S, dt, PALS.civ);
  for (const d of SV.dr) if (d.wait > 0 && Math.hypot(d.x - sh.x, d.y - sh.y) > 40 && Math.random() < dt * 14) fx('spark', d.x + rand(2, -2), d.y + rand(2, -2), { vx: rand(9, -9), vy: rand(9, -9), life: .35, col: [200, 240, 255] });
  const cyc = SV.t % 16, u = ease(cyc / 12), cr = lerp2(pa, bow, u);
  if (cyc < 12.4) {
    const [x0, y0] = W(bow[0], bow[1]), [x1, y1] = W(cr[0], cr[1]);
    for (const o of [-1, 0, 1]) clipLine(f, x0, y0 + o * Math.max(1, S * .6), x1, y1 + o * Math.max(1, S * .3), o ? [52, 128, 128] : PAL.jump, 3, FRAME >> 1);
    drawProp(f, 'crate', x1, y1, SV.t * .4, PALS.civ, S);
    label('Drive core · unknown design', x1, y1, 'gold', 10 + S * 3, -12);
  }
  drawFx(f, W, S);
  { const [X, Y] = W(Bp.x, Bp.y); label('Wreck · unknown cruiser', X, Y + 12 * S, 'dim', 0, 10); }
  const pr = clamp(SV.t / 60, 0, 1);
  if (foc && FRAME % 8 === 0) readout('Salvage', [`Wreck searched ${meter(.42 + pr * .5)} ${Math.round(42 + pr * 50)}%`, 'Alloys 1,240 t · fuel 60 kl', 'Twin beam turret ×1 · repairable', '<span class="gold">Drive core · unknown design</span>', '<span class="dim">Study it: propulsion research +12%</span>', '<span class="dim">Or fit it: one hull, 7,400 km/s</span>']);
}

const DK = { cam: new Cam(3, 1, 8), t: 0 };
function dockInit() {
  DK.t = 0; DK.cam = new Cam(2.6, 1, 8, .42, .42); FX.length = 0;
  DK.h = new Craft(specOf('harvester'), PALS.civ, { thr: 0, x: 0, y: 0, a: 0 });
  DK.m = new Craft(specOf('mule'), PALS.civ, {});
  DK.dr = mkShuttles(3);
}
function dockSite(f, W, S, dt, ts, foc) {
  DK.t += dt; stepFx(dt);
  const h = DK.h, m = DK.m, cyc = DK.t % 34;
  const dockX = h.len / 2 + m.len / 2 + 5;
  const [sx0, sy0] = W(-h.len * .2, 3), [sx1, sy1] = W(-h.len * .2 - 190, 250);
  for (const o of [-1, 1]) clipLine(f, sx0 + o * S, sy0, sx1 + o * S * 3, sy1, [134, 126, 146], 2, 0);
  for (let i = 0; i < 26; i++) { const v = 1 - ((DK.t * .12 + i / 26) % 1), x = mix(sx0, sx1, v) + Math.sin(i * 7 + DK.t) * S, y = mix(sy0, sy1, v); f.px(x, y, i % 3 ? [226, 198, 158] : [255, 236, 190]); if (S >= 2) f.px(x + 1, y, [196, 160, 118]); }
  { const [X, Y] = W(0, 0); h.draw(f, X, Y, S); label('Deep Well 2 · harvester', X - h.len * S * .4, Y + h.half * S * .75 + 6, 'fl', 0, 12); }
  let fuel = 32, st = 'approaching';
  if (cyc < 10) { const u = 1 - Math.pow(1 - cyc / 10, 3); m.x = mix(dockX + 330, dockX, u); m.y = mix(-40, 0, u); m.a = Math.PI + (1 - u) * .12; m.thr = (1 - u) * .8; }
  else if (cyc < 24) { m.x = dockX; m.y = 0; m.a = Math.PI; m.thr = 0; fuel = 32 + (cyc - 10) / 14 * 68; st = 'docked · pumping'; }
  else { const u = (cyc - 24) / 10, d = Math.pow(Math.max(0, u - .25), 2) * 520; m.a = Math.PI + ease(u * 2.4) * 2.3; m.thr = clamp(u * 3 - .6, 0, 1); m.x = dockX + u * 14 + Math.cos(Math.PI + 2.3) * d; m.y = Math.sin(Math.PI + 2.3) * d; fuel = 100; st = 'departing'; }
  { const [X, Y] = W(m.x, m.y); m.draw(f, X, Y, S); label(`Juno Star · tanker · ${st}`, X - 30, Y - m.half * S * .8, 'fl', 0, -14); }
  if (cyc >= 10 && cyc < 24) { const [x0, y0] = W(h.len / 2, 0), [x1, y1] = W(dockX - m.len / 2, 0); for (let j = -1; j <= 1; j++) f.line(x0, y0 + j, x1, y1 + j, j ? [58, 60, 84] : [96, 100, 126]); for (let q = 0; q < 5; q++) { const v = (DK.t * 1.2 + q / 5) % 1; f.px(mix(x0, x1, v), y0, PAL.sel); } }
  shuttles(f, DK.dr, [[0, 10], [h.len * .3, -10], [-h.len * .3, 12], [m.x, m.y + 12], [120, -80], [-140, 60]], W, S, dt, PALS.civ);
  drawFx(f, W, S);
  if (foc && FRAME % 8 === 0) readout('Refuelling · Jupiter orbit', [`Juno Star tanks ${meter(fuel / 100, 'sh')} ${Math.round(fuel)}%`, `Harvester stock ${meter(.64)} 4.1 Ml`, 'Scoop rate 38 kl per day', '<span class="dim">Next tanker in 6 days</span>']);
}

const GT = { cam: new Cam(2.4, .7, 8), t: 0 };
function gateInit() {
  GT.t = 0; GT.cam = new Cam(2.4, .7, 8); FX.length = 0; GT.glow = 0;
  GT.col = [['bastion', 'Resolute', -16], ['pike', 'Kestrel', -30], ['lancer', 'Harrier', -6], ['lancer', 'Merlin', -24]].map(([id, nm, y], i) => ({ c: new Craft(specOf(id), PALS.navy, { thr: .7 }), nm, y, i }));
  GT.arr = { c: new Craft(specOf('atlas'), PALS.civ, { thr: .6 }), nm: 'Vesta Star' };
}
function gateSite(f, W, S, dt, ts, foc) {
  GT.t += dt; stepFx(dt);
  const GX = 0, v = 26, gap = 105;
  const total = (GT.col.length * gap + 330) / v + 3, t = GT.t % total;
  const [gx, gy] = W(GX, 0), plane = Math.round(gx);
  GT.glow = Math.max(0, GT.glow - dt * 1.4);
  let through = 0;
  drawGate(f, gx, gy, S, ts, GT.glow);
  const pass = (c, x, y, a, nm) => {
    c.x = x; c.y = y; c.a = a;
    const bow = x + Math.cos(a) * c.len / 2, stern = x - Math.cos(a) * c.len / 2;
    if (Math.min(bow, stern) > GX) return true;
    if (Math.max(bow, stern) > GX) { GT.glow = Math.max(GT.glow, .9); if (Math.random() < dt * 10) fx('spark', GX, y + rand(c.half * .6, -c.half * .6), { vx: rand(-4, -22), vy: rand(10, -10), life: .5, col: [200, 250, 245] }); if (!c.rip || GT.t - c.rip > .5) { c.rip = GT.t; fx('ring', GX, y, { r: c.half + 8, life: .6, col: PAL.jump }); } }
    const [X, Y] = W(x, y);
    c.draw(f, X, Y, S, { maxX: plane - 1 });
    if (X > 10 && X < plane - 30) label(nm, X - nm.length * 2, Y + c.half * S * .75 + 5, 'fl', 0, 12);
    return false;
  };
  for (const q of GT.col) if (pass(q.c, GX - 260 - q.i * gap + t * v, q.y, 0, q.nm)) through++;
  { const a = GT.arr, ta = (GT.t + total * .45) % total, x = GX + a.c.len / 2 - ta * v * .8; if (x > GX - 420) pass(a.c, x, 30, Math.PI, a.nm + ' · inbound freight'); }
  drawFx(f, W, S);
  label('Jump gate A · to Alpha Centauri', gx, gy - 80 * S, 'fl', 12, 0);
  if (foc && FRAME % 6 === 0) readout('Gate transit', [`Task force 2 through ${meter(through / GT.col.length, 'sh')} ${through}/${GT.col.length}`, 'Inbound: Vesta Star, 5,000 t ore', `Gate aperture ${fmt(94 * 5)} m`, '<span class="dim">Nothing wider than the aperture fits</span>']);
}

const GR = { cam: new Cam(1, .55, 2.6), t: 0, tex: null, TW: 1040, TH: 600 };
const GLOD = [1, 2];
function groundTex() {
  if (GR.tex) return;
  const W = GR.TW, H = GR.TH, hgt = new Float32Array(W * H), tex = GR.tex = new Uint8ClampedArray(W * H * 3), Q = 4, gw = (W >> 2) + 2, gh = (H >> 2) + 2;
  const base = new Float32Array(gw * gh), vg = new Float32Array(gw * gh), dr = new Float32Array(gw * gh);
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) { const X = x * Q, Y = y * Q, k = y * gw + x; base[k] = fbm(X * .0045 + 3, Y * .0045, 2.2, 5) * 70; vg[k] = fbm(X * .012 + 40, Y * .012, 5.5, 4); dr[k] = Math.abs(fbm(X * .006 + 9, Y * .006, 1.3, 4) - .5); }
  const smp = (g, x, y) => { const fx = x / Q, fy = y / Q, ix = fx | 0, iy = fy | 0, tx = fx - ix, ty = fy - iy, k = iy * gw + ix; return mix(mix(g[k], g[k + 1], tx), mix(g[k + gw], g[k + gw + 1], tx), ty); };
  const cr = Array.from({ length: 16 }, (_, i) => [hash(i, 1, 61) * W, hash(i, 2, 61) * H, 8 + hash(i, 3, 61) * 30]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) hgt[y * W + x] = smp(base, x, y) + noise3(x * .03, y * .03, 7.1) * 5 + noise3(x * .09, y * .09, 3.3) * 2.2;
  for (const [cx, cy, r] of cr) for (let y = Math.max(0, Math.floor(cy - r * 1.3)); y < Math.min(H, cy + r * 1.3); y++) for (let x = Math.max(0, Math.floor(cx - r * 1.3)); x < Math.min(W, cx + r * 1.3); x++) { const d = Math.hypot(x - cx, y - cy) / r; if (d < 1.3) hgt[y * W + x] += d < 1 ? -r * .35 * (1 - d * d) + (d > .8 ? (d - .8) * r * .5 : 0) : (1.3 - d) / .3 * r * .1; }
  const P = [[70, 62, 50], [98, 86, 62], [126, 110, 76], [152, 134, 92], [176, 158, 112], [200, 184, 138]], G = [[52, 60, 44], [70, 80, 54], [90, 100, 64], [112, 120, 76], [134, 140, 92], [156, 160, 110]];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const k = y * W + x, dx = (hgt[k + (x < W - 1 ? 1 : 0)] - hgt[k - (x > 0 ? 1 : 0)]) * .5, dy = (hgt[k + (y < H - 1 ? W : 0)] - hgt[k - (y > 0 ? W : 0)]) * .5, l = Math.hypot(dx, dy, 1.1);
    const L = (-dx * LD[0] - dy * LD[1] + 1.1 * LD[2]) / l, dv = dith(x, y), veg = smp(vg, x, y) + (dv - .5) * .03, dry = smp(dr, x, y) < .012;
    const lv = clamp(Math.floor(2.6 + (L - LD[2]) * 5 + (hgt[k] - 35) * .012 + (dv - .5) * .9), 0, 5), c = dry ? P[Math.max(0, lv - 2)] : (veg > .56 ? G : P)[lv];
    tex[k * 3] = c[0]; tex[k * 3 + 1] = c[1]; tex[k * 3 + 2] = c[2];
  }
}
function groundInit() {
  groundTex();
  Object.assign(GR, { t: 0, cam: new Cam(1, .55, 2.6), scorch: [], shots: [], beams: [], later: [], strike: 0 });
  GR.cam.x = -45;
  FX.length = 0;
  const reg = (name, x, y, team, n = 54) => ({ name, x, y, team, n, alive: n, men: Array.from({ length: n }, (_, i) => ({ ox: (i % 9) * 5 - 20 + rand(1.5, -1.5), oy: Math.floor(i / 9) * 5 - 12 + rand(1.5, -1.5), alive: true })) });
  GR.regs = [reg('1st Marines', -250, -90, 0), reg('2nd Marines', -250, 10, 0), reg('3rd Marines', -250, 110, 0), reg('Garrison A', 95, -70, 1, 45), reg('Garrison B', 90, 60, 1, 45)];
  GR.tanks = [[-230, -40], [-240, 60], [-215, 150], [-225, -130]].map(([x, y], i) => ({ x, y, a: 0, cd: rand(3, 1), alive: true, i }));
  GR.bunk = [[120, -120], [105, -10], [120, 110], [150, 40]].map(([x, y]) => ({ x, y, a: Math.PI, cd: rand(4, 2), hp: 5 }));
}
function groundDraw(f, ts, dt) {
  GR.t += dt; stepFx(dt);
  if (GR.t > 75) groundInit();
  const cam = GR.cam; cam.step(dt);
  const S = cam.S, W = cam.W(f), t = GR.t, D = f.d, TW = GR.TW, TH = GR.TH, tex = GR.tex, iS = 1 / S, wx0 = cam.x - f.w * .5 * iS + TW / 2, wy0 = cam.y - f.h * .5 * iS + TH / 2;
  setTier('near'); custom(`1 px = ${+(1 / S).toFixed(1)} m · ground map`);
  for (let y = 0; y < f.h; y++) { const ty = Math.floor(wy0 + y * iS); for (let x = 0; x < f.w; x++) { const tx = Math.floor(wx0 + x * iS), k = (y * f.w + x) * 4; if (tx < 0 || ty < 0 || tx >= TW || ty >= TH) { D[k] = 14; D[k + 1] = 12; D[k + 2] = 20; continue; } const q = (ty * TW + tx) * 3; D[k] = tex[q]; D[k + 1] = tex[q + 1]; D[k + 2] = tex[q + 2]; } }
  for (const s of GR.scorch) { const [X, Y] = W(s.x, s.y), R = Math.max(1, s.r * S); if (X < -R || Y < -R || X > f.w + R || Y > f.h + R) continue; for (let j = -Math.ceil(R); j <= R; j++) for (let i = -Math.ceil(R); i <= R; i++) { const d = (i * i + j * j) / (R * R); if (d <= 1 && dith(Math.round(X + i), Math.round(Y + j)) < 1.1 - d) f.px(X + i, Y + j, d < .3 ? [38, 30, 30] : [58, 48, 40]); } }
  for (let i = GR.later.length - 1; i >= 0; i--) { const q = GR.later[i]; q.t -= dt; if (q.t <= 0) { explode(q.x, q.y, q.r); GR.later.splice(i, 1); } }
  const adv = clamp((t - 6) / 26, 0, 1), front = mix(-250, -20, ease(adv)), eng = adv > .85;
  { const [X, Y] = W(250, 0); drawProp(f, 'colony', X - 85 * S, Y, 0, PALS.foe, S, {}, GLOD); label('Colony · garrison HQ', X - 40 * S, Y - 66 * S, 'hot', 0, -8); }
  for (const b of GR.bunk) {
    const [X, Y] = W(b.x, b.y);
    drawProp(f, 'bunker', X - 5 * S, Y, 0, PALS.foe, S, { dead: b.hp <= 0 }, GLOD);
    if (b.hp > 0) {
      const tg = GR.tanks.filter(q => q.alive).sort((p, q) => Math.hypot(p.x - b.x, p.y - b.y) - Math.hypot(q.x - b.x, q.y - b.y))[0];
      if (tg) { b.a += clamp(wrap(Math.atan2(tg.y - b.y, tg.x - b.x) - b.a), -1.2 * dt, 1.2 * dt); b.cd -= dt; if (b.cd <= 0 && Math.hypot(tg.x - b.x, tg.y - b.y) < 260) { b.cd = rand(5, 3); GR.beams.push({ x0: b.x, y0: b.y, x1: tg.x, y1: tg.y, t: .25 }); if (Math.random() < .14 && t > 44) { tg.alive = false; explode(tg.x, tg.y, 7); GR.scorch.push({ x: tg.x, y: tg.y, r: 7 }); } else burst(tg.x, tg.y, 6, 10); } }
      const lod = S <= 1.15 ? 1.5 : 3; drawSprite(f, turretSprite('beam', lod), X, Y, b.a, PALS.foe, { k: S * 1.3 / lod });
    } else if (Math.random() < dt * 2) fx('smoke', b.x, b.y, { r: 4, life: 3, dark: true, vy: -3 });
  }
  for (const [x, y, a] of [[-345, -40, .2], [-360, 55, -.15]]) { const [X, Y] = W(x, y); dropShadow(f, X, Y, Math.round(10 * S)); drawProp(f, 'dropship', X, Y, a, PALS.navy, S, {}, GLOD); }
  for (const r of GR.regs) {
    if (!r.team) r.x = front + (r.name[0] === '2' ? 14 : 0);
    const foe = r.team;
    let alive = 0;
    for (const m of r.men) {
      const wx = r.x + m.ox + (eng && m.alive ? Math.sin(t * 3 + m.ox) * .6 : 0), wy = r.y + m.oy, [X, Y] = W(wx, wy);
      if (!m.alive) { f.px(X, Y, [70, 30, 30]); continue; }
      if (eng && Math.random() < dt * (foe ? .012 : .006)) { m.alive = false; continue; }
      alive++;
      f.px(X + 1, Y + 1, [40, 34, 30]);
      f.px(X, Y - 1, foe ? [255, 190, 170] : [220, 240, 250]); f.px(X, Y, foe ? [200, 60, 60] : [90, 130, 190]);
      if (S >= 1.6) { f.px(X + 1, Y, foe ? [150, 44, 50] : [60, 90, 150]); f.px(X + 1, Y - 1, foe ? [200, 60, 60] : [150, 180, 220]); }
      if (eng && Math.random() < dt * .5) { const o = GR.regs[foe ? Math.floor(rand(3)) : 3 + Math.floor(rand(2))], tm = o.men[Math.floor(rand(o.men.length))]; GR.shots.push({ x0: wx, y0: wy, x1: o.x + tm.ox, y1: o.y + tm.oy, t: .12, foe }); }
    }
    r.alive = alive;
    const [LX, LY] = W(r.x, r.y - 18); label(`${r.name} · ${alive}`, LX - 30, LY, foe ? 'hot' : 'fl', 0, -6);
  }
  { const r = GR.regs[1], [X, Y] = W(r.x + 30, r.y + 4), hh = Math.round(7 * Math.max(1, S * .7));
    for (let j = 0; j < hh; j++) f.px(X, Y - j, [230, 230, 240]);
    for (let j = 0; j < 3; j++) for (let i = 1; i < 5; i++) f.px(X + i, Y - hh + 1 + j, PAL.sel);
    f.px(X, Y + 1, PAL.sel); f.px(X + 1, Y + 1, [40, 34, 30]);
    label('Cmdr. Okafor · plasma lance, ruin find', X, Y, 'gold', 12, 8);
    if (eng && Math.floor(t / 5) !== Math.floor((t - dt) / 5)) { const b = GR.bunk.find(q => q.hp > 0); if (b) { GR.beams.push({ x0: r.x + 30, y0: r.y + 4, x1: b.x, y1: b.y, t: .5, lance: 1 }); b.hp -= 3; explode(b.x, b.y, 6); GR.scorch.push({ x: b.x + rand(6, -6), y: b.y + rand(6, -6), r: 8 }); } } }
  for (const k of GR.tanks) {
    if (k.alive) {
      const tx = front + 60 + (k.i % 2) * 22, tg = GR.bunk.find(b => b.hp > 0 && Math.abs(b.y - k.y) < 140) || GR.bunk.find(b => b.hp > 0);
      if (k.x < tx) { k.x += 9 * dt; k.a = 0; }
      else if (tg) { k.a += clamp(wrap(Math.atan2(tg.y - k.y, tg.x - k.x) - k.a), -dt, dt); k.cd -= dt; if (k.cd <= 0) { k.cd = rand(4, 2.5); GR.shots.push({ x0: k.x, y0: k.y, x1: tg.x, y1: tg.y, t: .3, shell: 1 }); fx('flash', k.x + Math.cos(k.a) * 6, k.y + Math.sin(k.a) * 6, { r: 2, life: .15 }); tg.hp -= .6; GR.later.push({ t: .3, x: tg.x + rand(5, -5), y: tg.y + rand(5, -5), r: 3.5 }); } }
    } else if (Math.random() < dt * 3) fx('smoke', k.x, k.y, { r: 3, life: 2.5, dark: true, vy: -3 });
    const [X, Y] = W(k.x, k.y); drawProp(f, 'tank', X, Y, k.a, PALS.navy, S * 1.4, { dead: !k.alive }, [1.5, 3]);
  }
  if (t > 10 && Math.random() < dt * 1.1) { const x = rand(190, 60), y = rand(170, -170); explode(x, y, rand(6, 3.5)); GR.scorch.push({ x, y, r: rand(7, 4) }); if (GR.scorch.length > 60) GR.scorch.shift(); }
  if (t > 40 && Math.floor(t / 11) !== Math.floor((t - dt) / 11)) { const b = GR.bunk.find(q => q.hp > 0) || { x: 200, y: 20 }; GR.strike = .9; GR.sx = b.x; GR.sy = b.y; b.hp = 0; }
  if (GR.strike > 0) { GR.strike -= dt; const [X, Y] = W(GR.sx, GR.sy), R = Math.round((6 + (1 - GR.strike) * 16) * S); for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) { const d = Math.hypot(i, j) / R; if (d < 1 && dith(Math.round(X + i), Math.round(Y + j)) < 1.4 - d - (1 - GR.strike) * .3) f.px(X + i, Y + j, d < .45 ? [255, 255, 255] : d < .75 ? [180, 240, 255] : [95, 208, 197]); } label('Orbital fire · Resolute', X, Y - R, 'fl', 10, -10); if (GR.strike <= 0) { explode(GR.sx, GR.sy, 14); GR.scorch.push({ x: GR.sx, y: GR.sy, r: 16 }); } }
  for (let i = GR.shots.length - 1; i >= 0; i--) { const s = GR.shots[i]; s.t -= dt; const [a, b] = W(s.x0, s.y0), [c, d] = W(s.x1, s.y1); if (s.shell) { const u = 1 - s.t / .3; f.px(mix(a, c, u), mix(b, d, u), [255, 240, 200]); f.px(mix(a, c, u - .04), mix(b, d, u - .04), F2); } else { const u = 1 - s.t / .12, v = Math.max(0, u - .25); f.line(mix(a, c, v), mix(b, d, v), mix(a, c, u), mix(b, d, u), s.foe ? [255, 150, 110] : [255, 240, 180]); } if (s.t <= 0) GR.shots.splice(i, 1); }
  for (let i = GR.beams.length - 1; i >= 0; i--) { const s = GR.beams[i]; s.t -= dt; const [a, b] = W(s.x0, s.y0), [c, d] = W(s.x1, s.y1); thick(f, a, b, c, d, s.lance ? Math.max(3, Math.round(S * 2.5)) : Math.max(1, Math.round(S)), s.lance ? [255, 255, 255] : [255, 236, 214], s.lance ? [230, 120, 255] : [239, 111, 94]); if (s.t <= 0) GR.beams.splice(i, 1); }
  { const cyc = t % 24, lx = -330, ly = 150; let alt = 0, vis = true;
    if (cyc < 7) alt = 1 - ease(cyc / 7); else if (cyc < 15) alt = 0; else if (cyc < 22) alt = ease((cyc - 15) / 7); else vis = false;
    if (vis) { const x = lx - alt * 180, y = ly + alt * 60, [X, Y] = W(x, y), [SX, SY] = W(x + 6 + alt * 46, y + 6 + alt * 46), cs = Math.ceil(S);
      for (let j = -5; j <= 5; j++) for (let i = -16; i <= 16; i++) if (i * i / 256 + j * j / 25 <= 1) { const px = Math.round(SX + i * S), py = Math.round(SY + j * S); if (dith(px, py) < .75 - alt * .35) f.rect(px, py, cs, cs, [50, 44, 40]); }
      drawProp(f, 'dropship', X, Y, .12 - alt * .3, PALS.navy, S * (1 + alt * .35), {}, GLOD);
      if (alt > 0 && alt < .5 && Math.random() < dt * 20) fx('smoke', x + rand(14, -14) + alt * 40, y + rand(8, -8) + alt * 40, { r: 3, life: 1.2, vx: rand(14, -14), vy: rand(14, -14) });
      label(cyc < 7 ? 'Dropship D-4 · landing' : cyc < 15 ? 'D-4 · unloading 4th Marines' : 'D-4 · lifting', X, Y - 16 * S, 'fl', 10, -8); } }
  drawFx(f, W, S);
  const ours = GR.regs.filter(r => !r.team).reduce((a, r) => a + r.alive, 0), theirs = GR.regs.filter(r => r.team).reduce((a, r) => a + r.alive, 0), bk = GR.bunk.filter(b => b.hp > 0).length;
  if (FRAME % 8 === 0) readout('Ground invasion', [`Marines ${meter(ours / 162, 'sh')} ${ours}`, `Garrison ${meter(theirs / 90)} ${theirs}`, `Armour ${GR.tanks.filter(k => k.alive).length}/4 · bunkers left ${bk}/4`, 'Artillery 3 batteries · orbital fire on call', '<span class="gold">Cmdr. Okafor · tactics 4 · plasma lance</span>', '<span class="dim">The lance came out of a ruin: one of a kind</span>']);
}
const groundScene = { name: 'Ground invasion', draw: groundDraw, note: 'A landing against a defended colony: regiments, armour, artillery, orbital fire, and a commander carrying a weapon found in a ruin. A sketch for the ground-combat decision.', enter: groundInit, ...camHooks(() => GR.cam) };
const SCENES = { zoom: mapScene, detail: detailScene, ground: groundScene, ladder: ladderScene };
