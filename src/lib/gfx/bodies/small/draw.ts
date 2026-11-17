import { hash, mix } from '#lib/gfx/math.ts';
import { dith } from '#lib/gfx/noise.ts';
import type { RGB } from '#lib/gfx/palette.ts';
import { LIGHT, type Box, type Pixels } from '#lib/gfx/bodies/light.ts';
import { forget } from '#lib/gfx/bodies/looks/bake.ts';
import { toward, type Stops } from '#lib/gfx/bodies/looks/colour.ts';
import { craterLook, type Lumpy } from '#lib/gfx/bodies/looks/cratered.ts';
import { clamp, fbm, smoothstep } from '#lib/gfx/bodies/looks/terrain.ts';
import type { Look } from '#lib/gfx/bodies/looks/types.ts';
import { meshBytes, meshOf } from '#lib/gfx/bodies/rock/mesh.ts';
import { drawRock, rockReady, rockReach } from '#lib/gfx/bodies/rock/raster.ts';
import { basinRelief, macroRadius, shapeReach, type ShapeSpec } from './shape.ts';

export type SmallType = 'carbonaceous' | 'stony' | 'metallic' | 'comet';

export type ShapeFamily = 'top' | 'contact' | 'peanut' | 'elongated' | 'bone' | 'lumpy' | 'round' | 'nucleus';

export interface SmallBody {
  readonly key: string;
  readonly name: string;
  readonly type: SmallType;
  readonly family: ShapeFamily;
  readonly spec: ShapeSpec;
  readonly rock: Lumpy;
  readonly tilt: number;
  readonly phase: number;
}

const FACE = 192;
const BUDGET_BYTES = 48 * 1024 * 1024;
const LUMP_NORM = 0.6;
const TAIL_FROM = 5;
const TAIL_UNTIL = 40;

const PALETTES: Readonly<Record<SmallType, readonly Stops[]>> = {
  carbonaceous: [
    [
      [0, [46, 44, 44]],
      [0.5, [78, 74, 72]],
      [1, [118, 112, 106]]
    ],
    [
      [0, [52, 48, 46]],
      [0.5, [86, 80, 76]],
      [1, [124, 116, 108]]
    ]
  ],
  stony: [
    [
      [0, [86, 70, 58]],
      [0.5, [128, 106, 86]],
      [1, [176, 148, 118]]
    ],
    [
      [0, [64, 58, 54]],
      [0.5, [104, 96, 88]],
      [1, [150, 140, 128]]
    ]
  ],
  metallic: [
    [
      [0, [70, 72, 78]],
      [0.5, [112, 114, 122]],
      [1, [164, 166, 176]]
    ]
  ],
  comet: [
    [
      [0, [34, 31, 30]],
      [0.5, [58, 53, 50]],
      [1, [92, 84, 78]]
    ]
  ]
};

const BRIGHT: Readonly<Record<SmallType, RGB>> = {
  carbonaceous: [150, 144, 138],
  stony: [190, 182, 170],
  metallic: [214, 218, 228],
  comet: [210, 214, 220]
};

const ICE: RGB = [214, 220, 228];

function surfaceLook(body: SmallBody): Look {
  const spec = body.spec,
    t = body.type,
    palettes = PALETTES[t],
    palette = palettes[Math.floor(hash(spec.seed, 4, 59) * palettes.length)]!,
    dense = clamp(0.55 + 0.4 * spec.craters, 0.5, 1.25),
    deep = clamp(spec.craterDepth / 0.2, 0.6, 1.4),
    comet = t === 'comet';
  return craterLook({
    id: `small:${body.key}`,
    seed: spec.seed % 9973,
    face: FACE,
    hs: 0.6,
    bump: 1.3,
    tilt: body.tilt,
    macro: (x, y, z) => macroRadius(spec, x, y, z) + basinRelief(spec, x, y, z),
    lumpy: body.rock,
    layers: comet
      ? [
          { f: 2, dn: 0.5 * dense, rmin: 0.18, rmax: 0.34, depth: 0.6, flat: true },
          { f: 4.4, dn: 0.7 * dense, rmin: 0.14, rmax: 0.3, depth: 0.5, flat: true },
          { f: 9, dn: 0.8, rmin: 0.14, rmax: 0.3, depth: 0.4 }
        ]
      : [
          { f: 2.4, dn: Math.min(0.95, 0.7 * dense), rmin: 0.16, rmax: 0.32, depth: 0.7 * deep, flat: true },
          { f: 5, dn: Math.min(0.95, 0.85 * dense), rmin: 0.14, rmax: 0.3, depth: 0.6 * deep },
          { f: 10, dn: 0.9, rmin: 0.14, rmax: 0.3, depth: 0.5 }
        ],
    m1: comet ? (x, y, z) => smoothstep(0.62, 0.72, fbm(x * 5 + 3, y * 5, z * 5, 3)) : undefined,
    noiseFreq: comet ? 7 : 6,
    noiseAmt: comet ? 1.2 : 1.4,
    palette,
    bright: BRIGHT[t],
    brightAmt: comet ? 1.1 : 0.6,
    post: comet
      ? (_x, _y, _z, _R, _dv, G, O) => {
          if (G[3] > 0.02) toward(O, ICE, clamp(G[3] * 0.9, 0, 0.9));
        }
      : undefined
  });
}

const looks = new Map<string, Look>();

function lookBytes(look: Look): number {
  const mesh = meshOf(look);
  return look.cube.data.length + (mesh ? meshBytes(mesh) : 0);
}

function release(keep: Look): void {
  let total = 0;
  for (const l of looks.values()) total += lookBytes(l);
  for (const [key, l] of looks) {
    if (total <= BUDGET_BYTES) return;
    if (l === keep) continue;
    total -= lookBytes(l);
    forget(l);
    looks.delete(key);
  }
}

export function smallLook(body: SmallBody): Look {
  let look = looks.get(body.key);
  if (look) {
    looks.delete(body.key);
    looks.set(body.key, look);
    return look;
  }
  look = surfaceLook(body);
  looks.set(body.key, look);
  release(look);
  return look;
}

export const heldLooks = (): number => looks.size;

export const heldBytes = (): number => [...looks.values()].reduce((s, l) => s + lookBytes(l), 0);

export const smallReady = (body: SmallBody): boolean => rockReady(smallLook(body));

export const smallReach = (body: SmallBody): number => {
  const look = looks.get(body.key);
  return look && meshOf(look)
    ? rockReach(look)
    : (shapeReach(body.spec) * (1 + body.rock.amp)) / (1 + LUMP_NORM * body.rock.amp);
};

const TAIL_ION: RGB = [150, 200, 240];
const TAIL_DUST: RGB = [220, 196, 150];
const TAIL_LENGTH = 7;
const TAIL_MAX = 140;
const SUN_ANGLE = Math.atan2(LIGHT[1], LIGHT[0]);

function drawTail(f: Pixels, cx: number, cy: number, radius: number, sun: number): void {
  const length = Math.min(radius * TAIL_LENGTH, TAIL_MAX),
    ax = -Math.cos(sun),
    ay = -Math.sin(sun),
    D = f.d,
    reach = Math.ceil(length + radius * 2),
    X = Math.round(cx),
    Y = Math.round(cy);
  for (let j = -reach; j <= reach; j++)
    for (let i = -reach; i <= reach; i++) {
      const x = X + i,
        y = Y + j;
      if (x < 0 || y < 0 || x >= f.w || y >= f.h) continue;
      const along = i * ax + j * ay,
        across = -i * ay + j * ax,
        t = along / length;
      let col: RGB | null = null,
        p = 0;
      if (t > 0 && t < 1) {
        const ion = Math.exp(-((across / (radius * 0.35 + t * radius * 0.5)) ** 2));
        const dust = Math.exp(-(((across - t * radius * 1.4) / (radius * 0.5 + t * radius * 1.1)) ** 2));
        if (ion > dust * 0.8) {
          p = ion * (1 - t) * 0.9;
          col = TAIL_ION;
        } else {
          p = dust * (1 - t) * 0.55;
          col = TAIL_DUST;
        }
      } else if (t <= 0) {
        const d = Math.hypot(i, j) / (radius * 1.7);
        if (d < 1) {
          p = (1 - d) ** 1.4 * 0.5;
          col = TAIL_ION;
        }
      }
      if (col && dith(x, y) < p) {
        const q = (y * f.w + x) * 4,
          k = 0.55;
        D[q] = mix(D[q]!, col[0], k);
        D[q + 1] = mix(D[q + 1]!, col[1], k);
        D[q + 2] = mix(D[q + 2]!, col[2], k);
      }
    }
}

export function drawSmallBody(
  f: Pixels,
  body: SmallBody,
  cx: number,
  cy: number,
  radius: number,
  turn: number,
  sun?: number
): Box | undefined {
  const r = Math.max(2, radius),
    reach = smallReach(body) * (r + 0.5) + 2;
  if (cx + reach < 0 || cy + reach < 0 || cx - reach > f.w || cy - reach > f.h) return undefined;
  if (body.type === 'comet' && r >= TAIL_FROM && r <= TAIL_UNTIL) drawTail(f, cx, cy, r, sun ?? SUN_ANGLE);
  const look = smallLook(body);
  release(look);
  return drawRock(f, look, { rot: body.phase + turn, tilt: body.tilt, sun }, cx, cy, r);
}
