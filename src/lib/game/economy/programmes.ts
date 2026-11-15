import { building, material, milestone, milestones, shipComponent } from '#lib/game/data/index.ts';
import type { Amounts, Milestone, Tier } from '#lib/game/data/index.ts';
import type { Economy, Programme, Site } from './types.ts';
import { requiresMet, unlockedUpTo } from './unlocks.ts';

export const PROGRAMME_MATERIAL_KG = 50_000;
export const PROGRAMME_BASE_DAYS = 60;
export const PROGRAMME_DAYS_PER_STEP = 30;
export const PROGRAMME_COMPUTE_FROM = 6;
export const PROGRAMME_COMPUTE_PER_STEP = 1000;
export const programmeEstimated = true;

const TIER_FACTOR: Record<Tier, number> = { P: 1, E: 1.25, S: 1.5 };

export const programmeDays = (m: Milestone): number =>
  (PROGRAMME_BASE_DAYS + PROGRAMME_DAYS_PER_STEP * (m.number - 1)) * TIER_FACTOR[m.tier];

export const programmeCompute = (m: Milestone): number =>
  m.number < PROGRAMME_COMPUTE_FROM
    ? 0
    : PROGRAMME_COMPUTE_PER_STEP * (m.number - PROGRAMME_COMPUTE_FROM + 1) * TIER_FACTOR[m.tier];

const add = (into: Amounts, from: Amounts, times = 1) => {
  for (const [k, v] of Object.entries(from)) into[k] = (into[k] ?? 0) + v * times;
};

export function programmeBill(m: Milestone): Amounts {
  const bill: Amounts = {};
  for (const id of m.needs.materials) {
    const unit = material(id).unit;
    if (!unit) bill[id] = (bill[id] ?? 0) + PROGRAMME_MATERIAL_KG * m.number;
    else if (unit === 'model') bill[id] = (bill[id] ?? 0) + 1;
  }
  for (const id of m.needs.components) add(bill, shipComponent(id).cost);
  delete bill.compute;
  return bill;
}

export type Missing =
  | { kind: 'requires'; number: number }
  | { kind: 'locked' }
  | { kind: 'building'; id: string }
  | { kind: 'builder'; id: string }
  | { kind: 'material'; id: string; have: number; need: number };

export const standing = (site: Site, buildingId: string): number =>
  site.groups.filter((g) => g.building === buildingId).reduce((a, g) => a + g.count, 0);

export function missingFor(eco: Economy, site: Site, m: Milestone): Missing[] {
  const out: Missing[] = [];
  for (const r of m.requires) if (!eco.done.includes(r)) out.push({ kind: 'requires', number: r });
  if (m.number > unlockedUpTo(eco)) out.push({ kind: 'locked' });
  for (const id of m.needs.buildings) if (standing(site, id) <= 0) out.push({ kind: 'building', id });
  for (const id of m.needs.components) {
    const c = shipComponent(id);
    if (!c.builtAt.some((b) => standing(site, b) > 0)) out.push({ kind: 'builder', id: c.builtAt[0] ?? id });
  }
  for (const [id, need] of Object.entries(programmeBill(m))) {
    const have = site.stock[id] ?? 0;
    if (have < need) out.push({ kind: 'material', id, have, need });
  }
  return out;
}

export type ProgrammeStatus = 'done' | 'running' | 'ready' | 'waiting' | 'locked';

export function programmeStatus(eco: Economy, site: Site, m: Milestone): ProgrammeStatus {
  if (eco.done.includes(m.number)) return 'done';
  if (eco.running.some((p) => p.number === m.number)) return 'running';
  if (!requiresMet(eco, m)) return 'locked';
  return missingFor(eco, site, m).length ? 'waiting' : 'ready';
}

export function startProgramme(eco: Economy, site: Site, number: number): boolean {
  const m = milestone(number);
  if (programmeStatus(eco, site, m) !== 'ready') return false;
  for (const [id, need] of Object.entries(programmeBill(m))) {
    site.stock[id] = (site.stock[id] ?? 0) - need;
    if (!material(id).unit) eco.ledger.spent += need;
  }
  eco.running.push({ number, site: site.id, progress: 0 });
  return true;
}

export const runningProgramme = (eco: Economy, number: number): Programme | undefined =>
  eco.running.find((p) => p.number === number);

export const describeMissing = (x: Missing): string => {
  if (x.kind === 'requires') return `Needs ${milestone(x.number).name}`;
  if (x.kind === 'locked') return 'Needs every earlier milestone';
  if (x.kind === 'building') return `No ${building(x.id).name}`;
  if (x.kind === 'builder') return `No ${building(x.id).name} to build parts`;
  return `${material(x.id).name} short`;
};

export const milestoneCount = milestones.length;
