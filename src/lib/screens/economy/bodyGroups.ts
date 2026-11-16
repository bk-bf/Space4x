import { asteroidRecord, cometRecord } from '#lib/game/data/index.ts';
import { GROUPS, groupOf } from '#lib/game/asteroids.ts';
import type { Game } from '#lib/game/index.ts';

export interface BodyGroup {
  group: string;
  rank: number;
}

const PLANETS = 2;
const MOONS = 3;
const DWARFS = 4;
const ASTEROIDS = 5;
const COMETS = ASTEROIDS + GROUPS.length;

export function bodyGrouper(game: Game): (id: string) => BodyGroup {
  const bodies = new Map(game.world.bodies.map((b) => [b.id, b]));
  return (id) => {
    const b = bodies.get(id),
      parent = b?.parent ? bodies.get(b.parent) : undefined;
    if (parent) return { group: `Moons of ${parent.name}`, rank: MOONS + parent.orbit / 1e15 };
    const a = asteroidRecord(id);
    if (a?.dwarf) return { group: 'Dwarf planets', rank: DWARFS };
    if (a) return { group: `${groupOf(a)} asteroids`, rank: ASTEROIDS + GROUPS.indexOf(groupOf(a)) };
    if (cometRecord(id)) return { group: 'Comets', rank: COMETS };
    return { group: 'Planets', rank: PLANETS };
  };
}

export function orderedGroups(entries: readonly BodyGroup[]): string[] {
  const rank = new Map<string, number>();
  for (const e of entries) rank.set(e.group, Math.min(rank.get(e.group) ?? Infinity, e.rank));
  return [...rank].sort((p, q) => p[1] - q[1]).map(([group]) => group);
}
