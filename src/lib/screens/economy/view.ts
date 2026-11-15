import { building, material } from '#lib/game/data/index.ts';
import type { BuildingKind } from '#lib/game/data/index.ts';
import {
  isStockless,
  POWER,
  process,
  type Limit,
  type Site,
  type SiteFlows
} from '#lib/game/economy/index.ts';
import { formatAmount, materialName } from './format.ts';

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
  if (limit.kind === 'power') return 'Short of power';
  if (limit.kind === 'compute') return 'Short of compute';
  if (limit.kind === 'material') return `Short of ${materialName(limit.id)}`;
  if (limit.kind === 'slot') return 'Waiting for a crew';
  return 'Paused';
}

export function mainOutput(site: Site, processId: string): string | undefined {
  const p = process(processId, site.body);
  return Object.entries(p.outputs)
    .filter(([m]) => m !== POWER)
    .sort((a, b) => b[1] - a[1])[0]?.[0];
}

export const perDay = (id: string, perHour: number): string => `${formatAmount(id, perHour * 24)}`;

const KIND_NAMES: Record<BuildingKind, string> = {
  extraction: 'Extraction',
  processing: 'Processing',
  nuclear: 'Nuclear',
  power: 'Power',
  electronics: 'Electronics',
  habitat: 'Habitat and food',
  infrastructure: 'Infrastructure',
  special: 'Special'
};

export const kindName = (kind: BuildingKind): string => KIND_NAMES[kind];

export const buildingName = (id: string): string => building(id).name;

export const unitOf = (id: string): string => (material(id).unit === 'cu' ? 'cu' : '');
