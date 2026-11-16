import { describe, expect, it } from 'vitest';
import { milestone, milestones } from '#lib/game/data/index.ts';
import {
  earthMakes,
  missingFor,
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
