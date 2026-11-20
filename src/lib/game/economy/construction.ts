import { building } from '#lib/game/data/index.ts';
import type { Amounts, Site as Where } from '#lib/game/data/index.ts';
import { isMass } from './processes.ts';

export const BUILD_SLOTS = 3;
export const BUILD_BASE_DAYS = 10;
export const BUILD_DAYS_PER_TONNE = 2;

const costs = new Map<string, Amounts>();

export function buildCost(id: string, where?: Where): Amounts {
  const b = building(id);
  const shield = where ? b.biosphere?.shieldMaterial[where] : undefined;
  if (!shield) return b.cost;
  const key = `${id}|${where}`;
  let cost = costs.get(key);
  if (!cost) {
    cost = { ...b.cost, [shield]: (b.cost[shield] ?? 0) + b.biosphere!.shield };
    costs.set(key, cost);
  }
  return cost;
}

export const buildMass = (id: string, where?: Where): number =>
  Object.entries(buildCost(id, where)).reduce((a, [m, v]) => a + (isMass(m) ? v : 0), 0);

export const buildHours = (id: string, where?: Where): number =>
  24 * (BUILD_BASE_DAYS + (BUILD_DAYS_PER_TONNE * buildMass(id, where)) / 1000);
