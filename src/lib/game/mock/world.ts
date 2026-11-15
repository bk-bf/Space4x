import { mix } from '#lib/gfx/math.ts';
import { bodyPosition, parkingSpot } from '../orbits';
import type { Body, Fleet, World } from '../types';
import { mockBodies } from './bodies';
import { mockContacts } from './contacts';
import { MOCK_TRANSIT_PROGRESS, mockFleets } from './fleets';
import { mockSystems } from './starSystems';

function bodyById(bodies: readonly Body[], id: string): Body {
  const b = bodies.find((x) => x.id === id);
  if (!b) throw new Error(`no body ${id}`);
  return b;
}

function place(seed: ReturnType<typeof mockFleets>[number], bodies: readonly Body[]): Fleet {
  if (seed.at)
    return { ...seed, ...parkingSpot({ ...seed, x: 0, y: 0, heading: 1 }, bodyById(bodies, seed.at), 0) };
  const transit = MOCK_TRANSIT_PROGRESS[seed.id];
  if (!transit || !seed.destination) throw new Error(`fleet ${seed.id} has no position`);
  const [px, py] = bodyPosition(bodyById(bodies, transit.from));
  const [qx, qy] = bodyPosition(bodyById(bodies, seed.destination));
  return {
    ...seed,
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
