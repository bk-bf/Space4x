import { material } from '#lib/game/data/index.ts';

const group = (n: number): string => Math.round(n).toLocaleString('en-US');

const scaled = (n: number, units: readonly [number, string][]): string => {
  const a = Math.abs(n);
  for (const [size, unit] of units)
    if (a >= size) {
      const v = n / size;
      return `${Math.abs(v) >= 100 ? Math.round(v) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2)} ${unit}`;
    }
  return `${a >= 10 ? Math.round(n) : n.toFixed(a >= 1 ? 1 : 2)} ${units[units.length - 1]?.[1] ?? ''}`.trim();
};

export function formatPeople(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} bn`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} M`;
  return group(n);
}

export const formatCount = (n: number): string => (Math.abs(n) >= 1e6 ? formatPeople(n) : group(n));

export function formatMass(kg: number): string {
  if (Math.abs(kg) < 0.5) return '0';
  return scaled(kg, [
    [1e12, 'Gt'],
    [1e9, 'Mt'],
    [1e6, 'kt'],
    [1e3, 't'],
    [1, 'kg']
  ]);
}

export function formatAmount(id: string, amount: number): string {
  const unit = material(id).unit;
  if (unit === 'cu') return `${formatCount(amount)} cu`;
  if (unit === 'model') return `${amount.toFixed(amount < 10 ? 1 : 0)}`;
  return formatMass(amount);
}

export function formatSignedAmount(id: string, amount: number): string {
  const text = formatAmount(id, Math.abs(amount));
  if (text === '0') return '0';
  return `${amount < 0 ? '-' : '+'}${text}`;
}

export function formatPower(kw: number): string {
  return scaled(kw, [
    [1e9, 'TW'],
    [1e6, 'GW'],
    [1e3, 'MW'],
    [1, 'kW']
  ]);
}

export const formatPercent = (fraction: number): string => `${Math.round(fraction * 100)}%`;

export function formatRate(fraction: number): string {
  const pct = fraction * 100;
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(Math.abs(pct) < 10 ? 2 : 1)}%`;
}

export function formatDays(days: number): string {
  if (!Number.isFinite(days)) return 'never';
  if (days >= 3652.5) return `${Math.round(days / 365.25)} y`;
  if (days >= 365.25) return `${(days / 365.25).toFixed(1)} y`;
  return `${Math.max(1, Math.ceil(days))} d`;
}

export function shortName(id: string): string {
  const name = material(id).name.split(' (')[0] ?? id;
  return name.length > 14 ? (name.split(' ')[0] ?? name) : name;
}

export const materialName = (id: string): string => material(id).name;

const CATEGORY_NAMES: Record<string, string> = {
  bio_life_support: 'Life support',
  carbon_materials: 'Carbon',
  ceramic: 'Ceramics and regolith',
  computation: 'Computation',
  exotic: 'Exotic',
  fertiliser: 'Fertiliser',
  food: 'Food',
  metal: 'Metals and alloys',
  nuclear: 'Nuclear',
  polymer: 'Polymers',
  propellant: 'Propellant',
  semiconductor_electronics: 'Semiconductors and electronics',
  volatile: 'Volatiles and gases'
};

export const categoryName = (id: string): string => CATEGORY_NAMES[id] ?? id.replace(/[_-]/g, ' ');
