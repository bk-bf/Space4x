import { moons, type MoonRecord } from '#lib/game/data/index.ts';
import { hash } from '#lib/gfx/math.ts';
import { smallBodyFacts, smallBodyRadius } from './asteroids';
import type { Body } from './types';
import { AU, KM, orbitRate } from './units';

const kindOf = (m: MoonRecord): string =>
  m.irregular ? 'Irregular moon' : m.type === 'icy' ? 'Icy moon' : 'Moon';

export function moonBody(m: MoonRecord, planetOrbit: number): Body {
  return {
    system: 'sol',
    id: m.id,
    name: m.name,
    type: 'rock',
    radius: smallBodyRadius(m),
    orbit: m.aKm * KM,
    parent: m.planet,
    angle: hash(m.code, 3, 11) * Math.PI * 2,
    angularSpeed: orbitRate(m.period),
    tilt: hash(m.code, 4, 11) * 0.4,
    facts: smallBodyFacts(kindOf(m), m, planetOrbit / AU)
  };
}

export function moonBodies(planets: readonly Body[]): Body[] {
  const orbit = new Map(planets.map((b) => [b.id, b.orbit]));
  return moons.map((m) => moonBody(m, orbit.get(m.planet) ?? AU));
}
