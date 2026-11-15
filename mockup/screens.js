'use strict';
let ready = false, selCls = 'bastion', selCmd = 0, selSys = 'sol';
const PANEL = [28, 24, 56];
const tbl = (head, rows, attr) => `<table><tr>${head.map(h => `<th${h[0] === '>' ? ' class="n"' : ''}>${h.replace('>', '')}</th>`).join('')}</tr>${rows.map((r, n) => `<tr${attr ? attr(n) : ''}>${r.map((c, i) => `<td${head[i][0] === '>' ? ' class="n"' : ''}>${c}</td>`).join('')}</tr>`).join('')}</table>`;
const pct = v => `${bar(v)} ${v}%`;
const dl = rows => `<dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
const pan = (title, body, cls = '', pb = '') => `<section class="pan ${cls}"><h2>${title}</h2><div class="pb ${pb}">${body}</div></section>`;
const fitv = (id, style = '', labels = '') => `<div class="view fit${/height/.test(style) ? ' fixedh' : ''}" style="${style}"><canvas id="${id}"></canvas>${labels ? `<div class="labels plain" id="${labels}"></div>` : ''}</div>`;
const scr = id => $(`#stage > [data-screen="${id}"]`);
function fit(key, id, scale, vs = .7, bg) {
  const v = $('#' + id).parentElement;
  fb[key] = new FB($('#' + id), Math.max(8, Math.floor(v.clientWidth / scale)), Math.max(8, Math.floor(v.clientHeight / scale)), scale, vs);
  if (bg) fb[key].makeBg(bg);
  return fb[key];
}

const CELLS = [...Object.keys(CORE).map(k => ['core', k]), ['stern', 'engines'], ['stern', 'big'], ...Object.keys(BOW).map(k => ['bow', k]), ...Object.keys(ATT).map(k => ['att', k])];
function pickClass(id) {
  selCls = id;
  const sp = spec(id), m = measure(sp), hard = sp.parts.reduce((s, p) => s + (p[1] ? 1 : 0) + (p[2] ? 1 : 0), 0), mass = Math.round(m.w * m.h * 3.1 / 10) * 10;
  $('#clsName').innerHTML = `${sp.name} class <small>${sp.role}</small>`;
  $('#dSpeed').textContent = sp.stern ? Math.round((sp.stern[0] === 'big' ? 2600 : 1500 * sp.stern[1]) * 1000 / mass).toLocaleString('en') + ' km/s' : 'No drive';
  $('#dStats').innerHTML = Object.entries({ Mass: mass.toLocaleString('en') + ' t', Length: m.w * 4 + ' m', Sections: sp.parts.length + 2, Hardpoints: hard, Crew: 30 + sp.parts.length * 22 + hard * 9 }).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('');
  $$('.card').forEach(c => c.classList.toggle('on', c.dataset.cls === id));
  if (SCREEN === 'classes') { fitDesign(); render(); }
}
function fitDesign() {
  const v = $('#designCv').parentElement, m = measure(spec(selCls));
  let sc = 8;
  while (sc > 2 && ((m.w + 30) * sc > v.clientWidth || (m.h + 12) * sc + 96 > v.clientHeight)) sc--;
  fit('design', 'designCv', sc, .7, 'grid');
}
function drawClasses() {
  const f = fb.design, sp = spec(selCls), m = measure(sp), room = f.h - Math.ceil(96 / f.scale) - m.h, cy = Math.max(6, Math.floor(room / 2)) - m.y0;
  f.start();
  const ps = shipCentered(f, sp, A, cy), y = cy + m.y1 + 5, end = ps[ps.length - 1].x + ps[ps.length - 1].w;
  f.line(ps[0].x, y, end, y, PAL.orbit, 2);
  for (const q of [...ps.map(q => q.x), end]) { f.px(q, y - 2, PAL.sel); f.px(q, y - 1, PAL.sel); f.px(q, y, PAL.sel); }
  f.present();
  if (!f.called) {
    f.called = true;
    $('#designLabels').innerHTML = ps.map(q => `<span style="left:${(q.x + q.w / 2) * f.scale}px;top:${(y + 3) * f.scale}px">${q.name}</span>`).join('');
  }
  for (const s of SPECS) { const g = fb['g-' + s.id]; stars(g, s.stern ? A : 0, 14); shipCentered(g, s, A); g.present(); }
  const p = fb.parts;
  p.fill(PANEL);
  CELLS.forEach(([kind, k], n) => {
    const ox = (n % 4) * 30, oy = Math.floor(n / 4) * 34, cy2 = oy + 13;
    if (kind === 'core') CORE[k](p, ox + Math.floor((30 - PW[k]) / 2), cy2, A);
    else if (kind === 'stern') STERN[k](p, ox + (k === 'big' ? 12 : 13), cy2, A, 2);
    else if (kind === 'bow') BOW[k](p, ox + Math.floor((30 - PW[k]) / 2), cy2, A);
    else {
      for (let i = 0; i < 12; i++) p.px(ox + 9 + i, oy + 21, C.o);
      ATT[k]((dx, kk, c) => p.px(ox + 11 + dx, oy + 21 - kk, c), A, 2);
    }
  });
  p.present();
}

function drawColony() {
  const f = fb.planet, a = S * .03 + A * .004;
  f.start();
  planet(f, 75, 75, 60, 'mars', A * .012, { lights: true, tilt: .43 });
  if (Math.sin(a) > -.2 || Math.abs(Math.cos(a)) > .9) planet(f, Math.round(75 + Math.cos(a) * 70), Math.round(75 + Math.sin(a) * 9), 2, 'rock', 0);
  f.present();
  surfaceScene(fb.surface, A);
}

function drawEconomy() {
  const f = fb.chart, base = f.h - 8, top = f.h - 22, step = Math.floor((f.w - 16) / 12), bw = Math.max(3, Math.floor(step / 2) - 2);
  f.fill(PANEL);
  for (let x = 4; x < f.w - 4; x += 2) f.px(x, base, PAL.orbit);
  for (let i = 0; i < 12; i++) {
    const inc = Math.round((.42 + hash(i, 1, 4) * .58) * top), out = Math.round((.34 + hash(i, 2, 4) * .5) * top), x = 8 + i * step;
    f.rect(x, base - inc, bw, inc, [190, 138, 72]); f.rect(x, base - inc, bw, 1, [242, 179, 93]);
    f.rect(x + bw + 1, base - out, bw, out, [150, 62, 70]); f.rect(x + bw + 1, base - out, bw, 1, [239, 111, 94]);
  }
  f.present();
  const p = fb.ecoPlanet;
  p.start();
  planet(p, Math.floor(p.w / 2), Math.floor(p.h / 2), Math.max(10, Math.floor(Math.min(p.w, p.h) / 2) - 8), 'mars', A * .015, { tilt: .43, lights: true });
  p.present();
}

const TECH = [['Chemical rockets', 0, 1, 'done'], ['Nuclear thermal', 1, 0, 'done'], ['Solar sail', 1, 2, 'done'], ['Ion drive', 2, 0, 'now', 64], ['Fusion torch', 2, 1, 'open'], ['Laser sail', 2, 2, 'open'], ['Plasma drive', 3, 0, 'lock'], ['Antimatter', 3, 1, 'lock']];
const TEDGE = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [3, 6], [4, 6], [4, 7]];
const tx = n => 10 + Math.round(n[1] * (fb.tech.w - 84) / 3), ty = n => 14 + Math.round(n[2] * (fb.tech.h - 44) / 2);
function drawResearch() {
  const f = fb.tech, cool = PAL.jump, dim = PAL.orbit;
  f.fill(PANEL);
  for (const [a, b] of TEDGE) {
    const P = TECH[a], T2 = TECH[b], x0 = tx(P) + 64, y0 = ty(P) + 8, x1 = tx(T2), y1 = ty(T2) + 8, mx = Math.round((x0 + x1) / 2), lock = T2[3] === 'lock', c = lock ? dim : cool, g = lock ? 2 : 1;
    f.line(x0, y0, mx, y0, c, g); f.line(mx, y0, mx, y1, c, g); f.line(mx, y1, x1, y1, c, g);
  }
  for (const n of TECH) {
    const x = tx(n), y = ty(n), st = n[3];
    const edge = st === 'done' ? cool : st === 'now' ? PAL.sel : st === 'open' ? [148, 143, 192] : [68, 61, 128];
    f.rect(x, y, 64, 16, st === 'done' ? [30, 70, 84] : st === 'lock' ? PAL.bg : [42, 36, 88]);
    if (st === 'now') f.rect(x + 1, y + 13, Math.round(62 * n[4] / 100 * (.97 + .03 * Math.sin(A * .3))), 2, PAL.sel);
    for (let i = 0; i < 64; i++) if (st !== 'lock' || i % 2) { f.px(x + i, y, edge); f.px(x + i, y + 15, edge); }
    for (let j = 0; j < 16; j++) if (st !== 'lock' || j % 2) { f.px(x, y + j, edge); f.px(x + 63, y + j, edge); }
  }
  f.present();
}

const UNIT = {
  inf: ['.ooo.', '.oGo.', '.ooo.', 'ogggo', 'ogggo', '.ogo.', '.o.o.', '.o.o.'],
  tank: ['....ooooo....', '...oGGGGooooo', '...oggggo....', '.ooooooooooo.', 'oGGGGGGGGGGGo', 'ododododododo', '.ooooooooooo.'],
  art: ['.........oo.', '.......oo...', '.....oo.....', '..oooo......', '.oGGggo.....', 'ooooooooo...', '.o.o..o.o...'],
  hq: ['......r....', '......o....', '.oooooo....', '.oGGGGoooo.', '.oggggoGwo.', 'ooooooooooo', '.oo....oo..', '.oo....oo..'],
};
const UP = { o: [20, 18, 30], g: [86, 104, 72], G: [132, 150, 104], d: [54, 66, 50], w: [110, 220, 230], r: [214, 84, 74] };
function ground(f, hz) {
  const sky = [[70, 44, 58], [150, 96, 74], [206, 156, 108]];
  for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
    if (y < hz) f.px(x, y, sky[clamp(Math.floor(y / hz * 2.6 + (dith(x, y) - .5) * .9), 0, 2)]);
    else f.px(x, y, fbm(x * .08, y * .3, 2, 2) + dith(x, y) * .3 > .62 ? [96, 46, 38] : [78, 38, 34]);
  }
  for (let x = 0; x < f.w; x++) for (let y = hz - 3 - Math.floor(fbm(x * .03, 0, 9, 3) * 14); y < hz; y++) f.px(x, y, [112, 60, 48]);
}
function drawGround() {
  const f = fb.ground, W = f.w, put = (k, x, y) => f.sprite(UNIT[k], Math.round(x), y - UNIT[k].length, UP);
  ground(f, 24);
  put('hq', W * .05, 42);
  for (let i = 0; i < 6; i++) put('inf', W * .16 + (i % 3) * 9 + (i > 2 ? 4 : 0), i > 2 ? 54 : 42);
  for (let i = 0; i < 3; i++) { const x = Math.round(W * (.36 + i * .11)); put('tank', x, 42 + (i % 2) * 11); if ((A + i * 3) % 6 < 3) f.px(x - 1, 39 + (i % 2) * 11, [150, 140, 140]); }
  for (let i = 0; i < 2; i++) put('art', W * (.7 + i * .09), 43 + i * 10);
  const ax = Math.round(W * .9);
  put('hq', ax, 46); f.line(ax + 6, 38, ax + 12, 30, UP.o); f.line(ax + 6, 38, ax + 16, 34, UP.o);
  f.present();
  const u = fb.unit;
  ground(u, 18);
  for (let i = 0; i < 5; i++) u.sprite(UNIT.inf, 10 + i * 11, 22 + (i % 2) * 3, UP);
  u.present();
}

const RANKS = ['Admiral', 'Vice admiral', 'Captain', 'Captain', 'Captain', 'Commander', 'Commander', 'Commander', 'Commander', 'Lt commander', 'Lt commander', 'Lt commander', 'Lieutenant', 'Lieutenant'];
const NAMES = ['R. Vasquez', 'A. Mwangi', 'M. Chen', 'S. Novak', 'I. Petrov', 'L. Haddad', 'T. Nakamura', 'J. Okonkwo', 'P. Silva', 'E. Larsen', 'D. Kaur', 'F. Moreau', 'H. Yilmaz', 'C. Brandt'];
const POSTS = ['Home fleet command', 'Naval staff', 'Jupiter picket', 'Survey group 1', 'Unassigned', 'Freight convoy', 'Governor, Mars', 'Luna yards', 'Probe group', 'Resolute, first officer', 'Unassigned', 'Naval academy', 'Vigilant', 'Unassigned'];
const CMD = RANKS.map((r, i) => [r, NAMES[i], POSTS[i], [5, 5, 4, 4, 4, 3, 3, 3, 3, 2, 2, 2, 1, 1][i], 63 - i * 2 - Math.round(hash(i, 3, 3) * 3)]);
const shade = (c, k) => c.map(v => v * k);
function portrait(f, seed, pips) {
  const skin = [[232, 190, 160], [204, 150, 112], [150, 100, 72], [244, 214, 190]][seed % 4], hair = [[40, 30, 30], [110, 70, 40], [190, 170, 150], [20, 20, 28], [150, 60, 40]][(seed >> 1) % 5], style = seed % 3, cx = 30, U = [44, 54, 104];
  for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) f.px(x, y, dith(x, y) < y / f.h * .9 ? [42, 36, 88] : [30, 26, 62]);
  for (let y = 46; y < f.h; y++) { const hw = Math.min(26, 8 + (y - 46) * 3); for (let x = cx - hw; x <= cx + hw; x++) f.px(x, y, x === cx - hw || x === cx + hw || y === 46 ? [20, 24, 50] : (x + y) % 7 === 0 ? [58, 70, 128] : U); }
  for (let i = -3; i <= 3; i++) f.px(cx + i, 47 + Math.abs(i), [230, 230, 240]);
  for (let i = 0; i < pips; i++) f.rect(cx - 20 + i * 4, 55, 2, 2, PAL.sel);
  f.rect(cx - 4, 39, 8, 8, shade(skin, .78));
  for (let j = -14; j <= 14; j++) for (let i = -11; i <= 11; i++) {
    if (i * i / 121 + j * j / 196 > 1) continue;
    f.px(cx + i, 26 + j, j < -7 + Math.abs(i) * .3 ? hair : i > 8 || (i > 4 && dith(cx + i, 26 + j) > .45) ? shade(skin, .78) : skin);
  }
  if (style === 1) for (let j = -9; j <= 13; j++) for (const i of [-12, -11, 11, 12]) f.px(cx + i, 26 + j, hair);
  if (style === 2) { f.rect(cx - 12, 9, 25, 5, [26, 30, 60]); f.rect(cx - 13, 14, 27, 1, [14, 14, 26]); f.rect(cx - 1, 10, 3, 2, PAL.sel); }
  f.rect(cx - 6, 25, 2, 2, [30, 26, 40]); f.rect(cx + 4, 25, 2, 2, [30, 26, 40]);
  for (let i = 0; i < 4; i++) { f.px(cx - 7 + i, 22, hair); f.px(cx + 3 + i, 22, hair); }
  for (let j = 29; j < 32; j++) f.px(cx, j, shade(skin, .7));
  for (let i = -2; i <= 2; i++) f.px(cx + i, 35, [150, 70, 70]);
}
function showCmd(i) {
  selCmd = i;
  const c = CMD[i];
  $$('tr[data-cmd]').forEach(r => r.classList.toggle('on', +r.dataset.cmd === i));
  $('#cmdName').textContent = `${c[0]} ${c[1]}`;
  $('#cmdInfo').innerHTML = dl([['Post', c[2]], ['Age', c[4]], ['Service', 12 + Math.round(hash(i, 2, 9) * 20) + ' years']]) + '<h3>Skills</h3>' + ['Fleet handling', 'Logistics', 'Survey', 'Leadership', 'Engineering'].map((s, k) => `<div class="skill"><small>${s}</small>${bar(Math.round(20 + hash(i, k, 6) * 75), 1)}</div>`).join('');
  portrait(fb.face, i * 7 + 3, c[3]);
  fb.face.present();
}

function drawIntel() { for (const k of ['x1', 'x2']) { silhouette(fb['i-' + k], XSPECS[k], A); fb['i-' + k].present(); } }

const SYS = [
  { id: 'sol', name: 'Sol', x: 0, y: 0, c: [255, 216, 112], R: 4, facts: ['G2 yellow', 8, 'Earth, Mars', 3, '3 of 3'], colony: 1, fleet: 1 },
  { id: 'acen', name: 'Alpha Centauri', x: 72, y: -44, c: [255, 236, 170], R: 4, facts: ['G2 and K1 pair', 5, 'None', 1, '2 of 4'], fleet: 1 },
  { id: 'barn', name: "Barnard's Star", x: -66, y: -56, c: [230, 110, 70], R: 2, facts: ['M4 red dwarf', 2, 'None', 0, '2 of 2'] },
  { id: 'wolf', name: 'Wolf 359', x: -118, y: 20, c: [230, 110, 70], R: 2, facts: ['M6 red dwarf', 1, 'None', 0, '1 of 1'] },
  { id: 'lal', name: 'Lalande 21185', x: 10, y: 76, c: [240, 150, 90], R: 3, facts: ['M2 red dwarf', 3, 'None', 0, '1 of 3'] },
  { id: 'sir', name: 'Sirius', x: 122, y: 42, c: [200, 220, 255], R: 5, facts: ['A1 white pair', 0, 'None', 0, '1 of 2'] },
  { id: 'luy', name: 'Unsurveyed', x: 150, y: -72, c: [120, 116, 160], R: 2, facts: ['Unknown', '?', 'None', 0, 'Unknown'], unknown: 1 },
];
const LINKS = [['sol', 'acen'], ['sol', 'barn'], ['sol', 'lal'], ['barn', 'wolf'], ['acen', 'sir'], ['acen', 'luy']];
const gcam = { x: 16, y: 0, z: 2 };
function showSys(id) {
  selSys = id;
  const s = SYS.find(q => q.id === id);
  $$('tr[data-sys]').forEach(r => r.classList.toggle('on', r.dataset.sys === id));
  $('#sysName').textContent = s.name;
  $('#sysInfo').innerHTML = dl(['Star', 'Bodies', 'Colonies', 'Fleets', 'Jump points'].map((k, i) => [k, s.facts[i]]));
  render();
}
function drawGalaxy() {
  const f = fb.gal, z = gcam.z, X = x => f.w / 2 + (x - gcam.x) * z, Y = y => f.h / 2 + (y - gcam.y) * z, by = id => SYS.find(s => s.id === id);
  f.start();
  for (const [a, b] of LINKS) { const P = by(a), T2 = by(b); f.line(X(P.x), Y(P.y), X(T2.x), Y(T2.y), T2.unknown ? PAL.orbit : PAL.jump, T2.unknown ? 4 : 2, T2.unknown ? 0 : A >> 2); }
  for (const s of SYS) {
    const x = Math.round(X(s.x)), y = Math.round(Y(s.y)), R = Math.max(2, Math.round(s.R * Math.sqrt(z)));
    for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) {
      const d = i * i + j * j;
      if (d > R * R + 1) continue;
      if (s.unknown) { if (d >= R * R - 2) f.px(x + i, y + j, s.c); } else f.px(x + i, y + j, d < R * R * .4 + dith(x + i, y + j) * 3 ? [255, 250, 232] : s.c);
    }
    if (!s.unknown) for (const [i, j] of [[R + 2, 0], [-R - 2, 0], [0, R + 2], [0, -R - 2]]) f.px(x + i, y + j, (A + s.x) % 14 < 7 ? s.c : shade(s.c, .5));
    if (s.colony) f.rect(x - R - 5, y + R + 1, 3, 3, PAL.sel);
    if (s.fleet) { f.px(x + R + 3, y + R + 2, PAL.jump); f.px(x + R + 4, y + R + 3, PAL.jump); f.px(x + R + 5, y + R + 2, PAL.jump); }
    if (s.id === selSys) f.ring(x, y, R + 5, PAL.sel, 2, A >> 2);
    const el = $('#gl-' + s.id);
    el.style.left = (x + R + 6) * 2 + 'px'; el.style.top = y * 2 - 10 + 'px';
    el.className = s.id === selSys ? 'sel' : '';
    el.hidden = x < 4 || y < 8 || x > f.w - 60 || y > f.h - 8;
  }
  f.present();
}

const FIT = {
  economy() { fit('chart', 'chartCv', 2, 1.41); fit('ecoPlanet', 'ecoPlanetCv', 2, .6, 'stars'); },
  research() {
    fit('tech', 'techCv', 2, 1.41);
    $('#techLabels').innerHTML = TECH.map(n => `<span class="${n[3]}" style="left:${tx(n) * 2 + 4}px;top:${ty(n) * 2 + 5}px">${n[0]}</span>`).join('');
  },
  classes() {
    fitDesign();
    for (const s of SPECS) fit('g-' + s.id, 'gc-' + s.id, 3, .6);
    fb.parts = new FB($('#partCv'), 120, 238, 2, 1.41);
  },
  colony() {
    const st = $('#stage'), pv = $('#planetCv').parentElement, sc = clamp(Math.floor(Math.min(st.clientHeight - 60, st.clientWidth * .55) / 150), 2, 6);
    pv.style.width = pv.style.height = 150 * sc + 'px';
    fb.planet = new FB($('#planetCv'), 150, 150, sc, .66).makeBg('space');
    fit('surface', 'surfaceCv', 3, .7);
  },
  ground() { fit('ground', 'groundCv', 4, .75); fit('unit', 'unitCv', 4, .7); },
  commanders() { fb.face = new FB($('#faceCv'), 60, 64, 4, .75); showCmd(selCmd); },
  intel() { for (const k of ['x1', 'x2']) fit('i-' + k, 'i' + k, 4, .7); },
  galaxy() { fit('gal', 'galCv', 2, .7, 'space'); },
};
function fitScreen(s) { if (FIT[s]) FIT[s](); }

function initScreens() {
  const g = (id, cols, html) => { scr(id).style.gridTemplateColumns = cols; scr(id).style.gap = '12px'; scr(id).innerHTML = html; };
  g('economy', '320px minmax(0,1fr)', `<div class="stack">${pan('Colonies', tbl(['Colony', 'System', '>People'], [['Earth', 'Sol', '1.2 bn'], ['Luna', 'Sol', '40,000'], ['Mars', 'Sol', '2.4 M'], ['Ceres', 'Sol', '1,200'], ['Europa', 'Sol', '300']], n => n === 2 ? ' class="on"' : ''))}${pan('Mars', fitv('ecoPlanetCv') + dl([['People', '2.4 M'], ['Growth', '3.1% a year'], ['Workers free', '180,000'], ['Mines', 8], ['Factories', 3], ['Fuel refineries', 2], ['Research labs', 1]]) + '<div class="add"><button data-go="colony">Open colony</button></div>', 'grow', 'col')}</div>
    <div class="stack">${pan('Production', `<div class="tabs2"><button data-tab="eco:ind" class="on">Industry</button><button data-tab="eco:yard">Shipyards</button></div>
      <div data-pane="eco:ind">${tbl(['Item', 'Colony', '>Number', '>Share', 'Progress', '>Done by'], [['Mine', 'Mars', 4, '40%', pct(64), '2 Apr 2087'], ['Habitat dome', 'Mars', 2, '20%', pct(20), '19 Jun 2087'], ['Fuel refinery', 'Earth', 1, '15%', pct(12), '30 Jul 2087'], ['Research lab', 'Earth', 1, '25%', pct(47), '11 May 2087'], ['Sensor array parts', 'Luna', 6, '100%', pct(81), '27 Mar 2087'], ['Cargo containers', 'Earth', 40, '10%', pct(55), '9 Apr 2087']])}</div>
      <div data-pane="eco:yard" hidden>${tbl(['Yard', 'Kind', '>Capacity', '>Slips', 'Building', 'Progress'], [['Luna yard 1', 'Commercial', '40,000 t', 2, 'Atlas freighter', pct(73)], ['Luna yard 2', 'Naval', '10,000 t', 1, 'Pathfinder refit', pct(35)], ['Earth high yard', 'Naval', '18,000 t', 2, 'Idle', pct(0)]])}</div>`)}
      <div class="split grow">${pan('Income and spending, last 12 months', fitv('chartCv') + tbl(['Line', '>A year'], [['Taxes', '+9,400'], ['Trade', '+3,100'], ['Shipbuilding', '-4,800'], ['Research', '-3,600'], ['Maintenance', '-1,900']]), '', 'col')}${pan('Stockpiles', tbl(['Mineral', 'Earth', 'Mars', 'Luna'], [['Iron', pct(88), pct(68), pct(40)], ['Titanium', pct(52), pct(31), pct(22)], ['Copper', pct(71), pct(47), pct(35)], ['Uranium', pct(8), pct(12), pct(3)], ['Fuel', pct(64), pct(84), pct(51)]]) + '<h3>Mining, all colonies</h3>' + tbl(['Mineral', '>Stock', '>Mined a year', '>Used a year', '>Balance', 'Years left'], [['Iron', '818k', '64k', '41k', '+23k', pct(88)], ['Titanium', '355k', '22k', '25k', '-3k', pct(52)], ['Copper', '179k', '18k', '12k', '+6k', pct(71)], ['Uranium', '9k', '2k', '11k', '-9k', pct(8)]]) + '<h3>Civilian shipping</h3>' + tbl(['Line', '>Ships', '>Income a year'], [['Ceres Star', 4, '+1,400'], ['Inner Belt Freight', 2, '+900'], ['Luna Ferries', 3, '+800']]))}</div></div>`);

  g('research', 'minmax(0,1fr) 340px', `<div class="stack">${pan('Technology', `<div class="tabs2">${['Propulsion', 'Power', 'Sensors', 'Weapons', 'Defence', 'Industry', 'Biology', 'Logistics'].map((n, i) => `<button${i ? '' : ' class="on"'} data-tab="res:${n}">${n}</button>`).join('')}</div>${fitv('techCv', '', 'techLabels')}`, 'grow', 'col')}${pan('Open projects', tbl(['Project', 'Field', '>Cost', 'Needs', '>With 1 lab'], [['Fusion torch', 'Propulsion', '8,000', 'Nuclear thermal', '4.1 years'], ['Laser sail', 'Propulsion', '5,000', 'Solar sail', '2.6 years'], ['Phased radar', 'Sensors', '3,500', 'Deep-space sensors', '1.8 years'], ['Orbital smelting', 'Industry', '6,000', 'Fuel refining II', '3.0 years']]))}</div>
    <div class="stack">${pan('Running', tbl(['Project', 'Lead', 'Done'], [['Ion drive', 'Okafor', pct(64)], ['Composite armour', 'Lindqvist', pct(22)], ['Deep-space sensors', 'Tanaka', pct(88)], ['Fuel refining II', 'Moreau', pct(41)]]))}${pan('Scientists', tbl(['Name', 'Field', '>Labs', '>Bonus'], [['Okafor', 'Propulsion', '2 of 3', '+20%'], ['Lindqvist', 'Defence', '1 of 2', '+10%'], ['Tanaka', 'Sensors', '1 of 4', '+35%'], ['Moreau', 'Industry', '0 of 2', '+15%'], ['Adeyemi', 'Power', 'Free', '+25%'], ['Kowalski', 'Weapons', 'Free', '+5%'], ['Rahman', 'Biology', 'Free', '+30%'], ['Sato', 'Logistics', 'Free', '+10%']]), 'grow')}</div>`);

  g('classes', 'minmax(0,1fr) 264px', `<div class="stack">${pan('<span id="clsName"></span>', fitv('designCv', '', 'designLabels'), 'grow', 'fill')}<div id="gallery">${SPECS.map(s => `<button class="card" data-cls="${s.id}"><div class="view fit" style="height:120px"><canvas id="gc-${s.id}"></canvas></div><b>${s.name}</b><small>${s.role}</small></button>`).join('')}</div></div>
    <div class="stack">${pan('Class', '<div class="big" id="dSpeed"></div><dl id="dStats"></dl>')}${pan('Parts <small>26</small>', '<div class="view" style="width:240px;height:476px;outline:0"><canvas id="partCv"></canvas><div class="labels plain" id="partLabels"></div></div>', 'grow')}</div>`);
  $('#partLabels').innerHTML = CELLS.map(([, k], n) => `<span style="left:${(n % 4) * 60 + 30}px;top:${Math.floor(n / 4) * 68 + 52}px">${PNAME[k]}</span>`).join('');

  g('colony', 'auto minmax(0,1fr)', `${pan('Mars', '<div class="view" style="outline:0"><canvas id="planetCv"></canvas></div>', '', 'center')}
    <div class="stack">${pan('Surface', fitv('surfaceCv', 'height:258px'), '', 'fill')}<div class="split grow">${pan('Colony', dl([['People', '2.4 M'], ['Growth', '3.1% a year'], ['Workers free', '180,000'], ['Air', 'Thin CO2, domed'], ['Governor', 'T. Nakamura'], ['Garrison', '13 units']]))}${pan('Installations', dl([['Habitat domes', 6], ['Mines', 8], ['Factories', 3], ['Fuel refineries', 2], ['Research labs', 1], ['Spaceport', 1]]))}${pan('Stockpile', `<table>${[['Iron', 68], ['Titanium', 31], ['Copper', 47], ['Uranium', 12], ['Fuel', 84]].map(([n, v]) => `<tr><td>${n}</td><td style="width:100%">${bar(v, 1)}</td><td class="n">${v}%</td></tr>`).join('')}</table>`)}</div></div>`);

  g('ground', '260px minmax(0,1fr) 300px', `${pan('Formations', '<details open><summary><span>Mars</span><small>1 formation</small></summary><details open><summary class="on"><span>Mars garrison</span><small>13 units</small></summary><div><span>HQ company</span><span>1</span></div><div><span>Rifle battalions</span><span>6</span></div><div><span>Armour</span><span>3</span></div><div><span>Artillery</span><span>2</span></div><div><span>Air defence</span><span>1</span></div></details></details><details><summary><span>Earth</span><small>3 formations</small></summary></details><details><summary><span>Luna</span><small>1 formation</small></summary></details>')}
    <div class="stack">${pan('Mars garrison', fitv('groundCv', 'height:240px'), '', 'fill')}${pan('Units', tbl(['Unit', '>Number', 'Strength', 'Morale', 'Supply', 'Stance'], [['HQ company', 1, pct(100), pct(92), pct(80), 'Dug in'], ['Rifle battalion', 6, pct(94), pct(88), pct(76), 'Dug in'], ['Armour', 3, pct(81), pct(90), pct(62), 'Reserve'], ['Artillery', 2, pct(100), pct(85), pct(70), 'Support'], ['Air defence', 1, pct(100), pct(79), pct(74), 'Support']]), 'grow')}</div>
    ${pan('Rifle battalion', fitv('unitCv', 'height:160px') + dl([['Men', 600], ['Attack', 12], ['Defence', 18], ['Supply use', '4 a day'], ['Transport size', '3,000 t'], ['Trained at', 'Earth']]), '', 'col')}`);

  g('commanders', 'minmax(0,1fr) 320px', `${pan('Officers', `<table><tr><th>Rank</th><th>Name</th><th>Post</th><th class="n">Age</th></tr>${CMD.map((c, i) => `<tr data-cmd="${i}"><td>${c[0]}</td><td>${c[1]}</td><td>${c[2]}</td><td class="n">${c[4]}</td></tr>`).join('')}</table>`)}
    ${pan('<span id="cmdName"></span>', '<div class="view" style="width:240px;height:256px;margin:0 auto 10px"><canvas id="faceCv"></canvas></div><div id="cmdInfo"></div>')}`);

  g('intel', '300px minmax(0,1fr)', `<div class="stack">${pan('Groups', tbl(['Group', '>Seen'], [['<span style="color:var(--hot)">Unidentified 1</span>', '3 times'], ['Civilian operators', '41 times']]))}${pan('Unidentified 1', dl([['Stance', 'Unknown'], ['First seen', '2 Mar'], ['Classes', 2], ['Home', 'Unknown'], ['Largest ship', 'about 9,000 t']]), 'grow')}</div>
    <div class="stack"><div class="split">${pan('Type A, likely a cruiser', fitv('ix1', 'height:200px') + dl([['Length', 'about 310 m'], ['Top speed seen', '1,900 km/s'], ['Weapons seen', 'Beam, missiles']]), '', 'col')}${pan('Type B, likely an escort', fitv('ix2', 'height:200px') + dl([['Length', 'about 110 m'], ['Top speed seen', '2,600 km/s'], ['Weapons seen', 'Missiles']]), '', 'col')}</div>
    ${pan('Sightings', tbl(['When', 'Where', 'What', '>Range'], [['12 Mar 04:12', 'Sol, beyond Venus', 'One Type A, thermal 240', '3.1 AU'], ['12 Mar 01:30', 'Sol, beyond Venus', 'One Type A, first detection', '3.4 AU'], ['9 Mar 22:40', 'Sol, near Jupiter', 'One Type B, lost after 2 hours', '0.9 AU'], ['2 Mar 13:05', 'Alpha Centauri', 'Two Type B at the inner jump point', '6.4 AU']]), 'grow')}</div>`);

  g('galaxy', 'minmax(0,1fr) 320px', `${pan('Known systems', fitv('galCv', '', 'galLabels'), '', 'fill')}<div class="stack">${pan('<span id="sysName"></span>', '<div id="sysInfo"></div>')}${pan('Systems', `<table><tr><th>System</th><th class="n">Jump points</th></tr>${SYS.map(s => `<tr data-sys="${s.id}"><td>${s.name}</td><td class="n">${s.facts[4]}</td></tr>`).join('')}</table>`, 'grow')}</div>`);
  $('#galLabels').classList.remove('plain');
  $('#galLabels').innerHTML = SYS.map(s => `<span id="gl-${s.id}" data-sys="${s.id}">${s.name}</span>`).join('');
  const gv = $('#galCv').parentElement, GZ = [1, 1.5, 2, 3, 4];
  let pan0 = null;
  gv.addEventListener('wheel', e => { e.preventDefault(); gcam.z = GZ[clamp(GZ.indexOf(gcam.z) + (e.deltaY < 0 ? 1 : -1), 0, GZ.length - 1)]; render(); }, { passive: false });
  gv.addEventListener('pointerdown', e => { if (e.target.id === 'galCv') pan0 = { x: e.clientX, y: e.clientY, cx: gcam.x, cy: gcam.y }; });
  addEventListener('pointermove', e => { if (pan0) { gcam.x = pan0.cx - (e.clientX - pan0.x) / 2 / gcam.z; gcam.y = pan0.cy - (e.clientY - pan0.y) / 2 / gcam.z; render(); } });
  addEventListener('pointerup', () => { pan0 = null; });

  $('#events').innerHTML = [['06:40', 'ship', 'Survey group 1 passed the halfway point to Mars.'], ['04:12', 'eye', 'Jupiter picket lost its track on C-014.', 1], ['02:55', 'factory', 'Uranium stock at Earth fell below one year of use.', 1], ['01:30', 'eye', 'Jupiter picket picked up C-014 at 3.4 AU, thermal 240.', 1], ['11 Mar', 'ship', 'Freight convoy began loading at Earth.'], ['11 Mar', 'flask', 'Deep-space sensors reached 88%.'], ['11 Mar', 'factory', 'Luna yard 1 laid down an Atlas freighter.'], ['10 Mar', 'ship', 'Probe group entered Alpha Centauri.'], ['10 Mar', 'factory', 'Mars finished 2 mines.'], ['9 Mar', 'eye', 'A Type B ship was seen near Jupiter and lost after 2 hours.', 1], ['9 Mar', 'flask', 'Composite armour started under Lindqvist.'], ['8 Mar', 'ship', 'Jupiter picket took station at Jupiter.']].map(r => `<div class="ev${r[3] ? ' w' : ''}" data-cat="${r[1]}"><time>${r[0]}</time><i data-ic="${r[1]}"></i><span>${r[2]}</span></div>`).join('');
  $('#evFilter').addEventListener('change', e => { $$('.ev').forEach(r => { r.hidden = !!e.target.value && r.dataset.cat !== e.target.value; }); });

  document.addEventListener('click', e => {
    const t = e.target.closest('[data-tab]');
    if (t) {
      const grp = t.dataset.tab.split(':')[0];
      $$(`[data-tab^="${grp}:"]`).forEach(b => b.classList.toggle('on', b === t));
      $$(`[data-pane^="${grp}:"]`).forEach(p => { p.hidden = p.dataset.pane !== t.dataset.tab; });
      if (SCREEN === 'map') tile(); else fitScreen(SCREEN);
      return render();
    }
    const c = e.target.closest('[data-cls]'), m = e.target.closest('[data-cmd]'), s = e.target.closest('[data-sys]');
    if (c) pickClass(c.dataset.cls); else if (m) showCmd(+m.dataset.cmd); else if (s) showSys(s.dataset.sys);
  });
}

const DRAW = { classes: drawClasses, colony: drawColony, economy: drawEconomy, research: drawResearch, ground: drawGround, intel: drawIntel, galaxy: drawGalaxy };
function render() {
  if (!ready) return;
  if (SCREEN === 'map') { drawMap(); if (!$('#w-sel').hidden && !isMin($('#w-sel'))) drawSel(); } else if (DRAW[SCREEN]) DRAW[SCREEN]();
}

initWins(); initMap(); initScreens(); paintIcons();
const Q = new URLSearchParams(location.search);
document.fonts.ready.then(() => {
  ready = true;
  arrange(Q.get('arr') === 'float' ? 'float' : 'dock');
  select(...(Q.get('sel') || 'fleet:survey').split(':'));
  if (Q.get('cls') && spec(Q.get('cls'))) selCls = Q.get('cls');
  pickClass(selCls); showSys('sol');
  if (Q.get('zoom')) { cam.z = +Q.get('zoom'); showZoom(); }
  if (Q.get('dock')) { const [id, slot] = Q.get('dock').split(':'); $('#w-' + id).dataset.dock = slot; tile(); }
  if (Q.get('screen')) setScreen(Q.get('screen'));
  let rz;
  addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => setScreen(SCREEN), 150); });
  setInterval(tick, matchMedia('(prefers-reduced-motion: reduce)').matches ? 1000 : 100);
  if (Q.has('check')) setTimeout(() => {
    const r = layoutCheck(), pre = document.createElement('pre');
    pre.id = 'check'; pre.textContent = r.length ? r.map(x => 'FAIL ' + x).join('\n') : 'PASS layout';
    document.body.append(pre);
  }, 900);
});
