import { allocCube, bakeFace, gradeFace, makeCube, type Channel } from '#lib/gfx/bodies/cube.ts';
import { bakeRadii, setMesh } from '#lib/gfx/bodies/rock/mesh.ts';
import { bakePaint } from '#lib/gfx/bodies/rock/paint.ts';
import type { Look, LookDef } from './types.ts';

const DEFAULT_TINT = [124, 122, 120] as const;
const DEFAULT_FACE = 192;
const LUMP_NORM = 0.6;
const ROUND: Channel = () => 1;

function surfaceOf(def: LookDef): Channel | undefined {
  const lumps = def.shapeFn,
    amp = def.lumpyAmp ?? 0;
  if (!lumps) return undefined;
  const shape = def.shape,
    macro: Channel =
      def.macro ?? (shape ? (x, y, z) => 1 / Math.hypot(x / shape[0], y / shape[1], z / shape[2]) : ROUND),
    norm = 1 / (1 + LUMP_NORM * amp);
  return (x, y, z) => macro(x, y, z) * (1 + (lumps(x, y, z) - 0.5) * 2 * amp) * norm;
}
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
    surface: surfaceOf(def),
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
  if (look.surface) yield* bakeRadii(look.surface, (mesh) => setMesh(look, mesh));
  const raw = look.bump ? new Float32Array(6 * c.face * c.face) : null;
  for (let f = 0; f < 6; f++) yield* bakeFace(c, f, look.channels, raw, look.rawOf);
  if (raw) for (let f = 0; f < 6; f++) yield* gradeFace(c, f, raw, look.gradAt, look.gradRange);
  if (look.surface) {
    yield* bakePaint(look, c);
    c.data = new Uint8Array(0);
  }
  look.ready = true;
}
