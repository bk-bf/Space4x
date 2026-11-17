import { clamp, hash } from '#lib/gfx/math.ts';
import { dith } from '#lib/gfx/noise.ts';
import type { RGB } from '#lib/gfx/palette.ts';
import { LIGHT, orientation, SHADES, type Box, type Pixels, type SphereState } from './light.ts';
import { drawRock, rockReach } from './rock/raster.ts';
import { shadeSpan, spanRoom, type SpanStyle } from './surface.ts';
import { want } from './looks/bake.ts';
import { h3 } from './looks/math.ts';
import type { Look } from './looks/types.ts';

export type { Box, Pixels, SphereState };

const LXY = Math.hypot(LIGHT[0], LIGHT[1]);
const RING_REACH = 2.35;

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

function drawRings(f: Pixels, cx: number, cy: number, R: number, front: boolean): void {
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
      D[q + 3] = 255;
    }
}

const atmoThick = (look: Look, R: number) =>
  look.atmo && R >= 6 ? Math.max(1.5, R * 0.03 * (look.atmo.k ?? 1)) : 0;
const haloThick = (look: Look, R: number) =>
  look.halo && R >= 8 ? Math.max(1, R * 0.02 * (look.halo.k ?? 1)) : 0;

export const sphereReach = (look: Look, R: number): number =>
  look.surface
    ? (R + 0.5) * rockReach(look) + 1
    : R * (look.rings ? RING_REACH : 1) + atmoThick(look, R) + haloThick(look, R) + 1;

function drawStandIn(f: Pixels, look: Look, cx: number, cy: number, R: number): void {
  const D = f.d,
    W = f.w,
    X0 = Math.floor(cx),
    Y0 = Math.floor(cy),
    fx = cx - X0,
    fy = cy - Y0,
    small = R < 20,
    lim = small ? R * R + R * 0.8 : R * R,
    inv = 1 / (R + 0.5),
    reach = Math.ceil(sphereReach(look, R)),
    j0 = Math.max(-reach, -Y0),
    j1 = Math.min(reach, f.h - 1 - Y0),
    i0 = Math.max(-reach, -X0),
    i1 = Math.min(reach, W - 1 - X0);
  for (let j = j0; j <= j1; j++) {
    const dy = small ? j : j + 0.5 - fy;
    for (let i = i0; i <= i1; i++) {
      const dx = small ? i : i + 0.5 - fx,
        d2 = dx * dx + dy * dy;
      if (d2 > lim) continue;
      const nx = dx * inv,
        ny = dy * inv,
        n2 = 1 - nx * nx - ny * ny,
        nz = n2 > 0 ? Math.sqrt(n2) : 0,
        L = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2],
        x = X0 + i,
        y = Y0 + j,
        s = clamp(Math.floor((L * 1.15 + 0.12) * 3 + dith(x, y)), 0, 3),
        c = SHADES[s]!,
        q = (y * W + x) * 4;
      D[q] = look.tint[0] * c;
      D[q + 1] = look.tint[1] * c;
      D[q + 2] = look.tint[2] * c;
      D[q + 3] = 255;
    }
  }
}

export function drawSphere(
  f: Pixels,
  look: Look,
  st: SphereState,
  cx: number,
  cy: number,
  R: number
): Box | undefined {
  if (look.surface) return drawRock(f, look, st, cx, cy, R);
  const atmo = look.atmo,
    halo = look.halo,
    th = atmoThick(look, R),
    th2 = haloThick(look, R),
    RR = sphereReach(look, R);
  if (cx + RR < 0 || cy + RR < 0 || cx - RR > f.w || cy - RR > f.h) return undefined;
  if (!look.ready) {
    want(look);
    drawStandIn(f, look, cx, cy, R);
    return undefined;
  }
  const rings = look.rings && R >= 2.5;
  if (rings) drawRings(f, cx, cy, R, false);
  const P = orientation(st),
    P0 = P[0],
    P1 = P[1],
    P2 = P[2],
    P3 = P[3],
    P4 = P[4],
    P5 = P[5],
    P6 = P[6],
    P7 = P[7],
    P8 = P[8],
    shape = look.shape,
    D = f.d,
    W = f.w,
    E = R + th + th2,
    small = R < 20,
    lim = small ? R * R + R * 0.8 : R * R,
    X0 = Math.floor(cx),
    Y0 = Math.floor(cy),
    fx = cx - X0,
    fy = cy - Y0,
    style: SpanStyle = {
      lights: !!st.lights,
      cityNoise: R > 60 && look.cube.channels > 5,
      rimW: look.rimW,
      rim: atmo?.rim ?? 0.8,
      rimC: atmo && R > 10 && !shape ? atmo.c : undefined,
      rings: !!rings
    },
    inv = 1 / (R + 0.5),
    L0 = LIGHT[0],
    L1 = LIGHT[1],
    L2 = LIGHT[2];
  let sa = 0,
    sb = 0,
    sc = 0,
    qa = 0,
    qb = 0,
    qc = 0;
  if (shape) {
    sa = 1 / shape[0];
    sb = 1 / shape[1];
    sc = 1 / shape[2];
    qa = sa * sa;
    qb = sb * sb;
    qc = sc * sc;
  }
  const j0 = Math.max(Math.ceil(-E), -Y0),
    j1 = Math.min(Math.floor(E), f.h - 1 - Y0),
    i0 = Math.max(Math.ceil(-E), -X0),
    i1 = Math.min(Math.floor(E), W - 1 - X0);
  const sp = spanRoom(Math.max(0, i1 - i0 + 1)),
    SX = sp.px,
    SY = sp.py,
    SZ = sp.pz,
    SL = sp.light,
    SN = sp.nz,
    SXS = sp.x,
    SS = sp.shadow;
  let k = 0;
  for (let j = j0; j <= j1; j++) {
    const dy = small ? j : j + 0.5 - fy,
      y = Y0 + j,
      dy2 = dy * dy,
      ny0 = dy * inv;
    for (let i = i0; i <= i1; i++) {
      const dx = small ? i : i + 0.5 - fx,
        d2 = dx * dx + dy2,
        x = X0 + i,
        q = (y * W + x) * 4,
        nx0 = dx * inv;
      let nx: number, ny: number, nz: number, px: number, py: number, pz: number;
      if (shape) {
        const ox = P0 * nx0 + P1 * ny0,
          oy = P3 * nx0 + P4 * ny0,
          oz = P6 * nx0 + P7 * ny0,
          sox = ox * sa,
          soy = oy * sb,
          soz = oz * sc,
          sdx = P2 * sa,
          sdy = P5 * sb,
          sdz = P8 * sc,
          A = sdx * sdx + sdy * sdy + sdz * sdz,
          B = sox * sdx + soy * sdy + soz * sdz,
          C = sox * sox + soy * soy + soz * soz - 1,
          disc = B * B - A * C;
        if (disc < 0) continue;
        const sq = Math.sqrt(disc);
        const z = (-B + sq) / A,
          hx = ox + z * P2,
          hy = oy + z * P5,
          hz = oz + z * P8,
          bx = hx * qa,
          by = hy * qb,
          bz = hz * qc;
        const bl = 1 / h3(bx, by, bz),
          dl = 1 / h3(hx, hy, hz);
        nx = (P0 * bx + P3 * by + P6 * bz) * bl;
        ny = (P1 * bx + P4 * by + P7 * bz) * bl;
        nz = (P2 * bx + P5 * by + P8 * bz) * bl;
        px = hx * dl;
        py = hy * dl;
        pz = hz * dl;
      } else {
        if (d2 > lim) {
          if (!th) continue;
          const d = Math.sqrt(d2);
          if (d > E) continue;
          if (d <= R + th) {
            const g = (1 - (d - R) / th) * clamp(((dx * L0 + dy * L1) / d) * 2 + 0.9, 0, 1);
            if (dith(x, y) < g * 0.9) {
              D[q] = atmo!.c[0] * 0.8;
              D[q + 1] = atmo!.c[1] * 0.8;
              D[q + 2] = atmo!.c[2] * 0.95;
              D[q + 3] = 255;
            }
          } else if (th2) {
            const g = (1 - (d - R - th) / th2) * clamp(((dx * L0 + dy * L1) / d) * 2 + 0.9, 0, 1);
            if (dith(x, y) < g * 0.55) {
              D[q] = halo!.c[0] * 0.8;
              D[q + 1] = halo!.c[1] * 0.8;
              D[q + 2] = halo!.c[2] * 0.95;
              D[q + 3] = 255;
            }
          }
          continue;
        }
        const n2 = 1 - nx0 * nx0 - ny0 * ny0;
        nx = nx0;
        ny = ny0;
        nz = n2 > 0 ? Math.sqrt(n2) : 0;
        px = P0 * nx + P1 * ny + P2 * nz;
        py = P3 * nx + P4 * ny + P5 * nz;
        pz = P6 * nx + P7 * ny + P8 * nz;
      }
      SX[k] = px;
      SY[k] = py;
      SZ[k] = pz;
      SL[k] = nx * L0 + ny * L1 + nz * L2;
      SN[k] = nz;
      SXS[k] = x;
      if (rings)
        SS[k] =
          Math.abs(dy + 0.24 * Math.sqrt(Math.max(0, R * R - dx * dx)) * 0.9 - R * 0.02) < R * 0.045 ? 1 : 0;
      k++;
    }
    if (k) {
      sp.n = k;
      shadeSpan(f, y, look, P, R, style);
      k = 0;
    }
  }
  if (rings) drawRings(f, cx, cy, R, true);
}
