import { bodyTypeOf } from '#lib/game/data/index.ts';
import type { SiteNeed } from '#lib/game/data/index.ts';
import type { Economy, Site } from './types.ts';

const standingAt = (site: Site, buildingId: string): number =>
  site.groups.filter((g) => g.building === buildingId).reduce((a, g) => a + g.count, 0);

const where = (site: Site, need: SiteNeed): boolean =>
  (need.world === undefined || site.worldBody === need.world) &&
  (need.body === undefined || bodyTypeOf(site.worldBody) === need.body) &&
  (need.place === undefined || site.place === need.place) &&
  (need.region === undefined || site.region === need.region);

export const siteNeedMet = (site: Site, need: SiteNeed): boolean =>
  where(site, need) &&
  (need.buildings ?? []).every((b) => standingAt(site, b) > 0) &&
  site.population >= (need.people ?? 0) &&
  (!need.fed || (site.population > 0 && !site.alerts.food)) &&
  (!need.stock || (site.stock[need.stock.material] ?? 0) >= need.stock.amount) &&
  (!need.made || (site.made[need.made.material] ?? 0) >= need.made.amount) &&
  Object.entries(need.ran ?? {}).every(([b, hours]) => (site.ran[b] ?? 0) >= hours) &&
  site.built >= (need.built ?? 0);

export function siteNeedProgress(eco: Economy, need: SiteNeed): number | undefined {
  const best = (read: (s: Site) => number, target: number): number =>
    Math.min(1, Math.max(0, ...eco.sites.filter((s) => where(s, need)).map(read)) / target);
  if (need.made) return best((s) => s.made[need.made!.material] ?? 0, need.made.amount);
  const ran = Object.entries(need.ran ?? {})[0];
  if (ran) return best((s) => s.ran[ran[0]] ?? 0, ran[1]);
  return undefined;
}

export function siteNeedMissing(eco: Economy, need: SiteNeed): string | undefined {
  if (need.flown) return (eco.flown[need.flown] ?? 0) > 0 ? undefined : need.label;
  return eco.sites.some((s) => siteNeedMet(s, need)) ? undefined : need.label;
}
