import { SPECS } from '#lib/gfx/ships/specs.ts';
import { asClass, designStats, type DesignStats, type ShipClass } from './design';
import type { Game } from './state.svelte';
import type { Fleet, YardKind } from './types';

export interface ClassBuild {
  tons: number;
  bp: number;
  kind: YardKind;
}

export const TONS_PER_MASS = 4;
export const BP_PER_MASS = 0.5;
export const BP_PER_WEAPON = 250;
export const BP_PER_ARMOUR = 2;
export const WARSHIP_WEAPONS = 2;

export function weaponCount(stats: DesignStats): number {
  const w = stats.weapons;
  return w.turrets + w.launchers + w.pods + w.spinal + w.hangars;
}

export function buildOf(stats: DesignStats): ClassBuild {
  const bp = stats.mass * BP_PER_MASS + weaponCount(stats) * BP_PER_WEAPON + stats.armour * BP_PER_ARMOUR;
  return {
    tons: Math.round(stats.mass * TONS_PER_MASS),
    bp: Math.max(10, Math.round(bp / 10) * 10),
    kind: weaponCount(stats) >= WARSHIP_WEAPONS ? 'naval' : 'commercial'
  };
}

const statsOf = new WeakMap<ShipClass, DesignStats>();

export function statsFor(cls: ShipClass): DesignStats {
  let stats = statsOf.get(cls);
  if (!stats) {
    stats = designStats(cls);
    statsOf.set(cls, stats);
  }
  return stats;
}

export class ClassRegistry {
  saved = $state.raw<readonly ShipClass[]>(SPECS.map((s) => asClass(s)));
  private counter = 0;

  find(id: string): ShipClass | undefined {
    return this.saved.find((c) => c.id === id);
  }

  newId(): string {
    return `custom-${++this.counter}`;
  }

  replace(next: ShipClass): void {
    this.saved = this.saved.map((c) => (c.id === next.id ? next : c));
  }

  add(next: ShipClass): void {
    this.saved = [...this.saved, next];
  }

  remove(id: string): void {
    this.saved = this.saved.filter((c) => c.id !== id);
  }
}

export const classes = new ClassRegistry();

export const shipClasses = (): readonly ShipClass[] => classes.saved;

export const shipClass = (id: string): ShipClass | undefined => classes.find(id);

export const className = (id: string): string => shipClass(id)?.name ?? 'Unknown class';

export const classStats = (id: string): DesignStats | undefined => {
  const cls = shipClass(id);
  return cls ? statsFor(cls) : undefined;
};

export const classBuild = (id: string): ClassBuild | undefined => {
  const stats = classStats(id);
  return stats ? buildOf(stats) : undefined;
};

export const fleetClassId = (f: Fleet): string | undefined => f.ships[0]?.classId;

export function fleetSpeed(f: Fleet): number {
  const speeds = f.ships.map((s) => classStats(s.classId)?.speed ?? 0);
  return speeds.length ? Math.min(...speeds) : 0;
}

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
