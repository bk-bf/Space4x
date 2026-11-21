import { describe, expect, it } from 'vitest';
import { building, projectById } from '#lib/game/data/index.ts';
import { biospherePeople } from '#lib/game/suitability.ts';
import {
  advanceEconomy,
  berthsOf,
  buildable,
  buildCost,
  buildHours,
  buildMass,
  newSite,
  POWER,
  queueBuilding,
  siteFlows,
  standKits,
  startEconomy,
  type Economy,
  type Site
} from './index.ts';

const BIOSPHERE = 'biosphere';
const KIT = 'biosphere_kit';
const DAY = 86_400;

function research(eco: Economy): void {
  eco.done.push(projectById('biosphere').number, ...projectById('biosphere').requires);
}

function moonBase(eco: Economy, worldBody = 'luna', bodyName = 'Luna', region: string | null = null): Site {
  research(eco);
  return newSite(eco, { worldBody, bodyName, place: 'surface', region, angle: 0 })!;
}

const stockMass = (site: Site) => Object.values(site.stock).reduce((a, v) => a + v, 0);

describe('biospheres', () => {
  it('cost the same 551 t of goods on every body, with no shield', () => {
    expect(buildCost(BIOSPHERE)).toBe(building(BIOSPHERE).cost);
    expect(buildMass(BIOSPHERE)).toBe(551_000);
    expect(buildHours(BIOSPHERE)).toBe(24 * (10 + 2 * 551));
  });

  it('house 1,000 times the suitability of a surface site off Earth', () => {
    const eco = startEconomy();
    const site = moonBase(eco);
    expect(berthsOf(site)).toBe(0);
    site.groups.push({ id: eco.nextId++, building: BIOSPHERE, process: null, count: 2, on: true });
    expect(biospherePeople('luna')).toBeGreaterThanOrEqual(330);
    expect(biospherePeople('luna')).toBeLessThan(340);
    expect(berthsOf(site)).toBe(2 * biospherePeople('luna'));
    expect(berthsOf(eco.sites[0]!)).toBeNull();
  });

  it('draw 0.83 kW and 0.09 workers a resident, staffed before every other building', () => {
    const eco = startEconomy();
    const site = moonBase(eco);
    site.population = 100;
    site.gridKw = 1e6;
    site.groups.push({ id: eco.nextId++, building: BIOSPHERE, process: null, count: 2, on: true });
    site.groups.push({ id: eco.nextId++, building: 'smelter', process: null, count: 5, on: true });
    site.workforceShare = 0.5;
    const f = siteFlows(eco, site);
    const bio = f.actors.find((x) => x.kind === 'group' && x.group.building === BIOSPHERE)!;
    expect(bio.inputs[POWER]).toBeCloseTo(83, 9);
    expect(bio.cap).toBe(1);
    expect(bio.limit).toBeNull();
    expect(f.workers.needed).toBeCloseTo(9 + 100, 9);
    const smelter = f.actors.find((x) => x.kind === 'group' && x.group.building === 'smelter')!;
    expect(smelter.limit).toEqual({ kind: 'idle' });

    site.groups.push({
      id: eco.nextId++,
      building: 'alloy_works',
      process: 'stainless_steel_304',
      count: 3,
      on: true
    });
    const g = siteFlows(eco, site);
    const works = g.actors.find((x) => x.kind === 'group' && x.group.building === 'alloy_works')!;
    expect(works.cap).toBeCloseTo((50 - 9) / (3 * building('alloy_works').workers + 5 * 20), 9);
    expect(g.actors.find((x) => x.kind === 'group' && x.group.building === BIOSPHERE)!.cap).toBe(1);
  });

  it('are built where a flight machine shop stands, not on the body they stand on', () => {
    const eco = startEconomy();
    const moon = moonBase(eco);
    const earth = eco.sites[0]!;
    expect(buildable(eco, moon).some((b) => b.id === BIOSPHERE)).toBe(false);
    expect(queueBuilding(eco, moon, BIOSPHERE, null)).toEqual([]);
    expect(buildable(eco, earth).some((b) => b.id === BIOSPHERE)).toBe(true);
    moon.groups.push({ id: eco.nextId++, building: 'machine_shop', process: null, count: 1, on: true });
    expect(buildable(eco, moon).some((b) => b.id === BIOSPHERE)).toBe(true);
  });

  it('are packed into the stock where they cannot stand, and the mass is kept', () => {
    const eco = startEconomy();
    research(eco);
    const earth = eco.sites[0]!;
    for (const [m, kg] of Object.entries(buildCost(BIOSPHERE))) earth.stock[m] = (earth.stock[m] ?? 0) + kg;
    const before = stockMass(earth);
    expect(queueBuilding(eco, earth, BIOSPHERE, null)).toHaveLength(1);
    advanceEconomy(eco, (buildHours(BIOSPHERE) / 24 + 1) * DAY);
    expect(earth.queue.some((o) => o.building === BIOSPHERE)).toBe(false);
    expect(earth.groups.some((g) => g.building === BIOSPHERE)).toBe(false);
    expect(earth.stock[KIT]).toBeCloseTo(551_000, 6);
    const { extracted, eaten, built, lost } = eco.ledger;
    expect(stockMass(earth) - before).toBeCloseTo(extracted - eaten - built - lost, -3);
  });

  it('stand where a whole one is unloaded on a body with a suitability', () => {
    const eco = startEconomy();
    const moon = moonBase(eco);
    moon.stock[KIT] = 300_000;
    expect(standKits(eco, moon)).toBe(0);
    moon.stock[KIT] += 300_000;
    const built = eco.ledger.built;
    expect(standKits(eco, moon)).toBe(1);
    expect(moon.stock[KIT]).toBeCloseTo(49_000, 6);
    expect(eco.ledger.built - built).toBe(551_000);
    expect(berthsOf(moon)).toBe(biospherePeople('luna'));
    const bennu = newSite(eco, {
      worldBody: 'bennu',
      bodyName: 'Bennu',
      place: 'surface',
      region: 'bennu-body',
      angle: 0
    })!;
    bennu.stock[KIT] = 551_000;
    expect(standKits(eco, bennu)).toBe(0);
    expect(standKits(eco, eco.sites[0]!)).toBe(0);
  });

  it("leave Earth's growth as it is at the start", () => {
    const eco = startEconomy();
    const earth = eco.sites[0]!;
    expect(siteFlows(eco, earth).growthPerHour).toBeCloseTo(earth.growthPerYear / 8766, 12);
  });
});
