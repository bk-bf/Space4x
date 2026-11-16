import { craterLook } from './cratered.ts';
import { lonlat, blob, fbm, clamp } from './terrain.ts';
import { toward } from './colour.ts';
import type { Look } from './types.ts';

const MARIA_SRC: readonly (readonly [number, number, number, number])[] = [
  [-16, 33, 0.31, 1.0],
  [18, 28, 0.18, 1.0],
  [31, 9, 0.21, 1.0],
  [59, 17, 0.12, 1.0],
  [51, -8, 0.15, 1.0],
  [34, -15, 0.08, 1.0],
  [-15, -21, 0.18, 1.0],
  [-39, -24, 0.1, 1.0],
  [-57, 14, 0.44, 1.0],
  [0, 58, 0.075, 0.7],
  [3, 14, 0.05, 0.8],
  [-18, 50, 0.07, 0.6],
  [-95, -19, 0.08, 0.8],
  [129, -20, 0.045, 0.9],
  [147, 27, 0.04, 0.6],
  [-30, 40, 0.1, 0.5]
];

const MARIA = MARIA_SRC.map(([lon, lat, rad, k]) => ({ v: lonlat(lon, lat), rad, k }));

function mare(x: number, y: number, z: number): number {
  const w = (fbm(x * 5 + 3, y * 5, z * 5, 4) - 0.5) * 0.3 + (fbm(x * 16 + 2, y * 16, z * 16, 3) - 0.5) * 0.1;
  let rest = 1;
  for (let i = 0; i < MARIA.length; i++) {
    const b = MARIA[i]!;
    rest *= 1 - blob(x, y, z, b.v, b.rad, b.rad * 0.16, w * (0.7 + b.rad * 3)) * b.k;
  }
  const m = 1 - rest;
  return m;
}

export const moon = (): Look =>
  craterLook({
    id: 'luna',
    seed: 2,
    face: 192,
    hs: 0.55,
    bump: 0.9,
    facing: 0,
    layers: [
      { f: 1.3, dn: 0.35, rmin: 0.2, rmax: 0.32, depth: 0.55 },
      { f: 2.6, dn: 0.5, rmin: 0.14, rmax: 0.3, depth: 0.5 },
      { f: 5.5, dn: 0.7, rmin: 0.14, rmax: 0.3, depth: 0.45, fresh: 0.04 },
      { f: 11, dn: 0.8, rmin: 0.14, rmax: 0.3, depth: 0.4 },
      { f: 16, dn: 0.85, rmin: 0.14, rmax: 0.3, depth: 0.4 }
    ],
    features: [
      { lon: -11, lat: -43, rad: 0.03, depth: 0.5, fresh: true, rayLen: 20, rays: { n: 9, ph: 0.4, k: 1 } },
      { lon: -20, lat: 10, rad: 0.022, depth: 0.5, fresh: true, rayLen: 9, rays: { n: 7, ph: 1.1, k: 0.9 } },
      { lon: -38, lat: 8, rad: 0.014, depth: 0.45, fresh: true, rayLen: 6, rays: { n: 6, ph: 2.1, k: 0.8 } },
      { lon: -47, lat: 24, rad: 0.012, depth: 0.4, fresh: true, rayLen: 4, rays: { n: 5, ph: 0.2, k: 0.7 } },
      { lon: 129, lat: -20, rad: 0.05, depth: 0.55, flat: true },
      { lon: -3, lat: -60, rad: 0.05, depth: 0.5, fresh: true, rayLen: 3 },
      { lon: 120, lat: 5, rad: 0.04, depth: 0.5 }
    ],
    damp: mare,
    dampAmt: 0.78,
    m1: (x: number, y: number, z: number) => mare(x, y, z),
    m2: (x: number, y: number, z: number) => fbm(x * 9 + 4, y * 9, z * 9, 3),
    noiseAmt: 1.5,
    palette: [
      [0, [138, 136, 132]],
      [0.5, [176, 174, 168]],
      [1, [204, 202, 196]]
    ],
    bright: [236, 234, 228],
    brightAmt: 1,
    post: (x, y, z, R, dv, G, O) => {
      const m = G[3];
      if (m > 0.03) {
        const t = G[4];
        toward(O, [90 + t * 22, 90 + t * 24, 98 + t * 26], clamp(m * 1.15, 0, 0.93));
      }
    }
  });
