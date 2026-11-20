import { describe, expect, it } from 'vitest';
import { building, material } from '#lib/game/data/index.ts';
import {
  acceptOffer,
  advanceEconomy,
  DEMAND,
  DOLLARS_PER_BP,
  freeCount,
  GOODS_BUILDINGS,
  isPlant,
  LEASE_MONTHS,
  LEASE_YIELD,
  makeOffers,
  marketLedger,
  MONTH_SECONDS,
  paidShare,
  siteFlows,
  START_TREASURY,
  startEconomy,
  upkeepDue,
  type Economy,
  type GroupActor,
  type Offer,
  type Site
} from './index.ts';

const DAY = 86400;

const earthOf = (eco: Economy): Site => eco.sites[0]!;

const leaseOf = (eco: Economy, pick: (o: Offer & { kind: 'lease' }) => boolean) => {
  for (let month = 0; month < 200; month++) {
    const o = makeOffers(eco, month).find(
      (x): x is Offer & { kind: 'lease' } => x.kind === 'lease' && pick(x)
    );
    if (o) {
      eco.market.offers = [o];
      return o;
    }
  }
  throw new Error('no such offer');
};

const supplyOf = (eco: Economy, materialId: string) => {
  for (let month = 0; month < 200; month++) {
    const o = makeOffers(eco, month).find(
      (x): x is Offer & { kind: 'supply' } => x.kind === 'supply' && x.material === materialId
    );
    if (o) {
      eco.market.offers = [o];
      return o;
    }
  }
  throw new Error('no such offer');
};

describe('the market', () => {
  it('starts with $15B and the first month of offers', () => {
    const eco = startEconomy();
    expect(eco.market.treasury).toBe(START_TREASURY);
    expect(eco.market.paid).toBe(1);
    expect(eco.market.offers.length).toBeGreaterThan(0);
    expect(eco.market.contracts).toEqual([]);
  });

  it('makes the same offers for the same month and prices them from capital cost and demand', () => {
    const eco = startEconomy();
    const site = earthOf(eco);
    for (let month = 0; month < 60; month++) {
      const a = makeOffers(eco, month).map(({ id: _, ...o }) => o);
      const b = makeOffers(eco, month).map(({ id: _, ...o }) => o);
      expect(a).toEqual(b);
      for (const o of a) {
        expect(LEASE_MONTHS).toContain(o.months);
        if (o.kind === 'supply') {
          expect(['machinery', 'rad_hard_ic']).toContain(o.material);
          const perKg = o.pays / o.amount / material(o.material).price!;
          expect(perKg).toBeGreaterThanOrEqual(0.8 - 1e-9);
          expect(perKg).toBeLessThanOrEqual(1.5 + 1e-9);
          continue;
        }
        const bp = building(o.building).bp;
        expect(bp).toBeDefined();
        const demand = o.pays / (o.count * bp! * DOLLARS_PER_BP * LEASE_YIELD);
        expect(demand).toBeGreaterThanOrEqual(DEMAND.least - 1e-9);
        expect(demand).toBeLessThanOrEqual(DEMAND.least + DEMAND.spread + 1e-9);
        const free = freeCount(site, o.building, o.process);
        const own = isPlant(o.building) || (GOODS_BUILDINGS as readonly string[]).includes(o.building);
        if (own) expect(o.count).toBeLessThanOrEqual(Math.max(1, Math.round(free * 0.2)));
        else {
          expect(free).toBeGreaterThanOrEqual(20);
          expect(o.count).toBeLessThanOrEqual(Math.max(1, Math.round(free * 0.025)));
        }
      }
    }
  });

  it('leaves buildings without a capital cost out of the lease offers', () => {
    const eco = startEconomy();
    for (let month = 0; month < 120; month++)
      for (const o of makeOffers(eco, month))
        if (o.kind === 'lease') expect(building(o.building).bp, o.building).toBeDefined();
  });

  it('takes leased buildings out of use, pays every month and returns them when the lease ends', () => {
    const eco = startEconomy();
    const site = earthOf(eco);
    const o = leaseOf(eco, (x) => x.building === 'coal_power_station' && x.months === 3);
    const before = freeCount(site, o.building, o.process);
    const treasury = eco.market.treasury;
    expect(acceptOffer(eco, o.id)).toBe(true);
    expect(freeCount(site, o.building, o.process)).toBe(before - o.count);
    expect(eco.market.offers).toEqual([]);
    advanceEconomy(eco, MONTH_SECONDS + 1);
    expect(eco.market.treasury).toBeCloseTo(treasury + o.pays - upkeepDue(eco), -3);
    expect(eco.market.contracts[0]!.left).toBe(2);
    advanceEconomy(eco, 2 * MONTH_SECONDS);
    expect(eco.market.contracts).toEqual([]);
    expect(freeCount(site, o.building, o.process)).toBe(before);
  });

  it('refuses a lease of more buildings than are free', () => {
    const eco = startEconomy();
    const site = earthOf(eco);
    const o = leaseOf(eco, (x) => x.building === 'data_centre');
    for (const g of site.groups) if (g.building === 'data_centre') g.on = false;
    expect(acceptOffer(eco, o.id)).toBe(false);
    expect(eco.market.contracts).toEqual([]);
  });

  it('delivers supply from stock each month and pays only for what it delivers', () => {
    const eco = startEconomy();
    const site = earthOf(eco);
    const o = supplyOf(eco, 'rad_hard_ic');
    expect(acceptOffer(eco, o.id)).toBe(true);
    for (const g of site.groups) if (g.process === 'rad_hard_ic_fabrication') g.on = false;
    site.stock.rad_hard_ic = o.amount;
    const treasury = eco.market.treasury;
    advanceEconomy(eco, MONTH_SECONDS + 1);
    const c = eco.market.contracts[0]!;
    expect(c.missed).toBe(false);
    expect(site.stock.rad_hard_ic).toBeCloseTo(0, 6);
    expect(eco.market.treasury).toBeCloseTo(treasury + o.pays - upkeepDue(eco), -3);
    const second = eco.market.treasury;
    advanceEconomy(eco, MONTH_SECONDS);
    expect(c.missed).toBe(true);
    expect(eco.market.treasury).toBeCloseTo(second - upkeepDue(eco), -3);
  });

  it('runs buildings with upkeep at the share the treasury and lease income can pay', () => {
    const eco = startEconomy();
    const site = earthOf(eco);
    const due = upkeepDue(eco);
    expect(due).toBeGreaterThan(0);
    eco.market.treasury = due / 4;
    eco.market.paid = paidShare(eco);
    expect(eco.market.paid).toBeCloseTo(0.25, 6);
    const flows = siteFlows(eco, site);
    const dc = flows.actors.find(
      (a): a is GroupActor => a.kind === 'group' && a.group.process === 'compute_generation'
    )!;
    expect(dc.cap).toBeCloseTo(0.25, 6);
    expect(dc.limit).toEqual({ kind: 'upkeep' });
    const farm = flows.actors.find(
      (a): a is GroupActor => a.kind === 'group' && a.group.process === 'farm_wheat'
    )!;
    expect(farm.limit).toBeNull();
    advanceEconomy(eco, MONTH_SECONDS + 1);
    expect(eco.market.treasury).toBeCloseTo(0, -3);
    expect(eco.market.paid).toBeLessThan(1e-6);
    expect(marketLedger(eco).upkeep).toBeLessThan(1);
    const o = leaseOf(eco, (x) => isPlant(x.building));
    acceptOffer(eco, o.id);
    expect(eco.market.paid).toBeCloseTo(Math.min(1, (eco.market.treasury + o.pays) / due), 6);
    expect(paidShare(eco)).toBeCloseTo(eco.market.paid, 9);
  });

  it('gives the same treasury and contracts for one long step as for many short ones', () => {
    const run = (step: number) => {
      const eco = startEconomy();
      const lease = eco.market.offers.find((o) => o.kind === 'lease')!;
      acceptOffer(eco, lease.id);
      for (let t = 0; t < 400 * DAY - 1; t += step * DAY) advanceEconomy(eco, step * DAY);
      return eco;
    };
    const a = run(1);
    const b = run(400);
    expect(a.market.treasury).toBeCloseTo(b.market.treasury, -2);
    expect(a.market.month).toBe(b.market.month);
    expect(a.market.offers.map((o) => o.pays)).toEqual(b.market.offers.map((o) => o.pays));
    expect(a.market.contracts.length).toBe(b.market.contracts.length);
  });

  it('brings new offers every month', () => {
    const eco = startEconomy();
    const first = eco.market.offers.map((o) => o.id);
    advanceEconomy(eco, MONTH_SECONDS + 1);
    expect(eco.market.month).toBe(1);
    expect(eco.market.offers.map((o) => o.id)).not.toEqual(first);
  });
});
