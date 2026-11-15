import type { Fleet } from '../types';

type FleetSeed = Omit<Fleet, 'x' | 'y' | 'heading'>;

export const mockFleets = (): FleetSeed[] => [
  {
    id: 'survey',
    name: 'Survey group 1',
    kind: 'mil',
    classId: 'pathfinder',
    destination: 'mars',
    note: 'To Mars',
    speedKmS: 1500,
    meters: { fuel: 72, supplies: 55, crew: 94 },
    orders: ['Move to Mars', 'Survey Mars', 'Survey Phobos'],
    ships: [
      { name: 'Halley', className: 'Pathfinder', fuel: 72, status: 'Under way' },
      { name: 'Hubble', className: 'Pathfinder', fuel: 70, status: 'Under way' }
    ]
  },
  {
    id: 'convoy',
    name: 'Freight convoy',
    kind: 'civ',
    classId: 'atlas',
    at: 'earth',
    note: 'Earth',
    speedKmS: 900,
    meters: { fuel: 88, supplies: 91, crew: 100 },
    orders: ['Load machinery at Earth', 'Move to Mars', 'Unload all at Mars'],
    ships: [
      { name: 'Ceres Star', className: 'Atlas', fuel: 88, status: 'Loading' },
      { name: 'Vesta Star', className: 'Atlas', fuel: 91, status: 'Loading' },
      { name: 'Pallas Star', className: 'Atlas', fuel: 64, status: 'Waiting' },
      { name: 'Juno Star', className: 'Mule', fuel: 95, status: 'Ready' }
    ]
  },
  {
    id: 'picket',
    name: 'Jupiter picket',
    kind: 'mil',
    classId: 'bastion',
    at: 'jupiter',
    note: 'Jupiter',
    speedKmS: 1200,
    meters: { fuel: 56, supplies: 41, crew: 97 },
    orders: ['Hold orbit at Jupiter', 'Report contacts'],
    ships: [
      { name: 'Resolute', className: 'Bastion', fuel: 58, status: 'On station' },
      { name: 'Vigilant', className: 'Lancer', fuel: 61, status: 'On station' },
      { name: 'Watchful', className: 'Lancer', fuel: 49, status: 'Low fuel' }
    ]
  }
];

export const MOCK_TRANSIT_PROGRESS: Readonly<Record<string, { from: string; progress: number }>> = {
  survey: { from: 'earth', progress: 0.4 }
};

export const MOCK_REMOTE_FLEETS: readonly {
  system: string;
  fleets: readonly { name: string; note: string }[];
}[] = [{ system: 'Alpha Centauri', fleets: [{ name: 'Probe group', note: 'Surveying' }] }];
