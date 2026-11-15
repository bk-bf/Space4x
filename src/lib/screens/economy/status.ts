import type { Economy, MineralId } from '#lib/game/types.ts';
import { MINERALS, mineralName } from './catalog.ts';
import { formatMoney, formatPeople, formatTons } from './format.ts';
import { annualUse, fuelOutput, mineOutput } from './sim.ts';

export const LOW_COVER_YEARS = 20;

const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);

export const totalPeople = (eco: Economy): number => sum(eco.colonies.map((c) => c.population));

export const totalFuel = (eco: Economy): number => sum(eco.colonies.map((c) => c.fuel));

export function yardsBusy(eco: Economy): { busy: number; total: number } {
  const yards = eco.colonies.flatMap((c) => c.yards);
  const busy = yards.filter((y) => y.tasks.length > 0 || y.slipways.some((s) => s.build)).length;
  return { busy, total: yards.length };
}

export interface Cover {
  id: MineralId | 'fuel';
  years: number;
}

export function leastCover(eco: Economy): Cover | undefined {
  const ids: (MineralId | 'fuel')[] = [...MINERALS.map((m) => m.id), 'fuel'];
  const covers = ids.map((id): Cover => {
    const stock = sum(eco.colonies.map((c) => (id === 'fuel' ? c.fuel : c.stock[id])));
    const made = sum(eco.colonies.map((c) => (id === 'fuel' ? fuelOutput(c, eco) : mineOutput(c, id, eco))));
    const use = sum(eco.colonies.map((c) => annualUse(c, id, eco)));
    return { id, years: use > made ? stock / (use - made) : Infinity };
  });
  return covers.reduce<Cover | undefined>((a, b) => (!a || b.years < a.years ? b : a), undefined);
}

export const wealthChip = (eco: Economy): string => formatMoney(eco.wealth);

export const peopleChip = (eco: Economy): string => formatPeople(totalPeople(eco));

export const fuelChip = (eco: Economy): string => `${formatTons(totalFuel(eco))} t`;

export const yardsChip = (eco: Economy): string => {
  const { busy, total } = yardsBusy(eco);
  return `${busy}/${total}`;
};

export function shortageChip(eco: Economy): { value: string; warn: boolean } {
  const low = leastCover(eco);
  return low && low.years < LOW_COVER_YEARS
    ? { value: mineralName(low.id), warn: true }
    : { value: 'None', warn: false };
}
