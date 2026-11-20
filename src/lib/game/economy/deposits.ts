import {
  atmosphereOf,
  depletableRecord,
  depositGrade,
  finiteContent,
  region,
  type Deposit
} from '#lib/game/data/index.ts';
import type { Economy, Site } from './types.ts';

export const DEPLETED_EPS = 1;

export function gradeAt(site: Site, materialId: string): number | undefined {
  if (site.place === 'orbit') return undefined;
  return depositGrade(site.worldBody, site.region, materialId);
}

export const gradeIn = (worldBody: string, region: string | null, materialId: string): number | undefined =>
  depositGrade(worldBody, region, materialId);

export function siteDeposits(site: Site): { ground: Deposit[]; air: Deposit[] } {
  if (site.place === 'orbit' || site.body === 'earth') return { ground: [], air: [] };
  return {
    ground: site.region ? (region(site.region)?.deposits ?? []) : [],
    air: atmosphereOf(site.worldBody)?.deposits ?? []
  };
}

export const minedOf = (eco: Economy, worldBody: string): number => eco.mined[worldBody] ?? 0;

export function remainingMass(eco: Economy, worldBody: string): number {
  const a = depletableRecord(worldBody);
  return a ? Math.max(0, a.mass - minedOf(eco, worldBody)) : Infinity;
}

export const isDepleted = (eco: Economy, worldBody: string): boolean =>
  remainingMass(eco, worldBody) <= DEPLETED_EPS;

export function reserveLeft(eco: Economy, worldBody: string, materialId: string): number {
  const content = finiteContent(worldBody, materialId);
  return content === undefined ? Infinity : Math.max(0, content - (eco.drawn[materialId] ?? 0));
}

export const isReserveSpent = (eco: Economy, worldBody: string, materialId: string): boolean =>
  reserveLeft(eco, worldBody, materialId) <= DEPLETED_EPS;
