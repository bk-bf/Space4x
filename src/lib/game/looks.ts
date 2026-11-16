import { asteroidRecord, moonRecord, type MoonRecord } from '#lib/game/data/index.ts';
import { lookById, familyId, NAMED_LOOKS } from '#lib/gfx/bodies/looks/index.ts';
import type { FamilyKind } from '#lib/gfx/bodies/looks/families.ts';
import type { Look } from '#lib/gfx/bodies/looks/types.ts';
import { RAD } from '#lib/gfx/bodies/looks/math.ts';
import type { SphereState } from '#lib/gfx/bodies/sphere.ts';
import type { PlanetType } from '#lib/gfx/planets.ts';
import { stringHash } from './asteroids';
import type { Body } from './types';

const DARK_INNER_PLANETS: ReadonlySet<string> = new Set(['jupiter', 'uranus', 'neptune']);
const DARK_INNER_BELOW_KM = 500;
const GENERIC_ROCK = familyId('rock', 1);

const NAMED: ReadonlySet<string> = new Set(NAMED_LOOKS);

const OF_TYPE: Readonly<Record<PlanetType, string>> = {
  terran: 'earth',
  mars: 'mars',
  venus: 'venus',
  gas: 'jupiter',
  saturn: 'saturn',
  ice: 'uranus',
  ice2: 'neptune',
  rock: GENERIC_ROCK
};

export function moonFamily(m: MoonRecord): FamilyKind {
  if (m.irregular) return 'captured';
  if (m.type === 'carbonaceous') return 'rock';
  return DARK_INNER_PLANETS.has(m.planet) && m.diameter < DARK_INNER_BELOW_KM ? 'rock' : 'ice';
}

export function lookIdOf(body: Body): string {
  if (NAMED.has(body.id)) return body.id;
  const moon = moonRecord(body.id);
  if (moon) return familyId(moonFamily(moon), moon.code);
  const rec = asteroidRecord(body.id);
  if (rec?.dwarf) return familyId('ice', stringHash(rec.id) % 1000, true);
  return OF_TYPE[body.type];
}

export const lookOf = (body: Body): Look => lookById(lookIdOf(body)) ?? lookById(GENERIC_ROCK)!;

export const staticRot = (look: Look, legacy: number): number =>
  look.facing === undefined ? legacy : look.facing * RAD;

export const sphereState = (body: Body, look: Look, rot: number, lights?: boolean): SphereState => ({
  rot,
  tilt: look.tilt ?? body.tilt,
  pitch: look.pitch,
  lights
});
