import {
  HOURS_PER_YEAR,
  reserveLeft,
  type Economy,
  type Site,
  type SiteFlows
} from '#lib/game/economy/index.ts';
import { RESERVE_WORLD, materials, region, reserves, regionsOf, atmosphereOf } from '#lib/game/data/index.ts';
import type { Region, ReserveRecord } from '#lib/game/data/index.ts';
import { gradeText, gradeView, isSurveyed } from '#lib/game/survey.svelte.ts';

export const LOW_YEARS = 50;

export interface ReserveRow {
  id: string;
  record: ReserveRecord;
  left: number;
  minedPerYear: number;
  years: number | null;
  low: boolean;
}

export const hasReserves = (site: Site): boolean =>
  site.worldBody === RESERVE_WORLD && site.place === 'surface';

function minedPerHour(flows: SiteFlows, id: string): number {
  let kg = 0;
  for (const a of flows.actors) if (a.share > 0) kg += (a.extracts[id] ?? 0) * a.share;
  return kg;
}

export function reserveRow(eco: Economy, site: Site, flows: SiteFlows, record: ReserveRecord): ReserveRow {
  const minedPerYear = minedPerHour(flows, record.material) * HOURS_PER_YEAR;
  const content = record.content;
  const share = content === null ? 1 : reserveLeft(eco, site.worldBody, record.material) / content;
  const left = record.reserve * share;
  const years =
    minedPerYear <= 0
      ? Infinity
      : content === null
        ? null
        : reserveLeft(eco, site.worldBody, record.material) / minedPerYear;
  return {
    id: record.material,
    record,
    left,
    minedPerYear,
    years,
    low: years !== null && Number.isFinite(years) && years < LOW_YEARS
  };
}

const known = new Set(materials.map((m) => m.id));

export function reserveRows(eco: Economy, site: Site, flows: SiteFlows): ReserveRow[] {
  const rank = (r: ReserveRow) => (r.years === null ? Infinity : r.years);
  return reserves
    .filter((r) => known.has(r.material))
    .map((r) => reserveRow(eco, site, flows, r))
    .map((r, i) => ({ r, i }))
    .sort((a, b) => {
      const d = rank(a.r) - rank(b.r);
      return Number.isNaN(d) || d === 0 ? a.i - b.i : d;
    })
    .map(({ r }) => r);
}

export function yearsText(years: number | null): string {
  if (years === null) return '-';
  if (!Number.isFinite(years)) return 'not mined';
  return years >= 1000 ? `${Math.round(years / 100) * 100} yr` : `${Math.round(years)} yr`;
}

export interface DepositRow {
  key: string;
  material: string;
  place: string;
  grade: string;
  exact: boolean;
}

export interface DepositGroup {
  id: string;
  name: string;
  here: boolean;
  rows: DepositRow[];
}

function groupOf(r: Region, site: Site): DepositGroup {
  const exact = r.kind === 'atmosphere' || r.id === site.region;
  return {
    id: r.id,
    name: r.name,
    here: r.id === site.region,
    rows: r.deposits.map((d) => ({
      key: `${r.id}:${d.material}`,
      material: d.material,
      place: r.name,
      grade: exact ? d.grade.toFixed(2) : gradeText(gradeView(r, d.material)!),
      exact
    }))
  };
}

export interface BodyDeposits {
  groups: DepositGroup[];
  unknown: boolean;
}

export function bodyDeposits(site: Site): BodyDeposits {
  const air = atmosphereOf(site.worldBody);
  const ground = regionsOf(site.worldBody);
  const surveyed = isSurveyed(site.worldBody);
  const own = site.region ? region(site.region) : undefined;
  const shown = surveyed ? ground : own ? [own] : [];
  return {
    groups: [...(air ? [air] : []), ...shown].map((r) => groupOf(r, site)),
    unknown: ground.length > 0 && !surveyed
  };
}
