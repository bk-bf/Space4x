'use strict';
const SHIPICON = {
  mil: ['..ooo....', 'goHHHoo..', 'gohhhwwo.', 'goddddo..', '..ooo....'],
  civ: ['.ooooooo...', 'gocCcCcHoo.', 'gocCcCchwwo', 'goddddddoo.', '.ooooooo...'],
};
const BODIES = [
  { id: 'mercury', name: 'Mercury', type: 'rock', R: 4, orb: 34, ang: 2.2, spd: .004, tilt: .05 },
  { id: 'venus', name: 'Venus', type: 'venus', R: 6, orb: 52, ang: 1.0, spd: .003, tilt: .1 },
  { id: 'earth', name: 'Earth', type: 'terran', R: 8, orb: 74, ang: 4.2, spd: .002, tilt: .4 },
  { id: 'mars', name: 'Mars', type: 'mars', R: 5, orb: 100, ang: 5.6, spd: .0015, tilt: .43 },
  { id: 'jupiter', name: 'Jupiter', type: 'gas', R: 16, orb: 162, ang: .28, spd: .0006, tilt: .06 },
  { id: 'saturn', name: 'Saturn', type: 'saturn', R: 12, orb: 196, ang: 2.6, spd: .0004, rings: true },
];
const FACTS = {
  mercury: ['Rocky', '0.38 g', '167 °C', 'None', '4,879 km', 'None'], venus: ['Rocky', '0.90 g', '464 °C', 'Dense CO2', '12,104 km', 'None'],
  earth: ['Rocky', '1.00 g', '15 °C', 'Breathable', '12,742 km', '1.2 bn'], mars: ['Rocky', '0.38 g', '-63 °C', 'Thin CO2', '6,779 km', '2.4 M'],
  jupiter: ['Gas giant', '2.53 g', '-108 °C', 'Hydrogen', '139,820 km', 'None'], saturn: ['Gas giant', '1.06 g', '-139 °C', 'Hydrogen', '116,460 km', 'None'],
};
const FLEETS = [
  { id: 'survey', name: 'Survey group 1', kind: 'mil', cls: 'pathfinder', from: 'earth', to: 'mars', note: 'To Mars', meters: [72, 55, 94], orders: ['Move to Mars', 'Survey Mars', 'Survey Phobos'], ships: [['Halley', 'Pathfinder', 72, 'Under way'], ['Hubble', 'Pathfinder', 70, 'Under way']] },
  { id: 'convoy', name: 'Freight convoy', kind: 'civ', cls: 'atlas', at: 'earth', note: 'Earth', meters: [88, 91, 100], orders: ['Load machinery at Earth', 'Move to Mars', 'Unload all at Mars'], ships: [['Ceres Star', 'Atlas', 88, 'Loading'], ['Vesta Star', 'Atlas', 91, 'Loading'], ['Pallas Star', 'Atlas', 64, 'Waiting'], ['Juno Star', 'Mule', 95, 'Ready']] },
  { id: 'picket', name: 'Jupiter picket', kind: 'mil', cls: 'bastion', at: 'jupiter', note: 'Jupiter', meters: [56, 41, 97], orders: ['Hold orbit at Jupiter', 'Report contacts'], ships: [['Resolute', 'Bastion', 58, 'On station'], ['Vigilant', 'Lancer', 61, 'On station'], ['Watchful', 'Lancer', 49, 'Low fuel']] },
];
const CONTACTS = [
  { id: 'C-014', kind: 'Unknown', sig: 'Thermal 240', range: '3.1 AU', seen: '04:12', x: -24, y: 116, hot: 1, cls: 'x1' },
  { id: 'C-011', kind: 'Civilian', sig: 'Transponder', range: '0.4 AU', seen: '06:38', x: -104, y: -8 },
  { id: 'C-009', kind: 'Wreck', sig: 'Radar echo', range: '5.2 AU', seen: '2 Mar', x: 150, y: -118 },
];
const XSPECS = {
  x1: { id: 'x1', stern: ['engines', 3], bow: 'gun', parts: [['armor', 'pod', 'pod'], ['hull', 'turret', 'turret'], ['hangar'], ['armor', 'launcher']] },
  x2: { id: 'x2', stern: ['engines', 1], bow: 'bridge', parts: [['hull', 'launcher', 'fin'], ['crew', 'dish']] },
};
const SHOW = { Orbits: true, Names: true, Sensors: true, Asteroids: true, Course: true };
const ZOOMS = [.5, .75, 1, 1.5, 2, 3, 4];
const cam = { x: 0, y: 0, z: 1 }, pos = {}, fb = {}, labelEls = {};
let sel = { kind: 'fleet', id: 'survey' }, anchors = [];
const bar = (v, wide) => `<i class="m${wide ? ' wide' : ''}" style="--v:${v}%"></i>`;

function mapView() {
  const d = $('#desk'), w = Math.floor(d.clientWidth / 2), h = Math.floor(d.clientHeight / 2);
  if (w < 20 || h < 20) return;
  if (!fb.map || fb.map.w !== w || fb.map.h !== h) fb.map = new FB($('#mapCv'), w, h, 2).makeBg('space');
}
function silhouette(f, sp, t) {
  const bg = PAL.bg;
  f.fill(bg);
  shipCentered(f, sp, t);
  const d = f.d;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i] === bg[0] && d[i + 1] === bg[1] && d[i + 2] === bg[2]) continue;
    const l = d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11, y = Math.floor(i / 4 / f.w), k = (y + (t >> 1)) % 4 === 0 ? .6 : 1;
    const c = l > 140 ? [239, 111, 94] : l > 70 ? [168, 64, 70] : [96, 36, 58];
    d[i] = c[0] * k; d[i + 1] = c[1] * k; d[i + 2] = c[2] * k;
  }
}

function drawMap() {
  const f = fb.map;
  if (!f) return;
  const z = cam.z, sc = f.scale, cx0 = (FREE.x + FREE.w / 2) / sc, cy0 = (FREE.y + FREE.h / 2) / sc, p = PAL;
  const X = wx => cx0 + (wx - cam.x) * z, Y = wy => cy0 + (wy - cam.y) * z;
  const on = (x, y, r) => x > -r && y > -r && x < f.w + r && y < f.h + r;
  const an = [];
  f.start();
  for (const b of BODIES) {
    const a = b.ang + S * b.spd * .2;
    pos[b.id] = [Math.cos(a) * b.orb, Math.sin(a) * b.orb];
    if (SHOW.Orbits) f.ring(X(0), Y(0), b.orb * z, p.orbit, 3);
  }
  if (SHOW.Asteroids) for (let i = 0; i < 230; i++) {
    const r = 124 + hash(i, 5, 2) * 13, a = hash(i, 6, 2) * 6.283 + S * .0002;
    f.px(X(Math.cos(a) * r), Y(Math.sin(a) * r), p.belt[i & 1]);
  }
  const fp = {};
  for (const fl of FLEETS) {
    if (fl.at) {
      const [bx, by] = pos[fl.at], a = S * .02 + hash(fl.id.length, 1, 1) * 6, R = BODIES.find(b => b.id === fl.at).R + 9;
      fp[fl.id] = [bx + Math.cos(a) * R, by + Math.sin(a) * R * .6, Math.sin(a) > 0 ? -1 : 1];
    } else {
      const P = pos[fl.from], Q = pos[fl.to], k = .4 + ((S * .0012) % .5);
      fp[fl.id] = [mix(P[0], Q[0], k), mix(P[1], Q[1], k), Q[0] > P[0] ? 1 : -1];
    }
  }
  const sf = sel.kind === 'fleet' && FLEETS.find(x => x.id === sel.id);
  if (sf) {
    const [x, y] = fp[sf.id];
    if (SHOW.Course && sf.to) f.line(X(x), Y(y), X(pos[sf.to][0]), Y(pos[sf.to][1]), p.course, 3, A >> 1);
    if (SHOW.Sensors) f.ring(X(x), Y(y), 40 * z, p.sensor, 3, A >> 2);
  }
  const sr = Math.round(14 * z);
  if (on(X(0), Y(0), sr + 8)) sun(f, Math.round(X(0)), Math.round(Y(0)), sr, A);
  for (const b of BODIES) {
    const x = Math.round(X(pos[b.id][0])), y = Math.round(Y(pos[b.id][1])), R = Math.max(2, Math.round(b.R * z)), rr = R * (b.rings ? 1.92 : 1);
    if (on(x, y, rr + 2)) planet(f, x, y, R, b.type, A * .01 + b.orb, b);
    an.push({ id: 'b-' + b.id, text: b.name, x, y, rx: rr, ry: R, sel: sel.kind === 'body' && sel.id === b.id, pick: () => select('body', b.id) });
  }
  const la = S * .012 + 1, mr = Math.max(1, Math.round(2 * z));
  planet(f, Math.round(X(pos.earth[0] + Math.cos(la) * 15)), Math.round(Y(pos.earth[1] + Math.sin(la) * 15)), mr, 'rock', 0);
  for (const fl of FLEETS) {
    const x = X(fp[fl.id][0]), y = Y(fp[fl.id][1]), on1 = sel.kind === 'fleet' && sel.id === fl.id;
    let bw, bh;
    if (z >= 3) {
      const sp = spec(fl.cls), m = measure(sp);
      drawShip(f, Math.round(x - m.w / 2) - m.x0, Math.round(y - (m.y0 + m.y1) / 2), sp, A);
      bw = m.w / 2 + 3; bh = m.h / 2 + 3;
    } else {
      const ic = SHIPICON[fl.kind], w = ic[0].length;
      f.sprite(ic, Math.round(x - w / 2), Math.round(y - 2), { ...C, g: hash(A, w, 1) > .5 ? [255, 214, 120] : [240, 130, 60] }, fp[fl.id][2] < 0);
      bw = w / 2 + 3; bh = 5;
    }
    if (on1) for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) for (let i = 0; i < 3; i++) {
      f.px(x + dx * (bw - i), y + dy * bh, p.sel); f.px(x + dx * bw, y + dy * (bh - i), p.sel);
    }
    an.push({ id: 'f-' + fl.id, text: fl.name, cls: 'fl', x, y, rx: bw, ry: bh, sel: on1, pick: () => select('fleet', fl.id) });
  }
  for (const c of CONTACTS) {
    const x = Math.round(X(c.x)), y = Math.round(Y(c.y)), col = c.hot ? p.hot : p.belt[1], on1 = sel.kind === 'contact' && sel.id === c.id;
    if (c.hot) f.line(X(c.x + 38), Y(c.y + 22), X(c.x + 5), Y(c.y + 3), p.hot, 4, A >> 2);
    if (!c.hot || (A >> 2) & 1 || on1) for (let i = 0; i < 4; i++) { f.px(x - 3 + i, y - i, col); f.px(x + i, y - 3 + i, col); f.px(x + 3 - i, y + i, col); f.px(x - i, y + 3 - i, col); }
    f.px(x, y, col);
    an.push({ id: 'c-' + c.id, text: c.id + ' ' + c.kind.toLowerCase(), cls: c.hot ? 'hot' : '', x, y, rx: 5, ry: 5, sel: on1, pick: () => select('contact', c.id) });
  }
  const jx = X(-150), jy = Y(-84);
  f.ring(jx, jy, 5, p.jump, 2, A >> 1); f.ring(jx, jy, 2, p.jump, 2, -(A >> 1)); f.px(jx, jy, p.jump);
  an.push({ id: 'jump', text: 'Jump point A', x: jx, y: jy, rx: 6, ry: 6 });
  f.present();
  anchors = an;
  placeLabels(an, sc);
}
function placeLabels(an, sc) {
  const placed = [], boxes = an.map(a => [(a.x - a.rx) * sc, (a.y - a.ry) * sc, (a.x + a.rx) * sc, (a.y + a.ry) * sc]);
  const hit = (r, q) => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1];
  const d = $('#desk'), DW = d.clientWidth, DH = d.clientHeight;
  const blocks = wins().filter(w => !w.hidden).map(w => [w.offsetLeft - 4, w.offsetTop - 4, w.offsetLeft + w.offsetWidth + 4, w.offsetTop + w.offsetHeight + 4]);
  an.map((a, i) => [a, i]).sort((p, q) => (q[0].sel ? 1 : 0) - (p[0].sel ? 1 : 0)).forEach(([a, n]) => {
    let el = labelEls[a.id];
    if (!el) {
      el = labelEls[a.id] = document.createElement('span');
      el.textContent = a.text;
      if (a.pick) el.onclick = a.pick;
      $('#mapLabels').append(el);
      el.w = el.offsetWidth;
    }
    el.className = (a.cls || '') + (a.sel ? ' sel' : '');
    const cx = a.x * sc, cy = a.y * sc, rx = a.rx * sc, ry = a.ry * sc, w = el.w, h = 20;
    const opts = [[cx + rx + 6, cy - h / 2], [cx - w / 2, cy + ry + 4], [cx - rx - 6 - w, cy - h / 2], [cx - w / 2, cy - ry - 4 - h], [cx + rx + 6, cy + ry], [cx + rx + 6, cy - ry - h]];
    let done = false;
    if (SHOW.Names && cx > 0 && cx < DW && cy > 0 && cy < DH && !blocks.some(q => cx > q[0] && cx < q[2] && cy > q[1] && cy < q[3])) for (const i of el.o == null ? opts.keys() : [el.o, ...opts.keys()]) {
      const [x, y] = opts[i], r = [x, y, x + w, y + h];
      if (r[0] < 2 || r[2] > DW - 2 || r[1] < 2 || r[3] > DH - 2) continue;
      if (placed.some(q => hit(r, q)) || blocks.some(q => hit(r, q)) || boxes.some((q, j) => j !== n && hit(r, q))) continue;
      el.o = i; el.style.left = Math.round(x) + 'px'; el.style.top = Math.round(y) + 'px';
      placed.push(r); done = true;
      break;
    }
    el.hidden = !done;
  });
}
function zoomBy(dir, e) {
  const f = fb.map, r = $('#desk').getBoundingClientRect(), sc = f.scale;
  const cx0 = (FREE.x + FREE.w / 2) / sc, cy0 = (FREE.y + FREE.h / 2) / sc;
  const px = e ? (e.clientX - r.left) / sc : cx0, py = e ? (e.clientY - r.top) / sc : cy0;
  const wx = cam.x + (px - cx0) / cam.z, wy = cam.y + (py - cy0) / cam.z;
  cam.z = ZOOMS[clamp(ZOOMS.indexOf(cam.z) + dir, 0, ZOOMS.length - 1)];
  cam.x = wx - (px - cx0) / cam.z; cam.y = wy - (py - cy0) / cam.z;
  showZoom(); render();
}
function showZoom() { $('#zoomNow').textContent = cam.z + 'x'; }

function select(kind, id) {
  sel = { kind, id };
  $('#w-sel').hidden = false;
  showSel();
  $$('#tree summary[data-sel]').forEach(s => s.classList.toggle('on', s.dataset.sel === kind + ':' + id));
  $$('tr[data-sel]').forEach(s => s.classList.toggle('on', s.dataset.sel === kind + ':' + id));
  tile(); render();
}
function showSel() {
  const title = $('#w-sel .tb span'), el = $('#selBody');
  if (sel.kind === 'fleet') {
    const f = FLEETS.find(x => x.id === sel.id);
    title.textContent = f.name;
    el.innerHTML = `<div class="row3">${['Fuel', 'Supplies', 'Crew'].map((n, i) => `<div><small>${n} ${f.meters[i]}%</small>${bar(f.meters[i], 1)}</div>`).join('')}</div>
      <h3>Ships</h3><table><tr><th>Ship</th><th>Class</th><th>Fuel</th><th class="n">Status</th></tr>${f.ships.map(s => `<tr><td>${s[0]}</td><td>${s[1]}</td><td>${bar(s[2])}</td><td class="n${s[3] === 'Low fuel' ? ' w' : ''}">${s[3]}</td></tr>`).join('')}</table>
      <h3>Orders</h3><table>${f.orders.map((o, i) => `<tr${i ? '' : ' class="on"'}><td>${i + 1}</td><td>${o}</td><td class="n">+${(i + 1) * 3} d</td></tr>`).join('')}</table>
      <div class="add"><select id="oAct">${['Move to', 'Survey', 'Load cargo at', 'Unload at', 'Refuel at', 'Orbit'].map(a => `<option>${a}</option>`).join('')}</select><select id="oDst">${[...BODIES.map(b => b.name), 'Jump point A'].map(a => `<option>${a}</option>`).join('')}</select><button data-act="order">Add</button></div>`;
  } else if (sel.kind === 'body') {
    const b = BODIES.find(x => x.id === sel.id), f = FACTS[b.id];
    title.textContent = b.name;
    el.innerHTML = `<dl class="two">${['Kind', 'Gravity', 'Surface', 'Air', 'Size', 'People'].map((k, i) => `<dt>${k}</dt><dd>${f[i]}</dd>`).join('')}</dl>
      <h3>Deposits</h3><table><tr><th>Mineral</th><th class="n">Tons</th><th>Access</th></tr>${['Iron', 'Titanium', 'Copper', 'Uranium'].map((n, i) => {
        const v = Math.round(hash(b.orb, i, 3) * 90 + 5);
        return `<tr><td>${n}</td><td class="n">${Math.round(hash(b.orb, i, 7) * 900 + 20)}k</td><td>${bar(v)} ${(v / 100).toFixed(1)}</td></tr>`;
      }).join('')}</table>${f[5] === 'None' ? '' : '<div class="add"><button data-go="colony">Colony</button><button data-go="economy">Economy</button></div>'}`;
  } else {
    const c = CONTACTS.find(x => x.id === sel.id);
    title.textContent = 'Contact ' + c.id;
    el.innerHTML = `<dl class="two">${[['Kind', c.kind], ['Signal', c.sig], ['Range', c.range], ['Last seen', c.seen], ['Speed', c.hot ? '1,900 km/s' : 'At rest'], ['Size', c.hot ? '9,000 t est.' : 'Small']].map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
      <h3>Track</h3><table><tr><th>Time</th><th>Bearing</th><th class="n">Range</th></tr>${[['04:12', '211°', c.range], ['01:30', '214°', '3.4 AU'], ['Yesterday', '220°', '4.0 AU']].map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="n">${r[2]}</td></tr>`).join('')}</table>${c.hot ? '<div class="add"><button data-go="intel">Intelligence</button></div>' : ''}`;
  }
}
function drawSel() {
  const f = fb.sel;
  if (sel.kind === 'fleet') { stars(f, A, 26); shipCentered(f, spec(FLEETS.find(x => x.id === sel.id).cls), A); } else if (sel.kind === 'body') {
    const b = BODIES.find(x => x.id === sel.id);
    f.start(); planet(f, 70, 36, b.rings ? 19 : 30, b.type, A * .02, b);
  } else {
    const c = CONTACTS.find(x => x.id === sel.id);
    if (c.cls) silhouette(f, XSPECS[c.cls], A); else { f.start(); for (let i = 0; i < 9; i++) { f.px(61 + i, 36 - i, PAL.belt[1]); f.px(70 + i, 27 + i, PAL.belt[1]); f.px(79 - i, 36 + i, PAL.belt[1]); f.px(70 - i, 45 - i, PAL.belt[1]); } }
  }
  f.present();
}

function initMap() {
  fb.sel = new FB($('#selPic'), 140, 72, 2, .55).makeBg('stars');
  $('#tree').innerHTML = `<details open><summary><span>Sol</span><small>3 fleets</small></summary>${FLEETS.map(f => `<details${f.id === sel.id ? ' open' : ''}><summary data-sel="fleet:${f.id}"><span>${f.name}</span><small>${f.note}</small></summary>${f.ships.map(s => `<div><span>${s[0]}</span><span>${s[1]}</span></div>`).join('')}</details>`).join('')}</details><details><summary><span>Alpha Centauri</span><small>1 fleet</small></summary><details><summary><span>Probe group</span><small>Surveying</small></summary></details></details>`;
  $('#bodyList').innerHTML = '<tr><th>Body</th><th>Kind</th><th class="n">People</th></tr>' + BODIES.map(b => `<tr data-sel="body:${b.id}"><td>${b.name}</td><td>${FACTS[b.id][0]}</td><td class="n">${FACTS[b.id][5]}</td></tr>`).join('');
  $('#contactList').innerHTML = '<tr><th>Id</th><th>Kind</th><th class="n">Range</th></tr>' + CONTACTS.map(c => `<tr data-sel="contact:${c.id}"><td${c.hot ? ' class="w"' : ''}>${c.id}</td><td>${c.kind}</td><td class="n">${c.range}</td></tr>`).join('');
  $('#toggles').innerHTML = Object.keys(SHOW).map(k => `<button data-show="${k}" class="on">${k}</button>`).join('');
  const d = $('#desk');
  let pan = null;
  d.addEventListener('wheel', e => { if (e.target.closest('.win')) return; e.preventDefault(); zoomBy(e.deltaY < 0 ? 1 : -1, e); }, { passive: false });
  d.addEventListener('pointerdown', e => { if (e.target.id === 'mapCv') pan = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y, moved: false }; });
  addEventListener('pointermove', e => {
    if (!pan) return;
    if (!pan.moved && Math.hypot(e.clientX - pan.x, e.clientY - pan.y) < 4) return;
    pan.moved = true;
    cam.x = pan.cx - (e.clientX - pan.x) / 2 / cam.z; cam.y = pan.cy - (e.clientY - pan.y) / 2 / cam.z;
    render();
  });
  addEventListener('pointerup', e => {
    if (pan && !pan.moved) {
      const r = d.getBoundingClientRect(), x = (e.clientX - r.left) / 2, y = (e.clientY - r.top) / 2;
      const a = anchors.find(q => q.pick && Math.abs(x - q.x) < q.rx + 4 && Math.abs(y - q.y) < q.ry + 4);
      if (a) a.pick();
    }
    pan = null;
  });
  addEventListener('keydown', e => { if (e.key === '+' || e.key === '=') zoomBy(1); else if (e.key === '-') zoomBy(-1); else if (e.key === '0') { cam.x = cam.y = 0; cam.z = 1; showZoom(); render(); } });
  document.addEventListener('click', e => {
    const s = e.target.closest('[data-sel]');
    if (s) { const [k, id] = s.dataset.sel.split(':'); return select(k, id); }
    const b = e.target.closest('button');
    if (!b) return;
    const k = b.dataset;
    if (k.show) { SHOW[k.show] = !SHOW[k.show]; b.classList.toggle('on'); render(); }
    else if (k.zoom) { if (k.zoom === '0') { cam.x = cam.y = 0; cam.z = 1; showZoom(); render(); } else zoomBy(+k.zoom); }
    else if (k.act === 'order') { FLEETS.find(x => x.id === sel.id).orders.push($('#oAct').value + ' ' + $('#oDst').value); showSel(); }
  });
  showZoom();
}
