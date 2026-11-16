import type { ShipsState, Vessel } from './types.ts';

const fresh = (): ShipsState => ({ vessels: [], nextId: 1, nextOrder: 1, launches: [], built: 0 });

export const ships: ShipsState = $state(fresh());

export function resetShips(): void {
  Object.assign(ships, fresh());
}

export const vesselById = (id: string): Vessel | undefined => ships.vessels.find((v) => v.id === id);
