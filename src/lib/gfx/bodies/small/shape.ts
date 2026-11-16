import { hash } from '#lib/gfx/math.ts';
import { fbm } from '#lib/gfx/noise.ts';

export type Vec3 = readonly [number, number, number];

export interface Lobe {
  readonly c: Vec3;
  readonly a: Vec3;
  readonly n?: number;
}

export interface Basin {
  readonly dir: Vec3;
  readonly rho: number;
  readonly depth: number;
  readonly peak: number;
}

export interface Spot {
  readonly dir: Vec3;
  readonly rho: number;
  readonly tone: number;
}

export interface ShapeSpec {
  readonly seed: number;
  readonly lobes: readonly Lobe[];
  readonly blend: number;
  readonly lumps: number;
  readonly lumpFreq: number;
  readonly ridge: number;
  readonly ridgeWidth: number;
  readonly craters: number;
  readonly craterDepth: number;
  readonly boulders: number;
  readonly basins: readonly Basin[];
  readonly spots: readonly Spot[];
}

export const shapeSpec = (
  seed: number,
  lobes: readonly Lobe[],
  rest: Partial<Omit<ShapeSpec, 'seed' | 'lobes'>> = {}
): ShapeSpec => ({
  seed,
  lobes,
  blend: 0.1,
  lumps: 0.04,
  lumpFreq: 2,
  ridge: 0,
  ridgeWidth: 0.12,
  craters: 1,
  craterDepth: 0.3,
  boulders: 0,
  basins: [],
  spots: [],
  ...rest
});

const FIBONACCI = 360;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

const smoothMax = (a: number, b: number, k: number): number => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.max(a, b) + h * h * k * 0.25;
};

function lobesRadius(spec: ShapeSpec, x: number, y: number, z: number): number {
  let r = 0;
  const k = spec.blend;
  for (const lobe of spec.lobes) {
    let t = 0;
    const [ax, ay, az] = lobe.a;
    if (lobe.n !== undefined) {
      const rho = Math.hypot(x, z),
        n = lobe.n;
      t = Math.pow(Math.pow(rho / ax, n) + Math.pow(Math.abs(y) / ay, n), -1 / n);
    } else {
      const [cx, cy, cz] = lobe.c,
        a2 = (x / ax) ** 2 + (y / ay) ** 2 + (z / az) ** 2,
        b = (x * cx) / (ax * ax) + (y * cy) / (ay * ay) + (z * cz) / (az * az),
        c2 = (cx / ax) ** 2 + (cy / ay) ** 2 + (cz / az) ** 2 - 1,
        disc = b * b - a2 * c2;
      if (disc >= 0) {
        const t1 = (b + Math.sqrt(disc)) / a2;
        if (t1 > 0) t = t1;
      }
    }
    r = r === 0 ? t : t === 0 ? r : smoothMax(r, t, k);
  }
  return Math.max(r, 0.05);
}

function rawRadius(spec: ShapeSpec, x: number, y: number, z: number): number {
  let r = lobesRadius(spec, x, y, z);
  if (spec.lumps) {
    const f = spec.lumpFreq,
      o = spec.seed * 7.31;
    r *= 1 + spec.lumps * (fbm(x * f + o, y * f + 3.7, z * f - o, 3) - 0.5) * 2.4;
  }
  if (spec.ridge) r *= 1 + spec.ridge * Math.exp(-((y / spec.ridgeWidth) ** 2));
  return r;
}

interface Measure {
  readonly scale: number;
  readonly reach: number;
}

const measures = new WeakMap<ShapeSpec, Measure>();

function measureOf(spec: ShapeSpec): Measure {
  let m = measures.get(spec);
  if (!m) {
    let sum = 0,
      top = 0;
    for (let i = 0; i < FIBONACCI; i++) {
      const y = 1 - (2 * (i + 0.5)) / FIBONACCI,
        s = Math.sqrt(1 - y * y),
        a = i * GOLDEN,
        r = rawRadius(spec, Math.cos(a) * s, y, Math.sin(a) * s);
      sum += r;
      if (r > top) top = r;
    }
    const mean = sum / FIBONACCI;
    m = { scale: 1 / mean, reach: top / mean };
    measures.set(spec, m);
  }
  return m;
}

export const shapeReach = (spec: ShapeSpec): number => measureOf(spec).reach;

export const shapeScale = (spec: ShapeSpec): number => measureOf(spec).scale;

export function boundRadius(spec: ShapeSpec, x: number, y: number, z: number): number {
  let r = 0;
  for (const lobe of spec.lobes) {
    const [ax, ay, az] = lobe.a,
      [cx, cy, cz] = lobe.c,
      a2 = (x / ax) ** 2 + (y / ay) ** 2 + (z / az) ** 2,
      b = (x * cx) / (ax * ax) + (y * cy) / (ay * ay) + (z * cz) / (az * az),
      c2 = (cx / ax) ** 2 + (cy / ay) ** 2 + (cz / az) ** 2 - 1,
      disc = b * b - a2 * c2;
    if (disc >= 0) {
      const t = (b + Math.sqrt(disc)) / a2;
      if (t > r) r = t;
    }
  }
  return r * measureOf(spec).scale;
}

export const macroRadius = (spec: ShapeSpec, x: number, y: number, z: number): number =>
  rawRadius(spec, x, y, z) * measureOf(spec).scale;

export interface Features {
  readonly big: Float64Array;
  readonly bigCount: number;
  readonly craters: Float64Array;
  readonly craterRho: Float64Array;
  readonly boulders: Float64Array;
  readonly boulderRho: Float64Array;
}

export const FEATURE = 10;
export const KIND_CRATER = 0;
export const KIND_HILL = 1;
export const KIND_SPOT = 2;

const RHO_FLOOR = 0.012;
const RHO_CEILING = 0.34;
const CRATER_MASTER = 260;
const PEAK_FROM = 0.12;
const RIM_SHARE = 0.38;

const unit = (dir: Vec3): Vec3 => {
  const l = Math.hypot(dir[0], dir[1], dir[2]);
  return [dir[0] / l, dir[1] / l, dir[2] / l];
};

function put(
  a: Float64Array,
  i: number,
  dir: Vec3,
  rho: number,
  depth: number,
  rim: number,
  peak: number,
  tone: number,
  kind: number
): void {
  const q = i * FEATURE;
  a[q] = dir[0];
  a[q + 1] = dir[1];
  a[q + 2] = dir[2];
  a[q + 3] = rho;
  a[q + 4] = depth;
  a[q + 5] = rim;
  a[q + 6] = peak;
  a[q + 7] = tone;
  a[q + 8] = kind;
  a[q + 9] = Math.cos(Math.min(Math.PI, rho * (kind === KIND_HILL ? 1.6 : 1.9)));
}

function onSphere(seed: number, i: number, salt: number): Vec3 {
  const z = hash(seed, i, salt) * 2 - 1,
    p = hash(seed, i, salt + 1) * Math.PI * 2,
    s = Math.sqrt(1 - z * z);
  return [Math.cos(p) * s, z, Math.sin(p) * s];
}

const featureCache = new WeakMap<ShapeSpec, Features>();

export function featuresOf(spec: ShapeSpec): Features {
  let f = featureCache.get(spec);
  if (f) return f;
  const big = new Float64Array((spec.basins.length + spec.spots.length) * FEATURE);
  let n = 0;
  for (const b of spec.basins) put(big, n++, unit(b.dir), b.rho, b.depth, RIM_SHARE, b.peak, 0, KIND_CRATER);
  for (const s of spec.spots) put(big, n++, unit(s.dir), s.rho, 0, 0, 0, s.tone, KIND_SPOT);
  const count = Math.round(CRATER_MASTER * spec.craters),
    list: { rho: number; i: number }[] = [];
  for (let i = 0; i < count; i++) {
    const u = Math.max(hash(spec.seed, i, 31), (RHO_FLOOR / RHO_CEILING) ** 2);
    list.push({ rho: RHO_FLOOR / Math.sqrt(u), i });
  }
  list.sort((p, q) => q.rho - p.rho);
  const craters = new Float64Array(list.length * FEATURE),
    craterRho = new Float64Array(list.length);
  list.forEach(({ rho, i }, k) => {
    const depth = rho * spec.craterDepth * (0.7 + 0.6 * hash(spec.seed, i, 35));
    put(
      craters,
      k,
      onSphere(spec.seed, i, 33),
      rho,
      depth,
      RIM_SHARE,
      rho > PEAK_FROM ? 0.3 : 0,
      0,
      KIND_CRATER
    );
    craterRho[k] = rho;
  });
  const hills: { rho: number; i: number }[] = [];
  for (let i = 0; i < spec.boulders; i++)
    hills.push({ rho: 0.016 + 0.05 * hash(spec.seed, i, 41) ** 2.4, i });
  hills.sort((p, q) => q.rho - p.rho);
  const boulders = new Float64Array(hills.length * FEATURE),
    boulderRho = new Float64Array(hills.length);
  hills.forEach(({ rho, i }, k) => {
    put(boulders, k, onSphere(spec.seed, i, 43), rho, rho * 0.55, 0, 0, 0, KIND_HILL);
    boulderRho[k] = rho;
  });
  f = { big, bigCount: n, craters, craterRho, boulders, boulderRho };
  featureCache.set(spec, f);
  return f;
}

export function countAtLeast(rho: Float64Array, min: number): number {
  let n = 0;
  while (n < rho.length && rho[n]! >= min) n++;
  return n;
}
