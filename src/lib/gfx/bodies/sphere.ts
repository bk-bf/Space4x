import type { FB } from '../framebuffer';
import { clamp, hash, mix } from '../math';
import { dith } from '../noise';
import type { RGB } from '../palette';
import type { PlanetType } from '../planets';
import { sampleCube } from './cube';
import { fieldCube } from './fields';

export interface SphereLook {
  type: PlanetType;
  rot: number;
  tilt?: number;
  rings?: boolean;
  lights?: boolean;
}

export const LIGHT = (() => {
  const v = [-0.55, -0.45, 0.7] as const,
    l = Math.hypot(...v);
  return [v[0] / l, v[1] / l, v[2] / l] as const;
})();
const LXY = Math.hypot(LIGHT[0], LIGHT[1]);
const SHADES = [0.2, 0.5, 0.76, 1] as const;

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
const ATMO: Partial<Record<PlanetType, RGB>> = {
  terran: [80, 150, 235],
  venus: [240, 214, 150],
  mars: [214, 150, 110],
  gas: [226, 200, 160],
  saturn: [230, 210, 160],
  ice: [170, 230, 240],
  ice2: [110, 150, 250]
};
const CITY: RGB = [255, 214, 120];

const G = new Float64Array(8);
const O = new Float64Array(6);
const ADD = 3;
const LAND = 4;
const SEA = 5;

const set = (c: RGB) => {
  O[0] = c[0];
  O[1] = c[1];
  O[2] = c[2];
};

const GLINT_FROM = 0.975,
  GLINT_COVER = 0.7;
const CLOUD_THIN = 0.575,
  CLOUD_DENSE = 0.61;

type Shader = (x: number, y: number, z: number, R: number, dv: number) => void;

const terran: Shader = (_x, y, _z, R, dv) => {
  const dt = R > 80 ? (G[4]! - 0.5) * (R > 350 ? 0.05 : 0.03) : 0,
    h = G[0]! + dt,
    cl = G[1]! + dt * 0.8;
  if (cl > CLOUD_DENSE || dv < (cl - CLOUD_THIN) / (CLOUD_DENSE - CLOUD_THIN))
    return set(cl > CLOUD_DENSE ? [240, 244, 248] : [206, 216, 230]);
  if (Math.abs(y) > 0.88 - (h - 0.5) * 0.5) return set(TERR[8]!);
  if (h < 0.53) {
    O[SEA] = 1;
    set(h < 0.44 ? TERR[0]! : h < 0.5 ? TERR[1]! : TERR[2]!);
  } else {
    O[LAND] = 1;
    const m = G[2]! + dt;
    set(
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
  if (G[3]! > 0.61) {
    O[0] = O[0]! * 0.6;
    O[1] = O[1]! * 0.6;
    O[2] = O[2]! * 0.72;
  }
};

const mars: Shader = (x, y, _z, R) => {
  const h = G[0]!,
    e = G[1]!,
    cap = (y < 0 ? 0.88 : 0.94) - (e - 0.5) * 0.5,
    a = Math.abs(y);
  if (a > cap) return set([232, 220, 210]);
  if (a > cap - 0.04) return set([206, 156, 122]);
  O[LAND] = 1;
  O[ADD] = (e - 0.5) * 0.7;
  const c1 = G[3]!,
    c2 = R > 40 ? G[4]! : 0;
  if (Math.abs(y + 0.08 - (G[2]! - 0.5) * 0.3) < 0.014 && x > -0.5 && x < 0.6) {
    O[ADD] = -0.5;
    return set([98, 44, 34]);
  }
  if (c1 > 0.75 || c2 > 0.8) {
    O[ADD] = -0.35;
    return set([124, 58, 40]);
  }
  if (c1 > 0.71 || c2 > 0.765) {
    O[ADD] = 0.45;
    return set([214, 140, 92]);
  }
  set(h < 0.42 ? [112, 52, 36] : h < 0.52 ? [156, 78, 44] : h < 0.62 ? [190, 108, 62] : [214, 148, 96]);
};

const venus: Shader = () => {
  const w = G[0]! + (G[1]! - 0.5) * 0.18;
  set(w < 0.42 ? [168, 130, 64] : w < 0.5 ? [204, 166, 88] : w < 0.58 ? [232, 204, 132] : [244, 228, 176]);
};

const bands =
  (jupiter: boolean): Shader =>
  (x, y, z, R, dv) => {
    const P = jupiter ? JUP : SATC;
    if (jupiter) {
      const sx = x - 0.45,
        sy = y - 0.28,
        sd = sx * sx * 0.5 + sy * sy * 2.2;
      if (z > 0 && sd < 0.012) return set(sd < 0.006 ? [176, 70, 52] : [200, 96, 66]);
      if (z > 0 && sd < 0.016) return set([238, 222, 192]);
    }
    const fine = G[1]! - 0.5,
      band =
        y * (jupiter ? 6.2 : 4.6) +
        (G[0]! - 0.5) * (jupiter ? 1.5 : 0.9) +
        fine * (jupiter ? 0.7 : 0.4) +
        (R > 150 ? (G[2]! - 0.5) * 0.45 : 0) +
        20,
      bi = Math.floor(band),
      fr = band - bi;
    set(P[(bi + (fr > 0.8 && dv > (1 - fr) * 5 ? 1 : 0)) % P.length]!);
    if (jupiter && R > 30 && Math.abs(y) > 0.3 && G[3]! > 0.8) set([240, 228, 204]);
    O[ADD] = fine * 0.5;
  };

const iceGiant =
  (deep: boolean): Shader =>
  (x, y, z, R) => {
    if (deep && z > 0 && (x + 0.3) ** 2 * 0.6 + (y - 0.3) ** 2 * 2.4 < 0.012) return set([32, 50, 130]);
    if (deep && R > 30 && G[1]! > 0.82) return set([200, 214, 250]);
    const P = deep ? ICE2 : ICE;
    set(P[Math.floor(y * 3 + (G[0]! - 0.5) * 1.2 + 20) % 3]!);
  };

const rock: Shader = (_x, _y, _z, R) => {
  const h = G[0]!,
    c1 = G[1]!,
    c2 = R > 30 ? G[2]! : 0,
    c3 = R > 150 ? G[3]! : 0;
  O[LAND] = 1;
  O[ADD] = (h - 0.5) * 0.8;
  if (c1 > 0.76 || c2 > 0.8 || c3 > 0.83) {
    O[ADD] = -0.4;
    return set([78, 76, 84]);
  }
  if (c1 > 0.72 || c2 > 0.765 || c3 > 0.8) {
    O[ADD] = 0.5;
    return set([188, 184, 184]);
  }
  set(h < 0.45 ? [96, 94, 100] : h < 0.58 ? [128, 124, 128] : [164, 160, 160]);
};

const SHADERS: Record<PlanetType, Shader> = {
  terran,
  mars,
  venus,
  gas: bands(true),
  saturn: bands(false),
  ice: iceGiant(false),
  ice2: iceGiant(true),
  rock
};

const ringDensity = (rr: number) =>
  rr < 1.24 || rr > 2.28
    ? 0
    : rr < 1.52
      ? 0.38
      : rr < 1.95
        ? 0.96
        : rr < 2.03
          ? 0
          : rr > 2.19 && rr < 2.21
            ? 0.1
            : 0.72;

export function drawRings(f: FB, cx: number, cy: number, R: number, front: boolean): void {
  const rx = R * 2.3,
    ry = rx * 0.3,
    x0 = Math.max(0, Math.floor(cx - rx)),
    x1 = Math.min(f.w - 1, Math.ceil(cx + rx)),
    y0 = Math.max(0, Math.floor(front ? cy : cy - ry)),
    y1 = Math.min(f.h - 1, Math.ceil(front ? cy + ry : cy)),
    D = f.d,
    ax = -LIGHT[0] / LXY,
    ay = -LIGHT[1] / LXY,
    big = R > 9;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - cx,
        dy = y + 0.5 - cy,
        rr = Math.hypot(dx, dy / 0.3) / R,
        dn = ringDensity(rr);
      if (!dn) continue;
      const fine = big ? hash(Math.floor(rr * (R > 60 ? 90 : 34)), 3, 7) : 0.5;
      if (big ? dith(x, y) > dn * (0.75 + fine * 0.5) : dn < 0.5 && (x + y) & 1) continue;
      const c: RGB =
        rr < 1.52
          ? [150, 130, 96]
          : rr < 1.95
            ? fine > 0.6
              ? [226, 204, 150]
              : [206, 182, 128]
            : fine > 0.5
              ? [190, 164, 112]
              : [164, 142, 100];
      const along = dx * ax + dy * ay,
        perp = Math.abs(-dx * ay + dy * ax),
        k = along > 0 && perp < R * 0.97 ? 0.32 : 1,
        q = (y * f.w + x) * 4;
      D[q] = c[0] * k;
      D[q + 1] = c[1] * k;
      D[q + 2] = c[2] * k + (k < 1 ? 14 : 0);
    }
}

export const sphereReach = (look: SphereLook, R: number): number =>
  R * (look.rings ? 2.35 : 1) + (ATMO[look.type] && R >= 6 ? Math.max(1.5, R * 0.03) : 0) + 1;

export function drawSphere(f: FB, look: SphereLook, cx: number, cy: number, R: number): void {
  const type = look.type,
    atmo = ATMO[type],
    th = atmo && R >= 6 ? Math.max(1.5, R * 0.03) : 0,
    RR = sphereReach(look, R);
  if (cx + RR < 0 || cy + RR < 0 || cx - RR > f.w || cy - RR > f.h) return;
  const rings = !!look.rings && R >= 2.5;
  if (rings) drawRings(f, cx, cy, R, false);
  const cube = fieldCube(type),
    shade = SHADERS[type],
    crot = Math.cos(look.rot),
    srot = Math.sin(look.rot),
    tl = look.tilt ?? 0,
    ct = Math.cos(tl),
    st = Math.sin(tl);
  const D = f.d,
    W = f.w,
    E = R + th,
    small = R < 20,
    lim = small ? R * R + R * 0.8 : R * R,
    X0 = Math.floor(cx),
    Y0 = Math.floor(cy),
    fx = cx - X0,
    fy = cy - Y0,
    lights = !!look.lights,
    cityNoise = R > 60 && cube.channels > 5,
    bump = R > 14,
    inv = 1 / (R + 0.5),
    L0 = LIGHT[0],
    L1 = LIGHT[1],
    L2 = LIGHT[2];
  const j0 = Math.max(Math.ceil(-E), -Y0),
    j1 = Math.min(Math.floor(E), f.h - 1 - Y0),
    i0 = Math.max(Math.ceil(-E), -X0),
    i1 = Math.min(Math.floor(E), W - 1 - X0);
  for (let j = j0; j <= j1; j++) {
    const dy = small ? j : j + 0.5 - fy,
      y = Y0 + j,
      dy2 = dy * dy,
      ny = dy * inv;
    for (let i = i0; i <= i1; i++) {
      const dx = small ? i : i + 0.5 - fx,
        d2 = dx * dx + dy2,
        x = X0 + i,
        q = (y * W + x) * 4;
      if (d2 > lim) {
        if (!th) continue;
        const d = Math.sqrt(d2);
        if (d > E) continue;
        const g = (1 - (d - R) / th) * clamp(((dx * L0 + dy * L1) / d) * 2 + 0.9, 0, 1);
        if (dith(x, y) < g * 0.9) {
          D[q] = atmo![0] * 0.8;
          D[q + 1] = atmo![1] * 0.8;
          D[q + 2] = atmo![2] * 0.95;
        }
        continue;
      }
      const nx = dx * inv,
        n2 = 1 - nx * nx - ny * ny,
        nz = n2 > 0 ? Math.sqrt(n2) : 0,
        tx = nx * ct + ny * st,
        ty = ny * ct - nx * st,
        px = tx * crot + nz * srot,
        pz = nz * crot - tx * srot,
        dv = dith(x, y);
      sampleCube(cube, px, ty, pz, G);
      O[ADD] = 0;
      O[LAND] = 0;
      O[SEA] = 0;
      shade(px, ty, pz, R, dv);
      let L = nx * L0 + ny * L1 + nz * L2;
      if (bump) L += O[ADD]! * 0.22 * nz;
      if (
        rings &&
        L > 0 &&
        Math.abs(dy + 0.24 * Math.sqrt(Math.max(0, R * R - dx * dx)) * 0.9 - R * 0.02) < R * 0.045
      )
        L -= 0.5;
      const s = clamp(Math.floor((L * 1.15 + 0.12) * 3 + dv), 0, 3),
        k = SHADES[s]!;
      let r = O[0]! * k,
        g = O[1]! * k,
        b = O[2]! * k;
      if (s === 0) {
        r += 3;
        g += 4;
        b += 12;
        if (
          lights &&
          O[LAND] &&
          (cityNoise
            ? G[5]! > 0.55 && hash(px * 900, ty * 900, pz * 900) > 0.62
            : hash(px * 34, ty * 34, pz * 34) > 0.94)
        ) {
          r = CITY[0];
          g = CITY[1];
          b = CITY[2];
        }
      } else if (O[SEA] && dv < ((L - GLINT_FROM) / (1 - GLINT_FROM)) * GLINT_COVER) {
        r = mix(r, 255, 0.5);
        g = mix(g, 255, 0.5);
        b = mix(b, 255, 0.5);
      }
      if (atmo && R > 10) {
        const rim = clamp((0.3 - nz) / 0.3, 0, 1) * clamp(L * 2 + 0.8, 0, 1);
        if (dv < rim * 0.8) {
          r = mix(r, atmo[0], 0.55);
          g = mix(g, atmo[1], 0.55);
          b = mix(b, atmo[2], 0.55);
        }
      }
      D[q] = r;
      D[q + 1] = g;
      D[q + 2] = b;
    }
  }
  if (rings) drawRings(f, cx, cy, R, true);
}
