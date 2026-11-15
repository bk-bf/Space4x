import { fbm, noise3 } from '../noise';
import type { PlanetType } from '../planets';
import { bakeFace, makeCube, type Channel, type Cube } from './cube';

export type FieldKind = 'terran' | 'mars' | 'venus' | 'gas' | 'ice' | 'rock';

export const FIELD_OF: Record<PlanetType, FieldKind> = {
  terran: 'terran',
  mars: 'mars',
  venus: 'venus',
  gas: 'gas',
  saturn: 'gas',
  ice: 'ice',
  ice2: 'ice',
  rock: 'rock'
};

const CLOUD_LON = (2.2 / 512) * Math.PI * 2;
const CLOUD_LAT = (-1.6 / 255) * Math.PI;

function shifted(def: Channel, dLon: number, dLat: number): Channel {
  return (x, y, z) => {
    const lat = Math.asin(Math.max(-1, Math.min(1, y))) + dLat,
      lon = Math.atan2(z, x) + dLon,
      c = Math.cos(lat);
    return def(Math.cos(lon) * c, Math.sin(lat), Math.sin(lon) * c);
  };
}

const terranCloud: Channel = (x, y, z) => fbm(x * 3.2 + 40, y * 5.2 + 9, z * 3.2, 5);

const DEFS: Record<FieldKind, readonly Channel[]> = {
  terran: [
    (x, y, z) => fbm(x * 2.4 + 5, y * 2.4, z * 2.4, 6),
    terranCloud,
    (x, y, z) => fbm(x * 6 + 2, y * 6, z * 6, 3),
    shifted(terranCloud, CLOUD_LON, CLOUD_LAT),
    (x, y, z) => noise3(x * 38 + 1, y * 38, z * 38),
    (x, y, z) => noise3(x * 30, y * 30, z * 30)
  ],
  mars: [
    (x, y, z) => fbm(x * 2.2 + 11, y * 2.2, z * 2.2, 6),
    (x, y, z) => fbm(x * 5 + 2, y * 5, z * 5, 3),
    (x, _y, z) => fbm(x * 2 + 9, 3, z * 2, 3),
    (x, y, z) => noise3(x * 7 + 3, y * 7, z * 7),
    (x, y, z) => noise3(x * 17 + 8, y * 17, z * 17)
  ],
  venus: [
    (x, y, z) => fbm(x * 1.4 + 3, y * 3.4 + Math.abs(x) * 1.1, z * 1.4, 6),
    (x, y, z) => fbm(x * 5, y * 11, z * 5, 3)
  ],
  gas: [
    (x, y, z) => fbm(x * 2.4, y * 2.4 + 20, z * 2.4, 6),
    (x, y, z) => fbm(x * 7 + 4, y * 16, z * 7, 3),
    (x, y, z) => fbm(x * 26 + 1, y * 60, z * 26, 3),
    (x, y, z) => noise3(x * 9 + 2, y * 22, z * 9)
  ],
  ice: [(x, y, z) => fbm(x * 1.6 + 9, y * 3 + 2, z * 1.6, 6), (x, y, z) => noise3(x * 6, y * 20 + 3, z * 6)],
  rock: [
    (x, y, z) => fbm(x * 2.6 + 17, y * 2.6, z * 2.6, 6),
    (x, y, z) => noise3(x * 6 + 3, y * 6, z * 6),
    (x, y, z) => noise3(x * 14 + 5, y * 14, z * 14),
    (x, y, z) => noise3(x * 31 + 5, y * 31, z * 31)
  ]
};

const KINDS = Object.keys(DEFS) as FieldKind[];
const cubes = new Map<FieldKind, Cube>();

function cubeOf(kind: FieldKind): Cube {
  let c = cubes.get(kind);
  if (!c) {
    c = makeCube(DEFS[kind].length);
    cubes.set(kind, c);
  }
  return c;
}

export function fieldCube(type: PlanetType): Cube {
  const kind = FIELD_OF[type],
    c = cubeOf(kind);
  for (let f = 0; f < 6; f++) if (!c.baked[f]) bakeFace(c, f, DEFS[kind]);
  return c;
}

export function bakeStep(): boolean {
  for (const kind of KINDS) {
    const c = cubeOf(kind),
      f = c.baked.indexOf(false);
    if (f >= 0) {
      bakeFace(c, f, DEFS[kind]);
      return true;
    }
  }
  return false;
}

export function bakeAll(): void {
  while (bakeStep());
}
