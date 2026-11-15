import type { RGB } from '#lib/gfx/palette.ts';

export interface StarSystem {
  id: string;
  name: string;
  x: number;
  y: number;
  color: RGB;
  radius: number;
  star: string;
  bodies: number | null;
  colonies: number | null;
  fleets: number | null;
  jumps: string;
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
    star: 'G2 yellow',
    bodies: 8,
    colonies: 3,
    fleets: 3,
    jumps: '3 of 3'
  },
  {
    id: 'acen',
    name: 'Alpha Centauri',
    x: 72,
    y: -44,
    color: [255, 236, 170],
    radius: 4,
    star: 'G2 and K1 pair',
    bodies: 5,
    colonies: 0,
    fleets: 1,
    jumps: '2 of 4'
  },
  {
    id: 'barn',
    name: "Barnard's Star",
    x: -66,
    y: -56,
    color: [230, 110, 70],
    radius: 2,
    star: 'M4 red dwarf',
    bodies: 2,
    colonies: 0,
    fleets: 0,
    jumps: '2 of 2'
  },
  {
    id: 'wolf',
    name: 'Wolf 359',
    x: -118,
    y: 20,
    color: [230, 110, 70],
    radius: 2,
    star: 'M6 red dwarf',
    bodies: 1,
    colonies: 0,
    fleets: 0,
    jumps: '1 of 1'
  },
  {
    id: 'lal',
    name: 'Lalande 21185',
    x: 10,
    y: 76,
    color: [240, 150, 90],
    radius: 3,
    star: 'M2 red dwarf',
    bodies: 3,
    colonies: 0,
    fleets: 0,
    jumps: '1 of 3'
  },
  {
    id: 'sir',
    name: 'Sirius',
    x: 122,
    y: 42,
    color: [200, 220, 255],
    radius: 5,
    star: 'A1 white pair',
    bodies: 0,
    colonies: 0,
    fleets: 0,
    jumps: '1 of 2'
  },
  {
    id: 'luy',
    name: 'Unsurveyed',
    x: 150,
    y: -72,
    color: [120, 116, 160],
    radius: 2,
    star: 'Unknown',
    bodies: null,
    colonies: null,
    fleets: null,
    jumps: 'Unknown',
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
    bodies: 6,
    colonies: 0,
    fleets: 0,
    jumps: '1 of 3'
  },
  {
    id: 'eri',
    name: 'Epsilon Eridani',
    x: 60,
    y: -118,
    color: [246, 168, 100],
    radius: 3,
    star: 'K2 orange dwarf',
    bodies: 4,
    colonies: 0,
    fleets: 0,
    jumps: '1 of 2'
  },
  {
    id: 'proc',
    name: 'Procyon',
    x: -128,
    y: -112,
    color: [242, 236, 206],
    radius: 4,
    star: 'F5 pair',
    bodies: 2,
    colonies: 0,
    fleets: 0,
    jumps: '1 of 3'
  }
];

export const LINKS: readonly (readonly [string, string])[] = [
  ['sol', 'acen'],
  ['sol', 'barn'],
  ['sol', 'lal'],
  ['barn', 'wolf'],
  ['acen', 'sir'],
  ['acen', 'luy'],
  ['lal', 'tauc'],
  ['acen', 'eri'],
  ['barn', 'proc']
];

export const systemById = (id: string): StarSystem | undefined => SYSTEMS.find((s) => s.id === id);
