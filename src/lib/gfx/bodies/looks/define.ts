import { allocCube, bakeFace, gradeFace, makeCube } from '#lib/gfx/bodies/cube.ts';
import type { Look, LookDef } from './types.ts';

const DEFAULT_TINT = [124, 122, 120] as const;
const DEFAULT_FACE = 192;
const DEFAULT_SHAPE_FACE = 96;
const DEFAULT_GRAD_RANGE = 1.6;
const DEFAULT_RIM = 0.3;

export function defineLook(def: LookDef): Look {
  const n = def.channels.length,
    graded = !!def.bump,
    face = def.face ?? DEFAULT_FACE;
  return {
    id: def.id,
    channels: def.channels,
    shade: def.shade,
    tint: def.tint ?? DEFAULT_TINT,
    cube: makeCube(n + (graded ? 3 : 0), face),
    shapeCube: def.shapeFn ? makeCube(1, def.shapeFace ?? DEFAULT_SHAPE_FACE) : null,
    shapeFn: def.shapeFn,
    lumpyAmp: def.lumpyAmp ?? 0,
    shape: def.shape,
    bump: def.bump ?? 0,
    gradAt: n,
    gradRange: def.gradRange ?? DEFAULT_GRAD_RANGE,
    rawOf: def.rawOf,
    atmo: def.atmo,
    halo: def.halo,
    rimW: def.rimW ?? DEFAULT_RIM,
    rings: !!def.rings,
    facing: def.facing,
    tilt: def.tilt,
    pitch: def.pitch,
    ready: false
  };
}

export function* bakeSteps(look: Look): Generator<void> {
  if (look.ready) return;
  const c = look.cube;
  allocCube(c);
  if (look.shapeCube && look.shapeFn) {
    allocCube(look.shapeCube);
    for (let f = 0; f < 6; f++) yield* bakeFace(look.shapeCube, f, [look.shapeFn], null, undefined);
  }
  const raw = look.bump ? new Float32Array(6 * c.face * c.face) : null;
  for (let f = 0; f < 6; f++) yield* bakeFace(c, f, look.channels, raw, look.rawOf);
  if (raw) for (let f = 0; f < 6; f++) yield* gradeFace(c, f, raw, look.gradAt, look.gradRange);
  look.ready = true;
}
