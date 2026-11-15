import { describe, expect, it } from 'vitest';
import { DAY, STEPS, START_TIME, formatClock, formatEventTime } from './clock';

describe('clock', () => {
  it('starts at 12 Mar 2087 06:40 UTC', () => {
    expect(formatClock(START_TIME)).toBe('12 Mar 2087 06:40');
  });

  it('offers the eleven steps from 5 seconds to 30 days in order', () => {
    expect(STEPS.map((s) => s.label)).toEqual([
      '5s',
      '30s',
      '2m',
      '5m',
      '20m',
      '1h',
      '3h',
      '8h',
      '1d',
      '5d',
      '30d'
    ]);
    const seconds = STEPS.map((s) => s.seconds);
    expect(seconds).toEqual([...seconds].sort((a, b) => a - b));
    expect(seconds.at(-1)).toBe(30 * 86400);
  });

  it('defaults to the one day step', () => {
    expect(STEPS.find((s) => s.seconds === DAY)?.label).toBe('1d');
  });

  it('rolls the date over months and years', () => {
    expect(formatClock(START_TIME + 20 * 86400_000)).toBe('1 Apr 2087 06:40');
    expect(formatClock(Date.UTC(2087, 11, 31, 23, 59) + 60_000)).toBe('1 Jan 2088 00:00');
  });

  it('shows the time of day for events from today and the date for older ones', () => {
    expect(formatEventTime(Date.UTC(2087, 2, 12, 4, 12), START_TIME)).toBe('04:12');
    expect(formatEventTime(Date.UTC(2087, 2, 11, 23, 0), START_TIME)).toBe('11 Mar');
  });
});
