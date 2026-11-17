import { clamp, hash, mix } from '#lib/gfx/math.ts';
import type { RGB } from '#lib/gfx/palette.ts';
import { dith } from '#lib/gfx/noise.ts';
import { sampleCube } from './cube.ts';
import { SHADES, type Light, type Pixels } from './light.ts';
import type { Mat } from './looks/math.ts';
import { ADD, LAND, SEA, type Colour, type Look, type Texels } from './looks/types.ts';

const CITY: RGB = [255, 214, 120];
const GLINT_FROM = 0.975;
const GLINT_COVER = 0.7;
const DARK: RGB = [3, 4, 12];
const RELIEF_FROM = 14;
const RELIEF_K = 0.22;
const BUMP_FROM = 8;
const RING_SHADOW = 0.5;
const RIM_MIX = 0.55;
const GAIN = 0.88;

const Gf = new Float64Array(24);
const Of = new Float64Array(8);
const G = Gf as unknown as Texels;
const O = Of as unknown as Colour;

const STEPS = 2;
const TOP = 3 * STEPS;
const LEVELS = Float64Array.from({ length: TOP + 1 }, (_, i) => {
  const s = Math.min(2, Math.floor(i / STEPS));
  return SHADES[s]! + (SHADES[s + 1]! - SHADES[s]!) * (i / STEPS - s);
});

export interface Span {
  n: number;
  px: Float64Array;
  py: Float64Array;
  pz: Float64Array;
  light: Float64Array;
  nz: Float64Array;
  x: Int32Array;
  shadow: Uint8Array;
}

export const span: Span = {
  n: 0,
  px: new Float64Array(0),
  py: new Float64Array(0),
  pz: new Float64Array(0),
  light: new Float64Array(0),
  nz: new Float64Array(0),
  x: new Int32Array(0),
  shadow: new Uint8Array(0)
};

export function spanRoom(n: number): Span {
  if (span.px.length < n) {
    span.px = new Float64Array(n);
    span.py = new Float64Array(n);
    span.pz = new Float64Array(n);
    span.light = new Float64Array(n);
    span.nz = new Float64Array(n);
    span.x = new Int32Array(n);
    span.shadow = new Uint8Array(n);
  }
  span.n = 0;
  return span;
}

export interface SpanStyle {
  lights: boolean;
  cityNoise: boolean;
  rimW: number;
  rim: number;
  rimC: RGB | undefined;
  rings: boolean;
}

export const PLAIN: SpanStyle = {
  lights: false,
  cityNoise: false,
  rimW: 1,
  rim: 0,
  rimC: undefined,
  rings: false
};

export function shadeSpan(
  f: Pixels,
  y: number,
  look: Look,
  P: Mat,
  R: number,
  style: SpanStyle,
  light: Light
): void {
  const n = span.n,
    PX = span.px,
    PY = span.py,
    PZ = span.pz,
    LT = span.light,
    NZ = span.nz,
    XS = span.x,
    D = f.d,
    row = y * f.w,
    SH = span.shadow,
    cube = look.cube,
    shade = look.shade,
    bumpK = look.bump && R > BUMP_FROM ? look.bump : 0,
    relief = !bumpK && R > RELIEF_FROM,
    gi = look.gradAt,
    gr = look.gradRange * 2,
    L0 = light[0],
    L1 = light[1],
    L2 = light[2],
    bx = (P[0] * L0 + P[1] * L1 + P[2] * L2) * bumpK * gr,
    by = (P[3] * L0 + P[4] * L1 + P[5] * L2) * bumpK * gr,
    bz = (P[6] * L0 + P[7] * L1 + P[8] * L2) * bumpK * gr,
    { lights, cityNoise, rimW, rim, rimC, rings } = style;
  for (let i = 0; i < n; i++) {
    const px = PX[i]!,
      py = PY[i]!,
      pz = PZ[i]!,
      x = XS[i]!,
      dv = dith(x, y),
      nz = NZ[i]!;
    sampleCube(cube, px, py, pz, Gf);
    Of[ADD] = 0;
    Of[LAND] = 0;
    Of[SEA] = 0;
    shade(px, py, pz, R, dv, G, O);
    let L = LT[i]!;
    if (bumpK) L -= (Gf[gi]! - 0.5) * bx + (Gf[gi + 1]! - 0.5) * by + (Gf[gi + 2]! - 0.5) * bz;
    else if (relief) L += Of[ADD]! * RELIEF_K * nz;
    if (rings && SH[i] && L > 0) L -= RING_SHADOW;
    const level = clamp(Math.floor((L * GAIN + 0.12) * TOP + dv), 0, TOP),
      k = LEVELS[level]!,
      q = (row + x) * 4;
    let r = Of[0]! * k,
      g = Of[1]! * k,
      b = Of[2]! * k;
    if (level < STEPS) {
      r += DARK[0];
      g += DARK[1];
      b += DARK[2];
      if (
        lights &&
        Of[LAND] &&
        (cityNoise
          ? Gf[5]! > 0.55 && hash(px * 900, py * 900, pz * 900) > 0.62
          : hash(px * 34, py * 34, pz * 34) > 0.94)
      ) {
        r = CITY[0];
        g = CITY[1];
        b = CITY[2];
      }
    } else if (Of[SEA] && dv < ((L - GLINT_FROM) / (1 - GLINT_FROM)) * GLINT_COVER) {
      r = mix(r, 255, 0.5);
      g = mix(g, 255, 0.5);
      b = mix(b, 255, 0.5);
    }
    if (rimC && dv < clamp((rimW - nz) / rimW, 0, 1) * clamp(L * 2 + 0.8, 0, 1) * rim) {
      r = mix(r, rimC[0], RIM_MIX);
      g = mix(g, rimC[1], RIM_MIX);
      b = mix(b, rimC[2], RIM_MIX);
    }
    D[q] = r;
    D[q + 1] = g;
    D[q + 2] = b;
    D[q + 3] = 255;
  }
  span.n = 0;
}
