import type { Fleet, Order } from '../types';

export type FleetSeed = Omit<Fleet, 'x' | 'y' | 'heading' | 'orders'> & {
  orders: Omit<Order, 'id' | 'done'>[];
  progress?: number;
  transit?: { from: string; to: string; progress: number };
};

const DAY = 86_400;

export const mockFleets = (): FleetSeed[] => [
  {
    id: 'survey',
    system: 'sol',
    name: 'Survey group 1',
    kind: 'mil',
    note: 'To Mars',
    activity: 'Under way',
    meters: { fuel: 72, supplies: 55, crew: 94 },
    transit: { from: 'earth', to: 'mars', progress: 0.4 },
    orders: [
      { type: 'move', target: 'mars' },
      { type: 'survey', target: 'mars' },
      { type: 'refuel', target: 'mars' }
    ],
    ships: [
      { name: 'Halley', classId: 'pathfinder', fuel: 72, status: 'Under way' },
      { name: 'Hubble', classId: 'pathfinder', fuel: 70, status: 'Under way' }
    ]
  },
  {
    id: 'convoy',
    system: 'sol',
    name: 'Freight convoy',
    kind: 'civ',
    at: 'earth',
    note: 'Earth',
    activity: 'Loading',
    meters: { fuel: 88, supplies: 91, crew: 100 },
    progress: 0.45 * DAY,
    orders: [
      { type: 'load', target: 'earth' },
      { type: 'move', target: 'mars' },
      { type: 'unload', target: 'mars' }
    ],
    ships: [
      { name: 'Ceres Star', classId: 'atlas', fuel: 88, status: 'Loading' },
      { name: 'Vesta Star', classId: 'atlas', fuel: 91, status: 'Loading' },
      { name: 'Pallas Star', classId: 'atlas', fuel: 64, status: 'Waiting' },
      { name: 'Juno Star', classId: 'mule', fuel: 95, status: 'Ready' }
    ]
  },
  {
    id: 'picket',
    system: 'sol',
    name: 'Jupiter picket',
    kind: 'mil',
    at: 'jupiter',
    note: 'Jupiter',
    activity: 'On station',
    meters: { fuel: 56, supplies: 41, crew: 97 },
    orders: [{ type: 'orbit', target: 'jupiter' }],
    ships: [
      { name: 'Resolute', classId: 'bastion', fuel: 58, status: 'On station' },
      { name: 'Vigilant', classId: 'lancer', fuel: 61, status: 'On station' },
      { name: 'Watchful', classId: 'lancer', fuel: 49, status: 'Low fuel' }
    ]
  },
  {
    id: 'probe',
    system: 'acen',
    name: 'Probe group',
    kind: 'mil',
    at: 'acen-3',
    note: 'Centauri III',
    activity: 'Surveying',
    meters: { fuel: 61, supplies: 70, crew: 96 },
    progress: 31 * DAY,
    orders: [
      { type: 'survey', target: 'acen-3' },
      { type: 'survey', target: 'acen-4' }
    ],
    ships: [{ name: 'Kepler', classId: 'pathfinder', fuel: 61, status: 'Surveying' }]
  },
  {
    id: 'colonists',
    system: 'acen',
    name: 'Colony lift',
    kind: 'civ',
    at: 'acen-2',
    note: 'Centauri II',
    activity: 'Unloading',
    cargo: 'earth',
    meters: { fuel: 54, supplies: 80, crew: 100 },
    progress: 0.6 * DAY,
    orders: [
      { type: 'unload', target: 'acen-2' },
      { type: 'move', target: 'acen-a' }
    ],
    ships: [
      { name: 'New Dawn', classId: 'ark', fuel: 54, status: 'Unloading' },
      { name: 'Far Shore', classId: 'ark', fuel: 57, status: 'Unloading' }
    ]
  },
  {
    id: 'watch',
    system: 'barn',
    name: 'Barnard watch',
    kind: 'mil',
    at: 'barn-d',
    note: 'Barnard d',
    activity: 'On station',
    meters: { fuel: 80, supplies: 66, crew: 92 },
    orders: [{ type: 'orbit', target: 'barn-d' }],
    ships: [
      { name: 'Sentinel', classId: 'lancer', fuel: 80, status: 'On station' },
      { name: 'Lookout', classId: 'pike', fuel: 77, status: 'On station' }
    ]
  }
];
