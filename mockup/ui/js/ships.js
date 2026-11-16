'use strict';
const NL = 6, NM = 24, LODS = [.375, .75, 1.5, 3, 6, 12], JAG = [0, 3, 5, 2, 6, 1, 4, 7, 3, 0, 5, 2, 7, 4, 1, 6];
const lodFor = S => LODS.find(l => l >= S * .999) || 12;
const M = { hull: 1, hull2: 2, dark: 3, armor: 4, accent: 5, white: 6, engine: 7, radiator: 8, solar: 9, glass: 10, gold: 11, rust: 12, teal: 13, yellow: 14, truss: 15, char: 16, hazard: 17, pit: 18, deck: 19, red: 20 };
const BASE = { hull: [146, 154, 176], hull2: [172, 180, 200], dark: [58, 60, 84], armor: [112, 118, 142], accent: [242, 179, 93], white: [226, 230, 238], engine: [74, 76, 98], radiator: [200, 84, 52], solar: [44, 74, 170], glass: [110, 220, 230], gold: [214, 170, 84], rust: [168, 96, 58], teal: [62, 140, 140], yellow: [226, 190, 84], truss: [96, 100, 126], char: [44, 34, 42], hazard: [230, 180, 60], pit: [16, 14, 26], deck: [48, 50, 72], red: [200, 70, 64] };
function mkRamp(b) {
  return [.2, .36, .56, .78, 1, 1.22].map(f => {
    let c = [b[0] * f, b[1] * f, b[2] * f];
    if (f < 1) c = c.map((v, i) => mix(v, [24, 18, 58][i], (1 - f) * .42));
    else if (f > 1) c = b.map((v, i) => mix(v, [255, 246, 220][i], .4));
    return c.map(v => clamp(Math.round(v), 0, 255));
  });
}
function mkPal(o) {
  const p = new Uint8Array(NM * NL * 3);
  for (const [k, id] of Object.entries(M)) mkRamp(o[k] || BASE[k]).forEach((c, l) => p.set(c, (id * NL + l) * 3));
  return p;
}
const PALS = {
  navy: mkPal({}),
  civ: mkPal({ hull: [178, 170, 158], hull2: [200, 192, 178], armor: [142, 134, 126], accent: [70, 150, 160] }),
  foe: mkPal({ hull: [150, 64, 70], hull2: [178, 82, 80], armor: [106, 46, 64], accent: [34, 28, 44], dark: [52, 28, 44], engine: [62, 36, 52], truss: [98, 52, 66], white: [240, 200, 180], glass: [255, 150, 90], deck: [44, 26, 40] }),
};
const SYS = { hull: [112, 118, 142], armor: [134, 140, 164], prop: [240, 130, 60], power: [240, 210, 90], weapon: [232, 78, 78], sensor: [95, 208, 197], crew: [110, 200, 110], bridge: [150, 220, 150], store: [176, 124, 80], hangar: [170, 120, 220], dock: [200, 200, 210] };
const SYSID = Object.keys(SYS), SYSPAL = new Uint8Array(SYSID.length * NL * 3);
SYSID.forEach((k, n) => mkRamp(SYS[k]).forEach((c, l) => SYSPAL.set(c, (n * NL + l) * 3)));
const PLATED = new Uint8Array(NM); PLATED[M.hull] = PLATED[M.hull2] = PLATED[M.armor] = PLATED[M.accent] = 1;

const FONT = { A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010', Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110', 4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001110', '-': '000000111000000' };

class Builder {
  constructor(len, half, S, seed) {
    const pad = Math.ceil(2 + S);
    Object.assign(this, { S, pad, len, half, seed, w: Math.ceil(len * S) + pad * 2, h: (Math.ceil(half * S) + pad) * 2, comp: 0, comps: [null], mounts: [], cells: [], nozzles: [] });
    this.cy = this.h / 2;
    const n = this.w * this.h;
    this.z = new Float32Array(n); this.m = new Uint8Array(n); this.c = new Uint8Array(n); this.e = new Uint8Array(n); this.t = new Int8Array(n);
  }
  begin(type, name, info) { this.comps.push({ type, name, sys: SYSID.indexOf(type), ...info }); return this.comp = this.comps.length - 1; }
  shape(x0, y0, x1, y1, fn, mat, o = {}) {
    const { S, pad, cy, w, h } = this, mf = typeof mat === 'function', ef = typeof o.e === 'function';
    const X0 = Math.max(0, Math.floor(pad + x0 * S)), X1 = Math.min(w - 1, Math.ceil(pad + x1 * S));
    const Y0 = Math.max(0, Math.floor(cy + y0 * S)), Y1 = Math.min(h - 1, Math.ceil(cy + y1 * S));
    for (let j = Y0; j <= Y1; j++) for (let i = X0; i <= X1; i++) {
      const x = (i + .5 - pad) / S, y = (j + .5 - cy) / S, zu = fn(x, y);
      if (!(zu > 0)) continue;
      const k = j * w + i;
      let zz = zu * S;
      if (o.on) { if (!this.m[k]) continue; zz += this.z[k]; } else if (!o.force && zz <= this.z[k]) continue;
      if (o.force && !this.m[k]) continue;
      const mm = mf ? mat(x, y, i, j) : mat;
      if (!mm) continue;
      this.z[k] = zz; this.m[k] = mm; this.c[k] = this.comp; this.e[k] = ef ? o.e(x, y, i, j) : o.e || 0; this.t[k] = o.t || 0;
    }
    if (o.sym) this.shape(x0, -y1, x1, -y0, (x, y) => fn(x, -y), mf ? (x, y, i, j) => mat(x, -y, i, h - 1 - j) : mat, { ...o, sym: false, e: ef ? (x, y, i, j) => o.e(x, -y, i, h - 1 - j) : o.e });
  }
  slabF(xa, xb, hwf, hwMax, z, mat, o = {}) {
    const S = this.S, side = o.side ?? .3, bx = (o.bx ?? 1.2) / S, zf = o.zf;
    this.shape(xa, -hwMax, xb, hwMax, (x, y) => {
      const hw = hwf(x), e = (hw - Math.abs(y)) / Math.max(hw * side, 1.2 / S), d = Math.min(x - xa, xb - x) / bx;
      return (zf ? zf(x) : z) * Math.min(1, e, Math.max(d, .55));
    }, mat, o);
  }
  box(xa, ya, xb, yb, z, mat, o = {}) {
    const b = (o.b ?? 1.2) / this.S;
    this.shape(xa, ya, xb, yb, (x, y) => z * Math.min(1, Math.min(x - xa, xb - x, y - ya, yb - y) / b + .35), mat, o);
  }
  dome(cx, cy, r, z, mat, o = {}) {
    const base = o.base || 0;
    this.shape(cx - r, cy - r, cx + r, cy + r, (x, y) => { const d = ((x - cx) ** 2 + (y - cy) ** 2) / (r * r); return d < 1 ? base + (z - base) * Math.sqrt(1 - d) : 0; }, mat, o);
  }
  cyl(cx, cy, r, z, mat, o = {}) {
    const b = (o.b ?? 1.4) / this.S;
    this.shape(cx - r, cy - r, cx + r, cy + r, (x, y) => { const d = r - Math.hypot(x - cx, y - cy); return d > 0 ? z * Math.min(1, d / b + .35) : 0; }, mat, o);
  }
  tube(xa, xb, y0, r, z, mat, o = {}) {
    const base = o.base ?? z * .45, rf = o.rf;
    this.shape(xa, y0 - (o.rmax || r), xb, y0 + (o.rmax || r), (x, y) => {
      const rr = rf ? rf(x) : r, d = ((y - y0) / rr) ** 2;
      if (d >= 1) return 0;
      const cap = o.cap ? Math.min(1, Math.min(x - xa, xb - x) / (rr * .6) + .3) : 1;
      return (base + (z - base) * Math.sqrt(1 - d)) * cap;
    }, mat, o);
  }
  px(xu, yu) { return [Math.floor(this.pad + xu * this.S), Math.floor(this.cy + yu * this.S)]; }
  each(x0, y0, x1, y1, cb, sym) {
    const { S, pad, cy, w, h } = this;
    const X0 = Math.max(0, Math.floor(pad + x0 * S)), X1 = Math.min(w - 1, Math.ceil(pad + x1 * S) - 1);
    const Y0 = Math.max(0, Math.floor(cy + y0 * S)), Y1 = Math.min(h - 1, Math.ceil(cy + y1 * S) - 1);
    for (let j = Y0; j <= Y1; j++) for (let i = X0; i <= X1; i++) {
      cb(j * w + i, i - X0, j - Y0, i, j);
      if (sym) cb((h - 1 - j) * w + i, i - X0, j - Y0, i, h - 1 - j);
    }
  }
  plates(xa, xb, hw) {
    const { S, pad, w, h, comp } = this;
    if (S < 1.5) return;
    const cyi = h / 2, groove = S >= 6 ? .6 : 0, mw = Math.round(4.5 + S * .75), mh = Math.round(3.5 + S * .5);
    const leaf = (X0, Y0, X1, Y1, sd) => {
      const tint = [-1, 0, 0, 0, 1, 0, 1, -1][Math.floor(hash(sd, 3, 1) * 8)];
      for (let j = Y0; j < Y1; j++) for (let i = X0; i < X1; i++) for (const jj of [j, h - 1 - j]) {
        const k = jj * w + i;
        if (this.c[k] !== comp || !PLATED[this.m[k]]) continue;
        const seam = i === X1 - 1 || j === Y1 - 1;
        this.t[k] = seam ? -2 : tint;
        if (seam) this.z[k] -= groove;
        else if (S >= 6 && (i === X0 + 1 || i === X1 - 3) && (j === Y0 + 1 || j === Y1 - 3) && (X1 - X0) > 8 && hash(sd, 9, 2) > .45) this.t[k] = tint + 2;
        else if (S >= 12 && hash(sd, 5, 5) > .8 && i > X0 + 3 && i < X1 - 5 && j > Y0 + 2 && j < Y1 - 4 && ((i - X0) % 3 === 0)) this.t[k] = tint - 1;
      }
    };
    const split = (X0, Y0, X1, Y1, sd, depth) => {
      const W = X1 - X0, H = Y1 - Y0, canX = W >= mw * 2, canY = H >= mh * 2;
      if ((!canX && !canY) || (depth > 1 && W * H < mw * mh * 7 && hash(sd, 1, 3) < .25)) return leaf(X0, Y0, X1, Y1, sd);
      if (canX && (!canY || W > H * 1.25)) {
        const c = X0 + Math.round(W * (.36 + .28 * hash(sd, 2, 3)));
        split(X0, Y0, c, Y1, sd * 2 + 1, depth + 1); split(c, Y0, X1, Y1, sd * 2 + 2, depth + 1);
      } else {
        const c = Y0 + Math.round(H * (.36 + .28 * hash(sd, 4, 3)));
        split(X0, Y0, X1, c, sd * 2 + 1, depth + 1); split(X0, c, X1, Y1, sd * 2 + 2, depth + 1);
      }
    };
    split(Math.round(pad + xa * S), cyi, Math.round(pad + xb * S), Math.round(cyi + hw * S), 17 + comp, 0);
  }
  greebles(xa, xb, hw, dens = 120) {
    const { S, pad, w, h, comp } = this;
    if (S < 3) return;
    const X0 = pad + xa * S, W = (xb - xa) * S, Y0 = h / 2, H = hw * S, n = Math.round(W * H / dens);
    for (let g = 0; g < n; g++) {
      const r = q => hash(g, q, comp * 7 + (S | 0));
      const gw = 2 + Math.floor(r(1) * (S >= 6 ? 5 : 3)), gh = 1 + Math.floor(r(2) * (S >= 6 ? 4 : 2));
      const gx = Math.floor(X0 + 1 + r(3) * (W - gw - 2)), gy = Math.floor(Y0 + r(4) * (H - gh - 1));
      const kc = gy * w + gx;
      if (this.c[kc] !== comp || !PLATED[this.m[kc]] || this.m[kc] === M.accent) continue;
      const dz = .8 + r(5) * 1.8, mm = r(6) < .45 ? M.hull2 : r(6) < .75 ? M.engine : M.dark, pipe = S >= 6 && r(7) > .8;
      for (let j = 0; j < (pipe ? 1 : gh); j++) for (let i = 0; i < (pipe ? gw * 4 : gw); i++) for (const jj of [gy + j, h - 1 - gy - j]) {
        const k = jj * w + gx + i;
        if (this.c[k] !== comp || !PLATED[this.m[k]]) continue;
        this.z[k] += dz; this.m[k] = pipe ? M.engine : mm; this.t[k] = 0;
      }
    }
  }
  text(str, xu, yu, comp, mat = M.white) {
    const { S, w } = this, sc = S >= 12 ? 3 : S >= 6 ? 2 : 1;
    if (S < 3) return;
    let [X, Y] = this.px(xu, yu);
    for (const ch of str) {
      const g = FONT[ch];
      if (g) for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r * 3 + c] === '1') for (let a = 0; a < sc; a++) for (let b = 0; b < sc; b++) {
        const k = (Y + r * sc + a) * w + X + c * sc + b;
        if (this.m[k] && this.c[k] === comp) { this.m[k] = mat; this.t[k] = 0; this.e[k] = 0; }
      }
      X += 4 * sc;
    }
  }
  light(xu, yu, e) { const [X, Y] = this.px(xu, yu), k = Y * this.w + X; if (this.m[k]) this.e[k] = e; }
  finish(pvx) {
    const { w, h, z, m } = this, n = w * h, K = 1.5;
    this.nx = new Int8Array(n); this.ny = new Int8Array(n); this.nz = new Int8Array(n);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const k = j * w + i;
      if (!m[k]) continue;
      const zc = z[k], g = (kk, ok) => ok && m[kk] ? z[kk] : 0;
      let dx = (g(k + 1, i < w - 1) - g(k - 1, i > 0)) / 2, dy = (g(k + w, j < h - 1) - g(k - w, j > 0)) / 2;
      dx = clamp(dx, -4, 4); dy = clamp(dy, -4, 4);
      const l = Math.hypot(dx, dy, K);
      this.nx[k] = Math.round(-dx / l * 127); this.ny[k] = Math.round(-dy / l * 127); this.nz[k] = Math.round(K / l * 127);
    }
    this.pvx = pvx ?? this.pad + this.len * this.S / 2; this.pvy = this.cy;
    this.rad = Math.hypot(Math.max(this.pvx, w - this.pvx), h / 2);
    return this;
  }
}

const PLEN = { hull: 8, crew: 8, reactor: 6, fuel: 8, armor: 8, truss: 8, tank: 13, ring: 6, hangar: 14, bridge: 12, blunt: 5, gun: 17, prow: 11, dock: 4, engines: 8, big: 12 };
const PHW = { hull: 5, crew: 5.5, reactor: 5, fuel: 5, armor: 7, truss: 1.3, tank: 6, ring: 2.2, hangar: 8, bridge: 5, blunt: 4.6, gun: 4.6, prow: 7, dock: 3, big: 6 };
const PZ = { hull: 4, crew: 4, reactor: 4, fuel: 3.4, armor: 5, truss: 2.2, tank: 6.5, ring: 3, hangar: 5 };
const AEXT = { solar: 13, radiator: 8.5, pod: 4.2, fin: 5.2, antenna: 6, cargo: 0 };
const CONT = [M.rust, M.teal, M.yellow, M.white, M.rust, M.teal, M.hull2];
function body(b, p, z, mat = M.hull, o = {}) {
  const xa = p.x, xb = p.x + p.L, a = Math.max(p.prev, p.hw * .5), e = Math.max(p.next, p.hw * .5);
  b.slabF(xa, xb, x => Math.min(p.hw, a + (x - xa) * 1.2, e + (xb - x) * 1.2), p.hw, z, mat, o);
  b.plates(xa, xb, p.hw); b.greebles(xa, xb, p.hw, o.dens);
}
const PART = {
  hull(b, p) {
    b.begin('hull', 'Hull section', { tons: 400, htk: 6, crew: 24 });
    body(b, p, 4);
    b.box(p.x + .6, -1.3, p.x + p.L - .6, 1.3, 4.9, (x, y, i) => i % 7 === 3 ? M.dark : M.hull2);
  },
  crew(b, p) {
    b.begin('crew', 'Crew quarters', { tons: 500, htk: 4, crew: 120 });
    body(b, p, 4);
    const xa = p.x + 1, xb = p.x + p.L - 1;
    b.box(xa, -3.2, xb, 3.2, 5.6, M.hull2, { b: 1.6 });
    b.box(xa + 1.2, -1.6, xb - 1.2, 1.6, 6.4, M.hull, { b: 1.2 });
    for (const y of [-2.75, 2.55]) b.each(xa + .5, y, xb - .5, y + .01, (k, i) => { if (i % 2 === 0 && hash(i, k, 3) > .22) b.e[k] = 1; });
    if (b.S >= 6) for (const y of [-1.25, 1.1]) b.each(xa + 1.6, y, xb - 1.6, y + .01, (k, i) => { if (i % 3 === 0 && hash(i, k, 5) > .3) b.e[k] = 1; });
  },
  reactor(b, p) {
    b.begin('power', 'Fusion reactor', { tons: 900, htk: 5, power: 480, crew: 16 });
    body(b, p, 4);
    const cx = p.x + p.L / 2;
    b.cyl(cx, 0, 2.9, 4.8, M.engine);
    b.dome(cx, 0, 2.3, 6.6, (x, y) => Math.hypot(x - cx, y) < 1 ? M.glass : M.dark, { e: (x, y) => Math.hypot(x - cx, y) < 1 ? 7 : 0, base: 4.8 });
    for (const s of [-1, 1]) b.box(p.x + .8, s * 3.5 - .45, p.x + p.L - .8, s * 3.5 + .45, 4.5, M.radiator, { e: (x, y, i) => i % 2 ? 8 : 0 });
  },
  fuel(b, p) {
    b.begin('store', 'Fuel bunkers', { tons: 1200, htk: 3, fuel: '2.4 Ml' });
    body(b, p, 3.4);
    const cx = p.x + p.L / 2;
    b.tube(p.x + .7, p.x + p.L - .7, 2.5, 2.1, 5.6, x => Math.abs(x - cx) < .5 ? M.gold : M.white, { sym: true, cap: true, base: 3.2 });
    b.box(p.x + 1, -.35, p.x + p.L - 1, .35, 4.2, M.engine);
  },
  armor(b, p) {
    b.begin('armor', 'Armour belt', { tons: 1500, htk: 14, layers: 4, crew: 12 });
    body(b, p, 5, M.armor, { side: .42, dens: 200 });
    b.box(p.x + 1, -1, p.x + p.L - 1, 1, 5.6, M.hull, { b: 1 });
  },
  truss(b, p) {
    b.begin('hull', 'Truss spine', { tons: 150, htk: 2 });
    b.shape(p.x, -1.3, p.x + p.L, 1.3, (x, y) => 2.2 * Math.min(1, (1.3 - Math.abs(y)) * 2 + .4), (x, y, i, j) => (Math.abs(y) > .95 || (i + j) % 5 === 0 || (i - j + 400) % 5 === 0) ? M.truss : b.S >= 3 ? M.pit : M.engine);
  },
  tank(b, p) {
    b.begin('store', 'Pressure tank', { tons: 1800, htk: 3, fuel: '6.0 Ml' });
    const cx = p.x + p.L / 2;
    b.box(p.x, -1, p.x + p.L, 1, 2.2, M.truss);
    b.dome(cx, 0, 6, 7, (x, y) => { const r = Math.hypot(x - cx, y); return r > 2.6 && r < 3.3 ? M.gold : Math.abs(y) < .3 && r > 3.3 ? M.dark : M.white; }, { base: 1 });
    b.cyl(cx, 0, .9, 7.5, M.engine);
  },
  ring(b, p) {
    b.begin('crew', 'Habitat ring', { tons: 2200, htk: 6, crew: 900 });
    const cx = p.x + p.L / 2, r = p.L / 2 - .6;
    b.box(p.x, -2.2, p.x + p.L, 2.2, 3, M.hull);
    b.shape(cx - r, -12.5, cx + r, 12.5, (x, y) => { const d = ((x - cx) / r) ** 2, ey = Math.min(1, (12.5 - Math.abs(y)) / 1.5 + .2); return d < 1 ? (2 + 3 * Math.sqrt(1 - d)) * ey : 0; }, (x, y, i, j) => j % 9 === 0 ? M.dark : M.hull2, { e: (x, y, i, j) => Math.abs(x - cx) < r * .45 && Math.abs(Math.abs(x - cx) - r * .3) < .6 / b.S + .08 && j % 3 === 1 && hash(i, j, 2) > .25 && Math.abs(y) > 2.6 ? 1 : 0 });
    b.cyl(cx, 0, 2.6, 5.6, M.armor);
  },
  hangar(b, p) {
    b.begin('hangar', 'Hangar deck', { tons: 2600, htk: 8, craft: 6, crew: 90 });
    body(b, p, 5, M.armor, { side: .25, dens: 240 });
    const xa = p.x + 1.6, xb = p.x + p.L - 1.6, S = b.S;
    b.shape(xa, -4.6, xb, 4.6, () => 2.4 / 1, (x, y, i, j) => (Math.abs(y) > 4.6 - 1.2 / S - .2 || x < xa + 1.4 / S + .15 || x > xb - 1.4 / S - .15) ? ((i + j) % 4 < 2 ? M.hazard : M.pit) : M.deck, { force: true, e: (x, y, i) => Math.abs(y) < .5 / S + .02 && i % 4 === 0 ? 9 : Math.abs(Math.abs(y) - 3.2) < .5 / S + .02 && i % 6 === 0 ? 2 : 0 });
    for (let n = 0; n < 4; n++) {
      const fx = xa + 1.6 + (n >> 1) * 4.4, fy = (n & 1 ? 1 : -1) * 2;
      b.shape(fx, fy - 1.1, fx + 2.6, fy + 1.1, (x, y) => Math.abs(y - fy) < (.35 + (fx + 2.6 - x) * .28) * (x > fx + 1.9 ? .5 : 1) ? 3.2 : 0, (x) => x > fx + 1.7 ? M.glass : M.hull2);
    }
  },
  engines(b, p) {
    const n = p.n, xa = p.x, xb = p.x + p.L;
    b.begin('prop', n + ' × fusion drive', { tons: 700 * n, htk: 4 * n, thrust: 1200 * n, crew: 18 * n });
    const q = { ...p, x: xa + 2.6, L: p.L - 2.6, prev: p.hw * .75 };
    body(b, q, 4.5);
    b.box(xa + 3.4, -p.hw + 1.2, xa + 4.6, p.hw - 1.2, 5.1, M.engine);
    for (let k = 0; k < n; k++) {
      const y0 = n > 1 ? (k - (n - 1) / 2) * (2 * (p.hw - 1.9) / (n - 1)) : 0, rf = x => 1.65 - (x - xa) * .16;
      b.tube(xa, xa + 3.6, y0, 1.65, 4.6, (x, y, i) => i % 3 === 0 ? M.dark : M.engine, { rf, base: 1.6 });
      b.shape(xa, y0 - 1.2, xa + 1.1, y0 + 1.2, (x, y) => Math.abs(y - y0) < rf(x) * .68 ? 2.2 : 0, M.pit, { force: true, e: 6 });
      b.nozzles.push({ x: xa - b.len / 2, y: y0, r: 1.25 });
    }
  },
  big(b, p) {
    const xa = p.x;
    b.begin('prop', 'Main drive', { tons: 3200, htk: 10, thrust: 5200 });
    body(b, { ...p, x: xa + 6, L: p.L - 6, prev: 3 }, 4.5);
    b.box(xa + 4.6, -2.4, xa + 7, 2.4, 4, M.truss);
    const rf = x => 5.7 - (x - xa) * .5;
    b.tube(xa, xa + 6.2, 0, 5.7, 6, (x, y, i) => i % 4 === 0 ? M.dark : i % 4 === 1 ? M.hull2 : M.engine, { rf, base: 1.5 });
    b.shape(xa, -4.6, xa + 1.9, 4.6, (x, y) => Math.abs(y) < rf(x) * .78 ? 2 : 0, M.pit, { force: true, e: 6 });
    b.nozzles.push({ x: xa - b.len / 2, y: 0, r: 4.2 });
    for (const s of [-1, 1]) b.box(xa + 7.4, s * 4.3 - .5, xa + 11, s * 4.3 + .5, 4.9, M.radiator, { e: (x, y, i) => i % 2 ? 8 : 0 });
  },
  bridge(b, p) {
    b.begin('bridge', 'Bridge', { tons: 600, htk: 5, crew: 40 });
    const xa = p.x, L = p.L, hwf = x => p.hw * (1 - Math.pow((x - xa) / L, 1.7) * .72);
    b.slabF(xa, xa + L, hwf, p.hw, 4, M.hull, { zf: x => 4 - (x - xa) / L * .9, bx: 2.5 });
    b.plates(xa, xa + L, p.hw); b.greebles(xa, xa + L, p.hw);
    b.box(xa + .8, -2.7, xa + 5.2, 2.7, 5.8, M.hull2, { b: 1.8 });
    b.box(xa + 1.6, -1.5, xa + 4.2, 1.5, 6.6, M.hull, { b: 1.2 });
    b.each(xa + 5.2 - 1.6 / b.S, -2.2, xa + 5.2 - .6 / b.S, 2.2, (k, i, j) => { if (b.m[k] && j % 2 === 0) { b.e[k] = 2; } });
    for (const y of [-2.3, 2.1]) b.each(xa + 1.2, y, xa + 4.6, y + .01, (k, i) => { if (i % 2 === 0 && b.m[k]) b.e[k] = 1; });
    b.cyl(xa + 7.6, 0, 1, 4.6, M.white); b.dome(xa + 7.6, 0, .7, 5.6, M.gold, { base: 4.6 });
    b.box(xa + 9, -.3, xa + L - .4, .3, 4, M.engine);
  },
  blunt(b, p) {
    b.begin('bridge', 'Command cab', { tons: 300, htk: 3, crew: 12 });
    const xa = p.x, L = p.L;
    b.slabF(xa, xa + L, x => p.hw - (x - xa) / L * 1.3, p.hw, 4.2, M.hull2, { bx: 3 });
    b.plates(xa, xa + L, p.hw);
    b.each(xa + L - 1.5, -2.6, xa + L - 1.5 + 1.2 / b.S, 2.6, k => { if (b.m[k]) b.e[k] = 2; });
    b.box(xa + .6, -1.6, xa + 2.6, 1.6, 5, M.hull, { b: 1.2 });
  },
  gun(b, p) {
    b.begin('weapon', 'Spinal lance', { tons: 2400, htk: 8, range: '320,000 km', dmg: 40 });
    const xa = p.x, xe = xa + p.L;
    b.slabF(xa, xa + 6.5, x => p.hw - (x - xa) / 6.5 * 2.4, p.hw, 4, M.hull, { bx: 2 });
    b.plates(xa, xa + 6.5, p.hw); b.greebles(xa, xa + 6.5, p.hw);
    b.box(xa + .5, -1.5, xa + 6.2, 1.5, 5.2, M.armor, { b: 1.2 });
    b.tube(xa + 5.5, xe - .4, 0, .8, 3.6, (x, y, i) => Math.floor((x - xa) * 1.5) % 3 === 0 ? M.dark : M.engine, { base: 1.8 });
    for (const s of [-1, 1]) b.box(xa + 6, s * 1.5 - .25, xe - 3, s * 1.5 + .25, 2.6, M.truss);
    b.tube(xe - 2, xe, 0, 1.25, 4, M.hull2, { base: 2, cap: true });
    b.each(xe - .8, -.5, xe - .1, .5, k => { if (b.m[k]) b.e[k] = 10; });
    b.spinal = { x: xe - b.len / 2, y: 0 };
  },
  prow(b, p) {
    b.begin('armor', 'Armoured prow', { tons: 1900, htk: 16, layers: 5 });
    const xa = p.x, L = p.L, hwf = x => Math.max(.5, p.hw * (1 - Math.pow((x - xa) / L, 1.5)));
    b.slabF(xa, xa + L, hwf, p.hw, 5, M.armor, { side: .5, zf: x => 5 - (x - xa) / L * 1.6, bx: 2.5 });
    b.plates(xa, xa + L, p.hw);
    b.each(xa + 1, -p.hw, xa + L, p.hw, (k, i, j, I, J) => { const x = (I + .5 - b.pad) / b.S - xa, y = Math.abs((J + .5 - b.cy) / b.S); if (PLATED[b.m[k]] && Math.abs(x + y * .9 - 6.2) < .55) { b.m[k] = M.accent; } });
    b.each(xa + 1.5, -.4, xa + 3, .4, k => { if (b.m[k]) b.e[k] = 2; });
  },
  dock(b, p) {
    b.begin('dock', 'Docking port', { tons: 120, htk: 2 });
    const cx = p.x + p.L / 2;
    b.box(p.x, -3, p.x + p.L, 3, 3.2, M.hull2);
    b.cyl(cx, 0, 1.9, 3.8, (x, y, i, j) => Math.hypot(x - cx, y) < 1.15 ? M.pit : (i + j) % 4 < 2 ? M.hazard : M.dark);
    b.light(cx, -2.4, 4); b.light(cx, 2.3, 4);
  },
};
const TATT = {
  turret(b, p, y) {
    const xc = p.x + p.L / 2, z = PZ[p.k] ?? 4;
    const c = b.begin('weapon', 'Twin beam turret', { tons: 320, htk: 4, range: '180,000 km', dmg: 12, track: '5,000 km/s' });
    b.cyl(xc, y, 2.2, z + .9, M.dark, { b: 2 });
    b.mounts.push({ x: xc - b.len / 2, y, type: 'beam', face: y ? Math.sign(y) * Math.PI / 2 : 0, arc: y ? 1.75 : 2.6, comp: c });
  },
  launcher(b, p, y) {
    const xc = p.x + p.L / 2, z = (PZ[p.k] ?? 4) + .9;
    b.begin('weapon', 'Missile cells ×6', { tons: 400, htk: 3, salvo: 6, reload: '40 s' });
    b.box(xc - 2.5, y - 1.7, xc + 2.5, y + 1.7, z, (x, yy) => { const u = (x - xc + 2.5) % 1.66, v = (yy - y + 1.7) % 1.7; return u < .3 || v < .3 ? M.dark : M.red; }, { b: 1 });
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) b.cells.push({ x: xc - 1.66 + i * 1.66 - b.len / 2, y: y - .85 + j * 1.7 });
  },
  dish(b, p, y) {
    const xc = p.x + p.L / 2, z = PZ[p.k] ?? 4;
    b.begin('sensor', 'Active sensor', { tons: 250, htk: 2, range: '2.1 AU', res: 'res 100' });
    b.cyl(xc, y, .9, z + 1.4, M.engine);
    b.shape(xc - 2.3, y - 2.3, xc + 2.3, y + 2.3, (x, yy) => { const d = ((x - xc) ** 2 + (yy - y) ** 2) / 5.29; return d < 1 ? z + 1 + d * 1.5 : 0; }, (x, yy) => Math.hypot(x - xc, yy - y) < .5 ? M.gold : M.white);
  },
  antenna(b, p, y) {
    const xc = p.x + p.L / 2, z = PZ[p.k] ?? 4;
    b.begin('sensor', 'Comm mast', { tons: 60, htk: 1 });
    if (!y) { b.cyl(xc, 0, .8, z + 2, M.white); b.light(xc, 0, 3); return; }
    const s = Math.sign(y), y0 = p.hw - .6, y1 = p.hw + 5.6;
    b.shape(xc - .35, Math.min(s * y0, s * y1), xc + .35, Math.max(s * y0, s * y1), () => 1.8, (x, yy, i, j) => (i + j) % 2 ? M.truss : M.white);
    b.cyl(xc, s * y0, .9, z + 1, M.engine);
    b.light(xc, s * (y1 - .3), 3);
  },
  tower(b, p) {
    const xc = p.x + p.L / 2, z = PZ[p.k] ?? 4;
    b.begin('bridge', 'Conning tower', { tons: 350, htk: 3, crew: 30 });
const isl = p.k === 'hangar', yc = isl ? -(p.hw - 1.7) : 0, hw = isl ? 1.5 : 2.1, hl = isl ? 3.6 : 2.6;
    b.box(xc - hl, yc - hw, xc + hl, yc + hw, z + 2.2, M.hull2, { b: 1.6 });
    b.box(xc - hl * .45, yc - hw * .62, xc + hl * .78, yc + hw * .62, z + 3.4, M.hull, { b: 1.2 });
    b.each(xc + hl * .78 - 1.4 / b.S, yc - hw * .5, xc + hl * .78 - .4 / b.S, yc + hw * .5, k => { b.e[k] = 2; });
    for (const yy of [yc - hw + .3, yc + hw - .5]) b.each(xc - hl + .6, yy, xc + hl - .6, yy + .01, (k, i) => { if (i % 2 === 0) b.e[k] = 1; });
    b.cyl(xc - hl * .7, yc, .5, z + 4.4, M.white); b.light(xc - hl * .7, yc, 3);
  },
  cargo(b, p, s, n) {
    b.begin('store', 'Cargo racks', { tons: 900 * n, htk: 2, cargo: 5000 * n + ' t' });
    for (let r = 0; r < n; r++) for (let q = 0; q < 2; q++) {
      const xa = p.x + .35 + q * 3.85, ya = p.hw + .35 + r * 3.05, zz = 2.6 + hash(r, q, p.x + s) * 1.2, mm = CONT[Math.floor(hash(q, r, p.x * 3 + s) * CONT.length)];
      const y0 = s > 0 ? ya : -ya - 2.75;
      b.box(xa, y0, xa + 3.5, y0 + 2.75, zz, mm, { b: 1 });
      b.each(xa + .2, y0 + .2, xa + 3.3, y0 + 2.55, (k, i) => { if (i % 3 === 1 && b.m[k] === mm) b.t[k] = -1; });
    }
  },
  radiator(b, p, s) {
    const xc = p.x + p.L / 2, y0 = p.hw - .4;
    b.begin('power', 'Radiator', { tons: 80, htk: 1 });
    b.shape(xc - 2.2, s > 0 ? y0 : -y0 - 8.4, xc + 2.2, s > 0 ? y0 + 8.4 : -y0, () => 1.4, (x, y, i) => i % 5 === 0 ? M.dark : M.radiator, { e: (x, y, i, j) => i % 5 && j % 3 === 1 ? 8 : 0 });
  },
  solar(b, p, s) {
    const xc = p.x + p.L / 2, y0 = p.hw - .3;
    b.begin('power', 'Solar array', { tons: 60, htk: 1, power: 40 });
    b.shape(xc - .35, s > 0 ? y0 : -y0 - 1.6, xc + .35, s > 0 ? y0 + 1.6 : -y0, () => 1.6, M.truss);
    const ya = s > 0 ? y0 + 1.4 : -y0 - 12.6;
    b.shape(xc - 3.8, ya, xc + 3.8, ya + 11.2, () => 1.1, (x, y, i, j) => (i % 5 === 0 || j % 5 === 0) ? M.white : M.solar, { t: 0 });
    b.each(xc - 3.8, ya, xc + 3.8, ya + 11.2, (k, i, j) => { if (b.m[k] === M.solar) b.t[k] = hash(Math.floor(i / 5), Math.floor(j / 5), 3) > .6 ? 1 : (i + j) % 2 ? 0 : -1; });
  },
  pod(b, p, s) {
    const xc = p.x + p.L / 2, y0 = p.hw + 2.4;
    b.begin('prop', 'Manoeuvring pod', { tons: 180, htk: 2, thrust: 200 });
    b.shape(xc - .8, s > 0 ? p.hw - .6 : -y0, xc + .8, s > 0 ? y0 : -p.hw + .6, () => 2.4, M.truss);
    b.tube(xc - 3.2, xc + 2.6, s * y0, 1.3, 3.6, (x, y, i) => x > xc + 1.4 ? M.hull2 : i % 4 === 0 ? M.dark : M.engine, { cap: true, base: 1.6 });
    b.each(xc - 3.2, s * y0 - .6, xc - 2.5, s * y0 + .6, k => { if (b.m[k]) b.e[k] = 6; });
    b.nozzles.push({ x: xc - 3.2 - b.len / 2, y: s * y0, r: .8 });
  },
  fin(b, p, s) {
    const xa = p.x + .6, y0 = p.hw - .5;
    b.begin('hull', 'Stabiliser', { tons: 90, htk: 2 });
    b.shape(xa, s > 0 ? y0 : -y0 - 5.4, xa + 6.6, s > 0 ? y0 + 5.4 : -y0, (x, y) => (Math.abs(y) - y0) < 5.2 * (1 - (x - xa) / 6.6) ? 1.8 : 0, (x, y) => (Math.abs(y) - y0) > 5.2 * (1 - (x - xa) / 6.6) - .9 ? M.accent : M.hull);
  },
};
const CENTERED = { turret: 1, launcher: 1, dish: 1, antenna: 1, tower: 1 };
function attach(b, p) {
  const parse = a => { const m = /^(\D+)(\d*)$/.exec(a); return [m[1], +m[2] || 1]; };
  const yOff = k => k === 'turret' ? Math.max(0, p.hw - 2.4) : k === 'launcher' ? Math.max(0, p.hw - 2.2) : k === 'dish' ? Math.max(0, p.hw - 2.5) : 1;
  const put = (a, s, alone) => {
    const [k, n] = parse(a);
    if (CENTERED[k]) {
      if (k === 'tower') return alone || s < 0 ? TATT.tower(b, p) : 0;
      const y = alone ? 0 : s * yOff(k);
      return TATT[k](b, p, y);
    }
    if (k === 'cargo') { TATT.cargo(b, p, s, n); if (alone) TATT.cargo(b, p, -s, n); return; }
    TATT[k](b, p, s); if (alone) TATT[k](b, p, -s);
  };
  if (p.top) put(p.top, -1, !p.bot);
  if (p.bot) put(p.bot, 1, false);
}
function specParts(spec) {
  const parts = [];
  if (spec.stern) parts.push({ k: spec.stern[0], n: spec.stern[1] || 1 });
  if (spec.aft) parts.push({ k: spec.aft });
  for (const [k, top, bot] of spec.parts) parts.push({ k, top, bot });
  if (spec.bow) parts.push({ k: spec.bow });
  let len = 0, half = 0;
  for (const p of parts) {
    p.L = PLEN[p.k]; p.hw = PHW[p.k] ?? 2.6 + p.n * 1.5; p.x = len; len += p.L;
    let ext = p.k === 'ring' ? 12.6 : p.hw;
    for (const a of [p.top, p.bot]) if (a) { const m = /^(\D+)(\d*)$/.exec(a); ext = Math.max(ext, p.hw + (m[1] === 'cargo' ? (+m[2] || 1) * 3.05 + .5 : AEXT[m[1]] || 0)); }
    half = Math.max(half, ext);
  }
  parts.forEach((p, i) => { p.prev = parts[i - 1]?.hw ?? p.hw; p.next = parts[i + 1]?.hw ?? p.hw; });
  return { parts, len, half };
}
const SPRITES = new Map();
function shipSprite(spec, S) {
  const key = spec.id + '@' + S;
  if (SPRITES.has(key)) return SPRITES.get(key);
  const { parts, len, half } = specParts(spec);
  let seed = 0; for (const ch of spec.id) seed = seed * 31 + ch.charCodeAt(0) | 0;
  const b = new Builder(len, half + .5, S, seed);
  for (const p of parts) { PART[p.k](b, p); p.comp = b.comp; }
  for (const p of parts) attach(b, p);
  let wide = null, deck = null;
  for (const p of parts) if (['hull', 'armor', 'crew', 'hangar', 'fuel', 'reactor'].includes(p.k)) { if (!wide || p.hw > wide.hw) wide = p; if (!p.top && !p.bot && (p.k === 'hull' || p.k === 'armor')) deck = deck || p; }
  let stripes = 0;
  for (const p of parts) if ((p.k === 'hull' || p.k === 'armor' || p.k === 'engines' || p.k === 'big' || p.k === 'crew' || p.k === 'reactor') && stripes < 2) {
    stripes++;
    const xs = p.x + p.L - 2.2;
    b.each(xs, -p.hw, xs + 1.1, p.hw, k => { if (PLATED[b.m[k]] && b.c[k] === p.comp) b.m[k] = M.accent; });
    b.each(xs + 1.3, -p.hw, xs + 1.3 + .34, p.hw, k => { if (PLATED[b.m[k]] && b.c[k] === p.comp) b.m[k] = M.white; });
  }
  const tp = [...parts].reverse().find(p => p.k === 'armor' || p.k === 'hull') || wide;
  if (tp && spec.code) b.text(spec.code, tp.x + .7, 1.5, tp.comp);
  if (wide) { b.light(wide.x + wide.L / 2, -wide.hw + .15, 3); b.light(wide.x + wide.L / 2, wide.hw - .2, 4); }
  b.light(len - .3, 0, 5); b.light(.2 + (parts[0].k === 'big' ? 7 : 3), 0, 5);
  b.finish();
  b.spec = spec; b.parts = parts;
  SPRITES.set(key, b);
  return b;
}
function turretSprite(type, S) {
  const key = 'T' + type + '@' + S;
  if (SPRITES.has(key)) return SPRITES.get(key);
  const pd = type === 'pd', b = new Builder(pd ? 4.4 : 8, pd ? 1.4 : 2.3, S, 3);
  b.comp = 1;
  if (pd) {
    b.cyl(1.3, 0, 1.1, 1.8, M.hull2); b.box(1.6, -.3, 4.2, .3, 1.4, M.engine, { b: .8 });
    b.each(3.9, -.3, 4.3, .3, k => { if (b.m[k]) b.e[k] = 11; });
  } else {
    b.cyl(2.2, 0, 1.9, 2.2, M.hull2, { b: 1.6 });
    b.box(1, -1.35, 3.9, 1.35, 3, M.armor, { b: 1.4 });
    b.box(1.5, -.7, 3, .7, 3.5, M.hull2, { b: 1 });
    for (const s of [-1, 1]) { b.tube(3.6, 7.6, s * .75, .36, 2.5, (x, y, i) => i % 4 === 0 ? M.dark : M.engine, { base: 1.4 }); b.each(7.2, s * .75 - .3, 7.7, s * .75 + .3, k => { if (b.m[k]) b.e[k] = 10; }); }
    b.each(1.2, -1.1, 1.2 + 1.2 / S, 1.1, (k, i, j) => { if (b.m[k] && j % 2) b.t[k] = -2; });
  }
  b.finish(b.pad + (pd ? 1.3 : 2.2) * S);
  b.muzzle = pd ? 3.1 : 5.6;
  SPRITES.set(key, b);
  return b;
}
function smallSprite(kind, S) {
  const key = 'C' + kind + '@' + S;
  if (SPRITES.has(key)) return SPRITES.get(key);
  let b;
  if (kind === 'fighter') {
    b = new Builder(4.6, 2.1, S, 9); b.comp = 1;
    b.shape(.4, -2, 3.4, 2, (x, y) => Math.abs(y) < 1.9 * (1 - (x - .4) / 3) ? .9 : 0, (x, y) => Math.abs(y) > 1.9 * (1 - (x - .4) / 3) - .45 ? M.accent : M.hull);
    b.tube(.3, 4.4, 0, .6, 1.7, x => x > 3 && x < 3.8 ? M.glass : M.hull2, { cap: true, base: .8 });
    b.each(.3, -.3, .8, .3, k => { if (b.m[k]) b.e[k] = 6; });
    b.nozzles.push({ x: .3 - 2.3, y: 0, r: .45 });
  } else {
    b = new Builder(3.6, 1.3, S, 11); b.comp = 1;
    b.box(.3, -1, 3.2, 1, 1.6, M.white, { b: 1 }); b.box(2.4, -.7, 3.3, .7, 1.9, M.glass, { b: .8 });
    b.each(.3, -.6, .7, .6, k => { if (b.m[k]) b.e[k] = 6; });
    b.each(1.2, -1, 1.6, 1, k => { if (b.m[k]) b.m[k] = M.accent; });
    b.nozzles.push({ x: .3 - 1.8, y: 0, r: .4 });
  }
  b.finish();
  SPRITES.set(key, b);
  return b;
}
function propSprite(kind, S) {
  const key = 'P' + kind + '@' + S;
  if (SPRITES.has(key)) return SPRITES.get(key);
  let b;
  if (kind === 'crate') {
    b = new Builder(2.6, 1.3, S, 4); b.comp = 1;
    b.box(.2, -1, 2.4, 1, 1.8, (x, y, i) => i % 4 === 0 ? M.dark : M.gold, { b: 1 });
    b.each(1, -.3, 1.6, .3, k => { if (b.m[k]) b.e[k] = 7; });
  } else if (kind === 'pylon') {
    b = new Builder(30, 10, S, 31);
    b.begin('dock', 'Gate pylon', { tons: 22000, htk: 40 });
    const p = { x: 0, L: 17, hw: 6.5, prev: 4, next: 3.5 };
    body(b, p, 5, M.armor, { side: .35 });
    b.box(2, -3.4, 14, 3.4, 6.4, M.hull2, { b: 2 }); b.plates(2, 14, 3.4); b.greebles(2, 14, 3.4, 60);
    b.dome(8, 0, 2.6, 9, (x, y) => Math.hypot(x - 8, y) < 1.1 ? M.glass : M.dark, { base: 6.4, e: (x, y) => Math.hypot(x - 8, y) < 1.1 ? 7 : 0 });
    for (const s of [-1, 1]) { b.box(3, s * 7.4 - 1.6, 9, s * 7.4 + 1.6, 1.4, (x, y, i) => i % 5 === 0 ? M.dark : M.radiator, { e: (x, y, i, j) => i % 5 && j % 3 === 1 ? 8 : 0 }); b.tube(15, 27, s * 4.2, 1, 4, (x, y, i) => i % 4 === 0 ? M.dark : M.engine, { base: 2 }); b.each(26.2, s * 4.2 - .7, 27, s * 4.2 + .7, k => { if (b.m[k]) b.e[k] = 10; }); }
    b.tube(16, 24, 0, 2.4, 5.4, (x, y, i) => i % 3 === 0 ? M.gold : M.white, { rf: x => 2.4 + (x - 16) * .22, rmax: 4.4, base: 2 });
    b.each(23.2, -3.6, 24.2, 3.6, k => { if (b.m[k]) b.e[k] = 7; });
    b.light(1, -5, 3); b.light(1, 4.8, 4);
  } else if (kind === 'tank') {
    b = new Builder(9, 3, S, 41); b.comp = 1;
    for (const s of [-1, 1]) b.box(.3, s * 2 - .75, 8, s * 2 + .75, 1.2, (x, y, i) => i % 2 ? M.dark : M.engine, { b: .6 });
    b.box(.8, -1.7, 7.6, 1.7, 1.9, M.armor, { b: 1 });
    b.cyl(3.6, 0, 1.6, 2.9, M.hull, { b: 1 });
    b.box(4.6, -.3, 8.8, .3, 2.4, M.engine, { b: .5 });
    b.each(1.2, -1.2, 1.8, 1.2, k => { if (b.m[k]) b.m[k] = M.accent; });
  } else if (kind === 'dropship') {
    b = new Builder(36, 13, S, 43);
    b.begin('hull', 'Dropship', {});
    b.slabF(2, 34, x => x < 24 ? 4.6 : 4.6 * (1 - Math.pow((x - 24) / 10, 1.6) * .75), 4.6, 4, M.hull, { bx: 2 });
    b.plates(2, 34, 4.6); b.greebles(2, 30, 4.6, 70);
    b.shape(8, -12.5, 22, 12.5, (x, y) => Math.abs(y) < 4 + 8.5 * (1 - Math.abs(x - 14) / 8) && Math.abs(y) > 3 ? 2.2 : 0, (x, y) => Math.abs(y) > 2.6 + 8.5 * (1 - Math.abs(x - 14) / 8) ? M.accent : M.armor);
    for (const sx of [9.5, 18.5]) for (const s of [-1, 1]) { b.cyl(sx, s * 8.2, 2.5, 3.6, M.engine, { b: 1.4 }); b.cyl(sx, s * 8.2, 1.5, 3, M.pit, { e: 6 }); }
    b.box(2.5, -3, 9, 3, 2.2, (x, y, i, j) => (i + j) % 4 < 2 && (Math.abs(y) > 2.4 || x < 3.2) ? M.hazard : M.deck, { b: .6 });
    b.box(24, -2.2, 29.5, 2.2, 5, M.glass, { b: 2.4, e: (x, y, i, j) => (i + j) % 3 === 0 ? 2 : 0 });
    b.box(12, -1.3, 22, 1.3, 5, M.hull2, { b: 1 });
    b.text('D-4', 12.4, 2, 1);
    b.light(14, -12, 3); b.light(14, 11.8, 4); b.light(33.5, 0, 5);
  } else if (kind === 'colony') {
    b = new Builder(170, 62, S, 47);
    b.begin('armor', 'Perimeter wall', {});
    b.shape(0, -62, 170, 62, (x, y) => { const d = Math.min(x - 2, 168 - x, 60 - Math.abs(y)); return d > 0 && d < 3 ? 2.6 : 0; }, (x, y, i, j) => (i + j) % 9 === 0 ? M.dark : M.armor);
    b.begin('dock', 'Landing pad', {});
    b.cyl(34, -30, 17, 1, (x, y, i, j) => { const r = Math.hypot(x - 34, y + 30); return r > 15 ? ((i + j) % 4 < 2 ? M.hazard : M.pit) : Math.abs(x - 34) < 1.2 && Math.abs(y + 30) < 7 || Math.abs(y + 30) < 1.2 && Math.abs(x - 34) < 5 ? M.white : M.deck; }, { b: .5 });
    for (let a = 0; a < 8; a++) b.light(34 + Math.cos(a * .785) * 13, -30 + Math.sin(a * .785) * 13, 9);
    b.begin('crew', 'Habitat dome', {});
    for (const [dx, dy, r] of [[86, -22, 22], [128, 14, 17], [52, 26, 14]]) {
      b.cyl(dx, dy, r + 1.5, 2, M.hull2, { b: 1 });
      b.dome(dx, dy, r, r * .7, (x, y, i, j) => (i % 7 === 0 || j % 7 === 0) ? M.white : M.teal, { base: 1.5, e: (x, y, i, j) => i % 7 === 3 && j % 7 === 3 && hash(i, j, 5) > .45 ? 1 : 0 });
    }
    b.begin('crew', 'Barracks', {});
    for (const [x0, y0, w, h] of [[20, 8, 22, 9], [20, 22, 22, 9], [78, 30, 26, 10], [110, -44, 30, 10], [140, -24, 12, 26]]) {
      b.box(x0, y0, x0 + w, y0 + h, 4, M.hull, { b: 1.4 });
      b.box(x0 + 2, y0 + 2, x0 + w - 2, y0 + h - 2, 5, (x, y, i) => i % 6 === 0 ? M.dark : M.hull2, { b: 1 });
      b.each(x0 + 1, y0 + .4, x0 + w - 1, y0 + .9, (k, i) => { if (b.m[k] && i % 3 === 0) b.e[k] = 1; });
    }
    b.begin('power', 'Reactor', {});
    b.cyl(146, 36, 9, 5, M.armor, { b: 2 }); b.dome(146, 36, 5.5, 9, (x, y) => Math.hypot(x - 146, y - 36) < 2 ? M.glass : M.dark, { base: 5, e: (x, y) => Math.hypot(x - 146, y - 36) < 2 ? 7 : 0 });
    for (const s of [-1, 1]) b.box(134, 36 + s * 12 - 2, 158, 36 + s * 12 + 2, 1.2, (x, y, i) => i % 5 === 0 ? M.dark : M.radiator, { e: (x, y, i, j) => i % 5 && j % 3 === 1 ? 8 : 0 });
    b.begin('hull', 'Transit tube', {});
    for (const [x0, y0, x1, y1] of [[51, -30, 66, -28], [86, 0, 88, 30], [100, -8, 128, -6], [128, -4, 130, 0], [42, 12, 52, 14], [66, 26, 78, 34]]) b.box(x0, y0, x1, y1, 1.6, M.truss, { b: .6 });
    b.begin('sensor', 'Comm tower', {});
    b.cyl(66, -48, 3.4, 3, M.engine); b.cyl(66, -48, 1.4, 9, M.white); b.light(66, -48, 3);
    b.shape(60, -54, 72, -42, (x, y) => { const d = ((x - 66) ** 2 + (y + 48) ** 2) / 36; return d < 1 && d > .12 ? 3 + d * 2.4 : 0; }, M.white);
  } else if (kind === 'bunker') {
    b = new Builder(10, 5, S, 49); b.comp = 1;
    b.cyl(5, 0, 4.6, 2.4, (x, y, i, j) => (i + j) % 7 === 0 ? M.dark : M.armor, { b: 2 });
    b.cyl(5, 0, 2.6, 3.2, M.dark, { b: 1 });
  }
  b.finish(kind === 'pylon' ? b.pad : undefined);
  SPRITES.set(key, b);
  return b;
}
function stationSprite(S, ring) {
  const key = 'S' + (ring ? 'r' : 'c') + '@' + S;
  if (SPRITES.has(key)) return SPRITES.get(key);
  const R = 46, b = new Builder(R * 2, R, S, 23), cx = R, TAU = 6.2832;
  if (ring) {
    b.begin('crew', 'Habitat ring', { tons: 48000, htk: 60, crew: 12000 });
    b.shape(0, -R, 2 * R, R, (x, y) => { const r = Math.hypot(x - cx, y), t = (r - 30) / 3; return Math.abs(t) < 1 ? 3 + 3.4 * Math.sqrt(1 - t * t) : 0; }, (x, y) => { const a = Math.atan2(y, x - cx); return Math.floor((a + 7) * 12 / TAU * 4) % 4 === 0 ? M.dark : M.hull2; }, { e: (x, y, i, j) => { const r = Math.hypot(x - cx, y), a = Math.atan2(y, x - cx); return Math.abs(Math.abs(r - 30) - 1.5) < .5 / S + .06 && Math.floor((a + 7) * 150) % 3 === 0 && hash(i, j, 4) > .3 ? 1 : 0; } });
    for (let s = 0; s < 6; s++) {
      const a = s * TAU / 6 + .26, c = Math.cos(a), sn = Math.sin(a);
      b.shape(0, -R, 2 * R, R, (x, y) => { const u = (x - cx) * c + y * sn, v = -(x - cx) * sn + y * c; return u > 9 && u < 28 && Math.abs(v) < .7 ? 2.6 : 0; }, (x, y, i, j) => (i + j) % 3 ? M.truss : M.white);
    }
  } else {
    b.begin('dock', 'Station core', { tons: 90000, htk: 120 });
    b.shape(0, -R, 2 * R, R, (x, y) => Math.abs(y) < 1.6 && Math.abs(x - cx) < 44 ? 2.4 : Math.abs(x - cx) < 1.6 && Math.abs(y) < 44 ? 2.4 : 0, (x, y, i, j) => (i + j) % 4 === 0 || (i - j + 800) % 4 === 0 ? M.truss : M.engine);
    b.cyl(cx, 0, 11, 6, M.armor, { b: 3 });
    b.plates(cx - 11, cx + 11, 11);
    b.cyl(cx, 0, 7.5, 8, M.hull, { b: 2 });
    b.plates(cx - 7.5, cx + 7.5, 7.5); b.greebles(cx - 7, cx + 7, 7, 60);
    b.dome(cx, 0, 4, 12, (x, y) => Math.hypot(x - cx, y) < 1.4 ? M.glass : M.hull2, { base: 8, e: (x, y) => Math.hypot(x - cx, y) < 1.4 ? 7 : 0 });
    for (let k = 0; k < 16; k++) { const a = k * TAU / 16; b.light(cx + Math.cos(a) * 9.4, Math.sin(a) * 9.4, k % 2 ? 1 : 2); }
    b.begin('power', 'Solar farm', { tons: 4000, htk: 8, power: 900 });
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (let q = 0; q < 2; q++) {
      const xa = cx + sx * (3 + q * 7.4) - (sx < 0 ? 6.6 : 0), ya = sy > 0 ? 33 : -44.5;
      b.shape(xa, ya, xa + 6.6, ya + 11.5, () => 1.2, (x, y, i, j) => (i % 5 === 0 || j % 5 === 0) ? M.white : M.solar);
      b.each(xa, ya, xa + 6.6, ya + 11.5, (k, i, j) => { if (b.m[k] === M.solar) b.t[k] = hash(Math.floor(i / 5), Math.floor(j / 5), 3 + q) > .6 ? 1 : (i + j) % 2 ? 0 : -1; });
    }
    b.begin('power', 'Radiators', { tons: 900, htk: 4 });
    for (const sy of [-1, 1]) for (const sx of [-1, 1]) b.shape(cx + sx * 4 - (sx < 0 ? 9 : 0), sy * 20 - 1.6, cx + sx * 4 + (sx < 0 ? 0 : 9), sy * 20 + 1.6, () => 1.5, (x, y, i) => i % 5 === 0 ? M.dark : M.radiator, { e: (x, y, i, j) => i % 5 && j % 3 === 1 ? 8 : 0 });
    b.begin('dock', 'Docking arm', { tons: 2500, htk: 10 });
    for (const sx of [-1, 1]) {
      const xe = cx + sx * 43;
      b.box(Math.min(xe - sx * 6, xe + sx * 2.5), -3, Math.max(xe - sx * 6, xe + sx * 2.5), 3, 4, M.hull2, { b: 1.6 });
      b.cyl(xe, 0, 2.2, 4.8, (x, y, i, j) => Math.hypot(x - xe, y) < 1.2 ? M.pit : (i + j) % 4 < 2 ? M.hazard : M.dark);
      b.light(xe, -2.6, 4); b.light(xe, 2.5, 4);
    }
    b.begin('sensor', 'Traffic control array', { tons: 700, htk: 3, range: '4 AU' });
    for (const [dx, dy] of [[-17, -8], [17, 8]]) {
      b.cyl(cx + dx, dy, 1, 3.6, M.engine);
      b.shape(cx + dx - 3, dy - 3, cx + dx + 3, dy + 3, (x, y) => { const d = ((x - cx - dx) ** 2 + (y - dy) ** 2) / 9; return d < 1 ? 3 + d * 2 : 0; }, (x, y) => Math.hypot(x - cx - dx, y - dy) < .6 ? M.gold : M.white);
    }
  }
  b.finish();
  SPRITES.set(key, b);
  return b;
}

const LXY = Math.hypot(LD[0], LD[1]), TE = LD[2] / LXY, SHSTEP = [1.5, 3, 5, 8, 12];
const EM = [null, [255, 214, 120], [110, 220, 230], [255, 70, 60], [90, 240, 120], [255, 255, 255], null, [120, 240, 255], [255, 120, 60], [255, 240, 200], [150, 250, 255], [255, 230, 160]];
let FRAME = 0;
function drawSprite(f, sp, X, Y, ang, pal, o = {}) {
  const c = Math.cos(ang), s = Math.sin(ang), w = sp.w, h = sp.h, pvx = sp.pvx, pvy = sp.pvy, sk = o.k || 1, ik = 1 / sk, R = sp.rad * sk + 1;
  const x0 = Math.max(0, Math.floor(X - R)), x1 = Math.min(f.w - 1, Math.ceil(X + R), o.maxX ?? 1e9), y0 = Math.max(0, Math.floor(Y - R)), y1 = Math.min(f.h - 1, Math.ceil(Y + R));
  const own = o.own, pal2 = o.pal2, ghost = o.ghost, cut = o.cut || 0;
  if (x0 > x1 || y0 > y1) return;
  const D = f.d, FW = f.w, Mm = sp.m, Zz = sp.z, Ee = sp.e, Tt = sp.t, Cc = sp.c, NX = sp.nx, NY = sp.ny, NZ = sp.nz;
  const lsx = (c * LD[0] + s * LD[1]) / LXY, lsy = (-s * LD[0] + c * LD[1]) / LXY;
  const lx = (c * LD[0] + s * LD[1]) / 127, ly = (-s * LD[0] + c * LD[1]) / 127, lz = LD[2] / 127;
  const dm = o.dm, hi = o.hi || 0, sys = o.sys ? sp.comps : null, thr = o.thr ?? 1, dead = o.dead, build = o.build, tick = FRAME >> 1;
  const bx = build != null ? build * w : 1e9, shadow = sp.S >= 1.5;
  for (let sy = y0; sy <= y1; sy++) {
    const dy = sy + .5 - Y;
    let lo = x0 - X, hi = x1 + 1 - X;
    if (Math.abs(c) > 1e-6) { const a = (-s * dy - pvx * sk) / c, b = ((w - pvx) * sk - s * dy) / c; lo = Math.max(lo, Math.min(a, b)); hi = Math.min(hi, Math.max(a, b)); } else if (s * dy * ik + pvx < 0 || s * dy * ik + pvx >= w) continue;
    if (Math.abs(s) > 1e-6) { const a = (c * dy + pvy * sk) / s, b = (c * dy - (h - pvy) * sk) / s; lo = Math.max(lo, Math.min(a, b)); hi = Math.min(hi, Math.max(a, b)); } else if (c * dy * ik + pvy < 0 || c * dy * ik + pvy >= h) continue;
    const xa = Math.max(x0, Math.floor(lo + X - .5)), xb = Math.min(x1, Math.ceil(hi + X - .5));
    for (let sx = xa; sx <= xb; sx++) {
      const dx = sx + .5 - X, u = (c * dx + s * dy) * ik + pvx, v = (-s * dx + c * dy) * ik + pvy;
      if (u < 0 || v < 0 || u >= w || v >= h) continue;
      const ui = u | 0, vi = v | 0, i = vi * w + ui;
      let m = Mm[i];
      if (!m) continue;
      if (cut) { const q = ui + JAG[vi & 15] * (sp.S > 2 ? 2 : 1); if (cut > 0 ? q > cut : q < -cut) continue; }
      const k = (sy * FW + sx) * 4;
      if (ghost) { if (hash(ui, vi, FRAME >> 2) > ghost) continue; const q = (m * NL + 2) * 3; D[k] = pal[q] * .4 + 16; D[k + 1] = pal[q + 1] * .4 + 26; D[k + 2] = pal[q + 2] * .4 + 52; continue; }
      if (ui > bx) {
        if (ui > bx + w * .16 || !((ui % 5 === 0) || (vi % 5 === 0))) continue;
        D[k] = 70; D[k + 1] = 74; D[k + 2] = 100;
        if (ui < bx + 3 && hash(ui, vi, FRAME >> 1) > .93) { D[k] = 200; D[k + 1] = 240; D[k + 2] = 255; }
        continue;
      }
      const dd = dm ? dm[i] : 0;
      let e = Ee[i];
      const ow = own ? own[Cc[i]] : 0;
      if (ow === 1 && hash(ui, vi, FRAME >> 1) > .985) { D[k] = 255; D[k + 1] = 236; D[k + 2] = 170; continue; }
      if (e && !dead && dd < 120) {
        let col = EM[e], on = true;
        if (e === 3 || e === 4) on = ((FRAME >> 4) & 3) === 0;
        else if (e === 5) on = (FRAME + (ui & 31)) % 48 < 3;
        else if (e === 6) { const fl = hash(ui, vi, tick); col = thr < .05 ? [60, 40, 50] : fl * thr > .55 ? [255, 250, 230] : fl * thr > .2 ? [255, 200, 110] : [240, 120, 60]; }
        else if (e === 7) col = (FRAME >> 3) % 4 === (ui + vi) % 4 ? [230, 255, 255] : [110, 220, 235];
        else if (e === 8) col = hash(ui, vi, 5) > .5 ? [255, 130, 70] : [226, 96, 56];
        else if (e === 1) on = hash(ui, vi, FRAME >> 7) > .08;
        else if (e === 9) on = ((FRAME >> 2) + ui) % 8 < 5;
        else if (e === 10) on = o.charge ? true : ((FRAME >> 3) & 1) === 0;
        if (on) { D[k] = col[0]; D[k + 1] = col[1]; D[k + 2] = col[2]; continue; }
      }
      let L = NX[i] * lx + NY[i] * ly + NZ[i] * lz;
      let lv = 3.6 + (L - LD[2]) * 6 + Tt[i] * .7;
      if (shadow) {
        const zz = Zz[i];
        for (let q = 0; q < 5; q++) {
          const d = SHSTEP[q], uu = (u + lsx * d) | 0, vv = (v + lsy * d) | 0;
          if (uu < 0 || vv < 0 || uu >= w || vv >= h) break;
          if (Zz[vv * w + uu] > zz + d * TE + .8) { lv -= 1.7; break; }
        }
      }
      if (lv < 1) lv = 1;
      if (dd) {
        lv -= dd * .012;
        if (dd > 110) { m = M.char; lv += 1.2; }
        if (dd > 205 && hash(ui, vi, FRAME >> 3) > .9) { const hot = hash(ui, vi, 3) > .5; D[k] = 255; D[k + 1] = hot ? 190 : 110; D[k + 2] = hot ? 90 : 50; continue; }
      }
      if (hi && Cc[i] === hi) lv += ((FRAME >> 3) & 1) ? 1.3 : .7;
      let l = (lv + (dith(sx, sy) - .5) * .5) | 0;
      if (l < 0) l = 0; else if (l > 5) l = 5;
      if (sys) { const q = (sys[Cc[i]].sys * NL + l) * 3; D[k] = SYSPAL[q]; D[k + 1] = SYSPAL[q + 1]; D[k + 2] = SYSPAL[q + 2]; }
      else { const P = ow === 2 || (ow === 1 && ((FRAME >> 3) + Cc[i]) & 1) ? pal2 : pal, q = (m * NL + l) * 3; D[k] = P[q]; D[k + 1] = P[q + 1]; D[k + 2] = P[q + 2]; }
    }
  }
}
function pickSprite(sp, X, Y, ang, sx, sy, k = 1) {
  const c = Math.cos(ang), s = Math.sin(ang), dx = sx + .5 - X, dy = sy + .5 - Y;
  const u = Math.floor((c * dx + s * dy) / k + sp.pvx), v = Math.floor((-s * dx + c * dy) / k + sp.pvy);
  if (u < 0 || v < 0 || u >= sp.w || v >= sp.h) return null;
  const i = v * sp.w + u;
  return sp.m[i] ? { comp: sp.c[i], u, v, xu: (u - sp.pvx) / sp.S, yu: (v - sp.pvy) / sp.S } : null;
}
function dropShadow(f, X, Y, r) {
  const D = f.d, ox = -LD[0] / LXY * r * .5, oy = -LD[1] / LXY * r * .5;
  for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
    if (i * i + j * j > r * r) continue;
    const x = Math.round(X + ox + i), y = Math.round(Y + oy + j);
    if (x < 0 || y < 0 || x >= f.w || y >= f.h) continue;
    const k = (y * f.w + x) * 4;
    D[k] = D[k] * .55; D[k + 1] = D[k + 1] * .55; D[k + 2] = D[k + 2] * .62;
  }
}
const PLC = [[[255, 250, 224], [255, 214, 120], [240, 130, 60], [150, 62, 60]], [[235, 250, 255], [130, 220, 255], [70, 140, 240], [50, 70, 170]]];
function plume(f, X, Y, ang, r, len, hot) {
  if (len < 1) return;
  const c = Math.cos(ang), s = Math.sin(ang), ex = -c * len, ey = -s * len, px = Math.abs(s) * r, py = Math.abs(c) * r;
  const y0 = Math.max(0, Math.floor(Y + Math.min(0, ey) - py)), y1 = Math.min(f.h - 1, Math.ceil(Y + Math.max(0, ey) + py));
  const X0 = Math.max(0, Math.floor(X + Math.min(0, ex) - px)), X1 = Math.min(f.w - 1, Math.ceil(X + Math.max(0, ex) + px));
  const D = f.d, cols = PLC[hot ? 1 : 0], wob = FRAME * .9, fr = FRAME * 5;
  for (let sy = y0; sy <= y1; sy++) {
    const dy = sy + .5 - Y;
    let lo = X0 - X, hi = X1 + 1 - X;
    if (Math.abs(c) > 1e-6) { const a = (-s * dy) / c, b = (-len - s * dy) / c; lo = Math.max(lo, Math.min(a, b)); hi = Math.min(hi, Math.max(a, b)); }
    if (Math.abs(s) > 1e-6) { const a = (c * dy - r) / s, b = (c * dy + r) / s; lo = Math.max(lo, Math.min(a, b)); hi = Math.min(hi, Math.max(a, b)); }
    const xa = Math.max(X0, Math.floor(lo + X - .5)), xb = Math.min(X1, Math.ceil(hi + X - .5));
    for (let sx = xa; sx <= xb; sx++) {
      const dx = sx + .5 - X, d = -(c * dx + s * dy), wv = Math.abs(-s * dx + c * dy);
      if (d < 0 || d > len) continue;
      const t = d / len, hw = r * (1 - t * .35) * (.85 + .15 * Math.sin(d * 1.3 - wob));
      if (wv > hw) continue;
      const q = t + wv / hw * .45 + (dith(sx, sy) - .5) * .5 + (((sx * 7 + sy * 13 + fr) & 15) - 8) * .016;
      if (q > .98) continue;
      const col = cols[q < .22 ? 0 : q < .45 ? 1 : q < .7 ? 2 : 3], k = (sy * f.w + sx) * 4;
      D[k] = col[0]; D[k + 1] = col[1]; D[k + 2] = col[2];
    }
  }
}
function thick(f, x0, y0, x1, y1, wd, c0, c1) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)), dx = (x1 - x0) / (n || 1), dy = (y1 - y0) / (n || 1), lo = -Math.floor((wd - 1) / 2), hi = Math.ceil((wd - 1) / 2), ax = Math.abs(dx) > Math.abs(dy);
  for (let i = 0; i <= n; i++) {
    const x = x0 + dx * i, y = y0 + dy * i;
    if (x < -4 || y < -4 || x > f.w + 4 || y > f.h + 4) continue;
    for (let a = lo; a <= hi; a++) { const core = wd < 3 ? a === 0 : a > lo && a < hi; if (ax) f.px(x, y + a, core ? c0 : c1); else f.px(x + a, y, core ? c0 : c1); }
  }
}
function damageMap(sp, hits, dm = new Uint8Array(sp.w * sp.h), from = 0) {
  const S = sp.S;
  for (let q = from; q < hits.length; q++) {
    const [xu, yu, r, sev] = hits[q];
    const X = sp.pvx + xu * S, Y = sp.pvy + yu * S, R = r * S + 1;
    for (let j = Math.max(0, Math.floor(Y - R)); j <= Math.min(sp.h - 1, Y + R); j++) for (let i = Math.max(0, Math.floor(X - R)); i <= Math.min(sp.w - 1, X + R); i++) {
      const d = Math.hypot(i + .5 - X, j + .5 - Y) / R;
      if (d > 1) continue;
      const v = (1 - d * d) * sev * (.7 + hash(i, j, 7) * .6), k = j * sp.w + i;
      if (v > dm[k]) dm[k] = Math.min(255, v);
    }
  }
  return dm;
}
function hullPoint(sp, xu, yu) {
  for (let q = 0; q < 6; q++) {
    const u = Math.floor(sp.pvx + xu * sp.S), v = Math.floor(sp.pvy + yu * sp.S);
    if (u >= 0 && v >= 0 && u < sp.w && v < sp.h && sp.m[v * sp.w + u]) return [xu, yu];
    yu *= .6; xu *= .85;
  }
  return [0, 0];
}

class Craft {
  constructor(spec, pal, o = {}) {
    Object.assign(this, { spec, pal, x: 0, y: 0, a: 0, thr: 1, hits: [], dmv: 0, dms: new Map(), name: '', ...o });
    const sp = shipSprite(spec, 3);
    this.len = sp.len; this.half = sp.half;
    this.tur = sp.mounts.map(m => ({ m, a: m.face, cd: Math.random() * 2, fire: 0 }));
  }
  hit(xu, yu, r, sev) { this.hits.push([xu, yu, r, sev]); this.dmv++; }
  dm(sp) {
    if (!this.hits.length) return null;
    let c = this.dms.get(sp.S);
    if (!c) this.dms.set(sp.S, c = { n: 0, d: new Uint8Array(sp.w * sp.h) });
    if (c.n < this.hits.length) { damageMap(sp, this.hits, c.d, c.n); c.n = this.hits.length; }
    return c.d;
  }
  toScreen(xu, yu, X, Y, S) { const c = Math.cos(this.a), s = Math.sin(this.a); return [X + (c * xu - s * yu) * S, Y + (s * xu + c * yu) * S]; }
  draw(f, X, Y, S, o = {}) {
    const lod = lodFor(S), sp = shipSprite(this.spec, lod), k = S / lod, R = sp.rad * k + 40 * S;
    this.lod = lod; this.k = k;
    if (X < -R || Y < -R || X > f.w + R || Y > f.h + R) return sp;
    if (!this.dead && this.thr > .02 && o.build == null && !o.ghost && !o.cut) for (const n of sp.nozzles) {
      const [nx, ny] = this.toScreen(n.x + .4, n.y, X, Y, S);
      plume(f, nx, ny, this.a, n.r * S, n.r * S * (2.5 + this.thr * (n.r > 2 ? 4.5 : 6)) * (.9 + .1 * Math.sin(FRAME * .7)), this.hot);
    }
    if (o.cutU) o = { ...o, cut: (o.cutU[1] > 0 ? 1 : -1) * (sp.pvx + o.cutU[0] * lod) };
    drawSprite(f, sp, X, Y, this.a, this.pal, { k, dm: this.dm(sp), thr: this.thr, dead: this.dead, hi: o.hi, sys: o.sys, build: o.build, own: o.own, pal2: o.pal2, ghost: o.ghost, cut: o.cut, maxX: o.maxX });
    if ((o.build == null || o.build >= 1) && S >= .7) for (const t of this.tur) {
      if (o.cut) { const q = sp.pvx + t.m.x * lod; if (o.cut > 0 ? q > o.cut - 8 : q < -o.cut + 8) continue; }
      const ts = turretSprite(t.m.type, lod), [tx, ty] = this.toScreen(t.m.x, t.m.y, X, Y, S), ow = o.own ? o.own[t.m.comp] : 0;
      if (S >= 3 && !o.ghost) dropShadow(f, tx, ty, Math.round(S * 1.1));
      drawSprite(f, ts, tx, ty, this.a + t.a, ow === 2 ? o.pal2 : this.pal, { k, dead: this.dead, charge: t.fire > 0, hi: o.hi === t.m.comp ? 1 : 0, sys: o.sys ? [null, { sys: SYSID.indexOf('weapon') }] : null, ghost: o.ghost, maxX: o.maxX });
    }
    return sp;
  }
}
