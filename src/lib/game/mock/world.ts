import type { World } from '../types';
import { mockBodies } from './bodies';
import { mockSites } from './sites';
import { mockSystems } from './starSystems';

export function mockWorld(): World {
  return {
    system: 'sol',
    systems: mockSystems(),
    bodies: mockBodies(),
    fleets: [],
    contacts: [],
    sites: mockSites()
  };
}
