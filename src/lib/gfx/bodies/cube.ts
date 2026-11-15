export const FACE = 256;
const HALF = FACE / 2;
const TEXELS = FACE * FACE;
const TOP = FACE - 1;
const UNIT = 1 / 255;

export type Channel = (x: number, y: number, z: number) => number;

export interface Cube {
  readonly channels: number;
  readonly data: Uint8Array;
  readonly baked: boolean[];
}

export const makeCube = (channels: number): Cube => ({
  channels,
  data: new Uint8Array(6 * TEXELS * channels),
  baked: [false, false, false, false, false, false]
});

export function bakeFace(cube: Cube, face: number, defs: readonly Channel[]): void {
  const C = cube.channels,
    D = cube.data;
  for (let j = 0; j < FACE; j++)
    for (let i = 0; i < FACE; i++) {
      const u = (i + 0.5) / HALF - 1,
        v = (j + 0.5) / HALF - 1,
        a = face === 0 ? 1 : face === 1 ? -1 : u,
        b = face < 2 ? v : face === 2 ? 1 : face === 3 ? -1 : v,
        c = face < 2 ? u : face < 4 ? v : face === 4 ? 1 : -1,
        l = 1 / Math.sqrt(a * a + b * b + c * c),
        x = a * l,
        y = b * l,
        z = c * l,
        q = (face * TEXELS + j * FACE + i) * C;
      for (let k = 0; k < C; k++) D[q + k] = Math.round(Math.min(1, Math.max(0, defs[k]!(x, y, z))) * 255);
    }
  cube.baked[face] = true;
}

export function sampleCube(cube: Cube, x: number, y: number, z: number, out: Float64Array): void {
  const ax = x < 0 ? -x : x,
    ay = y < 0 ? -y : y,
    az = z < 0 ? -z : z;
  let face: number, u: number, v: number, m: number;
  if (ax >= ay && ax >= az) {
    face = x > 0 ? 0 : 1;
    m = ax;
    u = z;
    v = y;
  } else if (ay >= az) {
    face = y > 0 ? 2 : 3;
    m = ay;
    u = x;
    v = z;
  } else {
    face = z > 0 ? 4 : 5;
    m = az;
    u = x;
    v = y;
  }
  const s = HALF / m;
  let fu = u * s + HALF - 0.5,
    fv = v * s + HALF - 0.5;
  fu = fu < 0 ? 0 : fu > TOP ? TOP : fu;
  fv = fv < 0 ? 0 : fv > TOP ? TOP : fv;
  const i0 = fu | 0,
    j0 = fv | 0,
    du = fu - i0,
    dv = fv - j0,
    i1 = i0 < TOP ? i0 + 1 : i0,
    j1 = j0 < TOP ? j0 + 1 : j0,
    C = cube.channels,
    D = cube.data,
    base = face * TEXELS,
    a = (base + j0 * FACE + i0) * C,
    b = (base + j0 * FACE + i1) * C,
    c = (base + j1 * FACE + i0) * C,
    d = (base + j1 * FACE + i1) * C,
    w11 = du * dv * UNIT,
    w10 = du * UNIT - w11,
    w01 = dv * UNIT - w11,
    w00 = UNIT - w10 - w01 - w11;
  for (let k = 0; k < C; k++) out[k] = D[a + k]! * w00 + D[b + k]! * w10 + D[c + k]! * w01 + D[d + k]! * w11;
}
