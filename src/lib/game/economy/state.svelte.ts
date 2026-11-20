import { siteFlows, type SiteFlows } from './flows.ts';
import { acceptOffer, paidShare } from './market.ts';
import { isFood } from './processes.ts';
import { startEconomy } from './start.ts';
import type { Economy, Site } from './types.ts';

export const economy: Economy = $state(startEconomy());

const revision = $state({ n: 0 });
let cache: Record<string, SiteFlows> = {};
let cachedAt = -1;

export function touch(): void {
  revision.n++;
}

export function flowsOf(site: Site): SiteFlows {
  const n = revision.n;
  if (n !== cachedAt) {
    cache = {};
    cachedAt = n;
  }
  const hit = cache[site.id];
  if (hit) return hit;
  const made = siteFlows(economy, site);
  cache[site.id] = made;
  return made;
}

export function siteById(id: string): Site | undefined {
  return economy.sites.find((s) => s.id === id || s.worldBody === id);
}

export function homeSite(): Site {
  const site = economy.sites[0];
  if (!site) throw new Error('the economy has no sites');
  return site;
}

const FOOD_FARMS = 'farmland';

function seedMarket(broke: boolean): void {
  if (broke) economy.market.treasury = 0;
  else for (const o of [...economy.market.offers]) acceptOffer(economy, o.id);
  economy.market.paid = paidShare(economy);
  touch();
}

export function applyScenario(name: string | null, broke = false): void {
  if (name === 'market') return seedMarket(broke);
  if (name !== 'famine') return;
  const site = homeSite();
  for (const g of site.groups) if (g.building === FOOD_FARMS) g.count = Math.round(g.count / 2);
  for (const id of Object.keys(site.stock)) if (isFood(id)) site.stock[id] = 0;
  touch();
}

export function resetEconomy(): void {
  Object.assign(economy, startEconomy());
  touch();
}
