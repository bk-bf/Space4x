import {
  buildings,
  material,
  materials,
  project,
  recipes,
  shipComponents,
  subjects,
  tagOpen,
  unlockedAt,
  type Building,
  type Component,
  type Effect,
  type Project
} from '#lib/game/data/index.ts';
import {
  leading,
  programmeStatus,
  queueOf,
  type Economy,
  type ProgrammeStatus,
  type Scientist
} from '#lib/game/economy/index.ts';
import { START_TIME } from '#lib/game/clock.ts';
import type { PortraitSpec } from '#lib/gfx/portraits/index.ts';

export interface RequireRow {
  number: number;
  ok: boolean;
}

export interface Check {
  requires: RequireRow[];
  blockers: number;
}

export function checkFor(eco: Economy, p: Project): Check {
  const requires = p.requires.map((number) => ({ number, ok: eco.done.includes(number) }));
  return { requires, blockers: requires.filter((r) => !r.ok).length };
}

export const GROUPS = ['running', 'queued', 'waiting', 'ready', 'locked', 'done'] as const;

export const GROUP_NAMES: Record<ProgrammeStatus, string> = {
  running: 'Running',
  queued: 'Queued',
  waiting: 'Waiting',
  ready: 'Ready to start',
  locked: 'Locked behind prerequisites',
  done: 'Researched'
};

export const STATUS_LABEL: Record<ProgrammeStatus, string> = {
  running: 'running',
  queued: 'queued',
  waiting: 'waiting',
  ready: 'ready',
  locked: 'locked',
  done: 'researched'
};

export const statusOf = (eco: Economy, p: Project): ProgrammeStatus => programmeStatus(eco, p);

export const subjectName = (id: string): string => subjects.find((s) => s.id === id)?.name ?? id;

export const EFFECT_NAMES: Record<Effect, string> = {
  booster_thrust: 'booster thrust',
  booster_load: 'booster propellant',
  shipyard_points: 'shipyard points',
  build_speed: 'build speed',
  extraction: 'mine output',
  research: 'research points a lab',
  chip_output: 'output a semiconductor fab',
  data_centre_compute: 'compute a data centre',
  solar_array_output: 'solar array output',
  battery_storage: 'battery storage',
  electrolysis_power: 'power a kilogram of hydrogen'
};

export const effectLines = (p: Project): string[] =>
  Object.entries(p.effects ?? {}).map(([k, v]) => `×${v} ${EFFECT_NAMES[k as Effect]}`);

export interface Opened {
  buildings: Building[];
  components: Component[];
  materials: string[];
}

function newMaterials(tag: number): string[] {
  const ground = new Set(
    materials.filter((m) => (m.sources ?? []).some((s) => s.body === 'earth')).map((m) => m.id)
  );
  const made = recipes.filter((r) => r.research === tag).flatMap((r) => Object.keys(r.outputs));
  const elsewhere = new Set(recipes.filter((r) => r.research !== tag).flatMap((r) => Object.keys(r.outputs)));
  return [...new Set(made)].filter((id) => !elsewhere.has(id) && !ground.has(id) && !material(id).unit);
}

export function openedBy(number: number): Opened {
  if (number === 0)
    return {
      buildings: buildings.filter((b) => tagOpen([], b.research)),
      components: shipComponents.filter((c) => tagOpen([], c.research)),
      materials: []
    };
  const u = unlockedAt(number);
  return { buildings: u.buildings, components: u.components, materials: newMaterials(number) };
}

export const openedCount = (o: Opened): number =>
  o.buildings.length + o.components.length + o.materials.length;

const yearOf = (ms: number): number => new Date(ms).getUTCFullYear();

export const scientistFace = (s: Scientist, now: number): PortraitSpec => ({
  seed: s.seed,
  age: yearOf(now) - s.born,
  rank: 1,
  branch: 'staff',
  gender: s.gender,
  rolledAt: { age: yearOf(START_TIME) - s.born, rank: 1 }
});

export function doing(eco: Economy, s: Scientist): string {
  const p = leading(eco, s.id);
  const q = queueOf(eco, s.id).length;
  return p ? `${project(p.number).name}${q ? ` +${q}` : ''}` : 'unassigned';
}

export const pct = (v: number): string => `+${Math.round(v * 100)}%`;
