import { noise3 } from '#lib/gfx/noise.ts';
import type { Pixels } from '#lib/gfx/bodies/light.ts';

export interface CometTail {
  readonly au: number;
  readonly motion: number;
}

export const TAIL_FROM = 5;
export const TAIL_UNTIL = 40;

const LENGTH_K = 9;
const LENGTH_MAX = 230;
const COMA_K = 1.6;
const COMA_REACH = 3;
const DUST_K = 0.75;
const DUST_SHARE = 0.8;
const CUT = 5;
const ION_SPREAD = Math.sqrt(CUT);
const DUST_SPREAD = Math.sqrt(CUT);
const FLOOR = 8;
const NEGLIGIBLE = 0.5;
const LEVELS = 6;
const GAIN = 0.9;

const ACTIVITY: readonly (readonly [number, number])[] = [
  [1, 1],
  [3, 0.55],
  [5, 0.18],
  [5.5, 0]
];

export function activityAt(au: number): number {
  if (au <= ACTIVITY[0]![0]) return 1;
  for (let i = 1; i < ACTIVITY.length; i++) {
    const [a1, v1] = ACTIVITY[i]!,
      [a0, v0] = ACTIVITY[i - 1]!;
    if (au <= a1) return v0 + ((v1 - v0) * (au - a0)) / (a1 - a0);
  }
  return 0;
}

export const tailShown = (radius: number, au: number): boolean =>
  radius >= TAIL_FROM && radius <= TAIL_UNTIL && activityAt(au) > 0;

const tailLength = (radius: number, act: number): number => Math.min(radius * LENGTH_K, LENGTH_MAX) * act;

const ionWidth = (r: number, along: number): number => r * 0.28 + along * 0.05;
const dustWidth = (r: number, along: number): number => r * 0.55 + along * 0.32;
const dustBend = (dl: number, td: number): number => 0.275 * dl * td * td;

export function tailReach(radius: number, au: number): number {
  const act = activityAt(au);
  if (act <= 0) return 0;
  const L = tailLength(radius, act),
    dl = L * DUST_SHARE;
  return Math.max(
    COMA_REACH * radius,
    Math.hypot(L, ION_SPREAD * ionWidth(radius, L)),
    Math.hypot(dl, dustBend(dl, 1) + DUST_SPREAD * dustWidth(radius, dl))
  );
}

const STEPS = 256;

function table(fn: (v: number) => number, top: number): Float64Array {
  const t = new Float64Array(STEPS + 2);
  for (let k = 0; k <= STEPS + 1; k++) t[k] = fn((Math.min(k, STEPS) / STEPS) * top);
  return t;
}

const GAUSS = table((q) => Math.exp(-q), CUT);
const ION_FALL = table((u) => u ** 1.6, 1);
const DUST_FALL = table((u) => u ** 1.3, 1);

const look = (t: Float64Array, v: number): number => {
  const k = Math.floor(v),
    a = t[k]!;
  return a + (t[k + 1]! - a) * (v - k);
};

const ign = (x: number, y: number): number => {
  const f = 52.9829189 * ((0.06711056 * x + 0.00583715 * y) % 1);
  return f - Math.floor(f);
};

const HULL_STEPS = 16;

const spread = (peak: number): number =>
  Math.min(Math.sqrt(CUT), Math.sqrt(Math.max(0, Math.log((peak * 3) / FLOOR))));

function envelope(r: number, L: number, dl: number, side: number, a: number, up: number): number {
  const back = Math.max(0, a - L / HULL_STEPS),
    ionPeak = 255 * 0.95 * Math.max(0, 1 - back / L) ** 1.6;
  let edge =
    Math.max(Math.sqrt(Math.max(0, (COMA_REACH * r) ** 2 - a * a)), spread(ionPeak) * ionWidth(r, a)) * up;
  if (a <= dl) {
    const dustPeak = 240 * DUST_K * Math.max(0, 1 - back / dl) ** 1.3,
      dust = side * dustBend(dl, a / dl) + up * spread(dustPeak) * dustWidth(r, a);
    edge = up > 0 ? Math.max(edge, dust) : Math.min(edge, dust);
  }
  return edge;
}

function hull(r: number, L: number, dl: number, side: number): number[] {
  const c = COMA_REACH * r,
    out = [-c, -c, -c, c];
  for (let k = 0; k <= HULL_STEPS; k++) {
    const a = (L * k) / HULL_STEPS;
    out.push(a, envelope(r, L, dl, side, a, 1) + 1);
  }
  for (let k = HULL_STEPS; k >= 0; k--) {
    const a = (L * k) / HULL_STEPS;
    out.push(a, envelope(r, L, dl, side, a, -1) - 1);
  }
  return out;
}

export function drawTail(
  f: Pixels,
  cx: number,
  cy: number,
  r: number,
  sun: number,
  tail: CometTail,
  seed: number
): void {
  const act = activityAt(tail.au);
  if (act <= 0) return;
  const L = tailLength(r, act),
    dl = L * DUST_SHARE,
    ax = -Math.cos(sun),
    ay = -Math.sin(sun),
    side = Math.cos(tail.motion) * -ay + Math.sin(tail.motion) * ax >= 0 ? -1 : 1,
    s1 = (seed % 997) + 21,
    s2 = (seed % 991) + 31,
    comaS = r * COMA_K,
    comaR2 = (COMA_REACH * r) ** 2,
    gaussStep = STEPS / CUT,
    ionNoise = 1 / Math.max(1.2, r * 0.18),
    ionRun = 1 / (r * 2.5),
    dustRun = 1 / (r * 5),
    D = f.d,
    W = f.w,
    H = f.h;
  const poly = hull(r, L, dl, side),
    n = poly.length / 2,
    px = new Float64Array(n),
    py = new Float64Array(n);
  let y0 = Infinity,
    y1 = -Infinity;
  for (let k = 0; k < n; k++) {
    const a = poly[k * 2]!,
      c = poly[k * 2 + 1]!;
    px[k] = cx + a * ax - c * ay;
    py[k] = cy + a * ay + c * ax;
    y0 = Math.min(y0, py[k]!);
    y1 = Math.max(y1, py[k]!);
  }
  const top = Math.max(0, Math.floor(y0)),
    bottom = Math.min(H - 1, Math.ceil(y1));
  for (let y = top; y <= bottom; y++) {
    const yc = y + 0.5;
    let xl = Infinity,
      xr = -Infinity;
    for (let k = 0; k < n; k++) {
      const k2 = (k + 1) % n,
        ya = py[k]!,
        yb = py[k2]!;
      if ((ya <= yc && yb >= yc) || (yb <= yc && ya >= yc)) {
        const x = ya === yb ? px[k]! : px[k]! + ((px[k2]! - px[k]!) * (yc - ya)) / (yb - ya);
        xl = Math.min(xl, x, ya === yb ? px[k2]! : x);
        xr = Math.max(xr, x, ya === yb ? px[k2]! : x);
      }
    }
    if (xl > xr) continue;
    const left = Math.max(0, Math.floor(xl)),
      right = Math.min(W - 1, Math.ceil(xr)),
      j = yc - cy;
    for (let x = left; x <= right; x++) {
      const i = x + 0.5 - cx,
        along = i * ax + j * ay,
        across = -i * ay + j * ax,
        d2 = i * i + j * j;
      let coma = 0,
        ion = 0,
        dust = 0,
        w = 1;
      if (d2 < comaR2) {
        const dist = Math.sqrt(d2);
        coma = act * Math.max(0, Math.min(1, (r * 0.9) / (dist + r * 0.25)) * Math.exp(-dist / comaS) - 0.06);
      }
      if (along > 0) {
        if (along < L) {
          const q = across / ionWidth(r, along),
            q2 = q * q;
          if (q2 < CUT) ion = look(GAUSS, q2 * gaussStep) * look(ION_FALL, (1 - along / L) * STEPS) * 0.95;
        }
        if (along < dl) {
          const td = along / dl;
          w = dustWidth(r, along);
          const q = (across - side * dustBend(dl, td)) / w,
            q2 = q * q;
          if (q2 < CUT) dust = look(GAUSS, q2 * gaussStep) * look(DUST_FALL, (1 - td) * STEPS) * DUST_K;
        }
      }
      if (coma * 215 + ion * 255 + dust * 240 < FLOOR) continue;
      if (ion * 255 > NEGLIGIBLE) ion *= 0.55 + 0.45 * noise3(across * ionNoise, along * ionRun, s1);
      else ion = 0;
      if (dust * 240 > NEGLIGIBLE) dust *= 0.8 + 0.2 * noise3(across / (w * 0.3) + 7, along * dustRun, s2);
      else dust = 0;
      const red = coma * 150 + ion * 110 + dust * 240,
        green = coma * 215 + ion * 165 + dust * 222,
        blue = coma * 200 + ion * 255 + dust * 180;
      const m0 = Math.max(red, green, blue);
      if (m0 < FLOOR) continue;
      const m = ((m0 - FLOOR) * (m0 - FLOOR)) / (m0 + 40),
        level = Math.min(LEVELS, Math.floor((m / 255) * LEVELS + ign(x, y)));
      if (level <= 0) continue;
      const g = ((level / LEVELS) * 255 * GAIN) / m0,
        p = (y * W + x) * 4;
      D[p] = D[p]! + red * g;
      D[p + 1] = D[p + 1]! + green * g;
      D[p + 2] = D[p + 2]! + blue * g;
      D[p + 3] = 255;
    }
  }
}
