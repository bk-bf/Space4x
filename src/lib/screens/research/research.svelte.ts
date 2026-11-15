import { milestones } from '#lib/game/data/index.ts';

export const research: { selected: number } = $state({ selected: 1 });

export function applyResearchParams(params: URLSearchParams): void {
  const n = Number(params.get('milestone'));
  if (milestones.some((m) => m.number === n)) research.selected = n;
}
