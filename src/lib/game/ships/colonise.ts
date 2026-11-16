import { building, material } from '#lib/game/data/index.ts';
import type { Building } from '#lib/game/data/index.ts';
import {
  economy,
  firstBuildings,
  newSite,
  siteAt,
  standFirst,
  touch,
  type Site
} from '#lib/game/economy/index.ts';
import type { Game } from '#lib/game/state.svelte.ts';
import { PROPELLANT_KINDS } from '#lib/game/shipdesign/index.ts';
import { returnPropellant } from './cargo.ts';
import { statsOf } from './model.ts';
import { ships } from './state.svelte.ts';
import type { Vessel } from './types.ts';
import { clearTripOption } from './world.ts';

export interface FoundOption {
  building: Building;
  missing: { id: string; need: number; have: number }[];
}

function placeFor(v: Vessel): { worldBody: string; place: 'surface' | 'orbit'; angle: number } | undefined {
  if (v.trip) return undefined;
  if (v.at.kind === 'orbit') return { worldBody: v.at.body, place: 'orbit', angle: v.at.angle };
  if (v.at.kind === 'surface') return { worldBody: v.at.body, place: 'surface', angle: 0 };
  return undefined;
}

export function foundOptions(v: Vessel): FoundOption[] {
  const p = placeFor(v);
  if (!p || siteAt(economy, p.worldBody, p.place)) return [];
  return firstBuildings(economy, p.worldBody, p.place).map((b) => ({
    building: b,
    missing: Object.entries(b.cost)
      .filter(([m, need]) => (v.cargo[m] ?? 0) + 1e-9 < need)
      .map(([id, need]) => ({ id, need, have: v.cargo[id] ?? 0 }))
  }));
}

function absorb(site: Site, v: Vessel): void {
  const stats = statsOf(v);
  for (const [m, kg] of Object.entries(v.cargo)) site.stock[m] = (site.stock[m] ?? 0) + kg;
  for (const k of PROPELLANT_KINDS)
    if ((v.propellant[k] ?? 0) > 0) returnPropellant(site, k, v.propellant[k] ?? 0);
  site.population += v.crew;
  site.berths = (site.berths ?? 0) + (stats?.berths ?? 0);
  site.gridKw += Math.max(0, stats?.power.made ?? 0);
  ships.vessels = ships.vessels.filter((x) => x !== v);
  clearTripOption(v.id);
}

export function foundSite(game: Game, v: Vessel, buildingId: string): Site | string {
  const p = placeFor(v);
  if (!p) return `${v.name} must be in orbit or on the ground, not docked or flying.`;
  if (siteAt(economy, p.worldBody, p.place)) return 'There is a site here already.';
  const option = foundOptions(v).find((o) => o.building.id === buildingId);
  if (!option) return `${building(buildingId).name} cannot be built here yet.`;
  const first = option.missing[0];
  if (first)
    return `${material(first.id).name} is short by ${Math.ceil(first.need - first.have).toLocaleString('en-US')} kg.`;
  const bodyName = game.body(p.worldBody)?.name ?? p.worldBody;
  const site = newSite(economy, { ...p, bodyName });
  if (!site) return 'This place cannot hold a site.';
  for (const [m, need] of Object.entries(building(buildingId).cost)) v.cargo[m] = (v.cargo[m] ?? 0) - need;
  standFirst(economy, site, buildingId);
  absorb(site, v);
  if (p.place === 'surface') {
    const body = game.body(p.worldBody);
    if (body) body.colony = true;
  }
  touch();
  game.log('ship', `${site.name} was founded with a ${building(buildingId).name}.`, false, {
    subject: { kind: 'base', id: site.id }
  });
  return site;
}

export function installModule(game: Game, v: Vessel): string | undefined {
  if (v.at.kind !== 'site') return `${v.name} is not docked or landed at a site.`;
  const siteId = v.at.site;
  const site = economy.sites.find((s) => s.id === siteId);
  if (!site || site.berths === null) return 'Install a ship at a site off Earth.';
  absorb(site, v);
  touch();
  game.log('ship', `${v.name} became part of ${site.name}.`, false, {
    subject: { kind: 'base', id: site.id }
  });
  return undefined;
}
