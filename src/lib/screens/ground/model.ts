import { hash } from '#lib/gfx/math.ts';

export type UnitKind = 'hq' | 'inf' | 'tank' | 'art' | 'aa';

export const STANCES = ['Dug in', 'Advance', 'Reserve', 'Support'] as const;
export type Stance = (typeof STANCES)[number];

export interface Unit {
  id: string;
  name: string;
  kind: UnitKind;
  formation: string;
  strength: number;
  morale: number;
  supply: number;
  stance: Stance;
  trainedAt: string;
}

export interface Formation {
  id: string;
  name: string;
  place: string;
}

export interface KindInfo {
  label: string;
  plural: string;
  men: number;
  attack: number;
  defence: number;
  supplyUse: number;
  transport: number;
}

export const KINDS: Record<UnitKind, KindInfo> = {
  hq: {
    label: 'HQ company',
    plural: 'HQ companies',
    men: 120,
    attack: 2,
    defence: 8,
    supplyUse: 2,
    transport: 1200
  },
  inf: {
    label: 'Rifle battalion',
    plural: 'Rifle battalions',
    men: 600,
    attack: 12,
    defence: 18,
    supplyUse: 4,
    transport: 3000
  },
  tank: {
    label: 'Armour',
    plural: 'Armour',
    men: 150,
    attack: 28,
    defence: 22,
    supplyUse: 9,
    transport: 6000
  },
  art: {
    label: 'Artillery',
    plural: 'Artillery',
    men: 90,
    attack: 24,
    defence: 6,
    supplyUse: 7,
    transport: 2400
  },
  aa: {
    label: 'Air defence',
    plural: 'Air defence',
    men: 80,
    attack: 14,
    defence: 8,
    supplyUse: 5,
    transport: 1800
  }
};

export const KIND_ORDER: readonly UnitKind[] = ['hq', 'inf', 'tank', 'art', 'aa'];

export const STANCE_USE: Record<Stance, number> = {
  'Dug in': 0.45,
  Advance: 1.4,
  Reserve: 0.3,
  Support: 0.5
};
export const STANCE_MORALE: Record<Stance, number> = { 'Dug in': 8, Advance: -4, Reserve: 10, Support: 6 };

export const PLACE_SUPPLY: Record<string, number> = { earth: 4 };

const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th'];

type Seed = readonly [
  kind: UnitKind,
  count: number,
  stance: Stance,
  strength: number,
  morale: number,
  supply: number
];

interface FormationSeed {
  id: string;
  name: string;
  place: string;
  units: readonly Seed[];
}

const FORMATION_SEEDS: readonly FormationSeed[] = [
  {
    id: 'home-guard',
    name: 'Home guard',
    place: 'earth',
    units: [
      ['hq', 1, 'Dug in', 100, 92, 80],
      ['inf', 6, 'Dug in', 94, 88, 76],
      ['tank', 3, 'Reserve', 81, 90, 62],
      ['art', 2, 'Support', 100, 85, 70],
      ['aa', 1, 'Support', 100, 79, 74]
    ]
  },
  {
    id: 'capital-guard',
    name: 'Capital guard',
    place: 'earth',
    units: [
      ['hq', 1, 'Dug in', 100, 90, 96],
      ['inf', 3, 'Dug in', 97, 91, 94],
      ['tank', 1, 'Reserve', 99, 93, 92]
    ]
  },
  {
    id: 'spaceport-guard',
    name: 'Spaceport guard',
    place: 'earth',
    units: [
      ['inf', 2, 'Dug in', 95, 86, 88],
      ['aa', 2, 'Support', 100, 84, 90]
    ]
  },
  {
    id: 'strategic-reserve',
    name: 'Strategic reserve',
    place: 'earth',
    units: [
      ['hq', 1, 'Reserve', 100, 88, 85],
      ['tank', 2, 'Reserve', 92, 89, 83],
      ['art', 2, 'Reserve', 100, 87, 86]
    ]
  },
  {
    id: 'coastal-guard',
    name: 'Coastal guard',
    place: 'earth',
    units: [
      ['hq', 1, 'Dug in', 100, 85, 72],
      ['inf', 2, 'Dug in', 90, 82, 68],
      ['aa', 1, 'Support', 100, 80, 70]
    ]
  }
];

export const mockFormations = (): Formation[] =>
  FORMATION_SEEDS.map(({ id, name, place }) => ({ id, name, place }));

const jitter = (id: number, k: number, spread: number) => (hash(id, k, 31) - 0.5) * spread;
const bound = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

export function unitName(kind: UnitKind, ordinal: number, of: number): string {
  const info = KINDS[kind];
  return of === 1 ? info.label : `${ORDINALS[ordinal] ?? `${ordinal + 1}th`} ${info.label.toLowerCase()}`;
}

export function mockUnits(): Unit[] {
  const out: Unit[] = [];
  let n = 0;
  for (const f of FORMATION_SEEDS) {
    for (const [kind, count, stance, strength, morale, supply] of f.units)
      for (let i = 0; i < count; i++) {
        n++;
        out.push({
          id: `u-${n}`,
          name: unitName(kind, i, count),
          kind,
          formation: f.id,
          strength: bound(strength + jitter(n, 1, 6)),
          morale: bound(morale + jitter(n, 2, 6)),
          supply: bound(supply + jitter(n, 3, 8)),
          stance,
          trainedAt: 'earth'
        });
      }
  }
  return out;
}

export const menOf = (u: Pick<Unit, 'kind' | 'strength'>): number =>
  Math.round((KINDS[u.kind].men * u.strength) / 100);

export const supplyUseOf = (u: Pick<Unit, 'kind' | 'stance'>): number =>
  Math.round(KINDS[u.kind].supplyUse * STANCE_USE[u.stance] * 10) / 10;

export const plural = (n: number, one: string, many = one + 's'): string => `${n} ${n === 1 ? one : many}`;
