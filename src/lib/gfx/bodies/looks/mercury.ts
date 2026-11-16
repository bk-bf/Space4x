import { craterLook } from './cratered.ts';
import { lonlat, blob, fbm, clamp, type V3 } from './terrain.ts';
import { toward } from './colour.ts';
import type { Look } from './types.ts';

const caloris = lonlat(160, 30);
const plains: readonly (readonly [V3, number])[] = [
  [lonlat(20, 60), 0.5],
  [lonlat(-100, -30), 0.28]
];

const smoothMask = (x: number, y: number, z: number) => {
  let m = blob(x, y, z, caloris, 0.3, 0.05, (fbm(x * 5, y * 5, z * 5, 3) - 0.5) * 0.1);
  for (const [v, r] of plains)
    m = Math.max(m, blob(x, y, z, v, r, 0.08, (fbm(x * 4 + 9, y * 4, z * 4, 3) - 0.5) * 0.3) * 0.7);
  return m;
};

export const mercury = (): Look =>
  craterLook({
    id: 'mercury',
    seed: 5,
    face: 192,
    hs: 0.5,
    bump: 0.9,
    facing: 160,
    layers: [
      { f: 1.1, dn: 0.4, rmin: 0.2, rmax: 0.32, depth: 0.5 },
      { f: 2.4, dn: 0.6, rmin: 0.14, rmax: 0.3, depth: 0.5 },
      { f: 5, dn: 0.8, rmin: 0.14, rmax: 0.3, depth: 0.45, fresh: 0.05 },
      { f: 10, dn: 0.85, rmin: 0.14, rmax: 0.3, depth: 0.42 },
      { f: 15, dn: 0.9, rmin: 0.14, rmax: 0.3, depth: 0.4, fresh: 0.04 }
    ],
    features: [
      { lon: -31, lat: 11, rad: 0.02, depth: 0.5, fresh: true, rayLen: 16, rays: { n: 8, ph: 0.3, k: 1 } },
      { lon: -57, lat: 58, rad: 0.02, depth: 0.5, fresh: true, rayLen: 18, rays: { n: 10, ph: 1.7, k: 1 } },
      { lon: 70, lat: -45, rad: 0.025, depth: 0.5, fresh: true, rayLen: 12, rays: { n: 7, ph: 2.4, k: 0.9 } },
      { lon: -125, lat: -3, rad: 0.018, depth: 0.5, fresh: true, rayLen: 14, rays: { n: 9, ph: 0.9, k: 0.9 } }
    ],
    basins: [
      {
        lon: 160,
        lat: 30,
        rad: 0.3,
        depth: 0.1,
        rings: 2.5,
        reach: 2,
        core: 0.01,
        glow: 0,
        warp: (x: number, y: number, z: number) => (fbm(x * 7, y * 7, z * 7, 3) - 0.5) * 0.8
      }
    ],
    noiseFreq: 6,
    damp: smoothMask,
    dampAmt: 0.85,
    m1: smoothMask,
    m2: (x: number, y: number, z: number) => fbm(x * 3 + 20, y * 3, z * 3, 3),
    noiseAmt: 1.4,
    palette: [
      [0, [84, 78, 74]],
      [0.5, [124, 116, 108]],
      [1, [158, 148, 136]]
    ],
    bright: [222, 218, 210],
    brightAmt: 1.15,
    floor: [74, 70, 70],
    floorAmt: 1.2,
    post: (x, y, z, R, dv, G, O) => {
      if (G[3] > 0.05) toward(O, [168, 148, 118], clamp(G[3] * 0.85, 0, 1));
      if (G[4] > 0.62) toward(O, [74, 76, 88], (G[4] - 0.62) * 3 * 0.8);
    }
  });
