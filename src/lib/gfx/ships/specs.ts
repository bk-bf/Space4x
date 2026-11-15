import type { BowKey, CoreKey, SternKey } from './parts';

export type Section = readonly [core: CoreKey, top?: string, bottom?: string];

export interface ShipSpec {
  readonly id: string;
  readonly name?: string;
  readonly role?: string;
  readonly stern?: readonly [SternKey, number?];
  readonly aft?: BowKey;
  readonly bow?: BowKey;
  readonly parts: readonly Section[];
}

export const SPECS: readonly ShipSpec[] = [
  {
    id: 'pathfinder',
    name: 'Pathfinder',
    role: 'Survey ship',
    stern: ['engines', 2],
    bow: 'bridge',
    parts: [['reactor'], ['fuel'], ['crew', 'antenna'], ['hull', 'dish', 'dish'], ['hull', 'dish']]
  },
  {
    id: 'atlas',
    name: 'Atlas',
    role: 'Bulk freighter',
    stern: ['big'],
    bow: 'blunt',
    parts: [
      ['reactor'],
      ['truss', 'cargo3', 'cargo2'],
      ['truss', 'cargo2', 'cargo3'],
      ['truss', 'cargo3', 'cargo3'],
      ['truss', 'cargo1', 'cargo2'],
      ['crew', 'tower']
    ]
  },
  {
    id: 'mule',
    name: 'Mule',
    role: 'Tanker',
    stern: ['big'],
    bow: 'blunt',
    parts: [['reactor', 'radiator', 'radiator'], ['tank'], ['tank'], ['tank'], ['crew', 'antenna']]
  },
  {
    id: 'bastion',
    name: 'Bastion',
    role: 'Carrier cruiser',
    stern: ['engines', 3],
    bow: 'prow',
    parts: [
      ['armor', 'radiator', 'radiator'],
      ['armor', 'turret', 'turret'],
      ['hangar', 'tower'],
      ['armor', 'turret', 'turret'],
      ['armor', 'launcher', 'launcher']
    ]
  },
  {
    id: 'lancer',
    name: 'Lancer',
    role: 'Missile frigate',
    stern: ['engines', 2],
    bow: 'bridge',
    parts: [
      ['reactor', 'fin', 'fin'],
      ['hull', 'launcher', 'launcher'],
      ['hull', 'launcher', 'launcher'],
      ['crew', 'dish']
    ]
  },
  {
    id: 'pike',
    name: 'Pike',
    role: 'Beam destroyer',
    stern: ['engines', 2],
    bow: 'gun',
    parts: [
      ['reactor', 'radiator', 'radiator'],
      ['armor', 'pod', 'pod'],
      ['hull', 'turret'],
      ['crew', 'antenna']
    ]
  },
  {
    id: 'ark',
    name: 'Ark',
    role: 'Colony ship',
    stern: ['big'],
    bow: 'blunt',
    parts: [
      ['reactor', 'radiator', 'radiator'],
      ['tank'],
      ['truss'],
      ['ring'],
      ['truss'],
      ['ring'],
      ['crew', 'tower']
    ]
  },
  {
    id: 'lighthouse',
    name: 'Lighthouse',
    role: 'Orbital station',
    aft: 'dock',
    bow: 'dock',
    parts: [
      ['truss', 'solar', 'solar'],
      ['hull', 'dish', 'antenna'],
      ['armor', 'tower', 'launcher'],
      ['crew', 'dish'],
      ['truss', 'solar', 'solar']
    ]
  }
];

export const ALIEN_SPECS: Readonly<Record<string, ShipSpec>> = {
  x1: {
    id: 'x1',
    stern: ['engines', 3],
    bow: 'gun',
    parts: [['armor', 'pod', 'pod'], ['hull', 'turret', 'turret'], ['hangar'], ['armor', 'launcher']]
  },
  x2: {
    id: 'x2',
    stern: ['engines', 1],
    bow: 'bridge',
    parts: [
      ['hull', 'launcher', 'fin'],
      ['crew', 'dish']
    ]
  }
};

export function spec(id: string): ShipSpec {
  const found = SPECS.find((s) => s.id === id);
  if (!found) throw new Error(`no ship class ${id}`);
  return found;
}
