'use strict';
const AU = 1.495978707e11, SPR_M = 1.5, SCALE = 2;
const stage = $('#stage'), cv = $('#cv');
let fb = null, T = 0, scene = null, labels = [];
const ss = v => { v = clamp(v, 0, 1); return v * v * (3 - 2 * v); };
const ease = v => { v = clamp(v, 0, 1); return v < .5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; };
const lerp2 = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t)];

const basePC = planetColor;
planetColor = function (type, x, y, z, o) {
  if (type === 'ice' || type === 'ice2') {
    isLand = false;
    const w = fbm(x * 1.6 + 9, y * 3 + 2, z * 1.6, o);
    const P = type === 'ice' ? [[150, 210, 220], [176, 226, 232], [126, 190, 204]] : [[64, 100, 210], [90, 130, 230], [48, 76, 170]];
    return P[Math.floor(y * 3 + (w - .5) * 1.2 + 20) % 3];
  }
  return basePC(type, x, y, z, o);
};

SPECS.push({ id: 'harvester', name: 'Harvester', aft: 'dock', bow: 'dock', parts: [['truss', 'solar', 'solar'], ['tank'], ['tank'], ['reactor', 'radiator', 'radiator'], ['truss', 'antenna'], ['crew', 'tower']] });
const ENEMY = {
  x1: { id: 'x1', stern: ['engines', 3], bow: 'gun', parts: [['armor', 'pod', 'pod'], ['hull', 'turret', 'turret'], ['hangar'], ['armor', 'launcher']] },
  x2: { id: 'x2', stern: ['engines', 1], bow: 'bridge', parts: [['hull', 'launcher', 'fin'], ['crew', 'dish']] },
};
const getSpec = id => typeof id === 'object' ? id : spec(id) || ENEMY[id];

function pen(f, X0, Y0, k, flip, tint, clip) {
  const sx = flip ? -1 : 1;
  return {
    px(x, y, c) {
      if (tint) c = tint(c, x, y);
      if (!c) return;
      let a = X0 + sx * x * k, b = X0 + sx * (x + 1) * k;
      if (a > b) [a, b] = [b, a];
      const x0 = Math.round(a), x1 = Math.max(x0 + 1, Math.round(b));
      const y0 = Math.round(Y0 + y * k), y1 = Math.max(y0 + 1, Math.round(Y0 + (y + 1) * k));
      for (let j = y0; j < y1; j++) for (let i = x0; i < x1; i++) if (!clip || clip(i, j)) f.px(i, j, c);
    },
    rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c); },
  };
}
function shipAt(f, id, X0, Y0, k = 1, o = {}) {
  const sp = getSpec(id), m = measure(sp);
  const ps = drawShip(pen(f, X0, Y0, k, o.flip, o.tint, o.clip), 0, 0, sp, o.t ?? T);
  const sx = o.flip ? -1 : 1;
  const at = (x, y) => [X0 + sx * x * k, Y0 + y * k];
  return { ps, m, k, at, x0: Math.min(X0 + sx * m.x0 * k, X0 + sx * m.x1 * k), x1: Math.max(X0 + sx * m.x0 * k, X0 + sx * m.x1 * k), y0: Y0 + m.y0 * k, y1: Y0 + m.y1 * k };
}
function ship(f, id, cx, cy, k = 1, o = {}) {
  const m = measure(getSpec(id)), mx = (m.x0 + m.x1) / 2, my = (m.y0 + m.y1) / 2;
  return shipAt(f, id, o.flip ? cx + mx * k : cx - mx * k, cy - my * k, k, o);
}

function label(text, x, y, cls = '', dx = 10, dy = 0) { labels.push({ text, x, y, cls, dx, dy }); }
function flushLabels() {
  const L = $('#labels');
  while (L.children.length < labels.length) L.append(document.createElement('span'));
  [...L.children].forEach((el, i) => {
    const a = labels[i];
    if (!a) { el.hidden = true; return; }
    el.hidden = false;
    if (el.textContent !== a.text) el.textContent = a.text;
    el.className = a.cls;
    let x = a.dx === 'c' ? a.x * SCALE - el.offsetWidth / 2 : a.x * SCALE + a.dx;
    if (a.dx < 0) x -= el.offsetWidth;
    x = clamp(x, 4, stage.clientWidth - el.offsetWidth - 4);
    el.style.left = Math.round(x) + 'px';
    el.style.top = Math.round(clamp(a.y * SCALE + a.dy - 9, 2, stage.clientHeight - 20)) + 'px';
  });
  labels = [];
}
function readout(title, lines) {
  const r = $('#readout'), h = `<b>${title}</b>${lines.join('<br>')}`;
  if (r.innerHTML !== h) r.innerHTML = h;
  r.hidden = false;
}
function fmtDist(m) {
  if (m < 1000) return `${+m.toPrecision(2)} m`;
  if (m < .05 * AU) return `${Math.round(m / 1000).toLocaleString('en')} km`;
  return `${+(m / AU).toPrecision(2)} AU`;
}
function setScale(s, compressed) {
  const t = $('#scaleTxt'), bar = $('#bar');
  if (compressed) { bar.hidden = true; t.textContent = 'positions compressed, not to scale'; return; }
  bar.hidden = false;
  const want = s * 40, e = Math.pow(10, Math.floor(Math.log10(want)));
  let d = e;
  for (const q of [1, 2, 5, 10]) { d = q * e; if (d >= want) break; }
  bar.style.width = Math.round(d / s * SCALE) + 'px';
  t.textContent = `${fmtDist(d)} · 1 px = ${fmtDist(s)}`;
}
function setTier(t) { $$('#tiers span').forEach(e => e.classList.toggle('on', e.dataset.t === t)); }
function clipLine(f, x0, y0, x1, y1, c, gap, ph) {
  let t0 = 0, t1 = 1;
  const dx = x1 - x0, dy = y1 - y0;
  for (const [p, q] of [[-dx, x0 + 2], [dx, f.w + 1 - x0], [-dy, y0 + 2], [dy, f.h + 1 - y0]]) {
    if (p === 0) { if (q < 0) return; continue; }
    const r = q / p;
    if (p < 0) { if (r > t1) return; if (r > t0) t0 = r; } else { if (r < t0) return; if (r < t1) t1 = r; }
  }
  f.line(x0 + dx * t0, y0 + dy * t0, x0 + dx * t1, y0 + dy * t1, c, gap, ph);
}
function orbitArc(f, x, y, r, c, gap = 3) {
  if (r < 3) return;
  const diag = Math.hypot(f.w, f.h), dc = Math.hypot(f.w / 2 - x, f.h / 2 - y);
  if (Math.abs(dc - r) > diag) return;
  if (r < 4000) { f.ring(x, y, r, c, gap); return; }
  const a0 = Math.atan2(f.h / 2 - y, f.w / 2 - x), span = diag / r * 1.2, n = Math.ceil(span * r / 2);
  for (let i = -n; i <= n; i++) if (i % gap === 0) { const a = a0 + i / n * span; f.px(x + Math.cos(a) * r, y + Math.sin(a) * r, c); }
}

const BOD = [
  { id: 'sun', name: 'Sun', type: 'sun', r: 6.957e8, a: 0, ang: 0, sym: 4, col: [255, 216, 112] },
  { id: 'mercury', name: 'Mercury', type: 'rock', r: 2.44e6, a: .387 * AU, ang: 2.2, sym: 1, col: [150, 146, 150] },
  { id: 'venus', name: 'Venus', type: 'venus', r: 6.05e6, a: .723 * AU, ang: 1.0, sym: 1.5, col: [232, 204, 132] },
  { id: 'earth', name: 'Earth', type: 'terran', r: 6.371e6, a: AU, ang: 4.2, sym: 1.5, tilt: .4, lights: true, col: [80, 140, 200] },
  { id: 'moon', name: 'Moon', type: 'rock', r: 1.737e6, a: 3.844e8, ang: .9, sym: .6, parent: 'earth', col: [150, 146, 150] },
  { id: 'mars', name: 'Mars', type: 'mars', r: 3.39e6, a: 1.524 * AU, ang: 5.6, sym: 1, tilt: .43, col: [196, 108, 62] },
  { id: 'jupiter', name: 'Jupiter', type: 'gas', r: 6.99e7, a: 5.203 * AU, ang: .28, sym: 2.5, col: [226, 198, 158] },
  { id: 'saturn', name: 'Saturn', type: 'saturn', r: 5.82e7, a: 9.537 * AU, ang: 2.6, sym: 2.5, rings: true, col: [214, 190, 136] },
  { id: 'uranus', name: 'Uranus', type: 'ice', r: 2.54e7, a: 19.19 * AU, ang: 3.9, sym: 2, col: [150, 210, 220] },
  { id: 'neptune', name: 'Neptune', type: 'ice2', r: 2.46e7, a: 30.07 * AU, ang: 5.1, sym: 2, col: [80, 120, 220] },
];
const BI = Object.fromEntries(BOD.map(b => [b.id, b]));
const realPos = b => { const p = b.parent ? realPos(BI[b.parent]) : [0, 0]; return [p[0] + Math.cos(b.ang) * b.a, p[1] + Math.sin(b.ang) * b.a]; };
const R1 = .2 * AU, AC = 30.07 * AU / Math.log(1 + 30.07 * AU / R1);
const comp = r => AC * Math.log(1 + r / R1);
function dpos(p, k) {
  const r = Math.hypot(p[0], p[1]);
  if (!r || !k) return p;
  const f = mix(r, comp(r), k) / r;
  return [p[0] * f, p[1] * f];
}
function bodyD(b, k) {
  if (!b.parent) return dpos(realPos(b), k);
  const P = BI[b.parent], pd = bodyD(P, k), pr = realPos(P), r = realPos(b);
  return [pd[0] + r[0] - pr[0], pd[1] + r[1] - pr[1]];
}
