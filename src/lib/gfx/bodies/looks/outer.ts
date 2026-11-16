import { defineLook } from './define.ts';
import { craterLook } from './cratered.ts';
import { fbm, noise3, clamp, smoothstep, lonlat, blob, worley, type V3 } from './terrain.ts';
import { toward, ramp } from './colour.ts';
import { h3 } from './math.ts';
import { LAND, type Look } from './types.ts';

export const triton = (): Look => {
  let lx = NaN,
    ly = 0,
    lz = 0,
    raw = 0,
    rel = 0,
    edge = 0;
  const compute = (x: number, y: number, z: number) => {
    if (x === lx && y === ly && z === lz) return;
    lx = x;
    ly = y;
    lz = z;
    const w = worley(x + (fbm(x * 4, y * 4, z * 4, 2) - 0.5) * 0.08, y, z, 13, 3);
    edge = 1 - smoothstep(0, 0.14, w.f2 - w.f1);
    const dim = 1 - smoothstep(0.05, 0.62, w.f1);
    rel = -dim * 0.7 + edge * 0.35;
    raw = rel * 0.014;
  };
  return defineLook({
    id: 'triton',
    face: 192,
    bump: 1,
    gradRange: 1.4,
    facing: 0,
    rawOf: () => raw,
    channels: [
      (x: number, y: number, z: number) => {
        compute(x, y, z);
        return 0.5 + rel * 0.5;
      },
      (x: number, y: number, z: number) =>
        smoothstep(
          0.3,
          0.4,
          y + (fbm(x * 3 + 3, y * 3, z * 3, 4) - 0.5) * 0.55 + (fbm(x * 9, y * 9, z * 9, 3) - 0.5) * 0.18
        ),
      (x: number, y: number, z: number) =>
        noise3(x * 7 + 2, y * 70, z * 7) * 0.55 + noise3(x * 15, y * 110, z * 15) * 0.45,
      (x: number, y: number, z: number) => fbm(x * 3 + 8, y * 3, z * 3, 4),
      (x: number, y: number, z: number) => {
        compute(x, y, z);
        return edge;
      }
    ],
    shade: (x, y, z, R, dv, G, O) => {
      ramp(
        O,
        [
          [0, [170, 126, 116]],
          [0.5, [198, 160, 150]],
          [1, [218, 186, 176]]
        ],
        clamp((G[3] - 0.3) * 2.2, 0, 1)
      );
      if (G[4] > 0.1) toward(O, [136, 94, 94], G[4] * 0.45 * (1 - G[1]));
      const cap = G[1];
      if (cap > 0.02) toward(O, [244, 222, 216], clamp(cap * 1.1, 0, 1));
      const band = y > 0.22 ? Math.min(1, (y - 0.22) * 8) * (1 - Math.min(1, Math.max(0, (y - 0.5) * 7))) : 0;
      if (band > 0 && G[2] > 0.56) toward(O, [58, 46, 52], clamp((G[2] - 0.56) * 6, 0, 0.85) * band);
      O[LAND] = 1;
    }
  });
};

const HC = lonlat(25, 6);
const HE: V3 = ((): V3 => {
  const l = h3(HC[2], HC[0]);
  return [HC[2] / l, 0, -HC[0] / l];
})();
const HS: V3 = [HC[1] * HE[2] - HC[2] * HE[1], HC[2] * HE[0] - HC[0] * HE[2], HC[0] * HE[1] - HC[1] * HE[0]];

const heart = (x: number, y: number, z: number) => {
  if (x * HC[0] + y * HC[1] + z * HC[2] < 0.2) return 0;
  const dx = x - HC[0],
    dy = y - HC[1],
    dz = z - HC[2],
    s = 0.52,
    u = (dx * HE[0] + dy * HE[1] + dz * HE[2]) / s,
    v = -(dx * HS[0] + dy * HS[1] + dz * HS[2]) / s + 0.05,
    q = u * u + v * v - 1,
    f = q * q * q - u * u * v * v * v,
    inside = 1 - smoothstep(-0.1, 0.12, f);
  return inside * (u < 0.05 ? 1 : 0.5);
};

const cthulhu = (x: number, y: number, z: number) => {
  const lon = Math.atan2(x, z),
    lat = Math.asin(clamp(-y, -1, 1)),
    w = (fbm(x * 5 + 2, y * 5, z * 5, 4) - 0.5) * 0.9 + (fbm(x * 18, y * 18, z * 18, 3) - 0.5) * 0.3,
    d = h3((lon + 0.95) / 0.75, (lat + 0.1) / 0.27 + Math.sin(lon * 2.5) * 0.25) + w;
  return 1 - smoothstep(0.85, 1.0, d);
};

export const pluto = (): Look =>
  craterLook({
    id: 'pluto',
    seed: 61,
    face: 192,
    facing: 0,
    hs: 0.5,
    layers: [
      { f: 2, dn: 0.15, rmin: 0.16, rmax: 0.3, depth: 0.4 },
      { f: 4, dn: 0.25, rmin: 0.14, rmax: 0.3, depth: 0.4, fresh: 0.05 },
      { f: 8, dn: 0.3, rmin: 0.14, rmax: 0.3, depth: 0.35 }
    ],
    damp: (x: number, y: number, z: number) => Math.min(1, heart(x, y, z) * 1.5),
    dampAmt: 1,
    m1: heart,
    m2: cthulhu,
    m3: (x: number, y: number, z: number) => {
      const h = heart(x, y, z);
      if (h < 0.9) return 0;
      const w = worley(x, y, z, 11, 9);
      return 1 - smoothstep(0, 0.07, w.f2 - w.f1);
    },
    noiseFreq: 5,
    noiseAmt: 1.5,
    palette: [
      [0, [140, 90, 66]],
      [0.5, [182, 130, 98]],
      [1, [214, 172, 140]]
    ],
    bright: [236, 226, 210],
    post: (x, y, z, R, dv, G, O) => {
      const lat = -y;
      if (lat > 0.75) toward(O, [96, 52, 42], clamp((lat - 0.75) * 5, 0, 0.75));
      const c = G[4];
      if (c > 0.03) {
        const k = clamp(c * 1.1, 0, 0.95);
        toward(O, G[2] > 0.5 ? [92, 46, 36] : [58, 28, 24], k);
      }
      const h = G[3];
      if (h > 0.02) {
        toward(O, h > 0.8 ? [246, 240, 228] : [226, 204, 176], clamp(h * 1.25, 0, 1));
        if (G[5] > 0.1) toward(O, [196, 184, 168], G[5] * 0.7);
      }
    }
  });

export const charon = (): Look =>
  craterLook({
    id: 'charon',
    seed: 67,
    face: 192,
    facing: 30,
    hs: 0.5,
    layers: [
      { f: 1.8, dn: 0.3, rmin: 0.2, rmax: 0.32, depth: 0.5 },
      { f: 3.6, dn: 0.45, rmin: 0.14, rmax: 0.3, depth: 0.45, fresh: 0.06 },
      { f: 7.2, dn: 0.55, rmin: 0.14, rmax: 0.3, depth: 0.45 }
    ],
    damp: (x: number, y: number, _z: number) => smoothstep(0.0, 0.5, y + 0.05) * 0.9,
    dampAmt: 0.85,
    extraH: (x: number, y: number, z: number) =>
      -(1 - smoothstep(0.012, 0.05, Math.abs(y + 0.18 * x - 0.02 * z))) * 0.012 * smoothstep(-0.9, -0.2, x),
    extraScale: 8,
    m1: (x: number, y: number, z: number) =>
      smoothstep(0.7, 0.88, -y + (fbm(x * 6 + 6, y * 6, z * 6, 4) - 0.5) * 0.3),
    m2: (x: number, y: number, z: number) =>
      1 - smoothstep(0.012, 0.06, Math.abs(y + 0.18 * x - 0.02 * z)) * smoothstep(-0.9, -0.2, x),
    noiseFreq: 5,
    noiseAmt: 1.1,
    palette: [
      [0, [96, 94, 96]],
      [0.5, [134, 132, 134]],
      [1, [170, 168, 170]]
    ],
    bright: [214, 212, 212],
    post: (x, y, z, R, dv, G, O) => {
      if (G[3] > 0.02) toward(O, [146, 68, 50], clamp(G[3] * 1.05, 0, 0.92));
      if (G[4] > 0.1) toward(O, [72, 70, 74], G[4] * 0.5);
    }
  });

export const eris = (): Look =>
  craterLook({
    id: 'eris',
    seed: 71,
    face: 128,
    facing: 0,
    hs: 0.4,
    bump: 0.6,
    layers: [
      { f: 2, dn: 0.1, rmin: 0.16, rmax: 0.3, depth: 0.3 },
      { f: 4, dn: 0.12, rmin: 0.14, rmax: 0.3, depth: 0.3 }
    ],
    m1: (x: number, y: number, z: number) => smoothstep(0.54, 0.7, fbm(x * 2.4 + 5, y * 2.4, z * 2.4, 4)),
    noiseFreq: 4,
    noiseAmt: 0.5,
    palette: [
      [0, [206, 204, 200]],
      [0.5, [228, 226, 222]],
      [1, [242, 240, 238]]
    ],
    bright: [250, 250, 250],
    post: (x, y, z, R, dv, G, O) => {
      if (G[3] > 0.02) toward(O, [186, 176, 168], G[3] * 0.65);
    }
  });

export const haumea = (): Look =>
  craterLook({
    id: 'haumea',
    seed: 73,
    face: 128,
    facing: 10,
    hs: 0.4,
    bump: 0.7,
    shape: [1, 0.49, 0.73],
    lumpy: { amp: 0.14, lump: 0.07, dent: 0.12, ridge: 0.04 },
    layers: [
      { f: 2, dn: 0.3, rmin: 0.16, rmax: 0.3, depth: 0.4 },
      { f: 5, dn: 0.4, rmin: 0.14, rmax: 0.3, depth: 0.4 },
      { f: 9, dn: 0.5, rmin: 0.14, rmax: 0.3, depth: 0.35 }
    ],
    m1: (x: number, y: number, z: number) =>
      blob(x, y, z, lonlat(35, 8), 0.2, 0.06, (fbm(x * 8, y * 8, z * 8, 3) - 0.5) * 0.12),
    noiseFreq: 4,
    noiseAmt: 0.4,
    palette: [
      [0, [208, 214, 222]],
      [0.5, [230, 234, 240]],
      [1, [246, 248, 252]]
    ],
    bright: [252, 252, 255],
    post: (x, y, z, R, dv, G, O) => {
      if (G[3] > 0.02) toward(O, [142, 62, 48], clamp(G[3] * 1.1, 0, 0.9));
    }
  });

export const makemake = (): Look =>
  craterLook({
    id: 'makemake',
    seed: 79,
    face: 128,
    facing: 0,
    hs: 0.4,
    bump: 0.6,
    layers: [
      { f: 2, dn: 0.1, rmin: 0.16, rmax: 0.3, depth: 0.3 },
      { f: 4, dn: 0.12, rmin: 0.14, rmax: 0.3, depth: 0.3 }
    ],
    m1: (x: number, y: number, z: number) => smoothstep(0.55, 0.68, fbm(x * 3.2 + 2, y * 3.2, z * 3.2, 4)),
    m2: (x: number, y: number, z: number) => smoothstep(0.6, 0.72, fbm(x * 4 + 12, y * 4, z * 4, 4)),
    noiseFreq: 6,
    noiseAmt: 1.6,
    palette: [
      [0, [128, 68, 46]],
      [0.5, [176, 108, 78]],
      [1, [216, 164, 128]]
    ],
    bright: [234, 212, 190],
    post: (x, y, z, R, dv, G, O) => {
      if (G[3] > 0.02) toward(O, [84, 44, 34], clamp(G[3] * 0.85, 0, 0.85));
      if (G[4] > 0.02) toward(O, [236, 212, 190], clamp(G[4] * 0.8, 0, 0.8));
    }
  });
