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
    classId: 'pathfinder',
    note: 'To Mars',
    activity: 'Under way',
    speedKmS: 1500,
    meters: { fuel: 72, supplies: 55, crew: 94 },
    transit: { from: 'earth', to: 'mars', progress: 0.4 },
    orders: [
      { type: 'move', target: 'mars' },
      { type: 'survey', target: 'mars' },
      { type: 'refuel', target: 'mars' }
    ],
    ships: [
      { name: 'Halley', className: 'Pathfinder', classId: 'pathfinder', fuel: 72, status: 'Under way' },
      { name: 'Hubble', className: 'Pathfinder', classId: 'pathfinder', fuel: 70, status: 'Under way' }
    ]
  },
  {
    id: 'convoy',
    system: 'sol',
    name: 'Freight convoy',
    kind: 'civ',
    classId: 'atlas',
    at: 'earth',
    note: 'Earth',
    activity: 'Loading',
    speedKmS: 900,
    meters: { fuel: 88, supplies: 91, crew: 100 },
    progress: 0.45 * DAY,
    orders: [
      { type: 'load', target: 'earth' },
      { type: 'move', target: 'mars' },
      { type: 'unload', target: 'mars' }
    ],
    ships: [
      { name: 'Ceres Star', className: 'Atlas', classId: 'atlas', fuel: 88, status: 'Loading' },
      { name: 'Vesta Star', className: 'Atlas', classId: 'atlas', fuel: 91, status: 'Loading' },
      { name: 'Pallas Star', className: 'Atlas', classId: 'atlas', fuel: 64, status: 'Waiting' },
      { name: 'Juno Star', className: 'Mule', classId: 'mule', fuel: 95, status: 'Ready' }
    ]
  },
  {
    id: 'picket',
    system: 'sol',
    name: 'Jupiter picket',
    kind: 'mil',
    classId: 'bastion',
    at: 'jupiter',
    note: 'Jupiter',
    activity: 'On station',
    speedKmS: 1200,
    meters: { fuel: 56, supplies: 41, crew: 97 },
    orders: [{ type: 'orbit', target: 'jupiter' }],
    ships: [
      { name: 'Resolute', className: 'Bastion', classId: 'bastion', fuel: 58, status: 'On station' },
      { name: 'Vigilant', className: 'Lancer', classId: 'lancer', fuel: 61, status: 'On station' },
      { name: 'Watchful', className: 'Lancer', classId: 'lancer', fuel: 49, status: 'Low fuel' }
    ]
  },
  {
    id: 'probe',
    system: 'acen',
    name: 'Probe group',
    kind: 'mil',
    classId: 'pathfinder',
    at: 'acen-3',
    note: 'Centauri III',
    activity: 'Surveying',
    speedKmS: 1500,
    meters: { fuel: 61, supplies: 70, crew: 96 },
    progress: 31 * DAY,
    orders: [
      { type: 'survey', target: 'acen-3' },
      { type: 'survey', target: 'acen-4' }
    ],
    ships: [{ name: 'Kepler', className: 'Pathfinder', classId: 'pathfinder', fuel: 61, status: 'Surveying' }]
  },
  {
    id: 'colonists',
    system: 'acen',
    name: 'Colony lift',
    kind: 'civ',
    classId: 'ark',
    at: 'acen-2',
    note: 'Centauri II',
    activity: 'Unloading',
    speedKmS: 700,
    cargo: 'earth',
    meters: { fuel: 54, supplies: 80, crew: 100 },
    progress: 0.6 * DAY,
    orders: [
      { type: 'unload', target: 'acen-2' },
      { type: 'move', target: 'acen-a' }
    ],
    ships: [
      { name: 'New Dawn', className: 'Ark', classId: 'ark', fuel: 54, status: 'Unloading' },
      { name: 'Far Shore', className: 'Ark', classId: 'ark', fuel: 57, status: 'Unloading' }
    ]
  },
  {
    id: 'watch',
    system: 'barn',
    name: 'Barnard watch',
    kind: 'mil',
    classId: 'lancer',
    at: 'barn-d',
    note: 'Barnard d',
    activity: 'On station',
    speedKmS: 1400,
    meters: { fuel: 80, supplies: 66, crew: 92 },
    orders: [{ type: 'orbit', target: 'barn-d' }],
    ships: [
      { name: 'Sentinel', className: 'Lancer', classId: 'lancer', fuel: 80, status: 'On station' },
      { name: 'Lookout', className: 'Pike', classId: 'pike', fuel: 77, status: 'On station' }
    ]
  }
];
