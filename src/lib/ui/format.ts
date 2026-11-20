import type { Unit } from '#lib/game/data/types.ts';

export type Tone = 'cool' | 'hot' | 'dim';
export type Trend = 'up' | 'down' | 'flat';

export const PERIODS = {
  year: { hours: 8760, unit: 'yr', word: 'a year', name: 'year' },
  day: { hours: 24, unit: 'd', word: 'a day', name: 'day' }
} as const;

export type Period = keyof typeof PERIODS;

export const group = (n: number): string => Math.round(n).toLocaleString('en-US');

export function num(v: number): string {
  const a = Math.abs(v);
  if (a < 0.0005) return '0';
  const digits = a >= 100 ? 0 : a >= 10 ? 1 : a >= 0.1 ? 2 : 3;
  return v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

export const count = (n: number): string => group(n);

export const people = (n: number): string => `${group(n / 1e6)} M`;

export const mass = (kg: number): string => `${Math.abs(kg) >= 10_000 ? group(kg / 1000) : num(kg / 1000)} t`;

const SUPERSCRIPT: Record<string, string> = {
  '-': '⁻',
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹'
};

export function scientific(v: number): string {
  const [mantissa = '0', exponent = '0'] = v.toExponential(2).split('e');
  const power = String(Number(exponent))
    .split('')
    .map((c) => SUPERSCRIPT[c] ?? c)
    .join('');
  return `${mantissa}\u00a0×\u00a010${power}`;
}

export function earthMasses(ratio: number): string {
  const text = ratio >= 0.001 ? String(Number(ratio.toPrecision(3))) : scientific(ratio);
  return `${text}\u00a0${text === '1' ? 'Earth\u00a0mass' : 'Earth\u00a0masses'}`;
}

export const bodyMass = (kg: number, earthKg: number): string =>
  `${earthMasses(kg / earthKg)} · ${scientific(kg / 1000)}\u00a0t`;

export const power = (kw: number): string => `${num(kw / 1000)} MW`;

export const gigawatts = (kw: number): string => `${num(kw / 1e6)} GW`;

export const gigawattHours = (kwh: number): string => `${num(kwh / 1e6)} GWh`;

export const thrust = (newtons: number): string => `${num(newtons / 1000)} kN`;

export const pct = (fraction: number): string => `${Math.round(fraction * 100)}%`;

export const eflops = (v: number): string => `${num(v)} EFLOP/s`;

export const money = (dollars: number): string =>
  `${dollars < 0 ? '-' : ''}$${num(Math.abs(dollars) / 1e9)}B`;

export const signedMoney = (dollars: number): string => signed(dollars, money(Math.abs(dollars)));

export function amount(a: number, unit?: Unit): string {
  if (unit === 'eflops') return eflops(a);
  if (unit === 'model') return num(a);
  return mass(a);
}

export function days(d: number): string {
  if (!isFinite(d)) return 'never';
  if (d >= 3652.5) return `${Math.round(d / 365.25)} y`;
  if (d >= 365.25) return `${(d / 365.25).toFixed(1)} y`;
  return `${Math.max(1, Math.ceil(d))} d`;
}

export function duration(seconds: number): string {
  if (!isFinite(seconds)) return 'never';
  if (seconds < 90) return `${Math.max(0, Math.round(seconds))} s`;
  const minutes = seconds / 60;
  if (minutes < 90) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 48) return `${Math.round(hours)} h`;
  return days(hours / 24);
}

export const isZero = (text: string): boolean => text === '0' || text.startsWith('0 ');

export function signed(value: number, text: string): string {
  return isZero(text) ? '0' : `${value < 0 ? '-' : '+'}${text}`;
}

export const signedAmount = (a: number, unit?: Unit): string => signed(a, amount(Math.abs(a), unit));

export const signedPower = (kw: number): string => signed(kw, power(Math.abs(kw)));

export const signedPct = (fraction: number): string => signed(fraction, pct(Math.abs(fraction)));

export const perHour = (perSecond: number): number => perSecond * 3600;

export function rate(ratePerHour: number, period: Period, unit?: Unit, withSign = false): string {
  if (unit === 'eflops') return withSign ? signedAmount(ratePerHour, unit) : amount(ratePerHour, unit);
  const v = ratePerHour * PERIODS[period].hours,
    text = withSign ? signedAmount(v, unit) : amount(v, unit);
  return isZero(text) ? '0' : `${text}/${PERIODS[period].unit}`;
}

export function trend(net: number, scale = 0): Trend {
  if (Math.abs(net) < 1e-6 * (scale + 1)) return 'flat';
  return net > 0 ? 'up' : 'down';
}

export const toneOf = (change: number): Tone => (change === 0 ? 'dim' : change > 0 ? 'cool' : 'hot');

export const trendTone = (t: Trend): Tone => (t === 'up' ? 'cool' : t === 'down' ? 'hot' : 'dim');

export const population = (n: number): string => (n >= 500_000 ? people(n) : group(n));

export function kcal(n: number): string {
  const a = Math.abs(n);
  if (a < 0.5) return '0 kcal';
  if (a >= 1e12) return `${num(n / 1e12)} T kcal`;
  if (a >= 1e9) return `${num(n / 1e9)} G kcal`;
  if (a >= 1e6) return `${num(n / 1e6)} M kcal`;
  return `${group(n)} kcal`;
}
