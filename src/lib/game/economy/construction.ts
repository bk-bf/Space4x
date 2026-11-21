import { building } from '#lib/game/data/index.ts';
import type { Amounts } from '#lib/game/data/index.ts';
import { isMass } from './processes.ts';

export const BUILD_SLOTS = 3;
export const BUILD_BASE_DAYS = 10;
export const BUILD_DAYS_PER_TONNE = 2;

export const buildCost = (id: string): Amounts => building(id).cost;

export const buildMass = (id: string): number =>
  Object.entries(buildCost(id)).reduce((a, [m, v]) => a + (isMass(m) ? v : 0), 0);

export const buildHours = (id: string): number =>
  24 * (BUILD_BASE_DAYS + (BUILD_DAYS_PER_TONNE * buildMass(id)) / 1000);
