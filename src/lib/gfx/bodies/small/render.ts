import { LIGHT } from '#lib/gfx/bodies/sphere.ts';
import { clamp, mix } from '#lib/gfx/math.ts';
import { dith, noise3 } from '#lib/gfx/noise.ts';
import type { RGB } from '#lib/gfx/palette.ts';
import { bakeField, fieldClass, sampleRadius, sampleTone, type Field } from './field.ts';
import { shapeReach, type ShapeSpec } from './shape.ts';

export type SmallType = 'carbonaceous' | 'stony' | 'metallic' | 'comet';

export type ShapeFamily = 'top' | 'contact' | 'peanut' | 'elongated' | 'bone' | 'lumpy' | 'round' | 'nucleus';

export interface SmallBody {
  readonly key: string;
  readonly name: string;
  readonly type: SmallType;
  readonly family: ShapeFamily;
  readonly spec: ShapeSpec;
  readonly tilt: number;
  readonly phase: number;
  readonly dir: 1 | -1;
}

export interface Pixels {
  readonly w: number;
  readonly h: number;
  readonly d: Uint8ClampedArray;
}

interface Look {
  readonly base: RGB;
  readonly grain: number;
  readonly toneGain: number;
  readonly shades: readonly number[];
  readonly sheen: number;
}

const LOOKS: Record<SmallType, Look> = {
  carbonaceous: { base: [112, 102, 98], grain: 0.14, toneGain: 0.7, shades: [0.34, 0.58, 0.8, 1], sheen: 0 },
  stony: { base: [178, 156, 130], grain: 0.3, toneGain: 0.9, shades: [0.2, 0.5, 0.76, 1], sheen: 0 },
  metallic: { base: [150, 154, 168], grain: 0.16, toneGain: 0.8, shades: [0.16, 0.44, 0.74, 1], sheen: 1 },
  comet: { base: [92, 82, 78], grain: 0.16, toneGain: 0.5, shades: [0.3, 0.55, 0.78, 1], sheen: 0 }
};

export const SPIN_FRAMES = 48;
export const SPIN_TICKS = 5;
export const SPIN_MAX_RADIUS = 170;
const SETTLE_FROM = 6;
const SPRITE_BUDGET = 96 * 1024 * 1024;
const FIELD_LIMIT = 14;
const MIN_STEP_PX = 0.45;
const BISECT = 5;
const MAX_MARCH = 90;
const SAFETY = 0.85;
const GRAIN_COARSE = 8;
const MID_PERIOD = 11;
const GRIT_PERIOD = 3.2;
const FINE_FROM = 30;
const SHEEN: RGB = [236, 241, 255];
const HALF_V = (() => {
  const x = LIGHT[0],
    y = LIGHT[1],
    z = LIGHT[2] + 1,
    l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l] as const;
})();

interface Sprite {
  readonly w: number;
  readonly h: number;
  readonly ox: number;
  readonly oy: number;
  readonly d: Uint8ClampedArray;
}

const fields = new Map<string, Field>();
const sprites = new Map<string, Sprite>();
let spriteBytes = 0;

function fieldOf(body: SmallBody, radius: number): Field {
  const cls = fieldClass(radius),
    key = `${body.key}|${cls.size}`;
  let f = fields.get(key);
  if (f) {
    fields.delete(key);
    fields.set(key, f);
    return f;
  }
  f = bakeField(body.spec, cls);
  fields.set(key, f);
  if (fields.size > FIELD_LIMIT) fields.delete(fields.keys().next().value!);
  return f;
}

export const smallReach = (body: SmallBody): number => shapeReach(body.spec);

export const spinStep = (t: number): number => Math.floor(t / SPIN_TICKS);

export const spins = (radius: number): boolean => radius <= SPIN_MAX_RADIUS;

export function spinFrame(body: SmallBody, step: number, radius: number): number {
  const s = spins(radius) ? step * body.dir : 0;
  return (((body.phase + s) % SPIN_FRAMES) + SPIN_FRAMES) % SPIN_FRAMES;
}

function hullSpan(
  bounds: Float64Array,
  q0x: number,
  q0y: number,
  q0z: number,
  ex: number,
  ez: number,
  out: Float64Array
): boolean {
  let top = -Infinity,
    bottom = Infinity;
  for (let k = 0; k < bounds.length; k += 6) {
    const ix = 1 / (bounds[k + 3]! * bounds[k + 3]!),
      iy = 1 / (bounds[k + 4]! * bounds[k + 4]!),
      iz = 1 / (bounds[k + 5]! * bounds[k + 5]!),
      dx = q0x - bounds[k]!,
      dy = q0y - bounds[k + 1]!,
      dz = q0z - bounds[k + 2]!,
      a = ex * ex * ix + ez * ez * iz,
      b = ex * dx * ix + ez * dz * iz,
      c = dx * dx * ix + dy * dy * iy + dz * dz * iz - 1,
      disc = b * b - a * c;
    if (disc < 0) continue;
    const s = Math.sqrt(disc),
      hi = (-b + s) / a,
      lo = (-b - s) / a;
    if (hi > top) top = hi;
    if (lo < bottom) bottom = lo;
  }
  out[0] = top;
  out[1] = bottom;
  return top > bottom;
}

const span = new Float64Array(2);

function march(
  field: Field,
  tx: number,
  ty: number,
  cr: number,
  sr: number,
  rho: number,
  zTop: number,
  zBottom: number,
  minStep: number,
  slope: number
): number {
  let z = zTop,
    outside = zTop;
  for (let n = 0; n < MAX_MARCH && z > zBottom; n++) {
    const px = tx * cr + z * sr,
      pz = z * cr - tx * sr,
      len = Math.sqrt(px * px + ty * ty + pz * pz),
      g = len - sampleRadius(field, px, ty, pz);
    if (g <= 0) {
      let lo = z,
        hi = outside;
      for (let k = 0; k < BISECT && hi > lo; k++) {
        const m = (lo + hi) * 0.5,
          qx = tx * cr + m * sr,
          qz = m * cr - tx * sr,
          ql = Math.sqrt(qx * qx + ty * ty + qz * qz);
        if (ql - sampleRadius(field, qx, ty, qz) <= 0) lo = m;
        else hi = m;
      }
      return lo;
    }
    outside = z;
    const bound = (Math.abs(z) + slope * rho) / len;
    z -= Math.max((g * SAFETY) / (bound > 0.15 ? bound : 0.15), minStep);
  }
  return NaN;
}

function paintBody(
  out: Uint8ClampedArray,
  ow: number,
  oh: number,
  cx: number,
  cy: number,
  body: SmallBody,
  field: Field,
  rn: number,
  rot: number
): void {
  const look = LOOKS[body.type],
    [br, bg, bb] = look.base,
    shades = look.shades,
    cr = Math.cos(rot),
    sr = Math.sin(rot),
    ct = Math.cos(body.tilt),
    st = Math.sin(body.tilt),
    rmax = field.rmax,
    inv = 1 / rn,
    minStep = MIN_STEP_PX * inv,
    slope = field.slope,
    eps = 2.6 / field.size,
    half = Math.ceil(rmax * rn) + 1,
    L0 = LIGHT[0],
    L1 = LIGHT[1],
    L2 = LIGHT[2],
    fine = rn > FINE_FROM,
    mid = rn / MID_PERIOD,
    grit = rn / GRIT_PERIOD,
    grainOn = rn > 8,
    j0 = Math.max(-half, -cy),
    j1 = Math.min(half, oh - 1 - cy),
    i0 = Math.max(-half, -cx),
    i1 = Math.min(half, ow - 1 - cx);
  for (let j = j0; j <= j1; j++) {
    const y = j * inv;
    for (let i = i0; i <= i1; i++) {
      const x = i * inv,
        tx = x * ct + y * st,
        ty = y * ct - x * st;
      if (!hullSpan(field.bounds, tx * cr, ty, -tx * sr, sr, cr, span)) continue;
      const z = march(field, tx, ty, cr, sr, Math.sqrt(x * x + y * y), span[0]!, span[1]!, minStep, slope);
      if (z !== z) continue;
      const px = tx * cr + z * sr,
        pz = z * cr - tx * sr,
        len = Math.sqrt(px * px + ty * ty + pz * pz),
        dx = px / len,
        dy = ty / len,
        dz = pz / len;
      let ux: number, uy: number, uz: number;
      if (Math.abs(dy) > 0.9) {
        ux = 0;
        uy = -dz;
        uz = dy;
      } else {
        ux = dz;
        uy = 0;
        uz = -dx;
      }
      const ul = 1 / Math.sqrt(ux * ux + uy * uy + uz * uz);
      ux *= ul;
      uy *= ul;
      uz *= ul;
      const vx = dy * uz - dz * uy,
        vy = dz * ux - dx * uz,
        vz = dx * uy - dy * ux,
        r = sampleRadius(field, dx, dy, dz),
        ir = 1 / (r * eps),
        g1 = sampleRadius(field, dx + ux * eps, dy + uy * eps, dz + uz * eps) - r,
        g2 = sampleRadius(field, dx + vx * eps, dy + vy * eps, dz + vz * eps) - r,
        bnx = dx - (g1 * ux + g2 * vx) * ir,
        bny = dy - (g1 * uy + g2 * vy) * ir,
        bnz = dz - (g1 * uz + g2 * vz) * ir,
        bl = 1 / Math.sqrt(bnx * bnx + bny * bny + bnz * bnz),
        nbx = bnx * bl,
        nby = bny * bl,
        nbz = bnz * bl,
        wx = nbx * cr - nbz * sr,
        wz = nbz * cr + nbx * sr,
        nx = wx * ct - nby * st,
        ny = nby * ct + wx * st,
        nz = wz,
        L = nx * L0 + ny * L1 + nz * L2,
        dv = dith(cx + i, cy + j),
        s = clamp(Math.floor((L * 1.15 + 0.12) * 3 + dv), 0, 3),
        k = shades[s]!;
      let albedo = 1 + sampleTone(field, dx, dy, dz) * look.toneGain;
      if (grainOn) {
        let n = (noise3(dx * GRAIN_COARSE + 3, dy * GRAIN_COARSE, dz * GRAIN_COARSE) - 0.5) * 2;
        if (fine) n += (noise3(dx * mid + 9, dy * mid, dz * mid) - 0.5) * 1.6;
        if (fine) n += (noise3(dx * grit + 5, dy * grit, dz * grit) - 0.5) * 1.4;
        albedo += n * look.grain;
      }
      albedo = clamp(albedo, 0.45, 1.5);
      let rr = br * albedo * k,
        gg = bg * albedo * k,
        bl2 = bb * albedo * k;
      if (s === 0) {
        rr += 3;
        gg += 4;
        bl2 += 12;
      } else if (look.sheen) {
        const h = Math.max(0, nx * HALF_V[0] + ny * HALF_V[1] + nz * HALF_V[2]),
          h2 = h * h,
          h4 = h2 * h2,
          h8 = h4 * h4,
          sp = h8 * h8 * h2;
        if (dv < sp * 1.0 - 0.3) {
          const m = 0.35 + 0.2 * sp;
          rr = mix(rr, SHEEN[0], m);
          gg = mix(gg, SHEEN[1], m);
          bl2 = mix(bl2, SHEEN[2], m);
        }
      }
      const q = ((cy + j) * ow + cx + i) * 4;
      out[q] = rr;
      out[q + 1] = gg;
      out[q + 2] = bl2;
      out[q + 3] = 255;
    }
  }
}

function remember(key: string, sprite: Sprite): void {
  sprites.set(key, sprite);
  spriteBytes += sprite.d.length;
  while (spriteBytes > SPRITE_BUDGET) {
    const first = sprites.keys().next().value!,
      old = sprites.get(first)!;
    sprites.delete(first);
    spriteBytes -= old.d.length;
  }
}

function spriteOf(body: SmallBody, radius: number, frame: number): Sprite {
  const key = `${body.key}|${radius}|${frame}`,
    hitSprite = sprites.get(key);
  if (hitSprite) {
    sprites.delete(key);
    sprites.set(key, hitSprite);
    return hitSprite;
  }
  const field = fieldOf(body, radius),
    rn = radius + 0.5,
    half = Math.ceil(field.rmax * rn) + 1,
    size = half * 2 + 1,
    d = new Uint8ClampedArray(size * size * 4);
  paintBody(d, size, size, half, half, body, field, rn, (frame * Math.PI * 2) / SPIN_FRAMES);
  const sprite = { w: size, h: size, ox: half, oy: half, d };
  remember(key, sprite);
  return sprite;
}

function blit(f: Pixels, s: Sprite, cx: number, cy: number): void {
  const x0 = cx - s.ox,
    y0 = cy - s.oy,
    i0 = Math.max(0, -x0),
    i1 = Math.min(s.w, f.w - x0),
    j0 = Math.max(0, -y0),
    j1 = Math.min(s.h, f.h - y0),
    D = f.d,
    S = s.d;
  for (let j = j0; j < j1; j++) {
    let a = (j * s.w + i0) * 4,
      b = ((y0 + j) * f.w + x0 + i0) * 4;
    for (let i = i0; i < i1; i++, a += 4, b += 4)
      if (S[a + 3]) {
        D[b] = S[a]!;
        D[b + 1] = S[a + 1]!;
        D[b + 2] = S[a + 2]!;
        D[b + 3] = 255;
      }
  }
}

const TAIL_ION: RGB = [150, 200, 240];
const TAIL_DUST: RGB = [220, 196, 150];
const TAIL_LENGTH = 7;
const TAIL_ANGLE = Math.atan2(-LIGHT[1], -LIGHT[0]);

function drawTail(f: Pixels, cx: number, cy: number, radius: number): void {
  const length = Math.min(radius * TAIL_LENGTH, 140),
    ax = Math.cos(TAIL_ANGLE),
    ay = Math.sin(TAIL_ANGLE),
    D = f.d,
    reach = Math.ceil(length + radius * 2);
  for (let j = -reach; j <= reach; j++)
    for (let i = -reach; i <= reach; i++) {
      const x = cx + i,
        y = cy + j;
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

const LEVELS = [3, 4, 5, 6, 7, 8, 10, 12, 14, 17, 20, 24, 29, 35, 42, 50, 60, 72, 86, 104, 125, 150, 170];
const SEEN_LIMIT = 4000;
const seen = new Set<string>();

function levelFor(radius: number): number {
  let best = LEVELS[0]!,
    gap = Infinity;
  for (const l of LEVELS) {
    const g = Math.abs(Math.log(radius / l));
    if (g < gap) {
      gap = g;
      best = l;
    }
  }
  return best;
}

function blitScaled(f: Pixels, s: Sprite, cx: number, cy: number, ratio: number): void {
  const hx = Math.ceil(s.ox * ratio),
    hy = Math.ceil(s.oy * ratio),
    D = f.d,
    S = s.d,
    j0 = Math.max(-hy, -cy),
    j1 = Math.min(hy, f.h - 1 - cy),
    i0 = Math.max(-hx, -cx),
    i1 = Math.min(hx, f.w - 1 - cx);
  for (let j = j0; j <= j1; j++) {
    const sy = s.oy + Math.round(j / ratio);
    if (sy < 0 || sy >= s.h) continue;
    for (let i = i0; i <= i1; i++) {
      const sx = s.ox + Math.round(i / ratio);
      if (sx < 0 || sx >= s.w) continue;
      const a = (sy * s.w + sx) * 4;
      if (!S[a + 3]) continue;
      const b = ((cy + j) * f.w + cx + i) * 4;
      D[b] = S[a]!;
      D[b + 1] = S[a + 1]!;
      D[b + 2] = S[a + 2]!;
      D[b + 3] = 255;
    }
  }
}

export function drawSmallBody(
  f: Pixels,
  body: SmallBody,
  cx: number,
  cy: number,
  radius: number,
  step: number
): void {
  const r = Math.max(2, Math.round(radius)),
    x = Math.round(cx),
    y = Math.round(cy),
    frame = spinFrame(body, step, r),
    reach = Math.ceil(smallReach(body) * (r + 0.5) * 1.1) + 2;
  if (x + reach < 0 || y + reach < 0 || x - reach > f.w || y - reach > f.h) return;
  if (body.type === 'comet' && r >= 5) drawTail(f, x, y, r);
  if (r > SPIN_MAX_RADIUS) {
    paintBody(f.d, f.w, f.h, x, y, body, fieldOf(body, r), r + 0.5, (frame * Math.PI * 2) / SPIN_FRAMES);
    return;
  }
  const exact = `${body.key}|${r}|${frame}`;
  if (r >= SETTLE_FROM && !sprites.has(exact)) {
    const mark = `${body.key}|${r}`;
    if (!seen.has(mark)) {
      if (seen.size > SEEN_LIMIT) seen.clear();
      seen.add(mark);
      const level = levelFor(r);
      blitScaled(f, spriteOf(body, level, spinFrame(body, step, level)), x, y, r / level);
      return;
    }
  }
  blit(f, spriteOf(body, r, frame), x, y);
}

export function renderSprite(body: SmallBody, radius: number, step: number): Uint8ClampedArray {
  const r = Math.max(2, Math.round(radius));
  return spriteOf(body, r, spinFrame(body, step, r)).d;
}
