import { material } from '#lib/game/data/index.ts';
import { activePlants, averageOutput, POWER } from '#lib/game/economy/index.ts';
import { buildingTip, dim, fmt, materialName, materialTip, warn } from '#lib/ui/index.ts';
import { PERIODS, type Period } from '#lib/ui/format.ts';
import type { GroupView, StockView } from './model.ts';

export const unitOf = (id: string) => material(id).unit;

export const rateText = (id: string, perHour: number, period: Period, signed = false): string =>
  fmt.rate(perHour, period, unitOf(id), signed);

export const stockAmount = (id: string, amount: number): string => fmt.amount(amount, unitOf(id));

export function coverText(v: StockView): string {
  if (v.stockless) return v.made + 1e-9 >= v.used ? 'enough' : 'short';
  if (Number.isFinite(v.cover)) return fmt.days(v.cover);
  return v.stock <= 0 && v.used > v.made ? 'none' : 'growing';
}

export function stockTip(v: StockView, period: Period): string {
  const p = PERIODS[period];
  return materialTip(
    v.id,
    !v.empty && !v.stockless && `Stock ${stockAmount(v.id, v.stock)}`,
    !v.empty &&
      `Made ${stockAmount(v.id, v.made * p.hours)} ${p.word}, used ${stockAmount(v.id, v.used * p.hours)} ${p.word}`,
    !v.empty && `Balance ${rateText(v.id, v.net, period, true)}`,
    !v.empty && !v.stockless && `Cover ${coverText(v)}`,
    v.bad && warn('Short')
  );
}

export function groupTip(g: GroupView, period: Period): string {
  const a = g.actor;
  if (g.plant)
    return buildingTip(
      g.building.id,
      `${fmt.count(activePlants(a.group))} running of ${fmt.count(a.group.count)}`,
      `Average output ${fmt.gigawatts(averageOutput(g.plant, activePlants(a.group)))}`
    );
  if (!a.group.process)
    return buildingTip(g.building.id, 'No recipe set', `${fmt.count(a.group.count)} built`);
  return buildingTip(
    g.building.id,
    `Recipe: ${g.label}`,
    `${fmt.count(a.group.count)} built, running ${fmt.pct(a.share)}`,
    ...Object.entries(a.outputs)
      .filter(([m]) => m !== POWER)
      .map(([m, v]) => `Makes ${rateText(m, v * a.share, period)} ${materialName(m).toLowerCase()}`),
    ...Object.entries(a.lifts).map(
      ([m, v]) => `Lifts ${rateText(m, v * a.share, period)} ${materialName(m).toLowerCase()}`
    ),
    g.limit && (g.quiet ? dim(g.limit) : warn(g.limit))
  );
}
