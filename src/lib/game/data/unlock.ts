import { milestones } from './records.ts';

const byNumber = new Map(milestones.map((m) => [m.number, m]));

export const prerequisitesOf = (tag: number): readonly number[] => byNumber.get(tag)?.requires ?? [];

export const tagOpen = (done: readonly number[], tag: number): boolean =>
  prerequisitesOf(tag).every((r) => done.includes(r));

export const missingPrerequisites = (done: readonly number[], tag: number): number[] =>
  prerequisitesOf(tag).filter((r) => !done.includes(r));

export function ancestorsOf(number: number): Set<number> {
  const out = new Set<number>();
  const walk = (n: number) => {
    for (const r of prerequisitesOf(n)) {
      if (out.has(r)) continue;
      out.add(r);
      walk(r);
    }
  };
  walk(number);
  return out;
}

export const tagsOf = (number: number): Set<number> => new Set([0, number, ...ancestorsOf(number)]);

export const opensTags = (number: number): number[] =>
  milestones.filter((m) => m.requires.includes(number)).map((m) => m.number);

export function depthOf(number: number): number {
  const requires = prerequisitesOf(number);
  return requires.length ? 1 + Math.max(...requires.map(depthOf)) : 0;
}
