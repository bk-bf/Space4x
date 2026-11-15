import { milestone, milestones, unlockedAt } from '#lib/game/data/index.ts';
import type { Milestone } from '#lib/game/data/index.ts';
import type { Economy } from './types.ts';

export function frontier(done: readonly number[]): number {
  const next = milestones.find((m) => !m.optional && !done.includes(m.number));
  return next ? next.number : milestones.length + 1;
}

export const unlockedUpTo = (eco: Economy): number => frontier(eco.done);

export const isUnlocked = (eco: Economy, item: { milestone: number }): boolean =>
  item.milestone <= unlockedUpTo(eco);

export function opens(number: number): number[] {
  const after = milestones.filter((m) => m.number > number);
  const out: number[] = [];
  for (const m of after) {
    out.push(m.number);
    if (!m.optional) break;
  }
  return out;
}

export function opensRecords(number: number) {
  const lists = opens(number).map(unlockedAt);
  return {
    recipes: lists.flatMap((l) => l.recipes),
    buildings: lists.flatMap((l) => l.buildings),
    components: lists.flatMap((l) => l.components)
  };
}

export const requiresMet = (eco: Economy, m: Milestone): boolean =>
  m.requires.every((r) => eco.done.includes(r));

export const milestoneName = (number: number): string => milestone(number).name;

export const unlockedAfter = (tag: number): number =>
  milestones.filter((m) => !m.optional && m.number < tag).at(-1)?.number ?? 0;
