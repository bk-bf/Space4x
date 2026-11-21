import { boostKey } from '#lib/game/shipdesign/index.ts';
import { robotStats } from './stats.ts';
import type { RobotDesign, RobotStats } from './types.ts';

const statsCache = new WeakMap<RobotDesign, { key: string; stats: RobotStats }>();

export function robotStatsFor(design: RobotDesign): RobotStats {
  const key = boostKey();
  const hit = statsCache.get(design);
  if (hit && hit.key === key) return hit.stats;
  const stats = robotStats(design);
  statsCache.set(design, { key, stats });
  return stats;
}

export class RobotRegistry {
  saved = $state.raw<readonly RobotDesign[]>([]);
  counter = 0;

  find(id: string): RobotDesign | undefined {
    return this.saved.find((r) => r.id === id);
  }

  newId(): string {
    let id = `robot-${++this.counter}`;
    while (this.find(id)) id = `robot-${++this.counter}`;
    return id;
  }

  replace(next: RobotDesign): void {
    this.saved = this.saved.map((r) => (r.id === next.id ? next : r));
  }

  add(next: RobotDesign): void {
    this.saved = [...this.saved, next];
  }

  remove(id: string): void {
    this.saved = this.saved.filter((r) => r.id !== id);
  }
}

export const robots = new RobotRegistry();

export const robotName = (id: string): string => robots.find(id)?.name ?? 'Unknown robot';

export const robotStatsOf = (id: string): RobotStats | undefined => {
  const d = robots.find(id);
  return d ? robotStatsFor(d) : undefined;
};
