import { DAY } from './clock';

export const AU = 1.495978707e11;
export const KM = 1000;

export const au = (n: number): number => n * AU;

export const orbitRate = (periodDays: number): number => (Math.PI * 2) / (periodDays * DAY);

export function formatDistance(m: number): string {
  const a = Math.abs(m);
  if (a < 1000) return `${+m.toPrecision(2)} m`;
  if (a < 0.05 * AU) return `${Math.round(m / KM).toLocaleString('en')} km`;
  return `${+(m / AU).toPrecision(2)} AU`;
}

export const formatAu = (m: number): string => `${(m / AU).toFixed(1)} AU`;
