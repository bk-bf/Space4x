import { add, polar, type V2 } from './vec.ts';
import { lowOrbitRadius } from './wells.ts';
import type { FlightBody, FlightSystem, Place } from './types.ts';

export const STAR = 'star';

export interface State {
  pos: V2;
  vel: V2;
}

const indexes = new WeakMap<readonly FlightBody[], Map<string, FlightBody>>();

export function bodyOf(system: FlightSystem, id: string): FlightBody | undefined {
  let index = indexes.get(system.bodies);
  if (!index || index.size !== system.bodies.length) {
    index = new Map(system.bodies.map((b) => [b.id, b]));
    indexes.set(system.bodies, index);
  }
  return index.get(id);
}

export const gmOfPrimary = (system: FlightSystem, id: string): number =>
  id === STAR ? system.star.gm : (bodyOf(system, id)?.gm ?? NaN);

export const primaryOf = (b: FlightBody): string => b.parent ?? STAR;

export function localState(b: FlightBody, t: number): State {
  const a = b.angle + b.angularSpeed * t;
  const [x, y] = polar(b.orbit, a);
  const s = b.orbit * b.angularSpeed;
  return { pos: [x, y], vel: [-s * Math.sin(a), s * Math.cos(a)] };
}

export function absoluteState(system: FlightSystem, id: string, t: number): State {
  if (id === STAR) return { pos: [0, 0], vel: [0, 0] };
  const b = bodyOf(system, id);
  if (!b) return { pos: [NaN, NaN], vel: [NaN, NaN] };
  const own = localState(b, t);
  const up = absoluteState(system, primaryOf(b), t);
  return { pos: add(up.pos, own.pos), vel: add(up.vel, own.vel) };
}

export function relativeState(system: FlightSystem, id: string, primary: string, t: number): State {
  const a = absoluteState(system, id, t);
  const p = absoluteState(system, primary, t);
  return {
    pos: [a.pos[0] - p.pos[0], a.pos[1] - p.pos[1]],
    vel: [a.vel[0] - p.vel[0], a.vel[1] - p.vel[1]]
  };
}

export function chainOf(system: FlightSystem, id: string): string[] {
  const out: string[] = [];
  let cur = id;
  while (cur !== STAR) {
    out.push(cur);
    const b = bodyOf(system, cur);
    if (!b) return [];
    cur = primaryOf(b);
  }
  out.push(STAR);
  return out;
}

export interface Endpoint {
  place: Place;
  chain: string[];
  body?: FlightBody;
  r: number;
  angle: number;
  omega: number;
}

export function resolvePlace(system: FlightSystem, place: Place): Endpoint | undefined {
  if (place.kind === 'point') {
    const primary = place.primary ?? STAR;
    const chain = chainOf(system, primary);
    if (!chain.length) return undefined;
    const gm = gmOfPrimary(system, primary);
    const omega = place.angularSpeed ?? Math.sqrt(gm / (place.orbit * place.orbit * place.orbit));
    return { place, chain, r: place.orbit, angle: place.angle, omega };
  }
  const body = bodyOf(system, place.body);
  if (!body) return undefined;
  const chain = chainOf(system, body.id);
  if (!chain.length) return undefined;
  const r = place.kind === 'surface' ? lowOrbitRadius(body) : lowOrbitRadius(body, place.altitude);
  const omega = Math.sqrt(body.gm / (r * r * r));
  return { place, chain, body, r, angle: place.kind === 'orbit' ? (place.angle ?? 0) : 0, omega };
}

export const samePlace = (a: Place, b: Place): boolean => {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'point' && b.kind === 'point') return a.id === b.id;
  if (a.kind === 'point' || b.kind === 'point') return false;
  return a.body === b.body;
};

export function placeState(system: FlightSystem, e: Endpoint, t: number): State {
  const host = e.chain[0] ?? STAR;
  const base = absoluteState(system, host, t);
  const a = e.angle + e.omega * t;
  const [x, y] = polar(e.r, a);
  const s = e.r * e.omega;
  return {
    pos: add(base.pos, [x, y]),
    vel: add(base.vel, [-s * Math.sin(a), s * Math.cos(a)])
  };
}
