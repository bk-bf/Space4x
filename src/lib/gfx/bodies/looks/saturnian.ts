import type { RGB } from '#lib/gfx/palette.ts';
import { defineLook } from './define.ts';
import { craterLook } from './cratered.ts';
import { fbm, contour, warped, clamp, smoothstep, lonlat, type V3 } from './terrain.ts';
import { toward, ramp } from './colour.ts';
import { h3 } from './math.ts';
import { type Look } from './types.ts';

export const mimas = (): Look =>
  craterLook({
    id: 'mimas',
    seed: 11,
    face: 192,
    facing: -70,
    hs: 0.5,
    layers: [
      { f: 1.6, dn: 0.4, rmin: 0.2, rmax: 0.32, depth: 0.55 },
      { f: 3.2, dn: 0.65, rmin: 0.14, rmax: 0.3, depth: 0.5, fresh: 0.04 },
      { f: 6.4, dn: 0.8, rmin: 0.14, rmax: 0.3, depth: 0.5 },
      { f: 12, dn: 0.85, rmin: 0.14, rmax: 0.3, depth: 0.45 }
    ],
    features: [{ lon: -112, lat: 0, rad: 0.34, depth: 0.95, peak: true }],
    noiseFreq: 4,
    noiseAmt: 0.8,
    palette: [
      [0, [128, 128, 132]],
      [0.5, [160, 160, 164]],
      [1, [186, 186, 190]]
    ],
    bright: [214, 214, 218]
  });

const SOUTH_POLE_STRIPES = (x: number, y: number, z: number) => {
  if (y < 0.7) return 0;
  const along = 1 - smoothstep(0.26, 0.4, Math.abs(z)),
    pole = smoothstep(0.7, 0.86, y);
  let m = 0;
  for (let k = -1.5; k <= 1.5; k++) {
    const cx = k * 0.075 + 0.35 * z * z * (k > 0 ? 1 : -1) * 0.2,
      d = Math.abs(x - cx);
    m = Math.max(m, 1 - smoothstep(0.008, 0.02, d));
  }
  return m * along * pole;
};

export const enceladus = (): Look =>
  craterLook({
    id: 'enceladus',
    seed: 13,
    face: 192,
    facing: 0,
    hs: 0.5,
    layers: [
      { f: 1.8, dn: 0.4, rmin: 0.2, rmax: 0.32, depth: 0.45 },
      { f: 3.6, dn: 0.55, rmin: 0.14, rmax: 0.3, depth: 0.4 },
      { f: 7.2, dn: 0.65, rmin: 0.14, rmax: 0.3, depth: 0.4 }
    ],
    damp: (x: number, y: number, z: number) =>
      smoothstep(0.1, 0.5, y) + (fbm(x * 3 + 1, y * 3, z * 3, 3) > 0.6 ? 0.3 : 0),
    dampAmt: 0.9,
    m1: SOUTH_POLE_STRIPES,
    m2: (x: number, y: number, z: number) => {
      if (y < 0.5) return 0;
      let m = 0;
      for (let k = -1.5; k <= 1.5; k++) m = Math.max(m, Math.exp(-((x - k * 0.075) ** 2) / 0.0018));
      return m * smoothstep(0.5, 0.8, y) * (1 - smoothstep(0.3, 0.5, Math.abs(z)));
    },
    extraH: (x: number, y: number, z: number) => -SOUTH_POLE_STRIPES(x, y, z) * 0.012,
    extraScale: 8,
    noiseFreq: 5,
    noiseAmt: 0.5,
    palette: [
      [0, [186, 198, 216]],
      [0.55, [224, 233, 244]],
      [1, [246, 250, 255]]
    ],
    bright: [255, 255, 255],
    post: (x, y, z, R, dv, G, O) => {
      if (G[4] > 0.05) toward(O, [255, 255, 255], G[4] * 0.8);
      if (G[3] > 0.05) toward(O, [110, 190, 214], clamp(G[3] * 1.2, 0, 0.95));
    }
  });

const ITHACA = ((): readonly [number, number, number] => {
  const a = lonlat(60, 20),
    n: V3 = [-a[2] * 0.7, 0.55, a[0] * 0.7],
    l = h3(n[0], n[1], n[2]);
  return [n[0] / l, n[1] / l, n[2] / l];
})();
const ITHACA_START = lonlat(60, 0);

const ithaca = (x: number, y: number, z: number) => {
  const d = Math.abs(x * ITHACA[0] + y * ITHACA[1] + z * ITHACA[2]);
  const arc = x * ITHACA_START[0] + y * ITHACA_START[1] + z * ITHACA_START[2];
  return (1 - smoothstep(0.006, 0.026, d)) * smoothstep(-0.6, -0.2, arc) * (1 - smoothstep(0.2, 0.9, arc));
};

export const tethys = (): Look =>
  craterLook({
    id: 'tethys',
    seed: 17,
    face: 192,
    facing: 75,
    hs: 0.5,
    layers: [
      { f: 1.6, dn: 0.35, rmin: 0.2, rmax: 0.32, depth: 0.5 },
      { f: 3.2, dn: 0.5, rmin: 0.14, rmax: 0.3, depth: 0.45 },
      { f: 6.4, dn: 0.65, rmin: 0.14, rmax: 0.3, depth: 0.45, fresh: 0.04 },
      { f: 12, dn: 0.7, rmin: 0.14, rmax: 0.3, depth: 0.4 }
    ],
    features: [{ lon: 100, lat: 15, rad: 0.3, depth: 0.8, peak: true }],
    extraH: (x: number, y: number, z: number) => -ithaca(x, y, z) * 0.03,
    extraScale: 8,
    m1: ithaca,
    noiseFreq: 3,
    noiseAmt: 0.7,
    palette: [
      [0, [176, 190, 208]],
      [0.5, [208, 220, 234]],
      [1, [236, 244, 252]]
    ],
    bright: [250, 252, 255],
    post: (x, y, z, R, dv, G, O) => {
      if (G[3] > 0.1) toward(O, [96, 108, 130], clamp(G[3] * 0.95, 0, 0.95));
    }
  });

const wisp = (x: number, y: number, z: number) => {
  const m = smoothstep(0.05, 0.4, x * 0.9 + z * 0.1 + (fbm(x * 2, y * 2, z * 2, 3) - 0.5) * 0.7);
  const l = Math.max(
    contour(warped(x, y, z, 5, 1.4, 7, 2), 0.02),
    contour(warped(x, y, z, 9, 1.4, 21, 2), 0.012) * 0.7
  );
  return l * m;
};

export const dione = (): Look =>
  craterLook({
    id: 'dione',
    seed: 19,
    face: 192,
    facing: 50,
    hs: 0.5,
    layers: [
      { f: 1.6, dn: 0.35, rmin: 0.2, rmax: 0.32, depth: 0.5 },
      { f: 3.2, dn: 0.55, rmin: 0.14, rmax: 0.3, depth: 0.45 },
      { f: 6.4, dn: 0.7, rmin: 0.14, rmax: 0.3, depth: 0.45, fresh: 0.05 },
      { f: 12, dn: 0.75, rmin: 0.14, rmax: 0.3, depth: 0.4 }
    ],
    extraH: (x: number, y: number, z: number) => wisp(x, y, z) * 0.006,
    extraScale: 8,
    m1: wisp,
    m2: (x: number, _y: number, _z: number) => smoothstep(-0.2, 0.6, x),
    noiseFreq: 4,
    noiseAmt: 0.9,
    palette: [
      [0, [150, 142, 128]],
      [0.5, [192, 184, 168]],
      [1, [226, 218, 200]]
    ],
    bright: [250, 246, 232],
    post: (x, y, z, R, dv, G, O) => {
      toward(O, [112, 106, 96], clamp(0.6 * (1 - G[4]), 0, 1));
      if (G[3] > 0.05) toward(O, [255, 252, 240], clamp(G[3] * 1.5, 0, 0.9));
    }
  });

export const rhea = (): Look =>
  craterLook({
    id: 'rhea',
    seed: 23,
    face: 192,
    facing: -30,
    hs: 0.5,
    layers: [
      { f: 1.3, dn: 0.5, rmin: 0.2, rmax: 0.34, depth: 0.6 },
      { f: 2.6, dn: 0.7, rmin: 0.16, rmax: 0.32, depth: 0.55, fresh: 0.05 },
      { f: 6.4, dn: 0.8, rmin: 0.14, rmax: 0.3, depth: 0.5, fresh: 0.04 },
      { f: 12, dn: 0.85, rmin: 0.14, rmax: 0.3, depth: 0.45 }
    ],
    features: [
      { lon: -112, lat: 14, rad: 0.03, depth: 0.5, fresh: true, rayLen: 12, rays: { n: 8, ph: 0.7, k: 1 } }
    ],
    m2: (x: number, _y: number, _z: number) => smoothstep(-0.3, 0.4, x),
    noiseFreq: 5,
    noiseAmt: 1.0,
    palette: [
      [0, [92, 88, 86]],
      [0.5, [128, 124, 120]],
      [1, [168, 164, 158]]
    ],
    bright: [232, 230, 224],
    post: (x, y, z, R, dv, G, O) => {
      toward(O, [78, 72, 68], 0.55 * G[4]);
    }
  });

export const titan = (): Look =>
  defineLook({
    id: 'titan',
    face: 128,
    atmo: { c: [226, 150, 58], k: 2.4, rim: 0.95 },
    halo: { c: [110, 128, 200], k: 1.6 },
    rimW: 0.62,
    channels: [
      (x: number, y: number, z: number) => fbm(x * 1.6 + 4, y * 4.2, z * 1.6, 4),
      (x: number, y: number, z: number) => fbm(x * 6, y * 14, z * 6, 3)
    ],
    shade: (x, y, z, R, dv, G, O) => {
      const n = G[0] + (G[1] - 0.5) * 0.15;
      ramp(
        O,
        [
          [0.3, [186, 120, 40]],
          [0.5, [214, 146, 56]],
          [0.7, [232, 170, 78]]
        ],
        n
      );
      const north = clamp((-y - 0.55) * 3.4, 0, 1);
      if (north > 0) toward(O, [140, 84, 34], north * 0.7);
      const band = clamp((Math.abs(y + 0.05) - 0.48) * 6, 0, 1);
      if (band > 0 && y > 0) toward(O, [196, 126, 48], 0.1 * band);
    }
  });

const IAPETUS_APEX = lonlat(90, 0);
const iapDark = (x: number, y: number, z: number) => {
  const d = x * IAPETUS_APEX[0] + y * IAPETUS_APEX[1] + z * IAPETUS_APEX[2];
  return smoothstep(-0.05, 0.22, d + (fbm(x * 3.5 + 6, y * 3.5, z * 3.5, 5) - 0.5) * 0.55);
};

export const iapetus = (): Look =>
  craterLook({
    id: 'iapetus',
    seed: 29,
    face: 192,
    facing: 52,
    hs: 0.5,
    layers: [
      { f: 1.5, dn: 0.4, rmin: 0.2, rmax: 0.32, depth: 0.55 },
      { f: 3, dn: 0.6, rmin: 0.14, rmax: 0.3, depth: 0.5, fresh: 0.05 },
      { f: 6, dn: 0.75, rmin: 0.14, rmax: 0.3, depth: 0.5 },
      { f: 12, dn: 0.8, rmin: 0.14, rmax: 0.3, depth: 0.45 }
    ],
    extraH: (x: number, y: number, z: number) =>
      Math.exp(-(y * y) / 0.00014) * 0.012 * smoothstep(-0.2, 0.7, z + 0.3 * x + 0.5),
    extraScale: 6,
    m1: iapDark,
    m2: (x: number, y: number, _z: number) => Math.exp(-(y * y) / 0.00014),
    noiseFreq: 4,
    noiseAmt: 0.9,
    palette: [
      [0, [188, 184, 176]],
      [0.5, [222, 218, 208]],
      [1, [238, 236, 228]]
    ],
    bright: [244, 242, 236],
    post: (x, y, z, R, dv, G, O, hgt) => {
      const d = G[3];
      if (d > 0.02) {
        const c: RGB = [42, 32, 28];
        const lift = G[1] > 0.1 ? 0.5 : 0;
        toward(O, c, clamp(d * 1.02, 0, 1) * (1 - lift * 0.6));
      } else if (hgt < -0.22) toward(O, [74, 62, 54], clamp(-hgt - 0.22, 0, 1) * 1.4);
      if (G[4] > 0.15) toward(O, d > 0.5 ? [150, 140, 128] : [120, 112, 104], G[4] * 0.55);
    }
  });

export const hyperion = (): Look =>
  craterLook({
    id: 'hyperion',
    seed: 31,
    face: 192,
    facing: 20,
    hs: 0.6,
    bump: 1.1,
    layers: [
      { f: 2.2, dn: 0.7, rmin: 0.2, rmax: 0.34, depth: 0.85, flat: true },
      { f: 4.4, dn: 0.8, rmin: 0.16, rmax: 0.34, depth: 0.9, flat: true },
      { f: 8.8, dn: 0.85, rmin: 0.16, rmax: 0.34, depth: 0.9, flat: true },
      { f: 15, dn: 0.9, rmin: 0.16, rmax: 0.32, depth: 0.8, flat: true }
    ],
    shape: [1, 0.56, 0.74],
    lumpy: { amp: 0.18, lump: 0.07, dent: 0.22, ridge: 0.05 },
    noiseFreq: 5,
    noiseAmt: 0.9,
    floorAt: 0.1,
    floorAmt: 1.6,
    floor: [96, 58, 42],
    palette: [
      [0, [176, 160, 134]],
      [0.5, [200, 186, 160]],
      [1, [222, 210, 186]]
    ],
    bright: [236, 228, 208],
    addK: 0.2
  });
