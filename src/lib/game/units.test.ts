import { describe, expect, it } from 'vitest';
import { DAY } from './clock';
import { AU, au, formatAu, formatDistance, KM, orbitRate } from './units';

describe('units', () => {
  it('keeps distances in metres', () => {
    expect(au(1)).toBe(AU);
    expect(AU / KM).toBeCloseTo(1.496e8, -5);
  });

  it('turns an orbital period into an angular speed', () => {
    expect(orbitRate(1) * DAY).toBeCloseTo(Math.PI * 2, 12);
  });

  it('formats a distance in the unit that reads best', () => {
    expect(formatDistance(3.6)).toBe('3.6 m');
    expect(formatDistance(891_000)).toBe('891 km');
    expect(formatDistance(5e8)).toBe('500,000 km');
    expect(formatDistance(13 * AU)).toBe('13 AU');
    expect(formatAu(3.14 * AU)).toBe('3.1 AU');
  });
});
