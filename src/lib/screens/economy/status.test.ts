import { beforeEach, describe, expect, it } from 'vitest';
import { Game } from '#lib/game/index.ts';
import { MINERALS } from './catalog.ts';
import { formatMoney, formatPeople } from './format.ts';
import { annualUse, fuelOutput, mineOutput } from './sim.ts';
import { resetEconomy, economy } from './state.svelte.ts';
import {
  fuelChip,
  leastCover,
  LOW_COVER_YEARS,
  peopleChip,
  shortageChip,
  totalFuel,
  totalPeople,
  wealthChip,
  yardsBusy,
  yardsChip
} from './status.ts';
import '#lib/screens/research/system.ts';
import './system.ts';

const chip = (g: Game, id: string) => g.status.find((c) => c.id === id);

beforeEach(resetEconomy);

describe('top bar chips', () => {
  it('are all present, in order, with an icon and a title', () => {
    expect(new Game().status.map((c) => [c.id, c.icon, c.title])).toEqual([
      ['wealth', 'coin', 'Wealth'],
      ['people', 'people', 'People'],
      ['fuel', 'drop', 'Fuel stock'],
      ['shortage', 'warn', 'Running low'],
      ['labs', 'flask', 'Labs busy'],
      ['yards', 'yard', 'Shipyards busy']
    ]);
  });

  it('show the wealth the Wealth tab shows and follow it', () => {
    const g = new Game();
    expect(chip(g, 'wealth')!.value).toBe(formatMoney(economy.wealth));
    expect(chip(g, 'wealth')!.value).toBe('18,400');
    economy.wealth = 7_250;
    expect(chip(g, 'wealth')!.value).toBe('7,250');
    expect(wealthChip(economy)).toBe('7,250');
  });

  it('sum the people of every colony', () => {
    const g = new Game();
    expect(totalPeople(economy)).toBeCloseTo(
      economy.colonies.reduce((a, c) => a + c.population, 0),
      0
    );
    expect(chip(g, 'people')!.value).toBe(formatPeople(totalPeople(economy)));
    const mars = economy.colonies.find((c) => c.id === 'mars')!;
    mars.population += 5e8;
    expect(peopleChip(economy)).toBe('1.7 bn');
    expect(chip(g, 'people')!.value).toBe('1.7 bn');
  });

  it('sum the fuel in every stockpile', () => {
    const g = new Game();
    const before = totalFuel(economy);
    expect(before).toBe(economy.colonies.reduce((a, c) => a + c.fuel, 0));
    economy.colonies[0]!.fuel += 100_000;
    expect(totalFuel(economy)).toBe(before + 100_000);
    expect(chip(g, 'fuel')!.value).toBe(fuelChip(economy));
  });

  it('warn about the resource with the least cover and say nothing is low when there is plenty', () => {
    const g = new Game();
    const low = leastCover(economy)!;
    expect(low.years).toBeLessThan(LOW_COVER_YEARS);
    expect(chip(g, 'shortage')).toMatchObject({ value: shortageChip(economy).value, warn: true });
    for (const c of economy.colonies) {
      for (const m of MINERALS) c.stock[m.id] = 1e12;
      c.fuel = 1e12;
    }
    expect(chip(g, 'shortage')).toMatchObject({ value: 'None', warn: false });
  });

  it('name the mineral whose stock lasts the fewest years across the empire', () => {
    const cover = (id: (typeof MINERALS)[number]['id']) => {
      const stock = economy.colonies.reduce((a, c) => a + c.stock[id], 0);
      const made = economy.colonies.reduce((a, c) => a + mineOutput(c, id, economy), 0);
      const use = economy.colonies.reduce((a, c) => a + annualUse(c, id, economy), 0);
      return use > made ? stock / (use - made) : Infinity;
    };
    const fuel = () => {
      const stock = totalFuel(economy);
      const made = economy.colonies.reduce((a, c) => a + fuelOutput(c, economy), 0);
      const use = economy.colonies.reduce((a, c) => a + annualUse(c, 'fuel', economy), 0);
      return use > made ? stock / (use - made) : Infinity;
    };
    const least = Math.min(...MINERALS.map((m) => cover(m.id)), fuel());
    expect(leastCover(economy)!.years).toBeCloseTo(least, 9);
  });

  it('count the yards with a ship or a task on the slipways', () => {
    const g = new Game();
    const all = economy.colonies.flatMap((c) => c.yards);
    const busy = all.filter((y) => y.tasks.length || y.slipways.some((s) => s.build)).length;
    expect(yardsBusy(economy)).toEqual({ busy, total: all.length });
    expect(chip(g, 'yards')!.value).toBe(`${busy}/${all.length}`);
    for (const y of all) {
      y.tasks = [];
      for (const s of y.slipways) s.build = null;
    }
    expect(yardsChip(economy)).toBe(`0/${all.length}`);
  });
});
