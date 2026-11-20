import { BIOSPHERE, biospherePeople } from '#lib/game/suitability.ts';
import type { Site } from './types.ts';

export const holdsHere = (buildingId: string, worldBody: string): boolean =>
  buildingId !== BIOSPHERE || biospherePeople(worldBody) > 0;

export const biospheresAt = (site: Site): number =>
  site.groups.reduce((a, g) => a + (g.building === BIOSPHERE ? g.count : 0), 0);

export const biosphereBerths = (site: Site): number =>
  site.place === 'surface' ? biospheresAt(site) * biospherePeople(site.worldBody) : 0;

export const berthsOf = (site: Site): number | null =>
  site.berths === null ? null : site.berths + biosphereBerths(site);

export const addsModuleBerths = (site: Site): boolean => site.place !== 'surface';
