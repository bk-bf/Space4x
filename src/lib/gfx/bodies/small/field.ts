import {
  boundRadius,
  countAtLeast,
  FEATURE,
  featuresOf,
  KIND_CRATER,
  KIND_HILL,
  macroRadius,
  shapeScale,
  type ShapeSpec
} from './shape.ts';

export interface Field {
  readonly size: number;
  readonly data: Float32Array;
  readonly rmin: number;
  readonly rmax: number;
  readonly slope: number;
  readonly bounds: Float64Array;
}

const CHANNELS = 2;
const MIN_FEATURE_TEXELS = 3.2;
const CRATER_PX = 2.2;
const BOULDER_PX = 1.3;
const MAX_SLOPE = 1;
const HULL_MARGIN = 1.03;

let dr = 0;
let tone = 0;

function accumulate(
  a: Float64Array,
  list: Int32Array,
  from: number,
  to: number,
  x: number,
  y: number,
  z: number
): void {
  for (let n = from; n < to; n++) {
    const q = list[n]! * FEATURE,
      dot = a[q]! * x + a[q + 1]! * y + a[q + 2]! * z;
    if (dot < a[q + 9]!) continue;
    const rho = a[q + 3]!,
      u = Math.acos(dot > 1 ? 1 : dot) / rho,
      kind = a[q + 8]!;
    if (kind === KIND_HILL) {
      const g = Math.exp(-2.2 * u * u);
      dr += a[q + 4]! * g;
      tone += 0.12 * g;
    } else if (kind === KIND_CRATER) {
      const depth = a[q + 4]!,
        rim = Math.exp(-(((u - 1) / 0.24) ** 2));
      if (u < 1) {
        const bowl = 1 - u * u;
        dr -= depth * bowl;
        dr += depth * a[q + 6]! * Math.exp(-((u / 0.2) ** 2));
        tone -= 0.3 * bowl;
      }
      dr += depth * a[q + 5]! * rim;
      tone += 0.22 * rim;
    } else tone += a[q + 7]! * Math.exp(-2 * u * u);
  }
}

export interface FieldClass {
  readonly size: number;
  readonly ref: number;
}

const CLASSES: readonly FieldClass[] = [
  { size: 32, ref: 8 },
  { size: 64, ref: 20 },
  { size: 128, ref: 44 },
  { size: 192, ref: 100 }
];

export const fieldClass = (radiusPx: number): FieldClass =>
  CLASSES[radiusPx <= 12 ? 0 : radiusPx <= 28 ? 1 : radiusPx <= 60 ? 2 : 3]!;

function direction(face: number, u: number, v: number, out: Float64Array): void {
  const a = face === 0 ? 1 : face === 1 ? -1 : u,
    b = face < 2 ? v : face === 2 ? 1 : face === 3 ? -1 : v,
    c = face < 2 ? u : face < 4 ? v : face === 4 ? 1 : -1,
    l = 1 / Math.sqrt(a * a + b * b + c * c);
  out[0] = a * l;
  out[1] = b * l;
  out[2] = c * l;
}

const CELLS = 8;
const CELL_COUNT = 6 * CELLS * CELLS;

interface Buckets {
  readonly start: Int32Array;
  readonly list: Int32Array;
}

function bucketsOf(all: Float64Array, count: number, size: number): Buckets {
  const cx = new Float64Array(CELL_COUNT),
    cy = new Float64Array(CELL_COUNT),
    cz = new Float64Array(CELL_COUNT),
    cr = new Float64Array(CELL_COUNT),
    d = new Float64Array(3),
    pad = 2 / size;
  for (let f = 0; f < 6; f++)
    for (let j = 0; j < CELLS; j++)
      for (let i = 0; i < CELLS; i++) {
        const c = f * CELLS * CELLS + j * CELLS + i,
          u0 = (i / CELLS) * 2 - 1 - pad,
          u1 = ((i + 1) / CELLS) * 2 - 1 + pad,
          v0 = (j / CELLS) * 2 - 1 - pad,
          v1 = ((j + 1) / CELLS) * 2 - 1 + pad;
        direction(f, (u0 + u1) / 2, (v0 + v1) / 2, d);
        cx[c] = d[0]!;
        cy[c] = d[1]!;
        cz[c] = d[2]!;
        let widest = 1;
        for (const [u, v] of [
          [u0, v0],
          [u1, v0],
          [u0, v1],
          [u1, v1]
        ] as const) {
          direction(f, u, v, d);
          widest = Math.min(widest, d[0]! * cx[c]! + d[1]! * cy[c]! + d[2]! * cz[c]!);
        }
        cr[c] = Math.acos(Math.max(-1, widest));
      }
  const lists: number[][] = Array.from({ length: CELL_COUNT }, () => []);
  for (let k = 0; k < count; k++) {
    const q = k * FEATURE,
      reach = Math.acos(Math.max(-1, Math.min(1, all[q + 9]!)));
    for (let c = 0; c < CELL_COUNT; c++) {
      const dot = all[q]! * cx[c]! + all[q + 1]! * cy[c]! + all[q + 2]! * cz[c]!;
      if (Math.acos(Math.max(-1, Math.min(1, dot))) <= reach + cr[c]!) lists[c]!.push(k);
    }
  }
  const start = new Int32Array(CELL_COUNT + 1),
    flat: number[] = [];
  for (let c = 0; c < CELL_COUNT; c++) {
    start[c] = flat.length;
    for (const k of lists[c]!) flat.push(k);
  }
  start[CELL_COUNT] = flat.length;
  return { start, list: Int32Array.from(flat) };
}

export function bakeField(spec: ShapeSpec, cls: FieldClass): Field {
  const size = cls.size;
  const stride = size + 2,
    face = stride * stride,
    data = new Float32Array(6 * face * CHANNELS),
    features = featuresOf(spec),
    minRho = Math.max(MIN_FEATURE_TEXELS / size, CRATER_PX / cls.ref),
    craters = countAtLeast(features.craterRho, minRho),
    boulders = countAtLeast(features.boulderRho, Math.max(MIN_FEATURE_TEXELS / size, BOULDER_PX / cls.ref)),
    d = new Float64Array(3),
    step = 2 / size,
    nBig = features.bigCount,
    all = new Float64Array((nBig + craters + boulders) * FEATURE);
  all.set(features.big.subarray(0, nBig * FEATURE), 0);
  all.set(features.craters.subarray(0, craters * FEATURE), nBig * FEATURE);
  all.set(features.boulders.subarray(0, boulders * FEATURE), (nBig + craters) * FEATURE);
  const buckets = bucketsOf(all, nBig + craters + boulders, size);
  let rmin = Infinity,
    rmax = 0,
    inflate = 1;
  for (let f = 0; f < 6; f++)
    for (let j = 0; j < stride; j++)
      for (let i = 0; i < stride; i++) {
        direction(f, (i - 0.5) * step - 1, (j - 0.5) * step - 1, d);
        const x = d[0]!,
          y = d[1]!,
          z = d[2]!;
        const ci = Math.min(CELLS - 1, Math.max(0, Math.floor(((i - 0.5) / size) * CELLS))),
          cj = Math.min(CELLS - 1, Math.max(0, Math.floor(((j - 0.5) / size) * CELLS))),
          cell = f * CELLS * CELLS + cj * CELLS + ci;
        dr = 0;
        tone = 0;
        accumulate(all, buckets.list, buckets.start[cell]!, buckets.start[cell + 1]!, x, y, z);
        const r = Math.max(0.12, macroRadius(spec, x, y, z) + dr),
          q = (f * face + j * stride + i) * CHANNELS;
        data[q] = r;
        data[q + 1] = tone;
        const hull = boundRadius(spec, x, y, z);
        if (hull > 0 && r / hull > inflate) inflate = r / hull;
        if (r < rmin) rmin = r;
        if (r > rmax) rmax = r;
      }
  let slope = 0;
  for (let f = 0; f < 6; f++)
    for (let j = 1; j <= size; j++)
      for (let i = 1; i <= size; i++) {
        const u = (i - 0.5) * step - 1,
          v = (j - 0.5) * step - 1,
          w = 1 + u * u + v * v,
          q = (f * face + j * stride + i) * CHANNELS,
          r = data[q]!,
          au = (step * Math.sqrt(1 + v * v)) / w,
          av = (step * Math.sqrt(1 + u * u)) / w,
          su = Math.abs(data[q + CHANNELS]! - r) / (r * au),
          sv = Math.abs(data[q + stride * CHANNELS]! - r) / (r * av);
        if (su > slope) slope = su;
        if (sv > slope) slope = sv;
      }
  const k = inflate * HULL_MARGIN,
    scale = shapeScale(spec),
    bounds = new Float64Array(spec.lobes.length * 6);
  spec.lobes.forEach((lobe, n) => {
    for (let a = 0; a < 3; a++) {
      bounds[n * 6 + a] = lobe.c[a]! * scale * k;
      bounds[n * 6 + 3 + a] = lobe.a[a]! * scale * k;
    }
  });
  return { size, data, rmin, rmax, slope: Math.min(slope, MAX_SLOPE), bounds };
}

export function sampleRadius(field: Field, x: number, y: number, z: number): number {
  const ax = x < 0 ? -x : x,
    ay = y < 0 ? -y : y,
    az = z < 0 ? -z : z,
    n = field.size,
    stride = n + 2;
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
  const s = n / (2 * m),
    fu = u * s + n / 2 + 0.5,
    fv = v * s + n / 2 + 0.5,
    i0 = fu | 0,
    j0 = fv | 0,
    du = fu - i0,
    dv = fv - j0,
    q = (face * stride * stride + j0 * stride + i0) * CHANNELS,
    D = field.data,
    a = D[q]!,
    b = D[q + CHANNELS]!,
    c = D[q + stride * CHANNELS]!,
    e = D[q + (stride + 1) * CHANNELS]!;
  return a + (b - a) * du + (c - a) * dv + (a - b - c + e) * du * dv;
}

export function sampleTone(field: Field, x: number, y: number, z: number): number {
  const ax = x < 0 ? -x : x,
    ay = y < 0 ? -y : y,
    az = z < 0 ? -z : z,
    n = field.size,
    stride = n + 2;
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
  const s = n / (2 * m),
    fu = u * s + n / 2 + 0.5,
    fv = v * s + n / 2 + 0.5,
    i0 = fu | 0,
    j0 = fv | 0,
    du = fu - i0,
    dv = fv - j0,
    q = (face * stride * stride + j0 * stride + i0) * CHANNELS + 1,
    D = field.data,
    a = D[q]!,
    b = D[q + CHANNELS]!,
    c = D[q + stride * CHANNELS]!,
    e = D[q + (stride + 1) * CHANNELS]!;
  return a + (b - a) * du + (c - a) * dv + (a - b - c + e) * du * dv;
}
