import earth from '#lib/game/data/earth.json';
import { building, material } from '#lib/game/data/index.ts';
import { MONTH_HOURS, MONTH_SECONDS } from './calendar.ts';
import { siteFlows } from './flows.ts';
import { activePlants, isPlant } from './grid.ts';
import { process } from './processes.ts';
import type { Amounts } from '#lib/game/data/index.ts';
import type { Contract, Economy, Group, LogFn, Market, Offer, Site, Terms } from './types.ts';

export const START_TREASURY = 15e9;
export const LEASE_YIELD = 0.015;
export const DOLLARS_PER_BP = 1e9;
export const LEASE_MONTHS = [3, 6, 6, 12, 12, 24] as const;
export const OFFER_PICKS = 3;
export const GOODS_BUILDINGS = ['semiconductor_fab', 'machine_shop', 'data_centre'] as const;
export const OWN_SHARE = { least: 0.05, spread: 0.15 } as const;
export const INDUSTRY_SHARE = { least: 0.005, spread: 0.02 } as const;
export const INDUSTRY_MIN_COUNT = 20;
export const INDUSTRY_GROUPS = 14;
export const SUPPLY_GOODS = ['machinery', 'rad_hard_ic'] as const;
export const SUPPLY_SKIP = 0.4;
export const SUPPLY_SHARE = { least: 0.1, spread: 0.3 } as const;
export const SUPPLY_PRICE = { least: 0.8, spread: 0.7 } as const;
export const DEMAND = { least: 0.6, spread: 1 } as const;

const DUE_EPS = 1e-6;
const STOCK_EPS = 1e-9;

export function rng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const startMarket = (): Market => ({
  treasury: START_TREASURY,
  paid: 1,
  month: 0,
  offers: [],
  contracts: []
});

export const monthOf = (elapsedSeconds: number): number =>
  Math.floor((elapsedSeconds + DUE_EPS) / MONTH_SECONDS);

const home = (eco: Economy): Site => {
  const site = eco.sites[0];
  if (!site) throw new Error('the economy has no sites');
  return site;
};

const ownKeys: { building: string; process: string | null }[] = earth.groups
  .filter((g) => isPlant(g.building) || (GOODS_BUILDINGS as readonly string[]).includes(g.building))
  .map((g) => ({ building: g.building, process: g.process }));

const isOwn = (buildingId: string): boolean =>
  isPlant(buildingId) || (GOODS_BUILDINGS as readonly string[]).includes(buildingId);

const matches = (g: Group, buildingId: string, processId: string | null): boolean =>
  g.on && g.building === buildingId && g.process === processId;

const running = (g: Group): number => (isPlant(g.building) ? activePlants(g) : g.count);

export const freeCount = (site: Site, buildingId: string, processId: string | null): number =>
  site.groups.filter((g) => matches(g, buildingId, processId)).reduce((a, g) => a + running(g), 0);

export const leasable = (buildingId: string): boolean => building(buildingId).bp !== undefined;

export function industryGroups(site: Site): Group[] {
  return site.groups
    .filter(
      (g) => g.on && g.process && g.count >= INDUSTRY_MIN_COUNT && !isOwn(g.building) && leasable(g.building)
    )
    .sort((a, b) => b.count - a.count)
    .slice(0, INDUSTRY_GROUPS);
}

const leasePays = (buildingId: string, count: number, demand: number): number =>
  count * (building(buildingId).bp ?? 0) * DOLLARS_PER_BP * LEASE_YIELD * demand;

export function makeOffers(eco: Economy, month: number): Offer[] {
  const r = rng(month * 7919 + 13);
  const pick = <T>(list: readonly T[]): T => list[Math.floor(r() * list.length)]!;
  const months = () => pick(LEASE_MONTHS);
  const demand = () => DEMAND.least + r() * DEMAND.spread;
  const site = home(eco);
  let produced: Amounts | undefined;
  const madeAMonth = (id: string) => ((produced ??= siteFlows(eco, site).produced)[id] ?? 0) * MONTH_HOURS;
  const out: Offer[] = [];
  for (let i = 0; i < OFFER_PICKS; i++) {
    const key = pick(ownKeys);
    const free = freeCount(site, key.building, key.process);
    if (free < 1 || !leasable(key.building)) continue;
    const count = Math.max(1, Math.round(free * (OWN_SHARE.least + r() * OWN_SHARE.spread)));
    const length = months();
    out.push({
      id: eco.nextId++,
      kind: 'lease',
      building: key.building,
      process: key.process,
      count,
      months: length,
      pays: leasePays(key.building, count, demand())
    });
  }
  const groups = industryGroups(site);
  for (let i = 0; i < OFFER_PICKS && groups.length; i++) {
    const g = pick(groups);
    const count = Math.max(1, Math.round(g.count * (INDUSTRY_SHARE.least + r() * INDUSTRY_SHARE.spread)));
    const length = months();
    out.push({
      id: eco.nextId++,
      kind: 'lease',
      building: g.building,
      process: g.process,
      count,
      months: length,
      pays: leasePays(g.building, count, demand())
    });
  }
  for (const m of SUPPLY_GOODS) {
    if (r() < SUPPLY_SKIP) continue;
    const tonnes = madeAMonth(m) / 1000 || 1;
    const amount = Math.round(tonnes * (SUPPLY_SHARE.least + r() * SUPPLY_SHARE.spread) * 10) / 10;
    const length = months();
    out.push({
      id: eco.nextId++,
      kind: 'supply',
      material: m,
      amount: amount * 1000,
      months: length,
      pays: amount * 1000 * (material(m).price ?? 0) * (SUPPLY_PRICE.least + r() * SUPPLY_PRICE.spread)
    });
  }
  return out;
}

export function upkeepDue(eco: Economy): number {
  let due = 0;
  for (const site of eco.sites)
    for (const g of site.groups) {
      if (!g.on || !g.process) continue;
      const each = process(g.process, site.body).upkeep;
      if (each > 0) due += each * g.count;
    }
  return due;
}

export const leaseIncome = (eco: Economy): number =>
  eco.market.contracts.reduce((a, c) => a + (c.kind === 'lease' ? c.pays : 0), 0);

export function paidShare(eco: Economy): number {
  const due = upkeepDue(eco);
  if (due <= 0) return 1;
  return Math.max(0, Math.min(1, (eco.market.treasury + leaseIncome(eco)) / due));
}

export const canAccept = (eco: Economy, o: Offer): boolean =>
  o.kind === 'supply' || freeCount(home(eco), o.building, o.process) >= o.count;

export function contractName(t: Terms): string {
  return t.kind === 'lease' ? building(t.building).name : material(t.material).name;
}

function take(site: Site, buildingId: string, processId: string | null, count: number): void {
  let left = count;
  for (const g of [...site.groups]) {
    if (left <= 0) break;
    if (!matches(g, buildingId, processId)) continue;
    const n = Math.min(left, running(g));
    if (n <= 0) continue;
    g.count -= n;
    if (g.active !== undefined) {
      g.active -= n;
      if (g.active >= g.count) delete g.active;
    }
    left -= n;
    if (g.count <= 0) site.groups.splice(site.groups.indexOf(g), 1);
  }
}

function release(
  eco: Economy,
  site: Site,
  buildingId: string,
  processId: string | null,
  count: number
): void {
  const g = site.groups.find((x) => matches(x, buildingId, processId));
  if (!g) {
    site.groups.push({ id: eco.nextId++, building: buildingId, process: processId, count, on: true });
    return;
  }
  g.count += count;
  if (g.active !== undefined) g.active += count;
}

export function acceptOffer(eco: Economy, offerId: number, log?: LogFn): boolean {
  const m = eco.market;
  const o = m.offers.find((x) => x.id === offerId);
  if (!o || !canAccept(eco, o)) return false;
  const site = home(eco);
  if (o.kind === 'lease') take(site, o.building, o.process, o.count);
  m.offers.splice(m.offers.indexOf(o), 1);
  m.contracts.push({ ...o, left: o.months, due: eco.elapsed + MONTH_SECONDS, missed: false });
  m.paid = paidShare(eco);
  log?.(`Contract signed: ${contractName(o)}.`, false, eco.elapsed, site.id);
  return true;
}

export function chargeUpkeep(eco: Economy, hours: number): void {
  const m = eco.market;
  if (m.paid <= 0 || hours <= 0) return;
  m.treasury -= (upkeepDue(eco) * m.paid * hours) / MONTH_HOURS;
}

export function marketHours(eco: Economy): number {
  const m = eco.market;
  let at = (monthOf(eco.elapsed) + 1) * MONTH_SECONDS;
  for (const c of m.contracts) at = Math.min(at, c.due);
  return Math.max(0, (at - eco.elapsed) / 3600);
}

function settle(eco: Economy, c: Contract, log: LogFn): void {
  const m = eco.market;
  const site = home(eco);
  const at = c.due;
  if (c.kind === 'lease') m.treasury += c.pays;
  else {
    const have = site.stock[c.material] ?? 0;
    c.missed = have < c.amount - STOCK_EPS;
    if (!c.missed) {
      site.stock[c.material] = Math.max(0, have - c.amount);
      m.treasury += c.pays;
    }
  }
  c.left -= 1;
  c.due += MONTH_SECONDS;
  if (c.left > 0) return;
  if (c.kind === 'lease') release(eco, site, c.building, c.process, c.count);
  m.contracts.splice(m.contracts.indexOf(c), 1);
  log(`Contract ended: ${contractName(c)}.`, false, at, site.id);
}

function startMonth(eco: Economy, month: number, log: LogFn): void {
  const m = eco.market;
  const before = m.paid;
  m.month = month;
  m.offers = makeOffers(eco, month);
  m.paid = paidShare(eco);
  const pct = Math.round(m.paid * 100);
  if (m.paid < 1 - 1e-9 && Math.round(before * 100) !== pct)
    log(`Upkeep unpaid: buildings run at ${pct}%.`, true, eco.elapsed, home(eco).id);
  else if (m.paid >= 1 - 1e-9 && before < 1 - 1e-9)
    log('Upkeep is paid in full again.', false, eco.elapsed, home(eco).id);
}

export function marketEvents(eco: Economy, log: LogFn): void {
  const m = eco.market;
  for (;;) {
    const due = m.contracts
      .filter((c) => c.due <= eco.elapsed + DUE_EPS)
      .sort((a, b) => a.due - b.due || a.id - b.id)[0];
    if (!due) break;
    settle(eco, due, log);
  }
  const month = monthOf(eco.elapsed);
  if (month > m.month) startMonth(eco, month, log);
}

export interface MarketLedger {
  leases: number;
  supply: number;
  upkeep: number;
  net: number;
}

export function marketLedger(eco: Economy): MarketLedger {
  const m = eco.market;
  const site = home(eco);
  const leases = leaseIncome(eco);
  const supply = m.contracts.reduce(
    (a, c) => a + (c.kind === 'supply' && (site.stock[c.material] ?? 0) >= c.amount - STOCK_EPS ? c.pays : 0),
    0
  );
  const upkeep = upkeepDue(eco) * m.paid;
  return { leases, supply, upkeep, net: leases + supply - upkeep };
}
