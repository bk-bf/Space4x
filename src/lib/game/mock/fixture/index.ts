import { mix } from '#lib/gfx/math.ts';
import { bodyPosition, parkingSpot } from '../../orbits';
import type { Body, Fleet, Game, World } from '../../index';
import { mockWorld } from '../world';
import { fixtureBodies } from './bodies';
import { fixtureContacts } from './contacts';
import { fixtureFleets, type FleetSeed } from './fleets';
import { fixtureSystems } from './systems';

let lastOrderId = 0;
const nextOrderId = (): number => ++lastOrderId;

const COLONIES = ['mars', 'ceres', 'luna', 'europa', 'acen-2'];

function bodyById(bodies: readonly Body[], id: string): Body {
  const b = bodies.find((x) => x.id === id);
  if (!b) throw new Error(`no body ${id}`);
  return b;
}

function place({ transit, progress = 0, orders, ...seed }: FleetSeed, bodies: readonly Body[]): Fleet {
  const fleet: Fleet = {
    ...seed,
    orders: orders.map((o, i) => ({ ...o, id: nextOrderId(), done: i ? 0 : progress })),
    x: 0,
    y: 0,
    heading: 0
  };
  if (seed.at) return { ...fleet, ...parkingSpot(fleet, bodyById(bodies, seed.at), bodies, 0) };
  if (!transit) throw new Error(`fleet ${seed.id} has no position`);
  const [px, py] = bodyPosition(bodyById(bodies, transit.from), bodies);
  const [qx, qy] = bodyPosition(bodyById(bodies, transit.to), bodies);
  return {
    ...fleet,
    x: mix(px, qx, transit.progress),
    y: mix(py, qy, transit.progress),
    heading: Math.atan2(qy - py, qx - px)
  };
}

export function fixtureWorld(): World {
  const base = mockWorld();
  const bodies = [...base.bodies, ...fixtureBodies()].map((b) =>
    COLONIES.includes(b.id) ? { ...b, colony: true } : b
  );
  const [sol, ...rest] = base.systems;
  const systems = [
    ...(sol ? [{ ...sol, jumps: sol.jumps.map((j) => ({ ...j, to: 'acen-a' })) }] : []),
    ...rest,
    ...fixtureSystems()
  ];
  return {
    ...base,
    systems,
    bodies,
    fleets: fixtureFleets().map((f) => place(f, bodies)),
    contacts: fixtureContacts()
  };
}

export function withFixture(game: Game): Game {
  game.world = fixtureWorld();
  return game;
}
