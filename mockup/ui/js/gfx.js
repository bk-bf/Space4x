'use strict';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const dith = (x, y) => (B4[((y & 3) << 2) | (x & 3)] + .5) / 16;
function hash(x, y, z) {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
const mix = (a, b, t) => a + (b - a) * t;
function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  let xf = x - xi, yf = y - yi, zf = z - zi;
  xf = xf * xf * (3 - 2 * xf); yf = yf * yf * (3 - 2 * yf); zf = zf * zf * (3 - 2 * zf);
  return mix(
    mix(mix(hash(xi, yi, zi), hash(xi + 1, yi, zi), xf), mix(hash(xi, yi + 1, zi), hash(xi + 1, yi + 1, zi), xf), yf),
    mix(mix(hash(xi, yi, zi + 1), hash(xi + 1, yi, zi + 1), xf), mix(hash(xi, yi + 1, zi + 1), hash(xi + 1, yi + 1, zi + 1), xf), yf),
    zf);
}
function fbm(x, y, z, o) {
  let a = .5, f = 1, s = 0, n = 0;
  for (let i = 0; i < o; i++) { s += a * noise3(x * f, y * f, z * f); n += a; a *= .5; f *= 2; }
  return s / n;
}


const PAL = {
  bg: [20, 17, 42], neb: [[30, 24, 62], [42, 31, 80]], star: [[74, 70, 118], [140, 138, 184], [232, 230, 250]],
  orbit: [58, 54, 104], belt: [[96, 90, 120], [134, 126, 146]], course: [190, 138, 72], sensor: [52, 128, 128],
  sel: [242, 179, 93], hot: [239, 111, 94], jump: [95, 208, 197], grid: [44, 39, 86], vig: [8, 6, 22],
};

class FB {
  constructor(cv, w, h, scale, vs = .62) {
    Object.assign(this, { cv, w, h, scale });
    cv.width = w; cv.height = h;
    cv.style.width = w * scale + 'px'; cv.style.height = h * scale + 'px';
    this.ctx = cv.getContext('2d');
    this.img = this.ctx.createImageData(w, h);
    this.d = new Uint8ClampedArray(w * h * 4);
    this.vig = new Uint8Array(w * h);
    const cx = (w - 1) / 2, cy = (h - 1) / 2;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let v = clamp((Math.hypot((x - cx) / cx, (y - cy) / cy) - vs) / (1.42 - vs), 0, 1);
      v = v * v * (3 - 2 * v);
      this.vig[y * w + x] = Math.min(4, Math.floor(v * 4 + dith(x, y)));
    }
  }
  px(x, y, c) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4, d = this.d;
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2];
  }
  fill(c) { const d = this.d; for (let i = 0; i < d.length; i += 4) { d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; } }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c); }
  line(x0, y0, x1, y1, c, gap = 1, ph = 0) {
    const n = Math.round(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)));
    for (let i = 0; i <= n; i++) {
      if ((i + ph) % gap) continue;
      const k = n ? i / n : 0;
      this.px(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, c);
    }
  }
  ring(cx, cy, r, c, gap = 2, ph = 0) {
    const n = Math.max(8, Math.round(6.283 * r));
    for (let i = 0; i < n; i++) {
      if ((i + ph) % gap) continue;
      const a = i / n * 6.283;
      this.px(cx + Math.cos(a) * r, cy + Math.sin(a) * r, c);
    }
  }
  sprite(rows, x, y, pal, flip) {
    for (let j = 0; j < rows.length; j++) {
      const r = rows[j], w = r.length;
      for (let i = 0; i < w; i++) { const c = pal[r[flip ? w - 1 - i : i]]; if (c) this.px(x + i, y + j, c); }
    }
  }
  present() {
    const o = this.img.data, d = this.d, v = this.vig, vc = PAL.vig;
    for (let i = 0, j = 0; i < v.length; i++, j += 4) {
      let r = d[j], g = d[j + 1], b = d[j + 2];
      const f = v[i] * .21;
      if (f) { r += (vc[0] - r) * f; g += (vc[1] - g) * f; b += (vc[2] - b) * f; }
      o[j] = r; o[j + 1] = g; o[j + 2] = b; o[j + 3] = 255;
    }
    this.ctx.putImageData(this.img, 0, 0);
  }
  makeBg(kind) {
    const { w, h } = this;
    this.fill(PAL.bg);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (kind === 'grid') { if (x % 8 === 0 && y % 8 === 0) this.px(x, y, PAL.grid); continue; }
      if (kind !== 'space') continue;
      const n = fbm(x * .011 + 3, y * .011 + 7, 1.5, 4), t = (dith(x, y) - .5) * .1;
      if (n > .6 + t) this.px(x, y, PAL.neb[0]);
      if (n > .69 + t) this.px(x, y, PAL.neb[1]);
    }
    if (kind !== 'grid') {
      const n = Math.round(w * h / 240);
      for (let i = 0; i < n; i++) {
        const b = hash(i, 4, w);
        this.px(hash(i, 1, w) * w, hash(i, 2, w) * h, PAL.star[b < .62 ? 0 : b < .92 ? 1 : 2]);
      }
    }
    this.bg = this.d.slice();
    return this;
  }
  start() { this.d.set(this.bg); }
}

const LD = (() => { const v = [-.55, -.45, .7], l = Math.hypot(...v); return v.map(a => a / l); })();
const SH = [.2, .5, .76, 1];
const GAS = [[196, 160, 118], [226, 198, 158], [164, 112, 76], [238, 222, 192], [142, 92, 66]];
const SAT = [[214, 190, 136], [234, 214, 166], [190, 164, 112]];
let isLand = false;
function planetColor(type, x, y, z, o) {
  isLand = false;
  if (type === 'terran') {
    const h = fbm(x * 1.9 + 5, y * 1.9, z * 1.9, o), cl = fbm(x * 2.6 + 40, y * 4 + 9, z * 2.6, o);
    if (cl > .63) return [240, 244, 248];
    if (Math.abs(y) > .9 - (h - .5) * .5) return [226, 236, 240];
    if (h < .47) return [22, 48, 110];
    if (h < .52) return [36, 84, 150];
    if (h < .545) return [58, 128, 170];
    isLand = true;
    return h < .62 ? [70, 128, 70] : h < .69 ? [150, 132, 84] : [124, 112, 102];
  }
  if (type === 'mars') {
    const h = fbm(x * 2.2 + 11, y * 2.2, z * 2.2, o), e = fbm(x * 5 + 2, y * 5, z * 5, 3);
    const cap = (y < 0 ? .9 : .955) - (e - .5) * .5, a = Math.abs(y);
    if (a > cap) return [232, 216, 204];
    if (a > cap - .04) return [206, 156, 122];
    isLand = true;
    return h < .42 ? [112, 52, 36] : h < .52 ? [156, 78, 44] : h < .62 ? [190, 108, 62] : [214, 148, 96];
  }
  if (type === 'venus') {
    const h = fbm(x * 1.4 + 3, y * 3.4 + x * .8, z * 1.4, o);
    return h < .42 ? [168, 130, 64] : h < .52 ? [204, 166, 88] : h < .62 ? [232, 204, 132] : [244, 228, 176];
  }
  if (type === 'gas') {
    const sx = x - .45, sy = y - .28;
    if (z > 0 && sx * sx * .5 + sy * sy * 2.2 < .012) return [190, 84, 60];
    const w = fbm(x * 2.4, y * 2.4 + 20, z * 2.4, o);
    return GAS[Math.floor(y * 5.2 + (w - .5) * 1.6 + 20) % 5];
  }
  if (type === 'saturn') {
    const w = fbm(x * 2 + 7, y * 2, z * 2, o);
    return SAT[Math.floor(y * 4.4 + (w - .5) * 1.1 + 20) % 3];
  }
  const h = fbm(x * 2.6 + 17, y * 2.6, z * 2.6, o);
  if (noise3(x * 6 + 3, y * 6, z * 6) > .72) return [70, 68, 76];
  return h < .45 ? [96, 94, 100] : h < .58 ? [128, 124, 128] : [164, 160, 160];
}
function ringArc(fb, cx, cy, R, front) {
  for (const [k, c] of [[1.45, [150, 130, 96]], [1.6, [214, 190, 136]], [1.75, [190, 164, 112]], [1.92, [120, 104, 84]]]) {
    const rx = R * k, ry = rx * .3, n = Math.round(rx * 8);
    for (let i = 0; i < n; i++) {
      const a = i / n * 6.283, s = Math.sin(a);
      if ((s >= 0) === front) fb.px(cx + Math.cos(a) * rx, cy + s * ry, c);
    }
  }
}
function planet(fb, cx, cy, R, type, rot, o = {}) {
  const cr = Math.cos(rot), sr = Math.sin(rot), tl = o.tilt || 0, ct = Math.cos(tl), st = Math.sin(tl), oct = R > 20 ? 4 : 3;
  if (o.rings) ringArc(fb, cx, cy, R, false);
  for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) {
    if (i * i + j * j > R * R + R * .8) continue;
    const nx = i / (R + .5), ny = j / (R + .5), nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    const tx = nx * ct + ny * st, ty = ny * ct - nx * st;
    const px = tx * cr + nz * sr, pz = nz * cr - tx * sr;
    const c = planetColor(type, px, ty, pz, oct);
    const l = nx * LD[0] + ny * LD[1] + nz * LD[2];
    const s = clamp(Math.floor((l * 1.15 + .12) * 3 + dith(cx + i, cy + j)), 0, 3), k = SH[s];
    if (s === 0 && o.lights && isLand && hash(px * 34, ty * 34, pz * 34) > .94) fb.px(cx + i, cy + j, [255, 214, 120]);
    else fb.px(cx + i, cy + j, s ? [c[0] * k, c[1] * k, c[2] * k] : [c[0] * k + 3, c[1] * k + 4, c[2] * k + 12]);
  }
  if (o.rings) ringArc(fb, cx, cy, R, true);
}
function sun(fb, cx, cy, R, t) {
  const E = R + 8;
  for (let j = -E; j <= E; j++) for (let i = -E; i <= E; i++) {
    const d = Math.hypot(i, j), th = dith(cx + i, cy + j);
    if (d <= R + .3) {
      const v = d / R;
      fb.px(cx + i, cy + j, v + th * .35 < .55 ? [255, 250, 224] : v + th * .3 < .92 ? [255, 216, 112] : [246, 156, 60]);
    } else if (d < E) {
      const s = (1 - (d - R) / 8) * .9 + (noise3(i * .35, j * .35, t * .15) - .5) * .7;
      if (s > th + .25) fb.px(cx + i, cy + j, s > th + .6 ? [230, 120, 50] : [150, 62, 44]);
    }
  }
}

const C = {
  o: [14, 14, 26], H: [182, 192, 210], h: [126, 136, 162], d: [72, 80, 108], w: [110, 220, 230], r: [214, 84, 74],
  y: [238, 186, 84], c: [168, 100, 62], C: [70, 144, 144], e: [40, 40, 58],
};
const ARM = { ...C, H: [158, 162, 178], h: [102, 108, 132], d: [58, 62, 88] };
const F1 = [255, 244, 200], F2 = [255, 190, 90], F3 = [230, 110, 60];
function sec(fb, x, w, cy, a = 3, b = 3, K = C) {
  for (let i = 0; i < w; i++) {
    fb.px(x + i, cy - a, K.o); fb.px(x + i, cy + b, K.o);
    fb.px(x + i, cy - a + 1, K.H); fb.px(x + i, cy + b - 1, K.d);
    for (let y = cy - a + 2; y < cy + b - 1; y++) fb.px(x + i, y, K.h);
  }
  for (let y = cy - a + 1; y < cy + b; y++) fb.px(x, y, K.d);
}
function column(fb, x, cy, a, b, K) {
  for (let y = cy - a + 2; y < cy + b - 1; y++) fb.px(x, y, K.h);
  fb.px(x, cy - a + 1, K.H); fb.px(x, cy + b - 1, K.d); fb.px(x, cy - a, K.o); fb.px(x, cy + b, K.o);
}
const CORE = {
  hull(fb, x, cy) { sec(fb, x, 8, cy); return [8, 3]; },
  crew(fb, x, cy, t) {
    sec(fb, x, 8, cy);
    for (const i of [2, 4, 6]) fb.px(x + i, cy - 1, hash(i, x, Math.floor(t / 30)) > .3 ? C.y : C.w);
    fb.px(x + 3, cy + 1, C.w); fb.px(x + 5, cy + 1, C.w);
    return [8, 3];
  },
  reactor(fb, x, cy, t) {
    sec(fb, x, 6, cy);
    fb.rect(x + 2, cy - 1, 2, 3, (t >> 2) & 1 ? C.w : [70, 170, 190]);
    return [6, 3];
  },
  fuel(fb, x, cy) {
    sec(fb, x, 8, cy);
    for (let i = 1; i < 7; i++) { fb.px(x + i, cy - 4, C.o); fb.px(x + i, cy - 3, C.H); fb.px(x + i, cy + 4, C.o); fb.px(x + i, cy + 3, C.d); }
    for (let y = cy - 3; y <= cy + 3; y++) fb.px(x + 3, y, C.y);
    return [8, 4, true];
  },
  armor(fb, x, cy) {
    sec(fb, x, 8, cy, 5, 5, ARM);
    for (let y = cy - 3; y <= cy + 3; y++) fb.px(x + 4, y, ARM.d);
    for (let i = 1; i < 8; i++) fb.px(x + i, cy, ARM.d);
    fb.px(x + 2, cy - 3, ARM.H); fb.px(x + 6, cy + 2, ARM.H);
    return [8, 5];
  },
  truss(fb, x, cy) {
    for (let i = 0; i < 8; i++) { fb.px(x + i, cy - 2, C.h); fb.px(x + i, cy + 2, C.d); fb.px(x + i, cy + [-1, 0, 1, 0][i % 4], C.d); }
    return [8, 2];
  },
  tank(fb, x, cy) {
    for (let i = 0; i < 13; i++) fb.px(x + i, cy, C.d);
    for (let j = -6; j <= 6; j++) for (let i = -6; i <= 6; i++) {
      const d = i * i + j * j;
      if (d > 38) continue;
      fb.px(x + 6 + i, cy + j, d > 27 ? C.o : j === 1 ? [214, 160, 70] : i + j < -3 ? [234, 228, 216] : i + j > 4 ? [128, 120, 126] : [190, 182, 172]);
    }
    return [13, 6, true];
  },
  ring(fb, x, cy, t) {
    sec(fb, x, 6, cy);
    for (let y = cy - 12; y <= cy + 12; y++) {
      const end = Math.abs(y - cy) === 12;
      fb.px(x + 1, y, C.o); fb.px(x + 4, y, C.o);
      fb.px(x + 2, y, end ? C.o : C.H);
      fb.px(x + 3, y, end ? C.o : (y - cy + 12) % 3 === 1 ? (hash(y, x, Math.floor(t / 40)) > .25 ? C.y : C.w) : C.h);
    }
    return [6, 12, true];
  },
  hangar(fb, x, cy, t) {
    sec(fb, x, 14, cy, 5, 5, ARM);
    fb.rect(x + 2, cy - 2, 10, 5, C.e);
    for (let i = 3; i < 11; i += 2) fb.px(x + i, cy - 2, C.y);
    fb.px(x + 5, cy + 1, C.H); fb.px(x + 6, cy + 1, C.H); fb.px(x + 7, cy + 1, C.h); fb.px(x + 6, cy, C.h);
    fb.px(x + 4, cy + 1, (t >> 2) & 1 ? F2 : F3);
    return [14, 5];
  },
};
const STERN = {
  engines(fb, x, cy, t, n = 2) {
    const a = 2 + n;
    sec(fb, x + 2, 6, cy, a, a);
    for (let y = cy - a; y <= cy + a; y++) fb.px(x + 2, y, C.o);
    for (let k = 0; k < n; k++) {
      const ny = cy + Math.round((k - (n - 1) / 2) * (n > 1 ? (2 * a - 4) / (n - 1) : 0));
      for (let j = -1; j <= 1; j++) { fb.px(x + 1, ny + j, C.e); fb.px(x, ny + j, C.o); }
      const len = 2 + ((hash(t, k, 3) * 3) | 0);
      for (let j = 0; j <= len; j++) fb.px(x - j, ny, j < 2 ? F1 : j < len ? F2 : F3);
      fb.px(x - 1, ny - 1, F2); fb.px(x - 1, ny + 1, F2);
    }
    return [8, a];
  },
  big(fb, x, cy, t) {
    sec(fb, x + 6, 6, cy, 4, 4);
    for (let y = cy - 4; y <= cy + 4; y++) fb.px(x + 6, y, C.o);
    for (let i = 0; i < 6; i++) {
      const hh = 5 - Math.floor(i * .5);
      for (let y = cy - hh; y <= cy + hh; y++) fb.px(x + i, y, Math.abs(y - cy) === hh ? C.o : i < 2 ? [120, 60, 50] : C.e);
    }
    const len = 5 + ((hash(t, 1, 8) * 3) | 0);
    for (let j = 1; j <= len; j++) {
      const hw = Math.max(0, 3 - Math.floor(j / 2));
      for (let y = -hw; y <= hw; y++) fb.px(x - j, cy + y, j < 3 && Math.abs(y) < 2 ? F1 : j < len - 1 && Math.abs(y) < hw ? F2 : F3);
    }
    return [12, 4];
  },
};
const BOW = {
  bridge(fb, x, cy) {
    for (let i = 0; i < 11; i++) column(fb, x + i, cy, 3 - Math.max(0, Math.floor((i - 3) / 2.7)), 3 - Math.max(0, Math.floor((i - 6) / 2)), C);
    for (let y = cy - 2; y <= cy + 2; y++) fb.px(x, y, C.d);
    fb.px(x + 11, cy, C.o); fb.px(x + 5, cy - 1, C.w); fb.px(x + 6, cy - 1, C.w); fb.px(x + 8, cy, C.w);
    return [12, 3];
  },
  blunt(fb, x, cy) {
    sec(fb, x, 4, cy);
    for (let y = cy - 2; y <= cy + 2; y++) fb.px(x + 4, y, C.o);
    fb.px(x + 2, cy - 1, C.w); fb.px(x + 2, cy, C.w);
    return [5, 3];
  },
  gun(fb, x, cy, t) {
    for (let i = 0; i < 5; i++) column(fb, x + i, cy, 3 - Math.floor(i / 2), 3 - Math.floor(i / 2), C);
    for (let i = 5; i < 15; i++) { fb.px(x + i, cy - 1, C.o); fb.px(x + i, cy, i % 3 ? C.h : C.d); fb.px(x + i, cy + 1, C.o); }
    for (let y = cy - 2; y <= cy + 2; y++) fb.px(x + 15, y, C.o);
    fb.px(x + 16, cy, (t >> 3) & 1 ? C.w : C.d);
    return [17, 3];
  },
  prow(fb, x, cy) {
    for (let i = 0; i < 10; i++) column(fb, x + i, cy, 5 - Math.floor(i / 2), 5 - Math.floor(i / 3), ARM);
    for (let y = cy - 4; y <= cy + 4; y++) fb.px(x, y, ARM.d);
    fb.px(x + 10, cy, C.o); fb.px(x + 10, cy + 1, C.o); fb.px(x + 3, cy - 2, C.w); fb.px(x + 4, cy - 2, C.w);
    return [11, 5];
  },
  dock(fb, x, cy) {
    for (const i of [0, 3]) for (let y = cy - 3; y <= cy + 3; y++) fb.px(x + i, y, C.o);
    for (const i of [1, 2]) { fb.px(x + i, cy - 2, C.o); fb.px(x + i, cy + 2, C.o); for (let y = cy - 1; y <= cy + 1; y++) fb.px(x + i, y, y === cy ? C.y : C.h); }
    return [4, 3, true];
  },
};
const ATT = {
  turret(P) {
    for (let i = 2; i < 5; i++) { P(i, 1, C.d); P(i, 2, C.h); }
    P(3, 3, C.H); P(3, 2, C.r);
    for (let i = 5; i < 9; i++) P(i, 2, C.o);
  },
  launcher(P) {
    for (let k = 1; k < 4; k++) for (let i = 1; i < 7; i++) P(i, k, i === 1 || i === 6 || k === 3 ? C.o : C.d);
    P(2, 2, C.r); P(4, 2, C.r);
  },
  dish(P, t) {
    P(3, 1, C.h); P(3, 2, C.h);
    for (let i = 1; i < 6; i++) P(i, 3, C.H);
    P(1, 4, C.H); P(5, 4, C.H); P(3, 4, (t >> 3) & 1 ? C.r : C.d);
  },
  antenna(P, t) {
    for (let k = 1; k < 7; k++) P(3, k, C.d);
    P(2, 4, C.d); P(4, 4, C.d); P(3, 7, (t >> 3) & 1 ? C.r : C.d);
  },
  tower(P) {
    for (let k = 1; k < 3; k++) for (let i = 1; i < 7; i++) P(i, k, i === 1 || i === 6 ? C.o : C.h);
    for (let k = 3; k < 5; k++) for (let i = 2; i < 6; i++) P(i, k, i === 2 || i === 5 ? C.o : k === 3 ? C.w : C.h);
    P(1, 3, C.o); P(6, 3, C.o);
    for (let i = 2; i < 6; i++) P(i, 5, C.o);
    P(4, 6, C.d); P(4, 7, C.d);
  },
  cargo(P, t, n) {
    for (let l = 0; l < n; l++) for (let k = 1; k < 4; k++) for (let i = 0; i < 8; i++) {
      P(i, l * 3 + k, i === 0 || i === 7 ? C.o : (i < 4) !== !!(l & 1) ? (k === 3 ? C.c : [140, 80, 52]) : (k === 3 ? C.C : [54, 116, 120]));
    }
    for (let i = 0; i < 8; i++) P(i, n * 3 + 1, C.o);
  },
  radiator(P) {
    for (let k = 1; k < 11; k++) for (let i = 2; i < 6; i++) P(i, k, i === 2 || i === 5 || k === 10 ? C.o : k % 2 ? [214, 96, 60] : [120, 50, 44]);
  },
  solar(P) {
    P(3, 1, C.d); P(4, 1, C.d);
    for (let k = 2; k < 14; k++) for (let i = 0; i < 8; i++) {
      P(i, k, i === 0 || i === 7 || k === 2 || k === 13 ? [96, 136, 214] : (k - 2) % 4 === 0 || i % 4 === 0 ? [60, 96, 180] : [34, 56, 128]);
    }
  },
  pod(P, t) {
    P(3, 1, C.d); P(4, 1, C.d);
    for (let i = 1; i < 7; i++) { P(i, 2, C.o); P(i, 4, C.o); P(i, 3, C.h); }
    P(0, 3, C.e); P(7, 3, C.o); P(-1, 3, F1); P(-2, 3, hash(t, 5, 5) > .5 ? F2 : F3);
  },
  fin(P) { for (let k = 1; k < 6; k++) for (let i = k; i < 6; i++) P(i, k, i === k || i === 5 ? C.o : C.d); },
};
const PNAME = {
  hull: 'Hull', crew: 'Crew', reactor: 'Reactor', fuel: 'Fuel', armor: 'Armour', truss: 'Truss', tank: 'Tank', ring: 'Ring', hangar: 'Hangar',
  engines: 'Engines', big: 'Main eng.', bridge: 'Bridge', blunt: 'Cab', gun: 'Spinal gun', prow: 'Prow', dock: 'Dock',
  turret: 'Turret', launcher: 'Launcher', dish: 'Dish', antenna: 'Antenna', tower: 'Tower', cargo: 'Cargo', radiator: 'Radiator', solar: 'Solar', pod: 'Pod', fin: 'Fin',
};
const PW = { hull: 8, crew: 8, reactor: 6, fuel: 8, armor: 8, truss: 8, tank: 13, ring: 6, hangar: 14, bridge: 12, blunt: 5, gun: 17, prow: 11, dock: 4 };
const SPECS = [
  { id: 'pathfinder', name: 'Pathfinder', role: 'Survey ship', stern: ['engines', 2], bow: 'bridge', parts: [['reactor'], ['fuel'], ['crew', 'antenna'], ['hull', 'dish', 'dish'], ['hull', 'dish']] },
  { id: 'atlas', name: 'Atlas', role: 'Bulk freighter', stern: ['big'], bow: 'blunt', parts: [['reactor'], ['truss', 'cargo3', 'cargo2'], ['truss', 'cargo2', 'cargo3'], ['truss', 'cargo3', 'cargo3'], ['truss', 'cargo1', 'cargo2'], ['crew', 'tower']] },
  { id: 'mule', name: 'Mule', role: 'Tanker', stern: ['big'], bow: 'blunt', parts: [['reactor', 'radiator', 'radiator'], ['tank'], ['tank'], ['tank'], ['crew', 'antenna']] },
  { id: 'bastion', name: 'Bastion', role: 'Carrier cruiser', stern: ['engines', 3], bow: 'prow', parts: [['armor', 'radiator', 'radiator'], ['armor', 'turret', 'turret'], ['hangar', 'tower'], ['armor', 'turret', 'turret'], ['armor', 'launcher', 'launcher']] },
  { id: 'lancer', name: 'Lancer', role: 'Missile frigate', stern: ['engines', 2], bow: 'bridge', parts: [['reactor', 'fin', 'fin'], ['hull', 'launcher', 'launcher'], ['hull', 'launcher', 'launcher'], ['crew', 'dish']] },
  { id: 'pike', name: 'Pike', role: 'Beam destroyer', stern: ['engines', 2], bow: 'gun', parts: [['reactor', 'radiator', 'radiator'], ['armor', 'pod', 'pod'], ['hull', 'turret'], ['crew', 'antenna']] },
  { id: 'ark', name: 'Ark', role: 'Colony ship', stern: ['big'], bow: 'blunt', parts: [['reactor', 'radiator', 'radiator'], ['tank'], ['truss'], ['ring'], ['truss'], ['ring'], ['crew', 'tower']] },
  { id: 'lighthouse', name: 'Lighthouse', role: 'Orbital station', aft: 'dock', bow: 'dock', parts: [['truss', 'solar', 'solar'], ['hull', 'dish', 'antenna'], ['armor', 'tower', 'launcher'], ['crew', 'dish'], ['truss', 'solar', 'solar']] },
];
const spec = id => SPECS.find(s => s.id === id);
function drawShip(fb, x, cy, sp, t) {
  const ps = [];
  const add = (r, key, xx) => { ps.push({ x: xx, w: r[0], hh: r[1], round: r[2], name: PNAME[key] }); return r[0]; };
  if (sp.stern) x += add(STERN[sp.stern[0]](fb, x, cy, t, sp.stern[1]), sp.stern[0], x);
  if (sp.aft) x += add(BOW[sp.aft](fb, x, cy, t), sp.aft, x);
  for (const [core, top, bot] of sp.parts) {
    const r = CORE[core](fb, x, cy, t), ox = x + Math.floor((r[0] - 8) / 2);
    for (const [att, dir] of [[top, -1], [bot, 1]]) {
      if (!att) continue;
      const m = /^(\D+)(\d*)$/.exec(att);
      ATT[m[1]]((dx, k, c) => fb.px(ox + dx, cy + dir * (r[1] + k), c), t, +m[2] || 1);
    }
    x += add(r, core, x);
  }
  if (sp.bow) x += add(BOW[sp.bow](fb, x, cy, t), sp.bow, x);
  for (let i = 0; i < ps.length - 1; i++) {
    const a = ps[i], b = ps[i + 1];
    if (a.hh === b.hh) continue;
    const big = a.hh > b.hh ? a : b, small = big === a ? b : a;
    if (big.round) continue;
    const cx = big === a ? a.x + a.w - 1 : b.x;
    for (let dy = small.hh; dy <= big.hh; dy++) { fb.px(cx, cy - dy, C.o); fb.px(cx, cy + dy, C.o); }
  }
  return ps;
}
function measure(sp) {
  if (sp.m) return sp.m;
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  const f = { px(x, y) { x = Math.round(x); y = Math.round(y); if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }, rect(x, y, w, h) { this.px(x, y); this.px(x + w - 1, y + h - 1); } };
  drawShip(f, 0, 0, sp, 0);
  return sp.m = { x0: x0 - 2, x1, y0, y1, w: x1 - x0 + 3, h: y1 - y0 + 1 };
}
function shipCentered(fb, sp, t, cyOverride) {
  const m = measure(sp);
  return drawShip(fb, Math.round((fb.w - m.w) / 2) - m.x0, cyOverride ?? Math.round((fb.h - m.h) / 2) - m.y0, sp, t);
}
function stars(fb, t, n) {
  fb.fill(PAL.bg);
  for (let k = 0; k < n; k++) {
    const v = hash(k, 2, 9), x = ((hash(k, 1, 9) * fb.w - t * (.3 + v * 1.4)) % fb.w + fb.w) % fb.w;
    fb.px(x, hash(k, 3, 9) * fb.h, PAL.star[v < .5 ? 0 : v < .85 ? 1 : 2]);
  }
}

function surfaceScene(s, t) {
  const W = s.w, H = s.h, hz = Math.floor(H * .6);
  const sky = [[70, 44, 58], [150, 96, 74], [206, 156, 108]];
  for (let y = 0; y < hz; y++) for (let x = 0; x < W; x++) s.px(x, y, sky[clamp(Math.floor(y / hz * 2.6 + (dith(x, y) - .5) * .9), 0, 2)]);
  for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) if (i * i + j * j < 18) s.px(W * .78 + i, hz * .4 + j, [250, 236, 206]);
  s.px(W * .2, hz * .25, [220, 200, 190]); s.px(W * .2 + 1, hz * .25, [220, 200, 190]);
  for (let x = 0; x < W; x++) {
    const r = hz - 5 - Math.floor(fbm(x * .03, 0, 5, 3) * 16);
    for (let y = r; y < hz; y++) s.px(x, y, [112, 60, 48]);
    for (let y = hz; y < H; y++) s.px(x, y, fbm(x * .08, y * .3, 2, 2) + dith(x, y) * .3 > .62 ? [96, 46, 38] : [78, 38, 34]);
  }
  const yb = hz + 9, lit = [250, 210, 120];
  let x = Math.max(6, Math.round((W - 190) / 2));
  for (const k of 'dmfdmrdflmd') {
    if (k === 'd') {
      const r = 6;
      for (let i = -r; i <= r; i++) {
        const h = Math.round(Math.sqrt(r * r - i * i));
        for (let y = yb - h; y <= yb; y++) s.px(x + r + i, y, y === yb - h ? [214, 224, 232] : hash(x + i, y, Math.floor(t / 25)) > .86 ? lit : [84, 106, 128]);
      }
      x += 16;
    } else if (k === 'm') {
      s.line(x, yb, x + 4, yb - 10, [40, 30, 34]); s.line(x + 8, yb, x + 4, yb - 10, [40, 30, 34]);
      s.px(x + 4, yb - 11, (t >> 3) & 1 ? [239, 111, 94] : [40, 30, 34]);
      for (let i = 0; i < 6; i++) for (let j = 0; j <= Math.min(i, 5 - i); j++) s.px(x + 9 + i, yb - j, [140, 78, 54]);
      x += 18;
    } else if (k === 'f') {
      s.rect(x, yb - 7, 13, 8, [62, 56, 74]); s.rect(x, yb - 8, 13, 1, [110, 104, 124]); s.rect(x + 9, yb - 14, 2, 6, [62, 56, 74]);
      for (let i = 1; i < 12; i += 2) s.px(x + i, yb - 4, hash(x + i, 3, Math.floor(t / 18)) > .35 ? lit : [40, 36, 50]);
      for (let j = 0; j < 5; j++) s.px(x + 10 + Math.round(Math.sin((t + j * 6) * .25) * 1.4) + j, yb - 16 - j * 2 - (t % 2), [188, 170, 164]);
      x += 17;
    } else if (k === 'r') {
      for (const o of [0, 7]) { s.rect(x + o, yb - 7, 5, 8, [150, 150, 160]); s.rect(x + o, yb - 7, 1, 8, [100, 100, 116]); s.rect(x + o + 1, yb - 8, 3, 1, [150, 150, 160]); }
      s.rect(x + 13, yb - 12, 1, 13, [60, 54, 66]);
      s.px(x + 13, yb - 13, hash(t, 1, 5) > .4 ? [255, 190, 90] : [240, 110, 60]); s.px(x + 13, yb - 14, [255, 240, 200]);
      x += 18;
    } else {
      s.rect(x, yb - 5, 10, 6, [176, 184, 196]); s.rect(x, yb - 5, 10, 1, [226, 232, 240]);
      s.px(x + 5, yb - 6, [100, 104, 120]); s.px(x + 5, yb - 7, [100, 104, 120]);
      for (let i = 3; i < 8; i++) s.px(x + i, yb - 8, [226, 232, 240]);
      s.px(x + 2, yb - 9, [226, 232, 240]); s.px(x + 8, yb - 9, [226, 232, 240]);
      s.px(x + 2, yb - 2, lit); s.px(x + 4, yb - 2, lit); s.px(x + 7, yb - 2, [110, 220, 230]);
      x += 14;
    }
  }
  s.present();
}
