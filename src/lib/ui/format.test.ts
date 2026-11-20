import { describe, expect, it } from 'vitest';
import {
  amount,
  count,
  days,
  duration,
  gigawattHours,
  gigawatts,
  group,
  bodyMass,
  mass,
  money,
  scientific,
  num,
  kcal,
  people,
  population,
  pct,
  perHour,
  power,
  rate,
  signed,
  signedAmount,
  signedMoney,
  signedPct,
  signedPower,
  thrust,
  toneOf,
  trend,
  trendTone
} from './format.ts';

describe('money', () => {
  it('shows dollars in billions with a sign for gain and loss', () => {
    expect(money(15e9)).toBe('$15B');
    expect(money(5.2e8)).toBe('$0.52B');
    expect(money(-1.25e9)).toBe('-$1.25B');
    expect(signedMoney(7.3e8)).toBe('+$0.73B');
    expect(signedMoney(-2e9)).toBe('-$2B');
  });
});

describe('numbers', () => {
  it('groups thousands and rounds to whole numbers', () => {
    expect(group(1234567.4)).toBe('1,234,567');
    expect(count(999.6)).toBe('1,000');
    expect(group(0)).toBe('0');
  });

  it('keeps precision for small values and drops it for large ones', () => {
    expect(num(12345.6)).toBe('12,346');
    expect(num(123.4)).toBe('123');
    expect(num(12.34)).toBe('12.3');
    expect(num(1.234)).toBe('1.23');
    expect(num(0.5)).toBe('0.5');
    expect(num(0.125)).toBe('0.13');
    expect(num(0.0125)).toBe('0.013');
    expect(num(0.0004)).toBe('0');
    expect(num(-12.34)).toBe('-12.3');
  });
});

describe('body mass', () => {
  it('gives Earth masses and tonnes in scientific notation', () => {
    const plain = (text: string) => text.replace(/\u00a0/g, ' ');
    expect(plain(bodyMass(7.342e22, 5.9722e24))).toBe('0.0123 Earth masses · 7.34 × 10¹⁹ t');
    expect(plain(bodyMass(5.9722e24, 5.9722e24))).toBe('1 Earth mass · 5.97 × 10²¹ t');
    expect(plain(bodyMass(7.329e10, 5.9722e24))).toBe('1.23 × 10⁻¹⁴ Earth masses · 7.33 × 10⁷ t');
    expect(plain(scientific(9.996e19))).toBe('1.00 × 10²⁰');
  });
});

describe('units', () => {
  it('turns kilograms into tonnes', () => {
    expect(mass(1_500_000)).toBe('1,500 t');
    expect(mass(2.5e12)).toBe('2,500,000,000 t');
    expect(mass(12_500)).toBe('13 t');
    expect(mass(-12_600)).toBe('-13 t');
    expect(mass(9_500)).toBe('9.5 t');
    expect(mass(1000)).toBe('1 t');
    expect(mass(2500)).toBe('2.5 t');
    expect(mass(5)).toBe('0.005 t');
    expect(mass(0)).toBe('0 t');
  });

  it('turns kilowatts into megawatts', () => {
    expect(power(1_500_000)).toBe('1,500 MW');
    expect(power(250)).toBe('0.25 MW');
    expect(power(0)).toBe('0 MW');
  });

  it('turns kilowatts into gigawatts and kilowatt-hours into gigawatt-hours', () => {
    expect(gigawatts(422_050_000)).toBe('422 GW');
    expect(gigawatts(1_000_000)).toBe('1 GW');
    expect(gigawattHours(2_500_000)).toBe('2.5 GWh');
  });

  it('turns newtons into kilonewtons', () => {
    expect(thrust(845_000)).toBe('845 kN');
    expect(thrust(0.1)).toBe('0 kN');
    expect(thrust(2_500)).toBe('2.5 kN');
  });

  it('shows food energy in the unit that keeps three digits', () => {
    expect(kcal(0)).toBe('0 kcal');
    expect(kcal(2800)).toBe('2,800 kcal');
    expect(kcal(2.5e6)).toBe('2.5 M kcal');
    expect(kcal(2.3e13)).toBe('23 T kcal');
  });

  it('shows a small population as a count', () => {
    expect(population(4)).toBe('4');
    expect(population(120_000)).toBe('120,000');
    expect(population(8_100_000_000)).toBe('8,100 M');
  });

  it('shows people in millions', () => {
    expect(people(8_100_000_000)).toBe('8,100 M');
    expect(people(2_400_000)).toBe('2 M');
    expect(people(600_000)).toBe('1 M');
  });

  it('shows fractions as whole percentages', () => {
    expect(pct(0.456)).toBe('46%');
    expect(pct(1.2)).toBe('120%');
  });

  it('shows an amount by the unit of the material', () => {
    expect(amount(5000)).toBe('5 t');
    expect(amount(5000, 'kg')).toBe('5 t');
    expect(amount(1234.6, 'eflops')).toBe('1,235 EFLOP/s');
    expect(amount(90, 'eflops')).toBe('90 EFLOP/s');
    expect(amount(2.345, 'model')).toBe('2.35');
  });
});

describe('durations', () => {
  it('counts days up to a year, then years', () => {
    expect(days(0.2)).toBe('1 d');
    expect(days(12.1)).toBe('13 d');
    expect(days(400)).toBe('1.1 y');
    expect(days(4000)).toBe('11 y');
    expect(days(Infinity)).toBe('never');
  });

  it('counts seconds, minutes, hours and then days', () => {
    expect(duration(30)).toBe('30 s');
    expect(duration(600)).toBe('10 min');
    expect(duration(7200)).toBe('2 h');
    expect(duration(172_800)).toBe('2 d');
    expect(duration(86400 * 500)).toBe('1.4 y');
    expect(duration(Infinity)).toBe('never');
  });
});

describe('gain and loss', () => {
  it('signs a value and shows zero without a sign', () => {
    expect(signedAmount(5000)).toBe('+5 t');
    expect(signedAmount(-5000)).toBe('-5 t');
    expect(signedAmount(0.2)).toBe('0');
    expect(signedAmount(-12, 'eflops')).toBe('-12 EFLOP/s');
    expect(signedAmount(0, 'eflops')).toBe('0');
    expect(signedPower(-3000)).toBe('-3 MW');
    expect(signedPct(0.12)).toBe('+12%');
    expect(signedPct(-0.04)).toBe('-4%');
    expect(signed(1, '0 t')).toBe('0');
  });

  it('colours gains, losses and no change', () => {
    expect(toneOf(3)).toBe('cool');
    expect(toneOf(-3)).toBe('hot');
    expect(toneOf(0)).toBe('dim');
    expect(trendTone(trend(5))).toBe('cool');
    expect(trendTone(trend(-5))).toBe('hot');
    expect(trendTone(trend(0))).toBe('dim');
  });

  it('calls a change that is tiny against the stock flat', () => {
    expect(trend(1e-3, 1e6)).toBe('flat');
    expect(trend(5, 1e6)).toBe('up');
    expect(trend(-5, 1e6)).toBe('down');
  });
});

describe('rates', () => {
  it('shows an hourly rate over a day or a year', () => {
    expect(rate(1000, 'day')).toBe('24 t/d');
    expect(rate(1000, 'year')).toBe('8,760 t/yr');
    expect(rate(144, 'year', 'eflops')).toBe('144 EFLOP/s');
    expect(rate(0, 'day')).toBe('0');
  });

  it('signs a rate on request', () => {
    expect(rate(-1000, 'day', undefined, true)).toBe('-24 t/d');
    expect(rate(1000, 'day', undefined, true)).toBe('+24 t/d');
    expect(rate(0, 'day', undefined, true)).toBe('0');
  });

  it('converts a per-second rate to per hour', () => {
    expect(perHour(2)).toBe(7200);
    expect(rate(perHour(1000 / 3600), 'day')).toBe('24 t/d');
  });
});
