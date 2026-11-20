import { bodyTypeOf, building, environmentOf, material } from '#lib/game/data/index.ts';
import type { Biosphere, Environment, NichePoint } from '#lib/game/data/index.ts';

export const G0 = 9.80665;
export const ATM = 101_325;
export const KELVIN = 273.15;

export const OXYGEN = { low: 0.1, high: 0.3, share: 0.3, cc: 2 } as const;
export const DANGEROUS: Readonly<Record<string, { ppm: number; cc: number }>> = {
  ammonia: { ppm: 50, cc: 2 },
  methane: { ppm: 500, cc: 2 },
  hydrogen: { ppm: 500, cc: 2 },
  carbon_dioxide: { ppm: 5000, cc: 2 }
};
export const PRESSURE = { high: 4, steep: 8, cc: 2 } as const;
export const WATER_COVER = 0.2;
export const TEMPERATURE = { low: -10, high: 38, per: 24 } as const;
export const GRAVITY = { low: 0.1, high: 1.9, cc: 1 } as const;

export const BIOSPHERE = 'biosphere';

export type FactorKind = 'oxygen' | 'gas' | 'pressure' | 'water' | 'temperature' | 'gravity';

export interface Factor {
  kind: FactorKind;
  cc: number;
  gas?: string;
}

export interface Suitability {
  world: string;
  habitable: boolean;
  cc: number;
  s: number;
  factors: Factor[];
  gravity: number;
  pressure: number;
  temperature: number;
  water: number;
  lowGravity: boolean;
}

const GIANTS = new Set(['gas-giant', 'ice-giant']);

export function nicheShare(niche: readonly NichePoint[], warming: number): number {
  const first = niche[0]!;
  if (warming <= first.warming) return first.share;
  for (let i = 1; i < niche.length; i++) {
    const a = niche[i - 1]!;
    const b = niche[i]!;
    if (warming <= b.warming)
      return a.share + ((b.share - a.share) * (warming - a.warming)) / (b.warming - a.warming);
  }
  return niche.at(-1)!.share;
}

const moles = (env: Environment): Record<string, number> =>
  Object.fromEntries(
    Object.entries(env.atmosphere).map(([m, kg]) => [m, kg / ((material(m).molarMass ?? 0) / 1000)])
  );

export const pressureOf = (env: Environment): number =>
  (Object.values(env.atmosphere).reduce((a, kg) => a + kg, 0) * env.gravity) /
  (4 * Math.PI * env.radius ** 2) /
  ATM;

function temperatureFactor(env: Environment, celsius: number, warming: number | undefined): number {
  if (env.niche) return 1 / nicheShare(env.niche, warming ?? env.warming ?? 0) - 1;
  if (celsius < TEMPERATURE.low) return (TEMPERATURE.low - celsius) / TEMPERATURE.per;
  if (celsius > TEMPERATURE.high) return (celsius - TEMPERATURE.high) / TEMPERATURE.per;
  return 0;
}

export function suitabilityOf(env: Environment, warming?: number): Suitability {
  const g = env.gravity / G0;
  const pressure = pressureOf(env);
  const celsius = env.temperature - KELVIN;
  const base = { world: env.world, gravity: g, pressure, temperature: celsius, water: env.water };
  const giant = GIANTS.has(bodyTypeOf(env.world) ?? '');
  if (giant || g > GRAVITY.high)
    return { ...base, habitable: false, cc: Infinity, s: 0, factors: [], lowGravity: false };
  const n = moles(env);
  const total = Object.values(n).reduce((a, v) => a + v, 0);
  const share = (m: string) => (total > 0 ? (n[m] ?? 0) / total : 0);
  const factors: Factor[] = [];
  const o2 = share('oxygen');
  const partial = o2 * pressure;
  if (partial < OXYGEN.low || partial > OXYGEN.high || o2 > OXYGEN.share)
    factors.push({ kind: 'oxygen', cc: OXYGEN.cc });
  for (const [gas, limit] of Object.entries(DANGEROUS))
    if (share(gas) * 1e6 > limit.ppm) factors.push({ kind: 'gas', gas, cc: limit.cc });
  if (pressure > PRESSURE.steep)
    factors.push({ kind: 'pressure', cc: (PRESSURE.cc * pressure) / PRESSURE.steep });
  else if (pressure > PRESSURE.high) factors.push({ kind: 'pressure', cc: PRESSURE.cc });
  if (env.water < WATER_COVER) factors.push({ kind: 'water', cc: ((WATER_COVER - env.water) * 100) / 10 });
  const heat = temperatureFactor(env, celsius, warming);
  if (heat > 0) factors.push({ kind: 'temperature', cc: heat });
  const lowGravity = g < GRAVITY.low;
  if (lowGravity) factors.push({ kind: 'gravity', cc: GRAVITY.cc });
  const cc = factors.reduce((a, f) => Math.max(a, f.cc), 0);
  return { ...base, habitable: true, cc, s: 1 / (1 + cc), factors, lowGravity };
}

export function suitability(world: string, warming?: number): Suitability | undefined {
  const env = environmentOf(world);
  return env ? suitabilityOf(env, warming) : undefined;
}

export const biosphereFigures = (): Biosphere => building(BIOSPHERE).biosphere!;

const people = new Map<string, number>();

export function biospherePeople(world: string): number {
  const hit = people.get(world);
  if (hit !== undefined) return hit;
  const s = suitability(world);
  const n = s?.habitable ? Math.floor(biosphereFigures().people * s.s * (s.lowGravity ? 0.5 : 1)) : 0;
  people.set(world, n);
  return n;
}

export function growthScale(world: string, warming?: number): number {
  const env = environmentOf(world);
  if (!env?.niche) return 1;
  const now = suitabilityOf(env, warming).s;
  const start = suitabilityOf(env).s;
  return start > 0 ? now / start : 1;
}
