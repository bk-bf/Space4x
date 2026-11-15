import { milestones } from '#lib/game/data/index.ts';

export interface ChainNode {
  number: number;
  col: number;
  row: number;
  requires: readonly number[];
}

function depths(): Map<number, number> {
  const depth = new Map<number, number>();
  for (const m of milestones)
    depth.set(m.number, 1 + Math.max(-1, ...m.requires.map((r) => depth.get(r) ?? 0)));
  return depth;
}

function layout(): { nodes: ChainNode[]; cols: number; rows: number } {
  const depth = depths();
  const byCol = new Map<number, number[]>();
  for (const m of milestones) {
    const c = depth.get(m.number) ?? 0;
    byCol.set(c, [...(byCol.get(c) ?? []), m.number]);
  }
  const rows = Math.max(...[...byCol.values()].map((xs) => xs.length));
  const nodes = milestones.map((m) => {
    const col = depth.get(m.number) ?? 0;
    const peers = byCol.get(col) ?? [];
    const i = peers.indexOf(m.number);
    return { number: m.number, col, row: (i + 0.5) * (rows / peers.length) - 0.5, requires: m.requires };
  });
  return { nodes, cols: byCol.size, rows };
}

export const CHAIN = layout();
