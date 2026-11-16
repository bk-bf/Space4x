import type { RGB } from '#lib/gfx/palette.ts';
import { defineLook } from './define.ts';
import { craterLook } from './cratered.ts';
import {
  fbm,
  noise3,
  contour,
  warped,
  clamp,
  smoothstep,
  hash,
  lonlat,
  blob,
  C,
  clearC,
  feature,
  featureField
} from './terrain.ts';
import { setc, toward, ramp } from './colour.ts';
import { h3 } from './math.ts';
import { ADD, LAND, type Look } from './types.ts';

const SULPHUR: RGB = [226, 204, 74];
const PALE: RGB = [242, 234, 150];
const FROST: RGB = [246, 244, 228];
const ORANGE: RGB = [214, 118, 40];
const RED: RGB = [168, 46, 30];
const BLACK: RGB = [30, 24, 22];
const BROWN: RGB = [128, 84, 40];

const volcano = (x: number, y: number, z: number, out: number[]) => {
  const f = 5,
    px = x * f + 4.1,
    py = y * f + 1.7,
    pz = z * f + 7.3,
    ix = Math.floor(px),
    iy = Math.floor(py),
    iz = Math.floor(pz),
    x0 = px - ix < 0.5 ? ix - 1 : ix,
    y0 = py - iy < 0.5 ? iy - 1 : iy,
    z0 = pz - iz < 0.5 ? iz - 1 : iz;
  let best = 9,
    bt = 0;
  for (let a = 0; a < 2; a++)
    for (let b = 0; b < 2; b++)
      for (let c = 0; c < 2; c++) {
        const cx = x0 + a,
          cy = y0 + b,
          cz = z0 + c,
          hp = hash(cx, cy, cz + 60);
        if (hp > 0.62) continue;
        const r = 0.1 + 0.2 * hash(cx, cy, cz + 61),
          dx = cx + 0.2 + 0.6 * hash(cx, cy, cz + 62) - px,
          dy = cy + 0.2 + 0.6 * hash(cx, cy, cz + 63) - py,
          dz = cz + 0.2 + 0.6 * hash(cx, cy, cz + 64) - pz,
          d = h3(dx, dy, dz) / r;
        if (d < best) {
          best = d;
          bt = hash(cx, cy, cz + 65);
        }
      }
  out[0] = best;
  out[1] = bt;
};

const VO = [0, 0];
const LOKI = lonlat(51, 13);
const PELE = lonlat(100, -18);
const PROM = lonlat(153, -2);

export const io = (): Look =>
  defineLook({
    id: 'io',
    face: 192,
    facing: 40,
    channels: [
      (x: number, y: number, z: number) => fbm(x * 3 + 2, y * 3, z * 3, 5),
      (x: number, y: number, z: number) => {
        volcano(x, y, z, VO);
        return VO[0]! / 3;
      },
      (x: number, y: number, z: number) => {
        volcano(x, y, z, VO);
        return VO[1]!;
      },
      (x: number, y: number, z: number) => fbm(x * 9 + 8, y * 9, z * 9, 3),
      (x: number, y: number, z: number) => {
        const l = blob(x, y, z, LOKI, 0.045, 0.012, 0) * 1.0,
          p = Math.abs(h3(x - PELE[0], y - PELE[1], z - PELE[2]) - 0.2),
          pr = 1 - smoothstep(0.0, 0.07, p),
          pp = Math.abs(h3(x - PROM[0], y - PROM[1], z - PROM[2]) - 0.1),
          prr = (1 - smoothstep(0.0, 0.03, pp)) * 0.7;
        return clamp(l * 0.5 + Math.max(pr, prr) * 0.5, 0, 1);
      },
      (x: number, y: number, z: number) => {
        const l = blob(x, y, z, LOKI, 0.045, 0.012, 0);
        const q = blob(x, y, z, LOKI, 0.1, 0.03, 0) * 0.5;
        return clamp(l + q, 0, 1);
      }
    ],
    shade: (x, y, z, R, dv, G, O) => {
      const n = G[0],
        lat = Math.abs(y);
      ramp(
        O,
        [
          [0, SULPHUR],
          [0.5, PALE],
          [1, FROST]
        ],
        clamp((n - 0.35) * 2.2 + 0.1 - lat * 0.5, 0, 1)
      );
      if (lat > 0.6) toward(O, BROWN, clamp((lat - 0.6) * 2.2, 0, 0.8) * (0.6 + n * 0.6));
      if (G[3] > 0.6) toward(O, ORANGE, (G[3] - 0.6) * 1.8);
      const d = G[1] * 3,
        t = G[2];
      if (d < 0.14) setc(O, BLACK);
      else if (d < 0.5) toward(O, t > 0.5 ? RED : ORANGE, 0.95);
      else if (d < 0.95) toward(O, t > 0.45 ? [236, 236, 230] : [240, 190, 90], 0.75 * (1 - (d - 0.5) * 1.2));
      else if (d < 1.4 && t > 0.7) toward(O, [190, 70, 36], 0.45);
      const ring = G[4] * 2;
      if (ring > 0.25) toward(O, ring > 0.9 ? RED : ORANGE, clamp(ring - 0.2, 0, 0.9));
      const loki = G[5];
      if (loki > 0.6) setc(O, BLACK);
      else if (loki > 0.05) toward(O, BLACK, loki);
      O[LAND] = 1;
    }
  });

const lin = (x: number, y: number, z: number, f: number, seed: number, w: number) =>
  contour(warped(x, y, z, f, 1.1, seed, 3), w);
const PWYLL = [
  feature({ lon: 89, lat: -25, rad: 0.02, depth: 0.2, fresh: true, rayLen: 14, rays: { n: 9, ph: 1, k: 1 } }),
  feature({
    lon: -20,
    lat: 40,
    rad: 0.015,
    depth: 0.2,
    fresh: true,
    rayLen: 8,
    rays: { n: 7, ph: 2, k: 0.8 }
  })
];

export const europa = (): Look =>
  defineLook({
    id: 'europa',
    face: 192,
    facing: 30,
    channels: [
      (x: number, y: number, z: number) => fbm(x * 2.5 + 7, y * 2.5, z * 2.5, 4),
      (x: number, y: number, z: number) =>
        lin(x, y, z, 1.5, 3, 0.05) * smoothstep(0.35, 0.6, fbm(x * 2 + 5, y * 2, z * 2, 3)),
      (x: number, y: number, z: number) => {
        const m = smoothstep(0.3, 0.55, fbm(x * 2.6 + 9, y * 2.6, z * 2.6, 3));
        return Math.max(lin(x, y, z, 3.2, 8, 0.024), lin(x, y, z, 6.5, 15, 0.016) * 0.85) * m;
      },
      (x: number, y: number, z: number) => fbm(x * 2.2 + 11, y * 2.2, z * 2.2, 4),
      (x: number, y: number, z: number) => noise3(x * 20, y * 20, z * 20),
      (x: number, y: number, z: number) => {
        clearC();
        featureField(x, y, z, PWYLL);
        return C.bright;
      }
    ],
    shade: (x, y, z, R, dv, G, O) => {
      ramp(
        O,
        [
          [0, [208, 202, 184]],
          [0.5, [230, 226, 212]],
          [1, [242, 240, 230]]
        ],
        clamp((G[0] - 0.3) * 1.8, 0, 1)
      );
      if (G[1] > 0.02) toward(O, [176, 142, 112], G[1] * 0.8);
      if (G[2] > 0.02) toward(O, [132, 82, 56], clamp(G[2] * 1.1, 0, 0.95));
      if (G[3] > 0.64) {
        const k = clamp((G[3] - 0.64) * 7, 0, 1);
        toward(O, G[4] > 0.5 ? [176, 128, 98] : [204, 170, 138], k * 0.85);
      }
      if (G[5] > 0.03) toward(O, [250, 250, 246], clamp(G[5] * 1.1, 0, 1));
      O[ADD] = (G[0] - 0.5) * 0.3;
    }
  });

const gGroove = (x: number, y: number, z: number) =>
  0.5 + 0.5 * Math.sin(warped(x, y, z, 2.1, 0.9, 4, 3) * 150);
const gDark = (x: number, y: number, z: number) => smoothstep(0.46, 0.56, warped(x, y, z, 1.9, 0.4, 11, 4));

export const ganymede = (): Look =>
  craterLook({
    id: 'ganymede',
    seed: 7,
    face: 192,
    facing: 20,
    hs: 0.5,
    layers: [
      { f: 1.4, dn: 0.4, rmin: 0.2, rmax: 0.32, depth: 0.5 },
      { f: 2.8, dn: 0.55, rmin: 0.14, rmax: 0.3, depth: 0.45, fresh: 0.07 },
      { f: 5.6, dn: 0.65, rmin: 0.14, rmax: 0.3, depth: 0.45, fresh: 0.06 },
      { f: 11, dn: 0.75, rmin: 0.14, rmax: 0.3, depth: 0.4, fresh: 0.05 }
    ],
    features: [
      { lon: 15, lat: 20, rad: 0.025, depth: 0.5, fresh: true, rayLen: 14, rays: { n: 9, ph: 1.3, k: 1 } }
    ],
    extraH: (x: number, y: number, z: number) => (1 - gDark(x, y, z)) * 0.0048 * (gGroove(x, y, z) - 0.5) * 2,
    extraScale: 0,
    m1: gDark,
    m2: (x: number, y: number, z: number) => gGroove(x, y, z),
    palette: [
      [0, [138, 130, 118]],
      [0.5, [158, 150, 138]],
      [1, [178, 170, 158]]
    ],
    noiseAmt: 1.2,
    bright: [236, 238, 240],
    brightAmt: 1.2,
    post: (x, y, z, R, dv, G, O) => {
      const d = G[3];
      if (d > 0.02) toward(O, [74, 66, 60], clamp(d * 0.95, 0, 1));
      if (d < 0.5 && G[4] > 0.7) toward(O, [196, 188, 176], 0.25 * (1 - d));
      const lat = Math.abs(y);
      if (lat > 0.82) toward(O, [214, 214, 214], clamp((lat - 0.82) * 5 * (0.5 + G[2]), 0, 0.85));
    }
  });

export const callisto = (): Look =>
  craterLook({
    id: 'callisto',
    seed: 9,
    face: 192,
    facing: -50,
    hs: 0.5,
    layers: [
      { f: 1.5, dn: 0.5, rmin: 0.2, rmax: 0.32, depth: 0.5 },
      { f: 3, dn: 0.7, rmin: 0.14, rmax: 0.3, depth: 0.5, fresh: 0.1 },
      { f: 6, dn: 0.85, rmin: 0.14, rmax: 0.3, depth: 0.5, fresh: 0.1 },
      { f: 12, dn: 0.9, rmin: 0.14, rmax: 0.3, depth: 0.45, fresh: 0.1 },
      { f: 18, dn: 0.9, rmin: 0.14, rmax: 0.3, depth: 0.4, fresh: 0.1 }
    ],
    basins: [
      {
        lon: -56,
        lat: 15,
        rad: 0.075,
        depth: 0.12,
        rings: 5,
        reach: 5.2,
        core: 1.4,
        glow: 1,
        warp: (x: number, y: number, z: number) => (fbm(x * 7, y * 7, z * 7, 2) - 0.5) * 0.25
      },
      { lon: 140, lat: 32, rad: 0.04, depth: 0.1, rings: 4, reach: 4, core: 1.2, glow: 0.9 }
    ],
    m2: (x: number, y: number, z: number) => fbm(x * 5 + 3, y * 5, z * 5, 3),
    noiseAmt: 1.3,
    palette: [
      [0, [44, 38, 34]],
      [0.5, [70, 62, 54]],
      [1, [104, 92, 80]]
    ],
    bright: [204, 200, 194],
    brightAmt: 1.3
  });
