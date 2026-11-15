import { YEAR_SECONDS } from './research.svelte.ts';

const DAY_SECONDS = 86400;

export const number = (n: number): string => Math.round(n).toLocaleString('en');

export function duration(seconds: number): string {
  if (!Number.isFinite(seconds)) return 'never';
  if (seconds >= YEAR_SECONDS) return `${(seconds / YEAR_SECONDS).toFixed(1)} years`;
  const days = Math.ceil(seconds / DAY_SECONDS);
  if (days >= 60) return `${Math.round(days / 30.44)} months`;
  return `${Math.max(1, days)} ${days === 1 ? 'day' : 'days'}`;
}

export const percent = (fraction: number): number => Math.floor(fraction * 100);
