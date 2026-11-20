import { building } from '#lib/game/data/index.ts';
import type { Plant } from '#lib/game/data/index.ts';
import type { Group, Site } from './types.ts';

export const PEAK_RATIO = 1.4;

export interface Grid {
  average: number;
  firm: number;
  capacity: number;
  storage: number;
  bySource: Record<string, number>;
  demand: number;
  peak: number;
  supply: number;
  firmShort: boolean;
}

export const plantOf = (buildingId: string): Plant | undefined => building(buildingId).plant;

export const isPlant = (buildingId: string): boolean => plantOf(buildingId) !== undefined;

export const activePlants = (g: Group): number => (g.on ? Math.min(g.count, g.active ?? g.count) : 0);

export const averageOutput = (p: Plant, n: number): number => n * p.capacityKw * (p.capacityFactor ?? 0);

export const plantWater = (p: Plant, n: number): number => averageOutput(p, n) * p.waterPerMwh;

export function gridOf(site: Site, demand: number): Grid {
  let average = 0;
  let firm = 0;
  let capacity = 0;
  let storage = 0;
  const bySource: Record<string, number> = {};
  for (const g of site.groups) {
    const p = plantOf(g.building);
    if (!p) continue;
    const n = activePlants(g);
    const made = averageOutput(p, n);
    bySource[g.building] = (bySource[g.building] ?? 0) + made;
    average += made;
    firm += n * p.capacityKw * p.firmShare;
    capacity += n * p.capacityKw;
    storage += n * (p.storageKwh ?? 0);
  }
  const peak = PEAK_RATIO * demand;
  const planted = site.groups.some((g) => isPlant(g.building));
  return {
    average,
    firm,
    capacity,
    storage,
    bySource,
    demand,
    peak,
    supply: Math.min(average, firm / PEAK_RATIO),
    firmShort: planted && firm < peak * (1 - 1e-9)
  };
}
