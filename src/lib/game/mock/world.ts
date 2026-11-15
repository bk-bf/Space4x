import { mix } from '#lib/gfx/math.ts';
import { nextOrderId } from '../orders';
import { bodyPosition, parkingSpot } from '../orbits';
import type { Body, Fleet, World } from '../types';
import { mockBodies } from './bodies';
import { mockContacts } from './contacts';
import { mockFleets, type FleetSeed } from './fleets';
import { mockSystems } from './starSystems';

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
    heading: 1
  };
  if (seed.at) return { ...fleet, ...parkingSpot(fleet, bodyById(bodies, seed.at), bodies, 0) };
  if (!transit) throw new Error(`fleet ${seed.id} has no position`);
  const [px, py] = bodyPosition(bodyById(bodies, transit.from), bodies);
  const [qx, qy] = bodyPosition(bodyById(bodies, transit.to), bodies);
  return {
    ...fleet,
    x: mix(px, qx, transit.progress),
    y: mix(py, qy, transit.progress),
    heading: qx > px ? 1 : -1
  };
}

export function mockWorld(): World {
  const bodies = mockBodies();
  return {
    system: 'sol',
    systems: mockSystems(),
    bodies,
    fleets: mockFleets().map((f) => place(f, bodies)),
    contacts: mockContacts()
  };
}
