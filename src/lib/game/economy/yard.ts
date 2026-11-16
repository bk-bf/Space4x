import type { Amounts } from '#lib/game/data/index.ts';
import { standing } from './programmes.ts';
import type { Economy, Site, YardOrder } from './types.ts';

export const SHIP_BASE_DAYS = 2;
export const SHIP_DAYS_PER_TONNE = 0.5;
export const shipEstimated = true;

export interface ShipSpec {
  design: string;
  name: string;
  yard: string;
  cost: Amounts;
  dryMass: number;
}

export const shipBuildHours = (dryMass: number): number =>
  24 * (SHIP_BASE_DAYS + (SHIP_DAYS_PER_TONNE * dryMass) / 1000);

export const hasYard = (site: Site, yard: string): boolean => standing(site, yard) > 0;

export function queueShips(eco: Economy, site: Site, spec: ShipSpec, count = 1): YardOrder[] {
  if (!hasYard(site, spec.yard)) return [];
  const made: YardOrder[] = [];
  for (let i = 0; i < Math.max(1, Math.floor(count)); i++) {
    const o: YardOrder = {
      id: eco.nextId++,
      design: spec.design,
      name: spec.name,
      yard: spec.yard,
      cost: { ...spec.cost },
      hours: shipBuildHours(spec.dryMass),
      done: 0,
      paused: false,
      stalled: null
    };
    site.yard.push(o);
    made.push(o);
  }
  return made;
}

export function moveShipOrder(site: Site, orderId: number, by: number): void {
  const i = site.yard.findIndex((o) => o.id === orderId);
  const j = i + by;
  if (i < 0 || j < 0 || j >= site.yard.length) return;
  const [o] = site.yard.splice(i, 1);
  if (o) site.yard.splice(j, 0, o);
}

export function pauseShipOrder(site: Site, orderId: number): void {
  const o = site.yard.find((x) => x.id === orderId);
  if (o) o.paused = !o.paused;
}

export function removeShipOrder(site: Site, orderId: number): void {
  const i = site.yard.findIndex((o) => o.id === orderId);
  if (i >= 0) site.yard.splice(i, 1);
}

export function drainDeliveries(eco: Economy): Economy['delivered'] {
  return eco.delivered.splice(0);
}
