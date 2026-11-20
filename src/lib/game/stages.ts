import { ancestorsOf, building, materials, recipesProducing, shipComponent } from './data/index.ts';
import stageRecords from './playStages.json';

export interface Stage {
  number: number;
  name: string;
  optional?: boolean;
  requires: number[];
  needs: { materials: string[]; buildings: string[]; components: string[] };
}

export const stages = stageRecords as Stage[];

export function stage(number: number): Stage {
  const found = stages.find((s) => s.number === number);
  if (!found) throw new Error(`unknown stage: ${number}`);
  return found;
}

const open = (tags: number[]): number[] => tags.filter((t) => t > 0);

function materialTags(id: string): number[] {
  const m = materials.find((x) => x.id === id);
  const ways = [
    ...(m?.sources ?? []).map((s) => open([building(s.building).research])),
    ...recipesProducing(id).map((r) => open([r.research, building(r.building).research]))
  ];
  return ways.sort((a, b) => Math.max(0, ...a) - Math.max(0, ...b))[0] ?? [];
}

export function ownProjects(s: Stage): number[] {
  const tags = new Set<number>([
    ...s.needs.buildings.flatMap((id) => open([building(id).research])),
    ...s.needs.components.flatMap((id) => {
      const c = shipComponent(id);
      return open([c.research, ...c.builtAt.slice(0, 1).map((b) => building(b).research)]);
    }),
    ...s.needs.materials.flatMap(materialTags)
  ]);
  for (const t of [...tags]) for (const a of ancestorsOf(t)) tags.add(a);
  return [...tags].sort((a, b) => a - b);
}

export function stageProjects(upTo: number): number[] {
  const tags = new Set<number>();
  for (const s of stages) if (s.number <= upTo && !s.optional) for (const t of ownProjects(s)) tags.add(t);
  return [...tags].sort((a, b) => a - b);
}
