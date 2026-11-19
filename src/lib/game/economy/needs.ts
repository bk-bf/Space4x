import { bodyTypeOf } from '#lib/game/data/index.ts';
import type { Body, SiteNeed } from '#lib/game/data/index.ts';
import type { Economy, Site, SitePlace } from './types.ts';

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

export type Criterion =
  | { kind: 'world'; id: string; ok: boolean }
  | { kind: 'body'; body: Body; ok: boolean }
  | { kind: 'place'; place: SitePlace; ok: boolean }
  | { kind: 'region'; id: string; ok: boolean }
  | { kind: 'building'; id: string; ok: boolean }
  | { kind: 'people'; need: number; have: number; ok: boolean }
  | { kind: 'fed'; ok: boolean }
  | { kind: 'stock'; material: string; need: number; have: number; ok: boolean }
  | { kind: 'made'; material: string; need: number; have: number; ok: boolean }
  | { kind: 'ran'; id: string; need: number; have: number; ok: boolean }
  | { kind: 'built'; need: number; have: number; ok: boolean }
  | { kind: 'flown'; id: string; ok: boolean };

export interface SiteNeedCheck {
  site: Site | undefined;
  criteria: Criterion[];
}

function placeCriteria(site: Site | undefined, need: SiteNeed): Criterion[] {
  const out: Criterion[] = [];
  if (need.world !== undefined)
    out.push({ kind: 'world', id: need.world, ok: site?.worldBody === need.world });
  if (need.body !== undefined)
    out.push({ kind: 'body', body: need.body, ok: !!site && bodyTypeOf(site.worldBody) === need.body });
  if (need.place !== undefined)
    out.push({ kind: 'place', place: need.place, ok: site?.place === need.place });
  if (need.region !== undefined)
    out.push({ kind: 'region', id: need.region, ok: site?.region === need.region });
  return out;
}

function siteCriteria(site: Site | undefined, need: SiteNeed): Criterion[] {
  const read = (f: (s: Site) => number): number => (site ? f(site) : 0);
  const out = placeCriteria(site, need);
  for (const id of need.buildings ?? [])
    out.push({ kind: 'building', id, ok: read((s) => standingAt(s, id)) > 0 });
  if (need.people !== undefined) {
    const have = read((s) => s.population);
    out.push({ kind: 'people', need: need.people, have, ok: have >= need.people });
  }
  if (need.fed) out.push({ kind: 'fed', ok: !!site && site.population > 0 && !site.alerts.food });
  if (need.stock) {
    const { material, amount } = need.stock;
    const have = read((s) => s.stock[material] ?? 0);
    out.push({ kind: 'stock', material, need: amount, have, ok: have >= amount });
  }
  if (need.made) {
    const { material, amount } = need.made;
    const have = read((s) => s.made[material] ?? 0);
    out.push({ kind: 'made', material, need: amount, have, ok: have >= amount });
  }
  for (const [id, hours] of Object.entries(need.ran ?? {})) {
    const have = read((s) => s.ran[id] ?? 0);
    out.push({ kind: 'ran', id, need: hours, have, ok: have >= hours });
  }
  if (need.built !== undefined) {
    const have = read((s) => s.built);
    out.push({ kind: 'built', need: need.built, have, ok: have >= need.built });
  }
  return out;
}

const metCount = (c: Criterion[]): number => c.filter((x) => x.ok).length;

export function siteNeedCheck(eco: Economy, need: SiteNeed): SiteNeedCheck {
  if (need.flown)
    return {
      site: undefined,
      criteria: [{ kind: 'flown', id: need.flown, ok: (eco.flown[need.flown] ?? 0) > 0 }]
    };
  let best: SiteNeedCheck = { site: undefined, criteria: siteCriteria(undefined, need) };
  for (const site of eco.sites) {
    if (!where(site, need)) continue;
    const criteria = siteCriteria(site, need);
    if (!best.site || metCount(criteria) > metCount(best.criteria)) best = { site, criteria };
  }
  return best;
}
