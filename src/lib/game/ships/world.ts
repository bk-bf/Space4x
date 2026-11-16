import { economy, type Site } from '#lib/game/economy/index.ts';
import { asteroidGm, asteroidRadius } from '#lib/game/asteroids.ts';
import { asteroidRecord, asteroids } from '#lib/game/data/index.ts';
import {
  callisto,
  earth,
  enceladus,
  europa,
  ganymede,
  io,
  jupiter,
  mars,
  mercury,
  moon,
  neptune,
  saturn,
  solar,
  titan,
  uranus,
  venus
} from '#lib/game/flight/reference.ts';
import { placeState, resolvePlace, type State } from '#lib/game/flight/system.ts';
import { positionAt } from '#lib/game/flight/index.ts';
import type { FlightBody, FlightSystem, Place, TripOption } from '#lib/game/flight/index.ts';
import { mockSystems } from '#lib/game/mock/starSystems.ts';
import type { Game } from '#lib/game/state.svelte.ts';
import type { Vessel, Whereabouts } from './types.ts';

const REFERENCE: Readonly<Record<string, FlightBody>> = {
  earth,
  luna: { ...moon, id: 'luna' },
  mercury,
  venus,
  mars,
  jupiter,
  saturn,
  uranus,
  neptune,
  io,
  europa,
  ganymede,
  callisto,
  titan,
  enceladus
};

export const NO_SURFACE: readonly string[] = ['venus', 'jupiter', 'saturn', 'uranus', 'neptune'];
const SMALL_BODY_ORBIT_M = 100e3;

function asteroidFlightBody(id: string): FlightBody | undefined {
  const a = asteroidRecord(id);
  if (!a) return undefined;
  const radius = asteroidRadius(a);
  return {
    id,
    gm: asteroidGm(a),
    radius,
    orbit: 0,
    angle: 0,
    angularSpeed: 0,
    lowOrbitAltitude: Math.min(SMALL_BODY_ORBIT_M, radius)
  };
}

const referenceOf = (id: string): FlightBody | undefined => REFERENCE[id] ?? asteroidFlightBody(id);

const TWO_PI = Math.PI * 2;
const wrap = (a: number): number => ((a % TWO_PI) + TWO_PI) % TWO_PI;

export const FLYABLE: readonly string[] = [...Object.keys(REFERENCE), ...asteroids.map((a) => a.id)];

export const LANDABLE: readonly string[] = FLYABLE.filter((id) => !NO_SURFACE.includes(id));

export function flightSystem(game: Game): FlightSystem {
  const bodies = game.world.bodies.flatMap((b): FlightBody[] => {
    const r = referenceOf(b.id);
    if (!r) return [];
    const base: FlightBody = { ...r };
    delete base.parent;
    return [
      {
        ...base,
        ...(b.parent ? { parent: b.parent } : {}),
        orbit: b.orbit,
        angularSpeed: b.angularSpeed,
        angle: wrap(b.angle - b.angularSpeed * game.elapsed)
      }
    ];
  });
  return { star: solar.star, bodies };
}

export const flightBody = (game: Game, id: string): FlightBody | undefined =>
  flightSystem(game).bodies.find((b) => b.id === id);

export const isPlatform = (s: Site): boolean => s.place === 'surface' && NO_SURFACE.includes(s.worldBody);

export const hangsInOrbit = (s: Site): boolean => s.place === 'orbit' || isPlatform(s);

export function jumpPlace(game: Game, id: string): Place | undefined {
  const point = game.jump(id)?.point;
  if (!point) return undefined;
  return {
    kind: 'point',
    id,
    orbit: Math.hypot(point.x, point.y),
    angle: Math.atan2(point.y, point.x),
    angularSpeed: 0
  };
}

const JUMP_IDS = new Set(mockSystems().flatMap((s) => s.jumps.map((j) => j.id)));

export const isJump = (id: string): boolean => JUMP_IDS.has(id);

export function placeOf(game: Game, w: Whereabouts): Place | undefined {
  if (w.kind === 'orbit')
    return isJump(w.body) ? jumpPlace(game, w.body) : { kind: 'orbit', body: w.body, angle: w.angle };
  if (w.kind === 'surface') return { kind: 'surface', body: w.body };
  const site = economy.sites.find((s) => s.id === w.site);
  if (!site) return undefined;
  if (site.place === 'point') return jumpPlace(game, site.worldBody);
  return hangsInOrbit(site)
    ? { kind: 'orbit', body: site.worldBody, angle: site.angle }
    : { kind: 'surface', body: site.worldBody };
}

export function bodyOfWhereabouts(w: Whereabouts): string | undefined {
  if (w.kind === 'orbit' || w.kind === 'surface') return w.body;
  const site = economy.sites.find((s) => s.id === w.site);
  return site && site.place !== 'point' ? site.worldBody : undefined;
}

export function stateOf(game: Game, w: Whereabouts, t = game.elapsed): State | undefined {
  const place = placeOf(game, w);
  if (!place) return undefined;
  const system = flightSystem(game);
  const e = resolvePlace(system, place);
  return e ? placeState(system, e, t) : undefined;
}

const options = new Map<string, TripOption>();

export const tripOptionOf = (id: string): TripOption | undefined => options.get(id);
export const setTripOption = (id: string, option: TripOption): void => void options.set(id, option);
export const clearTripOption = (id: string): void => void options.delete(id);

export function vesselState(game: Game, v: Vessel, t = game.elapsed): State | undefined {
  if (v.trip) {
    const option = options.get(v.id);
    if (option) {
      const s = positionAt(option, t);
      return { pos: s.pos, vel: s.vel };
    }
  }
  return stateOf(game, v.at, t);
}
