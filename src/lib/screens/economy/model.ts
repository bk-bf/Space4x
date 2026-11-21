import { building } from '#lib/game/data/index.ts';
import type { Building, BuildingKind, Plant } from '#lib/game/data/index.ts';
import {
  groupWorkers,
  isBiosphere,
  isStockless,
  POWER,
  process,
  type GroupActor,
  type Site,
  type SiteFlows
} from '#lib/game/economy/index.ts';
import { BUILDING_KIND_NAMES, KIND_EXAMPLES, type IconRef } from '#lib/gfx/icons/index.ts';
import { bld } from './refs.ts';
import { coverDays, limitText } from './view.ts';

export const KIND_ORDER = Object.keys(BUILDING_KIND_NAMES) as BuildingKind[];
export const COVER_FULL_DAYS = 730;
export const COVER_BAD_DAYS = 365;

export interface StockView {
  id: string;
  stock: number;
  made: number;
  used: number;
  net: number;
  cover: number;
  coverFraction: number;
  bad: boolean;
  short: boolean;
  stockless: boolean;
  empty: boolean;
}

export function stockView(site: Site, flows: SiteFlows, id: string): StockView {
  const stock = site.stock[id] ?? 0;
  const made = flows.produced[id] ?? 0;
  const used = (flows.consumed[id] ?? 0) + (flows.eaten[id] ?? 0);
  const net = made - used;
  const cover = coverDays(site, flows, id);
  const stockless = isStockless(id);
  const empty = stock <= 0 && made <= 0 && used <= 0;
  const starving = stock <= 0 && used > made + 1e-9;
  return {
    id,
    stock,
    made,
    used,
    net,
    cover,
    coverFraction: empty ? 0 : Number.isFinite(cover) ? Math.min(1, cover / COVER_FULL_DAYS) : 1,
    bad: stockless ? used > made + 1e-9 : (Number.isFinite(cover) && cover < COVER_BAD_DAYS) || starving,
    short: !stockless && ((Number.isFinite(cover) && cover < COVER_FULL_DAYS) || starving),
    stockless,
    empty
  };
}

export const stalledMaterials = (site: Site): string[] => [
  ...new Set([...site.queue, ...site.yard].map((o) => o.stalled).filter((m): m is string => m !== null))
];

export interface GroupView {
  actor: GroupActor;
  building: Building;
  main: string | undefined;
  plant: Plant | undefined;
  label: string;
  warn: boolean;
  quiet: boolean;
  limit: string;
}

export function groupViews(site: Site, flows: SiteFlows): GroupView[] {
  return flows.actors
    .filter((a): a is GroupActor => a.kind === 'group')
    .map((actor) => {
      const b = building(actor.group.building);
      const quiet = actor.limit?.kind === 'off' || actor.limit?.kind === 'idle';
      const proc = actor.group.process ? process(actor.group.process, site.body) : undefined;
      const main = proc
        ? Object.entries(proc.outputs)
            .filter(([m]) => m !== POWER)
            .sort((x, y) => y[1] - x[1])[0]?.[0]
        : undefined;
      return {
        actor,
        building: b,
        main,
        plant: b.plant,
        label: proc?.name ?? b.name,
        warn: !!actor.limit && !quiet,
        quiet,
        limit: limitText(actor.limit)
      };
    })
    .sort(
      (x, y) =>
        KIND_ORDER.indexOf(x.building.kind) - KIND_ORDER.indexOf(y.building.kind) ||
        y.actor.group.count - x.actor.group.count
    );
}

export const kindIcon = (kind: string): IconRef => bld(KIND_EXAMPLES[kind] ?? 'smelter');

export interface KindTotal {
  kind: BuildingKind;
  count: number;
  groups: number;
  workers: number;
  power: number;
}

export function kindTotals(site: Site, views: readonly GroupView[]): KindTotal[] {
  const by: Partial<Record<BuildingKind, KindTotal>> = {};
  for (const v of views) {
    const kind = v.building.kind;
    const row = (by[kind] ??= { kind, count: 0, groups: 0, workers: 0, power: 0 });
    const g = v.actor.group;
    row.count += g.count;
    row.groups++;
    row.workers += g.on && (g.process || isBiosphere(g)) ? groupWorkers(site, g) : 0;
    row.power += (v.actor.inputs[POWER] ?? 0) * v.actor.share;
  }
  return KIND_ORDER.flatMap((k) => (by[k] ? [by[k]] : []));
}
