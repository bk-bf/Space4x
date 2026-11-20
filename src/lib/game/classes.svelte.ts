import { boostOf } from './data/index.ts';
import { economy } from './economy/index.ts';
import {
  boostKey,
  designSpec,
  designStats,
  setComponentBoosts,
  type DesignStats,
  type ShipDesign
} from './shipdesign/index.ts';
import type { ShipClass } from './design.ts';
import type { Game } from './state.svelte';
import type { Fleet } from './types';

setComponentBoosts((effect) => boostOf(economy.done, effect));

const statsOf = new WeakMap<ShipDesign, { key: string; stats: DesignStats }>();
const specOf = new WeakMap<ShipDesign, ShipClass>();

export function statsFor(design: ShipDesign): DesignStats {
  const key = boostKey();
  const hit = statsOf.get(design);
  if (hit && hit.key === key) return hit.stats;
  const stats = designStats(design);
  statsOf.set(design, { key, stats });
  return stats;
}

export function specFor(design: ShipDesign): ShipClass {
  let spec = specOf.get(design);
  if (!spec) {
    spec = designSpec(design);
    specOf.set(design, spec);
  }
  return spec;
}

export class ClassRegistry {
  saved = $state.raw<readonly ShipDesign[]>([]);
  counter = 0;

  find(id: string): ShipDesign | undefined {
    return this.saved.find((c) => c.id === id);
  }

  newId(): string {
    let id = `design-${++this.counter}`;
    while (this.find(id)) id = `design-${++this.counter}`;
    return id;
  }

  replace(next: ShipDesign): void {
    this.saved = this.saved.map((c) => (c.id === next.id ? next : c));
  }

  add(next: ShipDesign): void {
    this.saved = [...this.saved, next];
  }

  remove(id: string): void {
    this.saved = this.saved.filter((c) => c.id !== id);
  }
}

export const classes = new ClassRegistry();

export const shipClasses = (): readonly ShipDesign[] => classes.saved;

export const shipClass = (id: string): ShipClass | undefined => {
  const design = classes.find(id);
  return design ? specFor(design) : undefined;
};

export const className = (id: string): string => classes.find(id)?.name ?? 'Unknown class';

export const classStats = (id: string): DesignStats | undefined => {
  const design = classes.find(id);
  return design ? statsFor(design) : undefined;
};

export const fleetClassId = (f: Fleet): string | undefined => f.ships[0]?.classId;

type Use = (classId: string) => boolean;

let uses: readonly Use[] = [];

export function registerClassUse(use: Use): () => void {
  uses = [...uses, use];
  return () => {
    uses = uses.filter((u) => u !== use);
  };
}

export const classInUse = (game: Game, id: string): boolean =>
  game.world.fleets.some((f) => f.ships.some((s) => s.classId === id)) || uses.some((use) => use(id));
