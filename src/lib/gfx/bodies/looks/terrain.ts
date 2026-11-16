import { hash } from '#lib/gfx/math.ts';
import { fbm, noise3 } from '#lib/gfx/noise.ts';
import { RAD, h3, smoothstep } from './math.ts';

export { fbm, noise3, smoothstep, hash };

export type V3 = readonly [number, number, number];

export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);

export const lonlat = (lon: number, lat: number): V3 => {
  const lo = lon * RAD,
    la = lat * RAD;
  return [Math.cos(la) * Math.sin(lo), -Math.sin(la), Math.cos(la) * Math.cos(lo)];
};

const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0]
];
const unit = (a: V3): V3 => {
  const l = h3(a[0], a[1], a[2]);
  return [a[0] / l, a[1] / l, a[2] / l];
};

export const chord = (x: number, y: number, z: number, v: V3): number => h3(x - v[0], y - v[1], z - v[2]);

export function blob(x: number, y: number, z: number, v: V3, rad: number, soft: number, warp = 0): number {
  return 1 - smoothstep(rad - soft, rad + soft, chord(x, y, z, v) + warp);
}

export const C = { h: 0, rel: 0, bright: 0 };
export const clearC = (): void => {
  C.h = 0;
  C.rel = 0;
  C.bright = 0;
};

interface Rays {
  n: number;
  ph: number;
  k: number;
}

function profile(
  d: number,
  depth: number,
  rang: number,
  peak: boolean,
  fresh: boolean,
  ang: number,
  rays: Rays | null,
  rayLen: number,
  flat: boolean
): void {
  let a = 0;
  if (d < 1) {
    const bowl = flat ? Math.min(1, (1 - d * d) * 2.2) : 1 - d * d;
    a -= depth * bowl;
    if (peak) a += depth * 0.7 * Math.exp(-(d * d) / 0.018);
    a += depth * 0.4 * Math.exp(-((d - 1) * (d - 1)) / 0.02);
    if (fresh) C.bright = Math.max(C.bright, 0.55 * (1 - d * 0.35));
  } else if (d < rayLen) {
    const t = d - 1;
    if (d < 2.2)
      a +=
        depth * 0.4 * Math.exp(-(t * t) / 0.02) +
        (t < 1.2 ? depth * 0.14 * (1 - t / 1.2) * (1 - t / 1.2) : 0);
    if (fresh) {
      const e = Math.max(0, 1 - t / (rayLen - 1));
      let b = 0.5 * Math.max(0, 1 - t / 0.9) ** 2;
      if (rays) {
        const s = Math.abs(Math.sin(ang * rays.n + rays.ph));
        b = Math.max(b, s * s * s * e * e * rays.k);
      }
      if (b > C.bright) C.bright = b;
    }
  }
  C.rel += a;
  C.h += a * rang;
}

export interface CraterLayerDef {
  f: number;
  dn?: number;
  rmin?: number;
  rmax?: number;
  depth?: number;
  fresh?: number;
  peak?: boolean;
  flat?: boolean;
}

export interface CraterLayer {
  s: number;
  f: number;
  dn: number;
  rmin: number;
  rmax: number;
  depth: number;
  fresh: number;
  peak: boolean;
  flat: boolean;
}

export function craterLayer(x: number, y: number, z: number, L: CraterLayer): void {
  const s = L.s,
    px = x * L.f + s * 0.731,
    py = y * L.f + s * 1.377,
    pz = z * L.f + s * 0.519,
    ix = Math.floor(px),
    iy = Math.floor(py),
    iz = Math.floor(pz),
    x0 = px - ix < 0.5 ? ix - 1 : ix,
    y0 = py - iy < 0.5 ? iy - 1 : iy,
    z0 = pz - iz < 0.5 ? iz - 1 : iz,
    sh = s * 131,
    rm = L.rmax - L.rmin;
  for (let a = 0; a < 2; a++)
    for (let b = 0; b < 2; b++)
      for (let c = 0; c < 2; c++) {
        const cx = x0 + a,
          cy = y0 + b,
          cz = z0 + c,
          hp = hash(cx + sh, cy, cz);
        if (hp > L.dn) continue;
        const u = hp / L.dn,
          r = L.rmin + rm * u * u,
          gx = cx + 0.2 + 0.6 * hash(cx, cy, cz + 7001 + sh) - px,
          gy = cy + 0.2 + 0.6 * hash(cx, cy, cz + 7002 + sh) - py,
          gz = cz + 0.2 + 0.6 * hash(cx, cy, cz + 7003 + sh) - pz,
          d = h3(gx, gy, gz) / r;
        if (d > 2.6) continue;
        const fresh = L.fresh ? hash(cx, cy, cz + 9001 + sh) < L.fresh : false,
          big = u > 0.6 && L.peak;
        let rays: Rays | null = null,
          ang = 0;
        if (fresh && d > 1) {
          ang = Math.atan2(gz, gx);
          rays = {
            n: 3 + Math.floor(hash(cx, cy, cz + 9002) * 5),
            ph: hash(cx, cy, cz + 9003) * 6.28,
            k: 0.9
          };
        }
        profile(d, L.depth * (0.55 + 0.45 * u), r / L.f, big, fresh, ang, rays, 2.6, L.flat);
      }
}

export function layers(list: readonly CraterLayerDef[], seed = 0): CraterLayer[] {
  return list.map((l, i) => ({
    s: seed + i + 1,
    f: l.f,
    dn: l.dn ?? 0.5,
    rmin: l.rmin ?? 0.14,
    rmax: l.rmax ?? 0.3,
    depth: l.depth ?? 0.4,
    fresh: l.fresh ?? 0,
    peak: l.peak ?? true,
    flat: l.flat ?? false
  }));
}

export function craterField(x: number, y: number, z: number, ls: readonly CraterLayer[]): void {
  for (let i = 0; i < ls.length; i++) craterLayer(x, y, z, ls[i]!);
}

export interface FeatureDef {
  lon: number;
  lat: number;
  rad: number;
  depth?: number;
  peak?: boolean;
  fresh?: boolean;
  rayLen?: number;
  rays?: Rays;
  flat?: boolean;
}

export interface Feature {
  depth: number;
  peak: boolean;
  fresh: boolean;
  rayLen: number;
  rays: Rays | null;
  flat: boolean;
  rad: number;
  v: V3;
  e: V3;
  n: V3;
  reach: number;
}

export function feature(f: FeatureDef): Feature {
  const v = lonlat(f.lon, f.lat),
    e = unit(Math.abs(v[1]) > 0.98 ? [1, 0, 0] : cross([0, 1, 0], v)),
    n = cross(v, e);
  return {
    depth: f.depth ?? 0.5,
    peak: f.peak ?? true,
    fresh: f.fresh ?? false,
    rayLen: f.rayLen ?? 2.6,
    rays: f.rays ?? null,
    flat: f.flat ?? false,
    rad: f.rad,
    v,
    e,
    n,
    reach: Math.max(2.6, f.rayLen ?? 0)
  };
}

export function featureField(x: number, y: number, z: number, fs: readonly Feature[]): void {
  for (let i = 0; i < fs.length; i++) {
    const f = fs[i]!,
      dx = x - f.v[0],
      dy = y - f.v[1],
      dz = z - f.v[2],
      d = h3(dx, dy, dz) / f.rad;
    if (d > f.reach) continue;
    const ang = f.fresh
      ? Math.atan2(dx * f.n[0] + dy * f.n[1] + dz * f.n[2], dx * f.e[0] + dy * f.e[1] + dz * f.e[2])
      : 0;
    profile(d, f.depth, f.rad, f.peak, f.fresh, ang, f.rays, f.rayLen, f.flat);
  }
}

export interface BasinDef {
  lon: number;
  lat: number;
  rad: number;
  depth?: number;
  rings?: number;
  reach?: number;
  core?: number;
  glow?: number;
  warp?: (x: number, y: number, z: number) => number;
}

export interface Basin {
  depth: number;
  rings: number;
  reach: number;
  core: number;
  glow: number;
  rad: number;
  warp: ((x: number, y: number, z: number) => number) | undefined;
  v: V3;
}

export function basin(x: number, y: number, z: number, b: Basin): void {
  const d = chord(x, y, z, b.v) / b.rad;
  if (d > b.reach) return;
  const e = Math.max(0, 1 - d / b.reach);
  const a =
    b.depth * e * Math.sin((d + (b.warp ? b.warp(x, y, z) : 0)) * 6.283 * b.rings) * (d > 0.15 ? 1 : 0.2) -
    (d < 1 ? b.depth * (1 - d) * 0.5 : 0);
  C.rel += a;
  C.h += a * b.rad;
  if (d < b.core) C.bright = Math.max(C.bright, (1 - d / b.core) * b.glow);
}

export function makeBasin(f: BasinDef): Basin {
  return {
    depth: f.depth ?? 0.4,
    rings: f.rings ?? 4,
    reach: f.reach ?? 3,
    core: f.core ?? 0.6,
    glow: f.glow ?? 0.9,
    rad: f.rad,
    warp: f.warp,
    v: lonlat(f.lon, f.lat)
  };
}

export const worleyOut = { f1: 0, f2: 0, id: 0, cx: 0, cy: 0, cz: 0 };

export function worley(x: number, y: number, z: number, freq: number, seed = 0): typeof worleyOut {
  const px = x * freq + seed * 0.37,
    py = y * freq + seed * 0.91,
    pz = z * freq + seed * 0.53,
    ix = Math.floor(px),
    iy = Math.floor(py),
    iz = Math.floor(pz);
  let f1 = 9,
    f2 = 9,
    id = 0,
    bx = 0,
    by = 0,
    bz = 0;
  for (let a = -1; a <= 1; a++)
    for (let b = -1; b <= 1; b++)
      for (let c = -1; c <= 1; c++) {
        const cx = ix + a,
          cy = iy + b,
          cz = iz + c,
          gx = cx + hash(cx, cy, cz + 3001 + seed) - px,
          gy = cy + hash(cx, cy, cz + 3002 + seed) - py,
          gz = cz + hash(cx, cy, cz + 3003 + seed) - pz,
          d = gx * gx + gy * gy + gz * gz;
        if (d < f1) {
          f2 = f1;
          f1 = d;
          id = hash(cx, cy, cz + 3004 + seed);
          bx = gx;
          by = gy;
          bz = gz;
        } else if (d < f2) f2 = d;
      }
  worleyOut.f1 = Math.sqrt(f1);
  worleyOut.f2 = Math.sqrt(f2);
  worleyOut.id = id;
  worleyOut.cx = bx;
  worleyOut.cy = by;
  worleyOut.cz = bz;
  return worleyOut;
}

export const contour = (n: number, w: number): number => 1 - smoothstep(0, w, Math.abs(n - 0.5));

export function warped(
  x: number,
  y: number,
  z: number,
  f: number,
  amt: number,
  seed: number,
  oct = 3
): number {
  return fbm(
    x * f + seed + (fbm(x * 1.7 + seed, y * 1.7, z * 1.7, 2) - 0.5) * amt,
    y * f + (fbm(x * 1.7, y * 1.7 + seed, z * 1.7, 2) - 0.5) * amt,
    z * f + (fbm(x * 1.7, y * 1.7, z * 1.7 + seed, 2) - 0.5) * amt,
    oct
  );
}
