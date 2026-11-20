import { boostOf, material, type Amounts } from '#lib/game/data/index.ts';
import { isMass } from './processes.ts';
import { standing } from './programmes.ts';
import type { Economy, LogFn, Site, YardOrder } from './types.ts';

export const SHIP_BASE_DAYS = 2;
export const SHIP_DAYS_PER_TONNE = 0.5;
export const SP_PER_SHIPYARD_DAY = 1;
export const KG_PER_SHIPYARD = 100_000;
export const shipEstimated = true;

export interface ShipSpec {
  design: string;
  name: string;
  yard: string;
  cost: Amounts;
  dryMass: number;
}

export const shipyardsFor = (dryMass: number): number =>
  Math.max(1, Math.ceil(dryMass / KG_PER_SHIPYARD - 1e-9));

export const shipPoints = (dryMass: number): number =>
  (SHIP_BASE_DAYS + (SHIP_DAYS_PER_TONNE * dryMass) / 1000) * shipyardsFor(dryMass);

export const hasYard = (site: Site, yard: string): boolean => standing(site, yard) > 0;

export const yardPointsPerDay = (eco: Economy, site: Site, yard: string): number =>
  standing(site, yard) * SP_PER_SHIPYARD_DAY * boostOf(eco.done, 'shipyard_points');

export const allocatedPercent = (site: Site, yard: string, except?: YardOrder): number =>
  site.yard.filter((o) => o.yard === yard && o !== except).reduce((a, o) => a + o.percent, 0);

export const freePercent = (site: Site, yard: string): number =>
  Math.max(0, 100 - allocatedPercent(site, yard));

const wants = (o: YardOrder): boolean => !o.paused && o.percent > 0;

function heldBy(site: Site, paid: boolean, free: Record<string, number>): YardOrder[] {
  const held: YardOrder[] = [];
  for (const o of site.yard) {
    if (o.paid !== paid || !wants(o)) continue;
    const left = free[o.yard] ?? standing(site, o.yard);
    if (o.shipyards > left) continue;
    free[o.yard] = left - o.shipyards;
    held.push(o);
  }
  return held;
}

export function activeYardOrders(site: Site): YardOrder[] {
  return heldBy(site, true, {});
}

export function freeShipyards(site: Site, yard: string): number {
  return activeYardOrders(site)
    .filter((o) => o.yard === yard)
    .reduce((a, o) => a - o.shipyards, standing(site, yard));
}

export const costShortage = (site: Site, cost: Amounts): string | null =>
  Object.entries(cost).find(([m, need]) => (site.stock[m] ?? 0) < need - 1e-9)?.[0] ?? null;

export function startShips(eco: Economy, site: Site, at = eco.elapsed, log?: LogFn): void {
  const free: Record<string, number> = {};
  heldBy(site, true, free);
  for (const o of site.yard) {
    if (o.paid || !wants(o)) continue;
    const left = free[o.yard] ?? standing(site, o.yard);
    if (o.shipyards > left) continue;
    const short = costShortage(site, o.cost);
    if (short) {
      if (log && short !== o.stalled) {
        log(`The ${o.name} at ${site.name} is waiting for ${material(short).name}.`, true, at, site.id);
        o.stalled = short;
      }
      continue;
    }
    for (const [m, need] of Object.entries(o.cost)) {
      site.stock[m] = (site.stock[m] ?? 0) - need;
      if (isMass(m)) eco.ledger.built += need;
    }
    o.paid = true;
    o.stalled = null;
    free[o.yard] = left - o.shipyards;
  }
}

export function queueShips(eco: Economy, site: Site, spec: ShipSpec, count = 1): YardOrder[] {
  if (shipyardsFor(spec.dryMass) > standing(site, spec.yard)) return [];
  const made: YardOrder[] = [];
  for (let i = 0; i < Math.max(1, Math.floor(count)); i++) {
    const o: YardOrder = {
      id: eco.nextId++,
      design: spec.design,
      name: spec.name,
      yard: spec.yard,
      cost: { ...spec.cost },
      shipyards: shipyardsFor(spec.dryMass),
      points: shipPoints(spec.dryMass),
      percent: freePercent(site, spec.yard),
      paid: false,
      done: 0,
      paused: false,
      stalled: null
    };
    site.yard.push(o);
    made.push(o);
  }
  startShips(eco, site);
  return made;
}

export function setShipPercent(eco: Economy, site: Site, orderId: number, percent: number): void {
  const o = site.yard.find((x) => x.id === orderId);
  if (!o) return;
  const most = 100 - allocatedPercent(site, o.yard, o);
  o.percent = Math.max(0, Math.min(most, Math.round(percent)));
  startShips(eco, site);
}

export function moveShipOrder(eco: Economy, site: Site, orderId: number, by: number): void {
  const i = site.yard.findIndex((o) => o.id === orderId);
  const j = i + by;
  if (i < 0 || j < 0 || j >= site.yard.length) return;
  const [o] = site.yard.splice(i, 1);
  if (o) site.yard.splice(j, 0, o);
  startShips(eco, site);
}

export function pauseShipOrder(eco: Economy, site: Site, orderId: number): void {
  const o = site.yard.find((x) => x.id === orderId);
  if (o) o.paused = !o.paused;
  startShips(eco, site);
}

export function removeShipOrder(eco: Economy, site: Site, orderId: number): void {
  const i = site.yard.findIndex((o) => o.id === orderId);
  if (i >= 0) site.yard.splice(i, 1);
  startShips(eco, site);
}

export function drainDeliveries(eco: Economy): Economy['delivered'] {
  return eco.delivered.splice(0);
}
