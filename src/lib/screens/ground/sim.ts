import { DAY } from '#lib/game/clock.ts';
import { KINDS, PLACE_SUPPLY, STANCE_MORALE, STANCE_USE, type Formation, type Unit } from './model.ts';

export const MORALE_PULL_PER_DAY = 0.08;
export const STARVING_BELOW = 15;
export const DEMORALISED_BELOW = 20;
export const RECOVERY_PER_DAY = 0.25;
export const ATTRITION_PER_DAY = 0.8;
const MAX_SUBSTEPS = 120;

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

export function moraleTarget(u: Pick<Unit, 'supply' | 'stance'>): number {
  const shortage = Math.max(0, DEMORALISED_BELOW - u.supply) * 1.2;
  return clamp(55 + u.supply * 0.35 + STANCE_MORALE[u.stance] - shortage);
}

export const supplyDrift = (u: Pick<Unit, 'kind' | 'stance'>, intake: number): number =>
  intake - KINDS[u.kind].supplyUse * STANCE_USE[u.stance];

export function stepUnit(u: Unit, intake: number, days: number): void {
  const supply = clamp(u.supply + supplyDrift(u, intake) * days);
  u.supply = supply;
  u.morale += (moraleTarget(u) - u.morale) * (1 - Math.exp(-MORALE_PULL_PER_DAY * days));
  if (supply < STARVING_BELOW)
    u.strength = clamp(u.strength - ((STARVING_BELOW - supply) / STARVING_BELOW) * ATTRITION_PER_DAY * days);
  else if (supply >= 50 && u.morale >= 50 && u.stance !== 'Advance')
    u.strength = clamp(u.strength + RECOVERY_PER_DAY * days);
}

export function advanceGround(
  units: readonly Unit[],
  formations: readonly Formation[],
  seconds: number
): void {
  const days = seconds / DAY;
  if (!(days > 0)) return;
  const steps = Math.min(MAX_SUBSTEPS, Math.max(1, Math.ceil(days)));
  const share = days / steps;
  const intake = new Map(formations.map((f) => [f.id, PLACE_SUPPLY[f.place] ?? 0]));
  for (let i = 0; i < steps; i++) for (const u of units) stepUnit(u, intake.get(u.formation) ?? 0, share);
}
