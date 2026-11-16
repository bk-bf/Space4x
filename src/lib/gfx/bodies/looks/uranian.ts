import { defineLook } from './define.ts';
import { craterLook } from './cratered.ts';
import {
  fbm,
  contour,
  warped,
  clamp,
  smoothstep,
  lonlat,
  worley,
  craterLayer,
  layers,
  C,
  clearC
} from './terrain.ts';
import { setc, toward } from './colour.ts';
import { h3 } from './math.ts';
import { LAND, type Look } from './types.ts';

const MIR_LAYERS = layers(
  [
    { f: 4, dn: 0.45, rmin: 0.16, rmax: 0.32, depth: 0.5 },
    { f: 8, dn: 0.55, rmin: 0.14, rmax: 0.3, depth: 0.45 }
  ],
  41
);

export const miranda = (): Look => {
  let lx = NaN,
    ly = 0,
    lz = 0,
    f1 = 0,
    f2 = 0,
    id = 0,
    cx = 0,
    cy = 0,
    cz = 0,
    raw = 0,
    rel = 0;
  const compute = (x: number, y: number, z: number) => {
    if (x === lx && y === ly && z === lz) return;
    lx = x;
    ly = y;
    lz = z;
    const w = worley(
      x + (fbm(x * 3, y * 3, z * 3, 2) - 0.5) * 0.3,
      y + (fbm(x * 3 + 5, y * 3, z * 3, 2) - 0.5) * 0.3,
      z,
      2.3,
      5
    );
    f1 = w.f1;
    f2 = w.f2;
    id = w.id;
    cx = w.cx;
    cy = w.cy;
    cz = w.cz;
    const kind = id < 0.35 ? 0 : id < 0.7 ? 1 : 2;
    clearC();
    if (kind !== 2) for (let i = 0; i < MIR_LAYERS.length; i++) craterLayer(x, y, z, MIR_LAYERS[i]!);
    raw = C.h;
    rel = C.rel;
    const edge = 1 - smoothstep(0, 0.1, f2 - f1);
    raw -= edge * 0.012;
    if (kind === 2) {
      const stripes = Math.sin(
        (cx * 0.7 + cy * 0.5 + cz * 0.3 + id * 20) * 0 + (x * (id * 5 - 2) + y * 3 * (id - 0.8) + z * 4) * 40
      );
      raw += stripes * 0.004;
    }
    raw += (id - 0.5) * 0.01;
  };
  const defs = [
    (x: number, y: number, z: number) => {
      compute(x, y, z);
      return 0.5 + rel * 0.4;
    },
    (x: number, y: number, z: number) => {
      compute(x, y, z);
      return id;
    },
    (x: number, y: number, z: number) => {
      compute(x, y, z);
      return 1 - smoothstep(0, 0.1, f2 - f1);
    },
    (x: number, y: number, z: number) => fbm(x * 6 + 1, y * 6, z * 6, 3)
  ];
  return defineLook({
    id: 'miranda',
    face: 192,
    bump: 1,
    gradRange: 1.2,
    facing: 0,
    rawOf: () => raw,
    channels: defs,
    shade: (x, y, z, R, dv, G, O) => {
      const id = G[1],
        kind = id < 0.35 ? 0 : id < 0.7 ? 1 : 2;
      const a = G[3];
      setc(O, kind === 0 ? [112, 114, 120] : kind === 1 ? [158, 160, 164] : [194, 196, 200]);
      toward(O, [140, 142, 148], (a - 0.5) * 0.4);
      if (G[2] > 0.3) toward(O, [78, 80, 90], clamp(G[2] * 0.7, 0, 0.8));
      const h = (G[0] - 0.5) / 0.4;
      if (h < -0.3 && kind !== 2) toward(O, [90, 92, 98], clamp(-h - 0.3, 0, 0.5));
      O[LAND] = 1;
    }
  });
};

const lin = (x: number, y: number, z: number, f: number, seed: number, w: number) =>
  contour(warped(x, y, z, f, 1.3, seed, 3), w);

export const ariel = (): Look =>
  craterLook({
    id: 'ariel',
    seed: 43,
    face: 192,
    facing: 10,
    hs: 0.5,
    layers: [
      { f: 2, dn: 0.3, rmin: 0.16, rmax: 0.3, depth: 0.5 },
      { f: 4, dn: 0.45, rmin: 0.14, rmax: 0.3, depth: 0.45, fresh: 0.06 },
      { f: 8, dn: 0.5, rmin: 0.14, rmax: 0.3, depth: 0.4 }
    ],
    damp: (x: number, y: number, z: number) => smoothstep(0.5, 0.65, fbm(x * 2 + 9, y * 2, z * 2, 3)),
    dampAmt: 0.5,
    extraH: (x: number, y: number, z: number) =>
      -(lin(x, y, z, 1.8, 3, 0.03) * 0.018 + lin(x, y, z, 3.6, 17, 0.018) * 0.01),
    extraScale: 6,
    m1: (x: number, y: number, z: number) =>
      Math.max(lin(x, y, z, 1.8, 3, 0.03), lin(x, y, z, 3.6, 17, 0.018) * 0.8),
    noiseFreq: 4,
    noiseAmt: 0.9,
    palette: [
      [0, [150, 148, 146]],
      [0.5, [184, 182, 178]],
      [1, [214, 212, 208]]
    ],
    bright: [238, 238, 236],
    post: (x, y, z, R, dv, G, O) => {
      if (G[3] > 0.03) toward(O, [104, 102, 104], clamp(G[3] * 0.7, 0, 0.7));
    }
  });

export const umbriel = (): Look =>
  craterLook({
    id: 'umbriel',
    seed: 47,
    face: 192,
    facing: 270,
    hs: 0.5,
    layers: [
      { f: 1.8, dn: 0.4, rmin: 0.2, rmax: 0.32, depth: 0.5 },
      { f: 3.6, dn: 0.6, rmin: 0.14, rmax: 0.3, depth: 0.45 },
      { f: 7.2, dn: 0.75, rmin: 0.14, rmax: 0.3, depth: 0.45 },
      { f: 13, dn: 0.8, rmin: 0.14, rmax: 0.3, depth: 0.4 }
    ],
    features: [{ lon: 270, lat: 6, rad: 0.1, depth: 0.5, flat: true }],
    m1: (x: number, y: number, z: number) => {
      const c = lonlat(270, 6),
        d = h3(x - c[0], y - c[1], z - c[2]);
      return Math.max(
        1 - smoothstep(0.012, 0.03, Math.abs(d - 0.085)),
        (1 - smoothstep(0.04, 0.075, d)) * 0.45
      );
    },
    noiseFreq: 4,
    noiseAmt: 0.6,
    palette: [
      [0, [70, 70, 72]],
      [0.5, [92, 92, 94]],
      [1, [112, 112, 112]]
    ],
    bright: [150, 150, 148],
    brightAmt: 0.6,
    post: (x, y, z, R, dv, G, O) => {
      if (G[3] > 0.05) toward(O, [214, 216, 212], clamp(G[3] * 1.2, 0, 0.97));
    }
  });

export const titania = (): Look =>
  craterLook({
    id: 'titania',
    seed: 53,
    face: 192,
    facing: 30,
    hs: 0.5,
    layers: [
      { f: 1.8, dn: 0.4, rmin: 0.2, rmax: 0.32, depth: 0.5 },
      { f: 3.6, dn: 0.55, rmin: 0.14, rmax: 0.3, depth: 0.45, fresh: 0.05 },
      { f: 7.2, dn: 0.7, rmin: 0.14, rmax: 0.3, depth: 0.45 },
      { f: 13, dn: 0.75, rmin: 0.14, rmax: 0.3, depth: 0.4 }
    ],
    extraH: (x: number, y: number, z: number) => -lin(x, y, z, 1.3, 31, 0.022) * 0.03,
    extraScale: 5,
    m1: (x: number, y: number, z: number) => lin(x, y, z, 1.3, 31, 0.022),
    features: [
      { lon: 330, lat: -10, rad: 0.04, depth: 0.5, fresh: true, rayLen: 8, rays: { n: 8, ph: 0.5, k: 0.9 } }
    ],
    noiseFreq: 5,
    noiseAmt: 1.0,
    palette: [
      [0, [112, 106, 102]],
      [0.5, [146, 140, 134]],
      [1, [176, 170, 162]]
    ],
    bright: [214, 208, 200],
    post: (x, y, z, R, dv, G, O) => {
      if (G[3] > 0.03) toward(O, [94, 88, 86], clamp(G[3] * 0.8, 0, 0.8));
      O[0] *= 1.03;
    }
  });

export const oberon = (): Look =>
  craterLook({
    id: 'oberon',
    seed: 59,
    face: 192,
    facing: 100,
    hs: 0.55,
    layers: [
      { f: 1.6, dn: 0.45, rmin: 0.2, rmax: 0.32, depth: 0.55 },
      { f: 3.2, dn: 0.7, rmin: 0.14, rmax: 0.3, depth: 0.5, fresh: 0.09 },
      { f: 6.4, dn: 0.85, rmin: 0.14, rmax: 0.3, depth: 0.5, fresh: 0.07 },
      { f: 12, dn: 0.9, rmin: 0.14, rmax: 0.3, depth: 0.45 }
    ],
    floor: [66, 52, 46],
    floorAt: 0.15,
    floorAmt: 1.8,
    m2: (x: number, y: number, z: number) => fbm(x * 2.5 + 7, y * 2.5, z * 2.5, 4),
    noiseFreq: 5,
    noiseAmt: 1.1,
    palette: [
      [0, [92, 82, 76]],
      [0.5, [124, 114, 106]],
      [1, [152, 142, 132]]
    ],
    bright: [222, 218, 210],
    brightAmt: 1.2,
    post: (x, y, z, R, dv, G, O) => {
      if (G[4] > 0.58) toward(O, [96, 66, 56], clamp((G[4] - 0.58) * 4, 0, 0.7));
    }
  });
