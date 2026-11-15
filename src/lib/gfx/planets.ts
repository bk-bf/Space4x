import type { Surface } from './framebuffer';
import { clamp, hash } from './math';
import { dith, fbm, noise3 } from './noise';
import type { RGB } from './palette';

export type PlanetType = 'terran' | 'mars' | 'venus' | 'gas' | 'saturn' | 'ice' | 'ice2' | 'rock';

export interface PlanetLook {
  tilt?: number;
  rings?: boolean;
  lights?: boolean;
}

const LIGHT = (() => {
  const v = [-0.55, -0.45, 0.7] as const,
    l = Math.hypot(...v);
  return [v[0] / l, v[1] / l, v[2] / l] as const;
})();
const SHADES = [0.2, 0.5, 0.76, 1] as const;
const GAS: readonly RGB[] = [
  [196, 160, 118],
  [226, 198, 158],
  [164, 112, 76],
  [238, 222, 192],
  [142, 92, 66]
];
const SAT: readonly RGB[] = [
  [214, 190, 136],
  [234, 214, 166],
  [190, 164, 112]
];
const RING_BANDS: readonly (readonly [number, RGB])[] = [
  [1.45, [150, 130, 96]],
  [1.6, [214, 190, 136]],
  [1.75, [190, 164, 112]],
  [1.92, [120, 104, 84]]
];
const CITY_LIGHT: RGB = [255, 214, 120];

interface Sample {
  c: RGB;
  land: boolean;
}

const sea = (c: RGB): Sample => ({ c, land: false });
const ground = (c: RGB): Sample => ({ c, land: true });

function terran(x: number, y: number, z: number, o: number): Sample {
  const h = fbm(x * 1.9 + 5, y * 1.9, z * 1.9, o),
    cl = fbm(x * 2.6 + 40, y * 4 + 9, z * 2.6, o);
  if (cl > 0.63) return sea([240, 244, 248]);
  if (Math.abs(y) > 0.9 - (h - 0.5) * 0.5) return sea([226, 236, 240]);
  if (h < 0.47) return sea([22, 48, 110]);
  if (h < 0.52) return sea([36, 84, 150]);
  if (h < 0.545) return sea([58, 128, 170]);
  return ground(h < 0.62 ? [70, 128, 70] : h < 0.69 ? [150, 132, 84] : [124, 112, 102]);
}

function mars(x: number, y: number, z: number, o: number): Sample {
  const h = fbm(x * 2.2 + 11, y * 2.2, z * 2.2, o),
    e = fbm(x * 5 + 2, y * 5, z * 5, 3);
  const cap = (y < 0 ? 0.9 : 0.955) - (e - 0.5) * 0.5,
    a = Math.abs(y);
  if (a > cap) return sea([232, 216, 204]);
  if (a > cap - 0.04) return sea([206, 156, 122]);
  return ground(
    h < 0.42 ? [112, 52, 36] : h < 0.52 ? [156, 78, 44] : h < 0.62 ? [190, 108, 62] : [214, 148, 96]
  );
}

function venus(x: number, y: number, z: number, o: number): Sample {
  const h = fbm(x * 1.4 + 3, y * 3.4 + x * 0.8, z * 1.4, o);
  return sea(
    h < 0.42 ? [168, 130, 64] : h < 0.52 ? [204, 166, 88] : h < 0.62 ? [232, 204, 132] : [244, 228, 176]
  );
}

function gas(x: number, y: number, z: number, o: number): Sample {
  const sx = x - 0.45,
    sy = y - 0.28;
  if (z > 0 && sx * sx * 0.5 + sy * sy * 2.2 < 0.012) return sea([190, 84, 60]);
  const w = fbm(x * 2.4, y * 2.4 + 20, z * 2.4, o);
  return sea(GAS[Math.floor(y * 5.2 + (w - 0.5) * 1.6 + 20) % 5]!);
}

function saturn(x: number, y: number, z: number, o: number): Sample {
  const w = fbm(x * 2 + 7, y * 2, z * 2, o);
  return sea(SAT[Math.floor(y * 4.4 + (w - 0.5) * 1.1 + 20) % 3]!);
}

const ICE: readonly RGB[] = [
  [150, 210, 220],
  [176, 226, 232],
  [126, 190, 204]
];
const ICE2: readonly RGB[] = [
  [64, 100, 210],
  [90, 130, 230],
  [48, 76, 170]
];

const iceGiant =
  (bands: readonly RGB[]) =>
  (x: number, y: number, z: number, o: number): Sample => {
    const w = fbm(x * 1.6 + 9, y * 3 + 2, z * 1.6, o);
    return sea(bands[Math.floor(y * 3 + (w - 0.5) * 1.2 + 20) % 3]!);
  };

function rock(x: number, y: number, z: number, o: number): Sample {
  const h = fbm(x * 2.6 + 17, y * 2.6, z * 2.6, o);
  if (noise3(x * 6 + 3, y * 6, z * 6) > 0.72) return sea([70, 68, 76]);
  return sea(h < 0.45 ? [96, 94, 100] : h < 0.58 ? [128, 124, 128] : [164, 160, 160]);
}

const SURFACES: Record<PlanetType, (x: number, y: number, z: number, o: number) => Sample> = {
  terran,
  mars,
  venus,
  gas,
  saturn,
  ice: iceGiant(ICE),
  ice2: iceGiant(ICE2),
  rock
};

function ringArc(fb: Surface, cx: number, cy: number, R: number, front: boolean): void {
  for (const [k, c] of RING_BANDS) {
    const rx = R * k,
      ry = rx * 0.3,
      n = Math.round(rx * 8);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.283,
        s = Math.sin(a);
      if (s >= 0 === front) fb.px(cx + Math.cos(a) * rx, cy + s * ry, c);
    }
  }
}

export function planet(
  fb: Surface,
  cx: number,
  cy: number,
  R: number,
  type: PlanetType,
  rot: number,
  look: PlanetLook = {}
): void {
  const cr = Math.cos(rot),
    sr = Math.sin(rot),
    tl = look.tilt ?? 0,
    ct = Math.cos(tl),
    st = Math.sin(tl),
    octaves = R > 20 ? 4 : 3,
    surface = SURFACES[type];
  if (look.rings) ringArc(fb, cx, cy, R, false);
  for (let j = -R; j <= R; j++)
    for (let i = -R; i <= R; i++) {
      if (i * i + j * j > R * R + R * 0.8) continue;
      const nx = i / (R + 0.5),
        ny = j / (R + 0.5),
        nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const tx = nx * ct + ny * st,
        ty = ny * ct - nx * st;
      const px = tx * cr + nz * sr,
        pz = nz * cr - tx * sr;
      const { c, land } = surface(px, ty, pz, octaves);
      const l = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2];
      const s = clamp(Math.floor((l * 1.15 + 0.12) * 3 + dith(cx + i, cy + j)), 0, 3),
        k = SHADES[s]!;
      if (s === 0 && look.lights && land && hash(px * 34, ty * 34, pz * 34) > 0.94)
        fb.px(cx + i, cy + j, CITY_LIGHT);
      else
        fb.px(
          cx + i,
          cy + j,
          s ? [c[0] * k, c[1] * k, c[2] * k] : [c[0] * k + 3, c[1] * k + 4, c[2] * k + 12]
        );
    }
  if (look.rings) ringArc(fb, cx, cy, R, true);
}
