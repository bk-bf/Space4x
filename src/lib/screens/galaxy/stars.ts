import type { RGB } from '#lib/gfx/palette.ts';

export interface Counts {
  bodies: number;
  colonies: number;
  fleets: number;
}

export interface StarSystem {
  id: string;
  name: string;
  x: number;
  y: number;
  color: RGB;
  radius: number;
  star: string;
  counts?: Counts;
  unknown?: boolean;
}

export const SYSTEMS: readonly StarSystem[] = [
  {
    id: 'sol',
    name: 'Sol',
    x: 0,
    y: 0,
    color: [255, 216, 112],
    radius: 4,
    star: 'G2 yellow'
  },
  {
    id: 'acen',
    name: 'Alpha Centauri',
    x: 72,
    y: -44,
    color: [255, 236, 170],
    radius: 4,
    star: 'G2 and K1 pair'
  },
  {
    id: 'barn',
    name: "Barnard's Star",
    x: -66,
    y: -56,
    color: [230, 110, 70],
    radius: 2,
    star: 'M4 red dwarf'
  },
  {
    id: 'wolf',
    name: 'Wolf 359',
    x: -118,
    y: 20,
    color: [230, 110, 70],
    radius: 2,
    star: 'M6 red dwarf',
    counts: { bodies: 1, colonies: 0, fleets: 0 }
  },
  {
    id: 'lal',
    name: 'Lalande 21185',
    x: 10,
    y: 76,
    color: [240, 150, 90],
    radius: 3,
    star: 'M2 red dwarf',
    counts: { bodies: 3, colonies: 0, fleets: 0 }
  },
  {
    id: 'sir',
    name: 'Sirius',
    x: 122,
    y: 42,
    color: [200, 220, 255],
    radius: 5,
    star: 'A1 white pair',
    counts: { bodies: 0, colonies: 0, fleets: 0 }
  },
  {
    id: 'luy',
    name: 'Beyond jump point A',
    x: 40,
    y: 26,
    color: [120, 116, 160],
    radius: 2,
    star: 'Unknown',
    unknown: true
  },
  {
    id: 'tauc',
    name: 'Tau Ceti',
    x: -48,
    y: 118,
    color: [250, 214, 140],
    radius: 3,
    star: 'G8 yellow dwarf',
    counts: { bodies: 6, colonies: 0, fleets: 0 }
  },
  {
    id: 'eri',
    name: 'Epsilon Eridani',
    x: 60,
    y: -118,
    color: [246, 168, 100],
    radius: 3,
    star: 'K2 orange dwarf',
    counts: { bodies: 4, colonies: 0, fleets: 0 }
  },
  {
    id: 'proc',
    name: 'Procyon',
    x: -128,
    y: -112,
    color: [242, 236, 206],
    radius: 4,
    star: 'F5 pair',
    counts: { bodies: 2, colonies: 0, fleets: 0 }
  }
];

export const LINKS: readonly (readonly [string, string])[] = [['sol', 'luy']];

export const systemById = (id: string): StarSystem | undefined => SYSTEMS.find((s) => s.id === id);
