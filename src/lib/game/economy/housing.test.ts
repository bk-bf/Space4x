import { describe, expect, it } from 'vitest';
import { building, projectById } from '#lib/game/data/index.ts';
import {
  berthsOf,
  buildable,
  buildCost,
  buildHours,
  newSite,
  POWER,
  queueBuilding,
  siteFlows,
  startEconomy,
  type Economy,
  type Site
} from './index.ts';

const BIOSPHERE = 'biosphere';

function moonBase(eco: Economy, worldBody = 'luna', bodyName = 'Luna', region: string | null = null): Site {
  eco.done.push(projectById('biosphere').number, ...projectById('biosphere').requires);
  return newSite(eco, { worldBody, bodyName, place: 'surface', region, angle: 0 })!;
}

describe('biospheres', () => {
  it('shield with 8,500 t of the regolith of the body they stand on', () => {
    expect(buildCost(BIOSPHERE, 'moon').lunar_regolith).toBe(8_500_000);
    expect(buildCost(BIOSPHERE, 'mars').martian_regolith).toBe(8_500_000);
    expect(buildCost(BIOSPHERE, 'mercury').basalt).toBe(8_500_000);
    expect(buildCost(BIOSPHERE, 'icy-moon').water).toBe(8_500_000);
    expect(buildCost(BIOSPHERE)).toBe(building(BIOSPHERE).cost);
    expect(buildHours(BIOSPHERE, 'moon')).toBeGreaterThan(buildHours(BIOSPHERE));
  });

  it('house the people of a surface site off Earth, 100 a biosphere on the Moon', () => {
    const eco = startEconomy();
    const site = moonBase(eco);
    expect(berthsOf(site)).toBe(0);
    site.groups.push({ id: eco.nextId++, building: BIOSPHERE, process: null, count: 2, on: true });
    expect(berthsOf(site)).toBe(200);
    expect(berthsOf(eco.sites[0]!)).toBeNull();
  });

  it('draw 83 kW and nine workers each', () => {
    const eco = startEconomy();
    const site = moonBase(eco);
    site.population = 9;
    site.gridKw = 1000;
    site.groups.push({ id: eco.nextId++, building: BIOSPHERE, process: null, count: 2, on: true });
    const f = siteFlows(eco, site);
    const a = f.actors.find((x) => x.kind === 'group' && x.group.building === BIOSPHERE)!;
    expect(a.inputs[POWER]).toBe(166);
    expect(f.workers.needed).toBe(18);
    expect(a.cap).toBeCloseTo(0.5, 9);
    expect(a.limit).toEqual({ kind: 'workers' });
  });

  it('stand only where the body has a suitability', () => {
    const eco = startEconomy();
    const moon = moonBase(eco);
    expect(buildable(eco, moon).some((b) => b.id === BIOSPHERE)).toBe(true);
    const bennu = newSite(eco, {
      worldBody: 'bennu',
      bodyName: 'Bennu',
      place: 'surface',
      region: 'bennu-body',
      angle: 0
    })!;
    expect(bennu.body).toBe('asteroid-c');
    expect(buildable(eco, bennu).some((b) => b.id === BIOSPHERE)).toBe(false);
    expect(queueBuilding(eco, bennu, BIOSPHERE, null)).toEqual([]);
    expect(queueBuilding(eco, moon, BIOSPHERE, null)).toHaveLength(1);
  });

  it("leave Earth's growth as it is at the start", () => {
    const eco = startEconomy();
    const earth = eco.sites[0]!;
    expect(siteFlows(eco, earth).growthPerHour).toBeCloseTo(earth.growthPerYear / 8766, 12);
  });
});
