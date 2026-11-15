import { hash } from '../math';
import { dith } from '../noise';
import type { RGB } from '../palette';
import type { Sprite } from './builder';
import { EMISSIVE, M, NL, SYSTEM_RAMPS } from './palette';

export interface Pixels {
  readonly w: number;
  readonly h: number;
  readonly d: Uint8ClampedArray;
  px(x: number, y: number, c: RGB): void;
}

export type Light = readonly [number, number, number];

const DEFAULT_SUN = Math.atan2(-0.45, -0.55);
const ELEVATION = 0.7 / Math.hypot(0.55, 0.45);

export function lightFrom(sun = DEFAULT_SUN): Light {
  const l = Math.hypot(1, ELEVATION);
  return [Math.cos(sun) / l, Math.sin(sun) / l, ELEVATION / l];
}

const MOCKUP_LIGHT = [-0.55, -0.45, 0.7];
const MOCKUP_NORM = Math.hypot(...MOCKUP_LIGHT);

export const DEFAULT_LIGHT: Light = [
  MOCKUP_LIGHT[0]! / MOCKUP_NORM,
  MOCKUP_LIGHT[1]! / MOCKUP_NORM,
  MOCKUP_LIGHT[2]! / MOCKUP_NORM
];

const JAG = [0, 3, 5, 2, 6, 1, 4, 7, 3, 0, 5, 2, 7, 4, 1, 6];
const SHSTEP = [1.5, 3, 5, 8, 12];

export interface SpriteOptions {
  k?: number;
  light?: Light;
  frame?: number;
  own?: ArrayLike<number> | null;
  pal2?: Uint8Array;
  ghost?: number;
  cut?: number;
  dm?: Uint8Array | null;
  hi?: number;
  systems?: readonly ({ system: number } | null)[] | null;
  thr?: number;
  dead?: boolean;
  build?: number | null;
  charge?: boolean;
  maxX?: number;
}

export function drawSprite(
  f: Pixels,
  sp: Sprite,
  X: number,
  Y: number,
  ang: number,
  pal: Uint8Array,
  o: SpriteOptions = {}
): void {
  const c = Math.cos(ang),
    s = Math.sin(ang),
    w = sp.w,
    h = sp.h,
    pvx = sp.pvx,
    pvy = sp.pvy,
    sk = o.k ?? 1,
    ik = 1 / sk,
    R = sp.rad * sk + 1;
  const x0 = Math.max(0, Math.floor(X - R)),
    x1 = Math.min(f.w - 1, Math.ceil(X + R), o.maxX ?? 1e9),
    y0 = Math.max(0, Math.floor(Y - R)),
    y1 = Math.min(f.h - 1, Math.ceil(Y + R));
  if (x0 > x1 || y0 > y1) return;
  const LD = o.light ?? DEFAULT_LIGHT,
    LXY = Math.hypot(LD[0], LD[1]),
    TE = LD[2] / LXY;
  const FRAME = o.frame ?? 0,
    own = o.own,
    pal2 = o.pal2 ?? pal,
    ghost = o.ghost ?? 0,
    cut = o.cut ?? 0;
  const D = f.d,
    FW = f.w,
    Mm = sp.m,
    Zz = sp.z,
    Ee = sp.e,
    Tt = sp.t,
    Cc = sp.c,
    NX = sp.nx,
    NY = sp.ny,
    NZ = sp.nz;
  const lsx = (c * LD[0] + s * LD[1]) / LXY,
    lsy = (-s * LD[0] + c * LD[1]) / LXY;
  const lx = (c * LD[0] + s * LD[1]) / 127,
    ly = (-s * LD[0] + c * LD[1]) / 127,
    lz = LD[2] / 127;
  const dm = o.dm,
    hi = o.hi ?? 0,
    sys = o.systems ?? null,
    thr = o.thr ?? 1,
    dead = !!o.dead,
    build = o.build,
    tick = FRAME >> 1;
  const bx = build != null ? build * w : 1e9,
    shadow = sp.S >= 1.5;
  for (let sy = y0; sy <= y1; sy++) {
    const dy = sy + 0.5 - Y;
    let lo = x0 - X,
      hiX = x1 + 1 - X;
    if (Math.abs(c) > 1e-6) {
      const a = (-s * dy - pvx * sk) / c,
        b = ((w - pvx) * sk - s * dy) / c;
      lo = Math.max(lo, Math.min(a, b));
      hiX = Math.min(hiX, Math.max(a, b));
    } else if (s * dy * ik + pvx < 0 || s * dy * ik + pvx >= w) continue;
    if (Math.abs(s) > 1e-6) {
      const a = (c * dy + pvy * sk) / s,
        b = (c * dy - (h - pvy) * sk) / s;
      lo = Math.max(lo, Math.min(a, b));
      hiX = Math.min(hiX, Math.max(a, b));
    } else if (c * dy * ik + pvy < 0 || c * dy * ik + pvy >= h) continue;
    const xa = Math.max(x0, Math.floor(lo + X - 0.5)),
      xb = Math.min(x1, Math.ceil(hiX + X - 0.5));
    for (let sx = xa; sx <= xb; sx++) {
      const dx = sx + 0.5 - X,
        u = (c * dx + s * dy) * ik + pvx,
        v = (-s * dx + c * dy) * ik + pvy;
      if (u < 0 || v < 0 || u >= w || v >= h) continue;
      const ui = u | 0,
        vi = v | 0,
        i = vi * w + ui;
      let m = Mm[i]!;
      if (!m) continue;
      if (cut) {
        const q = ui + JAG[vi & 15]! * (sp.S > 2 ? 2 : 1);
        if (cut > 0 ? q > cut : q < -cut) continue;
      }
      const k = (sy * FW + sx) * 4;
      if (ghost) {
        if (hash(ui, vi, FRAME >> 2) > ghost) continue;
        const q = (m * NL + 2) * 3;
        D[k] = pal[q]! * 0.4 + 16;
        D[k + 1] = pal[q + 1]! * 0.4 + 26;
        D[k + 2] = pal[q + 2]! * 0.4 + 52;
        continue;
      }
      if (ui > bx) {
        if (ui > bx + w * 0.16 || !(ui % 5 === 0 || vi % 5 === 0)) continue;
        D[k] = 70;
        D[k + 1] = 74;
        D[k + 2] = 100;
        if (ui < bx + 3 && hash(ui, vi, FRAME >> 1) > 0.93) {
          D[k] = 200;
          D[k + 1] = 240;
          D[k + 2] = 255;
        }
        continue;
      }
      const dd = dm ? dm[i]! : 0;
      const e = Ee[i]!;
      const ow = own ? own[Cc[i]!]! : 0;
      if (ow === 1 && hash(ui, vi, FRAME >> 1) > 0.985) {
        D[k] = 255;
        D[k + 1] = 236;
        D[k + 2] = 170;
        continue;
      }
      if (e && !dead && dd < 120) {
        let col = EMISSIVE[e] ?? null,
          on = true;
        if (e === 3 || e === 4) on = ((FRAME >> 4) & 3) === 0;
        else if (e === 5) on = (FRAME + (ui & 31)) % 48 < 3;
        else if (e === 6) {
          const fl = hash(ui, vi, tick);
          col =
            thr < 0.05
              ? [60, 40, 50]
              : fl * thr > 0.55
                ? [255, 250, 230]
                : fl * thr > 0.2
                  ? [255, 200, 110]
                  : [240, 120, 60];
        } else if (e === 7) col = (FRAME >> 3) % 4 === (ui + vi) % 4 ? [230, 255, 255] : [110, 220, 235];
        else if (e === 8) col = hash(ui, vi, 5) > 0.5 ? [255, 130, 70] : [226, 96, 56];
        else if (e === 1) on = hash(ui, vi, FRAME >> 7) > 0.08;
        else if (e === 9) on = ((FRAME >> 2) + ui) % 8 < 5;
        else if (e === 10) on = o.charge ? true : ((FRAME >> 3) & 1) === 0;
        if (on && col) {
          D[k] = col[0];
          D[k + 1] = col[1];
          D[k + 2] = col[2];
          continue;
        }
      }
      const L = NX[i]! * lx + NY[i]! * ly + NZ[i]! * lz;
      let lv = 3.6 + (L - LD[2]) * 6 + Tt[i]! * 0.7;
      if (shadow) {
        const zz = Zz[i]!;
        for (let q = 0; q < 5; q++) {
          const d = SHSTEP[q]!,
            uu = (u + lsx * d) | 0,
            vv = (v + lsy * d) | 0;
          if (uu < 0 || vv < 0 || uu >= w || vv >= h) break;
          if (Zz[vv * w + uu]! > zz + d * TE + 0.8) {
            lv -= 1.7;
            break;
          }
        }
      }
      if (lv < 1) lv = 1;
      if (dd) {
        lv -= dd * 0.012;
        if (dd > 110) {
          m = M.char;
          lv += 1.2;
        }
        if (dd > 205 && hash(ui, vi, FRAME >> 3) > 0.9) {
          const hot = hash(ui, vi, 3) > 0.5;
          D[k] = 255;
          D[k + 1] = hot ? 190 : 110;
          D[k + 2] = hot ? 90 : 50;
          continue;
        }
      }
      if (hi && Cc[i] === hi) lv += (FRAME >> 3) & 1 ? 1.3 : 0.7;
      let l = (lv + (dith(sx, sy) - 0.5) * 0.5) | 0;
      if (l < 0) l = 0;
      else if (l > 5) l = 5;
      if (sys) {
        const q = (sys[Cc[i]!]!.system * NL + l) * 3;
        D[k] = SYSTEM_RAMPS[q]!;
        D[k + 1] = SYSTEM_RAMPS[q + 1]!;
        D[k + 2] = SYSTEM_RAMPS[q + 2]!;
      } else {
        const P = ow === 2 || (ow === 1 && ((FRAME >> 3) + Cc[i]!) & 1) ? pal2 : pal,
          q = (m * NL + l) * 3;
        D[k] = P[q]!;
        D[k + 1] = P[q + 1]!;
        D[k + 2] = P[q + 2]!;
      }
    }
  }
}

export interface SpritePick {
  comp: number;
  u: number;
  v: number;
  xu: number;
  yu: number;
}

export function pickSprite(
  sp: Sprite,
  X: number,
  Y: number,
  ang: number,
  sx: number,
  sy: number,
  k = 1
): SpritePick | null {
  const c = Math.cos(ang),
    s = Math.sin(ang),
    dx = sx + 0.5 - X,
    dy = sy + 0.5 - Y;
  const u = Math.floor((c * dx + s * dy) / k + sp.pvx),
    v = Math.floor((-s * dx + c * dy) / k + sp.pvy);
  if (u < 0 || v < 0 || u >= sp.w || v >= sp.h) return null;
  const i = v * sp.w + u;
  return sp.m[i] ? { comp: sp.c[i]!, u, v, xu: (u - sp.pvx) / sp.S, yu: (v - sp.pvy) / sp.S } : null;
}

export function dropShadow(f: Pixels, X: number, Y: number, r: number, light: Light = DEFAULT_LIGHT): void {
  const D = f.d,
    LXY = Math.hypot(light[0], light[1]),
    ox = (-light[0] / LXY) * r * 0.5,
    oy = (-light[1] / LXY) * r * 0.5;
  for (let j = -r; j <= r; j++)
    for (let i = -r; i <= r; i++) {
      if (i * i + j * j > r * r) continue;
      const x = Math.round(X + ox + i),
        y = Math.round(Y + oy + j);
      if (x < 0 || y < 0 || x >= f.w || y >= f.h) continue;
      const k = (y * f.w + x) * 4;
      D[k] = D[k]! * 0.55;
      D[k + 1] = D[k + 1]! * 0.55;
      D[k + 2] = D[k + 2]! * 0.62;
    }
}

const PLUME: readonly (readonly RGB[])[] = [
  [
    [255, 250, 224],
    [255, 214, 120],
    [240, 130, 60],
    [150, 62, 60]
  ],
  [
    [235, 250, 255],
    [130, 220, 255],
    [70, 140, 240],
    [50, 70, 170]
  ]
];

export function plume(
  f: Pixels,
  X: number,
  Y: number,
  ang: number,
  r: number,
  len: number,
  hot: boolean,
  FRAME: number
): void {
  if (len < 1) return;
  const c = Math.cos(ang),
    s = Math.sin(ang),
    ex = -c * len,
    ey = -s * len,
    px = Math.abs(s) * r,
    py = Math.abs(c) * r;
  const y0 = Math.max(0, Math.floor(Y + Math.min(0, ey) - py)),
    y1 = Math.min(f.h - 1, Math.ceil(Y + Math.max(0, ey) + py));
  const X0 = Math.max(0, Math.floor(X + Math.min(0, ex) - px)),
    X1 = Math.min(f.w - 1, Math.ceil(X + Math.max(0, ex) + px));
  const D = f.d,
    cols = PLUME[hot ? 1 : 0]!,
    wob = FRAME * 0.9,
    fr = FRAME * 5;
  for (let sy = y0; sy <= y1; sy++) {
    const dy = sy + 0.5 - Y;
    let lo = X0 - X,
      hi = X1 + 1 - X;
    if (Math.abs(c) > 1e-6) {
      const a = (-s * dy) / c,
        b = (-len - s * dy) / c;
      lo = Math.max(lo, Math.min(a, b));
      hi = Math.min(hi, Math.max(a, b));
    }
    if (Math.abs(s) > 1e-6) {
      const a = (c * dy - r) / s,
        b = (c * dy + r) / s;
      lo = Math.max(lo, Math.min(a, b));
      hi = Math.min(hi, Math.max(a, b));
    }
    const xa = Math.max(X0, Math.floor(lo + X - 0.5)),
      xb = Math.min(X1, Math.ceil(hi + X - 0.5));
    for (let sx = xa; sx <= xb; sx++) {
      const dx = sx + 0.5 - X,
        d = -(c * dx + s * dy),
        wv = Math.abs(-s * dx + c * dy);
      if (d < 0 || d > len) continue;
      const t = d / len,
        hw = r * (1 - t * 0.35) * (0.85 + 0.15 * Math.sin(d * 1.3 - wob));
      if (wv > hw) continue;
      const q =
        t + (wv / hw) * 0.45 + (dith(sx, sy) - 0.5) * 0.5 + (((sx * 7 + sy * 13 + fr) & 15) - 8) * 0.016;
      if (q > 0.98) continue;
      const col = cols[q < 0.22 ? 0 : q < 0.45 ? 1 : q < 0.7 ? 2 : 3]!,
        k = (sy * f.w + sx) * 4;
      D[k] = col[0];
      D[k + 1] = col[1];
      D[k + 2] = col[2];
    }
  }
}

export type Hit = readonly [xu: number, yu: number, r: number, severity: number];

export function damageMap(
  sp: Sprite,
  hits: readonly Hit[],
  dm: Uint8Array = new Uint8Array(sp.w * sp.h),
  from = 0
): Uint8Array {
  const S = sp.S;
  for (let q = from; q < hits.length; q++) {
    const [xu, yu, r, sev] = hits[q]!;
    const X = sp.pvx + xu * S,
      Y = sp.pvy + yu * S,
      R = r * S + 1;
    for (let j = Math.max(0, Math.floor(Y - R)); j <= Math.min(sp.h - 1, Y + R); j++)
      for (let i = Math.max(0, Math.floor(X - R)); i <= Math.min(sp.w - 1, X + R); i++) {
        const d = Math.hypot(i + 0.5 - X, j + 0.5 - Y) / R;
        if (d > 1) continue;
        const v = (1 - d * d) * sev * (0.7 + hash(i, j, 7) * 0.6),
          k = j * sp.w + i;
        if (v > dm[k]!) dm[k] = Math.min(255, v);
      }
  }
  return dm;
}

export function hullPoint(sp: Sprite, xu: number, yu: number): [number, number] {
  for (let q = 0; q < 6; q++) {
    const u = Math.floor(sp.pvx + xu * sp.S),
      v = Math.floor(sp.pvy + yu * sp.S);
    if (u >= 0 && v >= 0 && u < sp.w && v < sp.h && sp.m[v * sp.w + u]) return [xu, yu];
    yu *= 0.6;
    xu *= 0.85;
  }
  return [0, 0];
}
