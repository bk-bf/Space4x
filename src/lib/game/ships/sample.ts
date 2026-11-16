import { isSmallBody, regionsOf } from '#lib/game/data/index.ts';

export const SAMPLE_KG = 1;
export const SAMPLE_DAYS = 2;
export const sampleEstimated = true;

export const sampleMaterial = (world: string): string | undefined =>
  isSmallBody(world) ? regionsOf(world)[0]?.deposits[0]?.material : undefined;
