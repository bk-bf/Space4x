import { describe, expect, it } from 'vitest';
import '#lib/screens/economy/system.ts';
import { DAY } from '#lib/game/clock.ts';
import { economy, newSite, type Site } from '#lib/game/economy/index.ts';
import { previewLoad } from './cargo.ts';
import { addDesign, freshGame, spawn } from './fixtures.ts';
import { cargoMass } from './model.ts';
import { addOrder, lineText, orderLabel } from './orders.ts';
import { cycleOrders, startRun } from './run.ts';
import { propellantStock } from './supply.ts';

const HAULER = {
  id: 'hauler',
  role: 'freighter' as const,
  parts: [
    ['chemical_engine_methalox', 1],
    ['propellant_tank', 14],
    ['structure_truss', 1],
    ['cargo_bay', 2],
    ['landing_legs', 1],
    ['habitat_module', 1],
    ['life_support_unit', 1]
  ] as const,
  load: [['methalox', 1e9]] as const
};

const station = (): Site => {
  const s = newSite(economy, { worldBody: 'earth', bodyName: 'Earth', place: 'orbit', angle: 0.5 })!;
  s.berths = 0;
  s.population = 6;
  s.stock.stainless_steel = 100_000;
  s.stock.copper = 50_000;
  s.stock.food_ration = 20_000;
  s.stock.lch4 = 3e6;
  s.stock.lox = 1e7;
  return s;
};

const moonOrbit = (): Site =>
  newSite(economy, { worldBody: 'luna', bodyName: 'Luna', place: 'orbit', angle: 0 })!;

describe('a manifest order', () => {
  it('loads several materials and the crew in one order', () => {
    const g = freshGame();
    addDesign(HAULER);
    const orbit = station();
    const v = spawn('hauler', { kind: 'site', site: orbit.id });
    addOrder(v, {
      type: 'manifest',
      lines: [
        { item: { kind: 'cargo', id: 'stainless_steel' }, amount: 3000 },
        { item: { kind: 'cargo', id: 'copper' }, amount: 500 },
        { item: { kind: 'crew' }, amount: 2 },
        { item: { kind: 'propellant', id: 'methalox' }, amount: null }
      ]
    });
    expect(v.orders).toHaveLength(1);
    g.advance(DAY);
    expect(v.orders).toHaveLength(0);
    expect(v.cargo).toEqual({ stainless_steel: 3000, copper: 500 });
    expect(v.crew).toBe(2);
    expect(v.propellant.methalox ?? 0).toBeGreaterThan(0);
    expect(orbit.stock.stainless_steel).toBe(97_000);
    expect(orbit.stock.copper).toBe(49_500);
    expect(orbit.population).toBe(4);
  });

  it('takes one handling period however many lines it holds', () => {
    const g = freshGame();
    addDesign(HAULER);
    const orbit = station();
    const v = spawn('hauler', { kind: 'site', site: orbit.id });
    addOrder(v, {
      type: 'manifest',
      lines: [
        { item: { kind: 'cargo', id: 'stainless_steel' }, amount: 100 },
        { item: { kind: 'cargo', id: 'copper' }, amount: 100 },
        { item: { kind: 'cargo', id: 'food_ration' }, amount: 100 }
      ]
    });
    g.advance(3 * 3600);
    expect(v.orders).toHaveLength(1);
    g.advance(2 * 3600);
    expect(v.orders).toHaveLength(0);
  });

  it('logs what the hold or the stock could not give', () => {
    const g = freshGame();
    addDesign(HAULER);
    const orbit = station();
    orbit.stock.copper = 100;
    const v = spawn('hauler', { kind: 'site', site: orbit.id });
    addOrder(v, {
      type: 'manifest',
      lines: [
        { item: { kind: 'cargo', id: 'copper' }, amount: 400 },
        { item: { kind: 'cargo', id: 'stainless_steel' }, amount: 1000 }
      ]
    });
    g.advance(DAY);
    expect(v.cargo).toEqual({ copper: 100, stainless_steel: 1000 });
    const warning = g.events.find((e) => e.text.includes('loaded less than ordered'));
    expect(warning?.text).toContain('300 kg Copper short');
  });

  it('is one row in the order list, named by its items', () => {
    const g = freshGame();
    addDesign(HAULER);
    const v = spawn('hauler', { kind: 'site', site: station().id });
    const o = addOrder(v, {
      type: 'manifest',
      lines: [
        { item: { kind: 'cargo', id: 'copper' }, amount: 500 },
        { item: { kind: 'crew' }, amount: 2 }
      ]
    });
    expect(orderLabel(g, o)).toBe('Load 2 items');
    expect(lineText({ item: { kind: 'crew' }, amount: 2 })).toBe('2 crew');
    expect(lineText({ item: { kind: 'cargo', id: 'copper' }, amount: null })).toBe('all Copper');
  });
});

describe('unloading all cargo', () => {
  it('moves every material in the hold in one order and leaves propellant and crew', () => {
    const g = freshGame();
    addDesign(HAULER);
    const orbit = station();
    const v = spawn(
      'hauler',
      { kind: 'site', site: orbit.id },
      {
        cargo: { copper: 700, stainless_steel: 1500, food_ration: 300 },
        propellant: { methalox: 5000 },
        crew: 2
      }
    );
    const before = orbit.stock.copper!;
    addOrder(v, { type: 'unload', item: { kind: 'all-cargo' }, amount: null });
    expect(orderLabel(g, v.orders[0]!)).toBe('Unload all cargo');
    g.advance(DAY);
    expect(cargoMass(v)).toBe(0);
    expect(v.cargo).toEqual({});
    expect(orbit.stock.copper).toBe(before + 700);
    expect(v.propellant.methalox).toBe(5000);
    expect(v.crew).toBe(2);
  });

  it('is not an error to unload an empty hold', () => {
    const g = freshGame();
    addDesign(HAULER);
    const v = spawn('hauler', { kind: 'site', site: station().id });
    addOrder(v, { type: 'unload', item: { kind: 'all-cargo' }, amount: null });
    g.advance(DAY);
    expect(v.orders).toHaveLength(0);
    expect(g.events.some((e) => e.text.includes('found nothing'))).toBe(false);
  });
});

describe('previewing a load', () => {
  it('says what the ship would take and changes nothing', () => {
    freshGame();
    addDesign(HAULER);
    const orbit = station();
    orbit.stock.copper = 100;
    const v = spawn('hauler', { kind: 'site', site: orbit.id });
    const stock = { ...orbit.stock };
    const result = previewLoad(orbit, v, [
      { item: { kind: 'cargo', id: 'copper' }, amount: 400 },
      { item: { kind: 'propellant', id: 'methalox' }, amount: 1000 },
      { item: { kind: 'crew' }, amount: 99 }
    ]);
    expect(result.map((r) => r.moved)).toEqual([100, 1000, 6]);
    expect(orbit.stock).toEqual(stock);
    expect(v.cargo).toEqual({});
    expect(v.propellant).toEqual({});
    expect(v.crew).toBe(0);
    expect(orbit.population).toBe(6);
  });

  it('shares the hold between the lines in order', () => {
    freshGame();
    addDesign(HAULER);
    const orbit = station();
    const v = spawn('hauler', { kind: 'site', site: orbit.id });
    const [first, second] = previewLoad(orbit, v, [
      { item: { kind: 'cargo', id: 'stainless_steel' }, amount: null },
      { item: { kind: 'cargo', id: 'copper' }, amount: 1000 }
    ]);
    expect(first!.moved).toBeGreaterThan(0);
    expect(second!.moved).toBe(0);
  });
});

describe('propellant a site can load', () => {
  it('lists each kind its stock supports with the limiting material', () => {
    freshGame();
    const s = station();
    s.stock.lch4 = 1000;
    s.stock.lox = 100_000;
    const methalox = propellantStock(s).find((p) => p.kind === 'methalox')!;
    expect(methalox.available).toBeCloseTo(1000 / (1 / 4.6), 6);
    expect(methalox.limit).toBe('lch4');
    expect(methalox.mix.map((m) => m.material)).toEqual(['lch4', 'lox']);
    expect(propellantStock(s).some((p) => p.kind === 'xenon')).toBe(false);
  });

  it('keeps a kind with one ingredient at zero and names what it is short of', () => {
    freshGame();
    const s = station();
    s.stock.lch4 = 0;
    const methalox = propellantStock(s).find((p) => p.kind === 'methalox')!;
    expect(methalox.available).toBe(0);
    expect(methalox.limit).toBe('lch4');
  });
});

describe('a supply run with several materials', () => {
  const setup = () => {
    const g = freshGame();
    addDesign(HAULER);
    const orbit = station();
    const moon = moonOrbit();
    const v = spawn('hauler', { kind: 'site', site: orbit.id });
    return { g, orbit, moon, v };
  };

  it('cycles one manifest load and one unload all', () => {
    const { orbit, moon } = setup();
    const run = {
      manifest: [
        { material: 'food_ration', amount: 2000 },
        { material: 'copper', amount: 1000 }
      ],
      from: orbit.id,
      to: moon.id
    };
    const cycle = cycleOrders(run, 'methalox')!;
    expect(cycle.map((o) => o.type)).toEqual(['load', 'manifest', 'fly', 'dock', 'unload', 'fly', 'dock']);
    expect(cycle.find((o) => o.type === 'unload')).toMatchObject({ item: { kind: 'all-cargo' } });
  });

  it('delivers every material each trip and repeats', () => {
    const { g, v, orbit, moon } = setup();
    expect(
      startRun(g, v, {
        manifest: [
          { material: 'stainless_steel', amount: 2000 },
          { material: 'copper', amount: 1000 }
        ],
        from: orbit.id,
        to: moon.id
      })
    ).toBeUndefined();
    for (let i = 0; i < 24; i++) g.advance(5 * DAY);
    const steel = moon.stock.stainless_steel ?? 0;
    const copper = moon.stock.copper ?? 0;
    expect(steel).toBeGreaterThanOrEqual(4000);
    expect(steel % 2000).toBe(0);
    expect(copper / 1000).toBe(steel / 2000);
    expect(v.run?.manifest).toHaveLength(2);
    expect(JSON.parse(JSON.stringify(v.run))).toEqual(v.run);
    expect((orbit.stock.stainless_steel ?? 0) + steel + (v.cargo.stainless_steel ?? 0)).toBeCloseTo(
      100_000,
      3
    );
  });

  it('refuses an empty manifest, a zero amount and a manifest the hold cannot take', () => {
    const { g, v, orbit, moon } = setup();
    expect(startRun(g, v, { manifest: [], from: orbit.id, to: moon.id })).toMatch(/amount/);
    expect(
      startRun(g, v, { manifest: [{ material: 'copper', amount: 0 }], from: orbit.id, to: moon.id })
    ).toMatch(/amount/);
    expect(
      startRun(g, v, {
        manifest: [
          { material: 'copper', amount: 1e9 },
          { material: 'food_ration', amount: 1 }
        ],
        from: orbit.id,
        to: moon.id
      })
    ).toMatch(/holds/);
    expect(v.run).toBeNull();
  });
});
