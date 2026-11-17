import { clamp } from '#lib/gfx/math.ts';
import { dith } from '#lib/gfx/noise.ts';
import {
  lightOf,
  orientation,
  SHADES,
  type Box,
  type Light,
  type Pixels,
  type SphereState
} from '#lib/gfx/bodies/light.ts';
import { want } from '#lib/gfx/bodies/looks/bake.ts';
import type { Look } from '#lib/gfx/bodies/looks/types.ts';
import type { Mat } from '#lib/gfx/bodies/looks/math.ts';
import { PLAIN, shadeSpan, spanRoom } from '#lib/gfx/bodies/surface.ts';
import { icosphere, LEVELS, meshOf, normalsAt, type Mesh } from './mesh.ts';

const EDGE_PX = 6;
const LEVEL_SLACK = 1.1;
const UNBAKED_REACH = 1.45;
const EDGE_EPS = 1e-6;

let SX = new Float32Array(0);
let SY = new Float32Array(0);
let SZ = new Float32Array(0);
let NL = new Float32Array(0);
let NZ = new Float32Array(0);
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
    NZ = new Float32Array(verts);
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

export const rockReady = (look: Look): boolean => look.ready && !!meshOf(look);

function disc(f: Pixels, look: Look, cx: number, cy: number, R: number, light: Light): Box {
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
      const L = dx * light[0] + dy * light[1] + Math.sqrt(n2) * light[2],
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
  if (!mesh) return disc(f, look, cx, cy, R, lightOf(st));
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
    light = lightOf(st),
    lx = P0 * light[0] + P1 * light[1] + P2 * light[2],
    ly = P3 * light[0] + P4 * light[1] + P5 * light[2],
    lz = P6 * light[0] + P7 * light[1] + P8 * light[2];
  room(nv, 0);
  const sx = SX,
    sy = SY,
    sz = SZ,
    nl = NL,
    nzs = NZ;
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
    nzs[v] = P2 * N[o]! + P5 * N[o + 1]! + P8 * N[o + 2]!;
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
  shadePass(f, look, mesh, list, P, X0, Y0, BW, BH, Rp, light);
  return box;
}

function shadePass(
  f: Pixels,
  look: Look,
  mesh: Mesh,
  list: Uint16Array,
  P: Mat,
  X0: number,
  Y0: number,
  BW: number,
  BH: number,
  Rp: number,
  light: Light
): void {
  const pos = mesh.pos,
    nl = NL,
    nzs = NZ,
    T = tri,
    WB = wb,
    WC = wc,
    D = f.d,
    W = f.w,
    ready = look.ready,
    tint = look.tint,
    sp = spanRoom(BW),
    SX = sp.px,
    SY = sp.py,
    SZ = sp.pz,
    SL = sp.light,
    SN = sp.nz,
    SXS = sp.x;
  let n = 0;
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
        u = WB[p]!,
        v = WC[p]!,
        w = 1 - u - v,
        x = X0 + i,
        q = (y * W + x) * 4,
        dv = dith(x, y),
        L = nl[va]! * w + nl[vb]! * u + nl[vc]! * v;
      if (!ready) {
        const kk = SHADES[clamp(Math.floor((L * 1.15 + 0.12) * 3 + dv), 0, 3)]!;
        D[q] = tint[0] * kk;
        D[q + 1] = tint[1] * kk;
        D[q + 2] = tint[2] * kk;
        D[q + 3] = 255;
        continue;
      }
      const a = va * 3,
        b = vb * 3,
        c = vc * 3,
        ox = pos[a]! * w + pos[b]! * u + pos[c]! * v,
        oy = pos[a + 1]! * w + pos[b + 1]! * u + pos[c + 1]! * v,
        oz = pos[a + 2]! * w + pos[b + 2]! * u + pos[c + 2]! * v,
        il = 1 / Math.sqrt(ox * ox + oy * oy + oz * oz);
      SX[n] = ox * il;
      SY[n] = oy * il;
      SZ[n] = oz * il;
      SL[n] = L;
      SN[n] = nzs[va]! * w + nzs[vb]! * u + nzs[vc]! * v;
      SXS[n] = x;
      n++;
    }
    if (n) {
      sp.n = n;
      shadeSpan(f, y, look, P, Rp, PLAIN, light);
      n = 0;
    }
  }
}
