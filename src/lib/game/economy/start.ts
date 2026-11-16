import earth from '#lib/game/data/earth.json';
import type { Site as Where } from '#lib/game/data/index.ts';
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
  kcalPerPersonDay: number;
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
    body: data.body as Where,
    worldBody,
    region: null,
    place: 'surface',
    angle: 0,
    berths: null,
    population: data.population,
    workforceShare: data.workforceShare,
    kcalPerPersonDay: data.kcalPerPersonDay,
    growthPerYear: data.growthPerYear,
    gridKw: data.gridKw,
    stock: {},
    groups: data.groups.map((g) => ({ id: eco.nextId++, ...g, on: true })),
    queue: [],
    yard: [],
    launches: [],
    alerts: { food: false, power: false },
    made: {},
    ran: {},
    built: 0
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
    delivered: [],
    mined: {},
    exhausted: [],
    flown: {},
    ledger: { extracted: 0, eaten: 0, built: 0, spent: 0, lost: 0, burned: 0 }
  };
  eco.sites.push(startSite(eco, 'earth', 'earth', earthStart));
  return eco;
}
