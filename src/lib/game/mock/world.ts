import type { World } from '../types';
import { asteroidBodies } from '../asteroids';
import { cometBodies } from '../comets';
import { moonBodies } from '../moons';
import { gallery } from '#lib/shell/mode.ts';
import { mockBodies } from './bodies';
import { mockSites } from './sites';
import { mockSystems } from './starSystems';

function solBodies() {
  const hand = mockBodies(),
    rocks = asteroidBodies();
  return [...hand, ...moonBodies([...hand, ...rocks]), ...rocks, ...cometBodies()];
}

export function mockWorld(): World {
  return {
    system: 'sol',
    systems: mockSystems(),
    bodies: solBodies(),
    fleets: [],
    contacts: [],
    sites: gallery ? mockSites() : []
  };
}
