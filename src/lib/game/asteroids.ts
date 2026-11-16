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
  metallic: 'Metallic'
};

export const isNearEarth = (a: AsteroidRecord): boolean => a.a * (1 - a.e) < NEAR_EARTH_PERIHELION;

export const periodDays = (a: AsteroidRecord): number => YEAR_DAYS * Math.pow(a.a, 1.5);

export const asteroidGm = (a: AsteroidRecord): number => G * a.mass;

export const asteroidRadius = (a: AsteroidRecord): number => (a.diameter * 1000) / 2;

export function formatSize(km: number): string {
  if (km >= 10) return `${Math.round(km).toLocaleString('en-US')} km`;
  if (km >= 1) return `${km.toFixed(1)} km`;
  return `${Math.round(km * 1000)} m`;
}

export function formatGravity(gm: number, radius: number): string {
  const g = gm / (radius * radius) / SURFACE_G;
  return g >= 0.001 ? `${+g.toPrecision(2)} g` : `${+(g * 1e6).toPrecision(2)} µg`;
}

export function asteroidBody(a: AsteroidRecord): Body {
  const radius = asteroidRadius(a);
  return {
    system: 'sol',
    id: a.id,
    name: a.name,
    type: 'rock',
    radius,
    orbit: a.a * AU,
    angle: hash(a.number, 3, 11) * Math.PI * 2,
    angularSpeed: orbitRate(periodDays(a)),
    tilt: hash(a.number, 4, 11) * 0.4,
    facts: {
      kind: a.id === 'ceres' ? 'Dwarf planet' : 'Asteroid',
      gravity: formatGravity(asteroidGm(a), radius),
      surface: `${Math.round(EQUILIBRIUM_K / Math.sqrt(a.a) - KELVIN)} °C`,
      air: 'None',
      size: formatSize(a.diameter)
    }
  };
}

export const asteroidBodies = (): Body[] => asteroids.map(asteroidBody);
