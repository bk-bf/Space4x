import { game } from '#lib/game/index.ts';
import type { Colony } from '#lib/game/types.ts';
import { allocate, annualUse } from './sim.ts';
import { economy } from './state.svelte.ts';
import { MINERALS } from './catalog.ts';

export const systemName = (id: string): string => game.world.systems.find((s) => s.id === id)?.name ?? id;

export function colonyWarnings(c: Colony): string[] {
  const out: string[] = [];
  for (const [key, low] of Object.entries(c.lowStock))
    if (low) out.push(`${key} stock is below a year of use`);
  if (allocate(c, economy).some((a) => a.order.waiting)) out.push('Construction is waiting for minerals');
  for (const m of MINERALS)
    if (c.stock[m.id] <= 0 && annualUse(c, m.id, economy) > 0) out.push(`No ${m.name}`);
  return out;
}
