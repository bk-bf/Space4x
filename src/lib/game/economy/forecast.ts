import { building, material } from '#lib/game/data/index.ts';
import { kcalOf, STOCK_EPS, type SiteFlows } from './flows.ts';
import { foodIds, isStockless, POWER } from './processes.ts';
import type { Site } from './types.ts';

export type SupplyKind = 'food' | 'power' | 'compute';

export interface Supply {
  key: string;
  kind: SupplyKind;
  material: string | null;
  building: string | null;
  days: number;
}

const HOURS_PER_DAY = 24;

const daysOf = (held: number, lossPerHour: number): number =>
  lossPerHour <= 0 ? Infinity : Math.max(0, held) / lossPerHour / HOURS_PER_DAY;

function foodSupply(site: Site, flows: SiteFlows): Supply[] {
  if (!(site.population > 0) || !(flows.food.demand > 0)) return [];
  let held = 0;
  let loss = 0;
  for (const m of foodIds) {
    const k = kcalOf(m);
    held += (site.stock[m] ?? 0) * k;
    loss -= (flows.net[m] ?? 0) * k;
  }
  if (held <= STOCK_EPS && flows.food.cover >= 1 - 1e-9) return [];
  return [{ key: 'food', kind: 'food', material: null, building: null, days: daysOf(held, loss) }];
}

function fuelSupply(site: Site, flows: SiteFlows, kind: 'power' | 'compute'): Supply[] {
  const out = kind === 'power' ? POWER : 'compute';
  const seen = new Map<string, string>();
  for (const a of flows.actors)
    if (a.kind === 'group' && a.cap > 0 && (a.outputs[out] ?? 0) > 0)
      for (const m of Object.keys(a.inputs))
        if (!isStockless(m) && !seen.has(m)) seen.set(m, a.group.building);
  return [...seen].map(([m, b]) => ({
    key: `${kind}:${m}`,
    kind,
    material: m,
    building: b,
    days: daysOf(site.stock[m] ?? 0, -(flows.net[m] ?? 0))
  }));
}

export function siteSupplies(site: Site, flows: SiteFlows): Supply[] {
  return [
    ...foodSupply(site, flows),
    ...fuelSupply(site, flows, 'power'),
    ...fuelSupply(site, flows, 'compute')
  ];
}

export const runsOutWithin = (s: Supply, days: number): boolean => s.days <= days + 1e-6;

export function supplyWarnings(site: Site, flows: SiteFlows, days: number): Supply[] {
  return siteSupplies(site, flows)
    .filter((s) => runsOutWithin(s, days))
    .sort((a, b) => a.days - b.days);
}

export function nextWarning(site: Site, flows: SiteFlows, days: number): number {
  let t = Infinity;
  for (const s of siteSupplies(site, flows))
    if (Number.isFinite(s.days) && !runsOutWithin(s, days)) t = Math.min(t, (s.days - days) * HOURS_PER_DAY);
  return t;
}

const dayText = (days: number): string => {
  const n = Math.max(1, Math.ceil(days - 1e-6));
  return n === 1 ? '1 day' : `${n} days`;
};

export function supplyText(site: Site, s: Supply): string {
  const when = dayText(s.days);
  if (s.kind === 'food') return `${site.name} runs out of food in ${when}.`;
  const what = material(s.material!).name;
  const by = building(s.building!).name;
  return s.kind === 'power'
    ? `${site.name} runs out of ${what} in ${when}; its ${by} will stop and power will fail.`
    : `${site.name} runs out of ${what} in ${when}; its ${by} will stop making compute.`;
}
