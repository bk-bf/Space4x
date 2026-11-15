import { formatDay } from '#lib/game/clock.ts';

const group = (n: number): string => Math.round(n).toLocaleString('en-US');

export function formatPeople(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} bn`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} M`;
  return group(n);
}

export function formatTons(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)} M`;
  if (n >= 1e4) return `${Math.round(n / 1e3)}k`;
  return group(n);
}

export const formatCount = group;

export const formatMoney = (n: number): string => (n < 0 ? '-' : '') + group(Math.abs(n));

export const formatSigned = (n: number): string => (n >= 0 ? '+' : '-') + group(Math.abs(n));

export const formatPercent = (fraction: number): string => `${Math.round(fraction * 100)}%`;

export function formatRate(fraction: number): string {
  const pct = fraction * 100;
  return `${pct.toFixed(Math.abs(pct) < 10 ? 1 : 0)}%`;
}

export function formatYears(y: number): string {
  if (!Number.isFinite(y)) return 'never';
  if (y >= 1000) return '1000+ y';
  if (y >= 10) return `${Math.round(y)} y`;
  if (y >= 1) return `${y.toFixed(1)} y`;
  return `${Math.max(1, Math.round(y * 365))} d`;
}

export function formatDate(ms: number | null): string {
  if (ms === null) return 'never';
  return `${formatDay(ms)} ${new Date(ms).getUTCFullYear()}`;
}
