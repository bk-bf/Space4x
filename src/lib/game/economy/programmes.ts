import { milestone, milestones } from '#lib/game/data/index.ts';
import type { Milestone, Tier } from '#lib/game/data/index.ts';
import type { Economy, Programme, Site } from './types.ts';
import { requiresMet } from './unlocks.ts';

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

export const standing = (site: Site, buildingId: string): number =>
  site.groups.filter((g) => g.building === buildingId).reduce((a, g) => a + g.count, 0);

export type ProgrammeStatus = 'done' | 'running' | 'ready' | 'locked';

export function programmeStatus(eco: Economy, m: Milestone): ProgrammeStatus {
  if (eco.done.includes(m.number)) return 'done';
  if (eco.running.some((p) => p.number === m.number)) return 'running';
  return requiresMet(eco, m) ? 'ready' : 'locked';
}

export function startProgramme(eco: Economy, site: Site, number: number): boolean {
  const m = milestone(number);
  if (programmeStatus(eco, m) !== 'ready') return false;
  eco.running.push({ number, site: site.id, progress: 0 });
  return true;
}

export const runningProgramme = (eco: Economy, number: number): Programme | undefined =>
  eco.running.find((p) => p.number === number);

export const milestoneCount = milestones.length;
