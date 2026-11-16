import { bakedCount, onBaked } from '#lib/gfx/bodies/looks/bake.ts';

export const bakes = $state({ n: bakedCount() });

onBaked(() => {
  bakes.n = bakedCount();
});
