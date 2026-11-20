import { describe, expect, it } from 'vitest';
import { material, project, projectById, projects, reserveOf } from '#lib/game/data/index.ts';
import { newSite } from './index.ts';
import {
  advanceEconomy,
  earthStart,
  EXTRACT_KG_PER_HOUR,
  assign,
  isMass,
  moveOrder,
  pauseOrder,
  bonusOf,
  cancelQueued,
  gainExperience,
  createProject,
  freeLabs,
  labsActive,
  MONTH_HOURS,
  programmeStatus,
  setLabs,
  queueBuilding,
  removeOrder,
  reserveLeft,
  setOn,
  siteFlows,
  startEconomy,
  startProgramme,
  switchSome,
  isUnlocked,
  isPlant,
  PEAK_RATIO,
  plantOf,
  POWER,
  process,
  setActive,
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
      if (a.kind === 'group' && a.group.process && a.group.process !== 'electronic_silicon_purification')
        expect(a.share, a.group.process).toBe(1);
    expect(f.power.demand).toBeLessThan(f.power.supply);
    expect(f.workers.needed).toBeLessThan(f.workers.available);
  });

  it('waits on silicon for polysilicon when Earth mines none and holds none', () => {
    const eco = startEconomy();
    const site = earthOf(eco);
    setOn(site, groupOf(site, 'extract:silicon').id, false);
    site.stock.silicon = 0;
    const poly = actorOf(eco, site, groupOf(site, 'electronic_silicon_purification').id);
    expect(poly.share).toBe(0);
    expect(poly.limit).toEqual({ kind: 'material', id: 'silicon' });
    site.stock.silicon = 1e6;
    expect(actorOf(eco, site, groupOf(site, 'electronic_silicon_purification').id).share).toBe(1);
  });

  it('machines 1 t of machinery from 0.6 t steel, 0.3 t superalloy and 0.2 t titanium alloy', () => {
    const eco = startEconomy();
    const site = earthOf(eco);
    const shop = actorOf(eco, site, groupOf(site, 'machinery_machining').id);
    expect(shop.share).toBe(1);
    const month = (v: number | undefined) => ((v ?? 0) * 730.5) / 2;
    close(month(shop.outputs.machinery), 3000);
    close(month(shop.inputs.stainless_steel), 1800);
    close(month(shop.inputs.nickel_superalloy), 900);
    close(month(shop.inputs.ti_6al_4v), 600);
    expect(shop.inputs[POWER]).toBe(60_000);
  });

  it('starts with the goods of the design sketch in store', () => {
    const site = earthOf(startEconomy());
    expect(site.stock.electronic_silicon).toBe(6000);
    expect(site.stock.machinery).toBe(30_000);
    expect(site.stock.rad_hard_ic).toBe(8000);
  });

  it('starts with each recorded stock in place of days of its production', () => {
    const site = earthOf(startEconomy());
    for (const [id, s] of Object.entries(earthStart.stocks)) expect(site.stock[id], id).toBe(s.stock);
    expect(site.stock.wheat).toBe(282.86e9);
    expect(site.stock.nickel).toBe(275_118_000);
  });

  it('opens only the records open from the start, with nothing researched, four labs and six scientists', () => {
    const eco = startEconomy();
    expect(eco.done).toEqual([]);
    expect(isUnlocked(eco, { research: 0 })).toBe(true);
    expect(isUnlocked(eco, { research: 1 })).toBe(false);
    expect(labsActive(eco)).toBe(4);
    expect(eco.scientists.map((s) => s.name)).toEqual([
      'Aiko Tanaka',
      'Marcus Bell',
      'Leila Haddad',
      'Viktor Sokolov',
      'Nadia Petrova',
      'Samuel Osei'
    ]);
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
    expect(startProgramme(eco, 1)).toBe(true);
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
    const wanted = (before.consumed.chromium ?? 0) / actorOf(eco, site, steel.id).share;
    const half = Math.round(wanted / 2 / EXTRACT_KG_PER_HOUR);
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
    site.stock.silicon = 1e9;
    const demand = siteFlows(eco, site).power.demand;
    for (const g of site.groups) if (isPlant(g.building)) setOn(site, g.id, false);
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
    setOn(site, groupOf(site, 'rad_hard_ic_fabrication').id, false);
    site.groups.push({
      id: 900,
      building: 'data_centre',
      process: 'compute_generation',
      count: 8,
      on: true
    });
    site.groups.push({ id: 901, building: 'data_centre', process: 'ai_model_training', count: 1, on: true });
    const f = siteFlows(eco, site);
    expect(f.compute.supply).toBe(900);
    expect(f.compute.demand).toBe(9000);
    close(actorOf(eco, site, 901).share, 0.1);
    expect(actorOf(eco, site, 901).limit).toEqual({ kind: 'compute' });
    advanceEconomy(eco, DAY);
    expect(site.stock.compute).toBeUndefined();
    close(site.stock.ai_models ?? 0, 2.4, 1e-6);
  });

  it('runs a data centre at 90 EFLOP/s on 120 MW and the IC line on 36 EFLOP/s', () => {
    const eco = startEconomy();
    const site = earthOf(eco);
    const dc = actorOf(eco, site, groupOf(site, 'compute_generation').id);
    const ics = actorOf(eco, site, groupOf(site, 'rad_hard_ic_fabrication').id);
    expect(dc.outputs.compute).toBe(180);
    expect(dc.inputs[POWER]).toBe(240_000);
    expect(ics.inputs.compute).toBe(36);
    close((ics.outputs.rad_hard_ic ?? 0) * 730.5, 1200);
    close((ics.inputs.electronic_silicon ?? 0) * 730.5, 1800);
    expect(siteFlows(eco, site).compute).toEqual({ supply: 180, demand: 36, used: 36 });
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

describe('population off Earth', () => {
  const outpost = (eco: Economy, people: number, berths: number): Site => {
    const site = newSite(eco, { worldBody: 'luna', bodyName: 'Luna', place: 'surface', angle: 0 })!;
    site.population = people;
    site.berths = berths;
    site.stock = { wheat: 1e7 };
    return site;
  };

  it("grows at Earth's rate while fed and housed", () => {
    const eco = startEconomy();
    const site = outpost(eco, 100, 1000);
    expect(site.growthPerYear).toBe(earthOf(eco).growthPerYear);
    advanceEconomy(eco, 365.25 * DAY);
    close(site.population, 100 * Math.exp(earthOf(startEconomy()).growthPerYear), 1e-9);
  });

  it('stops growing at the berths it has, the same in one step as in many', () => {
    const one = startEconomy();
    const a = outpost(one, 100, 100.1);
    advanceEconomy(one, 60 * DAY);
    const many = startEconomy();
    const b = outpost(many, 100, 100.1);
    for (let d = 0; d < 60; d++) advanceEconomy(many, DAY);
    expect(a.population).toBe(100.1);
    expect(b.population).toBe(100.1);
    expect(siteFlows(one, a).growthPerHour).toBe(0);
    close(a.stock.wheat ?? 0, b.stock.wheat ?? 0, 1e-9);
  });

  it('does not grow without a free berth, and still shrinks when starved', () => {
    const eco = startEconomy();
    const site = outpost(eco, 100, 100);
    advanceEconomy(eco, 365.25 * DAY);
    expect(site.population).toBe(100);
    site.stock = {};
    advanceEconomy(eco, 30 * DAY);
    expect(site.population).toBeLessThan(100);
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
  const num = (id: string) => projectById(id).number;

  it('researches a project on its lead and labs, spending nothing to start it', () => {
    const eco = startEconomy();
    const site = earthOf(eco);
    const first = project(1);
    expect(programmeStatus(eco, first)).toBe('ready');
    const stock = { ...site.stock };
    const aiko = eco.scientists[0]!;
    expect(createProject(eco, 1, aiko.id, 99)).toBe(true);
    expect(site.stock).toEqual(stock);
    expect(eco.running[0]).toEqual({ number: 1, lead: aiko.id, labs: aiko.admin, rp: 0 });
    expect(programmeStatus(eco, first)).toBe('running');
    const perMonth = aiko.admin * (1 + bonusOf(aiko, first.subject));
    const months = first.rp / perMonth;
    const logs: string[] = [];
    advanceEconomy(eco, months * 0.99 * MONTH_HOURS * 3600, (t) => logs.push(t));
    expect(eco.done).toEqual([]);
    expect(eco.running[0]!.rp).toBeCloseTo(first.rp * 0.99, 3);
    advanceEconomy(eco, months * 0.02 * MONTH_HOURS * 3600, (t) => logs.push(t));
    expect(eco.done).toEqual([1]);
    expect(logs).toContain('Booster recovery researched.');
    expect(programmeStatus(eco, project(num('propellant_transfer_in_orbit')))).toBe('ready');
    expect(programmeStatus(eco, project(num('orbital_shipbuilding')))).toBe('locked');
  });

  it('opens a record only once the project that lists it is researched', () => {
    const eco = startEconomy();
    const site = earthOf(eco);
    const transfer = num('propellant_transfer_in_orbit');
    eco.done = [num('booster_recovery')];
    expect(unlockedProcesses(eco, site, 'polymer_plant').map((p) => p.id)).not.toContain(
      'polyimide_synthesis'
    );
    eco.done.push(transfer);
    expect(unlockedProcesses(eco, site, 'polymer_plant').map((p) => p.id)).toContain('polyimide_synthesis');
  });

  it("caps labs by the lead scientist's administration and the free labs", () => {
    const eco = startEconomy();
    const [aiko, marcus] = eco.scientists;
    expect(createProject(eco, num('booster_recovery'), aiko!.id, 99)).toBe(true);
    expect(freeLabs(eco)).toBe(4 - aiko!.admin);
    expect(createProject(eco, num('closed_loop_water_and_air'), marcus!.id, 99)).toBe(true);
    expect(eco.running[1]!.labs).toBe(4 - aiko!.admin);
    expect(freeLabs(eco)).toBe(0);
    expect(setLabs(eco, num('booster_recovery'), 1)).toBe(true);
    expect(setLabs(eco, num('closed_loop_water_and_air'), 99)).toBe(true);
    expect(eco.running[1]!.labs).toBe(Math.min(marcus!.admin, 3));
  });

  it("queues a busy scientist's next project and moves on to it with the same labs", () => {
    const eco = startEconomy();
    const aiko = eco.scientists[0]!;
    const recovery = num('booster_recovery');
    const hydrolox = num('hydrolox_and_storable_engines');
    const magnets = num('magnets');
    expect(createProject(eco, recovery, aiko.id, 2)).toBe(true);
    expect(createProject(eco, hydrolox, aiko.id, 3)).toBe(true);
    expect(createProject(eco, magnets, aiko.id, 3)).toBe(true);
    expect(programmeStatus(eco, project(hydrolox))).toBe('queued');
    expect(cancelQueued(eco, magnets)).toBe(true);
    expect(programmeStatus(eco, project(magnets))).toBe('ready');
    const logs: string[] = [];
    advanceEconomy(eco, 2 * 365 * DAY, (t) => logs.push(t));
    expect(eco.done).toContain(recovery);
    expect(logs).toContain(`${aiko.name} moves on to ${project(hydrolox).name}.`);
    expect(
      eco.done.includes(hydrolox) || eco.running.some((p) => p.number === hydrolox && p.labs === 2)
    ).toBe(true);
  });

  it('queues a project behind prerequisites that are running or queued and starts it when they are researched', () => {
    const eco = startEconomy();
    const [aiko, marcus, leila] = eco.scientists;
    const recovery = num('booster_recovery');
    const transfer = num('propellant_transfer_in_orbit');
    const loop = num('closed_loop_water_and_air');
    const arrays = num('space_solar_arrays');
    expect(createProject(eco, arrays, leila!.id, 0)).toBe(false);
    expect(createProject(eco, transfer, marcus!.id, 0)).toBe(false);
    expect(createProject(eco, recovery, aiko!.id, 2)).toBe(true);
    expect(createProject(eco, transfer, marcus!.id, 0)).toBe(true);
    expect(programmeStatus(eco, project(transfer))).toBe('waiting');
    expect(eco.running.map((p) => p.lead)).toEqual([aiko!.id]);
    expect(createProject(eco, arrays, leila!.id, 0)).toBe(false);
    expect(createProject(eco, loop, aiko!.id, 0)).toBe(true);
    expect(programmeStatus(eco, project(loop))).toBe('queued');
    expect(createProject(eco, arrays, leila!.id, 0)).toBe(true);
    expect(programmeStatus(eco, project(arrays))).toBe('waiting');
    const logs: string[] = [];
    advanceEconomy(eco, 2 * 365 * DAY, (t) => logs.push(t));
    expect(eco.done).toContain(recovery);
    expect(logs).toContain(`${marcus!.name} moves on to ${project(transfer).name}.`);
    expect(logs).toContain(`${aiko!.name} moves on to ${project(loop).name}.`);
    expect(eco.done.includes(transfer) || eco.running.some((p) => p.number === transfer)).toBe(true);
  });

  it('removes a waiting project from the queue', () => {
    const eco = startEconomy();
    const [aiko, marcus] = eco.scientists;
    const transfer = num('propellant_transfer_in_orbit');
    createProject(eco, num('booster_recovery'), aiko!.id, 2);
    createProject(eco, transfer, marcus!.id, 0);
    expect(cancelQueued(eco, transfer)).toBe(true);
    expect(programmeStatus(eco, project(transfer))).toBe('locked');
    expect(eco.queued).toEqual([]);
  });

  it('gives the lead experience by fixed chances of a half, the same in every game', () => {
    const run = () => {
      const s = { ...startEconomy().scientists[0]!, skill: 1 };
      const gains = projects.map((p) => gainExperience(s, p.number));
      return { s, gains };
    };
    const one = run();
    expect(run()).toEqual(one);
    const admin = one.gains.filter((g) => g.admin).length;
    expect(admin / projects.length).toBeGreaterThan(0.3);
    expect(admin / projects.length).toBeLessThan(0.7);
    expect(one.s.admin).toBe(startEconomy().scientists[0]!.admin + admin);
    expect(one.s.skill).toBeLessThanOrEqual(10);
  });

  it('takes labs switched off from the newest projects first', () => {
    const eco = startEconomy();
    const site = earthOf(eco);
    const [aiko, marcus] = eco.scientists;
    createProject(eco, num('booster_recovery'), aiko!.id, 2);
    createProject(eco, num('closed_loop_water_and_air'), marcus!.id, 2);
    const labs = site.groups.find((g) => g.building === 'research_lab')!;
    switchSome(eco, site, labs.id, 3);
    advanceEconomy(eco, DAY);
    expect(eco.running.map((p) => p.labs)).toEqual([1, 0]);
  });

  it('makes every project ready once its prerequisites are researched, whatever stands and whatever is in stock', () => {
    const eco = startEconomy();
    const site = earthOf(eco);
    site.stock = {};
    site.groups = [];
    for (const p of projects) {
      eco.done = [...p.requires];
      expect(programmeStatus(eco, p), `${p.number}`).toBe('ready');
      eco.done = p.requires.slice(1);
      if (p.requires.length) expect(programmeStatus(eco, p), `${p.number}`).toBe('locked');
    }
  });

  it('slows research to the compute data centres supply, and labs draw power and compute', () => {
    const eco = startEconomy();
    const site = earthOf(eco);
    createProject(eco, 1, eco.scientists[0]!.id, 3);
    const flows = siteFlows(eco, site);
    const actor = flows.actors.find((a) => a.kind === 'programme')!;
    expect(actor.inputs.compute).toBe(54);
    expect(actor.inputs[POWER]).toBe(30_000);
    const centres = groupOf(site, 'compute_generation');
    setOn(site, centres.id, false);
    advanceEconomy(eco, DAY);
    expect(eco.running[0]?.rp).toBe(0);
    setOn(site, centres.id, true);
    advanceEconomy(eco, DAY);
    expect(eco.running[0]?.rp).toBeGreaterThan(0);
  });

  it('speeds research by the research rate boost line', () => {
    const eco = startEconomy();
    createProject(eco, 1, eco.scientists[0]!.id, 3);
    advanceEconomy(eco, 30 * DAY);
    const base = eco.running[0]!.rp;
    const other = startEconomy();
    other.done = [num('research_rate_1')];
    createProject(other, 1, other.scientists[0]!.id, 3);
    advanceEconomy(other, 30 * DAY);
    expect(other.running[0]!.rp / base).toBeCloseTo(1.2, 6);
  });
});

describe("Earth's reserves", () => {
  it('draw down by what the mines extract, the same over one step as over many', () => {
    const one = startEconomy();
    const many = startEconomy();
    const rate = siteFlows(one, earthOf(one)).produced.iron ?? 0;
    advanceEconomy(one, 30 * DAY);
    for (let i = 0; i < 30; i++) advanceEconomy(many, DAY);
    close(one.drawn.iron ?? 0, rate * 24 * 30, 1e-6);
    close(one.drawn.iron ?? 0, many.drawn.iron ?? 0, 1e-9);
    close(reserveLeft(one, 'earth', 'iron'), (reserveOf('iron')?.content ?? 0) - (one.drawn.iron ?? 0));
  });

  it('stop a mine at the moment its reserve runs out, and say so', () => {
    const eco = startEconomy();
    const site = earthOf(eco);
    const mines = groupOf(site, 'extract:iron');
    const content = reserveOf('iron')?.content ?? 0;
    const rate = siteFlows(eco, site).produced.iron ?? 0;
    eco.drawn.iron = content - rate * 36;
    const log: string[] = [];
    advanceEconomy(eco, 3 * DAY, (text) => log.push(text));
    expect(eco.drawn.iron).toBe(content);
    expect(reserveLeft(eco, 'earth', 'iron')).toBe(0);
    expect(actorOf(eco, site, mines.id).limit).toEqual({ kind: 'depleted' });
    expect(siteFlows(eco, site).produced.iron ?? 0).toBe(0);
    expect(log.filter((t) => t.includes('reserves of Iron'))).toHaveLength(1);
  });

  it('leave a material without a reserve, and every site off Earth, unlimited', () => {
    const eco = startEconomy();
    expect(reserveLeft(eco, 'earth', 'water')).toBe(Infinity);
    expect(reserveLeft(eco, 'luna', 'iron')).toBe(Infinity);
  });
});

describe('power plants', () => {
  const plantGroup = (site: Site, id: string) => {
    const g = site.groups.find((x) => x.building === id);
    if (!g) throw new Error(`no ${id}`);
    return g;
  };
  const powered = (eco: Economy, site: Site) =>
    siteFlows(eco, site).actors.filter((a) => (a.inputs[POWER] ?? 0) > 0 && a.cap > 0);

  it('give Earth the 2024 mix with average generation 5% over the start demand and firm capacity over the peak', () => {
    const eco = startEconomy();
    const site = earthOf(eco);
    expect(site.gridKw).toBe(0);
    const f = siteFlows(eco, site);
    expect(f.grid.average / f.grid.demand).toBeGreaterThan(1.04);
    expect(f.grid.average / f.grid.demand).toBeLessThan(1.06);
    expect(f.grid.firm).toBeGreaterThan(f.grid.peak);
    expect(f.grid.firmShort).toBe(false);
    close(f.grid.peak, PEAK_RATIO * f.power.demand);
    close(f.power.supply, f.grid.average);
    expect(f.power.used).toBeCloseTo(f.power.demand, 0);
    const coal = plantGroup(site, 'coal_power_station');
    close(f.grid.bySource.coal_power_station ?? 0, coal.count * 1e6 * 0.55);
    close(
      f.grid.storage,
      plantGroup(site, 'battery_storage').count * 2.5e6 +
        plantGroup(site, 'pumped_hydro_storage').count * 4.8e7
    );
  });

  it('supply no more than average generation, and every powered building runs at the same share', () => {
    const eco = startEconomy();
    const site = earthOf(eco);
    for (const k of Object.keys(site.stock)) site.stock[k] = 1e15;
    for (const g of site.groups) if (isPlant(g.building)) setActive(site, g.id, Math.floor(g.count * 0.6));
    const pumped = plantGroup(site, 'pumped_hydro_storage');
    pumped.count = 1000;
    delete pumped.active;
    const f = siteFlows(eco, site);
    expect(f.grid.supply).toBe(f.grid.average);
    expect(f.grid.firmShort).toBe(false);
    const share = f.grid.average / f.power.demand;
    expect(share).toBeLessThan(1);
    close(f.power.used, f.grid.average, 1e-6);
    const actors = powered(eco, site);
    expect(actors.length).toBeGreaterThan(20);
    for (const a of actors) close(a.share / a.cap, share, 1e-6);
  });

  it('supply no more than firm capacity over the peak ratio, and warn while firm capacity is short of peak', () => {
    const eco = startEconomy();
    const site = earthOf(eco);
    for (const k of Object.keys(site.stock)) site.stock[k] = 1e15;
    for (const g of site.groups)
      if (isPlant(g.building) && (plantOf(g.building)?.firmShare ?? 0) >= 0.6)
        setActive(site, g.id, Math.floor(g.count * 0.4));
    plantGroup(site, 'solar_farm').count = 4000;
    const f = siteFlows(eco, site);
    expect(f.grid.average).toBeGreaterThan(f.grid.demand);
    expect(f.grid.firm).toBeLessThan(f.grid.peak);
    expect(f.grid.firmShort).toBe(true);
    close(f.grid.supply, f.grid.firm / PEAK_RATIO);
    const share = f.grid.supply / f.power.demand;
    expect(share).toBeLessThan(1);
    for (const a of powered(eco, site)) close(a.share / a.cap, share, 1e-6);
    const said: string[] = [];
    advanceEconomy(eco, DAY, (text, warn) => warn && said.push(text));
    expect(said).toContain("Earth's firm capacity is short of peak demand.");
  });

  it('count only active plants, and a finished plant joins the active ones', () => {
    const eco = startEconomy();
    const site = earthOf(eco);
    const nuclear = plantGroup(site, 'nuclear_power_station');
    const before = siteFlows(eco, site).grid;
    setActive(site, nuclear.id, nuclear.count - 10);
    close(before.average - siteFlows(eco, site).grid.average, 10 * 1e6 * 0.82);
    queueBuilding(eco, site, 'nuclear_power_station', null);
    advanceEconomy(eco, 20 * DAY, () => {});
    expect(nuclear.active).toBe(nuclear.count - 10);
    setActive(site, nuclear.id, nuclear.count);
    expect(nuclear.active).toBeUndefined();
  });
});

describe('water', () => {
  const MONTH = 730.5;
  const groupBy = (site: Site, building: string) => {
    const g = site.groups.find((x) => x.building === building);
    if (!g) throw new Error(`no ${building}`);
    return g;
  };

  it('is drawn by a data centre on Earth at 157,788 t a month, and not off Earth', () => {
    const eco = startEconomy();
    const site = earthOf(eco);
    const dc = groupOf(site, 'compute_generation');
    const a = actorOf(eco, site, dc.id);
    expect(a.share).toBe(1);
    close((a.water / dc.count) * MONTH, 157_788_000);
    close(a.inputs.water ?? 0, a.water);
    expect(process('compute_generation', 'moon').water).toBe(0);
    expect(process('compute_generation', 'moon').inputs.water).toBeUndefined();
  });

  it('is drawn by the fabs and the machine shop at the figures of the design sketch', () => {
    const month = (id: string) => process(id, 'earth').water * MONTH;
    close(month('electronic_silicon_purification'), 500_000_000);
    close(month('rad_hard_ic_fabrication'), 1_140_000_000);
    close(month('machinery_machining'), 1_000_000);
  });

  it('is drawn by a coal plant at 2.6 t a MWh of its average output, and only while it runs', () => {
    const eco = startEconomy();
    const site = earthOf(eco);
    const coal = groupBy(site, 'coal_power_station');
    const a = actorOf(eco, site, coal.id);
    close(a.water, coal.count * 1e3 * 0.55 * 2.6 * 1e3);
    close((a.inputs.water ?? 0) * a.share, a.water);
    setActive(site, coal.id, coal.count - 100);
    const after = actorOf(eco, site, coal.id);
    close((after.inputs.water ?? 0) * after.share, (coal.count - 100) * 1e3 * 0.55 * 2.6 * 1e3);
    expect(actorOf(eco, site, groupBy(site, 'wind_farm').id).water).toBe(0);
  });

  it("sizes Earth's water mines to what it uses plus 10%, so its stock grows", () => {
    const eco = startEconomy();
    const site = earthOf(eco);
    const f = siteFlows(eco, site);
    const mines = groupOf(site, 'extract:water').count;
    expect(mines).toBe(Math.ceil((1.1 * (f.consumed.water ?? 0)) / EXTRACT_KG_PER_HOUR));
    expect(f.net.water ?? 0).toBeGreaterThan(0);
  });

  it('stops plants without water, and the power they made with them', () => {
    const eco = startEconomy();
    const site = earthOf(eco);
    setOn(site, groupOf(site, 'extract:water').id, false);
    site.stock.water = 0;
    const f = siteFlows(eco, site);
    const coal = f.actors.find((x) => x.kind === 'group' && x.group.building === 'coal_power_station');
    expect(coal?.share).toBeLessThan(0.01);
    expect(coal?.limit).toEqual({ kind: 'material', id: 'water' });
    expect(f.power.supply).toBeLessThan(f.grid.supply);
    expect(f.power.used).toBeLessThanOrEqual(f.power.supply * (1 + 1e-9));
  });
});
