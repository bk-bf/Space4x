import { describe, expect, it } from 'vitest';
import { milestone, milestones, material } from '#lib/game/data/index.ts';
import { newSite } from './index.ts';
import {
  advanceEconomy,
  assign,
  isMass,
  moveOrder,
  pauseOrder,
  programmeDays,
  programmeStatus,
  queueBuilding,
  removeOrder,
  setOn,
  siteFlows,
  startEconomy,
  startProgramme,
  isUnlocked,
  unlockedProcesses,
  type Economy,
  type GroupActor,
  type Site
} from './index.ts';

const DAY = 86400;

const earthOf = (eco: Economy): Site => {
  const site = eco.sites[0];
  if (!site) throw new Error('no site');
  return site;
};

const groupOf = (site: Site, process: string) => {
  const g = site.groups.find((x) => x.process === process);
  if (!g) throw new Error(`no group running ${process}`);
  return g;
};

const actorOf = (eco: Economy, site: Site, groupId: number): GroupActor => {
  const a = siteFlows(eco, site).actors.find((x) => x.kind === 'group' && x.group.id === groupId);
  if (!a || a.kind !== 'group') throw new Error('no actor');
  return a;
};

const stockMass = (site: Site) =>
  Object.entries(site.stock).reduce((a, [m, v]) => a + (isMass(m) ? v : 0), 0);

const close = (a: number, b: number, rel = 1e-9) =>
  expect(Math.abs(a - b)).toBeLessThanOrEqual(rel * Math.max(1, Math.abs(a), Math.abs(b)));

describe('the start state', () => {
  it('is present-day Earth alone, fed with a modest surplus', () => {
    const eco = startEconomy();
    expect(eco.sites.map((s) => s.id)).toEqual(['earth']);
    const site = earthOf(eco);
    expect(site.population).toBeGreaterThan(7.5e9);
    const f = siteFlows(eco, site);
    expect(f.food.cover).toBe(1);
    expect(f.food.made / f.food.demand).toBeGreaterThan(1.02);
    expect(f.food.made / f.food.demand).toBeLessThan(1.1);
    expect(f.growthPerHour).toBeGreaterThan(0);
  });

  it('runs every start group at full rate within its power and workers', () => {
    const eco = startEconomy();
    const site = earthOf(eco);
    const f = siteFlows(eco, site);
    for (const a of f.actors)
      if (a.kind === 'group' && a.group.process) expect(a.share, a.group.process).toBe(1);
    expect(f.power.demand).toBeLessThan(f.power.supply);
    expect(f.workers.needed).toBeLessThan(f.workers.available);
  });

  it('unlocks only the first milestone records and nothing is done', () => {
    const eco = startEconomy();
    expect(eco.done).toEqual([]);
    expect(isUnlocked(eco, { milestone: 0 })).toBe(true);
    expect(isUnlocked(eco, { milestone: 1 })).toBe(true);
    expect(isUnlocked(eco, { milestone: 2 })).toBe(false);
    const site = earthOf(eco);
    expect(unlockedProcesses(eco, site, 'polymer_plant').map((p) => p.id)).not.toContain(
      'polyimide_synthesis'
    );
  });
});

describe('production', () => {
  it('gives the same totals for one 30-day step as for 30 one-day steps, through a shortage', () => {
    const run = (steps: number[]) => {
      const eco = startEconomy();
      const site = earthOf(eco);
      setOn(site, groupOf(site, 'extract:chromium').id, false);
      site.stock.chromium = 1e6;
      queueBuilding(eco, site, 'farmland', 'farm_wheat', 2);
      for (const s of steps) advanceEconomy(eco, s);
      return site;
    };
    const one = run([30 * DAY]);
    const many = run(Array.from({ length: 30 }, () => DAY));
    for (const m of new Set([...Object.keys(one.stock), ...Object.keys(many.stock)]))
      close(one.stock[m] ?? 0, many.stock[m] ?? 0, 1e-7);
    close(one.population, many.population);
    expect(one.stock.chromium).toBe(0);
    expect(one.groups.filter((g) => g.building === 'farmland').reduce((a, g) => a + g.count, 0)).toBe(
      many.groups.filter((g) => g.building === 'farmland').reduce((a, g) => a + g.count, 0)
    );
  });

  it('conserves mass: stock change is extraction less eating, building and process losses', () => {
    const eco = startEconomy();
    const site = earthOf(eco);
    const before = stockMass(site);
    queueBuilding(eco, site, 'alloy_works', 'grcop_42_melting', 2);
    assign(eco, site, groupOf(site, 'stainless_steel_304').id, 'grcop_42_melting', 5);
    advanceEconomy(eco, 5 * DAY);
    expect(startProgramme(eco, site, 1)).toBe(true);
    advanceEconomy(eco, 200 * DAY);
    const { extracted, eaten, built, lost } = eco.ledger;
    expect(lost).toBeGreaterThanOrEqual(0);
    expect(built).toBeGreaterThan(0);
    close(stockMass(site) - before, extracted - eaten - built - lost, 1e-6);
  });

  it('scales a recipe down in proportion when an input runs out', () => {
    const eco = startEconomy();
    const site = earthOf(eco);
    const mines = groupOf(site, 'extract:chromium');
    const steel = groupOf(site, 'stainless_steel_304');
    const before = siteFlows(eco, site);
    const supply = before.produced.chromium ?? 0;
    setOn(site, mines.id, false);
    const half = Math.round(mines.count / 2);
    assign(eco, site, mines.id, 'extract:chromium', 0);
    site.groups.push({ ...mines, id: 9999, count: half, on: true });
    site.stock.chromium = 0;
    const a = actorOf(eco, site, steel.id);
    const f = siteFlows(eco, site);
    const used = f.consumed.chromium ?? 0;
    expect(a.share).toBeGreaterThan(0.3);
    expect(a.share).toBeLessThan(0.6);
    expect(a.limit).toEqual({ kind: 'material', id: 'chromium' });
    close(used, f.produced.chromium ?? 0, 1e-9);
    expect(f.produced.chromium ?? 0).toBeLessThan(supply);
  });

  it('scales powered work down when generation falls short, and leaves unpowered farms alone', () => {
    const eco = startEconomy();
    const site = earthOf(eco);
    const demand = siteFlows(eco, site).power.demand;
    site.gridKw = demand / 2;
    const f = siteFlows(eco, site);
    close(f.power.used, site.gridKw, 1e-9);
    expect(actorOf(eco, site, groupOf(site, 'lch4_liquefaction').id).limit).toEqual({ kind: 'power' });
    expect(actorOf(eco, site, groupOf(site, 'farm_wheat').id).share).toBe(1);
  });

  it('lets the player switch some or all of a group to another recipe and switch it off', () => {
    const eco = startEconomy();
    const site = earthOf(eco);
    const steel = groupOf(site, 'stainless_steel_304');
    const count = steel.count;
    const moved = assign(eco, site, steel.id, 'grcop_42_melting', 10);
    expect(moved?.count).toBe(10);
    expect(steel.count).toBe(count - 10);
    expect(assign(eco, site, steel.id, 'polyimide_synthesis', 1)).toBeUndefined();
    setOn(site, steel.id, false);
    expect(actorOf(eco, site, steel.id).share).toBe(0);
    expect(siteFlows(eco, site).produced.grcop).toBeGreaterThan(0);
  });
});

describe('compute', () => {
  it('is a rate: consumers scale to what data centres produce, and nothing is stockpiled', () => {
    const eco = startEconomy();
    eco.done.push(1, 2, 3, 4);
    const site = earthOf(eco);
    site.stock.ai_accelerator = 1000;
    site.groups.push({
      id: 900,
      building: 'data_centre',
      process: 'compute_generation',
      count: 10,
      on: true
    });
    site.groups.push({ id: 901, building: 'data_centre', process: 'ai_model_training', count: 1, on: true });
    const f = siteFlows(eco, site);
    expect(f.compute.supply).toBe(10_000);
    expect(f.compute.demand).toBe(100_000);
    close(actorOf(eco, site, 901).share, 0.1);
    expect(actorOf(eco, site, 901).limit).toEqual({ kind: 'compute' });
    advanceEconomy(eco, DAY);
    expect(site.stock.compute).toBeUndefined();
    close(site.stock.ai_models ?? 0, 2.4, 1e-6);
  });
});

describe('population and food', () => {
  it('grows while fed and shrinks while starved', () => {
    const eco = startEconomy();
    const site = earthOf(eco);
    const p0 = site.population;
    advanceEconomy(eco, 30 * DAY);
    expect(site.population).toBeGreaterThan(p0);
    for (const g of site.groups) if (g.building === 'farmland') g.count = Math.round(g.count / 2);
    for (const m of ['wheat', 'potato', 'soybean', 'leafy_greens']) site.stock[m] = 0;
    const p1 = site.population;
    const logs: string[] = [];
    advanceEconomy(eco, 30 * DAY, (t) => logs.push(t));
    expect(siteFlows(eco, site).food.cover).toBeLessThan(0.6);
    expect(site.population).toBeLessThan(p1);
    expect(logs.some((t) => t.includes('short of food'))).toBe(true);
  });

  it('draws down food stocks before anyone goes hungry', () => {
    const eco = startEconomy();
    const site = earthOf(eco);
    for (const g of site.groups) if (g.building === 'farmland') g.on = false;
    const p0 = site.population;
    advanceEconomy(eco, 30 * DAY);
    expect(site.population).toBeGreaterThan(p0);
    expect(site.stock.wheat).toBeLessThan(earthOf(startEconomy()).stock.wheat ?? 0);
  });
});

describe('food in calories', () => {
  const colony = (eco: Economy, people: number, stock: Record<string, number>): Site => {
    const site = newSite(eco, { worldBody: 'luna', bodyName: 'Luna', place: 'orbit', angle: 0 })!;
    site.population = people;
    site.stock = stock;
    return site;
  };

  it('needs 2,800 kcal a person a day from the reference person, on Earth and off it', () => {
    const eco = startEconomy();
    const earth = earthOf(eco);
    expect(earth.kcalPerPersonDay).toBe(2800);
    const f = siteFlows(eco, earth);
    expect(f.food.demand).toBeCloseTo((earth.population * 2800) / 24, -3);
    expect(colony(eco, 10, {}).kcalPerPersonDay).toBe(2800);
  });

  it('eats a kilogram of wheat as 3,270 kcal and a kilogram of lettuce as 150', () => {
    const eco = startEconomy();
    const wheat = colony(eco, 100, { wheat: 1e6 });
    const f = siteFlows(eco, wheat);
    expect(f.food.demand).toBeCloseTo((100 * 2800) / 24, 6);
    expect(f.eaten.wheat).toBeCloseTo(f.food.demand / material('wheat').kcalPerKg!, 6);
    expect(f.eatenMass).toBeCloseTo(f.food.demand / 3270, 6);
    const greens = newSite(eco, { worldBody: 'luna', bodyName: 'Luna', place: 'surface', angle: 0 })!;
    greens.population = 100;
    greens.stock = { leafy_greens: 1e6 };
    expect(siteFlows(eco, greens).eatenMass).toBeCloseTo(f.food.demand / 150, 6);
  });

  it('splits what is eaten between foods by calories held, not by mass', () => {
    const eco = startEconomy();
    const site = colony(eco, 100, { wheat: 1e6, soybean: 1e6 });
    const f = siteFlows(eco, site);
    const kcal = (m: string) => material(m).kcalPerKg!;
    expect(f.food.eatenBy.wheat! / f.food.eatenBy.soybean!).toBeCloseTo(kcal('wheat') / kcal('soybean'), 6);
    expect(f.eaten.wheat).toBeCloseTo(f.eaten.soybean!, 6);
    expect(f.food.cover).toBeCloseTo(1, 12);
  });

  it('shrinks in proportion to the calorie shortfall and grows only when the need is met', () => {
    const eco = startEconomy();
    const earth = earthOf(eco);
    for (const m of ['wheat', 'potato', 'soybean', 'leafy_greens', 'meat']) earth.stock[m] = 0;
    for (const g of earth.groups) if (g.process === 'farm_wheat') g.on = false;
    const f = siteFlows(eco, earth);
    expect(f.food.cover).toBeLessThan(1);
    expect(f.food.cover).toBeGreaterThan(0);
    expect(f.food.cover).toBeCloseTo(f.food.eaten / f.food.demand, 12);
    expect(f.growthPerHour).toBeCloseTo((-0.25 * (1 - f.food.cover)) / 8766, 12);
    const fed = siteFlows(startEconomy(), earthOf(startEconomy()));
    expect(fed.growthPerHour).toBeGreaterThan(0);
  });

  it('runs a small site out of stored food and then shrinks it', () => {
    const eco = startEconomy();
    const site = colony(eco, 100, { wheat: (100 * 2800 * 0.5) / 3270 });
    expect(siteFlows(eco, site).food.cover).toBe(1);
    advanceEconomy(eco, 24 * 3600);
    expect(site.stock.wheat ?? 0).toBeLessThan(1e-6);
    expect(siteFlows(eco, site).food.cover).toBe(0);
    expect(site.population).toBeLessThan(100);
  });

  it('feeds Earth with the ranches making meat for about a tenth of the calories', () => {
    const eco = startEconomy();
    const f = siteFlows(eco, earthOf(eco));
    const meat = f.food.madeBy.meat ?? 0;
    expect(meat / f.food.demand).toBeGreaterThan(0.08);
    expect(meat / f.food.demand).toBeLessThan(0.12);
    const meatPerYear = (f.produced.meat ?? 0) * 8766;
    expect(meatPerYear).toBeGreaterThan(2e11);
    expect(meatPerYear).toBeLessThan(6e11);
  });
});

describe('construction', () => {
  it('builds in queue order, spends the cost over the build time and adds the building', () => {
    const eco = startEconomy();
    const site = earthOf(eco);
    const before = site.groups
      .filter((g) => g.building === 'chemical_plant')
      .reduce((a, g) => a + g.count, 0);
    const [o] = queueBuilding(eco, site, 'chemical_plant', 'haber_bosch');
    const idle = startEconomy();
    advanceEconomy(eco, DAY);
    advanceEconomy(idle, DAY);
    expect(o?.done).toBeGreaterThan(0);
    expect(o?.done).toBeLessThan(1);
    expect(site.stock.stainless_steel).toBeLessThan(earthOf(idle).stock.stainless_steel ?? 0);
    const logs: string[] = [];
    advanceEconomy(eco, 60 * DAY, (t) => logs.push(t));
    expect(site.queue).toEqual([]);
    expect(site.groups.filter((g) => g.building === 'chemical_plant').reduce((a, g) => a + g.count, 0)).toBe(
      before + 1
    );
    expect(logs.some((t) => t.includes('finished a Chemical plant'))).toBe(true);
  });

  it('stalls a build and names the missing material', () => {
    const eco = startEconomy();
    const site = earthOf(eco);
    setOn(site, groupOf(site, 'cfrp_layup').id, false);
    site.stock.cfrp = 0;
    const [o] = queueBuilding(eco, site, 'rocket_factory', null);
    const logs: string[] = [];
    advanceEconomy(eco, DAY, (t) => logs.push(t));
    expect(o?.stalled).toBe('cfrp');
    expect(o?.done).toBe(0);
    expect(logs.some((t) => t.includes('waiting for Carbon'))).toBe(true);
  });

  it('pauses, reorders and removes orders, building only the first few at once', () => {
    const eco = startEconomy();
    const site = earthOf(eco);
    const orders = queueBuilding(eco, site, 'farmland', 'farm_wheat', 5);
    const [a, b, , , e] = orders;
    pauseOrder(site, a!.id);
    moveOrder(site, e!.id, -4);
    removeOrder(site, b!.id);
    advanceEconomy(eco, DAY);
    expect(site.queue.map((o) => o.id)).toEqual([e!.id, a!.id, orders[2]!.id, orders[3]!.id]);
    expect(a!.done).toBe(0);
    expect(e!.done).toBeGreaterThan(0);
    expect(orders[3]!.done).toBeGreaterThan(0);
  });
});

describe('milestones as programmes', () => {
  it('reaches milestone 1 from the start state, spending nothing to start it', () => {
    const eco = startEconomy();
    const site = earthOf(eco);
    const m1 = milestone(1);
    expect(programmeStatus(eco, m1)).toBe('ready');
    const stock = { ...site.stock };
    expect(startProgramme(eco, site, 1)).toBe(true);
    expect(site.stock).toEqual(stock);
    expect(startProgramme(eco, site, 1)).toBe(false);
    expect(programmeStatus(eco, m1)).toBe('running');
    const logs: string[] = [];
    advanceEconomy(eco, programmeDays(m1) * DAY, (t) => logs.push(t));
    expect(eco.done).toEqual([1]);
    expect(logs).toContain('Milestone 1 reached: Reusable orbital launch.');
    expect(isUnlocked(eco, { milestone: 2 })).toBe(true);
    expect(isUnlocked(eco, { milestone: 3 })).toBe(false);
    expect(unlockedProcesses(eco, site, 'polymer_plant').map((p) => p.id)).toContain('polyimide_synthesis');
    expect(programmeStatus(eco, milestone(2))).toBe('ready');
    expect(programmeStatus(eco, milestone(3))).toBe('locked');
    expect(programmeStatus(eco, milestone(15))).toBe('locked');
  });

  it('makes every project ready once its prerequisites are researched, whatever stands and whatever is in stock', () => {
    const eco = startEconomy();
    const site = earthOf(eco);
    site.stock = {};
    site.groups = [];
    for (const m of milestones) {
      eco.done = [...m.requires];
      expect(programmeStatus(eco, m), `${m.number}`).toBe('ready');
      eco.done = m.requires.slice(1);
      if (m.requires.length) expect(programmeStatus(eco, m), `${m.number}`).toBe('locked');
    }
  });

  it('slows a programme that needs compute to what data centres supply', () => {
    const eco = startEconomy();
    for (let n = 1; n <= 5; n++) eco.done.push(n);
    const site = earthOf(eco);
    eco.running.push({ number: 6, site: 'earth', progress: 0 });
    advanceEconomy(eco, DAY);
    expect(eco.running[0]?.progress).toBe(0);
    site.stock.ai_accelerator = 1000;
    site.groups.push({
      id: 900,
      building: 'data_centre',
      process: 'compute_generation',
      count: 100,
      on: true
    });
    advanceEconomy(eco, DAY);
    expect(eco.running[0]?.progress).toBeGreaterThan(0);
  });
});
