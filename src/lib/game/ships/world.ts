import { economy } from '#lib/game/economy/index.ts';
import { earth, jupiter, mars, moon, solar } from '#lib/game/flight/reference.ts';
import { placeState, resolvePlace, type State } from '#lib/game/flight/system.ts';
import { positionAt } from '#lib/game/flight/index.ts';
import type { FlightBody, FlightSystem, Place, TripOption } from '#lib/game/flight/index.ts';
import type { Game } from '#lib/game/state.svelte.ts';
import type { Vessel, Whereabouts } from './types.ts';

const REFERENCE: Readonly<Record<string, FlightBody>> = {
  earth,
  luna: { ...moon, id: 'luna' },
  mars,
  jupiter
};

const TWO_PI = Math.PI * 2;
const wrap = (a: number): number => ((a % TWO_PI) + TWO_PI) % TWO_PI;

export const FLYABLE: readonly string[] = Object.keys(REFERENCE);

export function flightSystem(game: Game): FlightSystem {
  const bodies = game.world.bodies.flatMap((b): FlightBody[] => {
    const r = REFERENCE[b.id];
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

export function placeOf(w: Whereabouts): Place | undefined {
  if (w.kind === 'orbit') return { kind: 'orbit', body: w.body, angle: w.angle };
  if (w.kind === 'surface') return { kind: 'surface', body: w.body };
  const site = economy.sites.find((s) => s.id === w.site);
  if (!site) return undefined;
  return site.place === 'orbit'
    ? { kind: 'orbit', body: site.worldBody, angle: site.angle }
    : { kind: 'surface', body: site.worldBody };
}

export function bodyOfWhereabouts(w: Whereabouts): string | undefined {
  const p = placeOf(w);
  return p && p.kind !== 'point' ? p.body : undefined;
}

export function stateOf(game: Game, w: Whereabouts, t = game.elapsed): State | undefined {
  const place = placeOf(w);
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
