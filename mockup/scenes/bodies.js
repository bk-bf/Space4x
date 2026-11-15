'use strict';
const BC = [0, 0, 0];
let BLAND = false, BADD = 0, BSEA = false, G0 = 0, G1 = 0, G2 = 0, GS = 0;
const setc = c => { BC[0] = c[0]; BC[1] = c[1]; BC[2] = c[2]; };
const TERR = [[18, 40, 100], [28, 64, 134], [52, 112, 160], [196, 180, 130], [64, 120, 66], [44, 96, 58], [170, 150, 96], [128, 116, 108], [226, 232, 238]];
const JUP = [[196, 160, 118], [226, 198, 158], [164, 112, 76], [238, 222, 192], [142, 92, 66], [210, 176, 130]];
const SATC = [[214, 190, 136], [234, 214, 166], [190, 164, 112], [224, 202, 150]];
const ATMO = { terran: [80, 150, 235], venus: [240, 214, 150], mars: [214, 150, 110], gas: [226, 200, 160], saturn: [230, 210, 160], ice: [170, 230, 240], ice2: [110, 150, 250] };
const FW = 512, FH = 256, FKEY = { saturn: 'gas', ice2: 'ice' };
const FDEF = {
  terran: [(x, y, z) => fbm(x * 2.4 + 5, y * 2.4, z * 2.4, 6), (x, y, z) => fbm(x * 3.2 + 40, y * 5.2 + 9, z * 3.2, 5), (x, y, z) => fbm(x * 6 + 2, y * 6, z * 6, 3)],
  mars: [(x, y, z) => fbm(x * 2.2 + 11, y * 2.2, z * 2.2, 6), (x, y, z) => fbm(x * 5 + 2, y * 5, z * 5, 3), (x, y, z) => fbm(x * 2 + 9, 3, z * 2, 3)],
  venus: [(x, y, z) => fbm(x * 1.4 + 3, y * 3.4 + Math.abs(x) * 1.1, z * 1.4, 6), (x, y, z) => fbm(x * 5, y * 11, z * 5, 3)],
  gas: [(x, y, z) => fbm(x * 2.4, y * 2.4 + 20, z * 2.4, 6), (x, y, z) => fbm(x * 7 + 4, y * 16, z * 7, 3), (x, y, z) => fbm(x * 26 + 1, y * 60, z * 26, 3)],
  ice: [(x, y, z) => fbm(x * 1.6 + 9, y * 3 + 2, z * 1.6, 6)],
  rock: [(x, y, z) => fbm(x * 2.6 + 17, y * 2.6, z * 2.6, 6)],
};
const FIELDS = {};
function fields(type) {
  const key = FKEY[type] || type;
  if (FIELDS[key]) return FIELDS[key];
  const defs = FDEF[key], out = defs.map(() => new Float32Array(FW * FH));
  for (let v = 0; v < FH; v++) {
    const lat = (v / (FH - 1) - .5) * Math.PI, y = Math.sin(lat), c = Math.cos(lat);
    for (let u = 0; u < FW; u++) { const lon = (u / FW - .5) * 6.2831853, x = Math.cos(lon) * c, z = Math.sin(lon) * c; for (let i = 0; i < defs.length; i++) out[i][v * FW + u] = defs[i](x, y, z); }
  }
  return FIELDS[key] = out;
}
function prebake() { for (const k in FDEF) if (!FIELDS[k]) { fields(k); return true; } return false; }
function smp(F, u, v) {
  const u0 = u | 0, v0 = v | 0, fu = u - u0, fv = v - v0, u1 = (u0 + 1) & (FW - 1), v1 = v0 + 1 < FH ? v0 + 1 : v0, a = F[v0 * FW + u0], b = F[v0 * FW + u1], c = F[v1 * FW + u0], d = F[v1 * FW + u1];
  return a + (b - a) * fu + (c - a) * fv + (a - b - c + d) * fu * fv;
}
function bodyPx(type, x, y, z, R, dv) {
  BLAND = false; BADD = 0; BSEA = false;
  if (type === 'terran') {
    const dt = R > 80 ? (noise3(x * 38 + 1, y * 38, z * 38) - .5) * (R > 350 ? .05 : .03) : 0, h = G0 + dt, cl = G1 + dt * .8;
    if (cl > .61 || (cl > .575 && dv > .45)) return setc(cl > .61 ? [240, 244, 248] : [206, 216, 230]);
    if (Math.abs(y) > .88 - (h - .5) * .5) return setc(TERR[8]);
    if (h < .53) { BSEA = true; setc(h < .44 ? TERR[0] : h < .5 ? TERR[1] : TERR[2]); }
    else {
      BLAND = true;
      const m = G2 + dt;
      setc(h < .54 ? TERR[3] : h > .74 ? TERR[8] : h > .68 ? TERR[7] : m > .58 || Math.abs(y) < .12 && m > .5 ? TERR[6] : m > .47 ? TERR[4] : TERR[5]);
      BADD = (h - .6) * .9;
    }
    if (GS > .61) { BC[0] *= .6; BC[1] *= .6; BC[2] *= .72; }
    return;
  }
  if (type === 'mars') {
    const h = G0, e = G1, cap = (y < 0 ? .88 : .94) - (e - .5) * .5, a = Math.abs(y);
    if (a > cap) return setc([232, 220, 210]);
    if (a > cap - .04) return setc([206, 156, 122]);
    BLAND = true; BADD = (e - .5) * .7;
    const cr = noise3(x * 7 + 3, y * 7, z * 7), cr2 = R > 40 ? noise3(x * 17 + 8, y * 17, z * 17) : 0;
    if (Math.abs(y + .08 - (G2 - .5) * .3) < .014 && x > -.5 && x < .6) { BADD = -.5; return setc([98, 44, 34]); }
    if (cr > .75 || cr2 > .8) { BADD = -.35; return setc([124, 58, 40]); }
    if (cr > .71 || cr2 > .765) { BADD = .45; return setc([214, 140, 92]); }
    return setc(h < .42 ? [112, 52, 36] : h < .52 ? [156, 78, 44] : h < .62 ? [190, 108, 62] : [214, 148, 96]);
  }
  if (type === 'venus') {
    const w = G0 + (G1 - .5) * .18;
    return setc(w < .42 ? [168, 130, 64] : w < .5 ? [204, 166, 88] : w < .58 ? [232, 204, 132] : [244, 228, 176]);
  }
  if (type === 'gas' || type === 'saturn') {
    const g = type === 'gas', P = g ? JUP : SATC;
    if (g) {
      const sx = x - .45, sy = y - .28, sd = sx * sx * .5 + sy * sy * 2.2;
      if (z > 0 && sd < .012) return setc(sd < .006 ? [176, 70, 52] : [200, 96, 66]);
      if (z > 0 && sd < .016) return setc([238, 222, 192]);
    }
    const fine = G1 - .5, band = y * (g ? 6.2 : 4.6) + (G0 - .5) * (g ? 1.5 : .9) + fine * (g ? .7 : .4) + (R > 150 ? (G2 - .5) * .45 : 0) + 20, bi = Math.floor(band), fr = band - bi;
    setc(P[(bi + (fr > .8 && dv > (1 - fr) * 5 ? 1 : 0)) % P.length]);
    if (g && R > 30 && Math.abs(y) > .3 && noise3(x * 9 + 2, y * 22, z * 9) > .8) setc([240, 228, 204]);
    BADD = fine * .5;
    return;
  }
  if (type === 'ice' || type === 'ice2') {
    const n2 = type === 'ice2', P = n2 ? [[64, 100, 210], [90, 130, 230], [48, 76, 170]] : [[150, 210, 220], [176, 226, 232], [126, 190, 204]];
    if (n2 && z > 0 && (x + .3) ** 2 * .6 + (y - .3) ** 2 * 2.4 < .012) return setc([32, 50, 130]);
    if (n2 && R > 30 && noise3(x * 6, y * 20 + 3, z * 6) > .82) return setc([200, 214, 250]);
    return setc(P[Math.floor(y * 3 + (G0 - .5) * 1.2 + 20) % 3]);
  }
  const h = G0, c1 = noise3(x * 6 + 3, y * 6, z * 6), c2 = R > 30 ? noise3(x * 14 + 5, y * 14, z * 14) : 0, c3 = R > 150 ? noise3(x * 31 + 5, y * 31, z * 31) : 0;
  BLAND = true; BADD = (h - .5) * .8;
  if (c1 > .76 || c2 > .8 || c3 > .83) { BADD = -.4; return setc([78, 76, 84]); }
  if (c1 > .72 || c2 > .765 || c3 > .8) { BADD = .5; return setc([188, 184, 184]); }
  setc(h < .45 ? [96, 94, 100] : h < .58 ? [128, 124, 128] : [164, 160, 160]);
}
const ringDens = rr => rr < 1.24 || rr > 2.28 ? 0 : rr < 1.52 ? .38 : rr < 1.95 ? .96 : rr < 2.03 ? 0 : rr > 2.19 && rr < 2.21 ? .1 : .72;
function drawRings(f, cx, cy, R, front) {
  const rx = R * 2.3, ry = rx * .3, x0 = Math.max(0, Math.floor(cx - rx)), x1 = Math.min(f.w - 1, Math.ceil(cx + rx));
  const y0 = Math.max(0, Math.floor(front ? cy : cy - ry)), y1 = Math.min(f.h - 1, Math.ceil(front ? cy + ry : cy));
  const D = f.d, ax = -LD[0] / LXY, ay = -LD[1] / LXY, big = R > 9;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const dx = x + .5 - cx, dy = y + .5 - cy, rr = Math.hypot(dx, dy / .3) / R, dn = ringDens(rr);
    if (!dn) continue;
    const fine = big ? hash(Math.floor(rr * (R > 60 ? 90 : 34)), 3, 7) : .5;
    if (big ? dith(x, y) > dn * (.75 + fine * .5) : dn < .5 && ((x + y) & 1)) continue;
    let c = rr < 1.52 ? [150, 130, 96] : rr < 1.95 ? (fine > .6 ? [226, 204, 150] : [206, 182, 128]) : fine > .5 ? [190, 164, 112] : [164, 142, 100], k = 1;
    const along = dx * ax + dy * ay, perp = Math.abs(-dx * ay + dy * ax);
    if (along > 0 && perp < R * .97) k = .32;
    const q = (y * f.w + x) * 4;
    D[q] = c[0] * k; D[q + 1] = c[1] * k; D[q + 2] = c[2] * k + (k < 1 ? 14 : 0);
  }
}
const I2PI = 1 / 6.2831853, IPI = 1 / Math.PI;
function drawBody(f, b, cx, cy, R) {
  const type = b.type, atmo = ATMO[type], th = atmo && R >= 6 ? Math.max(1.5, R * .03) : 0, RR = R * (b.rings ? 2.35 : 1) + th + 1;
  if (cx + RR < 0 || cy + RR < 0 || cx - RR > f.w || cy - RR > f.h) return;
  if (b.rings && R >= 2.5) drawRings(f, cx, cy, R, false);
  const F = fields(type), F0 = F[0], F1 = F[1], F2 = F[2], terr = type === 'terran';
  const rot = b.rot ?? (b.a || 0) * 1e-11 + .6, cr = Math.cos(rot), sr = Math.sin(rot), tl = b.tilt || 0, ct = Math.cos(tl), st = Math.sin(tl);
  const D = f.d, E = R + th, small = R < 20, lim = small ? R * R + R * .8 : R * R;
  const j0 = Math.max(Math.ceil(-E), -Math.floor(cy)), j1 = Math.min(Math.floor(E), f.h - 1 - Math.floor(cy)), i0 = Math.max(Math.ceil(-E), -Math.floor(cx)), i1 = Math.min(Math.floor(E), f.w - 1 - Math.floor(cx));
  const X0 = Math.floor(cx), Y0 = Math.floor(cy), fx = cx - X0, fy = cy - Y0, lights = b.lights, bump = R > 14;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const dx = small ? i : i + .5 - fx, dy = small ? j : j + .5 - fy, d2 = dx * dx + dy * dy, x = X0 + i, y = Y0 + j, q = (y * f.w + x) * 4;
    if (d2 > lim) {
      if (!th) continue;
      const d = Math.sqrt(d2);
      if (d > E) continue;
      const g = (1 - (d - R) / th) * clamp((dx * LD[0] + dy * LD[1]) / d * 2 + .9, 0, 1);
      if (dith(x, y) < g * .9) { D[q] = atmo[0] * .8; D[q + 1] = atmo[1] * .8; D[q + 2] = atmo[2] * .95; }
      continue;
    }
    const nx = dx / (R + .5), ny = dy / (R + .5), nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
    const tx = nx * ct + ny * st, ty = ny * ct - nx * st, px = tx * cr + nz * sr, pz = nz * cr - tx * sr, dv = dith(x, y);
    const u = (Math.atan2(pz, px) * I2PI + .5) * FW, v = (Math.asin(ty < -1 ? -1 : ty > 1 ? 1 : ty) * IPI + .5) * (FH - 1), uu = u >= FW ? u - FW : u;
    G0 = smp(F0, uu, v);
    if (F1) G1 = smp(F1, uu, v);
    if (F2) G2 = smp(F2, uu, v);
    if (terr) { const us = uu + 2.2 >= FW ? uu + 2.2 - FW : uu + 2.2; GS = smp(F1, us, v > 1.6 ? v - 1.6 : 0); }
    bodyPx(type, px, ty, pz, R, dv);
    let L = nx * LD[0] + ny * LD[1] + nz * LD[2];
    if (bump) L += BADD * .22 * nz;
    if (b.rings && Math.abs(dy + .24 * Math.sqrt(Math.max(0, R * R - dx * dx)) * .9 - R * .02) < R * .045 && L > 0) L -= .5;
    const s = clamp(Math.floor((L * 1.15 + .12) * 3 + dv), 0, 3), k = SH[s];
    let r = BC[0] * k, g = BC[1] * k, bl = BC[2] * k;
    if (s === 0) {
      r += 3; g += 4; bl += 12;
      if (lights && BLAND && (R > 60 ? G2 > .5 && hash(x, y, 3) > .62 && noise3(px * 30, ty * 30, pz * 30) > .55 : hash(px * 34, ty * 34, pz * 34) > .94)) { r = 255; g = 214; bl = 120; }
    } else if (BSEA && L > .95 && dv > .3) { r = mix(r, 255, .5); g = mix(g, 255, .5); bl = mix(bl, 255, .5); }
    if (atmo && R > 10) { const rim = clamp((.3 - nz) / .3, 0, 1) * clamp(L * 2 + .8, 0, 1); if (dv < rim * .8) { r = mix(r, atmo[0], .55); g = mix(g, atmo[1], .55); bl = mix(bl, atmo[2], .55); } }
    D[q] = r; D[q + 1] = g; D[q + 2] = bl;
  }
  if (b.rings && R >= 2.5) drawRings(f, cx, cy, R, true);
}
const SUNC = [[255, 252, 236], [255, 242, 196], [255, 216, 112], [246, 156, 60], [226, 108, 44], [150, 62, 44]];
let SPOT = null;
function drawSun(f, cx, cy, R, t) {
  if (R < 5) return sun(f, Math.round(cx), Math.round(cy), Math.max(3, Math.round(R)), t);
  const cor = R * .32 + 8, E = R + cor;
  if (cx + E < 0 || cy + E < 0 || cx - E > f.w || cy - E > f.h) return;
  if (!SPOT) { SPOT = new Float32Array(65536); for (let j = 0; j < 256; j++) for (let i = 0; i < 256; i++) SPOT[j * 256 + i] = fbm((i / 128 - 1) * 3 + 5, (j / 128 - 1) * 3, 1.7, 3); }
  const D = f.d, G = clamp(R * .3, 5, 70), X0 = Math.floor(cx), Y0 = Math.floor(cy), fx = cx - X0, fy = cy - Y0, tz = t * .012, spots = R > 30;
  const j0 = Math.max(Math.ceil(-E), -Y0), j1 = Math.min(Math.floor(E), f.h - 1 - Y0), i0 = Math.max(Math.ceil(-E), -X0), i1 = Math.min(Math.floor(E), f.w - 1 - X0);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const dx = i + .5 - fx, dy = j + .5 - fy, d = Math.hypot(dx, dy), x = X0 + i, y = Y0 + j, q = (y * f.w + x) * 4, dv = dith(x, y);
    let c;
    if (d <= R) {
      const nx = dx / R, ny = dy / R, v = d / R, gr = noise3(nx * G, ny * G, tz) - .5, sp = spots ? SPOT[Math.min(255, (ny + 1) * 127.5 | 0) * 256 + Math.min(255, (nx + 1) * 127.5 | 0)] : .5;
      if (sp < .3 && v < .85) c = sp < .27 ? [176, 84, 36] : SUNC[4];
      else { const u = v * v * 1.25 + gr * .55 + (dv - .5) * .3; c = SUNC[u < .2 ? 0 : u < .62 ? 1 : u < 1.02 ? 2 : 3]; }
    } else {
      const w = (d - R) / cor;
      if (w > 1.25) continue;
      const a = Math.atan2(dy, dx), ray = noise3(Math.cos(a) * 3.2 + 4, Math.sin(a) * 3.2, tz * 3) + noise3(Math.cos(a) * 9, Math.sin(a) * 9, tz * 5) * .4;
      const s = (1 - w) * .95 + (ray - .7) * .9;
      if (s <= dv + .22) continue;
      c = s > dv + .75 ? SUNC[3] : s > dv + .45 ? SUNC[4] : SUNC[5];
    }
    D[q] = c[0]; D[q + 1] = c[1]; D[q + 2] = c[2];
  }
}
function belt(f, S, k, n) {
  for (let i = 0; i < n; i++) {
    const r = (2.15 + hash(i, 5, 2) * 1.15) * AU * (1 + (hash(i, 9, 2) - .5) * .04), a = hash(i, 6, 2) * 6.2832, p = S(dpos([Math.cos(a) * r, Math.sin(a) * r], k));
    if (p[0] < 0 || p[1] < 0 || p[0] >= f.w || p[1] >= f.h) continue;
    const v = hash(i, 7, 2);
    f.px(p[0], p[1], v > .9 ? [176, 168, 176] : v > .5 ? PAL.belt[1] : PAL.belt[0]);
    if (v > .96) { f.px(p[0] + 1, p[1], PAL.belt[0]); f.px(p[0], p[1] + 1, [70, 66, 92]); }
  }
}
const MKC = { navy: [95, 208, 197], civ: [182, 222, 240], foe: [239, 111, 94] };
function bodyMark(f, b, x, y) {
  x = Math.round(x); y = Math.round(y);
  if (b.parent) { f.px(x, y, b.col); return; }
  if (b.type === 'sun') { for (const [i, j] of [[-4, 0], [-3, 0], [3, 0], [4, 0], [0, -4], [0, -3], [0, 3], [0, 4]]) f.px(x + i, y + j, [246, 156, 60]); f.rect(x - 1, y - 2, 3, 5, [255, 236, 170]); f.rect(x - 2, y - 1, 5, 3, [255, 236, 170]); return; }
  f.rect(x - 1, y - 2, 3, 5, b.col); f.rect(x - 2, y - 1, 5, 3, b.col);
  if (b.rings) for (let i = -4; i <= 4; i++) if (Math.abs(i) > 2) f.px(x + i, y, [190, 164, 112]);
}
function fleetMark(f, x, y, a, col) {
  const c = Math.cos(a), s = Math.sin(a), tx = x + c * 4, ty = y + s * 4, lx = x - c * 3 - s * 3, ly = y - s * 3 + c * 3, rx = x - c * 3 + s * 3, ry = y - s * 3 - c * 3;
  f.line(tx, ty, lx, ly, col); f.line(tx, ty, rx, ry, col); f.line(lx, ly, x - c, y - s, col); f.line(rx, ry, x - c, y - s, col);
}
function siteMark(f, st, x, y) {
  x = Math.round(x); y = Math.round(y);
  if (st.hot) { for (let i = 0; i < 4; i++) { f.px(x - 3 + i, y - i, PAL.hot); f.px(x + i, y - 3 + i, PAL.hot); f.px(x + 3 - i, y + i, PAL.hot); f.px(x - i, y + 3 - i, PAL.hot); } if (st.id === 'battle' && (FRAME >> 2) % 5 < 2) f.px(x + (FRAME % 5) - 2, y + (FRAME % 3) - 1, F1); return; }
  if (st.id === 'gate') { f.ring(x, y, 5, PAL.jump, 2, FRAME >> 2); f.ring(x, y, 2, PAL.jump, 2, -(FRAME >> 2)); f.px(x, y, PAL.jump); return; }
  if (st.id === 'salv') { for (let i = -3; i <= 3; i++) { f.px(x + i, y + i, [148, 143, 192]); f.px(x + i, y - i, [148, 143, 192]); } return; }
  for (let i = -3; i <= 3; i++) { f.px(x + i, y - 3, MKC.navy); f.px(x + i, y + 3, MKC.navy); f.px(x - 3, y + i, MKC.navy); f.px(x + 3, y + i, MKC.navy); }
  f.px(x, y, MKC.navy);
}
