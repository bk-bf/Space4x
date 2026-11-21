import { addRobots, berthsOf, economy, idleRobots, takeRobots, type Site } from '#lib/game/economy/index.ts';
import { robotStatsOf } from '#lib/game/robots/index.ts';
import { PROPELLANTS, type PropellantKind } from '#lib/game/shipdesign/index.ts';
import { cargoRoom, propellantRoom, statsOf } from './model.ts';
import type { AllCargo, Item, ManifestLine, Vessel } from './types.ts';

export const HANDLING_SECONDS = 4 * 3600;
export const DOCK_SECONDS = 3600;

const EPS = 1e-9;

export function propellantAvailable(site: Site, kind: PropellantKind): number {
  let most = Infinity;
  for (const [m, share] of Object.entries(PROPELLANTS[kind].mix))
    if (share > 0) most = Math.min(most, (site.stock[m] ?? 0) / share);
  return Number.isFinite(most) ? Math.max(0, most) : 0;
}

export function propellantShort(site: Site, kind: PropellantKind): string | undefined {
  for (const [m, share] of Object.entries(PROPELLANTS[kind].mix))
    if (share > 0 && (site.stock[m] ?? 0) <= EPS) return m;
  return undefined;
}

export function drawPropellant(site: Site, kind: PropellantKind, kg: number): void {
  for (const [m, share] of Object.entries(PROPELLANTS[kind].mix))
    site.stock[m] = Math.max(0, (site.stock[m] ?? 0) - share * kg);
}

export function returnPropellant(site: Site, kind: PropellantKind, kg: number): void {
  for (const [m, share] of Object.entries(PROPELLANTS[kind].mix))
    site.stock[m] = (site.stock[m] ?? 0) + share * kg;
}

const take = (want: number | null, ...limits: number[]): number =>
  Math.max(0, Math.min(want ?? Infinity, ...limits));

export function loadItem(site: Site, v: Vessel, item: Item, amount: number | null): number {
  if (item.kind === 'robot') {
    const mass = robotStatsOf(item.id)?.mass ?? 0;
    const fits = mass > 0 ? Math.floor(cargoRoom(v) / mass + 1e-9) : 0;
    const n = takeRobots(site, item.id, Math.floor(take(amount, idleRobots(site, item.id), fits)));
    if (n <= 0) return 0;
    v.robots[item.id] = (v.robots[item.id] ?? 0) + n;
    return n;
  }
  if (item.kind === 'cargo') {
    const n = take(amount, site.stock[item.id] ?? 0, cargoRoom(v));
    if (n <= 0) return 0;
    site.stock[item.id] = (site.stock[item.id] ?? 0) - n;
    v.cargo[item.id] = (v.cargo[item.id] ?? 0) + n;
    return n;
  }
  if (item.kind === 'propellant') {
    const n = take(amount, propellantAvailable(site, item.id), propellantRoom(v, item.id));
    if (n <= 0) return 0;
    drawPropellant(site, item.id, n);
    v.propellant[item.id] = (v.propellant[item.id] ?? 0) + n;
    return n;
  }
  const berths = statsOf(v)?.berths ?? 0;
  const n = Math.floor(take(amount, site.population, Math.max(0, berths - v.crew)));
  if (n <= 0) return 0;
  site.population -= n;
  v.crew += n;
  return n;
}

export function unloadItem(site: Site, v: Vessel, item: Item | AllCargo, amount: number | null): number {
  if (item.kind === 'all-cargo') {
    let moved = 0;
    for (const id of Object.keys(v.cargo)) moved += unloadItem(site, v, { kind: 'cargo', id }, null);
    for (const id of Object.keys(v.robots)) moved += unloadItem(site, v, { kind: 'robot', id }, null);
    return moved;
  }
  if (item.kind === 'robot') {
    const n = Math.floor(take(amount, v.robots[item.id] ?? 0));
    if (n <= 0) return 0;
    v.robots[item.id] = (v.robots[item.id] ?? 0) - n;
    if ((v.robots[item.id] ?? 0) <= 0) delete v.robots[item.id];
    addRobots(economy, site, item.id, n);
    return n;
  }
  if (item.kind === 'cargo') {
    const n = take(amount, v.cargo[item.id] ?? 0);
    if (n <= 0) return 0;
    v.cargo[item.id] = (v.cargo[item.id] ?? 0) - n;
    if ((v.cargo[item.id] ?? 0) <= EPS) delete v.cargo[item.id];
    site.stock[item.id] = (site.stock[item.id] ?? 0) + n;
    return n;
  }
  if (item.kind === 'propellant') {
    const n = take(amount, v.propellant[item.id] ?? 0);
    if (n <= 0) return 0;
    v.propellant[item.id] = (v.propellant[item.id] ?? 0) - n;
    returnPropellant(site, item.id, n);
    return n;
  }
  const berths = berthsOf(site);
  const room = berths === null ? Infinity : Math.max(0, Math.round(berths - site.population));
  const n = Math.floor(take(amount, v.crew, room));
  if (n <= 0) return 0;
  v.crew -= n;
  site.population = berths === null ? site.population + n : Math.min(berths, site.population + n);
  return n;
}

export interface ManifestResult {
  item: Item;
  wanted: number | null;
  moved: number;
}

export function loadManifest(site: Site, v: Vessel, lines: ManifestLine[]): ManifestResult[] {
  return lines.map((l) => ({ item: l.item, wanted: l.amount, moved: loadItem(site, v, l.item, l.amount) }));
}

export function previewLoad(site: Site, v: Vessel, lines: ManifestLine[]): ManifestResult[] {
  const siteCopy: Site = { ...site, stock: { ...site.stock }, robots: site.robots.map((r) => ({ ...r })) };
  const vesselCopy: Vessel = {
    ...v,
    cargo: { ...v.cargo },
    robots: { ...v.robots },
    propellant: { ...v.propellant }
  };
  return loadManifest(siteCopy, vesselCopy, lines);
}
