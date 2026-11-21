import { describe, expect, it } from 'vitest';
import '#lib/screens/economy/system.ts';
import { classes } from '#lib/game/classes.svelte.ts';
import { DAY } from '#lib/game/clock.ts';
import { projectById } from '#lib/game/data/index.ts';
import { biospherePeople } from '#lib/game/suitability.ts';
import {
  berthsOf,
  economy,
  homeSite,
  isMass,
  newSite,
  freeShipyards,
  pauseShipOrder,
  removeShipOrder,
  moveShipOrder,
  setOn,
  setShipPercent,
  shipPoints,
  shipyardsFor,
  touch,
  yardPointsPerDay,
  type Site,
  type YardOrder
} from '#lib/game/economy/index.ts';
import { statsFor } from '#lib/game/index.ts';
import { orderShips } from './build.ts';
import { foundOptions, foundSite, installModule } from './colonise.ts';
import { addDesign, freshGame, spawn } from './fixtures.ts';
import { addOrder, goTo } from './orders.ts';
import { startRun } from './run.ts';
import { ships } from './state.svelte.ts';
import { vesselState } from './world.ts';
import { cargoMass, propellantMass } from './model.ts';

const TUG = {
  id: 'tug',
  role: 'freighter' as const,
  parts: [
    ['chemical_engine_methalox', 1],
    ['propellant_tank', 6],
    ['structure_truss', 1],
    ['cargo_bay', 2],
    ['landing_legs', 1]
  ] as const,
  load: [['methalox', 1e9]] as const
};

const withGrcop = (site: Site): void => {
  site.stock.grcop = 1e6;
};

const station = (): Site => {
  const s = newSite(economy, { worldBody: 'earth', bodyName: 'Earth', place: 'orbit', angle: 0.5 })!;
  s.berths = 0;
  return s;
};

const outpost = (): Site =>
  newSite(economy, { worldBody: 'luna', bodyName: 'Luna', place: 'surface', angle: 0 })!;

const totalMass = (): number => {
  let m = economy.ledger.burned;
  for (const s of economy.sites.slice(1))
    for (const [id, kg] of Object.entries(s.stock)) if (isMass(id)) m += kg;
  for (const v of ships.vessels) m += cargoMass(v) + propellantMass(v);
  return m;
};

const HAULER = {
  id: 'hauler',
  role: 'freighter' as const,
  parts: [
    ['chemical_engine_methalox', 9],
    ['propellant_tank', 60],
    ['structure_truss', 20],
    ['cargo_bay', 80],
    ['landing_legs', 1]
  ] as const,
  load: [['methalox', 1e9]] as const
};

const yardCount = (site: Site, n: number): void => {
  for (const grp of site.groups) if (grp.building === 'rocket_factory') grp.count = n;
  touch();
};

describe('building ships', () => {
  it('pays the design cost when the build starts and delivers a ship after its shipyard points', () => {
    const g = freshGame();
    const site = homeSite();
    withGrcop(site);
    const d = addDesign(TUG);
    const cost = statsFor(d).cost;
    const before = site.stock.stainless_steel ?? 0;
    const [o] = orderShips(site, d.id) as YardOrder[];
    expect(o!.percent).toBe(100);
    expect(o!.paid).toBe(true);
    expect(site.stock.stainless_steel).toBeCloseTo(before - (cost.stainless_steel ?? 0));
    const days = o!.points / yardPointsPerDay(economy, site, 'rocket_factory');
    g.advance(days * 0.9 * DAY);
    expect(ships.vessels).toHaveLength(0);
    g.advance(days * 0.2 * DAY);
    expect(ships.vessels).toHaveLength(1);
    const v = ships.vessels[0]!;
    expect(v.design).toBe(d.id);
    expect(v.at).toEqual({ kind: 'site', site: 'earth' });
    expect(v.propellant).toEqual({});
    expect(site.yard).toHaveLength(0);
  });

  it('refuses a design that is not locked or has no yard, and names what an unstarted build is missing', () => {
    const g = freshGame();
    const site = homeSite();
    withGrcop(site);
    const d = addDesign(TUG);
    expect(typeof orderShips({ ...site, groups: [] }, d.id)).toBe('string');
    classes.replace({ ...d, locked: false });
    expect(orderShips(site, d.id)).toMatch(/Lock/);
    classes.replace(d);
    setOn(site, site.groups.find((x) => x.process === 'cfrp_layup')!.id, false);
    site.stock.cfrp = 0;
    const [o] = orderShips(site, d.id) as YardOrder[];
    g.advance(DAY);
    expect(o!.paid).toBe(false);
    expect(o!.stalled).toBe('cfrp');
    expect(o!.done).toBe(0);
    expect(g.events.some((e) => e.text.includes('waiting for Carbon'))).toBe(true);
  });

  it('needs one shipyard up to 100 t of dry mass and one more for each 100 t above', () => {
    expect(shipyardsFor(5_000)).toBe(1);
    expect(shipyardsFor(100_000)).toBe(1);
    expect(shipyardsFor(100_001)).toBe(2);
    expect(shipyardsFor(250_000)).toBe(3);
    expect(shipPoints(250_000)).toBeCloseTo((2 + 0.5 * 250) * 3);
  });

  it('runs a small and a large design at one site on free shipyards and shares points by percentage', () => {
    const g = freshGame();
    const site = homeSite();
    withGrcop(site);
    const small = addDesign(TUG);
    const large = addDesign(HAULER);
    const needed = shipyardsFor(statsFor(large).dryMass);
    expect(shipyardsFor(statsFor(small).dryMass)).toBe(1);
    expect(needed).toBeGreaterThan(1);
    yardCount(site, needed - 1);
    expect(orderShips(site, large.id)).toMatch(new RegExp(`needs ${needed} shipyards`));
    yardCount(site, needed);
    const [s] = orderShips(site, small.id) as YardOrder[];
    const [l] = orderShips(site, large.id) as YardOrder[];
    expect(s!.percent).toBe(100);
    expect(l!.percent).toBe(0);
    setShipPercent(economy, site, s!.id, 50);
    setShipPercent(economy, site, l!.id, 80);
    expect(l!.percent).toBe(50);
    expect(s!.paid).toBe(true);
    expect(l!.paid).toBe(false);
    expect(freeShipyards(site, 'rocket_factory')).toBe(needed - 1);
    g.advance(0.01 * DAY);
    expect(l!.done).toBe(0);
    const perDay = yardPointsPerDay(economy, site, 'rocket_factory') / 2;
    expect(s!.done).toBeCloseTo((0.01 * perDay) / s!.points);
    g.advance((s!.points / perDay) * DAY);
    expect(site.yard).toEqual([l]);
    expect(l!.paid).toBe(true);
    expect(l!.done).toBeGreaterThan(0);
    expect(freeShipyards(site, 'rocket_factory')).toBe(0);
  });

  it('pauses, reorders and removes ship orders, and a paused order frees its shipyards', () => {
    const g = freshGame();
    const site = homeSite();
    withGrcop(site);
    const d = addDesign(TUG);
    yardCount(site, 2);
    const made = orderShips(site, d.id, 4) as YardOrder[];
    for (const o of made) o.percent = 0;
    for (const o of made) setShipPercent(economy, site, o.id, 25);
    pauseShipOrder(economy, site, made[0]!.id);
    moveShipOrder(economy, site, made[3]!.id, -3);
    removeShipOrder(economy, site, made[1]!.id);
    g.advance(0.01 * DAY);
    expect(site.yard.map((o) => o.id)).toEqual([made[3]!.id, made[0]!.id, made[2]!.id]);
    expect(made[3]!.done).toBeGreaterThan(0);
    expect(made[2]!.done).toBeGreaterThan(0);
    expect(made[0]!.done).toBe(0);
  });
});

describe('trips', () => {
  it('give the same position and arrival for one 30-day step as for thirty one-day steps', () => {
    const a = freshGame();
    addDesign(TUG);
    const va = spawn('tug', { kind: 'orbit', body: 'earth', angle: 0 }, { propellant: { methalox: 90000 } });
    addOrder(va, { type: 'fly', body: 'luna', angle: 0 });
    a.advance(DAY);
    const arrival = va.trip!.arrival;
    const midA = vesselState(a, va, a.elapsed + 2 * DAY)!;
    a.advance(29 * DAY);
    const endA = vesselState(a, va)!;
    expect(va.trip).toBeNull();
    expect(va.at).toEqual({ kind: 'orbit', body: 'luna', angle: 0 });

    const b = freshGame();
    addDesign(TUG);
    const vb = spawn('tug', { kind: 'orbit', body: 'earth', angle: 0 }, { propellant: { methalox: 90000 } });
    addOrder(vb, { type: 'fly', body: 'luna', angle: 0 });
    for (let i = 0; i < 30; i++) b.advance(DAY);
    expect(vb.trip).toBeNull();
    const endB = vesselState(b, vb)!;
    expect(endB.pos[0]).toBeCloseTo(endA.pos[0], 0);
    expect(endB.pos[1]).toBeCloseTo(endA.pos[1], 0);
    expect(vb.propellant.methalox).toBeCloseTo(va.propellant.methalox!, 6);
    expect(midA.pos[0]).not.toBeNaN();
    expect(arrival).toBeGreaterThan(0);
    expect(arrival).toBeLessThan(30 * DAY);
  });

  it('are refused with the reason when the ship cannot go, and wait without moving', () => {
    const g = freshGame();
    addDesign(TUG);
    const v = spawn('tug', { kind: 'orbit', body: 'earth', angle: 0 }, { propellant: { methalox: 20000 } });
    addOrder(v, { type: 'fly', body: 'mars', angle: 0 });
    g.advance(DAY);
    expect(v.trip).toBeNull();
    expect(v.blocked).toMatch(/delta-v/);
    expect(v.at).toEqual({ kind: 'orbit', body: 'earth', angle: 0 });
  });
});

describe('cargo', () => {
  it('is neither created nor lost across load, flight and unload', () => {
    const g = freshGame();
    addDesign(TUG);
    const orbit = station();
    const moon = outpost();
    orbit.stock.stainless_steel = 5000;
    orbit.stock.lch4 = 60_000;
    orbit.stock.lox = 240_000;
    const v = spawn('tug', { kind: 'site', site: orbit.id });
    addOrder(v, { type: 'load', item: { kind: 'propellant', id: 'methalox' }, amount: null });
    addOrder(v, { type: 'load', item: { kind: 'cargo', id: 'stainless_steel' }, amount: 3000 });
    goTo(v, moon);
    addOrder(v, { type: 'unload', item: { kind: 'cargo', id: 'stainless_steel' }, amount: null });
    addOrder(v, { type: 'unload', item: { kind: 'propellant', id: 'methalox' }, amount: null });
    const before = totalMass();
    g.advance(DAY);
    expect(totalMass()).toBeCloseTo(before, 3);
    expect(v.cargo.stainless_steel).toBe(3000);
    expect(v.trip).not.toBeNull();
    for (let i = 0; i < 12; i++) {
      g.advance(DAY);
      expect(totalMass()).toBeCloseTo(before, 3);
    }
    expect(v.trip).toBeNull();
    expect(v.at).toEqual({ kind: 'site', site: moon.id });
    expect(moon.stock.stainless_steel).toBe(3000);
    expect(orbit.stock.stainless_steel).toBe(2000);
    expect(v.orders).toHaveLength(0);
    expect(totalMass()).toBeCloseTo(before, 3);
  });
});

describe('sites off Earth', () => {
  it('are founded by delivering what the first building costs, then run the same economy', () => {
    const g = freshGame();
    addDesign({
      id: 'hab',
      role: 'freighter',
      parts: [
        ['habitat_module', 1],
        ['life_support_unit', 1],
        ['cargo_bay', 1],
        ['chemical_engine_methalox', 1],
        ['propellant_tank', 1]
      ],
      load: [['methalox', 1e9]]
    });
    const v = spawn(
      'hab',
      { kind: 'orbit', body: 'earth', angle: 1.2 },
      { crew: 4, cargo: { stainless_steel: 1000, copper: 150 } }
    );
    const options = foundOptions(v);
    const chem = options.find((o) => o.building.id === 'chemical_plant');
    expect(chem).toBeDefined();
    expect(chem!.missing.map((m) => m.id)).toContain('nickel_superalloy');
    const alloy = options.find((o) => o.building.id === 'alloy_works');
    expect(alloy!.missing).toEqual([
      { id: 'stainless_steel', need: 2500, have: 1000 },
      { id: 'copper', need: 200, have: 150 }
    ]);
    v.cargo.stainless_steel = 2600;
    v.cargo.copper = 250;
    v.propellant.methalox = 1000;
    const result = foundSite(g, v, 'alloy_works');
    expect(typeof result).not.toBe('string');
    const site = result as Site;
    expect(site.place).toBe('orbit');
    expect(site.worldBody).toBe('earth');
    expect(site.angle).toBe(1.2);
    expect(site.population).toBe(4);
    expect(site.berths).toBeGreaterThanOrEqual(4);
    expect(site.groups.map((x) => x.building)).toEqual(['alloy_works']);
    expect(site.stock.stainless_steel).toBe(100);
    expect(site.stock.copper).toBe(50);
    expect(site.stock.lch4).toBeCloseTo(1000 * (1 / 4.6), 6);
    expect(ships.vessels).toHaveLength(0);
    expect(economy.sites.map((s) => s.id)).toEqual(['earth', 'orbit-earth']);
    const second = spawn('hab', { kind: 'orbit', body: 'earth', angle: 1.2 });
    expect(foundOptions(second)).toEqual([]);
    expect(foundSite(g, second, 'alloy_works')).toMatch(/already/);
    second.at = { kind: 'site', site: site.id };
    second.cargo.copper = 5;
    expect(installModule(g, second)).toBeUndefined();
    expect(site.stock.copper).toBe(55);
    const food = site.stock;
    food.food_ration = 100;
    g.advance(10 * DAY);
    expect(site.population).toBeCloseTo(4 * Math.exp((homeSite().growthPerYear * 10) / 365.25), 9);
  });

  it('refuses a founding whose cargo falls short and says what is short', () => {
    const g = freshGame();
    addDesign(TUG);
    const v = spawn('tug', { kind: 'orbit', body: 'earth', angle: 0 }, { cargo: { stainless_steel: 10 } });
    const r = foundSite(g, v, 'alloy_works');
    expect(r).toMatch(/short by/);
    expect(economy.sites).toHaveLength(1);
  });
});

describe('a lunar outpost', () => {
  it('is founded by a lander that flies from low Earth orbit and sets down with the first building', () => {
    const g = freshGame();
    addDesign({
      id: 'lander',
      role: 'lander',
      parts: [
        ['chemical_engine_hydrolox', 4],
        ['propellant_tank', 4],
        ['structure_truss', 1],
        ['landing_legs', 1],
        ['cargo_bay', 1]
      ],
      load: [['hydrolox', 1e9]]
    });
    const v = spawn(
      'lander',
      { kind: 'orbit', body: 'earth', angle: 0 },
      {
        propellant: { hydrolox: 27_000 },
        cargo: { stainless_steel: 2500, copper: 250 }
      }
    );
    addOrder(v, { type: 'land', body: 'luna' });
    g.advance(DAY);
    expect(v.blocked).toBeNull();
    expect(v.trip).not.toBeNull();
    g.advance(10 * DAY);
    expect(v.trip).toBeNull();
    expect(v.at).toEqual({ kind: 'surface', body: 'luna' });
    expect(foundOptions(v)).toEqual([]);
    expect(foundSite(g, v, 'chemical_plant')).toBe('Choose a region to found the site in.');
    const options = foundOptions(v, 'luna-maria').map((o) => o.building.id);
    expect(options).toContain('chemical_plant');
    const open = foundOptions(v, 'luna-maria').find((o) => o.missing.length === 0);
    expect(open).toBeDefined();
    const site = foundSite(g, v, open!.building.id, 'luna-maria') as Site;
    expect(site.id).toBe('luna');
    expect(site.region).toBe('luna-maria');
    expect(site.place).toBe('surface');
    expect(site.body).toBe('moon');
    expect(g.body('luna')?.colony).toBe(true);
    expect(economy.sites.map((s) => s.id)).toEqual(['earth', 'luna']);
  });
});

describe('colonists', () => {
  const COLONY_SHIP = {
    id: 'colony',
    role: 'lander' as const,
    parts: [
      ['chemical_engine_hydrolox', 4],
      ['propellant_tank', 4],
      ['structure_truss', 1],
      ['landing_legs', 1],
      ['cargo_bay', 1],
      ['habitat_module', 1],
      ['life_support_unit', 1]
    ] as const,
    load: [['hydrolox', 1e9]] as const
  };

  it('settle the Moon before it mines anything, and grow only into the berths of its biospheres', () => {
    const g = freshGame();
    addDesign(COLONY_SHIP);
    const founder = spawn(
      'colony',
      { kind: 'surface', body: 'luna' },
      { crew: 2, cargo: { stainless_steel: 2500, copper: 200 } }
    );
    const site = foundSite(g, founder, 'alloy_works', 'luna-maria') as Site;
    expect(site.population).toBe(2);
    expect(berthsOf(site)).toBe(0);
    expect(site.groups.some((x) => x.process?.startsWith('extract:'))).toBe(false);
    site.stock.wheat = 1e5;

    const earth = homeSite();
    const v = spawn('colony');
    addOrder(v, { type: 'load', item: { kind: 'crew' }, amount: null });
    g.advance(DAY);
    expect(v.crew).toBe(6);
    v.at = { kind: 'orbit', body: 'earth', angle: 0 };
    v.propellant.hydrolox = 27_000;
    goTo(v, site);
    addOrder(v, { type: 'unload', item: { kind: 'crew' }, amount: null });
    g.advance(12 * DAY);
    expect(v.at).toEqual({ kind: 'site', site: site.id });
    expect(site.population).toBe(2);
    expect(v.crew).toBe(6);
    g.advance(30 * DAY);
    expect(site.population).toBe(2);

    economy.done.push(projectById('biosphere').number);
    site.groups.push({ id: economy.nextId++, building: 'biosphere', process: null, count: 1, on: true });
    touch();
    const room = biospherePeople('luna');
    expect(berthsOf(site)).toBe(room);
    addOrder(v, { type: 'unload', item: { kind: 'crew' }, amount: null });
    g.advance(DAY);
    expect(site.population).toBeCloseTo(8, 3);
    expect(v.crew).toBe(0);
    expect(installModule(g, v)).toBeUndefined();
    expect(site.berths).toBe(0);
    expect(berthsOf(site)).toBe(room);
    const before = site.population;
    g.advance(30 * DAY);
    expect(site.population).toBeCloseTo(before * Math.exp((earth.growthPerYear * 30) / 365.25), 6);
    site.population = room - 0.001;
    g.advance(30 * DAY);
    expect(site.population).toBeCloseTo(room, 9);
  });

  it('keep the berths of a module installed at an orbital station', () => {
    const g = freshGame();
    addDesign(COLONY_SHIP);
    const orbit = station();
    const v = spawn('colony', { kind: 'site', site: orbit.id });
    const before = orbit.berths ?? 0;
    expect(installModule(g, v)).toBeUndefined();
    expect(orbit.berths).toBe(before + 6);
    expect(berthsOf(orbit)).toBe(before + 6);
  });
});

describe('supply runs', () => {
  it('cycle load, fly, unload and return, and deliver a tonne figure each cycle', () => {
    const g = freshGame();
    addDesign({
      ...TUG,
      parts: [
        ['chemical_engine_methalox', 1],
        ['propellant_tank', 14],
        ['structure_truss', 1],
        ['cargo_bay', 2],
        ['landing_legs', 1]
      ]
    });
    const orbit = station();
    const moon = newSite(economy, { worldBody: 'luna', bodyName: 'Luna', place: 'orbit', angle: 0 })!;
    orbit.stock.stainless_steel = 100_000;
    orbit.stock.lch4 = 3e6;
    orbit.stock.lox = 1e7;
    const v = spawn('tug', { kind: 'site', site: orbit.id });
    expect(
      startRun(g, v, {
        manifest: [{ material: 'stainless_steel', amount: 4000 }],
        from: orbit.id,
        to: moon.id
      })
    ).toBeUndefined();
    for (let i = 0; i < 18; i++) g.advance(5 * DAY);
    const delivered = moon.stock.stainless_steel ?? 0;
    expect(delivered).toBeGreaterThanOrEqual(8000);
    expect(delivered % 4000).toBe(0);
    expect(v.run).not.toBeNull();
    expect((orbit.stock.stainless_steel ?? 0) + delivered + cargoMass(v)).toBeCloseTo(100_000, 3);
  });
});
