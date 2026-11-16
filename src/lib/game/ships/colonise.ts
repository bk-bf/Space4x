import { building, material, region as regionRecord, regionsOf } from '#lib/game/data/index.ts';
import type { Building, Region } from '#lib/game/data/index.ts';
import {
  economy,
  firstBuildings,
  newSite,
  siteIn,
  standFirst,
  touch,
  type Site
} from '#lib/game/economy/index.ts';
import type { Game } from '#lib/game/state.svelte.ts';
import { knownRegions } from '#lib/game/survey.svelte.ts';
import { PROPELLANT_KINDS } from '#lib/game/shipdesign/index.ts';
import { returnPropellant } from './cargo.ts';
import { statsOf } from './model.ts';
import { ships } from './state.svelte.ts';
import type { Vessel } from './types.ts';
import { clearTripOption, isJump, NO_SURFACE } from './world.ts';

export interface FoundOption {
  building: Building;
  missing: { id: string; need: number; have: number }[];
}

function placeFor(
  v: Vessel
): { worldBody: string; place: 'surface' | 'orbit' | 'point'; angle: number } | undefined {
  if (v.trip) return undefined;
  if (v.at.kind === 'orbit')
    return {
      worldBody: v.at.body,
      place: isJump(v.at.body) ? 'point' : NO_SURFACE.includes(v.at.body) ? 'surface' : 'orbit',
      angle: v.at.angle
    };
  if (v.at.kind === 'surface') return { worldBody: v.at.body, place: 'surface', angle: 0 };
  return undefined;
}

export function foundRegions(v: Vessel): Region[] {
  const p = placeFor(v);
  if (!p || p.place !== 'surface') return [];
  return knownRegions(p.worldBody).filter((r) => !siteIn(economy, p.worldBody, 'surface', r.id));
}

export function needsRegion(v: Vessel): boolean {
  const p = placeFor(v);
  return !!p && p.place === 'surface' && regionsOf(p.worldBody).length > 0;
}

export function foundOptions(v: Vessel, region: string | null = null): FoundOption[] {
  const p = placeFor(v);
  if (!p || siteIn(economy, p.worldBody, p.place, p.place === 'surface' ? region : null)) return [];
  if (needsRegion(v) && !region) return [];
  return firstBuildings(economy, p.worldBody, p.place, region).map((b) => ({
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

export function foundSite(
  game: Game,
  v: Vessel,
  buildingId: string,
  region: string | null = null
): Site | string {
  const p = placeFor(v);
  if (!p) return `${v.name} must be in orbit or on the ground, not docked or flying.`;
  const bodyLabel = game.body(p.worldBody)?.name ?? game.jump(p.worldBody)?.point.name ?? p.worldBody;
  if (p.place === 'point' && !game.jump(p.worldBody)?.point.surveyed)
    return `${bodyLabel} has not been surveyed.`;
  if (needsRegion(v)) {
    if (!region) return 'Choose a region to found the site in.';
    const r = regionRecord(region);
    if (!r || r.world !== p.worldBody || r.kind !== 'ground') return 'That region is not on this body.';
    if (!knownRegions(p.worldBody).some((x) => x.id === region))
      return `${bodyLabel} has not been surveyed; its regions are unknown.`;
  }
  const where = p.place === 'surface' ? region : null;
  if (siteIn(economy, p.worldBody, p.place, where)) return 'There is a site here already.';
  const option = foundOptions(v, where).find((o) => o.building.id === buildingId);
  if (!option) return `${building(buildingId).name} cannot be built here yet.`;
  const first = option.missing[0];
  if (first)
    return `${material(first.id).name} is short by ${Math.ceil(first.need - first.have).toLocaleString('en-US')} kg.`;
  const site = newSite(economy, { ...p, region: where, bodyName: bodyLabel });
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
