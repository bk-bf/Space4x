import { isStockless, type Limit, type Site, type SiteFlows } from '#lib/game/economy/index.ts';
import { materialName } from './format.ts';

export const SCARCE_DAYS = 365;

export function coverDays(site: Site, flows: SiteFlows, id: string): number {
  const net = flows.net[id] ?? 0;
  const stock = site.stock[id] ?? 0;
  return net < 0 ? stock / -net / 24 : Infinity;
}

export function scarcest(site: Site, flows: SiteFlows): { id: string; days: number } | undefined {
  let best: { id: string; days: number } | undefined;
  for (const a of flows.actors)
    if (a.limit?.kind === 'material' && a.share < a.cap - 1e-9) return { id: a.limit.id, days: 0 };
  for (const id of Object.keys(flows.net)) {
    if (isStockless(id)) continue;
    const days = coverDays(site, flows, id);
    if (days < SCARCE_DAYS && (!best || days < best.days)) best = { id, days };
  }
  return best;
}

export function limitText(limit: Limit | null): string {
  if (!limit) return '';
  if (limit.kind === 'off') return 'Switched off';
  if (limit.kind === 'idle') return 'No recipe yet';
  if (limit.kind === 'workers') return 'Short of workers';
  if (limit.kind === 'upkeep') return 'Upkeep unpaid';
  if (limit.kind === 'power') return 'Short of power';
  if (limit.kind === 'compute') return 'Short of compute';
  if (limit.kind === 'material') return `Short of ${materialName(limit.id)}`;
  if (limit.kind === 'deposit') return `No ${materialName(limit.id).toLowerCase()} in this region`;
  if (limit.kind === 'depleted') return 'Mined out';
  if (limit.kind === 'slot') return 'Waiting for a crew';
  if (limit.kind === 'chassis') return 'Wrong chassis for this gravity';
  if (limit.kind === 'tool') return 'No tool for this material';
  if (limit.kind === 'charging') return 'Short of charging stations';
  return 'Paused';
}
