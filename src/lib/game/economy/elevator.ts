import { building, type Elevator } from '#lib/game/data/index.ts';
import type { Economy, Site } from './types.ts';

export const ELEVATOR = 'space_elevator';

export const elevatorFigures = (): Elevator => building(ELEVATOR).elevator!;

export const liftKgPerHour = (): number => elevatorFigures().kgPerDay / 24;

export const elevatorTop = (eco: Economy, site: Site): Site | undefined =>
  site.place === 'surface'
    ? eco.sites.find((s) => s.place === 'orbit' && s.worldBody === site.worldBody)
    : undefined;

export const elevatorBases = (eco: Economy, top: Site): Site[] =>
  top.place === 'orbit'
    ? eco.sites.filter(
        (s) =>
          s.place === 'surface' &&
          s.worldBody === top.worldBody &&
          s.groups.some((g) => g.building === ELEVATOR && g.on && g.count > 0 && g.process)
      )
    : [];

export const elevatorStands = (eco: Economy, buildingId: string, worldBody: string, place: string): boolean =>
  buildingId !== ELEVATOR ||
  (place === 'surface' && eco.sites.some((s) => s.place === 'orbit' && s.worldBody === worldBody));
