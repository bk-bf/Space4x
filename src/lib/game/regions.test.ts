import { describe, expect, it } from 'vitest';
import '#lib/screens/economy/system.ts';
import { asteroidRecord, region, regionsOf } from '#lib/game/data/index.ts';
import {
  advanceEconomy,
  assign,
  economy,
  EXTRACT_KG_PER_HOUR,
  firstBuildings,
  gradeAt,
  newSite,
  remainingMass,
  siteFlows,
  standFirst,
  unlockedProcesses,
  type GroupActor,
  type Site
} from '#lib/game/economy/index.ts';
import { DAY } from '#lib/game/clock.ts';
import { addDesign, freshGame, spawn } from '#lib/game/ships/fixtures.ts';
import { foundOptions, foundRegions, foundSite } from '#lib/game/ships/colonise.ts';
import { addOrder } from '#lib/game/ships/orders.ts';
import { planHop } from '#lib/game/ships/hop.ts';
import { planVessel } from '#lib/game/ships/trips.ts';
import { flightBody } from '#lib/game/ships/world.ts';
import { orbitToSurface, surfaceToOrbit } from '#lib/game/flight/index.ts';
import {
  gradeView,
  isSurveyed,
  knownRegions,
  regionKnown,
  SURVEY_DAYS_PLANET,
  SURVEY_ERROR,
  surveyDays
} from '#lib/game/survey.svelte.ts';

const unlockTo = (milestone: number) => {
  economy.done = Array.from({ length: milestone }, (_, i) => i + 1).filter((n) => n !== 21);
};

const outpost = (world: string, regionId: string, bodyName = world): Site => {
  const site = newSite(economy, {
    worldBody: world,
    bodyName,
    place: 'surface',
    region: regionId,
    angle: 0
  })!;
  site.population = 100;
  site.gridKw = 1e7;
  return site;
};

const run = (site: Site, building: string, process: string, count = 1): GroupActor => {
  standFirst(economy, site, building);
  const g = site.groups.find((x) => x.building === building)!;
  g.count = count;
  const made = assign(economy, site, g.id, process, count) ?? g;
  const a = siteFlows(economy, site).actors.find((x) => x.kind === 'group' && x.group.id === made.id);
  if (!a || a.kind !== 'group') throw new Error('no actor');
  return a;
};

describe('extraction by region', () => {
  it('multiplies the extractor rate by the grade of the deposit in the site region', () => {
    freshGame();
    unlockTo(14);
    const maria = outpost('luna', 'luna-maria', 'Luna');
    const a = run(maria, 'regolith_excavator', 'extract:iron');
    expect(a.grade).toBe(1.5);
    expect(a.outputs.iron).toBeCloseTo(EXTRACT_KG_PER_HOUR * 1.5, 9);
    const flows = siteFlows(economy, maria);
    expect(flows.produced.iron).toBeCloseTo(EXTRACT_KG_PER_HOUR * 1.5, 9);
    expect(flows.extractedMass).toBeCloseTo(EXTRACT_KG_PER_HOUR * 1.5, 9);
  });

  it('gives a poorer region of the same body a smaller rate for the same material', () => {
    freshGame();
    unlockTo(14);
    const highlands = outpost('luna', 'luna-highlands', 'Luna');
    const a = run(highlands, 'regolith_excavator', 'extract:iron');
    expect(a.grade).toBe(0.4);
    expect(a.outputs.iron).toBeCloseTo(EXTRACT_KG_PER_HOUR * 0.4, 9);
  });

  it('offers only what the region holds: no ice in the maria, ice at the south pole', () => {
    const g = freshGame();
    unlockTo(14);
    const maria = outpost('luna', 'luna-maria', 'Luna');
    const ids = (s: Site, b: string) => unlockedProcesses(economy, s, b).map((p) => p.id);
    expect(ids(maria, 'ice_mine')).toEqual([]);
    expect(ids(maria, 'regolith_excavator')).toContain('extract:ilmenite');
    expect(ids(maria, 'regolith_excavator')).not.toContain('extract:anorthite');
    expect(firstBuildings(economy, 'luna', 'surface', 'luna-maria').map((b) => b.id)).not.toContain(
      'ice_mine'
    );
    expect(firstBuildings(economy, 'luna', 'surface', 'luna-south-pole').map((b) => b.id)).toContain(
      'ice_mine'
    );
    expect(gradeAt(maria, 'water')).toBeUndefined();
    expect(g.body('luna')).toBeDefined();
  });

  it('stops a group whose region lacks its material and names the missing deposit', () => {
    freshGame();
    unlockTo(14);
    const pole = outpost('luna', 'luna-south-pole', 'Luna');
    standFirst(economy, pole, 'regolith_excavator');
    const group = pole.groups[0]!;
    group.process = 'extract:ilmenite';
    const a = siteFlows(economy, pole).actors.find((x) => x.kind === 'group')!;
    expect(a.share).toBe(0);
    expect(a.limit).toEqual({ kind: 'deposit', id: 'ilmenite' });
  });

  it('draws an atmosphere in every region at the atmosphere grade', () => {
    freshGame();
    unlockTo(14);
    const a = run(
      outpost('mars', 'mars-meridiani', 'Mars'),
      'air_separation_plant',
      'extract:carbon_dioxide'
    );
    expect(a.grade).toBe(3);
    const b = run(
      outpost('mars', 'mars-polar-layered-deposits', 'Mars'),
      'air_separation_plant',
      'extract:carbon_dioxide'
    );
    expect(b.grade).toBe(3);
  });

  it('keeps Earth at a grade of one with no region', () => {
    freshGame();
    const earth = economy.sites[0]!;
    expect(earth.region).toBeNull();
    expect(gradeAt(earth, 'iron')).toBe(1);
  });

  it('holds a total that does not depend on the step size', () => {
    freshGame();
    unlockTo(14);
    const site = outpost('luna', 'luna-maria', 'Luna');
    run(site, 'regolith_excavator', 'extract:iron');
    const whole = structuredClone(economy);
    advanceEconomy(economy, 30 * DAY);
    const month = site.stock.iron ?? 0;
    Object.assign(economy, whole);
    const site2 = economy.sites.find((s) => s.id === site.id)!;
    for (let i = 0; i < 30; i++) advanceEconomy(economy, DAY);
    expect(site2.stock.iron ?? 0).toBeCloseTo(month, 3);
    expect(month).toBeCloseTo(EXTRACT_KG_PER_HOUR * 1.5 * 24 * 30, 3);
  });
});

describe('asteroids deplete', () => {
  it('stop extracting at the mass of the body and say so', () => {
    const g = freshGame();
    unlockTo(16);
    const bennu = asteroidRecord('bennu')!;
    const site = outpost('bennu', 'bennu-body', 'Bennu');
    economy.mined.bennu = bennu.mass - 5e5;
    run(site, 'asteroid_miner', 'extract:water');
    advanceEconomy(economy, 15 * DAY, (text, warn) => void g.log('factory', text, warn));
    expect(remainingMass(economy, 'bennu')).toBeLessThanOrEqual(1);
    const water = site.stock.water ?? 0;
    expect(water).toBeGreaterThan(5e5 - 2);
    expect(water).toBeLessThan(5e5 + 2);
    expect(economy.exhausted).toContain('bennu');
    advanceEconomy(economy, 3 * DAY);
    expect(site.stock.water ?? 0).toBe(water);
    const a = siteFlows(economy, site).actors.find((x) => x.kind === 'group')!;
    expect(a.limit).toEqual({ kind: 'depleted' });
    expect(g.events.some((e) => e.text.includes('mined out'))).toBe(true);
  });

  it('deplete in proportion to what is mined and leave moons and planets alone', () => {
    freshGame();
    unlockTo(16);
    const site = outpost('bennu', 'bennu-body', 'Bennu');
    run(site, 'asteroid_miner', 'extract:water');
    advanceEconomy(economy, 10 * DAY);
    const rate =
      EXTRACT_KG_PER_HOUR * region('bennu-body')!.deposits.find((d) => d.material === 'water')!.grade;
    expect(economy.mined.bennu).toBeCloseTo(rate * 240, 3);
    expect(remainingMass(economy, 'luna')).toBe(Infinity);
    expect(remainingMass(economy, 'mars')).toBe(Infinity);
  });
});

describe('survey', () => {
  const PROBE = {
    id: 'probe',
    role: 'probe' as const,
    parts: [
      ['chemical_engine_methalox', 1],
      ['propellant_tank', 2],
      ['structure_truss', 1],
      ['solar_array', 1],
      ['avionics', 1],
      ['survey_suite', 1]
    ] as const,
    load: [['methalox', 1e9]] as const
  };
  const BLIND = { ...PROBE, id: 'blind', parts: PROBE.parts.filter(([c]) => c !== 'survey_suite') };

  it('starts with the Moon known and Mars, Mercury and Ceres unknown', () => {
    freshGame();
    expect(isSurveyed('luna')).toBe(true);
    expect(
      knownRegions('luna')
        .map((r) => r.id)
        .sort()
    ).toEqual(
      regionsOf('luna')
        .map((r) => r.id)
        .sort()
    );
    for (const w of ['mars', 'mercury', 'ceres', 'bennu', 'europa']) {
      expect(isSurveyed(w), w).toBe(false);
      expect(knownRegions(w), w).toEqual([]);
    }
    expect(regionKnown(region('mars-atmosphere')!)).toBe(true);
  });

  it('reveals the regions and grades of a body after the survey time in its orbit', () => {
    const g = freshGame();
    addDesign(PROBE);
    const v = spawn('probe', { kind: 'orbit', body: 'mars', angle: 0 });
    addOrder(v, { type: 'survey', body: 'mars' });
    g.advance((surveyDays('mars') - 1) * DAY);
    expect(isSurveyed('mars')).toBe(false);
    expect(v.blocked).toBeNull();
    g.advance(2 * DAY);
    expect(isSurveyed('mars')).toBe(true);
    expect(v.orders).toEqual([]);
    expect(knownRegions('mars').length).toBe(regionsOf('mars').length);
    expect(SURVEY_DAYS_PLANET).toBe(surveyDays('mars'));
    expect(g.events.some((e) => e.text.includes('surveyed Mars'))).toBe(true);
  });

  it('takes less time for an asteroid than for a planet', () => {
    expect(surveyDays('bennu')).toBeLessThan(surveyDays('mars'));
  });

  it('refuses a ship with no instruments and a ship that is not in orbit of the body', () => {
    const g = freshGame();
    addDesign(PROBE);
    addDesign(BLIND);
    const blind = spawn('blind', { kind: 'orbit', body: 'mars', angle: 0 });
    addOrder(blind, { type: 'survey', body: 'mars' });
    const far = spawn('probe', { kind: 'orbit', body: 'earth', angle: 0 });
    addOrder(far, { type: 'survey', body: 'mars' });
    g.advance(DAY);
    expect(blind.blocked).toContain('no survey instruments');
    expect(far.blocked).toContain('must be in orbit of Mars');
    expect(isSurveyed('mars')).toBe(false);
  });

  it('shows grades to a first precision: a range that holds the true grade', () => {
    const r = region('mars-polar-layered-deposits')!;
    const v = gradeView(r, 'water')!;
    expect(v.low).toBeLessThan(3);
    expect(v.high).toBeGreaterThan(3);
    expect(v.high / v.low).toBeCloseTo((1 + SURVEY_ERROR) / (1 - SURVEY_ERROR), 9);
    expect(gradeView(r, 'gold')).toBeUndefined();
  });

  it('is needed before a site can be founded in a region of an unsurveyed body', () => {
    const g = freshGame();
    addDesign({
      id: 'lander',
      role: 'lander',
      parts: [
        ['chemical_engine_hydrolox', 1],
        ['propellant_tank', 1],
        ['structure_truss', 1],
        ['landing_legs', 1],
        ['cargo_bay', 1]
      ],
      load: [['hydrolox', 1e9]]
    });
    unlockTo(14);
    const v = spawn(
      'lander',
      { kind: 'surface', body: 'mars' },
      { cargo: { stainless_steel: 5000, copper: 500, aluminium: 500 } }
    );
    expect(foundRegions(v)).toEqual([]);
    expect(foundSite(g, v, 'regolith_excavator', 'mars-basaltic-plains')).toContain('has not been surveyed');
  });
});

describe('founding in a region', () => {
  const lander = {
    id: 'lander',
    role: 'lander' as const,
    parts: [
      ['chemical_engine_hydrolox', 1],
      ['propellant_tank', 1],
      ['structure_truss', 1],
      ['landing_legs', 1],
      ['cargo_bay', 1]
    ] as const,
    load: [['hydrolox', 1e9]] as const
  };

  it('stands the site in the chosen region and offers only buildings that can work there', () => {
    const g = freshGame();
    addDesign(lander);
    unlockTo(14);
    const v = spawn(
      'lander',
      { kind: 'surface', body: 'luna' },
      {
        cargo: { stainless_steel: 5000, copper: 500, li_ion_cell: 1000, ai_models: 5, ndfeb_magnet: 200 }
      }
    );
    expect(
      foundRegions(v)
        .map((r) => r.id)
        .sort()
    ).toEqual(
      regionsOf('luna')
        .map((r) => r.id)
        .sort()
    );
    const maria = foundOptions(v, 'luna-maria').map((o) => o.building.id);
    const pole = foundOptions(v, 'luna-south-pole').map((o) => o.building.id);
    expect(maria).toContain('regolith_excavator');
    expect(maria).not.toContain('ice_mine');
    expect(pole).toContain('ice_mine');
    expect(foundSite(g, v, 'ice_mine', 'luna-maria')).toBe('Ice mine cannot be built here yet.');
    const site = foundSite(g, v, 'ice_mine', 'luna-south-pole') as Site;
    expect(site.region).toBe('luna-south-pole');
    expect(gradeAt(site, 'water')).toBe(2);
    expect(site.groups[0]?.process).toBe('extract:water');
  });

  it('lets a second site stand in another region of the same body', () => {
    const g = freshGame();
    addDesign(lander);
    unlockTo(14);
    const cargo = { stainless_steel: 5000, copper: 500, li_ion_cell: 1000, ai_models: 5, ndfeb_magnet: 200 };
    const a = spawn('lander', { kind: 'surface', body: 'luna' }, { cargo: { ...cargo } });
    const first = foundSite(g, a, 'ice_mine', 'luna-south-pole') as Site;
    const b = spawn('lander', { kind: 'surface', body: 'luna' }, { cargo: { ...cargo } });
    expect(foundRegions(b).map((r) => r.id)).not.toContain('luna-south-pole');
    expect(foundSite(g, b, 'regolith_excavator', 'luna-south-pole')).toBe('There is a site here already.');
    const second = foundSite(g, b, 'regolith_excavator', 'luna-maria') as Site;
    expect(second.id).not.toBe(first.id);
    expect(second.region).toBe('luna-maria');
    expect(economy.sites.filter((s) => s.worldBody === 'luna').length).toBe(2);
  });
});

describe('flying to and landing on an asteroid', () => {
  it('costs almost nothing to land on a small body by the flight library own formulas', () => {
    const g = freshGame();
    const bennu = flightBody(g, 'bennu')!;
    expect(bennu).toBeDefined();
    expect(surfaceToOrbit(bennu)).toBeLessThan(1);
    expect(orbitToSurface(bennu)).toBeLessThan(1);
    expect(orbitToSurface(flightBody(g, 'vesta')!)).toBeLessThan(500);
    expect(orbitToSurface(flightBody(g, 'luna')!)).toBeGreaterThan(1500);
  });

  it('plans a trip from low Earth orbit to the orbit of Bennu and a landing from there', () => {
    const g = freshGame();
    addDesign({
      id: 'tug',
      role: 'transfer',
      parts: [
        ['chemical_engine_methalox', 1],
        ['propellant_tank', 40],
        ['structure_truss', 1],
        ['landing_legs', 1],
        ['avionics', 1]
      ],
      load: [['methalox', 1e9]]
    });
    const v = spawn('tug', { kind: 'orbit', body: 'earth', angle: 0 }, { propellant: { methalox: 1e6 } });
    const out = planVessel(g, v, { kind: 'orbit', body: 'bennu', angle: 0 });
    expect(out.reasons).toEqual([]);
    expect(out.options.length).toBeGreaterThan(0);
    const near = spawn('tug', { kind: 'orbit', body: 'bennu', angle: 0 }, { propellant: { methalox: 1e4 } });
    const down = planHop(g, near, 'descent', 'bennu');
    expect(typeof down).toBe('object');
    if (typeof down === 'object') expect(down.dv).toBeLessThan(1);
    expect(planHop(g, near, 'ascent', 'bennu')).toMatchObject({ kind: 'ascent' });
  });

  it('flies a vessel there on orders, then lands it from orbit', () => {
    const g = freshGame();
    addDesign({
      id: 'tug',
      role: 'transfer',
      parts: [
        ['chemical_engine_methalox', 1],
        ['propellant_tank', 40],
        ['structure_truss', 1],
        ['landing_legs', 1],
        ['avionics', 1]
      ],
      load: [['methalox', 1e9]]
    });
    const v = spawn('tug', { kind: 'orbit', body: 'earth', angle: 0 }, { propellant: { methalox: 1e6 } });
    addOrder(v, { type: 'fly', body: 'bennu', angle: 0 });
    addOrder(v, { type: 'land', body: 'bennu' });
    for (let i = 0; i < 200 && (v.orders.length || v.trip); i++) g.advance(30 * DAY);
    expect(v.blocked).toBeNull();
    expect(v.at).toEqual({ kind: 'surface', body: 'bennu' });
  });
});
