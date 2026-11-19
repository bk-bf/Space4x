import { material } from '#lib/game/data/index.ts';
import { supplyWarnings, type Site, type SiteFlows, type SupplyKind } from '#lib/game/economy/index.ts';
import { fmt } from '#lib/ui/index.ts';

export interface Trouble {
  site: Site;
  kind: SupplyKind;
  material: string | null;
  days: number;
  text: string;
}

const SHORT = 1e-9;

export function siteTroubles(site: Site, flows: SiteFlows, warnDays: number): Trouble[] {
  const now: Trouble[] = [];
  const at = (kind: SupplyKind, text: string, days = 0, m: string | null = null): Trouble => ({
    site,
    kind,
    material: m,
    days,
    text
  });
  if (flows.food.cover < 1 - SHORT) now.push(at('food', `${fmt.pct(flows.food.cover)} fed`));
  if (flows.power.demand > flows.power.supply * (1 + SHORT))
    now.push(at('power', `short of ${fmt.power(flows.power.demand - flows.power.supply)}`));
  if (flows.compute.demand > flows.compute.supply * (1 + SHORT))
    now.push(at('compute', `short of ${fmt.group(flows.compute.demand - flows.compute.supply)} cu/h`));
  const soon = supplyWarnings(site, flows, warnDays)
    .filter((s) => s.days > 1e-6)
    .map((s) =>
      at(
        s.kind,
        `${s.material ? material(s.material).name : 'food'} runs out in ${fmt.days(s.days - 1e-6)}`,
        s.days,
        s.material
      )
    );
  return [...now, ...soon];
}

export function allTroubles(
  sites: readonly Site[],
  flowsOf: (site: Site) => SiteFlows,
  warnDays: number
): Trouble[] {
  return sites.flatMap((s) => siteTroubles(s, flowsOf(s), warnDays)).sort((a, b) => a.days - b.days);
}

export const troubleLine = (t: Trouble): string => `${t.site.name}: ${t.text}`;
