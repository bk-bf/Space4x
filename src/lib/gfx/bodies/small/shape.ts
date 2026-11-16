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
  ...rest
});

const FIBONACCI = 360;
const EQUATOR_SOFT = 0.004;
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
      t = Math.pow(Math.pow(rho / ax, n) + Math.pow(Math.sqrt(y * y + EQUATOR_SOFT) / ay, n), -1 / n);
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

export const macroRadius = (spec: ShapeSpec, x: number, y: number, z: number): number =>
  rawRadius(spec, x, y, z) * measureOf(spec).scale;

const unit = (dir: Vec3): Vec3 => {
  const l = Math.hypot(dir[0], dir[1], dir[2]);
  return [dir[0] / l, dir[1] / l, dir[2] / l];
};

const RIM = 0.38;
const RIM_WIDTH = 0.24;
const PEAK_WIDTH = 0.2;

export function basinRelief(spec: ShapeSpec, x: number, y: number, z: number): number {
  let dr = 0;
  for (const b of spec.basins) {
    const [dx, dy, dz] = unit(b.dir),
      dot = dx * x + dy * y + dz * z,
      u = Math.acos(dot > 1 ? 1 : dot < -1 ? -1 : dot) / b.rho;
    if (u > 2) continue;
    if (u < 1) dr -= b.depth * (1 - u * u) - b.depth * b.peak * Math.exp(-((u / PEAK_WIDTH) ** 2));
    dr += b.depth * RIM * Math.exp(-(((u - 1) / RIM_WIDTH) ** 2));
  }
  return dr;
}
