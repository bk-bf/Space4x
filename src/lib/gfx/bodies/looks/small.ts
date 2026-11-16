import { craterLook } from './cratered.ts';
import { fbm, clamp, smoothstep, lonlat, warped } from './terrain.ts';
import { h3 } from './math.ts';
import type { Look } from './types.ts';
import { toward } from './colour.ts';

const OCC = lonlat(-121, 20);
const OCC2 = lonlat(-120, 18);
const occator = (x: number, y: number, z: number) => {
  const a = h3(x - OCC[0], y - OCC[1], z - OCC[2]),
    b = h3(x - OCC2[0] - 0.012, y - OCC2[1] + 0.01, z - OCC2[2] - 0.015);
  return Math.max(
    1 - smoothstep(0.012, 0.035, a),
    (1 - smoothstep(0.008, 0.022, b)) * 0.9,
    (1 - smoothstep(0.03, 0.1, a)) * 0.5
  );
};

export const ceres = (): Look =>
  craterLook({
    id: 'ceres',
    seed: 83,
    face: 192,
    facing: -121,
    hs: 0.5,
    layers: [
      { f: 1.6, dn: 0.4, rmin: 0.2, rmax: 0.32, depth: 0.5 },
      { f: 3.2, dn: 0.6, rmin: 0.14, rmax: 0.3, depth: 0.5, fresh: 0.04 },
      { f: 6.4, dn: 0.75, rmin: 0.14, rmax: 0.3, depth: 0.45 },
      { f: 12, dn: 0.8, rmin: 0.14, rmax: 0.3, depth: 0.4 }
    ],
    features: [{ lon: -121, lat: 20, rad: 0.1, depth: 0.5, flat: true, peak: true }],
    m1: occator,
    m2: (x: number, y: number, z: number) => fbm(x * 4 + 2, y * 4, z * 4, 3),
    noiseFreq: 5,
    noiseAmt: 1.2,
    palette: [
      [0, [76, 74, 72]],
      [0.5, [106, 104, 100]],
      [1, [138, 136, 130]]
    ],
    bright: [190, 188, 184],
    brightAmt: 0.9,
    post: (x, y, z, R, dv, G, O) => {
      if (G[3] > 0.03) toward(O, [240, 244, 248], clamp(G[3] * 1.3, 0, 1));
    }
  });

const PHOBOS_GROOVE = (x: number, y: number, z: number) =>
  Math.sin(warped(x, y, z, 2, 0.7, 5, 3) * 150) * smoothstep(0.1, 0.5, z + 0.2 * x);

export const phobos = (): Look =>
  craterLook({
    id: 'phobos',
    seed: 89,
    face: 128,
    facing: 60,
    hs: 0.55,
    bump: 1.1,
    shape: [1, 0.7, 0.875],
    lumpy: { amp: 0.14, lump: 0.07, dent: 0.16, ridge: 0.05 },
    layers: [
      { f: 2.4, dn: 0.7, rmin: 0.16, rmax: 0.3, depth: 0.6 },
      { f: 5, dn: 0.85, rmin: 0.14, rmax: 0.3, depth: 0.5 },
      { f: 10, dn: 0.9, rmin: 0.14, rmax: 0.3, depth: 0.45 }
    ],
    features: [{ lon: 90, lat: 5, rad: 0.36, depth: 0.5, peak: false }],
    extraH: (x: number, y: number, z: number) => PHOBOS_GROOVE(x, y, z) * 0.005,
    extraScale: 0,
    noiseFreq: 4,
    noiseAmt: 1.0,
    palette: [
      [0, [72, 64, 60]],
      [0.5, [100, 90, 82]],
      [1, [130, 118, 108]]
    ],
    bright: [150, 148, 150],
    brightAmt: 0.5,
    post: (x, y, z, R, dv, G, O) => {
      if (G[1] > 0.05) toward(O, [136, 140, 150], clamp(G[1] * 0.5, 0, 0.5));
    }
  });

export const deimos = (): Look =>
  craterLook({
    id: 'deimos',
    seed: 97,
    face: 128,
    facing: 30,
    hs: 0.5,
    bump: 0.9,
    shape: [1, 0.77, 0.65],
    lumpy: { amp: 0.2, lump: 0.11, dent: 0.2, ridge: 0.06 },
    layers: [
      { f: 2.4, dn: 0.55, rmin: 0.16, rmax: 0.3, depth: 0.45 },
      { f: 5, dn: 0.7, rmin: 0.14, rmax: 0.3, depth: 0.4 },
      { f: 9, dn: 0.8, rmin: 0.14, rmax: 0.3, depth: 0.35 }
    ],
    damp: () => 0.35,
    noiseFreq: 4,
    noiseAmt: 0.8,
    palette: [
      [0, [112, 98, 86]],
      [0.5, [140, 124, 110]],
      [1, [168, 150, 134]]
    ],
    bright: [180, 170, 160],
    brightAmt: 0.4
  });
