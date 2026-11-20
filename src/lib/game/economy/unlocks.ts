import { missingPrerequisites, project, tagOpen } from '#lib/game/data/index.ts';
import type { Economy } from './types.ts';

export const isUnlocked = (eco: Economy, item: { research: number }): boolean =>
  tagOpen(eco.done, item.research);

export const unlockedTag = (eco: Economy) => (tag: number) => tagOpen(eco.done, tag);

export const waitingOn = (eco: Economy, tag: number): string[] =>
  tagOpen(eco.done, tag) ? [] : [project(tag).name];

export const prerequisitesLeft = (eco: Economy, number: number): string[] =>
  missingPrerequisites(eco.done, number).map((n) => project(n).name);
