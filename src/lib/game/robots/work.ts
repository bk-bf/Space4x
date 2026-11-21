import { asteroidRecord, cometRecord, environmentOf, moonRecord } from '#lib/game/data/index.ts';
import { smallBodyGm, smallBodyRadius } from '#lib/game/asteroids.ts';
import { G0, GRAVITY } from '#lib/game/suitability.ts';
import { classesOf } from './classes.ts';
import { ROBOT_COMPUTE } from './parts.ts';
import type { Chassis, RobotStats } from './types.ts';

export const NEAR_EARTH: readonly string[] = ['earth', 'luna'];

export const isNearEarth = (worldBody: string): boolean => NEAR_EARTH.includes(worldBody);

export function surfaceGravity(worldBody: string): number | undefined {
  const env = environmentOf(worldBody);
  if (env) return env.gravity;
  const r = asteroidRecord(worldBody) ?? moonRecord(worldBody) ?? cometRecord(worldBody);
  if (!r) return undefined;
  const radius = smallBodyRadius(r);
  return smallBodyGm(r) / (radius * radius);
}

export const chassisFor = (worldBody: string): Chassis | undefined => {
  const g = surfaceGravity(worldBody);
  if (g === undefined) return undefined;
  return g / G0 >= GRAVITY.low ? 'wheeled' : 'anchored';
};

export function digRate(stats: RobotStats, materialId: string): number {
  return classesOf(materialId).reduce((a, k) => a + stats.rates[k], 0);
}

export const runsOnboard = (stats: RobotStats): boolean => stats.compute >= ROBOT_COMPUTE - 1e-12;

export const wearPerHour = (stats: RobotStats): number => stats.wear / 8766;
