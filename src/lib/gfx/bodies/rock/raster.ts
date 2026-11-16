import { clamp } from '#lib/gfx/math.ts';
import { dith } from '#lib/gfx/noise.ts';
import {
  LIGHT,
  orientation,
  SHADES,
  type Box,
  type Pixels,
  type SphereState
} from '#lib/gfx/bodies/light.ts';
import { want } from '#lib/gfx/bodies/looks/bake.ts';
import type { Look } from '#lib/gfx/bodies/looks/types.ts';
import { DETAIL_SIZE, detailMap } from './detail.ts';
import { flatAt, icosphere, LEVELS, meshOf, normalsAt, type Mesh } from './mesh.ts';
import { PAINT_CHANNELS, paintOf, type Paint } from './paint.ts';

const EDGE_PX = 6;
const LEVEL_SLACK = 1.1;
const UNBAKED_REACH = 1.45;
const TEXEL_PX = 1.5;
const DETAIL_FROM = 45;
const DETAIL_RAMP = 110;
const DETAIL_AMP = 0.55;
const DETAIL_TONE = 1.6;
const SHADOW: readonly [number, number, number] = [3, 4, 12];
const MASK = DETAIL_SIZE - 1;
const SHIFT = Math.log2(DETAIL_SIZE);
const EMPTY = new Uint8ClampedArray(0);
const EMPTY_F = new Float32Array(0);
const EDGE_EPS = 1e-6;
const STEEP_COLOUR = 0.35;

let SX = new Float32Array(0);
let SY = new Float32Array(0);
let SZ = new Float32Array(0);
let NL = new Float32Array(0);
let depth = new Float32Array(0);
let tri = new Int32Array(0);
let wb = new Float32Array(0);
let wc = new Float32Array(0);

function room(verts: number, pixels: number): void {
  if (SX.length < verts) {
    SX = new Float32Array(verts);
    SY = new Float32Array(verts);
    SZ = new Float32Array(verts);
    NL = new Float32Array(verts);
  }
  if (depth.length < pixels) {
    depth = new Float32Array(pixels);
    tri = new Int32Array(pixels);
    wb = new Float32Array(pixels);
    wc = new Float32Array(pixels);
  }
}

export const levelFor = (R: number): number =>
  Math.min(LEVELS, Math.max(1, Math.ceil(Math.log2((R * LEVEL_SLACK) / EDGE_PX))));

export const rockReach = (look: Look): number => meshOf(look)?.reach ?? UNBAKED_REACH;

export const rockReady = (look: Look): boolean => look.ready && !!meshOf(look) && !!paintOf(look);

function disc(f: Pixels, look: Look, cx: number, cy: number, R: number): Box {
  const D = f.d,
    r = R + 0.5,
    x0 = Math.max(0, Math.floor(cx - r)),
    x1 = Math.min(f.w - 1, Math.ceil(cx + r)),
    y0 = Math.max(0, Math.floor(cy - r)),
    y1 = Math.min(f.h - 1, Math.ceil(cy + r));
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const dx = (x + 0.5 - cx) / r,
        dy = (y + 0.5 - cy) / r,
        n2 = 1 - dx * dx - dy * dy;
      if (n2 < 0) continue;
      const L = dx * LIGHT[0] + dy * LIGHT[1] + Math.sqrt(n2) * LIGHT[2],
        k = SHADES[clamp(Math.floor((L * 1.15 + 0.12) * 3 + dith(x, y)), 0, 3)]!,
        q = (y * f.w + x) * 4;
      D[q] = look.tint[0] * k;
      D[q + 1] = look.tint[1] * k;
      D[q + 2] = look.tint[2] * k;
      D[q + 3] = 255;
    }
  return { x0: cx - r, y0: cy - r, x1: cx + r, y1: cy + r };
}

export function drawRock(
  f: Pixels,
  look: Look,
  st: SphereState,
  cx: number,
  cy: number,
  R: number
): Box | undefined {
  const mesh = meshOf(look),
    Rp = R + 0.5;
  if (!look.ready) want(look);
  if (!mesh) return disc(f, look, cx, cy, R);
  const reach = Rp * mesh.reach + 1;
  if (cx + reach < 0 || cy + reach < 0 || cx - reach > f.w || cy - reach > f.h) return undefined;
  return raster(f, look, mesh, st, cx, cy, Rp);
}

function raster(f: Pixels, look: Look, mesh: Mesh, st: SphereState, cx: number, cy: number, Rp: number): Box {
  const level = levelFor(Rp),
    { tris, counts } = icosphere(),
    nv = counts[level]!,
    list = tris[level]!,
    N = normalsAt(mesh, level),
    pos = mesh.pos,
    P = orientation(st),
    P0 = P[0],
    P1 = P[1],
    P2 = P[2],
    P3 = P[3],
    P4 = P[4],
    P5 = P[5],
    P6 = P[6],
    P7 = P[7],
    P8 = P[8],
    lx = P0 * LIGHT[0] + P1 * LIGHT[1] + P2 * LIGHT[2],
    ly = P3 * LIGHT[0] + P4 * LIGHT[1] + P5 * LIGHT[2],
    lz = P6 * LIGHT[0] + P7 * LIGHT[1] + P8 * LIGHT[2];
  room(nv, 0);
  const sx = SX,
    sy = SY,
    sz = SZ,
    nl = NL;
  let bx0 = Infinity,
    by0 = Infinity,
    bx1 = -Infinity,
    by1 = -Infinity;
  for (let v = 0, o = 0; v < nv; v++, o += 3) {
    const ox = pos[o]!,
      oy = pos[o + 1]!,
      oz = pos[o + 2]!,
      x = cx + Rp * (P0 * ox + P3 * oy + P6 * oz),
      y = cy + Rp * (P1 * ox + P4 * oy + P7 * oz);
    sx[v] = x;
    sy[v] = y;
    sz[v] = P2 * ox + P5 * oy + P8 * oz;
    nl[v] = N[o]! * lx + N[o + 1]! * ly + N[o + 2]! * lz;
    if (x < bx0) bx0 = x;
    if (x > bx1) bx1 = x;
    if (y < by0) by0 = y;
    if (y > by1) by1 = y;
  }
  const box = { x0: bx0, y0: by0, x1: bx1, y1: by1 },
    X0 = Math.max(0, Math.floor(bx0)),
    Y0 = Math.max(0, Math.floor(by0)),
    X1 = Math.min(f.w - 1, Math.ceil(bx1)),
    Y1 = Math.min(f.h - 1, Math.ceil(by1));
  if (X0 > X1 || Y0 > Y1) return box;
  const BW = X1 - X0 + 1,
    BH = Y1 - Y0 + 1;
  room(nv, BW * BH);
  const zb = depth,
    T = tri,
    WB = wb,
    WC = wc;
  zb.fill(-Infinity, 0, BW * BH);
  T.fill(-1, 0, BW * BH);
  for (let k = 0; k < list.length; k += 3) {
    const a = list[k]!,
      b = list[k + 1]!,
      c = list[k + 2]!,
      ax = sx[a]!,
      ay = sy[a]!,
      bx = sx[b]!,
      by = sy[b]!,
      qx = sx[c]!,
      qy = sy[c]!,
      area = (bx - ax) * (qy - ay) - (by - ay) * (qx - ax);
    if (area <= 0) continue;
    const minX = Math.max(X0, Math.floor(Math.min(ax, bx, qx))),
      maxX = Math.min(X1, Math.ceil(Math.max(ax, bx, qx)) - 1),
      minY = Math.max(Y0, Math.floor(Math.min(ay, by, qy))),
      maxY = Math.min(Y1, Math.ceil(Math.max(ay, by, qy)) - 1);
    if (minX > maxX || minY > maxY) continue;
    const inv = 1 / area,
      az = sz[a]!,
      dzb = sz[b]! - az,
      dzc = sz[c]! - az,
      e1x = (qy - ay) * inv,
      e2x = (ay - by) * inv;
    for (let y = minY; y <= maxY; y++) {
      const py = y + 0.5,
        px = minX + 0.5,
        row = (y - Y0) * BW - X0;
      let w1 = ((px - ax) * (qy - ay) - (py - ay) * (qx - ax)) * inv,
        w2 = ((bx - ax) * (py - ay) - (by - ay) * (px - ax)) * inv;
      for (let x = minX; x <= maxX; x++, w1 += e1x, w2 += e2x) {
        if (w1 < -EDGE_EPS || w2 < -EDGE_EPS || w1 + w2 > 1 + EDGE_EPS) continue;
        const z = az + w1 * dzb + w2 * dzc,
          q = row + x;
        if (z <= zb[q]!) continue;
        zb[q] = z;
        T[q] = k;
        WB[q] = w1;
        WC[q] = w2;
      }
    }
  }
  shadePass(f, look, mesh, list, X0, Y0, BW, BH, Rp, lx, ly, lz);
  return box;
}

function shadePass(
  f: Pixels,
  look: Look,
  mesh: Mesh,
  list: Uint16Array,
  X0: number,
  Y0: number,
  BW: number,
  BH: number,
  Rp: number,
  lx: number,
  ly: number,
  lz: number
): void {
  const pos = mesh.pos,
    flat = flatAt(mesh, levelFor(Rp)),
    nl = NL,
    T = tri,
    WB = wb,
    WC = wc,
    D = f.d,
    W = f.w,
    paint: Paint | undefined = look.ready ? paintOf(look) : undefined,
    PD = paint ? paint.data : EMPTY,
    PF = paint?.face ?? 0,
    PH = paint?.half ?? 0,
    TOP = PF - 1,
    bumpK = paint && look.bump && Rp > 8 ? look.bump : 0,
    gk = ((look.gradRange * 2) / 255) * bumpK,
    g0 = gk * 127.5,
    tint = look.tint,
    detailK = DETAIL_AMP * clamp((Rp - DETAIL_FROM) / DETAIL_RAMP, 0, 1),
    det = detailK ? detailMap() : null,
    GU = det ? det.gu : EMPTY_F,
    GV = det ? det.gv : EMPTY_F,
    TN = det ? det.tone : EMPTY_F,
    octave = Math.log2(Rp / TEXEL_PX),
    s0 = 2 ** Math.floor(octave),
    s1 = s0 * 2,
    w1d = (octave - Math.floor(octave)) * detailK,
    w0d = detailK - w1d,
    t0d = w0d * DETAIL_TONE,
    t1d = w1d * DETAIL_TONE;
  let cr = tint[0],
    cg = tint[1],
    cb = tint[2];
  for (let j = 0; j < BH; j++) {
    const y = Y0 + j,
      row = j * BW;
    for (let i = 0; i < BW; i++) {
      const p = row + i,
        k = T[p]!;
      if (k < 0) continue;
      const va = list[k]!,
        vb = list[k + 1]!,
        vc = list[k + 2]!,
        a = va * 3,
        b = vb * 3,
        c = vc * 3,
        u = WB[p]!,
        v = WC[p]!,
        w = 1 - u - v,
        ox = pos[a]! * w + pos[b]! * u + pos[c]! * v,
        oy = pos[a + 1]! * w + pos[b + 1]! * u + pos[c + 1]! * v,
        oz = pos[a + 2]! * w + pos[b + 2]! * u + pos[c + 2]! * v,
        ax = ox < 0 ? -ox : ox,
        ay = oy < 0 ? -oy : oy,
        az = oz < 0 ? -oz : oz,
        xs = ax >= ay && ax >= az,
        ys = !xs && ay >= az;
      let g = 0,
        tone = 1;
      if (paint) {
        let face: number, fu: number, fv: number, m: number;
        if (xs) {
          face = ox > 0 ? 0 : 1;
          m = ax;
          fu = oz;
          fv = oy;
        } else if (ys) {
          face = oy > 0 ? 2 : 3;
          m = ay;
          fu = ox;
          fv = oz;
        } else {
          face = oz > 0 ? 4 : 5;
          m = az;
          fu = ox;
          fv = oy;
        }
        const sc = PH / m;
        fu = fu * sc + PH - 0.5;
        fv = fv * sc + PH - 0.5;
        fu = fu < 0 ? 0 : fu > TOP ? TOP : fu;
        fv = fv < 0 ? 0 : fv > TOP ? TOP : fv;
        const i0 = fu | 0,
          j0 = fv | 0,
          du = fu - i0,
          dw = fv - j0,
          base = (face * PF + j0) * PF + i0,
          q00 = base * PAINT_CHANNELS,
          q10 = i0 < TOP ? q00 + PAINT_CHANNELS : q00,
          q01 = j0 < TOP ? q00 + PF * PAINT_CHANNELS : q00,
          q11 = i0 < TOP ? q01 + PAINT_CHANNELS : q01,
          w11 = du * dw,
          w10 = du - w11,
          w01 = dw - w11,
          w00 = 1 - du - dw + w11;
        cr = PD[q00]! * w00 + PD[q10]! * w10 + PD[q01]! * w01 + PD[q11]! * w11;
        cg = PD[q00 + 1]! * w00 + PD[q10 + 1]! * w10 + PD[q01 + 1]! * w01 + PD[q11 + 1]! * w11;
        cb = PD[q00 + 2]! * w00 + PD[q10 + 2]! * w10 + PD[q01 + 2]! * w01 + PD[q11 + 2]! * w11;
        if (bumpK)
          g =
            ((PD[q00 + 3]! * w00 + PD[q10 + 3]! * w10 + PD[q01 + 3]! * w01 + PD[q11 + 3]! * w11) * gk - g0) *
              lx +
            ((PD[q00 + 4]! * w00 + PD[q10 + 4]! * w10 + PD[q01 + 4]! * w01 + PD[q11 + 4]! * w11) * gk - g0) *
              ly +
            ((PD[q00 + 5]! * w00 + PD[q10 + 5]! * w10 + PD[q01 + 5]! * w01 + PD[q11 + 5]! * w11) * gk - g0) *
              lz;
        const fl = flat[va]! * w + flat[vb]! * u + flat[vc]! * v,
          keep = STEEP_COLOUR + (1 - STEEP_COLOUR) * fl;
        g *= fl;
        cr = tint[0] + (cr - tint[0]) * keep;
        cg = tint[1] + (cg - tint[1]) * keep;
        cb = tint[2] + (cb - tint[2]) * keep;
      }
      if (det) {
        const su = xs ? oy : ox,
          sv = xs || ys ? oz : oy,
          q0 = ((Math.floor(sv * s0) & MASK) << SHIFT) | (Math.floor(su * s0) & MASK),
          q1 = ((Math.floor(sv * s1 + 97) & MASK) << SHIFT) | (Math.floor(su * s1 + 61) & MASK),
          du = GU[q0]! * w0d + GU[q1]! * w1d,
          dw = GV[q0]! * w0d + GV[q1]! * w1d;
        g += xs ? du * ly + dw * lz : ys ? du * lx + dw * lz : du * lx + dw * ly;
        tone = 1 + TN[q0]! * t0d + TN[q1]! * t1d;
      }
      const x = X0 + i,
        L = nl[va]! * w + nl[vb]! * u + nl[vc]! * v - g,
        s = clamp(Math.floor((L * 1.15 + 0.12) * 3 + dith(x, y)), 0, 3),
        kk = SHADES[s]! * tone,
        q = (y * W + x) * 4;
      if (s === 0) {
        D[q] = cr * kk + SHADOW[0];
        D[q + 1] = cg * kk + SHADOW[1];
        D[q + 2] = cb * kk + SHADOW[2];
      } else {
        D[q] = cr * kk;
        D[q + 1] = cg * kk;
        D[q + 2] = cb * kk;
      }
      D[q + 3] = 255;
    }
  }
}
