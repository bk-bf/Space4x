import { game } from '#lib/game/index.ts';
import type { StarSystem } from './stars.ts';

export interface SystemCounts {
  bodies: number | null;
  colonies: number | null;
  fleets: number | null;
}

const UNKNOWN: SystemCounts = { bodies: null, colonies: null, fleets: null };

export function systemCounts(s: StarSystem): SystemCounts {
  if (!game.starSystem(s.id)) return s.counts ?? UNKNOWN;
  const bodies = game.world.bodies.filter((b) => b.system === s.id);
  return {
    bodies: bodies.length,
    colonies: bodies.filter((b) => b.colony).length,
    fleets: game.world.fleets.filter((f) => f.system === s.id).length
  };
}
