import type { Amounts } from '#lib/game/data/index.ts';

export const PROPELLANT_KINDS = [
  'kerolox',
  'methalox',
  'hydrolox',
  'hypergolic',
  'hydrogen',
  'deuterium',
  'xenon'
] as const;

export type PropellantKind = (typeof PROPELLANT_KINDS)[number];

export interface Propellant {
  id: PropellantKind;
  name: string;
  density: number;
  cryogenic: boolean;
  mix: Amounts;
  source: string;
}

const split = (fuel: string, oxidiser: string, ratio: number): Amounts => ({
  [fuel]: 1 / (1 + ratio),
  [oxidiser]: ratio / (1 + ratio)
});

export const PROPELLANTS: Readonly<Record<PropellantKind, Propellant>> = {
  kerolox: {
    id: 'kerolox',
    name: 'Kerosene and oxygen',
    density: 1017,
    cryogenic: true,
    mix: split('rp1', 'lox', 2.34),
    source: 'https://en.wikipedia.org/wiki/RP-1'
  },
  methalox: {
    id: 'methalox',
    name: 'Methane and oxygen',
    density: 833,
    cryogenic: true,
    mix: split('lch4', 'lox', 3.6),
    source: 'https://en.wikipedia.org/wiki/SpaceX_Raptor'
  },
  hydrolox: {
    id: 'hydrolox',
    name: 'Hydrogen and oxygen',
    density: 357,
    cryogenic: true,
    mix: split('lh2', 'lox', 5.88),
    source: 'https://en.wikipedia.org/wiki/RL10'
  },
  hypergolic: {
    id: 'hypergolic',
    name: 'Hydrazine and tetroxide',
    density: 1163,
    cryogenic: false,
    mix: split('mmh', 'nto', 1.65),
    source: 'https://en.wikipedia.org/wiki/Hypergolic_propellant'
  },
  hydrogen: {
    id: 'hydrogen',
    name: 'Liquid hydrogen',
    density: 70.8,
    cryogenic: true,
    mix: { lh2: 1 },
    source: 'https://en.wikipedia.org/wiki/Liquid_hydrogen'
  },
  deuterium: {
    id: 'deuterium',
    name: 'Liquid deuterium',
    density: 162,
    cryogenic: true,
    mix: { deuterium: 1 },
    source: 'https://en.wikipedia.org/wiki/Deuterium'
  },
  xenon: {
    id: 'xenon',
    name: 'Xenon',
    density: 1500,
    cryogenic: false,
    mix: { xenon: 1 },
    source: 'https://en.wikipedia.org/wiki/Xenon'
  }
};

export const ULLAGE = 0.98;

export const isPropellant = (id: string): id is PropellantKind => id in PROPELLANTS;

export const volumeFor = (kind: PropellantKind, kg: number): number =>
  kg / (PROPELLANTS[kind].density * ULLAGE);
export const massIn = (kind: PropellantKind, m3: number): number => m3 * PROPELLANTS[kind].density * ULLAGE;
