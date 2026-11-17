import { asteroids, type AsteroidRecord } from '#lib/game/data/index.ts';
import { hash } from '#lib/gfx/math.ts';
import type { Body } from './types';
import { AU, orbitRate } from './units';

export const G = 6.6743e-11;
export const NEAR_EARTH_PERIHELION = 1.3;
export const YEAR_DAYS = 365.256;
const EQUILIBRIUM_K = 278.6;
const KELVIN = 273.15;
const SURFACE_G = 9.80665;

export const TYPE_NAMES: Readonly<Record<AsteroidRecord['type'], string>> = {
  carbonaceous: 'Carbonaceous',
  stony: 'Stony',
  metallic: 'Metallic',
  icy: 'Icy'
};

export const GROUPS = [
  'Near-Earth',
  'Main belt',
  'Hilda',
  'Jupiter Trojan',
  'Centaur',
  'Trans-Neptunian',
  'Other'
] as const;

export type Group = (typeof GROUPS)[number];

export const isNearEarth = (a: AsteroidRecord): boolean => a.a * (1 - a.e) < NEAR_EARTH_PERIHELION;

export function groupOf(a: AsteroidRecord): Group {
  if (isNearEarth(a)) return 'Near-Earth';
  if (a.a < 3.7) return 'Main belt';
  if (a.a < 4.3) return 'Hilda';
  if (a.a >= 5.0 && a.a < 5.4) return 'Jupiter Trojan';
  if (a.a >= 5.4 && a.a < 30.1) return 'Centaur';
  return a.a >= 30.1 ? 'Trans-Neptunian' : 'Other';
}

export const periodDays = (a: { a: number }): number => YEAR_DAYS * Math.pow(a.a, 1.5);

export const smallBodyGm = (r: { mass: number }): number => G * r.mass;

export const smallBodyRadius = (r: { diameter: number }): number => (r.diameter * 1000) / 2;

export function formatSize(km: number): string {
  if (km >= 10) return `${Math.round(km).toLocaleString('en-US')} km`;
  if (km >= 1) return `${km.toFixed(1)} km`;
  return `${Math.round(km * 1000)} m`;
}

export function formatGravity(gm: number, radius: number): string {
  const g = gm / (radius * radius) / SURFACE_G;
  return g >= 0.001 ? `${+g.toPrecision(2)} g` : `${+(g * 1e6).toPrecision(2)} µg`;
}

export const stringHash = (s: string): number => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = Math.imul(h, 33) ^ s.charCodeAt(i);
  return h >>> 0;
};

export const temperatureAt = (au: number): string =>
  `${Math.round(EQUILIBRIUM_K / Math.sqrt(au) - KELVIN)} °C`;

export function smallBodyFacts(
  kind: string,
  r: { mass: number; diameter: number; diameterEstimated?: boolean },
  au: number
) {
  const radius = smallBodyRadius(r);
  return {
    kind,
    gravity: formatGravity(smallBodyGm(r), radius),
    surface: temperatureAt(au),
    air: 'None',
    size: `${formatSize(r.diameter)}${r.diameterEstimated ? ' est.' : ''}`
  };
}

export const asteroidSeed = (a: AsteroidRecord): number => a.number ?? stringHash(a.id);

export function asteroidBody(a: AsteroidRecord): Body {
  const seed = asteroidSeed(a);
  return {
    system: 'sol',
    id: a.id,
    name: a.name,
    type: 'rock',
    radius: smallBodyRadius(a),
    orbit: a.a * AU,
    angle: hash(seed, 3, 11) * Math.PI * 2,
    angularSpeed: orbitRate(periodDays(a)),
    tilt: hash(seed, 4, 11) * 0.4,
    rotation: a.rotation,
    facts: smallBodyFacts(a.dwarf ? 'Dwarf planet' : 'Asteroid', a, a.a)
  };
}

export const asteroidBodies = (): Body[] => asteroids.map(asteroidBody);
