import {
  building,
  buildings,
  material,
  materials,
  milestones,
  opensTags,
  recipesProducing,
  prerequisitesOf,
  recipes,
  region,
  shipComponent,
  shipComponents,
  tagOpen,
  type Body,
  type Building,
  type Component,
  type Milestone
} from '#lib/game/data/index.ts';
import {
  isUnlocked,
  programmeBill,
  programmeStatus,
  siteNeedCheck,
  siteNeedMissing,
  siteNeedProgress,
  standsAnywhere,
  type Criterion,
  type Economy,
  type ProgrammeStatus,
  type Site,
  type SiteFlows,
  type SitePlace
} from '#lib/game/economy/index.ts';
import { game } from '#lib/game/index.ts';
import type { IconRef } from '#lib/gfx/icons/index.ts';
import * as fmt from '#lib/ui/format.ts';

export function makersOf(eco: Economy, site: Site, id: string): string[] {
  const made = recipesProducing(id)
    .filter((r) => isUnlocked(eco, r) && building(r.building).where.includes(site.body))
    .map((r) => r.building);
  const mined = (material(id).sources ?? [])
    .filter((s) => s.body === site.body && isUnlocked(eco, building(s.building)))
    .map((s) => s.building);
  return [...new Set([...mined, ...made])];
}

export interface BillRow {
  id: string;
  have: number;
  need: number;
  ok: boolean;
  net?: number;
  days?: number;
}

export interface StandRow {
  kind: 'building' | 'component';
  id: string;
  ok: boolean;
  builder?: string;
}

export interface CriterionRow {
  text: string;
  ok: boolean;
}

export interface SiteRow {
  label: string;
  ok: boolean;
  progress?: number;
  site?: string;
  criteria: CriterionRow[];
}

export interface RequireRow {
  number: number;
  ok: boolean;
}

export interface Check {
  requires: RequireRow[];
  bill: BillRow[];
  stand: StandRow[];
  sites: SiteRow[];
  blockers: number;
}

export const netRate = (flows: SiteFlows, id: string): number =>
  (flows.produced[id] ?? 0) - (flows.consumed[id] ?? 0) - (flows.eaten[id] ?? 0);

export function daysToMeet(have: number, need: number, net: number): number {
  if (have >= need) return 0;
  return net > 1e-12 ? (need - have) / net / 24 : Infinity;
}

export function checkFor(eco: Economy, site: Site, m: Milestone, flows?: SiteFlows): Check {
  const bill = Object.entries(programmeBill(m)).map(([id, need]): BillRow => {
    const have = site.stock[id] ?? 0;
    const row: BillRow = { id, have, need, ok: have >= need };
    if (!flows) return row;
    const net = netRate(flows, id);
    return { ...row, net, days: daysToMeet(have, need, net) };
  });
  const stand: StandRow[] = [
    ...m.needs.buildings.map((id): StandRow => ({ kind: 'building', id, ok: standsAnywhere(eco, id) })),
    ...m.needs.components.map((id): StandRow => {
      const c = shipComponent(id);
      return {
        kind: 'component',
        id,
        ok: c.builtAt.some((b) => standsAnywhere(eco, b)),
        builder: c.builtAt[0]
      };
    })
  ];
  const sites = (m.needs.sites ?? []).map((need): SiteRow => {
    const progress = siteNeedProgress(eco, need);
    const found = siteNeedCheck(eco, need);
    return {
      label: need.label.replace(/^No /, '').replace(/^./, (c) => c.toUpperCase()),
      ok: siteNeedMissing(eco, need) === undefined,
      ...(progress === undefined ? {} : { progress }),
      ...(found.site ? { site: found.site.name } : {}),
      criteria: found.criteria.map((c) => ({ text: criterionText(c), ok: c.ok }))
    };
  });
  const requires = m.requires.map((number) => ({ number, ok: eco.done.includes(number) }));
  const blockers =
    requires.filter((r) => !r.ok).length +
    stand.filter((s) => !s.ok).length +
    sites.filter((s) => !s.ok).length +
    bill.filter((b) => !b.ok).length;
  return { requires, bill, stand, sites, blockers };
}

export function billShare(eco: Economy, site: Site, m: Milestone): number {
  const rows = checkFor(eco, site, m).bill;
  if (!rows.length) return 1;
  return rows.filter((r) => r.ok).length / rows.length;
}

export const GROUPS = ['running', 'ready', 'waiting', 'locked', 'done'] as const;

export const GROUP_NAMES: Record<ProgrammeStatus, string> = {
  running: 'Running',
  ready: 'Ready to start',
  waiting: 'Waiting for materials or buildings',
  locked: 'Locked behind prerequisites',
  done: 'Done'
};

export const statusOf = (eco: Economy, site: Site, m: Milestone): ProgrammeStatus =>
  programmeStatus(eco, site, m);

let icons: Map<number, IconRef> | undefined;

export function milestoneIcon(number: number): IconRef | undefined {
  if (!icons) {
    icons = new Map();
    const used = new Set<string>();
    for (const m of milestones) {
      const candidates: IconRef[] = [
        ...[...m.needs.buildings].reverse().map((id): IconRef => ({ kind: 'building', id })),
        ...[...m.needs.components].reverse().map((id): IconRef => ({ kind: 'component', id })),
        ...[...m.needs.materials].reverse().map((id): IconRef => ({ kind: 'material', id }))
      ];
      const pick = candidates.find((c) => !used.has(`${c.kind}:${c.id}`)) ?? candidates[0];
      if (pick) {
        used.add(`${pick.kind}:${pick.id}`);
        icons.set(m.number, pick);
      }
    }
  }
  return icons.get(number);
}

export interface Opened {
  buildings: Building[];
  components: Component[];
  materials: string[];
  alsoNeeds: boolean;
}

function newMaterials(tags: readonly number[]): string[] {
  const ground = new Set(
    materials.filter((m) => (m.sources ?? []).some((s) => s.body === 'earth')).map((m) => m.id)
  );
  const made = recipes.filter((r) => tags.includes(r.milestone)).flatMap((r) => Object.keys(r.outputs));
  const elsewhere = new Set(
    recipes.filter((r) => !tags.includes(r.milestone)).flatMap((r) => Object.keys(r.outputs))
  );
  return [...new Set(made)].filter((id) => !elsewhere.has(id) && !ground.has(id) && !material(id).unit);
}

export function openedBy(number: number): Opened {
  if (number === 0) {
    return {
      buildings: buildings.filter((b) => tagOpen([], b.milestone)),
      components: shipComponents.filter((c) => tagOpen([], c.milestone)),
      materials: [],
      alsoNeeds: false
    };
  }
  const tags = opensTags(number);
  return {
    buildings: buildings.filter((b) => tags.includes(b.milestone)),
    components: shipComponents.filter((c) => tags.includes(c.milestone)),
    materials: tags.length ? newMaterials(tags) : [],
    alsoNeeds: tags.some((t) => prerequisitesOf(t).length > 1)
  };
}

export const openedCount = (o: Opened): number =>
  o.buildings.length + o.components.length + o.materials.length;

export const openItems = (eco: Economy): number =>
  buildings.filter((b) => isUnlocked(eco, b)).length +
  shipComponents.filter((c) => isUnlocked(eco, c)).length;

const BODY_WORDS: Record<Body, string> = {
  earth: 'Earth',
  moon: 'the Moon',
  mercury: 'Mercury',
  mars: 'Mars',
  venus: 'Venus',
  io: 'Io',
  titan: 'Titan',
  'icy-moon': 'an icy moon',
  comet: 'a comet',
  'asteroid-c': 'a carbonaceous asteroid',
  'asteroid-s': 'a stony asteroid',
  'asteroid-m': 'a metallic asteroid',
  'gas-giant': 'a gas giant',
  'ice-giant': 'an ice giant'
};

const PLACE_WORDS: Record<SitePlace, string> = {
  surface: 'On the surface',
  orbit: 'In orbit',
  point: 'At a jump point'
};

export const worldName = (id: string): string => game.placeName(id) ?? 'an unknown place';
export const regionName = (id: string): string => region(id)?.name ?? 'an unknown region';

const ranName = (id: string): string => {
  const made = recipes.find((r) => r.id === id)?.building ?? id;
  return buildings.find((b) => b.id === made)?.name ?? 'The plant';
};

const amountOf = (id: string, a: number): string => fmt.amount(a, material(id).unit);

export function criterionText(c: Criterion): string {
  switch (c.kind) {
    case 'world':
      return `On ${worldName(c.id)}`;
    case 'body':
      return `On ${BODY_WORDS[c.body]}`;
    case 'place':
      return PLACE_WORDS[c.place];
    case 'region':
      return `In ${regionName(c.id)}`;
    case 'building':
      return `${building(c.id).name} standing`;
    case 'people':
      return `${fmt.group(c.need)} ${c.need === 1 ? 'person' : 'people'}, has ${fmt.group(c.have)}`;
    case 'fed':
      return 'Everyone fed';
    case 'stock':
      return `${amountOf(c.material, c.need)} of ${material(c.material).name} in store, has ${amountOf(c.material, c.have)}`;
    case 'made':
      return `${amountOf(c.material, c.need)} of ${material(c.material).name} made, ${amountOf(c.material, c.have)} so far`;
    case 'ran':
      return `${ranName(c.id)} run ${fmt.duration(c.need * 3600)}, ${fmt.duration(c.have * 3600)} so far`;
    case 'built':
      return `${fmt.group(c.need)} ${c.need === 1 ? 'ship' : 'ships'} built, ${fmt.group(c.have)} so far`;
    case 'flown':
      return `A ship flown on a ${shipComponent(c.id).name}`;
  }
}
