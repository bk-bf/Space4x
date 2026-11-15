export const CORE_KEYS = [
  'hull',
  'crew',
  'reactor',
  'fuel',
  'armor',
  'truss',
  'tank',
  'ring',
  'hangar'
] as const;
export const STERN_KEYS = ['engines', 'big'] as const;
export const BOW_KEYS = ['bridge', 'blunt', 'gun', 'prow', 'dock'] as const;
export const ATTACHMENT_KEYS = [
  'turret',
  'launcher',
  'dish',
  'antenna',
  'tower',
  'cargo',
  'radiator',
  'solar',
  'pod',
  'fin'
] as const;

export type CoreKey = (typeof CORE_KEYS)[number];
export type SternKey = (typeof STERN_KEYS)[number];
export type BowKey = (typeof BOW_KEYS)[number];
export type AttachmentKey = (typeof ATTACHMENT_KEYS)[number];
export type PartKey = CoreKey | SternKey | BowKey | AttachmentKey;

export const PNAME: Readonly<Record<PartKey, string>> = {
  hull: 'Hull',
  crew: 'Crew',
  reactor: 'Reactor',
  fuel: 'Fuel',
  armor: 'Armour',
  truss: 'Truss',
  tank: 'Tank',
  ring: 'Ring',
  hangar: 'Hangar',
  engines: 'Engines',
  big: 'Main eng.',
  bridge: 'Bridge',
  blunt: 'Cab',
  gun: 'Spinal gun',
  prow: 'Prow',
  dock: 'Dock',
  turret: 'Turret',
  launcher: 'Launcher',
  dish: 'Dish',
  antenna: 'Antenna',
  tower: 'Tower',
  cargo: 'Cargo',
  radiator: 'Radiator',
  solar: 'Solar',
  pod: 'Pod',
  fin: 'Fin'
};

export type Section = readonly [core: CoreKey, top?: string, bottom?: string];

export interface ShipSpec {
  readonly id: string;
  readonly name?: string;
  readonly role?: string;
  readonly code?: string;
  readonly livery?: 'navy' | 'civ';
  readonly stern?: readonly [SternKey, number?];
  readonly aft?: BowKey;
  readonly bow?: BowKey;
  readonly parts: readonly Section[];
}

export const SPECS: readonly ShipSpec[] = [
  {
    id: 'pathfinder',
    code: 'SV-12',
    livery: 'navy',
    name: 'Pathfinder',
    role: 'Survey ship',
    stern: ['engines', 2],
    bow: 'bridge',
    parts: [['reactor'], ['fuel'], ['crew', 'antenna'], ['hull', 'dish', 'dish'], ['hull', 'dish']]
  },
  {
    id: 'atlas',
    code: 'FT-31',
    livery: 'civ',
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
    code: 'TK-08',
    livery: 'civ',
    name: 'Mule',
    role: 'Tanker',
    stern: ['big'],
    bow: 'blunt',
    parts: [['reactor', 'radiator', 'radiator'], ['tank'], ['tank'], ['tank'], ['crew', 'antenna']]
  },
  {
    id: 'bastion',
    code: 'CV-07',
    livery: 'navy',
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
    code: 'FF-22',
    livery: 'navy',
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
    code: 'DD-15',
    livery: 'navy',
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
    code: 'CS-03',
    livery: 'civ',
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
    code: 'ST-01',
    livery: 'civ',
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
