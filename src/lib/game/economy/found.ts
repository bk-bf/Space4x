import { building } from '#lib/game/data/index.ts';
import type { Body, Site as Where } from '#lib/game/data/index.ts';
import { buildingsAt, isMass } from './processes.ts';
import { unlockedProcesses } from './actions.ts';
import type { Economy, Site, SitePlace } from './types.ts';
import { isUnlocked } from './unlocks.ts';

export const DATA_BODIES: Readonly<Record<string, Body>> = {
  earth: 'earth',
  luna: 'moon',
  mars: 'mars',
  venus: 'venus',
  europa: 'icy-moon',
  jupiter: 'gas-giant',
  saturn: 'gas-giant',
  uranus: 'ice-giant',
  neptune: 'ice-giant',
  ceres: 'asteroid-c'
};

export const FOUNDING_CREW_SHARE = 1;

export interface Foundation {
  worldBody: string;
  bodyName: string;
  place: SitePlace;
  angle: number;
}

export const whereOf = (worldBody: string, place: SitePlace): Where | undefined =>
  place === 'orbit' ? 'orbit' : DATA_BODIES[worldBody];

export const siteAt = (eco: Economy, worldBody: string, place: SitePlace): Site | undefined =>
  eco.sites.find((s) => s.worldBody === worldBody && s.place === place);

export function firstBuildings(eco: Economy, worldBody: string, place: SitePlace) {
  const where = whereOf(worldBody, place);
  return where ? buildingsAt(where).filter((b) => isUnlocked(eco, b)) : [];
}

export function newSite(eco: Economy, f: Foundation): Site | undefined {
  const where = whereOf(f.worldBody, f.place);
  if (!where || siteAt(eco, f.worldBody, f.place)) return undefined;
  const taken = eco.sites.filter((s) => s.worldBody === f.worldBody && s.place === f.place).length;
  const id = f.place === 'surface' ? f.worldBody : `orbit-${f.worldBody}${taken ? `-${taken + 1}` : ''}`;
  const site: Site = {
    id,
    name: f.place === 'surface' ? `${f.bodyName} outpost` : `${f.bodyName} orbital station`,
    body: where,
    worldBody: f.worldBody,
    place: f.place,
    angle: f.angle,
    berths: 0,
    population: 0,
    workforceShare: FOUNDING_CREW_SHARE,
    foodPerPersonDay: 1,
    growthPerYear: 0,
    gridKw: 0,
    stock: {},
    groups: [],
    queue: [],
    yard: [],
    launches: [],
    alerts: { food: false, power: false }
  };
  eco.sites.push(site);
  return site;
}

export function standFirst(eco: Economy, site: Site, buildingId: string): boolean {
  const b = building(buildingId);
  if (!b.where.includes(site.body) || !isUnlocked(eco, b)) return false;
  const process = unlockedProcesses(eco, site, buildingId)[0]?.id ?? null;
  const same = site.groups.find((g) => g.building === buildingId && g.process === process && g.on);
  if (same) same.count += 1;
  else site.groups.push({ id: eco.nextId++, building: buildingId, process, count: 1, on: true });
  return true;
}

export const stockMass = (site: Site): number =>
  Object.entries(site.stock).reduce((a, [m, v]) => a + (isMass(m) ? v : 0), 0);

export function removeSite(eco: Economy, id: string): void {
  const i = eco.sites.findIndex((s) => s.id === id);
  if (i > 0) eco.sites.splice(i, 1);
}
