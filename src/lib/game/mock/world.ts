import type { World } from '../types';
import { asteroidBodies } from '../asteroids';
import { gallery } from '#lib/shell/mode.ts';
import { mockBodies } from './bodies';
import { mockSites } from './sites';
import { mockSystems } from './starSystems';

export function mockWorld(): World {
  return {
    system: 'sol',
    systems: mockSystems(),
    bodies: [...mockBodies(), ...asteroidBodies()],
    fleets: [],
    contacts: [],
    sites: gallery ? mockSites() : []
  };
}
