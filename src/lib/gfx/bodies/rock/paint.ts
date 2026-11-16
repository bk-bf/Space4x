import { faceDir, type Cube } from '#lib/gfx/bodies/cube.ts';
import { ADD, LAND, SEA, type Colour, type Look, type Texels } from '#lib/gfx/bodies/looks/types.ts';

export const PAINT_CHANNELS = 6;
const PAINT_RADIUS = 100;
const PAINT_DITHER = 0.5;

export interface Paint {
  readonly face: number;
  readonly half: number;
  readonly data: Uint8ClampedArray;
}

const paints = new WeakMap<object, Paint>();

export const paintOf = (owner: object): Paint | undefined => paints.get(owner);

export function dropPaint(owner: object): void {
  paints.delete(owner);
}

export function* bakePaint(look: Look, cube: Cube): Generator<void> {
  const F = cube.face,
    C = cube.channels,
    src = cube.data,
    data = new Uint8ClampedArray(6 * F * F * PAINT_CHANNELS),
    Gf = new Float64Array(C),
    Of = new Float64Array(8),
    G = Gf as unknown as Texels,
    O = Of as unknown as Colour,
    gi = look.gradAt,
    graded = !!look.bump;
  for (let face = 0; face < 6; face++)
    for (let j = 0; j < F; j++) {
      if ((j & 7) === 7) yield;
      for (let i = 0; i < F; i++) {
        const t = (face * F + j) * F + i,
          q = t * C,
          o = t * PAINT_CHANNELS,
          [x, y, z] = faceDir(cube.half, face, i, j);
        for (let k = 0; k < C; k++) Gf[k] = src[q + k]! / 255;
        Of[ADD] = 0;
        Of[LAND] = 0;
        Of[SEA] = 0;
        look.shade(x, y, z, PAINT_RADIUS, PAINT_DITHER, G, O);
        data[o] = Of[0]!;
        data[o + 1] = Of[1]!;
        data[o + 2] = Of[2]!;
        data[o + 3] = graded ? src[q + gi]! : 128;
        data[o + 4] = graded ? src[q + gi + 1]! : 128;
        data[o + 5] = graded ? src[q + gi + 2]! : 128;
      }
    }
  paints.set(look, { face: F, half: F / 2, data });
}
