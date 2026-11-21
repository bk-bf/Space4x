import { building, buildings } from '#lib/game/data/index.ts';
import { BIOSPHERE, biosphereFigures, biospherePeople } from '#lib/game/suitability.ts';
import { buildMass } from './construction.ts';
import type { Economy, Group, Site } from './types.ts';

const KIT_EPS = 1e-6;

export const holdsHere = (buildingId: string, worldBody: string): boolean =>
  buildingId !== BIOSPHERE || biospherePeople(worldBody) > 0;

export const standsHere = (buildingId: string, site: Site): boolean =>
  building(buildingId).where.includes(site.body) && holdsHere(buildingId, site.worldBody);

export const biospheresAt = (site: Site): number =>
  site.groups.reduce((a, g) => a + (g.building === BIOSPHERE ? g.count : 0), 0);

export const biosphereBerths = (site: Site): number =>
  site.place === 'surface' ? biospheresAt(site) * biospherePeople(site.worldBody) : 0;

export const berthsOf = (site: Site): number | null =>
  site.berths === null ? null : site.berths + biosphereBerths(site);

export const addsModuleBerths = (site: Site): boolean => site.place !== 'surface';

export const isBiosphere = (g: Group): boolean => g.building === BIOSPHERE;

export function residentsOf(site: Site, g: Group): number {
  const all = biospheresAt(site);
  if (!isBiosphere(g) || all <= 0) return 0;
  return (Math.min(site.population, biosphereBerths(site)) * g.count) / all;
}

const biosphereWorkers = (site: Site, g: Group): number =>
  residentsOf(site, g) * biosphereFigures().residentWorkers;

export const groupWorkers = (site: Site, g: Group): number =>
  isBiosphere(g) ? biosphereWorkers(site, g) : g.count * building(g.building).workers;

const kitBuildings = buildings.filter((b) => b.kit);

export const kitOf = (buildingId: string): string | undefined => building(buildingId).kit?.material;

export const makesHere = (buildingId: string, site: Site): boolean => {
  const kit = building(buildingId).kit;
  if (!kit) return standsHere(buildingId, site);
  return site.groups.some((g) => g.building === kit.builtWith && g.count > 0);
};

export function addBuildings(
  eco: Economy,
  site: Site,
  buildingId: string,
  process: string | null,
  n: number
) {
  const same = site.groups.find((g) => g.building === buildingId && g.process === process && g.on);
  if (same) {
    same.count += n;
    if (same.active !== undefined) same.active += n;
  } else site.groups.push({ id: eco.nextId++, building: buildingId, process, count: n, on: true });
}

export function packKit(eco: Economy, site: Site, buildingId: string): void {
  const kit = kitOf(buildingId)!;
  const mass = buildMass(buildingId);
  site.stock[kit] = (site.stock[kit] ?? 0) + mass;
  eco.ledger.built -= mass;
}

export function standKits(eco: Economy, site: Site): number {
  let stood = 0;
  for (const b of kitBuildings) {
    const kit = b.kit!.material;
    if (!standsHere(b.id, site)) continue;
    const mass = buildMass(b.id);
    const n = Math.floor((site.stock[kit] ?? 0) / mass + KIT_EPS);
    if (n <= 0) continue;
    const left = (site.stock[kit] ?? 0) - n * mass;
    if (left <= KIT_EPS * mass) delete site.stock[kit];
    else site.stock[kit] = left;
    eco.ledger.built += n * mass;
    addBuildings(eco, site, b.id, null, n);
    stood += n;
  }
  return stood;
}
