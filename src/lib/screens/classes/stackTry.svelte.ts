import { classes } from '#lib/game/classes.svelte.ts';
import type { ShipDesign } from '#lib/game/shipdesign/index.ts';

export const stackTry: { below: string[]; payload: number } = $state({ below: [], payload: 0 });

export const belowDesigns = (): ShipDesign[] =>
  stackTry.below.flatMap((id) => {
    const d = classes.find(id);
    return d ? [d] : [];
  });

export function addBelow(id: string): void {
  if (classes.find(id)) stackTry.below = [id, ...stackTry.below];
}

export function removeBelow(index: number): void {
  stackTry.below = stackTry.below.filter((_, i) => i !== index);
}

export function setStackPayload(kg: number): void {
  stackTry.payload = Number.isFinite(kg) ? Math.max(0, kg) : 0;
}
