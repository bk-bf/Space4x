import type { RGB } from '#lib/gfx/palette.ts';
import { setc } from './colour.ts';
import { defineLook } from './define.ts';
import { fbm, noise3 } from './terrain.ts';
import { ADD, LAND, SEA, type Look, type Shader } from './types.ts';

const FACE = 256;

const TERR: readonly RGB[] = [
  [18, 40, 100],
  [28, 64, 134],
  [52, 112, 160],
  [196, 180, 130],
  [64, 120, 66],
  [44, 96, 58],
  [170, 150, 96],
  [128, 116, 108],
  [226, 232, 238]
];
const JUP: readonly RGB[] = [
  [196, 160, 118],
  [226, 198, 158],
  [164, 112, 76],
  [238, 222, 192],
  [142, 92, 66],
  [210, 176, 130]
];
const SATC: readonly RGB[] = [
  [214, 190, 136],
  [234, 214, 166],
  [190, 164, 112],
  [224, 202, 150]
];
const NEPTUNE_BANDS: readonly RGB[] = [
  [64, 100, 210],
  [90, 130, 230],
  [48, 76, 170]
];
const URANUS_BANDS: readonly RGB[] = [
  [160, 214, 222],
  [170, 221, 228],
  [154, 208, 220]
];

const CLOUD_LON = (2.2 / 512) * Math.PI * 2;
const CLOUD_LAT = (-1.6 / 255) * Math.PI;

type Field = (x: number, y: number, z: number) => number;

const shifted =
  (def: Field, dLon: number, dLat: number): Field =>
  (x, y, z) => {
    const lat = Math.asin(Math.max(-1, Math.min(1, y))) + dLat,
      lon = Math.atan2(z, x) + dLon,
      c = Math.cos(lat);
    return def(Math.cos(lon) * c, Math.sin(lat), Math.sin(lon) * c);
  };
const terranCloud: Field = (x, y, z) => fbm(x * 3.2 + 40, y * 5.2 + 9, z * 3.2, 5);

export const earth = (): Look =>
  defineLook({
    id: 'earth',
    face: FACE,
    tint: [52, 112, 160],
    channels: [
      (x, y, z) => fbm(x * 2.4 + 5, y * 2.4, z * 2.4, 6),
      terranCloud,
      (x, y, z) => fbm(x * 6 + 2, y * 6, z * 6, 3),
      shifted(terranCloud, CLOUD_LON, CLOUD_LAT),
      (x, y, z) => noise3(x * 38 + 1, y * 38, z * 38),
      (x, y, z) => noise3(x * 30, y * 30, z * 30)
    ],
    atmo: { c: [80, 150, 235] },
    shade: (_x, y, _z, R, dv, G, O) => {
      const dt = R > 80 ? (G[4] - 0.5) * (R > 350 ? 0.05 : 0.03) : 0,
        h = G[0] + dt,
        cl = G[1] + dt * 0.8;
      if (cl > 0.61 || dv < (cl - 0.575) / (0.61 - 0.575))
        return setc(O, cl > 0.61 ? [240, 244, 248] : [206, 216, 230]);
      if (Math.abs(y) > 0.88 - (h - 0.5) * 0.5) return setc(O, TERR[8]!);
      if (h < 0.53) {
        O[SEA] = 1;
        setc(O, h < 0.44 ? TERR[0]! : h < 0.5 ? TERR[1]! : TERR[2]!);
      } else {
        O[LAND] = 1;
        const m = G[2] + dt;
        setc(
          O,
          h < 0.54
            ? TERR[3]!
            : h > 0.74
              ? TERR[8]!
              : h > 0.68
                ? TERR[7]!
                : m > 0.58 || (Math.abs(y) < 0.12 && m > 0.5)
                  ? TERR[6]!
                  : m > 0.47
                    ? TERR[4]!
                    : TERR[5]!
        );
        O[ADD] = (h - 0.6) * 0.9;
      }
      if (G[3] > 0.61) {
        O[0] *= 0.6;
        O[1] *= 0.6;
        O[2] *= 0.72;
      }
    }
  });

export const mars = (): Look =>
  defineLook({
    id: 'mars',
    face: FACE,
    tint: [190, 108, 62],
    channels: [
      (x, y, z) => fbm(x * 2.2 + 11, y * 2.2, z * 2.2, 6),
      (x, y, z) => fbm(x * 5 + 2, y * 5, z * 5, 3),
      (x, _y, z) => fbm(x * 2 + 9, 3, z * 2, 3),
      (x, y, z) => noise3(x * 7 + 3, y * 7, z * 7),
      (x, y, z) => noise3(x * 17 + 8, y * 17, z * 17)
    ],
    atmo: { c: [214, 150, 110] },
    shade: (x, y, _z, R, _dv, G, O) => {
      const h = G[0],
        e = G[1],
        cap = (y < 0 ? 0.88 : 0.94) - (e - 0.5) * 0.5,
        a = Math.abs(y);
      if (a > cap) return setc(O, [232, 220, 210]);
      if (a > cap - 0.04) return setc(O, [206, 156, 122]);
      O[LAND] = 1;
      O[ADD] = (e - 0.5) * 0.7;
      const c1 = G[3],
        c2 = R > 40 ? G[4] : 0;
      if (Math.abs(y + 0.08 - (G[2] - 0.5) * 0.3) < 0.014 && x > -0.5 && x < 0.6) {
        O[ADD] = -0.5;
        return setc(O, [98, 44, 34]);
      }
      if (c1 > 0.75 || c2 > 0.8) {
        O[ADD] = -0.35;
        return setc(O, [124, 58, 40]);
      }
      if (c1 > 0.71 || c2 > 0.765) {
        O[ADD] = 0.45;
        return setc(O, [214, 140, 92]);
      }
      setc(
        O,
        h < 0.42 ? [112, 52, 36] : h < 0.52 ? [156, 78, 44] : h < 0.62 ? [190, 108, 62] : [214, 148, 96]
      );
    }
  });

export const venus = (): Look =>
  defineLook({
    id: 'venus',
    face: FACE,
    tint: [232, 204, 132],
    channels: [
      (x, y, z) => fbm(x * 1.4 + 3, y * 3.4 + Math.abs(x) * 1.1, z * 1.4, 6),
      (x, y, z) => fbm(x * 5, y * 11, z * 5, 3)
    ],
    atmo: { c: [240, 214, 150] },
    shade: (_x, _y, _z, _R, _dv, G, O) => {
      const w = G[0] + (G[1] - 0.5) * 0.18;
      setc(
        O,
        w < 0.42 ? [168, 130, 64] : w < 0.5 ? [204, 166, 88] : w < 0.58 ? [232, 204, 132] : [244, 228, 176]
      );
    }
  });

const gasChannels = [
  (x: number, y: number, z: number) => fbm(x * 2.4, y * 2.4 + 20, z * 2.4, 6),
  (x: number, y: number, z: number) => fbm(x * 7 + 4, y * 16, z * 7, 3),
  (x: number, y: number, z: number) => fbm(x * 26 + 1, y * 60, z * 26, 3),
  (x: number, y: number, z: number) => noise3(x * 9 + 2, y * 22, z * 9)
];

const bands =
  (jupiter: boolean): Shader =>
  (x, y, z, R, dv, G, O) => {
    const P = jupiter ? JUP : SATC;
    if (jupiter) {
      const sx = x - 0.45,
        sy = y - 0.28,
        sd = sx * sx * 0.5 + sy * sy * 2.2;
      if (z > 0 && sd < 0.012) return setc(O, sd < 0.006 ? [176, 70, 52] : [200, 96, 66]);
      if (z > 0 && sd < 0.016) return setc(O, [238, 222, 192]);
    }
    const fine = G[1] - 0.5,
      band =
        y * (jupiter ? 6.2 : 4.6) +
        (G[0] - 0.5) * (jupiter ? 1.5 : 0.9) +
        fine * (jupiter ? 0.7 : 0.4) +
        (R > 150 ? (G[2] - 0.5) * 0.45 : 0) +
        20,
      bi = Math.floor(band),
      fr = band - bi;
    setc(O, P[(bi + (fr > 0.8 && dv > (1 - fr) * 5 ? 1 : 0)) % P.length]!);
    if (jupiter && R > 30 && Math.abs(y) > 0.3 && G[3] > 0.8) setc(O, [240, 228, 204]);
    O[ADD] = fine * 0.5;
  };

export const jupiter = (): Look =>
  defineLook({
    id: 'jupiter',
    face: FACE,
    tint: [210, 176, 130],
    channels: gasChannels,
    atmo: { c: [226, 200, 160] },
    shade: bands(true)
  });

export const saturn = (): Look =>
  defineLook({
    id: 'saturn',
    face: FACE,
    tint: [214, 190, 136],
    channels: gasChannels,
    atmo: { c: [230, 210, 160] },
    rings: true,
    shade: bands(false)
  });

const iceChannels = [
  (x: number, y: number, z: number) => fbm(x * 1.6 + 9, y * 3 + 2, z * 1.6, 6),
  (x: number, y: number, z: number) => noise3(x * 6, y * 20 + 3, z * 6)
];

export const uranus = (): Look =>
  defineLook({
    id: 'uranus',
    face: FACE,
    tint: [170, 221, 228],
    channels: iceChannels,
    atmo: { c: [170, 230, 240] },
    shade: (_x, y, _z, _R, _dv, G, O) => {
      setc(O, URANUS_BANDS[Math.floor(y * 3 + (G[0] - 0.5) * 1.2 + 20) % 3]!);
      const hood = Math.max(0, Math.abs(y) - 0.5) * 2;
      O[0] += (196 - O[0]) * hood * 0.5;
      O[1] += (238 - O[1]) * hood * 0.5;
      O[2] += (242 - O[2]) * hood * 0.5;
    }
  });

export const neptune = (): Look =>
  defineLook({
    id: 'neptune',
    face: FACE,
    tint: [90, 130, 230],
    channels: iceChannels,
    atmo: { c: [110, 150, 250] },
    shade: (x, y, z, R, _dv, G, O) => {
      if (z > 0 && (x + 0.3) ** 2 * 0.6 + (y - 0.3) ** 2 * 2.4 < 0.012) return setc(O, [32, 50, 130]);
      if (R > 30 && G[1] > 0.82) return setc(O, [200, 214, 250]);
      setc(O, NEPTUNE_BANDS[Math.floor(y * 3 + (G[0] - 0.5) * 1.2 + 20) % 3]!);
    }
  });
