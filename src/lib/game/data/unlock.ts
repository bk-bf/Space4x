import { projects } from './records.ts';
import type { Effect } from './types.ts';

const byNumber = new Map(projects.map((p) => [p.number, p]));

export const prerequisitesOf = (number: number): readonly number[] => byNumber.get(number)?.requires ?? [];

export const tagOpen = (done: readonly number[], tag: number): boolean => tag === 0 || done.includes(tag);

export const requiresDone = (done: readonly number[], number: number): boolean =>
  prerequisitesOf(number).every((r) => done.includes(r));

export const missingPrerequisites = (done: readonly number[], number: number): number[] =>
  prerequisitesOf(number).filter((r) => !done.includes(r));

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

export const dependentsOf = (number: number): number[] =>
  projects.filter((p) => p.requires.includes(number)).map((p) => p.number);

export function depthOf(number: number): number {
  const requires = prerequisitesOf(number);
  return requires.length ? 1 + Math.max(...requires.map(depthOf)) : 0;
}

const levels = new Map<Effect, { number: number; factor: number }[]>();
for (const p of [...projects].sort((a, b) => b.number - a.number))
  for (const [effect, factor] of Object.entries(p.effects ?? {}) as [Effect, number][]) {
    const list = levels.get(effect) ?? [];
    list.push({ number: p.number, factor });
    levels.set(effect, list);
  }

export function boostOf(done: readonly number[], effect: Effect): number {
  if (!done.length) return 1;
  return levels.get(effect)?.find((l) => done.includes(l.number))?.factor ?? 1;
}
