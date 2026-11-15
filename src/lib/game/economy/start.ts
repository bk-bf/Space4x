import earth from '#lib/game/data/earth.json';
import type { Body } from '#lib/game/data/index.ts';
import { siteFlows } from './flows.ts';
import { isStockless } from './processes.ts';
import type { Economy, Site } from './types.ts';

export interface StartGroup {
  building: string;
  process: string | null;
  count: number;
}

export interface StartSite {
  name: string;
  body: string;
  population: number;
  workforceShare: number;
  foodPerPersonDay: number;
  growthPerYear: number;
  gridKw: number;
  stockDays: number;
  groups: StartGroup[];
}

export const earthStart = earth as StartSite;

export function startSite(eco: Economy, id: string, worldBody: string, data: StartSite): Site {
  const site: Site = {
    id,
    name: data.name,
    body: data.body as Body,
    worldBody,
    population: data.population,
    workforceShare: data.workforceShare,
    foodPerPersonDay: data.foodPerPersonDay,
    growthPerYear: data.growthPerYear,
    gridKw: data.gridKw,
    stock: {},
    groups: data.groups.map((g) => ({ id: eco.nextId++, ...g, on: true })),
    queue: [],
    alerts: { food: false, power: false }
  };
  const flows = siteFlows(eco, site);
  for (const [m, rate] of Object.entries(flows.produced))
    if (!isStockless(m)) site.stock[m] = rate * 24 * data.stockDays;
  return site;
}

export function startEconomy(): Economy {
  const eco: Economy = {
    sites: [],
    done: [],
    running: [],
    elapsed: 0,
    nextId: 1,
    ledger: { extracted: 0, eaten: 0, built: 0, spent: 0, lost: 0 }
  };
  eco.sites.push(startSite(eco, 'earth', 'earth', earthStart));
  return eco;
}
