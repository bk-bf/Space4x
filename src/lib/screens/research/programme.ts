import {
  buildings,
  material,
  materials,
  milestones,
  recipes,
  shipComponent,
  shipComponents,
  type Building,
  type Component,
  type Milestone
} from '#lib/game/data/index.ts';
import {
  isUnlocked,
  opens,
  programmeBill,
  programmeStatus,
  siteNeedMissing,
  siteNeedProgress,
  standsAnywhere,
  unlockedUpTo,
  type Economy,
  type ProgrammeStatus,
  type Site
} from '#lib/game/economy/index.ts';
import type { IconRef } from '#lib/gfx/icons/index.ts';

export interface BillRow {
  id: string;
  have: number;
  need: number;
  ok: boolean;
}

export interface StandRow {
  kind: 'building' | 'component';
  id: string;
  ok: boolean;
  builder?: string;
}

export interface SiteRow {
  label: string;
  ok: boolean;
  progress?: number;
}

export interface RequireRow {
  number: number;
  ok: boolean;
}

export interface Check {
  requires: RequireRow[];
  earlierDone: boolean;
  frontier: number;
  bill: BillRow[];
  stand: StandRow[];
  sites: SiteRow[];
  blockers: number;
}

export function checkFor(eco: Economy, site: Site, m: Milestone): Check {
  const frontier = unlockedUpTo(eco);
  const bill = Object.entries(programmeBill(m)).map(([id, need]) => {
    const have = site.stock[id] ?? 0;
    return { id, have, need, ok: have >= need };
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
    return {
      label: need.label.replace(/^No /, '').replace(/^./, (c) => c.toUpperCase()),
      ok: siteNeedMissing(eco, need) === undefined,
      ...(progress === undefined ? {} : { progress })
    };
  });
  const requires = m.requires.map((number) => ({ number, ok: eco.done.includes(number) }));
  const earlierDone = m.number <= frontier;
  const blockers =
    requires.filter((r) => !r.ok).length +
    (earlierDone ? 0 : 1) +
    stand.filter((s) => !s.ok).length +
    sites.filter((s) => !s.ok).length +
    bill.filter((b) => !b.ok).length;
  return { requires, earlierDone, frontier, bill, stand, sites, blockers };
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
  locked: 'Locked behind earlier milestones',
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
}

const KEPT_AT_START = 1;

function newMaterials(tags: readonly number[]): string[] {
  const lowest = Math.min(...tags);
  const earlier = new Set(recipes.filter((r) => r.milestone < lowest).flatMap((r) => Object.keys(r.outputs)));
  const ground = new Set(
    materials.filter((m) => (m.sources ?? []).some((s) => s.body === 'earth')).map((m) => m.id)
  );
  const made = recipes.filter((r) => tags.includes(r.milestone)).flatMap((r) => Object.keys(r.outputs));
  return [...new Set(made)].filter((id) => !earlier.has(id) && !ground.has(id) && !material(id).unit);
}

export function openedBy(number: number): Opened {
  const tags = number === 0 ? [] : opens(number);
  if (number === 0) {
    return {
      buildings: buildings.filter((b) => b.milestone <= KEPT_AT_START),
      components: shipComponents.filter((c) => c.milestone <= KEPT_AT_START),
      materials: []
    };
  }
  return {
    buildings: buildings.filter((b) => tags.includes(b.milestone)),
    components: shipComponents.filter((c) => tags.includes(c.milestone)),
    materials: tags.length ? newMaterials(tags) : []
  };
}

export const openedCount = (o: Opened): number =>
  o.buildings.length + o.components.length + o.materials.length;

export const openItems = (eco: Economy): number =>
  buildings.filter((b) => isUnlocked(eco, b)).length +
  shipComponents.filter((c) => isUnlocked(eco, c)).length;
