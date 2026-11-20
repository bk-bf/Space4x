import {
  buildings,
  material,
  materials,
  milestones,
  opensTags,
  prerequisitesOf,
  recipes,
  shipComponents,
  tagOpen,
  type Building,
  type Component,
  type Milestone
} from '#lib/game/data/index.ts';
import { isUnlocked, programmeStatus, type Economy, type ProgrammeStatus } from '#lib/game/economy/index.ts';
import type { IconRef } from '#lib/gfx/icons/index.ts';

export interface RequireRow {
  number: number;
  ok: boolean;
}

export interface Check {
  requires: RequireRow[];
  blockers: number;
}

export function checkFor(eco: Economy, m: Milestone): Check {
  const requires = m.requires.map((number) => ({ number, ok: eco.done.includes(number) }));
  return { requires, blockers: requires.filter((r) => !r.ok).length };
}

export const GROUPS = ['running', 'ready', 'locked', 'done'] as const;

export const GROUP_NAMES: Record<ProgrammeStatus, string> = {
  running: 'Running',
  ready: 'Ready to start',
  locked: 'Locked behind prerequisites',
  done: 'Done'
};

export const statusOf = (eco: Economy, m: Milestone): ProgrammeStatus => programmeStatus(eco, m);

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
