import {
  milestone,
  missingPrerequisites,
  opensTags,
  shortName,
  tagOpen,
  unlockedAt
} from '#lib/game/data/index.ts';
import type { Milestone } from '#lib/game/data/index.ts';
import type { Economy } from './types.ts';

export const isUnlocked = (eco: Economy, item: { milestone: number }): boolean =>
  tagOpen(eco.done, item.milestone);

export const unlockedTag = (eco: Economy) => (tag: number) => tagOpen(eco.done, tag);

export const waitingOn = (eco: Economy, tag: number): string[] =>
  missingPrerequisites(eco.done, tag).map(shortName);

export function opensRecords(number: number) {
  const lists = opensTags(number).map(unlockedAt);
  return {
    recipes: lists.flatMap((l) => l.recipes),
    buildings: lists.flatMap((l) => l.buildings),
    components: lists.flatMap((l) => l.components)
  };
}

export const requiresMet = (eco: Economy, m: Milestone): boolean =>
  m.requires.every((r) => eco.done.includes(r));

export const milestoneName = (number: number): string => milestone(number).name;
