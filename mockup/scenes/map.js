'use strict';
const wheelN = e => clamp(e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 300 : 1) / 100, -1.5, 1.5);
class Cam {
  constructor(z, min, max, ox = .5, oy = .5) { Object.assign(this, { x: 0, y: 0, z: Math.log2(z), zt: Math.log2(z), min: Math.log2(min), max: Math.log2(max), ox, oy, drag: null, free: false }); }
  get S() { return Math.pow(2, this.z); }
  step(dt) { this.z += (this.zt - this.z) * Math.min(1, dt * 9); if (Math.abs(this.zt - this.z) < .002) this.z = this.zt; }
  wheel(e) { this.zt = clamp(this.zt - wheelN(e) * .2, this.min, this.max); }
  W(f) { const S = this.S, cx = f.w * this.ox, cy = f.h * this.oy, x0 = this.x, y0 = this.y; return (x, y) => [(x - x0) * S + cx, (y - y0) * S + cy]; }
  down(mx, my) { this.drag = { mx, my, x: this.x, y: this.y, moved: false }; }
  move(mx, my) { const d = this.drag; if (!d) return false; if (!d.moved && Math.hypot(mx - d.mx, my - d.my) < 3) return false; d.moved = true; this.free = true; this.x = d.x - (mx - d.mx) / this.S; this.y = d.y - (my - d.my) / this.S; return true; }
  up() { const d = this.drag; this.drag = null; return !!d && !d.moved; }
}
function drawSmall(f, kind, X, Y, a, pal, S, o = {}) { const lod = lodFor(S); drawSprite(f, smallSprite(kind, lod), X, Y, a, pal, { ...o, k: S / lod }); }
function drawProp(f, kind, X, Y, a, pal, S, o = {}, lods) { const lod = lods ? (lods.find(l => l >= S * .999) || lods[lods.length - 1]) : lodFor(S), sp = propSprite(kind, lod); drawSprite(f, sp, X, Y, a, pal, { ...o, k: S / lod }); return sp; }
function drawGate(f, X, Y, S, t, glow = 0) {
  const ry = 47 * S, rx = Math.max(1.5, 5 * S), D = f.d;
  if (X + 80 * S < 0 || X - 80 * S > f.w || Y + 80 * S < 0 || Y - 80 * S > f.h) return;
  const y0 = Math.max(0, Math.floor(Y - ry)), y1 = Math.min(f.h - 1, Math.ceil(Y + ry)), q = .12 / Math.max(.4, S);
  for (let y = y0; y <= y1; y++) {
    const v = (y + .5 - Y) / ry, hw = rx * Math.sqrt(Math.max(0, 1 - v * v));
    for (let x = Math.max(0, Math.round(X - hw)); x <= Math.min(f.w - 1, Math.round(X + hw)); x++) {
      const n = noise3((x - X) * q * 2.2, (y - Y) * q * .6 - t * .8, t * .4) + glow * .5 + (dith(x, y) - .5) * .15 - Math.abs(x - X) / (hw + 1) * .12;
      const c = n > .8 ? [220, 250, 245] : n > .6 ? PAL.jump : n > .45 ? [52, 128, 128] : [30, 60, 80], k = (y * f.w + x) * 4;
      D[k] = c[0]; D[k + 1] = c[1]; D[k + 2] = c[2];
    }
  }
  if (S >= .3) for (const s of [-1, 1]) drawProp(f, 'pylon', X, Y + s * 75 * S, -s * Math.PI / 2, PALS.civ, S);
}

const BPRI = { sun: 20, gas: 12, saturn: 12, ice: 10, ice2: 10, terran: 9, mars: 8, venus: 7, rock: 6 };
const GATE = { p: [Math.cos(4) * 6.2 * AU, Math.sin(4) * 6.2 * AU] };
const FL = [
  { id: 'home', name: 'Home guard', at: 'earth', off: [2.6e7, -3.3e7], pal: 'navy', hd: .5, thr: .25, ships: [['bastion', 0, 0, 'Resolute'], ['pike', -160, -430, 'Kestrel'], ['lancer', -160, 430, 'Harrier'], ['lancer', -620, 0, 'Merlin'], ['lighthouse', 950, 60, 'Lighthouse station']] },
  { id: 'convoy', name: 'Freight convoy', at: 'mars', off: [3e7, 1e7], pal: 'civ', hd: -.3, thr: .2, ships: [['atlas', 0, -300, 'Ceres Star'], ['atlas', 0, 300, 'Vesta Star'], ['atlas', -560, 0, 'Pallas Star'], ['mule', -1050, 0, 'Juno Star']] },
  { id: 'picket', name: 'Jupiter picket', at: 'jupiter', off: [-3e8, 2e8], pal: 'navy', hd: 2.2, thr: .2, ships: [['bastion', 0, 0, 'Vigilant'], ['lancer', -420, -330, 'Watchful'], ['lancer', -420, 330, 'Wary']] },
  { id: 'survey', name: 'Survey group 1', between: ['earth', 'mars', .55], pal: 'navy', thr: .9, ships: [['pathfinder', 0, -220, 'Halley'], ['pathfinder', -380, 220, 'Hubble']] },
];
{ const a = realPos(BI.earth), b = realPos(BI.mars); FL[3].hd = Math.atan2(b[1] - a[1], b[0] - a[0]); }
const fleetD = (fl, k) => {
  if (fl.between) return lerp2(bodyD(BI[fl.between[0]], k), bodyD(BI[fl.between[1]], k), fl.between[2]);
  const p = bodyD(BI[fl.at], k);
  return [p[0] + fl.off[0], p[1] + fl.off[1]];
};
const CONTACT = { p: [Math.cos(3.3) * 2.8 * AU, Math.sin(3.3) * 2.8 * AU] };
const iconCraft = (st, id, pal, o) => st.ic || (st.ic = new Craft(specOf(id), PALS[pal], { thr: 0, a: .3, ...o }));
const SITES = [
  { id: 'yard', name: 'Sol Station', at: 'earth', ang: -2.2, alt: .08, init: () => orbitInit(), draw: (...a) => orbitSite(...a), icon(f, X, Y, S) { const lod = lodFor(S), k = S / lod; drawSprite(f, stationSprite(lod, false), X, Y, 0, PALS.civ, { k }); drawSprite(f, stationSprite(lod, true), X, Y, .3, PALS.civ, { k }); } },
  { id: 'harv', name: 'Deep Well 2 · harvester', at: 'jupiter', ang: -1.3, alt: .1, init: () => dockInit(), draw: (...a) => dockSite(...a), icon(f, X, Y, S) { const c = iconCraft(this, 'harvester', 'civ', { a: 0 }); c.draw(f, X, Y, S); } },
  { id: 'battle', name: 'Battle · C-014 group', p: CONTACT.p, hot: true, init: () => battleInit(), draw: (...a) => battleSite(...a), icon(f, X, Y) { for (let i = 0; i < 4; i++) { f.px(X - 3 + i, Y - i, PAL.hot); f.px(X + i, Y - 3 + i, PAL.hot); f.px(X + 3 - i, Y + i, PAL.hot); f.px(X - i, Y + 3 - i, PAL.hot); } if ((FRAME >> 2) % 5 < 2) { f.px(X + (FRAME % 7) - 3, Y + (FRAME % 5) - 2, F1); f.px(X - (FRAME % 5) + 2, Y - (FRAME % 3) + 1, F2); } } },
  { id: 'board', name: 'Boarding · C-022', at: 'mars', ang: 2, alt: 6, hot: true, init: () => boardInit(), draw: (...a) => boardSite(...a), icon(f, X, Y, S) { const c = iconCraft(this, 'x1', 'foe', { hot: true, thr: .3 }); c.draw(f, X, Y, S); } },
  { id: 'salv', name: 'Salvage · wreck', p: [Math.cos(1.2) * 2.45 * AU, Math.sin(1.2) * 2.45 * AU], init: () => salvInit(), draw: (...a) => salvSite(...a), icon(f, X, Y, S) { const c = iconCraft(this, 'x1', 'foe', { dead: true, a: .6 }); if (!c.hits.length) for (let i = 0; i < 8; i++) c.hit(hash(i, 1, 5) * 60 - 30, hash(i, 2, 5) * 10 - 5, 4, 240); c.draw(f, X, Y, S); } },
  { id: 'gate', name: 'Jump gate A', p: GATE.p, init: () => gateInit(), draw: (...a) => gateSite(...a), icon(f, X, Y, S, ts) { if (S > .5) return drawGate(f, X, Y, S, ts); f.ring(X, Y, 5, PAL.jump, 2, FRAME >> 2); f.ring(X, Y, 2, PAL.jump, 2, -(FRAME >> 2)); f.px(X, Y, PAL.jump); } },
];
for (const st of SITES) if (st.at) { const r = BI[st.at].r * (1 + st.alt); st.off = [Math.cos(st.ang) * r, Math.sin(st.ang) * r]; }
const SI = Object.fromEntries(SITES.map(s => [s.id, s]));
const siteD = (st, k) => { if (!st.at) return dpos(st.p, k); const p = bodyD(BI[st.at], k); return [p[0] + st.off[0], p[1] + st.off[1]]; };
const invD = (d, k) => {
  const rd = Math.hypot(d[0], d[1]);
  if (!rd || !k) return d;
  let lo = 0, hi = 1e15;
  for (let i = 0; i < 90; i++) { const m = (lo + hi) / 2; if (mix(m, comp(m), k) < rd) lo = m; else hi = m; }
  return [d[0] * lo / rd, d[1] * lo / rd];
};
const focusName = id => Array.isArray(id) ? 'free' : SI[id]?.name ?? BI[id]?.name ?? FL.find(f => f.id === id)?.name;
const focusPos = (id, k) => Array.isArray(id) ? dpos(id, k) : SI[id] ? siteD(SI[id], k) : BI[id] ? bodyD(BI[id], k) : fleetD(FL.find(f => f.id === id), k);
const LMIN = -.38, LMAX = 10.6;
const PRESETS = [['System', 10.45, [0, 0]], ['Inner system', 9.15, [0, 0]], ['Sun', 6.9, 'sun'], ['Earth', 4.85, 'earth'], ['Earth space', 5.95, 'earth'], ['Mars', 4.6, 'mars'], ['Jupiter', 5.9, 'jupiter'], ['Saturn', 6.05, 'saturn'], ['Home guard', .56, 'home'], ['Convoy', .7, 'convoy'], ['Sol Station', .26, 'yard'], ['Harvester', .3, 'harv'], ['Battle', .56, 'battle'], ['Boarding', .1, 'board'], ['Salvage', .26, 'salv'], ['Jump gate', .34, 'gate']];
const Z = { L: 10.45, LT: 10.45, focus: [0, 0], anim: null, tr: null, anchor: null, still: 0 };
const K = () => 0;
const endAnim = () => { if (Z.anim) { Z.focus = Z.anim.f1; Z.L = Z.LT = Z.anim.cur ?? Z.L; Z.anim = null; } };

function mapDraw(f, ts, dt) {
  const cx = f.w / 2, cy = f.h / 2;
  { const fid = Z.anim ? null : Z.tr ? Z.tr.f1 : Z.focus; if (typeof fid === 'string' && BI[fid]) { const lim = Math.log10(BI[fid].r / (f.h * .9)); if (Z.LT < lim) Z.LT = lim; } }
  let L, k, cen;
  if (Z.anim) {
    const A = Z.anim;
    A.u = Math.min(1, A.u + dt / 2.6);
    const zin = A.b < A.a, eL = zin ? ease((A.u - .25) / .75) : ease(A.u / .75), eC = zin ? ease(A.u / .45) : ease((A.u - .55) / .45);
    L = A.cur = mix(A.a, A.b, eL); k = K(L);
    cen = lerp2(focusPos(A.f0, k), focusPos(A.f1, k), eC);
    Z.L = Z.LT = L;
    if (A.u >= 1) { Z.focus = A.f1; Z.anim = null; }
  } else {
    Z.L += (Z.LT - Z.L) * Math.min(1, dt * 9);
    if (Math.abs(Z.LT - Z.L) < .0008) Z.L = Z.LT;
    L = Z.L; k = K(L);
    if (Z.tr) { const A = Z.tr; A.u = Math.min(1, A.u + dt / .5); cen = lerp2(dpos(A.f0, k), focusPos(A.f1, k), ease(A.u)); if (A.u >= 1) { Z.focus = A.f1; Z.tr = null; } }
    else {
      if (Z.anchor && Array.isArray(Z.focus) && Z.L !== Z.LT) { const s = Math.pow(10, L), a2 = dpos(Z.anchor.real, k); Z.focus = invD([a2[0] - (Z.anchor.mx - cx) * s, a2[1] - (Z.anchor.my - cy) * s], k); }
      cen = focusPos(Z.focus, k);
    }
  }
  if (Z.shown !== L) { $('#zoom').value = -L; Z.shown = L; }
  const s = Math.pow(10, L), S = p => [cx + (p[0] - cen[0]) / s, cy + (p[1] - cen[1]) / s];
  const vis = (p, r = 0) => p[0] > -r && p[1] > -r && p[0] < f.w + r && p[1] < f.h + r;
  const St = 5 / s, Ss = .75, MK = L > 5, tier = MK ? 'far' : St >= Ss ? 'near' : 'mid', LB = [];
  Z.view = { cen, s, k, cx, cy };
  const picks = Z.picks = [], cap = f.w * 1.25, E = f.h * .45;
  setTier(tier); setScale(s);
  if (FRAME % 4 === 0) prebake();
  for (const b of BOD) {
    let p = S(bodyD(b, k)), Rt = b.r / s, R = Rt;
    b._cap = false; b._mk = Rt < 2.5;
    if (b._mk) R = 3;
    if (Rt > cap) {
      const dx = p[0] - cx, dy = p[1] - cy, d = Math.hypot(dx, dy) || 1e-9, e = d - Rt, q = e / Rt;
      const eB = e < 0 ? e * cap / Rt : E * (1 - Math.exp(-q * 6) + (q > 2 ? (q - 2) * (q - 2) * 3 : 0));
      const e2 = e < 0 ? eB : mix(Math.min(e, 1e6), eB, ss((Rt / cap - 1) / 3)), d2 = cap + e2;
      p = [cx + dx / d * d2, cy + dy / d * d2]; R = cap; b._cap = true;
    }
    b._p = p; b._R = R; b._hide = false; b._list = [];
    if (b.parent) { const P = BI[b.parent]; if (P._cap || P._mk || Math.hypot(p[0] - P._p[0], p[1] - P._p[1]) < P._R + R + 4) b._hide = true; }
  }
  const key = cen[0] + '|' + cen[1] + '|' + L + '|' + f.w + '|' + f.h;
  Z.still = key === Z.lkey ? Z.still + 1 : 0;
  if (key === Z.ckey && Z.cbuf) f.d.set(Z.cbuf);
  else {
    for (const b of BOD) if (b.a) { const c = b.parent ? BI[b.parent]._p : S([0, 0]); if (!(b.parent && BI[b.parent]._cap)) orbitArc(f, c[0], c[1], (b.parent ? b.a : mix(b.a, comp(b.a), k)) / s, PAL.orbit); }
    { const c = S([0, 0]), r = Math.hypot(...GATE.p); orbitArc(f, c[0], c[1], mix(r, comp(r), k) / s, [40, 60, 84], 5); }
    belt(f, S, k, clamp(Math.round(2.7 * AU / s * 5), 60, 900));
    for (const b of BOD) {
      if (b._hide) continue;
      if (b._mk) bodyMark(f, b, b._p[0], b._p[1]);
      else if (b.type === 'sun') { if (b._R >= 80) drawSun(f, b._p[0], b._p[1], b._R, 0); }
      else drawBody(f, b, b._p[0], b._p[1], b._R);
    }
    if (Z.still >= 2) { Z.cbuf = f.d.slice(); Z.ckey = key; } else Z.ckey = null;
  }
  Z.lkey = key;
  if (BI.sun._R < 80 && !BI.sun._mk) drawSun(f, BI.sun._p[0], BI.sun._p[1], BI.sun._R, T);
  for (const b of BOD) if (!b._hide) picks.push({ id: b.id, x: b._p[0], y: b._p[1], r: b._cap ? 0 : b._R, body: true });
  const under = P => { let best = null, bd = 1e9; for (const b of BOD) if (!b._hide && !b._cap) { const d = Math.hypot(P[0] - b._p[0], P[1] - b._p[1]); if (d < b._R + (b._mk ? 6 : 13) && d < bd) { bd = d; best = b; } } return best; };
  const foc = Z.anim ? Z.anim.f1 : Z.tr ? Z.tr.f1 : Z.focus, ff = FL.find(q => q.id === foc);
  const sv = FL[3], sp0 = S(fleetD(sv, k)), sp1 = BI.mars._p;
  if (!BI.mars._cap) clipLine(f, sp0[0], sp0[1], sp1[0], sp1[1], PAL.course, 3, Math.floor(ts * 8));
  if (ff && k < .5) {
    const P = S(fleetD(ff, k));
    for (const [r, col, txt] of [[3e8, PAL.course, 'Beam range 300,000 km'], [5e10, PAL.sensor, 'Sensor range 0.33 AU']]) { const rp = r / s; if (rp > 14 && rp < 40000) { orbitArc(f, P[0], P[1], rp, col, 4); if (rp < f.h * .48) label(txt, P[0], P[1] - rp, 'dim', 8, -8); } }
  }
  for (const st of SITES) {
    const P = S(siteD(st, k));
    picks.push({ id: st.id, x: P[0], y: P[1], r: 12 });
    if (!vis(P, 1500)) continue;
    if (St >= Ss) {
      if (!st.fx) { FX = st.fx = []; st.init(); }
      FX = st.fx;
      st.draw(f, (x, y) => [P[0] + x * St, P[1] + y * St], St, dt, ts, foc === st.id);
      continue;
    }
    const b = under(P);
    if (b) { b._list.push([st.name, st.hot ? 'hot' : 'fl']); continue; }
    if (MK) { siteMark(f, st, P[0], P[1]); LB.push({ t: st.name, x: P[0], y: P[1], cls: st.hot ? 'hot' : 'fl', dx: 18, pri: foc === st.id ? 100 : 4 }); continue; }
    st.icon(f, P[0], P[1], Ss, ts);
    LB.push({ t: st.name, x: P[0], y: P[1] + (st.id === 'gate' ? 80 * Ss : 14), cls: st.hot ? 'hot' : 'fl', dx: 'c', dy: 10, pri: foc === st.id ? 100 : 4 });
  }
  const stack = [];
  for (const fl of FL) {
    const P = S(fleetD(fl, k));
    picks.push({ id: fl.id, x: P[0], y: P[1], r: 12 });
    if (!fl.crafts) fl.crafts = fl.ships.map(([id]) => new Craft(specOf(id), PALS[fl.pal], { thr: fl.thr }));
    const c = Math.cos(fl.hd), n = Math.sin(fl.hd), far = fl.ships.reduce((m, q) => Math.max(m, Math.hypot(q[1], q[2])), 0) / s;
    if (!vis(P, far + 400)) continue;
    if (St >= Ss || far > 90 * Ss) {
      const Sd = Math.max(St, Ss);
      fl.ships.forEach(([id, ox, oy, nm], i) => {
        const X = P[0] + (c * ox - n * oy) / s, Y = P[1] + (n * ox + c * oy) / s, cr = fl.crafts[i];
        cr.a = fl.hd; cr.draw(f, X, Y, Sd);
        if (vis([X, Y])) label(nm, X, Y + Math.max(7, cr.half * Sd * .7 + 4), 'fl', 'c', 10);
      });
      continue;
    }
    const b = under(P);
    if (b) b._list.push([`${fl.name} ×${fl.ships.length}`, 'fl']);
    else if (MK) { fleetMark(f, P[0], P[1], fl.hd, MKC[fl.pal]); LB.push({ t: `${fl.name} ×${fl.ships.length}`, x: P[0], y: P[1], cls: 'fl', dx: 12, pri: foc === fl.id ? 100 : 3 }); }
    else stack.push({ fl, P });
  }
  const used = new Set();
  for (const a of stack) {
    if (used.has(a)) continue;
    const grp = stack.filter(b => !used.has(b) && Math.hypot(b.P[0] - a.P[0], b.P[1] - a.P[1]) < 60 * Ss);
    grp.forEach(b => used.add(b));
    const cr = a.fl.crafts[0]; cr.a = a.fl.hd; cr.draw(f, a.P[0], a.P[1], Ss);
    LB.push({ t: grp.length > 1 ? `${grp.length} fleets` : `${a.fl.name} ×${a.fl.ships.length}`, x: a.P[0], y: a.P[1] + cr.half * Ss * .7 + 5, cls: 'fl', dx: 'c', dy: 10, pri: 3 });
  }
  for (const b of BOD) {
    if (b._hide) continue;
    const p = b._p, R = b._R;
    let lx, ly, dx;
    if (b._cap) { if (!vis(p, R)) continue; lx = 8; ly = f.h - 14; dx = 0; }
    else if (R > 110) { if (!vis(p, R)) continue; lx = clamp(p[0], 30, f.w - 60); ly = clamp(p[1] - 8, 12, f.h - 20); dx = 0; }
    else { if (!vis(p)) continue; lx = p[0]; ly = p[1]; dx = (b._mk ? 5 : R * (b.rings ? 2.3 : 1) + (b.type === 'sun' ? R * .3 + 4 : 0)) * SCALE + 8; }
    LB.push({ t: b.name, x: lx, y: ly, cls: b._cap ? 'dim' : '', dx, pri: foc === b.id ? 100 : b._cap || !b._mk ? 50 : BPRI[b.type] || 5, lines: b._list });
  }
  LB.sort((a, b) => b.pri - a.pri);
  const placed = [];
  for (const l of LB) {
    const n = l.lines ? l.lines.length : 0, w = Math.max(l.t.length, ...(l.lines || []).map(q => q[0].length)) * 8.4 + 6, x0 = l.dx === 'c' ? l.x * SCALE - w / 2 : l.x * SCALE + l.dx, y0 = l.y * SCALE + (l.dy || 0) - 9, r = [x0, y0, x0 + w, y0 + 18 + n * 17];
    if (l.pri < 50 && placed.some(q => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1])) continue;
    placed.push(r);
    label(l.t, l.x, l.y, l.cls, l.dx, l.dy || 0);
    if (n) l.lines.forEach(([txt, cls], i) => label(txt, l.x, l.y, cls, l.dx, (l.dy || 0) + 17 * (i + 1)));
  }
  if (!SI[foc]) {
    const fp = focusPos(foc, 0), fr = Math.hypot(...fp);
    readout('Camera', [`Focus: ${focusName(foc)} · tier: ${tier}`, `x ${fp[0].toExponential(3)} m`, `y ${fp[1].toExponential(3)} m`, `float64 step here: ${fr ? fmtDist(Math.pow(2, Math.floor(Math.log2(fr)) - 52)) : 'exact'}`, '<span class="dim">Wheel zooms at the cursor · drag pans · click focuses</span>']);
  } else if (St < Ss) readout(SI[foc].name, ['<span class="dim">Zoom in to watch it</span>']);
}
const nearest = (x, y, r = 14) => { let b = null, d = 1e9; for (const p of Z.picks || []) { const q = Math.hypot(p.x - x, p.y - y); if (q < Math.max(r, Math.min(p.r || 0, 60)) && q - (p.body ? 6 : 0) < d) { d = q - (p.body ? 6 : 0); b = p; } } return b; };
const mapScene = {
  name: 'System map', draw: mapDraw, note: 'One continuous zoom at true distances, from the whole system to a single hull. Far out everything is a marker; planets and ships are drawn once they are big enough to see. Jump buttons fly to each site.',
  wheel(e, mx, my) {
    if (!Z.view) return;
    const n = wheelN(e), v = Z.view, zin = n < 0, hit = zin && nearest(mx, my);
    endAnim();
    Z.LT = clamp(Z.LT + n * .1, LMIN, LMAX);
    if (hit && hit.id !== Z.focus) { if (!Z.tr || Z.tr.f1 !== hit.id) Z.tr = { f0: invD(v.cen, v.k), f1: hit.id, u: 0 }; Z.anchor = null; return; }
    Z.anchor = zin && Array.isArray(Z.focus) && !Z.tr ? { real: invD([v.cen[0] + (mx - v.cx) * v.s, v.cen[1] + (my - v.cy) * v.s], v.k), mx, my } : null;
  },
  down(e, mx, my) { if (Z.view) { endAnim(); Z.drag = { mx, my, cen: Z.view.cen, s: Z.view.s, k: Z.view.k, moved: false }; } },
  move(e, mx, my) {
    const d = Z.drag;
    if (!d) return;
    if (!d.moved && Math.hypot(mx - d.mx, my - d.my) < 3) return;
    d.moved = true; Z.tr = null; Z.anchor = null;
    Z.focus = invD([d.cen[0] - (mx - d.mx) * d.s, d.cen[1] - (my - d.my) * d.s], d.k);
  },
  up(e, mx, my) { const d = Z.drag; Z.drag = null; if (d && !d.moved) { const hit = nearest(mx, my); if (hit && Z.view) Z.tr = { f0: invD(Z.view.cen, Z.view.k), f1: hit.id, u: 0 }; } },
};
for (const [n, L, foc] of PRESETS) {
  const b = document.createElement('button');
  b.textContent = n;
  b.onclick = () => { endAnim(); Z.tr = null; Z.anchor = null; Z.anim = { a: Z.L, b: L, f0: Z.view ? invD(Z.view.cen, Z.view.k) : Z.focus, f1: foc, u: 0 }; };
  $('#presets').append(b);
}
$('#zoom').min = -LMAX; $('#zoom').max = -LMIN; $('#zoom').value = -Z.L;
$('#zoom').oninput = e => { endAnim(); Z.anchor = null; Z.tr = null; Z.L = Z.LT = Z.shown = -e.target.value; };
