export type Channel = (x: number, y: number, z: number) => number;

export interface Cube {
  readonly channels: number;
  readonly face: number;
  readonly half: number;
  data: Uint8Array;
}

export const makeCube = (channels: number, face: number): Cube => ({
  channels,
  face,
  half: face / 2,
  data: new Uint8Array(0)
});

function faceDir(half: number, face: number, i: number, j: number): [number, number, number] {
  const u = (i + 0.5) / half - 1,
    v = (j + 0.5) / half - 1,
    a = face === 0 ? 1 : face === 1 ? -1 : u,
    b = face < 2 ? v : face === 2 ? 1 : face === 3 ? -1 : v,
    c = face < 2 ? u : face < 4 ? v : face === 4 ? 1 : -1,
    l = 1 / Math.sqrt(a * a + b * b + c * c);
  return [a * l, b * l, c * l];
}

export function allocCube(cube: Cube): void {
  if (cube.data.length === 0) cube.data = new Uint8Array(6 * cube.face * cube.face * cube.channels);
}

export function* bakeFace(
  cube: Cube,
  face: number,
  defs: readonly Channel[],
  raw: Float32Array | null,
  rawOf: (() => number) | undefined
): Generator<void> {
  const F = cube.face,
    C = cube.channels,
    D = cube.data,
    n = defs.length;
  for (let j = 0; j < F; j++) {
    if ((j & 3) === 3) yield;
    for (let i = 0; i < F; i++) {
      const [x, y, z] = faceDir(cube.half, face, i, j),
        q = ((face * F + j) * F + i) * C;
      for (let k = 0; k < n; k++) D[q + k] = Math.round(Math.min(1, Math.max(0, defs[k]!(x, y, z))) * 255);
      if (raw && rawOf) raw[(face * F + j) * F + i] = rawOf();
    }
  }
}

export function* gradeFace(
  cube: Cube,
  face: number,
  raw: Float32Array,
  gradCh: number,
  range: number
): Generator<void> {
  const F = cube.face,
    C = cube.channels,
    D = cube.data,
    base = face * F * F,
    enc = (g: number) => Math.round(Math.min(1, Math.max(0, 0.5 + g / (2 * range))) * 255);
  for (let j = 0; j < F; j++) {
    if ((j & 15) === 15) yield;
    for (let i = 0; i < F; i++) {
      const il = i > 0 ? i - 1 : i,
        ir = i < F - 1 ? i + 1 : i,
        jl = j > 0 ? j - 1 : j,
        jr = j < F - 1 ? j + 1 : j,
        p0 = faceDir(cube.half, face, il, j),
        p1 = faceDir(cube.half, face, ir, j),
        q0 = faceDir(cube.half, face, i, jl),
        q1 = faceDir(cube.half, face, i, jr),
        ax = p1[0] - p0[0],
        ay = p1[1] - p0[1],
        az = p1[2] - p0[2],
        bx = q1[0] - q0[0],
        by = q1[1] - q0[1],
        bz = q1[2] - q0[2],
        dhi = raw[base + j * F + ir]! - raw[base + j * F + il]!,
        dhj = raw[base + jr * F + i]! - raw[base + jl * F + i]!,
        aa = ax * ax + ay * ay + az * az,
        ab = ax * bx + ay * by + az * bz,
        bb = bx * bx + by * by + bz * bz,
        det = aa * bb - ab * ab || 1e-12,
        al = (dhi * bb - dhj * ab) / det,
        be = (dhj * aa - dhi * ab) / det,
        q = (base + j * F + i) * C + gradCh;
      D[q] = enc(al * ax + be * bx);
      D[q + 1] = enc(al * ay + be * by);
      D[q + 2] = enc(al * az + be * bz);
    }
  }
}

export function sampleChannel(cube: Cube, x: number, y: number, z: number, k: number): number {
  const ax = Math.abs(x),
    ay = Math.abs(y),
    az = Math.abs(z);
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
  const F = cube.face,
    TOP = F - 1,
    s = cube.half / m;
  let fu = u * s + cube.half - 0.5,
    fv = v * s + cube.half - 0.5;
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
    base = face * F * F,
    a = D[(base + j0 * F + i0) * C + k]!,
    b = D[(base + j0 * F + i1) * C + k]!,
    c = D[(base + j1 * F + i0) * C + k]!,
    d = D[(base + j1 * F + i1) * C + k]!;
  return (a * (1 - du) * (1 - dv) + b * du * (1 - dv) + c * (1 - du) * dv + d * du * dv) / 255;
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
  const F = cube.face,
    TOP = F - 1,
    s = cube.half / m;
  let fu = u * s + cube.half - 0.5,
    fv = v * s + cube.half - 0.5;
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
    base = face * F * F,
    a = (base + j0 * F + i0) * C,
    b = (base + j0 * F + i1) * C,
    c = (base + j1 * F + i0) * C,
    d = (base + j1 * F + i1) * C,
    UNIT = 1 / 255,
    w11 = du * dv * UNIT,
    w10 = du * UNIT - w11,
    w01 = dv * UNIT - w11,
    w00 = UNIT - w10 - w01 - w11;
  for (let k = 0; k < C; k++) out[k] = D[a + k]! * w00 + D[b + k]! * w10 + D[c + k]! * w01 + D[d + k]! * w11;
}
