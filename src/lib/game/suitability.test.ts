import { describe, expect, it } from 'vitest';
import { environments } from '#lib/game/data/index.ts';
import { biospherePeople, growthScale, pressureOf, suitability } from './suitability.ts';

const s = (world: string) => suitability(world)!;

describe('colony suitability', () => {
  it('gives the Moon, Mars and Titan the suitability of the issue, and Earth 0.878 at the start', () => {
    expect(s('luna').s).toBeCloseTo(0.33, 2);
    expect(s('mars').s).toBeCloseTo(0.31, 2);
    expect(s('titan').s).toBeCloseTo(0.12, 2);
    expect(s('earth').s).toBeCloseTo(0.878, 3);
  });

  it('takes the worst single factor, never a sum', () => {
    const moon = s('luna');
    expect(moon.cc).toBeCloseTo(2, 6);
    expect(moon.factors.map((f) => f.kind)).toContain('temperature');
    expect(Math.max(...moon.factors.map((f) => f.cc))).toBe(moon.cc);
    expect(s('mercury').cc).toBeCloseTo(5.4, 1);
    expect(s('callisto').cc).toBeCloseTo(5.4, 1);
    expect(s('venus').cc).toBeCloseTo(23, 0);
  });

  it('puts the pressure of a stock at its mass times gravity over the surface', () => {
    const atm = (w: string) => pressureOf(environments.find((e) => e.world === w)!);
    expect(atm('earth')).toBeCloseTo(0.97, 2);
    expect(atm('mars')).toBeCloseTo(0.0064, 4);
    expect(atm('venus')).toBeGreaterThan(90);
    expect(atm('titan')).toBeCloseTo(1.45, 2);
  });

  it('lets nobody live on a giant and halves a biosphere under 0.1 g', () => {
    for (const w of ['jupiter', 'saturn', 'uranus', 'neptune']) {
      expect(s(w).habitable, w).toBe(false);
      expect(biospherePeople(w)).toBe(0);
    }
    expect(s('ceres').lowGravity).toBe(true);
    expect(s('ceres').cc).toBeGreaterThanOrEqual(1);
  });

  it('holds 300 times the suitability in a biosphere', () => {
    expect(biospherePeople('luna')).toBe(100);
    expect(biospherePeople('mars')).toBe(93);
    expect(biospherePeople('mercury')).toBe(47);
    expect(biospherePeople('titan')).toBe(37);
    expect(biospherePeople('ceres')).toBe(Math.floor(150 * s('ceres').s));
    expect(biospherePeople('bennu')).toBe(0);
  });

  it("scales Earth's growth with its suitability against the start", () => {
    expect(growthScale('earth')).toBe(1);
    expect(0.009 * growthScale('earth', 2)).toBeCloseTo(0.008, 4);
    expect(0.009 * growthScale('earth', 2.7)).toBeCloseTo(0.0068, 4);
    expect(growthScale('mars', 2)).toBe(1);
  });

  it('gives no body but Earth air to breathe', () => {
    expect(s('earth').factors.map((f) => f.kind)).toEqual(['temperature']);
    for (const e of environments.filter((x) => x.world !== 'earth' && s(x.world).habitable))
      expect(
        s(e.world).factors.some((f) => f.kind === 'oxygen'),
        e.world
      ).toBe(true);
  });
});
