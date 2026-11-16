import { economy } from '#lib/game/economy/index.ts';
import { registerClassUse } from '#lib/game/classes.svelte.ts';
import { ships } from './state.svelte.ts';

registerClassUse(
  (id) =>
    ships.vessels.some((v) => v.design === id) ||
    economy.sites.some((s) => s.yard.some((o) => o.design === id))
);

export { ships, resetShips, vesselById } from './state.svelte.ts';
export { advanceShips, spawnDeliveries } from './advance.ts';
export * from './build.ts';
export * from './cargo.ts';
export * from './colonise.ts';
export * from './hop.ts';
export * from './launch.ts';
export * from './model.ts';
export * from './orders.ts';
export * from './run.ts';
export * from './scenario.ts';
export * from './supply.ts';
export * from './trips.ts';
export * from './world.ts';
export type * from './types.ts';
