import type { FB } from '../framebuffer';
import { clamp, hash, mix } from '../math';
import { dith, fbm, noise3 } from '../noise';
import type { RGB } from '../palette';
import { sun, type SunTint } from '../sun';

const TEX = 256;
const PERIOD = 32;
const CELL = TEX / PERIOD;
const SLICES = 8;
const RAYS = 720;

export const STAR_DISC_MIN = 5;

const YELLOW: SunTint = {
  core: [
    [255, 250, 224],
    [255, 216, 112],
    [246, 156, 60]
  ],
  corona: [
    [230, 120, 50],
    [150, 62, 44]
  ]
};

const lift = (c: RGB, k: number): RGB => [mix(c[0], 255, k), mix(c[1], 255, k), mix(c[2], 255, k)];

function paletteOf(t: SunTint): RGB[] {
  const [c0, c1, c2] = t.core,
    [k0, k1] = t.corona;
  return [
    lift(c0, 0.5),
    [mix(c0[0], c1[0], 0.35), mix(c0[1], c1[1], 0.35), mix(c0[2], c1[2], 0.35)],
    c1,
    c2,
    k0,
    k1,
    [mix(c2[0], k1[0], 0.6), mix(c2[1], k1[1], 0.6), mix(c2[2], k1[2], 0.6)]
  ];
}

let grain: Uint8Array | null = null;
let spots: Uint8Array | null = null;
const rays = new Float64Array(RAYS);

function periodic(x: number, y: number, z: number): number {
  const xi = Math.floor(x),
    yi = Math.floor(y),
    zi = Math.floor(z),
    s = (t: number) => t * t * (3 - 2 * t),
    xf = s(x - xi),
    yf = s(y - yi),
    zf = s(z - zi),
    h = (a: number, b: number, c: number) =>
      hash(
        ((a % PERIOD) + PERIOD) % PERIOD,
        ((b % PERIOD) + PERIOD) % PERIOD,
        ((c % SLICES) + SLICES) % SLICES
      );
  return mix(
    mix(mix(h(xi, yi, zi), h(xi + 1, yi, zi), xf), mix(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), xf), yf),
    mix(
      mix(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), xf),
      mix(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), xf),
      yf
    ),
    zf
  );
}

function grainTexture(): Uint8Array {
  if (grain) return grain;
  grain = new Uint8Array(TEX * TEX * SLICES);
  for (let k = 0; k < SLICES; k++)
    for (let j = 0; j < TEX; j++)
      for (let i = 0; i < TEX; i++)
        grain[(k * TEX + j) * TEX + i] = Math.round(periodic(i / CELL, j / CELL, k) * 255);
  return grain;
}

function spotTexture(): Uint8Array {
  if (spots) return spots;
  spots = new Uint8Array(TEX * TEX);
  for (let j = 0; j < TEX; j++)
    for (let i = 0; i < TEX; i++)
      spots[j * TEX + i] = Math.round(fbm((i / 128 - 1) * 3 + 5, (j / 128 - 1) * 3, 1.7, 3) * 255);
  return spots;
}

export function prebakeStar(): void {
  grainTexture();
  spotTexture();
}

function grainAt(T: Uint8Array, u: number, v: number, k0: number, k1: number, w: number): number {
  const x = u * CELL,
    y = v * CELL,
    xi = Math.floor(x),
    yi = Math.floor(y),
    fx = x - xi,
    fy = y - yi,
    a = xi & (TEX - 1),
    b = (xi + 1) & (TEX - 1),
    c = (yi & (TEX - 1)) * TEX,
    d = ((yi + 1) & (TEX - 1)) * TEX,
    s0 = k0 * TEX * TEX,
    s1 = k1 * TEX * TEX;
  const p =
      (T[s0 + c + a]! * (1 - fx) + T[s0 + c + b]! * fx) * (1 - fy) +
      (T[s0 + d + a]! * (1 - fx) + T[s0 + d + b]! * fx) * fy,
    q =
      (T[s1 + c + a]! * (1 - fx) + T[s1 + c + b]! * fx) * (1 - fy) +
      (T[s1 + d + a]! * (1 - fx) + T[s1 + d + b]! * fx) * fy;
  return (p + (q - p) * w) / 255;
}

export function drawStar(f: FB, cx: number, cy: number, R: number, t: number, tint: SunTint = YELLOW): void {
  if (R < STAR_DISC_MIN) return sun(f, Math.round(cx), Math.round(cy), Math.max(3, Math.round(R)), t, tint);
  const cor = R * 0.32 + 8,
    E = R + cor;
  if (cx + E < 0 || cy + E < 0 || cx - E > f.w || cy - E > f.h) return;
  const P = paletteOf(tint),
    T = grainTexture(),
    S = spotTexture(),
    D = f.d,
    W = f.w,
    Gs = clamp(R * 0.3, 5, 70),
    X0 = Math.floor(cx),
    Y0 = Math.floor(cy),
    fx = cx - X0,
    fy = cy - Y0,
    tz = t * 0.036,
    zs = ((tz % SLICES) + SLICES) % SLICES,
    k0 = Math.floor(zs),
    k1 = (k0 + 1) % SLICES,
    kw = zs - k0,
    withSpots = R > 30;
  for (let i = 0; i < RAYS; i++) {
    const a = (i / RAYS) * Math.PI * 2,
      ca = Math.cos(a),
      sa = Math.sin(a);
    rays[i] = noise3(ca * 3.2 + 4, sa * 3.2, tz * 3) + noise3(ca * 9, sa * 9, tz * 5) * 0.4;
  }
  const j0 = Math.max(Math.ceil(-E), -Y0),
    j1 = Math.min(Math.floor(E), f.h - 1 - Y0),
    i0 = Math.max(Math.ceil(-E), -X0),
    i1 = Math.min(Math.floor(E), W - 1 - X0),
    R2 = R * R,
    E2 = (R + cor * 1.25) ** 2,
    inv = 1 / R;
  for (let j = j0; j <= j1; j++) {
    const dy = j + 0.5 - fy,
      y = Y0 + j;
    for (let i = i0; i <= i1; i++) {
      const dx = i + 0.5 - fx,
        d2 = dx * dx + dy * dy;
      if (d2 > E2) continue;
      const x = X0 + i,
        q = (y * W + x) * 4,
        dv = dith(x, y);
      let c: RGB;
      if (d2 <= R2) {
        const nx = dx * inv,
          ny = dy * inv,
          v2 = d2 * inv * inv,
          gr = grainAt(T, nx * Gs, ny * Gs, k0, k1, kw) - 0.5,
          sp = withSpots
            ? S[Math.min(255, ((ny + 1) * 127.5) | 0) * TEX + Math.min(255, ((nx + 1) * 127.5) | 0)]! / 255
            : 0.5;
        if (sp < 0.3 && v2 < 0.7225) c = sp < 0.27 ? P[6]! : P[4]!;
        else {
          const u = v2 * 1.25 + gr * 0.55 + (dv - 0.5) * 0.3;
          c = P[u < 0.2 ? 0 : u < 0.62 ? 1 : u < 1.02 ? 2 : 3]!;
        }
      } else {
        const d = Math.sqrt(d2),
          w = (d - R) / cor,
          a = Math.atan2(dy, dx),
          ray = rays[(((a / (Math.PI * 2)) * RAYS + RAYS) | 0) % RAYS]!,
          s = (1 - w) * 0.95 + (ray - 0.7) * 0.9;
        if (s <= dv + 0.22) continue;
        c = s > dv + 0.75 ? P[3]! : s > dv + 0.45 ? P[4]! : P[5]!;
      }
      D[q] = c[0];
      D[q + 1] = c[1];
      D[q + 2] = c[2];
    }
  }
}

export const starReach = (R: number): number => (R < STAR_DISC_MIN ? Math.max(3, R) + 8 : R * 1.4 + 10);
