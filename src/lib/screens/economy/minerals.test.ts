import { describe, expect, it } from 'vitest';
import { reserveOf } from '#lib/game/data/index.ts';
import { flowsOf, startEconomy, newSite } from '#lib/game/economy/index.ts';
import { completeSurvey, resetSurvey } from '#lib/game/survey.svelte.ts';
import { LOW_YEARS, bodyDeposits, hasReserves, reserveRows, yearsText } from './minerals.ts';

describe('the Minerals tab on Earth', () => {
  const eco = startEconomy();
  const earth = eco.sites[0]!;
  const rows = reserveRows(eco, earth, flowsOf(earth));

  it('lists every reserve, the shortest-lived first and the ones not mined last', () => {
    expect(hasReserves(earth)).toBe(true);
    const years = rows.map((r) => r.years ?? Infinity);
    expect(years).toEqual([...years].sort((a, b) => a - b));
    expect(rows.at(-1)?.minedPerYear).toBe(0);
  });

  it('gives years left as the content left over what is mined a year', () => {
    const iron = rows.find((r) => r.id === 'iron')!;
    expect(iron.years).toBeCloseTo((reserveOf('iron')!.content ?? 0) / iron.minedPerYear, 6);
    expect(iron.low).toBe(iron.years! < LOW_YEARS);
    const aluminium = rows.find((r) => r.id === 'aluminium')!;
    expect(aluminium.years).toBeCloseTo(29e12 / 450e9, 0);
  });

  it('shows the reserve in its published basis, drawn down in proportion', () => {
    eco.drawn.aluminium = reserveOf('aluminium')!.content! / 4;
    const aluminium = reserveRows(eco, earth, flowsOf(earth)).find((r) => r.id === 'aluminium')!;
    expect(aluminium.left).toBeCloseTo(reserveOf('aluminium')!.reserve * 0.75, -3);
  });

  it('writes years as the sketch does', () => {
    expect(yearsText(Infinity)).toBe('not mined');
    expect(yearsText(48.6)).toBe('49 yr');
    expect(yearsText(1260)).toBe('1300 yr');
    expect(yearsText(null)).toBe('-');
  });
});

describe('the Minerals tab off Earth', () => {
  it('shows only what is surveyed, with ranges, and the exact grade of the site region', () => {
    resetSurvey();
    const eco = startEconomy();
    const site = newSite(eco, {
      worldBody: 'luna',
      bodyName: 'Moon',
      place: 'surface',
      region: 'luna-south-pole',
      angle: 0
    })!;
    expect(hasReserves(site)).toBe(false);
    const known = bodyDeposits(site);
    expect(known.unknown).toBe(false);
    const own = known.groups.find((g) => g.here)!;
    expect(own.rows.every((r) => r.exact)).toBe(true);
    expect(
      known.groups
        .filter((g) => !g.here)
        .flatMap((g) => g.rows)
        .every((r) => !r.exact)
    ).toBe(true);
  });

  it('lists nothing of an unsurveyed body but its atmosphere, until a survey', () => {
    resetSurvey();
    const eco = startEconomy();
    const site = newSite(eco, { worldBody: 'mars', bodyName: 'Mars', place: 'orbit', angle: 0 })!;
    const before = bodyDeposits(site);
    expect(before.unknown).toBe(true);
    expect(before.groups.map((g) => g.id)).toEqual(['mars-atmosphere']);
    completeSurvey('mars');
    expect(bodyDeposits(site).groups.length).toBeGreaterThan(1);
    resetSurvey();
  });
});
