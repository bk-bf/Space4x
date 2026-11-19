import { game, type Game } from '#lib/game/index.ts';
import type { StarSystem } from './stars.ts';

export interface SystemCounts {
  bodies: number | null;
  colonies: number | null;
  fleets: number | null;
}

const UNKNOWN: SystemCounts = { bodies: null, colonies: null, fleets: null };

export function systemCounts(s: StarSystem, g: Game = game): SystemCounts {
  if (!g.starSystem(s.id)) return s.counts ?? UNKNOWN;
  const bodies = g.world.bodies.filter((b) => b.system === s.id);
  return {
    bodies: bodies.length,
    colonies: bodies.filter((b) => b.colony).length,
    fleets: g.world.fleets.filter((f) => f.system === s.id).length
  };
}

export function jumpSummary(s: StarSystem, g: Game = game): string {
  const system = g.starSystem(s.id);
  if (!system) return 'Unknown';
  const total = system.jumps.length;
  const unsurveyed = system.jumps.filter((j) => !j.surveyed).length;
  const stable = system.jumps.filter((j) => j.stable).length;
  const parts = [String(total)];
  if (unsurveyed) parts.push(unsurveyed === total ? 'unsurveyed' : `${unsurveyed} unsurveyed`);
  if (stable) parts.push(stable === total ? 'stable' : `${stable} stable`);
  return parts.join(', ');
}
