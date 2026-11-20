import reserveRecords from './reserves.json';
import type { ReserveRecord } from './types.ts';

export const RESERVE_WORLD = 'earth';

export const reserves = reserveRecords as ReserveRecord[];

const reserveIndex = new Map(reserves.map((r) => [r.material, r]));

export const reserveOf = (materialId: string): ReserveRecord | undefined => reserveIndex.get(materialId);

export const finiteContent = (worldBody: string, materialId: string): number | undefined => {
  if (worldBody !== RESERVE_WORLD) return undefined;
  return reserveOf(materialId)?.content ?? undefined;
};
