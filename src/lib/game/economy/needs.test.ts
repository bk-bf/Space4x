import { describe, expect, it } from 'vitest';
import { milestone, milestones } from '#lib/game/data/index.ts';
import {
  advanceEconomy,
  earthMakes,
  missingFor,
  siteNeedMissing,
  newSite,
  programmeBill,
  siteNeedMet,
  standFirst,
  startEconomy,
  type Economy,
  type Site
} from './index.ts';

const gaps = (eco: Economy, n: number) =>
  missingFor(eco, eco.sites[0]!, milestone(n)).filter((x) => x.kind === 'site');

const moonSite = (eco: Economy, region: string | null = 'luna-south-pole'): Site =>
  newSite(eco, { worldBody: 'luna', bodyName: 'Luna', place: 'surface', region, angle: 0 })!;

describe('what a milestone needs to stand somewhere', () => {
  it('asks for a crewed outpost on the Moon before the lunar landing milestone starts', () => {
    const eco = startEconomy();
    expect(gaps(eco, 6)).toEqual([{ kind: 'site', label: 'No crewed outpost on the Moon' }]);
    const moon = moonSite(eco);
    expect(gaps(eco, 6)).toHaveLength(1);
    moon.population = 1;
    expect(gaps(eco, 6)).toEqual([]);
  });

  it('asks for the ice mine in the south polar region and not in another region', () => {
    const eco = startEconomy();
    eco.done = [1, 2, 3, 4, 5, 6, 7];
    const maria = moonSite(eco, 'luna-maria');
    standFirst(eco, maria, 'regolith_excavator');
    expect(gaps(eco, 8)).toHaveLength(1);
    const pole = moonSite(eco);
    standFirst(eco, pole, 'ice_mine');
    expect(gaps(eco, 8)).toEqual([]);
  });

  it('asks for a greenhouse with at least four people who are fed, not an empty or hungry one', () => {
    const eco = startEconomy();
    eco.done = Array.from({ length: 10 }, (_, i) => i + 1);
    const moon = moonSite(eco);
    standFirst(eco, moon, 'greenhouse');
    expect(gaps(eco, 11)).toHaveLength(1);
    moon.population = 4;
    expect(gaps(eco, 11)).toEqual([]);
    moon.alerts.food = true;
    expect(gaps(eco, 11)).toHaveLength(1);
    moon.alerts.food = false;
    moon.population = 3;
    expect(gaps(eco, 11)).toHaveLength(1);
  });

  it('asks for a miner on the surface of an asteroid of the right type', () => {
    const eco = startEconomy();
    eco.done = Array.from({ length: 15 }, (_, i) => i + 1);
    const bennu = newSite(eco, {
      worldBody: 'bennu',
      bodyName: 'Bennu',
      place: 'surface',
      region: 'bennu-body',
      angle: 0
    })!;
    standFirst(eco, bennu, 'asteroid_miner');
    expect(gaps(eco, 16)).toEqual([]);
    eco.done.push(16);
    expect(gaps(eco, 17)).toHaveLength(1);
    const hertha = newSite(eco, {
      worldBody: 'hertha',
      bodyName: 'Hertha',
      place: 'surface',
      region: 'hertha-body',
      angle: 0
    })!;
    standFirst(eco, hertha, 'asteroid_miner');
    expect(gaps(eco, 17)).toEqual([]);
  });

  it('asks for a sample on Earth that Earth cannot make', () => {
    const eco = startEconomy();
    expect(earthMakes('carbonaceous_chondrite')).toBe(false);
    const need = milestone(15).needs.sites![0]!;
    const earth = eco.sites[0]!;
    expect(siteNeedMet(earth, need)).toBe(false);
    earth.stock.carbonaceous_chondrite = 1;
    expect(siteNeedMet(earth, need)).toBe(true);
  });

  it('keeps a fed crew on a surface site from satisfying a need for a site in orbit', () => {
    const eco = startEconomy();
    const moon = moonSite(eco);
    moon.population = 10;
    expect(siteNeedMet(moon, { label: 'x', world: 'luna', place: 'orbit' })).toBe(false);
    expect(siteNeedMet(moon, { label: 'x', world: 'luna', place: 'surface', people: 10 })).toBe(true);
  });
});

describe('what a programme pays in', () => {
  it('leaves out materials that Earth cannot make and asks for those that it can', () => {
    for (const id of ['lunar_regolith', 'sintered_regolith', 'carbonaceous_chondrite', 'asteroidal_steel'])
      expect(earthMakes(id), id).toBe(false);
    for (const id of ['ndfeb_magnet', 'iron', 'lh2', 'haleu', 'plant_biomass'])
      expect(earthMakes(id), id).toBe(true);
    expect(programmeBill(milestone(8)).lunar_regolith).toBeUndefined();
    expect(programmeBill(milestone(8)).ndfeb_magnet).toBe(400_000);
    expect(programmeBill(milestone(10)).sintered_regolith).toBeUndefined();
    expect(programmeBill(milestone(16)).carbonaceous_chondrite).toBeUndefined();
    expect(programmeBill(milestone(17)).asteroidal_steel).toBeUndefined();
  });

  it('is unchanged for every milestone whose materials Earth makes', () => {
    for (const m of milestones.filter((x) => x.number <= 7))
      for (const id of m.needs.materials)
        if (!(id === 'compute' || id === 'ai_models' || id === 'neon'))
          expect(programmeBill(m)[id], `${m.number} ${id}`).toBeGreaterThan(0);
  });
});

describe('what a site has done', () => {
  it('counts the helium-3 a lunar excavator makes and the hours it runs, and asks for both', () => {
    const eco = startEconomy();
    eco.done = Array.from({ length: 22 }, (_, i) => i + 1);
    const maria = moonSite(eco, 'luna-maria');
    standFirst(eco, maria, 'regolith_excavator');
    const group = maria.groups[0]!;
    group.process = 'extract:helium3';
    maria.population = 10;
    maria.gridKw = 1000;
    const need = milestone(23).needs.sites![0]!;
    expect(siteNeedMet(maria, need)).toBe(false);
    advanceEconomy(eco, 86_400);
    expect(maria.made.helium3).toBeGreaterThan(1000);
    expect(maria.ran.regolith_excavator).toBeGreaterThan(20);
    expect(siteNeedMet(maria, need)).toBe(true);
    const south = moonSite(eco, 'luna-south-pole');
    expect(siteNeedMet(south, need)).toBe(false);
  });

  it('counts the ships a yard has finished', () => {
    const eco = startEconomy();
    const station = newSite(eco, { worldBody: 'earth', bodyName: 'Earth', place: 'orbit', angle: 0 })!;
    expect(station.built).toBe(0);
    station.yard.push({
      id: 99,
      design: 'x',
      name: 'x',
      yard: 'orbital_shipyard',
      cost: {},
      hours: 1,
      done: 0,
      paused: false,
      stalled: null
    });
    standFirst(eco, station, 'propellant_depot');
    station.groups.push({ id: 100, building: 'orbital_shipyard', process: null, count: 1, on: true });
    const need = milestone(18).needs.sites![0]!;
    expect(siteNeedMet(station, need)).toBe(false);
    advanceEconomy(eco, 7200);
    expect(station.built).toBe(1);
    expect(eco.delivered).toHaveLength(1);
    expect(siteNeedMet(station, need)).toBe(true);
  });

  it('asks for a drive to have flown, wherever it flew from', () => {
    const eco = startEconomy();
    const need = milestone(24).needs.sites![0]!;
    expect(siteNeedMissing(eco, need)).toBe(need.label);
    eco.flown.fusion_drive = 1;
    expect(siteNeedMissing(eco, need)).toBeUndefined();
  });

  it('lets a builder that stands in orbit satisfy a component that only an orbital yard can build', () => {
    const eco = startEconomy();
    eco.done = Array.from({ length: 23 }, (_, i) => i + 1);
    expect(missingFor(eco, eco.sites[0]!, milestone(24)).some((x) => x.kind === 'builder')).toBe(true);
    const station = newSite(eco, { worldBody: 'earth', bodyName: 'Earth', place: 'orbit', angle: 0 })!;
    station.groups.push({ id: 100, building: 'orbital_shipyard', process: null, count: 1, on: true });
    expect(missingFor(eco, eco.sites[0]!, milestone(24)).some((x) => x.kind === 'builder')).toBe(false);
  });

  it('asks for the stabiliser at the jump point and nowhere else', () => {
    const eco = startEconomy();
    eco.done = Array.from({ length: 28 }, (_, i) => i + 1);
    const orbit = newSite(eco, { worldBody: 'earth', bodyName: 'Earth', place: 'orbit', angle: 0 })!;
    orbit.groups.push({ id: 100, building: 'jump_point_stabiliser', process: null, count: 1, on: true });
    expect(gaps(eco, 29)).toHaveLength(1);
    const point = newSite(eco, { worldBody: 'sol-a', bodyName: 'Jump point A', place: 'point', angle: 0 })!;
    expect(point.id).toBe('sol-a');
    expect(point.body).toBe('jump-point');
    expect(gaps(eco, 29)).toHaveLength(1);
    point.groups.push({ id: 101, building: 'jump_point_stabiliser', process: null, count: 1, on: true });
    expect(gaps(eco, 29)).toEqual([]);
  });

  it('overrides the programme bill for the isotopes that no plant makes by the tonne', () => {
    const bill = programmeBill(milestone(22));
    expect(bill.tritium).toBe(20);
    expect(bill.deuterium).toBe(200);
    expect(bill.lithium6).toBe(200);
    expect(bill.rebco).toBe(1_100_000);
    expect(programmeBill(milestone(25)).deuterium).toBe(200);
  });
});
